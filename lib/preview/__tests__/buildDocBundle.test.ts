import { strict as assert } from 'node:assert';
import {
  buildSheetDoc,
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
const cssOnlyChange = buildSheetRenderBundle({ ...options, css: '.card { color: red; }' });
const htmlChange = buildSheetRenderBundle({ ...options, html: '<section class="card">Changed</section>' });

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
assert.match(bundle.doc, new RegExp(`data-r20-html-key="${bundle.livePatch.htmlKey}"`));
assert.equal(
  cssOnlyChange.livePatch.htmlKey,
  bundle.livePatch.htmlKey,
  'CSS-only updates preserve the HTML key and can skip root replacement',
);
assert.notEqual(
  htmlChange.livePatch.htmlKey,
  bundle.livePatch.htmlKey,
  'structural HTML updates force the conservative root replacement path',
);
assert.match(bundle.doc, /var htmlChanged = data\.htmlKey !== lastAppliedHtmlKey/);
assert.match(roll20BaseIframeCss, /\.ui-dialog\s+\.charsheet/);
assert.ok(roll20BaseShadowCss.length > 0, 'Shadow baseline is generated');
assert.match(bundle.doc, /#dialog-window\.r20-preview-dialog/);
assert.match(bundle.doc, /function patchRootHtml\(html\)/);
assert.match(bundle.doc, /data-r20-structural-patches/);
assert.match(bundle.doc, /if \(style\.textContent !== css\) style\.textContent = css/);
assert.match(bundle.doc, /r20:edit-flow-target/);
assert.match(bundle.doc, /r20:edit-optimistic-flow-finalize/);
assert.match(bundle.doc, /rollbackOptimisticFlowMove/);
assert.match(bundle.doc, /r20:edit-apply-chunk-start/);
assert.match(bundle.doc, /r20:edit-apply-chunk/);
assert.match(bundle.doc, /pendingLivePatchChunks/);
assert.match(bundle.doc, /data-r20-last-optimistic-epoch/);
assert.match(bundle.doc, /style\.position === 'fixed' \|\| style\.position === 'sticky'/);
assert.match(bundle.doc, /!isFinite\(rect\.right\) \|\| !isFinite\(rect\.bottom\)/);

console.log('buildDoc bundle tests: PASS');
