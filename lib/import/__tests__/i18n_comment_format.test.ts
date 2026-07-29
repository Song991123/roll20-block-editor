/**
 * i18n comment-format round-trip parity test (Stage 2 fix).
 *
 * Anchor:
 *   - docs/validation/verify/emit_full_roundtrip_stage2.md (D&D 5e 측정에서
 *     emit `<!-- i18n[ko] "k": "v" -->` ↔ importer flat-parser mismatch 로
 *     escape 누적이 확인됨)
 *   - lib/blocks/i18n.ts §7 (r20_locale_value emit format)
 *   - lib/import/i18n_extractor.ts parseComments
 *
 * 시스템 specific 0 — 모든 라인은 일반 placeholder.
 */

import { importSheet } from '../index';

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

function eq(a: unknown, b: unknown, msg: string): void {
  if (a !== b) throw new Error(`${msg}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`);
}

function testCommentSingle(): void {
  const i18n = `<!-- i18n[ko] "title.sheet": "캐릭터 시트" -->`;
  const r = importSheet({ i18n });
  assert(r.i18n.includes('r20_locale_value'), 'should produce r20_locale_value');
  assert(r.i18n.includes('>title.sheet<'), 'KEY field preserved');
  assert(r.i18n.includes('>캐릭터 시트<'), 'VALUE field preserved');
  assert(r.i18n.includes('>ko<'), 'LANG field preserved');
  eq(r.stats.i18nKeys, 1, 'one i18n key parsed');
}

function testCommentMultiLang(): void {
  const i18n = [
    `<!-- i18n[ko] "title.sheet": "D&D 5e 캐릭터 시트" -->`,
    `<!-- i18n[en] "title.sheet": "D&D 5e Character Sheet" -->`,
    `<!-- i18n[ko] "title.abilities": "능력치" -->`,
    `<!-- i18n[en] "title.abilities": "Ability Scores" -->`,
  ].join('\n');
  const r = importSheet({ i18n });
  eq(r.stats.i18nKeys, 4, 'four i18n entries');
  // Each entry retains its own LANG.
  assert(r.i18n.match(/>ko</g)?.length === 2, 'two ko entries');
  assert(r.i18n.match(/>en</g)?.length === 2, 'two en entries');
}

function testCommentCustomLocales(): void {
  const i18n = [
    `<!-- i18n[fr] "title.sheet": "Fiche de personnage" -->`,
    `<!-- i18n[de-DE] "title.sheet": "Charakterbogen" -->`,
    `<!-- i18n[zh-Hant] "title.sheet": "角色卡" -->`,
  ].join('\n');
  const r = importSheet({ i18n });
  eq(r.stats.i18nKeys, 3, 'custom locale entries are recovered');
  assert(r.i18n.match(/>fr</g)?.length === 1, 'fr locale preserved');
  assert(r.i18n.match(/>de-DE</g)?.length === 1, 'regional locale preserved');
  assert(r.i18n.match(/>zh-Hant</g)?.length === 1, 'script locale preserved');
}

function testCommentEscapeNoAccumulation(): void {
  // 이전 버그: 2회 round-trip 후 key=`--i18nkotitle.sheet`, value=`"v" -->`
  // 가 박혔음. 이번 fix 후 escape 가 자라지 않아야.
  const i18n = `<!-- i18n[ko] "title.sheet": "D&D 5e \\"Title\\"" -->`;
  const r = importSheet({ i18n });
  eq(r.stats.i18nKeys, 1, 'one entry');
  // jsonUnescape 가 backslash-quote 를 디코드 → field 안엔 raw `"` 들어 있음.
  // XML serializer 가 그걸 `&quot;` 로 escape 하므로 r.i18n 안에선 `&quot;` 형태.
  assert(
    r.i18n.includes('D&amp;D 5e "Title"')
      || r.i18n.includes('D&amp;D 5e &quot;Title&quot;')
      || r.i18n.includes('D&D 5e "Title"'),
    'inner quotes decoded',
  );
  // Key 가 garbage (`--i18nkotitle.sheet`) 가 아니어야.
  assert(!r.i18n.includes('--i18nko'), 'no comment-token bleed into key');
  assert(r.i18n.includes('>title.sheet<'), 'clean KEY field');
}

function testCommentMixedWithJson(): void {
  // Robustness — comment 우선이지만, comment 없으면 JSON fallback 여전히 작동.
  const i18n = `{"title.sheet": "Character Sheet", "title.skills": "Skills"}`;
  const r = importSheet({ i18n });
  eq(r.stats.i18nKeys, 2, 'JSON path still works');
  assert(r.i18n.includes('r20_locale_value'), 'r20_locale_value produced');
}

function testCommentMalformedFallthrough(): void {
  // 형식 안 맞는 입력은 flat parser 로 fall through.
  const i18n = `key1=value1\nkey2=value2`;
  const r = importSheet({ i18n });
  eq(r.stats.i18nKeys, 2, 'flat parser fallback');
}

function testCommentChainEmit(): void {
  // emit 측 24개 chain (top-level next-chain walking) 검증은 Blockly runtime
  // 의존이라 본 노드-only test 에서 직접 안 함. 대신 emit format 의 동일성을
  // text-level 로 입증 — 24 개 chain emit 결과 (목 데이터) 이 importer 의
  // matched 수와 동일해야.
  const lines = [];
  for (let i = 0; i < 24; i++) {
    lines.push(`<!-- i18n[ko] "key.${i}": "값 ${i}" -->`);
  }
  const r = importSheet({ i18n: lines.join('\n') });
  eq(r.stats.i18nKeys, 24, '24 chain entries fully recovered');
}

const tests = [
  ['comment single', testCommentSingle],
  ['comment multi-lang', testCommentMultiLang],
  ['comment custom locales', testCommentCustomLocales],
  ['comment escape no-accumulation', testCommentEscapeNoAccumulation],
  ['comment + json fallthrough', testCommentMixedWithJson],
  ['comment malformed → flat fallthrough', testCommentMalformedFallthrough],
  ['comment chain (24 entries)', testCommentChainEmit],
] as const;

let passed = 0;
for (const [name, fn] of tests) {
  try {
    fn();
    console.log(`  ok    ${name}`);
    passed++;
  } catch (e) {
    console.error(`  FAIL  ${name}: ${(e as Error).message}`);
  }
}
console.log(`\n${passed}/${tests.length} passed`);
if (passed !== tests.length) throw new Error(`${tests.length - passed} test(s) failed`);
