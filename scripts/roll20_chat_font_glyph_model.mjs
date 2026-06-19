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

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const runDirArg = args[0] ?? 'reports/roll20-actual-compare/2026-06-18-state-map-v1';
const runDir = path.resolve(runDirArg);
const localSmokeArg = args[1] ?? 'reports/rolltemplate-chat-smoke/rolltemplate-chat-smoke-results.json';
const localSmokePath = path.resolve(localSmokeArg);
const outDir = path.join(runDir, 'chat-font-glyph-model');

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
  const actionable = compared.filter((fixture) => fixture.glyphDecision !== 'GLYPH_MODEL_SECONDARY_OR_ACCEPTABLE');
  const report = {
    generatedAt: new Date().toISOString(),
    runDir: runDirArg,
    localSmoke: localSmokeArg,
    scope: 'diagnostic-only font/glyph width model',
    summary: {
      status: actionable.length ? 'FONT_GLYPH_MODEL_REQUIRED' : 'FONT_GLYPH_SECONDARY',
      fixtures: fixtures.length,
      compared: compared.length,
      actionable: actionable.length,
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
    console.log(`FIXTURE ${fixture.fixtureId} status=${fixture.status} decision=${fixture.glyphDecision ?? ''} tableDelta=${fmtPx(fixture.widthDeltas?.table)} fontFamilyChanged=${fixture.fontSignals?.tableFontFamilyChanged ? 'YES' : 'NO'} fontAvailabilityChanged=${fixture.fontSignals?.fontAvailabilityChanged ? 'YES' : 'NO'} next=${fixture.nextAction ?? ''}`);
  }
  console.log(`out=${path.relative(process.cwd(), outDir)}`);
}

async function compareFixture(localFixture, reports) {
  const fixtureId = localFixture.id;
  const actualPath = path.join(runDir, 'local-baseline', fixtureId, 'screenshots', 'roll20-chat-dom-evidence.json');
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
  const rowGlyphMetrics = compareRowGlyphMetrics(localTemplate.rowMetrics, actualTemplate.rowMetrics);
  const widthDeltas = {
    root: delta(widthOf(localTemplate), widthOf(actualTemplate)),
    table: delta(widthOf(localTable), widthOf(actualTable)),
    firstCell: delta(rowGlyphMetrics.localFirstCellWidth, rowGlyphMetrics.actualFirstCellWidth),
  };
  const glyphDecision = decideGlyphModel({
    widthDeltas,
    fontSignals,
    rowGlyphMetrics,
    candidateEvidence,
    intrinsicFixture,
  });

  return {
    fixtureId,
    status: 'COMPARED',
    glyphDecision,
    nextAction: nextAction(glyphDecision),
    intrinsicDecision: intrinsicFixture?.intrinsicDecision ?? '',
    styleFindings: styleFixture?.findings ?? [],
    widthDeltas,
    fontSignals,
    rowGlyphMetrics,
    candidateEvidence,
    evidence: evidenceNotes({ widthDeltas, fontSignals, rowGlyphMetrics, candidateEvidence }),
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

function decideGlyphModel({ widthDeltas, fontSignals, rowGlyphMetrics, candidateEvidence, intrinsicFixture }) {
  const intrinsicDecision = intrinsicFixture?.intrinsicDecision ?? '';
  if (!intrinsicDecision || intrinsicDecision === 'INTRINSIC_WIDTH_SECONDARY_OR_ACCEPTABLE') {
    return 'GLYPH_MODEL_SECONDARY_OR_ACCEPTABLE';
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

function nextAction(decision) {
  switch (decision) {
    case 'FONT_AVAILABILITY_CHANGED_CANDIDATES_REJECTED':
      return 'capture actual/local per-font measureText widths and CSSOM font-face activation; broad font fallback candidates already regress';
    case 'FONT_STYLE_CHANGED_CANDIDATES_REJECTED':
      return 'compare exact font stack activation and text measurement sidecars instead of applying broad Proxima/typography CSS';
    case 'TEXT_MEASUREMENT_MODEL_REQUIRED':
      return 'add per-row/per-cell text measurement probes for the actual computed font stack';
    case 'FONT_GLYPH_MODEL_REQUIRED':
      return 'capture loaded font and glyph width evidence before another renderer candidate';
    default:
      return 'keep font/glyph as secondary evidence';
  }
}

function evidenceNotes({ widthDeltas, fontSignals, rowGlyphMetrics, candidateEvidence }) {
  const notes = [];
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
    '',
    '| Fixture | Decision | Table Δ | Font availability | Table font changed | Font candidates | Evidence | Next |',
    '| --- | --- | ---: | --- | --- | --- | --- | --- |',
  ];
  for (const fixture of report.fixtures) {
    lines.push(`| \`${fixture.fixtureId}\` | ${fixture.glyphDecision} | ${fmtPx(fixture.widthDeltas?.table)} | ${fixture.fontSignals?.fontAvailabilityChanged ? 'changed' : 'same'} | ${fixture.fontSignals?.tableFontFamilyChanged ? 'yes' : 'no'} | ${fixture.candidateEvidence?.fontCandidatesRejected ? 'rejected/no-gain' : 'not rejected'} | ${(fixture.evidence ?? []).join('<br>')} | ${fixture.nextAction ?? ''} |`);
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
  if (fixtureId === 'official-roll20-AW2E') return 'aw2e';
  if (fixtureId === 'official-roll20-Les-Oublies') return 'lesOublies';
  if (fixtureId === 'yshy-commission-1bu') return 'yshy';
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

await main();
