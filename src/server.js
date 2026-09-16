import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs/promises';
import { loadConfig } from './config.js';
import { TaskRepository } from './db.js';
import { LocalStorage } from './storage.js';
import { PromptEngine } from './prompt-engine.js';
import { OpenAIImageProvider, MockImageProvider } from './provider.js';
import { RenderingService } from './rendering-service.js';
import { createLogger } from './logger.js';
import { AppError, publicError } from './errors.js';
import { parseMultipart, readRequestBody } from './multipart.js';

const config = loadConfig();
const repository = new TaskRepository(config.databasePath);
const storage = new LocalStorage(config.dataPath);
const logger = createLogger(config.dataPath);
const provider = config.providerName === 'mock' ? new MockImageProvider({ model: config.providerModel }) : new OpenAIImageProvider({ apiKey: config.apiKey, model: config.providerModel, baseUrl: config.openAiBaseUrl, timeoutMs: config.providerTimeoutMs });
const service = new RenderingService({ repository, storage, promptEngine: new PromptEngine(), provider, config, logger });
const publicRoot = path.resolve('public');

const server = http.createServer(async (request, response) => {
  try {
    await route(request, response);
  } catch (error) {
    const safe = publicError(error);
    json(response, safe.status, { error: { code: safe.code, message: safe.message } });
  }
});

async function route(request, response) {
  const url = new URL(request.url, `http://${request.headers.host ?? 'localhost'}`);
  if (request.method === 'GET' && url.pathname === '/api/health') return json(response, 200, { ok: true });
  if (url.pathname === '/api/render-tasks' && request.method === 'POST') return createTask(request, response);
  if (url.pathname === '/api/render-tasks' && request.method === 'GET') return json(response, 200, { tasks: repository.list().map(publicTask) });
  const taskMatch = /^\/api\/render-tasks\/([^/]+)$/.exec(url.pathname);
  const regenerateMatch = /^\/api\/render-tasks\/([^/]+)\/regenerate$/.exec(url.pathname);
  const assetMatch = /^\/api\/render-tasks\/([^/]+)\/assets\/(structure|style|output)$/.exec(url.pathname);
  if (assetMatch && request.method === 'GET') return serveAsset(assetMatch[1], assetMatch[2], response, url.searchParams.get('download') === '1');
  if (taskMatch && request.method === 'GET') return getTask(taskMatch[1], response);
  if (regenerateMatch && request.method === 'POST') return regenerate(regenerateMatch[1], response);
  if (request.method === 'GET') return serveStatic(url.pathname, response);
  throw new AppError('NOT_FOUND', 'Route not found.', 404);
}

async function createTask(request, response) {
  const body = await readRequestBody(request, config.maxUploadBytes * 2 + 1024 * 1024);
  const parts = parseMultipart(body, request.headers['content-type']);
  const fields = Object.fromEntries(parts.filter((part) => part.value !== undefined).map((part) => [part.field, part.value]));
  const files = Object.fromEntries(parts.filter((part) => part.file).map((part) => [part.field, part.file]));
  const task = await service.createTask({ structure: files.structure_image ?? files.structure, style: files.style_image ?? files.style, userInstruction: fields.user_instruction ?? fields.instruction ?? '' });
  return json(response, 202, publicTask(task));
}

async function getTask(id, response) {
  const task = repository.get(id);
  if (!task) throw new AppError('TASK_NOT_FOUND', 'Rendering task not found.', 404);
  return json(response, 200, publicTask(task));
}

async function regenerate(id, response) { return json(response, 202, publicTask(await service.regenerate(id))); }

async function serveAsset(id, role, response, download) {
  const task = repository.get(id);
  if (!task) throw new AppError('TASK_NOT_FOUND', 'Rendering task not found.', 404);
  const reference = role === 'structure' ? task.structure_image : role === 'style' ? task.style_image : task.output_images[0];
  if (!reference) throw new AppError('ASSET_NOT_FOUND', 'Asset not found.', 404);
  const data = await storage.readAsset(reference);
  response.writeHead(200, { 'Content-Type': reference.mime, 'Content-Length': data.length, 'Content-Disposition': download ? `attachment; filename="${role}.png"` : 'inline', 'Cache-Control': 'private, max-age=3600' });
  response.end(data);
}

async function serveStatic(requestPath, response) {
  const relative = requestPath === '/' ? 'index.html' : requestPath.replace(/^\//, '');
  const filePath = path.resolve(publicRoot, relative);
  if (filePath !== publicRoot && !filePath.startsWith(`${publicRoot}${path.sep}`)) throw new AppError('NOT_FOUND', 'File not found.', 404);
  try {
    const data = await fs.readFile(filePath);
    const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
    response.writeHead(200, { 'Content-Type': types[path.extname(filePath)] ?? 'application/octet-stream' });
    response.end(data);
  } catch { throw new AppError('NOT_FOUND', 'File not found.', 404); }
}

function publicTask(task) {
  return { id: task.id, created_at: task.created_at, updated_at: task.updated_at, task_type: task.task_type, status: task.status, user_instruction: task.user_instruction, outputs: task.output_images.map((image) => ({ role: 'output', url: `/api/render-tasks/${task.id}/assets/output`, mime: image.mime, size: image.size })), error: task.error_code ? { code: task.error_code, message: task.error_message } : null };
}

function json(response, status, payload) { response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); response.end(JSON.stringify(payload)); }

server.listen(config.port, () => console.log(`AI Residential Rendering Platform listening on http://localhost:${config.port}`));

process.on('SIGINT', () => { repository.close(); server.close(() => process.exit(0)); });
