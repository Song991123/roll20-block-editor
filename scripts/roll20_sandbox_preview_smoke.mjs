#!/usr/bin/env node
/**
 * Browser smoke for the preview-only Roll20 Custom Sheet Sandbox expected
 * sanitize/prefix render mode.
 *
 * This does not prove actual Roll20 visual parity. It proves the local preview
 * can show the same sanitizer approximation already used by the pre-upload
 * audit and export diagnostics after a real fixture import path.
 *
 * A protected source can be measured read-only by setting
 * R20_SANDBOX_SMOKE_HTML_PATH and optionally the CSS and i18n path variables.
 * The generated local evidence uses the anonymous `local-input` identity.
 */

import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { fixtureExpectationFailures } from './lib/fixtureExpectations.mjs';

const args = process.argv.slice(2);
function argOf(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const OUT_DIR = path.resolve(argOf('--out-dir', './out'));
const BASE_PATH = argOf('--base-path', '/roll20-block-editor');
const FIXTURES_DIR = path.resolve(argOf('--fixtures', 'test-fixtures/visual'));
const RUN_ALL = args.includes('--all');
const FAIL_ON_CONSOLE_ISSUES = args.includes('--fail-on-console-issues');
const FIXTURE_ID = argOf('--fixture', RUN_ALL ? '' : 'fixtureB');
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

async function readJsonMaybe(file) {
  const source = await readMaybe(file);
  if (!source.trim()) return null;
  return JSON.parse(source);
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
    expected: (await readJsonMaybe(path.join(dir, 'manifest.json')))?.expected ?? null,
  };
}

async function loadFixtures() {
  const localHtmlPath = process.env.R20_SANDBOX_SMOKE_HTML_PATH;
  if (localHtmlPath) {
    const html = await readMaybe(localHtmlPath);
    if (!html.trim()) {
      throw new Error('R20_SANDBOX_SMOKE_HTML_PATH did not contain readable HTML');
    }
    return [{
      id: 'local-input',
      html,
      css: await readMaybe(process.env.R20_SANDBOX_SMOKE_CSS_PATH),
      i18n: await readMaybe(process.env.R20_SANDBOX_SMOKE_I18N_PATH),
      expected: null,
    }];
  }
  if (FIXTURE_ID) return [await loadFixture(FIXTURE_ID)];
  const entries = await fs.readdir(FIXTURES_DIR, { withFileTypes: true });
  const ids = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const fixtures = [];
  for (const id of ids) {
    const fixture = await loadFixture(id).catch(() => null);
    if (fixture) fixtures.push(fixture);
  }
  if (fixtures.length === 0) {
    throw new Error(`no fixtures with source.html found under ${FIXTURES_DIR}`);
  }
  return fixtures;
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
  await frame.waitForSelector('.charactersheet.charsheet', { timeout: 30000 });
  return frame;
}

