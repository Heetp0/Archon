# Archon Backend

FastAPI backend services for Archon AI OS.

## Core Modules

- `main.py`: Main API application & route registrations
- `model_router.py`: LLM provider routing (Groq, Gemini, Ollama)
- `audio_processor.py`: Spectral noise reduction & Groq Whisper transcription
- `note_generator.py`: 5-agent study note synthesis pipeline
- `notion_converter.py` & `notion_exporter.py`: Notion integration
- `monitoring_metrics.py` & `scaling_monitor.py`: Telemetry and resource monitoring
