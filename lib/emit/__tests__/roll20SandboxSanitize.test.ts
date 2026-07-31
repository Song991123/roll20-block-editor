/**
 * Roll20 Custom Sheet Sandbox sanitize/prefix unit checks.
 *
 * Anchor: docs/spec/30_roll20_actual_sandbox_contract.md
 */

import {
  sanitizeRoll20SandboxCss,
  sanitizeRoll20SandboxHtml,
} from '../roll20SandboxSanitize.ts';

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

function expectContains(haystack: string, needle: string, msg: string): void {
  assert(haystack.includes(needle), `${msg} expected "${needle}", got: ${haystack}`);
}

function expectNotContains(haystack: string, needle: string, msg: string): void {
  assert(!haystack.includes(needle), `${msg} did not expect "${needle}", got: ${haystack}`);
}

function testCssPrefixesSelectors(): void {
  const r = sanitizeRoll20SandboxCss(`
    #title, .row { color: red; }
    .charsheet .kept { color: blue; }
    .sheet-rolltemplate-default { width: 280px; }
  `);

  expectContains(r.css, '.charsheet .title,.charsheet .row', 'prefixes normal selectors');
  expectContains(r.css, '.charsheet .kept', 'keeps existing charsheet selector');
  expectContains(r.css, '.sheet-rolltemplate-default', 'keeps rolltemplate selector');
  assert(
    r.warnings.some((w) => w.code === 'css-selector-prefixed'),
    'selector warning present',
  );
}

function testCssCanPreserveActualIframeSelectors(): void {
  const r = sanitizeRoll20SandboxCss(`
    .tabstoggle[value="combat"] ~ div.sheet-combat { display: block; }
    .character, .skills { display: none; }
    .largedialog textarea { height: 80px; }
  `, { prefixSelectors: false });

  expectContains(
    r.css,
    '.tabstoggle[value="combat"] ~ div.sheet-combat',
    'preserves actual iframe state selector shape',
  );
  expectContains(r.css, '.character,.skills', 'preserves unprefixed hide selectors');
  expectContains(r.css, '.charsheet .largedialog textarea', 'scopes Roll20 chrome selector away from dialog');
  expectNotContains(r.css, '.charsheet .tabstoggle', 'does not blanket-prefix selectors');
  assert(
    !r.warnings.some((w) => w.code === 'css-selector-prefixed'),
    'no selector prefix warning when prefixSelectors=false',
  );
  assert(
    r.warnings.some((w) => w.code === 'css-chrome-selector-scoped'),
    'chrome selector scope warning present',
  );
}

function testCssNestedAtRules(): void {
  const r = sanitizeRoll20SandboxCss(`
    @container sheet (min-width: 420px) {
      .card, .card > input { display: grid; }
    }
    @supports (display: grid) {
      @layer components { .panel { gap: 4px; } }
    }
    @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
  `);

  expectContains(r.css, '@container sheet (min-width: 420px)', 'preserves container at-rule');
  expectContains(r.css, '.charsheet .card,.charsheet .card > input', 'prefixes nested container selectors');
  expectContains(r.css, '@supports (display: grid)', 'preserves supports at-rule');
  expectContains(r.css, '@layer components', 'preserves nested layer at-rule');
  expectContains(r.css, '.charsheet .panel', 'prefixes nested layer selector');
  expectContains(r.css, 'from { opacity: 0; }', 'does not prefix keyframe steps');
  expectNotContains(r.css, '.charsheet @container', 'does not prefix at-rule as selector');
}

function testCssUrlRewrite(): void {
  const r = sanitizeRoll20SandboxCss(`
    .a { background: url("https://example.com/a.png"); }
    .b { background: url("local.png"); }
    .c { background: url("https://files.d20.io/images/x.png"); }
  `);

  expectContains(r.css, 'https://imgsrv.roll20.net/?src=', 'external URL proxied');
  expectNotContains(r.css, 'local.png', 'relative URL dropped');
  expectContains(r.css, 'https://files.d20.io/images/x.png', 'Roll20 file URL preserved');
  assert(r.warnings.some((w) => w.code === 'css-url-proxied'), 'proxy warning present');
  assert(r.warnings.some((w) => w.code === 'css-url-dropped'), 'drop warning present');
}

function testCssRejectsUnsafeTokens(): void {
  const r = sanitizeRoll20SandboxCss('.a { color: red; } .b { behavior: url(x); }');
  assert(r.css === '', 'unsafe CSS clears output');
  assert(r.warnings.some((w) => w.code === 'css-rejected'), 'rejected warning present');
}

function testHtmlClassPrefixAndAllowList(): void {
  const r = sanitizeRoll20SandboxHtml(`
    <section class="outer">gone wrapper</section>
    <div class="panel sheet-kept attr_hp repeating_skills roll_attack act_open">ok</div>
  `);

  expectNotContains(r.html, '<section', 'section tag stripped');
  expectContains(
    r.html,
    'class="sheet-panel sheet-kept attr_hp repeating_skills roll_attack act_open"',
    'class prefix exceptions preserved',
  );
  assert(r.warnings.some((w) => w.code === 'html-tag-stripped'), 'tag warning present');
  assert(r.warnings.some((w) => w.code === 'html-class-prefixed'), 'class warning present');
}

function testModernHtmlPreservesClasses(): void {
  const r = sanitizeRoll20SandboxHtml(
    '<div class="panel sheet-kept attr_hp">ok</div>',
    { prefixClasses: false },
  );
  expectContains(r.html, 'class="panel sheet-kept attr_hp"', 'modern classes preserved');
  assert(!r.warnings.some((w) => w.code === 'html-class-prefixed'), 'modern mode has no class-prefix warning');
}

function testHtmlRuntimeAndUrlHandling(): void {
  const r = sanitizeRoll20SandboxHtml(`
    <script type="text/worker">on("change:x", function(){})</script>
    <rolltemplate class="sheet-rolltemplate-test"><div>card</div></rolltemplate>
    <img src="https://example.com/a.png">
    <img src="data:image/png;base64,abc">
  `);

  expectNotContains(r.html, 'change:x', 'worker source hidden');
  expectNotContains(r.html, 'sheet-rolltemplate-test', 'rolltemplate source hidden');
  expectContains(r.html, 'https://imgsrv.roll20.net/?src=', 'external image proxied');
  expectNotContains(r.html, 'data:image', 'data URL dropped');
  assert(r.warnings.some((w) => w.code === 'html-runtime-stripped'), 'runtime warning present');
  assert(r.warnings.some((w) => w.code === 'html-url-proxied'), 'HTML URL proxy warning');
  assert(r.warnings.some((w) => w.code === 'html-url-dropped'), 'HTML URL drop warning');
}

const tests: Array<[string, () => void]> = [
  ['CSS selector prefixing', testCssPrefixesSelectors],
  ['CSS actual iframe selector preservation', testCssCanPreserveActualIframeSelectors],
  ['CSS nested at-rules', testCssNestedAtRules],
  ['CSS URL rewrite', testCssUrlRewrite],
  ['CSS unsafe rejection', testCssRejectsUnsafeTokens],
  ['HTML allow-list/class prefix', testHtmlClassPrefixAndAllowList],
  ['HTML modern class preservation', testModernHtmlPreservesClasses],
  ['HTML runtime and URL handling', testHtmlRuntimeAndUrlHandling],
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
