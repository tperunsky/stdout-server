#!/bin/sh
set -eu

docker rm -f stdout-server-dev stdout-server-run >/dev/null 2>&1 || true
echo "stdout-server stopped"
