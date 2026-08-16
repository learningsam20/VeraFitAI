#!/bin/bash
# ==========================================
# VeraFit AI — Force Kill All Script
# ==========================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_DIR="$ROOT_DIR/.pids"

echo "⚡ Forcefully terminating all VeraFit processes..."

# 1. Kill by Ports (5193, 5194, 8000, 3000)
for PORT in 5194 5193 8000 3000; do
    PIDS=$(lsof -ti :$PORT 2>/dev/null)
    if [ -n "$PIDS" ]; then
        echo "   Killing process(es) on port $PORT: $PIDS"
        kill -9 $PIDS 2>/dev/null || true
    fi
done

# 2. Kill by process patterns
pkill -9 -f "uvicorn.*backend.app.main:app" 2>/dev/null || true
pkill -9 -f "vite.*5193" 2>/dev/null || true
pkill -9 -f "vite dev" 2>/dev/null || true
pkill -9 -f "vite preview" 2>/dev/null || true

# 3. Clean PID directory
rm -rf "$PID_DIR"
mkdir -p "$PID_DIR"

echo "✅ Force kill complete. All ports and processes cleared."
