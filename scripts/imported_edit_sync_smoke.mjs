#!/usr/bin/env node
/**
 * Imported fixture edit-sync smoke.
 *
 * This covers the missing bridge between the pure edit-flow smoke and the
 * preview/edit screenshot smoke:
 *   1. Import a real ignored fixture through the live app bundle.
 *   2. Switch to edit mode.
 *   3. Drag one visible imported sheet node with the real pointer path.
 *   4. Verify the same block id moved in edit mode and in preview mode.
 *   5. Verify emitted HTML/CSS contains an absolute position for that block.
 *   6. Re-import the edited emit and verify the emit is stable after the edit.
 *
 * Scope: local static app only. This does not prove actual Roll20 parity.
 *
 * Usage:
 *   node scripts/imported_edit_sync_smoke.mjs \
 *     --out-dir ./out --base-path /roll20-block-editor \
 *     --fixtures test-fixtures/visual --report-dir reports/imported-edit-sync
 *
 * For a protected local source, use the ignored in-memory input mode instead
 * of copying the source into the repository:
 *   R20_IMPORTED_EDIT_HTML_PATH=... R20_IMPORTED_EDIT_CSS_PATH=... \
 *   R20_IMPORTED_EDIT_I18N_PATH=... node scripts/imported_edit_sync_smoke.mjs \
 *     --only local-input
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
const FIXTURES_DIR = path.resolve(argOf('--fixtures', 'test-fixtures/visual'));
const REPORT_DIR = path.resolve(argOf('--report-dir', 'reports/imported-edit-sync'));
const ONLY = argOf('--only', '');
const LOCAL_HTML_PATH = process.env.R20_IMPORTED_EDIT_HTML_PATH || '';
const LOCAL_CSS_PATH = process.env.R20_IMPORTED_EDIT_CSS_PATH || '';
const LOCAL_I18N_PATH = process.env.R20_IMPORTED_EDIT_I18N_PATH || '';
const CANONICAL_IFRAME = argOf('--canonical-iframe', 'true') !== 'false';
const PORT = Number(argOf('--port', '4196'));
const VIEWPORT = { width: 2200, height: 1200 };
const DRAG_DELTA = { x: Number(argOf('--dx', '80')), y: Number(argOf('--dy', '48')) };
const FAIL_ON_RESOURCE_ISSUES = argOf('--fail-on-resource-issues', 'false') === 'true';
const COMPACT_WIDE_ROWS = argOf('--compact-wide-rows', 'false') === 'true';

if (!CANONICAL_IFRAME) {
  throw new Error(
    'The retired Shadow edit surface is no longer a supported verification target. ' +
      'Run imported_edit_sync_smoke with the canonical persistent iframe path.',
  );
}
const NONLEAF_VISUAL_MISMATCH_LIMIT_PCT = Number(argOf('--nonleaf-visual-limit-pct', '2'));
const SHEET_VISUAL_MISMATCH_LIMIT_PCT = Number(argOf('--sheet-visual-limit-pct', '2'));
const REQUIRE_NONLEAF_VISUAL_SYNC = argOf('--require-nonleaf-visual-sync', 'false') === 'true';
const REQUIRE_SHEET_VISUAL_SYNC = argOf('--require-sheet-visual-sync', 'false') === 'true';

const BUILTIN_FIXTURES = [
  {
    id: 'synthetic-nonleaf-flow',
    html: [
      '<div class="sheet-synthetic-root" style="width: 640px; min-height: 260px; padding: 16px; border: 1px solid #999">',
      '  <div class="sheet-synthetic-group-a" style="display: inline-block; width: 260px; min-height: 96px; padding: 10px; border: 1px solid #69c; vertical-align: top">',
      '    <label>Group A</label>',
      '    <input type="text" name="attr_synthetic_a" value="A">',
      '  </div>',
      '  <div class="sheet-synthetic-group-b" style="display: inline-block; width: 260px; min-height: 96px; padding: 10px; border: 1px solid #c96; vertical-align: top">',
      '    <label>Group B</label>',
      '    <input type="text" name="attr_synthetic_b" value="B">',
      '  </div>',
      '</div>',
    ].join('\n'),
    css: [
      '.sheet-synthetic-root { background: #fff; }',
      '.sheet-synthetic-root input { width: 120px; }',
      '.sheet-synthetic-root label { display: block; font-weight: bold; }',
    ].join('\n'),
    i18n: '{}',
    synthetic: true,
  },
  {
    id: 'synthetic-generic-elements',
    html: [
      '<custom-card class="sheet-panel" data-kind="generic">Card</custom-card>',
      '<a class="sheet-link" href="/sheet" aria-label="Open">Open</a>',
      '<svg class="sheet-icon" viewBox="0 0 12 12"><path d="M0 0h12v12H0z"></path></svg>',
    ].join('\n'),
    css: [
      '.sheet-panel { display: block; width: 220px; padding: 12px; }',
      '.sheet-link { display: inline-block; margin: 8px; }',
      '.sheet-icon { width: 12px; height: 12px; }',
    ].join('\n'),
    i18n: '{}',
    synthetic: true,
    genericElement: true,
  },
  {
    id: 'synthetic-layer-siblings',
    html: [
      '<div class="sheet-layer-root" style="width: 520px; min-height: 180px; padding: 12px; border: 1px solid #999">',
      '  <div class="sheet-layer-frame" style="display: block; width: 320px; min-height: 96px; padding: 10px; border: 1px solid #69c">',
      '    <input type="text" name="attr_layer_first" value="First"><input type="text" name="attr_layer_second" value="Second">',
      '  </div>',
      '  <div class="sheet-layer-frame" style="display: block; width: 320px; min-height: 96px; padding: 10px; border: 1px solid #c96">',
      '    <input type="text" name="attr_layer_third" value="Third"><input type="text" name="attr_layer_fourth" value="Fourth">',
      '  </div>',
      '</div>',
    ].join('\n'),
    css: [
      '.sheet-layer-root { background: #fff; }',
      '.sheet-layer-frame input { display: block; width: 140px; margin: 4px 0; }',
    ].join('\n'),
    i18n: '{}',
    synthetic: true,
  },
  {
    id: 'synthetic-list-inside',
    html: [
      '<div class="sheet-structural-root">',
      '  <ul class="sheet-structural-list sheet-list-source">',
      '    <li class="sheet-list-moving"><span>Move item</span></li>',
      '    <li><span>Source witness</span></li>',
      '  </ul>',
      '  <ul class="sheet-structural-list sheet-list-target">',
      '    <li class="sheet-list-witness"><span>Target witness</span></li>',
      '  </ul>',
      '</div>',
    ].join('\n'),
    css: [
      '.sheet-structural-root { width: 640px; min-height: 220px; padding: 16px; background: #fff; }',
      '.sheet-structural-list { display: inline-block; width: 240px; min-height: 120px; margin: 0 12px 0 0; padding: 12px 12px 12px 32px; border: 1px solid #8aa; vertical-align: top; }',
      '.sheet-structural-list li { min-height: 28px; }',
    ].join('\n'),
    i18n: '{}',
    synthetic: true,
  },
  {
    id: 'synthetic-table-inside',
    html: [
      '<div class="sheet-structural-root">',
      '  <table class="sheet-structural-table sheet-table-source"><tbody>',
      '    <tr class="sheet-table-moving"><td>Move row</td><td>A</td></tr>',
      '    <tr><td>Source witness</td><td>B</td></tr>',
      '  </tbody></table>',
      '  <table class="sheet-structural-table sheet-table-target"><tbody>',
      '    <tr class="sheet-table-witness"><td>Target witness</td><td>C</td></tr>',
      '  </tbody></table>',
      '</div>',
    ].join('\n'),
    css: [
      '.sheet-structural-root { width: 720px; min-height: 220px; padding: 16px; background: #fff; }',
      '.sheet-structural-table { display: inline-table; width: 300px; margin: 0 12px 0 0; border-collapse: collapse; vertical-align: top; }',
      '.sheet-structural-table td { padding: 8px; border: 1px solid #b98; }',
    ].join('\n'),
    i18n: '{}',
    synthetic: true,
  },
  {
    id: 'synthetic-conditional-inside',
    html: [
      '<div class="sheet-mode-switch sheet-condition-root">',
      '  <input type="radio" class="sheet-mode-input" name="attr_mode" value="a" checked="checked">',
      '  <input type="radio" class="sheet-mode-input" name="attr_mode" value="b">',
      '  <div class="sheet-mode-panel sheet-mode-panel-a sheet-condition-panel">',
      '    <span class="sheet-condition-moving">Move content</span>',
      '  </div>',
      '  <div class="sheet-mode-panel sheet-mode-panel-b sheet-condition-panel">',
      '    <span class="sheet-condition-witness">Target content</span>',
      '  </div>',
      '</div>',
    ].join('\n'),
    css: [
      '.sheet-condition-root { width: 560px; min-height: 180px; padding: 16px; background: #fff; }',
      '.sheet-condition-panel { min-height: 72px; margin-top: 8px; padding: 10px; border: 1px solid #9ab; }',
    ].join('\n'),
    i18n: '{}',
    synthetic: true,
  },
];

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

async function readMaybe(file) {
  try {
    return await fs.readFile(file, 'utf8');
  } catch {
    return '';
  }
}

async function loadLocalInputFixture() {
  if (!LOCAL_HTML_PATH) return null;
  const html = await readMaybe(path.resolve(LOCAL_HTML_PATH));
  if (!html.trim()) throw new Error('R20_IMPORTED_EDIT_HTML_PATH did not contain HTML');
  return {
    // Keep local source identity out of reports and screenshot filenames.
    id: 'local-input',
    html,
    css: LOCAL_CSS_PATH ? await readMaybe(path.resolve(LOCAL_CSS_PATH)) : '',
    i18n: LOCAL_I18N_PATH ? await readMaybe(path.resolve(LOCAL_I18N_PATH)) : '',
    synthetic: false,
    localInput: true,
  };
}

async function assertStaticOutput() {
  const entry = path.join(OUT_DIR, 'index.html');
  try {
    const stat = await fs.stat(entry);
    if (!stat.isFile()) throw new Error('index.html is not a file');
  } catch {
    throw new Error(
      `static app output is missing at ${entry}; run `
      + '`corepack pnpm run build` before imported edit-sync smoke',
    );
  }
}

async function listFixtures() {
  const out = [];
  const localInput = await loadLocalInputFixture();
  if (localInput && (!ONLY || ONLY === localInput.id)) out.push(localInput);
  if (ONLY === 'local-input') return out;
  out.push(...BUILTIN_FIXTURES.filter((fixture) => !ONLY || fixture.id === ONLY).map((fixture) => ({ ...fixture })));
  let entries = [];
  try {
    entries = await fs.readdir(FIXTURES_DIR, { withFileTypes: true });
  } catch {
    entries = [];
  }
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    if (ONLY && ent.name !== ONLY) continue;
    const dir = path.join(FIXTURES_DIR, ent.name);
    const html = await readMaybe(path.join(dir, 'source.html'));
    if (!html) continue;
    out.push({
      id: ent.name,
      html,
      css: await readMaybe(path.join(dir, 'source.css')),
      i18n: await readMaybe(path.join(dir, 'source.i18n')),
      synthetic: false,
    });
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

async function warmPerfHook(page) {
  await page.waitForFunction(() => Boolean(window.__perfHook), null, { timeout: 30000 });
  await page.waitForFunction(
    async () => {
      try {
        const r = await window.__perfHook.importSheet({ html: '<div>ready</div>' });
        return r.blockCount > 0;
      } catch {
        return false;
      }
    },
    null,
    { timeout: 30000, polling: 1000 },
  );
}

function summarizeResourceIssue(kind, request, response = null) {
  const url = request.url();
  let host = '';
  try {
    host = new URL(url).host;
  } catch {
    host = '';
  }
  return {
    kind,
    status: response?.status?.() ?? null,
    resourceType: request.resourceType(),
    host,
    url: url.slice(0, 500),
  };
}

function summarizeResourceIssues(issues) {
  const map = new Map();
  for (const issue of issues || []) {
    const key = `${issue.kind}|${issue.status ?? ''}|${issue.resourceType}|${issue.host}`;
    const item = map.get(key) || {
      kind: issue.kind,
      status: issue.status,
      resourceType: issue.resourceType,
      host: issue.host,
      count: 0,
      examples: [],
      failures: [],
    };
    item.count += 1;
    if (item.examples.length < 3) item.examples.push(issue.url);
    if (issue.failure && item.failures.length < 3 && !item.failures.includes(issue.failure)) item.failures.push(issue.failure);
    map.set(key, item);
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count || String(a.host).localeCompare(String(b.host)));
}

async function importFixture(page, fixture) {
  return page.evaluate(async ({ html, css, i18n, compactWideRows }) => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    window.__perfHook.clearAll();
    await sleep(700);
    let last = null;
    for (let i = 0; i < 40; i += 1) {
      last = await window.__perfHook.importSheet({ html, css, i18n, compactWideRows });
      if (last.blockCount > 0) return last;
      await sleep(500);
    }
    return last;
  }, { ...fixture, compactWideRows: COMPACT_WIDE_ROWS });
}

async function waitForFrameMode(frame, expected) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (await frame.locator('body').getAttribute('data-r20-edit-mode') === expected) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`iframe edit mode did not reach ${expected}`);
}

async function waitForSheetRenderReady(frame) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (await frame.locator('body').getAttribute('data-r20-render-ready') === '1') return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('iframe sheet render did not become ready');
}

async function runCanonicalIframeEditSync(page) {
  await page.waitForTimeout(1300);
  const iframe = page.locator('[data-testid="preview-iframe"]');
  await page.evaluate(() => {
    window.__perfHook.setPreviewZoom(1);
    window.__perfHook.setPreviewRenderMode('iframe');
    window.__perfHook.setMainMode('preview');
  });
  await iframe.waitFor({ state: 'visible', timeout: 30000 });
  const frame = page.frameLocator('[data-testid="preview-iframe"]').first();
  await frame.locator('.charactersheet.charsheet').waitFor({ state: 'visible', timeout: 30000 });
  await waitForSheetRenderReady(frame);
  await page.waitForFunction(
    () => Number(document.querySelector('[data-r20-apply-acked]')?.getAttribute('data-r20-apply-acked') || 0) > 0,
    null,
    { timeout: 30000 },
  );
  await page.waitForFunction(
    () => document.querySelector('[data-r20-edit-bridge-ready]')?.getAttribute('data-r20-edit-bridge-ready') === '1',
    null,
    { timeout: 30000 },
  );

  const target = await frame.locator('[data-r20-block-id]').evaluateAll((elements) => {
    const doc = document;
    const structuralTags = new Set([
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'colgroup', 'col', 'option',
    ]);
    const actionableTags = new Set([
      'input', 'textarea', 'select', 'button', 'img', 'label', 'a', 'custom-card',
    ]);
    const visualContainerTags = new Set(['div', 'svg', 'custom-card']);
    const nodes = Array.from(doc.querySelectorAll('[data-r20-block-id]'))
      .map((node) => {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        const nested = node.querySelector('[data-r20-block-id]');
        const tag = node.tagName.toLowerCase();
        const stateControl = /\bsheet-toggle-page-[\w-]+\b/.test(node.getAttribute('class') || '');
        return {
          node,
          rect,
          tag,
          visible: style.display !== 'none' && style.visibility !== 'hidden'
            && rect.width >= 16 && rect.height >= 16,
          leaf: !nested,
          structural: structuralTags.has(tag),
          stateControl,
          priority: actionableTags.has(tag) ? 0 : visualContainerTags.has(tag) ? 1 : 2,
        };
      })
      .filter((item) => item.visible && item.leaf && !item.structural && !item.stateControl)
      .sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return (a.rect.width * a.rect.height) - (b.rect.width * b.rect.height);
      });
    const item = nodes[0];
    if (!item) {
      return {
        blockId: null,
        debug: {
          blockCount: nodes.length,
          allElements: doc.querySelectorAll('*').length,
          rootText: (doc.querySelector('.charactersheet.charsheet')?.textContent || '').trim().slice(0, 120),
          rootHtmlLength: doc.querySelector('.charactersheet.charsheet')?.innerHTML.length || 0,
        },
      };
    }
    return {
      blockId: item.node.getAttribute('data-r20-block-id'),
      tag: item.node.tagName.toLowerCase(),
      className: item.node.getAttribute('class') || '',
      rect: {
        left: item.rect.left,
        top: item.rect.top,
        width: item.rect.width,
        height: item.rect.height,
      },
      candidateSummary: nodes.slice(0, 12).map((candidate) => ({
        tag: candidate.tag,
        priority: candidate.priority,
        rect: {
          left: candidate.rect.left,
          top: candidate.rect.top,
          width: candidate.rect.width,
          height: candidate.rect.height,
        },
        className: candidate.node.getAttribute('class') || '',
      })),
    };
  });
  if (!target?.blockId) return { pass: false, skipped: true, reason: 'no visible leaf in canonical iframe', debug: target?.debug };
  const targetBlock = await page.evaluate((blockId) => {
    const snapshot = window.__perfHook.getLayerSnapshot('html').find((block) => block.id === blockId) || null;
    return {
      snapshot,
      fields: window.__perfHook.getBlockFields('html', blockId),
    };
  }, target.blockId);

  const editModeStartedAt = await page.evaluate(() => performance.now());
  await page.evaluate(() => window.__perfHook.setMainMode('edit'));
  await page.locator('[data-testid="edit-canvas-root"]').waitFor({ state: 'visible', timeout: 30000 });
  await waitForFrameMode(frame, '1');
  await page.locator('[data-testid="edit-placement-free"]').click();
  const editModeReadyMs = await page.evaluate(
    (startedAt) => performance.now() - startedAt,
    editModeStartedAt,
  );

  const dragStarted = await page.evaluate(() => {
    window.__r20PerfTimings = {};
    return {
      at: performance.now(),
      epoch: performance.timeOrigin + performance.now(),
      beforeAck: Number(
        document.querySelector('[data-r20-apply-acked]')?.getAttribute('data-r20-apply-acked') || 0,
      ),
    };
  });
  const beforeAck = dragStarted.beforeAck;
  const drag = await frame.locator('[data-r20-block-id]').evaluateAll(async (nodes, target) => {
    const node = nodes
      .find((candidate) => candidate.getAttribute('data-r20-block-id') === target.blockId);
    if (!node) return { dispatched: false };
    const startedAt = performance.now();
    const rect = node.getBoundingClientRect();
    const pointerId = 77;
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;
    const endX = startX + 24;
    const endY = startY + 16;
    node.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, cancelable: true, pointerId, button: 0, buttons: 1,
      clientX: startX, clientY: startY,
    }));
    node.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true, cancelable: true, pointerId, button: 0, buttons: 1,
      clientX: endX, clientY: endY,
    }));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const optimisticRect = node.getBoundingClientRect();
    const optimisticPaintMs = performance.now() - startedAt;
    const optimisticTransform = node.style.transform;
    node.dispatchEvent(new PointerEvent('pointerup', {
      bubbles: true, cancelable: true, pointerId, button: 0, buttons: 0,
      clientX: endX, clientY: endY,
    }));
    const pointerUpRect = node.getBoundingClientRect();
    return {
      dispatched: true,
      pointerId,
      startX,
      startY,
      endX,
      endY,
      optimisticPaintMs,
      optimisticTransform,
      optimisticRect: {
        left: optimisticRect.left,
        top: optimisticRect.top,
        width: optimisticRect.width,
        height: optimisticRect.height,
      },
      pointerUpRect: {
        left: pointerUpRect.left,
        top: pointerUpRect.top,
        width: pointerUpRect.width,
        height: pointerUpRect.height,
      },
    };
  }, target);
  if (!drag.dispatched) return { pass: false, target, drag };

  try {
    await page.waitForFunction(
      (revision) => Number(document.querySelector('[data-r20-apply-acked]')?.getAttribute('data-r20-apply-acked') || 0) > revision,
      beforeAck,
      { timeout: 30000 },
    );
  } catch (error) {
    return {
      pass: false,
      target,
      targetBlock,
      drag,
      beforeAck,
      afterAck: await page.evaluate(() => Number(
        document.querySelector('[data-r20-apply-acked]')?.getAttribute('data-r20-apply-acked') || 0,
      )),
      ackTimeout: true,
      error: String(error),
    };
  }
  const parentPerformance = await page.evaluate((startedAt) => {
    const timings = window.__r20PerfTimings ?? {};
    const relativeTimings = Object.fromEntries(Object.entries(timings).map(([name, value]) => [
      name,
      value - startedAt,
    ]));
    const duration = (start, end) => (
      typeof timings[start] === 'number' && typeof timings[end] === 'number'
        ? timings[end] - timings[start]
        : null
    );
    return {
      ackMs: performance.now() - startedAt,
      timings: relativeTimings,
      commitMs: duration('commit-start', 'commit-end'),
      countMs: duration('count-start', 'count-end'),
      emitToSendMs: duration('flush-callback', 'apply-sent'),
      applySchedulingWaitMs: duration('live-bundle-end', 'target-plan-start'),
      targetPlanMs: duration('target-plan-start', 'target-plan-end'),
      postMessageMs: duration('apply-post-start', 'apply-post-end'),
      pointerUpToAckMs: duration('pointerup-parent', 'apply-acked-parent'),
    };
  }, dragStarted.at);
  const iframeApply = await frame.locator('body').evaluate((body, startedEpoch) => ({
    applyMode: body.getAttribute('data-r20-last-apply-mode') ?? '',
    applyCostMs: Number(body.getAttribute('data-r20-last-apply-cost-ms') || 0),
    applyEpochMs: Number(body.getAttribute('data-r20-last-apply-epoch') || 0) - startedEpoch,
    rootReplacements: Number(body.getAttribute('data-r20-root-replacements') || 0),
    structuralPatches: Number(body.getAttribute('data-r20-structural-patches') || 0),
    styleOnlyApplies: Number(body.getAttribute('data-r20-style-only-applies') || 0),
    targetedHtmlPatches: Number(body.getAttribute('data-r20-targeted-html-patches') || 0),
    targetedHtmlPatchCheck: body.getAttribute('data-r20-targeted-html-patch-check') || '',
  }), dragStarted.epoch);
  const editAfter = await frame.locator('[data-r20-block-id]').evaluateAll((nodes, target) => {
    const node = nodes
      .find((candidate) => candidate.getAttribute('data-r20-block-id') === target.blockId);
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  }, target);
  const emitted = await page.evaluate(() => window.__perfHook.getEmitContent());

  await page.evaluate(() => window.__perfHook.setMainMode('preview'));
  await waitForFrameMode(frame, '0');
  const previewAfter = await frame.locator('[data-r20-block-id]').evaluateAll((nodes, target) => {
    const node = nodes
      .find((candidate) => candidate.getAttribute('data-r20-block-id') === target.blockId);
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  }, target);
  const synced = Boolean(editAfter && previewAfter)
    && Math.abs(editAfter.left - previewAfter.left) <= 2
    && Math.abs(editAfter.top - previewAfter.top) <= 2
    && Math.abs(editAfter.width - previewAfter.width) <= 2
    && Math.abs(editAfter.height - previewAfter.height) <= 2;
  return {
    pass: synced && typeof emitted?.html === 'string' && emitted.html.length > 0,
    target,
    targetBlock,
    drag,
    editAfter,
    previewAfter,
    previewSync: synced,
    emittedHtmlLength: emitted?.html?.length ?? 0,
    performance: {
      editModeReadyMs,
      optimisticPaintMs: drag.optimisticPaintMs ?? null,
      optimisticMovedPx: drag.optimisticRect
        ? Math.hypot(
            drag.optimisticRect.left - target.rect.left,
            drag.optimisticRect.top - target.rect.top,
          )
        : null,
      ...parentPerformance,
      ...iframeApply,
    },
  };
}

function cssString(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function safeFilePart(value) {
  return String(value).replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '') || 'fixture';
}

async function clearIframeHighlight(page) {
  await page.evaluate(() => {
    const iframe = document.querySelector('[data-testid="preview-iframe"]');
    iframe?.contentWindow?.postMessage({ type: 'r20:highlight', blockId: null }, '*');
  });
  await page.waitForTimeout(50);
}

async function withParentEditOverlaysHidden(page, capture) {
  await page.evaluate(() => {
    document.querySelectorAll('[data-testid="iframe-edit-overlay"], [data-testid="iframe-edit-drop-overlay"]')
      .forEach((element) => {
        element.setAttribute('data-r20-capture-visibility', element.style.visibility);
        element.style.visibility = 'hidden';
      });
  });
  try {
    return await capture();
  } finally {
    await page.evaluate(() => {
      document.querySelectorAll('[data-r20-capture-visibility]').forEach((element) => {
        element.style.visibility = element.getAttribute('data-r20-capture-visibility') || '';
        element.removeAttribute('data-r20-capture-visibility');
      });
    });
  }
}

async function screenshotEditBlock(page, blockId, screenshotPath) {
  await page.evaluate(() => {
    window.__perfHook.setPreviewZoom(1);
    window.__perfHook.setMainMode('edit');
  });
  const frame = await waitForPreviewSheetFrame(page);
  await clearIframeHighlight(page);
  const element = frame.locator(`[data-r20-block-id="${cssString(blockId)}"]`).first();
  await element.waitFor({ state: 'visible', timeout: 30000 });
  return withParentEditOverlaysHidden(page, async () => {
    const box = await element.boundingBox();
    await element.screenshot({ path: screenshotPath });
    return { path: screenshotPath, box };
  });
}

async function ensureSheetFitsViewport(page, sheet) {
  const before = page.viewportSize() || VIEWPORT;
  const box = await sheet.boundingBox();
  if (!box) return;
  const requiredHeight = Math.min(20000, Math.max(before.height, Math.ceil(box.y + box.height + 200)));
  if (requiredHeight <= before.height) return;
  await page.setViewportSize({ width: before.width, height: requiredHeight });
  await page.waitForTimeout(100);
}

async function screenshotEditSheetRoot(page, screenshotPath) {
  await page.evaluate(() => {
    window.__perfHook.setPreviewZoom(1);
    window.__perfHook.setMainMode('edit');
  });
  const frame = await waitForPreviewSheetFrame(page);
  await clearIframeHighlight(page);
  const element = frame.locator('.charactersheet.charsheet').first();
  await element.waitFor({ state: 'visible', timeout: 30000 });
  await ensureSheetFitsViewport(page, element);
  await waitForSheetRenderReady(frame);
  return withParentEditOverlaysHidden(page, async () => {
    const box = await element.boundingBox();
    await element.screenshot({ path: screenshotPath });
    return { path: screenshotPath, box };
  });
}

async function screenshotPreviewBlock(page, blockId, screenshotPath) {
  await page.evaluate(() => {
    window.__perfHook.setPreviewZoom(1);
    window.__perfHook.setPreviewRenderMode('iframe');
    window.__perfHook.setMainMode('preview');
  });
  const frame = page.frameLocator('[data-testid="preview-iframe"]').first();
  await frame.locator('.charactersheet.charsheet').waitFor({ state: 'visible', timeout: 30000 });
  await waitForSheetRenderReady(frame);
  await clearIframeHighlight(page);
  const locator = frame.locator(`[data-r20-block-id="${cssString(blockId)}"]`).first();
  await locator.waitFor({ state: 'visible', timeout: 30000 });
  const box = await locator.boundingBox();
  await locator.screenshot({ path: screenshotPath });
  return { path: screenshotPath, box };
}

async function screenshotPreviewSheetRoot(page, screenshotPath) {
  await page.evaluate(() => {
    window.__perfHook.setPreviewZoom(1);
    window.__perfHook.setPreviewRenderMode('iframe');
    window.__perfHook.setMainMode('preview');
  });
  const frame = page.frameLocator('[data-testid="preview-iframe"]').first();
  const root = frame.locator('.charactersheet.charsheet').first();
  await root.waitFor({ state: 'visible', timeout: 30000 });
  await ensureSheetFitsViewport(page, root);
  await waitForSheetRenderReady(frame);
  await clearIframeHighlight(page);
  const box = await root.boundingBox();
  await root.screenshot({ path: screenshotPath });
  return { path: screenshotPath, box };
}

async function diffPngs(page, previewPath, editPath) {
  const [previewBytes, editBytes] = await Promise.all([
    fs.readFile(previewPath),
    fs.readFile(editPath),
  ]);
  return page.evaluate(
    async ({ previewDataUrl, editDataUrl }) => {
      function loadImage(src) {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = src;
        });
      }
      const [a, b] = await Promise.all([loadImage(previewDataUrl), loadImage(editDataUrl)]);
      const width = Math.min(a.naturalWidth, b.naturalWidth);
      const height = Math.min(a.naturalHeight, b.naturalHeight);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(a, 0, 0);
      const aData = ctx.getImageData(0, 0, width, height).data;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(b, 0, 0);
      const bData = ctx.getImageData(0, 0, width, height).data;
      let mismatch = 0;
      let sumAbs = 0;
      const total = width * height;
      const bounds = { left: width, top: height, right: -1, bottom: -1 };
      const gridCols = 4;
      const gridRows = 4;
      const grid = Array.from({ length: gridCols * gridRows }, (_, index) => ({
        index,
        col: index % gridCols,
        row: Math.floor(index / gridCols),
        mismatchPixels: 0,
        sumAbs: 0,
        totalPixels: 0,
      }));
      for (let i = 0; i < aData.length; i += 4) {
        const pixel = i / 4;
        const x = pixel % width;
        const y = Math.floor(pixel / width);
        const col = Math.min(gridCols - 1, Math.floor((x / Math.max(1, width)) * gridCols));
        const row = Math.min(gridRows - 1, Math.floor((y / Math.max(1, height)) * gridRows));
        const cell = grid[row * gridCols + col];
        const delta =
          Math.abs(aData[i] - bData[i]) +
          Math.abs(aData[i + 1] - bData[i + 1]) +
          Math.abs(aData[i + 2] - bData[i + 2]) +
          Math.abs(aData[i + 3] - bData[i + 3]);
        sumAbs += delta;
        cell.totalPixels += 1;
        cell.sumAbs += delta;
        if (delta > 24) {
          mismatch += 1;
          cell.mismatchPixels += 1;
          bounds.left = Math.min(bounds.left, x);
          bounds.top = Math.min(bounds.top, y);
          bounds.right = Math.max(bounds.right, x);
          bounds.bottom = Math.max(bounds.bottom, y);
        }
      }
      const mismatchBounds =
        mismatch > 0
          ? {
              left: bounds.left,
              top: bounds.top,
              width: bounds.right - bounds.left + 1,
              height: bounds.bottom - bounds.top + 1,
            }
          : null;
      const hotCells = grid
        .map((cell) => ({
          row: cell.row,
          col: cell.col,
          mismatchPixels: cell.mismatchPixels,
          mismatchPct:
            cell.totalPixels > 0 ? Math.round((cell.mismatchPixels / cell.totalPixels) * 10000) / 100 : 0,
          meanAbsChannelDelta:
            cell.totalPixels > 0 ? Math.round((cell.sumAbs / (cell.totalPixels * 4)) * 100) / 100 : 0,
        }))
        .filter((cell) => cell.mismatchPixels > 0)
        .sort((aCell, bCell) => bCell.mismatchPixels - aCell.mismatchPixels)
        .slice(0, 6);
      return {
        previewSize: { width: a.naturalWidth, height: a.naturalHeight },
        editSize: { width: b.naturalWidth, height: b.naturalHeight },
        comparedSize: { width, height },
        mismatchPixels: mismatch,
        mismatchPct: total > 0 ? Math.round((mismatch / total) * 10000) / 100 : null,
        meanAbsChannelDelta: total > 0 ? Math.round((sumAbs / (total * 4)) * 100) / 100 : null,
        mismatchBounds,
        mismatchCoverage:
          mismatchBounds && width > 0 && height > 0
            ? {
                widthPct: Math.round((mismatchBounds.width / width) * 10000) / 100,
                heightPct: Math.round((mismatchBounds.height / height) * 10000) / 100,
                areaPct: Math.round(((mismatchBounds.width * mismatchBounds.height) / total) * 10000) / 100,
              }
            : null,
        hotCells,
      };
    },
    {
      previewDataUrl: `data:image/png;base64,${previewBytes.toString('base64')}`,
      editDataUrl: `data:image/png;base64,${editBytes.toString('base64')}`,
    },
  );
}

async function captureNonLeafVisualSync(page, fixtureId, blockId) {
  const base = `${safeFilePart(fixtureId)}-nonleaf`;
  const editPath = path.join(REPORT_DIR, 'screenshots', `${base}-edit-subtree.png`);
  const previewPath = path.join(REPORT_DIR, 'screenshots', `${base}-preview-subtree.png`);
  const edit = await screenshotEditBlock(page, blockId, editPath);
  const preview = await screenshotPreviewBlock(page, blockId, previewPath);
  if (!edit || !preview) {
    return { pass: false, reason: 'missing edit or preview subtree screenshot', edit, preview };
  }
  const diff = await diffPngs(page, preview.path, edit.path);
  return {
    pass: typeof diff.mismatchPct === 'number' && diff.mismatchPct <= NONLEAF_VISUAL_MISMATCH_LIMIT_PCT,
    limitPct: NONLEAF_VISUAL_MISMATCH_LIMIT_PCT,
    edit,
    preview,
    diff,
  };
}

async function captureSheetRootVisualSync(page, fixtureId) {
  const base = `${safeFilePart(fixtureId)}-sheet-root`;
  const editPath = path.join(REPORT_DIR, 'screenshots', `${base}-edit.png`);
  const previewPath = path.join(REPORT_DIR, 'screenshots', `${base}-preview.png`);
  const edit = await screenshotEditSheetRoot(page, editPath);
  const preview = await screenshotPreviewSheetRoot(page, previewPath);
  if (!edit || !preview) {
    return { pass: false, reason: 'missing edit or preview sheet-root screenshot', edit, preview };
  }
  const diff = await diffPngs(page, preview.path, edit.path);
  return {
    pass: typeof diff.mismatchPct === 'number' && diff.mismatchPct <= SHEET_VISUAL_MISMATCH_LIMIT_PCT,
    limitPct: SHEET_VISUAL_MISMATCH_LIMIT_PCT,
    edit,
    preview,
    diff,
  };
}

async function collectEditFormState(page) {
  await page.evaluate(() => {
    window.__perfHook.setPreviewZoom(1);
    window.__perfHook.setMainMode('edit');
  });
  await page.waitForSelector('[data-testid="edit-canvas-shadow-host"]', { timeout: 30000 });
  return page.evaluate(() => {
    const host = document.querySelector('[data-testid="edit-canvas-shadow-host"]');
    const root = host?.shadowRoot?.querySelector('.charactersheet.charsheet');
    if (!root) return [];
    return collectControlState(root);
    function collectControlState(scope) {
      return Array.from(scope.querySelectorAll('input, select, textarea'))
        .map((el, index) => controlState(el, index))
        .filter(Boolean);
    }
    function controlState(el, index) {
      const tag = el.tagName.toLowerCase();
      const type = tag === 'input' ? String(el.getAttribute('type') || el.type || 'text').toLowerCase() : tag;
      const name = el.getAttribute('name') || '';
      const value = 'value' in el ? String(el.value ?? '') : String(el.getAttribute('value') || '');
      const attrValue = String(el.getAttribute('value') || '');
      return {
        key: controlKey(tag, type, name, attrValue, index),
        tag,
        type,
        name,
        attrValue,
        value,
        checked: 'checked' in el ? Boolean(el.checked) : null,
        selectedIndex: 'selectedIndex' in el ? el.selectedIndex : null,
        blockId: el.getAttribute('data-r20-block-id') || '',
      };
    }
    function controlKey(tag, type, name, attrValue, index) {
      const valueDisambiguates = type === 'radio' || type === 'checkbox' || tag === 'option';
      return [tag, type, name, valueDisambiguates ? attrValue : '', String(index)].join('|');
    }
  });
}

async function collectPreviewFormState(page) {
  await page.evaluate(() => {
    window.__perfHook.setPreviewZoom(1);
    window.__perfHook.setPreviewRenderMode('iframe');
    window.__perfHook.setMainMode('preview');
  });
  const frame = page.frameLocator('[data-testid="preview-iframe"]').first();
  const root = frame.locator('.charactersheet.charsheet').first();
  await root.waitFor({ state: 'visible', timeout: 30000 });
  return root.evaluate((rootEl) => {
    return Array.from(rootEl.querySelectorAll('input, select, textarea'))
      .map((el, index) => {
        const tag = el.tagName.toLowerCase();
        const type = tag === 'input' ? String(el.getAttribute('type') || el.type || 'text').toLowerCase() : tag;
        const name = el.getAttribute('name') || '';
        const value = 'value' in el ? String(el.value ?? '') : String(el.getAttribute('value') || '');
        const attrValue = String(el.getAttribute('value') || '');
        const valueDisambiguates = type === 'radio' || type === 'checkbox' || tag === 'option';
        return {
          key: [tag, type, name, valueDisambiguates ? attrValue : '', String(index)].join('|'),
          tag,
          type,
          name,
          attrValue,
          value,
          checked: 'checked' in el ? Boolean(el.checked) : null,
          selectedIndex: 'selectedIndex' in el ? el.selectedIndex : null,
          blockId: el.getAttribute('data-r20-block-id') || '',
        };
      })
      .filter(Boolean);
  });
}

async function compareEditPreviewFormState(page) {
  const edit = await collectEditFormState(page);
  const preview = await collectPreviewFormState(page);
  const previewByKey = new Map(preview.map((item) => [item.key, item]));
  const editByKey = new Map(edit.map((item) => [item.key, item]));
  const diffs = [];
  for (const item of edit) {
    const other = previewByKey.get(item.key);
    if (!other) {
      diffs.push({ kind: 'missing-preview', edit: item, preview: null });
      continue;
    }
    if (item.checked !== other.checked || item.value !== other.value || item.selectedIndex !== other.selectedIndex) {
      diffs.push({ kind: 'state', edit: item, preview: other });
    }
  }
  for (const item of preview) {
    if (!editByKey.has(item.key)) diffs.push({ kind: 'missing-edit', edit: null, preview: item });
  }
  const byType = {};
  for (const diff of diffs) {
    const item = diff.edit || diff.preview || {};
    const key = `${item.tag || 'unknown'}:${item.type || 'unknown'}`;
    byType[key] = (byType[key] || 0) + 1;
  }
  return {
    pass: diffs.length === 0,
    editCount: edit.length,
    previewCount: preview.length,
    diffCount: diffs.length,
    byType,
    examples: diffs.slice(0, 12),
  };
}

async function compareEditPreviewRootGeometry(page) {
  const edit = await collectEditRootGeometry(page);
  const preview = await collectPreviewRootGeometry(page);
  const rootDelta =
    edit?.root && preview?.root
      ? {
          width: Math.round((edit.root.width - preview.root.width) * 100) / 100,
          height: Math.round((edit.root.height - preview.root.height) * 100) / 100,
          scrollWidth: edit.root.scrollWidth - preview.root.scrollWidth,
          clientWidth: edit.root.clientWidth - preview.root.clientWidth,
        }
      : null;
  return {
    pass:
      rootDelta != null &&
      Math.abs(rootDelta.width) <= 2 &&
      Math.abs(rootDelta.height) <= 2 &&
      Math.abs(rootDelta.scrollWidth) <= 2 &&
      Math.abs(rootDelta.clientWidth) <= 2,
    rootDelta,
    edit,
    preview,
  };
}

async function collectFinalRenderedResources(page) {
  const edit = await collectEditRenderedResources(page);
  const preview = await collectPreviewRenderedResources(page);
  return {
    pass: edit.pass && preview.pass,
    edit,
    preview,
  };
}

async function collectEditRenderedResources(page) {
  await page.evaluate(() => {
    window.__perfHook.setPreviewZoom(1);
    window.__perfHook.setMainMode('edit');
  });
  await page.waitForSelector('[data-testid="edit-canvas-shadow-host"]', { timeout: 30000 });
  await page.waitForTimeout(700);
  return page.evaluate(async () => {
    const host = document.querySelector('[data-testid="edit-canvas-shadow-host"]');
    const root = host?.shadowRoot?.querySelector('.charactersheet.charsheet');
    return root ? collectRenderedResourceState(root) : { pass: false, reason: 'missing edit root' };

    async function collectRenderedResourceState(scope) {
      const images = Array.from(scope.querySelectorAll('img[src]')).map((img, index) => ({
        index,
        src: img.currentSrc || img.src || '',
        complete: img.complete,
        naturalWidth: img.naturalWidth || 0,
        naturalHeight: img.naturalHeight || 0,
        visible: isVisible(img),
      }));
      const backgroundUrls = collectBackgroundUrls(scope).slice(0, 120);
      const backgrounds = [];
      for (const url of backgroundUrls) backgrounds.push(await probeImage(url));
      const failedImages = images.filter((img) => img.visible && img.src && (!img.complete || img.naturalWidth <= 0 || img.naturalHeight <= 0));
      const failedBackgrounds = backgrounds.filter((item) => !item.ok);
      return {
        pass: failedImages.length === 0 && failedBackgrounds.length === 0,
        imageCount: images.length,
        visibleImageCount: images.filter((img) => img.visible).length,
        failedImageCount: failedImages.length,
        backgroundUrlCount: backgroundUrls.length,
        failedBackgroundCount: failedBackgrounds.length,
        failedImages: failedImages.slice(0, 12),
        failedBackgrounds: failedBackgrounds.slice(0, 12),
      };
    }

    function collectBackgroundUrls(scope) {
      const seen = new Set();
      const urls = [];
      for (const el of Array.from(scope.querySelectorAll('*'))) {
        const value = getComputedStyle(el).backgroundImage || '';
        for (const url of extractCssUrls(value)) {
          if (seen.has(url)) continue;
          seen.add(url);
          urls.push(url);
        }
      }
      return urls;
    }

    function extractCssUrls(value) {
      const urls = [];
      const re = /url\((?:"([^"]*)"|'([^']*)'|([^'")]+))\)/gi;
      let match;
      while ((match = re.exec(value))) {
        const url = String(match[1] ?? match[2] ?? match[3] ?? '').trim();
        if (url && !url.startsWith('data:')) urls.push(url);
      }
      return urls;
    }

    function isVisible(el) {
      const rect = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return cs.display !== 'none' && cs.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    }

    function probeImage(url) {
      return new Promise((resolve) => {
        const img = new Image();
        const started = performance.now();
        let done = false;
        const finish = (event) => {
          if (done) return;
          done = true;
          clearTimeout(timer);
          resolve({
            url,
            ok: img.complete && img.naturalWidth > 0 && img.naturalHeight > 0,
            event,
            naturalWidth: img.naturalWidth || 0,
            naturalHeight: img.naturalHeight || 0,
            elapsedMs: Math.round(performance.now() - started),
          });
        };
        const timer = setTimeout(() => finish('timeout'), 5000);
        img.onload = () => finish('load');
        img.onerror = () => finish('error');
        img.referrerPolicy = 'no-referrer';
        img.src = url;
      });
    }
  });
}

async function collectPreviewRenderedResources(page) {
  await page.evaluate(() => {
    window.__perfHook.setPreviewZoom(1);
    window.__perfHook.setPreviewRenderMode('iframe');
    window.__perfHook.setMainMode('preview');
  });
  const frame = page.frameLocator('[data-testid="preview-iframe"]').first();
  const root = frame.locator('.charactersheet.charsheet').first();
  await root.waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForTimeout(700);
  return root.evaluate(async (rootEl) => {
    return collectRenderedResourceState(rootEl);

    async function collectRenderedResourceState(scope) {
      const images = Array.from(scope.querySelectorAll('img[src]')).map((img, index) => ({
        index,
        src: img.currentSrc || img.src || '',
        complete: img.complete,
        naturalWidth: img.naturalWidth || 0,
        naturalHeight: img.naturalHeight || 0,
        visible: isVisible(img),
      }));
      const backgroundUrls = collectBackgroundUrls(scope).slice(0, 120);
      const backgrounds = [];
      for (const url of backgroundUrls) backgrounds.push(await probeImage(url));
      const failedImages = images.filter((img) => img.visible && img.src && (!img.complete || img.naturalWidth <= 0 || img.naturalHeight <= 0));
      const failedBackgrounds = backgrounds.filter((item) => !item.ok);
      return {
        pass: failedImages.length === 0 && failedBackgrounds.length === 0,
        imageCount: images.length,
        visibleImageCount: images.filter((img) => img.visible).length,
        failedImageCount: failedImages.length,
        backgroundUrlCount: backgroundUrls.length,
        failedBackgroundCount: failedBackgrounds.length,
        failedImages: failedImages.slice(0, 12),
        failedBackgrounds: failedBackgrounds.slice(0, 12),
      };
    }

    function collectBackgroundUrls(scope) {
      const seen = new Set();
      const urls = [];
      for (const el of Array.from(scope.querySelectorAll('*'))) {
        const value = getComputedStyle(el).backgroundImage || '';
        for (const url of extractCssUrls(value)) {
          if (seen.has(url)) continue;
          seen.add(url);
          urls.push(url);
        }
      }
      return urls;
    }

    function extractCssUrls(value) {
      const urls = [];
      const re = /url\((?:"([^"]*)"|'([^']*)'|([^'")]+))\)/gi;
      let match;
      while ((match = re.exec(value))) {
        const url = String(match[1] ?? match[2] ?? match[3] ?? '').trim();
        if (url && !url.startsWith('data:')) urls.push(url);
      }
      return urls;
    }

    function isVisible(el) {
      const rect = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return cs.display !== 'none' && cs.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    }

    function probeImage(url) {
      return new Promise((resolve) => {
        const img = new Image();
        const started = performance.now();
        let done = false;
        const finish = (event) => {
          if (done) return;
          done = true;
          clearTimeout(timer);
          resolve({
            url,
            ok: img.complete && img.naturalWidth > 0 && img.naturalHeight > 0,
            event,
            naturalWidth: img.naturalWidth || 0,
            naturalHeight: img.naturalHeight || 0,
            elapsedMs: Math.round(performance.now() - started),
          });
        };
        const timer = setTimeout(() => finish('timeout'), 5000);
        img.onload = () => finish('load');
        img.onerror = () => finish('error');
        img.referrerPolicy = 'no-referrer';
        img.src = url;
      });
    }
  });
}

function hasOnlyTransientAbortedImageIssues(items) {
  if (!Array.isArray(items) || items.length === 0) return false;
  return items.every((item) => {
    const failures = Array.isArray(item.failures) ? item.failures : [];
    return (
      item.kind === 'failed' &&
      item.resourceType === 'image' &&
      failures.length > 0 &&
      failures.every((failure) => failure === 'net::ERR_ABORTED')
    );
  });
}

function classifyResourceStatus(resourceIssues, finalRenderedResources) {
  const issueCount = sumResourceIssues(resourceIssues);
  if (issueCount === 0) return { pass: true, classification: 'clean' };
  if (finalRenderedResources?.pass && hasOnlyTransientAbortedImageIssues(resourceIssues)) {
    return { pass: true, classification: 'transient-aborted-images-final-rendered' };
  }
  return { pass: false, classification: finalRenderedResources?.pass ? 'request-issues-final-rendered' : 'final-rendered-resource-failure' };
}

async function collectEditRootGeometry(page) {
  await page.evaluate(() => {
    window.__perfHook.setPreviewZoom(1);
    window.__perfHook.setMainMode('edit');
  });
  await page.waitForSelector('[data-testid="edit-canvas-shadow-host"]', { timeout: 30000 });
  return page.evaluate(() => {
    const host = document.querySelector('[data-testid="edit-canvas-shadow-host"]');
    const root = host?.shadowRoot?.querySelector('.charactersheet.charsheet');
    return root ? collectRootGeometry(root) : null;
    function collectRootGeometry(rootEl) {
      const rootRect = rootEl.getBoundingClientRect();
      return {
        root: rectInfo(rootEl, rootRect),
        children: Array.from(rootEl.children).slice(0, 24).map((el) => rectInfo(el, rootRect)),
      };
    }
    function rectInfo(el, rootRect) {
      const rect = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        tag: el.tagName.toLowerCase(),
        blockId: el.getAttribute('data-r20-block-id') || '',
        className: String(el.getAttribute('class') || '').slice(0, 180),
        relativeLeft: Math.round((rect.left - rootRect.left) * 100) / 100,
        relativeTop: Math.round((rect.top - rootRect.top) * 100) / 100,
        width: Math.round(rect.width * 100) / 100,
        height: Math.round(rect.height * 100) / 100,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        display: cs.display,
        position: cs.position,
        overflowX: cs.overflowX,
        overflowY: cs.overflowY,
      };
    }
  });
}

async function collectPreviewRootGeometry(page) {
  await page.evaluate(() => {
    window.__perfHook.setPreviewZoom(1);
    window.__perfHook.setPreviewRenderMode('iframe');
    window.__perfHook.setMainMode('preview');
  });
  const frame = page.frameLocator('[data-testid="preview-iframe"]').first();
  const root = frame.locator('.charactersheet.charsheet').first();
  await root.waitFor({ state: 'visible', timeout: 30000 });
  return root.evaluate((rootEl) => {
    const rootRect = rootEl.getBoundingClientRect();
    return {
      root: rectInfo(rootEl, rootRect),
      children: Array.from(rootEl.children).slice(0, 24).map((el) => rectInfo(el, rootRect)),
    };
    function rectInfo(el, rootRect) {
      const rect = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        tag: el.tagName.toLowerCase(),
        blockId: el.getAttribute('data-r20-block-id') || '',
        className: String(el.getAttribute('class') || '').slice(0, 180),
        relativeLeft: Math.round((rect.left - rootRect.left) * 100) / 100,
        relativeTop: Math.round((rect.top - rootRect.top) * 100) / 100,
        width: Math.round(rect.width * 100) / 100,
        height: Math.round(rect.height * 100) / 100,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        display: cs.display,
        position: cs.position,
        overflowX: cs.overflowX,
        overflowY: cs.overflowY,
      };
    }
  });
}

function classifySheetVisualSync(sheetVisualSync, formStateDiff, rootGeometry) {
  if (!sheetVisualSync) return 'missing-sheet-visual';
  if (sheetVisualSync.pass) {
    return formStateDiff?.pass === false ? 'visual-pass-with-form-state-diff' : 'visual-pass';
  }
  if (formStateDiff?.diffCount > 0) return 'likely-form-control-state-divergence';
  if (rootGeometry?.rootDelta && Math.abs(rootGeometry.rootDelta.width) > 2) {
    return 'likely-root-width-geometry-delta';
  }
  const coverage = sheetVisualSync.diff?.mismatchCoverage;
  const hotCells = sheetVisualSync.diff?.hotCells || [];
  if (coverage?.widthPct >= 75 && coverage?.heightPct >= 75) return 'broad-sheet-root-visual-delta';
  if (hotCells.length > 0) return 'localized-sheet-root-visual-delta';
  return 'unclassified-sheet-root-visual-delta';
}

async function chooseEditTarget(page, excludedIds = []) {
  await page.evaluate(() => {
    window.__perfHook.setPreviewZoom(1);
    window.__perfHook.setMainMode('edit');
  });
  await waitForPreviewSheetFrame(page);
  return page.evaluate((excluded) => {
    const excludedSet = new Set(excluded);
    const iframe = document.querySelector('[data-testid="preview-iframe"]');
    const root = iframe?.contentDocument?.querySelector('.charactersheet.charsheet');
    if (!iframe || !root) return null;
    const rootRect = root.getBoundingClientRect();
    const candidates = Array.from(root.querySelectorAll('[data-r20-block-id]'))
      .map((el) => {
        const rect = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        const role = el.getAttribute('data-r20-layer-role') || '';
        const blockId = el.getAttribute('data-r20-block-id') || '';
        const className = String(el.getAttribute('class') || '');
        const visible =
          cs.display !== 'none' &&
          cs.visibility !== 'hidden' &&
          rect.width >= 8 &&
          rect.height >= 8 &&
          rect.width <= Math.max(32, rootRect.width * 0.75) &&
          rect.height <= Math.max(24, rootRect.height * 0.75);
        const roleScore =
          role === 'control' ? 120 :
          role === 'action' ? 110 :
          role === 'media' ? 100 :
          role === 'text' ? 90 :
          role === 'other' ? 65 :
          role === 'frame' ? 45 :
          role === 'flow' ? 35 :
          role === 'table' ? 25 :
          10;
        const area = rect.width * rect.height;
        const nestedBlocks = el.querySelectorAll('[data-r20-block-id]').length;
        const structuralPenalty = /\bsheet-col\b|\bsheet-row\b|\bsheet-section-initiative\b/.test(className)
          ? 70
          : 0;
        const classlessInlinePenalty = role === 'frame' && el.tagName.toLowerCase() === 'span' && !className.trim()
          ? 45
          : 0;
        const nestedPenalty = Math.min(80, nestedBlocks * 8);
        return {
          blockId,
          tag: el.tagName.toLowerCase(),
          role,
          visible,
          score: visible && !excludedSet.has(blockId)
            ? roleScore - Math.min(25, area / 20000) - structuralPenalty - classlessInlinePenalty - nestedPenalty
            : -1000,
          rect: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          },
          relative: {
            left: Math.round(rect.left - rootRect.left),
            top: Math.round(rect.top - rootRect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          },
          center: {
            x: Math.round(rect.left + rect.width / 2),
            y: Math.round(rect.top + rect.height / 2),
          },
          text: (el.textContent || '').trim().slice(0, 80),
          nestedBlocks,
        };
      })
      .filter((item) => item.visible && item.blockId)
      .sort((a, b) => b.score - a.score);
    return candidates[0] || null;
  }, excludedIds);
}

async function waitForPreviewSheetFrame(page) {
  const iframeHandle = await page.locator('[data-testid="preview-iframe"]').elementHandle();
  if (!iframeHandle) throw new Error('persistent preview iframe handle is missing');
  const frame = await iframeHandle.contentFrame();
  if (!frame) throw new Error('persistent preview iframe content frame is missing');
  await frame.locator('.charactersheet.charsheet').waitFor({ state: 'visible', timeout: 30000 });
  await frame
    .locator('.charactersheet.charsheet [data-r20-block-id]')
    .first()
    .waitFor({ state: 'attached', timeout: 30000 });
  return frame;
}

async function readPreviewBlockMetadata(frame) {
  return frame.evaluate(() => {
    const root = document.querySelector('.charactersheet.charsheet');
    return Array.from(root?.querySelectorAll('[data-r20-block-id]') || []).map((el) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return {
        blockId: el.getAttribute('data-r20-block-id') || '',
        tag: el.tagName.toLowerCase(),
        role: el.getAttribute('data-r20-layer-role') || '',
        nestedCount: el.querySelectorAll('[data-r20-block-id]').length,
        text: String(el.textContent || '').trim().slice(0, 60),
        visible: Boolean(
          rect.width >= 4 &&
          rect.height >= 4 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden',
        ),
      };
    });
  });
}

async function runImportedLayerReorder(page) {
  await page.evaluate(() => {
    window.__perfHook.setPreviewZoom(1);
    window.__perfHook.setMainMode('edit');
  });
  const frame = await waitForPreviewSheetFrame(page);
  const renderedBlocks = await readPreviewBlockMetadata(frame);
  const result = await page.evaluate(async (renderedBlocks) => {
    const renderedById = new Map(renderedBlocks.map((item) => [item.blockId, item]));

    function collectLayerDiagnostics() {
      const graph = window.__perfHook.getBlockGraph?.('html') || [];
      const layer = window.__perfHook.getLayerSnapshot?.('html') || [];
      const graphById = new Map(graph.map((node) => [node.id, node]));
      const visibleIds = new Set(renderedBlocks.filter((item) => item.visible).map((item) => item.blockId));
      const siblingGroups = new Map();
      for (const node of layer) {
        const key = `${node.layerParentId ?? 'root'}:${node.depth}`;
        siblingGroups.set(key, (siblingGroups.get(key) || 0) + 1);
      }
      return {
        graphCount: graph.length,
        layerCount: layer.length,
        renderedBlockCount: renderedBlocks.length,
        visibleBlockCount: visibleIds.size,
        layerRelationCounts: layer.reduce((counts, node) => {
          counts[node.layerRelation] = (counts[node.layerRelation] || 0) + 1;
          return counts;
        }, {}),
        siblingGroupCount: siblingGroups.size,
        siblingGroupSizes: [...siblingGroups.values()].sort((a, b) => b - a).slice(0, 8),
        graphLeafCount: graph.filter((node) => node.childCount <= 0 && !node.hasNextTarget).length,
        graphNonLeafCount: graph.filter((node) => node.childCount > 0).length,
        layerSiblingNodeCount: layer.filter((node) => node.layerRelation === 'sibling').length,
        visibleLayerSiblingNodeCount: layer.filter((node) => node.layerRelation === 'sibling' && visibleIds.has(node.id)).length,
        layerSiblingDetails: layer
          .filter((node) => node.layerRelation === 'sibling')
          .map((node) => ({
            type: graphById.get(node.id)?.type || '',
            rendered: renderedById.has(node.id),
            visible: visibleIds.has(node.id),
            hasLayerRow: Boolean(document.querySelector(`[data-testid="edit-layer-row"][data-r20-block-id="${CSS.escape(node.id)}"]`)),
          })),
      };
    }

    function emittedIndex(id) {
      return window.__perfHook.getEmitContent().html.indexOf(`data-r20-block-id="${id}"`);
    }

    function findPair() {
      const graph = window.__perfHook.getBlockGraph?.('html') || [];
      const layer = window.__perfHook.getLayerSnapshot?.('html') || [];
      const byId = new Map(graph.map((node) => [node.id, node]));
      const layerById = new Map(layer.map((node) => [node.id, node]));
      const describe = (node) => {
        const rendered = renderedById.get(node.id) || null;
        const layerNode = layerById.get(node.id) || null;
        return {
          blockId: node.id,
          type: node.type,
          layerParentId: layerNode?.layerParentId ?? null,
          layerPreviousId: layerNode?.layerPreviousId ?? null,
          layerRelation: layerNode?.layerRelation ?? null,
          tag: rendered?.tag || node.type,
          role: rendered?.role || '',
          nestedCount: rendered?.nestedCount ?? node.childCount,
          text: rendered?.text || '',
          visible: rendered?.visible === true,
        };
      };

      for (const movingLayer of layer) {
        if (movingLayer.layerRelation !== 'sibling' || !movingLayer.layerPreviousId) continue;
        const movingNode = byId.get(movingLayer.id);
        if (!movingNode || movingNode.childCount > 0) continue;
        if (/script|worker|rolltemplate/i.test(movingNode.type)) continue;
        const targetNode = byId.get(movingLayer.layerPreviousId);
        if (!targetNode) continue;
        if (/script|worker|rolltemplate/i.test(targetNode.type)) continue;
        const targetRow = document.querySelector(`[data-testid="edit-layer-row"][data-r20-block-id="${CSS.escape(targetNode.id)}"]`);
        const movingRow = document.querySelector(`[data-testid="edit-layer-row"][data-r20-block-id="${CSS.escape(movingNode.id)}"]`);
        if (!targetRow || !movingRow) continue;
        const target = describe(targetNode);
        const moving = describe(movingNode);
        if (!target.visible || !moving.visible) continue;
        if (moving.layerRelation !== 'sibling' || moving.layerPreviousId !== target.blockId) continue;
        return {
          parentBlockId: moving.layerParentId || movingNode.parentId || 'workspace-root',
          target,
          moving,
          siblingCount: layer.filter((node) => node.layerParentId === moving.layerParentId && node.depth === movingNode.depth).length,
          beforeOrder: layer
            .filter((node) => node.layerParentId === moving.layerParentId && node.depth === movingNode.depth)
            .map((node) => node.id),
        };
      }
      return null;
    }

    const pair = findPair();
    if (!pair) {
      return {
        pass: false,
        skipped: true,
        reason: 'no imported leaf sibling pair found',
        diagnostics: collectLayerDiagnostics(),
      };
    }
    const targetRow = document.querySelector(
      `[data-testid="edit-layer-row"][data-r20-block-id="${CSS.escape(pair.target.blockId)}"]`,
    );
    if (!targetRow) return { pass: false, skipped: false, pair, reason: 'target layer row missing' };

    const before = {
      movingIndex: emittedIndex(pair.moving.blockId),
      targetIndex: emittedIndex(pair.target.blockId),
      targetLayer: {
        relation: targetRow.getAttribute('data-r20-layer-relation') || '',
        parentId: targetRow.getAttribute('data-r20-layer-parent-id') || null,
        previousId: targetRow.getAttribute('data-r20-layer-previous-id') || null,
        text: targetRow.textContent || '',
      },
    };
    const rect = targetRow.getBoundingClientRect();
    const dt = new DataTransfer();
    dt.setData('application/x-r20-layer-block', pair.moving.blockId);
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
    await new Promise((resolve) => setTimeout(resolve, 500));
    const after = {
      movingIndex: emittedIndex(pair.moving.blockId),
      targetIndex: emittedIndex(pair.target.blockId),
    };
    const pass =
      pair.moving.layerRelation === 'sibling' &&
      pair.moving.layerPreviousId === pair.target.blockId &&
      before.movingIndex > before.targetIndex &&
      after.movingIndex >= 0 &&
      after.targetIndex >= 0 &&
      after.movingIndex < after.targetIndex;
    return { pass, skipped: false, pair, mode, before, after };
  }, renderedBlocks);
  return result;
}

async function runImportedNonLeafLayerReorder(page, fixtureId) {
  await page.evaluate(() => {
    window.__perfHook.setPreviewZoom(1);
    window.__perfHook.setMainMode('edit');
  });
  const frame = await waitForPreviewSheetFrame(page);
  const renderedBlocks = await readPreviewBlockMetadata(frame);
  const result = await page.evaluate(async (renderedBlocks) => {
    const renderedById = new Map(renderedBlocks.map((item) => [item.blockId, item]));

    function collectLayerDiagnostics() {
      const graph = window.__perfHook.getBlockGraph?.('html') || [];
      const layer = window.__perfHook.getLayerSnapshot?.('html') || [];
      const visibleIds = new Set(renderedBlocks.filter((item) => item.visible).map((item) => item.blockId));
      const siblingGroups = new Map();
      for (const node of layer) {
        const key = `${node.layerParentId ?? 'root'}:${node.depth}`;
        siblingGroups.set(key, (siblingGroups.get(key) || 0) + 1);
      }
      return {
        graphCount: graph.length,
        layerCount: layer.length,
        renderedBlockCount: renderedBlocks.length,
        visibleBlockCount: visibleIds.size,
        layerRelationCounts: layer.reduce((counts, node) => {
          counts[node.layerRelation] = (counts[node.layerRelation] || 0) + 1;
          return counts;
        }, {}),
        siblingGroupCount: siblingGroups.size,
        siblingGroupSizes: [...siblingGroups.values()].sort((a, b) => b - a).slice(0, 8),
        graphLeafCount: graph.filter((node) => node.childCount <= 0 && !node.hasNextTarget).length,
        graphNonLeafCount: graph.filter((node) => node.childCount > 0).length,
        layerSiblingNodeCount: layer.filter((node) => node.layerRelation === 'sibling').length,
        visibleLayerSiblingNodeCount: layer.filter((node) => node.layerRelation === 'sibling' && visibleIds.has(node.id)).length,
      };
    }

    function emittedIndex(id) {
      return window.__perfHook.getEmitContent().html.indexOf(`data-r20-block-id="${id}"`);
    }

    function isRuntime(node) {
      return /script|worker|rolltemplate/i.test(node?.type || '');
    }

    function directChildIds(graph, parentId, nextSiblingId = null) {
      return graph
        .filter((node) => node.parentId === parentId)
        .filter((node) => !nextSiblingId || node.id !== nextSiblingId)
        .map((node) => node.id);
    }

    function describe(node, childIds, layerById) {
      const rendered = renderedById.get(node.id) || null;
      const layerNode = layerById.get(node.id) || null;
      return {
        blockId: node.id,
        type: node.type,
        layerParentId: layerNode?.layerParentId ?? null,
        layerPreviousId: layerNode?.layerPreviousId ?? null,
        layerRelation: layerNode?.layerRelation ?? null,
        tag: rendered?.tag || node.type,
        role: rendered?.role || '',
        childIds,
        childCount: childIds.length,
        nestedCount: rendered?.nestedCount ?? node.childCount,
        text: rendered?.text || '',
        visible: rendered?.visible === true,
      };
    }

    function findCandidate() {
      const graph = window.__perfHook.getBlockGraph?.('html') || [];
      const layer = window.__perfHook.getLayerSnapshot?.('html') || [];
      const byId = new Map(graph.map((node) => [node.id, node]));
      const layerById = new Map(layer.map((node) => [node.id, node]));
      const siblingsOf = (node) => {
        const layerNode = layerById.get(node.id);
        return layer
          .filter((candidate) => candidate.layerParentId === layerNode?.layerParentId && candidate.depth === layerNode?.depth)
          .map((candidate) => byId.get(candidate.id))
          .filter(Boolean);
      };

      for (const movingNode of graph) {
        if (movingNode.childCount <= 0 || isRuntime(movingNode)) continue;
        const siblings = siblingsOf(movingNode);
        if (siblings.length <= 1) continue;
        const childIds = directChildIds(graph, movingNode.id, movingNode.nextId);
        if (childIds.length === 0) continue;
        const row = document.querySelector(`[data-testid="edit-layer-row"][data-r20-block-id="${CSS.escape(movingNode.id)}"]`);
        if (!row) continue;

        const nextTarget = byId.get(movingNode.nextId || '');
        const previousTarget = byId.get(movingNode.previousId || '');
        const targetOptions = [
          { direction: 'after', targetNode: nextTarget },
          { direction: 'before', targetNode: previousTarget },
        ].filter(
          (item) => {
            if (!item.targetNode || isRuntime(item.targetNode)) return false;
            const movingLayer = layerById.get(movingNode.id);
            const targetLayer = layerById.get(item.targetNode.id);
            return (
              movingLayer &&
              targetLayer &&
              targetLayer.layerParentId === movingLayer.layerParentId &&
              targetLayer.depth === movingLayer.depth
            );
          },
        );

        for (const option of targetOptions) {
          const targetRow = document.querySelector(
            `[data-testid="edit-layer-row"][data-r20-block-id="${CSS.escape(option.targetNode.id)}"]`,
          );
          if (!targetRow) continue;
          const moving = describe(movingNode, childIds, layerById);
          const target = describe(option.targetNode, directChildIds(graph, option.targetNode.id, option.targetNode.nextId), layerById);
          if (!moving.visible || !target.visible) continue;
          const relationMatches =
            option.direction === 'after'
              ? target.layerRelation === 'sibling' && target.layerPreviousId === moving.blockId
              : moving.layerRelation === 'sibling' && moving.layerPreviousId === target.blockId;
          if (!relationMatches || moving.layerParentId !== target.layerParentId) continue;
          return {
            direction: option.direction,
            parentBlockId: moving.layerParentId || movingNode.parentId || 'workspace-root',
            moving,
            target,
            siblingCount: siblings.length,
            beforeOrder: siblings.map((node) => node.id),
          };
        }
      }
      return null;
    }

    const candidate = findCandidate();
    if (!candidate) {
      return {
        pass: false,
        skipped: true,
        reason: 'no imported visible non-leaf sibling subtree found',
        diagnostics: collectLayerDiagnostics(),
      };
    }

    const targetRow = document.querySelector(
      `[data-testid="edit-layer-row"][data-r20-block-id="${CSS.escape(candidate.target.blockId)}"]`,
    );
    if (!targetRow) return { pass: false, skipped: false, candidate, reason: 'target layer row missing' };

    const beforeGraph = window.__perfHook.getBlockGraph?.('html') || [];
    const before = {
      movingIndex: emittedIndex(candidate.moving.blockId),
      targetIndex: emittedIndex(candidate.target.blockId),
      targetLayer: {
        relation: targetRow.getAttribute('data-r20-layer-relation') || '',
        parentId: targetRow.getAttribute('data-r20-layer-parent-id') || null,
        previousId: targetRow.getAttribute('data-r20-layer-previous-id') || null,
        text: targetRow.textContent || '',
      },
      childParentIds: Object.fromEntries(
        candidate.moving.childIds.map((id) => [id, beforeGraph.find((node) => node.id === id)?.parentId ?? null]),
      ),
    };
    const rect = targetRow.getBoundingClientRect();
    const dt = new DataTransfer();
    dt.setData('application/x-r20-layer-block', candidate.moving.blockId);
    const init = {
      bubbles: true,
      cancelable: true,
      clientX: Math.round(rect.left + rect.width / 2),
      clientY: Math.round(rect.top + rect.height * (candidate.direction === 'after' ? 0.9 : 0.1)),
    };
    const over = new DragEvent('dragover', init);
    Object.defineProperty(over, 'dataTransfer', { value: dt });
    targetRow.dispatchEvent(over);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const mode = targetRow.getAttribute('data-r20-layer-drop-mode') || '';
    const drop = new DragEvent('drop', init);
    Object.defineProperty(drop, 'dataTransfer', { value: dt });
    targetRow.dispatchEvent(drop);
    await new Promise((resolve) => setTimeout(resolve, 500));

    const afterGraph = window.__perfHook.getBlockGraph?.('html') || [];
    const movingAfter = afterGraph.find((node) => node.id === candidate.moving.blockId);
    const targetAfter = afterGraph.find((node) => node.id === candidate.target.blockId);
    const after = {
      movingIndex: emittedIndex(candidate.moving.blockId),
      targetIndex: emittedIndex(candidate.target.blockId),
      childParentIds: Object.fromEntries(
        candidate.moving.childIds.map((id) => [id, afterGraph.find((node) => node.id === id)?.parentId ?? null]),
      ),
      movingAfter,
      targetAfter,
    };
    const childParentsPreserved = candidate.moving.childIds.every((id) => after.childParentIds[id] === candidate.moving.blockId);
    const layerRelationMatches =
      candidate.direction === 'after'
        ? candidate.target.layerRelation === 'sibling' && candidate.target.layerPreviousId === candidate.moving.blockId
        : candidate.moving.layerRelation === 'sibling' && candidate.moving.layerPreviousId === candidate.target.blockId;
    const layerSameParent = candidate.moving.layerParentId === candidate.target.layerParentId;
    const layerSameDepth = candidate.moving.layerParentId !== null && movingAfter?.depth === targetAfter?.depth;
    const movedAcrossTarget =
      candidate.direction === 'after'
        ? before.movingIndex < before.targetIndex && after.movingIndex > after.targetIndex
        : before.movingIndex > before.targetIndex && after.movingIndex < after.targetIndex;
    const pass =
      drop.defaultPrevented &&
      layerRelationMatches &&
      layerSameParent &&
      layerSameDepth &&
      after.movingIndex >= 0 &&
      after.targetIndex >= 0 &&
      childParentsPreserved &&
      movedAcrossTarget;
    return {
      pass,
      skipped: false,
      candidate,
      mode,
      before,
      after,
      childParentsPreserved,
      layerRelationMatches,
      layerSameParent,
      layerSameDepth,
      movedAcrossTarget,
      dropPrevented: drop.defaultPrevented,
    };
  }, renderedBlocks);
  if (!result?.pass || result?.skipped || !result?.candidate?.moving?.blockId) return result;
  const editAfter = await getEditBlockState(page, result.candidate.moving.blockId);
  const previewAfter = await getPreviewBlockState(page, result.candidate.moving.blockId);
  const previewSync =
    Boolean(editAfter?.relative && previewAfter?.relative) &&
    closeEnough(previewAfter.relative.left, editAfter.relative.left, 2) &&
    closeEnough(previewAfter.relative.top, editAfter.relative.top, 2) &&
    closeEnough(previewAfter.relative.width, editAfter.relative.width, 2) &&
    closeEnough(previewAfter.relative.height, editAfter.relative.height, 2);
  const visualSync = await captureNonLeafVisualSync(page, fixtureId, result.candidate.moving.blockId);
  return {
    ...result,
    editAfter,
    previewAfter,
    previewSync,
    visualSync,
    pass: result.pass && previewSync && (!REQUIRE_NONLEAF_VISUAL_SYNC || visualSync.pass),
  };
}

const IMPORTED_LAYER_INSIDE_MOVE_SPECS = {
  'synthetic-layer-siblings': {
    structure: 'frame',
    movingSelector: 'input[name="attr_layer_first"]',
    witnessSelector: 'input[name="attr_layer_third"]',
    containerSelector: '.sheet-layer-frame',
    expectedMovingType: 'r20_text_input',
    expectedTargetType: 'r20_div',
  },
  'synthetic-list-inside': {
    structure: 'list',
    movingSelector: '.sheet-list-moving',
    witnessSelector: '.sheet-list-witness',
    containerSelector: '.sheet-structural-list',
    expectedMovingType: 'r20_list_item',
    expectedTargetType: 'r20_list',
  },
  'synthetic-table-inside': {
    structure: 'table',
    movingSelector: '.sheet-table-moving',
    witnessSelector: '.sheet-table-witness',
    containerSelector: 'tbody',
    expectedMovingType: 'r20_tr',
    expectedTargetType: 'r20_tbody',
  },
  'synthetic-conditional-inside': {
    structure: 'conditional',
    movingSelector: '.sheet-condition-moving',
    witnessSelector: '.sheet-condition-witness',
    containerSelector: '.sheet-condition-panel',
    expectedMovingType: 'r20_static_text',
    expectedTargetType: 'r20_value_case',
  },
};

async function runImportedLayerInsideMove(page, fixtureId) {
  const spec = IMPORTED_LAYER_INSIDE_MOVE_SPECS[fixtureId];
  if (!spec) {
    return { pass: false, skipped: true, reason: 'no deterministic cross-container synthetic pair' };
  }
  await page.evaluate(() => {
    window.__perfHook.setPreviewZoom(1);
    window.__perfHook.setMainMode('edit');
  });
  const frame = await waitForPreviewSheetFrame(page);
  const ids = await frame.evaluate((query) => {
    const moving = document.querySelector(query.movingSelector);
    const witness = document.querySelector(query.witnessSelector);
    const source = moving?.closest(query.containerSelector);
    const target = witness?.closest(query.containerSelector);
    return {
      movingId: moving?.getAttribute('data-r20-block-id') || '',
      sourceId: source?.getAttribute('data-r20-block-id') || '',
      targetId: target?.getAttribute('data-r20-block-id') || '',
      witnessId: witness?.getAttribute('data-r20-block-id') || '',
      movingTag: moving?.tagName.toLowerCase() || '',
      sourceTag: source?.tagName.toLowerCase() || '',
      targetTag: target?.tagName.toLowerCase() || '',
    };
  }, spec);
  if (!ids.movingId || !ids.sourceId || !ids.targetId || !ids.witnessId || ids.sourceId === ids.targetId) {
    return { pass: false, skipped: false, reason: 'synthetic cross-container nodes missing', ids };
  }

  const model = await page.evaluate(async ({ ids, spec }) => {
    const layerBefore = window.__perfHook.getLayerSnapshot('html') || [];
    const movingBefore = layerBefore.find((node) => node.id === ids.movingId) || null;
    const movingRow = document.querySelector(
      `[data-testid="edit-layer-row"][data-r20-block-id="${CSS.escape(ids.movingId)}"]`,
    );
    const targetRow = document.querySelector(
      `[data-testid="edit-layer-row"][data-r20-block-id="${CSS.escape(ids.targetId)}"]`,
    );
    if (!(movingRow instanceof HTMLElement) || !(targetRow instanceof HTMLElement)) {
      return { pass: false, reason: 'source or target layer row missing', movingBefore };
    }
    targetRow.scrollIntoView({ block: 'center' });
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const rect = targetRow.getBoundingClientRect();
    const dataTransfer = new DataTransfer();
    dataTransfer.setData('application/x-r20-layer-block', ids.movingId);
    const dragstart = new DragEvent('dragstart', { bubbles: true, cancelable: true });
    Object.defineProperty(dragstart, 'dataTransfer', { value: dataTransfer });
    movingRow.dispatchEvent(dragstart);
    const init = {
      bubbles: true,
      cancelable: true,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
    };
    const dragover = new DragEvent('dragover', init);
    Object.defineProperty(dragover, 'dataTransfer', { value: dataTransfer });
    targetRow.dispatchEvent(dragover);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const mode = targetRow.getAttribute('data-r20-layer-drop-mode') || '';
    const drop = new DragEvent('drop', init);
    Object.defineProperty(drop, 'dataTransfer', { value: dataTransfer });
    targetRow.dispatchEvent(drop);
    await new Promise((resolve) => setTimeout(resolve, 700));
    const layerAfter = window.__perfHook.getLayerSnapshot('html') || [];
    const movingAfter = layerAfter.find((node) => node.id === ids.movingId) || null;
    const targetAfter = layerAfter.find((node) => node.id === ids.targetId) || null;
    const emitted = window.__perfHook.getEmitContent();
    return {
      pass: movingBefore?.layerParentId === ids.sourceId
        && movingBefore?.type === spec.expectedMovingType
        && mode === 'inside'
        && drop.defaultPrevented
        && movingAfter?.layerParentId === ids.targetId
        && targetAfter?.type === spec.expectedTargetType,
      mode,
      dropPrevented: drop.defaultPrevented,
      movingBefore,
      movingAfter,
      targetAfter,
      emittedHtmlLength: emitted.html.length,
      staleDraggingBlockAfterDrop: document.body.dataset.r20LayerDraggingBlock ?? null,
    };
  }, { ids, spec });
  if (!model.pass) return { pass: false, skipped: false, structure: spec.structure, query: spec, ids, model };

  const readRendered = () => frame.evaluate((query) => {
    const moving = document.querySelector(query.movingSelector);
    const witness = document.querySelector(query.witnessSelector);
    const movingFrame = moving?.closest(query.containerSelector);
    const witnessFrame = witness?.closest(query.containerSelector);
    return {
      sameContainer: Boolean(movingFrame && movingFrame === witnessFrame),
      movingParentId: movingFrame?.getAttribute('data-r20-block-id') || null,
      witnessParentId: witnessFrame?.getAttribute('data-r20-block-id') || null,
      movingPosition: moving ? getComputedStyle(moving).position : null,
    };
  }, spec);
  const edit = await readRendered();
  await page.evaluate(() => window.__perfHook.setMainMode('preview'));
  await waitForFrameMode(frame, '0');
  const preview = await readRendered();
  return {
    pass: model.pass
      && model.staleDraggingBlockAfterDrop === null
      && edit.sameContainer
      && preview.sameContainer
      && edit.movingParentId === ids.targetId
      && preview.movingParentId === ids.targetId
      && edit.movingPosition !== 'absolute'
      && preview.movingPosition !== 'absolute',
    skipped: false,
    structure: spec.structure,
    query: spec,
    ids,
    model,
    edit,
    preview,
    previewSync: edit.sameContainer === preview.sameContainer
      && edit.movingParentId === preview.movingParentId,
  };
}

async function verifyImportedLayerInsideMoveAfterReimport(page, move) {
  if (!move || move.skipped) return { pass: false, skipped: true, reason: move?.reason || 'inside move skipped' };
  if (!move.query?.movingSelector || !move.query?.witnessSelector || !move.query?.containerSelector) {
    return { pass: false, skipped: false, reason: 'inside move query missing' };
  }
  await page.evaluate(() => window.__perfHook.setMainMode('preview'));
  const frame = await waitForPreviewSheetFrame(page);
  try {
    await frame.waitForFunction((query) => {
      const moving = document.querySelector(query.movingSelector);
      const witness = document.querySelector(query.witnessSelector);
      return Boolean(
        moving
        && witness
        && moving.closest(query.containerSelector) === witness.closest(query.containerSelector),
      );
    }, move.query, { timeout: 15000 });
  } catch {}
  const rendered = await frame.evaluate((query) => {
    const moving = document.querySelector(query.movingSelector);
    const witness = document.querySelector(query.witnessSelector);
    const movingFrame = moving?.closest(query.containerSelector);
    const witnessFrame = witness?.closest(query.containerSelector);
    return {
      movingFound: Boolean(moving),
      witnessFound: Boolean(witness),
      sameContainer: Boolean(movingFrame && movingFrame === witnessFrame),
      movingPosition: moving ? getComputedStyle(moving).position : null,
    };
  }, move.query);
  return {
    pass: move.pass === true && rendered.sameContainer && rendered.movingPosition !== 'absolute',
    skipped: false,
    structure: move.structure,
    rendered,
  };
}

const CANONICAL_DROP_CONTAINER_TYPES = new Set([
  'r20_div',
  'r20_element_container',
  'r20_attr_with_txt_helper',
  'r20_form',
  'r20_section',
  'r20_fieldset',
  'r20_table',
  'r20_thead',
  'r20_tbody',
  'r20_tfoot',
  'r20_tr',
  'r20_td',
  'r20_th',
  'r20_list',
  'r20_list_item',
  'r20_toggle_wrap',
  'r20_toggle_on_area',
  'r20_toggle_off_area',
  'r20_value_switch_panel',
  'r20_value_case',
]);

async function getCanonicalDropContainerIds(page) {
  return page.evaluate((allowedTypes) => {
    const allowed = new Set(allowedTypes);
    return (window.__perfHook.getLayerSnapshot('html') || [])
      .filter((block) => allowed.has(String(block.type).toLowerCase()))
      .map((block) => block.id)
      .filter(Boolean);
  }, [...CANONICAL_DROP_CONTAINER_TYPES]);
}

async function runCanonicalImportedCanvasInsert(page) {
  await page.evaluate(() => {
    window.__perfHook.setPreviewZoom(1);
    window.__perfHook.setMainMode('edit');
  });
  const frame = await waitForPreviewSheetFrame(page);
  await page.click('[data-testid="edit-placement-flow"]');
  const candidateIds = await getCanonicalDropContainerIds(page);
  const result = await frame.evaluate(async (candidateIds) => {
    const root = document.querySelector('.charactersheet.charsheet');
    if (!root) return { pass: false, reason: 'missing persistent iframe sheet root' };
    const beforeIds = new Set(
      Array.from(root.querySelectorAll('[data-r20-block-id]'))
        .map((el) => el.getAttribute('data-r20-block-id'))
        .filter(Boolean),
    );
    const candidates = candidateIds.map((blockId) => root.querySelector(`[data-r20-block-id="${CSS.escape(blockId)}"]`))
      .filter(Boolean)
      .map((el) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return {
          el,
          blockId: el.getAttribute('data-r20-block-id') || '',
          role: el.getAttribute('data-r20-layer-role') || 'container',
          rect,
          visible: style.display !== 'none' && style.visibility !== 'hidden'
            && rect.width >= 40 && rect.height >= 24,
          nestedCount: el.querySelectorAll('[data-r20-block-id]').length,
        };
      })
      .filter((item) => item.visible)
      .sort((a, b) => a.nestedCount - b.nestedCount || a.rect.width * a.rect.height - b.rect.width * b.rect.height);
    if (candidates.length === 0) {
      return { pass: false, skipped: true, reason: 'no visible imported frame/flow flow-placement target' };
    }

    const target = candidates[0];
    const dataTransfer = new DataTransfer();
    dataTransfer.setData('application/x-r20-friendly-widget', JSON.stringify({ id: 'text-input' }));
    const rect = target.rect;
    const init = {
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX: Math.round(rect.left + rect.width / 2),
      clientY: Math.round(rect.top + Math.min(rect.height - 2, Math.max(2, rect.height / 2))),
    };
    const dragover = new DragEvent('dragover', init);
    Object.defineProperty(dragover, 'dataTransfer', { value: dataTransfer });
    target.el.dispatchEvent(dragover);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const drop = new DragEvent('drop', init);
    Object.defineProperty(drop, 'dataTransfer', { value: dataTransfer });
    target.el.dispatchEvent(drop);
    await new Promise((resolve) => setTimeout(resolve, 700));

    const newInput = Array.from(root.querySelectorAll('input[data-r20-block-id]'))
      .find((el) => !beforeIds.has(el.getAttribute('data-r20-block-id') || ''));
    const newId = newInput?.getAttribute('data-r20-block-id') || null;
    const block = newInput?.closest('[data-r20-block-id]') || newInput;
    const parent = newInput?.parentElement?.closest('[data-r20-block-id]');
    const blockStyle = block ? getComputedStyle(block) : null;
    return {
      pass: dragover.defaultPrevented && drop.defaultPrevented && Boolean(newId)
        && parent?.getAttribute('data-r20-block-id') === target.blockId
        && blockStyle?.position !== 'absolute',
      skipped: false,
      target: { blockId: target.blockId, role: target.role, width: Math.round(rect.width), height: Math.round(rect.height) },
      dragoverPrevented: dragover.defaultPrevented,
      dropPrevented: drop.defaultPrevented,
      newId,
      parentId: parent?.getAttribute('data-r20-block-id') || null,
      position: blockStyle?.position || null,
    };
  }, candidateIds);
  if (result?.skipped || !result?.newId) return result;
  const emitted = await page.evaluate(({ newId, parentId }) => {
    const html = window.__perfHook.getEmitContent().html || '';
    const newIndex = html.indexOf(`data-r20-block-id="${newId}"`);
    const parentIndex = html.indexOf(`data-r20-block-id="${parentId}"`);
    const start = html.lastIndexOf('<', newIndex);
    const end = html.indexOf('>', newIndex);
    const tag = newIndex >= 0 && start >= 0 && end >= start ? html.slice(start, end + 1) : '';
    const inlineStyle = tag.match(/\sstyle=(['"])([\s\S]*?)\1/i)?.[2] || '';
    return {
      nested: parentIndex >= 0 && newIndex > parentIndex,
      hasAbsolute: /position\s*:\s*absolute/i.test(inlineStyle),
      tag,
    };
  }, { newId: result.newId, parentId: result.parentId });
  return { ...result, emitted, pass: result.pass && emitted.nested && !emitted.hasAbsolute };
}

async function runCanonicalImportedFreeCanvasInsert(page) {
  await page.evaluate(() => {
    window.__perfHook.setPreviewZoom(1);
    window.__perfHook.setMainMode('edit');
  });
  const frame = await waitForPreviewSheetFrame(page);
  await page.click('[data-testid="edit-placement-free"]');
  const candidateIds = await getCanonicalDropContainerIds(page);
  const result = await frame.evaluate(async (candidateIds) => {
    const root = document.querySelector('.charactersheet.charsheet');
    if (!root) return { pass: false, reason: 'missing persistent iframe sheet root' };
    const beforeIds = new Set(
      Array.from(root.querySelectorAll('[data-r20-block-id]'))
        .map((el) => el.getAttribute('data-r20-block-id'))
        .filter(Boolean),
    );
    const candidates = candidateIds.map((blockId) => root.querySelector(`[data-r20-block-id="${CSS.escape(blockId)}"]`))
      .filter(Boolean)
      .map((el) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return {
          el,
          blockId: el.getAttribute('data-r20-block-id') || '',
          role: el.getAttribute('data-r20-layer-role') || 'container',
          rect,
          visible: style.display !== 'none' && style.visibility !== 'hidden'
            && rect.width >= 56 && rect.height >= 32,
          nestedCount: el.querySelectorAll('[data-r20-block-id]').length,
        };
      })
      .filter((item) => item.visible)
      .sort((a, b) => a.nestedCount - b.nestedCount || a.rect.width * a.rect.height - b.rect.width * b.rect.height);
    if (candidates.length === 0) {
      return { pass: false, skipped: true, reason: 'no visible imported frame/flow free-placement target' };
    }

    const target = candidates[0];
    const dataTransfer = new DataTransfer();
    dataTransfer.setData('application/x-r20-friendly-widget', JSON.stringify({ id: 'text-input' }));
    const rect = target.rect;
    const init = {
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX: Math.round(rect.left + rect.width * 0.72),
      clientY: Math.round(rect.top + rect.height * 0.72),
    };
    const dragover = new DragEvent('dragover', init);
    Object.defineProperty(dragover, 'dataTransfer', { value: dataTransfer });
    target.el.dispatchEvent(dragover);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const drop = new DragEvent('drop', init);
    Object.defineProperty(drop, 'dataTransfer', { value: dataTransfer });
    target.el.dispatchEvent(drop);
    await new Promise((resolve) => setTimeout(resolve, 700));

    const newInput = Array.from(root.querySelectorAll('input[data-r20-block-id]'))
      .find((el) => !beforeIds.has(el.getAttribute('data-r20-block-id') || ''));
    const newId = newInput?.getAttribute('data-r20-block-id') || null;
    const block = newInput?.closest('[data-r20-block-id]') || newInput;
    const parent = newInput?.parentElement?.closest('[data-r20-block-id]');
    const blockStyle = block ? getComputedStyle(block) : null;
    const parentStyle = parent ? getComputedStyle(parent) : null;
    return {
      pass: dragover.defaultPrevented && drop.defaultPrevented && Boolean(newId)
        && parent?.getAttribute('data-r20-block-id') === target.blockId
        && blockStyle?.position === 'absolute'
        && ['relative', 'absolute', 'fixed', 'sticky'].includes(parentStyle?.position || '')
        && Number.isFinite(Number.parseFloat(blockStyle.left))
        && Number.isFinite(Number.parseFloat(blockStyle.top)),
      skipped: false,
      target: { blockId: target.blockId, role: target.role, width: Math.round(rect.width), height: Math.round(rect.height) },
      dragoverPrevented: dragover.defaultPrevented,
      dropPrevented: drop.defaultPrevented,
      newId,
      parentId: parent?.getAttribute('data-r20-block-id') || null,
      position: blockStyle?.position || null,
      parentPosition: parentStyle?.position || null,
      left: blockStyle ? Number.parseFloat(blockStyle.left) : null,
      top: blockStyle ? Number.parseFloat(blockStyle.top) : null,
    };
  }, candidateIds);
  if (result?.skipped || !result?.newId) return result;
  const emitted = await page.evaluate(({ newId, parentId }) => {
    const emit = window.__perfHook.getEmitContent();
    const html = emit.html || '';
    const css = emit.css || '';
    const newIndex = html.indexOf(`data-r20-block-id="${newId}"`);
    const parentIndex = html.indexOf(`data-r20-block-id="${parentId}"`);
    const start = html.lastIndexOf('<', newIndex);
    const end = html.indexOf('>', newIndex);
    const tag = newIndex >= 0 && start >= 0 && end >= start ? html.slice(start, end + 1) : '';
    const classAttr = tag.match(/\sclass=(['"])([\s\S]*?)\1/i)?.[2] || '';
    const hasAbsolute = classAttr.split(/\s+/).filter(Boolean).some((className) => {
      const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`\\.${escaped}[^{}]*\\{[^}]*position\\s*:\\s*absolute`, 'i').test(css);
    }) || /position\s*:\s*absolute/i.test(tag);
    return { nested: parentIndex >= 0 && newIndex > parentIndex, hasAbsolute, tag };
  }, { newId: result.newId, parentId: result.parentId });
  return {
    ...result,
    emitted,
    emittedLeft: result.left,
    emittedTop: result.top,
    pass: result.pass && emitted.nested && emitted.hasAbsolute,
  };
}

async function runImportedCanvasInsert(page) {
  await page.evaluate(() => {
    window.__perfHook.setPreviewZoom(1);
    window.__perfHook.setMainMode('edit');
  });
  await page.waitForSelector('[data-testid="edit-canvas-shadow-host"]', { timeout: 30000 });
  await page.waitForFunction(
    () => Boolean(document.querySelector('[data-testid="edit-canvas-shadow-host"]')?.shadowRoot?.querySelector('.charactersheet.charsheet')),
    null,
    { timeout: 30000 },
  );
  await page.click('[data-testid="edit-placement-flow"]');
  return page.evaluate(async () => {
    const host = document.querySelector('[data-testid="edit-canvas-shadow-host"]');
    const root = host?.shadowRoot?.querySelector('.charactersheet.charsheet');
    if (!host || !root) return { pass: false, reason: 'missing edit shadow root' };

    const beforeIds = new Set(
      Array.from(root.querySelectorAll('[data-r20-block-id]'))
        .map((el) => el.getAttribute('data-r20-block-id'))
        .filter(Boolean),
    );
    const candidates = Array.from(root.querySelectorAll('[data-r20-can-drop="1"][data-r20-block-id]'))
      .map((el) => {
        const rect = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return {
          el,
          blockId: el.getAttribute('data-r20-block-id') || '',
          role: el.getAttribute('data-r20-layer-role') || '',
          rect,
          visible:
            cs.display !== 'none' &&
            cs.visibility !== 'hidden' &&
            rect.width >= 40 &&
            rect.height >= 24,
          nestedCount: el.querySelectorAll('[data-r20-block-id]').length,
        };
      })
      .filter((item) => item.visible && /^(frame|flow)$/.test(item.role))
      .sort((a, b) => a.nestedCount - b.nestedCount || a.rect.width * a.rect.height - b.rect.width * b.rect.height);
    if (candidates.length === 0) return { pass: false, reason: 'no visible imported frame/flow drop target' };

    const attempts = [];
    for (const target of candidates.slice(0, 24)) {
      const dt = new DataTransfer();
      dt.setData('application/x-r20-friendly-widget', JSON.stringify({ id: 'text-input' }));
      const clientX = Math.round(target.rect.left + target.rect.width / 2);
      const clientY = Math.round(target.rect.top + Math.min(target.rect.height - 2, Math.max(2, target.rect.height / 2)));
      const shadowTarget = host.shadowRoot?.elementFromPoint(clientX, clientY);
      const eventTarget = shadowTarget || target.el;
      const init = { bubbles: true, cancelable: true, composed: true, clientX, clientY };
      const over = new DragEvent('dragover', init);
      Object.defineProperty(over, 'dataTransfer', { value: dt });
      eventTarget.dispatchEvent(over);
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const indicator = {
        hostDropMode: host.getAttribute('data-r20-drop-mode'),
        activeTargetId: host.getAttribute('data-r20-drop-target'),
      };
      if (indicator.hostDropMode !== 'inside') {
        attempts.push({
          pass: false,
          target: {
            blockId: target.blockId,
            role: target.role,
            width: Math.round(target.rect.width),
            height: Math.round(target.rect.height),
          },
          indicator,
          overPrevented: over.defaultPrevented,
          dropPrevented: false,
          newId: null,
          style: '',
          emittedTag: '',
          skippedDrop: true,
        });
        continue;
      }
      const drop = new DragEvent('drop', init);
      Object.defineProperty(drop, 'dataTransfer', { value: dt });
      eventTarget.dispatchEvent(drop);
      await new Promise((resolve) => setTimeout(resolve, 700));

      const freshRoot = host.shadowRoot?.querySelector('.charactersheet.charsheet');
      const newInput = Array.from(freshRoot?.querySelectorAll('input[data-r20-block-id]') ?? [])
        .find((el) => !beforeIds.has(el.getAttribute('data-r20-block-id') || ''));
      const newId = newInput?.getAttribute('data-r20-block-id') || null;
      const style = newInput?.getAttribute('style') || '';
      const emit = window.__perfHook.getEmitContent();
      const emittedTag = newId ? findBlockOpeningTag(emit.html, newId) : '';
      const emittedStyle = emittedTag.match(/\sstyle=(["'])([\s\S]*?)\1/i)?.[2] || '';
      const pass =
        over.defaultPrevented &&
        drop.defaultPrevented &&
        indicator.hostDropMode === 'inside' &&
        Boolean(newId) &&
        !/position\s*:\s*absolute/i.test(`${style};${emittedStyle}`);
      const attempt = {
        pass,
        target: {
          blockId: target.blockId,
          role: target.role,
          width: Math.round(target.rect.width),
          height: Math.round(target.rect.height),
        },
        indicator,
        overPrevented: over.defaultPrevented,
        dropPrevented: drop.defaultPrevented,
        newId,
        style,
        emittedTag,
      };
      attempts.push(attempt);
      if (pass) return { ...attempt, attempts };
    }
    return { pass: false, reason: 'no imported canvas insertion attempt created flow content', attempts };

    function findBlockOpeningTag(html, blockId) {
      let marker = `data-r20-block-id="${blockId}"`;
      let markerIndex = html.indexOf(marker);
      if (markerIndex < 0) {
        marker = `data-r20-block-id='${blockId}'`;
        markerIndex = html.indexOf(marker);
      }
      if (markerIndex < 0) return '';
      const start = html.lastIndexOf('<', markerIndex);
      const end = html.indexOf('>', markerIndex);
      if (start < 0 || end < 0 || start > markerIndex) return '';
      return html.slice(start, end + 1);
    }
  });
}

async function runImportedFreeCanvasInsert(page) {
  await page.evaluate(() => {
    window.__perfHook.setPreviewZoom(1);
    window.__perfHook.setMainMode('edit');
  });
  await page.waitForSelector('[data-testid="edit-canvas-shadow-host"]', { timeout: 30000 });
  await page.waitForFunction(
    () => Boolean(document.querySelector('[data-testid="edit-canvas-shadow-host"]')?.shadowRoot?.querySelector('.charactersheet.charsheet')),
    null,
    { timeout: 30000 },
  );
  await page.click('[data-testid="edit-placement-free"]');
  return page.evaluate(async () => {
    const host = document.querySelector('[data-testid="edit-canvas-shadow-host"]');
    const root = host?.shadowRoot?.querySelector('.charactersheet.charsheet');
    if (!host || !root) return { pass: false, reason: 'missing edit shadow root' };

    const beforeIds = new Set(
      Array.from(root.querySelectorAll('[data-r20-block-id]'))
        .map((el) => el.getAttribute('data-r20-block-id'))
        .filter(Boolean),
    );
    const candidates = Array.from(root.querySelectorAll('[data-r20-can-drop="1"][data-r20-block-id]'))
      .map((el) => {
        const rect = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return {
          el,
          blockId: el.getAttribute('data-r20-block-id') || '',
          role: el.getAttribute('data-r20-layer-role') || '',
          rect,
          visible:
            cs.display !== 'none' &&
            cs.visibility !== 'hidden' &&
            rect.width >= 56 &&
            rect.height >= 32,
          nestedCount: el.querySelectorAll('[data-r20-block-id]').length,
        };
      })
      .filter((item) => item.visible && /^(frame|flow)$/.test(item.role))
      .sort((a, b) => a.nestedCount - b.nestedCount || a.rect.width * a.rect.height - b.rect.width * b.rect.height);
    if (candidates.length === 0) return { pass: false, reason: 'no visible imported frame/flow free-placement target' };

    const attempts = [];
    for (const target of candidates.slice(0, 30)) {
      const points = [
        { x: 0.5, y: 0.5 },
        { x: 0.28, y: 0.32 },
        { x: 0.72, y: 0.36 },
        { x: 0.35, y: 0.72 },
      ];
      for (const point of points) {
        const dt = new DataTransfer();
        dt.setData('application/x-r20-friendly-widget', JSON.stringify({ id: 'text-input' }));
        const clientX = Math.round(target.rect.left + target.rect.width * point.x);
        const clientY = Math.round(target.rect.top + target.rect.height * point.y);
        const shadowTarget = host.shadowRoot?.elementFromPoint(clientX, clientY);
        const eventTarget = shadowTarget || target.el;
        const init = { bubbles: true, cancelable: true, composed: true, clientX, clientY };
        const over = new DragEvent('dragover', init);
        Object.defineProperty(over, 'dataTransfer', { value: dt });
        eventTarget.dispatchEvent(over);
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const indicator = {
          hostDropMode: host.getAttribute('data-r20-drop-mode'),
          activeTargetId: host.getAttribute('data-r20-drop-target'),
        };
        if (indicator.hostDropMode !== 'inside' || !indicator.activeTargetId) {
          attempts.push({
            pass: false,
            target: summarizeTarget(target),
            point,
            indicator,
            overPrevented: over.defaultPrevented,
            dropPrevented: false,
            newId: null,
            skippedDrop: true,
          });
          continue;
        }

        const activeTarget = host.shadowRoot?.querySelector(`[data-r20-block-id="${CSS.escape(indicator.activeTargetId)}"]`);
        const activeRect = activeTarget?.getBoundingClientRect();
        const drop = new DragEvent('drop', init);
        Object.defineProperty(drop, 'dataTransfer', { value: dt });
        eventTarget.dispatchEvent(drop);
        await new Promise((resolve) => setTimeout(resolve, 800));

        const freshRoot = host.shadowRoot?.querySelector('.charactersheet.charsheet');
        const newInput = Array.from(freshRoot?.querySelectorAll('input[data-r20-block-id]') ?? [])
          .find((el) => !beforeIds.has(el.getAttribute('data-r20-block-id') || ''));
        const newId = newInput?.getAttribute('data-r20-block-id') || null;
        const parent = newInput?.parentElement?.closest('[data-r20-block-id]');
        const parentId = parent?.getAttribute('data-r20-block-id') || null;
        const inputStyle = newInput ? getComputedStyle(newInput) : null;
        const parentStyle = parent ? getComputedStyle(parent) : null;
        const emit = window.__perfHook.getEmitContent();
        const emittedTag = newId ? findBlockOpeningTag(emit.html, newId) : '';
        const emittedStyle = emittedTag.match(/\sstyle=(["'])([\s\S]*?)\1/i)?.[2] || '';
        const parentIndex = parentId ? emit.html.indexOf(`data-r20-block-id="${parentId}"`) : -1;
        const inputIndex = newId ? emit.html.indexOf(`data-r20-block-id="${newId}"`) : -1;
        const emittedLeft = readPx(emittedStyle, 'left');
        const emittedTop = readPx(emittedStyle, 'top');
        const computedLeft = inputStyle ? Math.round(Number.parseFloat(inputStyle.left)) : null;
        const computedTop = inputStyle ? Math.round(Number.parseFloat(inputStyle.top)) : null;
        const pass =
          over.defaultPrevented &&
          drop.defaultPrevented &&
          Boolean(newId) &&
          parentId === indicator.activeTargetId &&
          inputStyle?.position === 'absolute' &&
          ['relative', 'absolute', 'fixed', 'sticky'].includes(parentStyle?.position || '') &&
          /position\s*:\s*absolute/i.test(emittedStyle) &&
          emittedLeft === computedLeft &&
          emittedTop === computedTop &&
          parentIndex >= 0 &&
          inputIndex > parentIndex;
        const attempt = {
          pass,
          target: summarizeTarget(target),
          point,
          indicator,
          activeTarget: activeTarget && activeRect
            ? {
                blockId: indicator.activeTargetId,
                role: activeTarget.getAttribute('data-r20-layer-role') || '',
                width: Math.round(activeRect.width),
                height: Math.round(activeRect.height),
              }
            : null,
          overPrevented: over.defaultPrevented,
          dropPrevented: drop.defaultPrevented,
          newId,
          parentId,
          parentComputedPosition: parentStyle?.position ?? null,
          inputComputedPosition: inputStyle?.position ?? null,
          inputComputedLeft: computedLeft,
          inputComputedTop: computedTop,
          emittedLeft,
          emittedTop,
          emittedTag,
        };
        attempts.push(attempt);
        if (pass) return { ...attempt, attempts };
        if (newId) return { ...attempt, attempts };
      }
    }
    return { pass: false, reason: 'no imported free-placement attempt created nested absolute content', attempts };

    function summarizeTarget(target) {
      return {
        blockId: target.blockId,
        role: target.role,
        width: Math.round(target.rect.width),
        height: Math.round(target.rect.height),
      };
    }

    function findBlockOpeningTag(html, blockId) {
      let marker = `data-r20-block-id="${blockId}"`;
      let markerIndex = html.indexOf(marker);
      if (markerIndex < 0) {
        marker = `data-r20-block-id='${blockId}'`;
        markerIndex = html.indexOf(marker);
      }
      if (markerIndex < 0) return '';
      const start = html.lastIndexOf('<', markerIndex);
      const end = html.indexOf('>', markerIndex);
      if (start < 0 || end < 0 || start > markerIndex) return '';
      return html.slice(start, end + 1);
    }

    function readPx(text, prop) {
      const match = text.match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*(-?\\d+(?:\\.\\d+)?)px`, 'i'));
      return match ? Math.round(Number.parseFloat(match[1])) : null;
    }
  });
}

async function getEditBlockState(page, blockId) {
  await page.evaluate(() => {
    window.__perfHook.setPreviewZoom(1);
    window.__perfHook.setMainMode('edit');
  });
  const frame = await waitForPreviewSheetFrame(page);
  return frame.locator('.charactersheet.charsheet').evaluate((root, id) => {
    function styleSummary(el) {
      const cs = getComputedStyle(el);
      return {
        display: cs.display,
        position: cs.position,
        boxSizing: cs.boxSizing,
        fontFamily: cs.fontFamily,
        fontSize: cs.fontSize,
        lineHeight: cs.lineHeight,
        whiteSpace: cs.whiteSpace,
        textAlign: cs.textAlign,
        width: cs.width,
        height: cs.height,
        marginTop: cs.marginTop,
        marginBottom: cs.marginBottom,
        paddingTop: cs.paddingTop,
        paddingBottom: cs.paddingBottom,
        borderTopWidth: cs.borderTopWidth,
        borderBottomWidth: cs.borderBottomWidth,
        backgroundColor: cs.backgroundColor,
        backgroundImage: cs.backgroundImage,
        color: cs.color,
        borderTopColor: cs.borderTopColor,
        borderBottomColor: cs.borderBottomColor,
      };
    }
    function childLayoutSummary(root, el) {
      const rootRect = root.getBoundingClientRect();
      return Array.from(el.children)
        .slice(0, 12)
        .map((child) => {
          const rect = child.getBoundingClientRect();
          return {
            tag: child.tagName.toLowerCase(),
            blockId: child.getAttribute('data-r20-block-id') || '',
            className: String(child.getAttribute('class') || '').slice(0, 160),
            text: String(child.textContent || '').trim().slice(0, 160),
            relativeTop: Math.round(rect.top - rootRect.top),
            height: Math.round(rect.height),
            style: styleSummary(child),
            children: Array.from(child.children).slice(0, 8).map((grandchild) => {
              const grandRect = grandchild.getBoundingClientRect();
              return {
                tag: grandchild.tagName.toLowerCase(),
                blockId: grandchild.getAttribute('data-r20-block-id') || '',
                className: String(grandchild.getAttribute('class') || '').slice(0, 160),
                src: grandchild instanceof HTMLImageElement ? grandchild.currentSrc || grandchild.src : undefined,
                naturalWidth: grandchild instanceof HTMLImageElement ? grandchild.naturalWidth : undefined,
                naturalHeight: grandchild instanceof HTMLImageElement ? grandchild.naturalHeight : undefined,
                complete: grandchild instanceof HTMLImageElement ? grandchild.complete : undefined,
                text: String(grandchild.textContent || '').trim().slice(0, 160),
                relativeTop: Math.round(grandRect.top - rootRect.top),
                height: Math.round(grandRect.height),
                style: styleSummary(grandchild),
              };
            }),
          };
        });
    }
    function summarize(root, el) {
      const rootRect = root.getBoundingClientRect();
      const rect = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        tag: el.tagName.toLowerCase(),
        blockId: el.getAttribute('data-r20-block-id') || '',
        role: el.getAttribute('data-r20-layer-role') || '',
        computed: {
          position: cs.position,
          left: cs.left,
          top: cs.top,
          transform: cs.transform,
          backgroundColor: cs.backgroundColor,
          backgroundImage: cs.backgroundImage,
          color: cs.color,
          borderTopColor: cs.borderTopColor,
          borderBottomColor: cs.borderBottomColor,
        },
        rootStyle: styleSummary(root),
        documentStyle: {
          htmlBackground: getComputedStyle(root.ownerDocument.documentElement).backgroundColor,
          bodyBackground: getComputedStyle(root.ownerDocument.body).backgroundColor,
          bodyImage: getComputedStyle(root.ownerDocument.body).backgroundImage,
        },
        relative: {
          left: Math.round(rect.left - rootRect.left),
          top: Math.round(rect.top - rootRect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        },
        offsetParent: el.offsetParent
          ? {
              tag: el.offsetParent.tagName.toLowerCase(),
              blockId: el.offsetParent.getAttribute('data-r20-block-id') || '',
              className: String(el.offsetParent.getAttribute('class') || ''),
              relativeTop: Math.round(el.offsetParent.getBoundingClientRect().top - rootRect.top),
              position: getComputedStyle(el.offsetParent).position,
            }
          : null,
        parentChain: Array.from(function* chain() {
          let cur = el.parentElement;
          let depth = 0;
          while (cur && cur !== root && depth < 6) {
            yield {
              tag: cur.tagName.toLowerCase(),
              blockId: cur.getAttribute('data-r20-block-id') || '',
              className: String(cur.getAttribute('class') || '').slice(0, 160),
              relativeTop: Math.round(cur.getBoundingClientRect().top - rootRect.top),
              style: styleSummary(cur),
              children: depth >= 4 ? childLayoutSummary(root, cur) : undefined,
            };
            cur = cur.parentElement;
            depth += 1;
          }
        }()),
      };
    }
    const el = root.querySelector(`[data-r20-block-id="${CSS.escape(id)}"]`);
    if (!el) return null;
    return summarize(root, el);
  }, blockId);
}

async function getPreviewBlockState(page, blockId) {
  await page.evaluate(() => {
    window.__perfHook.setPreviewZoom(1);
    window.__perfHook.setPreviewRenderMode('iframe');
    window.__perfHook.setMainMode('preview');
  });
  const frame = page.frameLocator('[data-testid="preview-iframe"]').first();
  await frame.locator('.charactersheet.charsheet').waitFor({ state: 'visible', timeout: 30000 });
  return frame.locator('.charactersheet.charsheet').evaluate((root, id) => {
    function styleSummary(el) {
      const cs = getComputedStyle(el);
      return {
        display: cs.display,
        position: cs.position,
        boxSizing: cs.boxSizing,
        fontFamily: cs.fontFamily,
        fontSize: cs.fontSize,
        lineHeight: cs.lineHeight,
        whiteSpace: cs.whiteSpace,
        textAlign: cs.textAlign,
        width: cs.width,
        height: cs.height,
        marginTop: cs.marginTop,
        marginBottom: cs.marginBottom,
        paddingTop: cs.paddingTop,
        paddingBottom: cs.paddingBottom,
        borderTopWidth: cs.borderTopWidth,
        borderBottomWidth: cs.borderBottomWidth,
      };
    }
    function childLayoutSummary(rootEl, el) {
      const rootRect = rootEl.getBoundingClientRect();
      return Array.from(el.children)
        .slice(0, 12)
        .map((child) => {
          const rect = child.getBoundingClientRect();
          return {
            tag: child.tagName.toLowerCase(),
            blockId: child.getAttribute('data-r20-block-id') || '',
            className: String(child.getAttribute('class') || '').slice(0, 160),
            text: String(child.textContent || '').trim().slice(0, 160),
            relativeTop: Math.round(rect.top - rootRect.top),
            height: Math.round(rect.height),
            style: styleSummary(child),
            children: Array.from(child.children).slice(0, 8).map((grandchild) => {
              const grandRect = grandchild.getBoundingClientRect();
              return {
                tag: grandchild.tagName.toLowerCase(),
                blockId: grandchild.getAttribute('data-r20-block-id') || '',
                className: String(grandchild.getAttribute('class') || '').slice(0, 160),
                src: grandchild instanceof HTMLImageElement ? grandchild.currentSrc || grandchild.src : undefined,
                naturalWidth: grandchild instanceof HTMLImageElement ? grandchild.naturalWidth : undefined,
                naturalHeight: grandchild instanceof HTMLImageElement ? grandchild.naturalHeight : undefined,
                complete: grandchild instanceof HTMLImageElement ? grandchild.complete : undefined,
                text: String(grandchild.textContent || '').trim().slice(0, 160),
                relativeTop: Math.round(grandRect.top - rootRect.top),
                height: Math.round(grandRect.height),
                style: styleSummary(grandchild),
              };
            }),
          };
        });
    }
    function summarize(rootEl, el) {
      const rootRect = rootEl.getBoundingClientRect();
      const rect = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        tag: el.tagName.toLowerCase(),
        blockId: el.getAttribute('data-r20-block-id') || '',
        role: el.getAttribute('data-r20-layer-role') || '',
        computed: {
          position: cs.position,
          left: cs.left,
          top: cs.top,
          transform: cs.transform,
          backgroundColor: cs.backgroundColor,
          backgroundImage: cs.backgroundImage,
          color: cs.color,
          borderTopColor: cs.borderTopColor,
          borderBottomColor: cs.borderBottomColor,
        },
        rootStyle: styleSummary(rootEl),
        documentStyle: {
          htmlBackground: getComputedStyle(rootEl.ownerDocument.documentElement).backgroundColor,
          bodyBackground: getComputedStyle(rootEl.ownerDocument.body).backgroundColor,
          bodyImage: getComputedStyle(rootEl.ownerDocument.body).backgroundImage,
        },
        relative: {
          left: Math.round(rect.left - rootRect.left),
          top: Math.round(rect.top - rootRect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        },
        offsetParent: el.offsetParent
          ? {
              tag: el.offsetParent.tagName.toLowerCase(),
              blockId: el.offsetParent.getAttribute('data-r20-block-id') || '',
              className: String(el.offsetParent.getAttribute('class') || ''),
              relativeTop: Math.round(el.offsetParent.getBoundingClientRect().top - rootRect.top),
              position: getComputedStyle(el.offsetParent).position,
            }
          : null,
        parentChain: Array.from(function* chain() {
          let cur = el.parentElement;
          let depth = 0;
          while (cur && cur !== root && depth < 6) {
            yield {
              tag: cur.tagName.toLowerCase(),
              blockId: cur.getAttribute('data-r20-block-id') || '',
              className: String(cur.getAttribute('class') || '').slice(0, 160),
              relativeTop: Math.round(cur.getBoundingClientRect().top - rootRect.top),
              style: styleSummary(cur),
              children: depth >= 4 ? childLayoutSummary(rootEl, cur) : undefined,
            };
            cur = cur.parentElement;
            depth += 1;
          }
        }()),
      };
    }
    const el = root.querySelector(`[data-r20-block-id="${CSS.escape(id)}"]`);
    if (!el) return null;
    return summarize(root, el);
  }, blockId);
}

async function waitForEditEmitSync(page, blockId, emitted) {
  const deadline = Date.now() + 5000;
  let last = null;
  while (Date.now() < deadline) {
    last = await getEditBlockState(page, blockId);
    if (
      last &&
      emitted?.hasAbsolute &&
      closeEnough(cssPx(last.computed.left), emitted.left, 2) &&
      closeEnough(cssPx(last.computed.top), emitted.top, 2)
    ) {
      return last;
    }
    await page.waitForTimeout(250);
  }
  return last;
}

async function waitForPreviewSync(page, blockId, expected) {
  const deadline = Date.now() + 5000;
  let last = null;
  while (Date.now() < deadline) {
    last = await getPreviewBlockState(page, blockId);
    if (last && closeEnough(last.relative.left, expected.relative.left, 2) && closeEnough(last.relative.top, expected.relative.top, 2)) {
      return last;
    }
    await page.waitForTimeout(250);
  }
  return last;
}

async function dragTarget(page, target) {
  await page.mouse.move(target.center.x, target.center.y);
  await page.mouse.down();
  await page.mouse.move(target.center.x + 12, target.center.y + 8, { steps: 2 });
  await page.mouse.move(target.center.x + DRAG_DELTA.x, target.center.y + DRAG_DELTA.y, { steps: 8 });
  await page.mouse.up();
  return page.evaluate(async (blockId) => {
    const host = document.querySelector('[data-testid="edit-canvas-shadow-host"]');
    const escaped = CSS.escape(blockId);
    const samples = [];
    const sample = (label) => {
      const el = host?.shadowRoot?.querySelector(`[data-r20-block-id="${escaped}"]`);
      const computed = el ? getComputedStyle(el) : null;
      samples.push({
        label,
        position: computed?.position ?? null,
        left: computed ? Math.round(Number.parseFloat(computed.left)) : null,
        top: computed ? Math.round(Number.parseFloat(computed.top)) : null,
        transform: el?.style.transform ?? null,
      });
    };
    sample('after-pointerup');
    await new Promise((resolve) => requestAnimationFrame(resolve));
    sample('after-1raf');
    await new Promise((resolve) => setTimeout(resolve, 50));
    sample('after-50ms');
    await new Promise((resolve) => setTimeout(resolve, 300));
    sample('after-350ms');
    const numeric = samples.filter((s) => typeof s.left === 'number' && typeof s.top === 'number');
    const lefts = numeric.map((s) => s.left);
    const tops = numeric.map((s) => s.top);
    const first = numeric[0] ?? null;
    const last = numeric[numeric.length - 1] ?? null;
    return {
      samples,
      numericSampleCount: numeric.length,
      firstLeft: first?.left ?? null,
      firstTop: first?.top ?? null,
      finalLeft: last?.left ?? null,
      finalTop: last?.top ?? null,
      leftDrift: lefts.length ? Math.max(...lefts) - Math.min(...lefts) : null,
      topDrift: tops.length ? Math.max(...tops) - Math.min(...tops) : null,
    };
  }, target.blockId);
}

async function emittedPositionState(page, blockId) {
  return page.evaluate((id) => {
    const emit = window.__perfHook.getEmitContent();
    const tag = findBlockOpeningTag(emit.html, id);
    const styleAttr = tag.match(/\sstyle=(["'])([\s\S]*?)\1/i)?.[2] || '';
    const classAttr = tag.match(/\sclass=(["'])([\s\S]*?)\1/i)?.[2] || '';
    const cssRule = findDesignCssRule(emit.css, classAttr);
    const combined = `${styleAttr};${cssRule}`;
    return {
      tag,
      cssRule,
      classAttr,
      hasAbsolute: /(?:^|;)\s*position\s*:\s*absolute/i.test(combined),
      left: readPx(combined, 'left'),
      top: readPx(combined, 'top'),
      htmlLen: emit.html.length,
      cssLen: emit.css.length,
      i18nLen: emit.i18n.length,
    };

    function findBlockOpeningTag(html, blockId) {
      let marker = `data-r20-block-id="${blockId}"`;
      let markerIndex = html.indexOf(marker);
      if (markerIndex < 0) {
        marker = `data-r20-block-id='${blockId}'`;
        markerIndex = html.indexOf(marker);
      }
      if (markerIndex < 0) return '';
      const start = html.lastIndexOf('<', markerIndex);
      const end = html.indexOf('>', markerIndex);
      if (start < 0 || end < 0 || start > markerIndex) return '';
      return html.slice(start, end + 1);
    }

    function findDesignCssRule(css, classAttr) {
      const classNames = classAttr
        .split(/\s+/)
        .filter((name) => name.includes('r20-node'))
        .flatMap((name) => (name.startsWith('sheet-') ? [name, name.slice('sheet-'.length)] : [name]));
      for (const className of classNames) {
        const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const match = css.match(new RegExp(`[^{}]*\\.${escaped}[^{}]*\\{([^}]*)\\}`, 'm'));
        if (match) return match[1];
      }
      return '';
    }

    function readPx(text, prop) {
      const match = text.match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*(-?\\d+(?:\\.\\d+)?)px`, 'i'));
      return match ? Math.round(Number.parseFloat(match[1])) : null;
    }
  }, blockId);
}

async function reimportCurrentEmit(page, compactWideRows = false) {
  return page.evaluate(async ({ compactWideRows }) => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const e1 = window.__perfHook.getEmitContent();
    const r2 = await importLive({
      html: e1.html,
      css: e1.css,
      i18n: e1.i18n,
      compactWideRows,
    });
    const e2 = window.__perfHook.getEmitContent();
    const n1 = canonicalHtml(e1.html);
    const n2 = canonicalHtml(e2.html);
    const css1 = canonicalCss(e1.css);
    const css2 = canonicalCss(e2.css);
    return {
      import: r2,
      emit1: { htmlLen: e1.html.length, cssLen: e1.css.length, i18nLen: e1.i18n.length },
      emit2: { htmlLen: e2.html.length, cssLen: e2.css.length, i18nLen: e2.i18n.length },
      stable: {
        html: n1 === n2,
        htmlRawWithIds: e1.html === e2.html,
        css: css1 === css2,
        cssRaw: e1.css === e2.css,
        i18n: e1.i18n === e2.i18n,
        blockCount: r2.blockCount > 0,
      },
      firstDiff: {
        html: n1 === n2 ? null : diffSnippet(n1, n2),
        css: css1 === css2 ? null : diffSnippet(css1, css2),
        cssRaw: e1.css === e2.css ? null : diffSnippet(e1.css, e2.css),
        i18n: e1.i18n === e2.i18n ? null : diffSnippet(e1.i18n, e2.i18n),
      },
    };

    async function importLive(input) {
      window.__perfHook.clearAll();
      await sleep(700);
      let last = null;
      for (let i = 0; i < 40; i += 1) {
        last = await window.__perfHook.importSheet(input);
        if (last.blockCount > 0) return last;
        await sleep(500);
      }
      return last;
    }

    function stripBlockIds(html) {
      return html
        .replace(/\s*data-r20-block-id="[^"]*"/g, '')
        .replace(/^[ \t]+$/gm, '')
        .replace(/\n{2,}/g, '\n');
    }

    function canonicalHtml(html) {
      return stripBlockIds(html)
        // Roll20 template directives are whitespace-insensitive. Keep the
        // raw comparison above available while treating formatter-only
        // newlines between adjacent directives as semantic no-ops.
        .replace(/(\{\{[^{}]*\}\})\s+(?=\{\{[^{}]*\}\})/g, '$1 ');
    }

    function canonicalCss(css) {
      return String(css || '')
        .replace(/\/\*\s*r20-design-css:managed\s*\*\//g, '')
        .replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/\s+/g, ' ').trim())
        .replace(/\s+/g, ' ')
        .replace(/\s*([{}:;,>+~])\s*/g, '$1')
        .replace(/;}/g, '}')
        .trim();
    }

    function diffSnippet(a, b) {
      const n = Math.min(a.length, b.length);
      let i = 0;
      while (i < n && a[i] === b[i]) i += 1;
      return {
        index: i,
        before: a.slice(Math.max(0, i - 80), i + 80),
        after: b.slice(Math.max(0, i - 80), i + 80),
      };
    }
  }, { compactWideRows });
}

