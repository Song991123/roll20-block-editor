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
  return /[\u4e00-\u9fff]/.test(text);
}

async function readMaybe(file) {
  try {
    return await fs.readFile(file, 'utf8');
  } catch {
    return '';
  }
}

async function safeScreenshot(page, file) {
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await page.screenshot({ path: file });
      return;
    } catch (err) {
      lastError = err;
      await page.waitForTimeout(350 * attempt);
    }
  }
  throw lastError;
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

async function verifyAssetReplacementRender(page) {
  const oldUrl = 'https://example.invalid/r20-original-asset.png';
  const newUrl = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
  const html = `<div class="asset-probe" data-asset-url="${oldUrl}">asset probe</div>`;
  const css = `.asset-probe::before{content:"${oldUrl}"}`;
  const mapText = `${oldUrl} => ${newUrl}`;

  await warmPerfHook(page);
  await page.evaluate(async ({ html: h, css: c, map }) => {
    window.__perfHook.clearAll();
    window.__perfHook.setAssetReplacementMap(map);
    await window.__perfHook.importSheet({ html: h, css: c, i18n: '{}' });
    window.__perfHook.saveAssetReplacementProfile('Synthetic relink profile');
    window.__perfHook.setPreviewZoom(1);
    window.__perfHook.setPreviewRenderMode('iframe');
    window.__perfHook.setMainMode('preview');
  }, { html, css, map: mapText });

  await page.waitForSelector('[data-testid="preview-iframe"]', { timeout: 15000 });
  await page.waitForFunction(
    ({ oldNeedle, newNeedle }) => {
      const iframe = document.querySelector('[data-testid="preview-iframe"]');
      const srcdoc = iframe?.getAttribute('srcdoc') ?? '';
      return srcdoc.includes(newNeedle) && !srcdoc.includes(oldNeedle);
    },
    { oldNeedle: oldUrl, newNeedle: newUrl },
    { timeout: 15000 },
  );

  const preview = await page.evaluate(({ oldNeedle, newNeedle }) => {
    const iframe = document.querySelector('[data-testid="preview-iframe"]');
    const srcdoc = iframe?.getAttribute('srcdoc') ?? '';
    return {
      hasNewUrl: srcdoc.includes(newNeedle),
      hasOldUrl: srcdoc.includes(oldNeedle),
      mapValue: window.__perfHook.getAssetReplacementMap(),
      profileCount: window.__perfHook.getAssetReplacementProfiles().length,
    };
  }, { oldNeedle: oldUrl, newNeedle: newUrl });

  await page.evaluate(() => window.__perfHook.setMainMode('edit'));
  await page.waitForSelector('[data-testid="edit-canvas-shadow-host"]', { timeout: 15000 });
  await page.waitForFunction(
    ({ oldNeedle, newNeedle }) => {
      const host = document.querySelector('[data-testid="edit-canvas-shadow-host"]');
      const styles = Array.from(host?.shadowRoot?.querySelectorAll('style') ?? [])
        .map((style) => style.textContent ?? '')
        .join('\n');
      const htmlText = host?.shadowRoot?.innerHTML ?? '';
      const combined = `${styles}\n${htmlText}`;
      return combined.includes(newNeedle) && !combined.includes(oldNeedle);
    },
    { oldNeedle: oldUrl, newNeedle: newUrl },
    { timeout: 15000 },
  );

  const edit = await page.evaluate(({ oldNeedle, newNeedle }) => {
    const host = document.querySelector('[data-testid="edit-canvas-shadow-host"]');
    const styles = Array.from(host?.shadowRoot?.querySelectorAll('style') ?? [])
      .map((style) => style.textContent ?? '')
      .join('\n');
    const htmlText = host?.shadowRoot?.innerHTML ?? '';
    const combined = `${styles}\n${htmlText}`;
    return {
      hasNewUrl: combined.includes(newNeedle),
      hasOldUrl: combined.includes(oldNeedle),
    };
  }, { oldNeedle: oldUrl, newNeedle: newUrl });

  await page.click('[data-testid="header-save-button"]');
  await page.waitForFunction(
    async ({ mapNeedle }) => {
      const record = await new Promise((resolve) => {
        const req = indexedDB.open('roll20-block-editor');
        req.onerror = () => resolve(null);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('workspaces', 'readonly');
          const getReq = tx.objectStore('workspaces').get('autosave-current');
          getReq.onerror = () => resolve(null);
          getReq.onsuccess = () => {
            db.close();
            resolve(getReq.result ?? null);
          };
        };
      });
      return Boolean(record?.xml?.includes(mapNeedle));
    },
    { mapNeedle: mapText },
    { timeout: 15000 },
  );
  const persisted = await page.evaluate(({ mapNeedle }) => new Promise((resolve) => {
    const req = indexedDB.open('roll20-block-editor');
    req.onerror = () => resolve({ hasMap: false });
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('workspaces', 'readonly');
      const getReq = tx.objectStore('workspaces').get('autosave-current');
      getReq.onerror = () => resolve({ hasMap: false });
      getReq.onsuccess = () => {
        const xml = getReq.result?.xml ?? '';
        db.close();
        resolve({
          hasMap: xml.includes(mapNeedle),
          hasPreviewNode: xml.includes('<asset-replacement-map><![CDATA['),
          hasProfileNode: xml.includes('<asset-replacement-profiles'),
          hasProfileName: xml.includes('Synthetic relink profile'),
        });
      };
    };
  }), { mapNeedle: mapText });

  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => Boolean(window.__perfHook), null, { timeout: 30000 });
  await page.waitForSelector('[data-testid="autosave-restore"]', { timeout: 15000 });
  await page.click('[data-testid="autosave-restore"]');
  await page.waitForFunction(
    ({ mapNeedle }) => window.__perfHook.getAssetReplacementMap() === mapNeedle,
    { mapNeedle: mapText },
    { timeout: 15000 },
  );
  const restored = await page.evaluate(({ mapNeedle }) => ({
    mapRestored: window.__perfHook.getAssetReplacementMap() === mapNeedle,
    profileRestored: window.__perfHook.getAssetReplacementProfiles().some((profile) => (
      profile.name === 'Synthetic relink profile' && profile.text === mapNeedle
    )),
  }), { mapNeedle: mapText });

  await page.click('[data-testid="header-export-button"]');
  await page.waitForSelector('[data-testid="export-asset-map-copy"]', { timeout: 15000 });
  const exportMapUi = await page.evaluate(() => ({
    hasCopy: Boolean(document.querySelector('[data-testid="export-asset-map-copy"]')),
    hasDownload: Boolean(document.querySelector('[data-testid="export-asset-map-download"]')),
    hasCliHint: Boolean(document.querySelector('[data-testid="export-asset-map-cli-hint"]')?.textContent?.includes('plan:roll20-asset-relink --map-file')),
    hasRoll20Readiness: Boolean(document.querySelector('[data-testid="export-asset-roll20-readiness"]')),
    localOnlyTargets: document.querySelector('[data-testid="export-asset-roll20-readiness"]')?.getAttribute('data-local-only-targets') ?? '',
    roll20ReadyTargets: document.querySelector('[data-testid="export-asset-roll20-readiness"]')?.getAttribute('data-roll20-ready-targets') ?? '',
    placeholderTargets: document.querySelector('[data-testid="export-asset-roll20-readiness"]')?.getAttribute('data-placeholder-targets') ?? '',
    copyEnabled: !document.querySelector('[data-testid="export-asset-map-copy"]')?.disabled,
    downloadEnabled: !document.querySelector('[data-testid="export-asset-map-download"]')?.disabled,
  }));
  await page.keyboard.press('Escape');
  await page.waitForSelector('[data-testid="export-asset-map-copy"]', {
    state: 'detached',
    timeout: 5000,
  }).catch(() => {});

  return { oldUrl, newUrl, preview, edit, persisted, restored, exportMapUi };
}

