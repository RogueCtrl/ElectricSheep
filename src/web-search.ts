/**
 * Web search integration for gathering context related to operator conversations.
 *
 * Uses OpenClaw's web search API when available, with fallback behavior
 * when the API is not exposed.
 */

import { WEB_SEARCH_ENABLED, MAX_WEB_RESULTS_PER_TOPIC } from "./config.js";
import logger from "./logger.js";
import type { OpenClawAPI, WebSearchResult } from "./types.js";

export interface WebSearchContext {
  query: string;
  results: WebSearchResult[];
}

/**
 * Search the web for content related to a list of topics.
 *
 * Returns aggregated results grouped by topic. When web search is disabled
 * or the API is unavailable, returns empty results.
 */
export async function searchWebForTopics(
  api: OpenClawAPI,
  topics: string[],
  limitPerTopic: number = MAX_WEB_RESULTS_PER_TOPIC
): Promise<WebSearchContext[]> {
  if (!WEB_SEARCH_ENABLED) {
    logger.debug("Web search disabled by configuration");
    return [];
  }

  if (!api.webSearch) {
    logger.debug("OpenClaw web search API not available");
    return [];
  }

  const results: WebSearchContext[] = [];

  for (const topic of topics) {
    try {
      logger.debug(`Searching web for topic: ${topic}`);
      const searchResults = await api.webSearch.search(topic, limitPerTopic);

      results.push({
        query: topic,
        results: searchResults,
      });

      logger.debug(`Found ${searchResults.length} web results for "${topic}"`);
    } catch (error) {
      logger.warn(`Web search failed for topic "${topic}": ${error}`);
      results.push({
        query: topic,
        results: [],
      });
    }
  }

  return results;
}

/**
 * Format web search results into a readable context string for LLM consumption.
 */
export function formatWebContext(searchContexts: WebSearchContext[]): string {
  if (searchContexts.length === 0) {
    return "";
  }

  const sections: string[] = [];

  for (const ctx of searchContexts) {
    if (ctx.results.length === 0) continue;

    const resultLines = ctx.results.map(
      (r, i) => `  ${i + 1}. ${r.title}\n     ${r.snippet}\n     (${r.url})`
    );

    sections.push(`Topic: "${ctx.query}"\n${resultLines.join("\n")}`);
  }

  if (sections.length === 0) {
    return "";
  }

  return `WEB SEARCH RESULTS:\n\n${sections.join("\n\n")}`;
}
