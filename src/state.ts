/**
 * Simple state persistence with atomic writes and corruption recovery.
 */

import { readFileSync, writeFileSync, existsSync, renameSync, unlinkSync } from "node:fs";
import { STATE_FILE } from "./config.js";
import logger from "./logger.js";
import type { AgentState } from "./types.js";

export function loadState(): AgentState {
  if (!existsSync(STATE_FILE)) {
    return {};
  }

  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf-8"));
  } catch (e) {
    logger.error(`Corrupted state file, resetting to empty state: ${e}`);
    return {};
  }
}

export function saveState(state: AgentState): void {
  const tmp = STATE_FILE + ".tmp";
  writeFileSync(tmp, JSON.stringify(state, null, 2));
  renameSync(tmp, STATE_FILE);
}

/**
 * Clean up any leftover temp file from a previous crashed write.
 * Called once at module load.
 */
function cleanupStaleTemp(): void {
  const tmp = STATE_FILE + ".tmp";
  if (existsSync(tmp)) {
    try {
      unlinkSync(tmp);
    } catch {
      // best-effort
    }
  }
}

cleanupStaleTemp();
