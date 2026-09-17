import path from 'node:path';
import { loadEnvFile } from 'node:process';

const root = process.cwd();

try {
  loadEnvFile(path.join(root, '.env'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

function integerEnv(name, fallback) {
  const value = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function loadConfig(overrides = {}, environment = process.env) {
  const dataPath = path.resolve(root, overrides.dataPath ?? environment.DATA_PATH ?? './data');
  return {
    port: overrides.port ?? integerEnv('PORT', 3000),
    dataPath,
    databasePath: path.resolve(root, overrides.databasePath ?? environment.DATABASE_PATH ?? path.join(dataPath, 'rendering.sqlite')),
    providerName: overrides.providerName ?? environment.IMAGE_PROVIDER ?? 'openai',
    providerModel: overrides.providerModel ?? environment.IMAGE_PROVIDER_MODEL ?? 'gpt-image-2.5-sunburst',
    demoOutputPath: path.resolve(root, overrides.demoOutputPath ?? environment.DEMO_OUTPUT_PATH ?? './demo-assets/demo-residential.svg'),
    apiKey: overrides.apiKey ?? environment.OPENAI_API_KEY ?? environment.API_KEY ?? '',
    openAiBaseUrl: overrides.openAiBaseUrl ?? environment.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
    maxUploadBytes: overrides.maxUploadBytes ?? integerEnv('MAX_UPLOAD_BYTES', 10 * 1024 * 1024),
    providerTimeoutMs: overrides.providerTimeoutMs ?? integerEnv('PROVIDER_TIMEOUT_MS', 120_000)
  };
}
