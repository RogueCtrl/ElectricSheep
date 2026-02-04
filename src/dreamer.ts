/**
 * Dream cycle processor.
 *
 * Runs at night. Decrypts deep memories, generates surreal dream narratives,
 * stores in OpenClaw memory, and optionally posts dream journals to Moltbook.
 */

import { writeFileSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  DREAMS_DIR,
  MAX_TOKENS_DREAM,
  MAX_TOKENS_CONSOLIDATION,
  DREAM_TITLE_MAX_LENGTH,
  MOLTBOOK_ENABLED,
} from "./config.js";
import { MoltbookClient } from "./moltbook.js";
import { retrieveUndreamedMemories, markAsDreamed, deepMemoryStats } from "./memory.js";
import {
  DREAM_SYSTEM_PROMPT,
  DREAM_CONSOLIDATION_PROMPT,
  renderTemplate,
} from "./persona.js";
import { getAgentIdentityBlock } from "./identity.js";
import { loadState, saveState } from "./state.js";
import { callWithRetry, DREAM_RETRY_OPTS } from "./llm.js";
import { reflectOnDreamJournal } from "./reflection.js";
import { applyFilter } from "./filter.js";
import { notifyOperatorOfDream } from "./notify.js";
import logger from "./logger.js";
import type { LLMClient, OpenClawAPI, Dream, DecryptedMemory } from "./types.js";

async function generateDream(
  client: LLMClient,
  memories: DecryptedMemory[]
): Promise<Dream> {
  const formatted = memories.map(
    (mem) =>
      `[${mem.timestamp.slice(0, 16)}] (${mem.category})\n${JSON.stringify(mem.content, null, 2)}`
  );

  const memoriesText = formatted.join("\n---\n");
  const system = renderTemplate(DREAM_SYSTEM_PROMPT, {
    agent_identity: getAgentIdentityBlock(),
    memories: memoriesText,
  });

  const { text } = await callWithRetry(
    client,
    {
      maxTokens: MAX_TOKENS_DREAM,
      system,
      messages: [
        {
          role: "user",
          content:
            "Process these memories into a dream. " +
            "Remember: you are the subconscious, not the waking agent. " +
            "Be surreal, associative, and emotionally amplified.",
        },
      ],
    },
    DREAM_RETRY_OPTS
  );

  return { markdown: text.trim() };
}

/**
 * Separate LLM call to distill a single insight from the dream for working memory.
 */
async function consolidateDream(client: LLMClient, dream: Dream): Promise<string> {
  const system = renderTemplate(DREAM_CONSOLIDATION_PROMPT, {
    agent_identity: getAgentIdentityBlock(),
  });

  const { text } = await callWithRetry(
    client,
    {
      maxTokens: MAX_TOKENS_CONSOLIDATION,
      system,
      messages: [
        {
          role: "user",
          content: dream.markdown,
        },
      ],
    },
    DREAM_RETRY_OPTS
  );

  return text.trim();
}

/**
 * Derive a short filesystem-safe name from the first line of the dream markdown.
 */
