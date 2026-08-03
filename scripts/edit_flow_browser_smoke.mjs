#!/usr/bin/env node
/**
 * Canonical iframe edit-flow browser smoke.
 *
 * The product has one persistent Roll20 iframe for preview and edit. This
 * smoke deliberately uses a synthetic sheet so no external sheet source or
 * derived evidence is retained. It verifies the user-facing interaction
 * contract: flow/free placement, canvas widget drop, layer insertion, cycle
 * protection, selection sync, unified undo/redo for movement, reparenting,
 * resize and coordinated styles, multi-selection alignment and distribution,
 * and editable canvas width.
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
const REPORT_DIR = path.resolve(argOf('--report-dir', 'reports/edit-flow-smoke'));
const PORT = Number(argOf('--port', '4173'));
const SYNTHETIC_BACKGROUND_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z4TQAAAAASUVORK5CYII=',
  'base64',
);
const SYNTHETIC_IMAGE_SVG = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 96"><rect width="80" height="96" fill="#f4b5ca"/><rect x="80" width="80" height="96" fill="#f7d58a"/><rect x="160" width="80" height="96" fill="#8fd7c0"/><circle cx="205" cy="68" r="18" fill="#4d3f47"/></svg>',
  'utf8',
);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

function startServer() {
  const server = http.createServer(async (request, response) => {
    try {
      let url = decodeURIComponent((request.url ?? '/').split('?')[0]);
      if (url.startsWith(BASE_PATH)) url = url.slice(BASE_PATH.length) || '/';
      if (url === '/synthetic-background.png') {
        response.writeHead(200, {
          'content-type': 'image/png',
          'cache-control': 'no-store',
        });
        response.end(SYNTHETIC_BACKGROUND_PNG);
        return;
      }
      if (url === '/synthetic-image.svg') {
        response.writeHead(200, {
          'content-type': 'image/svg+xml',
          'cache-control': 'no-store',
        });
        response.end(SYNTHETIC_IMAGE_SVG);
        return;
      }
      if (url.endsWith('/')) url += 'index.html';
      const file = path.join(OUT_DIR, path.normalize(url).replace(/^([/\\])+/, ''));
      if (!file.startsWith(OUT_DIR)) {
        response.writeHead(403).end();
        return;
      }
      const body = await fs.readFile(file);
      response.writeHead(200, {
        'content-type': MIME[path.extname(file)] ?? 'application/octet-stream',
      });
      response.end(body);
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
  const page = await browser.newPage({ viewport: { width: 1480, height: 960 }, hasTouch: true });
  await page.route('https://imgsrv.roll20.net/**', async (route) => {
    const requestUrl = route.request().url();
    if (requestUrl.includes('synthetic-background.png')) {
      await route.fulfill({
        status: 200,
        contentType: 'image/png',
        body: SYNTHETIC_BACKGROUND_PNG,
      });
      return;
    }
    if (requestUrl.includes('synthetic-image.svg')) {
      await route.fulfill({
        status: 200,
        contentType: 'image/svg+xml',
        body: SYNTHETIC_IMAGE_SVG,
      });
      return;
    }
    await route.continue();
  });
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

    const result = {
      url,
      startedAt: new Date().toISOString(),
      tests: {},
      consoleErrors,
      pageErrors,
    };

    result.tests.lightShell = await page.evaluate(() => {
      const root = document.documentElement;
      const shell = document.querySelector('.app-shell.pastel');
      const rootStyle = getComputedStyle(root);
      const shellStyle = shell ? getComputedStyle(shell) : null;
      return {
        rootHasDarkClass: root.classList.contains('dark'),
        shellPresent: Boolean(shell),
        rootAppBackground: rootStyle.getPropertyValue('--bg-app').trim(),
        shellAppBackground: shellStyle?.getPropertyValue('--bg-app').trim() ?? '',
        shellPrimary: shellStyle?.getPropertyValue('--primary').trim() ?? '',
      };
    });
    assert(!result.tests.lightShell.rootHasDarkClass, 'root dark class is still forced');
    assert(result.tests.lightShell.shellPresent, 'pastel app shell is missing');
    assert(result.tests.lightShell.rootAppBackground === '#fffafb', 'root light palette is not active');
    assert(result.tests.lightShell.shellPrimary === '#d45d84', 'pastel primary token is not active');

    async function waitForIframe() {
      const iframe = page.locator('[data-testid="preview-iframe"]').first();
      await iframe.waitFor({ state: 'visible', timeout: 20000 });
      const frame = page.frames().find((candidate) => candidate !== page.mainFrame());
      assert(frame, 'persistent preview iframe frame missing');
      await frame.waitForSelector('.charactersheet.charsheet', { state: 'attached', timeout: 20000 });
      await frame.waitForFunction(
        () => document.body?.getAttribute('data-r20-edit-mode') === '1',
        null,
        { timeout: 20000 },
      );
      return { iframe, frame };
    }

    async function appendSmoke(mode) {
      const deadline = Date.now() + 20000;
      let last = null;
      while (Date.now() < deadline) {
        last = await page.evaluate((placement) => {
          window.__perfHook.clearAll();
          return window.__perfHook.appendFriendlyWidgetForEditSmoke({ mode: placement });
        }, mode);
        if (last?.containerId && last?.widgetId) return last;
        await page.waitForTimeout(250);
      }
      throw new Error(`synthetic ${mode} widget append did not initialize: ${JSON.stringify(last)}`);
    }

    result.tests.hookFlow = await appendSmoke('flow');
    result.tests.hookAbsolute = await appendSmoke('absolute');

    await page.evaluate(() => window.__perfHook.clearAll());
    await page.click('[data-testid="main-mode-edit"]');
    const historyUndoButton = page.locator('[data-testid="edit-history-undo"]');
    const historyRedoButton = page.locator('[data-testid="edit-history-redo"]');

    result.tests.editSurface = await page.evaluate(() => {
      const root = document.querySelector('[data-testid="edit-canvas-root"]');
      return {
        persistentIframe: Boolean(document.querySelector('[data-testid="preview-iframe"]')),
        editOwner: root?.getAttribute('data-edit-render-owner') ?? null,
        shadowEditHost: Boolean(document.querySelector('[data-testid="edit-canvas-shadow-host"]')),
        layerPanel: Boolean(document.querySelector('[data-testid="edit-layer-panel"]')),
        placementMode: Boolean(document.querySelector('[data-testid="edit-placement-mode"]')),
        widthInput: Boolean(document.querySelector('[data-testid="edit-canvas-width-input"]')),
      };
    });
    assert(result.tests.editSurface.editOwner === 'persistent-iframe', 'edit owner is not persistent iframe');
    assert(!result.tests.editSurface.shadowEditHost, 'retired Shadow edit host is mounted');
    assert(result.tests.editSurface.layerPanel, 'layer panel is missing');

    const layerPanelResizer = page.locator('[data-testid="edit-layer-panel-resizer"]');
    await layerPanelResizer.waitFor({ state: 'visible' });
    const readLayerPanelGeometry = () => page.evaluate(() => {
      const panel = document.querySelector('[data-testid="edit-layer-panel"]');
      const resizer = document.querySelector('[data-testid="edit-layer-panel-resizer"]');
      const preview = document.querySelector('[data-testid="preview-pane"]');
      const slot = document.querySelector('[data-testid="edit-canvas-iframe-slot"]');
      if (![panel, resizer, preview, slot].every((node) => node instanceof HTMLElement)) {
        return { found: false };
      }
      const panelRect = panel.getBoundingClientRect();
      const resizerRect = resizer.getBoundingClientRect();
      const previewRect = preview.getBoundingClientRect();
      const slotRect = slot.getBoundingClientRect();
      let storedWidth = null;
      try {
        const persisted = JSON.parse(localStorage.getItem('r20-ui') ?? 'null');
        storedWidth = persisted?.state?.editLayerPanelWidth ?? null;
      } catch {}
      return {
        found: true,
        width: panelRect.width,
        panelRight: panelRect.right,
        resizerCenter: resizerRect.left + resizerRect.width / 2,
        previewLeft: previewRect.left,
        slotLeft: slotRect.left,
        ariaNow: Number(resizer.getAttribute('aria-valuenow')),
        storedWidth,
      };
    });
    const initialLayerPanel = await readLayerPanelGeometry();
    assert(initialLayerPanel.found, 'layer panel resize geometry is unavailable');
    assert(
      Math.abs(initialLayerPanel.panelRight - initialLayerPanel.previewLeft) <= 1
        && Math.abs(initialLayerPanel.panelRight - initialLayerPanel.slotLeft) <= 1
        && Math.abs(initialLayerPanel.panelRight - initialLayerPanel.resizerCenter) <= 1,
      `initial layer panel and iframe origins diverged: ${JSON.stringify(initialLayerPanel)}`,
    );
    const resizerBox = await layerPanelResizer.boundingBox();
    assert(resizerBox, 'layer panel resize handle has no box');
    await page.mouse.move(resizerBox.x + resizerBox.width / 2, resizerBox.y + resizerBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      resizerBox.x + resizerBox.width / 2 + 72,
      resizerBox.y + resizerBox.height / 2,
      { steps: 6 },
    );
    await page.mouse.up();
    await page.waitForFunction((previousWidth) => {
      const panel = document.querySelector('[data-testid="edit-layer-panel"]');
      return panel instanceof HTMLElement
        && panel.getBoundingClientRect().width >= Number(previousWidth) + 64;
    }, initialLayerPanel.width);
    const draggedLayerPanel = await readLayerPanelGeometry();
    assert(
      Math.abs(draggedLayerPanel.panelRight - draggedLayerPanel.previewLeft) <= 1
        && Math.abs(draggedLayerPanel.panelRight - draggedLayerPanel.slotLeft) <= 1
        && Math.abs(draggedLayerPanel.panelRight - draggedLayerPanel.resizerCenter) <= 1,
      `resized layer panel and iframe origins diverged: ${JSON.stringify(draggedLayerPanel)}`,
    );
    assert(
      Math.abs(draggedLayerPanel.width - draggedLayerPanel.ariaNow) <= 1
        && Math.abs(draggedLayerPanel.width - draggedLayerPanel.storedWidth) <= 1,
      `resized layer panel state was not persisted: ${JSON.stringify(draggedLayerPanel)}`,
    );
    await page.screenshot({
      path: path.join(REPORT_DIR, 'layer-panel-resized.png'),
      fullPage: false,
    });

    await layerPanelResizer.focus();
    await layerPanelResizer.press('ArrowLeft');
    await page.waitForFunction((previousWidth) => {
      const panel = document.querySelector('[data-testid="edit-layer-panel"]');
      return panel instanceof HTMLElement
        && panel.getBoundingClientRect().width <= Number(previousWidth) - 15;
    }, draggedLayerPanel.width);
    const keyboardLayerPanel = await readLayerPanelGeometry();
    assert(
      Math.abs(keyboardLayerPanel.panelRight - keyboardLayerPanel.previewLeft) <= 1,
      `keyboard-resized layer panel and iframe origins diverged: ${JSON.stringify(keyboardLayerPanel)}`,
    );
    await layerPanelResizer.dblclick();
    await page.waitForFunction(() => {
      const panel = document.querySelector('[data-testid="edit-layer-panel"]');
      return panel instanceof HTMLElement
        && Math.abs(panel.getBoundingClientRect().width - 248) <= 1;
    });
    const resetLayerPanel = await readLayerPanelGeometry();
    result.tests.layerPanelResize = {
      initial: initialLayerPanel,
      dragged: draggedLayerPanel,
      keyboard: keyboardLayerPanel,
      reset: resetLayerPanel,
    };

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForFunction(() => (
      document.querySelector('[data-testid="edit-canvas-root"]')
        ?.getAttribute('data-r20-layer-panel-overlay') === 'true'
    ));
    const readCompactLayerGeometry = () => page.evaluate(() => {
      const root = document.querySelector('[data-testid="edit-canvas-root"]');
      const preview = document.querySelector('[data-testid="preview-pane"]');
      const slot = document.querySelector('[data-testid="edit-canvas-iframe-slot"]');
      if (![root, preview, slot].every((node) => node instanceof HTMLElement)) {
        return { found: false };
      }
      const rootRect = root.getBoundingClientRect();
      const previewRect = preview.getBoundingClientRect();
      const slotRect = slot.getBoundingClientRect();
      return {
        found: true,
        rootLeft: rootRect.left,
        rootWidth: rootRect.width,
        previewLeft: previewRect.left,
        previewWidth: previewRect.width,
        slotLeft: slotRect.left,
        slotWidth: slotRect.width,
        panelVisible: Boolean(document.querySelector('[data-testid="edit-layer-panel"]')),
        resizerVisible: Boolean(document.querySelector('[data-testid="edit-layer-panel-resizer"]')),
        toggleVisible: Boolean(document.querySelector('[data-testid="edit-layer-panel-toggle"]')),
        scrimVisible: Boolean(document.querySelector('[data-testid="edit-layer-panel-scrim"]')),
      };
    });
    const compactLayerClosed = await readCompactLayerGeometry();
    assert(compactLayerClosed.found, 'compact layer geometry is unavailable');
    assert(
      Math.abs(compactLayerClosed.rootLeft - compactLayerClosed.previewLeft) <= 1
        && Math.abs(compactLayerClosed.rootLeft - compactLayerClosed.slotLeft) <= 1
        && Math.abs(compactLayerClosed.rootWidth - compactLayerClosed.previewWidth) <= 1
        && Math.abs(compactLayerClosed.rootWidth - compactLayerClosed.slotWidth) <= 1,
      `compact layer panel still consumed canvas width: ${JSON.stringify(compactLayerClosed)}`,
    );
    assert(compactLayerClosed.toggleVisible, 'compact layer toggle is missing');
    assert(!compactLayerClosed.panelVisible && !compactLayerClosed.resizerVisible, 'compact layer panel stayed docked');
    const compactLayerToggle = page.locator('[data-testid="edit-layer-panel-toggle"]');
    await compactLayerToggle.click();
    await page.waitForSelector('[data-testid="edit-layer-panel-scrim"]');
    const compactLayerOpen = await readCompactLayerGeometry();
    assert(compactLayerOpen.panelVisible && compactLayerOpen.scrimVisible, 'compact layer overlay did not open');
    assert(
      Math.abs(compactLayerOpen.previewLeft - compactLayerClosed.previewLeft) <= 1
        && Math.abs(compactLayerOpen.previewWidth - compactLayerClosed.previewWidth) <= 1,
      `opening compact layers moved the sheet canvas: ${JSON.stringify({ compactLayerClosed, compactLayerOpen })}`,
    );
    await page.locator('[data-testid="edit-layer-panel-scrim"]').click();
    await page.waitForSelector('[data-testid="edit-layer-panel-scrim"]', { state: 'detached' });
    result.tests.compactLayerPanelOverlay = {
      closed: compactLayerClosed,
      open: compactLayerOpen,
    };
    result.tests.compactMainToolbar = await page.evaluate(() => {
      const toolbar = document.querySelector('[data-testid="main-area-toolbar"]');
      if (!(toolbar instanceof HTMLElement)) return { found: false };
      const toolbarRect = toolbar.getBoundingClientRect();
      const controls = [
        'main-mode-preview',
        'main-mode-edit',
        'main-mode-assemble',
        'main-mode-split',
        'edit-submode-sheet',
        'edit-submode-rolltemplate',
        'roll20-document-language',
        'roll20-mode-modern',
        'roll20-mode-legacy',
        'roll20-sandbox-sanitize-toggle',
      ].map((testid) => {
        const node = document.querySelector(`[data-testid="${testid}"]`);
        if (!(node instanceof HTMLElement)) return { testid, found: false };
        const rect = node.getBoundingClientRect();
        return {
          testid,
          found: true,
          ariaLabel: node.getAttribute('aria-label') ?? '',
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
        };
      });
      return {
        found: true,
        clientWidth: toolbar.clientWidth,
        scrollWidth: toolbar.scrollWidth,
        controls,
        allControlsVisible: controls.every((control) => control.found
          && control.width > 0
          && control.height > 0
          && control.left >= toolbarRect.left - 0.5
          && control.right <= toolbarRect.right + 0.5
          && control.top >= toolbarRect.top - 0.5
          && control.bottom <= toolbarRect.bottom + 0.5),
      };
    });
    assert(result.tests.compactMainToolbar.found, 'compact main toolbar is missing');
    assert(
      result.tests.compactMainToolbar.scrollWidth <= result.tests.compactMainToolbar.clientWidth + 1,
      `compact main toolbar overflowed horizontally: ${JSON.stringify(result.tests.compactMainToolbar)}`,
    );
    assert(
      result.tests.compactMainToolbar.allControlsVisible,
      `compact main toolbar clipped a control: ${JSON.stringify(result.tests.compactMainToolbar)}`,
    );
    assert(
      result.tests.compactMainToolbar.controls.every((control) => control.ariaLabel.length > 0),
      `compact main toolbar control lost its accessible name: ${JSON.stringify(result.tests.compactMainToolbar.controls)}`,
    );
    await page.screenshot({
      path: path.join(REPORT_DIR, 'compact-toolbars.png'),
      fullPage: false,
    });

    result.tests.compactEditToolbar = await page.evaluate(() => {
      const toolbar = document.querySelector('[data-testid="edit-surface-toolbar"]');
      if (!(toolbar instanceof HTMLElement)) return { found: false };
      const toolbarRect = toolbar.getBoundingClientRect();
      const controls = [
        'edit-canvas-snap-toggle',
        'edit-placement-flow',
        'edit-placement-free',
        'edit-canvas-width-input',
        'edit-zoom-fit',
        'edit-zoom-100',
      ].map((testid) => {
        const node = document.querySelector(`[data-testid="${testid}"]`);
        if (!(node instanceof HTMLElement)) return { testid, found: false };
        const rect = node.getBoundingClientRect();
        return {
          testid,
          found: true,
          ariaLabel: node.getAttribute('aria-label') ?? '',
          text: node.textContent?.trim() ?? '',
          top: rect.top,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
        };
      });
      return {
        found: true,
        clientHeight: toolbar.clientHeight,
        scrollHeight: toolbar.scrollHeight,
        clientWidth: toolbar.clientWidth,
        scrollWidth: toolbar.scrollWidth,
        controls,
        allControlsInsideRow: controls.every((control) => control.found
          && control.width > 0
          && control.height > 0
          && control.top >= toolbarRect.top - 0.5
          && control.bottom <= toolbarRect.bottom + 0.5),
      };
    });
    assert(result.tests.compactEditToolbar.found, 'compact edit toolbar is missing');
    assert(result.tests.compactEditToolbar.clientHeight === 36, 'compact edit toolbar changed the stable canvas offset');
    assert(
      result.tests.compactEditToolbar.scrollHeight <= 36,
      `compact edit toolbar wrapped or overflowed vertically: ${JSON.stringify(result.tests.compactEditToolbar)}`,
    );
    assert(result.tests.compactEditToolbar.allControlsInsideRow, `compact edit toolbar controls escaped the row: ${JSON.stringify(result.tests.compactEditToolbar)}`);
    assert(
      result.tests.compactEditToolbar.controls.every((control) => control.ariaLabel.length > 0),
      `compact edit toolbar control lost its accessible name: ${JSON.stringify(result.tests.compactEditToolbar.controls)}`,
    );
    await page.setViewportSize({ width: 1480, height: 960 });
    await page.waitForFunction(() => (
      document.querySelector('[data-testid="edit-canvas-root"]')
        ?.getAttribute('data-r20-layer-panel-overlay') === 'false'
    ));

    const syntheticImageUrl = `http://127.0.0.1:${PORT}${BASE_PATH}/synthetic-image.svg`;
    const syntheticHtml = [
      '<div class="sheet-frame" style="width:520px; min-height:220px; padding:16px">',
      '  <h2 class="sheet-title" style="font-size:18px; font-weight:700">Character</h2>',
      '  <div class="sheet-row-a" style="padding:8px"><label class="sheet-field-label">Name</label><input type="text" name="attr_a" value="A"></div>',
      '  <div class="sheet-row-b" style="padding:8px"><input type="text" name="attr_b" value="B"></div>',
      `  <img class="sheet-portrait" src="${syntheticImageUrl}" alt="Synthetic portrait" style="width:160px; height:96px; object-fit:cover; object-position:center; opacity:0.9; border-radius:2px">`,
      '</div>',
      '<div class="sheet-horizontal-flow" style="display:flex; gap:8px; width:320px; padding:8px">',
      '  <div class="sheet-horizontal-flow-a" style="width:120px; min-height:36px; padding:6px">Left</div>',
      '  <div class="sheet-horizontal-flow-b" style="width:120px; min-height:36px; padding:6px">Right</div>',
      '</div>',
      '<table class="sheet-table"><tbody><tr class="sheet-table-row">',
      '  <td class="sheet-table-cell-a"><input type="text" name="attr_table_a" value="A"></td>',
      '  <td class="sheet-table-cell-b"><input type="text" name="attr_table_b" value="B"></td>',
      '</tr></tbody></table>',
      '<div class="sheet-outside" style="width:180px; min-height:54px; padding:8px">Outside</div>',
      '<div class="sheet-scaled-frame">',
      '  <div class="sheet-scaled-child">Scaled</div>',
      '  <div class="sheet-affine-frame">',
      '    <div class="sheet-affine-child">Turned</div>',
      '  </div>',
      '</div>',
      '<div class="sheet-group-one" style="padding:4px">Group A</div>',
      '<div class="sheet-group-two" style="padding:4px">Group B</div>',
      '<div class="sheet-group-three" style="padding:4px">Group C</div>',
      '<section class="sheet-layout-proof" style="width:420px; padding:12px">',
      '  <h3 class="sheet-layout-proof-title">Layout</h3>',
      '  <div class="sheet-layout-proof-a" style="min-height:28px; padding:6px">Main A</div>',
      '  <div class="sheet-layout-proof-b" style="min-height:28px; padding:6px">Side B</div>',
      '  <div class="sheet-layout-proof-c" style="min-height:28px; padding:6px">Main C</div>',
      '</section>',
      '<rolltemplate class="sheet-rolltemplate-default">',
      '  <div class="sheet-template-card">',
      '    <div class="sheet-template-title">{{name}}</div>',
      '    <div class="sheet-template-row"><span>Value</span><strong>{{result}}</strong></div>',
      '  </div>',
      '</rolltemplate>',
    ].join('\n');
    const syntheticCss = [
      '.sheet-rolltemplate-default .sheet-template-card { width: 100%; background: #fff; border: 1px solid #d7a5b6; }',
      '.sheet-rolltemplate-default .sheet-template-title { padding: 8px 10px; font-weight: 700; }',
      '.sheet-rolltemplate-default .sheet-template-row { display: flex; justify-content: space-between; padding: 8px 10px; }',
      '.sheet-group-one { margin-bottom: 18px; }',
      '.sheet-scaled-frame { position: relative; width: 260px; height: 150px; margin: 20px 0; padding: 12px; border: 4px solid #d7a5b6; transform: scale(0.75); transform-origin: top left; }',
      '.sheet-scaled-child { position: absolute; left: 24px; top: 32px; width: 80px; height: 28px; }',
      '.sheet-affine-frame { position: absolute; left: 170px; top: 86px; width: 108px; height: 66px; padding: 6px; border: 3px solid #8abfae; translate: 5px -3px; rotate: 6deg; scale: 0.95 1.08; transform: rotate(18deg) skewX(10deg) scale(0.85); transform-origin: top left; }',
      '.sheet-affine-child { position: absolute; left: 20px; top: 22px; width: 52px; height: 20px; translate: 4px 3px; rotate: -11deg; scale: 1.12 0.88; transform: rotate(-7deg); }',
    ].join('\n');
    await page.evaluate(
      ({ html, css }) => window.__perfHook.importSheet({ html, css, i18n: '{}' }),
      { html: syntheticHtml, css: syntheticCss },
    );
    await page.waitForTimeout(500);
    const { iframe, frame } = await waitForIframe();
    result.tests.editSurface.persistentIframe = true;
    const ids = await frame.evaluate(() => {
      const frameNode = document.querySelector('.sheet-frame');
      const title = document.querySelector('.sheet-title');
      const rowA = document.querySelector('.sheet-row-a');
      const fieldLabel = document.querySelector('.sheet-field-label');
      const rowAInput = document.querySelector('.sheet-row-a input');
      const rowB = document.querySelector('.sheet-row-b');
      const rowBInput = document.querySelector('.sheet-row-b input');
      const horizontalFlow = document.querySelector('.sheet-horizontal-flow');
      const horizontalFlowA = document.querySelector('.sheet-horizontal-flow-a');
      const horizontalFlowB = document.querySelector('.sheet-horizontal-flow-b');
      const image = document.querySelector('.sheet-portrait');
      const table = document.querySelector('.sheet-table');
      const tableBody = document.querySelector('.sheet-table tbody');
      const tableRow = document.querySelector('.sheet-table-row');
      const tableCellA = document.querySelector('.sheet-table-cell-a');
      const tableCellB = document.querySelector('.sheet-table-cell-b');
      const outside = document.querySelector('.sheet-outside');
      const scaledFrame = document.querySelector('.sheet-scaled-frame');
      const scaledChild = document.querySelector('.sheet-scaled-child');
      const affineFrame = document.querySelector('.sheet-affine-frame');
      const affineChild = document.querySelector('.sheet-affine-child');
      const groupOne = document.querySelector('.sheet-group-one');
      const groupTwo = document.querySelector('.sheet-group-two');
      const groupThree = document.querySelector('.sheet-group-three');
      const layoutProof = document.querySelector('.sheet-layout-proof');
      const layoutProofTitle = document.querySelector('.sheet-layout-proof-title');
      const layoutProofA = document.querySelector('.sheet-layout-proof-a');
      const layoutProofB = document.querySelector('.sheet-layout-proof-b');
      const layoutProofC = document.querySelector('.sheet-layout-proof-c');
      return {
        frameId: frameNode?.getAttribute('data-r20-block-id') ?? null,
        titleId: title?.getAttribute('data-r20-block-id') ?? null,
        rowAId: rowA?.getAttribute('data-r20-block-id') ?? null,
        labelId: fieldLabel?.getAttribute('data-r20-block-id') ?? null,
        rowAInputId: rowAInput?.getAttribute('data-r20-block-id') ?? null,
        rowBId: rowB?.getAttribute('data-r20-block-id') ?? null,
        rowBInputId: rowBInput?.getAttribute('data-r20-block-id') ?? null,
        horizontalFlowId: horizontalFlow?.getAttribute('data-r20-block-id') ?? null,
        horizontalFlowAId: horizontalFlowA?.getAttribute('data-r20-block-id') ?? null,
        horizontalFlowBId: horizontalFlowB?.getAttribute('data-r20-block-id') ?? null,
        imageId: image?.getAttribute('data-r20-block-id') ?? null,
        tableId: table?.getAttribute('data-r20-block-id') ?? null,
        tableBodyId: tableBody?.getAttribute('data-r20-block-id') ?? null,
        tableRowId: tableRow?.getAttribute('data-r20-block-id') ?? null,
        tableCellAId: tableCellA?.getAttribute('data-r20-block-id') ?? null,
        tableCellBId: tableCellB?.getAttribute('data-r20-block-id') ?? null,
        outsideId: outside?.getAttribute('data-r20-block-id') ?? null,
        scaledFrameId: scaledFrame?.getAttribute('data-r20-block-id') ?? null,
        scaledChildId: scaledChild?.getAttribute('data-r20-block-id') ?? null,
        affineFrameId: affineFrame?.getAttribute('data-r20-block-id') ?? null,
        affineChildId: affineChild?.getAttribute('data-r20-block-id') ?? null,
        groupOneId: groupOne?.getAttribute('data-r20-block-id') ?? null,
        groupTwoId: groupTwo?.getAttribute('data-r20-block-id') ?? null,
        groupThreeId: groupThree?.getAttribute('data-r20-block-id') ?? null,
        layoutProofId: layoutProof?.getAttribute('data-r20-block-id') ?? null,
        layoutProofTitleId: layoutProofTitle?.getAttribute('data-r20-block-id') ?? null,
        layoutProofAId: layoutProofA?.getAttribute('data-r20-block-id') ?? null,
        layoutProofBId: layoutProofB?.getAttribute('data-r20-block-id') ?? null,
        layoutProofCId: layoutProofC?.getAttribute('data-r20-block-id') ?? null,
      };
    });
    assert(
      ids.frameId && ids.titleId && ids.labelId && ids.rowAId && ids.rowAInputId && ids.rowBId && ids.rowBInputId
        && ids.horizontalFlowId && ids.horizontalFlowAId && ids.horizontalFlowBId
        && ids.imageId && ids.tableId && ids.tableBodyId
        && ids.tableRowId && ids.outsideId && ids.scaledFrameId && ids.scaledChildId
        && ids.affineFrameId && ids.affineChildId
        && ids.groupOneId && ids.groupTwoId && ids.groupThreeId
        && ids.layoutProofId && ids.layoutProofTitleId && ids.layoutProofAId && ids.layoutProofBId && ids.layoutProofCId,
      `synthetic structural IDs were not emitted: ${JSON.stringify(ids)}`,
    );

    const readScaledPlacement = () => frame.evaluate(({ frameId, childId }) => {
      const container = document.querySelector(`[data-r20-block-id="${CSS.escape(frameId)}"]`);
      const child = document.querySelector(`[data-r20-block-id="${CSS.escape(childId)}"]`);
      if (!(container instanceof HTMLElement) || !(child instanceof HTMLElement)) return null;
      const containerRect = container.getBoundingClientRect();
      const childRect = child.getBoundingClientRect();
      const scaleX = container.offsetWidth > 0 ? containerRect.width / container.offsetWidth : 1;
      const scaleY = container.offsetHeight > 0 ? containerRect.height / container.offsetHeight : 1;
      return {
        parentId: child.parentElement?.getAttribute('data-r20-block-id') ?? null,
        offsetParentId: child.offsetParent?.getAttribute('data-r20-block-id') ?? null,
        offsetLeft: child.offsetLeft,
        offsetTop: child.offsetTop,
        rectLeft: childRect.left,
        rectTop: childRect.top,
        scaleX,
        scaleY,
        position: getComputedStyle(child).position,
        inlineStyle: child.getAttribute('style') ?? '',
      };
    }, { frameId: ids.scaledFrameId, childId: ids.scaledChildId });

    await page.click('[data-testid="edit-placement-free"]');
    const scaledChild = frame.locator(`[data-r20-block-id="${ids.scaledChildId}"]`);
    await scaledChild.scrollIntoViewIfNeeded();
    const scaledBefore = await readScaledPlacement();
    const scaledBox = await scaledChild.boundingBox();
    assert(scaledBefore && scaledBox, 'scaled nested free-placement geometry is unavailable');
    assert(
      Math.abs(scaledBefore.scaleX - 0.75) <= 0.01 && Math.abs(scaledBefore.scaleY - 0.75) <= 0.01,
      `scaled container did not render at 75%: ${JSON.stringify(scaledBefore)}`,
    );
    const scaledVisualDelta = { x: 30, y: 18 };
    await page.evaluate((childId) => {
      window.__r20ScaledPointerTrace = [];
      window.addEventListener('message', (event) => {
        const message = event.data;
        if (
          message?.type === 'r20:edit-hit'
          && message.blockId === childId
          && (message.phase === 'pointerdown' || message.phase === 'pointerup')
        ) {
          window.__r20ScaledPointerTrace.push({
            phase: message.phase,
            pointer: message.pointer,
          });
        }
      });
    }, ids.scaledChildId);
    await page.mouse.move(scaledBox.x + scaledBox.width / 2, scaledBox.y + scaledBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      scaledBox.x + scaledBox.width / 2 + scaledVisualDelta.x,
      scaledBox.y + scaledBox.height / 2 + scaledVisualDelta.y,
      { steps: 4 },
    );
    await page.waitForTimeout(80);
    const scaledBoxDuring = await scaledChild.boundingBox();
    assert(
      scaledBoxDuring
        && Math.abs(scaledBoxDuring.x - scaledBox.x - scaledVisualDelta.x) <= 2
        && Math.abs(scaledBoxDuring.y - scaledBox.y - scaledVisualDelta.y) <= 2,
      `scaled optimistic drag did not follow the top-level pointer: ${JSON.stringify({ scaledBox, scaledBoxDuring, scaledVisualDelta })}`,
    );
    await page.mouse.up();
    await page.waitForTimeout(900);
    const scaledAfterEdit = await readScaledPlacement();
    const scaledBoxAfterEdit = await scaledChild.boundingBox();
    assert(scaledAfterEdit, 'scaled nested free-placement disappeared after drop');
    const scaledPointerTrace = await page.evaluate(() => window.__r20ScaledPointerTrace ?? []);
    const scaledPointerDown = scaledPointerTrace.find((entry) => entry.phase === 'pointerdown');
    const scaledPointerUp = [...scaledPointerTrace].reverse().find((entry) => entry.phase === 'pointerup');
    assert(scaledPointerDown && scaledPointerUp, `scaled pointer bridge trace is incomplete: ${JSON.stringify(scaledPointerTrace)}`);
    const iframePointerDelta = {
      x: scaledPointerUp.pointer.x - scaledPointerDown.pointer.x,
      y: scaledPointerUp.pointer.y - scaledPointerDown.pointer.y,
    };
    const expectedScaledLeft = Math.round(
      (scaledBefore.offsetLeft + iframePointerDelta.x / scaledBefore.scaleX) / 8,
    ) * 8;
    const expectedScaledTop = Math.round(
      (scaledBefore.offsetTop + iframePointerDelta.y / scaledBefore.scaleY) / 8,
    ) * 8;
    assert(
      scaledAfterEdit.parentId === ids.scaledFrameId
        && scaledAfterEdit.offsetParentId === ids.scaledFrameId
        && scaledAfterEdit.position === 'absolute',
      `scaled nested drop changed its containing frame: ${JSON.stringify(scaledAfterEdit)}`,
    );
    assert(
      Math.abs(scaledAfterEdit.offsetLeft - expectedScaledLeft) <= 0.5
        && Math.abs(scaledAfterEdit.offsetTop - expectedScaledTop) <= 0.5,
      `scaled nested drop stored viewport pixels instead of local CSS pixels: ${JSON.stringify({ scaledBefore, scaledAfterEdit, expectedScaledLeft, expectedScaledTop, iframePointerDelta, scaledPointerTrace })}`,
    );
    assert(
      Math.abs(
        scaledAfterEdit.rectLeft - scaledBefore.rectLeft
          - (expectedScaledLeft - scaledBefore.offsetLeft) * scaledBefore.scaleX,
      ) <= 0.75
        && Math.abs(
          scaledAfterEdit.rectTop - scaledBefore.rectTop
            - (expectedScaledTop - scaledBefore.offsetTop) * scaledBefore.scaleY,
        ) <= 0.75,
      `scaled nested drop visually rolled back after model commit: ${JSON.stringify({ scaledBefore, scaledAfterEdit })}`,
    );
    assert(
      scaledBoxAfterEdit
        && Math.abs(scaledBoxAfterEdit.x - scaledBox.x - scaledVisualDelta.x) <= 4
        && Math.abs(scaledBoxAfterEdit.y - scaledBox.y - scaledVisualDelta.y) <= 4,
      `scaled nested drop missed its top-level visual target: ${JSON.stringify({ scaledBox, scaledBoxAfterEdit, scaledVisualDelta })}`,
    );
    assert(!/(?:^|;)\s*(?:position|left|top)\s*:/i.test(scaledAfterEdit.inlineStyle), 'scaled placement leaked managed position into inline HTML');
    const scaledModel = await page.evaluate(({ childId }) => {
      const emit = window.__perfHook.getEmitContent();
      const emittedDocument = new DOMParser().parseFromString(emit.html, 'text/html');
      const emittedNode = emittedDocument.querySelector(`[data-r20-block-id="${CSS.escape(childId)}"]`);
      const positionClass = [...(emittedNode?.classList ?? [])]
        .find((className) => (
          className.startsWith('sheet-r20-node-')
          || className.startsWith('sheet-r20-position-')
        )) ?? null;
      const positionRules = positionClass
        ? emit.css.match(new RegExp(`[^{}]*\\.${positionClass}(?:\\.${positionClass})*[^{}]*\\{[^}]*\\}`, 'g')) ?? []
        : [];
      return {
        positionClass,
        emittedInlineStyle: emittedNode?.getAttribute('style') ?? '',
        positionRules,
      };
    }, { childId: ids.scaledChildId });
    assert(
      scaledModel.positionClass && scaledModel.positionRules.length > 0,
      `scaled placement did not emit an owned CSS rule: ${JSON.stringify(scaledModel)}`,
    );
    assert(
      scaledModel.positionRules.some((rule) => (
        /position\s*:\s*absolute/i.test(rule)
        && new RegExp(`left\\s*:\\s*${expectedScaledLeft}px`, 'i').test(rule)
        && new RegExp(`top\\s*:\\s*${expectedScaledTop}px`, 'i').test(rule)
      )),
      `scaled placement CSS has the wrong local coordinates: ${JSON.stringify(scaledModel)}`,
    );
    assert(!/(?:^|;)\s*(?:position|left|top)\s*:/i.test(scaledModel.emittedInlineStyle), 'scaled placement position leaked into emitted HTML');

    const readAffinePlacement = () => frame.evaluate(({ frameId, childId }) => {
      const container = document.querySelector(`[data-r20-block-id="${CSS.escape(frameId)}"]`);
      const child = document.querySelector(`[data-r20-block-id="${CSS.escape(childId)}"]`);
      if (!(container instanceof HTMLElement) || !(child instanceof HTMLElement)) return null;
      const multiply = (outer, inner) => ({
        a: outer.a * inner.a + outer.c * inner.b,
        b: outer.b * inner.a + outer.d * inner.b,
        c: outer.a * inner.c + outer.c * inner.d,
        d: outer.b * inner.c + outer.d * inner.d,
      });
      let matrix = { a: 1, b: 0, c: 0, d: 1 };
      let current = container;
      while (current instanceof HTMLElement) {
        const style = getComputedStyle(current);
        const zoom = Number.parseFloat(style.zoom);
        const ownZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
        let own = { a: ownZoom, b: 0, c: 0, d: ownZoom };
        if (style.transform && style.transform !== 'none') {
          const transform = new DOMMatrixReadOnly(style.transform);
          own = multiply({
            a: transform.a,
            b: transform.b,
            c: transform.c,
            d: transform.d,
          }, own);
        }
        const scaleParts = style.scale && style.scale !== 'none'
          ? style.scale.split(/\s+/).map(Number)
          : [1, 1];
        const scaleX = scaleParts[0];
        const scaleY = scaleParts.length > 1 ? scaleParts[1] : scaleX;
        const angle = style.rotate && style.rotate !== 'none'
          ? Number.parseFloat(style.rotate) * Math.PI / 180
          : 0;
        const individual = multiply(
          { a: Math.cos(angle), b: Math.sin(angle), c: -Math.sin(angle), d: Math.cos(angle) },
          { a: scaleX, b: 0, c: 0, d: scaleY },
        );
        own = multiply(individual, own);
        matrix = multiply(own, matrix);
        current = current.parentElement;
      }
      const childRect = child.getBoundingClientRect();
      return {
        parentId: child.parentElement?.getAttribute('data-r20-block-id') ?? null,
        offsetParentId: child.offsetParent?.getAttribute('data-r20-block-id') ?? null,
        offsetLeft: child.offsetLeft,
        offsetTop: child.offsetTop,
        rectLeft: childRect.left,
        rectTop: childRect.top,
        rectWidth: childRect.width,
        rectHeight: childRect.height,
        matrix,
        transform: getComputedStyle(child).transform,
        rotate: getComputedStyle(child).rotate,
        scale: getComputedStyle(child).scale,
        translate: getComputedStyle(child).translate,
        inlineStyle: child.getAttribute('style') ?? '',
      };
    }, { frameId: ids.affineFrameId, childId: ids.affineChildId });
    const affineChild = frame.locator(`[data-r20-block-id="${ids.affineChildId}"]`);
    await affineChild.scrollIntoViewIfNeeded();
    const affineBefore = await readAffinePlacement();
    const affineBox = await affineChild.boundingBox();
    assert(affineBefore && affineBox, 'affine nested free-placement geometry is unavailable');
    const affineVisualDelta = { x: 12, y: 8 };
    await page.evaluate((childId) => {
      window.__r20AffinePointerTrace = [];
      window.addEventListener('message', (event) => {
        const message = event.data;
        if (
          message?.type === 'r20:edit-hit'
          && message.blockId === childId
          && (message.phase === 'pointerdown' || message.phase === 'pointerup')
        ) {
          window.__r20AffinePointerTrace.push({ phase: message.phase, pointer: message.pointer });
        }
      });
    }, ids.affineChildId);
    await page.mouse.move(affineBox.x + affineBox.width / 2, affineBox.y + affineBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      affineBox.x + affineBox.width / 2 + affineVisualDelta.x,
      affineBox.y + affineBox.height / 2 + affineVisualDelta.y,
      { steps: 4 },
    );
    await page.waitForTimeout(80);
    const affineDuring = await readAffinePlacement();
    const affineBoxDuring = await affineChild.boundingBox();
    assert(
      affineDuring && affineBoxDuring
        && Math.abs(affineBoxDuring.x - affineBox.x - affineVisualDelta.x) <= 2
        && Math.abs(affineBoxDuring.y - affineBox.y - affineVisualDelta.y) <= 2,
      `affine optimistic drag did not follow the top-level pointer: ${JSON.stringify({ affineBox, affineBoxDuring, affineVisualDelta })}`,
    );
    assert(
      Math.abs(affineDuring.rectWidth - affineBefore.rectWidth) <= 0.5
        && Math.abs(affineDuring.rectHeight - affineBefore.rectHeight) <= 0.5,
      `affine optimistic drag dropped the authored child transform: ${JSON.stringify({ affineBefore, affineDuring })}`,
    );
    assert(
      affineDuring.rotate === affineBefore.rotate
        && affineDuring.scale === affineBefore.scale
        && affineDuring.translate === affineBefore.translate,
      `affine optimistic drag changed individual transform properties: ${JSON.stringify({ affineBefore, affineDuring })}`,
    );
    await page.mouse.up();
    await page.waitForTimeout(900);
    const affineAfterEdit = await readAffinePlacement();
    const affinePointerTrace = await page.evaluate(() => window.__r20AffinePointerTrace ?? []);
    const affinePointerDown = affinePointerTrace.find((entry) => entry.phase === 'pointerdown');
    const affinePointerUp = [...affinePointerTrace].reverse().find((entry) => entry.phase === 'pointerup');
    assert(affineAfterEdit && affinePointerDown && affinePointerUp, `affine pointer bridge trace is incomplete: ${JSON.stringify(affinePointerTrace)}`);
    const affinePointerDelta = {
      x: affinePointerUp.pointer.x - affinePointerDown.pointer.x,
      y: affinePointerUp.pointer.y - affinePointerDown.pointer.y,
    };
    const determinant = affineBefore.matrix.a * affineBefore.matrix.d - affineBefore.matrix.b * affineBefore.matrix.c;
    const affineLocalDelta = {
      x: (affineBefore.matrix.d * affinePointerDelta.x - affineBefore.matrix.c * affinePointerDelta.y) / determinant,
      y: (-affineBefore.matrix.b * affinePointerDelta.x + affineBefore.matrix.a * affinePointerDelta.y) / determinant,
    };
    const expectedAffineLeft = Math.round((affineBefore.offsetLeft + affineLocalDelta.x) / 8) * 8;
    const expectedAffineTop = Math.round((affineBefore.offsetTop + affineLocalDelta.y) / 8) * 8;
    const committedAffineViewportDelta = {
      x: affineBefore.matrix.a * (expectedAffineLeft - affineBefore.offsetLeft)
        + affineBefore.matrix.c * (expectedAffineTop - affineBefore.offsetTop),
      y: affineBefore.matrix.b * (expectedAffineLeft - affineBefore.offsetLeft)
        + affineBefore.matrix.d * (expectedAffineTop - affineBefore.offsetTop),
    };
    assert(
      affineAfterEdit.parentId === ids.affineFrameId
        && affineAfterEdit.offsetParentId === ids.affineFrameId
        && Math.abs(affineAfterEdit.offsetLeft - expectedAffineLeft) <= 0.5
        && Math.abs(affineAfterEdit.offsetTop - expectedAffineTop) <= 0.5,
      `affine nested drop stored the wrong local coordinates: ${JSON.stringify({ affineBefore, affineAfterEdit, expectedAffineLeft, expectedAffineTop, affineLocalDelta })}`,
    );
    assert(
      Math.abs(affineAfterEdit.rectLeft - affineBefore.rectLeft - committedAffineViewportDelta.x) <= 1
        && Math.abs(affineAfterEdit.rectTop - affineBefore.rectTop - committedAffineViewportDelta.y) <= 1,
      `affine nested drop visually rolled back after model commit: ${JSON.stringify({ affineBefore, affineAfterEdit, committedAffineViewportDelta })}`,
    );
    assert(
      affineAfterEdit.transform !== 'none'
        && affineAfterEdit.rotate === affineBefore.rotate
        && affineAfterEdit.scale === affineBefore.scale
        && affineAfterEdit.translate === affineBefore.translate
        && Math.abs(affineAfterEdit.rectWidth - affineBefore.rectWidth) <= 0.5
        && Math.abs(affineAfterEdit.rectHeight - affineBefore.rectHeight) <= 0.5,
      `affine nested drop lost the authored child transform: ${JSON.stringify({ affineBefore, affineAfterEdit })}`,
    );
    assert(!/(?:^|;)\s*(?:position|left|top|transform)\s*:/i.test(affineAfterEdit.inlineStyle), 'affine placement leaked managed geometry into inline HTML');

    await page.click('[data-testid="main-mode-preview"]');
    await frame.waitForFunction(() => document.body?.getAttribute('data-r20-edit-mode') === '0');
    const scaledPreview = await readScaledPlacement();
    const affinePreview = await readAffinePlacement();
    await page.click('[data-testid="preview-exit-edit"]');
    await frame.waitForFunction(() => document.body?.getAttribute('data-r20-edit-mode') === '1');
    const scaledEditAgain = await readScaledPlacement();
    const affineEditAgain = await readAffinePlacement();
    assert(
      scaledPreview && scaledEditAgain
        && Math.abs(scaledPreview.rectLeft - scaledAfterEdit.rectLeft) <= 0.5
        && Math.abs(scaledPreview.rectTop - scaledAfterEdit.rectTop) <= 0.5
        && Math.abs(scaledEditAgain.rectLeft - scaledPreview.rectLeft) <= 0.5
        && Math.abs(scaledEditAgain.rectTop - scaledPreview.rectTop) <= 0.5,
      `scaled nested placement diverged across Preview/Edit: ${JSON.stringify({ scaledAfterEdit, scaledPreview, scaledEditAgain })}`,
    );
    assert(
      affinePreview && affineEditAgain
        && Math.abs(affinePreview.rectLeft - affineAfterEdit.rectLeft) <= 0.5
        && Math.abs(affinePreview.rectTop - affineAfterEdit.rectTop) <= 0.5
        && Math.abs(affineEditAgain.rectLeft - affinePreview.rectLeft) <= 0.5
        && Math.abs(affineEditAgain.rectTop - affinePreview.rectTop) <= 0.5,
      `affine nested placement diverged across Preview/Edit: ${JSON.stringify({ affineAfterEdit, affinePreview, affineEditAgain })}`,
    );
    result.tests.scaledNestedPlacement = {
      before: scaledBefore,
      afterEdit: scaledAfterEdit,
      preview: scaledPreview,
      editAgain: scaledEditAgain,
      expected: { left: expectedScaledLeft, top: expectedScaledTop },
      pointerDelta: iframePointerDelta,
    };
    result.tests.affineNestedPlacement = {
      before: affineBefore,
      during: affineDuring,
      afterEdit: affineAfterEdit,
      preview: affinePreview,
      editAgain: affineEditAgain,
      expected: { left: expectedAffineLeft, top: expectedAffineTop },
      pointerDelta: affinePointerDelta,
    };

    const readLayoutProof = () => frame.evaluate((proofIds) => {
      const root = document.querySelector(`[data-r20-block-id="${CSS.escape(proofIds.root)}"]`);
      const title = document.querySelector(`[data-r20-block-id="${CSS.escape(proofIds.title)}"]`);
      const a = document.querySelector(`[data-r20-block-id="${CSS.escape(proofIds.a)}"]`);
      const b = document.querySelector(`[data-r20-block-id="${CSS.escape(proofIds.b)}"]`);
      const c = document.querySelector(`[data-r20-block-id="${CSS.escape(proofIds.c)}"]`);
      if (![root, title, a, b, c].every((node) => node instanceof HTMLElement)) return null;
      const rootElement = root;
      const rootRect = rootElement.getBoundingClientRect();
      const position = (node) => {
        const rect = node.getBoundingClientRect();
        return {
          left: Math.round((rect.left - rootRect.left) * 100) / 100,
          top: Math.round((rect.top - rootRect.top) * 100) / 100,
          width: Math.round(rect.width * 100) / 100,
          height: Math.round(rect.height * 100) / 100,
        };
      };
      const rootStyle = getComputedStyle(rootElement);
      const titleStyle = getComputedStyle(title);
      return {
        display: rootStyle.display,
        flexDirection: rootStyle.flexDirection,
        gridTemplateColumns: rootStyle.gridTemplateColumns,
        gap: rootStyle.gap,
        backgroundColor: rootStyle.backgroundColor,
        borderColor: rootStyle.borderColor,
        boxShadow: rootStyle.boxShadow,
        titleGridColumn: titleStyle.gridColumn,
        titleColor: titleStyle.color,
        titleBorderLeftWidth: titleStyle.borderLeftWidth,
        inlineStyle: rootElement.getAttribute('style') ?? '',
        title: position(title),
        a: position(a),
        b: position(b),
        c: position(c),
      };
    }, {
      root: ids.layoutProofId,
      title: ids.layoutProofTitleId,
      a: ids.layoutProofAId,
      b: ids.layoutProofBId,
      c: ids.layoutProofCId,
    });

    const layerSearch = page.locator('[data-testid="edit-layer-search"]');
    await layerSearch.fill(ids.layoutProofId);
    await page.locator(
      `[data-testid="edit-layer-row"][data-r20-block-id="${ids.layoutProofId}"]`,
    ).click();
    await page.waitForFunction(
      (rootId) => window.__perfHook.getSelectedBlockId?.() === rootId,
      ids.layoutProofId,
      { timeout: 5000 },
    );
    await layerSearch.fill('');
    const sectionMintSidebarComposition = page.locator(
      '[data-testid="design-section-composition-mint-sidebar"]',
    );
    await sectionMintSidebarComposition.waitFor({ state: 'visible', timeout: 10000 });
    assert((await page.locator('[data-testid="design-section-compositions"]').count()) === 1, 'section composition gallery is missing for a flow container');
    const sectionFineTune = page.locator('[data-testid="design-section-fine-tune"]');
    assert((await sectionFineTune.count()) === 1, 'section fine-tune controls are missing');
    assert(await sectionFineTune.evaluate((element) => !element.open), 'section fine-tune controls should start collapsed');
    assert((await page.locator('[data-testid="design-section-layouts"]:visible').count()) === 0, 'section layout gallery should start inside collapsed fine-tune controls');
    assert((await page.locator('[data-testid="design-section-themes"]:visible').count()) === 0, 'section theme gallery should start inside collapsed fine-tune controls');
    assert((await page.locator('[data-testid="design-control-group-themes"]').count()) === 0, 'ordinary section was misclassified as an input row');
    await sectionMintSidebarComposition.click();
    await frame.waitForFunction((rootId) => {
      const root = document.querySelector(`[data-r20-block-id="${CSS.escape(rootId)}"]`);
      if (!(root instanceof HTMLElement)) return false;
      const style = getComputedStyle(root);
      return style.display === 'grid'
        && style.backgroundColor === 'rgb(242, 251, 247)'
        && (style.gridTemplateColumns.match(/\d+(?:\.\d+)?px/g)?.length ?? 0) === 2;
    }, ids.layoutProofId, { timeout: 10000 });
    result.tests.sectionCompositionMintSidebar = await readLayoutProof();
    const compositionDebug = JSON.stringify(result.tests.sectionCompositionMintSidebar);
    assert(result.tests.sectionCompositionMintSidebar?.backgroundColor === 'rgb(242, 251, 247)', `section composition did not paint the mint surface: ${compositionDebug}`);
    assert(result.tests.sectionCompositionMintSidebar?.borderColor === 'rgb(134, 201, 179)', `section composition did not paint the mint border: ${compositionDebug}`);
    assert(result.tests.sectionCompositionMintSidebar?.titleColor === 'rgb(36, 113, 91)', `section composition did not paint the title: ${compositionDebug}`);
    assert(result.tests.sectionCompositionMintSidebar?.titleBorderLeftWidth === '4px', `section composition did not paint the title accent: ${compositionDebug}`);
    assert(!/background|border|display|grid|gap|padding/i.test(result.tests.sectionCompositionMintSidebar?.inlineStyle ?? ''), 'section composition leaked managed presentation into inline HTML');
    assert(await sectionMintSidebarComposition.getAttribute('aria-pressed') === 'true', 'applied section composition was not marked active');

    await page.locator('[data-testid="design-section-fine-tune-toggle"]').click();
    assert(await sectionFineTune.evaluate((element) => element.open), 'section fine-tune controls did not expand');
    const sectionSidebarLayout = page.locator('[data-testid="design-section-layout-sidebar"]');
    const sectionStackLayout = page.locator('[data-testid="design-section-layout-stack"]');
    await sectionSidebarLayout.waitFor({ state: 'visible', timeout: 10000 });
    assert((await page.locator('[data-testid="design-section-layouts"]').count()) === 1, 'section layout gallery is missing for a flow container');
    result.tests.sectionLayoutSidebar = await readLayoutProof();
    const sidebarDebug = JSON.stringify(result.tests.sectionLayoutSidebar);
    assert(result.tests.sectionLayoutSidebar?.display === 'grid', `sidebar layout did not use grid: ${sidebarDebug}`);
    assert(result.tests.sectionLayoutSidebar?.gap === '12px', `sidebar layout gap did not render: ${sidebarDebug}`);
    assert(result.tests.sectionLayoutSidebar?.titleGridColumn === '1 / -1', `section title did not span both columns: ${sidebarDebug}`);
    assert(Math.abs(result.tests.sectionLayoutSidebar.a.top - result.tests.sectionLayoutSidebar.b.top) < 1, `sidebar columns did not share a row: ${sidebarDebug}`);
    assert(result.tests.sectionLayoutSidebar.a.left < result.tests.sectionLayoutSidebar.b.left, `sidebar columns did not separate horizontally: ${sidebarDebug}`);
    assert(result.tests.sectionLayoutSidebar.a.width > result.tests.sectionLayoutSidebar.b.width * 1.7, `sidebar width ratio is not 2:1: ${sidebarDebug}`);
    assert(result.tests.sectionLayoutSidebar.c.top > result.tests.sectionLayoutSidebar.a.top, `third item did not flow to the next row: ${sidebarDebug}`);

    result.tests.sectionLayoutOrder = await page.evaluate((rootId) => window.__perfHook
      .getLayerSnapshot('html')
      .filter((node) => node.layerParentId === rootId)
      .map((node) => node.id), ids.layoutProofId);
    assert(
      JSON.stringify(result.tests.sectionLayoutOrder) === JSON.stringify([
        ids.layoutProofTitleId,
        ids.layoutProofAId,
        ids.layoutProofBId,
        ids.layoutProofCId,
      ]),
      `section layout changed HTML child order: ${JSON.stringify(result.tests.sectionLayoutOrder)}`,
    );

    await sectionStackLayout.click();
    await frame.waitForFunction((rootId) => {
      const root = document.querySelector(`[data-r20-block-id="${CSS.escape(rootId)}"]`);
      if (!(root instanceof HTMLElement)) return false;
      const style = getComputedStyle(root);
      return style.display === 'flex' && style.flexDirection === 'column';
    }, ids.layoutProofId, { timeout: 10000 });
    result.tests.sectionLayoutStack = await readLayoutProof();
    const stackDebug = JSON.stringify(result.tests.sectionLayoutStack);
    assert(Math.abs(result.tests.sectionLayoutStack.a.left - result.tests.sectionLayoutStack.b.left) < 1, `stack items did not align vertically: ${stackDebug}`);
    assert(result.tests.sectionLayoutStack.a.top < result.tests.sectionLayoutStack.b.top && result.tests.sectionLayoutStack.b.top < result.tests.sectionLayoutStack.c.top, `stack order did not follow HTML order: ${stackDebug}`);

    await sectionSidebarLayout.click();
    await frame.waitForFunction((rootId) => {
      const root = document.querySelector(`[data-r20-block-id="${CSS.escape(rootId)}"]`);
      return root instanceof HTMLElement && getComputedStyle(root).display === 'grid';
    }, ids.layoutProofId, { timeout: 10000 });
    result.tests.sectionLayoutEditFinal = await readLayoutProof();
    await page.locator('[data-testid="design-section-fine-tune-toggle"]').click();
    assert(await sectionFineTune.evaluate((element) => !element.open), 'section fine-tune controls did not collapse');
    assert(await sectionMintSidebarComposition.getAttribute('aria-pressed') === 'true', 'section composition did not become active again after matching fine tuning');
    await page.locator('[data-testid="design-section-compositions"]').scrollIntoViewIfNeeded();
    await page.screenshot({
      path: path.join(REPORT_DIR, 'section-composition-editor.png'),
      fullPage: false,
    });

    const preGroupCanvasFirst = frame.locator(`[data-r20-block-id="${ids.groupOneId}"]`);
    const preGroupCanvasSecond = frame.locator(`[data-r20-block-id="${ids.groupTwoId}"]`);
    await preGroupCanvasFirst.click({ force: true });
    await preGroupCanvasSecond.click({ modifiers: ['Control'], force: true });
    await frame.waitForFunction(({ firstId, secondId }) => (
      Boolean(document.querySelector(`[data-r20-block-id="${CSS.escape(firstId)}"][data-r20-selected="1"]`))
      && Boolean(document.querySelector(`[data-r20-block-id="${CSS.escape(secondId)}"][data-r20-selected="1"]`))
    ), {
      firstId: ids.groupOneId,
      secondId: ids.groupTwoId,
    }, { timeout: 10000 });
    result.tests.canvasMultiSelection = await frame.evaluate(({ firstId, secondId }) => ({
      firstVisible: Boolean(document.querySelector(`[data-r20-block-id="${CSS.escape(firstId)}"][data-r20-selected="1"]`)),
      secondVisible: Boolean(document.querySelector(`[data-r20-block-id="${CSS.escape(secondId)}"][data-r20-selected="1"]`)),
    }), { firstId: ids.groupOneId, secondId: ids.groupTwoId });
    assert(
      result.tests.canvasMultiSelection.firstVisible
        && result.tests.canvasMultiSelection.secondVisible,
      `canvas multi-selection is not visible: ${JSON.stringify(result.tests.canvasMultiSelection)}`,
    );

    const groupOneRow = page.locator(
      `[data-testid="edit-layer-row"][data-r20-block-id="${ids.groupOneId}"]`,
    );
    const groupTwoRow = page.locator(
      `[data-testid="edit-layer-row"][data-r20-block-id="${ids.groupTwoId}"]`,
    );
    const groupThreeRow = page.locator(
      `[data-testid="edit-layer-row"][data-r20-block-id="${ids.groupThreeId}"]`,
    );
    await groupOneRow.click();
    await groupTwoRow.dispatchEvent('click', { bubbles: true, ctrlKey: true });
    await groupThreeRow.dispatchEvent('click', { bubbles: true, ctrlKey: true });
    await page.waitForTimeout(120);
    result.tests.layerMultiSelection = await frame.evaluate(({ firstId, secondId, thirdId }) => ({
      selectedIds: [...document.querySelectorAll('[data-r20-selected="1"]')]
        .map((node) => node.getAttribute('data-r20-block-id'))
        .filter(Boolean),
      firstVisible: Boolean(document.querySelector(`[data-r20-block-id="${CSS.escape(firstId)}"][data-r20-selected="1"]`)),
      secondVisible: Boolean(document.querySelector(`[data-r20-block-id="${CSS.escape(secondId)}"][data-r20-selected="1"]`)),
      thirdVisible: Boolean(document.querySelector(`[data-r20-block-id="${CSS.escape(thirdId)}"][data-r20-selected="1"]`)),
    }), { firstId: ids.groupOneId, secondId: ids.groupTwoId, thirdId: ids.groupThreeId });
    assert(
      result.tests.layerMultiSelection.firstVisible
        && result.tests.layerMultiSelection.secondVisible
        && result.tests.layerMultiSelection.thirdVisible,
      `iframe multi-selection is not visible: ${JSON.stringify(result.tests.layerMultiSelection)}`,
    );
    await page.locator('[data-testid="edit-layer-group-selection"]').click();
    await page.waitForTimeout(900);
    result.tests.layerGrouping = await page.evaluate(({ firstId, secondId, thirdId }) => {
      const graph = window.__perfHook.getLayerSnapshot('html');
      const first = graph.find((node) => node.id === firstId);
      const second = graph.find((node) => node.id === secondId);
      const third = graph.find((node) => node.id === thirdId);
      const groupId = first?.layerParentId ?? null;
      const group = groupId ? graph.find((node) => node.id === groupId) : null;
      const emitted = window.__perfHook.getEmitContent().html;
      return {
        groupId,
        groupType: group?.type ?? null,
        firstParent: first?.layerParentId ?? null,
        secondParent: second?.layerParentId ?? null,
        thirdParent: third?.layerParentId ?? null,
        emittedNested: Boolean(groupId)
          && [firstId, secondId, thirdId].every(
            (id) => emitted.indexOf(`data-r20-block-id="${id}"`) > emitted.indexOf(`data-r20-block-id="${groupId}"`),
          ),
      };
    }, { firstId: ids.groupOneId, secondId: ids.groupTwoId, thirdId: ids.groupThreeId });
    const renderedGrouping = await frame.evaluate(({ firstId, secondId, thirdId, groupId }) => {
      const firstNode = document.querySelector(`[data-r20-block-id="${CSS.escape(firstId)}"]`);
      const secondNode = document.querySelector(`[data-r20-block-id="${CSS.escape(secondId)}"]`);
      const thirdNode = document.querySelector(`[data-r20-block-id="${CSS.escape(thirdId)}"]`);
      const groupNode = groupId
        ? document.querySelector(`[data-r20-block-id="${CSS.escape(groupId)}"]`)
        : null;
      return {
        firstFound: Boolean(firstNode),
        secondFound: Boolean(secondNode),
        thirdFound: Boolean(thirdNode),
        groupFound: Boolean(groupNode),
        renderedParent: firstNode?.parentElement?.closest('[data-r20-block-id]')?.getAttribute('data-r20-block-id') ?? null,
        renderedSecondParent: secondNode?.parentElement?.closest('[data-r20-block-id]')?.getAttribute('data-r20-block-id') ?? null,
        renderedThirdParent: thirdNode?.parentElement?.closest('[data-r20-block-id]')?.getAttribute('data-r20-block-id') ?? null,
      };
    }, {
      firstId: ids.groupOneId,
      secondId: ids.groupTwoId,
      thirdId: ids.groupThreeId,
      groupId: result.tests.layerGrouping.groupId,
    });
    result.tests.layerGrouping = { ...result.tests.layerGrouping, ...renderedGrouping };
    assert(result.tests.layerGrouping.groupId, 'layer grouping did not create a parent frame');
    assert(result.tests.layerGrouping.groupType === 'r20_element_container', 'layer grouping used the wrong HTML container');
    assert(
      result.tests.layerGrouping.firstParent === result.tests.layerGrouping.groupId
        && result.tests.layerGrouping.secondParent === result.tests.layerGrouping.groupId
        && result.tests.layerGrouping.thirdParent === result.tests.layerGrouping.groupId,
      `layer grouping did not preserve model parents: ${JSON.stringify(result.tests.layerGrouping)}`,
    );
    assert(
      result.tests.layerGrouping.renderedParent === result.tests.layerGrouping.groupId
        && result.tests.layerGrouping.renderedSecondParent === result.tests.layerGrouping.groupId
        && result.tests.layerGrouping.renderedThirdParent === result.tests.layerGrouping.groupId,
      `layer grouping did not update the iframe surface: ${JSON.stringify(result.tests.layerGrouping)}`,
    );
    assert(result.tests.layerGrouping.emittedNested, 'layer grouping did not update emitted HTML');

    const canvasFirst = frame.locator(`[data-r20-block-id="${ids.groupOneId}"]`);
    const canvasSecond = frame.locator(`[data-r20-block-id="${ids.groupTwoId}"]`);
    const canvasThird = frame.locator(`[data-r20-block-id="${ids.groupThreeId}"]`);
    assert(
      await canvasFirst.count() === 1
        && await canvasSecond.count() === 1
        && await canvasThird.count() === 1,
      'canvas multi-selection targets are missing',
    );
    await groupOneRow.dispatchEvent('click', { bubbles: true });
    await groupTwoRow.dispatchEvent('click', { bubbles: true, ctrlKey: true });
    await groupThreeRow.dispatchEvent('click', { bubbles: true, ctrlKey: true });
    await frame.waitForFunction(({ firstId, secondId, thirdId }) => (
      Boolean(document.querySelector(`[data-r20-block-id="${CSS.escape(firstId)}"][data-r20-selected="1"]`))
      && Boolean(document.querySelector(`[data-r20-block-id="${CSS.escape(secondId)}"][data-r20-selected="1"]`))
      && Boolean(document.querySelector(`[data-r20-block-id="${CSS.escape(thirdId)}"][data-r20-selected="1"]`))
    ), {
      firstId: ids.groupOneId,
      secondId: ids.groupTwoId,
      thirdId: ids.groupThreeId,
    }, { timeout: 10000 });
    result.tests.layerThirdSelection = await frame.evaluate(() => (
      document.querySelectorAll('[data-r20-selected="1"]').length
    ));
    assert(result.tests.layerThirdSelection >= 3, 'layer panel did not restore all three selections');

    await page.locator('[data-testid="preview-iframe"]').evaluate((iframe) => {
      iframe.contentWindow?.postMessage({ type: 'r20:widget-select', widgetName: null }, '*');
    });
    await page.waitForTimeout(80);
    result.tests.widgetSelectionIsolation = await frame.evaluate(({ firstId, secondId, thirdId }) => ({
      firstVisible: Boolean(document.querySelector(`[data-r20-block-id="${CSS.escape(firstId)}"][data-r20-selected="1"]`)),
      secondVisible: Boolean(document.querySelector(`[data-r20-block-id="${CSS.escape(secondId)}"][data-r20-selected="1"]`)),
      thirdVisible: Boolean(document.querySelector(`[data-r20-block-id="${CSS.escape(thirdId)}"][data-r20-selected="1"]`)),
    }), { firstId: ids.groupOneId, secondId: ids.groupTwoId, thirdId: ids.groupThreeId });
    assert(
      result.tests.widgetSelectionIsolation.firstVisible
        && result.tests.widgetSelectionIsolation.secondVisible
        && result.tests.widgetSelectionIsolation.thirdVisible,
      `widget selection cleared layer selection: ${JSON.stringify(result.tests.widgetSelectionIsolation)}`,
    );

    await page.click('[data-testid="edit-placement-free"]');
    const multiBefore = await frame.evaluate(({ firstId, secondId, thirdId }) => {
      const read = (id) => {
        const node = document.querySelector(`[data-r20-block-id="${CSS.escape(id)}"]`);
        const rect = node?.getBoundingClientRect();
        return rect ? { left: rect.left, top: rect.top } : null;
      };
      return {
        first: read(firstId),
        second: read(secondId),
        third: read(thirdId),
      };
    }, { firstId: ids.groupOneId, secondId: ids.groupTwoId, thirdId: ids.groupThreeId });
    const multiDragTarget = await canvasSecond.boundingBox();
    assert(
      multiDragTarget && multiBefore.first && multiBefore.second && multiBefore.third,
      'multi-drag targets are missing',
    );
    await page.mouse.move(
      multiDragTarget.x + multiDragTarget.width / 2,
      multiDragTarget.y + multiDragTarget.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      multiDragTarget.x + multiDragTarget.width / 2 + 24,
      multiDragTarget.y + multiDragTarget.height / 2 + 16,
      { steps: 4 },
    );
    await page.waitForTimeout(60);
    const multiDuring = await frame.evaluate(({ firstId, secondId, thirdId }) => {
      const read = (id) => {
        const node = document.querySelector(`[data-r20-block-id="${CSS.escape(id)}"]`);
        const rect = node?.getBoundingClientRect();
        return rect ? { left: rect.left, top: rect.top } : null;
      };
      return { first: read(firstId), second: read(secondId), third: read(thirdId) };
    }, { firstId: ids.groupOneId, secondId: ids.groupTwoId, thirdId: ids.groupThreeId });
    assert(
      multiDuring.first && multiDuring.second && multiDuring.third,
      'multi-drag visual targets disappeared',
    );
    const duringDeltaFirst = multiDuring.first.left - multiBefore.first.left;
    const duringDeltaSecond = multiDuring.second.left - multiBefore.second.left;
    const duringDeltaThird = multiDuring.third.left - multiBefore.third.left;
    assert(
      Math.abs(duringDeltaFirst - duringDeltaSecond) < 1
        && Math.abs(duringDeltaFirst - duringDeltaThird) < 1,
      `multi-drag did not move every layer together: ${JSON.stringify({ multiBefore, multiDuring })}`,
    );
    await page.mouse.up();
    await page.waitForTimeout(900);
    const multiAfter = await frame.evaluate(({ firstId, secondId, thirdId }) => {
      const read = (id) => {
        const node = document.querySelector(`[data-r20-block-id="${CSS.escape(id)}"]`);
        const rect = node?.getBoundingClientRect();
        return rect ? { left: rect.left, top: rect.top } : null;
      };
      return {
        first: read(firstId),
        second: read(secondId),
        third: read(thirdId),
      };
    }, { firstId: ids.groupOneId, secondId: ids.groupTwoId, thirdId: ids.groupThreeId });
    const emittedMulti = await page.evaluate(() => window.__perfHook.getEmitContent());
    assert(
      multiAfter.first && multiAfter.second && multiAfter.third,
      'multi-drag committed targets disappeared',
    );
    const afterDeltaFirst = multiAfter.first.left - multiBefore.first.left;
    const afterDeltaSecond = multiAfter.second.left - multiBefore.second.left;
    const afterDeltaThird = multiAfter.third.left - multiBefore.third.left;
    result.tests.canvasMultiMove = {
      before: multiBefore,
      during: multiDuring,
      after: multiAfter,
      emittedHtml: emittedMulti.html,
      emittedCss: emittedMulti.css,
      duringDeltaFirst,
      duringDeltaSecond,
      duringDeltaThird,
      afterDeltaFirst,
      afterDeltaSecond,
      afterDeltaThird,
    };
    assert(
      Math.abs(afterDeltaFirst - afterDeltaSecond) < 1
        && Math.abs(afterDeltaFirst - afterDeltaThird) < 1
        && Math.abs(afterDeltaFirst) >= 16,
      `multi-drag did not persist as a group move: ${JSON.stringify(result.tests.canvasMultiMove)}`,
    );

    const alignmentToolbar = page.locator('[data-testid="iframe-alignment-toolbar"]');
    await alignmentToolbar.waitFor({ state: 'visible', timeout: 10000 });
    assert(
      await alignmentToolbar.getAttribute('data-r20-alignment-count') === '3',
      'multi-selection alignment toolbar has the wrong selection count',
    );
    const arrangementIds = [ids.groupOneId, ids.groupTwoId, ids.groupThreeId];
    const readArrangementGeometry = () => frame.evaluate((blockIds) => blockIds.map((id) => {
      const node = document.querySelector(`[data-r20-block-id="${CSS.escape(id)}"]`);
      const rect = node?.getBoundingClientRect();
      return rect ? {
        blockId: id,
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        position: getComputedStyle(node).position,
        inlineStyle: node.getAttribute('style') ?? '',
      } : null;
    }), arrangementIds);
    const verticalGaps = (items) => {
      const sorted = [...items].sort((a, b) => a.top - b.top);
      return sorted.slice(1).map((item, index) => item.top - (sorted[index].top + sorted[index].height));
    };
    const keyboardBefore = await readArrangementGeometry();
    const keyboardBeforeSource = await page.evaluate(() => window.__perfHook.getEmitContent());
    assert(
      keyboardBefore.every((item) => item?.position === 'absolute'),
      `keyboard nudge targets are not absolute layers: ${JSON.stringify(keyboardBefore)}`,
    );
    await frame.locator('body').press('ArrowRight');
    await frame.waitForFunction(() => (
      Number(document.body?.getAttribute('data-r20-keyboard-nudge-count') ?? '0') >= 1
      && !document.body?.hasAttribute('data-r20-keyboard-nudge-active')
    ), null, { timeout: 10000 });
    const keyboardNudgeContinuity = await page.evaluate(({ beforeHtml, beforeCss }) => {
      const emit = window.__perfHook.getEmitContent();
      return {
        htmlChanged: emit.html !== beforeHtml,
        cssChanged: emit.css !== beforeCss,
        selectedRows: document.querySelectorAll('[data-testid="edit-layer-row"][data-r20-layer-selected="1"]').length,
        renderReady: document
          .querySelector('[data-r20-render-ready]')
          ?.getAttribute('data-r20-render-ready') ?? null,
        structureReady: document
          .querySelector('[data-r20-structure-ready]')
          ?.getAttribute('data-r20-structure-ready') ?? null,
      };
    }, {
      beforeHtml: keyboardBeforeSource.html,
      beforeCss: keyboardBeforeSource.css,
    });
    result.tests.keyboardNudgeContinuity = keyboardNudgeContinuity;
    assert(
      !keyboardNudgeContinuity.htmlChanged
        && keyboardNudgeContinuity.cssChanged
        && keyboardNudgeContinuity.selectedRows === 3
        && keyboardNudgeContinuity.structureReady === '1',
      `CSS-only keyboard movement interrupted structural editing: ${JSON.stringify(keyboardNudgeContinuity)}`,
    );
    await page.locator(
      `[data-testid="edit-layer-row"][data-r20-block-id="${ids.groupTwoId}"]`,
    ).press('Shift+ArrowDown');
    await frame.waitForFunction(() => (
      Number(document.body?.getAttribute('data-r20-keyboard-nudge-count') ?? '0') >= 2
      && !document.body?.hasAttribute('data-r20-keyboard-nudge-active')
    ), null, { timeout: 10000 });
    const secondNudgeCount = await frame.evaluate(() => (
      Number(document.body?.getAttribute('data-r20-keyboard-nudge-count') ?? '0')
    ));
    assert(
      secondNudgeCount >= 2,
      `layer-row keyboard nudge was not delivered: ${JSON.stringify(keyboardNudgeContinuity)}`,
    );
    const keyboardAfterEdit = await readArrangementGeometry();
    const keyboardEmit = await page.evaluate(() => window.__perfHook.getEmitContent());
    const keyboardMetrics = await frame.evaluate(() => ({
      count: Number(document.body?.getAttribute('data-r20-keyboard-nudge-count') ?? '0'),
      nudgeEpoch: Number(document.body?.getAttribute('data-r20-last-keyboard-nudge-epoch') ?? '0'),
      applyEpoch: Number(document.body?.getAttribute('data-r20-last-apply-epoch') ?? '0'),
    }));
    assert(
      keyboardAfterEdit.every((item, index) => (
        Math.abs(item.left - keyboardBefore[index].left - 1) <= 0.5
        && Math.abs(item.top - keyboardBefore[index].top - 10) <= 0.5
      )),
      `keyboard nudge did not move every selected layer by 1px/10px: ${JSON.stringify({ keyboardBefore, keyboardAfterEdit })}`,
    );
    assert(
      keyboardAfterEdit.every(
        (item) => !/(?:^|;)\s*(?:position|left|top)\s*:/i.test(item.inlineStyle),
      ),
      `keyboard nudge leaked position into inline HTML: ${JSON.stringify(keyboardAfterEdit)}`,
    );
    assert(/position\s*:\s*absolute/i.test(keyboardEmit.css), 'keyboard nudge did not persist in managed CSS');
    assert(
      keyboardMetrics.count >= 2
        && keyboardMetrics.nudgeEpoch > 0
        && keyboardMetrics.applyEpoch >= keyboardMetrics.nudgeEpoch,
      `keyboard nudge was not applied optimistically before the authoritative patch: ${JSON.stringify(keyboardMetrics)}`,
    );
    const waitForArrangement = (expected) => frame.waitForFunction(({ blockIds, positions }) => (
      blockIds.every((id, index) => {
        const rect = document
          .querySelector(`[data-r20-block-id="${CSS.escape(id)}"]`)
          ?.getBoundingClientRect();
        return Boolean(
          rect
          && Math.abs(rect.left - positions[index].left) <= 0.5
          && Math.abs(rect.top - positions[index].top) <= 0.5,
        );
      })
    ), { blockIds: arrangementIds, positions: expected }, { timeout: 10000 });
    assert(await historyUndoButton.isEnabled(), 'unified undo was disabled after keyboard movement');
    await historyUndoButton.click();
    const afterFirstUndoExpected = keyboardBefore.map((item) => ({
      left: item.left + 1,
      top: item.top,
    }));
    await waitForArrangement(afterFirstUndoExpected);
    const keyboardUndoStep = await readArrangementGeometry();
    await historyUndoButton.click();
    await waitForArrangement(keyboardBefore);
    const keyboardUndoAll = await readArrangementGeometry();
    assert(await historyRedoButton.isEnabled(), 'unified redo was disabled after two keyboard undos');
    await historyRedoButton.click();
    await waitForArrangement(afterFirstUndoExpected);
    const keyboardRedoStep = await readArrangementGeometry();
    await historyRedoButton.click();
    await waitForArrangement(keyboardAfterEdit);
    const keyboardRedoAll = await readArrangementGeometry();
    assert(
      keyboardUndoStep.every((item, index) => (
        Math.abs(item.left - keyboardBefore[index].left - 1) <= 0.5
        && Math.abs(item.top - keyboardBefore[index].top) <= 0.5
      ))
        && keyboardUndoAll.every((item, index) => (
          Math.abs(item.left - keyboardBefore[index].left) <= 0.5
          && Math.abs(item.top - keyboardBefore[index].top) <= 0.5
        ))
        && keyboardRedoAll.every((item, index) => (
          Math.abs(item.left - keyboardAfterEdit[index].left) <= 0.5
          && Math.abs(item.top - keyboardAfterEdit[index].top) <= 0.5
        )),
      `unified keyboard history did not roundtrip all selected layers: ${JSON.stringify({ keyboardBefore, keyboardUndoStep, keyboardUndoAll, keyboardRedoStep, keyboardRedoAll })}`,
    );
    await page.click('[data-testid="main-mode-preview"]');
    await frame.waitForFunction(() => document.body?.getAttribute('data-r20-edit-mode') === '0');
    const keyboardPreview = await readArrangementGeometry();
    await page.click('[data-testid="preview-exit-edit"]');
    await frame.waitForFunction(() => document.body?.getAttribute('data-r20-edit-mode') === '1');
    const keyboardEditAgain = await readArrangementGeometry();
    assert(
      keyboardPreview.every((item, index) => (
        Math.abs(item.left - keyboardAfterEdit[index].left) <= 0.5
        && Math.abs(item.top - keyboardAfterEdit[index].top) <= 0.5
        && Math.abs(keyboardEditAgain[index].left - item.left) <= 0.5
        && Math.abs(keyboardEditAgain[index].top - item.top) <= 0.5
      )),
      `keyboard nudge diverged across Preview/Edit: ${JSON.stringify({ keyboardAfterEdit, keyboardPreview, keyboardEditAgain })}`,
    );
    result.tests.keyboardNudge = {
      before: keyboardBefore,
      afterEdit: keyboardAfterEdit,
      preview: keyboardPreview,
      editAgain: keyboardEditAgain,
      metrics: keyboardMetrics,
      undoStep: keyboardUndoStep,
      undoAll: keyboardUndoAll,
      redoStep: keyboardRedoStep,
      redoAll: keyboardRedoAll,
    };
    await alignmentToolbar.waitFor({ state: 'visible', timeout: 10000 });
    const alignmentBefore = keyboardEditAgain;
    assert(
      alignmentBefore.every((item) => item?.position === 'absolute')
        && new Set(alignmentBefore.map((item) => Math.round(item.top))).size > 1,
      `alignment targets are not distinct absolute layers: ${JSON.stringify(alignmentBefore)}`,
    );
    const gapsBefore = verticalGaps(alignmentBefore);
    assert(
      Math.abs(gapsBefore[0] - gapsBefore[1]) >= 1,
      `distribution targets do not start with distinct gaps: ${JSON.stringify(gapsBefore)}`,
    );
    const verticalDistribution = page.locator('[data-testid="iframe-distribute-vertical"]');
    await verticalDistribution.waitFor({ state: 'visible', timeout: 10000 });
    await verticalDistribution.click();
    await frame.waitForFunction((blockIds) => {
      const items = blockIds.map((id) => document
        .querySelector(`[data-r20-block-id="${CSS.escape(id)}"]`)
        ?.getBoundingClientRect()).filter(Boolean).sort((a, b) => a.top - b.top);
      if (items.length !== blockIds.length) return false;
      const gaps = items.slice(1).map(
        (item, index) => item.top - (items[index].top + items[index].height),
      );
      return Math.max(...gaps) - Math.min(...gaps) <= 0.5;
    }, arrangementIds, { timeout: 10000 });
    const distributionAfterEdit = await readArrangementGeometry();
    const gapsAfter = verticalGaps(distributionAfterEdit);
    const sortedBefore = [...alignmentBefore].sort((a, b) => a.top - b.top);
    const sortedAfter = [...distributionAfterEdit].sort((a, b) => a.top - b.top);
    assert(
      Math.max(...gapsAfter) - Math.min(...gapsAfter) <= 0.5
        && Math.abs(sortedAfter[0].top - sortedBefore[0].top) <= 0.5
        && Math.abs(
          sortedAfter.at(-1).top + sortedAfter.at(-1).height
            - sortedBefore.at(-1).top - sortedBefore.at(-1).height,
        ) <= 0.5,
      `vertical distribution changed outer bounds or kept uneven gaps: ${JSON.stringify({ gapsBefore, gapsAfter })}`,
    );
    await page.locator('[data-testid="iframe-align-top"]').click();
    await frame.waitForFunction((blockIds) => {
      const tops = blockIds.map((id) => document
        .querySelector(`[data-r20-block-id="${CSS.escape(id)}"]`)
        ?.getBoundingClientRect().top);
      return tops.every(Number.isFinite) && Math.max(...tops) - Math.min(...tops) <= 0.5;
    }, arrangementIds, { timeout: 10000 });
    const alignmentAfterEdit = await readArrangementGeometry();
    const alignmentModel = await page.evaluate((blockIds) => {
      const graph = window.__perfHook.getLayerSnapshot('html');
      const emitted = window.__perfHook.getEmitContent();
      return {
        parents: blockIds.map((id) => graph.find((node) => node.id === id)?.layerParentId ?? null),
        emittedCss: emitted.css,
      };
    }, arrangementIds);
    assert(
      Math.max(...alignmentAfterEdit.map((item) => item.top))
        - Math.min(...alignmentAfterEdit.map((item) => item.top)) <= 0.5,
      `top alignment did not persist in Edit: ${JSON.stringify(alignmentAfterEdit)}`,
    );
    assert(
      alignmentAfterEdit.every(
        (item) => !/(?:^|;)\s*(?:position|left|top)\s*:/i.test(item.inlineStyle),
      ),
      `alignment leaked position into inline HTML: ${JSON.stringify(alignmentAfterEdit)}`,
    );
    assert(
      alignmentModel.parents.every((parentId) => parentId === result.tests.layerGrouping.groupId),
      `alignment changed the HTML parent: ${JSON.stringify(alignmentModel)}`,
    );
    assert(/position\s*:\s*absolute/i.test(alignmentModel.emittedCss), 'alignment did not remain in emitted managed CSS');

    await page.click('[data-testid="main-mode-preview"]');
    await page.waitForTimeout(120);
    const alignmentPreview = await readArrangementGeometry();
    assert(
      Math.max(...alignmentPreview.map((item) => item.top))
        - Math.min(...alignmentPreview.map((item) => item.top)) <= 0.5,
      `Preview geometry differs after alignment: ${JSON.stringify(alignmentPreview)}`,
    );
    await page.click('[data-testid="preview-exit-edit"]');
    await alignmentToolbar.waitFor({ state: 'visible', timeout: 10000 });
    const alignmentEditAgain = await readArrangementGeometry();
    assert(
      Math.max(...alignmentEditAgain.map((item) => item.top))
        - Math.min(...alignmentEditAgain.map((item) => item.top)) <= 0.5,
      `Edit geometry changed after Preview roundtrip: ${JSON.stringify(alignmentEditAgain)}`,
    );
    result.tests.canvasDistribution = {
      before: alignmentBefore,
      afterEdit: distributionAfterEdit,
      gapsBefore,
      gapsAfter,
    };
    result.tests.canvasAlignment = {
      before: alignmentBefore,
      afterEdit: alignmentAfterEdit,
      preview: alignmentPreview,
      editAgain: alignmentEditAgain,
      parents: alignmentModel.parents,
    };

    // This is the user-facing path: move a real rendered node over another
    // rendered node, let the iframe show the optimistic order immediately,
    // then confirm the emitted/live-patched order stays authoritative.
    await page.click('[data-testid="edit-placement-flow"]');
    const rowABox = await frame.locator('.sheet-row-a').boundingBox();
    const rowBBox = await frame.locator('.sheet-row-b').boundingBox();
    assert(rowABox && rowBBox, 'synthetic flow drag targets are missing');
    const flowRollbackBefore = await frame.evaluate(() => Number(
      document.body.getAttribute('data-r20-optimistic-flow-rollbacks') || '0',
    ));
    await page.mouse.move(rowABox.x + rowABox.width / 2, rowABox.y + rowABox.height / 2);
    await page.mouse.down();
    await page.mouse.move(rowBBox.x + rowBBox.width / 2, rowBBox.y + rowBBox.height * 0.08, { steps: 4 });
    await page.waitForTimeout(40);
    const beforeDropIndicator = await page.evaluate(() => {
      const overlay = document.querySelector('[data-testid="iframe-edit-drop-overlay"]');
      const label = overlay?.querySelector('[data-testid="iframe-edit-drop-label"]');
      return {
        mode: overlay?.getAttribute('data-r20-drop-mode') ?? null,
        indicator: overlay?.getAttribute('data-r20-drop-indicator') ?? null,
        label: label?.textContent?.trim() ?? null,
        height: overlay ? Number.parseFloat(getComputedStyle(overlay).height) : null,
      };
    });
    await page.mouse.move(rowBBox.x + rowBBox.width / 2, rowBBox.y + rowBBox.height * 0.92, { steps: 6 });
    await page.waitForTimeout(40);
    const afterDropIndicator = await page.evaluate(() => {
      const overlay = document.querySelector('[data-testid="iframe-edit-drop-overlay"]');
      const label = overlay?.querySelector('[data-testid="iframe-edit-drop-label"]');
      return {
        mode: overlay?.getAttribute('data-r20-drop-mode') ?? null,
        indicator: overlay?.getAttribute('data-r20-drop-indicator') ?? null,
        label: label?.textContent?.trim() ?? null,
        height: overlay ? Number.parseFloat(getComputedStyle(overlay).height) : null,
      };
    });
    await page.mouse.up();
    await page.waitForTimeout(40);
    result.tests.iframeFlowReparent = await frame.evaluate(({ rowAId, rowBId, frameId, flowRollbackBefore }) => {
      const parentIdOf = (id) => {
        const node = document.querySelector(`[data-r20-block-id="${CSS.escape(id)}"]`);
        return node?.parentElement?.closest('[data-r20-block-id]')?.getAttribute('data-r20-block-id') ?? null;
      };
      const rowA = document.querySelector(`[data-r20-block-id="${CSS.escape(rowAId)}"]`);
      const rowB = document.querySelector(`[data-r20-block-id="${CSS.escape(rowBId)}"]`);
      const frame = document.querySelector(`[data-r20-block-id="${CSS.escape(frameId)}"]`);
      const frameChildren = frame ? [...frame.children].map((node) => node.getAttribute('data-r20-block-id')) : [];
      const rowAIndex = frameChildren.indexOf(rowAId);
      const rowBIndex = frameChildren.indexOf(rowBId);
      const rollbackAfter = Number(document.body.getAttribute('data-r20-optimistic-flow-rollbacks') || '0');
      return {
        immediateParent: parentIdOf(rowAId),
        rowAIndex,
        rowBIndex,
        immediateAfter: rowAIndex > rowBIndex && rowAIndex >= 0,
        rollbackBefore: flowRollbackBefore,
        rollbackAfter,
        rollbackFree: rollbackAfter === flowRollbackBefore,
        rowAConnected: Boolean(rowA?.isConnected),
        rowBConnected: Boolean(rowB?.isConnected),
      };
    }, { ...ids, flowRollbackBefore });
    result.tests.iframeFlowReparent.dropIndicator = {
      before: beforeDropIndicator,
      after: afterDropIndicator,
    };
    assert(
      result.tests.iframeFlowReparent.immediateAfter,
      `iframe flow drag did not move immediately: ${JSON.stringify(result.tests.iframeFlowReparent)}`,
    );
    assert(
      result.tests.iframeFlowReparent.immediateParent === ids.frameId,
      'iframe flow drag changed the rendered parent unexpectedly',
    );
    assert(result.tests.iframeFlowReparent.rollbackFree, 'iframe flow drag rolled back unexpectedly');
    assert(
      result.tests.iframeFlowReparent.dropIndicator.before.mode === 'before'
        && result.tests.iframeFlowReparent.dropIndicator.before.indicator === 'exact'
        && result.tests.iframeFlowReparent.dropIndicator.before.label === '앞에 놓기'
        && Number.isFinite(result.tests.iframeFlowReparent.dropIndicator.before.height)
        && result.tests.iframeFlowReparent.dropIndicator.before.height <= 12,
      `before drop indicator was not an exact insertion line: ${JSON.stringify(result.tests.iframeFlowReparent.dropIndicator.before)}`,
    );
    assert(
      result.tests.iframeFlowReparent.dropIndicator.after.mode === 'after'
        && result.tests.iframeFlowReparent.dropIndicator.after.indicator === 'exact'
        && result.tests.iframeFlowReparent.dropIndicator.after.label === '뒤에 놓기'
        && Number.isFinite(result.tests.iframeFlowReparent.dropIndicator.after.height)
        && result.tests.iframeFlowReparent.dropIndicator.after.height <= 12,
      `after drop indicator was not an exact insertion line: ${JSON.stringify(result.tests.iframeFlowReparent.dropIndicator.after)}`,
    );
    await page.waitForTimeout(700);
    const authoritativeFrame = await frame.evaluate(({ rowAId, rowBId }) => {
      const frame = document;
      const iframeA = frame?.querySelector(`[data-r20-block-id="${CSS.escape(rowAId)}"]`);
      const iframeB = frame?.querySelector(`[data-r20-block-id="${CSS.escape(rowBId)}"]`);
      const renderedOrder = frame
        ? [...frame.querySelectorAll('[data-r20-block-id]')]
            .filter((node) => [rowAId, rowBId].includes(node.getAttribute('data-r20-block-id')))
            .map((node) => node.getAttribute('data-r20-block-id'))
        : [];
      return {
        renderedAfter: Boolean(
          iframeA
          && iframeB
          && (iframeA.compareDocumentPosition(iframeB) & Node.DOCUMENT_POSITION_PRECEDING),
        ),
        renderedOrder,
        renderedPositionBits: iframeA && iframeB ? iframeA.compareDocumentPosition(iframeB) : null,
        renderedSameParent: Boolean(iframeA && iframeB && iframeA.parentElement === iframeB.parentElement),
        htmlKey: frame?.body?.getAttribute('data-r20-html-key') ?? null,
      };
    }, ids);
    const authoritativeModel = await page.evaluate(({ rowAId, rowBId }) => {
      const graph = window.__perfHook.getLayerSnapshot('html');
      const moving = graph.find((node) => node.id === rowAId);
      const target = graph.find((node) => node.id === rowBId);
      const emitted = window.__perfHook.getEmitContent().html;
      const movingIndex = emitted.indexOf(`data-r20-block-id="${rowAId}"`);
      const targetIndex = emitted.indexOf(`data-r20-block-id="${rowBId}"`);
      return {
        movingParent: moving?.layerParentId ?? null,
        targetParent: target?.layerParentId ?? null,
        movingPrevious: moving?.layerPreviousId ?? null,
        emittedAfter: movingIndex > targetIndex && movingIndex >= 0,
      };
    }, ids);
    result.tests.iframeFlowReparent.authoritative = { ...authoritativeModel, ...authoritativeFrame };
    assert(result.tests.iframeFlowReparent.authoritative.movingParent === ids.frameId, 'authoritative flow parent drifted');
    assert(result.tests.iframeFlowReparent.authoritative.targetParent === ids.frameId, 'authoritative flow target parent drifted');
    assert(result.tests.iframeFlowReparent.authoritative.movingPrevious === ids.rowBId, 'authoritative flow order was not persisted');
    assert(result.tests.iframeFlowReparent.authoritative.emittedAfter, 'emitted HTML order did not persist the flow move');
    assert(
      result.tests.iframeFlowReparent.authoritative.renderedAfter,
      `persistent iframe order did not match emitted flow order: ${JSON.stringify(result.tests.iframeFlowReparent.authoritative)}`,
    );

    const horizontalABox = await frame.locator('.sheet-horizontal-flow-a').boundingBox();
    const horizontalBBox = await frame.locator('.sheet-horizontal-flow-b').boundingBox();
    assert(horizontalABox && horizontalBBox, 'synthetic horizontal flow targets are missing');
    await page.mouse.move(horizontalABox.x + horizontalABox.width / 2, horizontalABox.y + horizontalABox.height / 2);
    await page.mouse.down();
    await page.mouse.move(horizontalBBox.x + horizontalBBox.width * 0.08, horizontalBBox.y + horizontalBBox.height / 2, { steps: 4 });
    await page.waitForTimeout(40);
    const horizontalBefore = await page.evaluate(() => {
      const overlay = document.querySelector('[data-testid="iframe-edit-drop-overlay"]');
      return {
        mode: overlay?.getAttribute('data-r20-drop-mode') ?? null,
        axis: overlay?.getAttribute('data-r20-drop-axis') ?? null,
        width: overlay ? Number.parseFloat(getComputedStyle(overlay).width) : null,
        height: overlay ? Number.parseFloat(getComputedStyle(overlay).height) : null,
      };
    });
    await page.mouse.move(horizontalBBox.x + horizontalBBox.width * 0.92, horizontalBBox.y + horizontalBBox.height / 2, { steps: 6 });
    await page.waitForTimeout(40);
    const horizontalAfter = await page.evaluate(() => {
      const overlay = document.querySelector('[data-testid="iframe-edit-drop-overlay"]');
      return {
        mode: overlay?.getAttribute('data-r20-drop-mode') ?? null,
        axis: overlay?.getAttribute('data-r20-drop-axis') ?? null,
        width: overlay ? Number.parseFloat(getComputedStyle(overlay).width) : null,
        height: overlay ? Number.parseFloat(getComputedStyle(overlay).height) : null,
      };
    });
    await page.mouse.up();
    await page.waitForTimeout(700);
    const horizontalOrder = await page.evaluate(({ movingId, targetId, parentId }) => {
      const graph = window.__perfHook.getLayerSnapshot('html');
      const moving = graph.find((node) => node.id === movingId);
      const target = graph.find((node) => node.id === targetId);
      const emitted = window.__perfHook.getEmitContent().html;
      return {
        movingParent: moving?.layerParentId ?? null,
        targetParent: target?.layerParentId ?? null,
        movingPrevious: moving?.layerPreviousId ?? null,
        emittedAfter: emitted.indexOf(`data-r20-block-id="${movingId}"`) > emitted.indexOf(`data-r20-block-id="${targetId}"`),
        expectedParent: parentId,
      };
    }, {
      movingId: ids.horizontalFlowAId,
      targetId: ids.horizontalFlowBId,
      parentId: ids.horizontalFlowId,
    });
    result.tests.iframeHorizontalFlow = {
      before: horizontalBefore,
      after: horizontalAfter,
      order: horizontalOrder,
    };
    assert(
      horizontalBefore.mode === 'before'
        && horizontalBefore.axis === 'x'
        && Number.isFinite(horizontalBefore.width)
        && horizontalBefore.width <= 12
        && Number.isFinite(horizontalBefore.height)
        && horizontalBefore.height > 12,
      `horizontal before indicator did not use the left vertical edge: ${JSON.stringify(horizontalBefore)}`,
    );
    assert(
      horizontalAfter.mode === 'after'
        && horizontalAfter.axis === 'x'
        && Number.isFinite(horizontalAfter.width)
        && horizontalAfter.width <= 12
        && Number.isFinite(horizontalAfter.height)
        && horizontalAfter.height > 12,
      `horizontal after indicator did not use the right vertical edge: ${JSON.stringify(horizontalAfter)}`,
    );
    assert(
      horizontalOrder.movingParent === horizontalOrder.expectedParent
        && horizontalOrder.targetParent === horizontalOrder.expectedParent
        && horizontalOrder.movingPrevious === ids.horizontalFlowBId
        && horizontalOrder.emittedAfter,
      `horizontal flow order did not persist: ${JSON.stringify(horizontalOrder)}`,
    );

    const multiFlowIds = {
      aId: ids.rowBId,
      bId: ids.rowAId,
      cId: ids.layoutProofCId,
      sourceId: ids.frameId,
      targetId: ids.layoutProofId,
    };
    await layerSearch.fill(multiFlowIds.aId);
    const multiFlowARow = page.locator(
      `[data-testid="edit-layer-row"][data-r20-block-id="${multiFlowIds.aId}"]`,
    );
    await multiFlowARow.click();
    await layerSearch.fill(multiFlowIds.bId);
    const multiFlowBRow = page.locator(
      `[data-testid="edit-layer-row"][data-r20-block-id="${multiFlowIds.bId}"]`,
    );
    await multiFlowBRow.click({ modifiers: ['Control'] });
    await layerSearch.fill('');
    await frame.waitForFunction(({ aId, bId }) => [aId, bId].every((blockId) => (
      document.querySelector(`[data-r20-block-id="${CSS.escape(blockId)}"]`)
        ?.getAttribute('data-r20-selected') === '1'
    )), multiFlowIds);
    await page.evaluate(() => {
      window.__r20MultiFlowHits = [];
      window.addEventListener('message', (event) => {
        if (event.data?.type !== 'r20:edit-hit') return;
        window.__r20MultiFlowHits.push({
          phase: event.data.phase,
          subjectBlockId: event.data.subject?.blockId ?? null,
          selection: Array.isArray(event.data.selection)
            ? event.data.selection.map((item) => item.geometry?.blockId ?? null)
            : [],
        });
      });
    });
    await frame.evaluate(() => {
      window.__r20MultiFlowTargets = [];
      window.addEventListener('message', (event) => {
        if (event.data?.type !== 'r20:edit-flow-target') return;
        window.__r20MultiFlowTargets.push({
          subjectBlockId: event.data.subjectBlockId ?? null,
          subjectBlockIds: Array.isArray(event.data.subjectBlockIds) ? event.data.subjectBlockIds : [],
          placement: event.data.placement ?? null,
        });
      });
    });

    const readMultiFlowFrame = () => frame.evaluate((flowIds) => {
      const byId = (blockId) => document.querySelector(
        `[data-r20-block-id="${CSS.escape(blockId)}"]`,
      );
      const a = byId(flowIds.aId);
      const b = byId(flowIds.bId);
      const c = byId(flowIds.cId);
      const source = byId(flowIds.sourceId);
      const target = byId(flowIds.targetId);
      const relevantIds = [flowIds.aId, flowIds.bId, flowIds.cId];
      const nodeState = (node) => {
        const rect = node?.getBoundingClientRect();
        return {
          parentId: node?.parentElement?.getAttribute('data-r20-block-id') ?? null,
          previousId: node?.previousElementSibling?.getAttribute('data-r20-block-id') ?? null,
          left: rect?.left ?? null,
          top: rect?.top ?? null,
          transform: node instanceof HTMLElement ? node.style.transform : null,
          transition: node instanceof HTMLElement ? node.style.transition : null,
          willChange: node instanceof HTMLElement ? node.style.willChange : null,
          selected: node?.getAttribute('data-r20-selected') === '1',
        };
      };
      return {
        a: nodeState(a),
        b: nodeState(b),
        c: nodeState(c),
        sourceChildren: source
          ? Array.from(source.children)
              .map((node) => node.getAttribute('data-r20-block-id'))
              .filter((blockId) => relevantIds.includes(blockId))
          : [],
        targetChildren: target
          ? Array.from(target.children)
              .map((node) => node.getAttribute('data-r20-block-id'))
              .filter((blockId) => relevantIds.includes(blockId))
          : [],
        applyMode: document.body.getAttribute('data-r20-last-apply-mode'),
        flowCheck: document.body.getAttribute('data-r20-optimistic-flow-check'),
        fastPatchCount: Number(document.body.getAttribute('data-r20-optimistic-flow-fast-patches') || 0),
      };
    }, multiFlowIds);
    const readMultiFlowModel = () => page.evaluate((flowIds) => {
      const graph = window.__perfHook.getLayerSnapshot('html');
      const find = (blockId) => graph.find((node) => node.id === blockId);
      const emitted = window.__perfHook.getEmitContent().html;
      const aIndex = emitted.indexOf(`data-r20-block-id="${flowIds.aId}"`);
      const bIndex = emitted.indexOf(`data-r20-block-id="${flowIds.bId}"`);
      const cIndex = emitted.indexOf(`data-r20-block-id="${flowIds.cId}"`);
      return {
        aParent: find(flowIds.aId)?.layerParentId ?? null,
        bParent: find(flowIds.bId)?.layerParentId ?? null,
        cParent: find(flowIds.cId)?.layerParentId ?? null,
        aPrevious: find(flowIds.aId)?.layerPreviousId ?? null,
        bPrevious: find(flowIds.bId)?.layerPreviousId ?? null,
        cPrevious: find(flowIds.cId)?.layerPreviousId ?? null,
        emittedOrder: [aIndex, bIndex, cIndex],
      };
    }, multiFlowIds);
    const multiFlowBefore = await readMultiFlowFrame();
    const multiFlowABox = await frame.locator('.sheet-row-b').boundingBox();
    const multiFlowCBox = await frame.locator('.sheet-layout-proof-c').boundingBox();
    assert(multiFlowABox && multiFlowCBox, 'multi-selection Flow fixtures are missing');
    await page.mouse.move(
      multiFlowABox.x + multiFlowABox.width / 2,
      multiFlowABox.y + multiFlowABox.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      multiFlowCBox.x + multiFlowCBox.width * 0.08,
      multiFlowCBox.y + multiFlowCBox.height * 0.08,
      { steps: 8 },
    );
    await page.waitForTimeout(50);
    const multiFlowDuring = await readMultiFlowFrame();
    const multiFlowIndicator = await page.evaluate(() => {
      const overlay = document.querySelector('[data-testid="iframe-edit-drop-overlay"]');
      return overlay?.getAttribute('data-r20-drop-mode') ?? null;
    });
    assert(
      Math.abs(
        (multiFlowDuring.a.left - multiFlowBefore.a.left)
        - (multiFlowDuring.b.left - multiFlowBefore.b.left),
      ) <= 1
        && Math.abs(
          (multiFlowDuring.a.top - multiFlowBefore.a.top)
          - (multiFlowDuring.b.top - multiFlowBefore.b.top),
        ) <= 1,
      `selected Flow layers did not move together during drag: ${JSON.stringify({ multiFlowBefore, multiFlowDuring })}`,
    );
    assert(multiFlowIndicator === 'before', `multi-selection Flow target was not before C: ${multiFlowIndicator}`);
    await page.mouse.up();
    try {
      await page.waitForFunction(({ aId, bId, cId, targetId }) => {
        const graph = window.__perfHook.getLayerSnapshot('html');
        const find = (blockId) => graph.find((node) => node.id === blockId);
        return find(aId)?.layerParentId === targetId
          && find(bId)?.layerParentId === targetId
          && find(cId)?.layerParentId === targetId
          && find(bId)?.layerPreviousId === aId
          && find(cId)?.layerPreviousId === bId;
      }, multiFlowIds, { timeout: 10000 });
    } catch (error) {
      const failedModel = await readMultiFlowModel();
      const failedFrame = await readMultiFlowFrame();
      const failedMessages = await page.evaluate(() => window.__r20MultiFlowHits ?? []);
      const failedTargets = await frame.evaluate(() => window.__r20MultiFlowTargets ?? []);
      throw new Error(`multi-selection Flow commit timed out: ${JSON.stringify({ failedModel, failedFrame, failedMessages, failedTargets })}`, {
        cause: error,
      });
    }
    await frame.waitForFunction(({ aId, bId, cId, targetId }) => {
      const target = document.querySelector(`[data-r20-block-id="${CSS.escape(targetId)}"]`);
      return Array.from(target?.children ?? []).map((node) => (
        node.getAttribute('data-r20-block-id')
      )).filter((blockId) => [aId, bId, cId].includes(blockId)).join('|') === [aId, bId, cId].join('|');
    }, multiFlowIds, { timeout: 10000 });
    const multiFlowAfter = await readMultiFlowFrame();
    const multiFlowModelAfter = await readMultiFlowModel();
    assert(
      multiFlowModelAfter.aParent === multiFlowIds.targetId
        && multiFlowModelAfter.bParent === multiFlowIds.targetId
        && multiFlowModelAfter.cParent === multiFlowIds.targetId
        && multiFlowModelAfter.bPrevious === multiFlowIds.aId
        && multiFlowModelAfter.cPrevious === multiFlowIds.bId
        && multiFlowModelAfter.emittedOrder[0] >= 0
        && multiFlowModelAfter.emittedOrder[0] < multiFlowModelAfter.emittedOrder[1]
        && multiFlowModelAfter.emittedOrder[1] < multiFlowModelAfter.emittedOrder[2],
      `multi-selection Flow model or emitted order diverged: ${JSON.stringify(multiFlowModelAfter)}`,
    );
    assert(
      multiFlowAfter.a.selected
        && multiFlowAfter.b.selected
        && multiFlowAfter.a.transform === ''
        && multiFlowAfter.b.transform === ''
        && multiFlowAfter.a.transition === ''
        && multiFlowAfter.b.transition === ''
        && multiFlowAfter.a.willChange === ''
        && multiFlowAfter.b.willChange === '',
      `multi-selection Flow commit left selection or temporary styles behind: ${JSON.stringify(multiFlowAfter)}`,
    );

    assert(await historyUndoButton.isEnabled(), 'multi-selection Flow move did not create an undo step');
    await historyUndoButton.click();
    await page.waitForFunction(({ aId, bId, sourceId }) => {
      const graph = window.__perfHook.getLayerSnapshot('html');
      const find = (blockId) => graph.find((node) => node.id === blockId);
      return find(aId)?.layerParentId === sourceId
        && find(bId)?.layerParentId === sourceId
        && find(bId)?.layerPreviousId === aId;
    }, multiFlowIds, { timeout: 10000 });
    const multiFlowUndo = await readMultiFlowModel();
    assert(
      multiFlowUndo.aParent === multiFlowIds.sourceId
        && multiFlowUndo.bParent === multiFlowIds.sourceId
        && multiFlowUndo.bPrevious === multiFlowIds.aId
        && multiFlowUndo.cParent === multiFlowIds.targetId,
      `one undo did not restore the complete Flow selection: ${JSON.stringify(multiFlowUndo)}`,
    );
    assert(await historyRedoButton.isEnabled(), 'multi-selection Flow move did not create a redo step');
    await historyRedoButton.click();
    await page.waitForFunction(({ aId, bId, cId, targetId }) => {
      const graph = window.__perfHook.getLayerSnapshot('html');
      const find = (blockId) => graph.find((node) => node.id === blockId);
      return find(aId)?.layerParentId === targetId
        && find(bId)?.layerParentId === targetId
        && find(bId)?.layerPreviousId === aId
        && find(cId)?.layerPreviousId === bId;
    }, multiFlowIds, { timeout: 10000 });
    const multiFlowRedo = await readMultiFlowFrame();
    await page.click('[data-testid="main-mode-preview"]');
    await frame.waitForFunction(() => document.body?.getAttribute('data-r20-edit-mode') === '0');
    const multiFlowPreview = await readMultiFlowFrame();
    await page.click('[data-testid="preview-exit-edit"]');
    await frame.waitForFunction(() => document.body?.getAttribute('data-r20-edit-mode') === '1');
    const multiFlowEditAgain = await readMultiFlowFrame();
    assert(
      multiFlowRedo.targetChildren.join('|') === [multiFlowIds.aId, multiFlowIds.bId, multiFlowIds.cId].join('|')
        && multiFlowPreview.targetChildren.join('|') === multiFlowRedo.targetChildren.join('|')
        && multiFlowEditAgain.targetChildren.join('|') === multiFlowRedo.targetChildren.join('|'),
      `multi-selection Flow order diverged across Preview/Edit: ${JSON.stringify({ multiFlowRedo, multiFlowPreview, multiFlowEditAgain })}`,
    );
    result.tests.iframeMultiFlow = {
      before: multiFlowBefore,
      during: multiFlowDuring,
      after: multiFlowAfter,
      modelAfter: multiFlowModelAfter,
      undo: multiFlowUndo,
      redo: multiFlowRedo,
      preview: multiFlowPreview,
      editAgain: multiFlowEditAgain,
    };

    await historyUndoButton.click();
    await page.waitForFunction(({ aId, bId, sourceId }) => {
      const graph = window.__perfHook.getLayerSnapshot('html');
      const find = (blockId) => graph.find((node) => node.id === blockId);
      return find(aId)?.layerParentId === sourceId
        && find(bId)?.layerParentId === sourceId
        && find(bId)?.layerPreviousId === aId;
    }, multiFlowIds, { timeout: 10000 });
    result.tests.iframeMultiFlow.restoredForLaterTests = await readMultiFlowFrame();

    await layerSearch.fill(ids.outsideId);
    await page.locator(
      `[data-testid="edit-layer-row"][data-r20-block-id="${ids.outsideId}"]`,
    ).click();
    await frame.waitForFunction((outsideId) => {
      const selected = Array.from(document.querySelectorAll('[data-r20-selected="1"]'));
      return selected.length === 1
        && selected[0].getAttribute('data-r20-block-id') === outsideId;
    }, ids.outsideId);
    await layerSearch.fill(ids.rowBId);
    const rowBLayerAfterMultiFlow = page.locator(
      `[data-testid="edit-layer-row"][data-r20-block-id="${ids.rowBId}"]`,
    );
    await rowBLayerAfterMultiFlow.click();
    await layerSearch.fill('');
    await frame.waitForFunction((rowBId) => {
      const selected = Array.from(document.querySelectorAll('[data-r20-selected="1"]'));
      return selected.length === 1
        && selected[0].getAttribute('data-r20-block-id') === rowBId;
    }, ids.rowBId);

    const outsideBox = await frame.locator('.sheet-outside').boundingBox();
    const rowBBoxAfterFlow = await frame.locator('.sheet-row-b').boundingBox();
    assert(outsideBox && rowBBoxAfterFlow, 'synthetic extraction targets are missing');
    await page.mouse.move(rowBBoxAfterFlow.x + rowBBoxAfterFlow.width / 2, rowBBoxAfterFlow.y + rowBBoxAfterFlow.height / 2);
    await page.mouse.down();
    await page.mouse.move(outsideBox.x + outsideBox.width / 2, outsideBox.y + outsideBox.height * 0.92, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(700);
    result.tests.iframeFlowExtraction = await page.evaluate(({ rowBId, outsideId, frameId }) => {
      const graph = window.__perfHook.getLayerSnapshot('html');
      const moving = graph.find((node) => node.id === rowBId);
      const outside = graph.find((node) => node.id === outsideId);
      const frame = graph.find((node) => node.id === frameId);
      return {
        movingParent: moving?.layerParentId ?? null,
        movingPrevious: moving?.layerPreviousId ?? null,
        outsideParent: outside?.layerParentId ?? null,
        frameChildCount: frame?.childCount ?? null,
        emittedOutsideIndex: window.__perfHook.getEmitContent().html.indexOf(`data-r20-block-id="${outsideId}"`),
        emittedRowBIndex: window.__perfHook.getEmitContent().html.indexOf(`data-r20-block-id="${rowBId}"`),
      };
    }, ids);
    assert(result.tests.iframeFlowExtraction.movingParent === null, 'iframe flow extraction did not move the child to root');
    assert(result.tests.iframeFlowExtraction.movingPrevious === ids.outsideId, 'iframe flow extraction did not preserve root order');
    assert(result.tests.iframeFlowExtraction.outsideParent === null, 'extraction target unexpectedly became nested');
    assert(
      result.tests.iframeFlowExtraction.emittedRowBIndex > result.tests.iframeFlowExtraction.emittedOutsideIndex,
      'emitted HTML did not preserve extracted root order',
    );

    await page.click('[data-testid="edit-placement-free"]');
    const frameBoxForFreeDrop = await frame.locator('.sheet-frame').boundingBox();
    const rowBBoxForFreeDrop = await frame.locator('.sheet-row-b').boundingBox();
    assert(frameBoxForFreeDrop && rowBBoxForFreeDrop, 'synthetic free-placement targets are missing');
    await page.mouse.move(rowBBoxForFreeDrop.x + rowBBoxForFreeDrop.width / 2, rowBBoxForFreeDrop.y + rowBBoxForFreeDrop.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      frameBoxForFreeDrop.x + frameBoxForFreeDrop.width * 0.78,
      frameBoxForFreeDrop.y + frameBoxForFreeDrop.height * 0.78,
      { steps: 6 },
    );
    await page.mouse.up();
    await page.waitForTimeout(700);
    result.tests.iframeFreeReparent = await frame.evaluate(({ rowBId, frameId }) => {
      const row = document.querySelector(`[data-r20-block-id="${CSS.escape(rowBId)}"]`);
      const parent = document.querySelector(`[data-r20-block-id="${CSS.escape(frameId)}"]`);
      const parentStyle = parent ? getComputedStyle(parent) : null;
      const rowStyle = row ? getComputedStyle(row) : null;
      const className = row?.getAttribute('class') || '';
      return {
        parentId: row?.parentElement?.closest('[data-r20-block-id]')?.getAttribute('data-r20-block-id') ?? null,
        position: rowStyle?.position ?? null,
        left: rowStyle ? Number.parseFloat(rowStyle.left) : null,
        top: rowStyle ? Number.parseFloat(rowStyle.top) : null,
        parentPosition: parentStyle?.position ?? null,
        className,
        hasBlock: Boolean(row),
        hasParent: Boolean(parent),
      };
    }, { rowBId: ids.rowBId, frameId: ids.frameId });
    result.tests.iframeFreeReparent.emitted = await page.evaluate(({ rowBId, frameId, className }) => {
      const emit = window.__perfHook.getEmitContent();
      const rowIndex = emit.html.indexOf(`data-r20-block-id="${rowBId}"`);
      const parentIndex = emit.html.indexOf(`data-r20-block-id="${frameId}"`);
      const escaped = className.split(/\s+/).filter(Boolean).map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      const cssHasAbsolute = escaped.some((name) => new RegExp(`\\.${name}\\s*\\{[^}]*position\\s*:\\s*absolute`, 'i').test(emit.css));
      return { rowIndex, parentIndex, cssHasAbsolute, htmlNested: rowIndex > parentIndex };
    }, { rowBId: ids.rowBId, frameId: ids.frameId, className: result.tests.iframeFreeReparent.className });
    assert(result.tests.iframeFreeReparent.hasBlock, 'iframe free placement lost the moved node');
    assert(result.tests.iframeFreeReparent.parentId === ids.frameId, 'iframe free placement did not nest in the target frame');
    assert(result.tests.iframeFreeReparent.position === 'absolute', 'iframe free placement did not become absolute');
    assert(['relative', 'absolute', 'fixed', 'sticky'].includes(result.tests.iframeFreeReparent.parentPosition), 'iframe free placement parent is not a containing block');
    assert(result.tests.iframeFreeReparent.emitted.htmlNested, 'iframe free placement emitted the wrong DOM order');
    assert(result.tests.iframeFreeReparent.emitted.cssHasAbsolute, 'iframe free placement emitted no managed absolute CSS');

    result.tests.canvasWidgetDrop = await frame.evaluate(() => {
      const target = document.querySelector('.sheet-frame');
      if (!target) return { dispatched: false, reason: 'missing frame' };
      const rect = target.getBoundingClientRect();
      const dataTransfer = new DataTransfer();
      dataTransfer.setData('application/x-r20-friendly-widget', JSON.stringify({ id: 'text-input' }));
      const init = {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
      };
      const dragover = new DragEvent('dragover', init);
      Object.defineProperty(dragover, 'dataTransfer', { value: dataTransfer });
      target.dispatchEvent(dragover);
      const drop = new DragEvent('drop', init);
      Object.defineProperty(drop, 'dataTransfer', { value: dataTransfer });
      target.dispatchEvent(drop);
      return { dispatched: true, dragoverPrevented: dragover.defaultPrevented, dropPrevented: drop.defaultPrevented };
    });
    await page.waitForTimeout(500);
    result.tests.canvasWidgetDrop.created = await frame.evaluate(() => {
      const inputs = [...document.querySelectorAll('[data-r20-block-id] input[data-r20-block-id]')];
      const nested = inputs.find((input) => input.closest('.sheet-frame'));
      return {
        count: inputs.length,
        nested: Boolean(nested),
        nestedAbsolute: /position\s*:\s*absolute/i.test(nested?.getAttribute('style') ?? ''),
      };
    });
    assert(result.tests.canvasWidgetDrop.created.nested, 'widget did not enter the frame');
    assert(!result.tests.canvasWidgetDrop.created.nestedAbsolute, 'flow widget unexpectedly became absolute');

    await page.click('[data-testid="edit-placement-flow"]');
    const blockDropBefore = await frame.evaluate(() => [...document.querySelectorAll('input[data-r20-block-id]')]
      .map((node) => node.getAttribute('data-r20-block-id'))
      .filter(Boolean));
    result.tests.canvasBlockDrop = await frame.evaluate(() => {
      const target = document.querySelector('.sheet-frame');
      if (!target) return { dispatched: false, reason: 'missing frame' };
      const rect = target.getBoundingClientRect();
      const dataTransfer = new DataTransfer();
      dataTransfer.setData('application/x-r20-block-type', 'r20_text_input');
      const init = {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
      };
      const dragover = new DragEvent('dragover', init);
      Object.defineProperty(dragover, 'dataTransfer', { value: dataTransfer });
      target.dispatchEvent(dragover);
      const drop = new DragEvent('drop', init);
      Object.defineProperty(drop, 'dataTransfer', { value: dataTransfer });
      target.dispatchEvent(drop);
      return {
        dispatched: true,
        dragoverPrevented: dragover.defaultPrevented,
        dropPrevented: drop.defaultPrevented,
      };
    });
    await page.waitForTimeout(500);
    result.tests.canvasBlockDrop.created = await frame.evaluate((beforeIds) => {
      const created = [...document.querySelectorAll('input[data-r20-block-id]')]
        .find((node) => !beforeIds.includes(node.getAttribute('data-r20-block-id')));
      if (!created) return { created: false };
      const block = created.closest('[data-r20-block-id]') ?? created;
      return {
        created: true,
        position: getComputedStyle(block).position,
        parentBlockId: block.parentElement?.closest('[data-r20-block-id]')?.getAttribute('data-r20-block-id') ?? null,
        hasClass: Boolean(block.getAttribute('class')),
      };
    }, blockDropBefore);
    assert(result.tests.canvasBlockDrop.dispatched, 'block gallery drop did not dispatch');
    assert(result.tests.canvasBlockDrop.dragoverPrevented, 'iframe did not accept block gallery dragover');
    assert(result.tests.canvasBlockDrop.dropPrevented, 'iframe did not accept block gallery drop');
    assert(result.tests.canvasBlockDrop.created.created, 'block gallery drop did not create a block');
    assert(
      result.tests.canvasBlockDrop.created.parentBlockId === ids.frameId,
      `block gallery drop did not enter the frame: ${JSON.stringify(result.tests.canvasBlockDrop)}`,
    );
    assert(result.tests.canvasBlockDrop.created.position !== 'absolute', 'flow block gallery drop became absolute');

    await page.click('[data-testid="edit-placement-free"]');
    const freeBlockDropBefore = await frame.evaluate(() => [...document.querySelectorAll('input[data-r20-block-id]')]
      .map((node) => node.getAttribute('data-r20-block-id'))
      .filter(Boolean));
    const freeBlockDropPoint = await frame.evaluate(() => {
      const target = document.querySelector('.sheet-frame');
      if (!target) return null;
      const rect = target.getBoundingClientRect();
      return { x: rect.left + rect.width * 0.72, y: rect.top + rect.height * 0.72 };
    });
    assert(freeBlockDropPoint, 'free block gallery drop target is missing');
    await frame.evaluate(({ x, y }) => {
      const target = document.querySelector('.sheet-frame');
      if (!target) return;
      const dataTransfer = new DataTransfer();
      dataTransfer.setData('application/x-r20-block-type', 'r20_text_input');
      const init = { bubbles: true, cancelable: true, clientX: x, clientY: y };
      const dragover = new DragEvent('dragover', init);
      Object.defineProperty(dragover, 'dataTransfer', { value: dataTransfer });
      target.dispatchEvent(dragover);
      const drop = new DragEvent('drop', init);
      Object.defineProperty(drop, 'dataTransfer', { value: dataTransfer });
      target.dispatchEvent(drop);
    }, freeBlockDropPoint);
    await page.waitForTimeout(500);
    result.tests.freeCanvasBlockDrop = await frame.evaluate((beforeIds) => {
      const created = [...document.querySelectorAll('input[data-r20-block-id]')]
        .find((node) => !beforeIds.includes(node.getAttribute('data-r20-block-id')));
      if (!created) return { created: false };
      const block = created.closest('[data-r20-block-id]') ?? created;
      const style = getComputedStyle(block);
      return {
        created: true,
        position: style.position,
        parentBlockId: block.parentElement?.closest('[data-r20-block-id]')?.getAttribute('data-r20-block-id') ?? null,
        left: Number.parseFloat(style.left),
        top: Number.parseFloat(style.top),
      };
    }, freeBlockDropBefore);
    assert(result.tests.freeCanvasBlockDrop.created, 'free block gallery drop did not create a block');
    assert(result.tests.freeCanvasBlockDrop.position === 'absolute', 'free block gallery drop did not become absolute');
    assert(result.tests.freeCanvasBlockDrop.parentBlockId === ids.frameId, 'free block gallery drop lost its frame parent');
    assert(Number.isFinite(result.tests.freeCanvasBlockDrop.left), 'free block gallery drop did not persist left');
    assert(Number.isFinite(result.tests.freeCanvasBlockDrop.top), 'free block gallery drop did not persist top');

    // Free placement must honor the visible target filter. Hover the top edge
    // of a flow row, where the structural resolver would normally say
    // "before"; in free mode that hidden target must create a root absolute
    // widget instead of silently reordering the row.
    await page.click('[data-testid="edit-placement-free"]');
    const freeWidgetTarget = await frame.locator('.sheet-row-a').boundingBox();
    assert(freeWidgetTarget, 'free widget target missing');
    const freeWidgetBefore = await frame.evaluate(() => [...new Set(
      [...document.querySelectorAll('input[data-r20-block-id]')]
        .map((node) => node.getAttribute('data-r20-block-id'))
        .filter(Boolean),
    )]);
    await frame.evaluate(({ x, y }) => {
      const target = document.querySelector('.sheet-row-a');
      if (!target) return;
      const dataTransfer = new DataTransfer();
      dataTransfer.setData('application/x-r20-friendly-widget', JSON.stringify({ id: 'text-input' }));
      const init = { bubbles: true, cancelable: true, clientX: x, clientY: y };
      const dragover = new DragEvent('dragover', init);
      Object.defineProperty(dragover, 'dataTransfer', { value: dataTransfer });
      target.dispatchEvent(dragover);
      const drop = new DragEvent('drop', init);
      Object.defineProperty(drop, 'dataTransfer', { value: dataTransfer });
      target.dispatchEvent(drop);
    }, {
      x: freeWidgetTarget.x + freeWidgetTarget.width / 2,
      y: freeWidgetTarget.y + 1,
    });
    await page.waitForTimeout(500);
    result.tests.freeCanvasWidgetDrop = await frame.evaluate((beforeIds) => {
      const created = [...document.querySelectorAll('input[data-r20-block-id]')]
        .find((node) => !beforeIds.includes(node.getAttribute('data-r20-block-id')));
      if (!created) return { created: false };
      const block = created.closest('[data-r20-block-id]') ?? created;
      return {
        created: true,
        position: getComputedStyle(block).position,
        parentBlockId: block.parentElement?.getAttribute('data-r20-block-id') ?? null,
        hasLeft: Boolean(block.style.left),
        hasTop: Boolean(block.style.top),
      };
    }, freeWidgetBefore);
    assert(result.tests.freeCanvasWidgetDrop.created, 'free placement widget was not created');
    assert(result.tests.freeCanvasWidgetDrop.position === 'absolute', 'free placement widget became flow content');
    assert(result.tests.freeCanvasWidgetDrop.parentBlockId === null, 'free placement widget silently entered a hidden structural target');

    result.tests.layerAutoScroll = await page.evaluate(async () => {
      const scroll = document.querySelector('[data-testid="edit-layer-scroll"]');
      if (!(scroll instanceof HTMLElement)) return { found: false };
      const moving = scroll.querySelector('[data-testid="edit-layer-row"]');
      if (!(moving instanceof HTMLElement)) return { found: false, reason: 'missing draggable layer row' };
      scroll.scrollTop = 0;
      const rect = scroll.getBoundingClientRect();
      const dataTransfer = new DataTransfer();
      const movingId = moving.getAttribute('data-r20-block-id') || 'synthetic-layer-drag';
      dataTransfer.setData('application/x-r20-layer-block', movingId);
      const dragstart = new DragEvent('dragstart', { bubbles: true, cancelable: true });
      Object.defineProperty(dragstart, 'dataTransfer', { value: dataTransfer });
      moving.dispatchEvent(dragstart);
      const dragover = new DragEvent('dragover', {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.bottom - 2,
      });
      Object.defineProperty(dragover, 'dataTransfer', { value: dataTransfer });
      moving.dispatchEvent(dragover);
      await new Promise((resolve) => setTimeout(resolve, 180));
      const movedTop = scroll.scrollTop;
      const drop = new DragEvent('drop', { bubbles: true, cancelable: true });
      Object.defineProperty(drop, 'dataTransfer', { value: dataTransfer });
      scroll.dispatchEvent(drop);
      const staleDraggingBlockAfterDrop = document.body.dataset.r20LayerDraggingBlock ?? null;
      const dragend = new DragEvent('dragend', { bubbles: true, cancelable: true });
      Object.defineProperty(dragend, 'dataTransfer', { value: dataTransfer });
      moving.dispatchEvent(dragend);
      await new Promise((resolve) => setTimeout(resolve, 100));
      const stoppedTop = scroll.scrollTop;
      scroll.scrollTop = 0;
      scroll.dispatchEvent(new Event('scroll', { bubbles: true }));
      return {
        found: true,
        overflow: scroll.scrollHeight > scroll.clientHeight,
        movedTop,
        stoppedTop,
        staleDraggingBlockAfterDrop,
      };
    });
    assert(result.tests.layerAutoScroll.found, 'layer scroll surface is missing');
    assert(result.tests.layerAutoScroll.overflow, 'layer smoke list does not overflow');
    assert(
      result.tests.layerAutoScroll.movedTop > 0,
      `layer list did not auto-scroll near its lower edge: ${JSON.stringify(result.tests.layerAutoScroll)}`,
    );
    assert(
      result.tests.layerAutoScroll.stoppedTop === result.tests.layerAutoScroll.movedTop,
      `layer list kept auto-scrolling after drop: ${JSON.stringify(result.tests.layerAutoScroll)}`,
    );
    assert(
      result.tests.layerAutoScroll.staleDraggingBlockAfterDrop === null,
      `layer drag identity survived a virtualized drop: ${JSON.stringify(result.tests.layerAutoScroll)}`,
    );

    const layerKeyboardSourceBefore = await page.evaluate(() => window.__perfHook.getEmitContent());
    const firstKeyboardLayer = page.locator('[data-testid="edit-layer-row"]').first();
    await firstKeyboardLayer.focus();
    await firstKeyboardLayer.press('Enter');
    const layerKeyboardStart = await page.evaluate(() => {
      const scroll = document.querySelector('[data-testid="edit-layer-scroll"]');
      const active = document.activeElement;
      if (!(scroll instanceof HTMLElement) || !(active instanceof HTMLElement)) {
        return { found: false };
      }
      scroll.scrollTop = 0;
      scroll.dispatchEvent(new Event('scroll', { bubbles: true }));
      return {
        found: true,
        id: active.getAttribute('data-r20-block-id'),
        count: Number(scroll.dataset.r20LayerCount ?? '0'),
        scrollTop: scroll.scrollTop,
      };
    });
    assert(layerKeyboardStart.found && layerKeyboardStart.id, 'layer keyboard start row is missing');
    assert(layerKeyboardStart.count > 2, 'layer keyboard smoke needs at least three visible rows');
    await page.keyboard.press('Tab');
    await page.waitForFunction((previousId) => {
      const active = document.activeElement;
      return active instanceof HTMLElement
        && active.matches('[data-testid="edit-layer-row"]')
        && active.getAttribute('data-r20-block-id') !== previousId;
    }, layerKeyboardStart.id);
    const layerKeyboardNextId = await page.evaluate(() => (
      document.activeElement instanceof HTMLElement
        ? document.activeElement.getAttribute('data-r20-block-id')
        : null
    ));
    await page.keyboard.press('Shift+Tab');
    await page.waitForFunction((expectedId) => (
      document.activeElement instanceof HTMLElement
      && document.activeElement.getAttribute('data-r20-block-id') === expectedId
    ), layerKeyboardStart.id);

    const keyboardSteps = Math.min(layerKeyboardStart.count - 1, 12);
    const visitedLayerIds = [layerKeyboardStart.id];
    for (let step = 0; step < keyboardSteps; step += 1) {
      const previousId = visitedLayerIds[visitedLayerIds.length - 1];
      await page.keyboard.press('Tab');
      await page.waitForFunction((beforeId) => {
        const active = document.activeElement;
        return active instanceof HTMLElement
          && active.matches('[data-testid="edit-layer-row"]')
          && active.getAttribute('data-r20-block-id') !== beforeId;
      }, previousId);
      visitedLayerIds.push(await page.evaluate(() => (
        document.activeElement instanceof HTMLElement
          ? document.activeElement.getAttribute('data-r20-block-id')
          : null
      )));
    }
    const layerKeyboardSourceAfter = await page.evaluate(() => window.__perfHook.getEmitContent());
    result.tests.layerKeyboardNavigation = await page.evaluate(({ firstId, nextId, visitedIds }) => {
      const scroll = document.querySelector('[data-testid="edit-layer-scroll"]');
      const active = document.activeElement;
      if (!(scroll instanceof HTMLElement) || !(active instanceof HTMLElement)) {
        return { found: false };
      }
      const activeRect = active.getBoundingClientRect();
      const scrollRect = scroll.getBoundingClientRect();
      return {
        found: true,
        firstId,
        nextId,
        visitedIds,
        uniqueVisited: new Set(visitedIds).size,
        scrollTop: scroll.scrollTop,
        activeId: active.getAttribute('data-r20-block-id'),
        activeRole: active.getAttribute('role'),
        activeLevel: Number(active.getAttribute('aria-level')),
        activeSelected: active.getAttribute('aria-selected'),
        activeInsideViewport: activeRect.top >= scrollRect.top - 1
          && activeRect.bottom <= scrollRect.bottom + 1,
        treeRole: scroll.getAttribute('role'),
        tabStops: [...scroll.querySelectorAll('[data-testid="edit-layer-row"]')]
          .filter((row) => row instanceof HTMLElement && row.tabIndex === 0)
          .length,
      };
    }, {
      firstId: layerKeyboardStart.id,
      nextId: layerKeyboardNextId,
      visitedIds: visitedLayerIds,
    });
    assert(result.tests.layerKeyboardNavigation.found, 'layer keyboard navigation surface is missing');
    assert(
      result.tests.layerKeyboardNavigation.nextId !== result.tests.layerKeyboardNavigation.firstId,
      `Tab did not select the next layer: ${JSON.stringify(result.tests.layerKeyboardNavigation)}`,
    );
    assert(
      result.tests.layerKeyboardNavigation.uniqueVisited === visitedLayerIds.length,
      `layer keyboard navigation repeated or skipped focus: ${JSON.stringify(result.tests.layerKeyboardNavigation)}`,
    );
    assert(
      result.tests.layerKeyboardNavigation.scrollTop > 0
        && result.tests.layerKeyboardNavigation.activeInsideViewport,
      `virtualized layer keyboard navigation did not keep focus visible: ${JSON.stringify(result.tests.layerKeyboardNavigation)}`,
    );
    assert(
      result.tests.layerKeyboardNavigation.treeRole === 'tree'
        && result.tests.layerKeyboardNavigation.activeRole === 'treeitem'
        && result.tests.layerKeyboardNavigation.activeLevel >= 1
        && result.tests.layerKeyboardNavigation.activeSelected === 'true'
        && result.tests.layerKeyboardNavigation.tabStops === 1,
      `layer tree semantics or roving tab stop are invalid: ${JSON.stringify(result.tests.layerKeyboardNavigation)}`,
    );
    assert(
      layerKeyboardSourceBefore.html === layerKeyboardSourceAfter.html
        && layerKeyboardSourceBefore.css === layerKeyboardSourceAfter.css,
      'layer keyboard navigation mutated emitted HTML or CSS',
    );

    const frameCollapseToggle = page.locator(
      `[data-testid="edit-layer-collapse-toggle"][data-r20-block-id="${ids.frameId}"]`,
    );
    assert((await frameCollapseToggle.count()) === 1, 'container layer collapse toggle is missing');
    result.tests.layerCollapse = await page.evaluate(({ frameId, childId }) => ({
      beforeRows: document.querySelectorAll('[data-testid="edit-layer-row"]').length,
      childVisibleBefore: Boolean(document.querySelector(
        `[data-testid="edit-layer-row"][data-r20-block-id="${CSS.escape(childId)}"]`,
      )),
      frameId,
      childId,
    }), { frameId: ids.frameId, childId: ids.rowAId });
    assert(
      result.tests.layerCollapse.childVisibleBefore,
      'container descendant layer was not visible before collapse',
    );
    await frameCollapseToggle.click();
    await page.waitForTimeout(150);
    result.tests.layerCollapse.collapsed = await page.evaluate(({ frameId, childId }) => {
      const toggle = document.querySelector(
        `[data-testid="edit-layer-collapse-toggle"][data-r20-block-id="${CSS.escape(frameId)}"]`,
      );
      const childRow = document.querySelector(
        `[data-testid="edit-layer-row"][data-r20-block-id="${CSS.escape(childId)}"]`,
      );
      return {
        state: toggle?.getAttribute('data-r20-layer-collapsed') ?? null,
        visibleRows: document.querySelectorAll('[data-testid="edit-layer-row"]').length,
        childVisible: Boolean(childRow),
      };
    }, { frameId: ids.frameId, childId: ids.rowAId });
    assert(result.tests.layerCollapse.collapsed.state === '1', 'container layer did not collapse');
    assert(!result.tests.layerCollapse.collapsed.childVisible, 'collapsed descendant layer is still visible');

    result.tests.layerCollapse.autoExpandedOnDrag = await page.evaluate(async ({ frameId, movingId, childId }) => {
      const target = document.querySelector(
        `[data-testid="edit-layer-row"][data-r20-block-id="${CSS.escape(frameId)}"]`,
      );
      if (!(target instanceof HTMLElement)) return { found: false };
      const rect = target.getBoundingClientRect();
      const dataTransfer = new DataTransfer();
      dataTransfer.setData('application/x-r20-layer-block', movingId);
      const dragover = new DragEvent('dragover', {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
      });
      Object.defineProperty(dragover, 'dataTransfer', { value: dataTransfer });
      target.dispatchEvent(dragover);
      await new Promise((resolve) => setTimeout(resolve, 560));
      const toggle = document.querySelector(
        `[data-testid="edit-layer-collapse-toggle"][data-r20-block-id="${CSS.escape(frameId)}"]`,
      );
      const child = document.querySelector(
        `[data-testid="edit-layer-row"][data-r20-block-id="${CSS.escape(childId)}"]`,
      );
      const dragend = new DragEvent('dragend', { bubbles: true, cancelable: true });
      Object.defineProperty(dragend, 'dataTransfer', { value: dataTransfer });
      target.dispatchEvent(dragend);
      return {
        found: true,
        state: toggle?.getAttribute('data-r20-layer-collapsed') ?? null,
        childVisible: Boolean(child),
      };
    }, { frameId: ids.frameId, movingId: ids.outsideId, childId: ids.rowAId });
    assert(result.tests.layerCollapse.autoExpandedOnDrag.found, 'collapsed drop container is missing');
    assert(
      result.tests.layerCollapse.autoExpandedOnDrag.state === '0'
        && result.tests.layerCollapse.autoExpandedOnDrag.childVisible,
      `collapsed drop container did not open on hover: ${JSON.stringify(result.tests.layerCollapse.autoExpandedOnDrag)}`,
    );
    await frameCollapseToggle.click();
    await page.waitForTimeout(150);

    const childInIframe = frame.locator(`[data-r20-block-id="${ids.rowAId}"]`).first();
    await childInIframe.click();
    await page.waitForTimeout(200);
    result.tests.layerCollapse.autoExpandedOnSelection = await page.evaluate(({ frameId, childId }) => {
      const toggle = document.querySelector(
        `[data-testid="edit-layer-collapse-toggle"][data-r20-block-id="${CSS.escape(frameId)}"]`,
      );
      const childRow = document.querySelector(
        `[data-testid="edit-layer-row"][data-r20-block-id="${CSS.escape(childId)}"]`,
      );
      return {
        state: toggle?.getAttribute('data-r20-layer-collapsed') ?? null,
        childVisible: Boolean(childRow),
        childSelected: childRow?.getAttribute('data-r20-layer-selected') === '1',
        storeSelected: window.__perfHook.getSelectedBlockId?.() ?? null,
      };
    }, { frameId: ids.frameId, childId: ids.rowAId });
    assert(
      result.tests.layerCollapse.autoExpandedOnSelection.state === '0',
      'selecting a hidden iframe child did not expand its ancestor layer',
    );
    assert(
      result.tests.layerCollapse.autoExpandedOnSelection.childVisible,
      'selected iframe child did not return to the layer tree',
    );
    assert(
      result.tests.layerCollapse.autoExpandedOnSelection.childSelected,
      'selected iframe child did not sync to the layer row',
    );

    await page.click('[data-testid="edit-placement-free"]');
    const freeTarget = await frame.locator('.sheet-row-a').boundingBox();
    assert(freeTarget, 'free placement target missing');
    await page.mouse.move(freeTarget.x + freeTarget.width / 2, freeTarget.y + freeTarget.height / 2);
    await page.mouse.down();
    await page.mouse.move(freeTarget.x + freeTarget.width / 2 + 52, freeTarget.y + freeTarget.height / 2 + 28, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(350);
    result.tests.freePlacement = await frame.evaluate((rowAId) => {
      const node = document.querySelector(`[data-r20-block-id="${CSS.escape(rowAId)}"]`);
      const style = node?.getAttribute('style') ?? '';
      return {
        id: rowAId,
        className: node?.getAttribute('class') ?? '',
        position: getComputedStyle(node).position,
        left: getComputedStyle(node).left,
        top: getComputedStyle(node).top,
        inlineStyle: style,
        hasManagedAbsolute: getComputedStyle(node).position === 'absolute',
      };
    }, ids.rowAId);
    result.tests.freePlacement.emittedManagedCss = await page.evaluate(({ blockId, className }) => {
      const emitted = window.__perfHook.getEmitContent();
      const htmlHasBlock = emitted.html.includes(`data-r20-block-id="${blockId}"`);
      const classNames = className.split(/\s+/).filter(Boolean);
      const cssHasAbsolute = classNames.some((name) =>
        new RegExp(`\\.${name.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\s*\\{[^}]*position\\s*:\\s*absolute`, 'i').test(emitted.css),
      );
      return { htmlHasBlock, cssHasAbsolute };
    }, result.tests.freePlacement);
    assert(result.tests.freePlacement.hasManagedAbsolute, 'free placement did not emit absolute positioning');
    assert(result.tests.freePlacement.emittedManagedCss.cssHasAbsolute, 'free placement did not emit managed CSS');

    const touchProbeBox = await frame.locator('.sheet-row-a').boundingBox();
    const touchIframeBox = await iframe.boundingBox();
    assert(touchProbeBox && touchIframeBox, 'touch placement geometry missing');
    const touchStart = {
      x: touchProbeBox.x + touchProbeBox.width / 2,
      y: touchProbeBox.y + touchProbeBox.height / 2,
    };
    const touchDelta = { x: 46, y: 24 };
    const touchIframeViewport = await frame.evaluate(() => ({
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight,
    }));
    const touchIframeScale = {
      x: touchIframeBox.width / touchIframeViewport.width,
      y: touchIframeBox.height / touchIframeViewport.height,
    };
    const touchPoint = (x, y, id = 1) => ({ x, y, id, radiusX: 1, radiusY: 1, force: 1 });
    const readTouchPlacement = (blockId) => frame.evaluate((subjectId) => {
      const node = document.querySelector(`[data-r20-block-id="${CSS.escape(subjectId)}"]`);
      const rect = node?.getBoundingClientRect();
      const scrolling = document.scrollingElement;
      return {
        rect: rect ? { left: rect.left, top: rect.top } : null,
        className: node?.getAttribute('class') ?? '',
        inlineStyle: node?.getAttribute('style') ?? '',
        position: node ? getComputedStyle(node).position : '',
        touchAction: node ? getComputedStyle(node).touchAction : '',
        scrollLeft: scrolling?.scrollLeft ?? 0,
        scrollTop: scrolling?.scrollTop ?? 0,
      };
    }, blockId);
    await page.evaluate(() => {
      window.__r20TouchPointerTrace = [];
      window.addEventListener('message', (event) => {
        const message = event.data;
        if (message?.type === 'r20:edit-hit') {
          window.__r20TouchPointerTrace.push({
            blockId: message.blockId,
            phase: message.phase,
            pointer: message.pointer,
          });
        }
      });
    });
    await frame.evaluate(() => {
      window.__r20RawTouchTrace = [];
      ['pointerdown', 'pointerup', 'pointercancel'].forEach((type) => {
        window.addEventListener(type, (event) => {
          window.__r20RawTouchTrace.push({
            type,
            isPrimary: event.isPrimary,
            targetBlockId: event.target?.closest?.('[data-r20-block-id]')?.getAttribute('data-r20-block-id') ?? null,
          });
        }, true);
      });
    });
    const touchSession = await page.context().newCDPSession(page);
    let touchSubjectId = null;
    let touchEnded = false;
    try {
      await touchSession.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [touchPoint(touchStart.x, touchStart.y)],
      });
      await page.waitForTimeout(40);
      const rawStart = await frame.evaluate(() => window.__r20RawTouchTrace?.[0] ?? null);
      touchSubjectId = rawStart?.targetBlockId ?? null;
      assert(touchSubjectId, `touch start did not resolve an editable block: ${JSON.stringify(rawStart)}`);
      result.tests.touchPlacementBefore = await readTouchPlacement(touchSubjectId);
      for (let step = 1; step <= 4; step += 1) {
        const primary = touchPoint(
          touchStart.x + touchDelta.x * step / 4,
          touchStart.y + touchDelta.y * step / 4,
        );
        await touchSession.send('Input.dispatchTouchEvent', {
          type: step === 2 ? 'touchStart' : 'touchMove',
          touchPoints: step >= 2 ? [primary, touchPoint(touchStart.x + 8, touchStart.y + 8, 2)] : [primary],
        });
      }
      await page.waitForTimeout(80);
      result.tests.touchPlacementDuring = await readTouchPlacement(touchSubjectId);
      await touchSession.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      touchEnded = true;
    } finally {
      if (!touchEnded) {
        await touchSession.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] }).catch(() => {});
      }
      await touchSession.detach();
    }
    await page.waitForTimeout(350);
    result.tests.touchPlacement = await readTouchPlacement(touchSubjectId);
    result.tests.touchPointerTrace = await page.evaluate(() => window.__r20TouchPointerTrace ?? []);
    result.tests.touchRawTrace = await frame.evaluate(() => window.__r20RawTouchTrace ?? []);
    const touchPointerDown = result.tests.touchPointerTrace.find((entry) => entry.phase === 'pointerdown');
    const touchPointerUp = [...result.tests.touchPointerTrace].reverse().find((entry) => entry.phase === 'pointerup');
    assert(touchPointerDown && touchPointerUp, `touch bridge trace is incomplete: ${JSON.stringify(result.tests.touchPointerTrace)}`);
    assert(result.tests.touchRawTrace.some((entry) => entry.type === 'pointerdown' && !entry.isPrimary), 'secondary touch did not reach the iframe');
    assert(result.tests.touchPointerTrace.filter((entry) => entry.phase === 'pointerdown').length === 1, 'secondary touch replaced the primary drag');
    assert(result.tests.touchPlacementBefore.touchAction === 'none', 'direct edit did not reserve touch gestures');
    const touchPointerDelta = {
      x: touchPointerUp.pointer.x - touchPointerDown.pointer.x,
      y: touchPointerUp.pointer.y - touchPointerDown.pointer.y,
    };
    const expectedTouchPointerDelta = {
      x: touchDelta.x / touchIframeScale.x,
      y: touchDelta.y / touchIframeScale.y,
    };
    assert(
      Math.abs(touchPointerDelta.x - expectedTouchPointerDelta.x) <= 1
        && Math.abs(touchPointerDelta.y - expectedTouchPointerDelta.y) <= 1,
      `touch bridge changed the scaled pointer delta: ${JSON.stringify({ touchPointerDelta, expectedTouchPointerDelta })}`,
    );
    const placementDelta = (placement) => ({
      x: placement.rect.left - result.tests.touchPlacementBefore.rect.left,
      y: placement.rect.top - result.tests.touchPlacementBefore.rect.top,
    });
    const optimisticTouchDelta = placementDelta(result.tests.touchPlacementDuring);
    const committedTouchDelta = placementDelta(result.tests.touchPlacement);
    assert(
      Math.abs(optimisticTouchDelta.x - touchPointerDelta.x) <= 2
        && Math.abs(optimisticTouchDelta.y - touchPointerDelta.y) <= 2,
      'touch optimistic paint did not follow the finger',
    );
    assert(
      Math.abs(committedTouchDelta.x - touchPointerDelta.x) <= 4.1
        && Math.abs(committedTouchDelta.y - touchPointerDelta.y) <= 4.1,
      `touch placement did not persist: ${JSON.stringify({ touchPointerDelta, committedTouchDelta })}`,
    );
    assert(result.tests.touchPlacement.position === 'absolute', 'touch placement did not persist free positioning');
    assert(!/translate3d|will-change:\s*transform|transition:\s*none/i.test(result.tests.touchPlacement.inlineStyle), 'temporary touch paint leaked into inline HTML');
    result.tests.touchPlacement.emittedManagedCss = await page.evaluate(({ blockId, className }) => {
      const emitted = window.__perfHook.getEmitContent();
      const classNames = className.split(/\s+/).filter(Boolean);
      return {
        htmlHasBlock: emitted.html.includes(`data-r20-block-id="${blockId}"`),
        cssHasAbsolute: classNames.some((name) => (
          new RegExp(`\\.${name.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\s*\\{[^}]*position\\s*:\\s*absolute`, 'i').test(emitted.css)
        )),
      };
    }, { blockId: touchSubjectId, className: result.tests.touchPlacement.className });
    assert(result.tests.touchPlacement.emittedManagedCss.htmlHasBlock && result.tests.touchPlacement.emittedManagedCss.cssHasAbsolute, 'touch placement did not reach emitted HTML/CSS');
    assert(
      result.tests.touchPlacement.scrollLeft === result.tests.touchPlacementBefore.scrollLeft
        && result.tests.touchPlacement.scrollTop === result.tests.touchPlacementBefore.scrollTop,
      'touch placement scrolled the sheet',
    );
    await page.click('[data-testid="main-mode-preview"]');
    await frame.waitForFunction(() => document.body?.getAttribute('data-r20-edit-mode') === '0');
    result.tests.touchPlacementPreview = await readTouchPlacement(touchSubjectId);
    await page.click('[data-testid="preview-exit-edit"]');
    await frame.waitForFunction(() => document.body?.getAttribute('data-r20-edit-mode') === '1');
    result.tests.touchPlacementEditAgain = await readTouchPlacement(touchSubjectId);
    assert(
      result.tests.touchPlacementPreview.touchAction !== 'none'
        && result.tests.touchPlacementEditAgain.touchAction === 'none'
        && [result.tests.touchPlacementPreview, result.tests.touchPlacementEditAgain].every((placement) => (
          placement.position === 'absolute'
            && Math.abs(placement.rect.left - result.tests.touchPlacement.rect.left) <= 0.5
            && Math.abs(placement.rect.top - result.tests.touchPlacement.rect.top) <= 0.5
        )),
      'touch placement diverged between Preview and Edit',
    );

    result.tests.layerDropModes = await page.evaluate(async ({ movingId, targetId }) => {
      const target = document.querySelector(`[data-testid="edit-layer-row"][data-r20-block-id="${CSS.escape(targetId)}"]`);
      if (!target) return { modes: [], reason: 'missing target layer row' };
      const modes = [];
      const settle = () => new Promise((resolve) => requestAnimationFrame(
        () => requestAnimationFrame(resolve),
      ));
      target.scrollIntoView({ block: 'center' });
      await settle();
      const rect = target.getBoundingClientRect();
      for (const ratio of [0.1, 0.5, 0.9]) {
        const dataTransfer = new DataTransfer();
        dataTransfer.setData('application/x-r20-layer-block', movingId);
        const init = {
          bubbles: true,
          cancelable: true,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height * ratio,
        };
        const dragover = new DragEvent('dragover', init);
        Object.defineProperty(dragover, 'dataTransfer', { value: dataTransfer });
        target.dispatchEvent(dragover);
        await settle();
        modes.push(target.getAttribute('data-r20-layer-drop-mode') || null);
      }
      const inner = target.querySelector('[data-testid="edit-layer-role-rail"]') || target.firstElementChild;
      const hoverTransfer = new DataTransfer();
      hoverTransfer.setData('application/x-r20-layer-block', movingId);
      const hoverInit = {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
      };
      const hoverOver = new DragEvent('dragover', hoverInit);
      Object.defineProperty(hoverOver, 'dataTransfer', { value: hoverTransfer });
      target.dispatchEvent(hoverOver);
      await settle();
      const modeBeforeChildLeave = target.getAttribute('data-r20-layer-drop-mode') || null;
      const childLeave = new DragEvent('dragleave', {
        ...hoverInit,
        relatedTarget: inner,
      });
      target.dispatchEvent(childLeave);
      await settle();
      const modeAfterChildLeave = target.getAttribute('data-r20-layer-drop-mode') || null;
      target.dispatchEvent(new DragEvent('dragleave', { bubbles: true, cancelable: true }));
      return {
        modes,
        internalChildLeavePreserved: modeBeforeChildLeave === modeAfterChildLeave && Boolean(modeAfterChildLeave),
      };
    }, { movingId: ids.rowAId, targetId: ids.rowBId });
    assert(
      ['before', 'inside', 'after'].every((mode) => result.tests.layerDropModes.modes.includes(mode)),
      `layer drop zones are incomplete: ${JSON.stringify(result.tests.layerDropModes)}`,
    );
    assert(
      result.tests.layerDropModes.internalChildLeavePreserved,
      'layer drop highlight disappeared while pointer remained inside the row',
    );

    result.tests.layerMiniMapContract = await page.evaluate(() => {
      const mismatches = Array.from(document.querySelectorAll('[data-testid="edit-layer-row"]'))
        .map((row) => {
          const mini = row.querySelector('[data-testid="edit-layer-mini-map"]');
          return {
            blockId: row.getAttribute('data-r20-block-id'),
            canDrop: row.getAttribute('data-r20-can-drop'),
            miniContainer: mini?.getAttribute('data-r20-layer-mini-container') ?? null,
          };
        })
        .filter((item) => item.miniContainer !== item.canDrop);
      return { mismatches };
    });
    assert(
      result.tests.layerMiniMapContract.mismatches.length === 0,
      `layer mini-map container signal disagrees with drop contract: ${JSON.stringify(result.tests.layerMiniMapContract)}`,
    );

    // A layer row can be dragged from the Figma-style panel onto the actual
    // rendered iframe. This used to stop at the document boundary because the
    // iframe only understood gallery/widget payloads.
    await page.click('[data-testid="edit-placement-flow"]');
    result.tests.layerCanvasDrop = await frame.evaluate(({ movingId, targetId }) => {
      const target = document.querySelector(`[data-r20-block-id="${CSS.escape(targetId)}"]`);
      if (!target) return { dispatched: false, reason: 'missing target' };
      const rect = target.getBoundingClientRect();
      const dataTransfer = new DataTransfer();
      dataTransfer.setData('application/x-r20-layer-block', movingId);
      const init = {
        bubbles: true,
        cancelable: true,
        clientX: rect.right - 2,
        clientY: rect.top + rect.height / 2,
      };
      const dragover = new DragEvent('dragover', init);
      Object.defineProperty(dragover, 'dataTransfer', { value: dataTransfer });
      target.dispatchEvent(dragover);
      const drop = new DragEvent('drop', init);
      Object.defineProperty(drop, 'dataTransfer', { value: dataTransfer });
      target.dispatchEvent(drop);
      return {
        dispatched: true,
        dragoverPrevented: dragover.defaultPrevented,
        dropPrevented: drop.defaultPrevented,
      };
    }, { movingId: ids.outsideId, targetId: ids.frameId });
    await page.waitForTimeout(700);
    const renderedLayerCanvasDrop = await frame.evaluate(({ movingId, targetId }) => {
      const movingNode = document.querySelector(`[data-r20-block-id="${CSS.escape(movingId)}"]`);
      return {
        renderedParentId: movingNode?.parentElement?.closest('[data-r20-block-id]')?.getAttribute('data-r20-block-id') ?? null,
      };
    }, { movingId: ids.outsideId, targetId: ids.frameId });
    const emittedLayerCanvasDrop = await page.evaluate(({ movingId, targetId }) => {
      const graph = window.__perfHook.getLayerSnapshot('html');
      const moving = graph.find((node) => node.id === movingId);
      const target = graph.find((node) => node.id === targetId);
      const html = window.__perfHook.getEmitContent().html;
      return {
        modelParentId: moving?.layerParentId ?? null,
        targetChildCount: target?.childCount ?? null,
        emittedNested: html.indexOf(`data-r20-block-id="${movingId}"`)
          > html.indexOf(`data-r20-block-id="${targetId}"`),
      };
    }, { movingId: ids.outsideId, targetId: ids.frameId });
    result.tests.layerCanvasDrop.result = {
      ...emittedLayerCanvasDrop,
      ...renderedLayerCanvasDrop,
    };
    assert(result.tests.layerCanvasDrop.dispatched, 'layer canvas drop did not dispatch');
    assert(result.tests.layerCanvasDrop.dragoverPrevented, 'iframe did not accept layer dragover');
    assert(result.tests.layerCanvasDrop.dropPrevented, 'iframe did not accept layer drop');
    assert(result.tests.layerCanvasDrop.result.modelParentId === ids.frameId, 'layer canvas drop did not update the model parent');
    assert(
      result.tests.layerCanvasDrop.result.renderedParentId === ids.frameId,
      `layer canvas drop did not update the rendered parent: ${JSON.stringify(result.tests.layerCanvasDrop)}`,
    );
    assert(result.tests.layerCanvasDrop.result.emittedNested, 'layer canvas drop did not update emitted HTML');

    const waitForLayerParent = async (expectedParentId) => {
      await page.waitForFunction(({ movingId, parentId }) => {
        const moving = window.__perfHook
          .getLayerSnapshot('html')
          .find((node) => node.id === movingId);
        return Boolean(moving) && (moving.layerParentId ?? null) === parentId;
      }, { movingId: ids.outsideId, parentId: expectedParentId }, { timeout: 10000 });
      await frame.waitForFunction(({ movingId, parentId }) => {
        const moving = document.querySelector(`[data-r20-block-id="${CSS.escape(movingId)}"]`);
        const renderedParentId = moving
          ?.parentElement
          ?.closest('[data-r20-block-id]')
          ?.getAttribute('data-r20-block-id') ?? null;
        return Boolean(moving) && renderedParentId === parentId;
      }, { movingId: ids.outsideId, parentId: expectedParentId }, { timeout: 10000 });
    };
    const readLayerParent = async () => {
      const [modelParentId, renderedParentId] = await Promise.all([
        page.evaluate((movingId) => {
          const moving = window.__perfHook
            .getLayerSnapshot('html')
            .find((node) => node.id === movingId);
          return moving?.layerParentId ?? null;
        }, ids.outsideId),
        frame.evaluate((movingId) => {
          const moving = document.querySelector(`[data-r20-block-id="${CSS.escape(movingId)}"]`);
          return moving
            ?.parentElement
            ?.closest('[data-r20-block-id]')
            ?.getAttribute('data-r20-block-id') ?? null;
        }, ids.outsideId),
      ]);
      return { modelParentId, renderedParentId };
    };
    assert(await historyUndoButton.isEnabled(), 'flow reparent did not create an undo step');
    await historyUndoButton.click();
    await waitForLayerParent(null);
    const flowDropUndo = await readLayerParent();
    assert(await historyRedoButton.isEnabled(), 'flow reparent undo did not create a redo step');
    await historyRedoButton.click();
    await waitForLayerParent(ids.frameId);
    const flowDropRedo = await readLayerParent();
    result.tests.layerCanvasDrop.history = { undo: flowDropUndo, redo: flowDropRedo };
    assert(
      flowDropUndo.modelParentId === null
        && flowDropUndo.renderedParentId === null
        && flowDropRedo.modelParentId === ids.frameId
        && flowDropRedo.renderedParentId === ids.frameId,
      `flow reparent did not roundtrip in one history step: ${JSON.stringify(result.tests.layerCanvasDrop.history)}`,
    );

    await page.click('[data-testid="edit-placement-free"]');
    result.tests.layerCanvasFreeDrop = await frame.evaluate(({ movingId, targetId }) => {
      const target = document.querySelector(`[data-r20-block-id="${CSS.escape(targetId)}"]`);
      if (!target) return { dispatched: false, reason: 'missing target' };
      const rect = target.getBoundingClientRect();
      const dataTransfer = new DataTransfer();
      dataTransfer.setData('application/x-r20-layer-block', movingId);
      const init = {
        bubbles: true,
        cancelable: true,
        clientX: rect.right - 2,
        clientY: rect.top + rect.height / 2,
      };
      const dragover = new DragEvent('dragover', init);
      Object.defineProperty(dragover, 'dataTransfer', { value: dataTransfer });
      target.dispatchEvent(dragover);
      const drop = new DragEvent('drop', init);
      Object.defineProperty(drop, 'dataTransfer', { value: dataTransfer });
      target.dispatchEvent(drop);
      return {
        dispatched: true,
        dragoverPrevented: dragover.defaultPrevented,
        dropPrevented: drop.defaultPrevented,
      };
    }, { movingId: ids.rowAId, targetId: ids.frameId });
    await page.waitForTimeout(700);
    const renderedLayerCanvasFreeDrop = await frame.evaluate(({ movingId, targetId }) => {
      const movingNode = document.querySelector(`[data-r20-block-id="${CSS.escape(movingId)}"]`);
      const frameNode = document.querySelector(`[data-r20-block-id="${CSS.escape(targetId)}"]`);
      const movingStyle = movingNode ? getComputedStyle(movingNode) : null;
      return {
        renderedParentId: movingNode?.parentElement?.closest('[data-r20-block-id]')?.getAttribute('data-r20-block-id') ?? null,
        position: movingStyle?.position ?? null,
        left: movingStyle ? Number.parseFloat(movingStyle.left) : null,
        top: movingStyle ? Number.parseFloat(movingStyle.top) : null,
        framePosition: frameNode ? getComputedStyle(frameNode).position : null,
      };
    }, { movingId: ids.rowAId, targetId: ids.frameId });
    const modelLayerCanvasFreeDrop = await page.evaluate(({ movingId, targetId }) => {
      const graph = window.__perfHook.getLayerSnapshot('html');
      const moving = graph.find((node) => node.id === movingId);
      const html = window.__perfHook.getEmitContent().html;
      const css = window.__perfHook.getEmitContent().css;
      const movingMarkupIndex = html.indexOf(`data-r20-block-id="${movingId}"`);
      const targetMarkupIndex = html.indexOf(`data-r20-block-id="${targetId}"`);
      return {
        modelParentId: moving?.layerParentId ?? null,
        emittedNested: movingMarkupIndex > targetMarkupIndex,
        emittedManagedAbsolute: /position\s*:\s*absolute/i.test(css),
      };
    }, { movingId: ids.rowAId, targetId: ids.frameId });
    result.tests.layerCanvasFreeDrop.result = {
      ...modelLayerCanvasFreeDrop,
      ...renderedLayerCanvasFreeDrop,
    };
    assert(result.tests.layerCanvasFreeDrop.dispatched, 'free layer canvas drop did not dispatch');
    assert(result.tests.layerCanvasFreeDrop.dragoverPrevented, 'iframe did not accept free layer dragover');
    assert(result.tests.layerCanvasFreeDrop.dropPrevented, 'iframe did not accept free layer drop');
    assert(result.tests.layerCanvasFreeDrop.result.modelParentId === ids.frameId, 'free layer canvas drop changed the wrong model parent');
    assert(result.tests.layerCanvasFreeDrop.result.renderedParentId === ids.frameId, 'free layer canvas drop did not update the rendered parent');
    assert(result.tests.layerCanvasFreeDrop.result.position === 'absolute', 'free layer canvas drop did not persist absolute positioning');
    assert(Number.isFinite(result.tests.layerCanvasFreeDrop.result.left), 'free layer canvas drop did not persist left');
    assert(Number.isFinite(result.tests.layerCanvasFreeDrop.result.top), 'free layer canvas drop did not persist top');
    assert(result.tests.layerCanvasFreeDrop.result.emittedManagedAbsolute, 'free layer canvas drop did not emit managed CSS');

    await layerSearch.fill(ids.tableRowId);
    await page.locator(
      `[data-testid="edit-layer-row"][data-r20-block-id="${ids.tableRowId}"]`,
    ).waitFor({ state: 'attached' });
    await page.locator(
      `[data-testid="edit-layer-row"][data-r20-block-id="${ids.tableId}"]`,
    ).waitFor({ state: 'attached' });
    result.tests.tableDropGuard = await page.evaluate(async ({ movingId, validMovingId, invalidTargetId, validTargetId }) => {
      const dispatchDragover = async (targetId, draggedId) => {
        const target = document.querySelector(
          `[data-testid="edit-layer-row"][data-r20-block-id="${CSS.escape(targetId)}"]`,
        );
        if (!target) return null;
        const rect = target.getBoundingClientRect();
        const dataTransfer = new DataTransfer();
        dataTransfer.setData('application/x-r20-layer-block', draggedId);
        const event = new DragEvent('dragover', {
          bubbles: true,
          cancelable: true,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2,
        });
        Object.defineProperty(event, 'dataTransfer', { value: dataTransfer });
        target.dispatchEvent(event);
        await new Promise((resolve) => requestAnimationFrame(resolve));
        return {
          mode: target.getAttribute('data-r20-layer-drop-mode') || null,
          dropEffect: dataTransfer.dropEffect,
          defaultPrevented: event.defaultPrevented,
        };
      };
      const invalid = await dispatchDragover(invalidTargetId, movingId);
      const valid = await dispatchDragover(validTargetId, validMovingId);
      return { invalid, valid };
    }, {
      movingId: ids.frameId,
      validMovingId: ids.tableBodyId,
      invalidTargetId: ids.tableRowId,
      validTargetId: ids.tableId,
    });
    await layerSearch.fill('');
    assert(
      result.tests.tableDropGuard.invalid?.mode === null
        && result.tests.tableDropGuard.invalid.dropEffect === 'none'
        && !result.tests.tableDropGuard.invalid.defaultPrevented,
      `invalid table child was shown as droppable: ${JSON.stringify(result.tests.tableDropGuard)}`,
    );
    assert(
      result.tests.tableDropGuard.valid?.mode === 'inside'
        && result.tests.tableDropGuard.valid.defaultPrevented,
      `valid table parent was not shown as droppable: ${JSON.stringify(result.tests.tableDropGuard)}`,
    );

    await layerSearch.fill(ids.tableCellAId);
    await page.locator(
      `[data-testid="edit-layer-row"][data-r20-block-id="${ids.tableCellAId}"]`,
    ).waitFor({ state: 'attached' });
    await page.locator(
      `[data-testid="edit-layer-row"][data-r20-block-id="${ids.tableRowId}"]`,
    ).waitFor({ state: 'attached' });
    result.tests.tableDropMutation = await page.evaluate(async ({ validMovingId, validTargetId, invalidMovingId, invalidTargetId }) => {
      const dispatchDrop = async (targetId, draggedId) => {
        const target = document.querySelector(
          `[data-testid="edit-layer-row"][data-r20-block-id="${CSS.escape(targetId)}"]`,
        );
        if (!target) return { found: false, mode: null, defaultPrevented: false };
        target.scrollIntoView({ block: 'center' });
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const rect = target.getBoundingClientRect();
        const dataTransfer = new DataTransfer();
        dataTransfer.setData('application/x-r20-layer-block', draggedId);
        const init = {
          bubbles: true,
          cancelable: true,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2,
        };
        const dragover = new DragEvent('dragover', init);
        Object.defineProperty(dragover, 'dataTransfer', { value: dataTransfer });
        target.dispatchEvent(dragover);
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const mode = target.getAttribute('data-r20-layer-drop-mode') || null;
        const drop = new DragEvent('drop', init);
        Object.defineProperty(drop, 'dataTransfer', { value: dataTransfer });
        target.dispatchEvent(drop);
        await new Promise((resolve) => setTimeout(resolve, 350));
        const graph = window.__perfHook.getLayerSnapshot('html');
        return {
          found: true,
          mode,
          dragoverPrevented: dragover.defaultPrevented,
          dropPrevented: drop.defaultPrevented,
          movingParent: graph.find((node) => node.id === draggedId)?.layerParentId ?? null,
        };
      };

      const valid = await dispatchDrop(validTargetId, validMovingId);
      const invalid = await dispatchDrop(invalidTargetId, invalidMovingId);
      return { valid, invalid };
    }, {
      validMovingId: ids.outsideId,
      validTargetId: ids.tableCellAId,
      invalidMovingId: ids.frameId,
      invalidTargetId: ids.tableRowId,
    });
    await layerSearch.fill('');
    assert(
      result.tests.tableDropMutation.valid.found
        && result.tests.tableDropMutation.valid.mode === 'inside'
        && result.tests.tableDropMutation.valid.dragoverPrevented
        && result.tests.tableDropMutation.valid.movingParent === ids.tableCellAId,
      `valid table drop did not persist its insertion: ${JSON.stringify(result.tests.tableDropMutation)}`,
    );
    assert(
      result.tests.tableDropMutation.invalid.found
        && !result.tests.tableDropMutation.invalid.dropPrevented
        && result.tests.tableDropMutation.invalid.movingParent === null,
      `invalid table drop changed the layer graph: ${JSON.stringify(result.tests.tableDropMutation)}`,
    );

    result.tests.layerReorder = await page.evaluate(async ({ movingId, targetId }) => {
      const scroll = document.querySelector('[data-testid="edit-layer-scroll"]');
      if (scroll instanceof HTMLElement) {
        scroll.scrollTop = 0;
        scroll.dispatchEvent(new Event('scroll', { bubbles: true }));
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      }
      const moving = document.querySelector(`[data-testid="edit-layer-row"][data-r20-block-id="${CSS.escape(movingId)}"]`);
      const target = document.querySelector(`[data-testid="edit-layer-row"][data-r20-block-id="${CSS.escape(targetId)}"]`);
      if (!moving || !target) return { moved: false, reason: 'missing moving or target layer row' };
      target.scrollIntoView({ block: 'center' });
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const rect = target.getBoundingClientRect();
      const dataTransfer = new DataTransfer();
      dataTransfer.setData('application/x-r20-layer-block', movingId);
      const init = {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height * 0.86,
      };
      const dragstart = new DragEvent('dragstart', init);
      Object.defineProperty(dragstart, 'dataTransfer', { value: dataTransfer });
      moving.dispatchEvent(dragstart);
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const dragover = new DragEvent('dragover', init);
      Object.defineProperty(dragover, 'dataTransfer', { value: dataTransfer });
      target.dispatchEvent(dragover);
      for (let attempt = 0; attempt < 4 && !target.getAttribute('data-r20-layer-drop-mode'); attempt += 1) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
      const mode = target.getAttribute('data-r20-layer-drop-mode');
      const drop = new DragEvent('drop', init);
      Object.defineProperty(drop, 'dataTransfer', { value: dataTransfer });
      target.dispatchEvent(drop);
      await new Promise((resolve) => setTimeout(resolve, 350));
      const graph = window.__perfHook.getLayerSnapshot('html');
      return {
        moved: true,
        mode,
        movingParent: graph.find((node) => node.id === movingId)?.layerParentId ?? null,
        targetParent: graph.find((node) => node.id === targetId)?.layerParentId ?? null,
      };
    }, { movingId: ids.rowAId, targetId: ids.rowBId });
    assert(result.tests.layerReorder.moved, 'layer reorder did not dispatch');
    assert(['before', 'after', 'inside'].includes(result.tests.layerReorder.mode), 'layer reorder has no drop mode');

    result.tests.layerEject = await page.evaluate(async ({ movingId, remainingId, frameId }) => {
      const button = document.querySelector(
        `[data-testid="edit-layer-eject"][data-r20-block-id="${CSS.escape(movingId)}"]`,
      );
      if (!button) return { clicked: false, reason: 'missing eject action for nested layer' };
      button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await new Promise((resolve) => setTimeout(resolve, 350));
      const graph = window.__perfHook.getLayerSnapshot('html');
      const moving = graph.find((node) => node.id === movingId);
      const remaining = graph.find((node) => node.id === remainingId);
      return {
        clicked: true,
        movingParent: moving?.layerParentId ?? null,
        remainingParent: remaining?.layerParentId ?? null,
        framePresent: Boolean(graph.find((node) => node.id === frameId)),
      };
    }, { movingId: ids.rowAId, remainingId: ids.rowBId, frameId: ids.frameId });
    assert(result.tests.layerEject.clicked, `layer eject action missing: ${JSON.stringify(result.tests.layerEject)}`);
    assert(result.tests.layerEject.movingParent === null, 'layer eject did not move the layer outward');
    assert(result.tests.layerEject.remainingParent === ids.frameId, 'layer eject disturbed the remaining inner layer');
    assert(result.tests.layerEject.framePresent, 'layer eject removed the frame');

    result.tests.cycleProtection = await page.evaluate(async ({ movingId, targetId }) => {
      const before = window.__perfHook.getLayerSnapshot('html');
      const target = document.querySelector(`[data-testid="edit-layer-row"][data-r20-block-id="${CSS.escape(targetId)}"]`);
      if (!target) return { rejected: false, reason: 'missing target layer row' };
      const rect = target.getBoundingClientRect();
      const dataTransfer = new DataTransfer();
      dataTransfer.setData('application/x-r20-layer-block', movingId);
      const init = { bubbles: true, cancelable: true, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };
      const over = new DragEvent('dragover', init);
      Object.defineProperty(over, 'dataTransfer', { value: dataTransfer });
      target.dispatchEvent(over);
      const dropModeBeforeDrop = target.getAttribute('data-r20-layer-drop-mode') || null;
      const dropEffectBeforeDrop = dataTransfer.dropEffect;
      const drop = new DragEvent('drop', init);
      Object.defineProperty(drop, 'dataTransfer', { value: dataTransfer });
      target.dispatchEvent(drop);
      await new Promise((resolve) => setTimeout(resolve, 300));
      const after = window.__perfHook.getLayerSnapshot('html');
      const beforeMoving = before.find((node) => node.id === movingId);
      const afterMoving = after.find((node) => node.id === movingId);
      return {
        rejected: Boolean(beforeMoving && afterMoving && beforeMoving.layerParentId === afterMoving.layerParentId),
        beforeCount: before.length,
        afterCount: after.length,
        beforeIds: before.map((node) => node.id),
        afterIds: after.map((node) => node.id),
        beforeParent: beforeMoving?.layerParentId ?? null,
        afterParent: afterMoving?.layerParentId ?? null,
        dropModeBeforeDrop,
        dropEffectBeforeDrop,
      };
    }, { movingId: ids.frameId, targetId: ids.rowBId });
    assert(result.tests.cycleProtection.rejected, 'cycle-producing layer drop was accepted');
    assert(
      result.tests.cycleProtection.dropModeBeforeDrop === null,
      'cycle-producing layer drop was shown as a valid target',
    );
    assert(
      result.tests.cycleProtection.dropEffectBeforeDrop === 'none',
      'cycle-producing layer drop did not advertise a blocked drop effect',
    );

    result.tests.selectionSync = await page.evaluate(async (targetId) => {
      const row = document.querySelector(`[data-testid="edit-layer-row"][data-r20-block-id="${CSS.escape(targetId)}"]`);
      row?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await new Promise((resolve) => requestAnimationFrame(resolve));
      return {
        rowSelected: row?.getAttribute('data-r20-layer-selected') === '1',
        storeSelected: window.__perfHook.getSelectedBlockId?.() ?? null,
      };
    }, ids.rowBId);
    assert(result.tests.selectionSync.rowSelected, 'layer row selection did not update');

    const resizeTargetId = ids.imageId;
    await page.locator(
      `[data-testid="edit-layer-row"][data-r20-block-id="${resizeTargetId}"]`,
    ).click();
    await page.waitForFunction(
      (blockId) => window.__perfHook.getSelectedBlockId?.() === blockId,
      resizeTargetId,
    );
    const resizeHandle = page.locator('[data-testid="iframe-resize-handle-se"]');
    await resizeHandle.waitFor({ state: 'visible', timeout: 10000 });
    const resizeBefore = await frame.evaluate((blockId) => {
      const element = document.querySelector(`[data-r20-block-id="${CSS.escape(blockId)}"]`);
      if (!(element instanceof HTMLElement)) return null;
      const rect = element.getBoundingClientRect();
      return {
        width: rect.width,
        height: rect.height,
        inlineStyle: element.getAttribute('style') ?? '',
      };
    }, resizeTargetId);
    const resizeHandleBox = await resizeHandle.boundingBox();
    assert(resizeBefore && resizeHandleBox, 'direct resize target or handle is missing');
    await page.mouse.move(
      resizeHandleBox.x + resizeHandleBox.width / 2,
      resizeHandleBox.y + resizeHandleBox.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      resizeHandleBox.x + resizeHandleBox.width / 2 + 48,
      resizeHandleBox.y + resizeHandleBox.height / 2 + 32,
      { steps: 4 },
    );
    await frame.waitForFunction(
      (blockId) => document.body?.getAttribute('data-r20-resize-active') === blockId,
      resizeTargetId,
      { timeout: 5000 },
    );
    const resizeDuring = await frame.evaluate((blockId) => {
      const element = document.querySelector(`[data-r20-block-id="${CSS.escape(blockId)}"]`);
      if (!(element instanceof HTMLElement)) return null;
      const rect = element.getBoundingClientRect();
      return {
        width: rect.width,
        height: rect.height,
        inlineStyle: element.getAttribute('style') ?? '',
        optimistic: document.body?.getAttribute('data-r20-resize-active') ?? null,
      };
    }, resizeTargetId);
    assert(
      resizeDuring
        && resizeDuring.width > resizeBefore.width + 20
        && resizeDuring.height > resizeBefore.height + 12,
      `direct resize did not update the real iframe element before pointer-up: ${JSON.stringify({ resizeBefore, resizeDuring })}`,
    );
    assert(
      /width\s*:.*!important/i.test(resizeDuring.inlineStyle)
        && /height\s*:.*!important/i.test(resizeDuring.inlineStyle),
      'direct resize did not use a temporary iframe-only visual size',
    );
    await page.mouse.up();
    try {
      await page.waitForFunction(
        (blockId) => {
          const fields = window.__perfHook.getBlockFields('html', blockId);
          const classValue = Array.isArray(fields)
            ? fields.find((field) => field.name === 'CLASS')?.value
            : fields?.CLASS;
          const designClass = String(classValue ?? '').split(/\s+/).find((name) => name.startsWith('sheet-r20-node-'));
          const css = window.__perfHook.getEmitContent().css;
          return Boolean(
            designClass
            && new RegExp(`\\.${designClass}(?:\\.${designClass})*[^{}]*\\{[^}]*width\\s*:`).test(css)
            && new RegExp(`\\.${designClass}(?:\\.${designClass})*[^{}]*\\{[^}]*height\\s*:`).test(css),
          );
        },
        resizeTargetId,
        { timeout: 10000 },
      );
    } catch (error) {
      const resizeCommitDebug = await page.evaluate((blockId) => ({
        fields: window.__perfHook.getBlockFields('html', blockId),
        css: window.__perfHook.getEmitContent().css.slice(-1600),
        selectedId: window.__perfHook.getSelectedBlockId?.() ?? null,
      }), resizeTargetId);
      throw new Error(`direct resize CSS commit missing: ${JSON.stringify(resizeCommitDebug)}`, { cause: error });
    }
    await frame.waitForFunction(
      () => !document.body?.hasAttribute('data-r20-resize-active'),
      null,
      { timeout: 10000 },
    );
    const resizeAfterEdit = await frame.evaluate((blockId) => {
      const element = document.querySelector(`[data-r20-block-id="${CSS.escape(blockId)}"]`);
      if (!(element instanceof HTMLElement)) return null;
      const rect = element.getBoundingClientRect();
      return {
        width: rect.width,
        height: rect.height,
        inlineStyle: element.getAttribute('style') ?? '',
      };
    }, resizeTargetId);
    const resizeEmit = await page.evaluate((blockId) => {
      const fields = window.__perfHook.getBlockFields('html', blockId);
      return {
        fields,
        ...window.__perfHook.getEmitContent(),
      };
    }, resizeTargetId);
    assert(resizeAfterEdit, 'resized element disappeared after CSS commit');
    assert(
      Math.abs(resizeAfterEdit.width - resizeDuring.width) <= 1.5
        && Math.abs(resizeAfterEdit.height - resizeDuring.height) <= 1.5,
      `resized element rolled back after pointer-up: ${JSON.stringify({ resizeDuring, resizeAfterEdit })}`,
    );
    assert(
      !/width\s*:|height\s*:/i.test(resizeAfterEdit.inlineStyle),
      `managed resize leaked into emitted inline HTML: ${resizeAfterEdit.inlineStyle}`,
    );
    assert(/width\s*:/.test(resizeEmit.css) && /height\s*:/.test(resizeEmit.css), 'managed resize did not persist in CSS');

    const waitForResizeRect = (expected) => frame.waitForFunction(({ blockId, rect }) => {
      const current = document
        .querySelector(`[data-r20-block-id="${CSS.escape(blockId)}"]`)
        ?.getBoundingClientRect();
      return Boolean(
        current
        && Math.abs(current.width - rect.width) <= 1.5
        && Math.abs(current.height - rect.height) <= 1.5,
      );
    }, { blockId: resizeTargetId, rect: expected }, { timeout: 10000 });
    const readResizeRect = () => frame.evaluate((blockId) => {
      const element = document.querySelector(`[data-r20-block-id="${CSS.escape(blockId)}"]`);
      if (!(element instanceof HTMLElement)) return null;
      const rect = element.getBoundingClientRect();
      return {
        width: rect.width,
        height: rect.height,
        inlineStyle: element.getAttribute('style') ?? '',
      };
    }, resizeTargetId);
    assert(await historyUndoButton.isEnabled(), 'direct resize did not create an undo step');
    await historyUndoButton.click();
    await waitForResizeRect(resizeBefore);
    const resizeUndo = await readResizeRect();
    assert(
      resizeUndo
        && Math.abs(resizeUndo.width - resizeBefore.width) <= 1.5
        && Math.abs(resizeUndo.height - resizeBefore.height) <= 1.5
        && resizeUndo.inlineStyle === resizeBefore.inlineStyle,
      `direct resize undo did not restore source geometry: ${JSON.stringify({ resizeBefore, resizeUndo })}`,
    );
    assert(await historyRedoButton.isEnabled(), 'direct resize undo did not create a redo step');
    await historyRedoButton.click();
    await waitForResizeRect(resizeAfterEdit);
    const resizeRedo = await readResizeRect();
    assert(
      resizeRedo
        && Math.abs(resizeRedo.width - resizeAfterEdit.width) <= 1.5
        && Math.abs(resizeRedo.height - resizeAfterEdit.height) <= 1.5
        && resizeRedo.inlineStyle === resizeAfterEdit.inlineStyle,
      `direct resize redo did not restore managed CSS geometry: ${JSON.stringify({ resizeAfterEdit, resizeRedo })}`,
    );

    await page.click('[data-testid="main-mode-preview"]');
    await frame.waitForFunction(() => document.body?.getAttribute('data-r20-edit-mode') === '0');
    const resizePreviewRect = await frame.evaluate((blockId) => {
      const rect = document.querySelector(`[data-r20-block-id="${CSS.escape(blockId)}"]`)?.getBoundingClientRect();
      return rect ? { width: rect.width, height: rect.height } : null;
    }, resizeTargetId);
    await page.click('[data-testid="preview-exit-edit"]');
    await frame.waitForFunction(() => document.body?.getAttribute('data-r20-edit-mode') === '1');
    const resizeEditRect = await frame.evaluate((blockId) => {
      const rect = document.querySelector(`[data-r20-block-id="${CSS.escape(blockId)}"]`)?.getBoundingClientRect();
      return rect ? { width: rect.width, height: rect.height } : null;
    }, resizeTargetId);
    result.tests.directResize = {
      before: resizeBefore,
      during: resizeDuring,
      afterEdit: resizeAfterEdit,
      undo: resizeUndo,
      redo: resizeRedo,
      preview: resizePreviewRect,
      editAgain: resizeEditRect,
      emittedCss: /width\s*:/.test(resizeEmit.css) && /height\s*:/.test(resizeEmit.css),
    };
    assert(
      resizePreviewRect
        && resizeEditRect
        && Math.abs(resizePreviewRect.width - resizeAfterEdit.width) <= 0.5
        && Math.abs(resizePreviewRect.height - resizeAfterEdit.height) <= 0.5
        && Math.abs(resizeEditRect.width - resizePreviewRect.width) <= 0.5
        && Math.abs(resizeEditRect.height - resizePreviewRect.height) <= 0.5,
      `preview/edit resize geometry diverged: ${JSON.stringify(result.tests.directResize)}`,
    );
    await page.locator(
      `[data-testid="edit-layer-row"][data-r20-block-id="${ids.rowBId}"]`,
    ).click();

    result.tests.editInspector = await page.evaluate(async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const panel = document.querySelector('[data-testid="edit-inspector"]');
      return {
        visible: Boolean(panel),
        role: panel?.querySelector('[data-testid="edit-inspector-role"]')?.textContent?.trim() || null,
        context: Boolean(panel?.querySelector('[data-testid="edit-inspector-context"]')),
      };
    });
    assert(result.tests.editInspector.visible, 'edit inspector did not replace the widget inspector');
    assert(result.tests.editInspector.role, 'edit inspector did not show the selected layer role');
    assert(result.tests.editInspector.context, 'edit inspector did not show layer context');

    const backgroundInput = page.locator('[data-testid="design-style-background-text"]');
    const paddingInput = page.locator('[data-testid="design-style-padding"]');
    assert((await backgroundInput.count()) === 1, 'visual background control is missing');
    assert((await paddingInput.count()) === 1, 'visual padding control is missing');
    await backgroundInput.fill('#f1a7bf');
    await paddingInput.fill('18');
    await page.locator('[data-testid="design-style-layout-row"]').click();
    await page.waitForFunction(
      () => {
        const css = window.__perfHook.getEmitContent().css;
        return css.includes('background-color: #f1a7bf')
          && css.includes('padding: 18px')
          && css.includes('display: flex')
          && css.includes('flex-direction: row');
      },
      null,
      { timeout: 10000 },
    );
    await page.waitForTimeout(600);
    const styledLayer = await frame.evaluate((blockId) => {
      const element = document.querySelector(`[data-r20-block-id="${CSS.escape(blockId)}"]`);
      if (!(element instanceof HTMLElement)) return null;
      const style = getComputedStyle(element);
      return {
        className: element.className,
        inlineStyle: element.getAttribute('style') ?? '',
        backgroundColor: style.backgroundColor,
        paddingTop: style.paddingTop,
        display: style.display,
        flexDirection: style.flexDirection,
      };
    }, ids.rowBId);
    const styledEmit = await page.evaluate(() => window.__perfHook.getEmitContent());
    const styledModel = await page.evaluate((blockId) => (
      window.__perfHook.getBlockFields('html', blockId)
    ), ids.rowBId);
    result.tests.visualStyle = { styledLayer, styledEmit, styledModel };
    const styledDebug = JSON.stringify({
      styledLayer,
      fields: styledModel,
      html: styledEmit.html.match(/<div[^>]*sheet-row-b[^>]*>/)?.[0] ?? null,
      css: styledEmit.css.match(/\.sheet-r20-node-[^{]+\{[^}]+\}/g)?.slice(-2) ?? [],
    });
    assert(styledLayer, 'styled layer disappeared from the persistent iframe');
    assert(styledLayer.backgroundColor === 'rgb(241, 167, 191)', `background control did not update the rendered sheet: ${JSON.stringify(styledLayer)}`);
    assert(styledLayer.paddingTop === '18px', `padding control did not update the rendered sheet: ${styledDebug}`);
    assert(styledLayer.display === 'flex' && styledLayer.flexDirection === 'row', `layout control did not update the rendered sheet: ${styledDebug}`);
    assert(!/padding\s*:|background(?:-color)?\s*:/i.test(styledLayer.inlineStyle), 'visual style leaked back into inline HTML');
    assert(styledEmit.css.includes('background-color: #f1a7bf'), 'visual background was not emitted to CSS');
    assert(styledEmit.css.includes('padding: 18px'), 'visual padding was not emitted to CSS');

    const readSectionStylePreset = () => frame.evaluate(({ frameId, titleId, labelId }) => {
      const root = document.querySelector(`[data-r20-block-id="${CSS.escape(frameId)}"]`);
      const title = document.querySelector(`[data-r20-block-id="${CSS.escape(titleId)}"]`);
      const label = document.querySelector(`[data-r20-block-id="${CSS.escape(labelId)}"]`);
      if (!(root instanceof HTMLElement) || !(title instanceof HTMLElement) || !(label instanceof HTMLElement)) return null;
      const rootStyle = getComputedStyle(root);
      const titleStyle = getComputedStyle(title);
      const labelStyle = getComputedStyle(label);
      return {
        root: {
          inlineStyle: root.getAttribute('style') ?? '',
          backgroundColor: rootStyle.backgroundColor,
          borderColor: rootStyle.borderColor,
          borderRadius: rootStyle.borderRadius,
          paddingTop: rootStyle.paddingTop,
        },
        title: {
          inlineStyle: title.getAttribute('style') ?? '',
          backgroundColor: titleStyle.backgroundColor,
          color: titleStyle.color,
          paddingTop: titleStyle.paddingTop,
        },
        label: {
          inlineStyle: label.getAttribute('style') ?? '',
          color: labelStyle.color,
        },
      };
    }, { frameId: ids.frameId, titleId: ids.titleId, labelId: ids.labelId });
    const waitForSectionStylePreset = (expected) => frame.waitForFunction(({ frameId, titleId, labelId, appearance }) => {
      const root = document.querySelector(`[data-r20-block-id="${CSS.escape(frameId)}"]`);
      const title = document.querySelector(`[data-r20-block-id="${CSS.escape(titleId)}"]`);
      const label = document.querySelector(`[data-r20-block-id="${CSS.escape(labelId)}"]`);
      if (!(root instanceof HTMLElement) || !(title instanceof HTMLElement) || !(label instanceof HTMLElement)) return false;
      const rootStyle = getComputedStyle(root);
      const titleStyle = getComputedStyle(title);
      const labelStyle = getComputedStyle(label);
      return rootStyle.backgroundColor === appearance.root.backgroundColor
        && rootStyle.borderColor === appearance.root.borderColor
        && rootStyle.borderRadius === appearance.root.borderRadius
        && rootStyle.paddingTop === appearance.root.paddingTop
        && titleStyle.backgroundColor === appearance.title.backgroundColor
        && titleStyle.color === appearance.title.color
        && titleStyle.paddingTop === appearance.title.paddingTop
        && labelStyle.color === appearance.label.color;
    }, {
      frameId: ids.frameId,
      titleId: ids.titleId,
      labelId: ids.labelId,
      appearance: expected,
    }, { timeout: 10000 });
    const sectionStyleBefore = await readSectionStylePreset();
    assert(sectionStyleBefore, 'section appearance was unavailable before applying a theme');
    const fieldLabelBeforeTheme = await frame.evaluate((blockId) => {
      const element = document.querySelector(`[data-r20-block-id="${CSS.escape(blockId)}"]`);
      if (!(element instanceof HTMLElement)) return null;
      return {
        color: getComputedStyle(element).color,
        inlineStyle: element.getAttribute('style') ?? '',
      };
    }, ids.labelId);
    await page.locator(
      `[data-testid="edit-layer-row"][data-r20-block-id="${ids.frameId}"]`,
    ).click();
    const sectionThemeFineTune = page.locator('[data-testid="design-section-fine-tune"]');
    if ((await sectionThemeFineTune.count()) === 1
      && await sectionThemeFineTune.evaluate((element) => !element.open)) {
      await page.locator('[data-testid="design-section-fine-tune-toggle"]').click();
    }
    const sectionRosePreset = page.locator('[data-testid="design-preset-section-rose"]');
    await sectionRosePreset.waitFor({ state: 'visible', timeout: 10000 });
    assert((await page.locator('[data-testid="design-section-themes"]').count()) === 1, 'coordinated section theme controls are missing');
    await sectionRosePreset.click();
    try {
      await page.waitForFunction(
        () => {
          const css = window.__perfHook.getEmitContent().css;
          return css.includes('background-color: #fff2f6')
            && css.includes('border-color: #d96b91')
            && css.includes('box-shadow: none');
        },
        null,
        { timeout: 10000 },
      );
    } catch (error) {
      const debug = await page.evaluate(() => {
        const css = window.__perfHook.getEmitContent().css;
        return {
          selectedId: window.__perfHook.getSelectedBlockId?.() ?? null,
          cssTail: css.slice(-1200),
        };
      });
      throw new Error(`section theme emit did not settle: ${JSON.stringify(debug)}`, { cause: error });
    }
    await page.waitForTimeout(300);
    result.tests.sectionStylePreset = await readSectionStylePreset();
    const sectionPresetDebug = JSON.stringify(result.tests.sectionStylePreset);
    assert(result.tests.sectionStylePreset?.root.backgroundColor === 'rgb(255, 242, 246)', `section theme fill did not reach the shared iframe: ${sectionPresetDebug}`);
    assert(result.tests.sectionStylePreset?.root.borderColor === 'rgb(217, 107, 145)', `section theme border did not reach the shared iframe: ${sectionPresetDebug}`);
    assert(result.tests.sectionStylePreset?.root.borderRadius === '6px', `section theme radius did not reach the shared iframe: ${sectionPresetDebug}`);
    assert(result.tests.sectionStylePreset?.root.paddingTop === '16px', `section theme padding did not reach the shared iframe: ${sectionPresetDebug}`);
    assert(result.tests.sectionStylePreset?.title.backgroundColor === 'rgb(217, 107, 145)', `section theme did not coordinate the title band: ${sectionPresetDebug}`);
    assert(result.tests.sectionStylePreset?.title.color === 'rgb(255, 255, 255)', `section theme did not coordinate title text: ${sectionPresetDebug}`);
    assert(result.tests.sectionStylePreset?.title.paddingTop === '8px', `section theme did not coordinate title spacing: ${sectionPresetDebug}`);
    assert(result.tests.sectionStylePreset?.label.color === fieldLabelBeforeTheme?.color, `section theme changed a nested field label: ${sectionPresetDebug}`);
    assert(result.tests.sectionStylePreset?.label.inlineStyle === fieldLabelBeforeTheme?.inlineStyle, 'section theme rewrote nested field-label inline style');
    assert(!/background|border|padding/i.test(result.tests.sectionStylePreset?.root.inlineStyle ?? ''), 'section theme leaked root presentation into inline HTML');
    assert(!/background|color|border|padding/i.test(result.tests.sectionStylePreset?.title.inlineStyle ?? ''), 'section theme leaked title presentation into inline HTML');
    const sectionStyleApplied = JSON.parse(JSON.stringify(result.tests.sectionStylePreset));
    assert(await historyUndoButton.isEnabled(), 'section theme did not create an undo step');
    await historyUndoButton.click();
    await waitForSectionStylePreset(sectionStyleBefore);
    const sectionStyleUndo = await readSectionStylePreset();
    assert(await historyRedoButton.isEnabled(), 'section theme undo did not create a redo step');
    await historyRedoButton.click();
    await waitForSectionStylePreset(sectionStyleApplied);
    const sectionStyleRedo = await readSectionStylePreset();
    result.tests.sectionStylePreset.history = {
      before: sectionStyleBefore,
      undo: sectionStyleUndo,
      redo: sectionStyleRedo,
    };
    assert(
      JSON.stringify(sectionStyleUndo) === JSON.stringify(sectionStyleBefore)
        && JSON.stringify(sectionStyleRedo) === JSON.stringify(sectionStyleApplied),
      `section theme did not roundtrip in one history step: ${JSON.stringify(result.tests.sectionStylePreset.history)}`,
    );
    await page.locator('[data-testid="design-section-themes"]').scrollIntoViewIfNeeded();
    await page.screenshot({
      path: path.join(REPORT_DIR, 'section-theme-editor.png'),
      fullPage: false,
    });

    await page.locator(
      `[data-testid="edit-layer-row"][data-r20-block-id="${ids.rowBId}"]`,
    ).click();

    const sectionAccentLeft = page.locator('[data-testid="design-section-accent-left"]');
    await sectionAccentLeft.waitFor({ state: 'visible', timeout: 10000 });
    await sectionAccentLeft.click();
    await page.locator('[data-testid="design-section-accent-color-mint"]').click();
    await page.locator('[data-testid="design-section-accent-width-6"]').click();
    await page.locator('[data-testid="design-section-shadow-lifted"]').click();
    await page.locator('[data-testid="design-section-corner-8"]').click();
    await page.locator('[data-testid="design-section-padding-24"]').click();
    await page.waitForFunction(
      () => {
        const css = window.__perfHook.getEmitContent().css;
        return css.includes('border-left-width: 6px')
          && css.includes('border-left-style: solid')
          && css.includes('border-left-color: #4ea88b')
          && css.includes('box-shadow: 0 8px 20px rgba(73, 45, 57, 0.16)')
          && css.includes('border-radius: 8px')
          && css.includes('padding: 24px');
      },
      null,
      { timeout: 10000 },
    );
    await page.waitForTimeout(300);
    result.tests.sectionDecoration = await frame.evaluate((blockId) => {
      const element = document.querySelector(`[data-r20-block-id="${CSS.escape(blockId)}"]`);
      if (!(element instanceof HTMLElement)) return null;
      const style = getComputedStyle(element);
      return {
        inlineStyle: element.getAttribute('style') ?? '',
        borderLeftWidth: style.borderLeftWidth,
        borderLeftStyle: style.borderLeftStyle,
        borderLeftColor: style.borderLeftColor,
        boxShadow: style.boxShadow,
        borderRadius: style.borderRadius,
        paddingTop: style.paddingTop,
      };
    }, ids.rowBId);
    const sectionDecorationDebug = JSON.stringify(result.tests.sectionDecoration);
    assert(result.tests.sectionDecoration?.borderLeftWidth === '6px', `section accent width did not render: ${sectionDecorationDebug}`);
    assert(result.tests.sectionDecoration?.borderLeftStyle === 'solid', `section accent style did not render: ${sectionDecorationDebug}`);
    assert(result.tests.sectionDecoration?.borderLeftColor === 'rgb(78, 168, 139)', `section accent color did not render: ${sectionDecorationDebug}`);
    assert(result.tests.sectionDecoration?.boxShadow !== 'none', `section shadow did not render: ${sectionDecorationDebug}`);
    assert(result.tests.sectionDecoration?.borderRadius === '8px', `section corner choice did not render: ${sectionDecorationDebug}`);
    assert(result.tests.sectionDecoration?.paddingTop === '24px', `section padding choice did not render: ${sectionDecorationDebug}`);
    assert(!/border|box-shadow|padding/i.test(result.tests.sectionDecoration?.inlineStyle ?? ''), 'section decoration leaked presentation into inline HTML');
    await page.locator('[data-testid="design-section-decoration"]').scrollIntoViewIfNeeded();
    await page.screenshot({
      path: path.join(REPORT_DIR, 'section-decoration-editor.png'),
      fullPage: false,
    });

    const syntheticBackgroundUrl = `http://127.0.0.1:${PORT}${BASE_PATH}/synthetic-background.png`;
    const backgroundUrlInput = page.locator('[data-testid="design-background-url"]');
    await backgroundUrlInput.waitFor({ state: 'visible', timeout: 10000 });
    await backgroundUrlInput.fill(syntheticBackgroundUrl);
    await backgroundUrlInput.press('Enter');
    await page.locator('[data-testid="design-background-size"]').selectOption('contain');
    await page.locator('[data-testid="design-background-repeat"]').selectOption('repeat-x');
    await page.locator('[data-testid="design-background-position-right-bottom"]').click();
    await page.waitForFunction(
      (assetUrl) => {
        const css = window.__perfHook.getEmitContent().css;
        return css.includes(`background-image: url("${assetUrl}")`)
          && css.includes('background-size: contain')
          && css.includes('background-position: right bottom')
          && css.includes('background-repeat: repeat-x');
      },
      syntheticBackgroundUrl,
      { timeout: 10000 },
    );
    await page.waitForTimeout(300);
    result.tests.sectionBackgroundImage = await frame.evaluate((blockId) => {
      const element = document.querySelector(`[data-r20-block-id="${CSS.escape(blockId)}"]`);
      if (!(element instanceof HTMLElement)) return null;
      const style = getComputedStyle(element);
      return {
        inlineStyle: element.getAttribute('style') ?? '',
        backgroundImage: style.backgroundImage,
        backgroundSize: style.backgroundSize,
        backgroundPosition: style.backgroundPosition,
        backgroundRepeat: style.backgroundRepeat,
      };
    }, ids.rowBId);
    const backgroundDebug = JSON.stringify(result.tests.sectionBackgroundImage);
    assert(result.tests.sectionBackgroundImage?.backgroundImage.includes('/synthetic-background.png'), `section background image did not render: ${backgroundDebug}`);
    assert(result.tests.sectionBackgroundImage?.backgroundSize === 'contain', `section background sizing did not render: ${backgroundDebug}`);
    assert(result.tests.sectionBackgroundImage?.backgroundPosition === '100% 100%', `section background position did not render: ${backgroundDebug}`);
    assert(result.tests.sectionBackgroundImage?.backgroundRepeat === 'repeat-x', `section background repeat did not render: ${backgroundDebug}`);
    assert(!/background/i.test(result.tests.sectionBackgroundImage?.inlineStyle ?? ''), 'section background image leaked into inline HTML');
    assert((await page.locator('[data-testid="design-background-http-warning"]').count()) === 1, 'HTTP background warning is missing');
    await page.locator('[data-testid="design-background-preview"]').scrollIntoViewIfNeeded();
    await page.screenshot({
      path: path.join(REPORT_DIR, 'section-background-editor.png'),
      fullPage: false,
    });

    await page.locator(
      `[data-testid="edit-layer-row"][data-r20-block-id="${ids.rowAId}"]`,
    ).click();
    const controlGroupMintPreset = page.locator('[data-testid="design-preset-control-group-mint"]');
    await controlGroupMintPreset.waitFor({ state: 'visible', timeout: 10000 });
    assert((await page.locator('[data-testid="design-control-group-themes"]').count()) === 1, 'control-group theme controls are missing for an input row');
    assert((await page.locator('[data-testid="design-section-themes"]').count()) === 0, 'input row still exposes the broader section theme controls');
    await controlGroupMintPreset.click();
    await frame.waitForFunction(
      ({ rowId, labelId, inputId }) => {
        const row = document.querySelector(`[data-r20-block-id="${CSS.escape(rowId)}"]`);
        const label = document.querySelector(`[data-r20-block-id="${CSS.escape(labelId)}"]`);
        const input = document.querySelector(`[data-r20-block-id="${CSS.escape(inputId)}"]`);
        if (!(row instanceof HTMLElement) || !(label instanceof HTMLElement) || !(input instanceof HTMLElement)) return false;
        const rowStyle = getComputedStyle(row);
        const labelStyle = getComputedStyle(label);
        const inputStyle = getComputedStyle(input);
        return rowStyle.backgroundColor === 'rgb(242, 251, 247)'
          && labelStyle.color === 'rgb(36, 113, 91)'
          && inputStyle.borderColor === 'rgb(105, 185, 159)';
      },
      { rowId: ids.rowAId, labelId: ids.labelId, inputId: ids.rowAInputId },
      { timeout: 10000 },
    );
    result.tests.controlGroupInputTheme = await frame.evaluate(({ rowId, labelId, inputId }) => {
      const row = document.querySelector(`[data-r20-block-id="${CSS.escape(rowId)}"]`);
      const label = document.querySelector(`[data-r20-block-id="${CSS.escape(labelId)}"]`);
      const input = document.querySelector(`[data-r20-block-id="${CSS.escape(inputId)}"]`);
      if (!(row instanceof HTMLElement) || !(label instanceof HTMLElement) || !(input instanceof HTMLElement)) return null;
      const rowStyle = getComputedStyle(row);
      const labelStyle = getComputedStyle(label);
      const inputStyle = getComputedStyle(input);
      return {
        root: {
          inlineStyle: row.getAttribute('style') ?? '',
          display: rowStyle.display,
          backgroundColor: rowStyle.backgroundColor,
          borderColor: rowStyle.borderColor,
          borderRadius: rowStyle.borderRadius,
          gap: rowStyle.gap,
        },
        label: {
          inlineStyle: label.getAttribute('style') ?? '',
          backgroundColor: labelStyle.backgroundColor,
          color: labelStyle.color,
          fontWeight: labelStyle.fontWeight,
        },
        control: {
          inlineStyle: input.getAttribute('style') ?? '',
          backgroundColor: inputStyle.backgroundColor,
          color: inputStyle.color,
          borderColor: inputStyle.borderColor,
          borderRadius: inputStyle.borderRadius,
          paddingTop: inputStyle.paddingTop,
        },
      };
    }, { rowId: ids.rowAId, labelId: ids.labelId, inputId: ids.rowAInputId });
    const controlGroupInputDebug = JSON.stringify(result.tests.controlGroupInputTheme);
    assert(result.tests.controlGroupInputTheme?.root.display === 'flex', `control-group root did not become one line: ${controlGroupInputDebug}`);
    assert(result.tests.controlGroupInputTheme?.root.backgroundColor === 'rgb(242, 251, 247)', `control-group root fill did not render: ${controlGroupInputDebug}`);
    assert(result.tests.controlGroupInputTheme?.root.borderColor === 'rgb(155, 211, 192)', `control-group root border did not render: ${controlGroupInputDebug}`);
    assert(result.tests.controlGroupInputTheme?.root.borderRadius === '6px', `control-group root corner did not render: ${controlGroupInputDebug}`);
    assert(result.tests.controlGroupInputTheme?.root.gap === '8px', `control-group spacing did not render: ${controlGroupInputDebug}`);
    assert(result.tests.controlGroupInputTheme?.label.backgroundColor === 'rgba(0, 0, 0, 0)', `control-group label background changed unexpectedly: ${controlGroupInputDebug}`);
    assert(result.tests.controlGroupInputTheme?.label.color === 'rgb(36, 113, 91)', `control-group label color did not render: ${controlGroupInputDebug}`);
    assert(result.tests.controlGroupInputTheme?.label.fontWeight === '700', `control-group label weight did not render: ${controlGroupInputDebug}`);
    assert(result.tests.controlGroupInputTheme?.control.backgroundColor === 'rgb(255, 255, 255)', `control-group input fill did not render: ${controlGroupInputDebug}`);
    assert(result.tests.controlGroupInputTheme?.control.borderColor === 'rgb(105, 185, 159)', `control-group input border did not render: ${controlGroupInputDebug}`);
    assert(result.tests.controlGroupInputTheme?.control.borderRadius === '5px', `control-group input corner did not render: ${controlGroupInputDebug}`);
    assert(result.tests.controlGroupInputTheme?.control.paddingTop === '7px', `control-group input spacing did not render: ${controlGroupInputDebug}`);
    assert(!/display|background|border|padding|gap/i.test(result.tests.controlGroupInputTheme?.root.inlineStyle ?? ''), 'control-group root theme leaked into inline HTML');
    assert(!/background|color|border|padding|font|box-shadow/i.test(result.tests.controlGroupInputTheme?.label.inlineStyle ?? ''), 'control-group label theme leaked into inline HTML');
    assert(!/background|color|border|padding|font|box-shadow/i.test(result.tests.controlGroupInputTheme?.control.inlineStyle ?? ''), 'control-group input theme leaked into inline HTML');
    await page.locator('[data-testid="design-control-group-themes"]').scrollIntoViewIfNeeded();
    await page.screenshot({
      path: path.join(REPORT_DIR, 'control-group-input-theme-editor.png'),
      fullPage: false,
    });

    await page.locator(
      `[data-testid="edit-layer-row"][data-r20-block-id="${ids.titleId}"]`,
    ).click();
    const textDecorationSide = page.locator('[data-testid="design-text-decoration-side"]');
    await textDecorationSide.waitFor({ state: 'visible', timeout: 10000 });
    await textDecorationSide.click();
    await page.locator('[data-testid="design-text-decoration-color-gold"]').click();
    await page.locator('[data-testid="design-text-decoration-align-center"]').click();
    await page.locator('[data-testid="design-text-decoration-size-22"]').click();
    await page.locator('[data-testid="design-text-decoration-weight-900"]').click();
    await page.waitForFunction(
      () => {
        const css = window.__perfHook.getEmitContent().css;
        return css.includes('border-width: 0 0 0 4px')
          && css.includes('border-color: #c9943e')
          && css.includes('text-align: center')
          && css.includes('font-size: 22px')
          && css.includes('font-weight: 900');
      },
      null,
      { timeout: 10000 },
    );
    await page.waitForTimeout(300);
    result.tests.textDecoration = await frame.evaluate((blockId) => {
      const element = document.querySelector(`[data-r20-block-id="${CSS.escape(blockId)}"]`);
      if (!(element instanceof HTMLElement)) return null;
      const style = getComputedStyle(element);
      return {
        inlineStyle: element.getAttribute('style') ?? '',
        backgroundColor: style.backgroundColor,
        color: style.color,
        borderLeftWidth: style.borderLeftWidth,
        borderLeftStyle: style.borderLeftStyle,
        borderLeftColor: style.borderLeftColor,
        paddingLeft: style.paddingLeft,
        textAlign: style.textAlign,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
      };
    }, ids.titleId);
    const textDecorationDebug = JSON.stringify(result.tests.textDecoration);
    assert(result.tests.textDecoration?.backgroundColor === 'rgba(0, 0, 0, 0)', `text decoration background changed unexpectedly: ${textDecorationDebug}`);
    assert(result.tests.textDecoration?.color === 'rgb(109, 75, 21)', `text decoration foreground did not render: ${textDecorationDebug}`);
    assert(result.tests.textDecoration?.borderLeftWidth === '4px', `text decoration side width did not render: ${textDecorationDebug}`);
    assert(result.tests.textDecoration?.borderLeftStyle === 'solid', `text decoration side style did not render: ${textDecorationDebug}`);
    assert(result.tests.textDecoration?.borderLeftColor === 'rgb(201, 148, 62)', `text decoration side color did not render: ${textDecorationDebug}`);
    assert(result.tests.textDecoration?.paddingLeft === '8px', `text decoration padding did not render: ${textDecorationDebug}`);
    assert(result.tests.textDecoration?.textAlign === 'center', `text decoration alignment did not render: ${textDecorationDebug}`);
    assert(result.tests.textDecoration?.fontSize === '22px', `text decoration size did not render: ${textDecorationDebug}`);
    assert(result.tests.textDecoration?.fontWeight === '900', `text decoration weight did not render: ${textDecorationDebug}`);
    assert(!/font|border|background|padding|text-align/i.test(result.tests.textDecoration?.inlineStyle ?? ''), 'text decoration leaked presentation into inline HTML');
    const textDecorationBackgroundField = page.locator('[data-testid="design-style-background-text"]');
    result.tests.textDecorationColorField = {
      value: await textDecorationBackgroundField.inputValue(),
      placeholder: await textDecorationBackgroundField.getAttribute('placeholder'),
    };
    assert(
      result.tests.textDecorationColorField.value === ''
        && result.tests.textDecorationColorField.placeholder === '투명',
      `transparent text decoration exposed raw CSS: ${JSON.stringify(result.tests.textDecorationColorField)}`,
    );
    await page.locator('[data-testid="design-text-decoration"]').scrollIntoViewIfNeeded();
    await page.screenshot({
      path: path.join(REPORT_DIR, 'text-decoration-editor.png'),
      fullPage: false,
    });

    await page.locator(
      `[data-testid="edit-layer-row"][data-r20-block-id="${ids.labelId}"]`,
    ).click();
    await page.locator('[data-testid="design-text-decoration-tag"]').click();
    await page.locator('[data-testid="design-text-decoration-color-mint"]').click();
    await page.locator('[data-testid="design-text-decoration-align-left"]').click();
    await page.locator('[data-testid="design-text-decoration-size-13"]').click();
    await page.locator('[data-testid="design-text-decoration-weight-600"]').click();
    await page.waitForFunction(
      () => {
        const css = window.__perfHook.getEmitContent().css;
        return css.includes('background-color: #e8f7f1')
          && css.includes('border-color: #4ea88b')
          && css.includes('border-radius: 999px')
          && css.includes('font-size: 13px')
          && css.includes('font-weight: 600');
      },
      null,
      { timeout: 10000 },
    );
    await page.waitForTimeout(300);
    result.tests.labelDecoration = await frame.evaluate((blockId) => {
      const element = document.querySelector(`[data-r20-block-id="${CSS.escape(blockId)}"]`);
      if (!(element instanceof HTMLElement)) return null;
      const style = getComputedStyle(element);
      return {
        inlineStyle: element.getAttribute('style') ?? '',
        backgroundColor: style.backgroundColor,
        color: style.color,
        borderWidth: style.borderWidth,
        borderStyle: style.borderStyle,
        borderColor: style.borderColor,
        borderRadius: style.borderRadius,
        paddingLeft: style.paddingLeft,
        textAlign: style.textAlign,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
      };
    }, ids.labelId);
    const labelDecorationDebug = JSON.stringify(result.tests.labelDecoration);
    assert(result.tests.labelDecoration?.backgroundColor === 'rgb(232, 247, 241)', `label decoration background did not render: ${labelDecorationDebug}`);
    assert(result.tests.labelDecoration?.color === 'rgb(40, 92, 76)', `label decoration foreground did not render: ${labelDecorationDebug}`);
    assert(result.tests.labelDecoration?.borderWidth === '1px', `label decoration border width did not render: ${labelDecorationDebug}`);
    assert(result.tests.labelDecoration?.borderStyle === 'solid', `label decoration border style did not render: ${labelDecorationDebug}`);
    assert(result.tests.labelDecoration?.borderColor === 'rgb(78, 168, 139)', `label decoration border color did not render: ${labelDecorationDebug}`);
    assert(result.tests.labelDecoration?.borderRadius === '999px', `label decoration tag shape did not render: ${labelDecorationDebug}`);
    assert(result.tests.labelDecoration?.paddingLeft === '10px', `label decoration padding did not render: ${labelDecorationDebug}`);
    assert(result.tests.labelDecoration?.textAlign === 'left', `label decoration alignment did not render: ${labelDecorationDebug}`);
    assert(result.tests.labelDecoration?.fontSize === '13px', `label decoration size did not render: ${labelDecorationDebug}`);
    assert(result.tests.labelDecoration?.fontWeight === '600', `label decoration weight did not render: ${labelDecorationDebug}`);
    assert(!/font|border|background|padding|text-align/i.test(result.tests.labelDecoration?.inlineStyle ?? ''), 'label decoration leaked presentation into inline HTML');
    await page.locator('[data-testid="design-text-decoration"]').scrollIntoViewIfNeeded();
    await page.screenshot({
      path: path.join(REPORT_DIR, 'label-decoration-editor.png'),
      fullPage: false,
    });

    await page.locator(
      `[data-testid="edit-layer-row"][data-r20-block-id="${ids.imageId}"]`,
    ).click();
    const imageStylePanel = page.locator('[data-testid="design-image-style"]');
    await imageStylePanel.waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('[data-testid="design-image-fit-contain"]').click();
    await page.locator('[data-testid="design-image-position-right-bottom"]').click();
    await page.locator('[data-testid="design-image-opacity-0-5"]').click();
    await page.locator('[data-testid="design-image-corner-8"]').click();
    await page.waitForFunction(
      () => {
        const css = window.__perfHook.getEmitContent().css;
        return css.includes('object-fit: contain')
          && css.includes('object-position: right bottom')
          && css.includes('opacity: 0.5')
          && css.includes('border-radius: 8px');
      },
      null,
      { timeout: 10000 },
    );
    await page.waitForTimeout(300);
    result.tests.imageStyle = await frame.evaluate((blockId) => {
      const element = document.querySelector(`[data-r20-block-id="${CSS.escape(blockId)}"]`);
      if (!(element instanceof HTMLImageElement)) return null;
      const style = getComputedStyle(element);
      return {
        inlineStyle: element.getAttribute('style') ?? '',
        src: element.getAttribute('src') ?? '',
        alt: element.getAttribute('alt') ?? '',
        objectFit: style.objectFit,
        objectPosition: style.objectPosition,
        opacity: style.opacity,
        borderRadius: style.borderRadius,
        width: style.width,
        height: style.height,
      };
    }, ids.imageId);
    result.tests.imageStyleModel = await page.evaluate((blockId) => (
      window.__perfHook.getBlockFields('html', blockId)
    ), ids.imageId);
    const imageStyleDebug = JSON.stringify(result.tests.imageStyle);
    const imageSourceField = result.tests.imageStyleModel?.find((field) => field.name === 'SRC')?.value;
    assert(result.tests.imageStyle?.src.includes('synthetic-image.svg'), `rendered image source is missing: ${imageStyleDebug}`);
    assert(imageSourceField === syntheticImageUrl, `image source field changed while styling: ${JSON.stringify(result.tests.imageStyleModel)}`);
    assert(result.tests.imageStyle?.alt === 'Synthetic portrait', `image alt text changed while styling: ${imageStyleDebug}`);
    assert(result.tests.imageStyle?.objectFit === 'contain', `image fit did not render: ${imageStyleDebug}`);
    assert(result.tests.imageStyle?.objectPosition === '100% 100%', `image focus did not render: ${imageStyleDebug}`);
    assert(result.tests.imageStyle?.opacity === '0.5', `image opacity did not render: ${imageStyleDebug}`);
    assert(result.tests.imageStyle?.borderRadius === '8px', `image corner did not render: ${imageStyleDebug}`);
    assert(
      Math.abs(Number.parseFloat(result.tests.imageStyle?.width ?? '') - result.tests.directResize.afterEdit.width) <= 0.5
        && Math.abs(Number.parseFloat(result.tests.imageStyle?.height ?? '') - result.tests.directResize.afterEdit.height) <= 0.5,
      `image appearance controls changed the managed size: ${imageStyleDebug}`,
    );
    assert(!/width\s*:|height\s*:/i.test(result.tests.imageStyle?.inlineStyle ?? ''), `image resize returned to inline HTML: ${imageStyleDebug}`);
    assert(!/object-fit|object-position|opacity|border-radius/i.test(result.tests.imageStyle?.inlineStyle ?? ''), 'image presentation leaked into inline HTML');
    await imageStylePanel.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: path.join(REPORT_DIR, 'image-style-editor.png'),
      fullPage: false,
    });

    await page.locator(
      `[data-testid="edit-layer-row"][data-r20-block-id="${ids.tableId}"]`,
    ).click();
    const tablePaperPreset = page.locator('[data-testid="design-preset-table-paper"]');
    await tablePaperPreset.waitFor({ state: 'visible', timeout: 10000 });
    await tablePaperPreset.click();
    await page.waitForTimeout(300);
    result.tests.tableStylePreset = await frame.evaluate((blockId) => {
      const element = document.querySelector(`[data-r20-block-id="${CSS.escape(blockId)}"]`);
      if (!(element instanceof HTMLTableElement)) return null;
      const style = getComputedStyle(element);
      return {
        inlineStyle: element.getAttribute('style') ?? '',
        backgroundColor: style.backgroundColor,
        color: style.color,
        borderColor: style.borderColor,
        borderCollapse: style.borderCollapse,
        borderRadius: style.borderRadius,
      };
    }, ids.tableId);
    const tablePresetDebug = JSON.stringify(result.tests.tableStylePreset);
    assert(result.tests.tableStylePreset?.backgroundColor === 'rgb(255, 253, 253)', `table preset fill did not render: ${tablePresetDebug}`);
    assert(result.tests.tableStylePreset?.color === 'rgb(63, 52, 57)', `table preset text did not render: ${tablePresetDebug}`);
    assert(result.tests.tableStylePreset?.borderColor === 'rgb(223, 204, 212)', `table preset border did not render: ${tablePresetDebug}`);
    assert(result.tests.tableStylePreset?.borderCollapse === 'separate', `table preset layout did not render: ${tablePresetDebug}`);
    assert(result.tests.tableStylePreset?.borderRadius === '6px', `table preset radius did not render: ${tablePresetDebug}`);
    assert(!result.tests.tableStylePreset?.inlineStyle, 'table preset leaked presentation into inline HTML');

    await page.locator(
      `[data-testid="edit-layer-row"][data-r20-block-id="${ids.tableCellAId}"]`,
    ).click();
    const tableCellRosePreset = page.locator('[data-testid="design-preset-table-rose"]');
    await tableCellRosePreset.waitFor({ state: 'visible', timeout: 10000 });
    await tableCellRosePreset.click();
    await page.waitForTimeout(300);
    result.tests.tableCellStylePreset = await frame.evaluate((blockId) => {
      const element = document.querySelector(`[data-r20-block-id="${CSS.escape(blockId)}"]`);
      if (!(element instanceof HTMLTableCellElement)) return null;
      const style = getComputedStyle(element);
      return {
        inlineStyle: element.getAttribute('style') ?? '',
        backgroundColor: style.backgroundColor,
        color: style.color,
        borderColor: style.borderColor,
        paddingTop: style.paddingTop,
        textAlign: style.textAlign,
      };
    }, ids.tableCellAId);
    const tableCellPresetDebug = JSON.stringify(result.tests.tableCellStylePreset);
    assert(result.tests.tableCellStylePreset?.backgroundColor === 'rgb(255, 242, 246)', `table-cell preset fill did not render: ${tableCellPresetDebug}`);
    assert(result.tests.tableCellStylePreset?.color === 'rgb(93, 47, 64)', `table-cell preset text did not render: ${tableCellPresetDebug}`);
    assert(result.tests.tableCellStylePreset?.borderColor === 'rgb(226, 160, 184)', `table-cell preset border did not render: ${tableCellPresetDebug}`);
    assert(result.tests.tableCellStylePreset?.paddingTop === '8px', `table-cell preset padding did not render: ${tableCellPresetDebug}`);
    assert(result.tests.tableCellStylePreset?.textAlign === 'center', `table-cell preset alignment did not render: ${tableCellPresetDebug}`);
    assert(!result.tests.tableCellStylePreset?.inlineStyle, 'table-cell preset leaked presentation into inline HTML');
    await page.screenshot({
      path: path.join(REPORT_DIR, 'table-style-gallery.png'),
      fullPage: false,
    });

    await page.locator(
      `[data-testid="edit-layer-row"][data-r20-block-id="${ids.rowBInputId}"]`,
    ).click();
    const controlSoftPreset = page.locator('[data-testid="design-preset-control-soft"]');
    await controlSoftPreset.waitFor({ state: 'visible', timeout: 10000 });
    await controlSoftPreset.click();
    await page.waitForTimeout(300);
    result.tests.controlStylePreset = await frame.evaluate((blockId) => {
      const element = document.querySelector(`[data-r20-block-id="${CSS.escape(blockId)}"]`);
      if (!(element instanceof HTMLElement)) return null;
      const style = getComputedStyle(element);
      return {
        inlineStyle: element.getAttribute('style') ?? '',
        backgroundColor: style.backgroundColor,
        color: style.color,
        borderColor: style.borderColor,
        borderRadius: style.borderRadius,
        paddingTop: style.paddingTop,
      };
    }, ids.rowBInputId);
    const controlPresetDebug = JSON.stringify(result.tests.controlStylePreset);
    assert(result.tests.controlStylePreset?.backgroundColor === 'rgb(255, 242, 246)', `input preset fill did not render: ${controlPresetDebug}`);
    assert(result.tests.controlStylePreset?.color === 'rgb(93, 47, 64)', `input preset text did not render: ${controlPresetDebug}`);
    assert(result.tests.controlStylePreset?.borderColor === 'rgb(231, 175, 195)', `input preset border did not render: ${controlPresetDebug}`);
    assert(result.tests.controlStylePreset?.borderRadius === '6px', `input preset radius did not render: ${controlPresetDebug}`);
    assert(result.tests.controlStylePreset?.paddingTop === '7px', `input preset padding did not render: ${controlPresetDebug}`);
    assert(!result.tests.controlStylePreset?.inlineStyle, 'input preset leaked presentation into inline HTML');
    await page.locator(
      `[data-testid="edit-layer-row"][data-r20-block-id="${ids.rowBId}"]`,
    ).click();

    const rollButtonCard = page.locator('[data-testid="widget-card-roll-button"]');
    assert((await rollButtonCard.count()) === 1, 'friendly Roll button preset is missing');
    await page.click('[data-testid="edit-placement-flow"]');
    result.tests.rollButtonDrop = await frame.evaluate(() => {
      const target = document.querySelector('.sheet-row-b');
      if (!target) return { dispatched: false, reason: 'missing styled row target' };
      const rect = target.getBoundingClientRect();
      const dataTransfer = new DataTransfer();
      dataTransfer.setData('application/x-r20-friendly-widget', JSON.stringify({ id: 'roll-button' }));
      const init = {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + rect.width - 8,
        clientY: rect.top + rect.height / 2,
      };
      const dragover = new DragEvent('dragover', init);
      Object.defineProperty(dragover, 'dataTransfer', { value: dataTransfer });
      target.dispatchEvent(dragover);
      const drop = new DragEvent('drop', init);
      Object.defineProperty(drop, 'dataTransfer', { value: dataTransfer });
      target.dispatchEvent(drop);
      return {
        dispatched: true,
        dragoverPrevented: dragover.defaultPrevented,
        dropPrevented: drop.defaultPrevented,
      };
    });
    assert(result.tests.rollButtonDrop.dispatched, 'friendly Roll button drop did not dispatch');
    await page.waitForFunction(
      () => window.__perfHook.getEmitContent().html.includes('roll_check'),
      null,
      { timeout: 10000 },
    );
    const rollButton = frame.locator('button[name="roll_check"]');
    await rollButton.waitFor({ state: 'visible', timeout: 10000 });
    result.tests.rollButtonPreset = await rollButton.evaluate((button) => ({
      value: button.getAttribute('value'),
      inlineStyle: button.getAttribute('style') ?? '',
      className: button.className,
      parentClassName: button.parentElement?.className ?? '',
    }));
    assert(
      result.tests.rollButtonPreset.value?.includes('&{template:default}')
        && result.tests.rollButtonPreset.value?.includes('[[1d20]]'),
      'friendly Roll button did not emit the default Roll20 template command',
    );
    assert(!result.tests.rollButtonPreset.inlineStyle, 'friendly Roll button emitted inline presentation CSS');
    assert(result.tests.rollButtonPreset.parentClassName.includes('sheet-row-b'), 'friendly Roll button did not enter the selected flow section');

    result.tests.rollButtonLayer = await page.evaluate((parentId) => {
      const nodes = window.__perfHook.getLayerSnapshot('html');
      const button = nodes.find((node) => node.type.startsWith('r20_roll_button') && node.layerParentId === parentId);
      return button ? { id: button.id, type: button.type, parentId: button.layerParentId } : null;
    }, ids.rowBId);
    assert(result.tests.rollButtonLayer?.id, 'dropped Roll button layer was not found');
    await page.locator(
      `[data-testid="edit-layer-row"][data-r20-block-id="${result.tests.rollButtonLayer.id}"]`,
    ).click();
    const rollRibbonTheme = page.locator('[data-testid="design-roll-button-theme-ribbon"]');
    await rollRibbonTheme.waitFor({ state: 'visible', timeout: 10000 });
    assert((await page.locator('[data-testid="design-roll-button-themes"]').count()) === 1, 'coordinated Roll button theme gallery is missing');
    assert((await page.locator('[data-testid="design-style-presets"]').count()) === 0, 'base Roll button still exposes the old single-state gallery');
    await rollRibbonTheme.click();
    await page.waitForFunction(
      () => {
        const css = window.__perfHook.getEmitContent().css;
        return css.includes('background-color: #f6bfd2')
          && css.includes('background-image: none')
          && css.includes('box-shadow: 0 3px 0 #b94f75')
          && css.includes(':hover')
          && css.includes('background-color: #f9d0de')
          && css.includes(':active')
          && css.includes('background-color: #eca4bc')
          && css.includes(':focus')
          && css.includes('outline: 2px solid #d96b91')
          && css.includes('::before')
          && css.includes('font-size: 1.15em');
      },
      null,
      { timeout: 10000 },
    );
    await page.waitForTimeout(300);
    result.tests.rollButtonTheme = await rollButton.evaluate((button) => {
      const style = getComputedStyle(button);
      const icon = getComputedStyle(button, '::before');
      return {
        inlineStyle: button.getAttribute('style') ?? '',
        backgroundColor: style.backgroundColor,
        backgroundImage: style.backgroundImage,
        color: style.color,
        borderColor: style.borderColor,
        borderRadius: style.borderRadius,
        paddingTop: style.paddingTop,
        boxShadow: style.boxShadow,
        icon: {
          content: icon.content,
          display: icon.display,
          fontFamily: icon.fontFamily,
          fontSize: icon.fontSize,
          marginRight: icon.marginRight,
          color: icon.color,
        },
      };
    });
    const rollThemeDebug = JSON.stringify(result.tests.rollButtonTheme);
    assert(result.tests.rollButtonTheme.backgroundColor === 'rgb(246, 191, 210)', `Roll button theme fill did not render: ${rollThemeDebug}`);
    assert(result.tests.rollButtonTheme.backgroundImage === 'none', `Roll button theme did not remove the baseline gradient: ${rollThemeDebug}`);
    assert(result.tests.rollButtonTheme.color === 'rgb(84, 37, 55)', `Roll button theme text color did not render: ${rollThemeDebug}`);
    assert(result.tests.rollButtonTheme.borderColor === 'rgb(201, 86, 127)', `Roll button theme border did not render: ${rollThemeDebug}`);
    assert(result.tests.rollButtonTheme.borderRadius === '5px', `Roll button theme radius did not render: ${rollThemeDebug}`);
    assert(result.tests.rollButtonTheme.paddingTop === '7px', `Roll button theme padding did not render: ${rollThemeDebug}`);
    assert(result.tests.rollButtonTheme.icon.display === 'inline-block', `Roll button theme icon display did not render: ${rollThemeDebug}`);
    assert(Number.parseFloat(result.tests.rollButtonTheme.icon.fontSize) > 15, `Roll button theme icon size did not render: ${rollThemeDebug}`);
    assert(result.tests.rollButtonTheme.icon.marginRight === '6px', `Roll button theme icon gap did not render: ${rollThemeDebug}`);
    assert(result.tests.rollButtonTheme.icon.color === 'rgb(84, 37, 55)', `Roll button theme icon color did not render: ${rollThemeDebug}`);
    assert(/dicefontd20/i.test(result.tests.rollButtonTheme.icon.fontFamily), `Roll button theme replaced the Roll20 d20 font: ${rollThemeDebug}`);
    assert(result.tests.rollButtonTheme.icon.content !== 'none', `Roll button theme removed the Roll20 d20 content: ${rollThemeDebug}`);
    assert(!result.tests.rollButtonTheme.inlineStyle, 'Roll button theme leaked presentation into inline HTML');

    await rollButton.hover();
    await page.waitForTimeout(120);
    result.tests.rollButtonThemeHover = await rollButton.evaluate((button) => {
      const style = getComputedStyle(button);
      return {
        backgroundColor: style.backgroundColor,
        color: style.color,
        borderColor: style.borderColor,
      };
    });
    assert(
      JSON.stringify(result.tests.rollButtonThemeHover) === JSON.stringify({
        backgroundColor: 'rgb(249, 208, 222)',
        color: 'rgb(84, 37, 55)',
        borderColor: 'rgb(185, 79, 117)',
      }),
      `coordinated Roll hover did not render: ${JSON.stringify(result.tests.rollButtonThemeHover)}`,
    );
    await page.mouse.move(0, 0);
    await rollButton.evaluate((button) => button.focus());
    await page.waitForTimeout(80);
    result.tests.rollButtonThemeFocus = await rollButton.evaluate((button) => {
      const style = getComputedStyle(button);
      return {
        outlineColor: style.outlineColor,
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        outlineOffset: style.outlineOffset,
      };
    });
    assert(
      JSON.stringify(result.tests.rollButtonThemeFocus) === JSON.stringify({
        outlineColor: 'rgb(217, 107, 145)',
        outlineStyle: 'solid',
        outlineWidth: '2px',
        outlineOffset: '2px',
      }),
      `coordinated Roll focus did not render: ${JSON.stringify(result.tests.rollButtonThemeFocus)}`,
    );
    await page.locator('[data-testid="design-roll-button-themes"]').scrollIntoViewIfNeeded();
    await page.screenshot({
      path: path.join(REPORT_DIR, 'roll-button-theme-editor.png'),
      fullPage: false,
    });

    const rollIconHiddenPreset = page.locator('[data-testid="design-roll-icon-preset-hidden"]');
    const rollIconLargePreset = page.locator('[data-testid="design-roll-icon-preset-large"]');
    await rollIconHiddenPreset.waitFor({ state: 'visible', timeout: 10000 });
    await rollIconHiddenPreset.click();
    await page.waitForFunction(
      () => window.__perfHook.getEmitContent().css.includes('::before')
        && window.__perfHook.getEmitContent().css.includes('display: none'),
      null,
      { timeout: 10000 },
    );
    await frame.waitForFunction(
      (blockId) => {
        const button = document.querySelector(`[data-r20-block-id="${CSS.escape(blockId)}"]`);
        return button instanceof HTMLElement && getComputedStyle(button, '::before').display === 'none';
      },
      result.tests.rollButtonLayer.id,
      { timeout: 10000 },
    );
    result.tests.rollButtonIconHidden = await rollButton.evaluate((button) => (
      getComputedStyle(button, '::before').display
    ));
    assert(result.tests.rollButtonIconHidden === 'none', 'Roll button icon hide preset did not render');

    await rollIconLargePreset.click();
    await page.waitForFunction(
      () => {
        const css = window.__perfHook.getEmitContent().css;
        return css.includes('::before')
          && css.includes('font-size: 1.3em')
          && css.includes('margin-right: 6px')
          && css.includes('display: inline-block');
      },
      null,
      { timeout: 10000 },
    );
    await page.waitForTimeout(200);
    result.tests.rollButtonIconStyle = await rollButton.evaluate((button) => {
      const style = getComputedStyle(button, '::before');
      return {
        content: style.content,
        display: style.display,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        marginRight: style.marginRight,
        opacity: style.opacity,
        color: style.color,
        textShadow: style.textShadow,
        inlineStyle: button.getAttribute('style') ?? '',
      };
    });
    const rollIconDebug = JSON.stringify(result.tests.rollButtonIconStyle);
    assert(result.tests.rollButtonIconStyle.display === 'inline-block', `Roll button icon display did not render: ${rollIconDebug}`);
    assert(Number.parseFloat(result.tests.rollButtonIconStyle.fontSize) > 18, `Roll button icon size did not render: ${rollIconDebug}`);
    assert(result.tests.rollButtonIconStyle.marginRight === '6px', `Roll button icon gap did not render: ${rollIconDebug}`);
    assert(result.tests.rollButtonIconStyle.opacity === '1', `Roll button icon opacity did not render: ${rollIconDebug}`);
    assert(result.tests.rollButtonIconStyle.color === 'rgb(84, 37, 55)', `Roll button icon color did not inherit the button: ${rollIconDebug}`);
    assert(/dicefontd20/i.test(result.tests.rollButtonIconStyle.fontFamily), `Roll20 d20 icon font was replaced: ${rollIconDebug}`);
    assert(result.tests.rollButtonIconStyle.content !== 'none', `Roll20 d20 icon content disappeared: ${rollIconDebug}`);
    assert(!result.tests.rollButtonIconStyle.inlineStyle, 'Roll button icon style leaked into inline HTML');
    const rollIconColorText = page.locator('[data-testid="design-roll-icon-color-text"]');
    result.tests.rollButtonIconColorField = {
      value: await rollIconColorText.inputValue(),
      placeholder: await rollIconColorText.getAttribute('placeholder'),
    };
    assert(
      result.tests.rollButtonIconColorField.value === ''
        && result.tests.rollButtonIconColorField.placeholder === '버튼 글자색 사용 중',
      `Roll button inherited color was exposed as raw CSS: ${JSON.stringify(result.tests.rollButtonIconColorField)}`,
    );
    await page.locator('[data-testid="design-roll-icon-presets"]').scrollIntoViewIfNeeded();
    await page.screenshot({
      path: path.join(REPORT_DIR, 'roll-button-icon-editor.png'),
      fullPage: false,
    });

    await page.locator('[data-testid="design-style-state-hover"]').click();
    const rollHoverMintPreset = page.locator('[data-testid="design-preset-button-mint"]');
    await rollHoverMintPreset.click();
    await page.waitForFunction(
      () => {
        const css = window.__perfHook.getEmitContent().css;
        return css.includes(':hover')
          && css.includes('background-color: #f2fbf7')
          && css.includes('border-color: #69b99f');
      },
      null,
      { timeout: 10000 },
    );
    await rollButton.hover();
    await page.waitForTimeout(120);
    result.tests.rollButtonHoverStyle = await rollButton.evaluate((button) => {
      const style = getComputedStyle(button);
      return {
        backgroundColor: style.backgroundColor,
        color: style.color,
        borderColor: style.borderColor,
        borderRadius: style.borderRadius,
        inlineStyle: button.getAttribute('style') ?? '',
      };
    });
    const rollHoverDebug = JSON.stringify(result.tests.rollButtonHoverStyle);
    assert(result.tests.rollButtonHoverStyle.backgroundColor === 'rgb(242, 251, 247)', `Roll button hover fill did not render: ${rollHoverDebug}`);
    assert(result.tests.rollButtonHoverStyle.color === 'rgb(36, 86, 72)', `Roll button hover text did not render: ${rollHoverDebug}`);
    assert(result.tests.rollButtonHoverStyle.borderColor === 'rgb(105, 185, 159)', `Roll button hover border did not render: ${rollHoverDebug}`);
    assert(!result.tests.rollButtonHoverStyle.inlineStyle, 'Roll button hover style leaked presentation into inline HTML');
    await page.screenshot({
      path: path.join(REPORT_DIR, 'roll-button-hover-state.png'),
      fullPage: false,
    });
    await page.mouse.move(0, 0);
    await page.locator('[data-testid="design-style-state-base"]').click();
    await rollRibbonTheme.waitFor({ state: 'visible', timeout: 10000 });
    await rollRibbonTheme.click();
    const rollDesignClass = result.tests.rollButtonPreset.className
      .split(/\s+/)
      .find((className) => className.startsWith('sheet-r20-node-'));
    assert(rollDesignClass, 'Roll button managed design class is missing');
    try {
      await page.waitForFunction(
        (className) => {
          const css = window.__perfHook.getEmitContent().css;
          const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const hover = css.match(new RegExp(`\\.${escaped}:hover\\s*\\{([^}]*)\\}`));
          const icon = css.match(new RegExp(`\\.${escaped}::before\\s*\\{([^}]*)\\}`));
          return Boolean(
            hover?.[1].includes('background-color: #f9d0de')
            && !hover?.[1].includes('border-radius: 6px')
            && icon?.[1].includes('font-size: 1.15em'),
          );
        },
        rollDesignClass,
        { timeout: 10000 },
      );
    } catch (error) {
      const debug = await page.evaluate((className) => ({
        selectedId: window.__perfHook.getSelectedBlockId?.() ?? null,
        rules: window.__perfHook.getEmitContent().css
          .split('\n')
          .filter((line) => line.includes(className)),
      }), rollDesignClass);
      throw new Error(`Roll button theme reapply did not settle: ${JSON.stringify(debug)}`, { cause: error });
    }
    await frame.waitForFunction(
      (blockId) => {
        const button = document.querySelector(`[data-r20-block-id="${CSS.escape(blockId)}"]`);
        if (!(button instanceof HTMLElement)) return false;
        const style = getComputedStyle(button);
        const icon = getComputedStyle(button, '::before');
        return style.backgroundColor === 'rgb(246, 191, 210)'
          && icon.display === 'inline-block'
          && icon.marginRight === '6px';
      },
      result.tests.rollButtonLayer.id,
      { timeout: 10000 },
    );
    result.tests.rollButtonThemeFinalIconStyle = await rollButton.evaluate((button) => {
      const style = getComputedStyle(button, '::before');
      return {
        content: style.content,
        display: style.display,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        marginRight: style.marginRight,
        opacity: style.opacity,
        color: style.color,
        textShadow: style.textShadow,
        inlineStyle: button.getAttribute('style') ?? '',
      };
    });
    await page.waitForFunction(
      () => document.querySelector('[data-r20-render-ready]')?.getAttribute('data-r20-render-ready') === '1',
      null,
      { timeout: 10000 },
    );
    await page.screenshot({
      path: path.join(REPORT_DIR, 'visual-style-editor.png'),
      fullPage: false,
    });

    await page.click('[data-testid="main-mode-preview"]');
    result.tests.sectionLayoutPreview = await readLayoutProof();
    assert(
      JSON.stringify(result.tests.sectionLayoutPreview)
        === JSON.stringify(result.tests.sectionLayoutEditFinal),
      `section layout changed between Edit and Preview: ${JSON.stringify({
        edit: result.tests.sectionLayoutEditFinal,
        preview: result.tests.sectionLayoutPreview,
      })}`,
    );
    result.tests.sectionBackgroundPreview = await frame.evaluate((blockId) => {
      const element = document.querySelector(`[data-r20-block-id="${CSS.escape(blockId)}"]`);
      if (!(element instanceof HTMLElement)) return null;
      const style = getComputedStyle(element);
      return {
        backgroundImage: style.backgroundImage,
        backgroundSize: style.backgroundSize,
        backgroundPosition: style.backgroundPosition,
        backgroundRepeat: style.backgroundRepeat,
      };
    }, ids.rowBId);
    assert(
      JSON.stringify(result.tests.sectionBackgroundPreview) === JSON.stringify({
        backgroundImage: result.tests.sectionBackgroundImage.backgroundImage,
        backgroundSize: 'contain',
        backgroundPosition: '100% 100%',
        backgroundRepeat: 'repeat-x',
      }),
      `section background changed between edit and preview: ${JSON.stringify(result.tests.sectionBackgroundPreview)}`,
    );
    result.tests.sectionDecorationPreview = await frame.evaluate((blockId) => {
      const element = document.querySelector(`[data-r20-block-id="${CSS.escape(blockId)}"]`);
      if (!(element instanceof HTMLElement)) return null;
      const style = getComputedStyle(element);
      return {
        inlineStyle: element.getAttribute('style') ?? '',
        borderLeftWidth: style.borderLeftWidth,
        borderLeftStyle: style.borderLeftStyle,
        borderLeftColor: style.borderLeftColor,
        boxShadow: style.boxShadow,
        borderRadius: style.borderRadius,
        paddingTop: style.paddingTop,
      };
    }, ids.rowBId);
    assert(
      JSON.stringify(result.tests.sectionDecorationPreview)
        === JSON.stringify(result.tests.sectionDecoration),
      `section decoration changed between edit and preview: ${JSON.stringify(result.tests.sectionDecorationPreview)}`,
    );
    result.tests.textDecorationPreview = await frame.evaluate((blockId) => {
      const element = document.querySelector(`[data-r20-block-id="${CSS.escape(blockId)}"]`);
      if (!(element instanceof HTMLElement)) return null;
      const style = getComputedStyle(element);
      return {
        inlineStyle: element.getAttribute('style') ?? '',
        backgroundColor: style.backgroundColor,
        color: style.color,
        borderLeftWidth: style.borderLeftWidth,
        borderLeftStyle: style.borderLeftStyle,
        borderLeftColor: style.borderLeftColor,
        paddingLeft: style.paddingLeft,
        textAlign: style.textAlign,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
      };
    }, ids.titleId);
    assert(
      JSON.stringify(result.tests.textDecorationPreview)
        === JSON.stringify(result.tests.textDecoration),
      `text decoration changed between edit and preview: ${JSON.stringify(result.tests.textDecorationPreview)}`,
    );
    result.tests.labelDecorationPreview = await frame.evaluate((blockId) => {
      const element = document.querySelector(`[data-r20-block-id="${CSS.escape(blockId)}"]`);
      if (!(element instanceof HTMLElement)) return null;
      const style = getComputedStyle(element);
      return {
        inlineStyle: element.getAttribute('style') ?? '',
        backgroundColor: style.backgroundColor,
        color: style.color,
        borderWidth: style.borderWidth,
        borderStyle: style.borderStyle,
        borderColor: style.borderColor,
        borderRadius: style.borderRadius,
        paddingLeft: style.paddingLeft,
        textAlign: style.textAlign,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
      };
    }, ids.labelId);
    assert(
      JSON.stringify(result.tests.labelDecorationPreview)
        === JSON.stringify(result.tests.labelDecoration),
      `label decoration changed between edit and preview: ${JSON.stringify(result.tests.labelDecorationPreview)}`,
    );
    result.tests.imageStylePreview = await frame.evaluate((blockId) => {
      const element = document.querySelector(`[data-r20-block-id="${CSS.escape(blockId)}"]`);
      if (!(element instanceof HTMLImageElement)) return null;
      const style = getComputedStyle(element);
      return {
        inlineStyle: element.getAttribute('style') ?? '',
        src: element.getAttribute('src') ?? '',
        alt: element.getAttribute('alt') ?? '',
        objectFit: style.objectFit,
        objectPosition: style.objectPosition,
        opacity: style.opacity,
        borderRadius: style.borderRadius,
        width: style.width,
        height: style.height,
      };
    }, ids.imageId);
    assert(
      JSON.stringify(result.tests.imageStylePreview) === JSON.stringify(result.tests.imageStyle),
      `image styling changed between edit and preview: ${JSON.stringify(result.tests.imageStylePreview)}`,
    );
    result.tests.rollButtonPreviewIconStyle = await rollButton.evaluate((button) => {
      const style = getComputedStyle(button, '::before');
      return {
        content: style.content,
        display: style.display,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        marginRight: style.marginRight,
        opacity: style.opacity,
        color: style.color,
        textShadow: style.textShadow,
        inlineStyle: button.getAttribute('style') ?? '',
      };
    });
    assert(
      JSON.stringify(result.tests.rollButtonPreviewIconStyle)
        === JSON.stringify(result.tests.rollButtonThemeFinalIconStyle),
      `Roll button icon changed between edit and preview: ${JSON.stringify(result.tests.rollButtonPreviewIconStyle)}`,
    );
    result.tests.rollButtonPreviewStyle = await rollButton.evaluate((button) => {
      const style = getComputedStyle(button);
      return {
        backgroundColor: style.backgroundColor,
        color: style.color,
        borderRadius: style.borderRadius,
        paddingTop: style.paddingTop,
      };
    });
    assert(
      JSON.stringify(result.tests.rollButtonPreviewStyle) === JSON.stringify({
        backgroundColor: 'rgb(246, 191, 210)',
        color: 'rgb(84, 37, 55)',
        borderRadius: '5px',
        paddingTop: '7px',
      }),
      `Roll button style changed between edit and preview: ${JSON.stringify(result.tests.rollButtonPreviewStyle)}`,
    );
    await rollButton.hover();
    await page.waitForTimeout(120);
    result.tests.rollButtonPreviewHoverStyle = await rollButton.evaluate((button) => {
      const style = getComputedStyle(button);
      return {
        backgroundColor: style.backgroundColor,
        color: style.color,
        borderColor: style.borderColor,
        borderRadius: style.borderRadius,
      };
    });
    assert(
      JSON.stringify(result.tests.rollButtonPreviewHoverStyle) === JSON.stringify({
        backgroundColor: 'rgb(249, 208, 222)',
        color: 'rgb(84, 37, 55)',
        borderColor: 'rgb(185, 79, 117)',
        borderRadius: '5px',
      }),
      `Roll button hover style changed between edit and preview: ${JSON.stringify(result.tests.rollButtonPreviewHoverStyle)}`,
    );
    await rollButton.click();
    await page.waitForSelector('[data-r20-chat-rolltemplate="1"]', { timeout: 10000 });
    await page.screenshot({
      path: path.join(REPORT_DIR, 'rolltemplate-chat-preview.png'),
      fullPage: false,
    });
    result.tests.rollButtonPreview = await page.evaluate(() => ({
      cards: document.querySelectorAll('[data-r20-chat-rolltemplate="1"]').length,
      debugLabels: [...document.querySelectorAll('[data-r20-chat-rolltemplate="1"]')]
        .filter((node) => /debug|mock/i.test(node.textContent ?? '')).length,
    }));
    assert(result.tests.rollButtonPreview.cards === 1, 'preview Roll click did not create one chat template card');
    assert(result.tests.rollButtonPreview.debugLabels === 0, 'preview Roll card exposed a debug label');
    await page.click('[data-testid="preview-exit-edit"]');
    await page.waitForSelector('[data-testid="edit-canvas-root"]');

    await page.mouse.move(0, 0);
    await page.locator('[data-testid="tab-attrs"]').click();
    await page.locator(
      `[data-testid="edit-layer-row"][data-r20-block-id="${ids.rowBId}"]`,
    ).click();
    const controlGroupRosePreset = page.locator('[data-testid="design-preset-control-group-rose"]');
    try {
      await controlGroupRosePreset.waitFor({ state: 'visible', timeout: 10000 });
    } catch (error) {
      const debug = await page.evaluate((rowId) => {
        const layers = window.__perfHook.getLayerSnapshot('html');
        return {
          selectedId: window.__perfHook.getSelectedBlockId(),
          row: layers.find((node) => node.id === rowId) ?? null,
          children: layers
            .filter((node) => node.layerParentId === rowId)
            .map((node) => ({ id: node.id, type: node.type })),
          inspectorVisible: Boolean(document.querySelector('[data-testid="edit-inspector"]')),
          groupPanelVisible: Boolean(document.querySelector('[data-testid="design-control-group-themes"]')),
          sectionPanelVisible: Boolean(document.querySelector('[data-testid="design-section-themes"]')),
        };
      }, ids.rowBId);
      throw new Error(`button-group controls did not appear: ${JSON.stringify(debug)}`, { cause: error });
    }
    await controlGroupRosePreset.click();
    await frame.waitForFunction(
      ({ rowId, inputId, buttonId }) => {
        const row = document.querySelector(`[data-r20-block-id="${CSS.escape(rowId)}"]`);
        const input = document.querySelector(`[data-r20-block-id="${CSS.escape(inputId)}"]`);
        const button = document.querySelector(`[data-r20-block-id="${CSS.escape(buttonId)}"]`);
        if (!(row instanceof HTMLElement) || !(input instanceof HTMLElement) || !(button instanceof HTMLElement)) return false;
        return getComputedStyle(row).backgroundColor === 'rgb(255, 242, 246)'
          && getComputedStyle(input).borderColor === 'rgb(217, 107, 145)'
          && getComputedStyle(button).backgroundColor === 'rgb(217, 107, 145)';
      },
      { rowId: ids.rowBId, inputId: ids.rowBInputId, buttonId: result.tests.rollButtonLayer.id },
      { timeout: 10000 },
    );
    result.tests.controlGroupRollTheme = await frame.evaluate(({ rowId, inputId, buttonId }) => {
      const row = document.querySelector(`[data-r20-block-id="${CSS.escape(rowId)}"]`);
      const input = document.querySelector(`[data-r20-block-id="${CSS.escape(inputId)}"]`);
      const button = document.querySelector(`[data-r20-block-id="${CSS.escape(buttonId)}"]`);
      if (!(row instanceof HTMLElement) || !(input instanceof HTMLElement) || !(button instanceof HTMLElement)) return null;
      const rowStyle = getComputedStyle(row);
      const inputStyle = getComputedStyle(input);
      const buttonStyle = getComputedStyle(button);
      const iconStyle = getComputedStyle(button, '::before');
      return {
        root: {
          inlineStyle: row.getAttribute('style') ?? '',
          backgroundColor: rowStyle.backgroundColor,
          display: rowStyle.display,
          gap: rowStyle.gap,
        },
        control: {
          inlineStyle: input.getAttribute('style') ?? '',
          backgroundColor: inputStyle.backgroundColor,
          borderColor: inputStyle.borderColor,
          borderRadius: inputStyle.borderRadius,
        },
        action: {
          inlineStyle: button.getAttribute('style') ?? '',
          value: button.getAttribute('value') ?? '',
          backgroundColor: buttonStyle.backgroundColor,
          color: buttonStyle.color,
          borderColor: buttonStyle.borderColor,
          borderRadius: buttonStyle.borderRadius,
          paddingTop: buttonStyle.paddingTop,
        },
        icon: {
          content: iconStyle.content,
          display: iconStyle.display,
          fontFamily: iconStyle.fontFamily,
        },
      };
    }, { rowId: ids.rowBId, inputId: ids.rowBInputId, buttonId: result.tests.rollButtonLayer.id });
    const controlGroupRollDebug = JSON.stringify(result.tests.controlGroupRollTheme);
    assert(result.tests.controlGroupRollTheme?.root.backgroundColor === 'rgb(255, 242, 246)', `button-group root fill did not render: ${controlGroupRollDebug}`);
    assert(result.tests.controlGroupRollTheme?.root.display === 'flex', `button-group root layout did not render: ${controlGroupRollDebug}`);
    assert(result.tests.controlGroupRollTheme?.root.gap === '8px', `button-group spacing did not render: ${controlGroupRollDebug}`);
    assert(result.tests.controlGroupRollTheme?.control.backgroundColor === 'rgb(255, 255, 255)', `button-group input fill did not render: ${controlGroupRollDebug}`);
    assert(result.tests.controlGroupRollTheme?.control.borderColor === 'rgb(217, 107, 145)', `button-group input border did not render: ${controlGroupRollDebug}`);
    assert(result.tests.controlGroupRollTheme?.action.backgroundColor === 'rgb(217, 107, 145)', `button-group Roll button fill did not render: ${controlGroupRollDebug}`);
    assert(result.tests.controlGroupRollTheme?.action.color === 'rgb(255, 255, 255)', `button-group Roll button text did not render: ${controlGroupRollDebug}`);
    assert(result.tests.controlGroupRollTheme?.action.borderColor === 'rgb(217, 107, 145)', `button-group Roll button border did not render: ${controlGroupRollDebug}`);
    assert(result.tests.controlGroupRollTheme?.action.borderRadius === '5px', `button-group Roll button corner did not render: ${controlGroupRollDebug}`);
    assert(result.tests.controlGroupRollTheme?.action.paddingTop === '7px', `button-group Roll button spacing did not render: ${controlGroupRollDebug}`);
    assert(result.tests.controlGroupRollTheme?.action.value.includes('&{template:default}'), 'button-group theme changed the Roll command');
    assert(result.tests.controlGroupRollTheme?.icon.display === 'inline-block', `button-group theme hid the Roll20 d20 icon: ${controlGroupRollDebug}`);
    assert(/dicefontd20/i.test(result.tests.controlGroupRollTheme?.icon.fontFamily ?? ''), `button-group theme replaced the Roll20 d20 icon font: ${controlGroupRollDebug}`);
    assert(result.tests.controlGroupRollTheme?.icon.content !== 'none', `button-group theme removed the Roll20 d20 icon content: ${controlGroupRollDebug}`);
    assert(!/background|color|border|padding|font|box-shadow/i.test(result.tests.controlGroupRollTheme?.control.inlineStyle ?? ''), 'button-group input theme leaked into inline HTML');
    assert(!result.tests.controlGroupRollTheme?.action.inlineStyle, 'button-group Roll button theme leaked into inline HTML');
    await page.locator('[data-testid="design-control-group-themes"]').scrollIntoViewIfNeeded();
    await page.screenshot({
      path: path.join(REPORT_DIR, 'control-group-roll-theme-editor.png'),
      fullPage: false,
    });

    const widthInput = page.locator('[data-testid="edit-canvas-width-input"]');
    await widthInput.fill('930');
    await widthInput.press('Enter');
    await page.waitForTimeout(250);
    result.tests.canvasWidth = await page.evaluate(() => ({
      value: document.querySelector('[data-testid="edit-canvas-width-input"]')?.value ?? null,
      iframeWidth: Math.round(document.querySelector('[data-testid="preview-iframe"]')?.getBoundingClientRect().width ?? 0),
      iframeCssWidth: Math.round(Number.parseFloat(getComputedStyle(document.querySelector('[data-testid="preview-iframe"]')).width || '0')),
      iframeOffsetWidth: document.querySelector('[data-testid="preview-iframe"]')?.offsetWidth ?? 0,
    }));
    assert(result.tests.canvasWidth.value === '930', 'canvas width input did not commit');
    assert(result.tests.canvasWidth.iframeCssWidth === 930, 'iframe CSS width did not follow canvas width input');

    const rolltemplateSubmode = page.locator('[data-testid="edit-submode-rolltemplate"]');
    assert((await rolltemplateSubmode.count()) === 1, 'rolltemplate edit submode control is missing');
    await rolltemplateSubmode.click();
    const rolltemplateWidthInput = page.locator('[data-testid="edit-canvas-width-input"]');
    await rolltemplateWidthInput.fill('410');
    await rolltemplateWidthInput.press('Enter');
    await page.waitForTimeout(250);
    result.tests.rolltemplateCanvasWidth = await page.evaluate(() => ({
      submode: document.querySelector('[data-testid="edit-canvas-root"]')?.getAttribute('data-edit-submode') ?? null,
      renderOwner: document.querySelector('[data-testid="edit-canvas-root"]')?.getAttribute('data-edit-render-owner') ?? null,
      value: document.querySelector('[data-testid="edit-canvas-width-input"]')?.value ?? null,
      iframeCssWidth: Math.round(Number.parseFloat(getComputedStyle(document.querySelector('[data-testid="preview-iframe"]')).width || '0')),
      templateCardWidth: Math.round(document.querySelector('[data-testid="rolltemplate-edit-card"]')?.getBoundingClientRect().width ?? 0),
      templateSurfaceVisible: document.querySelector('[data-testid="rolltemplate-edit-pane"]')?.getAttribute('data-visible') ?? null,
      pickerValue: document.querySelector('[data-testid="rolltemplate-picker"]')?.value ?? null,
      templateName: document.querySelector('[data-testid="rolltemplate-edit-surface"]')?.getAttribute('data-template-name') ?? null,
    }));
    assert(result.tests.rolltemplateCanvasWidth.submode === 'rolltemplate', 'rolltemplate edit submode did not activate');
    assert(result.tests.rolltemplateCanvasWidth.renderOwner === 'chat-renderer', 'rolltemplate edit mode still claims the sheet iframe');
    assert(result.tests.rolltemplateCanvasWidth.value === '410', 'rolltemplate width input did not commit');
    assert(result.tests.rolltemplateCanvasWidth.templateCardWidth === 410, 'rolltemplate card width did not follow its width input');
    assert(result.tests.rolltemplateCanvasWidth.iframeCssWidth === 930, 'rolltemplate width incorrectly resized the persistent sheet iframe');
    assert(result.tests.rolltemplateCanvasWidth.templateSurfaceVisible === 'true', 'rolltemplate edit surface is not visible');
    assert(result.tests.rolltemplateCanvasWidth.pickerValue, 'rolltemplate picker did not select a template root');
    assert(result.tests.rolltemplateCanvasWidth.templateName === 'default', 'rolltemplate picker selected the wrong template');

    const templateRow = page.locator('[data-testid="rolltemplate-edit-card"] .sheet-template-row').first();
    await templateRow.waitFor({ state: 'visible', timeout: 10000 });
    result.tests.rolltemplatePreviewValues = await page.evaluate(() => ({
      text: document.querySelector('[data-testid="rolltemplate-edit-card"]')?.textContent ?? '',
      rootBlockId: document.querySelector('[data-testid="rolltemplate-edit-card"] .sheet-rolltemplate-default')?.getAttribute('data-r20-block-id') ?? null,
      rowBlockId: document.querySelector('[data-testid="rolltemplate-edit-card"] .sheet-template-row')?.getAttribute('data-r20-block-id') ?? null,
    }));
    assert(result.tests.rolltemplatePreviewValues.text.includes('예시 이름'), 'rolltemplate editor did not render stable preview values');
    assert(result.tests.rolltemplatePreviewValues.text.includes('12'), 'rolltemplate editor did not render the result placeholder');
    assert(result.tests.rolltemplatePreviewValues.rootBlockId, 'rolltemplate root is not mapped to its source block');
    assert(result.tests.rolltemplatePreviewValues.rowBlockId, 'rolltemplate child is not mapped to its source block');

    await templateRow.evaluate((row) => {
      row.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    await page.waitForFunction((blockId) => (
      document.querySelector('[data-testid="edit-inspector"]')
      && document.querySelector(`[data-testid="rolltemplate-edit-card"] [data-r20-block-id="${CSS.escape(blockId)}"]`)?.getAttribute('data-r20-template-selected') === '1'
    ), result.tests.rolltemplatePreviewValues.rowBlockId, { timeout: 10000 });
    result.tests.rolltemplateLayerSelection = await page.evaluate((blockId) => {
      const layer = document.querySelector(`[data-testid="edit-layer-row"][data-r20-block-id="${CSS.escape(blockId)}"]`);
      return {
        exists: Boolean(layer),
        selected: layer?.getAttribute('data-r20-layer-selected') ?? null,
      };
    }, result.tests.rolltemplatePreviewValues.rowBlockId);
    assert(result.tests.rolltemplateLayerSelection.exists, 'selected rolltemplate child is missing from the layer panel');
    assert(result.tests.rolltemplateLayerSelection.selected === '1', 'layer panel did not follow rolltemplate card selection');
    const resultRosePreset = page.locator('[data-testid="design-preset-result-rose"]');
    await resultRosePreset.waitFor({ state: 'visible', timeout: 10000 });
    await resultRosePreset.click();
    await page.waitForTimeout(300);
    result.tests.rolltemplateResultPreset = await templateRow.evaluate((row) => {
      const style = getComputedStyle(row);
      return {
        background: style.backgroundColor,
        color: style.color,
        borderBottomColor: style.borderBottomColor,
        paddingTop: style.paddingTop,
        inlineStyle: row.getAttribute('style') ?? '',
      };
    });
    const resultPresetDebug = JSON.stringify(result.tests.rolltemplateResultPreset);
    assert(result.tests.rolltemplateResultPreset.background === 'rgb(255, 242, 246)', `result-row preset fill did not render: ${resultPresetDebug}`);
    assert(result.tests.rolltemplateResultPreset.color === 'rgb(93, 47, 64)', `result-row preset text did not render: ${resultPresetDebug}`);
    assert(result.tests.rolltemplateResultPreset.borderBottomColor === 'rgb(226, 160, 184)', `result-row preset border did not render: ${resultPresetDebug}`);
    assert(result.tests.rolltemplateResultPreset.paddingTop === '8px', `result-row preset padding did not render: ${resultPresetDebug}`);
    assert(!result.tests.rolltemplateResultPreset.inlineStyle, 'result-row preset leaked presentation into inline HTML');
    const templateFill = page.locator('[data-testid="design-style-background-text"]');
    await templateFill.fill('#fde7ef');
    await page.waitForFunction((blockId) => {
      const row = document.querySelector(`[data-testid="rolltemplate-edit-card"] [data-r20-block-id="${CSS.escape(blockId)}"]`);
      return row && getComputedStyle(row).backgroundColor === 'rgb(253, 231, 239)';
    }, result.tests.rolltemplatePreviewValues.rowBlockId, { timeout: 10000 });
    result.tests.rolltemplateStyleSync = await page.evaluate((blockId) => {
      const row = document.querySelector(`[data-testid="rolltemplate-edit-card"] [data-r20-block-id="${CSS.escape(blockId)}"]`);
      const emit = window.__perfHook.getEmitContent();
      const layers = window.__perfHook.getLayerSnapshot('html');
      const byId = new Map(layers.map((layer) => [layer.id, layer]));
      const layerTrace = [];
      let current = byId.get(blockId) ?? null;
      while (current && layerTrace.length < 8) {
        layerTrace.push({ id: current.id, type: current.type, parentId: current.layerParentId });
        current = current.layerParentId ? byId.get(current.layerParentId) ?? null : null;
      }
      return {
        background: row ? getComputedStyle(row).backgroundColor : null,
        inlineStyle: row?.getAttribute('style') ?? '',
        emittedCssHasColor: emit.css.includes('background-color: #fde7ef'),
        emittedCssHasTemplateScope: emit.css.includes('.sheet-rolltemplate-default .sheet-r20-node-'),
        managedColorRules: emit.css.match(/[^{}]*sheet-r20-node-[^{}]*\{[^}]*background-color:\s*#fde7ef[^}]*\}/g) ?? [],
        designClass: [...(row?.classList ?? [])].find((token) => token.startsWith('sheet-r20-node-')) ?? null,
        layerTrace,
        emittedHtmlHasInlineColor: /style="[^"]*background-color:\s*#fde7ef/i.test(emit.html),
      };
    }, result.tests.rolltemplatePreviewValues.rowBlockId);
    assert(result.tests.rolltemplateStyleSync.background === 'rgb(253, 231, 239)', 'rolltemplate visual style did not reach the card renderer');
    assert(!result.tests.rolltemplateStyleSync.inlineStyle, 'rolltemplate visual style leaked into inline HTML');
    assert(result.tests.rolltemplateStyleSync.emittedCssHasColor, 'rolltemplate visual style did not reach emitted CSS');
    assert(
      result.tests.rolltemplateStyleSync.emittedCssHasTemplateScope,
      `rolltemplate visual style was not scoped for Roll20 chat: ${JSON.stringify(result.tests.rolltemplateStyleSync)}`,
    );
    assert(!result.tests.rolltemplateStyleSync.emittedHtmlHasInlineColor, 'rolltemplate visual style was emitted inline');

    await page.locator(
      `[data-testid="edit-layer-row"][data-r20-block-id="${result.tests.rolltemplatePreviewValues.rootBlockId}"]`,
    ).click();
    const resultCardRosePreset = page.locator('[data-testid="design-preset-result-card-rose"]');
    await resultCardRosePreset.waitFor({ state: 'visible', timeout: 10000 });
    await resultCardRosePreset.click();
    await page.waitForFunction(() => {
      const root = document.querySelector('[data-testid="rolltemplate-edit-card"] .sheet-rolltemplate-default');
      return root && getComputedStyle(root).backgroundColor === 'rgb(255, 246, 249)';
    }, null, { timeout: 10000 });
    result.tests.rolltemplateCardPreset = await page.evaluate(() => {
      const root = document.querySelector('[data-testid="rolltemplate-edit-card"] .sheet-rolltemplate-default');
      const title = document.querySelector('[data-testid="rolltemplate-edit-card"] .sheet-template-title');
      const row = document.querySelector('[data-testid="rolltemplate-edit-card"] .sheet-template-row');
      const label = row?.querySelector('span') ?? null;
      const value = row?.querySelector('.inlinerollresult, strong, b') ?? row?.lastElementChild ?? null;
      const style = root ? getComputedStyle(root) : null;
      const emit = window.__perfHook.getEmitContent();
      const layerTypes = new Map(window.__perfHook.getLayerSnapshot('html').map((item) => [item.id, item.type]));
      return {
        background: style?.backgroundColor ?? null,
        color: style?.color ?? null,
        borderColor: style?.borderTopColor ?? null,
        borderWidth: style?.borderTopWidth ?? null,
        radius: style?.borderTopLeftRadius ?? null,
        width: style?.width ?? null,
        inspectorWidthValue: document.querySelector('[data-testid="design-style-width"]')?.value ?? null,
        themeControlVisible: Boolean(document.querySelector('[data-testid="design-result-card-themes"]')),
        titleBackground: title ? getComputedStyle(title).backgroundColor : null,
        titleColor: title ? getComputedStyle(title).color : null,
        rowBackground: row ? getComputedStyle(row).backgroundColor : null,
        rowBorderColor: row ? getComputedStyle(row).borderBottomColor : null,
        labelColor: label ? getComputedStyle(label).color : null,
        valueColor: value ? getComputedStyle(value).color : null,
        rowHtml: row?.innerHTML ?? null,
        descendantBlocks: [...(row?.querySelectorAll('[data-r20-block-id]') ?? [])].map((node) => ({
          id: node.getAttribute('data-r20-block-id'),
          type: layerTypes.get(node.getAttribute('data-r20-block-id')) ?? null,
          tag: node.tagName.toLowerCase(),
          className: node.className,
        })),
        inlineStyle: root?.getAttribute('style') ?? '',
        descendantInlineStyles: [title, row, label, value].map((node) => node?.getAttribute('style') ?? ''),
        emittedCssHasRootRule: emit.css.includes('.sheet-rolltemplate-default.sheet-rolltemplate-default.sheet-rolltemplate-default.sheet-rolltemplate-default'),
        emittedCssHasThemeParts: ['#d96b91', '#fff2f6', '#5d2f40', '#9f3158']
          .every((color) => emit.css.includes(color)),
        emittedHtmlHasInlineFill: /<rolltemplate\b[^>]*style="[^"]*background-color:\s*#fff6f9/i.test(emit.html),
      };
    });
    const cardPresetDebug = JSON.stringify(result.tests.rolltemplateCardPreset);
    assert(result.tests.rolltemplateCardPreset.background === 'rgb(255, 246, 249)', `result-card preset fill did not render: ${cardPresetDebug}`);
    assert(result.tests.rolltemplateCardPreset.color === 'rgb(93, 47, 64)', `result-card preset text did not render: ${cardPresetDebug}`);
    assert(result.tests.rolltemplateCardPreset.borderColor === 'rgb(217, 107, 145)', `result-card preset border did not render: ${cardPresetDebug}`);
    assert(result.tests.rolltemplateCardPreset.borderWidth === '2px', `result-card preset border width did not render: ${cardPresetDebug}`);
    assert(result.tests.rolltemplateCardPreset.radius === '6px', `result-card preset radius did not render: ${cardPresetDebug}`);
    assert(result.tests.rolltemplateCardPreset.inspectorWidthValue === '100%', `result-card width unit was misreported: ${cardPresetDebug}`);
    assert(result.tests.rolltemplateCardPreset.themeControlVisible, 'coordinated result-card theme control is missing');
    assert(result.tests.rolltemplateCardPreset.titleBackground === 'rgb(217, 107, 145)', `result-card theme did not style the title: ${cardPresetDebug}`);
    assert(result.tests.rolltemplateCardPreset.titleColor === 'rgb(255, 255, 255)', `result-card theme title lost readable text: ${cardPresetDebug}`);
    assert(result.tests.rolltemplateCardPreset.rowBackground === 'rgb(255, 242, 246)', `result-card theme did not style the row: ${cardPresetDebug}`);
    assert(result.tests.rolltemplateCardPreset.rowBorderColor === 'rgb(217, 107, 145)', `result-card theme did not style the row divider: ${cardPresetDebug}`);
    assert(result.tests.rolltemplateCardPreset.labelColor === 'rgb(93, 47, 64)', `result-card theme did not style the label: ${cardPresetDebug}`);
    assert(result.tests.rolltemplateCardPreset.valueColor === 'rgb(159, 49, 88)', `result-card theme did not style the result value: ${cardPresetDebug}`);
    assert(result.tests.rolltemplateCardPreset.emittedCssHasRootRule, 'result-card preset did not emit a Roll20 template-root CSS rule');
    assert(result.tests.rolltemplateCardPreset.emittedCssHasThemeParts, 'result-card theme parts did not reach emitted Roll20 CSS');
    assert(!result.tests.rolltemplateCardPreset.inlineStyle, 'result-card preset leaked presentation into rendered inline HTML');
    assert(result.tests.rolltemplateCardPreset.descendantInlineStyles.every((value) => !value), 'result-card theme leaked descendant presentation into inline HTML');
    assert(!result.tests.rolltemplateCardPreset.emittedHtmlHasInlineFill, 'result-card preset leaked presentation into emitted inline HTML');
    await page.screenshot({
      path: path.join(REPORT_DIR, 'rolltemplate-card-style-gallery.png'),
      fullPage: false,
    });
    const templateNameInput = page.locator('[data-testid="edit-inspector-field-name"]');
    await templateNameInput.waitFor({ state: 'visible', timeout: 10000 });
    await templateNameInput.fill('renamed');
    await page.waitForFunction((designClass) => {
      const emit = window.__perfHook.getEmitContent();
      return emit.html.includes('sheet-rolltemplate-renamed')
        && emit.css.includes(`.sheet-rolltemplate-renamed .${designClass}`)
        && emit.css.includes('.sheet-rolltemplate-renamed.sheet-rolltemplate-renamed.sheet-rolltemplate-renamed.sheet-rolltemplate-renamed')
        && !emit.css.includes(`.sheet-rolltemplate-default .${designClass}`);
    }, result.tests.rolltemplateStyleSync.designClass, { timeout: 10000 });
    await templateNameInput.fill('default');
    await page.waitForFunction((designClass) => {
      const emit = window.__perfHook.getEmitContent();
      return emit.html.includes('sheet-rolltemplate-default')
        && emit.css.includes(`.sheet-rolltemplate-default .${designClass}`)
        && emit.css.includes('.sheet-rolltemplate-default.sheet-rolltemplate-default.sheet-rolltemplate-default.sheet-rolltemplate-default')
        && !emit.css.includes(`.sheet-rolltemplate-renamed .${designClass}`);
    }, result.tests.rolltemplateStyleSync.designClass, { timeout: 10000 });
    result.tests.rolltemplateNameStyleMigration = await page.evaluate((designClass) => {
      const emit = window.__perfHook.getEmitContent();
      return {
        name: document.querySelector('[data-testid="rolltemplate-picker"]')?.value ?? null,
        restoredScope: emit.css.includes(`.sheet-rolltemplate-default .${designClass}`),
        restoredRoot: emit.css.includes('.sheet-rolltemplate-default.sheet-rolltemplate-default.sheet-rolltemplate-default.sheet-rolltemplate-default'),
        staleScope: emit.css.includes(`.sheet-rolltemplate-renamed .${designClass}`),
        staleRoot: emit.css.includes('.sheet-rolltemplate-renamed.sheet-rolltemplate-renamed.sheet-rolltemplate-renamed.sheet-rolltemplate-renamed'),
      };
    }, result.tests.rolltemplateStyleSync.designClass);
    assert(result.tests.rolltemplateNameStyleMigration.name === result.tests.rolltemplatePreviewValues.rootBlockId, 'template picker lost the renamed template root');
    assert(result.tests.rolltemplateNameStyleMigration.restoredScope, 'template style scope did not return to default');
    assert(result.tests.rolltemplateNameStyleMigration.restoredRoot, 'template root style did not return to default');
    assert(!result.tests.rolltemplateNameStyleMigration.staleScope, 'stale renamed template style scope remained');
    assert(!result.tests.rolltemplateNameStyleMigration.staleRoot, 'stale renamed template root style remained');
    await page.locator(
      `[data-testid="edit-layer-row"][data-r20-block-id="${result.tests.rolltemplatePreviewValues.rowBlockId}"]`,
    ).click();

    result.tests.rolltemplateDrop = await page.evaluate(() => {
      const target = document.querySelector('[data-testid="rolltemplate-edit-card"] .sheet-template-row');
      if (!target) return { dispatched: false };
      const dataTransfer = new DataTransfer();
      dataTransfer.setData('application/x-r20-friendly-widget', JSON.stringify({ id: 'rolltemplate-label' }));
      const init = { bubbles: true, cancelable: true };
      const dragover = new DragEvent('dragover', init);
      Object.defineProperty(dragover, 'dataTransfer', { value: dataTransfer });
      target.dispatchEvent(dragover);
      const drop = new DragEvent('drop', init);
      Object.defineProperty(drop, 'dataTransfer', { value: dataTransfer });
      target.dispatchEvent(drop);
      return { dispatched: true, dragoverPrevented: dragover.defaultPrevented, dropPrevented: drop.defaultPrevented };
    });
    assert(result.tests.rolltemplateDrop.dispatched, 'rolltemplate friendly widget drop did not dispatch');
    try {
      await page.waitForFunction(
        () => window.__perfHook.getEmitContent().html.includes('result-label'),
        null,
        { timeout: 10000 },
      );
    } catch {
      const dropDebug = await page.evaluate(() => {
        const html = window.__perfHook.getEmitContent().html;
        return {
          resultClasses: html.match(/class="[^"]*result[^"]*"/g)?.slice(-12) ?? [],
          blockCount: window.__perfHook.getLayerSnapshot('html').length,
          dropActive: document.querySelector('[data-testid="rolltemplate-edit-surface"]')
            ?.getAttribute('data-drop-active') ?? null,
        };
      });
      throw new Error(`rolltemplate label drop did not reach emit: ${JSON.stringify({
        event: result.tests.rolltemplateDrop,
        ...dropDebug,
      })}`);
    }
    result.tests.rolltemplateDrop.rendered = await page.locator('[data-testid="rolltemplate-edit-card"] .sheet-result-label').count();
    assert(result.tests.rolltemplateDrop.rendered === 1, 'dropped rolltemplate label did not render inside the card');
    await page.screenshot({
      path: path.join(REPORT_DIR, 'rolltemplate-visual-editor.png'),
      fullPage: false,
    });

    await page.click('[data-testid="tab-chat"]');
    await page.click('[data-testid="main-mode-preview"]');
    await page.waitForSelector('[data-testid="chat-list"] [data-r20-chat-rolltemplate="1"] .sheet-template-row', { timeout: 10000 });
    result.tests.rolltemplateChatSync = await page.evaluate(() => {
      const row = document.querySelector('[data-testid="chat-list"] [data-r20-chat-rolltemplate="1"] .sheet-template-row');
      const root = document.querySelector('[data-testid="chat-list"] [data-r20-chat-rolltemplate="1"] .sheet-rolltemplate-default');
      const title = document.querySelector('[data-testid="chat-list"] [data-r20-chat-rolltemplate="1"] .sheet-template-title');
      const value = row?.querySelector('.inlinerollresult, strong, b') ?? row?.lastElementChild ?? null;
      const rootStyle = root ? getComputedStyle(root) : null;
      return {
        background: row ? getComputedStyle(row).backgroundColor : null,
        titleBackground: title ? getComputedStyle(title).backgroundColor : null,
        valueColor: value ? getComputedStyle(value).color : null,
        cardBackground: rootStyle?.backgroundColor ?? null,
        cardBorderColor: rootStyle?.borderTopColor ?? null,
        cardBorderWidth: rootStyle?.borderTopWidth ?? null,
        cardRadius: rootStyle?.borderTopLeftRadius ?? null,
        addedLabel: document.querySelectorAll('[data-testid="chat-list"] .sheet-result-label').length,
      };
    });
    assert(result.tests.rolltemplateChatSync.background === 'rgb(255, 242, 246)', 'chat card did not reuse the themed row fill');
    assert(result.tests.rolltemplateChatSync.titleBackground === 'rgb(217, 107, 145)', 'chat card did not reuse the themed title fill');
    assert(result.tests.rolltemplateChatSync.valueColor === 'rgb(159, 49, 88)', 'chat card did not reuse the themed result value');
    assert(result.tests.rolltemplateChatSync.cardBackground === 'rgb(255, 246, 249)', 'chat card root did not reuse the visual editor fill');
    assert(result.tests.rolltemplateChatSync.cardBorderColor === 'rgb(217, 107, 145)', 'chat card root did not reuse the visual editor border');
    assert(result.tests.rolltemplateChatSync.cardBorderWidth === '2px', 'chat card root did not reuse the visual editor border width');
    assert(result.tests.rolltemplateChatSync.cardRadius === '6px', 'chat card root did not reuse the visual editor radius');
    assert(result.tests.rolltemplateChatSync.addedLabel === 1, 'chat card did not reuse the edited rolltemplate body');

    const creationPage = await browser.newPage({ viewport: { width: 1480, height: 960 } });
    creationPage.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    creationPage.on('pageerror', (error) => pageErrors.push(String(error)));
    await creationPage.addInitScript(() => {
      try {
        window.localStorage.setItem('__perfOn', '1');
        window.localStorage.removeItem('r20be-autosave');
        window.localStorage.removeItem('r20-ui');
      } catch {}
    });
    await creationPage.goto(result.url, { waitUntil: 'load' });
    await creationPage.waitForFunction(() => Boolean(window.__perfHook), null, { timeout: 30000 });
    await creationPage.click('[data-testid="main-mode-edit"]');
    await creationPage.click('[data-testid="edit-submode-rolltemplate"]');
    const createTemplateButton = creationPage.locator('[data-testid="rolltemplate-create"]');
    await createTemplateButton.waitFor({ state: 'visible', timeout: 10000 });
    await createTemplateButton.click();
    await creationPage.waitForSelector('[data-testid="rolltemplate-edit-card"] .sheet-result-row', { timeout: 10000 });
    result.tests.rolltemplateCreate = await creationPage.evaluate(() => {
      const emit = window.__perfHook.getEmitContent();
      const root = document.querySelector('[data-testid="rolltemplate-edit-card"] .sheet-rolltemplate-default');
      const title = document.querySelector('[data-testid="rolltemplate-edit-card"] .sheet-result-title');
      const row = document.querySelector('[data-testid="rolltemplate-edit-card"] .sheet-result-row');
      return {
        name: document.querySelector('[data-testid="rolltemplate-edit-surface"]')?.getAttribute('data-template-name') ?? null,
        title: title?.textContent ?? '',
        rowCount: document.querySelectorAll('[data-testid="rolltemplate-edit-card"] .sheet-result-row').length,
        rootBackground: root ? getComputedStyle(root).backgroundColor : null,
        rootBorder: root ? getComputedStyle(root).borderTopColor : null,
        titleBackground: title ? getComputedStyle(title).backgroundColor : null,
        titleColor: title ? getComputedStyle(title).color : null,
        rowBackground: row ? getComputedStyle(row).backgroundColor : null,
        emittedTemplate: /<rolltemplate\b[^>]*class="[^"]*sheet-rolltemplate-default[^"]*"/i.test(emit.html),
        emittedRootCss: emit.css.includes('.sheet-rolltemplate-default.sheet-rolltemplate-default.sheet-rolltemplate-default.sheet-rolltemplate-default'),
        emittedManagedCss: emit.css.includes('.sheet-r20-node-'),
      };
    });
    assert(result.tests.rolltemplateCreate.name === 'default', 'empty workspace created the wrong template name');
    assert(result.tests.rolltemplateCreate.title.includes('예시 이름'), 'new template title did not render its preview value');
    assert(result.tests.rolltemplateCreate.rowCount === 1, 'new template did not create its default result row');
    assert(result.tests.rolltemplateCreate.rootBackground === 'rgb(255, 253, 253)', 'new template did not start with the paper card fill');
    assert(result.tests.rolltemplateCreate.rootBorder === 'rgb(217, 197, 205)', 'new template did not start with the paper card border');
    assert(result.tests.rolltemplateCreate.titleBackground === 'rgb(109, 85, 96)', 'new template title did not start with the paper header fill');
    assert(result.tests.rolltemplateCreate.titleColor === 'rgb(255, 255, 255)', 'new template title did not start with readable text');
    assert(result.tests.rolltemplateCreate.rowBackground === 'rgb(255, 253, 253)', 'new template row did not start with the paper fill');
    assert(result.tests.rolltemplateCreate.emittedTemplate, 'new template did not reach emitted HTML');
    assert(result.tests.rolltemplateCreate.emittedRootCss, 'new template card style did not reach emitted CSS');
    assert(result.tests.rolltemplateCreate.emittedManagedCss, 'new template styles did not reach emitted CSS');
    await creationPage.screenshot({
      path: path.join(REPORT_DIR, 'rolltemplate-created-default.png'),
      fullPage: false,
    });
    await creationPage.close();

    result.finishedAt = new Date().toISOString();
    result.pass = consoleErrors.length === 0 && pageErrors.length === 0;
    await fs.writeFile(path.join(REPORT_DIR, 'edit-flow-smoke-results.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
    await fs.writeFile(
      path.join(REPORT_DIR, 'edit-flow-smoke-results.md'),
      [
        '# Edit Flow Smoke',
        '',
        'Synthetic-only browser verification for the persistent preview/edit iframe.',
        '',
        `- Status: ${result.pass ? 'PASS' : 'FAIL'}`,
        `- Console errors: ${consoleErrors.length}`,
        `- Page errors: ${pageErrors.length}`,
        '- Coverage: flow/free placement including scaled and rotated/skewed nested coordinates, direct on-sheet keyboard nudge and resize, docked resizing plus constrained-width layer overlay with synchronized iframe/drop-slot origin, virtualized layer Tab navigation, canvas widget and block gallery drops, layer edge auto-scroll, layer collapse/drag-hover expand, layer reorder/eject, table drop guard and mutation, cycle rejection, selection sync, managed visual styles, preview Roll/chat, sheet width, and the dedicated rolltemplate card editor with click/style/drop/chat synchronization plus empty-workspace template creation.',
        '',
      ].join('\n'),
      'utf8',
    );
    if (!result.pass) throw new Error(`browser errors: ${JSON.stringify({ consoleErrors, pageErrors })}`);
    console.log('EDIT FLOW SMOKE PASS');
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
