#!/usr/bin/env node
/**
 * Run the lightweight CI safety suite with the same package manager executable
 * that launched this script. This avoids Windows PATH drift where a nested
 * `pnpm` command can resolve to a different standalone version than Corepack.
 */

import { execFileSync } from 'node:child_process';
import path from 'node:path';

const pnpm = process.env.npm_execpath;
if (!pnpm) {
  console.error('Missing npm_execpath; run this through pnpm, e.g. `corepack pnpm run ci:verify`.');
  process.exit(2);
}

const tasks = [
  'test:server-hygiene',
  'test:asset-refs',
  'test:asset-replacements',
  'test:translation-payload',
  'test:export-smoke',
  'test:layer-roles',
  'test:blockly-history',
  'test:design-position',
  'test:iframe-drop-target',
  'test:blockly-sound-policy',
  'test:iframe-edit-bridge',
  'test:build-doc-bundle',
  'test:runtime-asset-policy',
  'test:runtime-contract',
  'test:emit-contract',
  'test:import-structure',
  'test:imported-edit-budget',
  'test:legacy-css-sanitize',
  'test:roll20-sandbox-sanitize',
  'test:roll20-render-modes',
  'test:roll20-upload-snippet',
  'test:roll20-runtime-evidence',
  'test:roll20-chat-renderer-targets',
  'test:roll20-chat-template-scope',
  'test:roll20-asset-relink',
  'guard:roll20-evidence',
  'guard:ui-copy',
];

for (const task of tasks) {
  console.log(`\n[ci:verify] ${task}`);
  execFileSync(process.execPath, [pnpm, 'run', task], {
    cwd: path.resolve('.'),
    stdio: 'inherit',
    env: process.env,
  });
}

console.log('\n[ci:verify] PASS');
