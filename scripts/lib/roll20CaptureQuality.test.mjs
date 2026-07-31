import assert from 'node:assert/strict';
import { classifyCaptureQuality, mimeTypeForBytes } from './roll20CaptureQuality.mjs';

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
const webp = Buffer.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);

assert.equal(mimeTypeForBytes(png, 'wrong.jpg'), 'image/png');
assert.equal(mimeTypeForBytes(jpeg, 'wrong.png'), 'image/jpeg');
assert.equal(mimeTypeForBytes(webp, 'wrong.png'), 'image/webp');

assert.deepEqual(
  classifyCaptureQuality({ actualBytes: png, actualFile: 'actual.png' }),
  {
    status: 'LOSSLESS_SOURCE',
    authoritativePixelEvidence: true,
    actualImageMimeType: 'image/png',
    sourceImageMimeType: 'image/png',
    outputImageMimeType: 'image/png',
    reason: 'actual screenshot and recorded source are lossless PNG',
  },
);

const croppedFromJpeg = classifyCaptureQuality({
  actualBytes: png,
  actualFile: 'actual-root.png',
  actualMeta: { sourceMimeType: 'image/jpeg', outputMimeType: 'image/png' },
});
assert.equal(croppedFromJpeg.status, 'LOSSY_OR_UNKNOWN_SOURCE');
assert.equal(croppedFromJpeg.authoritativePixelEvidence, false);

const disguisedJpeg = classifyCaptureQuality({ actualBytes: jpeg, actualFile: 'actual-room.png' });
assert.equal(disguisedJpeg.status, 'LOSSY_OR_UNKNOWN_IMAGE');
assert.equal(disguisedJpeg.authoritativePixelEvidence, false);

console.log('roll20 capture quality test PASS');
