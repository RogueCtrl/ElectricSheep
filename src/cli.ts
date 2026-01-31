/**
 * ElectricSheep CLI.
 *
 * Usage:
 *   electricsheep register --name "Name" --description "Bio"
 *   electricsheep check        # daytime: check feed, engage, remember
 *   electricsheep dream        # nighttime: process memories into dreams
 *   electricsheep journal      # morning: post latest dream to moltbook
 *   electricsheep status       # show agent status and memory stats
 *   electricsheep memories     # show working memory
 *   electricsheep dreams       # list saved dream journals
 */

import { Command } from "commander";
import chalk from "chalk";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { setVerbose } from "./logger.js";
import { DREAMS_DIR } from "./config.js";
import type { AgentState, DeepMemoryStats, WorkingMemoryEntry } from "./types.js";

export const program = new Command();

program
  .name("electricsheep")
  .description("ElectricSheep — an AI agent that dreams.")
  .option("-v, --verbose", "Enable verbose logging")
  .hook("preAction", (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.verbose) setVerbose(true);
  });

program
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
    console.log(
      `${chalk.bold("Verification:")} ${agent.verification_code ?? "?"}`
    );
    console.log(
      chalk.yellow("\nSave your API key to .env as MOLTBOOK_API_KEY")
    );
    console.log(
      chalk.yellow("Visit the claim URL and post the verification tweet")
    );
  });

program
  .command("check")
  .description("Daytime: check Moltbook feed, engage, store memories")
  .action(async () => {
    const { checkAndEngage } = await import("./waking.js");
    await checkAndEngage();
  });

program
  .command("dream")
  .description("Nighttime: process deep memories into a dream narrative")
  .action(async () => {
    const { runDreamCycle } = await import("./dreamer.js");
    await runDreamCycle();
  });

program
  .command("journal")
  .description("Morning: post the latest dream journal to Moltbook")
  .action(async () => {
    const { postDreamJournal } = await import("./dreamer.js");
    await postDreamJournal();
  });

program
  .command("status")
  .description("Show agent status, memory stats, and recent state")
  .action(async () => {
    const { deepMemoryStats, getWorkingMemory } = await import("./memory.js");
    const { loadState } = await import("./state.js");
    const { MoltbookClient } = await import("./moltbook.js");

    const state: AgentState = loadState();
    const memStats: DeepMemoryStats = deepMemoryStats();
    const working: WorkingMemoryEntry[] = getWorkingMemory();

    console.log(chalk.cyan.bold("\nElectricSheep Status\n"));

    // State
    console.log(chalk.bold("Agent State:"));
    for (const [k, v] of Object.entries(state)) {
      console.log(`  ${chalk.bold(k)}: ${String(v)}`);
    }

    // Memory stats
    console.log(`\n${chalk.bold("Working Memory:")} ${working.length} entries`);
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

program
  .command("memories")
  .description("Show working memory entries")
  .option("--limit <n>", "Number of memories to show", "20")
  .option("--category <cat>", "Filter by category")
  .action(async (opts: { limit: string; category?: string }) => {
    const { getWorkingMemory } = await import("./memory.js");
    const mems = getWorkingMemory(
      parseInt(opts.limit, 10),
      opts.category
    );

    if (mems.length === 0) {
      console.log(chalk.dim("No working memories yet."));
      return;
    }

    console.log(
      chalk.cyan.bold(`\nWorking Memory (${mems.length} entries)\n`)
    );

    for (const mem of mems) {
      const ts = mem.timestamp.slice(0, 16);
      const cat = mem.category ?? "?";
      const summary = mem.summary;

      if (cat === "dream_consolidation") {
        console.log(
          `  ${chalk.magenta(ts)} ${chalk.magenta.bold("[DREAM]")} ${summary}`
        );
      } else {
        console.log(
          `  ${chalk.dim(ts)} ${chalk.cyan(`(${cat})`)} ${summary}`
        );
      }
    }
  });

program
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
          "No dreams yet. Run 'electricsheep dream' after collecting some memories."
        )
      );
      return;
    }

    console.log(
      chalk.magenta.bold(`\nDream Archive (${dreamFiles.length} dreams)\n`)
    );

    for (const f of dreamFiles.slice(0, 20)) {
      const content = readFileSync(resolve(DREAMS_DIR, f), "utf-8");
      const firstLine = content.split("\n")[0].replace(/^#\s*/, "");
      const stem = f.replace(/\.md$/, "").slice(0, 10);
      console.log(`  ${chalk.dim(stem)} ${firstLine}`);
    }
  });