function closeEnough(a, b, tolerance) {
  return typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) <= tolerance;
}

function movedFarEnough(before, after) {
  if (!before || !after) return false;
  return Math.abs(after.left - before.left) > 16 || Math.abs(after.top - before.top) > 8;
}

function isSyncedMoveAttempt(entry, pageErrors) {
  return (
    entry.import?.blockCount > 0 &&
    Boolean(entry.before && entry.editAfter && entry.previewAfter) &&
    movedFarEnough(entry.before.relative, entry.editAfter.relative) &&
    hasStablePostDropTimeline(entry.dragTimeline, entry.emitted) &&
    closeEnough(entry.previewAfter.relative.left, entry.editAfter.relative.left, 2) &&
    closeEnough(entry.previewAfter.relative.top, entry.editAfter.relative.top, 2) &&
    entry.emitted?.hasAbsolute === true &&
    closeEnough(entry.emitted.left, cssPx(entry.editAfter.computed.left), 2) &&
    closeEnough(entry.emitted.top, cssPx(entry.editAfter.computed.top), 2) &&
    pageErrors.length === 0
  );
}

function hasStablePostDropTimeline(timeline, emitted) {
  return (
    emitted?.hasAbsolute === true &&
    timeline?.numericSampleCount === 4 &&
    closeEnough(timeline.firstLeft, emitted.left, 2) &&
    closeEnough(timeline.firstTop, emitted.top, 2) &&
    closeEnough(timeline.finalLeft, emitted.left, 2) &&
    closeEnough(timeline.finalTop, emitted.top, 2) &&
    closeEnough(timeline.leftDrift, 0, 2) &&
    closeEnough(timeline.topDrift, 0, 2)
  );
}

