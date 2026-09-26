#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/.."
command -v node >/dev/null || { echo 'Install Node.js 20+ first.' >&2; exit 1; }
echo 'Open http://127.0.0.1:4343 in your browser'
exec node server.js
