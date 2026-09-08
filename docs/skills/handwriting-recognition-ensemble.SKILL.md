# handwriting-recognition-ensemble

## Overview
Ensemble handwriting recognition combining MyScript iink, Tesseract, and an optional custom model. Implements fan-out parallel calls, merge strategies, confidence badges, and custom model hot-swapping.

## Key Files
- `backend/TutorNetworkService.kt` — Ensemble orchestration (or equivalent)

## API / Interface
- `class HandwritingRecognitionEnsemble`

## Data Flow
1. Dispatch fan-out parallel calls every 2s (debounced) to all recognition engines.
2. If MyScript and Tesseract agree, prefer MyScript (better for math regions).
3. If they disagree (confidence delta >20%), show both and ask the user to select (for data collection).
4. Display confidence badges inline (e.g., [92%] monospace pill).
5. Log MyScript calls to `benchmark_loop_results`.

## Configuration
- Disagreement threshold: confidence delta > 20%.
- Debounce interval: 2 seconds.

## Error Handling
- Degrades to single engine if others time out.
- Custom model hot-swapped on startup and watched via Syncthing.
