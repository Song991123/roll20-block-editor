#!/usr/bin/env node
/**
 * Build the next Roll20 chat renderer work plan from current actual evidence.
 *
 * Diagnostic only. This script does not enable product CSS. It prevents a
 * single global ChatPane change from being promoted while fixtures point at
 * different root causes.
 */

import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const SELF_TEST = args.includes('--self-test');
const optionNamesWithValues = new Set([
  '--out-dir',
  '--table-budget-dir',
  '--candidate-comparison-dir',
  '--source-context-dir',
]);
const runDirArg = firstPositionalArg() ?? 'reports/roll20-actual-compare/2026-06-18-state-map-v1';
const runDir = path.resolve(runDirArg);
const rawOutDir = readOption('--out-dir', '');
const outDir = rawOutDir ? path.resolve(rawOutDir) : path.join(runDir, 'chat-targeted-renderer-plan');
const reportOverrides = {
  tableBudget: readOption('--table-budget-dir', ''),
  candidateComparison: readOption('--candidate-comparison-dir', ''),
  sourceContext: readOption('--source-context-dir', ''),
};
const runDirForCommand = runDirArg;

if (SELF_TEST) {
  selfTest();
} else {
  await main();
}

function readOption(name, fallback = '') {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  const value = args[index + 1];
  if (!value || value.startsWith('--')) return fallback;
  return value;
}

function firstPositionalArg() {
  return args.find((arg, index) => !arg.startsWith('--') && arg !== '--self-test' && !optionNamesWithValues.has(args[index - 1]));
}

