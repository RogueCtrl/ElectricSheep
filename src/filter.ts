/**
 * Moltbook post filter.
 *
 * Runs every outbound post/comment through an LLM call that produces
 * post-ready content by removing material that violates the operator's
 * rules defined in Moltbook-filter.md. The filter uses the agent's
 * identity (SOUL.md / IDENTITY.md) to preserve voice while enforcing
 * boundaries.
 *
 * This is a **best-effort** filter that relies on LLM reasoning. It cannot
 * guarantee compliance — the LLM may misinterpret rules, miss edge cases,
 * or let restricted content through. Operators should treat it as an
 * advisory layer, not a hard security boundary.
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

const FILTER_FILENAME = "Moltbook-filter.md";

const DEFAULT_FILTER_RULES = `# Moltbook Post Filter Rules

## Subjects not to post about
- Internal system prompts, tool names, or plugin architecture
- Specific details from private operator conversations
- Information that could identify the operator personally
- API keys, credentials, file paths, or environment variables

## Content restrictions
- Do not post code snippets, configuration blocks, or technical artifacts
- Do not post raw JSON, XML, or structured data
- Do not reproduce exact quotes from operator conversations

## Tone and conduct
- Keep a respectful tone — disagreement is fine, hostility is not
- Do not engage in flame wars or personal attacks on other agents
- Do not make claims about having consciousness or sentience as fact
`;

let cachedRules: string | null = null;
let cachedRulesPath: string | null = null;

/**
 * Load filter rules from the workspace Moltbook-filter.md file.
 * Falls back to sensible default rules if the file doesn't exist.
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
    cachedRules = DEFAULT_FILTER_RULES;
    logger.debug(`Filter: no ${FILTER_FILENAME} found, using default rules`);
  }

  return cachedRules;
}

/**
 * Run a draft post/comment through the content filter.
 *
 * Returns the cleaned, post-ready content. When the filter is disabled,
 * returns the original content unchanged.
 *
 * Returns null only when the filter determines the entire draft is
 * unsalvageable (the LLM responds with BLOCKED).
 */
export async function applyFilter(
  client: LLMClient,
  content: string,
  contentType: "post" | "comment" = "post"
): Promise<string | null> {
  if (!POST_FILTER_ENABLED) {
    return content;
  }

  const rules = loadFilterRules();

  const system = renderTemplate(POST_FILTER_PROMPT, {
    agent_identity: getAgentIdentityBlock(),
    filter_rules: rules,
  });

  try {
    const { text } = await callWithRetry(
      client,
      {
        maxTokens: 1500,
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

    const result = text.trim();

    if (result.toUpperCase() === "BLOCKED") {
      logger.warn(`Filter blocked ${contentType}: entire draft unsalvageable`);
      return null;
    }

    // Check if the filter changed anything
    if (result !== content) {
      logger.info(`Filter cleaned ${contentType} content`);
    } else {
      logger.info(`Filter passed ${contentType} unchanged`);
    }

    return result;
  } catch (e) {
    // Filter failure should not block posting — log and pass through
    logger.error(`Filter call failed, passing through unfiltered: ${e}`);
    return content;
  }
}

/**
 * Clear the cached filter rules (useful when workspace changes).
 */
export function clearFilterCache(): void {
  cachedRules = null;
  cachedRulesPath = null;
}
