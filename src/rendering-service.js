import { randomUUID } from 'node:crypto';
import { validateRenderInput } from './validation.js';
import { AppError } from './errors.js';
import { PromptEngine } from './prompt-engine.js';

export class RenderingService {
  constructor({ repository, storage, promptEngine, provider, config, logger }) {
    this.repository = repository;
    this.storage = storage;
    this.promptEngine = promptEngine;
    this.provider = provider;
    this.config = config;
    this.logger = logger;
  }

  async createTask(input, { parentTaskId = null } = {}) {
    const valid = validateRenderInput(input, this.config.maxUploadBytes);
    const now = new Date().toISOString();
    const task = this.repository.create({ id: randomUUID(), created_at: now, updated_at: now, task_type: 'residential_render', status: 'CREATED', structure_image: {}, style_image: {}, user_instruction: valid.userInstruction, prompt_version: this.promptEngine.version, provider: this.config.providerName, provider_model: this.config.providerModel, output_images: [], parent_task_id: parentTaskId });
    try {
      const structure = await this.storage.saveInput(task.id, 'structure', valid.structure);
      this.repository.update(task.id, { structure_image: structure });
      const style = await this.storage.saveInput(task.id, 'style', valid.style);
      const ready = this.repository.update(task.id, { style_image: style });
      await this.logger.transition(ready, 'CREATED', 'VALIDATING');
      this.repository.transition(task.id, 'VALIDATING');
      this.repository.transition(task.id, 'GENERATING');
      const generating = this.repository.get(task.id);
      await this.logger.transition(generating, 'VALIDATING', 'GENERATING');
      void this.#run(task.id).catch(() => {});
      return this.repository.get(task.id);
    } catch (error) {
      await this.#fail(task.id, error);
      return this.repository.get(task.id);
    }
  }

  async regenerate(taskId) {
    const previous = this.repository.get(taskId);
    if (!previous) throw new AppError('TASK_NOT_FOUND', 'Rendering task not found.', 404);
    const [structureData, styleData] = await Promise.all([this.storage.readAsset(previous.structure_image), this.storage.readAsset(previous.style_image)]);
    return this.createTask({ structure: { data: structureData, mime: previous.structure_image.mime, originalName: previous.structure_image.original_name }, style: { data: styleData, mime: previous.style_image.mime, originalName: previous.style_image.original_name }, userInstruction: previous.user_instruction }, { parentTaskId: previous.id });
  }

  async #run(taskId) {
    const started = Date.now();
    const task = this.repository.get(taskId);
    try {
      const prompt = this.promptEngine.build({ task_type: task.task_type, user_instruction: task.user_instruction, prompt_version: task.prompt_version, reference_image_roles: ['structure', 'style'] });
      const result = await this.provider.generate({ prompt, structure_image: { path: this.storagePath(task.structure_image), mime: task.structure_image.mime, filename: task.structure_image.original_name ?? 'structure.png' }, style_image: { path: this.storagePath(task.style_image), mime: task.style_image.mime, filename: task.style_image.original_name ?? 'style.png' }, generation_options: {} });
      const outputs = [];
      for (let index = 0; index < result.generated_images.length; index += 1) outputs.push(await this.storage.saveOutput(task.id, result.generated_images[index], index + 1));
      if (!outputs.length) throw new AppError('PROVIDER_EMPTY_OUTPUT', 'The image provider returned no image.', 502);
      const current = this.repository.get(task.id);
      const updated = this.repository.update(task.id, { output_images: outputs, provider: result.provider, provider_model: result.provider_model, status: 'SUCCEEDED', error_code: null, error_message: null });
      await this.logger.transition(current, 'GENERATING', 'SUCCEEDED');
      await this.logger.outcome({ task_id: task.id, prompt_version: updated.prompt_version, provider: updated.provider, provider_model: updated.provider_model, latency: Date.now() - started, request_outcome: 'success', error_category: null });
    } catch (error) {
      await this.#fail(taskId, error, started);
    }
  }

  storagePath(reference) { return `${this.config.dataPath}/${reference.path}`; }

  async #fail(taskId, error, started = Date.now()) {
    const safe = error instanceof AppError ? error : new AppError('INTERNAL_ERROR', 'The rendering task failed.', 500, error);
    const current = this.repository.get(taskId);
    if (!current || current.status === 'SUCCEEDED' || current.status === 'FAILED') return;
    const failed = this.repository.transition(taskId, 'FAILED', { error_code: safe.code, error_message: safe.message });
    await this.logger.transition(current, current.status, 'FAILED');
    await this.logger.outcome({ task_id: taskId, prompt_version: failed.prompt_version, provider: failed.provider, provider_model: failed.provider_model, latency: Date.now() - started, request_outcome: 'failure', error_category: safe.code });
  }
}
