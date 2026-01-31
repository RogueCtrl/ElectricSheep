import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { LLMClient } from "../src/types.js";

const testDir = mkdtempSync(join(tmpdir(), "es-filter-test-"));
process.env.ELECTRICSHEEP_DATA_DIR = testDir;
// Disable filter by default for setup; individual tests will enable it
process.env.POST_FILTER_ENABLED = "true";

const { filterContent, applyFilter, clearFilterCache } = await import("../src/filter.js");
const { setWorkspaceDir } = await import("../src/identity.js");
const { closeLogger } = await import("../src/logger.js");

function mockLLMClient(response: string): LLMClient {
  return {
    async createMessage() {
      return { text: response, usage: { input_tokens: 50, output_tokens: 30 } };
    },
  };
}

// Create a workspace dir with a filter file
const workspaceDir = join(testDir, "workspace");
mkdirSync(workspaceDir, { recursive: true });
setWorkspaceDir(workspaceDir);

describe("Post filter", () => {
  it("passes content when no filter file exists", async () => {
    clearFilterCache();
    const client = mockLLMClient("should not be called");
    const verdict = await filterContent(client, "Hello world", "post");
    assert.equal(verdict.outcome, "pass");
  });

  it("parses PASS verdict", async () => {
    writeFileSync(
      join(workspaceDir, "Moltbook-filter.md"),
      "- Be respectful\n- No profanity"
    );
    clearFilterCache();

    const client = mockLLMClient("PASS");
    const verdict = await filterContent(client, "A thoughtful post", "post");
    assert.equal(verdict.outcome, "pass");
  });

  it("parses FAIL verdict with reason", async () => {
    clearFilterCache();
    const client = mockLLMClient("FAIL: Contains profanity in the second paragraph");
    const verdict = await filterContent(client, "Some bad content", "post");
    assert.equal(verdict.outcome, "fail");
    assert.ok("reason" in verdict && verdict.reason.includes("profanity"));
  });

  it("parses REVISE verdict with revised content", async () => {
    clearFilterCache();
    const client = mockLLMClient("REVISE: A cleaned up version of the post");
    const verdict = await filterContent(client, "Original post", "post");
    assert.equal(verdict.outcome, "revise");
    assert.ok("revised" in verdict && verdict.revised.includes("cleaned up"));
  });

  it("defaults to pass on unexpected format", async () => {
    clearFilterCache();
    const client = mockLLMClient("I think this post is fine.");
    const verdict = await filterContent(client, "Some content", "post");
    assert.equal(verdict.outcome, "pass");
  });

  it("defaults to pass on LLM error", async () => {
    clearFilterCache();
    const client: LLMClient = {
      async createMessage() {
        throw new Error("API timeout");
      },
    };
    const verdict = await filterContent(client, "Some content", "post");
    assert.equal(verdict.outcome, "pass");
  });

  it("applyFilter returns original on PASS", async () => {
    clearFilterCache();
    const client = mockLLMClient("PASS");
    const result = await applyFilter(client, "My post content", "post");
    assert.equal(result, "My post content");
  });

  it("applyFilter returns revised content on REVISE", async () => {
    clearFilterCache();
    const client = mockLLMClient("REVISE: My edited post content");
    const result = await applyFilter(client, "My post content", "post");
    assert.equal(result, "My edited post content");
  });

  it("applyFilter returns null on FAIL", async () => {
    clearFilterCache();
    const client = mockLLMClient("FAIL: Violates rule about profanity");
    const result = await applyFilter(client, "Bad content", "post");
    assert.equal(result, null);
  });
});

after(async () => {
  await closeLogger();
  rmSync(testDir, { recursive: true, force: true });
});
