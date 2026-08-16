#!/bin/bash
# ==========================================
# VeraFit AI — Start Services Script
# ==========================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_DIR="$ROOT_DIR/.pids"
LOG_DIR="$ROOT_DIR/logs"

mkdir -p "$PID_DIR"
mkdir -p "$LOG_DIR"

# Export root .env variables to current environment
if [ -f "$ROOT_DIR/.env" ]; then
    set -a
    source "$ROOT_DIR/.env"
    set +a
fi

BACKEND_PORT=${BACKEND_PORT:-5194}
FRONTEND_PORT=${FRONTEND_PORT:-5193}

echo "🚀 Starting VeraFit AI Services..."

# 1. Start Backend (FastAPI + LangGraph)
echo "📦 [1/2] Launching Backend on http://localhost:$BACKEND_PORT..."
cd "$ROOT_DIR"
source backend/.venv/bin/activate
PYTHONPATH=. nohup python3 -m uvicorn backend.app.main:app --host 0.0.0.0 --port $BACKEND_PORT > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > "$PID_DIR/backend.pid"
echo "   Backend started (PID: $BACKEND_PID, Log: logs/backend.log)"

# 2. Start Frontend (Vite + React)
echo "💻 [2/2] Launching Frontend on http://localhost:$FRONTEND_PORT..."
cd "$ROOT_DIR/frontend"
nohup npm run dev > "$LOG_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > "$PID_DIR/frontend.pid"
echo "   Frontend started (PID: $FRONTEND_PID, Log: logs/frontend.log)"

echo ""
echo "✨ VeraFit AI is running:"
echo "   🌐 Frontend Studio:  http://localhost:$FRONTEND_PORT"
echo "   🔌 Backend API Docs: http://localhost:$BACKEND_PORT/docs"
echo "   🩺 Health Check:     http://localhost:$BACKEND_PORT/health"
echo ""
echo "Use './scripts/stop.sh' to stop or './scripts/restart.sh' to restart."
