#!/usr/bin/env node
/**
 * Imported-fixture visual smoke for the local Roll20 compatibility mode.
 *
 * Imports ignored fixture source through the static app, captures the preview
 * iframe in modern and legacy modes. The mode switch uses the same atomic
 * HTML-prefix + CSS-sanitize action as the mounted product UI. Screenshots and
 * reports are local-only. This does not prove actual Roll20 visual parity.
 *
 * Usage:
 *   node scripts/roll20_legacy_fixture_visual_smoke.mjs \
 *     --out-dir ./out --base-path /roll20-block-editor \
 *     --fixtures test-fixtures/visual --report-dir reports/legacy-fixture-visual
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
const REPORT_DIR = path.resolve(argOf('--report-dir', 'reports/legacy-fixture-visual'));
const ONLY = argOf('--only', '');
const PORT = Number(argOf('--port', '4194'));
const VIEWPORT = { width: 2200, height: 1200 };

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

function countMatches(css, re) {
  return css.match(re)?.length ?? 0;
}

function countLegacyRisks(css) {
  const risk = {
    transform: countMatches(css, /(?:^|[;{\s])transform\s*:/gi),
    animation: countMatches(css, /(?:^|[;{\s])animation(?:-[a-z-]+)?\s*:/gi),
    keyframes: countMatches(css, /@(?:-[a-z]+-)?keyframes\b/gi),
    cssVarUse: countMatches(css, /var\(/gi),
    cssCustomProps: countMatches(css, /--[A-Za-z_][\w-]*\s*:/g),
    fixedSticky: countMatches(css, /position\s*:\s*(?:fixed|sticky)\b/gi),
  };
  return {
    ...risk,
    total: Object.values(risk).reduce((sum, value) => sum + value, 0),
  };
}

async function setCompatibilityMode(page, mode) {
  await page.evaluate((value) => {
    window.__perfHook.setPreviewZoom(1);
    window.__perfHook.setPreviewRenderMode('iframe');
    window.__perfHook.setMainMode('preview');
    window.__perfHook.setRoll20CompatibilityMode(value);
  }, mode);
  await page.waitForTimeout(900);
}

async function waitForStableSheet(page, sheet) {
  await sheet.evaluate(async (sheetEl) => {
    const doc = sheetEl.ownerDocument;
    if (doc.fonts?.ready) await doc.fonts.ready;
    const pending = Array.from(sheetEl.querySelectorAll('img')).filter((image) => !image.complete);
    await Promise.all(pending.map((image) => new Promise((resolve) => {
      const done = () => resolve();
      image.addEventListener('load', done, { once: true });
      image.addEventListener('error', done, { once: true });
      setTimeout(done, 5000);
    })));
  });

  let previous = null;
  let stableSamples = 0;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const current = await sheet.evaluate((sheetEl) => ({
      width: sheetEl.scrollWidth,
      height: sheetEl.scrollHeight,
      rectWidth: Math.round(sheetEl.getBoundingClientRect().width * 100) / 100,
      rectHeight: Math.round(sheetEl.getBoundingClientRect().height * 100) / 100,
    }));
    const signature = JSON.stringify(current);
    stableSamples = signature === previous ? stableSamples + 1 : 0;
    if (stableSamples >= 3) return current;
    previous = signature;
    await page.waitForTimeout(150);
  }
  throw new Error('preview sheet geometry did not stabilize before capture');
}

function captureStops(contentSize, viewportSize, overlap = 96) {
  const max = Math.max(0, Math.ceil(contentSize - viewportSize));
  if (max === 0) return [0];
  const step = Math.max(1, Math.floor(viewportSize - overlap));
  const stops = [];
  for (let value = 0; value < max; value += step) stops.push(value);
  stops.push(max);
  return Array.from(new Set(stops));
}

async function captureFullIframeRoot(page, sheet, output) {
  const iframe = page.locator('[data-testid="preview-iframe"]').first();
  const initial = await sheet.evaluate((sheetEl) => {
    const view = sheetEl.ownerDocument.defaultView;
    const rect = sheetEl.getBoundingClientRect();
    return {
      rootWidth: sheetEl.scrollWidth,
      rootHeight: sheetEl.scrollHeight,
      viewportWidth: view.innerWidth,
      viewportHeight: view.innerHeight,
      rootLeft: rect.left,
      rootTop: rect.top,
    };
  });
  const iframeBox = await iframe.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      clientLeft: element.clientLeft,
      clientTop: element.clientTop,
    };
  });
  const marker = `r20-capture-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const restore = await iframe.evaluate((element, input) => {
    const entries = [];
    let node = element.parentElement;
    let index = 0;
    while (node) {
      const id = `${input.marker}-${index}`;
      entries.push({ id, style: node.getAttribute('style') });
      node.setAttribute('data-r20-capture-unclip', id);
      node.style.setProperty('overflow', 'visible', 'important');
      node.style.setProperty('overflow-x', 'visible', 'important');
      node.style.setProperty('overflow-y', 'visible', 'important');
      node.style.setProperty('max-height', 'none', 'important');
      node = node.parentElement;
      index += 1;
    }
    document.body.style.setProperty('min-height', `${input.height + element.offsetTop + 32}px`, 'important');
    return entries;
  }, { marker, height: initial.rootHeight });

  const segments = [];
  try {
    await page.waitForTimeout(60);
    for (const scrollX of captureStops(initial.rootWidth, initial.viewportWidth)) {
      for (const scrollY of captureStops(initial.rootHeight, initial.viewportHeight)) {
        await sheet.evaluate((sheetEl, point) => {
          sheetEl.ownerDocument.defaultView.scrollTo(point.x, point.y);
        }, { x: scrollX, y: scrollY });
        await page.waitForTimeout(60);
        const state = await sheet.evaluate((sheetEl) => {
          const view = sheetEl.ownerDocument.defaultView;
          const rect = sheetEl.getBoundingClientRect();
          return {
            scrollX: view.scrollX,
            scrollY: view.scrollY,
            rootLeft: rect.left,
            rootTop: rect.top,
            viewportWidth: view.innerWidth,
            viewportHeight: view.innerHeight,
          };
        });
        const bytes = await iframe.screenshot();
        segments.push({
          ...state,
          image: `data:image/png;base64,${bytes.toString('base64')}`,
        });
      }
    }
  } finally {
    await sheet.evaluate((sheetEl) => sheetEl.ownerDocument.defaultView.scrollTo(0, 0));
    await page.evaluate((entries) => {
      for (const entry of entries) {
        const element = document.querySelector(`[data-r20-capture-unclip="${entry.id}"]`);
        if (!element) continue;
        if (entry.style == null) element.removeAttribute('style');
        else element.setAttribute('style', entry.style);
        element.removeAttribute('data-r20-capture-unclip');
      }
    }, restore);
  }

  const dataUrl = await page.evaluate(async ({ segments: captures, iframeBox: frameBox, outputSize }) => {
    const loadImage = (src) => new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = src;
    });
    const canvas = document.createElement('canvas');
    canvas.width = outputSize.width;
    canvas.height = outputSize.height;
    const context = canvas.getContext('2d');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    for (const capture of captures) {
      const image = await loadImage(capture.image);
      const scaleX = image.naturalWidth / frameBox.width;
      const scaleY = image.naturalHeight / frameBox.height;
      const destX = Math.max(0, Math.round(-capture.rootLeft));
      const destY = Math.max(0, Math.round(-capture.rootTop));
      const cropX = frameBox.clientLeft + Math.max(0, capture.rootLeft);
      const cropY = frameBox.clientTop + Math.max(0, capture.rootTop);
      const width = Math.min(
        Math.floor(capture.viewportWidth - Math.max(0, capture.rootLeft)),
        outputSize.width - destX,
      );
      const height = Math.min(
        Math.floor(capture.viewportHeight - Math.max(0, capture.rootTop)),
        outputSize.height - destY,
      );
      if (width <= 0 || height <= 0) continue;
      context.drawImage(
        image,
        Math.round(cropX * scaleX),
        Math.round(cropY * scaleY),
        Math.round(width * scaleX),
        Math.round(height * scaleY),
        destX,
        destY,
        width,
        height,
      );
    }
    return canvas.toDataURL('image/png');
  }, {
    segments,
    iframeBox,
    outputSize: { width: initial.rootWidth, height: initial.rootHeight },
  });
  await fs.writeFile(output, Buffer.from(dataUrl.split(',')[1], 'base64'));
  return {
    width: initial.rootWidth,
    height: initial.rootHeight,
    segments: segments.map(({ image, ...segment }) => segment),
  };
}

async function capturePreviewMode(page, fixtureId, mode) {
  await setCompatibilityMode(page, mode);
  const frame = page.frameLocator('[data-testid="preview-iframe"]').first();
  const sheet = frame.locator('#charsheet-root').first();
  await sheet.waitFor({ state: 'visible', timeout: 30000 });
  const stableGeometry = await waitForStableSheet(page, sheet);
  const style = frame.locator('#r20-user').first();
  const userCss = (await style.textContent({ timeout: 30000 }).catch(() => '')) ?? '';
  const output = path.join(REPORT_DIR, 'screenshots', `${fixtureId}-${mode}.png`);
  const capture = await captureFullIframeRoot(page, sheet, output);
  const dom = await sheet.evaluate((sheetEl) => {
    const rect = sheetEl.getBoundingClientRect();
    const elements = Array.from(sheetEl.querySelectorAll('*'));
    const sampleStyle = (selector) => {
      const element = sheetEl.querySelector(selector);
      if (!element) return null;
      const style = getComputedStyle(element);
      const elementRect = element.getBoundingClientRect();
      return {
        selector,
        tag: element.tagName,
        className: element.className,
        type: element.getAttribute('type'),
        rect: { width: elementRect.width, height: elementRect.height },
        display: style.display,
        position: style.position,
        boxSizing: style.boxSizing,
        backgroundColor: style.backgroundColor,
        backgroundImage: style.backgroundImage,
        border: style.border,
        borderRadius: style.borderRadius,
        color: style.color,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        lineHeight: style.lineHeight,
        padding: style.padding,
        margin: style.margin,
        appearance: style.appearance,
      };
    };
    const textInputGroups = new Map();
    for (const input of sheetEl.querySelectorAll('input[type="text"]')) {
      const style = getComputedStyle(input);
      const inputRect = input.getBoundingClientRect();
      if (style.display === 'none' || style.visibility === 'hidden' || inputRect.width <= 0 || inputRect.height <= 0) continue;
      const key = `${input.className || '(none)'}|${Math.round(inputRect.width * 100) / 100}x${Math.round(inputRect.height * 100) / 100}|${style.height}`;
      const group = textInputGroups.get(key) ?? { key, count: 0, names: [] };
      group.count += 1;
      if (group.names.length < 8) group.names.push(input.getAttribute('name'));
      textInputGroups.set(key, group);
    }
    const rootRect = sheetEl.getBoundingClientRect();
    const landmarks = Array.from(sheetEl.children).map((element, index) => {
      const style = getComputedStyle(element);
      const elementRect = element.getBoundingClientRect();
      return {
        index,
        tag: element.tagName,
        className: element.className,
        id: element.id,
        display: style.display,
        top: Math.round((elementRect.top - rootRect.top) * 100) / 100,
        width: Math.round(elementRect.width * 100) / 100,
        height: Math.round(elementRect.height * 100) / 100,
        text: (element.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60),
      };
    }).filter((element) => element.display !== 'none' && element.height > 0);
    const nestedLandmarks = [2, 3, 6].map((index) => {
      const row = sheetEl.children[index];
      if (!row) return null;
      const rowRect = row.getBoundingClientRect();
      return {
        index,
        row: {
          className: row.className,
          top: Math.round((rowRect.top - rootRect.top) * 100) / 100,
          height: Math.round(rowRect.height * 100) / 100,
        },
        children: Array.from(row.children).map((element, childIndex) => {
          const style = getComputedStyle(element);
          const elementRect = element.getBoundingClientRect();
          return {
            index: childIndex,
            tag: element.tagName,
            className: element.className,
            display: style.display,
            top: Math.round((elementRect.top - rowRect.top) * 100) / 100,
            width: Math.round(elementRect.width * 100) / 100,
            height: Math.round(elementRect.height * 100) / 100,
            margin: style.margin,
            padding: style.padding,
            fontSize: style.fontSize,
            lineHeight: style.lineHeight,
            text: (element.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 50),
          };
        }).filter((element) => element.display !== 'none' && element.height > 0),
      };
    }).filter(Boolean);
    const round = (value) => Math.round(value * 100) / 100;
    const layoutContributors = [2, 3, 6].map((index) => {
      const row = sheetEl.children[index];
      if (!row) return null;
      const rowRect = row.getBoundingClientRect();
      return {
        index,
        className: row.className,
        children: Array.from(row.children).map((child, childIndex) => {
          const childRect = child.getBoundingClientRect();
          const childStyle = getComputedStyle(child);
          const descendants = Array.from(child.querySelectorAll('*')).flatMap((element) => {
            const style = getComputedStyle(element);
            const elementRect = element.getBoundingClientRect();
            if (
              style.display === 'none' ||
              style.visibility === 'hidden' ||
              elementRect.width <= 0 ||
              elementRect.height <= 0
            ) return [];
            return [{
              tag: element.tagName,
              className: element.className,
              name: element.getAttribute('name'),
              type: element.getAttribute('type'),
              top: round(elementRect.top - childRect.top),
              bottom: round(elementRect.bottom - childRect.top),
              width: round(elementRect.width),
              height: round(elementRect.height),
              display: style.display,
              position: style.position,
              boxSizing: style.boxSizing,
              margin: style.margin,
              padding: style.padding,
              border: style.border,
              fontSize: style.fontSize,
              lineHeight: style.lineHeight,
              verticalAlign: style.verticalAlign,
              value: 'value' in element ? String(element.value) : null,
              checked: 'checked' in element ? Boolean(element.checked) : null,
              text: (element.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60),
            }];
          }).sort((a, b) => b.bottom - a.bottom || b.height - a.height);
          const flowColumns = Array.from(child.querySelectorAll('.sheet-section > div > .sheet-col')).flatMap((column, columnIndex) => {
            const style = getComputedStyle(column);
            const columnRect = column.getBoundingClientRect();
            if (
              style.display === 'none' ||
              style.visibility === 'hidden' ||
              columnRect.width <= 0 ||
              columnRect.height <= 0
            ) return [];
            return [{
              index: columnIndex,
              top: round(columnRect.top - childRect.top),
              width: round(columnRect.width),
              height: round(columnRect.height),
              children: Array.from(column.children).flatMap((element, segmentIndex) => {
                const segmentStyle = getComputedStyle(element);
                const segmentRect = element.getBoundingClientRect();
                if (
                  segmentStyle.display === 'none' ||
                  segmentStyle.visibility === 'hidden' ||
                  segmentRect.width <= 0 ||
                  segmentRect.height <= 0
                ) return [];
                return [{
                  index: segmentIndex,
                  tag: element.tagName,
                  className: element.className,
                  top: round(segmentRect.top - columnRect.top),
                  bottom: round(segmentRect.bottom - columnRect.top),
                  width: round(segmentRect.width),
                  height: round(segmentRect.height),
                  display: segmentStyle.display,
                  lineHeight: segmentStyle.lineHeight,
                  verticalAlign: segmentStyle.verticalAlign,
                  text: (element.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60),
                }];
              }),
            }];
          });
          return {
            index: childIndex,
            tag: child.tagName,
            className: child.className,
            top: round(childRect.top - rowRect.top),
            width: round(childRect.width),
            height: round(childRect.height),
            display: childStyle.display,
            margin: childStyle.margin,
            padding: childStyle.padding,
            bottomContributors: descendants.slice(0, 12),
            flowColumns,
          };
        }).filter((child) => child.display !== 'none' && child.height > 0),
      };
    }).filter(Boolean);
    const controlStates = Array.from(sheetEl.querySelectorAll('input, select, textarea, button')).map((element) => {
      const style = getComputedStyle(element);
      const elementRect = element.getBoundingClientRect();
      const parentRect = element.parentElement?.getBoundingClientRect();
      const row = element.closest('.sheet-row');
      const rowRect = row?.getBoundingClientRect();
      const rowStyle = row ? getComputedStyle(row) : null;
      return {
        tag: element.tagName,
        className: element.className,
        name: element.getAttribute('name'),
        type: element.getAttribute('type'),
        disabled: 'disabled' in element ? Boolean(element.disabled) : null,
        value: 'value' in element ? String(element.value) : null,
        valueAttribute: element.getAttribute('value'),
        defaultValue: 'defaultValue' in element ? String(element.defaultValue) : null,
        autocalcExpression: element.getAttribute('data-r20-autocalc-expression'),
        autocalcValue: element.getAttribute('data-r20-autocalc-value'),
        checked: 'checked' in element ? Boolean(element.checked) : null,
        defaultChecked: 'defaultChecked' in element ? Boolean(element.defaultChecked) : null,
        display: style.display,
        visible: style.display !== 'none' && style.visibility !== 'hidden' && elementRect.width > 0 && elementRect.height > 0,
        width: round(elementRect.width),
        height: round(elementRect.height),
        boxSizing: style.boxSizing,
        position: style.position,
        padding: style.padding,
        margin: style.margin,
        border: style.border,
        fontSize: style.fontSize,
        lineHeight: style.lineHeight,
        verticalAlign: style.verticalAlign,
        appearance: style.appearance,
        parentHeight: parentRect ? round(parentRect.height) : null,
        rowHeight: rowRect ? round(rowRect.height) : null,
        rowMargin: rowStyle?.margin ?? null,
      };
    });
    const stateInputs = controlStates.filter((control) => (
      control.tag === 'SELECT' ||
      control.disabled ||
      control.autocalcValue !== null ||
      ['hidden', 'checkbox', 'radio'].includes(control.type || '')
    ));
    const controlGroupMap = new Map();
    controlStates.filter((control) => control.visible).forEach((control) => {
      const key = [
        control.tag,
        control.className || '(none)',
        control.type || '(none)',
        `${control.width}x${control.height}`,
        control.verticalAlign,
        control.parentHeight,
        control.rowHeight,
      ].join('|');
      const current = controlGroupMap.get(key) || {
        tag: control.tag,
        className: control.className,
        type: control.type,
        width: control.width,
        height: control.height,
        verticalAlign: control.verticalAlign,
        parentHeight: control.parentHeight,
        rowHeight: control.rowHeight,
        rowMargin: control.rowMargin,
        count: 0,
        names: [],
      };
      current.count += 1;
      if (control.name && current.names.length < 8 && !current.names.includes(control.name)) {
        current.names.push(control.name);
      }
      controlGroupMap.set(key, current);
    });
    return {
      rect: {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        left: Math.round(rect.left),
        top: Math.round(rect.top),
      },
      scroll: {
        width: sheetEl.scrollWidth,
        height: sheetEl.scrollHeight,
      },
      elementCount: elements.length,
      visibleElementCount: elements.filter((el) => {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0;
      }).length,
      rollButtonCount: sheetEl.querySelectorAll('button[type="roll"], button.roll').length,
      sampleStyles: {
        attrInput: sampleStyle('input.attr-input'),
        sheetAttrInput: sampleStyle('input.sheet-attr-input'),
        actionButton: sampleStyle('button[type="action"]'),
        rollButton: sampleStyle('button[type="roll"]'),
        select: sampleStyle('select'),
      },
      textInputGroups: Array.from(textInputGroups.values()).sort((a, b) => b.count - a.count),
      landmarks,
      nestedLandmarks,
      layoutContributors,
      stateInputs,
      controlGroups: Array.from(controlGroupMap.values()).sort((a, b) => b.count - a.count),
      visibleRuntimeNodeCount: elements.filter((el) => {
        if (!['SCRIPT', 'ROLLTEMPLATE'].includes(el.tagName)) return false;
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0;
      }).length,
    };
  });
  return {
    mode,
    path: output,
    stableGeometry,
    cssLen: userCss.length,
    userCss,
    risk: countLegacyRisks(userCss),
    dom,
    capture,
  };
}

async function diffImages(page, modernFile, legacyFile) {
  const [modernBytes, legacyBytes] = await Promise.all([fs.readFile(modernFile), fs.readFile(legacyFile)]);
  return page.evaluate(
    async ({ modernDataUrl, legacyDataUrl }) => {
      function loadImage(src) {
        return new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = reject;
          image.src = src;
        });
      }
      const [modern, legacy] = await Promise.all([loadImage(modernDataUrl), loadImage(legacyDataUrl)]);
      const width = Math.min(modern.naturalWidth, legacy.naturalWidth);
      const height = Math.min(modern.naturalHeight, legacy.naturalHeight);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(modern, 0, 0);
      const modernData = ctx.getImageData(0, 0, width, height).data;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(legacy, 0, 0);
      const legacyData = ctx.getImageData(0, 0, width, height).data;

      let mismatch = 0;
      let sumAbs = 0;
      const bounds = { left: width, top: height, right: -1, bottom: -1 };
      for (let i = 0; i < modernData.length; i += 4) {
        const delta =
          Math.abs(modernData[i] - legacyData[i]) +
          Math.abs(modernData[i + 1] - legacyData[i + 1]) +
          Math.abs(modernData[i + 2] - legacyData[i + 2]) +
          Math.abs(modernData[i + 3] - legacyData[i + 3]);
        sumAbs += delta;
        if (delta > 24) {
          mismatch += 1;
          const x = (i / 4) % width;
          const y = Math.floor(i / 4 / width);
          bounds.left = Math.min(bounds.left, x);
          bounds.top = Math.min(bounds.top, y);
          bounds.right = Math.max(bounds.right, x);
          bounds.bottom = Math.max(bounds.bottom, y);
        }
      }
      const total = width * height;
      return {
        modernSize: { width: modern.naturalWidth, height: modern.naturalHeight },
        legacySize: { width: legacy.naturalWidth, height: legacy.naturalHeight },
        crop: { width, height },
        mismatchPixels: mismatch,
        mismatchPct: total > 0 ? Math.round((mismatch / total) * 10000) / 100 : null,
        meanAbsChannelDelta: total > 0 ? Math.round((sumAbs / (total * 4)) * 100) / 100 : null,
        mismatchBounds:
          mismatch > 0
            ? {
                left: bounds.left,
                top: bounds.top,
                width: bounds.right - bounds.left + 1,
                height: bounds.bottom - bounds.top + 1,
              }
            : null,
      };
    },
    {
      modernDataUrl: `data:image/png;base64,${modernBytes.toString('base64')}`,
      legacyDataUrl: `data:image/png;base64,${legacyBytes.toString('base64')}`,
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
    scope: 'local static app imported-fixture modern/legacy preview smoke',
    fixtures: [],
  };

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
      entry.import = await waitForLiveImport(page, fixture);
      entry.modern = await capturePreviewMode(page, fixture.id, 'modern');
      entry.legacy = await capturePreviewMode(page, fixture.id, 'legacy');
      entry.cssChanged = entry.modern.userCss !== entry.legacy.userCss;
      delete entry.modern.userCss;
      delete entry.legacy.userCss;
      entry.legacyRiskReduced = entry.legacy.risk.total < entry.modern.risk.total;
      entry.modeEffect = entry.modern.risk.total > 0
        ? entry.legacyRiskReduced
          ? 'sanitized'
          : 'risk-not-reduced'
        : 'no-risk-css';
      entry.diff = await diffImages(page, entry.modern.path, entry.legacy.path);
      entry.pass =
        entry.import?.blockCount > 0 &&
        entry.modern.dom.visibleElementCount > 0 &&
        entry.legacy.dom.visibleElementCount > 0 &&
        entry.modern.dom.visibleRuntimeNodeCount === 0 &&
        entry.legacy.dom.visibleRuntimeNodeCount === 0 &&
        consoleErrors.length === 0 &&
        pageErrors.length === 0 &&
        (entry.modern.risk.total === 0 || entry.legacyRiskReduced);
    } catch (err) {
      entry.error = String(err?.stack || err).slice(0, 1200);
    }
    entry.consoleErrors = consoleErrors;
    entry.pageErrors = pageErrors;
    entry.resourceIssues = summarizeResourceIssues(resourceIssues);
    report.fixtures.push(entry);
    console.log(
      `${entry.pass ? 'PASS' : 'FAIL'} ${fixture.id} ` +
        `risk=${entry.modern?.risk?.total ?? 'n/a'}->${entry.legacy?.risk?.total ?? 'n/a'} ` +
        `diff=${entry.diff?.mismatchPct ?? 'n/a'}%`,
    );
    await page.close();
  }

  report.finishedAt = new Date().toISOString();
  report.pass = report.fixtures.every((fixture) => fixture.pass);

  await fs.writeFile(
    path.join(REPORT_DIR, 'legacy-fixture-visual-results.json'),
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8',
  );
  await fs.writeFile(
    path.join(REPORT_DIR, 'legacy-fixture-visual-results.md'),
    renderMarkdown(report),
    'utf8',
  );

  await browser.close();
  server.close();
  console.log(report.pass ? 'LEGACY FIXTURE VISUAL SMOKE PASS' : 'LEGACY FIXTURE VISUAL SMOKE FAIL');
  process.exitCode = report.pass ? 0 : 1;
}

function renderMarkdown(report) {
  const lines = [
    '# Legacy Fixture Visual Smoke',
    '',
    `Generated: ${report.finishedAt ?? report.startedAt}`,
    '',
    'Scope: local static app, ignored imported fixtures, preview iframe only. This verifies local legacy CSS preview plumbing and does not prove actual Roll20 legacy visual parity.',
    '',
    '| Fixture | Blocks | Modern risk | Legacy risk | Mode effect | CSS changed | Modern size | Legacy size | Mismatch | Console errors | Page errors | Status |',
    '| --- | ---: | ---: | ---: | --- | --- | --- | --- | ---: | ---: | ---: | --- |',
  ];
  for (const item of report.fixtures) {
    lines.push(
      `| \`${item.id}\` | ${item.import?.blockCount ?? ''} | ${item.modern?.risk?.total ?? ''} | ${item.legacy?.risk?.total ?? ''} | ${item.modeEffect ?? ''} | ${item.cssChanged ? 'yes' : 'no'} | ${fmtSize(item.diff?.modernSize)} | ${fmtSize(item.diff?.legacySize)} | ${item.diff?.mismatchPct ?? ''}% | ${item.consoleErrors?.length ?? 0} | ${item.pageErrors?.length ?? 0} | ${item.pass ? 'PASS' : 'FAIL'} |`,
    );
  }
  lines.push('');
  lines.push('Notes:');
  lines.push('- PASS requires both preview roots to render, no visible script/rolltemplate runtime nodes, and zero console/page errors.');
  lines.push('- If modern user CSS contains legacy-risk declarations, legacy mode must reduce that risk count.');
  lines.push('- A fixture with no legacy-risk CSS is recorded as `no-risk-css`; it still exercises the import and toggle path.');
  lines.push('- Screenshot mismatch is diagnostic only. Real Roll20 sandbox/test-room parity remains unverified until actual Roll20 screenshots are captured.');
  lines.push('- Screenshots and generated report files are local-only and ignored by Git.');
  lines.push('');
  lines.push('## Risk Breakdown');
  lines.push('');
  lines.push('| Fixture | Modern | Legacy |');
  lines.push('| --- | --- | --- |');
  for (const item of report.fixtures) {
    lines.push(`| \`${item.id}\` | ${fmtRisk(item.modern?.risk)} | ${fmtRisk(item.legacy?.risk)} |`);
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

function fmtRisk(risk) {
  if (!risk) return '';
  return [
    `total ${risk.total}`,
    `transform ${risk.transform}`,
    `animation ${risk.animation}`,
    `keyframes ${risk.keyframes}`,
    `var ${risk.cssVarUse}`,
    `custom ${risk.cssCustomProps}`,
    `fixed/sticky ${risk.fixedSticky}`,
  ].join('<br>');
}

function sumResourceIssues(items) {
  return (items || []).reduce((sum, item) => sum + item.count, 0);
}

function fmtResourceIssues(items) {
  if (!items || items.length === 0) return '';
  return items.slice(0, 3).map((item) => `${item.kind}/${item.status ?? ''}/${item.resourceType}/${item.host}: ${item.count}`).join('<br>');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
