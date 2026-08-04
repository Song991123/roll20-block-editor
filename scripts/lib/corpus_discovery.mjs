import { createHash } from 'node:crypto';
import { lstat, readFile, readdir, realpath, stat } from 'node:fs/promises';
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from 'node:path';

const COMPATIBILITY_MODES = new Set(['modern', 'legacy', 'both', 'auto']);
const HTML_EXTENSIONS = new Set(['.html', '.htm']);
const CSS_EXTENSIONS = new Set(['.css']);
const JAVASCRIPT_EXTENSIONS = new Set(['.js', '.mjs', '.cjs']);
const JSON_EXTENSIONS = new Set(['.json']);
const TEXT_SOURCE_EXTENSIONS = new Set(['.txt']);
const RASTER_IMAGE_EXTENSIONS = new Set([
  '.avif',
  '.bmp',
  '.gif',
  '.jpeg',
  '.jpg',
  '.png',
  '.webp',
]);
const COMPATIBILITY_METADATA_NAMES = new Set([
  'compatibility.json',
  'manifest.json',
  'roll20.json',
  'roll20-compatibility.json',
  'roll20-manifest.json',
  'sheet.json',
  'sheet-manifest.json',
]);
const DEFAULT_MAX_TEXT_BYTES = 16 * 1024 * 1024;

const HTML_TAG_FAMILIES = new Map([
  ['layout', new Set(['article', 'aside', 'div', 'footer', 'header', 'main', 'nav', 'section'])],
  ['inline', new Set(['a', 'b', 'em', 'i', 'label', 'small', 'span', 'strong'])],
  ['heading', new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])],
  ['list', new Set(['dd', 'dl', 'dt', 'li', 'ol', 'ul'])],
  ['table', new Set(['caption', 'col', 'colgroup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr'])],
  ['form', new Set(['fieldset', 'form', 'legend'])],
  ['control', new Set(['button', 'input', 'meter', 'optgroup', 'option', 'output', 'progress', 'select', 'textarea'])],
  ['media', new Set(['audio', 'canvas', 'img', 'picture', 'source', 'video'])],
  ['template', new Set(['rolltemplate', 'template'])],
  ['script', new Set(['script'])],
]);

