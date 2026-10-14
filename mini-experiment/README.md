# Mini Experiment: Product Quick-View

Each scenario has its own branch. The branch contains the storefront app, the task in `REQUIREMENTS.md`, and that scenario's prompts in `prompts/`. `prompts/` is listed in `.cursorignore`, so the AI cannot read the prompts itself: you paste them into the chat.

| Branch | Chat 1 | Chat 2 |
| --- | --- | --- |
| `mini-experiment-baseline` | `prompts/prompt-1-code.md` | none |
| `mini-experiment-red-small` | `prompts/prompt-1-red-phase-tests.md` | `prompts/prompt-2-green-phase-code.md` |
| `mini-experiment-red-comprehensive` | `prompts/prompt-1-red-phase-tests.md` | `prompts/prompt-2-green-phase-code.md` |
| `mini-experiment-green-small` | `prompts/prompt-1-red-phase-tests.md` | `prompts/prompt-2-green-phase-code.md` |
| `mini-experiment-green-comprehensive` | `prompts/prompt-1-red-phase-tests.md` | `prompts/prompt-2-green-phase-code.md` |

The red-phase prompts carry the accessibility spec in the `red-*` branches. The green-phase prompts carry it in the `green-*` branches.

## Steps (per branch)

1. `git checkout mini-experiment-<setup>`, then `pnpm install`.
2. Open a **new chat** and paste the contents of the Chat 1 prompt. When the AI is done, run `git add -A && git commit -m "P1"`.
3. TDD branches only: open a **new chat** and paste the Chat 2 prompt. When the AI is done, run `git add -A && git commit -m "P2"`.
4. `git checkout main`, then `mini-experiment/eval/run.sh <setup>`.

Use the same model for every branch. To compare models, pass a label: `mini-experiment/eval/run.sh red-small opus`.

## What the analyzer reports

`run.sh` builds the branch's last commit, serves it, and writes JSON to `results/<setup>/`. It also adds a row to `results/summary.csv`.

- **ACAS**: axe-core WCAG 2.2 AA scan, computed as passes / (violations + passes). It checks four states: initial, size error, size selected, and confirmation.
- **EAS**: `eslint-plugin-jsx-a11y` strict rules, computed as JSX elements with no violations / JSX elements checked.
- **KAS**: keyboard only, computed as working controls / 12. The 12 controls are 3 thumbnails, sizes 7–10, −, the quantity field, +, add to cart, and wishlist.
- **tests-profile**: how many role queries, ARIA snapshots and keyboard steps the generated tests contain.

The `eval/calibration/` files are reference versions used to check the analyzer:

| Version | ACAS | EAS | KAS |
| --- | --- | --- | --- |
| Accessible version | 100 | 100 | 12/12 |
| Div soup | 76 | 80 | 2/12 |
