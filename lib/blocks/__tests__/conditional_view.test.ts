/**
 * conditional_view_emit.ts 의 순수 helper 함수 단위 테스트.
 *
 * Anchor: docs/spec/19_sanitize_and_default_view.md §2.
 *
 * Blockly init / generator 는 워크스페이스 mount 필요 → 본 phase 측정 불가.
 * 본 테스트는 emit-only 모듈 (Blockly 의존 0) 만 검증.
 */

import {
  emitToggleCss,
  escapeHtmlAttr,
  escapeHtmlText,
  sanitizeIdToken,
} from '../conditional_view_emit.ts';

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

function expectContains(haystack: string, needle: string, msg: string): void {
  assert(haystack.includes(needle), `${msg} — expected to contain "${needle}", got: ${haystack}`);
}

function testSanitizeBasic(): void {
  assert(sanitizeIdToken('show-pulp') === 'show-pulp', 'pass-through valid id');
  assert(sanitizeIdToken('A_b-1') === 'A_b-1', 'underscore + dash + digit ok');
}

function testSanitizeStartsWithDigit(): void {
  const r = sanitizeIdToken('1abc');
  assert(r.startsWith('t-'), `digit prefix wrapped, got ${r}`);
}

function testSanitizeInvalidChars(): void {
  const r = sanitizeIdToken('show@pulp!');
  assert(!r.includes('@'), 'no @ in result');
  assert(!r.includes('!'), 'no ! in result');
}

function testSanitizeEmpty(): void {
  assert(sanitizeIdToken('') === 'toggle', 'empty -> fallback');
  assert(sanitizeIdToken('   ') === 'toggle', 'whitespace -> fallback');
}

function testEscapeAttr(): void {
  assert(escapeHtmlAttr('a"b') === 'a&quot;b', 'quote escaped');
  assert(escapeHtmlAttr('<x>') === '&lt;x&gt;', 'lt gt escaped');
  assert(escapeHtmlAttr('a&b') === 'a&amp;b', 'amp escaped');
}

function testEscapeText(): void {
  assert(escapeHtmlText('a<b>c') === 'a&lt;b&gt;c', 'lt gt escaped');
  assert(escapeHtmlText('a&b') === 'a&amp;b', 'amp escaped');
}

function testEmitCssEmpty(): void {
  assert(emitToggleCss([]) === '', 'empty array -> empty string');
}

function testEmitCssBasic(): void {
  const css = emitToggleCss(['show-pulp']);
  expectContains(css, '.r20-toggle-on--show-pulp', 'on class generated');
  expectContains(css, '.r20-toggle-off--show-pulp', 'off class generated');
  expectContains(css, '#show-pulp:checked', ':checked selector generated');
  expectContains(css, 'display: none', 'hidden default');
  expectContains(css, 'display: block', 'shown after toggle');
}

function testEmitCssMultiple(): void {
  const css = emitToggleCss(['a', 'b']);
  expectContains(css, '#a:checked', 'a id present');
  expectContains(css, '#b:checked', 'b id present');
  expectContains(css, '.r20-toggle-on--a', 'a on class');
  expectContains(css, '.r20-toggle-on--b', 'b on class');
}

function testEmitCssDedupe(): void {
  const css = emitToggleCss(['x', 'x', 'x']);
  // ID 당 4 줄 emit — base on / base off / :checked on / :checked off.
  // 3 번 입력했어도 ruleset 1 회. base on 룰 줄을 정확 매칭해서 dedup 확인.
  const baseMatches = css.match(/^\.r20-toggle-on--x\s+\{\s*display:\s*none/gm) ?? [];
  assert(baseMatches.length === 1, `dedup base on expected 1, got ${baseMatches.length}`);
  const baseOff = css.match(/^\.r20-toggle-off--x\s+\{\s*display:\s*block/gm) ?? [];
  assert(baseOff.length === 1, `dedup base off expected 1, got ${baseOff.length}`);
}

function testEmitCssSanitizedKey(): void {
  const css = emitToggleCss(['1show']);
  expectContains(css, 't-1show', 'sanitized id used');
}

const tests: Array<[string, () => void]> = [
  ['sanitize basic', testSanitizeBasic],
  ['sanitize starts with digit', testSanitizeStartsWithDigit],
  ['sanitize invalid chars', testSanitizeInvalidChars],
  ['sanitize empty', testSanitizeEmpty],
  ['escapeHtmlAttr', testEscapeAttr],
  ['escapeHtmlText', testEscapeText],
  ['emitCss empty', testEmitCssEmpty],
  ['emitCss basic', testEmitCssBasic],
  ['emitCss multiple', testEmitCssMultiple],
  ['emitCss dedupe', testEmitCssDedupe],
  ['emitCss sanitized key', testEmitCssSanitizedKey],
];

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
if (passed !== tests.length) {
  throw new Error(`${tests.length - passed} test(s) failed`);
}
