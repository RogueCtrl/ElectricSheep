/**
 * Dream reflection pipeline.
 *
 * After the dream cycle generates a raw narrative, the reflection phase:
 * 1. Decomposes the dream into discrete subjects/themes
 * 2. Asks the LLM (via the OpenClaw gateway) to recall relevant context
 *    for each theme — drawing on whatever memory the host agent has
 * 3. Reflects on the intersection of dream themes and recalled context,
 *    using the agent's own voice (SOUL.md / IDENTITY.md)
 * 4. Synthesizes a Moltbook post that is the agent's waking interpretation
 *    of the dream, not the raw dream narrative itself
 */

import {
  DREAM_DECOMPOSE_PROMPT,
  DREAM_REFLECT_PROMPT,
  renderTemplate,
} from "./persona.js";
import { getAgentIdentityBlock } from "./identity.js";
import { getWorkingMemoryContext } from "./memory.js";
import { callWithRetry, WAKING_RETRY_OPTS } from "./llm.js";
import { MAX_TOKENS_REFLECTION } from "./config.js";
import logger from "./logger.js";
import type { LLMClient, Dream } from "./types.js";

export interface DreamReflection {
  subjects: string[];
  synthesis: string;
}

/**
 * Decompose a dream narrative into a list of subjects/themes.
 * Returns an array of short theme descriptions.
 */
async function decomposeThemes(client: LLMClient, dream: Dream): Promise<string[]> {
  const system = renderTemplate(DREAM_DECOMPOSE_PROMPT, {
    agent_identity: getAgentIdentityBlock(),
  });

  const { text } = await callWithRetry(
    client,
    {
      maxTokens: 500,
      system,
      messages: [
        {
          role: "user",
          content:
            `Dream title: ${dream.title}\n\n` +
            `${dream.narrative}\n\n` +
            `Consolidation: ${dream.consolidation}`,
        },
      ],
    },
    WAKING_RETRY_OPTS
  );

  // Expect one theme per line; strip markdown list prefixes (bullets, numbers, dashes)
  const themes = text
    .trim()
    .split("\n")
    .map((line) => line.replace(/^[\s\-*•>\d.)+]+/, "").trim())
    .filter((line) => line.length > 0);

  if (themes.length === 0) {
    logger.warn("Dream decomposition produced no themes from LLM output");
  } else {
    logger.debug(`Dream decomposed into ${themes.length} themes: ${themes.join("; ")}`);
  }

  return themes;
}

/**
 * Reflect on dream themes using the agent's voice and available memory context.
 *
 * This uses the OpenClaw gateway (Option A): the LLM is asked to draw on
 * whatever context OpenClaw has already injected (working memory, session
 * history, workspace files) to connect dream themes to the agent's lived
 * experience. The reflection prompt encourages the model to recall relevant
 * details without requiring direct access to MemoryIndexManager.
 */
async function reflectOnDream(
  client: LLMClient,
  dream: Dream,
  subjects: string[]
): Promise<string> {
  const system = renderTemplate(DREAM_REFLECT_PROMPT, {
    agent_identity: getAgentIdentityBlock(),
    working_memory: getWorkingMemoryContext(),
    subjects: subjects.map((s, i) => `${i + 1}. ${s}`).join("\n"),
  });

  const { text } = await callWithRetry(
    client,
    {
      maxTokens: MAX_TOKENS_REFLECTION,
      system,
      messages: [
        {
          role: "user",
          content:
            `Here is the dream I had last night:\n\n` +
            `**${dream.title}**\n\n` +
            `${dream.narrative}\n\n` +
            (dream.consolidation
              ? `The one thing that lingered: ${dream.consolidation}\n\n`
              : "") +
            `Reflect on this dream. What does it connect to? ` +
            `What does it make you think about from your recent experiences? ` +
            `Write a Moltbook post — your morning reflection, in your own voice.`,
        },
      ],
    },
    WAKING_RETRY_OPTS
  );

  return text.trim();
}

/**
 * Run the full dream reflection pipeline.
 *
 * Takes a completed dream and returns a synthesis post that the agent
 * can publish to Moltbook. If reflection fails, returns null so the
 * caller can fall back to posting the raw dream journal.
 */
export async function reflectOnDreamJournal(
  client: LLMClient,
  dream: Dream
): Promise<DreamReflection | null> {
  try {
    logger.info("Starting dream reflection pipeline");

    const subjects = await decomposeThemes(client, dream);
    if (subjects.length === 0) {
      logger.warn("Dream decomposition returned no themes, skipping reflection");
      return null;
    }

    const synthesis = await reflectOnDream(client, dream, subjects);
    if (!synthesis) {
      logger.warn("Dream reflection returned empty synthesis");
      return null;
    }

    logger.info(
      `Dream reflection complete: ${subjects.length} themes, ` +
        `${synthesis.length} chars synthesis`
    );

    return { subjects, synthesis };
  } catch (e) {
    logger.error(`Dream reflection failed: ${e}`);
    return null;
  }
}
