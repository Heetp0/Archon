# Project: Archon AI OS Code Review & Remediation

## Architecture
- **Frontend (React + Vite)**: SPA architecture connecting via WebSockets to the Python daemon. Located under `frontend/AI-OS-GUI/artifacts/archon/src/`.
- **Backend (FastAPI Daemon)**: Asynchronous FastAPI daemon handling agent runtime, model routing, shell execution, semantic cache, markitdown formatting, and vault search/indexing. Located under `daemon/`.
- **Communication Protocol**: JSON-RPC or custom JSON schemas over WebSocket.

## Code Layout
- Frontend Source: `frontend/AI-OS-GUI/artifacts/archon/src/`
- Backend Source: `daemon/`
- Frontend Build Config: `frontend/AI-OS-GUI/artifacts/archon/vite.config.ts`
- Backend Dependencies: `requirements.txt` and `daemon/requirements.txt`

## Milestones
| # | Name | Scope | Dependencies | Status | Conversation ID |
|---|------|-------|-------------|--------|-----------------|
| M1 | Env Setup & Backend Baseline | Install dependencies (langgraph, pytest-asyncio), run baseline backend tests, analyze failures. | None | DONE | c0e6a317-55a8-45ef-8221-477994254965 |
| M2 | Backend Security & Core | Fix critical command injections, environment race conditions, and basic runtime path traversal issues (C-01, C-02, C-03, C-12, C-13, H-13, H-17, H-18, H-19, H-20, H-21, H-22, H-23). | M1 | DONE | bfbfff05-8965-4e25-9dd5-8fecf582d811 |
| M3 | Backend DB, Async & Services | Fix blocking event loop calls, SQLite concurrency, cascade delete, memory database indexing, parsing bugs (H-14, H-15, H-16, M-10, M-11, M-12, M-13, M-14, M-15, M-16, M-17, L-06, L-07, L-08, L-09). | M2 | DONE | b961d697-27ed-45fe-a0f5-b74e2ede600d |
| M4 | Frontend Core, State & WS | Fix WebSocket pathing, event handling, gating deadlocks, state persistence, token rendering throttles, custom hooks (C-04, C-05, C-06, C-07, C-08, C-09, C-10, C-11, H-04, H-05, H-06, H-08, H-09, H-10, H-11, M-01, M-02, M-03, M-04, M-05, M-07, M-08, M-18, L-01, L-02). | M1 | DONE | 9d6f75eb-2909-4fec-95da-389679247dc7 |
| M5 | Frontend Layout & UI Polish | Fix scroll areas, layout clipping, settings/modal responsive design, build output path (H-01, H-02, H-03, H-07, H-24, M-06, M-09, L-03, L-04, L-05, L-10). | M4 | DONE | ed283e57-61e3-445d-b692-f99e8e4a1d8f |
| M6 | Integration, Build & Audit | Final Vitest/Pytest run, Vite bundle chunking optimization, and Forensic Audit verification. | M3, M5 | IN_PROGRESS | N/A |

## Interface Contracts
### Frontend WebSocket ? Backend Daemon
- WebSocket path: `/ws`
- Message format: `{event: string, payload: any, id?: string}`
- Auto-populate "content" and "text" to keep both frontend and test suite happy.








