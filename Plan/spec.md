---
title: Archon — Specification
project: archon
hub: CodeSpace
type: project-spec
status: In Progress
hours-total: 6.32
progress: 40
tags:
  - codespace
  - spec
date-created: 2026-06-27
---

# Archon — Specification

## Executive Summary
Archon is a local desktop application for Windows designed to act as a personalized AI Command Center and AI OS. A primary differentiator is its first-class integration with the user's Second Brain vault ("The Core") and the OpenCode CLI. It bridges free-tier AI models, system automation, and vault management, allowing the user to seamlessly switch between standard conversation, multi-model analytical debates, autonomous deep research, and hands-on multi-agent execution.

## Goals
- **Unified Workspace Interface:** Provide a single desktop window that replaces standard web AI clients and integrates directly with the "The Core" vault folders.
- **Vault-Aware Context:** Enable Normal Chat and Council modes to reference and retrieve knowledge dynamically from `SecondBrain/Wiki/`, `AI Notes/`, and other vault directories.
- **Automated Vault Operations:** Deploy agents to automate vault routines such as raw note ingestion, daily briefings, spaced repetition queue management, and work progress tracking.
- **OpenCode CLI Integration:** Connect seamlessly to the local OpenCode terminal agent to delegate complex coding tasks with minimal code.
- **Cognitive Debating (Council of AI):** Orchestrate multiple different LLMs to resolve complex problems, leveraging vault notes as reference materials.
- **Autonomous Deep Research:** Perform multi-step web crawling, document reading, and literature synthesis to generate comprehensive, cited research reports.
- **System Automation (Multi-Agent Team):** Run specialized agents that execute shell scripts, compile code, and update vault documentation securely.

## Scope

### In Scope
- **Vault Integration Engine:**
  - Local semantic search indexer (e.g., using LanceDB, Chroma, or BM25) to scan and query the vault (`SecondBrain/`, `Workspace/`, `System/`).
  - Obsidian-style markdown parsing and bidirectional link support.
  - Automation of existing commands (`/ingest` for inbox processing, `/briefing` for dashboard generation, `/debrief`).
- **OpenCode CLI Connector:**
  - Lightweight Python wrapper around the local `opencode` CLI.
  - Integrates with the headless server (`opencode serve`) or invokes commands via `opencode run "[task]"`.
- **Tiered Free-Model Routing:**
  - Dynamic API routing using free tiers from Gemini, Groq, Cerebras, OpenRouter, Mistral, etc.
  - Smart queueing/fallback that reserves low-RPM, heavy-reasoning models (e.g., Gemini 1.5 Pro) for synthesis/debates, and routes fast, high-RPM models (e.g., Groq Llama-3, Cerebras, Gemini Flash) for chats and crawling.
- **Mode 1: Normal Chat:** Fast, standard conversation interface with access to local context and memory.
- **Mode 2: Council of AI:** Debate coordinator that runs parallel LLM queries and synthesizes a single, source-cited response.
- **Mode 3: Deep Research (Web Only):** Multi-step autonomous research engine that searches the web, crawls articles, and compiles detailed Markdown reports. **Requires user approval on proposed sources and sub-topics before crawling.**
- **Mode 4: Multi-Agent Team:** System executor with read/write access to `Codes/`, `Testers/`, and local command-line tools under user supervision.
- **Desktop UI:** Interactive client showing chat threads, research status maps, agent graphs, and dashboard widgets.

### In Draft (Disabled by Default for Safety)
- **Autopilot Supervisor Agent:**
  - An oversight and monitoring orchestrator designed for unattended "autopilot" runs.
  - Acts as a watchdog that monitors active subagent processes, resource consumption, and command safety.
  - Halts all executions and alerts the user if abnormal activity (infinite loops, unauthorized file scans, excessive writes) is detected.

### Out of Scope
- Full cloud SaaS sync (focus remains strictly local and privacy-first).
- Unattended write permissions to critical OS directories (operations restricted to workspace and vault).

## Guardrails & Permission Levels
To ensure absolute safety and prevent data loss or unauthorized system access, Archon categorizes agent actions into three strict security tiers:

### 1. Direct Actions (Auto-Execute)
These actions do not require user prompt confirmation. The agent can modify these directly:
- Writing or modifying files under `Workspace/CodeSpace/archon/Codes/` and `Testers/`.
- Appending session log entries under `Workspace/CodeSpace/archon/Logs/`.
- Appending logs to `SecondBrain/wiki/log.md` and `System/Dashboard/WorkProgress.md`.
- Creating new daily notes in `SecondBrain/Daily Notes/` using the Daily-Note-Template.
- Writing finished research reports to `Workspace/ResearchHub/` or `Workspace/CodeSpace/archon/Plan/`.

