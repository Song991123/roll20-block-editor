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
import assert from 'node:assert/strict';
import path from 'node:path';

const rawArgs = process.argv.slice(2).filter((arg) => arg !== '--');
const selfTest = rawArgs.includes('--self-test');
const optionNamesWithValues = new Set([
  '--out-dir',
  '--background-source-dir',
  '--row-compositing-dir',
  '--row-raster-dir',
  '--row-raster-candidates-dir',
  '--width-reconciliation-dir',
]);
const args = rawArgs.filter((arg, index) => !arg.startsWith('--') && !optionNamesWithValues.has(rawArgs[index - 1]));
const runDirArg = args[0] ?? 'reports/roll20-actual-compare/2026-06-18-state-map-v1';
const runDir = path.resolve(runDirArg);
const outDir = path.resolve(readOption('--out-dir', path.join(runDir, 'chat-background-raster-model-probe')));
const backgroundSourceDir = path.resolve(readOption('--background-source-dir', path.join(runDir, 'chat-background-source-probe')));
const rowCompositingDir = path.resolve(readOption('--row-compositing-dir', path.join(runDir, 'chat-row-compositing-probe')));
const rowRasterDir = path.resolve(readOption('--row-raster-dir', path.join(runDir, 'chat-row-raster-probe')));
const rowRasterCandidatesDir = path.resolve(readOption('--row-raster-candidates-dir', path.join(runDir, 'chat-row-raster-candidate-comparison')));
const widthReconciliationDir = path.resolve(readOption('--width-reconciliation-dir', path.join(runDir, 'chat-width-reconciliation')));

