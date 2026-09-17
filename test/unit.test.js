import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { TaskRepository } from '../src/db.js';
import { LocalStorage } from '../src/storage.js';
import { PromptEngine } from '../src/prompt-engine.js';
import { validateImage, validateRenderInput } from '../src/validation.js';
import { RenderingService } from '../src/rendering-service.js';
import { DemoImageProvider, OpenAIImageProvider } from '../src/provider.js';
import { loadConfig } from '../src/config.js';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
const input = () => ({ structure: { data: png, mime: 'image/png', originalName: 'structure.png' }, style: { data: png, mime: 'image/png', originalName: 'style.png' }, userInstruction: 'Warm evening light' });
const silentLogger = { transition: async () => {}, outcome: async () => {} };

class TrackingRepository extends TaskRepository {
  constructor() { super(); this.transitionCalls = []; }
  transition(id, status, details = {}) { this.transitionCalls.push({ id, status, details }); return super.transition(id, status, details); }
}

test('PromptEngine preserves explicit reference roles and version', () => {
  const prompt = new PromptEngine().build({ task_type: 'residential_render', user_instruction: 'Add a planted courtyard', prompt_version: 'residential_v0.1' });
  assert.match(prompt, /STRUCTURE REFERENCE/);
  assert.match(prompt, /STYLE REFERENCE/);
  assert.match(prompt, /USER ADDITIONAL REQUIREMENTS\nAdd a planted courtyard/);
});

test('config loads project .env without overriding shell environment', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'rendering-env-'));
  await fs.writeFile(path.join(dir, '.env'), 'PORT=4555\nIMAGE_PROVIDER_MODEL=from-file\nIMAGE_PROVIDER=mock\n');
  const configModule = pathToFileURL(path.resolve('src/config.js')).href;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', `import { loadConfig } from ${JSON.stringify(configModule)}; console.log(JSON.stringify(loadConfig()));`], { cwd: dir, encoding: 'utf8', env: { ...process.env, PORT: '4666', IMAGE_PROVIDER_MODEL: 'from-shell' } });
  assert.equal(result.status, 0, result.stderr);
  const config = JSON.parse(result.stdout.trim());
  assert.equal(config.port, 4666);
  assert.equal(config.providerModel, 'from-shell');
  assert.equal(config.providerName, 'mock');
});

test('config fallback uses the current residential image model', () => {
  const environment = { ...process.env };
  delete environment.IMAGE_PROVIDER_MODEL;
  assert.equal(loadConfig({}, environment).providerModel, 'gpt-image-2.5-sunburst');
});

test('task state machine rejects invalid transitions', () => {
  const repo = new TaskRepository();
  repo.create({ id: 'task-1', created_at: 'now', updated_at: 'now', task_type: 'residential_render', status: 'CREATED', structure_image: {}, style_image: {}, user_instruction: '', prompt_version: 'residential_v0.1', provider: 'mock', provider_model: 'mock', output_images: [] });
  repo.transition('task-1', 'VALIDATING');
  assert.throws(() => repo.transition('task-1', 'SUCCEEDED'), /Cannot move task/);
  repo.close();
});

test('local storage isolates input and output assets without overwrite', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'rendering-storage-'));
  const storage = new LocalStorage(dir);
  const ref = await storage.saveInput('task-1', 'structure', { data: png, mime: 'image/png', originalName: '../../secret.png' });
  const out = await storage.saveOutput('task-1', { data: png, mime: 'image/png' });
  assert.equal(ref.path, 'tasks/task-1/input/structure.png');
  assert.equal(out.path, 'tasks/task-1/output/result_01.png');
  assert.deepEqual(await storage.readAsset(ref), png);
  await assert.rejects(() => storage.saveInput('task-1', 'structure', { data: png, mime: 'image/png' }), /Could not persist/);
});

test('validation rejects invalid images before provider use', () => {
  assert.throws(() => validateImage({ data: Buffer.from('not image'), mime: 'image/png' }, 'structure', 1000), /valid PNG/);
  assert.throws(() => validateRenderInput({ structure: null, style: { data: png } }, 1000), /structure reference image is required/);
});

test('invalid render input is rejected before provider invocation', async () => {
  const repo = new TaskRepository();
  let calls = 0;
  const service = new RenderingService({ repository: repo, storage: new LocalStorage(await fs.mkdtemp(path.join(os.tmpdir(), 'rendering-invalid-'))), promptEngine: new PromptEngine(), config: { dataPath: '.', maxUploadBytes: 10000, providerName: 'mock', providerModel: 'mock' }, logger: silentLogger, provider: { async generate() { calls += 1; } } });
  await assert.rejects(() => service.createTask({ structure: null, style: input().style }), /structure reference image is required/);
  assert.equal(calls, 0);
  repo.close();
});

