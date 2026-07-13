#!/usr/bin/env node
/**
 * Refresh Roll20 chat renderer diagnostics from the current actual evidence.
 *
 * This is diagnostic-only. It intentionally does not enable renderer CSS.
 * Use it after adding or recapturing Roll20 chat evidence so downstream reports
 * do not mix fresh screenshots with stale width/model/gate decisions.
 */

import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { chmod, cp, mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const rawArgs = process.argv.slice(2).filter((arg) => arg !== '--');
const args = rawArgs.filter((arg, index) => !arg.startsWith('--') && rawArgs[index - 1] !== '--work-run-dir');
const sourceRunDir = args[0] ?? 'reports/roll20-actual-compare/2026-06-18-state-map-v1';
const workRunDirArg = readOption('--work-run-dir', '');
const selfTest = rawArgs.includes('--self-test');

const steps = [
  ['status:roll20-actual', 'scripts/roll20_actual_status.mjs'],
  ['diagnose:roll20-chat-parity', 'scripts/roll20_chat_parity_diagnostics.mjs'],
  ['diagnose:roll20-chat-current-metrics', 'scripts/roll20_chat_current_metrics_audit.mjs'],
  ['diagnose:roll20-chat-structure', 'scripts/roll20_chat_structure_compare.mjs'],
  ['diagnose:roll20-chat-style', 'scripts/roll20_chat_style_context_diagnostics.mjs'],
  ['diagnose:roll20-chat-candidates', 'scripts/roll20_chat_candidate_compare.mjs'],
  ['diagnose:roll20-chat-candidate-style', 'scripts/roll20_chat_candidate_style_proof.mjs'],
  ['diagnose:roll20-chat-renderer-policy', 'scripts/roll20_chat_renderer_policy.mjs'],
  ['diagnose:roll20-chat-residual', 'scripts/roll20_chat_residual_diagnostics.mjs'],
  ['diagnose:roll20-chat-mask-strategy', 'scripts/roll20_chat_mask_strategy.mjs'],
  ['diagnose:roll20-chat-shell-geometry', 'scripts/roll20_chat_shell_geometry.mjs'],
  ['diagnose:roll20-chat-font-cell', 'scripts/roll20_chat_font_cell_model.mjs'],
  ['diagnose:roll20-chat-width', 'scripts/roll20_chat_width_model.mjs'],
  ['diagnose:roll20-chat-message-shell', 'scripts/roll20_chat_message_shell_model.mjs'],
  ['diagnose:roll20-chat-table-width-budget', 'scripts/roll20_chat_table_width_budget.mjs'],
  ['diagnose:roll20-chat-table-intrinsic-probe', 'scripts/roll20_chat_table_intrinsic_probe.mjs'],
  ['diagnose:roll20-chat-overflow-crop', 'scripts/roll20_chat_overflow_crop_probe.mjs'],
  ['diagnose:roll20-chat-intrinsic-width', 'scripts/roll20_chat_intrinsic_width_model.mjs'],
  ['diagnose:roll20-chat-font-glyph', 'scripts/roll20_chat_font_glyph_model.mjs'],
  ['diagnose:roll20-chat-font-intrinsic', 'scripts/roll20_chat_font_intrinsic_probe.mjs'],
  ['diagnose:roll20-chat-source-context', 'scripts/roll20_chat_source_context_probe.mjs'],
  ['diagnose:roll20-chat-table-layout-constraint', 'scripts/roll20_chat_table_layout_constraint_probe.mjs'],
  ['diagnose:roll20-chat-min-content', 'scripts/roll20_chat_min_content_model.mjs'],
  ['diagnose:roll20-chat-row-paint-source', 'scripts/roll20_chat_row_paint_source_probe.mjs'],
  ['diagnose:roll20-chat-row-raster', 'scripts/roll20_chat_row_raster_probe.mjs'],
  ['diagnose:roll20-chat-row-raster-candidates', 'scripts/roll20_chat_row_raster_candidate_compare.mjs'],
  ['diagnose:roll20-chat-row-compositing', 'scripts/roll20_chat_row_compositing_probe.mjs'],
  ['diagnose:roll20-chat-background-source', 'scripts/roll20_chat_background_source_probe.mjs'],
  ['diagnose:roll20-chat-background-raster', 'scripts/roll20_chat_background_raster_model_probe.mjs'],
  ['diagnose:roll20-chat-background-assets', 'scripts/roll20_chat_background_asset_probe.mjs'],
  ['plan:roll20-chat-assets', 'scripts/roll20_chat_asset_preservation_plan.mjs'],
  ['plan:roll20-chat-browser-paint', 'scripts/roll20_chat_browser_paint_plan.mjs'],
  ['diagnose:roll20-chat-rows', 'scripts/roll20_chat_row_geometry_compare.mjs'],
  ['diagnose:roll20-chat-width-reconciliation', 'scripts/roll20_chat_width_reconciliation.mjs'],
  ['diagnose:roll20-chat-cell-allocation', 'scripts/roll20_chat_cell_allocation_probe.mjs'],
  ['plan:roll20-chat-renderer-targets', 'scripts/roll20_chat_targeted_renderer_plan.mjs'],
  ['gate:roll20-chat-template-scope', 'scripts/roll20_chat_template_scope_gate.mjs'],
  ['gate:roll20-renderer-action', 'scripts/roll20_renderer_action_gate.mjs'],
];

if (selfTest) {
  await runSelfTest();
  process.exit(0);
}

const runDir = await prepareRunDir(sourceRunDir, workRunDirArg);

console.log(`ROLL20 CHAT DIAGNOSTIC REFRESH run=${runDir}`);
if (workRunDirArg) {
  console.log(`source=${path.normalize(sourceRunDir)}`);
  console.log(`isolatedWorkRun=${path.normalize(runDir)}`);
}
for (const [label, script] of steps) {
  const started = Date.now();
  console.log(`\n[${label}]`);
  execFileSync('node', [script, runDir], {
    cwd: process.cwd(),
    stdio: 'inherit',
    windowsHide: true,
  });
  console.log(`[${label}] done ${Date.now() - started}ms`);
}

console.log(`\nROLL20 CHAT DIAGNOSTIC REFRESH DONE run=${path.normalize(runDir)}`);

function readOption(name, fallback = '') {
  const index = rawArgs.indexOf(name);
  if (index === -1) return fallback;
  const value = rawArgs[index + 1];
  if (!value || value.startsWith('--')) return fallback;
  return value;
}

async function prepareRunDir(sourceArg, workArg) {
  if (!workArg) return sourceArg;

  const source = path.resolve(sourceArg);
  const work = path.resolve(workArg);
  if (source === work) {
    throw new Error('--work-run-dir must differ from the source run directory');
  }
  if (work.startsWith(`${source}${path.sep}`)) {
    throw new Error('--work-run-dir must not be inside the source run directory');
  }
  if (!existsSync(source)) {
    throw new Error(`source run directory does not exist: ${source}`);
  }
  if (existsSync(work)) {
    const entries = await readdir(work);
    if (entries.length > 0) {
      throw new Error(`--work-run-dir must be empty or absent: ${work}`);
    }
  } else {
    await mkdir(path.dirname(work), { recursive: true });
  }

  console.log(`Preparing isolated Roll20 chat diagnostic run copy...`);
  console.log(`copyFrom=${path.normalize(source)}`);
  console.log(`copyTo=${path.normalize(work)}`);
  await cp(source, work, { recursive: true, force: false, errorOnExist: false });
  await makeWritable(work);
  return work;
}

async function makeWritable(target) {
  const info = await stat(target);
  await chmod(target, info.isDirectory() ? 0o777 : 0o666).catch(() => {});
  if (!info.isDirectory()) return;
  for (const entry of await readdir(target)) {
    await makeWritable(path.join(target, entry));
  }
}

async function runSelfTest() {
  const root = path.join(tmpdir(), 'roll20-chat-refresh-self-test', `${Date.now()}-${process.pid}`);
  const source = path.join(root, 'source-run');
  const work = path.join(root, 'work-run');
  const marker = path.join(source, 'local-baseline', 'fixture', 'marker.txt');
  await mkdir(path.dirname(marker), { recursive: true });
  await writeFile(marker, 'ok\n', 'utf8');

  const prepared = await prepareRunDir(source, work);
  assert.equal(prepared, work);
  assert.equal(existsSync(path.join(work, 'local-baseline', 'fixture', 'marker.txt')), true);

  let rejectedNonEmpty = false;
  try {
    await prepareRunDir(source, work);
  } catch (error) {
    rejectedNonEmpty = String(error?.message ?? '').includes('must be empty or absent');
  }
  assert.equal(rejectedNonEmpty, true);
  console.log('roll20_chat_diagnostic_refresh self-test PASS');
}
