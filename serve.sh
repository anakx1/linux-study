#!/usr/bin/env bash
# Start a local web server for the study guide.
# Usage: ./serve.sh [port]
set -e
PORT="${1:-8099}"
cd "$(dirname "$0")"
echo "How Linux Works Study Lab"
echo "Serving $(pwd)"
echo "Open http://localhost:${PORT}/"
echo "Press Ctrl+C to stop."
exec python3 -m http.server "$PORT" --bind 127.0.0.1
