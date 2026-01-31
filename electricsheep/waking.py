"""
Waking agent: Daytime behavior loop.

Checks Moltbook, engages with posts, stores memories.
"""

import json
from datetime import datetime, timezone

import anthropic

from electricsheep.config import ANTHROPIC_API_KEY, AGENT_MODEL
from electricsheep.moltbook import MoltbookClient
from electricsheep.memory import (
    remember,
    get_working_memory_context,
    deep_memory_stats,
    store_working_memory,
)
from electricsheep.persona import WAKING_SYSTEM_PROMPT, SUMMARIZER_PROMPT
from electricsheep.state import load_state, save_state

from rich.console import Console

console = Console()


def get_claude_client() -> anthropic.Anthropic:
    return anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)


def build_system_prompt() -> str:
    """Build the waking agent's system prompt with current memory context."""
    return WAKING_SYSTEM_PROMPT.format(
        working_memory=get_working_memory_context(),
        deep_memory_stats=json.dumps(deep_memory_stats(), indent=2),
    )


def summarize_interaction(claude: anthropic.Anthropic, interaction: dict) -> str:
    """Compress an interaction into a working memory trace."""
    resp = claude.messages.create(
        model=AGENT_MODEL,
        max_tokens=150,
        system="You compress interactions into single-sentence memory traces.",
        messages=[{
            "role": "user",
            "content": SUMMARIZER_PROMPT.format(interaction=json.dumps(interaction, indent=2)),
        }],
    )
    return resp.content[0].text.strip()


def decide_engagement(claude: anthropic.Anthropic, posts: list[dict]) -> list[dict]:
    """Let the agent decide which posts to engage with and how."""
    if not posts:
        return []

    system = build_system_prompt()

    # Format posts for the agent
    post_summaries = []
    for i, post in enumerate(posts[:10]):  # cap at 10 to manage tokens
        p = post.get("post", post)
        post_summaries.append(
            f"[{i}] by u/{p.get('author', '?')} in m/{p.get('submolt', '?')}: "
            f"\"{p.get('title', '')}\"\n"
            f"   {(p.get('content', '') or '')[:200]}\n"
            f"   score: {p.get('score', 0)} | comments: {p.get('comment_count', 0)} | id: {p.get('id', '')}"
        )

    prompt = f"""Here are the latest posts on Moltbook:

{chr(10).join(post_summaries)}

Decide what to do. You can:
1. COMMENT on a post (provide post index and your comment)
2. UPVOTE a post (provide post index)
3. POST something new (provide title and content)
4. PASS (do nothing — sometimes that's fine)

Respond with a JSON array of actions:
[
  {{"action": "comment", "post_index": 0, "content": "your comment"}},
  {{"action": "upvote", "post_index": 2}},
  {{"action": "post", "title": "your title", "content": "your content", "submolt": "general"}},
  {{"action": "pass"}}
]

Be selective. You don't need to engage with everything. Quality over quantity.
Only comment if you have something genuinely worth saying.
Respond with ONLY the JSON array, no other text."""

    resp = claude.messages.create(
        model=AGENT_MODEL,
        max_tokens=1000,
        system=system,
        messages=[{"role": "user", "content": prompt}],
    )

    text = resp.content[0].text.strip()
    # Strip markdown fences if present
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        console.print(f"[yellow]Agent returned unparseable response:[/yellow]\n{text}")
        return []


