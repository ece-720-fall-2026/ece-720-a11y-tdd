# Experiment

The agent builds the Trail Runner 2 product page from `REQUIREMENTS.md` in the `stride` repo. `main` is one commit: the requirements, a design image, and a React + Vite app with a homepage that links to the empty product page at `/products/trail-runner-2`. The requirements are feature-only and never mention accessibility.

## Conditions

"Agnostic" prompts never mention accessibility. "Oriented" prompts add one sentence asking for WCAG 2.2 AA and the WAI-ARIA Authoring Practices Guide (APG), without naming techniques such as keyboard or focus handling.

| Condition | Session 1 | Session 2 |
| --- | --- | --- |
| `baseline-agnostic` | Implement the requirements. | none |
| `baseline-oriented` | Implement the requirements, following WCAG and APG. | none |
| `tdd-agnostic` | Red: write a small Playwright suite for the requirements (one or two focused tests each). | Green: implement the requirements; the existing tests must pass. |
| `tdd-oriented` | Red: the same, plus the tests must also check WCAG 2.2 AA and the APG. | Green: same as `tdd-agnostic`. |
| `tdd-green-oriented` | Red: same as `tdd-agnostic` (no accessibility wording). | Green: implement following WCAG and APG; the existing tests must pass. |

- The Red prompts ask for a deliberately small suite ("one or two focused tests per requirement, not an exhaustive matrix of interactions") so the Red phase does not flood the Green session's context.
- The `tdd-agnostic` Green prompt is the `baseline-agnostic` prompt plus one sentence saying the existing tests must pass. The `tdd-green-oriented` Green prompt additionally uses the same WCAG/APG sentence as `baseline-oriented`.
- Green may change the tests (refactoring is part of TDD); any change shows in the diff between the Session 1 and Session 2 commits.
- Comparing `baseline-agnostic` with `tdd-agnostic` tests whether test-first helps or hurts a plain build. Comparing the three TDD conditions shows where the accessibility signal pays off: in Red (`tdd-oriented`), in Green (`tdd-green-oriented`), or nowhere (`tdd-agnostic`).
- Earlier designs used frozen suites (`tests-small`, `tests-full` branches in stride); they are kept for reference but no longer used.
- Prompts live in [`prompts/<condition>/`](prompts), one file per session, run in order.

## Models and runs

- Two models through Claude Code: Claude Haiku (`haiku`, Claude Code's `haiku` alias) and Claude Opus (`opus`, `opus-latest` at high effort).
- Their model names are set at the top of [`run.sh`](run.sh) and can be overridden with `HAIKU_MODEL` and `OPUS_MODEL`.
- 3 runs per condition and model: 5 conditions × 2 models × 3 runs = 30 runs.
- Each run is one branch in `stride`, named `v2-<condition>-<model>-<run>` (the `PREFIX` variable in [`run.sh`](run.sh)), for example `v2-tdd-oriented-haiku-2`. The `v2-` prefix keeps them separate from the pilot runs, which used the old two-session setup and earlier requirements. It has one commit per session.

## Isolation

Every session runs in a fresh Docker container ([`Dockerfile`](Dockerfile)):

- **Only the run's workspace is mounted:** a fresh clone of `stride` with no remote. The agent cannot see this repo, the prompts of other conditions or the evaluation code.
- **Clean agent home:** no user rules, memories, skills, MCP servers or past chats. The container is discarded after each session.
- **New session per prompt:** Red and Green never share a chat.
- **No human edits:** the script commits whatever the agent leaves.
- **Same tools in every condition:** Node, pnpm, git, Playwright browsers and Claude Code are preinstalled in the image.
- **Everything is logged:** model, CLI version, image ID, prompt hashes, commits and the full transcript of each session go to `runs/<name>/`.
- **Build output stays out of commits:** `node_modules`, build output and test reports are excluded through `.git/info/exclude`, which the agent never sees.
- **Known limitation:** the container has network access, which it needs for the model API and npm. The agent could therefore search the web.

## Running

```bash
export ANTHROPIC_API_KEY=...
experiment/run.sh <condition> <run> <model>
# e.g.
experiment/run.sh baseline-agnostic 1 haiku
experiment/run.sh tdd-oriented 3 glm
```

Each call builds the Docker image, which is cached after the first time, and checks that Docker can reach the configured provider before creating a session. If `CLAUDE_SETTINGS` exists (by default `~/.claude/settings.json`), it is mounted read-only for authentication and provider configuration; otherwise set `ANTHROPIC_API_KEY` or `ANTHROPIC_AUTH_TOKEN`. Claude Code runs in bare mode with no MCP servers. If a session fails, the script stops and keeps the workspace for inspection.
