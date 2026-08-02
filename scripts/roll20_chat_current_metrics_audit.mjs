#!/usr/bin/env node
/**
 * Audit whether Roll20 chat DOM sidecars contain the current renderer metrics.
 *
 * This is a local-only evidence audit. It does not contact Roll20 and does not
 * make visual parity claims. Use it before tuning ChatPane CSS so stale chat
 * sidecars do not look stronger than they are.
 */

import { existsSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { findTemplateChild, inspectCurrentChatMetrics } from './lib/roll20ChatMetrics.mjs';
import { payloadRequiresChat } from './lib/roll20PayloadCapabilities.mjs';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const optionNamesWithValues = new Set(['--out-dir']);
const runDirArg = firstPositionalArg();
const runDir = path.resolve(runDirArg ?? '');
const rawOutDir = readOption('--out-dir', '');
const requestedOutDir = rawOutDir ? path.resolve(rawOutDir) : path.join(runDir, 'chat-current-metrics-audit');

if (!runDirArg) {
  console.error('Usage: node scripts/roll20_chat_current_metrics_audit.mjs reports/roll20-actual-compare/<label> [--out-dir <writable-dir>]');
  process.exit(2);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  if (!existsSync(runDir)) throw new Error(`missing run folder: ${runDir}`);
  const baselineDir = path.join(runDir, 'local-baseline');
  if (!existsSync(baselineDir)) throw new Error(`missing local baseline folder: ${baselineDir}`);

  const fixtureIds = (await fs.readdir(baselineDir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const fixtures = [];
  for (const fixtureId of fixtureIds) {
    fixtures.push(await auditFixture(fixtureId));
  }

  const applicableFixtures = fixtures.filter((fixture) => fixture.status !== 'NOT_APPLICABLE');
  const missingFixtures = applicableFixtures.filter((fixture) => fixture.status !== 'PASS');
  const report = {
    generatedAt: new Date().toISOString(),
    runDir,
    status: missingFixtures.length ? 'NEEDS_RECAPTURE' : 'PASS',
    scope: 'local-only Roll20 chat DOM sidecar metric audit; not visual parity',
    requiredFields: requiredFieldLabels(),
    summary: {
      fixtures: applicableFixtures.length,
      allFixtures: fixtures.length,
      notApplicable: fixtures.length - applicableFixtures.length,
      pass: applicableFixtures.length - missingFixtures.length,
      needsRecapture: missingFixtures.length,
      missingFieldTotal: applicableFixtures.reduce((sum, fixture) => sum + fixture.missing.length, 0),
    },
    fixtures,
    nextActions: buildNextActions(missingFixtures),
  };

  const writeResult = await writeReport(report, requestedOutDir);

  console.log(`ROLL20 CHAT CURRENT METRICS ${report.status}`);
  console.log(`run=${rel(runDir)}`);
  console.log(`fixtures=${report.summary.pass}/${report.summary.fixtures} current`);
  console.log(`skippedNotApplicable=${report.summary.notApplicable}`);
  console.log(`missingFields=${report.summary.missingFieldTotal}`);
  for (const fixture of missingFixtures) {
    console.log(`STALE_CHAT_METRICS ${fixture.fixtureId}: missing ${fixture.missing.join(', ')}`);
  }
  if (writeResult.fallbackReason) {
    console.log(`WARNING report write fallback: ${writeResult.fallbackReason}`);
  }
  console.log(`out=${rel(writeResult.outDir)}`);
}

function readOption(name, fallback = '') {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  const value = args[index + 1];
  if (!value || value.startsWith('--')) return fallback;
  return value;
}

function firstPositionalArg() {
  return args.find((arg, index) => !arg.startsWith('--') && !optionNamesWithValues.has(args[index - 1]));
}

async function writeReport(report, outDir) {
  const writeTo = async (dir, fallbackReason = '') => {
    const output = {
      requestedOutDir: rel(requestedOutDir),
      outDir: rel(dir),
      fallbackReason,
    };
    const reportWithOutput = { ...report, output };
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      path.join(dir, 'chat-current-metrics-audit-results.json'),
      `${JSON.stringify(reportWithOutput, null, 2)}\n`,
      'utf8',
    );
    await fs.writeFile(
      path.join(dir, 'chat-current-metrics-audit-results.md'),
      renderMarkdown(reportWithOutput),
      'utf8',
    );
    return { outDir: dir, fallbackReason };
  };

  try {
    return await writeTo(outDir);
  } catch (error) {
    if (rawOutDir || !isAccessError(error)) throw error;
    const fallbackDir = path.resolve(
      '..',
      '_tmp_codex_smoke',
      `chat-current-metrics-audit-${path.basename(runDir)}-${Date.now()}`,
    );
    return writeTo(fallbackDir, `${error.code ?? 'WRITE_ERROR'} while writing ${rel(outDir)}`);
  }
}

async function auditFixture(fixtureId) {
  const fixtureDir = path.join(runDir, 'local-baseline', fixtureId);
  const payloadHtml = path.join(fixtureDir, 'payload', 'sheet.html');
  const chatApplicable = existsSync(payloadHtml)
    && payloadRequiresChat(await fs.readFile(payloadHtml, 'utf8'));
  if (!chatApplicable) {
    return {
      fixtureId,
      status: 'NOT_APPLICABLE',
      missing: [],
      sidecar: null,
      latestTemplate: null,
      table: null,
      note: 'payload has no Roll button or Rolltemplate',
    };
  }

  const screenshots = path.join(fixtureDir, 'screenshots');
  const sidecarFile = path.join(screenshots, 'roll20-chat-dom-evidence.json');
  const screenshotFile = path.join(screenshots, 'roll20-chat.png');
  const sidecar = await readJsonIfExists(sidecarFile);
  const template = sidecar
    ? sidecar.latestTemplate ??
      [...(sidecar.rolltemplates ?? [])].reverse().find((item) => item?.rect?.width) ??
      null
    : null;
  const table = findTemplateChild(template, 'table');
  const currentMetrics = inspectCurrentChatMetrics(sidecar, { requireTextMeasure: true });
  const missing = [...currentMetrics.missing];

  if (!existsSync(screenshotFile)) missing.push('roll20-chat.png');

  return {
    fixtureId,
    status: missing.length ? 'NEEDS_RECAPTURE' : 'PASS',
    missing,
    sidecar: {
      path: rel(sidecarFile),
      exists: existsSync(sidecarFile),
      capturedAt: sidecar?.capturedAt ?? null,
      chatSelector: sidecar?.chatSelector ?? null,
      chatElementSelector: sidecar?.chatElementSelector ?? null,
      rolltemplateCount: Number(sidecar?.rolltemplateCount ?? sidecar?.rolltemplates?.length ?? 0),
    },
    latestTemplate: template
      ? {
          className: template.className ?? '',
          hasComputedStyle: Boolean(template.computedStyle),
          rowMetrics: Array.isArray(template.rowMetrics) ? template.rowMetrics.length : 0,
          tableApplicable: currentMetrics.tableApplicable,
          tableStructureSource: currentMetrics.tableStructureSource,
          textMeasureStatus: currentMetrics.textMeasureStatus,
          filter: template.computedStyle?.filter ?? null,
        }
      : null,
    table: table
      ? {
          hasComputedStyle: Boolean(table.computedStyle),
          hasBoxMetrics: Boolean(table.boxMetrics),
          filter: table.computedStyle?.filter ?? null,
          width: table.boxMetrics?.width ?? table.rect?.width ?? null,
        }
      : null,
    currentMetrics,
  };
}

function requiredFieldLabels() {
  return [
    'roll20-chat.png',
    'roll20-chat-dom-evidence.json',
    'latestTemplate.computedStyle',
    'latestTemplate.rowMetrics',
    'latestTemplate.tableStructure (table templates only)',
    'table.computedStyle (table templates only)',
    'table.boxMetrics (table templates only)',
    'latestTemplate.computedStyle.textRasterization',
    'table.computedStyle.textRasterization (table templates only)',
    'latestTemplate.computedStyle.filter',
    'table.computedStyle.filter (table templates only)',
    'fontEvidence.checks',
    'textMeasureEvidence.samples',
    'viewportEvidence.devicePixelRatio',
  ];
}

function buildNextActions(missingFixtures) {
  if (!missingFixtures.length) {
    return [
      `node scripts/roll20_actual_screenshot_diff.mjs ${rel(runDir)}`,
      `corepack pnpm run diagnose:roll20-chat-parity -- ${rel(runDir)}`,
      `corepack pnpm run gate:roll20-renderer-action -- ${rel(runDir)}`,
    ];
  }
  return [
    `corepack pnpm run plan:roll20-chat-capture -- ${rel(runDir)} --require-current-metrics`,
    'Recapture each stale fixture in the dedicated Roll20 Custom Sheet Sandbox or approved test room.',
    'Capture roll20-chat.png and roll20-chat-dom-evidence.json from the same roll action within 5 minutes.',
    `node scripts/roll20_actual_screenshot_diff.mjs ${rel(runDir)}`,
    `corepack pnpm run diagnose:roll20-chat-parity -- ${rel(runDir)}`,
    `corepack pnpm run gate:roll20-renderer-action -- ${rel(runDir)}`,
  ];
}

async function readJsonIfExists(file) {
  if (!existsSync(file)) return null;
  try {
    return JSON.parse((await fs.readFile(file, 'utf8')).replace(/^\uFEFF/, ''));
  } catch {
    return null;
  }
}

function renderMarkdown(report) {
  const lines = [
    '# Roll20 Chat Current Metrics Audit',
    '',
    `Generated: ${report.generatedAt}`,
    `Run: \`${rel(report.runDir)}\``,
    `Status: ${report.status}`,
    '',
    'Scope: local-only sidecar freshness audit. This is not Roll20 visual parity.',
    '',
    '## Summary',
    '',
    `- Fixtures current: ${report.summary.pass}/${report.summary.fixtures}`,
    `- Fixtures skipped as not applicable: ${report.summary.notApplicable}/${report.summary.allFixtures}`,
    `- Fixtures needing recapture: ${report.summary.needsRecapture}`,
    `- Missing field total: ${report.summary.missingFieldTotal}`,
    '',
    '## Fixtures',
    '',
    '| Fixture | Status | Missing fields | Latest template | Table filter |',
    '| --- | --- | --- | --- | --- |',
  ];

  for (const fixture of report.fixtures) {
    lines.push(
      `| \`${fixture.fixtureId}\` | ${fixture.status} | ${escapeCell(fixture.missing.join(', ') || 'none')} | ${escapeCell(fixture.latestTemplate?.className ?? '')} | ${escapeCell(fixture.table?.filter ?? '')} |`,
    );
  }

  lines.push('', '## Required Fields', '');
  for (const field of report.requiredFields) lines.push(`- \`${field}\``);

  lines.push('', '## Next Actions', '');
  for (const action of report.nextActions) lines.push(`- ${action.includes(' ') ? `\`${action}\`` : action}`);
  lines.push('', '## Claim Boundary', '');
  lines.push('- PASS here only means the DOM sidecar contains current diagnostic fields.');
  lines.push('- It does not mean the local ChatPane pixels match actual Roll20.');
  lines.push('- Stale sidecars must not be used to promote production renderer CSS.');
  return `${lines.join('\n')}\n`;
}

function escapeCell(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').slice(0, 240);
}

function isAccessError(error) {
  return ['EACCES', 'EPERM'].includes(error?.code);
}

function rel(file) {
  return path.relative(process.cwd(), file);
}
