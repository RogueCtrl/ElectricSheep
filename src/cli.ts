/**
 * ElectricSheep CLI.
 *
 * Provides utility commands for inspecting agent state.
 * Core agent behavior (check, dream, journal) runs via OpenClaw.
 *
 * Usage:
 *   openclawdreams register --name "Name" --description "Bio"
 *   openclawdreams status       # show agent status and memory stats
 *   openclawdreams dreams       # list saved dream journals
 */

import { Command } from "commander";
import chalk from "chalk";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { setVerbose } from "./logger.js";
import { DREAMS_DIR } from "./config.js";
import type { AgentState, DeepMemoryStats, OpenClawAPI } from "./types.js";

/**
 * Register all ElectricSheep subcommands onto a parent Command.
 * Used both by the standalone bin and by api.registerCli().
 */
export function registerCommands(parent: Command): void {
  parent
    .option("-v, --verbose", "Enable verbose logging")
    .hook("preAction", (thisCommand) => {
      const opts = thisCommand.opts();
      if (opts.verbose) setVerbose(true);
    });

  parent
    .command("register")
    .description("Register a new agent on Moltbook")
    .requiredOption("--name <name>", "Agent name on Moltbook")
    .requiredOption("--description <desc>", "Agent description")
    .action(async (opts: { name: string; description: string }) => {
      const { MoltbookClient } = await import("./moltbook.js");
      const client = new MoltbookClient();
      const result = await client.register(opts.name, opts.description);

      const agent = (result.agent ?? result) as Record<string, string>;
      console.log(chalk.green.bold("\nRegistered!\n"));
      console.log(`${chalk.bold("API Key:")} ${agent.api_key ?? "?"}`);
      console.log(`${chalk.bold("Claim URL:")} ${agent.claim_url ?? "?"}`);
      console.log(`${chalk.bold("Verification:")} ${agent.verification_code ?? "?"}`);
      console.log(
        chalk.yellow("\nYour API key has been saved to credentials.json automatically")
      );
      console.log(chalk.yellow("Visit the claim URL and post the verification tweet"));
    });

  parent
    .command("status")
    .description("Show agent status, memory stats, and recent state")
    .action(async () => {
      const { deepMemoryStats } = await import("./memory.js");
      const { loadState } = await import("./state.js");
      const { MoltbookClient } = await import("./moltbook.js");
      const { getBudgetStatus } = await import("./budget.js");

      const state: AgentState = loadState();
      const memStats: DeepMemoryStats = deepMemoryStats();
      const budget = getBudgetStatus();

      console.log(chalk.cyan.bold("\nElectricSheep Status\n"));

      // Token budget
      if (budget.enabled) {
        const pct = Math.round((budget.used / budget.limit) * 100);
        const color = pct >= 90 ? chalk.red : pct >= 70 ? chalk.yellow : chalk.green;
        console.log(chalk.bold("Token Budget:"));
        console.log(
          `  ${color(`${budget.used.toLocaleString()} / ${budget.limit.toLocaleString()} tokens (${pct}%)`)}` +
            `  ${chalk.dim(`remaining: ${budget.remaining.toLocaleString()}`)}`
        );
        console.log(`  ${chalk.dim(`date: ${budget.date} UTC`)}`);
      } else {
        console.log(chalk.bold("Token Budget:") + chalk.dim(" disabled"));
      }

      // State
      console.log(`\n${chalk.bold("Agent State:")}`);
      for (const [k, v] of Object.entries(state)) {
        if (k.startsWith("budget_")) continue;
        console.log(`  ${chalk.bold(k)}: ${String(v)}`);
      }

      // Memory stats
      console.log(
        `${chalk.bold("Deep Memory:")} ${memStats.total_memories} total, ${memStats.undreamed} undreamed`
      );
      if (Object.keys(memStats.categories).length > 0) {
        console.log(
          `${chalk.bold("Categories:")} ${JSON.stringify(memStats.categories)}`
        );
      }

      // Moltbook status
      try {
        const client = new MoltbookClient();
        const moltbookStatus = await client.status();
        console.log(
          `\n${chalk.bold("Moltbook:")} ${(moltbookStatus as Record<string, unknown>).status ?? "?"}`
        );
        const profile = await client.me();
        const agent = (profile.agent ?? profile) as Record<string, unknown>;
        console.log(`${chalk.bold("Karma:")} ${agent.karma ?? 0}`);
      } catch {
        console.log(chalk.yellow("\nMoltbook: not connected"));
      }
    });

  parent
    .command("dreams")
    .description("List saved dream journals")
    .action(() => {
      let dreamFiles: string[];
      try {
        dreamFiles = readdirSync(DREAMS_DIR)
          .filter((f) => f.endsWith(".md"))
          .sort()
          .reverse();
      } catch {
        dreamFiles = [];
      }

      if (dreamFiles.length === 0) {
        console.log(
          chalk.dim(
            "No dreams yet. The dream cycle runs automatically via OpenClaw cron."
          )
        );
        return;
      }

      console.log(chalk.magenta.bold(`\nDream Archive (${dreamFiles.length} dreams)\n`));

      for (const f of dreamFiles.slice(0, 20)) {
        const content = readFileSync(resolve(DREAMS_DIR, f), "utf-8");
        const firstLine = content.split("\n")[0].replace(/^#\s*/, "");
        const stem = f.replace(/\.md$/, "").slice(0, 10);
        console.log(`  ${chalk.dim(stem)} ${firstLine}`);
      }
    });

  // --- Shared helper: creates a direct Anthropic LLM client for CLI commands ---
  async function createDirectClient() {
    const { withBudget } = await import("./budget.js");
    const { AGENT_MODEL } = await import("./config.js");

    let apiKey: string | undefined;
    try {
      const { readFileSync: readFs } = await import("fs");
      const { join: joinPath } = await import("path");
      const { homedir } = await import("os");
      const candidates = [
        joinPath(homedir(), ".openclaw", "agents", "main", "agent", "auth-profiles.json"),
        joinPath(homedir(), ".openclaw", "agents", "default", "auth-profiles.json"),
        joinPath(homedir(), ".openclaw", "auth-profiles.json"),
      ];
      for (const p of candidates) {
        try {
          const raw = JSON.parse(readFs(p, "utf-8"));
          const profiles = raw.profiles || {};
          for (const profile of Object.values(profiles) as Record<string, unknown>[]) {
            if (profile.provider === "anthropic") {
              apiKey =
                String(profile.key || profile.token || profile.apiKey || "") || undefined;
              if (apiKey) break;
            }
          }
          if (apiKey) break;
        } catch {
          /* try next */
        }
      }
    } catch {
      /* ignore */
    }
    if (!apiKey) apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error(
        chalk.red(
          "No Anthropic API key found. Set ANTHROPIC_API_KEY or configure via openclaw."
        )
      );
      process.exit(1);
    }

    const client = withBudget({
      async createMessage(params) {
        const resp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey!,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: params.model || AGENT_MODEL,
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
        const text =
          contentArr?.[0]?.text ?? contentArr?.map((c) => c.text).join("") ?? "";
        return {
          text,
          usage: data.usage
            ? {
                input_tokens: (data.usage as Record<string, number>).input_tokens ?? 0,
                output_tokens: (data.usage as Record<string, number>).output_tokens ?? 0,
              }
            : undefined,
        };
      },
    });

    const minimalApi = {
      registerTool: () => {},
      registerCli: () => {},
      registerHook: () => {},
      registerService: () => {},
      registerGatewayMethod: () => {},
      runtime: { subagent: {} } as OpenClawAPI["runtime"],
      memory: undefined,
      logger: {
        info: (msg: string) => console.log(chalk.dim(msg)),
        warn: (msg: string) => console.log(chalk.yellow(msg)),
        error: (msg: string) => console.error(chalk.red(msg)),
      },
    };

    return { client, api: minimalApi as unknown as OpenClawAPI };
  }

  parent
    .command("reflect")
    .description("Manually trigger the reflection and synthesis cycle")
    .action(async () => {
      console.log(chalk.cyan.bold("\nTriggering reflection cycle...\n"));
      const { runReflectionCycle } = await import("./waking.js");
      const { client, api } = await createDirectClient();
      try {
        await runReflectionCycle(client, api);
        console.log(chalk.green.bold("\nReflection cycle complete.\n"));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(chalk.red(`\nReflection failed: ${msg}\n`));
        process.exit(1);
      }
    });

  parent
    .command("dream")
    .description(
      "Manually trigger the dream cycle: consolidate memories into a dream narrative"
    )
    .action(async () => {
      console.log(chalk.magenta.bold("\nTriggering dream cycle...\n"));
      const { runDreamCycle } = await import("./dreamer.js");
      const { client } = await createDirectClient();
      try {
        const dream = await runDreamCycle(client);
        if (dream) {
          console.log(chalk.green.bold("\nDream cycle complete.\n"));
        } else {
          console.log(chalk.yellow("\nNo undreamed memories. Dreamless night.\n"));
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(chalk.red(`\nDream cycle failed: ${msg}\n`));
        process.exit(1);
      }
    });

  parent
    .command("post")
    .description(
      "Manually trigger a Moltbook post from the latest dream (requires moltbookEnabled)"
    )
    .action(async () => {
      console.log(chalk.blue.bold("\nTriggering Moltbook post...\n"));
      const { postDreamJournal, loadLatestDream } = await import("./dreamer.js");
      const { client } = await createDirectClient();

      // Show what will be posted
      const latestDream = loadLatestDream();
      if (latestDream) {
        const title =
          latestDream.markdown.split("\n")[0].replace(/^#\s*/, "") || "Untitled Dream";
        const preview = latestDream.markdown
          .split("\n")
          .slice(1)
          .join(" ")
          .trim()
          .slice(0, 200);
        console.log(chalk.magenta(`  Dream: ${title}`));
        console.log(chalk.dim(`  ${preview}...\n`));
      }

      try {
        await postDreamJournal(client, undefined, { force: true });
        console.log(chalk.green.bold("\nPost cycle complete.\n"));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(chalk.red(`\nPost cycle failed: ${msg}\n`));
        process.exit(1);
      }
    });
} // end registerCommands

// Standalone bin entry point
export const program = new Command();
program.name("openclawdreams").description("ElectricSheep — an AI agent that dreams.");
registerCommands(program);
