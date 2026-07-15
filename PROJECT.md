# Project: Archon Batch 4 Functional Fixes

## Architecture
- React + Vite Frontend GUI
- Daemon Backend API (main.py, council_debate.py)

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Exploration & Fix Strategy | Locate all target files, verify current tests, suggest implementation plan | None | IN_PROGRESS |
| 2 | Council & Research Implementation | Apply R1, R2, R3, R4 functional fixes | M1 | PLANNED |
| 3 | Review & Challenge | Verify correctness, completeness, robustness, and layout of changes | M2 | PLANNED |
| 4 | Forensic Audit & Verification | Run tests, build frontend, perform static/runtime analysis, final audit | M3 | PLANNED |

## Interface Contracts
### Council Debate (Frontend <-> Backend)
- Backend daemon/council_debate.py includes "model": agent_name in the payload passed to send_token_callback("token", ...) so the frontend can route debate member tokens.
- Frontend CouncilMode.tsx extracts final response from councilMessages["Council Consensus"]?.[0]?.content and renders it via <ReactMarkdown>.

### Research Mode (Frontend <-> WebSocket)
- WebSocketContext.tsx handles status/gate messages to update citations state.
- ResearchMode.tsx renders research text and citations list, handles export.

## Code Layout
- Frontend code: frontend/AI-OS-GUI/artifacts/archon/src
- Backend daemon code: daemon/