function isStableReimport(reimport) {
  return Boolean(
    reimport?.stable?.html &&
    reimport?.stable?.css &&
    reimport?.stable?.i18n &&
    reimport?.stable?.blockCount,
  );
}

function cssPx(value) {
  const n = Number.parseFloat(String(value ?? ''));
  return Number.isFinite(n) ? Math.round(n) : null;
}

function summarizeHtmlWorkspaceShape(graph) {
  if (!Array.isArray(graph) || graph.length === 0) {
    return {
      totalBlocks: 0,
      rootBlocks: 0,
      largestRootSubtreeBlocks: 0,
      largestRootSubtreePct: 0,
      maxDepth: 0,
      roots: [],
      remainingTrSignatures: [],
    };
  }

  const byId = new Map(graph.map((node) => [node.id, node]));
  const rootOf = new Map();
  const descendantsByTr = new Map();

  function findRootId(node) {
    if (!node?.id) return null;
    if (rootOf.has(node.id)) return rootOf.get(node.id);
    const seen = new Set();
    let current = node;
    while (current?.id && !seen.has(current.id)) {
      seen.add(current.id);
      const parent = current.parentId ? byId.get(current.parentId) : null;
      const previous = current.previousId ? byId.get(current.previousId) : null;
      const nextAncestor = parent || previous;
      if (!nextAncestor) break;
      current = nextAncestor;
    }
    const rootId = current?.id ?? node.id;
    for (const id of seen) rootOf.set(id, rootId);
    return rootId;
  }

  const buckets = new Map();
  for (const node of graph) {
    const rootId = findRootId(node);
    if (!rootId) continue;
    const bucket = buckets.get(rootId) || {
      rootType: byId.get(rootId)?.type || '',
      blockCount: 0,
      maxDepth: 0,
      directChildren: 0,
      nextChainBlocks: 0,
      types: new Map(),
    };
    bucket.blockCount += 1;
    bucket.maxDepth = Math.max(bucket.maxDepth, Number(node.depth) || 0);
    if (node.parentId === rootId) bucket.directChildren += 1;
    if (node.previousId) bucket.nextChainBlocks += 1;
    bucket.types.set(node.type, (bucket.types.get(node.type) || 0) + 1);
    buckets.set(rootId, bucket);

    for (const ancestorId of ancestorIds(node)) {
      const ancestor = byId.get(ancestorId);
      if (ancestor?.type !== 'r20_tr') continue;
      const list = descendantsByTr.get(ancestorId) || [];
      list.push(node);
      descendantsByTr.set(ancestorId, list);
    }
  }

  const roots = Array.from(buckets.values())
    .map((bucket) => ({
      rootType: bucket.rootType,
      blockCount: bucket.blockCount,
      maxDepth: bucket.maxDepth,
      directChildren: bucket.directChildren,
      nextChainBlocks: bucket.nextChainBlocks,
      topTypes: Array.from(bucket.types.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 5)
        .map(([type, count]) => ({ type, count })),
    }))
    .sort((a, b) => b.blockCount - a.blockCount || a.rootType.localeCompare(b.rootType));

  const largest = roots[0]?.blockCount || 0;
  return {
    totalBlocks: graph.length,
    rootBlocks: roots.length,
    largestRootSubtreeBlocks: largest,
    largestRootSubtreePct: graph.length ? Math.round((largest / graph.length) * 1000) / 10 : 0,
    maxDepth: roots.reduce((max, root) => Math.max(max, root.maxDepth), 0),
    roots: roots.slice(0, 8),
    remainingTrSignatures: summarizeTrSignatures(descendantsByTr),
  };

  function ancestorIds(node) {
    const ids = [];
    const seen = new Set([node.id]);
    let current = node;
    while (current?.id) {
      const parent = current.parentId ? byId.get(current.parentId) : null;
      const previous = current.previousId ? byId.get(current.previousId) : null;
      const nextAncestor = parent || previous;
      if (!nextAncestor || seen.has(nextAncestor.id)) break;
      ids.push(nextAncestor.id);
      seen.add(nextAncestor.id);
      current = nextAncestor;
    }
    return ids;
  }
}

