#!/usr/bin/env node
/**
 * Diagnose Roll20 chat rolltemplate intrinsic table width.
 *
 * Diagnostic only. This script explains why a visually promising width/scale
 * candidate is not enough when actual Roll20 computed styles contradict it.
 * It compares local ChatPane row/cell/table metrics with actual Roll20 chat DOM
 * sidecars and classifies whether the next model should target intrinsic table
 * allocation, CSS activation/sanitize, or capture evidence.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const runDirArg = args[0] ?? 'reports/roll20-actual-compare/2026-06-18-state-map-v1';
const runDir = path.resolve(runDirArg);
const localSmokeArg = args[1] ?? 'reports/rolltemplate-chat-smoke/rolltemplate-chat-smoke-results.json';
const localSmokePath = path.resolve(localSmokeArg);
const outDir = path.join(runDir, 'chat-intrinsic-width-model');

async function main() {
  const localSmoke = await readJson(localSmokePath);
  const parity = await readOptionalJson(path.join(runDir, 'chat-parity-diagnostics', 'chat-parity-diagnostics-results.json'));
  const styleProof = await readOptionalJson(path.join(runDir, 'chat-candidate-style-proof', 'chat-candidate-style-proof-results.json'));
  const widthModel = await readOptionalJson(path.join(runDir, 'chat-width-model', 'chat-width-model-results.json'));
  const fixtures = [];

  for (const localFixture of localSmoke.fixtures ?? []) {
    fixtures.push(await compareFixture(localFixture, { parity, styleProof, widthModel }));
  }

  const compared = fixtures.filter((fixture) => fixture.status === 'COMPARED');
  const actionable = compared.filter((fixture) => fixture.intrinsicDecision !== 'INTRINSIC_WIDTH_SECONDARY_OR_ACCEPTABLE');
  const report = {
    generatedAt: new Date().toISOString(),
    runDir: runDirArg,
    localSmoke: localSmokeArg,
    scope: 'diagnostic-only intrinsic rolltemplate table width model',
    summary: {
      status: actionable.length ? 'INTRINSIC_WIDTH_MODEL_REQUIRED' : 'INTRINSIC_WIDTH_SECONDARY',
      fixtures: fixtures.length,
      compared: compared.length,
      actionable: actionable.length,
      decisions: countBy(compared.map((fixture) => fixture.intrinsicDecision)),
      transformContradicted: compared.filter((fixture) => fixture.styleProof?.transformContradicted).map((fixture) => fixture.fixtureId),
      productionSafe: false,
    },
    fixtures,
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'chat-intrinsic-width-model-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'chat-intrinsic-width-model-results.md'), renderMarkdown(report), 'utf8');

  console.log(`ROLL20 CHAT INTRINSIC WIDTH MODEL ${report.summary.status}`);
  for (const fixture of fixtures) {
    console.log(`FIXTURE ${fixture.fixtureId} status=${fixture.status} decision=${fixture.intrinsicDecision ?? ''} tableDelta=${fmtPx(fixture.deltas?.tableWidthDelta)} firstCellDelta=${fmtPx(fixture.rowCellDeltas?.firstCellWidthDelta)} transformContradicted=${fixture.styleProof?.transformContradicted ? 'YES' : 'NO'} next=${fixture.nextAction ?? ''}`);
  }
  console.log(`out=${path.relative(process.cwd(), outDir)}`);
}

async function compareFixture(localFixture, reports) {
  const fixtureId = localFixture.id;
  const actualPath = path.join(runDir, 'local-baseline', fixtureId, 'screenshots', 'roll20-chat-dom-evidence.json');
  const actualSidecar = await readOptionalJson(actualPath);
  const local = extractTemplate(localFixture?.cardInfo?.templateComputed, {
    shellWidth: localFixture?.cardInfo?.width,
    cropWidth: localFixture?.cardInfo?.templateScreenshot?.width ?? localFixture?.cardInfo?.templateWidth,
  });
  const actual = extractTemplate(actualSidecar?.latestTemplate, {
    shellWidth: actualSidecar?.latestMessage?.rect?.width ?? actualSidecar?.chatRect?.width,
    cropWidth: actualSidecar?.clip?.width ?? actualSidecar?.screenshotClipApplied?.width,
  });

  if (!local || !actual) {
    return {
      fixtureId,
      status: 'MISSING',
      localAvailable: Boolean(local),
      actualAvailable: Boolean(actual),
      intrinsicDecision: 'MISSING_INTRINSIC_EVIDENCE',
      nextAction: 'recapture local smoke or actual Roll20 chat DOM sidecar with row/cell metrics',
    };
  }

  const parityFixture = findByFixtureId(reports.parity?.fixtures, fixtureId);
  const widthFixture = findByFixtureId(reports.widthModel?.fixtures, fixtureId);
  const styleProof = extractStyleProof(reports.styleProof, fixtureId);
  const deltas = {
    rootWidthDelta: delta(local.root.width, actual.root.width),
    tableWidthDelta: delta(local.table.width, actual.table.width),
    tableHeightDelta: delta(local.table.height, actual.table.height),
    tableComputedWidthDelta: delta(local.table.computedWidth, actual.table.computedWidth),
    captionWidthDelta: delta(local.caption?.width, actual.caption?.width),
    fontSizeDelta: delta(local.table.fontSize, actual.table.fontSize),
    lineHeightDelta: delta(local.table.lineHeight, actual.table.lineHeight),
    borderSpacingXDelta: delta(local.table.borderSpacingX, actual.table.borderSpacingX),
    letterSpacingDelta: delta(local.table.letterSpacing, actual.table.letterSpacing),
    shellWidthDelta: delta(local.shell.width, actual.shell.width),
    cropWidthDelta: delta(local.crop.width, actual.crop.width),
  };
  const rowCellDeltas = compareRows(local.rows, actual.rows);
  const ratios = {
    actualVsLocalTableWidth: ratio(actual.table.width, local.table.width),
    actualVsLocalFirstCellWidth: ratio(rowCellDeltas.actualFirstCellWidth, rowCellDeltas.localFirstCellWidth),
    localTableVsCrop: ratio(local.table.width, local.crop.width),
    actualTableVsCrop: ratio(actual.table.width, actual.crop.width),
  };
  const intrinsicDecision = decideIntrinsic({ deltas, rowCellDeltas, styleProof, parityFixture, widthFixture, local, actual });

  return {
    fixtureId,
    status: 'COMPARED',
    intrinsicDecision,
    nextAction: nextAction(intrinsicDecision),
    parity: {
      bestAlignedMismatchPct: parityFixture?.bestAlignedMismatchPct ?? '',
      bestAlignedMismatchRatio: parityFixture?.bestAlignedMismatchRatio ?? null,
    },
    widthDecision: widthFixture?.widthDecision ?? '',
    styleProof,
    local,
    actual,
    deltas,
    rowCellDeltas,
    ratios,
    evidence: evidenceNotes({ deltas, rowCellDeltas, ratios, styleProof, local, actual }),
  };
}

function extractTemplate(template, options = {}) {
  const table = findChild(template, 'table');
  if (!template?.computedStyle || !table?.rect) return null;
  const caption = findChild(template, 'caption');
  return {
    shell: {
      width: numberOrNull(options.shellWidth),
    },
    crop: {
      width: numberOrNull(options.cropWidth) ?? numberOrNull(template?.rect?.width) ?? px(template.computedStyle.width),
    },
    root: {
      width: numberOrNull(template?.rect?.width) ?? px(template.computedStyle.width),
      className: template.className ?? '',
      fontFamily: normalizeCssValue(template.computedStyle.fontFamily),
      fontSize: px(template.computedStyle.fontSize),
      lineHeight: px(template.computedStyle.lineHeight),
      letterSpacing: cssLength(template.computedStyle.letterSpacing),
      transform: normalizeCssValue(template.computedStyle.transform),
    },
    table: extractElement(table),
    caption: caption ? extractElement(caption) : null,
    rows: (template.rowMetrics ?? []).map((row) => ({
      index: row.index,
      text: row.text ?? '',
      width: numberOrNull(row.rect?.width),
      height: numberOrNull(row.rect?.height),
      cells: (row.cells ?? []).map((cell) => ({
        index: cell.index,
        className: cell.className ?? '',
        tagName: cell.tagName ?? '',
        text: cell.text ?? '',
        width: numberOrNull(cell.rect?.width),
        height: numberOrNull(cell.rect?.height),
      })),
    })),
  };
}

function extractElement(element) {
  return {
    selector: element.selector ?? '',
    tagName: element.tagName ?? '',
    className: element.className ?? '',
    textLength: String(element.text ?? '').length,
    width: numberOrNull(element.rect?.width),
    height: numberOrNull(element.rect?.height),
    computedWidth: px(element.computedStyle?.width),
    computedHeight: px(element.computedStyle?.height),
    fontFamily: normalizeCssValue(element.computedStyle?.fontFamily),
    fontSize: px(element.computedStyle?.fontSize),
    lineHeight: px(element.computedStyle?.lineHeight),
    letterSpacing: cssLength(element.computedStyle?.letterSpacing),
    borderSpacingX: firstCssLength(element.computedStyle?.borderSpacing),
    borderSpacing: normalizeCssValue(element.computedStyle?.borderSpacing),
    tableLayout: normalizeCssValue(element.computedStyle?.tableLayout),
    transform: normalizeCssValue(element.computedStyle?.transform),
    overflowWrap: normalizeCssValue(element.computedStyle?.overflowWrap),
    wordBreak: normalizeCssValue(element.computedStyle?.wordBreak),
    textRendering: normalizeCssValue(element.computedStyle?.textRendering),
    webkitFontSmoothing: normalizeCssValue(element.computedStyle?.webkitFontSmoothing),
    textShadow: normalizeCssValue(element.computedStyle?.textShadow),
  };
}

function compareRows(localRows, actualRows) {
  const rows = [];
  const max = Math.max(localRows?.length ?? 0, actualRows?.length ?? 0);
  for (let index = 0; index < max; index += 1) {
    const localRow = localRows?.[index] ?? null;
    const actualRow = actualRows?.[index] ?? null;
    const cells = [];
    const cellMax = Math.max(localRow?.cells?.length ?? 0, actualRow?.cells?.length ?? 0);
    for (let cellIndex = 0; cellIndex < cellMax; cellIndex += 1) {
      const localCell = localRow?.cells?.[cellIndex] ?? null;
      const actualCell = actualRow?.cells?.[cellIndex] ?? null;
      cells.push({
        index: cellIndex,
        localText: localCell?.text ?? '',
        actualText: actualCell?.text ?? '',
        textMatches: (localCell?.text ?? '') === (actualCell?.text ?? ''),
        localWidth: localCell?.width ?? null,
        actualWidth: actualCell?.width ?? null,
        widthDelta: delta(localCell?.width, actualCell?.width),
        localHeight: localCell?.height ?? null,
        actualHeight: actualCell?.height ?? null,
        heightDelta: delta(localCell?.height, actualCell?.height),
        localClassName: localCell?.className ?? '',
        actualClassName: actualCell?.className ?? '',
      });
    }
    rows.push({
      index,
      localText: localRow?.text ?? '',
      actualText: actualRow?.text ?? '',
      textMatches: (localRow?.text ?? '') === (actualRow?.text ?? ''),
      localWidth: localRow?.width ?? null,
      actualWidth: actualRow?.width ?? null,
      widthDelta: delta(localRow?.width, actualRow?.width),
      localHeight: localRow?.height ?? null,
      actualHeight: actualRow?.height ?? null,
      heightDelta: delta(localRow?.height, actualRow?.height),
      localCellCount: localRow?.cells?.length ?? 0,
      actualCellCount: actualRow?.cells?.length ?? 0,
      cells,
    });
  }
  const comparableCells = rows.flatMap((row) => row.cells).filter((cell) => cell.widthDelta != null);
  const firstCell = rows[0]?.cells?.[0] ?? null;
  return {
    localRowCount: localRows?.length ?? 0,
    actualRowCount: actualRows?.length ?? 0,
    rowCountDelta: (actualRows?.length ?? 0) - (localRows?.length ?? 0),
    textMismatchRows: rows.filter((row) => !row.textMatches).map((row) => row.index),
    cellCountMismatchRows: rows.filter((row) => row.localCellCount !== row.actualCellCount).map((row) => row.index),
    maxAbsCellWidthDelta: maxAbs(comparableCells.map((cell) => cell.widthDelta)),
    meanAbsCellWidthDelta: meanAbs(comparableCells.map((cell) => cell.widthDelta)),
    firstCellWidthDelta: firstCell?.widthDelta ?? null,
    localFirstCellWidth: firstCell?.localWidth ?? null,
    actualFirstCellWidth: firstCell?.actualWidth ?? null,
    rows: rows.slice(0, 12),
  };
}

function extractStyleProof(styleProof, fixtureId) {
  const candidates = [];
  for (const candidate of styleProof?.candidates ?? []) {
    const fixture = findByFixtureId(candidate.fixtures, fixtureId);
    if (!fixture) continue;
    const transformContradicted = candidate.name === 'coc-table-scale-x' && fixture.status === 'CONTRADICTED_BY_ACTUAL_STYLE';
    candidates.push({
      name: candidate.name,
      styleProofStatus: candidate.styleProofStatus ?? '',
      fixtureStatus: fixture.status ?? '',
      finding: fixture.finding ?? '',
      transformContradicted,
      evidence: (fixture.evidence ?? []).map((item) => ({
        selector: item.selector,
        key: item.key,
        localCandidate: item.localCandidate,
        actual: item.actual,
      })),
    });
  }
  return {
    transformContradicted: candidates.some((candidate) => candidate.transformContradicted),
    contradictedCandidates: candidates.filter((candidate) => candidate.fixtureStatus === 'CONTRADICTED_BY_ACTUAL_STYLE').map((candidate) => candidate.name),
    candidates,
  };
}

function decideIntrinsic({ deltas, rowCellDeltas, styleProof, parityFixture, widthFixture, local, actual }) {
  const highMismatch = Number(parityFixture?.bestAlignedMismatchRatio ?? 0) > 0.1;
  if (!highMismatch && Math.abs(deltas.tableWidthDelta ?? 0) < 8) return 'INTRINSIC_WIDTH_SECONDARY_OR_ACCEPTABLE';
  if (styleProof.transformContradicted && Math.abs(deltas.tableWidthDelta ?? 0) >= 8) {
    return 'TRANSFORM_REJECTED_INTRINSIC_WIDTH_MODEL_REQUIRED';
  }
  if (Math.abs(deltas.borderSpacingXDelta ?? 0) >= 0.5 || Math.abs(deltas.letterSpacingDelta ?? 0) >= 0.1) {
    return 'CSS_METRIC_DELTA_INTRINSIC_MODEL_REQUIRED';
  }
  if (rowCellDeltas.textMismatchRows.length || rowCellDeltas.cellCountMismatchRows.length) {
    return 'ROW_CONTENT_OR_CELL_COUNT_MODEL_REQUIRED';
  }
  if (Math.abs(rowCellDeltas.meanAbsCellWidthDelta ?? 0) >= 1) return 'CELL_ALLOCATION_INTRINSIC_MODEL_REQUIRED';
  if (Math.abs(deltas.tableWidthDelta ?? 0) >= 8 || widthFixture?.widthDecision === 'TABLE_WIDTH_MODEL_REQUIRED') {
    if (local.table.fontFamily !== actual.table.fontFamily || Math.abs(deltas.fontSizeDelta ?? 0) >= 0.5) {
      return 'FONT_GLYPH_INTRINSIC_MODEL_REQUIRED';
    }
    return 'TABLE_INTRINSIC_WIDTH_MODEL_REQUIRED';
  }
  return 'INTRINSIC_WIDTH_SECONDARY_OR_ACCEPTABLE';
}

function nextAction(decision) {
  switch (decision) {
    case 'TRANSFORM_REJECTED_INTRINSIC_WIDTH_MODEL_REQUIRED':
      return 'do not promote scaleX; compare Roll20 sanitize/CSS activation, border-spacing, letter-spacing, and font glyph metrics for the table';
    case 'CSS_METRIC_DELTA_INTRINSIC_MODEL_REQUIRED':
      return 'model CSS metric deltas such as border-spacing/letter-spacing before another visual width candidate';
    case 'ROW_CONTENT_OR_CELL_COUNT_MODEL_REQUIRED':
      return 'fix row/cell/content preservation before width CSS; geometry is comparing different tables';
    case 'CELL_ALLOCATION_INTRINSIC_MODEL_REQUIRED':
      return 'build a cell allocation probe for column widths and first-row cell deltas';
    case 'FONT_GLYPH_INTRINSIC_MODEL_REQUIRED':
      return 'capture/compare loaded font glyph metrics rather than scaling the rendered table';
    case 'TABLE_INTRINSIC_WIDTH_MODEL_REQUIRED':
      return 'derive intrinsic table sizing from actual Roll20 table metrics before changing ChatPane width or overflow';
    default:
      return 'keep intrinsic width as secondary evidence';
  }
}

function evidenceNotes({ deltas, rowCellDeltas, ratios, styleProof, local, actual }) {
  const notes = [];
  if (styleProof.transformContradicted) notes.push('actual Roll20 table transform is none; scaleX candidate rejected');
  if (Math.abs(deltas.tableWidthDelta ?? 0) >= 8) notes.push(`table width delta ${fmtPx(deltas.tableWidthDelta)}`);
  if (Math.abs(deltas.fontSizeDelta ?? 0) >= 0.5) notes.push(`table font-size delta ${fmtPx(deltas.fontSizeDelta)}`);
  if (Math.abs(deltas.letterSpacingDelta ?? 0) >= 0.1) notes.push(`letter-spacing delta ${fmtPx(deltas.letterSpacingDelta)}`);
  if (Math.abs(deltas.borderSpacingXDelta ?? 0) >= 0.5) notes.push(`border-spacing-x delta ${fmtPx(deltas.borderSpacingXDelta)}`);
  if (rowCellDeltas.firstCellWidthDelta != null) notes.push(`first cell width delta ${fmtPx(rowCellDeltas.firstCellWidthDelta)}`);
  if (rowCellDeltas.textMismatchRows.length) notes.push(`row text mismatch rows ${rowCellDeltas.textMismatchRows.join(',')}`);
  if (local.table.fontFamily !== actual.table.fontFamily) notes.push('table font-family differs');
  if (ratios.actualVsLocalTableWidth != null) notes.push(`actual/local table width ${fmtRatio(ratios.actualVsLocalTableWidth)}`);
  return notes;
}

function renderMarkdown(report) {
  const lines = [
    '# Roll20 Chat Intrinsic Width Model',
    '',
    `Generated: ${report.generatedAt}`,
    `Run: \`${report.runDir}\``,
    '',
    'Scope: diagnostic-only intrinsic table-width model. This report does not enable production ChatPane CSS.',
    '',
    `Status: ${report.summary.status}`,
    '',
    '| Fixture | Decision | Mismatch | Table Δ | First cell Δ | Font Δ | Letter Δ | Border spacing Δ | Transform proof | Evidence | Next |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |',
  ];
  for (const fixture of report.fixtures) {
    lines.push(`| \`${fixture.fixtureId}\` | ${fixture.intrinsicDecision} | ${fixture.parity?.bestAlignedMismatchPct ?? ''} | ${fmtPx(fixture.deltas?.tableWidthDelta)} | ${fmtPx(fixture.rowCellDeltas?.firstCellWidthDelta)} | ${fmtPx(fixture.deltas?.fontSizeDelta)} | ${fmtPx(fixture.deltas?.letterSpacingDelta)} | ${fmtPx(fixture.deltas?.borderSpacingXDelta)} | ${fixture.styleProof?.transformContradicted ? 'rejected' : 'n/a'} | ${(fixture.evidence ?? []).join('<br>')} | ${fixture.nextAction ?? ''} |`);
  }
  lines.push('', '## Claim Boundary', '');
  lines.push('- Pixel-improving transform/scale candidates are rejected when actual Roll20 computed styles show no transform.');
  lines.push('- This report narrows the next model; it does not prove Roll20 chat visual parity.');
  lines.push('- Do not commit generated report output; keep it local-only under `reports/`.');
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

function findByFixtureId(fixtures, fixtureId) {
  return (fixtures ?? []).find((fixture) => fixture.fixtureId === fixtureId || fixture.id === fixtureId);
}

function findChild(template, selector) {
  return (template?.computedChildren ?? []).find((child) => child.selector === selector || child.tagName?.toLowerCase?.() === selector);
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

function px(value) {
  const number = cssLength(value);
  return Number.isFinite(number) ? number : null;
}

function cssLength(value) {
  if (value == null || value === '' || value === 'normal') return 0;
  const match = String(value).match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function firstCssLength(value) {
  const match = String(value ?? '').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeCssValue(value) {
  return String(value ?? '').trim();
}

function countBy(values) {
  const out = {};
  for (const value of values) out[value || 'unknown'] = (out[value || 'unknown'] ?? 0) + 1;
  return out;
}

function maxAbs(values) {
  const numbers = values.map(Number).filter(Number.isFinite);
  return numbers.length ? Number(Math.max(...numbers.map(Math.abs)).toFixed(3)) : null;
}

function meanAbs(values) {
  const numbers = values.map(Number).filter(Number.isFinite);
  if (!numbers.length) return null;
  return Number((numbers.reduce((sum, value) => sum + Math.abs(value), 0) / numbers.length).toFixed(3));
}

function fmtPx(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '';
  return `${number > 0 ? '+' : ''}${Number(number.toFixed(3))}px`;
}

function fmtRatio(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '';
  return `${Number(number.toFixed(3))}x`;
}

await main();
