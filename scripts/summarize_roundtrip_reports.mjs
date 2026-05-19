#!/usr/bin/env node
/**
 * Summarize local roundtrip_report.json files.
 *
 * Usage:
 *   node scripts/summarize_roundtrip_reports.mjs [reports/roundtrip-node]
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.argv[2] ?? 'reports/roundtrip-node');
mkdirSync(ROOT, { recursive: true });

const entries = readdirSync(ROOT, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => {
    const dir = join(ROOT, entry.name);
    const reportPath = join(dir, 'roundtrip_report.json');
    const timeoutPath = join(dir, 'TIMEOUT.txt');
    if (existsSync(reportPath)) {
      const report = JSON.parse(readFileSync(reportPath, 'utf8'));
      return { label: entry.name, report, timeout: null };
    }
    if (existsSync(timeoutPath)) {
      return { label: entry.name, report: null, timeout: readFileSync(timeoutPath, 'utf8').trim() };
    }
    return null;
  })
  .filter(Boolean)
  .sort((a, b) => a.label.localeCompare(b.label));

const lines = [
  '# Selected Roundtrip Node Audit',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  'Scope: Node-side import determinism and structural fingerprint checks. This is not the browser Blockly emit roundtrip and not visual parity.',
  '',
  '| Sheet | Status | HTML blocks | Top-level | CSS blocks | i18n blocks | Worker matched/raw | Import ms | Notes |',
  '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |',
];

for (const entry of entries) {
  if (entry.timeout) {
    lines.push(`| ${entry.label} | TIMEOUT |  |  |  |  |  | >300000 | ${entry.timeout.replace(/\|/g, '/')} |`);
    continue;
  }

  const r = entry.report;
  const ok = r.determinism?.allEqual && r.treeDiffA_vs_A2?.identicalFingerprint;
  const status = ok ? 'PASS' : 'CHECK';
  const stats = r.importStats ?? {};
  const coverage = stats.coverage ?? 'n/a';
  const htmlMatch = stats.htmlTotal != null ? `${stats.htmlMatched}/${stats.htmlTotal}` : 'n/a';
  const cssMatch = stats.cssTotal != null ? `${stats.cssMatched}/${stats.cssTotal}` : 'n/a';
  const rawFallback = (stats.htmlRawFallback ?? 0) + (stats.cssRawFallback ?? 0);
  const notes = `coverage ${coverage}%, html ${htmlMatch}, css ${cssMatch}, rawFallback ${rawFallback}, rawPartial ${r.rawHtmlPartialRoundtrip?.ok}`;
  lines.push([
    entry.label,
    status,
    r.structuralHtml?.totalBlocks ?? '',
    r.structuralHtml?.topLevelCount ?? '',
    r.structuralCss?.totalBlocks ?? '',
    r.structuralI18n?.totalBlocks ?? '',
    `${stats.scriptBlocksMatched ?? 0}/${stats.scriptStatementsRaw ?? 0}`,
    r.timing?.importMsA ?? '',
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
  '- TIMEOUT means the current importer is not yet acceptable for that sheet class.',
  '',
  '## Source Safety',
  '',
  '- Source sheet directories were read only.',
  '- Generated raw JSON reports are local-only and ignored by git.',
);

writeFileSync(join(ROOT, 'summary.md'), `${lines.join('\n')}\n`);
console.log(JSON.stringify({ entries: entries.length, summary: join(ROOT, 'summary.md') }, null, 2));
