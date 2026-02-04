/**
 * Topic extraction from operator conversations.
 *
 * Analyzes recent deep memory entries (interaction category) to extract
 * key themes and topics that can be used for contextual web and Moltbook searches.
 */

import { getRecentDeepMemories } from "./memory.js";
import { callWithRetry, WAKING_RETRY_OPTS } from "./llm.js";
import { TOPIC_EXTRACTION_PROMPT, renderTemplate } from "./persona.js";
import { getAgentIdentityBlock } from "./identity.js";
import { MAX_TOKENS_TOPIC_EXTRACTION, MAX_TOPICS_PER_CYCLE } from "./config.js";
import logger from "./logger.js";
import type { LLMClient, DecryptedMemory, ExtractedTopics } from "./types.js";

/**
 * Get recent operator conversation memories from deep memory.
 */
export function getRecentConversations(limit: number = 10): DecryptedMemory[] {
  return getRecentDeepMemories({
    limit,
    categories: ["interaction"],
  });
}

/**
 * Format conversation memories into a string for LLM analysis.
 */
function formatConversationsForExtraction(memories: DecryptedMemory[]): string {
  if (memories.length === 0) {
    return "No recent conversations found.";
  }

  return memories
    .map((m) => {
      const time = m.timestamp.slice(0, 16).replace("T", " ");
      const summary =
        typeof m.content.summary === "string"
          ? m.content.summary
          : JSON.stringify(m.content).slice(0, 200);
      return `[${time}] ${summary}`;
    })
    .join("\n\n");
}

/**
 * Extract topics from recent operator conversations using LLM.
 *
 * Analyzes conversation summaries to identify key themes, subjects,
 * and topics that the agent and operator discussed or worked on.
 */
export async function extractTopicsFromConversations(
  client: LLMClient,
  memories?: DecryptedMemory[]
): Promise<ExtractedTopics> {
  const sourceMemories = memories ?? getRecentConversations();

  if (sourceMemories.length === 0) {
    logger.info("No recent conversations to extract topics from");
    return { topics: [], sourceMemories: [] };
  }

  const conversationContext = formatConversationsForExtraction(sourceMemories);

  const system = renderTemplate(TOPIC_EXTRACTION_PROMPT, {
    agent_identity: getAgentIdentityBlock(),
    conversations: conversationContext,
  });

  try {
    const { text } = await callWithRetry(
      client,
      {
        maxTokens: MAX_TOKENS_TOPIC_EXTRACTION,
        system,
        messages: [
          {
            role: "user",
            content:
              "Extract the key topics from my recent conversations with my operator. " +
              "What subjects, themes, or areas did we work on or discuss?",
          },
        ],
      },
      WAKING_RETRY_OPTS
    );

    // Parse topics (one per line, strip formatting)
    const topics = text
      .trim()
      .split("\n")
      .map((line) => line.replace(/^[\s\-*•>\d.)+]+/, "").trim())
      .filter((line) => line.length > 0)
      .slice(0, MAX_TOPICS_PER_CYCLE);

    logger.info(`Extracted ${topics.length} topics: ${topics.join("; ")}`);

    return { topics, sourceMemories };
  } catch (error) {
    logger.error(`Topic extraction failed: ${error}`);
    return { topics: [], sourceMemories };
  }
}
