#!/usr/bin/env bash
# Generates one run of the experiment in fresh, isolated containers.
#   experiment/run.sh <condition> <run> <model>
#   condition: baseline-agnostic | baseline-oriented | tdd-oriented | tdd-tool
#   model:     glm | kimi
#   e.g. experiment/run.sh tdd-tool 2 kimi
# Needs CURSOR_API_KEY. Creates branch <condition>-<model>-<run> in $STRIDE_REPO
# (one commit per session) and experiment/runs/<condition>-<model>-<run>/.
set -euo pipefail

GLM_MODEL="${GLM_MODEL:-glm-5.2-high}"
KIMI_MODEL="${KIMI_MODEL:-kimi-k3-high}"
IMAGE="${IMAGE:-a11y-tdd-agent}"
STRIDE_REPO="${STRIDE_REPO:-$HOME/code/ualberta/stride}"

die() { echo "error: $*" >&2; exit 1; }
[ $# -eq 3 ] || { sed -n '2,8p' "$0"; exit 1; }

HERE="$(cd "$(dirname "$0")" && pwd)"
CONDITION="$1"
RUN="$2"
MODEL_KEY="$3"
PROMPTS="$HERE/prompts/$CONDITION"

[ -d "$PROMPTS" ] || die "unknown condition '$CONDITION' (see $HERE/prompts)"
[[ "$RUN" =~ ^[0-9]+$ ]] || die "run must be a number"
case "$MODEL_KEY" in
  glm) MODEL="$GLM_MODEL" ;;
  kimi) MODEL="$KIMI_MODEL" ;;
  *) die "model must be glm or kimi" ;;
esac
: "${CURSOR_API_KEY:?Set CURSOR_API_KEY}"

NAME="$CONDITION-$MODEL_KEY-$RUN"
OUT="$HERE/runs/$NAME"
git -C "$STRIDE_REPO" rev-parse --verify -q "refs/heads/$NAME" >/dev/null && die "branch $NAME already exists in $STRIDE_REPO"
[ -e "$OUT" ] && die "$OUT already exists"

docker build -q -t "$IMAGE" "$HERE" >/dev/null

agent() {
  docker run --rm -e CURSOR_API_KEY -v "$WS:/work" -w /work "$IMAGE" cursor-agent "$@"
}

# Under $HOME so Docker Desktop / Rancher Desktop can mount it.
WS="$HOME/.cache/a11y-tdd-runs/$NAME/work"
rm -rf "$(dirname "$WS")"
mkdir -p "$(dirname "$WS")"
git clone -q "$STRIDE_REPO" "$WS"
git -C "$WS" remote remove origin
git -C "$WS" checkout -q -b "$NAME"
BASE="$(git -C "$WS" rev-parse HEAD)"
printf '%s\n' node_modules dist build .next .vite test-results playwright-report blob-report >>"$WS/.git/info/exclude"

if [ "$CONDITION" = tdd-tool ]; then
  echo "==> Packing playwright-apg"
  APG="$HERE/../playwright-apg"
  (cd "$APG" && pnpm install --frozen-lockfile >/dev/null && pnpm build >/dev/null)
  mkdir -p "$WS/vendor"
  (cd "$APG" && pnpm pack --pack-destination "$WS/vendor" >/dev/null)
  git -C "$WS" add vendor
  git -C "$WS" -c user.name=runner -c user.email=runner@example.com commit -qm "Add playwright-apg"
fi

echo "==> Checking model $MODEL"
MODELS="$(agent --list-models 2>&1)" || die "could not list models: $MODELS"
grep -qw -- "$MODEL" <<<"$MODELS" || { echo "$MODELS" >&2; die "model '$MODEL' not available; set GLM_MODEL/KIMI_MODEL"; }

mkdir -p "$OUT"
SESSIONS=()
for PROMPT in "$PROMPTS"/*.md; do
  N="$(basename "$PROMPT" .md)"
  echo "==> $NAME: session $N ($MODEL)"
  agent -p --force --trust --sandbox disabled --model "$MODEL" --output-format stream-json \
    "$(cat "$PROMPT")" >"$OUT/session-$N.jsonl" 2>"$OUT/session-$N.err" ||
    die "session $N failed; see $OUT/session-$N.err. Workspace kept at $WS"
  git -C "$WS" add -A
  git -C "$WS" -c user.name=runner -c user.email=runner@example.com commit -q --allow-empty -m "Session $N"
  SESSIONS+=("\"$N\":{\"prompt_sha256\":\"$(shasum -a 256 "$PROMPT" | cut -d' ' -f1)\",\"commit\":\"$(git -C "$WS" rev-parse HEAD)\"}")
done

git -C "$WS" push -q "$STRIDE_REPO" "$NAME"

SESSIONS_JSON="$(IFS=,; echo "${SESSIONS[*]}")"
cat >"$OUT/meta.json" <<EOF
{
  "name": "$NAME",
  "condition": "$CONDITION",
  "run": $RUN,
  "model": "$MODEL",
  "cli_version": "$(agent --version 2>/dev/null | tr -d '\r')",
  "image": "$(docker image inspect -f '{{.Id}}' "$IMAGE")",
  "stride_base": "$BASE",
  "sessions": {$SESSIONS_JSON},
  "date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

rm -rf "$(dirname "$WS")"
echo "==> Done: branch $NAME in $STRIDE_REPO, logs in $OUT"
