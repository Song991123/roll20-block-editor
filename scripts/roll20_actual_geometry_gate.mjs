#!/usr/bin/env node
/**
 * Compare a local preview/edit fixture with an anonymous Roll20 sidecar.
 *
 * This is an evidence gate, not a visual-parity shortcut. It keeps authored
 * sheet geometry separate from Roll20 wrapper geometry and refuses promotion
 * when crop normalization, attachment binding, or worker runtime evidence is
 * missing.
 *
 * Usage:
 *   node scripts/roll20_actual_geometry_gate.mjs --self-test
 *   node scripts/roll20_actual_geometry_gate.mjs \
 *     --local reports/preview-edit-visual-synthetic/preview-edit-visual-results.json \
 *     --actual .tmp/roll20-geometry/modern.json \
 *     --mode modern --fixture fixture-B --out .tmp/roll20-geometry/result.json
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { compareRoll20Geometry } from './lib/roll20Geometry.mjs';

const args = process.argv.slice(2).filter((arg) => arg !== '--');

if (args.includes('--self-test')) {
  runSelfTest();
} else {
  await main();
}

function argOf(name, fallback = '') {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

async function main() {
  const localPath = argOf('--local');
  const actualPath = argOf('--actual');
  const mode = argOf('--mode');
  const fixtureId = argOf('--fixture', 'fixture-B');
  const outPath = path.resolve(argOf('--out', '.tmp/roll20-geometry/geometry-gate.json'));
  if (!localPath || !actualPath || !['modern', 'legacy'].includes(mode)) {
    console.error('Usage: node scripts/roll20_actual_geometry_gate.mjs --local <file> --actual <file> --mode <modern|legacy> [--fixture <id>] [--out <file>]');
    process.exitCode = 2;
    return;
  }

  const report = compareGeometry({
    localReport: await readJson(localPath),
    actual: await readJson(actualPath),
    mode,
    fixtureId,
  });
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ status: report.status, promotion: report.promotion, out: outPath }, null, 2));
  if (report.status === 'FAIL') process.exitCode = 1;
}

function compareGeometry({ localReport, actual, mode, fixtureId }) {
  const local = selectFixture(localReport, mode, fixtureId);
  const localCapture = local?.previewCapture ?? {};
  const targets = localCapture.styles?.targets ?? {};
  const localRoot = targets.root ?? {};
  const localAuthored = targets.contentRoot ?? targets.contentBox ?? {};
  const localDialog = targets.dialog ?? {};
  const localForm = targets.sheetform ?? {};
  const localPreviewEdit = local?.pass === true &&
    local?.pixelParity?.pass === true &&
    local?.computedStyleParity?.pass === true &&
    local?.geometryParity?.pass === true &&
    local?.domSignatureParity?.pass === true
    ? 'PASS'
    : 'FAIL';

  const actualGeometry = actualGeometryInput(actual);
  const localGeometry = {
    viewport: localCapture.viewport ?? local.viewport,
    dialog: localDialog,
    form: localForm,
    root: localRoot,
    content: localAuthored,
  };
  const geometry = compareRoll20Geometry(localGeometry, actualGeometry);

  const participant = participantCheck(actual.participantPreflight);
  const requiredMarkers = requiredRuntimeMarkers(local);
  const markers = markerCheck(actual.markers ?? {}, requiredMarkers);
  const chat = chatCheck(actual.chat);
  const layout = layoutCheck(mode, actual.layout);
  const crop = cropCheck(actual.crop, localRoot);
  const attachment = attachmentCheck(actual.attachment);
  const worker = workerCheck(actual.worker);

  const contradictions = [
    localPreviewEdit,
    participant.status,
    markers.status,
    chat.status,
    layout.status,
    geometry.authoredCanvas.status,
  ].includes('FAIL') || geometry.status === 'FAIL';
  const strongEvidence = !contradictions &&
    geometry.authoredCanvas.status === 'PASS' &&
    geometry.outerRoot.status === 'PASS' &&
    crop.status === 'PASS' &&
    attachment.status === 'PASS' &&
    (worker.status === 'PASS' || worker.status === 'NOT_APPLICABLE');

  return {
    schema: 'roll20-actual-geometry-gate/v1',
    status: contradictions ? 'FAIL' : strongEvidence ? 'PASS' : 'PASS_WITH_OPEN_PARITY_GAP',
    promotion: strongEvidence ? 'READY_FOR_VISUAL_DIFF_REVIEW' : 'HOLD',
    scope: 'anonymous Roll20 geometry/runtime sidecar compared with local preview/edit evidence; not universal visual parity',
    mode,
    fixtureId,
    checks: {
      localPreviewEdit,
      participant,
      markers,
      chat,
      layout,
      authoredCanvas: geometry.authoredCanvas,
      outerRoot: geometry.outerRoot,
      geometryStatus: geometry.status,
      crop,
      attachment,
      worker,
    },
    geometry,
    actual: {
      viewport: actual.viewport ?? null,
      iframe: actual.iframe ?? null,
      wrapper: actualGeometry,
      markers: actual.markers ?? null,
      layout: actual.layout ?? null,
    },
    openGaps: [
      crop.status === 'PASS' ? null : 'normalized root crop is missing or not measured',
      attachment.status === 'PASS' ? null : 'Roll20 attachment readback hash is not verified',
      worker.status === 'VERIFY' ? 'worker source exists but live mutation was not observed' : null,
    ].filter(Boolean),
  };
}

function selectFixture(report, mode, fixtureId) {
  const fixture = (report.fixtures ?? []).find((item) =>
    item.id === fixtureId && item.compatibilityMode === mode,
  );
  if (!fixture) throw new Error(`No local fixture ${fixtureId}/${mode} in report`);
  return fixture;
}

function actualGeometryInput(actual) {
  const wrapper = actual.wrapper ?? {};
  return {
    viewport: actual.viewport,
    iframe: actual.iframe,
    dialog: wrapper.dialog?.rect ?? actual.dialog,
    form: wrapper.form?.rect ?? actual.form,
    root: wrapper.root?.rect ?? actual.sheetRoot ?? actual.root,
    content: wrapper.authored?.rect ?? actual.sheetCanvas ?? actual.content,
  };
}

function requiredRuntimeMarkers(local) {
  const targets = local?.previewCapture?.styles?.targets ?? {};
  return {
    authoredVisible: true,
    translatedLabel: Number(local?.previewCapture?.translations?.visibleMatchedCount ?? 0) > 0,
    input: Boolean(targets.firstControl),
    textarea: Boolean(targets.firstTextarea),
    select: Boolean(targets.firstSelect),
    table: Boolean(targets.firstTable),
    rollButton: Number(local?.previewCapture?.diagnostics?.rollButtonCount ?? 0) > 0,
  };
}

function participantCheck(value) {
  const exact = value?.exactlyOne === true || value?.participantOne === true || value === true;
  return { status: exact ? 'PASS' : 'FAIL', exactlyOne: exact };
}

function markerCheck(actual, required) {
  const checks = {};
  for (const [key, needed] of Object.entries(required)) {
    const observed = Boolean(actual[key]);
    checks[key] = { required: needed, observed, status: !needed || observed ? 'PASS' : 'FAIL' };
  }
  const failed = Object.values(checks).some((item) => item.status === 'FAIL');
  return { status: failed ? 'FAIL' : 'PASS', checks, missing: Object.keys(checks).filter((key) => checks[key].status === 'FAIL') };
}

function chatCheck(chat = {}) {
  const template = chat.templateMarker === true || chat.templateFields === true;
  const result = chat.resultMarker === true || chat.resolvedResult === true;
  return {
    status: template && result ? 'PASS' : 'FAIL',
    templateMarker: template,
    resultMarker: result,
  };
}

function layoutCheck(mode, layout = {}) {
  const expected = mode === 'legacy'
    ? { rowDisplay: 'flex', columnDisplay: 'block' }
    : { rowDisplay: 'block', columnDisplay: 'inline-block' };
  const rows = layout.rows ?? [];
  const cols = layout.cols ?? [];
  if (!rows.length && !cols.length) {
    return { status: 'NOT_APPLICABLE', expected, observed: null, reason: 'fixture has no captured row/column nodes' };
  }
  const rowPass = rows.length > 0 && rows.every((row) => row.style?.display === expected.rowDisplay);
  const colPass = cols.length > 0 && cols.every((col) => col.style?.display === expected.columnDisplay);
  return {
    status: rowPass && colPass ? 'PASS' : 'FAIL',
    expected,
    observed: { rowDisplays: unique(rows.map((row) => row.style?.display)), columnDisplays: unique(cols.map((col) => col.style?.display)) },
  };
}

function cropCheck(crop, localRoot) {
  if (!crop || crop.normalized !== true) return { status: 'VERIFY', normalized: false, reason: 'normalized crop evidence is absent' };
  const localWidth = Number(localRoot.rectWidth ?? localRoot.width);
  const localHeight = Number(localRoot.rectHeight ?? localRoot.height);
  const width = Number(crop.width);
  const height = Number(crop.height);
  const dimensionsPass = Number.isFinite(localWidth) && Number.isFinite(localHeight) &&
    Number.isFinite(width) && Number.isFinite(height) && Math.abs(localWidth - width) <= 1 && Math.abs(localHeight - height) <= 1;
  const diffPass = crop.mismatchRatio == null || Number(crop.mismatchRatio) <= 0.01;
  return { status: dimensionsPass && diffPass ? 'PASS' : 'FAIL', normalized: true, dimensionsPass, diffPass, width, height, mismatchRatio: crop.mismatchRatio ?? null };
}

function attachmentCheck(attachment) {
  return attachment?.verified === true && /^[a-f0-9]{64}$/i.test(String(attachment.sha256 ?? ''))
    ? { status: 'PASS', verified: true }
    : { status: 'VERIFY', verified: false };
}

function workerCheck(worker) {
  if (!worker?.sourcePresent) return { status: 'NOT_APPLICABLE', sourcePresent: false, mutationObserved: false };
  return worker.mutationObserved === true
    ? { status: 'PASS', sourcePresent: true, mutationObserved: true }
    : { status: 'VERIFY', sourcePresent: true, mutationObserved: false };
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(path.resolve(file), 'utf8'));
}

function runSelfTest() {
  const localReport = { fixtures: [localFixture('modern'), localFixture('legacy')] };
  const modern = compareGeometry({ localReport, actual: actualFixture('modern'), mode: 'modern', fixtureId: 'fixture-B' });
  assert(modern.status === 'PASS', 'complete modern proof');
  assert(modern.checks.layout.status === 'PASS', 'modern layout');
  assert(modern.checks.worker.status === 'NOT_APPLICABLE', 'no worker is N/A');

  const legacy = compareGeometry({ localReport, actual: actualFixture('legacy'), mode: 'legacy', fixtureId: 'fixture-B' });
  assert(legacy.status === 'PASS', 'complete legacy proof');
  assert(legacy.checks.layout.status === 'PASS', 'legacy layout');

  const missingCrop = compareGeometry({
    localReport,
    actual: { ...actualFixture('modern'), crop: { normalized: false } },
    mode: 'modern',
    fixtureId: 'fixture-B',
  });
  assert(missingCrop.status === 'PASS_WITH_OPEN_PARITY_GAP', 'missing crop holds promotion');
  assert(missingCrop.promotion === 'HOLD', 'missing crop promotion hold');

  const unsafeRoom = compareGeometry({
    localReport,
    actual: { ...actualFixture('modern'), participantPreflight: { exactlyOne: false } },
    mode: 'modern',
    fixtureId: 'fixture-B',
  });
  assert(unsafeRoom.status === 'FAIL', 'participant preflight failure');

  const wrongLegacyLayout = compareGeometry({
    localReport,
    actual: { ...actualFixture('legacy'), layout: { rows: [{ style: { display: 'block' } }], cols: [{ style: { display: 'inline-block' } }] } },
    mode: 'legacy',
    fixtureId: 'fixture-B',
  });
  assert(wrongLegacyLayout.status === 'FAIL', 'legacy layout mismatch');
  console.log('roll20_actual_geometry_gate self-test PASS');
}

function localFixture(mode) {
  return {
    id: 'fixture-B',
    compatibilityMode: mode,
    pass: true,
    pixelParity: { pass: true },
    computedStyleParity: { pass: true },
    geometryParity: { pass: true },
    domSignatureParity: { pass: true },
    previewCapture: {
      translations: { visibleMatchedCount: 5 },
      diagnostics: { rollButtonCount: 1 },
      styles: {
        targets: {
          root: { rectWidth: 850, rectHeight: 340 },
          contentRoot: { rectWidth: 760, rectHeight: 320 },
          dialog: { rectWidth: 850, rectHeight: 340 },
          sheetform: { rectWidth: 850, rectHeight: 340 },
          firstControl: {},
          firstTextarea: {},
          firstSelect: {},
          firstTable: {},
        },
      },
    },
  };
}

function actualFixture(mode) {
  return {
    participantPreflight: { exactlyOne: true },
    viewport: { width: 900, height: 366 },
    iframe: { x: 0, y: 0, width: 900, height: 366 },
    wrapper: {
      dialog: { rect: { x: 0, y: 0, width: 900, height: 366 } },
      form: { rect: { x: 20, y: 61.4, width: 860, height: 340 } },
      root: { rect: { x: 20, y: 61.4, width: 850, height: 340 } },
      authored: { rect: { x: 30, y: 71.4, width: 760, height: 320 } },
    },
    markers: { authoredVisible: true, translatedLabel: true, input: true, textarea: true, select: true, table: true, rollButton: true },
    layout: { rows: [{ style: { display: mode === 'legacy' ? 'flex' : 'block' } }], cols: [{ style: { display: mode === 'legacy' ? 'block' : 'inline-block' } }] },
    chat: { templateMarker: true, resultMarker: true },
    crop: { normalized: true, width: 850, height: 340, mismatchRatio: 0 },
    attachment: { verified: true, sha256: 'a'.repeat(64) },
    worker: { sourcePresent: false, mutationObserved: false },
  };
}

function assert(value, message) {
  if (!value) throw new Error(`self-test failed: ${message}`);
}
