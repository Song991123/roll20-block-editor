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

  const sectionInfo = await page.evaluate(() => {
    const host = document.querySelector('[data-testid="edit-canvas-shadow-host"]');
    const el = host.shadowRoot.querySelector('div[data-r20-block-id]');
    const rect = el.getBoundingClientRect();
    const style = el.getAttribute('style') ?? '';
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
      cx: Math.round(rect.x + rect.width / 2),
      cy: Math.round(rect.y + rect.height / 2),
    };
  });

  // C1b: drag the existing section itself. This catches the rollback-feeling
  // path: pointer drag should keep the visual position and update emitted HTML
  // immediately, while the Blockly/CSS model commit follows behind.
  const dragDelta = { x: 96, y: 40 };
  await page.mouse.move(sectionInfo.cx, sectionInfo.cy);
  await page.mouse.down();
  await page.mouse.move(sectionInfo.cx + 20, sectionInfo.cy + 10, { steps: 2 });
  await page.mouse.move(sectionInfo.cx + dragDelta.x, sectionInfo.cy + dragDelta.y, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(250);

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
      nestedInputStyle: nestedInput?.getAttribute('style') ?? null,
      nestedInputAbsolute: /position\s*:\s*absolute/i.test(nestedInput?.getAttribute('style') ?? ''),
      statusText: statusEl?.textContent ?? null,
      htmlBlocks: ws.blockCount.html,
      rootHtmlBlocks: ws.rootBlocks.html,
      emittedHtmlSnippetHasNesting:
        /<div[^>]*data-r20-block-id[^>]*>[\s\S]*<input[^>]*data-r20-block-id/i.test(emit.html),
    };
  });

  results.tests.realDrag = { c1, sectionInfo, movedSectionInfo, c2, state: dragDropState };
  results.consoleErrors = consoleErrors;
  results.pageErrors = pageErrors;

  const pass =
    results.tests.hookFlow.nested === true &&
    results.tests.hookFlow.htmlHasAbsoluteWidget === false &&
    results.tests.hookAbsolute.nested === false &&
    results.tests.hookAbsolute.htmlHasAbsoluteWidget === true &&
    c1.dispatched === true &&
    /position\s*:\s*absolute/i.test(sectionInfo.style ?? '') &&
    movedSectionInfo.computedPosition === 'absolute' &&
    typeof movedSectionInfo.computedLeft === 'number' &&
    typeof movedSectionInfo.computedTop === 'number' &&
    movedSectionInfo.computedLeft > sectionInfo.left + 24 &&
    movedSectionInfo.computedTop > sectionInfo.top + 16 &&
    movedSectionInfo.emittedLeft === movedSectionInfo.computedLeft &&
    movedSectionInfo.emittedTop === movedSectionInfo.computedTop &&
    movedSectionInfo.emittedHasAbsolute === true &&
    dragDropState.nestedInputFound === true &&
    dragDropState.nestedInputAbsolute === false &&
    dragDropState.rootHtmlBlocks === 1 &&
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
