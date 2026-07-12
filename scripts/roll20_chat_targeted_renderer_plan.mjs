#!/usr/bin/env node
/**
 * Build the next Roll20 chat renderer work plan from current actual evidence.
 *
 * Diagnostic only. This script does not enable product CSS. It prevents a
 * single global ChatPane change from being promoted while fixtures point at
 * different root causes.
 */

import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const SELF_TEST = args.includes('--self-test');
const runDirArg = args.find((arg) => arg !== '--self-test') ?? 'reports/roll20-actual-compare/2026-06-18-state-map-v1';
const runDir = path.resolve(runDirArg);
const outDir = path.join(runDir, 'chat-targeted-renderer-plan');

if (SELF_TEST) {
  selfTest();
} else {
  await main();
}

async function main() {
  const reports = {
    parity: await readOptionalJson(path.join(runDir, 'chat-parity-diagnostics', 'chat-parity-diagnostics-results.json')),
    reconciliation: await readOptionalJson(path.join(runDir, 'chat-width-reconciliation', 'chat-width-reconciliation-results.json')),
    shell: await readOptionalJson(path.join(runDir, 'chat-message-shell-model', 'chat-message-shell-model-results.json')),
    tableBudget: await readOptionalJson(path.join(runDir, 'chat-table-width-budget', 'chat-table-width-budget-results.json')),
    intrinsic: await readOptionalJson(path.join(runDir, 'chat-intrinsic-width-model', 'chat-intrinsic-width-model-results.json')),
    fontGlyph: await readOptionalJson(path.join(runDir, 'chat-font-glyph-model', 'chat-font-glyph-model-results.json')),
    rowPaintSource: await readOptionalJson(path.join(runDir, 'chat-row-paint-source-probe', 'chat-row-paint-source-probe-results.json')),
    rowRaster: await readOptionalJson(path.join(runDir, 'chat-row-raster-probe', 'chat-row-raster-probe-results.json')),
    backgroundSource: await readOptionalJson(path.join(runDir, 'chat-background-source-probe', 'chat-background-source-probe-results.json')),
    backgroundAssets: await readOptionalJson(path.join(runDir, 'chat-background-asset-probe', 'chat-background-asset-probe-results.json')),
    policy: await readOptionalJson(path.join(runDir, 'chat-renderer-policy', 'chat-renderer-policy-results.json')),
    candidates: await readOptionalJson(path.join(runDir, 'chat-candidate-comparison', 'chat-candidate-comparison-results.json')),
    styleProof: await readOptionalJson(path.join(runDir, 'chat-candidate-style-proof', 'chat-candidate-style-proof-results.json')),
  };
  const fixtureIds = collectFixtureIds(reports);
  const fixtures = fixtureIds.map((fixtureId) => buildFixturePlan(fixtureId, reports));
  const blockers = fixtures.flatMap((fixture) => fixture.blockers.map((item) => `${fixture.fixtureId}: ${item}`));
  const report = {
    generatedAt: new Date().toISOString(),
    runDir: runDirArg,
    scope: 'diagnostic-only targeted Roll20 chat renderer plan',
    productionRendererAction: blockers.length ? 'HOLD_PRODUCTION_RENDERER_PATCH' : 'READY_FOR_REVIEW',
    summary: {
      fixtures: fixtures.length,
      highMismatch: fixtures.filter((fixture) => fixture.priority === 'P0').length,
      blockers: blockers.length,
      strategies: countBy(fixtures.map((fixture) => fixture.strategy)),
    },
    fixtures,
    blockers,
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'chat-targeted-renderer-plan-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'chat-targeted-renderer-plan-results.md'), renderMarkdown(report), 'utf8');

  console.log(`ROLL20 CHAT TARGETED RENDERER PLAN action=${report.productionRendererAction} blockers=${blockers.length}`);
  for (const fixture of fixtures) {
    console.log(`FIXTURE ${fixture.fixtureId} priority=${fixture.priority} strategy=${fixture.strategy} mismatch=${fixture.alignedMismatchPct} next=${fixture.nextExperiment}`);
  }
  console.log(`out=${path.relative(process.cwd(), outDir)}`);
}

function buildFixturePlan(fixtureId, reports) {
  const parity = findFixture(reports.parity?.fixtures, fixtureId);
  const reconciliation = findFixture(reports.reconciliation?.fixtures, fixtureId);
  const shell = findFixture(reports.shell?.fixtures, fixtureId);
  const tableBudget = findFixture(reports.tableBudget?.fixtures, fixtureId);
  const intrinsic = findFixture(reports.intrinsic?.fixtures, fixtureId);
  const fontGlyph = findFixture(reports.fontGlyph?.fixtures, fixtureId);
  const rowPaintSource = findFixture(reports.rowPaintSource?.fixtures, fixtureId);
  const rowRaster = findFixture(reports.rowRaster?.fixtures, fixtureId);
  const backgroundSource = findFixture(reports.backgroundSource?.fixtures, fixtureId);
  const backgroundAssets = findFixture(reports.backgroundAssets?.fixtures, fixtureId);
  const policy = findFixture(reports.policy?.fixtures, fixtureId);
  const candidateByName = new Map((reports.candidates?.candidates ?? []).map((candidate) => [candidate.name, candidate]));
  const alignedMismatch = numberOrNull(parity?.bestAlignedMismatchRatio ?? reconciliation?.alignedMismatchRatio ?? parity?.mismatchRatio);
  const signals = {
    policyDecision: policy?.decision ?? '',
    reconciliationDecision: reconciliation?.nextExperiment ?? '',
    shellDecision: shell?.messageShellDecision ?? shell?.decision ?? '',
    shellDeltas: shell?.deltas ?? {},
    tableBudgetDecision: tableBudget?.decision ?? tableBudget?.widthDecision ?? '',
    intrinsicDecision: intrinsic?.intrinsicDecision ?? intrinsic?.model?.decision ?? '',
    textWidthDecision: fontGlyph?.textWidthModel?.decision ?? '',
    tableWidthDelta: numberOrNull(reconciliation?.signals?.tableWidthDelta ?? tableBudget?.tableDelta ?? intrinsic?.deltas?.tableWidthDelta),
    tableTextResidual: numberOrNull(reconciliation?.signals?.tableTextResidual ?? tableBudget?.textResidual ?? fontGlyph?.textWidthModel?.tableTextResidual),
    tableScrollWidthDelta: numberOrNull(reconciliation?.signals?.tableScrollWidthDelta ?? tableBudget?.scrollDelta),
    textWidthTableDelta: numberOrNull(fontGlyph?.textWidthModel?.tableTextDelta),
    tableElementDelta: numberOrNull(fontGlyph?.textWidthModel?.tableElementDelta),
    fontFamilyDiffers: evidenceIncludes(fontGlyph, 'font-family differs') || evidenceIncludes(tableBudget, 'font availability differs'),
    triedCandidates: summarizeTriedCandidates(fixtureId, candidateByName),
    rowPaintSourceDecision: rowPaintSource?.decision ?? '',
    rowRasterDecision: rowRaster?.decision ?? '',
    backgroundSourceDecision: backgroundSource?.decision ?? '',
    backgroundAssetDecision: backgroundAssets?.decision ?? '',
    worstRowMismatchPct: rowRaster?.worstRow?.mismatchPct ?? rowRaster?.worstRowMismatchPct ?? '',
    backgroundAssetSummary: backgroundAssets?.sourceSummary ?? backgroundAssets?.source ?? '',
  };
  const classification = classifyFixture(fixtureId, alignedMismatch, signals);
  return {
    fixtureId,
    priority: alignedMismatch > 0.1 ? 'P0' : alignedMismatch > 0.06 ? 'P1' : 'P2',
    alignedMismatchRatio: alignedMismatch,
    alignedMismatchPct: pct(alignedMismatch),
    ...classification,
    signals,
  };
}

function classifyFixture(fixtureId, alignedMismatch, signals) {
  if (!(alignedMismatch > 0.1)) {
    return {
      strategy: 'KEEP_DEFAULT',
      nextExperiment: 'none',
      blockers: [],
      evidence: ['aligned mismatch is below the current high-mismatch threshold'],
      commands: [],
      promotionRule: 'Keep default renderer unless a broader gate later proves this fixture regressed.',
    };
  }
  if (
    fixtureId === 'official-roll20-AW2E' ||
    (signals.reconciliationDecision === 'CHAT_MESSAGE_CONTENT_WIDTH' &&
      Math.abs(signals.tableTextResidual ?? 999) <= 2 &&
      Math.abs(signals.tableWidthDelta ?? 0) >= 8)
  ) {
    return {
      strategy: 'AW2E_TEMPLATE_SCOPED_TEXT_METRICS',
      nextExperiment: 'message-width plus exact text-metric allocation, scoped to .sheet-rolltemplate-aw',
      blockers: [
        'same-template mismatch remains high after current AW2E candidates',
        'combined width/font candidate improved raw crop but did not beat default after alignment',
        ...failedCandidateBlockers(signals.triedCandidates),
        ...sourceAssetBlockers(signals),
      ],
      evidence: [
        `table width delta ${fmtPx(signals.tableWidthDelta)} with text residual ${fmtPx(signals.tableTextResidual)}`,
        `message/content shell delta ${fmtPx(signals.shellDeltas?.messageWidthDelta)} / ${fmtPx(signals.shellDeltas?.contentWidthDelta)}`,
        'text metrics explain AW2E table width, so broad typography and global shell CSS are too risky',
        ...candidateEvidence(signals.triedCandidates),
        ...sourceAssetEvidence(signals),
      ],
      commands: [
        'corepack pnpm run plan:roll20-chat-assets -- reports\\roll20-actual-compare\\2026-06-18-state-map-v1',
        'corepack pnpm run diagnose:roll20-chat-background-raster -- reports\\roll20-actual-compare\\2026-06-18-state-map-v1',
        'corepack pnpm run diagnose:roll20-chat-background-assets -- reports\\roll20-actual-compare\\2026-06-18-state-map-v1',
        'corepack pnpm run diagnose:roll20-chat-candidates -- reports\\roll20-actual-compare\\2026-06-18-state-map-v1',
      ],
      promotionRule: 'Only promote an AW2E-scoped rule after it beats default on AW2E without regressing Les/YSHY and style proof matches actual Roll20.',
    };
  }
  if (
    fixtureId === 'yshy-commission-1bu' ||
    signals.textWidthDecision === 'TEXT_WIDTH_OVERCONSTRAINED_BY_LAYOUT' ||
    Math.abs(signals.tableScrollWidthDelta ?? 0) >= 8
  ) {
    return {
      strategy: 'COC_TABLE_INTRINSIC_AND_SANITIZE_MODEL',
      nextExperiment: 'CoC/YSHY-scoped table intrinsic sizing, font availability, and sanitize-order model',
      blockers: [
        'YSHY table width delta conflicts with AW2E message-width direction',
        'current transform, broad font, and paint candidates are rejected or fixture-local',
        ...failedCandidateBlockers(signals.triedCandidates),
        ...sourceAssetBlockers(signals),
      ],
      evidence: [
        `table width delta ${fmtPx(signals.tableWidthDelta)} and scroll delta ${fmtPx(signals.tableScrollWidthDelta)}`,
        `text residual ${fmtPx(signals.tableTextResidual)} shows text metrics alone do not explain layout`,
        signals.fontFamilyDiffers ? 'font-family/font availability differs in actual Roll20 evidence' : 'font sidecar does not yet prove a clean font-family match',
        ...candidateEvidence(signals.triedCandidates),
        ...sourceAssetEvidence(signals),
      ],
      commands: [
        'corepack pnpm run plan:roll20-chat-assets -- reports\\roll20-actual-compare\\2026-06-18-state-map-v1',
        'corepack pnpm run diagnose:roll20-chat-background-raster -- reports\\roll20-actual-compare\\2026-06-18-state-map-v1',
        'corepack pnpm run diagnose:roll20-chat-background-assets -- reports\\roll20-actual-compare\\2026-06-18-state-map-v1',
        'corepack pnpm run diagnose:roll20-chat-font-intrinsic -- reports\\roll20-actual-compare\\2026-06-18-state-map-v1',
      ],
      promotionRule: 'Only promote a CoC/YSHY-scoped rule after scrollWidth/clientWidth, font availability, and style proof agree; do not use transform/scale as production behavior.',
    };
  }
  return {
    strategy: 'NEW_NARROW_MODEL_REQUIRED',
    nextExperiment: 'new fixture/template-specific model',
    blockers: ['current diagnostics do not identify a production-safe renderer axis'],
    evidence: ['no safe current candidate explains same-template actual Roll20 pixels'],
    commands: ['corepack pnpm run diagnose:roll20-chat-refresh -- reports\\roll20-actual-compare\\2026-06-18-state-map-v1'],
    promotionRule: 'Keep production renderer held until a same-template candidate beats default with style proof.',
  };
}

function sourceAssetBlockers(signals) {
  const blockers = [];
  if (signals.backgroundSourceDecision === 'BACKGROUND_DECLARATION_MATCHES_BUT_RASTER_DIFFERS') {
    blockers.push('background declarations match but rendered raster differs from actual Roll20');
  }
  if (signals.backgroundAssetDecision === 'ASSET_BYTES_MATCH_BUT_SOURCE_PLACEHOLDER') {
    blockers.push('background asset bytes match a Roll20 placeholder/removed image, so original-sheet parity needs asset preservation before CSS promotion');
  }
  if (signals.rowRasterDecision === 'ROW_LUMA_RASTER_MODEL_REQUIRED') {
    blockers.push(`row raster/luma mismatch remains (${signals.worstRowMismatchPct || 'unknown worst row'})`);
  }
  return blockers;
}

function sourceAssetEvidence(signals) {
  const evidence = [];
  if (signals.backgroundSourceDecision) evidence.push(`background source ${signals.backgroundSourceDecision}`);
  if (signals.backgroundAssetDecision) evidence.push(`background asset ${signals.backgroundAssetDecision}`);
  if (signals.rowRasterDecision) evidence.push(`row raster ${signals.rowRasterDecision}`);
  return evidence;
}

function renderMarkdown(report) {
  const lines = [
    '# Roll20 Chat Targeted Renderer Plan',
    '',
    `Generated: ${report.generatedAt}`,
    `Run: \`${report.runDir}\``,
    `Production renderer action: **${report.productionRendererAction}**`,
    '',
    'Scope: diagnostic-only. This plan does not enable product CSS or claim Roll20 visual parity.',
    '',
    '| Fixture | Priority | Strategy | Aligned mismatch | Next experiment | Promotion rule |',
    '| --- | --- | --- | ---: | --- | --- |',
  ];
  for (const fixture of report.fixtures) {
    lines.push(`| \`${fixture.fixtureId}\` | ${fixture.priority} | ${fixture.strategy} | ${fixture.alignedMismatchPct} | ${fixture.nextExperiment} | ${fixture.promotionRule} |`);
  }
  lines.push('', '## Blockers', '');
  if (report.blockers.length) {
    for (const blocker of report.blockers) lines.push(`- ${blocker}`);
  } else {
    lines.push('- No blocking renderer contradictions found by this plan.');
  }
  for (const fixture of report.fixtures) {
    lines.push('', `## ${fixture.fixtureId}`, '');
    lines.push(`- Evidence: ${fixture.evidence.join('; ') || 'none'}`);
    lines.push(`- Blockers: ${fixture.blockers.join('; ') || 'none'}`);
    if (fixture.signals.triedCandidates?.length) {
      lines.push('- Tried candidate evidence:');
      for (const candidate of fixture.signals.triedCandidates) {
        lines.push(`  - \`${candidate.name}\`: ${candidate.risk}, ${candidate.fixtureKey} delta ${fmtSignedPct(candidate.deltaPct)}`);
      }
    }
    if (fixture.commands.length) {
      lines.push('- Next commands:');
      for (const command of fixture.commands) lines.push(`  - \`${command}\``);
    }
  }
  return `${lines.join('\n')}\n`;
}

function collectFixtureIds(reports) {
  const ids = new Set();
  for (const report of Object.values(reports)) {
    for (const fixture of report?.fixtures ?? []) {
      if (fixture.fixtureId) ids.add(fixture.fixtureId);
    }
  }
  return [...ids].sort();
}

function findFixture(fixtures, fixtureId) {
  return (fixtures ?? []).find((fixture) => fixture.fixtureId === fixtureId) ?? null;
}

async function readOptionalJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

function evidenceIncludes(reportFixture, text) {
  return (reportFixture?.evidence ?? []).some((item) => String(item).toLowerCase().includes(text.toLowerCase()));
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function pct(value) {
  return typeof value === 'number' && Number.isFinite(value) ? `${Number((value * 100).toFixed(2))}%` : '';
}

function fmtPx(value) {
  return typeof value === 'number' && Number.isFinite(value) ? `${value >= 0 ? '+' : ''}${Number(value.toFixed(3))}px` : 'n/a';
}

function countBy(values) {
  const out = {};
  for (const value of values) out[value] = (out[value] ?? 0) + 1;
  return out;
}

function summarizeTriedCandidates(fixtureId, candidateByName) {
  const fixtureKey = fixtureKeyForId(fixtureId);
  const candidateNames = fixtureId === 'official-roll20-AW2E'
    ? ['aw2e-text-metrics', 'aw2e-font-size-only', 'aw2e-message-width-font-size']
    : fixtureId === 'yshy-commission-1bu'
      ? ['yshy-sanitize-typography', 'coc-table-intrinsic-clamp', 'paint-dim-background']
      : [];
  return candidateNames
    .map((name) => {
      const candidate = candidateByName.get(name);
      if (!candidate) return null;
      return {
        name,
        fixtureKey,
        risk: candidate.promotionRisk ?? candidate.status ?? 'unknown',
        deltaPct: numberOrNull(candidate.fixtureAlignedDeltaPct?.[fixtureKey]),
        regressedFixtures: numberOrNull(candidate.regressedFixtures) ?? 0,
      };
    })
    .filter(Boolean);
}

function fixtureKeyForId(fixtureId) {
  if (fixtureId === 'official-roll20-AW2E') return 'aw2e';
  if (fixtureId === 'official-roll20-Les-Oublies') return 'lesOublies';
  if (fixtureId === 'yshy-commission-1bu') return 'yshy';
  return fixtureId;
}

function failedCandidateBlockers(candidates) {
  return (candidates ?? [])
    .filter((candidate) => candidate.risk !== 'no-meaningful-gain' || Math.abs(candidate.deltaPct ?? 0) < 0.5)
    .map((candidate) => `${candidate.name} is already tried and not promotable (${candidate.risk}, delta ${fmtSignedPct(candidate.deltaPct)})`);
}

function candidateEvidence(candidates) {
  return (candidates ?? []).map((candidate) => `${candidate.name} ${candidate.risk} with ${candidate.fixtureKey} delta ${fmtSignedPct(candidate.deltaPct)}`);
}

function fmtSignedPct(value) {
  return typeof value === 'number' && Number.isFinite(value) ? `${value > 0 ? '+' : ''}${value}%` : 'n/a';
}

function selfTest() {
  const aw2e = classifyFixture('official-roll20-AW2E', 0.18, {
    reconciliationDecision: 'CHAT_MESSAGE_CONTENT_WIDTH',
    tableTextResidual: 0.148,
    tableWidthDelta: 15.75,
    shellDeltas: { messageWidthDelta: 12, contentWidthDelta: 12 },
  });
  assert.equal(aw2e.strategy, 'AW2E_TEMPLATE_SCOPED_TEXT_METRICS');
  const yshy = classifyFixture('yshy-commission-1bu', 0.2068, {
    textWidthDecision: 'TEXT_WIDTH_OVERCONSTRAINED_BY_LAYOUT',
    tableScrollWidthDelta: -25,
    tableTextResidual: 30.415,
    tableWidthDelta: -24.531,
  });
  assert.equal(yshy.strategy, 'COC_TABLE_INTRINSIC_AND_SANITIZE_MODEL');
  const les = classifyFixture('official-roll20-Les-Oublies', 0.0634, {});
  assert.equal(les.strategy, 'KEEP_DEFAULT');
  console.log('roll20_chat_targeted_renderer_plan self-test PASS');
}