async function summarizePreview(page) {
  for (let i = 0; i < 30; i += 1) {
    try {
      const frame = await getPreviewFrame(page);
      return await frame.evaluate(() => {
        const root = document.querySelector('.charactersheet.charsheet');
        const css = document.querySelector('#r20-user')?.textContent ?? '';
        const rootHtml = root?.innerHTML ?? '';
        const elements = Array.from(root?.querySelectorAll('*') ?? []);
        const isVisible = (el) => {
          const style = getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          return style.display !== 'none'
            && style.visibility !== 'hidden'
            && rect.width > 0
            && rect.height > 0;
        };
        const tagCounts = {};
        elements.forEach((el) => {
          const tag = el.tagName.toLowerCase();
          tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
        });
        const selectedControlValues = {};
        const selectedOptionValues = {};
        const defaultSelectedOptionValues = {};
        const optgroups = elements.filter((el) => el.tagName.toLowerCase() === 'optgroup');
        const dataAttributeValues = {};
        elements.forEach((el) => {
          Array.from(el.attributes).forEach((attribute) => {
            if (!attribute.name.startsWith('data-') || attribute.name.startsWith('data-r20-')) return;
            (dataAttributeValues[attribute.name] ??= []).push(attribute.value);
          });
        });
        elements.filter((el) => el.tagName.toLowerCase() === 'select' && el.getAttribute('name'))
          .forEach((el) => {
            selectedControlValues[el.getAttribute('name')] = el.value;
            selectedOptionValues[el.getAttribute('name')] = Array.from(el.selectedOptions)
              .map((option) => option.value);
            defaultSelectedOptionValues[el.getAttribute('name')] = Array.from(el.options)
              .filter((option) => option.defaultSelected)
              .map((option) => option.value);
          });
        const controls = elements.filter((el) => el.matches('input[name], select[name], textarea[name]'));
        const controlValues = {};
        const checkedControlValues = {};
        controls.forEach((el) => {
          const name = el.getAttribute('name');
          if (el.tagName.toLowerCase() === 'input' && el.type === 'radio') {
            if (!(name in controlValues)) controlValues[name] = '';
            if (el.checked) controlValues[name] = el.value;
          } else {
            controlValues[name] = el.value;
          }
          if (el.tagName.toLowerCase() === 'input' && el.checked) {
            (checkedControlValues[name] ??= []).push(el.value);
          }
        });
        const i18nElements = elements.filter((el) => el.hasAttribute('data-i18n'));
        return {
          sandboxMode: document.body.getAttribute('data-roll20-sandbox-sanitize') ?? '',
          rootInnerBytes: new TextEncoder().encode(rootHtml).length,
          userCssBytes: new TextEncoder().encode(css).length,
          colgroupCount: root?.querySelectorAll('colgroup, col').length ?? 0,
          rolltemplateCount: root?.querySelectorAll('rolltemplate').length ?? 0,
          sourceWorkerScriptCount: root?.querySelectorAll('script[type="text/worker"]').length ?? 0,
          ordinaryScriptCount: root?.querySelectorAll('script:not([type="text/worker"])').length ?? 0,
          nonControlAttrNameCount: elements.filter((el) =>
            el.getAttribute('name')?.startsWith('attr_')
            && !el.matches('input, select, textarea')).length,
          checkedControlNames: elements
            .filter((el) => el.tagName.toLowerCase() === 'input' && el.checked && el.getAttribute('name'))
            .map((el) => el.getAttribute('name'))
            .sort(),
          checkedControlValues,
          selectedControlValues,
          selectedOptionValues,
          defaultSelectedOptionValues,
          optgroupLabels: optgroups.map((el) => el.label),
          disabledOptgroupLabels: optgroups.filter((el) => el.disabled).map((el) => el.label),
          dataAttributeValues: Object.fromEntries(
            Object.entries(dataAttributeValues).map(([name, values]) => [name, values.sort()]),
          ),
          controlValues,
          disabledControlNames: Array.from(new Set(controls.filter((el) => el.disabled)
            .map((el) => el.getAttribute('name')))).sort(),
          readOnlyControlNames: Array.from(new Set(controls.filter((el) => el.readOnly)
            .map((el) => el.getAttribute('name')))).sort(),
          multipleControlNames: Array.from(new Set(controls.filter((el) =>
            el.tagName.toLowerCase() === 'select' && el.multiple)
            .map((el) => el.getAttribute('name')))).sort(),
          tagCounts,
          visibleText: root?.innerText ?? '',
          visibleI18nKeys: i18nElements.filter(isVisible).map((el) => el.getAttribute('data-i18n')).sort(),
          hiddenI18nKeys: i18nElements.filter((el) => !isVisible(el)).map((el) => el.getAttribute('data-i18n')).sort(),
          visibleRuntimeNodeCount: Array.from(root?.querySelectorAll('script, rolltemplate') ?? [])
            .filter(isVisible).length,
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

async function validateFixture(page, fixture) {
  const checks = {};
  const failures = [];
  checks.importedFixture = await importFixture(page, fixture);
  if ((checks.importedFixture?.blockCount ?? 0) <= 0) {
    failures.push(`fixture ${fixture.id} did not import any blocks`);
    return { fixture: fixture.id, status: 'FAIL', checks, failures };
  }

  await page.waitForFunction(
    () => Boolean(window.__perfHook?.setRoll20SandboxSanitize),
    null,
    { timeout: 15000 },
  );

  checks.normalPreview = await summarizePreview(page);

  await page.evaluate(() => {
    window.__perfHook.setRoll20SandboxSanitize(true);
  });
  await page.waitForTimeout(800);
  checks.sandboxPreview = await summarizePreview(page);
  failures.push(...fixtureExpectationFailures(
    checks.normalPreview,
    fixture.expected?.normal ?? fixture.expected,
    checks.normalPreview,
    'normal preview',
  ));
  failures.push(...fixtureExpectationFailures(
    checks.sandboxPreview,
    fixture.expected?.sandbox ?? fixture.expected,
    checks.sandboxPreview,
    'sandbox preview',
  ));

  const safeId = fixture.id.replace(/[^a-zA-Z0-9_.-]/g, '_');
  await page.screenshot({
    path: path.join(REPORT_DIR, `${safeId}-sandbox-preview-page.png`),
    fullPage: true,
  });

  if (checks.normalPreview.sandboxMode !== '0') failures.push('normal preview sandbox marker mismatch');
  if (checks.sandboxPreview.sandboxMode !== '1') failures.push('sandbox preview marker mismatch');
  if (
    checks.normalPreview.rootInnerBytes === checks.sandboxPreview.rootInnerBytes &&
    checks.normalPreview.userCssBytes === checks.sandboxPreview.userCssBytes &&
    checks.normalPreview.colgroupCount === checks.sandboxPreview.colgroupCount &&
    checks.normalPreview.sourceWorkerScriptCount === checks.sandboxPreview.sourceWorkerScriptCount
  ) {
    failures.push('sandbox preview did not produce a measurable sanitized render change');
  }
  if (checks.sandboxPreview.colgroupCount > checks.normalPreview.colgroupCount) {
    failures.push('sandbox preview increased stripped table structure count');
  }
  if (checks.sandboxPreview.visibleRuntimeNodeCount > 0) {
    failures.push('sandbox preview still has visible runtime nodes in the sheet root');
  }
  if (checks.sandboxPreview.rolltemplateCount > 0) {
    failures.push('sandbox preview still has rolltemplates in the sheet root');
  }

  return {
    fixture: fixture.id,
    status: failures.length > 0 ? 'FAIL' : 'PASS',
    checks,
    failures,
  };
}

async function main() {
  await fs.mkdir(REPORT_DIR, { recursive: true });
  const fixtures = await loadFixtures();
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
    consoleStatus: 'PASS',
    url: `http://127.0.0.1:${PORT}${BASE_PATH}/`,
    fixtureMode: FIXTURE_ID ? 'single' : 'all',
    fixtureCount: fixtures.length,
    startedAt: new Date().toISOString(),
    fixtures: [],
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
    for (const fixture of fixtures) {
      result.fixtures.push(await validateFixture(page, fixture));
    }
    const failures = result.fixtures.flatMap((item) =>
      item.status === 'PASS' ? [] : item.failures.map((failure) => `${item.fixture}: ${failure}`),
    );
    if (consoleIssues.length > 0) {
      result.consoleStatus = 'WARN';
      if (FAIL_ON_CONSOLE_ISSUES) failures.push('console errors/warnings present');
    }
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
      `Fixtures: ${result.fixtureCount}`,
      `Console status: ${result.consoleStatus}`,
      `URL: \`${result.url}\``,
      '',
      'This proves only the local preview toggle and sanitizer approximation path. It is not actual Roll20 visual parity.',
      'Console/resource issues are recorded separately because local Roll20 image-proxy CORS or source sheet numeric-expression warnings can be useful diagnostics without invalidating the sanitizer render path.',
      '',
      '## Fixture Summary',
      '',
      '| Fixture | Status | Normal bytes | Sandbox bytes | Normal runtime | Sandbox runtime |',
      '| --- | --- | ---: | ---: | ---: | ---: |',
      ...result.fixtures.map((item) => {
        const normal = item.checks.normalPreview ?? {};
        const sandbox = item.checks.sandboxPreview ?? {};
        const normalRuntime = (normal.rolltemplateCount ?? 0) + (normal.sourceWorkerScriptCount ?? 0);
        const sandboxRuntime = (sandbox.rolltemplateCount ?? 0) + (sandbox.sourceWorkerScriptCount ?? 0);
        return `| \`${item.fixture}\` | ${item.status} | ${normal.rootInnerBytes ?? 0} | ${sandbox.rootInnerBytes ?? 0} | ${normalRuntime} | ${sandboxRuntime} |`;
      }),
      '',
      '## Checks',
      '',
      '```json',
      JSON.stringify(result.fixtures, null, 2),
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
