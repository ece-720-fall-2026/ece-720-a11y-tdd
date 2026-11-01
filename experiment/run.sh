#!/usr/bin/env bash
# Generates one run of the experiment in fresh, isolated containers.
#   experiment/run.sh <condition> <run> <model>
#   condition: baseline-agnostic | baseline-oriented (one session)
#              tdd-agnostic | tdd-oriented | tdd-green-oriented
#              (Red: write a small test suite; Green: implement — Green is oriented in tdd-green-oriented)
#   model:     haiku | glm
#   e.g. experiment/run.sh tdd-oriented 2 glm
# Run branches are named <PREFIX><condition>-<model>-<run> (PREFIX defaults to v2-) so they
# stay separate from the pilot runs.
# Uses Claude Code. Authentication comes from CLAUDE_SETTINGS (default:
# ~/.claude/settings.json) or the ANTHROPIC_* / CLAUDE_CODE_* environment variables.
# Creates branch <PREFIX><condition>-<model>-<run> in $STRIDE_REPO
# (one commit per session) and experiment/runs/<same name>/.
# After IDLE_S (300) quiet seconds with no tool call running, dev servers in the container are
# stopped so the agent can continue (up to MAX_NUDGES, 3); a session with nothing left to stop
# ends as idle. Every session ends at MAX_S (5400).
set -euo pipefail

HAIKU_MODEL="${HAIKU_MODEL:-haiku}"
GLM_MODEL="${GLM_MODEL:-baseten-glm-5.3[1m]}"
IMAGE="${IMAGE:-a11y-tdd-agent}"
STRIDE_REPO="${STRIDE_REPO:-$HOME/code/ualberta/stride}"
CLAUDE_SETTINGS="${CLAUDE_SETTINGS:-$HOME/.claude/settings.json}"
IDLE_S="${IDLE_S:-300}"
MAX_S="${MAX_S:-5400}"
MAX_NUDGES="${MAX_NUDGES:-3}"
SERVERS='vite|webpack|next (dev|start)|http-server|http\.server|npm (run )?(dev|start|preview)'

die() { echo "error: $*" >&2; exit 1; }
[ $# -eq 3 ] || { sed -n '2,12p' "$0"; exit 1; }

HERE="$(cd "$(dirname "$0")" && pwd)"
CONDITION="$1"
RUN="$2"
MODEL_KEY="$3"
PROMPTS="$HERE/prompts/$CONDITION"

[ -d "$PROMPTS" ] || die "unknown condition '$CONDITION' (see $HERE/prompts)"
[[ "$RUN" =~ ^[0-9]+$ ]] || die "run must be a number"
case "$MODEL_KEY" in
  haiku) MODEL="$HAIKU_MODEL" ;;
  glm) MODEL="$GLM_MODEL" ;;
  *) die "model must be haiku or glm" ;;
esac
BASE_BRANCH="${BASE_BRANCH:-main}"

AUTH_ARGS=(
  -e ANTHROPIC_API_KEY
  -e ANTHROPIC_AUTH_TOKEN
  -e ANTHROPIC_BEDROCK_BASE_URL
  -e CLAUDE_CODE_SKIP_BEDROCK_AUTH
  -e CLAUDE_CODE_USE_BEDROCK
)
CLAUDE_SETTINGS_ARGS=()
PROVIDER_URL="${ANTHROPIC_BASE_URL:-${ANTHROPIC_BEDROCK_BASE_URL:-https://api.anthropic.com}}"
if [ -f "$CLAUDE_SETTINGS" ]; then
  AUTH_ARGS+=(-v "$CLAUDE_SETTINGS:/tmp/claude-settings.json:ro")
  CLAUDE_SETTINGS_ARGS=(--settings /tmp/claude-settings.json)
  PROVIDER_URL="$(node -e '
    const env = require(process.argv[1]).env ?? {};
    console.log(env.ANTHROPIC_BASE_URL ?? env.ANTHROPIC_BEDROCK_BASE_URL ?? process.argv[2]);
  ' "$CLAUDE_SETTINGS" "$PROVIDER_URL")"
elif [ -z "${ANTHROPIC_API_KEY:-}${ANTHROPIC_AUTH_TOKEN:-}" ]; then
  die "set ANTHROPIC_API_KEY/ANTHROPIC_AUTH_TOKEN or provide CLAUDE_SETTINGS"
