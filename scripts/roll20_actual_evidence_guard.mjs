#!/usr/bin/env node
/**
 * Guard local-only Roll20 actual-screen verification evidence.
 *
 * This is a safety/checklist helper, not a Roll20 parity test. It verifies that
 * generated fixtures/reports/screenshots stay out of tracked/staged files and,
 * when given a run folder, that the local baseline/payload gates are present
 * before an agent attempts Custom Sheet Sandbox or test-room upload.
 *
 * Usage:
 *   node scripts/roll20_actual_evidence_guard.mjs
 *   node scripts/roll20_actual_evidence_guard.mjs reports/roll20-actual-compare/<label>
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const positionalArgs = process.argv.slice(2).filter((arg) => arg !== '--');
const runDirArg = positionalArgs[0] ? path.resolve(positionalArgs[0]) : '';
const repoRoot = runGit(['rev-parse', '--show-toplevel']).trim();
const repoName = path.basename(repoRoot).toLowerCase();

const localOnlyRoots = [
  'test-fixtures',
  'reports',
  'docs/portfolio/private',
  'docs/portfolio/assets/private',
  'public/examples',
  'data/examples',
];

const allowedTracked = new Set([
  normalizePath('reports/README.md'),
  normalizePath('reports/.gitkeep'),
  normalizePath('public/examples/example_005.xml'),
  normalizePath('data/examples/example_005.xml'),
]);

const requiredIgnoreSnippets = [
  '/test-fixtures/',
  '/reports/**',
  '/docs/portfolio/private/',
  '/docs/portfolio/assets/private/',
  '/public/examples/',
  '/data/examples/',
];

const results = [];

check('git root is web-push-main', repoName === 'web-push-main', repoRoot);
checkGitignore();
checkPreCommitHook();
checkTrackedLocalEvidence();
checkStagedLocalEvidence();
if (runDirArg) checkRunFolder(runDirArg);

const failed = results.filter((item) => !item.ok);
const summary = {
  status: failed.length === 0 ? 'PASS' : 'FAIL',
  repoRoot,
  checkedRunDir: runDirArg || null,
  checks: results,
};

console.log(JSON.stringify(summary, null, 2));

if (failed.length > 0) {
  process.exitCode = 1;
}

function runGit(args) {
  return execFileSync('git', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function check(label, ok, detail = '') {
  results.push({ label, ok: Boolean(ok), detail: String(detail) });
}

function normalizePath(value) {
  return value.replace(/\\/g, '/').replace(/^\.\//, '');
}

function checkGitignore() {
  const gitignore = readFileSync(path.join(repoRoot, '.gitignore'), 'utf8');
  const missing = requiredIgnoreSnippets.filter((snippet) => !gitignore.includes(snippet));
  check('.gitignore protects local evidence roots', missing.length === 0, missing.join(', ') || 'ok');
}

function checkPreCommitHook() {
  const hookPath = path.join(repoRoot, '.githooks', 'pre-commit');
  if (!existsSync(hookPath)) {
    check('local-only pre-commit hook exists', false, hookPath);
    return;
  }
  const hook = readFileSync(hookPath, 'utf8');
  const missing = localOnlyRoots.filter((root) => !hook.includes(`${root}/**`));
  check('local-only pre-commit hook covers evidence roots', missing.length === 0, missing.join(', ') || 'ok');
}

function checkTrackedLocalEvidence() {
  const tracked = gitLines(['ls-files', '--', ...localOnlyRoots])
    .map(normalizePath)
    .filter((file) => !allowedTracked.has(file));
  check('no tracked private fixtures/reports/examples', tracked.length === 0, tracked.slice(0, 20).join('\n') || 'ok');
}

function checkStagedLocalEvidence() {
  const staged = gitLines(['diff', '--cached', '--name-only', '--', ...localOnlyRoots])
    .map(normalizePath)
    .filter((file) => !allowedTracked.has(file));
  check('no staged private fixtures/reports/examples', staged.length === 0, staged.slice(0, 20).join('\n') || 'ok');
}

function gitLines(args) {
  const text = runGit(args);
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function checkRunFolder(runDir) {
  const rel = normalizePath(path.relative(repoRoot, runDir));
  check('run folder is under ignored reports/roll20-actual-compare', rel.startsWith('reports/roll20-actual-compare/'), rel);
  check('run folder exists', existsSync(runDir) && statSync(runDir).isDirectory(), runDir);
  if (!existsSync(runDir)) return;

  const localBaseline = path.join(runDir, 'local-baseline-results.md');
  const baselineJson = path.join(runDir, 'local-baseline-results.json');
  check('local baseline result exists', existsSync(localBaseline) || existsSync(baselineJson), localBaseline);

  const auditMd = path.join(runDir, 'payload-audit', 'roll20-payload-audit-results.md');
  check('payload hygiene audit exists before upload', existsSync(auditMd), auditMd);
  if (existsSync(auditMd)) {
    const auditText = readFileSync(auditMd, 'utf8');
    check('payload hygiene audit has no FAIL marker', !/\bFAIL\b/i.test(auditText), auditMd);
    check('payload hygiene audit has PASS evidence', /\bPASS\b/i.test(auditText), auditMd);
  }

  const roundtripMd = path.join(runDir, 'payload-roundtrip-visual', 'payload-roundtrip-visual-results.md');
  check('cleaned-payload roundtrip exists before upload', existsSync(roundtripMd), roundtripMd);
  if (existsSync(roundtripMd)) {
    const roundtripText = readFileSync(roundtripMd, 'utf8');
    check('cleaned-payload roundtrip has no FAIL marker', !/\bFAIL\b/i.test(roundtripText), roundtripMd);
    check('cleaned-payload roundtrip has PASS evidence', /\bPASS\b/i.test(roundtripText), roundtripMd);
  }
}
