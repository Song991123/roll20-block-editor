#!/usr/bin/env node
/**
 * Route stubborn Roll20 chat mismatches after width/font candidates fail.
 *
 * Diagnostic only. This probe cross-checks row-band geometry, paint candidate
 * gains, actual computed styles, and chat CSS activation/source-order evidence.
 * It does not emit product CSS and must not be treated as visual parity.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const rawArgs = process.argv.slice(2).filter((arg) => arg !== '--');
const optionNamesWithValues = new Set([
  '--out-dir',
  '--parity-dir',
  '--candidate-comparison-dir',
  '--style-proof-dir',
  '--mask-dir',
  '--row-geometry-dir',
  '--width-reconciliation-dir',
  '--font-intrinsic-dir',
  '--default-smoke',
  '--paint-smoke',
]);
const args = rawArgs.filter((arg, index) => !arg.startsWith('--') && !optionNamesWithValues.has(rawArgs[index - 1]));
const runDirArg = args[0] ?? 'reports/roll20-actual-compare/2026-06-18-state-map-v1';
const runDir = path.resolve(runDirArg);
const outDir = path.resolve(readOption('--out-dir', path.join(runDir, 'chat-row-paint-source-probe')));

const DEFAULT_SMOKE = readOption('--default-smoke', 'reports/rolltemplate-chat-smoke/rolltemplate-chat-smoke-results.json');
const PAINT_DIM_SMOKE = readOption('--paint-smoke', 'reports/rolltemplate-chat-smoke-paint-dim-background/rolltemplate-chat-smoke-results.json');
const parityDir = path.resolve(readOption('--parity-dir', path.join(runDir, 'chat-parity-diagnostics')));
const candidateComparisonDir = path.resolve(readOption('--candidate-comparison-dir', path.join(runDir, 'chat-candidate-comparison')));
const styleProofDir = path.resolve(readOption('--style-proof-dir', path.join(runDir, 'chat-candidate-style-proof')));
const maskDir = path.resolve(readOption('--mask-dir', path.join(runDir, 'chat-mask-strategy')));
const rowGeometryDir = path.resolve(readOption('--row-geometry-dir', path.join(runDir, 'chat-row-geometry')));
const widthReconciliationDir = path.resolve(readOption('--width-reconciliation-dir', path.join(runDir, 'chat-width-reconciliation')));
const fontIntrinsicDir = path.resolve(readOption('--font-intrinsic-dir', path.join(runDir, 'chat-font-intrinsic-probe')));
const HIGH_MISMATCH = 0.1;
const MEANINGFUL_GAIN_PCT = -0.5;

async function main() {
  const parity = await readOptionalJson(path.join(parityDir, 'chat-parity-diagnostics-results.json'));
  const candidates = await readOptionalJson(path.join(candidateComparisonDir, 'chat-candidate-comparison-results.json'));
  const styleProof = await readOptionalJson(path.join(styleProofDir, 'chat-candidate-style-proof-results.json'));
  const mask = await readOptionalJson(path.join(maskDir, 'chat-mask-strategy-results.json'));
  const rows = await readOptionalJson(path.join(rowGeometryDir, 'chat-row-geometry-results.json'));
  const widthReconciliation = await readOptionalJson(path.join(widthReconciliationDir, 'chat-width-reconciliation-results.json'));
  const fontIntrinsic = await readOptionalJson(path.join(fontIntrinsicDir, 'chat-font-intrinsic-probe-results.json'));
  const defaultSmoke = await readOptionalJson(DEFAULT_SMOKE);
  const paintSmoke = await readOptionalJson(PAINT_DIM_SMOKE);

  const fixtureIds = collectFixtureIds(parity, rows, widthReconciliation, fontIntrinsic);
  const fixtures = await Promise.all(fixtureIds.map((fixtureId) => summarizeFixture(fixtureId, {
    parity,
    candidates,
    styleProof,
    mask,
    rows,
    widthReconciliation,
    fontIntrinsic,
    defaultSmoke,
    paintSmoke,
  })));
  const actionable = fixtures.filter((fixture) => fixture.priority !== 'P2' && !['KEEP_CURRENT_AXIS', 'MISSING_EVIDENCE'].includes(fixture.decision));
  const report = {
    generatedAt: new Date().toISOString(),
    runDir: runDirArg,
    reportOverrides: {
      outDir: rel(outDir),
      parityDir: rel(parityDir),
      candidateComparisonDir: rel(candidateComparisonDir),
      styleProofDir: rel(styleProofDir),
      maskDir: rel(maskDir),
      rowGeometryDir: rel(rowGeometryDir),
      widthReconciliationDir: rel(widthReconciliationDir),
      fontIntrinsicDir: rel(fontIntrinsicDir),
      defaultSmoke: rel(path.resolve(DEFAULT_SMOKE)),
      paintSmoke: rel(path.resolve(PAINT_DIM_SMOKE)),
    },
    scope: 'diagnostic-only row/paint/source-order probe for Roll20 chat; no production CSS',
    summary: {
      status: actionable.length ? 'ROW_PAINT_SOURCE_ACTIONABLE' : 'ROW_PAINT_SOURCE_SECONDARY',
      fixtures: fixtures.length,
      actionable: actionable.length,
      decisions: countBy(fixtures.map((fixture) => fixture.decision)),
      productionSafe: false,
    },
    fixtures,
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'chat-row-paint-source-probe-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'chat-row-paint-source-probe-results.md'), renderMarkdown(report), 'utf8');

  console.log(`ROLL20 CHAT ROW/PAINT/SOURCE PROBE ${report.summary.status}`);
  for (const fixture of fixtures) {
    console.log(`FIXTURE ${fixture.fixtureId} priority=${fixture.priority} decision=${fixture.decision} mismatch=${fixture.alignedMismatchPct} row=${fixture.rowDecision || 'n/a'} paint=${fixture.paintGainLabel} style=${fixture.paintStyleStatus || 'n/a'} source=${fixture.sourceOrderDecision} next=${fixture.nextAction}`);
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

async function summarizeFixture(fixtureId, reports) {
  const parity = findFixture(reports.parity?.fixtures, fixtureId);
  const row = findFixture(reports.rows?.fixtures, fixtureId);
  const mask = findFixture(reports.mask?.fixtures, fixtureId);
  const width = findFixture(reports.widthReconciliation?.fixtures, fixtureId);
  const font = findFixture(reports.fontIntrinsic?.fixtures, fixtureId);
  const localDefault = findSmokeFixture(reports.defaultSmoke, fixtureId);
  const localPaint = findSmokeFixture(reports.paintSmoke, fixtureId);
  const actualSidecar = await readOptionalJson(path.join(runDir, 'local-baseline', fixtureId, 'screenshots', 'roll20-chat-dom-evidence.json'));
  const actualTemplate = actualSidecar?.latestTemplate ?? null;
  const localTemplate = localDefault?.cardInfo?.templateComputed ?? null;
  const paintTemplate = localPaint?.cardInfo?.templateComputed ?? null;
  const localTable = child(localTemplate, 'table');
  const actualTable = child(actualTemplate, 'table');
  const paintTable = child(paintTemplate, 'table');
  const key = fixtureKeyForId(fixtureId);
  const alignedMismatch = numberOrNull(parity?.bestAlignedMismatchRatio ?? parity?.mismatchRatio);
  const paintCandidate = candidateByName(reports.candidates, 'paint-dim-background');
  const noShadowCandidate = candidateByName(reports.candidates, 'no-shadow');
  const sanitizeCandidate = candidateByName(reports.candidates, 'yshy-sanitize-typography');
  const edgeShadowCandidate = candidateByName(reports.candidates, 'paint-edge-shadow');
  const paintStyle = styleProofByName(reports.styleProof, 'paint-dim-background')?.fixtures?.find((item) => item.fixtureId === fixtureId);
  const cssEvidence = actualSidecar?.chatCssEvidence ?? {};
  const sanitizeDelta = fixtureDelta(sanitizeCandidate, key);
  const sourceOrderDecision = decideSourceOrder(cssEvidence, localTable, actualTable, {
    sanitizeDelta,
  });
  const styleAlignment = compareStyleContext(localTable, actualTable, paintTable);
  const paintGain = fixtureDelta(paintCandidate, key);
  const decision = decide({
    priority: priorityFor(alignedMismatch),
    rowDecision: row?.rowModel?.decision ?? '',
    widthExperiment: width?.nextExperiment ?? '',
    fontDecision: font?.decision ?? '',
    paintGain,
    paintStyleStatus: paintStyle?.status ?? '',
    sourceOrderDecision,
    maskDecision: mask?.strategyDecision ?? '',
  });

  return {
    fixtureId,
    priority: priorityFor(alignedMismatch),
    decision,
    nextAction: nextAction(decision),
    alignedMismatchRatio: alignedMismatch,
    alignedMismatchPct: pct(alignedMismatch),
    rowDecision: row?.rowModel?.decision ?? '',
    widthExperiment: width?.nextExperiment ?? '',
    fontIntrinsicDecision: font?.decision ?? '',
    maskDecision: mask?.strategyDecision ?? '',
    sourceOrderDecision,
    paintGainPct: paintGain,
    paintGainLabel: signedPct(paintGain),
    paintStyleStatus: paintStyle?.status ?? '',
    paintStyleFinding: paintStyle?.finding ?? '',
    diagnosticCandidateDeltas: {
      paintDimBackground: paintGain,
      noShadow: fixtureDelta(noShadowCandidate, key),
      yshySanitizeTypography: fixtureDelta(sanitizeCandidate, key),
      paintEdgeShadow: fixtureDelta(edgeShadowCandidate, key),
    },
    geometrySignals: {
      maxAbsTopDelta: row?.rowModel?.maxAbsTopDelta ?? null,
      topSpread: row?.rowModel?.topSpread ?? null,
      maxAbsWidthDelta: row?.rowModel?.maxAbsWidthDelta ?? null,
      widthSpread: row?.rowModel?.widthSpread ?? null,
      maxAbsCellDelta: row?.rowModel?.maxAbsCellDelta ?? null,
      tableRectWidthDelta: row?.templateMetrics?.tableRectWidthDelta ?? null,
      tableScrollWidthDelta: row?.templateMetrics?.tableScrollWidthDelta ?? null,
    },
    maskSignals: {
      brightMismatchSharePct: mask?.lumaSignals?.brightMismatchSharePct ?? '',
      brightAvgSignedLumaDelta: mask?.lumaSignals?.brightAvgSignedLumaDelta ?? null,
      shadowMismatchSharePct: mask?.lumaSignals?.shadowMismatchSharePct ?? '',
      shadowCountDelta: mask?.lumaSignals?.shadowCountDelta ?? null,
      topRowMismatchSharePct: mask?.bandStats?.topRowMismatchSharePct ?? '',
      leftColMismatchSharePct: mask?.bandStats?.leftColMismatchSharePct ?? '',
    },
    sourceEvidence: {
      classification: cssEvidence.classification ?? '',
      expectedRulePresent: Boolean(cssEvidence.anyExpectedRulePresent),
      unprefixedRulePresent: Boolean(cssEvidence.unprefixedRulePresent),
      scopedUnprefixedRulePresent: Boolean(cssEvidence.scopedUnprefixedRulePresent),
      styleElementCount: cssEvidence.styleElementCount ?? null,
      styleTextLength: cssEvidence.styleTextLength ?? null,
      stylesheetLinkCount: cssEvidence.stylesheetLinkCount ?? null,
      sanitizeReplayDeltaPct: sanitizeDelta,
    },
    styleAlignment,
    evidence: evidenceNotes({
      row,
      mask,
      width,
      font,
      paintGain,
      paintStyle,
      sourceOrderDecision,
      styleAlignment,
    }),
  };
}

function decide(signals) {
  if (signals.priority === 'P2') return 'KEEP_CURRENT_AXIS';
  if (!signals.rowDecision) return 'MISSING_EVIDENCE';
  if (
    signals.sourceOrderDecision === 'SANITIZE_STYLE_REPLAY_REJECTED' &&
    signals.widthExperiment === 'TABLE_SCROLL_INTRINSIC'
  ) {
    return 'SANITIZE_REPLAY_REJECTED_SOURCE_MODEL_REQUIRED';
  }
  if (
    signals.rowDecision === 'TABLE_WIDE_WIDTH_WITH_UNIFORM_OFFSET' &&
    signals.paintGain <= MEANINGFUL_GAIN_PCT &&
    signals.paintStyleStatus === 'CONTRADICTED_BY_ACTUAL_STYLE'
  ) {
    return 'ROW_BAND_RASTER_CONTEXT_REQUIRED';
  }
  if (
    signals.sourceOrderDecision === 'SOURCE_ORDER_OR_SANITIZE_RECAPTURE_REQUIRED' &&
    signals.widthExperiment === 'TABLE_SCROLL_INTRINSIC'
  ) {
    return 'SOURCE_ORDER_BEFORE_NEXT_CSS';
  }
  if (signals.maskDecision === 'MODEL_TEMPLATE_WIDTH_BEFORE_PAINT' || signals.widthExperiment === 'TABLE_SCROLL_INTRINSIC') {
    return 'TABLE_INTRINSIC_SOURCE_CONTEXT_REQUIRED';
  }
  if (signals.paintGain <= MEANINGFUL_GAIN_PCT && signals.paintStyleStatus !== 'CONTRADICTED_BY_ACTUAL_STYLE') {
    return 'PAINT_STYLE_PROOF_REQUIRED';
  }
  return 'KEEP_CURRENT_AXIS';
}

function nextAction(decision) {
  switch (decision) {
    case 'ROW_BAND_RASTER_CONTEXT_REQUIRED':
      return 'do not promote filter CSS; build a capture/probe that compares real row-band background/text rasterization and source-order around the CoC table';
    case 'SOURCE_ORDER_BEFORE_NEXT_CSS':
      return 'recapture or inspect actual Roll20 chat CSS rule order and sanitized rolltemplate CSS before another local CSS candidate';
    case 'SANITIZE_REPLAY_REJECTED_SOURCE_MODEL_REQUIRED':
      return 'do not replay observed sanitized typography as CSS; compare actual Roll20 rule order, font-face activation, and table intrinsic source context for the CoC rolltemplate';
    case 'TABLE_INTRINSIC_SOURCE_CONTEXT_REQUIRED':
      return 'continue table intrinsic/source-context modeling; keep crop/filter/typography hacks diagnostic-only';
    case 'PAINT_STYLE_PROOF_REQUIRED':
      return 'prove the improving paint behavior from actual Roll20 computed style before any renderer change';
    case 'MISSING_EVIDENCE':
      return 'rerun row geometry, candidate style proof, and actual chat DOM capture before choosing a renderer axis';
    default:
      return 'keep current renderer axis; no new row/paint/source action';
  }
}

function decideSourceOrder(cssEvidence, localTable, actualTable, { sanitizeDelta }) {
  if (!cssEvidence || !Object.keys(cssEvidence).length) return 'NO_ACTUAL_CSS_EVIDENCE';
  if (!cssEvidence.anyExpectedRulePresent) return 'USER_ROLLTEMPLATE_CSS_INACTIVE_OR_MISSING';
  if (sanitizeDelta != null && sanitizeDelta > 5) return 'SANITIZE_STYLE_REPLAY_REJECTED';
  const importantDiffs = ['borderSpacing', 'fontFamily', 'fontSize', 'letterSpacing', 'overflowWrap']
    .filter((key) => !sameStyle(localTable, actualTable, key));
  if (importantDiffs.length >= 3 && cssEvidence.anyExpectedRulePresent) {
    return 'SOURCE_ORDER_OR_SANITIZE_RECAPTURE_REQUIRED';
  }
  return 'SOURCE_ORDER_SECONDARY';
}

function compareStyleContext(localTable, actualTable, paintTable) {
  const keys = [
    'backgroundColor',
    'backgroundImage',
    'backgroundPosition',
    'backgroundSize',
    'borderCollapse',
    'borderSpacing',
    'filter',
    'fontFamily',
    'fontSize',
    'letterSpacing',
    'overflowWrap',
    'textRendering',
    'textShadow',
    'transform',
    'webkitFontSmoothing',
    'width',
  ];
  return Object.fromEntries(keys.map((key) => [key, {
    local: normalizeStyleValue(localTable?.computedStyle?.[key]),
    actual: normalizeStyleValue(actualTable?.computedStyle?.[key]),
    paintCandidate: normalizeStyleValue(paintTable?.computedStyle?.[key]),
    matchesActual: sameNormalized(localTable?.computedStyle?.[key], actualTable?.computedStyle?.[key]),
    paintMatchesActual: sameNormalized(paintTable?.computedStyle?.[key], actualTable?.computedStyle?.[key]),
  }]));
}

function evidenceNotes({ row, mask, width, font, paintGain, paintStyle, sourceOrderDecision, styleAlignment }) {
  const notes = [];
  if (row?.rowModel?.decision) {
    notes.push(`row geometry ${row.rowModel.decision}: top ${fmtPx(row.rowModel.maxAbsTopDelta)}, width ${fmtPx(row.rowModel.maxAbsWidthDelta)}, cell ${fmtPx(row.rowModel.maxAbsCellDelta)}`);
  }
  if (mask?.strategyDecision) {
    notes.push(`mask strategy ${mask.strategyDecision}: bright ${mask.lumaSignals?.brightMismatchSharePct || 'n/a'}, shadow ${mask.lumaSignals?.shadowMismatchSharePct || 'n/a'}`);
  }
  if (width?.nextExperiment) notes.push(`width reconciliation next ${width.nextExperiment}`);
  if (font?.decision) notes.push(`font/intrinsic decision ${font.decision}`);
  if (paintGain != null) notes.push(`paint-dim-background delta ${signedPct(paintGain)}`);
  if (paintStyle?.status) notes.push(`paint style proof ${paintStyle.status}: ${paintStyle.finding}`);
  notes.push(`source-order decision ${sourceOrderDecision}`);
  const backgroundSame = styleAlignment.backgroundImage?.matchesActual && styleAlignment.backgroundPosition?.matchesActual && styleAlignment.backgroundSize?.matchesActual;
  notes.push(`table background image/position/size ${backgroundSame ? 'match actual' : 'differ from actual'}`);
  if (styleAlignment.filter) notes.push(`filter local=${styleAlignment.filter.local || 'n/a'} actual=${styleAlignment.filter.actual || 'n/a'} paint=${styleAlignment.filter.paintCandidate || 'n/a'}`);
  return notes;
}

function child(template, selector) {
  if (selector === 'root') return template ?? null;
  return (template?.computedChildren ?? []).find((item) => item.selector === selector) ?? null;
}

function sameStyle(a, b, key) {
  return sameNormalized(a?.computedStyle?.[key], b?.computedStyle?.[key]);
}

function sameNormalized(a, b) {
  return normalizeStyleValue(a) === normalizeStyleValue(b);
}

function normalizeStyleValue(value) {
  const text = String(value ?? '');
  return text
    .replace(/%2F/gi, '/')
    .replace(/https%3A/gi, 'https:')
    .replace(/"/g, '')
    .trim()
    .toLowerCase();
}

function findSmokeFixture(report, fixtureId) {
  return (report?.fixtures ?? []).find((fixture) => fixture.id === fixtureId || fixture.fixtureId === fixtureId) ?? null;
}

function findFixture(fixtures, fixtureId) {
  return (fixtures ?? []).find((fixture) => fixture.id === fixtureId || fixture.fixtureId === fixtureId) ?? null;
}

function rel(file) {
  return path.relative(process.cwd(), file);
}

function candidateByName(report, name) {
  return (report?.candidates ?? []).find((candidate) => candidate.name === name) ?? null;
}

function styleProofByName(report, name) {
  return (report?.candidates ?? []).find((candidate) => candidate.name === name) ?? null;
}

function fixtureDelta(candidate, key) {
  return numberOrNull(candidate?.fixtureAlignedDeltaPct?.[key]);
}

function fixtureKeyForId(fixtureId) {
  if (fixtureId === 'official-roll20-AW2E') return 'aw2e';
  if (fixtureId === 'official-roll20-Les-Oublies') return 'lesOublies';
  if (fixtureId === 'yshy-commission-1bu') return 'yshy';
  return fixtureId;
}

function priorityFor(mismatch) {
  if (mismatch > HIGH_MISMATCH) return 'P0';
  if (mismatch > 0.06) return 'P1';
  return 'P2';
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

function renderMarkdown(report) {
  const lines = [
    '# Roll20 Chat Row/Paint/Source Probe',
    '',
    `Generated: ${report.generatedAt}`,
    `Run: \`${report.runDir}\``,
    '',
    'Scope: diagnostic-only. This report blocks style-contradicted paint hacks and routes the next Roll20 chat renderer investigation.',
    '',
    '| Fixture | Priority | Decision | Mismatch | Row | Paint gain | Paint style | Source | Next |',
    '| --- | --- | --- | ---: | --- | ---: | --- | --- | --- |',
  ];
  for (const fixture of report.fixtures) {
    lines.push(`| \`${fixture.fixtureId}\` | ${fixture.priority} | ${fixture.decision} | ${fixture.alignedMismatchPct} | ${fixture.rowDecision || ''} | ${fixture.paintGainLabel} | ${fixture.paintStyleStatus || ''} | ${fixture.sourceOrderDecision} | ${fixture.nextAction} |`);
  }
  lines.push('', '## Evidence Notes', '');
  for (const fixture of report.fixtures) {
    lines.push(`### ${fixture.fixtureId}`);
    for (const note of fixture.evidence) lines.push(`- ${note}`);
    lines.push('');
  }
  lines.push('## Claim Boundary', '');
  lines.push('- Decisions here are routing decisions for the next diagnostic, not Roll20 visual parity.');
  lines.push('- Generated reports and Roll20 evidence stay local-only.');
  return `${lines.join('\n')}\n`;
}

async function readOptionalJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function countBy(values) {
  return values.reduce((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

function pct(value) {
  return typeof value === 'number' ? `${Number((value * 100).toFixed(2))}%` : '';
}

function signedPct(value) {
  if (typeof value !== 'number') return '';
  const rounded = Number(value.toFixed(2));
  return `${rounded > 0 ? '+' : ''}${rounded}%`;
}

function fmtPx(value) {
  return typeof value === 'number' ? `${Number(value.toFixed(3))}px` : 'n/a';
}

await main();
