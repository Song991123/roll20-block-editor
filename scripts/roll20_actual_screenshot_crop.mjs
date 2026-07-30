#!/usr/bin/env node
/**
 * Crop a Roll20 viewport screenshot using locally captured rect metadata.
 *
 * The Chrome extension can capture the Roll20 editor viewport even when the
 * character iframe document is not readable. Save a viewport screenshot plus
 * a JSON metadata file containing `viewport` and `iframeRect`/`dialogRect`,
 * then run this helper to create a normalized actual screenshot such as:
 *
 *   node scripts/roll20_actual_screenshot_crop.mjs \
 *     --image reports/.../screenshots/roll20-sandbox-viewport-full.png \
 *     --meta reports/.../screenshots/roll20-sandbox-root-crop-meta.json \
 *     --out reports/.../screenshots/roll20-sandbox-root.png \
 *     --rect iframeRect \
 *     --inset-css 24,58,24,0
 *
 * Insets are CSS pixels: left, top, right, bottom. They let agents remove the
 * Roll20 character tab chrome when the iframe document itself is inaccessible.
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const imagePath = requiredArg('--image');
const metaPath = requiredArg('--meta');
const outPath = requiredArg('--out');
const rectKey = argOf('--rect', 'iframeRect');
const insetCss = parseInset(argOf('--inset-css', '0,0,0,0'));

function argOf(name, fallback = '') {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

function requiredArg(name) {
  const value = argOf(name);
  if (!value) {
    console.error(`Missing ${name}`);
    process.exit(2);
  }
  return path.resolve(value);
}

function parseInset(value) {
  const parts = value.split(',').map((part) => Number(part.trim()));
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) {
    throw new Error(`Invalid --inset-css value. Expected left,top,right,bottom; got ${value}`);
  }
  return { left: parts[0], top: parts[1], right: parts[2], bottom: parts[3] };
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

function buildCssCrop(meta, imageSize) {
  const viewport = meta.viewport;
  const rect = meta[rectKey];
  if (!viewport?.w || !viewport?.h) {
    throw new Error(`Metadata is missing viewport.w/h: ${metaPath}`);
  }
  if (!rect?.w || !rect?.h) {
    throw new Error(`Metadata is missing ${rectKey}.w/h: ${metaPath}`);
  }

  const cssCrop = {
    x: rect.x + insetCss.left,
    y: rect.y + insetCss.top,
    w: rect.w - insetCss.left - insetCss.right,
    h: rect.h - insetCss.top - insetCss.bottom,
  };
  if (cssCrop.w <= 0 || cssCrop.h <= 0) {
    throw new Error(`Inset is larger than ${rectKey}: ${JSON.stringify({ rect, insetCss })}`);
  }

  const scaleX = imageSize.width / viewport.w;
  const scaleY = imageSize.height / viewport.h;
  return {
    cssCrop,
    pixelCrop: clampCrop({
      x: Math.round(cssCrop.x * scaleX),
      y: Math.round(cssCrop.y * scaleY),
      w: Math.round(cssCrop.w * scaleX),
      h: Math.round(cssCrop.h * scaleY),
    }, imageSize),
    scale: { x: scaleX, y: scaleY },
  };
}

function clampCrop(crop, imageSize) {
  const x = Math.max(0, Math.min(crop.x, imageSize.width - 1));
  const y = Math.max(0, Math.min(crop.y, imageSize.height - 1));
  const w = Math.max(1, Math.min(crop.w, imageSize.width - x));
  const h = Math.max(1, Math.min(crop.h, imageSize.height - y));
  return { x, y, w, h };
}

async function cropPng({ srcUrl, crop }) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 100, height: 100 } });
  try {
    return await page.evaluate(
      async ({ srcUrl, crop }) => {
        function loadImage(src) {
          return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error('image load failed'));
            image.src = src;
          });
        }

        const image = await loadImage(srcUrl);
        const canvas = document.createElement('canvas');
        canvas.width = crop.w;
        canvas.height = crop.h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);
        return {
          imageSize: { width: image.naturalWidth, height: image.naturalHeight },
          dataUrl: canvas.toDataURL('image/png'),
        };
      },
      { srcUrl, crop },
    );
  } finally {
    await browser.close();
  }
}

async function getImageSize(srcUrl) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 100, height: 100 } });
  try {
    return await page.evaluate(
      async (srcUrl) => {
        function loadImage(src) {
          return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error('image load failed'));
            image.src = src;
          });
        }
        const image = await loadImage(srcUrl);
        return { width: image.naturalWidth, height: image.naturalHeight };
      },
      srcUrl,
    );
  } finally {
    await browser.close();
  }
}

async function main() {
  if (!existsSync(imagePath)) throw new Error(`Missing image: ${imagePath}`);
  if (!existsSync(metaPath)) throw new Error(`Missing meta: ${metaPath}`);

  const sourceBytes = await readFile(imagePath);
  const srcUrl = await imageDataUrl(imagePath);
  const meta = JSON.parse(await readFile(metaPath, 'utf8'));
  const imageSize = await getImageSize(srcUrl);
  const cropInfo = buildCssCrop(meta, imageSize);
  const result = await cropPng({ srcUrl, crop: cropInfo.pixelCrop });
  const base64 = result.dataUrl.replace(/^data:image\/png;base64,/, '');

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, Buffer.from(base64, 'base64'));

  const infoPath = outPath.replace(/\.png$/i, '.json');
  const info = {
    generatedAt: new Date().toISOString(),
    sourceImage: path.relative(process.cwd(), imagePath),
    sourceMeta: path.relative(process.cwd(), metaPath),
    output: path.relative(process.cwd(), outPath),
    rectKey,
    insetCss,
    viewport: meta.viewport,
    imageSize,
    sourceMimeType: mimeTypeForBytes(sourceBytes, imagePath),
    outputMimeType: 'image/png',
    cssCrop: cropInfo.cssCrop,
    pixelCrop: cropInfo.pixelCrop,
    scale: cropInfo.scale,
    note: 'Local-only crop evidence. If iframe contentDocument was inaccessible, this may still include visible Roll20 tab chrome depending on --inset-css.',
  };
  await writeFile(infoPath, `${JSON.stringify(info, null, 2)}\n`, 'utf8');
  console.log(`ROLL20 ACTUAL SCREENSHOT CROP OK ${path.relative(process.cwd(), outPath)}`);
  console.log(`crop=${cropInfo.pixelCrop.x},${cropInfo.pixelCrop.y},${cropInfo.pixelCrop.w},${cropInfo.pixelCrop.h}`);
  console.log(`meta=${path.relative(process.cwd(), infoPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
