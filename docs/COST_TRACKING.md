# Archon Cost Tracking & Provider Optimization

Overview of model pricing, token usage tracking, and cost management.

---

## 1. Provider Cost Rates (USD / 1M Tokens)

| Provider | Model | Input Rate | Output Rate | Notes |
|---|---|---|---|---|
| **Groq** | Llama 3.3 70B | $0.59 | $0.79 | Free tier available |
| **Google** | Gemini 2.0 Flash | $0.10 | $0.40 | High throughput |
| **Ollama** | Local Qwen 2.5 7B | $0.00 | $0.00 | Self-hosted local default |

---

## 2. Monitoring Token Spend

- View estimated spend in real-time on the **Monitoring Dashboard**.
- Configurable threshold alerts in `.env`:
  ```ini
  ALERT_COST_THRESHOLD=5.0     # Alert if daily spend > $5.00
  ALERT_TOKENS_THRESHOLD=500000# Alert if daily tokens > 500k
  ```
