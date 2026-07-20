# Archon — Deployment Guide

## Quick Start (Local)

### Prerequisites
- Python 3.10+
- Node.js 18+ and pnpm
- Ollama (for local embeddings)

### 1. Clone and configure
```bash
git clone <your-repo-url>
cd archon/backend
cp .env.example .env
# Edit .env with your API keys (minimum: GROQ_API_KEY or GEMINI_API_KEY)
```

### 2. Get free API keys
| Provider | URL | Free Tier |
|---|---|---|
| Groq | https://console.groq.com/keys | 30 req/min, 14.4k req/day |
| Gemini | https://aistudio.google.com/app/apikey | 15 req/min, 1.5k req/day |
| Cerebras | https://cloud.cerebras.ai/ | Generous free tier |

### 3. Start Ollama (local embeddings)
```bash
# Install: https://ollama.com/download
ollama pull nomic-embed-text
# Ollama runs at http://localhost:11434 by default
```

### 4. Start the backend
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
# Backend runs at http://localhost:8000
# API docs at http://localhost:8000/docs
```

### 5. Start the frontend
```bash
cd frontend
pnpm install
pnpm --filter @workspace/archon dev
# Frontend runs at http://localhost:5173
```

### 6. Verify everything works
```bash
curl http://localhost:8000/health
# Expected: {"status": "ok", "version": "1.0.0"}

curl http://localhost:8000/models
# Expected: JSON list of available LLM providers
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `WORKSPACE_ROOT` | No | `~/archon-workspace` | Base directory for all data |
| `DAEMON_PORT` | No | `8000` | Backend server port |
| `JWT_SECRET_KEY` | Yes | — | Auth token signing key (32+ chars) |
| `GROQ_API_KEY` | Yes* | — | Groq LLM provider |
| `GEMINI_API_KEY` | Yes* | — | Google Gemini provider |
| `CEREBRAS_API_KEY` | No | — | Cerebras fallback |
| `OPENROUTER_API_KEY` | No | — | OpenRouter fallback |
| `OLLAMA_BASE_URL` | No | `http://localhost:11434` | Local embeddings |
| `TAVILY_API_KEY` | No | — | Web search (Research mode) |
| `MYSCRIPT_APP_ID` | No | — | Handwriting OCR (Android) |
| `MYSCRIPT_HMAC_KEY` | No | — | Handwriting OCR (Android) |
| `LANCEDB_PATH` | No | `{WORKSPACE_ROOT}/.lancedb` | Vector database path |
| `UPLOAD_DIR` | No | `{WORKSPACE_ROOT}/uploads` | Uploaded file storage |

*At least one LLM key (Groq or Gemini) is required for chat functionality.

---

## Railway Deployment

### 1. Push to GitHub
```bash
git add -A
git commit -m "feat: initial deployment setup"
git push origin main
```

### 2. Deploy to Railway
1. Go to https://railway.app → New Project → Deploy from GitHub
2. Select your repo
3. Set environment variables in Railway dashboard (paste all keys from `.env`)
4. Set `WORKSPACE_ROOT=/app/data`
5. Set `SERVER_HOST=0.0.0.0`
6. Railway auto-detects Python and installs requirements

### 3. Configure frontend for production
Update `frontend/artifacts/archon_design/.env.production`:
```
VITE_API_URL=https://your-app.railway.app
```

---

## Oracle Cloud (ARM Free Tier)

### 1. Create instance
- Shape: VM.Standard.A1.Flex (4 OCPU, 24 GB RAM — free)
- OS: Ubuntu 22.04 LTS

### 2. Setup server
```bash
# Install dependencies
sudo apt update && sudo apt install -y python3.11 python3.11-venv nginx git
# Clone your repo
git clone <your-repo-url> /app/archon
cd /app/archon
# Setup backend
cd backend
python3.11 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
# Copy and edit .env
cp .env.example .env && nano .env
```

### 3. Run as systemd service
```bash
sudo tee /etc/systemd/system/archon.service << EOF
[Unit]
Description=Archon Backend
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/app/archon/backend
Environment=PATH=/app/archon/backend/venv/bin
ExecStart=/app/archon/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable archon
sudo systemctl start archon
```

---

## Docker (Local or Server)

```yaml
# docker-compose.yml
version: "3.8"
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    env_file: ./backend/.env
    volumes:
      - archon-data:/app/data
    environment:
      - WORKSPACE_ROOT=/app/data
      - SERVER_HOST=0.0.0.0

volumes:
  archon-data:
```

```bash
docker-compose up -d
curl http://localhost:8000/health
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `ModuleNotFoundError` | Run `pip install -r requirements.txt` in the virtualenv |
| LanceDB fails to start | Ensure `WORKSPACE_ROOT` directory exists and is writable |
| Port 8000 in use | Change `DAEMON_PORT=8001` in `.env` |
| Ollama not available | Backend falls back to fastembed — embeddings still work |
| API key invalid | Check `curl http://localhost:8000/models` — lists active providers |
| CORS error in browser | Verify `allow_origins=["*"]` in `main.py` (already set) |
| Frontend blank screen | Run `pnpm install` again and check browser console for errors |
