import fs from 'node:fs/promises';
import path from 'node:path';
import { AppError } from './errors.js';

const roleFolders = { structure: 'input', style: 'input', output: 'output' };

export class LocalStorage {
  constructor(dataPath) { this.dataPath = dataPath; }

  async saveInput(taskId, role, file) {
    return this.#save(taskId, role, file, 'input');
  }

  async saveOutput(taskId, image, index = 1) {
    return this.#save(taskId, 'output', image, 'output', `result_${String(index).padStart(2, '0')}`);
  }

  async readAsset(reference) {
    const resolved = this.#resolve(reference.path);
    return fs.readFile(resolved);
  }

  async statAsset(reference) {
    const resolved = this.#resolve(reference.path);
    return fs.stat(resolved);
  }

  #resolve(relativePath) {
    const root = path.resolve(this.dataPath);
    const resolved = path.resolve(root, relativePath);
    if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) throw new AppError('ASSET_FORBIDDEN', 'Asset path is outside storage.', 403);
    return resolved;
  }

  async #save(taskId, role, file, folder, baseName = role) {
    const extension = extensionForMime(file.mime);
    const relativePath = path.join('tasks', taskId, folder, `${baseName}${extension}`);
    const absolutePath = this.#resolve(relativePath);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    try {
      await fs.writeFile(absolutePath, file.data, { flag: 'wx' });
    } catch (error) {
      throw new AppError('ASSET_PERSISTENCE_FAILED', 'Could not persist the image asset.', 500, error);
    }
    return { role, path: relativePath.replaceAll(path.sep, '/'), mime: file.mime, size: file.data.length, original_name: file.originalName ?? null };
  }
}

function extensionForMime(mime) {
  return ({ 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/gif': '.gif' })[mime] ?? '.bin';
}
