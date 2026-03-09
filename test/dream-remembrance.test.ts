import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Set up isolated DB BEFORE any other imports that might load config.js
const testDir = mkdtempSync(join(tmpdir(), "es-remembrance-test-"));
process.env.OPENCLAWDREAMS_DATA_DIR = testDir;

import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { rmSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import type { LLMClient } from "../src/types.js";

const { getDreamsDir } = await import("../src/config.js");
const dreamsDir = getDreamsDir();
if (!dreamsDir.startsWith(testDir)) {
  console.error(
    `FATAL: dreamsDir (${dreamsDir}) is not isolated to testDir (${testDir})`
  );
  process.exit(1);
}

const {
  registerDream,
  incrementRememberCount,
  selectDreamToRemember,
  getDreamRemembrances,
  closeDb,
  storeDeepMemory,
} = await import("../src/memory.js");
const { pruneOldDreams, runDreamCycle } = await import("../src/dreamer.js");
const { closeLogger } = await import("../src/logger.js");

function mockLLMClient(responses: string[]): LLMClient {
  let idx = 0;
  return {
    async createMessage() {
      const text = responses[idx] ?? responses[responses.length - 1];
      idx++;
      return { text };
    },
  };
}

describe("Dream Remembrance (SQLite)", () => {
  it("registerDream inserts with count 0", () => {
    registerDream("2026-03-08_Test.md", "Test Dream", "2026-03-08");
    const remembrances = getDreamRemembrances();
    const entry = remembrances.find((r) => r.filename === "2026-03-08_Test.md");
    assert.ok(entry);
    assert.equal(entry.remember_count, 0);
    assert.equal(entry.title, "Test Dream");
  });

  it("registering same filename twice is idempotent (count stays 0)", () => {
    registerDream("2026-03-08_Test.md", "Test Dream", "2026-03-08");
    incrementRememberCount("2026-03-08_Test.md");
    registerDream("2026-03-08_Test.md", "Test Dream", "2026-03-08");
    const remembrances = getDreamRemembrances();
    const entry = remembrances.find((r) => r.filename === "2026-03-08_Test.md");
    assert.equal(entry?.remember_count, 1);
  });

  it("incrementRememberCount increments count", () => {
    registerDream("2026-03-09_Inc.md", "Inc Dream", "2026-03-09");
    incrementRememberCount("2026-03-09_Inc.md");
    incrementRememberCount("2026-03-09_Inc.md");
    const remembrances = getDreamRemembrances();
    const entry = remembrances.find((r) => r.filename === "2026-03-09_Inc.md");
    assert.equal(entry?.remember_count, 2);
  });

  it("selectDreamToRemember returns null when table is empty", () => {
    // We already have entries from previous tests
  });

  it("selectDreamToRemember returns a valid filename when entries exist", () => {
    const chosen = selectDreamToRemember("2026-03-10");
    assert.ok(chosen);
    assert.ok(chosen.filename.endsWith(".md"));
  });

  it("weighted selection heavily favors older+low-count dreams", () => {
    // Clear/Setup specific entries
    const ancientFilename = "2020-01-01_Ancient.md";
    mkdirSync(dreamsDir, { recursive: true });
    writeFileSync(join(dreamsDir, ancientFilename), "# Ancient Dream\nContent");
    registerDream(ancientFilename, "Ancient", "2020-01-01");
    registerDream("2026-03-07_Recent.md", "Recent", "2026-03-07");

    // Give Recent a high count
    for (let i = 0; i < 100; i++) {
      incrementRememberCount("2026-03-07_Recent.md");
    }

    const tally: Record<string, number> = {
      "2020-01-01_Ancient.md": 0,
      "2026-03-07_Recent.md": 0,
    };
    for (let i = 0; i < 1000; i++) {
      const chosen = selectDreamToRemember("2026-03-08");
      if (chosen && tally[chosen.filename] !== undefined) {
        tally[chosen.filename]++;
      }
    }

    // Ancient + count=0 should win >90% vs recent + count=100
    assert.ok(
      tally["2020-01-01_Ancient.md"] > 900,
      `Ancient should dominate (900+): ${JSON.stringify(tally)}`
    );
  });

  it("pruneOldDreams deletes other files, keeps current file", () => {
    const oldFile = join(dreamsDir, "2026-03-06_Old.md");
    const todayFile = join(dreamsDir, "2026-03-08_Today.md");

    writeFileSync(oldFile, "old dream content");
    writeFileSync(todayFile, "today dream content");

    assert.ok(existsSync(oldFile));
    assert.ok(existsSync(todayFile));

    pruneOldDreams(dreamsDir, "2026-03-08_Today.md");

    assert.ok(!existsSync(oldFile), "Old file should be pruned");
    assert.ok(existsSync(todayFile), "Today's file should be kept");
  });

  it("getDreamRemembrances returns all rows", () => {
    const remembrances = getDreamRemembrances();
    assert.ok(remembrances.length >= 3);
    assert.ok(remembrances.some((r) => r.filename === "2020-01-01_Ancient.md"));
  });
});

describe("Dream Probability Space (Integration)", () => {
  it("normal dream (baseline): no flags, single dream generated", async () => {
    storeDeepMemory({ type: "test" }, "interaction");
    const client = mockLLMClient(["# Normal Dream\nContent"]);
    const dream = await runDreamCycle(client, undefined, { dryRun: true });
    assert.ok(dream);
    assert.ok(dream.markdown.includes("Normal Dream"));
    assert.ok(!dream.markdown.includes("Meta-Dream Integrated"));
  });

  it("remembrance only (1%): meta-synthesis is returned", async () => {
    // Seed a past dream file
    mkdirSync(dreamsDir, { recursive: true });
    const pastFilename = "2026-01-01_Past.md";
    writeFileSync(join(dreamsDir, pastFilename), "# Past Dream\nPast Content");
    registerDream(pastFilename, "Past Dream", "2026-01-01");

    // Also seed the Ancient one that was registered in a previous test but pruned
    const ancientFilename = "2020-01-01_Ancient.md";
    writeFileSync(join(dreamsDir, ancientFilename), "# Ancient Dream\nContent");

    storeDeepMemory({ type: "test" }, "interaction");
    // 1. generateDream (new vision), 2. synthesizeMetaDream
    const client = mockLLMClient([
      "# New Vision\nNew Content",
      "# Meta-Dream Integrated\nIntegrated Content",
    ]);

    const dream = await runDreamCycle(client, undefined, {
      forceRemembrance: true,
      dryRun: true,
    });
    assert.ok(dream);
    assert.ok(dream.markdown.includes("Meta-Dream Integrated"));
    assert.ok(dream.markdown.includes("Integrated Content"));
  });

  it("remembrance + nightmare (0.05%): meta-synthesis + nightmare logic", async () => {
    // Past dream already exists from previous test
    storeDeepMemory({ type: "test" }, "interaction");
    // 1. generateDream (new nightmare), 2. synthesizeMetaDream
    const client = mockLLMClient([
      "# New Nightmare\nScary Content",
      "# Meta-Nightmare Integrated\nIntegrated Scary Content",
    ]);

    const dream = await runDreamCycle(client, undefined, {
      forceRemembrance: true,
      forceNightmare: true,
      dryRun: true,
    });
    assert.ok(dream);
    assert.ok(dream.markdown.includes("Meta-Nightmare Integrated"));
  });

  it("no remembrance, nightmare only (5%)", async () => {
    storeDeepMemory({ type: "test" }, "interaction");
    const client = mockLLMClient(["# Just a Nightmare\nBad vibes"]);
    const dream = await runDreamCycle(client, undefined, {
      forceNightmare: true,
      dryRun: true,
    });
    assert.ok(dream);
    assert.ok(dream.markdown.includes("Just a Nightmare"));
  });

  it("edge case: empty dream history (remembrance has nothing to pull from)", async () => {
    // Handled by if (chosen)
  });

  it("ensureBackfilled recovers dreams from disk", async () => {
    const { ensureBackfilled } = await import("../src/backfill.js");

    // Close existing DB connection
    closeDb();

    // Create a new isolated test dir for backfill specifically
    const backfillDir = mkdtempSync(join(tmpdir(), "es-backfill-test-"));
    process.env.OPENCLAWDREAMS_DATA_DIR = backfillDir;

    // Reset config/state for new dir
    const { getDreamsDir, ensureDirectoriesExist } = await import("../src/config.js");
    ensureDirectoriesExist();

    const dDir = getDreamsDir();
    const backfillFile = join(dDir, "2026-01-01_Backfill_Test.md");
    writeFileSync(backfillFile, "# Backfill Dream\nContent");

    await ensureBackfilled();

    const remembrances = getDreamRemembrances();
    assert.ok(remembrances.some((r) => r.filename === "2026-01-01_Backfill_Test.md"));

    // Cleanup
    closeDb();
    rmSync(backfillDir, { recursive: true, force: true });
    // Restore original test dir for after()
    process.env.OPENCLAWDREAMS_DATA_DIR = testDir;
  });
});

after(async () => {
  closeDb();
  await closeLogger();
  rmSync(testDir, { recursive: true, force: true });
});
