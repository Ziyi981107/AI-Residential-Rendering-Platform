# AI Residential Rendering Platform — Stage 0

A small, runnable web platform shell for residential rendering tasks. It preserves structure and style references separately, records task state in SQLite, stores assets under task-isolated local directories, and keeps the image provider behind a stable adapter.

## Run locally

Requires Node.js 22.5+ (the app uses the built-in `node:sqlite` module).

At startup the runtime loads `.env` from the project root with Node’s built-in environment-file support when it exists. Existing shell/system environment variables take precedence; `.env` is optional and remains gitignored.

```powershell
Copy-Item .env.example .env
$env:IMAGE_PROVIDER = 'mock'
node src/server.js
```

Open http://localhost:3000. The mock provider produces a deterministic 1×1 PNG for local UI and integration checks. For a real provider run, set `IMAGE_PROVIDER=openai` and provide `OPENAI_API_KEY` or `API_KEY` server-side. The OpenAI adapter uses the configured model (default `gpt-image-2.5-sunburst`) and the server-side `/v1/images/edits` endpoint; credentials never reach the browser or task logs.

## Verification

```powershell
npm.cmd test
$env:IMAGE_PROVIDER = 'mock'; node src/server.js
npm.cmd run smoke
```

The real API smoke test is intentionally separate from automated tests and incurs provider usage. Run it only with non-sensitive residential references and a configured API key.

## Stage 0 seams

- `RenderingTask` is the SQLite-backed source of truth for task state and metadata.
- `LocalStorage` owns all filesystem access and keeps `input/` and `output/` separate.
- `PromptEngine` owns `residential_v0.1` prompt construction and explicit reference roles.
- `ImageProvider` is represented by the `generate(request)` contract; `OpenAIImageProvider` and `MockImageProvider` are adapters.
- `RenderingService` owns validation → persistence → prompt → provider → output persistence → state updates.
- `public/` is a dependency-free browser client with polling, preview, download, regenerate, and history.