### 2. Gated Actions (Confirmation Required)
These actions require the user to explicitly click "Confirm" in the UI:
- Executing shell/terminal commands (e.g. `npm run test`, `python script.py`).
- **Triggering OpenCode execution tasks** (`opencode run "[task]"`).
- **Starting a Deep Research crawl** (after reviewing proposed sources and sub-topics).
- **Enabling Autopilot mode** (enabling the Supervisor and bypassing basic manual gates temporarily within predefined parameters).
- Modifying core knowledge base files in `SecondBrain/AI Notes/` or `SecondBrain/wiki/concepts/`.
- Modifying files in `Workspace/ProjectHub/` or `Workspace/IdeaHub/`.
- Deleting or renaming any file (any delete action will automatically move the target to `Workspace/Archives/CodeStash/` as a backup).

### 3. Forbidden Actions (Off-Limits)
These actions are hard-blocked by the application runtime and can never be executed:
- Reading or writing files outside the designated workspace directory (`D:\The core`).
- Executing shell commands with administrative or elevated privileges (`sudo`, run-as administrator).
- Overwriting vault configuration files under `.obsidian/` or deleting system files.

## Tech Stack
- **Desktop Framework:** CustomTkinter (pure Python GUI) featuring a Dual-Sidebar layout for spatial efficiency and flawless scaling without IPC overhead.
- **Vector Index & Search:** LanceDB or ChromaDB (runs locally in-memory or sqlite-based).
progress: 40
tags:
  - codespace
  - spec
date-created: 2026-06-27
---

# Archon — Specification

## Executive Summary
Archon is a local desktop application for Windows designed to act as a personalized AI Command Center and AI OS. A primary differentiator is its first-class integration with the user's Second Brain vault ("The Core") and the OpenCode CLI. It bridges free-tier AI models, system automation, and vault management, allowing the user to seamlessly switch between standard conversation, multi-model analytical debates, autonomous deep research, and hands-on multi-agent execution.

## Goals
- **Unified Workspace Interface:** Provide a single desktop window that replaces standard web AI clients and integrates directly with the "The Core" vault folders.
- **Vault-Aware Context:** Enable Normal Chat and Council modes to reference and retrieve knowledge dynamically from `SecondBrain/Wiki/`, `AI Notes/`, and other vault directories.
- **Automated Vault Operations:** Deploy agents to automate vault routines such as raw note ingestion, daily briefings, spaced repetition queue management, and work progress tracking.
- **OpenCode CLI Integration:** Connect seamlessly to the local OpenCode terminal agent to delegate complex coding tasks with minimal code.
- **Cognitive Debating (Council of AI):** Orchestrate multiple different LLMs to resolve complex problems, leveraging vault notes as reference materials.
- **Autonomous Deep Research:** Perform multi-step web crawling, document reading, and literature synthesis to generate comprehensive, cited research reports.
- **System Automation (Multi-Agent Team):** Run specialized agents that execute shell scripts, compile code, and update vault documentation securely.

## Scope

### In Scope
- **Vault Integration Engine:**
  - Local semantic search indexer (e.g., using LanceDB, Chroma, or BM25) to scan and query the vault (`SecondBrain/`, `Workspace/`, `System/`).
  - Obsidian-style markdown parsing and bidirectional link support.
  - Automation of existing commands (`/ingest` for inbox processing, `/briefing` for dashboard generation, `/debrief`).
- **OpenCode CLI Connector:**
  - Lightweight Python wrapper around the local `opencode` CLI.
  - Integrates with the headless server (`opencode serve`) or invokes commands via `opencode run "[task]"`.
- **Tiered Free-Model Routing:**
  - Dynamic API routing using free tiers from Gemini, Groq, Cerebras, OpenRouter, Mistral, etc.
  - Smart queueing/fallback that reserves low-RPM, heavy-reasoning models (e.g., Gemini 1.5 Pro) for synthesis/debates, and routes fast, high-RPM models (e.g., Groq Llama-3, Cerebras, Gemini Flash) for chats and crawling.
- **Mode 1: Normal Chat:** Fast, standard conversation interface with access to local context and memory.
- **Mode 2: Council of AI:** Debate coordinator that runs parallel LLM queries and synthesizes a single, source-cited response.
- **Mode 3: Deep Research (Web Only):** Multi-step autonomous research engine that searches the web, crawls articles, and compiles detailed Markdown reports. **Requires user approval on proposed sources and sub-topics before crawling.**
- **Mode 4: Multi-Agent Team:** System executor with read/write access to `Codes/`, `Testers/`, and local command-line tools under user supervision.
- **Desktop UI:** Interactive client showing chat threads, research status maps, agent graphs, and dashboard widgets.

### In Draft (Disabled by Default for Safety)
- **Autopilot Supervisor Agent:**
  - An oversight and monitoring orchestrator designed for unattended "autopilot" runs.
  - Acts as a watchdog that monitors active subagent processes, resource consumption, and command safety.
  - Halts all executions and alerts the user if abnormal activity (infinite loops, unauthorized file scans, excessive writes) is detected.

