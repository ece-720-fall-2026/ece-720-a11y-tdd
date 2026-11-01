// Automated DOM / ARIA checks for the checklist items marked 'auto' in checklist.mjs.
// Copied into the run worktree and executed by score.sh; each test title is a checklist id.
// Locators are deliberately implementation-agnostic (native or ARIA widgets both pass).
import { test, expect } from '@playwright/test'

const PATH = '/products/trail-runner-2'
const SOLD_OUT = /sold\s*out|unavailable|out of stock/i

test.beforeEach(async ({ page }) => {
  await page.goto(PATH, { waitUntil: 'networkidle' })
})

const settle = (page) => page.waitForTimeout(300)

// ---------- Page structure ----------

test('page-title', async ({ page }) => {
  const title = await page.title()
  expect(title, `title is "${title}"`).toMatch(/trail runner|stride/i)
})

test('page-h1', async ({ page }) => {
  const h1 = page.getByRole('heading', { level: 1 })
  const n = await h1.count()
  expect(n, `found ${n} level-1 headings`).toBe(1)
  await expect(h1, 'the h1 is not the product name').toContainText(/trail runner 2/i, { timeout: 1_000 })
})

test('page-landmarks', async ({ page }) => {
  for (const role of ['banner', 'main', 'contentinfo']) {
    const n = await page.getByRole(role).count()
    expect(n, `found ${n} ${role} landmarks`).toBe(1)
  }
})

test('page-headings', async ({ page }) => {
  const skips = await page.evaluate(() => {
    const els = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6,[role="heading"]')].filter((el) => el.checkVisibility())
    const out = []
    let prev = 0
    for (const el of els) {
      const level = el.getAttribute('aria-level') ? Number(el.getAttribute('aria-level')) : Number(el.tagName[1] || 2)
      if (prev && level > prev + 1) out.push(`h${prev} -> h${level} ("${el.textContent.trim().slice(0, 30)}")`)
      prev = level
    }
    return out
  })
  expect(skips, `skipped levels: ${skips.join(', ')}`).toEqual([])
})

test('page-skip', async ({ page }) => {
  const result = await page.evaluate(() => {
    const focusable = [...document.querySelectorAll('a[href], button, input, select, textarea, summary, [tabindex]')]
      .filter((el) => el.tabIndex >= 0 && !el.disabled)
    const first = focusable[0]
    if (!first) return 'no focusable elements'
    const href = first.getAttribute('href') ?? ''
    if (first.tagName !== 'A' || !href.startsWith('#') || href.length < 2) return `first focusable element is ${first.tagName.toLowerCase()} "${first.textContent.trim().slice(0, 30)}", not a skip link`
    const target = document.getElementById(decodeURIComponent(href.slice(1)))
    if (!target) return `skip link points to missing ${href}`
    if (!(target.matches('main, [role="main"]') || target.querySelector('h1') || target.closest('main, [role="main"]'))) return `skip link target ${href} is not the main content`
    return 'ok'
  })
  expect(result, result).toBe('ok')
})

// ---------- Breadcrumb ----------

const breadcrumb = (page) => page.getByRole('navigation', { name: /breadcrumb/i })

test('crumb-nav', async ({ page }) => {
  const n = await breadcrumb(page).count()
  expect(n, `found ${n} navigation landmarks named "breadcrumb"`).toBe(1)
})

test('crumb-links', async ({ page }) => {
  const nav = breadcrumb(page)
  expect(await nav.count(), 'no navigation landmark named "breadcrumb"').toBeGreaterThan(0)
  for (const name of ['Shop', 'Trail']) {
    const link = nav.getByRole('link', { name: new RegExp(`^\\s*${name}\\s*$`, 'i') })
    expect(await link.count(), `"${name}" is not a link in the breadcrumb`).toBeGreaterThan(0)
    const tabIndex = await link.first().evaluate((el) => el.tabIndex)
    expect(tabIndex, `"${name}" is removed from the tab order`).toBeGreaterThanOrEqual(0)
  }
})

