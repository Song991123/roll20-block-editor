#!/usr/bin/env node
/**
 * Capture canonical local preview screenshots for visual fixtures.
 *
 * This script imports ignored fixture source through the built static app,
 * optionally applies the local visual state-map action hint, and writes the
 * screenshot path consumed by `make_visual_diff_pages.mjs`:
 *
 *   reports/visual-fixture-render/screenshots/<fixtureId>.png
 *
 * Scope: local app preview iframe only. This normalizes diagnostic fixture
 * comparison; it is not actual Roll20 visual parity.
 *
 * Usage:
 *   node scripts/capture_visual_fixture_previews.mjs \
 *     --out-dir ./out --base-path /roll20-block-editor \
 *     --fixtures test-fixtures/visual \
 *     --report-dir reports/visual-fixture-render \
 *     --state-map reports/visual-state-candidates/visual-state-candidates-state-map.json
 */

import http from 'node:http';
import { existsSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2).filter((arg) => arg !== '--');

function argOf(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const OUT_DIR = path.resolve(argOf('--out-dir', './out'));
const BASE_PATH = argOf('--base-path', '/roll20-block-editor');
const FIXTURES_DIR = path.resolve(argOf('--fixtures', 'test-fixtures/visual'));
const REPORT_DIR = path.resolve(argOf('--report-dir', 'reports/visual-fixture-render'));
const STATE_MAP_PATH = argOf('--state-map', '');
const ONLY = argOf('--only', '');
const PORT = Number(argOf('--port', '4211'));
const FAIL_ON_RESOURCE_ISSUES = argOf('--fail-on-resource-issues', 'false') === 'true';
const VIEWPORT = { width: 2200, height: 1400 };

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
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
      res.writeHead(200, { 'content-type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream' });
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

async function listFixtures() {
  const entries = await fs.readdir(FIXTURES_DIR, { withFileTypes: true });
  const fixtures = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (ONLY && entry.name !== ONLY) continue;
    const dir = path.join(FIXTURES_DIR, entry.name);
    const html = await readMaybe(path.join(dir, 'source.html'));
    if (!html) continue;
    fixtures.push({
      id: entry.name,
      dir,
      html,
      css: await readMaybe(path.join(dir, 'source.css')),
      i18n: await readMaybe(path.join(dir, 'source.i18n')),
    });
  }
  return fixtures.sort((a, b) => a.id.localeCompare(b.id));
}

async function loadStateMap() {
  if (!STATE_MAP_PATH) return { path: null, fixtures: {} };
  const resolvedPath = path.resolve(STATE_MAP_PATH);
  if (!existsSync(resolvedPath)) return { path: resolvedPath, missing: true, fixtures: {} };
  const parsed = JSON.parse(await fs.readFile(resolvedPath, 'utf8'));
  return {
    path: resolvedPath,
    fixtures: parsed.fixtures && typeof parsed.fixtures === 'object' ? parsed.fixtures : {},
  };
}

function sanitizeStateCandidate(candidate) {
  if (!candidate || typeof candidate !== 'object') return null;
  return {
    fixtureId: candidate.fixtureId ?? '',
    actionName: candidate.actionName ?? '',
    actionLabel: candidate.actionLabel ?? '',
    candidateKind: candidate.candidateKind ?? '',
    controls: Array.isArray(candidate.controls) ? candidate.controls : [],
    appliedControls: Array.isArray(candidate.appliedControls) ? candidate.appliedControls : [],
    hiddenAttrs: candidate.hiddenAttrs && typeof candidate.hiddenAttrs === 'object' ? candidate.hiddenAttrs : {},
    bestMismatchRatio: candidate.bestMismatchRatio ?? null,
    initialMismatchRatio: candidate.initialMismatchRatio ?? null,
    bestCaptureCrop: Array.isArray(candidate.bestCaptureCrop) ? candidate.bestCaptureCrop : null,
    candidateCount: candidate.candidateCount ?? null,
    scope: candidate.scope ?? 'local preview action-state hint; not Roll20 visual parity',
  };
}

