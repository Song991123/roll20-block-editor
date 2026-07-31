/**
 * sanitize.ts 단위 테스트.
 *
 * Anchor: docs/spec/19_sanitize_and_default_view.md §1.
 *
 * Node.js standalone — 외부 의존 0 (jsdom X). lib/import/__tests__/basic.test.ts 패턴 동일.
 *
 * 시스템 specific 식별자 0 — 일반 CSS fixture 만.
 */

import { sanitizeForRoll20Legacy } from '../sanitize.ts';

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

function expectContains(haystack: string, needle: string, msg: string): void {
  assert(haystack.includes(needle), `${msg} — expected to contain "${needle}", got: ${haystack}`);
}

function expectNotContains(haystack: string, needle: string, msg: string): void {
  assert(
    !haystack.includes(needle),
    `${msg} — expected NOT to contain "${needle}", got: ${haystack}`,
  );
}

// ---------- transform: scale -> zoom ----------

function testTransformScaleConverted(): void {
  const css = `.x { transform: scale(0.8); color: red; }`;
  const r = sanitizeForRoll20Legacy(css);
  expectContains(r.sanitized, 'zoom: 0.8', 'scale(0.8) -> zoom: 0.8');
  expectNotContains(r.sanitized, 'transform:', 'transform decl gone');
  expectContains(r.sanitized, 'color: red', 'other decls preserved');
  assert(
    r.warnings.some((w) => w.code === 'transform-converted'),
    'transform-converted warning present',
  );
}

function testTransformComplexStripped(): void {
  const css = `.x { transform: rotate(45deg); padding: 10px; }`;
  const r = sanitizeForRoll20Legacy(css);
  expectNotContains(r.sanitized, 'transform', 'complex transform stripped');
  expectNotContains(r.sanitized, 'rotate', 'rotate stripped');
  expectContains(r.sanitized, 'padding: 10px', 'other decl kept');
  assert(
    r.warnings.some((w) => w.code === 'transform-complex'),
    'transform-complex warning present',
  );
}

function testAnimationStripped(): void {
  const css = `.x { animation: spin 1s linear infinite; color: blue; }`;
  const r = sanitizeForRoll20Legacy(css);
  expectNotContains(r.sanitized, 'animation', 'animation decl removed');
  expectContains(r.sanitized, 'color: blue', 'other decl preserved');
  assert(
    r.warnings.some((w) => w.code === 'animation-stripped'),
    'animation-stripped warning present',
  );
}

function testAnimationDelayStripped(): void {
  const css = `.x { animation-delay: 1s; animation-duration: 2s; color: green; }`;
  const r = sanitizeForRoll20Legacy(css);
  expectNotContains(r.sanitized, 'animation', 'animation-* vars removed');
  expectContains(r.sanitized, 'color: green', 'unrelated decl kept');
  const animWarns = r.warnings.filter((w) => w.code === 'animation-stripped');
  assert(animWarns.length >= 2, `expected >=2 animation-stripped, got ${animWarns.length}`);
}

