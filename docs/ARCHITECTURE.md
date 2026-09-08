# Archon Architecture Overview

System design documentation for Archon AI OS.

---

## 1. System Components

```
                +-------------------------+
                |    React Web UI / APK   |
                +------------+------------+
                             | (REST/WS)
                             v
                +-------------------------+
                |     FastAPI Backend     |
                +-----+------------+------+
                      |            |
         +------------+            +------------+
         |                                      |
         v                                      v
+------------------+                   +------------------+
|   LanceDB (RAG)  |                   |  SQLite Engine   |
| (Textbook Index) |                   | (Metrics/Jobs)   |
+------------------+                   +------------------+
         |                                      |
         +--------------------+-----------------+
                              |
                              v
             +----------------------------------+
             |      LiteLLM Routing Engine      |
             | (Groq / Gemini / Local Ollama)   |
             +----------------------------------+
```

---

## 2. Key Modules

- **Note Generator**: 5-agent sequential synthesis pipeline for lecture audio processing.
- **Semantic Cache**: Query deduplication layer for zero-latency retrieval.
- **Scaling Monitor**: Resource tracking & notification engine.
- **Notion Exporter**: Markdown-to-Notion block converter and batched API exporter.
