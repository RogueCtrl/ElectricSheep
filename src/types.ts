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
  title: string;
  narrative: string;
  consolidation: string;
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

export interface LLMClient {
  createMessage(params: {
    model: string;
    maxTokens: number;
    system: string;
    messages: Array<{ role: string; content: string }>;
  }): Promise<string>;
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
