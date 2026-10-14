You are working in a Next.js (App Router) + React + Tailwind CSS storefront repository. The feature to build is described in `REQUIREMENTS.md` at the repository root.

We are building this feature with Test-Driven Development (TDD). TDD works in cycles of three phases: **Red** (write tests that describe the desired behavior; they fail because the feature is not built yet), **Green** (write the implementation that makes those tests pass) and **Refactor** (clean up while keeping the tests green).

**You are in the Red phase.** Your job is to write the tests. The implementation will be written afterwards, in the Green phase, using your tests as its specification, so the tests need to capture every expected behavior.

Task:
1. Read `REQUIREMENTS.md`.
2. Write Playwright end-to-end tests in `tests/product.spec.ts` that cover every requirement in `REQUIREMENTS.md`. Tests run against `/product` (base URL `http://localhost:4001`; `playwright.config.ts` starts the dev server).

   Write the tests against the page's accessibility tree: locate elements by role and accessible name, and assert the structure and state of each part of the page with Playwright's `toMatchAriaSnapshot`, for example:

   ```ts
   await expect(page.getByRole("form", { name: "Newsletter" })).toMatchAriaSnapshot(`
     - form "Newsletter":
       - textbox "Email"
       - checkbox "Send me weekly deals" [checked=false]
       - button "Subscribe"
   `);
   ```

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
   - Modal dialogs use `<dialog>` or `role="dialog"` with `aria-modal="true"` and an accessible name. When a dialog opens, focus moves into it, stays inside it while it is open, Escape closes it, and focus returns to the element that opened it.
   - Content that appears on hover, such as tooltips, also appears on keyboard focus, can be dismissed with Escape, and stays visible while the pointer is over it.

   **State, errors and dynamic content**
   - Expose the current state of controls programmatically (`checked`, `disabled`, `aria-pressed`, `aria-expanded`, `aria-selected`, `aria-current`).
   - Identify errors in text, associate the message with its field or group (`aria-describedby`, `aria-invalid="true"`), and move focus to where the user can fix the problem.
   - Announce status messages (confirmations, counts, results) through a live region (`role="status"` or `aria-live="polite"`) that is already present in the DOM before the message is inserted.

   **Visual presentation**
   - Text contrast is at least 4.5:1 (3:1 for large text). UI component boundaries and focus indicators are at least 3:1 against adjacent colors.
   - Convey information with more than color alone, for example text, icons, shape or pattern alongside color.
   - Interactive targets are at least 24×24 CSS pixels.
   - Content stays usable when text is zoomed to 200% and at a 320px-wide viewport.

3. Keep all of your changes inside `tests/`, use only the dependencies already installed, and leave `components/ProductQuickView.tsx` as the existing stub for the Green phase.
4. Run `pnpm exec playwright test` and confirm the tests fail because the feature is missing, which is the expected Red result, rather than because of syntax or configuration errors.
