# playwright-apg

Playwright matchers that check a component against a [WAI-ARIA Authoring Practices Guide (APG)](https://www.w3.org/WAI/ARIA/apg/patterns/) pattern. A test declares what a component is ("this is a combobox"), and the matcher checks every APG rule for that type: roles, states and properties, keyboard interaction, and focus management.

```ts
import { test } from "@playwright/test";
import { expect } from "playwright-apg";

test("product page widgets follow the APG patterns", async ({ page }) => {
  await page.goto("/product");
  await expect(page.getByRole("button", { name: "Size guide" })).toOpenModalDialog({ name: "Size guide" });
  await expect(page.getByRole("combobox", { name: "Color" })).toBeCombobox({ options: ["Blue", "Black", "Grey"] });
  await expect(page.getByRole("tablist", { name: "Product information" })).toBeTabs({ tabs: ["Details", "Reviews", "Shipping"] });
  await expect(page.getByRole("button", { name: "Price information" })).toHaveTooltip("Price includes taxes");
  await expect(page.getByRole("radiogroup", { name: "Size" })).toBeRadioGroup();
  await expect(page.getByRole("spinbutton", { name: "Quantity" })).toBeSpinbutton({ min: 1, max: 5 });
});
```

`expect` is Playwright's regular `expect`, extended with the matchers below, so built-in assertions keep working. To combine it with other extended `expect`s, use Playwright's `mergeExpects`.

## Matchers

| Matcher | Called on | Options |
|---|---|---|
| `toOpenModalDialog(options?)` | The element that opens the dialog | `name`: expected dialog name; `dialog`: dialog locator, if `getByRole("dialog")` is ambiguous |
| `toBeCombobox(options?)` | The select-only combobox | `options`: option names in order; `name`: expected combobox name |
| `toBeTabs(options?)` | The tablist | `tabs`: tab names in order; `activation`: `"automatic"` or `"manual"` (either passes when omitted) |
| `toHaveTooltip(text?)` | The element the tooltip describes | `text`: expected tooltip text (string or RegExp) |
| `toBeRadioGroup(options?)` | The `radiogroup`, or the `<fieldset>` of native radios | `radios`: radio names in order |
| `toBeSpinbutton(options?)` | The spinbutton | `min`, `max`: expected bounds (read from the element when omitted) |

How the matchers behave:
- **They drive the page with the keyboard**, so they change focus and widget state while running. Each one restores the widget afterwards: dialogs and popups closed, the original value or tab selected. One exception: a radio group with no radio checked keeps one checked, because the keyboard can't uncheck a radio.
- **They use only the keyboard** for interaction checks. A widget that only works with the mouse fails.
- **`.not` is rejected**, because "does not follow the pattern" has no single meaning.
- **Native elements are recognised:**
  - A `<select>` passes `toBeCombobox`'s keyboard checks, since the browser provides them.
  - A `<dialog>` opened with `showModal()` counts as modal.
  - Native radios and `<input type="number">` are driven like their ARIA counterparts.

## Failure messages

A failure lists the whole checklist. It marks what passed (✓), what failed (✗) and what couldn't run (-), with the reason and a link to the APG section:

```text
Locator getByRole('button', { name: 'Size guide' }) does not follow the APG Modal Dialog pattern: 1 of 7 checks did not pass.
Pattern: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/

  ✓ opens-with-keyboard: Pressing Enter on the focused trigger opens the dialog.
  ✓ role-and-name: The dialog has role `dialog` and an accessible name (`aria-labelledby` or `aria-label`).
  ...
  ✗ focus-returns: When the dialog closes, focus returns to the element that opened it.
      After the dialog closed, focus is on <body> (focus was lost) instead of the trigger.
      See https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/#keyboard_interaction
```

The checks are also available without `expect`: `checkModalDialog`, `checkCombobox`, `checkTabs`, `checkTooltip`, `checkRadioGroup` and `checkSpinbutton` return a run whose `report` lists every check with its status.

## Checklist

Generated from `src/patterns.ts` by `pnpm run docs`.

<!-- checklist:start -->
### `toOpenModalDialog`: [Modal Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)

| Check | Requirement | APG section |
|---|---|---|
| `opens-with-keyboard` | Pressing Enter on the focused trigger opens the dialog. | [Keyboard](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/#keyboard_interaction) |
| `role-and-name` | The dialog has role `dialog` and an accessible name (`aria-labelledby` or `aria-label`). | [Roles](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/#roles_states_properties) |
| `modal` | The dialog is modal: `aria-modal="true"`, or a native `<dialog>` opened with `showModal()`. | [Roles](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/#roles_states_properties) |
| `focus-moves-in` | When the dialog opens, focus moves to an element inside it. | [Keyboard](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/#keyboard_interaction) |
| `tab-wraps` | Tab and Shift+Tab cycle through the tabbable elements inside the dialog without leaving it. | [Keyboard](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/#keyboard_interaction) |
| `escape-closes` | Escape closes the dialog. | [Keyboard](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/#keyboard_interaction) |
| `focus-returns` | When the dialog closes, focus returns to the element that opened it. | [Keyboard](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/#keyboard_interaction) |

### `toBeCombobox`: [Combobox (select-only)](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)

| Check | Requirement | APG section |
|---|---|---|
| `role-and-name` | The element has role `combobox` and an accessible name. | [Roles](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/#roles_states_properties) |
| `collapsed-state` | While the popup is closed, `aria-expanded` is `false`. | [Roles](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/#roles_states_properties) |
| `opens-with-keyboard` | Enter, Space and Down Arrow open the listbox without moving DOM focus, and `aria-expanded` becomes `true`. | [Keyboard](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/#keyboard_interaction) |
| `controls-listbox` | `aria-controls` refers to an element with role `listbox` that contains elements with role `option`. | [Roles](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/#roles_states_properties) |
| `arrow-keys` | Down Arrow and Up Arrow move the active option (`aria-activedescendant`) while DOM focus stays on the combobox. | [Keyboard](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/#keyboard_interaction) |
| `enter-selects` | Enter sets the value to the active option, closes the listbox and keeps focus on the combobox. | [Keyboard](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/#keyboard_interaction) |
| `selected-state` | The selected option has `aria-selected="true"`. | [Roles](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/#roles_states_properties) |
| `escape-closes` | Escape closes the listbox without changing the value and keeps focus on the combobox. | [Keyboard](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/#keyboard_interaction) |

### `toBeTabs`: [Tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)

| Check | Requirement | APG section |
|---|---|---|
| `tablist-name` | The element has role `tablist` and an accessible name. | [Roles](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/#roles_states_properties) |
| `tabs` | The tablist contains at least two elements with role `tab`. | [Roles](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/#roles_states_properties) |
| `selected-state` | Exactly one tab has `aria-selected="true"`; the others have `aria-selected="false"`. | [Roles](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/#roles_states_properties) |
| `panels` | Each tab's `aria-controls` refers to a `tabpanel` labelled by the tab; only the selected tab's panel is shown. | [Roles](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/#roles_states_properties) |
| `single-tab-stop` | Only the selected tab is in the tab sequence; Tab moves focus out of the tablist. | [Keyboard](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/#keyboard_interaction) |
| `arrow-keys` | Right/Left Arrow (Down/Up for vertical tablists) move focus between tabs and wrap at the ends. | [Keyboard](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/#keyboard_interaction) |
| `activation` | A focused tab is activated automatically on focus, or with Enter or Space (manual activation). | [Keyboard](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/#keyboard_interaction) |

### `toHaveTooltip`: [Tooltip](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/)

| Check | Requirement | APG section |
|---|---|---|
| `described-by` | The trigger references an element with role `tooltip` through `aria-describedby`. | [Roles](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/#roles_states_properties) |
| `text` | The tooltip contains the expected text. | [Roles](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/#roles_states_properties) |
| `not-focusable` | The tooltip itself never receives focus; focus stays on the trigger. | [Roles](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/#roles_states_properties) |
| `shows-on-focus` | The tooltip is shown when the trigger receives keyboard focus. | [Keyboard](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/#keyboard_interaction) |
| `escape-dismisses` | Escape hides the tooltip while focus stays on the trigger. | [Keyboard](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/#keyboard_interaction) |
| `hides-on-blur` | The tooltip is hidden when the trigger loses focus. | [Keyboard](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/#keyboard_interaction) |
| `shows-on-hover` | The tooltip is shown when the pointer is over the trigger. | [Keyboard](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/#keyboard_interaction) |
| `hoverable` | The tooltip stays shown while the pointer moves from the trigger onto the tooltip (WCAG 1.4.13). | [Keyboard](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/#keyboard_interaction) |

### `toBeRadioGroup`: [Radio Group](https://www.w3.org/WAI/ARIA/apg/patterns/radio/)

| Check | Requirement | APG section |
|---|---|---|
| `role-and-name` | The element has role `radiogroup` (or `group` for native radios in a `<fieldset>`) and an accessible name. | [Roles](https://www.w3.org/WAI/ARIA/apg/patterns/radio/#roles_states_properties) |
| `radios` | The group contains at least two elements with role `radio`. | [Roles](https://www.w3.org/WAI/ARIA/apg/patterns/radio/#roles_states_properties) |
| `checked-state` | Each radio exposes its checked state (native `checked` or `aria-checked`), and at most one is checked. | [Roles](https://www.w3.org/WAI/ARIA/apg/patterns/radio/#roles_states_properties) |
| `space-checks` | Space checks the focused radio. | [Keyboard](https://www.w3.org/WAI/ARIA/apg/patterns/radio/#keyboard_interaction) |
| `arrow-keys` | Arrow keys move focus to the next or previous enabled radio, check it, and wrap at the ends. | [Keyboard](https://www.w3.org/WAI/ARIA/apg/patterns/radio/#keyboard_interaction) |
| `single-tab-stop` | The group is a single tab stop: Tab leaves the group, and moving back in focuses the checked radio. | [Keyboard](https://www.w3.org/WAI/ARIA/apg/patterns/radio/#keyboard_interaction) |

### `toBeSpinbutton`: [Spinbutton](https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/)

| Check | Requirement | APG section |
|---|---|---|
| `role-and-name` | The element has role `spinbutton` and an accessible name. | [Roles](https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/#roles_states_properties) |
| `value-state` | The current value is exposed (`aria-valuenow`, or the value of a native number input), with its minimum and maximum. | [Roles](https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/#roles_states_properties) |
| `arrow-keys` | Up Arrow increases and Down Arrow decreases the value, while focus stays on the spinbutton. | [Keyboard](https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/#keyboard_interaction) |
| `bounds` | The value never goes above the maximum or below the minimum. | [Keyboard](https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/#keyboard_interaction) |
| `home-end` | Home sets the value to the minimum and End sets it to the maximum. | [Keyboard](https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/#keyboard_interaction) |
<!-- checklist:end -->

## Validation

| Command | What it checks |
|---|---|
| `pnpm test` | HTML fixtures in `test/fixtures/`: one conforming implementation per pattern must pass. Variants that break one behaviour (`?break=…`) must fail exactly the matching check. |
| `pnpm test:live` | The W3C's own APG examples must pass: modal dialog, select-only combobox, automatic and manual tabs, radio group, and date-picker spinbuttons. The APG has no tooltip example. Needs network access. |
| `pnpm test:calibration` | The mini-experiment calibration components in the stride app (`../mini-experiment/eval/calibration/`). Their known results are recorded in `test/calibration.spec.ts`. |

## Scope and limitations

- **Patterns covered:** six APG patterns, the ones on the mini-experiment product page. The full project extends this to every APG pattern.
- **Combobox:** `toBeCombobox` covers the select-only combobox. Editable comboboxes with autocomplete aren't covered yet.
- **Tabs:** Home and End are optional in the APG Tabs pattern and aren't checked.
- **Spinbutton:** Home and End are checked. A native `<input type="number">` doesn't support them, so it fails `home-end`.
- **Radio groups:** with no radio checked, browsers differ on which radio Shift+Tab focuses. The APG notes this too, so either is accepted.
- **Accessible names** come from Playwright's own computation (`toHaveAccessibleName`). What a screen reader actually announces isn't tested.