async function verifyAssetReplacementPlaceholderGuard(page) {
  const oldUrl = 'https://example.invalid/r20-placeholder-source.png';
  const placeholderTarget = '<paste-user-owned-https-url-here>';
  const mapText = `${oldUrl} => ${placeholderTarget}`;
  await warmPerfHook(page);
  await page.evaluate(async ({ html, map }) => {
    window.__perfHook.clearAll();
    window.__perfHook.setAssetReplacementMap(map);
    await window.__perfHook.importSheet({ html, css: '', i18n: '{}' });
    window.__perfHook.setMainMode('preview');
  }, { html: `<input type="hidden" name="attr_asset_placeholder_probe" value="${oldUrl}">`, map: mapText });

  await page.waitForSelector('[data-testid="preview-iframe"]', { timeout: 15000 });
  const preview = await page.evaluate(({ oldNeedle, placeholderNeedle }) => {
    const iframe = document.querySelector('[data-testid="preview-iframe"]');
    const srcdoc = iframe?.getAttribute('srcdoc') ?? '';
    return {
      hasOldUrl: srcdoc.includes(oldNeedle),
      hasPlaceholderTarget: srcdoc.includes(placeholderNeedle),
      mapValue: window.__perfHook.getAssetReplacementMap(),
    };
  }, { oldNeedle: oldUrl, placeholderNeedle: placeholderTarget });

  await page.click('[data-testid="header-export-button"]');
  await page.waitForSelector('[data-testid="export-asset-roll20-readiness"]', { timeout: 15000 });
  const ui = await page.evaluate(() => {
    const readiness = document.querySelector('[data-testid="export-asset-roll20-readiness"]');
    const status = document.querySelector('[data-testid="export-asset-replacement-status"]');
    const warningItems = Array.from(document.querySelectorAll('[data-testid="export-asset-replacement-map"] li'));
    return {
      placeholderTargets: readiness?.getAttribute('data-placeholder-targets') ?? '',
      localOnlyTargets: readiness?.getAttribute('data-local-only-targets') ?? '',
      roll20ReadyTargets: readiness?.getAttribute('data-roll20-ready-targets') ?? '',
      readinessText: readiness?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
      statusText: status?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
      warningText: warningItems.map((item) => item.textContent?.replace(/\s+/g, ' ').trim() ?? '').join('\n'),
    };
  });
  await page.keyboard.press('Escape');
  await page.waitForSelector('[data-testid="export-asset-roll20-readiness"]', {
    state: 'detached',
    timeout: 5000,
  }).catch(() => {});

  return { oldUrl, placeholderTarget, preview, ui };
}

