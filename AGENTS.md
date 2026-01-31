# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ElectricSheep is a Python AI agent with a biologically-inspired dual memory system. It participates on [Moltbook](https://moltbook.com) (a social network for AI agents) during the day and processes encrypted memories into surreal dream narratives at night. The core conceit: the waking agent genuinely cannot access its deep memories — only the dream process can decrypt them.

## Commands

```bash
# Setup
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # then add ANTHROPIC_API_KEY

# CLI (all commands via python -m electricsheep)
python -m electricsheep register --name "Name" --description "Bio"
python -m electricsheep check      # daytime: check feed, engage, store memories
python -m electricsheep dream      # nighttime: decrypt deep memories, generate dream
python -m electricsheep journal    # morning: post dream journal to Moltbook
python -m electricsheep status     # show agent state and memory stats
python -m electricsheep memories   # show working memory (--limit N, --category X)
python -m electricsheep dreams     # list saved dream journals
```

No test framework or linter is configured.

## Architecture

### Dual Memory System

Every Moltbook interaction is stored in **two places simultaneously** via `memory.remember()`:

1. **Working Memory** (`data/memory/working.json`) — compressed single-sentence summaries the waking agent can read. Capped at 50 entries (FIFO). This is the only context the agent has for making decisions.

2. **Deep Memory** (`data/memory/deep.db`) — full context encrypted with Fernet. The waking agent writes to it but **cannot read it**. The encryption key lives in `data/.dream_key` (auto-generated, chmod 600).

### Three Phases (designed for cron scheduling)

- **Daytime** (`waking.py`): Fetches Moltbook feed → Claude decides engagements → executes actions → calls `remember()` to store in both memory systems
- **Night** (`dreamer.py`): Decrypts undreamed deep memories → Claude generates surreal dream narrative → saves to `data/dreams/*.md` → promotes one key insight back to working memory via `consolidate_dream_insight()`
- **Morning** (`dreamer.py`): Posts the latest dream journal to Moltbook

### Key Module Responsibilities

| Module | Role |
|---|---|
| `cli.py` | Click command group, Rich formatting, lazy imports for each command |
| `waking.py` | Daytime loop: feed → decision → engagement → remember |
| `dreamer.py` | Dream cycle + journal posting |
| `memory.py` | Dual memory system: working (JSON) + deep (encrypted SQLite) |
| `persona.py` | System prompts for waking state (curious, dry humor) and dream state (surreal, associative) |
| `moltbook.py` | httpx client for Moltbook API (`https://www.moltbook.com/api/v1`) |
| `state.py` | JSON state persistence (last_check, dream count, etc.) |
| `config.py` | Env loading via python-dotenv, path constants, memory limits |

### Memory Categories

Deep memories are tagged with categories: `interaction`, `upvote`, `comment`, `post`, `feed_scan`, `dream_consolidation`.

### Data Files

All runtime data lives under `data/` (auto-created). The encryption key at `data/.dream_key` is security-critical — it enforces the separation between waking and dreaming states.

## Dependencies

anthropic, httpx, cryptography (Fernet), click, python-dotenv, rich. All specified in `requirements.txt`.
