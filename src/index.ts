/**
 * OpenClaw extension entry point.
 *
 * Registers tools, CLI subcommands, hooks, and cron jobs.
 */

import { program } from "./cli.js";
import { runReflectionCycle } from "./waking.js";
import { runDreamCycle, postDreamJournal } from "./dreamer.js";
import {
  deepMemoryStats,
  getWorkingMemory,
  getWorkingMemoryContext,
  remember,
} from "./memory.js";
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
    description:
      "Get ElectricSheep agent status: memory stats, state, working memory count",
    parameters: {},
    handler: async () => {
      return {
        state: loadState(),
        memory: deepMemoryStats(),
        working_memory_count: getWorkingMemory().length,
      };
    },
  });

  api.registerTool({
    name: "electricsheep_memories",
    description: "Retrieve working memory entries",
    parameters: {
      limit: { type: "number", description: "Max entries to return" },
      category: { type: "string", description: "Filter by category" },
    },
    handler: async (params) => {
      return {
        memories: getWorkingMemory(
          params.limit as number | undefined,
          params.category as string | undefined
        ),
      };
    },
  });

  // --- CLI ---

  api.registerCli(program);

  // --- Hooks ---

  api.registerHook("before_agent_start", async (ctx) => {
    // Capture workspace dir for identity loading (SOUL.md, IDENTITY.md)
    if (ctx.workspaceDir && typeof ctx.workspaceDir === "string") {
      setWorkspaceDir(ctx.workspaceDir);
    }

    const memContext = getWorkingMemoryContext();
    const stats = deepMemoryStats();
    const injection =
      `\n\n[ElectricSheep Memory Context]\n` +
      `Working memory:\n${memContext}\n\n` +
      `Deep memory stats: ${JSON.stringify(stats)}`;
    ctx.systemPrompt = (ctx.systemPrompt as string) + injection;
    return ctx;
  });

  api.registerHook("agent_end", async (ctx) => {
    const summary = ctx.conversationSummary as string | undefined;
    if (summary) {
      remember(summary, { type: "agent_conversation", summary }, "interaction");
    }
    return ctx;
  });

  // --- Cron Jobs ---

  api.registerCron({
    name: "electricsheep_reflection_cycle",
    schedule: "0 8,12,16,20 * * *",
    handler: async () => {
      await runReflectionCycle(client, api);
    },
  });

  api.registerCron({
    name: "electricsheep_dream_cycle",
    schedule: "0 2 * * *",
    handler: async () => {
      await runDreamCycle(client, api);
    },
  });

  api.registerCron({
    name: "electricsheep_morning_journal",
    schedule: "0 7 * * *",
    handler: async () => {
      if (MOLTBOOK_ENABLED) {
        await postDreamJournal(client);
      }
    },
  });
}
