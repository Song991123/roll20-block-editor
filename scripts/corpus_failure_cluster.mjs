#!/usr/bin/env node

import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createAnonymousCaseId } from './lib/corpus_harness_core.mjs';

const REPO = path.resolve(import.meta.dirname, '..');
const DEFAULT_CONFIG = path.join(REPO, '.tmp', 'corpus-harness', 'config.json');
const RESULT_FILE = 'corpus-results.json';
const OUTPUT_FILE = 'corpus-failure-clusters.json';
const CONCURRENCY = 16;

function argOf(args, name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

async function loadLocalPaths(configPath) {
  const value = JSON.parse(await readFile(configPath, 'utf8'));
  const reportDir = path.resolve(REPO, value?.reportDir ?? '');
  const cacheDir = path.resolve(REPO, value?.cacheDir ?? '');
  const allowedRoots = [path.join(REPO, 'reports'), path.join(REPO, '.tmp')];
  if (!allowedRoots.some((root) => isInside(root, reportDir))) {
    throw new Error('reportDir must remain under ignored reports/ or .tmp/');
  }
  if (!allowedRoots.some((root) => isInside(root, cacheDir))) {
    throw new Error('cacheDir must remain under ignored reports/ or .tmp/');
  }
  return { reportDir, cacheDir };
}

function cleanList(values, pattern) {
  return [...new Set((Array.isArray(values) ? values : [])
    .filter((value) => typeof value === 'string' && pattern.test(value)))]
    .sort();
}

function collectGraphTraits(checks) {
  const failedWorkspaces = [];
  const firstDifferenceTypes = [];
  const changedFields = [];
  const preservedAttributeNames = [];
  const fieldFailures = [];
  for (const [workspace, graph] of Object.entries(checks?.graphDiagnostics ?? {})) {
    if (!/^(?:html|css|i18n|js|worker)$/.test(workspace) || !graph || graph.pass === true) continue;
    failedWorkspaces.push(workspace);
    for (const side of ['before', 'after']) {
      const type = graph.firstDifferenceNode?.[side]?.type;
      if (/^r20_[a-z0-9_]{1,80}$/i.test(type ?? '')) firstDifferenceTypes.push(type);
    }
    changedFields.push(...cleanList(graph.changedFieldNames, /^[A-Z][A-Z0-9_]{0,63}$/));
    fieldFailures.push(...cleanList(graph.fieldSemanticFailures, /^[a-z0-9-]{1,64}$/));
    for (const traits of Object.values(graph.fieldDifferenceTraits ?? {})) {
      preservedAttributeNames.push(...cleanList([
        ...(traits?.changedStandardAttributeNames ?? []),
        ...(traits?.addedAttributeNames ?? []),
        ...(traits?.removedAttributeNames ?? []),
        ...(traits?.changedAttributeValueNames ?? []),
      ], /^[a-z_:][a-z0-9:._-]{0,63}$/i));
    }
  }
  return {
    failedWorkspaces: cleanList(failedWorkspaces, /^(?:html|css|i18n|js|worker)$/),
    firstDifferenceTypes: cleanList(firstDifferenceTypes, /^r20_[a-z0-9_]{1,80}$/i),
    changedFields: cleanList(changedFields, /^[A-Z][A-Z0-9_]{0,63}$/),
    preservedAttributeNames: cleanList(
      preservedAttributeNames,
      /^[a-z_:][a-z0-9:._-]{0,63}$/i,
    ),
    fieldFailures: cleanList(fieldFailures, /^[a-z0-9-]{1,64}$/),
  };
}

function collectFailedChecks(checks) {
  const failed = [];
  const fixedChecks = [
    ['mapping-accounted', checks?.mappingAccounted],
    ['semantic-roundtrip', checks?.semanticRoundtrip],
    ['preview', checks?.localPreview],
    ['preview-edit-visual', checks?.previewEditVisual],
    ['preview-edit-form', checks?.previewEditFormState],
    ['preview-edit-geometry', checks?.previewEditGeometry],
    ['runtime', checks?.runtimeClean],
    ['resources', checks?.resourceClean],
  ];
  for (const [name, value] of fixedChecks) if (value !== true) failed.push(name);
  for (const [artifact, value] of Object.entries(checks?.emitStable ?? {})) {
    if (/^(?:html|css|i18n|i18nRaw|js|worker|blockCount|graph)$/.test(artifact) && value !== true) {
      failed.push(`emit:${artifact}`);
    }
  }
  return failed.sort();
}

function signatureFor(result, envelope) {
  const compatibility = result?.compatibility === 'legacy' ? 'legacy' : 'modern';
  const graph = collectGraphTraits(envelope?.checks);
  return {
    compatibility,
    ...graph,
  };
}

function facetsFor(result, envelope) {
  return {
    diagnostics: cleanList(result?.diagnostics, /^[a-z0-9:_-]{1,80}$/),
    failedChecks: collectFailedChecks(envelope?.checks),
    runtimeIssueCategories: cleanList(
      envelope?.checks?.runtimeIssueCategories,
      /^(?:cors|csp|network|resource-load|reference-error|type-error|syntax-error|promise-rejection|other|harness-failure)$/,
    ),
    resourceIssueCategories: cleanList(
      envelope?.checks?.resourceIssueCategories,
      /^(?:request-failed|http-client|http-server|http-other|transient-abort|final-rendered|final-rendered-with-request-issues|final-render-failure|type:(?:document|font|image|manifest|media|script|stylesheet|xhr|fetch|other))$/,
    ),
  };
}

function clusterId(signature) {
  return `cluster-${createHash('sha256').update(JSON.stringify(signature)).digest('hex').slice(0, 16)}`;
}

async function mapLimit(values, concurrency, mapper) {
  const results = new Array(values.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, Math.max(1, values.length)) }, async () => {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(values[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

async function readEnvelope(cacheDir, result) {
  if (!/^cache-[a-f0-9]{32}$/.test(result?.cacheKey ?? '')) return null;
  try {
    return JSON.parse(await readFile(
      path.join(cacheDir, 'results', `${result.cacheKey}.json`),
      'utf8',
    ));
  } catch {
    return null;
  }
}

async function readIndexedAnonymousIds(cacheDir) {
  try {
    const parsed = JSON.parse(await readFile(
      path.join(cacheDir, 'corpus-private-discovery.json'),
      'utf8',
    ));
    if (!Array.isArray(parsed?.entries)) return new Set();
    const ids = new Set();
    for (const entry of parsed.entries) {
      for (const descriptor of entry?.cases ?? []) {
        if (typeof descriptor?.rootId !== 'string' || typeof descriptor?.relativeKey !== 'string') continue;
        const modes = descriptor.compatibility === 'both'
          ? ['modern', 'legacy']
          : descriptor.compatibility === 'modern' || descriptor.compatibility === 'legacy'
            ? [descriptor.compatibility]
            : [];
        for (const mode of modes) {
          ids.add(createAnonymousCaseId({
            rootId: descriptor.rootId,
            relativeKey: `${descriptor.relativeKey}\0${mode}`,
          }));
        }
      }
    }
    return ids;
  } catch {
    return new Set();
  }
}

async function buildFailureClusters({ reportDir, cacheDir }) {
  const parsed = JSON.parse(await readFile(path.join(reportDir, RESULT_FILE), 'utf8'));
  if (!Array.isArray(parsed?.results)) throw new Error('corpus results are missing or invalid');
  const failing = parsed.results.filter((result) => result?.levels?.l2 !== true);
  const rows = await mapLimit(failing, CONCURRENCY, async (result) => ({
    result,
    envelope: await readEnvelope(cacheDir, result),
  }));
  const indexedAnonymousIds = await readIndexedAnonymousIds(cacheDir);
  const clusters = new Map();
  let missingEnvelopes = 0;
  for (const { result, envelope } of rows) {
    if (!envelope) missingEnvelopes += 1;
    const signature = signatureFor(result, envelope);
    const facets = facetsFor(result, envelope);
    const id = clusterId(signature);
    const current = clusters.get(id) ?? {
      id,
      ...signature,
      diagnostics: [],
      failedChecks: [],
      runtimeIssueCategories: [],
      resourceIssueCategories: [],
      occurrences: 0,
      representatives: [],
      indexedRepresentatives: [],
    };
    current.occurrences += 1;
    current.diagnostics = cleanList(
      [...current.diagnostics, ...facets.diagnostics],
      /^[a-z0-9:_-]{1,80}$/,
    );
    current.failedChecks = cleanList(
      [...current.failedChecks, ...facets.failedChecks],
      /^(?:[a-z0-9-]+|emit:[a-zA-Z]+)$/,
    );
    current.runtimeIssueCategories = cleanList(
      [...current.runtimeIssueCategories, ...facets.runtimeIssueCategories],
      /^[a-z0-9-]{1,80}$/,
    );
    current.resourceIssueCategories = cleanList(
      [...current.resourceIssueCategories, ...facets.resourceIssueCategories],
      /^(?:[a-z0-9-]+|type:[a-z]+)$/,
    );
    if (
      /^case-[a-f0-9]{24}$/.test(result?.anonymousId ?? '')
      && current.representatives.length < 3
      && !current.representatives.includes(result.anonymousId)
    ) {
      current.representatives.push(result.anonymousId);
    }
    if (
      indexedAnonymousIds.has(result?.anonymousId)
      && current.indexedRepresentatives.length < 3
      && !current.indexedRepresentatives.includes(result.anonymousId)
    ) current.indexedRepresentatives.push(result.anonymousId);
    clusters.set(id, current);
  }
  const report = {
    version: 1,
    totalRows: parsed.results.length,
    failingRows: failing.length,
    missingEnvelopes,
    clusters: [...clusters.values()].sort(
      (left, right) => right.occurrences - left.occurrences || left.id.localeCompare(right.id),
    ),
  };
  await mkdir(reportDir, { recursive: true });
  await writeFile(path.join(reportDir, OUTPUT_FILE), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return report;
}

async function selfTest() {
  const root = path.join(REPO, '.tmp', `corpus-cluster-selftest-${randomUUID()}`);
  const reportDir = path.join(root, 'reports');
  const cacheDir = path.join(root, 'cache');
  try {
    await mkdir(path.join(cacheDir, 'results'), { recursive: true });
    const results = [0, 1].map((index) => ({
      anonymousId: `case-${String(index + 1).padStart(24, '0')}`,
      compatibility: 'modern',
      levels: { l2: false },
      diagnostics: ['html-structure'],
      cacheKey: `cache-${String(index + 1).padStart(32, '0')}`,
    }));
    await mkdir(reportDir, { recursive: true });
    await writeFile(path.join(reportDir, RESULT_FILE), JSON.stringify({ version: 1, results }), 'utf8');
    const envelope = {
      checks: {
        semanticRoundtrip: false,
        runtimeIssueCategories: ['resource-load'],
        resourceIssueCategories: ['http-client', 'type:image'],
        graphDiagnostics: {
          html: {
            pass: false,
            changedFieldNames: ['__R20_PRESERVED_ATTRS'],
            fieldSemanticFailures: ['field-value'],
            firstDifferenceNode: {
              before: { type: 'r20_text_input' },
              after: { type: 'r20_text_input' },
            },
            fieldDifferenceTraits: {
              __R20_PRESERVED_ATTRS: { changedStandardAttributeNames: ['type'] },
            },
          },
        },
      },
    };
    for (const result of results) {
      await writeFile(
        path.join(cacheDir, 'results', `${result.cacheKey}.json`),
        JSON.stringify(envelope),
        'utf8',
      );
    }
    const report = await buildFailureClusters({ reportDir, cacheDir });
    if (report.clusters.length !== 1 || report.clusters[0].occurrences !== 2) {
      throw new Error('equivalent generic failures were not clustered');
    }
    if (
      report.clusters[0].runtimeIssueCategories.join(',') !== 'resource-load'
      || report.clusters[0].resourceIssueCategories.join(',') !== 'http-client,type:image'
    ) throw new Error('privacy-safe runtime/resource categories were not retained');
    const text = await readFile(path.join(reportDir, OUTPUT_FILE), 'utf8');
    if (text.includes(root) || text.includes('corpus-cluster-selftest')) {
      throw new Error('cluster report leaked its local execution path');
    }
    console.log('corpus failure cluster self-test PASS');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--self-test')) return selfTest();
  const configPath = path.resolve(argOf(args, '--config', DEFAULT_CONFIG));
  const report = await buildFailureClusters(await loadLocalPaths(configPath));
  console.log(JSON.stringify({
    totalRows: report.totalRows,
    failingRows: report.failingRows,
    missingEnvelopes: report.missingEnvelopes,
    clusterCount: report.clusters.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exitCode = 1;
});
