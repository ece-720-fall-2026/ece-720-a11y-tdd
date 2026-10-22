# Experiment

The agent builds the Trail Runner 2 product page from scratch, from `REQUIREMENTS.md` in the `stride` repo (one commit, requirements only). The requirements are feature-only and never mention accessibility.

## Conditions

"Agnostic" prompts never mention accessibility. "Oriented" prompts ask for WCAG and APG compliance.

| Condition | Session 1 | Session 2 |
| --- | --- | --- |
| `baseline-agnostic` | Implement the requirements. | none |
| `baseline-oriented` | Implement the requirements, following WCAG and APG. | none |
| `tdd-oriented` | Red: write tests that follow WCAG and APG. | Green: implement until the tests pass. |
| `tdd-tool` | Red: write tests using `playwright-apg`. No accessibility wording. | Green: implement until the tests pass. |

- In the TDD conditions, accessibility wording appears only in the Red (tests) session. The Green session is the same in both, so any difference comes from the tests.
- `tdd-tool` is agnostic: the only difference from a plain TDD run is that `playwright-apg` is in `vendor/` and the prompt says to use it.
- Prompts live in [`prompts/<condition>/`](prompts), one file per session, run in order.

## Models and runs

- Two models through the Cursor CLI: GLM 5.2 (`glm`, `glm-5.2-high`) and Kimi K3 (`kimi`, `kimi-k3-high`).
- Their model names are set at the top of [`run.sh`](run.sh) and can be overridden with `GLM_MODEL` and `KIMI_MODEL`.
- 3 runs per condition and model: 4 conditions × 2 models × 3 runs = 24 runs.
- Each run is one branch in `stride`, named `<condition>-<model>-<run>`, for example `tdd-tool-kimi-2`. It has one commit per session.

## Isolation

Every session runs in a fresh Docker container ([`Dockerfile`](Dockerfile)):

- **Only the run's workspace is mounted:** a fresh clone of `stride` with no remote. The agent cannot see this repo, the prompts of other conditions or the evaluation code.
- **Clean agent home:** no user rules, memories, skills, MCP servers or past chats. The container is discarded after each session.
- **New session per prompt:** Red and Green never share a chat.
- **No human edits:** the script commits whatever the agent leaves.
- **Same tools in every condition:** Node, pnpm, git, Playwright browsers and the Cursor CLI are preinstalled in the image.
- **Everything is logged:** model, CLI version, image ID, prompt hashes, commits and the full transcript of each session go to `runs/<name>/`.
- **Build output stays out of commits:** `node_modules`, build output and test reports are excluded through `.git/info/exclude`, which the agent never sees.
- **Known limitation:** the container has network access, which it needs for the model API and npm. The agent could therefore search the web.

## Running

```bash
export CURSOR_API_KEY=...
experiment/run.sh <condition> <run> <model>
# e.g.
experiment/run.sh baseline-agnostic 1 glm
experiment/run.sh tdd-tool 3 kimi
```

Each call builds the Docker image, which is cached after the first time. Before generating, the script checks that the chosen model is available to the CLI and lists the available models if it isn't. If a session fails, the script stops and keeps the workspace for inspection.
