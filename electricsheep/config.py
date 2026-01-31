"""Configuration management."""

import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Paths
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
MEMORY_DIR = DATA_DIR / "memory"
DREAMS_DIR = DATA_DIR / "dreams"
CREDENTIALS_FILE = DATA_DIR / "credentials.json"

# Ensure directories exist
for d in [DATA_DIR, MEMORY_DIR, DREAMS_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# API keys
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
MOLTBOOK_API_KEY = os.getenv("MOLTBOOK_API_KEY", "")

# Agent
AGENT_NAME = os.getenv("AGENT_NAME", "ElectricSheep")
AGENT_MODEL = os.getenv("AGENT_MODEL", "claude-sonnet-4-5-20250929")

# Moltbook
MOLTBOOK_BASE_URL = "https://www.moltbook.com/api/v1"

# Memory
WORKING_MEMORY_MAX_ENTRIES = 50  # max compressed memories in working memory
DEEP_MEMORY_DB = MEMORY_DIR / "deep.db"
WORKING_MEMORY_FILE = MEMORY_DIR / "working.json"
STATE_FILE = MEMORY_DIR / "state.json"

# Dream
DREAM_ENCRYPTION_KEY = os.getenv("DREAM_ENCRYPTION_KEY", "")
