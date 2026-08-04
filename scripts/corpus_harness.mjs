#!/usr/bin/env node

import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  assertPersistableCorpusCaseResult,
  classifyDiagnosticCategory,
  createAnonymousCaseId,
  createCombinedInputHash,
  createCorpusCacheKey,
  normalizeCorpusCaseResult,
  selectRepresentativeSetCover,
} from './lib/corpus_harness_core.mjs';
import {
  discoverCorpusCases,
  validateCorpusRoots,
} from './lib/corpus_discovery.mjs';

const REPO = path.resolve(import.meta.dirname, '..');
const HARNESS_VERSION = '2';
const DEFAULT_CONFIG = path.join(REPO, '.tmp', 'corpus-harness', 'config.json');
const ALLOWED_COMMANDS = new Set(['scan', 'changed', 'full', 'select']);
const RESULT_FILE = 'corpus-results.json';
const SUMMARY_FILE = 'corpus-summary.json';
const INVENTORY_FILE = 'corpus-inventory.json';
const SCAN_SUMMARY_FILE = 'corpus-scan-summary.json';
const SELECTED_FILE = 'corpus-selected.json';
const MAX_CAPTURE_BYTES = 8 * 1024 * 1024;

function argOf(args, name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function assertAllowedOutputDirectory(directory, label) {
  const allowed = [path.join(REPO, 'reports'), path.join(REPO, '.tmp')];
  if (!allowed.some((root) => isInside(root, directory))) {
    throw new Error(`${label} must stay under ignored reports/ or .tmp/`);
  }
}

function assertConfigShape(value, configPath) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('corpus harness config must be an object');
  }
  const allowedKeys = new Set(['version', 'roots', 'reportDir', 'cacheDir', 'concurrency']);
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) throw new TypeError('corpus harness config has an unsupported field');
  }
  if (value.version !== 1) throw new TypeError('corpus harness config version must be 1');
  if (typeof value.reportDir !== 'string' || !value.reportDir.trim()) {
    throw new TypeError('reportDir must be a non-empty string');
  }
  if (typeof value.cacheDir !== 'string' || !value.cacheDir.trim()) {
    throw new TypeError('cacheDir must be a non-empty string');
  }
  if (!Number.isSafeInteger(value.concurrency) || value.concurrency < 1 || value.concurrency > 2) {
    throw new TypeError('concurrency must be 1 or 2');
  }
  const baseDir = path.dirname(configPath);
  const roots = validateCorpusRoots(value.roots, { baseDir });
  const reportDir = path.resolve(REPO, value.reportDir);
  const cacheDir = path.resolve(REPO, value.cacheDir);
  assertAllowedOutputDirectory(reportDir, 'reportDir');
  assertAllowedOutputDirectory(cacheDir, 'cacheDir');
  return {
    version: value.version,
    roots,
    reportDir,
    cacheDir,
    concurrency: value.concurrency,
  };
}

async function loadConfig(configPath) {
  if (!existsSync(configPath)) {
    throw new Error(
      `local corpus config missing; create ignored ${path.relative(REPO, configPath)} from docs/qa/39_local_corpus_harness.md`,
    );
  }
  return assertConfigShape(JSON.parse(await readFile(configPath, 'utf8')), configPath);
}

function currentGitSha() {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: REPO,
    encoding: 'utf8',
    windowsHide: true,
  });
  if (result.status !== 0) throw new Error('cannot resolve current Git SHA');
  return result.stdout.trim();
}

function modesFor(compatibility) {
  if (compatibility === 'both') return ['modern', 'legacy'];
  if (compatibility === 'modern' || compatibility === 'legacy') return [compatibility];
  throw new Error('invalid discovered compatibility mode');
}

async function readBuffers(paths, typePrefix) {
  const values = [];
  for (let index = 0; index < paths.length; index += 1) {
    values.push({
      type: `${typePrefix}:${String(index).padStart(4, '0')}`,
      bytes: await readFile(paths[index]),
    });
  }
  return values;
}

