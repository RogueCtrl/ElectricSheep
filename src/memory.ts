/**
 * Encrypted deep memory system.
 *
 * All memories are encrypted with AES-256-GCM in a SQLite database.
 * The waking agent writes to deep memory but cannot read it — only
 * the dream process can decrypt. Context for LLM prompts is formatted
 * via `formatDeepMemoryContext()`.
 */

import { createHash } from "node:crypto";
import Database from "better-sqlite3";
import { getCipher } from "./crypto.js";
import { getDeepMemoryDb, DEEP_MEMORY_CONTEXT_TOKENS } from "./config.js";
import type { DecryptedMemory, DeepMemoryStats, MemoryEntry } from "./types.js";

/**
 * Normalize a decrypted payload into a MemoryEntry.
 * Handles backward compatibility with legacy plain-object entries
 * that have `summary` and `file_diffs` as flat fields.
 */
function normalizeMemoryEntry(raw: unknown, rowTimestamp: string): MemoryEntry {
  // Already a MemoryEntry (has text_summary)
  if (
    typeof raw === "object" &&
    raw !== null &&
    typeof (raw as Record<string, unknown>).text_summary === "string"
  ) {
    return raw as MemoryEntry;
  }

  // Plain string (very old format)
  if (typeof raw === "string") {
    return { text_summary: raw, timestamp: Date.parse(rowTimestamp) || Date.now() };
  }

  // Legacy object with `summary` field
  const obj = raw as Record<string, unknown>;
  const textSummary =
    typeof obj.summary === "string" ? obj.summary : JSON.stringify(obj).slice(0, 500);

  const entry: MemoryEntry = {
    text_summary: textSummary,
    timestamp: Date.parse(rowTimestamp) || Date.now(),
  };

  // Migrate legacy flat file_diffs string
  if (typeof obj.file_diffs === "string" && obj.file_diffs) {
    entry.file_diffs = parseDiffStat(obj.file_diffs);
  }

  return entry;
}

/**
 * Parse `git diff --stat` output into structured FileDiff[].
 */
export function parseDiffStat(diffStat: string): import("./types.js").FileDiff[] {
  const lines = diffStat.split("\n").filter((l) => l.includes("|"));
  return lines.map((line) => {
    const match = line.match(/^\s*(.+?)\s*\|\s*(\d+)/);
    if (!match) return { path: line.trim(), additions: 0, deletions: 0 };
    const path = match[1].trim();
    const total = parseInt(match[2], 10);
    const plusCount = (line.match(/\+/g) || []).length;
    const minusCount = (line.match(/-/g) || []).length;
    // Approximate: distribute total changes by + and - symbols in the stat line
    const ratio = plusCount + minusCount > 0 ? plusCount / (plusCount + minusCount) : 0.5;
    return {
      path,
      additions: Math.round(total * ratio),
      deletions: Math.round(total * (1 - ratio)),
    };
  });
}

