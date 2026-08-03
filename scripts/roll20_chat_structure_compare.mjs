#!/usr/bin/env node
/**
 * Compare local ChatPane rolltemplate structure against actual Roll20 chat DOM.
 *
 * This catches evidence-quality issues that pixel diff alone cannot explain,
 * especially when Roll20 capture selected a different visible rolltemplate than
 * the local smoke clicked. Diagnostic only; does not change renderer behavior.
 */

import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { findTemplateChild } from './lib/roll20ChatMetrics.mjs';
import { payloadRequiresChat } from './lib/roll20PayloadCapabilities.mjs';

const rawArgs = process.argv.slice(2).filter((arg) => arg !== '--');
const SELF_TEST = rawArgs.includes('--self-test');
const args = rawArgs.filter((arg) => arg !== '--self-test');

if (SELF_TEST) {
  await selfTest();
  process.exit(0);
}

const runDirArg = args[0] ?? 'reports/roll20-actual-compare/2026-06-18-state-map-v1';
const localSmokeArg = args[1] ?? 'reports/rolltemplate-chat-smoke/rolltemplate-chat-smoke-results.json';
const runDir = path.resolve(runDirArg);
const localSmokeFile = path.resolve(localSmokeArg);
const outDir = path.join(runDir, 'chat-structure-compare');

const localSmoke = await readJsonIfExists(localSmokeFile);
const fixtureInventory = await discoverFixtureInventory(runDir);
const fixtureIds = fixtureInventory
  .filter((fixture) => fixture.applicable)
  .map((fixture) => fixture.fixtureId);
const fixtures = [];

for (const fixtureId of fixtureIds) {
  const localFixture = localSmoke?.fixtures?.find((fixture) => fixture.id === fixtureId);
  const localTemplate = localFixture?.cardInfo?.templateComputed ?? null;
  const actualSidecar = await readJsonIfExists(path.join(runDir, 'local-baseline', fixtureId, 'screenshots', 'roll20-chat-dom-evidence.json'));
  const actualTemplate = actualSidecar?.latestTemplate ?? actualSidecar?.selectedTemplate ?? null;
  fixtures.push(compareFixture(fixtureId, localFixture, localTemplate, actualSidecar, actualTemplate));
}

const report = {
  generatedAt: new Date().toISOString(),
  runDir: runDirArg,
  localSmoke: localSmokeArg,
  scope: 'diagnostic-only chat rolltemplate structure comparison',
  summary: summarize(fixtures, fixtureInventory.length),
  fixtureInventory,
  fixtures,
};

await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, 'chat-structure-compare-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeFile(path.join(outDir, 'chat-structure-compare-results.md'), renderMarkdown(report), 'utf8');

console.log(`ROLL20 CHAT STRUCTURE ${report.summary.status}`);
console.log(`fixtures=${report.summary.fixtures}/${report.summary.allFixtures}`);
console.log(`skippedNotApplicable=${report.summary.notApplicable}`);
for (const fixture of fixtures) {
  console.log(`FIXTURE ${fixture.fixtureId} status=${fixture.status} local=${fixture.local.templateClass || 'n/a'} actual=${fixture.actual.templateClass || 'n/a'} rows=${fixture.local.rowCount}/${fixture.actual.rowCount} decision=${fixture.decision} next=${fixture.nextAction}`);
}
console.log(`out=${path.relative(process.cwd(), outDir)}`);

