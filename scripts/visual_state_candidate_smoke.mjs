#!/usr/bin/env node
/**
 * Try Roll20 action-button/default-state candidates against fixture reference
 * images.
 *
 * Many Roll20 sheets use hidden inputs plus CSS selectors such as
 * `[value="combat"] ~ .sheet-combat`. A reference image may show a non-initial
 * tab. This local-only smoke imports each fixture, captures the initial preview
 * state, clicks visible `button[type="action"]` candidates one by one, captures
 * each resulting sheet root, and compares every candidate screenshot against
 * the copied reference image with the same browser-canvas crop/scale approach
 * used by the visual diff harness.
 *
 * Scope: local static app preview iframe only. This is diagnostic state/crop
 * triage, not actual Roll20 visual parity.
 *
 * Usage:
 *   node scripts/visual_state_candidate_smoke.mjs \
 *     --out-dir ./out --base-path /roll20-block-editor \
 *     --fixtures test-fixtures/visual --report-dir reports/visual-state-candidates
 */

import http from 'node:http';
import { existsSync } from 'node:fs';
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
const REPORT_DIR = path.resolve(argOf('--report-dir', 'reports/visual-state-candidates'));
const ONLY = argOf('--only', '');
const PORT = Number(argOf('--port', '4201'));
const VIEWPORT = { width: 2200, height: 1400 };
const MAX_ACTIONS = Number(argOf('--max-actions', '12'));

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

async function readMaybe(file) {
  try {
    return await fs.readFile(file, 'utf8');
  } catch {
    return '';
  }
}

