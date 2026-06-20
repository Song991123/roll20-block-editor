#!/usr/bin/env node
/**
 * Classify whether current Roll20 chat background mismatch is explained by
 * already-tested raster-only models: background-size/scale, row luma shift,
 * or table width/crop context.
 *
 * Diagnostic only. It reads existing ignored reports and emits a routing report;
 * it does not render screenshots, add CSS, or prove visual parity.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2).filter((arg) => arg !== '--' && !arg.startsWith('--'));
const runDirArg = args[0] ?? 'reports/roll20-actual-compare/2026-06-18-state-map-v1';
const runDir = path.resolve(runDirArg);
const outDir = path.join(runDir, 'chat-background-raster-model-probe');

async function main() {
  const backgroundSource = await readOptionalJson(path.join(runDir, 'chat-background-source-probe', 'chat-background-source-probe-results.json'));
  const compositing = await readOptionalJson(path.join(runDir, 'chat-row-compositing-probe', 'chat-row-compositing-probe-results.json'));
  const rowRaster = await readOptionalJson(path.join(runDir, 'chat-row-raster-probe', 'chat-row-raster-probe-results.json'));
  const rowRasterCandidates = await readOptionalJson(path.join(runDir, 'chat-row-raster-candidate-comparison', 'chat-row-raster-candidate-comparison-results.json'));
  const widthReconciliation = await readOptionalJson(path.join(runDir, 'chat-width-reconciliation', 'chat-width-reconciliation-results.json'));
  const fixtureIds = collectFixtureIds(backgroundSource, compositing, rowRaster, widthReconciliation);
  const fixtures = fixtureIds.map((fixtureId) => summarizeFixture(fixtureId, {
    backgroundSource,
    compositing,
    rowRaster,
    rowRasterCandidates,
    widthReconciliation,
  }));
  const actionable = fixtures.filter((fixture) => fixture.priority !== 'P2' && fixture.decision !== 'RASTER_MODEL_SECONDARY');
  const report = {
    generatedAt: new Date().toISOString(),
    runDir: runDirArg,
    scope: 'diagnostic-only background raster model routing; no production CSS',
    summary: {
      status: actionable.length ? 'BACKGROUND_RASTER_MODEL_ACTIONABLE' : 'BACKGROUND_RASTER_MODEL_SECONDARY',
      fixtures: fixtures.length,
      actionable: actionable.length,
      decisions: countBy(fixtures.map((fixture) => fixture.decision)),
      productionSafe: false,
    },
    fixtures,
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'chat-background-raster-model-probe-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'chat-background-raster-model-probe-results.md'), renderMarkdown(report), 'utf8');

  console.log(`ROLL20 CHAT BACKGROUND RASTER MODEL PROBE ${report.summary.status}`);
  for (const fixture of fixtures) {
    console.log(`FIXTURE ${fixture.fixtureId} priority=${fixture.priority} decision=${fixture.decision} row=${fixture.rowWeightedMismatchPct || 'n/a'} lumaGain=${signed(fixture.lumaCorrectionGainPct)} bgSize=${fixture.backgroundSizeRisk || 'n/a'} width=${fixture.widthExperiment || 'n/a'} next=${fixture.nextAction}`);
  }
  console.log(`out=${path.relative(process.cwd(), outDir)}`);
}

function summarizeFixture(fixtureId, reports) {
  const backgroundSource = findFixture(reports.backgroundSource?.fixtures, fixtureId);
  const compositing = findFixture(reports.compositing?.fixtures, fixtureId);
  const rowRaster = findFixture(reports.rowRaster?.fixtures, fixtureId);
  const width = findFixture(reports.widthReconciliation?.fixtures, fixtureId);
  const backgroundSize = candidateByName(reports.rowRasterCandidates, 'coc-background-size-actual');
  const yshyBackgroundSize = fixtureId === 'yshy-commission-1bu' ? backgroundSize : null;
  const priority = backgroundSource?.priority ?? rowRaster?.priority ?? compositing?.priority ?? 'P2';
  const decision = decide({
    priority,
    backgroundSourceDecision: backgroundSource?.decision ?? '',
    compositingDecision: compositing?.decision ?? '',
    rowRasterDecision: rowRaster?.decision ?? '',
    lumaCorrectionGainPct: compositing?.summary?.lumaCorrectionGainPct ?? null,
    backgroundSizeRisk: yshyBackgroundSize?.rowRasterRisk ?? '',
    widthExperiment: width?.nextExperiment ?? '',
  });
  return {
    fixtureId,
    priority,
    decision,
    nextAction: nextAction(decision),
    backgroundSourceDecision: backgroundSource?.decision ?? '',
    backgroundStyleDecision: backgroundSource?.backgroundStyleDecision ?? '',
    compositingDecision: compositing?.decision ?? '',
    rowRasterDecision: rowRaster?.decision ?? '',
    rowWeightedMismatchPct: compositing?.summary?.rowWeightedMismatchPct ?? rowRaster?.summary?.rowWeightedMismatchPct ?? '',
    lumaCorrectedMismatchPct: compositing?.summary?.lumaCorrectedMismatchPct ?? '',
    lumaCorrectionGainPct: compositing?.summary?.lumaCorrectionGainPct ?? null,
    flatPaintMismatchSharePct: compositing?.summary?.flatPaintMismatchSharePct ?? '',
    localDarkerMismatchSharePct: compositing?.summary?.localDarkerMismatchSharePct ?? '',
    backgroundSizeRisk: yshyBackgroundSize?.rowRasterRisk ?? '',
    backgroundSizeWeightedDeltaPct: yshyBackgroundSize?.yshyRowWeightedDeltaPct ?? null,
    backgroundSizeWorstDeltaPct: yshyBackgroundSize?.yshyWorstRowDeltaPct ?? null,
    widthExperiment: width?.nextExperiment ?? '',
    tableWidthDelta: width?.tableWidthDelta ?? backgroundSource?.tableWidthDelta ?? null,
    scrollDelta: width?.tableScrollWidthDelta ?? null,
    textResidual: width?.tableTextResidual ?? null,
    evidence: evidenceNotes({ backgroundSource, compositing, rowRaster, yshyBackgroundSize, width }),
  };
}

function decide({ priority, backgroundSourceDecision, compositingDecision, rowRasterDecision, lumaCorrectionGainPct, backgroundSizeRisk, widthExperiment }) {
  if (priority === 'P2') return 'RASTER_MODEL_SECONDARY';
  if (
    backgroundSourceDecision === 'BACKGROUND_DECLARATION_MATCHES_BUT_RASTER_DIFFERS' &&
    backgroundSizeRisk === 'reject-row-raster-regression' &&
    typeof lumaCorrectionGainPct === 'number' &&
    Math.abs(lumaCorrectionGainPct) < 1
  ) {
    return 'SOURCE_IMAGE_OR_BROWSER_PAINT_MODEL_REQUIRED';
  }
  if (backgroundSizeRisk === 'reject-row-raster-regression') return 'BACKGROUND_SIZE_SCALE_REJECTED';
  if (typeof lumaCorrectionGainPct === 'number' && lumaCorrectionGainPct <= -2) return 'ROW_LUMA_MODEL_PROMISING';
  if (/TABLE_SCROLL_INTRINSIC|CROP_OR_PAINT/i.test(widthExperiment)) return 'TABLE_WIDTH_CONTEXT_STILL_PRIMARY';
  if (backgroundSourceDecision === 'BACKGROUND_DECLARATION_MATCHES_BUT_RASTER_DIFFERS' && compositingDecision === 'BACKGROUND_COMPOSITING_MODEL_REQUIRED') {
    return 'SOURCE_IMAGE_OR_BROWSER_PAINT_MODEL_REQUIRED';
  }
  if (backgroundSourceDecision === 'BACKGROUND_DECLARATION_DIFFERS') return 'DECLARATION_DIFF_BEFORE_RASTER_MODEL';
  if (rowRasterDecision === 'ROW_LUMA_RASTER_MODEL_REQUIRED' || compositingDecision === 'COLOR_ASSET_RASTER_MODEL_REQUIRED') return 'COLOR_ASSET_RASTER_MODEL_REQUIRED';
  return 'RASTER_MODEL_SECONDARY';
}

function nextAction(decision) {
  switch (decision) {
    case 'BACKGROUND_SIZE_SCALE_REJECTED':
      return 'do not retry background-size/table-scale as the next fix; it worsens row raster. Compare fetched image/proxy bytes and browser paint output next';
    case 'ROW_LUMA_MODEL_PROMISING':
      return 'inspect Roll20 paint/blend/source conditions before CSS; luma model helps enough to need style proof';
    case 'TABLE_WIDTH_CONTEXT_STILL_PRIMARY':
      return 'finish table width/crop intrinsic model before lower-level background raster work';
    case 'SOURCE_IMAGE_OR_BROWSER_PAINT_MODEL_REQUIRED':
      return 'CSS declarations match and simple raster models are weak; compare image bytes, proxy decode, and browser paint behavior';
    case 'DECLARATION_DIFF_BEFORE_RASTER_MODEL':
      return 'resolve exact background declaration/cascade differences before pixel-tuned raster work';
    case 'COLOR_ASSET_RASTER_MODEL_REQUIRED':
      return 'keep this fixture on color/asset raster investigation; do not reuse YSHY/CoC background candidates';
    default:
      return 'keep background raster model secondary for this fixture';
  }
}

function evidenceNotes({ backgroundSource, compositing, rowRaster, yshyBackgroundSize, width }) {
  const notes = [];
  if (backgroundSource?.decision) notes.push(`background/source ${backgroundSource.decision}; style ${backgroundSource.backgroundStyleDecision || 'n/a'}`);
  if (compositing?.decision) notes.push(`compositing ${compositing.decision}; row ${compositing.summary?.rowWeightedMismatchPct || 'n/a'}; luma-corrected ${compositing.summary?.lumaCorrectedMismatchPct || 'n/a'} (${signed(compositing.summary?.lumaCorrectionGainPct)})`);
  if (rowRaster?.decision) notes.push(`row raster ${rowRaster.decision}; worst ${rowRaster.worstRows?.[0]?.mismatchPct || 'n/a'}`);
  if (yshyBackgroundSize) notes.push(`coc-background-size-actual ${yshyBackgroundSize.rowRasterRisk || 'n/a'}; weighted delta ${signed(yshyBackgroundSize.yshyRowWeightedDeltaPct)}; worst delta ${signed(yshyBackgroundSize.yshyWorstRowDeltaPct)}`);
  if (width?.nextExperiment) notes.push(`width reconciliation ${width.nextExperiment}; table delta ${px(width.tableWidthDelta)}; scroll delta ${px(width.tableScrollWidthDelta)}; residual ${px(width.tableTextResidual)}`);
  return notes;
}

function renderMarkdown(report) {
  const lines = [
    '# Roll20 Chat Background Raster Model Probe',
    '',
    `Generated: ${report.generatedAt}`,
    `Run: \`${report.runDir}\``,
    '',
    'Scope: diagnostic-only. This report routes whether background-size, luma, or width/crop raster models explain current chat mismatch.',
    '',
    '| Fixture | Priority | Decision | Row mismatch | Luma gain | Background-size risk | Width experiment | Table delta | Next |',
    '| --- | --- | --- | ---: | ---: | --- | --- | ---: | --- |',
  ];
  for (const fixture of report.fixtures) {
    lines.push(`| \`${fixture.fixtureId}\` | ${fixture.priority} | ${fixture.decision} | ${fixture.rowWeightedMismatchPct || 'n/a'} | ${signed(fixture.lumaCorrectionGainPct)} | ${fixture.backgroundSizeRisk || 'n/a'} | ${fixture.widthExperiment || 'n/a'} | ${px(fixture.tableWidthDelta)} | ${fixture.nextAction} |`);
  }
  lines.push('', '## Evidence Notes', '');
  for (const fixture of report.fixtures) {
    lines.push(`### ${fixture.fixtureId}`);
    for (const note of fixture.evidence) lines.push(`- ${note}`);
    lines.push('');
  }
  lines.push('## Claim Boundary', '');
  lines.push('- Generated reports and actual Roll20 evidence stay local-only.');
  lines.push('- This does not prove Roll20 visual parity.');
  return `${lines.join('\n')}\n`;
}

function collectFixtureIds(...reports) {
  const ids = new Set();
  for (const report of reports) {
    for (const fixture of report?.fixtures ?? []) {
      const id = fixture.fixtureId ?? fixture.id;
      if (id) ids.add(id);
    }
  }
  return [...ids].sort();
}

function findFixture(fixtures, fixtureId) {
  return (fixtures ?? []).find((fixture) => fixture.fixtureId === fixtureId || fixture.id === fixtureId) ?? null;
}

function candidateByName(report, name) {
  return (report?.candidates ?? []).find((candidate) => candidate.name === name) ?? null;
}

async function readOptionalJson(file) {
  try {
    return JSON.parse((await readFile(file, 'utf8')).replace(/^\uFEFF/, ''));
  } catch {
    return null;
  }
}

function countBy(values) {
  return values.reduce((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

function signed(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '';
  const rounded = Number(value.toFixed(2));
  return `${rounded > 0 ? '+' : ''}${rounded}%`;
}

function px(value) {
  return typeof value === 'number' && Number.isFinite(value) ? `${Number(value.toFixed(3))}px` : 'n/a';
}

await main();
