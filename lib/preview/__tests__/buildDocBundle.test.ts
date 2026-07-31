import { strict as assert } from 'node:assert';
import {
  buildSheetDoc,
  buildSheetLiveBundle,
  buildSheetLivePatch,
  buildSheetParts,
  buildSheetRenderBundle,
} from '../buildDoc.ts';
import { roll20BaseIframeCss, roll20BaseShadowCss } from '../roll20_base.ts';

const options = {
  html: '<section class="card"><span data-i18n="name">Name</span></section>',
  css: '.card { background-image: url("https://images.example.test/card.png"); }',
  i18n: JSON.stringify({ name: 'Character' }),
  compatibilityMode: 'legacy' as const,
  documentLanguage: 'en',
};

const bundle = buildSheetRenderBundle(options);
const bundleWithParts = buildSheetRenderBundle(options, { includeParts: true });
const liveBundle = buildSheetLiveBundle(options, { includeParts: true });
const cssOnlyChange = buildSheetRenderBundle({ ...options, css: '.card { color: red; }' });
const htmlChange = buildSheetRenderBundle({ ...options, html: '<section class="card">Changed</section>' });
const scriptBundle = buildSheetRenderBundle({
  ...options,
  html: '<section class="card">Sheet</section><script src="page-runtime.js">window.pageRuntime = true;</script><script type="text/worker">on("sheet:opened", function () { setAttrs({ hp: 10 }); });</script>',
});
const scriptParts = buildSheetParts({
  ...options,
  html: '<section class="card">Sheet</section><script>window.pageRuntime = true;</script><script type="text/worker">on("sheet:opened", function () { setAttrs({ hp: 10 }); });</script>',
});
const sandboxScriptBundle = buildSheetRenderBundle({
  ...options,
  compatibilityMode: 'modern',
  roll20SandboxSanitize: true,
  html: '<section class="card">Sheet</section><script>window.pageRuntime = true;</script><script type="text/worker">on("sheet:opened", function () { setAttrs({ hp: 10 }); });</script>',
});
const rendererModel = ['input', 'flow', '27'].join('-') as 'input-flow-27';
const rendererModelBundle = buildSheetRenderBundle({
  ...options,
  roll20RendererModel: rendererModel,
  css: '.card input[type="text"] { min-height: 9px; }',
}, { includeParts: true });