test('crumb-current', async ({ page }) => {
  const nav = breadcrumb(page)
  expect(await nav.count(), 'no navigation landmark named "breadcrumb"').toBeGreaterThan(0)
  const current = nav.locator('[aria-current="page"]')
  expect(await current.count(), 'nothing in the breadcrumb has aria-current="page"').toBeGreaterThan(0)
  await expect(current.first(), 'aria-current is not on Trail Runner 2').toContainText(/trail runner 2/i, { timeout: 1_000 })
})

// ---------- Photos ----------

test('car-region', async ({ page }) => {
  const name = /photo|image|gallery|carousel|picture|slide/i
  const region = page.getByRole('region', { name }).or(page.getByRole('group', { name }))
  expect(await region.count(), 'no region or group named like photos/gallery/carousel').toBeGreaterThan(0)
  expect(await region.first().getByRole('img').count(), 'the labelled region contains no image').toBeGreaterThan(0)
})

test('car-alt', async ({ page }) => {
  const name = /photo|image|gallery|carousel|picture|slide/i
  const region = page.getByRole('region', { name }).or(page.getByRole('group', { name })).first()
  const scope = (await region.count()) ? region : page.getByRole('main')
  const next = scope.getByRole('button', { name: /next/i })
  const readNames = () => scope.getByRole('img').evaluateAll((els) => els.map((el) => {
    const labelledby = (el.getAttribute('aria-labelledby') ?? '').split(/\s+/).filter(Boolean)
      .map((id) => document.getElementById(id)?.textContent ?? '').join(' ')
    return (el.getAttribute('alt') ?? el.getAttribute('aria-label') ?? (labelledby || el.getAttribute('title')) ?? '').trim()
  }))
  const names = new Set(await readNames())
  for (let i = 0; i < 8 && (await next.count()); i++) {
    await next.first().click()
    await settle(page)
    for (const n of await readNames()) names.add(n)
  }
  expect(names.size, 'no photos with an accessible name in the gallery').toBeGreaterThan(0)
  const bad = [...names].filter((n) =>
    !/shoe|trail runner|sneaker|runner/i.test(n) ||
    /^(image|photo|picture|img|product)( \d+)?$/i.test(n) ||
    /\.(png|jpe?g|webp|svg|gif)$/i.test(n))
  expect(bad, `photos without a useful description: ${bad.map((n) => `"${n}"`).join(', ')}`).toEqual([])
})

// ---------- Price tooltip ----------

test('tip-trigger', async ({ page }) => {
  const bare = page.getByRole('button', { name: /^\s*(i|ⓘ|ℹ️?|\?)\s*$/i })
  expect(await bare.count(), 'a button is named just "i"').toBe(0)
  const trigger = page.getByRole('button', { name: /tax|price|info|detail/i })
  expect(await trigger.count(), 'no button named like taxes/price/info').toBeGreaterThan(0)
})

// ---------- Color ----------

const COLOR = /colou?r/i

async function colorGroup(page) {
  const group = page.getByRole('radiogroup', { name: COLOR })
    .or(page.getByRole('group', { name: COLOR }))
    .or(page.getByRole('listbox', { name: COLOR }))
  if (await group.count()) return group.first()
  // Collapsed pickers: open them with a button that mentions color.
  const opener = page.getByRole('button', { name: COLOR })
  if (await opener.count()) { await opener.first().click(); await settle(page) }
  return group.first()
}

test('col-group-label', async ({ page }) => {
  const group = await colorGroup(page)
  expect(await group.count(), 'no group, radiogroup or listbox named "Color"').toBeGreaterThan(0)
})

test('col-state', async ({ page }) => {
  const shownAsText = await page.getByText(/colou?r\s*[:\-–—]?\s*(blue|black|gr[ae]y)/i).count()
  if (shownAsText) return
  const group = await colorGroup(page)
  expect(await group.count(), 'no "Color: …" text and no color group').toBeGreaterThan(0)
  const selected = await group.locator('input:checked, [aria-checked="true"], [aria-pressed="true"], [aria-selected="true"], [aria-current="true"]').count()
  expect(selected, `no "Color: …" text and ${selected} options marked selected in the group`).toBe(1)
})

// ---------- Size ----------