### Out of Scope
- Full cloud SaaS sync (focus remains strictly local and privacy-first).
- Unattended write permissions to critical OS directories (operations restricted to workspace and vault).

## Guardrails & Permission Levels
To ensure absolute safety and prevent data loss or unauthorized system access, Archon categorizes agent actions into three strict security tiers:

### 1. Direct Actions (Auto-Execute)
These actions do not require user prompt confirmation. The agent can modify these directly:
- Writing or modifying files under `Workspace/CodeSpace/archon/Codes/` and `Testers/`.
- Appending session log entries under `Workspace/CodeSpace/archon/Logs/`.
- Appending logs to `SecondBrain/wiki/log.md` and `System/Dashboard/WorkProgress.md`.
- Creating new daily notes in `SecondBrain/Daily Notes/` using the Daily-Note-Template.
- Writing finished research reports to `Workspace/ResearchHub/` or `Workspace/CodeSpace/archon/Plan/`.

### 2. Gated Actions (Confirmation Required)
These actions require the user to explicitly click "Confirm" in the UI:
- Executing shell/terminal commands (e.g. `npm run test`, `python script.py`).
- **Triggering OpenCode execution tasks** (`opencode run "[task]"`).
- **Starting a Deep Research crawl** (after reviewing proposed sources and sub-topics).
- **Enabling Autopilot mode** (enabling the Supervisor and bypassing basic manual gates temporarily within predefined parameters).
- Modifying core knowledge base files in `SecondBrain/AI Notes/` or `SecondBrain/wiki/concepts/`.
- Modifying files in `Workspace/ProjectHub/` or `Workspace/IdeaHub/`.
- Deleting or renaming any file (any delete action will automatically move the target to `Workspace/Archives/CodeStash/` as a backup).

### 3. Forbidden Actions (Off-Limits)
These actions are hard-blocked by the application runtime and can never be executed:
- Reading or writing files outside the designated workspace directory (`D:\The core`).
- Executing shell commands with administrative or elevated privileges (`sudo`, run-as administrator).
- Overwriting vault configuration files under `.obsidian/` or deleting system files.

## Tech Stack
- **Desktop Framework:** CustomTkinter (pure Python GUI) featuring a Dual-Sidebar layout for spatial efficiency and flawless scaling without IPC overhead.
- **Vector Index & Search:** LanceDB or ChromaDB (runs locally in-memory or sqlite-based).
- **Agent Orchestration:** LangGraph or CrewAI for multi-agent workflows.
- **Coding Engine:** OpenCode CLI integration via sub-processes / HTTP API.
- **Research Tools:** SerpAPI / Tavily API / DuckDuckGo search integration, BeautifulSoup / Playwright for crawling.
- **LLM Connectivity & Routing:** LiteLLM or custom wrapper for multi-provider API routing (OpenRouter, Gemini, Groq, Cerebras, Mistral).

## Deliverables
- [ ] Local semantic search and ingestion engine for the Second Brain vault (LanceDB).
- [ ] Desktop App UI with CustomTkinter Dual-Sidebar framework (Normal Chat, Council, Agents, Research).
- [ ] Multi-model debate pipeline (Council of AI).
- [ ] Dynamic free-model router with RPM queuing and Semantic Caching.
- [ ] OpenCode CLI connector wrapper.
- [ ] Deep Research autonomous crawler and report generator.
- [ ] Autopilot Supervisor watchdog layer with SQLite state journaling.
- [ ] Local agent executor for running command line and files.

## Milestones
- **Milestone 1:** Vault parser and semantic search prototype — Completed
- **Milestone 2:** Desktop App MVP with Normal Chat, Council mode, and Deep Research (vault-aware) — Completed (CustomTkinter rebuild)
- **Milestone 3:** Multi-Agent Team automation of vault ingestion and coding tasks — Completed

## Success Metrics
- Average retrieval latency under 1 second for semantic searches across 1000+ notes.
- Successful automated ingestion of raw notes into structured wiki files.
- Synthesis of cited deep research reports with at least 5 cross-referenced web sources.

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|-----------|
| Mangle vault links during write | High | Implement strict Markdown parser validations and backup notes before rewriting |
| Rate-limiting during deep research crawling | Medium | Enforce polite crawling delays, rotate user-agents, and cache webpage lookups |
| Autopilot infinite execution loops | High | **Draft Supervisor implementation:** Implement a strict max token / max loop count cap and automatic heartbeat timeouts |
| API key leakage | High | Store all API keys in Windows Credential Manager or local encrypted configuration |

## Related SecondBrain Concepts
- [[SecondBrain/wiki/concepts/Fluid Mechanics]]
- [[SecondBrain/wiki/concepts/Edge Inference Latency]]

## Next Steps
- [ ] Decide on the desktop wrapper (Python/CustomTkinter).
- [ ] Map out the schema and API hooks for the vault indexer.
- [ ] Create the first Planner tasks to draft the vault parser.
