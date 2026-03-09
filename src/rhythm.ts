/**
 * Cognitive Rhythm Report — weekly digest of dream and reflection activity.
 */

import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getDreamsDir, getNightmaresDir } from "./config.js";
import { loadState } from "./state.js";
import { extractConcepts, computeJaccardOverlap } from "./entropy.js";
import type { AgentState } from "./types.js";

export interface RhythmReport {
  period_start: string;
  period_end: string;
  total_dreams: number;
  total_nightmares: number;
  total_reflections: number;
  dominant_themes: string[];
  tone_trajectory: "improving" | "declining" | "stable" | "unknown";
  insight_density: number;
  entropy_reprompts: number;
  meta_loop_depth_peak: number;
  raw_summary: string;
}

function getFilesInDateRange(dir: string, start: string, end: string): string[] {
  let files: string[];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith(".md"));
  } catch {
    return [];
  }
  return files.filter((f) => {
    const datePrefix = f.slice(0, 10);
    return datePrefix >= start && datePrefix <= end;
  });
}

function readFileContents(dir: string, files: string[]): string[] {
  return files.map((f) => {
    try {
      return readFileSync(resolve(dir, f), "utf-8");
    } catch {
      return "";
    }
  });
}

function computeTopThemes(contents: string[], limit: number): string[] {
  const freq = new Map<string, number>();
  for (const text of contents) {
    for (const word of extractConcepts(text)) {
      freq.set(word, (freq.get(word) ?? 0) + 1);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

function computeToneTrajectory(
  contents: string[],
  pastRealizations: string[]
): RhythmReport["tone_trajectory"] {
  if (contents.length < 2) return "unknown";

  const referenceConcepts =
    pastRealizations.length > 0 ? extractConcepts(pastRealizations.join(" ")) : [];

  if (referenceConcepts.length === 0) return "unknown";

  const mid = Math.floor(contents.length / 2);
  const firstHalf = contents.slice(0, mid);
  const secondHalf = contents.slice(mid);

  const avgOverlap = (texts: string[]) => {
    if (texts.length === 0) return 0;
    const total = texts.reduce(
      (sum, text) =>
        sum + computeJaccardOverlap(extractConcepts(text), referenceConcepts),
      0
    );
    return total / texts.length;
  };

  const firstAvg = avgOverlap(firstHalf);
  const secondAvg = avgOverlap(secondHalf);

  const diff = secondAvg - firstAvg;
  const threshold = 0.1 * Math.max(firstAvg, secondAvg, 0.01);

  if (Math.abs(diff) <= threshold) return "stable";
  return diff < 0 ? "improving" : "declining";
}

function computeInsightDensity(contents: string[]): number {
  if (contents.length === 0) return 0;
  const total = contents.reduce((sum, text) => {
    const unique = new Set(extractConcepts(text));
    return sum + unique.size;
  }, 0);
  return Math.round((total / contents.length) * 100) / 100;
}

export function generateRhythmReport(dataDir?: string): RhythmReport {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const periodEnd = now.toISOString().slice(0, 10);
  const periodStart = weekAgo.toISOString().slice(0, 10);

  const dreamsDir = dataDir ? resolve(dataDir, "data", "dreams") : getDreamsDir();
  const nightmaresDir = dataDir
    ? resolve(dataDir, "data", "nightmares")
    : getNightmaresDir();

  const dreamFiles = getFilesInDateRange(dreamsDir, periodStart, periodEnd);
  const nightmareFiles = getFilesInDateRange(nightmaresDir, periodStart, periodEnd);

  const dreamContents = readFileContents(dreamsDir, dreamFiles);
  const allContents = [
    ...dreamContents,
    ...readFileContents(nightmaresDir, nightmareFiles),
  ];

  const state: AgentState = loadState();
  const pastRealizations = (state.past_realizations as string[]) ?? [];

  const dominantThemes = computeTopThemes(allContents, 5);
  const toneTrajectory = computeToneTrajectory(allContents, pastRealizations);
  const insightDensity = computeInsightDensity(allContents);
  const entropyReprompts = (state.entropy_reprompt_count as number) ?? 0;
  const metaLoopDepthPeak = (state.meta_loop_depth as number) ?? 0;
  const totalReflections = (state.checks_today as number) ?? 0;

  const themeStr =
    dominantThemes.length > 0 ? dominantThemes.join(", ") : "none detected";
  const rawSummary =
    `Over the past week, ${dreamFiles.length} dream(s) and ${nightmareFiles.length} nightmare(s) were recorded. ` +
    `Dominant themes included ${themeStr}. ` +
    `Tone trajectory: ${toneTrajectory}.`;

  return {
    period_start: periodStart,
    period_end: periodEnd,
    total_dreams: dreamFiles.length,
    total_nightmares: nightmareFiles.length,
    total_reflections: totalReflections,
    dominant_themes: dominantThemes,
    tone_trajectory: toneTrajectory,
    insight_density: insightDensity,
    entropy_reprompts: entropyReprompts,
    meta_loop_depth_peak: metaLoopDepthPeak,
    raw_summary: rawSummary,
  };
}

export function formatReportNotification(report: RhythmReport): string {
  return [
    `Weekly Rhythm Report (${report.period_start} to ${report.period_end})`,
    `Dreams: ${report.total_dreams} | Nightmares: ${report.total_nightmares}`,
    `Dominant themes: ${report.dominant_themes.length > 0 ? report.dominant_themes.join(", ") : "none"}`,
    `Tone: ${report.tone_trajectory} | Insight density: ${report.insight_density} concepts/dream`,
    `Entropy re-prompts: ${report.entropy_reprompts} | Meta-loop depth: ${report.meta_loop_depth_peak}`,
    report.raw_summary,
  ].join("\n");
}
