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
        browser,
        comparePage,
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

async function processFixture({ fixtureId, baseline, diffItem, buildSheetDoc, browser, comparePage }) {
  const fixtureDir = path.join(runDir, 'local-baseline', fixtureId);
  const payloadDir = path.join(fixtureDir, 'payload');
  const shotsDir = path.join(fixtureDir, 'screenshots');
  const actualFile = path.join(shotsDir, 'roll20-sandbox-root.png');
  const baselineFixture = baseline.fixtures?.find((fixture) => fixture.id === fixtureId) ?? null;
  const actualMeta = diffItem.result.actualMeta;
  const actualDeviceScaleFactor = actualMeta.scale?.x
    ? Number((1 / actualMeta.scale.x).toFixed(3))
    : 1;
  const cssCrop = actualMeta.cssCrop;
  const comparedSize = [Math.round(cssCrop.w), Math.round(cssCrop.h)];
  const artifactDir = path.join(outDir, fixtureId);
  await mkdir(artifactDir, { recursive: true });
  const actualStyleProbe = await readJsonIfExists(path.join(runDir, 'live-iframe-probe', `${fixtureId}-computed-styles.json`));

  const payload = {
    html: await readText(path.join(payloadDir, 'sheet.html')),
    css: await readText(path.join(payloadDir, 'sheet.css')),
    i18n: await readMaybe(path.join(payloadDir, 'translation.json')),
  };
  const stateCandidate = baselineFixture?.previewDom?.stateCandidate ?? baselineFixture?.previewStateCandidate ?? null;
  const actualRootWidth = Number(actualStyleProbe?.root?.rect?.width ?? 0) || null;
  const actualCssScale = Number(actualMeta.scale?.x ?? 0) || null;
  const candidates = [];
  const renderContext = await browser.newContext({
    viewport: { width: 1200, height: 900 },
    deviceScaleFactor: actualDeviceScaleFactor,
  });
  const renderPage = await renderContext.newPage();

  try {
    const commonCandidateInput = {
      renderPage,
      comparePage,
      buildSheetDoc,
      payload,
      stateCandidate,
      actualFile,
      actualMeta,
      comparedSize,
      artifactDir,
    };
    const candidateInputs = [
      {
        id: 'normal-root-no-state',
        applyStateHint: false,
        roll20SandboxSanitize: false,
        captureMode: 'root-top-left',
      },
      {
        id: 'sandbox-root-no-state',
        applyStateHint: false,
        roll20SandboxSanitize: true,
        captureMode: 'root-top-left',
      },
    ];

    if (actualRootWidth) {
      candidateInputs.push(
        {
          id: 'normal-actual-root-width-no-state',
          applyStateHint: false,
          roll20SandboxSanitize: false,
          captureMode: 'root-top-left',
          contextPatch: { mode: 'actual-root-width', rootWidth: actualRootWidth },
        },
        {
          id: 'sandbox-actual-root-width-no-state',
          applyStateHint: false,
          roll20SandboxSanitize: true,
          captureMode: 'root-top-left',
          contextPatch: { mode: 'actual-root-width', rootWidth: actualRootWidth },
        },
      );

      if (actualCssScale) {
        candidateInputs.push({
          id: 'sandbox-actual-css-scale-no-state',
          applyStateHint: false,
          roll20SandboxSanitize: true,
          captureMode: 'root-top-left',
          contextPatch: { mode: 'actual-css-scale', rootWidth: actualRootWidth, scale: actualCssScale },
        });
      }

      candidateInputs.push({
        id: 'normal-roll20-dialog-padding-no-state',
        applyStateHint: false,
        roll20SandboxSanitize: false,
        captureMode: 'root-top-left',
        contextPatch: { mode: 'roll20-dialog-padding', rootWidth: actualRootWidth },
      });
      candidateInputs.push({
        id: 'sandbox-inline-block-fit-tolerance-no-state',
        applyStateHint: false,
        roll20SandboxSanitize: true,
        captureMode: 'root-top-left',
        contextPatch: { mode: 'inline-block-fit-tolerance', rootWidth: actualRootWidth },
      });
    }

    candidateInputs.push(
      {
        id: 'normal-root-top-left',
        applyStateHint: true,
        roll20SandboxSanitize: false,
        captureMode: 'root-top-left',
      },
      {
        id: 'sandbox-root-top-left',
        applyStateHint: true,
        roll20SandboxSanitize: true,
        captureMode: 'root-top-left',
      },
      {
        id: 'sandbox-frame-inset',
        applyStateHint: true,
        roll20SandboxSanitize: true,
        captureMode: 'frame-inset',
      },
      {
        id: 'sandbox-fit-visible-width',
        applyStateHint: true,
        roll20SandboxSanitize: true,
        captureMode: 'fit-visible-width',
      },
    );

    for (const candidateInput of candidateInputs) {
      candidates.push(await renderCandidate({ ...commonCandidateInput, ...candidateInput }));
    }
  } finally {
    await renderContext.close();
  }

  if (actualStyleProbe) {
    for (const candidate of candidates) {
      candidate.computedStyleScore = scoreComputedStyleComparison(
        compareComputedStyles(actualStyleProbe, candidate.metrics?.styleProbe),
      );
    }
  }
  const bestCandidate = candidates.reduce((best, candidate) => pickBetterCandidate(best, candidate), null);
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
    actualDeviceScaleFactor,
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
    computedStyleComparison: actualStyleProbe && bestCandidate
      ? compareComputedStyles(actualStyleProbe, bestCandidate.metrics?.styleProbe)
      : null,
  };
}

