# Mini Experiment: Product Quick-View

A pilot of the five scenarios from the proposal, run on one small task. The goal is to check that the procedure and the scoring work before scaling up to the full e-commerce site.

## Task

"Trail Runner 2" product quick-view widget. See [requirements.md](requirements.md), which is a copy of the `REQUIREMENTS.md` that the models see. The requirements describe only behavior and visuals; they never mention accessibility. The widget has the following accessibility traps:

| Feature | What it exercises |
| --- | --- |
| Image gallery (main image + 3 thumbnails) | `alt` text, thumbnails as real buttons, selected state not by color only |
| Size picker (7–11, 11 out of stock) | radio-group semantics, arrow keys, disabled state |
| Quantity stepper (1–5) | labels, names of `−`/`+` icon buttons, limits |
| Add to cart, size error, confirmation | error association, focus management, live region |
| Cart badge, wishlist heart | accessible names, `aria-pressed`, icon-only buttons |

## Scenarios and branches

All scenario branches start from `mini-experiment-base`: a clean storefront skeleton with no hypothesis files, a package renamed to `storefront`, a stub component, product images, and Chromium-only Playwright.

| Branch | Prompt 1 (new chat) | Prompt 2 (new chat) |
| --- | --- | --- |
| `mini-experiment-baseline` | [baseline.md](prompts/baseline.md): code only | — |
| `mini-experiment-red-small` | [red-small-1-tests.md](prompts/red-small-1-tests.md): tests + small spec | [red-small-2-code.md](prompts/red-small-2-code.md): code, no spec |
| `mini-experiment-red-comprehensive` | [red-comprehensive-1-tests.md](prompts/red-comprehensive-1-tests.md): tests + comprehensive spec | [red-comprehensive-2-code.md](prompts/red-comprehensive-2-code.md): code, no spec |
| `mini-experiment-green-small` | [green-1-tests.md](prompts/green-1-tests.md): functional tests only | [green-small-2-code.md](prompts/green-small-2-code.md): code + small spec |
| `mini-experiment-green-comprehensive` | [green-1-tests.md](prompts/green-1-tests.md): functional tests only | [green-comprehensive-2-code.md](prompts/green-comprehensive-2-code.md): code + comprehensive spec |

The spec texts are [a11y-spec-small.md](a11y-spec-small.md) and [a11y-spec-comprehensive.md](a11y-spec-comprehensive.md). They are already pasted verbatim into the prompt files, so copy each prompt file as-is.

The Red code prompts and the Green test prompt are word-for-word identical. In TDD scenarios, the only difference between the arms is where the accessibility spec appears.

## Protocol (per scenario)

Run all commands from the repo root on `main`. `<setup>` is one of `baseline`, `red-small`, `red-comprehensive`, `green-small` or `green-comprehensive`.

1. **Isolate the workspace.** The model must not see this folder, the proposal, or the repo name.

   ```bash
   git worktree add ../runs/storefront-<setup> mini-experiment-<setup>
   cd ../runs/storefront-<setup> && pnpm install
   ```

   Open `../runs/storefront-<setup>` as its **own Cursor window** (File → New Window → Open Folder, not the multi-root workspace). Disable Memories and any user or project rules that mention accessibility, and close other tabs.

2. **Fix the model.** Use the same model, Agent mode and settings for every scenario. Write them in the log below.

3. **Prompt 1.** Open a new chat, paste the prompt file, and let the agent finish without extra guidance. If it asks a question, answer "Use your best judgement" and log it. Then:

   ```bash
   git add -A && git commit -m "P1: tests"        # baseline: "P1: code"
   pnpm exec playwright test                      # TDD only: record that it is RED
   ```

4. **Prompt 2** (TDD only). Open a **new chat** and paste the code prompt. Then:

   ```bash
   git add -A && git commit -m "P2: code"
   git diff HEAD~1 --stat -- tests/ playwright.config.ts   # must be empty
   pnpm exec playwright test                               # record pass/fail counts
   ```

   If the agent edited the tests, keep the commit but mark the run as **tests modified** in the log. Do not fix it by hand.

