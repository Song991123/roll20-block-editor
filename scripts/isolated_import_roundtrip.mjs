#!/usr/bin/env node
/**
 * Repeat the imported-sheet roundtrip in fresh child processes.
 *
 * Each child owns one Node process, browser, page, and local server. This keeps
 * a large local input from accumulating Blockly and browser state across
 * repetitions. Reports are local-only and never include source paths/content.
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);

function argOf(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

function boundedInteger(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function parseModes(value) {
  if (value === 'both') return ['modern', 'legacy'];
  if (value === 'modern' || value === 'legacy') return [value];
  throw new Error(`invalid --compatibility-mode: ${value}`);
}

function childArguments(options) {
  return [
    `--max-old-space-size=${options.nodeMemoryMb}`,
    options.childScript,
    '--out-dir',
    options.outDir,
    '--base-path',
    options.basePath,
    '--fixtures',
    options.fixturesDir,
    '--report-dir',
    options.childReportDir,
    '--only',
    options.only,
    '--port',
    String(options.port),
    '--compatibility-mode',
    options.mode,
    '--roundtrip-only',
    'true',
    '--roundtrip-repeats',
    '1',
  ];
}

function runSelfTest() {
  assert.deepEqual(parseModes('both'), ['modern', 'legacy']);
  assert.deepEqual(parseModes('modern'), ['modern']);
  assert.throws(() => parseModes('auto'), /invalid --compatibility-mode/);
  assert.equal(boundedInteger('4.4', 2, 1, 8), 4);
  assert.equal(boundedInteger('99', 2, 1, 8), 8);
  assert.equal(boundedInteger('bad', 2, 1, 8), 2);
  const planned = childArguments({
    nodeMemoryMb: 1024,
    childScript: 'child.mjs',
    outDir: 'out',
    basePath: '/app',
    fixturesDir: 'fixtures',
    childReportDir: 'report',
    only: 'local-input',
    port: 4204,
    mode: 'legacy',
  });
  assert.ok(planned.includes('--max-old-space-size=1024'));
  assert.ok(planned.includes('local-input'));
  assert.ok(planned.includes('legacy'));
  assert.equal(planned.at(-1), '1');
  const splitStatusReport = markdown({
    pass: true,
    runtimeClean: false,
    runs: [{
      mode: 'legacy',
      iteration: 1,
      roundtripPass: true,
      resourcePass: false,
      resourceIssueCount: 2,
      consoleClean: false,
      consoleErrors: 1,
      pageClean: true,
      pageErrors: 0,
      durationMs: 10,
      reimportAttempts: 1,
    }],
  });
  assert.match(splitStatusReport, /Structural roundtrip: PASS/);
  assert.match(splitStatusReport, /Runtime resources: WARN/);
  assert.match(splitStatusReport, /WARN \(2\)/);
  console.log('isolated import roundtrip self-test PASS');
}

async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

function countIssues(value) {
  return Array.isArray(value) ? value.length : 0;
}

function markdown(report) {
  const lines = [
    '# Isolated Import Roundtrip',
    '',
    'Each row ran in a fresh Node and Chromium process. Roundtrip and runtime resource health are reported separately. Source paths and content are omitted.',
    '',
    '| Mode | Iteration | Roundtrip | Resources | Console | Page | Duration ms | Reimports |',
    '| --- | ---: | --- | --- | --- | --- | ---: | ---: |',
  ];
  for (const run of report.runs) {
    lines.push(`| ${run.mode} | ${run.iteration} | ${run.roundtripPass ? 'PASS' : 'FAIL'} | ${run.resourcePass ? 'PASS' : 'WARN'} (${run.resourceIssueCount}) | ${run.consoleClean ? 'PASS' : `WARN (${run.consoleErrors})`} | ${run.pageClean ? 'PASS' : `FAIL (${run.pageErrors})`} | ${run.durationMs} | ${run.reimportAttempts} |`);
  }
  lines.push(
    '',
    `Structural roundtrip: ${report.pass ? 'PASS' : 'FAIL'}`,
    `Runtime resources: ${report.runtimeClean ? 'PASS' : 'WARN'}`,
    '',
  );
  return lines.join('\n');
}

async function main() {
  if (args.includes('--self-test')) {
    runSelfTest();
    return;
  }

  const repoRoot = path.resolve(import.meta.dirname, '..');
  const childScript = path.join(repoRoot, 'scripts', 'imported_edit_sync_smoke.mjs');
  const reportDir = path.resolve(argOf('--report-dir', '.tmp/isolated-import-roundtrip'));
  const outDir = path.resolve(argOf('--out-dir', './out'));
  const fixturesDir = path.resolve(argOf('--fixtures', '.tmp/visual-synthetic'));
  const basePath = argOf('--base-path', '/roll20-block-editor');
  const only = argOf(
    '--only',
    process.env.R20_IMPORTED_EDIT_HTML_PATH ? 'local-input' : 'synthetic-generic-elements',
  );
  const iterations = boundedInteger(argOf('--iterations', '2'), 2, 1, 8);
  const timeoutMs = boundedInteger(argOf('--timeout-ms', '180000'), 180000, 30000, 600000);
  const nodeMemoryMb = boundedInteger(argOf('--node-memory-mb', '1536'), 1536, 512, 4096);
  const port = boundedInteger(argOf('--port', '4204'), 4204, 4173, 4499);
  const modes = parseModes(argOf('--compatibility-mode', 'both'));

  if (!existsSync(childScript)) throw new Error('missing imported edit-sync child script');
  if (!existsSync(path.join(outDir, 'index.html'))) {
    throw new Error('static app output is missing; run `corepack pnpm run build` first');
  }
  if (only === 'local-input' && !process.env.R20_IMPORTED_EDIT_HTML_PATH) {
    throw new Error('local-input requires R20_IMPORTED_EDIT_HTML_PATH');
  }

  await fs.mkdir(reportDir, { recursive: true });
  const report = {
    startedAt: new Date().toISOString(),
    scope: 'fresh process per roundtrip; source identity and content omitted',
    inputId: only === 'local-input' ? 'local-input' : only,
    iterations,
    modes,
    timeoutMs,
    nodeMemoryMb,
    runs: [],
  };

  for (const mode of modes) {
    for (let iteration = 1; iteration <= iterations; iteration += 1) {
      const childReportDir = path.join(reportDir, mode, `run-${iteration}`);
      await fs.mkdir(childReportDir, { recursive: true });
      const started = Date.now();
      const child = spawnSync(
        process.execPath,
        childArguments({
          nodeMemoryMb,
          childScript,
          outDir,
          basePath,
          fixturesDir,
          childReportDir,
          only,
          port,
          mode,
        }),
        {
          cwd: repoRoot,
          env: process.env,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
          timeout: timeoutMs,
          killSignal: 'SIGTERM',
          windowsHide: true,
          maxBuffer: 1024 * 1024,
        },
      );
      const childReport = await readJson(path.join(childReportDir, 'imported-edit-sync-results.json'));
      const fixture = childReport?.fixtures?.find((entry) => entry.id === only)
        ?? childReport?.fixtures?.[0]
        ?? null;
      const timedOut = child.error?.code === 'ETIMEDOUT';
      const resourceIssueCount = Number.isFinite(fixture?.resourceIssueCount)
        ? fixture.resourceIssueCount
        : 0;
      const consoleErrors = countIssues(fixture?.consoleErrors);
      const pageErrors = countIssues(fixture?.pageErrors);
      const resourcePass = fixture?.resourcePass === true;
      const consoleClean = consoleErrors === 0;
      const pageClean = pageErrors === 0;
      const roundtripPass = child.status === 0
        && childReport?.pass === true
        && fixture?.pass === true
        && fixture?.reimportAttempts?.length === 1;
      const run = {
        mode,
        iteration,
        durationMs: Date.now() - started,
        exitCode: child.status,
        timedOut,
        reportPresent: Boolean(childReport),
        reimportAttempts: fixture?.reimportAttempts?.length ?? 0,
        resourceIssueCount,
        consoleErrors,
        pageErrors,
        resourcePass,
        consoleClean,
        pageClean,
        runtimeClean: resourcePass && consoleClean && pageClean,
        roundtripPass,
        pass: roundtripPass,
      };
      if (!run.pass) {
        run.failure = timedOut
          ? 'timeout'
          : child.error?.code ?? `exit-${child.status ?? 'unknown'}`;
      }
      report.runs.push(run);
      console.log(`${run.roundtripPass ? 'PASS' : 'FAIL'} ${mode} run=${iteration} duration=${run.durationMs}ms resources=${run.runtimeClean ? 'PASS' : 'WARN'}`);
      if (!run.pass) break;
    }
  }

  report.finishedAt = new Date().toISOString();
  report.pass = report.runs.length === modes.length * iterations
    && report.runs.every((run) => run.pass);
  report.runtimeClean = report.runs.length === modes.length * iterations
    && report.runs.every((run) => run.runtimeClean);
  await fs.writeFile(
    path.join(reportDir, 'isolated-import-roundtrip-results.json'),
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8',
  );
  await fs.writeFile(
    path.join(reportDir, 'isolated-import-roundtrip-results.md'),
    markdown(report),
    'utf8',
  );
  console.log(report.pass ? 'ISOLATED IMPORT ROUNDTRIP PASS' : 'ISOLATED IMPORT ROUNDTRIP FAIL');
  process.exitCode = report.pass ? 0 : 1;
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