function summarizeTrSignatures(descendantsByTr) {
  const groups = new Map();
  for (const descendants of descendantsByTr.values()) {
    if (!descendants.length) continue;
    const typeCounts = new Map();
    for (const node of descendants) {
      typeCounts.set(node.type, (typeCounts.get(node.type) || 0) + 1);
    }
    const topTypes = Array.from(typeCounts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 6)
      .map(([type, count]) => ({ type, count }));
    const signature = topTypes.map((item) => `${item.type}:${item.count}`).join('|');
    const group = groups.get(signature) || {
      signature,
      rowCount: 0,
      totalDescendantBlocks: 0,
      maxDescendantBlocks: 0,
      topTypes,
    };
    group.rowCount += 1;
    group.totalDescendantBlocks += descendants.length;
    group.maxDescendantBlocks = Math.max(group.maxDescendantBlocks, descendants.length);
    groups.set(signature, group);
  }
  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      avgDescendantBlocks: Math.round((group.totalDescendantBlocks / group.rowCount) * 10) / 10,
    }))
    .sort((a, b) => b.totalDescendantBlocks - a.totalDescendantBlocks || b.rowCount - a.rowCount)
    .slice(0, 12);
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Imported Edit Sync Smoke');
  lines.push('');
  lines.push(`Generated: ${report.finishedAt || report.startedAt}`);
  lines.push('');
  lines.push('Scope: local static app, imported real fixtures, real edit pointer drag, preview iframe sync, and emitted HTML/CSS position check. This does not prove actual Roll20 visual parity.');
  lines.push('');
  lines.push('| Fixture | Status | Interaction | Resources | Final resources | Blocks | Flow insert | Free insert | Layer reorder | Non-leaf layer | Inside move | Sheet visual | Form state | Root geometry | Target | Role | Before | Edit after | Preview after | Emit/Re-import | Console errors | Page errors |');
  lines.push('| --- | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---: | ---: |');
  for (const item of report.fixtures) {
    lines.push(`| \`${item.id}\` | ${item.pass ? 'PASS' : 'FAIL'} | ${item.interactionPass ? 'PASS' : 'FAIL'} | ${item.resourcePass ? 'PASS' : 'WARN'} | ${fmtFinalResources(item.finalRenderedResources, item.resourceStatus)} | ${item.import?.blockCount ?? ''} | ${fmtCanvasInsert(item.canvasInsert)} | ${fmtFreeInsert(item.freeInsert)} | ${fmtLayerReorder(item.layerReorder)} | ${fmtNonLeafLayerReorder(item.nonLeafLayerReorder)} | ${fmtLayerInsideMove(item.layerInsideMove, item.layerInsideMoveReimport)} | ${fmtVisualSync(item.sheetVisualSync)} | ${fmtFormStateDiff(item.formStateDiff)} | ${fmtRootGeometry(item.rootGeometryDiff)} | ${item.target?.tag ?? ''} | ${item.target?.role ?? ''} | ${fmtRel(item.before)} | ${fmtRel(item.editAfter)} | ${fmtRel(item.previewAfter)} | ${fmtEmit(item.emitted)} / ${fmtReimport(item.reimport)} | ${item.consoleErrors?.length ?? 0} | ${item.pageErrors?.length ?? 0} |`);
  }
  lines.push('');
  lines.push('Notes:');
  lines.push('- PASS means an imported visible node moved by the real edit pointer path, the same block id appeared at the same sheet-relative position in preview, emitted HTML/CSS contained absolute position data, a friendly widget dropped into a visible imported frame/flow container as non-absolute flow content, a second widget dropped in user-facing free mode as nested absolute content, post-edit sheet-root visual mismatch stayed within the configured budget, and the edited emit survived a re-import/emit cycle.');
  lines.push('- Interaction and resource status are separated. Use `--fail-on-resource-issues true` for visual-parity work where external images/fonts must load.');
  lines.push('- Layer reorder is recorded when the imported Blockly graph and layer snapshot expose a safe adjacent leaf sibling pair. Non-leaf layer reorder records the stronger group/subtree case when a visible imported container with direct children has a safe adjacent sibling with matching layer parent/depth semantics. Anonymous cross-container fixtures additionally move existing imported content between frames, lists, table sections, and conditional cases, then check Preview plus re-import nesting. SKIP means no safe pair was found in that fixture; it is not a Roll20 parity claim.');
  lines.push('- This intentionally does not claim every object/reparenting mode works; it guards the imported-sheet move/sync path that users were feeling as rollback/desync.');
  lines.push('- Screenshots and reports are local-only and ignored by Git.');
  lines.push('');
  lines.push('## HTML Workspace Shape');
  lines.push('');
  lines.push('| Fixture | HTML blocks | Root blocks | Largest root subtree | Largest % | Max depth | Largest root type | Largest root top types |');
  lines.push('| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |');
  for (const item of report.fixtures) {
    const shape = item.htmlWorkspaceShape;
    const largest = shape?.roots?.[0];
    lines.push(`| \`${item.id}\` | ${shape?.totalBlocks ?? ''} | ${shape?.rootBlocks ?? ''} | ${shape?.largestRootSubtreeBlocks ?? ''} | ${shape?.largestRootSubtreePct ?? ''} | ${shape?.maxDepth ?? ''} | ${largest?.rootType ?? ''} | ${fmtTopTypes(largest?.topTypes)} |`);
  }
  lines.push('');
  lines.push('Shape note: this is structural only and omits block IDs, text, HTML snippets, and CSS snippets. A few very large root subtrees means top-level chunking will not be enough for imported-sheet performance.');
  lines.push('');
  lines.push('## Remaining Table Row Signatures');
  lines.push('');
  lines.push('| Fixture | Row count | Total descendant blocks | Avg blocks/row | Max blocks/row | Top structural signature |');
  lines.push('| --- | ---: | ---: | ---: | ---: | --- |');
  for (const item of report.fixtures) {
    const signatures = item.htmlWorkspaceShape?.remainingTrSignatures ?? [];
    const first = signatures[0];
    lines.push(`| \`${item.id}\` | ${first?.rowCount ?? ''} | ${first?.totalDescendantBlocks ?? ''} | ${first?.avgDescendantBlocks ?? ''} | ${first?.maxDescendantBlocks ?? ''} | ${fmtTopTypes(first?.topTypes)} |`);
  }
  lines.push('');
  lines.push('Row signature note: these are remaining `r20_tr` structures after current composite packing. They are candidates for the next generic composite or lazy-materialization path, not proof that a new matcher is safe.');
  lines.push('');
  lines.push('## Resource Diagnostics');
  lines.push('');
  lines.push('| Fixture | Resource issues | Top failures |');
  lines.push('| --- | ---: | --- |');
  for (const item of report.fixtures) {
    lines.push(`| \`${item.id}\` | ${sumResourceIssues(item.resourceIssues)} | ${fmtResourceIssues(item.resourceIssues)} |`);
  }
  return `${lines.join('\n')}\n`;
}

