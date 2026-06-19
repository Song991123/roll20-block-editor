#!/usr/bin/env node
/**
 * Stitch Roll20 root viewport segments into one full-height root screenshot.
 *
 * This script never logs into Roll20. It consumes a local-only manifest written
 * after Chrome/CDP captures multiple viewport screenshots from a dedicated
 * Roll20 Custom Sheet Sandbox or test room. The output is ignored evidence,
 * usually:
 *
 *   local-baseline/<fixture>/screenshots/roll20-sandbox-root-full-dpr-corrected.png
 *
 * Manifest shape:
 *
 * {
 *   "outputCss": { "w": 852, "h": 4122 },
 *   "viewportCss": { "w": 900, "h": 672 },
 *   "scale": { "x": 1.25, "y": 1.25 },
 *   "segments": [
 *     {
 *       "image": "roll20-root-segment-000.png",
 *       "cropCss": { "x": 20, "y": 61.4, "w": 852, "h": 556 },
 *       "destCss": { "x": 0, "y": 0, "w": 852, "h": 556 },
 *       "scrollTop": 0
 *     }
 *   ]
 * }
 *
 * `image` may be absolute or relative to the manifest folder. Coordinates are
 * CSS pixels unless a segment provides `cropPx` / `destPx`.
 *
 * If the capture step already saved a clipped root segment, set
 * `"cropImage": "full"` on that segment. The stitcher will draw the whole
 * segment image into `destCss`, avoiding browser screenshot scale ambiguity.
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const manifestPath = path.resolve(argOf('--manifest', args[0] ?? ''));
const explicitOut = argOf('--out', '');

if (!manifestPath) {
  console.error('Usage: node scripts/roll20_actual_stitch_root.mjs --manifest <manifest.json> [--out <roll20-sandbox-root-full-dpr-corrected.png>]');
  process.exit(2);
}

function argOf(name, fallback = '') {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

function resolveFromManifest(file) {
  if (!file) return '';
  return path.isAbsolute(file) ? file : path.resolve(path.dirname(manifestPath), file);
}

async function imageDataUrl(file) {
  const bytes = await readFile(file);
  return `data:${mimeTypeForBytes(bytes, file)};base64,${bytes.toString('base64')}`;
}

function mimeTypeForBytes(bytes, file = '') {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  const ext = path.extname(file).toLowerCase();
  return ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
}

function toRect(rect, label) {
  const out = {
    x: Number(rect?.x ?? 0),
    y: Number(rect?.y ?? 0),
    w: Number(rect?.w ?? rect?.width ?? 0),
    h: Number(rect?.h ?? rect?.height ?? 0),
  };
  if (![out.x, out.y, out.w, out.h].every(Number.isFinite) || out.w <= 0 || out.h <= 0) {
    throw new Error(`Invalid ${label}: ${JSON.stringify(rect)}`);
  }
  return out;
}

function scaleRect(rect, scale) {
  return {
    x: Math.round(rect.x * scale.x),
    y: Math.round(rect.y * scale.y),
    w: Math.round(rect.w * scale.x),
    h: Math.round(rect.h * scale.y),
  };
}

async function stitch({ manifest, outputPath }) {
  const outputCss = toRect({ x: 0, y: 0, ...manifest.outputCss }, 'manifest.outputCss');
  const outputSize = { w: Math.round(outputCss.w), h: Math.round(outputCss.h) };
  const segments = manifest.segments ?? [];
  if (!Array.isArray(segments) || segments.length === 0) {
    throw new Error('Manifest has no segments');
  }

  const prepared = [];
  for (const [index, segment] of segments.entries()) {
    const imagePath = resolveFromManifest(segment.image);
    if (!existsSync(imagePath)) throw new Error(`Missing segment image ${index}: ${imagePath}`);
    const imageUrl = await imageDataUrl(imagePath);
    const scale = normalizeScale(segment.scale ?? manifest.scale, segment.viewportCss ?? manifest.viewportCss);
    const cropImageFull = segment.cropImage === 'full' || segment.cropPx === 'full';
    const cropCss = cropImageFull
      ? null
      : toRect(segment.cropCss ?? segment.cropPx, `segments[${index}].cropCss`);
    const destCss = toRect(segment.destCss ?? segment.destPx, `segments[${index}].destCss`);
    prepared.push({
      index,
      imagePath,
      imageUrl,
      cropCss,
      destCss,
      cropImageFull,
      cropPx: cropImageFull
        ? null
        : segment.cropPx
          ? toRect(segment.cropPx, `segments[${index}].cropPx`)
          : scaleRect(cropCss, scale),
      destPx: segment.destPx ? toRect(segment.destPx, `segments[${index}].destPx`) : {
        x: Math.round(destCss.x),
        y: Math.round(destCss.y),
        w: Math.round(destCss.w),
        h: Math.round(destCss.h),
      },
      scale,
      scrollTop: segment.scrollTop ?? null,
    });
  }
  const segmentHashSummary = await summarizePreparedSegmentHashes(prepared);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: Math.min(1200, Math.max(100, outputSize.w)), height: 800 } });
  try {
    const result = await page.evaluate(async ({ outputSize, prepared }) => {
      function loadImage(src) {
        return new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = () => reject(new Error('image load failed'));
          image.src = src;
        });
      }

      const canvas = document.createElement('canvas');
      canvas.width = outputSize.w;
      canvas.height = outputSize.h;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const segmentReports = [];
      for (const segment of prepared) {
        const image = await loadImage(segment.imageUrl);
        const crop = segment.cropImageFull
          ? { x: 0, y: 0, w: image.naturalWidth, h: image.naturalHeight }
          : segment.cropPx;
        const dest = segment.destPx;
        ctx.drawImage(
          image,
          crop.x,
          crop.y,
          crop.w,
          crop.h,
          dest.x,
          dest.y,
          dest.w,
          dest.h,
        );
        segmentReports.push({
          index: segment.index,
          imageSize: { width: image.naturalWidth, height: image.naturalHeight },
          cropPx: crop,
          destPx: dest,
          cropImageFull: segment.cropImageFull,
          scrollTop: segment.scrollTop,
        });
      }

      return {
        dataUrl: canvas.toDataURL('image/png'),
        segmentReports,
      };
    }, { outputSize, prepared });

    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, Buffer.from(result.dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64'));
    return {
      outputSize,
      segments: result.segmentReports,
      segmentHashSummary,
    };
  } finally {
    await browser.close();
  }
}

async function summarizePreparedSegmentHashes(prepared) {
  const items = [];
  for (const segment of prepared) {
    const bytes = await readFile(segment.imagePath);
    items.push({
      index: segment.index,
      file: segment.imagePath,
      hash: createHash('sha256').update(bytes).digest('hex'),
    });
  }
  const groups = new Map();
  for (const item of items) {
    if (!groups.has(item.hash)) groups.set(item.hash, []);
    groups.get(item.hash).push(item);
  }
  const duplicateGroups = [...groups.values()]
    .filter((group) => group.length > 1)
    .map((group) => ({
      hash: group[0].hash,
      indexes: group.map((item) => item.index),
      files: group.map((item) => path.relative(process.cwd(), item.file)),
    }));
  return {
    hashedSegmentCount: items.length,
    uniqueHashCount: groups.size,
    duplicateSegmentCount: duplicateGroups.reduce((sum, group) => sum + group.indexes.length, 0),
    duplicateGroups,
  };
}

function normalizeScale(scale, viewportCss) {
  const out = {
    x: Number(scale?.x ?? scale?.width ?? scale ?? 1),
    y: Number(scale?.y ?? scale?.height ?? scale ?? 1),
  };
  if (!Number.isFinite(out.x) || out.x <= 0) out.x = 1;
  if (!Number.isFinite(out.y) || out.y <= 0) out.y = out.x;
  if (viewportCss?.w && viewportCss?.h && out.x === 1 && out.y === 1) {
    // Keep the default. Actual image-size inference happens in the capture
    // step because each browser screenshot tool reports pixels differently.
  }
  return out;
}

async function main() {
  if (!existsSync(manifestPath)) throw new Error(`Missing manifest: ${manifestPath}`);
  const manifest = JSON.parse((await readFile(manifestPath, 'utf8')).replace(/^\uFEFF/, ''));
  const outputPath = path.resolve(explicitOut || resolveFromManifest(manifest.output || 'roll20-sandbox-root-full-dpr-corrected.png'));
  const result = await stitch({ manifest, outputPath });
  const infoPath = outputPath.replace(/\.png$/i, '.json');
  const info = {
    generatedAt: new Date().toISOString(),
    sourceManifest: path.relative(process.cwd(), manifestPath),
    output: path.relative(process.cwd(), outputPath),
    outputCss: manifest.outputCss,
    outputSize: result.outputSize,
    segmentCount: result.segments.length,
    segmentHashSummary: result.segmentHashSummary,
    segments: result.segments,
    scope: 'local-only stitched Roll20 root evidence; not Roll20 visual parity',
  };
  await writeFile(infoPath, `${JSON.stringify(info, null, 2)}\n`, 'utf8');

  console.log(`ROLL20 ACTUAL ROOT STITCH OK ${path.relative(process.cwd(), outputPath)}`);
  console.log(`size=${result.outputSize.w}x${result.outputSize.h}`);
  console.log(`segments=${result.segments.length}`);
  console.log(`meta=${path.relative(process.cwd(), infoPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
