#!/usr/bin/env node
/**
 * Fresh-sheet browser smoke.
 *
 * Synthetic-only guard for the product reset contract: a new workspace starts
 * without a ghost sheet-section, the first widget is placed in sheet
 * coordinates (not screen coordinates), and preview/edit reuse one iframe.
 */

import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
function argOf(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

const OUT_DIR = path.resolve(argOf('--out-dir', './out'));
const BASE_PATH = argOf('--base-path', '/roll20-block-editor');
const REPORT_DIR = path.resolve(argOf('--report-dir', 'reports/fresh-sheet-smoke'));
const PORT = Number(argOf('--port', '4181'));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function startServer() {
  const server = http.createServer(async (request, response) => {
    try {
      let url = decodeURIComponent((request.url ?? '/').split('?')[0]);
      if (url.startsWith(BASE_PATH)) url = url.slice(BASE_PATH.length) || '/';
      if (url.endsWith('/')) url += 'index.html';
      const file = path.join(OUT_DIR, path.normalize(url).replace(/^([/\\])+/, ''));
      if (!file.startsWith(OUT_DIR)) {
        response.writeHead(403).end();
        return;
      }
      response.writeHead(200, {
        'content-type': MIME[path.extname(file)] ?? 'application/octet-stream',
      });
      response.end(await fs.readFile(file));
    } catch {
      response.writeHead(404).end('not found');
    }
  });
  return new Promise((resolve) => server.listen(PORT, '127.0.0.1', () => resolve(server)));
}

function assert(value, message) {
  if (!value) throw new Error(message);
}

async function main() {
  await fs.mkdir(REPORT_DIR, { recursive: true });
  const server = await startServer();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1480, height: 960 } });
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(String(error)));

  try {
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem('__perfOn', '1');
        window.localStorage.removeItem('r20be-autosave');
        window.localStorage.removeItem('r20-ui');
      } catch {}
    });
    const url = `http://127.0.0.1:${PORT}${BASE_PATH}/`;
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForFunction(() => Boolean(window.__perfHook), null, { timeout: 30000 });

    await page.evaluate(() => window.__perfHook.clearAll());
    await page.waitForFunction(() => {
      const snap = window.__perfHook.getWorkspace();
      return snap.blockCount.html === 0 && snap.blockCount.css === 0 && snap.blockCount.i18n === 0;
    }, null, { timeout: 15000 });

    const blank = await page.evaluate(() => {
      const content = window.__perfHook.getEmitContent();
      const layerIds = window.__perfHook.getLayerSnapshot('html').map((node) => node.id);
      return {
        workspace: window.__perfHook.getWorkspace(),
        layerIds,
        html: content.html,
        hasGhostSection: /class=["'][^"']*sheet-section[^"']*["']/i.test(content.html),
        iframeCount: document.querySelectorAll('[data-testid="preview-iframe"]').length,
      };
    });
    assert(blank.workspace.blockCount.html === 0, 'fresh sheet has HTML blocks');
    assert(blank.layerIds.length === 0, 'fresh sheet has layer entries');
    assert(!blank.hasGhostSection, 'fresh sheet emitted a ghost sheet-section');

    let appended = null;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      appended = await page.evaluate(() =>
        window.__perfHook.appendFriendlyWidgetForEditSmoke({ mode: 'flow' }),
      );
      if (appended?.containerId && appended?.widgetId) break;
      await page.waitForTimeout(250);
    }
    assert(appended.containerId && appended.widgetId, 'first widget append did not create IDs');
    await page.waitForSelector('[data-testid="preview-iframe"]', { state: 'visible', timeout: 20000 });
    await page.waitForFunction(
      () => Number(document.querySelector('[data-r20-apply-acked]')?.getAttribute('data-r20-apply-acked') ?? 0) > 0,
      null,
      { timeout: 20000 },
    );

    const firstWidget = await page.evaluate((ids) => {
      const iframe = document.querySelector('[data-testid="preview-iframe"]');
      const source = window.__perfHook.getEmitContent().html;
      const container = source.includes(`data-r20-block-id="${ids.containerId}"`);
      const widget = source.includes(`data-r20-block-id="${ids.widgetId}"`);
      const position = appendedPosition(ids.widgetStyle ?? '');
      return {
        container,
        widget,
        position,
        canvasWidth: Number.parseFloat(
          iframe?.getAttribute('style')?.match(/width:\s*([\d.]+)px/i)?.[1] ?? '0',
        ),
        renderedWidth: Math.round(iframe?.getBoundingClientRect().width ?? 0),
        layoutWidth: iframe?.offsetWidth ?? 0,
        iframeCount: document.querySelectorAll('[data-testid="preview-iframe"]').length,
      };

      function appendedPosition(style) {
        return {
          left: Number(style.match(/(?:^|;)\\s*left:\\s*(-?\\d+(?:\\.\\d+)?)px/i)?.[1] ?? NaN),
          top: Number(style.match(/(?:^|;)\\s*top:\\s*(-?\\d+(?:\\.\\d+)?)px/i)?.[1] ?? NaN),
        };
      }
    }, appended);
    assert(firstWidget.container && firstWidget.widget, 'first widget was not emitted');
    assert(firstWidget.canvasWidth === 850, `default canvas width drifted: ${firstWidget.canvasWidth}`);
    assert(firstWidget.iframeCount === 1, 'fresh sheet mounted more than one preview iframe');
    const hasExplicitWidgetPosition = Number.isFinite(firstWidget.position.left)
      && Number.isFinite(firstWidget.position.top);
    assert(
      !hasExplicitWidgetPosition || (firstWidget.position.left <= 80 && firstWidget.position.top <= 80),
      `first widget starts from screen-derived coordinates: ${JSON.stringify(firstWidget.position)}`,
    );

    const iframeElement = await page.locator('[data-testid="preview-iframe"]').elementHandle();
    const editIframeElement = iframeElement;
    await page.click('[data-testid="main-mode-edit"]');
    await page.waitForSelector('[data-testid="edit-canvas-root"]', { state: 'visible', timeout: 15000 });
    const edit = await page.evaluate((sameElement) => ({
      sameIframe: sameElement === document.querySelector('[data-testid="preview-iframe"]'),
      editOwner: document.querySelector('[data-testid="edit-canvas-root"]')?.getAttribute('data-edit-render-owner') ?? null,
      widthInput: document.querySelector('[data-testid="edit-canvas-width-input"]')?.value ?? null,
    }), editIframeElement);
    assert(edit.sameIframe && edit.editOwner === 'persistent-iframe', 'edit mode mounted a different render surface');
    assert(edit.widthInput === '850', `edit canvas width default drifted: ${edit.widthInput}`);

    const galleryBefore = await page.evaluate(() => ({
      workspace: window.__perfHook.getWorkspace(),
      layerIds: window.__perfHook.getLayerSnapshot('html').map((node) => node.id),
      applyAck: Number(document.querySelector('[data-r20-apply-acked]')?.getAttribute('data-r20-apply-acked') ?? 0),
    }));
    await page.waitForSelector('[data-testid="widget-card-text-input"]', { state: 'visible', timeout: 15000 });
    await page.locator('[data-testid="widget-card-text-input"]').click();
    await page.waitForFunction(
      (beforeCount) => window.__perfHook.getWorkspace().blockCount.html > beforeCount,
      galleryBefore.workspace.blockCount.html,
      { timeout: 15000 },
    );
    await page.waitForFunction(
      (beforeAck) => Number(document.querySelector('[data-r20-apply-acked]')?.getAttribute('data-r20-apply-acked') ?? 0) > beforeAck,
      galleryBefore.applyAck,
      { timeout: 20000 },
    );
    const galleryAfter = await page.evaluate((before) => {
      const layerIds = window.__perfHook.getLayerSnapshot('html').map((node) => node.id);
      const addedIds = layerIds.filter((id) => !before.layerIds.includes(id));
      const content = window.__perfHook.getEmitContent();
      return {
        workspace: window.__perfHook.getWorkspace(),
        addedIds,
        addedInHtml: addedIds.every((id) => content.html.includes(`data-r20-block-id="${id}"`)),
        iframeCount: document.querySelectorAll('[data-testid="preview-iframe"]').length,
        applyAck: Number(document.querySelector('[data-r20-apply-acked]')?.getAttribute('data-r20-apply-acked') ?? 0),
      };
    }, galleryBefore);
    const galleryIframePreserved = await page.evaluate(
      (sameElement) => sameElement === document.querySelector('[data-testid="preview-iframe"]'),
      editIframeElement,
    );
    assert(galleryAfter.addedIds.length === 1, `gallery click added ${galleryAfter.addedIds.length} layer entries`);
    assert(galleryAfter.addedInHtml, 'gallery-created widget was not emitted into HTML');
    assert(galleryIframePreserved && galleryAfter.iframeCount === 1, 'gallery click remounted the render surface');

    const result = {
      status: consoleErrors.length === 0 && pageErrors.length === 0 ? 'PASS' : 'FAIL',
      url,
      blank,
      appended,
      firstWidget,
      edit,
      gallery: { before: galleryBefore, after: galleryAfter, iframePreserved: galleryIframePreserved },
      consoleErrors,
      pageErrors,
      finishedAt: new Date().toISOString(),
    };
    await fs.writeFile(path.join(REPORT_DIR, 'fresh-sheet-smoke-results.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
    assert(result.status === 'PASS', `browser errors: ${JSON.stringify({ consoleErrors, pageErrors })}`);
    console.log('FRESH SHEET SMOKE PASS');
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
