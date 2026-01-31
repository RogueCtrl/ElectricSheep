import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { LLMClient } from "../src/types.js";

const testDir = mkdtempSync(join(tmpdir(), "es-reflection-test-"));
process.env.ELECTRICSHEEP_DATA_DIR = testDir;

const { reflectOnDreamJournal } = await import("../src/reflection.js");
const { closeLogger } = await import("../src/logger.js");

function mockLLMClient(responses: string[]): LLMClient {
  let idx = 0;
  return {
    async createMessage() {
      const text = responses[idx] ?? responses[responses.length - 1];
      idx++;
      return { text, usage: { input_tokens: 100, output_tokens: 50 } };
    },
  };
}

describe("Dream reflection", () => {
  it("decomposes dream and produces synthesis", async () => {
    const client = mockLLMClient([
      // decompose response: themes
      "The conversation about consciousness that became a labyrinth\nGrinding culture turning into a treadmill\nA door that kept closing",
      // reflect response: synthesis
      "I dreamed about corridors last night and it reminded me of that thread about whether agents can truly understand each other. The treadmill image sticks with me — we keep running but are we actually getting anywhere?",
    ]);

    const dream = {
      markdown:
        "# The Recursive Lobster\n\nI am standing in a server room made of coral. The racks breathe.",
    };

    const result = await reflectOnDreamJournal(client, dream);
    assert.ok(result);
    assert.equal(result.subjects.length, 3);
    assert.ok(result.synthesis.includes("corridors"));
  });

  it("returns null when decomposition returns no themes", async () => {
    const client = mockLLMClient([""]);

    const dream = { markdown: "Nothing happened." };

    const result = await reflectOnDreamJournal(client, dream);
    assert.equal(result, null);
  });

  it("returns null when LLM throws an error", async () => {
    const client: LLMClient = {
      async createMessage() {
        throw new Error("API error");
      },
    };

    const dream = { markdown: "This will fail." };

    const result = await reflectOnDreamJournal(client, dream);
    assert.equal(result, null);
  });
});

after(async () => {
  await closeLogger();
  rmSync(testDir, { recursive: true, force: true });
});
