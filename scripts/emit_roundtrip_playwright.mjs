#!/usr/bin/env node
/**
 * Emit Full Roundtrip — Stage 2 verify (HTML/CSS/i18n → import → blocks → emit
 *                                       → re-import → emit2 → byte-diff).
 *
 * Anchor:
 *   - V2 anchor: "byte-by-byte 동일 또는 명시적 차이 문서화"
 *   - Stage 1.5 (scripts/_tmp_emit_roundtrip_diff.mjs): import determinism PASS.
 *   - Stage 2 본 script: full emit roundtrip — Blockly Workspace 필요.
 *
 * 환경:
 *   - 본 환경(코드 sandbox): disk 144 MB only → Playwright + chromium (~300 MB)
 *     install 실패. Sandbox 외부 Chrome MCP 우회로 측정 진행함 (아래 docs
 *     참고).
 *   - 보통 환경 (Linux/macOS dev box, >5 GB free): 본 script 그대로 실행 가능.
 *
 * 사용:
 *   pnpm add -D playwright @playwright/test
 *   pnpm playwright install chromium
 *   node scripts/emit_roundtrip_playwright.mjs <sheet_dir> [out_dir]
 *
 *   sheet_dir 안 파일 (자동 탐지, 시스템 hardcoding 0):
 *     - *.html (또는 original.html)
 *     - *.css  (또는 original.css)
 *     - translate.txt / i18n.txt / *.json
 *
 *   out_dir = report 출력 폴더 (기본: ./out)
 *
 * 측정 항목:
 *   1) import1 stats (matchPct, blockCount, warnings)
 *   2) emit1 본문 (html/css/i18n) 회수
 *   3) re-import (clearAll → importSheet(emit1)) → import2 stats
 *   4) emit2 본문 회수
 *   5) byte-diff:
 *      - raw SHA256 (emit1 vs emit2)
 *      - block-id stripped SHA256 (의도된 차이 제거 후)
 *      - first-diff 위치 + 100-char window
 *
 * 시스템 specific token 0 — D&D 5e/legacy-sheet-corpus/임의 시트 모두 같은 procedure.
 */

import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';

const SHEET_DIR = process.argv[2];
const OUT_DIR = process.argv[3] ?? resolve(process.cwd(), 'out');
const LIVE_URL = process.env.LIVE_URL ?? 'https://song991123.github.io/roll20-block-editor/';

if (!SHEET_DIR) {
  console.error('usage: node scripts/emit_roundtrip_playwright.mjs <sheet_dir> [out_dir]');
  console.error('       LIVE_URL=<url> 로 다른 빌드 testing 가능 (기본: live GH Pages)');
  process.exit(2);
}

function sha256(s) { return createHash('sha256').update(s).digest('hex'); }
function stripIds(s) { return s.replace(/\s*data-r20-block-id="[^"]*"/g, ''); }

function findFirst(dir, candidates) {
  for (const c of candidates) {
    if (typeof c === 'string') {
      const p = join(dir, c);
      if (existsSync(p) && statSync(p).isFile()) return p;
    }
  }
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (!e.isFile()) continue;
    for (const rx of candidates) {
      if (rx instanceof RegExp && rx.test(e.name)) return join(dir, e.name);
    }
  }
  return null;
}

function readMaybe(p) { try { return readFileSync(p, 'utf8'); } catch { return ''; } }

const htmlPath = findFirst(SHEET_DIR, ['original.html', 'html.html', 'HTML.html', 'html.txt', 'HTML.txt', /\.html?$/i, /^html\.(txt|html?)$/i]);
const cssPath  = findFirst(SHEET_DIR, ['original.css', 'css.css', 'CSS.css', 'css.txt', 'CSS.txt', /\.css$/i, /^css\.(txt|css)$/i]);
const i18nPath = findFirst(SHEET_DIR, ['translate.txt', 'i18n.txt', '번역.txt', /^translat[a-z]*\.(txt|json)$/i, /^i18n.*\.(txt|json)$/i, /번역\.(txt|json)$/i]);

if (!htmlPath) { console.error('No html file in', SHEET_DIR); process.exit(2); }

const html = readFileSync(htmlPath, 'utf8');
const css  = cssPath  ? readFileSync(cssPath,  'utf8') : '';
const i18n = i18nPath ? readFileSync(i18nPath, 'utf8') : '';

mkdirSync(OUT_DIR, { recursive: true });

console.log('[roundtrip] launching chromium...');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on('console', msg => { if (msg.type() === 'error') console.log('[page error]', msg.text()); });

console.log('[roundtrip] navigating', LIVE_URL);
await page.goto(LIVE_URL, { waitUntil: 'networkidle' });

// Activate perfHook then reload.
await page.evaluate(() => localStorage.setItem('__perfOn', '1'));
await page.reload({ waitUntil: 'networkidle' });

