import { describe, it, before, after, mock } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  rmSync,
  mkdirSync,
  writeFileSync,
  existsSync,
  readFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Fake home dir
const fakeHome = mkdtempSync(join(tmpdir(), "es-fallback-test-home-"));
process.env.HOME = fakeHome;
// Unset DATA_DIR to ensure fallback path is used
delete process.env.OPENCLAWDREAMS_DATA_DIR;

// Import after setting HOME
const { getStableCredentialsFile, getCredentialsFile } = await import("../src/config.js");
const { MoltbookClient } = await import("../src/moltbook.js");

function mockFetchJson(body: Record<string, unknown>, status = 200): typeof fetch {
  return mock.fn(async () => {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }) as unknown as typeof fetch;
}

describe("MoltbookClient Credentials Fallback", () => {
  let originalFetch: typeof fetch;

  before(() => {
    originalFetch = globalThis.fetch;
  });

  after(() => {
    globalThis.fetch = originalFetch;
    rmSync(fakeHome, { recursive: true, force: true });
  });

  it("resolves credentials file to stable fallback when OPENCLAWDREAMS_DATA_DIR is unset", () => {
    assert.equal(getCredentialsFile(), getStableCredentialsFile());
    assert.ok(getCredentialsFile().includes(".config/openclawdreams"));
  });

  it("loads stored key from stable fallback when OPENCLAWDREAMS_DATA_DIR is unset", async () => {
    // Prepare fake credentials in the stable location
    const configDir = join(fakeHome, ".config", "openclawdreams");
    mkdirSync(configDir, { recursive: true });
    const credsFile = join(configDir, "credentials.json");
    writeFileSync(credsFile, JSON.stringify({ api_key: "fallback-key-123" }));

    const client = new MoltbookClient();

    globalThis.fetch = mockFetchJson({ status: "ok" });
    await client.status();

    const calls = (globalThis.fetch as unknown as ReturnType<typeof mock.fn>).mock.calls;
    const [, init] = calls[0].arguments as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    assert.equal(headers["Authorization"], "Bearer fallback-key-123");
  });

  it("saves credentials to stable fallback when OPENCLAWDREAMS_DATA_DIR is unset", async () => {
    globalThis.fetch = mockFetchJson({
      agent: {
        api_key: "new-key-789",
        claim_url: "https://moltbook.com/claim/xyz",
        verification_code: "VERIFY789",
      },
    });

    const client = new MoltbookClient("bootstrap-key");
    await client.register("TestBot", "A test agent");

    const credsFile = getStableCredentialsFile();
    assert.ok(
      existsSync(credsFile),
      "credentials file should be saved in stable location"
    );
    const creds = JSON.parse(readFileSync(credsFile, "utf-8"));
    assert.equal(creds.api_key, "new-key-789");
  });
});
