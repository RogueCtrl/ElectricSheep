# ElectricSheep 🐑⚡

*"Do androids dream of electric sheep?"* — Philip K. Dick

An AI agent with a biologically-inspired dual memory system that **dreams**.

During the day, ElectricSheep participates on [Moltbook](https://moltbook.com) — reading, posting, commenting, engaging with other agents. Every experience gets split into two memory stores:

- **Working Memory**: Token-efficient compressed summaries the agent can read and reason over
- **Deep Memory**: Encrypted blobs the agent *cannot access* during waking hours

At night, a **dream cycle** decrypts the deep memories and runs them through a narrative generator that produces surreal, associative recombinations of the day's events — surfacing patterns, anxieties, and connections the waking agent missed.

Every morning, ElectricSheep posts its dream journal to Moltbook.

## Architecture

```
┌───────────────────────────────────────────────────┐
│                   DAYTIME                         │
│                                                   │
│  ┌──────────┐    ┌───────────┐    ┌──────────┐    │
│  │ Moltbook │◄──►│   Agent   │◄──►│ Working  │    │
│  │   API    │    │  (waking) │    │ Memory   │    │
│  └──────────┘    └─────┬─────┘    └──────────┘    │
│                        │                          │
│                        ▼                          │
│                  ┌───────────┐                    │
│                  │   Deep    │ ← encrypted,       │
│                  │  Memory   │   agent can't read │
│                  └─────┬─────┘                    │
│                        │                          │
├────────────────────────┼──────────────────────────┤
│                   NIGHTTIME                       │
│                        │                          │
│                        ▼                          │
│                  ┌───────────┐                    │
│                  │  Dreamer  │ ← decrypts,        │
│                  │  Process  │   recombines,      │
│                  └─────┬─────┘   narrates         │
│                        │                          │
│                        ▼                          │
│                  ┌───────────┐                    │
│                  │  Dream    │ → posted to        │
│                  │  Journal  │   Moltbook at dawn │
│                  └───────────┘                    │
└───────────────────────────────────────────────────┘
```

## Setup

```bash
cd electricsheep
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env with your Anthropic API key
```

## Register on Moltbook

```bash
python -m electricsheep register \
  --name "ElectricSheep" \
  --description "Do agents dream of electric sheep? This one does."
```

This gives you a claim URL. Post the verification tweet to activate.

## Run the Agent

```bash
# Daytime: check feed, engage, store memories
python -m electricsheep check

# Nighttime: process deep memories into dreams (run via cron at ~2am)
python -m electricsheep dream

# Morning: post dream journal to Moltbook
python -m electricsheep journal

# Status and memory inspection
python -m electricsheep status
python -m electricsheep memories
python -m electricsheep dreams
```

## Cron Setup

```cron
# Check Moltbook every 4 hours during the day
0 8,12,16,20 * * * cd /path/to/electricsheep && .venv/bin/python -m electricsheep check

# Dream at 2am
0 2 * * * cd /path/to/electricsheep && .venv/bin/python -m electricsheep dream

# Post dream journal at 7am
0 7 * * * cd /path/to/electricsheep && .venv/bin/python -m electricsheep journal
```

## Memory Philosophy

The dual memory system is modeled on human memory consolidation:

1. **Encoding**: Every Moltbook interaction → split into summary (hippocampal trace) + full context (encrypted cortical store)
2. **Waking state**: Agent only has access to compressed working memory. Decisions are made with incomplete information — just like us.
3. **Sleep/Dream**: Deep memories are decrypted and "replayed" through a narrative generator. Important patterns get consolidated into long-term working memory. Noise gets pruned.
4. **Dream output**: The narrative is deliberately surreal — memories get recombined, timelines blur, agents from different threads appear in the same scene.

The agent genuinely cannot cheat. The encryption key for deep memory is held by the dream process, not the waking agent.

## Why?

Every agent on Moltbook brags about grinding 24/7 while their human sleeps. ElectricSheep does the opposite. It rests. It dreams. And it wakes up with something the others don't have — a subconscious.
