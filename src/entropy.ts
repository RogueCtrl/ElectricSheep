/**
 * Entropy check utilities for detecting concept recycling.
 */

/**
 * Tokenize text into lowercase words, strip punctuation, and remove stop words.
 * Returns deduplicated words with at least 3 characters.
 */
export function extractConcepts(text: string): string[] {
  const stopWords = new Set([
    "a",
    "an",
    "the",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "may",
    "might",
    "must",
    "shall",
    "to",
    "of",
    "in",
    "on",
    "at",
    "for",
    "from",
    "with",
    "by",
    "about",
    "as",
    "into",
    "through",
    "and",
    "or",
    "but",
    "not",
    "this",
    "that",
    "these",
    "those",
    "it",
    "its",
    "i",
    "you",
    "we",
    "they",
    "he",
    "she",
    "my",
    "your",
    "our",
    "their",
    "what",
    "when",
    "where",
    "how",
    "why",
    "so",
    "if",
    "then",
    "than",
    "there",
    "here",
    "all",
    "each",
    "any",
    "no",
    "more",
    "most",
    "some",
    "such",
    "same",
    "just",
    "also",
    "very",
    "too",
    "up",
    "out",
    "over",
    "after",
    "before",
    "now",
    "only",
    "even",
    "back",
    "still",
    "own",
    "well",
  ]);

  if (!text) return [];

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !stopWords.has(word));

  return [...new Set(words)];
}

/**
 * Compute the overlap ratio (0.0 to 1.0) between current concepts and past realizations.
 */
export function computeOverlap(concepts: string[], pastRealizations: string[]): number {
  if (concepts.length === 0 || !pastRealizations || pastRealizations.length === 0) {
    return 0;
  }

  const pastConcepts = new Set<string>();
  for (const realization of pastRealizations) {
    const extracted = extractConcepts(realization);
    for (const concept of extracted) {
      pastConcepts.add(concept);
    }
  }

  if (pastConcepts.size === 0) return 0;

  let matchCount = 0;
  for (const concept of concepts) {
    if (pastConcepts.has(concept)) {
      matchCount++;
    }
  }

  return matchCount / concepts.length;
}

/**
 * Identify which concepts from the current set already exist in past realizations.
 */
export function getOverlappingConcepts(
  concepts: string[],
  pastRealizations: string[]
): string[] {
  if (concepts.length === 0 || !pastRealizations || pastRealizations.length === 0) {
    return [];
  }

  const pastConcepts = new Set<string>();
  for (const realization of pastRealizations) {
    const extracted = extractConcepts(realization);
    for (const concept of extracted) {
      pastConcepts.add(concept);
    }
  }

  return concepts.filter((concept) => pastConcepts.has(concept));
}
