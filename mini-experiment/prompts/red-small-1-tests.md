You are working in a Next.js (App Router) + React + Tailwind CSS storefront repository. The feature to build is described in `REQUIREMENTS.md` at the repository root. Read it, `README.md` and `AGENTS.md` first.

We are doing test-driven development. This is the **red phase**: write the tests only.

Task:
1. Write Playwright end-to-end tests in `tests/product.spec.ts` that specify every requirement in `REQUIREMENTS.md`. Tests run against `/product` (base URL `http://localhost:4001`; `playwright.config.ts` starts the dev server).

   The tests must also specify and verify the following accessibility requirements, so that an implementation can only pass if it meets them:

   The widget must conform to the Web Content Accessibility Guidelines (WCAG) 2.2 Level AA. It must be fully operable with a keyboard alone and understandable by screen-reader users.

2. Do **not** implement the feature. Do not create or modify anything outside `tests/`, and do not add new dependencies.
3. Run `pnpm exec playwright test` and confirm the tests fail because the feature is not implemented yet (not because of syntax or configuration errors).

When you finish, briefly list the test cases you wrote.
