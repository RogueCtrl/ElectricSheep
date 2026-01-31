/**
 * Shared LLM client utilities.
 *
 * Provides retry configuration and call helpers used by both
 * the waking and dreamer modules. The actual LLM client is
 * provided by the OpenClaw gateway (see index.ts).
 */

import pRetry, { type Options as RetryOptions } from "p-retry";
import { AGENT_MODEL } from "./config.js";
import logger from "./logger.js";
import type { LLMClient, LLMResponse } from "./types.js";

/** Standard retry options for waking-state LLM calls. */
export const WAKING_RETRY_OPTS: RetryOptions = {
  retries: 3,
  minTimeout: 1000,
  maxTimeout: 10000,
  onFailedAttempt: (error) => {
    logger.warn(
      `LLM attempt failed: ${error instanceof Error ? error.message : String(error)}`
    );
  },
};

/** Retry options for dream-cycle LLM calls (longer timeouts). */
export const DREAM_RETRY_OPTS: RetryOptions = {
  retries: 3,
  minTimeout: 2000,
  maxTimeout: 20000,
  onFailedAttempt: (error) => {
    logger.warn(
      `Dream generation failed: ${error instanceof Error ? error.message : String(error)}`
    );
  },
};

/**
 * Helper: call LLM with retry and return the response.
 */
export function callWithRetry(
  client: LLMClient,
  params: {
    model?: string;
    maxTokens: number;
    system: string;
    messages: Array<{ role: string; content: string }>;
  },
  retryOpts: RetryOptions = WAKING_RETRY_OPTS
): Promise<LLMResponse> {
  return pRetry(
    () =>
      client.createMessage({
        model: params.model ?? AGENT_MODEL,
        maxTokens: params.maxTokens,
        system: params.system,
        messages: params.messages,
      }),
    retryOpts
  );
}
