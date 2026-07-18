/**
 * Roll20 runtime visibility verification bundle.
 *
 * This wraps the existing focused smokes for the user-facing requirement:
 * worker scripts and rolltemplates must not visibly render on the sheet canvas,
 * while worker state and roll button -> chat simulation still work locally.
 *
 * Scope: local app/runtime evidence only. This does not prove actual Roll20
 * Sandbox or room visual parity.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);

const options = {
  outDir: argOf('--out-dir', './out'),
  basePath: argOf('--base-path', '/roll20-block-editor'),
  fixtures: argOf('--fixtures', 'test-fixtures/visual'),
  reportDir: argOf('--report-dir', 'reports/runtime-visibility-verify'),
  port: Number(argOf('--port', '4390')),
};

const startedAt = new Date().toISOString();
const steps = [
  {
    id: 'worker-workspace',
    description: 'Imported worker scripts are separated from visible HTML workspace.',
    command: ['node', ['scripts/worker_workspace_smoke.mjs']],
  },
  {
    id: 'worker-state',
    description: 'Preview worker state updates hidden/default controls used by CSS and rolls.',
    command: ['node', ['scripts/sheet_worker_state_smoke.mjs']],
  },
  {
    id: 'sandbox-preview-runtime-hidden',
    description: 'Roll20 Sandbox expected preview strips runtime nodes from the visible sheet root.',
    command: [
      'node',
      [
        'scripts/roll20_sandbox_preview_smoke.mjs',
        '--all',
        '--out-dir',
        options.outDir,
        '--base-path',
        options.basePath,
        '--fixtures',
        options.fixtures,
        '--report-dir',
        'reports/roll20-sandbox-preview-smoke',
        '--port',
        String(options.port),
      ],
    ],
  },
  {
    id: 'preview-edit-runtime-hidden',
    description: 'Local preview and edit Shadow render have matching DOM signatures with no visible runtime nodes.',
    command: [
      'node',
      [
        'scripts/preview_edit_visual_smoke.mjs',
        '--out-dir',
        options.outDir,
        '--base-path',
        options.basePath,
        '--fixtures',
        options.fixtures,
        '--report-dir',
        'reports/preview-edit-visual',
        '--port',
        String(options.port + 1),
      ],
    ],
  },
  {
    id: 'rolltemplate-chat',
    description: 'Roll buttons render matching rolltemplate cards in the local ChatPane instead of showing raw rolltemplate source.',
    command: [
      'node',
      [
        'scripts/rolltemplate_chat_smoke.mjs',
        '--out-dir',
        options.outDir,
        '--base-path',
        options.basePath,
        '--fixtures',
        options.fixtures,
        '--report-dir',
        'reports/rolltemplate-chat-smoke',
        '--port',
        String(options.port + 2),
      ],
    ],
  },
];

const results = [];
for (const step of steps) {
  const [cmd, cmdArgs] = step.command;
  const started = Date.now();
  const child = spawnSync(cmd, cmdArgs, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
  });
  const durationMs = Date.now() - started;
  const result = {
    id: step.id,
    description: step.description,
    command: [cmd, ...cmdArgs].join(' '),
    status: child.status === 0 ? 'PASS' : 'FAIL',
    exitCode: child.status,
    durationMs,
    stdoutTail: tail(child.stdout),
    stderrTail: tail(child.stderr),
  };
  results.push(result);
  console.log(`${result.status} ${step.id} (${durationMs}ms)`);
  if (child.stdout?.trim()) console.log(tail(child.stdout, 8));
  if (child.stderr?.trim()) console.error(tail(child.stderr, 8));
  if (child.status !== 0) break;
}

const report = {
  status: results.every((item) => item.status === 'PASS') && results.length === steps.length ? 'PASS' : 'FAIL',
  startedAt,
  finishedAt: new Date().toISOString(),
  options,
  steps: results,
  claimBoundary:
    'Local runtime visibility and simulation only. Actual Roll20 Sandbox/test-room screenshots are still required for visual parity.',
};

mkdirSync(options.reportDir, { recursive: true });
writeFileSync(path.join(options.reportDir, 'runtime-visibility-verify-results.json'), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(path.join(options.reportDir, 'runtime-visibility-verify-results.md'), renderMarkdown(report));

if (report.status !== 'PASS') {
  console.error(`RUNTIME VISIBILITY VERIFY FAIL -> ${path.resolve(options.reportDir)}`);
  process.exit(1);
}

console.log(`RUNTIME VISIBILITY VERIFY PASS -> ${path.resolve(options.reportDir)}`);

function argOf(name, fallback) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

function tail(value = '', lineCount = 20) {
  const lines = String(value).trim().split(/\r?\n/).filter(Boolean);
  return lines.slice(-lineCount).join('\n');
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Runtime Visibility Verify');
  lines.push('');
  lines.push(`Status: ${report.status}`);
  lines.push(`Started: ${report.startedAt}`);
  lines.push(`Finished: ${report.finishedAt}`);
  lines.push('');
  lines.push('## Claim Boundary');
  lines.push('');
  lines.push(report.claimBoundary);
  lines.push('');
  lines.push('## Steps');
  lines.push('');
  lines.push('| Step | Status | Duration ms | Purpose |');
  lines.push('| --- | --- | ---: | --- |');
  for (const step of report.steps) {
    lines.push(`| ${step.id} | ${step.status} | ${step.durationMs} | ${escapeCell(step.description)} |`);
  }
  lines.push('');
  lines.push('## Commands');
  lines.push('');
  for (const step of report.steps) {
    lines.push(`- ${step.id}: \`${step.command}\``);
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function escapeCell(value) {
  return String(value).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}
