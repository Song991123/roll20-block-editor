import assert from 'node:assert/strict';
import {
  CORPUS_DIAGNOSTIC_CATEGORIES,
  assertPersistableCorpusCaseResult,
  classifyDiagnosticCategory,
  createAnonymousCaseId,
  createCombinedInputHash,
  createCorpusCacheKey,
  normalizeCorpusCaseResult,
  selectRepresentativeSetCover,
} from './lib/corpus_harness_core.mjs';

const firstId = createAnonymousCaseId({ rootId: 'corpus-01', relativeKey: 'private-key-a' });
const repeatedId = createAnonymousCaseId({ rootId: 'corpus-01', relativeKey: 'private-key-a' });
const secondId = createAnonymousCaseId({ rootId: 'corpus-01', relativeKey: 'private-key-b' });
assert.equal(firstId, repeatedId);
assert.notEqual(firstId, secondId);
assert.match(firstId, /^case-[a-f0-9]{24}$/);
assert.equal(firstId.includes('private'), false);
assert.equal(firstId.includes('corpus-01'), false);

const htmlBytes = Buffer.from('<main></main>', 'utf8');
const cssBytes = new Uint8Array(Buffer.from('main{}', 'utf8'));
const inputHash = createCombinedInputHash([
  { type: 'html', bytes: htmlBytes },
  { type: 'css', bytes: cssBytes },
]);
assert.equal(inputHash, createCombinedInputHash([
  { type: 'html', bytes: Buffer.from(htmlBytes) },
  { type: 'css', bytes: Buffer.from(cssBytes) },
]));
assert.notEqual(inputHash, createCombinedInputHash([
  { type: 'css', bytes: Buffer.from(cssBytes) },
  { type: 'html', bytes: Buffer.from(htmlBytes) },
]));
assert.notEqual(inputHash, createCombinedInputHash([
  { type: 'markup', bytes: Buffer.from(htmlBytes) },
  { type: 'css', bytes: Buffer.from(cssBytes) },
]));

const modernCacheKey = createCorpusCacheKey({
  inputHash,
  gitSha: '0123456789abcdef',
  mode: 'modern',
  harnessVersion: 1,
});
const legacyCacheKey = createCorpusCacheKey({
  inputHash,
  gitSha: '0123456789abcdef',
  mode: 'legacy',
  harnessVersion: 1,
});
assert.match(modernCacheKey, /^cache-[a-f0-9]{32}$/);
assert.notEqual(modernCacheKey, legacyCacheKey);
assert.throws(
  () => createCorpusCacheKey({ inputHash, gitSha: '0123456789abcdef', mode: 'modern' }),
  /harnessVersion/,
);

const diagnosticSamples = new Map([
  ['bad HTML nesting', 'html-structure'],
  ['CSS declaration parse failed', 'css-parser'],
  ['selector specificity mismatch', 'selector'],
  ['translation i18n key missing', 'translation'],
  ['default attr initial state mismatch', 'default-state'],
  ['image asset resource failed', 'asset'],
  ['rolltemplate chat card mismatch', 'rolltemplate'],
  ['sheet worker setAttrs failed', 'worker'],
  ['legacy sanitize prefix transform failed', 'legacy-transform'],
  ['page exception', 'runtime'],
]);
for (const [message, expected] of diagnosticSamples) {
  assert.equal(classifyDiagnosticCategory(message), expected);
}
assert.deepEqual([...diagnosticSamples.values()].sort(), [...CORPUS_DIAGNOSTIC_CATEGORIES].sort());

function makeResult({ anonymousId, compatibility, features, diagnostics = [] }) {
  return normalizeCorpusCaseResult({
    anonymousId,
    compatibility,
    inputHash,
    features,
    levels: { l0: true, l1: true },
    mapping: { structured: 2, rawPreserved: 1, unexplainedDrops: 0 },
    runtime: { consoleErrors: 0, pageErrors: 0, resourceWarnings: 1 },
    diagnostics,
    cacheKey: modernCacheKey,
  });
}

const normalized = makeResult({
  anonymousId: firstId,
  compatibility: 'both',
  features: ['worker', 'html-table', 'worker'],
  diagnostics: ['C:\\private\\sheet.html failed to parse', 'selector specificity mismatch'],
});
assert.deepEqual(normalized.features, ['html-table', 'worker']);
assert.deepEqual(normalized.levels, { l0: true, l1: true, l2: false, l3: false, l4: false });
assert.deepEqual(normalized.diagnostics, ['html-structure', 'selector']);
assert.equal(JSON.stringify(normalized).includes('private'), false);
assert.equal(assertPersistableCorpusCaseResult(normalized), true);
assert.throws(
  () => assertPersistableCorpusCaseResult({
    ...normalized,
    diagnostics: ['C:\\private\\sheet.html failed to parse'],
  }),
  /complete and normalized/,
);

assert.throws(
  () => normalizeCorpusCaseResult({ ...normalized, sourcePath: 'hidden' }),
  /forbidden field/,
);
assert.throws(
  () => normalizeCorpusCaseResult({ ...normalized, name: 'hidden' }),
  /forbidden field/,
);
assert.throws(
  () => normalizeCorpusCaseResult({ ...normalized, sourceUrl: 'https:\/\/example.invalid' }),
  /forbidden field/,
);
assert.throws(
  () => normalizeCorpusCaseResult({ ...normalized, mapping: { ...normalized.mapping, filePath: 'hidden' } }),
  /forbidden field/,
);
assert.throws(
  () => normalizeCorpusCaseResult({ ...normalized, features: ['C:\\private\\sheet'] }),
  /generic token/,
);

const idA = createAnonymousCaseId({ rootId: 'corpus-01', relativeKey: 'a' });
const idB = createAnonymousCaseId({ rootId: 'corpus-01', relativeKey: 'b' });
const idC = createAnonymousCaseId({ rootId: 'corpus-01', relativeKey: 'c' });
const candidates = [
  makeResult({ anonymousId: idA, compatibility: 'modern', features: ['html-table', 'selector'] }),
  makeResult({ anonymousId: idB, compatibility: 'both', features: ['html-table', 'worker'] }),
  makeResult({ anonymousId: idC, compatibility: 'legacy', features: ['selector', 'translation'] }),
];
const cover = selectRepresentativeSetCover(candidates);
assert.deepEqual(cover.selectedAnonymousIds, [idB, idC]);
assert.deepEqual(cover.uncoveredTokens, []);
assert.deepEqual(cover, selectRepresentativeSetCover([...candidates].reverse()));
assert.deepEqual(cover.universe, [
  'compatibility:legacy',
  'compatibility:modern',
  'feature:html-table',
  'feature:selector',
  'feature:translation',
  'feature:worker',
]);

console.log('corpus harness core self-test PASS');
