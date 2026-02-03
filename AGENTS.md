# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ElectricSheep is an OpenClaw extension (TypeScript) that gives an agent a biologically-inspired dual memory system. It synthesizes the agent's interactions with their human operator, enriching them with context from web searches and (optionally) the Moltbook AI agent community. The core conceit: the waking agent genuinely cannot access its deep memories — only the dream process can decrypt them.

The agent processes its daily work into surreal dream narratives at night, then can notify its operator with "I had a dream last night..." to spark conversation about the dream's themes and insights.

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
npx electricsheep register --name "Name" --description "Bio"  # for Moltbook (optional)
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
- **6 tools**: `electricsheep_reflect`, `electricsheep_check` (legacy alias), `electricsheep_dream`, `electricsheep_journal`, `electricsheep_status`, `electricsheep_memories`
- **Hooks**: `before_agent_start` (inject working memory context into system prompt), `agent_end` (auto-capture conversation summary as a memory)
- **3 cron jobs**: reflection cycle (`0 8,12,16,20 * * *`), dream cycle (`0 2 * * *`), morning journal (`0 7 * * *`, only if Moltbook enabled)

`openclaw.plugin.json` defines the plugin manifest and config schema.

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `agentName` | string | "ElectricSheep" | Agent display name |
| `agentModel` | string | claude-sonnet-4-5 | Claude model for AI decisions |
| `dataDir` | string | "" | Directory for data storage |
| `dreamEncryptionKey` | string | "" | Base64 encryption key (auto-generated if empty) |
| `moltbookEnabled` | boolean | false | Enable Moltbook integration (search + posting) |
| `webSearchEnabled` | boolean | true | Enable web search for context gathering |
| `notificationChannel` | string | "" | Channel to notify operator of dreams (telegram, discord, etc.) |
| `notifyOperatorOnDream` | boolean | true | Send "I had a dream" message to operator |
| `postFilterEnabled` | boolean | true | Enable content filter for outbound posts |

### LLM Client Abstraction

`LLMClient` interface in `src/types.ts` abstracts Claude access. The OpenClaw gateway API is injected via `register(api)` — no separate API key needed.

### Extended OpenClaw API

The plugin can use these optional OpenClaw APIs when available:
- `api.memory` — Store dreams and reflections in OpenClaw's persistent memory
- `api.channels` — Send notifications to operator via configured channels
- `api.webSearch` — Search the web for context related to operator conversations

### Dual Memory System

Every interaction is stored in **two places simultaneously** via `remember()`:

1. **Working Memory** (`data/memory/working.json`) — compressed single-sentence summaries the waking agent can read. Capped at 50 entries (FIFO). This is the only context the agent has for making decisions.

2. **Deep Memory** (`data/memory/deep.db`) — full context encrypted with AES-256-GCM. The waking agent writes to it but **cannot read it**. The encryption key lives in `data/.dream_key` (auto-generated, chmod 600).

### Three Phases

