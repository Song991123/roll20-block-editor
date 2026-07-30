#!/usr/bin/env node
/**
 * worker_source_audit.mjs
 *
 * Local-only audit for Roll20 sheet worker source preservation.
 *
 * It compares each fixture's source `<script type="text/worker">` body with
 * the app's emitted worker body after browser import. This does not claim
 * runtime parity with Roll20; it catches severe mapping failures before the
 * generated sheet is uploaded to the Roll20 sandbox/test room.
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
const REPORT_DIR = path.resolve(argOf('--report-dir', 'reports/worker-source-audit'));
const FIXTURES_DIR = path.resolve(argOf('--fixtures', '.tmp/visual-synthetic'));
const ONLY = argOf('--only', '');
const PORT = Number(argOf('--port', '4182'));

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

function parseAttrs(raw) {
  const attrs = {};
  const attrRe = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>/]+)))?/g;
  let match;
  while ((match = attrRe.exec(raw))) {
    attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return attrs;
}

function extractWorkerScripts(html) {
  const scripts = [];
  const scriptRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRe.exec(html))) {
    const attrs = parseAttrs(match[1] ?? '');
    const type = String(attrs.type ?? '').trim().toLowerCase();
    if (type === 'text/worker' || type === '') {
      scripts.push({
        type: type || '(empty)',
        body: match[2] ?? '',
      });
    }
  }
  return scripts;
}

function dedentCommonIndent(text) {
  const lines = text.split('\n');
  let min = Infinity;
  for (const line of lines) {
    if (!line.trim()) continue;
    const m = /^[ \t]*/.exec(line);
    min = Math.min(min, m?.[0].length ?? 0);
  }
  if (!Number.isFinite(min) || min <= 0) return text;
  return lines.map((line) => (line.trim() ? line.slice(min) : line)).join('\n');
}

function canonicalWorker(text) {
  return dedentCommonIndent(
    String(text ?? '')
      .replace(/\r\n?/g, '\n')
      .replace(/^\n+/, '')
      .replace(/\n+[ \t]*$/g, ''),
  ).trim();
}

function firstDiffIndex(a, b) {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i += 1) if (a[i] !== b[i]) return i;
  return a.length === b.length ? -1 : n;
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

