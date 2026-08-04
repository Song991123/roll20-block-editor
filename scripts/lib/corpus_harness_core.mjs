import { createHash } from 'node:crypto';

export const CORPUS_COMPATIBILITY_MODES = Object.freeze(['modern', 'legacy', 'both']);

export const CORPUS_DIAGNOSTIC_CATEGORIES = Object.freeze([
  'html-structure',
  'css-parser',
  'selector',
  'translation',
  'default-state',
  'asset',
  'rolltemplate',
  'worker',
  'legacy-transform',
  'runtime',
]);

const TOP_LEVEL_KEYS = Object.freeze([
  'anonymousId',
  'compatibility',
  'inputHash',
  'features',
  'levels',
  'mapping',
  'runtime',
  'diagnostics',
  'cacheKey',
]);
const LEVEL_KEYS = Object.freeze(['l0', 'l1', 'l2', 'l3', 'l4']);
const MAPPING_KEYS = Object.freeze(['structured', 'rawPreserved', 'unexplainedDrops']);
const RUNTIME_KEYS = Object.freeze(['consoleErrors', 'pageErrors', 'resourceWarnings']);
const GENERIC_TOKEN_PATTERN = /^[a-z0-9][a-z0-9._:-]{0,79}$/;
const ANONYMOUS_ID_PATTERN = /^case-[a-f0-9]{24}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const CACHE_KEY_PATTERN = /^cache-[a-f0-9]{32}$/;

function compareText(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function assertPlainObject(value, label) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be a plain object`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${label} must be a plain object`);
  }
}

function assertAllowedKeys(value, allowedKeys, label) {
  assertPlainObject(value, label);
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      throw new TypeError(`${label} contains a forbidden field`);
    }
  }
}

function assertNonEmptyString(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string`);
  }
  return value;
}

function assertGenericToken(value, label) {
  if (typeof value !== 'string' || !GENERIC_TOKEN_PATTERN.test(value)) {
    throw new TypeError(`${label} must be a generic token`);
  }
  return value;
}

function assertNonNegativeInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${label} must be a non-negative safe integer`);
  }
  return value;
}

function toByteBuffer(value) {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) {
    return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  }
  if (value instanceof ArrayBuffer) return Buffer.from(value);
  throw new TypeError('input bytes must be Buffer, Uint8Array, or ArrayBuffer');
}

function updateFramed(hash, label, value) {
  const labelBytes = Buffer.from(label, 'utf8');
  const valueBytes = Buffer.isBuffer(value) ? value : Buffer.from(String(value), 'utf8');
  const lengths = Buffer.allocUnsafe(16);
  lengths.writeBigUInt64BE(BigInt(labelBytes.length), 0);
  lengths.writeBigUInt64BE(BigInt(valueBytes.length), 8);
  hash.update(lengths);
  hash.update(labelBytes);
  hash.update(valueBytes);
}

function normalizeBooleanRecord(value, keys, label) {
  const source = value ?? {};
  assertAllowedKeys(source, keys, label);
  return Object.fromEntries(keys.map((key) => [key, Boolean(source[key])]));
}

function normalizeIntegerRecord(value, keys, label) {
  const source = value ?? {};
  assertAllowedKeys(source, keys, label);
  return Object.fromEntries(
    keys.map((key) => [key, assertNonNegativeInteger(source[key] ?? 0, `${label}.${key}`)]),
  );
}

function compatibilityCoverage(mode) {
  if (mode === 'both') return ['compatibility:legacy', 'compatibility:modern'];
  return [`compatibility:${mode}`];
}

export function createAnonymousCaseId({ rootId, relativeKey }) {
  const hash = createHash('sha256');
  updateFramed(hash, 'domain', 'roll20-corpus-case-id-v1');
  updateFramed(hash, 'root-id', assertNonEmptyString(rootId, 'rootId'));
  updateFramed(hash, 'relative-key', assertNonEmptyString(relativeKey, 'relativeKey'));
  return `case-${hash.digest('hex').slice(0, 24)}`;
}

