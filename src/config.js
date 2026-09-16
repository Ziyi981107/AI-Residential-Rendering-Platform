import path from 'node:path';

const root = process.cwd();

function integerEnv(name, fallback) {
  const value = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function loadConfig(overrides = {}) {
  const dataPath = path.resolve(root, overrides.dataPath ?? process.env.DATA_PATH ?? './data');
  return {
    port: integerEnv('PORT', 3000),
    dataPath,
    databasePath: path.resolve(root, overrides.databasePath ?? process.env.DATABASE_PATH ?? path.join(dataPath, 'rendering.sqlite')),
    providerName: overrides.providerName ?? process.env.IMAGE_PROVIDER ?? 'openai',
    providerModel: overrides.providerModel ?? process.env.IMAGE_PROVIDER_MODEL ?? 'gpt-image-1',
    apiKey: overrides.apiKey ?? process.env.OPENAI_API_KEY ?? process.env.API_KEY ?? '',
    openAiBaseUrl: overrides.openAiBaseUrl ?? process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
    maxUploadBytes: overrides.maxUploadBytes ?? integerEnv('MAX_UPLOAD_BYTES', 10 * 1024 * 1024),
    providerTimeoutMs: overrides.providerTimeoutMs ?? integerEnv('PROVIDER_TIMEOUT_MS', 120_000)
  };
}
