#!/usr/bin/env bash
set -e
echo "Node version: $(node -v)"
echo "Working dir: $(pwd)"
echo "Listing /app/server:"
ls -la /app/server || true
echo "Listing /app/server/dist:"
ls -la /app/server/dist || true
echo "Starting server..."
exec node dist/index.js

