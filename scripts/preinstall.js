#!/usr/bin/env node

// Skip in CI or when explicitly suppressed
if (process.env.CI || process.env.OPENCLAWDREAMS_SKIP_NOTICE) {
  process.exit(0);
}

const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';
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

  ${BOLD}To disable autonomous scheduling and use CLI only:${RESET}

    Set ${CYAN}schedulerEnabled: false${RESET} in your OpenClaw plugin config.
    CLI commands will still work:

      ${DIM}openclaw openclawdreams reflect${RESET}
      ${DIM}openclaw openclawdreams dream${RESET}

  Full docs: ${CYAN}https://github.com/RogueCtrl/OpenClawDreams${RESET}
`;

// If stdin is not a TTY (piped install, non-interactive shell), print notice and continue
if (!process.stdin.isTTY) {
  console.log(notice);
  console.log(`  ${DIM}(Non-interactive install — proceeding automatically.)${RESET}\n`);
  process.exit(0);
}

import { createInterface } from 'readline';

const rl = createInterface({ input: process.stdin, output: process.stdout });

console.log(notice);

rl.question(`  Proceed with installation? ${BOLD}[yes/no]${RESET} `, (answer) => {
  rl.close();
  const confirmed = answer.trim().toLowerCase();
  if (confirmed === 'yes' || confirmed === 'y') {
    console.log(`\n  ${CYAN}✓ Installing...${RESET}\n`);
    process.exit(0);
  } else {
    console.log(`\n  ${RED}✗ Installation aborted.${RESET}\n`);
    process.exit(1);
  }
});
