#!/usr/bin/env node
/**
 * Browser smoke for Roll20 sheet worker state selectors.
 *
 * Roll20 sheets often use hidden inputs plus CSS attribute selectors such as
 * `.sheet-tabstoggle[value="character"] ~ .sheet-character`. This smoke proves
 * the local preview worker simulator updates both DOM properties and DOM
 * attributes after `setAttrs`, so CSS state selectors can react like Roll20.
 *
 * Scope: local static app preview iframe only. This is not actual Roll20 parity.
 *
 * Usage:
 *   node scripts/sheet_worker_state_smoke.mjs \
 *     --out-dir ./out --base-path /roll20-block-editor \
 *     --report-dir reports/sheet-worker-state-smoke
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
const REPORT_DIR = path.resolve(argOf('--report-dir', 'reports/sheet-worker-state-smoke'));
const PORT = Number(argOf('--port', '4198'));
const VIEWPORT = { width: 1280, height: 900 };

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

const SYNTHETIC_SHEET = {
  html: `
<div class="tabs">
  <input type="hidden" class="tabstoggle" name="attr_sheetTab" value="combat">
  <button type="action" name="act_character">Character</button>
  <button type="action" name="act_combat">Combat</button>
  <div class="character">Character panel</div>
  <div class="combat">Combat panel</div>
</div>
<script type="text/worker">
  on("clicked:character", function () {
    setAttrs({ sheetTab: "character" });
  });
  on("clicked:combat", function () {
    setAttrs({ sheetTab: "combat" });
  });
</script>
`,
  css: `
.tabstoggle ~ .character,
.tabstoggle ~ .combat {
  display: none;
}
.tabstoggle[value="character"] ~ .character {
  display: block;
  color: rgb(20, 120, 40);
}
.tabstoggle[value="combat"] ~ .combat {
  display: block;
  color: rgb(120, 40, 20);
}
`,
  i18n: '{}',
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

async function importSynthetic(page) {
  return page.evaluate(async (sheet) => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    window.__perfHook.clearAll();
    await sleep(300);
    const result = await window.__perfHook.importSheet(sheet);
    window.__perfHook.setPreviewRenderMode('iframe');
    window.__perfHook.setPreviewZoom(1);
    window.__perfHook.setMainMode('preview');
    return result;
  }, SYNTHETIC_SHEET);
}

async function readState(frame) {
  return frame.evaluate(() => {
    const input = document.querySelector('[name="attr_sheetTab"]');
    const character = document.querySelector('.sheet-character');
    const combat = document.querySelector('.sheet-combat');
    const charStyle = character ? getComputedStyle(character) : null;
    const combatStyle = combat ? getComputedStyle(combat) : null;
    return {
      inputValueProperty: input?.value ?? null,
      inputValueAttribute: input?.getAttribute('value') ?? null,
      characterDisplay: charStyle?.display ?? null,
      combatDisplay: combatStyle?.display ?? null,
      characterText: character?.textContent?.trim() ?? '',
      combatText: combat?.textContent?.trim() ?? '',
    };
  });
}

function passForState(state, expected) {
  const other = expected === 'character' ? 'combat' : 'character';
  return (
    state.inputValueProperty === expected &&
    state.inputValueAttribute === expected &&
    state[`${expected}Display`] !== 'none' &&
    state[`${other}Display`] === 'none'
  );
}

function renderMarkdown(report) {
  const lines = [
    '# Sheet Worker State Smoke',
    '',
    `Generated: ${report.finishedAt ?? report.startedAt}`,
    '',
    'Scope: local static app preview iframe only. This proves worker `setAttrs` updates CSS-visible DOM attributes for Roll20-style state selectors. It is not actual Roll20 visual parity.',
    '',
    '| Step | Input property | Input attribute | Character display | Combat display | Status |',
    '| --- | --- | --- | --- | --- | --- |',
  ];
  for (const step of report.steps) {
    lines.push(
      `| ${step.name} | ${step.state.inputValueProperty} | ${step.state.inputValueAttribute} | ${step.state.characterDisplay} | ${step.state.combatDisplay} | ${step.pass ? 'PASS' : 'FAIL'} |`,
    );
  }
  lines.push('');
  lines.push(`Console/page errors: ${report.consoleErrors.length + report.pageErrors.length}`);
  lines.push(`Screenshot: \`${report.screenshotPath}\``);
  return `${lines.join('\n')}\n`;
}

async function main() {
  await fs.mkdir(REPORT_DIR, { recursive: true });
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
    startedAt: new Date().toISOString(),
    baseUrl: `http://127.0.0.1:${PORT}${BASE_PATH}/`,
    steps: [],
    consoleErrors,
    pageErrors,
  };

  try {
    await page.goto(report.baseUrl, { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.setItem('__perfOn', '1'));
    await page.reload({ waitUntil: 'networkidle' });
    await warmPerfHook(page);
    report.import = await importSynthetic(page);

    const iframe = page.locator('[data-testid="preview-iframe"]').first();
    await iframe.waitFor({ state: 'visible', timeout: 30000 });
    const iframeHandle = await iframe.elementHandle();
    const frame = await iframeHandle?.contentFrame();
    if (!frame) throw new Error('preview iframe contentFrame unavailable');
    await frame.locator('#charsheet-root').waitFor({ state: 'visible', timeout: 30000 });

    const initial = await readState(frame);
    report.steps.push({ name: 'initial-combat', state: initial, pass: passForState(initial, 'combat') });

    await frame.locator('button[name="act_character"]').click({ timeout: 10000 });
    await frame.waitForFunction(() => {
      const input = document.querySelector('[name="attr_sheetTab"]');
      const character = document.querySelector('.sheet-character');
      return input?.getAttribute('value') === 'character' && getComputedStyle(character).display !== 'none';
    }, null, { timeout: 10000 });
    const character = await readState(frame);
    report.steps.push({ name: 'after-character-click', state: character, pass: passForState(character, 'character') });

    await frame.locator('button[name="act_combat"]').click({ timeout: 10000 });
    await frame.waitForFunction(() => {
      const input = document.querySelector('[name="attr_sheetTab"]');
      const combat = document.querySelector('.sheet-combat');
      return input?.getAttribute('value') === 'combat' && getComputedStyle(combat).display !== 'none';
    }, null, { timeout: 10000 });
    const combat = await readState(frame);
    report.steps.push({ name: 'after-combat-click', state: combat, pass: passForState(combat, 'combat') });

    report.screenshotPath = path.join(REPORT_DIR, 'sheet-worker-state.png');
    await frame.locator('#charsheet-root').screenshot({ path: report.screenshotPath });
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }

  report.finishedAt = new Date().toISOString();
  report.pass =
    report.steps.every((step) => step.pass) &&
    report.consoleErrors.filter((msg) => msg.type === 'error').length === 0 &&
    report.pageErrors.length === 0;

  await fs.writeFile(path.join(REPORT_DIR, 'sheet-worker-state-smoke-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(path.join(REPORT_DIR, 'sheet-worker-state-smoke-results.md'), renderMarkdown(report), 'utf8');
  console.log(`SHEET WORKER STATE SMOKE ${report.pass ? 'PASS' : 'FAIL'}`);
  if (!report.pass) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