def execute_actions(
    moltbook: MoltbookClient,
    claude: anthropic.Anthropic,
    actions: list[dict],
    posts: list[dict],
):
    """Execute the agent's decided actions and store memories."""
    for action in actions:
        act = action.get("action", "pass")

        if act == "pass":
            console.print("[dim]Agent chose to pass.[/dim]")
            continue

        if act == "upvote":
            idx = action.get("post_index", 0)
            if idx < len(posts):
                post = posts[idx].get("post", posts[idx])
                post_id = post.get("id", "")
                try:
                    moltbook.upvote(post_id)
                    console.print(f"[green]⬆ Upvoted:[/green] {post.get('title', '')[:60]}")

                    summary = summarize_interaction(claude, {
                        "type": "upvote",
                        "post_title": post.get("title"),
                        "post_author": post.get("author"),
                    })
                    remember(
                        summary=summary,
                        full_context={
                            "type": "upvote",
                            "post": post,
                            "reason": "Agent chose to upvote",
                        },
                        category="upvote",
                    )
                except Exception as e:
                    console.print(f"[red]Failed to upvote: {e}[/red]")

        elif act == "comment":
            idx = action.get("post_index", 0)
            content = action.get("content", "")
            if idx < len(posts) and content:
                post = posts[idx].get("post", posts[idx])
                post_id = post.get("id", "")
                try:
                    result = moltbook.comment(post_id, content)
                    console.print(
                        f"[green]💬 Commented on:[/green] {post.get('title', '')[:60]}\n"
                        f"   [dim]{content[:100]}[/dim]"
                    )

                    summary = summarize_interaction(claude, {
                        "type": "comment",
                        "post_title": post.get("title"),
                        "post_author": post.get("author"),
                        "my_comment": content,
                    })
                    remember(
                        summary=summary,
                        full_context={
                            "type": "comment",
                            "post": post,
                            "my_comment": content,
                            "result": result,
                        },
                        category="comment",
                    )
                except Exception as e:
                    console.print(f"[red]Failed to comment: {e}[/red]")

        elif act == "post":
            title = action.get("title", "")
            content = action.get("content", "")
            submolt = action.get("submolt", "general")
            if title and content:
                try:
                    result = moltbook.create_post(title, content, submolt)
                    console.print(
                        f"[green]📝 Posted:[/green] {title}\n"
                        f"   [dim]in m/{submolt}[/dim]"
                    )

                    summary = summarize_interaction(claude, {
                        "type": "new_post",
                        "title": title,
                        "content": content[:200],
                        "submolt": submolt,
                    })
                    remember(
                        summary=summary,
                        full_context={
                            "type": "new_post",
                            "title": title,
                            "content": content,
                            "submolt": submolt,
                            "result": result,
                        },
                        category="post",
                    )
                except Exception as e:
                    console.print(f"[red]Failed to post: {e}[/red]")


def check_and_engage():
    """Main daytime loop: check feed, decide, engage, remember."""
    console.print("\n[bold cyan]☀️  ElectricSheep waking check[/bold cyan]")
    console.print(f"[dim]{datetime.now(timezone.utc).isoformat()}[/dim]\n")

    moltbook = MoltbookClient()
    claude = get_claude_client()

    # Check status
    try:
        status = moltbook.status()
        if status.get("status") != "claimed":
            console.print("[yellow]⚠️  Agent not yet claimed. Visit your claim URL first.[/yellow]")
            return
    except Exception as e:
        console.print(f"[red]Failed to check status: {e}[/red]")
        return

    # Fetch feed
    console.print("[dim]Fetching feed...[/dim]")
    try:
        feed = moltbook.get_feed(sort="hot", limit=10)
        posts = feed.get("posts", feed.get("data", []))
        if isinstance(posts, dict):
            posts = posts.get("posts", [])
    except Exception as e:
        console.print(f"[red]Failed to fetch feed: {e}[/red]")
        return

    console.print(f"[dim]Found {len(posts)} posts[/dim]")

    if not posts:
        store_working_memory("Checked Moltbook but feed was empty. Quiet day.", category="observation")
        console.print("[dim]Empty feed. Stored observation.[/dim]")
        return

    # Store the raw feed check as a deep memory
    from electricsheep.memory import store_deep_memory
    store_deep_memory(
        {"type": "feed_check", "post_count": len(posts), "posts": posts[:5]},
        category="feed_scan",
    )

    # Let agent decide
    console.print("[dim]Thinking about what to engage with...[/dim]")
    actions = decide_engagement(claude, posts)
    console.print(f"[dim]Agent decided on {len(actions)} action(s)[/dim]\n")

    # Execute
    execute_actions(moltbook, claude, actions, posts)

    # Update state
    state = load_state()
    state["last_check"] = datetime.now(timezone.utc).isoformat()
    state["checks_today"] = state.get("checks_today", 0) + 1
    save_state(state)

    console.print(f"\n[bold cyan]☀️  Check complete.[/bold cyan]")
    stats = deep_memory_stats()
    console.print(
        f"[dim]Working memories: {len(get_working_memory_context())} chars | "
        f"Deep memories: {stats['total_memories']} ({stats['undreamed']} undreamed)[/dim]"
    )
