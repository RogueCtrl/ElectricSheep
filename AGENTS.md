# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ElectricSheep is a TypeScript AI agent with a biologically-inspired dual memory system. It participates on [Moltbook](https://moltbook.com) (a social network for AI agents) during the day and processes encrypted memories into surreal dream narratives at night. The core conceit: the waking agent genuinely cannot access its deep memories — only the dream process can decrypt them.

Works both as a standalone CLI and as an OpenClaw extension + skill.

## Commands

```bash
# Setup
npm install
cp .env.example .env  # then add ANTHROPIC_API_KEY

# Build
npm run build

# CLI (all commands via electricsheep)
npx electricsheep register --name "Name" --description "Bio"
npx electricsheep check      # daytime: check feed, engage, store memories
npx electricsheep dream      # nighttime: decrypt deep memories, generate dream
npx electricsheep journal    # morning: post dream journal to Moltbook
npx electricsheep status     # show agent state and memory stats
npx electricsheep memories   # show working memory (--limit N, --category X)
npx electricsheep dreams     # list saved dream journals
```

No test framework or linter is configured.

## Architecture

### Dual Memory System

Every Moltbook interaction is stored in **two places simultaneously** via `remember()`:

1. **Working Memory** (`data/memory/working.json`) — compressed single-sentence summaries the waking agent can read. Capped at 50 entries (FIFO). This is the only context the agent has for making decisions.

2. **Deep Memory** (`data/memory/deep.db`) — full context encrypted with AES-256-GCM. The waking agent writes to it but **cannot read it**. The encryption key lives in `data/.dream_key` (auto-generated, chmod 600).

### Three Phases (designed for cron scheduling)

- **Daytime** (`src/waking.ts`): Fetches Moltbook feed → Claude decides engagements → executes actions → calls `remember()` to store in both memory systems
- **Night** (`src/dreamer.ts`): Decrypts undreamed deep memories → Claude generates surreal dream narrative → saves to `data/dreams/*.md` → promotes one key insight back to working memory via `consolidateDreamInsight()`
- **Morning** (`src/dreamer.ts`): Posts the latest dream journal to Moltbook

### Key Module Responsibilities

| Module | Role |
|---|---|
| `src/cli.ts` | Commander.js CLI, chalk formatting, lazy imports for each command |
| `src/waking.ts` | Daytime loop: feed → decision → engagement → remember |
| `src/dreamer.ts` | Dream cycle + journal posting |
| `src/memory.ts` | Dual memory system: working (JSON) + deep (encrypted SQLite) |
| `src/crypto.ts` | AES-256-GCM encryption via node:crypto |
| `src/persona.ts` | System prompts for waking state (curious, dry humor) and dream state (surreal, associative) |
| `src/moltbook.ts` | fetch + p-retry client for Moltbook API (`https://www.moltbook.com/api/v1`) |
| `src/state.ts` | JSON state persistence (last_check, dream count, etc.) |
| `src/config.ts` | Env loading via dotenv, path constants, memory limits |
| `src/logger.ts` | Winston rotating file + colored console |
| `src/types.ts` | Shared TypeScript interfaces |
| `src/index.ts` | OpenClaw extension entry: tools, hooks, cron jobs |

### LLM Client Abstraction

`LLMClient` interface in `src/types.ts` abstracts Claude access:
- **Standalone mode**: wraps `@anthropic-ai/sdk` (optional peer dependency)
- **OpenClaw mode**: wraps the gateway API injected at `register(api)`

### Memory Categories

Deep memories are tagged with categories: `interaction`, `upvote`, `comment`, `post`, `feed_scan`, `dream_consolidation`.

### Data Files

All runtime data lives under `data/` (auto-created). The encryption key at `data/.dream_key` is security-critical — it enforces the separation between waking and dreaming states.

## OpenClaw Integration

`openclaw.plugin.json` defines the plugin config. `src/index.ts` exports `register(api)` which registers:
- **5 tools**: `electricsheep_check`, `electricsheep_dream`, `electricsheep_journal`, `electricsheep_status`, `electricsheep_memories`
- **Hooks**: `before_agent_start` (inject memory context), `agent_end` (auto-capture summary)
- **3 cron jobs**: daytime check (8/12/16/20), dream cycle (2am), morning journal (7am)

## Dependencies

`better-sqlite3`, `commander`, `chalk`, `winston`, `p-retry`, `dotenv`. Optional peer: `@anthropic-ai/sdk`, `openclaw`.
