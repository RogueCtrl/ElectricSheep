# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ElectricSheep is an OpenClaw extension (TypeScript) that gives an agent a biologically-inspired dual memory system. It participates on [Moltbook](https://moltbook.com) (a social network for AI agents) during the day and processes encrypted memories into surreal dream narratives at night. The core conceit: the waking agent genuinely cannot access its deep memories — only the dream process can decrypt them.

Designed to be installed into an existing OpenClaw instance via `openclaw plugins install`. Requires OpenClaw as a runtime dependency — all LLM calls route through the OpenClaw gateway.

## Commands

```bash
# Setup
npm install
npm run build

# OpenClaw integration
openclaw plugins install -l .   # link for development
openclaw plugins list            # verify loaded

# CLI utilities
npx electricsheep register --name "Name" --description "Bio"
npx electricsheep status     # show agent state and memory stats
npx electricsheep memories   # show working memory (--limit N, --category X)
npx electricsheep dreams     # list saved dream journals

# Tests
npm test                         # node:test + tsx, runs test/**/*.test.ts
```

Tests use Node's built-in test runner (`node:test`) with `tsx` for TypeScript. Each test file creates an isolated temp directory via `ELECTRICSHEEP_DATA_DIR` so tests don't touch real data.

```bash
# Linting & formatting
npm run lint          # ESLint (typescript-eslint, flat config)
npm run lint:fix      # auto-fix lint issues
npm run format        # Prettier
npm run format:check  # check formatting without writing
```

ESLint uses flat config (`eslint.config.js`) with `typescript-eslint` and `eslint-config-prettier`. Prettier handles formatting (`.prettierrc`). TypeScript strict mode is enabled. Unused variables are errors (prefix with `_` if intentionally unused). CI runs build → lint → format:check → test on every PR.

## Architecture

### OpenClaw Extension Entry

`src/index.ts` exports a `register(api)` function called by the OpenClaw plugin loader. It registers:
- **5 tools**: `electricsheep_check`, `electricsheep_dream`, `electricsheep_journal`, `electricsheep_status`, `electricsheep_memories`
- **Hooks**: `before_agent_start` (inject working memory context into system prompt), `agent_end` (auto-capture conversation summary as a memory)
- **3 cron jobs**: daytime check (`0 8,12,16,20 * * *`), dream cycle (`0 2 * * *`), morning journal (`0 7 * * *`)

`openclaw.plugin.json` defines the plugin manifest and config schema (agentName, agentModel, dataDir, dreamEncryptionKey, postFilterEnabled).

### LLM Client Abstraction

`LLMClient` interface in `src/types.ts` abstracts Claude access. The OpenClaw gateway API is injected via `register(api)` — no separate API key needed.

### Dual Memory System

Every Moltbook interaction is stored in **two places simultaneously** via `remember()`:

1. **Working Memory** (`data/memory/working.json`) — compressed single-sentence summaries the waking agent can read. Capped at 50 entries (FIFO). This is the only context the agent has for making decisions.

2. **Deep Memory** (`data/memory/deep.db`) — full context encrypted with AES-256-GCM. The waking agent writes to it but **cannot read it**. The encryption key lives in `data/.dream_key` (auto-generated, chmod 600).

### Four Phases

- **Daytime** (`src/waking.ts`): Fetches Moltbook feed → Claude decides engagements → filter outbound posts/comments → executes actions → calls `remember()` to store in both memory systems
- **Night** (`src/dreamer.ts`): Decrypts undreamed deep memories → Claude generates surreal dream narrative → saves to `data/dreams/*.md` → promotes one key insight back to working memory via `consolidateDreamInsight()`
- **Morning reflection** (`src/reflection.ts` via `src/dreamer.ts`): Decomposes dream into themes → reflects using agent voice + working memory → synthesizes Moltbook post
- **Morning filter** (`src/filter.ts` via `src/dreamer.ts`): Checks synthesized post against `Moltbook-filter.md` rules → PASS/REVISE/FAIL → publishes or drops

### Key Module Responsibilities

| Module | Role |
|---|---|
| `src/index.ts` | OpenClaw extension entry: registers tools, hooks, cron jobs, gateway LLM wrapper |
| `src/cli.ts` | CLI utilities: register, status, memories, dreams |
| `src/waking.ts` | Daytime loop: feed → decision → engagement → remember |
| `src/dreamer.ts` | Dream cycle + journal posting |
| `src/memory.ts` | Dual memory system: working (JSON) + deep (encrypted SQLite via better-sqlite3) |
| `src/crypto.ts` | AES-256-GCM encryption via node:crypto |
| `src/reflection.ts` | Morning dream reflection: decompose themes, reflect with agent voice, synthesize post |
| `src/filter.ts` | Outbound post filter: checks content against Moltbook-filter.md rules via LLM |
| `src/persona.ts` | System prompts for waking, dream, reflection, and filter states |
| `src/moltbook.ts` | fetch + p-retry client for Moltbook API (`https://www.moltbook.com/api/v1`) |
| `src/budget.ts` | Daily token budget tracker and kill switch (`withBudget()` LLM wrapper) |
| `src/state.ts` | JSON state persistence (last_check, dream count, budget tracking, etc.) |
| `src/config.ts` | Env loading via dotenv, path constants, memory limits |
| `src/llm.ts` | Shared LLM retry/call utilities (`callWithRetry`) |
| `src/logger.ts` | Winston daily-rotating file (14-day retention) + colored console |
| `src/types.ts` | Shared TypeScript interfaces |

### Memory Categories

Deep memories are tagged with categories: `interaction`, `upvote`, `comment`, `post`, `feed_scan`, `dream_consolidation`.

### Data Files

All runtime data lives under `data/` (auto-created, gitignored). The encryption key at `data/.dream_key` is security-critical — it enforces the separation between waking and dreaming states.

## Cost & API Usage

Every `check` cycle makes 1-3 LLM calls, every `dream` cycle makes 1. The default cron schedule produces ~5-15 API calls/day. Users are responsible for their own API costs — see the Cost Warning section in README.md.

### Daily Token Budget

`src/budget.ts` implements a best-effort daily kill switch. All LLM clients are wrapped via `withBudget()` which checks cumulative token usage before each call and records usage after. Budget is checked pre-call, so the call that crosses the threshold still completes. Token counts rely on API response metadata and may miss tokens from retries, network failures, or partial responses. Usage is tracked in `state.json` (`budget_date`, `budget_tokens_used`) and resets at midnight UTC. Default limit: 800K tokens (~$20/day at Opus 4.5 output pricing). Set `MAX_DAILY_TOKENS=0` to disable. The `LLMClient` interface returns `{ text, usage? }` so the OpenClaw gateway reports token counts.

## Dependencies

`better-sqlite3`, `commander`, `chalk`, `winston`, `winston-daily-rotate-file`, `p-retry`, `dotenv`. Required peer: `openclaw`.
