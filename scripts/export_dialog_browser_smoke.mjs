#!/usr/bin/env node
/**
 * Browser smoke for header import/export actions, the empty editor shell, and
 * the Roll20 export readiness panel.
 *
 * Runs against the statically exported app in `out/`. The app is built with
 * `basePath=/roll20-block-editor` for GitHub Pages, so this local server strips
 * that prefix before reading files from disk.
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
const REPORT_DIR = path.resolve(argOf('--report-dir', 'reports/export-dialog-smoke'));
const PORT = Number(argOf('--port', '4182'));
const FIXTURES_DIR = path.resolve(argOf('--fixtures', 'test-fixtures/visual'));
const FIXTURE_ID = argOf('--fixture', '');

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

function hasMojibake(text) {
  if (text.includes('\ufffd')) return true;
  return ['鍮', '嫄', '援', '濡', '瑜', '以', '踰', '留', '硫', '媛', '寃', '?ㅼ', '?대', '?쒗', '?섑'].some(
    (token) => text.includes(token),
  );
}

async function readMaybe(file) {
  try {
    return await fs.readFile(file, 'utf8');
  } catch {
    return '';
  }
}

async function loadFixture(id) {
  if (!id) return null;
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
    const bytes = (value) => new TextEncoder().encode(value ?? '').length;
    window.__perfHook.clearAll();
    await sleep(700);
    let last = null;
    for (let i = 0; i < 40; i += 1) {
      last = await window.__perfHook.importSheet({ html, css, i18n });
      if (last.blockCount > 0) break;
      await sleep(500);
    }
    const emit = window.__perfHook.getEmitContent();
    return {
      result: last,
      emitBytes: {
        html: bytes(emit.html),
        css: bytes(emit.css),
        i18n: bytes(emit.i18n),
        worker: bytes(emit.worker),
      },
    };
  }, fixture);
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

    if (fixture) {
      await warmPerfHook(page);
      result.checks.importedFixture = await importFixture(page, fixture);
      if ((result.checks.importedFixture.result?.blockCount ?? 0) <= 0) {
        throw new Error(`fixture ${fixture.id} did not import any blocks`);
      }
    }

    result.checks.shell = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        hasHeaderTitle: bodyText.includes('Roll20 시트 편집기'),
        hasEmptyTitle: bodyText.includes('새 Roll20 시트를 만들어볼까요?'),
        hasBlankCta: bodyText.includes('빈 시트로 시작'),
        hasSampleCta: bodyText.includes('샘플 시트 보기'),
        hasSampleMenu: bodyText.includes('샘플 시트'),
        bodyText,
      };
    });
    result.checks.shell.hasMojibake = hasMojibake(result.checks.shell.bodyText);
    delete result.checks.shell.bodyText;
    await page.screenshot({ path: path.join(REPORT_DIR, 'initial-shell.png') });

    await page.click('[data-testid="header-export-button"]');
    await page.waitForSelector('[data-testid="export-roll20-readiness"]', { timeout: 15000 });
    result.checks.exportDialog = await page.evaluate(() => {
      const dialogText = document.querySelector('[role="dialog"]')?.textContent ?? '';
      return {
        hasTitle: dialogText.includes('Roll20용 zip 내보내기'),
        hasReadiness: Boolean(document.querySelector('[data-testid="export-roll20-readiness"]')),
        readinessItemCount: document.querySelectorAll('[data-testid="export-roll20-readiness-item"]').length,
        badgeText: document.querySelector('[data-testid="export-roll20-verification-badge"]')?.textContent?.trim() ?? '',
        hasAssetPreflight: Boolean(document.querySelector('[data-testid="export-asset-preflight"]')),
        assetPreflightStatus: document.querySelector('[data-testid="export-asset-preflight-status"]')?.textContent?.trim() ?? '',
        hasSandboxDiagnostics: Boolean(document.querySelector('[data-testid="export-roll20-sandbox-diagnostics"]')),
        sandboxDiagnosticItemCount: document.querySelectorAll('[data-testid="export-roll20-sandbox-diagnostic-item"]').length,
        sandboxStatus: document.querySelector('[data-testid="export-roll20-sandbox-status"]')?.textContent?.trim() ?? '',
        sandboxDiagnosticStates: Array.from(document.querySelectorAll('[data-testid="export-roll20-sandbox-diagnostic-item"]')).map((el) => ({
          state: el.getAttribute('data-state') ?? '',
          text: el.textContent?.trim() ?? '',
        })),
        hasLegacyToggle: dialogText.includes('구버전 Roll20 무해화'),
        hasLocalVsActualCopy: dialogText.includes('실제 Roll20 화면 일치는 Sandbox 또는 테스트 방에 올린 뒤 스크린샷으로 다시 확인해야 합니다.'),
        hasFileAccessCopy: dialogText.includes('Chrome 파일 선택이 막히면 Codex/브라우저 파일 접근 권한을 확인하고 다시 업로드하세요.'),
        hasZipIsNotProofCopy: dialogText.includes('zip 다운로드만으로는 Roll20 실제 표시가 검증된 것이 아닙니다.'),
        hasAssetPreflightCopy: dialogText.includes('zip에는 HTML, CSS, translation만 들어갑니다.'),
        hasAssetRiskCopy: dialogText.includes('외부 이미지/폰트는 zip에 포함되지 않습니다.'),
        downloadButtonEnabled: !document.querySelector('[data-testid="export-download-button"]')?.disabled,
        dialogText,
      };
    });
    result.checks.exportDialog.hasMojibake = hasMojibake(result.checks.exportDialog.dialogText);
    delete result.checks.exportDialog.dialogText;
    await page.screenshot({ path: path.join(REPORT_DIR, 'export-dialog.png') });

    await page.keyboard.press('Escape');
    await page.waitForSelector('[data-testid="export-roll20-readiness"]', {
      state: 'detached',
      timeout: 5000,
    }).catch(() => {});

    await page.click('[data-testid="header-import-button"]');
    await page.waitForSelector('[role="dialog"]', { timeout: 15000 });
    result.checks.importDialog = await page.evaluate(() => ({
      hasTitle: document.body.innerText.includes('시트 불러오기'),
      textareaCount: document.querySelectorAll('textarea').length,
      hasProgressNode: Boolean(document.querySelector('[data-testid="import-progress"]')),
    }));

    await page.keyboard.press('Escape');
    await page.click('[data-testid="main-mode-edit"]');
    result.checks.mainModeEdit = await page.evaluate(() => ({
      editSelected: document.querySelector('[data-testid="main-mode-edit"]')?.getAttribute('aria-selected'),
      splitSelected: document.querySelector('[data-testid="main-mode-split"]')?.getAttribute('aria-selected'),
    }));

    const failures = [];
    if (!result.checks.shell.hasHeaderTitle) failures.push('header title missing');
    if (!fixture && !result.checks.shell.hasEmptyTitle) failures.push('empty state title missing');
    if (!fixture && !result.checks.shell.hasBlankCta) failures.push('blank sheet CTA missing');
    if (result.checks.shell.hasSampleCta || result.checks.shell.hasSampleMenu) failures.push('sample UI visible with empty public catalog');
    if (result.checks.shell.hasMojibake) failures.push('mojibake detected in initial shell text');
    if (!result.checks.exportDialog.hasTitle) failures.push('export dialog title missing');
    if (!result.checks.exportDialog.hasReadiness) failures.push('export readiness panel missing');
    if (result.checks.exportDialog.readinessItemCount !== 6) failures.push('export readiness item count mismatch');
    if (result.checks.exportDialog.badgeText !== '실제 검증 필요') failures.push('export verification badge mismatch');
    if (!result.checks.exportDialog.hasAssetPreflight) failures.push('export asset preflight panel missing');
    if (!['외부 자산 없음', '확인 필요'].includes(result.checks.exportDialog.assetPreflightStatus)) {
      failures.push('export asset preflight status mismatch');
    }
    if (!result.checks.exportDialog.hasSandboxDiagnostics) failures.push('export sandbox diagnostics panel missing');
    if (result.checks.exportDialog.sandboxDiagnosticItemCount !== 4) failures.push('export sandbox diagnostics item count mismatch');
    if (!['치명 오류 없음', '수정 필요'].includes(result.checks.exportDialog.sandboxStatus)) {
      failures.push('export sandbox diagnostics status mismatch');
    }
    if (fixture && result.checks.exportDialog.sandboxStatus !== '치명 오류 없음') {
      failures.push('imported fixture sandbox diagnostics should have no fatal error');
    }
    if (fixture && !result.checks.exportDialog.sandboxDiagnosticStates.some((item) => item.state === 'rewritten')) {
      failures.push('imported fixture sandbox diagnostics did not report any expected rewrite');
    }
    if (!result.checks.exportDialog.hasLegacyToggle) failures.push('legacy toggle copy missing');
    if (!result.checks.exportDialog.hasLocalVsActualCopy) failures.push('local-vs-actual verification copy missing');
    if (!result.checks.exportDialog.hasFileAccessCopy) failures.push('file-access blocker copy missing');
    if (!result.checks.exportDialog.hasZipIsNotProofCopy) failures.push('zip-is-not-proof copy missing');
    if (!result.checks.exportDialog.hasAssetPreflightCopy) failures.push('asset preflight copy missing');
    if (
      result.checks.exportDialog.assetPreflightStatus === '확인 필요' &&
      !result.checks.exportDialog.hasAssetRiskCopy
    ) {
      failures.push('asset risk copy missing');
    }
    if (result.checks.exportDialog.hasMojibake) failures.push('mojibake detected in export dialog text');
    if (!result.checks.importDialog.hasTitle) failures.push('import dialog title missing');
    if (result.checks.importDialog.textareaCount < 1) failures.push('import dialog textarea missing');
    if (result.checks.mainModeEdit.editSelected !== 'true') failures.push('main mode edit did not select');
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
    path.join(REPORT_DIR, 'export-dialog-smoke-results.json'),
    `${JSON.stringify(result, null, 2)}\n`,
  );
  await fs.writeFile(
    path.join(REPORT_DIR, 'export-dialog-smoke-results.md'),
    [
      '# Export Dialog Browser Smoke',
      '',
      `Status: ${result.status}`,
      `URL: \`${result.url}\``,
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
