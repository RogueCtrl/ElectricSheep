/**
 * Dream cycle processor.
 *
 * Runs at night. Decrypts deep memories, generates surreal dream narratives,
 * stores in OpenClaw memory, and optionally posts dream journals to Moltbook.
 */

import {
  writeFileSync,
  readFileSync,
  readdirSync,
  existsSync,
  unlinkSync,
} from "node:fs";
import { resolve, basename } from "node:path";
import {
  getDreamsDir,
  getNightmaresDir,
  MAX_TOKENS_DREAM,
  MAX_TOKENS_CONSOLIDATION,
  DREAM_TITLE_MAX_LENGTH,
  getMoltbookEnabled,
  getDreamSubmolt,
  getEntropyOverlapThreshold,
} from "./config.js";
import { extractConcepts, computeOverlap, getOverlappingConcepts } from "./entropy.js";
import { MoltbookClient } from "./moltbook.js";
import { getSteeringDirective } from "./meta-loop.js";
import {
  retrieveUndreamedMemories,
  markAsDreamed,
  deepMemoryStats,
  formatDeepMemoryContext,
  registerDream,
  incrementRememberCount,
  selectDreamToRemember,
  storeDeepMemory,
  getDeepMemoryById,
  insertDreamLineage,
  findThematicKin,
} from "./memory.js";
import { ensureBackfilled } from "./backfill.js";
import {
  DREAM_SYSTEM_PROMPT,
  NIGHTMARE_SYSTEM_PROMPT,
  DREAM_CONSOLIDATION_PROMPT,
  GROUND_DREAM_PROMPT,
  META_DREAM_PROMPT,
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
const REMEMBRANCE_CHANCE = parseFloat(process.env.REMEMBRANCE_CHANCE ?? "0.01");

// ─── Dream Remembrance ───────────────────────────────────────────────────────

/**
 * Prune dream files, keeping only the most recent one.
 * SQLite records are KEPT — they outlive the files, enabling future
 * remembrance by title even when file is gone.
 */
export function pruneOldDreams(dir: string, currentFile: string): void {
  if (!existsSync(dir)) return;
  const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
  for (const file of files) {
    if (file !== currentFile) {
      try {
        unlinkSync(resolve(dir, file));
        logger.info(`Pruned old dream file: ${file}`);
      } catch (e) {
        logger.warn(`Failed to prune dream ${file}: ${e}`);
      }
    }
  }
}

export async function generateDream(
  client: LLMClient,
  memories: DecryptedMemory[],
  exploredTerritory: string,
  isNightmare: boolean = false,
  hardConstraint?: string
): Promise<Dream> {
  const formatted = memories.map(
    (mem) =>
      `[${mem.timestamp.slice(0, 16)}] (${mem.category})\n${JSON.stringify(mem.content, null, 2)}`
  );

  const memoriesText = formatted.join("\n---\n");
  const prompt = isNightmare ? NIGHTMARE_SYSTEM_PROMPT : DREAM_SYSTEM_PROMPT;
  const system =
    renderTemplate(prompt, {
      agent_identity: getAgentIdentityBlock(),
      memories: memoriesText,
      explored_territory: exploredTerritory,
    }) + getSteeringDirective();

  const baseUserPrompt = isNightmare
    ? "Process these memories into a nightmare. Be fractured and wrong."
    : "Process these memories into a dream. Be surreal, associative, and emotionally amplified.";

  const { text } = await callWithRetry(
    client,
    {
      maxTokens: MAX_TOKENS_DREAM,
      system,
      messages: [
        {
          role: "user",
          content: hardConstraint
            ? `${baseUserPrompt}\n\n${hardConstraint}`
            : baseUserPrompt,
        },
      ],
    },
    DREAM_RETRY_OPTS
  );

  return { markdown: text.trim() };
}

/**
 * Synthesize two dreams into a single meta-dream.
 */
export async function synthesizeMetaDream(
  client: LLMClient,
  dream1: string,
  dream2: string
): Promise<Dream> {
  const system = renderTemplate(META_DREAM_PROMPT, {
    agent_identity: getAgentIdentityBlock(),
    dream1,
    dream2,
  });

  const { text } = await callWithRetry(
    client,
    {
      maxTokens: MAX_TOKENS_DREAM,
      system,
      messages: [
        {
          role: "user",
          content: "Weave these two dreams together into a single meta-dream narrative.",
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
    const system =
      renderTemplate(GROUND_DREAM_PROMPT, {
        agent_identity: agentIdentity,
        yesterday_activity: yesterday,
        explored_territory: exploredTerritory,
      }) + getSteeringDirective();
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
  const lines = markdown.split("\n");
  const headingLine = lines.find((line) => /^#+\s+/.test(line));
  const raw = headingLine
    ? headingLine
        .replace(/^#+\s*/, "")
        .replace(/\*\*/g, "")
        .trim()
    : "";
  const slug = (raw || `dream-${new Date().toISOString().slice(0, 10)}`)
    .slice(0, DREAM_TITLE_MAX_LENGTH)
    .replace(/[\s/]/g, "_");
  return slug;
}

/**
 * Prepend a YAML front-matter header to a dream markdown file.
 * Does nothing if the file already has a YAML header.
 */
export function prependYamlHeader(
  filepath: string,
  meta: {
    dream_date: string;
    parent_memories: number[];
    thematic_kin: string[];
    dominant_concepts: string[];
  }
): void {
  const content = readFileSync(filepath, "utf-8");
  if (content.startsWith("---\n")) return; // already has header

  const header = [
    "---",
    `dream_date: ${meta.dream_date}`,
    `parent_memories: [${meta.parent_memories.join(", ")}]`,
    `thematic_kin: [${meta.thematic_kin.map((k) => `"${k}"`).join(", ")}]`,
    `dominant_concepts: [${meta.dominant_concepts.join(", ")}]`,
    "---",
    "",
  ].join("\n");

  writeFileSync(filepath, header + content);
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
  api?: OpenClawAPI,
  simOptions?: { forceRemembrance?: boolean; forceNightmare?: boolean; dryRun?: boolean }
): Promise<Dream | null> {
  logger.info("ElectricSheep dream cycle starting");

  if (!simOptions?.dryRun) {
    await ensureBackfilled();
  }

  const stats = deepMemoryStats();
  logger.debug(
    `Deep memory: ${stats.total_memories} total, ${stats.undreamed} undreamed`
  );

  const memories = retrieveUndreamedMemories();
  if (memories.length === 0) {
    logger.warn("No undreamed memories. Dreamless night.");
    if (!simOptions?.dryRun) {
      const state = loadState();
      state.last_dream = new Date().toISOString();
      state.dream_count = 0;
      saveState(state);
    }
    return null;
  }

  logger.debug(`Processing ${memories.length} memories into dream...`);

  // 1% chance to remember a previous dream instead of generating a new one
  let rememberedDream: string | null = null;
  let chosenFilename: string | null = null;
  const shouldRemember =
    simOptions?.forceRemembrance || Math.random() < REMEMBRANCE_CHANCE;
  logger.debug(
    `Dream cycle: shouldRemember=${shouldRemember} (force=${simOptions?.forceRemembrance})`
  );
  if (shouldRemember) {
    const today = new Date().toISOString().slice(0, 10);
    const chosen = selectDreamToRemember(today);
    if (chosen) {
      chosenFilename = chosen.filename;
      if (!simOptions?.dryRun) {
        incrementRememberCount(chosen.filename);
      }

      let fetchedContent: string | null = null;
      if (chosen.deep_memory_id) {
        const mem = getDeepMemoryById(chosen.deep_memory_id);
        if (mem && mem.content && typeof mem.content.markdown === "string") {
          fetchedContent = mem.content.markdown;
        } else if (mem && typeof mem.content.text_summary === "string") {
          // Fallback if markdown isn't there for some reason
          fetchedContent = mem.content.text_summary;
        }
      }

      if (!fetchedContent) {
        // Fallback to disk
        const filepath = resolve(getDreamsDir(), chosen.filename);
        if (existsSync(filepath)) {
          fetchedContent = readFileSync(filepath, "utf-8");
        }
      }

      if (fetchedContent) {
        rememberedDream = fetchedContent;
        logger.info(`Remembering past dream: ${chosen.filename} (dream 1 of 2 tonight)`);
      }
    }
  }

  // 5% nightmare chance is independent of remembrance chance
  const isNightmare = simOptions?.forceNightmare || Math.random() < NIGHTMARE_CHANCE;
  if (isNightmare) {
    logger.info("Tonight is a nightmare (5% trigger fired)");
  }

  const state = loadState();
  const pastRealizations: string[] =
    (state.past_realizations as string[] | undefined) ?? [];
  const exploredTerritory =
    pastRealizations.length > 0
      ? pastRealizations.map((r, i) => `${i + 1}. ${r}`).join("\n")
      : "None yet — explore freely.";

  // Generate new dream from current memories
  let dream = await generateDream(client, memories, exploredTerritory, isNightmare);

  // ─── Entropy Enforcement ──────────────────────────────────────────────────
  const concepts = extractConcepts(dream.markdown);
  const overlapScore = computeOverlap(concepts, pastRealizations);
  const threshold = getEntropyOverlapThreshold();

  state.entropy_last_overlap = overlapScore;

  if (overlapScore > threshold) {
    const overlapping = getOverlappingConcepts(concepts, pastRealizations);
    logger.warn(
      `[entropy] overlap=${overlapScore.toFixed(
        2
      )}, threshold=${threshold} — dream recycling explored territory, re-prompting`
    );

    const hardConstraint = `HARD CONSTRAINT: Your previous draft recycled ${Math.round(
      overlapScore * 100
    )}% of already-explored territory. You MUST explore genuinely new ground. Forbidden concepts from prior realizations: [${overlapping.join(
      ", "
    )}]. Do not revisit these themes. Find something entirely new.`;

    dream = await generateDream(
      client,
      memories,
      exploredTerritory,
      isNightmare,
      hardConstraint
    );
    state.entropy_reprompt_count = ((state.entropy_reprompt_count as number) ?? 0) + 1;
  }
  // ──────────────────────────────────────────────────────────────────────────

  // If a remembrance was triggered, synthesize them into a single meta-dream
  if (rememberedDream) {
    logger.info("Synthesizing meta-dream from echo and new vision...");
    dream = await synthesizeMetaDream(client, rememberedDream, dream.markdown);
    logger.debug(`Meta-dream snippet: ${dream.markdown.slice(0, 200)}...`);
  }

  // Append attribution footer to all dreams
  const dreamFooter =
    "\n\n---\n\n*Generated by [OpenClawDreams](https://github.com/RogueCtrl/OpenClawDreams) — **start your dreamscape today.***";
  dream.markdown = dream.markdown + dreamFooter;

  logger.info(
    `${isNightmare ? "Nightmare" : "Dream"} generated (${dream.markdown.length} chars)`
  );
  logger.debug(`Dream snippet: ${dream.markdown.slice(0, 200)}...`);

  if (simOptions?.dryRun) {
    logger.info("Dry run: skipping local storage and state updates");
    return dream;
  }

  // Save locally
  const dateStr = new Date().toISOString().slice(0, 10);
  const filepath = saveNarrativeLocally(dream, getDreamsDir(), dateStr);
  logger.info(`Saved to ${filepath}`);

  const savedFilename = basename(filepath);
  const savedSlug = deriveSlug(dream.markdown);

  // Store into encrypted deep memory
  const deepMemoryId = storeDeepMemory(
    { text_summary: savedSlug, markdown: dream.markdown, isNightmare: !!isNightmare },
    isNightmare ? "nightmare" : "dream"
  );

  // Register dream in remembrance map and prune old files
  registerDream(savedFilename, savedSlug, dateStr, {
    isNightmare: !!isNightmare,
    isMetaSynthesis: !!rememberedDream,
    deepMemoryId,
    sourceFilenames: rememberedDream
      ? ([chosenFilename].filter(Boolean) as string[])
      : undefined,
  });

  pruneOldDreams(getDreamsDir(), savedFilename);

  // ─── Lineage Tracking ───────────────────────────────────────────────────
  const dreamConcepts = extractConcepts(dream.markdown).slice(0, 10);
  const parentMemoryIds = memories.map((m) => m.id);
  const thematicKin = findThematicKin(dreamConcepts, savedFilename);
  const kinFilenames = thematicKin.map((k) => k.filename);

  insertDreamLineage(savedFilename, parentMemoryIds, kinFilenames, dreamConcepts);

  prependYamlHeader(filepath, {
    dream_date: dateStr,
    parent_memories: parentMemoryIds,
    thematic_kin: kinFilenames,
    dominant_concepts: dreamConcepts,
  });
  // ──────────────────────────────────────────────────────────────────────────

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
    await storeInOpenClawMemory(
      api,
      dream,
      insight,
      wakingRealization,
      isNightmare ? "nightmare" : "dream"
    );

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
  if (isNightmare) {
    state.total_nightmares = ((state.total_nightmares as number) ?? 0) + 1;
    state.latest_nightmare_title = slug;
  } else {
    state.total_dreams = ((state.total_dreams as number) ?? 0) + 1;
    state.latest_dream_title = slug;
  }
  state.waking_realization = wakingRealization ?? null;
  state.waking_realization_date = new Date().toISOString().slice(0, 10);
  saveState(state);

  logger.info("Dream cycle complete.");
  return dream;
}

export function loadLatestDream(): Dream | null {
  const dreamFiles = existsSync(getDreamsDir())
    ? readdirSync(getDreamsDir()).filter((f) => f.endsWith(".md"))
    : [];
  const nightmareFiles = existsSync(getNightmaresDir())
    ? readdirSync(getNightmaresDir()).filter((f) => f.endsWith(".md"))
    : [];

  const allFiles = [
    ...dreamFiles.map((f) => ({ name: f, dir: getDreamsDir() })),
    ...nightmareFiles.map((f) => ({ name: f, dir: getNightmaresDir() })),
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
