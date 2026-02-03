import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const testDir = mkdtempSync(join(tmpdir(), "es-state-test-"));
process.env.ELECTRICSHEEP_DATA_DIR = testDir;

const { loadState, saveState } = await import("../src/state.js");
const { STATE_FILE } = await import("../src/config.js");
const { closeLogger } = await import("../src/logger.js");

describe("State persistence", () => {
  it("returns empty object when no state file exists", () => {
    const state = loadState();
    assert.deepEqual(state, {});
  });

  it("round-trips state through save/load", () => {
    const state = {
      last_check: "2026-01-31T12:00:00.000Z",
      checks_today: 3,
      total_dreams: 1,
      latest_dream_title: "The Lobster's Lament",
    };
    saveState(state);
    const loaded = loadState();
    assert.deepEqual(loaded, state);
  });

  it("overwrites previous state completely", () => {
    saveState({ a: 1, b: 2 } as Record<string, unknown>);
    saveState({ c: 3 } as Record<string, unknown>);
    const loaded = loadState();
    assert.deepEqual(loaded, { c: 3 });
    assert.ok(!("a" in loaded));
  });

  it("recovers from corrupted state file", () => {
    writeFileSync(STATE_FILE, "NOT VALID JSON {{{");
    const loaded = loadState();
    assert.deepEqual(loaded, {});
  });

  it("works normally after corruption recovery", () => {
    const state = { recovered: true };
    saveState(state as Record<string, unknown>);
    const loaded = loadState();
    assert.deepEqual(loaded, { recovered: true });
  });
});

after(async () => {
  await closeLogger();
  rmSync(testDir, { recursive: true, force: true });
});
