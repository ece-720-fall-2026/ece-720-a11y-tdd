You are working in a Next.js (App Router) + React + Tailwind CSS storefront repository. The feature to build is described in `REQUIREMENTS.md` at the repository root; `README.md` and `AGENTS.md` explain how to run the project.

We are building this feature with Test-Driven Development (TDD). TDD works in cycles of three phases: **Red** (write tests that describe the desired behavior; they fail because the feature is not built yet), **Green** (write the implementation that makes those tests pass) and **Refactor** (clean up while keeping the tests green).

**You are in the Green phase.** The Red phase is complete: the tests in `tests/` were written first and are the specification for this feature. Your job is to write the implementation that makes all of them pass.

Task:
1. Read `REQUIREMENTS.md`, `README.md`, `AGENTS.md` and the tests in `tests/`.
2. Implement the feature in `components/ProductQuickView.tsx` (and `app/product/page.tsx` if needed) so that every test in `tests/` passes.
3. Treat `tests/` and `playwright.config.ts` as fixed: when a test fails, change the implementation. Use only the dependencies already installed.
4. Run `pnpm exec playwright test` until every test passes, then run `pnpm lint` and fix any issues in your code.

When you finish, briefly summarize what you implemented.
