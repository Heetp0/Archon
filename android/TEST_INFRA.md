# E2E Test Infrastructure: Archon Notes Ink Canvas

This directory contains the End-to-End (E2E) testing suite for the Archon Notes Ink Canvas. It validates the complete path from stylus input capture on the Jetpack Compose canvas to serialization, storage, and FastAPI synchronization.

## Directory Structure

```text
e2e-tests/
├── daemon/
│   ├── conftest.py
│   └── test_e2e_canvas_sync.py
└── journeys/
    ├── journey_draw_and_sync.xml
    ├── journey_palm_rejection.xml
    └── journey_multi_page.xml
```

---

## 1. Daemon API E2E Tests (Python/pytest)

These tests validate the synchronization API and serialization contracts.

### Setup Requirements
1. Install Python 3.10+
2. Install dependencies:
   ```bash
   pip install pytest httpx fastapi uvicorn
   ```

### Pytest Configuration (conftest.py)
Provides a FastAPI TestClient fixture testing the strokes endpoints (`GET/POST /notebook/pages/{page_id}/strokes`). The fixture manages setup and cleanup of a test data directory (`e2e_data/strokes`).

### Sync Endpoint Tests (test_e2e_canvas_sync.py)
Implements exactly 60 distinct tests covering Tiers 1-4:
- **Tier 1 (Feature Coverage)**: T1.F1.1 to T1.F5.5 (25 cases)
- **Tier 2 (Boundary & Corner Cases)**: T2.F1.1 to T2.F5.5 (25 cases)
- **Tier 3 (Cross-Feature Combinations)**: T3.1 to T3.5 (5 cases)
- **Tier 4 (Real-World Application Scenarios)**: T4.1 to T4.5 (5 cases)

---

## 2. Android UI Journey Tests (XML / android-cli)

These tests simulate touch and stylus gestures, verifying visual elements, page navigation, and integration logic.

### Journey Definition Format

#### Journey: Draw and Sync Stroke (journey_draw_and_sync.xml)
Verifies that selecting a brush, drawing a stylus stroke on the canvas, and triggering sync uploads data to the backend.

#### Journey: Palm Rejection Verification (journey_palm_rejection.xml)
Verifies that finger/palm touches do not draw lines while a stylus is in use, and that canceled inputs are cleared.

#### Journey: Multi-Page Canvas Navigation (journey_multi_page.xml)
Verifies adding pages, drawing different strokes on each page, switching between pages to verify retention, and syncing the multi-page notebook.

---

## 3. Local Verification Pipeline

To execute the verification locally:

### Run Daemon E2E Tests
```powershell
python -m pytest "d:/The core/Workspace/Android/archon-notes/e2e-tests/daemon"
```
