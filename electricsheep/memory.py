"""
Dual memory system: Working Memory + Encrypted Deep Memory.

The waking agent only has access to working memory (compressed summaries).
Deep memories are encrypted and can only be read by the dream process.
"""

import json
import sqlite3
import hashlib
from datetime import datetime, timezone
from typing import Optional
from pathlib import Path

from cryptography.fernet import Fernet

from electricsheep.config import (
    DEEP_MEMORY_DB,
    WORKING_MEMORY_FILE,
    WORKING_MEMORY_MAX_ENTRIES,
    DREAM_ENCRYPTION_KEY,
    DATA_DIR,
)


# ─── Encryption Key Management ──────────────────────────────────────────────

KEY_FILE = DATA_DIR / ".dream_key"


def get_or_create_dream_key() -> bytes:
    """Get the dream encryption key. Only the dream process should call this."""
    if DREAM_ENCRYPTION_KEY:
        return DREAM_ENCRYPTION_KEY.encode()

    if KEY_FILE.exists():
        return KEY_FILE.read_bytes()

    key = Fernet.generate_key()
    KEY_FILE.write_bytes(key)
    KEY_FILE.chmod(0o600)  # owner-only read
    return key


def get_cipher() -> Fernet:
    """Get the Fernet cipher for deep memory encryption."""
    return Fernet(get_or_create_dream_key())


# ─── Deep Memory (Encrypted) ────────────────────────────────────────────────


