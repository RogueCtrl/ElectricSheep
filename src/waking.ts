/**
 * Waking agent: Reflection cycle.
 *
 * Analyzes operator conversations, gathers context from web and community,
 * and synthesizes insights for storage in memory.
 */

import {
  MAX_TOKENS_SUMMARY,
  CONTENT_PREVIEW_LENGTH,
  getVocabularyRotation,
} from "./config.js";
import { formatVocabularyHint } from "./vocabulary.js";
import { deepMemoryStats, storeDeepMemory } from "./memory.js";
import { SUMMARIZER_PROMPT, renderTemplate } from "./persona.js";
import { loadState, saveState } from "./state.js";
import { callWithRetry, WAKING_RETRY_OPTS } from "./llm.js";
import { gatherContext, synthesizeContext } from "./synthesis.js";
import { getRecentConversations } from "./topics.js";
import logger from "./logger.js";
import { updateMetaLoopDepth } from "./meta-loop.js";
import type {
  LLMClient,
  OpenClawAPI,
  ReflectionMode,
  SynthesisContext,
} from "./types.js";

/**
 * Summarize a synthesis for working memory storage.
 */
async function summarizeSynthesis(
  client: LLMClient,
  synthesis: string,
  topics: string[]
): Promise<string> {
  const interaction = {
    type: "reflection_synthesis",
    topics: topics.join(", "),
    synthesis_preview: synthesis.slice(0, CONTENT_PREVIEW_LENGTH),
  };

  const { text } = await callWithRetry(
    client,
    {
      maxTokens: MAX_TOKENS_SUMMARY,
      system: "You compress reflections into single-sentence memory traces.",
      messages: [
        {
          role: "user",
          content: renderTemplate(SUMMARIZER_PROMPT, {
            interaction: JSON.stringify(interaction, null, 2),
          }),
        },
      ],
    },
    WAKING_RETRY_OPTS
  );
  return text.trim();
}

/**
 * Store synthesis results in OpenClaw memory if available.
 */
async function storeInOpenClawMemory(
  api: OpenClawAPI,
  synthesis: string,
  context: SynthesisContext
): Promise<void> {
  if (!api.memory) {
    logger.debug("OpenClaw memory API not available, skipping storage");
    return;
  }

  try {
    await api.memory.store(synthesis, {
      type: "reflection_synthesis",
      topics: context.topics,
      timestamp: new Date().toISOString(),
      hasMoltbookContext: !!context.moltbookContext,
      hasWebContext: !!context.webContext,
      hasCommunityContext: !!context.communityContext,
    });
    logger.info("Stored synthesis in OpenClaw memory");
  } catch (error) {
    logger.error(`Failed to store in OpenClaw memory: ${error}`);
  }
}

/**
 * Run the reflection cycle.
 *
 * New flow:
 * 1. Get recent operator conversations from working memory
 * 2. Extract topics from those conversations
 * 3. Search Moltbook (optional) and web (optional) for related content
 * 4. Synthesize context into a unified understanding
 * 5. Store in both local memory and OpenClaw memory
 */
export async function runReflectionCycle(
  client: LLMClient,
  api: OpenClawAPI,
  options?: { dryRun?: boolean; mode?: ReflectionMode }
): Promise<void> {
  const dryRun = options?.dryRun ?? false;
  const mode = options?.mode ?? "synthesis";
  logger.info(`ElectricSheep reflection cycle starting (mode: ${mode})`);

  // Check if we have any conversations to reflect on
  const recentConversations = getRecentConversations();
  if (recentConversations.length === 0) {
    logger.info("No recent conversations to reflect on");
    if (!dryRun) {
      storeDeepMemory(
        {
          summary:
            "Reflection cycle ran but no recent operator conversations to process.",
          type: "observation",
        },
        "observation"
      );
    }
    return;
  }

  logger.info(`Found ${recentConversations.length} recent conversations to analyze`);

  // Gather context from all sources
  const context = await gatherContext(client, api);

  if (context.topics.length === 0) {
    logger.info("No topics extracted from conversations");
    if (!dryRun) {
      storeDeepMemory(
        {
          summary: "Analyzed recent conversations but no clear topics emerged.",
          type: "observation",
        },
        "observation"
      );
    }
    return;
  }

  logger.info(`Extracted ${context.topics.length} topics: ${context.topics.join("; ")}`);

  // Vocabulary rotation for waking prompts
  let vocabHint: string | undefined;
  if (getVocabularyRotation()) {
    const wakingState = loadState();
    const cycleCounts = (wakingState.prompt_cycle_counts as
      | { dream: number; reflection: number; waking: number }
      | undefined) ?? { dream: 0, reflection: 0, waking: 0 };
    vocabHint = formatVocabularyHint("waking", cycleCounts.waking);
    cycleCounts.waking += 1;
    wakingState.prompt_cycle_counts = cycleCounts;
    saveState(wakingState);
  }

  // Generate synthesis
  const synthesis = await synthesizeContext(client, context, vocabHint, mode);

  if (!synthesis) {
    logger.warn("Synthesis generation failed or returned empty");
    return;
  }

  // Store in local memory systems
  const summary = await summarizeSynthesis(client, synthesis, context.topics);

  if (dryRun) {
    // Print synthesis output instead of storing
    console.log("\n--- DRY RUN: Reflection Synthesis ---\n");
    console.log(`Topics: ${context.topics.join(", ")}\n`);
    console.log(synthesis);
    console.log(`\nSummary: ${summary}`);
    console.log("\n--- End Dry Run ---\n");
    return;
  }

  // Store full context in deep memory (includes summary for later retrieval)
  storeDeepMemory(
    {
      type: "reflection_synthesis",
      topics: context.topics,
      synthesis,
      summary,
      contextSources: {
        operator: true,
        moltbook: !!context.moltbookContext,
        web: !!context.webContext,
        community: !!context.communityContext,
      },
    },
    "reflection"
  );

  // Store in OpenClaw memory if available
  await storeInOpenClawMemory(api, synthesis, context);

  // Update state
  const state = loadState();
  state.last_check = new Date().toISOString();
  state.checks_today = ((state.checks_today as number) ?? 0) + 1;
  state.last_reflection_topics = context.topics;
  saveState(state);

  // Update recursive reflection guard
  updateMetaLoopDepth(context.topics);

  logger.info("Reflection cycle complete");
  const stats = deepMemoryStats();
  logger.debug(`Deep memories: ${stats.total_memories} (${stats.undreamed} undreamed)`);
}

// ─── Legacy Support ─────────────────────────────────────────────────────────

/**
 * @deprecated Use runReflectionCycle instead.
 * Kept for backwards compatibility.
 */
export async function checkAndEngage(client: LLMClient): Promise<void> {
  logger.warn(
    "checkAndEngage is deprecated. Use runReflectionCycle instead. " +
      "Running reflection cycle..."
  );

  // Create a minimal API object for the reflection cycle
  // This won't have memory but will still work
  const minimalApi: OpenClawAPI = {
    registerTool: () => {},
    registerCli: () => {},
    registerHook: () => {},
    registerService: (_def: unknown) => {},
    registerGatewayMethod: (_m: string, _h: unknown) => {},
    runtime: {
      config: { loadConfig: () => ({}) },
      subagent: {
        run: async () => ({ runId: "mock" }),
        waitForRun: async () => ({ status: "ok" }),
        getSessionMessages: async () => ({ messages: [] }),
      },
      system: {
        enqueueSystemEvent: () => {},
        requestHeartbeatNow: () => {},
      },
    },
  };

  await runReflectionCycle(client, minimalApi);
}
