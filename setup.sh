#!/usr/bin/env bash
# setup.sh — Archon One-Click Installer
# Tested on: Ubuntu 22.04 LTS / Oracle Linux 8 (ARM64 / x86_64)
set -euo pipefail

ARCHON_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="$ARCHON_DIR/.data"

echo ""
echo "╔════════════════════════════════════════╗"
echo "║         ARCHON SETUP SCRIPT            ║"
echo "╚════════════════════════════════════════╝"
echo ""

# ─────────────────────────────────────────
# 1. Verify Docker + Docker Compose
# ─────────────────────────────────────────
echo "→ Checking Docker..."
if ! command -v docker &>/dev/null; then
    echo "  Docker not found. Installing..."
    curl -fsSL https://get.docker.com | bash
    sudo usermod -aG docker "$USER"
    echo "  Docker installed. You may need to log out and back in."
fi

if ! docker compose version &>/dev/null; then
    echo "  Docker Compose plugin not found. Installing..."
    DOCKER_COMPOSE_VERSION="v2.27.0"
    sudo curl -SL "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-linux-$(uname -m)" \
        -o /usr/local/lib/docker/cli-plugins/docker-compose
    sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
fi

echo "  Docker $(docker --version) ✓"
echo "  Docker Compose $(docker compose version --short) ✓"

# ─────────────────────────────────────────
# 2. Create persistent data directories
# ─────────────────────────────────────────
echo ""
echo "→ Creating data directories..."
mkdir -p "$DATA_DIR/lancedb" "$DATA_DIR/strokes" "$DATA_DIR/backups" "$DATA_DIR/training"
echo "  Data dirs created at $DATA_DIR ✓"

# ─────────────────────────────────────────
# 3. Bootstrap .env if missing
# ─────────────────────────────────────────
ENV_FILE="$ARCHON_DIR/backend/.env"
if [ ! -f "$ENV_FILE" ]; then
    echo ""
    echo "→ Creating .env from template..."
    cat > "$ENV_FILE" << 'EOF'
# ─── Required ───────────────────────────────
WORKSPACE_ROOT=/data
DAEMON_PORT=8000

# ─── LLM API Keys (add at least one) ────────
GROQ_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=

# ─── Optional ───────────────────────────────
JWT_SECRET_KEY=change_this_to_a_strong_random_secret
MYSCRIPT_APP_KEY=
MYSCRIPT_HMAC_KEY=
TESSERACT_MODEL_PATH=/usr/share/tesseract-ocr/5/tessdata
EOF
    echo "  .env created at $ENV_FILE"
    echo "  ⚠  Please add your API keys before starting!"
fi

# ─────────────────────────────────────────
# 4. Export volume paths for compose
# ─────────────────────────────────────────
export LANCEDB_HOST_PATH="$DATA_DIR/lancedb"
export STROKES_HOST_PATH="$DATA_DIR/strokes"
export BACKUPS_HOST_PATH="$DATA_DIR/backups"
export TRAINING_HOST_PATH="$DATA_DIR/training"

# ─────────────────────────────────────────
# 5. Build and start containers
# ─────────────────────────────────────────
echo ""
echo "→ Building Docker images (this may take a few minutes on first run)..."
docker compose -f "$ARCHON_DIR/docker-compose.yml" build

echo ""
echo "→ Starting Archon services..."
docker compose -f "$ARCHON_DIR/docker-compose.yml" up -d

# ─────────────────────────────────────────
# 6. Health check
# ─────────────────────────────────────────
echo ""
echo "→ Waiting for backend to become healthy..."
for i in {1..30}; do
    if curl -sf http://localhost:8000/models &>/dev/null; then
        echo "  Backend healthy ✓"
        break
    fi
    sleep 2
done

echo ""
echo "╔════════════════════════════════════════╗"
echo "║         ARCHON IS RUNNING              ║"
echo "╠════════════════════════════════════════╣"
echo "║  Frontend:  http://localhost           ║"
echo "║  Backend:   http://localhost:8000      ║"
echo "╚════════════════════════════════════════╝"
echo ""