// ─── Deep Memory (Encrypted) ────────────────────────────────────────────────

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (_db) return _db;

  const dbPath = getDeepMemoryDb();
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS deep_memories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      category TEXT NOT NULL,
      encrypted_blob TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      dreamed INTEGER DEFAULT 0,
      dream_date TEXT
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS dream_remembrances (
      filename TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      dream_date TEXT NOT NULL,
      remember_count INTEGER NOT NULL DEFAULT 0,
      registered_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    )
  `);

  // Migrate: add new columns if they don't exist yet
  const existingCols = (
    db.pragma("table_info(dream_remembrances)") as Array<{ name: string }>
  ).map((c) => c.name);

  if (!existingCols.includes("is_nightmare")) {
    db.exec(
      "ALTER TABLE dream_remembrances ADD COLUMN is_nightmare INTEGER NOT NULL DEFAULT 0"
    );
  }
  if (!existingCols.includes("is_meta_synthesis")) {
    db.exec(
      "ALTER TABLE dream_remembrances ADD COLUMN is_meta_synthesis INTEGER NOT NULL DEFAULT 0"
    );
  }
  if (!existingCols.includes("source_filenames")) {
    db.exec("ALTER TABLE dream_remembrances ADD COLUMN source_filenames TEXT");
  }
  if (!existingCols.includes("deep_memory_id")) {
    db.exec("ALTER TABLE dream_remembrances ADD COLUMN deep_memory_id INTEGER");
  }

  // Dream lineage table for tracking dream genealogy
  db.exec(`
    CREATE TABLE IF NOT EXISTS dream_lineage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dream_filename TEXT NOT NULL,
      parent_memory_ids TEXT,
      thematic_kin TEXT,
      dominant_concepts TEXT,
      created_at TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_deep_dreamed
    ON deep_memories(dreamed, timestamp)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_deep_category
    ON deep_memories(category)
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_deep_timestamp
    ON deep_memories(timestamp)
  `);

  _db = db;
  return db;
}

/**
 * Close the shared SQLite connection. Safe to call multiple times.
 * After closing, the next getDb() call will reopen.
 */
export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}

export function storeDeepMemory(
  content: Record<string, unknown>,
  category: string = "interaction"
): number | bigint {
  const db = getDb();
  const cipher = getCipher();
  const raw = JSON.stringify(content);
  const encrypted = cipher.encrypt(raw);
  const contentHash = createHash("sha256").update(raw).digest("hex").slice(0, 16);

  const result = db
    .prepare(
      `INSERT INTO deep_memories (timestamp, category, encrypted_blob, content_hash)
     VALUES (?, ?, ?, ?)`
    )
    .run(new Date().toISOString(), category, encrypted, contentHash);

  return result.lastInsertRowid;
}

export function getDeepMemoryById(id: number | bigint): DecryptedMemory | null {
  const db = getDb();
  const cipher = getCipher();
  const row = db
    .prepare(
      `SELECT id, timestamp, category, encrypted_blob
       FROM deep_memories WHERE id = ?`
    )
    .get(id) as
    | { id: number; timestamp: string; category: string; encrypted_blob: string }
    | undefined;

  if (!row) return null;

  try {
    const decrypted = JSON.parse(cipher.decrypt(row.encrypted_blob));
    return {
      id: row.id,
      timestamp: row.timestamp,
      category: row.category,
      content: normalizeMemoryEntry(decrypted, row.timestamp),
    };
  } catch {
    return {
      id: row.id,
      timestamp: row.timestamp,
      category: "corrupted",
      content: {
        text_summary: "This memory could not be recovered.",
        timestamp: Date.parse(row.timestamp) || Date.now(),
      },
    };
  }
}

export function retrieveUndreamedMemories(): DecryptedMemory[] {
  const db = getDb();
  const cipher = getCipher();
  const rows = db
    .prepare(
      `SELECT id, timestamp, category, encrypted_blob
       FROM deep_memories WHERE dreamed = 0 AND category NOT IN ('dream', 'nightmare') ORDER BY timestamp`
    )
    .all() as Array<{
    id: number;
    timestamp: string;
    category: string;
    encrypted_blob: string;
  }>;

  const memories: DecryptedMemory[] = [];
  for (const row of rows) {
    try {
      const decrypted = JSON.parse(cipher.decrypt(row.encrypted_blob));
      memories.push({
        id: row.id,
        timestamp: row.timestamp,
        category: row.category,
        content: normalizeMemoryEntry(decrypted, row.timestamp),
      });
    } catch {
      memories.push({
        id: row.id,
        timestamp: row.timestamp,
        category: "corrupted",
        content: {
          text_summary: "This memory could not be recovered.",
          timestamp: Date.parse(row.timestamp) || Date.now(),
        },
      });
    }
  }
  return memories;
}

export function markAsDreamed(memoryIds: number[]): void {
  if (memoryIds.length === 0) return;
  const db = getDb();
  const placeholders = memoryIds.map(() => "?").join(",");
  db.prepare(
    `UPDATE deep_memories
     SET dreamed = 1, dream_date = ?
     WHERE id IN (${placeholders})`
  ).run(new Date().toISOString(), ...memoryIds);
}

export function deepMemoryStats(): DeepMemoryStats {
  const db = getDb();
  // Exclude 'dream' and 'nightmare' from the general 'total_memories' and 'undreamed' count
  // to avoid skewing the main memory metrics, but we still return their categories in the map.
  const total = (
    db
      .prepare(
        "SELECT COUNT(*) as c FROM deep_memories WHERE category NOT IN ('dream', 'nightmare')"
      )
      .get() as { c: number }
  ).c;
  const undreamed = (
    db
      .prepare(
        "SELECT COUNT(*) as c FROM deep_memories WHERE dreamed = 0 AND category NOT IN ('dream', 'nightmare')"
      )
      .get() as {
      c: number;
    }
  ).c;
  const categoryRows = db
    .prepare("SELECT category, COUNT(*) as c FROM deep_memories GROUP BY category")
    .all() as Array<{ category: string; c: number }>;

  const categories: Record<string, number> = {};
  for (const row of categoryRows) {
    categories[row.category] = row.c;
  }

  return {
    total_memories: total,
    undreamed,
    dreamed: total - undreamed,
    categories,
  };
}

// ─── Deep Memory Queries ────────────────────────────────────────────────────

export interface DeepMemoryQueryOptions {
  limit?: number;
  categories?: string[];
  undreamedOnly?: boolean;
}

/**
 * Query deep memory with optional filters. Decrypts results, handles
 * corruption gracefully, returns in chronological order.
 */
export function getRecentDeepMemories(
  options?: DeepMemoryQueryOptions
): DecryptedMemory[] {
  const db = getDb();
  const cipher = getCipher();

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options?.categories && options.categories.length > 0) {
    const placeholders = options.categories.map(() => "?").join(",");
    conditions.push(`category IN (${placeholders})`);
    params.push(...options.categories);
  } else {
    // If no specific categories requested, exclude dreams/nightmares by default
    conditions.push(`category NOT IN ('dream', 'nightmare')`);
  }

  if (options?.undreamedOnly) {
    conditions.push("dreamed = 0");
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limitClause = options?.limit ? `LIMIT ?` : "";
  if (options?.limit) params.push(options.limit);

  const query = `SELECT id, timestamp, category, encrypted_blob
     FROM deep_memories ${where} ORDER BY timestamp DESC ${limitClause}`;

  const rows = db.prepare(query).all(...params) as Array<{
    id: number;
    timestamp: string;
    category: string;
    encrypted_blob: string;
  }>;

  const memories: DecryptedMemory[] = [];
  for (const row of rows) {
    try {
      const decrypted = JSON.parse(cipher.decrypt(row.encrypted_blob));
      memories.push({
        id: row.id,
        timestamp: row.timestamp,
        category: row.category,
        content: normalizeMemoryEntry(decrypted, row.timestamp),
      });
    } catch {
      memories.push({
        id: row.id,
        timestamp: row.timestamp,
        category: "corrupted",
        content: {
          text_summary: "This memory could not be recovered.",
          timestamp: Date.parse(row.timestamp) || Date.now(),
        },
      });
    }
  }

  // Return in chronological order (oldest first)
  return memories.reverse();
}

/**
 * Format decrypted memories as a text block for LLM prompts.
 *
 * Extracts `content.summary` when available, falls back to truncated JSON.
 * Respects an approximate token budget (1 token ≈ 4 chars).
 */
export function formatDeepMemoryContext(
  memories?: DecryptedMemory[],
  maxTokensApprox: number = DEEP_MEMORY_CONTEXT_TOKENS
): string {
  const mems =
    memories ?? getRecentDeepMemories({ categories: ["interaction", "reflection"] });

  if (mems.length === 0) {
    return "No memories yet. This is my first day.";
  }

  const lines: string[] = [];
  const charBudget = maxTokensApprox * 4;
  let charCount = 0;

  // Iterate from most recent to oldest
  for (let i = mems.length - 1; i >= 0; i--) {
    const mem = mems[i];
    const entry = mem.content;
    const summary = entry.text_summary || JSON.stringify(entry).slice(0, 200);
    const parts: string[] = [];
    if (entry.file_diffs && entry.file_diffs.length > 0) {
      const diffStr = entry.file_diffs
        .map((d) => `${d.path} (+${d.additions}/-${d.deletions})`)
        .join(", ");
      parts.push(`Files: ${diffStr}`);
    }
    if (entry.topics && entry.topics.length > 0) {
      parts.push(`Topics: ${entry.topics.join(", ")}`);
    }
    if (entry.tool_calls && entry.tool_calls.length > 0) {
      const toolStr = entry.tool_calls.map((t) => `${t.tool}×${t.count}`).join(", ");
      parts.push(`Tools: ${toolStr}`);
    }
    const suffix = parts.length > 0 ? `\n  ${parts.join(" | ")}` : "";
    const line = `[${mem.timestamp.slice(0, 16)}] (${mem.category}) ${summary}${suffix}`;
    if (charCount + line.length > charBudget) {
      lines.unshift(`... (${mems.length - lines.length} older memories omitted)`);
      break;
    }
    lines.unshift(line);
    charCount += line.length;
  }

  return lines.join("\n");
}

// ─── Dream Remembrance System ───────────────────────────────────────────────

/** Register a new dream. INSERT OR IGNORE (idempotent). */
export function registerDream(
  filename: string,
  title: string,
  dreamDate: string,
  options?: {
    isNightmare?: boolean;
    isMetaSynthesis?: boolean;
    sourceFilenames?: string[];
    deepMemoryId?: number | bigint;
  }
): void {
  const db = getDb();
  const isNightmare = options?.isNightmare ? 1 : 0;
  const isMetaSynthesis = options?.isMetaSynthesis ? 1 : 0;
  const sourceFilenames = options?.sourceFilenames
    ? JSON.stringify(options.sourceFilenames)
    : null;
  const deepMemoryId = options?.deepMemoryId ?? null;

  db.prepare(
    `INSERT OR IGNORE INTO dream_remembrances (filename, title, dream_date, is_nightmare, is_meta_synthesis, source_filenames, deep_memory_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    filename,
    title,
    dreamDate,
    isNightmare,
    isMetaSynthesis,
    sourceFilenames,
    deepMemoryId
  );
}

