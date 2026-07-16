#!/usr/bin/env node
/**
 * Proves that the canonical preview iframe survives preview -> edit -> preview
 * without node replacement, reload, or loss of live input/runtime state.
 * Runs modern and legacy as independent contracts. Local static-app evidence
 * only; this is not actual Roll20 visual parity.
 */

import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
function argOf(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

const OUT_DIR = path.resolve(argOf('--out-dir', './out'));
const BASE_PATH = argOf('--base-path', '/roll20-block-editor');
const REPORT_DIR = path.resolve(argOf('--report-dir', 'reports/persistent-preview-surface'));
const PORT = Number(argOf('--port', '4198'));
const MODES = ['modern', 'legacy'];

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

async function warmPerfHook(page) {
  await page.waitForFunction(() => Boolean(window.__perfHook), null, { timeout: 30000 });
  await page.waitForFunction(
    async () => {
      try {
        const result = await window.__perfHook.importSheet({ html: '<div>ready</div>' });
        return result.blockCount > 0;
      } catch {
        return false;
      }
    },
    null,
    { timeout: 30000, polling: 500 },
  );
}

async function runMode(browser, mode) {
  const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text().slice(0, 500));
  });
  page.on('pageerror', (error) => pageErrors.push(String(error).slice(0, 500)));
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('__perfOn', '1');
      window.localStorage.removeItem('r20be-autosave');
    } catch {}
  });

  const result = { mode, pass: false };
  try {
    await page.goto(`http://127.0.0.1:${PORT}${BASE_PATH}/`, { waitUntil: 'load' });
    await warmPerfHook(page);
    result.import = await page.evaluate(async () => {
      window.__perfHook.clearAll();
      return window.__perfHook.importSheet({
        html: '<div class="sheet-probe-card"><input type="text" name="attr_probe" value="initial"></div>',
        css: '.sheet-probe-card { width: 320px; min-height: 80px; padding: 12px; }',
      });
    });
    await page.evaluate((compatibilityMode) => {
      window.__perfHook.setRoll20CompatibilityMode(compatibilityMode);
      window.__perfHook.setMainMode('preview');
    }, mode);

    const expectedSelector = '.sheet-probe-card';
    const iframe = page.locator('[data-testid="preview-iframe"]');
    await iframe.waitFor({ state: 'visible', timeout: 30000 });
    await page.waitForFunction(
      ({ expectedLegacyStyle }) => {
        const srcdoc = document
          .querySelector('[data-testid="preview-iframe"]')
          ?.getAttribute('srcdoc') ?? '';
        return srcdoc.includes('class="sheet-probe-card"')
          && srcdoc.includes('id="roll20-legacy-input-state"') === expectedLegacyStyle;
      },
      { expectedLegacyStyle: mode === 'legacy' },
      { timeout: 30000 },
    );
    const handle = await iframe.elementHandle();
    const frame = await handle?.contentFrame();
    if (!frame) throw new Error('preview iframe content frame unavailable');
    await frame.locator(expectedSelector).waitFor({ state: 'visible', timeout: 30000 });
    const input = frame.locator('input[name="attr_probe"]');
    await input.fill(`runtime-${mode}`);
    const token = `token-${mode}-${Date.now()}`;
    await frame.evaluate((value) => {
      window.__persistentPreviewRuntimeToken = value;
    }, token);
    result.before = await page.evaluate(() => {
      const iframeEl = document.querySelector('[data-testid="preview-iframe"]');
      window.__persistentPreviewIframeElement = iframeEl;
      window.__persistentPreviewLoadCount = 0;
      iframeEl?.addEventListener('load', () => {
        window.__persistentPreviewLoadCount += 1;
      });
      return {
        iframeCount: document.querySelectorAll('[data-testid="preview-iframe"]').length,
        paneVisible: document.querySelector('[data-testid="preview-pane"]')?.getAttribute('data-visible'),
        hasLegacyInputStyle: iframeEl?.getAttribute('srcdoc')?.includes('id="roll20-legacy-input-state"') ?? false,
      };
    });

    await page.evaluate(() => window.__perfHook.setMainMode('edit'));
    await page.locator('[data-testid="edit-canvas-root"]').waitFor({ state: 'visible', timeout: 30000 });
    result.duringEdit = await page.evaluate(() => {
      const current = document.querySelector('[data-testid="preview-iframe"]');
      return {
        sameElement: current === window.__persistentPreviewIframeElement,
        connected: Boolean(current?.isConnected),
        iframeCount: document.querySelectorAll('[data-testid="preview-iframe"]').length,
        paneVisible: document.querySelector('[data-testid="preview-pane"]')?.getAttribute('data-visible'),
        shadowCount: document.querySelectorAll('[data-testid="edit-canvas-shadow-host"]').length,
        loadCount: window.__persistentPreviewLoadCount,
      };
    });
    result.hiddenInputValue = await input.inputValue();
    result.hiddenRuntimeToken = await frame.evaluate(() => window.__persistentPreviewRuntimeToken);

    await page.evaluate(() => window.__perfHook.setMainMode('preview'));
    await iframe.waitFor({ state: 'visible', timeout: 30000 });
    result.after = await page.evaluate(() => {
      const current = document.querySelector('[data-testid="preview-iframe"]');
      return {
        sameElement: current === window.__persistentPreviewIframeElement,
        connected: Boolean(current?.isConnected),
        iframeCount: document.querySelectorAll('[data-testid="preview-iframe"]').length,
        paneVisible: document.querySelector('[data-testid="preview-pane"]')?.getAttribute('data-visible'),
        loadCount: window.__persistentPreviewLoadCount,
      };
    });
    result.afterInputValue = await input.inputValue();
    result.afterRuntimeToken = await frame.evaluate(() => window.__persistentPreviewRuntimeToken);
    result.consoleErrors = consoleErrors;
    result.pageErrors = pageErrors;
    result.pass =
      result.import?.blockCount > 0
      && result.before.iframeCount === 1
      && result.before.paneVisible === 'true'
      && result.before.hasLegacyInputStyle === (mode === 'legacy')
      && result.duringEdit.sameElement
      && result.duringEdit.connected
      && result.duringEdit.iframeCount === 1
      && result.duringEdit.paneVisible === 'false'
      && result.duringEdit.shadowCount === 1
      && result.duringEdit.loadCount === 0
      && result.hiddenInputValue === `runtime-${mode}`
      && result.hiddenRuntimeToken === token
      && result.after.sameElement
      && result.after.connected
      && result.after.iframeCount === 1
      && result.after.paneVisible === 'true'
      && result.after.loadCount === 0
      && result.afterInputValue === `runtime-${mode}`
      && result.afterRuntimeToken === token
      && consoleErrors.length === 0
      && pageErrors.length === 0;
  } catch (error) {
    result.error = String(error?.stack || error).slice(0, 1500);
    result.consoleErrors = consoleErrors;
    result.pageErrors = pageErrors;
  } finally {
    await page.close();
  }
  return result;
}

async function main() {
  await fs.mkdir(REPORT_DIR, { recursive: true });
  const server = await startServer();
  const browser = await chromium.launch();
  const report = { startedAt: new Date().toISOString(), modes: [] };
  try {
    for (const mode of MODES) {
      const result = await runMode(browser, mode);
      report.modes.push(result);
      console.log(`${result.pass ? 'PASS' : 'FAIL'} persistent-preview mode=${mode} loads=${result.after?.loadCount ?? 'n/a'}`);
    }
  } finally {
    await browser.close();
    server.close();
  }
  report.finishedAt = new Date().toISOString();
  report.pass = report.modes.every((mode) => mode.pass);
  await fs.writeFile(
    path.join(REPORT_DIR, 'persistent-preview-surface-results.json'),
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8',
  );
  console.log(report.pass ? 'PERSISTENT PREVIEW SURFACE PASS' : 'PERSISTENT PREVIEW SURFACE FAIL');
  process.exitCode = report.pass ? 0 : 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
