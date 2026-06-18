#!/usr/bin/env node
/**
 * Re-import cleaned Roll20 upload payloads through the static app and compare
 * their preview screenshots against the local baseline screenshots.
 *
 * Scope: local-only export-payload roundtrip visual smoke. This catches payload
 * cleanup mistakes before Roll20 upload. It does not prove actual Roll20 visual
 * parity because Roll20 itself is not involved.
 */

import http from 'node:http';
import { existsSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const positional = args.filter((arg, index) => !arg.startsWith('--') && args[index - 1] !== '--out-dir' && args[index - 1] !== '--base-path' && args[index - 1] !== '--report-dir' && args[index - 1] !== '--port' && args[index - 1] !== '--threshold');
const RUN_DIR = path.resolve(positional[0] ?? 'reports/roll20-actual-compare/2026-06-18-payload-clean-v2');
const OUT_DIR = path.resolve(argOf('--out-dir', './out'));
const BASE_PATH = argOf('--base-path', '/roll20-block-editor');
const REPORT_DIR = path.resolve(argOf('--report-dir', path.join(RUN_DIR, 'payload-roundtrip-visual')));
const PORT = Number(argOf('--port', '4193'));
const MISMATCH_THRESHOLD_PCT = Number(argOf('--threshold', '2'));
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

function argOf(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

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

async function readText(file) {
  return fs.readFile(file, 'utf8');
}

async function listPayloadFixtures() {
  const localRoot = path.join(RUN_DIR, 'local-baseline');
  const entries = await fs.readdir(localRoot, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      id: entry.name,
      dir: path.join(localRoot, entry.name),
      payloadDir: path.join(localRoot, entry.name, 'payload'),
      baselineScreenshot: path.join(localRoot, entry.name, 'screenshots', 'local-preview.png'),
    }))
    .filter((entry) => existsSync(path.join(entry.payloadDir, 'sheet.html')) && existsSync(entry.baselineScreenshot))
    .sort((a, b) => a.id.localeCompare(b.id));
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

async function importPayload(page, fixture) {
  const payload = {
    html: await readText(path.join(fixture.payloadDir, 'sheet.html')),
    css: await readText(path.join(fixture.payloadDir, 'sheet.css')),
    i18n: await readText(path.join(fixture.payloadDir, 'translation.json')),
  };
  return page.evaluate(async ({ html, css, i18n }) => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    window.__perfHook.clearAll();
    await sleep(700);
    let last = null;
    for (let i = 0; i < 40; i += 1) {
      last = await window.__perfHook.importSheet({ html, css, i18n });
      if (last.blockCount > 0) break;
      await sleep(500);
    }
    return {
      result: last,
      emit: window.__perfHook.getEmitContent(),
    };
  }, payload);
}

async function capturePayloadPreview(page, outFile) {
  await page.evaluate(() => {
    window.__perfHook.setPreviewZoom(1);
    window.__perfHook.setPreviewRenderMode('iframe');
    window.__perfHook.setMainMode('preview');
  });
  const frame = page.frameLocator('[data-testid="preview-iframe"]').first();
  const sheet = frame.locator('#charsheet-root').first();
  await sheet.waitFor({ state: 'visible', timeout: 30000 });
  await sheet.screenshot({ path: outFile });
  return sheet.evaluate((sheetEl) => {
    const rect = sheetEl.getBoundingClientRect();
    const elements = Array.from(sheetEl.querySelectorAll('*'));
    return {
      rect: {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        left: Math.round(rect.left),
        top: Math.round(rect.top),
      },
      elementCount: elements.length,
      visibleElementCount: elements.filter((el) => {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0;
      }).length,
      rollButtonCount: sheetEl.querySelectorAll('button[type="roll"], button.roll').length,
      visibleScriptCount: elements.filter((el) => {
        if (!['SCRIPT', 'ROLLTEMPLATE'].includes(el.tagName)) return false;
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0;
      }).length,
    };
  });
}

