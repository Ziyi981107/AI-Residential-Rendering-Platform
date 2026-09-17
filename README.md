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

### Provider modes

- `openai` — real provider smoke and production adapter path. Requires a server-side `OPENAI_API_KEY` or `API_KEY`.
- `demo` — presentation-safe offline fallback. It reads the configured local image at `DEMO_OUTPUT_PATH` (default `./demo-assets/demo-residential.svg`), persists it through the normal task flow, and shows a small `Demo Mode` badge. This is not an OpenAI generation.
- `mock` — deterministic automated/integration test provider.

For tomorrow's offline demo:

```powershell
$env:IMAGE_PROVIDER = 'demo'
$env:DEMO_OUTPUT_PATH = './demo-assets/demo-residential.svg'
node src/server.js
```

The committed SVG is a non-sensitive illustrative placeholder. Put any private
replacement image under `demo-assets/local/` or another ignored local path and
point `DEMO_OUTPUT_PATH` at it; do not commit company or residential source
assets.

## Verification

```powershell
npm.cmd test
$env:IMAGE_PROVIDER = 'mock'; node src/server.js
npm.cmd run smoke
```

The real API smoke test is intentionally separate from automated tests and incurs provider usage. Run it only with non-sensitive residential references and a configured API key. The same browser flow can be run offline with `IMAGE_PROVIDER=demo`.

## Stage 0 seams

- `RenderingTask` is the SQLite-backed source of truth for task state and metadata.
- `LocalStorage` owns all filesystem access and keeps `input/` and `output/` separate.
- `PromptEngine` owns `residential_v0.1` prompt construction and explicit reference roles.
- `ImageProvider` is represented by the `generate(request)` contract; `OpenAIImageProvider`, `DemoImageProvider`, and `MockImageProvider` are adapters.
- `RenderingService` owns validation → persistence → prompt → provider → output persistence → state updates.
- `public/` is a dependency-free browser client with polling, preview, download, regenerate, and history.
