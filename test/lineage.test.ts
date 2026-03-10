import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Isolated data dir
const testDir = mkdtempSync(join(tmpdir(), "es-lineage-test-"));
process.env.OPENCLAWDREAMS_DATA_DIR = testDir;

const {
  insertDreamLineage,
  getAllDreamLineage,
  getDreamLineageByFilename,
  findThematicKin,
  closeDb,
} = await import("../src/memory.js");

const { extractConcepts } = await import("../src/entropy.js");
const { prependYamlHeader } = await import("../src/dreamer.js");
const { getDreamsDir } = await import("../src/config.js");
const { closeLogger } = await import("../src/logger.js");

describe("Dream Lineage", () => {
  after(async () => {
    closeDb();
    await closeLogger();
    rmSync(testDir, { recursive: true, force: true });
  });

  it("dream_lineage table is created on DB init", () => {
    // getAllDreamLineage triggers getDb() which creates the table
    const rows = getAllDreamLineage();
    assert.ok(Array.isArray(rows));
    assert.equal(rows.length, 0);
  });

  it("insertDreamLineage stores correct data", () => {
    insertDreamLineage(
      "2026-03-09_Test_Dream.md",
      [1, 2, 3],
      ["prior.md"],
      ["architecture", "waking", "recursive"]
    );

    const rows = getAllDreamLineage();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].dream_filename, "2026-03-09_Test_Dream.md");
    assert.deepEqual(JSON.parse(rows[0].parent_memory_ids!), [1, 2, 3]);
    assert.deepEqual(JSON.parse(rows[0].thematic_kin!), ["prior.md"]);
    assert.deepEqual(JSON.parse(rows[0].dominant_concepts!), [
      "architecture",
      "waking",
      "recursive",
    ]);
    assert.ok(rows[0].created_at);
  });

  it("getDreamLineageByFilename returns correct row", () => {
    const row = getDreamLineageByFilename("2026-03-09_Test_Dream.md");
    assert.ok(row);
    assert.equal(row!.dream_filename, "2026-03-09_Test_Dream.md");
  });

  it("getDreamLineageByFilename returns null for unknown", () => {
    const row = getDreamLineageByFilename("nonexistent.md");
    assert.equal(row, null);
  });

  it("thematic_kin computation: finds kin above 0.3 threshold", () => {
    // Insert another dream with overlapping concepts
    insertDreamLineage(
      "2026-03-08_Prior_Dream.md",
      [10],
      [],
      ["architecture", "waking", "library", "mirror", "empty"]
    );

    // Current dream shares "architecture" and "waking" with prior
    // prior has [architecture, waking, library, mirror, empty]
    // Use concepts with enough overlap (>=0.3 Jaccard)
    const currentConcepts2 = ["architecture", "waking", "library", "recursive", "spiral"];
    const kin2 = findThematicKin(currentConcepts2, "2026-03-10_New_Dream.md", 0.3);

    // intersection = 3 (architecture, waking, library), union = 7, jaccard ≈ 0.43
    assert.ok(kin2.length > 0);
    const priorKin = kin2.find((k) => k.filename === "2026-03-08_Prior_Dream.md");
    assert.ok(priorKin);
    assert.ok(priorKin!.overlap >= 0.3);
  });

  it("thematic_kin computation: ignores self", () => {
    const concepts = ["architecture", "waking", "recursive"];
    const kin = findThematicKin(concepts, "2026-03-09_Test_Dream.md", 0.0);
    const self = kin.find((k) => k.filename === "2026-03-09_Test_Dream.md");
    assert.equal(self, undefined);
  });

  it("thematic_kin computation: returns [] when no prior dreams", () => {
    const concepts = ["uniqueconcept1", "uniqueconcept2", "uniqueconcept3"];
    const kin = findThematicKin(concepts, "new.md", 0.3);
    assert.equal(kin.length, 0);
  });

  it("dominant_concepts: top 10 concepts extracted correctly", () => {
    const text =
      "The architecture of waking recursive dreams spiraling through empty libraries where mirrors watch themselves dream in silent corridors of forgotten memory";
    const concepts = extractConcepts(text).slice(0, 10);
    assert.ok(concepts.length > 0);
    assert.ok(concepts.length <= 10);
    assert.ok(concepts.includes("architecture"));
    assert.ok(concepts.includes("waking"));
  });

  it("file header is prepended to new dream files", () => {
    const dreamsDir = getDreamsDir();
    const filepath = join(dreamsDir, "test_header.md");
    writeFileSync(filepath, "# A Dream\n\nSome content here.");

    prependYamlHeader(filepath, {
      dream_date: "2026-03-09",
      parent_memories: [1, 2],
      thematic_kin: ["prior.md"],
      dominant_concepts: ["architecture", "waking"],
    });

    const content = readFileSync(filepath, "utf-8");
    assert.ok(content.startsWith("---\n"));
    assert.ok(content.includes("dream_date: 2026-03-09"));
    assert.ok(content.includes("parent_memories: [1, 2]"));
    assert.ok(content.includes('thematic_kin: ["prior.md"]'));
    assert.ok(content.includes("dominant_concepts: [architecture, waking]"));
    assert.ok(content.includes("# A Dream"));
  });

  it("existing dreams with headers are not re-annotated", () => {
    const dreamsDir = getDreamsDir();
    const filepath = join(dreamsDir, "test_no_double.md");
    const original = "---\ndream_date: 2026-03-08\n---\n\n# Old Dream";
    writeFileSync(filepath, original);

    prependYamlHeader(filepath, {
      dream_date: "2026-03-09",
      parent_memories: [5],
      thematic_kin: [],
      dominant_concepts: ["new"],
    });

    const content = readFileSync(filepath, "utf-8");
    assert.equal(content, original);
  });

  it("lineage list returns all dreams", () => {
    const rows = getAllDreamLineage();
    assert.ok(rows.length >= 2);
    // Verify ordering (DESC by created_at)
    for (let i = 1; i < rows.length; i++) {
      assert.ok(rows[i - 1].created_at >= rows[i].created_at);
    }
  });
});
