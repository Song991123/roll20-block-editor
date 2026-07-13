#!/usr/bin/env node
/**
 * Bundle one local ChatPane candidate experiment through the diagnostic gates.
 *
 * This script does not start a browser or dev server. It consumes an already
 * generated candidate smoke JSON plus screenshot folder, writes isolated
 * local-only reports, then passes those reports into the final renderer action
 * gate. Diagnostic only; not production renderer CSS and not visual parity.
 */

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const rawArgs = process.argv.slice(2).filter((arg) => arg !== '--');
const optionNamesWithValues = new Set([
  '--candidate',
  '--candidate-smoke',
  '--candidate-screenshots',
  '--out-dir',
  '--source-context-dir',
  '--row-paint-source-dir',
  '--cell-allocation-dir',
]);
const runDirArg = firstPositionalArg() ?? 'reports/roll20-actual-compare/2026-06-18-state-map-v1';
const candidate = readOption('--candidate', '');
const candidateSmoke = readOption('--candidate-smoke', '');
const candidateScreenshots = readOption('--candidate-screenshots', '');
const sourceContextDir = readOption('--source-context-dir', '');
const rowPaintSourceDir = readOption('--row-paint-source-dir', '');
const cellAllocationDir = readOption('--cell-allocation-dir', '');
const rawOutDir = readOption('--out-dir', '');
const outDir = path.resolve(rawOutDir || path.join(runDirArg, 'chat-candidate-experiment-gate', safeFilePart(candidate || 'candidate')));

function usage() {
  return [
    'Usage:',
    '  node scripts/roll20_chat_candidate_experiment_gate.mjs reports/roll20-actual-compare/<label> \\',
    '    --candidate <name> \\',
    '    --candidate-smoke <rolltemplate-chat-smoke-results.json> \\',
    '    --candidate-screenshots <screenshots-dir> \\',
    '    [--source-context-dir <report-dir>] [--row-paint-source-dir <report-dir>] [--cell-allocation-dir <report-dir>] [--out-dir <writable-dir>]',
  ].join('\n');
}

if (!candidate || !candidateSmoke || !candidateScreenshots) {
  console.error(usage());
  process.exit(2);
}

if (!existsSync(candidateSmoke)) {
  console.error(`Missing --candidate-smoke: ${candidateSmoke}`);
  process.exit(2);
}

if (!existsSync(candidateScreenshots)) {
  console.error(`Missing --candidate-screenshots: ${candidateScreenshots}`);
  process.exit(2);
}

await mkdir(outDir, { recursive: true });

const reportDirs = {
  candidateComparison: path.join(outDir, 'candidate-comparison'),
  rowRasterCandidates: path.join(outDir, 'row-raster-candidates'),
  styleProof: path.join(outDir, 'style-proof'),
  tableWidthBudget: path.join(outDir, 'table-width-budget'),
  rendererGate: path.join(outDir, 'renderer-gate'),
};

const commands = [];

runNode('scripts/roll20_chat_candidate_compare.mjs', [
  runDirArg,
  '--include-candidates',
  candidate,
  '--candidate-screenshots',
  `${candidate}=${candidateScreenshots}`,
  '--out-dir',
  reportDirs.candidateComparison,
]);

runNode('scripts/roll20_chat_row_raster_candidate_compare.mjs', [
  runDirArg,
  '--include-candidates',
  candidate,
  '--candidate-smoke',
  `${candidate}=${candidateSmoke}`,
  '--candidate-screenshots',
  `${candidate}=${candidateScreenshots}`,
  '--out-dir',
  reportDirs.rowRasterCandidates,
]);

runNode('scripts/roll20_chat_candidate_style_proof.mjs', [
  runDirArg,
  '--candidate-comparison-dir',
  reportDirs.candidateComparison,
  '--candidate-smoke',
  `${candidate}=${candidateSmoke}`,
  '--include-candidates',
  candidate,
  '--out-dir',
  reportDirs.styleProof,
]);

runNode('scripts/roll20_chat_table_width_budget.mjs', [
  runDirArg,
  '--out-dir',
  reportDirs.tableWidthBudget,
]);

