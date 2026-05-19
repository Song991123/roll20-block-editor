#!/usr/bin/env node
/**
 * Static corpus audit for Roll20 sheet source folders.
 *
 * Usage:
 *   node scripts/corpus_static_audit.mjs <out_dir> <id=path> [id=path ...]
 *
 * External corpus roots are read-only. Reports are written only to <out_dir>.
 * This is a static scan, not a roundtrip or visual verification.
 */

import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const OUT_DIR = process.argv[2];
const ROOTS = parseRootArgs(process.argv.slice(3));

const PRIMARY_EXTS = new Set(['.html', '.htm', '.css', '.json', '.js', '.txt']);
const HTML_EXTS = new Set(['.html', '.htm']);
const CSS_EXTS = new Set(['.css']);
const JS_EXTS = new Set(['.js']);
const TEXTISH_EXTS = new Set(['.html', '.htm', '.css', '.json', '.js', '.txt']);
const MAX_READ_BYTES = 8 * 1024 * 1024;

const FEATURES = [
  feature('htmlElements', /<[a-zA-Z][\w:-]*(?:\s|>|\/>)/g, HTML_EXTS),
  feature('rollButtons', /type\s*=\s*["']roll["']/gi, HTML_EXTS),
  feature('rolltemplates', /<rolltemplate\b/gi, HTML_EXTS),
  feature('workerScripts', /<script\b[^>]*type\s*=\s*["']text\/worker["'][^>]*>/gi, HTML_EXTS),
  feature('normalScripts', /<script\b(?![^>]*type\s*=\s*["']text\/worker["'])/gi, HTML_EXTS),
  feature('workerOn', /\bon\s*\(/g, new Set([...HTML_EXTS, ...JS_EXTS])),
  feature('getAttrs', /\bgetAttrs\s*\(/g, new Set([...HTML_EXTS, ...JS_EXTS])),
  feature('setAttrs', /\bsetAttrs\s*\(/g, new Set([...HTML_EXTS, ...JS_EXTS])),
  feature('getSectionIDs', /\bgetSectionIDs\s*\(/g, new Set([...HTML_EXTS, ...JS_EXTS])),
  feature('repeating', /repeating_[A-Za-z0-9_-]+/g, TEXTISH_EXTS),
  feature('checkedSelectors', /:checked\b/g, CSS_EXTS),
  feature('sheetTabs', /sheet-tab/g, TEXTISH_EXTS),
  feature('pulp', /pulp/gi, TEXTISH_EXTS),
  feature('era1920', /1920/g, TEXTISH_EXTS),
  feature('checkboxInputs', /<input\b[^>]*type\s*=\s*["']checkbox["'][^>]*>/gi, HTML_EXTS),
  feature('radioInputs', /<input\b[^>]*type\s*=\s*["']radio["'][^>]*>/gi, HTML_EXTS),
  feature('inlineStyleAttrs', /\sstyle\s*=\s*["'][\s\S]*?["']/gi, HTML_EXTS),
  feature('inlineClassAttrs', /\sclass\s*=\s*["'][\s\S]*?["']/gi, HTML_EXTS),
  feature('dataI18n', /\bdata-i18n(?:-[\w-]+)?\s*=/gi, HTML_EXTS),
  feature('cssKeyframes', /@(?:-\w+-)?keyframes\b/gi, CSS_EXTS),
  feature('cssAnimations', /\banimation(?:-[a-z-]+)?\s*:/gi, CSS_EXTS),
  feature('cssTransforms', /\btransform\s*:/gi, CSS_EXTS),
  feature('cssVars', /var\(\s*--[\w-]+/gi, CSS_EXTS),
  feature('cssVarDecls', /--[A-Za-z_][\w-]*\s*:/g, CSS_EXTS),
  feature('cssFixed', /\bposition\s*:\s*fixed\b/gi, CSS_EXTS),
  feature('cssSticky', /\bposition\s*:\s*sticky\b/gi, CSS_EXTS),
  feature('cssHasSelector', /:has\s*\(/g, CSS_EXTS),
  feature('cssViewportUnits', /[-.\d](?:vh|vw|vmin|vmax)\b/gi, CSS_EXTS),
  feature('cssContainerQueries', /@container\b/gi, CSS_EXTS),
];

main();

function main() {
  if (!OUT_DIR || ROOTS.length === 0) {
    console.error('usage: node scripts/corpus_static_audit.mjs <out_dir> <id=path> [id=path ...]');
    process.exit(2);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const generatedAt = new Date().toISOString();
  const corpus = [];
  const sheets = [];
  const files = [];

  for (const root of ROOTS) {
    const result = scanCorpus(root);
    corpus.push(result.summary);
    sheets.push(...result.sheets);
    files.push(...result.files);
  }

  const report = {
    generatedAt,
    note: 'External corpus roots were read only. This report is a static scan, not a full roundtrip or visual verification.',
    outputDirectory: OUT_DIR,
    corpus,
    sheets,
    files,
  };

  writeFileSync(join(OUT_DIR, 'corpus-static-audit.json'), JSON.stringify(report, null, 2), 'utf8');
  writeFileSync(join(OUT_DIR, 'corpus-static-audit.md'), renderMarkdown(report), 'utf8');
  console.log(JSON.stringify({
    generatedAt,
    outputDirectory: OUT_DIR,
    corpusCount: corpus.length,
    sheetCount: sheets.length,
    fileCount: files.length,
  }, null, 2));
}

function parseRootArgs(args) {
  return args.map((arg, index) => {
    const eq = arg.indexOf('=');
    if (eq > 0) return { id: arg.slice(0, eq), label: arg.slice(0, eq), path: arg.slice(eq + 1) };
    return { id: `root-${index + 1}`, label: `root-${index + 1}`, path: arg };
  });
}

function scanCorpus(root) {
  const summary = {
    id: root.id,
    label: root.label,
    path: root.path,
    exists: existsSync(root.path),
    candidateFiles: 0,
    candidateBytes: 0,
    skippedLargeFiles: 0,
    extensionCounts: {},
    featureCounts: emptyFeatures(),
  };
  const files = [];
  const sheetMap = new Map();
  if (!summary.exists) return { summary, sheets: [], files: [] };

  for (const filePath of walkFiles(root.path)) {
    const ext = extname(filePath).toLowerCase();
    if (!PRIMARY_EXTS.has(ext)) continue;
    const st = statSync(filePath);
    summary.candidateFiles += 1;
    summary.candidateBytes += st.size;
    summary.extensionCounts[ext] = (summary.extensionCounts[ext] ?? 0) + 1;

    const sheetKey = sheetKeyFor(root.path, filePath);
    const rel = relative(root.path, filePath);
    const row = {
      corpusId: root.id,
      sheetKey,
      path: filePath,
      relativePath: rel,
      extension: ext,
      bytes: st.size,
      sha256: null,
      skippedReason: null,
      features: emptyFeatures(),
    };

    if (st.size > MAX_READ_BYTES) {
      row.skippedReason = `larger than ${MAX_READ_BYTES} bytes`;
      summary.skippedLargeFiles += 1;
    } else {
      const text = readFileSync(filePath, 'utf8');
      row.sha256 = sha256(text);
      for (const { name, pattern, extensions } of FEATURES) {
        if (!extensions.has(ext)) continue;
        const count = countMatches(text, pattern);
        row.features[name] = count;
        summary.featureCounts[name] += count;
      }
    }

    files.push(row);
    const sheet = sheetMap.get(sheetKey) ?? newSheet(root, sheetKey);
    sheet.files += 1;
    sheet.bytes += st.size;
    sheet.extensions[ext] = (sheet.extensions[ext] ?? 0) + 1;
    sheet.filePaths.push(rel);
    if (row.skippedReason) sheet.skippedFiles += 1;
    for (const { name } of FEATURES) sheet.features[name] += row.features[name];
    sheetMap.set(sheetKey, sheet);
  }

  return {
    summary,
    sheets: Array.from(sheetMap.values())
      .map((sheet) => ({
        ...sheet,
        classification: classifySheet(sheet),
        openRisks: classifyRisks(sheet),
      }))
      .sort((a, b) => b.bytes - a.bytes || a.sheetKey.localeCompare(b.sheetKey)),
    files,
  };
}

function* walkFiles(root) {
  const stack = [root];
  while (stack.length) {
    const cur = stack.pop();
    let entries = [];
    try {
      entries = readdirSync(cur, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const p = join(cur, entry.name);
      if (entry.isDirectory()) stack.push(p);
      else if (entry.isFile()) yield p;
    }
  }
}

function sheetKeyFor(root, filePath) {
  const parts = relative(root, filePath).split(/[\\/]+/);
  return parts.length <= 1 ? '.' : parts[0];
}

function newSheet(root, sheetKey) {
  return {
    corpusId: root.id,
    corpusPath: root.path,
    sheetKey,
    files: 0,
    skippedFiles: 0,
    bytes: 0,
    extensions: {},
    filePaths: [],
    features: emptyFeatures(),
  };
}

function emptyFeatures() {
  return Object.fromEntries(FEATURES.map(({ name }) => [name, 0]));
}

function classifySheet(sheet) {
  const f = sheet.features;
  return {
    hasHtml: Boolean(sheet.extensions['.html'] || sheet.extensions['.htm'] || sheet.extensions['.txt']),
    hasCss: Boolean(sheet.extensions['.css']),
    hasI18n: Boolean(sheet.extensions['.json'] || f.dataI18n > 0),
    hasWorkers: f.workerScripts > 0 || f.workerOn > 0 || f.getAttrs > 0 || f.setAttrs > 0,
    hasRolltemplates: f.rolltemplates > 0,
    hasDefaultViewLogic: f.checkedSelectors > 0 || f.pulp > 0 || f.era1920 > 0 || f.sheetTabs > 0,
    hasLegacyCssRisk:
      f.cssKeyframes > 0 ||
      f.cssAnimations > 0 ||
      f.cssTransforms > 0 ||
      f.cssVars > 0 ||
      f.cssFixed > 0 ||
      f.cssSticky > 0 ||
      f.cssHasSelector > 0 ||
      f.cssContainerQueries > 0,
  };
}

function classifyRisks(sheet) {
  const risks = [];
  const f = sheet.features;
  if (sheet.skippedFiles > 0) risks.push(`${sheet.skippedFiles} file(s) skipped for size`);
  if (f.normalScripts > 0) risks.push('normal script tags require hiding or raw preservation');
  if (f.workerScripts > 0 || f.workerOn > 0) risks.push('sheet worker simulation required');
  if (f.rolltemplates > 0) risks.push('rolltemplate chat rendering required');
  if (f.cssTransforms > 0 || f.cssAnimations > 0 || f.cssVars > 0 || f.cssFixed > 0 || f.cssSticky > 0) risks.push('legacy CSS sanitizer candidate');
  if (f.pulp > 0 || f.era1920 > 0 || f.checkedSelectors > 0) risks.push('default view / era control behavior required');
  if (f.repeating > 0) risks.push('repeating section mapping required');
  return risks;
}

function countMatches(text, pattern) {
  pattern.lastIndex = 0;
  let count = 0;
  while (pattern.exec(text)) count += 1;
  pattern.lastIndex = 0;
  return count;
}

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

function feature(name, pattern, extensions) {
  return { name, pattern, extensions };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Corpus Static Audit', '');
  lines.push(`Generated: ${report.generatedAt}`, '');
  lines.push('External source folders were read only. This report is a static scan, not a full roundtrip or visual verification.', '');
  lines.push('## Corpus Summary', '');
  lines.push('| Corpus | Exists | Candidate Files | Candidate Bytes | Skipped Large Files |');
  lines.push('|---|---:|---:|---:|---:|');
  for (const c of report.corpus) lines.push(`| ${c.id} | ${c.exists ? 'yes' : 'no'} | ${c.candidateFiles} | ${c.candidateBytes} | ${c.skippedLargeFiles} |`);
  lines.push('', '## Top Sheets By Size', '');
  lines.push('| Corpus | Sheet | Files | Bytes | Key Features | Open Risks |');
  lines.push('|---|---|---:|---:|---|---|');
  for (const s of report.sheets.slice(0, 80)) {
    const cls = s.classification;
    const features = [
      cls.hasWorkers ? 'workers' : '',
      cls.hasRolltemplates ? 'rolltemplates' : '',
      cls.hasDefaultViewLogic ? 'default-view' : '',
      cls.hasLegacyCssRisk ? 'legacy-css-risk' : '',
    ].filter(Boolean).join(', ') || 'basic';
    lines.push(`| ${s.corpusId} | ${escapeMd(s.sheetKey)} | ${s.files} | ${s.bytes} | ${features} | ${escapeMd(s.openRisks.join('; '))} |`);
  }
  lines.push('', '## Feature Totals', '');
  lines.push('| Corpus | Feature | Count |');
  lines.push('|---|---|---:|');
  for (const c of report.corpus) {
    for (const [featureName, count] of Object.entries(c.featureCounts)) {
      if (count > 0) lines.push(`| ${c.id} | ${featureName} | ${count} |`);
    }
  }
  lines.push('', '## Interpretation', '');
  lines.push('- This report proves only static presence and risk counts.');
  lines.push('- It does not prove 100% import/export parity.');
  lines.push('- Next required step: run selected fixtures through import -> emit -> import, then visual Roll20 comparison.');
  lines.push('');
  return lines.join('\n');
}

function escapeMd(value) {
  return String(value).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}
