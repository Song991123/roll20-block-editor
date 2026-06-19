#!/usr/bin/env node
/**
 * Classify whether Roll20 chat mismatch should be modeled as font/cell
 * allocation, broad typography, or table-width behavior.
 *
 * Diagnostic only. This does not enable a renderer model or production CSS.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const runDirArg = args[0] ?? 'reports/roll20-actual-compare/2026-06-18-state-map-v1';
const runDir = path.resolve(runDirArg);
const outDir = path.join(runDir, 'chat-font-cell-model');

async function main() {
  const style = await readJson(path.join(runDir, 'chat-style-context-diagnostics', 'chat-style-context-diagnostics-results.json'));
  const shell = await readJson(path.join(runDir, 'chat-shell-geometry', 'chat-shell-geometry-results.json'));
  const candidates = await readOptionalJson(path.join(runDir, 'chat-candidate-comparison', 'chat-candidate-comparison-results.json'));
  const policy = await readOptionalJson(path.join(runDir, 'chat-renderer-policy', 'chat-renderer-policy-results.json'));
  const fixtures = (shell.fixtures ?? []).map((fixture) => analyzeFixture(fixture, style, candidates, policy));
  const actionable = fixtures.filter((fixture) => fixture.modelDecision !== 'KEEP_DEFAULT_FOR_NOW');
  const report = {
    generatedAt: new Date().toISOString(),
    runDir: runDirArg,
    scope: 'diagnostic-only chat font/cell allocation model; not visual parity and not production CSS',
    summary: {
      status: actionable.length ? 'FONT_CELL_MODEL_NEEDED' : 'NO_FONT_CELL_MODEL_NEEDED',
      fixtures: fixtures.length,
      actionable: actionable.length,
      decisions: countBy(fixtures.map((fixture) => fixture.modelDecision)),
      productionSafe: false,
    },
    fixtures,
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'chat-font-cell-model-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'chat-font-cell-model-results.md'), renderMarkdown(report), 'utf8');

  console.log(`ROLL20 CHAT FONT CELL MODEL ${report.summary.status}`);
  for (const fixture of fixtures) {
    console.log(`FIXTURE ${fixture.fixtureId} decision=${fixture.modelDecision} cell=${fmtDelta(fixture.cellWidthDelta)} font=${fmtDelta(fixture.fontSizeDelta)} candidate=${fixture.typographyCandidateDeltaLabel} next=${fixture.nextAction}`);
  }
  console.log(`out=${path.relative(process.cwd(), outDir)}`);
}

function analyzeFixture(shellFixture, styleReport, candidatesReport, policyReport) {
  const fixtureId = shellFixture.fixtureId;
  const styleFixture = (styleReport.fixtures ?? []).find((item) => item.id === fixtureId);
  const policyFixture = (policyReport?.fixtures ?? []).find((item) => item.fixtureId === fixtureId);
  const fixtureKey = fixtureKeyForId(fixtureId);
  const candidateRows = candidatesReport?.candidates ?? [];
  const templateTypography = summarizeCandidate(candidateRows, 'template-typography', fixtureKey);
  const shellDecision = shellFixture.shellDecision ?? '';
  const cellWidthDelta = numberOrNull(shellFixture.geometryDeltas?.firstCellWidthDelta);
  const tableWidthDelta = numberOrNull(shellFixture.geometryDeltas?.tableWidthDelta);
  const fontSizeDelta = findStyleDelta(styleFixture, 'td:first', 'fontSize')
    ?? findStyleDelta(styleFixture, 'table', 'fontSize')
    ?? findStyleDelta(styleFixture, 'root', 'fontSize');
  const letterSpacingChanged = hasStyleDelta(styleFixture, 'td:first', 'letterSpacing') || hasStyleDelta(styleFixture, 'table', 'letterSpacing');
  const fontFamilyChanged = hasStyleDelta(styleFixture, 'td:first', 'fontFamily') || hasStyleDelta(styleFixture, 'table', 'fontFamily');
  const typographyCandidateUseful = typeof templateTypography.fixtureAlignedDeltaPct === 'number' && templateTypography.fixtureAlignedDeltaPct <= -0.5;
  const typographyCandidateRejected =
    templateTypography.risk === 'reject-regresses-fixtures' ||
    (typeof templateTypography.fixtureAlignedDeltaPct === 'number' && templateTypography.fixtureAlignedDeltaPct > -0.5);

  let modelDecision = 'KEEP_DEFAULT_FOR_NOW';
  let nextAction = 'keep default chat font/cell behavior while higher mismatch fixtures are investigated';
  const signals = [];
  if (Math.abs(cellWidthDelta ?? 0) >= 2) signals.push(`cell width delta ${fmtDelta(cellWidthDelta)}`);
  if (Math.abs(fontSizeDelta ?? 0) >= 1) signals.push(`font size delta ${fmtDelta(fontSizeDelta)}`);
  if (letterSpacingChanged) signals.push('letter-spacing differs');
  if (fontFamilyChanged) signals.push('font-family differs');
  if (templateTypography.name) signals.push(`template-typography candidate ${templateTypography.fixtureAlignedDeltaLabel || 'n/a'} risk=${templateTypography.risk || 'unknown'}`);

  if (shellDecision === 'SHELL_OK_OR_SECONDARY') {
    modelDecision = 'KEEP_DEFAULT_FOR_NOW';
    nextAction = 'keep font/cell differences as secondary evidence because aligned mismatch is below the high-mismatch threshold';
  } else if (shellDecision === 'WIDTH_MODEL_REQUIRED') {
    modelDecision = 'WIDTH_MODEL_BEFORE_FONT_CELL';
    nextAction = 'solve per-template table width/overflow first; font/cell tweaks would be confounded';
  } else if (Math.abs(cellWidthDelta ?? 0) >= 2 && Math.abs(fontSizeDelta ?? 0) >= 1 && typographyCandidateRejected) {
    modelDecision = 'NARROW_CELL_ALLOCATION_MODEL_REQUIRED';
    nextAction = 'build a narrow cell allocation diagnostic using actual Roll20 computed font metrics; do not promote broad template typography';
  } else if (Math.abs(cellWidthDelta ?? 0) >= 2 && typographyCandidateUseful) {
    modelDecision = 'TYPOGRAPHY_CANDIDATE_NEEDS_STYLE_PROOF';
    nextAction = 'prove the useful typography candidate from actual computed style before private renderer selection';
  } else if (Math.abs(tableWidthDelta ?? 0) >= 8) {
    modelDecision = 'TABLE_WIDTH_MODEL_REQUIRED';
    nextAction = 'model table width before font/cell allocation';
  }

  return {
    fixtureId,
    modelDecision,
    nextAction,
    shellDecision,
    policyDecision: policyFixture?.decision ?? '',
    bestAlignedMismatchPct: shellFixture.parity?.bestAlignedMismatchPct ?? '',
    cellWidthDelta,
    tableWidthDelta,
    fontSizeDelta,
    letterSpacingChanged,
    fontFamilyChanged,
    typographyCandidateDeltaPct: templateTypography.fixtureAlignedDeltaPct,
    typographyCandidateDeltaLabel: templateTypography.fixtureAlignedDeltaLabel ?? '',
    typographyCandidateRisk: templateTypography.risk ?? '',
    signals,
    styleEvidence: {
      topStyleDeltas: (styleFixture?.topStyleDeltas ?? []).slice(0, 8).map((delta) => ({
        selector: delta.selector,
        key: delta.key,
        local: delta.local,
        actual: delta.actual,
        numericDelta: delta.numericDelta ?? null,
      })),
    },
  };
}

function summarizeCandidate(rows, name, fixtureKey) {
  const candidate = rows.find((row) => row.name === name && row.status === 'OK');
  if (!candidate) return {};
  const delta = numberOrNull(candidate.fixtureAlignedDeltaPct?.[fixtureKey]);
  return {
    name,
    risk: candidate.promotionRisk ?? '',
    fixtureAlignedDeltaPct: delta,
    fixtureAlignedDeltaLabel: signedPct(delta),
    meanAlignedDeltaPct: numberOrNull(candidate.meanAlignedDeltaPct),
    regressedFixtures: Number(candidate.regressedFixtures ?? 0),
  };
}

function findStyleDelta(styleFixture, selector, key) {
  const item = (styleFixture?.topStyleDeltas ?? []).find((delta) => delta.selector === selector && delta.key === key);
  return numberOrNull(item?.numericDelta);
}

function hasStyleDelta(styleFixture, selector, key) {
  return (styleFixture?.topStyleDeltas ?? []).some((delta) => delta.selector === selector && delta.key === key && delta.local !== delta.actual);
}

function renderMarkdown(report) {
  const lines = [
    '# Roll20 Chat Font/Cell Model',
    '',
    `Generated: ${report.generatedAt}`,
    `Run: \`${report.runDir}\``,
    '',
    'Scope: diagnostic-only font/cell allocation strategy. This does not prove Roll20 parity and does not enable production CSS.',
    '',
    `Status: ${report.summary.status}`,
    '',
    '| Fixture | Decision | Shell | Aligned mismatch | Cell Δ | Font Δ | Template typography candidate | Signals | Next |',
    '| --- | --- | --- | ---: | ---: | ---: | --- | --- | --- |',
  ];
  for (const fixture of report.fixtures) {
    lines.push(`| \`${fixture.fixtureId}\` | ${fixture.modelDecision} | ${fixture.shellDecision} | ${fixture.bestAlignedMismatchPct} | ${fmtDelta(fixture.cellWidthDelta)} | ${fmtDelta(fixture.fontSizeDelta)} | ${fixture.typographyCandidateDeltaLabel || 'n/a'} ${fixture.typographyCandidateRisk || ''} | ${fixture.signals.join('<br>') || 'none'} | ${fixture.nextAction} |`);
  }
  return `${lines.join('\n')}\n`;
}

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    console.error(`Missing or invalid required report: ${path.relative(process.cwd(), file)}`);
    console.error(String(error?.message || error));
    process.exit(2);
  }
}

async function readOptionalJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

function fixtureKeyForId(fixtureId) {
  if (fixtureId === 'official-roll20-AW2E') return 'aw2e';
  if (fixtureId === 'official-roll20-Les-Oublies') return 'lesOublies';
  if (fixtureId === 'yshy-commission-1bu') return 'yshy';
  return fixtureId
    .replace(/^official-roll20-/, '')
    .replace(/-([a-z])/g, (_full, char) => char.toUpperCase())
    .replace(/[^a-zA-Z0-9_]/g, '');
}

function countBy(values) {
  const out = {};
  for (const value of values) out[value || 'unknown'] = (out[value || 'unknown'] ?? 0) + 1;
  return out;
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function fmtDelta(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '';
  return `${number > 0 ? '+' : ''}${Number(number.toFixed(3))}px`;
}

function signedPct(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '';
  return `${number > 0 ? '+' : ''}${Number(number.toFixed(2))}%`;
}

await main();
