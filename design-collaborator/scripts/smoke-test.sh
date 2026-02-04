#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

echo "Running build..."
if [ ! -d "node_modules" ]; then
  echo "node_modules missing. Installing dependencies..."
  npm install
fi

npm run build

echo "Verifying index setup..."
node scripts/verify-index.mjs

echo "Smoke test passed."