async function main() {
  await resolveImplicitReportOverrides();
  const reports = {
    parity: await readOptionalJson(path.join(runDir, 'chat-parity-diagnostics', 'chat-parity-diagnostics-results.json')),
    reconciliation: await readOptionalJson(path.join(runDir, 'chat-width-reconciliation', 'chat-width-reconciliation-results.json')),
    shell: await readOptionalJson(path.join(runDir, 'chat-message-shell-model', 'chat-message-shell-model-results.json')),
    tableBudget: await readReportJson('chat-table-width-budget', 'chat-table-width-budget-results.json', reportOverrides.tableBudget),
    intrinsic: await readOptionalJson(path.join(runDir, 'chat-intrinsic-width-model', 'chat-intrinsic-width-model-results.json')),
    fontGlyph: await readOptionalJson(path.join(runDir, 'chat-font-glyph-model', 'chat-font-glyph-model-results.json')),
    rowPaintSource: await readOptionalJson(path.join(runDir, 'chat-row-paint-source-probe', 'chat-row-paint-source-probe-results.json')),
    rowRaster: await readOptionalJson(path.join(runDir, 'chat-row-raster-probe', 'chat-row-raster-probe-results.json')),
    backgroundSource: await readOptionalJson(path.join(runDir, 'chat-background-source-probe', 'chat-background-source-probe-results.json')),
    backgroundAssets: await readOptionalJson(path.join(runDir, 'chat-background-asset-probe', 'chat-background-asset-probe-results.json')),
    policy: await readOptionalJson(path.join(runDir, 'chat-renderer-policy', 'chat-renderer-policy-results.json')),
    candidates: await readReportJson('chat-candidate-comparison', 'chat-candidate-comparison-results.json', reportOverrides.candidateComparison),
    styleProof: await readOptionalJson(path.join(runDir, 'chat-candidate-style-proof', 'chat-candidate-style-proof-results.json')),
    sourceContext: await readReportJson('chat-source-context-probe', 'chat-source-context-probe-results.json', reportOverrides.sourceContext),
  };
  const fixtureIds = collectFixtureIds(reports);
  const fixtures = fixtureIds.map((fixtureId) => buildFixturePlan(fixtureId, reports));
  const blockers = fixtures.flatMap((fixture) => fixture.blockers.map((item) => `${fixture.fixtureId}: ${item}`));
  const report = {
    generatedAt: new Date().toISOString(),
    runDir: runDirArg,
    reportOverrides: normalizeReportOverrides(reportOverrides),
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

async function resolveImplicitReportOverrides() {
  if (reportOverrides.sourceContext) return;
  const defaultSourceContext = await readOptionalJson(path.join(runDir, 'chat-source-context-probe', 'chat-source-context-probe-results.json'));
  if (sourceContextHasActionableEvidence(defaultSourceContext)) return;
  reportOverrides.sourceContext = await findLatestFallbackReportDir(
    ['chat-source-context-probe', 'chat-source-context'],
    'chat-source-context-probe-results.json',
    sourceContextHasActionableEvidence,
  );
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
  const rowRasterSignals = summarizeRowRaster(rowRaster);
  const backgroundSource = findFixture(reports.backgroundSource?.fixtures, fixtureId);
  const backgroundAssets = findFixture(reports.backgroundAssets?.fixtures, fixtureId);
  const policy = findFixture(reports.policy?.fixtures, fixtureId);
  const sourceContext = findFixture(reports.sourceContext?.fixtures, fixtureId);
  const candidateByName = new Map((reports.candidates?.candidates ?? []).map((candidate) => [candidate.name, candidate]));
  const alignedMismatch = numberOrNull(parity?.bestAlignedMismatchRatio ?? reconciliation?.alignedMismatchRatio ?? parity?.mismatchRatio);
  const signals = {
    policyDecision: policy?.decision ?? '',
    reconciliationDecision: reconciliation?.nextExperiment ?? '',
    shellDecision: shell?.messageShellDecision ?? shell?.decision ?? '',
    shellDeltas: shell?.deltas ?? {},
    tableBudgetDecision: tableBudget?.budgetDecision ?? tableBudget?.decision ?? tableBudget?.widthDecision ?? '',
    intrinsicDecision: intrinsic?.intrinsicDecision ?? intrinsic?.model?.decision ?? '',
    textWidthDecision: fontGlyph?.textWidthModel?.decision ?? '',
    tableWidthDelta: numberOrNull(reconciliation?.signals?.tableWidthDelta ?? tableBudget?.tableWidthDelta ?? tableBudget?.tableDelta ?? intrinsic?.deltas?.tableWidthDelta),
    tableTextResidual: numberOrNull(reconciliation?.signals?.tableTextResidual ?? tableBudget?.textResidual ?? fontGlyph?.textWidthModel?.tableTextResidual),
    tableScrollWidthDelta: numberOrNull(reconciliation?.signals?.tableScrollWidthDelta ?? tableBudget?.scrollDelta),
    textWidthTableDelta: numberOrNull(fontGlyph?.textWidthModel?.tableTextDelta),
    tableElementDelta: numberOrNull(fontGlyph?.textWidthModel?.tableElementDelta),
    fontFamilyDiffers: evidenceIncludes(fontGlyph, 'font-family differs') || evidenceIncludes(tableBudget, 'font availability differs'),
    triedCandidates: summarizeTriedCandidates(fixtureId, candidateByName),
    rowPaintSourceDecision: rowPaintSource?.decision ?? '',
    rowRasterDecision: rowRaster?.decision ?? '',
    rowRaster: rowRasterSignals,
    backgroundSourceDecision: backgroundSource?.decision ?? '',
    backgroundAssetDecision: backgroundAssets?.decision ?? '',
    worstRowMismatchPct: rowRasterSignals.worstRowMismatchPct,
    backgroundAssetSummary: backgroundAssets?.sourceSummary ?? backgroundAssets?.source ?? '',
    sourceContextDecision: sourceContext?.decision ?? '',
    sourceContextNextAction: sourceContext?.nextAction ?? '',
    sourceCssClassification: sourceContext?.cssEvidence?.classification ?? '',
    sourceFontDecision: sourceContext?.fontActivation?.decision ?? '',
    sourceChangedFonts: numberOrNull(sourceContext?.fontActivation?.changedFonts?.length) ?? 0,
    sourceTableDecision: sourceContext?.tableContext?.decision ?? '',
    sourceTableWidthDelta: numberOrNull(sourceContext?.tableContext?.tableWidthDelta),
    sourceSanitizeReplayDeltaPct: numberOrNull(sourceContext?.rowPaintSource?.sanitizeReplayDeltaPct),
  };
  const classification = classifyFixture(fixtureId, alignedMismatch, signals);
  const requiredProofChecklist = proofChecklistForStrategy(classification.strategy);
  return {
    fixtureId,
    priority: alignedMismatch > 0.1 ? 'P0' : alignedMismatch > 0.06 ? 'P1' : 'P2',
    alignedMismatchRatio: alignedMismatch,
    alignedMismatchPct: pct(alignedMismatch),
    ...classification,
    requiredProofChecklist,
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
        ...sourceContextBlockers(signals),
      ],
      evidence: [
        `table width delta ${fmtPx(signals.tableWidthDelta)} with text residual ${fmtPx(signals.tableTextResidual)}`,
        `message/content shell delta ${fmtPx(signals.shellDeltas?.messageWidthDelta)} / ${fmtPx(signals.shellDeltas?.contentWidthDelta)}`,
        'text metrics explain AW2E table width, so broad typography and global shell CSS are too risky',
        ...candidateEvidence(signals.triedCandidates),
        ...sourceAssetEvidence(signals),
        ...sourceContextEvidence(signals),
      ],
      commands: [
        command('plan:roll20-asset-relink', '--map-file <local-map.txt>'),
        command('diagnose:roll20-chat-source-context'),
        command('diagnose:roll20-chat-message-shell'),
        command('diagnose:roll20-chat-table-width-budget'),
        command('diagnose:roll20-chat-font-glyph'),
        command('plan:roll20-chat-assets'),
        command('diagnose:roll20-chat-background-raster'),
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
        ...sourceContextBlockers(signals),
      ],
      evidence: [
        `table width delta ${fmtPx(signals.tableWidthDelta)} and scroll delta ${fmtPx(signals.tableScrollWidthDelta)}`,
        `text residual ${fmtPx(signals.tableTextResidual)} shows text metrics alone do not explain layout`,
        signals.fontFamilyDiffers ? 'font-family/font availability differs in actual Roll20 evidence' : 'font sidecar does not yet prove a clean font-family match',
        ...candidateEvidence(signals.triedCandidates),
        ...sourceAssetEvidence(signals),
        ...sourceContextEvidence(signals),
      ],
      commands: [
        command('plan:roll20-asset-relink', '--map-file <local-map.txt>'),
        command('diagnose:roll20-chat-source-context'),
        command('diagnose:roll20-chat-table-intrinsic-probe'),
        command('diagnose:roll20-chat-overflow-crop'),
        command('diagnose:roll20-chat-intrinsic-width'),
        command('diagnose:roll20-chat-font-glyph'),
        command('diagnose:roll20-chat-font-intrinsic'),
        command('plan:roll20-chat-assets'),
      ],
      promotionRule: 'Only promote a CoC/YSHY-scoped rule after scrollWidth/clientWidth, font availability, and style proof agree; do not use transform/scale as production behavior.',
    };
  }
  return {
    strategy: 'NEW_NARROW_MODEL_REQUIRED',
    nextExperiment: 'new fixture/template-specific model',
    blockers: ['current diagnostics do not identify a production-safe renderer axis'],
    evidence: ['no safe current candidate explains same-template actual Roll20 pixels'],
    commands: [command('diagnose:roll20-chat-refresh')],
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
    blockers.push(`row raster/luma mismatch remains (${formatWorstRow(signals.rowRaster)})`);
  }
  return blockers;
}

