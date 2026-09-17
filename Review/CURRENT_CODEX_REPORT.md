# CURRENT CODEX REPORT — Stage 0

## Narrow Frontend Chinese Localization Fix — 2026-09-17

### Result

- Converted all ordinary user-visible frontend copy to Chinese, including page
  title, product name, upload labels/hints, requirement field, buttons,
  loading/status/result/history text, Demo badge, alt text, and empty state.
- Added a presentation-layer mapping for known backend error codes; unknown
  errors use `操作失败，请稍后重试。`.
- Preserved internal status enums (`CREATED`, `VALIDATING`, `GENERATING`,
  `SUCCEEDED`, `FAILED`) and all core backend contracts.

### Verification

- `npm.cmd test`: **13/13 PASS**.
- `node --check public/app.js`: **PASS**.
- Chrome: **PASS** for Chinese page shell, Demo Mode (`演示模式`), both upload
  previews, Generate (`开始生成`), Chinese generation/result status, download
  (`下载图片`), Regenerate (`重新生成`), History (`历史记录`), and clear missing
  Structure/Style messages.
- Visible main-page text scan: no remaining English UI words.
- Modified scope: `public/` plus this governance record and `CURRENT_STATE.md`;
  no `src/` production logic changed.

Stage 1, OpenAI API smoke, ComfyUI, evaluator, scoring, ranking, Agent, and
release operations remain out of scope.

## Demo Readiness — 2026-09-17

### Implementation

- Added `DemoImageProvider` as a normal `generate(request)` adapter. It reads
  the configuration-driven `DEMO_OUTPUT_PATH`, returns a standard generation
  result, and safely reports missing/empty local output.
- Added the non-sensitive illustrative fallback asset
  `demo-assets/demo-residential.svg`.
- Added provider selection for `openai`, `demo`, and `mock`; the existing
  `OpenAIImageProvider` request/response path is unchanged.
- Added the lightweight `Demo Mode` badge, shown only for the `demo` provider.
- Added clear browser-side missing Structure/Style messages.
- Added ignored paths for private demo/user/residential assets.
- Added provider and end-to-end Demo regression tests.

### Validation evidence

- Automated tests: `npm.cmd test` — **13/13 PASS**.
- Mock integration smoke: **PASS**; task
  `edc0789a-afbc-45a3-84fb-73102894b754` reached `SUCCEEDED`.
- Demo integration smoke: **PASS**; task
  `caefacba-c8ec-4653-a284-52bf39f52d31` reached `SUCCEEDED`.
- Demo browser flow: **PASS**. Chrome verified `Demo Mode`, two reference
  uploads/previews, instruction, Generate, `Render ready`, output display,
  download event, History after refresh, and Regenerate as a new successful
  task (`e4e92729-f741-460f-9bee-8fd11f1898fa` →
  `7cda74ed-9726-4509-b0a9-82c353c56b8a`). Missing Structure and missing Style
  each displayed an understandable local error.
- Real OpenAI API smoke: **BLOCKED** by absent server-side credentials. No
  real request was made; this is an external validation blocker, not a Demo
  provider failure.
- Production source behavior outside the Demo adapter/config/UI polish was
  not changed. Residential Stage 1, ComfyUI, evaluator, scoring, ranking,
  Agent, and prompt optimization were not started.

### Handoff

This round is **DEMO READINESS: PASS CANDIDATE — local offline fallback
validated; real OpenAI smoke remains pending credential configuration**. It is
not `Stage 0 CLOSED`. Local commit SHA and Git status are recorded at handoff.

## Stage 0 Final Validation — 2026-09-17

This round was limited to Stage 0 validation. Residential Stage 1 was not
started.

### Results

- Automated regression: `npm.cmd test` — **PASS, 10/10**.
- Mock integration smoke: `npm.cmd run smoke` with `IMAGE_PROVIDER=mock` —
  **PASS**; task `ec50e2cc-f033-40ff-9403-e735a6b5a1c2` reached `SUCCEEDED` and
  returned the output asset URL.
- Real OpenAI API smoke: **BLOCKED**. `.env` is not present and neither
  `OPENAI_API_KEY` nor `API_KEY` is configured in the environment. No real API
  request was attempted and no secret was recorded.
- Real browser flow: **NOT RUN** because the real-provider prerequisite is an
  external blocker. This is not reported as PASS.
- Real API task id / prompt version / provider / latency / output download:
  **not available because no real API task was created**.
- Provider adapter code changes: **none**; no narrow corrective fix was
  necessary.
- Production source modified: **no**. Only this governance report and
  `CURRENT_STATE.md` are changed in this round.

### Blocker and handoff

Provide a server-side OpenAI API key and non-sensitive structure/style
references, then rerun the real API smoke and dependent browser flow. The
current configuration remains configuration-driven with model
`gpt-image-2.5-sunburst`; `.env` remains gitignored.

This round is **BLOCKED — external API credentials required**. Therefore the
state is not `Stage 0 Final Validation: PASS CANDIDATE`.

## Review status

This file is the tracked Codex review/report location for the project. It records the current Stage 0 implementation baseline and the narrow corrective pass requested by AIPM.

## Implementation baseline

Stage 0 is implemented on `dev/v0.1`: frontend shell, backend API, SQLite task persistence, task-isolated local assets, structure/style uploads, additional instruction, `residential_v0.1`, provider abstraction, OpenAI adapter, mock adapter, rendering orchestration, status polling, result download, regenerate-as-new-task, history, safe errors, logging, automated tests, and mock integration smoke.

Out of scope remains ComfyUI, upscale, evaluator, scoring/ranking, automatic quality retry, prompt optimization, training, agents, RAG, memory, public/masterplan rendering, auth/RBAC, collaboration, project management, multiple-provider UI, and advanced model parameters.

## Corrective pass applied

- Governance files are now `Prompt/CURRENT_CODEX_DISPATCH.md`, `Review/CURRENT_CODEX_REPORT.md`, and root `CURRENT_STATE.md`; the duplicate root `CURRENT_PI_REPORT.md` was removed.
- Runtime uses Node.js built-in `.env` loading. Existing shell/system environment values take precedence, and `.env` remains gitignored.
- Successful rendering now persists output/provider metadata through the repository’s legal `GENERATING → SUCCEEDED` transition.
- Default configured image model is `gpt-image-2.5-sunburst`; model selection remains configuration-driven and no UI was added.
- Local future-commit identity is corrected without changing pushed history.

## Verification

Automated result: `npm.cmd test` — 10 passed, 0 failed.

Mock integration result: `npm.cmd run smoke` passed against a local mock server; upload → create → generate → query → output completed and the task reached `SUCCEEDED`.

Git tree verification must show both `Prompt/` and `Review/` tracked on `dev/v0.1`; final results are recorded in the Git section below.

Real API smoke remains intentionally unrun unless credentials and non-sensitive references are supplied. No Stage 1 work, ComfyUI, evaluator, scoring, PR, merge, tag, or release is performed.

## Git / push

Branch: `dev/v0.1`.

Normal corrective follow-up commit: local `fcefc0e7fa487175d39ad3e4c5f29cb97da958ef`, authored and committed as `Ziyi981107` / `Ziyi981107@users.noreply.github.com`. Three ordinary push attempts were made; each failed with `Recv failure: Connection was reset`. Remote `origin/dev/v0.1` therefore remains at `e61ca9c19c49f5af8a37791937a4bec5ad682625`, while local `dev/v0.1` is ahead by the corrective commit and this report-status follow-up. The previous pushed history is unchanged; no amend, history rewrite, or force push was used.

## Review request

Ready for AIPM Re-Review after the verification results are recorded.
