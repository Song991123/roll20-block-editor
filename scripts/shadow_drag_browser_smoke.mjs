#!/usr/bin/env node
/**
 * Synthetic browser smoke for the alternate Shadow drag surface.
 *
 * It deliberately imports only an anonymous sheet. The test proves that a
 * generic HTML block without LEFT_PX/TOP_PX moves on the live rendered node
 * and receives a managed absolute position after pointerup.
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
const PORT = Number(argOf('--port', '4198'));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
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
  const page = await browser.newPage({ viewport: { width: 1800, height: 1000 } });
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(String(error)));

  try {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('__perfOn', '1');
        localStorage.removeItem('r20be-autosave');
        localStorage.removeItem('r20-ui');
      } catch {}
    });
    await page.goto(`http://127.0.0.1:${PORT}${BASE_PATH}/`, { waitUntil: 'load' });
    await page.waitForFunction(() => Boolean(window.__perfHook), null, { timeout: 30000 });

    const imported = await page.evaluate(async () => {
      window.__perfHook.clearAll();
      window.__perfHook.setPreviewZoom(1);
      window.__perfHook.setMainMode('preview');
      window.__perfHook.setPreviewRenderMode('shadow');
      const input = {
        html: [
          '<div class="sheet-frame" style="position:relative;width:520px;height:240px;padding:16px;border:1px solid #777">',
          '  <div class="sheet-node" style="width:120px;height:48px;padding:8px;background:#f6bfd1">Move me</div>',
          '</div>',
        ].join('\\n'),
        css: '.sheet-node { color: #432; }',
        i18n: '{}',
      };
      await new Promise((resolve) => setTimeout(resolve, 700));
      let last = null;
      for (let attempt = 0; attempt < 40; attempt += 1) {
        last = await window.__perfHook.importSheet(input);
        if (last?.blockCount > 0) return last;
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      return last;
    });
    assert(imported?.blockCount > 0, 'synthetic import produced no blocks');
    await page.waitForSelector('[data-testid="preview-shadow-host"]', { state: 'visible', timeout: 30000 });
    await page.waitForFunction(
      () => Boolean(document.querySelector('[data-testid="preview-shadow-host"]')?.shadowRoot?.querySelector('#charsheet-root')),
      null,
      { timeout: 30000 },
    );

    const before = await page.evaluate(() => {
      const host = document.querySelector('[data-testid="preview-shadow-host"]');
      const element = host?.shadowRoot?.querySelector('.sheet-node');
      if (!host || !element) return null;
      const rect = element.getBoundingClientRect();
      const computed = getComputedStyle(element);
      return {
        id: element.getAttribute('data-r20-block-id'),
        center: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
        left: Number.parseFloat(computed.left),
        top: Number.parseFloat(computed.top),
        position: computed.position,
      };
    });
    assert(before?.id && Number.isFinite(before.center.x), 'generic shadow target is missing');

    await page.mouse.move(before.center.x, before.center.y);
    await page.mouse.down();
    await page.mouse.move(before.center.x + 96, before.center.y + 56, { steps: 8 });
    await page.mouse.up();

   await page.waitForFunction(
      (blockId) => {
        const content = window.__perfHook.getEmitContent();
        return content.css.includes('r20-design-css:managed')
          && content.html.includes(`data-r20-block-id="${blockId}"`)
          && /position\s*:\s*absolute/i.test(content.css);
      },
      before.id,
      { timeout: 10000 },
    );

    const after = await page.evaluate((blockId) => {
      const host = document.querySelector('[data-testid="preview-shadow-host"]');
      const element = Array.from(host?.shadowRoot?.querySelectorAll('[data-r20-block-id]') ?? [])
        .find((node) => node.getAttribute('data-r20-block-id') === blockId);
      const content = window.__perfHook.getEmitContent();
      const className = element?.getAttribute('class') ?? '';
      const escaped = className.split(/\s+/).find((name) => name.startsWith('sheet-r20-node-')) ?? '';
      const rule = escaped
        ? content.css.match(new RegExp(`\\.${escaped.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\s*\\{[^}]*\\}`, 'i'))?.[0] ?? ''
        : '';
      const computed = element ? getComputedStyle(element) : null;
      return {
        position: computed?.position ?? '',
        left: computed ? Number.parseFloat(computed.left) : null,
        top: computed ? Number.parseFloat(computed.top) : null,
        transform: element?.style.transform ?? '',
        managedClass: escaped,
        managedRule: rule,
        cssHasAbsolute: /position\s*:\s*absolute/i.test(rule),
        cssHasLeft: /left\s*:\s*\d+px/i.test(rule),
        cssHasTop: /top\s*:\s*\d+px/i.test(rule),
      };
    }, before.id);

    assert(after.position === 'absolute', `generic node did not commit absolute position: ${JSON.stringify(after)}`);
    assert(after.cssHasAbsolute && after.cssHasLeft && after.cssHasTop, 'managed CSS position rule is incomplete');
    assert(!after.transform, `temporary drag transform leaked after commit: ${after.transform}`);
    assert(consoleErrors.length === 0, `console errors: ${consoleErrors.join(' | ')}`);
    assert(pageErrors.length === 0, `page errors: ${pageErrors.join(' | ')}`);
    console.log(JSON.stringify({ pass: true, imported, before, after, consoleErrors, pageErrors }, null, 2));
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
