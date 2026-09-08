# Archon Deployment Guide

Complete instructions for deploying Archon across local, cloud, and containerized environments.

---

## 1. Quick Bootstrap Setup (Any Machine)

On Linux, macOS, or Windows WSL:
```bash
git clone https://github.com/your-org/archon.git
cd archon
chmod +x setup.sh
./setup.sh
```

`setup.sh` handles:
- Checking Python 3.9+ and Git
- Copying `.env.example` to `.env` if missing
- Validating API keys and dependencies
- Setting up virtual environment & LanceDB
- Running health check verification

---

## 2. Oracle Cloud ARM (Ampere A1) Deployment

1. Provision an Ubuntu 22.04 ARM instance.
2. Run deployment script:
   ```bash
   chmod +x scripts/deploy_oracle.sh
   ./scripts/deploy_oracle.sh
   ```
3. Start systemd service or background daemon:
   ```bash
   cd backend
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```

---

## 3. Railway Cloud Deployment

1. Ensure `railway.json` is generated:
   ```bash
   ./scripts/deploy_railway.sh
   ```
2. Set environment variables (`GROQ_API_KEY`, `GEMINI_API_KEY`, `LANCEDB_PATH`) in Railway Dashboard.
3. Connect GitHub repository and trigger build.

---

## 4. Docker Deployment

Launch full-stack container environment:
```bash
./scripts/deploy_docker.sh
# Or manually:
docker-compose up -d --build
```
