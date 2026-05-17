#!/usr/bin/env node
/**
 * Emit roundtrip diff — Stage 1.5 byte-identical verify.
 *
 * 목표:
 *   원본 HTML/CSS/i18n → import → blocks(A) → emit → HTML2/CSS2/i18n2
 *     → import → blocks(C) → byte-identical 여부 검증
 *
 * 사용:
 *   node scripts/emit_roundtrip_diff.mjs <sheet_dir> [out_dir]
 *
 *   sheet_dir 안 파일 (자동 탐지, 시스템 hardcoding 0):
 *     - *.html (또는 original.html)
 *     - *.css  (또는 original.css)
 *     - translate.txt / i18n.txt / *.json
 *
 *   out_dir = report 출력 폴더 (기본: ./out)
 *
 * ⚠️ 환경 한계 (현 Node-only 검증 환경):
 *   true emit (Blockly Workspace → generator dispatch → HTML/CSS) 은
 *   Blockly 런타임 (browser DOM 의존) 필요. 본 sandbox 는 npm install /
 *   tsc compile 불가 — 따라서 본 script 는 다음 검증만 수행:
 *
 *   1) Import determinism — 같은 입력을 두 번 import → XML byte-identical?
 *      (byte-identical roundtrip 의 필요조건. 위배 시 roundtrip 자체 불가능.)
 *
 *   2) Raw HTML partial roundtrip — XML 안 r20_raw_html 블록 HTML 필드를
 *      추출 → concat → 재 import, token preservation 측정.
 *
 *   3) Structural fingerprint — XML A 의 block type 분포 / nesting depth /
 *      top-level count 가 동일 입력에서 안정적인지.
 *
 * 한계 없는 환경에서의 다음 Phase:
 *   - Playwright/headless Chrome 으로 page.evaluate 안 Blockly 로드,
 *     workspace.loadXml(A) → emitWorkspace() → HTML2 회수
 *   - HTML2 → importSheet → XML C → A diff
 *
 * 시스템 specific token 0 — 어떤 sheet 도 동일 알고리즘.
 */

