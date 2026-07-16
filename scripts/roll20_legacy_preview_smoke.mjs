#!/usr/bin/env node
/**
 * Local smoke for the preview/edit legacy CSS toggle.
 *
 * It exercises buildSheetDoc (iframe preview) and buildSheetParts (Shadow/edit
 * preview) with copyright-safe synthetic input. This is not actual Roll20
 * visual parity; it proves the two local render paths consume the same
 * legacyCssSanitize option.
 */

import {
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSheetDoc, buildSheetLivePatch, buildSheetParts } from '../lib/preview/buildDoc.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');
const args = process.argv.slice(2).filter((arg) => arg !== '--');
const noReport = args.includes('--no-report');
const reportDir = resolve(argOf('--report-dir', 'reports/legacy-preview-smoke'));

function argOf(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

const HTML = `
<div class="legacy-card">
  <button type="roll" name="roll_test" value="/roll 1d20">Roll</button>
  <span data-i18n="hello">hello</span>
  <input type="number" name="attr_base" value="50">
  <input type="number" name="attr_total" value="floor(@{base}/5)" disabled>
  <fieldset class="repeating_items"></fieldset>
</div>
`.trim();

const CSS = `
@font-face {
  font-family: "SyntheticRuntimeFont";
  src: url("https://fonts.example.test/synthetic-runtime.woff2") format("woff2");
}
:root { --accent: #c02030; }
.sheet-legacy-card {
  position: sticky;
  transform: scale(0.92);
  animation: r20-fade 200ms ease-in-out;
  color: var(--accent);
}
.sheet-stable { padding: 8px; color: red; }
@keyframes r20-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}
`.trim();

const I18N = JSON.stringify({ hello: 'translated' });

function extractStyle(html, id) {
  const re = new RegExp(`<style id="${id}">([\\s\\S]*?)<\\/style>`);
  const match = re.exec(html);
  return match ? match[1] : '';
}

function extractStyleSourceChunk(css, source) {
  const marker = `/* r20-style-source:${source} */`;
  const start = css.indexOf(marker);
  if (start < 0) return '';
  const rest = css.slice(start + marker.length);
  const next = rest.indexOf('/* r20-style-source:');
  return next >= 0 ? rest.slice(0, next) : rest;
}

function assertCheck(checks, name, pass, details = {}) {
  checks.push({ name, pass: Boolean(pass), details });
}

function includesText(text, value) {
  return text.toLowerCase().includes(value.toLowerCase());
}

if (typeof buildSheetDoc !== 'function') throw new Error('buildSheetDoc missing');
if (typeof buildSheetParts !== 'function') throw new Error('buildSheetParts missing');

const modernDoc = buildSheetDoc({ html: HTML, css: CSS, i18n: I18N, sanitize: false, legacyCssSanitize: false });
const legacyDoc = buildSheetDoc({ html: HTML, css: CSS, i18n: I18N, sanitize: true, legacyCssSanitize: true });
const modernParts = buildSheetParts({ html: HTML, css: CSS, i18n: I18N, sanitize: false, legacyCssSanitize: false });
const legacyParts = buildSheetParts({ html: HTML, css: CSS, i18n: I18N, sanitize: true, legacyCssSanitize: true });
const modernAtomicDoc = buildSheetDoc({ html: HTML, css: CSS, i18n: I18N, compatibilityMode: 'modern' });
const legacyAtomicDoc = buildSheetDoc({ html: HTML, css: CSS, i18n: I18N, compatibilityMode: 'legacy' });
const modernAtomicParts = buildSheetParts({ html: HTML, css: CSS, i18n: I18N, compatibilityMode: 'modern' });
const legacyAtomicParts = buildSheetParts({ html: HTML, css: CSS, i18n: I18N, compatibilityMode: 'legacy' });
const modernPatch = buildSheetLivePatch({ html: HTML, css: CSS, i18n: I18N, sanitize: false, legacyCssSanitize: false });
const legacyPatch = buildSheetLivePatch({ html: HTML, css: CSS, i18n: I18N, sanitize: true, legacyCssSanitize: true });
const modernAtomicPatch = buildSheetLivePatch({ html: HTML, css: CSS, i18n: I18N, compatibilityMode: 'modern' });
const legacyAtomicPatch = buildSheetLivePatch({ html: HTML, css: CSS, i18n: I18N, compatibilityMode: 'legacy' });
const modernAtomicOverride = buildSheetDoc({ html: HTML, css: CSS, i18n: I18N, compatibilityMode: 'modern', sanitize: true, legacyCssSanitize: true });
const legacyAtomicOverride = buildSheetDoc({ html: HTML, css: CSS, i18n: I18N, compatibilityMode: 'legacy', sanitize: false, legacyCssSanitize: false });
const modernAtomicPatchOverride = buildSheetLivePatch({ html: HTML, css: CSS, i18n: I18N, compatibilityMode: 'modern', sanitize: true, legacyCssSanitize: true });
const legacyAtomicPatchOverride = buildSheetLivePatch({ html: HTML, css: CSS, i18n: I18N, compatibilityMode: 'legacy', sanitize: false, legacyCssSanitize: false });
const koreanDocument = buildSheetDoc({ html: HTML, css: CSS, documentLanguage: 'ko' });
const unsafeDocumentLanguage = buildSheetDoc({ html: HTML, css: CSS, documentLanguage: 'en\" onload=\"alert(1)' });
const koreanParts = buildSheetParts({ html: HTML, css: CSS, documentLanguage: 'ko' });
const koreanPatch = buildSheetLivePatch({ html: HTML, css: CSS, documentLanguage: 'ko' });

const modernUserCss = extractStyle(modernDoc, 'r20-user');
const legacyUserCss = extractStyle(legacyDoc, 'r20-user');
const modernBaseCss = extractStyle(modernDoc, 'roll20-base');
const modernDialogCss = extractStyle(modernDoc, 'roll20-dialog-open');
const modernLegacyInputCss = extractStyle(modernDoc, 'roll20-legacy-input-state');
const legacyInputCss = extractStyle(legacyDoc, 'roll20-legacy-input-state');
const modernShadowUserCss = extractStyleSourceChunk(modernParts.css, 'sheet-user-css');
const legacyShadowUserCss = extractStyleSourceChunk(legacyParts.css, 'sheet-user-css');
const modernShadowBaseCss = extractStyleSourceChunk(modernParts.css, 'roll20-base');
const modernShadowDialogCss = extractStyleSourceChunk(modernParts.css, 'roll20-dialog-context');
const modernShadowLegacyInputCss = extractStyleSourceChunk(modernParts.css, 'roll20-legacy-input-state');
const legacyShadowInputCss = extractStyleSourceChunk(legacyParts.css, 'roll20-legacy-input-state');
const checks = [];

assertCheck(checks, 'iframe defaults to the measured Roll20 document language', modernDoc.includes('<html lang="en"'));
assertCheck(checks, 'iframe accepts an explicit safe document language', koreanDocument.includes('<html lang="ko"'));
assertCheck(checks, 'iframe rejects unsafe document language markup', unsafeDocumentLanguage.includes('<html lang="en"') && !unsafeDocumentLanguage.includes('onload='));
assertCheck(checks, 'shadow and live patch share the explicit document language', koreanParts.html.includes('lang="ko"') && koreanPatch.documentLanguage === 'ko');

assertCheck(checks, 'atomic modern contract matches the prior paired low-level inputs',
  modernAtomicDoc === modernDoc && modernAtomicParts.html === modernParts.html && modernAtomicParts.css === modernParts.css);
assertCheck(checks, 'atomic legacy contract matches the prior paired low-level inputs',
  legacyAtomicDoc === legacyDoc && legacyAtomicParts.html === legacyParts.html && legacyAtomicParts.css === legacyParts.css);
assertCheck(checks, 'live patch consumes the same atomic modern and legacy contracts',
  JSON.stringify(modernAtomicPatch) === JSON.stringify(modernPatch)
    && JSON.stringify(legacyAtomicPatch) === JSON.stringify(legacyPatch));
assertCheck(checks, 'explicit compatibility mode overrides conflicting low-level booleans',
  modernAtomicOverride === modernAtomicDoc
    && legacyAtomicOverride === legacyAtomicDoc
    && JSON.stringify(modernAtomicPatchOverride) === JSON.stringify(modernAtomicPatch)
    && JSON.stringify(legacyAtomicPatchOverride) === JSON.stringify(legacyAtomicPatch));
assertCheck(checks, 'iframe modern preserves authored HTML class', modernDoc.includes('class="legacy-card"'));
assertCheck(checks, 'iframe modern does not legacy-prefix HTML class', !modernDoc.includes('class="sheet-legacy-card"'));
assertCheck(checks, 'iframe legacy prefixes HTML class', legacyDoc.includes('class="sheet-legacy-card"'));
assertCheck(checks, 'iframe modern keeps transform', includesText(modernUserCss, 'transform: scale(0.92)'));
assertCheck(checks, 'iframe modern keeps animation', includesText(modernUserCss, 'animation: r20-fade'));
assertCheck(checks, 'iframe modern preserves authored external font URL',
  modernUserCss.includes('https://fonts.example.test/synthetic-runtime.woff2')
    && !modernUserCss.includes('https://imgsrv.roll20.net/?src='));
assertCheck(checks, 'iframe legacy converts scale to zoom', includesText(legacyUserCss, 'zoom: 0.92'));
assertCheck(checks, 'iframe legacy proxies external font URL through Roll20',
  legacyUserCss.includes('https://imgsrv.roll20.net/?src=https%3A%2F%2Ffonts.example.test%2Fsynthetic-runtime.woff2'));
assertCheck(checks, 'iframe legacy removes transform declarations', !/transform\s*:/i.test(legacyUserCss));
assertCheck(checks, 'iframe legacy removes animation declarations', !/animation(?:-[a-z-]+)?\s*:/i.test(legacyUserCss));
assertCheck(checks, 'iframe legacy removes keyframes', !/@(?:-[a-z]+-)?keyframes\b/i.test(legacyUserCss));
assertCheck(checks, 'iframe legacy inlines CSS var', includesText(legacyUserCss, 'color: #c02030'));
assertCheck(checks, 'iframe legacy preserves stable CSS', includesText(legacyUserCss, 'padding: 8px') && includesText(legacyUserCss, 'color: red'));
assertCheck(checks, 'iframe runtime still hides scripts and rolltemplates after user CSS', modernDoc.indexOf('id="r20-preview-hidden"') > modernDoc.indexOf('id="r20-user"'));
assertCheck(checks, 'iframe dialog context does not override disabled input paint', !/input\[disabled\]|input\[readonly\]|select\[disabled\]/i.test(modernDialogCss));
assertCheck(checks, 'iframe dialog context does not override sheet backgrounds', !/\.charsheet\s*{[\s\S]*?background-(?:repeat|position)/i.test(modernDialogCss));
assertCheck(checks, 'iframe modern does not force legacy disabled input paint', modernLegacyInputCss === '');
assertCheck(checks, 'iframe legacy applies overridable disabled input paint', /input\[disabled\][\s\S]*?background-color:\s*rgba\(255,\s*255,\s*255,\s*0\)/i.test(legacyInputCss) && !/!important/i.test(legacyInputCss));
assertCheck(checks, 'iframe base mirrors current Roll20 text input height', /\.charsheet input\[type="text"\]\s*{\s*height:\s*26px;/i.test(modernBaseCss));
assertCheck(checks, 'iframe base mirrors Roll20 roll-button runtime defaults', /button\[type="roll"\][\s\S]*?border-radius:\s*4px;[\s\S]*?color:\s*#333;[\s\S]*?vertical-align:\s*middle;/i.test(modernBaseCss));
assertCheck(checks, 'iframe base mirrors Roll20 repeating-control height', /\.charsheet \.repcontrol\s*{\s*min-height:\s*27\.6px;/i.test(modernBaseCss));
assertCheck(checks, 'iframe runtime applies Roll20 button classes', modernDoc.includes("button.classList.add('btn')") && modernDoc.includes("button.classList.add('ui-draggable')"));
assertCheck(checks, 'iframe runtime applies annotated Roll20 autocalc values', modernDoc.includes('data-r20-autocalc-value') && modernDoc.includes('applyRoll20Autocalc'));
assertCheck(checks, 'iframe repeating controls use Roll20 btn class', modernDoc.includes('class="btn repcontrol_edit"') && modernDoc.includes('class="btn repcontrol_add"'));

assertCheck(checks, 'shadow modern preserves authored HTML class', modernParts.html.includes('class="legacy-card"'));
assertCheck(checks, 'shadow modern does not legacy-prefix HTML class', !modernParts.html.includes('class="sheet-legacy-card"'));
assertCheck(checks, 'shadow legacy prefixes HTML class', legacyParts.html.includes('class="sheet-legacy-card"'));
assertCheck(checks, 'shadow modern keeps transform', includesText(modernShadowUserCss, 'transform: scale(0.92)'));
assertCheck(checks, 'shadow modern keeps animation', includesText(modernShadowUserCss, 'animation: r20-fade'));
assertCheck(checks, 'shadow modern preserves authored external font URL',
  modernShadowUserCss.includes('https://fonts.example.test/synthetic-runtime.woff2')
    && !modernShadowUserCss.includes('https://imgsrv.roll20.net/?src='));
assertCheck(checks, 'shadow legacy converts scale to zoom', includesText(legacyShadowUserCss, 'zoom: 0.92'));
assertCheck(checks, 'shadow legacy proxies external font URL through Roll20',
  legacyShadowUserCss.includes('https://imgsrv.roll20.net/?src=https%3A%2F%2Ffonts.example.test%2Fsynthetic-runtime.woff2'));
assertCheck(checks, 'shadow legacy removes transform declarations', !/transform\s*:/i.test(legacyShadowUserCss));
assertCheck(checks, 'shadow legacy removes animation declarations', !/animation(?:-[a-z-]+)?\s*:/i.test(legacyShadowUserCss));
assertCheck(checks, 'shadow legacy removes keyframes', !/@(?:-[a-z]+-)?keyframes\b/i.test(legacyShadowUserCss));
assertCheck(checks, 'shadow legacy inlines CSS var', includesText(legacyShadowUserCss, 'color: #c02030'));
assertCheck(checks, 'shadow legacy preserves stable CSS', includesText(legacyShadowUserCss, 'padding: 8px') && includesText(legacyShadowUserCss, 'color: red'));
assertCheck(checks, 'shadow base mirrors current Roll20 text input height', /\.charsheet input\[type="text"\]\s*{\s*height:\s*26px;/i.test(modernShadowBaseCss));
assertCheck(checks, 'shadow base mirrors Roll20 roll-button runtime defaults', /button\[type="roll"\][\s\S]*?border-radius:\s*4px;[\s\S]*?color:\s*#333;[\s\S]*?vertical-align:\s*middle;/i.test(modernShadowBaseCss));
assertCheck(checks, 'shadow base mirrors Roll20 repeating-control height', /\.charsheet \.repcontrol\s*{\s*min-height:\s*27\.6px;/i.test(modernShadowBaseCss));
assertCheck(checks, 'shadow repeating controls use Roll20 btn class', modernParts.html.includes('class="btn repcontrol_edit"') && modernParts.html.includes('class="btn repcontrol_add"'));
assertCheck(checks, 'shadow mount applies Roll20 runtime button classes', readFileSync(join(REPO_ROOT, 'lib/preview/shadowMount.ts'), 'utf8').includes("button.classList.add('ui-draggable')"));
assertCheck(checks, 'shadow mount applies annotated Roll20 autocalc values', readFileSync(join(REPO_ROOT, 'lib/preview/shadowMount.ts'), 'utf8').includes('applyAnnotatedRoll20Autocalc(container)'));
assertCheck(checks, 'shadow dialog context does not override disabled input paint', !/input\[disabled\]|input\[readonly\]|select\[disabled\]/i.test(modernShadowDialogCss));
assertCheck(checks, 'shadow dialog context does not override sheet backgrounds', !/\.charsheet\s*{[\s\S]*?background-(?:repeat|position)/i.test(modernShadowDialogCss));
assertCheck(checks, 'shadow modern does not force legacy disabled input paint', modernShadowLegacyInputCss === '');
assertCheck(checks, 'shadow legacy applies overridable disabled input paint', /input\[disabled\][\s\S]*?background-color:\s*rgba\(255,\s*255,\s*255,\s*0\)/i.test(legacyShadowInputCss) && !/!important/i.test(legacyShadowInputCss));
assertCheck(checks, 'live patch keeps modern and legacy font URL policies separate',
  modernAtomicPatch.styles['r20-user'].includes('https://fonts.example.test/synthetic-runtime.woff2')
    && !modernAtomicPatch.styles['r20-user'].includes('https://imgsrv.roll20.net/?src=')
    && legacyAtomicPatch.styles['r20-user'].includes('https://imgsrv.roll20.net/?src=https%3A%2F%2Ffonts.example.test%2Fsynthetic-runtime.woff2'));

const mainAreaToolbar = readFileSync(join(REPO_ROOT, 'components/editor/MainAreaToolbar.tsx'), 'utf8');
const editorShell = readFileSync(join(REPO_ROOT, 'components/editor/EditorShell.tsx'), 'utf8');
const previewMain = readFileSync(join(REPO_ROOT, 'components/editor/PreviewMain.tsx'), 'utf8');
const editCanvas = readFileSync(join(REPO_ROOT, 'components/editor/EditCanvas.tsx'), 'utf8');
const renderContract = readFileSync(join(REPO_ROOT, 'lib/preview/renderContract.ts'), 'utf8');
const previewStore = readFileSync(join(REPO_ROOT, 'lib/stores/previewStore.ts'), 'utf8');
const perfHook = readFileSync(join(REPO_ROOT, 'lib/perf/hook.ts'), 'utf8');
assertCheck(checks, 'mounted main toolbar exposes modern and legacy modes',
  mainAreaToolbar.includes('data-testid="roll20-mode-control"')
    && mainAreaToolbar.includes('data-testid={`roll20-mode-${key}`}')
    && mainAreaToolbar.includes('setRoll20CompatibilityMode'));
assertCheck(checks, 'mounted main toolbar exposes the shared Roll20 document language',
  mainAreaToolbar.includes('data-testid="roll20-document-language"')
    && mainAreaToolbar.includes('setDocumentLanguage(event.target.value)')
    && /documentLanguage:\s*'en'/.test(previewStore));
assertCheck(checks, 'editor shell mounts the main toolbar', editorShell.includes('<MainAreaToolbar />'));
assertCheck(checks, 'preview store defaults to modern class handling', /sanitize:\s*false/.test(previewStore));
assertCheck(checks, 'preview store defaults legacy sanitize off', /legacyCssSanitize:\s*false/.test(previewStore));
assertCheck(checks, 'legacy mode atomically enables prefix and CSS sanitize', /sanitize:\s*mode === 'legacy'[\s\S]*legacyCssSanitize:\s*mode === 'legacy'/.test(previewStore));
assertCheck(checks, 'preview store exposes no independent compatibility mutators',
  !previewStore.includes('setSanitize:') && !previewStore.includes('setLegacyCssSanitize:'));
assertCheck(checks, 'preview and edit consume the same atomic render contract input',
  previewMain.includes('compatibilityMode,')
    && editCanvas.includes('compatibilityMode,')
    && !previewMain.includes('const sanitize = usePreviewStore')
    && !editCanvas.includes('const sanitize = usePreviewStore'));
assertCheck(checks, 'iframe, live patch, and Shadow serializers share one prepared render contract',
  renderContract.includes('export function prepareSheetRenderContract')
    && (readFileSync(join(REPO_ROOT, 'lib/preview/buildDoc.ts'), 'utf8').match(/prepareSheetRenderContract\(opts\)/g) ?? []).length === 3);
assertCheck(checks, 'visual smoke hook exposes the same atomic compatibility mode action',
  perfHook.includes('setRoll20CompatibilityMode: (mode: Roll20CompatibilityMode) => void')
    && perfHook.includes('usePreviewStore.getState().setRoll20CompatibilityMode(mode)'));
assertCheck(checks, 'legacy compatibility smoke alias preserves the atomic mode invariant',
  perfHook.includes("setRoll20CompatibilityMode(enabled ? 'legacy' : 'modern')")
    && !perfHook.includes('usePreviewStore.getState().setLegacyCssSanitize(enabled)'));

const report = {
  generatedAt: new Date().toISOString(),
  scope: 'local iframe/shadow preview legacy CSS toggle smoke; not actual Roll20 visual parity',
  pass: checks.every((check) => check.pass),
  checks,
  bytes: {
    modernDoc: Buffer.byteLength(modernDoc),
    legacyDoc: Buffer.byteLength(legacyDoc),
    modernPartsCss: Buffer.byteLength(modernParts.css),
    legacyPartsCss: Buffer.byteLength(legacyParts.css),
  },
};

function renderMarkdown(data) {
  const lines = [
    '# Roll20 Legacy Preview Smoke',
    '',
    `Generated: ${data.generatedAt}`,
    '',
    'Scope: local iframe/shadow preview toggle smoke. This does not prove actual Roll20 visual parity.',
    '',
    `Status: ${data.pass ? 'PASS' : 'FAIL'}`,
    '',
    '| Check | Status |',
    '| --- | --- |',
  ];
  for (const check of data.checks) {
    lines.push(`| ${check.name} | ${check.pass ? 'PASS' : 'FAIL'} |`);
  }
  lines.push('');
  lines.push('Next check: compare modern mode in Custom Sheet Sandbox and legacy mode in a dedicated test room; the Sandbox runtime cannot be assumed to honor sheet.json legacy metadata.');
  return `${lines.join('\n')}\n`;
}

if (!noReport) {
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(join(reportDir, 'legacy-preview-smoke-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  writeFileSync(join(reportDir, 'legacy-preview-smoke-results.md'), renderMarkdown(report), 'utf8');
}
console.log(JSON.stringify({
  pass: report.pass,
  report: noReport ? null : join(reportDir, 'legacy-preview-smoke-results.md'),
}));
if (!report.pass) process.exitCode = 1;
