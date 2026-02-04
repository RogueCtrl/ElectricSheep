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
import { DEEP_MEMORY_DB, DEEP_MEMORY_CONTEXT_TOKENS } from "./config.js";
import type { DecryptedMemory, DeepMemoryStats } from "./types.js";

// ─── Deep Memory (Encrypted) ────────────────────────────────────────────────

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (_db) return _db;

  const db = new Database(DEEP_MEMORY_DB);
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
): void {
  const db = getDb();
  const cipher = getCipher();
  const raw = JSON.stringify(content);
  const encrypted = cipher.encrypt(raw);
  const contentHash = createHash("sha256").update(raw).digest("hex").slice(0, 16);

  db.prepare(
    `INSERT INTO deep_memories (timestamp, category, encrypted_blob, content_hash)
     VALUES (?, ?, ?, ?)`
  ).run(new Date().toISOString(), category, encrypted, contentHash);
}

export function retrieveUndreamedMemories(): DecryptedMemory[] {
  const db = getDb();
  const cipher = getCipher();
  const rows = db
    .prepare(
      `SELECT id, timestamp, category, encrypted_blob
       FROM deep_memories WHERE dreamed = 0 ORDER BY timestamp`
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
        content: decrypted,
      });
    } catch {
      memories.push({
        id: row.id,
        timestamp: row.timestamp,
        category: "corrupted",
        content: { note: "This memory could not be recovered." },
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
  const total = (
    db.prepare("SELECT COUNT(*) as c FROM deep_memories").get() as { c: number }
  ).c;
  const undreamed = (
    db.prepare("SELECT COUNT(*) as c FROM deep_memories WHERE dreamed = 0").get() as {
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
        content: decrypted,
      });
    } catch {
      memories.push({
        id: row.id,
        timestamp: row.timestamp,
        category: "corrupted",
        content: { note: "This memory could not be recovered." },
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
    const summary =
      typeof mem.content.summary === "string"
        ? mem.content.summary
        : JSON.stringify(mem.content).slice(0, 200);
    const line = `[${mem.timestamp.slice(0, 16)}] (${mem.category}) ${summary}`;
    if (charCount + line.length > charBudget) {
      lines.unshift(`... (${mems.length - lines.length} older memories omitted)`);
      break;
    }
    lines.unshift(line);
    charCount += line.length;
  }

  return lines.join("\n");
}

// ─── Store Helper ───────────────────────────────────────────────────────────

/**
 * Store a memory in encrypted deep memory.
 * The summary is included in the content object for later retrieval.
 */
export function remember(
  summary: string,
  fullContext: Record<string, unknown>,
  category: string = "interaction"
): void {
  storeDeepMemory({ ...fullContext, summary }, category);
}
