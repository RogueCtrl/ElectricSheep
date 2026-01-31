/**
 * Simple state persistence.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { STATE_FILE } from "./config.js";
import type { AgentState } from "./types.js";

export function loadState(): AgentState {
  if (existsSync(STATE_FILE)) {
    return JSON.parse(readFileSync(STATE_FILE, "utf-8"));
  }
  return {};
}

export function saveState(state: AgentState): void {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}