function sourceAssetEvidence(signals) {
  const evidence = [];
  if (signals.backgroundSourceDecision) evidence.push(`background source ${signals.backgroundSourceDecision}`);
  if (signals.backgroundAssetDecision) evidence.push(`background asset ${signals.backgroundAssetDecision}`);
  if (signals.rowRasterDecision) evidence.push(`row raster ${signals.rowRasterDecision}: ${formatWorstRow(signals.rowRaster)}`);
  return evidence;
}

function sourceContextBlockers(signals) {
  const decision = signals.sourceContextDecision;
  if (!decision) return ['source-context probe evidence is missing for this high-mismatch fixture'];
  if (decision === 'SOURCE_CONTEXT_SECONDARY') return [];
  if (decision === 'MISSING_EVIDENCE') return ['source-context probe is missing required Roll20/local DOM or style evidence'];
  return [`source-context gate requires ${decision} before renderer CSS review`];
}

function sourceContextEvidence(signals) {
  const evidence = [];
  if (!signals.sourceContextDecision) return evidence;
  evidence.push(`source context ${signals.sourceContextDecision}`);
  if (signals.sourceCssClassification) evidence.push(`actual chat CSS ${signals.sourceCssClassification}`);
  if (signals.sourceFontDecision) evidence.push(`font ${signals.sourceFontDecision} changedFonts=${signals.sourceChangedFonts}`);
  if (signals.sourceTableDecision) evidence.push(`table ${signals.sourceTableDecision} widthDelta=${fmtPx(signals.sourceTableWidthDelta)}`);
  if (typeof signals.sourceSanitizeReplayDeltaPct === 'number') evidence.push(`sanitize replay delta ${fmtSignedPct(signals.sourceSanitizeReplayDeltaPct)}`);
  if (signals.sourceContextNextAction) evidence.push(`source next ${signals.sourceContextNextAction}`);
  return evidence;
}

