import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { LLMClient } from "../src/types.js";

const testDir = mkdtempSync(join(tmpdir(), "es-budget-test-"));
process.env.ELECTRICSHEEP_DATA_DIR = testDir;
process.env.MAX_DAILY_TOKENS = "1000";

const {
  withBudget,
  getTokensUsedToday,
  getTokensRemaining,
  getBudgetStatus,
  BudgetExceededError,
} = await import("../src/budget.js");
const { saveState, loadState } = await import("../src/state.js");
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

describe("BudgetExceededError", () => {
  it("has correct name and descriptive message", () => {
    const err = new BudgetExceededError(1500, 1000);
    assert.equal(err.name, "BudgetExceededError");
    assert.ok(err.message.includes("1,500"));
    assert.ok(err.message.includes("1,000"));
    assert.ok(err.message.includes("midnight UTC"));
    assert.ok(err.message.includes("MAX_DAILY_TOKENS"));
    assert.ok(err instanceof Error);
  });
});

describe("Budget edge cases", () => {
  it("rejects at exactly the limit (used === limit)", async () => {
    saveState({
      budget_date: new Date().toISOString().slice(0, 10),
      budget_tokens_used: 1000,
    });

    const client = withBudget(mockClient(1, 1));
    await assert.rejects(
      () =>
        client.createMessage({
          model: "test",
          maxTokens: 10,
          system: "test",
          messages: [{ role: "user", content: "test" }],
        }),
      { name: "BudgetExceededError" }
    );
  });

  it("allows call just under the limit", async () => {
    saveState({
      budget_date: new Date().toISOString().slice(0, 10),
      budget_tokens_used: 999,
    });

    const client = withBudget(mockClient(50, 50));
    const result = await client.createMessage({
      model: "test",
      maxTokens: 10,
      system: "test",
      messages: [{ role: "user", content: "test" }],
    });

    assert.equal(result.text, "mock response");
    // Now at 999 + 100 = 1099 (crossed threshold, but call still completed)
    assert.equal(getTokensUsedToday(), 1099);
  });

  it("persists budget usage across state save/load cycles", async () => {
    saveState({});
    const client = withBudget(mockClient(200, 100));
    await client.createMessage({
      model: "test",
      maxTokens: 10,
      system: "test",
      messages: [{ role: "user", content: "test" }],
    });

    // Verify state was persisted
    const state = loadState();
    assert.equal(state.budget_date, new Date().toISOString().slice(0, 10));
    assert.equal(state.budget_tokens_used, 300);
  });

  it("counts both input and output tokens", async () => {
    saveState({});
    const client = withBudget(mockClient(75, 25));
    await client.createMessage({
      model: "test",
      maxTokens: 100,
      system: "test",
      messages: [{ role: "user", content: "test" }],
    });

    assert.equal(getTokensUsedToday(), 100); // 75 + 25
  });

  it("passes through all LLM params to the wrapped client", async () => {
    saveState({});
    let capturedParams: Record<string, unknown> | undefined;
    const spyClient: LLMClient = {
      async createMessage(params) {
        capturedParams = params as unknown as Record<string, unknown>;
        return {
          text: "ok",
          usage: { input_tokens: 10, output_tokens: 10 },
        };
      },
    };

    const wrapped = withBudget(spyClient);
    await wrapped.createMessage({
      model: "claude-test",
      maxTokens: 512,
      system: "you are helpful",
      messages: [{ role: "user", content: "hello" }],
    });

    assert.ok(capturedParams);
    assert.equal(capturedParams.model, "claude-test");
    assert.equal(capturedParams.maxTokens, 512);
    assert.equal(capturedParams.system, "you are helpful");
    assert.deepEqual(capturedParams.messages, [{ role: "user", content: "hello" }]);
  });

  it("propagates errors from the underlying client", async () => {
    saveState({});
    const failingClient: LLMClient = {
      async createMessage() {
        throw new Error("API connection failed");
      },
    };

    const client = withBudget(failingClient);
    await assert.rejects(
      () =>
        client.createMessage({
          model: "test",
          maxTokens: 100,
          system: "test",
          messages: [{ role: "user", content: "test" }],
        }),
      { message: "API connection failed" }
    );

    // No usage should have been recorded since the call failed
    assert.equal(getTokensUsedToday(), 0);
  });

  it("tracks usage independently across budget wrappers sharing state", async () => {
    saveState({});
    const clientA = withBudget(mockClient(100, 50));
    const clientB = withBudget(mockClient(200, 100));

    await clientA.createMessage({
      model: "test",
      maxTokens: 10,
      system: "test",
      messages: [{ role: "user", content: "a" }],
    });
    assert.equal(getTokensUsedToday(), 150);

    await clientB.createMessage({
      model: "test",
      maxTokens: 10,
      system: "test",
      messages: [{ role: "user", content: "b" }],
    });
    assert.equal(getTokensUsedToday(), 450); // 150 + 300
  });

  it("getTokensRemaining never goes below zero", () => {
    saveState({
      budget_date: new Date().toISOString().slice(0, 10),
      budget_tokens_used: 5000, // way over limit
    });

    assert.equal(getTokensRemaining(), 0);
  });

  it("getBudgetStatus reflects current usage accurately", async () => {
    saveState({});
    const client = withBudget(mockClient(123, 77));
    await client.createMessage({
      model: "test",
      maxTokens: 10,
      system: "test",
      messages: [{ role: "user", content: "test" }],
    });

    const status = getBudgetStatus();
    assert.equal(status.enabled, true);
    assert.equal(status.limit, 1000);
    assert.equal(status.used, 200);
    assert.equal(status.remaining, 800);
  });
});

after(async () => {
  await closeLogger();
  rmSync(testDir, { recursive: true, force: true });
});