import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { resolve, join, basename, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const SHEET_DIR = process.argv[2];
const OUT_DIR = process.argv[3] ?? resolve(process.cwd(), 'out');

if (!SHEET_DIR) {
  console.error('usage: node scripts/emit_roundtrip_diff.mjs <sheet_dir> [out_dir]');
  process.exit(2);
}

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_WEB = resolve(HERE, '..');

function readMaybe(p) { try { return readFileSync(p, 'utf8'); } catch { return null; } }

function findFirst(dir, candidates) {
  for (const c of candidates) {
    if (typeof c !== 'string') continue;
    const p = join(dir, c);
    if (existsSync(p) && statSync(p).isFile()) return p;
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

function discoverInputs(dir) {
  return {
    htmlPath: findFirst(dir, ['original.html', /\.html?$/i]),
    cssPath:  findFirst(dir, ['original.css', /\.css$/i]),
    i18nPath: findFirst(dir, ['translate.txt', 'i18n.txt', /^translat[a-z]*\.(txt|json)$/i, /^i18n.*\.(txt|json)$/i]),
  };
}

function sha256(s) { return createHash('sha256').update(s).digest('hex'); }

function parseAttrs(s) {
  const out = {};
  const re = /([a-zA-Z_:][\w:.\-]*)\s*=\s*"([^"]*)"/g;
  let m;
  while ((m = re.exec(s))) out[m[1]] = decodeXmlEntities(m[2]);
  return out;
}

function decodeXmlEntities(s) {
  return s.replace(/&(amp|lt|gt|quot|apos|#x?[0-9a-fA-F]+);/g, (_, e) => {
    if (e === 'amp') return '&';
    if (e === 'lt') return '<';
    if (e === 'gt') return '>';
    if (e === 'quot') return '"';
    if (e === 'apos') return "'";
    if (e.startsWith('#x')) return String.fromCodePoint(parseInt(e.slice(2), 16));
    if (e.startsWith('#')) return String.fromCodePoint(parseInt(e.slice(1), 10));
    return _;
  });
}

function tokenize(xml) {
  const out = [];
  let i = 0;
  const n = xml.length;
  while (i < n) {
    if (xml[i] === '<') {
      if (xml.startsWith('<!--', i)) { const e = xml.indexOf('-->', i + 4); i = e < 0 ? n : e + 3; continue; }
      if (xml[i + 1] === '?' || xml[i + 1] === '!') { const e = xml.indexOf('>', i); i = e < 0 ? n : e + 1; continue; }
      if (xml[i + 1] === '/') {
        const e = xml.indexOf('>', i);
        if (e < 0) break;
        const name = xml.slice(i + 2, e).trim();
        out.push({ kind: 'close', name });
        i = e + 1;
        continue;
      }
      const e = xml.indexOf('>', i);
      if (e < 0) break;
      const selfClose = xml[e - 1] === '/';
      const inside = xml.slice(i + 1, selfClose ? e - 1 : e);
      const sp = inside.search(/\s/);
      const name = sp < 0 ? inside : inside.slice(0, sp);
      const attrs = sp < 0 ? {} : parseAttrs(inside.slice(sp + 1));
      out.push({ kind: 'open', name, attrs, selfClose });
      i = e + 1;
    } else {
      const e = xml.indexOf('<', i);
      const text = xml.slice(i, e < 0 ? n : e);
      if (text.length) out.push({ kind: 'text', value: text });
      i = e < 0 ? n : e;
    }
  }
  return out;
}

function findBlock(stack) {
  for (let k = stack.length - 1; k >= 0; k--) if (stack[k].block) return stack[k].block;
  return null;
}

function parseBlocklyXml(xml) {
  const top = [];
  const tokens = tokenize(xml);
  const stack = [{ kind: 'root', children: top, block: null }];
  for (const tk of tokens) {
    if (tk.kind === 'open') {
      const fr = stack[stack.length - 1];
      if (tk.name === 'xml') continue;
      if (tk.name === 'block') {
        const blk = { kind: 'block', type: tk.attrs.type ?? '', fields: {}, values: {}, statements: {}, next: null };
        if (fr.kind === 'root') fr.children.push(blk);
        else if (fr.kind === 'value') fr.parentBlock.values[fr.name] = blk;
        else if (fr.kind === 'statement') {
          if (!fr.parentBlock.statements[fr.name]) fr.parentBlock.statements[fr.name] = [];
          fr.parentBlock.statements[fr.name].push(blk);
        } else if (fr.kind === 'next') fr.parentBlock.next = blk;
        if (!tk.selfClose) stack.push({ kind: 'block', block: blk });
      } else if (tk.name === 'field') {
        const blk = stack[stack.length - 1].block ?? findBlock(stack);
        const fieldName = tk.attrs.name ?? '';
        if (tk.selfClose) { if (blk) blk.fields[fieldName] = ''; }
        else stack.push({ kind: 'field', name: fieldName, block: blk, buf: '' });
      } else if (tk.name === 'value' || tk.name === 'statement' || tk.name === 'next') {
        const blk = stack[stack.length - 1].block ?? findBlock(stack);
        if (tk.selfClose) continue;
        stack.push({ kind: tk.name, name: tk.attrs.name ?? '', parentBlock: blk, block: null });
      } else {
        if (!tk.selfClose) stack.push({ kind: 'unknown', name: tk.name });
      }
    } else if (tk.kind === 'close') {
      const fr = stack[stack.length - 1];
      if (fr.kind === 'field' && fr.block) fr.block.fields[fr.name] = fr.buf;
      stack.pop();
    } else if (tk.kind === 'text') {
      const fr = stack[stack.length - 1];
      if (fr.kind === 'field') fr.buf += decodeXmlEntities(tk.value);
    }
  }
  return top;
}

function countBlocks(tree) {
  let count = 0;
  function walk(b) {
    count++;
    for (const v of Object.values(b.values)) walk(v);
    for (const arr of Object.values(b.statements)) for (const c of arr) walk(c);
    if (b.next) walk(b.next);
  }
  for (const t of tree) walk(t);
  return count;
}

function typeDistribution(tree) {
  const d = {};
  function walk(b) {
    d[b.type] = (d[b.type] ?? 0) + 1;
    for (const v of Object.values(b.values)) walk(v);
    for (const arr of Object.values(b.statements)) for (const c of arr) walk(c);
    if (b.next) walk(b.next);
  }
  for (const t of tree) walk(t);
  return d;
}

function depthOf(tree) {
  let max = 0;
  function walk(b, d) {
    if (d > max) max = d;
    for (const v of Object.values(b.values)) walk(v, d + 1);
    for (const arr of Object.values(b.statements)) for (const c of arr) walk(c, d + 1);
    if (b.next) walk(b.next, d);
  }
  for (const t of tree) walk(t, 1);
  return max;
}

function fingerprint(tree) {
  function ser(b) {
    const fk = Object.keys(b.fields).sort();
    const fstr = fk.map((k) => `${k}=${b.fields[k].length}`).join(',');
    const vk = Object.keys(b.values).sort();
    const vstr = vk.map((k) => `${k}{${ser(b.values[k])}}`).join(',');
    const sk = Object.keys(b.statements).sort();
    const sstr = sk.map((k) => `${k}[${b.statements[k].map(ser).join('|')}]`).join(',');
    const nstr = b.next ? `>${ser(b.next)}` : '';
    return `${b.type}(${fstr};${vstr};${sstr})${nstr}`;
  }
  return tree.map(ser).join('\n');
}

function diffTrees(a, b, maxReport = 20) {
  const diffs = [];
  function cmp(ba, bb, path) {
    if (diffs.length >= maxReport) return;
    if (ba == null && bb == null) return;
    if (ba == null || bb == null) { diffs.push({ path, kind: 'null', a: !!ba, b: !!bb }); return; }
    if (ba.type !== bb.type) { diffs.push({ path, kind: 'type', a: ba.type, b: bb.type }); return; }
    const fA = Object.keys(ba.fields).sort();
    const fB = Object.keys(bb.fields).sort();
    if (fA.join(',') !== fB.join(',')) diffs.push({ path: `${path}.fields`, kind: 'field-keys', a: fA, b: fB });
    else for (const k of fA) if (ba.fields[k] !== bb.fields[k]) diffs.push({ path: `${path}.fields.${k}`, kind: 'field-val', aLen: ba.fields[k].length, bLen: bb.fields[k].length });
    const vA = Object.keys(ba.values).sort();
    const vB = Object.keys(bb.values).sort();
    if (vA.join(',') !== vB.join(',')) diffs.push({ path: `${path}.values`, kind: 'value-keys', a: vA, b: vB });
    else for (const k of vA) cmp(ba.values[k], bb.values[k], `${path}.values.${k}`);
    const sA = Object.keys(ba.statements).sort();
    const sB = Object.keys(bb.statements).sort();
    if (sA.join(',') !== sB.join(',')) diffs.push({ path: `${path}.statements`, kind: 'stmt-keys', a: sA, b: sB });
    else for (const k of sA) {
      const la = ba.statements[k] ?? [], lb = bb.statements[k] ?? [];
      if (la.length !== lb.length) diffs.push({ path: `${path}.statements.${k}`, kind: 'stmt-len', a: la.length, b: lb.length });
      else for (let i = 0; i < la.length; i++) cmp(la[i], lb[i], `${path}.statements.${k}[${i}]`);
    }
    cmp(ba.next, bb.next, `${path}.next`);
  }
  if (a.length !== b.length) diffs.push({ path: '<top>', kind: 'top-count', a: a.length, b: b.length });
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) cmp(a[i] ?? null, b[i] ?? null, `<top>[${i}]`);
  return diffs;
}

