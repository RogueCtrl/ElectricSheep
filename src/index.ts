/**
 * OpenClaw extension entry point.
 *
 * Registers tools, CLI subcommands, hooks, and cron jobs.
 */

import { registerCommands } from "./cli.js";
import { runReflectionCycle } from "./waking.js";
import {
  runDreamCycle,
  postDreamJournal,
  loadLatestDream,
  deriveSlug,
} from "./dreamer.js";
import { deepMemoryStats, remember } from "./memory.js";
import { loadState } from "./state.js";
import { withBudget } from "./budget.js";
import { setWorkspaceDir } from "./identity.js";
import {
  getMoltbookEnabled,
  applyPluginConfig,
  getRequireApprovalBeforePost,
  getSchedulerStateFile,
  ensureDirectoriesExist,
} from "./config.js";
import logger from "./logger.js";
import type { LLMClient, OpenClawAPI, SchedulerState } from "./types.js";
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomUUID } from "node:crypto";

// Ensure directories exist on startup
ensureDirectoriesExist();

// Store reference to OpenClaw API for use by other modules
let openclawApi: OpenClawAPI | null = null;

export function getOpenClawAPI(): OpenClawAPI | null {
  return openclawApi;
}

/**
 * Persist scheduler state to survive restarts.
 */
function loadSchedulerState(): SchedulerState {
  const file = getSchedulerStateFile();
  if (existsSync(file)) {
    try {
      return JSON.parse(readFileSync(file, "utf-8"));
    } catch {
      return { last_ran: {} };
    }
  }
  return { last_ran: {} };
}

function saveSchedulerState(state: SchedulerState): void {
  try {
    writeFileSync(getSchedulerStateFile(), JSON.stringify(state, null, 2));
  } catch (err) {
    logger.error(`[ElectricSheep] Failed to save scheduler state: ${err}`);
  }
}

/**
 * Resolve an Anthropic API key from OpenClaw auth profiles or environment.
 * Returns undefined if no key can be found.
 */
async function resolveAnthropicApiKey(): Promise<string | undefined> {
  const { readFileSync } = await import("node:fs");
  const { join } = await import("node:path");
  const { homedir } = await import("node:os");

  const candidates = [
    join(homedir(), ".openclaw", "agents", "main", "agent", "auth-profiles.json"),
    join(homedir(), ".openclaw", "agents", "default", "auth-profiles.json"),
    join(homedir(), ".openclaw", "auth-profiles.json"),
  ];

  for (const p of candidates) {
    try {
      const raw = JSON.parse(readFileSync(p, "utf-8"));
      const profiles = (raw.profiles || {}) as Record<string, Record<string, unknown>>;
      for (const profile of Object.values(profiles)) {
        if (profile.provider === "anthropic") {
          const key =
            String(profile.key || profile.token || profile.apiKey || "") || undefined;
          if (key) return key;
        }
      }
    } catch {
      /* try next candidate */
    }
  }

  return process.env.ANTHROPIC_API_KEY || undefined;
}

/**
 * Direct Anthropic API call — used as fallback when the subagent runtime is
 * unavailable (e.g. background scheduler context).
 */