const rendererArgs = [
  runDirArg,
  '--chat-candidate-comparison-dir',
  reportDirs.candidateComparison,
  '--chat-candidate-style-proof-dir',
  reportDirs.styleProof,
  '--chat-row-raster-candidates-dir',
  reportDirs.rowRasterCandidates,
  '--chat-table-budget-dir',
  reportDirs.tableWidthBudget,
  '--out-dir',
  reportDirs.rendererGate,
];
if (sourceContextDir) rendererArgs.push('--chat-source-context-dir', sourceContextDir);
if (rowPaintSourceDir) rendererArgs.push('--row-paint-source-dir', rowPaintSourceDir);
if (cellAllocationDir) rendererArgs.push('--cell-allocation-dir', cellAllocationDir);
runNode('scripts/roll20_renderer_action_gate.mjs', rendererArgs);

const reports = {
  candidateComparison: await readJson(path.join(reportDirs.candidateComparison, 'chat-candidate-comparison-results.json')),
  rowRasterCandidates: await readJson(path.join(reportDirs.rowRasterCandidates, 'chat-row-raster-candidate-comparison-results.json')),
  styleProof: await readJson(path.join(reportDirs.styleProof, 'chat-candidate-style-proof-results.json')),
  tableWidthBudget: await readJson(path.join(reportDirs.tableWidthBudget, 'chat-table-width-budget-results.json')),
  rendererGate: await readJson(path.join(reportDirs.rendererGate, 'renderer-action-gate-results.json')),
};

const summary = summarizeExperiment(reports);
const finalReport = {
  generatedAt: new Date().toISOString(),
  runDir: runDirArg,
  candidate,
  inputs: {
    candidateSmoke,
    candidateScreenshots,
    sourceContextDir: sourceContextDir || null,
    rowPaintSourceDir: rowPaintSourceDir || null,
    cellAllocationDir: cellAllocationDir || null,
  },
  output: {
    outDir: path.relative(process.cwd(), outDir),
    reportDirs: Object.fromEntries(Object.entries(reportDirs).map(([key, value]) => [key, path.relative(process.cwd(), value)])),
  },
  scope: 'diagnostic-only candidate experiment bundle; no browser, no dev server, no production renderer CSS',
  commands,
  summary,
};

await writeFile(path.join(outDir, 'chat-candidate-experiment-gate-results.json'), `${JSON.stringify(finalReport, null, 2)}\n`, 'utf8');
await writeFile(path.join(outDir, 'chat-candidate-experiment-gate-results.md'), renderMarkdown(finalReport), 'utf8');

console.log(`ROLL20 CHAT CANDIDATE EXPERIMENT ${summary.rendererAction}`);
console.log(`CANDIDATE ${candidate} risk=${summary.candidate?.promotionRisk ?? ''} style=${summary.styleProof?.styleProofStatus ?? ''} rowRaster=${summary.rowRaster?.rowRasterRisk ?? ''}`);
console.log(`out=${path.relative(process.cwd(), outDir)}`);

function readOption(name, fallback = '') {
  const index = rawArgs.indexOf(name);
  if (index === -1) return fallback;
  const value = rawArgs[index + 1];
  if (!value || value.startsWith('--')) return fallback;
  return value;
}

function firstPositionalArg() {
  return rawArgs.find((arg, index) => !arg.startsWith('--') && !optionNamesWithValues.has(rawArgs[index - 1]));
}

