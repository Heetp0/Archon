---
title: Archon — Task List
project: archon
hub: CodeSpace
type: task-list
status: In Progressd
tags:
  - codespace
  - tasks
date-created: 2026-06-27
---

# Archon — Task List

This file is managed by the Planner agent.

## Tasks

### Task 1: Desktop Wrapper Selection & Window Skeleton
- [x] **Input:** TBD design requirement.
- [x] **Output:** Desktop GUI shell (PySide6 or Tauri skeleton) with a sidebar mode switcher.
- [x] **Acceptance Criteria:** A local window launches showing a sidebar with four options (Normal Chat, Council of AI, Deep Research, Multi-Agent Team) and a placeholder content area.
- **Complexity:** Medium
- **Depends on:** None

### Task 2: Local Vault Markdown Parser & Link Graph
- [x] **Input:** Markdown notes in `SecondBrain/` and `Workspace/`.
- [x] **Output:** Python module `vault_parser.py` that outputs a JSON note metadata graph.
- [x] **Acceptance Criteria:** Successfully parses markdown notes, extracts YAML frontmatter, identifies all outgoing `[[links]]`, and lists broken references.
- **Complexity:** Medium
- **Depends on:** None

### Task 3: Local Vector Indexer & Search Core
- [x] **Input:** `vault_parser.py` outputs.
- [x] **Output:** Vector index database and search module `vault_search.py`.
- [x] **Acceptance Criteria:** Indexes note chunks, supports incremental updates via file modification hashes, and retrieves top-k relevant snippets for a semantic query under 100ms.
- **Complexity:** High
- **Depends on:** Task 2

### Task 4: Council of AI Debate Protocol Prototype
- [x] **Input:** Question string and vault search context from Task 3.
- [x] **Output:** Debate manager class `council_debate.py`.
- [x] **Acceptance Criteria:** Queries multiple selected LLM APIs/local Ollama concurrently, runs a critique iteration, and generates a final consensus with citation links to the source vault notes.
- **Complexity:** High
- **Depends on:** Task 3

### Task 5: Deep Research Crawler & Report Generator
- [x] **Input:** Topic string.
- [x] **Output:** Python module `deep_research.py` with Tavily/DuckDuckGo and crawler integrations.
- [x] **Acceptance Criteria:** Given a research topic, generates search queries, halts to output proposed sources and sub-topics for user approval, and upon approval, crawls at least 5 relevant webpages/sources, compiling a Markdown report with citations.
- **Complexity:** High
- **Depends on:** Task 3

### Task 6: Free-Tier Tiered Model Router
- [x] **Input:** API keys for Groq, Cerebras, Gemini, OpenRouter.
- [x] **Output:** API Router module `model_router.py`.
- [x] **Acceptance Criteria:** Dynamic queuing of requests under rate limits (RPM/TPM), routing heavy tasks to low-RPM large models, and chat/crawl tasks to fast high-RPM models.
- **Complexity:** Medium
- **Depends on:** None

### Task 7: OpenCode CLI Wrapper Integration
- [x] **Input:** Local `opencode` execution access.
- [x] **Output:** Python wrapper `opencode_client.py`.
- [x] **Acceptance Criteria:** Successfully routes code generation and refactoring prompts to `opencode run` from python processes, returning stdout/stderr results to the parent agent.
- **Complexity:** Medium
- **Depends on:** None

### Task 8: Autopilot Supervisor Watchdog (Draft Mode)
- [x] **Input:** Active agent state and execution queues.
- [x] **Output:** Python class `autopilot_supervisor.py` (inactive by default).
- [x] **Acceptance Criteria:** Moniters subagent execution, logs action sequences, and tests automatic execution safety gates (e.g. loops, file size limits) during testing.
- **Complexity:** High
- **Depends on:** Task 7

---
