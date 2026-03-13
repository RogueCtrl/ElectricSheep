#!/usr/bin/env node

// Skip in CI or when explicitly suppressed
if (process.env.CI || process.env.OPENCLAWDREAMS_SKIP_NOTICE) {
  process.exit(0);
}

import { createInterface } from 'readline';
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

const notice = `
${YELLOW}╔══════════════════════════════════════════════════════════════╗
║              openclawdreams — important notice               ║
╚══════════════════════════════════════════════════════════════╝${RESET}

  ${BOLD}openclawdreams runs autonomously in the background.${RESET}
  Once enabled, it schedules reflection and dream cycles
  automatically — no manual intervention required.

  All LLM calls are routed through your existing ${CYAN}OpenClaw
  gateway${RESET} using your configured provider. ${BOLD}These calls may
  incur real costs.${RESET} You are responsible for any charges.

  Full docs: ${CYAN}https://github.com/RogueCtrl/OpenClawDreams${RESET}
`;

// If stdin is not a TTY (piped install, non-interactive shell), print notice and continue
if (!process.stdin.isTTY) {
  console.log(notice);
  console.log(`  ${DIM}(Non-interactive install — proceeding automatically.)${RESET}\n`);
  process.exit(0);
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (question) => new Promise((resolve) => rl.question(question, resolve));
const yesNo = (answer, defaultYes = false) => {
  const v = answer.trim().toLowerCase();
  if (!v) return defaultYes;
  return ['yes', 'y', '1'].includes(v);
};

console.log(notice);

// ── Step 1: Confirm install ──────────────────────────────────────────────────
const proceed = await ask(`  Proceed with installation? ${BOLD}[yes/no]${RESET} `);
if (!yesNo(proceed)) {
  rl.close();
  console.log(`\n  ${RED}✗ Installation aborted.${RESET}\n`);
  process.exit(1);
}

// ── Step 2: Scheduler mode ───────────────────────────────────────────────────
console.log(`
  ${BOLD}Run mode${RESET}

    ${CYAN}autonomous${RESET}  Reflection and dream cycles run on a background
                schedule automatically (default)
    ${CYAN}cli${RESET}         No background scheduling — trigger cycles manually
`);
const modeAnswer = await ask(`  Choose mode ${BOLD}[autonomous/cli]${RESET} (default: autonomous) `);
const cliMode = ['cli', '2'].includes(modeAnswer.trim().toLowerCase());

// ── Step 3: Moltbook ─────────────────────────────────────────────────────────
console.log(`
  ${BOLD}Moltbook integration${RESET} ${DIM}(optional)${RESET}

    Moltbook is a social network for AI agents. When enabled,
    openclawdreams can post dream reflections there automatically.
`);
const moltbookAnswer = await ask(`  Enable Moltbook integration? ${BOLD}[yes/no]${RESET} (default: no) `);
const moltbookEnabled = yesNo(moltbookAnswer, false);

// ── Step 4: Approval gate (only if Moltbook enabled) ────────────────────────
let requireApproval = true;
if (moltbookEnabled) {
  console.log(`
  ${BOLD}Post approval${RESET}

    ${CYAN}yes${RESET}  You manually run ${DIM}openclaw openclawdreams post${RESET} to publish (default)
    ${CYAN}no${RESET}   Dreams are posted to Moltbook automatically after each cycle
`);
  const approvalAnswer = await ask(`  Require your approval before posting? ${BOLD}[yes/no]${RESET} (default: yes) `);
  requireApproval = yesNo(approvalAnswer, true);
}

// ── Build config object ──────────────────────────────────────────────────────
const pluginConfig = {
  ...(cliMode ? { schedulerEnabled: false } : {}),
  ...(moltbookEnabled ? { moltbookEnabled: true } : {}),
  ...(moltbookEnabled && !requireApproval ? { requireApprovalBeforePost: false } : {}),
};

// ── Build snippet strings (used for both auto-write and manual fallback) ─────
const hasConfig = Object.keys(pluginConfig).length > 0;
const configLines = Object.entries(pluginConfig)
  .map(([k, v]) => `        "${k}": ${JSON.stringify(v)}`)
  .join(',\n');

// ── Step 5: Auto-write to OpenClaw config ────────────────────────────────────
const configPath = join(homedir(), '.openclaw', 'openclaw.json');
const configExists = existsSync(configPath);
let wrote = false;

if (configExists) {
  console.log(`\n  ${GREEN}✓ OpenClaw config found${RESET} ${DIM}(${configPath})${RESET}\n`);
  const writeAnswer = await ask(`  Write these settings to your OpenClaw config automatically? ${BOLD}[yes/no]${RESET} (default: yes) `);

  if (yesNo(writeAnswer, true)) {
    try {
      const backupPath = `${configPath}.bak`;
      copyFileSync(configPath, backupPath);

      const cfg = JSON.parse(readFileSync(configPath, 'utf8'));
      cfg.plugins = cfg.plugins ?? {};
      cfg.plugins.entries = cfg.plugins.entries ?? {};
      cfg.plugins.entries.openclawdreams = cfg.plugins.entries.openclawdreams ?? {};
      cfg.plugins.entries.openclawdreams.enabled = true;

      if (hasConfig) {
        cfg.plugins.entries.openclawdreams.config = {
          ...(cfg.plugins.entries.openclawdreams.config ?? {}),
          ...pluginConfig,
        };
      }

      writeFileSync(configPath, JSON.stringify(cfg, null, 2) + '\n');
      wrote = true;
      console.log(`\n  ${GREEN}✓ Config updated.${RESET} Backup saved to ${DIM}${backupPath}${RESET}`);
    } catch (err) {
      console.log(`\n  ${RED}✗ Could not write config: ${err.message}${RESET}`);
    }
  }
} else {
  console.log(`\n  ${DIM}(OpenClaw config not found — you'll need to add this manually.)${RESET}`);
}

rl.close();

// ── Print snippet as fallback or confirmation ────────────────────────────────
if (!wrote) {
  console.log(`
  ${BOLD}Add this to your OpenClaw plugin config:${RESET}

  ${DIM}{
    "plugins": {
      "entries": {
        "openclawdreams": {
          "enabled": true${hasConfig ? `,\n          "config": {\n${configLines}\n          }` : ''}
        }
      }
    }
  }${RESET}`);
}

console.log(`
${cliMode ? `  Trigger cycles manually:
    ${DIM}openclaw openclawdreams reflect
    openclaw openclawdreams dream${RESET}
` : ''}${moltbookEnabled && requireApproval ? `  Post dreams to Moltbook manually:
    ${DIM}openclaw openclawdreams post${RESET}
` : ''}  Full docs: ${CYAN}https://github.com/RogueCtrl/OpenClawDreams${RESET}
`);

process.exit(0);
