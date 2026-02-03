/**
 * Topic extraction from operator conversations.
 *
 * Analyzes recent working memory entries (particularly agent_conversation
 * category) to extract key themes and topics that can be used for
 * contextual web and Moltbook searches.
 */

import { getWorkingMemory } from "./memory.js";
import { callWithRetry, WAKING_RETRY_OPTS } from "./llm.js";
import { TOPIC_EXTRACTION_PROMPT, renderTemplate } from "./persona.js";
import { getAgentIdentityBlock } from "./identity.js";
import { MAX_TOKENS_TOPIC_EXTRACTION, MAX_TOPICS_PER_CYCLE } from "./config.js";
import logger from "./logger.js";
import type { LLMClient, WorkingMemoryEntry, ExtractedTopics } from "./types.js";

/**
 * Get recent operator conversation memories.
 *
 * Filters working memory for entries that represent interactions with
 * the human operator (agent_conversation category from agent_end hook).
 */
export function getRecentConversations(limit: number = 10): WorkingMemoryEntry[] {
  const all = getWorkingMemory();

  // Filter for operator conversations (from agent_end hook)
  const conversations = all.filter(
    (m) => m.category === "interaction" || m.category === "agent_conversation"
  );

  // Return most recent
  return conversations.slice(-limit);
}

/**
 * Format conversation memories into a string for LLM analysis.
 */
function formatConversationsForExtraction(memories: WorkingMemoryEntry[]): string {
  if (memories.length === 0) {
    return "No recent conversations found.";
  }

  return memories
    .map((m) => {
      const time = m.timestamp.slice(0, 16).replace("T", " ");
      return `[${time}] ${m.summary}`;
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
  memories?: WorkingMemoryEntry[]
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

/**
 * Format extracted topics into a readable context string.
 */
export function formatTopicsContext(extracted: ExtractedTopics): string {
  if (extracted.topics.length === 0) {
    return "No topics identified from recent conversations.";
  }

  const topicList = extracted.topics.map((t, i) => `${i + 1}. ${t}`).join("\n");

  return `TOPICS FROM OPERATOR CONVERSATIONS:\n\n${topicList}`;
}