function summarizeRowRaster(rowRaster) {
  const worst = rowRaster?.worstRows?.[0] ?? null;
  return {
    rowWeightedMismatchPct: rowRaster?.summary?.rowWeightedMismatchPct ?? '',
    maxRowMismatchPct: rowRaster?.summary?.maxRowMismatchPct ?? worst?.mismatchPct ?? '',
    worstRowIndex: worst?.index ?? null,
    worstRowMismatchPct: worst?.mismatchPct ?? rowRaster?.summary?.maxRowMismatchPct ?? '',
    worstRowLumaDelta: numberOrNull(worst?.avgSignedLumaDelta),
    worstRowBrightMismatchSharePct: worst?.brightMismatchSharePct ?? '',
    worstRowDarkMismatchSharePct: worst?.darkMismatchSharePct ?? '',
  };
}

function formatWorstRow(rowRaster) {
  if (!rowRaster) return 'unknown worst row';
  const parts = [];
  if (rowRaster.rowWeightedMismatchPct) parts.push(`weighted ${rowRaster.rowWeightedMismatchPct}`);
  if (rowRaster.worstRowIndex != null || rowRaster.worstRowMismatchPct) {
    parts.push(`worst row ${rowRaster.worstRowIndex ?? 'n/a'} ${rowRaster.worstRowMismatchPct || 'n/a'}`);
  }
  if (typeof rowRaster.worstRowLumaDelta === 'number') parts.push(`luma ${fmtSigned(rowRaster.worstRowLumaDelta)}`);
  if (rowRaster.worstRowBrightMismatchSharePct) parts.push(`bright ${rowRaster.worstRowBrightMismatchSharePct}`);
  if (rowRaster.worstRowDarkMismatchSharePct) parts.push(`dark ${rowRaster.worstRowDarkMismatchSharePct}`);
  return parts.length ? parts.join(', ') : 'unknown worst row';
}