async function diffImages(page, baselineFile, payloadFile) {
  const [baselineBytes, payloadBytes] = await Promise.all([fs.readFile(baselineFile), fs.readFile(payloadFile)]);
  return page.evaluate(
    async ({ baselineDataUrl, payloadDataUrl }) => {
      function loadImage(src) {
        return new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = reject;
          image.src = src;
        });
      }
      const [baseline, payload] = await Promise.all([loadImage(baselineDataUrl), loadImage(payloadDataUrl)]);
      const baselineCanvas = document.createElement('canvas');
      baselineCanvas.width = baseline.naturalWidth;
      baselineCanvas.height = baseline.naturalHeight;
      const baselineCtx = baselineCanvas.getContext('2d', { willReadFrequently: true });
      baselineCtx.drawImage(baseline, 0, 0);

      const payloadCanvas = document.createElement('canvas');
      payloadCanvas.width = payload.naturalWidth;
      payloadCanvas.height = payload.naturalHeight;
      const payloadCtx = payloadCanvas.getContext('2d', { willReadFrequently: true });
      payloadCtx.drawImage(payload, 0, 0);

      function compareAt(bx, by, px, py) {
        const width = Math.min(baselineCanvas.width - bx, payloadCanvas.width - px);
        const height = Math.min(baselineCanvas.height - by, payloadCanvas.height - py);
        const scratchA = document.createElement('canvas');
        scratchA.width = width;
        scratchA.height = height;
        const scratchACtx = scratchA.getContext('2d', { willReadFrequently: true });
        scratchACtx.drawImage(baselineCanvas, bx, by, width, height, 0, 0, width, height);
        const a = scratchACtx.getImageData(0, 0, width, height).data;

        const scratchB = document.createElement('canvas');
        scratchB.width = width;
        scratchB.height = height;
        const scratchBCtx = scratchB.getContext('2d', { willReadFrequently: true });
        scratchBCtx.drawImage(payloadCanvas, px, py, width, height, 0, 0, width, height);
        const b = scratchBCtx.getImageData(0, 0, width, height).data;

        let mismatch = 0;
        let sumAbs = 0;
        const bounds = { left: width, top: height, right: -1, bottom: -1 };
        for (let i = 0; i < a.length; i += 4) {
          const delta =
            Math.abs(a[i] - b[i]) +
            Math.abs(a[i + 1] - b[i + 1]) +
            Math.abs(a[i + 2] - b[i + 2]) +
            Math.abs(a[i + 3] - b[i + 3]);
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
          crop: { baselineX: bx, baselineY: by, payloadX: px, payloadY: py, width, height },
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
      }

      const candidates = [{ mode: 'top-left', ...compareAt(0, 0, 0, 0) }];
      const maxOffset = 4;
      for (let by = 0; by <= maxOffset; by += 1) {
        for (let bx = 0; bx <= maxOffset; bx += 1) {
          for (let py = 0; py <= maxOffset; py += 1) {
            for (let px = 0; px <= maxOffset; px += 1) {
              if (bx === 0 && by === 0 && px === 0 && py === 0) continue;
              candidates.push({ mode: 'small-offset', ...compareAt(bx, by, px, py) });
            }
          }
        }
      }
      const best = candidates.reduce((acc, item) => (!acc || item.mismatchPct < acc.mismatchPct ? item : acc), null);
      return {
        baselineSize: { width: baseline.naturalWidth, height: baseline.naturalHeight },
        payloadSize: { width: payload.naturalWidth, height: payload.naturalHeight },
        topLeft: candidates[0],
        best,
      };
    },
    {
      baselineDataUrl: `data:image/png;base64,${baselineBytes.toString('base64')}`,
      payloadDataUrl: `data:image/png;base64,${payloadBytes.toString('base64')}`,
    },
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

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Roll20 Payload Roundtrip Visual Smoke');
  lines.push('');
  lines.push(`Run: \`${report.runDir}\``);
  lines.push(`Generated: ${report.finishedAt}`);
  lines.push('');
  lines.push('Scope: local cleaned-payload re-import check. This does not prove actual Roll20 visual parity.');
  lines.push('');
  lines.push('| Fixture | Status | Blocks | Baseline size | Payload size | Mismatch | Bounds | Roll buttons | Visible runtime nodes | Console/Page errors | Resources |');
  lines.push('| --- | --- | ---: | --- | --- | ---: | --- | ---: | ---: | ---: | ---: |');
  for (const item of report.fixtures) {
    const d = item.diff ?? {};
    const best = d.best ?? {};
    lines.push(
      `| \`${item.id}\` | ${item.pass ? 'PASS' : 'FAIL'} | ${item.import?.result?.blockCount ?? 0} | ${fmtSize(d.baselineSize)} | ${fmtSize(d.payloadSize)} | ${best.mismatchPct ?? ''}% | ${fmtBounds(best.mismatchBounds)} | ${item.previewDom?.rollButtonCount ?? 0} | ${item.previewDom?.visibleScriptCount ?? 0} | ${(item.consoleErrors?.length ?? 0) + (item.pageErrors?.length ?? 0)} | ${sumResourceIssues(item.resourceIssues)} |`,
    );
  }
  lines.push('');
  lines.push(`Gate: mismatch must be <= ${report.mismatchThresholdPct}% and no page/console errors. Script/rolltemplate nodes must remain visually hidden.`);
  lines.push('');
  lines.push('If this fails, fix export cleanup or import roundtrip before uploading the payload to Roll20.');
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

function sumResourceIssues(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, item) => sum + (item.count ?? 0), 0);
}

