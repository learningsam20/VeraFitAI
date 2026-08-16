#!/bin/bash
# ==========================================
# VeraFit AI — Test Suite Runner
# ==========================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "🧪 Running VeraFit Backend Tests..."
cd "$ROOT_DIR"
source backend/.venv/bin/activate
PYTHONPATH=. pytest backend/tests -v

echo ""
echo "🏗️ Running Frontend Typecheck..."
cd "$ROOT_DIR/frontend"
npm run typecheck

echo ""
echo "✅ All tests and builds passed successfully!"
