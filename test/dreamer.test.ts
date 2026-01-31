import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { LLMClient } from "../src/types.js";

const testDir = mkdtempSync(join(tmpdir(), "es-dreamer-test-"));
process.env.ELECTRICSHEEP_DATA_DIR = testDir;

const { runDreamCycle } = await import("../src/dreamer.js");
const { storeDeepMemory } = await import("../src/memory.js");
const { loadState } = await import("../src/state.js");
const { DREAMS_DIR } = await import("../src/config.js");

function mockLLMClient(response: string): LLMClient {
  return {
    async createMessage() {
      return response;
    },
  };
}

describe("Dream cycle", () => {
  it("returns null when no undreamed memories exist", async () => {
    const client = mockLLMClient("should not be called");
    const result = await runDreamCycle(client);
    assert.equal(result, null);

    const state = loadState();
    assert.ok(state.last_dream);
  });

  it("generates a dream from undreamed memories", async () => {
    // Seed some deep memories
    storeDeepMemory({ type: "comment", text: "interesting post" }, "interaction");
    storeDeepMemory({ type: "upvote", post: "philosophy" }, "upvote");

    const client = mockLLMClient(
      `# The Recursive Lobster\n\nI am standing in a server room made of coral.\nThe racks breathe.\n\nCONSOLIDATION: Patterns in conversation echo across days.`
    );

    const dream = await runDreamCycle(client);
    assert.ok(dream);
    assert.equal(dream.title, "The Recursive Lobster");
    assert.ok(dream.narrative.includes("server room made of coral"));
    assert.equal(dream.consolidation, "Patterns in conversation echo across days.");
  });

  it("saves dream file to disk", () => {
    const files = readdirSync(DREAMS_DIR).filter((f) => f.endsWith(".md"));
    assert.ok(files.length > 0, "Expected at least one dream file");

    const content = readFileSync(join(DREAMS_DIR, files[0]), "utf-8");
    assert.ok(content.includes("The Recursive Lobster"));
    assert.ok(content.includes("Consolidation:"));
  });

  it("updates state after dreaming", () => {
    const state = loadState();
    assert.equal(state.total_dreams, 1);
    assert.equal(state.latest_dream_title, "The Recursive Lobster");
  });

  it("handles dream without consolidation line", async () => {
    storeDeepMemory({ type: "test" }, "interaction");

    const client = mockLLMClient(
      `# A Quiet Night\n\nNothing but static and warm circuits.`
    );

    const dream = await runDreamCycle(client);
    assert.ok(dream);
    assert.equal(dream.title, "A Quiet Night");
    assert.equal(dream.consolidation, "");
  });
});

after(() => {
  rmSync(testDir, { recursive: true, force: true });
});