async function listFixtures() {
  const entries = await fs.readdir(FIXTURES_DIR, { withFileTypes: true });
  const out = [];
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    if (ONLY && ent.name !== ONLY) continue;
    const dir = path.join(FIXTURES_DIR, ent.name);
    const html = await readMaybe(path.join(dir, 'source.html'));
    const referencePath = findReference(dir);
    if (!html || !referencePath) continue;
    out.push({
      id: ent.name,
      dir,
      referencePath,
      html,
      css: await readMaybe(path.join(dir, 'source.css')),
      i18n: await readMaybe(path.join(dir, 'source.i18n')),
    });
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

function findReference(dir) {
  for (const name of ['reference.png', 'reference.jpg', 'reference.jpeg', 'reference.webp']) {
    const file = path.join(dir, name);
    if (existsSync(file)) return file;
  }
  return null;
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
    await sleep(500);
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

async function listActionCandidates(frame) {
  const rows = await frame.evaluate(() => {
    return Array.from(document.querySelectorAll('button[type="action"]')).map((el, index) => {
      const cs = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const selfVisible = cs.display !== 'none' && cs.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      const browserVisible =
        typeof el.checkVisibility === 'function'
          ? el.checkVisibility({ checkVisibilityCSS: true, checkOpacity: false })
          : true;
      return {
        index,
        name: el.getAttribute('name') || '',
        label: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80),
        visible: selfVisible && browserVisible,
      };
    });
  });
  const seen = new Set();
  return rows
    .filter((row) => row.visible && row.name && !seen.has(row.name) && seen.add(row.name))
    .slice(0, MAX_ACTIONS);
}

async function readState(frame) {
  return frame.evaluate(() => {
    return Array.from(document.querySelectorAll('input[type="hidden"][name^="attr_"]'))
      .map((el) => ({
        name: el.getAttribute('name') || '',
        value: el.getAttribute('value') || '',
        propertyValue: el.value || '',
        className: el.getAttribute('class') || '',
      }))
      .filter((row) => /tab|page|mode|view|sheet/i.test(`${row.name} ${row.className}`))
      .slice(0, 16);
  });
}

function safeFilePart(value) {
  return String(value || 'state')
    .replace(/^act_/, '')
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'state';
}

async function captureAndCompare(comparePage, frame, fixture, candidate, screenshotDir, referenceDataUrl) {
  const fileName = `${fixture.id}-${safeFilePart(candidate.name)}.png`;
  const screenshotPath = path.join(screenshotDir, fileName);
  const sheet = frame.locator('#charsheet-root').first();
  await sheet.screenshot({ path: screenshotPath });
  const screenshotDataUrl = `data:image/png;base64,${(await fs.readFile(screenshotPath)).toString('base64')}`;
  const diff = await compareImages(comparePage, referenceDataUrl, screenshotDataUrl);
  return {
    ...candidate,
    screenshotPath,
    state: await readState(frame),
    diff,
  };
}

async function compareImages(page, referenceSrc, captureSrc) {
  return page.evaluate(async ({ referenceSrc: refSrc, captureSrc: capSrc }) => {
    function load(src) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('image load failed'));
        img.src = src;
      });
    }
    const reference = await load(refSrc);
    const capture = await load(capSrc);
    const threshold = 60;

    function compare(mode, w, h, capX, capY, refX, refY, refW, refH, refMode) {
      if (!w || !h || capX < 0 || capY < 0 || capX + w > capture.naturalWidth || capY + h > capture.naturalHeight) return null;
      if (!refW || !refH || refX < 0 || refY < 0 || refX + refW > reference.naturalWidth || refY + refH > reference.naturalHeight) return null;
      const refCanvas = document.createElement('canvas');
      const capCanvas = document.createElement('canvas');
      refCanvas.width = capCanvas.width = w;
      refCanvas.height = capCanvas.height = h;
      const refCtx = refCanvas.getContext('2d', { willReadFrequently: true });
      const capCtx = capCanvas.getContext('2d', { willReadFrequently: true });
      if (refMode === 'scale-full') {
        refCtx.drawImage(reference, 0, 0, reference.naturalWidth, reference.naturalHeight, 0, 0, w, h);
      } else {
        refCtx.drawImage(reference, refX, refY, w, h, 0, 0, w, h);
      }
      capCtx.drawImage(capture, capX, capY, w, h, 0, 0, w, h);
      const ref = refCtx.getImageData(0, 0, w, h);
      const cap = capCtx.getImageData(0, 0, w, h);
      let mismatch = 0;
      let sumSq = 0;
      for (let i = 0; i < ref.data.length; i += 4) {
        const dr = Math.abs(ref.data[i] - cap.data[i]);
        const dg = Math.abs(ref.data[i + 1] - cap.data[i + 1]);
        const db = Math.abs(ref.data[i + 2] - cap.data[i + 2]);
        if (dr + dg + db > threshold) mismatch += 1;
        sumSq += dr * dr + dg * dg + db * db;
      }
      return {
        mode,
        comparedSize: [w, h],
        captureCrop: [capX, capY, w, h],
        referenceCrop: [refX, refY, refW, refH],
        mismatchPixels: mismatch,
        totalPixels: w * h,
        mismatchRatio: Number((mismatch / (w * h)).toFixed(6)),
        rmsRgb: Number(Math.sqrt(sumSq / (w * h * 3)).toFixed(3)),
      };
    }

    function better(a, b) {
      if (!a) return b;
      if (!b) return a;
      return b.mismatchRatio < a.mismatchRatio ? b : a;
    }

    function search(mode, w, h, refMode, refW, refH, step) {
      let best = null;
      const maxX = Math.max(0, capture.naturalWidth - w);
      const maxY = Math.max(0, capture.naturalHeight - h);
      for (let y = 0; y <= maxY; y += step) {
        for (let x = 0; x <= maxX; x += step) {
          best = better(best, compare(mode, w, h, x, y, 0, 0, refW, refH, refMode));
        }
      }
      if (!best) return null;
      const [cx, cy] = best.captureCrop;
      for (let y = Math.max(0, cy - step); y <= Math.min(maxY, cy + step); y += 2) {
        for (let x = Math.max(0, cx - step); x <= Math.min(maxX, cx + step); x += 2) {
          best = better(best, compare(mode, w, h, x, y, 0, 0, refW, refH, refMode));
        }
      }
      return best;
    }

    const nativeW = Math.min(reference.naturalWidth, capture.naturalWidth);
    const nativeH = Math.min(reference.naturalHeight, capture.naturalHeight);
    const nativeTopLeft = compare('native-top-left', nativeW, nativeH, 0, 0, 0, 0, nativeW, nativeH, 'crop-top-left');
    const nativeBestXY = search('native-best-xy', nativeW, nativeH, 'crop-top-left', nativeW, nativeH, 32);
    let scaledW = Math.min(capture.naturalWidth, reference.naturalWidth);
    let scale = scaledW / reference.naturalWidth;
    let scaledH = Math.round(reference.naturalHeight * scale);
    if (scaledH > capture.naturalHeight) {
      scale = capture.naturalHeight / reference.naturalHeight;
      scaledW = Math.round(reference.naturalWidth * scale);
      scaledH = Math.round(reference.naturalHeight * scale);
    }
    const scaledBestXY = search('scaled-reference-best-xy', scaledW, scaledH, 'scale-full', reference.naturalWidth, reference.naturalHeight, 32);
    const best = [nativeTopLeft, nativeBestXY, scaledBestXY].filter(Boolean).reduce((acc, item) => better(acc, item), null);
    return {
      referenceSize: [reference.naturalWidth, reference.naturalHeight],
      captureSize: [capture.naturalWidth, capture.naturalHeight],
      nativeTopLeft,
      nativeBestXY,
      scaledBestXY,
      best,
    };
  }, { referenceSrc, captureSrc });
}

function pct(value) {
  return typeof value === 'number' ? `${Math.round(value * 10000) / 100}%` : '';
}

