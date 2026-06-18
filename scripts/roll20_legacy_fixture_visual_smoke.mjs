#!/usr/bin/env node
/**
 * Imported-fixture visual smoke for the local legacy CSS preview toggle.
 *
 * Imports ignored fixture source through the static app, captures the preview
 * iframe with legacy CSS sanitize OFF and ON, and verifies that risky modern
 * CSS is reduced when the legacy mode is enabled. Screenshots and reports are
 * local-only. This does not prove actual Roll20 legacy visual parity.
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

async function setLegacyMode(page, enabled) {
  await page.evaluate((value) => {
    window.__perfHook.setPreviewZoom(1);
    window.__perfHook.setPreviewRenderMode('iframe');
    window.__perfHook.setMainMode('preview');
    window.__perfHook.setLegacyCssSanitize(value);
  }, enabled);
  await page.waitForTimeout(900);
}

async function capturePreviewMode(page, fixtureId, mode) {
  await setLegacyMode(page, mode === 'legacy');
  const frame = page.frameLocator('[data-testid="preview-iframe"]').first();
  const sheet = frame.locator('#charsheet-root').first();
  await sheet.waitFor({ state: 'visible', timeout: 30000 });
  const style = frame.locator('#r20-user').first();
  const userCss = (await style.textContent({ timeout: 30000 }).catch(() => '')) ?? '';
  const output = path.join(REPORT_DIR, 'screenshots', `${fixtureId}-${mode}.png`);
  await sheet.screenshot({ path: output });
  const dom = await sheet.evaluate((sheetEl) => {
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
    cssLen: userCss.length,
    userCss,
    risk: countLegacyRisks(userCss),
    dom,
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