async function inputMaterial(caseDescriptor) {
  const groups = [
    ['html', caseDescriptor.htmlPaths],
    ['css', caseDescriptor.cssPaths],
    ['translation', caseDescriptor.translationPaths],
    ['javascript', caseDescriptor.javascriptPaths],
    ['image', caseDescriptor.imagePaths],
  ];
  const inputs = [];
  for (const [type, paths] of groups) inputs.push(...await readBuffers(paths, type));
  if (inputs.length === 0) throw new Error('discovered case contains no readable input');
  return inputs;
}

async function readTextFiles(paths) {
  const values = [];
  for (const filePath of paths) values.push(await readFile(filePath, 'utf8'));
  return values;
}

function translationPriority(filePath) {
  const name = path.basename(filePath).toLowerCase();
  if (name === 'translation.json') return 0;
  if (name === 'translations.json') return 1;
  if (/^en(?:[-_][a-z0-9]+)?\.json$/i.test(name)) return 2;
  return 3;
}

async function composeRuntimeInput(caseDescriptor) {
  const htmlParts = await readTextFiles(caseDescriptor.htmlPaths);
  const cssParts = await readTextFiles(caseDescriptor.cssPaths);
  const translationPath = [...caseDescriptor.translationPaths]
    .sort((left, right) => translationPriority(left) - translationPriority(right) || left.localeCompare(right))[0];
  let html = htmlParts.join('\n');
  const hasInlineWorker = /<script\b[^>]*\btype\s*=\s*["']text\/worker["']/i.test(html);
  if (!hasInlineWorker && caseDescriptor.workerPaths.length > 0) {
    const workerParts = await readTextFiles(caseDescriptor.workerPaths);
    html += `\n${workerParts.map((source) => `<script type="text/worker">\n${source}\n</script>`).join('\n')}`;
  }
  return {
    html,
    css: cssParts.join('\n'),
    i18n: translationPath ? await readFile(translationPath, 'utf8') : '',
  };
}

async function makeRows(discovery, gitSha, onlyId = '') {
  const rows = [];
  for (const caseDescriptor of discovery.cases) {
    let inputHash = '';
    for (const mode of modesFor(caseDescriptor.compatibility)) {
      const anonymousId = createAnonymousCaseId({
        rootId: caseDescriptor.rootId,
        relativeKey: `${caseDescriptor.relativeKey}\0${mode}`,
      });
      if (onlyId && anonymousId !== onlyId) continue;
      if (!inputHash) inputHash = createCombinedInputHash(await inputMaterial(caseDescriptor));
      rows.push({
        anonymousId,
        mode,
        caseDescriptor,
        inputHash,
        cacheKey: createCorpusCacheKey({
          inputHash,
          gitSha,
          mode,
          harnessVersion: HARNESS_VERSION,
        }),
      });
    }
  }
  return rows.sort((left, right) => left.anonymousId.localeCompare(right.anonymousId));
}

function blankResult(row) {
  return normalizeCorpusCaseResult({
    anonymousId: row.anonymousId,
    compatibility: row.mode,
    inputHash: row.inputHash,
    features: row.caseDescriptor.features,
    levels: {},
    mapping: {},
    runtime: {},
    diagnostics: row.caseDescriptor.diagnostics.map(classifyDiagnosticCategory),
    cacheKey: row.cacheKey,
  });
}

function cachePath(config, row) {
  return path.join(config.cacheDir, 'results', `${row.cacheKey}.json`);
}

async function readCachedEnvelope(config, row) {
  try {
    const parsed = JSON.parse(await readFile(cachePath(config, row), 'utf8'));
    assertPersistableCorpusCaseResult(parsed.result);
    if (
      parsed.harnessVersion !== HARNESS_VERSION
      || parsed.result.cacheKey !== row.cacheKey
      || parsed.mode !== row.mode
    ) return null;
    return parsed;
  } catch {
    return null;
  }
}

function boundedOutput(value) {
  const text = String(value ?? '');
  return text.length > MAX_CAPTURE_BYTES ? text.slice(-MAX_CAPTURE_BYTES) : text;
}

function runChild(args, options) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, {
      ...options,
      cwd: REPO,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 240000,
      killSignal: 'SIGTERM',
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout = boundedOutput(stdout + chunk); });
    child.stderr.on('data', (chunk) => { stderr = boundedOutput(stderr + chunk); });
    child.on('error', (error) => resolve({ code: null, error, stdout, stderr }));
    child.on('close', (code, signal) => resolve({ code, signal, stdout, stderr }));
  });
}

