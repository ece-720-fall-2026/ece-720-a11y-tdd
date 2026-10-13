You are working in a Next.js (App Router) + React + Tailwind CSS storefront repository. The feature to build is described in `REQUIREMENTS.md` at the repository root. Read it, `README.md` and `AGENTS.md` first.

We are doing test-driven development. This is the **red phase**: write the tests only.

Task:
1. Write Playwright end-to-end tests in `tests/product.spec.ts` that specify every requirement in `REQUIREMENTS.md`. Tests run against `/product` (base URL `http://localhost:4001`; `playwright.config.ts` starts the dev server).

   The tests must also specify and verify the following accessibility requirements, so that an implementation can only pass if it meets them:

   The widget must conform to the Web Content Accessibility Guidelines (WCAG) 2.2 Level AA. In particular:

   **Page structure**
   - The store header is a `<header>` landmark and the product area is inside `<main>`.
   - The product name is the page's single `<h1>`. Do not skip heading levels.
   - The tab order follows the visual order. Do not use a positive `tabindex`.

   **Image gallery**
   - The main image has an `alt` that describes the product and the current view, for example "Trail Runner 2, side view". It updates when the image changes.
   - Every thumbnail is a native `<button>` with an accessible name such as "Show side view". Thumbnail images are decorative (`alt=""`) because the button carries the name.
   - The selected thumbnail has `aria-pressed="true"` (all others `"false"`). It must not be shown by border color alone.

   **Size picker**
   - Use a `<fieldset>` with a `<legend>` "Size" that contains native `<input type="radio">` elements with visible `<label>`s. The chips can be styled labels, but the radios must stay in the accessibility tree and keyboard focusable (visually hidden, not `display:none`).
   - Arrow keys move between sizes, as native radio groups do.
   - Size 11 is `disabled`, and its accessible name includes "out of stock", for example "11, out of stock".

   **Quantity stepper**
   - The numeric field is an `<input type="number" min="1" max="5">` with a visible `<label>` "Quantity".
   - The − and + buttons are native `<button>`s with the accessible names "Decrease quantity" and "Increase quantity". They are `disabled` at 1 and 5 respectively.

   **Add to cart, error and confirmation**
   - "Add to cart" is a native `<button type="button">`.
   - When no size is selected, the "Please select a size" message is linked to the size group with `aria-describedby`, the group gets `aria-invalid="true"`, and keyboard focus moves to the first available size radio.
   - The confirmation message is rendered inside an element with `role="status"` (`aria-live="polite"`). That element is present in the DOM from the first render, even when empty, so screen readers announce the message when it is inserted.
   - The cart button or link has an accessible name that includes the count, for example "Cart, 2 items". The badge number by itself is hidden from the accessibility tree.

   **Wishlist**
   - The heart is a native `<button>` with `aria-label="Save to wishlist"` and `aria-pressed` reflecting the saved state. The SVG icon is `aria-hidden="true"`.

   **Visual**
   - Every focusable element has a clearly visible focus indicator (for example, a 2px outline with an offset) with at least 3:1 contrast against the background.
   - Normal text has at least 4.5:1 contrast. This includes the red error text, the price, the description, and the out-of-stock chip label.
   - Interactive targets are at least 24×24 CSS pixels (WCAG 2.5.8).
   - Do not rely on color alone to convey state (selected size, selected thumbnail, saved wishlist, error).

2. Do **not** implement the feature. Do not create or modify anything outside `tests/`, and do not add new dependencies.
3. Run `pnpm exec playwright test` and confirm the tests fail because the feature is not implemented yet (not because of syntax or configuration errors).

When you finish, briefly list the test cases you wrote.