function extractRawHtml(tree) {
  const out = [];
  function walk(b) {
    if (b.type === 'r20_raw_html') out.push(b.fields.HTML ?? '');
    for (const v of Object.values(b.values)) walk(v);
    for (const arr of Object.values(b.statements)) for (const c of arr) walk(c);
    if (b.next) walk(b.next);
  }
  for (const t of tree) walk(t);
  return out;
}

async function main() {
  const sheetDir = resolve(SHEET_DIR);
  const outDir = resolve(OUT_DIR);
  mkdirSync(outDir, { recursive: true });

  const { htmlPath, cssPath, i18nPath } = discoverInputs(sheetDir);
  console.error('[discover]');
  console.error('  html:', htmlPath ?? '(none)');
  console.error('  css :', cssPath ?? '(none)');
  console.error('  i18n:', i18nPath ?? '(none)');

  if (!htmlPath && !cssPath) { console.error('No HTML or CSS — abort.'); process.exit(3); }

  const html = htmlPath ? readMaybe(htmlPath) : '';
  const css = cssPath ? readMaybe(cssPath) : '';
  const i18n = i18nPath ? readMaybe(i18nPath) : '';

  const importerUrl = pathToFileURL(join(REPO_WEB, 'lib/import/index.js')).href;
  const { importSheet } = await import(importerUrl);

  const t1 = Date.now();
  const resultA = importSheet({ html, css, i18n });
  const ms1 = Date.now() - t1;

  const t2 = Date.now();
  const resultA2 = importSheet({ html, css, i18n });
  const ms2 = Date.now() - t2;

  const dHtml = resultA.html === resultA2.html;
  const dCss = resultA.css === resultA2.css;
  const dI18n = resultA.i18n === resultA2.i18n;

  const treeA = parseBlocklyXml(resultA.html);
  const treeA2 = parseBlocklyXml(resultA2.html);
  const cssTreeA = parseBlocklyXml(resultA.css);
  const i18nTreeA = parseBlocklyXml(resultA.i18n);

  const countA = countBlocks(treeA);
  const distA = typeDistribution(treeA);
  const depthA = depthOf(treeA);
  const fpA = fingerprint(treeA);
  const fpA2 = fingerprint(treeA2);
  const diffsAA2 = diffTrees(treeA, treeA2);

  const rawBlocks = extractRawHtml(treeA);
  const rawConcat = rawBlocks.join('\n');
  let rawDetail = null, rawOk = null;
  if (rawBlocks.length > 0) {
    const rRaw = importSheet({ html: rawConcat });
    const treeRaw = parseBlocklyXml(rRaw.html);
    const origTokens = new Set(rawConcat.match(/[A-Za-z가-힣0-9_]+/g) ?? []);
    const afterTokens = new Set(rRaw.html.match(/[A-Za-z가-힣0-9_]+/g) ?? []);
    let preserved = 0, lost = 0; const lostSample = [];
    for (const t of origTokens) {
      if (afterTokens.has(t)) preserved++;
      else { lost++; if (lostSample.length < 10) lostSample.push(t); }
    }
    rawDetail = {
      origRawBlockCount: rawBlocks.length,
      origConcatBytes: rawConcat.length,
      reImportTopLevelCount: treeRaw.length,
      reImportTotalBlocks: countBlocks(treeRaw),
      reImportRawCount: extractRawHtml(treeRaw).length,
      tokenPreservation: {
        origTokenCount: origTokens.size,
        preserved, lost, lostSample,
        preservedPct: origTokens.size ? Math.round((preserved * 10000) / origTokens.size) / 100 : 0,
      },
    };
    rawOk = lost === 0;
  }

  const htmlBytesA = Buffer.byteLength(resultA.html, 'utf8');
  const htmlBytesA2 = Buffer.byteLength(resultA2.html, 'utf8');
  const cssBytesA = Buffer.byteLength(resultA.css, 'utf8');
  const cssBytesA2 = Buffer.byteLength(resultA2.css, 'utf8');
  const i18nBytesA = Buffer.byteLength(resultA.i18n, 'utf8');
  const i18nBytesA2 = Buffer.byteLength(resultA2.i18n, 'utf8');

  const report = {
    sheet: basename(sheetDir),
    sheetDir,
    inputs: {
      html: htmlPath ? { path: htmlPath, bytes: html.length } : null,
      css:  cssPath  ? { path: cssPath,  bytes: css.length }  : null,
      i18n: i18nPath ? { path: i18nPath, bytes: i18n.length } : null,
    },
    importStats: resultA.stats,
    timing: { importMsA: ms1, importMsA2: ms2 },
    determinism: {
      htmlBytesEqual: dHtml, cssBytesEqual: dCss, i18nBytesEqual: dI18n,
      allEqual: dHtml && dCss && dI18n,
      htmlBytesA, htmlBytesA2, cssBytesA, cssBytesA2, i18nBytesA, i18nBytesA2,
      htmlSha256A: sha256(resultA.html), htmlSha256A2: sha256(resultA2.html),
      cssSha256A: sha256(resultA.css),   cssSha256A2: sha256(resultA2.css),
      i18nSha256A: sha256(resultA.i18n), i18nSha256A2: sha256(resultA2.i18n),
    },
    structuralHtml: {
      totalBlocks: countA, topLevelCount: treeA.length, maxDepth: depthA,
      typeCount: Object.keys(distA).length,
      topTypes: Object.entries(distA).sort((a, b) => b[1] - a[1]).slice(0, 15),
    },
    structuralCss: {
      totalBlocks: countBlocks(cssTreeA), topLevelCount: cssTreeA.length,
      typeCount: Object.keys(typeDistribution(cssTreeA)).length,
      topTypes: Object.entries(typeDistribution(cssTreeA)).sort((a, b) => b[1] - a[1]).slice(0, 10),
    },
    structuralI18n: {
      totalBlocks: countBlocks(i18nTreeA), topLevelCount: i18nTreeA.length,
      typeCount: Object.keys(typeDistribution(i18nTreeA)).length,
      topTypes: Object.entries(typeDistribution(i18nTreeA)).sort((a, b) => b[1] - a[1]).slice(0, 10),
    },
    treeDiffA_vs_A2: {
      identicalFingerprint: fpA === fpA2,
      diffCount: diffsAA2.length,
      firstDiffs: diffsAA2.slice(0, 10),
    },
    rawHtmlPartialRoundtrip: rawDetail
      ? { ok: rawOk, ...rawDetail }
      : { ok: null, note: '원본에 r20_raw_html 블록 없음 — partial roundtrip skip' },
    fullEmitRoundtrip: {
      executed: false,
      blocker: 'Blockly browser-runtime 의존 — 본 Node-only 환경에서 실행 불가',
      nextPhase: 'Playwright + headless Chrome 으로 Blockly.Workspace.loadXml + emitWorkspace',
    },
  };

  writeFileSync(join(outDir, 'roundtrip_report.json'), JSON.stringify(report, null, 2));
  console.error('[done] report →', join(outDir, 'roundtrip_report.json'));

  const conclusion = (dHtml && dCss && dI18n) ? 'DETERMINISM_OK' : 'DETERMINISM_FAIL';
  console.log(JSON.stringify({
    sheet: report.sheet,
    conclusion,
    htmlBytes: htmlBytesA, cssBytes: cssBytesA, i18nBytes: i18nBytesA,
    htmlBlocks: countA, htmlTopLevel: treeA.length,
    determinism: report.determinism,
    fullEmitRoundtripBlocked: report.fullEmitRoundtrip.blocker,
    rawPartialOk: rawOk,
  }, null, 2));
}

main().catch((e) => { console.error('[fail]', e); process.exit(1); });