function fmtTopTypes(items) {
  if (!Array.isArray(items) || items.length === 0) return '';
  return items.map((item) => `${item.type}:${item.count}`).join('<br>');
}

function fmtRel(item) {
  if (!item?.relative) return '';
  return `${item.relative.left},${item.relative.top} ${item.relative.width}x${item.relative.height}`;
}

function fmtEmit(item) {
  if (!item) return '';
  return item.hasAbsolute ? `${item.left},${item.top}` : 'no absolute';
}

function fmtReimport(item) {
  if (!item) return 'reimport missing';
  if (!isStableReimport(item)) return 'reimport drift';
  return item.stable?.htmlRawWithIds && item.stable?.cssRaw
    ? 'reimport raw stable'
    : 'reimport stable after canonical normalization';
}

function fmtFinalResources(item, status) {
  if (!item) return 'missing';
  const label = status?.classification || (item.pass ? 'final clean' : 'final failed');
  const edit = item.edit ? `${item.edit.failedImageCount ?? 0} img/${item.edit.failedBackgroundCount ?? 0} bg` : 'edit missing';
  const preview = item.preview ? `${item.preview.failedImageCount ?? 0} img/${item.preview.failedBackgroundCount ?? 0} bg` : 'preview missing';
  return `${label}; edit ${edit}; preview ${preview}`;
}

