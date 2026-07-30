#!/usr/bin/env node
/**
 * Normalize local preview/edit evidence and anonymous Roll20 runtime smoke
 * evidence without turning a narrow smoke into a visual-parity claim.
 *
 * Usage:
 *   node scripts/roll20_runtime_evidence_compare.mjs --self-test
 *   node scripts/roll20_runtime_evidence_compare.mjs \
 *     --local <preview-edit-visual-results.json> \
 *     --modern <modern-evidence.json> \
 *     --legacy <legacy-evidence.json> \
 *     --out-dir <ignored-output-dir>
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { compareRoll20Geometry } from './lib/roll20Geometry.mjs';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const SELF_TEST = args.includes('--self-test');

function argOf(name, fallback = '') {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

if (SELF_TEST) {
  runSelfTest();
} else {
  await main();
}

function runSelfTest() {
  const report = compareEvidence({
    local: {
      fixtures: [localFixture('modern'), localFixture('legacy')],
    },
    actualByMode: {
      modern: actualFixture('modern'),
      legacy: actualFixture('legacy'),
    },
  });

  assert(report.status === 'PASS_WITH_OPEN_PARITY_GAP', 'self-test status');
  assert(report.modes.modern.localPreviewEdit === 'PASS', 'modern local gate');
  assert(report.modes.legacy.localPreviewEdit === 'PASS', 'legacy local gate');
  assert(report.modes.modern.actualRuntime === 'PASS', 'modern actual gate');
  assert(report.modes.legacy.actualRuntime === 'PASS', 'legacy actual gate');
  assert(report.modes.modern.rootGeometry === 'NOT_COMPARABLE', 'modern root hold');
  assert(report.modes.legacy.rootGeometry === 'NOT_COMPARABLE', 'legacy root hold');
  assert(report.modes.modern.contentGeometry === 'PASS', 'modern content canvas');
  assert(report.modes.legacy.contentGeometry === 'PASS', 'legacy content canvas');
  assert(report.modes.modern.normalizedGeometry.status === 'HOLD', 'modern normalized geometry hold');
  assert(report.modes.legacy.normalizedGeometry.status === 'HOLD', 'legacy normalized geometry hold');
  assert(report.modes.modern.parityPromotion === 'HOLD', 'modern promotion hold');
  assert(report.modes.legacy.parityPromotion === 'HOLD', 'legacy promotion hold');

  const mismatch = compareEvidence({
    local: {
      fixtures: [localFixture('modern'), localFixture('legacy')],
    },
    actualByMode: {
      modern: actualFixture('modern'),
      legacy: { ...actualFixture('legacy'), sheetRoot: { width: 860, height: 280 } },
    },
  });
  assert(mismatch.status === 'FAIL', 'root mismatch is a failure');
  assert(mismatch.modes.legacy.rootGeometry === 'FAIL', 'legacy root mismatch');

  const canvasMismatch = compareEvidence({
    local: {
      fixtures: [localFixture('modern'), localFixture('legacy')],
    },
    actualByMode: {
      modern: actualFixture('modern'),
      legacy: { ...actualFixture('legacy'), sheetCanvas: { rectWidth: 840, rectHeight: 260 } },
    },
  });
  assert(canvasMismatch.status === 'FAIL', 'content canvas mismatch is a failure');
  assert(canvasMismatch.modes.legacy.contentGeometry === 'FAIL', 'legacy content canvas mismatch');
  assert(canvasMismatch.modes.legacy.normalizedGeometry.status === 'FAIL', 'legacy normalized content mismatch');
  console.log('roll20_runtime_evidence_compare self-test PASS');
}

async function main() {
  const localPath = argOf('--local');
  const modernPath = argOf('--modern');
  const legacyPath = argOf('--legacy');
  const outDir = path.resolve(argOf('--out-dir', '.tmp/reports/roll20-runtime-evidence'));
  if (!localPath || !modernPath || !legacyPath) {
    console.error('Usage: node scripts/roll20_runtime_evidence_compare.mjs --local <file> --modern <file> --legacy <file> --out-dir <dir>');
    process.exitCode = 2;
    return;
  }

  const report = compareEvidence({
    local: await readJson(localPath),
    actualByMode: {
      modern: await readJson(modernPath),
      legacy: await readJson(legacyPath),
    },
  });
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'roll20-runtime-evidence-results.json'), `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(path.join(outDir, 'roll20-runtime-evidence-results.md'), renderMarkdown(report));
  console.log(JSON.stringify({ status: report.status, outDir, modes: report.modes }, null, 2));
  if (report.status === 'FAIL') process.exitCode = 1;
}

function compareEvidence({ local, actualByMode }) {
  const localByMode = new Map((local.fixtures ?? []).map((item) => [item.compatibilityMode, item]));
  const modes = {};
  for (const mode of ['modern', 'legacy']) {
    const localItem = localByMode.get(mode);
    const actual = actualByMode[mode] ?? {};
    modes[mode] = compareMode(mode, localItem, actual);
  }
  const allRuntimePass = Object.values(modes).every((mode) => mode.localPreviewEdit === 'PASS' && mode.actualRuntime === 'PASS');
  const allComparable = Object.values(modes).every((mode) => mode.rootGeometry === 'PASS' && mode.contentGeometry === 'PASS');
  const hasContradiction = Object.values(modes).some((mode) =>
    mode.localPreviewEdit === 'FAIL' ||
    mode.actualRuntime === 'FAIL' ||
    mode.wrapper === 'FAIL' ||
    mode.rootGeometry === 'FAIL' ||
    mode.contentGeometry === 'FAIL',
  );
  return {
    status: hasContradiction ? 'FAIL' : allRuntimePass && allComparable ? 'PASS' : 'PASS_WITH_OPEN_PARITY_GAP',
    scope: 'anonymous synthetic runtime smoke plus local preview/edit; not universal visual parity',
    modes,
  };
}

function compareMode(mode, local, actual) {
  const root = local?.previewCapture?.styles?.targets?.root ?? {};
  const dialog = local?.previewCapture?.styles?.targets?.dialog ?? {};
  const localPreviewEdit = local?.pass === true &&
    local?.pixelParity?.pass === true &&
    local?.computedStyleParity?.pass === true &&
    local?.geometryParity?.pass === true &&
    local?.domSignatureParity?.pass === true
    ? 'PASS' : 'FAIL';
  const rendered = new Set(actual.rendered ?? []);
  const actualRuntime = rendered.has('translated title') &&
    rendered.has('translated label') &&
    rendered.has('input') &&
    rendered.has('roll button') &&
    actual.chat?.templateFields === true &&
    actual.chat?.resolvedResult === true &&
    (mode !== 'legacy' || actual.legacySanitization === true)
    ? 'PASS' : 'FAIL';
  const wrapperPass = String(actual.wrapper ?? '').split(/\s+/).includes('ui-dialog') &&
    String(dialog.className ?? '').split(/\s+/).includes('ui-dialog');
  const actualRoot = actual.sheetRoot;
  const rootGeometry = actualRoot && root.rectWidth != null && root.rectHeight != null
    ? numbersClose(root.rectWidth, actualRoot.width) && numbersClose(root.rectHeight, actualRoot.height) ? 'PASS' : 'FAIL'
    : 'NOT_COMPARABLE';
  const localContentRoot = local?.previewCapture?.styles?.targets?.contentBox
    ?? local?.previewCapture?.styles?.targets?.contentRoot
    ?? {};
  const actualCanvas = actual.sheetCanvas;
  const normalizedGeometry = compareRoll20Geometry(
    {
      viewport: local?.previewCapture?.viewport ?? local?.viewport,
      dialog,
      form: local?.previewCapture?.styles?.targets?.sheetform,
      root,
      content: localContentRoot,
    },
    {
      viewport: actual.viewport,
      iframe: actual.iframeRect ?? actual.iframe,
      dialog: actual.dialogRect ?? actual.dialog,
      form: actual.formRect ?? actual.form,
      root: actual.sheetRoot,
      content: actualCanvas,
    },
  );
  const contentGeometry = actualCanvas && localContentRoot.rectWidth != null && localContentRoot.rectHeight != null
    ? numbersClose(localContentRoot.rectWidth, actualCanvas.rectWidth) && numbersClose(localContentRoot.rectHeight, actualCanvas.rectHeight)
      ? 'PASS'
      : 'FAIL'
    : 'NOT_COMPARABLE';
  const rootReason = rootGeometry === 'NOT_COMPARABLE'
    ? 'Roll20 sidecar has iframe geometry only; sheet-root/crop geometry is required before parity can be judged.'
    : '';
  const contentReason = contentGeometry === 'NOT_COMPARABLE'
    ? 'Roll20 sidecar has no authored content-canvas geometry yet; wrapper geometry must not be treated as the sheet canvas.'
    : '';
  return {
    mode,
    localPreviewEdit,
    actualRuntime,
    wrapper: wrapperPass ? 'PASS' : 'FAIL',
    rootGeometry,
    rootReason,
    local: {
      preview: local?.previewDom?.rect ?? null,
      edit: local?.editDom?.rect ?? null,
      root: { width: root.rectWidth ?? null, height: root.rectHeight ?? null },
      contentBox: { width: localContentRoot.rectWidth ?? null, height: localContentRoot.rectHeight ?? null },
      visibleRuntimeNodes: local?.previewCapture?.signature?.visibleRuntimeNodeCount ?? null,
      translations: local?.previewCapture?.translations?.matchedCount ?? null,
    },
    actual: {
      iframe: actual.iframe ?? null,
      legacySanitization: actual.legacySanitization ?? null,
      rendered: [...rendered],
      chat: actual.chat ?? null,
      sheetCanvas: actual.sheetCanvas ?? null,
    },
    parityPromotion: localPreviewEdit === 'PASS' && actualRuntime === 'PASS' && rootGeometry === 'PASS' && contentGeometry === 'PASS' && normalizedGeometry.promotable ? 'READY' : 'HOLD',
    contentGeometry,
    contentReason,
    normalizedGeometry,
  };
}

function numbersClose(left, right) {
  return Number.isFinite(Number(left)) && Number.isFinite(Number(right)) && Math.abs(Number(left) - Number(right)) <= 1;
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(path.resolve(file), 'utf8'));
}

function assert(value, message) {
  if (!value) throw new Error(`self-test failed: ${message}`);
}

function localFixture(mode) {
  return {
    compatibilityMode: mode,
    pass: true,
    pixelParity: { pass: true },
    computedStyleParity: { pass: true },
    geometryParity: { pass: true },
    domSignatureParity: { pass: true },
    previewDom: { rect: { width: 870, height: 280 } },
    editDom: { rect: { width: 870, height: 280 } },
    previewCapture: {
      styles: {
        targets: {
          root: { rectWidth: 870, rectHeight: 280 },
          contentBox: { rectWidth: 850, rectHeight: 260 },
          dialog: { className: 'ui-dialog r20-preview-dialog' },
        },
      },
      signature: { visibleRuntimeNodeCount: 0 },
      translations: { matchedCount: 2 },
    },
  };
}

function actualFixture(mode) {
  return {
    mode,
    legacySanitization: mode === 'legacy',
    wrapper: 'ui-dialog ui-widget ui-widget-content ui-corner-all ui-draggable ui-resizable',
    iframe: { width: 900, height: mode === 'legacy' ? 673.55 : 675.69 },
    sheetCanvas: { rectWidth: 850, rectHeight: 260 },
    rendered: ['translated title', 'translated label', 'input', 'roll button'],
    chat: { templateFields: true, resolvedResult: true },
  };
}

function renderMarkdown(report) {
  const lines = [
    '# Roll20 Runtime Evidence Comparison',
    '',
    `Status: **${report.status}**`,
    '',
    report.scope,
    '',
    '| Mode | Local preview/edit | Actual runtime | Wrapper | Root geometry | Content canvas | Promotion |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  ];
  for (const mode of ['modern', 'legacy']) {
    const item = report.modes[mode];
    lines.push(`| ${mode} | ${item.localPreviewEdit} | ${item.actualRuntime} | ${item.wrapper} | ${item.rootGeometry} | ${item.contentGeometry} | ${item.parityPromotion} |`);
    if (item.rootReason) lines.push(`|  |  |  |  | ${item.rootReason} |  |`);
    if (item.contentReason) lines.push(`|  |  |  |  |  | ${item.contentReason} |  |`);
  }
  lines.push('', '- A `HOLD` promotion is intentional when Roll20 sheet-root/crop evidence is missing.', '- Screenshots and source payloads remain local-only ignored evidence.');
  return `${lines.join('\n')}\n`;
}
