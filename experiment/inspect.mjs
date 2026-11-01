#!/usr/bin/env node
// Manual evaluation of one run branch, in the browser.
//   node experiment/inspect.mjs <branch> [--port 5300]
//   e.g. node experiment/inspect.mjs v2-baseline-agnostic-haiku-1
// Builds the branch, serves it untouched next to the checklist, and saves
// every answer to experiment/runs/<branch>/manual.json as you click.
// Automated items (axe and structure.spec.js) come from score.json; run experiment/score.sh first.
import { createServer } from 'node:http'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, extname, dirname } from 'node:path'
import { execSync, exec } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { CHECKLIST, autoResults } from './checklist.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const STRIDE = process.env.STRIDE_REPO ?? join(process.env.HOME, 'code/ualberta/stride')

const [branch] = process.argv.slice(2)
const port = Number(process.argv[4] ?? 5300)
if (!branch) {
  console.log('usage: node experiment/inspect.mjs <branch> [--port 5300]')
  process.exit(1)
}
execSync(`git -C "${STRIDE}" rev-parse --verify -q "refs/heads/${branch}"`, { stdio: 'pipe' })

// Remove worktrees left behind by inspect.mjs processes that are no longer running
// (score.sh and other open inspect.mjs windows keep theirs).
const alive = (pid) => { try { process.kill(pid, 0); return true } catch { return false } }
for (const line of execSync(`git -C "${STRIDE}" worktree list --porcelain`).toString().split('\n')) {
  const m = line.match(/^worktree (.+\/a11y-inspect\.[^/]+)\/app$/)
  if (!m) continue
  const pid = Number(existsSync(join(m[1], 'pid')) ? readFileSync(join(m[1], 'pid'), 'utf8') : 0)
  if (pid && alive(pid)) continue
  try { execSync(`git -C "${STRIDE}" worktree remove --force "${m[1]}/app"`) } catch {}
}

const TMP = execSync('mktemp -d -t a11y-inspect').toString().trim()
writeFileSync(join(TMP, 'pid'), String(process.pid))
const WT = join(TMP, 'app')
execSync(`git -C "${STRIDE}" worktree add -q --detach "${WT}" "${branch}"`)
const cleanup = () => { try { execSync(`git -C "${STRIDE}" worktree remove --force "${WT}"`) } catch {} }
process.on('exit', cleanup)
process.on('SIGINT', () => process.exit(0))
process.on('SIGTERM', () => process.exit(0))

