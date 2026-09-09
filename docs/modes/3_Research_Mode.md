# Research Mode (Archon)

## 1. Overview

Research Mode provides an autonomous, multi-phase deep-research pipeline (`deep_research.py`).
It accepts a topic string, uses LLMs to generate targeted search queries, runs parallel Tavily
searches, concurrently crawls and summarizes sources, generates a structured STORM-style outline,
and synthesizes a comprehensive final report with numbered inline citations `[N]`.

The pipeline is supervised by `AutopilotSupervisor` which enforces token budgets, write-volume
limits, and concurrency caps throughout every phase.

---

## 2. Backend Architecture — `deep_research.py`

### 2.1 `ResearchSource` Data Schema

Every web source is represented as a `dataclasses.dataclass` with the following fields:

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `int` | Sequential integer assigned after deduplication, starting at 1 |
| `url` | `str` | Canonical URL of the source |
| `title` | `str` | Page title from Tavily result (falls back to raw URL) |
| `snippet` | `str` | First 200 characters of Tavily `content` field |
| `summary` | `str` | LLM-generated paragraph summary after crawling (default `""`) |

The dataclass is fully serializable via `dataclasses.asdict()` and is emitted over WebSocket
in the `gate`, `sources`, and `graph_nodes` events.

---

### 2.2 Phase 1 — Parallel Query Generation & Tavily Search

1. The LLM (`tier='fast'`) generates 3–5 targeted search queries as a JSON list.
2. `_search_web(queries)` fans out via `asyncio.gather(*[_search_single(q) for q in queries])`.
3. Each `_search_single(q)` calls `TavilyClient.search(max_results=3)` and maps results to
   `ResearchSource` objects with `title` and `snippet` populated.
4. Results from all queries are merged into a single URL-keyed dict to **deduplicate by URL**.
5. Sequential integer IDs are assigned (`src.id = i` starting from 1) after deduplication.
6. **Mock fallback**: if Tavily is unavailable or returns nothing, three hardcoded Wikipedia /
   arXiv / GitHub sources are created with `title=domain, snippet='Wikipedia reference'`.

**Gate event payload** (`WS event: "gate"`):
```json
{
  "proposed_topics": ["Overview of <topic>", "Key findings & statistics", "Recent developments"],
  "sources": [{"id": 1, "url": "...", "title": "...", "snippet": "...", "summary": ""}, ...],
  "estimated_time_seconds": <n_sources * 5>
}
```
The UI presents this for user approval. The gate blocks the pipeline via `asyncio.Queue.get()`
until a `confirm` or `cancel` decision arrives. The existing `active_gates` dict mechanism is
unchanged.

---

### 2.3 Phase 1.5 — STORM Outline Generation

After the gate is approved, the pipeline generates a Wikipedia-style article outline before any
crawling begins, following the Stanford STORM principle of outline-first drafting.

- **WS status event**: `"Planning report structure..."`
- `_generate_outline(topic, approved_sources)` calls LLM with `tier='fast'`:

  > *"You are a research director. Given the topic '{topic}' and these sources: {source_titles},
  > generate a Wikipedia-style article outline as a JSON list of section title strings.
  > Include 5-8 sections. Output ONLY the JSON array, no other text."*

- JSON response is parsed; on parse failure the fallback is
  `["Introduction", "Key Findings", "Analysis", "Conclusion"]`.

**WS event emitted** (`"outline"`):
```json
{ "sections": ["Introduction", "Background", "Key Findings", "Applications", "Future Directions", "Conclusion"] }
```

---

### 2.4 Phase 2 — Concurrent Web Crawl with Semaphore Rate Limiting

All approved sources are crawled **concurrently** via:
```python
tasks = [_crawl_and_summarize(s, text, send_cb, supervisor) for s in approved_sources]
results = await asyncio.gather(*tasks, return_exceptions=True)
```

