---
title: Archon — Schema
project: archon
hub: CodeSpace
type: schema
status: Draft
tags:
  - codespace
  - schema
date-created: 2026-06-27
---

# Archon — Data Schema

## Data Models

### Model 1: Document/Note Metadata (SQLite / LanceDB relational)
Tracks all files in the Second Brain vault, their attributes, and relationships.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | STRING (UUID) | Yes (PK) | Unique identifier for the note. |
| `path` | STRING | Yes | Absolute or relative path to the markdown file. |
| `title` | STRING | Yes | Title extracted from H1 header or filename. |
| `tags` | ARRAY (STRING) | No | List of tags parsed from YAML frontmatter. |
| `type` | STRING | No | Document type (e.g., project-spec, concept, daily-note). |
| `last_modified` | TIMESTAMP | Yes | Timestamp of last file system modification. |
| `content_hash` | STRING | Yes | SHA-256 hash of note content to detect changes. |

### Model 2: Note Links (Bidirectional links mapping)
Stores cross-references between notes (Obsidian `[[Double Brackets]]` syntax).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | INTEGER | Yes (PK) | Auto-incrementing identifier. |
| `source_note_id` | STRING (UUID) | Yes (FK) | ID of the note containing the link. |
| `target_note_path` | STRING | Yes | Path or target name specified in the link. |
| `target_note_id` | STRING (UUID) | No | Resolved ID of the target note (nullable if broken link). |

### Model 3: Vector Embeddings (LanceDB / Vector Store)
Stores vector representations of document chunks for semantic search.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `chunk_id` | STRING | Yes (PK) | Unique identifier for the chunk (`note_id` + chunk index). |
| `note_id` | STRING (UUID) | Yes (FK) | Reference to the parent note. |
| `chunk_text` | STRING | Yes | Raw text content of the paragraph or section. |
| `vector` | VECTOR (384) | Yes | Dense embedding vector (e.g., using `all-MiniLM-L6-v2`). |

## Changelog
- **[2026-06-27]** Initialized database schema draft with metadata, links mapping, and vector embeddings structures.
