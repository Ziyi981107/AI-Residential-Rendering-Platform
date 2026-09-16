import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { TaskRepository } from '../src/db.js';
import { LocalStorage } from '../src/storage.js';
import { PromptEngine } from '../src/prompt-engine.js';
import { validateImage, validateRenderInput } from '../src/validation.js';
import { RenderingService } from '../src/rendering-service.js';
import { OpenAIImageProvider } from '../src/provider.js';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
const input = () => ({ structure: { data: png, mime: 'image/png', originalName: 'structure.png' }, style: { data: png, mime: 'image/png', originalName: 'style.png' }, userInstruction: 'Warm evening light' });
const silentLogger = { transition: async () => {}, outcome: async () => {} };

test('PromptEngine preserves explicit reference roles and version', () => {
  const prompt = new PromptEngine().build({ task_type: 'residential_render', user_instruction: 'Add a planted courtyard', prompt_version: 'residential_v0.1' });
  assert.match(prompt, /STRUCTURE REFERENCE/);
  assert.match(prompt, /STYLE REFERENCE/);
  assert.match(prompt, /USER ADDITIONAL REQUIREMENTS\nAdd a planted courtyard/);
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

test('rendering service completes mock flow and records output', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'rendering-service-'));
  const repo = new TaskRepository();
  const storage = new LocalStorage(dir);
  let calls = 0;
  const service = new RenderingService({ repository: repo, storage, promptEngine: new PromptEngine(), config: { dataPath: dir, maxUploadBytes: 10000, providerName: 'mock', providerModel: 'mock' }, logger: silentLogger, provider: { async generate(request) { calls += 1; assert.match(request.prompt, /STRUCTURE REFERENCE/); return { generated_images: [{ data: png, mime: 'image/png' }], provider: 'mock', provider_model: 'mock' }; } } });
  const task = await service.createTask(input());
  await new Promise(resolve => setTimeout(resolve, 40));
  const completed = repo.get(task.id);
  assert.equal(calls, 1);
  assert.equal(completed.status, 'SUCCEEDED');
  assert.equal(completed.output_images.length, 1);
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