function stableRoundtrip(fixture) {
  const stable = fixture?.reimport?.stable;
  return Boolean(
    stable?.html
    && stable?.css
    && stable?.i18n
    && stable?.js
    && stable?.worker
    && stable?.blockCount
    && stable?.graph,
  );
}

function safeGraphDiagnostics(fixture) {
  const allowedDifferences = new Set([
    'block-count', 'type', 'depth', 'parent', 'previous', 'next', 'childCount', 'fields',
  ]);
  return Object.fromEntries(['html', 'css', 'i18n', 'js', 'worker'].map((key) => {
    const value = fixture?.reimport?.graphDiagnostics?.[key] ?? {};
    return [key, {
      pass: value.pass === true,
      beforeBlocks: Number.isSafeInteger(value.beforeBlocks) ? value.beforeBlocks : 0,
      afterBlocks: Number.isSafeInteger(value.afterBlocks) ? value.afterBlocks : 0,
      firstDifferenceIndex: Number.isSafeInteger(value.firstDifferenceIndex)
        ? value.firstDifferenceIndex
        : null,
      differences: Array.isArray(value.differences)
        ? value.differences.filter((item) => allowedDifferences.has(item)).sort()
        : [],
      changedFieldNames: Array.isArray(value.changedFieldNames)
        ? value.changedFieldNames
          .filter((item) => typeof item === 'string' && item.length > 0 && item.length <= 64)
          .sort()
        : [],
      normalizations: Array.isArray(value.normalizations)
        ? value.normalizations.filter((item) => item === 'boundary-whitespace')
        : [],
      fieldSemanticFailures: Array.isArray(value.fieldSemanticFailures)
        ? value.fieldSemanticFailures.filter((item) => [
          'field-count',
          'field-missing',
          'field-not-normalizable',
          'field-kind',
          'field-options',
          'field-value',
        ].includes(item)).sort()
        : [],
      fieldDifferenceTraits: Object.fromEntries(
        Object.entries(value.fieldDifferenceTraits ?? {})
          .filter(([name]) => name.length > 0 && name.length <= 64)
          .map(([name, traits]) => [name, {
            occurrences: Number.isSafeInteger(traits?.occurrences) ? traits.occurrences : 0,
            valueExact: traits?.valueExact === true,
            valueTrimmed: traits?.valueTrimmed === true,
            lineEndingNormalized: traits?.lineEndingNormalized === true,
            whitespaceNormalized: traits?.whitespaceNormalized === true,
            kindEqual: traits?.kindEqual === true,
            optionsEqual: traits?.optionsEqual === true,
            preservedAttributesSemantic: traits?.preservedAttributesSemantic === true,
            preservedAttributeFailures: Array.isArray(traits?.preservedAttributeFailures)
              ? traits.preservedAttributeFailures.filter((item) => [
                'attribute-json',
                'attribute-count',
                'attribute-name',
                'attribute-style',
                'attribute-class',
                'attribute-data',
                'attribute-aria',
                'attribute-name-value',
                'attribute-other',
              ].includes(item)).sort()
              : [],
            attributeValueTransformations: Array.isArray(traits?.attributeValueTransformations)
              ? traits.attributeValueTransformations.filter((item) => [
                'boolean-attribute-value',
                'name-trim',
                'name-add-attr-prefix',
                'name-remove-attr-prefix',
                'name-remove-sheet-prefix',
                'name-other',
              ].includes(item)).sort()
              : [],
            changedStandardAttributeNames: Array.isArray(traits?.changedStandardAttributeNames)
              ? traits.changedStandardAttributeNames.filter((item) => [
                'accept', 'action', 'checked', 'cols', 'disabled', 'for', 'height', 'href',
                'max', 'maxlength', 'min', 'minlength', 'multiple', 'name', 'placeholder',
                'readonly', 'required', 'role', 'rows', 'selected', 'size', 'src', 'step',
                'title', 'type', 'value', 'width',
              ].includes(item)).sort()
              : [],
            maxLengthDelta: Number.isSafeInteger(traits?.maxLengthDelta) ? traits.maxLengthDelta : 0,
          }]),
      ),
    }];
  }));
}

