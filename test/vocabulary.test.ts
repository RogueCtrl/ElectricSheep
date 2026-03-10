import { describe, it, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const testDir = mkdtempSync(join(tmpdir(), "es-vocab-test-"));
process.env.OPENCLAWDREAMS_DATA_DIR = testDir;

const { getVocabularySet, formatVocabularyHint } = await import("../src/vocabulary.js");
const { loadState, saveState } = await import("../src/state.js");
const { closeLogger } = await import("../src/logger.js");

describe("Vocabulary rotation", () => {
  describe("getVocabularySet", () => {
    it("returns an array of strings", () => {
      const set = getVocabularySet("dream", 0);
      assert.ok(Array.isArray(set));
      assert.ok(set.length > 0);
      for (const word of set) {
        assert.equal(typeof word, "string");
      }
    });

    it("returns different sets for different cycle indices", () => {
      const set0 = getVocabularySet("dream", 0);
      const set1 = getVocabularySet("dream", 1);
      assert.notDeepEqual(set0, set1);
    });

    it("wraps around when cycleIndex exceeds set count", () => {
      const set0 = getVocabularySet("dream", 0);
      // Dream has 4 sets, so index 4 should wrap to 0
      const setWrapped = getVocabularySet("dream", 4);
      assert.deepEqual(set0, setWrapped);
    });

    it("works for all prompt types", () => {
      for (const type of ["dream", "reflection", "waking"] as const) {
        const set = getVocabularySet(type, 0);
        assert.ok(set.length >= 4, `${type} should have at least 4 words`);
      }
    });

    it("returns distinct sets for each prompt type", () => {
      const dream = getVocabularySet("dream", 0);
      const reflection = getVocabularySet("reflection", 0);
      const waking = getVocabularySet("waking", 0);
      assert.notDeepEqual(dream, reflection);
      assert.notDeepEqual(dream, waking);
      assert.notDeepEqual(reflection, waking);
    });
  });

  describe("formatVocabularyHint", () => {
    it("returns a single sentence starting with 'Draw on imagery:'", () => {
      const hint = formatVocabularyHint("dream", 0);
      assert.ok(hint.startsWith("Draw on imagery:"));
      assert.ok(hint.endsWith("."));
    });

    it("contains 4-6 comma-separated words", () => {
      for (let i = 0; i < 6; i++) {
        const hint = formatVocabularyHint("dream", i);
        const wordsSection = hint.replace("Draw on imagery: ", "").replace(".", "");
        const words = wordsSection.split(", ");
        assert.ok(
          words.length >= 4,
          `cycle ${i}: expected >=4 words, got ${words.length}`
        );
        assert.ok(
          words.length <= 6,
          `cycle ${i}: expected <=6 words, got ${words.length}`
        );
      }
    });

    it("produces different hints for different cycle indices", () => {
      const hint0 = formatVocabularyHint("dream", 0);
      const hint1 = formatVocabularyHint("dream", 1);
      assert.notEqual(hint0, hint1);
    });
  });

  describe("prompt_cycle_counts in state", () => {
    beforeEach(() => {
      saveState({});
    });

    it("defaults to zeros when missing from state", () => {
      const state = loadState();
      const counts = state.prompt_cycle_counts ?? {
        dream: 0,
        reflection: 0,
        waking: 0,
      };
      assert.deepEqual(counts, { dream: 0, reflection: 0, waking: 0 });
    });

    it("persists incremented cycle counts", () => {
      const state = loadState();
      state.prompt_cycle_counts = { dream: 3, reflection: 1, waking: 7 };
      saveState(state);

      const loaded = loadState();
      assert.deepEqual(loaded.prompt_cycle_counts, {
        dream: 3,
        reflection: 1,
        waking: 7,
      });
    });

    it("is backward compatible with old state files", () => {
      // Old state without prompt_cycle_counts
      saveState({ total_dreams: 5, last_check: "2026-01-01" });
      const loaded = loadState();
      assert.equal(loaded.prompt_cycle_counts, undefined);
      // Code should default gracefully
      const counts = (loaded.prompt_cycle_counts as
        | { dream: number; reflection: number; waking: number }
        | undefined) ?? { dream: 0, reflection: 0, waking: 0 };
      assert.deepEqual(counts, { dream: 0, reflection: 0, waking: 0 });
    });
  });
});

after(async () => {
  await closeLogger();
  rmSync(testDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
});
