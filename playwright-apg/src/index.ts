import { expect as baseExpect, type ExpectMatcherState, type Locator, type MatcherReturnType } from "@playwright/test";
import { checkCombobox, type ComboboxOptions } from "./matchers/combobox";
import { checkModalDialog, type ModalDialogOptions } from "./matchers/dialog";
import { checkRadioGroup, type RadioGroupOptions } from "./matchers/radio";
import { checkSpinbutton, type SpinbuttonOptions } from "./matchers/spinbutton";
import { checkTabs, type TabsOptions } from "./matchers/tabs";
import { checkTooltip } from "./matchers/tooltip";
import type { PatternRun } from "./runner";

export type { ComboboxOptions, ModalDialogOptions, RadioGroupOptions, SpinbuttonOptions, TabsOptions };
export type { CheckResult, CheckStatus } from "./runner";
export { patterns, type PatternDefinition, type PatternId, type CheckDefinition } from "./patterns";
export { checkCombobox, checkModalDialog, checkRadioGroup, checkSpinbutton, checkTabs, checkTooltip };

async function assertPattern(state: ExpectMatcherState, name: string, locator: Locator, run: () => Promise<PatternRun>): Promise<MatcherReturnType> {
  if (state.isNot) throw new Error(`expect(...).not.${name}() is not supported: an APG pattern has many checks, so "not following it" has no single meaning.`);
  const result = await run();
  const pass = result.passed;
  return {
    name,
    pass,
    message: () => `${state.utils.matcherHint(name, undefined, undefined, { isNot: state.isNot })}\n\n${result.message(`Locator ${locator}`)}`,
  };
}

