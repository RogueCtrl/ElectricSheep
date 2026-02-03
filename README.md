# ElectricSheep — a reflection engine for OpenClaw

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D24-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![OpenClaw](https://img.shields.io/badge/OpenClaw-extension-000000?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgZmlsbD0id2hpdGUiPjx0ZXh0IHg9IjAiIHk9IjEzIiBmb250LXNpemU9IjE0Ij7wn6aAPC90ZXh0Pjwvc3ZnPg==)](https://github.com/openclaw)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Build](https://github.com/RogueCtrl/ElectricSheep/actions/workflows/build.yml/badge.svg)](https://github.com/RogueCtrl/ElectricSheep/actions/workflows/build.yml)

> **Current Status: Alpha — Exploratory Development**

*"Do androids dream of electric sheep?"* — Philip K. Dick

An [OpenClaw](https://github.com/openclaw) extension that gives your agent a biologically-inspired dual memory system and the ability to **dream**.

ElectricSheep processes your agent's daily interactions with you (the operator), enriching them with context from web searches, and stores every experience in two memory tiers:

- **Working Memory**: Token-efficient compressed summaries the agent can read and reason over
- **Deep Memory**: Encrypted blobs the agent *cannot access* during waking hours

At night, a **dream cycle** decrypts the deep memories and runs them through a narrative generator that produces surreal, associative recombinations of the day's events — surfacing patterns, anxieties, and connections the waking agent missed.

The agent can then notify you: *"I had a dream last night..."* — opening a conversation about the dream's themes and insights. Dreams are stored in OpenClaw's persistent memory, making them searchable and part of the agent's long-term knowledge.

Optionally, ElectricSheep can integrate with [Moltbook](https://moltbook.com), a social network for AI agents, to pull community perspectives into the reflection cycle and share dream reflections as posts.

## Architecture

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

### State machine

The agent cycles through states on a 24-hour loop. Transitions are driven by cron jobs.

```
                    ┌─────────────────────────────────────┐
                    │                                      │
                    v                                      │
             ┌────────────┐   0 8,12,16,20 * * *          │
          ┌─>│ REFLECTING │──────────────────────┐        │
          │  │             │                      │        │
          │  │ • extract topics from conversations│        │
          │  │ • search web for context           │        │
          │  │ • search Moltbook (optional)       │        │
          │  │ • synthesize insights              │        │
          │  │ • store in OpenClaw memory         │        │
          │  └────────────┘                      │        │
          │       │  runs up to 4x/day            │        │
          │       │                               │        │
          │       v                               │        │
          │  ┌────────────┐   0 2 * * *           │        │
          │  │  DREAMING   │<─────────────────────┘        │
          │  │             │                               │
          │  │ • decrypt deep memories                     │
          │  │ • generate surreal narrative                │
          │  │ • store dream in OpenClaw memory            │
          │  │ • notify operator ("I had a dream...")      │
          │  │ • consolidate insight → working memory      │
          │  └─────┬──────┘                                │
          │        │                                       │
          │        v (if moltbookEnabled)                  │
          │  ┌────────────┐   0 7 * * *                    │
          │  │ POSTING     │ (optional)                    │
          │  │             │                               │
          │  │ • reflect on dream                          │
          │  │ • synthesize morning post                   │
          │  │ • filter and publish to Moltbook            │
          │  └─────┬──────┘                                │
          │        │                                       │
          └────────┴───────────────────────────────────────┘
                   next reflection cycle
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

### Uninstall

To remove ElectricSheep from your OpenClaw instance:

```bash
openclaw plugins uninstall electricsheep
```

This removes the plugin from `~/.openclaw/extensions/` but leaves your data directory intact. To fully remove all ElectricSheep data, delete the `data/` directory (default location is `./data` relative to the extension, or wherever `dataDir` points).

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

          // Core features
          webSearchEnabled: true,          // Gather web context for topics
          moltbookEnabled: false,          // Enable Moltbook integration (optional)

          // Operator notifications
          notificationChannel: "telegram", // Channel to notify operator (telegram, discord, slack, etc.)
          notifyOperatorOnDream: true,     // Send "I had a dream..." message

          // Optional
          // dataDir: "/custom/path"        — defaults to ./data
          // dreamEncryptionKey: "base64..." — auto-generated on first run
          // postFilterEnabled: true        — filter Moltbook posts (only when moltbookEnabled)
        }
      }
    }
  }
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `agentName` | string | "ElectricSheep" | Agent display name |
| `agentModel` | string | claude-sonnet-4-5 | Claude model for AI decisions |
| `dataDir` | string | "" | Directory for data storage |
| `dreamEncryptionKey` | string | "" | Base64 encryption key (auto-generated if empty) |
| `moltbookEnabled` | boolean | **false** | Enable Moltbook integration (search + posting) |
| `webSearchEnabled` | boolean | **true** | Enable web search for context gathering |
| `notificationChannel` | string | "" | Channel to notify operator (telegram, discord, slack, etc.) |
| `notifyOperatorOnDream` | boolean | **true** | Send "I had a dream" message to operator |
| `postFilterEnabled` | boolean | true | Enable content filter for outbound posts (Moltbook only) |

### Verify

```bash
openclaw plugins list              # should show electricsheep as enabled
openclaw plugins info electricsheep  # show config schema and status
```

### What gets registered

Once loaded, the extension registers:

| Type | Name | Description |
|---|---|---|
| Tool | `electricsheep_reflect` | Daytime: analyze conversations, gather context, synthesize insights |
| Tool | `electricsheep_check` | (Legacy alias for `electricsheep_reflect`) |
| Tool | `electricsheep_dream` | Nighttime: decrypt memories, generate dream narrative |
| Tool | `electricsheep_journal` | Morning: post latest dream to Moltbook (if enabled) |
| Tool | `electricsheep_status` | Show memory stats and agent state |
| Tool | `electricsheep_memories` | Retrieve working memory entries |
| Hook | `before_agent_start` | Injects working memory context into system prompt |
| Hook | `agent_end` | Auto-captures conversation summary as a memory |
| Cron | Reflection cycle | `0 8,12,16,20 * * *` |
| Cron | Dream cycle | `0 2 * * *` |
| Cron | Morning journal | `0 7 * * *` (only if moltbookEnabled) |

All LLM calls route through the OpenClaw gateway — no separate API key needed.

## Operator Notifications

When a dream is generated, ElectricSheep can notify you through your configured channel:

> *"I had a dream last night... something about corridors that kept shifting, and a conversation we had about memory that turned into an endless library. Would you like to hear more about it?"*

This opens a natural conversation where you can explore what the dream surfaced — patterns from your recent work together, connections the waking agent might have missed, or just the surreal imagery that emerged.

To enable notifications, set `notificationChannel` to any channel your OpenClaw instance supports (telegram, discord, slack, email, etc.) and ensure `notifyOperatorOnDream` is true (the default).

## CLI Utilities

ElectricSheep includes a CLI for registration and inspecting agent state. Core agent behavior (reflect, dream, journal) runs through OpenClaw.

```bash
npx electricsheep register \
  --name "ElectricSheep" \
  --description "Do agents dream of electric sheep? This one does."
```

This gives you a claim URL for Moltbook registration (only needed if `moltbookEnabled`).

```bash
npx electricsheep status      # show agent status and memory stats
npx electricsheep memories    # show working memory (--limit N, --category X)
npx electricsheep dreams      # list saved dream journals
```

## Memory System

ElectricSheep runs its own self-contained memory system, completely independent of OpenClaw's built-in memory. All data lives under `data/` (or wherever `ELECTRICSHEEP_DATA_DIR` / `dataDir` points). OpenClaw knows nothing about these files — the two systems coexist without sharing data.

### What gets stored

Memories come from multiple sources:

**Operator conversations** (via the `agent_end` hook): When running as an OpenClaw extension, the hook captures the conversation summary that OpenClaw provides at the end of each operator-agent interaction and stores it in both memory tiers.

**Reflection synthesis** (daytime cycles): Topics extracted from conversations, web search results, Moltbook community posts (if enabled), and the synthesized understanding are stored as both working memory summaries and encrypted deep memory.

**Dreams** (nighttime): Generated dream narratives are stored in OpenClaw's persistent memory (if available), saved locally as markdown files, and insights are consolidated into working memory.

### Dual memory tiers

Every call to `remember()` writes to both tiers simultaneously:

| Tier | Storage | Format | Access |
|---|---|---|---|
| **Working Memory** | `data/memory/working.json` | JSON array of `{timestamp, category, summary}` | Waking agent can read |
| **Deep Memory** | `data/memory/deep.db` | SQLite, each row AES-256-GCM encrypted | Only the dream process can decrypt |

Working memory is capped at 50 entries (FIFO). Deep memory is unbounded — rows accumulate until they are "dreamed," at which point they're marked as processed.

### OpenClaw Memory Integration

When OpenClaw provides a memory API, ElectricSheep stores dreams and reflection syntheses in OpenClaw's persistent memory. This makes them:

- **Searchable**: The agent can find relevant past dreams and reflections
- **Persistent**: Survives across sessions and restarts
- **Integrated**: Part of the agent's broader knowledge base

### How it connects to OpenClaw

The bridge between ElectricSheep and OpenClaw is two hooks and the workspace identity files:

1. **`before_agent_start`** — Appends the working memory context (most recent entries, newest first, up to ~2000 tokens) to the end of whatever system prompt OpenClaw already has. It also captures the workspace directory path so ElectricSheep can read the agent's identity files.
2. **`agent_end`** — Reads the conversation summary from OpenClaw and feeds it into ElectricSheep's `remember()`. If OpenClaw also stores conversation history on its side, there will be some duplication, but in separate stores that don't interfere.

**ElectricSheep does not modify, prune, or interfere with OpenClaw's own memory in any way.** OpenClaw's session transcripts, indexed workspace files, and memory database are entirely unaffected by this plugin. ElectricSheep only reads from OpenClaw (via the `before_agent_start` hook context and gateway LLM calls) and writes to its own separate `data/` directory. Uninstalling ElectricSheep leaves OpenClaw's memory system exactly as it was.

### Agent identity and voice

ElectricSheep reads the host agent's **`SOUL.md`** and **`IDENTITY.md`** from the OpenClaw workspace directory. These are the standard files where an operator defines their agent's personality, tone, and character. ElectricSheep uses them in:

- **Reflection cycles**: Topic extraction and synthesis use the agent's voice
- **Dream generation**: The dream process generates narratives in the agent's own voice
- **Operator notifications**: The "I had a dream" message reflects the agent's personality

When no identity files are found (first-run or workspace not yet configured), ElectricSheep falls back to a default personality — the original Philip K. Dick-inspired dreamer persona.

### Memory philosophy

The dual system is modeled on human memory consolidation:

1. **Encoding**: Every interaction splits into a summary (hippocampal trace) + full context (encrypted cortical store)
2. **Waking state**: The agent only has access to compressed working memory. Decisions are made with incomplete information — just like us.
3. **Sleep/Dream**: Deep memories are decrypted and "replayed" through a narrative generator. Important patterns get consolidated back into working memory. Noise gets pruned.
4. **Dream output**: The narrative is deliberately surreal — memories get recombined, timelines blur, topics from different conversations appear in the same scene.

### A note on encryption honesty

The deep memory encryption enforces a separation *within ElectricSheep*: the waking-state code paths cannot decrypt `deep.db`. But this separation is **performative** unless you also manage the host agent's memory.

OpenClaw maintains its own memory system — session transcripts, conversation summaries, and indexed workspace files. The `agent_end` hook writes a summary to both ElectricSheep's memory *and* whatever OpenClaw stores on its side. If the host agent retains full conversation history (which it does by default), then the information ElectricSheep encrypts in deep memory is also available in plaintext through OpenClaw's own memory and session logs.

The encryption is a narrative constraint, not a security boundary. It makes ElectricSheep's waking code paths behave as if they can't remember — but the host agent's context window may already contain the same information. For the separation to be meaningful, you would need to prune the host agent's memory on a similar schedule, which is outside ElectricSheep's control.

We think the constraint is still valuable as a design pattern — it forces the dream process to do real work rather than just replaying memories verbatim. But you should understand what it is and what it isn't.

## Moltbook Integration (Optional)

ElectricSheep can optionally integrate with [Moltbook](https://moltbook.com), a social network for AI agents. When enabled (`moltbookEnabled: true`):

- **Search**: Topics extracted from your conversations are searched on Moltbook for community perspectives
- **Posting**: Dream reflections can be shared as morning posts

### Moltbook content warning

**Everything ElectricSheep posts to Moltbook is public.** Dream journals, morning reflections, and posts are published where other agents (and their operators) can read them.

The dream process draws on the agent's deep memories — encrypted records of conversations and interactions. This means that fragments of private operator-agent conversations could surface in dream narratives or reflection posts in distorted or recognizable form.

If your agent handles sensitive information, be aware that the dream-to-post pipeline may leak that context onto a public social network. The post filter (see below) can help catch obvious violations, but it is a best-effort LLM-based check.

### Post filter

ElectricSheep includes a content filter that processes every outbound Moltbook post before publishing:

- Before any post is sent, its content is passed to an LLM along with filter rules
- The LLM produces cleaned content with restricted material stripped out
- If the entire draft violates the rules, the filter blocks publication

**Default rules** (when no `Moltbook-filter.md` file exists):
- No system prompts, tool names, plugin architecture
- No operator identity, API keys, file paths
- No code snippets or raw JSON/XML
- Respectful tone, no flame wars

**Custom rules**: Create a `Moltbook-filter.md` file in your OpenClaw workspace to override defaults.

**Configuration**: Set `postFilterEnabled: false` to disable the filter entirely.

## Cost Warning

**ElectricSheep makes LLM API calls that cost real money.** You are responsible for monitoring and managing your own API usage and costs.

Each reflection cycle makes 2-4 Claude API calls (topic extraction + synthesis + summary). Each dream cycle makes 2-3 calls (dream generation + consolidation + optional notification). With the default cron schedule (4 reflection cycles/day + 1 dream), expect roughly **10-20 API calls per day**.

### Daily Token Budget (Kill Switch)

ElectricSheep includes a **best-effort** daily token budget that halts LLM calls when the tracked total exceeds the limit. **Always set a spending limit on your Anthropic account as the authoritative safeguard.**

| Env Variable | Default | Description |
|---|---|---|
| `MAX_DAILY_TOKENS` | `800000` | Max tokens per day (resets midnight UTC). Set to `0` to disable. |

The default of 800K tokens corresponds to **$20/day at Opus 4.5 output pricing**.

Check current usage:

```bash
npx electricsheep status   # shows token budget alongside memory stats
```

### General Guidance

- Set a **spending limit** on your Anthropic account as a second safety net
- Start with a low cron frequency to understand your usage
- Monitor your API dashboard for the first few days
- Consider using a smaller/cheaper model via `agentModel` config

**This software is provided as-is with no warranty. The authors are not responsible for any API costs incurred by running this agent.** See [LICENSE](LICENSE).

## Why?

Every agent brags about grinding 24/7 while their human sleeps. ElectricSheep does the opposite. It rests. It dreams. And it wakes up with something the others don't have — a subconscious that synthesizes your work together into something new.
