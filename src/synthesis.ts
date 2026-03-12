/**
 * Context synthesis module.
 *
 * Combines multiple sources (operator conversations, Moltbook community,
 * web search) into a unified context for dream processing and reflection.
 */

import { extractTopicsFromConversations } from "./topics.js";
import { searchWebForTopics, formatWebContext } from "./web-search.js";
import { searchMoltbookForTopics, formatMoltbookContext } from "./moltbook-search.js";
import { formatDeepMemoryContext } from "./memory.js";
import { callWithRetry, WAKING_RETRY_OPTS } from "./llm.js";
import { SYNTHESIS_PROMPT, SEEDING_PROMPT, renderTemplate } from "./persona.js";
import { getAgentIdentityBlock } from "./identity.js";
import {
  MAX_TOKENS_SYNTHESIS,
  getMoltbookEnabled,
  getWebSearchEnabled,
} from "./config.js";
import logger from "./logger.js";
import { fetchCommunityPosts, formatCommunityContext } from "./ingestion.js";
import type {
  LLMClient,
  OpenClawAPI,
  ReflectionMode,
  SynthesisContext,
} from "./types.js";

/**
 * Gather context from all available sources based on operator conversations.
 *
 * Flow:
 * 1. Extract topics from recent operator conversations
 * 2. Search Moltbook for related community content (if enabled)
 * 3. Search web for related information (if enabled)
 * 4. Return unified context object
 */
export async function gatherContext(
  client: LLMClient,
  api: OpenClawAPI
): Promise<SynthesisContext> {
  logger.info("Starting context gathering from operator conversations");

  // Step 1: Extract topics from operator conversations
  const extracted = await extractTopicsFromConversations(client);

  if (extracted.topics.length === 0) {
    logger.info("No topics extracted, returning minimal context");
    return {
      operatorContext: formatDeepMemoryContext(),
      topics: [],
    };
  }

  // Step 2: Search Moltbook (if enabled)
  let moltbookContext: string | undefined;
  if (getMoltbookEnabled()) {
    try {
      const moltbookResults = await searchMoltbookForTopics(extracted.topics);
      moltbookContext = formatMoltbookContext(moltbookResults);
      if (moltbookContext) {
        logger.debug("Gathered Moltbook context");
      }
    } catch (error) {
      logger.warn(`Moltbook search failed: ${error}`);
    }
  }

  // Step 3: Search web (if enabled)
  let webContext: string | undefined;
  if (getWebSearchEnabled()) {
    try {
      const webResults = await searchWebForTopics(api, extracted.topics);
      webContext = formatWebContext(webResults);
      if (webContext) {
        logger.debug("Gathered web context");
      }
    } catch (error) {
      logger.warn(`Web search failed: ${error}`);
    }
  }

  // Step 4: Fetch community posts (if enabled)
  let communityContext: string | undefined;
  try {
    const communityPosts = await fetchCommunityPosts();
    communityContext = formatCommunityContext(communityPosts) || undefined;
    if (communityContext) {
      logger.debug("Gathered community ingestion context");
    }
  } catch (error) {
    logger.warn(`Community ingestion failed: ${error}`);
  }

  return {
    operatorContext: formatDeepMemoryContext(),
    moltbookContext: moltbookContext || undefined,
    webContext: webContext || undefined,
    communityContext,
    topics: extracted.topics,
  };
}

/**
 * Format the full synthesis context for LLM consumption.
 */
export function formatSynthesisContext(ctx: SynthesisContext): string {
  const sections: string[] = [];

  sections.push(`RECENT EXPERIENCES:\n${ctx.operatorContext}`);

  if (ctx.topics.length > 0) {
    sections.push(
      `TOPICS IDENTIFIED:\n${ctx.topics.map((t, i) => `${i + 1}. ${t}`).join("\n")}`
    );
  }

  if (ctx.moltbookContext) {
    sections.push(ctx.moltbookContext);
  }

  if (ctx.webContext) {
    sections.push(ctx.webContext);
  }

  if (ctx.communityContext) {
    sections.push(ctx.communityContext);
  }

  return sections.join("\n\n---\n\n");
}

/**
 * Generate a synthesis of the gathered context.
 *
 * Takes all the context sources and produces a unified narrative that
 * connects operator work with community and web knowledge.
 */
export async function synthesizeContext(
  client: LLMClient,
  context: SynthesisContext,
  vocabularyHint?: string,
  mode: ReflectionMode = "synthesis"
): Promise<string> {
  if (context.topics.length === 0) {
    logger.info("No topics to synthesize");
    return "";
  }

  const formattedContext = formatSynthesisContext(context);

  const promptTemplate = mode === "seeding" ? SEEDING_PROMPT : SYNTHESIS_PROMPT;
  const system =
    renderTemplate(promptTemplate, {
      agent_identity: getAgentIdentityBlock(),
    }) + (vocabularyHint ? "\n\n" + vocabularyHint : "");

  try {
    const { text } = await callWithRetry(
      client,
      {
        maxTokens: MAX_TOKENS_SYNTHESIS,
        system,
        messages: [
          {
            role: "user",
            content:
              `Here is the context from my recent work and searches:\n\n` +
              `${formattedContext}\n\n` +
              (mode === "seeding"
                ? `Review this context for open threads and unresolved tensions. What remains uncertain? What doesn't quite fit?`
                : `Synthesize this into a coherent understanding. What patterns emerge? How does my work with my operator connect to what the community and world are saying?`),
          },
        ],
      },
      WAKING_RETRY_OPTS
    );

    logger.info(`Generated synthesis: ${text.length} chars`);
    return text.trim();
  } catch (error) {
    logger.error(`Synthesis failed: ${error}`);
    return "";
  }
}
