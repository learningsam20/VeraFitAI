#!/bin/bash
# ==========================================
# VeraFit AI — Restart Services Script
# ==========================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "🔄 Restarting VeraFit AI..."
"$ROOT_DIR/scripts/stop.sh"
sleep 1
"$ROOT_DIR/scripts/start.sh"
