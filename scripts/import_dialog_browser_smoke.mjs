#!/usr/bin/env node
/**
 * User-facing import dialog smoke.
 *
 * Uses only an anonymous HTML snippet. This intentionally exercises the
 * visible dialog instead of calling the diagnostic perf hook directly.
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
      response.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream' });
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
    await page.getByRole('button', { name: '블록으로 변환하기' }).click();

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
    assert(consoleErrors.length === 0, `console errors: ${consoleErrors.join(' | ')}`);
    assert(pageErrors.length === 0, `page errors: ${pageErrors.join(' | ')}`);
    console.log(JSON.stringify({ pass: true, result, consoleErrors, pageErrors }, null, 2));
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
