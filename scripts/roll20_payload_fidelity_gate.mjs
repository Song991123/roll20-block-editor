#!/usr/bin/env node
/**
 * Prove that a local Roll20 payload and the generated upload snippet carry the
 * same bytes. Optional local baseline, ZIP, roundtrip, and worker reports are
 * checked separately so a missing external Roll20 readback never becomes a
 * false parity PASS.
 *
 * Usage:
 *   node scripts/roll20_payload_fidelity_gate.mjs \
 *     --payload-dir <ignored-payload-dir> \
 *     --snippet <ignored-upload-snippet.js> \
 *     [--baseline-report <local-baseline-results.json>] \
 *     [--fixture <fixture-id>] \
 *     [--roundtrip-report <payload-roundtrip-visual-results.json>] \
 *     [--worker-audit <worker-source-audit-results.json>] \
 *     [--zip <ignored-upload.zip>] \
 *     [--out <ignored-report.json>]
 */

import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import JSZip from 'jszip';

const args = process.argv.slice(2).filter((arg) => arg !== '--');

if (args.includes('--self-test')) {
  runSelfTest().catch((error) => {
    console.error(error?.stack || error);
    process.exitCode = 1;
  });
} else {
  main().catch((error) => {
    console.error(error?.stack || error);
    process.exitCode = 1;
  });
}

const REQUIRED_FILES = ['sheet.html', 'sheet.css', 'translation.json'];
const OPTIONAL_FILES = ['sheet.json'];

async function main() {
  const payloadDir = path.resolve(readOption('--payload-dir'));
  const snippetPath = path.resolve(readOption('--snippet'));
  if (!payloadDir || !snippetPath || payloadDir === path.resolve('.') || snippetPath === path.resolve('.')) {
    throw new Error('Usage: node scripts/roll20_payload_fidelity_gate.mjs --payload-dir <dir> --snippet <file> [options]');
  }

  const report = await evaluateGate({
    payloadDir,
    snippetPath,
    baselineReportPath: resolveOptional('--baseline-report'),
    fixtureId: readOption('--fixture') || '',
    roundtripReportPath: resolveOptional('--roundtrip-report'),
    workerAuditPath: resolveOptional('--worker-audit'),
    zipPath: resolveOptional('--zip') || await discoverZip(payloadDir),
  });

  const outPath = resolveOptional('--out');
  if (outPath) {
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }
  console.log(JSON.stringify({
    pass: report.pass,
    out: outPath,
    payloadDir,
    snippetPath,
    checks: Object.fromEntries(Object.entries(report.checks).map(([key, value]) => [key, value.status])),
  }, null, 2));
  if (!report.pass) process.exitCode = 1;
}

async function evaluateGate(input) {
  const files = await readPayloadFiles(input.payloadDir);
  const snippetText = await fs.readFile(input.snippetPath, 'utf8');
  const data = parseEmbeddedData(snippetText);

  const checks = {
    fileBinding: compareSnippetPayload(files, data),
    appEmit: await compareBaseline(files, input.baselineReportPath, input.fixtureId),
    zipBinding: await compareZip(files, input.zipPath),
    localDomCss: await compareRoundtrip(files, input.roundtripReportPath, input.fixtureId),
    worker: await compareWorker(files, input.workerAuditPath, input.fixtureId),
  };

  const required = [checks.fileBinding, checks.appEmit, checks.zipBinding, checks.localDomCss, checks.worker]
    .filter((check) => check.required);
  return {
    schema: 'roll20-payload-fidelity/v1',
    generatedAt: new Date().toISOString(),
    privacy: 'local-only ignored metadata; hashes, counts, and statuses only; no sheet contents',
    scope: 'local emit -> payload -> ZIP -> upload-snippet fidelity; not external Roll20 readback',
    claimBoundary: {
      externalAttachmentHash: 'VERIFY: Roll20 does not expose uploaded file bytes through this gate',
      visualParity: 'VERIFY: use actual Sandbox/test-room screenshots and computed-style evidence separately',
      workerRuntime: checks.worker.status === 'PASS'
        ? 'LOCAL_SOURCE_PRESERVED: live Roll20 worker execution still requires external evidence'
        : 'VERIFY',
    },
    input: {
      payloadDir: input.payloadDir,
      snippetPath: input.snippetPath,
      baselineReportPath: input.baselineReportPath,
      roundtripReportPath: input.roundtripReportPath,
      workerAuditPath: input.workerAuditPath,
      zipPath: input.zipPath,
      fixtureId: input.fixtureId || null,
    },
    payload: Object.fromEntries(Object.entries(files).map(([name, info]) => [name, {
      bytes: info.bytes.length,
      sha256: info.sha256,
    }])),
    checks,
    pass: required.length > 0 && required.every((check) => check.status === 'PASS'),
  };
}