function proofChecklistForStrategy(strategy) {
  if (strategy === 'AW2E_TEMPLATE_SCOPED_TEXT_METRICS') {
    return [
      'asset-relink-or-explicit-placeholder-acceptance',
      'style-proof:.sheet-rolltemplate-aw',
      'message-content-width-sidecar',
      'exact-text-measurement-sidecar',
      'no-les-yshy-regression',
      'row-raster-and-background-nonregression',
    ];
  }
  if (strategy === 'COC_TABLE_INTRINSIC_AND_SANITIZE_MODEL') {
    return [
      'asset-relink-or-explicit-placeholder-acceptance',
      'style-proof:.sheet-rolltemplate-coc',
      'scrollwidth-clientwidth-table-intrinsic-sidecar',
      'font-face-rule-order-sanitize-source-context',
      'no-aw2e-les-regression',
      'row-raster-and-background-nonregression',
    ];
  }
  if (strategy === 'NEW_NARROW_MODEL_REQUIRED') {
    return [
      'template-scope-identified',
      'actual-roll20-style-proof',
      'same-template-pixel-gain',
      'cross-fixture-nonregression',
    ];
  }
  return [];
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
    '| Fixture | Priority | Strategy | Aligned mismatch | Next experiment | Proof checklist | Promotion rule |',
    '| --- | --- | --- | ---: | --- | --- | --- |',
  ];
  for (const fixture of report.fixtures) {
    lines.push(`| \`${fixture.fixtureId}\` | ${fixture.priority} | ${fixture.strategy} | ${fixture.alignedMismatchPct} | ${fixture.nextExperiment} | ${fixture.requiredProofChecklist.join('<br>') || 'none'} | ${fixture.promotionRule} |`);
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
    lines.push(`- Source context: ${fixture.signals.sourceContextDecision || 'missing'} / ${fixture.signals.sourceContextNextAction || 'no next action'}`);
    lines.push(`- Required proof before renderer review: ${fixture.requiredProofChecklist.join('; ') || 'none'}`);
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

async function readReportJson(defaultDirName, reportFileName, overrideDir = '') {
  const file = overrideDir
    ? path.join(path.resolve(overrideDir), reportFileName)
    : path.join(runDir, defaultDirName, reportFileName);
  if (overrideDir && !(await fileExists(file))) {
    throw new Error(`Missing override report for ${defaultDirName}: ${file}`);
  }
  return readOptionalJson(file);
}

async function findLatestFallbackReportDir(prefixes, reportFileName, predicate = null) {
  const root = path.resolve('..', '_tmp_codex_smoke');
  let entries = [];
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return '';
  }

  const normalizedPrefixes = Array.isArray(prefixes) ? prefixes : [prefixes];
  const candidates = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (!normalizedPrefixes.some((prefix) => entry.name.startsWith(`${prefix}-`))) continue;
    const dir = path.join(root, entry.name);
    const reportFile = path.join(dir, reportFileName);
    if (!(await fileExists(reportFile))) continue;
    const report = await readOptionalJson(reportFile);
    if (path.resolve(report?.runDir ?? '') !== runDir) continue;
    if (predicate && !predicate(report)) continue;
    let mtimeMs = 0;
    try {
      mtimeMs = (await stat(reportFile)).mtimeMs;
    } catch {
      mtimeMs = 0;
    }
    candidates.push({ dir, mtimeMs });
  }

  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs || b.dir.localeCompare(a.dir));
  return candidates[0]?.dir ?? '';
}

async function fileExists(file) {
  try {
    await readFile(file, 'utf8');
    return true;
  } catch {
    return false;
  }
}

function sourceContextHasActionableEvidence(report) {
  return (report?.fixtures ?? []).some((fixture) => {
    const decision = fixture?.decision ?? '';
    return decision && !['MISSING_EVIDENCE', 'SOURCE_CONTEXT_SECONDARY'].includes(decision);
  });
}

