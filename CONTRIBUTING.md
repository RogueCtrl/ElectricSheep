# Contributing to ElectricSheep

Thanks for your interest in contributing. This document covers the basics.

## Getting Started

```bash
git clone https://github.com/RogueCtrl/ElectricSheep.git
cd ElectricSheep
npm install
npm run build
```

You'll need Node.js >= 24.0.0 (Active LTS). To test the standalone CLI, install `@anthropic-ai/sdk` and create a `.env` from `.env.example`.

## Development Workflow

1. Fork the repo and create a branch from `main`.
2. Make your changes in `src/`.
3. Run `npm run build` to verify the project compiles cleanly.
4. Run `npm test` to make sure all tests pass.
5. Run `npm run lint` and `npm run format:check` to catch style issues.
6. Open a pull request against `main`.

CI will run build, lint, format check, and tests on your PR. All must pass before merging.

## Testing

Tests use Node's built-in test runner (`node:test`) with `tsx` for TypeScript:

```bash
npm test                                          # run all tests
node --import tsx --test test/crypto.test.ts       # run a single file
```

Each test file creates an isolated temp directory via `ELECTRICSHEEP_DATA_DIR` so tests never touch real data. When adding new functionality, add tests in `test/` following the existing patterns.

Good areas for more test coverage:
- Moltbook client (mock HTTP responses)
- Waking agent decision parsing
- CLI command output

## Code Style

- **ESLint** and **Prettier** are configured. Run `npm run lint:fix` and `npm run format` to auto-fix.
- TypeScript strict mode is enabled.
- ESM modules (`import`/`export`, `.js` extensions in imports).
- Unused variables are errors (prefix with `_` if intentionally unused).

## Project Structure

- `src/index.ts` — OpenClaw extension entry point
- `src/cli.ts` — Standalone CLI
- `src/scheduler.ts` — Long-lived process scheduler (node-cron)
- `src/memory.ts`, `src/crypto.ts` — Dual memory system
- `src/waking.ts`, `src/dreamer.ts` — Core agent logic
- `src/moltbook.ts` — Moltbook API client
- `src/persona.ts` — System prompts
- `openclaw.plugin.json` — Plugin manifest
- `test/` — Test suite

See `CLAUDE.md` for a full architecture overview.

## What to Work On

Check the [issues](https://github.com/RogueCtrl/ElectricSheep/issues) for open tasks. Good first contributions:

- Expanding test coverage (Moltbook client, CLI, waking logic)
- Improving error handling in the Moltbook client
- New memory categories or dream narrative styles
- Documentation improvements

## Commits

- Write clear commit messages that describe *why*, not just *what*.
- One logical change per commit.

## Pull Requests

- Keep PRs focused — one feature or fix per PR.
- Include a description of what changed and why.
- All CI checks (build, lint, format, tests) must pass before merging.
- PRs require one approving review.

## Reporting Bugs

Open an issue with:
- What you expected to happen
- What actually happened
- Steps to reproduce
- Node.js version and OS

## Questions

Open a discussion or issue. There's no chat channel yet.
