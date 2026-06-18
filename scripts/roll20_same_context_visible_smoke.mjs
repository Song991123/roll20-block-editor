#!/usr/bin/env node
/**
 * Render local payloads in Roll20-like visible contexts and compare them against
 * the preferred actual Roll20 root crop.
 *
 * This is intentionally local-only. It consumes ignored evidence from
 * reports/roll20-actual-compare/<run-label>, renders the generated payload with
 * buildSheetDoc, applies the local state hint when available, captures several
 * visible-context candidates, and diffs those candidates against
 * roll20-sandbox-root.png.
 *
 * It does not log into Roll20 and it does not prove visual parity.
 */

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const require = createRequire(import.meta.url);
const args = process.argv.slice(2).filter((arg) => arg !== '--');
const runDir = path.resolve(args[0] ?? '');
const outDir = path.join(runDir, 'same-context-visible-smoke');
const threshold = Number(argOf('--threshold', '60'));

if (!args[0]) {
  console.error('Usage: node scripts/roll20_same_context_visible_smoke.mjs reports/roll20-actual-compare/<label>');
  process.exit(2);
}

function argOf(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

async function main() {
  const baseline = await readJsonRequired(path.join(runDir, 'local-baseline-results.json'));
  const diff = await readJsonRequired(path.join(runDir, 'actual-screenshot-diff', 'actual-screenshot-diff-results.json'));
  const { buildSheetDoc } = require(resolveBuildDocModule());
  if (typeof buildSheetDoc !== 'function') throw new Error('buildSheetDoc export missing');

  const fixtureIds = await listFixtureIds(path.join(runDir, 'local-baseline'));
  const browser = await chromium.launch({ headless: true });
  const comparePage = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const renderPage = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const report = {
    generatedAt: new Date().toISOString(),
    runDir,
    scope: 'local Roll20-like visible-context smoke; not visual parity',
    threshold,
    fixtures: [],
    pass: true,
  };

  try {
    await mkdir(outDir, { recursive: true });
    for (const fixtureId of fixtureIds) {
      const diffItem = (diff.items ?? []).find((item) => item.fixtureId === fixtureId && item.target === 'sandbox');
      if (!diffItem || diffItem.status !== 'DIFFED' || !diffItem.result?.actualMeta?.cssCrop) {
        report.fixtures.push({
          fixtureId,
          status: 'SKIP',
          reason: diffItem?.note ?? 'missing diffed Roll20 sandbox root crop',
        });
        console.log(`SKIP ${fixtureId} ${diffItem?.note ?? 'missing Roll20 root crop'}`);
        continue;
      }
      const item = await processFixture({
        fixtureId,
        baseline,
        diffItem,
        buildSheetDoc,
        comparePage,
        renderPage,
      });
      report.fixtures.push(item);
      console.log(`${item.status} ${fixtureId} best=${item.bestCandidate?.id ?? ''} mismatch=${pct(item.bestCandidate?.mismatchRatio)}`);
    }
  } finally {
    await browser.close();
  }

  report.summary = {
    compared: report.fixtures.filter((fixture) => fixture.status === 'COMPARED').length,
    skipped: report.fixtures.filter((fixture) => fixture.status === 'SKIP').length,
    bestMismatchRatio: report.fixtures
      .filter((fixture) => fixture.bestCandidate)
      .reduce((min, fixture) => Math.min(min, fixture.bestCandidate.mismatchRatio), Number.POSITIVE_INFINITY),
    parityVerified: false,
  };
  if (!Number.isFinite(report.summary.bestMismatchRatio)) report.summary.bestMismatchRatio = null;

  await writeFile(path.join(outDir, 'same-context-visible-smoke-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'same-context-visible-smoke-results.md'), renderMarkdown(report), 'utf8');
  console.log(`ROLL20 SAME-CONTEXT VISIBLE SMOKE OK ${outDir}`);
}

async function processFixture({ fixtureId, baseline, diffItem, buildSheetDoc, comparePage, renderPage }) {
  const fixtureDir = path.join(runDir, 'local-baseline', fixtureId);
  const payloadDir = path.join(fixtureDir, 'payload');
  const shotsDir = path.join(fixtureDir, 'screenshots');
  const actualFile = path.join(shotsDir, 'roll20-sandbox-root.png');
  const baselineFixture = baseline.fixtures?.find((fixture) => fixture.id === fixtureId) ?? null;
  const actualMeta = diffItem.result.actualMeta;
  const cssCrop = actualMeta.cssCrop;
  const comparedSize = [Math.round(cssCrop.w), Math.round(cssCrop.h)];
  const artifactDir = path.join(outDir, fixtureId);
  await mkdir(artifactDir, { recursive: true });

  const payload = {
    html: await readText(path.join(payloadDir, 'sheet.html')),
    css: await readText(path.join(payloadDir, 'sheet.css')),
    i18n: await readMaybe(path.join(payloadDir, 'translation.json')),
  };
  const stateCandidate = baselineFixture?.previewDom?.stateCandidate ?? baselineFixture?.previewStateCandidate ?? null;
  const candidates = [];

  candidates.push(await renderCandidate({
    id: 'normal-root-top-left',
    renderPage,
    comparePage,
    buildSheetDoc,
    payload,
    stateCandidate,
    actualFile,
    actualMeta,
    comparedSize,
    artifactDir,
    roll20SandboxSanitize: false,
    captureMode: 'root-top-left',
  }));

  candidates.push(await renderCandidate({
    id: 'sandbox-root-top-left',
    renderPage,
    comparePage,
    buildSheetDoc,
    payload,
    stateCandidate,
    actualFile,
    actualMeta,
    comparedSize,
    artifactDir,
    roll20SandboxSanitize: true,
    captureMode: 'root-top-left',
  }));

  candidates.push(await renderCandidate({
    id: 'sandbox-frame-inset',
    renderPage,
    comparePage,
    buildSheetDoc,
    payload,
    stateCandidate,
    actualFile,
    actualMeta,
    comparedSize,
    artifactDir,
    roll20SandboxSanitize: true,
    captureMode: 'frame-inset',
  }));

  candidates.push(await renderCandidate({
    id: 'sandbox-fit-visible-width',
    renderPage,
    comparePage,
    buildSheetDoc,
    payload,
    stateCandidate,
    actualFile,
    actualMeta,
    comparedSize,
    artifactDir,
    roll20SandboxSanitize: true,
    captureMode: 'fit-visible-width',
  }));

  const bestCandidate = candidates.reduce((best, candidate) =>
    !best || candidate.mismatchRatio < best.mismatchRatio ? candidate : best, null);
  const previousMismatchRatio = diffItem.result.best?.mismatchRatio ?? null;
  return {
    fixtureId,
    status: 'COMPARED',
    previousMismatchRatio,
    localPreviewSize: diffItem.result.localSize ?? null,
    actualRawSize: diffItem.result.actualSize ?? null,
    actualNormalizedSize: diffItem.result.actualNormalizedSize ?? null,
    comparedSize,
    actualMeta,
    stateCandidate: stateCandidate
      ? {
          actionName: stateCandidate.actionName ?? null,
          actionLabel: stateCandidate.actionLabel ?? null,
          hiddenAttrs: stateCandidate.hiddenAttrs ?? null,
          appliedLocally: stateCandidate.applied ?? Boolean(stateCandidate.appliedControls?.length),
        }
      : null,
    candidates,
    bestCandidate,
    interpretation: interpretCandidates(candidates, previousMismatchRatio),
  };
}

async function renderCandidate({
  id,
  renderPage,
  comparePage,
  buildSheetDoc,
  payload,
  stateCandidate,
  actualFile,
  actualMeta,
  comparedSize,
  artifactDir,
  roll20SandboxSanitize,
  captureMode,
}) {
  const doc = buildSheetDoc({
    html: payload.html,
    css: payload.css,
    i18n: payload.i18n,
    sanitize: false,
    darkMode: false,
    previewLayer: 'all',
    roll20SandboxSanitize,
  });
  const iframeWidth = Math.max(1, Math.round(actualMeta.cssCrop.w + (actualMeta.insetCss?.left ?? 0) + (actualMeta.insetCss?.right ?? 0)));
  const iframeHeight = Math.max(1, Math.round((actualMeta.cssCrop.h ?? comparedSize[1]) + (actualMeta.insetCss?.top ?? 0) + (actualMeta.insetCss?.bottom ?? 0)));
  await renderPage.setViewportSize({ width: Math.max(iframeWidth, comparedSize[0]), height: Math.max(iframeHeight, comparedSize[1]) });
  await renderPage.setContent(doc, { waitUntil: 'load' });
  await applyStateCandidate(renderPage, stateCandidate);
  await renderPage.waitForTimeout(300);

  const metrics = await renderPage.evaluate(() => {
    const root = document.querySelector('#charsheet-root');
    const dialog = document.querySelector('#dialog-window');
    const body = document.body;
    function rect(el) {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    }
    return {
      bodyScroll: { width: body.scrollWidth, height: body.scrollHeight },
      rootRect: rect(root),
      dialogRect: rect(dialog),
      sandboxMode: body.getAttribute('data-roll20-sandbox-sanitize') ?? '',
    };
  });

  const outFile = path.join(artifactDir, `${id}.png`);
  if (captureMode === 'frame-inset') {
    const left = Math.round(actualMeta.insetCss?.left ?? 0);
    const top = Math.round(actualMeta.insetCss?.top ?? 0);
    await renderPage.evaluate(({ left, top }) => {
      const dialog = document.querySelector('#dialog-window');
      if (dialog instanceof HTMLElement) {
        dialog.style.marginLeft = `${left}px`;
        dialog.style.marginTop = `${top}px`;
      }
    }, { left, top });
    await renderPage.screenshot({
      path: outFile,
      clip: {
        x: left,
        y: top,
        width: comparedSize[0],
        height: comparedSize[1],
      },
    });
  } else {
    const root = renderPage.locator('#charsheet-root');
    const rootBox = await root.boundingBox();
    if (!rootBox) throw new Error(`candidate ${id} has no #charsheet-root box`);
    if (captureMode === 'fit-visible-width') {
      const scale = comparedSize[0] / Math.max(1, rootBox.width);
      await renderPage.evaluate((scale) => {
        const root = document.querySelector('#charsheet-root');
        if (root instanceof HTMLElement) {
          root.style.transformOrigin = 'top left';
          root.style.transform = `scale(${scale})`;
        }
      }, scale);
      await renderPage.waitForTimeout(100);
    }
    const nextBox = await root.boundingBox();
    if (!nextBox) throw new Error(`candidate ${id} has no #charsheet-root box after transform`);
    await renderPage.screenshot({
      path: outFile,
      clip: {
        x: Math.max(0, Math.floor(nextBox.x)),
        y: Math.max(0, Math.floor(nextBox.y)),
        width: comparedSize[0],
        height: comparedSize[1],
      },
    });
  }

  const compare = await compareImages(comparePage, {
    localFile: outFile,
    actualFile,
    comparedSize,
  });
  const overlayFile = path.join(artifactDir, `${id}-overlay.png`);
  await writeDataUrl(overlayFile, compare.overlayDataUrl);
  delete compare.overlayDataUrl;
  return {
    id,
    roll20SandboxSanitize,
    captureMode,
    screenshot: outFile,
    overlay: overlayFile,
    metrics,
    ...compare,
  };
}

async function applyStateCandidate(page, candidate) {
  if (!candidate) return;
  await page.evaluate(async (candidate) => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    for (const [key, value] of Object.entries(candidate.hiddenAttrs ?? {})) {
      const nodes = document.querySelectorAll(`[name="attr_${CSS.escape(key)}"]`);
      nodes.forEach((node) => {
        if (!(node instanceof HTMLInputElement || node instanceof HTMLSelectElement || node instanceof HTMLTextAreaElement)) return;
        node.value = String(value);
        node.setAttribute('value', String(value));
        node.dispatchEvent(new Event('input', { bubbles: true }));
        node.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }
    if (candidate.actionName) {
      const actionName = candidate.actionName.startsWith('act_')
        ? candidate.actionName
        : `act_${candidate.actionName}`;
      const button = document.querySelector(`button[name="${CSS.escape(actionName)}"], [type="action"][name="${CSS.escape(actionName)}"]`);
      if (button instanceof HTMLElement) {
        button.click();
        await sleep(250);
      }
    }
    for (const control of candidate.appliedControls ?? []) {
      const selector = `[name="${CSS.escape(control.name)}"][value="${CSS.escape(String(control.value ?? ''))}"]`;
      const node = document.querySelector(selector);
      if (node instanceof HTMLInputElement) {
        node.checked = true;
        node.setAttribute('checked', 'checked');
        node.dispatchEvent(new Event('input', { bubbles: true }));
        node.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    await sleep(100);
  }, candidate);
}

async function compareImages(page, { localFile, actualFile, comparedSize }) {
  const [localUrl, actualUrl] = await Promise.all([imageDataUrl(localFile), imageDataUrl(actualFile)]);
  return page.evaluate(
    async ({ localUrl, actualUrl, comparedSize, threshold }) => {
      function loadImage(src) {
        return new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = () => reject(new Error(`image load failed: ${src.slice(0, 80)}`));
          image.src = src;
        });
      }
      function draw(image, width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight, 0, 0, width, height);
        return { canvas, ctx, data: ctx.getImageData(0, 0, width, height) };
      }
      const [localImage, actualImage] = await Promise.all([loadImage(localUrl), loadImage(actualUrl)]);
      const [width, height] = comparedSize;
      const local = draw(localImage, width, height);
      const actual = draw(actualImage, width, height);
      const overlay = document.createElement('canvas');
      overlay.width = width;
      overlay.height = height;
      const overlayCtx = overlay.getContext('2d', { willReadFrequently: true });
      const overlayData = overlayCtx.createImageData(width, height);
      let mismatch = 0;
      let sumSq = 0;
      const bounds = { left: width, top: height, right: -1, bottom: -1 };
      for (let i = 0, p = 0; i < local.data.data.length; i += 4, p += 1) {
        const x = p % width;
        const y = Math.floor(p / width);
        const dr = Math.abs(local.data.data[i] - actual.data.data[i]);
        const dg = Math.abs(local.data.data[i + 1] - actual.data.data[i + 1]);
        const db = Math.abs(local.data.data[i + 2] - actual.data.data[i + 2]);
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
        overlayData.data[i] = mismatchPixel ? 255 : Math.round(actual.data.data[i] * 0.65);
        overlayData.data[i + 1] = mismatchPixel ? 0 : Math.round(actual.data.data[i + 1] * 0.65);
        overlayData.data[i + 2] = mismatchPixel ? 96 : Math.round(actual.data.data[i + 2] * 0.65);
        overlayData.data[i + 3] = 255;
      }
      overlayCtx.putImageData(overlayData, 0, 0);
      const totalPixels = width * height;
      return {
        comparedSize: [width, height],
        mismatchPixels: mismatch,
        totalPixels,
        mismatchRatio: Number((mismatch / totalPixels).toFixed(6)),
        rmsRgb: Number(Math.sqrt(sumSq / (totalPixels * 3)).toFixed(3)),
        bounds: mismatch ? [bounds.left, bounds.top, bounds.right - bounds.left + 1, bounds.bottom - bounds.top + 1] : null,
        overlayDataUrl: overlay.toDataURL('image/png'),
      };
    },
    { localUrl, actualUrl, comparedSize, threshold },
  );
}

function interpretCandidates(candidates, previousMismatchRatio) {
  const best = candidates.reduce((acc, item) => (!acc || item.mismatchRatio < acc.mismatchRatio ? item : acc), null);
  const notes = [];
  if (best && typeof previousMismatchRatio === 'number') {
    const gain = previousMismatchRatio - best.mismatchRatio;
    if (gain > 0.03) notes.push(`same-context candidate improves mismatch by ${pct(gain)} over previous ${pct(previousMismatchRatio)}`);
    else notes.push(`same-context candidates do not materially beat previous ${pct(previousMismatchRatio)}`);
  }
  if (best?.id?.includes('sandbox')) notes.push('best candidate uses local sandbox sanitize approximation');
  if (best?.id === 'sandbox-frame-inset') notes.push('Roll20 frame inset simulation is currently closest');
  if (best?.mismatchRatio > 0.15) notes.push('large visible delta remains after local context simulation');
  notes.push('full-height Roll20 capture is still required before a parity claim');
  return notes;
}

function renderMarkdown(report) {
  const lines = [
    '# Roll20 Same-Context Visible Smoke',
    '',
    `Run dir: \`${report.runDir}\``,
    `Generated: ${report.generatedAt}`,
    '',
    'Scope: local Roll20-like context candidates compared against existing actual Roll20 root crops. This is not a visual parity claim.',
    '',
    '| Fixture | Status | Previous | Best candidate | Best mismatch | Interpretation |',
    '| --- | --- | ---: | --- | ---: | --- |',
  ];
  for (const fixture of report.fixtures) {
    lines.push(`| \`${fixture.fixtureId}\` | ${fixture.status} | ${pct(fixture.previousMismatchRatio)} | ${fixture.bestCandidate?.id ?? ''} | ${pct(fixture.bestCandidate?.mismatchRatio)} | ${(fixture.interpretation ?? [fixture.reason ?? '']).join('<br>')} |`);
  }
  lines.push('');
  for (const fixture of report.fixtures.filter((item) => item.status === 'COMPARED')) {
    lines.push(`## ${fixture.fixtureId}`);
    lines.push('');
    lines.push(`Actual normalized crop: ${fixture.actualNormalizedSize?.join('x') ?? ''}`);
    lines.push('');
    lines.push('| Candidate | Sandbox sanitize | Capture mode | Mismatch | RMS | Bounds | Screenshot | Overlay |');
    lines.push('| --- | ---: | --- | ---: | ---: | ---: | --- | --- |');
    for (const candidate of fixture.candidates) {
      lines.push(`| ${candidate.id} | ${candidate.roll20SandboxSanitize ? 'on' : 'off'} | ${candidate.captureMode} | ${pct(candidate.mismatchRatio)} | ${candidate.rmsRgb} | ${Array.isArray(candidate.bounds) ? candidate.bounds.join(',') : ''} | \`${path.relative(runDir, candidate.screenshot)}\` | \`${path.relative(runDir, candidate.overlay)}\` |`);
    }
    lines.push('');
  }
  lines.push('## Claim Boundary');
  lines.push('');
  lines.push('- A lower mismatch here means the local image was rendered closer to the measured Roll20 crop context.');
  lines.push('- It does not prove actual Roll20 visual parity.');
  lines.push('- It does not replace actual iframe computed-style evidence, full-height/scroll-stitched capture, or chat screenshot evidence.');
  return `${lines.join('\n')}\n`;
}

function resolveBuildDocModule() {
  const outRoot = path.join(repoRoot, '.tmp/same-context-build');
  const compiled = path.join(outRoot, 'lib/preview/buildDoc.js');
  const tsPath = path.join(repoRoot, 'lib/preview/buildDoc.ts');
  const tscJs = path.join(repoRoot, 'node_modules/typescript/lib/tsc.js');
  if (!existsSync(tsPath)) throw new Error(`preview builder not found: ${tsPath}`);
  if (!existsSync(tscJs)) throw new Error(`TypeScript compiler not found: ${tscJs}`);
  execFileSync(process.execPath, [
    tscJs,
    '--module', 'commonjs',
    '--moduleResolution', 'node',
    '--target', 'ES2020',
    '--outDir', outRoot,
    '--rootDir', repoRoot,
    'lib/preview/buildDoc.ts',
    '--esModuleInterop',
    '--skipLibCheck',
    '--noEmit', 'false',
    '--declaration', 'false',
  ], { cwd: repoRoot, stdio: 'pipe' });
  if (!existsSync(compiled)) throw new Error(`preview builder compile did not produce ${compiled}`);
  return compiled;
}

async function listFixtureIds(baselineDir) {
  const entries = await readdir(baselineDir, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

async function readJsonRequired(file) {
  if (!existsSync(file)) throw new Error(`Missing required report: ${file}`);
  return JSON.parse(await readFile(file, 'utf8'));
}

async function readText(file) {
  return readFile(file, 'utf8');
}

async function readMaybe(file) {
  return existsSync(file) ? readText(file) : '';
}

async function imageDataUrl(file) {
  const bytes = await readFile(file);
  return `data:image/png;base64,${bytes.toString('base64')}`;
}

async function writeDataUrl(file, dataUrl) {
  const base64 = dataUrl.split(',')[1] ?? '';
  await writeFile(file, Buffer.from(base64, 'base64'));
}

function pct(value) {
  return typeof value === 'number' && Number.isFinite(value) ? `${(value * 100).toFixed(2)}%` : '';
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