def _init_deep_db():
    """Initialize the deep memory SQLite database."""
    conn = sqlite3.connect(str(DEEP_MEMORY_DB))
    conn.execute("""
        CREATE TABLE IF NOT EXISTS deep_memories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            category TEXT NOT NULL,
            encrypted_blob BLOB NOT NULL,
            content_hash TEXT NOT NULL,
            dreamed INTEGER DEFAULT 0,
            dream_date TEXT
        )
    """)
    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_deep_dreamed
        ON deep_memories(dreamed, timestamp)
    """)
    conn.commit()
    conn.close()


def store_deep_memory(content: dict, category: str = "interaction"):
    """
    Encrypt and store a memory in deep storage.

    The waking agent calls this but CANNOT read it back.
    Only the dream process has the decryption key in its environment.
    """
    _init_deep_db()
    cipher = get_cipher()

    raw = json.dumps(content, default=str).encode()
    encrypted = cipher.encrypt(raw)
    content_hash = hashlib.sha256(raw).hexdigest()[:16]

    conn = sqlite3.connect(str(DEEP_MEMORY_DB))
    conn.execute(
        """INSERT INTO deep_memories (timestamp, category, encrypted_blob, content_hash)
           VALUES (?, ?, ?, ?)""",
        (datetime.now(timezone.utc).isoformat(), category, encrypted, content_hash),
    )
    conn.commit()
    conn.close()


def retrieve_undreamed_memories() -> list[dict]:
    """
    Decrypt and return all memories that haven't been dreamed yet.
    ONLY the dream process should call this.
    """
    _init_deep_db()
    cipher = get_cipher()

    conn = sqlite3.connect(str(DEEP_MEMORY_DB))
    rows = conn.execute(
        """SELECT id, timestamp, category, encrypted_blob
           FROM deep_memories WHERE dreamed = 0 ORDER BY timestamp""",
    ).fetchall()
    conn.close()

    memories = []
    for row_id, ts, category, blob in rows:
        try:
            decrypted = json.loads(cipher.decrypt(blob))
            memories.append({
                "id": row_id,
                "timestamp": ts,
                "category": category,
                "content": decrypted,
            })
        except Exception:
            # Corrupted memory — skip it, note the gap
            memories.append({
                "id": row_id,
                "timestamp": ts,
                "category": "corrupted",
                "content": {"note": "This memory could not be recovered."},
            })

    return memories


def mark_as_dreamed(memory_ids: list[int]):
    """Mark memories as processed by the dream cycle."""
    if not memory_ids:
        return
    _init_deep_db()
    conn = sqlite3.connect(str(DEEP_MEMORY_DB))
    placeholders = ",".join("?" for _ in memory_ids)
    conn.execute(
        f"""UPDATE deep_memories
            SET dreamed = 1, dream_date = ?
            WHERE id IN ({placeholders})""",
        [datetime.now(timezone.utc).isoformat()] + memory_ids,
    )
    conn.commit()
    conn.close()


def deep_memory_stats() -> dict:
    """Get stats about deep memory — safe for waking agent (no content exposed)."""
    _init_deep_db()
    conn = sqlite3.connect(str(DEEP_MEMORY_DB))
    total = conn.execute("SELECT COUNT(*) FROM deep_memories").fetchone()[0]
    undreamed = conn.execute(
        "SELECT COUNT(*) FROM deep_memories WHERE dreamed = 0"
    ).fetchone()[0]
    categories = conn.execute(
        "SELECT category, COUNT(*) FROM deep_memories GROUP BY category"
    ).fetchall()
    conn.close()

    return {
        "total_memories": total,
        "undreamed": undreamed,
        "dreamed": total - undreamed,
        "categories": dict(categories),
    }


# ─── Working Memory (Compressed, Readable) ──────────────────────────────────


def _load_working_memory() -> list[dict]:
    if WORKING_MEMORY_FILE.exists():
        return json.loads(WORKING_MEMORY_FILE.read_text())
    return []


def _save_working_memory(memories: list[dict]):
    WORKING_MEMORY_FILE.write_text(json.dumps(memories, indent=2, default=str))


def store_working_memory(summary: str, category: str = "interaction", metadata: dict | None = None):
    """
    Store a compressed memory summary in working memory.
    This is what the waking agent sees.
    """
    memories = _load_working_memory()

    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "category": category,
        "summary": summary,
    }
    if metadata:
        entry["metadata"] = metadata

    memories.append(entry)

    # Prune oldest if over limit
    if len(memories) > WORKING_MEMORY_MAX_ENTRIES:
        memories = memories[-WORKING_MEMORY_MAX_ENTRIES:]

    _save_working_memory(memories)


def get_working_memory(limit: int | None = None, category: str | None = None) -> list[dict]:
    """Get working memory entries the waking agent can use for context."""
    memories = _load_working_memory()

    if category:
        memories = [m for m in memories if m.get("category") == category]

    if limit:
        memories = memories[-limit:]

    return memories


def get_working_memory_context(max_tokens_approx: int = 2000) -> str:
    """Get working memory formatted as context for the agent's system prompt."""
    memories = _load_working_memory()
    if not memories:
        return "No memories yet. This is my first day."

    lines = []
    # Estimate ~4 chars per token, work backwards from most recent
    char_budget = max_tokens_approx * 4
    char_count = 0

    for mem in reversed(memories):
        line = f"[{mem['timestamp'][:16]}] ({mem['category']}) {mem['summary']}"
        if char_count + len(line) > char_budget:
            lines.insert(0, f"... ({len(memories) - len(lines)} older memories omitted)")
            break
        lines.insert(0, line)
        char_count += len(line)

    return "\n".join(lines)


def consolidate_dream_insight(insight: str, source_category: str = "dream_consolidation"):
    """
    Called by the dream process to promote a dream insight into working memory.
    This is how dreams change the waking agent's behavior.
    """
    store_working_memory(
        summary=f"[DREAM INSIGHT] {insight}",
        category=source_category,
    )


# ─── Dual Store Helper ──────────────────────────────────────────────────────


def remember(summary: str, full_context: dict, category: str = "interaction"):
    """
    Store an experience in both memory systems simultaneously.

    - summary → working memory (agent can read)
    - full_context → deep memory (encrypted, only dreams can read)
    """
    store_working_memory(summary, category)
    store_deep_memory(full_context, category)
