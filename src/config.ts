/**
 * Configuration management.
 */

import { config } from "dotenv";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

config({ quiet: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths
export const BASE_DIR = resolve(
  process.env.ELECTRICSHEEP_DATA_DIR || resolve(__dirname, "..", "..")
);
export const DATA_DIR = resolve(BASE_DIR, "data");
export const MEMORY_DIR = resolve(DATA_DIR, "memory");
export const DREAMS_DIR = resolve(DATA_DIR, "dreams");
export const CREDENTIALS_FILE = resolve(DATA_DIR, "credentials.json");

// Ensure directories exist
for (const dir of [DATA_DIR, MEMORY_DIR, DREAMS_DIR]) {
  mkdirSync(dir, { recursive: true });
}

// Agent
export const AGENT_NAME = process.env.AGENT_NAME ?? "ElectricSheep";
export const AGENT_MODEL = process.env.AGENT_MODEL ?? "claude-sonnet-4-5-20250929";

// Moltbook
export const MOLTBOOK_BASE_URL = "https://www.moltbook.com/api/v1";

// Memory
export const WORKING_MEMORY_MAX_ENTRIES = 50;
export const DEEP_MEMORY_DB = resolve(MEMORY_DIR, "deep.db");
export const WORKING_MEMORY_FILE = resolve(MEMORY_DIR, "working.json");
export const STATE_FILE = resolve(MEMORY_DIR, "state.json");

// Token budget — $20/day using Opus 4.5 output rate ($25/1M) ≈ 800,000 tokens
// Input tokens are $5/1M but we count all tokens against the output rate for simplicity.
// Set to 0 to disable the daily budget limit.
export const MAX_DAILY_TOKENS = parseInt(process.env.MAX_DAILY_TOKENS ?? "800000", 10);

// Workspace (for SOUL.md / IDENTITY.md discovery)
export const WORKSPACE_DIR = process.env.OPENCLAW_WORKSPACE_DIR ?? "";

// Dream
export const DREAM_ENCRYPTION_KEY = process.env.DREAM_ENCRYPTION_KEY ?? "";

// ─── LLM Call Limits ─────────────────────────────────────────────────────────
// Max tokens for various LLM call types.
export const MAX_TOKENS_SUMMARY = 150;
export const MAX_TOKENS_DECISION = 1000;
export const MAX_TOKENS_DREAM = 2000;
export const MAX_TOKENS_CONSOLIDATION = 150;

// ─── Feed Limits ─────────────────────────────────────────────────────────────
export const FEED_LIMIT = 10; // max posts shown to agent for engagement decisions
export const FEED_FETCH_LIMIT = 25; // default API fetch limit
export const CONTENT_PREVIEW_LENGTH = 200; // chars of post content shown in summaries

// ─── Working Memory Context ──────────────────────────────────────────────────
// Approximate token budget for working memory context injected into prompts.
// Multiplied by 4 to estimate character count (1 token ≈ 4 chars).
export const WORKING_MEMORY_CONTEXT_TOKENS = 2000;

// ─── Dream Reflection ───────────────────────────────────────────────────────
export const MAX_TOKENS_REFLECTION = 1500;

// ─── Post Filter ────────────────────────────────────────────────────────────
// Set POST_FILTER_ENABLED=false to disable the Moltbook post filter.
export const POST_FILTER_ENABLED =
  (process.env.POST_FILTER_ENABLED ?? "true").toLowerCase() !== "false";

// ─── Dream File Naming ───────────────────────────────────────────────────────
export const DREAM_TITLE_MAX_LENGTH = 40;
