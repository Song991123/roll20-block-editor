import assert from 'node:assert/strict';

import {
  normalizeTranslationForRoll20,
  parseTranslationMap,
} from '../payload.ts';

const json = '{"name":"Name","hp":10,"empty":null}';
assert.deepEqual(parseTranslationMap(json), { name: 'Name', hp: '10' });
assert.deepEqual(JSON.parse(normalizeTranslationForRoll20('["not", "a", "map"]')), {});
assert.deepEqual(JSON.parse(normalizeTranslationForRoll20('{"ko":{"name":"이름"}}')), {});
assert.deepEqual(JSON.parse(normalizeTranslationForRoll20('{"name":"Name","nested":{"bad":true}}')), {
  name: 'Name',
});

const comments = [
  '<!-- i18n[ko] "": "empty-key value" -->',
  '<!-- i18n[ko] "name-u": "이름" -->',
  '<!-- i18n[ko] "quote": "그가 \\"안녕\\"이라고 말했다" -->',
].join('\n');
assert.deepEqual(parseTranslationMap(comments), {
  '': 'empty-key value',
  'name-u': '이름',
  quote: '그가 "안녕"이라고 말했다',
});
assert.deepEqual(JSON.parse(normalizeTranslationForRoll20(comments)), {
  '': 'empty-key value',
  'name-u': '이름',
  quote: '그가 "안녕"이라고 말했다',
});

const looseFlatJson = '{"label":"A "quoted" label","name":"Name"}';
assert.deepEqual(parseTranslationMap(looseFlatJson), {
  label: 'A "quoted" label',
  name: 'Name',
});
assert.deepEqual(JSON.parse(normalizeTranslationForRoll20(looseFlatJson)), {
  label: 'A "quoted" label',
  name: 'Name',
});

assert.deepEqual(parseTranslationMap('not valid translation data'), {});
assert.equal(normalizeTranslationForRoll20('not valid translation data'), '{}');

console.log('translation payload tests: PASS');
