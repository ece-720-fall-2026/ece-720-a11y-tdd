# Mini Experiment

The app lives in a separate repository, `~/code/ualberta/stride`, which contains only the Next.js app and `REQUIREMENTS.md`. Each scenario runs on its own branch there. The prompts and this mapping stay here, outside the AI's reach.

| Setup | Branch in `~/code/ualberta/stride` | Chat 1 | Chat 2 |
| --- | --- | --- | --- |
| baseline | `run-1` | `prompts/run-1-baseline/prompt-1-code.md` | none |
| red-small | `run-2` | `prompts/run-2-red-small/prompt-1-red-phase-tests.md` | `prompts/run-2-red-small/prompt-2-green-phase-code.md` |
| red-comprehensive | `run-3` | `prompts/run-3-red-comprehensive/prompt-1-red-phase-tests.md` | `prompts/run-3-red-comprehensive/prompt-2-green-phase-code.md` |
| green-small | `run-4` | `prompts/run-4-green-small/prompt-1-red-phase-tests.md` | `prompts/run-4-green-small/prompt-2-green-phase-code.md` |
| green-comprehensive | `run-5` | `prompts/run-5-green-comprehensive/prompt-1-red-phase-tests.md` | `prompts/run-5-green-comprehensive/prompt-2-green-phase-code.md` |
| red-tool | `run-6` | `prompts/run-6-red-tool/prompt-1-red-phase-tests.md` | `prompts/run-6-red-tool/prompt-2-green-phase-code.md` |

## Steps (per run)

1. `cd ~/code/ualberta/stride && git checkout run-N && pnpm install`.
2. Open `~/code/ualberta/stride` in a **new Cursor window** (File → New Window → Open Folder). Work only in that window.
3. Open a **new chat** and paste the contents of the Chat 1 prompt. When the AI is done, run `git add -A && git commit -m "P1"`.
4. If there is a Chat 2 prompt: open a **new chat**, paste it, and when the AI is done, run `git add -A && git commit -m "P2"`.
5. From this repo, run `mini-experiment/eval/run.sh <setup>`.

Use the same model for every run. To label a run, add a second argument: `mini-experiment/eval/run.sh red-small opus`. For repetitions, create a new branch from `main` in `~/code/ualberta/stride` (for example `run-7`) and add it to the mapping in `eval/run.sh`.

## Output

`run.sh` builds the branch's last commit and writes the results to `mini-experiment/results/<setup>/`. It also adds a row to `mini-experiment/results/summary.csv`.
