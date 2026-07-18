#!/usr/bin/env node
/**
 * Browser smoke for the first worker-workspace split.
 *
 * Verifies that an imported Roll20 sheet worker script is moved out of the
 * visual HTML workspace, appears in the Worker workspace, and is merged back
 * into final emitted sheet.html as a single Roll20 worker script.
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
const REPORT_DIR = path.resolve(argOf('--report-dir', 'reports/worker-workspace-smoke'));
const PORT = Number(argOf('--port', '4177'));

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

async function main() {
  await fs.mkdir(REPORT_DIR, { recursive: true });
  const server = await startServer();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(err.message));

  const url = `http://127.0.0.1:${PORT}${BASE_PATH}/`;
  try {
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem('__perfOn', '1');
        window.localStorage.removeItem('r20be-autosave');
      } catch {}
    });
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForFunction(() => Boolean(window.__perfHook), null, { timeout: 15000 });
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

    const result = await page.evaluate(async () => {
      const html = `
        <div class="sheet-main">
          <input type="text" name="attr_character_name" value="Worker Smoke">
          <button type="roll" name="roll_test" value="&{template:default} {{name=Smoke}} {{roll=[[1d20]]}}">Roll</button>
        </div>
        <script type="text/worker">
          on("sheet:opened change:strength", function() {
            getAttrs(["strength"], function(values) {
              setAttrs({ strength_mod: Math.floor((parseInt(values.strength || "10", 10) - 10) / 2) });
            });
          });
        </script>
      `;
      const imported = await window.__perfHook.importSheet({ html, css: '', i18n: '{}' });
      await new Promise((resolve) => setTimeout(resolve, 200));
      const workspace = window.__perfHook.getWorkspace();
      const htmlGraph = window.__perfHook.getBlockGraph('html');
      const workerGraph = window.__perfHook.getBlockGraph('worker');
      const emit = window.__perfHook.getEmitContent();
      const parsedHtml = `
        <div class="sheet-main"><input type="text" name="attr_hp"></div>
        <script type="text/worker">
          on('change:hp', () => {
            setAttrs({ 'hp': 10 });
          });
          on('clicked:roll', () => {
            setAttrs({ 'hp': 11 });
          });
        </script>
      `;
      const parsedImported = await window.__perfHook.importSheet({ html: parsedHtml, css: '', i18n: '{}' });
      await new Promise((resolve) => setTimeout(resolve, 120));
      const parsedWorkerGraph = window.__perfHook.getBlockGraph('worker');
      const parsedEmit = window.__perfHook.getEmitContent();
      return {
        imported,
        workspace,
        htmlWorkerTypes: htmlGraph.filter((b) => /^(r20_raw_worker|r20_on_|r20_worker_|r20_get_attrs|r20_set_attrs)/.test(b.type)).map((b) => b.type),
        workerTypes: workerGraph.map((b) => b.type),
        emitHasWorkerScript: /<script\s+type=["']text\/worker["']>/i.test(emit.html),
        emitWorkerBodyLen: emit.worker.length,
        emitWorkerScriptCount: (emit.html.match(/<script\s+type=["']text\/worker["']>/gi) ?? []).length,
        emitHtmlLen: emit.html.length,
        parsedImported,
        parsedWorkerTypes: parsedWorkerGraph.map((b) => b.type),
        parsedWorkerTopLevelCount: parsedWorkerGraph.filter((b) => !b.parentId).length,
        parsedEmitWorkerScriptCount: (parsedEmit.html.match(/<script\s+type=["']text\/worker["']>/gi) ?? []).length,
        parsedEmitWorker: parsedEmit.worker,
      };
    });

    const pass =
      result.workspace.blockCount.worker > 0 &&
      result.imported.workerBlockCount > 0 &&
      result.htmlWorkerTypes.length === 0 &&
      result.workerTypes.length > 0 &&
      result.emitHasWorkerScript &&
      result.emitWorkerBodyLen > 0 &&
      result.emitWorkerScriptCount === 1 &&
      result.parsedWorkerTypes.includes('r20_on_attr_change') &&
      result.parsedWorkerTypes.includes('r20_set_attrs') &&
      result.parsedWorkerTypes.includes('r20_on_button_click') &&
      result.parsedWorkerTopLevelCount === 2 &&
      result.parsedEmitWorkerScriptCount === 1 &&
      result.parsedEmitWorker.includes("setAttrs({ 'hp': 10 });") &&
      consoleErrors.length === 0;

    const report = {
      ok: pass,
      url,
      consoleErrors,
      result,
      generatedAt: new Date().toISOString(),
    };
    await fs.writeFile(
      path.join(REPORT_DIR, 'worker-workspace-smoke-results.json'),
      JSON.stringify(report, null, 2),
      'utf8',
    );
    await fs.writeFile(
      path.join(REPORT_DIR, 'worker-workspace-smoke-results.md'),
      [
        '# Worker Workspace Smoke',
        '',
        `- Status: ${pass ? 'PASS' : 'FAIL'}`,
        `- Worker blocks: ${result.workspace.blockCount.worker}`,
        `- HTML worker blocks remaining: ${result.htmlWorkerTypes.length}`,
        `- Emitted worker script count: ${result.emitWorkerScriptCount}`,
        `- Parsed worker blocks: ${result.parsedWorkerTypes.join(', ')}`,
        `- Parsed worker script count: ${result.parsedEmitWorkerScriptCount}`,
        `- Console errors: ${consoleErrors.length}`,
        '',
      ].join('\n'),
      'utf8',
    );

    if (!pass) {
      console.error(JSON.stringify(report, null, 2));
      process.exitCode = 1;
    } else {
      console.log(`PASS worker workspace smoke -> ${path.join(REPORT_DIR, 'worker-workspace-smoke-results.md')}`);
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
