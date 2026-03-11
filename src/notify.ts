/**
 * Operator notification module.
 *
 * Sends dream notifications via OpenClaw system events with cron-prefix
 * context keys to bypass quiet hours, then requests an immediate heartbeat
 * so the gateway delivers even at 2am.
 */

import { getNotifyOperatorOnDream } from "./config.js";
import { callWithRetry, WAKING_RETRY_OPTS } from "./llm.js";
import { DREAM_NOTIFICATION_PROMPT, renderTemplate } from "./persona.js";
import { getAgentIdentityBlock } from "./identity.js";
import logger from "./logger.js";
import type { LLMClient, OpenClawAPI, Dream } from "./types.js";

/**
 * Generate a conversational message to notify the operator about a dream.
 *
 * Uses LLM to craft a message in the agent's voice that invites the
 * operator to discuss the dream.
 */
async function generateDreamNotification(
  client: LLMClient,
  dream: Dream
): Promise<string> {
  // Extract a brief excerpt from the dream for context
  const dreamExcerpt = dream.markdown.slice(0, 500);

  const system = renderTemplate(DREAM_NOTIFICATION_PROMPT, {
    agent_identity: getAgentIdentityBlock(),
  });

  try {
    const { text } = await callWithRetry(
      client,
      {
        maxTokens: 300,
        system,
        messages: [
          {
            role: "user",
            content:
              `I had this dream last night:\n\n${dreamExcerpt}${dream.markdown.length > 500 ? "..." : ""}\n\n` +
              `Write a brief, conversational message to my operator letting them know I had a dream ` +
              `and inviting them to talk about it. Keep it natural and in my voice.`,
          },
        ],
      },
      WAKING_RETRY_OPTS
    );

    return text.trim();
  } catch (error) {
    logger.error(`Failed to generate dream notification: ${error}`);
    // Fallback to a simple message
    return "I had an interesting dream last night. Would you like to hear about it?";
  }
}

/**
 * Resolve the default agent session key from OpenClaw runtime config.
 */
function resolveSessionKey(api: OpenClawAPI): string {
  try {
    const cfg = api.runtime.config.loadConfig();
    const agentId = cfg.agents?.list?.find((a) => a.default)?.id || "default";
    return `${agentId}:main`;
  } catch {
    return "default:main";
  }
}

/**
 * Notify the operator about a dream.
 *
 * Delivery strategy:
 * 1. Generate a conversational notification message via LLM
 * 2. Enqueue as a system event with "cron:" context key prefix (bypasses quiet hours)
 * 3. Request an immediate heartbeat to wake the gateway for delivery
 *
 * Returns true if notification was enqueued successfully, false otherwise.
 */
export async function notifyOperatorOfDream(
  client: LLMClient,
  api: OpenClawAPI,
  dream: Dream,
  title: string,
  insight: string | null
): Promise<boolean> {
  if (!getNotifyOperatorOnDream()) {
    logger.debug("Dream notifications disabled by configuration");
    return false;
  }

  // Generate the notification message
  const message = await generateDreamNotification(client, dream);

  const sessionKey = resolveSessionKey(api);

  try {
    api.runtime.system.enqueueSystemEvent(message, {
      sessionKey,
      contextKey: "cron:openclawdreams",
    });

    api.runtime.system.requestHeartbeatNow({
      sessionKey,
      reason: "cron",
    });

    logger.info(`Enqueued dream notification as system event: ${title}`);
    return true;
  } catch (error) {
    logger.warn(
      `Failed to enqueue system event: ${error}\n` +
        `Title: ${title}\nInsight: ${insight || "No insight"}\nMessage: ${message}`
    );
    return false;
  }
}
