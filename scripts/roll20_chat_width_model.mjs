#!/usr/bin/env node
/**
 * Build a per-template Roll20 chat width model from local ChatPane sidecars and
 * actual Roll20 chat DOM evidence.
 *
 * Diagnostic only. This intentionally does not emit production CSS; it explains
 * whether a mismatch is caused by message shell width, template/table overflow,
 * or crop/window clipping so agents do not promote one global width patch.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const runDirArg = args[0] ?? 'reports/roll20-actual-compare/2026-06-18-state-map-v1';
const runDir = path.resolve(runDirArg);
const localSmokeArg = args[1] ?? 'reports/rolltemplate-chat-smoke/rolltemplate-chat-smoke-results.json';
const localSmokePath = path.resolve(localSmokeArg);
const outDir = path.join(runDir, 'chat-width-model');

async function main() {
  const localSmoke = await readJson(localSmokePath);
  const parity = await readOptionalJson(path.join(runDir, 'chat-parity-diagnostics', 'chat-parity-diagnostics-results.json'));
  const style = await readOptionalJson(path.join(runDir, 'chat-style-context-diagnostics', 'chat-style-context-diagnostics-results.json'));
  const shell = await readOptionalJson(path.join(runDir, 'chat-shell-geometry', 'chat-shell-geometry-results.json'));
  const fixtures = [];
  for (const localFixture of localSmoke.fixtures ?? []) {
    fixtures.push(await compareFixture(localFixture, { parity, style, shell }));
  }
  const compared = fixtures.filter((fixture) => fixture.status === 'COMPARED');
  const actionable = compared.filter((fixture) => fixture.widthDecision !== 'WIDTH_SECONDARY_OR_ACCEPTABLE');
  const report = {
    generatedAt: new Date().toISOString(),
    runDir: runDirArg,
    localSmoke: localSmokeArg,
    scope: 'diagnostic-only per-template chat width model',
    summary: {
      status: actionable.length ? 'WIDTH_MODEL_REQUIRED' : 'WIDTH_MODEL_SECONDARY',
      fixtures: fixtures.length,
      compared: compared.length,
      actionable: actionable.length,
      decisions: countBy(compared.map((fixture) => fixture.widthDecision)),
      productionSafe: false,
    },
    fixtures,
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'chat-width-model-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'chat-width-model-results.md'), renderMarkdown(report), 'utf8');

  console.log(`ROLL20 CHAT WIDTH MODEL ${report.summary.status}`);
  for (const fixture of fixtures) {
    console.log(`FIXTURE ${fixture.fixtureId} status=${fixture.status} decision=${fixture.widthDecision ?? ''} actualOverflow=${fmtRatio(fixture.overflow?.actualTableVsCropRatio)} tableDelta=${fmtPx(fixture.deltas?.tableWidthDelta)} next=${fixture.nextAction ?? ''}`);
  }
  console.log(`out=${path.relative(process.cwd(), outDir)}`);
}

async function compareFixture(localFixture, reports) {
  const fixtureId = localFixture.id;
  const actualPath = path.join(runDir, 'local-baseline', fixtureId, 'screenshots', 'roll20-chat-dom-evidence.json');
  const actual = await readOptionalJson(actualPath);
  const local = extractLocal(localFixture);
  const actualGeometry = extractActual(actual);
  if (!local || !actualGeometry) {
    return {
      fixtureId,
      status: 'MISSING',
      localAvailable: Boolean(local),
      actualAvailable: Boolean(actualGeometry),
      widthDecision: 'MISSING_WIDTH_EVIDENCE',
      nextAction: 'recapture local smoke or actual Roll20 chat sidecar with template/table rects',
    };
  }
  const parityFixture = (reports.parity?.fixtures ?? []).find((fixture) => fixture.fixtureId === fixtureId);
  const styleFixture = (reports.style?.fixtures ?? []).find((fixture) => fixture.id === fixtureId);
  const shellFixture = (reports.shell?.fixtures ?? []).find((fixture) => fixture.fixtureId === fixtureId);
  const deltas = {
    chatWidthDelta: delta(local.shell.chatWidth, actualGeometry.shell.chatWidth),
    messageWidthDelta: delta(local.shell.messageWidth, actualGeometry.shell.messageWidth),
    cropWidthDelta: delta(local.crop.width, actualGeometry.crop.width),
    templateWidthDelta: delta(local.root.width, actualGeometry.root.width),
    tableWidthDelta: delta(local.table.width, actualGeometry.table.width),
    tableToTemplateDelta: delta(local.tableToTemplateWidth, actualGeometry.tableToTemplateWidth),
    tableToCropDelta: delta(local.tableToCropWidth, actualGeometry.tableToCropWidth),
    visibleCropToTemplateDelta: delta(local.cropToTemplateWidth, actualGeometry.cropToTemplateWidth),
  };
  const overflow = {
    localTableVsCropRatio: ratio(local.table.width, local.crop.width),
    actualTableVsCropRatio: ratio(actualGeometry.table.width, actualGeometry.crop.width),
    localTableVsTemplateRatio: ratio(local.table.width, local.root.width),
    actualTableVsTemplateRatio: ratio(actualGeometry.table.width, actualGeometry.root.width),
    localCropVsTemplateRatio: ratio(local.crop.width, local.root.width),
    actualCropVsTemplateRatio: ratio(actualGeometry.crop.width, actualGeometry.root.width),
  };
  const widthDecision = decideWidthModel({ deltas, overflow, parityFixture, shellFixture });
  return {
    fixtureId,
    status: 'COMPARED',
    widthDecision,
    nextAction: nextAction(widthDecision),
    parity: {
      bestAlignedMismatchPct: parityFixture?.bestAlignedMismatchPct ?? '',
      bestAlignedMismatchRatio: parityFixture?.bestAlignedMismatchRatio ?? null,
      actualSize: parityFixture?.actualSize ?? null,
      localSize: parityFixture?.localSize ?? null,
    },
    styleFindings: styleFixture?.findings ?? [],
    shellDecision: shellFixture?.shellDecision ?? '',
    local,
    actual: actualGeometry,
    deltas,
    overflow,
    evidence: evidenceNotes({ deltas, overflow }),
  };
}

function extractLocal(fixture) {
  const template = fixture?.cardInfo?.templateComputed;
  const table = (template?.computedChildren ?? []).find((child) => child.selector === 'table' || child.tagName === 'TABLE');
  if (!template?.computedStyle || !table?.rect) return null;
  const rootWidth = px(template.computedStyle.width) || Number(fixture.cardInfo?.templateWidth ?? 0);
  const tableWidth = Number(table.rect.width ?? px(table.computedStyle?.width));
  const cropWidth = Number(fixture.cardInfo?.templateScreenshot?.width ?? fixture.cardInfo?.width ?? rootWidth);
  return {
    shell: {
      chatWidth: null,
      messageWidth: Number(fixture.cardInfo?.width ?? 0) || null,
    },
    crop: { width: cropWidth },
    root: { width: rootWidth },
    table: { width: tableWidth },
    tableToTemplateWidth: Number((tableWidth - rootWidth).toFixed(3)),
    tableToCropWidth: Number((tableWidth - cropWidth).toFixed(3)),
    cropToTemplateWidth: Number((cropWidth - rootWidth).toFixed(3)),
    className: template.className ?? '',
  };
}

function extractActual(sidecar) {
  const root = sidecar?.latestTemplate;
  const table = (root?.computedChildren ?? []).find((child) => child.selector === 'table' || child.tagName === 'TABLE');
  if (!root?.rect || !table?.rect) return null;
  const cropWidth = Number(sidecar?.clip?.width ?? sidecar?.screenshotClipApplied?.width ?? root.rect.width);
  const rootWidth = Number(root.rect.width);
  const tableWidth = Number(table.rect.width);
  return {
    shell: {
      chatWidth: Number(sidecar?.chatRect?.width ?? 0) || null,
      messageWidth: Number(sidecar?.latestMessage?.rect?.width ?? 0) || null,
    },
    crop: { width: cropWidth },
    root: { width: rootWidth },
    table: { width: tableWidth },
    tableToTemplateWidth: Number((tableWidth - rootWidth).toFixed(3)),
    tableToCropWidth: Number((tableWidth - cropWidth).toFixed(3)),
    cropToTemplateWidth: Number((cropWidth - rootWidth).toFixed(3)),
    className: root.className ?? '',
  };
}

function decideWidthModel({ deltas, overflow, parityFixture, shellFixture }) {
  const highMismatch = Number(parityFixture?.bestAlignedMismatchRatio ?? 0) > 0.1;
  if (!highMismatch) return 'WIDTH_SECONDARY_OR_ACCEPTABLE';
  if (Number(overflow.actualTableVsCropRatio ?? 0) >= 2 && Math.abs(deltas.tableToCropDelta ?? 0) >= 100) {
    return 'OVERFLOW_TABLE_CROP_MODEL_REQUIRED';
  }
  if (Math.abs(deltas.tableWidthDelta ?? 0) >= 8) return 'TABLE_WIDTH_MODEL_REQUIRED';
  if (Math.abs(deltas.messageWidthDelta ?? 0) >= 8 || Math.abs(deltas.chatWidthDelta ?? 0) >= 8) {
    return 'CHAT_SHELL_WIDTH_MODEL_REQUIRED';
  }
  if (shellFixture?.shellDecision === 'WIDTH_MODEL_REQUIRED') return 'WIDTH_MODEL_REQUIRED';
  return 'WIDTH_SECONDARY_OR_ACCEPTABLE';
}

function nextAction(decision) {
  switch (decision) {
    case 'OVERFLOW_TABLE_CROP_MODEL_REQUIRED':
      return 'model overflowed rolltemplate tables against Roll20 chat crop before any width/padding CSS';
    case 'TABLE_WIDTH_MODEL_REQUIRED':
      return 'compare table intrinsic width and user CSS activation before a ChatPane width patch';
    case 'CHAT_SHELL_WIDTH_MODEL_REQUIRED':
      return 'match Roll20 chat shell/message width first, then rerun parity';
    case 'WIDTH_MODEL_REQUIRED':
      return 'build a fixture/template-specific width candidate and prove it with actual style evidence';
    default:
      return 'keep width as secondary evidence while higher mismatch fixtures are investigated';
  }
}

function evidenceNotes({ deltas, overflow }) {
  const notes = [];
  if (Number(overflow.actualTableVsCropRatio ?? 0) >= 2) {
    notes.push(`actual table/crop ratio ${fmtRatio(overflow.actualTableVsCropRatio)}`);
  }
  if (Math.abs(deltas.tableWidthDelta ?? 0) >= 8) notes.push(`table width delta ${fmtPx(deltas.tableWidthDelta)}`);
  if (Math.abs(deltas.tableToCropDelta ?? 0) >= 100) notes.push(`table-to-crop delta ${fmtPx(deltas.tableToCropDelta)}`);
  if (Math.abs(deltas.messageWidthDelta ?? 0) >= 8) notes.push(`message width delta ${fmtPx(deltas.messageWidthDelta)}`);
  return notes;
}

function renderMarkdown(report) {
  const lines = [
    '# Roll20 Chat Width Model',
    '',
    `Generated: ${report.generatedAt}`,
    `Run: \`${report.runDir}\``,
    '',
    'Scope: diagnostic-only per-template width model. This report does not enable production ChatPane CSS.',
    '',
    `Status: ${report.summary.status}`,
    '',
    '| Fixture | Decision | Aligned mismatch | Actual table/crop | Table width delta | Table-to-crop delta | Evidence | Next |',
    '| --- | --- | ---: | ---: | ---: | ---: | --- | --- |',
  ];
  for (const fixture of report.fixtures) {
    lines.push(`| \`${fixture.fixtureId}\` | ${fixture.widthDecision} | ${fixture.parity?.bestAlignedMismatchPct ?? ''} | ${fmtRatio(fixture.overflow?.actualTableVsCropRatio)} | ${fmtPx(fixture.deltas?.tableWidthDelta)} | ${fmtPx(fixture.deltas?.tableToCropDelta)} | ${(fixture.evidence ?? []).join('<br>')} | ${fixture.nextAction ?? ''} |`);
  }
  lines.push('', '## Claim Boundary', '');
  lines.push('- A large actual table/crop ratio means Roll20 is showing a clipped viewport of an overflowed template, not necessarily a narrow chat-card bug.');
  lines.push('- Do not apply one global width, padding, or wrapping patch unless this model and candidate comparison agree across fixtures.');
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

function ratio(value, divisor) {
  const number = Number(value);
  const base = Number(divisor);
  return Number.isFinite(number) && Number.isFinite(base) && base !== 0
    ? Number((number / base).toFixed(4))
    : null;
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

function fmtRatio(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '';
  return `${Number(number.toFixed(3))}x`;
}

await main();