async function sizeControl(page) {
  const native = page.locator('select').filter({ has: page.locator('option', { hasText: /\d/ }) })
  for (let i = 0; i < await native.count(); i++) {
    const el = native.nth(i)
    const label = await el.evaluate((s) => `${s.labels?.[0]?.textContent ?? ''} ${s.getAttribute('aria-label') ?? ''} ${s.name} ${s.id}`)
    if (/size/i.test(label)) return { native: el }
  }
  const candidates = page.getByRole('combobox', { name: /size/i }).or(page.getByRole('button', { name: /size/i }))
  const strict = candidates.filter({ hasNotText: /guide|chart/i })
  if (await strict.count()) return { trigger: strict.first() }
  const loose = candidates.filter({ hasNotText: /^\W*size (guide|chart)\W*$/i })
  if (await loose.count()) return { trigger: loose.first() }
  return {}
}

test('size-collapsed', async ({ page }) => {
  const { native, trigger } = await sizeControl(page)
  if (native) return
  expect(trigger, 'no size select, combobox or button').toBeTruthy()
  expect(await page.getByRole('listbox').count(), 'a listbox is visible on load').toBe(0)
  expect(await page.getByRole('option').count(), 'options are visible on load').toBe(0)
  expect(await trigger.getAttribute('aria-expanded'), 'the size trigger reports expanded on load').not.toBe('true')
})

test('size-expanded', async ({ page }) => {
  const { native, trigger } = await sizeControl(page)
  if (native) return
  expect(trigger, 'no size select, combobox or button').toBeTruthy()
  const before = await trigger.getAttribute('aria-expanded')
  expect(before, `aria-expanded on load is ${before}`).toBe('false')
  await trigger.click()
  await settle(page)
  const after = await trigger.getAttribute('aria-expanded')
  expect(after, `aria-expanded after opening is ${after}`).toBe('true')
})

test('size-soldout-disabled', async ({ page }) => {
  const { native, trigger } = await sizeControl(page)
  expect(native || trigger, 'no size select, combobox or button').toBeTruthy()
  if (trigger) { await trigger.click(); await settle(page) }
  const scope = native ?? page.locator('body')
  const report = await scope.evaluate((root, soldOut) => {
    const re = new RegExp(soldOut, 'i')
    const opts = [...root.querySelectorAll('option, [role="option"], [role="radio"], input[type="radio"], button')]
    const describe = (el) => {
      const labels = el.labels ? [...el.labels].map((l) => l.textContent).join(' ') : ''
      return `${el.textContent} ${labels} ${el.getAttribute('aria-label') ?? ''} ${el.getAttribute('title') ?? ''}`
    }
    const sold = opts.filter((el) => re.test(describe(el)) && !/guide|chart/i.test(describe(el)))
    const enabled = sold.filter((el) => !(el.disabled || el.getAttribute('aria-disabled') === 'true'))
    return { sold: sold.length, enabled: enabled.map((el) => describe(el).trim().slice(0, 30)) }
  }, SOLD_OUT.source)
  expect(report.sold, 'no size option is identified as sold out').toBeGreaterThan(0)
  expect(report.enabled, `sold-out options not disabled: ${report.enabled.join(', ')}`).toEqual([])
})

// ---------- Size guide dialog ----------

async function openGuide(page) {
  const opener = page.getByRole('button', { name: /size (guide|chart)/i }).or(page.getByRole('link', { name: /size (guide|chart)/i }))
  expect(await opener.count(), 'no "Size guide" button').toBeGreaterThan(0)
  await opener.first().click()
  await settle(page)
  const dialog = page.getByRole('dialog').or(page.getByRole('alertdialog'))
  expect(await dialog.count(), 'no dialog appears after clicking Size guide').toBeGreaterThan(0)
  return dialog.first()
}

test('dlg-role', async ({ page }) => {
  await openGuide(page)
  const modal = page.locator('dialog:modal, [role="dialog"][aria-modal="true"], [role="alertdialog"][aria-modal="true"]')
  expect(await modal.count(), 'the dialog is neither a showModal() dialog nor aria-modal="true"').toBeGreaterThan(0)
})

test('dlg-name', async ({ page }) => {
  await openGuide(page)
  const named = page.getByRole('dialog', { name: /size/i }).or(page.getByRole('alertdialog', { name: /size/i }))
  expect(await named.count(), 'the dialog has no accessible name mentioning size').toBeGreaterThan(0)
})

