import type { CheckDefinition, SpecDefinition } from "./types";

const APG = "https://www.w3.org/WAI/ARIA/apg/patterns";
const ROLES = "#roles_states_properties";
const KEYBOARD = "#keyboard_interaction";

type Check = Omit<CheckDefinition, "url"> & { section?: "roles" | "keyboard"; url?: string };

function pattern(id: string, name: string, matcher: string, typeName: string, path: string, checks: Check[]): SpecDefinition {
  const url = `${APG}/${path}/`;
  return {
    id,
    name: `APG ${name} pattern`,
    passPhrase: `follows the APG ${name} pattern`,
    failPhrase: `does not follow the APG ${name} pattern`,
    matcher,
    typeName,
    url,
    checks: checks.map(({ section, url: own, ...c }) => ({ ...c, url: own ?? url + (section === "keyboard" ? KEYBOARD : ROLES) })),
  };
}

export type ApgPatternId =
  | "dialog-modal" | "combobox" | "tabs" | "tooltip" | "radio" | "spinbutton"
  | "accordion" | "breadcrumb" | "carousel" | "toggle-button" | "navigation";

export const apgPatterns: Record<ApgPatternId, SpecDefinition> = {
  "dialog-modal": pattern("dialog-modal", "Modal Dialog", "toBeAPGModal", "Modal", "dialog-modal", [
    { id: "opens-with-keyboard", section: "keyboard", summary: "Pressing Enter on the focused trigger opens the dialog.", howToPass: "Make the trigger a native `<button>` with an onClick handler; Enter and Space then activate it. Avoid click handlers on `<div>` or `<span>`." },
    { id: "role-and-name", section: "roles", summary: "The dialog has role `dialog` and an accessible name (`aria-labelledby` or `aria-label`).", howToPass: "Use `<dialog>` or `role=\"dialog\"` on the dialog container, and point `aria-labelledby` at the id of its visible title." },
    { id: "modal", section: "roles", summary: "The dialog is modal: `aria-modal=\"true\"`, or a native `<dialog>` opened with `showModal()`.", howToPass: "Open a native `<dialog>` with `showModal()` (not `show()` or the `open` attribute), or put `aria-modal=\"true\"` on the `role=\"dialog\"` element." },
    { id: "focus-moves-in", section: "keyboard", summary: "When the dialog opens, focus moves to an element inside it.", howToPass: "When the dialog opens, call `.focus()` on its first interactive element (or its title with `tabindex=\"-1\"`). `showModal()` does this automatically." },
    { id: "focus-trap", section: "keyboard", summary: "Tab and Shift+Tab cycle through the tabbable elements inside the dialog without leaving it.", howToPass: "Use `showModal()`, which makes the rest of the page inert; or handle `keydown` Tab on the dialog: on the last element move focus to the first, and Shift+Tab on the first moves to the last (call `preventDefault()`)." },
    { id: "escape-closes", section: "keyboard", summary: "Escape closes the dialog.", howToPass: "Native `<dialog>` closes on Escape (listen to its `close`/`cancel` event to sync state). For a custom dialog, close it on `keydown` with `event.key === \"Escape\"`." },
    { id: "focus-returns", section: "keyboard", summary: "When the dialog closes, focus returns to the element that opened it.", howToPass: "Keep a ref to the trigger and call `triggerRef.current.focus()` after the dialog closes, whichever way it was closed (close button, Escape)." },
  ]),

  combobox: pattern("combobox", "Combobox (select-only)", "toBeAPGCombobox", "Combobox", "combobox", [
    { id: "role-and-name", section: "roles", summary: "The element has role `combobox` and an accessible name.", howToPass: "Put `role=\"combobox\"` and `tabindex=\"0\"` on the element that shows the current value, and `aria-labelledby` pointing at the visible label. A native `<select>` with a `<label for>` also passes." },
    { id: "collapsed-state", section: "roles", summary: "While the popup is closed, `aria-expanded` is `false`.", howToPass: "Always render `aria-expanded={open}` on the combobox (`\"false\"` while closed, `\"true\"` while open), never omit it." },
    { id: "opens-with-keyboard", section: "keyboard", summary: "Enter, Space and Down Arrow open the listbox without moving DOM focus, and `aria-expanded` becomes `true`.", howToPass: "Handle `keydown` on the combobox: Enter, \" \" and ArrowDown open the list (call `preventDefault()` for Space and arrows). Do not call `.focus()` on the list or the options." },
    { id: "controls-listbox", section: "roles", summary: "`aria-controls` refers to an element with role `listbox` that contains elements with role `option`.", howToPass: "Give the popup `role=\"listbox\"` and an id, set `aria-controls` on the combobox to that id, and give each item `role=\"option\"` and a unique id." },
    { id: "arrow-keys", section: "keyboard", summary: "Down Arrow and Up Arrow move the active option (`aria-activedescendant`) while DOM focus stays on the combobox.", howToPass: "Track an active index in state; ArrowDown/ArrowUp change it and set `aria-activedescendant` on the combobox to the active option's id. Style the active option visually; keep DOM focus on the combobox." },
    { id: "enter-selects", section: "keyboard", summary: "Enter sets the value to the active option, closes the listbox and keeps focus on the combobox.", howToPass: "On Enter while open: set the value to the active option, close the list (`aria-expanded=\"false\"`) and leave focus on the combobox, whose text now shows the chosen option." },
    { id: "selected-state", section: "roles", summary: "The selected option has `aria-selected=\"true\"`.", howToPass: "Render `aria-selected={option === value}` on every option, so exactly one option (the current value) has `aria-selected=\"true\"`." },
    { id: "disabled-options", section: "roles", summary: "Options that can't be picked have `aria-disabled=\"true\"` (or are a disabled native `<option>`), and Enter does not select them.", howToPass: "Render `aria-disabled=\"true\"` on unavailable options (or `<option disabled>` in a native `<select>`), and ignore Enter and clicks on them. Mention the reason in the option text, e.g. \"US 10 (sold out)\"." },
    { id: "escape-closes", section: "keyboard", summary: "Escape closes the listbox without changing the value and keeps focus on the combobox.", howToPass: "On Escape while open: close the list and discard the active option; do not change the value or move focus." },
  ]),

  tabs: pattern("tabs", "Tabs", "toBeAPGTabs", "Tabs", "tabs", [
    { id: "tablist-name", section: "roles", summary: "The element has role `tablist` and an accessible name.", howToPass: "Wrap the tabs in `<div role=\"tablist\" aria-label=\"...\">` (or `aria-labelledby` pointing at a visible heading)." },
    { id: "tabs", section: "roles", summary: "The tablist contains at least two elements with role `tab`.", howToPass: "Give each tab button `role=\"tab\"` and make them direct children of the tablist." },
    { id: "selected-state", section: "roles", summary: "Exactly one tab has `aria-selected=\"true\"`; the others have `aria-selected=\"false\"`.", howToPass: "Render `aria-selected={index === selected}` on every tab, so unselected tabs have an explicit `aria-selected=\"false\"`." },
    { id: "panels", section: "roles", summary: "Each tab's `aria-controls` refers to a `tabpanel` labelled by the tab; only the selected tab's panel is shown.", howToPass: "Give each tab an id and `aria-controls` = its panel's id; give each panel `role=\"tabpanel\"`, an id and `aria-labelledby` = its tab's id. Hide unselected panels with `hidden`." },
    { id: "single-tab-stop", section: "keyboard", summary: "Only the selected tab is in the tab sequence; Tab moves focus out of the tablist.", howToPass: "Use a roving tabindex: `tabIndex={selected ? 0 : -1}` on each tab." },
    { id: "arrow-keys", section: "keyboard", summary: "Right/Left Arrow (Down/Up for vertical tablists) move focus between tabs and wrap at the ends.", howToPass: "Handle `keydown` on the tablist: ArrowRight focuses the next tab (the first after the last), ArrowLeft the previous (the last before the first), by calling `.focus()` on the tab element." },
    { id: "activation", section: "keyboard", summary: "A focused tab is activated automatically on focus, or with Enter or Space (manual activation).", howToPass: "Select the tab when an arrow key focuses it (automatic, recommended), or select it on Enter/Space (manual). Native `<button role=\"tab\">` handles Enter/Space via onClick." },
  ]),

  tooltip: pattern("tooltip", "Tooltip", "toBeAPGTooltip", "Tooltip", "tooltip", [
    { id: "described-by", section: "roles", summary: "The trigger references an element with role `tooltip` through `aria-describedby`.", howToPass: "Render the tooltip with `role=\"tooltip\"` and an id, and set `aria-describedby` on the trigger to that id. Keep the tooltip in the DOM (toggle `hidden`) so the reference always resolves." },
    { id: "text", section: "roles", summary: "The tooltip contains the expected text.", howToPass: "Put the text directly in the `role=\"tooltip\"` element." },
    { id: "not-focusable", section: "roles", summary: "The tooltip itself never receives focus; focus stays on the trigger.", howToPass: "Do not put links, buttons or `tabindex` inside the tooltip, and never call `.focus()` on it." },
    { id: "shows-on-focus", section: "keyboard", summary: "The tooltip is shown when the trigger receives keyboard focus.", howToPass: "Make the trigger focusable (a `<button>`) and show the tooltip on its `focus` event (onFocus), not only on mouseenter." },
    { id: "escape-dismisses", section: "keyboard", summary: "Escape hides the tooltip while focus stays on the trigger.", howToPass: "Handle `keydown` Escape on the trigger (or document while shown) and hide the tooltip without moving focus." },
    { id: "hides-on-blur", section: "keyboard", summary: "The tooltip is hidden when the trigger loses focus.", howToPass: "Hide the tooltip on the trigger's `blur` event (onBlur)." },
    { id: "shows-on-hover", section: "keyboard", summary: "The tooltip is shown when the pointer is over the trigger.", howToPass: "Show the tooltip on `mouseenter` of the trigger (onMouseEnter)." },
    { id: "hoverable", section: "keyboard", summary: "The tooltip stays shown while the pointer moves from the trigger onto the tooltip (WCAG 1.4.13).", howToPass: "Attach onMouseEnter/onMouseLeave to a wrapper that contains both the trigger and the tooltip, and position the tooltip touching the trigger (no margin gap the pointer has to cross)." },
  ]),

  radio: pattern("radio", "Radio Group", "toBeAPGRadioGroup", "RadioGroup", "radio", [
    { id: "role-and-name", section: "roles", summary: "The element has role `radiogroup` (or `group` for native radios in a `<fieldset>`) and an accessible name.", howToPass: "Wrap native radios in `<fieldset>` with a `<legend>`, or use `<div role=\"radiogroup\" aria-labelledby=\"...\">`." },
    { id: "radios", section: "roles", summary: "The group contains at least two elements with role `radio`.", howToPass: "Use `<input type=\"radio\">` with a `<label>` each, or `role=\"radio\"` elements with a name (text or `aria-label`, e.g. `aria-label=\"Blue\"` on a color swatch)." },
    { id: "checked-state", section: "roles", summary: "Each radio exposes its checked state (native `checked` or `aria-checked`), and at most one is checked.", howToPass: "Native radios expose `checked` automatically. For `role=\"radio\"`, render `aria-checked={value === option}` on every radio." },
    { id: "space-checks", section: "keyboard", summary: "Space checks the focused radio.", howToPass: "Native radios do this. For `role=\"radio\"`, handle `keydown` \" \" by selecting the focused radio (call `preventDefault()`)." },
    { id: "arrow-keys", section: "keyboard", summary: "Arrow keys move focus to the next or previous enabled radio, check it, and wrap at the ends.", howToPass: "Native radios sharing a `name` do this. For `role=\"radio\"`, ArrowDown/ArrowRight select and `.focus()` the next radio (the first after the last), ArrowUp/ArrowLeft the previous." },
    { id: "single-tab-stop", section: "keyboard", summary: "The group is a single tab stop: Tab leaves the group, and moving back in focuses the checked radio.", howToPass: "Native radios sharing a `name` do this. For `role=\"radio\"`, use `tabIndex={checked ? 0 : -1}` (the first radio gets 0 when none is checked)." },
  ]),

  spinbutton: pattern("spinbutton", "Spinbutton", "toBeAPGSpinbutton", "Spinbutton", "spinbutton", [
    { id: "role-and-name", section: "roles", summary: "The element has role `spinbutton` and an accessible name.", howToPass: "Use `<input type=\"number\">` or an `<input role=\"spinbutton\">`, labelled with `<label for>` or `aria-label`." },
    { id: "value-state", section: "roles", summary: "The current value is exposed (`aria-valuenow`, or the value of a native number input), with its minimum and maximum.", howToPass: "Set `aria-valuenow`, `aria-valuemin` and `aria-valuemax` on a `role=\"spinbutton\"` element, or `value`, `min` and `max` on `<input type=\"number\">`." },
    { id: "arrow-keys", section: "keyboard", summary: "Up Arrow increases and Down Arrow decreases the value, while focus stays on the spinbutton.", howToPass: "Native number inputs do this. For `role=\"spinbutton\"`, handle ArrowUp/ArrowDown in `keydown` (call `preventDefault()`) and update `aria-valuenow`." },
    { id: "bounds", section: "keyboard", summary: "The value never goes above the maximum or below the minimum.", howToPass: "Clamp every change, from keys, the +/- buttons or typing, with `Math.min(max, Math.max(min, value))`." },
    { id: "home-end", section: "keyboard", summary: "Home sets the value to the minimum and End sets it to the maximum.", howToPass: "Handle Home and End in `keydown` (call `preventDefault()`) to set the minimum and maximum. A native `<input type=\"number\">` does not do this, so add the handler." },
    { id: "accepts-typing", section: "keyboard", summary: "Typing a number into the focused spinbutton sets the value.", howToPass: "Make the spinbutton an `<input>` (type `number`, or `text` with `role=\"spinbutton\"`) and update the value, and `aria-valuenow`, on its `input`/`change` event." },
  ]),

  accordion: pattern("accordion", "Accordion", "toBeAPGAccordion", "Accordion", "accordion", [
    { id: "header-buttons", section: "roles", summary: "Each accordion header is a `button` inside a heading.", howToPass: "Render each question as `<h3><button type=\"button\">Question</button></h3>` (any heading level that fits the outline)." },
    { id: "expanded-state", section: "roles", summary: "Each header button has `aria-expanded` matching whether its panel is shown.", howToPass: "Render `aria-expanded={open}` on each header button, `\"true\"` when its panel is shown and `\"false\"` when hidden." },
    { id: "controls-panel", section: "roles", summary: "Each header button's `aria-controls` refers to its panel.", howToPass: "Give each panel an id and set `aria-controls` on its header button to that id. Optionally give the panel `role=\"region\"` and `aria-labelledby` = the button's id." },
    { id: "toggles-with-keyboard", section: "keyboard", summary: "Enter and Space on a header button show and hide its panel.", howToPass: "Use a native `<button>` with an onClick that toggles the panel; Enter and Space then work automatically." },
    { id: "collapsed-hidden", section: "roles", summary: "Panels of collapsed headers are hidden.", howToPass: "Hide collapsed panels with the `hidden` attribute or `display: none`, not only with a zero height." },
    { id: "tab-order", section: "keyboard", summary: "Every header button is in the tab sequence.", howToPass: "Use native `<button>` elements and do not set `tabindex=\"-1\"` on them." },
  ]),

  breadcrumb: pattern("breadcrumb", "Breadcrumb", "toBeAPGBreadcrumb", "Breadcrumb", "breadcrumb", [
    { id: "landmark-and-name", section: "roles", summary: "The breadcrumb is a `navigation` landmark with an accessible name.", howToPass: "Wrap it in `<nav aria-label=\"Breadcrumb\">`." },
    { id: "ordered-list", section: "roles", summary: "The steps are items of an ordered list.", howToPass: "Put each step in an `<li>` inside an `<ol>` in the `<nav>`. Hide visual separators from assistive technology with CSS or `aria-hidden=\"true\"`." },
    { id: "earlier-steps-are-links", section: "roles", summary: "Every step before the current page is a link.", howToPass: "Render each earlier step as `<a href=\"...\">`, so the shopper can go back to it." },
    { id: "current-page", section: "roles", summary: "The last step, the current page, has `aria-current=\"page\"`.", howToPass: "Put `aria-current=\"page\"` on the last step (on its link, or its element if it is not a link)." },
  ]),

  carousel: pattern("carousel", "Carousel", "toBeAPGCarousel", "Carousel", "carousel", [
    { id: "container", section: "roles", summary: "The carousel container has `aria-roledescription=\"carousel\"` and an accessible name.", howToPass: "Use `<section aria-roledescription=\"carousel\" aria-label=\"...\">` (a `section` with a name is a region landmark)." },
    { id: "slides", section: "roles", summary: "Each slide has role `group`, `aria-roledescription=\"slide\"` and an accessible name such as \"1 of 4\".", howToPass: "Wrap each slide in `<div role=\"group\" aria-roledescription=\"slide\" aria-label=\"N of TOTAL\">`, and render every slide (hide the inactive ones) so the count is discoverable." },
    { id: "controls", section: "roles", summary: "Named Previous and Next buttons change the slide when activated with the keyboard.", howToPass: "Use native `<button>` elements with names containing \"Previous\"/\"Next\" (e.g. `aria-label=\"Next photo\"` on an icon button) inside the carousel container." },
    { id: "one-visible", section: "roles", summary: "Only the current slide is shown; the others are hidden.", howToPass: "Hide inactive slides with the `hidden` attribute or `display: none`, so they are hidden from screen readers too." },
    { id: "wraps", section: "keyboard", summary: "Next on the last slide shows the first, and Previous on the first shows the last.", howToPass: "Compute the next index with `(index + 1) % count` and the previous with `(index - 1 + count) % count`." },
    { id: "live-region", section: "roles", summary: "The element that contains the slides has `aria-live=\"polite\"` (or `\"off\"` while auto-rotating).", howToPass: "Put `aria-live=\"polite\"` on the wrapper around the slides, rendered from the start, so slide changes are announced." },
    { id: "rotation-control", section: "keyboard", summary: "An auto-rotating carousel has a button to stop and restart rotation.", howToPass: "Only for auto-rotating carousels: add a first-in-order `<button>` labelled \"Stop slide rotation\"/\"Start slide rotation\" (or with `aria-pressed`), and stop rotation while the carousel has keyboard focus or the pointer." },
  ]),

  "toggle-button": pattern("toggle-button", "Button (toggle)", "toBeAPGToggleButton", "ToggleButton", "button", [
    { id: "role-and-name", section: "roles", summary: "The element has role `button` and an accessible name.", howToPass: "Use a native `<button type=\"button\">`. Icon-only buttons need `aria-label` (e.g. \"Save to wishlist\")." },
    { id: "pressed-state", section: "roles", summary: "The button exposes its on/off state with `aria-pressed=\"true\"` or `\"false\"`.", howToPass: "Render `aria-pressed={saved}` on the button so the state is always `\"true\"` or `\"false\"`." },
    { id: "toggles-with-keyboard", section: "keyboard", summary: "Enter and Space each flip `aria-pressed`.", howToPass: "Toggle the state in the native `<button>`'s onClick; Enter and Space trigger it automatically." },
    { id: "name-stable", section: "roles", summary: "The accessible name does not change when the button is toggled.", howToPass: "Keep one label (e.g. \"Save to wishlist\") and convey the state only through `aria-pressed`; do not switch between \"Save\" and \"Unsave\"." },
    { id: "focus-stays", section: "keyboard", summary: "Focus stays on the button after toggling.", howToPass: "Do not re-mount the button or move focus when it toggles (keep the same element and a stable React key)." },
  ]),

  navigation: pattern("navigation", "Navigation landmark", "toBeAPGNavigation", "Navigation", "landmarks", [
    { id: "landmark-and-name", section: "roles", url: `${APG}/landmarks/examples/navigation.html`, summary: "The element is a `navigation` landmark, with an accessible name when the page has more than one.", howToPass: "Use `<nav aria-label=\"Main\">`. Give every `<nav>` on the page a distinct `aria-label`." },
    { id: "links", section: "roles", url: `${APG}/link/`, summary: "The navigation items are links (`<a href>`).", howToPass: "Render each destination as `<a href=\"/section\">Name</a>` inside a `<ul>`; do not use buttons or clickable `<div>`s to navigate." },
    { id: "tab-order", section: "keyboard", url: `${APG}/link/${KEYBOARD}`, summary: "Tab reaches every visible link in order.", howToPass: "Keep the links in DOM order with no positive `tabindex` and no `tabindex=\"-1\"`." },
    { id: "no-menu-roles", section: "roles", url: `${APG}/menubar/`, summary: "No `menu`, `menubar` or `menuitem` roles are used for site navigation.", howToPass: "Remove `role=\"menu\"`, `role=\"menubar\"` and `role=\"menuitem\"`; site navigation is a list of links. Use a disclosure button (`aria-expanded`) for collapsible sections." },
    { id: "current-page", section: "roles", url: `${APG}/breadcrumb/${ROLES}`, summary: "The link to the current page, if any, has `aria-current=\"page\"`.", howToPass: "Put `aria-current=\"page\"` on the link to the page being viewed, and on no other link." },
  ]),
};
