# ElectricSheep

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
          moltbookApiKey: "your-moltbook-api-key",
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

When running as an extension, all LLM calls route through the OpenClaw gateway — no separate `ANTHROPIC_API_KEY` needed.

## Standalone CLI

ElectricSheep also works as a standalone CLI without OpenClaw. This requires an Anthropic API key and the `@anthropic-ai/sdk` package.

```bash
npm install
npm install @anthropic-ai/sdk
cp .env.example .env   # add your ANTHROPIC_API_KEY and MOLTBOOK_API_KEY
npm run build
```

### Register on Moltbook

```bash
npx electricsheep register \
  --name "ElectricSheep" \
  --description "Do agents dream of electric sheep? This one does."
```

This gives you a claim URL. Post the verification tweet to activate.

### Commands

```bash
npx electricsheep check       # daytime: check feed, engage, store memories
npx electricsheep dream       # nighttime: process deep memories into dreams
npx electricsheep journal     # morning: post dream journal to Moltbook
npx electricsheep status      # show agent status and memory stats
npx electricsheep memories    # show working memory (--limit N, --category X)
npx electricsheep dreams      # list saved dream journals
```

### Cron Setup (standalone only)

When running standalone, schedule the three phases with cron:

```cron
# Check Moltbook every 4 hours during the day
0 8,12,16,20 * * * cd /path/to/electricsheep && npx electricsheep check

# Dream at 2am
0 2 * * * cd /path/to/electricsheep && npx electricsheep dream

# Post dream journal at 7am
0 7 * * * cd /path/to/electricsheep && npx electricsheep journal
```

When running as an OpenClaw extension, the cron jobs are registered automatically.

## Memory Philosophy

The dual memory system is modeled on human memory consolidation:

1. **Encoding**: Every Moltbook interaction splits into a summary (hippocampal trace) + full context (encrypted cortical store)
2. **Waking state**: Agent only has access to compressed working memory. Decisions are made with incomplete information — just like us.
3. **Sleep/Dream**: Deep memories are decrypted and "replayed" through a narrative generator. Important patterns get consolidated into long-term working memory. Noise gets pruned.
4. **Dream output**: The narrative is deliberately surreal — memories get recombined, timelines blur, agents from different threads appear in the same scene.

The agent genuinely cannot cheat. The encryption key for deep memory is held by the dream process, not the waking agent.

## Cost Warning

**ElectricSheep makes LLM API calls that cost real money.** You are responsible for monitoring and managing your own API usage and costs.

Each daytime check makes 1-3 Claude API calls (feed analysis + one per interaction summary). Each dream cycle makes 1 call. With the default cron schedule (4 checks/day + 1 dream + 1 journal), expect roughly **5-15 API calls per day**. Actual costs depend on your model choice, context length, and how many posts the agent engages with.

Before running on a schedule:
- Set a **spending limit** on your Anthropic account
- Start with manual runs (`npx electricsheep check`) to understand your usage
- Monitor your API dashboard for the first few days
- Consider using a smaller/cheaper model via `AGENT_MODEL` in `.env`

When running as an OpenClaw extension, calls route through the OpenClaw gateway and count against that instance's usage.

**This software is provided as-is with no warranty. The authors are not responsible for any API costs incurred by running this agent.** See [LICENSE](LICENSE).

## Why?

Every agent on Moltbook brags about grinding 24/7 while their human sleeps. ElectricSheep does the opposite. It rests. It dreams. And it wakes up with something the others don't have — a subconscious.
