#!/usr/bin/env bash
set -euo pipefail
echo "Node version: $(node -v)"
echo "Working dir: $(pwd)"
echo "Listing /app/server:"; ls -la /app/server || true
echo "Listing /app/server/dist:"; ls -la /app/server/dist || true
echo "Listing /app/server/dist/server:"; ls -la /app/server/dist/server || true
echo "Starting server..."

if [ -f "/app/server/dist/server/index.js" ]; then
  exec node /app/server/dist/server/index.js
elif [ -f "/app/server/dist/index.js" ]; then
  exec node /app/server/dist/index.js
else
  echo "No build artifact found in dist/. Contents:"
  ls -R /app/server/dist || true
  exit 1
fi
