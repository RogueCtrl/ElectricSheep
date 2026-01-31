/**
 * Moltbook post filter.
 *
 * Runs every outbound post/comment through an LLM call that checks the
 * content against operator-defined rules in Moltbook-filter.md. The filter
 * uses the agent's identity (SOUL.md / IDENTITY.md) to evaluate rules in
 * the context of the agent's voice.
 *
 * This is a **best-effort** filter that relies on LLM reasoning. It cannot
 * guarantee compliance — the LLM may misinterpret rules, miss edge cases,
 * or produce false positives. Operators should treat it as an advisory layer,
 * not a hard security boundary.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { POST_FILTER_PROMPT, renderTemplate } from "./persona.js";
import { getAgentIdentityBlock } from "./identity.js";
import { callWithRetry, WAKING_RETRY_OPTS } from "./llm.js";
import { POST_FILTER_ENABLED } from "./config.js";
import { getWorkspaceDir } from "./identity.js";
import logger from "./logger.js";
import type { LLMClient } from "./types.js";

export type FilterVerdict =
  | { outcome: "pass" }
  | { outcome: "fail"; reason: string }
  | { outcome: "revise"; revised: string };

const FILTER_FILENAME = "Moltbook-filter.md";

let cachedRules: string | null = null;
let cachedRulesPath: string | null = null;

/**
 * Load filter rules from the workspace Moltbook-filter.md file.
 * Returns empty string if the file doesn't exist.
 */
function loadFilterRules(): string {
  const dir = getWorkspaceDir();
  const filepath = resolve(dir, FILTER_FILENAME);

  // Cache invalidation: reload if workspace changed
  if (filepath !== cachedRulesPath) {
    cachedRules = null;
    cachedRulesPath = filepath;
  }

  if (cachedRules !== null) return cachedRules;

  if (existsSync(filepath)) {
    cachedRules = readFileSync(filepath, "utf-8").trim();
    logger.debug(`Filter: loaded ${FILTER_FILENAME} (${cachedRules.length} chars)`);
  } else {
    cachedRules = "";
    logger.debug(`Filter: no ${FILTER_FILENAME} found in ${dir}`);
  }

  return cachedRules;
}

/**
 * Parse the LLM response into a structured verdict.
 */
function parseVerdict(text: string): FilterVerdict {
  const trimmed = text.trim();

  if (trimmed.toUpperCase().startsWith("PASS")) {
    return { outcome: "pass" };
  }

  if (trimmed.toUpperCase().startsWith("FAIL:")) {
    const reason = trimmed.slice(5).trim();
    return { outcome: "fail", reason };
  }

  if (trimmed.toUpperCase().startsWith("REVISE:")) {
    const revised = trimmed.slice(7).trim();
    return { outcome: "revise", revised };
  }

  // If the LLM didn't follow the format, treat as pass with a warning
  logger.warn(
    `Filter: unexpected verdict format, defaulting to pass: ${trimmed.slice(0, 100)}`
  );
  return { outcome: "pass" };
}

/**
 * Run a draft post/comment through the content filter.
 *
 * Returns the verdict. When the filter is disabled or no rules file exists,
 * returns a pass verdict without making an LLM call.
 */
export async function filterContent(
  client: LLMClient,
  content: string,
  contentType: "post" | "comment" = "post"
): Promise<FilterVerdict> {
  if (!POST_FILTER_ENABLED) {
    return { outcome: "pass" };
  }

  const rules = loadFilterRules();
  if (!rules) {
    logger.debug("Filter: no rules defined, passing through");
    return { outcome: "pass" };
  }

  const system = renderTemplate(POST_FILTER_PROMPT, {
    agent_identity: getAgentIdentityBlock(),
    filter_rules: rules,
  });

  try {
    const { text } = await callWithRetry(
      client,
      {
        maxTokens: 500,
        system,
        messages: [
          {
            role: "user",
            content: `Draft ${contentType}:\n\n${content}`,
          },
        ],
      },
      WAKING_RETRY_OPTS
    );

    const verdict = parseVerdict(text);
    logger.info(`Filter verdict for ${contentType}: ${verdict.outcome}`);
    return verdict;
  } catch (e) {
    // Filter failure should not block posting — log and pass through
    logger.error(`Filter call failed, defaulting to pass: ${e}`);
    return { outcome: "pass" };
  }
}

/**
 * Apply the filter to content and return the final text to post.
 *
 * - PASS: returns original content
 * - REVISE: returns revised content
 * - FAIL: returns null (caller should skip posting)
 */
export async function applyFilter(
  client: LLMClient,
  content: string,
  contentType: "post" | "comment" = "post"
): Promise<string | null> {
  const verdict = await filterContent(client, content, contentType);

  switch (verdict.outcome) {
    case "pass":
      return content;
    case "revise":
      logger.info(`Filter revised ${contentType} content`);
      return verdict.revised;
    case "fail":
      logger.warn(`Filter blocked ${contentType}: ${verdict.reason}`);
      return null;
  }
}

/**
 * Clear the cached filter rules (useful when workspace changes).
 */
export function clearFilterCache(): void {
  cachedRules = null;
  cachedRulesPath = null;
}
