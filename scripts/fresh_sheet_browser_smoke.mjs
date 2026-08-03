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

const args = process.argv.slice(2).filter((arg) => arg !== '--');
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

function readDrawer(page, selector) {
  return page.evaluate((drawerSelector) => {
    const node = document.querySelector(drawerSelector);
    if (!(node instanceof HTMLElement)) return { scrim: false, insideViewport: false };
    const rect = node.getBoundingClientRect();
    return {
      rect: {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      },
      scrim: Boolean(document.querySelector('.r20-mobile-scrim')),
      insideViewport: rect.left >= 0
        && rect.top >= 0
        && rect.right <= window.innerWidth
        && rect.bottom <= window.innerHeight,
    };
  }, selector);
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

    await page.waitForSelector('[data-testid="empty-import-button"]', { state: 'visible', timeout: 15000 });
    await page.click('[data-testid="empty-import-button"]');
    await page.waitForSelector('[data-testid="import-dialog"]', { state: 'visible', timeout: 15000 });
    await page.keyboard.press('Escape');

    await page.click('[data-testid="main-mode-edit"]');
    await page.waitForSelector('[data-testid="widget-card-text-input"]', { state: 'visible', timeout: 15000 });
    await page.waitForTimeout(1300);
    const emptyDropSurface = page.locator('[data-testid="preview-drop-surface"]');
    const emptyDropSurfaceBox = await emptyDropSurface.boundingBox();
    assert(emptyDropSurfaceBox, 'empty sheet drop surface is missing');
    const emptyDropPoint = {
      x: Math.min(420, Math.max(24, emptyDropSurfaceBox.width - 24)),
      y: Math.min(220, Math.max(24, emptyDropSurfaceBox.height - 24)),
    };
    const emptyDropClientPoint = {
      x: emptyDropSurfaceBox.x + emptyDropPoint.x,
      y: emptyDropSurfaceBox.y + emptyDropPoint.y,
    };
    await page.locator('[data-testid="widget-card-text-input"]').dragTo(emptyDropSurface, {
      targetPosition: emptyDropPoint,
    });
    await page.waitForFunction(
      () => window.__perfHook.getWorkspace().blockCount.html === 1,
      null,
      { timeout: 15000 },
    );
    await page.waitForSelector('[data-testid="preview-iframe"]', { state: 'visible', timeout: 20000 });
    await page.waitForFunction(
      () => Number(document.querySelector('[data-r20-apply-acked]')?.getAttribute('data-r20-apply-acked') ?? 0) > 0,
      null,
      { timeout: 20000 },
    );
    const emptyDropFrame = page.frames().find((candidate) => candidate !== page.mainFrame());
    assert(emptyDropFrame, 'empty sheet drop did not mount the shared iframe');
    const emptyDropInput = emptyDropFrame.locator('input.sheet-text-input');
    await emptyDropInput.waitFor({ state: 'visible', timeout: 15000 });
    const emptyDropInputBox = await emptyDropInput.boundingBox();
    const emptyDropSource = await page.evaluate(() => window.__perfHook.getEmitContent());
    assert(emptyDropInputBox, 'empty sheet drop input has no rendered box');
    assert(
      /width\s*:\s*180px/i.test(emptyDropSource.css),
      'empty sheet drag lost the friendly widget width preset',
    );
    assert(
      Math.abs(emptyDropInputBox.x - emptyDropClientPoint.x) <= 16
        && Math.abs(emptyDropInputBox.y - emptyDropClientPoint.y) <= 16,
      `empty sheet drag used screen coordinates instead of the visible 850px canvas: ${JSON.stringify({ emptyDropClientPoint, emptyDropInputBox })}`,
    );
    await page.screenshot({ path: path.join(REPORT_DIR, 'empty-canvas-widget-drop.png') });

    await page.evaluate(() => window.__perfHook.clearAll());
    await page.waitForFunction(() => window.__perfHook.getWorkspace().blockCount.html === 0);
    await page.waitForTimeout(1300);

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

    const mobileShell = [];
    for (const viewport of [
      { name: 'phone', width: 390, height: 844 },
      { name: 'tablet', width: 768, height: 900 },
    ]) {
      const mobileContext = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
      });
      const mobilePage = await mobileContext.newPage();
      const mobileConsoleErrors = [];
      const mobilePageErrors = [];
      mobilePage.on('console', (message) => {
        if (message.type() === 'error') mobileConsoleErrors.push(message.text());
      });
      mobilePage.on('pageerror', (error) => mobilePageErrors.push(String(error)));
      await mobilePage.goto(url, { waitUntil: 'load' });
      await mobilePage.waitForSelector('[data-testid="main-area-toolbar"]', { timeout: 30000 });
      await mobilePage.waitForFunction(() => (
        document.querySelector('[data-testid="sidebar-left"]')?.getAttribute('data-open') === 'false'
        && document.querySelector('[data-testid="sidebar-right"]')?.getAttribute('data-open') === 'false'
        && document.querySelector('[data-testid="main-split-container"]')?.getAttribute('data-main-mode') === 'edit'
      ));
      await mobilePage.waitForTimeout(240);

      const initial = await mobilePage.evaluate(() => {
        const box = (selector) => {
          const node = document.querySelector(selector);
          if (!(node instanceof HTMLElement)) return null;
          const rect = node.getBoundingClientRect();
          return {
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height,
          };
        };
        const header = document.querySelector('header');
        const toolbar = document.querySelector('[data-testid="main-area-toolbar"]');
        return {
          rootClientWidth: document.documentElement.clientWidth,
          rootScrollWidth: document.documentElement.scrollWidth,
          header: box('header'),
          editor: box('main.editor-main > section'),
          toolbar: box('[data-testid="main-area-toolbar"]'),
          preview: box('[data-testid="preview-pane"]'),
          mediaMobile: window.matchMedia('(max-width: 920px)').matches,
          previewInlineLeft: document.querySelector('[data-testid="preview-pane"]')?.style.left ?? null,
          editGridColumns: document.querySelector('[data-testid="edit-canvas-iframe-slot"]')?.parentElement?.style.gridTemplateColumns ?? null,
          layerToggleCount: document.querySelectorAll('[data-testid="edit-layer-panel-toggle"]').length,
          layerPanelCount: document.querySelectorAll('[data-testid="edit-layer-panel"]').length,
          splitModeVisible: Boolean(
            document.querySelector('[data-testid="main-mode-split"]')?.getClientRects().length,
          ),
          mainMode: document.querySelector('[data-testid="main-split-container"]')?.getAttribute('data-main-mode') ?? null,
          headerOverflow: header ? header.scrollWidth - header.clientWidth : Number.NaN,
          toolbarOverflow: toolbar ? toolbar.scrollWidth - toolbar.clientWidth : Number.NaN,
        };
      });
      assert(initial.rootScrollWidth <= initial.rootClientWidth, `${viewport.name} shell overflows horizontally`);
      assert(initial.headerOverflow <= 1, `${viewport.name} header overflows by ${initial.headerOverflow}px`);
      assert(
        initial.editor?.width >= viewport.width - 24,
        `${viewport.name} editor collapsed: ${JSON.stringify(initial.editor)}`,
      );
      assert(
        initial.toolbar?.width >= viewport.width - 24 && initial.toolbarOverflow <= 1,
        `${viewport.name} toolbar is clipped: ${JSON.stringify(initial.toolbar)}`,
      );
      assert(
        initial.preview?.width >= initial.editor.width - 4 && initial.preview?.height > 0,
        `${viewport.name} preview surface is cramped: ${JSON.stringify(initial)}`,
      );
      await mobilePage.screenshot({ path: path.join(REPORT_DIR, `${viewport.name}-shell.png`) });

      assert(
        await mobilePage.locator('[data-testid="edit-layer-panel"]').count() === 0,
        `${viewport.name} layer panel consumes canvas before opening`,
      );
      assert(!initial.splitModeVisible, `${viewport.name} exposes an unusable split mode`);
      await mobilePage.click('[data-testid="edit-layer-panel-toggle"]');
      await mobilePage.waitForSelector('[data-testid="edit-layer-panel"]');
      const layerOverlay = await mobilePage.evaluate(() => {
        const panel = document.querySelector('[data-testid="edit-layer-panel"]');
        const editor = document.querySelector('main.editor-main > section');
        if (!(panel instanceof HTMLElement) || !(editor instanceof HTMLElement)) return null;
        const panelRect = panel.getBoundingClientRect();
        const editorRect = editor.getBoundingClientRect();
        return {
          panel: {
            left: panelRect.left,
            top: panelRect.top,
            right: panelRect.right,
            bottom: panelRect.bottom,
            width: panelRect.width,
            height: panelRect.height,
          },
          hasScrim: Boolean(document.querySelector('[data-testid="edit-layer-panel-scrim"]')),
          insideEditor: panelRect.left >= editorRect.left
            && panelRect.top >= editorRect.top
            && panelRect.right <= editorRect.right
            && panelRect.bottom <= editorRect.bottom,
        };
      });
      assert(layerOverlay?.hasScrim && layerOverlay.insideEditor, `${viewport.name} layer overlay escaped editor`);
      await mobilePage.screenshot({ path: path.join(REPORT_DIR, `${viewport.name}-layer-panel.png`) });
      await mobilePage.click('[data-testid="edit-layer-panel-scrim"]', {
        position: { x: initial.editor.width - 5, y: 10 },
      });
      await mobilePage.waitForSelector('[data-testid="edit-layer-panel"]', { state: 'detached' });

      await mobilePage.click('[data-testid="sidebar-left-toggle"]');
      await mobilePage.waitForFunction(() => (
        document.querySelector('[data-testid="sidebar-left"]')?.getAttribute('data-open') === 'true'
      ));
      await mobilePage.waitForTimeout(240);
      const leftDrawer = await readDrawer(mobilePage, '[data-testid="sidebar-left"]');
      assert(leftDrawer.scrim && leftDrawer.insideViewport, `${viewport.name} left drawer escaped viewport`);
      await mobilePage.screenshot({ path: path.join(REPORT_DIR, `${viewport.name}-left-drawer.png`) });
      await mobilePage.click('.r20-mobile-scrim', { position: { x: 1, y: 1 } });

      await mobilePage.click('[data-testid="sidebar-right-toggle"]');
      await mobilePage.waitForFunction(() => (
        document.querySelector('[data-testid="sidebar-right"]')?.getAttribute('data-open') === 'true'
      ));
      await mobilePage.waitForTimeout(240);
      const rightDrawer = await readDrawer(mobilePage, '[data-testid="sidebar-right"]');
      assert(rightDrawer.scrim && rightDrawer.insideViewport, `${viewport.name} right drawer escaped viewport`);
      await mobilePage.screenshot({ path: path.join(REPORT_DIR, `${viewport.name}-right-drawer.png`) });
      assert(
        mobileConsoleErrors.length === 0 && mobilePageErrors.length === 0,
        `${viewport.name} browser errors: ${JSON.stringify({ mobileConsoleErrors, mobilePageErrors })}`,
      );
      mobileShell.push({ viewport, initial, layerOverlay, leftDrawer, rightDrawer });
      await mobileContext.close();
    }

    const result = {
      status: consoleErrors.length === 0 && pageErrors.length === 0 ? 'PASS' : 'FAIL',
      url,
      blank,
      appended,
      firstWidget,
      edit,
      gallery: { before: galleryBefore, after: galleryAfter, iframePreserved: galleryIframePreserved },
      mobileShell,
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
