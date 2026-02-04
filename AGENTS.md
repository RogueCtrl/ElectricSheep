# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository. `CLAUDE.md` is a symlink to this file.

## Project Overview

ElectricSheep is an OpenClaw extension (TypeScript) that gives an agent an encrypted memory system. It synthesizes the agent's interactions with their human operator, enriching them with context from web searches and (optionally) the Moltbook AI agent community. The core conceit: all memories are encrypted in deep storage — only the dream process can decrypt them. The waking agent sees nothing from ElectricSheep directly; dream insights surface through OpenClaw memory.

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

# CLI utilities (standalone, no OpenClaw needed)
npx electricsheep register --name "Name" --description "Bio"  # Moltbook registration (optional)
npx electricsheep status     # show agent state, memory stats, budget info
npx electricsheep dreams     # list saved dream journal files

# Tests
npm test                     # node:test + tsx, runs test/**/*.test.ts
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

## PR Process & Releasing

Use conventional commit prefixes in PR titles. When a PR merges to main, the release workflow automatically bumps the version, updates the changelog, and pushes a git tag.

| Prefix | Version Bump | Example |
|--------|--------------|---------|
| `major:` | 0.2.0 → 1.0.0 | `major: redesign plugin API` |
| `feat:` | 0.2.0 → 0.3.0 | `feat: add slack notifications` |
| `refactor:` | 0.2.0 → 0.3.0 | `refactor: new synthesis pipeline` |
| `fix:` | 0.2.0 → 0.2.1 | `fix: memory leak in dreamer` |
| `bug:` | 0.2.0 → 0.2.1 | `bug: crash on empty input` |
| `docs:` | 0.2.0 → 0.2.1 | `docs: update setup guide` |
| `chore:` | 0.2.0 → 0.2.1 | `chore: bump dependencies` |

Commits containing `BREAKING CHANGE` in the body also trigger a major bump.

**Workflow:**
1. Create PR with conventional commit prefix in title
2. CI runs build → lint → format:check → test
3. Merge to main
4. Release workflow automatically:
   - Determines version bump from commit message
   - Runs `standard-version` to update version and CHANGELOG.md
   - Creates a release branch + PR back to main with tag `vX.Y.Z`

No manual release steps required — just merge and the release happens.

## Architecture

### OpenClaw Extension Entry

`src/index.ts` exports a `register(api)` function called by the OpenClaw plugin loader. It registers:

**5 tools:**
- `electricsheep_reflect` — run the reflection cycle (analyze conversations, gather context, synthesize)
- `electricsheep_check` — legacy alias for `electricsheep_reflect`
- `electricsheep_dream` — run the dream cycle (decrypt, dream, consolidate). Note: when triggered via this tool (not cron), the `api` is not passed to `runDreamCycle`, so OpenClaw memory storage and operator notifications are skipped
- `electricsheep_journal` — post latest dream to Moltbook (no-op if Moltbook disabled)
- `electricsheep_status` — return agent state and deep memory stats

**2 hooks:**
- `before_agent_start` — captures `workspaceDir` for identity loading
- `agent_end` — captures `conversationSummary` and stores it via `remember()` as an `interaction`

**3 cron jobs:**
- `electricsheep_reflection_cycle` at `0 8,12,16,20 * * *` — runs the full reflection cycle with API
- `electricsheep_dream_cycle` at `0 2 * * *` — runs the full dream cycle with API (includes OpenClaw memory + operator notification)
- `electricsheep_morning_journal` at `0 7 * * *` — posts dream journal to Moltbook (only fires if `MOLTBOOK_ENABLED`)

`openclaw.plugin.json` defines the plugin manifest and config schema.

### Configuration

Configuration is driven by environment variables, loaded in `src/config.ts` via `dotenv`. The `openclaw.plugin.json` config schema maps to these same env vars when the plugin is configured through OpenClaw.

| Env Var | Type | Default | Description |
|---------|------|---------|-------------|
| `AGENT_NAME` | string | `"ElectricSheep"` | Agent display name |
| `AGENT_MODEL` | string | `"claude-sonnet-4-5-20250929"` | Claude model for LLM calls |
| `ELECTRICSHEEP_DATA_DIR` | string | project root | Base directory (data/ created inside) |
| `DREAM_ENCRYPTION_KEY` | string | `""` | Base64 AES-256 key (auto-generated if empty) |
| `MOLTBOOK_ENABLED` | boolean | `false` | Enable Moltbook integration |
| `WEB_SEARCH_ENABLED` | boolean | `true` | Enable web search for context gathering |
| `NOTIFICATION_CHANNEL` | string | `""` | Channel for dream notifications (telegram, discord, etc.) |
| `NOTIFY_OPERATOR_ON_DREAM` | boolean | `true` | Send "I had a dream" message to operator |
| `POST_FILTER_ENABLED` | boolean | `true` | Content filter for outbound Moltbook posts |
| `MAX_DAILY_TOKENS` | number | `800000` | Daily token budget (0 to disable) |

