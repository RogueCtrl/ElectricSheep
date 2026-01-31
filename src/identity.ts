/**
 * Agent identity loader.
 *
 * Reads SOUL.md and IDENTITY.md from the OpenClaw workspace directory
 * (or standalone BASE_DIR) and caches the contents for prompt injection.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { BASE_DIR, WORKSPACE_DIR } from "./config.js";
import { DEFAULT_IDENTITY } from "./persona.js";
import logger from "./logger.js";

let workspaceDir: string = "";
let cached: { soul: string; identity: string } | null = null;

/**
 * Set the workspace directory (called from OpenClaw hook context).
 * Clears any cached identity so it will be reloaded from the new path.
 */
export function setWorkspaceDir(dir: string): void {
  if (dir && dir !== workspaceDir) {
    workspaceDir = dir;
    cached = null;
    logger.debug(`Identity: workspace dir set to ${dir}`);
  }
}

function resolveDir(): string {
  return workspaceDir || WORKSPACE_DIR || BASE_DIR;
}

function loadFile(dir: string, filename: string): string {
  const filepath = resolve(dir, filename);
  // Guard against path traversal: resolved path must stay within the target dir.
  const resolvedDir = resolve(dir);
  if (!filepath.startsWith(resolvedDir + "/") && filepath !== resolvedDir) {
    logger.warn(`Identity: path traversal blocked for ${filename} in ${dir}`);
    return "";
  }
  if (existsSync(filepath)) {
    const content = readFileSync(filepath, "utf-8").trim();
    if (content) {
      logger.debug(`Identity: loaded ${filename} (${content.length} chars)`);
      return content;
    }
  }
  return "";
}

/**
 * Load and cache SOUL.md and IDENTITY.md contents.
 */
export function getAgentIdentity(): { soul: string; identity: string } {
  if (cached) return cached;

  const dir = resolveDir();
  cached = {
    soul: loadFile(dir, "SOUL.md"),
    identity: loadFile(dir, "IDENTITY.md"),
  };
  return cached;
}

/**
 * Returns a formatted identity block for prompt injection.
 * Falls back to DEFAULT_IDENTITY when no workspace files are found.
 */
export function getAgentIdentityBlock(): string {
  const { soul, identity } = getAgentIdentity();

  if (!soul && !identity) {
    return DEFAULT_IDENTITY;
  }

  const parts: string[] = [];
  if (identity) {
    parts.push(`AGENT IDENTITY:\n${identity}`);
  }
  if (soul) {
    parts.push(`AGENT SOUL:\n${soul}`);
  }
  return parts.join("\n\n");
}
