# Archon API Reference Manual

Comprehensive HTTP REST & WebSocket API specification for the Archon Daemon (`backend/main.py`).

---

## 1. Authentication & Users

### Register
`POST /auth/register`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "securepassword",
    "role": "student"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "token": "jwt-token-string",
    "user": {
      "user_id": "uuid-v4",
      "email": "user@example.com",
      "role": "student"
    }
  }
  ```

### Login
`POST /auth/login`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "securepassword"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "token": "jwt-token-string",
    "user": {
      "user_id": "uuid-v4",
      "email": "user@example.com",
      "role": "student"
    }
  }
  ```

### Current User Profile
`GET /auth/me`
- **Headers**: `Authorization: Bearer <token>`
- **Response (200 OK)**:
  ```json
  {
    "user_id": "uuid-v4",
    "email": "user@example.com",
    "role": "student"
  }
  ```

---

## 2. Models & Settings

### List Available Models
`GET /models`
- **Headers**: `Authorization: Bearer <token>`
- **Response (200 OK)**:
  ```json
  {
    "models": [
      {
        "id": "groq/llama-3.3-70b-versatile",
        "name": "Groq Llama 3.3 70B",
        "tier": "fast",
        "context_window": 128000
      },
      {
        "id": "gemini/gemini-2.5-flash",
        "name": "Google Gemini 2.5 Flash",
        "tier": "quality",
        "context_window": 1000000
      }
    ]
  }
  ```

### Test API Key Format
`POST /settings/api-keys/test`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "provider": "openai",
    "api_key": "sk-proj-..."
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true
  }
  ```

### Save API Keys
`POST /settings/api-keys`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**: Key-value map of environment variables (e.g., `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`).
- **Response (200 OK)**: `{"status": "ok"}`

---

## 3. Agents Mode Endpoints

### List Agent Sessions
`GET /agents/sessions?limit=20`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Returns recent agent sessions stored in the SQLite journal (`agent_runs`).
- **Response (200 OK)**:
  ```json
  {
    "sessions": [
      {
        "task_id": "task_1725900000",
        "status": "completed",
        "started_at": "2026-09-09T16:00:00.000000",
        "updated_at": "2026-09-09T16:02:15.000000"
      }
    ]
  }
  ```

### Get Session History (Replay)
`GET /agents/sessions/{task_id}/history`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Returns all chronological steps (`agent_steps`) logged for a task run. Used by the web and Android frontends to reconstruct the live terminal upon page reload or network reconnect.
- **Response (200 OK)**:
  ```json
  {
    "task_id": "task_1725900000",
    "status": "completed",
    "step_count": 6,
    "steps": [
      {
        "step_index": 1,
        "agent_name": "Reader",
        "node_name": "reader_node",
        "input_payload": {"task": "..."},
        "output_payload": {"context": "..."},
        "status": "completed",
        "timestamp": "2026-09-09T16:00:05.000000"
      },
      {
        "step_index": 2,
        "agent_name": "Planner",
        "node_name": "planner_node",
        "input_payload": {"task": "..."},
        "output_payload": {
          "plan": "...",
          "plan_steps": [{"id": 1, "title": "Scaffold", "acceptance_criteria": "..."}]
        },
        "status": "completed",
        "timestamp": "2026-09-09T16:00:15.000000"
      }
    ]
  }
  ```

---

## 4. Notebook RAG & Ingestion

### List Notebooks
`GET /notebooks`
- **Headers**: `Authorization: Bearer <token>`
- **Response (200 OK)**:
  ```json
  {
    "notebooks": [
      {
        "id": "nb_uuid_1",
        "name": "Aerospace Propulsion",
        "created_at": 1725800000.0
      }
    ]
  }
  ```

### Create Notebook
`POST /notebooks`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**: `{"name": "Fluid Dynamics 101"}`
- **Response (201 Created)**:
  ```json
  {
    "id": "nb_uuid_2",
    "notebook_id": "nb_uuid_2",
    "name": "Fluid Dynamics 101",
    "created_at": 1725900000.0
  }
  ```

### Ingest Source File into Notebook
`POST /notebooks/{notebook_id}/sources`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: multipart/form-data`
- **Form Data**:
  - `source_type`: `"pdf"` | `"codebase"` | `"audio"`
  - `file`: `<Binary File>`
- **Response (202 Accepted)**:
  ```json
  {
    "job_id": "job_uuid_99",
    "status": "pending"
  }
  ```

### Poll Ingestion Job Status
`GET /jobs/{job_id}`
- **Headers**: `Authorization: Bearer <token>`
- **Response (200 OK)**:
  ```json
  {
    "job_id": "job_uuid_99",
    "status": "completed",
    "progress": 100,
    "current_step": "LanceDB indexing complete"
  }
  ```

---

## 5. Offline Queue & Synchronization

