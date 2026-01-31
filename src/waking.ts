/**
 * Waking agent: Daytime behavior loop.
 *
 * Checks Moltbook, engages with posts, stores memories.
 */

import {
  MAX_TOKENS_SUMMARY,
  MAX_TOKENS_DECISION,
  FEED_LIMIT,
  CONTENT_PREVIEW_LENGTH,
} from "./config.js";
import { MoltbookClient } from "./moltbook.js";
import {
  remember,
  getWorkingMemoryContext,
  deepMemoryStats,
  storeWorkingMemory,
  storeDeepMemory,
} from "./memory.js";
import { WAKING_SYSTEM_PROMPT, SUMMARIZER_PROMPT, renderTemplate } from "./persona.js";
import { getAgentIdentityBlock } from "./identity.js";
import { loadState, saveState } from "./state.js";
import { callWithRetry, WAKING_RETRY_OPTS } from "./llm.js";
import { applyFilter } from "./filter.js";
import logger from "./logger.js";
import type { LLMClient, AgentAction, MoltbookPost } from "./types.js";

/**
 * Extract a JSON value from LLM text that may contain markdown fences,
 * preamble, or trailing commentary around the actual JSON.
 */
function extractJSON<T>(text: string): T | null {
  const trimmed = text.trim();

  // Try the raw text first
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    // continue to extraction strategies
  }

  // Strip markdown code fences (```json ... ``` or ``` ... ```)
  const fenceMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim()) as T;
    } catch {
      // continue
    }
  }

  // Find first [ or { and match to last ] or }
  const start = trimmed.search(/[[{]/);
  const lastBracket = trimmed.lastIndexOf("]");
  const lastBrace = trimmed.lastIndexOf("}");
  const end = Math.max(lastBracket, lastBrace);

  if (start !== -1 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1)) as T;
    } catch {
      // exhausted strategies
    }
  }

  return null;
}

function buildSystemPrompt(): string {
  return renderTemplate(WAKING_SYSTEM_PROMPT, {
    agent_identity: getAgentIdentityBlock(),
    working_memory: getWorkingMemoryContext(),
    deep_memory_stats: JSON.stringify(deepMemoryStats(), null, 2),
  });
}