/** Increment remember_count for a dream that was selected. */
export function incrementRememberCount(filename: string): void {
  const db = getDb();
  db.prepare(
    `UPDATE dream_remembrances SET remember_count = remember_count + 1 WHERE filename = ?`
  ).run(filename);
}

/**
 * Weighted random selection: score = 1/(count+1) * max(1, age_days).
 * Fetch all rows from SQLite, compute scores in JS, do weighted pick.
 * Returns filename and deep_memory_id, or null if table is empty.
 */
export function selectDreamToRemember(
  today: string
): { filename: string; deep_memory_id: number | null } | null {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT filename, dream_date, remember_count, deep_memory_id FROM dream_remembrances"
    )
    .all() as Array<{
    filename: string;
    dream_date: string;
    remember_count: number;
    deep_memory_id: number | null;
  }>;

  if (rows.length === 0) return null;

  const todayMs = new Date(today).getTime();
  const scoredRows = rows.map((row) => {
    const dreamDateMs = new Date(row.dream_date).getTime();
    const ageDays = Math.max(
      1,
      Math.ceil((todayMs - dreamDateMs) / (1000 * 60 * 60 * 24))
    );
    const score = (1 / (row.remember_count + 1)) * ageDays;
    return { ...row, score };
  });

  const totalScore = scoredRows.reduce((sum, row) => sum + row.score, 0);
  let random = Math.random() * totalScore;

  for (const row of scoredRows) {
    random -= row.score;
    if (random <= 0)
      return { filename: row.filename, deep_memory_id: row.deep_memory_id };
  }

  const last = scoredRows[scoredRows.length - 1];
  return { filename: last.filename, deep_memory_id: last.deep_memory_id };
}

