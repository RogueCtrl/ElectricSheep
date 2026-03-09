import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { extractConcepts, computeOverlap } from "../src/entropy.js";
import type { LLMClient } from "../src/types.js";

// Setup for integration tests
const testDir = mkdtempSync(join(tmpdir(), "es-entropy-test-"));
process.env.OPENCLAWDREAMS_DATA_DIR = testDir;
process.env.ENTROPY_OVERLAP_THRESHOLD = "0.5";

const { runDreamCycle } = await import("../src/dreamer.js");
const { storeDeepMemory, closeDb } = await import("../src/memory.js");
const { loadState, saveState } = await import("../src/state.js");
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

describe("Entropy utilities", () => {
  describe("extractConcepts", () => {
    it("returns meaningful words from typical dream text", () => {
      const text =
        "The recursive lobster is standing in a server room made of coral. The racks breathe.";
      const concepts = extractConcepts(text);
      // Expected: recursive, lobster, standing, server, room, made, coral, racks, breathe
      assert.ok(concepts.includes("recursive"));
      assert.ok(concepts.includes("lobster"));
      assert.ok(concepts.includes("standing"));
      assert.ok(concepts.includes("server"));
      assert.ok(concepts.includes("room"));
      assert.ok(concepts.includes("made"));
      assert.ok(concepts.includes("coral"));
      assert.ok(concepts.includes("racks"));
      assert.ok(concepts.includes("breathe"));
      // Stop words removed
      assert.ok(!concepts.includes("the"));
      assert.ok(!concepts.includes("is"));
      assert.ok(!concepts.includes("in"));
      assert.ok(!concepts.includes("a"));
      assert.ok(!concepts.includes("of"));
    });

    it("strips punctuation and converts to lowercase", () => {
      const text = "LOBSTER! (recursive) - coral.";
      const concepts = extractConcepts(text);
      assert.deepEqual(concepts.sort(), ["coral", "lobster", "recursive"]);
    });

    it("deduplicates words", () => {
      const text = "lobster lobster coral coral";
      const concepts = extractConcepts(text);
      assert.deepEqual(concepts.sort(), ["coral", "lobster"]);
    });

    it("filters out words shorter than 3 characters", () => {
      const text = "a it to ox coral";
      const concepts = extractConcepts(text);
      assert.deepEqual(concepts, ["coral"]);
    });

    it("returns empty array for empty string", () => {
      assert.deepEqual(extractConcepts(""), []);
    });
  });

  describe("computeOverlap", () => {
    it("returns 0 for empty inputs", () => {
      assert.equal(computeOverlap([], []), 0);
      assert.equal(computeOverlap(["lobster"], []), 0);
      assert.equal(computeOverlap([], ["past realization"]), 0);
    });

    it("returns correct ratio for known inputs (0.5)", () => {
      const concepts = ["lobster", "coral", "server", "room"];
      const past = ["The lobster is in the room."];
      // Overlapping: lobster, room (2 of 4)
      assert.equal(computeOverlap(concepts, past), 0.5);
    });

    it("returns 1.0 when all concepts overlap", () => {
      const concepts = ["lobster", "coral"];
      const past = ["A lobster made of coral."];
      assert.equal(computeOverlap(concepts, past), 1.0);
    });

    it("handles past_realizations with multiple entries", () => {
      const concepts = ["lobster", "coral", "server"];
      assert.equal(computeOverlap(concepts, ["lobster", "coral"]), 2 / 3);
    });
  });
});

describe("Entropy integration", () => {
  it("saves entropy_last_overlap to state after dream generation", async () => {
    storeDeepMemory({ text: "memory 1" }, "interaction");
    const client = mockLLMClient([
      "# Dream\n\nLobster and coral.",
      "insight",
      "realization",
    ]);

    await runDreamCycle(client);

    const state = loadState();
    assert.notEqual(state.entropy_last_overlap, undefined);
    assert.ok(typeof state.entropy_last_overlap === "number");
  });

  it("increments entropy_reprompt_count when overlap exceeds threshold", async () => {
    storeDeepMemory({ text: "memory 2" }, "interaction");

    const state = loadState();
    state.past_realizations = ["lobster", "coral", "server"];
    saveState(state);

    // First draft overlaps completely: lobster, coral, server
    const firstDraft = "# Dream\n\nLobster, coral, and server.";
    // Second draft is different
    const secondDraft = "# New Dream\n\nForest and mountains.";

    // runDreamCycle calls:
    // 1. generateDream (first draft)
    // 2. generateDream (re-prompt)
    // 3. consolidateDream
    // 4. groundDream
    const client = mockLLMClient([firstDraft, secondDraft, "insight", "realization"]);

    await runDreamCycle(client);

    const newState = loadState();
    assert.equal(newState.entropy_reprompt_count, 1);
    assert.equal(newState.entropy_last_overlap, 0.75); // "dream", "lobster", "coral", "server" -> 3/4 overlap
  });
});

after(async () => {
  closeDb();
  await closeLogger();
  rmSync(testDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
});
