#!/usr/bin/env node
/**
 * Compare local full-root render candidates against a stitched Roll20 actual
 * full-height root screenshot.
 *
 * This is local-only diagnostic evidence. It does not log into Roll20, mutate
 * rooms, or prove visual parity. Its job is to separate default-state,
 * sandbox-sanitize, and root-width/flow geometry causes before renderer changes.
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
const outDir = path.join(runDir, 'full-root-candidate-smoke');
const threshold = Number(argOf('--threshold', '60'));

if (!args[0]) {
  console.error('Usage: node scripts/roll20_full_root_candidate_smoke.mjs reports/roll20-actual-compare/<label>');
  process.exit(2);
}

function argOf(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

async function main() {
  const baseline = await readJsonRequired(path.join(runDir, 'local-baseline-results.json'));
  const { buildSheetDoc } = require(resolveBuildDocModule());
  if (typeof buildSheetDoc !== 'function') throw new Error('buildSheetDoc export missing');

  const browser = await chromium.launch({ headless: true });
  const comparePage = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const fixtureIds = await listFixtureIds(path.join(runDir, 'local-baseline'));
  const report = {
    generatedAt: new Date().toISOString(),
    runDir,
    scope: 'local full-root candidates compared against stitched Roll20 actual root; not visual parity',
    threshold,
    fixtures: [],
    pass: true,
  };

  try {
    await mkdir(outDir, { recursive: true });
    for (const fixtureId of fixtureIds) {
      const item = await processFixture({ fixtureId, baseline, buildSheetDoc, browser, comparePage });
      report.fixtures.push(item);
      if (item.status === 'COMPARED') {
        console.log(`${item.status} ${fixtureId} best=${item.bestCandidate.id} mismatch=${pct(item.bestCandidate.mismatchRatio)} rootDelta=${num(item.bestCandidate.rootHeightDelta)}`);
      } else {
        console.log(`${item.status} ${fixtureId} ${item.reason}`);
      }
    }
  } finally {
    await browser.close();
  }

  report.summary = {
    compared: report.fixtures.filter((fixture) => fixture.status === 'COMPARED').length,
    skipped: report.fixtures.filter((fixture) => fixture.status === 'SKIP').length,
    bestMismatchRatio: minOrNull(report.fixtures.map((fixture) => fixture.bestCandidate?.mismatchRatio)),
    parityVerified: false,
  };

  await writeFile(path.join(outDir, 'full-root-candidate-smoke-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'full-root-candidate-smoke-results.md'), renderMarkdown(report), 'utf8');
  console.log(`ROLL20 FULL-ROOT CANDIDATE SMOKE OK ${outDir}`);
}

async function processFixture({ fixtureId, baseline, buildSheetDoc, browser, comparePage }) {
  const fixtureDir = path.join(runDir, 'local-baseline', fixtureId);
  const payloadDir = path.join(fixtureDir, 'payload');
  const shotsDir = path.join(fixtureDir, 'screenshots');
  const actualFile = path.join(shotsDir, 'roll20-sandbox-root-full.png');
  const actualMetaFile = actualFile.replace(/\.png$/i, '.json');
  const localPreviewFile = path.join(shotsDir, 'local-preview.png');
  if (!existsSync(actualFile)) {
    return { fixtureId, status: 'SKIP', reason: 'missing roll20-sandbox-root-full.png' };
  }

  const artifactDir = path.join(outDir, fixtureId);
  await mkdir(artifactDir, { recursive: true });
  const baselineFixture = baseline.fixtures?.find((fixture) => fixture.id === fixtureId) ?? null;
  const stateCandidate = baselineFixture?.previewDom?.stateCandidate ?? baselineFixture?.previewStateCandidate ?? null;
  const actualMeta = await readJsonIfExists(actualMetaFile);
  const actualStyleProbe = await readJsonIfExists(path.join(runDir, 'live-iframe-probe', `${fixtureId}-computed-styles.json`));
  const actualTargetGeometry = await readJsonIfExists(path.join(runDir, 'live-iframe-probe', `${fixtureId}-target-geometry.json`));
  const actualSize = actualMeta?.outputSize ?? await imageSize(comparePage, actualFile);
  const baselineReference = existsSync(localPreviewFile)
    ? await compareExistingReference({ comparePage, localPreviewFile, actualFile, actualSize })
    : null;
  const actualRootWidth = Number(actualStyleProbe?.root?.rect?.width ?? actualSize.w ?? 0) || null;
  const baselineRootWidth = Number(baselineFixture?.previewDom?.rect?.width ?? 0) || 850;

  const payload = {
    html: await readText(path.join(payloadDir, 'sheet.html')),
    css: await readText(path.join(payloadDir, 'sheet.css')),
    i18n: await readMaybe(path.join(payloadDir, 'translation.json')),
  };

  const context = await browser.newContext({ viewport: { width: Math.max(1200, Math.round((actualRootWidth ?? 900) + 80)), height: 900 } });
  const page = await context.newPage();
  const candidates = [];
  try {
    const candidateInputs = [
      { id: 'normal-source-state', roll20SandboxSanitize: false, applyStateHint: false },
      { id: 'sandbox-source-state', roll20SandboxSanitize: true, applyStateHint: false },
      { id: 'normal-state-map', roll20SandboxSanitize: false, applyStateHint: true },
      { id: 'sandbox-state-map', roll20SandboxSanitize: true, applyStateHint: true },
    ];
    if (actualRootWidth) {
      candidateInputs.push(
        { id: 'normal-actual-root-width-source', roll20SandboxSanitize: false, applyStateHint: false, contextPatch: { mode: 'actual-root-width', rootWidth: actualRootWidth } },
        { id: 'sandbox-actual-root-width-source', roll20SandboxSanitize: true, applyStateHint: false, contextPatch: { mode: 'actual-root-width', rootWidth: actualRootWidth } },
        { id: 'sandbox-actual-root-width-plus-1-source', roll20SandboxSanitize: true, applyStateHint: false, contextPatch: { mode: 'actual-root-width', rootWidth: actualRootWidth + 1 } },
        { id: 'sandbox-actual-root-width-plus-2-source', roll20SandboxSanitize: true, applyStateHint: false, contextPatch: { mode: 'actual-root-width', rootWidth: actualRootWidth + 2 } },
        { id: 'sandbox-row-width-plus-1-source', roll20SandboxSanitize: true, applyStateHint: false, contextPatch: { mode: 'row-width-fudge', rootWidth: actualRootWidth, extraWidth: 1 } },
        { id: 'sandbox-row-width-plus-2-source', roll20SandboxSanitize: true, applyStateHint: false, contextPatch: { mode: 'row-width-fudge', rootWidth: actualRootWidth, extraWidth: 2 } },
        { id: 'sandbox-inline-block-nowrap-source', roll20SandboxSanitize: true, applyStateHint: false, contextPatch: { mode: 'inline-block-nowrap', rootWidth: actualRootWidth } },
        { id: 'sandbox-inline-block-wordspace-025-source', roll20SandboxSanitize: true, applyStateHint: false, contextPatch: { mode: 'inline-block-wordspace', rootWidth: actualRootWidth, wordSpacing: -0.25 } },
        { id: 'sandbox-inline-block-wordspace-050-source', roll20SandboxSanitize: true, applyStateHint: false, contextPatch: { mode: 'inline-block-wordspace', rootWidth: actualRootWidth, wordSpacing: -0.5 } },
        { id: 'sandbox-inline-block-wordspace-075-source', roll20SandboxSanitize: true, applyStateHint: false, contextPatch: { mode: 'inline-block-wordspace', rootWidth: actualRootWidth, wordSpacing: -0.75 } },
        { id: 'sandbox-inline-block-wordspace-100-source', roll20SandboxSanitize: true, applyStateHint: false, contextPatch: { mode: 'inline-block-wordspace', rootWidth: actualRootWidth, wordSpacing: -1 } },
        { id: 'sandbox-inline-block-font-zero-source', roll20SandboxSanitize: true, applyStateHint: false, contextPatch: { mode: 'inline-block-font-zero', rootWidth: actualRootWidth } },
        { id: 'sandbox-inline-block-text-input-276-source', roll20SandboxSanitize: true, applyStateHint: false, contextPatch: { mode: 'inline-block-text-input-height', rootWidth: actualRootWidth, wordSpacing: -0.75, textInputHeight: 27.6 } },
        { id: 'sandbox-nowrap-text-input-276-source', roll20SandboxSanitize: true, applyStateHint: false, contextPatch: { mode: 'inline-block-nowrap-text-input-height', rootWidth: actualRootWidth, textInputHeight: 27.6 } },
      );
    }
    for (const input of candidateInputs) {
      candidates.push(await renderCandidate({
        ...input,
        fixtureId,
        baselineRootWidth,
        page,
        comparePage,
        buildSheetDoc,
        payload,
        stateCandidate,
        actualFile,
        actualSize,
        artifactDir,
      }));
    }
  } finally {
    await context.close();
  }

  const candidatesWithGeometryFit = candidates.map((candidate) => ({
    ...candidate,
    geometryFit: summarizeGeometryFit({ actualSize, actualTargetGeometry, candidate }),
  }));
  const bestCandidate = candidatesWithGeometryFit.reduce((best, candidate) => pickBetterCandidate(best, candidate), null);
  const bestGeometryCandidate = candidatesWithGeometryFit.reduce((best, candidate) => pickBetterGeometryCandidate(best, candidate), null);
  const sourceBest = candidates
    .filter((candidate) => !candidate.applyStateHint)
    .reduce((best, candidate) => pickBetterCandidate(best, candidate), null);
  const stateBest = candidates
    .filter((candidate) => candidate.applyStateHint)
    .reduce((best, candidate) => pickBetterCandidate(best, candidate), null);

  return {
    fixtureId,
    status: 'COMPARED',
    actual: {
      screenshot: actualFile,
      size: actualSize,
      outputCss: actualMeta?.outputCss ?? null,
      segmentCount: actualMeta?.segmentCount ?? null,
      state: actualStyleProbe?.state ?? actualTargetGeometry?.state ?? null,
    },
    localBaseline: {
      previewSize: baselineFixture?.previewDom?.rect ?? null,
      previewScreenshot: existsSync(localPreviewFile) ? localPreviewFile : null,
      stateHint: summarizeStateCandidate(stateCandidate),
    },
    baselineReference,
    bestCandidate,
    bestGeometryCandidate,
    candidates: candidatesWithGeometryFit,
    interpretation: interpret({ bestCandidate, bestGeometryCandidate, sourceBest, stateBest, baselineReference, actualTargetGeometry }),
    targetGeometry: compareTargetGeometry(actualTargetGeometry, bestCandidate?.metrics?.targetGeometry),
  };
}

async function compareExistingReference({ comparePage, localPreviewFile, actualFile, actualSize }) {
  const localSize = await imageSize(comparePage, localPreviewFile);
  const comparedSize = {
    w: Math.min(localSize.w, actualSize.w),
    h: Math.min(localSize.h, actualSize.h),
  };
  const compare = await compareImages(comparePage, {
    localFile: localPreviewFile,
    actualFile,
    comparedSize,
  });
  delete compare.overlayDataUrl;
  return {
    id: 'local-baseline-preview',
    screenshot: localPreviewFile,
    localSize,
    ...compare,
  };
}

async function renderCandidate({
  id,
  page,
  comparePage,
  buildSheetDoc,
  payload,
  baselineRootWidth,
  stateCandidate,
  applyStateHint,
  roll20SandboxSanitize,
  contextPatch = null,
  actualFile,
  actualSize,
  artifactDir,
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
  const viewportWidth = Math.max(1, Math.round(contextPatch?.rootWidth ?? baselineRootWidth));
  await page.setViewportSize({ width: viewportWidth, height: 900 });
  await page.setContent(doc, { waitUntil: 'load' });
  if (contextPatch) await applyRenderContextPatch(page, contextPatch);
  if (applyStateHint) await applyStateCandidate(page, stateCandidate);
  await page.waitForTimeout(300);

  const metrics = await page.evaluate(() => {
    const root = document.querySelector('#charsheet-root');
    const dialog = document.querySelector('#dialog-window');
    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    };
    const style = (el) => {
      if (!el) return null;
      const cs = getComputedStyle(el);
      return {
        display: cs.display,
        position: cs.position,
        boxSizing: cs.boxSizing,
        width: cs.width,
        height: cs.height,
        margin: cs.margin,
        padding: cs.padding,
        overflow: cs.overflow,
        fontSize: cs.fontSize,
        lineHeight: cs.lineHeight,
        backgroundColor: cs.backgroundColor,
      };
    };
    const target = (el, depth = 0) => {
      if (!el) return null;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName,
        className: typeof el.className === 'string' ? el.className : String(el.className || ''),
        name: el.getAttribute('name') || '',
        type: el.getAttribute('type') || '',
        text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80),
        rect: { x: r.x, y: r.y, width: r.width, height: r.height },
        scroll: { width: el.scrollWidth || 0, height: el.scrollHeight || 0 },
        natural: el.tagName === 'IMG' ? { width: el.naturalWidth || 0, height: el.naturalHeight || 0, complete: Boolean(el.complete), src: el.currentSrc || el.src || '' } : null,
        style: {
          display: cs.display,
          position: cs.position,
          float: cs.float,
          clear: cs.clear,
          boxSizing: cs.boxSizing,
          width: cs.width,
          height: cs.height,
          margin: cs.margin,
          padding: cs.padding,
          border: cs.border,
          overflow: cs.overflow,
          fontSize: cs.fontSize,
          lineHeight: cs.lineHeight,
          whiteSpace: cs.whiteSpace,
          wordSpacing: cs.wordSpacing,
          letterSpacing: cs.letterSpacing,
          zoom: cs.zoom,
          verticalAlign: cs.verticalAlign,
        },
        children: depth >= 2 ? [] : Array.from(el.children).slice(0, 30).map((child) => target(child, depth + 1)),
      };
    };
    return {
      rootRect: rect(root),
      dialogRect: rect(dialog),
      rootStyle: style(root),
      state: {
        sheetTab: document.querySelector('[name="attr_sheetTab"]')?.value || null,
        sheetTabForBtn: document.querySelector('[name="attr_sheetTabForBtn"]')?.value || null,
      },
      counts: {
        rows: document.querySelectorAll('.sheet-2colrow').length,
        cols: document.querySelectorAll('.sheet-col').length,
        tables: document.querySelectorAll('table').length,
        inputs: document.querySelectorAll('input').length,
        rollButtons: document.querySelectorAll('button[type="roll"]').length,
        actionButtons: document.querySelectorAll('button[type="action"]').length,
      },
      targetGeometry: {
        rows: Array.from(document.querySelectorAll('.sheet-2colrow')).map((row, index) => ({ index, ...target(row) })),
        tables: Array.from(document.querySelectorAll('table')).slice(0, 12).map((table, index) => ({ index, ...target(table) })),
        images: Array.from(document.querySelectorAll('img')).map((image, index) => ({ index, ...target(image) })),
        inputs: Array.from(document.querySelectorAll('input')).slice(0, 20).map((input, index) => ({ index, ...target(input) })),
      },
    };
  });

  const rootBox = await page.locator('#charsheet-root').boundingBox();
  if (!rootBox) throw new Error(`candidate ${id} has no #charsheet-root`);
  const screenshot = path.join(artifactDir, `${id}.png`);
  await page.locator('#charsheet-root').screenshot({ path: screenshot });
  const comparedSize = {
    w: Math.min(Math.round(rootBox.width), actualSize.w),
    h: Math.min(Math.round(rootBox.height), actualSize.h),
  };
  const compare = await compareImages(comparePage, {
    localFile: screenshot,
    actualFile,
    comparedSize,
  });
  const overlay = path.join(artifactDir, `${id}-overlay.png`);
  await writeDataUrl(overlay, compare.overlayDataUrl);
  delete compare.overlayDataUrl;
  return {
    id,
    roll20SandboxSanitize,
    applyStateHint,
    contextPatch: formatRenderContextPatch(contextPatch),
    screenshot,
    overlay,
    localSize: await imageSize(comparePage, screenshot),
    rootRect: metrics.rootRect,
    rootHeightDelta: typeof metrics.rootRect?.height === 'number'
      ? Number((metrics.rootRect.height - actualSize.h).toFixed(3))
      : null,
    metrics,
    ...compare,
  };
}

async function applyRenderContextPatch(page, patch) {
  await page.evaluate((patch) => {
    const dialogWindow = document.querySelector('#dialog-window');
    const dialog = document.querySelector('#dialog-window .dialog.largedialog');
    if (!(dialogWindow instanceof HTMLElement) || !(dialog instanceof HTMLElement)) return;
    if (patch.mode === 'actual-root-width') {
      dialogWindow.style.width = `${Math.max(1, Math.round(patch.rootWidth))}px`;
      dialog.style.paddingLeft = '0px';
      dialog.style.paddingRight = '0px';
    } else if (patch.mode === 'row-width-fudge') {
      dialogWindow.style.width = `${Math.max(1, Math.round(patch.rootWidth))}px`;
      dialog.style.paddingLeft = '0px';
      dialog.style.paddingRight = '0px';
      const style = document.createElement('style');
      const extraWidth = Number.isFinite(patch.extraWidth) ? patch.extraWidth : 1;
      style.setAttribute('data-r20-diagnostic-context-patch', `row-width-fudge-${extraWidth}`);
      style.textContent = `
        .ui-dialog .charsheet .sheet-2colrow,
        .ui-dialog .charsheet .sheet-3colrow { width: calc(100% + ${extraWidth}px); }
      `;
      document.head.append(style);
    } else if (patch.mode === 'inline-block-nowrap') {
      dialogWindow.style.width = `${Math.max(1, Math.round(patch.rootWidth))}px`;
      dialog.style.paddingLeft = '0px';
      dialog.style.paddingRight = '0px';
      const style = document.createElement('style');
      style.setAttribute('data-r20-diagnostic-context-patch', 'inline-block-nowrap');
      style.textContent = `
        .ui-dialog .charsheet .sheet-2colrow,
        .ui-dialog .charsheet .sheet-3colrow { white-space: nowrap; }
        .ui-dialog .charsheet .sheet-2colrow > .sheet-col,
        .ui-dialog .charsheet .sheet-3colrow > .sheet-col { white-space: normal; }
      `;
      document.head.append(style);
    } else if (patch.mode === 'inline-block-wordspace') {
      dialogWindow.style.width = `${Math.max(1, Math.round(patch.rootWidth))}px`;
      dialog.style.paddingLeft = '0px';
      dialog.style.paddingRight = '0px';
      const style = document.createElement('style');
      style.setAttribute('data-r20-diagnostic-context-patch', `inline-block-wordspace-${patch.wordSpacing}`);
      const wordSpacing = Number.isFinite(patch.wordSpacing) ? patch.wordSpacing : -1;
      style.textContent = `
        .ui-dialog .charsheet .sheet-2colrow,
        .ui-dialog .charsheet .sheet-3colrow { word-spacing: ${wordSpacing}px; }
        .ui-dialog .charsheet .sheet-2colrow > .sheet-col,
        .ui-dialog .charsheet .sheet-3colrow > .sheet-col { word-spacing: normal; }
      `;
      document.head.append(style);
    } else if (patch.mode === 'inline-block-font-zero') {
      dialogWindow.style.width = `${Math.max(1, Math.round(patch.rootWidth))}px`;
      dialog.style.paddingLeft = '0px';
      dialog.style.paddingRight = '0px';
      const style = document.createElement('style');
      style.setAttribute('data-r20-diagnostic-context-patch', 'inline-block-font-zero');
      style.textContent = `
        .ui-dialog .charsheet .sheet-2colrow,
        .ui-dialog .charsheet .sheet-3colrow { font-size: 0; }
        .ui-dialog .charsheet .sheet-2colrow > .sheet-col,
        .ui-dialog .charsheet .sheet-3colrow > .sheet-col { font-size: 13px; }
      `;
      document.head.append(style);
    } else if (patch.mode === 'inline-block-text-input-height') {
      dialogWindow.style.width = `${Math.max(1, Math.round(patch.rootWidth))}px`;
      dialog.style.paddingLeft = '0px';
      dialog.style.paddingRight = '0px';
      const style = document.createElement('style');
      const wordSpacing = Number.isFinite(patch.wordSpacing) ? patch.wordSpacing : -0.75;
      const textInputHeight = Number.isFinite(patch.textInputHeight) ? patch.textInputHeight : 27.6;
      style.setAttribute('data-r20-diagnostic-context-patch', `inline-block-text-input-height-${textInputHeight}`);
      style.textContent = `
        .ui-dialog .charsheet .sheet-2colrow,
        .ui-dialog .charsheet .sheet-3colrow { word-spacing: ${wordSpacing}px; }
        .ui-dialog .charsheet .sheet-2colrow > .sheet-col,
        .ui-dialog .charsheet .sheet-3colrow > .sheet-col { word-spacing: normal; }
        .ui-dialog .charsheet input[type="text"] { min-height: ${textInputHeight}px; }
      `;
      document.head.append(style);
    } else if (patch.mode === 'inline-block-nowrap-text-input-height') {
      dialogWindow.style.width = `${Math.max(1, Math.round(patch.rootWidth))}px`;
      dialog.style.paddingLeft = '0px';
      dialog.style.paddingRight = '0px';
      const style = document.createElement('style');
      const textInputHeight = Number.isFinite(patch.textInputHeight) ? patch.textInputHeight : 27.6;
      style.setAttribute('data-r20-diagnostic-context-patch', `inline-block-nowrap-text-input-height-${textInputHeight}`);
      style.textContent = `
        .ui-dialog .charsheet .sheet-2colrow,
        .ui-dialog .charsheet .sheet-3colrow { white-space: nowrap; }
        .ui-dialog .charsheet .sheet-2colrow > .sheet-col,
        .ui-dialog .charsheet .sheet-3colrow > .sheet-col { white-space: normal; }
        .ui-dialog .charsheet input[type="text"] { min-height: ${textInputHeight}px; }
      `;
      document.head.append(style);
    }
  }, patch);
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
      const actionName = candidate.actionName.startsWith('act_') ? candidate.actionName : `act_${candidate.actionName}`;
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
        return ctx.getImageData(0, 0, width, height);
      }
      const [localImage, actualImage] = await Promise.all([loadImage(localUrl), loadImage(actualUrl)]);
      const width = Math.max(1, Math.round(comparedSize.w ?? comparedSize[0]));
      const height = Math.max(1, Math.round(comparedSize.h ?? comparedSize[1]));
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
      const verticalBands = [
        { id: 'top', start: 0, end: Math.floor(height / 3), mismatch: 0, total: 0 },
        { id: 'middle', start: Math.floor(height / 3), end: Math.floor((height * 2) / 3), mismatch: 0, total: 0 },
        { id: 'bottom', start: Math.floor((height * 2) / 3), end: height, mismatch: 0, total: 0 },
      ];
      const horizontalBands = [
        { id: 'left', start: 0, end: Math.floor(width / 2), mismatch: 0, total: 0 },
        { id: 'right', start: Math.floor(width / 2), end: width, mismatch: 0, total: 0 },
      ];
      const deciles = Array.from({ length: 10 }, (_, index) => ({
        id: `d${index}`,
        start: Math.floor((height * index) / 10),
        end: Math.floor((height * (index + 1)) / 10),
        mismatch: 0,
        total: 0,
      }));
      for (let i = 0, p = 0; i < local.data.length; i += 4, p += 1) {
        const x = p % width;
        const y = Math.floor(p / width);
        const dr = Math.abs(local.data[i] - actual.data[i]);
        const dg = Math.abs(local.data[i + 1] - actual.data[i + 1]);
        const db = Math.abs(local.data[i + 2] - actual.data[i + 2]);
        const delta = dr + dg + db;
        const hit = delta > threshold;
        sumSq += dr * dr + dg * dg + db * db;
        addBand(verticalBands, y, hit);
        addBand(horizontalBands, x, hit);
        addBand(deciles, y, hit);
        if (hit) {
          mismatch += 1;
          bounds.left = Math.min(bounds.left, x);
          bounds.top = Math.min(bounds.top, y);
          bounds.right = Math.max(bounds.right, x);
          bounds.bottom = Math.max(bounds.bottom, y);
        }
        overlayData.data[i] = hit ? 255 : Math.round(actual.data[i] * 0.65);
        overlayData.data[i + 1] = hit ? 0 : Math.round(actual.data[i + 1] * 0.65);
        overlayData.data[i + 2] = hit ? 96 : Math.round(actual.data[i + 2] * 0.65);
        overlayData.data[i + 3] = 255;
      }
      overlayCtx.putImageData(overlayData, 0, 0);
      const totalPixels = width * height;
      function summarizeBands(bands) {
        return bands.map((band) => ({
          id: band.id,
          start: band.start,
          end: band.end,
          mismatchPixels: band.mismatch,
          totalPixels: band.total,
          mismatchRatio: band.total > 0 ? Number((band.mismatch / band.total).toFixed(6)) : null,
        }));
      }
      function dominantBand(bands) {
        return summarizeBands(bands).reduce((best, band) => {
          if (!best || (band.mismatchRatio ?? -1) > (best.mismatchRatio ?? -1)) return band;
          return best;
        }, null);
      }
      return {
        comparedSize: { w: width, h: height },
        mismatchPixels: mismatch,
        totalPixels,
        mismatchRatio: Number((mismatch / totalPixels).toFixed(6)),
        rmsRgb: Number(Math.sqrt(sumSq / (totalPixels * 3)).toFixed(3)),
        bounds: mismatch ? [bounds.left, bounds.top, bounds.right - bounds.left + 1, bounds.bottom - bounds.top + 1] : null,
        mismatchDistribution: {
          verticalBands: summarizeBands(verticalBands),
          horizontalBands: summarizeBands(horizontalBands),
          deciles: summarizeBands(deciles),
          dominantVerticalBand: dominantBand(verticalBands),
          dominantHorizontalBand: dominantBand(horizontalBands),
          dominantDecile: dominantBand(deciles),
        },
        overlayDataUrl: overlay.toDataURL('image/png'),
      };
      function addBand(bands, position, hit) {
        const band = bands.find((item) => position >= item.start && position < item.end) ?? bands[bands.length - 1];
        if (!band) return;
        band.total += 1;
        if (hit) band.mismatch += 1;
      }
    },
    { localUrl, actualUrl, comparedSize, threshold },
  );
}

function compareTargetGeometry(actual, local) {
  if (!actual || !local) {
    return {
      status: 'SKIP',
      reason: !actual ? 'missing actual target geometry probe' : 'missing local target geometry',
    };
  }
  return {
    status: 'COMPARED',
    state: actual.state ?? null,
    counts: {
      rows: { actual: actual.rows?.length ?? 0, local: local.rows?.length ?? 0 },
      tables: { actual: actual.tables?.length ?? 0, local: local.tables?.length ?? 0 },
      images: { actual: actual.images?.length ?? 0, local: local.images?.length ?? 0 },
    },
    rowFindings: compareIndexed(actual.rows ?? [], local.rows ?? []).slice(0, 8),
    tableFindings: compareIndexed(actual.tables ?? [], local.tables ?? []).slice(0, 8),
    imageFindings: compareIndexed(actual.images ?? [], local.images ?? []).slice(0, 8),
  };
}

function compareIndexed(actualItems, localItems) {
  const length = Math.max(actualItems.length, localItems.length);
  const out = [];
  for (let i = 0; i < length; i += 1) {
    const actual = actualItems[i] ?? null;
    const local = localItems[i] ?? null;
    if (!actual || !local) {
      out.push({ index: i, status: 'MISSING', actualPresent: Boolean(actual), localPresent: Boolean(local) });
      continue;
    }
    out.push({
      index: i,
      status: 'COMPARED',
      selector: label(actual, local),
      actualRect: actual.rect ?? null,
      localRect: local.rect ?? null,
      heightDelta: delta(local.rect?.height, actual.rect?.height),
      yDelta: delta(local.rect?.y, actual.rect?.y),
      widthDelta: delta(local.rect?.width, actual.rect?.width),
      actualStyle: summarizeStyle(actual.style),
      localStyle: summarizeStyle(local.style),
      childCount: { actual: actual.children?.length ?? 0, local: local.children?.length ?? 0 },
    });
  }
  return out.sort((a, b) => Math.abs(b.heightDelta ?? 0) - Math.abs(a.heightDelta ?? 0));
}

function interpret({ bestCandidate, bestGeometryCandidate, sourceBest, stateBest, baselineReference, actualTargetGeometry }) {
  const notes = [];
  if (baselineReference && bestCandidate && baselineReference.mismatchRatio < bestCandidate.mismatchRatio - 0.005) {
    notes.push(`existing app local-preview is closer than direct candidates by ${pct(bestCandidate.mismatchRatio - baselineReference.mismatchRatio)}; inspect app preview sizing/runtime before renderer CSS changes`);
  }
  if (bestGeometryCandidate && bestCandidate && bestGeometryCandidate.id !== bestCandidate.id) {
    notes.push(`geometry-fit best is ${bestGeometryCandidate.id} (score ${num(bestGeometryCandidate.geometryFit?.score)}), but pixel best is ${bestCandidate.id}; do not patch from geometry alone`);
  }
  if (sourceBest && stateBest) {
    const gain = stateBest.mismatchRatio - sourceBest.mismatchRatio;
    if (gain > 0.01) {
      notes.push(`source/default state beats state-map by ${pct(gain)}; local state-map likely mismatches actual Roll20 state`);
    } else if (gain < -0.01) {
      notes.push(`state-map beats source/default state by ${pct(Math.abs(gain))}`);
    } else {
      notes.push('source/default state and state-map are visually close in full-root comparison');
    }
  }
  if (bestCandidate?.roll20SandboxSanitize) notes.push('best candidate uses local Sandbox expected sanitize');
  if (bestCandidate?.contextPatch) notes.push(`best candidate uses diagnostic context patch ${bestCandidate.contextPatch}`);
  if (typeof bestCandidate?.rootHeightDelta === 'number') {
    notes.push(`best local root height delta vs actual is ${num(bestCandidate.rootHeightDelta)}px`);
  }
  if (!actualTargetGeometry) notes.push('actual target geometry probe is missing; capture it before CSS changes');
  return notes;
}

function pickBetterCandidate(best, candidate) {
  if (!best) return candidate;
  if (candidate.mismatchRatio < best.mismatchRatio - 0.0005) return candidate;
  if (Math.abs(candidate.mismatchRatio - best.mismatchRatio) <= 0.0005) {
    const candidateAbsHeight = Math.abs(candidate.rootHeightDelta ?? Number.POSITIVE_INFINITY);
    const bestAbsHeight = Math.abs(best.rootHeightDelta ?? Number.POSITIVE_INFINITY);
    if (candidateAbsHeight < bestAbsHeight) return candidate;
  }
  return best;
}

function pickBetterGeometryCandidate(best, candidate) {
  if (!candidate?.geometryFit || candidate.geometryFit.score === null) return best;
  if (!best?.geometryFit || best.geometryFit.score === null) return candidate;
  if (candidate.geometryFit.score < best.geometryFit.score - 0.001) return candidate;
  if (Math.abs(candidate.geometryFit.score - best.geometryFit.score) <= 0.001 && candidate.mismatchRatio < best.mismatchRatio) return candidate;
  return best;
}

function summarizeGeometryFit({ actualSize, actualTargetGeometry, candidate }) {
  const localRows = candidate.metrics?.targetGeometry?.rows ?? [];
  const actualRows = actualTargetGeometry?.rows ?? [];
  if (!candidate.metrics?.rootRect || !actualSize || actualRows.length === 0 || localRows.length === 0) {
    return { score: null, reason: 'missing actual/local geometry' };
  }
  const row0Delta = delta(localRows[0]?.rect?.height, actualRows[0]?.rect?.height);
  const row3Delta = delta(localRows[3]?.rect?.height, actualRows[3]?.rect?.height);
  const rootHeightDelta = delta(candidate.metrics.rootRect.height, actualSize.h);
  const scoreParts = [rootHeightDelta, row0Delta, row3Delta]
    .filter((value) => typeof value === 'number')
    .map((value, index) => Math.abs(value) * (index === 0 ? 1 : 2));
  return {
    score: scoreParts.length ? Number(scoreParts.reduce((sum, value) => sum + value, 0).toFixed(3)) : null,
    rootHeightDelta,
    row0Delta,
    row3Delta,
    row0Height: localRows[0]?.rect?.height ?? null,
    row3Height: localRows[3]?.rect?.height ?? null,
  };
}

function formatRenderContextPatch(patch) {
  if (!patch) return null;
  if (patch.mode === 'inline-block-wordspace') return `${patch.mode}:${patch.wordSpacing}px`;
  if (patch.mode === 'inline-block-text-input-height') return `${patch.mode}:${patch.wordSpacing}px:${patch.textInputHeight}px`;
  if (patch.mode === 'inline-block-nowrap-text-input-height') return `${patch.mode}:${patch.textInputHeight}px`;
  if (patch.mode === 'row-width-fudge') return `${patch.mode}:${patch.extraWidth}px`;
  if (patch.mode === 'actual-root-width' && typeof patch.rootWidth === 'number') return `${patch.mode}:${patch.rootWidth}px`;
  return patch.mode ?? null;
}

function delta(local, actual) {
  return typeof local === 'number' && typeof actual === 'number'
    ? Number((local - actual).toFixed(3))
    : null;
}

function summarizeStateCandidate(candidate) {
  if (!candidate) return null;
  return {
    actionName: candidate.actionName ?? null,
    actionLabel: candidate.actionLabel ?? null,
    hiddenAttrs: candidate.hiddenAttrs ?? null,
    applied: candidate.applied ?? Boolean(candidate.appliedControls?.length),
  };
}

function summarizeStyle(style) {
  if (!style) return null;
  return {
    display: style.display,
    width: style.width,
    height: style.height,
    margin: style.margin,
    padding: style.padding,
    border: style.border,
    fontSize: style.fontSize,
    lineHeight: style.lineHeight,
  };
}

function label(actual, local) {
  const item = actual ?? local;
  const cls = item?.className ? `.${String(item.className).trim().split(/\s+/).slice(0, 3).join('.')}` : '';
  return `${item?.tag ?? ''}${cls}`;
}

async function imageSize(page, file) {
  const url = await imageDataUrl(file);
  return page.evaluate(async (url) => {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = url;
    });
    return { w: image.naturalWidth, h: image.naturalHeight };
  }, url);
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Roll20 Full-Root Candidate Smoke');
  lines.push('');
  lines.push(`Run dir: \`${report.runDir}\``);
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push('');
  lines.push('Scope: local full-root candidates compared against stitched Roll20 actual root. This is not Roll20 visual parity.');
  lines.push('');
  lines.push('| Fixture | Status | Actual size | Pixel best | Pixel mismatch | Geometry best | Geometry score | Best local root | Notes |');
  lines.push('| --- | --- | --- | --- | ---: | --- | ---: | --- | --- |');
  for (const fixture of report.fixtures) {
    lines.push(`| \`${fixture.fixtureId}\` | ${fixture.status} | ${fmtSize(fixture.actual?.size)} | ${fixture.bestCandidate?.id ?? ''} | ${pct(fixture.bestCandidate?.mismatchRatio)} | ${fixture.bestGeometryCandidate?.id ?? ''} | ${num(fixture.bestGeometryCandidate?.geometryFit?.score)} | ${fmtSize(fixture.bestCandidate?.localSize)} | ${(fixture.interpretation ?? [fixture.reason ?? '']).join('<br>')} |`);
  }
  for (const fixture of report.fixtures.filter((item) => item.status === 'COMPARED')) {
    lines.push('');
    lines.push(`## ${fixture.fixtureId}`);
    lines.push('');
    lines.push(`Actual state: \`${JSON.stringify(fixture.actual.state ?? {})}\``);
    lines.push(`Local state hint: \`${JSON.stringify(fixture.localBaseline.stateHint ?? {})}\``);
    if (fixture.baselineReference) {
      lines.push(`Existing app local-preview reference: ${pct(fixture.baselineReference.mismatchRatio)} at ${fmtSize(fixture.baselineReference.localSize)}.`);
    }
    lines.push('');
    lines.push('| Candidate | Sandbox | State hint | Patch | Mismatch | Dominant diff | Geometry score | Row0/Row3 delta | Root size | Height delta | Bounds | Screenshot | Overlay |');
    lines.push('| --- | ---: | ---: | --- | ---: | --- | ---: | --- | --- | ---: | --- | --- | --- |');
    for (const candidate of fixture.candidates) {
      const rowDeltas = candidate.geometryFit
        ? `${num(candidate.geometryFit.row0Delta)}/${num(candidate.geometryFit.row3Delta)}`
        : '';
      lines.push(`| ${candidate.id} | ${candidate.roll20SandboxSanitize ? 'on' : 'off'} | ${candidate.applyStateHint ? 'on' : 'off'} | ${candidate.contextPatch ?? ''} | ${pct(candidate.mismatchRatio)} | ${fmtDominantDiff(candidate.mismatchDistribution)} | ${num(candidate.geometryFit?.score)} | ${rowDeltas} | ${fmtSize(candidate.localSize)} | ${num(candidate.rootHeightDelta)} | ${Array.isArray(candidate.bounds) ? candidate.bounds.join(',') : ''} | \`${path.relative(runDir, candidate.screenshot)}\` | \`${path.relative(runDir, candidate.overlay)}\` |`);
    }
    if (fixture.targetGeometry?.status === 'COMPARED') {
      lines.push('');
      lines.push('### Geometry Findings');
      lines.push('');
      lines.push(`Counts: rows ${fixture.targetGeometry.counts.rows.actual}/${fixture.targetGeometry.counts.rows.local}, tables ${fixture.targetGeometry.counts.tables.actual}/${fixture.targetGeometry.counts.tables.local}, images ${fixture.targetGeometry.counts.images.actual}/${fixture.targetGeometry.counts.images.local}`);
      lines.push('');
      lines.push('| Kind | Index | Selector | Actual h | Local h | Delta | Actual style | Local style |');
      lines.push('| --- | ---: | --- | ---: | ---: | ---: | --- | --- |');
      for (const finding of fixture.targetGeometry.rowFindings.slice(0, 4)) {
        lines.push(findingLine('row', finding));
      }
      for (const finding of fixture.targetGeometry.tableFindings.slice(0, 4)) {
        lines.push(findingLine('table', finding));
      }
      for (const finding of fixture.targetGeometry.imageFindings.slice(0, 3)) {
        lines.push(findingLine('image', finding));
      }
    }
  }
  lines.push('');
  lines.push('## Claim Boundary');
  lines.push('');
  lines.push('- This compares local render candidates to existing Roll20 actual evidence.');
  lines.push('- It does not upload sheets, inspect real rooms, or prove visual parity.');
  lines.push('- Use the result to choose the next renderer patch, then rerun actual Roll20 capture/diff.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function findingLine(kind, finding) {
  return `| ${kind} | ${finding.index} | \`${finding.selector ?? ''}\` | ${num(finding.actualRect?.height)} | ${num(finding.localRect?.height)} | ${num(finding.heightDelta)} | ${fmtStyle(finding.actualStyle)} | ${fmtStyle(finding.localStyle)} |`;
}

function fmtStyle(style) {
  if (!style) return '';
  return `display=${style.display ?? ''}; width=${style.width ?? ''}; height=${style.height ?? ''}; margin=${style.margin ?? ''}; padding=${style.padding ?? ''}; line=${style.lineHeight ?? ''}`;
}

function fmtSize(size) {
  if (!size) return '';
  const w = size.w ?? size.width;
  const h = size.h ?? size.height;
  return w && h ? `${Math.round(w)}x${Math.round(h)}` : '';
}

function fmtDominantDiff(distribution) {
  if (!distribution) return '';
  const vertical = distribution.dominantVerticalBand;
  const horizontal = distribution.dominantHorizontalBand;
  const decile = distribution.dominantDecile;
  return [
    vertical ? `${vertical.id} ${pct(vertical.mismatchRatio)}` : null,
    horizontal ? `${horizontal.id} ${pct(horizontal.mismatchRatio)}` : null,
    decile ? `${decile.id} ${pct(decile.mismatchRatio)}` : null,
  ].filter(Boolean).join('<br>');
}

function num(value) {
  return typeof value === 'number' && Number.isFinite(value) ? String(Math.round(value * 1000) / 1000) : '';
}

function pct(value) {
  return typeof value === 'number' && Number.isFinite(value) ? `${(value * 100).toFixed(2)}%` : '';
}

function minOrNull(values) {
  const finite = values.filter((value) => typeof value === 'number' && Number.isFinite(value));
  return finite.length ? Math.min(...finite) : null;
}

async function listFixtureIds(baselineDir) {
  const entries = await readdir(baselineDir, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

async function readJsonRequired(file) {
  if (!existsSync(file)) throw new Error(`Missing required report: ${file}`);
  return JSON.parse(await readFile(file, 'utf8'));
}

async function readJsonIfExists(file) {
  if (!existsSync(file)) return null;
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

function resolveBuildDocModule() {
  const outRoot = path.join(repoRoot, '.tmp/full-root-candidate-build');
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

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
