# @wcag-tools/playwright

Playwright matchers that check a page against WCAG 2.2 AA and components against their [WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/patterns/) pattern. When a check fails, the message says how to fix it.

```ts
import { test } from "@playwright/test";
import { expect } from "@wcag-tools/playwright";

test("product page", async ({ page }) => {
  await page.goto("/products/trail-runner-2");
  await expect(page).toBeWCAGCompliant();
  await expect(page.getByRole("button", { name: "Size guide" })).toBeAPGModal(["focus-trap", "escape-closes"]);
});
```

`expect` is Playwright's `expect` extended with these matchers.

## Matchers

<!-- matchers:start -->
| Matcher | Asserts | Checks |
|---|---|---|
| `toBeWCAGCompliant` | The page (or a Locator's subtree) meets WCAG 2.2 AA, checked with axe-core plus keyboard, reflow and text-spacing checks. | `text-alternatives`, `structure`, `use-of-color`, `color-contrast`, `resize-text`, `reflow`, `text-spacing`, `keyboard`, `no-keyboard-trap`, `landmarks`, `page-title`, `focus-order`, `link-purpose`, `headings`, `focus-visible`, `focus-not-obscured`, `target-size`, `language`, `labels`, `name-role-value` |
| `toAnnounceStatus` | Pressing Enter on the trigger shows a message that screen readers announce (WCAG 4.1.3); pass `{ field }` for a field error. | `activates-with-keyboard`, `live-region`, `region-present-before`, `focus-kept`, `error-linked` |
| `toBeAPGModal` | Activating the trigger opens a modal dialog (APG Modal Dialog). Called on the trigger. | `opens-with-keyboard`, `role-and-name`, `modal`, `focus-moves-in`, `focus-trap`, `escape-closes`, `focus-returns` |
| `toBeAPGCombobox` | A select-only combobox: shows one value and opens a list (APG Combobox). | `role-and-name`, `collapsed-state`, `opens-with-keyboard`, `controls-listbox`, `arrow-keys`, `enter-selects`, `selected-state`, `disabled-options`, `escape-closes` |
| `toBeAPGTabs` | A tablist: sections side by side, one shown at a time (APG Tabs). | `tablist-name`, `tabs`, `selected-state`, `panels`, `single-tab-stop`, `arrow-keys`, `activation` |
| `toBeAPGTooltip` | The trigger has a tooltip shown on hover and focus (APG Tooltip, WCAG 1.4.13). Called on the trigger. | `described-by`, `text`, `not-focusable`, `shows-on-focus`, `escape-dismisses`, `hides-on-blur`, `shows-on-hover`, `hoverable` |
| `toBeAPGRadioGroup` | A radio group: one of a few visible choices (APG Radio Group). Called on the radiogroup or fieldset. | `role-and-name`, `radios`, `checked-state`, `space-checks`, `arrow-keys`, `single-tab-stop` |
| `toBeAPGSpinbutton` | A spinbutton: a number changed with arrow keys or typed (APG Spinbutton). | `role-and-name`, `value-state`, `arrow-keys`, `bounds`, `home-end`, `accepts-typing` |
| `toBeAPGAccordion` | An accordion: headers that show or hide their panels (APG Accordion). Called on the container. | `header-buttons`, `expanded-state`, `controls-panel`, `toggles-with-keyboard`, `collapsed-hidden`, `tab-order` |
| `toBeAPGBreadcrumb` | A breadcrumb trail (APG Breadcrumb). Called on the nav. | `landmark-and-name`, `ordered-list`, `earlier-steps-are-links`, `current-page` |
| `toBeAPGCarousel` | A carousel: one slide at a time with Previous/Next (APG Carousel). Called on the container. | `container`, `slides`, `controls`, `one-visible`, `wraps`, `live-region`, `rotation-control` |
| `toBeAPGToggleButton` | An on/off button (APG Button, toggle). | `role-and-name`, `pressed-state`, `toggles-with-keyboard`, `name-stable`, `focus-stays` |
| `toBeAPGNavigation` | A site navigation made of links (APG navigation landmark). Called on the nav. | `landmark-and-name`, `links`, `tab-order`, `no-menu-roles`, `current-page` |
<!-- matchers:end -->

Every matcher takes an optional array of check ids first, then its options (`toAnnounceStatus` and `toBeAPGTooltip` take their text first). Without the array, all checks run.

- The matchers use the keyboard only, and restore the widget afterwards. `toAnnounceStatus` is the exception: it really performs the action.
- `.not` is not supported.
- Native `<select>`, `<dialog>` with `showModal()`, radios and `<input type="number">` are accepted.
- `toBeWCAGCompliant` checks the current state of the page, so open a dialog first to check its contents.
