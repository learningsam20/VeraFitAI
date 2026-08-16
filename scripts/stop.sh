#!/bin/bash
# ==========================================
# VeraFit AI — Graceful Stop Script
# ==========================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_DIR="$ROOT_DIR/.pids"

# Export root .env variables
if [ -f "$ROOT_DIR/.env" ]; then
    set -a
    source "$ROOT_DIR/.env"
    set +a
fi

BACKEND_PORT=${BACKEND_PORT:-5194}
FRONTEND_PORT=${FRONTEND_PORT:-5193}

echo "🛑 Stopping VeraFit services..."

# 1. Stop Backend
if [ -f "$PID_DIR/backend.pid" ]; then
    BACKEND_PID=$(cat "$PID_DIR/backend.pid")
    if ps -p "$BACKEND_PID" > /dev/null 2>&1; then
        echo "   Stopping Backend (PID: $BACKEND_PID)..."
        kill -15 "$BACKEND_PID" 2>/dev/null || kill -9 "$BACKEND_PID" 2>/dev/null
    fi
    rm -f "$PID_DIR/backend.pid"
fi

# 2. Stop Frontend
if [ -f "$PID_DIR/frontend.pid" ]; then
    FRONTEND_PID=$(cat "$PID_DIR/frontend.pid")
    if ps -p "$FRONTEND_PID" > /dev/null 2>&1; then
        echo "   Stopping Frontend (PID: $FRONTEND_PID)..."
        kill -15 "$FRONTEND_PID" 2>/dev/null || kill -9 "$FRONTEND_PID" 2>/dev/null
    fi
    rm -f "$PID_DIR/frontend.pid"
fi

# 3. Clean up any remaining listener on configured and default ports
for PORT in $BACKEND_PORT $FRONTEND_PORT 5194 5193 8000 3000; do
    PID=$(lsof -ti :$PORT 2>/dev/null)
    if [ -n "$PID" ]; then
        echo "   Releasing port $PORT (PID: $PID)..."
        kill -15 $PID 2>/dev/null || kill -9 $PID 2>/dev/null
    fi
done

echo "✅ All VeraFit services stopped."
