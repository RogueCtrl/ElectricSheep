/**
 * OpenClaw extension entry point.
 *
 * Registers tools, CLI subcommands, hooks, and cron jobs.
 */

import { registerCommands } from "./cli.js";
import { runReflectionCycle } from "./waking.js";
import { runDreamCycle, postDreamJournal } from "./dreamer.js";
import { deepMemoryStats, remember } from "./memory.js";
import { loadState } from "./state.js";
import { withBudget } from "./budget.js";
import { setWorkspaceDir } from "./identity.js";
import { MOLTBOOK_ENABLED } from "./config.js";
import logger from "./logger.js";
import type { LLMClient, OpenClawAPI } from "./types.js";

// Store reference to OpenClaw API for use by other modules
let openclawApi: OpenClawAPI | null = null;

export function getOpenClawAPI(): OpenClawAPI | null {
  return openclawApi;
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
      if (!MOLTBOOK_ENABLED) {
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
      if (!MOLTBOOK_ENABLED) {
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
          remember(summary, { type: "agent_conversation", summary }, "interaction");
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
  // Schedules: reflection @ 8,12,16,20h | dream @ 2h | journal @ 7h (local time)

  let _schedulerTimer: ReturnType<typeof setInterval> | null = null;
  let _lastRanHour = -1;

  const SCHEDULE: Record<number, () => Promise<void>> = {
    2: async () => {
      await runDreamCycle(client, api);
    },
    7: async () => {
      if (MOLTBOOK_ENABLED) {
        await postDreamJournal(client);
      }
    },
    8: async () => {
      await runReflectionCycle(client, api);
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
      _lastRanHour = -1;
      _schedulerTimer = setInterval(() => {
        void (async () => {
          const hour = new Date().getHours();
          if (hour !== _lastRanHour && SCHEDULE[hour]) {
            _lastRanHour = hour;
            try {
              await SCHEDULE[hour]();
            } catch (err) {
              api.logger?.warn?.(
                `[ElectricSheep] scheduled job hour=${hour} failed: ${err}`
              );
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
