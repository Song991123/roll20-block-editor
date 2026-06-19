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
  const actualSidecarFile = path.join(runDir, 'local-baseline', fixtureId, 'screenshots', 'roll20-chat-dom-evidence.json');
  const actualSidecar = await readJsonIfExists(actualSidecarFile);
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
  rows.push({
    fixtureId,
    status: 'COMPARED',
    localRowCount: localRows.length,
    actualRowCount: actualRows.length,
    comparedRows: rowCount,
    maxAbsTopDelta,
    maxAbsHeightDelta,
    deltas,
  });
}

await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, 'chat-row-geometry-results.json'), `${JSON.stringify({ runDir: runDirArg, localSmoke: localSmokeArg, generatedAt: new Date().toISOString(), fixtures: rows }, null, 2)}\n`, 'utf8');
await writeFile(path.join(outDir, 'chat-row-geometry-results.md'), renderMarkdown(runDirArg, localSmokeArg, rows), 'utf8');

for (const row of rows) {
  console.log(`${row.status} ${row.fixtureId} ${row.comparedRows ? `rows=${row.comparedRows} maxTop=${row.maxAbsTopDelta}` : row.reason}`);
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

function renderMarkdown(runDirLabel, localSmokeLabel, fixtures) {
  const lines = [
    '# Roll20 Chat Row Geometry',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Run: \`${runDirLabel}\``,
    `Local smoke: \`${localSmokeLabel}\``,
    '',
    '| Fixture | Status | Local rows | Actual rows | Compared | Max top delta | Max height delta | Note |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |',
  ];
  for (const fixture of fixtures) {
    lines.push(`| \`${fixture.fixtureId}\` | ${fixture.status} | ${fixture.localRowCount ?? ''} | ${fixture.actualRowCount ?? ''} | ${fixture.comparedRows ?? ''} | ${fixture.maxAbsTopDelta ?? ''} | ${fixture.maxAbsHeightDelta ?? ''} | ${fixture.reason ?? ''} |`);
  }
  lines.push('');
  lines.push('Rows can only be compared after actual Roll20 chat sidecars are recaptured with rowMetrics.');
  return `${lines.join('\n')}\n`;
}
