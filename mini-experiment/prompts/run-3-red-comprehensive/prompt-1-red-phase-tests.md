You are working in a Next.js (App Router) + React + Tailwind CSS storefront repository. The feature to build is described in `REQUIREMENTS.md` at the repository root.

We are building this feature with Test-Driven Development (TDD). TDD works in cycles of three phases: **Red** (write tests that describe the desired behavior; they fail because the feature is not built yet), **Green** (write the implementation that makes those tests pass) and **Refactor** (clean up while keeping the tests green).

**You are in the Red phase.** Your job is to write the tests. The implementation will be written afterwards, in the Green phase, using your tests as its specification, so the tests need to capture every expected behavior.

Task:
1. Read `REQUIREMENTS.md`.
2. Write Playwright end-to-end tests in `tests/product.spec.ts` that cover every requirement in `REQUIREMENTS.md`. Tests run against `/product` (base URL `http://localhost:4001`; `playwright.config.ts` starts the dev server).

   Use `playwright-apg` in the tests.

   Make every component follow its WAI-ARIA Authoring Practices Guide (APG) pattern as part of this TDD phase (https://www.w3.org/WAI/ARIA/apg/patterns/). Each pattern defines the roles, states and properties to expose and the keyboard interaction to support:

   **Modal Dialog** (https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
   - Role `dialog` with `aria-modal="true"` (or a native `<dialog>` opened with `showModal()`) and an accessible name.
   - Opening it with the keyboard moves focus inside; Tab and Shift+Tab cycle within it; Escape closes it; focus returns to the element that opened it.

   **Combobox, select-only** (https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)
   - Role `combobox` with an accessible name, `aria-expanded`, and `aria-controls` pointing to a `listbox` of `option`s; the selected option has `aria-selected="true"`.
   - Enter, Space and Down Arrow open the listbox; Up and Down Arrow move the active option (`aria-activedescendant`) while focus stays on the combobox; Enter selects it and closes the listbox; Escape closes it without changing the value.

   **Tabs** (https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)
   - A named `tablist` of `tab`s; exactly one tab has `aria-selected="true"`; each tab's `aria-controls` points to a `tabpanel` labelled by the tab, and only the selected panel is shown.
   - Only the selected tab is in the Tab sequence; Left and Right Arrow move between tabs and wrap at the ends; a tab is activated on focus or with Enter or Space.

   **Tooltip** (https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/)
   - The trigger references an element with role `tooltip` through `aria-describedby`; the tooltip never receives focus.
   - It appears when the trigger is hovered or focused, hides when the trigger loses focus, Escape dismisses it, and it stays visible while the pointer moves onto it.

   **Radio Group** (https://www.w3.org/WAI/ARIA/apg/patterns/radio/)
   - A named `radiogroup` (or a `<fieldset>` with a `<legend>`) of `radio`s that expose their checked state, with at most one checked.
   - The group is a single tab stop that focuses the checked radio; Space checks the focused radio; arrow keys move to the next or previous radio, check it, and wrap at the ends.

   **Spinbutton** (https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/)
   - Role `spinbutton` with an accessible name, exposing its current value, minimum and maximum.
   - Up and Down Arrow increase and decrease the value within the bounds; Home sets the minimum and End sets the maximum.

3. Keep all of your changes inside `tests/`, use only the dependencies already installed, and leave `components/ProductQuickView.tsx` as the existing stub for the Green phase.
4. Run `pnpm exec playwright test` and confirm the tests fail because the feature is missing, which is the expected Red result, rather than because of syntax or configuration errors.
