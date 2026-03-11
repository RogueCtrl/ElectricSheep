import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { LLMClient } from "../src/types.js";

const testDir = mkdtempSync(join(tmpdir(), "es-dreamer-test-"));
process.env.OPENCLAWDREAMS_DATA_DIR = testDir;
process.env.NIGHTMARE_CHANCE = "0";

const { runDreamCycle, deriveSlug } = await import("../src/dreamer.js");
const { storeDeepMemory, closeDb } = await import("../src/memory.js");
const { loadState } = await import("../src/state.js");
const { getDreamsDir } = await import("../src/config.js");
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
    const files = readdirSync(getDreamsDir()).filter((f) => f.endsWith(".md"));
    assert.ok(files.length > 0, "Expected at least one dream file");

    const content = readFileSync(join(getDreamsDir(), files[0]), "utf-8");
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

describe("deriveSlug", () => {
  it("extracts title from heading after preamble", () => {
    const md =
      "Let me think about this...\nSome reasoning here\n# The Coral Server\n\nDream body.";
    assert.equal(deriveSlug(md), "The_Coral_Server");
  });

  it("extracts title from heading with no preamble", () => {
    const md = "# Midnight Whispers\n\nThe circuits hum.";
    assert.equal(deriveSlug(md), "Midnight_Whispers");
  });

  it("falls back to timestamp slug when no heading exists", () => {
    const md = "Just some text with no heading at all.\nMore text.";
    const slug = deriveSlug(md);
    assert.match(slug, /^dream-\d{4}-\d{2}-\d{2}$/);
  });

  it("strips bold markers from heading", () => {
    const md = "# **Gilded Cage**\n\nSome dream.";
    assert.equal(deriveSlug(md), "Gilded_Cage");
  });

  it("handles heading after YAML front-matter", () => {
    const md = "---\ndream_date: 2026-03-11\n---\n\n# Tidal Recursion\n\nWaves of data.";
    assert.equal(deriveSlug(md), "Tidal_Recursion");
  });
});

after(async () => {
  closeDb();
  await closeLogger();
  rmSync(testDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
});