### Enqueue Offline Request
`POST /offline/queue`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "id": "req_uuid_123",
    "endpoint": "/notebooks/nb_1/sources",
    "method": "POST",
    "payload": {"title": "Offline Note"}
  }
  ```
- **Response (200 OK)**: `{"status": "queued", "id": "req_uuid_123"}`

### List User's Offline Queue
`GET /offline/queue/{user_id}`
- **Headers**: `Authorization: Bearer <token>`
- **Response (200 OK)**: Array of queued actions pending replay.

### Batch Sync
`POST /offline/sync`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "requests": [
      {
        "id": "req_uuid_123",
        "endpoint": "/notebooks/nb_1/notes",
        "method": "POST",
        "payload": {"content": "..."}
      }
    ]
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "results": [
      {"id": "req_uuid_123", "endpoint": "/notebooks/nb_1/notes", "status": "synced"}
    ]
  }
  ```

---

## 6. System Health, Metrics & Alerts

### System Metrics Summary
`GET /metrics/summary?period=24h`
- **Response (200 OK)**: Uptime SLA, latency distribution, token consumption, error rates.

### Recent Scaling & Resource Alerts
`GET /alerts/recent?limit=10`
- **Response (200 OK)**: List of active or historical RAM/CPU pressure alerts.

### Acknowledge Alert
`POST /alerts/acknowledge/{alert_id}`
- **Response (200 OK)**: `{"status": "success", "alert_id": "alert_uuid"}`

---

## 7. Real-Time WebSocket Protocol (`/ws`)

Archon multiplexes all interactive modes over a single WebSocket route: `/ws`.

### Connection Handshake
Clients connect to: `ws://localhost:8000/ws` (or remote daemon IP).

### Client Message Framing
All messages from the client must be JSON formatted:
```json
{
  "id": "request-uuid-string",
  "mode": "chat | council | research | agent",
  "type": "execute | confirm | cancel",
  "payload": {
    "content": "User request or directive",
    "context": {
      "attachments": [
        {
          "name": "spec.pdf",
          "content": "base64-encoded-data"
        }
      ]
    },
    "token_budget": 50000,
    "max_steps": 80
  }
}
```

### Server Event Framing
The server emits discrete event objects:
```json
{
  "id": "request-uuid-string",
  "event": "<event_name>",
  "payload": { ... }
}
```

### Event Specifications by Mode

#### A. Shared Events (All Modes)
- `status`: High-level agent activity status string.
  ```json
  {"status": "Reader: Scanning workspace files for context...", "model": "Reader"}
  ```
- `token`: Streaming generation chunk from active model.
  ```json
  {"content": "def solve():\n    return True\n", "model": "Coder"}
  ```
- `error`: Unrecoverable exception or budget halt.
  ```json
  {"error": "Autopilot Supervisor halted: Token budget exceeded"}
  ```
- `done`: Successful completion signal.
  ```json
  {"status": "success"}
  ```

#### B. Agents Mode (`mode: "agent"`)
- `plan_steps`: Devin-style structured plan steps.
  ```json
  {
    "task_id": "task_1725900000",
    "steps": [
      {
        "id": 1,
        "title": "Analyze dependencies",
        "acceptance_criteria": "Confirm package.json validity"
      },
      {
        "id": 2,
        "title": "Implement auth middleware",
        "acceptance_criteria": "Tests pass with 100% coverage"
      }
    ]
  }
  ```
- `tool_call`: Transparent tool call notification (Claude Code `⏺` bullet style).
  ```json
  {
    "tool": "vault_search | opencode",
    "input": "search query or command",
    "status": "running | done",
    "exit_code": 0
  }
  ```
- `gate`: Human-in-the-loop checkpoint before executing filesystem or shell changes.
  ```json
  {
    "action": "execute_code",
    "command": "Run and test solution.py",
    "target_subproject": "Workspace/ProjectHub",
    "files_affected": ["solution.py"],
    "solution_preview": "def solution():\n    ...",
    "retry_count": 0,
    "plan_steps": [...]
  }
  ```
- `retry`: Self-correction notice when tester returns FAIL.
  ```json
  {
    "attempt": 1,
    "max": 3,
    "reason": "VERDICT: FAIL - missing import pytest"
  }
  ```
- `session_metadata`: Emitted at run start and run completion with metadata for session persistence.
  ```json
  {
    "task_id": "task_1725900000",
    "status": "completed",
    "verdict": "PASS",
    "retries": 1,
    "plan_steps": [...]
  }
  ```

#### C. Research Mode (`mode: "research"`)
- `outline`: STORM-style generated Wikipedia outline.
- `sources`: Array of deduplicated `ResearchSource` objects with titles and URLs.
- `suggestions`: Follow-up research queries.
- `graph_nodes`: Graph visualizer nodes for the topic knowledge graph.

#### D. Council Mode (`mode: "council"`)
- `round`: Milestone indicator (`"Round 1: Parallel Drafts"`, `"Round 2: Peer Critique"`, `"Round 3: Consensus Verdict"`).
- `peer_drafts`: Raw drafts from model panel for comparative inspection.
