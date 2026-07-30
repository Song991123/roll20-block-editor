#!/usr/bin/env node
/**
 * Generate a local-only browser snippet for Roll20 Custom Sheet Sandbox upload.
 *
 * This avoids browser file-chooser automation without bypassing Roll20's upload
 * handler. The generated snippet must be run only in the dedicated Roll20
 * Custom Sheet Sandbox editor/settings page, where it creates File objects and
 * dispatches the same delegated change handler used by a manual file choice.
 */

import { existsSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const positionalArgs = args.filter((arg) => !arg.startsWith('--'));
const [RUN_DIR_ARG, ONLY] = parseArgs(positionalArgs);
const RUN_ROOT = path.resolve('reports/roll20-actual-compare');
const SELF_TEST = args.includes('--self-test');
const APPLY_SETTINGS = args.includes('--apply-settings');
const SINGLE_PASS_UPLOAD = args.includes('--single-pass-upload');
const ENDPOINT_CAMPAIGN_ID = readOptionValue(args, '--endpoint-campaign-id') || '';
const EXPECTED_RUNTIME_MODE = readOptionValue(args, '--expected-runtime-mode') || 'auto';
const OUT_DIR_ARG = readOptionValue(args, '--out-dir') || '';
const PAYLOAD_DIR_ARG = readOptionValue(args, '--payload-dir') || '';

if (SELF_TEST) {
  runSelfTest();
} else {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

function parseArgs(rawArgs) {
  const first = rawArgs[0] ?? '';
  const second = rawArgs[1] ?? '';
  if (!first) return ['', ''];
  const looksLikePath = first.includes('/') || first.includes('\\') || first.startsWith('.') || existsSync(first);
  if (looksLikePath) return [first, second];
  return ['', first];
}

function readOptionValue(rawArgs, name) {
  const exact = rawArgs.indexOf(name);
  if (exact >= 0) return rawArgs[exact + 1] || '';
  const prefix = `${name}=`;
  const match = rawArgs.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : '';
}

async function main() {
  const directPayloadDir = PAYLOAD_DIR_ARG ? path.resolve(PAYLOAD_DIR_ARG) : '';
  const runDir = directPayloadDir || (RUN_DIR_ARG ? path.resolve(RUN_DIR_ARG) : await findLatestPreuploadRun());
  const baselineDir = path.join(runDir, 'local-baseline');
  if (!directPayloadDir && !existsSync(baselineDir)) throw new Error(`missing local baseline folder: ${baselineDir}`);

  const fixtureIds = directPayloadDir
    ? ['anonymous-payload']
    : (await fs.readdir(baselineDir, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((fixtureId) => !ONLY || fixtureId === ONLY)
      .sort((a, b) => a.localeCompare(b));
  if (!fixtureIds.length) throw new Error(`no matching fixture found${ONLY ? `: ${ONLY}` : ''}`);

  const outDir = OUT_DIR_ARG
    ? path.resolve(OUT_DIR_ARG)
    : path.join(runDir, 'roll20-upload-handoff', 'snippets');
  await fs.mkdir(outDir, { recursive: true });

  const entries = [];
  for (const fixtureId of fixtureIds) {
    entries.push(await writeFixtureSnippet(runDir, fixtureId, outDir, {
      applySettings: APPLY_SETTINGS,
      resumeUpload: !SINGLE_PASS_UPLOAD,
      endpointCampaignId: ENDPOINT_CAMPAIGN_ID,
      expectedRuntimeMode: EXPECTED_RUNTIME_MODE,
      payloadDir: directPayloadDir,
    }));
  }

  const report = {
    generatedAt: new Date().toISOString(),
    runDir,
    payloadDir: directPayloadDir || null,
    privacy: 'local-only ignored report; do not commit generated snippets because they embed source-derived payloads',
    scope: 'Custom Sheet Sandbox upload helper only; not Roll20 visual parity evidence',
    entries,
  };
  await fs.writeFile(path.join(outDir, 'roll20-upload-snippets.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(path.join(outDir, 'README.md'), renderReadme(report), 'utf8');
  console.log(JSON.stringify({
    outDir,
    runDir,
    entries: entries.length,
    applySettings: APPLY_SETTINGS,
    endpointCampaignId: ENDPOINT_CAMPAIGN_ID || null,
    expectedRuntimeMode: EXPECTED_RUNTIME_MODE,
    resumeUpload: !SINGLE_PASS_UPLOAD,
    outputOverride: OUT_DIR_ARG ? outDir : null,
    snippets: entries.map((entry) => entry.snippetRelativePath),
    activationCheckSnippets: entries.map((entry) => entry.activationCheckSnippetRelativePath),
  }, null, 2));
}

async function findLatestPreuploadRun() {
  if (!existsSync(RUN_ROOT)) throw new Error(`missing Roll20 actual-compare report root: ${RUN_ROOT}`);
  const entries = await fs.readdir(RUN_ROOT, { withFileTypes: true });
  const candidates = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const runDir = path.join(RUN_ROOT, entry.name);
    const preuploadJson = path.join(runDir, 'preupload-verification', 'preupload-verification-results.json');
    const baselineDir = path.join(runDir, 'local-baseline');
    if (!existsSync(preuploadJson) || !existsSync(baselineDir)) continue;
    try {
      const report = JSON.parse(await fs.readFile(preuploadJson, 'utf8'));
      if (report.pass) {
        const stat = await fs.stat(preuploadJson);
        candidates.push({ runDir, mtimeMs: stat.mtimeMs });
      }
    } catch {
      // Ignore malformed local reports.
    }
  }
  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
  if (!candidates[0]) throw new Error(`no PASS pre-upload run found under ${RUN_ROOT}; pass an explicit run folder`);
  return candidates[0].runDir;
}

async function writeFixtureSnippet(runDir, fixtureId, outDir, options = {}) {
  const payloadDir = options.payloadDir || path.join(runDir, 'local-baseline', fixtureId, 'payload');
  const files = {
    html: path.join(payloadDir, 'sheet.html'),
    css: path.join(payloadDir, 'sheet.css'),
    translation: path.join(payloadDir, 'translation.json'),
    manifest: path.join(payloadDir, 'sheet.json'),
  };
  for (const [label, file] of Object.entries(files).filter(([label]) => label !== 'manifest')) {
    if (!existsSync(file)) throw new Error(`missing ${label} payload file for ${fixtureId}: ${file}`);
  }

  const payload = {};
  for (const [label, file] of Object.entries(files).filter(([label]) => label !== 'manifest')) {
    const bytes = await fs.readFile(file);
    payload[label] = {
      name: path.basename(file),
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      base64: bytes.toString('base64'),
    };
  }
  const manifestText = existsSync(files.manifest)
    ? await fs.readFile(files.manifest, 'utf8')
    : buildDirectPayloadManifest(options.expectedRuntimeMode);
  const manifestBytes = Buffer.from(manifestText, 'utf8');
  payload.manifest = {
    name: 'sheet.json',
    bytes: manifestBytes.length,
    sha256: createHash('sha256').update(manifestBytes).digest('hex'),
    base64: manifestBytes.toString('base64'),
  };
  const sourceTexts = {
    html: await fs.readFile(files.html, 'utf8'),
    css: await fs.readFile(files.css, 'utf8'),
    translation: await fs.readFile(files.translation, 'utf8'),
    manifest: manifestText,
  };
  const validation = {
    translation: validateJsonPayload(sourceTexts.translation, 'translation.json'),
    manifest: validateJsonPayload(sourceTexts.manifest, 'sheet.json'),
  };
  validation.settingsFieldManifest = validateSettingsFieldManifest(sourceTexts.manifest);
  const activationHints = extractActivationHints(sourceTexts);
  const expectedRuntimeMode = resolveExpectedRuntimeMode(
    sourceTexts.manifest,
    options.expectedRuntimeMode,
  );

  const snippet = renderSnippet({
    fixtureId,
    payload,
    validation,
    activationHints,
    options: { ...options, expectedRuntimeMode },
  });
  const snippetFile = path.join(outDir, `${safeName(fixtureId)}-upload-snippet.js`);
  await fs.writeFile(snippetFile, snippet, 'utf8');
  const activationCheckSnippet = renderActivationCheckSnippet({
    fixtureId,
    activationHints,
    expectedRuntimeMode,
  });
  const activationCheckFile = path.join(outDir, `${safeName(fixtureId)}-activation-check-snippet.js`);
  await fs.writeFile(activationCheckFile, activationCheckSnippet, 'utf8');

  return {
    fixtureId,
    snippetPath: snippetFile,
    snippetRelativePath: path.relative(process.cwd(), snippetFile),
    activationCheckSnippetPath: activationCheckFile,
    activationCheckSnippetRelativePath: path.relative(process.cwd(), activationCheckFile),
    options: {
      applySettings: Boolean(options.applySettings),
      resumeUpload: options.resumeUpload !== false,
      endpointCampaignId: options.endpointCampaignId || '',
      expectedRuntimeMode,
    },
    payloadBytes: Object.fromEntries(Object.entries(payload).map(([key, item]) => [key, item.bytes])),
    payloadSha256: Object.fromEntries(Object.entries(payload).map(([key, item]) => [key, item.sha256])),
    activationHints,
    validation,
  };
}

function buildDirectPayloadManifest(expectedRuntimeMode = 'modern') {
  return `${JSON.stringify({
    html: 'sheet.html',
    css: 'sheet.css',
    translations: 'translation.json',
    legacy: expectedRuntimeMode === 'legacy',
    useroptions: [],
    name: 'Anonymous Sandbox Payload',
    short_name: 'anonymous-sandbox',
    authors: 'Local verification',
  }, null, 2)}\n`;
}

function resolveExpectedRuntimeMode(manifestText, requestedMode = 'auto') {
  if (requestedMode === 'modern' || requestedMode === 'legacy') return requestedMode;
  if (requestedMode !== 'auto') {
    throw new Error(`invalid --expected-runtime-mode: ${requestedMode}; use auto, modern, or legacy`);
  }
  const parsed = JSON.parse(manifestText);
  const legacy = parsed?.jsoninfo?.legacy ?? parsed?.legacy;
  return legacy === true ? 'legacy' : 'modern';
}

function validateJsonPayload(text, label) {
  try {
    const parsed = JSON.parse(text);
    return {
      ok: true,
      label,
      topLevelType: Array.isArray(parsed) ? 'array' : typeof parsed,
      keyCount: parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? Object.keys(parsed).length : 0,
    };
  } catch (error) {
    return {
      ok: false,
      label,
      error: String(error?.message || error),
    };
  }
}

function validateSettingsFieldManifest(manifestText) {
  try {
    const text = buildSettingsManifestText(manifestText);
    const parsed = JSON.parse(text);
    return {
      ok: true,
      longName: parsed?.sheet?.long_name ?? parsed?.long_name ?? parsed?.name ?? '',
      shortName: parsed?.sheet?.short_name ?? parsed?.short_name ?? '',
      hasJsonInfo: Boolean(parsed?.jsoninfo),
      shape: parsed?.jsoninfo ? 'wrapped-jsoninfo' : 'plain-sheet-json',
      userOptionsType: Array.isArray(parsed?.userOptions)
        ? 'array'
        : Array.isArray(parsed?.useroptions)
          ? 'array'
          : typeof (parsed?.userOptions ?? parsed?.useroptions),
    };
  } catch (error) {
    return {
      ok: false,
      error: String(error?.message || error),
    };
  }
}

function buildSettingsManifestText(manifestText) {
  const parsed = JSON.parse(manifestText);
  if (parsed && typeof parsed === 'object' && parsed.jsoninfo) {
    return JSON.stringify(parsed, null, 2);
  }
  const userOptions = parsed.useroptions || parsed.userOptions || [];
  return JSON.stringify({
    sheet: {
      short_name: parsed.short_name || 'custom',
      long_name: parsed.long_name || parsed.name || 'Custom Sheet',
      instructions: parsed.instructions || '',
      preview_image: parsed.preview_image || 'https://via.placeholder.com/500x650.png?text=Placeholder+Image',
      authors: parsed.authors || 'Local verification',
    },
    userOptions,
    jsoninfo: parsed,
  }, null, 2);
}

function extractActivationHints(sourceTexts) {
  const combined = `${sourceTexts.html}\n${sourceTexts.css}\n${sourceTexts.translation}\n${sourceTexts.manifest}`;
  const html = sourceTexts.html;
  return {
    rolltemplateClasses: uniqueMatches(combined, /\b(?:sheet-)?rolltemplate-[a-z0-9_-]+\b/gi, 24),
    rollButtonNames: uniqueMatches(html, /\bname\s*=\s*["'](roll_[^"']+)["']/gi, 32, 1),
    attrNames: uniqueMatches(html, /\bname\s*=\s*["'](attr_[^"']+)["']/gi, 32, 1),
    textTokens: extractVisibleTextTokens(html, sourceTexts.translation, 48),
  };
}

function uniqueMatches(text, regex, limit, group = 0) {
  const seen = new Set();
  const values = [];
  for (const match of text.matchAll(regex)) {
    const value = String(match[group] ?? '').trim();
    if (!value || seen.has(value.toLowerCase())) continue;
    seen.add(value.toLowerCase());
    values.push(value);
    if (values.length >= limit) break;
  }
  return values;
}

function extractVisibleTextTokens(html, translation, limit) {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ');
  const visibleText = withoutScripts
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:nbsp|amp|lt|gt|quot|#39);/g, ' ');
  const translationText = safeTranslationValues(translation).join(' ');
  const stop = new Set([
    'class',
    'sheet',
    'type',
    'value',
    'name',
    'input',
    'button',
    'hidden',
    'roll',
    'text',
    'label',
    'span',
    'div',
    'attr',
  ]);
  const seen = new Set();
  const tokens = [];
  for (const token of `${visibleText} ${translationText}`.split(/[^\p{L}\p{N}_-]+/u)) {
    const clean = token.trim();
    if (clean.length < 4 || clean.length > 40) continue;
    if (/^(attr_|roll_|sheet_|repeating_)/i.test(clean)) continue;
    if (/^[0-9_-]+$/.test(clean)) continue;
    if (stop.has(clean.toLowerCase())) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tokens.push(clean);
    if (tokens.length >= limit) break;
  }
  return tokens;
}

function safeTranslationValues(text) {
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return [];
    return Object.values(parsed)
      .filter((value) => typeof value === 'string')
      .slice(0, 120);
  } catch {
    return [];
  }
}

function renderActivationCheckSnippet({ fixtureId, activationHints, expectedRuntimeMode = 'modern' }) {
  const literal = JSON.stringify({ fixtureId, activationHints, expectedRuntimeMode }, null, 2);
  return `// Roll20 Custom Sheet Sandbox editor activation checker for ${fixtureId}
// Local-only generated snippet. Run on https://app.roll20.net/editor after
// upload/settings save and reload. It does not prove visual parity; it only
// proves whether expected fixture markers are visible enough to proceed.
(() => {
  const DATA = ${literal};
  const rolltemplateClasses = DATA.activationHints.rolltemplateClasses || [];
  const rollButtonNames = DATA.activationHints.rollButtonNames || [];
  const attrNames = DATA.activationHints.attrNames || [];
  const textTokens = DATA.activationHints.textTokens || [];
  const readRuntimeMode = () => {
    const currentSheet = window.CharacterSheetsManagerSingleton?.getCurrentCustomSheet?.();
    const legacy = currentSheet?.d20?.journal?.legacySanitization
      ?? window.d20?.journal?.legacySanitization
      ?? null;
    const observedMode = legacy === true ? 'legacy' : legacy === false ? 'modern' : 'unknown';
    return {
      expectedMode: DATA.expectedRuntimeMode,
      observedMode,
      legacySanitization: legacy,
      matches: observedMode === 'unknown' ? null : observedMode === DATA.expectedRuntimeMode,
    };
  };
  const normalize = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
  const isVisible = (el) => {
    if (!el) return false;
    const rect = el.getBoundingClientRect?.();
    const style = el.ownerDocument?.defaultView?.getComputedStyle(el);
    return Boolean(rect && rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0');
  };
  const round = (value) => Math.round(Number(value || 0) * 1000) / 1000;
  const summarizeElement = (el, rootRect, index = null) => {
    if (!el) return null;
    const rect = el.getBoundingClientRect?.();
    const style = el.ownerDocument?.defaultView?.getComputedStyle(el);
    if (!rect || !style) return null;
    return {
      index,
      tag: el.tagName,
      id: el.id || '',
      className: typeof el.className === 'string' ? el.className : '',
      name: el.getAttribute?.('name') || '',
      type: el.getAttribute?.('type') || '',
      rect: {
        left: round(rect.left - rootRect.left),
        top: round(rect.top - rootRect.top),
        width: round(rect.width),
        height: round(rect.height),
      },
      style: {
        display: style.display,
        position: style.position,
        boxSizing: style.boxSizing,
        width: style.width,
        height: style.height,
        minHeight: style.minHeight,
        maxHeight: style.maxHeight,
        margin: style.margin,
        padding: style.padding,
        border: style.border,
        borderCollapse: style.borderCollapse,
        borderSpacing: style.borderSpacing,
        tableLayout: style.tableLayout,
        verticalAlign: style.verticalAlign,
        cssFloat: style.cssFloat,
        whiteSpace: style.whiteSpace,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        lineHeight: style.lineHeight,
        overflow: style.overflow,
        overflowX: style.overflowX,
        overflowY: style.overflowY,
      },
    };
  };
  const collectRenderEvidence = (doc) => {
    const roots = Array.from(doc.querySelectorAll('.charactersheet,.charsheet'));
    const root = roots.find(isVisible) || roots[0] || null;
    if (!root) return null;
    const rootRect = root.getBoundingClientRect();
    const visibleTopLevel = Array.from(root.children).filter(isVisible);
    const topLevelChildren = visibleTopLevel
      .slice(0, 40)
      .map((el, index) => ({
        ...summarizeElement(el, rootRect, index),
        directChildren: Array.from(el.children)
          .filter(isVisible)
          .slice(0, 16)
          .map((child, childIndex) => summarizeElement(child, rootRect, childIndex)),
      }));
    const bottomRoot = visibleTopLevel.at(-1) || null;
    const bottomLayout = [];
    if (bottomRoot) {
      for (const el of bottomRoot.querySelectorAll('*')) {
        if (!isVisible(el)) continue;
        let depth = 0;
        let parent = el.parentElement;
        while (parent && parent !== bottomRoot) {
          depth += 1;
          parent = parent.parentElement;
        }
        bottomLayout.push({
          ...summarizeElement(el, rootRect, bottomLayout.length),
          depth,
          text: el.children.length === 0 ? normalize(el.textContent).slice(0, 80) : '',
        });
        if (bottomLayout.length >= 160) break;
      }
    }
    const active = doc.activeElement && root.contains(doc.activeElement)
      ? doc.activeElement
      : null;
    const attrElements = Array.from(root.querySelectorAll('[name^="attr_"]'));
    const attrGroups = new Map();
    for (const el of attrElements) {
      const name = el.getAttribute('name') || '';
      if (!attrGroups.has(name)) attrGroups.set(name, []);
      attrGroups.get(name).push(el);
    }
    const attributeState = attrNames.slice(0, 80).flatMap((name) => {
      const matches = attrGroups.get(name) || [];
      if (matches.length === 0) return [];
      const selected = [];
      const add = (el) => {
        if (el && !selected.includes(el)) selected.push(el);
      };
      add(matches.find(isVisible));
      add(matches[0]);
      for (const el of matches) {
        if (selected.length >= 3) break;
        const signature = [
          'value' in el ? String(el.value ?? '') : '',
          'checked' in el ? String(Boolean(el.checked)) : '',
          String(isVisible(el)),
        ].join('|');
        const represented = selected.some((candidate) => [
          'value' in candidate ? String(candidate.value ?? '') : '',
          'checked' in candidate ? String(Boolean(candidate.checked)) : '',
          String(isVisible(candidate)),
        ].join('|') === signature);
        if (!represented) add(el);
      }
      const visibleOccurrenceCount = matches.filter(isVisible).length;
      return selected.map((el) => ({
        ...summarizeElement(el, rootRect),
        occurrence: matches.indexOf(el),
        occurrenceCount: matches.length,
        visibleOccurrenceCount,
        visible: isVisible(el),
        value: 'value' in el ? String(el.value ?? '') : '',
        defaultValue: 'defaultValue' in el ? String(el.defaultValue ?? '') : '',
        checked: 'checked' in el ? Boolean(el.checked) : null,
        defaultChecked: 'defaultChecked' in el ? Boolean(el.defaultChecked) : null,
        disabled: Boolean(el.disabled),
      }));
    }).slice(0, 80);
    return {
      root: summarizeElement(root, rootRect),
      rootScroll: {
        width: root.scrollWidth,
        height: root.scrollHeight,
      },
      topLevelChildren,
      bottomLayout,
      focusedControl: active ? {
        ...summarizeElement(active, rootRect),
        value: 'value' in active ? String(active.value ?? '') : '',
        defaultValue: 'defaultValue' in active ? String(active.defaultValue ?? '') : '',
        checked: 'checked' in active ? Boolean(active.checked) : null,
        defaultChecked: 'defaultChecked' in active ? Boolean(active.defaultChecked) : null,
        disabled: Boolean(active.disabled),
      } : null,
      attributeState,
    };
  };
  const collectDocumentProbe = (doc, label) => {
    const bodyText = normalize(doc.body?.innerText || doc.body?.textContent || '');
    const bodyHtml = doc.body?.outerHTML || '';
    const hits = {
      rolltemplateClasses: rolltemplateClasses.filter((className) => bodyHtml.includes(className)),
      rollButtonNames: rollButtonNames.filter((name) => bodyHtml.includes(name)),
      attrNames: attrNames.filter((name) => bodyHtml.includes(name)),
      textTokens: textTokens.filter((token) => bodyText.includes(token)),
    };
    const domRolltemplateClasses = [...new Set(Array.from(doc.querySelectorAll('[class*="rolltemplate-"]'))
      .flatMap((el) => String(el.className || '').split(/\\s+/))
      .filter((className) => className.includes('rolltemplate-')))];
    return {
      label,
      bodyText,
      hits,
      visible: {
        charsheetCount: doc.querySelectorAll('.charsheet,.charactersheet').length,
        sheetformCount: doc.querySelectorAll('.sheetform').length,
        rollButtonCount: doc.querySelectorAll('button[type="roll"], button[name^="roll_"], [name^="roll_"]').length,
        attrCount: doc.querySelectorAll('[name^="attr_"]').length,
        domRolltemplateClasses: domRolltemplateClasses.slice(-20),
        bodyTextSnippet: bodyText.slice(0, 800),
      },
      renderEvidence: collectRenderEvidence(doc),
    };
  };
  const inspectSheetIframes = () => Array.from(document.querySelectorAll('iframe')).map((frame, index) => {
    const title = frame.getAttribute('title') || '';
    const src = frame.getAttribute('src') || '';
    const looksLikeSheet = /character sheet|charsheet|character/i.test(title) || /charsheet|character/i.test(src);
    const info = { index, title, src, looksLikeSheet, visible: isVisible(frame), accessible: false, probe: null };
    if (!looksLikeSheet) return info;
    try {
      const doc = frame.contentDocument || frame.contentWindow?.document;
      if (!doc) return info;
      info.accessible = true;
      info.probe = collectDocumentProbe(doc, \`iframe:\${title || index}\`);
    } catch (error) {
      info.error = String(error?.message || error);
    }
    return info;
  });
  const topProbe = collectDocumentProbe(document, 'top-document');
  const bodyText = topProbe.bodyText;
  const parseError = /"status"\\s*:\\s*"error"|unexpected token at|customcharsheet_json|sheet\\.html/i.test(bodyText)
    && /unexpected token|parse error|JSON/i.test(bodyText);
  const sheetIframes = inspectSheetIframes();
  const probes = [topProbe, ...sheetIframes.map((frame) => frame.probe).filter(Boolean)];
  const hits = Object.fromEntries(Object.keys(topProbe.hits).map((key) => [
    key,
    [...new Set(probes.flatMap((probe) => probe.hits[key] || []))],
  ]));
  const sheetHitCount = hits.rollButtonNames.length + hits.attrNames.length + hits.textTokens.length;
  const chatTemplateHitCount = hits.rolltemplateClasses.length;
  const hitCount = sheetHitCount + chatTemplateHitCount;
  const sheetIframeCount = sheetIframes.filter((frame) => frame.looksLikeSheet).length;
  const inaccessibleSheetIframeCount = sheetIframes.filter((frame) => frame.looksLikeSheet && !frame.accessible).length;
  const characterEditorCount = document.querySelectorAll('.charactereditor').length;
  const characterDialogCount = document.querySelectorAll('.characterdialog,.characterviewer').length;
  const sheetSandboxInputCount = document.querySelectorAll('#sheetHtml,#sheetCss,#sheetTranslation').length;
  const runtime = readRuntimeMode();
  const status = parseError
    ? 'ROLL20_EDITOR_PARSE_ERROR'
    : runtime.matches === false
      ? 'RUNTIME_MODE_MISMATCH'
    : sheetHitCount > 0
      ? 'VISIBLE_MATCH'
      : sheetIframeCount > 0
        ? 'SHEET_IFRAME_PRESENT_NEEDS_FRAME_PROBE'
      : characterEditorCount > 0 || characterDialogCount > 0
        ? 'CHARACTER_DIALOG_NO_SHEET_BODY'
      : chatTemplateHitCount > 0
        ? 'CHAT_TEMPLATE_ONLY'
      : sheetSandboxInputCount > 0
        ? 'SANDBOX_NO_VISIBLE_SHEET_TARGET'
      : 'NOT_PROVEN';
  const result = {
    fixtureId: DATA.fixtureId,
    status,
    href: location.href,
    title: document.title,
    runtime,
    hitCount,
    sheetHitCount,
    chatTemplateHitCount,
    hits,
    probes,
    sheetIframes,
    visible: {
      charsheetCount: topProbe.visible.charsheetCount,
      sheetformCount: topProbe.visible.sheetformCount,
      attrCount: topProbe.visible.attrCount,
      rollButtonCount: topProbe.visible.rollButtonCount,
      sheetIframeCount,
      inaccessibleSheetIframeCount,
      characterEditorCount,
      characterDialogCount,
      domRolltemplateClasses: topProbe.visible.domRolltemplateClasses,
      textchatCount: document.querySelectorAll('#textchat,.textchatcontainer').length,
      sheetSandboxInputCount,
      bodyTextSnippet: topProbe.visible.bodyTextSnippet,
    },
    nextAction: status === 'VISIBLE_MATCH'
      ? 'Expected sheet markers are visible. Capture Roll20 root/chat evidence only if the visible sheet/chat belongs to this fixture.'
      : status === 'SHEET_IFRAME_PRESENT_NEEDS_FRAME_PROBE'
        ? 'A character-sheet iframe is present, but this snippet could not prove expected markers from the top document. Use a frame-aware browser probe before deciding upload failed or before capturing evidence.'
      : status === 'CHARACTER_DIALOG_NO_SHEET_BODY'
        ? 'A character dialog is open, but expected sheet body markers are not visible. Open the character sheet iframe/tab before activation capture.'
      : status === 'CHAT_TEMPLATE_ONLY'
        ? 'Only the chat rolltemplate marker is visible. Do not capture sheet-root parity evidence until sheet body markers such as roll buttons, attrs, or expected text are visible.'
      : status === 'SANDBOX_NO_VISIBLE_SHEET_TARGET'
        ? 'The Sandbox upload controls are present, but no character-sheet surface is open. Open or create a dedicated Sandbox character sheet, then run the activation check again.'
      : status === 'ROLL20_EDITOR_PARSE_ERROR'
        ? 'Do not capture evidence. Restore the sandbox and fix the upload manifest/settings shape.'
      : status === 'RUNTIME_MODE_MISMATCH'
        ? 'Do not capture parity evidence. Match the Roll20 legacy sanitization setting to the generated sheet mode, then reload and probe again.'
        : 'Do not capture evidence yet. The editor is reachable, but expected fixture markers are not visible.',
  };
  console.log('Roll20 activation check:', result);
  return result;
})();`;
}

function renderSnippet({ fixtureId, payload, validation, activationHints, options = {} }) {
  const expectedRuntimeMode = options.expectedRuntimeMode || 'modern';
  const literal = JSON.stringify({
    fixtureId,
    payload,
    validation,
    activationHints,
    expectedRuntimeMode,
  }, null, 2);
  const applySettings = Boolean(options.applySettings);
  const resumeUpload = options.resumeUpload !== false;
  const endpointCampaignId = options.endpointCampaignId || '';
  return `// Roll20 Custom Sheet Sandbox upload helper for ${fixtureId}
// Local-only generated snippet. Do not paste this into existing real rooms.
// Run on https://app.roll20.net/editor with Sheet Sandbox Tools open, or on the
// matching Custom Sheet Sandbox settings page. It does not prove visual parity;
// capture screenshots and run the repo status/diff commands afterward.
(async () => {
  const DATA = ${literal};
  const SUBMIT_SETTINGS_FORM = ${applySettings ? 'true' : 'false'};
  const USE_ENDPOINT_FALLBACK = ${applySettings ? 'true' : 'false'};
  const RESUME_UPLOAD = ${resumeUpload ? 'true' : 'false'};
  const ENDPOINT_CAMPAIGN_ID = ${JSON.stringify(endpointCampaignId)};
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const UPLOAD_ITEMS = [
    { key: 'html', selector: '#sheetHtml', type: 'text/html', item: DATA.payload.html },
    { key: 'css', selector: '#sheetCss', type: 'text/css', item: DATA.payload.css },
    { key: 'translation', selector: '#sheetTranslation', type: 'application/json', item: DATA.payload.translation },
  ];
  const UPLOAD_STATE_KEY = 'r20-roll20-upload:' + DATA.fixtureId + ':' + [
    DATA.payload.html.sha256,
    DATA.payload.css.sha256,
    DATA.payload.translation.sha256,
  ].join(':');
  const PAGE_TOKEN = typeof performance !== 'undefined' && Number.isFinite(performance.timeOrigin)
    ? String(performance.timeOrigin)
    : 'page-' + String(Date.now());
  const defaultUploadState = () => ({ nextIndex: 0, pendingIndex: null, pendingPageToken: null, complete: false, settingsSubmitted: false });
  const readUploadState = () => {
    if (!RESUME_UPLOAD) return defaultUploadState();
    try {
      const raw = sessionStorage.getItem(UPLOAD_STATE_KEY);
      if (!raw) return defaultUploadState();
      const parsed = JSON.parse(raw);
      const nextIndex = Number.isInteger(parsed?.nextIndex) ? Math.max(0, Math.min(UPLOAD_ITEMS.length, parsed.nextIndex)) : 0;
      const pendingIndex = Number.isInteger(parsed?.pendingIndex) ? parsed.pendingIndex : null;
      const pendingPageToken = typeof parsed?.pendingPageToken === 'string' ? parsed.pendingPageToken : null;
      // A Roll20 upload commonly navigates immediately after the delegated
      // handler reads the File. A pending step therefore counts as completed
      // only when the page token changed. Re-running on the same page retries
      // the pending file instead of silently skipping a failed attachment.
      if (pendingIndex !== null && pendingIndex >= 0 && pendingIndex < UPLOAD_ITEMS.length && pendingPageToken !== PAGE_TOKEN) {
        const resumed = {
          nextIndex: Math.max(nextIndex, pendingIndex + 1),
          pendingIndex: null,
          pendingPageToken: null,
          complete: Math.max(nextIndex, pendingIndex + 1) >= UPLOAD_ITEMS.length,
          settingsSubmitted: Boolean(parsed?.settingsSubmitted),
        };
        sessionStorage.setItem(UPLOAD_STATE_KEY, JSON.stringify(resumed));
        return resumed;
      }
      return {
        nextIndex,
        pendingIndex,
        pendingPageToken,
        complete: Boolean(parsed?.complete) || nextIndex >= UPLOAD_ITEMS.length,
        settingsSubmitted: Boolean(parsed?.settingsSubmitted),
      };
    } catch {
      return defaultUploadState();
    }
  };
  const writeUploadState = (state) => {
    if (!RESUME_UPLOAD) return;
    try {
      sessionStorage.setItem(UPLOAD_STATE_KEY, JSON.stringify(state));
    } catch {
      // The upload still works when storage is unavailable; the next step then
      // requires a fresh manual invocation without resume state.
    }
  };
  const clearUploadState = () => {
    try { sessionStorage.removeItem(UPLOAD_STATE_KEY); } catch {}
  };
  const dispatchChange = (element, type) => {
    if (typeof Event !== 'function' || typeof element?.dispatchEvent !== 'function') return false;
    try {
      element.dispatchEvent(new Event(type, { bubbles: true }));
      return true;
    } catch {
      return false;
    }
  };
  const canConstructByteArray = () => {
    try {
      if (typeof Uint8Array !== 'function') return false;
      new Uint8Array(0);
      return true;
    } catch {
      return false;
    }
  };
  const bytesFromBase64 = (base64) => {
    const normalized = String(base64).replace(/[^A-Za-z0-9+/=]/g, '');
    if (!canConstructByteArray()) {
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      let binary = '';
      let buffer = 0;
      let bits = 0;
      for (const char of normalized) {
        if (char === '=') break;
        const value = alphabet.indexOf(char);
        if (value < 0) continue;
        buffer = (buffer << 6) | value;
        bits += 6;
        if (bits >= 8) {
          bits -= 8;
          binary += String.fromCharCode((buffer >> bits) & 0xff);
        }
      }
      return binary;
    }
    if (typeof atob === 'function') {
      const bin = atob(normalized);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
      return bytes;
    }
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const padding = normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0;
    const bytes = new Uint8Array(Math.max(0, Math.floor(normalized.length * 3 / 4) - padding));
    let buffer = 0;
    let bits = 0;
    let offset = 0;
    for (const char of normalized) {
      if (char === '=') break;
      const value = alphabet.indexOf(char);
      if (value < 0) continue;
      buffer = (buffer << 6) | value;
      bits += 6;
      if (bits >= 8) {
        bits -= 8;
        if (offset < bytes.length) bytes[offset] = (buffer >> bits) & 0xff;
        offset += 1;
      }
    }
    return bytes;
  };
  const textFromBytes = (bytes) => {
    if (typeof bytes === 'string') return bytes;
    if (typeof TextDecoder === 'function') return new TextDecoder().decode(bytes);
    let output = '';
    for (let i = 0; i < bytes.length;) {
      const first = bytes[i++];
      if (first < 0x80) {
        output += String.fromCharCode(first);
      } else if (first < 0xe0 && i < bytes.length) {
        output += String.fromCharCode(((first & 0x1f) << 6) | (bytes[i++] & 0x3f));
      } else if (first < 0xf0 && i + 1 < bytes.length) {
        const second = bytes[i++];
        const third = bytes[i++];
        output += String.fromCharCode(((first & 0x0f) << 12) | ((second & 0x3f) << 6) | (third & 0x3f));
      } else if (i + 2 < bytes.length) {
        const second = bytes[i++];
        const third = bytes[i++];
        const fourth = bytes[i++];
        const codePoint = ((first & 0x07) << 18) | ((second & 0x3f) << 12) | ((third & 0x3f) << 6) | (fourth & 0x3f);
        output += String.fromCodePoint(codePoint);
      }
    }
    return output;
  };
  const assertSandboxPage = () => {
    const okHost = location.hostname === 'app.roll20.net';
    const hasSandboxInputs = Boolean(document.querySelector('#sheetHtml, #sheetCss, #sheetTranslation'));
    const hasManifestTextarea = Boolean(document.querySelector('textarea[name="customcharsheet_json"], [name="customcharsheet_json"]'));
    const hasCampaignSettingsFields = Boolean(
      document.querySelector('textarea[name="customcharsheet_layout"]') &&
      document.querySelector('textarea[name="customcharsheet_style"]') &&
      document.querySelector('textarea[name="customcharsheet_translation"]'),
    );
    if (!okHost || (!hasSandboxInputs && !hasManifestTextarea && !hasCampaignSettingsFields)) {
      throw new Error('Open the Roll20 Custom Sheet Sandbox editor/tools or campaign settings page before running this snippet.');
    }
  };
  const inferCampaignId = () => {
    if (ENDPOINT_CAMPAIGN_ID) return ENDPOINT_CAMPAIGN_ID;
    const fromPath = location.pathname.match(/\\/(?:editor|settings|sheetsandbox\\/settings)\\/(\\d+)/)?.[1];
    if (fromPath) return fromPath;
    const namedInput = document.querySelector('[name="campaignid"], [name="campaign_id"]');
    if (namedInput && 'value' in namedInput && namedInput.value) return namedInput.value;
    const formAction = document.querySelector('#settingsform')?.getAttribute('action') || '';
    return formAction.match(/\\/campaigns\\/savesettings\\/(\\d+)/)?.[1] || '';
  };
  const postEndpointFallback = async () => {
    const campaignid = inferCampaignId();
    if (!campaignid) return { status: 'missing-campaign-id' };
    const postOne = async (key, item) => {
      if (typeof fetch !== 'function') {
        return {
          key,
          ok: false,
          status: 'request-primitive-unavailable',
          text: 'This connected browser evaluation surface exposes neither fetch nor XMLHttpRequest.',
        };
      }
      const body = new URLSearchParams({ campaignid, [key]: item.base64 });
      const response = await fetch('/sheetsandbox/savesheetsettings', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8' },
        body: body.toString(),
      });
      return {
        key,
        ok: response.ok,
        status: response.status,
        text: (await response.text()).slice(0, 500),
      };
    };
    const results = [
      await postOne('html', DATA.payload.html),
      await postOne('css', DATA.payload.css),
      await postOne('translation', DATA.payload.translation),
    ];
    const okCount = results.filter((item) => item.ok).length;
    const status = okCount === results.length
      ? 'posted'
      : okCount > 0
        ? 'partial'
        : results.every((item) => item.status === 'request-primitive-unavailable')
          ? 'request-primitive-unavailable'
          : 'request-failed';
    const sheetEditing = window.d20?.journal?.sheetEditing;
    let reloadTriggered = false;
    if (status === 'posted' && sheetEditing) {
      sheetEditing.reloadSheetData?.();
      sheetEditing.reloadOpenCharacters?.();
      reloadTriggered = true;
    }
    return {
      status,
      campaignid,
      transport: typeof fetch === 'function' ? 'fetch-form-urlencoded' : 'unavailable',
      reloadTriggered,
      results,
    };
  };
  const setFileInput = async (selector, item, type) => {
    const input = document.querySelector(selector);
    if (!input) return { selector, status: 'missing' };
    if (!canConstructByteArray() || typeof File !== 'function') {
      return { selector, status: 'unsupported-browser-primitive' };
    }
    const file = new File([bytesFromBase64(item.base64)], item.name, { type });
    // Some supported browser surfaces expose File but not the DataTransfer
    // constructor. The Roll20 delegated handler only needs a FileList-like
    // value with length and index access, so keep the endpoint fallback usable
    // without weakening the normal browser path.
    const transfer = typeof DataTransfer === 'function' ? new DataTransfer() : { files: [file] };
    transfer.items?.add?.(file);
    const result = {
      selector,
      status: 'pending',
      fileName: item.name,
      transferFiles: transfer.files.length,
      beforeAssignFiles: input.files?.length ?? 0,
      afterAssignFiles: 0,
      beforeDispatchFiles: 0,
      afterDispatchFiles: 0,
      afterWaitFiles: 0,
      clearedAfterDispatch: false,
    };
    try {
      input.files = transfer.files;
    } catch {
      // Some browser/page combinations expose HTMLInputElement.files as read-only.
      // Defining an own property keeps Roll20's change handlers able to read the
      // generated FileList during Custom Sheet Sandbox verification.
      Object.defineProperty(input, 'files', {
        configurable: true,
        value: transfer.files,
      });
    }
    if (!input.files?.length) {
      Object.defineProperty(input, 'files', {
        configurable: true,
        get: () => transfer.files,
      });
    }
    result.afterAssignFiles = input.files?.length ?? 0;
    result.beforeDispatchFiles = input.files?.length ?? 0;
    dispatchChange(input, 'input');
    dispatchChange(input, 'change');
    result.afterDispatchFiles = input.files?.length ?? 0;
    await sleep(1200);
    result.afterWaitFiles = input.files?.length ?? 0;
    result.clearedAfterDispatch = result.beforeDispatchFiles > 0 && result.afterWaitFiles === 0;
    result.status = result.beforeDispatchFiles > 0
      ? 'dispatched'
      : 'no-file-on-input';
    return result;
  };
  const setManifest = () => {
    const rawText = textFromBytes(bytesFromBase64(DATA.payload.manifest.base64));
    const text = buildSettingsManifest(rawText);
    const targets = Array.from(document.querySelectorAll('textarea[name="customcharsheet_json"], input[name="customcharsheet_json"]'))
      .filter((el) => !el.classList.contains('ace_text-input'));
    const editorKeys = typeof editors === 'object' && editors ? Object.keys(editors) : [];
    let aceJsonSet = false;
    for (const el of targets) {
      if ('value' in el) {
        el.value = text;
        dispatchChange(el, 'input');
        dispatchChange(el, 'change');
      }
    }
    if (typeof editors === 'object' && editors?.json && typeof editors.json.setValue === 'function') {
      editors.json.setValue(text, -1);
      if (typeof editors.json.clearSelection === 'function') editors.json.clearSelection();
      aceJsonSet = true;
    }
    return {
      status: targets.length || aceJsonSet ? 'manifest-set' : 'manifest-target-missing',
      targets: targets.length,
      aceJsonSet,
      editorKeys,
      valueLength: text.length,
    };
  };
  const inspectSandboxMessages = () => {
    const text = (document.querySelector('#sheetsandbox')?.innerText || document.body?.innerText || '').replace(/\\s+/g, ' ').trim();
    return {
      translationJsonParseError: /번역 JSON|Translation JSON|JSON을 파싱|JSON parse/i.test(text),
      roll20EditorParseError: /"status"\\s*:\\s*"error"|unexpected token at|customcharsheet_json|sheet\\.html/i.test(text)
        && /unexpected token|parse error|JSON/i.test(text),
      sandboxTextSnippet: text.slice(0, 800),
    };
  };
  const normalize = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
  const readRuntimeMode = () => {
    const currentSheet = window.CharacterSheetsManagerSingleton?.getCurrentCustomSheet?.();
    const legacy = currentSheet?.d20?.journal?.legacySanitization
      ?? window.d20?.journal?.legacySanitization
      ?? null;
    const observedMode = legacy === true ? 'legacy' : legacy === false ? 'modern' : 'unknown';
    return {
      expectedMode: DATA.expectedRuntimeMode,
      observedMode,
      legacySanitization: legacy,
      matches: observedMode === 'unknown' ? null : observedMode === DATA.expectedRuntimeMode,
    };
  };
  const isVisible = (el) => {
    if (!el) return false;
    const rect = el.getBoundingClientRect?.();
    const style = getComputedStyle(el);
    return Boolean(rect && rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0');
  };
  const collectDocumentProbe = (doc, label) => {
    const bodyText = normalize(doc.body?.innerText || doc.body?.textContent || '');
    const bodyHtml = doc.body?.outerHTML || '';
    const rolltemplateClasses = DATA.activationHints.rolltemplateClasses || [];
    const rollButtonNames = DATA.activationHints.rollButtonNames || [];
    const attrNames = DATA.activationHints.attrNames || [];
    const textTokens = DATA.activationHints.textTokens || [];
    const domRolltemplateClasses = [...new Set(Array.from(doc.querySelectorAll('[class*="rolltemplate-"]'))
      .flatMap((el) => String(el.className || '').split(/\\s+/))
      .filter((className) => className.includes('rolltemplate-')))];
    return {
      label,
      bodyText,
      hits: {
        rolltemplateClasses: rolltemplateClasses.filter((className) => bodyHtml.includes(className)),
        rollButtonNames: rollButtonNames.filter((name) => bodyHtml.includes(name)),
        attrNames: attrNames.filter((name) => bodyHtml.includes(name)),
        textTokens: textTokens.filter((token) => bodyText.includes(token)),
      },
      visible: {
        domRolltemplateClasses: domRolltemplateClasses.slice(-12),
        charsheetCount: doc.querySelectorAll('.charsheet,.charactersheet').length,
        sheetformCount: doc.querySelectorAll('.sheetform').length,
        attrCount: doc.querySelectorAll('[name^="attr_"]').length,
        rollButtonCount: doc.querySelectorAll('button[type="roll"], button[name^="roll_"], [name^="roll_"]').length,
        bodyTextSnippet: bodyText.slice(0, 600),
      },
    };
  };
  const inspectSheetIframes = () => Array.from(document.querySelectorAll('iframe')).map((frame, index) => {
    const title = frame.getAttribute('title') || '';
    const src = frame.getAttribute('src') || '';
    const looksLikeSheet = /character sheet|charsheet|character/i.test(title) || /charsheet|character/i.test(src);
    const info = { index, title, src, looksLikeSheet, visible: isVisible(frame), accessible: false, probe: null };
    if (!looksLikeSheet) return info;
    try {
      const doc = frame.contentDocument || frame.contentWindow?.document;
      if (!doc) return info;
      info.accessible = true;
      info.probe = collectDocumentProbe(doc, \`iframe:\${title || index}\`);
    } catch (error) {
      info.error = String(error?.message || error);
    }
    return info;
  });
  const collectActivationProbe = (phase) => {
    const rolltemplateClasses = DATA.activationHints.rolltemplateClasses || [];
    const rollButtonNames = DATA.activationHints.rollButtonNames || [];
    const attrNames = DATA.activationHints.attrNames || [];
    const textTokens = DATA.activationHints.textTokens || [];
    const topProbe = collectDocumentProbe(document, 'top-document');
    const sheetIframes = inspectSheetIframes();
    const probes = [topProbe, ...sheetIframes.map((frame) => frame.probe).filter(Boolean)];
    const hits = Object.fromEntries(Object.keys(topProbe.hits).map((key) => [
      key,
      [...new Set(probes.flatMap((probe) => probe.hits[key] || []))],
    ]));
    const sheetIframeCount = sheetIframes.filter((frame) => frame.looksLikeSheet).length;
    const inaccessibleSheetIframeCount = sheetIframes.filter((frame) => frame.looksLikeSheet && !frame.accessible).length;
    return {
      phase,
      runtime: readRuntimeMode(),
      expected: {
        rolltemplateClasses: rolltemplateClasses.slice(0, 16),
        rollButtonNames: rollButtonNames.slice(0, 16),
        attrNames: attrNames.slice(0, 16),
        textTokens: textTokens.slice(0, 16),
      },
      hits,
      probes,
      sheetIframes,
      visible: {
        domRolltemplateClasses: topProbe.visible.domRolltemplateClasses,
        charsheetCount: topProbe.visible.charsheetCount,
        sheetformCount: topProbe.visible.sheetformCount,
        attrCount: topProbe.visible.attrCount,
        rollButtonCount: topProbe.visible.rollButtonCount,
        sheetIframeCount,
        inaccessibleSheetIframeCount,
        characterEditorCount: document.querySelectorAll('.charactereditor').length,
        characterDialogCount: document.querySelectorAll('.characterdialog,.characterviewer').length,
        bodyTextSnippet: topProbe.visible.bodyTextSnippet,
      },
    };
  };
  const classifyActivation = (before, after, fileInputs, sandboxMessages) => {
    const hitCount = (probe) => Object.values(probe?.hits || {}).reduce((sum, values) => sum + (Array.isArray(values) ? values.length : 0), 0);
    const sheetHitCount = (probe) => (probe?.hits?.rollButtonNames?.length || 0)
      + (probe?.hits?.attrNames?.length || 0)
      + (probe?.hits?.textTokens?.length || 0);
    const chatTemplateHitCount = (probe) => probe?.hits?.rolltemplateClasses?.length || 0;
    const beforeHits = hitCount(before);
    const afterHits = hitCount(after);
    const afterSheetHits = sheetHitCount(after);
    const afterChatTemplateHits = chatTemplateHitCount(after);
    const afterSheetIframeCount = after?.visible?.sheetIframeCount || 0;
    const afterCharacterDialogCount = (after?.visible?.characterEditorCount || 0) + (after?.visible?.characterDialogCount || 0);
    const afterSandboxInputCount = after?.visible?.sheetSandboxInputCount || 0;
    const addedHits = Object.fromEntries(Object.entries(after?.hits || {}).map(([key, values]) => {
      const previous = new Set(before?.hits?.[key] || []);
      return [key, values.filter((value) => !previous.has(value))];
    }));
    const addedHitCount = Object.values(addedHits).reduce((sum, values) => sum + values.length, 0);
    const allFileInputsDispatched = fileInputs.every((item) => item.status === 'dispatched');
    const status = sandboxMessages?.roll20EditorParseError
      ? 'ROLL20_EDITOR_PARSE_ERROR'
      : after?.runtime?.matches === false
        ? 'RUNTIME_MODE_MISMATCH'
      : afterSheetHits > 0 && (addedHitCount > 0 || beforeHits === 0)
      ? 'VISIBLE_MATCH'
      : afterSheetIframeCount > 0
        ? 'SHEET_IFRAME_PRESENT_NEEDS_FRAME_PROBE'
      : afterCharacterDialogCount > 0
        ? 'CHARACTER_DIALOG_NO_SHEET_BODY'
      : afterChatTemplateHits > 0
        ? 'CHAT_TEMPLATE_ONLY'
      : afterSandboxInputCount > 0
        ? 'SANDBOX_NO_VISIBLE_SHEET_TARGET'
      : allFileInputsDispatched
        ? 'FILE_INPUTS_DISPATCHED_BUT_VISIBLE_MATCH_NOT_PROVEN'
        : 'NOT_PROVEN';
    return {
      status,
      beforeHits,
      afterHits,
      afterSheetHits,
      afterChatTemplateHits,
      addedHits,
      addedHitCount,
      runtime: after?.runtime ?? null,
      note: status === 'VISIBLE_MATCH'
        ? 'Expected sheet markers are visible after upload; still capture screenshots before claiming parity.'
        : status === 'SHEET_IFRAME_PRESENT_NEEDS_FRAME_PROBE'
          ? 'A character-sheet iframe is present, but top-document JS did not prove expected markers. Use a frame-aware browser probe before deciding upload failed or before capturing parity evidence.'
        : status === 'CHARACTER_DIALOG_NO_SHEET_BODY'
          ? 'A character dialog is open, but the expected sheet body is not visible. Open the character sheet iframe/tab before activation capture.'
        : status === 'CHAT_TEMPLATE_ONLY'
          ? 'Only rolltemplate/chat markers are visible. Do not capture sheet-root parity evidence until the sheet body exposes expected attrs, roll buttons, or text.'
        : status === 'SANDBOX_NO_VISIBLE_SHEET_TARGET'
          ? 'The Sandbox upload controls are present but no character-sheet surface is open. Open or create a dedicated Sandbox character sheet, then run the activation check again.'
        : status === 'ROLL20_EDITOR_PARSE_ERROR'
          ? 'Roll20 editor returned a parse error after upload/settings save. Do not capture evidence; restore the sandbox and fix the upload manifest/settings shape first.'
        : status === 'RUNTIME_MODE_MISMATCH'
          ? 'The visible Roll20 runtime mode does not match this payload. Set legacy sanitization to the expected mode, reload, and probe again.'
        : 'Roll20 file-input handlers ran, but visible activation is not proven. Save/reload settings and use the frame-aware probe before capturing parity evidence.',
    };
  };
  const buildSettingsManifest = (manifestText) => {
    const parsed = JSON.parse(manifestText);
    if (parsed && typeof parsed === 'object' && parsed.jsoninfo) return JSON.stringify(parsed, null, 2);
    const userOptions = parsed.useroptions || parsed.userOptions || [];
    return JSON.stringify({
      sheet: {
        short_name: parsed.short_name || 'custom',
        long_name: parsed.long_name || parsed.name || 'Custom Sheet',
        instructions: parsed.instructions || '',
        preview_image: parsed.preview_image || 'https://via.placeholder.com/500x650.png?text=Placeholder+Image',
        authors: parsed.authors || 'Local verification',
      },
      userOptions,
      jsoninfo: parsed,
    }, null, 2);
  };
  assertSandboxPage();
  if (!DATA.validation.translation.ok || !DATA.validation.manifest.ok || !DATA.validation.settingsFieldManifest.ok) {
    console.warn('Local payload validation failed before upload:', DATA.validation);
  } else {
    console.log('Local payload validation:', DATA.validation);
  }
  const activationBefore = collectActivationProbe('before-upload');
  const uploadStateBefore = readUploadState();
  const currentIndex = RESUME_UPLOAD ? uploadStateBefore.nextIndex : 0;
  const currentItem = UPLOAD_ITEMS[currentIndex] || null;
  const uploadAlreadyComplete = RESUME_UPLOAD && (uploadStateBefore.complete || !currentItem);
  const manifest = setManifest();
  const fileInputCapable = canConstructByteArray() && typeof File === 'function';
  const selectedItems = RESUME_UPLOAD
    ? (currentItem ? [currentItem] : [])
    : UPLOAD_ITEMS;
  if (RESUME_UPLOAD && currentItem && fileInputCapable) {
    writeUploadState({ nextIndex: currentIndex, pendingIndex: currentIndex, pendingPageToken: PAGE_TOKEN, complete: false, settingsSubmitted: uploadStateBefore.settingsSubmitted });
  }
  const results = uploadAlreadyComplete
    ? [{ selector: 'resume-state', status: 'already-complete' }]
    : fileInputCapable
      ? (await (async () => {
        const output = [];
        for (const { selector, item, type } of selectedItems) {
          output.push(await setFileInput(selector, item, type));
        }
        return output;
      })())
      : selectedItems.map(({ selector }) => ({ selector, status: 'unsupported-browser-primitive' }));
  const anyFileInputHandlerRan = results.some((item) => item.status === 'dispatched');
  const fileInputHandlerRan = results.length === UPLOAD_ITEMS.length
    && results.every((item) => item.status === 'dispatched');
  if (RESUME_UPLOAD && currentItem && anyFileInputHandlerRan) {
    const nextIndex = Math.min(UPLOAD_ITEMS.length, currentIndex + 1);
    writeUploadState({ nextIndex, pendingIndex: null, pendingPageToken: null, complete: nextIndex >= UPLOAD_ITEMS.length, settingsSubmitted: uploadStateBefore.settingsSubmitted });
  }
  const endpointFallback = USE_ENDPOINT_FALLBACK
    && !uploadAlreadyComplete
    && !anyFileInputHandlerRan
    ? await postEndpointFallback()
    : { status: fileInputHandlerRan || anyFileInputHandlerRan ? 'not-needed-file-input-handler-dispatched' : 'disabled' };
  const endpointCompletedUpload = endpointFallback.status === 'posted';
  if (RESUME_UPLOAD && endpointCompletedUpload) {
    writeUploadState({ nextIndex: UPLOAD_ITEMS.length, pendingIndex: null, pendingPageToken: null, complete: true, settingsSubmitted: uploadStateBefore.settingsSubmitted });
  }
  const uploadProgress = {
    mode: RESUME_UPLOAD ? 'resumable-single-file-step' : 'single-pass',
    stateKey: RESUME_UPLOAD ? UPLOAD_STATE_KEY : null,
    currentIndex,
    currentFile: currentItem?.key || null,
    nextIndex: endpointCompletedUpload
      ? UPLOAD_ITEMS.length
      : anyFileInputHandlerRan
        ? Math.min(UPLOAD_ITEMS.length, currentIndex + 1)
        : currentIndex,
    complete: uploadAlreadyComplete
      || endpointCompletedUpload
      || (anyFileInputHandlerRan && currentIndex + 1 >= UPLOAD_ITEMS.length),
    rerunAfterReload: Boolean(RESUME_UPLOAD && currentItem && !uploadAlreadyComplete),
  };
  let settingsSave = { status: 'disabled' };
  if (SUBMIT_SETTINGS_FORM && uploadProgress.complete) {
    if (uploadStateBefore.settingsSubmitted) {
      settingsSave = { status: 'already-submitted' };
    } else {
      const button = document.querySelector('#save-changes-button');
      if (button) {
        writeUploadState({ nextIndex: UPLOAD_ITEMS.length, pendingIndex: null, pendingPageToken: null, complete: true, settingsSubmitted: true });
        button.click();
        settingsSave = { status: 'clicked' };
      } else {
        settingsSave = { status: 'save-button-missing' };
      }
    }
  }
  await sleep(1500);
  const sandboxMessages = inspectSandboxMessages();
  const activationAfter = collectActivationProbe('after-upload');
  const activation = classifyActivation(activationBefore, activationAfter, results, sandboxMessages);
  if (typeof console.table === 'function') console.table(results);
  console.log('Manifest:', manifest);
  console.log('Settings save:', settingsSave);
  console.log('Endpoint fallback:', endpointFallback);
  console.log('Upload progress:', uploadProgress);
  console.log('Sandbox messages:', sandboxMessages);
  console.log('Activation probe:', activation);
  console.log('Fixture:', DATA.fixtureId);
  console.log(activation.status === 'VISIBLE_MATCH'
    ? 'Next: capture roll20-sandbox root evidence and roll20-chat.png, then run status/diff gates.'
    : uploadProgress.complete
      ? 'Next: do not capture parity evidence yet; save/reload the dedicated Sandbox or test room, then run the frame-aware activation probe.'
      : 'Next: after Roll20 reloads, run this same snippet again to upload the next payload file; clear sessionStorage state to restart.');
  return { fixtureId: DATA.fixtureId, validation: DATA.validation, uploadContract: 'roll20-delegated-file-input-change', fileInputs: results, endpointFallback, manifest, settingsSave, uploadProgress, sandboxMessages, activationBefore, activationAfter, activation };
})();
`;
}

function renderReadme(report) {
  const lines = [
    '# Roll20 Upload Snippets',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    'These snippets are local-only and ignored by Git. They embed source-derived payloads, so do not commit them.',
    '',
    'Use upload snippets only in the dedicated Roll20 Custom Sheet Sandbox editor/settings page. Do not run these in existing real rooms.',
    '',
    'Default snippets are non-submitting helpers and upload one file per invocation. If Roll20 reloads after a file is accepted, run the same generated snippet again; its sessionStorage state resumes with the next file. Pass `--single-pass-upload` only when the destination is known not to reload between file inputs. Pass `--apply-settings --endpoint-campaign-id <sandboxCampaignId>` only for the dedicated Sandbox/test room when you intentionally want the generated snippet to save settings. The endpoint fallback runs only when no file-input handler ran.',
    '',
    'If the canonical ignored report folder is locked, pass `--out-dir <ignored-local-folder>` to generate a fresh handoff without overwriting earlier evidence.',
    '',
    'For an anonymous local payload directory containing only `sheet.html`, `sheet.css`, and `translation.json`, pass `--payload-dir <ignored-local-folder>`. A synthetic modern/legacy manifest is created in memory only; no settings endpoint is enabled unless `--apply-settings` is explicitly supplied.',
    '',
    'The snippet creates browser `File` objects and dispatches `change` events on the Sandbox Tools inputs. A 2026-07-16 live handler inspection confirmed that this invokes the same Roll20 delegated handler as a manual file choice: FileReader reads raw text, the page POSTs base64 source to `/sheetsandbox/savesheetsettings`, then reloads sheet data and open characters. The resumable path writes only payload hashes and the next-file index to sessionStorage, never the sheet source; clear the generated state key to restart. The helper also fills the submitted `customcharsheet_json` control with the settings-page `{ sheet, userOptions, jsoninfo }` wrapper derived from exported `sheet.json` when the settings page is open. When file inputs are unavailable, the explicit endpoint fallback uses the same form-encoded payload shape and triggers the same reload helpers. Upload execution is still not proof that Roll20 rendered the sheet unless the activation probe reports `VISIBLE_MATCH`; `SHEET_IFRAME_PRESENT_NEEDS_FRAME_PROBE` means a character-sheet iframe exists but top-document JS could not prove its markers, and `CHAT_TEMPLATE_ONLY` means chat rolltemplate evidence exists but sheet body markers are not proven.',
    '',
    'After settings save and editor reload, run the matching `*-activation-check-snippet.js` on `https://app.roll20.net/editor`. It returns `VISIBLE_MATCH`, `RUNTIME_MODE_MISMATCH`, `SHEET_IFRAME_PRESENT_NEEDS_FRAME_PROBE`, `CHARACTER_DIALOG_NO_SHEET_BODY`, `CHAT_TEMPLATE_ONLY`, `ROLL20_EDITOR_PARSE_ERROR`, or `NOT_PROVEN`. The expected modern/legacy mode comes from `sheet.json` unless `--expected-runtime-mode modern|legacy` overrides it. Capture Roll20 sheet-root evidence only after `VISIBLE_MATCH`, a matching runtime mode, and a visual check that the visible sheet belongs to the intended fixture.',
    '',
    'After upload, capture Roll20 sandbox root/chat evidence and rerun the status/diff gates.',
    '',
    '| Fixture | Runtime mode | Upload snippet | Activation check | Apply settings | Campaign id | HTML bytes | CSS bytes | Translation bytes | Translation JSON | Settings field manifest |',
    '| --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | --- | --- |',
  ];
  for (const entry of report.entries) {
    lines.push(`| ${entry.fixtureId} | ${entry.options?.expectedRuntimeMode || 'modern'} | \`${entry.snippetRelativePath}\` | \`${entry.activationCheckSnippetRelativePath}\` | ${entry.options?.applySettings ? 'YES' : 'NO'} | ${entry.options?.endpointCampaignId || '-'} | ${entry.payloadBytes.html} | ${entry.payloadBytes.css} | ${entry.payloadBytes.translation} | ${entry.validation.translation.ok ? 'PASS' : 'FAIL'} | ${entry.validation.settingsFieldManifest.ok ? 'PASS' : 'FAIL'} |`);
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function safeName(value) {
  return String(value).replace(/[^a-z0-9._-]+/gi, '_');
}

function runSelfTest() {
  const manifestText = JSON.stringify({
    html: 'sheet.html',
    css: 'sheet.css',
    translations: 'translation.json',
    legacy: true,
    useroptions: [],
    name: 'Self Test Sheet',
    authors: 'Local verification',
  });
  const settingsText = buildSettingsManifestText(manifestText);
  const directModernManifest = buildDirectPayloadManifest('modern');
  const settings = JSON.parse(settingsText);
  const validation = validateSettingsFieldManifest(manifestText);
  const payload = {
    html: { name: 'sheet.html', bytes: 0, sha256: 'self', base64: '' },
    css: { name: 'sheet.css', bytes: 0, sha256: 'self', base64: '' },
    translation: { name: 'translation.json', bytes: 2, sha256: 'self', base64: 'e30=' },
    manifest: { name: 'sheet.json', bytes: manifestText.length, sha256: 'self', base64: Buffer.from(manifestText, 'utf8').toString('base64') },
  };
  const snippet = renderSnippet({
    fixtureId: 'self-test',
    payload,
    validation: {
      translation: { ok: true },
      manifest: { ok: true },
      settingsFieldManifest: validation,
    },
    activationHints: {
      rolltemplateClasses: ['sheet-rolltemplate-self'],
      rollButtonNames: ['roll_self'],
      attrNames: ['attr_self'],
      textTokens: ['Self'],
    },
  });
  const applySnippet = renderSnippet({
    fixtureId: 'self-test',
    payload,
    validation: {
      translation: { ok: true },
      manifest: { ok: true },
      settingsFieldManifest: validation,
    },
    activationHints: {
      rolltemplateClasses: ['sheet-rolltemplate-self'],
      rollButtonNames: ['roll_self'],
      attrNames: ['attr_self'],
      textTokens: ['Self'],
    },
    options: {
      applySettings: true,
      endpointCampaignId: '12345',
      expectedRuntimeMode: 'legacy',
    },
  });
  const activationCheckSnippet = renderActivationCheckSnippet({
    fixtureId: 'self-test',
    expectedRuntimeMode: 'legacy',
    activationHints: {
      rolltemplateClasses: ['sheet-rolltemplate-self'],
      rollButtonNames: ['roll_self'],
      attrNames: ['attr_self'],
      textTokens: ['Self'],
    },
  });
  const readme = renderReadme({
    generatedAt: new Date(0).toISOString(),
    entries: [{
      fixtureId: 'self-test',
      snippetRelativePath: 'reports/self-test.js',
      activationCheckSnippetRelativePath: 'reports/self-test-activation-check-snippet.js',
      options: { applySettings: true, endpointCampaignId: '12345', expectedRuntimeMode: 'legacy' },
      payloadBytes: { html: 0, css: 0, translation: 2 },
      validation: {
        translation: { ok: true },
        settingsFieldManifest: validation,
      },
    }],
  });
  const failures = [];
  try {
    new Function(snippet);
    new Function(applySnippet);
    new Function(activationCheckSnippet);
  } catch (error) {
    failures.push(`generated snippet syntax error: ${error?.message || error}`);
  }
  if (!settings?.jsoninfo) failures.push('settings manifest missing jsoninfo wrapper');
  if (!settings?.sheet?.long_name) failures.push('settings manifest missing sheet.long_name');
  if (validation.shape !== 'wrapped-jsoninfo') failures.push(`validation shape was ${validation.shape}`);
  if (resolveExpectedRuntimeMode(manifestText, 'auto') !== 'legacy') failures.push('manifest legacy mode was not resolved');
  if (resolveExpectedRuntimeMode('{"legacy":false}', 'auto') !== 'modern') failures.push('manifest modern mode was not resolved');
  if (resolveExpectedRuntimeMode(directModernManifest, 'auto') !== 'modern') failures.push('direct payload manifest was not resolved as modern');
  if (!validateSettingsFieldManifest(directModernManifest).ok) failures.push('direct payload manifest failed settings validation');
  if (!snippet.includes('const SUBMIT_SETTINGS_FORM = false;')) failures.push('default snippet should not submit settings');
  if (!snippet.includes('const USE_ENDPOINT_FALLBACK = false;')) failures.push('default snippet should not post endpoint fallback');
  if (!snippet.includes('const RESUME_UPLOAD = true;')) failures.push('default snippet should use resumable upload');
  if (!snippet.includes('pendingIndex')) failures.push('resumable snippet missing pending upload state');
  if (!applySnippet.includes('const SUBMIT_SETTINGS_FORM = true;')) failures.push('apply snippet missing submit settings flag');
  if (!applySnippet.includes('const USE_ENDPOINT_FALLBACK = true;')) failures.push('apply snippet missing endpoint fallback flag');
  if (!applySnippet.includes('const ENDPOINT_CAMPAIGN_ID = "12345";')) failures.push('apply snippet missing explicit campaign id');
  if (!applySnippet.includes("application/x-www-form-urlencoded; charset=UTF-8")) failures.push('endpoint fallback does not match jquery form transport');
  if (!applySnippet.includes('reloadSheetData')) failures.push('endpoint fallback missing sheet data reload');
  if (!applySnippet.includes("not-needed-file-input-handler-dispatched")) failures.push('endpoint fallback should not duplicate a successful file-input upload');
  if (!snippet.includes("typeof DataTransfer === 'function'")) failures.push('generated snippet missing DataTransfer compatibility fallback');
  if (!snippet.includes('const textFromBytes = (bytes)')) failures.push('generated snippet missing TextDecoder compatibility fallback');
  if (!snippet.includes("const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'")) failures.push('generated snippet missing base64 decoder fallback');
  if (!snippet.includes('jsoninfo: parsed')) failures.push('generated snippet missing jsoninfo wrapper builder');
  if (!snippet.includes('input[name="customcharsheet_json"]')) failures.push('generated snippet missing narrow manifest input selector');
  if (!snippet.includes('textarea[name="customcharsheet_layout"]')) failures.push('generated snippet missing campaign settings layout selector');
  if (!snippet.includes('textarea[name="customcharsheet_style"]')) failures.push('generated snippet missing campaign settings style selector');
  if (!snippet.includes('textarea[name="customcharsheet_translation"]')) failures.push('generated snippet missing campaign settings translation selector');
  if (snippet.includes('.ace_text-input[name="customcharsheet_json"]')) failures.push('generated snippet still writes Ace text input as a manifest field');
  if (!snippet.includes('ROLL20_EDITOR_PARSE_ERROR')) failures.push('generated snippet missing editor parse-error activation status');
  if (!snippet.includes('roll20EditorParseError')) failures.push('generated snippet missing editor parse-error detector');
  if (!activationCheckSnippet.includes('ROLL20_EDITOR_PARSE_ERROR')) failures.push('generated activation check missing parse-error status');
  if (!activationCheckSnippet.includes('RUNTIME_MODE_MISMATCH')) failures.push('generated activation check missing runtime-mode mismatch status');
  if (!activationCheckSnippet.includes('"expectedRuntimeMode": "legacy"')) failures.push('generated activation check missing expected legacy mode');
  if (!activationCheckSnippet.includes('VISIBLE_MATCH')) failures.push('generated activation check missing visible-match status');
  if (!activationCheckSnippet.includes('SHEET_IFRAME_PRESENT_NEEDS_FRAME_PROBE')) failures.push('generated activation check missing sheet iframe state');
  if (!activationCheckSnippet.includes('CHARACTER_DIALOG_NO_SHEET_BODY')) failures.push('generated activation check missing character dialog state');
  if (!activationCheckSnippet.includes('SANDBOX_NO_VISIBLE_SHEET_TARGET')) failures.push('generated activation check missing empty Sandbox target state');
  if (!activationCheckSnippet.includes('CHAT_TEMPLATE_ONLY')) failures.push('generated activation check missing chat-template-only status');
  if (!activationCheckSnippet.includes('NOT_PROVEN')) failures.push('generated activation check missing not-proven status');
  if (!snippet.includes('SHEET_IFRAME_PRESENT_NEEDS_FRAME_PROBE')) failures.push('generated upload snippet missing sheet iframe state');
  if (!snippet.includes('CHARACTER_DIALOG_NO_SHEET_BODY')) failures.push('generated upload snippet missing character dialog state');
  if (!snippet.includes('SANDBOX_NO_VISIBLE_SHEET_TARGET')) failures.push('generated upload snippet missing empty Sandbox target state');
  if (!applySnippet.includes("save-button-missing")) failures.push('apply snippet should tolerate missing settings save button on editor pages');
  if (!activationCheckSnippet.includes('rollButtonCount')) failures.push('generated activation check missing roll button count');
  if (!activationCheckSnippet.includes('renderEvidence')) failures.push('generated activation check missing render evidence');
  if (!activationCheckSnippet.includes('topLevelChildren')) failures.push('generated activation check missing top-level geometry');
  if (!activationCheckSnippet.includes('bottomLayout')) failures.push('generated activation check missing bottom-layout evidence');
  if (!activationCheckSnippet.includes('borderSpacing')) failures.push('generated activation check missing table-spacing evidence');
  if (!activationCheckSnippet.includes('focusedControl')) failures.push('generated activation check missing focus state');
  if (!activationCheckSnippet.includes('attributeState')) failures.push('generated activation check missing attribute state');
  if (!activationCheckSnippet.includes('visibleOccurrenceCount')) failures.push('generated activation check missing grouped attribute-state evidence');
  if (!readme.includes('settings-page `{ sheet, userOptions, jsoninfo }` wrapper')) failures.push('generated README text does not describe wrapper');
  if (!readme.includes('Activation check')) failures.push('generated README missing activation check column');
  if (!readme.includes('*-activation-check-snippet.js')) failures.push('generated README missing activation check instruction');
  if (!readme.includes('Apply settings')) failures.push('generated README missing apply settings column');
  if (!readme.includes('--out-dir <ignored-local-folder>')) failures.push('generated README missing output override instruction');
  if (!readme.includes('--payload-dir <ignored-local-folder>')) failures.push('generated README missing direct payload instruction');
  if (!readme.includes('sessionStorage state resumes')) failures.push('generated README missing resumable upload instruction');
  if (failures.length) throw new Error(`roll20_upload_snippet self-test failed: ${failures.join(', ')}`);
  console.log('ROLL20 UPLOAD SNIPPET SELF-TEST PASS');
}
