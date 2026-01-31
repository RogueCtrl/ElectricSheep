/**
 * Dual memory system: Working Memory + Encrypted Deep Memory.
 *
 * The waking agent only has access to working memory (compressed summaries).
 * Deep memories are encrypted and can only be read by the dream process.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import Database from "better-sqlite3";
import { getCipher } from "./crypto.js";
import {
  DEEP_MEMORY_DB,
  WORKING_MEMORY_FILE,
  WORKING_MEMORY_MAX_ENTRIES,
} from "./config.js";
import type { WorkingMemoryEntry, DecryptedMemory, DeepMemoryStats } from "./types.js";

// ─── Deep Memory (Encrypted) ────────────────────────────────────────────────

function getDb(): Database.Database {
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
  return db;
}

export function storeDeepMemory(
  content: Record<string, unknown>,
  category: string = "interaction"
): void {
  const db = getDb();
  try {
    const cipher = getCipher();
    const raw = JSON.stringify(content);
    const encrypted = cipher.encrypt(raw);
    const contentHash = createHash("sha256").update(raw).digest("hex").slice(0, 16);

    db.prepare(
      `INSERT INTO deep_memories (timestamp, category, encrypted_blob, content_hash)
       VALUES (?, ?, ?, ?)`
    ).run(new Date().toISOString(), category, encrypted, contentHash);
  } finally {
    db.close();
  }
}

export function retrieveUndreamedMemories(): DecryptedMemory[] {
  const db = getDb();
  try {
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
  } finally {
    db.close();
  }
}

export function markAsDreamed(memoryIds: number[]): void {
  if (memoryIds.length === 0) return;
  const db = getDb();
  try {
    const placeholders = memoryIds.map(() => "?").join(",");
    db.prepare(
      `UPDATE deep_memories
       SET dreamed = 1, dream_date = ?
       WHERE id IN (${placeholders})`
    ).run(new Date().toISOString(), ...memoryIds);
  } finally {
    db.close();
  }
}

export function deepMemoryStats(): DeepMemoryStats {
  const db = getDb();
  try {
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
  } finally {
    db.close();
  }
}

// ─── Working Memory (Compressed, Readable) ──────────────────────────────────

function loadWorkingMemory(): WorkingMemoryEntry[] {
  if (existsSync(WORKING_MEMORY_FILE)) {
    return JSON.parse(readFileSync(WORKING_MEMORY_FILE, "utf-8"));
  }
  return [];
}

function saveWorkingMemory(memories: WorkingMemoryEntry[]): void {
  writeFileSync(WORKING_MEMORY_FILE, JSON.stringify(memories, null, 2));
}

export function storeWorkingMemory(
  summary: string,
  category: string = "interaction",
  metadata?: Record<string, unknown>
): void {
  const memories = loadWorkingMemory();

  const entry: WorkingMemoryEntry = {
    timestamp: new Date().toISOString(),
    category,
    summary,
  };
  if (metadata) {
    entry.metadata = metadata;
  }

  memories.push(entry);

  // Prune oldest if over limit
  const pruned =
    memories.length > WORKING_MEMORY_MAX_ENTRIES
      ? memories.slice(-WORKING_MEMORY_MAX_ENTRIES)
      : memories;

  saveWorkingMemory(pruned);
}

export function getWorkingMemory(
  limit?: number,
  category?: string
): WorkingMemoryEntry[] {
  let memories = loadWorkingMemory();

  if (category) {
    memories = memories.filter((m) => m.category === category);
  }

  if (limit) {
    memories = memories.slice(-limit);
  }

  return memories;
}

export function getWorkingMemoryContext(maxTokensApprox: number = 2000): string {
  const memories = loadWorkingMemory();
  if (memories.length === 0) {
    return "No memories yet. This is my first day.";
  }

  const lines: string[] = [];
  const charBudget = maxTokensApprox * 4;
  let charCount = 0;

  for (let i = memories.length - 1; i >= 0; i--) {
    const mem = memories[i];
    const line = `[${mem.timestamp.slice(0, 16)}] (${mem.category}) ${mem.summary}`;
    if (charCount + line.length > charBudget) {
      lines.unshift(`... (${memories.length - lines.length} older memories omitted)`);
      break;
    }
    lines.unshift(line);
    charCount += line.length;
  }

  return lines.join("\n");
}

export function consolidateDreamInsight(
  insight: string,
  sourceCategory: string = "dream_consolidation"
): void {
  storeWorkingMemory(`[DREAM INSIGHT] ${insight}`, sourceCategory);
}

// ─── Dual Store Helper ──────────────────────────────────────────────────────

export function remember(
  summary: string,
  fullContext: Record<string, unknown>,
  category: string = "interaction"
): void {
  storeWorkingMemory(summary, category);
  storeDeepMemory(fullContext, category);
}
