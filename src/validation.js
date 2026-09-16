import { AppError } from './errors.js';

const signatures = [
  { mime: 'image/png', ext: '.png', test: (b) => b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
  { mime: 'image/jpeg', ext: '.jpg', test: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: 'image/gif', ext: '.gif', test: (b) => b.length >= 6 && (b.subarray(0, 6).toString() === 'GIF87a' || b.subarray(0, 6).toString() === 'GIF89a') },
  { mime: 'image/webp', ext: '.webp', test: (b) => b.length >= 12 && b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP' }
];

export function validateImage(file, role, maxBytes) {
  if (!file || !file.data?.length) throw new AppError(`MISSING_${role.toUpperCase()}_IMAGE`, `A ${role} reference image is required.`);
  if (file.data.length > maxBytes) throw new AppError('IMAGE_TOO_LARGE', `${role} image exceeds the ${Math.round(maxBytes / 1024 / 1024)} MB limit.`);
  const signature = signatures.find((item) => item.test(file.data));
  if (!signature) throw new AppError('UNSUPPORTED_IMAGE', `${role} image must be a valid PNG, JPEG, WebP, or GIF.`);
  return { ...file, mime: signature.mime, extension: signature.ext };
}

export function validateRenderInput({ structure, style, userInstruction = '' }, maxBytes) {
  const cleanInstruction = String(userInstruction ?? '').trim();
  if (cleanInstruction.length > 4000) throw new AppError('INSTRUCTION_TOO_LONG', 'Additional requirements must be 4,000 characters or fewer.');
  return {
    structure: validateImage(structure, 'structure', maxBytes),
    style: validateImage(style, 'style', maxBytes),
    userInstruction: cleanInstruction
  };
}
