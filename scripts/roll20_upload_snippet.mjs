#!/usr/bin/env node
/**
 * Generate a local-only browser snippet for Roll20 Custom Sheet Sandbox upload.
 *
 * This is a fallback for Chrome extension file chooser failures. It does not
 * contact Roll20 by itself. The generated snippet must be run only in the
 * dedicated Roll20 Custom Sheet Sandbox editor/settings page, where it creates
 * File objects in the page and dispatches the same change events the Sandbox
 * Tools file inputs listen for.
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

async function main() {
  const runDir = RUN_DIR_ARG ? path.resolve(RUN_DIR_ARG) : await findLatestPreuploadRun();
  const baselineDir = path.join(runDir, 'local-baseline');
  if (!existsSync(baselineDir)) throw new Error(`missing local baseline folder: ${baselineDir}`);

  const fixtureIds = (await fs.readdir(baselineDir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((fixtureId) => !ONLY || fixtureId === ONLY)
    .sort((a, b) => a.localeCompare(b));
  if (!fixtureIds.length) throw new Error(`no matching fixture found${ONLY ? `: ${ONLY}` : ''}`);

  const outDir = path.join(runDir, 'roll20-upload-handoff', 'snippets');
  await fs.mkdir(outDir, { recursive: true });

  const entries = [];
  for (const fixtureId of fixtureIds) {
    entries.push(await writeFixtureSnippet(runDir, fixtureId, outDir));
  }

  const report = {
    generatedAt: new Date().toISOString(),
    runDir,
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

async function writeFixtureSnippet(runDir, fixtureId, outDir) {
  const payloadDir = path.join(runDir, 'local-baseline', fixtureId, 'payload');
  const files = {
    html: path.join(payloadDir, 'sheet.html'),
    css: path.join(payloadDir, 'sheet.css'),
    translation: path.join(payloadDir, 'translation.json'),
    manifest: path.join(payloadDir, 'sheet.json'),
  };
  for (const [label, file] of Object.entries(files)) {
    if (!existsSync(file)) throw new Error(`missing ${label} payload file for ${fixtureId}: ${file}`);
  }

  const payload = {};
  for (const [label, file] of Object.entries(files)) {
    const bytes = await fs.readFile(file);
    payload[label] = {
      name: path.basename(file),
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      base64: bytes.toString('base64'),
    };
  }
  const sourceTexts = {
    html: await fs.readFile(files.html, 'utf8'),
    css: await fs.readFile(files.css, 'utf8'),
    translation: await fs.readFile(files.translation, 'utf8'),
    manifest: await fs.readFile(files.manifest, 'utf8'),
  };
  const validation = {
    translation: validateJsonPayload(sourceTexts.translation, 'translation.json'),
    manifest: validateJsonPayload(sourceTexts.manifest, 'sheet.json'),
  };
  validation.settingsFieldManifest = validateSettingsFieldManifest(sourceTexts.manifest);
  const activationHints = extractActivationHints(sourceTexts);

  const snippet = renderSnippet({ fixtureId, payload, validation, activationHints });
  const snippetFile = path.join(outDir, `${safeName(fixtureId)}-upload-snippet.js`);
  await fs.writeFile(snippetFile, snippet, 'utf8');
  const activationCheckSnippet = renderActivationCheckSnippet({ fixtureId, activationHints });
  const activationCheckFile = path.join(outDir, `${safeName(fixtureId)}-activation-check-snippet.js`);
  await fs.writeFile(activationCheckFile, activationCheckSnippet, 'utf8');

  return {
    fixtureId,
    snippetPath: snippetFile,
    snippetRelativePath: path.relative(process.cwd(), snippetFile),
    activationCheckSnippetPath: activationCheckFile,
    activationCheckSnippetRelativePath: path.relative(process.cwd(), activationCheckFile),
    payloadBytes: Object.fromEntries(Object.entries(payload).map(([key, item]) => [key, item.bytes])),
    payloadSha256: Object.fromEntries(Object.entries(payload).map(([key, item]) => [key, item.sha256])),
    activationHints,
    validation,
  };
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

function renderActivationCheckSnippet({ fixtureId, activationHints }) {
  const literal = JSON.stringify({ fixtureId, activationHints }, null, 2);
  return `// Roll20 Custom Sheet Sandbox editor activation checker for ${fixtureId}
// Local-only generated snippet. Run on https://app.roll20.net/editor after
// upload/settings save and reload. It does not prove visual parity; it only
// proves whether expected fixture markers are visible enough to proceed.
(() => {
  const DATA = ${literal};
  const bodyText = (document.body?.innerText || document.body?.textContent || '').replace(/\\s+/g, ' ').trim();
  const bodyHtml = document.body?.outerHTML || '';
  const rolltemplateClasses = DATA.activationHints.rolltemplateClasses || [];
  const rollButtonNames = DATA.activationHints.rollButtonNames || [];
  const attrNames = DATA.activationHints.attrNames || [];
  const textTokens = DATA.activationHints.textTokens || [];
  const parseError = /"status"\\s*:\\s*"error"|unexpected token at|customcharsheet_json|sheet\\.html/i.test(bodyText)
    && /unexpected token|parse error|JSON/i.test(bodyText);
  const hits = {
    rolltemplateClasses: rolltemplateClasses.filter((className) => bodyHtml.includes(className)),
    rollButtonNames: rollButtonNames.filter((name) => bodyHtml.includes(name)),
    attrNames: attrNames.filter((name) => bodyHtml.includes(name)),
    textTokens: textTokens.filter((token) => bodyText.includes(token)),
  };
  const hitCount = Object.values(hits).reduce((sum, values) => sum + values.length, 0);
  const domRolltemplateClasses = [...new Set(Array.from(document.querySelectorAll('[class*="rolltemplate-"]'))
    .flatMap((el) => String(el.className || '').split(/\\s+/))
    .filter((className) => className.includes('rolltemplate-')))];
  const status = parseError
    ? 'ROLL20_EDITOR_PARSE_ERROR'
    : hitCount > 0
      ? 'VISIBLE_MATCH'
      : 'NOT_PROVEN';
  const result = {
    fixtureId: DATA.fixtureId,
    status,
    href: location.href,
    title: document.title,
    hitCount,
    hits,
    visible: {
      charsheetCount: document.querySelectorAll('.charsheet,.charactersheet').length,
      rollButtonCount: document.querySelectorAll('button[type="roll"], button[name^="roll_"], [name^="roll_"]').length,
      domRolltemplateClasses: domRolltemplateClasses.slice(-20),
      textchatCount: document.querySelectorAll('#textchat,.textchatcontainer').length,
      sheetSandboxInputCount: document.querySelectorAll('#sheetHtml,#sheetCss,#sheetTranslation').length,
      bodyTextSnippet: bodyText.slice(0, 800),
    },
    nextAction: status === 'VISIBLE_MATCH'
      ? 'Expected fixture markers are visible. Capture Roll20 root/chat evidence only if the visible sheet/chat belongs to this fixture.'
      : status === 'ROLL20_EDITOR_PARSE_ERROR'
        ? 'Do not capture evidence. Restore the sandbox and fix the upload manifest/settings shape.'
        : 'Do not capture evidence yet. The editor is reachable, but expected fixture markers are not visible.',
  };
  console.log('Roll20 activation check:', result);
  return result;
})();`;
}

function renderSnippet({ fixtureId, payload, validation, activationHints }) {
  const literal = JSON.stringify({ fixtureId, payload, validation, activationHints }, null, 2);
  return `// Roll20 Custom Sheet Sandbox upload helper for ${fixtureId}
// Local-only generated snippet. Do not paste this into existing real rooms.
// Run on https://app.roll20.net/editor with Sheet Sandbox Tools open, or on the
// matching Custom Sheet Sandbox settings page. It does not prove visual parity;
// capture screenshots and run the repo status/diff commands afterward.
(async () => {
  const DATA = ${literal};
  const SUBMIT_SETTINGS_FORM = false;
  const USE_ENDPOINT_FALLBACK = false;
  const ENDPOINT_CAMPAIGN_ID = '';
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const bytesFromBase64 = (base64) => {
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    return bytes;
  };
  const assertSandboxPage = () => {
    const okHost = location.hostname === 'app.roll20.net';
    const hasSandboxInputs = Boolean(document.querySelector('#sheetHtml, #sheetCss, #sheetTranslation'));
    const hasManifestTextarea = Boolean(document.querySelector('textarea[name="customcharsheet_json"], [name="customcharsheet_json"]'));
    if (!okHost || (!hasSandboxInputs && !hasManifestTextarea)) {
      throw new Error('Open the Roll20 Custom Sheet Sandbox editor/tools or settings page before running this snippet.');
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
      const response = await fetch('/sheetsandbox/savesheetsettings', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ campaignid, [key]: item.base64 }),
      });
      return {
        key,
        ok: response.ok,
        status: response.status,
        text: (await response.text()).slice(0, 500),
      };
    };
    return {
      status: 'posted',
      campaignid,
      results: [
        await postOne('html', DATA.payload.html),
        await postOne('css', DATA.payload.css),
        await postOne('translation', DATA.payload.translation),
      ],
    };
  };
  const setFileInput = async (selector, item, type) => {
    const input = document.querySelector(selector);
    if (!input) return { selector, status: 'missing' };
    const transfer = new DataTransfer();
    transfer.items.add(new File([bytesFromBase64(item.base64)], item.name, { type }));
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
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
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
    const rawText = new TextDecoder().decode(bytesFromBase64(DATA.payload.manifest.base64));
    const text = buildSettingsManifest(rawText);
    const targets = Array.from(document.querySelectorAll('textarea[name="customcharsheet_json"], [name="customcharsheet_json"]'));
    const editorKeys = typeof editors === 'object' && editors ? Object.keys(editors) : [];
    let aceJsonSet = false;
    for (const el of targets) {
      if ('value' in el) {
        el.value = text;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    if (typeof editors === 'object' && editors?.json && typeof editors.json.setValue === 'function') {
      editors.json.setValue(text, -1);
      if (typeof editors.json.clearSelection === 'function') editors.json.clearSelection();
      aceJsonSet = true;
    }
    const ace = document.querySelector('[data-target="customcharsheet_json"] .ace_text-input, .ace_text-input[name="customcharsheet_json"]');
    if (ace && 'value' in ace) {
      ace.value = text;
      ace.dispatchEvent(new Event('input', { bubbles: true }));
      ace.dispatchEvent(new Event('change', { bubbles: true }));
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
  const collectActivationProbe = (phase) => {
    const bodyText = (document.body?.innerText || '').replace(/\\s+/g, ' ');
    const bodyHtml = document.body?.outerHTML || '';
    const rolltemplateClasses = DATA.activationHints.rolltemplateClasses || [];
    const rollButtonNames = DATA.activationHints.rollButtonNames || [];
    const attrNames = DATA.activationHints.attrNames || [];
    const textTokens = DATA.activationHints.textTokens || [];
    const domRolltemplateClasses = [...new Set(Array.from(document.querySelectorAll('[class*="rolltemplate-"]'))
      .flatMap((el) => String(el.className || '').split(/\\s+/))
      .filter((className) => className.includes('rolltemplate-')))];
    return {
      phase,
      expected: {
        rolltemplateClasses: rolltemplateClasses.slice(0, 16),
        rollButtonNames: rollButtonNames.slice(0, 16),
        attrNames: attrNames.slice(0, 16),
        textTokens: textTokens.slice(0, 16),
      },
      hits: {
        rolltemplateClasses: rolltemplateClasses.filter((className) => bodyHtml.includes(className)),
        rollButtonNames: rollButtonNames.filter((name) => bodyHtml.includes(name)),
        attrNames: attrNames.filter((name) => bodyHtml.includes(name)),
        textTokens: textTokens.filter((token) => bodyText.includes(token)),
      },
      visible: {
        domRolltemplateClasses: domRolltemplateClasses.slice(-12),
        rollButtonCount: document.querySelectorAll('button[type="roll"], button[name^="roll_"], [name^="roll_"]').length,
        bodyTextSnippet: bodyText.slice(0, 600),
      },
    };
  };
  const classifyActivation = (before, after, fileInputs, sandboxMessages) => {
    const hitCount = (probe) => Object.values(probe?.hits || {}).reduce((sum, values) => sum + (Array.isArray(values) ? values.length : 0), 0);
    const beforeHits = hitCount(before);
    const afterHits = hitCount(after);
    const addedHits = Object.fromEntries(Object.entries(after?.hits || {}).map(([key, values]) => {
      const previous = new Set(before?.hits?.[key] || []);
      return [key, values.filter((value) => !previous.has(value))];
    }));
    const addedHitCount = Object.values(addedHits).reduce((sum, values) => sum + values.length, 0);
    const allFileInputsDispatched = fileInputs.every((item) => item.status === 'dispatched');
    const status = sandboxMessages?.roll20EditorParseError
      ? 'ROLL20_EDITOR_PARSE_ERROR'
      : afterHits > 0 && (addedHitCount > 0 || beforeHits === 0)
      ? 'VISIBLE_MATCH'
      : allFileInputsDispatched
        ? 'FILE_INPUTS_DISPATCHED_BUT_VISIBLE_MATCH_NOT_PROVEN'
        : 'NOT_PROVEN';
    return {
      status,
      beforeHits,
      afterHits,
      addedHits,
      addedHitCount,
      note: status === 'VISIBLE_MATCH'
        ? 'Expected sheet markers are visible after upload; still capture screenshots before claiming parity.'
        : status === 'ROLL20_EDITOR_PARSE_ERROR'
          ? 'Roll20 editor returned a parse error after upload/settings save. Do not capture evidence; restore the sandbox and fix the upload manifest/settings shape first.'
        : 'File-input dispatch alone is not proof that Roll20 applied the uploaded sheet. Use the real file chooser/settings save path or recapture only after visible expected markers appear.',
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
  const results = [];
  results.push(await setFileInput('#sheetHtml', DATA.payload.html, 'text/html'));
  results.push(await setFileInput('#sheetCss', DATA.payload.css, 'text/css'));
  results.push(await setFileInput('#sheetTranslation', DATA.payload.translation, 'application/json'));
  const endpointFallback = USE_ENDPOINT_FALLBACK ? await postEndpointFallback() : { status: 'disabled' };
  const manifest = setManifest();
  if (SUBMIT_SETTINGS_FORM) {
    const button = document.querySelector('#save-changes-button');
    if (!button) throw new Error('SUBMIT_SETTINGS_FORM is true, but #save-changes-button was not found.');
    button.click();
  }
  await sleep(1500);
  const sandboxMessages = inspectSandboxMessages();
  const activationAfter = collectActivationProbe('after-upload');
  const activation = classifyActivation(activationBefore, activationAfter, results, sandboxMessages);
  console.table(results);
  console.log('Manifest:', manifest);
  console.log('Endpoint fallback:', endpointFallback);
  console.log('Sandbox messages:', sandboxMessages);
  console.log('Activation probe:', activation);
  console.log('Fixture:', DATA.fixtureId);
  console.log(activation.status === 'VISIBLE_MATCH'
    ? 'Next: capture roll20-sandbox root evidence and roll20-chat.png, then run status/diff gates.'
    : 'Next: do not capture parity evidence yet; load the sheet through the real file chooser/settings save path or rerun only after visible expected markers appear.');
  return { fixtureId: DATA.fixtureId, validation: DATA.validation, fileInputs: results, endpointFallback, manifest, sandboxMessages, activationBefore, activationAfter, activation };
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
    'The snippet creates browser `File` objects and dispatches `change` events on the Sandbox Tools inputs. It also fills `customcharsheet_json` with the settings-page `{ sheet, userOptions, jsoninfo }` wrapper derived from exported `sheet.json` when the settings page is open. Live Roll20 verification on 2026-06-21 showed that writing the plain exported `sheet.json` text directly can make `/editor` return a JSON parse error. It logs local JSON validation, detects visible Roll20 translation-parse warning text, and compares before/after DOM activation hints such as expected rolltemplate classes, roll button names, attr names, and visible text tokens. When an agent explicitly enables `USE_ENDPOINT_FALLBACK`, it additionally POSTs base64 HTML/CSS/translation to the observed dedicated Sandbox endpoint. If the editor URL does not expose a campaign id, set `ENDPOINT_CAMPAIGN_ID` manually for the dedicated verification sandbox. Both paths are storage/application attempts, not proof that Roll20 rendered the sheet unless the activation probe reports `VISIBLE_MATCH` and screenshots are captured afterward.',
    '',
    'After settings save and editor reload, run the matching `*-activation-check-snippet.js` on `https://app.roll20.net/editor`. It returns `VISIBLE_MATCH`, `ROLL20_EDITOR_PARSE_ERROR`, or `NOT_PROVEN`. Capture Roll20 root/chat evidence only after `VISIBLE_MATCH` and a visual check that the visible sheet/chat belongs to the intended fixture.',
    '',
    'After upload, capture Roll20 sandbox root/chat evidence and rerun the status/diff gates.',
    '',
    '| Fixture | Upload snippet | Activation check | HTML bytes | CSS bytes | Translation bytes | Translation JSON | Settings field manifest |',
    '| --- | --- | --- | ---: | ---: | ---: | --- | --- |',
  ];
  for (const entry of report.entries) {
    lines.push(`| ${entry.fixtureId} | \`${entry.snippetRelativePath}\` | \`${entry.activationCheckSnippetRelativePath}\` | ${entry.payloadBytes.html} | ${entry.payloadBytes.css} | ${entry.payloadBytes.translation} | ${entry.validation.translation.ok ? 'PASS' : 'FAIL'} | ${entry.validation.settingsFieldManifest.ok ? 'PASS' : 'FAIL'} |`);
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
  const activationCheckSnippet = renderActivationCheckSnippet({
    fixtureId: 'self-test',
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
      payloadBytes: { html: 0, css: 0, translation: 2 },
      validation: {
        translation: { ok: true },
        settingsFieldManifest: validation,
      },
    }],
  });
  const failures = [];
  if (!settings?.jsoninfo) failures.push('settings manifest missing jsoninfo wrapper');
  if (!settings?.sheet?.long_name) failures.push('settings manifest missing sheet.long_name');
  if (validation.shape !== 'wrapped-jsoninfo') failures.push(`validation shape was ${validation.shape}`);
  if (!snippet.includes('jsoninfo: parsed')) failures.push('generated snippet missing jsoninfo wrapper builder');
  if (!snippet.includes('ROLL20_EDITOR_PARSE_ERROR')) failures.push('generated snippet missing editor parse-error activation status');
  if (!snippet.includes('roll20EditorParseError')) failures.push('generated snippet missing editor parse-error detector');
  if (!activationCheckSnippet.includes('ROLL20_EDITOR_PARSE_ERROR')) failures.push('generated activation check missing parse-error status');
  if (!activationCheckSnippet.includes('VISIBLE_MATCH')) failures.push('generated activation check missing visible-match status');
  if (!activationCheckSnippet.includes('NOT_PROVEN')) failures.push('generated activation check missing not-proven status');
  if (!activationCheckSnippet.includes('rollButtonCount')) failures.push('generated activation check missing roll button count');
  if (!readme.includes('settings-page `{ sheet, userOptions, jsoninfo }` wrapper')) failures.push('generated README text does not describe wrapper');
  if (!readme.includes('Activation check')) failures.push('generated README missing activation check column');
  if (!readme.includes('*-activation-check-snippet.js')) failures.push('generated README missing activation check instruction');
  if (failures.length) throw new Error(`roll20_upload_snippet self-test failed: ${failures.join(', ')}`);
  console.log('ROLL20 UPLOAD SNIPPET SELF-TEST PASS');
}