async function main() {
  await fs.mkdir(REPORT_DIR, { recursive: true });
  const fixtures = await listFixtures();
  if (fixtures.length === 0) {
    console.error(`no fixtures with source.html under ${FIXTURES_DIR}`);
    process.exitCode = 1;
    return;
  }

  const server = await startServer();
  const browser = await chromium.launch();
  const results = {
    startedAt: new Date().toISOString(),
    fixturesDir: FIXTURES_DIR,
    fixtures: [],
  };

  try {
    for (const fixture of fixtures) {
      const page = await browser.newPage({ viewport: { width: 1480, height: 960 } });
      const consoleErrors = [];
      const pageErrors = [];
      page.on('console', (m) => {
        if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 500));
      });
      page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 500)));
      await page.addInitScript(() => {
        try {
          window.localStorage.setItem('__perfOn', '1');
          window.localStorage.removeItem('r20be-autosave');
        } catch {}
      });
      await page.goto(`http://127.0.0.1:${PORT}${BASE_PATH}/`, { waitUntil: 'load' });
      await warmPerfHook(page);

      const sourceScripts = extractWorkerScripts(fixture.html);
      const sourceWorker = sourceScripts.map((s) => canonicalWorker(s.body)).join('\n').trim();
      const audit = await page.evaluate(async ({ html, css, i18n }) => {
        const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const importLive = async (input) => {
          let last = null;
          for (let i = 0; i < 30; i += 1) {
            last = await window.__perfHook.importSheet(input);
            if (last.blockCount > 0) return last;
            await sleep(500);
          }
          return last;
        };
        window.__perfHook.clearAll();
        await sleep(600);
        const imported = await importLive({ html, css, i18n });
        const emit = window.__perfHook.getEmitContent();
        const workspace = window.__perfHook.getWorkspace();
        const workerGraph = window.__perfHook.getBlockGraph('worker');
        return {
          imported,
          workspace,
          workerTypes: workerGraph.map((b) => b.type),
          emitWorker: emit.worker,
          emitHtmlWorkerScriptCount: (emit.html.match(/<script\s+type=["']text\/worker["']>/gi) ?? []).length,
        };
      }, fixture);
      const emittedWorker = canonicalWorker(audit.emitWorker);
      const exactCanonicalMatch = sourceWorker === emittedWorker;
      const diffAt = exactCanonicalMatch ? -1 : firstDiffIndex(sourceWorker, emittedWorker);
      const blocking =
        sourceScripts.length > 0 &&
        (audit.workspace.blockCount.worker <= 0 ||
          audit.imported.workerBlockCount <= 0 ||
          emittedWorker.length === 0 ||
          audit.emitHtmlWorkerScriptCount <= 0 ||
          !exactCanonicalMatch);
      const entry = {
        id: fixture.id,
        sourceWorkerScriptCount: sourceScripts.length,
        sourceWorkerLen: sourceWorker.length,
        emittedWorkerLen: emittedWorker.length,
        emittedWorkerScriptCount: audit.emitHtmlWorkerScriptCount,
        workerBlockCount: audit.workspace.blockCount.worker,
        importedWorkerBlockCount: audit.imported.workerBlockCount,
        workerTypes: Array.from(new Set(audit.workerTypes)).sort(),
        exactCanonicalMatch,
        diffAt,
        diffSample: exactCanonicalMatch
          ? null
          : {
              source: sourceWorker.slice(Math.max(0, diffAt - 100), diffAt + 160),
              emitted: emittedWorker.slice(Math.max(0, diffAt - 100), diffAt + 160),
            },
        blocking,
        consoleErrors,
        pageErrors,
      };
      entry.pass = !blocking && pageErrors.length === 0;
      results.fixtures.push(entry);
      console.log(
        `${entry.pass ? 'PASS' : 'FAIL'} ${entry.id} scripts=${entry.sourceWorkerScriptCount} workerBlocks=${entry.workerBlockCount} exact=${entry.exactCanonicalMatch ? 'yes' : 'no'}`,
      );
      await page.close();
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }

  results.finishedAt = new Date().toISOString();
  results.pass = results.fixtures.every((f) => f.pass);
  const exactCount = results.fixtures.filter((f) => f.exactCanonicalMatch).length;
  const withWorker = results.fixtures.filter((f) => f.sourceWorkerScriptCount > 0).length;
  await fs.writeFile(
    path.join(REPORT_DIR, 'worker-source-audit-results.json'),
    JSON.stringify(results, null, 2),
    'utf8',
  );
  await fs.writeFile(
    path.join(REPORT_DIR, 'worker-source-audit-results.md'),
    [
      '# Worker Source Audit',
      '',
      `- Status: ${results.pass ? 'PASS' : 'FAIL'}`,
      `- Fixtures: ${results.fixtures.length}`,
      `- Fixtures with source worker scripts: ${withWorker}`,
      `- Exact canonical source/emitted worker matches: ${exactCount}/${results.fixtures.length}`,
      '',
      '| Fixture | Source scripts | Worker blocks | Emit scripts | Exact canonical match | Blocking |',
      '| --- | ---: | ---: | ---: | --- | --- |',
      ...results.fixtures.map(
        (f) =>
          `| ${f.id} | ${f.sourceWorkerScriptCount} | ${f.workerBlockCount} | ${f.emittedWorkerScriptCount} | ${f.exactCanonicalMatch ? 'yes' : 'no'} | ${f.blocking ? 'yes' : 'no'} |`,
      ),
      '',
      'Exact canonical match is the local preservation gate for fixtures with source worker scripts. Actual Roll20 worker runtime parity still requires Sandbox/test-room verification.',
      '',
    ].join('\n'),
    'utf8',
  );

  if (!results.pass) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