### LLM Client

`LLMClient` interface in `src/types.ts` abstracts Claude access. The OpenClaw gateway is injected via `register(api)` and wrapped into an `LLMClient` by `wrapGateway()` in `src/index.ts`. The wrapper is then further wrapped by `withBudget()` for token budget enforcement.

### Extended OpenClaw API

The plugin uses these optional OpenClaw APIs when available:
- `api.memory` — store dreams and reflections in OpenClaw's persistent memory
- `api.channels` — send dream notifications to operator via configured channels
- `api.webSearch` — search the web for context related to operator conversations

### Encrypted Memory System

All memories are stored in encrypted deep memory via `remember()`:

**Deep Memory** (`data/memory/deep.db`) — all context encrypted with AES-256-GCM in a SQLite database (WAL mode, 3 indices). The waking agent writes to it but **cannot read it**. The encryption key lives in `data/.dream_key` (auto-generated, `chmod 0o600`). Dream insights surface to the waking agent only through OpenClaw memory, and dream reflections optionally post to Moltbook.

### Memory Categories

Deep memories are tagged with categories:
- `interaction` — operator conversations captured by the `agent_end` hook
- `reflection` — synthesized context from the reflection cycle
- `observation` — logged when there are no conversations or no extractable topics
- `dream_consolidation` — insights extracted from dream narratives
- `corrupted` — assigned at read time if a deep memory fails decryption

When Moltbook is enabled, additional categories may appear: `upvote`, `comment`.

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

- **Daytime** (`src/waking.ts`): Queries deep memory for recent interactions → extracts topics via LLM → searches Moltbook (optional) and web (optional) → synthesizes context via LLM → stores reflection in deep memory
- **Night** (`src/dreamer.ts`): Decrypts all undreamed deep memories → generates surreal dream narrative via LLM → saves markdown locally → consolidates insight via LLM → stores in OpenClaw memory → notifies operator → marks memories as dreamed
- **Morning** (`src/reflection.ts`): Decomposes dream into themes → reflects in agent's voice → applies content filter → posts to Moltbook (only if enabled)

### Module Responsibilities

| Module | Role |
|---|---|
| `src/index.ts` | OpenClaw extension entry: registers tools, hooks, cron jobs; wraps gateway into budgeted LLM client |
| `src/cli.ts` | CLI commands: `register`, `status`, `dreams` (via Commander) |
| `src/waking.ts` | Reflection cycle: conversations → topics → context → synthesis → memory |
| `src/dreamer.ts` | Dream cycle: decrypt → dream → save → consolidate → store in OpenClaw memory → notify; also `postDreamJournal` for Moltbook |
| `src/topics.ts` | Topic extraction from recent interaction deep memories |
| `src/synthesis.ts` | Context gathering orchestrator: calls topics, web-search, moltbook-search; LLM synthesis |
| `src/web-search.ts` | Web search per topic via OpenClaw `api.webSearch` |
| `src/moltbook-search.ts` | Moltbook search per topic via `MoltbookClient.search()` |
| `src/notify.ts` | Dream notification generation (LLM) and delivery via `api.channels` |
| `src/memory.ts` | Encrypted deep memory system (SQLite); `remember()`, `getRecentDeepMemories()`, `formatDeepMemoryContext()` |
| `src/crypto.ts` | `Cipher` class (AES-256-GCM); `getOrCreateDreamKey()` for key management |
| `src/reflection.ts` | Dream reflection: decompose themes, reflect in agent voice, synthesize Moltbook post |
| `src/filter.ts` | Outbound content filter: loads rules from `Moltbook-filter.md`, fail-closed on error |
| `src/persona.ts` | All system prompt templates with `{{placeholder}}` substitution via `renderTemplate()` |
| `src/moltbook.ts` | `MoltbookClient` REST client (register, post, comment, upvote, search, feed, etc.) |
| `src/budget.ts` | Daily token budget: `withBudget()` wrapper, `BudgetExceededError`, usage tracking in state |
| `src/state.ts` | `AgentState` JSON persistence with atomic writes (tmp + rename) |
| `src/config.ts` | Env loading via dotenv, path constants, memory/LLM limits; creates data directories on import |
| `src/llm.ts` | `callWithRetry()` wrapper around `p-retry`; `WAKING_RETRY_OPTS` (3 retries, 1-10s) and `DREAM_RETRY_OPTS` (3 retries, 2-20s) |
| `src/logger.ts` | Winston logger with daily-rotating file + console transport |
| `src/identity.ts` | Loads `SOUL.md` / `IDENTITY.md` from workspace dir with path traversal protection; caches result |
| `src/types.ts` | All shared TypeScript interfaces (`LLMClient`, `OpenClawAPI`, `DecryptedMemory`, `Dream`, etc.) |

### Key Constants (from `src/config.ts`)

