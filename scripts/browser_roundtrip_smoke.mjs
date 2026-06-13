#!/usr/bin/env node
/**
 * browser_roundtrip_smoke.mjs
 *
 * First REAL browser L2 roundtrip (docs/qa/31_active_todo.md P0):
 *   in headless Chromium, for each prepared fixture:
 *     r1 = window.__perfHook.importSheet({html, css, i18n})   (real import pipeline)
 *     e1 = window.__perfHook.getEmitContent()                  (emitted HTML/CSS/i18n)
 *     clearAll
 *     r2 = window.__perfHook.importSheet(e1)                   (re-import of own emit)
 *     e2 = window.__perfHook.getEmitContent()
 *   PASS per fixture when e1 === e2 (html/css/i18n string equality),
 *   r1.blockCount === r2.blockCount, and no page errors.
 *
 * This proves browser-side import->emit->import->emit stability (L2
 * determinism through the live app bundle). It does NOT prove visual parity
 * or that the emit matches the original source byte-for-byte.
 *
 * Usage:
 *   node scripts/browser_roundtrip_smoke.mjs \
 *     --out-dir ./out --report-dir reports/roundtrip-browser \
 *     [--fixtures test-fixtures/visual] [--only yshy-commission-1bu] [--port 4180]
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
const REPORT_DIR = path.resolve(argOf('--report-dir', 'reports/roundtrip-browser'));
const FIXTURES_DIR = path.resolve(argOf('--fixtures', 'test-fixtures/visual'));
const ONLY = argOf('--only', '');
const PORT = Number(argOf('--port', '4180'));

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

/**
 * Block ids (`data-r20-block-id="..."`) are regenerated randomly on every
 * import, so raw emit strings can never be byte-equal across a re-import.
 * Strip them before comparing; report raw equality separately.
 */
function stripBlockIds(html) {
  return html.replace(/\s*data-r20-block-id="[^"]*"/g, '');
}

function firstDiffIndex(a, b) {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i += 1) if (a[i] !== b[i]) return i;
  return a.length === b.length ? -1 : n;
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
  return out;
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
  const results = { startedAt: new Date().toISOString(), fixtures: [] };

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
    await page.waitForFunction(() => Boolean(window.__perfHook), null, { timeout: 30000 });
    // Blockly lazy init: wait until a trivial import works end to end.
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

    const entry = { id: fixture.id, sourceBytes: { html: fixture.html.length, css: fixture.css.length, i18n: fixture.i18n.length } };
    try {
      const roundtrip = await page.evaluate(
        async ({ html, css, i18n }) => {
          // clearAll resets the workspace store, which remounts the Blockly
          // hosts; the adapter only re-registers workspaces on the next render.
          // An import issued in the same tick lands in the disposed workspace
          // and silently yields 0 blocks / empty emit (hollow pass). Retry the
          // import until it produces live blocks.
          const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
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
          const r1 = await importLive({ html, css, i18n });
          const e1 = window.__perfHook.getEmitContent();
          window.__perfHook.clearAll();
          await sleep(600);
          const r2 = await importLive({
            html: e1.html,
            css: e1.css,
            i18n: e1.i18n,
          });
          const e2 = window.__perfHook.getEmitContent();
          return { r1, e1, r2, e2 };
        },
        fixture,
      );
      const { r1, e1, r2, e2 } = roundtrip;
      entry.import1 = { ms: Math.round(r1.totalMs), blockCount: r1.blockCount, matchPct: r1.matchPct, warnings: r1.warnings };
      entry.import2 = { ms: Math.round(r2.totalMs), blockCount: r2.blockCount, matchPct: r2.matchPct, warnings: r2.warnings };
      entry.emit1 = { htmlLen: e1.html.length, cssLen: e1.css.length, i18nLen: e1.i18n.length };
      entry.emit2 = { htmlLen: e2.html.length, cssLen: e2.css.length, i18nLen: e2.i18n.length };
      const n1 = stripBlockIds(e1.html);
      const n2 = stripBlockIds(e2.html);
      entry.stable = {
        html: n1 === n2,
        htmlRawWithIds: e1.html === e2.html,
        css: e1.css === e2.css,
        i18n: e1.i18n === e2.i18n,
        blockCount: r1.blockCount === r2.blockCount,
      };
      if (!entry.stable.html) {
        const i = firstDiffIndex(n1, n2);
        entry.htmlFirstDiff = { index: i, e1: n1.slice(Math.max(0, i - 60), i + 60), e2: n2.slice(Math.max(0, i - 60), i + 60) };
      }
      if (!entry.stable.css) {
        const i = firstDiffIndex(e1.css, e2.css);
        entry.cssFirstDiff = { index: i, e1: e1.css.slice(Math.max(0, i - 60), i + 60), e2: e2.css.slice(Math.max(0, i - 60), i + 60) };
      }
      if (!entry.stable.i18n) {
        const i = firstDiffIndex(e1.i18n, e2.i18n);
        entry.i18nFirstDiff = { index: i, e1: e1.i18n.slice(Math.max(0, i - 60), i + 60), e2: e2.i18n.slice(Math.max(0, i - 60), i + 60) };
      }
      entry.pass =
        entry.stable.html &&
        entry.stable.css &&
        entry.stable.i18n &&
        entry.stable.blockCount &&
        r1.blockCount > 0 &&
        e1.html.length > 0 &&
        pageErrors.length === 0;
    } catch (err) {
      entry.error = String(err).slice(0, 800);
      entry.pass = false;
    }
    entry.consoleErrors = consoleErrors;
    entry.pageErrors = pageErrors;
    results.fixtures.push(entry);
    console.log(`${entry.pass ? 'PASS' : 'FAIL'} ${fixture.id} import1=${entry.import1?.ms}ms blocks=${entry.import1?.blockCount} match=${entry.import1?.matchPct}%`);
    await page.close();
  }

  await browser.close();
  server.close();

  results.pass = results.fixtures.every((f) => f.pass);
  results.finishedAt = new Date().toISOString();
  await fs.writeFile(
    path.join(REPORT_DIR, 'browser-roundtrip-results.json'),
    JSON.stringify(results, null, 2),
  );
  console.log(results.pass ? 'ROUNDTRIP PASS' : 'ROUNDTRIP FAIL');
  process.exitCode = results.pass ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
