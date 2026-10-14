export type CheckSection = "roles" | "keyboard";

export interface CheckDefinition {
  id: string;
  section: CheckSection;
  summary: string;
}

export interface PatternDefinition {
  id: PatternId;
  name: string;
  matcher: string;
  url: string;
  checks: CheckDefinition[];
}

export type PatternId = "dialog-modal" | "combobox" | "tabs" | "tooltip" | "radio" | "spinbutton";

const APG = "https://www.w3.org/WAI/ARIA/apg/patterns";

export const SECTION_ANCHOR: Record<CheckSection, string> = {
  roles: "#roles_states_properties",
  keyboard: "#keyboard_interaction",
};

export const patterns: Record<PatternId, PatternDefinition> = {
  "dialog-modal": {
    id: "dialog-modal",
    name: "Modal Dialog",
    matcher: "toOpenModalDialog",
    url: `${APG}/dialog-modal/`,
    checks: [
      { id: "opens-with-keyboard", section: "keyboard", summary: "Pressing Enter on the focused trigger opens the dialog." },
      { id: "role-and-name", section: "roles", summary: "The dialog has role `dialog` and an accessible name (`aria-labelledby` or `aria-label`)." },
      { id: "modal", section: "roles", summary: "The dialog is modal: `aria-modal=\"true\"`, or a native `<dialog>` opened with `showModal()`." },
      { id: "focus-moves-in", section: "keyboard", summary: "When the dialog opens, focus moves to an element inside it." },
      { id: "tab-wraps", section: "keyboard", summary: "Tab and Shift+Tab cycle through the tabbable elements inside the dialog without leaving it." },
      { id: "escape-closes", section: "keyboard", summary: "Escape closes the dialog." },
      { id: "focus-returns", section: "keyboard", summary: "When the dialog closes, focus returns to the element that opened it." },
    ],
  },
  combobox: {
    id: "combobox",
    name: "Combobox (select-only)",
    matcher: "toBeCombobox",
    url: `${APG}/combobox/`,
    checks: [
      { id: "role-and-name", section: "roles", summary: "The element has role `combobox` and an accessible name." },
      { id: "collapsed-state", section: "roles", summary: "While the popup is closed, `aria-expanded` is `false`." },
      { id: "opens-with-keyboard", section: "keyboard", summary: "Enter, Space and Down Arrow open the listbox without moving DOM focus, and `aria-expanded` becomes `true`." },
      { id: "controls-listbox", section: "roles", summary: "`aria-controls` refers to an element with role `listbox` that contains elements with role `option`." },
      { id: "arrow-keys", section: "keyboard", summary: "Down Arrow and Up Arrow move the active option (`aria-activedescendant`) while DOM focus stays on the combobox." },
      { id: "enter-selects", section: "keyboard", summary: "Enter sets the value to the active option, closes the listbox and keeps focus on the combobox." },
      { id: "selected-state", section: "roles", summary: "The selected option has `aria-selected=\"true\"`." },
      { id: "escape-closes", section: "keyboard", summary: "Escape closes the listbox without changing the value and keeps focus on the combobox." },
    ],
  },
  tabs: {
    id: "tabs",
    name: "Tabs",
    matcher: "toBeTabs",
    url: `${APG}/tabs/`,
    checks: [
      { id: "tablist-name", section: "roles", summary: "The element has role `tablist` and an accessible name." },
      { id: "tabs", section: "roles", summary: "The tablist contains at least two elements with role `tab`." },
      { id: "selected-state", section: "roles", summary: "Exactly one tab has `aria-selected=\"true\"`; the others have `aria-selected=\"false\"`." },
      { id: "panels", section: "roles", summary: "Each tab's `aria-controls` refers to a `tabpanel` labelled by the tab; only the selected tab's panel is shown." },
      { id: "single-tab-stop", section: "keyboard", summary: "Only the selected tab is in the tab sequence; Tab moves focus out of the tablist." },
      { id: "arrow-keys", section: "keyboard", summary: "Right/Left Arrow (Down/Up for vertical tablists) move focus between tabs and wrap at the ends." },
      { id: "activation", section: "keyboard", summary: "A focused tab is activated automatically on focus, or with Enter or Space (manual activation)." },
    ],
  },
  tooltip: {
    id: "tooltip",
    name: "Tooltip",
    matcher: "toHaveTooltip",
    url: `${APG}/tooltip/`,
    checks: [
      { id: "described-by", section: "roles", summary: "The trigger references an element with role `tooltip` through `aria-describedby`." },
      { id: "text", section: "roles", summary: "The tooltip contains the expected text." },
      { id: "not-focusable", section: "roles", summary: "The tooltip itself never receives focus; focus stays on the trigger." },
      { id: "shows-on-focus", section: "keyboard", summary: "The tooltip is shown when the trigger receives keyboard focus." },
      { id: "escape-dismisses", section: "keyboard", summary: "Escape hides the tooltip while focus stays on the trigger." },
      { id: "hides-on-blur", section: "keyboard", summary: "The tooltip is hidden when the trigger loses focus." },
      { id: "shows-on-hover", section: "keyboard", summary: "The tooltip is shown when the pointer is over the trigger." },
      { id: "hoverable", section: "keyboard", summary: "The tooltip stays shown while the pointer moves from the trigger onto the tooltip (WCAG 1.4.13)." },
    ],
  },
  radio: {
    id: "radio",
    name: "Radio Group",
    matcher: "toBeRadioGroup",
    url: `${APG}/radio/`,
    checks: [
      { id: "role-and-name", section: "roles", summary: "The element has role `radiogroup` (or `group` for native radios in a `<fieldset>`) and an accessible name." },
      { id: "radios", section: "roles", summary: "The group contains at least two elements with role `radio`." },
      { id: "checked-state", section: "roles", summary: "Each radio exposes its checked state (native `checked` or `aria-checked`), and at most one is checked." },
      { id: "space-checks", section: "keyboard", summary: "Space checks the focused radio." },
      { id: "arrow-keys", section: "keyboard", summary: "Arrow keys move focus to the next or previous enabled radio, check it, and wrap at the ends." },
      { id: "single-tab-stop", section: "keyboard", summary: "The group is a single tab stop: Tab leaves the group, and moving back in focuses the checked radio." },
    ],
  },
  spinbutton: {
    id: "spinbutton",
    name: "Spinbutton",
    matcher: "toBeSpinbutton",
    url: `${APG}/spinbutton/`,
    checks: [
      { id: "role-and-name", section: "roles", summary: "The element has role `spinbutton` and an accessible name." },
      { id: "value-state", section: "roles", summary: "The current value is exposed (`aria-valuenow`, or the value of a native number input), with its minimum and maximum." },
      { id: "arrow-keys", section: "keyboard", summary: "Up Arrow increases and Down Arrow decreases the value, while focus stays on the spinbutton." },
      { id: "bounds", section: "keyboard", summary: "The value never goes above the maximum or below the minimum." },
      { id: "home-end", section: "keyboard", summary: "Home sets the value to the minimum and End sets it to the maximum." },
    ],
  },
};

export function checkUrl(pattern: PatternDefinition, check: CheckDefinition): string {
  return pattern.url + SECTION_ANCHOR[check.section];
}
