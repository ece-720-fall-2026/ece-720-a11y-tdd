You are working in a Next.js (App Router) + React + Tailwind CSS storefront repository. The feature to build is described in `REQUIREMENTS.md` at the repository root. Read it, `README.md` and `AGENTS.md` first.

We are doing test-driven development. The tests in `tests/` were written first and define the expected behavior. This is the **green phase**: write the implementation.

Task:
1. Implement the feature in `components/ProductQuickView.tsx` (and `app/product/page.tsx` if needed) so that **all** tests in `tests/` pass.

   The implementation must also satisfy the following accessibility requirements:

   The widget must conform to the Web Content Accessibility Guidelines (WCAG) 2.2 Level AA. It must be fully operable with a keyboard alone and understandable by screen-reader users.

2. Do **not** modify, delete, skip or add anything in `tests/` or `playwright.config.ts`. Do not add new dependencies.
3. Run `pnpm exec playwright test` until every test passes, then run `pnpm lint` and fix any issues in your code.

When you finish, briefly summarize what you implemented.
