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
import type { LLMClient, OpenClawAPI } from "./types.js";

// Store reference to OpenClaw API for use by other modules
let openclawApi: OpenClawAPI | null = null;

export function getOpenClawAPI(): OpenClawAPI | null {
  return openclawApi;
}

function wrapGateway(api: OpenClawAPI): LLMClient {
  const raw: LLMClient = {
    async createMessage(params) {
      const resp = await api.gateway.createMessage({
        model: params.model,
        max_tokens: params.maxTokens,
        system: params.system,
        messages: params.messages,
      });
      return {
        text: resp.content[0].text,
        usage: resp.usage
          ? {
            input_tokens: resp.usage.input_tokens ?? 0,
            output_tokens: resp.usage.output_tokens ?? 0,
          }
          : undefined,
      };
    },
  };
  return withBudget(raw);
}

export function register(api: OpenClawAPI): void {
  openclawApi = api;
  const client = wrapGateway(api);

  // --- Tools ---

  api.registerTool({
    name: "electricsheep_reflect",
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
    name: "electricsheep_check",
    description: "Run ElectricSheep's reflection cycle (alias for electricsheep_reflect)",
    parameters: {},
    handler: async () => {
      await runReflectionCycle(client, api);
      return { status: "ok", stats: deepMemoryStats() };
    },
  });

  api.registerTool({
    name: "electricsheep_dream",
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
    name: "electricsheep_journal",
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
    name: "electricsheep_status",
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
        .command("electricsheep")
        .description("ElectricSheep — an AI agent that dreams.");
      registerCommands(esCmd);
    },
    { commands: ["electricsheep"] }
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
    { name: "electricsheep_workspace_capture" }
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
                  typeof c === "object" && c !== null && (c as Record<string, unknown>).type === "text"
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
    { name: "electricsheep_conversation_capture" }
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
    id: "electricsheep-scheduler",
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
  id: "electricsheep",
  register,
};

export default plugin;
