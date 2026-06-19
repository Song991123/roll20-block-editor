#!/usr/bin/env node
/**
 * Compare local ChatPane shell/template geometry with actual Roll20 chat.
 *
 * Diagnostic only. This reads ignored reports and identifies whether a
 * remaining rolltemplate mismatch should be handled as chat shell/crop/width
 * modeling rather than another global CSS paint candidate.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const runDirArg = args[0] ?? 'reports/roll20-actual-compare/2026-06-18-state-map-v1';
const runDir = path.resolve(runDirArg);
const localSmokeArg = args[1] ?? 'reports/rolltemplate-chat-smoke/rolltemplate-chat-smoke-results.json';
const localSmokePath = path.resolve(localSmokeArg);
const outDir = path.join(runDir, 'chat-shell-geometry');

async function main() {
  const localSmoke = await readJson(localSmokePath);
  const parity = await readOptionalJson(path.join(runDir, 'chat-parity-diagnostics', 'chat-parity-diagnostics-results.json'));
  const strategy = await readOptionalJson(path.join(runDir, 'chat-mask-strategy', 'chat-mask-strategy-results.json'));
  const fixtures = [];
  for (const localFixture of localSmoke.fixtures ?? []) {
    fixtures.push(await compareFixture(localFixture, parity, strategy));
  }
  const compared = fixtures.filter((fixture) => fixture.status === 'COMPARED');
  const needsShell = compared.filter((fixture) => fixture.shellDecision !== 'SHELL_OK_OR_SECONDARY');
  const report = {
    generatedAt: new Date().toISOString(),
    runDir: runDirArg,
    localSmoke: localSmokeArg,
    scope: 'diagnostic-only local ChatPane vs actual Roll20 chat shell geometry',
    summary: {
      status: needsShell.length ? 'SHELL_MODEL_NEEDED' : 'SHELL_GEOMETRY_SECONDARY',
      fixtures: fixtures.length,
      compared: compared.length,
      missing: fixtures.filter((fixture) => fixture.status === 'MISSING').length,
      shellModelNeeded: needsShell.length,
      decisions: countBy(compared.map((fixture) => fixture.shellDecision)),
    },
    fixtures,
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'chat-shell-geometry-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'chat-shell-geometry-results.md'), renderMarkdown(report), 'utf8');

  console.log(`ROLL20 CHAT SHELL GEOMETRY ${report.summary.status}`);
  for (const fixture of fixtures) {
    console.log(`FIXTURE ${fixture.fixtureId} status=${fixture.status} decision=${fixture.shellDecision ?? ''} template=${fmtDelta(fixture.geometryDeltas?.templateWidthDelta)} tableOffset=${fmtPair(fixture.geometryDeltas?.tableOffsetDelta)} next=${fixture.nextAction ?? ''}`);
  }
  console.log(`out=${path.relative(process.cwd(), outDir)}`);
}

async function compareFixture(localFixture, parity, strategy) {
  const fixtureId = localFixture.id;
  const actualPath = path.join(runDir, 'local-baseline', fixtureId, 'screenshots', 'roll20-chat-dom-evidence.json');
  const actual = await readOptionalJson(actualPath);
  const local = extractLocalGeometry(localFixture);
  const actualGeometry = extractActualGeometry(actual);
  const parityFixture = (parity?.fixtures ?? []).find((item) => item.fixtureId === fixtureId);
  const strategyFixture = (strategy?.fixtures ?? []).find((item) => item.fixtureId === fixtureId);
  if (!local || !actualGeometry) {
    return {
      fixtureId,
      status: 'MISSING',
      localAvailable: Boolean(local),
      actualAvailable: Boolean(actualGeometry),
      actualPath: existsSync(actualPath) ? path.relative(process.cwd(), actualPath) : '',
      note: !local ? 'local smoke cardInfo lacks template geometry' : 'actual Roll20 sidecar lacks template geometry',
    };
  }
  const deltas = {
    chatWidthDelta: delta(local.shell.chatWidth, actualGeometry.shell.chatWidth),
    messageWidthDelta: delta(local.shell.messageWidth, actualGeometry.shell.messageWidth),
    templateWidthDelta: delta(local.root.width, actualGeometry.root.width),
    templateHeightDelta: delta(local.root.height, actualGeometry.root.height),
    tableWidthDelta: delta(local.table.width, actualGeometry.table.width),
    tableHeightDelta: delta(local.table.height, actualGeometry.table.height),
    tableOffsetDelta: [
      delta(local.table.offsetX, actualGeometry.table.offsetX),
      delta(local.table.offsetY, actualGeometry.table.offsetY),
    ],
    firstCellWidthDelta: delta(local.firstCell?.width, actualGeometry.firstCell?.width),
    firstCellOffsetDelta: [
      delta(local.firstCell?.offsetX, actualGeometry.firstCell?.offsetX),
      delta(local.firstCell?.offsetY, actualGeometry.firstCell?.offsetY),
    ],
    cropMarginActual: actualGeometry.cropMargin,
  };
  const shellDecision = decideShellGeometry({ deltas, parityFixture, strategyFixture });
  return {
    fixtureId,
    status: 'COMPARED',
    shellDecision,
    nextAction: nextAction(shellDecision),
    parity: {
      bestAlignedMismatchPct: parityFixture?.bestAlignedMismatchPct ?? '',
      bestAlignedOffset: parityFixture?.bestAlignedOffset ?? null,
    },
    strategyDecision: strategyFixture?.strategyDecision ?? '',
    local,
    actual: actualGeometry,
    geometryDeltas: deltas,
    evidence: evidenceNotes(deltas),
  };
}

function extractLocalGeometry(fixture) {
  const template = fixture?.cardInfo?.templateComputed;
  if (!template?.computedStyle) return null;
  const table = (template.computedChildren ?? []).find((child) => child.selector === 'table' || child.tagName === 'TABLE');
  const firstCell = (template.computedChildren ?? []).find((child) => child.selector === 'td:first');
  const width = px(template.computedStyle.width) || Number(fixture.cardInfo?.templateWidth ?? 0);
  const height = px(template.computedStyle.height);
  if (!width || !height || !table?.rect) return null;
  const tableWidth = Number(table.rect.width ?? px(table.computedStyle?.width));
  const tableHeight = Number(table.rect.height ?? px(table.computedStyle?.height));
  const tableOffsetX = Number(((width - tableWidth) / 2).toFixed(3));
  const tableOffsetY = Number(((height - tableHeight) / 2).toFixed(3));
  const first = firstCell?.rect
    ? {
        width: Number(firstCell.rect.width ?? 0),
        height: Number(firstCell.rect.height ?? 0),
        offsetX: Number((Number(firstCell.rect.left ?? firstCell.rect.x ?? 0) - Number(table.rect.left ?? table.rect.x ?? 0)).toFixed(3)),
        offsetY: Number((Number(firstCell.rect.top ?? firstCell.rect.y ?? 0) - Number(table.rect.top ?? table.rect.y ?? 0)).toFixed(3)),
      }
    : null;
  return {
    shell: {
      chatWidth: null,
      messageWidth: Number(fixture.cardInfo?.width ?? 0) || null,
    },
    root: { width, height },
    table: { width: tableWidth, height: tableHeight, offsetX: tableOffsetX, offsetY: tableOffsetY },
    firstCell: first,
    styles: {
      rootFontSize: template.computedStyle.fontSize ?? '',
      rootFontFamily: template.computedStyle.fontFamily ?? '',
      tableFontSize: table.computedStyle?.fontSize ?? '',
      tableBorderSpacing: table.computedStyle?.borderSpacing ?? '',
      firstCellWidthStyle: firstCell?.computedStyle?.width ?? '',
    },
  };
}

function extractActualGeometry(sidecar) {
  const root = sidecar?.latestTemplate;
  const table = (root?.computedChildren ?? []).find((child) => child.selector === 'table' || child.tagName === 'TABLE');
  const firstCell = (root?.computedChildren ?? []).find((child) => child.selector === 'td:first');
  if (!root?.rect || !table?.rect) return null;
  const rootLeft = Number(root.rect.left ?? root.rect.x ?? 0);
  const rootTop = Number(root.rect.top ?? root.rect.y ?? 0);
  const tableLeft = Number(table.rect.left ?? table.rect.x ?? 0);
  const tableTop = Number(table.rect.top ?? table.rect.y ?? 0);
  const clip = sidecar?.clip ?? sidecar?.screenshotClipApplied ?? null;
  const cropMargin = clip
    ? {
        left: Number((rootLeft - Number(clip.x ?? clip.left ?? 0)).toFixed(3)),
        top: Number((rootTop - Number(clip.y ?? clip.top ?? 0)).toFixed(3)),
        right: Number((Number(clip.x ?? clip.left ?? 0) + Number(clip.width ?? 0) - Number(root.rect.right ?? rootLeft + root.rect.width)).toFixed(3)),
        bottom: Number((Number(clip.y ?? clip.top ?? 0) + Number(clip.height ?? 0) - Number(root.rect.bottom ?? rootTop + root.rect.height)).toFixed(3)),
      }
    : null;
  const first = firstCell?.rect
    ? {
        width: Number(firstCell.rect.width ?? 0),
        height: Number(firstCell.rect.height ?? 0),
        offsetX: Number((Number(firstCell.rect.left ?? firstCell.rect.x ?? 0) - tableLeft).toFixed(3)),
        offsetY: Number((Number(firstCell.rect.top ?? firstCell.rect.y ?? 0) - tableTop).toFixed(3)),
      }
    : null;
  return {
    shell: {
      chatWidth: Number(sidecar?.chatRect?.width ?? 0) || null,
      messageWidth: Number(sidecar?.latestMessage?.rect?.width ?? 0) || null,
    },
    root: { width: Number(root.rect.width), height: Number(root.rect.height) },
    table: {
      width: Number(table.rect.width),
      height: Number(table.rect.height),
      offsetX: Number((tableLeft - rootLeft).toFixed(3)),
      offsetY: Number((tableTop - rootTop).toFixed(3)),
    },
    firstCell: first,
    cropMargin,
    styles: {
      rootFontSize: root.computedStyle?.fontSize ?? '',
      rootFontFamily: root.computedStyle?.fontFamily ?? '',
      tableFontSize: table.computedStyle?.fontSize ?? '',
      tableBorderSpacing: table.computedStyle?.borderSpacing ?? '',
      firstCellWidthStyle: firstCell?.computedStyle?.width ?? '',
    },
  };
}

function decideShellGeometry({ deltas, parityFixture, strategyFixture }) {
  const highMismatch = Number(parityFixture?.bestAlignedMismatchRatio ?? parityFixture?.mismatchRatio ?? 0) > 0.1;
  const strategyDecision = strategyFixture?.strategyDecision ?? '';
  if (!highMismatch) return 'SHELL_OK_OR_SECONDARY';
  if (strategyDecision === 'MODEL_TEMPLATE_WIDTH_BEFORE_PAINT') return 'WIDTH_MODEL_REQUIRED';
  if (Math.abs(deltas.tableOffsetDelta?.[0] ?? 0) >= 0.75 || Math.abs(deltas.tableOffsetDelta?.[1] ?? 0) >= 0.75) {
    return 'CROP_OR_TEMPLATE_INSET_MISMATCH';
  }
  if (Math.abs(deltas.firstCellWidthDelta ?? 0) >= 2) return 'CELL_WIDTH_MODEL_MISMATCH';
  if (Math.abs(deltas.templateHeightDelta ?? 0) >= 1) return 'ROOT_HEIGHT_OR_CROP_MISMATCH';
  return 'SHELL_OK_OR_SECONDARY';
}

function nextAction(decision) {
  switch (decision) {
    case 'CROP_OR_TEMPLATE_INSET_MISMATCH':
      return 'model Roll20 chat template inset/crop margins before another paint or shadow candidate';
    case 'CELL_WIDTH_MODEL_MISMATCH':
      return 'compare table cell width allocation and font metrics before production CSS';
    case 'WIDTH_MODEL_REQUIRED':
      return 'build a per-template chat width model before any paint candidate';
    case 'ROOT_HEIGHT_OR_CROP_MISMATCH':
      return 'compare template root height and screenshot crop margins before CSS promotion';
    default:
      return 'keep shell geometry as secondary evidence for now';
  }
}

function evidenceNotes(deltas) {
  const out = [];
  if (Math.abs(deltas.tableOffsetDelta?.[0] ?? 0) >= 0.75 || Math.abs(deltas.tableOffsetDelta?.[1] ?? 0) >= 0.75) {
    out.push(`table inset delta ${fmtPair(deltas.tableOffsetDelta)}`);
  }
  if (Math.abs(deltas.firstCellWidthDelta ?? 0) >= 2) out.push(`first cell width delta ${fmtDelta(deltas.firstCellWidthDelta)}`);
  if (Math.abs(deltas.templateHeightDelta ?? 0) >= 1) out.push(`template height delta ${fmtDelta(deltas.templateHeightDelta)}`);
  if (deltas.cropMarginActual) out.push(`actual crop margin L/T/R/B=${Object.values(deltas.cropMarginActual).join('/')}`);
  return out;
}

function renderMarkdown(report) {
  const lines = [
    '# Roll20 Chat Shell Geometry',
    '',
    `Generated: ${report.generatedAt}`,
    `Run: \`${report.runDir}\``,
    '',
    'Scope: diagnostic-only local ChatPane vs actual Roll20 chat shell geometry. This is not Roll20 parity and does not enable production CSS.',
    '',
    `Status: ${report.summary.status}`,
    '',
    '| Fixture | Decision | Aligned mismatch | Template Δ | Table Δ | Table inset Δ | First cell Δ | Actual crop margin | Next |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |',
  ];
  for (const fixture of report.fixtures) {
    if (fixture.status !== 'COMPARED') {
      lines.push(`| \`${fixture.fixtureId}\` | ${fixture.status} |  |  |  |  |  |  | ${fixture.note ?? ''} |`);
      continue;
    }
    const crop = fixture.geometryDeltas.cropMarginActual
      ? Object.values(fixture.geometryDeltas.cropMarginActual).join('/')
      : '';
    lines.push(`| \`${fixture.fixtureId}\` | ${fixture.shellDecision} | ${fixture.parity.bestAlignedMismatchPct} | ${fmtPair([fixture.geometryDeltas.templateWidthDelta, fixture.geometryDeltas.templateHeightDelta])} | ${fmtPair([fixture.geometryDeltas.tableWidthDelta, fixture.geometryDeltas.tableHeightDelta])} | ${fmtPair(fixture.geometryDeltas.tableOffsetDelta)} | ${fmtDelta(fixture.geometryDeltas.firstCellWidthDelta)} | ${crop} | ${fixture.nextAction} |`);
  }
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

function px(value) {
  const match = String(value ?? '').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function delta(localValue, actualValue) {
  const local = Number(localValue);
  const actual = Number(actualValue);
  return Number.isFinite(local) && Number.isFinite(actual)
    ? Number((actual - local).toFixed(3))
    : null;
}

function countBy(values) {
  const out = {};
  for (const value of values) out[value || 'unknown'] = (out[value || 'unknown'] ?? 0) + 1;
  return out;
}

function fmtDelta(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '';
  return `${number > 0 ? '+' : ''}${Number(number.toFixed(3))}px`;
}

function fmtPair(pair) {
  if (!Array.isArray(pair)) return '';
  return pair.map(fmtDelta).join('/');
}

await main();
