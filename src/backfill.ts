import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getDreamsDir, getNightmaresDir } from "./config.js";
import { storeDeepMemory, registerDream, getDreamRemembrances } from "./memory.js";
import { loadState, saveState } from "./state.js";
import logger from "./logger.js";

function parseFilename(filename: string): { date: string; title: string } | null {
  const match = filename.match(/^(\d{4}-\d{2}-\d{2})_(.+)\.md$/);
  if (!match) return null;
  return { date: match[1], title: match[2].replace(/_/g, " ") };
}

export async function ensureBackfilled(): Promise<void> {
  const state = loadState();
  if (state.dreams_backfilled) {
    return;
  }

  logger.info("Starting initial dream remembrance backfill...");
  let backfillCount = 0;
  const existing = new Set(getDreamRemembrances().map((r) => r.filename));

  // 1. Backfill from local disk (Dreams)
  if (existsSync(getDreamsDir())) {
    const files = readdirSync(getDreamsDir()).filter((f) => f.endsWith(".md"));
    for (const f of files) {
      if (existing.has(f)) continue;
      const parsed = parseFilename(f);
      if (!parsed) continue;

      const content = readFileSync(resolve(getDreamsDir(), f), "utf-8");
      const deepMemoryId = storeDeepMemory(
        { text_summary: parsed.title, markdown: content, isNightmare: false },
        "dream"
      );
      registerDream(f, parsed.title, parsed.date, {
        isNightmare: false,
        deepMemoryId,
      });
      existing.add(f);
      backfillCount++;
    }
  }

  // 2. Backfill from local disk (Nightmares)
  if (existsSync(getNightmaresDir())) {
    const files = readdirSync(getNightmaresDir()).filter((f) => f.endsWith(".md"));
    for (const f of files) {
      if (existing.has(f)) continue;
      const parsed = parseFilename(f);
      if (!parsed) continue;

      const content = readFileSync(resolve(getNightmaresDir(), f), "utf-8");
      const deepMemoryId = storeDeepMemory(
        { text_summary: parsed.title, markdown: content, isNightmare: true },
        "nightmare"
      );
      registerDream(f, parsed.title, parsed.date, {
        isNightmare: true,
        deepMemoryId,
      });
      existing.add(f);
      backfillCount++;
    }
  }

  logger.info(`Dream backfill complete. Recovered ${backfillCount} dreams.`);
  state.dreams_backfilled = true;
  saveState(state);
}
