import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { LLMClient, OpenClawAPI } from "../src/types.js";

// Isolated data dir
const testDir = mkdtempSync(join(tmpdir(), "es-waking-test-"));
process.env.ELECTRICSHEEP_DATA_DIR = testDir;

const { runReflectionCycle, checkAndEngage } = await import("../src/waking.js");
const { deepMemoryStats, storeDeepMemory } = await import("../src/memory.js");
const { loadState } = await import("../src/state.js");
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

function mockOpenClawAPI(): OpenClawAPI {
  return {
    registerTool: () => {},
    registerCli: () => {},
    registerHook: (_event, _handler) => {},
    registerCron: () => {},
    gateway: {
      createMessage: async () => ({ content: [{ text: "" }] }),
    },
  };
}

function mockOpenClawAPIWithMemory(): OpenClawAPI & {
  storedMemories: Array<{ content: string; metadata?: Record<string, unknown> }>;
} {
  const storedMemories: Array<{
    content: string;
    metadata?: Record<string, unknown>;
  }> = [];
  return {
    registerTool: () => {},
    registerCli: () => {},
    registerHook: (_event, _handler) => {},
    registerCron: () => {},
    gateway: {
      createMessage: async () => ({ content: [{ text: "" }] }),
    },
    memory: {
      async store(content: string, metadata?: Record<string, unknown>) {
        storedMemories.push({ content, metadata });
      },
      async search(_query: string, _limit?: number) {
        return [];
      },
    },
    storedMemories,
  };
}

describe("runReflectionCycle", () => {
  it("handles no recent conversations gracefully", async () => {
    const client = mockLLMClient(["should not be called"]);
    const api = mockOpenClawAPI();

    const statsBefore = deepMemoryStats();
    await runReflectionCycle(client, api);
    const statsAfter = deepMemoryStats();

    // Should store an observation in deep memory about no conversations
    assert.ok(
      statsAfter.total_memories > statsBefore.total_memories,
      "Expected observation stored in deep memory"
    );
  });

  it("extracts topics from operator conversations", async () => {
    // Seed some mock operator conversations in deep memory
    storeDeepMemory(
      {
        summary: "Discussed debugging a memory leak in the Node.js application",
        type: "agent_conversation",
      },
      "interaction"
    );
    storeDeepMemory(
      {
        summary: "Helped operator understand async/await patterns in TypeScript",
        type: "agent_conversation",
      },
      "interaction"
    );

    // LLM responses: topic extraction, then synthesis, then summary
    const client = mockLLMClient([
      "memory leaks in Node.js\nasync programming patterns\nTypeScript debugging",
      "Today I worked with my operator on debugging memory issues and understanding async patterns. These topics connect to broader discussions about Node.js performance.",
      "Reflected on debugging and async patterns with operator, synthesizing insights about Node.js development.",
    ]);

    const api = mockOpenClawAPI();
    await runReflectionCycle(client, api);

    const state = loadState();
    assert.ok(state.last_check, "last_check should be set");
    assert.ok(state.last_reflection_topics, "last_reflection_topics should be set");
  });

  it("stores synthesis in OpenClaw memory when available", async () => {
    storeDeepMemory(
      { summary: "Worked on API integration project", type: "agent_conversation" },
      "interaction"
    );

    const client = mockLLMClient([
      "API integration\nREST endpoints",
      "Synthesized understanding of API patterns from today's work.",
      "Reflected on API integration work.",
    ]);

    const api = mockOpenClawAPIWithMemory();
    await runReflectionCycle(client, api);

    assert.ok(api.storedMemories.length > 0, "Should have stored in OpenClaw memory");
    assert.ok(
      api.storedMemories[0].metadata?.type === "reflection_synthesis",
      "Should have correct metadata type"
    );
  });

  it("stores synthesis in deep memory", async () => {
    storeDeepMemory(
      { summary: "Built a new feature for the dashboard", type: "agent_conversation" },
      "interaction"
    );

    const client = mockLLMClient([
      "dashboard features\nUI development",
      "Synthesis of dashboard work and UI patterns.",
      "Summary of dashboard feature development.",
    ]);

    const api = mockOpenClawAPI();
    const statsBefore = deepMemoryStats();

    await runReflectionCycle(client, api);

    const statsAfter = deepMemoryStats();
    assert.ok(
      statsAfter.total_memories > statsBefore.total_memories,
      "Should have new deep memories"
    );
  });

  it("handles topic extraction returning no topics", async () => {
    storeDeepMemory(
      { summary: "Had a brief chat", type: "agent_conversation" },
      "interaction"
    );

    // LLM returns empty topics
    const client = mockLLMClient([""]);
    const api = mockOpenClawAPI();

    const statsBefore = deepMemoryStats();
    await runReflectionCycle(client, api);
    const statsAfter = deepMemoryStats();

    // Should store an observation in deep memory about no topics
    assert.ok(
      statsAfter.total_memories > statsBefore.total_memories,
      "Expected observation stored in deep memory"
    );
  });
});

describe("checkAndEngage (legacy)", () => {
  it("logs deprecation warning and runs reflection cycle", async () => {
    const client = mockLLMClient(["should not be called"]);

    const statsBefore = deepMemoryStats();

    // Should not throw - runs reflection cycle internally
    await checkAndEngage(client);

    const statsAfter = deepMemoryStats();
    // Should have stored something (observation about no conversations)
    assert.ok(
      statsAfter.total_memories > statsBefore.total_memories,
      "Should have some memories from the cycle"
    );
  });
});

after(async () => {
  await closeLogger();
  rmSync(testDir, { recursive: true, force: true });
});
