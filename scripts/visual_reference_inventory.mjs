#!/usr/bin/env node
/**
 * Inventory Roll20 sheet folders that have both source files and preview images.
 *
 * Usage:
 *   node scripts/visual_reference_inventory.mjs <out_dir> <label=path> [...]
 *
 * This is read-only for the external corpus roots. It writes a Markdown summary
 * plus local-only JSON under the workspace report directory.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';

const OUT_DIR = process.argv[2];
const ROOT_SPECS = process.argv.slice(3);

if (!OUT_DIR || ROOT_SPECS.length === 0) {
  console.error('usage: node scripts/visual_reference_inventory.mjs <out_dir> <label=path> [...]');
  process.exit(2);
}

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);
const HTML_EXT = new Set(['.html', '.htm', '.txt']);
const CSS_EXT = new Set(['.css', '.txt']);
const I18N_EXT = new Set(['.json', '.txt']);

const REF_PATTERNS = [
  /preview/i,
  /screenshot/i,
  /screen[ _-]?shot/i,
  /thumbnail/i,
  /capture/i,
  /reference/i,
  /미리보기/i,
  /완성/i,
  /캡처/i,
  /스크린샷/i,
];

const SOFT_REF_PATTERNS = [
  /sample/i,
  /example/i,
  /예시/i,
  /샘플/i,
];

const SOURCE_HTML_PATTERNS = [
  /^original\.html?$/i,
  /^html\.(html?|txt)$/i,
  /^index\.html?$/i,
  /sheet.*\.html?$/i,
  /\.html?$/i,
];

const SOURCE_CSS_PATTERNS = [
  /^original\.css$/i,
  /^css\.(css|txt)$/i,
  /^sheet\.css$/i,
  /sheet.*\.css$/i,
  /\.css$/i,
];

const I18N_PATTERNS = [
  /^translation\.json$/i,
  /^translations\.json$/i,
  /^translate\.txt$/i,
  /^i18n.*\.(json|txt)$/i,
  /번역\.(txt|json)$/i,
];

function parseSpec(spec) {
  const eq = spec.indexOf('=');
  if (eq < 1) throw new Error(`Invalid root spec: ${spec}`);
  return { label: spec.slice(0, eq), root: resolve(spec.slice(eq + 1)) };
}

function extOf(file) {
  const m = /\.([^.]+)$/.exec(file.toLowerCase());
  return m ? `.${m[1]}` : '';
}

function isLikelyHtml(file) {
  const name = basename(file);
  const ext = extOf(name);
  if (!HTML_EXT.has(ext)) return false;
  if (SOURCE_HTML_PATTERNS.some((rx) => rx.test(name))) return true;
  if (ext === '.txt' && /html/i.test(name)) return true;
  return false;
}

function isLikelyCss(file) {
  const name = basename(file);
  const ext = extOf(name);
  if (!CSS_EXT.has(ext)) return false;
  if (SOURCE_CSS_PATTERNS.some((rx) => rx.test(name))) return true;
  if (ext === '.txt' && /css/i.test(name)) return true;
  return false;
}

function isLikelyI18n(file) {
  const name = basename(file);
  const ext = extOf(name);
  if (!I18N_EXT.has(ext)) return false;
  return I18N_PATTERNS.some((rx) => rx.test(name));
}

function isReferenceImage(file) {
  const name = basename(file);
  const dir = basename(dirname(file));
  return REF_PATTERNS.some((rx) => rx.test(name) || rx.test(dir)) ||
    SOFT_REF_PATTERNS.some((rx) => rx.test(name) || rx.test(dir));
}

function isStrongReferenceImage(file) {
  const name = basename(file);
  const dir = basename(dirname(file));
  return REF_PATTERNS.some((rx) => rx.test(name) || rx.test(dir));
}

function isWithin(parent, child) {
  return child.startsWith(`${parent}\\`) || child.startsWith(`${parent}/`);
}

function sha256File(file) {
  const buf = readFileSync(file);
  return createHash('sha256').update(buf).digest('hex');
}

function walk(root, visit) {
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '.git' || entry.name === 'node_modules') continue;
        stack.push(p);
      } else if (entry.isFile()) {
        visit(p);
      }
    }
  }
}

function pickBest(files, kind) {
  const patterns = kind === 'html' ? SOURCE_HTML_PATTERNS : kind === 'css' ? SOURCE_CSS_PATTERNS : I18N_PATTERNS;
  return [...files].sort((a, b) => {
    const an = basename(a), bn = basename(b);
    const ai = patterns.findIndex((rx) => rx.test(an));
    const bi = patterns.findIndex((rx) => rx.test(bn));
    const ar = ai < 0 ? 999 : ai;
    const br = bi < 0 ? 999 : bi;
    if (ar !== br) return ar - br;
    return an.localeCompare(bn);
  })[0] ?? null;
}

function scanRoot(spec) {
  const byDir = new Map();
  let fileCount = 0;
  let imageCount = 0;
  let referenceImageCount = 0;

  function ensure(dir) {
    if (!byDir.has(dir)) {
      byDir.set(dir, { dir, html: [], css: [], i18n: [], images: [], referenceImages: [] });
    }
    return byDir.get(dir);
  }

  walk(spec.root, (file) => {
    fileCount += 1;
    const dir = dirname(file);
    const ext = extOf(file);
    if (IMAGE_EXT.has(ext)) {
      imageCount += 1;
      const rec = ensure(dir);
      rec.images.push(file);
      if (isReferenceImage(file)) {
        referenceImageCount += 1;
        rec.referenceImages.push(file);
      }
      return;
    }
    if (isLikelyHtml(file)) ensure(dir).html.push(file);
    else if (isLikelyCss(file)) ensure(dir).css.push(file);
    else if (isLikelyI18n(file)) ensure(dir).i18n.push(file);
  });

  const direct = [...byDir.values()]
    .filter((r) => r.html.length && r.css.length)
    .map((r) => ({
      corpus: spec.label,
      dir: r.dir,
      relDir: relative(spec.root, r.dir) || '.',
      html: pickBest(r.html, 'html'),
      css: pickBest(r.css, 'css'),
      i18n: pickBest(r.i18n, 'i18n'),
      referenceImages: r.referenceImages,
      assetImages: r.images.filter((img) => !r.referenceImages.includes(img)),
      sourceFileCount: r.html.length + r.css.length + r.i18n.length,
    }));

  const sourceDirs = new Set(direct.map((r) => r.dir));
  function nearestSourceDirFor(dir) {
    let cur = dir;
    while (cur && cur !== dirname(cur)) {
      if (sourceDirs.has(cur)) return cur;
      cur = dirname(cur);
    }
    return sourceDirs.has(cur) ? cur : null;
  }

  // Pair source folders with reference images in child folders such as "assets" or "제작용".
  const enriched = direct.map((r) => {
    const childRefs = [...byDir.values()]
      .filter((cand) => isWithin(r.dir, cand.dir) && nearestSourceDirFor(cand.dir) === r.dir)
      .flatMap((cand) => cand.referenceImages);
    const refs = [...new Set([...r.referenceImages, ...childRefs])];
    const strongRefs = refs.filter(isStrongReferenceImage);
    return {
      ...r,
      referenceImages: refs,
      strongReferenceImages: strongRefs,
      referenceCount: refs.length,
      strongReferenceCount: strongRefs.length,
      assetCount: r.assetImages.length,
      htmlBytes: r.html ? statSync(r.html).size : 0,
      cssBytes: r.css ? statSync(r.css).size : 0,
      i18nBytes: r.i18n && existsSync(r.i18n) ? statSync(r.i18n).size : 0,
      htmlSha256: r.html ? sha256File(r.html) : null,
      cssSha256: r.css ? sha256File(r.css) : null,
      i18nSha256: r.i18n ? sha256File(r.i18n) : null,
    };
  });

  return {
    corpus: spec.label,
    root: spec.root,
    fileCount,
    imageCount,
    referenceImageCount,
    sheetCount: direct.length,
    visualCandidateCount: enriched.filter((r) => r.referenceCount > 0).length,
    sheets: enriched,
  };
}

const roots = ROOT_SPECS.map(parseSpec);
mkdirSync(OUT_DIR, { recursive: true });

const result = {
  generatedAt: new Date().toISOString(),
  roots: roots.map((r) => ({ label: r.label, root: r.root })),
  corpora: roots.map(scanRoot),
};

const allCandidates = result.corpora
  .flatMap((c) => c.sheets)
  .filter((s) => s.referenceCount > 0)
  .sort((a, b) =>
    b.strongReferenceCount - a.strongReferenceCount ||
    b.referenceCount - a.referenceCount ||
    b.htmlBytes + b.cssBytes - (a.htmlBytes + a.cssBytes)
  );

result.summary = {
  corpusCount: result.corpora.length,
  sheetCount: result.corpora.reduce((sum, c) => sum + c.sheetCount, 0),
  imageCount: result.corpora.reduce((sum, c) => sum + c.imageCount, 0),
  visualCandidateCount: allCandidates.length,
};

writeFileSync(join(OUT_DIR, 'visual-reference-inventory.json'), JSON.stringify(result, null, 2));

const lines = [
  '# Visual Reference Inventory',
  '',
  `Generated: ${result.generatedAt}`,
  '',
  'Scope: read-only scan for sheet folders that have HTML/CSS source files plus preview/reference images. This does not prove visual parity yet.',
  '',
  '## Corpus Summary',
  '',
  '| Corpus | Source root | Sheets with HTML/CSS | Images | Reference images | Visual candidates |',
  '| --- | --- | ---: | ---: | ---: | ---: |',
];

for (const c of result.corpora) {
  lines.push(`| ${c.corpus} | \`${c.root}\` | ${c.sheetCount} | ${c.imageCount} | ${c.referenceImageCount} | ${c.visualCandidateCount} |`);
}

lines.push(
  '',
  '## Top Visual Candidates',
  '',
  '| Corpus | Sheet | HTML | CSS | i18n | Strong refs | All refs | First reference |',
  '| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |',
);

for (const s of allCandidates.slice(0, 40)) {
  const first = s.strongReferenceImages[0] ?? s.referenceImages[0];
  const firstRef = first ? relative(s.dir, first) : '';
  lines.push(`| ${s.corpus} | \`${s.relDir}\` | ${s.htmlBytes} | ${s.cssBytes} | ${s.i18nBytes} | ${s.strongReferenceCount} | ${s.referenceCount} | \`${firstRef}\` |`);
}

lines.push(
  '',
  '## Next Automation Step',
  '',
  'For each visual candidate:',
  '',
  '1. Copy the selected HTML/CSS/i18n and reference image into an ignored fixture folder.',
  '2. Import the sheet into the app or a dedicated preview harness.',
  '3. Toggle legacy sanitization according to sheet metadata or manual fixture annotation.',
  '4. Capture the rendered preview screenshot.',
  '5. Compare screenshot dimensions and pixel diff against the reference image.',
  '6. Store the diff report as evidence before claiming Roll20 visual parity.',
  '',
  '## Source Safety',
  '',
  '- This scan only reads external corpus folders.',
  '- Raw JSON is local-only and ignored by git.',
);

writeFileSync(join(OUT_DIR, 'visual-reference-inventory.md'), `${lines.join('\n')}\n`);

console.log(JSON.stringify(result.summary, null, 2));
