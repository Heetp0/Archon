# Project: Archon Notes Ink Canvas

## Architecture
- **Android Application**:
  - **Jetpack Compose UI**: Main activity displaying the multi-page canvas, toolbar, page switcher, and sync controls.
  - **androidx.ink (Canvas & Input)**: Custom canvas layer capturing stylus inputs using `InProgressStrokes` and rendering permanent dry strokes via `CanvasStrokeRenderer`.
  - **Palm Rejection**: Motion event filtering rejecting non-stylus inputs using `MotionEvent.getToolType()`.
  - **Low-Latency Rendering**: Utilizing `GLFrontBufferedRenderer` for front-buffer graphics output.
  - **Motion Prediction**: Integrating `MotionEventPredictor` to predict and render future stroke coordinates.
  - **Stroke Serialization**: Converting strokes to binary format using `androidx.ink.storage` (`StrokeInputBatch` encoding/decoding) and mapping custom brush payloads.
  - **Sync Service**: Network communication (Retrofit/OkHttp/Ktor) connecting to the FastAPI backend.
- **FastAPI Daemon Backend**:
  - **Endpoints**: Route paths added to `notebook_routes.py` for `/notebook/pages/{page_id}/strokes`.
  - **Storage**: Saving serialized strokes to disk at `daemon/data/strokes/{page_id}.bin`.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Sync Endpoints | FastAPI routes (GET/POST) in daemon | None | IN_PROGRESS (Conv: 1b0a5895-f2ea-498f-9e5b-1d5d52b36c84) |
| 2 | Project Setup | Initialize Kotlin/Compose Gradle project, pin androidx.ink dependencies | None | IN_PROGRESS (Conv: 3da88f1c-33bb-4ce4-99e4-5f449fb56e0f) |
| 3 | Ink Canvas | Compose Canvas, tool type palm rejection, low latency, motion prediction | M2 | PLANNED |
| 4 | Multi-Page & Serialization | Toolbar, page switcher, independent page state, stroke serialization | M3 | PLANNED |
| 5 | E2E Sync & Verification | Network client integration, E2E stroke round-trip verification | M1, M4 | PLANNED |

## Interface Contracts
### Android Client ? FastAPI Daemon Sync API
- **Upload Page Strokes**:
  - **Route**: `POST /notebook/pages/{page_id}/strokes`
  - **Request Body**: Binary payload of serialized strokes (or JSON wrap: `{"strokes": "<base64>"}`)
  - **Response**: `{"status": "success", "page_id": "{page_id}"}`
- **Retrieve Page Strokes**:
  - **Route**: `GET /notebook/pages/{page_id}/strokes`
  - **Response**: Binary payload or JSON wrap: `{"page_id": "{page_id}", "strokes": "<base64>"}`

### Stroke Serialization Format (DTransfer Object)
- **SerializedStroke**:
  - `inputs`: `ByteArray` (from `StrokeInputBatch.encode`)
  - `brush`: `SerializedBrush` (color, size, epsilon, family enum)
- **SerializedBrush**:
  - `size`: `Float`
  - `color`: `Long`
  - `epsilon`: `Float`
  - `stockBrush`: `SerializedStockBrush` (Marker, PressurePen, Highlighter, DashedLine)
  - `clientBrushFamilyId`: `String?`

