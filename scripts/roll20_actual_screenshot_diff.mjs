#!/usr/bin/env node
/**
 * Compare local baseline screenshots with Roll20 actual-screen screenshots.
 *
 * This is a local-only helper for reports/roll20-actual-compare/<run>/.
 * It never logs into Roll20. Capture Roll20 screenshots manually or with a
 * browser tool, place them under each fixture's screenshots folder, then run:
 *
 *   node scripts/roll20_actual_screenshot_diff.mjs \
 *     reports/roll20-actual-compare/<run-label>
 *
 * Expected optional actual screenshot names per fixture:
 *   - screenshots/roll20-sandbox-root-full-dpr-corrected.png (preferred DPR-corrected stitched full-height sheet-root capture)
 *   - screenshots/roll20-sandbox-root-full.png (fallback stitched full-height sheet-root capture)
 *   - screenshots/roll20-sandbox-root.png (fallback normalized sheet-root crop)
 *   - screenshots/roll20-sandbox.png (fallback full/viewport sandbox screenshot)
 *   - screenshots/roll20-room.png
 *   - screenshots/roll20-chat.png
 *
 * A missing Roll20 screenshot is reported as SKIP, not PASS.
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { classifyCaptureQuality, mimeTypeForBytes } from './lib/roll20CaptureQuality.mjs';

const args = process.argv.slice(2);
const RUN_DIR = path.resolve(args[0] ?? 'reports/roll20-actual-compare/latest');
const BASELINE_DIR = path.join(RUN_DIR, 'local-baseline');
const OUT_DIR = path.join(RUN_DIR, 'actual-screenshot-diff');
const THRESHOLD = Number(argOf('--threshold', '60'));
const SEARCH_STEP = Number(argOf('--search-step', '16'));
const MAX_CHAT_SIDECAR_AGE_MS = 5 * 60 * 1000;

function argOf(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

async function imageDataUrl(file) {
  const bytes = await readFile(file);
  return `data:${mimeTypeForBytes(bytes, file)};base64,${bytes.toString('base64')}`;
}

async function listFixtureDirs() {
  const entries = await readdir(BASELINE_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(BASELINE_DIR, entry.name))
    .sort((a, b) => path.basename(a).localeCompare(path.basename(b)));
}

function actualTargets(fixtureDir) {
  const shots = path.join(fixtureDir, 'screenshots');
  const localPreview = path.join(shots, 'local-preview.png');
  const localAuthoredRoot = path.join(shots, 'local-authored-root.png');
  const sandboxRootFullDprCorrected = path.join(shots, 'roll20-sandbox-root-full-dpr-corrected.png');
  const sandboxRootFull = path.join(shots, 'roll20-sandbox-root-full.png');
  const sandboxRoot = path.join(shots, 'roll20-sandbox-root.png');
  const sandboxFallback = path.join(shots, 'roll20-sandbox.png');
  const sandboxRootFullDprCorrectedMeta = sandboxRootFullDprCorrected.replace(/\.png$/i, '.json');
  const sandboxRootFullMeta = sandboxRootFull.replace(/\.png$/i, '.json');
  const sandboxRootMeta = sandboxRoot.replace(/\.png$/i, '.json');
  const sandboxCandidates = [
    { screenshot: sandboxRootFullDprCorrected, meta: sandboxRootFullDprCorrectedMeta },
    { screenshot: sandboxRootFull, meta: sandboxRootFullMeta },
    { screenshot: sandboxRoot, meta: sandboxRootMeta },
    { screenshot: sandboxFallback, meta: null },
  ];
  const sandboxSelected = sandboxCandidates.find((candidate) => existsSync(candidate.screenshot)) ?? sandboxCandidates.at(-1);
  const sandboxActual = sandboxSelected.screenshot;
  const sandboxActualMeta = sandboxSelected.meta && existsSync(sandboxSelected.meta) ? sandboxSelected.meta : null;
  const sandboxLocal = existsSync(localAuthoredRoot) && path.basename(sandboxActual).includes('root')
    ? localAuthoredRoot
    : localPreview;
  return [
    {
      name: 'sandbox',
      local: sandboxLocal,
      actual: sandboxActual,
      actualMeta: sandboxActualMeta,
      validation: validateSandboxEvidence(shots, sandboxSelected, sandboxFallback),
      expected: [sandboxRootFullDprCorrected, sandboxRootFull, sandboxRoot, sandboxFallback],
      purpose: 'Local preview vs Roll20 Custom Sheet Sandbox/test-room initial sheet.',
    },
    {
      name: 'room',
      local: localPreview,
      actual: path.join(shots, 'roll20-room.png'),
      purpose: 'Local preview vs existing solo-room observation.',
    },
    {
      name: 'chat',
      local: localPreview,
      actual: path.join(shots, 'roll20-chat.png'),
      validation: validateChatEvidence(shots),
      purpose: 'Roll20 chat/rolltemplate screenshot presence marker; visual diff is diagnostic only.',
    },
  ];
}

function validateSandboxEvidence(shots, selected, fallbackFile) {
  if (!existsSync(selected.screenshot)) {
    return { ok: false, status: 'SKIP', note: 'missing actual Roll20 screenshot' };
  }
  if (path.basename(selected.screenshot) !== path.basename(fallbackFile)) {
    const sidecar = selected.screenshot.replace(/\.(png|jpg|jpeg)$/i, '.json');
    const completeManifest = path.join(shots, 'roll20-root-dpr-complete-manifest.json');
    const correctedManifest = path.join(shots, 'roll20-root-dpr-corrected-manifest.json');
    if (existsSync(sidecar) || existsSync(completeManifest) || existsSync(correctedManifest)) {
      return { ok: true, status: 'OK', note: `root evidence present for ${path.basename(selected.screenshot)}` };
    }
    return {
      ok: false,
      status: 'SUSPECT',
      note: `${path.basename(selected.screenshot)} exists, but no root capture sidecar/manifest proves the iframe root was active`,
    };
  }

  const domEvidenceFile = path.join(shots, 'roll20-sandbox-dom-evidence.json');
  const domEvidence = readJsonIfExistsSync(domEvidenceFile);
  if (domEvidence && hasPositiveDomEvidence(domEvidence)) {
    return { ok: true, status: 'OK', note: 'fallback viewport screenshot has positive iframe DOM evidence' };
  }
  return {
    ok: false,
    status: 'SUSPECT',
    note: 'fallback roll20-sandbox.png exists, but no positive iframe DOM/root evidence proves the sheet rendered',
  };
}

function readJsonIfExistsSync(file) {
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  } catch {
    return null;
  }
}

function hasPositiveDomEvidence(evidence) {
  if (Number(evidence.bodyLen ?? 0) > 0) return true;
  if (Number(evidence.roots ?? evidence.rootCount ?? 0) > 0) return true;
  if (Array.isArray(evidence.rootSamples) && evidence.rootSamples.some((sample) => String(sample ?? '').trim().length > 0)) return true;
  if (evidence.textMarkers && Object.values(evidence.textMarkers).some(Boolean)) return true;
  return false;
}

function validateChatEvidence(shots) {
  const screenshot = path.join(shots, 'roll20-chat.png');
  const sidecar = path.join(shots, 'roll20-chat-dom-evidence.json');
  if (!existsSync(screenshot)) {
    return { ok: false, status: 'SKIP', note: 'missing Roll20 chat screenshot' };
  }
  const domEvidence = readJsonIfExistsSync(sidecar);
  if (!hasPositiveChatDomEvidence(domEvidence)) {
    return {
      ok: false,
      status: domEvidence ? 'SUSPECT' : 'SKIP',
      note: domEvidence
        ? 'Roll20 chat screenshot exists, but DOM sidecar does not show rendered rolltemplate markers'
        : 'Roll20 chat screenshot exists, but no DOM sidecar proves which rolltemplate rendered',
    };
  }
  const freshness = validateSidecarFreshness(screenshot, sidecar);
  if (!freshness.ok) return { ok: false, status: 'SUSPECT', note: freshness.note };
  return { ok: true, status: 'OK', note: 'Roll20 chat screenshot exists with fresh rolltemplate DOM sidecar' };
}

function hasPositiveChatDomEvidence(evidence) {
  if (!evidence) return false;
  if (Number(evidence.rolltemplateCount ?? 0) > 0) return true;
  if (Array.isArray(evidence.rolltemplates) && evidence.rolltemplates.length > 0) return true;
  if (evidence.textMarkers?.rolltemplate) return true;
  return false;
}

function validateSidecarFreshness(screenshot, sidecar) {
  if (!existsSync(screenshot) || !existsSync(sidecar)) {
    return { ok: false, note: 'Roll20 chat screenshot or DOM sidecar is missing' };
  }
  const screenshotStat = statSync(screenshot);
  const sidecarStat = statSync(sidecar);
  const deltaMs = Math.abs(screenshotStat.mtimeMs - sidecarStat.mtimeMs);
  if (deltaMs > MAX_CHAT_SIDECAR_AGE_MS) {
    return {
      ok: false,
      note: `Roll20 chat screenshot and DOM sidecar are stale relative to each other (${Math.round(deltaMs / 1000)}s apart)`,
    };
  }
  return { ok: true, note: 'Roll20 chat screenshot and DOM sidecar timestamps are close enough' };
}

async function comparePair(page, pair) {
  const [localUrl, actualUrl] = await Promise.all([imageDataUrl(pair.local), imageDataUrl(pair.actual)]);
  const actualMeta = pair.actualMeta ? JSON.parse(await readFile(pair.actualMeta, 'utf8')) : null;
  const actualBytes = await readFile(pair.actual);
  const captureQuality = classifyCaptureQuality({
    actualBytes,
    actualFile: pair.actual,
    actualMeta,
  });
  const browserResult = await page.evaluate(
    async ({ localUrl, actualUrl, actualMeta, threshold, searchStep }) => {
      function loadImage(src) {
        return new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = () => reject(new Error(`image load failed: ${src}`));
          image.src = src;
        });
      }

      function drawToCanvas(image) {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(image, 0, 0);
        return { canvas, ctx, data: ctx.getImageData(0, 0, canvas.width, canvas.height) };
      }

      function compareAt(localData, actualCanvas, crop, compareSize) {
        const [x, y] = crop;
        const [w, h] = compareSize;
        const scratch = document.createElement('canvas');
        scratch.width = w;
        scratch.height = h;
        const ctx = scratch.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(actualCanvas, x, y, w, h, 0, 0, w, h);
        const actual = ctx.getImageData(0, 0, w, h);
        let mismatch = 0;
        let sumSq = 0;
        let minX = w;
        let minY = h;
        let maxX = -1;
        let maxY = -1;
        for (let i = 0, p = 0; i < actual.data.length; i += 4, p += 1) {
          const dr = Math.abs(localData.data[i] - actual.data[i]);
          const dg = Math.abs(localData.data[i + 1] - actual.data[i + 1]);
          const db = Math.abs(localData.data[i + 2] - actual.data[i + 2]);
          const delta = dr + dg + db;
          sumSq += dr * dr + dg * dg + db * db;
          if (delta > threshold) {
            mismatch += 1;
            const px = p % w;
            const py = Math.floor(p / w);
            minX = Math.min(minX, px);
            minY = Math.min(minY, py);
            maxX = Math.max(maxX, px);
            maxY = Math.max(maxY, py);
          }
        }
        return {
          crop: [x, y, w, h],
          mismatchPixels: mismatch,
          totalPixels: w * h,
          mismatchRatio: Number((mismatch / (w * h)).toFixed(6)),
          rmsRgb: Number(Math.sqrt(sumSq / (w * h * 3)).toFixed(3)),
          bounds: mismatch ? [minX, minY, maxX - minX + 1, maxY - minY + 1] : null,
        };
      }

      const [localImage, actualImage] = await Promise.all([loadImage(localUrl), loadImage(actualUrl)]);
      const local = drawToCanvas(localImage);
      const actual = drawToCanvas(actualImage);
      const actualCompareCanvas = document.createElement('canvas');
      const actualCssCrop = actualMeta?.cssCrop;
      const normalizeActualToCssSize = Boolean(actualCssCrop?.w && actualCssCrop?.h);
      actualCompareCanvas.width = normalizeActualToCssSize ? Math.round(actualCssCrop.w) : actual.canvas.width;
      actualCompareCanvas.height = normalizeActualToCssSize ? Math.round(actualCssCrop.h) : actual.canvas.height;
      const actualCompareCtx = actualCompareCanvas.getContext('2d', { willReadFrequently: true });
      actualCompareCtx.drawImage(
        actual.canvas,
        0,
        0,
        actual.canvas.width,
        actual.canvas.height,
        0,
        0,
        actualCompareCanvas.width,
        actualCompareCanvas.height,
      );

      const w = Math.min(local.canvas.width, actualCompareCanvas.width);
      const h = Math.min(local.canvas.height, actualCompareCanvas.height);
      const localScratch = document.createElement('canvas');
      localScratch.width = w;
      localScratch.height = h;
      const localCtx = localScratch.getContext('2d', { willReadFrequently: true });
      localCtx.drawImage(local.canvas, 0, 0, w, h, 0, 0, w, h);
      const localCropData = localCtx.getImageData(0, 0, w, h);

      const candidates = [];
      candidates.push({ mode: 'top-left', ...compareAt(localCropData, actualCompareCanvas, [0, 0], [w, h]) });
      const maxX = Math.max(0, actualCompareCanvas.width - w);
      const maxY = Math.max(0, actualCompareCanvas.height - h);
      for (let y = 0; y <= maxY; y += searchStep) {
        for (let x = 0; x <= maxX; x += searchStep) {
          if (x === 0 && y === 0) continue;
          candidates.push({ mode: 'best-crop', ...compareAt(localCropData, actualCompareCanvas, [x, y], [w, h]) });
        }
      }
      const best = candidates.reduce((acc, item) => (!acc || item.mismatchRatio < acc.mismatchRatio ? item : acc), null);
      return {
        status: 'DIFFED',
        localSize: [local.canvas.width, local.canvas.height],
        actualSize: [actual.canvas.width, actual.canvas.height],
        actualNormalizedSize: normalizeActualToCssSize ? [actualCompareCanvas.width, actualCompareCanvas.height] : null,
        actualMeta: actualMeta
          ? {
              rectKey: actualMeta.rectKey ?? null,
              insetCss: actualMeta.insetCss ?? null,
              cssCrop: actualMeta.cssCrop ?? null,
              pixelCrop: actualMeta.pixelCrop ?? null,
              scale: actualMeta.scale ?? null,
            }
          : null,
        comparedSize: [w, h],
        topLeft: candidates[0],
        best,
        note: 'Diagnostic local-vs-Roll20 screenshot diff. Viewport/crop/default state still need human classification before parity claims.',
      };
    },
    {
      localUrl,
      actualUrl,
      actualMeta,
      threshold: THRESHOLD,
      searchStep: SEARCH_STEP,
    },
  );
  return {
    ...browserResult,
    captureQuality,
    authoritativePixelEvidence: captureQuality.authoritativePixelEvidence,
    note: captureQuality.authoritativePixelEvidence
      ? browserResult.note
      : `${browserResult.note} ${captureQuality.reason}; pixel metrics are non-authoritative until a lossless source is recaptured.`,
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Roll20 Actual Screenshot Diff');
  lines.push('');
  lines.push(`Run dir: \`${report.runDir}\``);
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push('');
  lines.push('This report is local-only and ignored by Git. Do not commit Roll20 screenshots or generated diff reports.');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Fixture | Target | Status | Capture | Local size | Actual size | Best mismatch | Best crop | Notes |');
  lines.push('| --- | --- | --- | --- | --- | --- | ---: | --- | --- |');
  for (const item of report.items) {
    const best = item.result?.best;
    const capture = item.result?.captureQuality?.status ?? '';
    lines.push(`| \`${item.fixtureId}\` | ${item.target} | ${item.status} | ${capture} | ${fmtSize(item.result?.localSize)} | ${fmtSize(item.result?.actualSize)} | ${best ? pct(best.mismatchRatio) : ''} | ${best ? best.crop.join(',') : ''} | ${item.note ?? ''} |`);
  }
  lines.push('');
  lines.push('## How To Add Evidence');
  lines.push('');
  lines.push('Place Roll20 screenshots next to the local baseline screenshots:');
  lines.push('');
  lines.push('- `local-baseline/<fixture>/screenshots/roll20-sandbox-root-full-dpr-corrected.png`');
  lines.push('- `local-baseline/<fixture>/screenshots/roll20-sandbox-root-full.png`');
  lines.push('- `local-baseline/<fixture>/screenshots/roll20-sandbox-root.png`');
  lines.push('- `local-baseline/<fixture>/screenshots/roll20-sandbox.png`');
  lines.push('- `local-baseline/<fixture>/screenshots/roll20-room.png`');
  lines.push('- `local-baseline/<fixture>/screenshots/roll20-chat.png`');
  lines.push('');
  lines.push('Then rerun this script. Missing actual screenshots remain SKIP and must not be reported as verified.');
  lines.push('Fallback `roll20-sandbox.png` screenshots without positive iframe DOM/root evidence are SUSPECT and are not diffed.');
  lines.push('');
  lines.push('## Scope');
  lines.push('');
  lines.push('- This compares screenshots only. It does not log into Roll20 or mutate rooms.');
  lines.push('- JPEG/WebP screenshots and PNG crops derived from lossy sources are diagnostic only. Recapture a true PNG source before using pixel mismatch to justify renderer CSS.');
  lines.push('- High mismatch must be classified by wrapper/context, base CSS, default state, translation, worker JS, rolltemplate/chat, asset loading, viewport/crop, or edit overlay.');
  lines.push('- A low mismatch is still not a Roll20 visual parity claim until default state and crop are reviewed.');
  return `${lines.join('\n')}\n`;
}

function fmtSize(size) {
  return Array.isArray(size) ? `${size[0]}x${size[1]}` : '';
}

function pct(ratio) {
  return `${(ratio * 100).toFixed(2)}%`;
}

async function main() {
  if (!existsSync(BASELINE_DIR)) {
    throw new Error(`Missing local baseline dir: ${BASELINE_DIR}`);
  }
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const report = {
    generatedAt: new Date().toISOString(),
    runDir: RUN_DIR,
    threshold: THRESHOLD,
    searchStep: SEARCH_STEP,
    items: [],
  };
  try {
    for (const fixtureDir of await listFixtureDirs()) {
      const fixtureId = path.basename(fixtureDir);
      for (const pair of actualTargets(fixtureDir)) {
        const item = {
          fixtureId,
          target: pair.name,
          purpose: pair.purpose,
          local: pair.local,
          actual: pair.actual,
        };
        if (!existsSync(pair.local)) {
          item.status = 'FAIL';
          item.note = 'missing local baseline screenshot';
        } else if (!existsSync(pair.actual)) {
          item.status = 'SKIP';
          item.note = pair.expected
            ? `missing ${pair.expected.map((file) => path.basename(file)).join(' or ')}`
            : `missing ${path.basename(pair.actual)}`;
        } else if (pair.validation && !pair.validation.ok) {
          item.status = pair.validation.status;
          item.note = pair.validation.note;
        } else {
          item.result = await comparePair(page, pair);
          item.status = 'DIFFED';
          item.note = pair.validation?.note ? `${pair.validation.note}; ${item.result.note}` : item.result.note;
        }
        report.items.push(item);
        console.log(`${item.status} ${fixtureId} ${pair.name}${item.result?.best ? ` mismatch=${pct(item.result.best.mismatchRatio)}` : ''}`);
      }
    }
  } finally {
    await browser.close();
  }

  report.summary = {
    diffed: report.items.filter((item) => item.status === 'DIFFED').length,
    untrustedCaptureDiffed: report.items.filter(
      (item) => item.status === 'DIFFED' && item.result?.authoritativePixelEvidence !== true,
    ).length,
    suspect: report.items.filter((item) => item.status === 'SUSPECT').length,
    skipped: report.items.filter((item) => item.status === 'SKIP').length,
    failed: report.items.filter((item) => item.status === 'FAIL').length,
  };
  await writeFile(path.join(OUT_DIR, 'actual-screenshot-diff-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(OUT_DIR, 'actual-screenshot-diff-results.md'), renderMarkdown(report), 'utf8');
  if (report.summary.failed > 0) process.exitCode = 1;
  console.log(`ROLL20 ACTUAL SCREENSHOT DIFF ${report.summary.failed ? 'FAIL' : 'OK'} ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
