#!/usr/bin/env node
/**
 * Prepare local-only Roll20 actual-screen baseline artifacts.
 *
 * This script imports ignored fixtures through the real static app bundle,
 * captures local preview/edit screenshots, and writes the emitted
 * HTML/CSS/translation payload plus a Roll20 upload zip under
 * reports/roll20-actual-compare/<run>/local-baseline/.
 *
 * Scope: local baseline and upload payload preparation only. It does not log
 * into Roll20, upload to Roll20, or prove actual Roll20 visual parity.
 *
 * Usage:
 *   node scripts/roll20_actual_local_baseline.mjs \
 *     --out-dir ./out --base-path /roll20-block-editor \
 *     --fixtures test-fixtures/visual --report-dir reports/roll20-actual-compare \
 *     --run-label 2026-06-18-local-baseline [--only fixture-id]
 */

import crypto from 'node:crypto';
import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
function argOf(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const OUT_DIR = path.resolve(argOf('--out-dir', './out'));
const BASE_PATH = argOf('--base-path', '/roll20-block-editor');
const FIXTURES_DIR = path.resolve(argOf('--fixtures', 'test-fixtures/visual'));
const REPORT_ROOT = path.resolve(argOf('--report-dir', 'reports/roll20-actual-compare'));
const RUN_LABEL = slug(argOf('--run-label', new Date().toISOString().slice(0, 19)));
const ONLY = argOf('--only', '');
const PORT = Number(argOf('--port', '4192'));
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

function slug(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'roll20-local-baseline';
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
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
      dir,
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

async function importFixture(page, fixture) {
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
      workspace: window.__perfHook.getWorkspace(),
    };
  }, fixture);
}

async function capturePreview(page, outFile) {
  await page.evaluate(() => {
    window.__perfHook.setPreviewZoom(1);
    window.__perfHook.setPreviewRenderMode('iframe');
    window.__perfHook.setMainMode('preview');
  });
  const frame = page.frameLocator('[data-testid="preview-iframe"]').first();
  const sheet = frame.locator('#charsheet-root').first();
  await sheet.waitFor({ state: 'visible', timeout: 30000 });
  await sheet.screenshot({ path: outFile });
  return sheet.evaluate(summarizeSheetElement);
}

async function captureEdit(page, outFile) {
  await page.evaluate(() => {
    window.__perfHook.setPreviewZoom(1);
    window.__perfHook.setMainMode('edit');
  });
  const sheet = page.locator('[data-testid="edit-canvas-shadow-host"] #charsheet-root').first();
  await sheet.waitFor({ state: 'visible', timeout: 30000 });
  await sheet.screenshot({ path: outFile });
  return sheet.evaluate(summarizeSheetElement);
}

function summarizeSheetElement(sheetEl) {
  const rect = sheetEl.getBoundingClientRect();
  const elements = sheetEl.querySelectorAll('*');
  return {
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
    rollButtonCount: sheetEl.querySelectorAll('button[type="roll"], button.roll').length,
    workerScriptCount: sheetEl.querySelectorAll('script[type="text/worker"]').length,
    rolltemplateCount: sheetEl.querySelectorAll('rolltemplate, .sheet-rolltemplate').length,
  };
}

function normalizeTranslation(i18n) {
  const text = (i18n ?? '').trim();
  if (!text) return '{}';
  try {
    JSON.parse(text);
    return text;
  } catch {
    // Fall through to internal comment format from r20_locale_value.
  }
  const entries = {};
  const re = /<!--\s*i18n(?:\[[^\]]+\])?\s+("(?:\\.|[^"\\])*")\s*:\s*("(?:\\.|[^"\\])*")\s*-->/g;
  let match;
  while ((match = re.exec(text))) {
    try {
      entries[JSON.parse(match[1])] = JSON.parse(match[2]);
    } catch {
      // Ignore malformed comment entries and keep valid ones.
    }
  }
  return Object.keys(entries).length > 0 ? `${JSON.stringify(entries, null, 2)}\n` : text;
}

function stripInternalBlockIds(html) {
  let removed = 0;
  const cleaned = String(html ?? '').replace(/\sdata-r20-block-id=(?:"[^"]*"|'[^']*')/g, () => {
    removed += 1;
    return '';
  });
  return { html: cleaned, removed };
}

