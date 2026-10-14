#!/usr/bin/env bash
# Runs the matchers against the mini-experiment calibration components inside the stride app.
#   ./scripts/calibration.sh [accessible|inaccessible]   (default: both)
# Uses a temporary worktree of $STOREFRONT_REPO (default ~/code/ualberta/stride) on main.
set -euo pipefail

HERE="$(cd "$(dirname "$0")/.." && pwd)"
CALIBRATION="$HERE/../mini-experiment/eval/calibration"
STOREFRONT_REPO="${STOREFRONT_REPO:-$HOME/code/ualberta/stride}"
PORT="${PORT:-4201}"
VARIANTS=("${@:-accessible inaccessible}")
read -r -a VARIANTS <<<"${VARIANTS[*]}"

if lsof -ti "tcp:$PORT" >/dev/null 2>&1; then
  echo "Port $PORT is in use; stop that server first (or set PORT=...)." >&2
  exit 1
fi

WT="$(mktemp -d)/checkout"
cleanup() {
  lsof -ti "tcp:$PORT" | xargs kill 2>/dev/null || true
  git -C "$STOREFRONT_REPO" worktree remove --force "$WT" 2>/dev/null || true
}
trap cleanup EXIT

git -C "$STOREFRONT_REPO" worktree add -q --detach "$WT" main
(cd "$WT" && pnpm install --frozen-lockfile >/dev/null)

STATUS=0
for VARIANT in "${VARIANTS[@]}"; do
  echo "==> $VARIANT"
  cp "$CALIBRATION/$VARIANT.tsx" "$WT/components/ProductQuickView.tsx"
  (cd "$WT" && pnpm exec next build >/dev/null)
  (cd "$WT" && exec pnpm exec next start -p "$PORT" >/dev/null 2>&1) &
  for _ in $(seq 1 60); do
    curl -sf "http://localhost:$PORT/product" >/dev/null 2>&1 && break
    sleep 1
  done
  (cd "$HERE" && CALIBRATION_URL="http://localhost:$PORT" CALIBRATION_VARIANT="$VARIANT" pnpm exec playwright test --project=calibration) || STATUS=1
  lsof -ti "tcp:$PORT" | xargs kill 2>/dev/null || true
  sleep 1
done
exit $STATUS