function renderMarkdown(report) {
  const lines = [
    '# Visual State Candidate Smoke',
    '',
    `Generated: ${report.finishedAt ?? report.startedAt}`,
    '',
    'Scope: local static app preview iframe only. This tries visible Roll20 action buttons as state candidates and compares screenshots against copied reference images. It is not actual Roll20 visual parity.',
    '',
    '| Fixture | Status | Candidates | Best state | Best mismatch | Initial mismatch | Best crop | Console/Page errors |',
    '| --- | --- | ---: | --- | ---: | ---: | --- | ---: |',
  ];
  for (const item of report.fixtures) {
    const best = item.bestCandidate;
    const initial = item.candidates?.find((c) => c.name === 'initial');
    lines.push(
      `| \`${item.id}\` | ${item.pass ? 'PASS' : 'FAIL'} | ${item.candidates?.length ?? 0} | ${best ? `${best.name} ${best.label ? `(${escapePipe(best.label)})` : ''}` : ''} | ${pct(best?.diff?.best?.mismatchRatio)} | ${pct(initial?.diff?.best?.mismatchRatio)} | ${(best?.diff?.best?.captureCrop ?? []).join(',')} | ${(item.consoleErrors?.length ?? 0) + (item.pageErrors?.length ?? 0)} |`,
    );
  }
  lines.push('');
  lines.push('## Candidate Details');
  for (const item of report.fixtures) {
    lines.push('');
    lines.push(`### ${item.id}`);
    lines.push('');
    lines.push('| Candidate | Label | Best mismatch | Capture size | State hints |');
    lines.push('| --- | --- | ---: | ---: | --- |');
    for (const candidate of item.candidates ?? []) {
      const state = (candidate.state ?? [])
        .map((row) => `${row.name}=${row.value}`)
        .join(', ');
      lines.push(
        `| ${candidate.name} | ${escapePipe(candidate.label ?? '')} | ${pct(candidate.diff?.best?.mismatchRatio)} | ${(candidate.diff?.captureSize ?? []).join('x')} | ${escapePipe(state)} |`,
      );
    }
  }
  lines.push('');
  lines.push('Interpretation: lower mismatch points to the reference image likely using that tab/default state, but this is still a crop/state diagnostic and needs actual Roll20 screenshots before parity claims.');
  return `${lines.join('\n')}\n`;
}

function escapePipe(value) {
  return String(value ?? '').replace(/\|/g, '\\|');
}