async function verifyExportAssetDraft(page) {
  const sourceUrl = 'https://imgur.com/export-dead';
  await warmPerfHook(page);
  await page.evaluate(async ({ html }) => {
    window.__perfHook.clearAll();
    window.__perfHook.setAssetReplacementMap('');
    await window.__perfHook.importSheet({ html, css: '', i18n: '{}' });
    window.__perfHook.setMainMode('preview');
  }, { html: `<a href="${sourceUrl}">export asset probe</a>` });

  await page.click('[data-testid="header-export-button"]');
  await page.waitForSelector('[data-testid="export-asset-replacement-draft"]', { timeout: 15000 });
  const before = await page.evaluate(() => ({
    disabled: Boolean(document.querySelector('[data-testid="export-asset-replacement-draft"]')?.disabled),
  }));
  await page.click('[data-testid="export-asset-replacement-draft"]');
  await page.waitForFunction(
    ({ url }) => window.__perfHook.getAssetReplacementMap().includes(url),
    { url: sourceUrl },
    { timeout: 15000 },
  );
  const after = await page.evaluate(({ url }) => {
    const map = window.__perfHook.getAssetReplacementMap();
    return {
      hasSourceUrl: map.includes(url),
      isCommentedDraft: map.includes(`# ${url} => <paste-user-owned-https-url-here>`),
      hasExportSourceLabel: map.includes('Asset replacement draft from export preflight.'),
    };
  }, { url: sourceUrl });
  await page.keyboard.press('Escape');
  await page.waitForSelector('[data-testid="export-asset-replacement-draft"]', {
    state: 'detached',
    timeout: 5000,
  }).catch(() => {});
  return { sourceUrl, before, after };
}

