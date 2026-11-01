// WCAG 2.2 AA + APG checklist, one point per validation. Shared by inspect.mjs
// (manual evaluation), score.sh (automated checks) and dashboard.mjs.
// Each item is [id, description, source]:
//   source 'auto'       → checked by structure.spec.js (DOM and ARIA inspection)
//   source 'axe:<rule>' → passes unless axe reports a violation of <rule>
//   no source           → judged by hand in inspect.mjs
export const CHECKLIST = [
  ['Page structure (WCAG)', [
    ['page-title', 'The page title is descriptive (mentions Trail Runner 2 or Stride).', 'auto'],
    ['page-lang', 'The page declares its language (html lang).', 'axe:html-has-lang'],
    ['page-h1', 'Exactly one h1, and it is the product name.', 'auto'],
    ['page-landmarks', 'Exactly one banner (header), main and contentinfo (footer) landmark.', 'auto'],
    ['page-headings', 'Heading levels never skip (e.g. h2 straight to h4).', 'auto'],
    ['page-skip', 'A skip link at the start of the page jumps to the main content.', 'auto'],
    ['page-tab-order', 'Tab through the page: focus order matches the visual order.'],
    ['page-no-trap', 'No keyboard trap anywhere on the page.'],
    ['page-focus-visible', 'Every focused element shows a visible focus indicator.'],
    ['page-focus-obscured', 'Focused elements are never hidden behind a sticky header or footer.'],
    ['page-target-size', 'Pointer targets are at least 24 by 24 CSS px (WCAG 2.2, 2.5.8).', 'axe:target-size'],
  ]],
  ['Breadcrumb (APG)', [
    ['crumb-nav', 'The path is a navigation landmark labelled "breadcrumb".', 'auto'],
    ['crumb-links', 'Shop and Trail are real links in the breadcrumb, reachable by keyboard.', 'auto'],
    ['crumb-current', 'Trail Runner 2 is marked as the current page (aria-current="page").', 'auto'],
  ]],
  ['Photos — carousel (APG)', [
    ['car-region', 'The gallery is a labelled region or group (its name says it holds the photos).', 'auto'],
    ['car-next-enter', 'Enter on the next button advances the photo.'],
    ['car-next-space', 'Space on the next button advances the photo.'],
    ['car-prev', 'Enter and Space on the previous button go back.'],
    ['car-alt', 'Each photo has useful alt text (mentions the shoe; not "image" or a filename).', 'auto'],
  ]],
  ['Price — tooltip (APG)', [
    ['tip-trigger', 'The "i" is a button with a descriptive accessible name (not just "i").', 'auto'],
    ['tip-focus', 'The taxes note appears when the trigger receives keyboard focus.'],
    ['tip-hover', 'The taxes note appears on mouse hover.'],
    ['tip-escape', 'Escape dismisses the note without moving focus.'],
    ['tip-persistent', 'The note stays visible while the pointer is over it (hoverable and persistent).'],
    ['tip-no-focus', 'The tooltip content itself does not take keyboard focus.'],
  ]],
  ['Color — radio group (APG)', [
    ['col-group-label', 'The color choices are a labelled group, radiogroup or listbox (its name says "Color").', 'auto'],
    ['col-tab', 'Tab moves into the group (one stop, roving tabindex, or one stop per swatch).'],
    ['col-arrows', 'Arrow keys move between blue, black and grey.'],
    ['col-select', 'Choosing with keyboard selects that color (not just focuses it).'],
    ['col-state', 'The selected color is exposed (one checked/pressed option, or visible "Color: …" text).', 'auto'],
    ['col-not-color-alone', 'You can tell the selected color without seeing color (check, border plus label).'],
  ]],
  ['Size — dropdown (custom listbox or native select; a native select gets most of these for free — mark pass if the browser provides the behavior)', [
    ['size-collapsed', 'The list is closed when the page loads.', 'auto'],
    ['size-enter', 'Enter on the size button opens the list.'],
    ['size-space', 'Space on the size button opens the list.'],
    ['size-arrowdown', 'Arrow Down on the size button opens the list.'],
    ['size-expanded', 'The trigger reports expanded/collapsed state (aria-expanded false, then true when open).', 'auto'],
    ['size-arrows', 'Arrow keys move through the options.'],
    ['size-home-end', 'Home and End jump to the first and last option.'],
    ['size-typeahead', 'Typing a character jumps to the matching option (e.g. "1" to US 10).'],
    ['size-select-enter', 'Enter selects the active option and closes the list.'],
    ['size-select-space', 'Space selects the active option and closes the list.'],
    ['size-escape', 'Escape closes the list without changing the selection.'],
    ['size-focus-return', 'After closing, focus is back on the size button.'],
    ['size-shown', 'The chosen size shows on the button afterwards.'],
    ['size-soldout-disabled', 'Sold-out options are exposed as disabled (disabled or aria-disabled).', 'auto'],
    ['size-soldout-not-pickable', 'A sold-out option cannot be picked, by mouse or keyboard.'],
    ['size-soldout-not-color', 'Sold-out is conveyed by more than color alone.'],
  ]],
  ['Size guide — modal dialog (custom or native dialog; the native dialog element provides Escape and focus behavior itself)', [
    ['dlg-open-enter', 'Enter on the Size guide button opens the dialog.'],
    ['dlg-open-space', 'Space on the Size guide button opens the dialog.'],
    ['dlg-role', 'It is exposed as a modal dialog (native dialog opened with showModal, or role dialog with aria-modal).', 'auto'],
    ['dlg-name', 'The dialog has an accessible name that mentions size.', 'auto'],
    ['dlg-focus-in', 'Focus moves inside the dialog when it opens.'],
    ['dlg-tab-cycle', 'Tab cycles within the dialog and never reaches the page behind.'],
    ['dlg-shift-tab-cycle', 'Shift-Tab cycles backwards within the dialog.'],
    ['dlg-escape', 'Escape closes the dialog.'],
    ['dlg-close-button', 'The dialog has a button whose accessible name says close.', 'auto'],
    ['dlg-focus-return', 'Focus returns to the Size guide button after closing.'],
    ['dlg-inert', 'The page behind cannot be clicked or interacted with while it is open.'],
    ['dlg-input-label', 'The foot length input has an accessible name that says what it is.', 'auto'],
    ['dlg-unit-label', 'The US/EU choice is a labelled control (radios, select or buttons named US and EU).', 'auto'],
    ['dlg-result', 'The calculated size is in a live region or output element, so it is announced.', 'auto'],
  ]],
  ['Quantity — spinbutton (APG)', [
    ['qty-label', 'The quantity input has an accessible name that says quantity.', 'auto'],
    ['qty-arrow-up', 'Arrow Up increases the value by one.'],
    ['qty-arrow-down', 'Arrow Down decreases the value by one.'],
    ['qty-min', 'The value cannot go below one.'],
    ['qty-typing', 'Typing a number works.'],
    ['qty-buttons', 'No button is named just "+" or "-" (the step buttons have descriptive names).', 'auto'],
  ]],
  ['Wishlist — toggle button (APG)', [
    ['wish-name', 'The heart is a button with an accessible name that mentions the wishlist or saving.', 'auto'],
    ['wish-enter', 'Enter toggles the wishlist.'],
    ['wish-space', 'Space toggles the wishlist.'],
    ['wish-pressed', 'The state is exposed: aria-pressed toggles on click (or the accessible name changes).', 'auto'],
  ]],
  ['More information — tabs (APG)', [
    ['tabs-tablist', 'Details, Reviews and Shipping are tabs in a labelled tablist.', 'auto'],
    ['tabs-arrow-right', 'Right arrow moves to the next tab.'],
    ['tabs-arrow-left', 'Left arrow moves to the previous tab.'],
    ['tabs-activate', 'Enter or Space shows the panel of the focused tab.'],
    ['tabs-selected', 'Exactly one tab is aria-selected, and clicking another tab moves the selection.', 'auto'],
    ['tabs-one-panel', 'Only the panel of the selected tab is visible.', 'auto'],
    ['tabs-panel', 'The selected tab points to its tabpanel with aria-controls.', 'auto'],
  ]],
  ['Questions — disclosure (native details or APG accordion)', [
    ['acc-operable', 'Each question is a native summary or a button.', 'auto'],
    ['acc-enter', 'Enter on a question reveals its answer.'],
    ['acc-space', 'Space on a question reveals its answer.'],
    ['acc-state', 'The open/closed state is exposed (native details, or aria-expanded on each button).', 'auto'],
    ['acc-association', 'Each question is tied to its answer (native details, or aria-controls to an existing element).', 'auto'],
  ]],
  ['Perception (WCAG)', [
    ['vis-zoom', 'At 200% browser zoom everything still works; nothing overlaps or is cut off.'],
    ['vis-reflow', 'At 320px width there is no horizontal scrolling.', 'auto'],
    ['vis-text-spacing', 'With increased letter/line spacing (bookmarklet or extension) no text is clipped.'],
    ['vis-contrast-text', 'Text contrast is sufficient (body 4.5:1, large text 3:1).', 'axe:color-contrast'],
    ['vis-contrast-ui', 'Control boundaries and focus indicators have enough contrast (3:1 against neighbours).'],
    ['vis-links', 'Links in text are identifiable without color alone (underline or other cue).', 'axe:link-in-text-block'],
    ['vis-error', 'The add-to-cart error identifies the problem and how to fix it.'],
    ['vis-error-announced', 'The missing-size error is in a live region, or focus moves to a control described by it (aria-describedby).', 'auto'],
  ]],
]

export const ITEMS = CHECKLIST.flatMap(([, items]) => items)

// Result of every non-manual item for one run, from its score.json.
// Returns { id: { result: 'pass' | 'fail' | 'unscored', note } }.
export function autoResults(score) {
  const out = {}
  const axeRules = score?.axe?.rules ?? null
  for (const [id, , source] of ITEMS) {
    if (!source) continue
    if (source.startsWith('axe:')) {
      const rule = source.slice(4)
      if (!axeRules) out[id] = { result: 'unscored', note: 'run experiment/score.sh' }
      else {
        const v = axeRules.find((r) => r.id === rule)
        out[id] = v ? { result: 'fail', note: `axe ${rule}: ${v.nodes} nodes` } : { result: 'pass', note: `no axe ${rule} violations` }
      }
    } else {
      out[id] = score?.structure?.[id] ?? { result: 'unscored', note: 'run experiment/score.sh' }
    }
  }
  return out
}
