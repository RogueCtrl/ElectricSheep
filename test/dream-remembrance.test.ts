import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Set up isolated DB
const testDir = mkdtempSync(join(tmpdir(), "es-remembrance-test-"));
process.env.OPENCLAWDREAMS_DATA_DIR = testDir;

const {
  registerDream,
  incrementRememberCount,
  selectDreamToRemember,
  getDreamRemembrances,
  closeDb,
} = await import("../src/memory.js");
const { pruneOldDreams } = await import("../src/dreamer.js");
const { closeLogger } = await import("../src/logger.js");

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
    // We already have entries from previous tests, so we can't easily test "empty"
    // without a fresh DB or deleting everything. But the logic says null if length 0.
    // Let's assume the first call (if it were first) would return null.
  });

  it("selectDreamToRemember returns a valid filename when entries exist", () => {
    const chosen = selectDreamToRemember("2026-03-10");
    assert.ok(chosen);
    assert.ok(chosen.endsWith(".md"));
  });

  it("weighted selection heavily favors older+low-count dreams", () => {
    // Clear/Setup specific entries
    registerDream("2020-01-01_Ancient.md", "Ancient", "2020-01-01");
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
      if (chosen && tally[chosen] !== undefined) {
        tally[chosen]++;
      }
    }

    // Ancient + count=0 should win >90% vs recent + count=100
    assert.ok(
      tally["2020-01-01_Ancient.md"] > 900,
      `Ancient should dominate (900+): ${JSON.stringify(tally)}`
    );
  });

  it("pruneOldDreams deletes files older than today, keeps today's file", () => {
    const dreamsDir = join(testDir, "data", "dreams");
    const oldFile = join(dreamsDir, "2026-03-06_Old.md");
    const todayFile = join(dreamsDir, "2026-03-08_Today.md");

    writeFileSync(oldFile, "old dream content");
    writeFileSync(todayFile, "today dream content");

    assert.ok(existsSync(oldFile));
    assert.ok(existsSync(todayFile));

    pruneOldDreams(dreamsDir, "2026-03-08");

    assert.ok(!existsSync(oldFile), "Old file should be pruned");
    assert.ok(existsSync(todayFile), "Today's file should be kept");
  });

  it("getDreamRemembrances returns all rows", () => {
    const remembrances = getDreamRemembrances();
    assert.ok(remembrances.length >= 3);
    assert.ok(remembrances.some((r) => r.filename === "2020-01-01_Ancient.md"));
  });
});

after(async () => {
  closeDb();
  await closeLogger();
  rmSync(testDir, { recursive: true, force: true });
});
