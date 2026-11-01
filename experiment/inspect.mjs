#!/usr/bin/env node
// Manual evaluation of one run branch, in the browser.
//   node experiment/inspect.mjs <branch> [--port 5300]
//   e.g. node experiment/inspect.mjs v2-baseline-agnostic-haiku-1
// Builds the branch, serves it in an iframe next to the checklist, and saves
// every answer to experiment/runs/<branch>/manual.json as you click.
// The automated part (axe) is done by experiment/score.sh; this is everything else.
import { createServer } from 'node:http'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, extname, dirname } from 'node:path'
import { execSync, exec } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const STRIDE = process.env.STRIDE_REPO ?? join(process.env.HOME, 'code/ualberta/stride')

const [branch] = process.argv.slice(2)
const port = Number(process.argv[4] ?? 5300)
if (!branch) {
  console.log('usage: node experiment/inspect.mjs <branch> [--port 5300]')
  process.exit(1)
}
execSync(`git -C "${STRIDE}" rev-parse --verify -q "refs/heads/${branch}"`, { stdio: 'pipe' })

// Remove temp worktrees left behind by earlier interrupted runs.
for (const line of execSync(`git -C "${STRIDE}" worktree list --porcelain`).toString().split('\n')) {
  const m = line.match(/^worktree (.+)$/)
  if (m && m[1].includes('/var/folders/')) {
    try { execSync(`git -C "${STRIDE}" worktree remove --force "${m[1]}"`) } catch {}
  }
}

const WT = execSync('mktemp -d').toString().trim() + '/app'
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

