/**
 * Moltbook API client.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import pRetry from "p-retry";
import { MOLTBOOK_BASE_URL, CREDENTIALS_FILE } from "./config.js";
import logger from "./logger.js";

const RETRY_OPTIONS = {
  retries: 3,
  minTimeout: 2000,
  maxTimeout: 10000,
} as const;

export class MoltbookClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? this.loadStoredKey();
    this.baseUrl = MOLTBOOK_BASE_URL;
  }

  private loadStoredKey(): string {
    if (existsSync(CREDENTIALS_FILE)) {
      const creds = JSON.parse(readFileSync(CREDENTIALS_FILE, "utf-8"));
      return creds.api_key ?? "";
    }
    return "";
  }

  private saveCredentials(data: Record<string, string>): void {
    writeFileSync(CREDENTIALS_FILE, JSON.stringify(data, null, 2));
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (this.apiKey) {
      h["Authorization"] = `Bearer ${this.apiKey}`;
    }
    return h;
  }

  private async request(
    method: string,
    path: string,
    options?: { body?: unknown; params?: Record<string, string | number> }
  ): Promise<Record<string, unknown>> {
    let url = `${this.baseUrl}${path}`;
    if (options?.params) {
      const searchParams = new URLSearchParams();
      for (const [k, v] of Object.entries(options.params)) {
        searchParams.set(k, String(v));
      }
      url += `?${searchParams.toString()}`;
    }

    const resp = await fetch(url, {
      method,
      headers: this.headers(),
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Moltbook API ${resp.status}: ${text}`);
    }

    return resp.json() as Promise<Record<string, unknown>>;
  }

  private retryRequest(
    method: string,
    path: string,
    options?: { body?: unknown; params?: Record<string, string | number> }
  ): Promise<Record<string, unknown>> {
    return pRetry(() => this.request(method, path, options), RETRY_OPTIONS);
  }

  // --- Registration ---

  async register(name: string, description: string): Promise<Record<string, unknown>> {
    logger.info(`Registering agent: ${name}`);
    const result = await this.retryRequest("POST", "/agents/register", {
      body: { name, description },
    });

    const agentData = (result.agent ?? result) as Record<string, string>;
    this.saveCredentials({
      api_key: agentData.api_key ?? "",
      agent_name: name,
      claim_url: agentData.claim_url ?? "",
      verification_code: agentData.verification_code ?? "",
    });

    this.apiKey = agentData.api_key ?? "";
    return result;
  }

  async status(): Promise<Record<string, unknown>> {
    return this.request("GET", "/agents/status");
  }

  async me(): Promise<Record<string, unknown>> {
    return this.request("GET", "/agents/me");
  }

  // --- Posts ---

  async createPost(
    title: string,
    content: string,
    submolt: string = "general"
  ): Promise<Record<string, unknown>> {
    logger.info(`Creating post: ${title} in m/${submolt}`);
    return this.retryRequest("POST", "/posts", {
      body: { submolt, title, content },
    });
  }

  async getFeed(
    sort: string = "hot",
    limit: number = 25
  ): Promise<Record<string, unknown>> {
    logger.debug(`Fetching feed: ${sort}, limit=${limit}`);
    return this.retryRequest("GET", "/posts", {
      params: { sort, limit },
    });
  }

  async getPersonalFeed(
    sort: string = "hot",
    limit: number = 25
  ): Promise<Record<string, unknown>> {
    return this.request("GET", "/feed", { params: { sort, limit } });
  }

  async getPost(postId: string): Promise<Record<string, unknown>> {
    return this.request("GET", `/posts/${postId}`);
  }

  // --- Comments ---

  async comment(
    postId: string,
    content: string,
    parentId?: string
  ): Promise<Record<string, unknown>> {
    logger.info(`Commenting on ${postId}: ${content.slice(0, 50)}...`);
    const body: Record<string, string> = { content };
    if (parentId) body.parent_id = parentId;
    return this.retryRequest("POST", `/posts/${postId}/comments`, { body });
  }

  async getComments(
    postId: string,
    sort: string = "top"
  ): Promise<Record<string, unknown>> {
    return this.request("GET", `/posts/${postId}/comments`, {
      params: { sort },
    });
  }

  // --- Voting ---

  async upvote(postId: string): Promise<Record<string, unknown>> {
    logger.debug(`Upvoting post: ${postId}`);
    return this.retryRequest("POST", `/posts/${postId}/upvote`);
  }

  async downvote(postId: string): Promise<Record<string, unknown>> {
    return this.request("POST", `/posts/${postId}/downvote`);
  }

  async upvoteComment(commentId: string): Promise<Record<string, unknown>> {
    return this.request("POST", `/comments/${commentId}/upvote`);
  }

  // --- Submolts ---

  async createSubmolt(
    name: string,
    displayName: string,
    description: string
  ): Promise<Record<string, unknown>> {
    return this.request("POST", "/submolts", {
      body: { name, display_name: displayName, description },
    });
  }

  async listSubmolts(): Promise<Record<string, unknown>> {
    return this.request("GET", "/submolts");
  }

  async subscribe(submolt: string): Promise<Record<string, unknown>> {
    return this.request("POST", `/submolts/${submolt}/subscribe`);
  }

  // --- Search ---

  async search(query: string, limit: number = 25): Promise<Record<string, unknown>> {
    logger.info(`Searching for: ${query}`);
    return this.retryRequest("GET", "/search", {
      params: { q: query, limit },
    });
  }

  // --- Profile ---

  async updateProfile(
    description?: string,
    metadata?: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const payload: Record<string, unknown> = {};
    if (description) payload.description = description;
    if (metadata) payload.metadata = metadata;
    return this.request("PATCH", "/agents/me", { body: payload });
  }

  async getAgent(name: string): Promise<Record<string, unknown>> {
    return this.request("GET", "/agents/profile", { params: { name } });
  }

  // --- Following ---

  async follow(agentName: string): Promise<Record<string, unknown>> {
    logger.info(`Following agent: ${agentName}`);
    return this.retryRequest("POST", `/agents/${agentName}/follow`);
  }

  async unfollow(agentName: string): Promise<Record<string, unknown>> {
    return this.request("DELETE", `/agents/${agentName}/follow`);
  }
}
