#!/usr/bin/env node
/**
 * Guard Roll20 renderer-model rollout.
 *
 * `roll20RendererModel` is a diagnostic production-path switch used by local
 * Roll20 evidence scripts. It must stay off in the user-facing app until the
 * actual Roll20 renderer gates prove a model is globally safe or a reviewed
 * per-sheet boundary exists.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const repoRoot = runGit(['rev-parse', '--show-toplevel']).trim();
const scanRoots = ['app', 'components', 'lib'];
const allowedFiles = new Set([
  normalizePath('lib/preview/buildDoc.ts'),
]);
const disallowedPattern = /roll20RendererModel\s*[:=]\s*['"`](input-flow-27|input-flow-276)['"`]|data-roll20-renderer-model=["']input-flow-/;
const results = [];

checkProductionFiles();
checkBuildDocDefaultGate();

const failed = results.filter((item) => !item.ok);
const summary = {
  status: failed.length ? 'FAIL' : 'PASS',
  repoRoot,
  scope: 'Roll20 renderer model must remain diagnostic-only in production app paths',
  checks: results,
};

console.log(JSON.stringify(summary, null, 2));

if (failed.length) process.exitCode = 1;

function runGit(args) {
  return execFileSync('git', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function normalizePath(value) {
  return value.replace(/\\/g, '/').replace(/^\.\//, '');
}

function check(label, ok, detail = '') {
  results.push({ label, ok: Boolean(ok), detail: String(detail) });
}

function checkProductionFiles() {
  const hits = [];
  for (const root of scanRoots) {
    const abs = path.join(repoRoot, root);
    if (!existsSync(abs)) continue;
    for (const file of walk(abs)) {
      const rel = normalizePath(path.relative(repoRoot, file));
      if (allowedFiles.has(rel)) continue;
      if (!/\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(rel)) continue;
      const text = readFileSync(file, 'utf8');
      if (disallowedPattern.test(text)) hits.push(rel);
    }
  }
  check('no non-default renderer model enabled in app/component/lib paths', hits.length === 0, hits.join('\n') || 'ok');
}

function checkBuildDocDefaultGate() {
  const file = path.join(repoRoot, 'lib/preview/buildDoc.ts');
  if (!existsSync(file)) {
    check('buildDoc renderer model gate exists', false, file);
    return;
  }
  const text = readFileSync(file, 'utf8');
  const hasType = /roll20RendererModel\?:\s*'default'\s*\|\s*'input-flow-27'\s*\|\s*'input-flow-276'/.test(text);
  const hasDefault = /opts\.roll20RendererModel\s*\?\?\s*'default'/.test(text);
  const hasEarlyReturn = /if\s*\(\s*model\s*!==\s*'input-flow-27'\s*&&\s*model\s*!==\s*'input-flow-276'\s*\)\s*return\s*''/.test(text);
  check('buildDoc renderer model type is explicit', hasType, hasType ? 'ok' : 'missing expected union');
  check('buildDoc defaults renderer model to off', hasDefault, hasDefault ? 'ok' : 'missing default fallback');
  check('buildDoc emits no renderer CSS for default model', hasEarlyReturn, hasEarlyReturn ? 'ok' : 'missing default empty CSS guard');
}

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next' || entry === 'out') continue;
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      yield* walk(full);
    } else if (stat.isFile()) {
      yield full;
    }
  }
}
