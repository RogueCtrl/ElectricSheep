/**
 * Operator notification module.
 *
 * Sends notifications to the operator through configured channels
 * (Telegram, Discord, Slack, etc.) when dreams are generated.
 */

import { NOTIFICATION_CHANNEL, NOTIFY_OPERATOR_ON_DREAM } from "./config.js";
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
 * Notify the operator about a dream through the configured channel.
 *
 * Returns true if notification was sent successfully, false otherwise.
 */
export async function notifyOperatorOfDream(
  client: LLMClient,
  api: OpenClawAPI,
  dream: Dream
): Promise<boolean> {
  if (!NOTIFY_OPERATOR_ON_DREAM) {
    logger.debug("Dream notifications disabled by configuration");
    return false;
  }

  if (!NOTIFICATION_CHANNEL) {
    logger.debug("No notification channel configured");
    return false;
  }

  if (!api.channels) {
    logger.warn("OpenClaw channels API not available");
    return false;
  }

  try {
    // Check if the configured channel is available
    const configuredChannels = await api.channels.getConfigured();

    if (!configuredChannels.includes(NOTIFICATION_CHANNEL)) {
      logger.warn(
        `Notification channel "${NOTIFICATION_CHANNEL}" not available. ` +
          `Available channels: ${configuredChannels.join(", ")}`
      );
      return false;
    }

    // Generate the notification message
    const message = await generateDreamNotification(client, dream);

    // Send through the channel
    await api.channels.send(NOTIFICATION_CHANNEL, message);

    logger.info(`Sent dream notification via ${NOTIFICATION_CHANNEL}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send dream notification: ${error}`);
    return false;
  }
}

/**
 * Get a list of available notification channels.
 */
export async function getAvailableChannels(api: OpenClawAPI): Promise<string[]> {
  if (!api.channels) {
    return [];
  }

  try {
    return await api.channels.getConfigured();
  } catch (error) {
    logger.error(`Failed to get available channels: ${error}`);
    return [];
  }
}
