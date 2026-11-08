#!/usr/bin/env node
// Report metrics over every scored run (score.json + manual.json + meta.json).
//   node experiment/metrics.mjs
// Prints per-condition tables and writes experiment/runs/metrics.json.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ITEMS, WIDGETS, autoResults, runMetrics } from './checklist.mjs'

const RUNS = join(dirname(fileURLToPath(import.meta.url)), 'runs')
const CONDITIONS = ['baseline-agnostic', 'baseline-oriented', 'tdd-agnostic', 'tdd-oriented', 'tdd-green-oriented']
const read = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null)

export function loadRuns() {
  const runs = []
  for (const name of readdirSync(RUNS).sort()) {
    const m = name.match(/^v2-(.+)-(haiku|glm)-(\d+)$/)
    const score = read(join(RUNS, name, 'score.json'))
    if (!m || !score) continue
    const manual = read(join(RUNS, name, 'manual.json')) ?? {}
    const meta = read(join(RUNS, name, 'meta.json')) ?? {}
    const auto = autoResults(score)
    const results = Object.fromEntries(ITEMS.map(([id, , source]) => [id, source ? auto[id]?.result : manual[id]?.result]))
    const sessions = Object.values(meta.sessions ?? {})
    runs.push({
      name, condition: m[1], model: m[2],
      axe: score.axe?.violations ?? 0,
      outputTokens: sessions.reduce((n, s) => n + (s.usage?.output_tokens ?? 0), 0),
      minutes: sessions.reduce((n, s) => n + (s.wall_s ?? 0), 0) / 60,
      ...runMetrics(results),
    })
  }
  return runs
}

const pct = (p, t) => (t ? (100 * p) / t : NaN)
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length

// Pooled score of a set of runs: all passed checks over all judged checks.
const pooled = (runs) => pct(runs.reduce((n, r) => n + r.passed, 0), runs.reduce((n, r) => n + r.judged, 0))

// Cliff's delta of run scores, a against b: P(a > b) - P(a < b).
function cliff(a, b) {
  let d = 0
  for (const x of a) for (const y of b) d += Math.sign(x - y)
  return d / (a.length * b.length)
}

// 95% bootstrap interval of the pooled score, resampling runs with replacement.
function bootstrap(runs, n = 10_000) {
  let seed = 42
  const rand = () => ((seed = (seed * 1_103_515_245 + 12_345) % 2 ** 31) / 2 ** 31)
  const xs = []
  for (let i = 0; i < n; i++) xs.push(pooled(runs.map(() => runs[Math.floor(rand() * runs.length)])))
  xs.sort((a, b) => a - b)
  return [xs[Math.floor(0.025 * n)], xs[Math.floor(0.975 * n)]]
}

export function summarize(runs) {
  const score = (r) => pct(r.passed, r.judged)
  const byCondition = CONDITIONS.map((c) => {
    const rs = runs.filter((r) => r.condition === c)
    const row = (sub) => ({
      runs: sub.length,
      score: pooled(sub),
      ci: bootstrap(sub),
      auto: pct(sub.reduce((n, r) => n + r.auto[0], 0), sub.reduce((n, r) => n + r.auto[1], 0)),
      manual: pct(sub.reduce((n, r) => n + r.manual[0], 0), sub.reduce((n, r) => n + r.manual[1], 0)),
      task: sub.filter((r) => r.task).length,
      failedSC: mean(sub.map((r) => r.failedSC.length)),
      widgets: mean(sub.map((r) => r.widgets)),
      weighted: mean(sub.map((r) => r.weighted)),
      blockers: mean(sub.map((r) => r.bySeverity.blocker)),
      axe: sub.reduce((n, r) => n + r.axe, 0),
      axeMissRate: pct(sub.reduce((n, r) => n + r.axeMissed, 0), sub.reduce((n, r) => n + r.failed, 0)),
      outputTokens: mean(sub.map((r) => r.outputTokens)),
      minutes: mean(sub.map((r) => r.minutes)),
      scorePer10k: mean(sub.map((r) => score(r) / (r.outputTokens / 10_000))),
    })
    return { condition: c, all: row(rs), haiku: row(rs.filter((r) => r.model === 'haiku')), glm: row(rs.filter((r) => r.model === 'glm')) }
  })
  const scores = (c) => runs.filter((r) => r.condition === c).map(score)
  const comparisons = [
    ['RQ1', 'tdd-agnostic', 'baseline-agnostic'],
    ['RQ1', 'tdd-oriented', 'baseline-oriented'],
    ['RQ1', 'tdd-green-oriented', 'baseline-oriented'],
    ['RQ2', 'baseline-oriented', 'baseline-agnostic'],
    ['RQ2', 'tdd-oriented', 'tdd-agnostic'],
    ['RQ2', 'tdd-green-oriented', 'tdd-agnostic'],
    ['RQ3', 'tdd-oriented', 'tdd-green-oriented'],
  ].map(([rq, a, b]) => ({ rq, a, b, diff: pooled(runs.filter((r) => r.condition === a)) - pooled(runs.filter((r) => r.condition === b)), cliff: cliff(scores(a), scores(b)) }))
  return { byCondition, comparisons, widgets: WIDGETS.map(([w]) => w) }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const runs = loadRuns()
  const summary = summarize(runs)
  writeFileSync(join(RUNS, 'metrics.json'), JSON.stringify({ runs, ...summary }, null, 2) + '\n')
  const f = (x, d = 1) => (Number.isNaN(x) ? '—' : x.toFixed(d))
  console.log('condition            model  n  score  95% CI        auto  manual  task  failedSC  widgets/10  weighted  blockers  axe  axeMiss%  outTok   min  score/10k')
  for (const c of summary.byCondition) for (const m of ['all', 'haiku', 'glm']) {
    const r = c[m]
    console.log([c.condition.padEnd(20), m.padEnd(5), String(r.runs).padStart(2), f(r.score).padStart(6), `[${f(r.ci[0])}, ${f(r.ci[1])}]`.padEnd(13), f(r.auto).padStart(5), f(r.manual).padStart(6),
      `${r.task}/${r.runs}`.padStart(5), f(r.failedSC).padStart(8), f(r.widgets).padStart(10), f(r.weighted).padStart(9), f(r.blockers).padStart(8), String(r.axe).padStart(4),
      f(r.axeMissRate).padStart(8), String(Math.round(r.outputTokens)).padStart(7), f(r.minutes, 0).padStart(5), f(r.scorePer10k).padStart(10)].join(' '))
  }
  console.log('\nRQ   comparison                                  score diff  Cliff delta')
  for (const c of summary.comparisons) console.log(`${c.rq}  ${(c.a + ' vs ' + c.b).padEnd(44)} ${f(c.diff).padStart(9)}  ${f(c.cliff, 2).padStart(10)}`)
  console.log(`\n${join(RUNS, 'metrics.json')}`)
}
