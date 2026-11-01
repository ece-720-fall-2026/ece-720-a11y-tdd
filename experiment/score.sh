#!/usr/bin/env bash
# Runs the one automated evaluation: axe-core (WCAG 2.2 AA tags) on a run branch.
# Everything else is evaluated manually with experiment/inspect.mjs.
#   experiment/score.sh <branch>...
#   e.g. experiment/score.sh v2-baseline-agnostic-haiku-1
# Writes experiment/runs/<branch>/score.json with axe violations by rule and impact.
set -euo pipefail

STRIDE_REPO="${STRIDE_REPO:-$HOME/code/ualberta/stride}"
PORT="${PORT:-5199}"
HERE="$(cd "$(dirname "$0")" && pwd)"

die() { echo "error: $*" >&2; exit 1; }
[ $# -ge 1 ] || { sed -n '2,6p' "$0"; exit 1; }

for BRANCH in "$@"; do
  git -C "$STRIDE_REPO" rev-parse --verify -q "refs/heads/$BRANCH" >/dev/null || die "no branch $BRANCH"
  echo "==> $BRANCH"
  WT="$(mktemp -d)/app"
  git -C "$STRIDE_REPO" worktree add -q --detach "$WT" "$BRANCH"
  trap 'git -C "$STRIDE_REPO" worktree remove --force "$WT"' EXIT
  mkdir -p "$WT/score"
  cat >"$WT/score/axe.spec.js" <<'EOF'
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { writeFileSync } from 'node:fs'

test('axe', async ({ page }) => {
  await page.goto('/products/trail-runner-2')
  await page.waitForTimeout(1_000)
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  writeFileSync('score/axe.json', JSON.stringify(violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length }))))
  expect(violations).toBeDefined()
})
EOF
  cat >"$WT/score/playwright.config.js" <<EOF
import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: '.',
  timeout: 30_000,
  reporter: [['json', { outputFile: process.env.JSON_OUT }]],
  use: { baseURL: 'http://localhost:$PORT' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: { command: 'npx vite --port $PORT --strictPort', url: 'http://localhost:$PORT', reuseExistingServer: false, cwd: '..' },
})
EOF
  (
    cd "$WT"
    npm install --silent --no-audit --no-fund >/dev/null 2>&1 || npm install --no-audit --no-fund
    npm install --silent --no-save --no-audit --no-fund @playwright/test@1.64.1 @axe-core/playwright >/dev/null
    npx playwright install chromium >/dev/null
    JSON_OUT="$WT/score/axe.json.out" npx playwright test -c score/playwright.config.js axe.spec.js >/dev/null 2>&1 || true
  )
  mkdir -p "$HERE/runs/$BRANCH"
  node -e '
    const fs = require("fs");
    const axe = fs.existsSync(`${process.argv[1]}/axe.json`) ? JSON.parse(fs.readFileSync(`${process.argv[1]}/axe.json`, "utf8")) : null;
    if (!axe) { console.error("    axe failed to run (stale server on the port?)"); process.exit(1); }
    const byImpact = axe.reduce((m, v) => ({ ...m, [v.impact]: (m[v.impact] ?? 0) + 1 }), {});
    fs.writeFileSync(process.argv[2], JSON.stringify({ axe: { violations: axe.length, by_impact: byImpact, rules: axe } }, null, 2) + "\n");
    console.log(`    axe: ${axe.length} rules ${JSON.stringify(byImpact)}`);
  ' "$WT/score" "$HERE/runs/$BRANCH/score.json"
  git -C "$STRIDE_REPO" worktree remove --force "$WT"
  trap - EXIT
done
