#!/usr/bin/env node

// Skip notice in CI or when explicitly suppressed
if (process.env.CI || process.env.OPENCLAWDREAMS_SKIP_NOTICE) {
  process.exit(0);
}

const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

console.log(`
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

  Set ${BOLD}OPENCLAWDREAMS_SKIP_NOTICE=1${RESET} to suppress this message.
`);
