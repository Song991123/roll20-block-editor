import path from 'node:path';

const LOSSLESS_MIME_TYPES = new Set(['image/png']);

export function mimeTypeForBytes(bytes, file = '') {
  if (bytes?.[0] === 0xff && bytes?.[1] === 0xd8) return 'image/jpeg';
  if (bytes?.[0] === 0x89 && bytes?.[1] === 0x50 && bytes?.[2] === 0x4e && bytes?.[3] === 0x47) return 'image/png';
  if (
    bytes?.[0] === 0x52 &&
    bytes?.[1] === 0x49 &&
    bytes?.[2] === 0x46 &&
    bytes?.[3] === 0x46 &&
    bytes?.[8] === 0x57 &&
    bytes?.[9] === 0x45 &&
    bytes?.[10] === 0x42 &&
    bytes?.[11] === 0x50
  ) return 'image/webp';

  const ext = path.extname(file).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.png') return 'image/png';
  return 'application/octet-stream';
}

export function classifyCaptureQuality({ actualBytes, actualFile = '', actualMeta = null }) {
  const actualImageMimeType = mimeTypeForBytes(actualBytes, actualFile);
  const sourceImageMimeType = normalizeMime(
    actualMeta?.sourceMimeType ?? actualMeta?.sourceImageMimeType ?? actualImageMimeType,
  );
  const outputImageMimeType = normalizeMime(actualMeta?.outputMimeType ?? actualImageMimeType);
  const actualLossless = LOSSLESS_MIME_TYPES.has(actualImageMimeType);
  const sourceLossless = LOSSLESS_MIME_TYPES.has(sourceImageMimeType);
  const authoritativePixelEvidence = actualLossless && sourceLossless;

  let status = 'LOSSLESS_SOURCE';
  let reason = 'actual screenshot and recorded source are lossless PNG';
  if (!actualLossless) {
    status = 'LOSSY_OR_UNKNOWN_IMAGE';
    reason = `actual screenshot bytes are ${actualImageMimeType}`;
  } else if (!sourceLossless) {
    status = 'LOSSY_OR_UNKNOWN_SOURCE';
    reason = `PNG output was derived from ${sourceImageMimeType}`;
  }

  return {
    status,
    authoritativePixelEvidence,
    actualImageMimeType,
    sourceImageMimeType,
    outputImageMimeType,
    reason,
  };
}

function normalizeMime(value) {
  return String(value ?? '').trim().toLowerCase() || 'application/octet-stream';
}
