# Archon Product Benchmarks & Mode-by-Mode Reference Guide

This document establishes the real-world shipping products and architectural inspirations that guide Archon's UI/UX, interaction states, and system behavior across both Web and Android platforms.

---

## 1. Mode-by-Mode Benchmark Matrix

| Mode | Primary Benchmark Products | Key Visual & UX Patterns to Copy | Backend & Technical Parity |
| :--- | :--- | :--- | :--- |
| **Chat Mode** | **Perplexity AI** | Anchored citation drawer; sources stay visible alongside the streaming answer without navigating away; instant web search / vault toggle pills. | Rolling token window (8k); non-blocking async vault retrieval; retry with exponential backoff & jitter. |
| **Notebook / Research Mode** | **Google NotebookLM** + **Stanford STORM** | 3-pane layout (Sources $\rightarrow$ Grounded Chat $\rightarrow$ Studio Notes); multi-document source grounding with clickable inline badges. | Chunk provenance tracking; CitationVerifier two-pass draft-then-verify pipeline; source embedding in LanceDB. |
| **Council Mode** | **ChatHub** | Parallel multi-panel comparison; same prompt broadcast live to multiple LLMs simultaneously; side-by-side token streaming; consensus/debate synthesis panel. | WebSocket multi-agent channel; parallel model inference; latency and cost telemetry per model. |
| **Agents Mode** | **Devin** + **Cursor** | Step-by-step plan execution (Analyze $\rightarrow$ Generate $\rightarrow$ Test $\rightarrow$ Deploy); user approval checkpoints; live collapsible tool logs; code diff viewers. | Autonomous tool execution sandbox; task lifecycle state machine (`running`, `waiting_for_input`, `done`); rollback capability. |
| **Canvas Mode** | **StarNote**, **GoodNotes 6**, **Apple Notes**, **MyScript Notes** | Low-latency stylus inking; 8-tool floating palette; **Real Vector Lasso** (selection, drag-to-move, duplicate, recolor); **Study Tape Tool** (masking + tap-to-reveal); **Shape Snapping**; **Scratch-to-Erase**. | Front-buffered OpenGL rendering; MyScript Interactive Ink math recognition; LoRA on-device handwriting fine-tuning dashboard. |
| **Tutor Mode** | **Duolingo**, **Mimo**, **Khanmigo**, **Brilliant** | Gamification source of truth; active accountability ("someone watching over you"); floating top question island with instant in-place check; 4-tier Socratic disclosure ladder (Nudge $\rightarrow$ Diagnostic $\rightarrow$ Method $\rightarrow$ Sub-step). | SymPy symbolic equivalence grading; strict AI non-spoiler validator; SM-2 spaced repetition engine (`quiz_manager.py`). |
| **Dashboard Mode** | **Linear** + **macOS Mission Control** | Authoritative dark terminal aesthetic; electric indigo accents; dense typography; metric cards; recent activity stream; high-signal zero-fluff layout. | Cached hardware load tracker (CPU, RAM, GPU); session history aggregation; background daemon health checks. |
| **Agents Directory** | **OpenAI ChatGPT App Store (Dec 2025)** | Modern curated agent marketplace; categorised skill pills; capability badges; star ratings; instant "Run with Agent" launcher. | Agent manifest schema; dynamic subagent invocation (`invoke_subagent`); role and tool group definitions. |
| **Obsidian Mode** | **Obsidian.md** | Local-first markdown vault; bidirectional wikilinks (`[[Note Name]]`); graph network visualization; YAML frontmatter metadata. | File watcher synchronization; MarkitDown normalizer; markdown link integrity linting. |

---

## 2. Deep Dive by Mode

### 1. Chat & Research Mode — The Perplexity & NotebookLM Benchmark
* **The Problem It Solves:** Traditional AI chat loses context when sources are dumped into the conversation stream.
* **The Benchmark Solution (Perplexity):** An anchored side panel displays all cited sources, URLs, and vault documents. Clicking a citation jumps directly to the source highlight without leaving or resetting the conversation.
* **The Studio Solution (NotebookLM):** Users can pin extracted citations and notes directly into an adjacent "Studio" notepad.

### 2. Council Mode — The ChatHub Benchmark
* **The Problem It Solves:** Static 4-box layouts look artificial and clunky.
* **The Benchmark Solution (ChatHub):** A clean responsive grid of 2, 3, or 4 live model cards. A single user input broadcasts to all selected models simultaneously. Each card streams its reasoning independently, followed by an automated "Consensus Synthesis" card at the bottom highlighting where the models agree and diverge.

### 3. Agents Mode — The Devin & Cursor Benchmark
* **The Problem It Solves:** Black-box autonomous agents that run wild and produce broken code.
* **The Benchmark Solution (Devin + Cursor):** 
  - Devin provides a visual phase progression: `Plan` $\rightarrow$ `Explore` $\rightarrow$ `Execute` $\rightarrow$ `Verify`.
  - Cursor provides inline file diffs and explicit human-in-the-loop approval gates before file mutations are committed.

### 4. Canvas Mode — The StarNote & MyScript Benchmark
* **The Problem It Solves:** Generic canvas apps lack study-specific tooling and personal handwriting adaptation.
* **The Benchmark Solution (StarNote):**
  - **Study Tape Tool:** Opaque pastel tape strips placed over formulas or text that toggle reveal/hide on tap for rapid active-recall flashcard study.
  - **Real Vector Lasso:** Selection loop enabling drag-to-move, duplication, recoloring, and deletion.
* **The Benchmark Solution (MyScript):**
  - Consumer-grade handwriting math recognition that converts messy stylus ink directly into LaTeX formulas.
  - **Handwriting Customization Dashboard:** Collects user corrections to personalize character recognition (implemented in Archon via LoRA fine-tuning).

### 5. Tutor Mode — The Duolingo & Khanmigo Benchmark
* **The Problem It Solves:** Reading passive text creates an illusion of competence; students nod along but cannot solve problems.
* **The Benchmark Solution (Duolingo & Khanmigo):**
  - **Duolingo/Mimo:** Active accountability with low friction. A top hovering island contains the current problem and a prominent `[CHECK STEP]` button with accordion feedback.
  - **Khanmigo/Brilliant:** Socratic guidance that never reveals the final answer. Provides 4 tiered hints:
    1. *Level 1 (Nudge):* Points to the general concept or error region.
    2. *Level 2 (Diagnostic):* Asks a targeted question about the erroneous step.
    3. *Level 3 (Methodological):* Suggests the relevant algebraic rule or identity.
    4. *Level 4 (Worked Sub-step):* Demonstrates the solution to an analogous sub-problem.

### 6. Dashboard Mode — The Linear Benchmark
* **The Problem It Solves:** Cluttered dashboards with childish widgets and slow animations.
* **The Benchmark Solution (Linear):** Obsidian/slate dark mode, 1px subtle borders, dense typography (Geist/system sans), restrained micro-interactions (`ease-out-quart`), and high-information-density metric cards.

### 7. Agents Directory — The Modern Marketplace Benchmark
* **The Problem It Solves:** Static lists of text prompts that feel like documentation rather than executable tools.
* **The Benchmark Solution (OpenAI Marketplace):** Curated cards with verified capability tags, model tiers, tool scopes, and one-click execution that boots the agent into the active workspace.
