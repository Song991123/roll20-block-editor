#!/usr/bin/env node
/**
 * Browser smoke for the large-workspace safety path.
 *
 * The input is synthetic and anonymous. It verifies that a large import keeps
 * the model available without creating one SVG block per element, while the
 * lightweight structure browser still supports search and selection.
 */

import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const OUT_DIR = path.resolve(process.env.R20_LARGE_SMOKE_OUT_DIR ?? './out');
const PORT = Number(process.env.R20_LARGE_SMOKE_PORT ?? '4199');
const BASE_PATH = '/roll20-block-editor';
const ITEM_COUNT = Number(process.env.R20_LARGE_SMOKE_ITEMS ?? '5200');

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

function buildSyntheticHtml() {
  // Keep the large corpus anonymous, but include two real container layers so
  // the virtualized edit tree also exercises an inside reparenting mutation.
  const nestedCorpus = [
    '<div class="large-root" style="position:relative;width:760px;min-height:240px;padding:12px;border:1px solid #888">',
    '  <div class="large-source" style="display:block;width:300px;min-height:80px;padding:8px;border:1px solid #69c">',
    '    <input type="text" name="attr_nested_source" value="Nested source">',
    '  </div>',
    '  <div class="large-target" style="display:block;width:340px;min-height:120px;padding:8px;border:1px solid #c96">',
    '    <input type="text" name="attr_nested_target" value="Nested target">',
    '  </div>',
    '</div>',
  ].join('\n');
  const items = Array.from(
    { length: ITEM_COUNT },
    (_, index) => `<input type="text" name="attr_item_${index}" value="Item ${index}">`,
  ).join('');
  return `${nestedCorpus}${items}`;
}