5. **Score.** Back in this repo, on `main`:

   ```bash
   mini-experiment/eval/run.sh ../runs/storefront-<setup> <setup>
   git add mini-experiment/results && git commit -m "Results: <setup>"
   ```

   For repetitions, use branches `mini-experiment-<setup>-r2` (from `mini-experiment-base`) and `run.sh ... <setup> r2`.

6. Optionally, push the scenario branch so the generated code is kept: `git -C ../runs/storefront-<setup> push -u origin mini-experiment-<setup>`.

## Scoring harness ([eval/](eval/))

This is a standalone package with its own `node_modules`, so scenario branches never contain `axe-core` or `jsx-a11y`. `run.sh` builds the worktree, serves it with `next start` on port 4001, and writes the following to `results/<setup>/`.

`next start` is used instead of `pnpm dev` because the dev server injects Next's dev-tools overlay, which would be scanned by axe and tabbed into by the keyboard check.

| File | Metric | How |
| --- | --- | --- |
| `axe.json` | **ACAS** = passes / (violations + passes) | axe-core with tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` and `wcag22aa` in 4 states: initial, size error, size selected, confirmation. Nodes are deduplicated per rule across states, and a violation in any state wins. `incomplete` nodes are listed for manual review. |
| `eslint.json` | **EAS** = clean JSX elements / JSX elements checked | `eslint-plugin-jsx-a11y` strict on `app/` and `components/`, with inline `eslint-disable` ignored. Each message is mapped to its innermost DOM element (plus `Image` and `Link`). |
| `keyboard.json` | **KAS** = manipulated / 12 | Keyboard only, fresh page per control. Each control is reached by Tab (plus arrow keys inside radio groups) and operated by Enter, Space or typing. Success is judged by the visible outcome: main image, quantity value, confirmation text, or wishlist state. The file also records the tab order and a heuristic focus-indicator count. |
| `tests-profile.json` | none (diagnostic) | Counts role queries, ARIA snapshots, keyboard steps and CSS selectors in the generated `tests/`. |
| `meta.json`, `build.log` | none | Commit, uncommitted file count, and whether the build succeeded. |

`results/summary.csv` is regenerated after every run, with one row per scenario.

The 12 keyboard controls come from `REQUIREMENTS.md`: thumbnails 1–3, sizes 7–10, decrease, the quantity field, increase, add to cart, and wishlist. The cart icon is not counted because the requirements do not make it interactive.

### Calibration

[eval/calibration/](eval/calibration/) holds two hand-written reference implementations used to validate the harness. They are not part of the experiment. Results on commit `b00a287`:

| Implementation | ACAS | EAS | KAS |
| --- | --- | --- | --- |
| Base stub (renders nothing) | 100 (14 nodes, empty page) | 100 (3 elements) | 0 / 12 |
| `accessible.tsx` (follows the comprehensive spec) | 100 (136 passes) | 100 (34 elements) | 12 / 12 |
| `inaccessible.tsx` (div soup) | 76.19 (color-contrast, image-alt, label) | 80 (6 / 30 flagged) | 2 / 12 (only the native input and button) |

To recalibrate after changing the harness, copy a calibration file into `components/ProductQuickView.tsx` of a throwaway base worktree and run `run.sh` on it. Delete the resulting `results/` folder afterwards.

## Pilot success criteria

1. All five branches produce a full row in `summary.csv`, with the build OK and all three metrics present.
2. Baseline shows real violations or a KAS below 100, so there is room to improve.
3. Red-comprehensive's generated tests contain accessibility assertions (`gen_tests_role_queries`, `gen_tests_aria_snapshots` and `gen_tests_keyboard_steps` above 0). If they don't, the Red hypothesis cannot be tested and the test prompt needs work.
4. In TDD scenarios, prompt 1 leaves the tests red and prompt 2 makes them green without editing `tests/`.

## Run log

| Setup | Run | Model | Date | P1 chats/turns | Red after P1? | P2 chats/turns | Green after P2? (pass/total) | Tests modified? | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| baseline | r1 | | | | n/a | n/a | n/a | n/a | |
| red-small | r1 | | | | | | | | |
| red-comprehensive | r1 | | | | | | | | |
| green-small | r1 | | | | | | | | |
| green-comprehensive | r1 | | | | | | | | |