`_crawl_and_summarize` is guarded by `async with supervisor.semaphore` — an
`asyncio.Semaphore(5)` defined as a lazy-init property on `AutopilotSupervisor`. This caps
active concurrent HTTP connections at 5 regardless of how many sources are approved.

For each source:
1. Emits `WS status`: `"Crawling: {source.title}..."`
2. `_crawl_url` is called — tries **Playwright** (headless Chromium) then falls back to **httpx**
   if Playwright is not installed or fails.
3. HTML is parsed by **BeautifulSoup** with `<script>` and `<style>` stripped.
4. LLM (`tier='fast'`) summarizes up to 8,000 characters of extracted text in context of the topic.
5. `source.summary` is populated on the `ResearchSource` object.
6. **Never raises**: any exception is caught, logged, and the source is returned with `summary=""`.

Results from `asyncio.gather` that are exceptions (not `ResearchSource`) are logged and filtered
out. If all sources fail, `approved_sources` is used as a graceful fallback.

---

### 2.5 Phase 3 — Structured Synthesis with Numbered Inline Citations

The synthesis prompt is constructed with:

- **Reference list**: `[{s.id}] {s.url} - {s.title}` for every enriched source.
- **Source summaries block**: `Source [{s.id}] ({s.url}):\n{s.summary}` separated by `---`.
- **Section structure**: the outline sections from Phase 1.5 injected as a comma-separated list.

Prompt instruction to the LLM (`tier='heavy'`):
> *"Structure it with these exact sections: [...]. Use numbered inline citations [N] from the
> reference list when making factual claims. Every major claim must cite at least one source.
> Write in an encyclopedic style."*

The report streams back chunk-by-chunk; each chunk is emitted as a `WS event: "token"` and
appended to `final_report`. Token count is tracked via `supervisor.add_tokens(len(chunk)/4.0)`.

---

### 2.6 Phase 3.5 — Follow-up Suggestions

`_generate_suggestions(topic, final_report[:3000])` calls LLM `tier='fast'`:
> *"Generate exactly 5 concise follow-up research questions. Output ONLY a JSON array of 5 strings."*

Fallback on JSON parse error: 3 generic templated questions about the topic.

**WS event emitted** (`"suggestions"`):
```json
{ "suggestions": ["Question 1?", "Question 2?", "Question 3?", "Question 4?", "Question 5?"] }
```

---

### 2.7 Phase 3.6 — Server-Side Concept Graph Extraction

`_extract_graph_nodes(final_report, topic)` extracts up to 12 unique terms:
1. `topic` is always the primary/first term.
2. `## Headings` are extracted via regex.
3. `**bold terms**` are extracted via regex.
4. Deduplication preserves insertion order; list is capped at 12.

Graph layout:
- **Primary node**: `{id:0, label:topic, x:380, y:230, r:28, primary:true}` — center of canvas.
- **Satellite nodes**: evenly spaced on a circle of radius 160 centered at (380, 230), `r:18` each.
- **Edges**: every satellite connects to the primary node (`{from:0, to:i}`).

**WS event emitted** (`"graph_nodes"`):
```json
{
  "nodes": [{"id": 0, "label": "Quantum Computing", "x": 380, "y": 230, "r": 28, "primary": true}, ...],
  "edges": [{"from": 0, "to": 1}, {"from": 0, "to": 2}, ...]
}
```

---

### 2.8 `AutopilotSupervisor` — `semaphore` Property

```python
@property
def semaphore(self) -> asyncio.Semaphore:
    if not hasattr(self, '_semaphore'):
        self._semaphore = asyncio.Semaphore(5)
    return self._semaphore
```

Lazy-initialized on first access (after the event loop is live), cached on the instance.
Cap of **5** concurrent crawl tasks. All other supervisor behavior (heartbeat, token budget,
write-volume budget, action loop detection) is unchanged.

---

### 2.9 Full Phase Sequence Summary

