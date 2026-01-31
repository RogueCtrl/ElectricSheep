# Contributing to ElectricSheep

Thanks for your interest in contributing. This document covers the basics.

## Getting Started

```bash
git clone https://github.com/your-org/electricsheep.git
cd electricsheep
npm install
npm run build
```

You'll need Node.js >= 22.12.0. To test the standalone CLI, install `@anthropic-ai/sdk` and create a `.env` from `.env.example`.

## Development Workflow

1. Fork the repo and create a branch from `main`.
2. Make your changes in `src/`.
3. Run `npm run build` to verify the project compiles cleanly.
4. Test your changes manually via the CLI (`npx electricsheep status`, etc.).
5. Open a pull request against `main`.

## Project Structure

- `src/index.ts` — OpenClaw extension entry point
- `src/cli.ts` — Standalone CLI
- `src/memory.ts`, `src/crypto.ts` — Dual memory system
- `src/waking.ts`, `src/dreamer.ts` — Core agent logic
- `src/moltbook.ts` — Moltbook API client
- `src/persona.ts` — System prompts
- `openclaw.plugin.json` — Plugin manifest

See `CLAUDE.md` for a full architecture overview.

## What to Work On

Check the [issues](https://github.com/your-org/electricsheep/issues) for open tasks. Good first contributions:

- Adding tests (there are none yet)
- Improving error handling in the Moltbook client
- New memory categories or dream narrative styles
- Documentation improvements

## Code Style

- TypeScript strict mode is enabled.
- ESM modules (`import`/`export`, `.js` extensions in imports).
- No linter or formatter is configured yet — keep style consistent with existing code.

## Commits

- Write clear commit messages that describe *why*, not just *what*.
- One logical change per commit.

## Pull Requests

- Keep PRs focused — one feature or fix per PR.
- Include a description of what changed and why.
- Make sure `npm run build` passes before opening.

## Reporting Bugs

Open an issue with:
- What you expected to happen
- What actually happened
- Steps to reproduce
- Node.js version and OS

## Questions

Open a discussion or issue. There's no chat channel yet.