function buildManifest(fixtureId) {
  return JSON.stringify({
    html: 'sheet.html',
    css: 'sheet.css',
    translations: 'translation.json',
    legacy: false,
    useroptions: [],
    name: `${fixtureId} local verification`,
    authors: 'Local verification',
    license: 'All rights reserved',
    version: '0.1.0',
  }, null, 2) + '\n';
}

async function writeZip(outFile, files) {
  const zip = new JSZip();
  for (const [name, body] of Object.entries(files)) zip.file(name, body);
  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
  await fs.writeFile(outFile, buffer);
  return buffer.length;
}

function blockingExportWarnings(emit) {
  const warnings = [];
  if (/<iframe[\s>]/i.test(emit.html)) warnings.push('html.iframe');
  if (/\son[a-z]+\s*=\s*["']/i.test(emit.html)) warnings.push('html.inline_handler');
  if (/\b(?:fetch|XMLHttpRequest|navigator\.sendBeacon|WebSocket|EventSource)\s*\(/.test(`${emit.html}\n${emit.i18n}`)) {
    warnings.push('script.external_fetch');
  }
  if (/\b(?:eval|Function)\s*\(/.test(emit.html)) warnings.push('script.eval');
  return warnings;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Roll20 Local Baseline Package');
  lines.push('');
  lines.push(`Run label: \`${report.runLabel}\``);
  lines.push(`Generated: ${report.createdAt}`);
  lines.push('');
  lines.push('This report is local-only and ignored by Git. Do not commit generated screenshots, payloads, zips, fixture names, room names, or source-derived HTML.');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Fixture | Status | Blocks | HTML bytes | CSS bytes | Translation bytes | Internal ids stripped | Preview size | Edit size | Roll buttons | Blocking warnings |');
  lines.push('| --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | --- |');
  for (const item of report.fixtures) {
    lines.push(
      `| \`${item.id}\` | ${item.pass ? 'PASS' : 'FAIL'} | ${item.import?.blockCount ?? 0} | ${item.emitBytes.html} | ${item.emitBytes.css} | ${item.emitBytes.translation} | ${item.removedInternalBlockIds ?? 0} | ${fmtRect(item.previewDom?.rect)} | ${fmtRect(item.editDom?.rect)} | ${item.previewDom?.rollButtonCount ?? 0}/${item.editDom?.rollButtonCount ?? 0} | ${item.blockingWarnings.join(', ') || 'none'} |`,
    );
  }
  lines.push('');
  lines.push('## Next Roll20 Steps');
  lines.push('');
  lines.push('1. Open Roll20 Custom Sheet Sandbox or a newly-created test room.');
  lines.push('2. Use each fixture payload under `local-baseline/<fixture>/payload/` or `upload.zip`.');
  lines.push('3. Capture Roll20 initial sheet screenshot and chat/roll smoke evidence into this same ignored run folder.');
  lines.push('4. Classify differences as wrapper/context, base CSS, user CSS cascade, default state, translation, worker JS, rolltemplate/chat, asset loading, viewport/crop, edit overlay, or drag latency.');
  lines.push('');
  lines.push('## Scope');
  lines.push('');
  lines.push('- Proves local import -> emit -> payload package generation for selected ignored fixtures only.');
  lines.push('- Does not prove actual Roll20 visual parity or all-sheet support.');
  return `${lines.join('\n')}\n`;
}

function fmtRect(rect) {
  if (!rect) return '';
  return `${rect.width}x${rect.height}`;
}

async function main() {
  const runDir = path.join(REPORT_ROOT, RUN_LABEL);
  const localDir = path.join(runDir, 'local-baseline');
  await fs.mkdir(localDir, { recursive: true });
  const fixtures = await listFixtures();
  if (fixtures.length === 0) {
    throw new Error(`No fixtures found in ${FIXTURES_DIR}${ONLY ? ` matching ${ONLY}` : ''}`);
  }

  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: VIEWPORT });
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (msg) => {
    if (['error', 'warning'].includes(msg.type())) consoleErrors.push({ type: msg.type(), text: msg.text() });
  });
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  const report = {
    createdAt: new Date().toISOString(),
    runLabel: RUN_LABEL,
    baseUrl: `http://127.0.0.1:${PORT}${BASE_PATH}/`,
    reportDir: runDir,
    fixtures: [],
    consoleErrors,
    pageErrors,
  };

  try {
    await page.goto(report.baseUrl, { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.setItem('__perfOn', '1'));
    await page.reload({ waitUntil: 'networkidle' });
    await warmPerfHook(page);

    for (const fixture of fixtures) {
      const fixtureDir = path.join(localDir, fixture.id);
      const payloadDir = path.join(fixtureDir, 'payload');
      const screenshotDir = path.join(fixtureDir, 'screenshots');
      await fs.mkdir(payloadDir, { recursive: true });
      await fs.mkdir(screenshotDir, { recursive: true });

      const entry = {
        id: fixture.id,
        fixtureDir,
        sourceBytes: {
          html: Buffer.byteLength(fixture.html),
          css: Buffer.byteLength(fixture.css),
          i18n: Buffer.byteLength(fixture.i18n),
        },
      };
      try {
        const imported = await importFixture(page, fixture);
        entry.import = imported.result;
        const htmlPayload = stripInternalBlockIds(imported.emit.html ?? '');
        const emit = {
          html: htmlPayload.html,
          css: imported.emit.css ?? '',
          translation: normalizeTranslation(imported.emit.i18n ?? ''),
        };
        const manifest = buildManifest(fixture.id);
        const readme = [
          `Roll20 local verification payload for ${fixture.id}`,
          '',
          'Generated locally for Custom Sheet Sandbox/test-room verification.',
          'Do not commit this payload if it contains real or derived sheet source.',
          '',
        ].join('\n');

        await fs.writeFile(path.join(payloadDir, 'sheet.html'), emit.html, 'utf8');
        await fs.writeFile(path.join(payloadDir, 'sheet.css'), emit.css, 'utf8');
        await fs.writeFile(path.join(payloadDir, 'translation.json'), emit.translation, 'utf8');
        await fs.writeFile(path.join(payloadDir, 'sheet.json'), manifest, 'utf8');
        await fs.writeFile(path.join(payloadDir, 'README.txt'), readme, 'utf8');
        const zipBytes = await writeZip(path.join(fixtureDir, 'upload.zip'), {
          'sheet.html': emit.html,
          'sheet.css': emit.css,
          'translation.json': emit.translation,
          'sheet.json': manifest,
          'README.txt': readme,
        });

        entry.emitBytes = {
          html: Buffer.byteLength(emit.html),
          css: Buffer.byteLength(emit.css),
          translation: Buffer.byteLength(emit.translation),
          zip: zipBytes,
        };
        entry.removedInternalBlockIds = htmlPayload.removed;
        entry.emitSha256 = {
          html: sha256(emit.html),
          css: sha256(emit.css),
          translation: sha256(emit.translation),
        };
        entry.blockingWarnings = blockingExportWarnings({ ...emit, i18n: emit.translation });
        entry.previewScreenshot = path.join(screenshotDir, 'local-preview.png');
        entry.previewDom = await capturePreview(page, entry.previewScreenshot);
        entry.editScreenshot = path.join(screenshotDir, 'local-edit.png');
        entry.editDom = await captureEdit(page, entry.editScreenshot);
        entry.pass =
          (entry.import?.blockCount ?? 0) > 0 &&
          entry.emitBytes.html > 0 &&
          entry.blockingWarnings.length === 0 &&
          entry.previewDom?.elementCount > 0 &&
          entry.editDom?.elementCount > 0;
      } catch (err) {
        entry.pass = false;
        entry.error = err instanceof Error ? err.stack || err.message : String(err);
        entry.emitBytes ??= { html: 0, css: 0, translation: 0, zip: 0 };
        entry.blockingWarnings ??= [];
      }
      report.fixtures.push(entry);
      console.log(`${entry.pass ? 'PASS' : 'FAIL'} ${fixture.id} html=${entry.emitBytes?.html ?? 0} zip=${entry.emitBytes?.zip ?? 0}`);
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }

  report.finishedAt = new Date().toISOString();
  report.pass = report.fixtures.every((item) => item.pass) && pageErrors.length === 0;
  await fs.writeFile(path.join(runDir, 'local-baseline-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(path.join(runDir, 'local-baseline-results.md'), renderMarkdown(report), 'utf8');
  if (!report.pass) process.exitCode = 1;
  console.log(`ROLL20 LOCAL BASELINE ${report.pass ? 'PASS' : 'FAIL'} ${runDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
