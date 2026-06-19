#!/usr/bin/env node
/**
 * Roll button -> chat/rolltemplate browser smoke.
 *
 * Imports ignored fixtures through the static app, clicks a real roll button
 * inside the preview iframe, then verifies that the right-side ChatPane renders
 * a result card. Prefer a rolltemplate button when a fixture has one.
 *
 * Scope: local app runtime only. This does not prove Roll20 actual chat parity.
 *
 * Usage:
 *   node scripts/rolltemplate_chat_smoke.mjs \
 *     --out-dir ./out --base-path /roll20-block-editor \
 *     --fixtures test-fixtures/visual --report-dir reports/rolltemplate-chat-smoke
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
const REPORT_DIR = path.resolve(argOf('--report-dir', 'reports/rolltemplate-chat-smoke'));
const ONLY = argOf('--only', '');
const PORT = Number(argOf('--port', '4196'));
const CHAT_FONT_POLICY = argOf('--chat-font-policy', 'default');
const CHAT_TEXT_POLICY = argOf('--chat-text-policy', 'default');
const CHAT_SHADOW_POLICY = argOf('--chat-shadow-policy', 'default');
const CHAT_GEOMETRY_POLICY = argOf('--chat-geometry-policy', 'default');
const VIEWPORT = { width: 2200, height: 1200 };

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

function rel(file) {
  return path.relative(process.cwd(), file);
}

function isResourceConsoleIssue(msg) {
  return msg?.type === 'error' && /^Failed to load resource:/i.test(String(msg.text ?? ''));
}

async function listFixtures() {
  const entries = await fs.readdir(FIXTURES_DIR, { withFileTypes: true });
  const out = [];
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    if (ONLY && ent.name !== ONLY) continue;
    const dir = path.join(FIXTURES_DIR, ent.name);
    const html = await readMaybe(path.join(dir, 'source.html'));
    if (!html) continue;
    out.push({
      id: ent.name,
      html,
      css: await readMaybe(path.join(dir, 'source.css')),
      i18n: await readMaybe(path.join(dir, 'source.i18n')),
    });
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

async function warmPerfHook(page) {
  await page.waitForFunction(() => Boolean(window.__perfHook), null, { timeout: 30000 });
  await page.waitForFunction(
    async () => {
      try {
        const r = await window.__perfHook.importSheet({ html: '<button type="roll" value="1d20">r</button>' });
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
    window.__perfHook.clearChat?.();
    await sleep(700);
    let last = null;
    for (let i = 0; i < 40; i += 1) {
      last = await window.__perfHook.importSheet({ html, css, i18n });
      if (last.blockCount > 0) return last;
      await sleep(500);
    }
    return last;
  }, fixture);
}

async function chooseRollButton(frame) {
  const candidates = await frame.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button[type="roll"], button.roll'));
    return buttons.map((el, index) => {
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
        value: el.getAttribute('value') || '',
        label: (el.textContent || '').trim(),
        visible: selfVisible && browserVisible,
        actionable: false,
        trialed: false,
        actionabilityError: '',
      };
    });
  });

  const visible = candidates.filter((row) => row.visible && row.value.trim());
  const trialOrder = [
    ...visible.filter((row) => /&\{template:/i.test(row.value)),
    ...visible.filter((row) => !/&\{template:/i.test(row.value)),
  ];
  const seen = new Set();
  const orderedUnique = trialOrder.filter((row) => {
    if (seen.has(row.index)) return false;
    seen.add(row.index);
    return true;
  });

  let chosen = null;
  const buttons = frame.locator('button[type="roll"], button.roll');
  for (const row of orderedUnique) {
    const button = buttons.nth(row.index);
    row.trialed = true;
    try {
      await button.scrollIntoViewIfNeeded({ timeout: 2000 });
      await button.click({ trial: true, timeout: 3000 });
      row.actionable = true;
      chosen = row;
      break;
    } catch (err) {
      row.actionabilityError = err instanceof Error ? err.message.split('\n')[0] : String(err);
    }
  }

  if (chosen) {
    await frame.evaluate((chosenIndex) => {
      const buttonsInDom = Array.from(document.querySelectorAll('button[type="roll"], button.roll'));
      buttonsInDom.forEach((el) => el.removeAttribute('data-r20-chat-smoke-target'));
      buttonsInDom[chosenIndex]?.setAttribute('data-r20-chat-smoke-target', '1');
    }, chosen.index);
  }
  return { chosen, candidates };
}

async function clickRollAndReadChat(page, fixtureId) {
  await page.evaluate(() => {
    window.__perfHook.setPreviewZoom(1);
    window.__perfHook.setPreviewRenderMode('iframe');
    window.__perfHook.setMainMode('preview');
  });
  const iframe = page.locator('[data-testid="preview-iframe"]').first();
  await iframe.waitFor({ state: 'visible', timeout: 30000 });
  const iframeHandle = await iframe.elementHandle();
  const frame = await iframeHandle?.contentFrame();
  if (!frame) throw new Error('preview iframe contentFrame unavailable');
  await frame.locator('#charsheet-root').waitFor({ state: 'visible', timeout: 30000 });
  const choice = await chooseRollButton(frame);
  const chosen = choice.chosen;
  if (!chosen) {
    const err = new Error('fixture has no visible roll button candidate');
    err.candidates = choice.candidates;
    err.skipReason = 'no-visible-roll-button';
    throw err;
  }
  await page.evaluate(() => {
    window.__perfHook.setRightTab?.('chat');
  }).catch(() => {});

  const button = frame.locator('[data-r20-chat-smoke-target="1"]').first();
  let clickMode = 'user-click';
  try {
    await button.scrollIntoViewIfNeeded({ timeout: 5000 });
    await button.click({ timeout: 10000 });
  } catch (err) {
    clickMode = 'dom-click-fallback';
    await frame.evaluate(() => {
      const target = document.querySelector('[data-r20-chat-smoke-target="1"]');
      if (!target) throw new Error('roll smoke target missing before fallback click');
      target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    });
  }

  const card = page.locator('[data-testid="chat-list"] [data-r20-chat-card]').first();
  await card.waitFor({ state: 'visible', timeout: 30000 });
  await waitForRolltemplateAssets(page);
  const screenshotPath = path.join(REPORT_DIR, 'screenshots', `${fixtureId}-chat.png`);
  await page.locator('[data-testid="chat-list"]').screenshot({ path: screenshotPath });
  const templateScreenshotPath = path.join(REPORT_DIR, 'screenshots', `${fixtureId}-chat-template.png`);
  const templateLocator = page.locator('[data-testid="chat-list"] [data-r20-chat-card] [class*="sheet-rolltemplate-"]').first();
  if (await templateLocator.count()) {
    await templateLocator.screenshot({ path: templateScreenshotPath });
  }
  const cardCount = await page.locator('[data-testid="chat-list"] [data-r20-chat-card]').count();
  const cardInfo = await card.evaluate((el) => {
    const readStyle = (node) => {
      if (!node) return null;
      const style = getComputedStyle(node);
      return {
        display: style.display,
        position: style.position,
        boxSizing: style.boxSizing,
        width: style.width,
        height: style.height,
        margin: style.margin,
        padding: style.padding,
        border: style.border,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        lineHeight: style.lineHeight,
        color: style.color,
        backgroundColor: style.backgroundColor,
        backgroundImage: style.backgroundImage,
        backgroundSize: style.backgroundSize,
        backgroundPosition: style.backgroundPosition,
        textAlign: style.textAlign,
        textShadow: style.textShadow,
        whiteSpace: style.whiteSpace,
        wordBreak: style.wordBreak,
        overflowWrap: style.overflowWrap,
        transform: style.transform,
      };
    };
    const summarizeElement = (node, selector) => {
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      return {
        selector,
        tagName: node.tagName,
        className: node.className,
        rect: {
          x: rect.x,
          y: rect.y,
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          right: rect.right,
          bottom: rect.bottom,
        },
        computedStyle: readStyle(node),
        text: (node.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 500),
      };
    };
    const summarizeRows = (root) => Array.from(root?.querySelectorAll('tr') ?? []).slice(0, 20).map((row, index) => {
      const rect = row.getBoundingClientRect();
      return {
        index,
        className: row.className,
        rect: {
          x: rect.x,
          y: rect.y,
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          right: rect.right,
          bottom: rect.bottom,
        },
        text: (row.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 240),
        cells: Array.from(row.children).slice(0, 6).map((cell, cellIndex) => {
          const cellRect = cell.getBoundingClientRect();
          return {
            index: cellIndex,
            tagName: cell.tagName,
            className: cell.className,
            rect: {
              x: cellRect.x,
              y: cellRect.y,
              left: cellRect.left,
              top: cellRect.top,
              width: cellRect.width,
              height: cellRect.height,
              right: cellRect.right,
              bottom: cellRect.bottom,
            },
            text: (cell.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120),
          };
        }),
      };
    });
    const checkFonts = () => {
      const specs = [
        '12px BookkMyungjo-Bd',
        '700 12px BookkMyungjo-Bd',
        '12px "BookkMyungjo-Bd"',
        '700 12px "BookkMyungjo-Bd"',
        '13px "BookkMyungjo-Bd"',
        '700 13px "BookkMyungjo-Bd"',
        '12px sans-serif',
      ];
      return {
        status: document.fonts?.status ?? null,
        checks: specs.map((spec) => ({
          spec,
          ok: document.fonts?.check ? document.fonts.check(spec) : null,
        })),
      };
    };
    const template = el.querySelector('[class*="sheet-rolltemplate-"]');
    return {
      kind: el.getAttribute('data-r20-chat-kind') || '',
      hasMessageClass: el.classList.contains('message') || Boolean(el.querySelector('.message')),
      messageCount: el.classList.contains('message') ? 1 : el.querySelectorAll('.message').length,
      hasSpacer: Boolean(el.querySelector('.spacer')),
      hasSenderLine: Boolean(el.querySelector('.by')),
      hasTimestamp: Boolean(el.querySelector('.tstamp')),
      hasTextchatContainer: Boolean(el.closest('.textchatcontainer')),
      text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 400),
      hasTemplateClass: Boolean(template),
      hasTotal: Boolean(el.querySelector('.rt-total, strong')),
      width: Math.round(el.getBoundingClientRect().width),
      templateWidth: Math.round(template?.getBoundingClientRect().width ?? 0),
      templateComputed: template
        ? {
            className: template.className,
            computedStyle: readStyle(template),
            computedChildren: [
              summarizeElement(template.querySelector('table'), 'table'),
              summarizeElement(template.querySelector('caption'), 'caption'),
              summarizeElement(template.querySelector('td'), 'td:first'),
              summarizeElement(template.querySelector('td.sheet-template_label, .sheet-template_label'), 'sheet-template_label:first'),
              summarizeElement(template.querySelector('td.sheet-template_value, .sheet-template_value'), 'sheet-template_value:first'),
              summarizeElement(template.querySelector('.inlinerollresult'), '.inlinerollresult:first'),
            ].filter(Boolean),
            rowMetrics: summarizeRows(template),
          }
        : null,
      fontEvidence: checkFonts(),
      hasDebugTemplateLabel: /rolltemplate\s*:/i.test(el.textContent || ''),
    };
  });
  cardInfo.cardCount = cardCount;
  return {
    chosen,
    candidates: choice.candidates,
    clickMode,
    cardInfo,
    screenshotPath: rel(screenshotPath),
    templateScreenshotPath: rel(templateScreenshotPath),
  };
}

async function waitForRolltemplateAssets(page) {
  await page.evaluate(async () => {
    const urls = new Set();
    const roots = Array.from(document.querySelectorAll('[data-testid="chat-list"] [class*="sheet-rolltemplate-"]'));
    for (const root of roots) {
      const elements = [root, ...Array.from(root.querySelectorAll('*'))];
      for (const el of elements) {
        const bg = getComputedStyle(el).backgroundImage;
        for (const match of bg.matchAll(/url\(["']?(.*?)["']?\)/g)) {
          const url = match[1];
          if (url) urls.add(url);
        }
      }
    }
    await Promise.all(
      Array.from(urls).map(
        (url) =>
          new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = url;
            if (img.complete) resolve(true);
          }),
      ),
    );
    if (document.fonts?.ready) await document.fonts.ready.catch(() => {});
  });
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Rolltemplate Chat Smoke');
  lines.push('');
  lines.push(`Generated: ${report.startedAt}`);
  lines.push(`Chat font policy: \`${report.chatFontPolicy ?? 'default'}\``);
  lines.push(`Chat text policy: \`${report.chatTextPolicy ?? 'default'}\``);
  lines.push(`Chat shadow policy: \`${report.chatShadowPolicy ?? 'default'}\``);
  lines.push(`Chat geometry policy: \`${report.chatGeometryPolicy ?? 'default'}\``);
  lines.push('');
  lines.push('Scope: local static app preview iframe -> ChatPane only. This is not actual Roll20 chat parity.');
  lines.push('');
  lines.push('| Fixture | Status | Reason | Click mode | Visible | Actionable | Chosen button | Chat kind | Cards | Message width | Template width | Roll20 shell | Template class | Debug label | Total/result | Functional errors | Resource issues |');
  lines.push('| --- | --- | --- | --- | ---: | ---: | --- | --- | ---: | ---: | ---: | --- | --- | --- | --- | ---: | ---: |');
  for (const item of report.fixtures) {
    const chosen = item.chosen
      ? `${item.chosen.name || '(no name)'} / ${truncate(item.chosen.value, 60)}`
      : '';
    const status = item.skipped ? 'SKIP' : item.pass ? 'PASS' : 'FAIL';
    const visibleCount = item.candidates?.filter((row) => row.visible).length ?? '';
    const actionableCount = item.candidates?.filter((row) => row.actionable).length ?? '';
    const functionalErrors =
      (item.consoleErrors?.filter((msg) => !isResourceConsoleIssue(msg)).length ?? 0) +
      (item.pageErrors?.length ?? 0);
    const resourceIssues = item.consoleErrors?.filter(isResourceConsoleIssue).length ?? 0;
    lines.push(
      `| \`${item.id}\` | ${status} | ${item.skipReason ?? ''} | ${item.clickMode ?? ''} | ${visibleCount} | ${actionableCount} | ${escapePipe(chosen)} | ${item.cardInfo?.kind ?? ''} | ${item.cardInfo?.cardCount ?? ''} | ${item.cardInfo?.width ?? ''} | ${item.cardInfo?.templateWidth ?? ''} | ${roll20ShellStatus(item.cardInfo)} | ${item.cardInfo?.hasTemplateClass ? 'yes' : 'no'} | ${item.cardInfo?.hasDebugTemplateLabel ? 'yes' : 'no'} | ${item.cardInfo?.hasTotal ? 'yes' : 'no'} | ${functionalErrors} | ${resourceIssues} |`,
    );
  }
  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push('- A PASS means a real preview roll button produced a visible chat card.');
  lines.push('- A SKIP means the fixture imported but its default visible state exposes no actionable roll button, so chat rendering cannot be honestly tested from the default screen.');
  lines.push('- `user-click` means Playwright could click the visible button. `dom-click-fallback` means the runtime path worked but the button was not actionably visible in the default rendered state.');
  lines.push('- If `Chat kind` is `rolltemplate`, the dice parser and rolltemplate render path both ran.');
  lines.push('- `Debug label` must stay `no`; Roll20 chat shows the result card, not an app-only `rolltemplate:name` helper line.');
  lines.push('- Functional errors fail the smoke. External resource load failures are tracked separately because many private fixtures reference remote images/fonts that may 403 outside Roll20.');
  lines.push('- Screenshots are local-only and ignored by Git.');
  return `${lines.join('\n')}\n`;
}

function truncate(value, max) {
  const text = String(value ?? '');
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function escapePipe(value) {
  return String(value ?? '').replace(/\|/g, '\\|');
}

function roll20ShellStatus(cardInfo) {
  if (!cardInfo) return '';
  const ok =
    cardInfo.hasTextchatContainer &&
    cardInfo.hasMessageClass &&
    cardInfo.hasSpacer &&
    cardInfo.hasSenderLine &&
    cardInfo.hasTimestamp;
  return ok ? 'yes' : 'no';
}

async function main() {
  await fs.mkdir(path.join(REPORT_DIR, 'screenshots'), { recursive: true });
  const fixtures = await listFixtures();
  if (fixtures.length === 0) throw new Error(`No fixtures found in ${FIXTURES_DIR}`);

  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: VIEWPORT });
  const report = {
    startedAt: new Date().toISOString(),
    baseUrl: `http://127.0.0.1:${PORT}${BASE_PATH}/`,
    chatFontPolicy: CHAT_FONT_POLICY,
    chatTextPolicy: CHAT_TEXT_POLICY,
    chatShadowPolicy: CHAT_SHADOW_POLICY,
    chatGeometryPolicy: CHAT_GEOMETRY_POLICY,
    fixtures: [],
  };

  try {
    page.on('dialog', async (dialog) => {
      await dialog.accept(dialog.defaultValue() || '0').catch(() => {});
    });
    await page.goto(report.baseUrl, { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.setItem('__perfOn', '1'));
    await page.evaluate((policy) => {
      if (policy === 'roll20-chat-fallback') {
        localStorage.setItem('__r20ChatFontPolicy', 'roll20-chat-fallback');
        localStorage.setItem('__r20SuppressUserDocumentFonts', '1');
      } else {
        localStorage.removeItem('__r20ChatFontPolicy');
        localStorage.removeItem('__r20SuppressUserDocumentFonts');
      }
    }, CHAT_FONT_POLICY);
    await page.evaluate((policy) => {
      if (policy === 'roll20-auto-aa') {
        localStorage.setItem('__r20ChatTextPolicy', 'roll20-auto-aa');
      } else {
        localStorage.removeItem('__r20ChatTextPolicy');
      }
    }, CHAT_TEXT_POLICY);
    await page.evaluate((policy) => {
      if (policy === 'no-template-shadow') {
        localStorage.setItem('__r20ChatShadowPolicy', 'no-template-shadow');
      } else {
        localStorage.removeItem('__r20ChatShadowPolicy');
      }
    }, CHAT_SHADOW_POLICY);
    await page.evaluate((policy) => {
      if (policy === 'tight-cell-spacing' || policy === 'table-scale-x') {
        localStorage.setItem('__r20ChatGeometryPolicy', policy);
      } else {
        localStorage.removeItem('__r20ChatGeometryPolicy');
      }
    }, CHAT_GEOMETRY_POLICY);
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
      const entry = { id: fixture.id, consoleErrors, pageErrors };
      try {
        entry.import = await importFixture(page, fixture);
        const clicked = await clickRollAndReadChat(page, fixture.id);
        Object.assign(entry, clicked);
        const functionalConsoleErrors = consoleErrors.filter((msg) => !isResourceConsoleIssue(msg));
        const resourceConsoleIssues = consoleErrors.filter(isResourceConsoleIssue);
        entry.resourceConsoleIssues = resourceConsoleIssues;
        entry.pass =
          (entry.import?.blockCount ?? 0) > 0 &&
          Boolean(entry.chosen?.value) &&
          Boolean(entry.cardInfo?.kind) &&
          entry.cardInfo?.cardCount === 1 &&
          entry.cardInfo?.hasDebugTemplateLabel === false &&
          (entry.cardInfo?.kind !== 'rolltemplate' ||
            (entry.cardInfo?.templateWidth ?? 0) > 0) &&
          entry.cardInfo?.hasTextchatContainer === true &&
          entry.cardInfo?.hasMessageClass === true &&
          entry.cardInfo?.hasSpacer === true &&
          entry.cardInfo?.hasSenderLine === true &&
          entry.cardInfo?.hasTimestamp === true &&
          functionalConsoleErrors.filter((msg) => msg.type === 'error').length === 0 &&
          pageErrors.length === 0;
      } catch (err) {
        entry.pass = false;
        if (err?.skipReason) {
          entry.skipped = true;
          entry.skipReason = err.skipReason;
        }
        entry.error = err instanceof Error ? err.stack || err.message : String(err);
        if (err?.candidates) entry.candidates = err.candidates;
      } finally {
        page.off('console', onConsole);
        page.off('pageerror', onPageError);
      }
      report.fixtures.push(entry);
      const status = entry.skipped ? 'SKIP' : entry.pass ? 'PASS' : 'FAIL';
      console.log(`${status} ${fixture.id} kind=${entry.cardInfo?.kind ?? 'none'}`);
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }

  report.finishedAt = new Date().toISOString();
  report.pass = report.fixtures.every((item) => item.pass || item.skipped);
  await fs.writeFile(path.join(REPORT_DIR, 'rolltemplate-chat-smoke-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(path.join(REPORT_DIR, 'rolltemplate-chat-smoke-results.md'), renderMarkdown(report), 'utf8');
  console.log(`ROLLTEMPLATE CHAT SMOKE ${report.pass ? 'PASS' : 'FAIL'}`);
  if (!report.pass) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
