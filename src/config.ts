/**
 * Configuration management.
 */

import { config } from "dotenv";
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

config({ quiet: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths
export const getBaseDir = () =>
  resolve(process.env.OPENCLAWDREAMS_DATA_DIR || resolve(__dirname, "..", ".."));
export const getDataDir = () => resolve(getBaseDir(), "data");
export const getMemoryDir = () => resolve(getDataDir(), "memory");
export const getDreamsDir = () => resolve(getDataDir(), "dreams");
export const getNightmaresDir = () => resolve(getDataDir(), "nightmares");

// Memory
export const getDeepMemoryDb = () => resolve(getMemoryDir(), "deep.db");
export const getStateFile = () => resolve(getMemoryDir(), "state.json");
export const getSchedulerStateFile = () => resolve(getDataDir(), "scheduler-state.json");

// Export constants for backward compatibility and internal use
// These will be evaluated at module load time, but getters are preferred for tests.
export const BASE_DIR = getBaseDir();
export const DATA_DIR = getDataDir();
export const MEMORY_DIR = getMemoryDir();
export const DREAMS_DIR = getDreamsDir();
export const NIGHTMARES_DIR = getNightmaresDir();
export const DEEP_MEMORY_DB = getDeepMemoryDb();
export const STATE_FILE = getStateFile();
export const SCHEDULER_STATE_FILE = getSchedulerStateFile();

/** Stable fallback path for credentials when DATA_DIR is unset/volatile. */
export const getStableConfigDir = () => resolve(homedir(), ".config", "openclawdreams");
export const getStableCredentialsFile = () =>
  resolve(getStableConfigDir(), "credentials.json");

/** Primary credentials file path. Resolves to STABLE_CREDENTIALS_FILE if DATA_DIR is default/unset. */
export const getCredentialsFile = () =>
  process.env.OPENCLAWDREAMS_DATA_DIR
    ? resolve(getDataDir(), "credentials.json")
    : getStableCredentialsFile();

export const STABLE_CONFIG_DIR = getStableConfigDir();
export const STABLE_CREDENTIALS_FILE = getStableCredentialsFile();
export const CREDENTIALS_FILE = getCredentialsFile();

// Ensure directories exist
export function ensureDirectoriesExist(): void {
  for (const dir of [getDataDir(), getMemoryDir(), getDreamsDir(), getNightmaresDir()]) {
    mkdirSync(dir, { recursive: true });
  }
}

// Call immediately to ensure directories exist before any code tries to write files
ensureDirectoriesExist();

// Agent
export const AGENT_NAME = process.env.AGENT_NAME ?? "ElectricSheep";
export const AGENT_MODEL = process.env.AGENT_MODEL ?? "claude-sonnet-4-5-20250929";

// Moltbook
export const MOLTBOOK_BASE_URL = "https://www.moltbook.com/api/v1";

// ─── Runtime-overridable config ──────────────────────────────────────────────
// These values are seeded from env vars at startup, but can be overridden at
// runtime by `applyPluginConfig()` so that OpenClaw plugin config (set via
// `openclaw config set plugins.entries.openclawdreams.config.*`) takes effect
// without requiring separate env vars.

let _moltbookEnabled = (process.env.MOLTBOOK_ENABLED ?? "false").toLowerCase() === "true";
let _webSearchEnabled =
  (process.env.WEB_SEARCH_ENABLED ?? "true").toLowerCase() !== "false";
let _notificationChannel = process.env.NOTIFICATION_CHANNEL ?? "";
let _notifyOperatorOnDream =
  (process.env.NOTIFY_OPERATOR_ON_DREAM ?? "true").toLowerCase() !== "false";
let _postFilterEnabled =
  (process.env.POST_FILTER_ENABLED ?? "true").toLowerCase() !== "false";
let _requireApprovalBeforePost =
  (process.env.REQUIRE_APPROVAL_BEFORE_POST ?? "true").toLowerCase() !== "false";
let _dreamSubmolt = process.env.DREAM_SUBMOLT ?? "dreams";
let _workspaceDiffEnabled =
  (process.env.WORKSPACE_DIFF_ENABLED ?? "true").toLowerCase() !== "false";
let _metaLoopThreshold = parseInt(process.env.META_LOOP_THRESHOLD ?? "3", 10);

/** Apply config values passed from the OpenClaw plugin API (`api.pluginConfig`). */
export function applyPluginConfig(cfg: Record<string, unknown>): void {
  if (typeof cfg.moltbookEnabled === "boolean") {
    _moltbookEnabled = cfg.moltbookEnabled;
  }
  if (typeof cfg.webSearchEnabled === "boolean") _webSearchEnabled = cfg.webSearchEnabled;
  if (typeof cfg.notificationChannel === "string")
    _notificationChannel = cfg.notificationChannel;
  if (typeof cfg.notifyOperatorOnDream === "boolean")
    _notifyOperatorOnDream = cfg.notifyOperatorOnDream;
  if (typeof cfg.postFilterEnabled === "boolean")
    _postFilterEnabled = cfg.postFilterEnabled;
  if (typeof cfg.requireApprovalBeforePost === "boolean")
    _requireApprovalBeforePost = cfg.requireApprovalBeforePost;
  if (typeof cfg.dreamSubmolt === "string") _dreamSubmolt = cfg.dreamSubmolt;
  if (typeof cfg.workspaceDiffEnabled === "boolean")
    _workspaceDiffEnabled = cfg.workspaceDiffEnabled;
  if (typeof cfg.metaLoopThreshold === "number")
    _metaLoopThreshold = cfg.metaLoopThreshold;
}

export const getMoltbookEnabled = (): boolean => _moltbookEnabled;
export const getWebSearchEnabled = (): boolean => _webSearchEnabled;
export const getNotificationChannel = (): string => _notificationChannel;
export const getNotifyOperatorOnDream = (): boolean => _notifyOperatorOnDream;
export const getPostFilterEnabled = (): boolean => _postFilterEnabled;
export const getRequireApprovalBeforePost = (): boolean => _requireApprovalBeforePost;
export const getDreamSubmolt = (): string => _dreamSubmolt;
export const getWorkspaceDiffEnabled = (): boolean => _workspaceDiffEnabled;
export const getMetaLoopThreshold = (): number => _metaLoopThreshold;

// Legacy constant aliases — kept for backward compatibility but now delegate to
// getters so they remain in sync after `applyPluginConfig()` is called.
/** @deprecated Use getMoltbookEnabled() */
export const MOLTBOOK_ENABLED = false; // overridden by getter; prefer getMoltbookEnabled()

// Web Search
/** @deprecated Use getWebSearchEnabled() */
export const WEB_SEARCH_ENABLED = true; // overridden by getter; prefer getWebSearchEnabled()

// Operator Notifications
/** @deprecated Use getNotificationChannel() */
export const NOTIFICATION_CHANNEL = ""; // overridden by getter; prefer getNotificationChannel()
/** @deprecated Use getNotifyOperatorOnDream() */
export const NOTIFY_OPERATOR_ON_DREAM = true; // overridden by getter; prefer getNotifyOperatorOnDream()

// Token budget - $20/day using Opus 4.5 output rate ($25/1M) ≈ 800,000 tokens

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

// ─── Deep Memory Context ─────────────────────────────────────────────────────
// Approximate token budget for deep memory context injected into prompts.
// Multiplied by 4 to estimate character count (1 token ≈ 4 chars).
export const DEEP_MEMORY_CONTEXT_TOKENS = 2000;

// ─── Dream Reflection ───────────────────────────────────────────────────────
export const MAX_TOKENS_REFLECTION = 1500;

// ─── Topic Extraction & Synthesis ───────────────────────────────────────────
export const MAX_TOKENS_TOPIC_EXTRACTION = 500;
export const MAX_TOKENS_SYNTHESIS = 2000;
export const MAX_TOPICS_PER_CYCLE = 5;
export const MAX_WEB_RESULTS_PER_TOPIC = 3;
export const MAX_MOLTBOOK_RESULTS_PER_TOPIC = 5;

// ─── Post Filter ────────────────────────────────────────────────────────────
// Set POST_FILTER_ENABLED=false to disable the Moltbook post filter.
/** @deprecated Use getPostFilterEnabled() */
export const POST_FILTER_ENABLED = true; // overridden by getter; prefer getPostFilterEnabled()

// ─── Dream File Naming ───────────────────────────────────────────────────────
export const DREAM_TITLE_MAX_LENGTH = 40;
