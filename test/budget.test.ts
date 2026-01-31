import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { LLMClient } from "../src/types.js";

const testDir = mkdtempSync(join(tmpdir(), "es-budget-test-"));
process.env.ELECTRICSHEEP_DATA_DIR = testDir;
process.env.MAX_DAILY_TOKENS = "1000";

const { withBudget, getTokensUsedToday, getTokensRemaining, getBudgetStatus } =
  await import("../src/budget.js");
const { saveState } = await import("../src/state.js");
const { closeLogger } = await import("../src/logger.js");

function mockClient(inputTokens: number, outputTokens: number): LLMClient {
  return {
    async createMessage() {
      return {
        text: "mock response",
        usage: { input_tokens: inputTokens, output_tokens: outputTokens },
      };
    },
  };
}

describe("Token budget", () => {
  it("starts at zero usage", () => {
    assert.equal(getTokensUsedToday(), 0);
    assert.equal(getTokensRemaining(), 1000);
  });

  it("tracks usage after a call through withBudget", async () => {
    const client = withBudget(mockClient(100, 50));
    const result = await client.createMessage({
      model: "test",
      maxTokens: 100,
      system: "test",
      messages: [{ role: "user", content: "test" }],
    });

    assert.equal(result.text, "mock response");
    assert.equal(getTokensUsedToday(), 150);
    assert.equal(getTokensRemaining(), 850);
  });

  it("accumulates across multiple calls", async () => {
    const client = withBudget(mockClient(200, 100));
    await client.createMessage({
      model: "test",
      maxTokens: 100,
      system: "test",
      messages: [{ role: "user", content: "test" }],
    });

    assert.equal(getTokensUsedToday(), 450); // 150 + 300
    assert.equal(getTokensRemaining(), 550);
  });

  it("throws BudgetExceededError when limit is reached", async () => {
    const client = withBudget(mockClient(400, 200));

    // This call should succeed (450 + 600 = 1050, but check is before the call)
    await client.createMessage({
      model: "test",
      maxTokens: 100,
      system: "test",
      messages: [{ role: "user", content: "test" }],
    });

    // Now at 1050, next call should be rejected
    await assert.rejects(
      () =>
        client.createMessage({
          model: "test",
          maxTokens: 100,
          system: "test",
          messages: [{ role: "user", content: "test" }],
        }),
      { name: "BudgetExceededError" }
    );
  });

  it("resets on a new day", () => {
    // Simulate yesterday's state
    saveState({
      budget_date: "2020-01-01",
      budget_tokens_used: 999999,
    });

    // Should return 0 because the date doesn't match today
    assert.equal(getTokensUsedToday(), 0);
    assert.equal(getTokensRemaining(), 1000);
  });

  it("returns correct budget status", () => {
    saveState({});
    const status = getBudgetStatus();
    assert.equal(status.enabled, true);
    assert.equal(status.limit, 1000);
    assert.equal(status.used, 0);
    assert.equal(status.remaining, 1000);
    assert.ok(status.date.match(/^\d{4}-\d{2}-\d{2}$/));
  });

  it("handles calls with no usage data", async () => {
    saveState({});
    const noUsageClient: LLMClient = {
      async createMessage() {
        return { text: "no usage" };
      },
    };
    const client = withBudget(noUsageClient);
    const result = await client.createMessage({
      model: "test",
      maxTokens: 100,
      system: "test",
      messages: [{ role: "user", content: "test" }],
    });

    assert.equal(result.text, "no usage");
    assert.equal(getTokensUsedToday(), 0); // no usage recorded
  });
});

after(async () => {
  await closeLogger();
  rmSync(testDir, { recursive: true, force: true });
});