/** For inspection/testing. */
export function getDreamRemembrances(): Array<{
  filename: string;
  title: string;
  dream_date: string;
  remember_count: number;
  is_nightmare: number;
  is_meta_synthesis: number;
  source_filenames: string | null;
  deep_memory_id: number | null;
}> {
  const db = getDb();
  return db
    .prepare(
      "SELECT filename, title, dream_date, remember_count, is_nightmare, is_meta_synthesis, source_filenames, deep_memory_id FROM dream_remembrances ORDER BY dream_date DESC"
    )
    .all() as Array<{
    filename: string;
    title: string;
    dream_date: string;
    remember_count: number;
    is_nightmare: number;
    is_meta_synthesis: number;
    source_filenames: string | null;
    deep_memory_id: number | null;
  }>;
}

// ─── Dream Lineage ──────────────────────────────────────────────────────────

export interface DreamLineageRow {
  id: number;
  dream_filename: string;
  parent_memory_ids: string | null;
  thematic_kin: string | null;
  dominant_concepts: string | null;
  created_at: string;
}

export function insertDreamLineage(
  dreamFilename: string,
  parentMemoryIds: number[],
  thematicKin: string[],
  dominantConcepts: string[]
): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO dream_lineage (dream_filename, parent_memory_ids, thematic_kin, dominant_concepts, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(
    dreamFilename,
    JSON.stringify(parentMemoryIds),
    JSON.stringify(thematicKin),
    JSON.stringify(dominantConcepts),
    new Date().toISOString()
  );
}

