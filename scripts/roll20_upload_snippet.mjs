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
  const validation = {
    translation: validateJsonPayload(await fs.readFile(files.translation, 'utf8'), 'translation.json'),
    manifest: validateJsonPayload(await fs.readFile(files.manifest, 'utf8'), 'sheet.json'),
  };
  validation.settingsManifest = validateSettingsManifest(await fs.readFile(files.manifest, 'utf8'));

  const snippet = renderSnippet({ fixtureId, payload, validation });
  const snippetFile = path.join(outDir, `${safeName(fixtureId)}-upload-snippet.js`);
  await fs.writeFile(snippetFile, snippet, 'utf8');

  return {
    fixtureId,
    snippetPath: snippetFile,
    snippetRelativePath: path.relative(process.cwd(), snippetFile),
    payloadBytes: Object.fromEntries(Object.entries(payload).map(([key, item]) => [key, item.bytes])),
    payloadSha256: Object.fromEntries(Object.entries(payload).map(([key, item]) => [key, item.sha256])),
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

function validateSettingsManifest(manifestText) {
  try {
    const text = buildSettingsManifestText(manifestText);
    const parsed = JSON.parse(text);
    return {
      ok: true,
      longName: parsed?.sheet?.long_name ?? '',
      shortName: parsed?.sheet?.short_name ?? '',
      hasJsonInfo: Boolean(parsed?.jsoninfo),
      userOptionsType: Array.isArray(parsed?.userOptions) ? 'array' : typeof parsed?.userOptions,
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
  const settingsManifest = {
    sheet: {
      short_name: parsed.short_name || 'custom',
      long_name: parsed.long_name || parsed.name || 'Custom Sheet',
      instructions: parsed.instructions || '',
      preview_image: parsed.preview_image || 'https://via.placeholder.com/500x650.png?text=Placeholder+Image',
      authors: parsed.authors || 'Local verification',
    },
    userOptions,
    jsoninfo: parsed,
  };
  return JSON.stringify(settingsManifest, null, 2);
}

function renderSnippet({ fixtureId, payload, validation }) {
  const literal = JSON.stringify({ fixtureId, payload, validation }, null, 2);
  return `// Roll20 Custom Sheet Sandbox upload helper for ${fixtureId}
// Local-only generated snippet. Do not paste this into existing real rooms.
// Run on https://app.roll20.net/editor with Sheet Sandbox Tools open, or on the
// matching Custom Sheet Sandbox settings page. It does not prove visual parity;
// capture screenshots and run the repo status/diff commands afterward.
(async () => {
  const DATA = ${literal};
  const SUBMIT_SETTINGS_FORM = false;
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
    for (const el of targets) {
      if ('value' in el) {
        el.value = text;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    const ace = document.querySelector('[data-target="customcharsheet_json"] .ace_text-input, .ace_text-input[name="customcharsheet_json"]');
    if (ace && 'value' in ace) {
      ace.value = text;
      ace.dispatchEvent(new Event('input', { bubbles: true }));
      ace.dispatchEvent(new Event('change', { bubbles: true }));
    }
    return { status: targets.length ? 'manifest-set' : 'manifest-target-missing', targets: targets.length };
  };
  const inspectSandboxMessages = () => {
    const text = (document.querySelector('#sheetsandbox')?.innerText || document.body?.innerText || '').replace(/\\s+/g, ' ').trim();
    return {
      translationJsonParseError: /번역 JSON|Translation JSON|JSON을 파싱|JSON parse/i.test(text),
      sandboxTextSnippet: text.slice(0, 800),
    };
  };
  const buildSettingsManifest = (manifestText) => {
    const parsed = JSON.parse(manifestText);
    if (parsed && typeof parsed === 'object' && parsed.jsoninfo) {
      return JSON.stringify(parsed, null, 2);
    }
    const userOptions = parsed.useroptions || parsed.userOptions || [];
    const settingsManifest = {
      sheet: {
        short_name: parsed.short_name || 'custom',
        long_name: parsed.long_name || parsed.name || 'Custom Sheet',
        instructions: parsed.instructions || '',
        preview_image: parsed.preview_image || 'https://via.placeholder.com/500x650.png?text=Placeholder+Image',
        authors: parsed.authors || 'Local verification',
      },
      userOptions,
      jsoninfo: parsed,
    };
    return JSON.stringify(settingsManifest, null, 2);
  };
  assertSandboxPage();
  if (!DATA.validation.translation.ok || !DATA.validation.manifest.ok || !DATA.validation.settingsManifest.ok) {
    console.warn('Local payload validation failed before upload:', DATA.validation);
  } else {
    console.log('Local payload validation:', DATA.validation);
  }
  const results = [];
  results.push(await setFileInput('#sheetHtml', DATA.payload.html, 'text/html'));
  results.push(await setFileInput('#sheetCss', DATA.payload.css, 'text/css'));
  results.push(await setFileInput('#sheetTranslation', DATA.payload.translation, 'application/json'));
  const manifest = setManifest();
  if (SUBMIT_SETTINGS_FORM) {
    const button = document.querySelector('#save-changes-button, button[type="submit"], input[type="submit"]');
    if (!button) throw new Error('SUBMIT_SETTINGS_FORM is true, but no save button was found.');
    button.click();
  }
  const sandboxMessages = inspectSandboxMessages();
  console.table(results);
  console.log('Manifest:', manifest);
  console.log('Sandbox messages:', sandboxMessages);
  console.log('Fixture:', DATA.fixtureId);
  console.log('Next: reopen/refresh the sandbox character, capture roll20-sandbox root evidence and roll20-chat.png, then run status/diff gates.');
  return { fixtureId: DATA.fixtureId, validation: DATA.validation, fileInputs: results, manifest, sandboxMessages };
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
    'Use only in the dedicated Roll20 Custom Sheet Sandbox editor/settings page. Do not run these in existing real rooms.',
    '',
    'The snippet creates browser `File` objects and dispatches `change` events on the Sandbox Tools inputs. It also logs local JSON validation and detects visible Roll20 translation-parse warning text after upload. It is a fallback for Chrome extension file chooser failures, not proof that Roll20 rendered the sheet.',
    '',
    'After upload, capture Roll20 sandbox root/chat evidence and rerun the status/diff gates.',
    '',
    '| Fixture | Snippet | HTML bytes | CSS bytes | Translation bytes | Translation JSON | Settings manifest |',
    '| --- | --- | ---: | ---: | ---: | --- | --- |',
  ];
  for (const entry of report.entries) {
    lines.push(`| ${entry.fixtureId} | \`${entry.snippetRelativePath}\` | ${entry.payloadBytes.html} | ${entry.payloadBytes.css} | ${entry.payloadBytes.translation} | ${entry.validation.translation.ok ? 'PASS' : 'FAIL'} | ${entry.validation.settingsManifest.ok ? 'PASS' : 'FAIL'} |`);
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function safeName(value) {
  return String(value).replace(/[^a-z0-9._-]+/gi, '_');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
