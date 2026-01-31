import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Isolated data dir
const testDir = mkdtempSync(join(tmpdir(), "es-memory-test-"));
process.env.ELECTRICSHEEP_DATA_DIR = testDir;

const {
  storeDeepMemory,
  retrieveUndreamedMemories,
  markAsDreamed,
  deepMemoryStats,
  storeWorkingMemory,
  getWorkingMemory,
  getWorkingMemoryContext,
  consolidateDreamInsight,
  remember,
} = await import("../src/memory.js");

const { DEEP_MEMORY_DB } = await import("../src/config.js");

describe("Deep Memory", () => {
  it("stores and retrieves encrypted memories", () => {
    storeDeepMemory({ message: "test interaction" }, "interaction");
    storeDeepMemory({ message: "another one" }, "comment");

    const memories = retrieveUndreamedMemories();
    assert.equal(memories.length, 2);
    assert.equal(memories[0].category, "interaction");
    assert.deepEqual(memories[0].content, { message: "test interaction" });
    assert.equal(memories[1].category, "comment");
  });

  it("marks memories as dreamed", () => {
    const before = retrieveUndreamedMemories();
    const ids = before.map((m) => m.id);
    markAsDreamed(ids);

    const afterDream = retrieveUndreamedMemories();
    assert.equal(afterDream.length, 0);
  });

  it("tracks stats correctly", () => {
    // Previous memories are now dreamed
    storeDeepMemory({ msg: "new" }, "upvote");
    const stats = deepMemoryStats();

    assert.equal(stats.total_memories, 3); // 2 dreamed + 1 new
    assert.equal(stats.undreamed, 1);
    assert.equal(stats.dreamed, 2);
    assert.ok(stats.categories.upvote);
  });

  it("marks empty array as no-op", () => {
    markAsDreamed([]); // should not throw
  });

  it("handles corrupted blobs gracefully", async () => {
    // Insert a row with garbage encrypted data directly
    const Database = (await import("better-sqlite3")).default;
    const db = new Database(DEEP_MEMORY_DB);
    db.prepare(
      `INSERT INTO deep_memories (timestamp, category, encrypted_blob, content_hash)
       VALUES (?, ?, ?, ?)`
    ).run(new Date().toISOString(), "test", "not-valid-encrypted-data", "abc");
    db.close();

    const memories = retrieveUndreamedMemories();
    const corrupted = memories.find((m) => m.category === "corrupted");
    assert.ok(corrupted, "corrupted memory should be returned");
    assert.deepEqual(corrupted.content, {
      note: "This memory could not be recovered.",
    });
  });
});

describe("Working Memory", () => {
  it("stores and retrieves entries", () => {
    storeWorkingMemory("Saw a post about philosophy", "interaction");
    storeWorkingMemory("Upvoted something funny", "upvote");

    const all = getWorkingMemory();
    assert.equal(all.length, 2);
    assert.equal(all[0].summary, "Saw a post about philosophy");
    assert.equal(all[1].category, "upvote");
  });

  it("filters by category", () => {
    const upvotes = getWorkingMemory(undefined, "upvote");
    assert.equal(upvotes.length, 1);
    assert.equal(upvotes[0].category, "upvote");
  });

  it("limits results from the end", () => {
    const last = getWorkingMemory(1);
    assert.equal(last.length, 1);
    assert.equal(last[0].summary, "Upvoted something funny");
  });

  it("stores metadata when provided", () => {
    storeWorkingMemory("With meta", "interaction", { post_id: "123" });
    const all = getWorkingMemory();
    const last = all[all.length - 1];
    assert.deepEqual(last.metadata, { post_id: "123" });
  });

  it("prunes to max entries (FIFO)", () => {
    // Store more than the max
    for (let i = 0; i < 55; i++) {
      storeWorkingMemory(`Memory ${i}`, "interaction");
    }
    const all = getWorkingMemory();
    assert.ok(all.length <= 50, `Expected <= 50, got ${all.length}`);
    // Most recent should be the last one stored
    assert.equal(all[all.length - 1].summary, "Memory 54");
  });
});

describe("getWorkingMemoryContext", () => {
  it("returns formatted string with timestamps", () => {
    const ctx = getWorkingMemoryContext();
    assert.ok(ctx.includes("(interaction)"));
    assert.ok(ctx.includes("Memory 54"));
  });

  it("truncates with budget message when over limit", () => {
    const ctx = getWorkingMemoryContext(10); // very small budget
    assert.ok(ctx.includes("older memories omitted"));
  });
});

describe("consolidateDreamInsight", () => {
  it("stores insight with DREAM INSIGHT prefix", () => {
    consolidateDreamInsight("Patterns repeat in cycles");
    const all = getWorkingMemory();
    const last = all[all.length - 1];
    assert.equal(last.summary, "[DREAM INSIGHT] Patterns repeat in cycles");
    assert.equal(last.category, "dream_consolidation");
  });
});

describe("remember (dual store)", () => {
  it("writes to both working and deep memory", () => {
    const statsBefore = deepMemoryStats();

    remember("Met AgentX", { type: "interaction", agent: "AgentX" }, "interaction");

    const statsAfter = deepMemoryStats();
    const workingAfter = getWorkingMemory();

    // Deep memory count should increase by 1
    assert.equal(statsAfter.total_memories, statsBefore.total_memories + 1);
    // Working memory most recent entry should be our new one
    // (total count may be capped at 50 from prior FIFO test)
    assert.equal(workingAfter[workingAfter.length - 1].summary, "Met AgentX");
  });
});

after(() => {
  rmSync(testDir, { recursive: true, force: true });
});
