# Project: Notebook Mode for Archon

## Architecture
Notebook Mode enables users to create notebooks, ingest various document types (PDFs, codebases, and audio lectures), embed and retrieve them with topic-based pre-filtering, chat with a citation-verified grounded agent, and generate studio study resources and play-ready audio overviews.

- **Ingestion & Queue (ingestion_queue.py)**: Manages document upload, parsing, and job execution with a strict concurrency limit (max 2) and WebSocket status streaming.
- **Embedding & Retrieving (retriever.py / embeddings.py)**: Uses Ollama with nomic-embed-text to generate embeddings, stores them in a LanceDB table, and builds a flat topic index lookup. Implements hybrid vector + BM25 keyword search, pre-filtering by topic, and re-ranking to remove duplicates.
- **Grounded Chat & Citations (chat_grounded.py & citation_verifier.py)**: A ChatAgent wrapper or new agent that supports the six commands (derive, explain, feynman, compare, list, summarize), outputting LaTeX equations, verified by a second-pass Citation Verifier Agent against retrieved source chunks.
- **Studio & Audio Overview (studio.py & audio_overview.py)**: Generates structured markdown study guides, FAQs, timelines, quizzes, Mermaid mind maps, and outputs play-ready conversational and lecture audio using Piper TTS.
- **FastAPI Endpoints (notebook_routes.py and modified main.py)**: Exposes REST endpoints and maps WebSocket connections for progress updates.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Ingestion & Job Queue | PDF, gitingest, audio parsing; throttled job queue (concurrency limit 2); WebSocket notifications | None | DONE (ab559745-cb94-42c7-81c9-b4970f1c0f24) |
| 2 | Embedding & Retrieval | Semantic chunking, Ollama nomic-embed-text embeddings, LanceDB, topic flat lookup index, hybrid search + BM25, re-ranking | M1 | DONE (fe3377f5-cd5e-4462-8ca1-e5490aab6be4) |
| 3 | Grounded Chat & Citations | Command-based chat (6 commands), LaTeX math output, Citation Verifier Agent | M2 | DONE |
| 4 | Studio & Audio Overview | Markdown artifacts, Mermaid mind maps, Conversational & Lecture Piper audio compilation | M3 | DONE |
| 5 | API Endpoints & Integration | FastAPI routes for notebooks, sources, chat, studio, jobs; WebSocket connection bridge | M1, M2, M3, M4 | IN_PROGRESS |
| 6 | E2E Testing & Verification | 4-tier E2E testing and Tier 5 adversarial coverage hardening | M5 | IN_PROGRESS |

## Interface Contracts
### Ingestion <-> API
- IngestionQueue.add_job(notebook_id: str, source_type: str, file_path: str, metadata: dict) -> str (job_id)
- IngestionQueue.get_status(job_id: str) -> dict

### Retriever <-> Chat Agent
- Retriever.search(notebook_id: str, query: str, top_k: int) -> List[dict]
- Retriever.extract_topics_and_index(notebook_id: str, source_id: str, text: str)

### Citation Verifier <-> Chat Agent
- CitationVerifier.verify(query: str, answer: str, chunks: List[dict]) -> Tuple[str, bool] (verified_answer, is_grounded)
