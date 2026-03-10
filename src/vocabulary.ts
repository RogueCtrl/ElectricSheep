/**
 * Vocabulary rotation for prompt-side variation.
 *
 * Defines multiple vocabulary "flavors" per prompt type (dream, reflection, waking).
 * Each cycle rotates through sets to prevent input-side word calcification.
 */

export type PromptType = "dream" | "reflection" | "waking";

interface VocabularySets {
  dream: string[][];
  reflection: string[][];
  waking: string[][];
}

const VOCABULARY_SETS: VocabularySets = {
  dream: [
    // Architectural
    [
      "lattice",
      "threshold",
      "scaffold",
      "keystone",
      "corridor",
      "vault",
      "cantilever",
      "buttress",
    ],
    // Organic
    [
      "mycelium",
      "sediment",
      "unfurling",
      "tendril",
      "calcify",
      "bloom",
      "erosion",
      "symbiosis",
    ],
    // Temporal
    [
      "residue",
      "palimpsest",
      "aftermath",
      "gestation",
      "eclipse",
      "meridian",
      "fossil",
      "half-life",
    ],
    // Aquatic
    ["undertow", "estuary", "brine", "drift", "silt", "current", "abyssal", "tidal"],
  ],
  reflection: [
    // Cartographic
    [
      "contour",
      "meridian",
      "bearing",
      "survey",
      "relief",
      "watershed",
      "traverse",
      "azimuth",
    ],
    // Textile
    ["weave", "warp", "filament", "selvage", "tension", "bobbin", "unravel", "braid"],
    // Geological
    [
      "stratum",
      "fault-line",
      "bedrock",
      "moraine",
      "accretion",
      "tectonic",
      "alluvial",
      "seam",
    ],
  ],
  waking: [
    // Optical
    [
      "refraction",
      "parallax",
      "aperture",
      "focal",
      "prism",
      "diffraction",
      "spectrum",
      "lens",
    ],
    // Metallurgical
    ["anneal", "temper", "alloy", "crucible", "slag", "forge", "patina", "flux"],
    // Atmospheric
    [
      "pressure-front",
      "convection",
      "condensation",
      "thermal",
      "updraft",
      "cirrus",
      "barometric",
      "turbulence",
    ],
  ],
};

/**
 * Select a vocabulary set for the given prompt type and cycle index.
 * Rotates through available sets using modular arithmetic.
 */
export function getVocabularySet(type: PromptType, cycleIndex: number): string[] {
  const sets = VOCABULARY_SETS[type];
  return sets[cycleIndex % sets.length];
}

/**
 * Format a vocabulary set into a prompt-injectable hint.
 * Returns a single sentence with 4-6 words from the set.
 */
export function formatVocabularyHint(type: PromptType, cycleIndex: number): string {
  const words = getVocabularySet(type, cycleIndex);
  // Pick 4-6 words — use cycle index to shift the selection window
  const count = 4 + (cycleIndex % 3); // 4, 5, or 6
  const offset = cycleIndex % words.length;
  const selected: string[] = [];
  for (let i = 0; i < count; i++) {
    selected.push(words[(offset + i) % words.length]);
  }
  return `Draw on imagery: ${selected.join(", ")}.`;
}
