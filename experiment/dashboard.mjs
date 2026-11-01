#!/usr/bin/env node
// Builds a single-page dashboard over experiment/runs/*/score.json + manual.json + meta.json.
//   node experiment/dashboard.mjs
// Writes experiment/runs/index.html and prints the path. Open it in a browser.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ITEMS, autoResults } from './checklist.mjs'

const RUNS = join(dirname(fileURLToPath(import.meta.url)), 'runs')
const MANUAL_IDS = new Set(ITEMS.filter((i) => !i[2]).map((i) => i[0]))

const frac = (results) => {
  const answered = results.filter((r) => r.result === 'pass' || r.result === 'fail')
  const passed = answered.filter((r) => r.result === 'pass').length
  return answered.length
    ? { frac: `${passed}/${answered.length}`, pct: Math.round((100 * passed) / answered.length) }
    : { frac: '—', pct: -1 }
}

const rows = []
for (const name of readdirSync(RUNS).sort()) {
  const dir = join(RUNS, name)
  const scorePath = join(dir, 'score.json')
  if (!existsSync(scorePath)) continue
  const score = JSON.parse(readFileSync(scorePath, 'utf8'))
  const meta = existsSync(join(dir, 'meta.json')) ? JSON.parse(readFileSync(join(dir, 'meta.json'), 'utf8')) : {}
  const sessions = Object.values(meta.sessions ?? {})
  const tokens = sessions.reduce((n, s) => n + ((s.usage?.input_tokens ?? 0) + (s.usage?.output_tokens ?? 0)), 0)
  const wallS = sessions.reduce((n, s) => n + (s.wall_s ?? 0), 0)
  const manualJson = existsSync(join(dir, 'manual.json')) ? JSON.parse(readFileSync(join(dir, 'manual.json'), 'utf8')) : {}
  const manual = Object.entries(manualJson).filter(([id]) => MANUAL_IDS.has(id))
  const auto = Object.entries(autoResults(score))
  const checks = {
    auto: frac(auto.map(([, r]) => r)),
    manual: frac(manual.map(([, r]) => r)),
    total: manual.length ? frac([...auto, ...manual].map(([, r]) => r)) : { frac: '—', pct: -1 },
  }
  const failed = (entries) => entries.filter(([, r]) => r.result === 'fail').map(([id, r]) => `${id}${r.note ? ': ' + r.note : ''}`)
  const fails = { auto: failed(auto), manual: failed(manual) }
  rows.push({
    name,
    condition: meta.condition ?? name.replace(/^v2-/, '').replace(/-(haiku|glm)-\d+$/, ''),
    model: meta.model ?? '—',
    checks, fails,
    axe: score.axe ? `${score.axe.violations}` : '—',
    axeByImpact: score.axe ? Object.entries(score.axe.by_impact ?? {}).map(([k, v]) => `${k}:${v}`).join(' ') : '',
    tokens, wallS,
    axeRules: score.axe?.rules?.map((r) => `${r.id} (${r.impact}, ${r.nodes} nodes)`) ?? [],
  })
}

const cell = (fracStr, p) => {
  const color = fracStr === '—' ? '#999' : p === 100 ? '#0a7d2c' : p >= 70 ? '#b07d00' : '#c0392b'
  return `<td style="color:${color};font-weight:600">${fracStr}</td>`
}

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Experiment dashboard</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; margin: 2rem; color: #222 }
  h1 { font-size: 1.4rem } h2 { font-size: 1.1rem; margin-top: 2rem }
  table { border-collapse: collapse; width: 100% }
  th, td { border: 1px solid #ddd; padding: .45rem .7rem; text-align: left; font-size: .9rem }
  th { background: #f5f5f5 }
  details { margin: .5rem 0 }
  summary { cursor: pointer; font-weight: 600 }
  ul { margin: .3rem 0; padding-left: 1.2rem }
  li { font-size: .85rem }
  a { color: #0645ad }
  .group { background: #fafafa; font-weight: 700 }
</style>
</head>
<body>
<h1>Experiment dashboard</h1>
<p>Generated ${new Date().toISOString()}. axe and the DOM/ARIA checks are automated (experiment/score.sh); the rest is manual (experiment/inspect.mjs). The total only appears once the manual checks are done.</p>
<table>
<thead><tr>
  <th>Run</th><th>Model</th><th>axe rules</th><th>Automated checks</th><th>Manual checks</th><th>WCAG/APG total</th><th>Tokens</th><th>Time</th>
</tr></thead>
<tbody>
${rows.map((r, i) => {
  const group = i === 0 || rows[i - 1].condition !== r.condition
    ? `<tr class="group"><td colspan="8">${r.condition}</td></tr>` : ''
  return `${group}<tr>
  <td>${r.name}</td><td>${r.model}</td>
  <td title="${r.axeByImpact}">${r.axe}</td>
  ${cell(r.checks.auto.frac, r.checks.auto.pct)}
  ${cell(r.checks.manual.frac, r.checks.manual.pct)}
  ${cell(r.checks.total.frac, r.checks.total.pct)}
  <td>${r.tokens ? r.tokens.toLocaleString('en-US') : '—'}</td>
  <td>${r.wallS ? Math.round(r.wallS / 60) + ' min' : '—'}</td>
</tr>`
}).join('\n')}
</tbody>
</table>

<h2>Failures</h2>
${rows.map((r) => `
<details>
  <summary>${r.name} — axe ${r.axeRules.length}, automated checks failed ${r.fails.auto.length}, manual checks failed ${r.fails.manual.length}</summary>
  ${r.axeRules.length ? `<p>axe:</p><ul>${r.axeRules.map((f) => `<li>${f}</li>`).join('')}</ul>` : ''}
  ${r.fails.auto.length ? `<p>Automated checks:</p><ul>${r.fails.auto.map((f) => `<li>${f}</li>`).join('')}</ul>` : ''}
  ${r.fails.manual.length ? `<p>Manual checks:</p><ul>${r.fails.manual.map((f) => `<li>${f}</li>`).join('')}</ul>` : ''}
</details>`).join('\n')}
</body>
</html>
`

writeFileSync(join(RUNS, 'index.html'), html)
console.log(`${join(RUNS, 'index.html')} (${rows.length} scored runs)`)