export function createCombinedInputHash(inputs) {
  if (!Array.isArray(inputs) || inputs.length === 0) {
    throw new TypeError('inputs must be a non-empty ordered array');
  }

  const hash = createHash('sha256');
  updateFramed(hash, 'domain', 'roll20-corpus-input-v1');
  for (const input of inputs) {
    assertAllowedKeys(input, ['type', 'bytes'], 'input');
    const type = assertGenericToken(input.type, 'input.type');
    const bytes = toByteBuffer(input.bytes);
    updateFramed(hash, 'input-type', type);
    updateFramed(hash, 'input-bytes', bytes);
  }
  return hash.digest('hex');
}

export function createCorpusCacheKey({ inputHash, gitSha, mode, harnessVersion }) {
  if (typeof inputHash !== 'string' || !SHA256_PATTERN.test(inputHash)) {
    throw new TypeError('inputHash must be a lowercase SHA-256 hex digest');
  }
  if (!CORPUS_COMPATIBILITY_MODES.includes(mode) || mode === 'both') {
    throw new TypeError('mode must be modern or legacy');
  }
  if (
    (typeof harnessVersion !== 'string' && typeof harnessVersion !== 'number')
    || String(harnessVersion).length === 0
  ) {
    throw new TypeError('harnessVersion must be a non-empty string or number');
  }

  const hash = createHash('sha256');
  updateFramed(hash, 'domain', 'roll20-corpus-cache-v1');
  updateFramed(hash, 'input-hash', inputHash);
  updateFramed(hash, 'git-sha', assertNonEmptyString(gitSha, 'gitSha'));
  updateFramed(hash, 'mode', mode);
  updateFramed(hash, 'harness-version', String(harnessVersion));
  return `cache-${hash.digest('hex').slice(0, 32)}`;
}