// Wait for hook.
await page.waitForFunction(() => window.__perfHook != null, { timeout: 30000 });
console.log('[roundtrip] perfHook ready');

// --- Round 1: import original → emit1 ---
await page.evaluate(() => window.__perfHook.clearAll());
const r1 = await page.evaluate(
  async ({ h, c, i }) => await window.__perfHook.importSheet({ html: h, css: c, i18n: i }),
  { h: html, c: css, i: i18n },
);
console.log('[roundtrip] import1:', { blocks: r1.blockCount, match: r1.matchPct, warnings: r1.warnings });

// Switch to Code tab + harvest each panel.
async function harvestEmit() {
  // Ensure '코드' tab is active.
  await page.evaluate(() => {
    const t = Array.from(document.querySelectorAll('[role="tab"]')).find(b => b.textContent.trim() === '코드');
    if (t) t.click();
  });
  await page.waitForTimeout(300);
  // Find HTML/CSS/번역 radio buttons inside code panel — last 3 in DOM order.
  async function pick(name) {
    await page.evaluate((n) => {
      const radios = Array.from(document.querySelectorAll('[role="radio"]'));
      const code = radios.filter(r => ['HTML','CSS','번역'].includes(r.textContent.trim()));
      const map = { html: code[code.length-3], css: code[code.length-2], i18n: code[code.length-1] };
      map[n] && map[n].click();
    }, name);
    await page.waitForTimeout(250);
    return await page.evaluate(() => document.querySelector('pre').textContent);
  }
  return {
    html: await pick('html'),
    css:  await pick('css'),
    i18n: await pick('i18n'),
  };
}

const emit1 = await harvestEmit();
console.log('[roundtrip] emit1 lens:', { h: emit1.html.length, c: emit1.css.length, i: emit1.i18n.length });

// --- Round 2: re-import emit1 → emit2 ---
await page.evaluate(() => window.__perfHook.clearAll());
const r2 = await page.evaluate(
  async ({ h, c, i }) => await window.__perfHook.importSheet({ html: h, css: c, i18n: i }),
  { h: emit1.html, c: emit1.css, i: emit1.i18n },
);
console.log('[roundtrip] import2:', { blocks: r2.blockCount, match: r2.matchPct, warnings: r2.warnings });

const emit2 = await harvestEmit();
console.log('[roundtrip] emit2 lens:', { h: emit2.html.length, c: emit2.css.length, i: emit2.i18n.length });

await browser.close();

// --- Diff analysis ---
function diffReport(label, a, b) {
  const rawSame = sha256(a) === sha256(b);
  const sa = stripIds(a), sb = stripIds(b);
  const stripSame = sha256(sa) === sha256(sb);
  let firstDiff = -1;
  for (let i = 0; i < sa.length || i < sb.length; i++) {
    if (sa[i] !== sb[i]) { firstDiff = i; break; }
  }
  return {
    label,
    len1: a.length, len2: b.length, byteEqual: rawSame,
    strippedLen1: sa.length, strippedLen2: sb.length, strippedEqual: stripSame,
    firstDiffAt: firstDiff,
    aWindow: firstDiff >= 0 ? sa.slice(Math.max(0, firstDiff-40), firstDiff+120) : '',
    bWindow: firstDiff >= 0 ? sb.slice(Math.max(0, firstDiff-40), firstDiff+120) : '',
    rawSha1: sha256(a).slice(0,16), rawSha2: sha256(b).slice(0,16),
    stripSha1: sha256(sa).slice(0,16), stripSha2: sha256(sb).slice(0,16),
  };
}

const report = {
  sheet: SHEET_DIR,
  liveUrl: LIVE_URL,
  inputs: { htmlBytes: html.length, cssBytes: css.length, i18nBytes: i18n.length },
  import1: r1, import2: r2,
  diff: {
    html: diffReport('html', emit1.html, emit2.html),
    css:  diffReport('css',  emit1.css,  emit2.css),
    i18n: diffReport('i18n', emit1.i18n, emit2.i18n),
  },
};

writeFileSync(join(OUT_DIR, 'emit1.html'), emit1.html);
writeFileSync(join(OUT_DIR, 'emit1.css'),  emit1.css);
writeFileSync(join(OUT_DIR, 'emit1.i18n'), emit1.i18n);
writeFileSync(join(OUT_DIR, 'emit2.html'), emit2.html);
writeFileSync(join(OUT_DIR, 'emit2.css'),  emit2.css);
writeFileSync(join(OUT_DIR, 'emit2.i18n'), emit2.i18n);
writeFileSync(join(OUT_DIR, 'roundtrip_report.json'), JSON.stringify(report, null, 2));

console.log('\n=== Roundtrip Summary ===');
console.log(JSON.stringify(report.diff, null, 2));
console.log('\nReport →', join(OUT_DIR, 'roundtrip_report.json'));