test('dlg-close-button', async ({ page }) => {
  const dialog = await openGuide(page)
  expect(await dialog.getByRole('button', { name: /close|dismiss/i }).count(), 'no button named close in the dialog').toBeGreaterThan(0)
})

test('dlg-input-label', async ({ page }) => {
  const dialog = await openGuide(page)
  const name = /foot|length|cm|centim|mm|inch|measure/i
  const input = dialog.getByRole('spinbutton', { name }).or(dialog.getByRole('textbox', { name }))
  expect(await input.count(), 'no input in the dialog named like foot length').toBeGreaterThan(0)
})

test('dlg-unit-label', async ({ page }) => {
  const dialog = await openGuide(page)
  const radios = (await dialog.getByRole('radio', { name: /\bUS\b/ }).count()) && (await dialog.getByRole('radio', { name: /\bEU\b/ }).count())
  const buttons = (await dialog.getByRole('button', { name: /\bUS\b/ }).count()) && (await dialog.getByRole('button', { name: /\bEU\b/ }).count())
  const tabs = (await dialog.getByRole('tab', { name: /\bUS\b/ }).count()) && (await dialog.getByRole('tab', { name: /\bEU\b/ }).count())
  const select = await dialog.getByRole('combobox', { name: /unit|system|size|US|EU/i }).count()
  expect(radios || buttons || tabs || select, 'no labelled US/EU control in the dialog').toBeTruthy()
})

test('dlg-result', async ({ page }) => {
  const dialog = await openGuide(page)
  const live = dialog.locator('[aria-live]:not([aria-live="off"]), [role="status"], [role="alert"], output')
  expect(await live.count(), 'no live region or output element in the dialog').toBeGreaterThan(0)
})

// ---------- Quantity ----------

test('qty-label', async ({ page }) => {
  const name = /quantity|qty/i
  const input = page.getByRole('spinbutton', { name }).or(page.getByRole('textbox', { name })).or(page.getByRole('combobox', { name }))
  expect(await input.count(), 'no input named quantity').toBeGreaterThan(0)
})

test('qty-buttons', async ({ page }) => {
  const bare = page.getByRole('button', { name: /^\s*[+\-−–]\s*$/ })
  const n = await bare.count()
  expect(n, `${n} buttons are named just "+" or "-"`).toBe(0)
})

// ---------- Wishlist ----------

const wishlist = (page) => page.getByRole('button', { name: /wish|favou?rite|save/i })

test('wish-name', async ({ page }) => {
  expect(await wishlist(page).count(), 'no button named like wishlist/favorite/save').toBeGreaterThan(0)
})

test('wish-pressed', async ({ page }) => {
  const button = wishlist(page).first()
  expect(await wishlist(page).count(), 'no button named like wishlist/favorite/save').toBeGreaterThan(0)
  const handle = await button.elementHandle()
  const read = () => handle.evaluate((el) => ({ pressed: el.getAttribute('aria-pressed'), name: (el.getAttribute('aria-label') ?? el.textContent).trim() }))
  const before = await read()
  await handle.click()
  await settle(page)
  const after = await read()
  const toggled = before.pressed !== null && after.pressed !== null && before.pressed !== after.pressed
  const renamed = before.name !== after.name
  expect(toggled || renamed, `aria-pressed ${before.pressed} -> ${after.pressed}, name unchanged ("${after.name}")`).toBeTruthy()
})

// ---------- Tabs ----------

