#!/usr/bin/env node
/**
 * Diagnose Roll20 chat rolltemplate font/glyph width mismatch.
 *
 * Diagnostic only. This does not propose production CSS. It reads existing
 * local ChatPane smoke, actual Roll20 chat DOM sidecars, candidate comparison,
 * and intrinsic-width model output to decide whether the next probe should be
 * font availability, glyph measurement, CSS sanitize/activation, or capture.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const rawArgs = process.argv.slice(2).filter((arg) => arg !== '--');
const optionNamesWithValues = new Set(['--out-dir', '--report-dir', '--actual-sidecar']);
const args = rawArgs.filter((arg, index) => !arg.startsWith('--') && !optionNamesWithValues.has(rawArgs[index - 1]));
const runDirArg = args[0] ?? 'reports/roll20-actual-compare/2026-06-18-state-map-v1';
const runDir = path.resolve(runDirArg);
const localSmokeArg = args[1] ?? 'reports/rolltemplate-chat-smoke/rolltemplate-chat-smoke-results.json';
const localSmokePath = path.resolve(localSmokeArg);
const outDir = path.resolve(readOption('--out-dir', readOption('--report-dir', path.join(runDir, 'chat-font-glyph-model'))));
const actualSidecarOverrides = readKeyValueOptions('--actual-sidecar');

function readOption(name, fallback = '') {
  const index = rawArgs.indexOf(name);
  if (index === -1) return fallback;
  const value = rawArgs[index + 1];
  if (!value || value.startsWith('--')) return fallback;
  return value;
}

function readKeyValueOptions(name) {
  const values = new Map();
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    let raw = '';
    if (arg === name) {
      raw = rawArgs[index + 1] ?? '';
      index += 1;
    } else if (arg.startsWith(`${name}=`)) {
      raw = arg.slice(name.length + 1);
    }
    if (!raw) continue;
    const separator = raw.indexOf('=');
    if (separator <= 0) {
      throw new Error(`Expected ${name} <fixture-id>=<path>, got: ${raw}`);
    }
    const key = raw.slice(0, separator);
    const value = raw.slice(separator + 1);
    if (!key || !value) {
      throw new Error(`Expected ${name} <fixture-id>=<path>, got: ${raw}`);
    }
    values.set(key, path.resolve(value));
  }
  return values;
}

async function main() {
  const localSmoke = await readJson(localSmokePath);
  const candidateComparison = await readOptionalJson(path.join(runDir, 'chat-candidate-comparison', 'chat-candidate-comparison-results.json'));
  const intrinsic = await readOptionalJson(path.join(runDir, 'chat-intrinsic-width-model', 'chat-intrinsic-width-model-results.json'));
  const style = await readOptionalJson(path.join(runDir, 'chat-style-context-diagnostics', 'chat-style-context-diagnostics-results.json'));
  const fixtures = [];

  for (const localFixture of localSmoke.fixtures ?? []) {
    fixtures.push(await compareFixture(localFixture, { candidateComparison, intrinsic, style }));
  }

  const compared = fixtures.filter((fixture) => fixture.status === 'COMPARED');
  const textMeasureMissing = fixtures.filter((fixture) => fixture.textMeasureSignals?.missing).length;
  const actionable = compared.filter((fixture) => fixture.glyphDecision !== 'GLYPH_MODEL_SECONDARY_OR_ACCEPTABLE');
  const report = {
    generatedAt: new Date().toISOString(),
    runDir: runDirArg,
    localSmoke: localSmokeArg,
    reportOverrides: {
      outDir: rel(outDir),
      actualSidecars: Object.fromEntries([...actualSidecarOverrides].map(([fixtureId, file]) => [fixtureId, rel(file)])),
    },
    scope: 'diagnostic-only font/glyph width model',
    summary: {
      status: actionable.length ? 'FONT_GLYPH_MODEL_REQUIRED' : 'FONT_GLYPH_SECONDARY',
      fixtures: fixtures.length,
      compared: compared.length,
      actionable: actionable.length,
      textMeasureMissing,
      decisions: countBy(compared.map((fixture) => fixture.glyphDecision)),
      productionSafe: false,
    },
    fixtures,
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'chat-font-glyph-model-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'chat-font-glyph-model-results.md'), renderMarkdown(report), 'utf8');

  console.log(`ROLL20 CHAT FONT GLYPH MODEL ${report.summary.status}`);
  for (const fixture of fixtures) {
    console.log(`FIXTURE ${fixture.fixtureId} status=${fixture.status} decision=${fixture.glyphDecision ?? ''} tableDelta=${fmtPx(fixture.widthDeltas?.table)} textMeasure=${fixture.textMeasureSignals?.status ?? ''} fontFamilyChanged=${fixture.fontSignals?.tableFontFamilyChanged ? 'YES' : 'NO'} fontAvailabilityChanged=${fixture.fontSignals?.fontAvailabilityChanged ? 'YES' : 'NO'} next=${fixture.nextAction ?? ''}`);
  }
  console.log(`out=${path.relative(process.cwd(), outDir)}`);
}

async function compareFixture(localFixture, reports) {
  const fixtureId = localFixture.id;
  const actualPath = actualSidecarOverrides.get(fixtureId)
    ?? path.join(runDir, 'local-baseline', fixtureId, 'screenshots', 'roll20-chat-dom-evidence.json');
  const actualSidecar = await readOptionalJson(actualPath);
  const localTemplate = localFixture?.cardInfo?.templateComputed ?? null;
  const actualTemplate = actualSidecar?.latestTemplate ?? null;
  if (!localTemplate || !actualTemplate) {
    return {
      fixtureId,
      status: 'MISSING',
      glyphDecision: 'MISSING_GLYPH_EVIDENCE',
      nextAction: 'recapture local and actual chat DOM sidecars before font/glyph diagnosis',
    };
  }

  const localTable = childBySelector(localTemplate, 'table');
  const actualTable = childBySelector(actualTemplate, 'table');
  const intrinsicFixture = findByFixtureId(reports.intrinsic?.fixtures, fixtureId);
  const styleFixture = findByFixtureId(reports.style?.fixtures, fixtureId);
  const candidateEvidence = extractCandidateEvidence(reports.candidateComparison, fixtureId);
  const fontSignals = compareFontSignals({
    localTemplate,
    actualTemplate,
    localTable,
    actualTable,
    localFontEvidence: localFixture.cardInfo?.fontEvidence,
    actualFontEvidence: actualSidecar?.fontEvidence,
  });
  const textMeasureSignals = compareTextMeasureEvidence({
    local: localFixture.cardInfo?.textMeasureEvidence ?? localTemplate?.textMeasureEvidence,
    actual: actualSidecar?.textMeasureEvidence ?? actualTemplate?.textMeasureEvidence,
  });
  const rowGlyphMetrics = compareRowGlyphMetrics(localTemplate.rowMetrics, actualTemplate.rowMetrics);
  const widthDeltas = {
    root: delta(widthOf(localTemplate), widthOf(actualTemplate)),
    table: delta(widthOf(localTable), widthOf(actualTable)),
    firstCell: delta(rowGlyphMetrics.localFirstCellWidth, rowGlyphMetrics.actualFirstCellWidth),
  };
  const textWidthModel = buildTextWidthModel({ textMeasureSignals, widthDeltas });
  const glyphDecision = decideGlyphModel({
    widthDeltas,
    fontSignals,
    textMeasureSignals,
    textWidthModel,
    rowGlyphMetrics,
    candidateEvidence,
    intrinsicFixture,
  });

  return {
    fixtureId,
    status: 'COMPARED',
    glyphDecision,
    nextAction: nextAction(glyphDecision, textWidthModel),
    intrinsicDecision: intrinsicFixture?.intrinsicDecision ?? '',
    styleFindings: styleFixture?.findings ?? [],
    widthDeltas,
    fontSignals,
    textMeasureSignals,
    textWidthModel,
    rowGlyphMetrics,
    candidateEvidence,
    evidence: evidenceNotes({ widthDeltas, fontSignals, textMeasureSignals, textWidthModel, rowGlyphMetrics, candidateEvidence }),
  };
}

function compareFontSignals({ localTemplate, actualTemplate, localTable, actualTable, localFontEvidence, actualFontEvidence }) {
  const localFonts = summarizeFontChecks(localFontEvidence);
  const actualFonts = summarizeFontChecks(actualFontEvidence);
  const fontAvailabilityDeltas = Object.fromEntries(
    [...new Set([...Object.keys(localFonts), ...Object.keys(actualFonts)])].map((spec) => [
      spec,
      {
        local: localFonts[spec] ?? null,
        actual: actualFonts[spec] ?? null,
        changed: (localFonts[spec] ?? null) !== (actualFonts[spec] ?? null),
      },
    ]),
  );
  const changedFonts = Object.entries(fontAvailabilityDeltas)
    .filter(([, value]) => value.changed)
    .map(([spec, value]) => ({ spec, ...value }));
  const localTableFont = cssValue(localTable, 'fontFamily');
  const actualTableFont = cssValue(actualTable, 'fontFamily');
  const localRootFont = cssValue(localTemplate, 'fontFamily');
  const actualRootFont = cssValue(actualTemplate, 'fontFamily');
  const localFirstCell = firstCell(localTemplate);
  const actualFirstCell = firstCell(actualTemplate);
  const localFirstCellFont = cssValue(localFirstCell, 'fontFamily');
  const actualFirstCellFont = cssValue(actualFirstCell, 'fontFamily');
  return {
    fontAvailabilityChanged: changedFonts.length > 0,
    changedFonts,
    localFontStatus: localFontEvidence?.status ?? '',
    actualFontStatus: actualFontEvidence?.status ?? '',
    rootFontFamilyChanged: localRootFont !== actualRootFont,
    tableFontFamilyChanged: localTableFont !== actualTableFont,
    firstCellFontFamilyChanged: localFirstCellFont !== actualFirstCellFont,
    local: {
      rootFontFamily: localRootFont,
      tableFontFamily: localTableFont,
      firstCellFontFamily: localFirstCellFont,
      tableFontSize: px(cssValue(localTable, 'fontSize')),
      tableLineHeight: px(cssValue(localTable, 'lineHeight')),
    },
    actual: {
      rootFontFamily: actualRootFont,
      tableFontFamily: actualTableFont,
      firstCellFontFamily: actualFirstCellFont,
      tableFontSize: px(cssValue(actualTable, 'fontSize')),
      tableLineHeight: px(cssValue(actualTable, 'lineHeight')),
    },
    deltas: {
      tableFontSize: delta(px(cssValue(localTable, 'fontSize')), px(cssValue(actualTable, 'fontSize'))),
      tableLineHeight: delta(px(cssValue(localTable, 'lineHeight')), px(cssValue(actualTable, 'lineHeight'))),
    },
  };
}

function compareTextMeasureEvidence({ local, actual }) {
  const localSamples = Array.isArray(local?.samples) ? local.samples : [];
  const actualSamples = Array.isArray(actual?.samples) ? actual.samples : [];
  const fontFaces = compareFontFaces(local?.fontFaces, actual?.fontFaces);
  const missing = !localSamples.length || !actualSamples.length;
  if (missing) {
    return {
      status: 'MISSING',
      missing: true,
      localStatus: local?.status ?? 'MISSING',
      actualStatus: actual?.status ?? 'MISSING',
      localSampleCount: localSamples.length,
      actualSampleCount: actualSamples.length,
      comparedSamples: 0,
      meanAbsWidthDelta: null,
      probeMeanAbsWidthDelta: null,
      changedFontFaceCount: fontFaces.changedCount,
      fontFaceDeltas: fontFaces.deltas,
      samples: [],
    };
  }
  const actualByKey = new Map(actualSamples.map((sample) => [textMeasureKey(sample), sample]));
  const compared = [];
  for (const localSample of localSamples) {
    const actualSample = actualByKey.get(textMeasureKey(localSample));
    if (!actualSample) continue;
    compared.push({
      selector: localSample.selector,
      source: localSample.source,
      text: localSample.text,
      localFont: localSample.font ?? '',
      actualFont: actualSample.font ?? '',
      fontChanged: (localSample.font ?? '') !== (actualSample.font ?? ''),
      localWidth: numberOrNull(localSample.metrics?.width),
      actualWidth: numberOrNull(actualSample.metrics?.width),
      widthDelta: delta(localSample.metrics?.width, actualSample.metrics?.width),
      localElementWidth: numberOrNull(localSample.elementWidth),
      actualElementWidth: numberOrNull(actualSample.elementWidth),
      elementWidthDelta: delta(localSample.elementWidth, actualSample.elementWidth),
    });
  }
  const probeSamples = compared.filter((sample) => sample.source === 'probe');
  const ratios = compared
    .map((sample) => ratio(sample.actualWidth, sample.localWidth))
    .filter(Number.isFinite);
  return {
    status: compared.length ? 'COMPARED' : 'NO_MATCHING_SAMPLES',
    missing: false,
    localStatus: local?.status ?? '',
    actualStatus: actual?.status ?? '',
    localSampleCount: localSamples.length,
    actualSampleCount: actualSamples.length,
    comparedSamples: compared.length,
    meanAbsWidthDelta: meanAbs(compared.map((sample) => sample.widthDelta)),
    probeMeanAbsWidthDelta: meanAbs(probeSamples.map((sample) => sample.widthDelta)),
    widthRatioMean: mean(ratios),
    widthRatioStdDev: stdDev(ratios),
    widthRatioMin: minOrNull(ratios),
    widthRatioMax: maxOrNull(ratios),
    maxAbsWidthDelta: maxAbs(compared.map((sample) => sample.widthDelta)),
    fontChangedSamples: compared.filter((sample) => sample.fontChanged).length,
    changedFontFaceCount: fontFaces.changedCount,
    fontFaceDeltas: fontFaces.deltas,
    samples: compared.slice(0, 16),
  };
}

function compareFontFaces(localFaces = [], actualFaces = []) {
  const summarize = (faces) => new Map((Array.isArray(faces) ? faces : []).map((font) => [
    `${font.family}|${font.weight}|${font.style}|${font.stretch}`,
    font.status ?? '',
  ]));
  const local = summarize(localFaces);
  const actual = summarize(actualFaces);
  const deltas = [];
  for (const key of new Set([...local.keys(), ...actual.keys()])) {
    const localStatus = local.get(key) ?? null;
    const actualStatus = actual.get(key) ?? null;
    if (localStatus !== actualStatus) deltas.push({ key, local: localStatus, actual: actualStatus });
  }
  return { changedCount: deltas.length, deltas: deltas.slice(0, 20) };
}

function buildTextWidthModel({ textMeasureSignals, widthDeltas }) {
  const samples = Array.isArray(textMeasureSignals?.samples) ? textMeasureSignals.samples : [];
  if (textMeasureSignals?.missing || textMeasureSignals?.status !== 'COMPARED' || !samples.length) {
    return {
      decision: 'TEXT_WIDTH_MODEL_MISSING',
      confidence: 'low',
      nextAction: 'recapture exact local/actual measureText samples before modeling text width',
    };
  }
  const elementSamples = samples.filter((sample) => sample.source === 'element');
  const probeSamples = samples.filter((sample) => sample.source === 'probe');
  const tableSample = elementSamples.find((sample) => sample.selector === 'table') ?? null;
  const largestDelta = [...samples].sort((a, b) => Math.abs(b.widthDelta ?? 0) - Math.abs(a.widthDelta ?? 0))[0] ?? null;
  const tableTextDelta = numberOrNull(tableSample?.widthDelta);
  const tableElementDelta = numberOrNull(tableSample?.elementWidthDelta);
  const tableDelta = numberOrNull(widthDeltas?.table);
  const tableTextResidual = delta(tableTextDelta, tableDelta);
  const sameDirection = sameSign(tableTextDelta, tableDelta);
  const tableExplainedByText = sameDirection && Math.abs(tableTextResidual ?? 999) <= 3;
  const textOverconstrained = sameDirection &&
    Math.abs(tableTextResidual ?? 0) >= 8 &&
    Math.abs(tableTextDelta ?? 0) >= Math.abs(tableDelta ?? 0) * 1.75;
  const tableSecondary = Math.abs(tableDelta ?? 0) < 2 && Math.abs(tableTextDelta ?? 0) >= 2;
  let decision = 'TEXT_WIDTH_MODEL_REQUIRED';
  let confidence = 'medium';
  let nextAction = 'build a narrow per-template text-width candidate and prove it against actual Roll20 pixels';
  if (tableSecondary) {
    decision = 'TEXT_WIDTH_SECONDARY_TO_PAINT_OR_CELL_ALLOCATION';
    confidence = 'medium';
    nextAction = 'treat table width as secondary; inspect row/cell paint, shadow, and allocation masks';
  } else if (tableExplainedByText) {
    decision = 'TEXT_WIDTH_EXPLAINS_TABLE_WIDTH';
    confidence = 'high';
    nextAction = 'model exact text metrics for this template; table width appears driven by measured text width';
  } else if (textOverconstrained) {
    decision = 'TEXT_WIDTH_OVERCONSTRAINED_BY_LAYOUT';
    confidence = 'medium';
    nextAction = 'compare table-layout, wrapping, and intrinsic constraints before a font or width CSS patch';
  }
  return {
    decision,
    confidence,
    nextAction,
    tableTextDelta,
    tableElementDelta,
    tableWidthDelta: tableDelta,
    tableTextResidual,
    widthRatioMean: textMeasureSignals.widthRatioMean ?? null,
    widthRatioStdDev: textMeasureSignals.widthRatioStdDev ?? null,
    widthRatioMin: textMeasureSignals.widthRatioMin ?? null,
    widthRatioMax: textMeasureSignals.widthRatioMax ?? null,
    elementMeanAbsWidthDelta: meanAbs(elementSamples.map((sample) => sample.widthDelta)),
    probeMeanAbsWidthDelta: meanAbs(probeSamples.map((sample) => sample.widthDelta)),
    maxAbsWidthDelta: textMeasureSignals.maxAbsWidthDelta ?? null,
    dominantSample: largestDelta
      ? {
          selector: largestDelta.selector,
          source: largestDelta.source,
          textLength: String(largestDelta.text ?? '').length,
          widthDelta: largestDelta.widthDelta,
          elementWidthDelta: largestDelta.elementWidthDelta,
          fontChanged: largestDelta.fontChanged,
        }
      : null,
  };
}

function textMeasureKey(sample) {
  return `${sample?.selector ?? ''}|${sample?.source ?? ''}|${sample?.text ?? ''}`;
}

function compareRowGlyphMetrics(localRows = [], actualRows = []) {
  const rows = [];
  const max = Math.max(localRows.length, actualRows.length);
  for (let index = 0; index < max; index += 1) {
    const local = localRows[index] ?? null;
    const actual = actualRows[index] ?? null;
    const textLength = Math.max(String(local?.text ?? '').length, String(actual?.text ?? '').length, 1);
    rows.push({
      index,
      localText: local?.text ?? '',
      actualText: actual?.text ?? '',
      textMatches: (local?.text ?? '') === (actual?.text ?? ''),
      textLength,
      localWidth: numberOrNull(local?.rect?.width),
      actualWidth: numberOrNull(actual?.rect?.width),
      widthDelta: delta(numberOrNull(local?.rect?.width), numberOrNull(actual?.rect?.width)),
      localPxPerChar: perChar(local?.rect?.width, textLength),
      actualPxPerChar: perChar(actual?.rect?.width, textLength),
      pxPerCharDelta: delta(perChar(local?.rect?.width, textLength), perChar(actual?.rect?.width, textLength)),
      localCellCount: local?.cells?.length ?? 0,
      actualCellCount: actual?.cells?.length ?? 0,
    });
  }
  const firstLocalCell = localRows[0]?.cells?.[0] ?? null;
  const firstActualCell = actualRows[0]?.cells?.[0] ?? null;
  const comparableRows = rows.filter((row) => row.widthDelta != null);
  return {
    localRowCount: localRows.length,
    actualRowCount: actualRows.length,
    rowCountDelta: actualRows.length - localRows.length,
    textMismatchRows: rows.filter((row) => !row.textMatches).map((row) => row.index),
    cellCountMismatchRows: rows.filter((row) => row.localCellCount !== row.actualCellCount).map((row) => row.index),
    localFirstCellWidth: numberOrNull(firstLocalCell?.rect?.width),
    actualFirstCellWidth: numberOrNull(firstActualCell?.rect?.width),
    firstCellPxPerCharDelta: delta(
      perChar(firstLocalCell?.rect?.width, Math.max(String(firstLocalCell?.text ?? '').length, String(firstActualCell?.text ?? '').length, 1)),
      perChar(firstActualCell?.rect?.width, Math.max(String(firstLocalCell?.text ?? '').length, String(firstActualCell?.text ?? '').length, 1)),
    ),
    meanAbsRowPxPerCharDelta: meanAbs(comparableRows.map((row) => row.pxPerCharDelta)),
    rows: rows.slice(0, 12),
  };
}

function extractCandidateEvidence(candidateComparison, fixtureId) {
  const key = fixtureCandidateKey(fixtureId);
  const names = ['font-fallback', 'shell-typography', 'template-typography', 'cell-metrics', 'roll20-letter-spacing', 'roll20-intrinsic-spacing'];
  const candidates = {};
  for (const name of names) {
    const row = (candidateComparison?.candidates ?? []).find((candidate) => candidate.name === name);
    const deltaPct = row?.fixtureAlignedDeltaPct?.[key] ?? null;
    candidates[name] = {
      risk: row?.promotionRisk ?? '',
      alignedDeltaPct: typeof deltaPct === 'number' ? deltaPct : null,
      regressedFixtures: row?.regressedFixtures ?? null,
    };
  }
  const fontCandidates = ['font-fallback', 'shell-typography', 'template-typography', 'cell-metrics']
    .map((name) => candidates[name])
    .filter((candidate) => candidate.risk);
  const fontCandidatesRejected = Boolean(fontCandidates.length) && fontCandidates.every((candidate) =>
    candidate.risk === 'reject-regresses-fixtures' ||
    Number(candidate.alignedDeltaPct ?? 0) >= -0.5,
  );
  return {
    fixtureKey: key,
    candidates,
    fontCandidatesRejected,
  };
}

function decideGlyphModel({ widthDeltas, fontSignals, textMeasureSignals, textWidthModel, rowGlyphMetrics, candidateEvidence, intrinsicFixture }) {
  const intrinsicDecision = intrinsicFixture?.intrinsicDecision ?? '';
  if (!intrinsicDecision || intrinsicDecision === 'INTRINSIC_WIDTH_SECONDARY_OR_ACCEPTABLE') {
    return 'GLYPH_MODEL_SECONDARY_OR_ACCEPTABLE';
  }
  if (textMeasureSignals?.missing || textMeasureSignals?.status === 'NO_MATCHING_SAMPLES') {
    return 'TEXT_MEASURE_RECAPTURE_REQUIRED';
  }
  if (textWidthModel?.decision === 'TEXT_WIDTH_EXPLAINS_TABLE_WIDTH') {
    return 'TEXT_WIDTH_SCALE_MODEL_REQUIRED';
  }
  if (textWidthModel?.decision === 'TEXT_WIDTH_OVERCONSTRAINED_BY_LAYOUT') {
    return 'TEXT_WIDTH_LAYOUT_CONSTRAINT_MODEL_REQUIRED';
  }
  if (Math.abs(textMeasureSignals?.meanAbsWidthDelta ?? 0) >= 2 || Math.abs(textMeasureSignals?.probeMeanAbsWidthDelta ?? 0) >= 2) {
    return 'TEXT_MEASUREMENT_DELTA_MODEL_REQUIRED';
  }
  if (fontSignals.fontAvailabilityChanged && candidateEvidence.fontCandidatesRejected) {
    return 'FONT_AVAILABILITY_CHANGED_CANDIDATES_REJECTED';
  }
  if ((fontSignals.tableFontFamilyChanged || fontSignals.rootFontFamilyChanged) && candidateEvidence.fontCandidatesRejected) {
    return 'FONT_STYLE_CHANGED_CANDIDATES_REJECTED';
  }
  if (Math.abs(widthDeltas.table ?? 0) >= 8 && rowGlyphMetrics.meanAbsRowPxPerCharDelta != null) {
    return 'TEXT_MEASUREMENT_MODEL_REQUIRED';
  }
  if (fontSignals.fontAvailabilityChanged || fontSignals.tableFontFamilyChanged) {
    return 'FONT_GLYPH_MODEL_REQUIRED';
  }
  return 'GLYPH_MODEL_SECONDARY_OR_ACCEPTABLE';
}

function nextAction(decision, textWidthModel = null) {
  switch (decision) {
    case 'FONT_AVAILABILITY_CHANGED_CANDIDATES_REJECTED':
      return 'capture actual/local per-font measureText widths and CSSOM font-face activation; broad font fallback candidates already regress';
    case 'FONT_STYLE_CHANGED_CANDIDATES_REJECTED':
      return 'compare exact font stack activation and text measurement sidecars instead of applying broad Proxima/typography CSS';
    case 'TEXT_MEASURE_RECAPTURE_REQUIRED':
      return 'recapture actual Roll20 chat DOM sidecar with textMeasureEvidence and rerun font/glyph diagnosis';
    case 'TEXT_WIDTH_SCALE_MODEL_REQUIRED':
      return textWidthModel?.nextAction ?? 'model exact text-width scaling before any production ChatPane CSS';
    case 'TEXT_WIDTH_LAYOUT_CONSTRAINT_MODEL_REQUIRED':
      return textWidthModel?.nextAction ?? 'compare intrinsic table layout constraints before any production ChatPane CSS';
    case 'TEXT_MEASUREMENT_DELTA_MODEL_REQUIRED':
      return 'build a narrow text-width model from exact measureText deltas instead of broad font or spacing CSS';
    case 'TEXT_MEASUREMENT_MODEL_REQUIRED':
      return 'add per-row/per-cell text measurement probes for the actual computed font stack';
    case 'FONT_GLYPH_MODEL_REQUIRED':
      return 'capture loaded font and glyph width evidence before another renderer candidate';
    default:
      return 'keep font/glyph as secondary evidence';
  }
}

function evidenceNotes({ widthDeltas, fontSignals, textMeasureSignals, textWidthModel, rowGlyphMetrics, candidateEvidence }) {
  const notes = [];
  if (textMeasureSignals?.missing) notes.push(`textMeasureEvidence missing: local=${textMeasureSignals.localSampleCount ?? 0} actual=${textMeasureSignals.actualSampleCount ?? 0}`);
  if (!textMeasureSignals?.missing && textMeasureSignals?.comparedSamples != null) notes.push(`measureText samples compared ${textMeasureSignals.comparedSamples}, mean width delta ${fmtPx(textMeasureSignals.meanAbsWidthDelta)}`);
  if (textWidthModel?.decision) {
    notes.push(`text width model ${textWidthModel.decision}, table text residual ${fmtPx(textWidthModel.tableTextResidual)}`);
  }
  if (textMeasureSignals?.changedFontFaceCount) notes.push(`CSSOM font-face status deltas ${textMeasureSignals.changedFontFaceCount}`);
  if (fontSignals.fontAvailabilityChanged) notes.push(`font availability differs: ${fontSignals.changedFonts.map((font) => font.spec).join(', ')}`);
  if (fontSignals.tableFontFamilyChanged) notes.push('table font-family differs');
  if (fontSignals.rootFontFamilyChanged) notes.push('root font-family differs');
  if (candidateEvidence.fontCandidatesRejected) notes.push('broad font/typography candidates rejected or no-gain in pixel comparison');
  if (Math.abs(widthDeltas.table ?? 0) >= 8) notes.push(`table width delta ${fmtPx(widthDeltas.table)}`);
  if (rowGlyphMetrics.meanAbsRowPxPerCharDelta != null) notes.push(`mean row px/char delta ${fmtPx(rowGlyphMetrics.meanAbsRowPxPerCharDelta)}`);
  return notes;
}

function renderMarkdown(report) {
  const lines = [
    '# Roll20 Chat Font Glyph Model',
    '',
    `Generated: ${report.generatedAt}`,
    `Run: \`${report.runDir}\``,
    '',
    'Scope: diagnostic-only font/glyph width model. This report does not enable production ChatPane CSS.',
    '',
    `Status: ${report.summary.status}`,
    `Text measure missing: ${report.summary.textMeasureMissing}`,
    '',
    '| Fixture | Decision | Text width model | Table delta | Table text residual | Text measure | Font availability | Table font changed | Font candidates | Evidence | Next |',
    '| --- | --- | --- | ---: | ---: | --- | --- | --- | --- | --- | --- |',
  ];
  for (const fixture of report.fixtures) {
    lines.push(`| \`${fixture.fixtureId}\` | ${fixture.glyphDecision} | ${fixture.textWidthModel?.decision ?? ''} | ${fmtPx(fixture.widthDeltas?.table)} | ${fmtPx(fixture.textWidthModel?.tableTextResidual)} | ${fixture.textMeasureSignals?.status ?? ''} (${fixture.textMeasureSignals?.comparedSamples ?? 0}) | ${fixture.fontSignals?.fontAvailabilityChanged ? 'changed' : 'same'} | ${fixture.fontSignals?.tableFontFamilyChanged ? 'yes' : 'no'} | ${fixture.candidateEvidence?.fontCandidatesRejected ? 'rejected/no-gain' : 'not rejected'} | ${(fixture.evidence ?? []).join('<br>')} | ${fixture.nextAction ?? ''} |`);
  }
  lines.push('', '## Claim Boundary', '');
  lines.push('- Font availability/style differences are not production fixes by themselves; prior broad font candidates can still regress pixels.');
  lines.push('- Use this report to decide the next probe: exact `measureText` sidecars, CSSOM font-face activation, or Roll20 sanitize/context tracing.');
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

function childBySelector(template, selector) {
  return (template?.computedChildren ?? []).find((child) => child.selector === selector) ?? null;
}

function firstCell(template) {
  return childBySelector(template, 'td:first') ?? template?.rowMetrics?.[0]?.cells?.[0] ?? null;
}

function findByFixtureId(fixtures, fixtureId) {
  return (fixtures ?? []).find((fixture) => fixture.fixtureId === fixtureId || fixture.id === fixtureId);
}

function fixtureCandidateKey(fixtureId) {
  if (fixtureId === 'fixtureA') return 'fixtureA';
  if (fixtureId === 'fixtureB') return 'lesOublies';
  if (fixtureId === 'fixtureC-commission-1bu') return 'fixtureC';
  return fixtureId;
}

function summarizeFontChecks(fontEvidence) {
  return Object.fromEntries((fontEvidence?.checks ?? []).map((check) => [check.spec, Boolean(check.ok)]));
}

function widthOf(element) {
  return numberOrNull(element?.rect?.width) ?? px(cssValue(element, 'width'));
}

function cssValue(element, key) {
  return element?.computedStyle?.[key] ?? '';
}

function px(value) {
  const match = String(value ?? '').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function delta(localValue, actualValue) {
  const local = Number(localValue);
  const actual = Number(actualValue);
  return Number.isFinite(local) && Number.isFinite(actual)
    ? Number((actual - local).toFixed(3))
    : null;
}

function ratio(value, divisor) {
  const number = Number(value);
  const base = Number(divisor);
  return Number.isFinite(number) && Number.isFinite(base) && base !== 0
    ? Number((number / base).toFixed(4))
    : null;
}

function sameSign(a, b) {
  const left = Number(a);
  const right = Number(b);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
  if (left === 0 || right === 0) return Math.abs(left - right) <= 0.5;
  return Math.sign(left) === Math.sign(right);
}

function perChar(width, length) {
  const numeric = Number(width);
  const count = Number(length);
  return Number.isFinite(numeric) && Number.isFinite(count) && count > 0
    ? Number((numeric / count).toFixed(3))
    : null;
}

function meanAbs(values) {
  const numbers = values.map(Number).filter(Number.isFinite);
  if (!numbers.length) return null;
  return Number((numbers.reduce((sum, value) => sum + Math.abs(value), 0) / numbers.length).toFixed(3));
}

function mean(values) {
  const numbers = values.map(Number).filter(Number.isFinite);
  if (!numbers.length) return null;
  return Number((numbers.reduce((sum, value) => sum + value, 0) / numbers.length).toFixed(4));
}

function stdDev(values) {
  const numbers = values.map(Number).filter(Number.isFinite);
  if (numbers.length < 2) return null;
  const average = numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
  const variance = numbers.reduce((sum, value) => sum + (value - average) ** 2, 0) / numbers.length;
  return Number(Math.sqrt(variance).toFixed(4));
}

function minOrNull(values) {
  const numbers = values.map(Number).filter(Number.isFinite);
  return numbers.length ? Number(Math.min(...numbers).toFixed(4)) : null;
}

function maxOrNull(values) {
  const numbers = values.map(Number).filter(Number.isFinite);
  return numbers.length ? Number(Math.max(...numbers).toFixed(4)) : null;
}

function maxAbs(values) {
  const numbers = values.map(Number).filter(Number.isFinite);
  return numbers.length ? Number(Math.max(...numbers.map(Math.abs)).toFixed(3)) : null;
}

function countBy(values) {
  const out = {};
  for (const value of values) out[value || 'unknown'] = (out[value || 'unknown'] ?? 0) + 1;
  return out;
}

function fmtPx(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '';
  return `${number > 0 ? '+' : ''}${Number(number.toFixed(3))}px`;
}

function rel(file) {
  return path.relative(process.cwd(), file);
}

await main();