async function readPayloadFiles(payloadDir) {
  const files = {};
  for (const name of [...REQUIRED_FILES, ...OPTIONAL_FILES]) {
    const filePath = path.join(payloadDir, name);
    try {
      const bytes = await fs.readFile(filePath);
      files[name] = { path: filePath, bytes, sha256: sha256(bytes) };
    } catch (error) {
      if (REQUIRED_FILES.includes(name)) throw new Error(`missing required payload file: ${filePath}`);
      files[name] = null;
    }
  }
  return files;
}

function compareSnippetPayload(files, data) {
  const payload = data?.payload;
  if (!payload || typeof payload !== 'object') return fail('generated snippet has no DATA.payload object');
  const mismatches = [];
  for (const name of REQUIRED_FILES) {
    const key = name === 'sheet.html' ? 'html' : name === 'sheet.css' ? 'css' : 'translation';
    compareEmbeddedFile(mismatches, key, name, files[name], payload[key]);
  }
  if (files['sheet.json']) compareEmbeddedFile(mismatches, 'manifest', 'sheet.json', files['sheet.json'], payload.manifest);
  return mismatches.length === 0
    ? pass('payload files match generated snippet names, byte lengths, SHA-256 hashes, and base64 bytes')
    : fail('generated snippet payload mismatch', mismatches);
}

function compareEmbeddedFile(mismatches, key, name, source, embedded) {
  if (!embedded || typeof embedded !== 'object') {
    mismatches.push(`${key}: missing embedded upload item`);
    return;
  }
  if (embedded.name !== name) mismatches.push(`${key}: name ${JSON.stringify(embedded.name)} != ${name}`);
  if (embedded.bytes !== source.bytes.length) mismatches.push(`${key}: bytes ${embedded.bytes} != ${source.bytes.length}`);
  if (embedded.sha256 !== source.sha256) mismatches.push(`${key}: sha256 mismatch`);
  let decoded;
  try {
    decoded = Buffer.from(String(embedded.base64 || ''), 'base64');
  } catch {
    decoded = null;
  }
  if (!decoded || !decoded.equals(source.bytes)) mismatches.push(`${key}: base64 bytes mismatch`);
}

async function compareBaseline(files, reportPath, fixtureId) {
  if (!reportPath) return verify('no local baseline report supplied');
  const report = await readJson(reportPath);
  const entry = selectFixture(report?.fixtures, fixtureId, files);
  if (!entry) return fail('local baseline report has no matching fixture');
  const mismatches = [];
  for (const [key, name] of Object.entries({ html: 'sheet.html', css: 'sheet.css', translation: 'translation.json' })) {
    const expected = entry.emitSha256?.[key];
    if (!expected) mismatches.push(`${key}: baseline emitSha256 missing`);
    else if (expected !== files[name].sha256) mismatches.push(`${key}: payload hash differs from app emit hash`);
    const expectedBytes = entry.emitBytes?.[key];
    if (Number.isFinite(expectedBytes) && expectedBytes !== files[name].bytes.length) {
      mismatches.push(`${key}: payload byte length differs from app emit length`);
    }
  }
  if (entry.pass !== true) mismatches.push('baseline fixture was not PASS');
  return mismatches.length === 0
    ? pass('payload hashes and byte lengths match the recorded app emit')
    : fail('payload differs from recorded app emit', mismatches);
}

