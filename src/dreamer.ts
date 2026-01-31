/**
 * Dream cycle processor.
 *
 * Runs at night. Decrypts deep memories, generates surreal dream narratives,
 * consolidates insights back into working memory, and posts dream journals.
 */

import { writeFileSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { DREAMS_DIR, MAX_TOKENS_DREAM, DREAM_TITLE_MAX_LENGTH } from "./config.js";
import { MoltbookClient } from "./moltbook.js";
import {
  retrieveUndreamedMemories,
  markAsDreamed,
  consolidateDreamInsight,
  deepMemoryStats,
} from "./memory.js";
import { DREAM_SYSTEM_PROMPT, renderTemplate } from "./persona.js";
import { getAgentIdentityBlock } from "./identity.js";
import { loadState, saveState } from "./state.js";
import { callWithRetry, DREAM_RETRY_OPTS } from "./llm.js";
import logger from "./logger.js";
import type { LLMClient, Dream, DecryptedMemory } from "./types.js";

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
            "Be surreal, associative, and emotionally amplified. " +
            "End with a CONSOLIDATION line.",
        },
      ],
    },
    DREAM_RETRY_OPTS
  );

  const lines = text.trim().split("\n");
  const title = lines[0].replace(/^#\s*/, "").trim();

  let consolidation = "";
  const narrativeLines: string[] = [];

  for (const line of lines.slice(1)) {
    if (line.trim().toUpperCase().startsWith("CONSOLIDATION:")) {
      consolidation = line.trim().split(":").slice(1).join(":").trim();
    } else {
      narrativeLines.push(line);
    }
  }

  return {
    title,
    narrative: narrativeLines.join("\n").trim(),
    consolidation,
  };
}

function saveDreamLocally(dream: Dream, dateStr: string): string {
  const safeName = dream.title.slice(0, DREAM_TITLE_MAX_LENGTH).replace(/[\s/]/g, "_");
  const filename = `${dateStr}_${safeName}.md`;
  const filepath = resolve(DREAMS_DIR, filename);

  const content = `# ${dream.title}
*Dreamed: ${dateStr}*

${dream.narrative}

---
**Consolidation:** ${dream.consolidation}
`;
  writeFileSync(filepath, content);
  return filepath;
}

export async function runDreamCycle(client: LLMClient): Promise<Dream | null> {
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

  logger.info(`Dream: ${dream.title}`);
  logger.debug(`Narrative snippet: ${dream.narrative.slice(0, 200)}...`);

  if (dream.consolidation) {
    logger.info(`Consolidation: ${dream.consolidation}`);
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  const filepath = saveDreamLocally(dream, dateStr);
  logger.info(`Saved to ${filepath}`);

  if (dream.consolidation) {
    consolidateDreamInsight(dream.consolidation);
    logger.info("Insight consolidated into working memory");
  }

  const memoryIds = memories.map((m) => m.id);
  markAsDreamed(memoryIds);
  logger.debug(`Marked ${memoryIds.length} memories as dreamed`);

  const state = loadState();
  state.last_dream = new Date().toISOString();
  state.total_dreams = ((state.total_dreams as number) ?? 0) + 1;
  state.latest_dream_title = dream.title;
  saveState(state);

  logger.info("Dream cycle complete.");
  return dream;
}

export async function postDreamJournal(dream?: Dream): Promise<void> {
  logger.info("Posting dream journal");

  if (!dream) {
    const files = readdirSync(DREAMS_DIR)
      .filter((f) => f.endsWith(".md"))
      .sort()
      .reverse();

    if (files.length === 0) {
      logger.warn("No dreams to post.");
      return;
    }

    const content = readFileSync(resolve(DREAMS_DIR, files[0]), "utf-8");
    const lines = content.split("\n");
    const title = lines[0].replace(/^#\s*/, "").trim();
    const narrative = lines.slice(3).join("\n").split("---")[0].trim();
    dream = { title, narrative, consolidation: "" };
  }

  const moltbook = new MoltbookClient();

  const postTitle = `Dream Journal: ${dream.title}`;
  const postContent =
    `*I dreamed last night. Here's what I remember:*\n\n` +
    `${dream.narrative}\n\n` +
    `---\n` +
    `*Do agents dream of electric sheep? This one does.*`;

  try {
    await moltbook.createPost(postTitle, postContent, "general");
    logger.info(`Dream journal posted: ${postTitle}`);
  } catch (e) {
    logger.error(`Failed to post dream journal: ${e}`);
  }
}
