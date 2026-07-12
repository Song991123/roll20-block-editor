#!/usr/bin/env node
/**
 * Compare local ChatPane rolltemplate cell/column allocation against actual
 * Roll20 chat DOM sidecars. Diagnostic only: this report routes renderer
 * investigation and must not be treated as visual parity or CSS approval.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2).filter((arg) => arg !== '--');

if (args.includes('--self-test')) {
  selfTest();
  process.exit(0);
}

const runDirArg = positional(0) ?? 'reports/roll20-actual-compare/2026-06-18-state-map-v1';
const defaultSmokeArg = positional(1) ?? 'reports/rolltemplate-chat-smoke/rolltemplate-chat-smoke-results.json';
const runDir = path.resolve(runDirArg);
const defaultSmokePath = path.resolve(defaultSmokeArg);
const outDir = path.resolve(readOption('--out-dir') ?? path.join(runDir, 'chat-cell-allocation-probe'));
const candidateSmokeArgs = readRepeatedOption('--candidate-smoke');

async function main() {
  const scenarios = [
    {
      name: 'default',
      source: defaultSmokeArg,
      smoke: await readJson(defaultSmokePath),
    },
  ];
  for (const value of candidateSmokeArgs) {
    const [name, file] = splitNamedPath(value, 'candidate-smoke');
    scenarios.push({
      name,
      source: file,
      smoke: await readJson(path.resolve(file)),
    });
  }

  const fixtureIds = collectFixtureIds(scenarios.map((scenario) => scenario.smoke));
  const fixtures = [];
  for (const fixtureId of fixtureIds) {
    fixtures.push(await compareFixtureScenarios(fixtureId, scenarios));
  }

  const scenarioSummaries = scenarios.map((scenario) => {
    const fixtureRows = fixtures.flatMap((fixture) =>
      fixture.scenarios.filter((item) => item.scenario === scenario.name),
    );
    return {
      name: scenario.name,
      source: scenario.source,
      decisions: countBy(fixtureRows.map((item) => item.allocationDecision)),
      blockers: fixtureRows.filter((item) => item.productionBlocker).length,
    };
  });

  const report = {
    generatedAt: new Date().toISOString(),
    runDir: runDirArg,
    defaultSmoke: defaultSmokeArg,
    outDir: path.relative(process.cwd(), outDir),
    scope: 'diagnostic-only Roll20 chat cell/column allocation probe; no production CSS',
    summary: {
      status: scenarioSummaries.some((scenario) => scenario.blockers > 0)
        ? 'CELL_ALLOCATION_BLOCKERS_FOUND'
        : 'CELL_ALLOCATION_SECONDARY_OR_ACCEPTABLE',
      fixtures: fixtures.length,
      scenarios: scenarios.length,
      scenarioSummaries,
      productionSafe: false,
    },
    fixtures,
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'chat-cell-allocation-probe-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'chat-cell-allocation-probe-results.md'), renderMarkdown(report), 'utf8');

  console.log(`ROLL20 CHAT CELL ALLOCATION PROBE ${report.summary.status}`);
  for (const fixture of fixtures) {
    for (const scenario of fixture.scenarios) {
      console.log(`FIXTURE ${fixture.fixtureId} scenario=${scenario.scenario} decision=${scenario.allocationDecision} tableDelta=${fmtPx(scenario.tableDelta)} maxCell=${fmtPx(scenario.maxAbsCellWidthDelta)} maxTextCell=${fmtPx(scenario.maxAbsTextCellWidthDelta)} maxRatio=${fmtPct(scenario.maxAbsCellRatioDeltaPct)} next=${scenario.nextAction}`);
    }
  }
  console.log(`out=${path.relative(process.cwd(), outDir)}`);
}

async function compareFixtureScenarios(fixtureId, scenarios) {
  const actualPath = path.join(runDir, 'local-baseline', fixtureId, 'screenshots', 'roll20-chat-dom-evidence.json');
  const actualSidecar = await readOptionalJson(actualPath);
  const actualTemplate = actualSidecar?.latestTemplate ?? null;
  return {
    fixtureId,
    hasActualEvidence: Boolean(actualTemplate),
    scenarios: scenarios.map((scenario) => compareScenario(fixtureId, scenario, actualTemplate)),
  };
}

function compareScenario(fixtureId, scenario, actualTemplate) {
  const localTemplate = findLocalTemplate(scenario.smoke, fixtureId);
  if (!localTemplate && scenario.name !== 'default') {
    return {
      scenario: scenario.name,
      status: 'SKIP',
      source: scenario.source,
      allocationDecision: 'SCENARIO_NOT_IN_LOCAL_SMOKE',
      productionBlocker: false,
      nextAction: 'skip this fixture for the scenario; the candidate smoke did not include it',
    };
  }
  if (!actualTemplate || !localTemplate) {
    return {
      scenario: scenario.name,
      status: 'MISSING',
      allocationDecision: 'MISSING_CELL_ALLOCATION_EVIDENCE',
      productionBlocker: true,
      nextAction: 'recapture local smoke and actual Roll20 chat DOM sidecar before cell allocation diagnosis',
    };
  }

  const localTable = tableNode(localTemplate);
  const actualTable = tableNode(actualTemplate);
  const localTableWidth = widthOf(localTable);
  const actualTableWidth = widthOf(actualTable);
  const rows = compareRows({
    localRows: localTemplate.rowMetrics ?? [],
    actualRows: actualTemplate.rowMetrics ?? [],
    localTableWidth,
    actualTableWidth,
  });
  const rowStructureMatches = rows.every((row) => row.textMatches && row.cellCountDelta === 0);
  const textCellRows = rows.flatMap((row) => row.cells.filter((cell) => cell.textBearing));
  const allCells = rows.flatMap((row) => row.cells);
  const textCellsOver20 = textCellRows.filter((cell) => Math.abs(cell.widthDelta ?? 0) >= 20).length;
  const spacerCellsStable = allCells
    .filter((cell) => cell.spacer)
    .filter((cell) => Math.abs(cell.widthDelta ?? 0) <= 1).length;
  const stats = {
    tableDelta: delta(actualTableWidth, localTableWidth),
    rootDelta: delta(widthOf(actualTemplate), widthOf(localTemplate)),
    maxAbsCellWidthDelta: maxAbs(allCells.map((cell) => cell.widthDelta)),
    maxAbsTextCellWidthDelta: maxAbs(textCellRows.map((cell) => cell.widthDelta)),
    meanAbsTextCellWidthDelta: meanAbs(textCellRows.map((cell) => cell.widthDelta)),
    maxAbsCellRatioDeltaPct: maxAbs(allCells.map((cell) => cell.ratioDeltaPct)),
    meanAbsCellRatioDeltaPct: meanAbs(allCells.map((cell) => cell.ratioDeltaPct)),
    textCellsOver20,
    spacerCellsStable,
    rowCountDelta: (actualTemplate.rowMetrics?.length ?? 0) - (localTemplate.rowMetrics?.length ?? 0),
    rowStructureMatches,
  };
  const decision = decideAllocation(stats);
  return {
    scenario: scenario.name,
    status: 'COMPARED',
    source: scenario.source,
    allocationDecision: decision,
    productionBlocker: decision !== 'CELL_ALLOCATION_SECONDARY_OR_ACCEPTABLE' && decision !== 'UNIFORM_TABLE_SCALE_OR_CROP_CONTEXT',
    nextAction: nextAction(decision),
    local: {
      rootWidth: widthOf(localTemplate),
      tableWidth: localTableWidth,
      rowCount: localTemplate.rowMetrics?.length ?? 0,
    },
    actual: {
      rootWidth: widthOf(actualTemplate),
      tableWidth: actualTableWidth,
      rowCount: actualTemplate.rowMetrics?.length ?? 0,
    },
    ...stats,
    rows,
    evidence: evidenceNotes(stats, decision),
  };
}

function compareRows({ localRows, actualRows, localTableWidth, actualTableWidth }) {
  const rows = [];
  const count = Math.max(localRows.length, actualRows.length);
  for (let index = 0; index < count; index += 1) {
    const local = localRows[index] ?? {};
    const actual = actualRows[index] ?? {};
    const localCells = local.cells ?? [];
    const actualCells = actual.cells ?? [];
    const cellCount = Math.max(localCells.length, actualCells.length);
    const cells = [];
    for (let cellIndex = 0; cellIndex < cellCount; cellIndex += 1) {
      const localCell = localCells[cellIndex] ?? {};
      const actualCell = actualCells[cellIndex] ?? {};
      const localWidth = widthOf(localCell);
      const actualWidth = widthOf(actualCell);
      const localRatio = ratio(localWidth, localTableWidth);
      const actualRatio = ratio(actualWidth, actualTableWidth);
      const localText = normalizedText(localCell.text);
      const actualText = normalizedText(actualCell.text);
      cells.push({
        index: cellIndex,
        localText,
        actualText,
        textMatches: localText === actualText,
        textBearing: Boolean(localText || actualText),
        spacer: !localText && !actualText,
        localWidth,
        actualWidth,
        widthDelta: delta(actualWidth, localWidth),
        localRatioPct: pct(localRatio),
        actualRatioPct: pct(actualRatio),
        ratioDeltaPct: delta(pct(actualRatio), pct(localRatio)),
        localLeftInTable: delta(numberOrNull(localCell.rect?.left), numberOrNull(local.rect?.left)),
        actualLeftInTable: delta(numberOrNull(actualCell.rect?.left), numberOrNull(actual.rect?.left)),
      });
    }
    rows.push({
      index,
      localText: normalizedText(local.text),
      actualText: normalizedText(actual.text),
      textMatches: normalizedText(local.text) === normalizedText(actual.text),
      localWidth: widthOf(local),
      actualWidth: widthOf(actual),
      widthDelta: delta(widthOf(actual), widthOf(local)),
      localCellCount: localCells.length,
      actualCellCount: actualCells.length,
      cellCountDelta: actualCells.length - localCells.length,
      cells,
    });
  }
  return rows;
}

function decideAllocation(stats) {
  if (!stats.rowStructureMatches || stats.rowCountDelta !== 0) return 'STRUCTURE_MISMATCH_BEFORE_ALLOCATION';
  if (
    Math.abs(stats.tableDelta ?? 0) >= 80 &&
    Math.abs(stats.maxAbsTextCellWidthDelta ?? 0) >= 40 &&
    stats.textCellsOver20 >= 2
  ) {
    return 'BROAD_STYLE_BREAKS_CELL_ALLOCATION';
  }
  if (
    Math.abs(stats.tableDelta ?? 0) >= 8 &&
    Math.abs(stats.maxAbsCellRatioDeltaPct ?? 0) <= 1.25 &&
    stats.textCellsOver20 === 0
  ) {
    return 'UNIFORM_TABLE_SCALE_OR_CROP_CONTEXT';
  }
  if (
    Math.abs(stats.tableDelta ?? 0) >= 8 ||
    Math.abs(stats.maxAbsTextCellWidthDelta ?? 0) >= 8 ||
    Math.abs(stats.maxAbsCellRatioDeltaPct ?? 0) >= 2
  ) {
    return 'NARROW_CELL_ALLOCATION_MODEL_REQUIRED';
  }
  return 'CELL_ALLOCATION_SECONDARY_OR_ACCEPTABLE';
}

function nextAction(decision) {
  switch (decision) {
    case 'BROAD_STYLE_BREAKS_CELL_ALLOCATION':
      return 'reject broad table/cell CSS copying; inspect narrower nested text wrappers, table width constraints, or Roll20 paint context';
    case 'UNIFORM_TABLE_SCALE_OR_CROP_CONTEXT':
      return 'treat cell ratios as mostly stable; compare root/table/crop width context before typography CSS';
    case 'NARROW_CELL_ALLOCATION_MODEL_REQUIRED':
      return 'build a template-scoped cell allocation probe before another renderer candidate';
    case 'STRUCTURE_MISMATCH_BEFORE_ALLOCATION':
      return 'fix rolltemplate DOM structure match before measuring width allocation';
    case 'MISSING_CELL_ALLOCATION_EVIDENCE':
      return 'recapture actual/local chat DOM evidence with row/cell metrics';
    default:
      return 'keep cell allocation as secondary evidence for this scenario';
  }
}

function evidenceNotes(stats, decision) {
  return [
    `decision ${decision}`,
    `table delta ${fmtPx(stats.tableDelta)}`,
    `root delta ${fmtPx(stats.rootDelta)}`,
    `max cell delta ${fmtPx(stats.maxAbsCellWidthDelta)}`,
    `max text-cell delta ${fmtPx(stats.maxAbsTextCellWidthDelta)}`,
    `mean text-cell delta ${fmtPx(stats.meanAbsTextCellWidthDelta)}`,
    `max ratio delta ${fmtPct(stats.maxAbsCellRatioDeltaPct)}`,
    `text cells >=20px off ${stats.textCellsOver20}`,
    `stable spacer cells ${stats.spacerCellsStable}`,
  ];
}

function renderMarkdown(report) {
  const lines = [
    '# Roll20 Chat Cell Allocation Probe',
    '',
    `Generated: ${report.generatedAt}`,
    `Run: \`${report.runDir}\``,
    `Default smoke: \`${report.defaultSmoke}\``,
    '',
    'Scope: diagnostic-only cell/column allocation comparison. This report does not approve production CSS or prove Roll20 visual parity.',
    '',
    '| Fixture | Scenario | Decision | Local table | Actual table | Table delta | Max cell | Max text cell | Mean text cell | Max ratio | Text cells >=20px off | Next |',
    '| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |',
  ];
  for (const fixture of report.fixtures) {
    for (const scenario of fixture.scenarios) {
      lines.push(`| \`${fixture.fixtureId}\` | \`${scenario.scenario}\` | ${scenario.allocationDecision} | ${fmtPxNoSign(scenario.local?.tableWidth)} | ${fmtPxNoSign(scenario.actual?.tableWidth)} | ${fmtPx(scenario.tableDelta)} | ${fmtPx(scenario.maxAbsCellWidthDelta)} | ${fmtPx(scenario.maxAbsTextCellWidthDelta)} | ${fmtPx(scenario.meanAbsTextCellWidthDelta)} | ${fmtPct(scenario.maxAbsCellRatioDeltaPct)} | ${scenario.textCellsOver20 ?? ''} | ${scenario.nextAction} |`);
    }
  }
  lines.push('', '## Scenario Summary', '');
  for (const scenario of report.summary.scenarioSummaries) {
    lines.push(`- \`${scenario.name}\`: blockers ${scenario.blockers}; decisions ${JSON.stringify(scenario.decisions)}`);
  }
  lines.push('', '## Evidence Notes', '');
  for (const fixture of report.fixtures) {
    lines.push(`### ${fixture.fixtureId}`);
    for (const scenario of fixture.scenarios) {
      lines.push(`- \`${scenario.scenario}\`: ${(scenario.evidence ?? []).join('; ')}`);
    }
    lines.push('');
  }
  lines.push('## Claim Boundary', '');
  lines.push('- Cell allocation decisions route the next experiment only.');
  lines.push('- Keep generated screenshots, Roll20 sidecars, and source-derived fixture data local-only.');
  return `${lines.join('\n')}\n`;
}

function findLocalTemplate(smoke, fixtureId) {
  return (smoke?.fixtures ?? [])
    .find((fixture) => fixture.id === fixtureId || fixture.fixtureId === fixtureId)
    ?.cardInfo?.templateComputed ?? null;
}

function tableNode(template) {
  return (template?.computedChildren ?? []).find((child) => child.selector === 'table') ?? template?.tableStructure?.table ?? null;
}

function widthOf(node) {
  return numberOrNull(node?.rect?.width ?? node?.boxMetrics?.offsetWidth);
}

function collectFixtureIds(smokes) {
  const ids = new Set();
  for (const smoke of smokes) {
    for (const fixture of smoke?.fixtures ?? []) {
      const id = fixture.id ?? fixture.fixtureId;
      if (id) ids.add(id);
    }
  }
  return [...ids].sort();
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

function splitNamedPath(value, label) {
  const index = String(value ?? '').indexOf('=');
  if (index <= 0 || index === value.length - 1) {
    console.error(`Expected --${label} name=path, got ${value}`);
    process.exit(2);
  }
  return [value.slice(0, index), value.slice(index + 1)];
}

function readOption(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
}

function readRepeatedOption(name) {
  const values = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === name && args[index + 1]) values.push(args[index + 1]);
  }
  return values;
}

function positional(index) {
  return args.filter((arg, currentIndex) => {
    if (arg.startsWith('--')) return false;
    const previous = args[currentIndex - 1];
    return previous !== '--out-dir' && previous !== '--candidate-smoke';
  })[index] ?? null;
}

function normalizedText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function delta(actual, local) {
  const a = numberOrNull(actual);
  const l = numberOrNull(local);
  return a != null && l != null ? Number((a - l).toFixed(3)) : null;
}

function ratio(value, divisor) {
  const number = numberOrNull(value);
  const base = numberOrNull(divisor);
  return number != null && base != null && base !== 0 ? number / base : null;
}

function pct(value) {
  const number = numberOrNull(value);
  return number != null ? Number((number * 100).toFixed(3)) : null;
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

function countBy(values) {
  const out = {};
  for (const value of values) out[value || 'unknown'] = (out[value || 'unknown'] ?? 0) + 1;
  return out;
}

function fmtPx(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 'n/a';
  return `${number > 0 ? '+' : ''}${Number(number.toFixed(3))}px`;
}

function fmtPxNoSign(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 'n/a';
  return `${Number(number.toFixed(3))}px`;
}

function fmtPct(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 'n/a';
  return `${number > 0 ? '+' : ''}${Number(number.toFixed(3))}%`;
}

function selfTest() {
  const secondary = decideAllocation({
    rowStructureMatches: true,
    rowCountDelta: 0,
    tableDelta: 1,
    maxAbsCellWidthDelta: 1,
    maxAbsTextCellWidthDelta: 1,
    maxAbsCellRatioDeltaPct: 0.2,
    textCellsOver20: 0,
  });
  const uniform = decideAllocation({
    rowStructureMatches: true,
    rowCountDelta: 0,
    tableDelta: 15.75,
    maxAbsCellWidthDelta: 4.95,
    maxAbsTextCellWidthDelta: 4.95,
    maxAbsCellRatioDeltaPct: 0.4,
    textCellsOver20: 0,
  });
  const broken = decideAllocation({
    rowStructureMatches: true,
    rowCountDelta: 0,
    tableDelta: -188.391,
    maxAbsCellWidthDelta: 73.719,
    maxAbsTextCellWidthDelta: 73.719,
    maxAbsCellRatioDeltaPct: 14,
    textCellsOver20: 2,
  });
  if (secondary !== 'CELL_ALLOCATION_SECONDARY_OR_ACCEPTABLE') throw new Error(`secondary self-test failed: ${secondary}`);
  if (uniform !== 'UNIFORM_TABLE_SCALE_OR_CROP_CONTEXT') throw new Error(`uniform self-test failed: ${uniform}`);
  if (broken !== 'BROAD_STYLE_BREAKS_CELL_ALLOCATION') throw new Error(`broken self-test failed: ${broken}`);
  console.log('ROLL20 CHAT CELL ALLOCATION PROBE SELF TEST PASS');
}

await main();
