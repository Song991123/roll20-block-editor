#!/usr/bin/env node
/**
 * Compare row-raster diagnostics across selected ChatPane candidates.
 *
 * Diagnostic only. This script keeps each candidate's row-raster probe output
 * in its own folder so candidate experiments do not overwrite the default
 * renderer gate evidence.
 */

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const runDirArg = args[0] ?? 'reports/roll20-actual-compare/2026-06-18-state-map-v1';
const runDir = path.resolve(runDirArg);
const outDir = path.join(runDir, 'chat-row-raster-candidate-comparison');

const candidates = [
  ['default', 'reports/rolltemplate-chat-smoke/rolltemplate-chat-smoke-results.json', 'reports/rolltemplate-chat-smoke/screenshots'],
  ['no-shadow', 'reports/rolltemplate-chat-smoke-no-template-shadow/rolltemplate-chat-smoke-results.json', 'reports/rolltemplate-chat-smoke-no-template-shadow/screenshots'],
  ['aw2e-message-width-font-size', 'reports/rolltemplate-chat-smoke-aw2e-message-width-font-size/rolltemplate-chat-smoke-results.json', 'reports/rolltemplate-chat-smoke-aw2e-message-width-font-size/screenshots'],
  ['aw2e-message-width-text-metrics', 'reports/rolltemplate-chat-smoke-aw2e-message-width-text-metrics/rolltemplate-chat-smoke-results.json', 'reports/rolltemplate-chat-smoke-aw2e-message-width-text-metrics/screenshots'],
  ['coc-table-scale-x', 'reports/rolltemplate-chat-smoke-coc-table-scale-x/rolltemplate-chat-smoke-results.json', 'reports/rolltemplate-chat-smoke-coc-table-scale-x/screenshots'],
  ['paint-dim-background', 'reports/rolltemplate-chat-smoke-paint-dim-background/rolltemplate-chat-smoke-results.json', 'reports/rolltemplate-chat-smoke-paint-dim-background/screenshots'],
  ['coc-background-size-actual', 'reports/rolltemplate-chat-smoke-coc-background-size-actual/rolltemplate-chat-smoke-results.json', 'reports/rolltemplate-chat-smoke-coc-background-size-actual/screenshots'],
  ['paint-edge-shadow', 'reports/rolltemplate-chat-smoke-paint-edge-shadow/rolltemplate-chat-smoke-results.json', 'reports/rolltemplate-chat-smoke-paint-edge-shadow/screenshots'],
  ['yshy-sanitize-typography', 'reports/rolltemplate-chat-smoke-yshy-sanitize-typography/rolltemplate-chat-smoke-results.json', 'reports/rolltemplate-chat-smoke-yshy-sanitize-typography/screenshots'],
];

await mkdir(outDir, { recursive: true });
const rows = [];

for (const [name, smokeFile, screenshotsDir] of candidates) {
  if (!existsSync(smokeFile) || !existsSync(screenshotsDir)) {
    rows.push({ name, status: 'MISSING_EVIDENCE', smokeFile, screenshotsDir });
    continue;
  }
  const candidateOutDir = path.join(outDir, name);
  execFileSync('node', [
    'scripts/roll20_chat_row_raster_probe.mjs',
    runDirArg,
    smokeFile,
    screenshotsDir,
    '--report-dir',
    candidateOutDir,
  ], { stdio: 'pipe' });
  const report = JSON.parse(await readFile(path.join(candidateOutDir, 'chat-row-raster-probe-results.json'), 'utf8'));
  rows.push(summarizeCandidate(name, smokeFile, screenshotsDir, candidateOutDir, report));
}

const defaultRow = rows.find((row) => row.name === 'default' && row.status === 'OK');
const compared = rows.map((row) => {
  if (row.status !== 'OK' || !defaultRow) return row;
  return {
    ...row,
    aw2eRowWeightedDeltaPct: numberDelta(row.aw2e?.rowWeightedPctNumber, defaultRow.aw2e?.rowWeightedPctNumber),
    aw2eWorstRowDeltaPct: numberDelta(row.aw2e?.worstRowMismatchPctNumber, defaultRow.aw2e?.worstRowMismatchPctNumber),
    aw2eWorstRowLumaDeltaChange: numberDelta(row.aw2e?.worstRowSignedLumaDelta, defaultRow.aw2e?.worstRowSignedLumaDelta),
    yshyRowWeightedDeltaPct: numberDelta(row.yshy?.rowWeightedPctNumber, defaultRow.yshy?.rowWeightedPctNumber),
    yshyWorstRowDeltaPct: numberDelta(row.yshy?.worstRowMismatchPctNumber, defaultRow.yshy?.worstRowMismatchPctNumber),
    yshyWorstRowLumaDeltaChange: numberDelta(row.yshy?.worstRowSignedLumaDelta, defaultRow.yshy?.worstRowSignedLumaDelta),
    rowRasterRisk: classifyRowRasterRisk(row, defaultRow),
  };
});

const report = {
  generatedAt: new Date().toISOString(),
  runDir: runDirArg,
  scope: 'diagnostic-only row raster candidate comparison; no production CSS',
  summary: {
    candidates: compared.length,
    compared: compared.filter((row) => row.status === 'OK').length,
    rejected: compared.filter((row) => row.rowRasterRisk === 'reject-row-raster-regression').length,
    noMeaningfulGain: compared.filter((row) => row.rowRasterRisk === 'no-meaningful-row-raster-gain').length,
    productionSafe: false,
  },
  candidates: compared,
};

