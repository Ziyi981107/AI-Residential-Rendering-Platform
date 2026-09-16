# CURRENT STATE

## Current project

AI Residential Rendering Platform.

## Current version/stage

Stage 0 — Platform Shell, version 0.1.0; narrow corrective pass complete locally, awaiting successful push and AIPM Re-Review.

## Current branch

`dev/v0.1` (tracking `origin/dev/v0.1`).

## Stage 0 implementation status

Implemented with the requested narrow corrective pass and awaiting AIPM Re-Review; real external-provider smoke remains pending.

## Completed capabilities

Frontend shell, backend API, SQLite task persistence, task-isolated local input/output storage, structure/style uploads, additional instruction, versioned Residential Prompt V0, ImageProvider abstraction, OpenAI adapter, mock adapter for local tests, rendering orchestration, status polling, result preview/download, manual regenerate as a new task, history, safe error responses, operational logging, automated tests, and integration smoke script.

## Known limitations

Real API smoke test requires provider credentials and non-sensitive references; its status is recorded in `Review/CURRENT_CODEX_REPORT.md`. No ComfyUI, evaluator, ranking, retry workflow, auth, or multi-provider UI is included.

## Tests

`npm.cmd test` passed: 10 tests, 0 failures. `npm.cmd run smoke` passed against the local mock server: upload → create → generate → query → output; task reached `SUCCEEDED`.

## Provider smoke test status

Not run in this environment; no API key or non-sensitive reference images were supplied. The mock smoke path passed.

## Latest stable commit

`14f8c19` — `Implement Stage 0 platform shell`.

Corrective follow-up commit: local `fcefc0e7fa487175d39ad3e4c5f29cb97da958ef`; it is not yet on the remote because GitHub reset all three normal push attempts.

## Git / push status

Remote: `https://github.com/Ziyi981107/AI-Residential-Rendering-Platform.git` (`origin`).

`main` remains the initialization-only technical stable line; Stage 0 was not merged into it. `dev/v0.1` is locally ahead of `origin/dev/v0.1` by the corrective commit; three normal push attempts were reset by the GitHub connection. Local future-commit identity is `Ziyi981107 / Ziyi981107@users.noreply.github.com`. No force push, merge, PR, tag, or release was performed.

## Next authority

AIPM Review.
