import { AppError } from './errors.js';

export async function readRequestBody(request, maxBytes) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) throw new AppError('REQUEST_TOO_LARGE', 'Request exceeds the upload limit.', 413);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export function parseMultipart(body, contentType) {
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType ?? '');
  if (!match) throw new AppError('INVALID_MULTIPART', 'Expected a multipart form upload.');
  const boundary = Buffer.from(`--${match[1] ?? match[2]}`);
  const parts = [];
  let cursor = body.indexOf(boundary);
  while (cursor !== -1) {
    const start = cursor + boundary.length;
    if (body.subarray(start, start + 2).toString() === '--') break;
    const contentStart = start + 2;
    const headerEnd = body.indexOf(Buffer.from('\r\n\r\n'), contentStart);
    if (headerEnd === -1) break;
    const nextBoundary = body.indexOf(boundary, headerEnd + 4);
    if (nextBoundary === -1) break;
    const headers = body.subarray(contentStart, headerEnd).toString('utf8');
    const contentEnd = nextBoundary - 2;
    const content = body.subarray(headerEnd + 4, contentEnd);
    const disposition = /content-disposition:\s*form-data;\s*name="([^"]+)"(?:;\s*filename="([^"]*)")?/i.exec(headers);
    if (disposition) {
      const field = disposition[1];
      const filename = disposition[2];
      const contentTypeMatch = /content-type:\s*([^\r\n]+)/i.exec(headers);
      parts.push(filename !== undefined ? { field, file: { data: Buffer.from(content), mime: (contentTypeMatch?.[1] ?? 'application/octet-stream').trim(), originalName: filename } } : { field, value: content.toString('utf8') });
    }
    cursor = nextBoundary;
  }
  return parts;
}