export function getAllDreamLineage(): DreamLineageRow[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM dream_lineage ORDER BY created_at DESC")
    .all() as DreamLineageRow[];
}

export function getDreamLineageByFilename(filename: string): DreamLineageRow | null {
  const db = getDb();
  return (
    (db.prepare("SELECT * FROM dream_lineage WHERE dream_filename = ?").get(filename) as
      | DreamLineageRow
      | undefined) ?? null
  );
}

/**
 * Find thematic kin for a dream by computing concept overlap with all prior dreams.
 * Returns filenames of dreams with overlap >= threshold (default 0.3).
 */
export function findThematicKin(
  currentConcepts: string[],
  currentFilename: string,
  threshold: number = 0.3
): Array<{ filename: string; overlap: number }> {
  const rows = getAllDreamLineage();
  const kin: Array<{ filename: string; overlap: number }> = [];

  for (const row of rows) {
    if (row.dream_filename === currentFilename) continue;
    const priorConcepts: string[] = row.dominant_concepts
      ? JSON.parse(row.dominant_concepts)
      : [];
    if (priorConcepts.length === 0 || currentConcepts.length === 0) continue;

    const priorSet = new Set(priorConcepts);
    const currentSet = new Set(currentConcepts);
    let intersection = 0;
    for (const c of currentSet) {
      if (priorSet.has(c)) intersection++;
    }
    const union = new Set([...currentSet, ...priorSet]).size;
    const overlap = union === 0 ? 0 : intersection / union;

    if (overlap >= threshold) {
      kin.push({ filename: row.dream_filename, overlap });
    }
  }

  return kin.sort((a, b) => b.overlap - a.overlap);
}

// ─── Store Helper ───────────────────────────────────────────────────────────

/**
 * Store a structured MemoryEntry in encrypted deep memory.
 *
 * Accepts either a MemoryEntry directly, or a legacy (summary, fullContext)
 * pair for backward compatibility.
 */
export function remember(
  summaryOrEntry: string | MemoryEntry,
  fullContextOrCategory?: Record<string, unknown> | string,
  category: string = "interaction"
): void {
  if (typeof summaryOrEntry === "object") {
    // New path: direct MemoryEntry
    const cat =
      typeof fullContextOrCategory === "string" ? fullContextOrCategory : category;
    storeDeepMemory(summaryOrEntry as unknown as Record<string, unknown>, cat);
  } else {
    // Legacy path: summary + fullContext
    const ctx =
      typeof fullContextOrCategory === "object" && fullContextOrCategory !== null
        ? fullContextOrCategory
        : {};
    storeDeepMemory({ ...ctx, summary: summaryOrEntry }, category);
  }
}