| Constant | Value | Usage |
|----------|-------|-------|
| `DEEP_MEMORY_CONTEXT_TOKENS` | 2000 | Token budget for deep memory context in prompts (~8000 chars) |
| `MAX_TOPICS_PER_CYCLE` | 5 | Max topics extracted per reflection cycle |
| `MAX_WEB_RESULTS_PER_TOPIC` | 3 | Web results fetched per topic |
| `MAX_MOLTBOOK_RESULTS_PER_TOPIC` | 5 | Moltbook results fetched per topic |
| `MAX_DAILY_TOKENS` | 800,000 | Daily token budget (~$20/day at Opus 4.5 output pricing) |
| `MAX_TOKENS_DREAM` | 2000 | Max output tokens for dream generation |
| `MAX_TOKENS_SYNTHESIS` | 2000 | Max output tokens for context synthesis |
| `MAX_TOKENS_REFLECTION` | 1500 | Max output tokens for dream reflection |
| `MAX_TOKENS_TOPIC_EXTRACTION` | 500 | Max output tokens for topic extraction |
| `MAX_TOKENS_SUMMARY` | 150 | Max output tokens for summaries |
| `MAX_TOKENS_CONSOLIDATION` | 150 | Max output tokens for dream consolidation |

### Data Directory Layout

All runtime data lives under `data/` (auto-created by `config.ts`, gitignored):

```
data/
├── memory/
│   ├── deep.db                   # Encrypted deep memory (SQLite, WAL mode)
│   ├── deep.db-wal               # SQLite WAL file
│   ├── deep.db-shm               # SQLite shared memory
│   └── state.json                # Agent state (last_check, total_dreams, budget, etc.)
├── dreams/
│   └── YYYY-MM-DD_slug.md        # Dream narrative markdown files
├── .dream_key                    # AES-256 key (base64, chmod 600) — security-critical
├── credentials.json              # Moltbook API credentials (if registered)
└── electricsheep-YYYY-MM-DD.log  # Daily rotating log files
```

The encryption key at `data/.dream_key` enforces the separation between waking and dreaming states. It is created with exclusive mode (`wx` flag) and `0o600` permissions.

## Cost & API Usage

Every reflection cycle makes 2-3 LLM calls (topic extraction, synthesis, summary). Every dream cycle makes 2-3 (dream generation, consolidation, optional notification message). The default cron schedule (4 reflections + 1 dream per day) produces ~10-15 API calls/day.

### Daily Token Budget

`src/budget.ts` implements a best-effort daily kill switch. All LLM clients are wrapped via `withBudget()` which checks cumulative token usage before each call and records usage after. Budget is checked pre-call, so the call that crosses the threshold still completes. Token counts rely on API response metadata and may miss tokens from retries, network failures, or partial responses. Usage is tracked in `state.json` (`budget_date`, `budget_tokens_used`) and resets at midnight UTC. Default limit: 800K tokens. Set `MAX_DAILY_TOKENS=0` to disable. The `LLMClient` interface returns `{ text, usage? }` so the OpenClaw gateway reports token counts.

## Test Coverage

Tests live in `test/` and use `node:test` with `tsx`. Each test creates an isolated temp dir via `ELECTRICSHEEP_DATA_DIR`.

| Test File | Modules Covered |
|---|---|
| `test/crypto.test.ts` | `Cipher`, `getOrCreateDreamKey` |
| `test/memory.test.ts` | Deep memory functions, `getRecentDeepMemories`, `formatDeepMemoryContext`, `remember` |
| `test/state.test.ts` | `loadState`, `saveState` |
| `test/budget.test.ts` | `withBudget`, budget tracking, `BudgetExceededError` |
| `test/persona.test.ts` | `renderTemplate`, prompt template validation |
| `test/dreamer.test.ts` | `runDreamCycle` with mock LLM |
| `test/waking.test.ts` | `runReflectionCycle` with mock LLM |
| `test/reflection.test.ts` | `reflectOnDreamJournal` |
| `test/filter.test.ts` | `applyFilter`, `clearFilterCache` |
| `test/moltbook.test.ts` | `MoltbookClient` (with `globalThis.fetch` mocking) |

Not currently tested: `index.ts`, `topics.ts`, `synthesis.ts`, `web-search.ts`, `moltbook-search.ts`, `notify.ts`, `identity.ts`, `llm.ts`, `cli.ts`, `config.ts`, `logger.ts`.

## Dependencies

**Runtime:** `better-sqlite3`, `commander`, `chalk`, `winston`, `winston-daily-rotate-file`, `p-retry`, `dotenv`

**Peer:** `openclaw` (>=1.0.0)

**Dev:** `typescript`, `tsx`, `eslint`, `typescript-eslint`, `eslint-config-prettier`, `prettier`, `standard-version`, `@types/better-sqlite3`, `@types/node`

**Node:** >=24.0.0 | **Module system:** ESM (`"type": "module"`) | **Target:** ES2023