async function main() {
  await fs.mkdir(REPORT_DIR, { recursive: true });
  const fixture = await loadFixture(FIXTURE_ID);
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1480, height: 960 } });
  const consoleIssues = [];
  const pageErrors = [];
  const requestFailures = [];
  const externalResourceRequests = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      consoleIssues.push(`${msg.type()}: ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => pageErrors.push(String(err)));
  page.on('requestfailed', (request) => {
    requestFailures.push({
      url: request.url(),
      errorText: request.failure()?.errorText ?? '',
    });
  });

  const result = {
    status: 'PASS',
    url: `http://127.0.0.1:${PORT}${BASE_PATH}/`,
    startedAt: new Date().toISOString(),
    checks: {},
    consoleIssues,
    pageErrors,
    requestFailures,
    externalResourceRequests,
  };

  try {
    await page.route('https://cdn.jsdelivr.net/**', (route) => {
      externalResourceRequests.push(route.request().url());
      return route.fulfill({
        status: 200,
        contentType: 'text/css; charset=utf-8',
        body: '',
      });
    });
    await page.route('https://blockly-demo.appspot.com/static/media/sprites.png', (route) => {
      externalResourceRequests.push(route.request().url());
      return route.fulfill({
        status: 200,
        contentType: 'image/png',
        body: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
          'base64',
        ),
      });
    });
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
        hasLocalPreviewBoundaryCopy: bodyText.includes('Roll20 형식 시트를 로컬에서 미리 보는 자리예요.'),
        hasActualRoll20PreviewClaim: bodyText.includes('실제 Roll20 시트가 렌더되는 자리예요.'),
        hasCurrentLocalPreviewBoundaryCopy: bodyText.includes('Roll20 형식 시트를 로컬에서 미리 보는 자리입니다.'),
        bodyText,
      };
    });
    result.checks.shell.hasMojibake = hasMojibake(result.checks.shell.bodyText);
    delete result.checks.shell.bodyText;
    await safeScreenshot(page, path.join(REPORT_DIR, 'initial-shell.png'));

    await page.click('[data-testid="header-export-button"]');
    await page.waitForSelector('[data-testid="export-roll20-readiness"]', { timeout: 15000 });
    result.checks.exportDialog = await page.evaluate(() => {
      const dialogText = document.querySelector('[role="dialog"]')?.textContent ?? '';
      return {
        hasTitle: dialogText.includes('Roll20 zip 내보내기'),
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
        hasLocalVsActualCopy: dialogText.includes('실제 Roll20 화면 일치는 Sandbox나 새 테스트 방에 올린 뒤 스크린샷으로 다시 확인해야 합니다.'),
        hasFileAccessCopy: dialogText.includes('Chrome 파일 선택이 막히면 브라우저 파일 접근 권한을 확인하고 다시 업로드하세요.'),
        hasZipIsNotProofCopy: dialogText.includes('zip 다운로드만으로는 Roll20 실제 표시가 검증된 것이 아닙니다.'),
        hasAssetPreflightCopy: dialogText.includes('zip에는 HTML, CSS, translation만 들어갑니다.'),
        hasAssetRiskCopy: dialogText.includes('외부 이미지/폰트는 zip에 포함되지 않습니다.'),
        hasAssetProxyMetric: dialogText.includes('Roll20 proxy'),
        hasAssetPlaceholderMetric: dialogText.includes('placeholder risk'),
        hasAssetReplacementMap: Boolean(document.querySelector('[data-testid="export-asset-replacement-map"]')),
        hasAssetReplacementInput: Boolean(document.querySelector('[data-testid="export-asset-replacement-input"]')),
        hasAssetReplacementDraft: Boolean(document.querySelector('[data-testid="export-asset-replacement-draft"]')),
        hasAssetReplacementProfiles: Boolean(document.querySelector('[data-testid="export-asset-replacement-profiles"]')),
        hasAssetProfileName: Boolean(document.querySelector('[data-testid="export-asset-profile-name"]')),
        hasAssetProfileSelect: Boolean(document.querySelector('[data-testid="export-asset-profile-select"]')),
        hasAssetProfileSave: Boolean(document.querySelector('[data-testid="export-asset-profile-save"]')),
        hasAssetProfileDelete: Boolean(document.querySelector('[data-testid="export-asset-profile-delete"]')),
        hasAssetMapCopy: Boolean(document.querySelector('[data-testid="export-asset-map-copy"]')),
        hasAssetMapDownload: Boolean(document.querySelector('[data-testid="export-asset-map-download"]')),
        hasAssetMapCliHint: Boolean(document.querySelector('[data-testid="export-asset-map-cli-hint"]')?.textContent?.includes('plan:roll20-asset-relink --map-file')),
        assetReplacementStatus: document.querySelector('[data-testid="export-asset-replacement-status"]')?.textContent?.trim() ?? '',
        downloadButtonEnabled: !document.querySelector('[data-testid="export-download-button"]')?.disabled,
        dialogText,
      };
    });
    result.checks.exportDialog.hasMojibake = hasMojibake(result.checks.exportDialog.dialogText);
    delete result.checks.exportDialog.dialogText;
    await safeScreenshot(page, path.join(REPORT_DIR, 'export-dialog.png'));

    await page.keyboard.press('Escape');
    await page.waitForSelector('[data-testid="export-roll20-readiness"]', {
      state: 'detached',
      timeout: 5000,
    }).catch(() => {});

    await page.click('[data-testid="header-import-button"]');
    await page.waitForSelector('[role="dialog"]', { timeout: 15000 });
    await page.fill('[role="dialog"] textarea', '<img src="https://imgur.com/dead">');
    await page.waitForSelector('[data-testid="import-asset-replacement-draft"]', { timeout: 5000 });
    result.checks.importDialog = await page.evaluate(() => ({
      hasTitle: document.body.innerText.includes('외부 시트 불러오기'),
      textareaCount: document.querySelectorAll('textarea').length,
      hasProgressNode: Boolean(document.querySelector('[data-testid="import-progress"]')),
      hasAssetPreflight: Boolean(document.querySelector('[data-testid="import-asset-preflight"]')),
      assetPreflightStatus: document.querySelector('[data-testid="import-asset-preflight-status"]')?.textContent?.trim() ?? '',
      hasAssetProxyMetric: document.body.innerText.includes('Roll20 proxy'),
      hasAssetPlaceholderMetric: document.body.innerText.includes('placeholder risk'),
      hasAssetReplacementDraft: Boolean(document.querySelector('[data-testid="import-asset-replacement-draft"]')),
    }));
    await page.waitForFunction(() => Boolean(window.__perfHook), null, { timeout: 15000 });
    await page.click('[data-testid="import-asset-replacement-draft"]');
    result.checks.importAssetDraft = await page.evaluate(() => {
      const map = window.__perfHook.getAssetReplacementMap();
      return {
        hasSourceUrl: map.includes('https://imgur.com/dead'),
        isCommentedDraft: map.includes('# https://imgur.com/dead => <paste-user-owned-https-url-here>'),
      };
    });

    await page.keyboard.press('Escape');
    result.checks.exportAssetDraft = await verifyExportAssetDraft(page);
    result.checks.exportAssetPlaceholderGuard = await verifyAssetReplacementPlaceholderGuard(page);
    result.checks.assetReplacementRender = await verifyAssetReplacementRender(page);
    await page.click('[data-testid="main-mode-edit"]');
    result.checks.mainModeEdit = await page.evaluate(() => ({
      editSelected: document.querySelector('[data-testid="main-mode-edit"]')?.getAttribute('aria-selected'),
      splitSelected: document.querySelector('[data-testid="main-mode-split"]')?.getAttribute('aria-selected'),
    }));

    const failures = [];
    if (!result.checks.shell.hasHeaderTitle) failures.push('header title missing');
    if (!fixture && !result.checks.shell.hasEmptyTitle) failures.push('empty state title missing');
    if (!fixture && !result.checks.shell.hasBlankCta) failures.push('blank sheet CTA missing');
    if (
      !fixture &&
      !result.checks.shell.hasLocalPreviewBoundaryCopy &&
      !result.checks.shell.hasCurrentLocalPreviewBoundaryCopy
    ) {
      failures.push('local preview boundary copy missing');
    }
    if (result.checks.shell.hasActualRoll20PreviewClaim) failures.push('misleading actual Roll20 preview claim visible');
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
    if (!result.checks.exportDialog.hasAssetProxyMetric) failures.push('asset proxy metric missing');
    if (!result.checks.exportDialog.hasAssetPlaceholderMetric) failures.push('asset placeholder metric missing');
    if (!result.checks.exportDialog.hasAssetReplacementMap) failures.push('asset replacement map missing');
    if (!result.checks.exportDialog.hasAssetReplacementInput) failures.push('asset replacement input missing');
    if (!result.checks.exportDialog.hasAssetReplacementDraft) failures.push('asset replacement draft button missing');
    if (!result.checks.exportDialog.hasAssetReplacementProfiles) failures.push('asset replacement profile manager missing');
    if (!result.checks.exportDialog.hasAssetProfileName) failures.push('asset replacement profile name input missing');
    if (!result.checks.exportDialog.hasAssetProfileSelect) failures.push('asset replacement profile select missing');
    if (!result.checks.exportDialog.hasAssetProfileSave) failures.push('asset replacement profile save button missing');
    if (!result.checks.exportDialog.hasAssetProfileDelete) failures.push('asset replacement profile delete button missing');
    if (!result.checks.exportDialog.hasAssetMapCopy) failures.push('asset replacement map copy button missing');
    if (!result.checks.exportDialog.hasAssetMapDownload) failures.push('asset replacement map download button missing');
    if (!result.checks.exportDialog.hasAssetMapCliHint) failures.push('asset replacement map CLI hint missing');
    if (!result.checks.exportDialog.assetReplacementStatus) failures.push('asset replacement status missing');
    if (
      result.checks.exportDialog.assetPreflightStatus === '확인 필요' &&
      !result.checks.exportDialog.hasAssetRiskCopy
    ) {
      failures.push('asset risk copy missing');
    }
    if (result.checks.exportDialog.hasMojibake) failures.push('mojibake detected in export dialog text');
    if (!result.checks.importDialog.hasTitle) failures.push('import dialog title missing');
    if (result.checks.importDialog.textareaCount < 1) failures.push('import dialog textarea missing');
    if (!result.checks.importDialog.hasAssetPreflight) failures.push('import asset preflight missing');
    if (!['외부 자산 없음', '확인 필요'].includes(result.checks.importDialog.assetPreflightStatus)) {
      failures.push('import asset preflight status mismatch');
    }
    if (!result.checks.importDialog.hasAssetProxyMetric) failures.push('import asset proxy metric missing');
    if (!result.checks.importDialog.hasAssetPlaceholderMetric) failures.push('import asset placeholder metric missing');
    if (!result.checks.importDialog.hasAssetReplacementDraft) failures.push('import asset replacement draft button missing');
    if (!result.checks.importAssetDraft.hasSourceUrl) failures.push('import asset draft missing source URL');
    if (!result.checks.importAssetDraft.isCommentedDraft) failures.push('import asset draft should be commented until user relinks');
    if (result.checks.exportAssetDraft.before.disabled) failures.push('export asset draft button disabled for export asset URL');
    if (!result.checks.exportAssetDraft.after.hasSourceUrl) failures.push('export asset draft missing source URL');
    if (!result.checks.exportAssetDraft.after.isCommentedDraft) failures.push('export asset draft should be commented until user relinks');
    if (!result.checks.exportAssetDraft.after.hasExportSourceLabel) failures.push('export asset draft source label missing');
    if (!result.checks.assetReplacementRender.preview.hasNewUrl) failures.push('asset replacement did not reach preview iframe');
    if (result.checks.assetReplacementRender.preview.hasOldUrl) failures.push('original asset URL leaked in preview iframe');
    if (result.checks.assetReplacementRender.preview.profileCount < 1) failures.push('asset replacement profile was not created in preview store');
    if (!result.checks.assetReplacementRender.edit.hasNewUrl) failures.push('asset replacement did not reach edit shadow render');
    if (result.checks.assetReplacementRender.edit.hasOldUrl) failures.push('original asset URL leaked in edit shadow render');
    if (!result.checks.assetReplacementRender.persisted.hasMap) failures.push('asset replacement map was not saved to autosave XML');
    if (!result.checks.assetReplacementRender.persisted.hasPreviewNode) failures.push('asset replacement autosave preview node missing');
    if (!result.checks.assetReplacementRender.persisted.hasProfileNode) failures.push('asset replacement profile autosave node missing');
    if (!result.checks.assetReplacementRender.persisted.hasProfileName) failures.push('asset replacement profile name was not saved');
    if (!result.checks.assetReplacementRender.restored.mapRestored) failures.push('asset replacement map did not restore from autosave');
    if (!result.checks.assetReplacementRender.restored.profileRestored) failures.push('asset replacement profile did not restore from autosave');
    if (!result.checks.assetReplacementRender.exportMapUi.hasCopy) failures.push('restored asset map copy button missing');
    if (!result.checks.assetReplacementRender.exportMapUi.hasDownload) failures.push('restored asset map download button missing');
    if (!result.checks.assetReplacementRender.exportMapUi.hasCliHint) failures.push('restored asset map CLI hint missing');
    if (!result.checks.assetReplacementRender.exportMapUi.hasRoll20Readiness) failures.push('asset replacement Roll20 readiness note missing');
    if (result.checks.assetReplacementRender.exportMapUi.localOnlyTargets !== '1') failures.push('asset replacement local-only target count missing');
    if (result.checks.assetReplacementRender.exportMapUi.roll20ReadyTargets !== '0') failures.push('asset replacement Roll20-ready target count should be 0 for data URL smoke');
    if (result.checks.assetReplacementRender.exportMapUi.placeholderTargets !== '0') failures.push('asset replacement placeholder target count should be 0 for valid data URL smoke');
    if (!result.checks.assetReplacementRender.exportMapUi.copyEnabled) failures.push('restored asset map copy button disabled');
    if (!result.checks.assetReplacementRender.exportMapUi.downloadEnabled) failures.push('restored asset map download button disabled');
    if (!result.checks.exportAssetPlaceholderGuard.preview.hasOldUrl) failures.push('placeholder target guard should leave original URL unchanged');
    if (result.checks.exportAssetPlaceholderGuard.preview.hasPlaceholderTarget) failures.push('placeholder target leaked into preview render');
    if (result.checks.exportAssetPlaceholderGuard.ui.placeholderTargets !== '1') failures.push('placeholder target readiness count missing');
    if (result.checks.exportAssetPlaceholderGuard.ui.roll20ReadyTargets !== '0') failures.push('placeholder guard should not count Roll20-ready targets');
    if (!/미입력|placeholder|채워/.test(result.checks.exportAssetPlaceholderGuard.ui.readinessText)) failures.push('placeholder target readiness copy missing');
    if (!/placeholder|http/.test(result.checks.exportAssetPlaceholderGuard.ui.warningText)) failures.push('placeholder target parser warning missing');
    if (result.checks.mainModeEdit.editSelected !== 'true') failures.push('main mode edit did not select');
    if (consoleIssues.length > 0) failures.push('console errors/warnings present');
    if (pageErrors.length > 0) failures.push('page errors present');
    if (externalResourceRequests.length > 0) failures.push('external CDN/Blockly media requests present');

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
