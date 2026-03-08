/**
 * Shared TypeScript interfaces for ElectricSheep.
 */

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
  content: Record<string, unknown> & {
    /** Optional git diff --stat summary of files changed during a session. */
    file_diffs?: string;
  };
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

export interface SchedulerState {
  /** Map of hour (0-23) to ISO date string (YYYY-MM-DD) of the last successful run. */
  last_ran: Record<number, string>;
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
  registerCli(
    callback: (ctx: { program: import("commander").Command }) => void,
    opts?: { commands?: string[] }
  ): void;
  registerHook(
    event: string | string[],
    handler: (ctx: Record<string, unknown>) => Promise<unknown>,
    opts?: { name: string }
  ): void;
  registerService(def: { id: string; start: () => void; stop: () => void }): void;
  registerGatewayMethod(
    method: string,
    handler: (ctx: {
      params: unknown;
      respond: (ok: boolean, result: unknown, error: unknown) => void;
    }) => Promise<void> | void
  ): void;
  logger?: {
    info?: (msg: string) => void;
    warn?: (msg: string) => void;
    error?: (msg: string) => void;
  };
  runtime: {
    subagent: {
      run(params: {
        sessionKey: string;
        message: string;
        extraSystemPrompt?: string;
        lane?: string;
      }): Promise<{ runId: string }>;
      waitForRun(params: {
        runId: string;
        timeoutMs?: number;
      }): Promise<{ status: string; error?: string }>;
      getSessionMessages(params: {
        sessionKey: string;
        limit?: number;
      }): Promise<{ messages: Array<Record<string, unknown>> }>;
    };
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
  sourceMemories: DecryptedMemory[];
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
  requireApprovalBeforePost: boolean;
  dreamSubmolt: string;
}