async function runNestedReparentingSmoke(page) {
  const result = await page.evaluate(async () => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const layerScroll = document.querySelector('[data-testid="edit-layer-scroll"]');
    if (layerScroll) {
      layerScroll.scrollTop = 0;
      layerScroll.dispatchEvent(new Event('scroll', { bubbles: true }));
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }
    const layer = window.__perfHook.getLayerSnapshot?.('html') || [];
    const fieldsFor = (id) => (window.__perfHook.getBlockFields?.('html', id) || [])
      .map((field) => String(field.value ?? ''))
      .join(' ');
    const fieldText = (node) => `${node.label} ${node.preview} ${fieldsFor(node.id)}`.toLowerCase();
    const sourceNode = layer.find((node) => fieldText(node).includes('large-source'));
    const targetNode = layer.find((node) => fieldText(node).includes('large-target'));
    if (!sourceNode || !targetNode) {
      return {
        pass: false,
        reason: 'nested source/target containers were not exposed as searchable layer blocks',
        candidates: layer.filter((node) => node.childCount > 0).slice(0, 12).map((node) => ({
          id: node.id,
          label: node.label,
          preview: node.preview,
          fields: fieldsFor(node.id),
          childCount: node.childCount,
        })),
      };
    }
    const rowFor = (id) => document.querySelector(
      `[data-testid="edit-layer-row"][data-r20-block-id="${CSS.escape(id)}"]`,
    );
    const sourceRow = rowFor(sourceNode.id);
    const targetRow = rowFor(targetNode.id);
    if (!sourceRow || !targetRow) {
      return {
        pass: false,
        reason: 'nested source/target rows were not mounted by the virtualized layer panel',
        sourceId: sourceNode.id,
        targetId: targetNode.id,
        visibleRows: document.querySelectorAll('[data-testid="edit-layer-row"]').length,
      };
    }
    if (targetRow.getAttribute('data-r20-can-drop') !== '1') {
      return {
        pass: false,
        reason: 'nested target is not marked as a drop-capable container',
        sourceId: sourceNode.id,
        targetId: targetNode.id,
        targetRole: targetRow.getAttribute('data-r20-layer-role-kind'),
        targetCanDrop: targetRow.getAttribute('data-r20-can-drop'),
      };
    }

    const beforeSnapshot = {
      sourceParentId: sourceRow.getAttribute('data-r20-layer-parent-id') || null,
      targetParentId: targetRow.getAttribute('data-r20-layer-parent-id') || null,
      sourceLayerRelation: sourceRow.getAttribute('data-r20-layer-relation') || '',
    };
    const targetRect = targetRow.getBoundingClientRect();
    const dataTransfer = new DataTransfer();
    dataTransfer.setData('application/x-r20-layer-block', sourceNode.id);
    dataTransfer.effectAllowed = 'move';
    document.body.dataset.r20LayerDraggingBlock = sourceNode.id;
    const eventInit = {
      bubbles: true,
      cancelable: true,
      clientX: Math.round(targetRect.left + targetRect.width / 2),
      clientY: Math.round(targetRect.top + targetRect.height / 2),
    };
    const dragStart = new DragEvent('dragstart', {
      ...eventInit,
      dataTransfer,
    });
    sourceRow.dispatchEvent(dragStart);
    const dragOver = new DragEvent('dragover', {
      ...eventInit,
      dataTransfer,
    });
    targetRow.dispatchEvent(dragOver);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const dropMode = targetRow.getAttribute('data-r20-layer-drop-mode') || '';
    const drop = new DragEvent('drop', {
      ...eventInit,
      dataTransfer,
    });
    targetRow.dispatchEvent(drop);
    sourceRow.dispatchEvent(new DragEvent('dragend', {
      ...eventInit,
      dataTransfer,
    }));
    delete document.body.dataset.r20LayerDraggingBlock;
    await sleep(600);

    const afterLayer = window.__perfHook.getLayerSnapshot?.('html') || [];
    const sourceAfter = afterLayer.find((node) => node.id === sourceNode.id);
    const targetAfter = afterLayer.find((node) => node.id === targetNode.id);
    const editSourceRow = rowFor(sourceNode.id);
    const editTargetRow = rowFor(targetNode.id);
    const emitted = window.__perfHook.getEmitContent?.()?.html || '';
    const emittedNestsSource = /large-target[\s\S]*large-source/.test(emitted);
    const sourceParentId = editSourceRow?.getAttribute('data-r20-layer-parent-id') || null;
    const sourceParentMatchesTarget = sourceParentId === targetNode.id;
    const pass =
      drop.defaultPrevented &&
      dropMode === 'inside' &&
      sourceParentMatchesTarget &&
      sourceAfter?.layerParentId === targetNode.id &&
      targetAfter?.childCount >= 1 &&
      emittedNestsSource;
    return {
      pass,
      sourceId: sourceNode.id,
      targetId: targetNode.id,
      beforeSnapshot,
      afterSnapshot: {
        sourceParentId,
        sourceLayerRelation: editSourceRow?.getAttribute('data-r20-layer-relation') || '',
        targetChildCount: editTargetRow?.getAttribute('data-r20-layer-child-count') || null,
        modelSourceParentId: sourceAfter?.layerParentId ?? null,
        modelSourceRelation: sourceAfter?.layerRelation ?? null,
        modelTargetChildCount: targetAfter?.childCount ?? null,
      },
      dropMode,
      dropPrevented: drop.defaultPrevented,
      emittedNestsSource,
    };
  });
  let sourceInTarget = false;
  let previewDiagnostics = null;
  try {
    const frame = page.frameLocator('[data-testid="preview-iframe"]');
    const body = frame.locator('body');
    await body.waitFor({ state: 'attached', timeout: 30000 });
    const nestedSource = frame.locator('.sheet-large-target .sheet-large-source');
    previewDiagnostics = {
      bodyCount: await body.count(),
      targetCount: await frame.locator('.sheet-large-target').count(),
      sourceCount: await frame.locator('.sheet-large-source').count(),
      nestedCount: await nestedSource.count(),
      bodyMarkup: await body.evaluate((node) => node.innerHTML.slice(0, 2000)),
    };
    await nestedSource.waitFor({ state: 'attached', timeout: 5000 });
    sourceInTarget = (await nestedSource.count()) === 1;
  } catch {
    sourceInTarget = false;
  }
  result.sourceInTarget = sourceInTarget;
  result.previewDiagnostics = previewDiagnostics;
  result.pass = result.pass && sourceInTarget;
  assert(result?.pass, `nested reparenting failed: ${JSON.stringify(result)}`);
  return result;
}

