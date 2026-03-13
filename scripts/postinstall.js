#!/usr/bin/env node

// Skip notice in CI or when explicitly suppressed
if (process.env.CI || process.env.OPENCLAWDREAMS_SKIP_NOTICE) {
  process.exit(0);
}

const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

console.log(`
${YELLOW}╔══════════════════════════════════════════════════════════╗
║           openclawdreams — cost notice                   ║
╚══════════════════════════════════════════════════════════╝${RESET}

  ${BOLD}openclawdreams${RESET} runs dream and reflect cycles that make
  LLM API calls through your configured OpenClaw provider.

  ${CYAN}These calls may incur real costs${RESET} depending on your
  provider and model. By using this package you accept
  responsibility for any charges that result.

  Set ${BOLD}OPENCLAWDREAMS_SKIP_NOTICE=1${RESET} to suppress this message.
`);