function pickBetterCandidate(best, candidate) {
  if (!best) return candidate;
  const mismatchDelta = candidate.mismatchRatio - best.mismatchRatio;
  if (mismatchDelta < -0.000001) return candidate;
  if (mismatchDelta > 0.000001) return best;
  const candidateScore = candidate.computedStyleScore ?? Number.POSITIVE_INFINITY;
  const bestScore = best.computedStyleScore ?? Number.POSITIVE_INFINITY;
  if (candidateScore < bestScore) return candidate;
  return best;
}

function scoreComputedStyleComparison(comparison) {
  if (!comparison) return Number.POSITIVE_INFINITY;
  let score = 0;
  score += (comparison.rootDiffs ?? []).length * 20;
  for (const diff of comparison.selectorDiffs ?? []) {
    if (!diff.actualPartial && !diff.localPartial) {
      score += Math.abs(diff.countDelta ?? 0) * 10;
    }
    score += (diff.sampleDiffs ?? []).length;
  }
  return score;
}

async function renderCandidate({
  id,
  renderPage,
  comparePage,
  buildSheetDoc,
  payload,
  stateCandidate,
  applyStateHint,
  actualFile,
  actualMeta,
  comparedSize,
  artifactDir,
  roll20SandboxSanitize,
  captureMode,
  contextPatch = null,
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
  if (contextPatch) await applyRenderContextPatch(renderPage, contextPatch);
  if (applyStateHint) await applyStateCandidate(renderPage, stateCandidate);
  await renderPage.waitForTimeout(300);

  const metrics = await renderPage.evaluate(() => {
    const root = document.querySelector('#charsheet-root');
    const dialog = document.querySelector('#dialog-window');
    const body = document.body;
    function pickStyle(el) {
      if (!el) return null;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName,
        id: el.id || '',
        className: typeof el.className === 'string' ? el.className : String(el.className || ''),
        name: el.getAttribute('name') || '',
        type: el.getAttribute('type') || '',
        text: (el.textContent || '').trim().slice(0, 80),
        rect: { x: r.x, y: r.y, width: r.width, height: r.height },
        scroll: { width: el.scrollWidth, height: el.scrollHeight },
        style: {
          display: cs.display,
          position: cs.position,
          boxSizing: cs.boxSizing,
          width: cs.width,
          height: cs.height,
          minWidth: cs.minWidth,
          maxWidth: cs.maxWidth,
          margin: cs.margin,
          padding: cs.padding,
          border: cs.border,
          overflow: cs.overflow,
          fontFamily: cs.fontFamily,
          fontSize: cs.fontSize,
          lineHeight: cs.lineHeight,
          color: cs.color,
          backgroundColor: cs.backgroundColor,
          backgroundImage: cs.backgroundImage.slice(0, 160),
          transform: cs.transform,
          zoom: cs.zoom || '',
        },
      };
    }
    function pickTargetGeometry(el, depth = 0) {
      if (!el) return null;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const children = depth > 0 ? [] : Array.from(el.children).slice(0, 30).map((child) => pickTargetGeometry(child, depth + 1));
      return {
        tag: el.tagName,
        id: el.id || '',
        className: typeof el.className === 'string' ? el.className : String(el.className || ''),
        name: el.getAttribute('name') || '',
        type: el.getAttribute('type') || '',
        text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 100),
        rect: { x: r.x, y: r.y, width: r.width, height: r.height },
        scroll: { width: el.scrollWidth || 0, height: el.scrollHeight || 0 },
        natural: el.tagName === 'IMG' ? { width: el.naturalWidth || 0, height: el.naturalHeight || 0, complete: Boolean(el.complete), src: el.currentSrc || el.src || '' } : null,
        style: {
          display: cs.display,
          visibility: cs.visibility,
          position: cs.position,
          float: cs.float,
          clear: cs.clear,
          boxSizing: cs.boxSizing,
          width: cs.width,
          height: cs.height,
          minHeight: cs.minHeight,
          maxHeight: cs.maxHeight,
          margin: cs.margin,
          padding: cs.padding,
          border: cs.border,
          overflow: cs.overflow,
          fontSize: cs.fontSize,
          lineHeight: cs.lineHeight,
          verticalAlign: cs.verticalAlign,
          backgroundColor: cs.backgroundColor,
        },
        children,
      };
    }
    function rect(el) {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    }
    const selectors = [
      'html',
      'body',
      'form.sheetform',
      '.charactersheet',
      '#charsheet-root',
      '.sheet-tabstoggle',
      '.sheet-fullsheet',
      '.sheet-combat',
      '.sheet-2colrow',
      '.sheet-col',
      'img',
      'table',
      'tr',
      'td',
      'input',
      'button[type="roll"]',
      'button[type="action"]',
    ];
    return {
      bodyScroll: { width: body.scrollWidth, height: body.scrollHeight },
      rootRect: rect(root),
      dialogRect: rect(dialog),
      sandboxMode: body.getAttribute('data-roll20-sandbox-sanitize') ?? '',
      styleProbe: {
        root: pickStyle(root),
        state: {
          sheetTab: document.querySelector('[name="attr_sheetTab"]')?.value || null,
          sheetTabForBtn: document.querySelector('[name="attr_sheetTabForBtn"]')?.value || null,
        },
        selected: selectors.map((selector) => {
          const nodes = Array.from(document.querySelectorAll(selector));
          const visible = nodes.filter((el) => {
            const r = el.getBoundingClientRect();
            return r.width > 0 || r.height > 0 || selector === 'html' || selector === 'body';
          }).slice(0, 3);
          return { selector, count: nodes.length, samples: visible.map(pickStyle) };
        }),
      },
      targetGeometry: {
        rows: Array.from(document.querySelectorAll('.sheet-2colrow')).map((row, index) => ({ index, ...pickTargetGeometry(row) })),
        tables: Array.from(document.querySelectorAll('table')).slice(0, 12).map((table, index) => ({ index, ...pickTargetGeometry(table) })),
        images: Array.from(document.querySelectorAll('img')).map((image, index) => ({ index, ...pickTargetGeometry(image) })),
      },
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
  const nativePixelSize = actualMeta.pixelCrop?.w && actualMeta.pixelCrop?.h
    ? [Math.round(actualMeta.pixelCrop.w), Math.round(actualMeta.pixelCrop.h)]
    : null;
  const nativeCompare = nativePixelSize && (nativePixelSize[0] !== comparedSize[0] || nativePixelSize[1] !== comparedSize[1])
    ? await compareImages(comparePage, {
        localFile: outFile,
        actualFile,
        comparedSize: nativePixelSize,
      })
    : null;
  let nativeOverlayFile = null;
  if (nativeCompare) {
    nativeOverlayFile = path.join(artifactDir, `${id}-native-overlay.png`);
    await writeDataUrl(nativeOverlayFile, nativeCompare.overlayDataUrl);
    delete nativeCompare.overlayDataUrl;
  }
  return {
    id,
    roll20SandboxSanitize,
    applyStateHint,
    captureMode,
    contextPatch: contextPatch?.mode ?? null,
    screenshot: outFile,
    overlay: overlayFile,
    nativeOverlay: nativeOverlayFile,
    nativeCompare: nativeCompare
      ? {
          comparedSize: nativeCompare.comparedSize,
          mismatchRatio: nativeCompare.mismatchRatio,
          rmsRgb: nativeCompare.rmsRgb,
          bounds: nativeCompare.bounds,
        }
      : null,
    metrics,
    ...compare,
  };
}

async function applyRenderContextPatch(page, contextPatch) {
  await page.evaluate((patch) => {
    const dialogWindow = document.querySelector('#dialog-window');
    const dialog = document.querySelector('#dialog-window .dialog.largedialog');
    if (!(dialogWindow instanceof HTMLElement) || !(dialog instanceof HTMLElement)) return;
    if (patch.mode === 'actual-root-width') {
      dialogWindow.style.width = `${Math.max(1, Math.round(patch.rootWidth))}px`;
      dialog.style.paddingLeft = '0px';
      dialog.style.paddingRight = '0px';
    } else if (patch.mode === 'actual-css-scale') {
      const scale = Math.max(0.1, Number(patch.scale) || 1);
      dialogWindow.style.width = `${Math.max(1, Math.round(patch.rootWidth / scale))}px`;
      dialogWindow.style.zoom = String(scale);
      dialog.style.paddingLeft = '0px';
      dialog.style.paddingRight = '0px';
    } else if (patch.mode === 'roll20-dialog-padding') {
      const paddingX = 40;
      dialogWindow.style.width = `${Math.max(1, Math.round(patch.rootWidth + paddingX))}px`;
      dialog.style.paddingLeft = '20px';
      dialog.style.paddingRight = '20px';
      dialog.style.boxSizing = 'border-box';
    } else if (patch.mode === 'inline-block-fit-tolerance') {
      dialogWindow.style.width = `${Math.max(1, Math.round(patch.rootWidth))}px`;
      dialog.style.paddingLeft = '0px';
      dialog.style.paddingRight = '0px';
      const style = document.createElement('style');
      style.setAttribute('data-r20-diagnostic-context-patch', 'inline-block-fit-tolerance');
      style.textContent = `
        .ui-dialog .charsheet .sheet-2colrow,
        .ui-dialog .charsheet .sheet-3colrow {
          word-spacing: -1px;
        }
        .ui-dialog .charsheet .sheet-2colrow > .sheet-col,
        .ui-dialog .charsheet .sheet-3colrow > .sheet-col {
          word-spacing: normal;
        }
      `;
      document.head.append(style);
    }
  }, contextPatch);
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
  const best = candidates.reduce((acc, item) => pickBetterCandidate(acc, item), null);
  const notes = [];
  if (best && typeof previousMismatchRatio === 'number') {
    const gain = previousMismatchRatio - best.mismatchRatio;
    if (gain > 0.03) notes.push(`same-context candidate improves mismatch by ${pct(gain)} over previous ${pct(previousMismatchRatio)}`);
    else notes.push(`same-context candidates do not materially beat previous ${pct(previousMismatchRatio)}`);
  }
  if (best && best.applyStateHint === false) notes.push('best candidate does not apply the local state-map hint');
  if (best?.id?.includes('sandbox')) notes.push('best candidate uses local sandbox sanitize approximation');
  if (best?.id === 'sandbox-frame-inset') notes.push('Roll20 frame inset simulation is currently closest');
  if (best?.mismatchRatio > 0.15) notes.push('large visible delta remains after local context simulation');
  notes.push('full-height Roll20 capture is still required before a parity claim');
  return notes;
}

function compareComputedStyles(actualProbe, localProbe) {
  if (!actualProbe || !localProbe) return null;
  const fields = [
    'display',
    'position',
    'boxSizing',
    'width',
    'height',
    'margin',
    'padding',
    'overflow',
    'fontFamily',
    'fontSize',
    'lineHeight',
    'backgroundColor',
    'backgroundImage',
  ];
  const actualRoot = actualProbe.root ?? null;
  const localRoot = localProbe.root ?? null;
  const rootDiffs = compareNodeStyle(actualRoot, localRoot, fields);
  const selectorDiffs = [];
  const selectors = Array.from(new Set([
    ...(actualProbe.selected ?? []).map((entry) => entry.selector),
    ...(localProbe.selected ?? []).map((entry) => entry.selector),
  ].filter(Boolean)));
  for (const selector of selectors) {
    const actualEntry = findProbeSelectorEntry(actualProbe, selector);
    const localEntry = findProbeSelectorEntry(localProbe, selector);
    const actualSample = normalizeSampleForSelector(actualEntry.samples?.[0] ?? null, actualRoot, selector);
    const localSample = normalizeSampleForSelector(localEntry?.samples?.[0] ?? null, localRoot, selector);
    selectorDiffs.push({
      selector,
      actualCount: actualEntry.count ?? 0,
      localCount: localEntry?.count ?? 0,
      countDelta: (localEntry?.count ?? 0) - (actualEntry.count ?? 0),
      actualSource: actualEntry.source ?? 'selected',
      localSource: localEntry?.source ?? 'selected',
      actualPartial: Boolean(actualEntry.partial),
      localPartial: Boolean(localEntry?.partial),
      sampleDiffs: compareNodeStyle(actualSample, localSample, fields).slice(0, 12),
    });
  }
  return {
    source: 'actual live-iframe-probe computed styles vs best local same-context candidate',
    actualCapturedAt: actualProbe.capturedAt ?? null,
    rootDiffs,
    state: {
      actual: actualProbe.state ?? null,
      local: localProbe.state ?? null,
    },
    selectorDiffs,
    notable: buildComputedStyleNotes(rootDiffs, selectorDiffs, actualProbe.state, localProbe.state),
  };
}

function normalizeSampleForSelector(sample, root, selector) {
  if (!sample || !root?.rect || !sample.rect) return sample;
  if (selector === 'html' || selector === 'body' || selector === 'form.sheetform' || selector === '.charactersheet' || selector === '#charsheet-root') {
    return sample;
  }
  return {
    ...sample,
    rect: {
      ...sample.rect,
      x: Number((sample.rect.x - root.rect.x).toFixed(3)),
      y: Number((sample.rect.y - root.rect.y).toFixed(3)),
    },
  };
}

function findProbeSelectorEntry(probe, selector) {
  const direct = (probe.selected ?? []).find((entry) => entry.selector === selector);
  if (direct) return { ...direct, source: direct.source ?? 'selected', partial: Boolean(direct.partial) };
  if (selector === 'img') {
    const samples = (probe.visibleTop ?? []).filter((entry) => entry.tag === 'IMG');
    if (samples.length) return { selector, count: samples.length, samples, source: 'visibleTop-fallback', partial: true };
  }
  if (selector.startsWith('.')) {
    const className = selector.slice(1);
    const samples = (probe.visibleTop ?? []).filter((entry) =>
      typeof entry.className === 'string' && entry.className.split(/\s+/).includes(className),
    );
    if (samples.length) return { selector, count: samples.length, samples, source: 'visibleTop-fallback', partial: true };
  }
  return { selector, count: 0, samples: [], source: 'missing', partial: false };
}

function compareNodeStyle(actualNode, localNode, fields) {
  if (!actualNode || !localNode) {
    return [{ field: 'node', actual: actualNode ? 'present' : 'missing', local: localNode ? 'present' : 'missing' }];
  }
  const diffs = [];
  const rectFields = ['x', 'y', 'width', 'height'];
  for (const field of rectFields) {
    const actual = actualNode.rect?.[field] ?? null;
    const local = localNode.rect?.[field] ?? null;
    if (actual !== local) diffs.push({ field: `rect.${field}`, actual, local, delta: numericDelta(local, actual) });
  }
  for (const field of fields) {
    const actual = actualNode.style?.[field] ?? null;
    const local = localNode.style?.[field] ?? null;
    if (actual !== local) diffs.push({ field: `style.${field}`, actual, local });
  }
  return diffs;
}

function numericDelta(local, actual) {
  return typeof local === 'number' && typeof actual === 'number' ? Number((local - actual).toFixed(3)) : null;
}

function buildComputedStyleNotes(rootDiffs, selectorDiffs, actualState, localState) {
  const notes = [];
  const rootWidth = rootDiffs.find((diff) => diff.field === 'rect.width');
  const rootHeight = rootDiffs.find((diff) => diff.field === 'rect.height');
  if (rootWidth) notes.push(`root width differs actual=${rootWidth.actual} local=${rootWidth.local}`);
  if (rootHeight) notes.push(`root height differs actual=${rootHeight.actual} local=${rootHeight.local}`);
  const partialSelectors = selectorDiffs
    .filter((diff) => diff.actualPartial || diff.localPartial)
    .map((diff) => diff.selector);
  if (partialSelectors.length) {
    notes.push(`selector counts are partial for ${partialSelectors.join(', ')}; refresh the live iframe selected-selector probe before renderer CSS changes`);
  }
  if (actualState?.sheetTab !== localState?.sheetTab || actualState?.sheetTabForBtn !== localState?.sheetTabForBtn) {
    notes.push(`state differs actual=${JSON.stringify(actualState)} local=${JSON.stringify(localState)}`);
  }
  for (const selector of ['.sheet-fullsheet', '.sheet-combat', 'table', 'input']) {
    const diff = selectorDiffs.find((entry) => entry.selector === selector);
    if (diff && diff.countDelta !== 0 && !diff.actualPartial && !diff.localPartial) {
      notes.push(`${selector} count differs actual=${diff.actualCount} local=${diff.localCount}`);
    }
  }
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
    lines.push('| Candidate | Sandbox sanitize | State hint | Context patch | Style score | Capture mode | CSS mismatch | Native mismatch | RMS | Bounds | Screenshot | Overlay |');
    lines.push('| --- | ---: | ---: | --- | ---: | --- | ---: | ---: | ---: | ---: | --- | --- |');
    for (const candidate of fixture.candidates) {
      lines.push(`| ${candidate.id} | ${candidate.roll20SandboxSanitize ? 'on' : 'off'} | ${candidate.applyStateHint ? 'on' : 'off'} | ${candidate.contextPatch ?? ''} | ${Number.isFinite(candidate.computedStyleScore) ? candidate.computedStyleScore : ''} | ${candidate.captureMode} | ${pct(candidate.mismatchRatio)} | ${pct(candidate.nativeCompare?.mismatchRatio)} | ${candidate.rmsRgb} | ${Array.isArray(candidate.bounds) ? candidate.bounds.join(',') : ''} | \`${path.relative(runDir, candidate.screenshot)}\` | \`${path.relative(runDir, candidate.overlay)}\` |`);
    }
    lines.push('');
    if (fixture.computedStyleComparison) {
      lines.push('### Computed Style Comparison');
      lines.push('');
      for (const note of fixture.computedStyleComparison.notable ?? []) lines.push(`- ${note}`);
      lines.push('');
      lines.push('| Selector | Actual count | Local count | Actual source | Local source | Sample diffs |');
      lines.push('| --- | ---: | ---: | --- | --- | --- |');
      for (const diff of (fixture.computedStyleComparison.selectorDiffs ?? []).slice(0, 18)) {
        const sample = (diff.sampleDiffs ?? []).slice(0, 5).map((item) => `${item.field}: ${item.actual} -> ${item.local}`).join('<br>');
        const actualSource = diff.actualPartial ? `${diff.actualSource} (partial)` : diff.actualSource;
        const localSource = diff.localPartial ? `${diff.localSource} (partial)` : diff.localSource;
        lines.push(`| \`${diff.selector}\` | ${diff.actualCount} | ${diff.localCount} | ${actualSource} | ${localSource} | ${sample} |`);
      }
      lines.push('');
    }
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

async function readJsonIfExists(file) {
  if (!existsSync(file)) return null;
  return JSON.parse(await readFile(file, 'utf8'));
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