console.log(`==> Building ${branch}`)
execSync('npm install --no-audit --no-fund && npm run build', { cwd: WT, stdio: 'pipe' })
const DIST = join(WT, 'dist')
const OUT = join(HERE, 'runs', branch)
mkdirSync(OUT, { recursive: true })
const RESULTS = join(OUT, 'manual.json')
if (!existsSync(RESULTS)) writeFileSync(RESULTS, '{}')
if (!existsSync(join(OUT, 'score.json'))) console.log(`==> No score.json yet: run experiment/score.sh ${branch} to fill in the automated checks`)

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Evaluate ${branch}</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; margin: 0; color: #222 }
  aside { max-width: 44rem; margin: 0 auto; padding: 1rem }
  #app-link { font-size: .9rem }
  h1 { font-size: 1.1rem } h2 { font-size: .95rem; margin: 1.2rem 0 .4rem }
  .item { border: 1px solid #e2e2e2; border-radius: 8px; padding: .5rem .7rem; margin: .4rem 0 }
  .item p { margin: 0 0 .4rem; font-size: .85rem }
  button { border: 1px solid #ccc; background: #fff; border-radius: 6px; padding: .2rem .7rem; margin-right: .3rem; cursor: pointer; font-size: .8rem }
  .pass.on { background: #0a7d2c; color: #fff; border-color: #0a7d2c }
  .fail.on { background: #c0392b; color: #fff; border-color: #c0392b }
  .skip.on { background: #888; color: #fff; border-color: #888 }
  input { width: 96%; margin-top: .35rem; font-size: .8rem; padding: .2rem; border: 1px solid #ddd; border-radius: 4px }
  #progress { font-size: .85rem; color: #555 }
</style>
</head>
<body>
<aside>
  <h1>${branch}</h1>
  <p id="app-link">The app is at <a href="/products/trail-runner-2" target="_blank">/products/trail-runner-2</a> — keep both windows side by side. The app is served untouched; this page only records your answers.</p>
  <p id="progress"></p>
  <div id="list"></div>
</aside>
<script type="module">
const GROUPS = ${JSON.stringify(CHECKLIST)}
const state = await (await fetch('/api/state')).json()
const auto = await (await fetch('/api/auto')).json()
const list = document.getElementById('list')
const progress = document.getElementById('progress')
const manualIds = GROUPS.flatMap(([, items]) => items.filter((i) => !i[2]).map((i) => i[0]))
function refresh() {
  const answered = manualIds.filter((id) => state[id])
  const fails = answered.filter((id) => state[id].result === 'fail').length
  progress.textContent = answered.length + ' / ' + manualIds.length + ' manual checks answered, ' + fails + ' failed (automated checks are filled in from score.json)'
}
for (const [group, items] of GROUPS) {
  const h = document.createElement('h2'); h.textContent = group; list.append(h)
  for (const [id, text, source] of items) {
    const div = document.createElement('div'); div.className = 'item'
    const p = document.createElement('p'); p.textContent = text; div.append(p)
    if (source) {
      const r = auto[id]
      const by = source === 'auto' ? 'automated check' : 'axe'
      const color = r.result === 'pass' ? '#0a7d2c' : r.result === 'fail' ? '#c0392b' : '#888'
      const badge = document.createElement('p')
      badge.style.cssText = 'font-size:.78rem;font-weight:600;color:' + color
      badge.textContent = by + ': ' + (r.result === 'fail' ? 'FAIL' : r.result) + (r.note ? ' — ' + r.note : '')
      div.append(badge)
      div.style.opacity = '.65'
      list.append(div)
      continue
    }
    for (const [cls, label] of [['pass', 'Pass'], ['fail', 'Fail'], ['skip', 'Skip']]) {
      const b = document.createElement('button'); b.className = cls; b.textContent = label
      if (state[id]?.result === cls) b.classList.add('on')
      b.onclick = async () => {
        if (state[id]?.result === cls) {
          // Clicking the active button again unselects it.
          b.classList.remove('on')
          delete state[id]
          await fetch('/api/save', { method: 'POST', body: JSON.stringify({ id, result: null }) })
        } else {
          div.querySelectorAll('button').forEach((x) => x.classList.remove('on'))
          b.classList.add('on')
          state[id] = { result: cls, note: note.value }
          await fetch('/api/save', { method: 'POST', body: JSON.stringify({ id, ...state[id] }) })
        }
        refresh()
      }
      div.append(b)
    }
    const note = document.createElement('input'); note.placeholder = 'note (optional)'
    note.value = state[id]?.note ?? ''
    note.onchange = () => { if (state[id]) { state[id].note = note.value; fetch('/api/save', { method: 'POST', body: JSON.stringify({ id, ...state[id] }) }) } }
    div.append(note)
    list.append(div)
  }
}
refresh()
</script>
</body>
</html>`

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.json': 'application/json', '.woff2': 'font/woff2' }

createServer((req, res) => {
  const url = new URL(req.url, 'http://x')
  if (url.pathname === '/evaluate') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(page) }
  if (url.pathname === '/api/state') { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(readFileSync(RESULTS, 'utf8')) }
  if (url.pathname === '/api/auto') {
    const scorePath = join(OUT, 'score.json')
    const score = existsSync(scorePath) ? JSON.parse(readFileSync(scorePath, 'utf8')) : null
    res.writeHead(200, { 'content-type': 'application/json' })
    return res.end(JSON.stringify(autoResults(score)))
  }
  if (url.pathname === '/api/save' && req.method === 'POST') {
    let body = ''
    req.on('data', (c) => (body += c))
    req.on('end', () => {
      const { id, result, note } = JSON.parse(body)
      const j = JSON.parse(readFileSync(RESULTS, 'utf8'))
      if (result === null) delete j[id]
      else j[id] = { result, note }
      writeFileSync(RESULTS, JSON.stringify(j, null, 2) + '\n')
      res.writeHead(200); res.end()
    })
    return
  }
  // Anything that is not the UI or the API is the built app (SPA fallback to index.html).
  let p = join(DIST, url.pathname)
  if (!existsSync(p) || extname(p) === '') p = join(DIST, 'index.html')
  try {
    res.writeHead(200, { 'content-type': MIME[extname(p)] ?? 'application/octet-stream' })
    return res.end(readFileSync(p))
  } catch { res.writeHead(404); return res.end() }
}).listen(port, () => {
  const url = `http://localhost:${port}`
  console.log(`==> App at ${url}/products/trail-runner-2`)
  console.log(`==> Checklist at ${url}/evaluate (Ctrl-C when done)`)
  exec(`open "${url}/products/trail-runner-2" "${url}/evaluate"`)
})