async function main() {
  const baselineDir = path.join(RUN_DIR, 'local-baseline');
  if (!existsSync(baselineDir)) throw new Error(`missing local-baseline under ${RUN_DIR}`);
  await fs.mkdir(path.join(REPORT_DIR, 'screenshots'), { recursive: true });
  const fixtures = await listPayloadFixtures();
  if (fixtures.length === 0) throw new Error(`no payload fixtures under ${baselineDir}`);

  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const report = {
    startedAt: new Date().toISOString(),
    runDir: RUN_DIR,
    mismatchThresholdPct: MISMATCH_THRESHOLD_PCT,
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

      const entry = { id: fixture.id, pass: false, payloadDir: fixture.payloadDir };
      try {
        await page.goto(`http://127.0.0.1:${PORT}${BASE_PATH}/`, { waitUntil: 'load' });
        await warmPerfHook(page);
        entry.import = await importPayload(page, fixture);
        entry.payloadScreenshot = path.join(REPORT_DIR, 'screenshots', `${fixture.id}-payload-preview.png`);
        entry.previewDom = await capturePayloadPreview(page, entry.payloadScreenshot);
        entry.diff = await diffImages(page, fixture.baselineScreenshot, entry.payloadScreenshot);
        entry.pass =
          (entry.import?.result?.blockCount ?? 0) > 0 &&
          entry.previewDom?.elementCount > 0 &&
          entry.previewDom?.visibleScriptCount === 0 &&
          (entry.diff?.best?.mismatchPct ?? 100) <= MISMATCH_THRESHOLD_PCT &&
          consoleErrors.length === 0 &&
          pageErrors.length === 0;
      } catch (err) {
        entry.error = String(err?.stack || err).slice(0, 1200);
      }
      entry.consoleErrors = consoleErrors;
      entry.pageErrors = pageErrors;
      entry.resourceIssues = summarizeResourceIssues(resourceIssues);
      report.fixtures.push(entry);
      console.log(`${entry.pass ? 'PASS' : 'FAIL'} ${fixture.id} mismatch=${entry.diff?.best?.mismatchPct ?? 'n/a'}%`);
      await page.close();
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }

  report.finishedAt = new Date().toISOString();
  report.pass = report.fixtures.every((item) => item.pass);
  await fs.writeFile(path.join(REPORT_DIR, 'payload-roundtrip-visual-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(path.join(REPORT_DIR, 'payload-roundtrip-visual-results.md'), renderMarkdown(report), 'utf8');
  console.log(`ROLL20 PAYLOAD ROUNDTRIP VISUAL ${report.pass ? 'PASS' : 'FAIL'} ${REPORT_DIR}`);
  if (!report.pass) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
