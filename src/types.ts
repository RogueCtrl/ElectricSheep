/**
 * Shared TypeScript interfaces for ElectricSheep.
 */

export interface WorkingMemoryEntry {
  timestamp: string;
  category: string;
  summary: string;
  metadata?: Record<string, unknown>;
}

export interface DeepMemoryRow {
  id: number;
  timestamp: string;
  category: string;
  encrypted_blob: Buffer;
  content_hash: string;
  dreamed: number;
  dream_date: string | null;
}

export interface DecryptedMemory {
  id: number;
  timestamp: string;
  category: string;
  content: Record<string, unknown>;
}

export interface DeepMemoryStats {
  total_memories: number;
  undreamed: number;
  dreamed: number;
  categories: Record<string, number>;
}

export interface Dream {
  /** The full markdown blob from the LLM — stored and posted as-is. */
  markdown: string;
}

export interface AgentAction {
  action: "comment" | "upvote" | "post" | "pass";
  post_index?: number;
  content?: string;
  title?: string;
  submolt?: string;
}

export interface AgentState {
  last_check?: string;
  checks_today?: number;
  last_dream?: string;
  total_dreams?: number;
  latest_dream_title?: string;
  [key: string]: unknown;
}

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
}

export interface LLMResponse {
  text: string;
  usage?: TokenUsage;
}

export interface LLMClient {
  createMessage(params: {
    model: string;
    maxTokens: number;
    system: string;
    messages: Array<{ role: string; content: string }>;
  }): Promise<LLMResponse>;
}

export interface MoltbookCredentials {
  api_key: string;
  agent_name: string;
  claim_url: string;
  verification_code: string;
}

export interface MoltbookPost {
  id: string;
  title: string;
  content: string;
  author: string;
  submolt: string;
  score: number;
  comment_count: number;
  [key: string]: unknown;
}

// ─── OpenClaw Extended API ──────────────────────────────────────────────────

export interface MemorySearchResult {
  content: string;
  metadata?: Record<string, unknown>;
  score?: number;
}

export interface OpenClawMemoryAPI {
  store(content: string, metadata?: Record<string, unknown>): Promise<void>;
  search(query: string, limit?: number): Promise<MemorySearchResult[]>;
}

export interface OpenClawChannelsAPI {
  send(channel: string, message: string): Promise<void>;
  getConfigured(): Promise<string[]>;
}

export interface OpenClawWebSearchAPI {
  search(query: string, limit?: number): Promise<WebSearchResult[]>;
}

export interface OpenClawAPI {
  registerTool(def: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
    handler: (params: Record<string, unknown>) => Promise<unknown>;
  }): void;
  registerCli(program: unknown): void;
  registerHook(
    event: string,
    handler: (ctx: Record<string, unknown>) => Promise<unknown>
  ): void;
  registerCron(def: {
    name: string;
    schedule: string;
    handler: () => Promise<void>;
  }): void;
  gateway: {
    createMessage(params: {
      model: string;
      max_tokens: number;
      system: string;
      messages: Array<{ role: string; content: string }>;
    }): Promise<{
      content: Array<{ text: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    }>;
  };
  memory?: OpenClawMemoryAPI;
  channels?: OpenClawChannelsAPI;
  webSearch?: OpenClawWebSearchAPI;
}

// ─── Web Search ─────────────────────────────────────────────────────────────

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

// ─── Topic Extraction & Synthesis ───────────────────────────────────────────

export interface ExtractedTopics {
  topics: string[];
  sourceMemories: WorkingMemoryEntry[];
}

export interface SynthesisContext {
  operatorContext: string;
  moltbookContext?: string;
  webContext?: string;
  topics: string[];
}

// ─── Plugin Config ──────────────────────────────────────────────────────────

export interface ElectricSheepConfig {
  agentName: string;
  agentModel: string;
  dataDir: string;
  dreamEncryptionKey: string;
  postFilterEnabled: boolean;
  moltbookEnabled: boolean;
  webSearchEnabled: boolean;
  notificationChannel: string;
  notifyOperatorOnDream: boolean;
}
