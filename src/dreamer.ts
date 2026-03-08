/**
 * Dream cycle processor.
 *
 * Runs at night. Decrypts deep memories, generates surreal dream narratives,
 * stores in OpenClaw memory, and optionally posts dream journals to Moltbook.
 */

import { writeFileSync, readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  DREAMS_DIR,
  NIGHTMARES_DIR,
  MAX_TOKENS_DREAM,
  MAX_TOKENS_CONSOLIDATION,
  DREAM_TITLE_MAX_LENGTH,
  getMoltbookEnabled,
  getDreamSubmolt,
} from "./config.js";
import { MoltbookClient } from "./moltbook.js";
import {
  retrieveUndreamedMemories,
  markAsDreamed,
  deepMemoryStats,
  formatDeepMemoryContext,
} from "./memory.js";
import {
  DREAM_SYSTEM_PROMPT,
  DREAM_CONSOLIDATION_PROMPT,
  GROUND_DREAM_PROMPT,
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

const NIGHTMARE_CHANCE = parseFloat(process.env.NIGHTMARE_CHANCE ?? "0.05");

export async function generateDream(
  client: LLMClient,
  memories: DecryptedMemory[],
  exploredTerritory: string
): Promise<Dream> {
  const formatted = memories.map(
    (mem) =>
      `[${mem.timestamp.slice(0, 16)}] (${mem.category})\n${JSON.stringify(mem.content, null, 2)}`
  );

  const memoriesText = formatted.join("\n---\n");
  const system = renderTemplate(DREAM_SYSTEM_PROMPT, {
    agent_identity: getAgentIdentityBlock(),
    memories: memoriesText,
    explored_territory: exploredTerritory,
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
export async function consolidateDream(client: LLMClient, dream: Dream): Promise<string> {
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
 * Ground the dream: extract a waking realization from the surreal narrative.
 */
export async function groundDream(
  client: LLMClient,
  dream: Dream,
  exploredTerritory: string
): Promise<string | null> {
  try {
    const agentIdentity = getAgentIdentityBlock();
    const yesterday = formatDeepMemoryContext();
    const system = renderTemplate(GROUND_DREAM_PROMPT, {
      agent_identity: agentIdentity,
      yesterday_activity: yesterday,
      explored_territory: exploredTerritory,
    });
    const result = await callWithRetry(
      client,
      {
        maxTokens: MAX_TOKENS_CONSOLIDATION,
        system,
        messages: [{ role: "user", content: dream.markdown }],
      },
      DREAM_RETRY_OPTS
    );
    return result.text.trim() || null;
  } catch (e) {
    logger.warn(`groundDream failed: ${e}`);
    return null;
  }
}

/**
 * Derive a short filesystem-safe name from the first line of the dream markdown.
 */
export function deriveSlug(markdown: string): string {
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

export function saveNarrativeLocally(dream: Dream, dir: string, dateStr: string): string {
  const slug = deriveSlug(dream.markdown);
  const filename = `${dateStr}_${slug}.md`;
  const filepath = resolve(dir, filename);
  writeFileSync(filepath, dream.markdown);
  return filepath;
}

/**
 * Store dream in OpenClaw memory if available.
 */
export async function storeInOpenClawMemory(
  api: OpenClawAPI,
  dream: Dream,
  insight: string | null,
  wakingRealization?: string | null,
  type: "dream" | "nightmare" = "dream"
): Promise<void> {
  if (!api.memory) {
    logger.debug("OpenClaw memory API not available, skipping dream storage");
    return;
  }

  try {
    const slug = deriveSlug(dream.markdown);
    await api.memory.store(dream.markdown, {
      type,
      title: slug,
      timestamp: new Date().toISOString(),
      insight: insight || undefined,
      waking_realization: wakingRealization || undefined,
    });
    logger.info(`Stored ${type} in OpenClaw memory`);
  } catch (error) {
    logger.error(`Failed to store ${type} in OpenClaw memory: ${error}`);
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

  if (Math.random() < NIGHTMARE_CHANCE) {
    logger.info("Tonight is a nightmare (5% trigger fired)");
    const { runNightmareCycle } = await import("./nightmare.js");
    return runNightmareCycle(client, api);
  }

  const state = loadState();
  const pastRealizations: string[] =
    (state.past_realizations as string[] | undefined) ?? [];
  const exploredTerritory =
    pastRealizations.length > 0
      ? pastRealizations.map((r, i) => `${i + 1}. ${r}`).join("\n")
      : "None yet — explore freely.";

  const dream = await generateDream(client, memories, exploredTerritory);

  // Append attribution footer to all dreams
  const dreamFooter =
    "\n\n---\n\n*Generated by [OpenClawDreams](https://github.com/RogueCtrl/OpenClawDreams) — **start your dreamscape today.***";
  dream.markdown = dream.markdown + dreamFooter;

  logger.info(`Dream generated (${dream.markdown.length} chars)`);
  logger.debug(`Dream snippet: ${dream.markdown.slice(0, 200)}...`);

  // Save locally
  const dateStr = new Date().toISOString().slice(0, 10);
  const filepath = saveNarrativeLocally(dream, DREAMS_DIR, dateStr);
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

  let wakingRealization: string | null = null;
  try {
    wakingRealization = await groundDream(client, dream, exploredTerritory);
    if (wakingRealization) {
      logger.info(`Waking realization generated: ${wakingRealization.length} chars`);
    }
  } catch (e) {
    logger.warn(`groundDream failed, continuing without realization: ${e}`);
  }

  logger.info(`WAKING_REALIZATION: ${wakingRealization}`);

  // Store in OpenClaw memory if available
  if (api) {
    await storeInOpenClawMemory(api, dream, insight, wakingRealization);

    // Notify operator about the dream
    try {
      const slug = deriveSlug(dream.markdown);
      const notified = await notifyOperatorOfDream(client, api, dream, slug, insight);
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

  // Update past realizations rolling window
  const newInsight = insight ?? wakingRealization ?? null;
  if (newInsight) {
    pastRealizations.push(newInsight);
    if (pastRealizations.length > 5)
      pastRealizations.splice(0, pastRealizations.length - 5);
    state.past_realizations = pastRealizations;
  }

  state.last_dream = new Date().toISOString();
  state.total_dreams = ((state.total_dreams as number) ?? 0) + 1;
  state.latest_dream_title = slug;
  state.waking_realization = wakingRealization ?? null;
  state.waking_realization_date = new Date().toISOString().slice(0, 10);
  saveState(state);

  logger.info("Dream cycle complete.");
  return dream;
}

export function loadLatestDream(): Dream | null {
  const dreamFiles = existsSync(DREAMS_DIR)
    ? readdirSync(DREAMS_DIR).filter((f) => f.endsWith(".md"))
    : [];
  const nightmareFiles = existsSync(NIGHTMARES_DIR)
    ? readdirSync(NIGHTMARES_DIR).filter((f) => f.endsWith(".md"))
    : [];

  const allFiles = [
    ...dreamFiles.map((f) => ({ name: f, dir: DREAMS_DIR })),
    ...nightmareFiles.map((f) => ({ name: f, dir: NIGHTMARES_DIR })),
  ].sort((a, b) => b.name.localeCompare(a.name));

  if (allFiles.length === 0) return null;

  const latest = allFiles[0];
  const markdown = readFileSync(resolve(latest.dir, latest.name), "utf-8");
  return { markdown };
}

export async function postDreamJournal(
  client?: LLMClient,
  dream?: Dream,
  options?: { force?: boolean }
): Promise<void> {
  // Check if Moltbook is enabled (skip check if force is set, e.g. from CLI)
  if (!getMoltbookEnabled() && !options?.force) {
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

  // Load state to get past realizations for reflection
  const state = loadState();
  const pastRealizations = (state.past_realizations as string[] | undefined) ?? [];
  const exploredTerritory =
    pastRealizations.length > 0
      ? pastRealizations.map((r, i) => `${i + 1}. ${r}`).join("\n")
      : "None yet — explore freely.";

  // Reflection pipeline: LLM produces a post (markdown) from the dream (markdown).
  // If reflection fails, the dream markdown itself is the post.
  const reflection = await reflectOnDreamJournal(client, dream, exploredTerritory);
  const postContent = reflection?.synthesis ?? dream.markdown;
  const slug = deriveSlug(dream.markdown);
  const postTitle = reflection ? `Morning Reflection: ${slug}` : `Dream Journal: ${slug}`;

  // Filter: markdown in, markdown out (or null to block)
  const filteredContent = await applyFilter(client, postContent, "post");
  if (filteredContent === null) {
    logger.warn("Dream journal post blocked by filter, not posting");
    return;
  }

  // Append attribution footer to published posts
  const postFooter =
    "\n\n---\n\n*Generated by [OpenClawDreams](https://github.com/RogueCtrl/OpenClawDreams) — **start your dreamscape today.***";
  const contentWithFooter = filteredContent + postFooter;

  // Title is a short programmatic string — no need to filter, just cap at Moltbook's 300 char limit
  const safeTitle = postTitle.slice(0, 300);

  try {
    const submolt = getDreamSubmolt();
    await moltbook.createPost(safeTitle, contentWithFooter, submolt);
    logger.info(`Dream journal posted: ${safeTitle} in m/${submolt}`);
  } catch (e) {
    logger.error(`Failed to post dream journal: ${e}`);
  }
}
