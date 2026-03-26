#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
CONTAINER_NAME=stdout-server-dev
PORT="${PORT:-10661}"

docker rm -f "$CONTAINER_NAME" stdout-server-run >/dev/null 2>&1 || true

docker run -d \
  --name "$CONTAINER_NAME" \
  -p "${PORT}:10661" \
  -e PORT=10661 \
  -v "$SCRIPT_DIR:/app" \
  -v stdout-server-node-modules:/app/node_modules \
  -w /app \
  oven/bun:1 \
  sh -lc 'bun install && exec bun --watch src/main.ts'

printf 'stdout-server running at http://localhost:%s\n' "$PORT"
printf 'Container: %s\n' "$CONTAINER_NAME"
printf 'Logs: docker logs -f %s\n' "$CONTAINER_NAME"