async function compareZip(files, zipPath) {
  if (!zipPath) return verify('no upload ZIP supplied');
  const zipBytes = await fs.readFile(zipPath);
  const zip = await JSZip.loadAsync(zipBytes);
  const mismatches = [];
  for (const name of [...REQUIRED_FILES, ...OPTIONAL_FILES]) {
    if (!files[name]) continue;
    const entry = zip.file(name);
    if (!entry) {
      mismatches.push(`${name}: missing from ZIP`);
      continue;
    }
    const bytes = await entry.async('nodebuffer');
    if (!bytes.equals(files[name].bytes)) mismatches.push(`${name}: ZIP bytes mismatch`);
  }
  return mismatches.length === 0
    ? pass('ZIP entries match the payload files byte-for-byte')
    : fail('ZIP payload mismatch', mismatches);
}

async function compareRoundtrip(files, reportPath, fixtureId) {
  if (!reportPath) return verify('no local preview roundtrip report supplied');
  const report = await readJson(reportPath);
  const entry = selectFixture(report?.fixtures, fixtureId, files);
  if (!entry) return fail('roundtrip report has no matching fixture');
  const problems = [];
  if (entry.pass !== true) problems.push('roundtrip fixture was not PASS');
  if (!entry.previewDom || entry.previewDom.elementCount <= 0) problems.push('preview DOM evidence is empty');
  if (entry.previewDom?.visibleScriptCount !== 0) problems.push('worker/rolltemplate node is visibly rendered');
  if (entry.pageErrors?.length) problems.push(`page errors=${entry.pageErrors.length}`);
  if (entry.unexpectedConsoleErrors?.length) problems.push(`console errors=${entry.unexpectedConsoleErrors.length}`);
  if (entry.unexpectedResourceIssues?.length) problems.push(`resource issues=${entry.unexpectedResourceIssues.length}`);
  const mismatch = entry.diff?.best?.mismatchPct;
  if (Number.isFinite(mismatch) && mismatch > (report.mismatchThresholdPct ?? 2)) {
    problems.push(`local screenshot mismatch=${mismatch}%`);
  }
  return problems.length === 0
    ? pass('local preview DOM/CSS evidence is populated, stable, and has no visible runtime nodes')
    : fail('local preview DOM/CSS evidence is not clean', problems);
}

async function compareWorker(files, reportPath, fixtureId) {
  const sourceCount = countWorkerScripts(files['sheet.html'].bytes.toString('utf8'));
  if (sourceCount === 0 && !reportPath) return notApplicable('payload contains no Roll20 worker script');
  if (!reportPath) return verify(`payload contains ${sourceCount} worker script(s), but no worker source audit was supplied`);
  const report = await readJson(reportPath);
  const entry = selectFixture(report?.fixtures, fixtureId, files);
  if (!entry) return fail('worker audit has no matching fixture');
  if (sourceCount === 0) return notApplicable('payload contains no Roll20 worker script');
  if (entry.exactCanonicalMatch !== true || entry.pass !== true) {
    return fail('worker source audit did not prove exact canonical preservation', [
      `exactCanonicalMatch=${String(entry.exactCanonicalMatch)}`,
      `auditPass=${String(entry.pass)}`,
    ]);
  }
  return pass(`worker source audit proves exact canonical preservation for ${sourceCount} script(s)`);
}

function selectFixture(fixtures, fixtureId, files) {
  if (!Array.isArray(fixtures)) return null;
  if (fixtureId) return fixtures.find((entry) => entry?.id === fixtureId) || null;
  const payloadDir = path.resolve(path.dirname(files['sheet.html'].path));
  return fixtures.find((entry) => entry?.payloadDir && path.resolve(entry.payloadDir) === payloadDir)
    || (fixtures.length === 1 ? fixtures[0] : null);
}

function parseEmbeddedData(source) {
  const marker = 'const DATA =';
  const markerAt = source.indexOf(marker);
  if (markerAt < 0) throw new Error('generated snippet is missing const DATA');
  const start = source.indexOf('{', markerAt + marker.length);
  if (start < 0) throw new Error('generated snippet DATA object is missing');
  const end = findJsonObjectEnd(source, start);
  return JSON.parse(source.slice(start, end));
}

