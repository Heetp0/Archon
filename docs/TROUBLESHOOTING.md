# Archon Troubleshooting Guide

Common runtime issues and automated recovery steps.

---

## 1. Common Failures & Solutions

### Problem 1: Backend starts but cannot call Groq / Gemini API
- **Cause**: Invalid or unconfigured `GROQ_API_KEY` or `GEMINI_API_KEY`.
- **Solution**: Run `python scripts/verify_env.py` to test API key validity. Update `.env`.

### Problem 2: Vector DB (LanceDB) Connection Refused / Corrupted
- **Cause**: File lock or corrupted table index.
- **Solution**: Run auto-recovery script:
  ```bash
  python scripts/recover_from_failure.py
  ```

### Problem 3: Local Ollama Model Unreachable
- **Cause**: Ollama service is not running on port 11434.
- **Solution**: Start Ollama in background:
  ```bash
  ollama serve
  ollama pull qwen2.5-coder:7b
  ```

### Problem 4: High CPU or Memory Usage Alert
- **Cause**: Heavy batch transcription or local LLM execution.
- **Solution**: Check `/api/alerts/recent` for alert details and acknowledge.

---

## 2. Self-Healing & Recovery Script

Run automated system recovery anytime:
```bash
python scripts/recover_from_failure.py
```