function fmtLayerReorder(item) {
  if (!item) return 'missing';
  if (item.skipped) return `SKIP: ${item.reason || 'no pair'}`;
  if (item.pass) {
    return `${item.pair?.moving?.tag || ''} before ${item.pair?.target?.tag || ''}`;
  }
  return `FAIL: ${item.reason || item.mode || 'not reordered'}`;
}

function fmtNonLeafLayerReorder(item) {
  if (!item) return 'missing';
  if (item.skipped) return `SKIP: ${item.reason || 'no subtree'}`;
  if (item.pass) {
    const moving = item.candidate?.moving;
    const target = item.candidate?.target;
    const direction = item.candidate?.direction || item.mode || '';
    const mismatch = typeof item.visualSync?.diff?.mismatchPct === 'number' ? `, visual ${item.visualSync.diff.mismatchPct}%` : '';
    return `${moving?.tag || ''} ${direction} ${target?.tag || ''} (${moving?.childCount ?? 0} children, preview ${item.previewSync ? 'sync' : 'unchecked'}${mismatch})`;
  }
  return `FAIL: ${item.reason || item.mode || 'subtree not moved'}`;
}

function fmtLayerInsideMove(item, reimport) {
  if (!item) return 'missing';
  if (item.skipped) return `SKIP: ${item.reason || 'no pair'}`;
  if (item.pass && reimport?.pass) return `inside ${item.structure || 'frame'}, preview/re-import sync`;
  return `FAIL: ${item.reason || item.model?.reason || reimport?.reason || 'nesting drift'}`;
}

