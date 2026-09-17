# CURRENT STATE

## Narrow Frontend Chinese Localization Fix — 2026-09-17

The Demo-facing UI is now presented in natural Chinese for the management
briefing. Internal task status enums and backend/API behavior remain unchanged.

- Page language/title: `zh-CN` / `AI 住宅渲染工作台`.
- User-visible labels, hints, loading/status text, result actions, history, empty
  state, Demo badge, and known error messages are Chinese.
- Chrome verification passed normal Demo generation, result display, native
  download, History, Regenerate, and missing Structure/Style messages.
- Visible main-page scan found no remaining English UI words.
- No `src/` production logic, state machine, provider behavior, storage schema,
  model config, PromptEngine, or Stage 1 work was changed.

Automated tests remain **13/13 PASS**. This is a frontend localization
follow-up only; Stage 1 was not started.

## Demo Readiness — 2026-09-17

The temporary priority is a stable, presentable Stage 0 demo. Residential Stage
1 was not started.

- Added configuration-driven `DemoImageProvider` with the existing
  `ImageProvider.generate(request)` contract.
- Provider roles are explicit: `openai` for real provider smoke,
  `demo` for the offline presentation fallback, and `mock` for automated and
  integration tests.
- Demo output defaults to the non-sensitive illustrative asset at
  `DEMO_OUTPUT_PATH=./demo-assets/demo-residential.svg`; private replacement
  images belong under ignored local asset paths.
- Added a lightweight `Demo Mode` badge. It is visible only when the active
  provider is `demo`.

### Validation

- `npm.cmd test`: **13/13 PASS**.
- Mock smoke: **PASS**; task `edc0789a-afbc-45a3-84fb-73102894b754` reached
  `SUCCEEDED`.
- Demo smoke: **PASS**; task `caefacba-c8ec-4653-a284-52bf39f52d31` reached
  `SUCCEEDED`.
- Real browser Demo flow: **PASS**; task
  `e4e92729-f741-460f-9bee-8fd11f1898fa` rendered and displayed the local
  result, download event completed, History survived refresh, and Regenerate
  created task `7cda74ed-9726-4509-b0a9-82c353c56b8a`.
- Browser validation also confirmed clear missing Structure and missing Style
  messages.
- Real OpenAI API: **BLOCKED** only because no server-side API credential is
  configured in this environment; no secret was recorded.

This is a Demo Readiness implementation checkpoint, not Stage 0 CLOSED and not
Stage 1 authorization.

## Stage 0 Final Validation — 2026-09-17

This is a Stage 0 Final Validation attempt only. Residential Stage 1 was not
started.

- Automated regression: `npm.cmd test` — **PASS, 10/10**.
- Mock integration smoke: `npm.cmd run smoke` with `IMAGE_PROVIDER=mock` —
  **PASS**; upload → create → generate → query → output completed and the task
  reached `SUCCEEDED`.
- Real OpenAI Image API smoke: **BLOCKED by external credentials**. The root
  `.env` is absent and neither `OPENAI_API_KEY` nor `API_KEY` is configured in
  the system environment. No secret was logged or committed.
- Real browser flow: **NOT RUN** because the real-provider prerequisite is
  blocked; no false success is claimed.
- Production source changes: **none**. No provider adapter fix was needed.
- No push, merge, PR, tag, release, force push, or history rewrite was done.

Current validation disposition: **BLOCKED — external API credentials required**.
Owner must provide a server-side API key and non-sensitive structure/style
references before the real API and dependent browser validation can run.

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
