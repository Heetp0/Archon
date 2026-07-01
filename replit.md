# The Core — AI Operating System

A local AI Operating System and Command Center with a premium dark-mode web frontend and a FastAPI/WebSocket backend daemon.

## Architecture

### Frontend (`frontend/AI-OS-GUI/`)
A pnpm workspace with a React + Vite + Tailwind artifact at `artifacts/archon`.

**Run the frontend:**
```bash
cd frontend/AI-OS-GUI
pnpm install
pnpm --filter @workspace/archon run dev
```

Serves on the port defined by the `PORT` env var (default via workflow config).

### Backend / Daemon (`daemon/`)
A FastAPI WebSocket server powering all AI agents.

**Run the daemon locally (Python):**
```bash
cd daemon
python -m venv .venv
.venv/Scripts/activate   # Windows
# or: source .venv/bin/activate  (Linux/macOS)
pip install -r requirements.txt
python main.py
```

Default port: `8765`. Configure with `DAEMON_PORT` env var.

## Navigation Modes

| Mode | Icon | Description |
|------|------|-------------|
| Dashboard | LayoutDashboard | Command center overview — stats, agent status, activity feed |
| Chat | MessageSquare | RAG-powered chat with vault context |
| Council | Users | Multi-model debate: Proposer, Critic, Expert, Synthesizer |
| Research | Search | Deep research agent with Tavily web access |
| Agent Runtime | Cpu | Multi-agent runtime dashboard + terminal |
| Obsidian | BookOpen | Obsidian Control Center — skills, scheduling, vault automation |
| Agents Directory | Bot | Registered agents with descriptions + add new agents |

## New Features (added)

- **Dashboard** — stats cards (tokens, latency, active agents, commands), live agent status, activity feed, quick-launch grid
- **Obsidian Control Center** — 10 built-in skills (Daily Briefing, Vault Search, Project Summary, etc.), click-to-run, schedule picker (time + days), add custom skills
- **Agents Directory** — 9 system agents documented with capabilities, live status from WebSocket, expandable cards, add custom agents
- **MCP Settings tab** — configure Model Context Protocol servers (Gmail, Keep, Obsidian, Calendar, File System presets), enable/disable per server
- **Simplified UI** — removed side panels by default, cleaner nav rail, consistent rounded-2xl design language, premium `#08090f` base

## API Keys Required (for daemon)

Set in a `.env` file in the project root:
```
GEMINI_API_KEY=...
GROQ_API_KEY=...
OPENROUTER_API_KEY=...
CEREBRAS_API_KEY=...
MISTRAL_API_KEY=...
TAVILY_API_KEY=...
```

Keys can also be configured via Settings → Providers in the UI (stored in localStorage, pushed to daemon on save).

## Connecting Frontend to Daemon

The frontend tries to connect via WebSocket on load. Configure the host/port in **Settings → Network**. Default: `ws://localhost:8765/ws`.

Note: On Replit (HTTPS), the daemon must be exposed via a WSS (secure WebSocket) tunnel or run locally. The frontend will show "ENTER INTERFACE" if the daemon is unreachable and still lets you navigate the UI.

## User Preferences

- Premium minimalist dark aesthetic (Obsidian/Zinc palette, `#08090f` base)
- Monospace font for all UI labels, clean sans for content
- Rounded-2xl cards, subtle white/5% borders, no heavy gradients
