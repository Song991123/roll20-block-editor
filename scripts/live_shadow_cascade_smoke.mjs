#!/usr/bin/env node
/**
 * Live app Shadow DOM cascade smoke.
 *
 * Runs the static export in headless Chromium, imports prepared fixtures
 * through the real browser app bundle, then compares browser-computed CSS
 * winners in preview Shadow DOM and edit Shadow DOM.
 *
 * Scope: live Next.js app shell + Shadow DOM render paths.
 * This does not prove Roll20 visual parity.
 *
 * Usage:
 *   node scripts/live_shadow_cascade_smoke.mjs \
 *     --out-dir ./out --fixtures test-fixtures/visual \
 *     --report-dir reports/live-shadow-cascade [--only fixtureC]
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
const REPORT_DIR = path.resolve(argOf('--report-dir', 'reports/live-shadow-cascade'));
const ONLY = argOf('--only', '');
const PORT = Number(argOf('--port', '4184'));

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

async function waitForLiveImport(page, input) {
  return page.evaluate(async ({ html, css, i18n }) => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    window.__perfHook.clearAll();
    await sleep(700);
    let last = null;
    for (let i = 0; i < 40; i += 1) {
      last = await window.__perfHook.importSheet({ html, css, i18n });
      if (last.blockCount > 0) return last;
      await sleep(500);
    }
    return last;
  }, input);
}

function pageCollectorScript() {
  return () => {
    const PROPS = [
      'box-sizing',
      'display',
      'position',
      'width',
      'height',
      'margin',
      'padding',
      'background-color',
      'background-image',
      'color',
      'font-family',
      'font-size',
      'font-weight',
      'line-height',
      'text-align',
      'overflow',
      'visibility',
      'opacity',
      'pointer-events',
      'transform',
    ];
    const APP_LIKE = new Set([
      'app-preview-runtime',
      'app-layer-filter',
      'preview-hidden-runtime',
      'external-or-app-css',
      'style#unknown',
    ]);
    const ROLL20 = new Set([
      'roll20-base',
      'roll20-darkmode',
      'roll20-dialog-context',
      'roll20-baseline-fallback',
    ]);
    const USER = new Set(['sheet-user-css']);

    function cssEscape(value) {
      if (window.CSS?.escape) return window.CSS.escape(String(value));
      return String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
    }

    function attrEscape(value) {
      return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    }

    function stableSelector(el) {
      if (!el || el.nodeType !== 1) return '';
      if (el.id) return `#${cssEscape(el.id)}`;
      const parts = [];
      let node = el;
      while (node && node.nodeType === 1 && node.tagName !== 'BODY' && parts.length < 5) {
        let part = node.tagName.toLowerCase();
        const cls = Array.from(node.classList || []).filter(Boolean).slice(0, 3);
        if (cls.length) part += `.${cls.map(cssEscape).join('.')}`;
        const name = node.getAttribute?.('name');
        if (name) part += `[name="${attrEscape(name)}"]`;
        const parent = node.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children).filter((item) => item.tagName === node.tagName);
          if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(node) + 1})`;
        }
        parts.unshift(part);
        node = parent;
      }
      return parts.join(' > ');
    }

    function sourceOfSheet(sheet) {
      const owner = sheet?.ownerNode;
      if (!owner) return 'unknown';
      if (owner instanceof HTMLStyleElement) {
        return owner.dataset.r20StyleSource || (owner.id ? `style#${owner.id}` : 'style#unknown');
      }
      if (owner instanceof HTMLLinkElement) return owner.href || 'external-or-app-css';
      return 'external-or-app-css';
    }

    function walkRules(ruleList, out, source) {
      for (const rule of Array.from(ruleList || [])) {
        if (rule.type === CSSRule.STYLE_RULE) out.push({ rule, source });
        else if ('cssRules' in rule && rule.cssRules) walkRules(rule.cssRules, out, source);
      }
    }

    function collectRules(root) {
      const out = [];
      const sheets = Array.from(root.styleSheets || []);
      for (const sheet of sheets) {
        const source = sourceOfSheet(sheet);
        try {
          walkRules(sheet.cssRules || [], out, source);
        } catch (err) {
          out.push({ blocked: true, source, error: String(err?.message || err) });
        }
      }
      return out;
    }

    function specificity(selector) {
      const clean = String(selector || '')
        .replace(/:where\([^)]*\)/g, '')
        .replace(/::[\w-]+/g, 'x')
        .replace(/:not\(([^)]*)\)/g, ' $1 ')
        .replace(/:is\(([^)]*)\)/g, ' $1 ')
        .replace(/:has\(([^)]*)\)/g, ' $1 ');
      const ids = (clean.match(/#[\w-]+/g) || []).length;
      const classes = (clean.match(/\.[\w-]+|\[[^\]]+\]|:[\w-]+/g) || []).length;
      const stripped = clean
        .replace(/#[\w-]+/g, ' ')
        .replace(/\.[\w-]+/g, ' ')
        .replace(/\[[^\]]+\]/g, ' ')
        .replace(/:[\w-]+/g, ' ');
      const elements = (stripped.match(/(^|[\s>+~])([a-zA-Z][\w-]*)/g) || []).length;
      return [ids, classes, elements];
    }

    function compareCandidate(a, b) {
      if (!a) return b;
      if (a.important !== b.important) return a.important ? a : b;
      for (let i = 0; i < 3; i += 1) {
        if (a.specificity[i] !== b.specificity[i]) return a.specificity[i] > b.specificity[i] ? a : b;
      }
      return a.order > b.order ? a : b;
    }

    function winnerFor(el, prop, rules) {
      const inline = el.style?.getPropertyValue(prop);
      let winner = inline
        ? {
            source: 'inline-style',
            selector: 'style=""',
            value: inline,
            important: el.style.getPropertyPriority(prop) === 'important',
            specificity: [1, 0, 0],
            order: Number.MAX_SAFE_INTEGER,
          }
        : null;
      for (let i = 0; i < rules.length; i += 1) {
        const item = rules[i];
        if (!item.rule?.selectorText || !item.rule.style) continue;
        const declared = item.rule.style.getPropertyValue(prop);
        if (!declared) continue;
        try {
          if (!el.matches(item.rule.selectorText)) continue;
        } catch {
          continue;
        }
        winner = compareCandidate(winner, {
          source: item.source,
          selector: item.rule.selectorText,
          value: declared,
          important: item.rule.style.getPropertyPriority(prop) === 'important',
          specificity: specificity(item.rule.selectorText),
          order: i,
        });
      }
      return winner;
    }

    function sampleElements(root) {
      const selectors = [
        '#dialog-window',
        '.dialog.largedialog',
        '#tab-content',
        '.sheetform',
        '.charactersheet.charsheet',
        'h1',
        'h2',
        'label',
        'input',
        'input[type="text"]',
        'input[type="number"]',
        'input[type="checkbox"]',
        'select',
        'textarea',
        'button',
        'button[type="roll"]',
        'button[type="action"]',
        'table',
        'tr',
        'td',
        'th',
        'img',
        '[class*="sheet-"]',
      ];
      const seen = new Set();
      const out = [];
      for (const selector of selectors) {
        const el = root.querySelector(selector);
        if (el && !seen.has(el)) {
          seen.add(el);
          out.push({ reason: selector, el });
        }
      }
      for (const el of Array.from(root.querySelectorAll('.charactersheet.charsheet *'))) {
        if (out.length >= 36) break;
        if (seen.has(el)) continue;
        const rect = el.getBoundingClientRect();
        if (rect.width <= 0 && rect.height <= 0) continue;
        seen.add(el);
        out.push({ reason: 'visible-sample', el });
      }
      return out;
    }

    function collectHost(testId) {
      const host = document.querySelector(`[data-testid="${testId}"]`);
      const root = host?.shadowRoot;
      if (!root) return { testId, status: 'missing-shadow-root' };
      const rules = collectRules(root);
      const styleSources = Array.from(root.querySelectorAll('style')).map((style) => ({
        source: style.dataset.r20StyleSource || style.id || 'style#unknown',
        bytes: style.textContent?.length || 0,
      }));
      const entries = sampleElements(root).map(({ reason, el }) => {
        const computed = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        const sourceCounts = {};
        const winners = {};
        for (const prop of PROPS) {
          const winner = winnerFor(el, prop, rules);
          const source = winner?.source || 'browser-default-or-inherited';
          sourceCounts[source] = (sourceCounts[source] || 0) + 1;
          winners[prop] = {
            computed: computed.getPropertyValue(prop),
            source,
            selector: winner?.selector || null,
            declared: winner?.value || null,
          };
        }
        return {
          reason,
          selector: stableSelector(el),
          tag: el.tagName.toLowerCase(),
          className: String(el.className || ''),
          name: el.getAttribute('name') || '',
          type: el.getAttribute('type') || '',
          rect: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          },
          sourceCounts,
          winners,
        };
      });
      const totals = {};
      const appLikeHits = [];
      const roll20Hits = [];
      const userCssHits = [];
      for (const entry of entries) {
        for (const [source, count] of Object.entries(entry.sourceCounts)) {
          totals[source] = (totals[source] || 0) + count;
        }
        for (const [property, winner] of Object.entries(entry.winners)) {
          const hit = {
            element: entry.selector,
            reason: entry.reason,
            property,
            source: winner.source,
            selector: winner.selector,
            computed: winner.computed,
          };
          if (APP_LIKE.has(winner.source)) appLikeHits.push(hit);
          if (ROLL20.has(winner.source)) roll20Hits.push(hit);
          if (USER.has(winner.source)) userCssHits.push(hit);
        }
      }
      return {
        testId,
        status: 'computed',
        sampledElements: entries.length,
        sampledProperties: PROPS.length,
        styleSheetCount: root.styleSheets.length,
        styleSources,
        totals,
        appLikeHitCount: appLikeHits.length,
        roll20HitCount: roll20Hits.length,
        userCssHitCount: userCssHits.length,
        appLikeHits: appLikeHits.slice(0, 40),
        firstElements: entries.slice(0, 8).map((entry) => ({
          reason: entry.reason,
          selector: entry.selector,
          tag: entry.tag,
          className: entry.className,
          rect: entry.rect,
          sourceCounts: entry.sourceCounts,
        })),
      };
    }

    return {
      documentStyleSheetCount: document.styleSheets.length,
      preview: collectHost('preview-shadow-host'),
      edit: collectHost('edit-canvas-shadow-host'),
    };
  };
}

async function ensurePreviewShadowMode(page) {
  await page.evaluate(() => window.__perfHook.setMainMode('preview'));
  await page.waitForSelector('[data-testid="preview-pane"][data-visible="true"]', { timeout: 15000 });
  await page.evaluate(() => window.__perfHook.setPreviewRenderMode('shadow'));
  await page.waitForFunction(
    () => Boolean(document.querySelector('[data-testid="preview-shadow-host"]')?.shadowRoot?.querySelector('.charactersheet.charsheet')),
    null,
    { timeout: 30000 },
  );
}

async function ensureEditShadow(page) {
  await page.evaluate(() => window.__perfHook.setMainMode('edit'));
  await page.waitForFunction(
    () => Boolean(document.querySelector('[data-testid="edit-canvas-shadow-host"]')?.shadowRoot?.querySelector('.charactersheet.charsheet')),
    null,
    { timeout: 30000 },
  );
}

function summarizeResult(result) {
  return {
    preview: {
      status: result.preview.status,
      sampledElements: result.preview.sampledElements,
      styleSheetCount: result.preview.styleSheetCount,
      appLikeHitCount: result.preview.appLikeHitCount,
      roll20HitCount: result.preview.roll20HitCount,
      userCssHitCount: result.preview.userCssHitCount,
      totals: result.preview.totals,
    },
    edit: {
      status: result.edit.status,
      sampledElements: result.edit.sampledElements,
      styleSheetCount: result.edit.styleSheetCount,
      appLikeHitCount: result.edit.appLikeHitCount,
      roll20HitCount: result.edit.roll20HitCount,
      userCssHitCount: result.edit.userCssHitCount,
      totals: result.edit.totals,
    },
  };
}

async function main() {
  await fs.mkdir(REPORT_DIR, { recursive: true });
  const fixtures = await listFixtures();
  if (fixtures.length === 0) {
    console.error(`no fixtures with source.html under ${FIXTURES_DIR}`);
    process.exitCode = 1;
    return;
  }

  const server = await startServer();
  const browser = await chromium.launch();
  const report = { startedAt: new Date().toISOString(), fixtures: [] };

  for (const fixture of fixtures) {
    const page = await browser.newPage({ viewport: { width: 1480, height: 960 } });
    const consoleErrors = [];
    const pageErrors = [];
    const httpErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 500));
    });
    page.on('pageerror', (err) => pageErrors.push(String(err).slice(0, 500)));
    page.on('response', (response) => {
      const status = response.status();
      if (status >= 400) {
        httpErrors.push({
          status,
          url: response.url().slice(0, 700),
        });
      }
    });
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem('__perfOn', '1');
        window.localStorage.removeItem('r20be-autosave');
      } catch {}
    });
    await page.goto(`http://127.0.0.1:${PORT}${BASE_PATH}/`, { waitUntil: 'load' });
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

    const entry = { id: fixture.id, pass: false };
    try {
      entry.import = await waitForLiveImport(page, fixture);
      await ensurePreviewShadowMode(page);
      const previewCascade = await page.evaluate(pageCollectorScript());
      await ensureEditShadow(page);
      const editCascade = await page.evaluate(pageCollectorScript());
      entry.cascade = {
        documentStyleSheetCount: Math.max(
          previewCascade.documentStyleSheetCount ?? 0,
          editCascade.documentStyleSheetCount ?? 0,
        ),
        preview: previewCascade.preview,
        edit: editCascade.edit,
      };
      entry.summary = summarizeResult(entry.cascade);
      entry.pass =
        entry.cascade.preview.status === 'computed' &&
        entry.cascade.edit.status === 'computed' &&
        entry.cascade.preview.appLikeHitCount === 0 &&
        entry.cascade.edit.appLikeHitCount === 0 &&
        pageErrors.length === 0;
    } catch (err) {
      entry.error = String(err?.stack || err).slice(0, 1200);
    }
    entry.consoleErrors = consoleErrors;
    entry.pageErrors = pageErrors;
    entry.httpErrors = httpErrors;
    report.fixtures.push(entry);
    console.log(`${entry.pass ? 'PASS' : 'FAIL'} ${fixture.id}`);
    await page.close();
  }

  await browser.close();
  server.close();

  report.pass = report.fixtures.every((fixture) => fixture.pass);
  report.finishedAt = new Date().toISOString();
  await fs.writeFile(
    path.join(REPORT_DIR, 'live-shadow-cascade-results.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  );

  const lines = [
    '# Live Shadow Cascade Results',
    '',
    `Generated: ${report.finishedAt}`,
    '',
    'Scope: live static Next.js app, real browser import path, preview Shadow DOM, and edit Shadow DOM. This does not prove Roll20 visual parity.',
    '',
    `Overall: ${report.pass ? 'PASS' : 'FAIL'}`,
    '',
    '| Fixture | Import blocks | Preview app-like winners | Edit app-like winners | Preview Roll20 winners | Edit Roll20 winners | Console errors | HTTP >=400 | Page errors |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
  ];
  for (const fixture of report.fixtures) {
    lines.push(
      `| \`${fixture.id}\` | ${fixture.import?.blockCount ?? ''} | ${fixture.summary?.preview.appLikeHitCount ?? ''} | ${fixture.summary?.edit.appLikeHitCount ?? ''} | ${fixture.summary?.preview.roll20HitCount ?? ''} | ${fixture.summary?.edit.roll20HitCount ?? ''} | ${fixture.consoleErrors.length} | ${fixture.httpErrors.length} | ${fixture.pageErrors.length} |`,
    );
  }
  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push('- `app-like` means `app-preview-runtime`, `app-layer-filter`, `preview-hidden-runtime`, external/app CSS, or unlabeled app CSS winning a sampled visible sheet element property.');
  lines.push('- `edit-shadow-host-reset` is reported separately in JSON and is not counted as app UI leakage; it is the Shadow DOM isolation/reset layer.');
  lines.push('- HTTP/console resource errors are recorded separately. They do not imply app CSS cascade leakage, but they remain follow-up work for asset parity.');
  lines.push('- Large full JSON details are in `live-shadow-cascade-results.json`; do not use this report as a Roll20 visual parity claim.');
  await fs.writeFile(path.join(REPORT_DIR, 'live-shadow-cascade-results.md'), `${lines.join('\n')}\n`);

  console.log(report.pass ? 'LIVE SHADOW CASCADE PASS' : 'LIVE SHADOW CASCADE FAIL');
  process.exitCode = report.pass ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