function fmtVisualSync(item) {
  if (!item) return 'missing';
  if (item.pass) return `${item.diff?.mismatchPct ?? ''}%${fmtVisualHotspot(item)}`;
  const reason = item.classification ? ` ${item.classification}` : '';
  return `WARN: ${item.diff?.mismatchPct ?? item.reason ?? 'visual mismatch'}%${reason}${fmtVisualHotspot(item)}`;
}

function fmtVisualHotspot(item) {
  const coverage = item?.diff?.mismatchCoverage;
  const hot = item?.diff?.hotCells?.[0];
  if (!coverage && !hot) return '';
  const coverageText = coverage ? ` cov ${coverage.widthPct}x${coverage.heightPct}%` : '';
  const hotText = hot ? ` hot r${hot.row}c${hot.col}:${hot.mismatchPct}%` : '';
  return `${coverageText}${hotText}`;
}

function fmtFormStateDiff(item) {
  if (!item) return 'missing';
  if (item.pass) return 'match';
  const typeSummary = Object.entries(item.byType || {})
    .slice(0, 3)
    .map(([type, count]) => `${type}:${count}`)
    .join(', ');
  return `DIFF ${item.diffCount}${typeSummary ? ` (${typeSummary})` : ''}`;
}

function fmtRootGeometry(item) {
  if (!item?.rootDelta) return 'missing';
  if (item.pass) return 'match';
  return `delta w ${item.rootDelta.width}px h ${item.rootDelta.height}px scroll ${item.rootDelta.scrollWidth}px`;
}