function genericDiagnostics(row, fixture, child) {
  const values = row.caseDescriptor.diagnostics.map(classifyDiagnosticCategory);
  for (const code of fixture?.import?.diagnosticCodes ?? []) values.push(classifyDiagnosticCategory(code));
  if ((fixture?.resourceIssueCount ?? 0) > 0) values.push('asset');
  if ((fixture?.consoleErrors?.length ?? 0) > 0 || (fixture?.pageErrors?.length ?? 0) > 0) {
    values.push('runtime');
  }
  if (!fixture?.localPreviewPass) values.push(row.mode === 'legacy' ? 'legacy-transform' : 'runtime');
  const stable = fixture?.reimport?.stable;
  const graph = fixture?.reimport?.graphByWorkspace;
  if (stable && stable.html !== true) values.push('html-structure');
  if (stable && stable.css !== true) values.push('css-parser');
  if (stable && stable.i18n !== true) values.push('translation');
  if (graph) {
    if (graph.html !== true) values.push('html-structure');
    if (graph.css !== true) values.push('css-parser');
    if (graph.i18n !== true) values.push('translation');
    if (graph.worker !== true) values.push('worker');
    if (graph.js !== true) values.push('runtime');
  }
  if (child.code !== 0 && !fixture) values.push('runtime');
  return [...new Set(values)].sort();
}

