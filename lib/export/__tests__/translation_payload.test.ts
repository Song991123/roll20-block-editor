import assert from 'node:assert/strict';

import {
  normalizeTranslationForRoll20,
  parseTranslationMap,
} from '../payload.ts';

const json = '{"name":"Name","hp":10,"empty":null}';
assert.deepEqual(parseTranslationMap(json), { name: 'Name', hp: '10' });

const comments = [
  '<!-- i18n[ko] "name-u": "이름" -->',
  '<!-- i18n[ko] "quote": "그가 \\"안녕\\"이라고 말했다" -->',
].join('\n');
assert.deepEqual(parseTranslationMap(comments), {
  'name-u': '이름',
  quote: '그가 "안녕"이라고 말했다',
});
assert.deepEqual(JSON.parse(normalizeTranslationForRoll20(comments)), {
  'name-u': '이름',
  quote: '그가 "안녕"이라고 말했다',
});

assert.deepEqual(parseTranslationMap('not valid translation data'), {});

console.log('translation payload tests: PASS');