```
Phase 1   → asyncio.gather Tavily queries → List[ResearchSource] → gate event → user decision
Phase 1.5 → _generate_outline → outline event
Phase 2   → asyncio.gather(_crawl_and_summarize) [≤5 concurrent via semaphore]
Phase 3   → LLM heavy synthesis with [N] citations → streaming token events
Phase 3.5 → sources event (full ResearchSource list with summaries)
Phase 3.6 → graph_nodes event (nodes + edges dict)
Phase 3.7 → suggestions event (5 follow-up questions)
Save      → Workspace/ResearchHub/YYYY-MM-DD-{topic}.md
Return    → {"report": str, "saved_path": str}
```

---

## 3. WebSocket Event Reference

| WS Event | Direction | Payload Fields | When Emitted |
| :--- | :--- | :--- | :--- |
| `status` | Server → Client | `{status: string}` | Throughout all phases |
| `gate` | Server → Client | `{proposed_topics, sources[], estimated_time_seconds}` | End of Phase 1 |
| `outline` | Server → Client | `{sections: string[]}` | End of Phase 1.5 |
| `token` | Server → Client | `{text: string}` | During Phase 3 synthesis stream |
| `sources` | Server → Client | `{sources: ResearchSource[]}` | Phase 3.5 |
| `graph_nodes` | Server → Client | `{nodes[], edges[]}` | Phase 3.6 |
| `suggestions` | Server → Client | `{suggestions: string[]}` | Phase 3.7 |
| `error` | Server → Client | `{error: string}` | On supervisor halt |
| `confirm` | Client → Server | `{type:"confirm", payload:{approved_urls?}}` | User approves gate |
| `cancel` | Client → Server | `{type:"cancel"}` | User cancels gate |

---

## 4. Web Frontend Implementation

### 4.1 Component Tree (`ResearchMode.tsx`)

```
ResearchMode (ResizablePanelGroup)
├── Left Panel — Control & Progress
│   ├── Topic input field + [Start Research] button
│   ├── Status feed (scrolling terminal log from `status` events)
│   ├── OutlineProgressStrip         ← NEW (Phase 1.5 outline event)
│   │   └── Horizontal pill strip showing section titles, highlighting current active section
│   └── ResourceMonitor (tokens used, estimated time)
└── Right Panel — Results
    ├── CitationReport               ← streaming ReactMarkdown with [N] badge overlays
    │   └── Inline [favicon][domain][N] citation badges (Perplexity-style)
    │       └── Hover tooltip: source title + snippet preview
    ├── SourcesAccordion             ← NEW (sources event)
    │   └── Collapsible list; each row: favicon + domain + title + snippet + [Save to Notebook]
    ├── SuggestionChips              ← NEW (suggestions event)
    │   └── 5 horizontally scrolling chips; click triggers a new focused research run
    ├── KnowledgeGraph               ← updated (graph_nodes event, D3/Sigma.js)
    └── SaveToNotebookModal          ← NEW
        └── Dialog: pick Notebook → POST /notebooks/{id}/sources
```

### 4.2 Citation Badges — Perplexity-Style `[favicon][domain][N]`

- `[N]` references in the streamed report markdown are parsed and wrapped in a `<CitationBadge>`
  component showing: `[favicon img][domain string][citation number]` inline with the text.
- `favicon` is loaded from `https://www.google.com/s2/favicons?domain={domain}`.
- On **hover**: a floating tooltip card appears with the source `title` and `snippet`.
- On **click**: opens the source URL in a new tab.
- All badge state is derived from the `sources` event array (matched by `[N]` index to `source.id`).

### 4.3 Outline Progress Strip

- Subscribes to `outline` WS event via `websocketStore.ts`.
- Renders a horizontal scrollable strip of pill buttons, one per section title.
- The active section is determined by tracking which `## Heading` the streamed report has most
  recently passed; the corresponding pill is highlighted.

### 4.4 Sources Accordion

