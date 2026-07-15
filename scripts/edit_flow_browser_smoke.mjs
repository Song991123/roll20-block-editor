#!/usr/bin/env node
/**
 * edit_flow_browser_smoke.mjs
 *
 * Browser smoke for the Figma-like flow drop slice (docs/ux/32_dom_layer_editing_plan.md).
 * Runs the statically exported app (`out/`) in headless Chromium and verifies:
 *
 *   A. window.__perfHook.appendFriendlyWidgetForEditSmoke({mode:'flow'})
 *      -> widget nests under container, no position:absolute in emitted tag.
 *   B. same hook with mode:'absolute'
 *      -> widget stays top-level with position:absolute.
 *   C. REAL DragEvent path on the edit canvas:
 *      C1. drop a 'section' widget onto the empty canvas background -> absolute.
 *      C2. drop a 'text-input' widget with clientX/Y over the rendered section
 *          (real dragover + drop DragEvents with DataTransfer payload, same
 *          events the WidgetGallery produces) -> flow nesting, no absolute.
 *
 * Usage:
 *   PLAYWRIGHT_BROWSERS_PATH=<browsers> node scripts/edit_flow_browser_smoke.mjs \
 *     --out-dir ./out --base-path /roll20-block-editor --report-dir reports/edit-flow-smoke
 *
 * Requires: playwright-core (devDependency) + a chromium headless shell install.
 * Writes: <report-dir>/edit-flow-smoke-results.json, *.png screenshots.
 */

import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
function argOf(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}
const OUT_DIR = path.resolve(argOf('--out-dir', './out'));
const BASE_PATH = argOf('--base-path', '/roll20-block-editor');
const REPORT_DIR = path.resolve(argOf('--report-dir', 'reports/edit-flow-smoke'));
const PORT = Number(argOf('--port', '4173'));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain',
  '.ico': 'image/x-icon',
};

