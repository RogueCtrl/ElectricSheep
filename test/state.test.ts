import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Isolated temp dir so config/logger initialisation succeeds,
// but the actual state reads/writes are mocked in-memory below.
const testDir = mkdtempSync(join(tmpdir(), "es-state-test-"));
process.env.ELECTRICSHEEP_DATA_DIR = testDir;

const { loadState, saveState, _fs } = await import("../src/state.js");
const { STATE_FILE } = await import("../src/config.js");

// ── In-memory file store ────────────────────────────────────────────────────
const fileStore = new Map<string, string>();

// Keep references to the real fs operations so we can restore them.
const realFs = { ..._fs };

function installMockFs(): void {
  _fs.existsSync = ((p: string) => fileStore.has(p)) as typeof _fs.existsSync;
  _fs.readFileSync = ((p: string) => {
    if (!fileStore.has(p)) {
      const err: NodeJS.ErrnoException = new Error(
        `ENOENT: no such file or directory, open '${p}'`
      );
      err.code = "ENOENT";
      throw err;
    }
    return fileStore.get(p)!;
  }) as typeof _fs.readFileSync;
  _fs.writeFileSync = ((p: string, data: string) => {
    fileStore.set(p, data);
  }) as typeof _fs.writeFileSync;
  _fs.renameSync = ((src: string, dest: string) => {
    const content = fileStore.get(src);
    if (content === undefined) {
      const err: NodeJS.ErrnoException = new Error(
        `ENOENT: no such file or directory, rename '${src}'`
      );
      err.code = "ENOENT";
      throw err;
    }
    fileStore.set(dest, content);
    fileStore.delete(src);
  }) as typeof _fs.renameSync;
  _fs.unlinkSync = ((p: string) => {
    fileStore.delete(p);
  }) as typeof _fs.unlinkSync;
}

function restoreRealFs(): void {
  Object.assign(_fs, realFs);
}

// Install mocks before the suite and clear the store before each test.
before(() => {
  installMockFs();
});

beforeEach(() => {
  fileStore.clear();
});

after(() => {
  restoreRealFs();
  rmSync(testDir, { recursive: true, force: true });
});

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
    fileStore.set(STATE_FILE, "NOT VALID JSON {{{");
    const loaded = loadState();
    assert.deepEqual(loaded, {});
  });

  it("works normally after corruption recovery", () => {
    fileStore.set(STATE_FILE, "NOT VALID JSON {{{");
    loadState(); // triggers recovery
    const state = { recovered: true };
    saveState(state as Record<string, unknown>);
    const loaded = loadState();
    assert.deepEqual(loaded, { recovered: true });
  });

  it("uses atomic write via temp file and rename", () => {
    const tmpPath = STATE_FILE + ".tmp";
    saveState({ x: 42 } as Record<string, unknown>);
    // After a successful save the .tmp file should be gone (renamed).
    assert.ok(!fileStore.has(tmpPath), "temp file should not persist after rename");
    assert.ok(fileStore.has(STATE_FILE), "state file should exist after save");
  });
});