- Subscribes to `sources` WS event.
- A collapsible `<Accordion>` renders one item per `ResearchSource`.
- Each row: **favicon** + **domain** (extracted from URL) + **title** + **snippet** text.
- A `[Save to Notebook]` button opens the `SaveToNotebookModal`.

### 4.5 Follow-up Suggestion Chips

- Subscribes to `suggestions` WS event.
- Renders 5 `<Button variant="outline">` chips in a horizontally scrolling row.
- Clicking a chip pre-fills the topic input with the suggestion text and immediately starts
  a new research run.

### 4.6 Save to Notebook Modal

- A `<Dialog>` listing all existing Notebooks (fetched from `GET /notebooks`).
- On confirm: calls `POST /notebooks/{selected_id}/sources` with the report markdown as body.
- Closes on success and shows a toast notification.

### 4.7 WebSocket Store (`websocketStore.ts` / `WebSocketContext.tsx`)

All new WS events (`outline`, `sources`, `graph_nodes`, `suggestions`) are handled in the
central WebSocket message dispatcher. Each event type updates a dedicated slice of Zustand
store state that the Research Mode components subscribe to reactively.

---

## 5. Android Frontend Implementation (`ResearchScreen.kt`)

### 5.1 Layout Strategy

| Device Class | Width | Layout |
| :--- | :--- | :--- |
| Phone | < 840 dp | Single-column, high-density vertical scroll |
| Tablet | ≥ 840 dp | Two-column: report + interactive knowledge graph |

Adaptive breakpoint uses `LocalConfiguration.current.screenWidthDp >= 840`.

### 5.2 Citation Badges — `[N]` Tap-to-Inspect

- The synthesized report text is parsed for `[N]` patterns.
- Each match is rendered as a tappable `[N]` badge (filled `SuggestionChip`, `labelSmall` text).
- Tapping opens a **Material 3 `ModalBottomSheet`** containing:
  - Source favicon (loaded via Coil from Google Favicons API)
  - Source title and domain
  - Snippet preview text
  - **[Open in Browser]** button → fires `Intent.ACTION_VIEW` with source URL
  - **[Copy URL]** button → copies URL to clipboard via `ClipboardManager`
- Bottom sheet is dismissed on backdrop tap or swipe down.

### 5.3 STORM Outline Progress Strip

- Subscribes to `outline` WS event payload parsed from JSON.
- Renders a `LazyRow` of `FilterChip` composables, one per section title.
- Current active section is highlighted (filled chip vs outline chip) based on scroll position
  of the report `LazyColumn` tracking which `## Heading` is currently visible.

### 5.4 Sources Accordion

- Subscribes to `sources` WS event.
- Implemented as an `AnimatedVisibility`-backed expandable section below the report.
- Each source row: `AsyncImage` favicon (24dp) + bold domain text + title + snippet.
- **[Open]** `TextButton` fires `Intent.ACTION_VIEW` for the source URL.
- Collapsed by default; user taps the header to expand.

### 5.5 Follow-up Question Pills

- Subscribes to `suggestions` WS event.
- Renders a `LazyRow` of `SuggestionChip` composables for all 5 questions.
- Tapping a chip sets the topic `TextField` value to the question text and triggers
  a new `deep_research` WebSocket command.

### 5.6 Interactive 2D Knowledge Graph (Tablets Only)

Visible only when `screenWidthDp >= 840`:

- Subscribes to `graph_nodes` WS event.
- Rendered on a Compose `Canvas` composable with manual draw calls:
  - **Edges**: `drawLine` between node center coordinates, `strokeWidth=2f`, muted color.
  - **Satellite nodes**: `drawCircle` at `(x,y)` with `radius=18f`, secondary color.
  - **Primary node**: `drawCircle` at `(380,230)` with `radius=28f`, accent color + drop shadow.
  - **Labels**: `drawText` (Compose `Canvas` with `TextMeasurer`) centered below each node.