function startServer() {
  const server = http.createServer(async (req, res) => {
    try {
      let url = decodeURIComponent((req.url ?? '/').split('?')[0]);
      if (url.startsWith(BASE_PATH)) url = url.slice(BASE_PATH.length) || '/';
      if (url.endsWith('/')) url += 'index.html';
      const file = path.join(OUT_DIR, path.normalize(url).replace(/^([/\\])+/, ''));
      if (!file.startsWith(OUT_DIR)) {
        res.writeHead(403).end();
        return;
      }
      const body = await fs.readFile(file);
      res.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  return new Promise((resolve) => server.listen(PORT, '127.0.0.1', () => resolve(server)));
}

async function main() {
  await fs.mkdir(REPORT_DIR, { recursive: true });
  const server = await startServer();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1480, height: 960 } });

  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('__perfOn', '1');
      // Keep runs deterministic: drop any autosaved workspace state.
      window.localStorage.removeItem('r20be-autosave');
      window.localStorage.removeItem('r20-ui');
    } catch {}
  });

  const url = `http://127.0.0.1:${PORT}${BASE_PATH}/`;
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => Boolean(window.__perfHook), null, { timeout: 30000 });

  const results = { url, startedAt: new Date().toISOString(), tests: {} };

  // Blockly + adapter workspaces initialize lazily after first paint; the
  // first appendBlockToActive can return null until then. Retry the hook
  // smoke until block creation works instead of failing on cold start.
  async function runHookSmoke(mode) {
    const deadline = Date.now() + 20000;
    let last = null;
    while (Date.now() < deadline) {
      last = await page.evaluate((m) => {
        window.__perfHook.clearAll();
        return window.__perfHook.appendFriendlyWidgetForEditSmoke({ mode: m });
      }, mode);
      if (last.containerId && last.widgetId) return last;
      await page.waitForTimeout(500);
    }
    return last;
  }

  // ---- Test A: hook smoke, flow mode --------------------------------------
  results.tests.hookFlow = await runHookSmoke('flow');

  // ---- Test B: hook smoke, absolute mode ----------------------------------
  results.tests.hookAbsolute = await runHookSmoke('absolute');

  // ---- Test C: real DragEvents on the edit canvas -------------------------
  await page.evaluate(() => window.__perfHook.clearAll());
  await page.click('[data-testid="main-mode-edit"]');
  await page.waitForSelector('[data-testid="edit-canvas-scroll"]', { timeout: 15000 });
  results.tests.editUiCopy = await page.evaluate(() => {
    const root = document.querySelector('[data-testid="edit-canvas-root"]');
    const text = root?.textContent || '';
    const search = root?.querySelector('[placeholder="레이어 검색"]');
    const hasExpectedLabels =
      text.includes('시트 편집') &&
      text.includes('흐름') &&
      text.includes('자유') &&
      text.includes('폭') &&
      text.includes('맞춤') &&
      text.includes('레이어') &&
      Boolean(search);
    return {
      hasExpectedLabels,
      hasMojibakeHan: /[\u3400-\u9fff\uf900-\ufaff]/u.test(text),
      textSample: text.replace(/\s+/g, ' ').trim().slice(0, 300),
    };
  });
  // appendFriendlyWidgetPreset ignores drops for 1.2s after clearAll
  // (lastClearedAt guard). Test C uses the REAL product drop path on purpose,
  // so respect the guard instead of bypassing it.
  await page.waitForTimeout(1300);
  await page.screenshot({ path: path.join(REPORT_DIR, 'c0-edit-empty.png') });

  // Shared in-page drag helper: real dragover + drop DragEvents carrying the
  // same MIME payload WidgetGallery.onDragStart sets.
  await page.evaluate(() => {
    window.__smokeDrop = (presetId, clientX, clientY) => {
      const dt = new DataTransfer();
      dt.setData('application/x-r20-friendly-widget', JSON.stringify({ id: presetId }));
      const host = document.querySelector('[data-testid="edit-canvas-shadow-host"]');
      const shadowTarget = host?.shadowRoot?.elementFromPoint(clientX, clientY) ?? null;
      const domTarget = document.elementFromPoint(clientX, clientY);
      const target = shadowTarget ?? domTarget;
      if (!target) return { dispatched: false, reason: 'no element at point' };
      const init = { bubbles: true, cancelable: true, composed: true, clientX, clientY };
      const over = new DragEvent('dragover', init);
      Object.defineProperty(over, 'dataTransfer', { value: dt });
      target.dispatchEvent(over);
      const drop = new DragEvent('drop', init);
      Object.defineProperty(drop, 'dataTransfer', { value: dt });
      target.dispatchEvent(drop);
      return {
        dispatched: true,
        targetTag: target.tagName,
        viaShadow: Boolean(shadowTarget),
        dragoverPrevented: over.defaultPrevented,
        dropPrevented: drop.defaultPrevented,
      };
    };
    window.__smokeDragOver = (presetId, clientX, clientY) => {
      const dt = new DataTransfer();
      dt.setData('application/x-r20-friendly-widget', JSON.stringify({ id: presetId }));
      const host = document.querySelector('[data-testid="edit-canvas-shadow-host"]');
      const shadowTarget = host?.shadowRoot?.elementFromPoint(clientX, clientY) ?? null;
      const domTarget = document.elementFromPoint(clientX, clientY);
      const target = shadowTarget ?? domTarget;
      if (!target) return { dispatched: false, reason: 'no element at point' };
      const event = new DragEvent('dragover', { bubbles: true, cancelable: true, composed: true, clientX, clientY });
      Object.defineProperty(event, 'dataTransfer', { value: dt });
      target.dispatchEvent(event);
      const active = host?.shadowRoot?.querySelector('.r20-drop-target') ?? null;
      const marker = host?.shadowRoot?.querySelector('[data-r20-drop-position-marker="1"]') ?? null;
      const labelMarker = host?.shadowRoot?.querySelector('[data-r20-drop-label-marker="1"]') ?? null;
      const markerStyle = marker ? getComputedStyle(marker) : null;
      const labelStyle = labelMarker ? getComputedStyle(labelMarker) : null;
      return {
        dispatched: true,
        targetTag: target.tagName,
        viaShadow: Boolean(shadowTarget),
        dragoverPrevented: event.defaultPrevented,
        hostDragging: host?.getAttribute('data-r20-widget-dragging') ?? null,
        hostDropMode: host?.getAttribute('data-r20-drop-mode') ?? null,
        activeTargetId: active?.getAttribute('data-r20-block-id') ?? null,
        activeTargetMode: active?.getAttribute('data-r20-drop-mode') ?? null,
        dropMarkerMode: marker?.getAttribute('data-r20-drop-mode') ?? null,
        dropLabelMode: labelMarker?.getAttribute('data-r20-drop-mode') ?? null,
        dropLabelText: labelMarker?.textContent?.trim() ?? '',
        dropLabelPosition: labelStyle?.position ?? null,
        dropMarkerPosition: markerStyle?.position ?? null,
        dropMarkerWidth: markerStyle ? Math.round(Number.parseFloat(markerStyle.width)) : null,
        dropMarkerHeight: markerStyle ? Math.round(Number.parseFloat(markerStyle.height)) : null,
      };
    };
  });

  // C1: drop 'section' onto the canvas background (empty state) -> absolute.
  const scrollBox = await page.locator('[data-testid="edit-canvas-scroll"]').boundingBox();
  const c1 = await page.evaluate(
    ([x, y]) => window.__smokeDrop('section', x, y),
    [Math.round(scrollBox.x + scrollBox.width / 2), Math.round(scrollBox.y + 200)],
  );

  // Wait until the section is rendered inside the shadow host.
  await page.waitForFunction(
    () => {
      const host = document.querySelector('[data-testid="edit-canvas-shadow-host"]');
      return Boolean(host?.shadowRoot?.querySelector('div[data-r20-block-id]'));
    },
    null,
    { timeout: 15000 },
  );
  await page.screenshot({ path: path.join(REPORT_DIR, 'c1-section-dropped.png') });

  const canvasWidthControl = await (async () => {
    const before = await page.evaluate(() => {
      const input = document.querySelector('[data-testid="edit-canvas-width-input"]');
      const host = document.querySelector('[data-testid="edit-canvas-shadow-host"]');
      return {
        inputValue: input?.value ?? null,
        hostWidth: host ? Math.round(Number.parseFloat(getComputedStyle(host).width)) : null,
        aria: input?.getAttribute('aria-label') ?? null,
      };
    });
    await page.fill('[data-testid="edit-canvas-width-input"]', '930');
    await page.waitForFunction(() => {
      const host = document.querySelector('[data-testid="edit-canvas-shadow-host"]');
      return host && Math.round(Number.parseFloat(getComputedStyle(host).width)) === 930;
    }, null, { timeout: 10000 });
    const afterSheet = await page.evaluate(() => {
      const input = document.querySelector('[data-testid="edit-canvas-width-input"]');
      const host = document.querySelector('[data-testid="edit-canvas-shadow-host"]');
      return {
        inputValue: input?.value ?? null,
        hostWidth: host ? Math.round(Number.parseFloat(getComputedStyle(host).width)) : null,
        aria: input?.getAttribute('aria-label') ?? null,
      };
    });
    await page.click('[data-testid="edit-submode-rolltemplate"]');
    await page.waitForFunction(() => {
      const input = document.querySelector('[data-testid="edit-canvas-width-input"]');
      const host = document.querySelector('[data-testid="edit-canvas-shadow-host"]');
      return input?.value === '280' &&
        host &&
        Math.round(Number.parseFloat(getComputedStyle(host).width)) === 280;
    }, null, { timeout: 10000 });
    const rolltemplate = await page.evaluate(() => {
      const input = document.querySelector('[data-testid="edit-canvas-width-input"]');
      const host = document.querySelector('[data-testid="edit-canvas-shadow-host"]');
      return {
        inputValue: input?.value ?? null,
        hostWidth: host ? Math.round(Number.parseFloat(getComputedStyle(host).width)) : null,
        aria: input?.getAttribute('aria-label') ?? null,
      };
    });
    await page.click('[data-testid="edit-submode-sheet"]');
    await page.waitForFunction(() => {
      const input = document.querySelector('[data-testid="edit-canvas-width-input"]');
      const host = document.querySelector('[data-testid="edit-canvas-shadow-host"]');
      return input?.value === '930' &&
        host &&
        Math.round(Number.parseFloat(getComputedStyle(host).width)) === 930;
    }, null, { timeout: 10000 });
    const afterReturn = await page.evaluate(() => {
      const input = document.querySelector('[data-testid="edit-canvas-width-input"]');
      const host = document.querySelector('[data-testid="edit-canvas-shadow-host"]');
      return {
        inputValue: input?.value ?? null,
        hostWidth: host ? Math.round(Number.parseFloat(getComputedStyle(host).width)) : null,
        aria: input?.getAttribute('aria-label') ?? null,
      };
    });
    return { before, afterSheet, rolltemplate, afterReturn };
  })();

  const sectionInfo = await page.evaluate(() => {
    const host = document.querySelector('[data-testid="edit-canvas-shadow-host"]');
    const el = host.shadowRoot.querySelector('div[data-r20-block-id]');
    const rect = el.getBoundingClientRect();
    const style = el.getAttribute('style') ?? '';
    const selectedClassWasPresent = el.classList.contains('r20-selected');
    const selectedComputed = getComputedStyle(el);
    const selectedOutline = selectedComputed.outlineStyle;
    if (selectedClassWasPresent) el.classList.remove('r20-selected');
    const affordanceComputed = getComputedStyle(el);
    const persistentAffordanceOutline = affordanceComputed.outlineStyle;
    const persistentAffordanceOutlineWidth = affordanceComputed.outlineWidth;
    const persistentAffordanceBoxShadow = affordanceComputed.boxShadow;
    if (selectedClassWasPresent) el.classList.add('r20-selected');
    const readPx = (prop) => {
      const match = style.match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*(-?\\d+(?:\\.\\d+)?)px`, 'i'));
      return match ? Math.round(Number.parseFloat(match[1])) : null;
    };
    return {
      blockId: el.dataset.r20BlockId,
      style,
      left: readPx('left'),
      top: readPx('top'),
      canDrop: el.getAttribute('data-r20-can-drop'),
      layerRole: el.getAttribute('data-r20-layer-role'),
      selectedClassWasPresent,
      selectedOutline,
      persistentAffordanceOutline,
      persistentAffordanceOutlineWidth,
      persistentAffordanceBoxShadow,
      cx: Math.round(rect.x + rect.width / 2),
      cy: Math.round(rect.y + rect.height / 2),
    };
  });

  // C1b: drag the existing section itself. This catches the rollback-feeling
  // path: pointer drag should keep the visual position and update emitted HTML
  // immediately, while the Blockly/CSS model commit follows behind.
  const dragDelta = { x: 96, y: 40 };
  await page.evaluate((blockId) => {
    const host = document.querySelector('[data-testid="edit-canvas-shadow-host"]');
    const escaped = CSS.escape(blockId);
    const samples = [];
    let done = false;
    const startedAt = performance.now();
    const readSample = (time) => {
      const el = host?.shadowRoot?.querySelector(`div[data-r20-block-id="${escaped}"]`);
      samples.push({
        time: Math.round((time - startedAt) * 10) / 10,
        transform: el?.style.transform ?? '',
        left: el ? Math.round(Number.parseFloat(getComputedStyle(el).left)) : null,
        top: el ? Math.round(Number.parseFloat(getComputedStyle(el).top)) : null,
      });
    };
    const summarize = () => {
      const gaps = [];
      for (let i = 1; i < samples.length; i += 1) {
        gaps.push(samples[i].time - samples[i - 1].time);
      }
      const movingSamples = samples.filter((sample) => sample.transform.includes('translate3d'));
      return {
        frameCount: samples.length,
        movingFrameCount: movingSamples.length,
        durationMs: samples.length ? samples[samples.length - 1].time : 0,
        avgFrameGapMs: gaps.length
          ? Math.round((gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length) * 10) / 10
          : null,
        maxFrameGapMs: gaps.length ? Math.round(Math.max(...gaps) * 10) / 10 : null,
        firstMovingFrameMs: movingSamples[0]?.time ?? null,
        lastMovingFrameMs: movingSamples[movingSamples.length - 1]?.time ?? null,
        samples: samples.slice(0, 24),
      };
    };
    window.__r20EditDragPerf = {
      stop() {
        done = true;
        const summary = summarize();
        window.__r20EditDragPerfSummary = summary;
        return summary;
      },
    };
    requestAnimationFrame(function tick(time) {
      readSample(time);
      if (!done) requestAnimationFrame(tick);
    });
  }, sectionInfo.blockId);
  await page.mouse.move(sectionInfo.cx, sectionInfo.cy);
  await page.mouse.down();
  await page.mouse.move(sectionInfo.cx + 20, sectionInfo.cy + 10, { steps: 2 });
  await page.mouse.move(sectionInfo.cx + dragDelta.x, sectionInfo.cy + dragDelta.y, { steps: 8 });
  await page.mouse.up();
  const sectionDragPerf = await page.evaluate(() => window.__r20EditDragPerf?.stop?.() ?? null);
  const sectionMoveTimeline = await page.evaluate(async (blockId) => {
    const host = document.querySelector('[data-testid="edit-canvas-shadow-host"]');
    const escaped = CSS.escape(blockId);
    const samples = [];
    const t0 = performance.now();
    const readPx = (text, prop) => {
      const match = text.match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*(-?\\d+(?:\\.\\d+)?)px`, 'i'));
      return match ? Math.round(Number.parseFloat(match[1])) : null;
    };
    const readEmitPosition = () => {
      const emit = window.__perfHook.getEmitContent();
      const marker = `data-r20-block-id="${blockId}"`;
      const markerIndex = emit.html.indexOf(marker);
      const tagStart = markerIndex >= 0 ? emit.html.lastIndexOf('<', markerIndex) : -1;
      const tagEnd = markerIndex >= 0 ? emit.html.indexOf('>', markerIndex) : -1;
      const emittedTag = tagStart >= 0 && tagEnd > tagStart ? emit.html.slice(tagStart, tagEnd + 1) : '';
      const styleAttr = emittedTag.match(/\sstyle=(["'])([\s\S]*?)\1/i)?.[2] ?? '';
      const classAttr = emittedTag.match(/\sclass=(["'])([\s\S]*?)\1/i)?.[2] ?? '';
      const classNames = classAttr
        .split(/\s+/)
        .filter((name) => name.includes('r20-node'))
        .flatMap((name) => (name.startsWith('sheet-') ? [name, name.slice('sheet-'.length)] : [name]));
      let cssRule = '';
      for (const className of classNames) {
        const escapedClass = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const match = emit.css.match(new RegExp(`[^{}]*\\.${escapedClass}[^{}]*\\{([^}]*)\\}`, 'm'));
        if (match) {
          cssRule = match[1];
          break;
        }
      }
      return {
        emittedLeft: readPx(styleAttr, 'left') ?? readPx(cssRule, 'left'),
        emittedTop: readPx(styleAttr, 'top') ?? readPx(cssRule, 'top'),
      };
    };
    const sample = (label) => {
      const el = host?.shadowRoot?.querySelector(`div[data-r20-block-id="${escaped}"]`);
      const computed = el ? getComputedStyle(el) : null;
      const emitPosition = readEmitPosition();
      samples.push({
        label,
        t: Math.round((performance.now() - t0) * 10) / 10,
        left: computed ? Math.round(Number.parseFloat(computed.left)) : null,
        top: computed ? Math.round(Number.parseFloat(computed.top)) : null,
        emittedLeft: emitPosition.emittedLeft,
        emittedTop: emitPosition.emittedTop,
        transform: el?.style.transform ?? null,
      });
    };
    sample('after-pointerup');
    await new Promise((resolve) => requestAnimationFrame(resolve));
    sample('after-1raf');
    await new Promise((resolve) => setTimeout(resolve, 50));
    sample('after-50ms');
    await new Promise((resolve) => setTimeout(resolve, 200));
    sample('after-250ms');
    const numeric = samples.filter((s) => typeof s.left === 'number' && typeof s.top === 'number');
    const lefts = numeric.map((s) => s.left);
    const tops = numeric.map((s) => s.top);
    const first = numeric[0] ?? null;
    const last = numeric[numeric.length - 1] ?? null;
    const emittedMatches = samples.filter(
      (s) =>
        typeof s.emittedLeft === 'number' &&
        typeof s.emittedTop === 'number' &&
        s.emittedLeft === last?.left &&
        s.emittedTop === last?.top,
    );
    const firstRaf = samples.find((s) => s.label === 'after-1raf');
    const firstEmitMatch = emittedMatches[0] ?? null;
    return {
      samples,
      numericSampleCount: numeric.length,
      firstLeft: first?.left ?? null,
      firstTop: first?.top ?? null,
      finalLeft: last?.left ?? null,
      finalTop: last?.top ?? null,
      leftDrift: lefts.length ? Math.max(...lefts) - Math.min(...lefts) : null,
      topDrift: tops.length ? Math.max(...tops) - Math.min(...tops) : null,
      timing: {
        firstRafDelayMs: typeof firstRaf?.t === 'number' ? firstRaf.t : null,
        dropCommitLatencyMs: typeof firstEmitMatch?.t === 'number' ? firstEmitMatch.t : null,
        firstEmitMatchLabel: firstEmitMatch?.label ?? null,
      },
    };
  }, sectionInfo.blockId);

  const movedSectionInfo = await page.evaluate((blockId) => {
    const host = document.querySelector('[data-testid="edit-canvas-shadow-host"]');
    const escaped = CSS.escape(blockId);
    const el = host.shadowRoot.querySelector(`div[data-r20-block-id="${escaped}"]`);
    const style = el?.getAttribute('style') ?? '';
    const computed = el ? getComputedStyle(el) : null;
    const emit = window.__perfHook.getEmitContent();
    const marker = `data-r20-block-id="${blockId}"`;
    const markerIndex = emit.html.indexOf(marker);
    const tagStart = markerIndex >= 0 ? emit.html.lastIndexOf('<', markerIndex) : -1;
    const tagEnd = markerIndex >= 0 ? emit.html.indexOf('>', markerIndex) : -1;
    const emittedTag = tagStart >= 0 && tagEnd > tagStart ? emit.html.slice(tagStart, tagEnd + 1) : '';
    const readPx = (text, prop) => {
      const match = text.match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*(-?\\d+(?:\\.\\d+)?)px`, 'i'));
      return match ? Math.round(Number.parseFloat(match[1])) : null;
    };
    const readClassRule = () => {
      const classAttr = emittedTag.match(/\sclass=(["'])([\s\S]*?)\1/i)?.[2] ?? '';
      const classNames = classAttr
        .split(/\s+/)
        .filter((name) => name.includes('r20-node'))
        .flatMap((name) => (name.startsWith('sheet-') ? [name, name.slice('sheet-'.length)] : [name]));
      for (const className of classNames) {
        const escapedClass = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const match = emit.css.match(new RegExp(`[^{}]*\\.${escapedClass}[^{}]*\\{([^}]*)\\}`, 'm'));
        if (match) return match[1];
      }
      return '';
    };
    const styleAttr = emittedTag.match(/\sstyle=(["'])([\s\S]*?)\1/i)?.[2] ?? '';
    const cssRule = readClassRule();
    const emittedLeft = readPx(styleAttr, 'left') ?? readPx(cssRule, 'left');
    const emittedTop = readPx(styleAttr, 'top') ?? readPx(cssRule, 'top');
    return {
      style,
      computedPosition: computed?.position ?? null,
      computedLeft: computed ? Math.round(Number.parseFloat(computed.left)) : null,
      computedTop: computed ? Math.round(Number.parseFloat(computed.top)) : null,
      emittedTag,
      emittedCssRule: cssRule,
      left: readPx(style, 'left'),
      top: readPx(style, 'top'),
      emittedLeft,
      emittedTop,
      emittedHasAbsolute: /position\s*:\s*absolute/i.test(`${styleAttr};${cssRule}`),
    };
  }, sectionInfo.blockId);

  await page.screenshot({ path: path.join(REPORT_DIR, 'c1b-section-moved.png') });

  const c2Indicator = await page.evaluate(
    ([x, y]) => window.__smokeDragOver('text-input', x, y),
    [sectionInfo.cx + dragDelta.x, sectionInfo.cy + dragDelta.y],
  );
  await page.screenshot({ path: path.join(REPORT_DIR, 'c2-drop-indicator.png') });

  // C2: drop 'text-input' with coordinates over the section -> flow nesting.
  const c2 = await page.evaluate(
    ([x, y]) => window.__smokeDrop('text-input', x, y),
    [sectionInfo.cx + dragDelta.x, sectionInfo.cy + dragDelta.y],
  );

  await page.waitForFunction(
    () => {
      const host = document.querySelector('[data-testid="edit-canvas-shadow-host"]');
      return Boolean(
        host?.shadowRoot?.querySelector('div[data-r20-block-id] input[data-r20-block-id]'),
      );
    },
    null,
    { timeout: 15000 },
  );
  await page.screenshot({ path: path.join(REPORT_DIR, 'c2-input-nested.png') });

  const dragDropState = await page.evaluate(() => {
    const host = document.querySelector('[data-testid="edit-canvas-shadow-host"]');
    const nestedInput = host.shadowRoot.querySelector(
      'div[data-r20-block-id] input[data-r20-block-id]',
    );
    const emit = window.__perfHook.getEmitContent();
    const ws = window.__perfHook.getWorkspace();
    const statusEl = document.querySelector('[data-testid="edit-canvas-snap-toggle"]')
      ?.parentElement?.querySelector('.ml-auto');
    return {
      nestedInputFound: Boolean(nestedInput),
      nestedInputBlockId: nestedInput?.getAttribute('data-r20-block-id') ?? null,
      nestedInputStyle: nestedInput?.getAttribute('style') ?? null,
      nestedInputAbsolute: /position\s*:\s*absolute/i.test(nestedInput?.getAttribute('style') ?? ''),
      statusText: statusEl?.textContent ?? null,
      htmlBlocks: ws.blockCount.html,
      rootHtmlBlocks: ws.rootBlocks.html,
      emittedHtmlSnippetHasNesting:
        /<div[^>]*data-r20-block-id[^>]*>[\s\S]*<input[^>]*data-r20-block-id/i.test(emit.html),
    };
  });

  const c3 = await page.evaluate(
    ([x, y]) => window.__smokeDrop('text-input', x, y),
    [sectionInfo.cx + dragDelta.x, sectionInfo.cy + dragDelta.y + 24],
  );
  await page.waitForFunction(
    () => {
      const host = document.querySelector('[data-testid="edit-canvas-shadow-host"]');
      return (host?.shadowRoot?.querySelectorAll('div[data-r20-block-id] input[data-r20-block-id]').length ?? 0) >= 2;
    },
    null,
    { timeout: 15000 },
  );

  const nestedReorder = await page.evaluate(async () => {
    function childInputIds() {
      const host = document.querySelector('[data-testid="edit-canvas-shadow-host"]');
      return Array.from(host?.shadowRoot?.querySelectorAll('div[data-r20-block-id] input[data-r20-block-id]') ?? [])
        .map((el) => el.getAttribute('data-r20-block-id'))
        .filter(Boolean);
    }
    function emittedOrder(ids) {
      const html = window.__perfHook.getEmitContent().html;
      return ids
        .map((id) => ({ id, index: html.indexOf(`data-r20-block-id="${id}"`) }))
        .sort((a, b) => a.index - b.index)
        .map((item) => item.id);
    }
    const before = childInputIds();
    const emittedBefore = emittedOrder(before);
    const [targetId, movingId] = emittedBefore;
    const targetRow = document.querySelector(
      `[data-testid="edit-layer-row"][data-r20-block-id="${CSS.escape(targetId)}"]`,
    );
    if (!targetRow || !movingId) {
      return { before, emittedBefore, moved: false, reason: 'missing layer row or second emitted input' };
    }
    const rect = targetRow.getBoundingClientRect();
    const dt = new DataTransfer();
    dt.setData('application/x-r20-layer-block', movingId);
    const init = {
      bubbles: true,
      cancelable: true,
      clientX: Math.round(rect.left + rect.width / 2),
      clientY: Math.round(rect.top + rect.height * 0.12),
    };
    const over = new DragEvent('dragover', init);
    Object.defineProperty(over, 'dataTransfer', { value: dt });
    targetRow.dispatchEvent(over);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const mode = targetRow.getAttribute('data-r20-layer-drop-mode') || '';
    const drop = new DragEvent('drop', init);
    Object.defineProperty(drop, 'dataTransfer', { value: dt });
    targetRow.dispatchEvent(drop);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const after = childInputIds();
    return {
      before,
      emittedBefore,
      mode,
      moved: true,
      after,
      emittedAfter: emittedOrder(before),
      targetId,
      movingId,
    };
  });

  const canvasSiblingInsert = await page.evaluate(async () => {
    function childInputIds() {
      const host = document.querySelector('[data-testid="edit-canvas-shadow-host"]');
      return Array.from(host?.shadowRoot?.querySelectorAll('div[data-r20-block-id] input[data-r20-block-id]') ?? [])
        .map((el) => el.getAttribute('data-r20-block-id'))
        .filter(Boolean);
    }
    function emittedIndex(id) {
      return window.__perfHook.getEmitContent().html.indexOf(`data-r20-block-id="${id}"`);
    }
    function dragOverInput(targetId, ratio) {
      const host = document.querySelector('[data-testid="edit-canvas-shadow-host"]');
      const el = host?.shadowRoot?.querySelector(`[data-r20-block-id="${CSS.escape(targetId)}"]`);
      if (!host || !el) return { dispatched: false, reason: 'missing target' };
      const rect = el.getBoundingClientRect();
      return window.__smokeDragOver(
        'text-input',
        Math.round(rect.left + rect.width / 2),
        Math.round(rect.top + rect.height * ratio),
      );
    }
    function dropOnInput(targetId, ratio) {
      const host = document.querySelector('[data-testid="edit-canvas-shadow-host"]');
      const el = host?.shadowRoot?.querySelector(`[data-r20-block-id="${CSS.escape(targetId)}"]`);
      if (!host || !el) return { dispatched: false, reason: 'missing target' };
      const rect = el.getBoundingClientRect();
      return window.__smokeDrop(
        'text-input',
        Math.round(rect.left + rect.width / 2),
        Math.round(rect.top + rect.height * ratio),
      );
    }
    const beforeIds = childInputIds();
    const targetId = beforeIds[0];
    const beforeIndicator = dragOverInput(targetId, 0.2);
    const afterIndicator = dragOverInput(targetId, 0.8);
    const beforeDrop = dropOnInput(targetId, 0.2);
    await new Promise((resolve) => setTimeout(resolve, 500));
    const afterBeforeDropIds = childInputIds();
    const beforeNewId = afterBeforeDropIds.find((id) => !beforeIds.includes(id)) ?? null;
    const beforeNewIndexAfterEmit = beforeNewId ? emittedIndex(beforeNewId) : -1;
    const targetIndexAfterBeforeDrop = emittedIndex(targetId);

    const afterDrop = dropOnInput(targetId, 0.8);
    await new Promise((resolve) => setTimeout(resolve, 500));
    const afterAfterDropIds = childInputIds();
    const afterNewId = afterAfterDropIds.find((id) => !afterBeforeDropIds.includes(id)) ?? null;
    return {
      targetId,
      beforeIds,
      beforeIndicator,
      afterIndicator,
      beforeDrop,
      afterBeforeDropIds,
      beforeNewId,
      targetIndexBeforeEmit: emittedIndex(targetId),
      beforeNewIndexAfterEmit,
      targetIndexAfterBeforeDrop,
      afterDrop,
      afterAfterDropIds,
      afterNewId,
      afterNewIndexAfterEmit: afterNewId ? emittedIndex(afterNewId) : -1,
      targetIndexAfterAfterDrop: emittedIndex(targetId),
    };
  });

  const layerDropModes = await page.evaluate(
    async ({ sectionId, inputId }) => {
      const row = document.querySelector(
        `[data-testid="edit-layer-row"][data-r20-block-id="${CSS.escape(sectionId)}"]`,
      );
      if (!row || !inputId) return { found: Boolean(row), inputId: Boolean(inputId), modes: [] };
      const modes = [];
      const attrs = {
        roleKind: row.getAttribute('data-r20-layer-role-kind') || '',
        canDrop: row.getAttribute('data-r20-can-drop') || '',
        defaultDropMode: row.getAttribute('data-r20-default-drop-mode') || '',
        childCount: row.getAttribute('data-r20-layer-child-count') || '',
        roleRail: Boolean(row.querySelector('[data-testid="edit-layer-role-rail"]')),
        miniMap: Boolean(row.querySelector('[data-testid="edit-layer-mini-map"]')),
        miniMapRole: row.querySelector('[data-testid="edit-layer-mini-map"]')?.getAttribute('data-r20-layer-mini-role') || '',
        miniMapCanDrop: row.querySelector('[data-testid="edit-layer-mini-map"]')?.getAttribute('data-r20-layer-mini-can-drop') || '',
        miniMapChildCount: row.querySelector('[data-testid="edit-layer-mini-map"]')?.getAttribute('data-r20-layer-mini-child-count') || '',
        miniMapDropMode: row.querySelector('[data-testid="edit-layer-mini-map"]')?.getAttribute('data-r20-layer-mini-drop-mode') || '',
        childBadge: row.querySelector('[data-testid="edit-layer-child-count"]')?.textContent?.trim() || '',
        text: row.textContent?.replace(/\s+/g, ' ').trim() || '',
      };
      for (const ratio of [0.2, 0.5, 0.8]) {
        const rect = row.getBoundingClientRect();
        const dt = new DataTransfer();
        dt.setData('application/x-r20-layer-block', inputId);
        const event = new DragEvent('dragover', {
          bubbles: true,
          cancelable: true,
          clientX: Math.round(rect.left + rect.width / 2),
          clientY: Math.round(rect.top + rect.height * ratio),
        });
        Object.defineProperty(event, 'dataTransfer', { value: dt });
        row.dispatchEvent(event);
        await new Promise((resolve) => requestAnimationFrame(resolve));
        modes.push(row.getAttribute('data-r20-layer-drop-mode') || '');
      }
      row.dispatchEvent(new DragEvent('dragleave', { bubbles: true, cancelable: true }));
      return { found: true, inputId: true, modes, attrs };
    },
    { sectionId: sectionInfo.blockId, inputId: dragDropState.nestedInputBlockId },
  );

  const layerSearchContext = await (async () => {
    const inputId = dragDropState.nestedInputBlockId;
    if (!inputId) return { checked: false, reason: 'missing nested input block id' };
    await page.fill('[data-testid="edit-layer-search"]', inputId);
    await page.waitForFunction(
      (id) => {
        const rows = Array.from(document.querySelectorAll('[data-testid="edit-layer-row"]'));
        return rows.some((row) => row.getAttribute('data-r20-block-id') === id);
      },
      inputId,
      { timeout: 10000 },
    );
    const state = await page.evaluate(({ sectionId, inputId }) => {
      const rows = Array.from(document.querySelectorAll('[data-testid="edit-layer-row"]'));
      const read = (id) => {
        const row = rows.find((candidate) => candidate.getAttribute('data-r20-block-id') === id);
        return row
          ? {
              id,
              searchMatch: row.getAttribute('data-r20-layer-search-match'),
              contextOnly: row.getAttribute('data-r20-layer-context-only'),
              hasContextBadge: Boolean(row.querySelector('[data-testid="edit-layer-context-badge"]')),
              hasDepthGuide: Boolean(row.querySelector('[data-testid="edit-layer-depth-guide"]')),
              text: row.textContent?.replace(/\s+/g, ' ').trim() || '',
            }
          : null;
      };
      return {
        checked: true,
        rowCount: rows.length,
        section: read(sectionId),
        input: read(inputId),
        summaryText: document.querySelector('[data-testid="edit-layer-search"]')?.value || '',
      };
    }, { sectionId: sectionInfo.blockId, inputId });
    await page.fill('[data-testid="edit-layer-search"]', '');
    return state;
  })();

  const layerSelectionSync = await page.evaluate(async (inputId) => {
    if (!inputId) return { selected: false, reason: 'missing nested input block id' };
    const row = document.querySelector(
      `[data-testid="edit-layer-row"][data-r20-block-id="${CSS.escape(inputId)}"]`,
    );
    if (!row) return { selected: false, reason: 'missing layer row' };
    row.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const host = document.querySelector('[data-testid="edit-canvas-shadow-host"]');
    const selected = host?.shadowRoot?.querySelector('[data-r20-selected="1"], .r20-selected');
    const selectedId = selected?.getAttribute('data-r20-block-id') ?? null;
    return {
      selected: selectedId === inputId,
      selectedId,
      selectedClass: selected?.className?.toString() ?? '',
    };
  }, dragDropState.nestedInputBlockId);

  const layerSelectionPath = await page.evaluate(({ sectionId, inputId }) => {
    const root = document.querySelector('[data-testid="edit-layer-selection-path"]');
    const items = Array.from(root?.querySelectorAll('[data-testid="edit-layer-path-item"]') ?? []);
    const path = items.map((item) => ({
      id: item.getAttribute('data-r20-block-id'),
      role: item.getAttribute('data-r20-layer-role-kind'),
      current: item.getAttribute('data-r20-layer-path-current'),
      text: item.textContent?.replace(/\s+/g, ' ').trim() || '',
    }));
    return {
      visible: Boolean(root),
      depth: Number(root?.getAttribute('data-r20-layer-path-depth') || 0),
      hasSection: path.some((item) => item.id === sectionId),
      endsWithInput: path[path.length - 1]?.id === inputId,
      currentIsInput: path[path.length - 1]?.current === '1',
      path,
    };
  }, { sectionId: sectionInfo.blockId, inputId: dragDropState.nestedInputBlockId });

  const canvasSelectionSync = await page.evaluate(async (sectionId) => {
    if (!sectionId) return { selected: false, reason: 'missing section block id' };
    const host = document.querySelector('[data-testid="edit-canvas-shadow-host"]');
    const target = host?.shadowRoot?.querySelector(`[data-r20-block-id="${CSS.escape(sectionId)}"]`);
    if (!target) return { selected: false, reason: 'missing shadow target' };
    target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const row = document.querySelector(
      `[data-testid="edit-layer-row"][data-r20-block-id="${CSS.escape(sectionId)}"]`,
    );
    const selected = host?.shadowRoot?.querySelector('[data-r20-selected="1"], .r20-selected');
    const selectedId = selected?.getAttribute('data-r20-block-id') ?? null;
    return {
      selected: selectedId === sectionId && row?.getAttribute('data-r20-layer-selected') === '1',
      selectedId,
      rowSelected: row?.getAttribute('data-r20-layer-selected') ?? null,
      selectedClass: selected?.className?.toString() ?? '',
    };
  }, sectionInfo.blockId);

  const layerAutoScroll = await page.evaluate(async () => {
    const html = Array.from({ length: 80 }, (_, index) =>
      `<div class="scroll-item scroll-item-${index}" style="height:20px">row ${index}</div>`,
    ).join('\n');
    await window.__perfHook.importSheet({ html, css: '', i18n: '{}' });
    window.__perfHook.setMainMode('edit');
    await new Promise((resolve) => setTimeout(resolve, 600));
    const host = document.querySelector('[data-testid="edit-canvas-shadow-host"]');
    const layerScroll = document.querySelector('[data-testid="edit-layer-scroll"]');
    const target = host?.shadowRoot?.querySelector('.sheet-scroll-item-79');
    const targetId = target?.getAttribute('data-r20-block-id') ?? null;
    if (!target || !targetId || !layerScroll) {
      return {
        selected: false,
        reason: 'missing target or layer scroll',
        targetId,
        hasTarget: Boolean(target),
        hasLayerScroll: Boolean(layerScroll),
      };
    }
    const beforeScrollTop = layerScroll.scrollTop;
    target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => setTimeout(resolve, 100));
    const row = document.querySelector(
      `[data-testid="edit-layer-row"][data-r20-block-id="${CSS.escape(targetId)}"]`,
    );
    const rect = row?.getBoundingClientRect();
    const scrollRect = layerScroll.getBoundingClientRect();
    return {
      selected: row?.getAttribute('data-r20-layer-selected') === '1',
      targetId,
      beforeScrollTop,
      afterScrollTop: layerScroll.scrollTop,
      rowRendered: Boolean(row),
      rowVisible:
        Boolean(rect) &&
        rect.top >= scrollRect.top &&
        rect.bottom <= scrollRect.bottom,
    };
  });

  const nonLeafLayerReorder = await page.evaluate(async () => {
    const html = [
      '<div class="outer" style="width:520px; min-height:180px; padding:12px">',
      '  <div class="group-a" style="padding:8px">',
      '    <input type="text" name="attr_input_a" value="A">',
      '  </div>',
      '  <div class="group-b" style="padding:8px">',
      '    <input type="text" name="attr_input_b" value="B">',
      '  </div>',
      '</div>',
    ].join('\n');
    await window.__perfHook.importSheet({ html, css: '', i18n: '{}' });
    window.__perfHook.setMainMode('edit');
    await new Promise((resolve) => setTimeout(resolve, 500));

    const host = document.querySelector('[data-testid="edit-canvas-shadow-host"]');
    const root = host?.shadowRoot;
    const groupA = root?.querySelector('.sheet-group-a');
    const groupB = root?.querySelector('.sheet-group-b');
    const inputA = root?.querySelector('input[name="attr_input_a"]');
    const inputB = root?.querySelector('input[name="attr_input_b"]');
    const groupAId = groupA?.getAttribute('data-r20-block-id') ?? null;
    const groupBId = groupB?.getAttribute('data-r20-block-id') ?? null;
    const inputAId = inputA?.getAttribute('data-r20-block-id') ?? null;
    const inputBId = inputB?.getAttribute('data-r20-block-id') ?? null;
    if (!groupAId || !groupBId || !inputAId || !inputBId) {
      return { moved: false, reason: 'missing imported synthetic ids', groupAId, groupBId, inputAId, inputBId };
    }

    const beforeGraph = window.__perfHook.getBlockGraph('html');
    const beforeLayer = window.__perfHook.getLayerSnapshot?.('html') || [];
    const movingBefore = beforeGraph.find((node) => node.id === groupAId);
    const targetBefore = beforeGraph.find((node) => node.id === groupBId);
    const layerA = beforeLayer.find((node) => node.id === groupAId) || null;
    const layerB = beforeLayer.find((node) => node.id === groupBId) || null;
    const row = document.querySelector(
      `[data-testid="edit-layer-row"][data-r20-block-id="${CSS.escape(groupBId)}"]`,
    );
    if (!row) return { moved: false, reason: 'missing target layer row', groupAId, groupBId };
    const targetLayerBefore = {
      relation: row.getAttribute('data-r20-layer-relation') || '',
      parentId: row.getAttribute('data-r20-layer-parent-id') || null,
      previousId: row.getAttribute('data-r20-layer-previous-id') || null,
      text: row.textContent || '',
    };
    const rect = row.getBoundingClientRect();
    const dt = new DataTransfer();
    dt.setData('application/x-r20-layer-block', groupAId);
    const init = {
      bubbles: true,
      cancelable: true,
      clientX: Math.round(rect.left + rect.width / 2),
      clientY: Math.round(rect.top + rect.height * 0.9),
    };
    const over = new DragEvent('dragover', init);
    Object.defineProperty(over, 'dataTransfer', { value: dt });
    row.dispatchEvent(over);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const mode = row.getAttribute('data-r20-layer-drop-mode') || '';
    const drop = new DragEvent('drop', init);
    Object.defineProperty(drop, 'dataTransfer', { value: dt });
    row.dispatchEvent(drop);
    await new Promise((resolve) => setTimeout(resolve, 400));

    const emitted = window.__perfHook.getEmitContent().html;
    const afterGraph = window.__perfHook.getBlockGraph('html');
    const groupAIndex = emitted.indexOf('sheet-group-a');
    const groupBIndex = emitted.indexOf('sheet-group-b');
    const inputAIndex = emitted.indexOf('attr_input_a');
    const inputBIndex = emitted.indexOf('attr_input_b');
    const groupAEndIndex = emitted.indexOf('</div>', groupAIndex);
    const groupBEndIndex = emitted.indexOf('</div>', groupBIndex);
    const movingAfter = afterGraph.find((node) => node.id === groupAId);
    const targetAfter = afterGraph.find((node) => node.id === groupBId);
    return {
      moved: true,
      mode,
      groupAId,
      groupBId,
      inputAId,
      inputBId,
      movingBefore,
      targetBefore,
      layerA,
      layerB,
      layerSameParent: Boolean(layerA && layerB && layerA.layerParentId === layerB.layerParentId),
      layerSameDepth: Boolean(layerA && layerB && layerA.depth === layerB.depth),
      targetLayerBefore,
      targetLayerRelation: row.getAttribute('data-r20-layer-relation') || '',
      targetLayerParentId: row.getAttribute('data-r20-layer-parent-id') || null,
      targetLayerPreviousId: row.getAttribute('data-r20-layer-previous-id') || null,
      targetLayerText: row.textContent || '',
      movingAfter,
      targetAfter,
      indexes: { groupAIndex, groupBIndex, inputAIndex, inputBIndex, groupAEndIndex, groupBEndIndex },
      groupAAfterGroupB: groupAIndex > groupBIndex,
      inputAStayedInsideGroupA: groupAIndex >= 0 && inputAIndex > groupAIndex && inputAIndex < groupAEndIndex,
      inputBStayedInsideGroupB: groupBIndex >= 0 && inputBIndex > groupBIndex && inputBIndex < groupBEndIndex,
    };
  });

  const absoluteInsideFrame = await (async () => {
    const setup = await page.evaluate(async () => {
      const html = [
        '<div class="abs-frame" style="width:360px; min-height:160px; padding:16px; border:1px solid #999">',
        '  <input type="text" name="attr_frame_input" value="free" style="width:120px">',
        '</div>',
      ].join('\n');
      await window.__perfHook.importSheet({ html, css: '', i18n: '{}' });
      window.__perfHook.setMainMode('edit');
      await new Promise((resolve) => setTimeout(resolve, 500));
      const host = document.querySelector('[data-testid="edit-canvas-shadow-host"]');
      const root = host?.shadowRoot;
      const frame = root?.querySelector('.sheet-abs-frame');
      const input = root?.querySelector('input[name="attr_frame_input"]');
      const frameRect = frame?.getBoundingClientRect();
      const inputRect = input?.getBoundingClientRect();
      return {
        frameId: frame?.getAttribute('data-r20-block-id') ?? null,
        inputId: input?.getAttribute('data-r20-block-id') ?? null,
        inputCenter: inputRect
          ? {
              x: Math.round(inputRect.left + inputRect.width / 2),
              y: Math.round(inputRect.top + inputRect.height / 2),
            }
          : null,
        frameRect: frameRect
          ? {
              left: Math.round(frameRect.left),
              top: Math.round(frameRect.top),
              width: Math.round(frameRect.width),
              height: Math.round(frameRect.height),
            }
          : null,
        inputRect: inputRect
          ? {
              left: Math.round(inputRect.left),
              top: Math.round(inputRect.top),
              width: Math.round(inputRect.width),
              height: Math.round(inputRect.height),
            }
          : null,
      };
    });
    if (!setup.inputCenter || !setup.inputId || !setup.frameId) {
      return { moved: false, reason: 'missing frame/input setup', setup };
    }
    const delta = { x: 80, y: 32 };
    await page.mouse.move(setup.inputCenter.x, setup.inputCenter.y);
    await page.mouse.down();
    await page.mouse.move(setup.inputCenter.x + 20, setup.inputCenter.y + 8, { steps: 2 });
    await page.mouse.move(setup.inputCenter.x + delta.x, setup.inputCenter.y + delta.y, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(500);
    return await page.evaluate(({ setup, delta }) => {
      const host = document.querySelector('[data-testid="edit-canvas-shadow-host"]');
      const root = host?.shadowRoot;
      const frame = root?.querySelector(`[data-r20-block-id="${CSS.escape(setup.frameId)}"]`);
      const input = root?.querySelector(`[data-r20-block-id="${CSS.escape(setup.inputId)}"]`);
      const frameStyle = frame ? getComputedStyle(frame) : null;
      const inputStyle = input ? getComputedStyle(input) : null;
      const emitted = window.__perfHook.getEmitContent();
      function openingTag(blockId) {
        const marker = `data-r20-block-id="${blockId}"`;
        const markerIndex = emitted.html.indexOf(marker);
        if (markerIndex < 0) return '';
        const start = emitted.html.lastIndexOf('<', markerIndex);
        const end = emitted.html.indexOf('>', markerIndex);
        return start >= 0 && end > start ? emitted.html.slice(start, end + 1) : '';
      }
      function cssRuleForTag(tag) {
        const classAttr = tag.match(/\sclass=(["'])([\s\S]*?)\1/i)?.[2] ?? '';
        const classNames = classAttr
          .split(/\s+/)
          .filter((name) => name.includes('r20-node'))
          .flatMap((name) => (name.startsWith('sheet-') ? [name, name.slice('sheet-'.length)] : [name]));
        for (const className of classNames) {
          const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const match = emitted.css.match(new RegExp(`[^{}]*\\.${escaped}[^{}]*\\{([^}]*)\\}`, 'm'));
          if (match) return match[1];
        }
        return '';
      }
      function px(text, prop) {
        const match = text.match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*(-?\\d+(?:\\.\\d+)?)px`, 'i'));
        return match ? Math.round(Number.parseFloat(match[1])) : null;
      }
      const frameTag = openingTag(setup.frameId);
      const inputTag = openingTag(setup.inputId);
      const frameRule = cssRuleForTag(frameTag);
      const inputRule = cssRuleForTag(inputTag);
      const frameInline = frameTag.match(/\sstyle=(["'])([\s\S]*?)\1/i)?.[2] ?? '';
      const inputInline = inputTag.match(/\sstyle=(["'])([\s\S]*?)\1/i)?.[2] ?? '';
      return {
        moved: true,
        setup,
        delta,
        frameTag,
        inputTag,
        frameRule,
        inputRule,
        frameComputedPosition: frameStyle?.position ?? null,
        inputComputedPosition: inputStyle?.position ?? null,
        inputComputedLeft: inputStyle ? Math.round(Number.parseFloat(inputStyle.left)) : null,
        inputComputedTop: inputStyle ? Math.round(Number.parseFloat(inputStyle.top)) : null,
        frameHasRelative: /position\s*:\s*relative/i.test(`${frameInline};${frameRule}`),
        inputHasAbsolute: /position\s*:\s*absolute/i.test(`${inputInline};${inputRule}`),
        emittedLeft: px(inputInline, 'left') ?? px(inputRule, 'left'),
        emittedTop: px(inputInline, 'top') ?? px(inputRule, 'top'),
      };
    }, { setup, delta });
  })();

  const freePlacementWidgetDrop = await (async () => {
    const setup = await page.evaluate(async () => {
      const html = '<div class="free-target" style="width:360px; min-height:180px; padding:16px; border:1px solid #999"></div>';
      await window.__perfHook.importSheet({ html, css: '', i18n: '{}' });
      window.__perfHook.setMainMode('edit');
      await new Promise((resolve) => setTimeout(resolve, 500));
      const host = document.querySelector('[data-testid="edit-canvas-shadow-host"]');
      const frame = host?.shadowRoot?.querySelector('.sheet-free-target');
      const rect = frame?.getBoundingClientRect();
      return {
        frameId: frame?.getAttribute('data-r20-block-id') ?? null,
        dropPoint: rect
          ? {
              x: Math.round(rect.left + rect.width * 0.58),
              y: Math.round(rect.top + rect.height * 0.42),
            }
          : null,
      };
    });
    if (!setup.frameId || !setup.dropPoint) {
      return { dropped: false, reason: 'missing free target setup', setup };
    }
    await page.click('[data-testid="edit-placement-free"]');
    const indicator = await page.evaluate(
      ({ x, y }) => window.__smokeDragOver('text-input', x, y),
      setup.dropPoint,
    );
    const drop = await page.evaluate(
      ({ x, y }) => window.__smokeDrop('text-input', x, y),
      setup.dropPoint,
    );
    await page.waitForTimeout(500);
    return await page.evaluate(({ setup, drop, indicator }) => {
      const host = document.querySelector('[data-testid="edit-canvas-shadow-host"]');
      const root = host?.shadowRoot;
      const frame = root?.querySelector(`[data-r20-block-id="${CSS.escape(setup.frameId)}"]`);
      const input = frame?.querySelector('input[name="attr_name"][data-r20-block-id]');
      const frameStyle = frame ? getComputedStyle(frame) : null;
      const inputStyle = input ? getComputedStyle(input) : null;
      const emitted = window.__perfHook.getEmitContent();
      const inputId = input?.getAttribute('data-r20-block-id') ?? null;
      function openingTag(blockId) {
        const marker = `data-r20-block-id="${blockId}"`;
        const markerIndex = emitted.html.indexOf(marker);
        if (markerIndex < 0) return '';
        const start = emitted.html.lastIndexOf('<', markerIndex);
        const end = emitted.html.indexOf('>', markerIndex);
        return start >= 0 && end > start ? emitted.html.slice(start, end + 1) : '';
      }
      function styleOf(tag) {
        return tag.match(/\sstyle=(["'])([\s\S]*?)\1/i)?.[2] ?? '';
      }
      function px(text, prop) {
        const match = text.match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*(-?\\d+(?:\\.\\d+)?)px`, 'i'));
        return match ? Math.round(Number.parseFloat(match[1])) : null;
      }
      const frameTag = openingTag(setup.frameId);
      const inputTag = inputId ? openingTag(inputId) : '';
      const frameInline = styleOf(frameTag);
      const inputInline = styleOf(inputTag);
      const frameIndex = emitted.html.indexOf(`data-r20-block-id="${setup.frameId}"`);
      const inputIndex = inputId ? emitted.html.indexOf(`data-r20-block-id="${inputId}"`) : -1;
      const frameEndIndex = emitted.html.indexOf('</div>', frameIndex);
      return {
        dropped: true,
        setup,
        indicator,
        drop,
        inputId,
        frameTag,
        inputTag,
        frameComputedPosition: frameStyle?.position ?? null,
        inputComputedPosition: inputStyle?.position ?? null,
        inputComputedLeft: inputStyle ? Math.round(Number.parseFloat(inputStyle.left)) : null,
        inputComputedTop: inputStyle ? Math.round(Number.parseFloat(inputStyle.top)) : null,
        frameHasRelative: /position\s*:\s*relative/i.test(frameInline),
        inputHasAbsolute: /position\s*:\s*absolute/i.test(inputInline),
        emittedLeft: px(inputInline, 'left'),
        emittedTop: px(inputInline, 'top'),
        inputNestedInFrame: frameIndex >= 0 && inputIndex > frameIndex && inputIndex < frameEndIndex,
      };
    }, { setup, drop, indicator });
  })();

  results.tests.realDrag = {
    c1,
    sectionInfo,
    sectionDragPerf,
    sectionMoveTimeline,
    movedSectionInfo,
    c2Indicator,
    c2,
    c3,
    state: dragDropState,
    nestedReorder,
    canvasSiblingInsert,
    layerDropModes,
    layerSearchContext,
    layerSelectionSync,
    layerSelectionPath,
    canvasSelectionSync,
    layerAutoScroll,
    nonLeafLayerReorder,
    absoluteInsideFrame,
    freePlacementWidgetDrop,
    canvasWidthControl,
  };
  results.consoleErrors = consoleErrors;
  results.pageErrors = pageErrors;

  const pass =
    results.tests.hookFlow.nested === true &&
    results.tests.editUiCopy.hasExpectedLabels === true &&
    results.tests.editUiCopy.hasMojibakeHan === false &&
    results.tests.hookFlow.htmlHasAbsoluteWidget === false &&
    results.tests.hookAbsolute.nested === false &&
    results.tests.hookAbsolute.htmlHasAbsoluteWidget === true &&
    c1.dispatched === true &&
    canvasWidthControl.before.inputValue === '850' &&
    canvasWidthControl.before.hostWidth === 850 &&
    canvasWidthControl.afterSheet.inputValue === '930' &&
    canvasWidthControl.afterSheet.hostWidth === 930 &&
    canvasWidthControl.afterSheet.aria === '시트 캔버스 폭' &&
    canvasWidthControl.rolltemplate.inputValue === '280' &&
    canvasWidthControl.rolltemplate.hostWidth === 280 &&
    canvasWidthControl.rolltemplate.aria === '굴림 결과 캔버스 폭' &&
    canvasWidthControl.afterReturn.inputValue === '930' &&
    canvasWidthControl.afterReturn.hostWidth === 930 &&
    /position\s*:\s*absolute/i.test(sectionInfo.style ?? '') &&
    sectionInfo.canDrop === '1' &&
    sectionInfo.layerRole === 'frame' &&
    sectionInfo.selectedClassWasPresent === true &&
    sectionInfo.selectedOutline === 'solid' &&
    sectionInfo.persistentAffordanceOutline === 'dashed' &&
    sectionInfo.persistentAffordanceOutlineWidth !== '0px' &&
    sectionInfo.persistentAffordanceBoxShadow !== 'none' &&
    movedSectionInfo.computedPosition === 'absolute' &&
    typeof movedSectionInfo.computedLeft === 'number' &&
    typeof movedSectionInfo.computedTop === 'number' &&
    movedSectionInfo.computedLeft > sectionInfo.left + 24 &&
    movedSectionInfo.computedTop > sectionInfo.top + 16 &&
    movedSectionInfo.emittedLeft === movedSectionInfo.computedLeft &&
    movedSectionInfo.emittedTop === movedSectionInfo.computedTop &&
    movedSectionInfo.emittedHasAbsolute === true &&
    sectionDragPerf?.frameCount >= 2 &&
    sectionDragPerf?.movingFrameCount >= 1 &&
    typeof sectionDragPerf?.maxFrameGapMs === 'number' &&
    sectionMoveTimeline.numericSampleCount === 4 &&
    Math.abs(sectionMoveTimeline.firstLeft - movedSectionInfo.computedLeft) <= 2 &&
    Math.abs(sectionMoveTimeline.firstTop - movedSectionInfo.computedTop) <= 2 &&
    Math.abs(sectionMoveTimeline.finalLeft - movedSectionInfo.emittedLeft) <= 2 &&
    Math.abs(sectionMoveTimeline.finalTop - movedSectionInfo.emittedTop) <= 2 &&
    sectionMoveTimeline.leftDrift <= 2 &&
    sectionMoveTimeline.topDrift <= 2 &&
    typeof sectionMoveTimeline.timing?.dropCommitLatencyMs === 'number' &&
    typeof sectionMoveTimeline.timing?.firstRafDelayMs === 'number' &&
    c2Indicator.dispatched === true &&
    c2Indicator.hostDragging === '1' &&
    c2Indicator.hostDropMode === 'inside' &&
    c2Indicator.activeTargetId === sectionInfo.blockId &&
    c2Indicator.activeTargetMode === 'inside' &&
    c2Indicator.dropLabelMode === 'inside' &&
    c2Indicator.dropLabelText === '안에 넣기' &&
    c2Indicator.dropLabelPosition === 'fixed' &&
    dragDropState.nestedInputFound === true &&
    dragDropState.nestedInputAbsolute === false &&
    dragDropState.rootHtmlBlocks === 1 &&
    c3.dispatched === true &&
    nestedReorder.mode === 'before' &&
    nestedReorder.emittedBefore?.length >= 2 &&
    nestedReorder.emittedAfter?.[0] === nestedReorder.movingId &&
    nestedReorder.emittedAfter?.[0] !== nestedReorder.emittedBefore?.[0] &&
    canvasSiblingInsert.beforeIndicator?.hostDropMode === 'before' &&
    canvasSiblingInsert.beforeIndicator?.activeTargetMode === 'before' &&
    canvasSiblingInsert.beforeIndicator?.dropMarkerMode === 'before' &&
    canvasSiblingInsert.beforeIndicator?.dropLabelMode === 'before' &&
    canvasSiblingInsert.beforeIndicator?.dropLabelText === '앞에 넣기' &&
    canvasSiblingInsert.beforeIndicator?.dropLabelPosition === 'fixed' &&
    canvasSiblingInsert.beforeIndicator?.dropMarkerPosition === 'fixed' &&
    canvasSiblingInsert.beforeIndicator?.dropMarkerWidth >= 24 &&
    canvasSiblingInsert.beforeIndicator?.dropMarkerHeight === 3 &&
    canvasSiblingInsert.afterIndicator?.hostDropMode === 'after' &&
    canvasSiblingInsert.afterIndicator?.activeTargetMode === 'after' &&
    canvasSiblingInsert.afterIndicator?.dropMarkerMode === 'after' &&
    canvasSiblingInsert.afterIndicator?.dropLabelMode === 'after' &&
    canvasSiblingInsert.afterIndicator?.dropLabelText === '뒤에 넣기' &&
    canvasSiblingInsert.afterIndicator?.dropLabelPosition === 'fixed' &&
    canvasSiblingInsert.afterIndicator?.dropMarkerPosition === 'fixed' &&
    canvasSiblingInsert.afterIndicator?.dropMarkerWidth >= 24 &&
    canvasSiblingInsert.afterIndicator?.dropMarkerHeight === 3 &&
    canvasSiblingInsert.beforeDrop?.dispatched === true &&
    typeof canvasSiblingInsert.beforeNewId === 'string' &&
    canvasSiblingInsert.beforeNewIndexAfterEmit >= 0 &&
    canvasSiblingInsert.beforeNewIndexAfterEmit < canvasSiblingInsert.targetIndexAfterBeforeDrop &&
    canvasSiblingInsert.afterDrop?.dispatched === true &&
    typeof canvasSiblingInsert.afterNewId === 'string' &&
    canvasSiblingInsert.afterNewIndexAfterEmit > canvasSiblingInsert.targetIndexAfterAfterDrop &&
    Array.isArray(layerDropModes.modes) &&
    layerDropModes.modes.join(',') === 'before,inside,after' &&
    layerDropModes.attrs?.roleKind === 'frame' &&
    layerDropModes.attrs?.canDrop === '1' &&
    layerDropModes.attrs?.defaultDropMode === 'flow' &&
    layerDropModes.attrs?.roleRail === true &&
    layerDropModes.attrs?.miniMap === true &&
    layerDropModes.attrs?.miniMapRole === 'frame' &&
    layerDropModes.attrs?.miniMapCanDrop === '1' &&
    layerDropModes.attrs?.miniMapDropMode === 'flow' &&
    Number(layerDropModes.attrs?.miniMapChildCount) >= 1 &&
    Number(layerDropModes.attrs?.childCount) >= 1 &&
    Boolean(layerDropModes.attrs?.childBadge) &&
    layerDropModes.attrs?.text?.includes('담기 가능') &&
    layerDropModes.attrs?.text?.includes('흐름') &&
    layerSearchContext.checked === true &&
    layerSearchContext.rowCount >= 2 &&
    layerSearchContext.section?.searchMatch === '0' &&
    layerSearchContext.section?.contextOnly === '1' &&
    layerSearchContext.section?.hasContextBadge === true &&
    layerSearchContext.input?.searchMatch === '1' &&
    layerSearchContext.input?.contextOnly === '0' &&
    layerSearchContext.input?.hasDepthGuide === true &&
    layerSelectionSync.selected === true &&
    layerSelectionPath.visible === true &&
    layerSelectionPath.depth >= 2 &&
    layerSelectionPath.hasSection === true &&
    layerSelectionPath.endsWithInput === true &&
    layerSelectionPath.currentIsInput === true &&
    canvasSelectionSync.selected === true &&
    layerAutoScroll.selected === true &&
    layerAutoScroll.rowRendered === true &&
    layerAutoScroll.rowVisible === true &&
    layerAutoScroll.afterScrollTop > layerAutoScroll.beforeScrollTop &&
    nonLeafLayerReorder.mode === 'after' &&
    nonLeafLayerReorder.layerSameParent === true &&
    nonLeafLayerReorder.layerSameDepth === true &&
    nonLeafLayerReorder.layerB?.layerRelation === 'sibling' &&
    nonLeafLayerReorder.layerB?.layerPreviousId === nonLeafLayerReorder.groupAId &&
    nonLeafLayerReorder.targetLayerBefore?.relation === 'sibling' &&
    nonLeafLayerReorder.targetLayerBefore?.text?.includes('흐름 형제') &&
    nonLeafLayerReorder.movingBefore?.childCount >= 1 &&
    nonLeafLayerReorder.movingBefore?.hasNextTarget === true &&
    nonLeafLayerReorder.groupAAfterGroupB === true &&
    nonLeafLayerReorder.inputAStayedInsideGroupA === true &&
    nonLeafLayerReorder.inputBStayedInsideGroupB === true &&
    absoluteInsideFrame.moved === true &&
    absoluteInsideFrame.frameComputedPosition === 'relative' &&
    absoluteInsideFrame.inputComputedPosition === 'absolute' &&
    absoluteInsideFrame.frameHasRelative === true &&
    absoluteInsideFrame.inputHasAbsolute === true &&
    absoluteInsideFrame.emittedLeft === absoluteInsideFrame.inputComputedLeft &&
    absoluteInsideFrame.emittedTop === absoluteInsideFrame.inputComputedTop &&
    freePlacementWidgetDrop.indicator?.hostDropMode === 'inside' &&
    freePlacementWidgetDrop.indicator?.activeTargetMode === 'inside' &&
    freePlacementWidgetDrop.indicator?.dropLabelMode === 'inside' &&
    freePlacementWidgetDrop.indicator?.dropLabelText === '자유 배치' &&
    freePlacementWidgetDrop.indicator?.dropLabelPosition === 'fixed' &&
    freePlacementWidgetDrop.drop?.dispatched === true &&
    freePlacementWidgetDrop.inputNestedInFrame === true &&
    freePlacementWidgetDrop.frameComputedPosition === 'relative' &&
    freePlacementWidgetDrop.inputComputedPosition === 'absolute' &&
    freePlacementWidgetDrop.frameHasRelative === true &&
    freePlacementWidgetDrop.inputHasAbsolute === true &&
    freePlacementWidgetDrop.emittedLeft === freePlacementWidgetDrop.inputComputedLeft &&
    freePlacementWidgetDrop.emittedTop === freePlacementWidgetDrop.inputComputedTop &&
    pageErrors.length === 0;

  results.pass = pass;
  results.finishedAt = new Date().toISOString();

  await fs.writeFile(
    path.join(REPORT_DIR, 'edit-flow-smoke-results.json'),
    JSON.stringify(results, null, 2),
  );

  await browser.close();
  server.close();

  console.log(JSON.stringify(results, null, 2));
  console.log(pass ? 'SMOKE PASS' : 'SMOKE FAIL');
  process.exitCode = pass ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
