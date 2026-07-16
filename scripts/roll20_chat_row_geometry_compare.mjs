import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const [
  runDirArg = 'reports/roll20-actual-compare/2026-06-18-state-map-v1',
  localSmokeArg = 'reports/rolltemplate-chat-smoke/rolltemplate-chat-smoke-results.json',
] = args;

const runDir = path.resolve(runDirArg);
const localSmokeFile = path.resolve(localSmokeArg);
const outDir = path.join(runDir, 'chat-row-geometry');

const fixtureIds = ['official-roll20-AW2E', 'official-roll20-Les-Oublies', 'yshy-commission-1bu'];

const localSmoke = existsSync(localSmokeFile) ? JSON.parse(await readFile(localSmokeFile, 'utf8')) : null;
const rows = [];

for (const fixtureId of fixtureIds) {
  const localFixture = localSmoke?.fixtures?.find((fixture) => fixture.id === fixtureId);
  const localRows = localFixture?.cardInfo?.templateComputed?.rowMetrics ?? null;
  const localTemplate = localFixture?.cardInfo?.templateComputed ?? null;
  const localTable = localTemplate?.computedChildren?.find((child) => child.selector === 'table') ?? null;
  const actualSidecarFile = path.join(runDir, 'local-baseline', fixtureId, 'screenshots', 'roll20-chat-dom-evidence.json');
  const actualSidecar = await readJsonIfExists(actualSidecarFile);
  const actualTemplate = actualSidecar?.latestTemplate
    ?? [...(actualSidecar?.rolltemplates ?? [])].reverse().find((template) => template?.rect?.width)
    ?? null;
  const actualTable = findTemplateChild(actualTemplate, 'table');
  const actualRows = actualSidecar?.latestTemplate?.rowMetrics
    ?? [...(actualSidecar?.rolltemplates ?? [])].reverse().find((template) => Array.isArray(template?.rowMetrics))?.rowMetrics
    ?? null;

  if (!Array.isArray(localRows) || !localRows.length) {
    rows.push({ fixtureId, status: 'NEEDS_LOCAL_SMOKE', reason: 'local rolltemplate smoke has no rowMetrics' });
    continue;
  }
  if (!Array.isArray(actualRows) || !actualRows.length) {
    rows.push({ fixtureId, status: 'NEEDS_RECAPTURE', reason: 'actual Roll20 chat sidecar has no rowMetrics; recapture with current plan:roll20-chat-capture probe', localRowCount: localRows.length });
    continue;
  }

  const rowCount = Math.min(localRows.length, actualRows.length);
  const deltas = [];
  for (let index = 0; index < rowCount; index += 1) {
    const local = localRows[index];
    const actual = actualRows[index];
    deltas.push({
      index,
      localText: local.text ?? '',
      actualText: actual.text ?? '',
      topDelta: delta(local.rect?.top, actual.rect?.top),
      heightDelta: delta(local.rect?.height, actual.rect?.height),
      widthDelta: delta(local.rect?.width, actual.rect?.width),
      firstCellWidthDelta: delta(local.cells?.[0]?.rect?.width, actual.cells?.[0]?.rect?.width),
      secondCellWidthDelta: delta(local.cells?.[1]?.rect?.width, actual.cells?.[1]?.rect?.width),
    });
  }

  const maxAbsTopDelta = maxAbs(deltas.map((row) => row.topDelta));
  const maxAbsHeightDelta = maxAbs(deltas.map((row) => row.heightDelta));
  const maxAbsWidthDelta = maxAbs(deltas.map((row) => row.widthDelta));
  const rowModel = classifyRowGeometry(deltas);
  rows.push({
    fixtureId,
    status: 'COMPARED',
    localRowCount: localRows.length,
    actualRowCount: actualRows.length,
    comparedRows: rowCount,
    maxAbsTopDelta,
    maxAbsHeightDelta,
    maxAbsWidthDelta,
    rowModel,
    templateMetrics: compareTemplateMetrics(localTemplate, actualTemplate, localTable, actualTable),
    deltas,
  });
}

