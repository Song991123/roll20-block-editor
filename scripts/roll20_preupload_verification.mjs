#!/usr/bin/env node
/**
 * Run the local Roll20 pre-upload verification gate for one actual-compare run.
 *
 * This orchestrates the checks that must pass before attempting Custom Sheet
 * Sandbox/test-room upload:
 * - payload hygiene
 * - cleaned-payload visual roundtrip
 * - state selector anchor regression audit
 * - asset/resource reachability regression audit
 * - local evidence guard
 *
 * It writes a local-only ignored summary under the run folder. Passing this
 * script means the payload is ready to upload; it does not prove Roll20 visual
 * parity because no Roll20 screenshot has been compared yet.
 *
 * Usage:
 *   node scripts/roll20_preupload_verification.mjs \
 *     reports/roll20-actual-compare/<label> \
 *     --fixtures test-fixtures/visual \
 *     --out-dir ./out \
 *     --base-path /roll20-block-editor \
 *     [--state-map reports/visual-state-candidates/visual-state-candidates-state-map.json]
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const RUN_DIR = path.resolve(args[0] ?? 'reports/roll20-actual-compare/2026-06-18-pseudo-fix-v1');

function argOf(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

const FIXTURES_DIR = path.resolve(argOf('--fixtures', 'test-fixtures/visual'));
const OUT_DIR = path.resolve(argOf('--out-dir', './out'));
const BASE_PATH = argOf('--base-path', '/roll20-block-editor');
const STATE_MAP_PATH = argOf('--state-map', '');
const REPORT_DIR = path.join(RUN_DIR, 'preupload-verification');
const NODE = process.execPath;
const RUN_PARENT_DIR = path.dirname(RUN_DIR);
const RUN_LABEL = path.basename(RUN_DIR);

function maybeStateMapArgs() {
  return STATE_MAP_PATH ? ['--state-map', path.resolve(STATE_MAP_PATH)] : [];
}

const checks = [
  {
    id: 'local-baseline',
    title: 'Fresh local baseline and upload payload generation',
    command: [
      NODE,
      'scripts/roll20_actual_local_baseline.mjs',
      '--out-dir',
      OUT_DIR,
      '--base-path',
      BASE_PATH,
      '--fixtures',
      FIXTURES_DIR,
      '--report-dir',
      RUN_PARENT_DIR,
      '--run-label',
      RUN_LABEL,
      ...maybeStateMapArgs(),
    ],
  },
  {
    id: 'payload-audit',
    title: 'Payload hygiene audit',
    command: [NODE, 'scripts/roll20_payload_audit.mjs', RUN_DIR],
  },
  {
    id: 'sandbox-sanitize-audit',
    title: 'Roll20 sandbox sanitize audit',
    command: [NODE, 'scripts/roll20_sandbox_sanitize_audit.mjs', RUN_DIR],
  },
  {
    id: 'payload-roundtrip',
    title: 'Cleaned-payload visual roundtrip',
    command: [
      NODE,
      'scripts/roll20_payload_roundtrip_visual_smoke.mjs',
      RUN_DIR,
      '--out-dir',
      OUT_DIR,
      '--base-path',
      BASE_PATH,
      ...maybeStateMapArgs(),
    ],
  },
  {
    id: 'state-selectors',
    title: 'Default-state selector audit',
    command: [
      NODE,
      'scripts/roll20_state_selector_audit.mjs',
      '--fixtures',
      FIXTURES_DIR,
      '--payload-run',
      RUN_DIR,
      '--report-dir',
      'reports/state-selector-audit',
    ],
  },
  {
    id: 'assets',
    title: 'Asset/resource audit',
    command: [
      NODE,
      'scripts/roll20_asset_resource_audit.mjs',
      '--fixtures',
      FIXTURES_DIR,
      '--payload-run',
      RUN_DIR,
      '--report-dir',
      'reports/asset-resource-audit',
    ],
  },
  {
    id: 'evidence-guard',
    title: 'Local evidence guard',
    command: [NODE, 'scripts/roll20_actual_evidence_guard.mjs', RUN_DIR],
  },
];

async function main() {
  if (!existsSync(RUN_DIR)) {
    throw new Error(`missing run folder: ${RUN_DIR}`);
  }
  const startedAt = new Date().toISOString();
  const results = [];
  for (const check of checks) {
    console.log(`RUN ${check.id}`);
    const result = runCheck(check);
    results.push(result);
    console.log(`${result.ok ? 'PASS' : 'FAIL'} ${check.id}`);
    if (!result.ok) break;
  }

  const report = {
    generatedAt: new Date().toISOString(),
    startedAt,
    runDir: RUN_DIR,
    fixtureRoot: FIXTURES_DIR,
    outDir: OUT_DIR,
    basePath: BASE_PATH,
    stateMapPath: STATE_MAP_PATH ? path.resolve(STATE_MAP_PATH) : null,
    scope: 'local pre-upload gate; not Roll20 visual parity',
    pass: results.length === checks.length && results.every((result) => result.ok),
    results,
    nextAction:
      results.length === checks.length && results.every((result) => result.ok)
        ? 'Upload the payload files in Roll20 Custom Sheet Sandbox, capture roll20-sandbox.png and roll20-chat.png, then run scripts/roll20_actual_screenshot_diff.mjs.'
        : 'Fix the failing local pre-upload check before attempting Roll20 upload.',
  };

  await fs.mkdir(REPORT_DIR, { recursive: true });
  await fs.writeFile(path.join(REPORT_DIR, 'preupload-verification-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(path.join(REPORT_DIR, 'preupload-verification-results.md'), renderMarkdown(report), 'utf8');

  console.log(report.pass ? 'ROLL20 PREUPLOAD VERIFICATION PASS' : 'ROLL20 PREUPLOAD VERIFICATION FAIL');
  process.exitCode = report.pass ? 0 : 1;
}

function runCheck(check) {
  const started = Date.now();
  const child = spawnSync(check.command[0], check.command.slice(1), {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 20,
  });
  return {
    id: check.id,
    title: check.title,
    command: check.command.map((part) => quoteArg(part)).join(' '),
    exitCode: child.status,
    signal: child.signal,
    ok: child.status === 0,
    elapsedMs: Date.now() - started,
    stdout: trimOutput(child.stdout),
    stderr: trimOutput(child.stderr),
  };
}

function trimOutput(value) {
  const text = String(value ?? '').trim();
  const limit = 12000;
  return text.length > limit ? `${text.slice(0, limit)}\n... truncated ...` : text;
}

function quoteArg(value) {
  const text = String(value);
  return /\s/.test(text) ? `"${text.replace(/"/g, '\\"')}"` : text;
}

function renderMarkdown(report) {
  const lines = [
    '# Roll20 Pre-upload Verification',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    'Scope: local pre-upload gate. This does not prove Roll20 visual parity.',
    '',
    `Run folder: \`${path.relative(process.cwd(), report.runDir)}\``,
    '',
    '| Check | Result | Exit | Time |',
    '| --- | --- | ---: | ---: |',
  ];

  for (const result of report.results) {
    lines.push(`| ${result.title} | ${result.ok ? 'PASS' : 'FAIL'} | ${result.exitCode} | ${result.elapsedMs}ms |`);
  }

  lines.push('', `Overall: **${report.pass ? 'PASS' : 'FAIL'}**`, '', `Next action: ${report.nextAction}`, '');

  for (const result of report.results) {
    lines.push(`## ${result.title}`, '', `Command: \`${result.command}\``, '', `Exit: ${result.exitCode}`, '');
    if (result.stdout) lines.push('<details><summary>stdout</summary>', '', '```text', result.stdout, '```', '', '</details>', '');
    if (result.stderr) lines.push('<details><summary>stderr</summary>', '', '```text', result.stderr, '```', '', '</details>', '');
  }

  return `${lines.join('\n')}\n`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