await writeFile(path.join(outDir, 'chat-row-raster-candidate-comparison-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeFile(path.join(outDir, 'chat-row-raster-candidate-comparison-results.md'), renderMarkdown(report), 'utf8');

for (const row of compared) {
  if (row.status !== 'OK') {
    console.log(`SKIP ${row.name} ${row.status}`);
    continue;
  }
  console.log(`ROW_RASTER_CANDIDATE ${row.name} risk=${row.rowRasterRisk} aw2eWeighted=${row.aw2e?.rowWeightedMismatchPct} aw2eDelta=${formatSigned(row.aw2eRowWeightedDeltaPct)} aw2eWorst=${row.aw2e?.worstRowMismatchPct} aw2eWorstDelta=${formatSigned(row.aw2eWorstRowDeltaPct)} yshyWeighted=${row.yshy?.rowWeightedMismatchPct} yshyDelta=${formatSigned(row.yshyRowWeightedDeltaPct)} yshyWorst=${row.yshy?.worstRowMismatchPct} yshyWorstDelta=${formatSigned(row.yshyWorstRowDeltaPct)}`);
}
console.log(`out=${path.relative(process.cwd(), outDir)}`);

function summarizeCandidate(name, smokeFile, screenshotsDir, candidateOutDir, report) {
  const fixture = (id) => report.fixtures.find((item) => item.fixtureId === id);
  return {
    name,
    status: 'OK',
    smokeFile,
    screenshotsDir,
    reportDir: path.relative(process.cwd(), candidateOutDir),
    aw2e: summarizeFixture(fixture('official-roll20-AW2E')),
    lesOublies: summarizeFixture(fixture('official-roll20-Les-Oublies')),
    yshy: summarizeFixture(fixture('yshy-commission-1bu')),
    decisions: report.summary?.decisions ?? {},
  };
}

function summarizeFixture(fixture) {
  if (!fixture) return null;
  const worst = fixture.worstRows?.[0] ?? null;
  return {
    decision: fixture.decision ?? '',
    rowWeightedMismatchPct: fixture.summary?.rowWeightedMismatchPct ?? '',
    rowWeightedPctNumber: parsePct(fixture.summary?.rowWeightedMismatchPct),
    worstRowIndex: worst?.index ?? null,
    worstRowMismatchPct: worst?.mismatchPct ?? '',
    worstRowMismatchPctNumber: parsePct(worst?.mismatchPct),
    worstRowSignedLumaDelta: typeof worst?.avgSignedLumaDelta === 'number' ? worst.avgSignedLumaDelta : null,
    nextAction: fixture.nextAction ?? '',
  };
}

function classifyRowRasterRisk(row, defaultRow) {
  if (row.name === 'default') return 'baseline';
  const fixtureDeltas = ['aw2e', 'yshy'].map((fixtureKey) => ({
    fixtureKey,
    weightedDelta: numberDelta(row[fixtureKey]?.rowWeightedPctNumber, defaultRow[fixtureKey]?.rowWeightedPctNumber),
    worstDelta: numberDelta(row[fixtureKey]?.worstRowMismatchPctNumber, defaultRow[fixtureKey]?.worstRowMismatchPctNumber),
  }));
  if (fixtureDeltas.some((item) => item.worstDelta != null && item.worstDelta >= 2)) return 'reject-row-raster-regression';
  if (fixtureDeltas.some((item) => item.weightedDelta != null && item.weightedDelta <= -0.5) && fixtureDeltas.every((item) => item.worstDelta == null || item.worstDelta <= 1)) {
    return 'row-raster-improves-needs-style-proof';
  }
  return 'no-meaningful-row-raster-gain';
}

function renderMarkdown(report) {
  const lines = [
    '# Roll20 Chat Row Raster Candidate Comparison',
    '',
    `Generated: ${report.generatedAt}`,
    `Run: \`${report.runDir}\``,
    '',
    'Scope: diagnostic-only. Candidate outputs are isolated under this report folder and do not replace the default gate evidence.',
    '',
    '| Candidate | Status | Risk | AW2E weighted | AW2E delta | AW2E worst | AW2E worst delta | YSHY weighted | YSHY delta | YSHY worst | YSHY worst delta |',
    '| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
  ];
  for (const row of report.candidates) {
    if (row.status !== 'OK') {
      lines.push(`| \`${row.name}\` | ${row.status} |  |  |  |  |  |  |  |  |  |`);
      continue;
    }
    lines.push(`| \`${row.name}\` | OK | ${row.rowRasterRisk} | ${row.aw2e?.rowWeightedMismatchPct ?? ''} | ${formatSigned(row.aw2eRowWeightedDeltaPct)} | ${row.aw2e?.worstRowMismatchPct ?? ''} | ${formatSigned(row.aw2eWorstRowDeltaPct)} | ${row.yshy?.rowWeightedMismatchPct ?? ''} | ${formatSigned(row.yshyRowWeightedDeltaPct)} | ${row.yshy?.worstRowMismatchPct ?? ''} | ${formatSigned(row.yshyWorstRowDeltaPct)} |`);
  }
  lines.push('', '## Claim Boundary', '');
  lines.push('- This is a routing diagnostic, not Roll20 visual parity.');
  lines.push('- Rejected candidates must stay out of production renderer defaults.');
  return `${lines.join('\n')}\n`;
}

function parsePct(value) {
  const match = String(value ?? '').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function numberDelta(value, baseline) {
  if (typeof value !== 'number' || typeof baseline !== 'number') return null;
  return Number((value - baseline).toFixed(3));
}

function formatSigned(value) {
  if (typeof value !== 'number') return '';
  const rounded = Number(value.toFixed(3));
  return `${rounded > 0 ? '+' : ''}${rounded}`;
}
