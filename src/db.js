import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { AppError } from './errors.js';

export const STATUSES = Object.freeze(['CREATED', 'VALIDATING', 'GENERATING', 'SUCCEEDED', 'FAILED']);
const transitions = {
  CREATED: ['VALIDATING', 'FAILED'],
  VALIDATING: ['GENERATING', 'FAILED'],
  GENERATING: ['SUCCEEDED', 'FAILED'],
  SUCCEEDED: [],
  FAILED: []
};

export class TaskRepository {
  constructor(databasePath = ':memory:') {
    if (databasePath !== ':memory:') fs.mkdirSync(path.dirname(databasePath), { recursive: true });
    this.db = new DatabaseSync(databasePath);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS rendering_tasks (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        task_type TEXT NOT NULL,
        status TEXT NOT NULL,
        structure_image TEXT NOT NULL,
        style_image TEXT NOT NULL,
        user_instruction TEXT NOT NULL DEFAULT '',
        prompt_version TEXT NOT NULL,
        provider TEXT NOT NULL,
        provider_model TEXT NOT NULL,
        output_images TEXT NOT NULL DEFAULT '[]',
        error_code TEXT,
        error_message TEXT,
        parent_task_id TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_rendering_tasks_created ON rendering_tasks(created_at DESC);
    `);
  }

  create(task) {
    this.db.prepare(`INSERT INTO rendering_tasks
      (id, created_at, updated_at, task_type, status, structure_image, style_image, user_instruction,
       prompt_version, provider, provider_model, output_images, error_code, error_message, parent_task_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(task.id, task.created_at, task.updated_at, task.task_type, task.status,
        JSON.stringify(task.structure_image), JSON.stringify(task.style_image), task.user_instruction,
        task.prompt_version, task.provider, task.provider_model, JSON.stringify(task.output_images ?? []),
        task.error_code ?? null, task.error_message ?? null, task.parent_task_id ?? null);
    return this.get(task.id);
  }

  get(id) {
    const row = this.db.prepare('SELECT * FROM rendering_tasks WHERE id = ?').get(id);
    return row ? this.#map(row) : null;
  }

  list(limit = 50) {
    return this.db.prepare('SELECT * FROM rendering_tasks ORDER BY created_at DESC LIMIT ?').all(limit).map((row) => this.#map(row));
  }

  update(id, changes) {
    const current = this.get(id);
    if (!current) throw new AppError('TASK_NOT_FOUND', 'Rendering task not found.', 404);
    const next = { ...current, ...changes, updated_at: new Date().toISOString() };
    const fields = ['updated_at', 'status', 'structure_image', 'style_image', 'user_instruction', 'prompt_version', 'provider', 'provider_model', 'output_images', 'error_code', 'error_message', 'parent_task_id'];
    const values = fields.map((field) => {
      const value = next[field];
      return ['structure_image', 'style_image', 'output_images'].includes(field) ? JSON.stringify(value ?? []) : value ?? null;
    });
    this.db.prepare(`UPDATE rendering_tasks SET ${fields.map((field) => `${field} = ?`).join(', ')} WHERE id = ?`).run(...values, id);
    return this.get(id);
  }

  transition(id, status, details = {}) {
    const current = this.get(id);
    if (!current) throw new AppError('TASK_NOT_FOUND', 'Rendering task not found.', 404);
    if (!transitions[current.status]?.includes(status)) {
      throw new AppError('INVALID_STATE_TRANSITION', `Cannot move task from ${current.status} to ${status}.`, 409);
    }
    return this.update(id, { ...details, status });
  }

  close() { this.db.close(); }

  #map(row) {
    return {
      ...row,
      structure_image: JSON.parse(row.structure_image),
      style_image: JSON.parse(row.style_image),
      output_images: JSON.parse(row.output_images)
    };
  }
}
