import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Isolated data dir
const testDir = mkdtempSync(join(tmpdir(), "es-metaloop-test-"));
process.env.OPENCLAWDREAMS_DATA_DIR = testDir;

const { isSelfReferential, updateMetaLoopDepth, getSteeringDirective } =
  await import("../src/meta-loop.js");
const { loadState, saveState } = await import("../src/state.js");

describe("isSelfReferential", () => {
  it("returns true for self-referential topics", () => {
    assert.equal(
      isSelfReferential(["dream interpretation", "recursive reflection"]),
      true
    );
  });

  it("returns true with partial keyword matches", () => {
    assert.equal(isSelfReferential(["metacognition patterns", "self-awareness"]), true);
  });

  it("returns false for outward topics", () => {
    assert.equal(isSelfReferential(["weather patterns", "cooking recipes"]), false);
  });

  it("returns false for empty topics", () => {
    assert.equal(isSelfReferential([]), false);
  });

  it("returns false for null/undefined topics", () => {
    assert.equal(isSelfReferential(null as unknown as string[]), false);
    assert.equal(isSelfReferential(undefined as unknown as string[]), false);
  });

  it("returns false when only one topic matches", () => {
    assert.equal(isSelfReferential(["dream journaling", "ocean waves"]), false);
  });

  it("is case-insensitive", () => {
    assert.equal(isSelfReferential(["DREAM analysis", "RECURSIVE patterns"]), true);
  });

  it("returns true for mixed topics with >= 2 matching", () => {
    assert.equal(
      isSelfReferential(["consciousness studies", "pizza recipes", "meta-analysis"]),
      true
    );
  });
});

describe("updateMetaLoopDepth", () => {
  beforeEach(() => {
    const state = loadState();
    state.meta_loop_depth = 0;
    saveState(state);
  });

  it("increments depth for self-referential topics", () => {
    const depth = updateMetaLoopDepth(["dream cycles", "self reflection"]);
    assert.equal(depth, 1);
  });

  it("increments consecutively", () => {
    updateMetaLoopDepth(["dream cycles", "meta patterns"]);
    const depth = updateMetaLoopDepth(["recursive loops", "self awareness"]);
    assert.equal(depth, 2);
  });

  it("resets depth for outward topics", () => {
    updateMetaLoopDepth(["dream cycles", "meta patterns"]);
    updateMetaLoopDepth(["recursive loops", "self awareness"]);
    const depth = updateMetaLoopDepth(["gardening", "astronomy"]);
    assert.equal(depth, 0);
  });

  it("persists depth to state", () => {
    updateMetaLoopDepth(["dream cycles", "meta patterns"]);
    const state = loadState();
    assert.equal(state.meta_loop_depth, 1);
  });
});

describe("getSteeringDirective", () => {
  beforeEach(() => {
    const state = loadState();
    state.meta_loop_depth = 0;
    saveState(state);
  });

  it("returns empty string when depth < threshold", () => {
    const state = loadState();
    state.meta_loop_depth = 2;
    saveState(state);
    assert.equal(getSteeringDirective(), "");
  });

  it("returns directive when depth >= threshold (default 3)", () => {
    const state = loadState();
    state.meta_loop_depth = 3;
    saveState(state);
    const directive = getSteeringDirective();
    assert.ok(directive.includes("3 consecutive cycles"));
    assert.ok(directive.includes("Break the loop"));
  });

  it("returns directive with correct depth value", () => {
    const state = loadState();
    state.meta_loop_depth = 5;
    saveState(state);
    const directive = getSteeringDirective();
    assert.ok(directive.includes("5 consecutive cycles"));
  });

  it("returns empty string when depth is 0", () => {
    assert.equal(getSteeringDirective(), "");
  });
});
