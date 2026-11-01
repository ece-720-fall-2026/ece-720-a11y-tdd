#!/usr/bin/env bash
# Runs the automated evaluation on a run branch: axe-core (WCAG 2.2 AA tags) and the
# DOM/ARIA checks in structure.spec.js (the checklist items marked 'auto' in checklist.mjs).
# Everything else is evaluated manually with experiment/inspect.mjs.
#   experiment/score.sh <branch>...
#   e.g. experiment/score.sh v2-baseline-agnostic-haiku-1
# Writes experiment/runs/<branch>/score.json with axe violations and per-check results.
set -euo pipefail

STRIDE_REPO="${STRIDE_REPO:-$HOME/code/ualberta/stride}"
PORT="${PORT:-5199}"
HERE="$(cd "$(dirname "$0")" && pwd)"

die() { echo "error: $*" >&2; exit 1; }
[ $# -ge 1 ] || { sed -n '2,7p' "$0"; exit 1; }

for BRANCH in "$@"; do
  git -C "$STRIDE_REPO" rev-parse --verify -q "refs/heads/$BRANCH" >/dev/null || die "no branch $BRANCH"
  echo "==> $BRANCH"
  WT="$(mktemp -d)/app"
  git -C "$STRIDE_REPO" worktree add -q --detach "$WT" "$BRANCH"
  trap 'git -C "$STRIDE_REPO" worktree remove --force "$WT"' EXIT
  mkdir -p "$WT/score" "$HERE/runs/$BRANCH"
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
  cp "$HERE/structure.spec.js" "$WT/score/structure.spec.js"
  cat >"$WT/score/playwright.config.js" <<EOF
import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: '.',
  timeout: 30_000,
  expect: { timeout: 1_000 },
  retries: 0,
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
    JSON_OUT="$WT/score/report.json" npx playwright test -c score/playwright.config.js >"$HERE/runs/$BRANCH/score.log" 2>&1 || true
  )
  node -e '
    const fs = require("fs");
    const dir = process.argv[1];
    const axe = fs.existsSync(`${dir}/axe.json`) ? JSON.parse(fs.readFileSync(`${dir}/axe.json`, "utf8")) : null;
    if (!axe) { console.error(`    axe failed to run, skipping (see ${process.argv[2].replace(/score\.json$/, "score.log")})`); process.exit(1); }
    const byImpact = axe.reduce((m, v) => ({ ...m, [v.impact]: (m[v.impact] ?? 0) + 1 }), {});
    const report = JSON.parse(fs.readFileSync(`${dir}/report.json`, "utf8"));
    const structure = {};
    const walk = (suite) => {
      for (const s of suite.suites ?? []) walk(s);
      if (!(suite.file ?? "").endsWith("structure.spec.js")) return;
      for (const spec of suite.specs ?? []) {
        const r = spec.tests[0]?.results?.at(-1);
        const msg = (r?.error?.message ?? "").replace(/\x1b\[[0-9;]*m/g, "").split("\n")[0].replace(/^Error:\s*/, "").trim();
        structure[spec.title] = spec.ok ? { result: "pass" } : { result: "fail", note: msg };
      }
    };
    report.suites.forEach(walk);
    const failed = Object.entries(structure).filter(([, r]) => r.result === "fail");
    fs.writeFileSync(process.argv[2], JSON.stringify({ axe: { violations: axe.length, by_impact: byImpact, rules: axe }, structure }, null, 2) + "\n");
    console.log(`    axe: ${axe.length} rules ${JSON.stringify(byImpact)}`);
    console.log(`    structure: ${Object.keys(structure).length - failed.length}/${Object.keys(structure).length} pass`);
    for (const [id, r] of failed) console.log(`      ${id}: ${r.note}`);
  ' "$WT/score" "$HERE/runs/$BRANCH/score.json" || true
  git -C "$STRIDE_REPO" worktree remove --force "$WT"
  trap - EXIT
done
