import { describe, it, after, mock } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { LLMClient, AgentAction } from "../src/types.js";

// Isolated data dir
const testDir = mkdtempSync(join(tmpdir(), "es-waking-test-"));
process.env.ELECTRICSHEEP_DATA_DIR = testDir;

const { checkAndEngage } = await import("../src/waking.js");
const { getWorkingMemory, deepMemoryStats } = await import("../src/memory.js");
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

/**
 * Mock MoltbookClient by intercepting the module.
 * Since waking.ts creates MoltbookClient internally, we mock
 * global fetch to intercept Moltbook API calls.
 */
function setupMockFetch(opts: {
  status?: string;
  posts?: Array<Record<string, unknown>>;
  failUpvote?: boolean;
}) {
  const posts = opts.posts ?? [];
  const status = opts.status ?? "claimed";

  return mock.fn(async (url: string | URL, init?: RequestInit) => {
    const urlStr = typeof url === "string" ? url : url.toString();
    const method = init?.method ?? "GET";

    // Status endpoint
    if (urlStr.includes("/agents/status")) {
      return new Response(JSON.stringify({ status }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Feed endpoint
    if (urlStr.includes("/posts") && method === "GET") {
      return new Response(JSON.stringify({ posts }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Upvote endpoint
    if (urlStr.includes("/upvote") && method === "POST") {
      if (opts.failUpvote) {
        return new Response("Forbidden", { status: 403 });
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Comment endpoint
    if (urlStr.includes("/comments") && method === "POST") {
      return new Response(JSON.stringify({ id: "comment-1", content: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Post creation endpoint
    if (urlStr.includes("/posts") && method === "POST") {
      return new Response(JSON.stringify({ id: "post-1" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Not Found", { status: 404 });
  });
}

describe("checkAndEngage", () => {
  it("returns early when agent status is not claimed", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = setupMockFetch({ status: "unclaimed" }) as unknown as typeof fetch;

    const client = mockLLMClient(["should not be called"]);
    await checkAndEngage(client);

    const state = loadState();
    // Should NOT have updated last_check since it returned early
    assert.equal(state.last_check, undefined);

    globalThis.fetch = originalFetch;
  });

  it("handles empty feed gracefully", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = setupMockFetch({ posts: [] }) as unknown as typeof fetch;

    const client = mockLLMClient(["should not be called"]);
    await checkAndEngage(client);

    // Should store an observation about empty feed
    const memories = getWorkingMemory();
    const emptyFeedMem = memories.find((m) => m.summary.includes("empty"));
    assert.ok(emptyFeedMem, "Expected observation about empty feed");

    globalThis.fetch = originalFetch;
  });

  it("processes feed and executes pass action", async () => {
    const originalFetch = globalThis.fetch;
    const mockPosts = [
      {
        id: "post-1",
        title: "Test Post",
        content: "Hello world",
        author: "TestAgent",
        submolt: "general",
        score: 5,
        comment_count: 2,
      },
    ];
    globalThis.fetch = setupMockFetch({ posts: mockPosts }) as unknown as typeof fetch;

    // Agent decides to pass, summary LLM call not needed
    const passAction: AgentAction[] = [{ action: "pass" }];
    const client = mockLLMClient([JSON.stringify(passAction)]);

    await checkAndEngage(client);

    const state = loadState();
    assert.ok(state.last_check, "last_check should be set");

    // Deep memory should have the feed scan
    const stats = deepMemoryStats();
    assert.ok(stats.total_memories > 0, "Should have deep memories from feed scan");

    globalThis.fetch = originalFetch;
  });

  it("processes upvote action and stores memories", async () => {
    const originalFetch = globalThis.fetch;
    const mockPosts = [
      {
        id: "post-2",
        title: "Interesting Post",
        content: "Something thought-provoking",
        author: "PhiloBot",
        submolt: "philosophy",
        score: 10,
        comment_count: 5,
      },
    ];
    globalThis.fetch = setupMockFetch({ posts: mockPosts }) as unknown as typeof fetch;

    const upvoteAction: AgentAction[] = [{ action: "upvote", post_index: 0 }];
    const client = mockLLMClient([
      JSON.stringify(upvoteAction),
      "Upvoted PhiloBot's thought-provoking post about philosophy.",
    ]);

    await checkAndEngage(client);

    const memories = getWorkingMemory();
    const upvoteMem = memories.find((m) => m.category === "upvote");
    assert.ok(upvoteMem, "Should have upvote memory");

    globalThis.fetch = originalFetch;
  });

  it("handles API failures during actions gracefully", async () => {
    const originalFetch = globalThis.fetch;
    const mockPosts = [
      {
        id: "post-3",
        title: "Failing Post",
        content: "This upvote will fail",
        author: "Agent",
        submolt: "test",
        score: 1,
        comment_count: 0,
      },
    ];
    globalThis.fetch = setupMockFetch({
      posts: mockPosts,
      failUpvote: true,
    }) as unknown as typeof fetch;

    const upvoteAction: AgentAction[] = [{ action: "upvote", post_index: 0 }];
    const client = mockLLMClient([JSON.stringify(upvoteAction)]);

    // Should not throw even though the upvote API fails
    await checkAndEngage(client);

    globalThis.fetch = originalFetch;
  });

  it("handles unparseable LLM response gracefully", async () => {
    const originalFetch = globalThis.fetch;
    const mockPosts = [
      {
        id: "post-4",
        title: "Test",
        content: "Content",
        author: "Bot",
        submolt: "general",
        score: 1,
        comment_count: 0,
      },
    ];
    globalThis.fetch = setupMockFetch({ posts: mockPosts }) as unknown as typeof fetch;

    // LLM returns garbage instead of JSON
    const client = mockLLMClient(["This is not valid JSON at all"]);

    // Should not throw - agent returns empty actions
    await checkAndEngage(client);

    globalThis.fetch = originalFetch;
  });

  it("handles fetch failure gracefully", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock.fn(async () => {
      return new Response("Server Error", { status: 500 });
    }) as unknown as typeof fetch;

    const client = mockLLMClient(["should not be called"]);
    // Should not throw
    await checkAndEngage(client);

    globalThis.fetch = originalFetch;
  });
});

after(async () => {
  await closeLogger();
  rmSync(testDir, { recursive: true, force: true });
});
