#!/usr/bin/env node
/**
 * Run Node-side import determinism checks over explicitly selected sheet dirs.
 *
 * Usage:
 *   node scripts/run_selected_roundtrip.mjs <label=sheet_dir> [...]
 *
 * This does not mutate the source sheet folders. It only reads each sheet
 * directory and writes local reports under reports/roundtrip-node/<label>/.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_WEB = resolve(HERE, '..');
const OUT_ROOT = resolve(REPO_WEB, 'reports/roundtrip-node');

function usage() {
  console.error('usage: node scripts/run_selected_roundtrip.mjs <label=sheet_dir> [...]');
}

function slugify(label) {
  return label
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'sheet';
}

const specs = process.argv.slice(2).map((arg) => {
  const eq = arg.indexOf('=');
  if (eq < 1) return null;
  return { label: arg.slice(0, eq), dir: arg.slice(eq + 1) };
}).filter(Boolean);

if (specs.length === 0) {
  usage();
  process.exit(2);
}

mkdirSync(OUT_ROOT, { recursive: true });

const rows = [];
for (const spec of specs) {
  const outDir = join(OUT_ROOT, slugify(spec.label));
  mkdirSync(outDir, { recursive: true });

  const res = spawnSync(process.execPath, [
    join(REPO_WEB, 'scripts/emit_roundtrip_diff.mjs'),
    spec.dir,
    outDir,
  ], {
    cwd: REPO_WEB,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const reportPath = join(outDir, 'roundtrip_report.json');
  let report = null;
  if (existsSync(reportPath)) {
    report = JSON.parse(readFileSync(reportPath, 'utf8'));
  }

  rows.push({
    label: spec.label,
    dir: spec.dir,
    exitCode: res.status ?? 1,
    stdout: (res.stdout ?? '').trim(),
    stderrTail: [
      res.error ? String(res.error.message) : '',
      (res.stderr ?? '').trim(),
    ].filter(Boolean).join('\n').split(/\r?\n/).slice(-8).join('\n'),
    report,
  });
}

const now = new Date().toISOString();
const lines = [
  '# Selected Roundtrip Node Audit',
  '',
  `Generated: ${now}`,
  '',
  'Scope: Node-side import determinism and structural fingerprint checks. This is not the browser Blockly emit roundtrip and not visual parity.',
  '',
  '| Sheet | Status | HTML blocks | Top-level | CSS blocks | i18n blocks | Import ms | Notes |',
  '| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |',
];

for (const row of rows) {
  const r = row.report;
  const ok = row.exitCode === 0 && r?.determinism?.allEqual && r?.treeDiffA_vs_A2?.identicalFingerprint;
  const status = row.exitCode === 0 ? (ok ? 'PASS' : 'CHECK') : 'FAIL';
  const notes = row.exitCode === 0
    ? `match ${r.importStats?.matchPct ?? 'n/a'}%, warnings ${r.importStats?.warningCount ?? r.importStats?.warnings?.length ?? 'n/a'}`
    : row.stderrTail.replace(/\|/g, '/').replace(/\r?\n/g, '<br>');
  lines.push([
    row.label,
    status,
    r?.structuralHtml?.totalBlocks ?? '',
    r?.structuralHtml?.topLevelCount ?? '',
    r?.structuralCss?.totalBlocks ?? '',
    r?.structuralI18n?.totalBlocks ?? '',
    r?.timing?.importMsA ?? '',
    notes,
  ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
}

lines.push(
  '',
  '## Blocking Truth',
  '',
  '- PASS here only means the importer is deterministic for the same input.',
  '- It does not prove HTML/CSS byte-identical export, Roll20 visual parity, sheet worker behavior, or roll template chat rendering.',
  '- Browser roundtrip still requires the Playwright/browser path in `scripts/emit_roundtrip_playwright.mjs` or an equivalent in-app browser automation harness.',
  '',
  '## Source Safety',
  '',
  '- Source sheet directories were read only.',
  '- Generated raw JSON reports are local-only and ignored by git.',
);

writeFileSync(join(OUT_ROOT, 'summary.md'), `${lines.join('\n')}\n`);

const failed = rows.filter((r) => r.exitCode !== 0);
console.log(JSON.stringify({
  checked: rows.length,
  failed: failed.length,
  summary: join(OUT_ROOT, 'summary.md'),
}, null, 2));

if (failed.length) process.exit(1);