assert.equal(bundle.doc, buildSheetDoc(options), 'bundled document matches the standalone builder');
assert.deepEqual(
  bundle.livePatch,
  buildSheetLivePatch(options),
  'bundled live patch matches the standalone builder',
);
assert.deepEqual(
  bundleWithParts.parts,
  buildSheetParts(options),
  'optional Shadow parts match the standalone builder without preparing twice',
);
assert.deepEqual(liveBundle.livePatch, bundleWithParts.livePatch, 'live bundle keeps the shared live patch contract');
assert.deepEqual(liveBundle.parts, bundleWithParts.parts, 'live bundle keeps the shared Shadow parts contract');
assert.match(
  bundle.livePatch.styles['r20-user'],
  /\.charsheet\s+\.sheet-card\s*\{/,
  'legacy preview CSS uses the observed Roll20 sheet scope',
);
assert.match(bundle.doc, new RegExp(`data-r20-html-key="${bundle.livePatch.htmlKey}"`));
assert.equal(
  cssOnlyChange.livePatch.htmlKey,
  bundle.livePatch.htmlKey,
  'CSS-only updates preserve the HTML key and can skip root replacement',
);
assert.notEqual(
  cssOnlyChange.livePatch.sourceKey,
  bundle.livePatch.sourceKey,
  'CSS-only updates still produce a distinct content identity for the live bridge',
);
assert.notEqual(
  htmlChange.livePatch.htmlKey,
  bundle.livePatch.htmlKey,
  'structural HTML updates force the conservative root replacement path',
);
assert.ok(
  bundle.livePatch.sourceKey.length < 2000,
  'live bridge identity does not embed the rendered document payload',
);
assert.doesNotMatch(
  scriptBundle.doc,
  /page-runtime\.js|window\.pageRuntime/,
  'ordinary page scripts do not execute in the preview iframe',
);
assert.match(
  scriptBundle.doc,
  /type="text\/worker"[\s\S]*setAttrs\(\{ hp: 10 \}\)/,
  'Roll20 worker scripts remain available to the preview worker bridge',
);
assert.doesNotMatch(
  scriptBundle.livePatch.html,
  /page-runtime\.js|window\.pageRuntime/,
  'ordinary page scripts are omitted from live preview patches',
);
assert.doesNotMatch(
  scriptParts.html,
  /window\.pageRuntime/,
  'the fallback Shadow parts keep the same inert page-script boundary',
);
assert.doesNotMatch(
  sandboxScriptBundle.doc,
  /<section\b/i,
  'Sandbox HTML allow-list removes unsupported authored tags',
);
assert.doesNotMatch(
  sandboxScriptBundle.doc,
  /page-runtime|window\.pageRuntime/,
  'Sandbox preview keeps ordinary page JavaScript inert',
);
const iframeStyleOrder = [
  'id="r20-runtime"',
  'id="r20-layer-filter"',
  'id="r20-renderer-model"',
  'id="r20-user"',
  'id="r20-preview-hidden"',
].map((marker) => bundle.doc.indexOf(marker));
assert(
  iframeStyleOrder.every((index, i) => index >= 0 && (i === 0 || index > iframeStyleOrder[i - 1])),
  `iframe CSS source order must keep renderer model before user CSS: ${iframeStyleOrder.join(',')}`,
);
const shadowStyleOrder = [
  'r20-style-source:app-preview-runtime',
  'r20-style-source:app-layer-filter',
  'r20-style-source:roll20-renderer-model',
  'r20-style-source:sheet-user-css',
  'r20-style-source:preview-hidden-runtime',
].map((marker) => rendererModelBundle.parts?.css.indexOf(marker) ?? -1);
assert(
  shadowStyleOrder.every((index, i) => index >= 0 && (i === 0 || index > shadowStyleOrder[i - 1])),
  `Shadow CSS source order must keep renderer model before user CSS: ${shadowStyleOrder.join(',')}`,
);
assert.match(
  sandboxScriptBundle.doc,
  /<script type="text\/worker" data-r20-worker-source="[^\"]*setAttrs/,
  'Sandbox preview stores worker source in the inert bridge boundary',
);
assert.match(
  sandboxScriptBundle.doc,
  /function workerSourceOf\(script\)/,
  'worker bridge reads the sanitized source attribute',
);
assert.match(bundle.doc, /var htmlChanged = data\.htmlKey !== lastAppliedHtmlKey/);
assert.match(roll20BaseIframeCss, /\.ui-dialog\s+\.charsheet/);
assert.ok(roll20BaseShadowCss.length > 0, 'Shadow baseline is generated');
assert.match(bundle.doc, /#dialog-window\.r20-preview-dialog/);
assert.match(
  bundle.doc,
  /<div class="ui-dialog ui-widget ui-widget-content ui-corner-all r20-preview-dialog"[^>]*id="dialog-window"/,
  'preview keeps the Roll20 dialog wrapper as the render surface boundary',
);
assert.match(
  bundle.doc,
  /<div class="charactersheet tab-pane active charsheet lang-undefined">/,
  'preview keeps the Roll20 sheet root class contract',
);
assert.match(
  bundle.doc,
  /data-r20-render-ready="0"/,
  'preview starts with an explicit render-readiness gate',
);
assert.match(
  bundle.doc,
  /function scheduleRenderReady\(\)[\s\S]*?data-r20-render-ready/,
  'the iframe marks the same render surface ready only after its visual assets settle',
);
assert.match(
  bundle.doc,
  /type: 'r20:render-ready'/,
  'render readiness is exposed through the iframe bridge for verification and UI gating',
);
assert.match(
  bundle.doc,
  /#dialog-window\.r20-preview-dialog > \.dialog > \.tab-content > \.sheetform[\s\S]*?width: 100% !important/,
  'Roll20 form keeps the iframe/dialog width',
);
assert.match(
  bundle.doc,
  /#dialog-window\.r20-preview-dialog > \.dialog > \.tab-content > \.sheetform > \.charactersheet\.charsheet[\s\S]*?width: auto;[\s\S]*?height: auto;/,
  'authored sheet root keeps its intrinsic dimensions',
);
assert.doesNotMatch(
  bundle.doc,
  /#dialog-window\.r20-preview-dialog > \.dialog > \.tab-content > \.sheetform > \.charactersheet\.charsheet[\s\S]*?width: auto !important/,
  'app baseline must not override an authored sheet width',
);
assert.match(
  bundle.doc,
  /#dialog-window \.dialog\.largedialog[\s\S]*?padding: 0 20px !important/,
  'Roll20 dialog keeps the measured horizontal content inset',
);
assert.match(
  roll20BaseIframeCss,
  /\.ui-dialog\s+\.charsheet\s*\{[\s\S]*?padding:\s*10px/,
  'Roll20 iframe baseline keeps the actual sheet padding contract',
);
assert.match(
  roll20BaseIframeCss,
  /\*\s*,\s*\*::before\s*,\s*\*::after\s*\{[\s\S]*?box-sizing:\s*content-box/,
  'late Roll20 base rules keep the content-box contract',
);
assert.match(
  roll20BaseIframeCss,
  /body\s*\{[^}]*font-size:\s*13px/,
  'Roll20 iframe baseline keeps the 13px body default',
);
assert.match(bundle.doc, /function patchRootHtml\(html\)/);
assert.match(
  bundle.doc,
  /var keyedIndexes = Object\.create\(null\)[\s\S]*?var keyedCursors = Object\.create\(null\)[\s\S]*?keyedIndexes\[currentKey\]\.push\(keyedIndex\)/,
  'keyed structural patches build one sibling index before reconciliation',
);
assert.doesNotMatch(
  bundle.doc,
  /if \(nextKey\) \{[\s\S]*?for \(var k = 0; k < currentChildren\.length;/,
  'keyed reconciliation does not rescan every current sibling for each next keyed node',
);
assert.match(
  bundle.doc,
  /current\.nodeType === 3 \|\| current\.nodeType === 8[\s\S]*?current\.nodeValue !== next\.nodeValue[\s\S]*?current\.nodeValue = next\.nodeValue/,
  'keyed morph updates text and comment node values',
);
assert.match(bundle.doc, /data-r20-structural-patches/);
assert.match(
  bundle.doc,
  /var sheetWorkerEventQueue = \[\][\s\S]*?var sheetWorkerDispatching = false/,
  'worker events use a queued dispatcher instead of recursive handler calls',
);
assert.match(
  bundle.doc,
  /var changedKeys = \[\][\s\S]*?if \(writeSheetAttr\(k, values\[k\]\)\) changedKeys\.push\(k\)/,
  'worker setAttrs dispatches change events only for changed values',
);
assert.match(bundle.doc, /if \(style\.textContent !== css\) style\.textContent = css/);
assert.match(
  bundle.doc,
  /var rootHeight = Number\(sheet\.getBoundingClientRect\(\)\.height\) \|\| 0;[\s\S]*?Math\.max\(rootHeight, box\.height\)/,
  'iframe height uses the authored root or overflowing descendant bound',
);
assert.doesNotMatch(
  bundle.doc,
  /box\.height \+ 24/,
  'iframe height does not add a fixed blank tail to every sheet',
);
assert.match(bundle.doc, /r20:edit-flow-target/);
assert.match(bundle.doc, /r20:block-type-drag/);
assert.match(bundle.doc, /application\/x-r20-block-type/);
assert.match(bundle.doc, /r20:layer-drag/);
assert.match(bundle.doc, /application\/x-r20-layer-block/);
assert.match(bundle.doc, /r20:edit-optimistic-flow-finalize/);
assert.match(bundle.doc, /rollbackOptimisticFlowMove/);
assert.match(bundle.doc, /selectedEditBlockIds/);
assert.match(bundle.doc, /selectedNodes/);
assert.match(bundle.doc, /selection: selection\.length > 1/);
assert.match(bundle.doc, /r20:edit-apply-chunk-start/);
assert.match(bundle.doc, /r20:edit-apply-chunk/);
assert.match(bundle.doc, /pendingLivePatchChunks/);
assert.match(bundle.doc, /data-r20-last-optimistic-epoch/);
assert.match(bundle.doc, /style\.position === 'fixed' \|\| style\.position === 'sticky'/);
assert.match(bundle.doc, /!isFinite\(rect\.right\) \|\| !isFinite\(rect\.bottom\)/);

console.log('buildDoc bundle tests: PASS');
