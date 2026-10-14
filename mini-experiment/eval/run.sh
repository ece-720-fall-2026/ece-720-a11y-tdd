#!/usr/bin/env bash
# Scores one scenario. Run from this repo:
#   mini-experiment/eval/run.sh <setup> [label]
#   e.g. mini-experiment/eval/run.sh red-small
#        mini-experiment/eval/run.sh red-small opus
# Scores the committed state of the scenario's run-N branch in $STOREFRONT_REPO
# (default ~/code/ualberta/stride), writes mini-experiment/results/<setup>[--<label>]/
# and regenerates results/summary.csv.
set -euo pipefail

if [ $# -lt 1 ]; then
  sed -n '2,7p' "$0"
  exit 1
fi

HERE="$(cd "$(dirname "$0")" && pwd)"
SETUP="$1"
LABEL="${2:-}"
STOREFRONT_REPO="${STOREFRONT_REPO:-$HOME/code/ualberta/stride}"
case "$SETUP" in
  baseline) BRANCH=run-1 ;;
  red-small) BRANCH=run-2 ;;
  red-comprehensive) BRANCH=run-3 ;;
  green-small) BRANCH=run-4 ;;
  green-comprehensive) BRANCH=run-5 ;;
  red-tool) BRANCH=run-6 ;;
  *) [ -n "${BRANCH:-}" ] || { echo "Unknown setup: $SETUP (or set BRANCH=...)" >&2; exit 1; } ;;
esac
NAME="$SETUP${LABEL:+--$LABEL}"
OUT="$HERE/../results/$NAME"
PORT="${PORT:-4101}"
URL="http://localhost:$PORT"
WT="$(mktemp -d)/checkout"

git -C "$STOREFRONT_REPO" rev-parse --verify -q "$BRANCH" >/dev/null || { echo "No branch $BRANCH" >&2; exit 1; }
if lsof -ti "tcp:$PORT" >/dev/null 2>&1; then
  echo "Port $PORT is in use; stop that server first (or set PORT=...)." >&2
  exit 1
fi

cleanup() {
  lsof -ti "tcp:$PORT" | xargs kill 2>/dev/null || true
  git -C "$STOREFRONT_REPO" worktree remove --force "$WT" 2>/dev/null || true
}
trap cleanup EXIT

[ -d "$HERE/node_modules" ] || (cd "$HERE" && pnpm install)
git -C "$STOREFRONT_REPO" worktree add -q --detach "$WT" "$BRANCH"
APP="$WT"
(cd "$APP" && pnpm install --frozen-lockfile >/dev/null)

rm -rf "$OUT"
mkdir -p "$OUT"
COMMIT="$(git -C "$WT" rev-parse HEAD)"

echo "==> Building $BRANCH ($COMMIT)"
BUILD_OK=true
(cd "$APP" && pnpm exec next build >"$OUT/build.log" 2>&1) || BUILD_OK=false
printf '{"setup":"%s","label":"%s","branch":"%s","commit":"%s","buildOk":%s,"date":"%s"}\n' \
  "$SETUP" "$LABEL" "$BRANCH" "$COMMIT" "$BUILD_OK" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >"$OUT/meta.json"

node "$HERE/eslint-score.mjs" "$APP" "$OUT"
node "$HERE/tests-profile.mjs" "$APP" "$OUT"

if [ "$BUILD_OK" = true ]; then
  echo "==> Starting production server on $PORT"
  (cd "$APP" && exec pnpm exec next start -p "$PORT" >"$OUT/server.log" 2>&1) &
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
