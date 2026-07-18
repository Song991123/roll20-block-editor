#!/usr/bin/env node
/**
 * Run the current Roll20 chat-metrics handoff as one repeatable command.
 *
 * This wraps the three commands agents otherwise have to remember:
 * - audit existing chat DOM sidecars for current row/typography/paint fields
 * - generate a recapture plan with --require-current-metrics
 * - self-test the generated probe shape
 *
 * It writes only ignored local report files under the selected run folder.
 */

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const runDir = path.resolve(args[0] ?? '');

if (!args[0]) {
  console.error('Usage: node scripts/roll20_chat_current_handoff.mjs reports/roll20-actual-compare/<label>');
  process.exit(2);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  if (!existsSync(runDir)) throw new Error(`missing run folder: ${runDir}`);

  const commands = [
    {
      id: 'audit',
      command: ['node', 'scripts/roll20_chat_current_metrics_audit.mjs', runDir],
    },
    {
      id: 'plan',
      command: ['node', 'scripts/roll20_chat_capture_plan.mjs', runDir, '--require-current-metrics'],
    },
    {
      id: 'self-test',
      command: ['node', 'scripts/roll20_chat_capture_plan.mjs', '--self-test'],
    },
  ];

  const results = commands.map(runCommand);
  const failed = results.filter((result) => result.exitCode !== 0);
  const audit = readJsonIfExists(path.join(runDir, 'chat-current-metrics-audit', 'chat-current-metrics-audit-results.json'));
  const plan = readJsonIfExists(path.join(runDir, 'roll20-chat-capture-plan', 'roll20-chat-capture-plan-results.json'));
  const outDir = path.join(runDir, 'roll20-chat-current-handoff');

  const report = {
    generatedAt: new Date().toISOString(),
    runDir,
    status: failed.length ? 'FAIL' : plan?.plannedEntries?.length ? 'NEEDS_RECAPTURE' : 'CURRENT',
    scope: 'local-only Roll20 chat current-metrics handoff; not visual parity',
    commands: results,
    currentMetrics: audit
      ? {
          status: audit.status,
          currentFixtures: audit.summary?.pass ?? 0,
          totalFixtures: audit.summary?.fixtures ?? 0,
          missingFields: audit.summary?.missingFieldTotal ?? 0,
          staleFixtures: audit.fixtures
            ?.filter((fixture) => fixture.status !== 'PASS')
            .map((fixture) => ({
              fixtureId: fixture.fixtureId,
              missing: fixture.missing,
              sidecar: fixture.sidecar,
              sidecarPath: sidecarPath(fixture.sidecar),
            })) ?? [],
        }
      : null,
    capturePlan: plan
      ? {
          plannedFixtures: plan.plannedEntries?.map((entry) => ({
            fixtureId: entry.fixtureId,
            captureReasons: entry.captureReasons,
            sheetFrameProbeCommand: entry.sheetFrameProbeCommand,
            chatCaptureCommand: entry.chatCaptureCommand,
            snippetPath: entry.snippetPath,
            targets: entry.targets,
          })) ?? [],
          snippetChecks: plan.snippetChecks ?? [],
          followUpCommands: plan.followUpCommands ?? [],
        }
      : null,
    nextAction: failed.length
      ? 'Fix the failed handoff command before recapturing Roll20 chat evidence.'
      : plan?.plannedEntries?.length
        ? 'Recapture the planned Roll20 chat PNG and DOM sidecar for each planned fixture, then rerun screenshot diff, chat parity diagnostics, renderer action gate, and status.'
        : 'Chat current metrics are present; rerun renderer action/status gates before considering any renderer change.',
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'roll20-chat-current-handoff-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'roll20-chat-current-handoff-results.md'), renderMarkdown(report), 'utf8');

  console.log(`ROLL20 CHAT CURRENT HANDOFF ${report.status}`);
  console.log(`run=${rel(runDir)}`);
  console.log(`commands=${results.filter((result) => result.exitCode === 0).length}/${results.length} passed`);
  if (report.currentMetrics) {
    console.log(`currentMetrics=${report.currentMetrics.currentFixtures}/${report.currentMetrics.totalFixtures}`);
    console.log(`missingFields=${report.currentMetrics.missingFields}`);
  }
  if (report.capturePlan) {
    console.log(`plannedFixtures=${report.capturePlan.plannedFixtures.length}`);
    for (const entry of report.capturePlan.plannedFixtures) {
      console.log(`CHAT_CURRENT_RECAPTURE ${entry.fixtureId}: ${entry.captureReasons.join('; ')}`);
    }
  }
  console.log(`out=${rel(outDir)}`);

  if (failed.length) process.exitCode = 1;
}

function runCommand({ id, command }) {
  const result = spawnSync(command[0], command.slice(1), {
    cwd: process.cwd(),
    encoding: 'utf8',
    windowsHide: true,
  });
  return {
    id,
    command: command.map((part) => part.includes(' ') ? JSON.stringify(part) : part).join(' '),
    exitCode: result.status ?? 1,
    stdout: result.stdout?.trim() ?? '',
    stderr: result.stderr?.trim() ?? '',
  };
}

function readJsonIfExists(file) {
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, 'utf8'));
}

