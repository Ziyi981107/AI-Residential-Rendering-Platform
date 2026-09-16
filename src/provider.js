import fs from 'node:fs/promises';
import { AppError } from './errors.js';

export class OpenAIImageProvider {
  constructor({ apiKey, model, baseUrl = 'https://api.openai.com/v1', timeoutMs = 120_000, fetchImpl = fetch }) {
    this.apiKey = apiKey;
    this.model = model;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.timeoutMs = timeoutMs;
    this.fetchImpl = fetchImpl;
  }

  async generate(request) {
    if (!this.apiKey) throw new AppError('PROVIDER_NOT_CONFIGURED', 'Image generation is not configured on the server.', 503);
    const form = new FormData();
    form.append('model', this.model);
    form.append('prompt', request.prompt);
    form.append('n', '1');
    form.append('size', request.generation_options?.size ?? '1024x1024');
    form.append('quality', request.generation_options?.quality ?? 'medium');
    for (const image of [request.structure_image, request.style_image]) {
      const bytes = await fs.readFile(image.path);
      form.append('image[]', new Blob([bytes], { type: image.mime }), image.filename ?? 'reference.png');
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    let response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/images/edits`, { method: 'POST', headers: { Authorization: `Bearer ${this.apiKey}` }, body: form, signal: controller.signal });
    } catch (error) {
      const code = error.name === 'AbortError' ? 'PROVIDER_TIMEOUT' : 'PROVIDER_NETWORK_ERROR';
      throw new AppError(code, code === 'PROVIDER_TIMEOUT' ? 'The image provider timed out.' : 'The image provider could not be reached.', 502, error);
    } finally { clearTimeout(timeout); }
    if (!response.ok) {
      const category = response.status === 429 ? 'PROVIDER_RATE_LIMIT' : response.status >= 500 ? 'PROVIDER_5XX' : 'PROVIDER_4XX';
      throw new AppError(category, 'The image provider rejected the generation request.', 502);
    }
    let payload;
    try { payload = await response.json(); } catch (error) { throw new AppError('PROVIDER_MALFORMED_RESPONSE', 'The image provider returned an invalid response.', 502, error); }
    const item = payload?.data?.[0];
    if (!item?.b64_json && !item?.url) throw new AppError('PROVIDER_EMPTY_OUTPUT', 'The image provider returned no image.', 502);
    let data;
    if (item.b64_json) data = Buffer.from(item.b64_json, 'base64');
    else {
      const imageResponse = await this.fetchImpl(item.url);
      if (!imageResponse.ok) throw new AppError('PROVIDER_OUTPUT_DOWNLOAD_FAILED', 'The generated image could not be retrieved.', 502);
      data = Buffer.from(await imageResponse.arrayBuffer());
    }
    if (!data.length) throw new AppError('PROVIDER_EMPTY_OUTPUT', 'The image provider returned an empty image.', 502);
    return { generated_images: [{ data, mime: item.b64_json ? 'image/png' : (item.mime_type ?? 'image/png') }], provider: 'openai', provider_model: this.model, provider_metadata: { request_id: response.headers.get('x-request-id') ?? null } };
  }
}

export class MockImageProvider {
  constructor({ model = 'mock' } = {}) { this.model = model; }
  async generate() {
    // A tiny valid PNG keeps local integration and browser flows deterministic without external API spend.
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
    return { generated_images: [{ data: png, mime: 'image/png' }], provider: 'mock', provider_model: this.model, provider_metadata: { mode: 'local-test' } };
  }
}
