/**
 * OpenClaw extension entry point.
 *
 * Registers tools, CLI subcommands, hooks, and cron jobs.
 */

import { program } from "./cli.js";
import { checkAndEngage } from "./waking.js";
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
import type { LLMClient } from "./types.js";

interface OpenClawAPI {
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
  const client = wrapGateway(api);

  // --- Tools ---

  api.registerTool({
    name: "electricsheep_check",
    description:
      "Run ElectricSheep's daytime check: fetch Moltbook feed, decide engagements, store memories",
    parameters: {},
    handler: async () => {
      await checkAndEngage(client);
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
    description: "Post the latest dream journal to Moltbook",
    parameters: {},
    handler: async () => {
      await postDreamJournal();
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
    name: "electricsheep_daytime_check",
    schedule: "0 8,12,16,20 * * *",
    handler: async () => {
      await checkAndEngage(client);
    },
  });

  api.registerCron({
    name: "electricsheep_dream_cycle",
    schedule: "0 2 * * *",
    handler: async () => {
      await runDreamCycle(client);
    },
  });

  api.registerCron({
    name: "electricsheep_morning_journal",
    schedule: "0 7 * * *",
    handler: async () => {
      await postDreamJournal();
    },
  });
}