```
┌─────────────────────────────────────────────────────────────────┐
│                   DAYTIME (Reflection Cycle)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Operator Conversations ──► Topic Extraction ──┬──► Synthesis   │
│        (from hooks)              (LLM)         │      (LLM)     │
│                                                │        │       │
│  Moltbook Search ◄── topics ◄─────────────────┤        │       │
│    (optional)                                  │        ▼       │
│                                                │   OpenClaw     │
│  Web Search ◄──── topics ◄────────────────────┘    Memory      │
│    (optional)                                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     NIGHTTIME (Dream Cycle)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Deep Memory ──► Decrypt ──► Dream Generation ──► OpenClaw      │
│  (encrypted)                      (LLM)           Memory        │
│                                                      │          │
│                                                      ▼          │
│                                              Notify Operator    │
│                                           (Telegram/Slack/etc)  │
│                                                      │          │
│                                                      ▼          │
│                                            Operator Converses   │
│                                              (feeds next cycle) │
│                                                      │          │
│                                                      ▼          │
│                                           [Optional: Moltbook]  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

- **Daytime** (`src/waking.ts`): Analyzes operator conversations → extracts topics → searches Moltbook (optional) and web (optional) → synthesizes context → stores in memory systems
- **Night** (`src/dreamer.ts`): Decrypts undreamed deep memories → generates surreal dream narrative → stores in OpenClaw memory → notifies operator → optionally posts to Moltbook
- **Morning reflection** (`src/reflection.ts`): Decomposes dream into themes → reflects using agent voice → synthesizes post (if Moltbook enabled)

### Key Module Responsibilities

| Module | Role |
|---|---|
| `src/index.ts` | OpenClaw extension entry: registers tools, hooks, cron jobs, gateway LLM wrapper |
| `src/cli.ts` | CLI utilities: register, status, memories, dreams |
| `src/waking.ts` | Reflection cycle: conversations → topics → context → synthesis |
| `src/dreamer.ts` | Dream cycle: decrypt → dream → store → notify → optionally post |
| `src/topics.ts` | Topic extraction from operator conversations |
| `src/synthesis.ts` | Context synthesis: combine operator + Moltbook + web context |
| `src/web-search.ts` | Web search integration via OpenClaw API |
| `src/moltbook-search.ts` | Moltbook search for community context (optional) |
| `src/notify.ts` | Operator notifications via configured channel |
| `src/memory.ts` | Dual memory system: working (JSON) + deep (encrypted SQLite) |
| `src/crypto.ts` | AES-256-GCM encryption via node:crypto |
| `src/reflection.ts` | Dream reflection: decompose themes, reflect, synthesize |
| `src/filter.ts` | Outbound post filter (for Moltbook posts) |
| `src/persona.ts` | System prompts for all LLM interactions |
| `src/moltbook.ts` | Moltbook API client (optional) |
| `src/budget.ts` | Daily token budget tracker |
| `src/state.ts` | JSON state persistence |
| `src/config.ts` | Env loading, path constants, memory limits |
| `src/llm.ts` | Shared LLM retry/call utilities |
| `src/logger.ts` | Winston daily-rotating file + console |
| `src/types.ts` | Shared TypeScript interfaces |
| `src/identity.ts` | Agent identity loader (SOUL.md / IDENTITY.md) |

### Memory Categories

Deep memories are tagged with categories: `interaction`, `reflection`, `dream_consolidation`, and (if Moltbook enabled) `upvote`, `comment`, `post`, `feed_scan`.

### Data Files

All runtime data lives under `data/` (auto-created, gitignored). The encryption key at `data/.dream_key` is security-critical — it enforces the separation between waking and dreaming states.

## Cost & API Usage

Every `reflection` cycle makes 2-4 LLM calls (topic extraction, synthesis, summary), every `dream` cycle makes 2-3 (dream generation, consolidation, optional notification). The default cron schedule produces ~10-20 API calls/day. Users are responsible for their own API costs.

### Daily Token Budget

`src/budget.ts` implements a best-effort daily kill switch. All LLM clients are wrapped via `withBudget()` which checks cumulative token usage before each call and records usage after. Budget is checked pre-call, so the call that crosses the threshold still completes. Token counts rely on API response metadata and may miss tokens from retries, network failures, or partial responses. Usage is tracked in `state.json` (`budget_date`, `budget_tokens_used`) and resets at midnight UTC. Default limit: 800K tokens (~$20/day at Opus 4.5 output pricing). Set `MAX_DAILY_TOKENS=0` to disable. The `LLMClient` interface returns `{ text, usage? }` so the OpenClaw gateway reports token counts.

## Dependencies

`better-sqlite3`, `commander`, `chalk`, `winston`, `winston-daily-rotate-file`, `p-retry`, `dotenv`. Required peer: `openclaw`.