fi
# GLM through the proxy only works via the plain messages endpoint: the proxy's /bedrock
# route answers "Provider baseten not found" for it. Haiku still needs the Bedrock settings.
if [ "$MODEL_KEY" = glm ] && [ -f "$CLAUDE_SETTINGS" ]; then
  ANTHROPIC_AUTH_TOKEN="$(node -e 'console.log(require(process.argv[1]).env.ANTHROPIC_AUTH_TOKEN)' "$CLAUDE_SETTINGS")"
  ANTHROPIC_BASE_URL="$(node -e 'console.log(new URL(require(process.argv[1]).env.ANTHROPIC_BEDROCK_BASE_URL).origin)' "$CLAUDE_SETTINGS")"
  export ANTHROPIC_AUTH_TOKEN ANTHROPIC_BASE_URL
  AUTH_ARGS=(-e ANTHROPIC_AUTH_TOKEN -e ANTHROPIC_BASE_URL)
  CLAUDE_SETTINGS_ARGS=()
  PROVIDER_URL="$ANTHROPIC_BASE_URL"
fi

NAME="${PREFIX:-v2-}$CONDITION-$MODEL_KEY-$RUN"
OUT="$HERE/runs/$NAME"
git -C "$STRIDE_REPO" rev-parse --verify -q "refs/heads/$NAME" >/dev/null && die "branch $NAME already exists in $STRIDE_REPO"
[ -e "$OUT" ] && die "$OUT already exists"
# One active run per name: two concurrent runs share the workspace path and corrupt each other.
LOCK="$HERE/runs/.locks/$NAME.lock"
mkdir -p "$HERE/runs/.locks"
mkdir "$LOCK" 2>/dev/null || die "$NAME is already running (lock $LOCK)"
trap 'rmdir "$LOCK" 2>/dev/null' EXIT

docker build -q -t "$IMAGE" "$HERE" >/dev/null
docker run --rm "$IMAGE" curl -sS -o /dev/null --connect-timeout 10 "$PROVIDER_URL" ||
  die "Claude provider is unreachable from Docker: $(node -e 'console.log(new URL(process.argv[1]).host)' "$PROVIDER_URL")"

agent() {
  docker run --rm "${AUTH_ARGS[@]}" -v "$WS:/work" -w /work "$IMAGE" claude "$@"
}

# PIDs of servers in a session container, never the agent itself (its arguments hold the prompt).
server_pids() {
  docker exec "$1" ps -eo pid=,args= 2>/dev/null |
    grep -E -- "$SERVERS" | grep -v -e 'claude -p' -e 'ps -eo' | awk '$1 != 1 { print $1 }'
}

# Succeeds if either CLI transcript format has a tool call that started but has not completed.
tool_pending() {
  node -e '
    const open = new Set();
    for (const s of require("fs").readFileSync(process.argv[1], "utf8").split("\n")) {
      let l; try { l = JSON.parse(s); } catch { continue; }
      if (l.type === "tool_call") {
        if (l.subtype === "started") open.add(l.call_id); else open.delete(l.call_id);
      }
      const content = l.message?.content;
      if (!Array.isArray(content)) continue;
      for (const block of content) {
        if (l.type === "assistant" && block.type === "tool_use") open.add(block.id);
        if (l.type === "user" && block.type === "tool_result") open.delete(block.tool_use_id);
      }
    }
    process.exit(open.size ? 0 : 1);
  ' "$1"
}

# Under $HOME so Docker Desktop / Rancher Desktop can mount it.
WS="$HOME/.cache/a11y-tdd-runs/$NAME/work"
rm -rf "$(dirname "$WS")"
mkdir -p "$(dirname "$WS")"
# Always start from $BASE_BRANCH: a plain clone would start from whatever branch is checked out in stride.
# --no-local --single-branch copies only that branch's objects; a local clone would carry every other run's commits.
git clone -q --no-local --single-branch --branch "$BASE_BRANCH" "$STRIDE_REPO" "$WS"
git -C "$WS" remote remove origin
# The agent sees the branch name, so it is "main" inside the workspace and only becomes $NAME on push.
[ "$BASE_BRANCH" = main ] || git -C "$WS" branch -m "$BASE_BRANCH" main
BASE="$(git -C "$WS" rev-parse HEAD)"
printf '%s\n' node_modules dist build .next .vite test-results playwright-report blob-report >>"$WS/.git/info/exclude"

echo "==> Using model $MODEL"

