# Research Mode (Archon)

## 1. Overview
Research Mode provides an autonomous deep-research capability (`deep_research.py`). It accepts a simple query or topic, uses LLMs to generate targeted search terms, crawls the web, summarizes content, and synthesizes a comprehensive final markdown report. It integrates with an "Autopilot Supervisor" that tracks token usage and limits resource consumption.

## 2. Architecture & Data Flow

```mermaid
graph TD
    UI[ResearchMode.tsx] -->|Topic Query| WS[WebSocket Agent Runtime]
    WS -->|Launch| Supervisor[Autopilot Supervisor]
    Supervisor --> Agent[DeepResearch Agent]
    
    Agent -->|Phase 1| LLM1[Generate Queries]
    LLM1 --> Tavily[Tavily Web Search]
    Tavily --> Gate{User Approval Gate}
    
    Gate -- Approved -->|Phase 2| Crawler[Playwright / httpx]
    Crawler --> LLM2[Summarize Pages]
    
    LLM2 -->|Phase 3| LLM3[Final Synthesis]
    LLM3 --> FileSystem[(ResearchHub/YYYY-MM-DD-Topic.md)]
    LLM3 --> Graph[Dynamic Knowledge Graph D3/Sigma]
    Graph --> UI
```

## 3. Key API Endpoints & WebSocket Messages
- `WS Event: "command"` -> Payload: `run deep_research <topic>`
- `WS Event: "status"` -> Receives updates: "Generating search queries...", "Crawling: URL...", "Synthesizing final research report..."
- `WS Event: "gate"` -> Sends a payload containing `proposed_topics`, `urls`, and `estimated_time_seconds` for user approval.
- `WS Event: "token"` -> Real-time streaming of the synthesized report back to the UI.
- `WS Event: "error"` -> Emitted if the Supervisor halts due to token limits or crawling errors.

## 4. Data Models / Database Schema
- **Supervisor Session State**:
  - `total_tokens`: float
  - `write_volume_bytes`: int
  - `actions_log`: list of `{"agent": str, "action": str, "timestamp": float}`
- **Research output**: 
  - Stored strictly as Markdown files in `Workspace/ResearchHub` rather than a database. 
  - Includes dynamically generated graph representation for UI (nodes, edges, primary terms).

## 5. UI Component Tree
- `ResearchMode` (Main View utilizing `ResizablePanelGroup`)
  - `Left Panel (Control & Logs)`
    - Topic Input Field
    - WebSocket Status Feed / Terminal output
    - Resource Monitor (Tokens used, Estimated Time)
  - `Right Panel (Results & Graph)`
    - `Knowledge Graph View` (D3 network graph of extracted concepts, e.g. "Quantum Error Correction")
    - `Markdown Preview` (Rendered `ReactMarkdown` of the final synthesized report)

## 6. Android Implementation
- Uses standard WebSocket bindings to track research progress.
- Knowledge graph is disabled by default to save memory; instead, an expandable list of extracted terms and relationships is provided.
- Download capabilities integrated with Android's MediaStore to save `.md` and `.pdf` exported reports directly to the user's Downloads folder.

## 7. Reference Products & Visual Benchmarks

* **Perplexity AI (perplexity.ai):** Primary reference for the citation-grounded research output pattern. Perplexity's killer behavior — sources stay **anchored in a fixed right panel** while the answer streams in the center — is the core pattern Archon's Research Mode should replicate for its `Markdown Preview` + source list layout. Key specifics:
  - **Numbered inline citations** (`[1]`, `[2]`) appear inside the streaming answer body, not appended at the end.
  - **Hovering a citation shows a floating tooltip** with the source title and a snippet preview without navigating away.
  - **Source list is always visible**, showing favicon, domain, and title for all cited pages.
* **Google NotebookLM (notebooklm.google.com):** Reference for the Studio output panel — generated study guides, briefing docs, and multi-perspective analysis. Maps to the `Markdown Preview` report panel in Archon's Research Mode, which should offer a "save to Notebook" action to push the synthesized report directly to a Notebook Mode source.
* **Stanford STORM / Wikipedia-style multi-perspective synthesis:** Reference for the autonomous outline-first → section-draft pipeline. STORM outlines the report structure using simulated expert perspectives before writing, reducing hallucination and improving coverage — the same principle behind Archon's multi-phase `deep_research.py` (Phase 1: query gen → Phase 2: crawl/summarize → Phase 3: final synthesis).
* **PC ↔ Android Parity:** Web uses the full D3 knowledge graph alongside the markdown preview. Android replaces the graph with a flat expandable list of extracted concepts and relationships to protect memory, but exports the same `.md` report format.

## 8. Known Issues / Open TODOs
- **Playwright Overhead**: Launching a headless Chromium instance per URL is resource-heavy. Needs a shared browser context pool or a shift to pure httpx/BeautifulSoup for static sites.
- **Paywall Blocking**: The crawler often fails on sites with strict anti-bot measures (e.g., Bloomberg, NYT) resulting in empty summaries. Integration with specialized proxy services is needed.
- **Token Explosions**: Large sites with dense texts can blow past the `Autopilot Supervisor` limits quickly, halting the process prematurely.