await mkdir(outDir, { recursive: true });
const report = {
  runDir: runDirArg,
  localSmoke: localSmokeArg,
  generatedAt: new Date().toISOString(),
  summary: summarizeRows(rows),
  fixtures: rows,
};
await writeFile(path.join(outDir, 'chat-row-geometry-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeFile(path.join(outDir, 'chat-row-geometry-results.md'), renderMarkdown(runDirArg, localSmokeArg, rows), 'utf8');

for (const row of rows) {
  console.log(`${row.status} ${row.fixtureId} ${row.comparedRows ? `rows=${row.comparedRows} model=${row.rowModel?.decision} maxTop=${row.maxAbsTopDelta} maxWidth=${row.maxAbsWidthDelta}` : row.reason}`);
}
console.log(`out=${path.relative(process.cwd(), outDir)}`);

async function readJsonIfExists(file) {
  if (!existsSync(file)) return null;
  try {
    return JSON.parse((await readFile(file, 'utf8')).replace(/^\uFEFF/, ''));
  } catch {
    return null;
  }
}

function delta(local, actual) {
  if (typeof local !== 'number' || typeof actual !== 'number') return null;
  return Number((local - actual).toFixed(3));
}

function maxAbs(values) {
  const finite = values.filter((value) => typeof value === 'number' && Number.isFinite(value));
  return finite.length ? Math.max(...finite.map((value) => Math.abs(value))) : null;
}

function spread(values) {
  const finite = values.filter((value) => typeof value === 'number' && Number.isFinite(value));
  if (finite.length < 2) return 0;
  return Number((Math.max(...finite) - Math.min(...finite)).toFixed(3));
}

function meanAbs(values) {
  const finite = values.filter((value) => typeof value === 'number' && Number.isFinite(value));
  if (!finite.length) return null;
  return Number((finite.reduce((sum, value) => sum + Math.abs(value), 0) / finite.length).toFixed(3));
}

function classifyRowGeometry(deltas) {
  const topSpread = spread(deltas.map((row) => row.topDelta));
  const widthSpread = spread(deltas.map((row) => row.widthDelta));
  const maxAbsTopDelta = maxAbs(deltas.map((row) => row.topDelta));
  const maxAbsHeightDelta = maxAbs(deltas.map((row) => row.heightDelta));
  const maxAbsWidthDelta = maxAbs(deltas.map((row) => row.widthDelta));
  const maxAbsCellDelta = maxAbs(deltas.flatMap((row) => [row.firstCellWidthDelta, row.secondCellWidthDelta]));
  const meanAbsCellDelta = meanAbs(deltas.flatMap((row) => [row.firstCellWidthDelta, row.secondCellWidthDelta]));
  const textMismatchRows = deltas.filter((row) => row.localText !== row.actualText).map((row) => row.index);
  const uniformTopOffset = Number(maxAbsTopDelta ?? 0) >= 8 && Number(topSpread ?? Infinity) <= 2;
  const stableHeights = Number(maxAbsHeightDelta ?? 0) <= 2;
  const uniformWidthDelta = Number(maxAbsWidthDelta ?? 0) >= 8 && Number(widthSpread ?? Infinity) <= 0.75;
  const smallCellDeltas = Number(maxAbsCellDelta ?? 0) < 2;
  const meaningfulCellDeltas = Number(maxAbsCellDelta ?? 0) >= 2;

  let decision = 'ROW_GEOMETRY_SECONDARY';
  let nextAction = 'keep row geometry secondary; inspect other renderer axes first';
  if (textMismatchRows.length) {
    decision = 'ROW_TEXT_MISMATCH';
    nextAction = 'fix rolltemplate row/text parity before comparing visual CSS';
  } else if (uniformTopOffset && stableHeights && uniformWidthDelta && smallCellDeltas) {
    decision = 'TABLE_WIDE_WIDTH_WITH_UNIFORM_OFFSET';
    nextAction = 'model table-wide intrinsic width or crop origin; cell allocation is not the primary cause';
  } else if (uniformTopOffset && stableHeights && uniformWidthDelta && meaningfulCellDeltas) {
    decision = 'CELL_ALLOCATION_WITH_UNIFORM_OFFSET';
    nextAction = 'compare table cell allocation and exact text metrics; top shift is uniform and likely crop/context';
  } else if (uniformTopOffset && stableHeights && Number(maxAbsWidthDelta ?? 0) < 2) {
    decision = 'UNIFORM_OFFSET_PAINT_OR_CROP';
    nextAction = 'treat width as secondary; inspect crop origin, shadow/border paint, and shell context';
  } else if (Number(maxAbsHeightDelta ?? 0) >= 4) {
    decision = 'ROW_HEIGHT_ACCUMULATION';
    nextAction = 'compare row line-height, padding, border, and content wrapping before width CSS';
  } else if (Number(maxAbsWidthDelta ?? 0) >= 8) {
    decision = 'NON_UNIFORM_WIDTH_GEOMETRY';
    nextAction = 'compare per-row/per-cell width allocation before global ChatPane CSS';
  }

  return {
    decision,
    nextAction,
    uniformTopOffset,
    stableHeights,
    uniformWidthDelta,
    smallCellDeltas,
    textMismatchRows,
    topSpread,
    widthSpread,
    maxAbsTopDelta,
    maxAbsHeightDelta,
    maxAbsWidthDelta,
    maxAbsCellDelta,
    meanAbsCellDelta,
  };
}

function compareTemplateMetrics(localTemplate, actualTemplate, localTable, actualTable) {
  return {
    templateWidthDelta: delta(localTemplate?.computedStyleNumberWidth ?? numberFromCssPx(localTemplate?.computedStyle?.width), actualTemplate?.rect?.width),
    templateHeightDelta: delta(numberFromCssPx(localTemplate?.computedStyle?.height), actualTemplate?.rect?.height),
    tableRectWidthDelta: delta(localTable?.rect?.width, actualTable?.rect?.width),
    tableScrollWidthDelta: delta(localTable?.boxMetrics?.scrollWidth, actualTable?.boxMetrics?.scrollWidth),
    tableOffsetWidthDelta: delta(localTable?.boxMetrics?.offsetWidth, actualTable?.boxMetrics?.offsetWidth),
    styleDeltas: {
      tableLayout: stylePair(localTable, actualTable, 'tableLayout'),
      borderCollapse: stylePair(localTable, actualTable, 'borderCollapse'),
      borderSpacing: stylePair(localTable, actualTable, 'borderSpacing'),
      fontFamily: stylePair(localTable, actualTable, 'fontFamily'),
      fontSize: stylePair(localTable, actualTable, 'fontSize'),
      fontKerning: stylePair(localTable, actualTable, 'fontKerning'),
      letterSpacing: stylePair(localTable, actualTable, 'letterSpacing'),
      transform: stylePair(localTable, actualTable, 'transform'),
      zoom: stylePair(localTable, actualTable, 'zoom'),
    },
  };
}

function findTemplateChild(template, selector) {
  return (template?.computedChildren ?? template?.elements ?? [])
    .find((child) => child?.selector === selector || child?.tagName?.toLowerCase?.() === selector)
    ?? null;
}

function stylePair(localElement, actualElement, key) {
  const local = localElement?.computedStyle?.[key] ?? null;
  const actual = actualElement?.computedStyle?.[key] ?? null;
  return local === actual ? null : { local, actual };
}

function numberFromCssPx(value) {
  if (typeof value === 'number') return value;
  const match = String(value ?? '').match(/^-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function renderMarkdown(runDirLabel, localSmokeLabel, fixtures) {
  const lines = [
    '# Roll20 Chat Row Geometry',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Run: \`${runDirLabel}\``,
    `Local smoke: \`${localSmokeLabel}\``,
    '',
    '| Fixture | Status | Model | Local rows | Actual rows | Compared | Max top delta | Max height delta | Max width delta | Cell max delta | Table width delta | Next |',
    '| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |',
  ];
  for (const fixture of fixtures) {
    lines.push(`| \`${fixture.fixtureId}\` | ${fixture.status} | ${fixture.rowModel?.decision ?? ''} | ${fixture.localRowCount ?? ''} | ${fixture.actualRowCount ?? ''} | ${fixture.comparedRows ?? ''} | ${fixture.maxAbsTopDelta ?? ''} | ${fixture.maxAbsHeightDelta ?? ''} | ${fixture.maxAbsWidthDelta ?? ''} | ${fixture.rowModel?.maxAbsCellDelta ?? ''} | ${fixture.templateMetrics?.tableRectWidthDelta ?? ''} | ${fixture.rowModel?.nextAction ?? fixture.reason ?? ''} |`);
  }
  lines.push('');
  lines.push('Rows can only be compared after actual Roll20 chat sidecars are recaptured with rowMetrics.');
  return `${lines.join('\n')}\n`;
}

function summarizeRows(fixtures) {
  const compared = fixtures.filter((fixture) => fixture.status === 'COMPARED');
  return {
    status: compared.length ? 'ROW_GEOMETRY_COMPARED' : 'ROW_GEOMETRY_MISSING',
    fixtures: fixtures.length,
    compared: compared.length,
    decisions: countBy(compared.map((fixture) => fixture.rowModel?.decision ?? 'UNKNOWN')),
    productionSafe: false,
  };
}

function countBy(values) {
  const counts = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return counts;
}