export const expect = baseExpect.extend({
  /**
   * Asserts that activating the locator (the trigger) opens a modal dialog that follows the
   * WAI-ARIA APG Modal Dialog pattern: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
   *
   * Checks:
   * - `opens-with-keyboard`: Enter on the focused trigger opens the dialog.
   * - `role-and-name`: role `dialog` with an accessible name (`aria-labelledby` or `aria-label`).
   * - `modal`: `aria-modal="true"`, or a native `<dialog>` opened with `showModal()`.
   * - `focus-moves-in`: focus moves inside the dialog when it opens.
   * - `tab-wraps`: Tab and Shift+Tab cycle inside the dialog and never leave it.
   * - `escape-closes`: Escape closes the dialog.
   * - `focus-returns`: focus returns to the trigger when the dialog closes.
   *
   * Leaves the dialog closed.
   *
   * @example
   * await expect(page.getByRole("button", { name: "Size guide" })).toOpenModalDialog({ name: "Size guide" });
   */
  async toOpenModalDialog(this: ExpectMatcherState, trigger: Locator, options?: ModalDialogOptions) {
    return assertPattern(this, "toOpenModalDialog", trigger, () => checkModalDialog(trigger, options));
  },

  /**
   * Asserts that the locator is a select-only combobox that follows the WAI-ARIA APG Combobox
   * pattern: https://www.w3.org/WAI/ARIA/apg/patterns/combobox/
   *
   * Checks:
   * - `role-and-name`: role `combobox` with an accessible name.
   * - `collapsed-state`: `aria-expanded="false"` while closed.
   * - `opens-with-keyboard`: Enter, Space and Down Arrow open the listbox; DOM focus stays on the combobox.
   * - `controls-listbox`: `aria-controls` refers to a `listbox` of `option`s (matching `options.options`).
   * - `arrow-keys`: Down/Up Arrow move `aria-activedescendant` between options; DOM focus stays on the combobox.
   * - `enter-selects`: Enter sets the value to the active option, closes the listbox, keeps focus.
   * - `selected-state`: the selected option has `aria-selected="true"`.
   * - `escape-closes`: Escape closes the listbox without changing the value.
   *
   * A native `<select>` passes the keyboard checks, since the browser provides them.
   * Leaves the combobox closed with its original value.
   *
   * @example
   * await expect(page.getByRole("combobox", { name: "Color" })).toBeCombobox({ options: ["Blue", "Black", "Grey"] });
   */
  async toBeCombobox(this: ExpectMatcherState, combobox: Locator, options?: ComboboxOptions) {
    return assertPattern(this, "toBeCombobox", combobox, () => checkCombobox(combobox, options));
  },

  /**
   * Asserts that the locator is a tablist that follows the WAI-ARIA APG Tabs pattern:
   * https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
   *
   * Checks:
   * - `tablist-name`: role `tablist` with an accessible name.
   * - `tabs`: at least two `tab`s (matching `options.tabs`).
   * - `selected-state`: exactly one tab has `aria-selected="true"`, the others `"false"`.
   * - `panels`: each tab's `aria-controls` refers to a `tabpanel` labelled by the tab; only the selected panel is shown.
   * - `single-tab-stop`: only the selected tab is tabbable; Tab leaves the tablist.
   * - `arrow-keys`: Right/Left Arrow (Down/Up when `aria-orientation="vertical"`) move focus and wrap.
   * - `activation`: tabs activate on focus (`"automatic"`) or with Enter/Space (`"manual"`).
   *
   * Leaves the originally selected tab selected.
   *
   * @example
   * await expect(page.getByRole("tablist", { name: "Product information" })).toBeTabs({ tabs: ["Details", "Reviews", "Shipping"] });
   */
  async toBeTabs(this: ExpectMatcherState, tablist: Locator, options?: TabsOptions) {
    return assertPattern(this, "toBeTabs", tablist, () => checkTabs(tablist, options));
  },

  /**
   * Asserts that the locator (the trigger) has a tooltip that follows the WAI-ARIA APG Tooltip
   * pattern and WCAG 1.4.13 Content on Hover or Focus: https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/
   *
   * Checks:
   * - `described-by`: the trigger's `aria-describedby` refers to an element with role `tooltip`.
   * - `text`: the tooltip contains `text`.
   * - `not-focusable`: the tooltip never receives focus.
   * - `shows-on-focus`: shown when the trigger is focused.
   * - `escape-dismisses`: Escape hides it while focus stays on the trigger.
   * - `hides-on-blur`: hidden when the trigger loses focus.
   * - `shows-on-hover`: shown when the pointer is over the trigger.
   * - `hoverable`: stays shown while the pointer moves onto the tooltip.
   *
   * Leaves the tooltip hidden.
   *
   * @example
   * await expect(page.getByRole("button", { name: "Price information" })).toHaveTooltip("Price includes taxes");
   */
  async toHaveTooltip(this: ExpectMatcherState, trigger: Locator, text?: string | RegExp) {
    return assertPattern(this, "toHaveTooltip", trigger, () => checkTooltip(trigger, text));
  },

  /**
   * Asserts that the locator is a radio group that follows the WAI-ARIA APG Radio Group pattern:
   * https://www.w3.org/WAI/ARIA/apg/patterns/radio/
   *
   * Checks:
   * - `role-and-name`: role `radiogroup` (or a `<fieldset>` group of native radios) with an accessible name.
   * - `radios`: at least two `radio`s (matching `options.radios`).
   * - `checked-state`: each radio exposes its checked state; at most one is checked.
   * - `space-checks`: Space checks the focused radio.
   * - `arrow-keys`: arrow keys move focus to the next/previous enabled radio, check it, and wrap.
   * - `single-tab-stop`: the group is one tab stop; moving back in focuses the checked radio.
   *
   * Restores the originally checked radio. If none was checked, one radio stays checked,
   * because a checked radio cannot be unchecked with the keyboard.
   *
   * @example
   * await expect(page.getByRole("radiogroup", { name: "Size" })).toBeRadioGroup();
   */
  async toBeRadioGroup(this: ExpectMatcherState, group: Locator, options?: RadioGroupOptions) {
    return assertPattern(this, "toBeRadioGroup", group, () => checkRadioGroup(group, options));
  },

  /**
   * Asserts that the locator is a spinbutton that follows the WAI-ARIA APG Spinbutton pattern:
   * https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/
   *
   * Checks:
   * - `role-and-name`: role `spinbutton` with an accessible name.
   * - `value-state`: the value is exposed (`aria-valuenow` or a native number input) with its min and max.
   * - `arrow-keys`: Up/Down Arrow increase/decrease the value; focus stays on the spinbutton.
   * - `bounds`: the value stays within the minimum and maximum.
   * - `home-end`: Home sets the minimum, End sets the maximum.
   *
   * Leaves the original value.
   *
   * @example
   * await expect(page.getByRole("spinbutton", { name: "Quantity" })).toBeSpinbutton({ min: 1, max: 5 });
   */
  async toBeSpinbutton(this: ExpectMatcherState, spinbutton: Locator, options?: SpinbuttonOptions) {
    return assertPattern(this, "toBeSpinbutton", spinbutton, () => checkSpinbutton(spinbutton, options));
  },
});