async function discoverFixtureInventory(targetRunDir) {
  const baselineDir = path.join(targetRunDir, 'local-baseline');
  if (!existsSync(baselineDir)) return [];
  const entries = await readdir(baselineDir, { withFileTypes: true });
  const fixtureIds = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  return Promise.all(fixtureIds.map(async (fixtureId) => {
    const payloadHtml = path.join(baselineDir, fixtureId, 'payload', 'sheet.html');
    if (!existsSync(payloadHtml)) {
      return { fixtureId, applicable: false, reason: 'payload HTML missing' };
    }
    const applicable = payloadRequiresChat(await readFile(payloadHtml, 'utf8'));
    return {
      fixtureId,
      applicable,
      reason: applicable ? 'Roll button or Rolltemplate present' : 'payload has no Roll button or Rolltemplate',
    };
  }));
}

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
    tableText: findTemplateChild(localTemplate, 'table')?.text
      ?? localTemplate?.text
      ?? localFixture?.cardInfo?.latestMessage?.text
      ?? '',
  };
  const actualInfo = {
    selectedTemplateStrategy: actualSidecar?.selectedTemplateStrategy ?? '',
    latestMessageText: actualSidecar?.latestMessage?.text ?? '',
    templateClass: actualTemplate?.className ?? '',
    rowCount: actualRows.length,
    rowSignature: actualSignature,
    tableText: findTemplateChild(actualTemplate, 'table')?.text ?? actualTemplate?.text ?? '',
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
  const dynamicTextMatches = normalizeDynamicRollText(localTemplate, localInfo.tableText)
    === normalizeDynamicRollText(actualTemplate, actualInfo.tableText);
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
    if (dynamicTextMatches) {
      status = 'DYNAMIC_RESULT_MISMATCH';
      decision = 'RECAPTURE_DETERMINISTIC_ROLL_RESULT';
      nextAction = 'Rows and static text match; only inline Roll result substitutions differ. Use the same deterministic result before drawing pixel conclusions.';
    } else {
      status = 'TEXT_MISMATCH';
      decision = 'FIX_ROLLTEMPLATE_TEXT_OR_I18N';
      nextAction = 'Rows match but rendered text differs. Compare translation/i18n, field values, defaults, and Roll substitutions before CSS.';
    }
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
      dynamicTextMatches,
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
      dynamicTextMatches: false,
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

function normalizeDynamicRollText(template, value) {
  let normalized = normalizeText(value);
  const rawChildren = template?.computedChildren ?? template?.elements ?? [];
  const children = Array.isArray(rawChildren)
    ? rawChildren
    : rawChildren && typeof rawChildren === 'object'
      ? Object.values(rawChildren)
      : [];
  const dynamicValues = [...new Set(children
    .filter((child) => /inlinerollresult/i.test(String(child?.selector ?? child?.className ?? '')))
    .map((child) => normalizeText(child?.text))
    .filter(Boolean))]
    .sort((a, b) => b.length - a.length);
  for (const dynamicValue of dynamicValues) {
    normalized = normalized.split(dynamicValue).join('<inline-roll>');
  }
  return normalized.replace(/\s*<inline-roll>\s*/g, '<inline-roll>');
}

function summarize(fixtures, allFixtures = fixtures.length) {
  const counts = countBy(fixtures.map((fixture) => fixture.status));
  const mismatches = fixtures.filter((fixture) => fixture.status !== 'STRUCTURE_MATCH');
  return {
    status: fixtures.length === 0
      ? 'NO_APPLICABLE_FIXTURES'
      : mismatches.length
        ? 'STRUCTURE_MISMATCH_FOUND'
        : 'STRUCTURE_MATCHED',
    fixtures: fixtures.length,
    allFixtures,
    notApplicable: Math.max(0, allFixtures - fixtures.length),
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
    `Applicable fixtures: ${report.summary.fixtures}/${report.summary.allFixtures}`,
    `Skipped as not applicable: ${report.summary.notApplicable}`,
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

async function selfTest() {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'roll20-chat-structure-'));
  try {
    const chatPayloadDir = path.join(tempDir, 'local-baseline', 'fixture-A', 'payload');
    const layoutPayloadDir = path.join(tempDir, 'local-baseline', 'fixture-B', 'payload');
    await mkdir(chatPayloadDir, { recursive: true });
    await mkdir(layoutPayloadDir, { recursive: true });
    await writeFile(path.join(chatPayloadDir, 'sheet.html'), '<button type=roll name="roll_test">Roll</button>', 'utf8');
    await writeFile(path.join(layoutPayloadDir, 'sheet.html'), '<input type="text" name="attr_name">', 'utf8');

    const inventory = await discoverFixtureInventory(tempDir);
    const applicable = inventory.filter((fixture) => fixture.applicable).map((fixture) => fixture.fixtureId);
    if (inventory.length !== 2 || applicable.length !== 1 || applicable[0] !== 'fixture-A') {
      throw new Error(`dynamic fixture discovery failed: ${JSON.stringify(inventory)}`);
    }
    const summary = summarize([], inventory.length);
    if (summary.status !== 'NO_APPLICABLE_FIXTURES' || summary.notApplicable !== 2) {
      throw new Error(`empty applicability summary failed: ${JSON.stringify(summary)}`);
    }
    if (findTemplateChild({ computedChildren: '[Circular]' }, 'table') !== null) {
      throw new Error('non-collection computedChildren must be ignored');
    }
    const tableChild = { selector: 'table', text: 'proof' };
    if (findTemplateChild({ computedChildren: { table: tableChild } }, 'table') !== tableChild) {
      throw new Error('object-form computedChildren must be normalized');
    }
    const dynamicResult = compareFixture(
      'fixture-C',
      {
        chosen: { name: 'roll_test', value: '&{template:proof}' },
        cardInfo: { latestMessage: { text: 'Result6' } },
      },
      {
        className: 'sheet-rolltemplate-proof',
        rowMetrics: [],
        computedChildren: [{ selector: '.inlinerollresult:first', text: '6' }],
      },
      { rolltemplates: [{ className: 'sheet-rolltemplate-proof' }] },
      {
        className: 'sheet-rolltemplate-proof',
        text: 'Result 1',
        rowMetrics: [],
        computedChildren: [{ selector: '.inlinerollresult:first', text: '1' }],
      },
    );
    if (dynamicResult.status !== 'DYNAMIC_RESULT_MISMATCH' || !dynamicResult.checks.dynamicTextMatches) {
      throw new Error(`dynamic Roll result classification failed: ${JSON.stringify(dynamicResult)}`);
    }
    console.log('ROLL20 CHAT STRUCTURE SELF-TEST PASS');
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
