import type { CheckDefinition, SpecDefinition } from "./types";

const UNDERSTANDING = "https://www.w3.org/WAI/WCAG22/Understanding";

export interface CriterionDefinition extends CheckDefinition {
  /** WCAG success criteria covered, e.g. ["1.4.3"]. */
  sc: string[];
  /** axe-core rules run for this criterion. */
  axe: string[];
  /** Runtime checks this package adds on top of axe. */
  own?: string;
  /** Only meaningful for a whole page, not for a Locator. */
  pageOnly?: boolean;
}

function criterion(id: string, sc: string[], slug: string, summary: string, howToPass: string, axe: string[], extra: Partial<CriterionDefinition> = {}): CriterionDefinition {
  return { id, sc, summary, howToPass, url: `${UNDERSTANDING}/${slug}`, axe, ...extra };
}

export const wcagCriteria: CriterionDefinition[] = [
  criterion("text-alternatives", ["1.1.1"], "non-text-content",
    "Images and other non-text content have a text alternative.",
    "Give every informative `<img>` an `alt` describing it (e.g. `alt=\"Trail Runner 2, blue, side view\"`), decorative images `alt=\"\"`, and icon-only SVGs `role=\"img\"` with `aria-label` (or `aria-hidden=\"true\"` when a text label is next to them).",
    ["image-alt", "input-image-alt", "role-img-alt", "svg-img-alt", "area-alt", "object-alt", "aria-meter-name", "aria-progressbar-name"]),
  criterion("structure", ["1.3.1"], "info-and-relationships",
    "Lists, tables and ARIA parent/child roles are marked up so their structure is exposed.",
    "Put `<li>` only inside `<ul>`/`<ol>`, use `<table>` with `<th>` for tabular data, and keep required ARIA ownership: `option` inside `listbox`, `tab` inside `tablist`, `menuitem` inside `menu`.",
    ["list", "listitem", "definition-list", "dlitem", "aria-required-children", "aria-required-parent", "td-headers-attr", "th-has-data-cells", "aria-hidden-body"]),
  criterion("use-of-color", ["1.4.1"], "use-of-color",
    "Color is not the only way to tell links or states apart.",
    "Underline links inside text (`text-decoration: underline`), and pair color states with text or an icon, e.g. a color swatch also has a name and a visible selected border.",
    ["link-in-text-block"]),
  criterion("color-contrast", ["1.4.3"], "contrast-minimum",
    "Text has a contrast ratio of at least 4.5:1 with its background (3:1 for large text).",
    "Use dark text on light backgrounds: e.g. `#595959` or darker on white passes 4.5:1, `#767676` is the lightest gray that passes. Check placeholder, disabled-looking and sale/price text too.",
    ["color-contrast"]),
  criterion("resize-text", ["1.4.4"], "resize-text",
    "The page can be zoomed to 200%: the viewport does not disable scaling.",
    "Use `<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">` without `maximum-scale` or `user-scalable=no`.",
    ["meta-viewport"], { pageOnly: true }),
  criterion("reflow", ["1.4.10"], "reflow",
    "At a width of 320 CSS pixels the content fits without horizontal scrolling.",
    "Use fluid layouts: `max-width: 100%` on images, flex/grid with `flex-wrap: wrap` or media queries that stack columns below ~600px, and no fixed widths wider than 320px.",
    [], { own: "Sets the viewport to 320×256 and checks that the document does not scroll horizontally.", pageOnly: true }),
  criterion("text-spacing", ["1.4.12"], "text-spacing",
    "No text is clipped when line height, letter, word and paragraph spacing are increased.",
    "Avoid fixed heights with `overflow: hidden` on text containers; use `min-height` and let boxes grow. Do not set spacing with inline `style` and `!important`.",
    ["avoid-inline-spacing"], { own: "Applies the WCAG text-spacing values and reports text containers that start clipping their content." }),
  criterion("keyboard", ["2.1.1"], "keyboard",
    "Everything that can be clicked can also be reached and used with the keyboard.",
    "Use `<button>` for actions and `<a href>` for navigation instead of `onClick` on `<div>`, `<span>`, `<img>` or `<li>`. Custom widgets need `tabindex=\"0\"` and key handlers.",
    ["scrollable-region-focusable", "frame-focusable-content", "server-side-image-map"], { own: "Finds elements that look clickable (pointer cursor, or an interactive role) but cannot receive focus." }),
  criterion("no-keyboard-trap", ["2.1.2"], "no-keyboard-trap",
    "Tabbing through the page never gets stuck: focus can always move on.",
    "Only trap focus inside an open modal dialog, and let Escape or a close button release it. Do not call `preventDefault()` on Tab elsewhere.",
    [], { own: "Presses Tab from the top of the page and checks that focus reaches the end of the page.", pageOnly: true }),
  criterion("landmarks", ["1.3.1", "2.4.1"], "bypass-blocks",
    "The page has banner, navigation, main and contentinfo landmarks, and all content is inside a landmark.",
    "Structure the page as `<header>` (store name, cart, menu `<nav>`), `<main>` (the product), and `<footer>` (help, company and social links), with no content outside them. Use one `<main>`.",
    ["region", "landmark-one-main", "bypass", "landmark-unique", "landmark-no-duplicate-banner", "landmark-no-duplicate-contentinfo", "landmark-no-duplicate-main", "landmark-banner-is-top-level", "landmark-contentinfo-is-top-level", "landmark-main-is-top-level"],
    { own: "Checks that banner, navigation, main and contentinfo landmarks exist (page only)." }),
  criterion("page-title", ["2.4.2"], "page-titled",
    "The page has a descriptive `<title>`.",
    "Set `document.title` (or `<title>`) to describe the page, e.g. \"Trail Runner 2 | Stride\".",
    ["document-title"], { pageOnly: true }),
  criterion("focus-order", ["2.4.3"], "focus-order",
    "Focus moves in a meaningful order and never lands on hidden elements.",
    "Do not use positive `tabindex`; keep the DOM order equal to the visual order; hide closed menus, panels and dialogs with `hidden`/`display: none` (or `inert`) so their controls are not focusable.",
    ["tabindex", "aria-hidden-focus"], { own: "While tabbing through the page, reports focused elements that are not visible." }),
  criterion("link-purpose", ["2.4.4"], "link-purpose-in-context",
    "Every link has a name that says where it goes.",
    "Give links text content, or `aria-label` for icon links (e.g. `aria-label=\"Stride on Instagram\"`). Avoid empty links and \"click here\".",
    ["link-name"]),
  criterion("headings", ["1.3.1", "2.4.6"], "headings-and-labels",
    "The page has one `h1`, heading levels do not skip, and no heading is empty.",
    "Use one `<h1>` for the product name, `<h2>` for page sections (e.g. More information, Questions), `<h3>` inside them; never jump from `h1` to `h3`.",
    ["page-has-heading-one", "heading-order", "empty-heading"], { own: "Checks that there is exactly one `h1` (page only)." }),
  criterion("focus-visible", ["2.4.7"], "focus-visible",
    "Every element shows a visible focus indicator when it receives keyboard focus.",
    "Do not remove outlines (`outline: none`) without a replacement. Add `:focus-visible { outline: 2px solid #1a56db; outline-offset: 2px; }` for all interactive elements, including custom widgets.",
    [], { own: "Tabs through the page and compares each element's outline, box-shadow, border and background with and without focus." }),
  criterion("focus-not-obscured", ["2.4.11"], "focus-not-obscured-minimum",
    "A focused element is not entirely hidden by other content, such as a sticky header.",
    "Add `scroll-padding-top` equal to the sticky header height on `html`, and keep overlays from covering the focused element.",
    [], { own: "Tabs through the page and checks that each focused element is at least partly visible on screen." }),
  criterion("target-size", ["2.5.8"], "target-size-minimum",
    "Pointer targets are at least 24×24 CSS pixels, or have enough space around them.",
    "Give buttons, links and swatches at least `min-width: 24px; min-height: 24px` (44px is better), or padding that makes the clickable area that large.",
    ["target-size"]),
  criterion("language", ["3.1.1", "3.1.2"], "language-of-page",
    "The page declares its language.",
    "Set `<html lang=\"en\">` in `index.html`.",
    ["html-has-lang", "html-lang-valid", "html-xml-lang-mismatch", "valid-lang"], { pageOnly: true }),
  criterion("labels", ["1.3.1", "3.3.2"], "labels-or-instructions",
    "Every form field has a label.",
    "Associate a visible `<label for=\"id\">` with each `<input>`, `<select>` and `<textarea>` (or wrap the field in the label). Use `autocomplete` values that are valid.",
    ["label", "select-name", "form-field-multiple-labels", "autocomplete-valid"]),
  criterion("name-role-value", ["4.1.2"], "name-role-value",
    "Interactive elements have an accessible name and valid roles, states and properties.",
    "Give icon buttons an `aria-label`, use valid ARIA roles and attributes only, keep ids unique, and do not nest interactive elements (no `<button>` inside `<a>`).",
    ["button-name", "input-button-name", "summary-name", "aria-allowed-attr", "aria-valid-attr", "aria-valid-attr-value", "aria-roles", "aria-required-attr", "aria-prohibited-attr", "aria-conditional-attr", "aria-deprecated-role", "aria-command-name", "aria-input-field-name", "aria-toggle-field-name", "aria-tooltip-name", "aria-tab-name", "aria-roledescription", "aria-braille-equivalent", "nested-interactive", "duplicate-id-aria", "frame-title", "frame-title-unique"]),
];

