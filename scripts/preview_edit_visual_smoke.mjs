#!/usr/bin/env node
/**
 * Preview/Edit visual smoke for prepared fixtures.
 *
 * Imports ignored fixture source through the live app bundle, captures the
 * preview iframe and edit Shadow DOM host, then computes a browser-canvas pixel
 * diff over their shared crop. Generated screenshots/reports are local-only.
 *
 * Scope: local preview vs local edit in the static Next.js app.
 * This does not prove actual Roll20 visual parity.
 *
 * Usage:
 *   node scripts/preview_edit_visual_smoke.mjs \
 *     --out-dir ./out --base-path /roll20-block-editor \
 *     --fixtures test-fixtures/visual --report-dir reports/preview-edit-visual
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
const PORT = Number(argOf('--port', '4186'));
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

async function capturePreview(page, fixtureId) {
  await page.evaluate(() => {
    window.__perfHook.setPreviewZoom(1);
    window.__perfHook.setPreviewRenderMode('iframe');
    window.__perfHook.setMainMode('preview');
  });
  const frame = page.frameLocator('iframe[title]').first();
  const sheet = frame.locator('#charsheet-root').first();
  await sheet.waitFor({ state: 'visible', timeout: 30000 });
  const output = path.join(REPORT_DIR, 'screenshots', `${fixtureId}-preview.png`);
  const box = await sheet.boundingBox();
  const dom = await sheet.evaluate(summarizeSheetElement);
  const diagnostics = await sheet.evaluate(summarizeRenderDiagnostics);
  const appOcclusion = await collectAppOcclusion(page, box);
  await withHiddenAppChrome(page, () => sheet.screenshot({ path: output }));
  return { path: output, box, dom, diagnostics, appOcclusion };
}

async function captureEdit(page, fixtureId) {
  await page.evaluate(() => {
    window.__perfHook.setPreviewZoom(1);
    window.__perfHook.setMainMode('edit');
  });
  const host = page.locator('[data-testid="edit-canvas-shadow-host"]').first();
  await host.waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForFunction(() => {
    const hostEl = document.querySelector('[data-testid="edit-canvas-shadow-host"]');
    return Boolean(hostEl?.shadowRoot?.querySelector('#charsheet-root'));
  }, null, { timeout: 30000 });
  const sheet = page.locator('[data-testid="edit-canvas-shadow-host"] #charsheet-root').first();
  const output = path.join(REPORT_DIR, 'screenshots', `${fixtureId}-edit.png`);
  const box = await sheet.boundingBox();
  const dom = await sheet.evaluate(summarizeSheetElement);
  const diagnostics = await sheet.evaluate(summarizeRenderDiagnostics);
  const appOcclusion = await collectAppOcclusion(page, box);
  await withHiddenAppChrome(page, () => sheet.screenshot({ path: output }));
  return { path: output, box, dom, diagnostics, appOcclusion };
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
  const report = { startedAt: new Date().toISOString(), fixtures: [] };

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
      entry.previewCapture = await capturePreview(page, fixture.id);
      entry.previewDom = entry.previewCapture.dom;
      entry.previewDiagnostics = entry.previewCapture.diagnostics;
      entry.previewAppOcclusion = entry.previewCapture.appOcclusion;
      entry.editCapture = await captureEdit(page, fixture.id);
      entry.editDom = entry.editCapture.dom;
      entry.editDiagnostics = entry.editCapture.diagnostics;
      entry.editAppOcclusion = entry.editCapture.appOcclusion;
      entry.diff = await diffPngs(page, entry.previewCapture.path, entry.editCapture.path);
      entry.pass =
        entry.import?.blockCount > 0 &&
        entry.previewDom.status === 'ok' &&
        entry.editDom.status === 'ok' &&
        consoleErrors.length === 0 &&
        pageErrors.length === 0;
    } catch (err) {
      entry.error = String(err?.stack || err).slice(0, 1200);
    }
    entry.consoleErrors = consoleErrors;
    entry.pageErrors = pageErrors;
    entry.resourceIssues = summarizeResourceIssues(resourceIssues);
    report.fixtures.push(entry);
    console.log(`${entry.pass ? 'PASS' : 'FAIL'} ${fixture.id} mismatch=${entry.diff?.mismatchPct ?? 'n/a'}%`);
    await page.close();
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

function renderMarkdown(report) {
  const lines = [
    '# Preview/Edit Visual Smoke',
    '',
    `Generated: ${report.finishedAt ?? report.startedAt}`,
    '',
    'Scope: local static app, real browser import path, preview iframe screenshot, and edit Shadow DOM screenshot. This does not prove actual Roll20 visual parity.',
    '',
    '| Fixture | Blocks | Preview size | Edit size | Crop | Mismatch | Bounds | Dominant area | Mean delta | Console errors | Page errors |',
    '| --- | ---: | --- | --- | --- | ---: | --- | --- | ---: | ---: | ---: |',
  ];
  for (const item of report.fixtures) {
    const d = item.diff ?? {};
    lines.push(
      `| \`${item.id}\` | ${item.import?.blockCount ?? ''} | ${fmtSize(d.previewSize)} | ${fmtSize(d.editSize)} | ${fmtSize(d.crop)} | ${d.mismatchPct ?? ''}% | ${fmtBounds(d.mismatchBounds)} | ${d.dominantQuadrant ?? ''} | ${d.meanAbsChannelDelta ?? ''} | ${item.consoleErrors?.length ?? 0} | ${item.pageErrors?.length ?? 0} |`,
    );
  }
  lines.push('');
  lines.push('Notes:');
  lines.push('- PASS means the diagnostic ran without app/page errors and both preview/edit roots rendered.');
  lines.push('- Mismatch is a diagnostic over the shared top-left crop, not a visual parity gate yet.');
  lines.push('- Bounds and dominant area are coarse triage hints for locating remaining preview/edit differences.');
  lines.push(`- Browser viewport for capture: ${VIEWPORT.width}x${VIEWPORT.height}.`);
  lines.push('- Screenshots are local-only and ignored by Git.');
  lines.push('- App chrome is hidden only during root screenshots; toolbar overlap is still measured separately.');
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
    .map((item) => `${item.count}x ${item.status ?? item.kind} ${item.resourceType} ${item.host || '(local)'}`)
    .join('<br>');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