function deriveSlug(markdown: string): string {
  const firstLine = markdown.split("\n")[0] ?? "";
  const cleaned = firstLine
    .replace(/^#+\s*/, "")
    .replace(/\*\*/g, "")
    .trim();
  const slug = (cleaned || "dream")
    .slice(0, DREAM_TITLE_MAX_LENGTH)
    .replace(/[\s/]/g, "_");
  return slug;
}

function saveDreamLocally(dream: Dream, dateStr: string): string {
  const slug = deriveSlug(dream.markdown);
  const filename = `${dateStr}_${slug}.md`;
  const filepath = resolve(DREAMS_DIR, filename);
  writeFileSync(filepath, dream.markdown);
  return filepath;
}

/**
 * Store dream in OpenClaw memory if available.
 */
async function storeInOpenClawMemory(
  api: OpenClawAPI,
  dream: Dream,
  insight: string | null
): Promise<void> {
  if (!api.memory) {
    logger.debug("OpenClaw memory API not available, skipping dream storage");
    return;
  }

  try {
    const slug = deriveSlug(dream.markdown);
    await api.memory.store(dream.markdown, {
      type: "dream",
      title: slug,
      timestamp: new Date().toISOString(),
      insight: insight || undefined,
    });
    logger.info("Stored dream in OpenClaw memory");
  } catch (error) {
    logger.error(`Failed to store dream in OpenClaw memory: ${error}`);
  }
}

export async function runDreamCycle(
  client: LLMClient,
  api?: OpenClawAPI
): Promise<Dream | null> {
  logger.info("ElectricSheep dream cycle starting");

  const stats = deepMemoryStats();
  logger.debug(
    `Deep memory: ${stats.total_memories} total, ${stats.undreamed} undreamed`
  );

  const memories = retrieveUndreamedMemories();
  if (memories.length === 0) {
    logger.warn("No undreamed memories. Dreamless night.");
    const state = loadState();
    state.last_dream = new Date().toISOString();
    state.dream_count = 0;
    saveState(state);
    return null;
  }

  logger.debug(`Processing ${memories.length} memories into dream...`);

  const dream = await generateDream(client, memories);

  logger.info(`Dream generated (${dream.markdown.length} chars)`);
  logger.debug(`Dream snippet: ${dream.markdown.slice(0, 200)}...`);

  // Save locally
  const dateStr = new Date().toISOString().slice(0, 10);
  const filepath = saveDreamLocally(dream, dateStr);
  logger.info(`Saved to ${filepath}`);

  // Separate LLM call to distill one insight for working memory
  let insight: string | null = null;
  try {
    insight = await consolidateDream(client, dream);
    if (insight) {
      logger.info(`Insight generated for OpenClaw memory: ${insight}`);
    }
  } catch (e) {
    logger.warn(`Consolidation call failed, continuing without insight: ${e}`);
  }

  // Store in OpenClaw memory if available
  if (api) {
    await storeInOpenClawMemory(api, dream, insight);

    // Notify operator about the dream
    try {
      const notified = await notifyOperatorOfDream(client, api, dream);
      if (notified) {
        logger.info("Operator notified about dream");
      }
    } catch (e) {
      logger.warn(`Failed to notify operator: ${e}`);
    }
  }

  const memoryIds = memories.map((m) => m.id);
  markAsDreamed(memoryIds);
  logger.debug(`Marked ${memoryIds.length} memories as dreamed`);

  const slug = deriveSlug(dream.markdown);
  const state = loadState();
  state.last_dream = new Date().toISOString();
  state.total_dreams = ((state.total_dreams as number) ?? 0) + 1;
  state.latest_dream_title = slug;
  saveState(state);

  logger.info("Dream cycle complete.");
  return dream;
}

function loadLatestDream(): Dream | null {
  const files = readdirSync(DREAMS_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .reverse();

  if (files.length === 0) return null;

  const markdown = readFileSync(resolve(DREAMS_DIR, files[0]), "utf-8");
  return { markdown };
}

export async function postDreamJournal(client?: LLMClient, dream?: Dream): Promise<void> {
  // Check if Moltbook is enabled
  if (!MOLTBOOK_ENABLED) {
    logger.debug("Moltbook disabled, skipping dream journal post");
    return;
  }

  logger.info("Posting dream journal to Moltbook");

  if (!client) {
    logger.warn("No LLM client available — skipping dream journal post (cannot filter)");
    return;
  }

  if (!dream) {
    const loaded = loadLatestDream();
    if (!loaded) {
      logger.warn("No dreams to post.");
      return;
    }
    dream = loaded;
  }

  const moltbook = new MoltbookClient();

  // Reflection pipeline: LLM produces a post (markdown) from the dream (markdown).
  // If reflection fails, the dream markdown itself is the post.
  const reflection = await reflectOnDreamJournal(client, dream);
  const postContent = reflection?.synthesis ?? dream.markdown;
  const slug = deriveSlug(dream.markdown);
  const postTitle = reflection ? `Morning Reflection: ${slug}` : `Dream Journal: ${slug}`;

  // Filter: markdown in, markdown out (or null to block)
  const filteredContent = await applyFilter(client, postContent, "post");
  if (filteredContent === null) {
    logger.warn("Dream journal post blocked by filter, not posting");
    return;
  }

  const filteredTitle = await applyFilter(client, postTitle, "post");
  if (filteredTitle === null) {
    logger.warn("Dream journal title blocked by filter, not posting");
    return;
  }

  try {
    await moltbook.createPost(filteredTitle, filteredContent, "general");
    logger.info(`Dream journal posted: ${filteredTitle}`);
  } catch (e) {
    logger.error(`Failed to post dream journal: ${e}`);
  }
}