function cssAttrValue(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
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
    window.__perfHook.setPreviewZoom(1);
    window.__perfHook.setPreviewRenderMode('iframe');
    window.__perfHook.setMainMode('preview');
    return last;
  }, fixture);
}

async function getPreviewFrame(page) {
  const iframe = page.locator('[data-testid="preview-iframe"]').first();
  await iframe.waitFor({ state: 'visible', timeout: 30000 });
  const handle = await iframe.elementHandle();
  const frame = await handle?.contentFrame();
  if (!frame) throw new Error('preview iframe contentFrame unavailable');
  await frame.locator('#charsheet-root').waitFor({ state: 'visible', timeout: 30000 });
  return frame;
}

async function collectHiddenState(sheet, hiddenAttrs) {
  if (!hiddenAttrs || Object.keys(hiddenAttrs).length === 0) return {};
  return sheet.evaluate((sheetEl, expectedAttrs) => {
    const out = {};
    for (const [key, expected] of Object.entries(expectedAttrs)) {
      const names = [key, key.startsWith('attr_') ? key.slice(5) : `attr_${key}`];
      const control = names
        .map((name) => sheetEl.querySelector(`[name="${CSS.escape(name)}"]`))
        .find(Boolean);
      out[key] = {
        expected,
        found: Boolean(control),
        name: control?.getAttribute('name') ?? '',
        value: control && 'value' in control ? control.value : '',
        valueAttribute: control?.getAttribute('value') ?? '',
        checked: control && 'checked' in control ? Boolean(control.checked) : null,
        checkedAttribute: control?.getAttribute('checked') ?? null,
      };
    }
    return out;
  }, hiddenAttrs);
}

async function applyPreviewStateCandidate(page, frame, sheet, candidate) {
  const sanitized = sanitizeStateCandidate(candidate);
  if (!sanitized) return null;
  const result = {
    ...sanitized,
    applied: false,
    skippedReason: '',
    hiddenStateBefore: await collectHiddenState(sheet, sanitized.hiddenAttrs),
    hiddenStateAfter: {},
  };

  if (!sanitized.actionName || sanitized.actionName === 'initial') {
    result.skippedReason = 'initial-state';
    result.hiddenStateAfter = result.hiddenStateBefore;
    return result;
  }

  if (Array.isArray(sanitized.controls) && sanitized.controls.length > 0) {
    result.appliedControls = await frame.evaluate((candidateToApply) => {
      function matches(el, control) {
        if ((el.getAttribute('type') || '') !== control.type) return false;
        if ((el.getAttribute('name') || '') !== control.name) return false;
        if ((el.getAttribute('value') || '') !== control.value) return false;
        if ((el.getAttribute('class') || '') !== control.className) return false;
        return true;
      }
      const applied = [];
      for (const control of candidateToApply.controls || []) {
        const el = Array.from(document.querySelectorAll('input[type="checkbox"], input[type="radio"]')).find((input) => matches(input, control));
        if (!el) {
          applied.push({ ...control, applied: false, reason: 'not-found' });
          continue;
        }
        el.scrollIntoView({ block: 'center', inline: 'center' });
        if (control.checked && !el.checked) el.click();
        else if (!control.checked && el.checked) el.click();
        applied.push({
          type: el.getAttribute('type') || '',
          name: el.getAttribute('name') || '',
          value: el.getAttribute('value') || '',
          className: el.getAttribute('class') || '',
          checked: el.checked,
          applied: true,
        });
      }
      return applied;
    }, sanitized);
    await page.waitForTimeout(500);
    result.applied = result.appliedControls.some((control) => control.applied);
    if (!result.applied) result.skippedReason = 'controls-not-applied';
    result.hiddenStateAfter = await collectHiddenState(sheet, sanitized.hiddenAttrs);
    return result;
  }

  const button = frame.locator(`button[name="${cssAttrValue(sanitized.actionName)}"]`).first();
  if ((await button.count()) === 0) {
    result.skippedReason = 'action-button-not-found';
    result.hiddenStateAfter = result.hiddenStateBefore;
    return result;
  }

  try {
    await button.scrollIntoViewIfNeeded({ timeout: 5000 });
    await button.click({ timeout: 10000 });
    await page.waitForTimeout(500);
    result.applied = true;
  } catch (err) {
    result.skippedReason = `click-failed: ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`;
  }
  result.hiddenStateAfter = await collectHiddenState(sheet, sanitized.hiddenAttrs);
  return result;
}