export const wcagSpec: SpecDefinition = {
  id: "wcag22-aa",
  name: "WCAG 2.2 AA",
  passPhrase: "meets WCAG 2.2 AA",
  failPhrase: "does not meet WCAG 2.2 AA",
  matcher: "toBeWCAGCompliant",
  typeName: "WCAG",
  url: "https://www.w3.org/TR/WCAG22/",
  checks: wcagCriteria,
};

export const statusSpec: SpecDefinition = {
  id: "status-message",
  name: "WCAG 4.1.3 Status Messages",
  passPhrase: "announces its status message (WCAG 4.1.3)",
  failPhrase: "does not announce its status message (WCAG 4.1.3)",
  matcher: "toAnnounceStatus",
  typeName: "Status",
  url: `${UNDERSTANDING}/status-messages`,
  checks: [
    { id: "activates-with-keyboard", summary: "Pressing Enter on the focused trigger shows the message.", howToPass: "Make the trigger a native `<button>`; its onClick runs for Enter and Space.", url: `${UNDERSTANDING}/keyboard` },
    { id: "live-region", summary: "The message is inside a live region: `role=\"status\"`, `role=\"alert\"`, `aria-live`, or `<output>`.", howToPass: "Render the message inside `<p role=\"status\">` (polite, for confirmations such as \"Added to cart\") or `role=\"alert\"` (for errors).", url: `${UNDERSTANDING}/status-messages` },
    { id: "region-present-before", summary: "The `role=\"status\"`/`aria-live` container already existed before the action, so screen readers announce the change.", howToPass: "Render the live region empty from the first render and only change its text: `<p role=\"status\">{message}</p>`, not `{message && <p role=\"status\">…</p>}`. (`role=\"alert\"` may be inserted on demand.)", url: "https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA22" },
    { id: "focus-kept", summary: "Focus is not lost (dropped to `<body>`) after the action.", howToPass: "Do not unmount or disable the focused trigger after the action; leave focus where it was, or move it to a meaningful element.", url: `${UNDERSTANDING}/focus-order` },
    { id: "error-linked", summary: "With `field`: the field gets `aria-invalid=\"true\"` and `aria-describedby` pointing at the message (WCAG 3.3.1).", howToPass: "When validation fails, render `aria-invalid=\"true\"` and `aria-describedby=\"<message id>\"` on the field, and give the message element that id.", url: `${UNDERSTANDING}/error-identification` },
  ],
};