test('OpenAI provider maps image response into provider-neutral result', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'rendering-provider-'));
  const structurePath = path.join(dir, 'structure.png');
  const stylePath = path.join(dir, 'style.png');
  await fs.writeFile(structurePath, png);
  await fs.writeFile(stylePath, png);
  const provider = new OpenAIImageProvider({ apiKey: 'test-key', model: 'configured-model', fetchImpl: async (url, options) => {
    assert.match(url, /\/images\/edits$/);
    assert.equal(options.headers.Authorization, 'Bearer test-key');
    assert.equal(options.body.get('model'), 'configured-model');
    assert.equal(options.body.getAll('image[]').length, 2);
    return new Response(JSON.stringify({ data: [{ b64_json: png.toString('base64') }] }), { status: 200, headers: { 'x-request-id': 'request-1' } });
  } });
  const result = await provider.generate({ prompt: 'render', structure_image: { path: structurePath, mime: 'image/png' }, style_image: { path: stylePath, mime: 'image/png' }, generation_options: {} });
  assert.equal(result.provider, 'openai');
  assert.equal(result.provider_model, 'configured-model');
  assert.deepEqual(result.generated_images[0].data, png);
});

test('DemoImageProvider returns the configured local image', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'rendering-demo-provider-'));
  const demoPath = path.join(dir, 'demo.svg');
  const demoImage = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="green"/></svg>');
  await fs.writeFile(demoPath, demoImage);
  const result = await new DemoImageProvider({ outputPath: demoPath, model: 'demo-model' }).generate({});
  assert.deepEqual(result.generated_images[0].data, demoImage);
  assert.equal(result.generated_images[0].mime, 'image/svg+xml');
  assert.equal(result.provider, 'demo');
  assert.equal(result.provider_model, 'demo-model');
  assert.equal(result.provider_metadata.mode, 'presentation-demo');
});

test('DemoImageProvider safely fails when the configured image is missing', async () => {
  const provider = new DemoImageProvider({ outputPath: path.join(os.tmpdir(), 'missing-demo-image.svg') });
  await assert.rejects(() => provider.generate({}), (error) => error.code === 'DEMO_IMAGE_NOT_FOUND' && error.status === 503 && error.message.includes('not available'));
});

test('rendering service completes mock flow and records output', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'rendering-service-'));
  const repo = new TrackingRepository();
  const storage = new LocalStorage(dir);
  let calls = 0;
  const service = new RenderingService({ repository: repo, storage, promptEngine: new PromptEngine(), config: { dataPath: dir, maxUploadBytes: 10000, providerName: 'mock', providerModel: 'mock' }, logger: silentLogger, provider: { async generate(request) { calls += 1; assert.match(request.prompt, /STRUCTURE REFERENCE/); return { generated_images: [{ data: png, mime: 'image/png' }], provider: 'mock', provider_model: 'mock' }; } } });
  const task = await service.createTask(input());
  await new Promise(resolve => setTimeout(resolve, 40));
  const completed = repo.get(task.id);
  assert.equal(calls, 1);
  assert.equal(completed.status, 'SUCCEEDED');
  assert.equal(completed.output_images.length, 1);
  const successTransition = repo.transitionCalls.find(call => call.status === 'SUCCEEDED');
  assert.equal(successTransition.details.output_images.length, 1);
  assert.equal(successTransition.details.provider, 'mock');
  assert.equal(successTransition.details.provider_model, 'mock');
  repo.close();
});

test('rendering service completes demo flow and persists the configured image', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'rendering-demo-service-'));
  const demoPath = path.join(dir, 'demo.svg');
  const demoImage = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="green"/></svg>');
  await fs.writeFile(demoPath, demoImage);
  const repo = new TaskRepository();
  const storage = new LocalStorage(dir);
  const provider = new DemoImageProvider({ outputPath: demoPath, model: 'demo-model' });
  const service = new RenderingService({ repository: repo, storage, promptEngine: new PromptEngine(), config: { dataPath: dir, maxUploadBytes: 10000, providerName: 'demo', providerModel: 'demo-model' }, logger: silentLogger, provider });
  const task = await service.createTask(input());
  await new Promise(resolve => setTimeout(resolve, 40));
  const completed = repo.get(task.id);
  assert.equal(completed.status, 'SUCCEEDED');
  assert.equal(completed.provider, 'demo');
  assert.equal(completed.provider_model, 'demo-model');
  assert.equal(completed.output_images[0].mime, 'image/svg+xml');
  assert.deepEqual(await storage.readAsset(completed.output_images[0]), demoImage);
  repo.close();
});

test('provider failure records FAILED and never SUCCEEDED', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'rendering-failure-'));
  const repo = new TaskRepository();
  const storage = new LocalStorage(dir);
  const service = new RenderingService({ repository: repo, storage, promptEngine: new PromptEngine(), config: { dataPath: dir, maxUploadBytes: 10000, providerName: 'mock', providerModel: 'mock' }, logger: silentLogger, provider: { async generate() { throw new Error('timeout'); } } });
  const task = await service.createTask(input());
  await new Promise(resolve => setTimeout(resolve, 40));
  const failed = repo.get(task.id);
  assert.equal(failed.status, 'FAILED');
  assert.equal(failed.error_code, 'INTERNAL_ERROR');
  assert.notEqual(failed.status, 'SUCCEEDED');
  repo.close();
});
