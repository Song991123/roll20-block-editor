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
const PORT = Number(argOf('--port', '4196'));
const VIEWPORT = { width: 2200, height: 1200 };
const DRAG_DELTA = { x: Number(argOf('--dx', '80')), y: Number(argOf('--dy', '48')) };
const FAIL_ON_RESOURCE_ISSUES = argOf('--fail-on-resource-issues', 'false') === 'true';

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

async function listFixtures() {
  const entries = await fs.readdir(FIXTURES_DIR, { withFileTypes: true });
  const out = [];
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
    };
    item.count += 1;
    if (item.examples.length < 3) item.examples.push(issue.url);
    map.set(key, item);
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count || String(a.host).localeCompare(String(b.host)));
}

async function importFixture(page, fixture) {
  return page.evaluate(async ({ html, css, i18n }) => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    window.__perfHook.clearAll();
    await sleep(700);
    let last = null;
    for (let i = 0; i < 40; i += 1) {
      last = await window.__perfHook.importSheet({ html, css, i18n });
      if (last.blockCount > 0) return last;
      await sleep(500);
    }
    return last;
  }, fixture);
}

async function chooseEditTarget(page, excludedIds = []) {
  await page.evaluate(() => {
    window.__perfHook.setPreviewZoom(1);
    window.__perfHook.setMainMode('edit');
  });
  await page.waitForSelector('[data-testid="edit-canvas-shadow-host"]', { timeout: 30000 });
  await page.waitForFunction(
    () => Boolean(document.querySelector('[data-testid="edit-canvas-shadow-host"]')?.shadowRoot?.querySelector('#charsheet-root')),
    null,
    { timeout: 30000 },
  );
  return page.evaluate((excluded) => {
    const excludedSet = new Set(excluded);
    const host = document.querySelector('[data-testid="edit-canvas-shadow-host"]');
    const shadow = host?.shadowRoot;
    const root = shadow?.querySelector('#charsheet-root');
    if (!host || !shadow || !root) return null;
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

async function runImportedLayerReorder(page) {
  await page.evaluate(() => {
    window.__perfHook.setPreviewZoom(1);
    window.__perfHook.setMainMode('edit');
  });
  await page.waitForSelector('[data-testid="edit-canvas-shadow-host"]', { timeout: 30000 });
  await page.waitForFunction(
    () => Boolean(document.querySelector('[data-testid="edit-canvas-shadow-host"]')?.shadowRoot?.querySelector('#charsheet-root')),
    null,
    { timeout: 30000 },
  );
  return page.evaluate(async () => {
    function emittedIndex(id) {
      return window.__perfHook.getEmitContent().html.indexOf(`data-r20-block-id="${id}"`);
    }

    function findPair() {
      const host = document.querySelector('[data-testid="edit-canvas-shadow-host"]');
      const root = host?.shadowRoot?.querySelector('#charsheet-root');
      if (!root) return null;

      const graph = window.__perfHook.getBlockGraph?.('html') || [];
      const byId = new Map(graph.map((node) => [node.id, node]));
      const describe = (node) => {
        const el = root.querySelector(`[data-r20-block-id="${CSS.escape(node.id)}"]`);
        const rect = el?.getBoundingClientRect();
        return {
          blockId: node.id,
          type: node.type,
          tag: el?.tagName.toLowerCase() || node.type,
          role: el?.getAttribute('data-r20-layer-role') || '',
          nestedCount: el?.querySelectorAll('[data-r20-block-id]').length ?? node.childCount,
          text: String(el?.textContent || '').trim().slice(0, 60),
          visible: Boolean(
            el &&
              rect &&
              rect.width >= 4 &&
              rect.height >= 4 &&
              getComputedStyle(el).display !== 'none' &&
              getComputedStyle(el).visibility !== 'hidden',
          ),
        };
      };

      for (const movingNode of graph) {
        if (!movingNode.previousId || movingNode.hasNextTarget || movingNode.childCount > 0) continue;
        if (/script|worker|rolltemplate/i.test(movingNode.type)) continue;
        const targetNode = byId.get(movingNode.previousId);
        if (!targetNode || targetNode.nextId !== movingNode.id) continue;
        if (/script|worker|rolltemplate/i.test(targetNode.type)) continue;
        const targetRow = document.querySelector(`[data-testid="edit-layer-row"][data-r20-block-id="${CSS.escape(targetNode.id)}"]`);
        const movingRow = document.querySelector(`[data-testid="edit-layer-row"][data-r20-block-id="${CSS.escape(movingNode.id)}"]`);
        if (!targetRow || !movingRow) continue;
        const target = describe(targetNode);
        const moving = describe(movingNode);
        if (!target.visible || !moving.visible) continue;
        return {
          parentBlockId: movingNode.parentId || 'workspace-root',
          target,
          moving,
          siblingCount: graph.filter((node) => node.parentId === movingNode.parentId && node.depth === movingNode.depth).length,
          beforeOrder: graph
            .filter((node) => node.parentId === movingNode.parentId && node.depth === movingNode.depth)
            .map((node) => node.id),
        };
      }
      return null;
    }

    const pair = findPair();
    if (!pair) return { pass: false, skipped: true, reason: 'no imported leaf sibling pair found' };
    const targetRow = document.querySelector(
      `[data-testid="edit-layer-row"][data-r20-block-id="${CSS.escape(pair.target.blockId)}"]`,
    );
    if (!targetRow) return { pass: false, skipped: false, pair, reason: 'target layer row missing' };

    const before = {
      movingIndex: emittedIndex(pair.moving.blockId),
      targetIndex: emittedIndex(pair.target.blockId),
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
      before.movingIndex > before.targetIndex &&
      after.movingIndex >= 0 &&
      after.targetIndex >= 0 &&
      after.movingIndex < after.targetIndex;
    return { pass, skipped: false, pair, mode, before, after };
  });
}

async function runImportedNonLeafLayerReorder(page) {
  await page.evaluate(() => {
    window.__perfHook.setPreviewZoom(1);
    window.__perfHook.setMainMode('edit');
  });
  await page.waitForSelector('[data-testid="edit-canvas-shadow-host"]', { timeout: 30000 });
  await page.waitForFunction(
    () => Boolean(document.querySelector('[data-testid="edit-canvas-shadow-host"]')?.shadowRoot?.querySelector('#charsheet-root')),
    null,
    { timeout: 30000 },
  );
  return page.evaluate(async () => {
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

    function describe(root, node, childIds) {
      const el = root.querySelector(`[data-r20-block-id="${CSS.escape(node.id)}"]`);
      const rect = el?.getBoundingClientRect();
      return {
        blockId: node.id,
        type: node.type,
        tag: el?.tagName.toLowerCase() || node.type,
        role: el?.getAttribute('data-r20-layer-role') || '',
        childIds,
        childCount: childIds.length,
        nestedCount: el?.querySelectorAll('[data-r20-block-id]').length ?? node.childCount,
        text: String(el?.textContent || '').trim().slice(0, 60),
        visible: Boolean(
          el &&
            rect &&
            rect.width >= 4 &&
            rect.height >= 4 &&
            getComputedStyle(el).display !== 'none' &&
            getComputedStyle(el).visibility !== 'hidden',
        ),
      };
    }

    function findCandidate() {
      const host = document.querySelector('[data-testid="edit-canvas-shadow-host"]');
      const root = host?.shadowRoot?.querySelector('#charsheet-root');
      if (!root) return null;

      const graph = window.__perfHook.getBlockGraph?.('html') || [];
      const byId = new Map(graph.map((node) => [node.id, node]));
      const siblingsOf = (node) => graph.filter((candidate) => candidate.parentId === node.parentId && candidate.depth === node.depth);

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
          (item) =>
            item.targetNode &&
            !isRuntime(item.targetNode) &&
            item.targetNode.parentId === movingNode.parentId &&
            item.targetNode.depth === movingNode.depth,
        );

        for (const option of targetOptions) {
          const targetRow = document.querySelector(
            `[data-testid="edit-layer-row"][data-r20-block-id="${CSS.escape(option.targetNode.id)}"]`,
          );
          if (!targetRow) continue;
          const moving = describe(root, movingNode, childIds);
          const target = describe(root, option.targetNode, directChildIds(graph, option.targetNode.id, option.targetNode.nextId));
          if (!moving.visible || !target.visible) continue;
          return {
            direction: option.direction,
            parentBlockId: movingNode.parentId || 'workspace-root',
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
    const movedAcrossTarget =
      candidate.direction === 'after'
        ? before.movingIndex < before.targetIndex && after.movingIndex > after.targetIndex
        : before.movingIndex > before.targetIndex && after.movingIndex < after.targetIndex;
    const pass =
      drop.defaultPrevented &&
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
      movedAcrossTarget,
      dropPrevented: drop.defaultPrevented,
    };
  });
}

async function runImportedCanvasInsert(page) {
  await page.evaluate(() => {
    window.__perfHook.setPreviewZoom(1);
    window.__perfHook.setMainMode('edit');
  });
  await page.waitForSelector('[data-testid="edit-canvas-shadow-host"]', { timeout: 30000 });
  await page.waitForFunction(
    () => Boolean(document.querySelector('[data-testid="edit-canvas-shadow-host"]')?.shadowRoot?.querySelector('#charsheet-root')),
    null,
    { timeout: 30000 },
  );
  await page.click('[data-testid="edit-placement-flow"]');
  return page.evaluate(async () => {
    const host = document.querySelector('[data-testid="edit-canvas-shadow-host"]');
    const root = host?.shadowRoot?.querySelector('#charsheet-root');
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
      if (!indicator.hostDropMode) {
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

      const freshRoot = host.shadowRoot?.querySelector('#charsheet-root');
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
        Boolean(indicator.hostDropMode) &&
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
      if (newId) return { ...attempt, attempts };
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
    () => Boolean(document.querySelector('[data-testid="edit-canvas-shadow-host"]')?.shadowRoot?.querySelector('#charsheet-root')),
    null,
    { timeout: 30000 },
  );
  await page.click('[data-testid="edit-placement-free"]');
  return page.evaluate(async () => {
    const host = document.querySelector('[data-testid="edit-canvas-shadow-host"]');
    const root = host?.shadowRoot?.querySelector('#charsheet-root');
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

        const freshRoot = host.shadowRoot?.querySelector('#charsheet-root');
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
  return page.evaluate((id) => {
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
    const host = document.querySelector('[data-testid="edit-canvas-shadow-host"]');
    const root = host?.shadowRoot?.querySelector('#charsheet-root');
    const el = host?.shadowRoot?.querySelector(`[data-r20-block-id="${CSS.escape(id)}"]`);
    if (!root || !el) return null;
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
  await frame.locator('#charsheet-root').waitFor({ state: 'visible', timeout: 30000 });
  return frame.locator('#charsheet-root').evaluate((root, id) => {
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
    return {
      samples,
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

async function reimportCurrentEmit(page) {
  return page.evaluate(async () => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const e1 = window.__perfHook.getEmitContent();
    const r2 = await importLive({
      html: e1.html,
      css: e1.css,
      i18n: e1.i18n,
    });
    const e2 = window.__perfHook.getEmitContent();
    const n1 = stripBlockIds(e1.html);
    const n2 = stripBlockIds(e2.html);
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
  });
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
    closeEnough(entry.previewAfter.relative.left, entry.editAfter.relative.left, 2) &&
    closeEnough(entry.previewAfter.relative.top, entry.editAfter.relative.top, 2) &&
    entry.emitted?.hasAbsolute === true &&
    closeEnough(entry.emitted.left, cssPx(entry.editAfter.computed.left), 2) &&
    closeEnough(entry.emitted.top, cssPx(entry.editAfter.computed.top), 2) &&
    pageErrors.length === 0
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
    };
  }

  const byId = new Map(graph.map((node) => [node.id, node]));
  const rootOf = new Map();

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
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Imported Edit Sync Smoke');
  lines.push('');
  lines.push(`Generated: ${report.finishedAt || report.startedAt}`);
  lines.push('');
  lines.push('Scope: local static app, imported real fixtures, real edit pointer drag, preview iframe sync, and emitted HTML/CSS position check. This does not prove actual Roll20 visual parity.');
  lines.push('');
  lines.push('| Fixture | Status | Interaction | Resources | Blocks | Flow insert | Free insert | Layer reorder | Non-leaf layer | Target | Role | Before | Edit after | Preview after | Emit/Re-import | Console errors | Page errors |');
  lines.push('| --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---: | ---: |');
  for (const item of report.fixtures) {
    lines.push(`| \`${item.id}\` | ${item.pass ? 'PASS' : 'FAIL'} | ${item.interactionPass ? 'PASS' : 'FAIL'} | ${item.resourcePass ? 'PASS' : 'WARN'} | ${item.import?.blockCount ?? ''} | ${fmtCanvasInsert(item.canvasInsert)} | ${fmtFreeInsert(item.freeInsert)} | ${fmtLayerReorder(item.layerReorder)} | ${fmtNonLeafLayerReorder(item.nonLeafLayerReorder)} | ${item.target?.tag ?? ''} | ${item.target?.role ?? ''} | ${fmtRel(item.before)} | ${fmtRel(item.editAfter)} | ${fmtRel(item.previewAfter)} | ${fmtEmit(item.emitted)} / ${fmtReimport(item.reimport)} | ${item.consoleErrors?.length ?? 0} | ${item.pageErrors?.length ?? 0} |`);
  }
  lines.push('');
  lines.push('Notes:');
  lines.push('- PASS means an imported visible node moved by the real edit pointer path, the same block id appeared at the same sheet-relative position in preview, emitted HTML/CSS contained absolute position data, a friendly widget dropped into a visible imported frame/flow container as non-absolute flow content, a second widget dropped in user-facing free mode as nested absolute content, and the edited emit survived a re-import/emit cycle.');
  lines.push('- Interaction and resource status are separated. Use `--fail-on-resource-issues true` for visual-parity work where external images/fonts must load.');
  lines.push('- Layer reorder is recorded when the imported Blockly graph exposes a safe adjacent leaf sibling pair. Non-leaf layer reorder records the stronger group/subtree case when a visible imported container with direct children has a safe adjacent sibling. SKIP means no safe pair was found in that fixture; it is not a Roll20 parity claim.');
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
  return isStableReimport(item) ? 'reimport stable' : 'reimport drift';
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
    return `${moving?.tag || ''} ${direction} ${target?.tag || ''} (${moving?.childCount ?? 0} children)`;
  }
  return `FAIL: ${item.reason || item.mode || 'subtree not moved'}`;
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
    .map((item) => `${item.count}x ${item.status ?? item.kind} ${item.resourceType} ${item.host || '(local)'}`)
    .join('<br>');
}

async function main() {
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
        await page.waitForTimeout(1300);
        entry.layerReorder = await runImportedLayerReorder(page);
        entry.nonLeafLayerReorder = await runImportedNonLeafLayerReorder(page);
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
        entry.reimport = await reimportCurrentEmit(page);
        entry.interactionPass =
          entry.pass &&
          entry.canvasInsert?.pass === true &&
          entry.freeInsert?.pass === true &&
          (entry.layerReorder?.pass === true || entry.layerReorder?.skipped === true) &&
          (entry.nonLeafLayerReorder?.pass === true || entry.nonLeafLayerReorder?.skipped === true) &&
          isStableReimport(entry.reimport);
        entry.pass = entry.interactionPass;
      } catch (err) {
        entry.error = String(err?.stack || err).slice(0, 1200);
      }
      entry.consoleErrors = consoleErrors;
      entry.pageErrors = pageErrors;
      entry.resourceIssues = summarizeResourceIssues(resourceIssues);
      entry.resourceIssueCount = sumResourceIssues(entry.resourceIssues);
      entry.resourcePass = entry.resourceIssueCount === 0;
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