function findJsonObjectEnd(source, start) {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{') depth += 1;
    if (char === '}' && --depth === 0) return index + 1;
  }
  throw new Error('generated snippet DATA object is unterminated');
}

function countWorkerScripts(html) {
  return (String(html).match(/<script\b[^>]*\btype\s*=\s*["']text\/worker["'][^>]*>/gi) || []).length;
}

async function discoverZip(payloadDir) {
  const candidate = path.join(payloadDir, '..', 'upload.zip');
  try {
    await fs.access(candidate);
    return candidate;
  } catch {
    return '';
  }
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function pass(note, details = []) {
  return { status: 'PASS', required: true, note, details };
}

function fail(note, details = []) {
  return { status: 'FAIL', required: true, note, details };
}

function verify(note) {
  return { status: 'VERIFY', required: false, note, details: [] };
}

function notApplicable(note) {
  return { status: 'N/A', required: false, note, details: [] };
}

function readOption(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] || '' : '';
}

function resolveOptional(name) {
  const value = readOption(name);
  return value ? path.resolve(value) : '';
}

async function runSelfTest() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'r20-payload-fidelity-'));
  try {
    const payloadDir = path.join(root, 'payload');
    await fs.mkdir(payloadDir, { recursive: true });
    const contents = {
      'sheet.html': '<div class="proof"><input name="attr_name"></div>\n',
      'sheet.css': '.proof { color: #3b2730; }\n',
      'translation.json': '{"name":"Name"}\n',
      'sheet.json': '{"legacy":false}\n',
    };
    const payload = {};
    for (const [name, value] of Object.entries(contents)) {
      const bytes = Buffer.from(value, 'utf8');
      await fs.writeFile(path.join(payloadDir, name), bytes);
      const key = name === 'sheet.html' ? 'html' : name === 'sheet.css' ? 'css' : name === 'translation.json' ? 'translation' : 'manifest';
      payload[key] = { name, bytes: bytes.length, sha256: sha256(bytes), base64: bytes.toString('base64') };
    }
    const snippetPath = path.join(root, 'upload.js');
    await fs.writeFile(snippetPath, `const DATA = ${JSON.stringify({ payload })};\nconst SUBMIT_SETTINGS_FORM = false;\n`, 'utf8');
    const zip = new JSZip();
    for (const [name, value] of Object.entries(contents)) zip.file(name, value);
    const zipPath = path.join(root, 'upload.zip');
    await fs.writeFile(zipPath, await zip.generateAsync({ type: 'nodebuffer' }));
    const baselinePath = path.join(root, 'baseline.json');
    await fs.writeFile(baselinePath, JSON.stringify({ fixtures: [{
      id: 'self-test',
      emitSha256: Object.fromEntries(Object.entries(payload).filter(([key]) => key !== 'manifest').map(([key, item]) => [key, item.sha256])),
      emitBytes: Object.fromEntries(Object.entries(payload).filter(([key]) => key !== 'manifest').map(([key, item]) => [key, item.bytes])),
      pass: true,
    }] }));
    const roundtripPath = path.join(root, 'roundtrip.json');
    await fs.writeFile(roundtripPath, JSON.stringify({ mismatchThresholdPct: 2, fixtures: [{
      id: 'self-test', pass: true, previewDom: { elementCount: 2, visibleScriptCount: 0 },
      diff: { best: { mismatchPct: 0 } }, pageErrors: [], unexpectedConsoleErrors: [], unexpectedResourceIssues: [],
    }] }));
    const report = await evaluateGate({
      payloadDir,
      snippetPath,
      baselineReportPath: baselinePath,
      fixtureId: 'self-test',
      roundtripReportPath: roundtripPath,
      workerAuditPath: '',
      zipPath,
    });
    if (!report.pass) throw new Error(`self-test gate failed: ${JSON.stringify(report.checks)}`);
    if (report.checks.worker.status !== 'N/A') throw new Error('self-test worker should be N/A');
    console.log('ROLL20 PAYLOAD FIDELITY SELF-TEST PASS');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}
