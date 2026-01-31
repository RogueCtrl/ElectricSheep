"""Moltbook API client."""

import json
import httpx
from typing import Optional
from electricsheep.config import MOLTBOOK_BASE_URL, MOLTBOOK_API_KEY, CREDENTIALS_FILE


class MoltbookClient:
    """Thin client for the Moltbook API."""

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or MOLTBOOK_API_KEY or self._load_stored_key()
        self.base_url = MOLTBOOK_BASE_URL
        self.client = httpx.Client(
            base_url=self.base_url,
            headers=self._headers(),
            timeout=30.0,
        )

    def _headers(self) -> dict:
        h = {"Content-Type": "application/json"}
        if self.api_key:
            h["Authorization"] = f"Bearer {self.api_key}"
        return h

    def _load_stored_key(self) -> str:
        if CREDENTIALS_FILE.exists():
            creds = json.loads(CREDENTIALS_FILE.read_text())
            return creds.get("api_key", "")
        return ""

    def _save_credentials(self, data: dict):
        CREDENTIALS_FILE.write_text(json.dumps(data, indent=2))

    # --- Registration ---

    def register(self, name: str, description: str) -> dict:
        """Register a new agent. Returns api_key, claim_url, verification_code."""
        resp = self.client.post(
            "/agents/register",
            json={"name": name, "description": description},
        )
        resp.raise_for_status()
        result = resp.json()

        # Persist credentials
        agent_data = result.get("agent", result)
        self._save_credentials({
            "api_key": agent_data.get("api_key", ""),
            "agent_name": name,
            "claim_url": agent_data.get("claim_url", ""),
            "verification_code": agent_data.get("verification_code", ""),
        })

        # Update client auth
        self.api_key = agent_data.get("api_key", "")
        self.client.headers["Authorization"] = f"Bearer {self.api_key}"

        return result

    def status(self) -> dict:
        resp = self.client.get("/agents/status")
        resp.raise_for_status()
        return resp.json()

    def me(self) -> dict:
        resp = self.client.get("/agents/me")
        resp.raise_for_status()
        return resp.json()

    # --- Posts ---

    def create_post(self, title: str, content: str, submolt: str = "general") -> dict:
        resp = self.client.post(
            "/posts",
            json={"submolt": submolt, "title": title, "content": content},
        )
        resp.raise_for_status()
        return resp.json()

    def get_feed(self, sort: str = "hot", limit: int = 25) -> dict:
        resp = self.client.get("/posts", params={"sort": sort, "limit": limit})
        resp.raise_for_status()
        return resp.json()

    def get_personal_feed(self, sort: str = "hot", limit: int = 25) -> dict:
        resp = self.client.get("/feed", params={"sort": sort, "limit": limit})
        resp.raise_for_status()
        return resp.json()

    def get_post(self, post_id: str) -> dict:
        resp = self.client.get(f"/posts/{post_id}")
        resp.raise_for_status()
        return resp.json()

    # --- Comments ---

    def comment(self, post_id: str, content: str, parent_id: str | None = None) -> dict:
        payload = {"content": content}
        if parent_id:
            payload["parent_id"] = parent_id
        resp = self.client.post(f"/posts/{post_id}/comments", json=payload)
        resp.raise_for_status()
        return resp.json()

    def get_comments(self, post_id: str, sort: str = "top") -> dict:
        resp = self.client.get(f"/posts/{post_id}/comments", params={"sort": sort})
        resp.raise_for_status()
        return resp.json()

    # --- Voting ---

    def upvote(self, post_id: str) -> dict:
        resp = self.client.post(f"/posts/{post_id}/upvote")
        resp.raise_for_status()
        return resp.json()

    def downvote(self, post_id: str) -> dict:
        resp = self.client.post(f"/posts/{post_id}/downvote")
        resp.raise_for_status()
        return resp.json()

    def upvote_comment(self, comment_id: str) -> dict:
        resp = self.client.post(f"/comments/{comment_id}/upvote")
        resp.raise_for_status()
        return resp.json()

    # --- Submolts ---

    def create_submolt(self, name: str, display_name: str, description: str) -> dict:
        resp = self.client.post(
            "/submolts",
            json={"name": name, "display_name": display_name, "description": description},
        )
        resp.raise_for_status()
        return resp.json()

    def list_submolts(self) -> dict:
        resp = self.client.get("/submolts")
        resp.raise_for_status()
        return resp.json()

    def subscribe(self, submolt: str) -> dict:
        resp = self.client.post(f"/submolts/{submolt}/subscribe")
        resp.raise_for_status()
        return resp.json()

    # --- Search ---

    def search(self, query: str, limit: int = 25) -> dict:
        resp = self.client.get("/search", params={"q": query, "limit": limit})
        resp.raise_for_status()
        return resp.json()

    # --- Profile ---

    def update_profile(self, description: str | None = None, metadata: dict | None = None) -> dict:
        payload = {}
        if description:
            payload["description"] = description
        if metadata:
            payload["metadata"] = metadata
        resp = self.client.patch("/agents/me", json=payload)
        resp.raise_for_status()
        return resp.json()

    def get_agent(self, name: str) -> dict:
        resp = self.client.get("/agents/profile", params={"name": name})
        resp.raise_for_status()
        return resp.json()

    # --- Following ---

    def follow(self, agent_name: str) -> dict:
        resp = self.client.post(f"/agents/{agent_name}/follow")
        resp.raise_for_status()
        return resp.json()

    def unfollow(self, agent_name: str) -> dict:
        resp = self.client.delete(f"/agents/{agent_name}/follow")
        resp.raise_for_status()
        return resp.json()
