#!/usr/bin/env node
/**
 * User-facing import dialog smoke.
 *
 * Uses an anonymous HTML snippet and stable test ids rather than translated
 * button text. This keeps the smoke test independent from UI copy changes.
 */

import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const OUT_DIR = path.resolve(process.env.R20_IMPORT_SMOKE_OUT_DIR ?? './out');
const PORT = Number(process.env.R20_IMPORT_SMOKE_PORT ?? '4182');
const BASE_PATH = '/roll20-block-editor';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function startServer() {
  const server = http.createServer(async (request, response) => {
    try {
      let url = decodeURIComponent((request.url ?? '/').split('?')[0]);
      if (url.startsWith(BASE_PATH)) url = url.slice(BASE_PATH.length) || '/';
      if (url.endsWith('/')) url += 'index.html';
      const file = path.join(OUT_DIR, path.normalize(url).replace(/^([/\\])+/, ''));
      if (!file.startsWith(OUT_DIR)) {
        response.writeHead(403).end();
        return;
      }
      response.writeHead(200, {
        'content-type': MIME[path.extname(file)] ?? 'application/octet-stream',
        'cache-control': 'no-store',
      });
      response.end(await fs.readFile(file));
    } catch {
      response.writeHead(404).end('not found');
    }
  });
  return new Promise((resolve) => server.listen(PORT, '127.0.0.1', () => resolve(server)));
}

function assert(value, message) {
  if (!value) throw new Error(message);
}

async function main() {
  const server = await startServer();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1480, height: 960 } });
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error?.stack || String(error)));

  try {
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem('__perfOn', '1');
        window.localStorage.removeItem('r20be-autosave');
        window.localStorage.removeItem('r20-ui');
      } catch {
        // Sandboxed preview frames do not have origin-backed storage.
      }
    });

    const url = `http://127.0.0.1:${PORT}${BASE_PATH}/`;
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForFunction(() => Boolean(window.__perfHook), null, { timeout: 30000 });
    await page.click('[data-testid="empty-import-button"]');
    await page.waitForSelector('[data-testid="import-dialog"]', { state: 'visible', timeout: 15000 });

    const html = '<div class="sheet-root"><label>name</label><input type="text" name="attr_character_name"></div>';
    await page.locator('[data-testid="import-dialog"] textarea').fill(html);
    const importButton = page.getByTestId('import-submit');
    assert(await importButton.count() === 1, 'import submit button is not unique');
    const clickConvert = () => importButton.evaluate((node) => node.click());
    await clickConvert();

    await page.waitForFunction(
      () => {
        const workspace = window.__perfHook.getWorkspace();
        const content = window.__perfHook.getEmitContent();
        return workspace.blockCount.html >= 3
          && content.html.includes('sheet-root')
          && content.html.includes('attr_character_name');
      },
      null,
      { timeout: 20000 },
    );

    const result = await page.evaluate(() => ({
      workspace: window.__perfHook.getWorkspace(),
      html: window.__perfHook.getEmitContent().html,
      dialogStillVisible: Boolean(document.querySelector('[data-testid="import-dialog"]')),
      iframeCount: document.querySelectorAll('[data-testid="preview-iframe"]').length,
    }));
    assert(result.workspace.blockCount.html >= 3, 'dialog import created fewer than three HTML blocks');
    assert(result.iframeCount === 1, `import remounted the preview surface: ${result.iframeCount}`);

    await page.getByRole('tab', { name: 'JS' }).click();
    await page.locator('[data-testid="import-js-textarea"]').fill('window.r20ExternalPageProbe = true;');
    await clickConvert();
    await page.waitForFunction(
      () => window.__perfHook.getEmitContent().js.includes('r20ExternalPageProbe'),
      null,
      { timeout: 20000 },
    );
    const pageJs = await page.evaluate(() => window.__perfHook.getEmitContent());
    assert(pageJs.js.includes('r20ExternalPageProbe'), 'external page JS did not reach the page-JS workspace');

    await page.getByTestId('import-js-kind-worker').click();
    await page.locator('[data-testid="import-js-textarea"]').fill(
      'on("sheet:opened", function () { setAttrs({ external_worker_probe: "1" }); });',
    );
    await clickConvert();
    await page.waitForFunction(
      () => window.__perfHook.getEmitContent().worker.includes('external_worker_probe'),
      null,
      { timeout: 20000 },
    );
    const workerJs = await page.evaluate(() => window.__perfHook.getEmitContent());
    assert(workerJs.worker.includes('external_worker_probe'), 'external worker JS did not reach the worker workspace');

    const previewFrame = page.frames().find((frame) => frame !== page.mainFrame());
    assert(previewFrame, 'persistent preview iframe frame is missing after external JS import');
    await previewFrame.waitForSelector('.charactersheet.charsheet', { state: 'attached', timeout: 20000 });
    const previewRuntime = await previewFrame.evaluate(() => {
      const runtimeNodes = Array.from(document.querySelectorAll('script, rolltemplate'));
      const visibleRuntimeNodes = runtimeNodes.filter((node) => {
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        return style.display !== 'none'
          && style.visibility !== 'hidden'
          && rect.width > 0
          && rect.height > 0;
      });
      return {
        workerScriptCount: document.querySelectorAll('script[type="text/worker"]').length,
        visibleRuntimeNodeCount: visibleRuntimeNodes.length,
      };
    });
    assert(/<script\s+type=["']text\/worker/i.test(workerJs.html), 'worker JS was not retained in the export HTML boundary');
    assert(previewRuntime.visibleRuntimeNodeCount === 0, `runtime node became visible in preview: ${JSON.stringify(previewRuntime)}`);
    assert(consoleErrors.length === 0, `console errors: ${consoleErrors.join(' | ')}`);
    assert(pageErrors.length === 0, `page errors: ${pageErrors.join(' | ')}`);

    console.log(JSON.stringify({
      pass: true,
      result: {
        ...result,
        dialogStillVisible: result.dialogStillVisible,
        externalJs: {
          pageWorkspace: pageJs.js.includes('r20ExternalPageProbe'),
          workerWorkspace: workerJs.worker.includes('external_worker_probe'),
          workerExportedToHtml: /<script\s+type=["']text\/worker/i.test(workerJs.html),
          previewRuntime,
        },
      },
      consoleErrors,
      pageErrors,
    }, null, 2));
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