function runNode(script, args) {
  const command = ['node', script, ...args];
  try {
    const stdout = execFileSync('node', [script, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    commands.push({ command, status: 'OK', stdout: tailLines(stdout, 12) });
  } catch (error) {
    const stdout = error.stdout ? String(error.stdout) : '';
    const stderr = error.stderr ? String(error.stderr) : '';
    commands.push({ command, status: 'FAILED', stdout: tailLines(stdout, 20), stderr: tailLines(stderr, 20) });
    console.error(`Command failed: ${command.join(' ')}`);
    if (stdout) console.error(stdout);
    if (stderr) console.error(stderr);
    throw error;
  }
}

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

function summarizeExperiment(reports) {
  const candidateRow = findCandidate(reports.candidateComparison, candidate);
  const rowRasterRow = findCandidate(reports.rowRasterCandidates, candidate);
  const styleProofRow = findCandidate(reports.styleProof, candidate);
  const rendererRecommendation = reports.rendererGate?.recommendation ?? {};
  return {
    rendererAction: rendererRecommendation.action ?? 'UNKNOWN',
    blockerCount: rendererRecommendation.blockers?.length ?? 0,
    topBlockers: (rendererRecommendation.blockers ?? []).slice(0, 5),
    candidate: candidateRow
      ? {
          status: candidateRow.status,
          promotionRisk: candidateRow.promotionRisk ?? '',
          meanAlignedDeltaPct: candidateRow.meanAlignedDeltaPct ?? null,
          regressedFixtures: candidateRow.regressedFixtures ?? null,
          fixtureAlignedDeltaPct: candidateRow.fixtureAlignedDeltaPct ?? {},
          aw2eAlignedPct: candidateRow.aw2e?.alignedPct ?? '',
          yshyAlignedPct: candidateRow.yshy?.alignedPct ?? '',
        }
      : null,
    rowRaster: rowRasterRow
      ? {
          status: rowRasterRow.status,
          rowRasterRisk: rowRasterRow.rowRasterRisk ?? '',
          aw2eRowWeightedDeltaPct: rowRasterRow.aw2eRowWeightedDeltaPct ?? null,
          aw2eWorstRowDeltaPct: rowRasterRow.aw2eWorstRowDeltaPct ?? null,
          yshyRowWeightedDeltaPct: rowRasterRow.yshyRowWeightedDeltaPct ?? null,
          yshyWorstRowDeltaPct: rowRasterRow.yshyWorstRowDeltaPct ?? null,
        }
      : null,
    styleProof: styleProofRow
      ? {
          styleProofStatus: styleProofRow.styleProofStatus ?? '',
          promotionRisk: styleProofRow.promotionRisk ?? '',
          fixtureStatuses: Object.fromEntries((styleProofRow.fixtures ?? []).map((fixture) => [fixture.fixtureId, fixture.status])),
        }
      : null,
    tableWidthBudget: {
      status: reports.tableWidthBudget?.summary?.status ?? '',
      decisions: reports.tableWidthBudget?.summary?.decisions ?? {},
    },
  };
}

function findCandidate(report, name) {
  return (report?.candidates ?? []).find((row) => row.name === name) ?? null;
}

function renderMarkdown(report) {
  const lines = [
    '# Roll20 Chat Candidate Experiment Gate',
    '',
    `Generated: ${report.generatedAt}`,
    `Run: \`${report.runDir}\``,
    `Candidate: \`${report.candidate}\``,
    '',
    'Scope: diagnostic-only. This report consumes already-created candidate smoke evidence and does not start a browser or dev server.',
    '',
    '## Summary',
    '',
    `- Renderer action: \`${report.summary.rendererAction}\``,
    `- Candidate comparison risk: \`${report.summary.candidate?.promotionRisk ?? 'missing'}\``,
    `- Style proof: \`${report.summary.styleProof?.styleProofStatus ?? 'missing'}\``,
    `- Row raster risk: \`${report.summary.rowRaster?.rowRasterRisk ?? 'missing'}\``,
    `- Table budget: \`${report.summary.tableWidthBudget.status || 'missing'}\``,
    `- Blockers: ${report.summary.blockerCount}`,
    '',
    '## Candidate Evidence',
    '',
    `- Mean aligned delta: ${formatValue(report.summary.candidate?.meanAlignedDeltaPct)}`,
    `- Regressed fixtures: ${formatValue(report.summary.candidate?.regressedFixtures)}`,
    `- Fixture deltas: \`${JSON.stringify(report.summary.candidate?.fixtureAlignedDeltaPct ?? {})}\``,
    `- Row raster AW2E weighted delta: ${formatValue(report.summary.rowRaster?.aw2eRowWeightedDeltaPct)}`,
    `- Row raster YSHY weighted delta: ${formatValue(report.summary.rowRaster?.yshyRowWeightedDeltaPct)}`,
    '',
    '## Top Renderer Blockers',
    '',
    ...report.summary.topBlockers.map((blocker) => `- ${blocker}`),
    '',
    '## Output',
    '',
    ...Object.entries(report.output.reportDirs).map(([key, value]) => `- ${key}: \`${value}\``),
    '',
    '## Claim Boundary',
    '',
    '- This is not Roll20 visual parity.',
    '- This does not upload any sheet to Roll20.',
    '- This does not promote production renderer CSS.',
  ];
  return `${lines.join('\n')}\n`;
}

function formatValue(value) {
  return value == null || value === '' ? 'missing' : String(value);
}

function safeFilePart(value) {
  return String(value || 'candidate').replace(/[^A-Za-z0-9._-]+/g, '-').slice(0, 120);
}

function tailLines(value, count) {
  const lines = String(value || '').trim().split(/\r?\n/).filter(Boolean);
  return lines.slice(-count);
}