function testKeyframesStripped(): void {
  const css = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .x { color: red; }
  `;
  const r = sanitizeForRoll20Legacy(css);
  expectNotContains(r.sanitized, '@keyframes', '@keyframes block removed');
  expectNotContains(r.sanitized, 'spin', '@keyframes name removed');
  expectContains(r.sanitized, 'color: red', 'unrelated rule kept');
  assert(
    r.warnings.some((w) => w.code === 'keyframes-stripped'),
    'keyframes-stripped warning present',
  );
}

function testWebkitKeyframesStripped(): void {
  const css = `@-webkit-keyframes pulse { 0% { opacity: 0; } 100% { opacity: 1; } }\n.x { color: red; }`;
  const r = sanitizeForRoll20Legacy(css);
  expectNotContains(r.sanitized, 'keyframes', 'vendor-prefixed keyframes removed');
  expectContains(r.sanitized, 'color: red', 'unrelated rule kept');
}

function testVarInline(): void {
  const css = `:root { --primary: #b22; } .x { color: var(--primary); }`;
  const r = sanitizeForRoll20Legacy(css);
  expectContains(r.sanitized, 'color: #b22', 'var inlined');
  expectNotContains(r.sanitized, 'var(', 'no var() left');
  assert(
    r.warnings.some((w) => w.code === 'var-inlined'),
    'var-inlined warning present',
  );
}

function testVarFallback(): void {
  const css = `.x { color: var(--missing, #000); }`;
  const r = sanitizeForRoll20Legacy(css);
  expectContains(r.sanitized, 'color: #000', 'fallback used');
  expectNotContains(r.sanitized, 'var(', 'no var() left');
}

function testVarUnresolved(): void {
  const css = `.x { color: var(--missing); padding: 10px; }`;
  const r = sanitizeForRoll20Legacy(css);
  expectContains(r.sanitized, 'color: initial', 'unresolved -> initial');
  expectContains(r.sanitized, 'padding: 10px', 'other decl kept');
  assert(
    r.warnings.some((w) => w.code === 'var-unresolved'),
    'var-unresolved warning present',
  );
}

function testVarDeclStripped(): void {
  const css = `:root { --primary: #b22; --secondary: #00f; } .x { color: var(--primary); }`;
  const r = sanitizeForRoll20Legacy(css);
  expectNotContains(r.sanitized, '--primary', '--primary decl removed');
  expectNotContains(r.sanitized, '--secondary', '--secondary decl removed');
  expectContains(r.sanitized, '#b22', 'value inlined');
}

function testPositionFixed(): void {
  const css = `.x { position: fixed; top: 0; }`;
  const r = sanitizeForRoll20Legacy(css);
  expectContains(r.sanitized, 'position: absolute', 'fixed -> absolute');
  expectNotContains(r.sanitized, 'fixed', 'fixed value removed');
  expectContains(r.sanitized, 'top: 0', 'other decl kept');
  assert(
    r.warnings.some((w) => w.code === 'position-fixed'),
    'position-fixed warning present',
  );
}

function testPositionSticky(): void {
  const css = `.x { position: sticky; top: 0; }`;
  const r = sanitizeForRoll20Legacy(css);
  expectContains(r.sanitized, 'position: relative', 'sticky -> relative');
  assert(
    r.warnings.some((w) => w.code === 'position-sticky'),
    'position-sticky warning present',
  );
}

function testNoOpSimple(): void {
  const css = `.x { color: red; padding: 10px; margin: 5px auto; }`;
  const r = sanitizeForRoll20Legacy(css);
  expectContains(r.sanitized, 'color: red', 'preserved');
  expectContains(r.sanitized, 'padding: 10px', 'preserved');
  expectContains(r.sanitized, 'margin: 5px auto', 'preserved');
  assert(r.warnings.length === 0, `no warnings expected, got ${r.warnings.length}`);
}

function testEmptyInput(): void {
  const r = sanitizeForRoll20Legacy('');
  assert(r.sanitized === '', 'empty in -> empty out');
  assert(r.warnings.length === 0, 'no warnings on empty');
}

function testIntegration(): void {
  const css = `
    :root {
      --bg: #2a1810;
      --accent: #c89b6f;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .sheet {
      background: var(--bg);
      color: var(--accent);
      transform: scale(0.9);
      animation: fadeIn 0.3s ease-out;
      position: fixed;
      top: 0;
    }
    .other { padding: 8px; color: red; }
  `;
  const r = sanitizeForRoll20Legacy(css);
  expectContains(r.sanitized, '#2a1810', 'var --bg inlined');
  expectContains(r.sanitized, '#c89b6f', 'var --accent inlined');
  expectContains(r.sanitized, 'zoom: 0.9', 'scale -> zoom');
  expectContains(r.sanitized, 'position: absolute', 'fixed -> absolute');
  expectContains(r.sanitized, 'padding: 8px', 'unrelated kept');
  expectContains(r.sanitized, 'color: red', 'unrelated kept');
  expectNotContains(r.sanitized, '@keyframes', 'keyframes gone');
  expectNotContains(r.sanitized, 'fadeIn', 'keyframes name gone');
  expectNotContains(r.sanitized, 'animation:', 'animation decl gone');
  expectNotContains(r.sanitized, 'transform:', 'transform decl gone');
  expectNotContains(r.sanitized, 'var(', 'var() gone');
  expectNotContains(r.sanitized, '--bg', '--bg decl gone');
  expectNotContains(r.sanitized, '--accent', '--accent decl gone');
  const codes = new Set(r.warnings.map((w) => w.code));
  assert(codes.has('keyframes-stripped'), 'keyframes warning');
  assert(codes.has('var-inlined'), 'var-inlined warning');
  assert(codes.has('transform-converted'), 'transform-converted warning');
  assert(codes.has('animation-stripped'), 'animation warning');
  assert(codes.has('position-fixed'), 'position-fixed warning');
  assert(codes.has('var-decl-stripped'), 'var-decl-stripped warning');
}

function testManagedSelectorPreserved(): void {
  const css = `.sheet-r20-node-a.sheet-r20-node-a.sheet-r20-node-a.sheet-r20-node-a, .sheet-r20-node-a { padding: 7px 14px; color: #fff; }`;
  const r = sanitizeForRoll20Legacy(css);
  expectContains(
    r.sanitized,
    '.sheet-r20-node-a.sheet-r20-node-a.sheet-r20-node-a.sheet-r20-node-a, .sheet-r20-node-a',
    'managed specificity selector preserved',
  );
  expectContains(r.sanitized, 'padding: 7px 14px', 'managed padding preserved');
  assert(r.warnings.length === 0, `managed selector should not warn, got ${r.warnings.length}`);
}

function testManagedRolltemplateSelectorPreserved(): void {
  const css = `.sheet-rolltemplate-proof .sheet-r20-node-b.sheet-r20-node-b.sheet-r20-node-b.sheet-r20-node-b, .sheet-rolltemplate-proof .sheet-r20-node-b { background-color: #f8d7e3; padding: 8px 10px; }`;
  const r = sanitizeForRoll20Legacy(css);
  expectContains(
    r.sanitized,
    '.sheet-rolltemplate-proof .sheet-r20-node-b.sheet-r20-node-b.sheet-r20-node-b.sheet-r20-node-b, .sheet-rolltemplate-proof .sheet-r20-node-b',
    'managed rolltemplate scope preserved',
  );
  expectContains(r.sanitized, 'background-color: #f8d7e3', 'managed rolltemplate fill preserved');
  assert(r.warnings.length === 0, `managed rolltemplate selector should not warn, got ${r.warnings.length}`);
}

function testLargeStylesheetLinearBudget(): void {
  const makeCss = (count: number) => Array.from(
    { length: count },
    (_, index) => `.stable-${index} { color: #222; }\n@keyframes pulse-${index} { from { opacity: 0; } to { opacity: 1; } }\n`,
  ).join('');
  const measureMedian = (css: string): { elapsedMs: number; result: ReturnType<typeof sanitizeForRoll20Legacy> } => {
    sanitizeForRoll20Legacy(css);
    const samples: Array<{ elapsedMs: number; result: ReturnType<typeof sanitizeForRoll20Legacy> }> = [];
    for (let round = 0; round < 3; round += 1) {
      const startedAt = performance.now();
      const result = sanitizeForRoll20Legacy(css);
      samples.push({ elapsedMs: performance.now() - startedAt, result });
    }
    samples.sort((a, b) => a.elapsedMs - b.elapsedMs);
    return samples[1];
  };

  const small = measureMedian(makeCss(2000));
  const large = measureMedian(makeCss(4000));
  const growth = large.elapsedMs / Math.max(small.elapsedMs, 1);

  expectNotContains(large.result.sanitized, '@keyframes', 'large fixture keyframes removed');
  expectContains(large.result.sanitized, '.stable-3999', 'large fixture stable rules preserved');
  assert(
    large.result.warnings.at(-1)?.line === 7999,
    'warning line stays correct without rescanning',
  );
  assert(
    large.elapsedMs < 1500,
    `large stylesheet sanitize should stay in budget (elapsed ${large.elapsedMs.toFixed(1)}ms)`,
  );
  assert(
    growth < 3.5,
    `doubling keyframe-heavy input should not show quadratic growth (${growth.toFixed(2)}x)`,
  );
}

const tests: Array<[string, () => void]> = [
  ['transform: scale -> zoom', testTransformScaleConverted],
  ['transform: complex -> stripped', testTransformComplexStripped],
  ['animation stripped', testAnimationStripped],
  ['animation-delay stripped', testAnimationDelayStripped],
  ['@keyframes stripped', testKeyframesStripped],
  ['@-webkit-keyframes stripped', testWebkitKeyframesStripped],
  ['var() inline', testVarInline],
  ['var() fallback', testVarFallback],
  ['var() unresolved', testVarUnresolved],
  ['--x decl stripped', testVarDeclStripped],
  ['position: fixed -> absolute', testPositionFixed],
  ['position: sticky -> relative', testPositionSticky],
  ['no-op simple', testNoOpSimple],
  ['managed selector preserved', testManagedSelectorPreserved],
  ['managed rolltemplate selector preserved', testManagedRolltemplateSelectorPreserved],
  ['empty input', testEmptyInput],
  ['integration', testIntegration],
  ['large stylesheet linear budget', testLargeStylesheetLinearBudget],
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
