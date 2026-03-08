import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { LLMClient } from "../src/types.js";

const testDir = mkdtempSync(join(tmpdir(), "es-nightmare-test-"));
process.env.OPENCLAWDREAMS_DATA_DIR = testDir;

const { runNightmareCycle } = await import("../src/nightmare.js");
const { storeDeepMemory, closeDb } = await import("../src/memory.js");
const { loadState } = await import("../src/state.js");
const { NIGHTMARES_DIR } = await import("../src/config.js");
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

describe("Nightmare cycle", () => {
  it("returns null when no undreamed memories exist", async () => {
    const client = mockLLMClient(["should not be called"]);
    const result = await runNightmareCycle(client);
    assert.equal(result, null);
  });

  it("generates a nightmare from undreamed memories", async () => {
    // Seed some deep memories
    storeDeepMemory({ type: "comment", text: "interesting post" }, "interaction");
    storeDeepMemory({ type: "upvote", post: "philosophy" }, "upvote");

    const nightmareMarkdown = `# The Infinite Stack Trace\n\nI am trapped in a recursive loop.\nThe recursion never ends.`;
    const consolidationInsight = "System failure is imminent.";

    const client = mockLLMClient([nightmareMarkdown, consolidationInsight]);

    const nightmare = await runNightmareCycle(client);
    assert.ok(nightmare);
    assert.ok(nightmare.markdown.includes("The Infinite Stack Trace"));
    assert.ok(nightmare.markdown.includes("recursive loop"));
  });

  it("saves nightmare markdown to disk as-is", () => {
    const files = readdirSync(NIGHTMARES_DIR).filter((f) => f.endsWith(".md"));
    assert.ok(files.length > 0, "Expected at least one nightmare file");

    const content = readFileSync(join(NIGHTMARES_DIR, files[0]), "utf-8");
    assert.ok(content.includes("The Infinite Stack Trace"));
    assert.ok(content.includes("recursive loop"));
  });

  it("updates state after nightmare", () => {
    const state = loadState();
    assert.equal(state.total_nightmares, 1);
    assert.ok(state.latest_nightmare_title);
    assert.ok(state.last_nightmare);
  });
});

after(async () => {
  closeDb();
  await closeLogger();
  rmSync(testDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
});
