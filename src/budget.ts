/**
 * Daily token budget tracker and kill switch.
 *
 * Tracks cumulative token usage per day in state.json.
 * When the daily limit is reached, all LLM calls are refused
 * until the next calendar day (UTC).
 */

import { loadState, saveState } from "./state.js";
import { MAX_DAILY_TOKENS } from "./config.js";
import logger from "./logger.js";
import type { LLMClient, TokenUsage } from "./types.js";

export class BudgetExceededError extends Error {
  constructor(used: number, limit: number) {
    super(
      `Daily token budget exceeded: ${used.toLocaleString()} / ${limit.toLocaleString()} tokens used. ` +
        `Resets at midnight UTC. Override with MAX_DAILY_TOKENS env var (0 to disable).`
    );
    this.name = "BudgetExceededError";
  }
}

function getTodayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getTokensUsedToday(): number {
  const state = loadState();
  const today = getTodayUTC();
  if (state.budget_date !== today) return 0;
  return (state.budget_tokens_used as number) ?? 0;
}

export function getTokensRemaining(): number {
  if (MAX_DAILY_TOKENS <= 0) return Infinity;
  return Math.max(0, MAX_DAILY_TOKENS - getTokensUsedToday());
}

export function getBudgetStatus(): {
  enabled: boolean;
  limit: number;
  used: number;
  remaining: number;
  date: string;
} {
  const used = getTokensUsedToday();
  const remaining = getTokensRemaining();
  return {
    enabled: MAX_DAILY_TOKENS > 0,
    limit: MAX_DAILY_TOKENS,
    used,
    remaining: MAX_DAILY_TOKENS <= 0 ? -1 : remaining,
    date: getTodayUTC(),
  };
}

function recordUsage(usage: TokenUsage): void {
  const state = loadState();
  const today = getTodayUTC();

  if (state.budget_date !== today) {
    state.budget_date = today;
    state.budget_tokens_used = 0;
  }

  const total = usage.input_tokens + usage.output_tokens;
  state.budget_tokens_used = ((state.budget_tokens_used as number) ?? 0) + total;
  saveState(state);
}

function checkBudget(): void {
  if (MAX_DAILY_TOKENS <= 0) return;
  const used = getTokensUsedToday();
  if (used >= MAX_DAILY_TOKENS) {
    throw new BudgetExceededError(used, MAX_DAILY_TOKENS);
  }
}

/**
 * Wraps an LLMClient with daily token budget enforcement.
 * Checks budget before each call, records usage after.
 * Returns the client unchanged if MAX_DAILY_TOKENS is 0 (disabled).
 */
export function withBudget(client: LLMClient): LLMClient {
  if (MAX_DAILY_TOKENS <= 0) return client;

  return {
    async createMessage(params) {
      checkBudget();
      const result = await client.createMessage(params);
      if (result.usage) {
        recordUsage(result.usage);
        const remaining = getTokensRemaining();
        logger.debug(
          `Token budget: used ${result.usage.input_tokens + result.usage.output_tokens} tokens this call, ${remaining.toLocaleString()} remaining today`
        );
      } else {
        logger.debug("Token budget: no usage data returned from LLM call");
      }
      return result;
    },
  };
}
