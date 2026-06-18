#!/usr/bin/env node
/**
 * Diagnose the visible Roll20 root-crop mismatch.
 *
 * This script does not log into Roll20. It consumes the local-only evidence
 * produced by roll20_actual_screenshot_diff.mjs and writes ignored diagnostics:
 * local visible crop, normalized Roll20 crop, diff overlay, and mismatch bands.
 *
 * Usage:
 *   node scripts/roll20_visible_crop_diagnostics.mjs \
 *     reports/roll20-actual-compare/<run-label>
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const RUN_DIR = path.resolve(args[0] ?? 'reports/roll20-actual-compare/latest');
const DIFF_JSON = path.join(RUN_DIR, 'actual-screenshot-diff', 'actual-screenshot-diff-results.json');
const BASELINE_DIR = path.join(RUN_DIR, 'local-baseline');
const OUT_DIR = path.join(RUN_DIR, 'visible-crop-diagnostics');
const THRESHOLD = Number(argOf('--threshold', '60'));
const LOCAL_SEARCH_STEP = Number(argOf('--local-search-step', '64'));
const LOCAL_SEARCH_MAX_Y = Number(argOf('--local-search-max-y', '0'));

function argOf(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

function pct(value) {
  return typeof value === 'number' ? `${(value * 100).toFixed(2)}%` : '';
}

function fmtSize(size) {
  return Array.isArray(size) ? `${size[0]}x${size[1]}` : '';
}

function mimeFor(file) {
  const ext = path.extname(file).toLowerCase();
  return ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
}

async function imageDataUrl(file) {
  const bytes = await readFile(file);
  return `data:${mimeFor(file)};base64,${bytes.toString('base64')}`;
}

async function writeDataUrl(file, dataUrl) {
  const base64 = dataUrl.split(',')[1] ?? '';
  await writeFile(file, Buffer.from(base64, 'base64'));
}

function targetPairs(diffReport) {
  return (diffReport.items ?? [])
    .filter((item) => item.target === 'sandbox')
    .filter((item) => item.status === 'DIFFED')
    .filter((item) => item.result?.actualMeta?.cssCrop)
    .map((item) => {
      const fixtureId = item.fixtureId;
      const shotsDir = path.join(BASELINE_DIR, fixtureId, 'screenshots');
      return {
        fixtureId,
        local: path.join(shotsDir, 'local-preview.png'),
        actual: path.join(shotsDir, 'roll20-sandbox-root.png'),
        actualMeta: item.result.actualMeta,
        comparedSize: item.result.comparedSize,
        previousMismatchRatio: item.result.best?.mismatchRatio ?? null,
      };
    });
}

async function diagnosePair(page, pair, outDir) {
  const localUrl = await imageDataUrl(pair.local);
  const actualUrl = await imageDataUrl(pair.actual);
  const result = await page.evaluate(
    async ({ localUrl, actualUrl, actualMeta, threshold, localSearchStep, localSearchMaxY }) => {
      function loadImage(src) {
        return new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = () => reject(new Error(`image load failed: ${src.slice(0, 80)}`));
          image.src = src;
        });
      }

      function drawImageTo(image, width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight, 0, 0, width, height);
        return { canvas, ctx, data: ctx.getImageData(0, 0, width, height) };
      }

      function cropLocal(image, width, height) {
        return cropLocalAt(image, width, height, 0, 0);
      }

      function cropLocalAt(image, width, height, x, y) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(image, x, y, width, height, 0, 0, width, height);
        return { canvas, ctx, data: ctx.getImageData(0, 0, width, height) };
      }

      function blankBands() {
        return {
          top: { mismatch: 0, total: 0 },
          right: { mismatch: 0, total: 0 },
          bottom: { mismatch: 0, total: 0 },
          left: { mismatch: 0, total: 0 },
          center: { mismatch: 0, total: 0 },
        };
      }

      function blankQuadrants() {
        return {
          topLeft: { mismatch: 0, total: 0 },
          topRight: { mismatch: 0, total: 0 },
          bottomLeft: { mismatch: 0, total: 0 },
          bottomRight: { mismatch: 0, total: 0 },
        };
      }

      function pushMean(acc, data, offset) {
        acc.r += data[offset];
        acc.g += data[offset + 1];
        acc.b += data[offset + 2];
      }

      const [localImage, actualImage] = await Promise.all([loadImage(localUrl), loadImage(actualUrl)]);
      const cssCrop = actualMeta?.cssCrop ?? {};
      const width = Math.min(localImage.naturalWidth, Math.max(1, Math.round(cssCrop.w ?? actualImage.naturalWidth)));
      const height = Math.min(localImage.naturalHeight, Math.max(1, Math.round(cssCrop.h ?? actualImage.naturalHeight)));
      const actual = drawImageTo(actualImage, width, height);
      const local = cropLocal(localImage, width, height);
      const overlay = document.createElement('canvas');
      overlay.width = width;
      overlay.height = height;
      const overlayCtx = overlay.getContext('2d', { willReadFrequently: true });
      const overlayData = overlayCtx.createImageData(width, height);

      function compareData(localData, actualData, paintData) {
        let mismatch = 0;
        let sumSq = 0;
        const bounds = { left: width, top: height, right: -1, bottom: -1 };
        for (let i = 0, p = 0; i < localData.data.length; i += 4, p += 1) {
          const x = p % width;
          const y = Math.floor(p / width);
          const dr = Math.abs(localData.data[i] - actualData.data[i]);
          const dg = Math.abs(localData.data[i + 1] - actualData.data[i + 1]);
          const db = Math.abs(localData.data[i + 2] - actualData.data[i + 2]);
          const delta = dr + dg + db;
          const mismatchPixel = delta > threshold;
          sumSq += dr * dr + dg * dg + db * db;
          if (mismatchPixel) {
            mismatch += 1;
            bounds.left = Math.min(bounds.left, x);
            bounds.top = Math.min(bounds.top, y);
            bounds.right = Math.max(bounds.right, x);
            bounds.bottom = Math.max(bounds.bottom, y);
          }
          if (paintData) {
            paintData.data[i] = mismatchPixel ? 255 : Math.round(actualData.data[i] * 0.65);
            paintData.data[i + 1] = mismatchPixel ? 0 : Math.round(actualData.data[i + 1] * 0.65);
            paintData.data[i + 2] = mismatchPixel ? 96 : Math.round(actualData.data[i + 2] * 0.65);
            paintData.data[i + 3] = 255;
          }
        }
        const totalPixels = width * height;
        return {
          mismatch,
          totalPixels,
          mismatchRatio: Number((mismatch / totalPixels).toFixed(6)),
          rmsRgb: Number(Math.sqrt(sumSq / (totalPixels * 3)).toFixed(3)),
          bounds: mismatch ? [bounds.left, bounds.top, bounds.right - bounds.left + 1, bounds.bottom - bounds.top + 1] : null,
        };
      }

      function findBestLocalCrop() {
        const maxX = Math.max(0, localImage.naturalWidth - width);
        const maxY = Math.min(Math.max(0, localImage.naturalHeight - height), Math.max(0, localSearchMaxY));
        let best = null;
        function test(x, y) {
          const crop = cropLocalAt(localImage, width, height, x, y);
          const stats = compareData(crop.data, actual.data);
          const candidate = { crop: [x, y, width, height], ...stats };
          if (!best || candidate.mismatchRatio < best.mismatchRatio) best = candidate;
        }
        for (let y = 0; y <= maxY; y += localSearchStep) {
          for (let x = 0; x <= maxX; x += localSearchStep) test(x, y);
        }
        test(maxX, 0);
        test(0, maxY);
        test(maxX, maxY);
        if (!best) return null;
        const [bestX, bestY] = best.crop;
        const refineStep = Math.max(2, Math.floor(localSearchStep / 8));
        const startX = Math.max(0, bestX - localSearchStep);
        const endX = Math.min(maxX, bestX + localSearchStep);
        const startY = Math.max(0, bestY - localSearchStep);
        const endY = Math.min(maxY, bestY + localSearchStep);
        for (let y = startY; y <= endY; y += refineStep) {
          for (let x = startX; x <= endX; x += refineStep) test(x, y);
        }
        return best;
      }

      const mismatchGrid = Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => ({ mismatch: 0, total: 0 })));
      const bands = blankBands();
      const quadrants = blankQuadrants();
      const mismatchBounds = { left: width, top: height, right: -1, bottom: -1 };
      const meanLocal = { r: 0, g: 0, b: 0 };
      const meanActual = { r: 0, g: 0, b: 0 };
      const meanMismatchLocal = { r: 0, g: 0, b: 0 };
      const meanMismatchActual = { r: 0, g: 0, b: 0 };
      const edgeX = Math.max(24, Math.round(width * 0.08));
      const edgeY = Math.max(24, Math.round(height * 0.08));
      let sumSq = 0;
      let mismatch = 0;
      let mismatchSumSq = 0;

      for (let i = 0, p = 0; i < local.data.data.length; i += 4, p += 1) {
        const x = p % width;
        const y = Math.floor(p / width);
        const dr = Math.abs(local.data.data[i] - actual.data.data[i]);
        const dg = Math.abs(local.data.data[i + 1] - actual.data.data[i + 1]);
        const db = Math.abs(local.data.data[i + 2] - actual.data.data[i + 2]);
        const delta = dr + dg + db;
        const mismatchPixel = delta > threshold;
        const gridX = Math.min(3, Math.floor((x / width) * 4));
        const gridY = Math.min(3, Math.floor((y / height) * 4));
        const quadrant = (y < height / 2 ? 'top' : 'bottom') + (x < width / 2 ? 'Left' : 'Right');
        const band = y < edgeY ? 'top' : y >= height - edgeY ? 'bottom' : x < edgeX ? 'left' : x >= width - edgeX ? 'right' : 'center';

        mismatchGrid[gridY][gridX].total += 1;
        quadrants[quadrant].total += 1;
        bands[band].total += 1;
        pushMean(meanLocal, local.data.data, i);
        pushMean(meanActual, actual.data.data, i);
        sumSq += dr * dr + dg * dg + db * db;

        if (mismatchPixel) {
          mismatch += 1;
          mismatchGrid[gridY][gridX].mismatch += 1;
          quadrants[quadrant].mismatch += 1;
          bands[band].mismatch += 1;
          mismatchBounds.left = Math.min(mismatchBounds.left, x);
          mismatchBounds.top = Math.min(mismatchBounds.top, y);
          mismatchBounds.right = Math.max(mismatchBounds.right, x);
          mismatchBounds.bottom = Math.max(mismatchBounds.bottom, y);
          pushMean(meanMismatchLocal, local.data.data, i);
          pushMean(meanMismatchActual, actual.data.data, i);
          mismatchSumSq += dr * dr + dg * dg + db * db;
        }

        overlayData.data[i] = mismatchPixel ? 255 : Math.round(actual.data.data[i] * 0.65);
        overlayData.data[i + 1] = mismatchPixel ? 0 : Math.round(actual.data.data[i + 1] * 0.65);
        overlayData.data[i + 2] = mismatchPixel ? 96 : Math.round(actual.data.data[i + 2] * 0.65);
        overlayData.data[i + 3] = 255;
      }
      overlayCtx.putImageData(overlayData, 0, 0);
      const bestLocalCrop = findBestLocalCrop();
      const bestLocalCanvas = bestLocalCrop ? cropLocalAt(localImage, width, height, bestLocalCrop.crop[0], bestLocalCrop.crop[1]).canvas : null;

      function withRatio(obj) {
        return Object.fromEntries(Object.entries(obj).map(([key, value]) => [
          key,
          {
            ...value,
            ratio: value.total ? Number((value.mismatch / value.total).toFixed(6)) : 0,
          },
        ]));
      }

      function mean(acc, count) {
        if (!count) return null;
        return {
          r: Number((acc.r / count).toFixed(2)),
          g: Number((acc.g / count).toFixed(2)),
          b: Number((acc.b / count).toFixed(2)),
        };
      }

      const totalPixels = width * height;
      const gridWithRatio = mismatchGrid.map((row) => row.map((cell) => ({
        ...cell,
        ratio: cell.total ? Number((cell.mismatch / cell.total).toFixed(6)) : 0,
      })));
      const bandRatios = withRatio(bands);
      const quadrantRatios = withRatio(quadrants);
      const dominantBand = Object.entries(bandRatios).sort((a, b) => b[1].ratio - a[1].ratio)[0]?.[0] ?? null;
      const dominantQuadrant = Object.entries(quadrantRatios).sort((a, b) => b[1].ratio - a[1].ratio)[0]?.[0] ?? null;
      const mismatchRatio = Number((mismatch / totalPixels).toFixed(6));
      return {
        status: 'DIAGNOSED',
        localSize: [localImage.naturalWidth, localImage.naturalHeight],
        actualRawSize: [actualImage.naturalWidth, actualImage.naturalHeight],
        comparedSize: [width, height],
        threshold,
        mismatchPixels: mismatch,
        totalPixels,
        mismatchRatio,
        bestLocalCrop,
        localCropImprovementRatio: bestLocalCrop ? Number((mismatchRatio - bestLocalCrop.mismatchRatio).toFixed(6)) : null,
        rmsRgb: Number(Math.sqrt(sumSq / (totalPixels * 3)).toFixed(3)),
        mismatchRmsRgb: mismatch ? Number(Math.sqrt(mismatchSumSq / (mismatch * 3)).toFixed(3)) : 0,
        mismatchBounds: mismatch ? [
          mismatchBounds.left,
          mismatchBounds.top,
          mismatchBounds.right - mismatchBounds.left + 1,
          mismatchBounds.bottom - mismatchBounds.top + 1,
        ] : null,
        dominantBand,
        dominantQuadrant,
        bands: bandRatios,
        quadrants: quadrantRatios,
        grid4x4: gridWithRatio,
        meanLocalRgb: mean(meanLocal, totalPixels),
        meanActualRgb: mean(meanActual, totalPixels),
        meanMismatchLocalRgb: mean(meanMismatchLocal, mismatch),
        meanMismatchActualRgb: mean(meanMismatchActual, mismatch),
        artifacts: {
          localVisibleCrop: local.canvas.toDataURL('image/png'),
          bestLocalVisibleCrop: bestLocalCanvas ? bestLocalCanvas.toDataURL('image/png') : null,
          actualVisibleNormalized: actual.canvas.toDataURL('image/png'),
          diffOverlay: overlay.toDataURL('image/png'),
        },
      };
    },
    {
      localUrl,
      actualUrl,
      actualMeta: pair.actualMeta,
      threshold: THRESHOLD,
      localSearchStep: LOCAL_SEARCH_STEP,
      localSearchMaxY: LOCAL_SEARCH_MAX_Y,
    },
  );

  const artifactDir = path.join(outDir, pair.fixtureId);
  await mkdir(artifactDir, { recursive: true });
  const artifacts = {
    localVisibleCrop: path.join(artifactDir, 'local-visible-crop.png'),
    bestLocalVisibleCrop: path.join(artifactDir, 'best-local-visible-crop.png'),
    actualVisibleNormalized: path.join(artifactDir, 'actual-visible-normalized.png'),
    diffOverlay: path.join(artifactDir, 'visible-diff-overlay.png'),
  };
  const writes = [
    writeDataUrl(artifacts.localVisibleCrop, result.artifacts.localVisibleCrop),
    result.artifacts.bestLocalVisibleCrop ? writeDataUrl(artifacts.bestLocalVisibleCrop, result.artifacts.bestLocalVisibleCrop) : null,
    writeDataUrl(artifacts.actualVisibleNormalized, result.artifacts.actualVisibleNormalized),
    writeDataUrl(artifacts.diffOverlay, result.artifacts.diffOverlay),
  ].filter(Boolean);
  await Promise.all(writes);
  delete result.artifacts;
  return {
    ...pair,
    status: 'DIAGNOSED',
    result,
    artifacts,
    hypothesis: buildHypothesis(result),
  };
}

function buildHypothesis(result) {
  const notes = [];
  if (result.mismatchRatio >= 0.15) notes.push('large visible style/state delta');
  else if (result.mismatchRatio >= 0.05) notes.push('medium visible style/state delta');
  else notes.push('low visible delta');
  if (typeof result.localCropImprovementRatio === 'number') {
    if (result.localCropImprovementRatio < 0.02) notes.push('local crop search does not explain mismatch');
    else notes.push(`local crop search improves ${pct(result.localCropImprovementRatio)}`);
  }
  if (result.dominantBand && result.dominantBand !== 'center') notes.push(`edge-heavy ${result.dominantBand}`);
  if (result.mismatchBounds && result.mismatchBounds[2] >= result.comparedSize[0] * 0.9 && result.mismatchBounds[3] >= result.comparedSize[1] * 0.9) {
    notes.push('mismatch spans nearly entire visible crop');
  }
  const local = result.meanMismatchLocalRgb;
  const actual = result.meanMismatchActualRgb;
  if (local && actual) {
    const luminanceLocal = 0.2126 * local.r + 0.7152 * local.g + 0.0722 * local.b;
    const luminanceActual = 0.2126 * actual.r + 0.7152 * actual.g + 0.0722 * actual.b;
    const delta = luminanceActual - luminanceLocal;
    if (Math.abs(delta) >= 20) notes.push(delta > 0 ? 'actual mismatch pixels are brighter' : 'actual mismatch pixels are darker');
  }
  return notes.join('; ');
}

function renderMarkdown(report) {
  const lines = [
    '# Roll20 Visible Crop Diagnostics',
    '',
    `Run dir: \`${report.runDir}\``,
    `Generated: ${report.generatedAt}`,
    '',
    'Scope: local-only diagnosis for matched visible viewport mismatches. This is not a Roll20 visual parity claim.',
    '',
    '| Fixture | Status | Compared | Mismatch | Best local crop | Crop gain | RMS | Bounds | Dominant band | Dominant quadrant | Hypothesis | Artifacts |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |',
  ];
  for (const item of report.items) {
    const result = item.result ?? {};
    const artifacts = item.artifacts
      ? Object.values(item.artifacts).map((file) => `\`${path.relative(RUN_DIR, file)}\``).join('<br>')
      : '';
    lines.push(`| \`${item.fixtureId}\` | ${item.status} | ${fmtSize(result.comparedSize)} | ${pct(result.mismatchRatio)} | ${Array.isArray(result.bestLocalCrop?.crop) ? result.bestLocalCrop.crop.join(',') : ''} | ${pct(result.localCropImprovementRatio)} | ${result.rmsRgb ?? ''} | ${Array.isArray(result.mismatchBounds) ? result.mismatchBounds.join(',') : ''} | ${result.dominantBand ?? ''} | ${result.dominantQuadrant ?? ''} | ${item.hypothesis ?? ''} | ${artifacts} |`);
  }
  lines.push('');
  lines.push('## Interpretation');
  lines.push('');
  lines.push('- `Mismatch` is computed after normalizing the Roll20 root crop to its measured CSS crop size and comparing it to the matching top-left local preview crop.');
  lines.push('- `Best local crop` searches only the top of the local preview by default. Low crop gain means simple horizontal offset does not explain the mismatch. Pass `--local-search-max-y` only when intentionally testing vertical crop drift.');
  lines.push('- `Bounds` and `Dominant band/quadrant` tell where the visible mismatch clusters.');
  lines.push('- A wide/full bounds mismatch usually points to CSS/default-state/asset differences rather than a small crop offset.');
  lines.push('- Full-height or scroll-stitched Roll20 root evidence is still required before any full-sheet parity claim.');
  lines.push('- Generated PNG artifacts are local-only and ignored by Git.');
  return `${lines.join('\n')}\n`;
}

async function main() {
  if (!existsSync(DIFF_JSON)) throw new Error(`Missing diff report: ${DIFF_JSON}`);
  await mkdir(OUT_DIR, { recursive: true });
  const diffReport = JSON.parse(await readFile(DIFF_JSON, 'utf8'));
  const pairs = targetPairs(diffReport).filter((pair) => existsSync(pair.local) && existsSync(pair.actual));
  const report = {
    generatedAt: new Date().toISOString(),
    runDir: RUN_DIR,
    sourceDiffReport: DIFF_JSON,
    threshold: THRESHOLD,
    items: [],
  };
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  try {
    for (const pair of pairs) {
      const item = await diagnosePair(page, pair, OUT_DIR);
      report.items.push(item);
      console.log(`${item.status} ${item.fixtureId} visible mismatch=${pct(item.result.mismatchRatio)} ${item.hypothesis}`);
    }
  } finally {
    await browser.close();
  }
  report.summary = {
    diagnosed: report.items.length,
    maxMismatchRatio: report.items.reduce((max, item) => Math.max(max, item.result?.mismatchRatio ?? 0), 0),
  };
  await writeFile(path.join(OUT_DIR, 'visible-crop-diagnostics-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(OUT_DIR, 'visible-crop-diagnostics-results.md'), renderMarkdown(report), 'utf8');
  console.log(`ROLL20 VISIBLE CROP DIAGNOSTICS OK ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
