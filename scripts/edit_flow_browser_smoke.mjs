#!/usr/bin/env node
/**
 * Canonical iframe edit-flow browser smoke.
 *
 * The product has one persistent Roll20 iframe for preview and edit. This
 * smoke deliberately uses a synthetic sheet so no external sheet source or
 * derived evidence is retained. It verifies the user-facing interaction
 * contract: flow/free placement, canvas widget drop, layer insertion, cycle
 * protection, selection sync, and editable canvas width.
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
  const page = await browser.newPage({ viewport: { width: 1480, height: 960 } });
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

    const syntheticImageUrl = `http://127.0.0.1:${PORT}${BASE_PATH}/synthetic-image.svg`;
    const syntheticHtml = [
      '<div class="frame" style="width:520px; min-height:220px; padding:16px">',
      '  <h2 class="title" style="font-size:18px; font-weight:700">Character</h2>',
      '  <div class="row-a" style="padding:8px"><label class="field-label">Name</label><input type="text" name="attr_a" value="A"></div>',
      '  <div class="row-b" style="padding:8px"><input type="text" name="attr_b" value="B"></div>',
      `  <img class="portrait" src="${syntheticImageUrl}" alt="Synthetic portrait" style="width:160px; height:96px; object-fit:cover; object-position:center; opacity:0.9; border-radius:2px">`,
      '</div>',
      '<table class="sheet-table"><tbody><tr class="sheet-table-row">',
      '  <td class="sheet-table-cell-a"><input type="text" name="attr_table_a" value="A"></td>',
      '  <td class="sheet-table-cell-b"><input type="text" name="attr_table_b" value="B"></td>',
      '</tr></tbody></table>',
      '<div class="outside" style="width:180px; min-height:54px; padding:8px">Outside</div>',
      '<div class="group-one" style="padding:4px">Group A</div>',
      '<div class="group-two" style="padding:4px">Group B</div>',
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
      const image = document.querySelector('.sheet-portrait');
      const table = document.querySelector('.sheet-table');
      const tableBody = document.querySelector('.sheet-table tbody');
      const tableRow = document.querySelector('.sheet-table-row');
      const tableCellA = document.querySelector('.sheet-table-cell-a');
      const tableCellB = document.querySelector('.sheet-table-cell-b');
      const outside = document.querySelector('.sheet-outside');
      const groupOne = document.querySelector('.sheet-group-one');
      const groupTwo = document.querySelector('.sheet-group-two');
      return {
        frameId: frameNode?.getAttribute('data-r20-block-id') ?? null,
        titleId: title?.getAttribute('data-r20-block-id') ?? null,
        rowAId: rowA?.getAttribute('data-r20-block-id') ?? null,
        labelId: fieldLabel?.getAttribute('data-r20-block-id') ?? null,
        rowAInputId: rowAInput?.getAttribute('data-r20-block-id') ?? null,
        rowBId: rowB?.getAttribute('data-r20-block-id') ?? null,
        rowBInputId: rowBInput?.getAttribute('data-r20-block-id') ?? null,
        imageId: image?.getAttribute('data-r20-block-id') ?? null,
        tableId: table?.getAttribute('data-r20-block-id') ?? null,
        tableBodyId: tableBody?.getAttribute('data-r20-block-id') ?? null,
        tableRowId: tableRow?.getAttribute('data-r20-block-id') ?? null,
        tableCellAId: tableCellA?.getAttribute('data-r20-block-id') ?? null,
        tableCellBId: tableCellB?.getAttribute('data-r20-block-id') ?? null,
        outsideId: outside?.getAttribute('data-r20-block-id') ?? null,
        groupOneId: groupOne?.getAttribute('data-r20-block-id') ?? null,
        groupTwoId: groupTwo?.getAttribute('data-r20-block-id') ?? null,
      };
    });
    assert(
      ids.frameId && ids.titleId && ids.labelId && ids.rowAId && ids.rowAInputId && ids.rowBId && ids.rowBInputId && ids.imageId && ids.tableId && ids.tableBodyId
        && ids.tableRowId && ids.outsideId && ids.groupOneId && ids.groupTwoId,
      `synthetic structural IDs were not emitted: ${JSON.stringify(ids)}`,
    );

    const groupOneRow = page.locator(
      `[data-testid="edit-layer-row"][data-r20-block-id="${ids.groupOneId}"]`,
    );
    const groupTwoRow = page.locator(
      `[data-testid="edit-layer-row"][data-r20-block-id="${ids.groupTwoId}"]`,
    );
    await groupOneRow.click();
    await groupTwoRow.dispatchEvent('click', { bubbles: true, ctrlKey: true });
    await page.waitForTimeout(120);
    result.tests.layerMultiSelection = await frame.evaluate(({ firstId, secondId }) => ({
      selectedIds: [...document.querySelectorAll('[data-r20-selected="1"]')]
        .map((node) => node.getAttribute('data-r20-block-id'))
        .filter(Boolean),
      firstVisible: Boolean(document.querySelector(`[data-r20-block-id="${CSS.escape(firstId)}"][data-r20-selected="1"]`)),
      secondVisible: Boolean(document.querySelector(`[data-r20-block-id="${CSS.escape(secondId)}"][data-r20-selected="1"]`)),
    }), { firstId: ids.groupOneId, secondId: ids.groupTwoId });
    assert(
      result.tests.layerMultiSelection.firstVisible && result.tests.layerMultiSelection.secondVisible,
      `iframe multi-selection is not visible: ${JSON.stringify(result.tests.layerMultiSelection)}`,
    );
    await page.locator('[data-testid="edit-layer-group-selection"]').click();
    await page.waitForTimeout(900);
    result.tests.layerGrouping = await page.evaluate(({ firstId, secondId }) => {
      const graph = window.__perfHook.getLayerSnapshot('html');
      const first = graph.find((node) => node.id === firstId);
      const second = graph.find((node) => node.id === secondId);
      const groupId = first?.layerParentId ?? null;
      const group = groupId ? graph.find((node) => node.id === groupId) : null;
      const emitted = window.__perfHook.getEmitContent().html;
      return {
        groupId,
        groupType: group?.type ?? null,
        firstParent: first?.layerParentId ?? null,
        secondParent: second?.layerParentId ?? null,
        emittedNested: Boolean(groupId)
          && emitted.indexOf(`data-r20-block-id="${firstId}"`) > emitted.indexOf(`data-r20-block-id="${groupId}"`),
      };
    }, { firstId: ids.groupOneId, secondId: ids.groupTwoId });
    const renderedGrouping = await frame.evaluate(({ firstId, secondId, groupId }) => {
      const firstNode = document.querySelector(`[data-r20-block-id="${CSS.escape(firstId)}"]`);
      const secondNode = document.querySelector(`[data-r20-block-id="${CSS.escape(secondId)}"]`);
      const groupNode = groupId
        ? document.querySelector(`[data-r20-block-id="${CSS.escape(groupId)}"]`)
        : null;
      return {
        firstFound: Boolean(firstNode),
        secondFound: Boolean(secondNode),
        groupFound: Boolean(groupNode),
        renderedParent: firstNode?.parentElement?.closest('[data-r20-block-id]')?.getAttribute('data-r20-block-id') ?? null,
        renderedSecondParent: secondNode?.parentElement?.closest('[data-r20-block-id]')?.getAttribute('data-r20-block-id') ?? null,
      };
    }, {
      firstId: ids.groupOneId,
      secondId: ids.groupTwoId,
      groupId: result.tests.layerGrouping.groupId,
    });
    result.tests.layerGrouping = { ...result.tests.layerGrouping, ...renderedGrouping };
    assert(result.tests.layerGrouping.groupId, 'layer grouping did not create a parent frame');
    assert(result.tests.layerGrouping.groupType === 'r20_element_container', 'layer grouping used the wrong HTML container');
    assert(
      result.tests.layerGrouping.firstParent === result.tests.layerGrouping.groupId
        && result.tests.layerGrouping.secondParent === result.tests.layerGrouping.groupId,
      `layer grouping did not preserve both model parents: ${JSON.stringify(result.tests.layerGrouping)}`,
    );
    assert(
      result.tests.layerGrouping.renderedParent === result.tests.layerGrouping.groupId
        && result.tests.layerGrouping.renderedSecondParent === result.tests.layerGrouping.groupId,
      `layer grouping did not update the iframe surface: ${JSON.stringify(result.tests.layerGrouping)}`,
    );
    assert(result.tests.layerGrouping.emittedNested, 'layer grouping did not update emitted HTML');

    const canvasFirst = frame.locator(`[data-r20-block-id="${ids.groupOneId}"]`);
    const canvasSecond = frame.locator(`[data-r20-block-id="${ids.groupTwoId}"]`);
    assert(
      await canvasFirst.count() === 1 && await canvasSecond.count() === 1,
      'canvas multi-selection targets are missing',
    );
    let canvasMultiSelected = false;
    for (let attempt = 0; attempt < 3 && !canvasMultiSelected; attempt += 1) {
      await canvasFirst.click({ force: true });
      try {
        await frame.waitForFunction((firstId) => Boolean(
          document.querySelector(`[data-r20-block-id="${CSS.escape(firstId)}"][data-r20-selected="1"]`),
        ), ids.groupOneId, { timeout: 1200 });
      } catch {
        await page.waitForTimeout(80);
        continue;
      }
      await canvasSecond.click({ modifiers: ['Control'], force: true });
      try {
        await frame.waitForFunction(({ firstId, secondId }) => (
          Boolean(document.querySelector(`[data-r20-block-id="${CSS.escape(firstId)}"][data-r20-selected="1"]`))
          && Boolean(document.querySelector(`[data-r20-block-id="${CSS.escape(secondId)}"][data-r20-selected="1"]`))
        ), { firstId: ids.groupOneId, secondId: ids.groupTwoId }, { timeout: 1200 });
        canvasMultiSelected = true;
      } catch {
        await page.waitForTimeout(80);
      }
    }
    result.tests.canvasMultiSelection = await frame.evaluate(({ firstId, secondId }) => ({
      selectedIds: [...document.querySelectorAll('[data-r20-selected="1"]')]
        .map((node) => node.getAttribute('data-r20-block-id'))
        .filter(Boolean),
      firstVisible: Boolean(document.querySelector(`[data-r20-block-id="${CSS.escape(firstId)}"][data-r20-selected="1"]`)),
      secondVisible: Boolean(document.querySelector(`[data-r20-block-id="${CSS.escape(secondId)}"][data-r20-selected="1"]`)),
    }), { firstId: ids.groupOneId, secondId: ids.groupTwoId });
    assert(
      result.tests.canvasMultiSelection.firstVisible && result.tests.canvasMultiSelection.secondVisible,
      `canvas multi-selection is not visible: ${JSON.stringify(result.tests.canvasMultiSelection)}`,
    );

    await page.click('[data-testid="edit-placement-free"]');
    const multiBefore = await frame.evaluate(({ firstId, secondId }) => {
      const read = (id) => {
        const node = document.querySelector(`[data-r20-block-id="${CSS.escape(id)}"]`);
        const rect = node?.getBoundingClientRect();
        return rect ? { left: rect.left, top: rect.top } : null;
      };
      return {
        first: read(firstId),
        second: read(secondId),
      };
    }, { firstId: ids.groupOneId, secondId: ids.groupTwoId });
    const multiDragTarget = await canvasSecond.boundingBox();
    assert(multiDragTarget && multiBefore.first && multiBefore.second, 'multi-drag targets are missing');
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
    const multiDuring = await frame.evaluate(({ firstId, secondId }) => {
      const read = (id) => {
        const node = document.querySelector(`[data-r20-block-id="${CSS.escape(id)}"]`);
        const rect = node?.getBoundingClientRect();
        return rect ? { left: rect.left, top: rect.top } : null;
      };
      return { first: read(firstId), second: read(secondId) };
    }, { firstId: ids.groupOneId, secondId: ids.groupTwoId });
    assert(multiDuring.first && multiDuring.second, 'multi-drag visual targets disappeared');
    const duringDeltaFirst = multiDuring.first.left - multiBefore.first.left;
    const duringDeltaSecond = multiDuring.second.left - multiBefore.second.left;
    assert(
      Math.abs(duringDeltaFirst - duringDeltaSecond) < 1,
      `multi-drag did not move both layers together: ${JSON.stringify({ multiBefore, multiDuring })}`,
    );
    await page.mouse.up();
    await page.waitForTimeout(900);
    const multiAfter = await frame.evaluate(({ firstId, secondId }) => {
      const read = (id) => {
        const node = document.querySelector(`[data-r20-block-id="${CSS.escape(id)}"]`);
        const rect = node?.getBoundingClientRect();
        return rect ? { left: rect.left, top: rect.top } : null;
      };
      return {
        first: read(firstId),
        second: read(secondId),
      };
    }, { firstId: ids.groupOneId, secondId: ids.groupTwoId });
    const emittedMulti = await page.evaluate(() => window.__perfHook.getEmitContent());
    assert(multiAfter.first && multiAfter.second, 'multi-drag committed targets disappeared');
    const afterDeltaFirst = multiAfter.first.left - multiBefore.first.left;
    const afterDeltaSecond = multiAfter.second.left - multiBefore.second.left;
    result.tests.canvasMultiMove = {
      before: multiBefore,
      during: multiDuring,
      after: multiAfter,
      emittedHtml: emittedMulti.html,
      emittedCss: emittedMulti.css,
      duringDeltaFirst,
      duringDeltaSecond,
      afterDeltaFirst,
      afterDeltaSecond,
    };
    assert(
      Math.abs(afterDeltaFirst - afterDeltaSecond) < 1
        && Math.abs(afterDeltaFirst) >= 16,
      `multi-drag did not persist as a group move: ${JSON.stringify(result.tests.canvasMultiMove)}`,
    );

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

    const frameCollapseToggle = page.locator(
      `[data-testid="edit-layer-collapse-toggle"][data-r20-block-id="${ids.frameId}"]`,
    );
    assert((await frameCollapseToggle.count()) === 1, 'container layer collapse toggle is missing');
    result.tests.layerCollapse = await page.evaluate(({ frameId, childId }) => ({
      beforeRows: document.querySelectorAll('[data-testid="edit-layer-row"]').length,
      frameId,
      childId,
    }), { frameId: ids.frameId, childId: ids.rowAId });
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
    assert(
      result.tests.layerCollapse.collapsed.visibleRows < result.tests.layerCollapse.beforeRows,
      'collapsing a container did not hide descendant layer rows',
    );
    assert(!result.tests.layerCollapse.collapsed.childVisible, 'collapsed descendant layer is still visible');

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

    result.tests.layerDropModes = await page.evaluate(async ({ movingId, targetId }) => {
      const target = document.querySelector(`[data-testid="edit-layer-row"][data-r20-block-id="${CSS.escape(targetId)}"]`);
      if (!target) return { modes: [], reason: 'missing target layer row' };
      const rect = target.getBoundingClientRect();
      const modes = [];
      const settle = () => new Promise((resolve) => requestAnimationFrame(
        () => requestAnimationFrame(resolve),
      ));
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

    result.tests.tableDropMutation = await page.evaluate(async ({ validMovingId, validTargetId, invalidMovingId, invalidTargetId }) => {
      const dispatchDrop = async (targetId, draggedId) => {
        const target = document.querySelector(
          `[data-testid="edit-layer-row"][data-r20-block-id="${CSS.escape(targetId)}"]`,
        );
        if (!target) return { found: false, mode: null, defaultPrevented: false };
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
      const moving = document.querySelector(`[data-testid="edit-layer-row"][data-r20-block-id="${CSS.escape(movingId)}"]`);
      const target = document.querySelector(`[data-testid="edit-layer-row"][data-r20-block-id="${CSS.escape(targetId)}"]`);
      if (!moving || !target) return { moved: false, reason: 'missing moving or target layer row' };
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
    result.tests.sectionStylePreset = await frame.evaluate(({ frameId, titleId, labelId }) => {
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
    assert(/width\s*:\s*160px/i.test(result.tests.imageStyle?.inlineStyle ?? '') && /height\s*:\s*96px/i.test(result.tests.imageStyle?.inlineStyle ?? ''), `image dimension declarations changed while styling: ${imageStyleDebug}`);
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
    await page.waitForFunction(
      () => window.__perfHook.getEmitContent().html.includes('sheet-result-label'),
      null,
      { timeout: 10000 },
    );
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
        '- Coverage: flow/free placement, canvas widget and block gallery drops, layer collapse/expand, layer reorder/eject, table drop guard and mutation, cycle rejection, selection sync, managed visual styles, preview Roll/chat, sheet width, and the dedicated rolltemplate card editor with click/style/drop/chat synchronization plus empty-workspace template creation.',
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