async function main() {
  await fs.mkdir(path.join(REPORT_DIR, 'screenshots'), { recursive: true });
  const fixtures = await listFixtures();
  if (fixtures.length === 0) throw new Error(`No fixtures with reference images under ${FIXTURES_DIR}`);

  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: VIEWPORT });
  const comparePage = await browser.newPage();
  const report = {
    startedAt: new Date().toISOString(),
    fixturesDir: FIXTURES_DIR,
    fixtures: [],
  };

  try {
    page.on('dialog', async (dialog) => dialog.accept(dialog.defaultValue() || '0').catch(() => {}));
    await page.goto(`http://127.0.0.1:${PORT}${BASE_PATH}/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.setItem('__perfOn', '1'));
    await page.reload({ waitUntil: 'networkidle' });
    await warmPerfHook(page);

    for (const fixture of fixtures) {
      const consoleErrors = [];
      const pageErrors = [];
      const onConsole = (msg) => {
        if (['error', 'warning'].includes(msg.type())) consoleErrors.push({ type: msg.type(), text: msg.text() });
      };
      const onPageError = (err) => pageErrors.push(String(err));
      page.on('console', onConsole);
      page.on('pageerror', onPageError);

      const screenshotDir = path.join(REPORT_DIR, 'screenshots', fixture.id);
      await fs.mkdir(screenshotDir, { recursive: true });
      const referenceDataUrl = `data:image/${path.extname(fixture.referencePath).toLowerCase().replace('.', '').replace('jpg', 'jpeg')};base64,${(await fs.readFile(fixture.referencePath)).toString('base64')}`;
      const entry = {
        id: fixture.id,
        referencePath: fixture.referencePath,
        consoleErrors,
        pageErrors,
        candidates: [],
      };
      try {
        entry.import = await importFixture(page, fixture);
        let frame = await getPreviewFrame(page);
        const initial = await captureAndCompare(comparePage, frame, fixture, { name: 'initial', label: 'initial' }, screenshotDir, referenceDataUrl);
        entry.candidates.push(initial);

        const actions = await listActionCandidates(frame);
        entry.actionCandidates = actions;
        for (const action of actions) {
          await importFixture(page, fixture);
          frame = await getPreviewFrame(page);
          const button = frame.locator(`button[name="${action.name.replace(/"/g, '\\"')}"]`).first();
          try {
            await button.scrollIntoViewIfNeeded({ timeout: 3000 });
            await button.click({ timeout: 5000 });
            await frame.waitForTimeout(300);
            entry.candidates.push(await captureAndCompare(comparePage, frame, fixture, action, screenshotDir, referenceDataUrl));
          } catch (err) {
            entry.candidates.push({
              ...action,
              skipped: true,
              error: err instanceof Error ? err.message.split('\n')[0] : String(err),
            });
          }
        }
        entry.bestCandidate = entry.candidates
          .filter((candidate) => candidate.diff?.best)
          .sort((a, b) => a.diff.best.mismatchRatio - b.diff.best.mismatchRatio)[0] ?? null;
        entry.pass = Boolean(entry.bestCandidate) && pageErrors.length === 0 && consoleErrors.filter((m) => m.type === 'error').length === 0;
      } finally {
        page.off('console', onConsole);
        page.off('pageerror', onPageError);
      }
      report.fixtures.push(entry);
      console.log(`${entry.pass ? 'PASS' : 'FAIL'} ${fixture.id} best=${entry.bestCandidate?.name ?? 'none'} mismatch=${pct(entry.bestCandidate?.diff?.best?.mismatchRatio)}`);
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }

  report.finishedAt = new Date().toISOString();
  report.pass = report.fixtures.every((item) => item.pass);
  const stateMap = buildStateMap(report);
  await fs.writeFile(path.join(REPORT_DIR, 'visual-state-candidates-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(path.join(REPORT_DIR, 'visual-state-candidates-results.md'), renderMarkdown(report), 'utf8');
  await fs.writeFile(path.join(REPORT_DIR, 'visual-state-candidates-state-map.json'), `${JSON.stringify(stateMap, null, 2)}\n`, 'utf8');
  await fs.writeFile(path.join(REPORT_DIR, 'visual-state-candidates-state-map.md'), renderStateMapMarkdown(stateMap), 'utf8');
  console.log(`VISUAL STATE CANDIDATE SMOKE ${report.pass ? 'PASS' : 'FAIL'}`);
  if (!report.pass) process.exitCode = 1;
}

function buildStateMap(report) {
  const fixtures = {};
  for (const item of report.fixtures ?? []) {
    const best = item.bestCandidate ?? null;
    const initial = item.candidates?.find((candidate) => candidate.name === 'initial') ?? null;
    const bestState = Object.fromEntries(
      (best?.state ?? []).map((row) => [
        row.name.replace(/^attr_/, ''),
        row.value,
      ]),
    );
    fixtures[item.id] = {
      fixtureId: item.id,
      actionName: best?.name ?? null,
      actionLabel: best?.label ?? null,
      hiddenAttrs: bestState,
      bestMismatchRatio: best?.diff?.best?.mismatchRatio ?? null,
      initialMismatchRatio: initial?.diff?.best?.mismatchRatio ?? null,
      bestCaptureCrop: best?.diff?.best?.captureCrop ?? null,
      candidateCount: item.candidates?.length ?? 0,
      sourceReport: path.join(REPORT_DIR, 'visual-state-candidates-results.json'),
      scope: 'local preview action-state hint; not Roll20 visual parity',
    };
  }
  return {
    generatedAt: report.finishedAt ?? report.startedAt,
    sourceReport: path.join(REPORT_DIR, 'visual-state-candidates-results.json'),
    scope: 'local preview action-state hints for downstream visual diff triage',
    fixtures,
  };
}

function renderStateMapMarkdown(stateMap) {
  const lines = [
    '# Visual State Candidate State Map',
    '',
    `Generated: ${stateMap.generatedAt}`,
    '',
    'Scope: local preview action-state hints for downstream visual diff triage. This is not actual Roll20 visual parity.',
    '',
    '| Fixture | Recommended action | Best mismatch | Initial mismatch | Hidden attrs | Best crop |',
    '| --- | --- | ---: | ---: | --- | --- |',
  ];
  for (const item of Object.values(stateMap.fixtures ?? {})) {
    const attrs = Object.entries(item.hiddenAttrs ?? {})
      .map(([key, value]) => `${key}=${value}`)
      .join(', ');
    lines.push(
      `| \`${item.fixtureId}\` | ${item.actionName ?? ''}${item.actionLabel ? ` (${escapePipe(item.actionLabel)})` : ''} | ${pct(item.bestMismatchRatio)} | ${pct(item.initialMismatchRatio)} | ${escapePipe(attrs)} | ${(item.bestCaptureCrop ?? []).join(',')} |`,
    );
  }
  lines.push('');
  lines.push('Use this as a hint when normalizing fixture default tab/state before pixel comparison. Do not commit generated state maps or screenshots.');
  return `${lines.join('\n')}\n`;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
