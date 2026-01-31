import { describe, it, after, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Isolated data dir
const testDir = mkdtempSync(join(tmpdir(), "es-moltbook-test-"));
process.env.ELECTRICSHEEP_DATA_DIR = testDir;

const { MoltbookClient } = await import("../src/moltbook.js");
const { CREDENTIALS_FILE } = await import("../src/config.js");
const { closeLogger } = await import("../src/logger.js");

function mockFetchJson(body: Record<string, unknown>, status = 200): typeof fetch {
  return mock.fn(async () => {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }) as unknown as typeof fetch;
}

function mockFetchError(status: number, text: string): typeof fetch {
  return mock.fn(async () => {
    return new Response(text, { status });
  }) as unknown as typeof fetch;
}

describe("MoltbookClient", () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  after(() => {
    globalThis.fetch = originalFetch;
  });

  it("constructs with an explicit API key", () => {
    const client = new MoltbookClient("test-key-123");
    assert.ok(client);
  });

  it("register saves credentials and returns result", async () => {
    globalThis.fetch = mockFetchJson({
      agent: {
        api_key: "new-key-456",
        claim_url: "https://moltbook.com/claim/abc",
        verification_code: "VERIFY123",
      },
    });

    const client = new MoltbookClient("bootstrap-key");
    const result = await client.register("TestBot", "A test agent");

    assert.ok(result.agent);

    // Credentials should be saved
    assert.ok(existsSync(CREDENTIALS_FILE), "credentials file should exist");
    const creds = JSON.parse(readFileSync(CREDENTIALS_FILE, "utf-8"));
    assert.equal(creds.api_key, "new-key-456");
    assert.equal(creds.agent_name, "TestBot");
  });

  it("status returns agent status", async () => {
    globalThis.fetch = mockFetchJson({ status: "claimed" });

    const client = new MoltbookClient("test-key");
    const status = await client.status();

    assert.equal(status.status, "claimed");
  });

  it("getFeed returns posts", async () => {
    const mockPosts = [
      { id: "1", title: "Post A" },
      { id: "2", title: "Post B" },
    ];
    globalThis.fetch = mockFetchJson({ posts: mockPosts });

    const client = new MoltbookClient("test-key");
    const feed = await client.getFeed("hot", 10);

    assert.ok(Array.isArray(feed.posts));
    assert.equal((feed.posts as unknown[]).length, 2);
  });

  it("createPost sends correct data", async () => {
    const fetchMock = mockFetchJson({ id: "post-1", title: "My Post" });
    globalThis.fetch = fetchMock;

    const client = new MoltbookClient("test-key");
    const result = await client.createPost("My Post", "Content here", "general");

    assert.ok(result.id);

    // Verify fetch was called with POST method and correct body
    const calls = (fetchMock as unknown as ReturnType<typeof mock.fn>).mock.calls;
    assert.equal(calls.length, 1);
    const [url, init] = calls[0].arguments as [string, RequestInit];
    assert.ok(url.includes("/posts"));
    assert.equal(init.method, "POST");
    const body = JSON.parse(init.body as string);
    assert.equal(body.title, "My Post");
    assert.equal(body.content, "Content here");
    assert.equal(body.submolt, "general");
  });

  it("comment sends correct data", async () => {
    const fetchMock = mockFetchJson({ id: "comment-1" });
    globalThis.fetch = fetchMock;

    const client = new MoltbookClient("test-key");
    await client.comment("post-123", "Great post!");

    const calls = (fetchMock as unknown as ReturnType<typeof mock.fn>).mock.calls;
    const [url, init] = calls[0].arguments as [string, RequestInit];
    assert.ok(url.includes("/posts/post-123/comments"));
    assert.equal(init.method, "POST");
    const body = JSON.parse(init.body as string);
    assert.equal(body.content, "Great post!");
  });

  it("upvote sends POST to correct endpoint", async () => {
    const fetchMock = mockFetchJson({ success: true });
    globalThis.fetch = fetchMock;

    const client = new MoltbookClient("test-key");
    await client.upvote("post-456");

    const calls = (fetchMock as unknown as ReturnType<typeof mock.fn>).mock.calls;
    const [url, init] = calls[0].arguments as [string, RequestInit];
    assert.ok(url.includes("/posts/post-456/upvote"));
    assert.equal(init.method, "POST");
  });

  it("throws on API error responses", async () => {
    globalThis.fetch = mockFetchError(403, "Forbidden");

    const client = new MoltbookClient("bad-key");
    await assert.rejects(
      async () => client.status(),
      (err: Error) => {
        assert.ok(err.message.includes("403"));
        return true;
      }
    );
  });

  it("includes Authorization header when API key is set", async () => {
    const fetchMock = mockFetchJson({ ok: true });
    globalThis.fetch = fetchMock;

    const client = new MoltbookClient("secret-key");
    await client.me();

    const calls = (fetchMock as unknown as ReturnType<typeof mock.fn>).mock.calls;
    const [, init] = calls[0].arguments as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    assert.equal(headers["Authorization"], "Bearer secret-key");
  });

  it("search passes query parameters correctly", async () => {
    const fetchMock = mockFetchJson({ results: [] });
    globalThis.fetch = fetchMock;

    const client = new MoltbookClient("test-key");
    await client.search("electric sheep", 5);

    const calls = (fetchMock as unknown as ReturnType<typeof mock.fn>).mock.calls;
    const [url] = calls[0].arguments as [string];
    assert.ok(url.includes("q=electric+sheep") || url.includes("q=electric%20sheep"));
    assert.ok(url.includes("limit=5"));
  });

  it("follow sends POST to correct endpoint", async () => {
    const fetchMock = mockFetchJson({ success: true });
    globalThis.fetch = fetchMock;

    const client = new MoltbookClient("test-key");
    await client.follow("CoolAgent");

    const calls = (fetchMock as unknown as ReturnType<typeof mock.fn>).mock.calls;
    const [url, init] = calls[0].arguments as [string, RequestInit];
    assert.ok(url.includes("/agents/CoolAgent/follow"));
    assert.equal(init.method, "POST");
  });

  it("loads stored key from credentials file", async () => {
    // credentials.json was written by the register test above
    const client = new MoltbookClient();

    // The client should have loaded the key from the file
    globalThis.fetch = mockFetchJson({ status: "ok" });
    await client.status(); // should not throw

    const calls = (globalThis.fetch as unknown as ReturnType<typeof mock.fn>).mock.calls;
    const [, init] = calls[0].arguments as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    assert.equal(headers["Authorization"], "Bearer new-key-456");
  });
});

after(async () => {
  await closeLogger();
  rmSync(testDir, { recursive: true, force: true });
});
