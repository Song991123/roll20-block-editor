#!/usr/bin/env node
/**
 * Proves that the canonical preview iframe survives preview -> edit -> preview
 * without node replacement, reload, or loss of live input/runtime state.
 * Runs modern and legacy as independent contracts. Local static-app evidence
 * only; this is not actual Roll20 visual parity.
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
const REPORT_DIR = path.resolve(argOf('--report-dir', 'reports/persistent-preview-surface'));
const PORT = Number(argOf('--port', '4198'));
const SYNTHETIC_BLOCKS = Math.max(0, Math.min(10000, Number(argOf('--synthetic-blocks', '0')) || 0));
const OPTIMISTIC_BUDGET_MS = Math.max(
  16,
  Number(argOf('--optimistic-budget-ms', SYNTHETIC_BLOCKS >= 6000 ? '75' : '100')) || 100,
);
const MODES = ['modern', 'legacy'];

function isIdentityTransform(value) {
  const normalized = String(value ?? '').replace(/\s+/g, '').toLowerCase();
  return normalized === 'none' || normalized === 'matrix(1,0,0,1,0,0)';
}

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

async function warmPerfHook(page) {
  await page.waitForFunction(() => Boolean(window.__perfHook), null, { timeout: 30000 });
  await page.waitForFunction(
    async () => {
      try {
        const result = await window.__perfHook.importSheet({ html: '<div>ready</div>' });
        return result.blockCount > 0;
      } catch {
        return false;
      }
    },
    null,
    { timeout: 30000, polling: 500 },
  );
}

async function waitForRenderReady(page) {
  await page.waitForFunction(
    () => document.querySelector('[data-r20-render-ready]')?.getAttribute('data-r20-render-ready') === '1',
    null,
    { timeout: 30000 },
  );
}

async function readApplyStats(frame) {
  return frame.evaluate(() => ({
    mode: document.body?.getAttribute('data-r20-last-apply-mode') ?? '',
    rootReplacements: Number(document.body?.getAttribute('data-r20-root-replacements') ?? 0),
    structuralPatches: Number(document.body?.getAttribute('data-r20-structural-patches') ?? 0),
    structuralPatchFallbacks: Number(document.body?.getAttribute('data-r20-structural-patch-fallbacks') ?? 0),
    optimisticFlowFastPatches: Number(document.body?.getAttribute('data-r20-optimistic-flow-fast-patches') ?? 0),
    optimisticFlowCheck: document.body?.getAttribute('data-r20-optimistic-flow-check') ?? '',
    initialPlaceholderReplacements: Number(document.body?.getAttribute('data-r20-initial-placeholder-replacements') ?? 0),
    styleOnlyApplies: Number(document.body?.getAttribute('data-r20-style-only-applies') ?? 0),
    optimisticFlowMoves: Number(document.body?.getAttribute('data-r20-optimistic-flow-moves') ?? 0),
    optimisticFlowRollbacks: Number(document.body?.getAttribute('data-r20-optimistic-flow-rollbacks') ?? 0),
    lastOptimisticAt: Number(document.body?.getAttribute('data-r20-last-optimistic-at') ?? 0),
    lastOptimisticEpoch: Number(document.body?.getAttribute('data-r20-last-optimistic-epoch') ?? 0),
    lastApplyAt: Number(document.body?.getAttribute('data-r20-last-apply-at') ?? 0),
    lastApplyEpoch: Number(document.body?.getAttribute('data-r20-last-apply-epoch') ?? 0),
    lastApplyCostMs: Number(document.body?.getAttribute('data-r20-last-apply-cost-ms') ?? 0),
  }));
}

async function runMode(browser, mode) {
  const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text().slice(0, 500));
  });
  page.on('pageerror', (error) => pageErrors.push(String(error).slice(0, 500)));
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('__perfOn', '1');
      window.localStorage.removeItem('r20be-autosave');
    } catch {}
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'r20:edit-ready' && typeof event.data.bridgeId === 'string') {
        window.__r20SmokeBridgeId = event.data.bridgeId;
      }
    });
  });

  const result = { mode, pass: false };
  try {
    await page.goto(`http://127.0.0.1:${PORT}${BASE_PATH}/`, { waitUntil: 'load' });
    await warmPerfHook(page);
    const leftSidebar = page.locator('[data-testid="sidebar-left"]');
    const leftSidebarToggle = page.locator('[data-testid="sidebar-left-toggle"]');
    const openWidth = await leftSidebar.evaluate((element) => element.getBoundingClientRect().width);
    await leftSidebarToggle.click();
    await page.waitForFunction(
      () => document.querySelector('[data-testid="sidebar-left"]')?.getBoundingClientRect().width === 0,
      null,
      { timeout: 30000 },
    );
    result.leftSidebar = await leftSidebar.evaluate((element, initialWidth) => ({
      openWidth: initialWidth,
      collapsedWidth: element.getBoundingClientRect().width,
      collapsedButtonCount: element.querySelectorAll('button').length,
      collapsedChildCount: element.childElementCount,
    }), openWidth);
    await leftSidebarToggle.click();
    await page.waitForFunction(
      (initialWidth) => Math.abs(
        (document.querySelector('[data-testid="sidebar-left"]')?.getBoundingClientRect().width ?? 0)
          - initialWidth,
      ) <= 1,
      openWidth,
      { timeout: 30000 },
    );
    result.leftSidebar.restoredWidth = await leftSidebar.evaluate(
      (element) => element.getBoundingClientRect().width,
    );
    result.import = await page.evaluate(async (syntheticBlocks) => {
      const filler = Array.from(
        { length: syntheticBlocks },
        (_, index) => `<span class="sheet-probe-filler">${index % 10}</span>`,
      ).join('');
      let imported = null;
      for (let attempt = 0; attempt < 10; attempt += 1) {
        window.__perfHook.clearAll();
        if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 150));
        imported = await window.__perfHook.importSheet({
          html: `<div class="sheet-probe-frame"><div class="sheet-probe-card"><span class="compatibility-probe">Mode probe</span><input type="text" name="attr_probe" value="initial"><input type="text" name="attr_worker_probe" value=""><button type="roll" name="roll_probe" value="&amp;{template:default} {{name=Probe}} {{result=[[1d20]]}}">Roll</button></div><div class="sheet-probe-drop">Drop target</div><div class="sheet-probe-load">${filler}</div></div><rolltemplate class="sheet-rolltemplate-default"><div>{{name}}</div><div>{{result}}</div></rolltemplate><script type="text/worker">on("sheet:opened", function () { setAttrs({ worker_probe: "A" }); }); on("change:probe", function () { setAttrs({ worker_probe: "A-OLD" }); });</script>`,
          css: '.sheet-probe-frame { position: relative; width: 360px; margin-left: 420px; padding: 10px; } .sheet-probe-card { width: 320px; min-height: 80px; padding: 12px; } .compatibility-probe { position: fixed; left: -9999px; top: -9999px; pointer-events: none; } .sheet-probe-drop { width: 320px; min-height: 40px; margin-top: 12px; padding: 12px; } .sheet-probe-load { display: flex; flex-wrap: wrap; width: 320px; } .sheet-probe-filler { display: block; width: 4px; height: 4px; overflow: hidden; }',
        });
        if (imported.blockCount > 0) return imported;
      }
      return imported;
    }, SYNTHETIC_BLOCKS);
    if (!result.import || result.import.blockCount <= 0) {
      throw new Error('synthetic fixture import did not create blocks after retries');
    }
    await page.evaluate((compatibilityMode) => {
      window.__perfHook.setRoll20CompatibilityMode(compatibilityMode);
      window.__perfHook.setMainMode('preview');
    }, mode);

    const expectedSelector = '.sheet-probe-card';
    const iframe = page.locator('[data-testid="preview-iframe"]');
    await iframe.waitFor({ state: 'visible', timeout: 30000 });
    await page.waitForFunction(
      () => Number(document
        .querySelector('[data-r20-apply-acked]')
        ?.getAttribute('data-r20-apply-acked')) > 0,
      null,
      { timeout: 30000 },
    );
    const handle = await iframe.elementHandle();
    const frame = await handle?.contentFrame();
    if (!frame) throw new Error('preview iframe content frame unavailable');
    await frame.locator(expectedSelector).waitFor({ state: 'visible', timeout: 30000 });
    await waitForRenderReady(page);
    result.autoCanvasWidth = await page.locator('[data-testid="preview-iframe"]').evaluate((node) => ({
      width: Number.parseFloat(node.getAttribute('style')?.match(/width:\s*([\d.]+)px/)?.[1] ?? ''),
    }));
    result.trustSurface = await page.evaluate(() => ({
      pastelShell: document.querySelector('.app-shell.pastel') !== null,
      bugReportHref: document.querySelector('a[href^="mailto:sjh11235678@gmail.com"]')?.getAttribute('href') ?? '',
      githubLinkCount: document.querySelectorAll('a[href*="github.com"]').length,
    }));
    result.initialApply = await page.evaluate(() => {
      const root = document.querySelector('[data-r20-apply-acked]');
      const srcdoc = document.querySelector('[data-testid="preview-iframe"]')?.getAttribute('srcdoc') ?? '';
      return {
        ackedRevision: Number(root?.getAttribute('data-r20-apply-acked')),
        pendingRevision: root?.getAttribute('data-r20-apply-pending') ?? '',
        sourceStayedOutOfSrcdoc: !srcdoc.includes('class="sheet-probe-card"'),
      };
    });
    result.initialApply.stats = await readApplyStats(frame);
    const input = frame.locator('input[name="attr_probe"]');
    await frame.waitForFunction(
      () => document.querySelector('input[name="attr_worker_probe"]')?.value === 'A',
      null,
      { timeout: 30000 },
    );
    await input.fill(`runtime-${mode}`);
    await input.evaluate((node) => node.dispatchEvent(new Event('change', { bubbles: true })));
    await frame.waitForFunction(
      () => document.querySelector('input[name="attr_worker_probe"]')?.value === 'A-OLD',
      null,
      { timeout: 30000 },
    );
    const token = `token-${mode}-${Date.now()}`;
    await frame.evaluate((value) => {
      window.__persistentPreviewRuntimeToken = value;
    }, token);
    result.before = await page.evaluate(() => {
      const iframeEl = document.querySelector('[data-testid="preview-iframe"]');
      window.__persistentPreviewIframeElement = iframeEl;
      window.__persistentPreviewLoadCount = 0;
      iframeEl?.addEventListener('load', () => {
        window.__persistentPreviewLoadCount += 1;
      });
      return {
        iframeCount: document.querySelectorAll('[data-testid="preview-iframe"]').length,
        paneVisible: document.querySelector('[data-testid="preview-pane"]')?.getAttribute('data-visible'),
      };
    });
    result.before.hasLegacyInputStyle = await frame.evaluate(
      () => Boolean(document.getElementById('roll20-legacy-input-state')),
    );

    // Exercise the real compatibility toggle on the already-mounted iframe.
    // The product must replace the mode-specific HTML/CSS contract through
    // the live bridge without reloading the iframe or losing sheet state.
    const alternateMode = mode === 'modern' ? 'legacy' : 'modern';
    result.compatibilityToggle = {
      initialMode: mode,
      alternateMode,
      beforeAck: await page.evaluate(() => Number(document
        .querySelector('[data-r20-apply-acked]')
        ?.getAttribute('data-r20-apply-acked'))),
      beforeLoadCount: await page.evaluate(() => window.__persistentPreviewLoadCount),
    };
    await page.evaluate((nextMode) => {
      window.__perfHook.setRoll20CompatibilityMode(nextMode);
    }, alternateMode);
    await page.waitForFunction(
      (beforeAck) => Number(document
        .querySelector('[data-r20-apply-acked]')
        ?.getAttribute('data-r20-apply-acked')) > beforeAck,
      result.compatibilityToggle.beforeAck,
      { timeout: 30000 },
    );
    await frame.waitForFunction(
      (expectLegacy) => Boolean(document.getElementById('roll20-legacy-input-state')) === expectLegacy,
      alternateMode === 'legacy',
      { timeout: 30000 },
    );
    result.compatibilityToggle.alternate = {
      modeStylePresent: await frame.evaluate(
        () => Boolean(document.getElementById('roll20-legacy-input-state')),
      ),
      probe: await frame.evaluate(() => {
        const node = document.querySelector('[class*="compatibility-probe"]');
        return {
          className: node?.className ?? '',
          position: node ? getComputedStyle(node).position : '',
        };
      }),
      inputValue: await frame.locator('input[name="attr_probe"]').inputValue(),
      runtimeToken: await frame.evaluate(() => window.__persistentPreviewRuntimeToken),
      iframeCount: await page.locator('[data-testid="preview-iframe"]').count(),
      loadCount: await page.evaluate(() => window.__persistentPreviewLoadCount),
      ack: await page.evaluate(() => Number(document
        .querySelector('[data-r20-apply-acked]')
        ?.getAttribute('data-r20-apply-acked'))),
      stats: await readApplyStats(frame),
    };
    await page.evaluate((nextMode) => {
      window.__perfHook.setRoll20CompatibilityMode(nextMode);
    }, mode);
    await page.waitForFunction(
      (beforeAck) => Number(document
        .querySelector('[data-r20-apply-acked]')
        ?.getAttribute('data-r20-apply-acked')) > beforeAck,
      result.compatibilityToggle.alternate.ack,
      { timeout: 30000 },
    );
    await frame.waitForFunction(
      (expectLegacy) => Boolean(document.getElementById('roll20-legacy-input-state')) === expectLegacy,
      mode === 'legacy',
      { timeout: 30000 },
    );
    Object.assign(result.compatibilityToggle, {
      restored: {
        modeStylePresent: await frame.evaluate(
          () => Boolean(document.getElementById('roll20-legacy-input-state')),
        ),
        probe: await frame.evaluate(() => {
          const node = document.querySelector('[class*="compatibility-probe"]');
          return {
            className: node?.className ?? '',
            position: node ? getComputedStyle(node).position : '',
          };
        }),
        inputValue: await frame.locator('input[name="attr_probe"]').inputValue(),
        runtimeToken: await frame.evaluate(() => window.__persistentPreviewRuntimeToken),
        iframeCount: await page.locator('[data-testid="preview-iframe"]').count(),
        loadCount: await page.evaluate(() => window.__persistentPreviewLoadCount),
        ack: await page.evaluate(() => Number(document
          .querySelector('[data-r20-apply-acked]')
          ?.getAttribute('data-r20-apply-acked'))),
        stats: await readApplyStats(frame),
      },
    });

    result.liveApplyMutation = await page.evaluate(() => {
      const root = document.querySelector('[data-r20-apply-acked]');
      const beforeAck = Number(root?.getAttribute('data-r20-apply-acked'));
      const added = window.__perfHook.appendFriendlyWidgetForEditSmoke({ mode: 'flow' });
      return { beforeAck, added };
    });
    await page.waitForFunction(
      (beforeAck) => Number(document
        .querySelector('[data-r20-apply-acked]')
        ?.getAttribute('data-r20-apply-acked')) > beforeAck,
      result.liveApplyMutation.beforeAck,
      { timeout: 30000 },
    );
    await waitForRenderReady(page);
    await frame.waitForFunction(
      (expectedValue) => document.querySelector('input[name="attr_probe"]')?.value === expectedValue,
      `runtime-${mode}`,
      { timeout: 30000 },
    );
    result.liveApplyMutation.afterAck = await page.evaluate(() => Number(document
      .querySelector('[data-r20-apply-acked]')
      ?.getAttribute('data-r20-apply-acked')));
    result.liveApplyMutation.inputValue = await input.inputValue();
    result.liveApplyMutation.runtimeToken = await frame.evaluate(
      () => window.__persistentPreviewRuntimeToken,
    );
    result.liveApplyMutation.loadCount = await page.evaluate(
      () => window.__persistentPreviewLoadCount,
    );
    result.liveApplyMutation.stats = await readApplyStats(frame);

    await page.evaluate(() => window.__perfHook.setMainMode('edit'));
    await page.locator('[data-testid="edit-canvas-root"]').waitFor({ state: 'visible', timeout: 30000 });
    await frame.waitForFunction(
      () => document.body?.getAttribute('data-r20-edit-mode') === '1',
      null,
      { timeout: 30000 },
    );
    result.layerSelection = await frame.evaluate(() => ({
      targetBlockId: document
        .querySelector('.sheet-probe-drop')
        ?.getAttribute('data-r20-block-id') ?? null,
    }));
    result.layerSelection.layerRowClicked = await page.evaluate((blockId) => {
      const row = Array.from(document.querySelectorAll('[data-testid="edit-layer-row"]'))
        .find((node) => node.getAttribute('data-r20-block-id') === blockId);
      if (!(row instanceof HTMLElement) || row.getAttribute('role') !== 'button') return false;
      row.click();
      return true;
    }, result.layerSelection.targetBlockId);
    await frame.waitForFunction(
      (blockId) => document
        .querySelector(`[data-r20-block-id="${CSS.escape(blockId)}"]`)
        ?.getAttribute('data-r20-preview-selected') === '1',
      result.layerSelection.targetBlockId,
      { timeout: 30000 },
    );
    result.layerSelection.iframeHighlighted = await frame.evaluate(
      (blockId) => document
        .querySelector(`[data-r20-block-id="${CSS.escape(blockId)}"]`)
        ?.getAttribute('data-r20-preview-selected') === '1',
      result.layerSelection.targetBlockId,
    );
    result.zoom = {
      beforeLoadCount: await page.evaluate(() => window.__persistentPreviewLoadCount),
    };
    const widthInput = page.locator('[data-testid="edit-canvas-width-input"]');
    await widthInput.fill('1600');
    await widthInput.press('Enter');
    await page.waitForFunction(
      () => document.querySelector('[data-testid="preview-iframe"]')?.getAttribute('style')?.includes('width: 1600px'),
      null,
      { timeout: 30000 },
    );
    await page.locator('[data-testid="edit-zoom-100"]').click();
    result.zoom.scale100 = await page.locator('[data-testid="preview-iframe"]')
      .evaluate((node) => node.parentElement?.style.transform ?? '');
    await page.locator('[data-testid="edit-zoom-fit"]').click();
    await page.waitForFunction(() => {
      const iframe = document.querySelector('[data-testid="preview-iframe"]');
      const transform = iframe?.parentElement?.style.transform ?? '';
      const match = transform.match(/scale\(([^)]+)\)/);
      return Boolean(match && Number(match[1]) > 0 && Number(match[1]) < 1);
    });
    result.zoom.scaleFit = await page.locator('[data-testid="preview-iframe"]')
      .evaluate((node) => node.parentElement?.style.transform ?? '');
    await widthInput.fill('850');
    await widthInput.press('Enter');
    await page.waitForFunction(
      () => document.querySelector('[data-testid="preview-iframe"]')?.getAttribute('style')?.includes('width: 850px'),
      null,
      { timeout: 30000 },
    );
    result.manualCanvasWidth = await page.evaluate(() => ({
      inputValue: document.querySelector('[data-testid="edit-canvas-width-input"]')?.value ?? '',
      iframeStyle: document.querySelector('[data-testid="preview-iframe"]')?.getAttribute('style') ?? '',
    }));
    await page.locator('[data-testid="edit-zoom-100"]').click();
    Object.assign(result.zoom, await page.evaluate(() => ({
      afterLoadCount: window.__persistentPreviewLoadCount,
      iframeCount: document.querySelectorAll('[data-testid="preview-iframe"]').length,
    })));
    result.contextMenu = await frame.evaluate(() => {
      const target = document.querySelector('.sheet-probe-card');
      if (!target) return { dispatched: false };
      const rect = target.getBoundingClientRect();
      const event = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        button: 2,
        clientX: rect.left + 12,
        clientY: rect.top + 12,
      });
      return {
        dispatched: true,
        defaultPrevented: !target.dispatchEvent(event),
        blockId: target.getAttribute('data-r20-block-id'),
      };
    });
    await waitForRenderReady(page);
    const contextMenu = page.locator('[data-testid="shadow-context-menu"]');
    await contextMenu.waitFor({ state: 'visible', timeout: 30000 });
    Object.assign(result.contextMenu, await contextMenu.evaluate((menu) => {
      const rect = menu.getBoundingClientRect();
      const iframe = document.querySelector('[data-testid="preview-iframe"]');
      const iframeRect = iframe?.getBoundingClientRect();
      return {
        menuBlockId: menu.getAttribute('data-r20-block-id'),
        left: rect.left,
        top: rect.top,
        insideIframeViewport: Boolean(
          iframeRect
          && rect.left >= iframeRect.left
          && rect.top >= iframeRect.top
          && rect.left <= iframeRect.right
          && rect.top <= iframeRect.bottom,
        ),
      };
    }));
    await contextMenu.locator('[data-r20-context-action="inspect"]').click();
    await page.locator('[data-testid="tab-attrs"][data-state="active"]')
      .waitFor({ state: 'visible', timeout: 30000 });
    result.contextMenu.inspectActivated = await page.evaluate((blockId) => {
      const menu = document.querySelector('[data-testid="shadow-context-menu"]');
      const selected = Array.from(document.querySelectorAll('[data-testid="edit-layer-row"]'))
        .some((row) => row.getAttribute('data-r20-block-id') === blockId
          && row.getAttribute('data-r20-layer-selected') === '1');
      return !menu && selected;
    }, result.contextMenu.blockId);

    // Exercise the mutating context actions against the same persistent iframe.
    // A visible menu alone is insufficient: duplicate/delete must update the
    // Blockly model, emit cache, and rendered DOM without replacing the iframe.
    const openContextMenuFor = async (blockId) => {
      await waitForRenderReady(page);
      const dispatched = await frame.evaluate((targetBlockId) => {
        const target = Array.from(document.querySelectorAll('[data-r20-block-id]'))
          .find((node) => node.getAttribute('data-r20-block-id') === targetBlockId);
        if (!target) return false;
        const rect = target.getBoundingClientRect();
        return !target.dispatchEvent(new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          button: 2,
          clientX: rect.left + 12,
          clientY: rect.top + 12,
        }));
      }, blockId);
      await contextMenu.waitFor({ state: 'visible', timeout: 30000 });
      return {
        dispatched,
        menuBlockId: await contextMenu.getAttribute('data-r20-block-id'),
      };
    };
    result.contextMenu.mutations = {
      beforeAck: await page.evaluate(() => Number(document
        .querySelector('[data-r20-apply-acked]')
        ?.getAttribute('data-r20-apply-acked'))),
      beforeBlockCount: await page.evaluate(() => window.__perfHook.getWorkspace().blockCount.html),
      beforeCardCount: await frame.locator('.sheet-probe-card').count(),
    };
    const duplicateMenu = await openContextMenuFor(result.contextMenu.blockId);
    await contextMenu.locator('[data-r20-context-action="duplicate"]').click();
    await page.waitForFunction(
      ({ beforeAck, beforeBlockCount }) => (
        Number(document.querySelector('[data-r20-apply-acked]')
          ?.getAttribute('data-r20-apply-acked')) > beforeAck
        && window.__perfHook.getWorkspace().blockCount.html > beforeBlockCount
      ),
      result.contextMenu.mutations,
      { timeout: 30000 },
    );
    await waitForRenderReady(page);
    await frame.waitForFunction(
      () => document.querySelectorAll('.sheet-probe-card').length === 2,
      null,
      { timeout: 30000 },
    );
    const duplicateId = await page.evaluate(() => (
      window.__perfHook.getSelectedBlockId?.()
      ?? document.querySelector('[data-testid="edit-layer-row"][data-r20-layer-selected="1"]')
        ?.getAttribute('data-r20-block-id')
      ?? null
    ));
    result.contextMenu.mutations.duplicate = {
      dispatched: duplicateMenu.dispatched,
      menuBlockId: duplicateMenu.menuBlockId,
      duplicateId,
      selected: duplicateId !== null,
      cardCount: await frame.locator('.sheet-probe-card').count(),
      blockCount: await page.evaluate(() => window.__perfHook.getWorkspace().blockCount.html),
      emitted: await page.evaluate((id) => (
        typeof id === 'string' && window.__perfHook.getEmitContent().html
          .includes(`data-r20-block-id="${id}"`)
      ), duplicateId),
    };
    if (!duplicateId) throw new Error('context duplicate did not select a new block');

    result.contextMenu.mutations.deleteBeforeAck = await page.evaluate(() => Number(document
      .querySelector('[data-r20-apply-acked]')
      ?.getAttribute('data-r20-apply-acked')));
    const deleteMenu = await openContextMenuFor(duplicateId);
    await contextMenu.locator('[data-r20-context-action="delete"]').click();
    await page.waitForFunction(
      (beforeAck) => Number(document.querySelector('[data-r20-apply-acked]')
        ?.getAttribute('data-r20-apply-acked')) > beforeAck,
      result.contextMenu.mutations.deleteBeforeAck,
      { timeout: 30000 },
    );
    await waitForRenderReady(page);
    await frame.waitForFunction(
      () => document.querySelectorAll('.sheet-probe-card').length === 1,
      null,
      { timeout: 30000 },
    );
    result.contextMenu.mutations.delete = {
      dispatched: deleteMenu.dispatched,
      menuBlockId: deleteMenu.menuBlockId,
      cardCount: await frame.locator('.sheet-probe-card').count(),
      blockCount: await page.evaluate(() => window.__perfHook.getWorkspace().blockCount.html),
      duplicateAbsent: await page.evaluate((id) => !window.__perfHook.getEmitContent().html
        .includes(`data-r20-block-id="${id}"`), duplicateId),
      iframeCount: await page.locator('[data-testid="preview-iframe"]').count(),
      loadCount: await page.evaluate(() => window.__persistentPreviewLoadCount),
    };
    const overlaySignature = () => page.evaluate(() => {
      const overlay = document.querySelector('[data-testid="iframe-edit-overlay"]');
      return {
        count: document.querySelectorAll('[data-testid="iframe-edit-overlay"]').length,
        blockId: overlay?.getAttribute('data-r20-block-id') ?? null,
        phase: overlay?.getAttribute('data-r20-edit-phase') ?? null,
      };
    });
    const beforeStaleOverlay = await overlaySignature();
    await frame.evaluate(() => {
      const target = document.querySelector('.sheet-probe-card');
      const rect = target?.getBoundingClientRect();
      const blockId = target?.getAttribute('data-r20-block-id') || 'missing';
      const subject = {
        blockId,
        rect: rect
          ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
          : { left: 0, top: 0, width: 10, height: 10 },
        offsetLeft: target?.offsetLeft || 0,
        offsetTop: target?.offsetTop || 0,
        scrollLeft: target?.scrollLeft || 0,
        scrollTop: target?.scrollTop || 0,
        clientLeft: target?.clientLeft || 0,
        clientTop: target?.clientTop || 0,
        position: target ? getComputedStyle(target).position : '',
        offsetParentBlockId: target?.offsetParent?.getAttribute('data-r20-block-id') || null,
        offsetParentPosition: target?.offsetParent
          ? getComputedStyle(target.offsetParent).position
          : '',
      };
      parent.postMessage({
        type: 'r20:edit-hit',
        protocol: 1,
        bridgeId: 'stale-bridge-token',
        phase: 'pointerdown',
        blockId,
        rect: subject.rect,
        pointer: { x: 1, y: 1 },
        pointerId: 17,
        button: 0,
        buttons: 1,
        subject,
        hitPath: [subject],
      }, '*');
    });
    await page.waitForTimeout(50);
    result.staleBridgeRejected = JSON.stringify(await overlaySignature()) === JSON.stringify(beforeStaleOverlay);
    result.bridgeDispatch = await frame.evaluate(() => {
      const target = document.querySelector('.sheet-probe-card');
      if (!target) return { dispatched: false, reason: 'missing probe card' };
      const rect = target.getBoundingClientRect();
      const event = new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        pointerId: 17,
        button: 0,
        buttons: 1,
        clientX: rect.left + Math.min(8, rect.width / 2),
        clientY: rect.top + Math.min(8, rect.height / 2),
      });
      const accepted = target.dispatchEvent(event);
      return {
        dispatched: true,
        defaultPrevented: !accepted,
        blockId: target.getAttribute('data-r20-block-id'),
        rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      };
    });
    await page.locator('[data-testid="iframe-edit-overlay"]').waitFor({ state: 'attached', timeout: 30000 });
    await frame.waitForFunction(
      (blockId) => document
        .querySelector(`[data-r20-block-id="${CSS.escape(blockId)}"]`)
        ?.getAttribute('data-r20-preview-selected') === '1',
      result.bridgeDispatch.blockId,
      { timeout: 30000 },
    );
    await page.waitForFunction(
      (blockId) => Array.from(document.querySelectorAll('[data-testid="edit-layer-row"]'))
        .some((node) => node.getAttribute('data-r20-block-id') === blockId
          && node.getAttribute('data-r20-layer-selected') === '1'),
      result.bridgeDispatch.blockId,
      { timeout: 30000 },
    );
    result.layerSelection.layerHighlightedFromIframe = await page.evaluate(
      (blockId) => Array.from(document.querySelectorAll('[data-testid="edit-layer-row"]'))
        .some((node) => node.getAttribute('data-r20-block-id') === blockId
          && node.getAttribute('data-r20-layer-selected') === '1'),
      result.bridgeDispatch.blockId,
    );
    const pointerTargets = await frame.evaluate(() => {
      const subject = document.querySelector('.sheet-probe-card');
      const target = document.querySelector('.sheet-probe-drop');
      if (!subject || !target) return { dispatched: false, reason: 'missing pointer subject or target' };
      const subjectRect = subject.getBoundingClientRect();
      const candidates = [
        { x: subjectRect.left + 8, y: subjectRect.top + 8 },
        { x: subjectRect.right - 8, y: subjectRect.bottom - 8 },
        { x: subjectRect.left + subjectRect.width / 2, y: subjectRect.bottom - 6 },
      ];
      const subjectPoint = candidates.find((point) => {
        const hit = document.elementFromPoint(point.x, point.y);
        return hit?.closest?.('[data-r20-block-id]') === subject;
      }) ?? candidates[0];
      return {
        dispatched: false,
        subjectBlockId: subject.getAttribute('data-r20-block-id'),
        targetBlockId: target.getAttribute('data-r20-block-id'),
        subjectPoint,
        subjectRect: {
          left: subjectRect.left,
          top: subjectRect.top,
        },
      };
    });
    if (!pointerTargets.dispatched) {
      const subjectBox = await frame.locator('.sheet-probe-card').boundingBox();
      const targetBox = await frame.locator('.sheet-probe-drop').boundingBox();
      if (!subjectBox || !targetBox) throw new Error('pointer subject or target box unavailable');
      await frame.evaluate(() => {
        window.__r20SmokeActivePointerId = null;
        document.addEventListener('pointerdown', (event) => {
          window.__r20SmokeActivePointerId = event.pointerId;
        }, { capture: true, once: true });
      });
      const subjectPoint = pointerTargets.subjectPoint ?? {
        x: subjectBox.x + subjectBox.width / 2,
        y: subjectBox.y + subjectBox.height / 2,
      };
      const subjectOffset = {
        x: subjectPoint.x - (pointerTargets.subjectRect?.left ?? 0),
        y: subjectPoint.y - (pointerTargets.subjectRect?.top ?? 0),
      };
      await page.mouse.move(subjectBox.x + subjectOffset.x, subjectBox.y + subjectOffset.y);
      await page.mouse.down();
      await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 2 });
      result.pointerSequence = {
        dispatched: true,
        inputMethod: 'page.mouse',
        subjectBlockId: pointerTargets.subjectBlockId,
        targetBlockId: pointerTargets.targetBlockId,
        pointerId: await frame.evaluate(() => window.__r20SmokeActivePointerId),
        subjectBox,
        targetBox,
        iframeBox: await page.locator('[data-testid="preview-iframe"]').boundingBox(),
      };
    } else {
      result.pointerSequence = pointerTargets;
    }
    await page.waitForFunction(
      (targetBlockId) => {
        const overlay = document.querySelector('[data-testid="iframe-edit-drop-overlay"]');
        return overlay?.getAttribute('data-r20-drop-target-id') === targetBlockId
          && overlay?.getAttribute('data-r20-drop-mode') === 'inside';
      },
      result.pointerSequence.targetBlockId,
      { timeout: 30000 },
    );
    result.duringPointerMove = await page.evaluate(() => {
      const selection = document.querySelector('[data-testid="iframe-edit-overlay"]');
      const drop = document.querySelector('[data-testid="iframe-edit-drop-overlay"]');
      return {
        selectionBlockId: selection?.getAttribute('data-r20-block-id'),
        phase: selection?.getAttribute('data-r20-edit-phase'),
        hitPathLength: Number(selection?.getAttribute('data-r20-hit-path-length')),
        dropTargetId: drop?.getAttribute('data-r20-drop-target-id'),
        dropMode: drop?.getAttribute('data-r20-drop-mode'),
      };
    });
    const observedPointerId = await page.evaluate(() => Number(
      document.querySelector('[data-testid="iframe-edit-overlay"]')
        ?.getAttribute('data-r20-pointer-id') ?? NaN,
    ));
    result.pointerSequence.pointerId = Number.isInteger(observedPointerId)
      ? observedPointerId
      : (result.pointerSequence.pointerId ?? 17);
    const activePointerId = result.pointerSequence.pointerId;
    await frame.evaluate((pointerId) => {
      const subject = document.querySelector('.sheet-probe-card');
      const target = document.querySelector('.sheet-probe-drop');
      if (!subject || !target) return;
      const rect = target.getBoundingClientRect();
      subject.dispatchEvent(new PointerEvent('pointercancel', {
        bubbles: true,
        cancelable: true,
        pointerId,
        buttons: 0,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
      }));
    }, activePointerId);
    await page.mouse.up();
    await page.waitForFunction(
      () => document
        .querySelector('[data-testid="iframe-edit-overlay"]')
        ?.getAttribute('data-r20-edit-phase') === 'pointercancel',
      null,
      { timeout: 30000 },
    );
    result.duringEdit = await page.evaluate(() => {
      const current = document.querySelector('[data-testid="preview-iframe"]');
      const bridgeRoot = current?.closest('[data-r20-edit-bridge-ready]');
      const overlay = document.querySelector('[data-testid="iframe-edit-overlay"]');
      const pane = document.querySelector('[data-testid="preview-pane"]');
      const layerPanel = document.querySelector('[data-testid="edit-layer-panel"]');
      const toolbar = document.querySelector('[data-testid="edit-surface-toolbar"]');
      const paneRect = pane?.getBoundingClientRect();
      const layerRect = layerPanel?.getBoundingClientRect();
      const toolbarRect = toolbar?.getBoundingClientRect();
      return {
        sameElement: current === window.__persistentPreviewIframeElement,
        connected: Boolean(current?.isConnected),
        iframeCount: document.querySelectorAll('[data-testid="preview-iframe"]').length,
        paneVisible: document.querySelector('[data-testid="preview-pane"]')?.getAttribute('data-visible'),
        editRenderSurface: pane?.getAttribute('data-edit-render-surface'),
        paneVisibility: pane ? getComputedStyle(pane).visibility : '',
        iframeVisibility: current ? getComputedStyle(current).visibility : '',
        paneLeft: paneRect?.left ?? 0,
        paneTop: paneRect?.top ?? 0,
        layerRight: layerRect?.right ?? 0,
        toolbarBottom: toolbarRect?.bottom ?? 0,
        layerWidth: layerRect?.width ?? 0,
        toolbarHeight: toolbarRect?.height ?? 0,
        shadowCount: document.querySelectorAll('[data-testid="edit-canvas-shadow-host"]').length,
        iframeSlotCount: document.querySelectorAll('[data-testid="edit-canvas-iframe-slot"]').length,
        loadCount: window.__persistentPreviewLoadCount,
        bridgeReady: bridgeRoot?.getAttribute('data-r20-edit-bridge-ready'),
        overlayCount: document.querySelectorAll('[data-testid="iframe-edit-overlay"]').length,
        overlayBlockId: overlay?.getAttribute('data-r20-block-id'),
        overlayPhase: overlay?.getAttribute('data-r20-edit-phase'),
        pointerId: Number(overlay?.getAttribute('data-r20-pointer-id')),
        hitPathLength: Number(overlay?.getAttribute('data-r20-hit-path-length')),
        offsetParentBlockId: overlay?.getAttribute('data-r20-offset-parent-block-id'),
        dropOverlayCount: document.querySelectorAll('[data-testid="iframe-edit-drop-overlay"]').length,
        overlayWidth: Number.parseFloat(overlay?.style.width || '0'),
        overlayHeight: Number.parseFloat(overlay?.style.height || '0'),
      };
    });
    result.duringEdit.subjectStyle = await frame.evaluate(() => {
      const subject = document.querySelector('.sheet-probe-card');
      return {
        transform: subject?.style.transform ?? '',
        transition: subject?.style.transition ?? '',
        willChange: subject?.style.willChange ?? '',
      };
    });
    result.flowCommit = await page.evaluate(() => {
      window.__r20PerfTimings = {};
      window.__r20SmokeFlowStartedAt = performance.now();
      window.__r20SmokeFlowStartedEpoch = performance.timeOrigin + performance.now();
      return {
        beforeAck: Number(document
          .querySelector('[data-r20-apply-acked]')
          ?.getAttribute('data-r20-apply-acked')),
      };
    });
    result.flowCommit.beforeStats = await readApplyStats(frame);
    Object.assign(result.flowCommit, await frame.evaluate(() => {
      const subject = document.querySelector('.sheet-probe-card');
      const target = document.querySelector('.sheet-probe-drop');
      if (!subject || !target) return { dispatched: false };
      const subjectRect = subject.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const pointerId = 18;
      subject.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        pointerId,
        button: 0,
        buttons: 1,
        clientX: subjectRect.left + subjectRect.width / 2,
        clientY: subjectRect.top + subjectRect.height / 2,
      }));
      subject.dispatchEvent(new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        pointerId,
        button: 0,
        buttons: 1,
        clientX: targetRect.left + targetRect.width / 2,
        clientY: targetRect.top + targetRect.height / 2,
      }));
      return {
        dispatched: true,
        subjectBlockId: subject.getAttribute('data-r20-block-id'),
        targetBlockId: target.getAttribute('data-r20-block-id'),
      };
    }));
    await frame.waitForFunction(
      ({ pointerId, subjectBlockId }) => (
        document.body?.getAttribute('data-r20-flow-target-ready') === String(pointerId)
        && document.body?.getAttribute('data-r20-flow-target-subject') === subjectBlockId
      ),
      { pointerId: 18, subjectBlockId: result.flowCommit.subjectBlockId },
      { timeout: 30000 },
    );
    result.flowCommit.targetReadyObservedMs = await page.evaluate(
      () => performance.now() - window.__r20SmokeFlowStartedAt,
    );
    result.flowCommit.targetReadyMs = await frame.evaluate(
      () => Number(document.body?.getAttribute('data-r20-flow-target-ready-at') ?? 0),
    ) - await page.evaluate(() => window.__r20SmokeFlowStartedEpoch);
    await frame.evaluate(() => {
      const subject = document.querySelector('.sheet-probe-card');
      const target = document.querySelector('.sheet-probe-drop');
      if (!subject || !target) return;
      const targetRect = target.getBoundingClientRect();
      subject.dispatchEvent(new PointerEvent('pointerup', {
        bubbles: true,
        cancelable: true,
        pointerId: 18,
        button: 0,
        buttons: 0,
        clientX: targetRect.left + targetRect.width / 2,
        clientY: targetRect.top + targetRect.height / 2,
      }));
    });
    await frame.waitForFunction(
      (beforeMoves) => Number(document.body?.getAttribute('data-r20-optimistic-flow-moves') ?? 0) > beforeMoves,
      result.flowCommit.beforeStats.optimisticFlowMoves,
      { timeout: 30000 },
    );
    result.flowCommit.optimisticObservedMs = await page.evaluate(
      () => performance.now() - window.__r20SmokeFlowStartedAt,
    );
    result.flowCommit.optimisticMs = await frame.evaluate(
      () => Number(document.body?.getAttribute('data-r20-last-optimistic-epoch') ?? 0),
    ) - await page.evaluate(() => window.__r20SmokeFlowStartedEpoch);
    await page.waitForFunction(
      (beforeAck) => Number(document
        .querySelector('[data-r20-apply-acked]')
        ?.getAttribute('data-r20-apply-acked')) > beforeAck,
      result.flowCommit.beforeAck,
      { timeout: 30000 },
    );
    await waitForRenderReady(page);
    await frame.waitForFunction(
      () => Boolean(document.querySelector('.sheet-probe-drop > .sheet-probe-card')),
      null,
      { timeout: 30000 },
    );
    Object.assign(result.flowCommit, {
      afterAck: await page.evaluate(() => Number(document
        .querySelector('[data-r20-apply-acked]')
        ?.getAttribute('data-r20-apply-acked'))),
      nestedInTarget: await frame.evaluate(
        () => Boolean(document.querySelector('.sheet-probe-drop > .sheet-probe-card')),
      ),
      inputValue: await input.inputValue(),
      runtimeToken: await frame.evaluate(() => window.__persistentPreviewRuntimeToken),
      loadCount: await page.evaluate(() => window.__persistentPreviewLoadCount),
      ackMs: await page.evaluate(() => performance.now() - window.__r20SmokeFlowStartedAt),
      timings: await page.evaluate(() => {
        const started = Number(window.__r20SmokeFlowStartedAt ?? 0);
        const timings = window.__r20PerfTimings ?? {};
        return Object.fromEntries(Object.entries(timings).map(([name, value]) => [
          name,
          { atMs: value, deltaMs: value - started },
        ]));
      }),
    });
    result.flowCommit.stats = await readApplyStats(frame);
    result.flowCommit.afterStyle = await frame.evaluate(() => {
      const subject = document.querySelector('.sheet-probe-card');
      return {
        transform: subject?.style.transform ?? '',
        transition: subject?.style.transition ?? '',
        willChange: subject?.style.willChange ?? '',
      };
    });
    await page.locator('[data-testid="edit-placement-free"]').evaluate((button) => button.click());
    result.freeCommit = await page.evaluate(() => ({
      beforeAck: Number(document
        .querySelector('[data-r20-apply-acked]')
        ?.getAttribute('data-r20-apply-acked')),
    }));
    result.freeCommit.preStyle = await frame.evaluate(() => {
      const subject = document.querySelector('.sheet-probe-card');
      return {
        transform: subject?.style.transform ?? '',
        transition: subject?.style.transition ?? '',
        willChange: subject?.style.willChange ?? '',
      };
    });
    Object.assign(result.freeCommit, await frame.evaluate(() => {
      const subject = document.querySelector('.sheet-probe-card');
      const container = document.querySelector('.sheet-probe-drop');
      if (!subject || !container) return { dispatched: false };
      const rect = subject.getBoundingClientRect();
      const pointerId = 19;
      const start = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      subject.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        pointerId,
        button: 0,
        buttons: 1,
        clientX: start.x,
        clientY: start.y,
      }));
      subject.dispatchEvent(new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        pointerId,
        button: 0,
        buttons: 1,
        clientX: start.x + 40,
        clientY: start.y + 24,
      }));
      return {
        dispatched: true,
        subjectBlockId: subject.getAttribute('data-r20-block-id'),
        containerBlockId: container.getAttribute('data-r20-block-id'),
        pointerId,
      };
    }));
    await frame.waitForFunction(
      () => document.querySelector('.sheet-probe-card')?.style.transform.includes('translate3d('),
      null,
      { timeout: 30000 },
    );
    result.freeCommit.optimisticTransform = await frame.evaluate(() => (
      document.querySelector('.sheet-probe-card')?.style.transform ?? ''
    ));
    await frame.evaluate((pointerId) => {
      const subject = document.querySelector('.sheet-probe-card');
      if (!subject) return;
      const rect = subject.getBoundingClientRect();
      subject.dispatchEvent(new PointerEvent('pointerup', {
        bubbles: true,
        cancelable: true,
        pointerId,
        button: 0,
        buttons: 0,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
      }));
    }, result.freeCommit.pointerId);
    await page.waitForFunction(
      (beforeAck) => Number(document
        .querySelector('[data-r20-apply-acked]')
        ?.getAttribute('data-r20-apply-acked')) > beforeAck,
      result.freeCommit.beforeAck,
      { timeout: 30000 },
    );
    await waitForRenderReady(page);
    Object.assign(result.freeCommit, await frame.evaluate(() => {
      const subject = document.querySelector('.sheet-probe-card');
      const container = document.querySelector('.sheet-probe-drop');
      const subjectStyle = subject ? getComputedStyle(subject) : null;
      const containerStyle = container ? getComputedStyle(container) : null;
      return {
        computedPosition: subjectStyle?.position ?? '',
        computedLeft: Number.parseFloat(subjectStyle?.left ?? ''),
        computedTop: Number.parseFloat(subjectStyle?.top ?? ''),
        transform: subjectStyle?.transform ?? '',
        containerPosition: containerStyle?.position ?? '',
        subjectClass: subject?.className ?? '',
        containerClass: container?.className ?? '',
      };
    }));
    Object.assign(result.freeCommit, await page.evaluate(() => {
      const emit = window.__perfHook.getEmitContent();
      return {
        afterAck: Number(document
          .querySelector('[data-r20-apply-acked]')
          ?.getAttribute('data-r20-apply-acked')),
        emittedCssHasAbsolute: /sheet-r20-node-[^{]+\{[^}]*position:\s*absolute;[^}]*left:\s*\d+px;[^}]*top:\s*\d+px;/i.test(emit.css),
        emittedCssHasRelative: /sheet-r20-node-[^{]+\{[^}]*position:\s*relative;/i.test(emit.css),
        loadCount: window.__persistentPreviewLoadCount,
      };
    }));
    Object.assign(result.freeCommit, {
      inputValue: await input.inputValue(),
      runtimeToken: await frame.evaluate(() => window.__persistentPreviewRuntimeToken),
    });
    result.freeCommit.stats = await readApplyStats(frame);
    result.freeCommit.afterStyle = await frame.evaluate(() => {
      const subject = document.querySelector('.sheet-probe-card');
      return {
        transform: subject?.style.transform ?? '',
        transition: subject?.style.transition ?? '',
        willChange: subject?.style.willChange ?? '',
      };
    });
    result.freeRecommit = await page.evaluate(() => {
      window.__r20SmokeFreeStartedAt = performance.now();
      return {
        beforeAck: Number(document
          .querySelector('[data-r20-apply-acked]')
          ?.getAttribute('data-r20-apply-acked')),
      };
    });
    Object.assign(result.freeRecommit, await frame.evaluate(() => {
      const subject = document.querySelector('.sheet-probe-card');
      if (!subject) return { dispatched: false };
      const rect = subject.getBoundingClientRect();
      const pointerId = 20;
      const start = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      subject.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        pointerId,
        button: 0,
        buttons: 1,
        clientX: start.x,
        clientY: start.y,
      }));
      subject.dispatchEvent(new PointerEvent('pointerup', {
        bubbles: true,
        cancelable: true,
        pointerId,
        button: 0,
        buttons: 0,
        clientX: start.x + 16,
        clientY: start.y + 16,
      }));
      return { dispatched: true };
    }));
    await page.waitForFunction(
      (beforeAck) => Number(document
        .querySelector('[data-r20-apply-acked]')
        ?.getAttribute('data-r20-apply-acked')) > beforeAck,
      result.freeRecommit.beforeAck,
      { timeout: 30000 },
    );
    Object.assign(result.freeRecommit, await frame.evaluate(() => {
      const subject = document.querySelector('.sheet-probe-card');
      const style = subject ? getComputedStyle(subject) : null;
      return {
        computedLeft: Number.parseFloat(style?.left ?? ''),
        computedTop: Number.parseFloat(style?.top ?? ''),
      };
    }));
    result.freeRecommit.afterAck = await page.evaluate(() => Number(document
      .querySelector('[data-r20-apply-acked]')
      ?.getAttribute('data-r20-apply-acked')));
    result.freeRecommit.ackMs = await page.evaluate(
      () => performance.now() - window.__r20SmokeFreeStartedAt,
    );
    result.freeRecommit.stats = await readApplyStats(frame);
    result.freeRecommit.afterStyle = await frame.evaluate(() => {
      const subject = document.querySelector('.sheet-probe-card');
      return {
        transform: subject?.style.transform ?? '',
        transition: subject?.style.transition ?? '',
        willChange: subject?.style.willChange ?? '',
      };
    });
    result.escapedDrag = await page.evaluate(() => ({
      beforeAck: Number(document
        .querySelector('[data-r20-apply-acked]')
        ?.getAttribute('data-r20-apply-acked')),
    }));
    await page.evaluate(() => {
      window.__r20EscapedParentEvents = [];
      for (const type of ['pointerdown', 'pointerup', 'pointercancel', 'mouseup', 'blur']) {
        window.addEventListener(type, (event) => {
          window.__r20EscapedParentEvents.push({
            type,
            pointerId: 'pointerId' in event ? event.pointerId : null,
            x: 'clientX' in event ? event.clientX : null,
            y: 'clientY' in event ? event.clientY : null,
          });
        }, { capture: true, once: false });
      }
    });
    const escapedSubjectBox = await frame.locator('.sheet-probe-card').boundingBox();
    const escapedIframeBox = await iframe.boundingBox();
    if (!escapedSubjectBox || !escapedIframeBox) throw new Error('escaped-drag geometry unavailable');
    const escapedStart = {
      x: escapedSubjectBox.x + escapedSubjectBox.width / 2,
      y: escapedSubjectBox.y + escapedSubjectBox.height / 2,
    };
    const escapedEnd = {
      x: Math.min(escapedIframeBox.x + escapedIframeBox.width - 8, escapedStart.x + 80),
      y: escapedIframeBox.y + escapedIframeBox.height + 120,
    };
    const escapedPointerId = 77;
    await frame.evaluate(({ start, pointerId }) => {
      const subject = document.querySelector('.sheet-probe-card');
      if (!subject) return;
      subject.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        pointerId,
        button: 0,
        buttons: 1,
        clientX: start.x,
        clientY: start.y,
      }));
      subject.dispatchEvent(new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        pointerId,
        button: 0,
        buttons: 1,
        clientX: start.x + 40,
        clientY: start.y + 24,
      }));
    }, { start: escapedStart, pointerId: escapedPointerId });
    await page.waitForFunction(
      (pointerId) => document.querySelector('[data-testid="iframe-edit-overlay"]')
        ?.getAttribute('data-r20-pointer-id') === String(pointerId),
      escapedPointerId,
      { timeout: 30000 },
    );
    const escapedTransformDuringDrag = await frame.evaluate(() => (
      document.querySelector('.sheet-probe-card')?.style.transform ?? ''
    ));
    await page.evaluate(({ end, pointerId }) => {
      window.dispatchEvent(new PointerEvent('pointerup', {
        bubbles: true,
        cancelable: true,
        pointerId,
        button: 0,
        buttons: 0,
        clientX: end.x,
        clientY: end.y,
      }));
    }, { end: escapedEnd, pointerId: escapedPointerId });
    await page.waitForTimeout(100);
    Object.assign(result.escapedDrag, await frame.evaluate(
      ({ start, end, transformDuringDrag }) => {
        const subject = document.querySelector('.sheet-probe-card');
        const style = subject ? getComputedStyle(subject) : null;
        return {
          dispatched: true,
        start,
        end,
        transformDuringDrag,
          inlineTransformAfterRelease: subject?.style.transform ?? '',
          computedTransformAfterRelease: style?.transform ?? '',
          transitionAfterRelease: subject?.style.transition ?? '',
          willChangeAfterRelease: subject?.style.willChange ?? '',
          editPhase: document.querySelector('[data-r20-edit-phase]')
            ?.getAttribute('data-r20-edit-phase') ?? '',
          afterAck: Number(document
            .querySelector('[data-r20-apply-acked]')
            ?.getAttribute('data-r20-apply-acked')),
        };
      },
      { start: escapedStart, end: escapedEnd, transformDuringDrag: escapedTransformDuringDrag },
    ));
    result.escapedDrag.parentEvents = await page.evaluate(
      () => window.__r20EscapedParentEvents ?? [],
    );
    result.escapedDrag.subjectBox = escapedSubjectBox;
    result.escapedDrag.iframeBox = escapedIframeBox;
    await page.locator('[data-testid="edit-placement-flow"]').evaluate((button) => button.click());
    result.widgetDrop = await page.evaluate(() => ({
      beforeAck: Number(document
        .querySelector('[data-r20-apply-acked]')
        ?.getAttribute('data-r20-apply-acked')),
    }));
    Object.assign(result.widgetDrop, await frame.evaluate(() => {
      const target = document.querySelector('.sheet-probe-drop');
      if (!target) return { dispatched: false };
      const rect = target.getBoundingClientRect();
      const dataTransfer = new DataTransfer();
      dataTransfer.setData(
        'application/x-r20-friendly-widget',
        JSON.stringify({ id: 'number-input' }),
      );
      const point = {
        x: rect.left + Math.max(8, rect.width / 2),
        y: rect.top + Math.max(8, rect.height / 2),
      };
      const dragOver = new DragEvent('dragover', {
        bubbles: true,
        cancelable: true,
        clientX: point.x,
        clientY: point.y,
        dataTransfer,
      });
      const drop = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        clientX: point.x,
        clientY: point.y,
        dataTransfer,
      });
      const dragOverAccepted = !target.dispatchEvent(dragOver);
      const dropAccepted = !target.dispatchEvent(drop);
      return { dispatched: true, dragOverAccepted, dropAccepted };
    }));
    await page.waitForFunction(
      (beforeAck) => Number(document
        .querySelector('[data-r20-apply-acked]')
        ?.getAttribute('data-r20-apply-acked')) > beforeAck,
      result.widgetDrop.beforeAck,
      { timeout: 30000 },
    );
    await frame.waitForFunction(
      () => Boolean(document.querySelector('.sheet-probe-drop input[name="attr_value"]')),
      null,
      { timeout: 30000 },
    );
    Object.assign(result.widgetDrop, {
      afterAck: await page.evaluate(() => Number(document
        .querySelector('[data-r20-apply-acked]')
        ?.getAttribute('data-r20-apply-acked'))),
      nestedInTarget: await frame.evaluate(
        () => Boolean(document.querySelector('.sheet-probe-drop input[name="attr_value"]')),
      ),
      loadCount: await page.evaluate(() => window.__persistentPreviewLoadCount),
      inputValue: await input.inputValue(),
      runtimeToken: await frame.evaluate(() => window.__persistentPreviewRuntimeToken),
    });
    result.widgetDrop.stats = await readApplyStats(frame);
    result.hiddenInputValue = await input.inputValue();
    result.hiddenRuntimeToken = await frame.evaluate(() => window.__persistentPreviewRuntimeToken);

    await page.evaluate(() => window.__perfHook.setMainMode('preview'));
    await iframe.waitFor({ state: 'visible', timeout: 30000 });
    await frame.waitForFunction(
      () => document.body?.getAttribute('data-r20-edit-mode') === '0',
      null,
      { timeout: 30000 },
    );
    await page.waitForFunction(
      () => (
        (document.querySelector('[data-testid="sidebar-left"]')?.getBoundingClientRect().width ?? -1) <= 1
        && (document.querySelector('[data-testid="sidebar-right"]')?.getBoundingClientRect().width ?? -1) <= 1
      ),
      null,
      { timeout: 30000 },
    );
    result.after = await page.evaluate(() => {
      const current = document.querySelector('[data-testid="preview-iframe"]');
      return {
        sameElement: current === window.__persistentPreviewIframeElement,
        connected: Boolean(current?.isConnected),
        iframeCount: document.querySelectorAll('[data-testid="preview-iframe"]').length,
        paneVisible: document.querySelector('[data-testid="preview-pane"]')?.getAttribute('data-visible'),
        loadCount: window.__persistentPreviewLoadCount,
        overlayCount: document.querySelectorAll('[data-testid="iframe-edit-overlay"]').length,
      };
    });
    result.previewFocus = await page.evaluate(() => ({
      leftWidth: document.querySelector('[data-testid="sidebar-left"]')?.getBoundingClientRect().width ?? -1,
      rightWidth: document.querySelector('[data-testid="sidebar-right"]')?.getBoundingClientRect().width ?? -1,
      leftToggleCount: document.querySelectorAll('[data-testid="sidebar-left-toggle"]').length,
      rightToggleCount: document.querySelectorAll('[aria-label*="오른쪽 패널 열기/닫기"]').length,
      statusbarCount: document.querySelectorAll('[data-testid="statusbar"]').length,
      chatListCount: document.querySelectorAll('[data-testid="chat-list"]').length,
      previewFocus: document.querySelector('[data-preview-focus="true"]') !== null,
    }));
    result.afterInputValue = await input.inputValue();
    result.afterRuntimeToken = await frame.evaluate(() => window.__persistentPreviewRuntimeToken);

    // Chat is a separate editor tool, not part of the sheet-only preview.
    // Switch to the split workspace before exercising the local rolltemplate
    // bridge so the test validates both product surfaces independently.
    await page.evaluate(() => window.__perfHook.setMainMode('split'));
    await page.locator('[data-testid="tab-chat"]').click();
    await page.locator('[data-testid="chat-list"]').waitFor({ state: 'attached', timeout: 30000 });
    result.rollChat = {
      beforeCards: await page.locator('[data-r20-chat-card]').count(),
    };
    await frame.locator('button[type="roll"][name="roll_probe"]').click();
    await page.locator('[data-testid="chat-list"] [data-r20-chat-rolltemplate="1"]')
      .waitFor({ state: 'visible', timeout: 30000 });
    Object.assign(result.rollChat, await page.evaluate(() => {
      const cards = document.querySelectorAll('[data-r20-chat-card]');
      const card = cards[0];
      return {
        afterCards: cards.length,
        kind: card?.getAttribute('data-r20-chat-kind') ?? null,
        rolltemplate: card?.getAttribute('data-r20-chat-rolltemplate') ?? null,
        hasTemplateBody: Boolean(card?.querySelector('[class*="sheet-rolltemplate-default"]')),
        iframeCount: document.querySelectorAll('[data-testid="preview-iframe"]').length,
        loadCount: window.__persistentPreviewLoadCount,
      };
    }));
    result.workerChange = await page.evaluate(() => ({
      beforeAck: Number(document
        .querySelector('[data-r20-apply-acked]')
        ?.getAttribute('data-r20-apply-acked')),
      beforeLoadCount: window.__persistentPreviewLoadCount,
    }));
    result.workerChange.beforeValue = await frame
      .locator('input[name="attr_worker_probe"]')
      .inputValue();
    result.workerChange.import = await page.evaluate(async () => window.__perfHook.importSheet({
      html: '<div class="sheet-probe-frame"><div class="sheet-probe-card"><span class="compatibility-probe">Mode probe</span><input type="text" name="attr_probe" value="initial"><input type="text" name="attr_worker_probe" value=""><button type="roll" name="roll_probe" value="&amp;{template:default} {{name=Probe}} {{result=[[1d20]]}}">Roll</button></div><div class="sheet-probe-drop">Drop target</div></div><rolltemplate class="sheet-rolltemplate-default"><div>{{name}}</div><div>{{result}}</div></rolltemplate><script type="text/worker">on("sheet:opened", function () { setAttrs({ worker_probe: "B" }); });</script>',
      css: '.sheet-probe-frame { position: relative; width: 360px; margin-left: 420px; padding: 10px; } .sheet-probe-card { width: 320px; min-height: 80px; padding: 12px; } .compatibility-probe { position: fixed; left: -9999px; top: -9999px; pointer-events: none; } .sheet-probe-drop { width: 320px; min-height: 40px; margin-top: 12px; padding: 12px; }',
    }));
    await page.waitForFunction(
      (beforeAck) => Number(document
        .querySelector('[data-r20-apply-acked]')
        ?.getAttribute('data-r20-apply-acked')) > beforeAck,
      result.workerChange.beforeAck,
      { timeout: 30000 },
    );
    await frame.waitForFunction(
      () => document.querySelector('input[name="attr_worker_probe"]')?.value === 'B',
      null,
      { timeout: 30000 },
    );
    result.workerChange.installedValue = await frame
      .locator('input[name="attr_worker_probe"]')
      .inputValue();
    const replacedProbe = frame.locator('input[name="attr_probe"]');
    await replacedProbe.fill(`after-worker-${mode}`);
    await replacedProbe.evaluate((node) => node.dispatchEvent(new Event('change', { bubbles: true })));
    await page.waitForTimeout(50);
    Object.assign(result.workerChange, {
      afterAck: await page.evaluate(() => Number(document
        .querySelector('[data-r20-apply-acked]')
        ?.getAttribute('data-r20-apply-acked'))),
      afterProbeChangeValue: await frame.locator('input[name="attr_worker_probe"]').inputValue(),
      workerScriptCount: await frame.locator('script[type="text/worker"]').count(),
      sameElement: await page.evaluate(() => document
        .querySelector('[data-testid="preview-iframe"]') === window.__persistentPreviewIframeElement),
      iframeCount: await page.locator('[data-testid="preview-iframe"]').count(),
      afterLoadCount: await page.evaluate(() => window.__persistentPreviewLoadCount),
    });
    result.workerChange.stats = await readApplyStats(frame);

    // Exercise the iframe's monotonic revision guard after all normal source
    // changes are complete. A delayed older patch must not roll the sheet back.
    result.revisionOrdering = await page.evaluate(() => {
      const iframe = document.querySelector('[data-testid="preview-iframe"]');
      const bridgeId = window.__r20SmokeBridgeId;
      const lastAck = Number(document
        .querySelector('[data-r20-apply-acked]')
        ?.getAttribute('data-r20-apply-acked') ?? 0);
      const revision = Math.max(lastAck + 100000, 100000);
      const styles = {
        'roll20-legacy-sheet-surface': '',
        'roll20-base-dark': '',
        'roll20-legacy-input-state': '',
        'r20-layer-filter': '',
        'r20-user': '',
        'r20-renderer-model': '',
      };
      iframe?.contentWindow?.postMessage({
        type: 'r20:edit-apply',
        protocol: 1,
        bridgeId,
        revision,
        html: '<div data-r20-block-id="revision-probe">new</div>',
        htmlKey: 'revision-probe-new',
        styles,
        i18n: '{}',
        darkMode: false,
        layer: 'all',
        roll20SandboxSanitize: false,
        roll20RendererModel: 'default',
        documentLanguage: 'en',
      }, '*');
      return { bridgeIdPresent: typeof bridgeId === 'string' && bridgeId.length > 0, revision };
    });
    if (!result.revisionOrdering.bridgeIdPresent) {
      throw new Error('revision ordering probe could not observe iframe bridge id');
    }
    await frame.waitForFunction(
      (revision) => document.body?.getAttribute('data-r20-last-applied-revision') === String(revision)
        && document.querySelector('[data-r20-block-id="revision-probe"]')?.textContent === 'new',
      result.revisionOrdering.revision,
      { timeout: 30000 },
    );
    await page.evaluate(({ revision }) => {
      const iframe = document.querySelector('[data-testid="preview-iframe"]');
      const bridgeId = window.__r20SmokeBridgeId;
      iframe?.contentWindow?.postMessage({
        type: 'r20:edit-apply',
        protocol: 1,
        bridgeId,
        revision: revision - 1,
      }, '*');
    }, result.revisionOrdering);
    await page.waitForTimeout(75);
    result.revisionOrdering.after = await frame.evaluate(() => ({
      text: document.querySelector('[data-r20-block-id="revision-probe"]')?.textContent ?? '',
      lastRevision: Number(document.body?.getAttribute('data-r20-last-applied-revision') ?? 0),
      staleDrops: Number(document.body?.getAttribute('data-r20-stale-apply-drops') ?? 0),
    }));
    result.consoleErrors = consoleErrors;
    result.pageErrors = pageErrors;
    result.pass =
      result.import?.blockCount > 0
      && result.initialApply.ackedRevision > 0
      && result.initialApply.pendingRevision === ''
      && result.initialApply.sourceStayedOutOfSrcdoc === true
      && Number.isFinite(result.initialApply.stats.rootReplacements)
      && result.leftSidebar.openWidth > 0
      && result.leftSidebar.collapsedWidth === 0
      && result.leftSidebar.collapsedButtonCount === 0
      && result.leftSidebar.collapsedChildCount === 0
      && Math.abs(result.leftSidebar.restoredWidth - result.leftSidebar.openWidth) <= 1
      && result.liveApplyMutation.afterAck > result.liveApplyMutation.beforeAck
      && result.liveApplyMutation.added?.nested === true
      && result.liveApplyMutation.inputValue === `runtime-${mode}`
      && result.liveApplyMutation.runtimeToken === token
      && result.liveApplyMutation.loadCount === 0
      && result.liveApplyMutation.stats.mode === 'patch'
      && result.liveApplyMutation.stats.rootReplacements === result.initialApply.stats.rootReplacements
      && result.liveApplyMutation.stats.structuralPatches > result.initialApply.stats.structuralPatches
      && result.liveApplyMutation.stats.structuralPatchFallbacks === 0
      && result.compatibilityToggle.alternate.modeStylePresent === (result.compatibilityToggle.alternateMode === 'legacy')
      && result.compatibilityToggle.alternate.probe.className.includes('sheet-compatibility-probe')
      && result.compatibilityToggle.alternate.probe.position === (
        result.compatibilityToggle.alternateMode === 'legacy' ? 'absolute' : 'fixed'
      )
      && result.compatibilityToggle.alternate.inputValue === `runtime-${mode}`
      && result.compatibilityToggle.alternate.runtimeToken === token
      && result.compatibilityToggle.alternate.iframeCount === 1
      && result.compatibilityToggle.alternate.loadCount === result.compatibilityToggle.beforeLoadCount
      && result.compatibilityToggle.alternate.ack > result.compatibilityToggle.beforeAck
      && (result.compatibilityToggle.alternate.stats.mode === 'styles'
        || result.compatibilityToggle.alternate.stats.mode === 'patch')
      && result.compatibilityToggle.alternate.stats.structuralPatchFallbacks === 0
      && result.compatibilityToggle.restored.modeStylePresent === (mode === 'legacy')
      && result.compatibilityToggle.restored.probe.className.includes('sheet-compatibility-probe')
      && result.compatibilityToggle.restored.probe.position === (mode === 'legacy' ? 'absolute' : 'fixed')
      && result.compatibilityToggle.restored.inputValue === `runtime-${mode}`
      && result.compatibilityToggle.restored.runtimeToken === token
      && result.compatibilityToggle.restored.iframeCount === 1
      && result.compatibilityToggle.restored.loadCount === result.compatibilityToggle.beforeLoadCount
      && result.compatibilityToggle.restored.ack > result.compatibilityToggle.alternate.ack
      && (result.compatibilityToggle.restored.stats.mode === 'styles'
        || result.compatibilityToggle.restored.stats.mode === 'patch')
      && result.compatibilityToggle.restored.stats.structuralPatchFallbacks === 0
      && result.before.iframeCount === 1
      && result.before.paneVisible === 'true'
      && result.before.hasLegacyInputStyle === (mode === 'legacy')
      && result.duringEdit.sameElement
      && result.duringEdit.connected
      && result.duringEdit.iframeCount === 1
      && result.duringEdit.paneVisible === 'true'
      && result.duringEdit.editRenderSurface === 'iframe'
      && result.duringEdit.paneVisibility === 'visible'
      && result.duringEdit.iframeVisibility === 'visible'
      && result.duringEdit.paneLeft >= result.duringEdit.layerRight - 1
      && result.duringEdit.paneTop >= result.duringEdit.toolbarBottom - 1
      && Math.abs(result.duringEdit.layerWidth - 248) <= 1
      && Math.abs(result.duringEdit.toolbarHeight - 36) <= 1
      && result.duringEdit.shadowCount === 0
      && result.duringEdit.iframeSlotCount === 1
      && result.duringEdit.loadCount === 0
      && Number.isFinite(result.autoCanvasWidth.width)
      && result.autoCanvasWidth.width === 850
      && result.trustSurface.pastelShell === true
      && result.trustSurface.bugReportHref.startsWith('mailto:sjh11235678@gmail.com')
      && result.trustSurface.githubLinkCount === 0
      && result.manualCanvasWidth.inputValue === '850'
      && result.manualCanvasWidth.iframeStyle.includes('width: 850px')
      && result.layerSelection.layerRowClicked === true
      && result.layerSelection.iframeHighlighted === true
      && result.layerSelection.layerHighlightedFromIframe === true
      && result.zoom.scale100 === 'scale(1)'
      && /^scale\(0\.[0-9]+\)$/.test(result.zoom.scaleFit)
      && result.zoom.afterLoadCount === result.zoom.beforeLoadCount
      && result.zoom.iframeCount === 1
      && result.contextMenu.dispatched === true
      && result.contextMenu.defaultPrevented === true
      && result.contextMenu.menuBlockId === result.contextMenu.blockId
      && result.contextMenu.insideIframeViewport === true
      && result.contextMenu.inspectActivated === true
      && result.contextMenu.mutations.duplicate.dispatched === true
      && result.contextMenu.mutations.duplicate.menuBlockId === result.contextMenu.blockId
      && result.contextMenu.mutations.duplicate.selected === true
      && result.contextMenu.mutations.duplicate.cardCount === 2
      && result.contextMenu.mutations.duplicate.blockCount > result.contextMenu.mutations.beforeBlockCount
      && result.contextMenu.mutations.duplicate.emitted === true
      && result.contextMenu.mutations.delete.dispatched === true
      && result.contextMenu.mutations.delete.menuBlockId === result.contextMenu.mutations.duplicate.duplicateId
      && result.contextMenu.mutations.delete.cardCount === 1
      && result.contextMenu.mutations.delete.blockCount === result.contextMenu.mutations.beforeBlockCount
      && result.contextMenu.mutations.delete.duplicateAbsent === true
      && result.contextMenu.mutations.delete.iframeCount === 1
      && result.contextMenu.mutations.delete.loadCount === 0
      && result.staleBridgeRejected === true
      && result.bridgeDispatch.dispatched === true
      && result.bridgeDispatch.defaultPrevented === true
      && typeof result.bridgeDispatch.blockId === 'string'
      && result.duringEdit.bridgeReady === '1'
      && result.duringEdit.overlayCount === 1
      && result.duringEdit.overlayBlockId === result.bridgeDispatch.blockId
      && result.pointerSequence.dispatched === true
      && typeof result.pointerSequence.subjectBlockId === 'string'
      && typeof result.pointerSequence.targetBlockId === 'string'
      && result.pointerSequence.subjectBlockId !== result.pointerSequence.targetBlockId
      && result.duringPointerMove.selectionBlockId === result.pointerSequence.subjectBlockId
      && result.duringPointerMove.phase === 'pointermove'
      && result.duringPointerMove.hitPathLength >= 2
      && result.duringPointerMove.dropTargetId === result.pointerSequence.targetBlockId
      && result.duringPointerMove.dropMode === 'inside'
      && result.duringEdit.overlayPhase === 'pointercancel'
      && result.duringEdit.pointerId === result.pointerSequence.pointerId
      && result.duringEdit.hitPathLength >= 2
      && typeof result.duringEdit.offsetParentBlockId === 'string'
      && result.duringEdit.offsetParentBlockId.length > 0
      && result.duringEdit.dropOverlayCount === 0
      && result.duringEdit.overlayWidth > 0
      && result.duringEdit.overlayHeight > 0
      && result.flowCommit.dispatched === true
      && result.flowCommit.afterAck > result.flowCommit.beforeAck
      && result.flowCommit.nestedInTarget === true
      && result.flowCommit.inputValue === `runtime-${mode}`
      && result.flowCommit.runtimeToken === token
      && result.flowCommit.loadCount === 0
      && result.flowCommit.stats.mode === 'patch'
      && result.flowCommit.stats.rootReplacements === result.liveApplyMutation.stats.rootReplacements
      && result.flowCommit.stats.structuralPatches > result.liveApplyMutation.stats.structuralPatches
      && result.flowCommit.stats.structuralPatchFallbacks === 0
      && result.flowCommit.stats.optimisticFlowMoves > result.liveApplyMutation.stats.optimisticFlowMoves
      && result.flowCommit.stats.lastOptimisticAt > 0
      && result.flowCommit.stats.lastOptimisticAt <= result.flowCommit.stats.lastApplyAt
      && result.flowCommit.stats.optimisticFlowFastPatches === 1
      && result.flowCommit.stats.optimisticFlowCheck === 'accepted'
      && result.flowCommit.stats.lastApplyCostMs < 10
      && Number.isFinite(result.flowCommit.optimisticMs)
      && result.flowCommit.optimisticMs >= 0
      && result.flowCommit.optimisticMs <= OPTIMISTIC_BUDGET_MS
      && result.freeCommit.dispatched === true
      && result.freeCommit.afterAck > result.freeCommit.beforeAck
      && result.freeCommit.computedPosition === 'absolute'
      && Number.isFinite(result.freeCommit.computedLeft)
      && Number.isFinite(result.freeCommit.computedTop)
      && result.freeCommit.optimisticTransform.includes('translate3d(')
      && isIdentityTransform(result.freeCommit.transform)
      && result.freeCommit.computedLeft % 8 === 0
      && result.freeCommit.computedTop % 8 === 0
      && result.freeCommit.containerPosition === 'relative'
      && result.freeCommit.subjectClass.includes('sheet-r20-node-')
      && result.freeCommit.containerClass.includes('sheet-r20-node-')
      && result.freeCommit.emittedCssHasAbsolute === true
      && result.freeCommit.emittedCssHasRelative === true
      && result.freeCommit.inputValue === `runtime-${mode}`
      && result.freeCommit.runtimeToken === token
      && result.freeCommit.loadCount === 0
      && result.freeCommit.stats.mode === 'patch'
      && result.freeCommit.stats.rootReplacements === result.flowCommit.stats.rootReplacements
      && result.freeCommit.stats.structuralPatches > result.flowCommit.stats.structuralPatches
      && result.freeCommit.stats.structuralPatchFallbacks === 0
      && result.freeRecommit.dispatched === true
      && result.freeRecommit.afterAck > result.freeRecommit.beforeAck
      // A free move may be clamped by the containing layout on one axis;
      // require authored movement on at least one axis.
      && (
        result.freeRecommit.computedLeft !== result.freeCommit.computedLeft
        || result.freeRecommit.computedTop !== result.freeCommit.computedTop
      )
      && result.freeRecommit.computedLeft % 8 === 0
      && result.freeRecommit.computedTop % 8 === 0
      && result.freeRecommit.stats.mode === 'styles'
      && result.freeRecommit.stats.rootReplacements === result.freeCommit.stats.rootReplacements
      && result.freeRecommit.stats.styleOnlyApplies > result.freeCommit.stats.styleOnlyApplies
      && result.escapedDrag.dispatched === true
      && result.escapedDrag.transformDuringDrag.includes('translate3d(')
      && isIdentityTransform(result.escapedDrag.computedTransformAfterRelease)
      && result.escapedDrag.inlineTransformAfterRelease === ''
      && result.escapedDrag.transitionAfterRelease === ''
      && result.escapedDrag.willChangeAfterRelease === ''
      && result.widgetDrop.dispatched === true
      && result.widgetDrop.dragOverAccepted === true
      && result.widgetDrop.dropAccepted === true
      && result.widgetDrop.afterAck > result.widgetDrop.beforeAck
      && result.widgetDrop.nestedInTarget === true
      && result.widgetDrop.loadCount === 0
      && result.widgetDrop.inputValue === `runtime-${mode}`
      && result.widgetDrop.runtimeToken === token
      && result.widgetDrop.stats.mode === 'patch'
      && result.widgetDrop.stats.rootReplacements === result.freeRecommit.stats.rootReplacements
      && result.widgetDrop.stats.structuralPatches > result.freeRecommit.stats.structuralPatches
      && result.widgetDrop.stats.structuralPatchFallbacks === 0
      && result.hiddenInputValue === `runtime-${mode}`
      && result.hiddenRuntimeToken === token
      && result.after.sameElement
      && result.after.connected
      && result.after.iframeCount === 1
      && result.after.paneVisible === 'true'
      && result.after.loadCount === 0
      && result.after.overlayCount === 0
      && result.previewFocus.leftWidth <= 1
      && result.previewFocus.rightWidth <= 1
      && result.previewFocus.leftToggleCount === 0
      && result.previewFocus.rightToggleCount === 0
      && result.previewFocus.statusbarCount === 0
      && result.previewFocus.chatListCount === 0
      && result.previewFocus.previewFocus === true
      && result.afterInputValue === `runtime-${mode}`
      && result.afterRuntimeToken === token
      && result.rollChat.afterCards === result.rollChat.beforeCards + 1
      && result.rollChat.kind === 'rolltemplate'
      && result.rollChat.rolltemplate === '1'
      && result.rollChat.hasTemplateBody === true
      && result.rollChat.iframeCount === 1
      && result.rollChat.loadCount === 0
      && result.workerChange.beforeValue === 'A-OLD'
      && result.workerChange.import?.workerBlockCount > 0
      && result.workerChange.afterAck > result.workerChange.beforeAck
      && result.workerChange.installedValue === 'B'
      && result.workerChange.afterProbeChangeValue === 'B'
      && result.workerChange.workerScriptCount === 1
      && result.workerChange.sameElement === true
      && result.workerChange.iframeCount === 1
      && result.workerChange.afterLoadCount === result.workerChange.beforeLoadCount
      && result.workerChange.stats.mode === 'patch'
      && result.workerChange.stats.rootReplacements === result.widgetDrop.stats.rootReplacements
      && result.workerChange.stats.structuralPatches > result.widgetDrop.stats.structuralPatches
      && result.workerChange.stats.structuralPatchFallbacks === 0
      && result.revisionOrdering.bridgeIdPresent === true
      && result.revisionOrdering.after.text === 'new'
      && result.revisionOrdering.after.lastRevision === result.revisionOrdering.revision
      && result.revisionOrdering.after.staleDrops >= 1
      && consoleErrors.length === 0
      && pageErrors.length === 0;
  } catch (error) {
    result.error = String(error?.stack || error).slice(0, 1500);
    result.consoleErrors = consoleErrors;
    result.pageErrors = pageErrors;
  } finally {
    await page.close();
  }
  return result;
}

async function main() {
  await fs.mkdir(REPORT_DIR, { recursive: true });
  const server = await startServer();
  const browser = await chromium.launch();
  const report = {
    startedAt: new Date().toISOString(),
    syntheticBlocks: SYNTHETIC_BLOCKS,
    optimisticBudgetMs: OPTIMISTIC_BUDGET_MS,
    modes: [],
  };
  try {
    for (const mode of MODES) {
      const result = await runMode(browser, mode);
      report.modes.push(result);
      console.log(`${result.pass ? 'PASS' : 'FAIL'} persistent-preview mode=${mode} loads=${result.after?.loadCount ?? 'n/a'}`);
    }
  } finally {
    await browser.close();
    server.close();
  }
  report.finishedAt = new Date().toISOString();
  report.pass = report.modes.every((mode) => mode.pass);
  await fs.writeFile(
    path.join(REPORT_DIR, 'persistent-preview-surface-results.json'),
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8',
  );
  console.log(report.pass ? 'PERSISTENT PREVIEW SURFACE PASS' : 'PERSISTENT PREVIEW SURFACE FAIL');
  process.exitCode = report.pass ? 0 : 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