async function main() {
  const backgroundSource = await readOptionalJson(path.join(backgroundSourceDir, 'chat-background-source-probe-results.json'));
  const compositing = await readOptionalJson(path.join(rowCompositingDir, 'chat-row-compositing-probe-results.json'));
  const rowRaster = await readOptionalJson(path.join(rowRasterDir, 'chat-row-raster-probe-results.json'));
  const rowRasterCandidates = await readOptionalJson(path.join(rowRasterCandidatesDir, 'chat-row-raster-candidate-comparison-results.json'));
  const widthReconciliation = await readOptionalJson(path.join(widthReconciliationDir, 'chat-width-reconciliation-results.json'));
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
    reportOverrides: {
      outDir: rel(outDir),
      backgroundSourceDir: rel(backgroundSourceDir),
      rowCompositingDir: rel(rowCompositingDir),
      rowRasterDir: rel(rowRasterDir),
      rowRasterCandidatesDir: rel(rowRasterCandidatesDir),
      widthReconciliationDir: rel(widthReconciliationDir),
    },
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

function readOption(name, fallback = '') {
  const index = rawArgs.indexOf(name);
  if (index === -1) return fallback;
  const value = rawArgs[index + 1];
  if (!value || value.startsWith('--')) return fallback;
  return value;
}

function summarizeFixture(fixtureId, reports) {
  const backgroundSource = findFixture(reports.backgroundSource?.fixtures, fixtureId);
  const compositing = findFixture(reports.compositing?.fixtures, fixtureId);
  const rowRaster = findFixture(reports.rowRaster?.fixtures, fixtureId);
  const width = findFixture(reports.widthReconciliation?.fixtures, fixtureId);
  const backgroundSize = candidateByName(reports.rowRasterCandidates, 'coc-background-size-actual');
  const yshyBackgroundSize = fixtureId === 'yshy-commission-1bu' ? backgroundSize : null;
  const priority = backgroundSource?.priority ?? rowRaster?.priority ?? compositing?.priority ?? 'P2';
  const compositingSummary = summarizeCompositing(compositing);
  const decision = decide({
    priority,
    backgroundSourceDecision: backgroundSource?.decision ?? '',
    compositingDecision: compositing?.decision ?? '',
    rowRasterDecision: rowRaster?.decision ?? '',
    lumaCorrectionGainPct: compositingSummary.lumaCorrectionGainPct,
    flatPaintMismatchSharePct: compositingSummary.flatPaintMismatchSharePct,
    edgeMismatchSharePct: compositingSummary.edgeMismatchSharePct,
    localDarkerMismatchSharePct: compositingSummary.localDarkerMismatchSharePct,
    chromaMismatchSharePct: compositingSummary.chromaMismatchSharePct,
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
    rowWeightedMismatchPct: compositingSummary.rowWeightedMismatchPct || rowRaster?.summary?.rowWeightedMismatchPct || '',
    lumaCorrectedMismatchPct: compositingSummary.lumaCorrectedMismatchPct,
    lumaCorrectionGainPct: compositingSummary.lumaCorrectionGainPct,
    edgeMismatchSharePct: compositingSummary.edgeMismatchSharePct,
    flatPaintMismatchSharePct: compositingSummary.flatPaintMismatchSharePct,
    localDarkerMismatchSharePct: compositingSummary.localDarkerMismatchSharePct,
    localBrighterMismatchSharePct: compositingSummary.localBrighterMismatchSharePct,
    chromaMismatchSharePct: compositingSummary.chromaMismatchSharePct,
    worstRow: compositingSummary.worstRow,
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

function summarizeCompositing(compositing) {
  const worstRow = (compositing?.worstRows ?? [])[0] ?? null;
  return {
    rowWeightedMismatchPct: compositing?.summary?.rowWeightedMismatchPct ?? '',
    lumaCorrectedMismatchPct: compositing?.summary?.lumaCorrectedMismatchPct ?? '',
    lumaCorrectionGainPct: numberOrNull(compositing?.summary?.lumaCorrectionGainPct),
    edgeMismatchSharePct: compositing?.summary?.edgeMismatchSharePct ?? '',
    flatPaintMismatchSharePct: compositing?.summary?.flatPaintMismatchSharePct ?? '',
    localDarkerMismatchSharePct: compositing?.summary?.localDarkerMismatchSharePct ?? '',
    localBrighterMismatchSharePct: compositing?.summary?.localBrighterMismatchSharePct ?? '',
    chromaMismatchSharePct: compositing?.summary?.chromaMismatchSharePct ?? '',
    worstRow: worstRow
      ? {
          index: worstRow.index,
          decision: worstRow.decision ?? '',
          mismatchPct: worstRow.mismatchPct ?? '',
          lumaCorrectedMismatchPct: worstRow.lumaCorrectedMismatchPct ?? '',
          lumaCorrectionGainPct: numberOrNull(worstRow.lumaCorrectionGainPct),
          edgeMismatchSharePct: worstRow.edgeMismatchSharePct ?? '',
          flatPaintMismatchSharePct: worstRow.flatPaintMismatchSharePct ?? '',
          localDarkerMismatchSharePct: worstRow.localDarkerMismatchSharePct ?? '',
          localBrighterMismatchSharePct: worstRow.localBrighterMismatchSharePct ?? '',
          chromaMismatchSharePct: worstRow.chromaMismatchSharePct ?? '',
        }
      : null,
  };
}

function decide({
  priority,
  backgroundSourceDecision,
  compositingDecision,
  rowRasterDecision,
  lumaCorrectionGainPct,
  flatPaintMismatchSharePct,
  edgeMismatchSharePct,
  localDarkerMismatchSharePct,
  chromaMismatchSharePct,
  backgroundSizeRisk,
  widthExperiment,
}) {
  if (priority === 'P2') return 'RASTER_MODEL_SECONDARY';
  if (backgroundSourceDecision === 'TABLE_WIDTH_CONTEXT_BEFORE_BACKGROUND_CSS') return 'TABLE_WIDTH_CONTEXT_BEFORE_LUMA_MODEL';
  if (
    backgroundSourceDecision === 'BACKGROUND_DECLARATION_MATCHES_BUT_RASTER_DIFFERS' &&
    pctNumber(flatPaintMismatchSharePct) >= 80 &&
    pctNumber(edgeMismatchSharePct) <= 5 &&
    pctNumber(localDarkerMismatchSharePct) >= 55 &&
    pctNumber(chromaMismatchSharePct) >= 35 &&
    typeof lumaCorrectionGainPct === 'number' &&
    Math.abs(lumaCorrectionGainPct) < 1
  ) {
    return 'FLAT_PAINT_SOURCE_OR_BROWSER_COLOR_MODEL_REQUIRED';
  }
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
    case 'FLAT_PAINT_SOURCE_OR_BROWSER_COLOR_MODEL_REQUIRED':
      return 'row mismatch is flat-paint/color dominated, not edge/text; compare source/proxy bytes, browser decode, and Roll20 paint context before CSS';
    case 'BACKGROUND_SIZE_SCALE_REJECTED':
      return 'do not retry background-size/table-scale as the next fix; it worsens row raster. Compare fetched image/proxy bytes and browser paint output next';
    case 'ROW_LUMA_MODEL_PROMISING':
      return 'inspect Roll20 paint/blend/source conditions before CSS; luma model helps enough to need style proof';
    case 'TABLE_WIDTH_CONTEXT_STILL_PRIMARY':
      return 'finish table width/crop intrinsic model before lower-level background raster work';
    case 'TABLE_WIDTH_CONTEXT_BEFORE_LUMA_MODEL':
      return 'resolve table width/crop context before treating luma correction as a renderer model';
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
  const compositingSummary = summarizeCompositing(compositing);
  if (backgroundSource?.decision) notes.push(`background/source ${backgroundSource.decision}; style ${backgroundSource.backgroundStyleDecision || 'n/a'}`);
  if (compositing?.decision) {
    notes.push(`compositing ${compositing.decision}; row ${compositingSummary.rowWeightedMismatchPct || 'n/a'}; luma-corrected ${compositingSummary.lumaCorrectedMismatchPct || 'n/a'} (${signed(compositingSummary.lumaCorrectionGainPct)})`);
    notes.push(`compositing buckets edge ${compositingSummary.edgeMismatchSharePct || 'n/a'}; flat ${compositingSummary.flatPaintMismatchSharePct || 'n/a'}; local darker ${compositingSummary.localDarkerMismatchSharePct || 'n/a'}; local brighter ${compositingSummary.localBrighterMismatchSharePct || 'n/a'}; chroma ${compositingSummary.chromaMismatchSharePct || 'n/a'}`);
    if (compositingSummary.worstRow) {
      notes.push(`worst compositing row ${compositingSummary.worstRow.index}: ${compositingSummary.worstRow.decision || 'n/a'}, mismatch ${compositingSummary.worstRow.mismatchPct || 'n/a'}, luma-corrected ${compositingSummary.worstRow.lumaCorrectedMismatchPct || 'n/a'} (${signed(compositingSummary.worstRow.lumaCorrectionGainPct)}), flat ${compositingSummary.worstRow.flatPaintMismatchSharePct || 'n/a'}, darker ${compositingSummary.worstRow.localDarkerMismatchSharePct || 'n/a'}, chroma ${compositingSummary.worstRow.chromaMismatchSharePct || 'n/a'}`);
    }
  }
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
    '| Fixture | Priority | Decision | Row mismatch | Luma gain | Flat | Darker | Chroma | Worst row | Background-size risk | Width experiment | Table delta | Next |',
    '| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | ---: | --- |',
  ];
  for (const fixture of report.fixtures) {
    const worst = fixture.worstRow ? `row ${fixture.worstRow.index} ${fixture.worstRow.mismatchPct || 'n/a'}` : 'n/a';
    lines.push(`| \`${fixture.fixtureId}\` | ${fixture.priority} | ${fixture.decision} | ${fixture.rowWeightedMismatchPct || 'n/a'} | ${signed(fixture.lumaCorrectionGainPct)} | ${fixture.flatPaintMismatchSharePct || 'n/a'} | ${fixture.localDarkerMismatchSharePct || 'n/a'} | ${fixture.chromaMismatchSharePct || 'n/a'} | ${worst} | ${fixture.backgroundSizeRisk || 'n/a'} | ${fixture.widthExperiment || 'n/a'} | ${px(fixture.tableWidthDelta)} | ${fixture.nextAction} |`);
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

function rel(file) {
  return path.relative(process.cwd(), file);
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

function pctNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value <= 1 ? value * 100 : value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value.replace('%', '').trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function px(value) {
  return typeof value === 'number' && Number.isFinite(value) ? `${Number(value.toFixed(3))}px` : 'n/a';
}

async function runSelfTest() {
  assert.equal(
    decide({
      priority: 'P0',
      backgroundSourceDecision: 'BACKGROUND_DECLARATION_MATCHES_BUT_RASTER_DIFFERS',
      compositingDecision: 'LOCAL_BACKGROUND_TOO_DARK',
      rowRasterDecision: 'ROW_LUMA_RASTER_MODEL_REQUIRED',
      lumaCorrectionGainPct: -0.34,
      flatPaintMismatchSharePct: '100%',
      edgeMismatchSharePct: '0%',
      localDarkerMismatchSharePct: '66.87%',
      chromaMismatchSharePct: '48.62%',
      backgroundSizeRisk: '',
      widthExperiment: '',
    }),
    'FLAT_PAINT_SOURCE_OR_BROWSER_COLOR_MODEL_REQUIRED',
  );
  assert.equal(
    decide({
      priority: 'P0',
      backgroundSourceDecision: 'BACKGROUND_DECLARATION_MATCHES_BUT_RASTER_DIFFERS',
      compositingDecision: 'BACKGROUND_COMPOSITING_MODEL_REQUIRED',
      rowRasterDecision: 'ROW_LUMA_RASTER_MODEL_REQUIRED',
      lumaCorrectionGainPct: -0.2,
      flatPaintMismatchSharePct: '20%',
      edgeMismatchSharePct: '45%',
      localDarkerMismatchSharePct: '10%',
      chromaMismatchSharePct: '10%',
      backgroundSizeRisk: 'reject-row-raster-regression',
      widthExperiment: '',
    }),
    'SOURCE_IMAGE_OR_BROWSER_PAINT_MODEL_REQUIRED',
  );
  assert.equal(
    decide({
      priority: 'P0',
      backgroundSourceDecision: 'TABLE_WIDTH_CONTEXT_BEFORE_BACKGROUND_CSS',
      compositingDecision: 'LUMA_BACKGROUND_COMPOSITING_MODEL_REQUIRED',
      rowRasterDecision: 'ROW_LUMA_RASTER_MODEL_REQUIRED',
      lumaCorrectionGainPct: -47.9,
      flatPaintMismatchSharePct: '100%',
      edgeMismatchSharePct: '0%',
      localDarkerMismatchSharePct: '81.48%',
      chromaMismatchSharePct: '50%',
      backgroundSizeRisk: '',
      widthExperiment: 'CHAT_MESSAGE_CONTENT_WIDTH',
    }),
    'TABLE_WIDTH_CONTEXT_BEFORE_LUMA_MODEL',
  );
  const summary = summarizeCompositing({
    summary: {
      rowWeightedMismatchPct: '17.93%',
      lumaCorrectionGainPct: -0.34,
      flatPaintMismatchSharePct: '100%',
      edgeMismatchSharePct: '0%',
      localDarkerMismatchSharePct: '66.87%',
      chromaMismatchSharePct: '48.62%',
    },
    worstRows: [{ index: 1, mismatchPct: '26.28%', flatPaintMismatchSharePct: '100%' }],
  });
  assert.equal(summary.worstRow.index, 1);
  assert.equal(summary.flatPaintMismatchSharePct, '100%');
  console.log('roll20_chat_background_raster_model_probe self-test PASS');
}

if (selfTest) await runSelfTest();
else await main();