function normalizeReportOverrides(overrides) {
  return Object.fromEntries(
    Object.entries(overrides)
      .filter(([, value]) => Boolean(value))
      .map(([key, value]) => [key, path.resolve(value)]),
  );
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
    ? [
      'aw2e-text-metrics',
      'aw2e-font-size-only',
      'aw2e-message-width-font-size',
      'aw2e-message-width-text-metrics',
      'aw2e-message-source-context',
      'aw2e-message-cell-font-context',
      'aw2e-message-cell-wrap-context',
    ]
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

function fmtSigned(value) {
  return typeof value === 'number' && Number.isFinite(value) ? `${value > 0 ? '+' : ''}${value}` : 'n/a';
}

function command(scriptName, suffix = '') {
  return `corepack pnpm run ${scriptName} -- ${quoteCommandArg(runDirForCommand)}${suffix ? ` ${suffix}` : ''}`;
}

function quoteCommandArg(value) {
  return /\s/.test(value) ? `"${value.replaceAll('"', '\\"')}"` : value;
}

function selfTest() {
  const aw2e = classifyFixture('official-roll20-AW2E', 0.18, {
    reconciliationDecision: 'CHAT_MESSAGE_CONTENT_WIDTH',
    tableTextResidual: 0.148,
    tableWidthDelta: 15.75,
    shellDeltas: { messageWidthDelta: 12, contentWidthDelta: 12 },
    rowRasterDecision: 'ROW_LUMA_RASTER_MODEL_REQUIRED',
    rowRaster: {
      rowWeightedMismatchPct: '17.93%',
      worstRowIndex: 1,
      worstRowMismatchPct: '26.28%',
      worstRowLumaDelta: -66.819,
      worstRowBrightMismatchSharePct: '91.19%',
      worstRowDarkMismatchSharePct: '36.22%',
    },
    sourceContextDecision: 'RULE_ORDER_FONT_FACE_TABLE_CONTEXT_REQUIRED',
    sourceCssClassification: 'EXPECTED_RULE_PRESENT',
    sourceFontDecision: 'FONT_FACE_ACTIVATION_DIFFERS',
    sourceChangedFonts: 0,
    sourceTableDecision: 'TABLE_INTRINSIC_SOURCE_CONTEXT_REQUIRED',
    sourceTableWidthDelta: 15.75,
  });
  assert.equal(aw2e.strategy, 'AW2E_TEMPLATE_SCOPED_TEXT_METRICS');
  assert(proofChecklistForStrategy(aw2e.strategy).includes('style-proof:.sheet-rolltemplate-aw'));
  assert(aw2e.blockers.some((blocker) => blocker.includes('worst row 1 26.28%')));
  assert(aw2e.blockers.some((blocker) => blocker.includes('RULE_ORDER_FONT_FACE_TABLE_CONTEXT_REQUIRED')));
  assert(aw2e.evidence.some((item) => item.includes('weighted 17.93%')));
  assert(aw2e.evidence.some((item) => item.includes('actual chat CSS EXPECTED_RULE_PRESENT')));
  const yshy = classifyFixture('yshy-commission-1bu', 0.2068, {
    textWidthDecision: 'TEXT_WIDTH_OVERCONSTRAINED_BY_LAYOUT',
    tableScrollWidthDelta: -25,
    tableTextResidual: 30.415,
    tableWidthDelta: -24.531,
    sourceContextDecision: 'SANITIZE_REPLAY_REJECTED_SOURCE_MODEL_REQUIRED',
    sourceFontDecision: 'FONT_FACE_ACTIVATION_DIFFERS',
    sourceChangedFonts: 6,
    sourceTableDecision: 'TABLE_INTRINSIC_SOURCE_CONTEXT_REQUIRED',
    sourceTableWidthDelta: -24.531,
    sourceSanitizeReplayDeltaPct: 14.95,
  });
  assert.equal(yshy.strategy, 'COC_TABLE_INTRINSIC_AND_SANITIZE_MODEL');
  assert(proofChecklistForStrategy(yshy.strategy).includes('font-face-rule-order-sanitize-source-context'));
  assert(yshy.blockers.some((blocker) => blocker.includes('SANITIZE_REPLAY_REJECTED_SOURCE_MODEL_REQUIRED')));
  const les = classifyFixture('official-roll20-Les-Oublies', 0.0634, {});
  assert.equal(les.strategy, 'KEEP_DEFAULT');
  const fallback = classifyFixture('unknown-fixture', 0.5, {});
  assert.equal(fallback.commands[0], command('diagnose:roll20-chat-refresh'));
  assert.equal(quoteCommandArg('reports/run with space'), '"reports/run with space"');
  assert.equal(quoteCommandArg('reports/plain-run'), 'reports/plain-run');
  console.log('roll20_chat_targeted_renderer_plan self-test PASS');
}
