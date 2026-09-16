# CURRENT STATE

## Current project

AI Residential Rendering Platform.

## Current version/stage

Stage 0 — Platform Shell, version 0.1.0.

## Current branch

`dev/v0.1` (tracking `origin/dev/v0.1`).

## Stage 0 implementation status

Implemented locally and awaiting AIPM real-source review; external-provider and file-chooser checks remain pending.

## Completed capabilities

Frontend shell, backend API, SQLite task persistence, task-isolated local input/output storage, structure/style uploads, additional instruction, versioned Residential Prompt V0, ImageProvider abstraction, OpenAI adapter, mock adapter for local tests, rendering orchestration, status polling, result preview/download, manual regenerate as a new task, history, safe error responses, operational logging, automated tests, and integration smoke script.

## Known limitations

Real API smoke test and manual browser verification require a running server and provider credentials/references; they are recorded in `CURRENT_PI_REPORT.md` with their actual status. No ComfyUI, evaluator, ranking, retry workflow, auth, or multi-provider UI is included.

## Tests

`npm.cmd test` passed: 8 tests, 0 failures. `npm.cmd run smoke` passed against the local mock server: upload → create → generate → query → output.

## Provider smoke test status

Not run in this environment; no API key or non-sensitive reference images were supplied. The mock smoke path is available and passed.

## Latest stable commit

`14f8c19` — `Implement Stage 0 platform shell`.

The verification-evidence commits are on top of this implementation checkpoint; the final pushed branch tip is reported in the final Git verification below.

## Git / push status

Remote: `https://github.com/Ziyi981107/AI-Residential-Rendering-Platform.git` (`origin`).

`main` was pushed unchanged and remains the initialization-only technical stable line; Stage 0 was not merged into it. `dev/v0.1` was pushed normally with upstream tracking and contains the Stage 0 implementation plus verification reports. No force push, merge, PR, tag, or release was performed.

## Next authority

AIPM Review.
