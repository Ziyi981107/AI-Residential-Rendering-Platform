# CURRENT CODEX DISPATCH — Stage 0 Narrow Corrective Pass

Authority: AIPM / Product + Technical Lead  
Executor: Codex  
Scope: Stage 0 only  
Status: FIX REQUIRED — narrow corrective pass

## Required corrections

1. Track governance files at `Prompt/CURRENT_CODEX_DISPATCH.md`, `Review/CURRENT_CODEX_REPORT.md`, and root `CURRENT_STATE.md`; move the previous root report into `Review/CURRENT_CODEX_REPORT.md` and remove the duplicate.
2. Load optional project-root `.env` using Node.js built-in support without overriding shell/system environment variables; keep `.env` gitignored and test the behavior.
3. Route successful rendering through the legal `GENERATING → SUCCEEDED` task transition while persisting output/provider metadata; preserve failure behavior and the existing state set.
4. Change only the configuration default image model to `gpt-image-2.5-sunburst`; do not add model UI or change the residential prompt.
5. Inspect Git identity and correct only future local commits; never amend, rewrite, or force push.

## Verification and stop

Run automated tests, mock integration smoke, Git tree checks for tracked `Prompt/` and `Review/`, and `git status` clean. Update `CURRENT_STATE.md` and this pass’s report, create a normal follow-up commit, push `dev/v0.1`, report the final SHA, and STOP for AIPM Re-Review.

Do not enter Stage 1. Do not perform ComfyUI, evaluator, scoring, PR, merge, tag, or release work.