function renderMarkdown(report) {
  const lines = [
    '# Roll20 Chat Current-Metrics Handoff',
    '',
    `Generated: ${report.generatedAt}`,
    `Run: \`${rel(report.runDir)}\``,
    '',
    `Status: **${report.status}**`,
    '',
    'Scope: local-only handoff for current Roll20 chat sidecar metrics. This is not visual parity.',
    '',
    '## Commands',
    '',
    '| Step | Exit | Command |',
    '| --- | ---: | --- |',
  ];
  for (const result of report.commands) {
    lines.push(`| ${result.id} | ${result.exitCode} | \`${result.command}\` |`);
  }
  lines.push('');
  if (report.currentMetrics) {
    lines.push('## Current Metrics');
    lines.push('');
    lines.push(`- Current fixtures: ${report.currentMetrics.currentFixtures}/${report.currentMetrics.totalFixtures}`);
    lines.push(`- Missing fields: ${report.currentMetrics.missingFields}`);
    if (report.currentMetrics.staleFixtures.length) {
      lines.push('');
      lines.push('| Fixture | Missing fields | Sidecar |');
      lines.push('| --- | --- | --- |');
      for (const fixture of report.currentMetrics.staleFixtures) {
        lines.push(`| \`${fixture.fixtureId}\` | ${escapeCell(fixture.missing.join(', '))} | \`${fixture.sidecarPath ? rel(path.resolve(fixture.sidecarPath)) : 'missing'}\` |`);
      }
    }
    lines.push('');
  }
  if (report.capturePlan) {
    lines.push('## Recapture Plan');
    lines.push('');
    lines.push(`- Planned fixtures: ${report.capturePlan.plannedFixtures.length}`);
    if (report.capturePlan.plannedFixtures.length) {
      lines.push('');
      lines.push('| Fixture | Reasons | Sheet-frame probe | Chat capture | Snippet |');
      lines.push('| --- | --- | --- | --- | --- |');
      for (const fixture of report.capturePlan.plannedFixtures) {
        lines.push(`| \`${fixture.fixtureId}\` | ${escapeCell(fixture.captureReasons.join('; '))} | \`${fixture.sheetFrameProbeCommand ?? 'run probe:roll20-sheet-frame first'}\` | \`${fixture.chatCaptureCommand ?? 'run capture:roll20-chat-cdp after probe'}\` | \`${fixture.snippetPath}\` |`);
      }
    }
    lines.push('');
    lines.push('## Follow-Up Commands');
    lines.push('');
    for (const command of report.capturePlan.followUpCommands) {
      lines.push(`- \`${command}\``);
    }
    lines.push('');
  }
  lines.push('## Next Action');
  lines.push('');
  lines.push(report.nextAction);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function escapeCell(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, '<br>');
}

function sidecarPath(sidecar) {
  if (!sidecar) return '';
  if (typeof sidecar === 'string') return sidecar;
  if (typeof sidecar.path === 'string') return sidecar.path;
  return '';
}

function rel(file) {
  return path.relative(process.cwd(), file) || '.';
}
