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
  'test:docs-privacy',
  'guard:docs-privacy',
  'test:chat-diagnostics',
  'test:rolltemplate-render',
  'test:rolltemplate-css',
  'test:rolltemplate-synthetic',
  'test:asset-refs',
  'test:asset-replacements',
  'test:translation-payload',
  'test:roll20-upload-files',
  'test:roll20-sandbox-synthetic',
  'test:export-smoke',
  'test:layer-roles',
  'test:blockly-history',
  'test:blockly-headless',
  'test:blockly-render-policy',
  'test:blockly-layer-operations',
  'test:workspace-generation',
  'test:design-position',
  'test:iframe-drop-target',
  'test:drop-indicator',
  'test:blockly-sound-policy',
  'test:iframe-edit-bridge',
  'test:build-doc-bundle',
  'test:canvas-dimensions',
  'test:runtime-asset-policy',
  'test:runtime-contract',
  'test:emit-contract',
  'test:preview-prefix',
  'test:worker-parser',
  'test:import-structure',
  'test:high-priority-mapping',
  'test:imported-edit-budget',
  'test:legacy-css-sanitize',
  'audit:legacy-export',
  'test:roll20-sandbox-sanitize',
  'test:roll20-render-modes',
  'test:visual-synthetic',
  'test:roll20-upload-snippet',
  'test:roll20-payload-provenance',
  'test:roll20-payload-fidelity',
  'test:roll20-upload-cdp',
  'test:roll20-geometry',
  'test:roll20-geometry-diagnostics',
  'test:roll20-capture-quality',
  'test:roll20-chat-capture-rects',
  'test:roll20-chat-renderer-policy',
  'test:roll20-chat-font-glyph',
  'test:roll20-computed-style-context',
  'test:roll20-full-root-candidates',
  'test:roll20-room-members',
  'test:roll20-runtime-evidence',
  'test:roll20-actual-geometry',
  'test:roll20-actual-status',
  'test:roll20-chat-capture-plan',
  'test:roll20-chat-structure',
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
