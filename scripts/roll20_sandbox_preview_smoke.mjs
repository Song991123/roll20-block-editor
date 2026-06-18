#!/usr/bin/env node
/**
 * Browser smoke for the preview-only Roll20 Custom Sheet Sandbox expected
 * sanitize/prefix render mode.
 *
 * This does not prove actual Roll20 visual parity. It proves the local preview
 * can show the same sanitizer approximation already used by the pre-upload
 * audit and export diagnostics after a real fixture import path.
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
const FIXTURE_ID = argOf('--fixture', 'official-roll20-Les-Oublies');
const REPORT_DIR = path.resolve(argOf('--report-dir', 'reports/roll20-sandbox-preview-smoke'));
const PORT = Number(argOf('--port', '4331'));

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
      res.writeHead(200, {
        'content-type': MIME[path.extname(file)] ?? 'application/octet-stream',
        'cache-control': 'no-store',
      });
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

async function loadFixture(id) {
  const dir = path.join(FIXTURES_DIR, id);
  const html = await readMaybe(path.join(dir, 'source.html'));
  if (!html) throw new Error(`fixture ${id} is missing source.html under ${FIXTURES_DIR}`);
  return {
    id,
    html,
    css: await readMaybe(path.join(dir, 'source.css')),
    i18n: await readMaybe(path.join(dir, 'source.i18n')),
  };
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
    window.__perfHook.setMainMode('preview');
    window.__perfHook.setPreviewRenderMode('iframe');
    window.__perfHook.setPreviewZoom(1);
    window.__perfHook.setRoll20SandboxSanitize(false);
    return last;
  }, fixture);
}

async function getPreviewFrame(page) {
  const handle = await page.waitForSelector('[data-testid="preview-iframe"]', { timeout: 30000 });
  const frame = await handle.contentFrame();
  if (!frame) throw new Error('preview iframe has no content frame');
  await frame.waitForSelector('#charsheet-root', { timeout: 30000 });
  return frame;
}

async function summarizePreview(page) {
  for (let i = 0; i < 30; i += 1) {
    try {
      const frame = await getPreviewFrame(page);
      return await frame.evaluate(() => {
        const root = document.querySelector('#charsheet-root');
        const css = document.querySelector('#r20-user')?.textContent ?? '';
        const rootHtml = root?.innerHTML ?? '';
        return {
          sandboxMode: document.body.getAttribute('data-roll20-sandbox-sanitize') ?? '',
          rootInnerBytes: new TextEncoder().encode(rootHtml).length,
          userCssBytes: new TextEncoder().encode(css).length,
          colgroupCount: root?.querySelectorAll('colgroup, col').length ?? 0,
          rolltemplateCount: root?.querySelectorAll('rolltemplate').length ?? 0,
          sourceWorkerScriptCount: root?.querySelectorAll('script[type="text/worker"]').length ?? 0,
          unprefixedClassSample: Array.from(root?.querySelectorAll('[class]') ?? [])
            .flatMap((el) => Array.from(el.classList))
            .filter((token) =>
              !token.startsWith('sheet-') &&
              !token.startsWith('attr_') &&
              !token.startsWith('repeating_') &&
              !token.startsWith('roll_') &&
              !token.startsWith('act_'),
            )
            .slice(0, 12),
        };
      });
    } catch {
      await page.waitForTimeout(250);
    }
  }
  throw new Error('failed to summarize preview iframe');
}

async function main() {
  await fs.mkdir(REPORT_DIR, { recursive: true });
  const fixture = await loadFixture(FIXTURE_ID);
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1480, height: 960 } });
  const consoleIssues = [];
  const pageErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      consoleIssues.push(`${msg.type()}: ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  const result = {
    status: 'PASS',
    url: `http://127.0.0.1:${PORT}${BASE_PATH}/`,
    fixture: fixture.id,
    startedAt: new Date().toISOString(),
    checks: {},
    consoleIssues,
    pageErrors,
  };

  try {
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem('__perfOn', '1');
        window.localStorage.removeItem('r20be-autosave');
      } catch {}
    });
    await page.goto(result.url, { waitUntil: 'load' });
    await warmPerfHook(page);
    result.checks.importedFixture = await importFixture(page, fixture);
    if ((result.checks.importedFixture?.blockCount ?? 0) <= 0) {
      throw new Error(`fixture ${fixture.id} did not import any blocks`);
    }

    await page.waitForSelector('[data-testid="preview-roll20-sandbox-sanitize-toggle"]', {
      timeout: 15000,
    });

    result.checks.normalPreview = await summarizePreview(page);

    await page.evaluate(() => {
      window.__perfHook.setRoll20SandboxSanitize(true);
    });
    await page.waitForTimeout(800);
    result.checks.sandboxPreview = await summarizePreview(page);

    await page.screenshot({ path: path.join(REPORT_DIR, 'sandbox-preview-page.png'), fullPage: true });

    const failures = [];
    if (result.checks.normalPreview.sandboxMode !== '0') failures.push('normal preview sandbox marker mismatch');
    if (result.checks.sandboxPreview.sandboxMode !== '1') failures.push('sandbox preview marker mismatch');
    if (
      result.checks.normalPreview.rootInnerBytes === result.checks.sandboxPreview.rootInnerBytes &&
      result.checks.normalPreview.userCssBytes === result.checks.sandboxPreview.userCssBytes &&
      result.checks.normalPreview.colgroupCount === result.checks.sandboxPreview.colgroupCount &&
      result.checks.normalPreview.sourceWorkerScriptCount === result.checks.sandboxPreview.sourceWorkerScriptCount
    ) {
      failures.push('sandbox preview did not produce a measurable sanitized render change');
    }
    if (result.checks.sandboxPreview.colgroupCount > result.checks.normalPreview.colgroupCount) {
      failures.push('sandbox preview increased stripped table structure count');
    }
    if (result.checks.sandboxPreview.sourceWorkerScriptCount > 0) {
      failures.push('sandbox preview still has visible source worker scripts in the sheet root');
    }
    if (result.checks.sandboxPreview.rolltemplateCount > 0) {
      failures.push('sandbox preview still has rolltemplates in the sheet root');
    }
    if (consoleIssues.length > 0) failures.push('console errors/warnings present');
    if (pageErrors.length > 0) failures.push('page errors present');

    if (failures.length > 0) {
      result.status = 'FAIL';
      result.failures = failures;
    }
  } finally {
    await browser.close();
    server.close();
  }

  result.finishedAt = new Date().toISOString();
  await fs.writeFile(
    path.join(REPORT_DIR, 'roll20-sandbox-preview-smoke-results.json'),
    `${JSON.stringify(result, null, 2)}\n`,
  );
  await fs.writeFile(
    path.join(REPORT_DIR, 'roll20-sandbox-preview-smoke-results.md'),
    [
      '# Roll20 Sandbox Preview Smoke',
      '',
      `Status: ${result.status}`,
      `Fixture: \`${fixture.id}\``,
      `URL: \`${result.url}\``,
      '',
      'This proves only the local preview toggle and sanitizer approximation path. It is not actual Roll20 visual parity.',
      '',
      '## Checks',
      '',
      '```json',
      JSON.stringify(result.checks, null, 2),
      '```',
      '',
      `Console issues: ${consoleIssues.length}`,
      `Page errors: ${pageErrors.length}`,
      '',
    ].join('\n'),
  );

  console.log(JSON.stringify(result, null, 2));
  if (result.status !== 'PASS') process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
