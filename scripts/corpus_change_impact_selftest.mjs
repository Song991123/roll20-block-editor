import assert from 'node:assert/strict';
import {
  classifyCorpusCodeImpact,
  corpusRowAffected,
} from './lib/corpus_change_impact.mjs';

const modernHtml = {
  mode: 'modern',
  artifacts: { html: true, css: true, translation: false, worker: false },
  features: ['html:input-controls'],
};
const legacyCss = {
  mode: 'legacy',
  artifacts: { html: true, css: true, translation: false, worker: false },
  features: ['css:at-rule:keyframes'],
};
const modernTranslation = {
  mode: 'modern',
  artifacts: { html: true, css: false, translation: true, worker: false },
  features: ['translation:flat-map'],
};

const docsOnly = classifyCorpusCodeImpact(['docs/qa/39_local_corpus_harness.md']);
assert.equal(docsOnly.scope, 'none');
assert.equal(corpusRowAffected(docsOnly, modernHtml), false);

const legacySanitize = classifyCorpusCodeImpact(['lib/emit/sanitize.ts']);
assert.equal(legacySanitize.scope, 'selective');
assert.equal(corpusRowAffected(legacySanitize, legacyCss), true);
assert.equal(corpusRowAffected(legacySanitize, modernHtml), false);

const htmlImport = classifyCorpusCodeImpact(['lib/import/block_matcher.ts']);
assert.equal(corpusRowAffected(htmlImport, modernHtml), true);
assert.equal(corpusRowAffected(htmlImport, modernTranslation), true);

const translationImport = classifyCorpusCodeImpact(['lib/import/i18n_parser.ts']);
assert.equal(corpusRowAffected(translationImport, modernTranslation), true);
assert.equal(corpusRowAffected(translationImport, modernHtml), false);

const runtimeUnknown = classifyCorpusCodeImpact(['components/PreviewMain.tsx']);
assert.equal(runtimeUnknown.scope, 'all');
assert.equal(corpusRowAffected(runtimeUnknown, modernHtml), true);

const harnessRuntime = classifyCorpusCodeImpact(['scripts/lib/corpus_change_impact.mjs']);
assert.equal(harnessRuntime.scope, 'all');

console.log('corpus change impact self-test PASS');
