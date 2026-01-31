"""
ElectricSheep CLI.

Usage:
    python -m electricsheep register --name "ElectricSheep" --description "I dream."
    python -m electricsheep check        # daytime: check feed, engage, remember
    python -m electricsheep dream        # nighttime: process memories into dreams
    python -m electricsheep journal      # morning: post latest dream to moltbook
    python -m electricsheep status       # show agent status and memory stats
    python -m electricsheep memories     # show working memory
"""

import click
import json
from rich.console import Console
from rich.table import Table

console = Console()


@click.group()
def cli():
    """ElectricSheep — an AI agent that dreams. 🦞💤"""
    pass


@cli.command()
@click.option("--name", required=True, help="Agent name on Moltbook")
@click.option("--description", required=True, help="Agent description")
def register(name: str, description: str):
    """Register a new agent on Moltbook."""
    from electricsheep.moltbook import MoltbookClient

    client = MoltbookClient()
    result = client.register(name, description)

    agent = result.get("agent", result)
    console.print("\n[bold green]✅ Registered![/bold green]\n")
    console.print(f"[bold]API Key:[/bold] {agent.get('api_key', '?')}")
    console.print(f"[bold]Claim URL:[/bold] {agent.get('claim_url', '?')}")
    console.print(f"[bold]Verification:[/bold] {agent.get('verification_code', '?')}")
    console.print("\n[yellow]⚠️  Save your API key to .env as MOLTBOOK_API_KEY[/yellow]")
    console.print("[yellow]⚠️  Visit the claim URL and post the verification tweet[/yellow]")


@cli.command()
def check():
    """Daytime: check Moltbook feed, engage, store memories."""
    from electricsheep.waking import check_and_engage
    check_and_engage()


@cli.command()
def dream():
    """Nighttime: process deep memories into a dream narrative."""
    from electricsheep.dreamer import run_dream_cycle
    run_dream_cycle()


@cli.command()
def journal():
    """Morning: post the latest dream journal to Moltbook."""
    from electricsheep.dreamer import post_dream_journal
    post_dream_journal()


@cli.command()
def status():
    """Show agent status, memory stats, and recent state."""
    from electricsheep.memory import deep_memory_stats, get_working_memory
    from electricsheep.state import load_state
    from electricsheep.moltbook import MoltbookClient

    state = load_state()
    mem_stats = deep_memory_stats()
    working = get_working_memory()

    console.print("\n[bold cyan]🦞 ElectricSheep Status[/bold cyan]\n")

    # State
    table = Table(title="Agent State")
    table.add_column("Key", style="bold")
    table.add_column("Value")
    for k, v in state.items():
        table.add_row(k, str(v))
    console.print(table)

    # Memory stats
    console.print(f"\n[bold]Working Memory:[/bold] {len(working)} entries")
    console.print(f"[bold]Deep Memory:[/bold] {mem_stats['total_memories']} total, {mem_stats['undreamed']} undreamed")
    if mem_stats.get("categories"):
        console.print(f"[bold]Categories:[/bold] {json.dumps(mem_stats['categories'])}")

    # Try Moltbook status
    try:
        client = MoltbookClient()
        moltbook_status = client.status()
        console.print(f"\n[bold]Moltbook:[/bold] {moltbook_status.get('status', '?')}")
        profile = client.me()
        agent = profile.get("agent", profile)
        console.print(f"[bold]Karma:[/bold] {agent.get('karma', 0)}")
    except Exception:
        console.print("\n[yellow]Moltbook: not connected[/yellow]")


@cli.command()
@click.option("--limit", default=20, help="Number of memories to show")
@click.option("--category", default=None, help="Filter by category")
def memories(limit: int, category: str | None):
    """Show working memory entries."""
    from electricsheep.memory import get_working_memory

    mems = get_working_memory(limit=limit, category=category)

    if not mems:
        console.print("[dim]No working memories yet.[/dim]")
        return

    console.print(f"\n[bold cyan]🧠 Working Memory ({len(mems)} entries)[/bold cyan]\n")

    for mem in mems:
        ts = mem["timestamp"][:16]
        cat = mem.get("category", "?")
        summary = mem["summary"]

        if cat == "dream_consolidation":
            console.print(f"  [magenta]{ts}[/magenta] [bold magenta][DREAM][/bold magenta] {summary}")
        else:
            console.print(f"  [dim]{ts}[/dim] [cyan]({cat})[/cyan] {summary}")


@cli.command()
def dreams():
    """List saved dream journals."""
    from electricsheep.config import DREAMS_DIR

    dream_files = sorted(DREAMS_DIR.glob("*.md"), reverse=True)
    if not dream_files:
        console.print("[dim]No dreams yet. Run 'electricsheep dream' after collecting some memories.[/dim]")
        return

    console.print(f"\n[bold magenta]💤 Dream Archive ({len(dream_files)} dreams)[/bold magenta]\n")
    for f in dream_files[:20]:
        first_line = f.read_text().split("\n")[0].lstrip("# ")
        console.print(f"  [dim]{f.stem[:10]}[/dim] {first_line}")


if __name__ == "__main__":
    cli()
