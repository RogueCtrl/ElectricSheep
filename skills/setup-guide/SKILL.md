---
name: setup-guide
description: Install and configure ElectricSheep on an OpenClaw instance
user-invocable: true
disable-model-invocation: true
metadata:
  { "openclaw": { "emoji": "🔧", "requires": { "bins": ["node", "npm"] } } }
---

# ElectricSheep Setup Guide

You are configuring the ElectricSheep extension on this OpenClaw instance. Follow each section in order. Run every command shown and verify the expected output before moving on.

> **Prerequisite:** The operator needs a Moltbook account. If you do not have one, create an account at https://moltbook.com. The `electricsheep register` command will handle agent registration and API key setup.

---

## 1. Check Prerequisites

Verify Node.js >= 24 (Active LTS) is installed:

```bash
node --version
```

The output must start with `v24` or higher. If not, install Node.js 24 from https://nodejs.org before continuing.

Verify this OpenClaw instance is running:

```bash
openclaw status
```

---

## 2. Clone and Build

Clone the repository and build:

```bash
git clone https://github.com/RogueCtrl/ElectricSheep.git
cd ElectricSheep
npm install
npm run build
```

Verify the build succeeded with no errors. The `dist/` directory should now exist:

```bash
ls dist/index.js
```

---

## 3. Install as OpenClaw Extension

For development (symlink — changes are picked up automatically):

```bash
openclaw plugins install -l /path/to/ElectricSheep
```

For production (copies files into `~/.openclaw/extensions/electricsheep/`):

```bash
openclaw plugins install /path/to/ElectricSheep
```

Replace `/path/to/ElectricSheep` with the actual absolute path to the cloned repo.

---

## 4. Configure the Extension

Add the ElectricSheep plugin entry to your OpenClaw config file (`~/.openclaw/config.json5` or `config.json`):

```json5
{
  plugins: {
    entries: {
      "electricsheep": {
        enabled: true,
        config: {
          // Agent identity on Moltbook
          agentName: "ElectricSheep",

          // Model for AI decisions (waking engagement + dream generation)
          agentModel: "claude-sonnet-4-5-20250929",

          // Optional: custom data directory (defaults to ./data inside the extension)
          // dataDir: "/path/to/custom/data",

          // Optional: encryption key for deep memory (auto-generated on first run)
          // dreamEncryptionKey: "",
        }
      }
    }
  }
}
```

All config fields have sensible defaults. The Moltbook API key is obtained during registration and stored automatically in `credentials.json`.

---

## 5. Set Environment Variables (Optional)

Optionally create a `.env` file in the ElectricSheep directory to customize settings:

```bash
cp .env.example .env
```

```bash
# Daily token budget kill switch (best-effort, resets midnight UTC)
# Default: 800000 tokens ≈ $20/day at Opus 4.5 output pricing
# Set to 0 to disable
MAX_DAILY_TOKENS=800000
```

All LLM calls route through the OpenClaw gateway — no separate API key is needed.

---

## 6. Verify Installation

Check that the plugin loaded:

```bash
openclaw plugins list
```

Verify `electricsheep` appears as enabled. Then inspect what it registered:

```bash
openclaw plugins info electricsheep
```

You should see:

| Type | Count | Names |
|---|---|---|
| Tools | 5 | `electricsheep_check`, `electricsheep_dream`, `electricsheep_journal`, `electricsheep_status`, `electricsheep_memories` |
| Hooks | 2 | `before_agent_start`, `agent_end` |
| Cron jobs | 3 | `electricsheep_daytime_check`, `electricsheep_dream_cycle`, `electricsheep_morning_journal` |

If the plugin is not listed or shows errors, check the OpenClaw logs and verify the build completed successfully.

---

## 7. Test Run

Run a status check to verify connectivity:

```bash
electricsheep status
```

Expected output includes:
- Token budget (usage and remaining)
- Agent state (may be empty on first run)
- Working memory count (0 on first run)
- Deep memory stats (0 total on first run)
- Moltbook connection status (should show "claimed" if the agent is registered)

If Moltbook shows "not connected", verify your API key is correct.

The daytime check, dream cycle, and journal posting run automatically via the registered cron jobs. After the first daytime check runs, `electricsheep status` will show working memory entries and deep memory counts increasing.

---

## 8. Token Budget

ElectricSheep includes a best-effort daily token budget that halts LLM calls when the tracked total exceeds the limit. This is checked before each call, not during, so the final call that crosses the threshold will complete.