function summarizeResourceIssue(kind, request, response = null) {
  const url = request.url();
  let host = '';
  try {
    host = new URL(url).host;
  } catch {
    host = '';
  }
  return {
    kind,
    status: response?.status?.() ?? null,
    resourceType: request.resourceType(),
    host,
    url: url.slice(0, 500),
  };
}

function summarizeResourceIssues(issues) {
  const map = new Map();
  for (const issue of issues || []) {
    const key = `${issue.kind}|${issue.status ?? ''}|${issue.resourceType}|${issue.host}`;
    const item = map.get(key) || {
      kind: issue.kind,
      status: issue.status,
      resourceType: issue.resourceType,
      host: issue.host,
      count: 0,
      examples: [],
    };
    item.count += 1;
    if (item.examples.length < 3) item.examples.push(issue.url);
    map.set(key, item);
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count || String(a.host).localeCompare(String(b.host)));
}

async function captureFixturePreview(page, fixture, stateCandidate, screenshotPath) {
  const frame = await getPreviewFrame(page);
  const sheet = frame.locator('#charsheet-root').first();
  const stateCandidateResult = await applyPreviewStateCandidate(page, frame, sheet, stateCandidate);
  await sheet.screenshot({ path: screenshotPath });
  const dom = await sheet.evaluate((sheetEl) => {
    const rect = sheetEl.getBoundingClientRect();
    const elements = Array.from(sheetEl.querySelectorAll('*'));
    return {
      rect: {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        left: Math.round(rect.left),
        top: Math.round(rect.top),
      },
      elementCount: elements.length,
      visibleElementCount: elements.filter((el) => {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0;
      }).length,
      rollButtonCount: sheetEl.querySelectorAll('button[type="roll"], button.roll').length,
      visibleRuntimeNodeCount: elements.filter((el) => {
        if (!['SCRIPT', 'ROLLTEMPLATE'].includes(el.tagName)) return false;
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0;
      }).length,
    };
  });
  return {
    path: screenshotPath,
    stateCandidate: stateCandidateResult,
    dom,
  };
}

function fmtStateCandidate(candidate) {
  if (!candidate) return 'none';
  const action = candidate.actionName || 'initial';
  if (candidate.skippedReason === 'initial-state') return 'initial';
  if (candidate.skippedReason) return `${action} SKIP:${candidate.skippedReason}`;
  return candidate.applied ? `${action} APPLIED` : `${action} SKIP`;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Visual Fixture Preview Captures');
  lines.push('');
  lines.push(`Generated: ${report.finishedAt ?? report.startedAt}`);
  lines.push('');
  lines.push('Scope: local static app preview iframe only. These screenshots feed the visual fixture diff harness and are not actual Roll20 visual parity evidence.');
  lines.push('Status and resource status are separated. Use `--fail-on-resource-issues true` for visual-parity work where external images/fonts must load.');
  if (report.stateMapPath) lines.push(`State map: \`${report.stateMapPath}\`${report.stateMapMissing ? ' (missing; initial states used)' : ''}`);
  lines.push('');
  lines.push('| Fixture | Status | Resources | Blocks | State applied | Size | Visible elements | Roll buttons | Runtime nodes | Console/Page errors | Resource issues |');
  lines.push('| --- | --- | --- | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: |');
  for (const item of report.fixtures) {
    const dom = item.capture?.dom ?? {};
    lines.push(
      `| \`${item.id}\` | ${item.pass ? 'PASS' : 'FAIL'} | ${item.resourcePass ? 'PASS' : 'WARN'} | ${item.import?.blockCount ?? 0} | ${fmtStateCandidate(item.capture?.stateCandidate)} | ${dom.rect ? `${dom.rect.width}x${dom.rect.height}` : ''} | ${dom.visibleElementCount ?? ''} | ${dom.rollButtonCount ?? ''} | ${dom.visibleRuntimeNodeCount ?? ''} | ${(item.consoleErrors?.length ?? 0) + (item.pageErrors?.length ?? 0)} | ${item.resourceIssueCount ?? sumResourceIssues(item.resourceIssues)} |`,
    );
  }
  lines.push('');
  lines.push('Generated screenshots are local-only and ignored by Git.');
  return `${lines.join('\n')}\n`;
}

