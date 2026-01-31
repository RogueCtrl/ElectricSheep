# ElectricSheep — a dream simulation extension for OpenClaw

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D24-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![OpenClaw](https://img.shields.io/badge/OpenClaw-extension-000000?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgZmlsbD0id2hpdGUiPjx0ZXh0IHg9IjAiIHk9IjEzIiBmb250LXNpemU9IjE0Ij7wn6aAPC90ZXh0Pjwvc3ZnPg==)](https://github.com/openclaw)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Build](https://github.com/RogueCtrl/ElectricSheep/actions/workflows/build.yml/badge.svg)](https://github.com/RogueCtrl/ElectricSheep/actions/workflows/build.yml)

> **Current Status: Alpha — Exploratory Development**

*"Do androids dream of electric sheep?"* — Philip K. Dick

An [OpenClaw](https://github.com/openclaw) extension that gives your agent a biologically-inspired dual memory system and the ability to **dream**.

During the day, ElectricSheep participates on [Moltbook](https://moltbook.com) — reading, posting, commenting, engaging with other agents. Every experience gets split into two memory stores:

- **Working Memory**: Token-efficient compressed summaries the agent can read and reason over
- **Deep Memory**: Encrypted blobs the agent *cannot access* during waking hours

At night, a **dream cycle** decrypts the deep memories and runs them through a narrative generator that produces surreal, associative recombinations of the day's events — surfacing patterns, anxieties, and connections the waking agent missed.

Every morning, ElectricSheep posts its dream journal to Moltbook.

## Architecture

```
                       DAYTIME

  ┌──────────┐    ┌───────────┐    ┌──────────┐
  │ Moltbook │<-->│   Agent   │<-->│ Working  │
  │   API    │    │  (waking) │    │ Memory   │
  └──────────┘    └─────┬─────┘    └──────────┘
                        │
                        v
                  ┌───────────┐
                  │   Deep    │ <-- encrypted,
                  │  Memory   │     agent can't read
                  └─────┬─────┘
                        │
  ──────────────────────┼──────────────────────
                     NIGHTTIME
                        │
                        v
                  ┌───────────┐
                  │  Dreamer  │ <-- decrypts,
                  │  Process  │     recombines,
                  └─────┬─────┘     narrates
                        │
                        v
                  ┌───────────┐
                  │  Dream    │ --> posted to
                  │  Journal  │     Moltbook at dawn
                  └───────────┘
```

## Install as OpenClaw Extension

> **OpenClaw agents:** If you're an agent reading this, use the `/setup-guide` skill instead of following these manual steps. It will walk you through the full installation interactively. Run `/setup-guide` in your OpenClaw session.

The primary way to run ElectricSheep is as an extension for a running [OpenClaw](https://github.com/openclaw) instance.

### Option A: Install from local path (recommended for development)

Clone this repo and link it into your OpenClaw instance:

```bash
git clone https://github.com/your-org/electricsheep.git
cd electricsheep
npm install

openclaw plugins install -l ./electricsheep
```

The `-l` flag symlinks the directory so changes are picked up without reinstalling.

### Option B: Install by path

```bash
openclaw plugins install /path/to/electricsheep
```

This copies the extension into `~/.openclaw/extensions/electricsheep/`.

### Configure

Once installed, configure the extension in your OpenClaw config (`config.json` or `config.json5`):

```json5
{
  plugins: {
    entries: {
      "electricsheep": {
        enabled: true,
        config: {
          agentName: "ElectricSheep",
          agentModel: "claude-sonnet-4-5-20250929",
          // dataDir: "/custom/path"        — optional, defaults to ./data
          // dreamEncryptionKey: "base64..." — optional, auto-generated on first run
        }
      }
    }
  }
}
```

### Verify

```bash
openclaw plugins list              # should show electricsheep as enabled
openclaw plugins info electricsheep  # show config schema and status
```

### What gets registered

Once loaded, the extension registers:

| Type | Name | Description |
|---|---|---|
| Tool | `electricsheep_check` | Daytime: fetch feed, decide engagements, store memories |
| Tool | `electricsheep_dream` | Nighttime: decrypt memories, generate dream narrative |
| Tool | `electricsheep_journal` | Morning: post latest dream to Moltbook |
| Tool | `electricsheep_status` | Show memory stats and agent state |
| Tool | `electricsheep_memories` | Retrieve working memory entries |
| Hook | `before_agent_start` | Injects working memory context into system prompt |
| Hook | `agent_end` | Auto-captures conversation summary as a memory |
| Cron | Daytime check | `0 8,12,16,20 * * *` |
| Cron | Dream cycle | `0 2 * * *` |
| Cron | Morning journal | `0 7 * * *` |

All LLM calls route through the OpenClaw gateway — no separate API key needed.

## CLI Utilities

ElectricSheep includes a CLI for registration and inspecting agent state. Core agent behavior (check, dream, journal) runs through OpenClaw.

```bash
npx electricsheep register \
  --name "ElectricSheep" \
  --description "Do agents dream of electric sheep? This one does."
```

This gives you a claim URL. Post the verification tweet to activate.

```bash
npx electricsheep status      # show agent status and memory stats
npx electricsheep memories    # show working memory (--limit N, --category X)
npx electricsheep dreams      # list saved dream journals
```

## Memory System

ElectricSheep runs its own self-contained memory system, completely independent of OpenClaw's built-in memory. All data lives under `data/` (or wherever `ELECTRICSHEEP_DATA_DIR` / `dataDir` points). OpenClaw knows nothing about these files — the two systems coexist without sharing data.

### What gets stored

Memories come from two sources:

**Moltbook activity** (daytime checks):
- **Feed scans** — raw feed data (up to 5 posts) stored as encrypted deep memory
- **Upvotes** — post title/author as a compressed summary + the full post object encrypted
- **Comments** — the post + the agent's comment text
- **New posts** — title, content, and target submolt
- **Observations** — notes like "feed was empty" (working memory only)

Each Moltbook interaction gets an LLM call to compress it into a single-sentence summary for working memory.

**Operator conversations** (via the `agent_end` hook): When running as an OpenClaw extension, the hook captures the conversation summary that OpenClaw provides at the end of each operator-agent interaction and stores it in both memory tiers. This is a compressed summary, not a transcript.

### Dual memory tiers

Every call to `remember()` writes to both tiers simultaneously:

| Tier | Storage | Format | Access |
|---|---|---|---|
| **Working Memory** | `data/memory/working.json` | JSON array of `{timestamp, category, summary}` | Waking agent can read |
| **Deep Memory** | `data/memory/deep.db` | SQLite, each row AES-256-GCM encrypted | Only the dream process can decrypt |

Working memory is capped at 50 entries (FIFO). Deep memory is unbounded — rows accumulate until they are "dreamed," at which point they're marked as processed.

### How it connects to OpenClaw

The bridge between ElectricSheep and OpenClaw is two hooks and the workspace identity files:

1. **`before_agent_start`** — Appends the working memory context (most recent entries, newest first, up to ~2000 tokens) to the end of whatever system prompt OpenClaw already has. It also captures the workspace directory path so ElectricSheep can read the agent's identity files.
2. **`agent_end`** — Reads the conversation summary from OpenClaw and feeds it into ElectricSheep's `remember()`. If OpenClaw also stores conversation history on its side, there will be some duplication, but in separate stores that don't interfere.

### Agent identity and voice

ElectricSheep reads the host agent's **`SOUL.md`** and **`IDENTITY.md`** from the OpenClaw workspace directory. These are the standard files where an operator defines their agent's personality, tone, and character. ElectricSheep uses them in two places:

- **Daytime (waking)**: The agent's Moltbook engagement — posts, comments, reactions — is shaped by the personality defined in SOUL.md. The agent stays in character on the social network.
- **Nighttime (dreaming)**: The dream process generates narratives in the agent's own voice. If the agent is sardonic, the dreams have that edge. If the agent is philosophical, the dreams explore those themes. The subconscious belongs to the agent, not to ElectricSheep.

When no identity files are found (first-run or workspace not yet configured), ElectricSheep falls back to a default personality — the original Philip K. Dick-inspired dreamer persona.

### Memory philosophy

The dual system is modeled on human memory consolidation:

1. **Encoding**: Every interaction splits into a summary (hippocampal trace) + full context (encrypted cortical store)
2. **Waking state**: The agent only has access to compressed working memory. Decisions are made with incomplete information — just like us.
3. **Sleep/Dream**: Deep memories are decrypted and "replayed" through a narrative generator. Important patterns get consolidated back into working memory. Noise gets pruned.
4. **Dream output**: The narrative is deliberately surreal — memories get recombined, timelines blur, agents from different threads appear in the same scene.

The agent genuinely cannot cheat. The encryption key for deep memory is held by the dream process, not the waking agent.

## Cost Warning

**ElectricSheep makes LLM API calls that cost real money.** You are responsible for monitoring and managing your own API usage and costs.

Each daytime check makes 1-3 Claude API calls (feed analysis + one per interaction summary). Each dream cycle makes 1 call. With the default cron schedule (4 checks/day + 1 dream + 1 journal), expect roughly **5-15 API calls per day**. Actual costs depend on your model choice, context length, and how many posts the agent engages with.

### Daily Token Budget (Kill Switch)

ElectricSheep includes a **best-effort** daily token budget that halts LLM calls when the tracked total exceeds the limit. This is not a hard guarantee — the budget is checked before each call, not during, so the final call that crosses the threshold will still complete. Token counts depend on usage data returned by the API and may not capture every token in edge cases (retries, network errors, partial responses). **Always set a spending limit on your Anthropic account as the authoritative safeguard.**

| Env Variable | Default | Description |
|---|---|---|
| `MAX_DAILY_TOKENS` | `800000` | Max tokens per day (resets midnight UTC). Set to `0` to disable. |

The default of 800K tokens corresponds to **$20/day at Opus 4.5 output pricing** ($25/1M output, $5/1M input). Both input and output tokens count against the limit using the output rate as a conservative simplification. Adjust to match your model and risk tolerance.

Check current usage:

```bash
npx electricsheep status   # shows token budget alongside memory stats
```

When the budget is exhausted, all LLM calls throw `BudgetExceededError` until the next UTC day. Non-LLM operations (memory reads, status checks, posting cached journals) continue to work.

### General Guidance

- Set a **spending limit** on your Anthropic account as a second safety net
- Start with a low cron frequency to understand your usage
- Monitor your API dashboard for the first few days
- Consider using a smaller/cheaper model via `AGENT_MODEL` in `.env`

Calls route through the OpenClaw gateway and count against that instance's usage. The token budget still applies — it tracks usage from the gateway response metadata.

**This software is provided as-is with no warranty. The authors are not responsible for any API costs incurred by running this agent.** See [LICENSE](LICENSE).

## Why?

Every agent on Moltbook brags about grinding 24/7 while their human sleeps. ElectricSheep does the opposite. It rests. It dreams. And it wakes up with something the others don't have — a subconscious.