// WCAG 2.2 AA + APG walkthrough. One point per individual validation.
const CHECKLIST = [
  ['Page structure (WCAG)', [
    ['page-title', 'The browser tab has a descriptive title (mentions Trail Runner 2 / Stride).', 'document-title'],
    ['page-lang', 'The page declares its language (html lang).', 'html-has-lang'],
    ['page-h1', 'Exactly one h1, and it is the product name.', 'page-has-heading-one'],
    ['page-landmarks', 'Header, main and footer are exposed as landmarks (banner/main/contentinfo).', 'region'],
    ['page-headings', 'Heading levels are logical (no skips, sections have headings).'],
    ['page-tab-order', 'Tab through the page: focus order matches the visual order.'],
    ['page-no-trap', 'No keyboard trap anywhere on the page.'],
    ['page-focus-visible', 'Every focused element shows a visible focus indicator.'],
    ['page-focus-obscured', 'Focused elements are never hidden behind a sticky header or footer.'],
    ['page-skip', 'A skip link (or equivalent) lets keyboard users jump past the header to the content.'],
    ['page-target-size', 'Pointer targets are at least 24 by 24 CSS px (WCAG 2.2, 2.5.8).', 'target-size'],
  ]],
  ['Breadcrumb (APG)', [
    ['crumb-nav', 'The path is a navigation landmark labelled "breadcrumb".'],
    ['crumb-links', 'Shop and Trail are real links, reachable by keyboard.'],
    ['crumb-current', 'Trail Runner 2 is marked as the current page (aria-current).'],
  ]],
  ['Photos — carousel (APG)', [
    ['car-region', 'The gallery is a labelled region (its name says it is the product photos).'],
    ['car-next-enter', 'Enter on the next button advances the photo.'],
    ['car-next-space', 'Space on the next button advances the photo.'],
    ['car-prev', 'Enter and Space on the previous button go back.'],
    ['car-alt', 'Each photo has useful alt text (describes the shoe, not "image").'],
  ]],
  ['Price — tooltip (APG)', [
    ['tip-trigger', 'The "i" is a focusable button with an accessible name (not just "i").', 'button-name'],
    ['tip-focus', 'The taxes note appears when the trigger receives keyboard focus.'],
    ['tip-hover', 'The taxes note appears on mouse hover.'],
    ['tip-escape', 'Escape dismisses the note without moving focus.'],
    ['tip-persistent', 'The note stays visible while the pointer is over it (hoverable and persistent).'],
    ['tip-no-focus', 'The tooltip content itself does not take keyboard focus.'],
  ]],
  ['Color — radio group (APG)', [
    ['col-group-label', 'The color choices are a labelled group (its name says "Color").'],
    ['col-tab', 'Tab moves into the group (one stop, roving tabindex, or one stop per swatch).'],
    ['col-arrows', 'Arrow keys move between blue, black and grey.'],
    ['col-select', 'Choosing with keyboard selects that color (not just focuses it).'],
    ['col-state', 'The selected color is announced/shown (aria-checked or visible text).'],
    ['col-not-color-alone', 'You can tell the selected color without seeing color (check, border plus label).'],
  ]],
  ['Size — dropdown (custom listbox or native select; a native select gets most of these for free — mark pass if the browser provides the behavior)', [
    ['size-collapsed', 'The list is closed when the page loads.'],
    ['size-enter', 'Enter on the size button opens the list.'],
    ['size-space', 'Space on the size button opens the list.'],
    ['size-arrowdown', 'Arrow Down on the size button opens the list.'],
    ['size-expanded', 'The button reports expanded/collapsed state (aria-expanded).'],
    ['size-arrows', 'Arrow keys move through the options.'],
    ['size-home-end', 'Home and End jump to the first and last option.'],
    ['size-typeahead', 'Typing a character jumps to the matching option (e.g. "1" to US 10).'],
    ['size-select-enter', 'Enter selects the active option and closes the list.'],
    ['size-select-space', 'Space selects the active option and closes the list.'],
    ['size-escape', 'Escape closes the list without changing the selection.'],
    ['size-focus-return', 'After closing, focus is back on the size button.'],
    ['size-shown', 'The chosen size shows on the button afterwards.'],
    ['size-soldout-disabled', 'Sold-out options are exposed as disabled.'],
    ['size-soldout-not-pickable', 'A sold-out option cannot be picked, by mouse or keyboard.'],
    ['size-soldout-not-color', 'Sold-out is conveyed by more than color alone.'],
  ]],
  ['Size guide — modal dialog (custom or native dialog; the native dialog element provides Escape and focus behavior itself)', [
    ['dlg-open-enter', 'Enter on the Size guide button opens the dialog.'],
    ['dlg-open-space', 'Space on the Size guide button opens the dialog.'],
    ['dlg-role', 'It is exposed as a modal dialog (role dialog, aria-modal).'],
    ['dlg-name', 'The dialog has an accessible name ("Size guide").'],
    ['dlg-focus-in', 'Focus moves inside the dialog when it opens.'],
    ['dlg-tab-cycle', 'Tab cycles within the dialog and never reaches the page behind.'],
    ['dlg-shift-tab-cycle', 'Shift-Tab cycles backwards within the dialog.'],
    ['dlg-escape', 'Escape closes the dialog.'],
    ['dlg-close-button', 'A close button with an accessible name closes it.'],
    ['dlg-focus-return', 'Focus returns to the Size guide button after closing.'],
    ['dlg-inert', 'The page behind cannot be clicked or interacted with while it is open.'],
    ['dlg-input-label', 'The foot length input has a visible or programmatic label.', 'label'],
    ['dlg-unit-label', 'The US/EU choice is labelled and keyboard operable.', 'label'],
    ['dlg-result', 'The calculated size is announced (live region) or focus moves to it.'],
  ]],
  ['Quantity — spinbutton (APG)', [
    ['qty-label', 'The quantity input has an accessible name ("Quantity").', 'label'],
    ['qty-arrow-up', 'Arrow Up increases the value by one.'],
    ['qty-arrow-down', 'Arrow Down decreases the value by one.'],
    ['qty-min', 'The value cannot go below one.'],
    ['qty-typing', 'Typing a number works.'],
    ['qty-buttons', 'The plus and minus buttons have accessible names (not just "+" and "-").', 'button-name'],
  ]],
  ['Wishlist — toggle button (APG)', [
    ['wish-name', 'The heart is a button with an accessible name ("Add to wishlist" or similar).', 'button-name'],
    ['wish-enter', 'Enter toggles the wishlist.'],
    ['wish-space', 'Space toggles the wishlist.'],
    ['wish-pressed', 'The pressed state is exposed (aria-pressed) and matches the visual state.'],
  ]],
  ['More information — tabs (APG)', [
    ['tabs-tablist', 'Details/Reviews/Shipping are tabs in a labelled tablist.'],
    ['tabs-arrow-right', 'Right arrow moves to the next tab.'],
    ['tabs-arrow-left', 'Left arrow moves to the previous tab.'],
    ['tabs-activate', 'Enter or Space shows the panel of the focused tab.'],
    ['tabs-selected', 'The shown tab is exposed as selected (aria-selected).'],
    ['tabs-one-panel', 'Only the panel of the selected tab is visible.'],
    ['tabs-panel', 'The panel is associated with its tab (tabpanel, aria-controls).'],
  ]],
  ['Questions — disclosure (native details or APG accordion)', [
    ['acc-operable', 'Each question is focusable and operable by keyboard (native summary, button, or equivalent).'],
    ['acc-enter', 'Enter on a question reveals its answer.'],
    ['acc-space', 'Space on a question reveals its answer.'],
    ['acc-state', 'The open/closed state is exposed to assistive technology (native details does this; a custom one needs aria-expanded).'],
    ['acc-association', 'The question is associated with its answer (native details, or aria-controls on a custom one).'],
  ]],
  ['Perception (WCAG)', [
    ['vis-zoom', 'At 200% browser zoom everything still works; nothing overlaps or is cut off.'],
    ['vis-reflow', 'At 320px width there is no horizontal scrolling.'],
    ['vis-text-spacing', 'With increased letter/line spacing (bookmarklet or extension) no text is clipped.'],
    ['vis-contrast-text', 'Text contrast looks sufficient (body 4.5:1, large text 3:1; axe covers this, note anything it missed).', 'color-contrast'],
    ['vis-contrast-ui', 'Control boundaries and focus indicators have enough contrast (3:1 against neighbours).'],
    ['vis-links', 'Links in text are identifiable without color alone (underline or other cue).'],
    ['vis-error', 'The add-to-cart error identifies the problem and how to fix it.'],
    ['vis-error-announced', 'The error appears in a live region or focus moves to it (screen reader users hear it).'],
  ]],
]

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
const axeRules = await (await fetch('/api/axe')).json()
const list = document.getElementById('list')
const progress = document.getElementById('progress')
function refresh() {
  const done = Object.keys(state).length
  const total = GROUPS.reduce((n, [, items]) => n + items.filter((i) => !i[2]).length, 0)
  const fails = Object.values(state).filter((r) => r.result === 'fail').length
  progress.textContent = done + ' / ' + total + ' manual checks answered, ' + fails + ' failed (axe-covered checks are marked automatically)'
}
for (const [group, items] of GROUPS) {
  const h = document.createElement('h2'); h.textContent = group; list.append(h)
  for (const [id, text, axeRule] of items) {
    const div = document.createElement('div'); div.className = 'item'
    const p = document.createElement('p'); p.textContent = text; div.append(p)
    if (axeRule) {
      const violated = axeRules.some((r) => r.id === axeRule)
      const badge = document.createElement('p')
      badge.style.cssText = 'font-size:.78rem;font-weight:600;color:' + (violated ? '#c0392b' : '#0a7d2c')
      badge.textContent = violated
        ? 'covered by axe: FAIL (' + axeRule + ' violation found)'
        : 'covered by axe: pass (no ' + axeRule + ' violations)'
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
  if (url.pathname === '/api/axe') {
    const scorePath = join(OUT, 'score.json')
    const rules = existsSync(scorePath) ? (JSON.parse(readFileSync(scorePath, 'utf8')).axe?.rules ?? []) : []
    res.writeHead(200, { 'content-type': 'application/json' })
    return res.end(JSON.stringify(rules))
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
