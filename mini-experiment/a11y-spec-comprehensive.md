Apply web accessibility (a11y) as part of this TDD phase, following the Web Content Accessibility Guidelines (WCAG) 2.2 Level AA:

**Semantics and structure**
- Use native HTML elements for their purpose: `<button>` for actions, `<a>` for navigation, `<input>`/`<select>`/`<textarea>` for data entry, `<fieldset>` + `<legend>` for groups of related controls.
- Mark up the page with landmarks (`<header>`, `<nav>`, `<main>`, `<footer>`) and a logical heading hierarchy that starts with one `<h1>`.
- Prefer native semantics over ARIA. When ARIA is needed, use valid roles, states and properties that match the element's behavior.

**Names, labels and text alternatives**
- Give every interactive element an accessible name. Icon-only controls get an `aria-label`.
- Give every form field a visible, programmatically associated `<label>`.
- Give informative images a meaningful `alt`; give decorative images `alt=""` and decorative SVG icons `aria-hidden="true"`.

**Keyboard**
- Make every function operable with the keyboard alone, in a focus order that matches the visual order.
- Show a clearly visible focus indicator on every focusable element.
- Composite widgets (radio groups, tabs, menus, listboxes) follow the WAI-ARIA Authoring Practices keyboard patterns, such as arrow keys to move within the group.
- Use `tabindex` only with the values `0` and `-1`.

**State, errors and dynamic content**
- Expose the current state of controls programmatically (`checked`, `disabled`, `aria-pressed`, `aria-expanded`, `aria-selected`, `aria-current`).
- Identify errors in text, associate the message with its field or group (`aria-describedby`, `aria-invalid="true"`), and move focus to where the user can fix the problem.
- Announce status messages (confirmations, counts, results) through a live region (`role="status"` or `aria-live="polite"`) that is already present in the DOM before the message is inserted.

**Visual presentation**
- Text contrast is at least 4.5:1 (3:1 for large text). UI component boundaries and focus indicators are at least 3:1 against adjacent colors.
- Convey information with more than color alone, for example text, icons, shape or pattern alongside color.
- Interactive targets are at least 24×24 CSS pixels.
- Content stays usable when text is zoomed to 200% and at a 320px-wide viewport.