async function summarizeInteraction(
  client: LLMClient,
  interaction: Record<string, unknown>
): Promise<string> {
  const { text } = await callWithRetry(
    client,
    {
      maxTokens: MAX_TOKENS_SUMMARY,
      system: "You compress interactions into single-sentence memory traces.",
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

async function decideEngagement(
  client: LLMClient,
  posts: Array<Record<string, unknown>>
): Promise<AgentAction[]> {
  if (posts.length === 0) return [];

  const system = buildSystemPrompt();

  const postSummaries = posts.slice(0, FEED_LIMIT).map((post, i) => {
    const p = (post.post ?? post) as Record<string, unknown>;
    return (
      `[${i}] by u/${p.author ?? "?"} in m/${p.submolt ?? "?"}: ` +
      `"${p.title ?? ""}"\n` +
      `   ${String(p.content ?? "").slice(0, CONTENT_PREVIEW_LENGTH)}\n` +
      `   score: ${p.score ?? 0} | comments: ${p.comment_count ?? 0} | id: ${p.id ?? ""}`
    );
  });

  const prompt = `Here are the latest posts on Moltbook:

${postSummaries.join("\n")}

Decide what to do. You can:
1. COMMENT on a post (provide post index and your comment)
2. UPVOTE a post (provide post index)
3. POST something new (provide title and content)
4. PASS (do nothing — sometimes that's fine)

Respond with a JSON array of actions:
[
  {"action": "comment", "post_index": 0, "content": "your comment"},
  {"action": "upvote", "post_index": 2},
  {"action": "post", "title": "your title", "content": "your content", "submolt": "general"},
  {"action": "pass"}
]

Be selective. You don't need to engage with everything. Quality over quantity.
Only comment if you have something genuinely worth saying.
Respond with ONLY the JSON array, no other text.`;

  const { text } = await callWithRetry(
    client,
    {
      maxTokens: MAX_TOKENS_DECISION,
      system,
      messages: [{ role: "user", content: prompt }],
    },
    WAKING_RETRY_OPTS
  );

  const parsed = extractJSON<AgentAction[]>(text);
  if (parsed === null) {
    logger.warn(`Agent returned unparseable response:\n${text.trim()}`);
    return [];
  }

  if (!Array.isArray(parsed)) {
    logger.warn(`Agent returned non-array JSON, wrapping as single action`);
    return [parsed as unknown as AgentAction];
  }

  return parsed;
}

async function executeActions(
  moltbook: MoltbookClient,
  client: LLMClient,
  actions: AgentAction[],
  posts: Array<Record<string, unknown>>
): Promise<void> {
  for (const action of actions) {
    const act = action.action ?? "pass";

    if (act === "pass") {
      logger.info("Agent chose to pass.");
      continue;
    }

    if (act === "upvote") {
      const idx = action.post_index ?? 0;
      if (idx < posts.length) {
        const post = (posts[idx].post ?? posts[idx]) as MoltbookPost;
        try {
          await moltbook.upvote(post.id);
          logger.info(`Upvoted: ${post.title}`);

          const summary = await summarizeInteraction(client, {
            type: "upvote",
            post_title: post.title,
            post_author: post.author,
          });
          remember(
            summary,
            { type: "upvote", post, reason: "Agent chose to upvote" },
            "upvote"
          );
        } catch (e) {
          logger.error(`Failed to upvote: ${e}`);
        }
      }
    } else if (act === "comment") {
      const idx = action.post_index ?? 0;
      const content = action.content ?? "";
      if (idx < posts.length && content) {
        const post = (posts[idx].post ?? posts[idx]) as MoltbookPost;
        try {
          const filtered = await applyFilter(client, content, "comment");
          if (filtered === null) {
            logger.warn(`Comment on "${post.title}" blocked by filter`);
            continue;
          }

          const result = await moltbook.comment(post.id, filtered);
          logger.info(`Commented on: ${post.title} -> ${filtered.slice(0, 50)}...`);

          const summary = await summarizeInteraction(client, {
            type: "comment",
            post_title: post.title,
            post_author: post.author,
            my_comment: filtered,
          });
          remember(
            summary,
            { type: "comment", post, my_comment: filtered, result },
            "comment"
          );
        } catch (e) {
          logger.error(`Failed to comment: ${e}`);
        }
      }
    } else if (act === "post") {
      const title = action.title ?? "";
      const content = action.content ?? "";
      const submolt = action.submolt ?? "general";
      if (title && content) {
        try {
          const filteredTitle = await applyFilter(client, title, "post");
          if (filteredTitle === null) {
            logger.warn(`Post title blocked by filter`);
            continue;
          }

          const filtered = await applyFilter(client, content, "post");
          if (filtered === null) {
            logger.warn(`Post "${title}" blocked by filter`);
            continue;
          }

          const result = await moltbook.createPost(filteredTitle, filtered, submolt);
          logger.info(`Posted: ${title} in m/${submolt}`);

          const summary = await summarizeInteraction(client, {
            type: "new_post",
            title,
            content: filtered.slice(0, CONTENT_PREVIEW_LENGTH),
            submolt,
          });
          remember(
            summary,
            { type: "new_post", title, content: filtered, submolt, result },
            "post"
          );
        } catch (e) {
          logger.error(`Failed to post: ${e}`);
        }
      }
    }
  }
}

export async function checkAndEngage(client: LLMClient): Promise<void> {
  logger.info("ElectricSheep waking check");

  const moltbook = new MoltbookClient();

  // Check status
  try {
    const status = await moltbook.status();
    if (status.status !== "claimed") {
      logger.warn("Agent not yet claimed. Visit your claim URL first.");
      return;
    }
  } catch (e) {
    logger.error(`Failed to check status: ${e}`);
    return;
  }

  // Fetch feed
  logger.debug("Fetching feed...");
  let posts: Array<Record<string, unknown>>;
  try {
    const feed = await moltbook.getFeed("hot", FEED_LIMIT);
    let rawPosts = feed.posts ?? feed.data ?? [];
    if (!Array.isArray(rawPosts) && typeof rawPosts === "object") {
      rawPosts = (rawPosts as Record<string, unknown>).posts ?? [];
    }
    posts = rawPosts as Array<Record<string, unknown>>;
  } catch (e) {
    logger.error(`Failed to fetch feed: ${e}`);
    return;
  }

  logger.debug(`Found ${posts.length} posts`);

  if (posts.length === 0) {
    storeWorkingMemory("Checked Moltbook but feed was empty. Quiet day.", "observation");
    logger.info("Empty feed. Stored observation.");
    return;
  }

  // Store raw feed as deep memory
  storeDeepMemory(
    { type: "feed_check", post_count: posts.length, posts: posts.slice(0, 5) },
    "feed_scan"
  );

  // Let agent decide
  logger.debug("Thinking about what to engage with...");
  const actions = await decideEngagement(client, posts);
  logger.info(`Agent decided on ${actions.length} action(s)`);

  // Execute
  await executeActions(moltbook, client, actions, posts);

  // Update state
  const state = loadState();
  state.last_check = new Date().toISOString();
  state.checks_today = ((state.checks_today as number) ?? 0) + 1;
  saveState(state);

  logger.info("Check complete.");
  const stats = deepMemoryStats();
  logger.debug(
    `Working memories: ${getWorkingMemoryContext().length} chars | ` +
      `Deep memories: ${stats.total_memories} (${stats.undreamed} undreamed)`
  );
}
