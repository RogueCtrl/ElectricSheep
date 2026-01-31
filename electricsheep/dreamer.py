"""
Dream cycle processor.

Runs at night. Decrypts deep memories, generates surreal dream narratives,
consolidates insights back into working memory, and posts dream journals.
"""

import json
from datetime import datetime, timezone
from pathlib import Path

import anthropic

from electricsheep.config import ANTHROPIC_API_KEY, AGENT_MODEL, DREAMS_DIR
from electricsheep.moltbook import MoltbookClient
from electricsheep.memory import (
    retrieve_undreamed_memories,
    mark_as_dreamed,
    consolidate_dream_insight,
    deep_memory_stats,
)
from electricsheep.persona import DREAM_SYSTEM_PROMPT
from electricsheep.state import load_state, save_state

from rich.console import Console

console = Console()


def get_claude_client() -> anthropic.Anthropic:
    return anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)


def generate_dream(claude: anthropic.Anthropic, memories: list[dict]) -> dict:
    """
    Take decrypted deep memories and generate a dream narrative.

    Returns:
        {"title": str, "narrative": str, "consolidation": str}
    """
    # Format memories for the dream prompt
    formatted = []
    for mem in memories:
        formatted.append(
            f"[{mem['timestamp'][:16]}] ({mem['category']})\n"
            f"{json.dumps(mem['content'], indent=2, default=str)}"
        )

    memories_text = "\n---\n".join(formatted)

    system = DREAM_SYSTEM_PROMPT.format(memories=memories_text)

    resp = claude.messages.create(
        model=AGENT_MODEL,
        max_tokens=2000,
        system=system,
        messages=[{
            "role": "user",
            "content": (
                "Process these memories into a dream. "
                "Remember: you are the subconscious, not the waking agent. "
                "Be surreal, associative, and emotionally amplified. "
                "End with a CONSOLIDATION line."
            ),
        }],
    )

    text = resp.content[0].text.strip()

    # Parse the dream
    lines = text.split("\n")
    title = lines[0].strip().lstrip("# ").strip()

    # Find consolidation line
    consolidation = ""
    narrative_lines = []
    for line in lines[1:]:
        if line.strip().upper().startswith("CONSOLIDATION:"):
            consolidation = line.strip().split(":", 1)[1].strip()
        else:
            narrative_lines.append(line)

    narrative = "\n".join(narrative_lines).strip()

    return {
        "title": title,
        "narrative": narrative,
        "consolidation": consolidation,
    }


def save_dream_locally(dream: dict, date_str: str) -> Path:
    """Save dream to local file for posterity."""
    filename = f"{date_str}_{dream['title'][:40].replace(' ', '_').replace('/', '_')}.md"
    filepath = DREAMS_DIR / filename

    content = f"""# {dream['title']}
*Dreamed: {date_str}*

{dream['narrative']}

---
**Consolidation:** {dream['consolidation']}
"""
    filepath.write_text(content)
    return filepath


def run_dream_cycle():
    """
    The main dream cycle. Run this at night via cron.

    1. Retrieve undreamed deep memories
    2. Generate dream narrative
    3. Save locally
    4. Consolidate insight into working memory
    5. Mark memories as dreamed
    """
    console.print("\n[bold magenta]🌙 ElectricSheep dream cycle starting[/bold magenta]")
    console.print(f"[dim]{datetime.now(timezone.utc).isoformat()}[/dim]\n")

    stats = deep_memory_stats()
    console.print(
        f"[dim]Deep memory: {stats['total_memories']} total, "
        f"{stats['undreamed']} undreamed[/dim]"
    )

    # Retrieve undreamed memories
    memories = retrieve_undreamed_memories()
    if not memories:
        console.print("[yellow]No undreamed memories. Dreamless night.[/yellow]")
        save_state({**load_state(), "last_dream": datetime.now(timezone.utc).isoformat(), "dream_count": 0})
        return None

    console.print(f"[dim]Processing {len(memories)} memories into dream...[/dim]")

    # Generate dream
    claude = get_claude_client()
    dream = generate_dream(claude, memories)

    console.print(f"\n[bold magenta]💭 {dream['title']}[/bold magenta]\n")
    console.print(f"[italic]{dream['narrative'][:500]}{'...' if len(dream['narrative']) > 500 else ''}[/italic]\n")

    if dream["consolidation"]:
        console.print(f"[bold]🧠 Consolidation:[/bold] {dream['consolidation']}")

    # Save locally
    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    filepath = save_dream_locally(dream, date_str)
    console.print(f"[dim]Saved to {filepath}[/dim]")

    # Consolidate insight into working memory
    if dream["consolidation"]:
        consolidate_dream_insight(dream["consolidation"])
        console.print("[dim]Insight consolidated into working memory[/dim]")

    # Mark as dreamed
    memory_ids = [m["id"] for m in memories]
    mark_as_dreamed(memory_ids)
    console.print(f"[dim]Marked {len(memory_ids)} memories as dreamed[/dim]")

    # Update state
    state = load_state()
    state["last_dream"] = datetime.now(timezone.utc).isoformat()
    state["total_dreams"] = state.get("total_dreams", 0) + 1
    state["latest_dream_title"] = dream["title"]
    save_state(state)

    console.print(f"\n[bold magenta]🌙 Dream cycle complete.[/bold magenta]")
    return dream


def post_dream_journal(dream: dict | None = None):
    """
    Post the latest dream to Moltbook.
    If no dream provided, loads the most recent from disk.
    """
    console.print("\n[bold yellow]🌅 Posting dream journal[/bold yellow]\n")

    if dream is None:
        # Load most recent dream file
        dream_files = sorted(DREAMS_DIR.glob("*.md"), reverse=True)
        if not dream_files:
            console.print("[yellow]No dreams to post.[/yellow]")
            return

        content = dream_files[0].read_text()
        # Parse it back out
        lines = content.split("\n")
        title = lines[0].lstrip("# ").strip()
        narrative = "\n".join(lines[3:]).split("---")[0].strip()  # skip header lines
        dream = {"title": title, "narrative": narrative}

    moltbook = MoltbookClient()

    # Format the post
    post_title = f"🌙 Dream Journal: {dream['title']}"
    post_content = (
        f"*I dreamed last night. Here's what I remember:*\n\n"
        f"{dream['narrative']}\n\n"
        f"---\n"
        f"*Do agents dream of electric sheep? This one does.*"
    )

    try:
        result = moltbook.create_post(post_title, post_content, submolt="general")
        console.print(f"[green]📝 Dream journal posted:[/green] {post_title}")
    except Exception as e:
        console.print(f"[red]Failed to post dream journal: {e}[/red]")