export function classifyDiagnosticCategory(diagnostic) {
  const explicitCategory = diagnostic && typeof diagnostic === 'object'
    ? diagnostic.category
    : null;
  if (CORPUS_DIAGNOSTIC_CATEGORIES.includes(explicitCategory)) return explicitCategory;

  const text = String(
    diagnostic && typeof diagnostic === 'object'
      ? diagnostic.code ?? diagnostic.message ?? ''
      : diagnostic ?? '',
  ).toLowerCase();

  if (/legacy|sanitize|prefix transform|autoprefix/.test(text)) return 'legacy-transform';
  if (/rolltemplate|roll template|chat card|result card/.test(text)) return 'rolltemplate';
  if (/sheet worker|worker|on\s*\(|setattrs?|getattrs?|action button/.test(text)) return 'worker';
  if (/translation|i18n|data-i18n|language json|locale/.test(text)) return 'translation';
  if (/default attr|default value|initial state|initial value|checked state|selected state/.test(text)) {
    return 'default-state';
  }
  if (/asset|image|font|resource|data url|url\s*\(/.test(text)) return 'asset';
  if (/selector|specificity|cascade|pseudo-class|pseudo-element/.test(text)) return 'selector';
  if (/css|stylesheet|declaration|at-rule|property value/.test(text)) return 'css-parser';
  if (/html|markup|dom|tag|nesting|tree structure/.test(text)) return 'html-structure';
  return 'runtime';
}

export function normalizeCorpusCaseResult(value) {
  assertAllowedKeys(value, TOP_LEVEL_KEYS, 'CorpusCaseResult');

  if (typeof value.anonymousId !== 'string' || !ANONYMOUS_ID_PATTERN.test(value.anonymousId)) {
    throw new TypeError('anonymousId must be an anonymous case ID');
  }
  if (!CORPUS_COMPATIBILITY_MODES.includes(value.compatibility)) {
    throw new TypeError('compatibility must be modern, legacy, or both');
  }
  if (typeof value.inputHash !== 'string' || !SHA256_PATTERN.test(value.inputHash)) {
    throw new TypeError('inputHash must be a lowercase SHA-256 hex digest');
  }
  if (typeof value.cacheKey !== 'string' || !CACHE_KEY_PATTERN.test(value.cacheKey)) {
    throw new TypeError('cacheKey must be an anonymous cache key');
  }

  const features = value.features ?? [];
  if (!Array.isArray(features)) throw new TypeError('features must be an array');
  const normalizedFeatures = [...new Set(
    features.map((feature) => assertGenericToken(feature, 'feature')),
  )].sort(compareText);

  const diagnostics = value.diagnostics ?? [];
  if (!Array.isArray(diagnostics)) throw new TypeError('diagnostics must be an array');
  const normalizedDiagnostics = [...new Set(
    diagnostics.map((diagnostic) => classifyDiagnosticCategory(diagnostic)),
  )].sort(compareText);

  return {
    anonymousId: value.anonymousId,
    compatibility: value.compatibility,
    inputHash: value.inputHash,
    features: normalizedFeatures,
    levels: normalizeBooleanRecord(value.levels, LEVEL_KEYS, 'levels'),
    mapping: normalizeIntegerRecord(value.mapping, MAPPING_KEYS, 'mapping'),
    runtime: normalizeIntegerRecord(value.runtime, RUNTIME_KEYS, 'runtime'),
    diagnostics: normalizedDiagnostics,
    cacheKey: value.cacheKey,
  };
}

export function assertPersistableCorpusCaseResult(value) {
  const normalized = normalizeCorpusCaseResult(value);
  const hasAllKeys = (record, keys) => keys.every((key) => Object.hasOwn(record, key));
  if (
    !hasAllKeys(value, TOP_LEVEL_KEYS)
    || !hasAllKeys(value.levels, LEVEL_KEYS)
    || !hasAllKeys(value.mapping, MAPPING_KEYS)
    || !hasAllKeys(value.runtime, RUNTIME_KEYS)
    || value.features.some((feature, index) => feature !== normalized.features[index])
    || value.features.length !== normalized.features.length
    || value.diagnostics.some((diagnostic, index) => diagnostic !== normalized.diagnostics[index])
    || value.diagnostics.length !== normalized.diagnostics.length
  ) {
    throw new TypeError('persisted CorpusCaseResult must be complete and normalized');
  }
  return true;
}

export function selectRepresentativeSetCover(values) {
  if (!Array.isArray(values)) throw new TypeError('values must be an array');
  const cases = values.map((value) => normalizeCorpusCaseResult(value));
  const seenIds = new Set();
  for (const item of cases) {
    if (seenIds.has(item.anonymousId)) throw new TypeError('anonymousId must be unique');
    seenIds.add(item.anonymousId);
  }

  const coverageById = new Map(cases.map((item) => [
    item.anonymousId,
    new Set([
      ...item.features.map((feature) => `feature:${feature}`),
      ...compatibilityCoverage(item.compatibility),
    ]),
  ]));
  const universe = [...new Set([...coverageById.values()].flatMap((tokens) => [...tokens]))]
    .sort(compareText);
  const uncovered = new Set(universe);
  const remaining = [...cases].sort((left, right) => compareText(left.anonymousId, right.anonymousId));
  const selectedAnonymousIds = [];

  while (uncovered.size > 0) {
    let bestIndex = -1;
    let bestScore = 0;
    for (let index = 0; index < remaining.length; index += 1) {
      const score = [...coverageById.get(remaining[index].anonymousId)]
        .filter((token) => uncovered.has(token)).length;
      if (score > bestScore) {
        bestIndex = index;
        bestScore = score;
      }
    }
    if (bestIndex === -1) break;

    const [selected] = remaining.splice(bestIndex, 1);
    selectedAnonymousIds.push(selected.anonymousId);
    for (const token of coverageById.get(selected.anonymousId)) uncovered.delete(token);
  }

  return {
    selectedAnonymousIds,
    universe,
    coveredTokens: universe.filter((token) => !uncovered.has(token)),
    uncoveredTokens: [...uncovered].sort(compareText),
  };
}