- **Tap interaction**: `pointerInput(Unit) { detectTapGestures }` calculates which node was
  tapped (hit-test against all node circles). Tapping a node opens a **Concept Inspector**
  `ModalBottomSheet` with the node label and a "Research this concept" button.
- Pan support via `detectTransformGestures` with `Offset` state for the entire graph canvas.

### 5.7 Save to Notebook — Room DB Persistence

Unlike web (which uses REST), Android persists directly to the local **Room database**
(`ArchonDatabase`) without a network round-trip:

```kotlin
// In ResearchViewModel
suspend fun saveToNotebook(notebookId: Long, report: String) {
    val source = NotebookSourceEntity(
        notebookId = notebookId,
        content = report,
        sourceType = "research_report",
        createdAt = System.currentTimeMillis()
    )
    archonDatabase.notebookSourceDao().insert(source)
}
```

A bottom-sheet notebook picker lists existing notebooks from Room. On selection the report is
inserted and a `Snackbar` confirmation is shown.

### 5.8 Phone Layout — High-Density Single Column

On phones the right-side graph panel is hidden. The vertical layout order is:

1. Topic input + status chip
2. Outline progress strip (`LazyRow`, horizontally scrollable)
3. Streamed report (`SelectionContainer` wrapping `LazyColumn` of `AnnotatedString` paragraphs)
4. Sources accordion (collapsed by default)
5. Follow-up chips (`LazyRow`)

---

## 6. PC ↔ Android Feature Parity Matrix

| Feature | Web (`ResearchMode.tsx`) | Android (`ResearchScreen.kt`) |
| :--- | :--- | :--- |
| Real-time status feed | ✅ Scrolling terminal log | ✅ Status `Chip` near top |
| User approval gate | ✅ Modal with source checkboxes | ✅ `AlertDialog` with source list |
| Outline progress strip | ✅ Horizontal pill strip | ✅ `LazyRow` of `FilterChip` |
| Streaming report with `[N]` citations | ✅ ReactMarkdown + badge overlay | ✅ `AnnotatedString` with tappable spans |
| Citation hover/tap detail | ✅ Floating tooltip on hover | ✅ `ModalBottomSheet` on tap |
| Sources accordion | ✅ shadcn `Accordion` | ✅ `AnimatedVisibility` expand |
| Follow-up suggestion chips | ✅ 5 `Button outline` chips | ✅ 5 `SuggestionChip` in `LazyRow` |
| Knowledge graph | ✅ D3/Sigma.js interactive graph | ✅ Compose `Canvas` (tablets ≥840dp only) |
| Graph node tap inspector | ✅ D3 click handler | ✅ `ModalBottomSheet` with concept label |
| Save to Notebook | ✅ `POST /notebooks/{id}/sources` | ✅ Room DB insert via `ArchonDatabase` |
| Report export (`.md`) | ✅ Browser download | ✅ `MediaStore` save to Downloads |

---

## 7. Known Issues / Open TODOs

- **Playwright Overhead**: A new headless Chromium context per crawl is resource-heavy. Migrate to
  a shared persistent browser context pool, or prefer pure `httpx + BeautifulSoup` for static sites.
- **Paywall Blocking**: Anti-bot sites (Bloomberg, NYT, etc.) return empty or gated content,
  producing uninformative summaries. A proxy or Jina Reader fallback is needed.
- **Semaphore vs. Event Loop Lifecycle**: The `semaphore` property on `AutopilotSupervisor` is
  lazily created on first access. If `supervisor.reset()` is called between runs the semaphore
  is **not** reset — this is intentional (the semaphore state resets naturally as all tasks
  complete), but worth noting if the supervisor is reused across concurrent requests.
- **Token Budget vs. Heavy Synthesis**: The `tier='heavy'` synthesis call alone can consume most
  of the 50,000-token default budget on dense topics. Consider raising `token_budget` or
  splitting the synthesis into per-section streaming calls.