async function directAnthropicCall(
  apiKey: string,
  params: {
    model: string;
    maxTokens: number;
    system: string;
    messages: Array<{ role: string; content: string }>;
  }
): Promise<{ text: string; usage?: { input_tokens: number; output_tokens: number } }> {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: params.model,
      max_tokens: params.maxTokens,
      system: params.system,
      messages: params.messages,
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Anthropic API error ${resp.status}: ${body}`);
  }

  const data = (await resp.json()) as Record<string, unknown>;
  const contentArr = data.content as Array<{ text?: string }> | undefined;
  const text = contentArr?.[0]?.text ?? contentArr?.map((c) => c.text).join("") ?? "";

  return {
    text,
    usage: data.usage
      ? {
          input_tokens: (data.usage as Record<string, number>).input_tokens ?? 0,
          output_tokens: (data.usage as Record<string, number>).output_tokens ?? 0,
        }
      : undefined,
  };
}

function wrapSubagent(api: OpenClawAPI): LLMClient {
  // Lazily resolved API key for the direct fallback path
  let cachedApiKey: string | null = null; // null = not yet resolved, "" = not found

  const raw: LLMClient = {
    async createMessage(params) {
      // ── Primary path: subagent runtime (available in request / hook context) ──
      if (api.runtime?.subagent?.run) {
        const combined = params.messages
          .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
          .join("\\n\\n");

        const result = await api.runtime.subagent.run({
          idempotencyKey: randomUUID(),
          sessionKey: "openclawdreams_synthesis",
          lane: "background",
          extraSystemPrompt: params.system,
          message: combined,
        });

        const waitRes = await api.runtime.subagent.waitForRun({
          runId: result.runId,
          timeoutMs: 120000,
        });

        if (waitRes.status !== "ok") {
          throw new Error(`Subagent run failed: ${waitRes.error}`);
        }

        const session = await api.runtime.subagent.getSessionMessages({
          sessionKey: "openclawdreams_synthesis",
          limit: 1,
        });

        const last = session.messages[0] as Record<string, unknown> | undefined;
        if (!last || last.role !== "assistant") {
          return {
            text: "Synthesis completed, but no direct reply was captured.",
            usage: { input_tokens: 0, output_tokens: 0 },
          };
        }

        let text: string;
        if (typeof last.content === "string") {
          text = last.content;
        } else if (Array.isArray(last.content)) {
          const textBlock = (last.content as Record<string, unknown>[]).find(
            (b) => b.type === "text" || b.type === "thinking"
          );
          text = textBlock
            ? String(textBlock.text || textBlock.thinking || "")
            : JSON.stringify(last.content);
        } else {
          text = JSON.stringify(last.content);
        }

        const usage = (last.usage || {}) as Record<string, number>;
        return {
          text,
          usage: {
            input_tokens: usage.input ?? 0,
            output_tokens: usage.output ?? 0,
          },
        };
      }

      // ── Fallback path: direct Anthropic API (background scheduler context) ──
      logger.debug(
        "api.runtime.subagent unavailable — using direct Anthropic API fallback"
      );

      if (cachedApiKey === null) {
        cachedApiKey = (await resolveAnthropicApiKey()) ?? "";
      }

      if (!cachedApiKey) {
        throw new Error(
          "api.runtime.subagent is not available and no Anthropic API key could be resolved. " +
            "Set ANTHROPIC_API_KEY or configure an Anthropic auth profile in OpenClaw."
        );
      }

      const { AGENT_MODEL } = await import("./config.js");
      return directAnthropicCall(cachedApiKey, {
        model: params.model ?? AGENT_MODEL,
        maxTokens: params.maxTokens,
        system: params.system,
        messages: params.messages,
      });
    },
  };
  return withBudget(raw);
}

export function register(api: OpenClawAPI): void {
  openclawApi = api;

  // Apply OpenClaw plugin config (e.g. moltbookEnabled, notificationChannel) so
  // values set via `openclaw config set plugins.entries.openclawdreams.config.*`
  // take effect at runtime — not just as env vars.
  const pluginCfg = (api as unknown as { pluginConfig?: Record<string, unknown> })
    .pluginConfig;
  if (pluginCfg) {
    applyPluginConfig(pluginCfg);
    logger.debug(`[ElectricSheep] Applied plugin config: ${JSON.stringify(pluginCfg)}`);
  }

  const client = wrapSubagent(api);

  // --- Gateway Methods (for CLI RPC) ---

  api.registerGatewayMethod("openclawdreams.reflect", async ({ respond }) => {
    try {
      await runReflectionCycle(client, api);
      respond(true, { message: "Reflection cycle completed." }, undefined);
    } catch (err) {
      respond(false, undefined, { code: 500, message: String(err) });
    }
  });

  api.registerGatewayMethod("openclawdreams.dream", async ({ respond }) => {
    try {
      const dream = await runDreamCycle(client, api);
      if (dream) {
        respond(true, { message: "Dream cycle completed.", dream }, undefined);
      } else {
        respond(
          true,
          { message: "No undreamed memories — nothing to dream." },
          undefined
        );
      }
    } catch (err) {
      respond(false, undefined, { code: 500, message: String(err) });
    }
  });

  api.registerGatewayMethod("openclawdreams.journal", async ({ respond }) => {
    try {
      if (!getMoltbookEnabled()) {
        respond(
          true,
          { message: "Moltbook is disabled — journal post skipped." },
          undefined
        );
        return;
      }
      await postDreamJournal(client);
      respond(true, { message: "Dream journal posted to Moltbook." }, undefined);
    } catch (err) {
      respond(false, undefined, { code: 500, message: String(err) });
    }
  });

  // --- Tools ---

  api.registerTool({
    name: "openclawdreams_reflect",
    description:
      "Run ElectricSheep's reflection cycle: analyze operator conversations, gather context from web/community, synthesize insights",
    parameters: {},
    handler: async () => {
      await runReflectionCycle(client, api);
      return { status: "ok", stats: deepMemoryStats() };
    },
  });

  // Legacy tool name for backwards compatibility
  api.registerTool({
    name: "openclawdreams_check",
    description:
      "Run ElectricSheep's reflection cycle (alias for openclawdreams_reflect)",
    parameters: {},
    handler: async () => {
      await runReflectionCycle(client, api);
      return { status: "ok", stats: deepMemoryStats() };
    },
  });

  api.registerTool({
    name: "openclawdreams_dream",
    description:
      "Run ElectricSheep's dream cycle: decrypt deep memories, generate dream narrative, consolidate insights",
    parameters: {},
    handler: async () => {
      const dream = await runDreamCycle(client);
      return dream
        ? { status: "ok", dream }
        : { status: "no_memories", message: "No undreamed memories" };
    },
  });

  api.registerTool({
    name: "openclawdreams_journal",
    description:
      "Post the latest dream journal to Moltbook (only available when moltbookEnabled is true)",
    parameters: {},
    handler: async () => {
      if (!getMoltbookEnabled()) {
        return {
          status: "skipped",
          message: "Moltbook integration is disabled",
        };
      }
      await postDreamJournal(client);
      return { status: "ok" };
    },
  });

  api.registerTool({
    name: "openclawdreams_status",
    description: "Get ElectricSheep agent status: memory stats and state",
    parameters: {},
    handler: async () => {
      return {
        state: loadState(),
        memory: deepMemoryStats(),
      };
    },
  });

  // --- CLI ---

  api.registerCli(
    ({ program }) => {
      const esCmd = program
        .command("openclawdreams")
        .description("ElectricSheep — an AI agent that dreams.");
      registerCommands(esCmd);
    },
    { commands: ["openclawdreams"] }
  );

  // --- Hooks ---

  api.registerHook(
    "before_agent_start",
    async (ctx) => {
      // Capture workspace dir for identity loading (SOUL.md, IDENTITY.md)
      if (ctx.workspaceDir && typeof ctx.workspaceDir === "string") {
        setWorkspaceDir(ctx.workspaceDir);
      }
      return ctx;
    },
    { name: "openclawdreams_workspace_capture" }
  );

  api.registerHook(
    "agent_end",
    async (event) => {
      const msgs = (event as Record<string, unknown>).messages;
      if (!Array.isArray(msgs) || msgs.length === 0) return event;

      const userMsgs = msgs.filter((m) => m.role === "user");
      if (userMsgs.length === 0) return event;

      try {
        const conversationText = msgs
          .map((m) => {
            let text = "";
            if (typeof m.content === "string") text = m.content;
            else if (Array.isArray(m.content)) {
              const contentObj = m.content.find(
                (c: unknown) =>
                  typeof c === "object" &&
                  c !== null &&
                  (c as Record<string, unknown>).type === "text"
              ) as Record<string, unknown> | undefined;
              text = typeof contentObj?.text === "string" ? contentObj.text : "";
            }
            return `${m.role.toUpperCase()}: ${text}`;
          })
          .join("\\n\\n");

        api.logger?.info?.(
          `[ElectricSheep] Synthesizing summary for conversation ending...`
        );
        const { AGENT_MODEL } = await import("./config.js");

        const response = await client.createMessage({
          model: AGENT_MODEL,
          maxTokens: 500,
          system:
            "You are an AI assistant. Summarize the following conversation in 2-3 concise sentences. Focus on the main topics discussed, tasks completed, and any conclusions made by the user or assistant.",
          messages: [{ role: "user", content: conversationText }],
        });

        if (response.usage) {
          const { recordUsage } = await import("./budget.js");
          recordUsage(response.usage);
        }

        const summary = response.text.trim();
        if (summary) {
          api.logger?.info?.(
            `[ElectricSheep] Captured summary: ${summary.slice(0, 50)}...`
          );
          const { parseDiffStat } = await import("./memory.js");
          const memoryEntry: import("./types.js").MemoryEntry = {
            text_summary: summary,
            timestamp: Date.now(),
          };

          // Capture workspace file changes if git is available and enabled
          const { getWorkspaceDiffEnabled } = await import("./config.js");
          const { getWorkspaceDir } = await import("./identity.js");
          const workspaceDir = getWorkspaceDir();
          const isSensitivePath =
            workspaceDir.includes("iCloud") ||
            workspaceDir.includes("Mobile Documents") ||
            workspaceDir.includes("Library/") ||
            workspaceDir.includes("Pictures") ||
            workspaceDir.includes("Photos");
          if (getWorkspaceDiffEnabled() && !isSensitivePath) {
            try {
              const { execSync } = await import("node:child_process");
              const diffStat = execSync("git diff --stat HEAD", {
                cwd: workspaceDir || undefined,
                encoding: "utf-8",
                timeout: 5000,
                stdio: ["pipe", "pipe", "pipe"],
              }).trim();
              if (diffStat) {
                memoryEntry.file_diffs = parseDiffStat(diffStat);
                api.logger?.info?.(
                  `[ElectricSheep] Captured file diffs: ${diffStat.split("\n").length} lines`
                );
              }
            } catch {
              // git unavailable or no changes — skip silently
            }
          } else if (isSensitivePath) {
            api.logger?.info?.(
              `[ElectricSheep] Skipping file diffs — workspace path is in a sensitive/iCloud location`
            );
          }

          remember(memoryEntry, "interaction");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        api.logger?.error?.(`[ElectricSheep] Error generating summary: ${msg}`);
      }
      return event;
    },
    { name: "openclawdreams_conversation_capture" }
  );

  // --- Background Service (replaces registerCron — not available in this API version) ---
  // Schedules: reflection @ 0,8,12,16,20h | dream @ 2h | journal @ 7h (local time)

  let _schedulerTimer: ReturnType<typeof setInterval> | null = null;

  const SCHEDULE: Record<number, () => Promise<void>> = {
    0: async () => {
      await runReflectionCycle(client, api);
    },
    2: async () => {
      await runDreamCycle(client, api);
    },
    7: async () => {
      if (getMoltbookEnabled()) {
        if (getRequireApprovalBeforePost()) {
          const dream = loadLatestDream();
          const title = dream ? deriveSlug(dream.markdown) : "Latest Dream";
          const msg = `Dream ready to post: ${title} — run 'openclawdreams post' to publish or 'openclawdreams post --dry-run' to preview`;
          try {
            execSync(`openclaw system event --text "${msg}" --mode now`, {
              stdio: "inherit",
            });
            logger.info(`[ElectricSheep] Posted system event: ${msg}`);
          } catch (err) {
            logger.error(`[ElectricSheep] Failed to post system event: ${err}`);
          }
        } else {
          await postDreamJournal(client);
        }
      }
    },
    8: async () => {
      await runReflectionCycle(client, api);

      // Weekly rhythm report — Monday mornings only
      if (new Date().getDay() === 1) {
        try {
          const { generateRhythmReport, formatReportNotification } =
            await import("./rhythm.js");
          const report = generateRhythmReport(undefined, 7);
          const message = formatReportNotification(report);
          api.runtime.system.enqueueSystemEvent(
            `📊 Weekly Cognitive Rhythm Report\n\n${message}`,
            { sessionKey: "openclawdreams" }
          );
          logger.info("[ElectricSheep] Weekly rhythm report enqueued as system event");
        } catch (err) {
          logger.warn(`[ElectricSheep] Failed to enqueue rhythm report: ${err}`);
        }
      }
    },
    12: async () => {
      await runReflectionCycle(client, api);
    },
    16: async () => {
      await runReflectionCycle(client, api);
    },
    20: async () => {
      await runReflectionCycle(client, api);
    },
  };

  api.registerService({
    id: "openclawdreams-scheduler",
    start: () => {
      const state = loadSchedulerState();
      _schedulerTimer = setInterval(() => {
        void (async () => {
          const now = new Date();
          // Use local date string (YYYY-MM-DD) for tracking "already ran today"
          const todayStr = now.toLocaleDateString("en-CA");

          for (const hourStr of Object.keys(SCHEDULE)) {
            const scheduledHour = parseInt(hourStr, 10);

            // Skip if already ran today for this hour
            if (state.last_ran[scheduledHour] === todayStr) {
              continue;
            }

            // Target time for today in local time
            const target = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate(),
              scheduledHour,
              0,
              0
            );

            const diffMs = now.getTime() - target.getTime();
            const ninetyMinutesMs = 90 * 60 * 1000;

            // Catch-up logic: run if target has passed AND it's within the window (90m)
            // This safely handles DST jumps (e.g. 1:59 -> 3:00) where the 2am hour is skipped.
            if (diffMs >= 0 && diffMs <= ninetyMinutesMs) {
              state.last_ran[scheduledHour] = todayStr;
              saveSchedulerState(state);

              try {
                const lateMins = Math.round(diffMs / 60000);
                logger.info(
                  `[ElectricSheep] Running job hour=${scheduledHour}${
                    lateMins > 1 ? ` (catch-up: ${lateMins}m late)` : ""
                  }`
                );
                await SCHEDULE[scheduledHour]();
              } catch (err) {
                api.logger?.warn?.(
                  `[ElectricSheep] scheduled job hour=${scheduledHour} failed: ${err}`
                );
              }
            }
          }
        })();
      }, 60_000); // poll every minute
    },
    stop: () => {
      if (_schedulerTimer !== null) {
        clearInterval(_schedulerTimer);
        _schedulerTimer = null;
      }
    },
  });
}

export const plugin = {
  id: "openclawdreams",
  register,
};

export default plugin;