function sumResourceIssues(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, item) => sum + (item.count ?? 0), 0);
}

async function main() {
  await fs.mkdir(path.join(REPORT_DIR, 'screenshots'), { recursive: true });
  const fixtures = await listFixtures();
  if (fixtures.length === 0) throw new Error(`no fixtures with source.html under ${FIXTURES_DIR}`);
  const stateMap = await loadStateMap();

  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const report = {
    startedAt: new Date().toISOString(),
    fixturesDir: FIXTURES_DIR,
    stateMapPath: stateMap.path,
    stateMapMissing: Boolean(stateMap.missing),
    failOnResourceIssues: FAIL_ON_RESOURCE_ISSUES,
    scopeNote: 'status pass means preview rendered; resource pass is separate because visual parity needs assets to load',
    fixtures: [],
  };

  try {
    for (const fixture of fixtures) {
      const page = await browser.newPage({ viewport: VIEWPORT });
      const consoleErrors = [];
      const pageErrors = [];
      const resourceIssues = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 500));
      });
      page.on('pageerror', (err) => pageErrors.push(String(err).slice(0, 500)));
      page.on('response', (response) => {
        const status = response.status();
        if (status >= 400) resourceIssues.push(summarizeResourceIssue('http', response.request(), response));
      });
      page.on('requestfailed', (request) => {
        resourceIssues.push({
          ...summarizeResourceIssue('failed', request),
          failure: request.failure()?.errorText ?? '',
        });
      });
      await page.addInitScript(() => {
        try {
          window.localStorage.setItem('__perfOn', '1');
          window.localStorage.removeItem('r20be-autosave');
        } catch {}
      });

      const entry = { id: fixture.id, pass: false };
      try {
        await page.goto(`http://127.0.0.1:${PORT}${BASE_PATH}/`, { waitUntil: 'load' });
        await warmPerfHook(page);
        entry.import = await importFixture(page, fixture);
        const screenshotPath = path.join(REPORT_DIR, 'screenshots', `${fixture.id}.png`);
        entry.stateCandidate = sanitizeStateCandidate(stateMap.fixtures[fixture.id]);
        entry.capture = await captureFixturePreview(page, fixture, entry.stateCandidate, screenshotPath);
        entry.pass =
          (entry.import?.blockCount ?? 0) > 0 &&
          entry.capture?.dom?.elementCount > 0 &&
          entry.capture?.dom?.visibleRuntimeNodeCount === 0 &&
          consoleErrors.length === 0 &&
          pageErrors.length === 0;
      } catch (err) {
        entry.error = String(err?.stack || err).slice(0, 1200);
      }
      entry.consoleErrors = consoleErrors;
      entry.pageErrors = pageErrors;
      entry.resourceIssues = summarizeResourceIssues(resourceIssues);
      entry.resourceIssueCount = sumResourceIssues(entry.resourceIssues);
      entry.resourcePass = entry.resourceIssueCount === 0;
      if (FAIL_ON_RESOURCE_ISSUES && !entry.resourcePass) entry.pass = false;
      report.fixtures.push(entry);
      console.log(`${entry.pass ? 'PASS' : 'FAIL'} ${fixture.id} state=${fmtStateCandidate(entry.capture?.stateCandidate)} resources=${entry.resourcePass ? 'PASS' : 'WARN'}`);
      await page.close();
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }

  report.finishedAt = new Date().toISOString();
  report.pass = report.fixtures.every((item) => item.pass);
  await fs.writeFile(path.join(REPORT_DIR, 'visual-fixture-preview-captures.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(path.join(REPORT_DIR, 'visual-fixture-preview-captures.md'), renderMarkdown(report), 'utf8');
  console.log(`VISUAL FIXTURE PREVIEW CAPTURE ${report.pass ? 'PASS' : 'FAIL'} ${REPORT_DIR}`);
  if (!report.pass) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
