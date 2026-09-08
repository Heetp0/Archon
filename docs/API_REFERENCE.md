# Archon API Reference Manual

Complete HTTP REST & WebSocket API specification.

---

## Core Endpoints

### 1. Chat & Model Routing
`POST /api/chat`
- Request: `{"message": "Hello", "tier": "quality" | "fast" | "local"}`
- Response: Stream or JSON response.

### 2. Lecture Audio to Notes
`POST /api/lectures/upload`
- Form Data: `subject`, `lecture_num`, `audio_file`, `prof_notes`, `export_to` ("obsidian,notion")
- Response: `{"job_id": "...", "status": "queued"}`

`GET /api/lectures/jobs/{job_id}`
- Response: Job progress status & step description.

`WS /api/lectures/jobs/{job_id}/ws`
- WebSocket stream for real-time progress updates.

### 3. Monitoring & Operations
`GET /api/metrics/summary?period=24h`
- Returns SLA uptime, latency, token usage, cost, error rate, time series.

`GET /api/alerts/recent`
- Returns recent infrastructure alerts.

`POST /api/alerts/acknowledge/{alert_id}`
- Acknowledges an active scaling/health alert.
