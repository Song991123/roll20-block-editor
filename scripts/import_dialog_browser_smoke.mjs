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
import JSZip from 'jszip';

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
      const body = await fs.readFile(file);
      response.writeHead(200, {
        'content-type': MIME[path.extname(file)] ?? 'application/octet-stream',
        'cache-control': 'no-store',
      });
      response.end(body);
    } catch {
      if (!response.headersSent) response.writeHead(404);
      if (!response.writableEnded) response.end('not found');
    }
  });
  return new Promise((resolve) => server.listen(PORT, '127.0.0.1', () => resolve(server)));
}

function assert(value, message) {
  if (!value) throw new Error(message);
}

async function main() {
  try {
    await fs.access(path.join(OUT_DIR, 'index.html'));
  } catch {
    throw new Error(`Static output is missing at ${OUT_DIR}. Run \"pnpm build\" before this smoke.`);
  }
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
    // Use Playwright's actionability checks and pointer path so this smoke
    // exercises the same delegated React event route as a real user click.
    const clickConvert = () => importButton.click();
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
    const importResult = page.getByTestId('import-result');
    assert(await importResult.count() === 1, 'import result panel is not unique');
    const importResultText = await importResult.innerText();
    assert(importResultText.includes('HTML 구조화'), 'import result hides the HTML coverage scope');
    assert(importResultText.includes('CSS 구조화'), 'import result hides the CSS coverage scope');
    assert(importResultText.includes('HTML + CSS 전체 구조화 일치율'), 'import result hides combined coverage');

    await page.getByRole('tab', { name: 'CSS' }).click();
    const cssTextarea = page.locator('[data-testid="import-dialog"] [data-state="active"] textarea');
    assert(await cssTextarea.count() === 1, 'active CSS textarea is not unique');
    await cssTextarea.fill('.sheet-root { color: red; } @layer reset;');
    await clickConvert();
    await page.waitForSelector('[data-testid="import-css-fallback-warning"]', {
      state: 'visible',
      timeout: 20000,
    });
    const warningDetails = page.getByTestId('import-warning-details');
    assert(await warningDetails.count() === 1, 'import warning details are missing');
    const warningSummary = warningDetails.locator('summary');
    assert(await warningSummary.count() === 1, 'import warning summary is not unique');
    await warningSummary.click();
    assert((await warningDetails.innerText()).includes('확인할 항목'), 'warning details did not open');
    await page.waitForFunction(
      () => window.__perfHook.getEmitContent().css.includes('.sheet-root'),
      null,
      { timeout: 20000 },
    );
    const cssFrame = page.frames().find((frame) => frame !== page.mainFrame());
    assert(cssFrame, 'persistent preview iframe frame is missing after CSS import');
    const computedSheetColor = await cssFrame.locator('.sheet-root').evaluate(
      (node) => getComputedStyle(node).color,
    );
    assert(
      computedSheetColor === 'rgb(255, 0, 0)',
      `fallback CSS did not reach the preview surface: ${computedSheetColor}`,
    );

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
    assert(pageJs.html.includes('r20ExternalPageProbe'), 'authored page JS was lost from source emission');

    await page.keyboard.press('Escape');
    await page.waitForSelector('[data-testid="import-dialog"]', { state: 'detached', timeout: 5000 });
    await page.click('[data-testid="header-export-button"]');
    await page.waitForSelector('[data-testid="export-warnings"]', { state: 'visible', timeout: 15000 });
    const exportScriptBoundary = await page.evaluate(() => {
      const warningText = document.querySelector('[data-testid="export-warnings"]')?.textContent ?? '';
      return {
        hasUnsupportedWarning: warningText.includes('export.script.unsupported_page_js'),
        hasBackupName: warningText.includes('unsupported-script-source.txt'),
        downloadEnabled: !document.querySelector('[data-testid="export-download-button"]')?.disabled,
      };
    });
    assert(exportScriptBoundary.hasUnsupportedWarning, 'export dialog hides unsupported page-JS warning');
    assert(exportScriptBoundary.hasBackupName, 'export dialog hides script backup file name');
    assert(exportScriptBoundary.downloadEnabled, 'unsupported page JS incorrectly blocks ZIP export');

    await page.evaluate(() => {
      window.__r20CapturedZip = '';
      const originalClick = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function captureZipClick() {
        if (this.download.endsWith('.zip') && this.href.startsWith('blob:')) {
          void fetch(this.href)
            .then((response) => response.arrayBuffer())
            .then((buffer) => {
              const bytes = new Uint8Array(buffer);
              let binary = '';
              for (let offset = 0; offset < bytes.length; offset += 0x8000) {
                binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
              }
              window.__r20CapturedZip = btoa(binary);
            })
            .catch((error) => {
              window.__r20CapturedZip = `ERROR:${String(error)}`;
            });
        }
        return originalClick.call(this);
      };
    });
    await page.click('[data-testid="export-download-button"]');
    await page.waitForFunction(
      () => typeof window.__r20CapturedZip === 'string' && window.__r20CapturedZip.length > 0,
      null,
      { timeout: 15000 },
    );
    const capturedZip = await page.evaluate(() => window.__r20CapturedZip);
    assert(!capturedZip.startsWith('ERROR:'), `could not read exported ZIP: ${capturedZip}`);
    const downloadedZip = await JSZip.loadAsync(Buffer.from(capturedZip, 'base64'));
    const sheetHtml = await downloadedZip.file('sheet.html')?.async('string');
    const backupSource = await downloadedZip.file('unsupported-script-source.txt')?.async('string');
    const exportZipBoundary = {
      ordinaryScriptRemoved: !sheetHtml?.includes('r20ExternalPageProbe'),
      backupPreserved: Boolean(backupSource?.includes('r20ExternalPageProbe')),
      backupIsTextOnly: Boolean(downloadedZip.file('unsupported-script-source.txt')),
    };
    assert(exportZipBoundary.ordinaryScriptRemoved, 'downloaded sheet.html retained ordinary page JS');
    assert(exportZipBoundary.backupPreserved, 'downloaded ZIP lost ordinary page JS backup');
    assert(exportZipBoundary.backupIsTextOnly, 'downloaded ZIP backup is missing');
    await page.waitForSelector('[data-testid="export-warnings"]', { state: 'detached', timeout: 5000 });

    await page.click('[data-testid="header-import-button"]');
    await page.waitForSelector('[data-testid="import-dialog"]', { state: 'visible', timeout: 15000 });
    await page.getByRole('tab', { name: 'JS' }).click();

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
          exportScriptBoundary,
          exportZipBoundary,
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
