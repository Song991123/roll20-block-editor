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
 *     --inset-css 24,58,24,0 \
 *     --normalize-css-size
 *
 * Insets are CSS pixels: left, top, right, bottom. They let agents remove the
 * Roll20 character tab chrome when the iframe document itself is inaccessible.
 * When Chrome exposes an independently anchored compositor surface, pass its
 * verified physical `x,y,width,height` through `--source-pixel-rect`.
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
const normalizeCssSize = args.includes('--normalize-css-size');
const sourcePixelRect = parseOptionalRect(argOf('--source-pixel-rect'));

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

function parseOptionalRect(value) {
  if (!value) return null;
  const parts = value.split(',').map((part) => Number(part.trim()));
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) {
    throw new Error(`Invalid --source-pixel-rect value. Expected x,y,width,height; got ${value}`);
  }
  const [x, y, w, h] = parts;
  if (w <= 0 || h <= 0) {
    throw new Error(`Invalid --source-pixel-rect dimensions: ${value}`);
  }
  return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
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
  const viewportWidth = viewport?.w ?? viewport?.width;
  const viewportHeight = viewport?.h ?? viewport?.height;
  const rectWidth = rect?.w ?? rect?.width;
  const rectHeight = rect?.h ?? rect?.height;
  if (!viewportWidth || !viewportHeight) {
    throw new Error(`Metadata is missing viewport width/height: ${metaPath}`);
  }
  if (!rectWidth || !rectHeight) {
    throw new Error(`Metadata is missing ${rectKey} width/height: ${metaPath}`);
  }

  const cssCrop = {
    x: rect.x + insetCss.left,
    y: rect.y + insetCss.top,
    w: rectWidth - insetCss.left - insetCss.right,
    h: rectHeight - insetCss.top - insetCss.bottom,
  };
  if (cssCrop.w <= 0 || cssCrop.h <= 0) {
    throw new Error(`Inset is larger than ${rectKey}: ${JSON.stringify({ rect, insetCss })}`);
  }

  const scaleX = imageSize.width / viewportWidth;
  const scaleY = imageSize.height / viewportHeight;
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

async function cropPng({ srcUrl, crop, outputSize }) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 100, height: 100 } });
  try {
    return await page.evaluate(
      async ({ srcUrl, crop, outputSize }) => {
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
        canvas.width = outputSize.w;
        canvas.height = outputSize.h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, crop.x, crop.y, crop.w, crop.h, 0, 0, outputSize.w, outputSize.h);
        return {
          imageSize: { width: image.naturalWidth, height: image.naturalHeight },
          dataUrl: canvas.toDataURL('image/png'),
        };
      },
      { srcUrl, crop, outputSize },
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
  if (sourcePixelRect) {
    cropInfo.pixelCrop = clampCrop(sourcePixelRect, imageSize);
  }
  const effectiveScale = sourcePixelRect
    ? {
        x: cropInfo.pixelCrop.w / cropInfo.cssCrop.w,
        y: cropInfo.pixelCrop.h / cropInfo.cssCrop.h,
      }
    : cropInfo.scale;
  const outputSize = normalizeCssSize
    ? {
        w: Math.max(1, Math.round(cropInfo.cssCrop.w)),
        h: Math.max(1, Math.round(cropInfo.cssCrop.h)),
      }
    : { w: cropInfo.pixelCrop.w, h: cropInfo.pixelCrop.h };
  const result = await cropPng({ srcUrl, crop: cropInfo.pixelCrop, outputSize });
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
    sourcePixelRect,
    outputSize,
    scale: effectiveScale,
    normalizeCssSize,
    captureDprCorrection: buildDprCorrection(cropInfo, outputSize, effectiveScale),
    note: normalizeCssSize
      ? sourcePixelRect
        ? 'Local-only true-PNG crop normalized from an explicitly verified compositor-surface pixel rect to the measured CSS crop size.'
        : 'Local-only true-PNG crop normalized from physical screenshot pixels to the measured CSS crop size.'
      : 'Local-only crop evidence. If iframe contentDocument was inaccessible, this may still include visible Roll20 tab chrome depending on --inset-css.',
  };
  await writeFile(infoPath, `${JSON.stringify(info, null, 2)}\n`, 'utf8');
  console.log(`ROLL20 ACTUAL SCREENSHOT CROP OK ${path.relative(process.cwd(), outPath)}`);
  console.log(`crop=${cropInfo.pixelCrop.x},${cropInfo.pixelCrop.y},${cropInfo.pixelCrop.w},${cropInfo.pixelCrop.h}`);
  console.log(`meta=${path.relative(process.cwd(), infoPath)}`);
}

function buildDprCorrection(cropInfo, outputSize, scale) {
  const { cssCrop, pixelCrop } = cropInfo;
  const applied = normalizeCssSize
    && (Math.abs(scale.x - 1) > 0.01 || Math.abs(scale.y - 1) > 0.01);
  const cssClip = {
    x: cssCrop.x,
    y: cssCrop.y,
    left: cssCrop.x,
    top: cssCrop.y,
    right: cssCrop.x + cssCrop.w,
    bottom: cssCrop.y + cssCrop.h,
    width: cssCrop.w,
    height: cssCrop.h,
  };
  return {
    applied,
    sourceScale: scale,
    physicalClip: {
      x: pixelCrop.x,
      y: pixelCrop.y,
      width: pixelCrop.w,
      height: pixelCrop.h,
    },
    cssClip,
    physicalImage: { width: pixelCrop.w, height: pixelCrop.h },
    cssImage: { width: outputSize.w, height: outputSize.h },
    sourcePixelRectExplicit: Boolean(sourcePixelRect),
    reason: applied
      ? sourcePixelRect
        ? 'A true PNG compositor-surface capture used an explicitly verified physical pixel rect and was scaled back to the measured CSS clip size.'
        : 'A true PNG viewport capture was cropped in physical pixels and scaled back to the measured CSS clip size.'
      : 'No device-pixel correction was required for this crop.',
  };
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
