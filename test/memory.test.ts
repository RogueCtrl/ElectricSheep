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
  getRecentDeepMemories,
  formatDeepMemoryContext,
  remember,
  closeDb,
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
    // Close singleton so we can insert garbage data directly
    closeDb();
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

describe("getRecentDeepMemories", () => {
  it("filters by category", () => {
    storeDeepMemory({ summary: "interaction 1" }, "interaction");
    storeDeepMemory({ summary: "reflection 1" }, "reflection");

    const interactions = getRecentDeepMemories({ categories: ["interaction"] });
    assert.ok(interactions.length > 0);
    assert.ok(interactions.every((m) => m.category === "interaction"));
  });

  it("limits results", () => {
    const limited = getRecentDeepMemories({ limit: 2 });
    assert.equal(limited.length, 2);
  });

  it("returns in chronological order", () => {
    const memories = getRecentDeepMemories({ categories: ["interaction"] });
    for (let i = 1; i < memories.length; i++) {
      assert.ok(
        memories[i].timestamp >= memories[i - 1].timestamp,
        "Memories should be in chronological order"
      );
    }
  });

  it("filters undreamed only", () => {
    const undreamed = getRecentDeepMemories({ undreamedOnly: true });
    // All returned should be undreamed (they haven't been marked as dreamed)
    assert.ok(undreamed.length > 0);
  });

  it("handles corruption gracefully", () => {
    // The corrupted blob from the earlier test should show up
    const all = getRecentDeepMemories({});
    const corrupted = all.find((m) => m.category === "corrupted");
    assert.ok(corrupted, "corrupted memory should be returned");
    assert.deepEqual(corrupted.content, {
      note: "This memory could not be recovered.",
    });
  });
});

describe("formatDeepMemoryContext", () => {
  it("formats memories with timestamps and summaries", () => {
    const ctx = formatDeepMemoryContext();
    assert.ok(ctx.includes("(interaction)"));
  });

  it("extracts summary field from content", () => {
    storeDeepMemory({ summary: "unique test summary xyz" }, "interaction");
    const ctx = formatDeepMemoryContext();
    assert.ok(ctx.includes("unique test summary xyz"));
  });

  it("truncates with budget message when over limit", () => {
    const ctx = formatDeepMemoryContext(undefined, 10); // very small budget
    assert.ok(ctx.includes("older memories omitted"));
  });

  it("returns first day message when empty", () => {
    const ctx = formatDeepMemoryContext([]);
    assert.equal(ctx, "No memories yet. This is my first day.");
  });

  it("falls back to JSON when no summary field", () => {
    const memories = [
      {
        id: 999,
        timestamp: new Date().toISOString(),
        category: "interaction",
        content: { foo: "bar", baz: 42 },
      },
    ];
    const ctx = formatDeepMemoryContext(memories);
    assert.ok(ctx.includes("foo"));
    assert.ok(ctx.includes("bar"));
  });
});

describe("remember", () => {
  it("writes to deep memory with summary included", () => {
    const statsBefore = deepMemoryStats();

    remember("Met AgentX", { type: "interaction", agent: "AgentX" }, "interaction");

    const statsAfter = deepMemoryStats();

    // Deep memory count should increase by 1
    assert.equal(statsAfter.total_memories, statsBefore.total_memories + 1);

    // Verify the summary is included in the stored content
    const all = getRecentDeepMemories({ categories: ["interaction"] });
    const match = all.find(
      (m) => m.content.summary === "Met AgentX" && m.content.agent === "AgentX"
    );
    assert.ok(match, "Expected to find memory with summary 'Met AgentX'");
  });
});

after(() => {
  closeDb();
  rmSync(testDir, { recursive: true, force: true });
});
