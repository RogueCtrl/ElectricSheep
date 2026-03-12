import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { LLMClient, SynthesisContext } from "../src/types.js";

// Isolated data dir
const testDir = mkdtempSync(join(tmpdir(), "es-synthesis-test-"));
process.env.OPENCLAWDREAMS_DATA_DIR = testDir;

const { synthesizeContext } = await import("../src/synthesis.js");
const { SYNTHESIS_PROMPT, SEEDING_PROMPT } = await import("../src/persona.js");
const { closeLogger } = await import("../src/logger.js");

after(async () => {
  closeLogger();
  // Give logger transports time to close before removing the directory
  await new Promise((r) => setTimeout(r, 200));
  rmSync(testDir, { recursive: true, force: true });
});

function captureSystemClient(): {
  client: LLMClient;
  calls: Array<{ system: string; content: string }>;
} {
  const calls: Array<{ system: string; content: string }> = [];
  const client: LLMClient = {
    async createMessage(params) {
      calls.push({
        system: params.system,
        content: params.messages[0].content,
      });
      return { text: "test response", usage: { input_tokens: 10, output_tokens: 10 } };
    },
  };
  return { client, calls };
}

const baseContext: SynthesisContext = {
  operatorContext: "Some recent experiences",
  topics: ["testing", "architecture"],
};

describe("synthesizeContext mode selection", () => {
  it("uses SYNTHESIS_PROMPT by default", async () => {
    const { client, calls } = captureSystemClient();
    await synthesizeContext(client, baseContext);
    assert.equal(calls.length, 1);
    assert.ok(
      calls[0].system.includes("synthesizing information"),
      "should use synthesis prompt"
    );
    assert.ok(calls[0].content.includes("Synthesize this into a coherent understanding"));
  });

  it("uses SYNTHESIS_PROMPT when mode is 'synthesis'", async () => {
    const { client, calls } = captureSystemClient();
    await synthesizeContext(client, baseContext, undefined, "synthesis");
    assert.equal(calls.length, 1);
    assert.ok(calls[0].system.includes("synthesizing information"));
  });

  it("uses SEEDING_PROMPT when mode is 'seeding'", async () => {
    const { client, calls } = captureSystemClient();
    await synthesizeContext(client, baseContext, undefined, "seeding");
    assert.equal(calls.length, 1);
    assert.ok(
      calls[0].system.includes("genuinely unresolved"),
      "should use seeding prompt"
    );
    assert.ok(calls[0].content.includes("open threads and unresolved tensions"));
  });

  it("returns empty string when no topics", async () => {
    const { client, calls } = captureSystemClient();
    const result = await synthesizeContext(
      client,
      { ...baseContext, topics: [] },
      undefined,
      "seeding"
    );
    assert.equal(result, "");
    assert.equal(calls.length, 0);
  });

  it("SEEDING_PROMPT and SYNTHESIS_PROMPT are distinct exports", () => {
    assert.ok(SYNTHESIS_PROMPT.length > 0);
    assert.ok(SEEDING_PROMPT.length > 0);
    assert.notEqual(SYNTHESIS_PROMPT, SEEDING_PROMPT);
  });
});
