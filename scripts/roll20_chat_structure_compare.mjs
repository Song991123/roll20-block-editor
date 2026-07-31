#!/usr/bin/env node
/**
 * Compare local ChatPane rolltemplate structure against actual Roll20 chat DOM.
 *
 * This catches evidence-quality issues that pixel diff alone cannot explain,
 * especially when Roll20 capture selected a different visible rolltemplate than
 * the local smoke clicked. Diagnostic only; does not change renderer behavior.
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const runDirArg = args[0] ?? 'reports/roll20-actual-compare/2026-06-18-state-map-v1';
const localSmokeArg = args[1] ?? 'reports/rolltemplate-chat-smoke/rolltemplate-chat-smoke-results.json';
const runDir = path.resolve(runDirArg);
const localSmokeFile = path.resolve(localSmokeArg);
const outDir = path.join(runDir, 'chat-structure-compare');
const fixtureIds = ['fixtureA', 'fixtureB', 'fixtureC'];

const localSmoke = await readJsonIfExists(localSmokeFile);
const fixtures = [];

for (const fixtureId of fixtureIds) {
  const localFixture = localSmoke?.fixtures?.find((fixture) => fixture.id === fixtureId);
  const localTemplate = localFixture?.cardInfo?.templateComputed ?? null;
  const actualSidecar = await readJsonIfExists(path.join(runDir, 'local-baseline', fixtureId, 'screenshots', 'roll20-chat-dom-evidence.json'));
  const actualTemplate = actualSidecar?.selectedTemplate ?? actualSidecar?.latestTemplate ?? null;
  fixtures.push(compareFixture(fixtureId, localFixture, localTemplate, actualSidecar, actualTemplate));
}

const report = {
  generatedAt: new Date().toISOString(),
  runDir: runDirArg,
  localSmoke: localSmokeArg,
  scope: 'diagnostic-only chat rolltemplate structure comparison',
  summary: summarize(fixtures),
  fixtures,
};

await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, 'chat-structure-compare-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeFile(path.join(outDir, 'chat-structure-compare-results.md'), renderMarkdown(report), 'utf8');

console.log(`ROLL20 CHAT STRUCTURE ${report.summary.status}`);
for (const fixture of fixtures) {
  console.log(`FIXTURE ${fixture.fixtureId} status=${fixture.status} local=${fixture.local.templateClass || 'n/a'} actual=${fixture.actual.templateClass || 'n/a'} rows=${fixture.local.rowCount}/${fixture.actual.rowCount} decision=${fixture.decision} next=${fixture.nextAction}`);
}
console.log(`out=${path.relative(process.cwd(), outDir)}`);

function compareFixture(fixtureId, localFixture, localTemplate, actualSidecar, actualTemplate) {
  const localRows = Array.isArray(localTemplate?.rowMetrics) ? localTemplate.rowMetrics : [];
  const actualRows = Array.isArray(actualTemplate?.rowMetrics) ? actualTemplate.rowMetrics : [];
  const localSignature = rowSignature(localRows);
  const actualSignature = rowSignature(actualRows);
  const localInfo = {
    chosenRollButton: localFixture?.chosen?.name ?? '',
    chosenTemplateInvoke: parseTemplateName(localFixture?.chosen?.value ?? ''),
    templateClass: localTemplate?.className ?? '',
    rowCount: localRows.length,
    rowSignature: localSignature,
    tableText: findChild(localTemplate, 'table')?.text ?? localTemplate?.text ?? '',
  };
  const actualInfo = {
    selectedTemplateStrategy: actualSidecar?.selectedTemplateStrategy ?? '',
    latestMessageText: actualSidecar?.latestMessage?.text ?? '',
    templateClass: actualTemplate?.className ?? '',
    rowCount: actualRows.length,
    rowSignature: actualSignature,
    tableText: findChild(actualTemplate, 'table')?.text ?? actualTemplate?.text ?? '',
    availableTemplateClasses: [...new Set((actualSidecar?.rolltemplates ?? []).map((template) => template?.className).filter(Boolean))],
  };
  if (!localTemplate) {
    return baseResult(fixtureId, 'NEEDS_LOCAL_SMOKE', localInfo, actualInfo, 'Run rolltemplate_chat_smoke for this fixture before structure comparison.');
  }
  if (!actualTemplate) {
    return baseResult(fixtureId, 'NEEDS_ACTUAL_CAPTURE', localInfo, actualInfo, 'Recapture actual Roll20 chat evidence for this fixture.');
  }

  const templateClassMatches = localInfo.templateClass === actualInfo.templateClass;
  const rowCountMatches = localInfo.rowCount === actualInfo.rowCount;
  const rowSignatureMatches = localSignature === actualSignature;
  const textMatches = normalizeText(localInfo.tableText) === normalizeText(actualInfo.tableText);
  let status = 'STRUCTURE_MATCH';
  let decision = 'COMPARE_PIXELS';
  let nextAction = 'Rolltemplate class and row structure match; continue renderer pixel diagnostics.';

  if (!templateClassMatches) {
    status = 'TEMPLATE_CLASS_MISMATCH';
    decision = 'RECAPTURE_SAME_ROLLTEMPLATE';
    nextAction = 'Actual Roll20 evidence selected a different rolltemplate than local smoke. Recapture by targeting the same roll button/template before using pixel diff.';
  } else if (!rowCountMatches || !rowSignatureMatches) {
    status = 'ROW_STRUCTURE_MISMATCH';
    decision = 'FIX_ROLLTEMPLATE_FIELD_OR_CONDITION_RENDERING';
    nextAction = 'Rolltemplate class matches but rows differ. Compare Mustache conditions, field values, defaults, and rendered rolltemplate HTML before CSS.';
  } else if (!textMatches) {
    status = 'TEXT_MISMATCH';
    decision = 'FIX_ROLLTEMPLATE_TEXT_OR_I18N';
    nextAction = 'Rows match but rendered text differs. Compare translation/i18n, field values, and roll result substitutions before CSS.';
  }

  return {
    fixtureId,
    status,
    decision,
    nextAction,
    local: localInfo,
    actual: actualInfo,
    checks: {
      templateClassMatches,
      rowCountMatches,
      rowSignatureMatches,
      textMatches,
    },
  };
}

function baseResult(fixtureId, status, localInfo, actualInfo, nextAction) {
  return {
    fixtureId,
    status,
    decision: status,
    nextAction,
    local: localInfo,
    actual: actualInfo,
    checks: {
      templateClassMatches: false,
      rowCountMatches: false,
      rowSignatureMatches: false,
      textMatches: false,
    },
  };
}

async function readJsonIfExists(file) {
  if (!existsSync(file)) return null;
  try {
    return JSON.parse((await readFile(file, 'utf8')).replace(/^\uFEFF/, ''));
  } catch {
    return null;
  }
}

function parseTemplateName(value) {
  const match = String(value ?? '').match(/&\{template:([^}]+)\}/i);
  return match ? `sheet-rolltemplate-${match[1]}` : '';
}

function rowSignature(rows) {
  return rows
    .map((row) => [
      row.className ?? '',
      ...(row.cells ?? []).map((cell) => `${cell.tagName ?? ''}.${cell.className ?? ''}:${normalizeText(cell.text ?? '')}`),
    ].join('|'))
    .join(' / ');
}

function normalizeText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function findChild(template, selector) {
  return (template?.computedChildren ?? []).find((child) => child?.selector === selector) ?? null;
}

function summarize(fixtures) {
  const counts = countBy(fixtures.map((fixture) => fixture.status));
  const mismatches = fixtures.filter((fixture) => fixture.status !== 'STRUCTURE_MATCH');
  return {
    status: mismatches.length ? 'STRUCTURE_MISMATCH_FOUND' : 'STRUCTURE_MATCHED',
    fixtures: fixtures.length,
    mismatches: mismatches.length,
    counts,
    productionSafe: false,
  };
}

function countBy(values) {
  const out = {};
  for (const value of values) out[value] = (out[value] ?? 0) + 1;
  return out;
}

function renderMarkdown(report) {
  const lines = [
    '# Roll20 Chat Structure Compare',
    '',
    `Generated: ${report.generatedAt}`,
    `Run: \`${report.runDir}\``,
    `Local smoke: \`${report.localSmoke}\``,
    '',
    '| Fixture | Status | Local template | Actual template | Rows L/A | Chosen roll | Actual strategy | Decision | Next |',
    '| --- | --- | --- | --- | ---: | --- | --- | --- | --- |',
  ];
  for (const fixture of report.fixtures) {
    lines.push(`| \`${fixture.fixtureId}\` | ${fixture.status} | \`${fixture.local.templateClass || ''}\` | \`${fixture.actual.templateClass || ''}\` | ${fixture.local.rowCount}/${fixture.actual.rowCount} | \`${fixture.local.chosenRollButton || ''}\` | ${escapeCell(fixture.actual.selectedTemplateStrategy || '')} | ${fixture.decision} | ${fixture.nextAction} |`);
  }
  lines.push('', '## Claim Boundary', '');
  lines.push('- This report validates whether pixel diffs compare the same rolltemplate structure.');
  lines.push('- A template/row/text mismatch means recapture or rolltemplate runtime fixes come before renderer CSS.');
  return `${lines.join('\n')}\n`;
}

function escapeCell(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, '<br>');
}