async function main() {
  if (!Number.isInteger(ITEM_COUNT) || ITEM_COUNT < 5001) {
    throw new Error(`ITEM_COUNT must be at least 5001, got ${ITEM_COUNT}`);
  }
  const server = await startServer();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1480, height: 960 } });
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error?.stack || String(error)));

  try {
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem('__perfOn', '1');
        window.localStorage.removeItem('r20be-autosave');
        window.localStorage.removeItem('r20-ui');
      } catch {
        // No storage in the test frame is fine.
      }
    });

    await page.goto(`http://127.0.0.1:${PORT}${BASE_PATH}/`, { waitUntil: 'load' });
    await page.waitForFunction(() => Boolean(window.__perfHook), null, { timeout: 30000 });

    const imported = await page.evaluate((html) => window.__perfHook.importSheet({ html }), buildSyntheticHtml());
    assert(imported.blockCount > 5000, `synthetic HTML did not reach the large threshold: ${imported.blockCount}`);

    await page.evaluate(() => window.__perfHook.setMainMode('assemble'));
    await page.waitForSelector('[data-testid="large-workspace-browser"]', {
      state: 'visible',
      timeout: 30000,
    });
    await page.waitForFunction(
      () => document.querySelector('[data-testid="blockly-model-host"]')?.getAttribute('data-r20-render-mode') === 'headless-large',
      null,
      { timeout: 30000 },
    );

    const beforeSearch = await page.evaluate(() => ({
      renderMode: document.querySelector('[data-testid="blockly-model-host"]')?.getAttribute('data-r20-render-mode'),
      blockCount: window.__perfHook.getWorkspace().blockCount.html,
      listCount: document.querySelectorAll('[data-testid="large-workspace-row"]').length,
      svgBlockCount: document.querySelectorAll('.blocklyBlockCanvas .blocklyDraggable').length,
      totalLabel: document.querySelector('[data-testid="large-workspace-count"]')?.textContent?.trim(),
    }));
    assert(beforeSearch.renderMode === 'headless-large', `unexpected render mode: ${beforeSearch.renderMode}`);
    assert(beforeSearch.blockCount > 5000, `large import block count too small: ${beforeSearch.blockCount}`);
    assert(beforeSearch.listCount > 0 && beforeSearch.listCount < 80, `virtual list rendered too many/few rows: ${beforeSearch.listCount}`);
    assert(beforeSearch.svgBlockCount === 0, `large workspace created SVG blocks: ${beforeSearch.svgBlockCount}`);

    await page.locator('[data-testid="large-workspace-search"]').fill(`item_${ITEM_COUNT - 1}`);
    await page.waitForFunction(
      (label) => {
        const rows = [...document.querySelectorAll('[data-testid="large-workspace-row"]')];
        return rows.length > 0 && rows.some((row) => row.textContent?.includes(label));
      },
      `item_${ITEM_COUNT - 1}`,
      { timeout: 10000 },
    );
    const searched = await page.evaluate(() => ({
      rows: [...document.querySelectorAll('[data-testid="large-workspace-row"]')].map((row) => row.textContent?.trim()),
    }));
    assert(
      searched.rows.some((row) => row?.includes(`item_${ITEM_COUNT - 1}`)),
      'search did not find the last synthetic item',
    );

    await page.locator('[data-testid="large-workspace-row"]').first().click();
    await page.waitForFunction(
      () => document.querySelector('[data-testid="large-workspace-row"][data-selected="true"]') !== null,
      null,
      { timeout: 10000 },
    );
    const selected = await page.locator('[data-testid="large-workspace-row"][data-selected="true"]').count();
    assert(selected === 1, `expected one selected row, got ${selected}`);

    // The large-workspace fallback must still leave the real edit surface
    // usable. The layer panel is virtualized independently; it must not mount
    // a second sheet renderer or fall back to the retired Shadow edit host.
    await page.evaluate(() => window.__perfHook.setMainMode('edit'));
    await page.locator('[data-testid="edit-canvas-root"]').waitFor({ state: 'visible', timeout: 30000 });
    await page.locator('[data-testid="edit-layer-row"]').first().waitFor({ state: 'visible', timeout: 30000 });
    const editSurface = await page.evaluate(() => ({
      editOwner: document.querySelector('[data-testid="edit-canvas-root"]')?.getAttribute('data-edit-render-owner') ?? '',
      layerRowCount: document.querySelectorAll('[data-testid="edit-layer-row"]').length,
      iframeCount: document.querySelectorAll('[data-testid="preview-iframe"]').length,
      shadowEditHostCount: document.querySelectorAll('[data-testid="edit-canvas-shadow-host"]').length,
      emptyEditSlot: document.querySelector('[data-testid="edit-canvas-iframe-slot"]')?.getAttribute('aria-hidden') ?? '',
    }));
    assert(editSurface.editOwner === 'persistent-iframe', `large edit owner changed: ${editSurface.editOwner}`);
    assert(editSurface.layerRowCount > 0 && editSurface.layerRowCount < 80, `large edit layer rendered too many/few rows: ${editSurface.layerRowCount}`);
    assert(editSurface.iframeCount === 1, `large edit mounted ${editSurface.iframeCount} sheet iframes`);
    assert(editSurface.shadowEditHostCount === 0, 'large edit mounted the retired Shadow host');
    assert(editSurface.emptyEditSlot === 'true', 'EditCanvas still exposes a second render slot');
    await page.locator('[data-testid="edit-layer-row"]').first().click();
    await page.waitForFunction(
      () => document.querySelector('[data-testid="edit-layer-row"][data-r20-layer-selected="1"]') !== null,
      null,
      { timeout: 10000 },
    );
    const editSelectedRows = await page.locator('[data-testid="edit-layer-row"][data-r20-layer-selected="1"]').count();
    assert(editSelectedRows === 1, `expected one selected large edit layer row, got ${editSelectedRows}`);
    const nestedReparenting = await runNestedReparentingSmoke(page);
    assert(consoleErrors.length === 0, `console errors: ${consoleErrors.join(' | ')}`);
    assert(pageErrors.length === 0, `page errors: ${pageErrors.join(' | ')}`);

    console.log(JSON.stringify({
      pass: true,
      itemCount: ITEM_COUNT,
      beforeSearch,
      searched,
      selectedRows: selected,
      editSurface,
      editSelectedRows,
      nestedReparenting,
      consoleErrors,
      pageErrors,
    }, null, 2));
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