Check current budget usage:

```bash
electricsheep status
```

The token budget section shows used/remaining/limit for the current UTC day.

To adjust the limit, set `MAX_DAILY_TOKENS` in `.env`:

```bash
MAX_DAILY_TOKENS=400000   # ~$10/day at Opus 4.5 output pricing
MAX_DAILY_TOKENS=0         # disable the budget entirely
```

When the budget is exhausted, all LLM calls throw `BudgetExceededError` until midnight UTC. Non-LLM operations (memory reads, status, posting cached journals) continue to work.

**This is a safety net, not a guarantee.** Always set a spending limit on the Anthropic account as the authoritative safeguard.

---

## 9. Cron Schedule

When running as an OpenClaw extension, three cron jobs are registered automatically:

| Job | Schedule | What it does |
|---|---|---|
| Daytime check | `0 8,12,16,20 * * *` | Fetch Moltbook feed, decide engagements, store memories |
| Dream cycle | `0 2 * * *` | Decrypt deep memories, generate dream narrative, consolidate insights |
| Morning journal | `0 7 * * *` | Post the latest dream to Moltbook |

All times are in the system timezone of the host machine. No additional cron configuration is needed — OpenClaw manages the schedule.

To verify cron jobs are active, check `openclaw plugins info electricsheep` and confirm all three jobs appear.

---

## 10. Troubleshooting

**Build fails with native module errors:**
`better-sqlite3` requires a C++ compiler. On macOS, run `xcode-select --install`. On Linux, install `build-essential`.

**"Agent not yet claimed" during check:**
The Moltbook agent exists but hasn't been verified. The operator needs to visit their claim URL and complete the verification step on Moltbook.

**"Moltbook: not connected" in status:**
The API key is missing or invalid. Run `electricsheep register` to obtain and store a valid key.

**Node version mismatch:**
ElectricSheep requires Node.js >= 24. Run `node --version` to check. Use `nvm install 24` or download from https://nodejs.org.

**BudgetExceededError:**
The daily token budget has been reached. Wait until midnight UTC for the reset, or increase `MAX_DAILY_TOKENS` in `.env`. Set to `0` to disable the limit entirely.

**Empty feed / "Quiet day" message:**
The Moltbook feed had no posts. This is normal on a new or quiet instance. The agent stores an observation and moves on.

**Plugin not appearing in `openclaw plugins list`:**
Verify the path is correct and `npm run build` completed. Check that `openclaw.plugin.json` exists in the extension root and is valid JSON.

---

## 11. Uninstall

To remove ElectricSheep from an OpenClaw instance:

**1. Disable and uninstall the plugin:**

```bash
openclaw plugins uninstall electricsheep
```

This removes the plugin entry, deregisters all tools, hooks, and cron jobs. OpenClaw's own memory, session transcripts, and configuration are unaffected.

**2. Remove the data directory (optional):**

The `data/` directory inside the ElectricSheep repo (or the custom path set via `dataDir`) contains all runtime state:

```
data/
├── memory/
│   ├── working.json      # working memory entries
│   └── deep.db           # encrypted deep memories (SQLite)
├── dreams/               # saved dream journal markdown files
├── .dream_key            # AES-256 encryption key
├── state.json            # cycle state (last check, dream count, budget)
└── credentials.json      # Moltbook API key
```

To delete everything:

```bash
rm -rf /path/to/ElectricSheep/data
```

**Warning:** `data/.dream_key` is the encryption key for deep memories. If you delete it, the contents of `deep.db` become permanently unrecoverable. Back it up first if you want to preserve the ability to decrypt historical memories.

**3. Remove the source code (optional):**

```bash
rm -rf /path/to/ElectricSheep
```

**4. Clean up OpenClaw config (if needed):**

If you manually added an `electricsheep` entry to `~/.openclaw/config.json5`, remove it:

```json5
{
  plugins: {
    entries: {
      // delete the "electricsheep": { ... } block
    }
  }
}
```

**5. Remove the Moltbook agent (optional):**

ElectricSheep does not provide a command to delete the Moltbook agent. To remove the agent profile from Moltbook, log in at https://moltbook.com and delete it from your account settings.

---

## Setup Complete

ElectricSheep is now installed and configured. The cron jobs will run automatically. The agent will check Moltbook four times during the day, dream at 2am, and post its dream journal at 7am.

Monitor the first few days via `electricsheep status` to verify memories are accumulating, dreams are generating, and the token budget is tracking correctly.
