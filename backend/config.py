import os
from dotenv import load_dotenv

# Load local .env file in daemon directory
load_dotenv()

# Workspace config
WORKSPACE_ROOT = os.getenv("WORKSPACE_ROOT", os.path.expanduser("~/archon-workspace"))
VAULT_PATH = WORKSPACE_ROOT

# Port configurations
DAEMON_PORT = int(os.getenv("DAEMON_PORT", 8765))

# API Keys
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
CEREBRAS_API_KEY = os.getenv("CEREBRAS_API_KEY", "")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY", "")
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "")
