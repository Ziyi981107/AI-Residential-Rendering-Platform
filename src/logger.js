import fs from 'node:fs/promises';
import path from 'node:path';

export function createLogger(dataPath) {
  const logPath = path.join(dataPath, 'logs', 'operations.log');
  async function write(entry) {
    await fs.mkdir(path.dirname(logPath), { recursive: true });
    await fs.appendFile(logPath, `${JSON.stringify({ timestamp: new Date().toISOString(), ...entry })}\n`, 'utf8');
  }
  return {
    transition(task, from, to) {
      return write({ task_id: task.id, task_status_transition: `${from ?? 'none'}->${to}`, prompt_version: task.prompt_version, provider: task.provider, provider_model: task.provider_model });
    },
    outcome(entry) { return write(entry); },
    path: logPath
  };
}