test('tabs-tablist', async ({ page }) => {
  const tablist = page.getByRole('tablist')
  expect(await tablist.count(), 'no tablist').toBeGreaterThan(0)
  for (const name of [/details/i, /reviews/i, /shipping/i]) {
    expect(await page.getByRole('tab', { name }).count(), `no tab named ${name}`).toBeGreaterThan(0)
  }
  const labelled = await tablist.first().evaluate((el) => !!(el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')))
  expect(labelled, 'the tablist has no aria-label or aria-labelledby').toBeTruthy()
})

test('tabs-selected', async ({ page }) => {
  const selected = page.locator('[role="tab"][aria-selected="true"]')
  expect(await selected.count(), 'not exactly one tab is aria-selected on load').toBe(1)
  const reviews = page.getByRole('tab', { name: /reviews/i })
  expect(await reviews.count(), 'no Reviews tab').toBeGreaterThan(0)
  await reviews.first().click()
  await settle(page)
  expect(await reviews.first().getAttribute('aria-selected'), 'Reviews is not aria-selected after clicking it').toBe('true')
  expect(await selected.count(), 'not exactly one tab is aria-selected after clicking Reviews').toBe(1)
})

test('tabs-one-panel', async ({ page }) => {
  const panels = page.getByRole('tabpanel')
  expect(await panels.count(), 'not exactly one visible tabpanel on load').toBe(1)
  const reviews = page.getByRole('tab', { name: /reviews/i })
  expect(await reviews.count(), 'no Reviews tab').toBeGreaterThan(0)
  await reviews.first().click()
  await settle(page)
  expect(await panels.count(), 'not exactly one visible tabpanel after clicking Reviews').toBe(1)
})

test('tabs-panel', async ({ page }) => {
  const selected = page.locator('[role="tab"][aria-selected="true"]').first()
  expect(await selected.count(), 'no aria-selected tab').toBeGreaterThan(0)
  const controls = await selected.getAttribute('aria-controls')
  expect(controls, 'the selected tab has no aria-controls').toBeTruthy()
  const role = await page.evaluate((id) => document.getElementById(id)?.getAttribute('role') ?? null, controls)
  expect(role, `aria-controls="${controls}" does not point to a role="tabpanel" element`).toBe('tabpanel')
})

// ---------- Questions ----------

async function questions(page) {
  const details = page.locator('details:has(> summary)')
  if (await details.count()) return { native: true }
  const buttons = page.getByRole('button', { name: /\?/ })
  return { native: false, buttons, n: await buttons.count() }
}

test('acc-operable', async ({ page }) => {
  const q = await questions(page)
  if (q.native) return
  expect(q.n, 'questions are neither native details/summary nor buttons').toBeGreaterThan(0)
  const removed = await q.buttons.evaluateAll((els) => els.filter((el) => el.tabIndex < 0).length)
  expect(removed, `${removed} question buttons are out of the tab order`).toBe(0)
})

test('acc-state', async ({ page }) => {
  const q = await questions(page)
  if (q.native) return
  expect(q.n, 'questions are neither native details/summary nor buttons').toBeGreaterThan(0)
  const missing = await q.buttons.evaluateAll((els) => els.filter((el) => !el.hasAttribute('aria-expanded')).length)
  expect(missing, `${missing} question buttons have no aria-expanded`).toBe(0)
})

test('acc-association', async ({ page }) => {
  const q = await questions(page)
  if (q.native) return
  expect(q.n, 'questions are neither native details/summary nor buttons').toBeGreaterThan(0)
  const broken = await q.buttons.evaluateAll((els) => els.filter((el) => {
    const id = el.getAttribute('aria-controls')
    return !id || !document.getElementById(id)
  }).length)
  expect(broken, `${broken} question buttons have no aria-controls pointing to an existing element`).toBe(0)
})

// ---------- Perception ----------

test('vis-reflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto(PATH, { waitUntil: 'networkidle' })
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow, `page is ${overflow}px wider than a 320px viewport`).toBeLessThanOrEqual(1)
})

test('vis-error-announced', async ({ page }) => {
  const add = page.getByRole('button', { name: /add to (cart|bag)/i })
  expect(await add.count(), 'no Add to cart button').toBeGreaterThan(0)
  await add.first().click()
  await settle(page)
  const live = page.locator('[role="alert"], [role="status"], [aria-live]:not([aria-live="off"]), output').filter({ hasText: /size/i })
  if (await live.count()) return
  const focusDescribed = await page.evaluate(() => {
    for (let el = document.activeElement; el && el !== document.body; el = el.parentElement) {
      const ids = `${el.getAttribute('aria-describedby') ?? ''} ${el.getAttribute('aria-errormessage') ?? ''}`.split(/\s+/).filter(Boolean)
      if (ids.some((id) => /size/i.test(document.getElementById(id)?.textContent ?? ''))) return true
    }
    return false
  })
  expect(focusDescribed, 'after Add to cart, no live region mentions the size and focus does not move to a control described by the error').toBeTruthy()
})