function fmtCanvasInsert(item) {
  if (!item) return 'missing';
  if (item.pass) return `inside ${item.target?.role || ''} ${item.target?.width || ''}x${item.target?.height || ''}`.trim();
  return `FAIL: ${item.reason || item.indicator?.hostDropMode || 'not inserted'}`;
}

function fmtFreeInsert(item) {
  if (!item) return 'missing';
  if (item.pass) {
    return `absolute in ${item.activeTarget?.role || item.target?.role || ''} ${item.emittedLeft},${item.emittedTop}`.trim();
  }
  return `FAIL: ${item.reason || item.indicator?.hostDropMode || 'not inserted'}`;
}

function sumResourceIssues(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, item) => sum + (item.count ?? 0), 0);
}

function fmtResourceIssues(items) {
  if (!Array.isArray(items) || items.length === 0) return '';
  return items
    .slice(0, 3)
    .map((item) => `${item.count}x ${item.status ?? item.kind} ${item.resourceType} ${item.host || '(local)'}${item.failures?.length ? ` (${item.failures.join(', ')})` : ''}`)
    .join('<br>');
}

async function main() {
  await assertStaticOutput();
  await fs.mkdir(path.join(REPORT_DIR, 'screenshots'), { recursive: true });
  const fixtures = await listFixtures();
  if (fixtures.length === 0) {
    console.error(`no fixtures with source.html under ${FIXTURES_DIR}`);
    process.exitCode = 1;
    return;
  }

  const server = await startServer();
  const browser = await chromium.launch();
  const report = {
    startedAt: new Date().toISOString(),
    dragDelta: DRAG_DELTA,
    failOnResourceIssues: FAIL_ON_RESOURCE_ISSUES,
    compactWideRows: COMPACT_WIDE_ROWS,
    requireSheetVisualSync: REQUIRE_SHEET_VISUAL_SYNC,
    sheetVisualMismatchLimitPct: SHEET_VISUAL_MISMATCH_LIMIT_PCT,
    scopeNote:
      'interaction pass means edit/preview sync worked; resource pass is separate because visual parity needs assets to load',
    fixtures: [],
  };

  try {
    for (const fixture of fixtures) {
      const page = await browser.newPage({ viewport: VIEWPORT });
      const consoleErrors = [];
      const pageErrors = [];
      const resourceIssues = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 500));
      });
      page.on('pageerror', (err) => pageErrors.push(String(err).slice(0, 500)));
      page.on('response', (response) => {
        const status = response.status();
        if (status >= 400) resourceIssues.push(summarizeResourceIssue('http', response.request(), response));
      });
      page.on('requestfailed', (request) => {
        resourceIssues.push({
          ...summarizeResourceIssue('failed', request),
          failure: request.failure()?.errorText ?? '',
        });
      });
      await page.addInitScript(() => {
        try {
          window.localStorage.setItem('__perfOn', '1');
          window.localStorage.removeItem('r20be-autosave');
        } catch {}
      });

      const entry = { id: fixture.id, pass: false };
      try {
        await page.goto(`http://127.0.0.1:${PORT}${BASE_PATH}/`, { waitUntil: 'load' });
        await warmPerfHook(page);
        entry.import = await importFixture(page, fixture);
        entry.workspaceAfterImport = await page.evaluate(() => window.__perfHook.getWorkspace());
        entry.htmlWorkspaceShape = summarizeHtmlWorkspaceShape(
          await page.evaluate(() => window.__perfHook.getBlockGraph?.('html') || []),
        );
        if (fixture.genericElement) {
          entry.genericElementCoverage = await page.evaluate(() => {
            const graph = window.__perfHook.getBlockGraph?.('html') || [];
            const emitted = window.__perfHook.getEmitContent?.()?.html || '';
            const genericBlocks = graph.filter((block) => block.type === 'r20_element_container');
            return {
              genericBlockCount: genericBlocks.length,
              hasCustomTag: emitted.includes('<custom-card'),
              hasAnchorTag: emitted.includes('<a'),
              hasSvgTag: emitted.includes('<svg'),
              hasPreservedAttribute: emitted.includes('data-kind="generic"')
                && emitted.includes('aria-label="Open"'),
              pass: genericBlocks.length >= 4
                && emitted.includes('<custom-card')
                && emitted.includes('<a')
                && emitted.includes('<svg')
                && emitted.includes('data-kind="generic"')
                && emitted.includes('aria-label="Open"'),
            };
          });
          if (!entry.genericElementCoverage.pass) {
            throw new Error(`generic element coverage failed: ${JSON.stringify(entry.genericElementCoverage)}`);
          }
        }
        if (CANONICAL_IFRAME) {
          await page.waitForTimeout(1300);
          entry.layerReorder = await runImportedLayerReorder(page);
          entry.nonLeafLayerReorder = await runImportedNonLeafLayerReorder(page, fixture.id);
          entry.layerInsideMove = await runImportedLayerInsideMove(page, fixture.id);
          entry.canvasInsert = await runCanonicalImportedCanvasInsert(page);
          entry.freeInsert = await runCanonicalImportedFreeCanvasInsert(page);
          entry.canonicalEditSync = await runCanonicalIframeEditSync(page);
          entry.sheetVisualSync = await captureSheetRootVisualSync(page, fixture.id);
          entry.sheetVisualSync.classification = classifySheetVisualSync(
            entry.sheetVisualSync,
            null,
            null,
          );
          // The canonical iframe path is the production preview/edit surface.
          // Keep its round-trip claim honest too: an edit is not fully synced
          // until the emitted payload can be imported and emitted again
          // without structural drift.
          entry.reimport = await reimportCurrentEmit(page, COMPACT_WIDE_ROWS);
          entry.layerInsideMoveReimport = await verifyImportedLayerInsideMoveAfterReimport(
            page,
            entry.layerInsideMove,
          );
          entry.interactionPass = entry.canonicalEditSync.pass === true;
          entry.interactionPass = entry.interactionPass && isStableReimport(entry.reimport);
          entry.interactionPass = entry.interactionPass
            && (entry.layerReorder?.pass === true || entry.layerReorder?.skipped === true)
            && (entry.nonLeafLayerReorder?.pass === true || entry.nonLeafLayerReorder?.skipped === true)
            && (entry.layerInsideMove?.pass === true || entry.layerInsideMove?.skipped === true)
            && (entry.layerInsideMoveReimport?.pass === true || entry.layerInsideMoveReimport?.skipped === true)
            && (entry.canvasInsert?.pass === true || entry.canvasInsert?.skipped === true)
            && (entry.freeInsert?.pass === true || entry.freeInsert?.skipped === true)
            && (!REQUIRE_SHEET_VISUAL_SYNC || entry.sheetVisualSync?.pass === true);
          entry.pass = entry.interactionPass;
        } else {
        await page.waitForTimeout(1300);
        entry.layerReorder = await runImportedLayerReorder(page);
        entry.nonLeafLayerReorder = await runImportedNonLeafLayerReorder(page, fixture.id);
        entry.layerInsideMove = await runImportedLayerInsideMove(page, fixture.id);
        entry.canvasInsert = await runImportedCanvasInsert(page);
        entry.freeInsert = await runImportedFreeCanvasInsert(page);
        entry.attempts = [];
        const excludedIds = [];
        for (let attemptIndex = 0; attemptIndex < 24; attemptIndex += 1) {
          const target = await chooseEditTarget(page, excludedIds);
          if (!target) break;
          const attempt = { target };
          excludedIds.push(target.blockId);
          attempt.before = await getEditBlockState(page, target.blockId);
          if (attemptIndex === 0) {
            await page.screenshot({ path: path.join(REPORT_DIR, 'screenshots', `${fixture.id}-before-edit.png`) });
          }
          attempt.dragTimeline = await dragTarget(page, target);
          attempt.emitted = await emittedPositionState(page, target.blockId);
          await page.waitForTimeout(1200);
          attempt.editAfter = await waitForEditEmitSync(page, target.blockId, attempt.emitted);
          attempt.previewAfter = await waitForPreviewSync(page, target.blockId, attempt.editAfter);
          attempt.pass = isSyncedMoveAttempt({ ...entry, ...attempt }, pageErrors);
          entry.attempts.push(attempt);
          if (attempt.pass) {
            entry.target = attempt.target;
            entry.before = attempt.before;
            entry.emitted = attempt.emitted;
            entry.editAfter = attempt.editAfter;
            entry.previewAfter = attempt.previewAfter;
            entry.pass = true;
            break;
          }
        }
        if (!entry.target) throw new Error('No imported node produced a synced editable move');
        await page.screenshot({ path: path.join(REPORT_DIR, 'screenshots', `${fixture.id}-after-edit.png`) });
        await page.screenshot({ path: path.join(REPORT_DIR, 'screenshots', `${fixture.id}-after-preview.png`) });
        entry.reimport = await reimportCurrentEmit(page, COMPACT_WIDE_ROWS);
        entry.layerInsideMoveReimport = await verifyImportedLayerInsideMoveAfterReimport(
          page,
          entry.layerInsideMove,
        );
        entry.sheetVisualSync = await captureSheetRootVisualSync(page, fixture.id);
        entry.formStateDiff = await compareEditPreviewFormState(page);
        entry.rootGeometryDiff = await compareEditPreviewRootGeometry(page);
        entry.finalRenderedResources = await collectFinalRenderedResources(page);
        entry.sheetVisualSync.classification = classifySheetVisualSync(
          entry.sheetVisualSync,
          entry.formStateDiff,
          entry.rootGeometryDiff,
        );
        entry.interactionPass =
          entry.pass &&
          entry.canvasInsert?.pass === true &&
          entry.freeInsert?.pass === true &&
          (entry.layerReorder?.pass === true || entry.layerReorder?.skipped === true) &&
          (entry.nonLeafLayerReorder?.pass === true || entry.nonLeafLayerReorder?.skipped === true) &&
          (entry.layerInsideMove?.pass === true || entry.layerInsideMove?.skipped === true) &&
          (entry.layerInsideMoveReimport?.pass === true || entry.layerInsideMoveReimport?.skipped === true) &&
          (!REQUIRE_SHEET_VISUAL_SYNC || entry.sheetVisualSync?.pass === true) &&
          isStableReimport(entry.reimport);
        entry.pass = entry.interactionPass;
        }
      } catch (err) {
        entry.error = String(err?.stack || err).slice(0, 1200);
      }
      entry.consoleErrors = consoleErrors;
      entry.pageErrors = pageErrors;
      entry.resourceIssues = summarizeResourceIssues(resourceIssues);
      entry.resourceIssueCount = sumResourceIssues(entry.resourceIssues);
      entry.resourceStatus = classifyResourceStatus(entry.resourceIssues, entry.finalRenderedResources);
      entry.resourcePass = entry.resourceStatus.pass;
      if (FAIL_ON_RESOURCE_ISSUES && !entry.resourcePass) entry.pass = false;
      report.fixtures.push(entry);
      console.log(`${entry.pass ? 'PASS' : 'FAIL'} ${fixture.id} interaction=${entry.interactionPass ? 'PASS' : 'FAIL'} resources=${entry.resourcePass ? 'PASS' : 'WARN'} target=${entry.target?.tag ?? 'none'} edit=${fmtRel(entry.editAfter)} preview=${fmtRel(entry.previewAfter)}`);
      await page.close();
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }

  report.finishedAt = new Date().toISOString();
  report.pass = report.fixtures.every((item) => item.pass);
  await fs.writeFile(path.join(REPORT_DIR, 'imported-edit-sync-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(path.join(REPORT_DIR, 'imported-edit-sync-results.md'), renderMarkdown(report), 'utf8');
  console.log(report.pass ? 'IMPORTED EDIT SYNC PASS' : 'IMPORTED EDIT SYNC FAIL');
  process.exitCode = report.pass ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
