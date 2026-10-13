#!/usr/bin/env bash
# Scores one generated scenario.
# Usage: mini-experiment/eval/run.sh <worktree> <setup> [run-label]
#   e.g. mini-experiment/eval/run.sh ../runs/storefront-red-small red-small
#        mini-experiment/eval/run.sh ../runs/storefront-red-small-r2 red-small r2
# Writes mini-experiment/results/<setup>[-<run>]/{meta,axe,keyboard,eslint,tests-profile}.json
# and regenerates mini-experiment/results/summary.csv.
set -euo pipefail

if [ $# -lt 2 ]; then
  sed -n '2,7p' "$0"
  exit 1
fi

HERE="$(cd "$(dirname "$0")" && pwd)"
WT="$(cd "$1" && pwd)"
SETUP="$2"
RUN="${3:-r1}"
NAME="$SETUP"
[ "$RUN" != "r1" ] && NAME="$SETUP-$RUN"
OUT="$HERE/../results/$NAME"
PORT="${PORT:-4001}"
URL="http://localhost:$PORT"

if lsof -ti "tcp:$PORT" >/dev/null 2>&1; then
  echo "Port $PORT is in use; stop that server first (or set PORT=...)." >&2
  exit 1
fi

[ -d "$HERE/node_modules" ] || (cd "$HERE" && pnpm install)
[ -d "$WT/node_modules" ] || (cd "$WT" && pnpm install --frozen-lockfile)

rm -rf "$OUT"
mkdir -p "$OUT"
COMMIT="$(git -C "$WT" rev-parse HEAD)"
DIRTY="$(git -C "$WT" status --porcelain | wc -l | tr -d ' ')"

echo "==> Building $WT ($COMMIT)"
BUILD_OK=true
(cd "$WT" && pnpm exec next build >"$OUT/build.log" 2>&1) || BUILD_OK=false
printf '{"setup":"%s","run":"%s","worktree":"%s","commit":"%s","uncommittedFiles":%s,"buildOk":%s,"date":"%s"}\n' \
  "$SETUP" "$RUN" "$WT" "$COMMIT" "$DIRTY" "$BUILD_OK" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >"$OUT/meta.json"

node "$HERE/eslint-score.mjs" "$WT" "$OUT"
node "$HERE/tests-profile.mjs" "$WT" "$OUT"

if [ "$BUILD_OK" = true ]; then
  echo "==> Starting production server on $PORT"
  (cd "$WT" && exec pnpm exec next start -p "$PORT" >"$OUT/server.log" 2>&1) &
  trap 'lsof -ti "tcp:$PORT" | xargs kill 2>/dev/null || true' EXIT
  for _ in $(seq 1 60); do
    curl -sf "$URL/product" >/dev/null 2>&1 && break
    sleep 1
  done
  echo "==> Running axe-core and keyboard checks"
  (cd "$HERE" && EVAL_BASE_URL="$URL" RESULTS_DIR="$OUT" pnpm exec playwright test) ||
    echo "warning: an eval spec errored; see output above" >&2
else
  echo "Build failed (see $OUT/build.log); skipping runtime checks." >&2
fi

node "$HERE/summarize.mjs"
