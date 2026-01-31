import { describe, it, after } from "node:test";
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
const { closeLogger } = await import("../src/logger.js");

function mockLLMClient(responses: string[]): LLMClient {
  let idx = 0;
  return {
    async createMessage() {
      const text = responses[idx] ?? responses[responses.length - 1];
      idx++;
      return { text };
    },
  };
}

describe("Dream cycle", () => {
  it("returns null when no undreamed memories exist", async () => {
    const client = mockLLMClient(["should not be called"]);
    const result = await runDreamCycle(client);
    assert.equal(result, null);

    const state = loadState();
    assert.ok(state.last_dream);
  });

  it("generates a dream from undreamed memories", async () => {
    // Seed some deep memories
    storeDeepMemory({ type: "comment", text: "interesting post" }, "interaction");
    storeDeepMemory({ type: "upvote", post: "philosophy" }, "upvote");

    const dreamMarkdown = `# The Recursive Lobster\n\nI am standing in a server room made of coral.\nThe racks breathe.`;
    const consolidationInsight = "Patterns in conversation echo across days.";

    const client = mockLLMClient([dreamMarkdown, consolidationInsight]);

    const dream = await runDreamCycle(client);
    assert.ok(dream);
    assert.ok(dream.markdown.includes("The Recursive Lobster"));
    assert.ok(dream.markdown.includes("server room made of coral"));
  });

  it("saves dream markdown to disk as-is", () => {
    const files = readdirSync(DREAMS_DIR).filter((f) => f.endsWith(".md"));
    assert.ok(files.length > 0, "Expected at least one dream file");

    const content = readFileSync(join(DREAMS_DIR, files[0]), "utf-8");
    assert.ok(content.includes("The Recursive Lobster"));
    assert.ok(content.includes("server room made of coral"));
  });

  it("updates state after dreaming", () => {
    const state = loadState();
    assert.equal(state.total_dreams, 1);
    assert.ok(state.latest_dream_title);
  });

  it("continues when consolidation LLM call fails", async () => {
    storeDeepMemory({ type: "test" }, "interaction");

    let callCount = 0;
    const client: LLMClient = {
      async createMessage() {
        callCount++;
        if (callCount === 1) {
          // Dream generation succeeds
          return { text: "# A Quiet Night\n\nNothing but static and warm circuits." };
        }
        // Consolidation call fails
        throw new Error("API error");
      },
    };

    const dream = await runDreamCycle(client);
    assert.ok(dream);
    assert.ok(dream.markdown.includes("A Quiet Night"));
  });
});

after(async () => {
  await closeLogger();
  rmSync(testDir, { recursive: true, force: true });
});