mkdir -p "$OUT"
RUN_START_S="$(date +%s)"
SESSIONS=()
for PROMPT in "$PROMPTS"/*.md; do
  N="$(basename "$PROMPT" .md)"
  echo "==> $NAME: session $N ($MODEL)"
  BEFORE="$(git -C "$WS" rev-parse HEAD)"
  STARTED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  START_S="$(date +%s)"
  LOG="$OUT/session-$N.jsonl"
  CONTAINER="$NAME-session-$N"
  docker run --rm --name "$CONTAINER" "${AUTH_ARGS[@]}" -v "$WS:/work" -w /work "$IMAGE" claude \
    -p --output-format stream-json --verbose \
    --dangerously-skip-permissions --bare --strict-mcp-config \
    --mcp-config '{"mcpServers":{}}' --model "$MODEL" ${CLAUDE_SETTINGS_ARGS[@]+"${CLAUDE_SETTINGS_ARGS[@]}"} \
    "$(cat "$PROMPT")" >"$LOG" 2>"$OUT/session-$N.err" &
  PID=$!
  trap 'docker kill "$CONTAINER" >/dev/null 2>&1; exit 130' INT TERM
  # The CLI only wakes the agent, or exits, once every background task has ended, and a server
  # the agent started never ends. When the transcript is quiet with no tool call in progress,
  # stop the servers so the agent can continue; stop the container if it is quiet with no
  # servers left, after MAX_NUDGES, or at MAX_S.
  ENDED=exit
  NUDGES=0
  QUIET_FROM=0
  while kill -0 "$PID" 2>/dev/null; do
    sleep 10
    NOW="$(date +%s)"
    LAST=0
    [ -s "$LOG" ] && LAST="$(date -r "$LOG" +%s)"
    [ "$LAST" -lt "$QUIET_FROM" ] && LAST="$QUIET_FROM"
    if [ $((NOW - START_S)) -ge "$MAX_S" ]; then
      ENDED=max-time
    elif [ -s "$LOG" ] && [ $((NOW - LAST)) -ge "$IDLE_S" ] && ! tool_pending "$LOG"; then
      PIDS="$(server_pids "$CONTAINER" | tr '\n' ' ')"
      if [ "$NUDGES" -lt "$MAX_NUDGES" ] && [ -n "${PIDS// /}" ]; then
        NUDGES=$((NUDGES + 1))
        echo "    session $N quiet with servers running; stopping them ($NUDGES/$MAX_NUDGES)"
        docker exec "$CONTAINER" kill $PIDS >/dev/null 2>&1 || true
        QUIET_FROM="$NOW"
        continue
      fi
      ENDED=idle
    else
      continue
    fi
    echo "    stopping session $N ($ENDED)"
    docker kill "$CONTAINER" >/dev/null 2>&1 || true
    break
  done
  wait "$PID" || [ "$ENDED" != exit ] || die "session $N failed; see $OUT/session-$N.err. Workspace kept at $WS"
  trap - INT TERM
  git -C "$WS" add -A
  if git -C "$WS" diff --cached --quiet && [ "$(git -C "$WS" rev-parse HEAD)" = "$BEFORE" ]; then
    die "session $N changed no files (see $OUT/session-$N.jsonl). Workspace kept at $WS"
  fi
  git -C "$WS" -c user.name=runner -c user.email=runner@example.com commit -q --allow-empty -m "Session $N"
  WALL_S=$(($(date +%s) - START_S))
  # Claude-reported duration and token usage, from the transcript's final "result" event.
  USAGE="$(node -e '
    const r = require("fs").readFileSync(process.argv[1], "utf8").trim().split("\n")
      .map((s) => { try { return JSON.parse(s); } catch { return {}; } })
      .find((l) => l.type === "result") ?? {};
    process.stdout.write(JSON.stringify({ agent_duration_s: r.duration_ms == null ? null : Math.round(r.duration_ms / 1000), usage: r.usage ?? null }));
  ' "$OUT/session-$N.jsonl")"
  SESSIONS+=("\"$N\":{\"prompt_sha256\":\"$(shasum -a 256 "$PROMPT" | cut -d' ' -f1)\",\"commit\":\"$(git -C "$WS" rev-parse HEAD)\",\"started_at\":\"$STARTED_AT\",\"wall_s\":$WALL_S,\"ended\":\"$ENDED\",\"nudges\":$NUDGES,${USAGE:1:${#USAGE}-2}}")
done

git -C "$WS" push -q "$STRIDE_REPO" "HEAD:refs/heads/$NAME"

SESSIONS_JSON="$(IFS=,; echo "${SESSIONS[*]}")"
cat >"$OUT/meta.json" <<EOF
{
  "name": "$NAME",
  "condition": "$CONDITION",
  "run": $RUN,
  "model": "$MODEL",
  "cli_version": "$(agent --version 2>/dev/null | tr -d '\r')",
  "image": "$(docker image inspect -f '{{.Id}}' "$IMAGE")",
  "stride_base_branch": "$BASE_BRANCH",
  "stride_base": "$BASE",
  "sessions": {$SESSIONS_JSON},
  "wall_s": $(($(date +%s) - RUN_START_S)),
  "date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

rm -rf "$(dirname "$WS")"
echo "==> Done: branch $NAME in $STRIDE_REPO, logs in $OUT"
