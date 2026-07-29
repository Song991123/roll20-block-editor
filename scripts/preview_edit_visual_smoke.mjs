#!/usr/bin/env node
/**
 * Preview/Edit visual smoke for prepared fixtures.
 *
 * Imports ignored fixture source through the live app bundle, captures the
 * persistent preview/edit iframe surface, then computes a browser-canvas pixel
 * diff over their shared crop. Generated screenshots/reports are local-only.
 *
 * Scope: local preview vs local edit in the static Next.js app.
 * This does not prove actual Roll20 visual parity.
 *
 * Usage:
 *   node scripts/preview_edit_visual_smoke.mjs \
 *     --out-dir ./out --base-path /roll20-block-editor \
 *     --fixtures test-fixtures/visual --report-dir reports/preview-edit-visual \
 *     --compatibility-mode modern|legacy|both
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
const REPORT_DIR = path.resolve(argOf('--report-dir', 'reports/preview-edit-visual'));
const ONLY = argOf('--only', '');
const COMPATIBILITY_MODE = argOf('--compatibility-mode', 'modern');
const COMPATIBILITY_MODES = COMPATIBILITY_MODE === 'both'
  ? ['modern', 'legacy']
  : [COMPATIBILITY_MODE];
const PORT = Number(argOf('--port', '4186'));
const VIEWPORT = { width: 2200, height: 1200 };

if (!COMPATIBILITY_MODES.every((mode) => mode === 'modern' || mode === 'legacy')) {
  throw new Error(`invalid --compatibility-mode: ${COMPATIBILITY_MODE}`);
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

async function waitForLiveImport(page, fixture) {
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

function summarizeSheetElement(sheetEl) {
  const rect = sheetEl.getBoundingClientRect();
  const elements = sheetEl.querySelectorAll('*');
  return {
    status: 'ok',
    rect: {
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      left: Math.round(rect.left),
      top: Math.round(rect.top),
    },
    elementCount: elements.length,
    visibleElementCount: Array.from(elements).filter((el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0;
    }).length,
  };
}

function summarizeStableSheetState(sheetEl) {
  function localHashString(value) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }

  const rect = sheetEl.getBoundingClientRect();
  let contentHeight = Math.max(sheetEl.scrollHeight, sheetEl.offsetHeight, Math.ceil(rect.height));
  let contentWidth = Math.max(sheetEl.scrollWidth, sheetEl.offsetWidth, Math.ceil(rect.width));
  sheetEl.querySelectorAll('*').forEach((el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    const childRect = el.getBoundingClientRect();
    if (childRect.width <= 0 && childRect.height <= 0) return;
    contentHeight = Math.max(contentHeight, Math.ceil(childRect.bottom - rect.top + sheetEl.scrollTop));
    contentWidth = Math.max(contentWidth, Math.ceil(childRect.right - rect.left + sheetEl.scrollLeft));
  });
  const text = sheetEl.innerText || '';
  const images = Array.from(sheetEl.querySelectorAll('img'));
  const doc = sheetEl.ownerDocument;
  return {
    rect: {
      width: Math.round(rect.width * 100) / 100,
      height: Math.round(rect.height * 100) / 100,
      left: Math.round(rect.left * 100) / 100,
      top: Math.round(rect.top * 100) / 100,
    },
    contentWidth,
    contentHeight,
    scrollWidth: sheetEl.scrollWidth,
    scrollHeight: sheetEl.scrollHeight,
    textLength: text.length,
    textHash: localHashString(text),
    imageCount: images.length,
    pendingImageCount: images.filter((img) => !img.complete).length,
    fontStatus: doc.fonts?.status ?? 'unsupported',
    readyState: doc.readyState,
  };
}

function summarizeRenderStyles(sheetEl) {
  function localHashString(value) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }

  function isVisible(el) {
    if (!el) return false;
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
  }

  function firstVisible(selector) {
    return Array.from(sheetEl.querySelectorAll(selector)).find(isVisible) ?? null;
  }

  function firstVisibleContentRoot() {
    return Array.from(sheetEl.children).find((el) => {
      if (!isVisible(el)) return false;
      const tag = el.tagName.toLowerCase();
      return tag !== 'script' && tag !== 'style' && tag !== 'template';
    }) ?? null;
  }

  function summarize(el) {
    if (!el) return null;
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return {
      tag: el.tagName.toLowerCase(),
      className: typeof el.className === 'string' ? el.className.slice(0, 240) : '',
      display: cs.display,
      visibility: cs.visibility,
      position: cs.position,
      boxSizing: cs.boxSizing,
      width: cs.width,
      height: cs.height,
      rectWidth: Math.round(rect.width * 100) / 100,
      rectHeight: Math.round(rect.height * 100) / 100,
      margin: cs.margin,
      padding: cs.padding,
      borderWidth: cs.borderWidth,
      fontFamily: cs.fontFamily,
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      lineHeight: cs.lineHeight,
      letterSpacing: cs.letterSpacing,
      color: cs.color,
      backgroundColor: cs.backgroundColor,
      backgroundImage: cs.backgroundImage,
      backgroundRepeat: cs.backgroundRepeat,
      backgroundPosition: cs.backgroundPosition,
      backgroundSize: cs.backgroundSize,
      overflow: cs.overflow,
    };
  }

  function summarizeContentBox(el) {
    if (!el) return null;
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const borderX = parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
    const borderY = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
    const paddingX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    const paddingY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    return {
      tag: el.tagName.toLowerCase(),
      boxSizing: cs.boxSizing,
      cssWidth: cs.width,
      cssHeight: cs.height,
      rectWidth: Math.round(Math.max(0, rect.width - borderX - paddingX) * 100) / 100,
      rectHeight: Math.round(Math.max(0, rect.height - borderY - paddingY) * 100) / 100,
      borderWidth: cs.borderWidth,
      padding: cs.padding,
    };
  }

  const rootNode = sheetEl.getRootNode();
  const styleRoot = rootNode instanceof ShadowRoot ? rootNode : sheetEl.ownerDocument;
  const styleSources = Array.from(styleRoot.querySelectorAll('style')).map((style, index) => ({
    index,
    id: style.id || '',
    source: style.getAttribute('data-r20-style-source') || '',
    length: (style.textContent || '').length,
    hash: localHashString(style.textContent || ''),
  }));
  const bodyContainer = rootNode instanceof ShadowRoot
    ? sheetEl.closest('body[data-r20-shadow-body]')
    : sheetEl.ownerDocument.body;
  const rootRect = sheetEl.getBoundingClientRect();
  const geometry = [sheetEl, ...sheetEl.querySelectorAll('*')].map((el, index) => {
    if (!isVisible(el)) return null;
    const rect = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      index,
      tag: el.tagName.toLowerCase(),
      blockId: el.getAttribute('data-r20-block-id') || '',
      className: typeof el.className === 'string' ? el.className.slice(0, 180) : '',
      left: Math.round((rect.left - rootRect.left) * 100) / 100,
      top: Math.round((rect.top - rootRect.top) * 100) / 100,
      width: Math.round(rect.width * 100) / 100,
      height: Math.round(rect.height * 100) / 100,
      position: cs.position,
      transform: cs.transform,
      opacity: cs.opacity,
    };
  }).filter(Boolean);

  return {
    targets: {
      root: summarize(sheetEl),
      // Keep the Roll20 wrapper, its content box, and the first authored child
      // measurable as separate layers. The content box is the stable generic
      // canvas candidate; the child is diagnostic only for nested layouts.
      contentBox: summarizeContentBox(sheetEl),
      contentRoot: summarize(firstVisibleContentRoot()),
      dialog: summarize(sheetEl.closest('#dialog-window')),
      sheetform: summarize(sheetEl.closest('form.sheetform')),
      bodyContainer: summarize(bodyContainer),
      firstText: summarize(firstVisible('h1, h2, h3, h4, h5, h6, p, label, span, legend')),
      firstControl: summarize(firstVisible('input, select, textarea, button')),
      firstTable: summarize(firstVisible('table')),
      firstRollButton: summarize(firstVisible('button[type="roll"], button.roll')),
    },
    styleSources,
    geometry,
  };
}

async function waitForSheetAssets(sheet, timeoutMs = 8000) {
  return sheet.evaluate(async (sheetEl, limit) => {
    const startedAt = performance.now();
    const doc = sheetEl.ownerDocument;
    const cssImageUrls = new Set();
    const cssImagePattern = /url\(\s*(['"]?)(.*?)\1\s*\)/g;
    const addCssImageUrls = (value) => {
      if (!value || value === 'none') return;
      cssImagePattern.lastIndex = 0;
      for (const match of value.matchAll(cssImagePattern)) {
        const source = String(match[2] || '').trim();
        if (source && !source.startsWith('data:')) cssImageUrls.add(source);
      }
    };
    for (const el of [sheetEl, ...sheetEl.querySelectorAll('*')]) {
      const style = getComputedStyle(el);
      addCssImageUrls(style.backgroundImage);
      addCssImageUrls(style.maskImage);
      addCssImageUrls(style.listStyleImage);
    }
    const imagePromises = Array.from(sheetEl.querySelectorAll('img')).map((img) => {
      if (img.complete) return img.decode?.().catch(() => undefined) ?? Promise.resolve();
      return new Promise((resolve) => {
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', resolve, { once: true });
      });
    });
    const cssImagePromises = Array.from(cssImageUrls, (source) => new Promise((resolve) => {
      const img = new Image();
      img.addEventListener('load', resolve, { once: true });
      img.addEventListener('error', resolve, { once: true });
      img.src = source;
    }));
    const ready = Promise.all([
      doc.fonts?.ready?.catch?.(() => undefined) ?? Promise.resolve(),
      ...imagePromises,
      ...cssImagePromises,
    ]).then(() => 'ready');
    const timeout = new Promise((resolve) => setTimeout(() => resolve('timeout'), limit));
    const status = await Promise.race([ready, timeout]);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return {
      status,
      waitedMs: Math.round(performance.now() - startedAt),
      fontStatus: doc.fonts?.status ?? 'unsupported',
      pendingImageCount: Array.from(sheetEl.querySelectorAll('img')).filter((img) => !img.complete).length,
      cssImageCount: cssImageUrls.size,
    };
  }, timeoutMs);
}

async function waitForStableSheet(page, sheet, timeoutMs = 12000) {
  const assets = await waitForSheetAssets(sheet, Math.min(timeoutMs, 8000));
  const samples = [];
  let stableCount = 0;
  let previousKey = '';
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const sample = await sheet.evaluate(summarizeStableSheetState);
    const key = JSON.stringify([
      sample.rect.width,
      sample.rect.height,
      sample.contentWidth,
      sample.contentHeight,
      sample.scrollWidth,
      sample.scrollHeight,
      sample.textHash,
      sample.pendingImageCount,
      sample.fontStatus,
    ]);
    stableCount = key === previousKey ? stableCount + 1 : 1;
    previousKey = key;
    samples.push(sample);
    if (samples.length > 12) samples.shift();
    if (
      stableCount >= 5 &&
      Date.now() - startedAt >= 600 &&
      sample.pendingImageCount === 0 &&
      sample.fontStatus !== 'loading'
    ) {
      await page.waitForTimeout(250);
      return {
        status: 'stable',
        waitedMs: Date.now() - startedAt,
        stableCount,
        assets,
        final: await sheet.evaluate(summarizeStableSheetState),
        samples,
      };
    }
    await page.waitForTimeout(120);
  }
  return {
    status: 'timeout',
    waitedMs: Date.now() - startedAt,
    stableCount,
    assets,
    final: await sheet.evaluate(summarizeStableSheetState),
    samples,
  };
}

async function ensureSheetFitsViewport(page, sheet) {
  const before = page.viewportSize() ?? VIEWPORT;
  const box = await sheet.boundingBox();
  if (!box) return { status: 'missing-box', before, after: before };
  const requiredHeight = Math.min(20000, Math.max(before.height, Math.ceil(box.y + box.height + 200)));
  if (requiredHeight > before.height) {
    await page.setViewportSize({ width: before.width, height: requiredHeight });
    await page.waitForTimeout(100);
  }
  return {
    status: requiredHeight > before.height ? 'expanded' : 'unchanged',
    before,
    after: page.viewportSize() ?? before,
    sheetBox: box,
  };
}

async function settleSheetForCapture(page, sheet) {
  const initialFit = await ensureSheetFitsViewport(page, sheet);
  let stability = await waitForStableSheet(page, sheet);
  const finalFit = await ensureSheetFitsViewport(page, sheet);
  if (finalFit.status === 'expanded') {
    stability = await waitForStableSheet(page, sheet);
  }
  return { initialFit, finalFit, stability };
}

function summarizeSheetSignature(sheetEl) {
  function localHashString(value) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }

  const nodes = [sheetEl, ...sheetEl.querySelectorAll('*')];
  const tagCounts = {};
  const controlNames = {};
  const blockIds = [];
  const sequence = [];
  let visibleRuntimeNodeCount = 0;
  for (const el of nodes) {
    const tag = el.tagName.toLowerCase();
    tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
    const name = el.getAttribute('name');
    const type = el.getAttribute('type');
    if (name && ['input', 'button', 'select', 'textarea'].includes(tag)) {
      const key = `${tag}:${type ?? ''}:${name}`;
      controlNames[key] = (controlNames[key] ?? 0) + 1;
    }
    const blockId = el.getAttribute('data-r20-block-id');
    if (blockId) blockIds.push(blockId);
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const visible = cs.display !== 'none' && cs.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    if (visible && (tag === 'script' || tag === 'rolltemplate')) visibleRuntimeNodeCount += 1;
    if (sequence.length < 120) {
      sequence.push([
        tag,
        type ?? '',
        name ?? '',
        blockId ? 'block' : '',
        visible ? 'visible' : 'hidden',
      ].join('|'));
    }
  }
  return {
    nodeCount: nodes.length,
    blockIdCount: blockIds.length,
    uniqueBlockIdCount: new Set(blockIds).size,
    tagCounts,
    controlNames,
    sequenceHash: localHashString(sequence.join('\n')),
    visibleRuntimeNodeCount,
  };
}

function summarizeRenderDiagnostics(sheetEl) {
  const rollButtons = Array.from(sheetEl.querySelectorAll('button[type="roll"], button.roll'))
    .slice(0, 8)
    .map((el) => {
      const cs = getComputedStyle(el);
      const before = getComputedStyle(el, '::before');
      const rect = el.getBoundingClientRect();
      return {
        text: (el.textContent || '').trim(),
        beforeContent: before.content,
        fontFamily: cs.fontFamily,
        beforeFontFamily: before.fontFamily,
        color: cs.color,
        beforeColor: before.color,
        fontSize: cs.fontSize,
        beforeFontSize: before.fontSize,
        textIndent: cs.textIndent,
        overflow: cs.overflow,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    });
  return {
    rollButtonCount: sheetEl.querySelectorAll('button[type="roll"], button.roll').length,
    rollButtons,
  };
}

function summarizeTranslationState(sheetEl, rawI18n) {
  const text = String(rawI18n || '').trim();
  const translations = {};
  let parseError = '';
  if (text) {
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        Object.entries(parsed).forEach(([key, value]) => {
          if (value != null) translations[key] = String(value);
        });
      }
    } catch {
      const re = /<!--\s*i18n(?:\[[^\]]+\])?\s+("(?:\\.|[^"\\])*")\s*:\s*("(?:\\.|[^"\\])*")\s*-->/g;
      let match;
      while ((match = re.exec(text))) {
        try {
          translations[JSON.parse(match[1])] = String(JSON.parse(match[2]));
        } catch {}
      }
      if (Object.keys(translations).length === 0) parseError = 'unsupported translation format';
    }
  }

  const mismatches = [];
  const hiddenMismatches = [];
  let applicableCount = 0;
  let matchedCount = 0;
  let visibleApplicableCount = 0;
  let visibleMatchedCount = 0;
  let unknownKeyCount = 0;
  const specs = [
    ['data-i18n', 'textContent'],
    ['data-i18n-title', 'title'],
    ['data-i18n-alt', 'alt'],
    ['data-i18n-placeholder', 'placeholder'],
    ['data-i18n-aria-label', 'aria-label'],
    ['data-i18n-label', 'label'],
  ];
  for (const [source, target] of specs) {
    sheetEl.querySelectorAll(`[${source}]`).forEach((el) => {
      const key = el.getAttribute(source) || '';
      if (!(key in translations)) {
        unknownKeyCount += 1;
        return;
      }
      applicableCount += 1;
      const cs = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const visible = cs.display !== 'none' && cs.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      if (visible) visibleApplicableCount += 1;
      const actual = target === 'textContent'
        ? String(el.textContent || '')
        : String(el.getAttribute(target) || '');
      const expected = translations[key];
      if (actual === expected) {
        matchedCount += 1;
        if (visible) visibleMatchedCount += 1;
      } else {
        const mismatch = { source, target, key, expected, actual: actual.slice(0, 200) };
        if (visible && mismatches.length < 12) mismatches.push(mismatch);
        if (!visible && hiddenMismatches.length < 12) hiddenMismatches.push(mismatch);
      }
    });
  }
  const mismatchCount = applicableCount - matchedCount;
  const visibleMismatchCount = visibleApplicableCount - visibleMatchedCount;
  return {
    sourceBytes: text.length,
    parsedKeyCount: Object.keys(translations).length,
    applicableCount,
    matchedCount,
    mismatchCount,
    visibleApplicableCount,
    visibleMatchedCount,
    visibleMismatchCount,
    unknownKeyCount,
    parseError,
    mismatches,
    hiddenMismatches,
    pass: !parseError && (visibleApplicableCount === 0 || visibleMismatchCount === 0),
  };
}

async function summarizeEditCanvasLayout(page, iframe, sheet) {
  const iframeBox = await iframe.boundingBox();
  const sheetState = await sheet.evaluate(summarizeStableSheetState);
  if (!iframeBox || !sheetState) return { status: 'missing' };
  return {
    status: 'ok',
    hostHeight: Math.round(iframeBox.height),
    rootHeight: Math.round(sheetState.rect.height),
    contentHeight: Math.round(sheetState.contentHeight),
    hostContentDelta: Math.round(iframeBox.height - sheetState.contentHeight),
  };
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

function classifyExpectedConsoleErrors(events, compatibilityMode) {
  if (compatibilityMode !== 'legacy') return { expected: [], unexpected: events };
  const expected = [];
  const unexpected = [];
  for (const event of events || []) {
    const message = event.text || '';
    const sourceUrl = event.url || '';
    if (
      message.includes("Access to font at 'https://imgsrv.roll20.net/?src=")
      && message.includes('blocked by CORS policy')
    ) {
      expected.push(event);
      continue;
    }
    if (
      message === 'Failed to load resource: net::ERR_FAILED'
      && sourceUrl.startsWith('https://imgsrv.roll20.net/?src=')
    ) {
      expected.push(event);
      continue;
    }
    unexpected.push(event);
  }
  return { expected, unexpected };
}

async function collectAppOcclusion(page, sheetBox) {
  if (!sheetBox) return [];
  return page.evaluate((box) => {
    const target = {
      left: box.x,
      top: box.y,
      right: box.x + box.width,
      bottom: box.y + box.height,
    };
    const selectors = ['[data-testid="preview-toolbar"]'];
    const out = [];
    for (const selector of selectors) {
      document.querySelectorAll(selector).forEach((el) => {
        const rect = el.getBoundingClientRect();
        const left = Math.max(target.left, rect.left);
        const top = Math.max(target.top, rect.top);
        const right = Math.min(target.right, rect.right);
        const bottom = Math.min(target.bottom, rect.bottom);
        const width = Math.max(0, right - left);
        const height = Math.max(0, bottom - top);
        if (width <= 0 || height <= 0) return;
        out.push({
          selector,
          rect: {
            left: Math.round(rect.left),
            top: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          },
          overlap: {
            left: Math.round(left),
            top: Math.round(top),
            width: Math.round(width),
            height: Math.round(height),
          },
          overlapPixels: Math.round(width * height),
        });
      });
    }
    return out;
  }, sheetBox);
}

async function withHiddenAppChrome(page, fn) {
  await page.evaluate(() => {
    document.querySelectorAll('[data-testid="preview-toolbar"]').forEach((el) => {
      el.setAttribute('data-r20-smoke-hidden', el.style.visibility || '');
      el.style.visibility = 'hidden';
    });
  });
  try {
    return await fn();
  } finally {
    await page.evaluate(() => {
      document.querySelectorAll('[data-r20-smoke-hidden]').forEach((el) => {
        const prev = el.getAttribute('data-r20-smoke-hidden') || '';
        el.style.visibility = prev;
        el.removeAttribute('data-r20-smoke-hidden');
      });
    });
  }
}

async function withHiddenEditOverlays(page, fn) {
  await page.evaluate(() => {
    document.querySelectorAll('[data-testid="iframe-edit-overlay"], [data-testid="iframe-edit-drop-overlay"]').forEach((el) => {
      el.setAttribute('data-r20-smoke-overlay-visibility', el.style.visibility || '');
      el.style.visibility = 'hidden';
    });
  });
  try {
    return await fn();
  } finally {
    await page.evaluate(() => {
      document.querySelectorAll('[data-r20-smoke-overlay-visibility]').forEach((el) => {
        const previous = el.getAttribute('data-r20-smoke-overlay-visibility') || '';
        el.style.visibility = previous;
        el.removeAttribute('data-r20-smoke-overlay-visibility');
      });
    });
  }
}

async function summarizeEditOverlay(page) {
  return page.evaluate(() => ({
    status: 'parent-owned',
    droppableCount: 0,
    selectedCount: document.querySelectorAll('[data-testid="iframe-edit-overlay"]').length,
    activeDropTargetCount: document.querySelectorAll('[data-testid="iframe-edit-drop-overlay"]').length,
    overlayMarkerCount: document.querySelectorAll('[data-testid="iframe-edit-overlay"], [data-testid="iframe-edit-drop-overlay"]').length,
  }));
}

async function capturePreview(page, fixtureId, i18n) {
  await page.evaluate(() => {
    window.__perfHook.setPreviewZoom(1);
    window.__perfHook.setPreviewRenderMode('iframe');
    window.__perfHook.setMainMode('preview');
  });
  const frame = page.frameLocator('iframe[title]').first();
  const sheet = frame.locator('.charactersheet.charsheet').first();
  await sheet.waitFor({ state: 'visible', timeout: 30000 });
  const settled = await settleSheetForCapture(page, sheet);
  const output = path.join(REPORT_DIR, 'screenshots', `${fixtureId}-preview.png`);
  const box = await sheet.boundingBox();
  const dom = await sheet.evaluate(summarizeSheetElement);
  const diagnostics = await sheet.evaluate(summarizeRenderDiagnostics);
  const translations = await sheet.evaluate(summarizeTranslationState, i18n);
  const styles = await sheet.evaluate(summarizeRenderStyles);
  const signature = await sheet.evaluate(summarizeSheetSignature);
  const appOcclusion = await collectAppOcclusion(page, box);
  await withHiddenAppChrome(page, () => sheet.screenshot({ path: output }));
  return {
    path: output,
    box,
    dom,
    diagnostics,
    translations,
    styles,
    signature,
    appOcclusion,
    stability: settled.stability,
    viewportFit: { initial: settled.initialFit, final: settled.finalFit },
  };
}

async function captureEdit(page, fixtureId, i18n) {
  await page.evaluate(() => {
    window.__perfHook.setPreviewZoom(1);
    window.__perfHook.setPreviewRenderMode('iframe');
    window.__perfHook.setMainMode('edit');
  });
  const iframe = page.locator('[data-testid="preview-iframe"]').first();
  await iframe.waitFor({ state: 'visible', timeout: 30000 });
  const frame = page.frameLocator('[data-testid="preview-iframe"]').first();
  const sheet = frame.locator('.charactersheet.charsheet').first();
  await sheet.waitFor({ state: 'visible', timeout: 30000 });
  const output = path.join(REPORT_DIR, 'screenshots', `${fixtureId}-edit.png`);
  const overlayOutput = path.join(REPORT_DIR, 'screenshots', `${fixtureId}-edit-overlay.png`);
  const settled = await settleSheetForCapture(page, sheet);
  const box = await sheet.boundingBox();
  const dom = await sheet.evaluate(summarizeSheetElement);
  const diagnostics = await sheet.evaluate(summarizeRenderDiagnostics);
  const translations = await sheet.evaluate(summarizeTranslationState, i18n);
  const styles = await sheet.evaluate(summarizeRenderStyles);
  const signature = await sheet.evaluate(summarizeSheetSignature);
  const appOcclusion = await collectAppOcclusion(page, box);
  const layout = await summarizeEditCanvasLayout(page, iframe, sheet);
  const overlay = await summarizeEditOverlay(page);
  const iframeBox = await iframe.boundingBox();
  await withHiddenAppChrome(page, async () => {
    if (iframeBox) await page.screenshot({ path: overlayOutput, clip: iframeBox });
  });
  await withHiddenEditOverlays(page, () => withHiddenAppChrome(page, () => sheet.screenshot({ path: output })));
  return {
    path: output,
    overlayPath: overlayOutput,
    box,
    dom,
    diagnostics,
    translations,
    styles,
    signature,
    appOcclusion,
    layout,
    stability: settled.stability,
    viewportFit: { initial: settled.initialFit, final: settled.finalFit },
    overlay,
  };
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
      let maxChannelDelta = 0;
      let maxPixelDelta = 0;
      const total = width * height;
      const bounds = { left: width, top: height, right: -1, bottom: -1 };
      const quadrants = {
        topLeft: 0,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0,
      };
      for (let i = 0; i < aData.length; i += 4) {
        const dr = Math.abs(aData[i] - bData[i]);
        const dg = Math.abs(aData[i + 1] - bData[i + 1]);
        const db = Math.abs(aData[i + 2] - bData[i + 2]);
        const da = Math.abs(aData[i + 3] - bData[i + 3]);
        const delta = dr + dg + db + da;
        maxChannelDelta = Math.max(maxChannelDelta, dr, dg, db, da);
        maxPixelDelta = Math.max(maxPixelDelta, delta);
        sumAbs += delta;
        if (delta > 24) {
          mismatch += 1;
          const px = (i / 4) % width;
          const py = Math.floor(i / 4 / width);
          bounds.left = Math.min(bounds.left, px);
          bounds.top = Math.min(bounds.top, py);
          bounds.right = Math.max(bounds.right, px);
          bounds.bottom = Math.max(bounds.bottom, py);
          const horizontal = px < width / 2 ? 'Left' : 'Right';
          const vertical = py < height / 2 ? 'top' : 'bottom';
          quadrants[`${vertical}${horizontal}`] += 1;
        }
      }
      const dominantQuadrant = Object.entries(quadrants).sort((aEntry, bEntry) => bEntry[1] - aEntry[1])[0]?.[0] ?? null;
      return {
        previewSize: { width: a.naturalWidth, height: a.naturalHeight },
        editSize: { width: b.naturalWidth, height: b.naturalHeight },
        crop: { width, height },
        mismatchPixels: mismatch,
        mismatchPct: total > 0 ? Math.round((mismatch / total) * 10000) / 100 : null,
        mismatchPpm: total > 0 ? Math.round((mismatch / total) * 100000000) / 100 : null,
        meanAbsChannelDelta: total > 0 ? Math.round((sumAbs / (total * 4)) * 100) / 100 : null,
        maxChannelDelta,
        maxPixelDelta,
        mismatchBounds:
          mismatch > 0
            ? {
                left: bounds.left,
                top: bounds.top,
                width: bounds.right - bounds.left + 1,
                height: bounds.bottom - bounds.top + 1,
              }
            : null,
        quadrants,
        dominantQuadrant,
      };
    },
    {
      previewDataUrl: `data:image/png;base64,${previewBytes.toString('base64')}`,
      editDataUrl: `data:image/png;base64,${editBytes.toString('base64')}`,
    },
  );
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
    compatibilityModes: COMPATIBILITY_MODES,
    fixtures: [],
  };

  for (const fixture of fixtures) {
    for (const compatibilityMode of COMPATIBILITY_MODES) {
    const page = await browser.newPage({ viewport: VIEWPORT });
    const consoleErrors = [];
    const pageErrors = [];
    const resourceIssues = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          text: msg.text().slice(0, 500),
          url: msg.location().url || '',
        });
      }
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

    const captureId = COMPATIBILITY_MODES.length > 1
      ? `${fixture.id}-${compatibilityMode}`
      : fixture.id;
    const entry = { id: fixture.id, compatibilityMode, pass: false };
    try {
      await page.goto(`http://127.0.0.1:${PORT}${BASE_PATH}/`, { waitUntil: 'load' });
      await warmPerfHook(page);
      entry.import = await waitForLiveImport(page, fixture);
      await page.evaluate((mode) => window.__perfHook.setRoll20CompatibilityMode(mode), compatibilityMode);
      entry.previewCapture = await capturePreview(page, captureId, fixture.i18n);
      entry.previewDom = entry.previewCapture.dom;
      entry.previewDiagnostics = entry.previewCapture.diagnostics;
      entry.previewTranslations = entry.previewCapture.translations;
      entry.previewStyles = entry.previewCapture.styles;
      entry.previewStability = entry.previewCapture.stability;
      entry.previewViewportFit = entry.previewCapture.viewportFit;
      entry.previewSignature = entry.previewCapture.signature;
      entry.previewAppOcclusion = entry.previewCapture.appOcclusion;
      entry.editCapture = await captureEdit(page, captureId, fixture.i18n);
      entry.editDom = entry.editCapture.dom;
      entry.editDiagnostics = entry.editCapture.diagnostics;
      entry.editTranslations = entry.editCapture.translations;
      entry.editStyles = entry.editCapture.styles;
      entry.editStability = entry.editCapture.stability;
      entry.editViewportFit = entry.editCapture.viewportFit;
      entry.editOverlay = entry.editCapture.overlay;
      entry.editSignature = entry.editCapture.signature;
      entry.domSignatureParity = compareSheetSignatures(entry.previewSignature, entry.editSignature);
      entry.computedStyleParity = compareRenderStyles(entry.previewStyles, entry.editStyles);
      entry.geometryParity = compareRenderGeometry(entry.previewStyles, entry.editStyles);
      entry.editAppOcclusion = entry.editCapture.appOcclusion;
      entry.editLayout = entry.editCapture.layout;
      entry.diff = await diffPngs(page, entry.previewCapture.path, entry.editCapture.path);
      entry.pixelParity = classifyPixelParity(
        entry.diff,
        entry.computedStyleParity,
        entry.geometryParity,
      );
      const consoleErrorClassification = classifyExpectedConsoleErrors(consoleErrors, compatibilityMode);
      entry.expectedConsoleErrors = consoleErrorClassification.expected;
      entry.unexpectedConsoleErrors = consoleErrorClassification.unexpected;
      entry.pass =
        entry.import?.blockCount > 0 &&
        entry.previewDom.status === 'ok' &&
        entry.editDom.status === 'ok' &&
        entry.editLayout?.status === 'ok' &&
        entry.editLayout.hostHeight >= entry.editLayout.contentHeight &&
        Math.abs(entry.editLayout.hostContentDelta) <= 24 &&
        entry.previewStability?.status === 'stable' &&
        entry.editStability?.status === 'stable' &&
        entry.domSignatureParity.pass &&
        entry.computedStyleParity.pass &&
        entry.geometryParity.pass &&
        entry.pixelParity.pass &&
        entry.previewTranslations.pass &&
        entry.editTranslations.pass &&
        consoleErrorClassification.unexpected.length === 0 &&
        pageErrors.length === 0;
    } catch (err) {
      entry.error = String(err?.stack || err).slice(0, 1200);
    }
    entry.consoleErrors = consoleErrors;
    entry.pageErrors = pageErrors;
    entry.resourceIssues = summarizeResourceIssues(resourceIssues);
    report.fixtures.push(entry);
    console.log(
      `${entry.pass ? 'PASS' : 'FAIL'} ${fixture.id} ` +
      `mode=${compatibilityMode} ` +
      `mismatch=${entry.diff?.mismatchPct ?? 'n/a'}% ` +
      `pixels=${entry.diff?.mismatchPixels ?? 'n/a'} ppm=${entry.diff?.mismatchPpm ?? 'n/a'} ` +
      `parity=${entry.pixelParity?.status ?? 'n/a'} ` +
      `i18n=${entry.previewTranslations?.visibleMatchedCount ?? 'n/a'}/${entry.previewTranslations?.visibleApplicableCount ?? 'n/a'}`,
    );
    await page.close();
    }
  }

  report.finishedAt = new Date().toISOString();
  report.pass = report.fixtures.every((fixture) => fixture.pass);

  await fs.writeFile(
    path.join(REPORT_DIR, 'preview-edit-visual-results.json'),
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8',
  );
  await fs.writeFile(
    path.join(REPORT_DIR, 'preview-edit-visual-results.md'),
    renderMarkdown(report),
    'utf8',
  );

  await browser.close();
  server.close();
  console.log(report.pass ? 'PREVIEW/EDIT VISUAL SMOKE PASS' : 'PREVIEW/EDIT VISUAL SMOKE FAIL');
  process.exitCode = report.pass ? 0 : 1;
}

function compareSheetSignatures(preview, edit) {
  const failures = [];
  if (!preview || !edit) {
    failures.push('missing signature');
  } else {
    if (preview.nodeCount !== edit.nodeCount) failures.push(`nodeCount ${preview.nodeCount} != ${edit.nodeCount}`);
    if (preview.blockIdCount !== edit.blockIdCount) failures.push(`blockIdCount ${preview.blockIdCount} != ${edit.blockIdCount}`);
    if (preview.uniqueBlockIdCount !== edit.uniqueBlockIdCount) {
      failures.push(`uniqueBlockIdCount ${preview.uniqueBlockIdCount} != ${edit.uniqueBlockIdCount}`);
    }
    if (preview.sequenceHash !== edit.sequenceHash) failures.push(`sequenceHash ${preview.sequenceHash} != ${edit.sequenceHash}`);
    if (preview.visibleRuntimeNodeCount !== 0 || edit.visibleRuntimeNodeCount !== 0) {
      failures.push(`visible runtime nodes preview=${preview.visibleRuntimeNodeCount} edit=${edit.visibleRuntimeNodeCount}`);
    }
    const tagDiff = compareCountMaps(preview.tagCounts, edit.tagCounts, 'tag');
    const controlDiff = compareCountMaps(preview.controlNames, edit.controlNames, 'control');
    failures.push(...tagDiff, ...controlDiff);
  }
  return { pass: failures.length === 0, failures };
}

function compareCountMaps(a = {}, b = {}, label) {
  const failures = [];
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of Array.from(keys).sort()) {
    if ((a[key] ?? 0) !== (b[key] ?? 0)) {
      failures.push(`${label}:${key} ${a[key] ?? 0} != ${b[key] ?? 0}`);
    }
  }
  return failures;
}

function compareRenderStyles(preview, edit) {
  const differences = [];
  const targetNames = new Set([
    ...Object.keys(preview?.targets ?? {}),
    ...Object.keys(edit?.targets ?? {}),
  ]);
  const properties = [
    'tag',
    'display',
    'visibility',
    'position',
    'boxSizing',
    'width',
    'height',
    'rectWidth',
    'rectHeight',
    'margin',
    'padding',
    'borderWidth',
    'fontFamily',
    'fontSize',
    'fontWeight',
    'lineHeight',
    'letterSpacing',
    'color',
    'backgroundColor',
    'backgroundImage',
    'backgroundRepeat',
    'backgroundPosition',
    'backgroundSize',
    'overflow',
  ];

  for (const target of Array.from(targetNames).sort()) {
    const a = preview?.targets?.[target] ?? null;
    const b = edit?.targets?.[target] ?? null;
    if (!a || !b) {
      if (a || b) differences.push({ target, property: 'presence', preview: Boolean(a), edit: Boolean(b) });
      continue;
    }
    for (const property of properties) {
      const av = a[property];
      const bv = b[property];
      const bothNumbers = typeof av === 'number' && typeof bv === 'number';
      const equal = bothNumbers ? Math.abs(av - bv) <= 0.5 : av === bv;
      if (!equal) differences.push({ target, property, preview: av, edit: bv });
    }
  }

  return {
    pass: differences.length === 0,
    differenceCount: differences.length,
    differences,
  };
}

function classifyPixelParity(diff, computedStyleParity, geometryParity) {
  if (!diff) return { pass: false, status: 'MISSING_DIFF' };
  if (diff.mismatchPixels === 0) return { pass: true, status: 'EXACT' };
  const rasterTolerancePass =
    computedStyleParity?.pass === true &&
    geometryParity?.pass === true &&
    diff.mismatchPpm <= 10 &&
    diff.maxChannelDelta <= 16;
  return {
    pass: rasterTolerancePass,
    status: rasterTolerancePass ? 'RASTER_TOLERANCE' : 'MISMATCH',
    limits: {
      mismatchPpm: 10,
      maxChannelDelta: 16,
    },
  };
}

function compareRenderGeometry(preview, edit) {
  const differences = [];
  const previewByIndex = new Map((preview?.geometry ?? []).map((item) => [item.index, item]));
  const editByIndex = new Map((edit?.geometry ?? []).map((item) => [item.index, item]));
  const indexes = new Set([...previewByIndex.keys(), ...editByIndex.keys()]);
  const numericProperties = ['left', 'top', 'width', 'height'];
  const stringProperties = ['tag', 'position', 'transform', 'opacity'];
  for (const index of Array.from(indexes).sort((a, b) => a - b)) {
    const a = previewByIndex.get(index);
    const b = editByIndex.get(index);
    if (!a || !b) {
      differences.push({ index, property: 'visibility', preview: a ?? null, edit: b ?? null });
      continue;
    }
    for (const property of numericProperties) {
      if (Math.abs(a[property] - b[property]) > 0.5) {
        differences.push({
          index,
          tag: a.tag,
          blockId: a.blockId || b.blockId,
          className: a.className || b.className,
          property,
          preview: a[property],
          edit: b[property],
        });
      }
    }
    for (const property of stringProperties) {
      if (a[property] !== b[property]) {
        differences.push({
          index,
          tag: a.tag,
          blockId: a.blockId || b.blockId,
          className: a.className || b.className,
          property,
          preview: a[property],
          edit: b[property],
        });
      }
    }
  }
  return {
    pass: differences.length === 0,
    previewVisibleCount: previewByIndex.size,
    editVisibleCount: editByIndex.size,
    differenceCount: differences.length,
    differences,
  };
}

function renderMarkdown(report) {
  const lines = [
    '# Preview/Edit Visual Smoke',
    '',
    `Generated: ${report.finishedAt ?? report.startedAt}`,
    '',
    'Scope: local static app, real browser import path, and one persistent preview/edit iframe screenshot. This does not prove actual Roll20 visual parity.',
    '',
    '| Fixture | Mode | Blocks | Preview size | Edit size | Crop | Pixel parity | Mismatch pixels | PPM | Max channel | Bounds | Mean delta | Console errors | Page errors |',
    '| --- | --- | ---: | --- | --- | --- | --- | ---: | ---: | ---: | --- | ---: | ---: | ---: |',
  ];
  for (const item of report.fixtures) {
    const d = item.diff ?? {};
    lines.push(
      `| \`${item.id}\` | ${item.compatibilityMode ?? 'modern'} | ${item.import?.blockCount ?? ''} | ${fmtSize(d.previewSize)} | ${fmtSize(d.editSize)} | ${fmtSize(d.crop)} | ${item.pixelParity?.status ?? ''} | ${d.mismatchPixels ?? ''} | ${d.mismatchPpm ?? ''} | ${d.maxChannelDelta ?? ''} | ${fmtBounds(d.mismatchBounds)} | ${d.meanAbsChannelDelta ?? ''} | ${item.consoleErrors?.length ?? 0} | ${item.pageErrors?.length ?? 0} |`,
    );
  }
  lines.push('');
  lines.push('Notes:');
  lines.push('- PASS requires stable preview/edit roots, matching DOM signatures, 0 sampled computed-style differences, and 0 visible-geometry differences after edit-only overlays are disabled.');
  lines.push('- In legacy mode, the known Roll20 font-proxy CORS pair is retained as expected evidence; only unrelated console errors fail the gate.');
  lines.push('- Pixel parity is `EXACT` at 0 mismatched pixels. `RASTER_TOLERANCE` is limited to 10 ppm and max channel delta 16 when style and geometry are exact; the exact pixel count remains visible and is not rounded away.');
  lines.push('- This is a local preview/edit render-unification gate. It is not actual Roll20 visual parity evidence.');
  lines.push('- Bounds and dominant area are coarse triage hints for locating remaining preview/edit differences.');
  lines.push(`- Browser viewport starts at ${VIEWPORT.width}x${VIEWPORT.height} and expands vertically so full-sheet element screenshots do not cross the viewport stitching boundary.`);
  lines.push('- Screenshots are local-only and ignored by Git.');
  lines.push('- App chrome is hidden only during root screenshots; toolbar overlap is still measured separately.');
  lines.push('');
  lines.push('## DOM Signature Parity');
  lines.push('');
  lines.push('| Fixture | Status | Preview nodes | Edit nodes | Preview blocks | Edit blocks | Sequence hash | Visible runtime nodes | Failures |');
  lines.push('| --- | --- | ---: | ---: | ---: | ---: | --- | ---: | --- |');
  for (const item of report.fixtures) {
    const parity = item.domSignatureParity;
    lines.push(
      `| \`${item.id}\` | ${parity?.pass ? 'PASS' : 'FAIL'} | ${item.previewSignature?.nodeCount ?? ''} | ${item.editSignature?.nodeCount ?? ''} | ${item.previewSignature?.blockIdCount ?? ''} | ${item.editSignature?.blockIdCount ?? ''} | ${item.previewSignature?.sequenceHash ?? ''}/${item.editSignature?.sequenceHash ?? ''} | ${(item.previewSignature?.visibleRuntimeNodeCount ?? 0) + (item.editSignature?.visibleRuntimeNodeCount ?? 0)} | ${fmtFailures(parity?.failures)} |`,
    );
  }
  lines.push('');
  lines.push('## Edit Canvas Height Diagnostics');
  lines.push('');
  lines.push('| Fixture | Host height | Root height | Content height | Host-content delta |');
  lines.push('| --- | ---: | ---: | ---: | ---: |');
  for (const item of report.fixtures) {
    const l = item.editLayout ?? {};
    lines.push(`| \`${item.id}\` | ${l.hostHeight ?? ''} | ${l.rootHeight ?? ''} | ${l.contentHeight ?? ''} | ${l.hostContentDelta ?? ''} |`);
  }
  lines.push('');
  lines.push('## Render Stability');
  lines.push('');
  lines.push('| Fixture | Preview | Edit | Preview text hash | Edit text hash | Preview viewport | Edit viewport | Preview assets | Edit assets |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const item of report.fixtures) {
    const p = item.previewStability ?? {};
    const e = item.editStability ?? {};
    lines.push(
      `| \`${item.id}\` | ${fmtStability(p)} | ${fmtStability(e)} | ${p.final?.textHash ?? ''} | ${e.final?.textHash ?? ''} | ${fmtViewportFit(item.previewViewportFit)} | ${fmtViewportFit(item.editViewportFit)} | ${fmtAssets(p.assets)} | ${fmtAssets(e.assets)} |`,
    );
  }
  lines.push('');
  lines.push('## Computed Style Parity');
  lines.push('');
  lines.push('| Fixture | Status | Differences | First differences | Preview style sources | Edit style sources |');
  lines.push('| --- | --- | ---: | --- | ---: | ---: |');
  for (const item of report.fixtures) {
    const parity = item.computedStyleParity ?? {};
    lines.push(
      `| \`${item.id}\` | ${parity.pass ? 'PASS' : 'DIFF'} | ${parity.differenceCount ?? ''} | ${fmtStyleDifferences(parity.differences)} | ${item.previewStyles?.styleSources?.length ?? ''} | ${item.editStyles?.styleSources?.length ?? ''} |`,
    );
  }
  lines.push('');
  lines.push('## Geometry Parity');
  lines.push('');
  lines.push('| Fixture | Status | Preview visible | Edit visible | Differences | First differences |');
  lines.push('| --- | --- | ---: | ---: | ---: | --- |');
  for (const item of report.fixtures) {
    const parity = item.geometryParity ?? {};
    lines.push(
      `| \`${item.id}\` | ${parity.pass ? 'PASS' : 'DIFF'} | ${parity.previewVisibleCount ?? ''} | ${parity.editVisibleCount ?? ''} | ${parity.differenceCount ?? ''} | ${fmtGeometryDifferences(parity.differences)} |`,
    );
  }
  lines.push('');
  lines.push('## Edit Overlay Diagnostics');
  lines.push('');
  lines.push('| Fixture | Droppable containers | Selected | Active target | Overlay markers | Parity capture behavior |');
  lines.push('| --- | ---: | ---: | ---: | ---: | --- |');
  for (const item of report.fixtures) {
    const overlay = item.editOverlay ?? {};
    lines.push(
      `| \`${item.id}\` | ${overlay.droppableCount ?? ''} | ${overlay.selectedCount ?? ''} | ${overlay.activeDropTargetCount ?? ''} | ${overlay.overlayMarkerCount ?? ''} | overlay screenshot retained; overlay-only paint hidden for preview/edit diff |`,
    );
  }
  lines.push('');
  lines.push('## Render Diagnostics');
  lines.push('');
  lines.push('| Fixture | Preview roll buttons | Edit roll buttons | Preview toolbar overlap | Edit toolbar overlap |');
  lines.push('| --- | ---: | ---: | ---: | ---: |');
  for (const item of report.fixtures) {
    lines.push(
      `| \`${item.id}\` | ${item.previewDiagnostics?.rollButtonCount ?? ''} | ${item.editDiagnostics?.rollButtonCount ?? ''} | ${sumOverlap(item.previewAppOcclusion)} | ${sumOverlap(item.editAppOcclusion)} |`,
    );
  }
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

function fmtSize(size) {
  if (!size) return '';
  return `${size.width}x${size.height}`;
}

function fmtBounds(bounds) {
  if (!bounds) return '';
  return `${bounds.left},${bounds.top} ${bounds.width}x${bounds.height}`;
}

function sumOverlap(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, item) => sum + (item.overlapPixels ?? 0), 0);
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

function fmtFailures(items) {
  if (!Array.isArray(items) || items.length === 0) return '';
  return items.slice(0, 4).join('<br>');
}

function fmtStability(stability) {
  if (!stability?.status) return '';
  return `${stability.status} ${stability.waitedMs ?? 0}ms (${stability.stableCount ?? 0})`;
}

function fmtAssets(assets) {
  if (!assets) return '';
  return `${assets.status ?? ''} ${assets.waitedMs ?? 0}ms; fonts=${assets.fontStatus ?? ''}; pending=${assets.pendingImageCount ?? ''}`;
}

function fmtViewportFit(viewportFit) {
  if (!viewportFit) return '';
  const initial = viewportFit.initial ?? viewportFit;
  const final = viewportFit.final ?? viewportFit;
  const before = initial.before;
  const after = final.after ?? initial.after;
  if (!before || !after) return final.status ?? initial.status ?? '';
  return `${before.width}x${before.height} -> ${after.width}x${after.height}`;
}

function fmtStyleDifferences(items) {
  if (!Array.isArray(items) || items.length === 0) return '';
  return items
    .slice(0, 6)
    .map((item) => `${item.target}.${item.property}: ${String(item.preview)} -> ${String(item.edit)}`)
    .join('<br>');
}

function fmtGeometryDifferences(items) {
  if (!Array.isArray(items) || items.length === 0) return '';
  return items
    .slice(0, 6)
    .map((item) => `#${item.index} ${item.tag ?? ''}.${item.property}: ${String(item.preview)} -> ${String(item.edit)}`)
    .join('<br>');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