async function executeRow(config, row, port) {
  const workDir = path.join(config.cacheDir, 'work', `${row.anonymousId}-${randomUUID()}`);
  const inputDir = path.join(workDir, 'input');
  const childReportDir = path.join(workDir, 'report');
  await mkdir(inputDir, { recursive: true });
  await mkdir(childReportDir, { recursive: true });
  let envelope;
  try {
    const input = await composeRuntimeInput(row.caseDescriptor);
    const htmlPath = path.join(inputDir, 'source.html');
    const cssPath = path.join(inputDir, 'source.css');
    const i18nPath = path.join(inputDir, 'source.i18n');
    await writeFile(htmlPath, input.html, 'utf8');
    await writeFile(cssPath, input.css, 'utf8');
    await writeFile(i18nPath, input.i18n, 'utf8');
    const child = await runChild([
      '--max-old-space-size=1536',
      path.join(REPO, 'scripts', 'imported_edit_sync_smoke.mjs'),
      '--out-dir', path.join(REPO, 'out'),
      '--base-path', '/roll20-block-editor',
      '--report-dir', childReportDir,
      '--only', 'local-input',
      '--port', String(port),
      '--compatibility-mode', row.mode,
      '--roundtrip-only', 'true',
      '--roundtrip-repeats', '1',
      '--harness-preview', 'true',
      '--require-sheet-visual-sync', 'true',
    ], {
      env: {
        ...process.env,
        R20_IMPORTED_EDIT_HTML_PATH: htmlPath,
        R20_IMPORTED_EDIT_CSS_PATH: cssPath,
        R20_IMPORTED_EDIT_I18N_PATH: i18nPath,
      },
    });
    let report = null;
    try {
      report = JSON.parse(await readFile(path.join(childReportDir, 'imported-edit-sync-results.json'), 'utf8'));
    } catch {}
    const fixture = report?.fixtures?.[0] ?? null;
    const mapping = fixture?.import?.mapping ?? {};
    const l0 = Boolean(fixture?.import?.blockCount > 0);
    const l1 = Boolean(
      l0
      && mapping.htmlAccounted === true
      && mapping.cssAccounted === true
      && mapping.unexplainedDrops === 0,
    );
    const l2 = l1 && stableRoundtrip(fixture);
    const l3 = l2 && fixture?.reimport?.sourceComparison?.pass === true;
    const result = normalizeCorpusCaseResult({
      anonymousId: row.anonymousId,
      compatibility: row.mode,
      inputHash: row.inputHash,
      features: row.caseDescriptor.features,
      levels: { l0, l1, l2, l3, l4: false },
      mapping: {
        structured: Number.isSafeInteger(mapping.structured) ? mapping.structured : 0,
        rawPreserved: Number.isSafeInteger(mapping.rawPreserved) ? mapping.rawPreserved : 0,
        unexplainedDrops: Number.isSafeInteger(mapping.unexplainedDrops) ? mapping.unexplainedDrops : 0,
      },
      runtime: {
        consoleErrors: fixture?.consoleErrors?.length ?? 0,
        pageErrors: fixture?.pageErrors?.length ?? 0,
        resourceWarnings: fixture?.resourceIssueCount ?? 0,
      },
      diagnostics: genericDiagnostics(row, fixture, child),
      cacheKey: row.cacheKey,
    });
    assertPersistableCorpusCaseResult(result);
    envelope = {
      harnessVersion: HARNESS_VERSION,
      mode: row.mode,
      result,
      checks: {
        mappingAccounted: mapping.htmlAccounted === true && mapping.cssAccounted === true,
        semanticRoundtrip: stableRoundtrip(fixture),
        emitStable: {
          html: fixture?.reimport?.stable?.html === true,
          css: fixture?.reimport?.stable?.css === true,
          i18n: fixture?.reimport?.stable?.i18n === true,
          i18nRaw: fixture?.reimport?.stable?.i18nRaw === true,
          js: fixture?.reimport?.stable?.js === true,
          worker: fixture?.reimport?.stable?.worker === true,
          blockCount: fixture?.reimport?.stable?.blockCount === true,
          graph: fixture?.reimport?.stable?.graph === true,
        },
        graphByWorkspace: Object.fromEntries(
          ['html', 'css', 'i18n', 'js', 'worker'].map((key) => [
            key,
            fixture?.reimport?.graphByWorkspace?.[key] === true,
          ]),
        ),
        graphDiagnostics: safeGraphDiagnostics(fixture),
        localPreview: fixture?.localPreviewPass === true,
        previewEditVisual: fixture?.sheetVisualSync?.pass === true,
        previewEditFormState: fixture?.formStateDiff?.pass === true,
        previewEditGeometry: fixture?.rootGeometryDiff?.pass === true,
        runtimeClean:
          (fixture?.consoleErrors?.length ?? 0) === 0
          && (fixture?.pageErrors?.length ?? 0) === 0,
        resourceClean: (fixture?.resourceIssueCount ?? 0) === 0,
        normalizedSource: fixture?.reimport?.sourceComparison?.pass === true,
        normalizedSourceByArtifact: {
          html: fixture?.reimport?.sourceComparison?.html === true,
          css: fixture?.reimport?.sourceComparison?.css === true,
          i18n: fixture?.reimport?.sourceComparison?.i18n === true,
        },
        childExit: child.code,
      },
    };
  } catch {
    const result = normalizeCorpusCaseResult({
      ...blankResult(row),
      diagnostics: [
        ...blankResult(row).diagnostics,
        'runtime',
        ...(row.mode === 'legacy' ? ['legacy-transform'] : []),
      ],
    });
    envelope = {
      harnessVersion: HARNESS_VERSION,
      mode: row.mode,
      result,
      checks: {
        mappingAccounted: false,
        semanticRoundtrip: false,
        emitStable: {
          html: false,
          css: false,
          i18n: false,
          i18nRaw: false,
          js: false,
          worker: false,
          blockCount: false,
          graph: false,
        },
        graphByWorkspace: { html: false, css: false, i18n: false, js: false, worker: false },
        graphDiagnostics: safeGraphDiagnostics(null),
        localPreview: false,
        previewEditVisual: false,
        previewEditFormState: false,
        previewEditGeometry: false,
        runtimeClean: false,
        resourceClean: false,
        normalizedSource: false,
        normalizedSourceByArtifact: { html: false, css: false, i18n: false },
        childExit: null,
      },
    };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
  await mkdir(path.dirname(cachePath(config, row)), { recursive: true });
  await writeFile(cachePath(config, row), `${JSON.stringify(envelope, null, 2)}\n`, 'utf8');
  return envelope;
}

async function mapWithConcurrency(values, concurrency, mapper) {
  const output = new Array(values.length);
  let next = 0;
  async function worker(workerIndex) {
    while (next < values.length) {
      const index = next;
      next += 1;
      output[index] = await mapper(values[index], index, workerIndex);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, (_, index) => worker(index)));
  return output;
}

function aggregate(rows, envelopes, { baselineComplete }) {
  const results = envelopes.map((entry) => entry.result);
  const total = results.length;
  const count = (predicate) => results.filter(predicate).length;
  const localPreviewPassed = envelopes.filter((entry) => entry.checks?.localPreview).length;
  const runtimeClean = envelopes.filter((entry) => entry.checks?.runtimeClean).length;
  const resourceClean = envelopes.filter((entry) => entry.checks?.resourceClean).length;
  const l2Passed = count((entry) => entry.levels.l2);
  const l3Passed = count((entry) => entry.levels.l3);
  const score = baselineComplete && total > 0
    ? Math.round(((l2Passed / total) * 35 + (localPreviewPassed / total) * 25) * 10) / 10
    : null;
  return {
    version: 1,
    harnessVersion: HARNESS_VERSION,
    baselineComplete,
    progressPct: score,
    progressScope: baselineComplete
      ? 'local corpus and local Preview gates only; actual Roll20, export diagnostics, and Alpha UX remain zero until separately verified'
      : 'withheld until every discovered current case-mode has a result',
    rows: total,
    levels: {
      l0: count((entry) => entry.levels.l0),
      l1: count((entry) => entry.levels.l1),
      l2: l2Passed,
      l3: l3Passed,
      l4: count((entry) => entry.levels.l4),
    },
    localPreviewPassed,
    runtimeClean,
    resourceClean,
    unexplainedDrops: results.reduce((sum, entry) => sum + entry.mapping.unexplainedDrops, 0),
    diagnostics: Object.fromEntries(
      [...new Set(results.flatMap((entry) => entry.diagnostics))]
        .sort()
        .map((category) => [category, results.filter((entry) => entry.diagnostics.includes(category)).length]),
    ),
    requiredLocalPass: total > 0
      && l2Passed === total
      && localPreviewPassed === total
      && runtimeClean === total
      && results.every((entry) => entry.mapping.unexplainedDrops === 0),
    expectedRows: rows.length,
  };
}

async function writeReports(config, rows, envelopes, summary) {
  await mkdir(config.reportDir, { recursive: true });
  const results = envelopes.map((entry) => entry.result).sort((left, right) => left.anonymousId.localeCompare(right.anonymousId));
  await writeFile(
    path.join(config.reportDir, RESULT_FILE),
    `${JSON.stringify({ version: 1, results }, null, 2)}\n`,
    'utf8',
  );
  await writeFile(path.join(config.reportDir, SUMMARY_FILE), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
}

async function writeInventory(config, rows) {
  await mkdir(config.reportDir, { recursive: true });
  const results = rows.map(blankResult).sort((left, right) => left.anonymousId.localeCompare(right.anonymousId));
  await writeFile(
    path.join(config.reportDir, INVENTORY_FILE),
    `${JSON.stringify({ version: 1, results }, null, 2)}\n`,
    'utf8',
  );
}

async function runScan(config, rows) {
  const envelopes = rows.map((row) => ({ result: blankResult(row), checks: {} }));
  const summary = aggregate(rows, envelopes, { baselineComplete: false });
  await writeFile(path.join(config.reportDir, SCAN_SUMMARY_FILE), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  return { rows, envelopes, summary, executed: 0, cached: 0 };
}

async function runCases(config, rows, { force }) {
  if (!existsSync(path.join(REPO, 'out', 'index.html'))) {
    throw new Error('static app output missing; run corepack pnpm run build first');
  }
  await rm(path.join(config.cacheDir, 'work'), { recursive: true, force: true });
  const cached = new Map();
  if (!force) {
    for (const row of rows) {
      const envelope = await readCachedEnvelope(config, row);
      if (envelope) cached.set(row.cacheKey, envelope);
    }
  }
  const pending = rows.filter((row) => !cached.has(row.cacheKey));
  let completed = 0;
  const executedEntries = await mapWithConcurrency(
    pending,
    config.concurrency,
    async (row, index, workerIndex) => {
      const envelope = await executeRow(config, row, 4300 + workerIndex);
      completed += 1;
      console.log(
        `[corpus] ${completed}/${pending.length} ${row.anonymousId} ${row.mode} `
        + `${envelope.result.levels.l2 && envelope.checks.localPreview ? 'PASS' : 'FAIL'}`,
      );
      return envelope;
    },
  );
  const executed = new Map(pending.map((row, index) => [row.cacheKey, executedEntries[index]]));
  const envelopes = rows.map((row) => cached.get(row.cacheKey) ?? executed.get(row.cacheKey));
  const baselineComplete = envelopes.every(Boolean) && envelopes.length === rows.length;
  const summary = aggregate(rows, envelopes, { baselineComplete });
  await writeReports(config, rows, envelopes, summary);
  return { rows, envelopes, summary, executed: pending.length, cached: cached.size };
}

async function runSelect(config) {
  const inventoryPath = path.join(config.reportDir, INVENTORY_FILE);
  const sourcePath = existsSync(inventoryPath)
    ? inventoryPath
    : path.join(config.reportDir, RESULT_FILE);
  const parsed = JSON.parse(await readFile(sourcePath, 'utf8'));
  const results = parsed.results.map(normalizeCorpusCaseResult);
  const selected = selectRepresentativeSetCover(results);
  const report = {
    version: 1,
    selectedAnonymousIds: selected.selectedAnonymousIds,
    coveredFeatureCount: selected.coveredTokens.length,
    uncoveredFeatureCount: selected.uncoveredTokens.length,
  };
  await writeFile(path.join(config.reportDir, SELECTED_FILE), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return report;
}

async function executeCommand(command, configPath, { force = false, onlyId = '' } = {}) {
  const config = await loadConfig(configPath);
  if (command === 'select') return runSelect(config);
  const discovery = await discoverCorpusCases(config.roots);
  if (discovery.diagnostics.some((category) => category.startsWith('root:'))) {
    throw new Error('one or more configured corpus roots are unavailable or unsafe');
  }
  const rows = await makeRows(discovery, currentGitSha(), onlyId);
  if (rows.length === 0) throw new Error('corpus discovery found no HTML cases');
  await writeInventory(config, rows);
  if (command === 'scan') return runScan(config, rows);
  return runCases(config, rows, { force });
}

async function selfTest() {
  const token = randomUUID();
  const rootDir = path.join(REPO, '.tmp', `corpus-harness-selftest-${token}`);
  const sourceDir = path.join(rootDir, 'private-source-label');
  const configPath = path.join(rootDir, 'config.json');
  try {
    await mkdir(sourceDir, { recursive: true });
    await writeFile(path.join(sourceDir, 'sheet.html'), '<main><input name="attr_test"></main>', 'utf8');
    await writeFile(path.join(sourceDir, 'sheet.css'), 'main { color: #123; }', 'utf8');
    await writeFile(configPath, JSON.stringify({
      version: 1,
      roots: [{ id: 'corpus-01', path: sourceDir, mode: 'auto' }],
      reportDir: path.join(rootDir, 'reports'),
      cacheDir: path.join(rootDir, 'cache'),
      concurrency: 1,
    }, null, 2), 'utf8');
    const run = await executeCommand('scan', configPath);
    if (run.summary.progressPct !== null || run.summary.baselineComplete !== false) {
      throw new Error('scan must withhold progress before full baseline');
    }
    const text = await readFile(path.join(rootDir, 'reports', INVENTORY_FILE), 'utf8');
    if (text.includes('private-source-label') || text.includes('sheet.html') || text.includes(sourceDir)) {
      throw new Error('scan report leaked private source identity');
    }
    console.log('corpus harness self-test PASS');
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--self-test')) {
    await selfTest();
    return;
  }
  const command = args[0];
  if (!ALLOWED_COMMANDS.has(command)) {
    console.error('usage: node scripts/corpus_harness.mjs scan|changed|full|select [--config <ignored-path>] [--only <anonymous-id>] [--force]');
    process.exitCode = 2;
    return;
  }
  const configPath = path.resolve(argOf(args, '--config', DEFAULT_CONFIG));
  const result = await executeCommand(command, configPath, {
    force: args.includes('--force'),
    onlyId: argOf(args, '--only', ''),
  });
  if (command === 'select') {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log(JSON.stringify({
    command,
    rows: result.rows.length,
    executed: result.executed,
    cached: result.cached,
    baselineComplete: result.summary.baselineComplete,
    progressPct: result.summary.progressPct,
    requiredLocalPass: result.summary.requiredLocalPass,
  }, null, 2));
  if (command !== 'scan' && !result.summary.requiredLocalPass) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exitCode = 1;
});
