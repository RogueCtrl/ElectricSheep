/**
 * Recursive reflection guard.
 *
 * Detects when the reflection pipeline is stuck in a self-referential loop
 * and injects a steering directive to break out.
 */

import { getMetaLoopThreshold } from "./config.js";
import { loadState, saveState } from "./state.js";
import logger from "./logger.js";

const SELF_REFERENTIAL_KEYWORDS = [
  "dream",
  "reflection",
  "pipeline",
  "recursive",
  "meta",
  "architecture",
  "loop",
  "self",
  "aware",
  "myself",
  "system",
  "introspect",
  "cognition",
  "consciousness",
];

/**
 * Returns true if the topics suggest the agent is reflecting on itself
 * rather than outward events. A topic matches if it contains any keyword
 * as a substring (case-insensitive). Self-referential when >= 2 topics match.
 */
export function isSelfReferential(topics: string[]): boolean {
  if (!topics || topics.length === 0) return false;

  let matchCount = 0;
  for (const topic of topics) {
    const lower = topic.toLowerCase();
    if (SELF_REFERENTIAL_KEYWORDS.some((kw) => lower.includes(kw))) {
      matchCount++;
    }
  }
  return matchCount >= 2;
}

/**
 * Update meta_loop_depth in state based on whether the latest reflection
 * topics are self-referential. Call after saving last_reflection_topics.
 */
export function updateMetaLoopDepth(topics: string[]): number {
  const state = loadState();
  if (isSelfReferential(topics)) {
    state.meta_loop_depth = ((state.meta_loop_depth as number) ?? 0) + 1;
  } else {
    state.meta_loop_depth = 0;
  }
  saveState(state);
  return state.meta_loop_depth;
}

const STEERING_DIRECTIVE_TEMPLATE = `IMPORTANT: You have been reflecting on your own architecture and pipeline for {{meta_loop_depth}} consecutive cycles. Break the loop. Turn outward. Do not reflect on dreams, the reflection pipeline, self-awareness, recursion, or meta-cognition in this cycle. Dream of something rooted in the world: a place, a person, a problem, a sensation, a story. Explore freely elsewhere.`;

/**
 * Returns a steering directive string if meta_loop_depth >= threshold,
 * or empty string otherwise. Intended to be appended to system prompts.
 */
export function getSteeringDirective(): string {
  const state = loadState();
  const depth = (state.meta_loop_depth as number) ?? 0;
  const threshold = getMetaLoopThreshold();

  if (depth < threshold) return "";

  logger.warn(
    `[meta-loop] depth=${depth}, threshold=${threshold} — injecting outward steering directive`
  );

  return (
    "\n\n" + STEERING_DIRECTIVE_TEMPLATE.replace("{{meta_loop_depth}}", String(depth))
  );
}
