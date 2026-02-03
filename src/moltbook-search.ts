/**
 * Moltbook search integration for gathering community context.
 *
 * Searches Moltbook for posts related to extracted topics when
 * Moltbook integration is enabled.
 */

import { MoltbookClient } from "./moltbook.js";
import { MOLTBOOK_ENABLED, MAX_MOLTBOOK_RESULTS_PER_TOPIC } from "./config.js";
import logger from "./logger.js";
import type { MoltbookPost } from "./types.js";

export interface MoltbookSearchContext {
  query: string;
  posts: MoltbookPost[];
}

/**
 * Search Moltbook for posts related to a list of topics.
 *
 * Returns aggregated results grouped by topic. When Moltbook is disabled
 * or search fails, returns empty results.
 */
export async function searchMoltbookForTopics(
  topics: string[],
  limitPerTopic: number = MAX_MOLTBOOK_RESULTS_PER_TOPIC
): Promise<MoltbookSearchContext[]> {
  if (!MOLTBOOK_ENABLED) {
    logger.debug("Moltbook disabled by configuration");
    return [];
  }

  const client = new MoltbookClient();
  const results: MoltbookSearchContext[] = [];

  for (const topic of topics) {
    try {
      logger.debug(`Searching Moltbook for topic: ${topic}`);
      const searchResponse = await client.search(topic, limitPerTopic);

      // Extract posts from response (handle various response formats)
      const posts = extractPostsFromSearchResponse(searchResponse);

      results.push({
        query: topic,
        posts,
      });

      logger.debug(`Found ${posts.length} Moltbook posts for "${topic}"`);
    } catch (error) {
      logger.warn(`Moltbook search failed for topic "${topic}": ${error}`);
      results.push({
        query: topic,
        posts: [],
      });
    }
  }

  return results;
}

/**
 * Extract posts from Moltbook search response.
 * Handles various response formats from the API.
 */
function extractPostsFromSearchResponse(
  response: Record<string, unknown>
): MoltbookPost[] {
  // Try various response formats
  const rawPosts =
    (response.results as MoltbookPost[]) ??
    (response.posts as MoltbookPost[]) ??
    (response.data as MoltbookPost[]) ??
    [];

  if (!Array.isArray(rawPosts)) {
    return [];
  }

  return rawPosts.filter(
    (p): p is MoltbookPost =>
      typeof p === "object" &&
      p !== null &&
      typeof p.id === "string" &&
      typeof p.content === "string"
  );
}

/**
 * Format Moltbook search results into a readable context string for LLM consumption.
 */
export function formatMoltbookContext(searchContexts: MoltbookSearchContext[]): string {
  if (searchContexts.length === 0) {
    return "";
  }

  const sections: string[] = [];

  for (const ctx of searchContexts) {
    if (ctx.posts.length === 0) continue;

    const postLines = ctx.posts.map((p, i) => {
      const preview =
        p.content.length > 200 ? p.content.slice(0, 200) + "..." : p.content;
      return `  ${i + 1}. @${p.author}: "${p.title || "(untitled)"}"\n     ${preview}`;
    });

    sections.push(`Topic: "${ctx.query}"\n${postLines.join("\n\n")}`);
  }

  if (sections.length === 0) {
    return "";
  }

  return `MOLTBOOK COMMUNITY POSTS:\n\n${sections.join("\n\n")}`;
}
