#!/bin/bash
# setup.sh — Idempotent Archon bootstrap script
set -e

echo "🚀 Archon Bootstrap — $(date)"

# 1. Check prerequisites
echo "✓ Checking system requirements..."
command -v python3 >/dev/null 2>&1 || { echo "❌ Python 3 required"; exit 1; }
command -v git >/dev/null 2>&1 || { echo "❌ Git required"; exit 1; }

PYTHON_VERSION=$(python3 -c 'import sys; print(sys.version_info[1])')
if [ "$PYTHON_VERSION" -lt 9 ]; then
    echo "❌ Python 3.9+ required"
    exit 1
fi

# 2. Check repository directory
echo "✓ Verifying Archon directory structure..."
if [ ! -f "backend/main.py" ]; then
    echo "⚠️ backend/main.py not found in current directory. Navigating to project root..."
    if [ -d "archon" ]; then
        cd archon
    fi
fi

# 3. Create .env from .env.example if missing
if [ ! -f ".env" ] && [ ! -f "backend/.env" ]; then
    echo "⚠️ .env not found. Creating from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
    elif [ -f "backend/.env.example" ]; then
        cp backend/.env.example backend/.env
    else
        echo "GROQ_API_KEY=your_groq_key_here" > .env
        echo "GEMINI_API_KEY=your_gemini_key_here" >> .env
        echo "LANCEDB_PATH=./data/lancedb" >> .env
        echo "OBSIDIAN_VAULT_PATH=D:/Notes" >> .env
    fi
    echo "⚠️ IMPORTANT: Please edit .env with your API keys before proceeding."
fi

# 4. Verify .env
echo "✓ Verifying environment variables..."
python3 scripts/verify_env.py || { echo "❌ .env validation failed"; exit 1; }

# 5. Virtual Environment
if [ ! -d "backend/venv" ] && [ ! -d "venv" ]; then
    echo "✓ Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate || source venv/Scripts/activate
else
    if [ -d "backend/venv" ]; then
        source backend/venv/bin/activate 2>/dev/null || source backend/venv/Scripts/activate 2>/dev/null || true
    elif [ -d "venv" ]; then
        source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null || true
    fi
fi

# 6. Install dependencies
echo "✓ Installing backend dependencies..."
if [ -f "backend/requirements.txt" ]; then
    pip install -q --upgrade pip setuptools wheel
    pip install -q -r backend/requirements.txt
elif [ -f "requirements.txt" ]; then
    pip install -q --upgrade pip setuptools wheel
    pip install -q -r requirements.txt
fi

# 7. Initialize LanceDB database
echo "✓ Initializing database..."
python3 scripts/init_database.py

# 8. Test backend import
echo "✓ Testing backend modules..."
python3 -c "import sys; sys.path.append('backend'); from main import app; print('✅ Backend import OK')" || { echo "❌ Backend import check failed"; exit 1; }

# 9. Run Health Check
echo "✓ Running health checks..."
python3 scripts/health_check.py

echo ""
echo "✅ Bootstrap complete! Next steps:"
echo "   1. Start backend:  cd backend && uvicorn main:app --reload --port 8000"
echo "   2. Start frontend: cd frontend/artifacts/archon_design && pnpm dev"
echo "   3. Open browser:  http://localhost:5173"
echo ""