const WORKER_API_FEATURES = [
  ['worker:api:event-listener', /\bon\s*\(/i],
  ['worker:api:get-attrs', /\bgetAttrs\s*\(/i],
  ['worker:api:set-attrs', /\bsetAttrs\s*\(/i],
  ['worker:api:get-section-ids', /\bgetSectionIDs\s*\(/i],
  ['worker:api:remove-repeating-row', /\bremoveRepeatingRow\s*\(/i],
  ['worker:api:generate-row-id', /\bgenerateRowID\s*\(/i],
  ['worker:api:set-section-order', /\bsetSectionOrder\s*\(/i],
  ['worker:api:translation', /\b(?:getTranslationByKey|getTranslationLanguage)\s*\(/i],
  ['worker:api:custom-roll', /\b(?:startRoll|finishRoll)\s*\(/i],
];

const CSS_AT_RULE_FEATURES = new Map([
  ['media', 'css:at-rule:media'],
  ['supports', 'css:at-rule:supports'],
  ['container', 'css:at-rule:container'],
  ['layer', 'css:at-rule:layer'],
  ['keyframes', 'css:at-rule:keyframes'],
  ['-webkit-keyframes', 'css:at-rule:keyframes'],
  ['import', 'css:at-rule:import'],
  ['font-face', 'css:at-rule:font-face'],
  ['page', 'css:at-rule:page'],
]);

/**
 * Validate and normalize local corpus roots without touching their contents.
 */
export function validateCorpusRoots(roots, { baseDir = process.cwd() } = {}) {
  if (!Array.isArray(roots) || roots.length === 0) {
    throw new TypeError('corpus roots must be a non-empty array');
  }

  const ids = new Set();
  return roots.map((root, index) => {
    if (!root || typeof root !== 'object' || Array.isArray(root)) {
      throw new TypeError(`corpus root ${index} must be an object`);
    }

    const id = typeof root.id === 'string' ? root.id.trim() : '';
    const sourcePath = typeof root.path === 'string' ? root.path.trim() : '';
    const mode = typeof root.mode === 'string' ? root.mode.trim().toLowerCase() : '';

    if (!/^[a-z0-9][a-z0-9._-]{0,63}$/i.test(id)) {
      throw new TypeError(`corpus root ${index} has an invalid generic id`);
    }
    if (ids.has(id)) {
      throw new TypeError(`corpus root ${index} repeats an id`);
    }
    if (!sourcePath) {
      throw new TypeError(`corpus root ${index} has an invalid path`);
    }
    if (!COMPATIBILITY_MODES.has(mode)) {
      throw new TypeError(`corpus root ${index} has an invalid mode`);
    }

    ids.add(id);
    return {
      id,
      path: resolve(baseDir, sourcePath),
      mode,
    };
  });
}

/**
 * Resolve an explicit mode. Auto remains both unless trusted generic metadata
 * provides one unambiguous compatibility value.
 */
export function resolveCompatibilityMode(mode, evidence = []) {
  const normalizedMode = typeof mode === 'string' ? mode.trim().toLowerCase() : '';
  if (!COMPATIBILITY_MODES.has(normalizedMode)) {
    throw new TypeError('invalid compatibility mode');
  }
  if (normalizedMode !== 'auto') return normalizedMode;

  const values = new Set(
    (Array.isArray(evidence) ? evidence : [evidence])
      .map((value) => (typeof value === 'string' ? value.trim().toLowerCase() : ''))
      .filter((value) => value === 'modern' || value === 'legacy' || value === 'both'),
  );

  if (values.size !== 1 || values.has('both')) return 'both';
  return values.values().next().value;
}

/**
 * Discover cases under read-only roots. Returned descriptors intentionally
 * contain private absolute paths; pass them through sanitizeCorpusCase before
 * writing any report.
 */
export async function discoverCorpusCases(roots, options = {}) {
  const normalizedRoots = validateCorpusRoots(roots, options);
  const maxTextBytes = normalizeMaxTextBytes(options.maxTextBytes);
  const cases = [];
  const diagnostics = new Set();

  for (const root of normalizedRoots) {
    const rootResult = await discoverRoot(root, { maxTextBytes });
    rootResult.diagnostics.forEach((category) => diagnostics.add(category));
    cases.push(...rootResult.cases);
  }

  cases.sort((left, right) =>
    compareText(left.rootId, right.rootId) || compareText(left.relativeKey, right.relativeKey),
  );

  return {
    cases,
    diagnostics: [...diagnostics].sort(compareText),
  };
}

/**
 * Extract only generic capability flags. No source token, selector, attribute
 * value, translation key, URL, or visible text is returned.
 */
export function extractGenericFeatures({
  html = [],
  css = [],
  javascript = [],
  translations = [],
} = {}) {
  const features = new Set();
  const htmlTexts = normalizeTextList(html);
  const cssTexts = normalizeTextList(css);
  const javascriptTexts = normalizeTextList(javascript);
  const translationTexts = normalizeTextList(translations);

  for (const text of htmlTexts) {
    const tags = collectTagNames(text);
    for (const [family, familyTags] of HTML_TAG_FAMILIES) {
      if ([...tags].some((tag) => familyTags.has(tag))) {
        features.add(`html:tag-family:${family}`);
      }
    }

    if (tags.has('table') || tags.has('tr') || tags.has('td') || tags.has('th')) {
      features.add('html:table');
    }
    if (tags.has('form') || tags.has('fieldset')) {
      features.add('html:form');
    }
    if (
      tags.has('input') ||
      tags.has('select') ||
      tags.has('textarea') ||
      tags.has('button')
    ) {
      features.add('html:input-controls');
    }
    if (/\btype\s*=\s*["']roll["']/i.test(text)) {
      features.add('html:roll-button');
    }
    if (/\btype\s*=\s*["'](?:checkbox|radio)["']/i.test(text)) {
      features.add('html:state-controls');
    }
    if (/<fieldset\b[^>]*\bclass\s*=\s*["'][^"']*\brepeating_[a-z0-9-]+/i.test(text)) {
      features.add('html:repeating-section');
    }
    if (/<rolltemplate\b/i.test(text)) {
      features.add('html:rolltemplate');
    }
    if (/\bdata-i18n(?:-[a-z0-9-]+)?\s*=/i.test(text)) {
      features.add('translation:html-token');
    }
    if (/<script\b[^>]*\btype\s*=\s*["']text\/worker["']/i.test(text)) {
      features.add('worker:inline-source');
    }
    collectAssetFeatures(text, features);
  }

  for (const text of cssTexts) {
    for (const match of text.matchAll(/@(-?[a-z][\w-]*)/gi)) {
      const atRule = match[1].toLowerCase();
      features.add(CSS_AT_RULE_FEATURES.get(atRule) ?? 'css:at-rule:other');
    }
    if (/--[a-z_][\w-]*\s*:/i.test(text) || /var\(\s*--[\w-]+/i.test(text)) {
      features.add('css:custom-properties');
    }
    if (/url\(\s*["']?data:/i.test(text)) {
      features.add('css:data-url');
    }
    if (/\.sheet-rolltemplate-|\brolltemplate\b/i.test(text)) {
      features.add('css:rolltemplate');
    }
    if (/\brepeating_[a-z0-9-]+\b/i.test(text)) {
      features.add('css:repeating-section');
    }
    collectAssetFeatures(text, features);
  }

  const workerTexts = [...htmlTexts, ...javascriptTexts];
  if (javascriptTexts.some((text) => text.trim().length > 0)) {
    features.add('javascript:external-source');
  }
  for (const [feature, pattern] of WORKER_API_FEATURES) {
    if (workerTexts.some((text) => pattern.test(text))) {
      features.add(feature);
    }
  }
  if (WORKER_API_FEATURES.some(([, pattern]) => workerTexts.some((text) => pattern.test(text)))) {
    features.add('worker:api-source');
  }
  if (workerTexts.some((text) => /\brepeating_[a-z0-9-]+\b/i.test(text))) {
    features.add('worker:repeating-section');
  }

  for (const text of translationTexts) {
    const parsed = parseJsonObject(text);
    if (parsed && isFlatScalarMap(parsed)) {
      features.add('translation:flat-map');
    } else if (text.trim()) {
      features.add('translation:source');
    }
  }

  return [...features].sort(compareText);
}

export function createAnonymousCaseId(caseDescriptor, namespace = 'corpus-harness-v1') {
  assertPrivateDescriptor(caseDescriptor);
  const digest = createHash('sha256')
    .update(String(namespace))
    .update('\0')
    .update(caseDescriptor.rootId)
    .update('\0')
    .update(caseDescriptor.relativeKey)
    .digest('hex')
    .slice(0, 20);
  return `case-${digest}`;
}

/**
 * Remove all source identity and exact counts before report serialization.
 */
export function sanitizeCorpusCase(caseDescriptor, { anonymousId } = {}) {
  assertPrivateDescriptor(caseDescriptor);
  const safeId = anonymousId ?? createAnonymousCaseId(caseDescriptor);
  if (!/^case-[a-z0-9-]{8,80}$/i.test(safeId)) {
    throw new TypeError('anonymousId must be a generic case id');
  }

  return {
    anonymousId: safeId,
    compatibility: caseDescriptor.compatibility,
    artifacts: {
      html: caseDescriptor.htmlPaths.length > 0,
      css: caseDescriptor.cssPaths.length > 0,
      translation: caseDescriptor.translationPaths.length > 0,
      javascript: caseDescriptor.javascriptPaths.length > 0,
      worker: caseDescriptor.workerPaths.length > 0 || caseDescriptor.features.includes('worker:inline-source'),
      rasterAsset: caseDescriptor.assetImagePaths.length > 0,
      referenceImage: caseDescriptor.referenceImagePaths.length > 0,
    },
    features: [...new Set(caseDescriptor.features)].sort(compareText),
    diagnostics: [...new Set(caseDescriptor.diagnostics.map(normalizeDiagnosticCategory))]
      .filter(Boolean)
      .sort(compareText),
  };
}

export function sanitizeDiscoveryResult(discoveryResult, options = {}) {
  if (!discoveryResult || !Array.isArray(discoveryResult.cases)) {
    throw new TypeError('invalid discovery result');
  }
  return {
    cases: discoveryResult.cases.map((caseDescriptor) => sanitizeCorpusCase(caseDescriptor, options)),
    diagnostics: [...new Set((discoveryResult.diagnostics ?? []).map(normalizeDiagnosticCategory))]
      .filter(Boolean)
      .sort(compareText),
  };
}

async function discoverRoot(root, { maxTextBytes }) {
  const diagnostics = new Set();
  const walked = await walkReadOnly(root.path, diagnostics);
  if (!walked) return { cases: [], diagnostics };

  const files = walked.files;
  const textSourceKinds = await classifyTextSourceFiles(
    filterByExtensions(files, TEXT_SOURCE_EXTENSIONS),
    diagnostics,
    maxTextBytes,
  );
  const htmlCandidatePaths = files.filter((filePath) =>
    HTML_EXTENSIONS.has(extname(filePath).toLowerCase()) || textSourceKinds.get(filePath) === 'html',
  );
  const manifestEntries = await readManifestEntries(files, diagnostics, maxTextBytes);
  const manifestDirectories = new Set(manifestEntries.keys());
  const candidateDirectories = new Set(manifestDirectories);
  for (const filePath of htmlCandidatePaths) {
    if (!findNearestCaseDirectory(root.path, dirname(filePath), manifestDirectories)) {
      candidateDirectories.add(dirname(filePath));
    }
  }
  const candidateDirectoryList = [...candidateDirectories].sort((left, right) =>
    compareText(toRelativeKey(root.path, left), toRelativeKey(root.path, right)),
  );
  const ownedFiles = new Map(candidateDirectoryList.map((directoryPath) => [directoryPath, []]));

  for (const filePath of files) {
    const owner = findNearestCaseDirectory(root.path, dirname(filePath), candidateDirectories);
    if (owner) ownedFiles.get(owner).push(filePath);
  }

  const cases = [];
  for (const casePath of candidateDirectoryList) {
    const ownedCaseFiles = ownedFiles.get(casePath).sort(compareText);
    const allHtmlPaths = ownedCaseFiles
      .filter((filePath) =>
        HTML_EXTENSIONS.has(extname(filePath).toLowerCase()) || textSourceKinds.get(filePath) === 'html',
      )
      .sort(compareText);
    const allCssPaths = ownedCaseFiles
      .filter((filePath) =>
        CSS_EXTENSIONS.has(extname(filePath).toLowerCase()) || textSourceKinds.get(filePath) === 'css',
      )
      .sort(compareText);
    const manifestEntry = manifestEntries.get(casePath) ?? null;
    const variants = manifestEntry
      ? [{
          relativeKey: toRelativeKey(root.path, casePath),
          htmlPaths: selectManifestArtifactPaths(casePath, manifestEntry.value.html, allHtmlPaths),
          cssPaths: selectManifestArtifactPaths(casePath, manifestEntry.value.css, allCssPaths),
          explicitReferencePaths: selectManifestArtifactPaths(
            casePath,
            manifestEntry.value.preview,
            filterByExtensions(ownedCaseFiles, RASTER_IMAGE_EXTENSIONS),
            { fallback: false },
          ),
        }]
      : allHtmlPaths.map((htmlPath) => ({
          relativeKey: toRelativeKey(root.path, htmlPath),
          htmlPaths: [htmlPath],
          cssPaths: selectAssociatedCssPaths(htmlPath, allCssPaths),
          explicitReferencePaths: [],
        }));

    for (const variant of variants) {
    const caseDiagnostics = new Set();
    const caseFiles = ownedFiles.get(casePath).sort(compareText);
    const htmlPaths = variant.htmlPaths;
    const cssPaths = variant.cssPaths;
    const javascriptPaths = caseFiles
      .filter((filePath) =>
        JAVASCRIPT_EXTENSIONS.has(extname(filePath).toLowerCase())
        || textSourceKinds.get(filePath) === 'javascript',
      )
      .sort(compareText);
    const jsonPaths = filterByExtensions(caseFiles, JSON_EXTENSIONS);
    const imagePaths = filterByExtensions(caseFiles, RASTER_IMAGE_EXTENSIONS);

    const htmlEntries = await readTextEntries(htmlPaths, 'html', caseDiagnostics, maxTextBytes);
    const cssEntries = await readTextEntries(cssPaths, 'css', caseDiagnostics, maxTextBytes);
    const javascriptEntries = await readTextEntries(
      javascriptPaths,
      'javascript',
      caseDiagnostics,
      maxTextBytes,
    );
    const jsonEntries = await readTextEntries(jsonPaths, 'json', caseDiagnostics, maxTextBytes);

    const translationPaths = jsonEntries
      .filter((entry) => isTranslationJson(entry.path, entry.text))
      .map((entry) => entry.path)
      .sort(compareText);
    const translationPathSet = new Set(translationPaths);
    const translationEntries = jsonEntries.filter((entry) => translationPathSet.has(entry.path));
    const workerPaths = javascriptEntries
      .filter((entry) => hasWorkerApiMarker(entry.text))
      .map((entry) => entry.path)
      .sort(compareText);

    const evidence = collectCompatibilityEvidence(jsonEntries, caseDiagnostics);
    const compatibility = resolveCompatibilityMode(root.mode, evidence);
    if (root.mode === 'auto' && evidence.length > 1 && new Set(evidence).size > 1) {
      caseDiagnostics.add('compatibility:conflicting-metadata');
    }

    const referencedImages = collectReferencedLocalImages(
      [...htmlEntries, ...cssEntries],
      imagePaths,
    );
    const explicitReferenceSet = new Set(variant.explicitReferencePaths);
    const referenceImagePaths = imagePaths
      .filter(
        (imagePath) =>
          explicitReferenceSet.has(imagePath)
          || (
            !referencedImages.has(normalizeComparablePath(imagePath))
            && isGenericReferenceImageName(basename(imagePath))
          ),
      )
      .sort(compareText);
    const referenceImageSet = new Set(referenceImagePaths);
    const assetImagePaths = imagePaths
      .filter((imagePath) => !referenceImageSet.has(imagePath))
      .sort(compareText);

    const features = extractGenericFeatures({
      html: htmlEntries.map((entry) => entry.text),
      css: cssEntries.map((entry) => entry.text),
      javascript: javascriptEntries.map((entry) => entry.text),
      translations: translationEntries.map((entry) => entry.text),
    });
    if (assetImagePaths.length > 0) features.push('asset:raster-file');
    if (referenceImagePaths.length > 0) features.push('reference:raster-image');

    cases.push({
      rootId: root.id,
      sourceMode: root.mode,
      compatibility,
      rootPath: root.path,
      casePath,
      relativeKey: variant.relativeKey,
      htmlPaths,
      cssPaths,
      translationPaths,
      javascriptPaths,
      workerPaths,
      imagePaths,
      assetImagePaths,
      referenceImagePaths,
      features: [...new Set(features)].sort(compareText),
      diagnostics: [...caseDiagnostics].sort(compareText),
    });
    }
  }

  return { cases, diagnostics };
}

async function readManifestEntries(files, diagnostics, maxTextBytes) {
  const manifestPaths = files
    .filter((filePath) => basename(filePath).toLowerCase() === 'sheet.json')
    .sort(compareText);
  const entries = new Map();
  for (const filePath of manifestPaths) {
    try {
      const fileStats = await stat(filePath);
      if (fileStats.size > maxTextBytes) {
        diagnostics.add('compatibility:manifest-too-large');
        continue;
      }
      const value = parseJsonObject(await readFile(filePath, 'utf8'));
      if (!value || (!Object.hasOwn(value, 'html') && !Object.hasOwn(value, 'css'))) continue;
      entries.set(dirname(filePath), { path: filePath, value });
    } catch {
      diagnostics.add('compatibility:invalid-metadata');
    }
  }
  return entries;
}

async function classifyTextSourceFiles(paths, diagnostics, maxTextBytes) {
  const kinds = new Map();
  for (const filePath of paths) {
    try {
      const fileStats = await stat(filePath);
      if (fileStats.size > maxTextBytes) continue;
      const text = await readFile(filePath, 'utf8');
      const kind = classifyTextSource(text);
      if (kind) kinds.set(filePath, kind);
    } catch {
      diagnostics.add('read:unreadable:text-source');
    }
  }
  return kinds;
}

function classifyTextSource(text) {
  const value = String(text || '');
  const tagCount = [...value.matchAll(/<\s*[a-z][\w:-]*(?:\s|>|\/)/gi)].length;
  if (
    tagCount >= 3
    || (tagCount > 0 && /\b(?:name\s*=\s*["']attr_|type\s*=\s*["']roll["']|data-i18n)\b/i.test(value))
  ) return 'html';
  if (hasWorkerApiMarker(value)) return 'javascript';
  const cssRuleCount = [...value.matchAll(/[^{}]+\{[^{}]*:[^{}]*\}/g)].length;
  if (cssRuleCount >= 2 || /@(?:media|supports|container|layer|keyframes|font-face)\b/i.test(value)) {
    return 'css';
  }
  return null;
}

function selectManifestArtifactPaths(casePath, manifestValue, candidates, { fallback = true } = {}) {
  const values = Array.isArray(manifestValue) ? manifestValue : [manifestValue];
  const candidateMap = new Map(candidates.map((filePath) => [normalizeComparablePath(filePath), filePath]));
  const selected = [];
  for (const value of values) {
    if (typeof value !== 'string' || !value.trim()) continue;
    const resolved = normalizeComparablePath(resolve(casePath, value));
    const candidate = candidateMap.get(resolved);
    if (candidate && !selected.includes(candidate)) selected.push(candidate);
  }
  return selected.length > 0
    ? selected.sort(compareText)
    : fallback
      ? [...candidates].sort(compareText)
      : [];
}

function selectAssociatedCssPaths(htmlPath, cssPaths) {
  if (cssPaths.length <= 1) return [...cssPaths];
  const htmlStem = artifactStem(htmlPath);
  const matching = cssPaths.filter((cssPath) => artifactStem(cssPath) === htmlStem);
  return matching.length > 0 ? matching.sort(compareText) : [...cssPaths];
}

function artifactStem(filePath) {
  return basename(filePath, extname(filePath))
    .toLowerCase()
    .replace(/html|css/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

async function walkReadOnly(rootPath, diagnostics) {
  let rootStats;
  try {
    rootStats = await lstat(rootPath);
  } catch (error) {
    diagnostics.add(error?.code === 'ENOENT' ? 'root:not-found' : 'root:unreadable');
    return null;
  }
  if (rootStats.isSymbolicLink()) {
    diagnostics.add('root:symlink-skipped');
    return null;
  }
  if (!rootStats.isDirectory()) {
    diagnostics.add('root:not-directory');
    return null;
  }

  const files = [];
  const visitedDirectories = new Set();
  const stack = [rootPath];

  while (stack.length > 0) {
    const directoryPath = stack.pop();
    let canonicalDirectory;
    try {
      canonicalDirectory = await realpath(directoryPath);
    } catch {
      diagnostics.add('directory:unreadable');
      continue;
    }
    const comparableDirectory = normalizeComparablePath(canonicalDirectory);
    if (visitedDirectories.has(comparableDirectory)) {
      diagnostics.add('directory:cycle-skipped');
      continue;
    }
    visitedDirectories.add(comparableDirectory);

    let entries;
    try {
      entries = await readdir(directoryPath, { withFileTypes: true });
    } catch {
      diagnostics.add('directory:unreadable');
      continue;
    }
    entries.sort((left, right) => compareText(left.name, right.name));

    const childDirectories = [];
    for (const entry of entries) {
      const entryPath = resolve(directoryPath, entry.name);
      if (entry.isSymbolicLink()) {
        diagnostics.add('entry:symlink-skipped');
      } else if (entry.isDirectory()) {
        childDirectories.push(entryPath);
      } else if (entry.isFile()) {
        files.push(entryPath);
      }
    }
    for (let index = childDirectories.length - 1; index >= 0; index -= 1) {
      stack.push(childDirectories[index]);
    }
  }

  files.sort(compareText);
  return { files };
}

async function readTextEntries(paths, artifact, diagnostics, maxTextBytes) {
  const entries = [];
  for (const filePath of paths) {
    try {
      const fileStats = await stat(filePath);
      if (fileStats.size > maxTextBytes) {
        diagnostics.add(`read:too-large:${artifact}`);
        continue;
      }
      entries.push({ path: filePath, text: await readFile(filePath, 'utf8') });
    } catch {
      diagnostics.add(`read:unreadable:${artifact}`);
    }
  }
  return entries;
}

function collectCompatibilityEvidence(jsonEntries, diagnostics) {
  const evidence = [];
  for (const entry of jsonEntries) {
    if (!COMPATIBILITY_METADATA_NAMES.has(basename(entry.path).toLowerCase())) continue;
    const parsed = parseJsonObject(entry.text);
    if (!parsed) {
      diagnostics.add('compatibility:invalid-metadata');
      continue;
    }
    const value = compatibilityFromMetadata(parsed);
    if (value) evidence.push(value);
  }
  return evidence.sort(compareText);
}

function compatibilityFromMetadata(metadata) {
  const candidates = [
    metadata.roll20Compatibility,
    metadata.roll20Mode,
    metadata.compatibility,
    metadata.roll20?.compatibility,
    metadata.roll20?.mode,
  ];
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const normalized = candidate.trim().toLowerCase();
    if (normalized === 'modern' || normalized === 'legacy' || normalized === 'both') {
      return normalized;
    }
  }
  if (typeof metadata.legacy === 'boolean') {
    return metadata.legacy ? 'legacy' : 'modern';
  }
  if (typeof metadata.legacy === 'string' && /^(?:true|false)$/i.test(metadata.legacy.trim())) {
    return metadata.legacy.trim().toLowerCase() === 'true' ? 'legacy' : 'modern';
  }
  return null;
}

function collectReferencedLocalImages(textEntries, imagePaths) {
  const imageSet = new Set(imagePaths.map(normalizeComparablePath));
  const imagesByFileName = new Map();
  for (const imagePath of imagePaths) {
    const key = normalizeComparableFileName(basename(imagePath));
    const paths = imagesByFileName.get(key) ?? [];
    paths.push(normalizeComparablePath(imagePath));
    imagesByFileName.set(key, paths);
  }
  const referenced = new Set();
  for (const entry of textEntries) {
    for (const reference of extractAssetReferences(entry.text)) {
      const fileName = localReferenceFileName(reference);
      if (fileName) {
        for (const matchingPath of imagesByFileName.get(normalizeComparableFileName(fileName)) ?? []) {
          referenced.add(matchingPath);
        }
      }
      const localPath = resolveLocalAssetReference(entry.path, reference);
      if (!localPath) continue;
      const comparablePath = normalizeComparablePath(localPath);
      if (imageSet.has(comparablePath)) referenced.add(comparablePath);
    }
  }
  return referenced;
}

function extractAssetReferences(text) {
  const values = [];
  for (const match of text.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/gi)) {
    values.push(match[2]);
  }
  for (const match of text.matchAll(
    /\b(?:src|href|poster|background)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`=<>]+))/gi,
  )) {
    values.push(match[1] ?? match[2] ?? match[3]);
  }
  for (const match of text.matchAll(
    /\bsrcset\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`=<>]+))/gi,
  )) {
    const sourceSet = match[1] ?? match[2] ?? match[3] ?? '';
    for (const candidate of sourceSet.split(',')) {
      const value = candidate.trim().split(/\s+/)[0];
      if (value) values.push(value);
    }
  }
  return values;
}

function resolveLocalAssetReference(sourcePath, rawReference) {
  let reference = String(rawReference ?? '').trim();
  if (!reference || reference.startsWith('#')) return null;
  if (/^(?:data|https?|blob|javascript):/i.test(reference) || reference.startsWith('//')) return null;
  reference = reference.split('#', 1)[0].split('?', 1)[0].trim();
  if (!reference || reference.startsWith('/')) return null;
  try {
    reference = decodeURIComponent(reference);
  } catch {
    return null;
  }
  return resolve(dirname(sourcePath), reference.replaceAll('/', sep));
}

function localReferenceFileName(rawReference) {
  let reference = String(rawReference ?? '').trim();
  if (
    !reference ||
    reference.startsWith('#') ||
    /^(?:data|https?|blob|javascript):/i.test(reference) ||
    reference.startsWith('//')
  ) {
    return null;
  }
  reference = reference.split('#', 1)[0].split('?', 1)[0].trim();
  if (!reference) return null;
  try {
    reference = decodeURIComponent(reference);
  } catch {
    return null;
  }
  return reference.replaceAll('\\', '/').split('/').filter(Boolean).at(-1) ?? null;
}

function collectAssetFeatures(text, features) {
  for (const reference of extractAssetReferences(text)) {
    const normalized = String(reference).trim();
    if (/^data:/i.test(normalized)) {
      features.add('asset:data-url');
    } else if (/^(?:https?:)?\/\//i.test(normalized)) {
      features.add('asset:remote-url');
    } else if (normalized && !normalized.startsWith('#')) {
      features.add('asset:local-reference');
    }
  }
}

function isTranslationJson(filePath, text) {
  const name = basename(filePath).toLowerCase();
  if (COMPATIBILITY_METADATA_NAMES.has(name)) return false;
  const stem = name.replace(/\.json$/i, '');
  const pathHint = /(?:^|[\\/])(i18n|lang|locale|localization|translation|translations)(?:[\\/]|$)/i.test(
    dirname(filePath),
  );
  const nameHint = /(?:^|[-_.])(i18n|lang|locale|localization|translation|translations)(?:[-_.]|$)/i.test(
    stem,
  );
  const localeHint = /^[a-z]{2,3}(?:[-_][a-z0-9]{2,8})?$/i.test(stem);
  const parsed = parseJsonObject(text);
  return Boolean(parsed && isFlatScalarMap(parsed) && (pathHint || nameHint || localeHint));
}

function isFlatScalarMap(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const entries = Object.entries(value);
  return (
    entries.length > 0 &&
    entries.every(([, item]) => item === null || ['string', 'number', 'boolean'].includes(typeof item))
  );
}

function parseJsonObject(text) {
  try {
    const value = JSON.parse(text);
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

function hasWorkerApiMarker(text) {
  return WORKER_API_FEATURES.some(([, pattern]) => pattern.test(text));
}

function collectTagNames(text) {
  const tags = new Set();
  for (const match of text.matchAll(/<\s*([a-z][\w:-]*)\b/gi)) {
    tags.add(match[1].toLowerCase());
  }
  return tags;
}

function isGenericReferenceImageName(fileName) {
  const stem = fileName.replace(/\.[^.]+$/, '').toLowerCase();
  return /(?:^|[-_.\s])(preview|reference|screenshot|screen[-_.\s]?shot|capture)(?:[-_.\s]|$)/i.test(
    stem,
  );
}

function findNearestCaseDirectory(rootPath, startPath, candidateDirectories) {
  let cursor = startPath;
  while (isWithinRoot(rootPath, cursor)) {
    if (candidateDirectories.has(cursor)) return cursor;
    const parent = dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }
  return null;
}

function isWithinRoot(rootPath, candidatePath) {
  const rel = relative(rootPath, candidatePath);
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel));
}

function filterByExtensions(paths, extensions) {
  return paths.filter((filePath) => extensions.has(extname(filePath).toLowerCase())).sort(compareText);
}

function toRelativeKey(rootPath, casePath) {
  const value = relative(rootPath, casePath);
  return value ? value.split(sep).join('/') : '.';
}

function normalizeComparablePath(filePath) {
  const normalized = resolve(filePath);
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

function normalizeComparableFileName(fileName) {
  return process.platform === 'win32' ? fileName.toLowerCase() : fileName;
}

function normalizeTextList(value) {
  const values = Array.isArray(value) ? value : [value];
  return values.filter((item) => typeof item === 'string');
}

function normalizeDiagnosticCategory(value) {
  if (typeof value !== 'string') return '';
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9:-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeMaxTextBytes(value) {
  if (value == null) return DEFAULT_MAX_TEXT_BYTES;
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError('maxTextBytes must be a positive safe integer');
  }
  return value;
}

function assertPrivateDescriptor(value) {
  if (
    !value ||
    typeof value !== 'object' ||
    typeof value.rootId !== 'string' ||
    typeof value.relativeKey !== 'string' ||
    !Array.isArray(value.htmlPaths) ||
    !Array.isArray(value.features) ||
    !Array.isArray(value.diagnostics)
  ) {
    throw new TypeError('invalid private corpus case descriptor');
  }
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}
