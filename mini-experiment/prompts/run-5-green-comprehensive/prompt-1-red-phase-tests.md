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
3. Keep all of your changes inside `tests/`, use only the dependencies already installed, and leave `components/ProductQuickView.tsx` as the existing stub for the Green phase.
4. Run `pnpm exec playwright test` and confirm the tests fail because the feature is missing, which is the expected Red result, rather than because of syntax or configuration errors.
