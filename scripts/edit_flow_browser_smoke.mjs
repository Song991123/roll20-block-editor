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
      await frame.waitForSelector('#charsheet-root', { state: 'attached', timeout: 20000 });
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

    const syntheticHtml = [
      '<div class="frame" style="width:520px; min-height:220px; padding:16px">',
      '  <div class="row-a" style="padding:8px"><input type="text" name="attr_a" value="A"></div>',
      '  <div class="row-b" style="padding:8px"><input type="text" name="attr_b" value="B"></div>',
      '</div>',
    ].join('\n');
    await page.evaluate((html) => window.__perfHook.importSheet({ html, css: '', i18n: '{}' }), syntheticHtml);
    await page.waitForTimeout(500);
    const { iframe, frame } = await waitForIframe();
    result.tests.editSurface.persistentIframe = true;
    const ids = await frame.evaluate(() => {
      const frameNode = document.querySelector('.sheet-frame');
      const rowA = document.querySelector('.sheet-row-a');
      const rowB = document.querySelector('.sheet-row-b');
      return {
        frameId: frameNode?.getAttribute('data-r20-block-id') ?? null,
        rowAId: rowA?.getAttribute('data-r20-block-id') ?? null,
        rowBId: rowB?.getAttribute('data-r20-block-id') ?? null,
      };
    });
    assert(ids.frameId && ids.rowAId && ids.rowBId, 'synthetic frame IDs were not emitted');

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
        await new Promise((resolve) => requestAnimationFrame(resolve));
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
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const modeBeforeChildLeave = target.getAttribute('data-r20-layer-drop-mode') || null;
      const childLeave = new DragEvent('dragleave', {
        ...hoverInit,
        relatedTarget: inner,
      });
      target.dispatchEvent(childLeave);
      await new Promise((resolve) => requestAnimationFrame(resolve));
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

    result.tests.layerReorder = await page.evaluate(async ({ movingId, targetId }) => {
      const target = document.querySelector(`[data-testid="edit-layer-row"][data-r20-block-id="${CSS.escape(targetId)}"]`);
      if (!target) return { moved: false, reason: 'missing target layer row' };
      const rect = target.getBoundingClientRect();
      const dataTransfer = new DataTransfer();
      dataTransfer.setData('application/x-r20-layer-block', movingId);
      const init = {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height * 0.86,
      };
      const dragover = new DragEvent('dragover', init);
      Object.defineProperty(dragover, 'dataTransfer', { value: dataTransfer });
      target.dispatchEvent(dragover);
      await new Promise((resolve) => requestAnimationFrame(resolve));
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
      value: document.querySelector('[data-testid="edit-canvas-width-input"]')?.value ?? null,
      iframeCssWidth: Math.round(Number.parseFloat(getComputedStyle(document.querySelector('[data-testid="preview-iframe"]')).width || '0')),
      iframeOffsetWidth: document.querySelector('[data-testid="preview-iframe"]')?.offsetWidth ?? 0,
    }));
    assert(result.tests.rolltemplateCanvasWidth.submode === 'rolltemplate', 'rolltemplate edit submode did not activate');
    assert(result.tests.rolltemplateCanvasWidth.value === '410', 'rolltemplate width input did not commit');
    assert(result.tests.rolltemplateCanvasWidth.iframeCssWidth === 410, 'iframe CSS width did not follow rolltemplate width input');

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
        '- Coverage: flow/free placement, canvas widget drop, layer collapse/expand, layer reorder/eject, cycle rejection, selection sync, sheet/rolltemplate canvas widths.',
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
