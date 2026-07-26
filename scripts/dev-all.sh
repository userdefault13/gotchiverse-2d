#!/usr/bin/env bash
# Start Gotchiverse FE (:3001) + REALM BE (:2567) together.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BE_DIR="${GOTCHIVERSE_BE_DIR:-$ROOT/../gotchiverse-realm-server}"

if [[ ! -f "$BE_DIR/package.json" ]]; then
  echo "REALM server not found at $BE_DIR" >&2
  echo "Clone gotchiverse-realm-server as a sibling, or set GOTCHIVERSE_BE_DIR." >&2
  exit 1
fi

cleanup() {
  trap - EXIT INT TERM
  kill 0 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "FE  → http://localhost:3001  ($ROOT)"
echo "BE  → http://localhost:2567  ($BE_DIR)"
echo "Ctrl+C stops both."

(cd "$ROOT" && yarn dev) &
(cd "$BE_DIR" && npm run dev) &
wait
