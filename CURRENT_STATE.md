# CURRENT STATE

## Current project

AI Residential Rendering Platform.

## Current version/stage

Stage 0 — Platform Shell, version 0.1.0.

## Current branch

`dev/v0.1`.

## Stage 0 implementation status

Implemented locally and awaiting AIPM real-source review; external-provider and file-chooser checks remain pending.

## Completed capabilities

Frontend shell, backend API, SQLite task persistence, task-isolated local input/output storage, structure/style uploads, additional instruction, versioned Residential Prompt V0, ImageProvider abstraction, OpenAI adapter, mock adapter for local tests, rendering orchestration, status polling, result preview/download, manual regenerate as a new task, history, safe error responses, operational logging, automated tests, and integration smoke script.

## Known limitations

Real API smoke test and manual browser verification require a running server and provider credentials/references; they are recorded in `CURRENT_PI_REPORT.md` with their actual status. No ComfyUI, evaluator, ranking, retry workflow, auth, or multi-provider UI is included.

## Tests

`npm.cmd test` passed: 8 tests, 0 failures. The mock HTTP integration passed upload → create → generate → query → download → history → regenerate.

## Provider smoke test status

Not run in this environment; no API key or non-sensitive reference images were supplied. The mock smoke path is available and passed.

## Latest stable commit

Recorded after the Stage 0 checkpoint commit.

## Next authority

AIPM Review.
