# Project: Archon Workspace Redesign

## Architecture
- React / Tailwind CSS SPA with wouter routing and Zustand/Context state.
- Vercel Dark Theme visual architecture (pure black backgrounds, thin gray borders, high contrast white text, monochrome controls).
- Unified ChatGPT/Claude-style prompt box with tools exploration and model selector.
- Double-pane NotebookLM layouts and 7 custom workspace mode views.

## Code Layout
- `src/index.css` - Custom styling tokens, `@theme inline`, and layout overrides
- `src/components/chat/ChatInput.tsx` - New unified prompt/input block
- `src/components/modes/DashboardMode.tsx` - Redesigned Dashboard panel
- `src/components/modes/ChatMode.tsx` - Redesigned Chat panel and streaming hooks
- `src/components/modes/CouncilMode.tsx` - Redesigned Council grid and triggers
- `src/components/modes/ResearchMode.tsx` - Redesigned Research reporting pane
- `src/components/modes/NotebookMode.tsx` - Redesigned Notebook split-pane
- `src/components/modes/ObsidianMode.tsx` - Redesigned Obsidian canvas & workspace
- `src/components/modes/AgentMode.tsx` - Redesigned Agent step logs & diffs
- `src/components/modes/AgentsDirectoryMode.tsx` - Redesigned Agents listing

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Global Styles & Theme | Overhaul `src/index.css` with Vercel dark theme variables, Satoshi & Inter font pairing | None | DONE |
| 2 | Unified ChatInput | Build `src/components/chat/ChatInput.tsx` with textarea auto-resize, selector dropdowns, file attachments, and draft saving | M1 | DONE |
| 3 | Interaction Polish | Send/Stop button, abortion logic, message edit-and-resubmit versioning, bubble action overlay, scrolling/loading skeleton | M2 | DONE |
| 4 | Mode Panel Redesigns | Overhaul Dashboard, Chat, Council, Research, Notebook, Obsidian, and Agents mode screens | M3 | DONE |
| 5 | Verification & Compilation | strict type-checks, pnpm run build verification, client-side abort & ingestion validation | M4 | DONE |

## Interface Contracts
### Unified ChatInput
- Accepts placeholder text, current input, model selection, tool activation states, active draft hooks.
- Emits text prompt, model string, list of active tools, attached files.
- Resizes dynamically between 56px and 240px tall.
