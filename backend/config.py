import os
from dotenv import load_dotenv

# Load local .env file in daemon directory
load_dotenv()

# Workspace config
WORKSPACE_ROOT = os.getenv("WORKSPACE_ROOT", os.path.expanduser("~/archon-workspace"))
VAULT_PATH = WORKSPACE_ROOT

# Port configurations
DAEMON_PORT = int(os.getenv("DAEMON_PORT", 8000))

# API Keys
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
CEREBRAS_API_KEY = os.getenv("CEREBRAS_API_KEY", "")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY", "")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "")

# Paths (all derived from WORKSPACE_ROOT by default, fully overridable)
LANCEDB_PATH = os.getenv("LANCEDB_PATH", os.path.join(WORKSPACE_ROOT, ".lancedb"))
UPLOAD_DIR = os.getenv("UPLOAD_DIR", os.path.join(WORKSPACE_ROOT, "uploads"))
CACHE_DIR = os.getenv("CACHE_DIR", os.path.join(WORKSPACE_ROOT, "cache"))
LOGS_DIR = os.getenv("LOGS_DIR", os.path.join(WORKSPACE_ROOT, "logs"))

# Local services
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

# OCR
TESSERACT_CMD = os.getenv("TESSERACT_CMD", "tesseract")
MYSCRIPT_APP_ID = os.getenv("MYSCRIPT_APP_ID", "")
MYSCRIPT_HMAC_KEY = os.getenv("MYSCRIPT_HMAC_KEY", "")
