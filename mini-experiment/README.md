# Mini Experiment

Each branch contains `prompts/` and `storefront/`. `storefront/` holds the Next.js app and the task in `REQUIREMENTS.md`; it is the only folder the AI works in.

| Branch | Chat 1 | Chat 2 |
| --- | --- | --- |
| `mini-experiment-baseline` | `prompts/prompt-1-code.md` | none |
| `mini-experiment-red-small` | `prompts/prompt-1-red-phase-tests.md` | `prompts/prompt-2-green-phase-code.md` |
| `mini-experiment-red-comprehensive` | `prompts/prompt-1-red-phase-tests.md` | `prompts/prompt-2-green-phase-code.md` |
| `mini-experiment-green-small` | `prompts/prompt-1-red-phase-tests.md` | `prompts/prompt-2-green-phase-code.md` |
| `mini-experiment-green-comprehensive` | `prompts/prompt-1-red-phase-tests.md` | `prompts/prompt-2-green-phase-code.md` |

## Steps (per branch)

1. In this repo, run `git checkout mini-experiment-<setup>`, then `cd storefront && pnpm install`.
2. Open `storefront/` in a **new Cursor window** (File → New Window → Open Folder). Work only in that window.
3. Open a **new chat** and paste the contents of the Chat 1 prompt. When the AI is done, run `git add -A && git commit -m "P1"`.
4. If the branch has a Chat 2 prompt: open a **new chat**, paste it, and when the AI is done, run `git add -A && git commit -m "P2"`.
5. Back in this repo, run `git checkout main`, then `mini-experiment/eval/run.sh <setup>`.

Use the same model for every branch. To label a run, add a second argument: `mini-experiment/eval/run.sh red-small opus`.

## Output

`run.sh` builds the branch's last commit and writes the results to `mini-experiment/results/<setup>/`. It also adds a row to `mini-experiment/results/summary.csv`.
