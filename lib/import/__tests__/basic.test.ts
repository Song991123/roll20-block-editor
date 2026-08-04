/**
 * Basic import unit tests — TS 컴파일 + 런타임 smoke.
 *
 * 본 파일은 Node.js + ts-node 또는 vitest 로 실행 가능. import 의 외부 의존 0
 * (jsdom X) — 빠르게 결정적 테스트.
 *
 * legacy-sheet-corpus specific content 0 — generic HTML 만.
 */

import { importSheet } from '../index';
import {
  classifyRoll20Script,
  extractRoll20ScriptSources,
  isExecutablePageScript,
  isOrdinaryPageScript,
} from '../worker_source';

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

function testBasicTextInput(): void {
  const html = `<input type="text" name="attr_character_name" value="Hero">`;
  const r = importSheet({ html });
  assert(r.stats.htmlMatched >= 1, 'text input should match');
  assert(r.stats.htmlRawFallback === 0, 'no raw fallback expected');
  assert(r.html.includes('r20_text_input'), 'r20_text_input in xml');
  assert(r.html.includes('character_name'), 'NAME field carried');
}

function testNumberInput(): void {
  const html = `<input type="number" name="attr_level" min="1" max="20" value="3">`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_number_input'), 'number block');
  assert(r.html.includes('>level<'), 'name preserved');
}

function testOtherNativeInputStaysAnEditableLeaf(): void {
  const html = '<input type="range" name="attr_heat" class="sheet-meter" min="0" max="10" step="2" value="6" readonly disabled data-kind="range">';
  const r = importSheet({ html });
  assert(r.stats.htmlMatched === 1, 'other native input should match one block');
  assert(r.stats.htmlRawFallback === 0, 'other native input should not use raw fallback');
  assert(r.html.includes('r20_generic_input'), 'other native input uses its leaf block');
  assert(!r.html.includes('r20_element_container'), 'void input is not exposed as a container');
  assert(r.html.includes('<field name="TYPE">range</field>'), 'input type is editable');
  assert(r.html.includes('<field name="NAME">heat</field>'), 'Roll20 attribute name is editable');
  assert(r.html.includes('<field name="MIN">0</field>'), 'minimum is editable');
  assert(r.html.includes('<field name="MAX">10</field>'), 'maximum is editable');
  assert(r.html.includes('<field name="STEP">2</field>'), 'step is editable');
  assert(r.html.includes('<field name="DISABLED">TRUE</field>'), 'disabled state is editable');
  assert(r.html.includes('<field name="READONLY">TRUE</field>'), 'readonly state is editable');
  assert(r.html.includes('data-kind'), 'uncommon attributes stay preserved');
}

function testGenericVoidElementStaysAnEditableLeaf(): void {
  const html = '<source class="sheet-audio-source" src="local.ogg" type="audio/ogg" data-kind="source">';
  const r = importSheet({ html });
  assert(r.stats.htmlMatched === 1, 'generic void element should match one block');
  assert(r.stats.htmlRawFallback === 0, 'generic void element should not use raw fallback');
  assert(r.html.includes('r20_element_atom'), 'generic void element uses its leaf block');
  assert(!r.html.includes('r20_element_container'), 'generic void element is not exposed as a container');
  assert(r.html.includes('<field name="TAG">source</field>'), 'void tag remains editable');
  assert(r.html.includes('<field name="CLASS">sheet-audio-source</field>'), 'void class is preserved');
  assert(r.html.includes('src'), 'void element source attribute stays preserved');
  assert(r.html.includes('data-kind'), 'void element custom attribute stays preserved');
}

function testNestedDiv(): void {
  const html = `<div class="sheet-header"><h1>Title</h1></div>`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_div'), 'div block');
  assert(r.html.includes('r20_heading'), 'heading inside');
  assert(r.html.includes('>sheet-header<'), 'authored class is preserved');
}

function testSemanticContainerTagsStayStructured(): void {
  const html = [
    '<main class="sheet-shell" data-layout="flow">',
    '  <header><h1>Title</h1></header>',
    '  <article><p>Body</p><figure><figcaption>Caption</figcaption></figure></article>',
    '</main>',
  ].join('');
  const r = importSheet({ html });
  assert(
    (r.html.match(/r20_semantic_container/g) || []).length === 6,
    'all semantic container tags should become editable structure blocks',
  );
  assert(r.html.includes('<field name="TAG">main</field>'), 'main tag preserved');
  assert(r.html.includes('<field name="TAG">article</field>'), 'article tag preserved');
  assert(r.html.includes('data-layout'), 'semantic container attributes are preserved');
  assert(r.html.includes('>sheet-shell<'), 'semantic container class is preserved');
  assert(r.stats.htmlRawFallback === 0, 'semantic container tree has no raw fallback');
}

function testUnknownSafeElementsStayEditable(): void {
  const html = '<custom-card data-kind="panel" aria-label="Card"><a href="/sheet">Open</a></custom-card>';
  const r = importSheet({ html });
  assert((r.html.match(/r20_element_container/g) || []).length === 2, 'safe unknown elements become generic blocks');
  assert(r.html.includes('<field name="TAG">custom-card</field>'), 'custom element tag is preserved');
  assert(r.html.includes('<field name="TAG">a</field>'), 'anchor tag is preserved');
  assert(r.html.includes('data-kind'), 'generic element attributes are preserved');
  assert(r.stats.htmlRawFallback === 0, 'safe unknown elements do not use raw fallback');
}

function testRepeatingSection(): void {
  const html = `<fieldset class="repeating_skills"><input type="text" name="attr_name"></fieldset>`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_repeating_section'), 'repeating block');
  assert(r.html.includes('>skills<'), 'name preserved');
  assert(!r.warnings.some(({ code }) => code.startsWith('html_repeating_')), 'valid repeating name has no contract error');
}

function testInvalidRepeatingSectionsStayLosslessAndVisible(): void {
  const html = `
    <fieldset class="repeating_items"><input name="attr_name"></fieldset>
    <fieldset class="sheet-summary repeating_ITEMS"><input name="attr_name"></fieldset>
    <fieldset class="repeating_melee_weapon"><input name="attr_damage"></fieldset>
  `;
  const r = importSheet({ html });
  assert(
    r.warnings.some(({ code, severity }) =>
      code === 'html_repeating_duplicate_name' && severity === 'error'
    ),
    'duplicate repeating names surface as an import contract error',
  );
  assert(
    r.warnings.some(({ code, severity }) =>
      code === 'html_repeating_invalid_name' && severity === 'error'
    ),
    'underscored repeating names surface as an import contract error',
  );
  assert(
    (r.html.match(/r20_repeating_section/g) ?? []).length === 3,
    'invalid authored repeating sections remain editable instead of being dropped',
  );
}

function testStructuralLabelContainer(): void {
  const html = `<label for="attr_name" class="sheet-improvement"><input type="text" name="attr_name"><span>Name</span></label>`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_label_container'), 'nested label container block');
  assert(r.html.includes('r20_text_input'), 'label input child');
  assert(r.html.includes('>attr_name<'), 'label for preserved');
  assert(r.stats.htmlRawFallback === 0, 'no raw fallback for nested label');
}

function testListContainers(): void {
  const html = `<ul class="sheet-options"><li><hr></li><li><span>Second</span></li></ul>`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_list'), 'list container block');
  assert(r.html.includes('r20_list_item'), 'list item blocks');
  assert(r.html.includes('r20_hr'), 'list child preserved');
  assert(r.stats.htmlRawFallback === 0, 'no raw fallback for list structure');
}

function testDirectTextNodePreserved(): void {
  const html = `<label>Name <input type="text" name="attr_name"> suffix</label>`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_label_container'), 'label remains structural');
  assert((r.html.match(/r20_text_node/g) || []).length === 2, 'both direct text nodes preserved');
  assert(r.html.includes('>Name <'), 'leading text and its inline boundary space preserved');
  assert(r.html.includes('> suffix<'), 'trailing text and its inline boundary space preserved');
  assert(r.stats.htmlRawFallback === 0, 'no raw fallback for direct text');
}

function testHtmlCommentsStayEditable(): void {
  const html = [
    '<!-- top note -->',
    '<div class="sheet-comment-root">',
    '  <span>Before<!-- inline note -->After</span>',
    '  <!-- nested note -->',
    '  <h2>Heading<!-- heading note --></h2>',
    '  <button type="roll" name="roll_probe" value="1d20">Roll<!-- button note --></button>',
    '  <label><input type="radio" name="attr_mode" value="a"><!-- label note -->Choice</label>',
    '  <select name="attr_kind"><!-- select note --><option value="a">One<!-- option note --></option></select>',
    '</div>',
  ].join('\n');
  const r = importSheet({ html });
  assert(
    (r.html.match(/r20_html_comment/g) || []).length === 8,
    'comments should remain editable across roots, containers, and compact element shapes',
  );
  assert(r.html.includes('top note'), 'top-level comment text is preserved');
  assert(r.html.includes('nested note'), 'nested comment text is preserved');
  assert(r.html.includes('inline note'), 'inline comment text is preserved');
  assert(r.html.includes('heading note'), 'heading comment text is preserved');
  assert(r.html.includes('button note'), 'button comment text is preserved');
  assert(r.html.includes('label note'), 'label comment text is preserved');
  assert(r.html.includes('select note'), 'select comment text is preserved');
  assert(r.html.includes('option note'), 'option comment text is preserved');
  assert(!r.html.includes('r20_page_js_slot'), 'ordinary comments are not internal Page JS slots');
  assert(r.stats.htmlRawFallback === 0, 'ordinary comments do not force raw fallback');
}

function testRolltemplateDirectMustacheTextPreserved(): void {
  const html = [
    '<rolltemplate class="sheet-rolltemplate-demo">',
    '{{#title}}',
    '<div class="sheet-title">{{title}}</div>',
    '{{/title}}',
    '<div class="sheet-row">{{label}}: {{value}}</div>',
    'tail',
    '</rolltemplate>',
  ].join('');
  const r = importSheet({ html });
  assert(r.html.includes('r20_rolltemplate_define'), 'rolltemplate wrapper is structured');
  assert((r.html.match(/r20_text_node/g) || []).length >= 3, 'direct Mustache/text nodes are mapped');
  assert(r.html.includes('{{#title}}'), 'opening Mustache token is preserved');
  assert(r.html.includes('{{/title}}'), 'closing Mustache token is preserved');
  assert(r.html.includes('>tail<'), 'direct trailing text is preserved');
  assert(r.stats.htmlRawFallback === 0, 'rolltemplate uses no raw fallback');
}

function testWhitespaceOnlyTextDoesNotInflate(): void {
  const html = `<div>\n  <label> Name <input name="attr_name"> </label>\n</div>`;
  const r = importSheet({ html });
  assert((r.html.match(/r20_text_node/g) || []).length === 1, 'indentation whitespace is ignored');
  assert(r.html.includes('>Name <'), 'meaningful label text and inline boundary remain');
  assert(r.stats.htmlRawFallback === 0, 'no raw fallback for formatted container');
}

function testInlineWhitespaceBetweenSiblingsPreserved(): void {
  const html = '<div><span>A</span> <span>B</span></div>';
  const r = importSheet({ html });
  assert(r.html.includes('<field name="TEXT"> </field>'), 'inline sibling space is preserved');
  assert((r.html.match(/r20_static_text/g) || []).length === 2, 'both inline text elements remain editable');
  assert(r.stats.htmlRawFallback === 0, 'no raw fallback for inline whitespace');
}

function testFormattedDirectTextHasStableWhitespace(): void {
  const html = `<div><span>Name</span>\n          :\n        <input name="attr_name"></div>`;
  const r = importSheet({ html });
  assert(r.html.includes('<field name="TEXT"> : </field>'), 'formatted inline punctuation keeps rendered spaces');
  assert(r.stats.htmlRawFallback === 0, 'no raw fallback for formatted inline text');
}

function testRadioLabelDoesNotNestOnEmit(): void {
  const html = `<label><input type="radio" name="attr_mode" value="a">Alpha</label>`;
  const r = importSheet({ html });
  assert((r.html.match(/r20_radio/g) || []).length === 1, 'radio wrapper is one block');
  assert(!r.html.includes('r20_label_container'), 'radio does not become a nested label container');
  assert(r.html.includes('>Alpha<'), 'radio label text is preserved');
}

function testDefaultControlStateIsEditable(): void {
  const html = [
    '<label><input type="radio" name="attr_mode" value="a" checked="checked">Alpha</label>',
    '<select name="attr_style"><option value="dark" selected="selected">Dark</option></select>',
  ].join('');
  const r = importSheet({ html });
  assert(r.html.includes('<field name="CHECKED">TRUE</field>'), 'radio checked state becomes a block field');
  assert(r.html.includes('<field name="SELECTED">TRUE</field>'), 'option selected state becomes a block field');
  assert(r.stats.htmlRawFallback === 0, 'default state controls stay structured');
}

function testRadioWrapperKeepsInputAttributesOrFallsBackLosslessly(): void {
  const structured = importSheet({
    html: '<label><input type="radio" class="sheet-control" name="attr_mode" value="a" checked title="Mode">Alpha</label>',
  });
  assert(structured.html.includes('r20_radio'), 'plain radio wrapper stays structured');
  assert(structured.html.includes('title'), 'input-only unknown attribute stays in the control snapshot');
  assert(structured.html.includes('sheet-control'), 'input class stays in the control snapshot');
  assert(structured.stats.htmlRawFallback === 0, 'plain wrapper needs no raw fallback');

  const attributedWrapper = importSheet({
    html: '<label class="sheet-choice" data-wrapper="choice"><input type="radio" name="attr_mode" value="a">Alpha</label>',
  });
  assert(attributedWrapper.html.includes('r20_raw_html'), 'attributed radio wrapper uses exact raw fallback');
  assert(attributedWrapper.html.includes('data-wrapper'), 'wrapper-only attributes survive fallback');
  assert(attributedWrapper.stats.htmlRawFallback === 1, 'lossless fallback is reported');
}

function testOmittedControlDefaultsStayOmittedInBlockState(): void {
  const html = [
    '<input name="attr_text">',
    '<input type="number" name="attr_number">',
    '<input type="hidden" name="attr_hidden">',
    '<textarea name="attr_notes"></textarea>',
  ].join('');
  const r = importSheet({ html });
  assert(r.html.includes('<field name="DEFAULT"></field>'), 'missing input values stay empty');
  assert(!r.html.includes('<field name="DEFAULT">0</field>'), 'import does not invent zero values');
  assert(r.html.includes('<field name="ROWS">2</field>'), 'textarea uses browser default rows in block state');
  assert(r.html.includes('<field name="__R20_PRESERVED_ATTRS">'), 'all imported elements keep origin snapshots');
}

function testSelectOptionGroupsStayEditable(): void {
  const html = [
    '<select name="attr_role">',
    '<optgroup label="Archived" disabled data-kind="history"><option value="old">Old</option></optgroup>',
    '<optgroup label="Current"><option value="current" selected>Current</option></optgroup>',
    '</select>',
  ].join('');
  const r = importSheet({ html });
  assert(r.html.includes('<block type="r20_select"'), 'select stays structured');
  assert((r.html.match(/<block type="r20_optgroup"/g) || []).length === 2, 'both option groups map to blocks');
  assert(r.html.includes('<field name="LABEL">Archived</field>'), 'option group label is editable');
  assert(r.html.includes('<field name="DISABLED">TRUE</field>'), 'disabled option group state is editable');
  assert(r.html.includes('data-kind'), 'unknown option group attributes are preserved');
  assert(r.html.includes('<field name="SELECTED">TRUE</field>'), 'nested selected option remains editable');
  assert(r.stats.htmlRawFallback === 0, 'option groups do not fall back to raw HTML');
}

function testUnknownAttributesSurviveMatchedBlocks(): void {
  const html = `<div id="frame" data-layout="grid" aria-label="Frame"><input type="text" name="attr_name" title="Name" data-hook="field"></div>`;
  const r = importSheet({ html });
  assert(r.html.includes('__R20_PRESERVED_ATTRS'), 'preserved attribute field exists');
  assert(r.html.includes('data-layout'), 'container data attribute is captured');
  assert(r.html.includes('aria-label'), 'ARIA attribute is captured');
  assert(r.html.includes('data-hook'), 'input data attribute is captured');
  assert(r.html.includes('title'), 'input title attribute is captured');
  assert(r.stats.htmlRawFallback === 0, 'matched nodes do not fall back to raw HTML');
}

function testCssRule(): void {
  const css = `.sheet-header { color: red; padding: 10px; }`;
  const r = importSheet({ css });
  assert(r.stats.cssMatched === 1, 'one rule matched');
  assert(r.css.includes('r20_css_rule'), 'css_rule block');
  assert(r.css.includes('r20_selector_class'), 'selector_class block');
}

function testI18nJson(): void {
  const i18n = `{"hello":"안녕","goodbye":"잘 가"}`;
  const r = importSheet({ i18n });
  assert(r.stats.i18nKeys === 2, '2 keys parsed');
  assert(r.i18n.includes('r20_locale_value'), 'locale_value block');
}

function testI18nFlat(): void {
  const i18n = `# lang: en\nhello=Hello\nbye=Goodbye\n`;
  const r = importSheet({ i18n });
  assert(r.stats.i18nKeys === 2, '2 flat keys');
  assert(r.i18n.includes('>en<'), 'lang detected');
}

function testRawFallback(): void {
  const html = `<style>.sheet-x { display: none; }</style>`;
  const r = importSheet({ html });
  assert(r.stats.htmlRawFallback >= 1, 'opaque style tag → raw fallback');
  assert(r.html.includes('r20_raw_html'), 'raw_html block emitted');
}

function testCoverageStat(): void {
  const html = `
    <div class="sheet-x">
      <input type="text" name="attr_n">
      <h1>x</h1>
    </div>
  `;
  const r = importSheet({ html });
  assert(r.stats.coverage > 90, `coverage should be >90, got ${r.stats.coverage}`);
  assert(r.stats.htmlCoverage === r.stats.coverage, 'legacy coverage remains HTML coverage');
  assert(r.stats.cssCoverage === 0, 'empty CSS has zero CSS coverage');
  assert(r.stats.structuredCoverage > 90, 'combined structured coverage is reported');
  assert(r.stats.warningCount === r.warnings.length, 'warning count mirrors warnings');
}

function testCssCoverageExposesRawFallback(): void {
  const r = importSheet({ css: '.sheet { color: red; } @layer reset;' });
  assert(r.stats.cssMatched === 1, 'one typed CSS rule is matched');
  assert(r.stats.cssRawFallback === 1, 'unsupported at-rule remains raw');
  assert(r.stats.cssCoverage === 50, `CSS coverage should expose raw fallback, got ${r.stats.cssCoverage}`);
  assert(r.stats.structuredCoverage === 50, `combined coverage should expose raw fallback, got ${r.stats.structuredCoverage}`);
  assert(r.stats.warningCount === 1, 'raw CSS fallback is visible in warning count');
}


function testInlineBoldB(): void {
  const html = `<b>x</b>`;
  const r = importSheet({ html });
  assert(r.stats.htmlMatched >= 1, '<b> should match');
  assert(r.stats.htmlRawFallback === 0, 'no raw fallback for <b>');
  assert(r.html.includes('r20_inline_bold'), 'r20_inline_bold block emitted');
  assert(r.html.includes('>x<'), 'TEXT carried');
}

function testInlineBoldStrong(): void {
  const html = `<strong>x</strong>`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_inline_bold'), '<strong> → r20_inline_bold');
  assert(r.html.includes('>x<'), 'TEXT carried');
  assert(r.stats.htmlRawFallback === 0, 'no raw fallback');
}

function testInlineItalicEm(): void {
  const html = `<em>x</em>`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_inline_italic'), '<em> → r20_inline_italic');
  assert(r.html.includes('>x<'), 'TEXT carried');
  assert(r.stats.htmlRawFallback === 0, 'no raw fallback');
}

function testInlineItalicI(): void {
  const html = `<i>x</i>`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_inline_italic'), '<i> (non-icon) → r20_inline_italic');
  assert(r.stats.htmlRawFallback === 0, 'no raw fallback');
}

function testSemanticInlineContainerKeepsNestedI18n(): void {
  const html = `<small class="sheet-help"><span data-i18n="help-key">Help</span></small>`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_inline_container'), 'semantic inline container block');
  assert(r.html.includes('r20_i18n_text'), 'nested translation block preserved');
  assert(r.html.includes('help-key'), 'translation key preserved');
  assert(r.stats.htmlRawFallback === 0, 'no raw fallback for nested inline translation');
}

function testTableCaption(): void {
  const html = `<caption>Title</caption>`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_table_caption'), '<caption> → r20_table_caption');
  assert(r.html.includes('>Title<'), 'TEXT carried');
  assert(r.stats.htmlRawFallback === 0, 'no raw fallback for caption');
}

function testInlineBreak(): void {
  const html = `<br>`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_inline_break'), '<br> → r20_inline_break');
  assert(r.stats.htmlRawFallback === 0, 'no raw fallback for br');
}

function testCssFontFace(): void {
  const css = `@font-face {
    font-family: 'MyFont';
    src: url('data:font/woff2;base64,AA;BB') format('woff2');
    font-weight: 700;
    font-style: normal;
    font-display: swap;
    unicode-range: U+0000-00FF;
    font-stretch: 75% 125%;
    font-weight: 800;
  }`;
  const r = importSheet({ css });
  assert(r.stats.cssMatched === 1, '@font-face matched 1');
  assert(r.stats.cssRawFallback === 0, 'no css raw fallback');
  assert(r.css.includes('r20_css_font_face'), 'font_face block emitted');
  assert(r.css.includes('>MyFont<'), 'FAMILY field carried');
  assert(r.css.includes('name="EXTRA_DESCRIPTORS"'), 'extra descriptor field emitted');
  assert(r.css.includes('font-display: swap;'), 'font-display preserved');
  assert(r.css.includes('unicode-range: U+0000-00FF;'), 'unicode-range preserved');
  assert(r.css.includes('font-stretch: 75% 125%;'), 'font-stretch preserved');
  assert(r.css.includes('font-weight: 800;'), 'duplicate structured descriptor preserved');
  assert(r.css.includes('AA;BB'), 'semicolon inside data URL stays inside src value');
}

function testTableColumnStructure(): void {
  const html = `<table><colgroup><col style="width: 50%;"><col style="width: 50%;"></colgroup><tr><td>A</td></tr></table>`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_colgroup'), 'colgroup block');
  assert((r.html.match(/r20_table_col/g) || []).length === 2, 'col blocks');
  assert(r.stats.htmlRawFallback === 0, 'no raw fallback for table columns');
}

function testGenericInputTableDoesNotCollapseToSkillRow(): void {
  const html = `<table><tbody><tr><td><input type="text" name="attr_left" value="A"></td><td><input type="text" name="attr_right" value="B"></td></tr></tbody></table>`;
  const r = importSheet({ html });
  assert(!r.html.includes('r20_skill_row'), 'generic input table stays atomic');
  assert((r.html.match(/r20_td/g) || []).length === 2, 'both table cells remain blocks');
  assert((r.html.match(/r20_text_input/g) || []).length === 2, 'both inputs remain blocks');
}

function testCssImport(): void {
  const css = `@import url('https://fonts.googleapis.com/css?family=Example&display=swap');`;
  const r = importSheet({ css });
  assert(r.stats.cssMatched === 1, '@import matched');
  assert(r.stats.cssRawFallback === 0, 'no raw fallback for @import');
  assert(r.css.includes('r20_css_import'), 'css_import block');
  assert(r.css.includes('fonts.googleapis.com'), 'import source carried');
}

function testCssBareAtRulePreservation(): void {
  const css = '@charset "UTF-8"; @namespace svg url("http://www.w3.org/2000/svg"); @layer reset;';
  const r = importSheet({ css });
  assert(r.stats.cssMatched === 0, 'bare unsupported at-rules are not typed rules');
  assert(r.stats.cssRawFallback === 3, 'each bare at-rule is retained as raw CSS');
  assert(r.css.includes('@charset'), 'charset at-rule is preserved');
  assert(r.css.includes('@namespace'), 'namespace at-rule is preserved');
  assert(r.css.includes('@layer reset;'), 'semicolon terminator is preserved');
  assert(!r.css.includes('@layer reset{}'), 'semicolon at-rule is not rewritten as a block');

  const incomplete = importSheet({ css: '@layer reset' });
  assert(incomplete.css.includes('@layer reset'), 'unterminated at-rule text is preserved');
  assert(!incomplete.css.includes('@layer reset;'), 'EOF at-rule is not given a new terminator');
}

function testCssMediaQueryStructure(): void {
  const css = '@media (max-width: 640px) { .sheet-header { color: red; } }';
  const r = importSheet({ css });
  assert(r.stats.cssMatched === 1, '@media counts as one matched top-level rule');
  assert(r.stats.cssRawFallback === 0, 'simple @media has no raw fallback');
  assert(r.css.includes('r20_media_query'), '@media maps to a dedicated block');
  assert(r.css.includes('r20_css_rule'), 'nested media rule is represented');
  assert(r.css.includes('max-width: 640px'), 'media condition is preserved');

  const complex = importSheet({
    css: '@media screen and (max-width: 640px) { .sheet-header { color: red; } }',
  });
  assert(complex.css.includes('r20_media_query'), 'complex media shape maps to the typed block');
  assert(!complex.css.includes('r20_raw_css'), 'complex media query has no raw fallback');
  assert(complex.css.includes('screen and (max-width: 640px)'), 'full media prelude is preserved');

  const print = importSheet({
    css: '@media print { .sheet-header { color: black; } }',
  });
  assert(print.css.includes('r20_media_query'), 'media type maps to the typed block');
  assert(print.css.includes('print'), 'media type is preserved');

  const unsafe = importSheet({
    css: '@media screen; color: red { .sheet-header { color: black; } }',
  });
  assert(!unsafe.css.includes('r20_media_query'), 'unsafe media prelude is not typed');
  assert(unsafe.css.includes('r20_raw_css'), 'unsafe media prelude remains lossless raw CSS');
}

function testCssKeyframesStructureAndFallback(): void {
  const css = '@keyframes pulse { from { opacity: 0; } 50% { opacity: 0.5; } 10% { opacity: 0.1; } to { opacity: 1; } }';
  const r = importSheet({ css });
  assert(r.stats.cssMatched === 1, '@keyframes counts as one matched top-level rule');
  assert(r.css.includes('r20_keyframes'), '@keyframes maps to a dedicated block');
  assert((r.css.match(/r20_keyframe_stop/g) || []).length === 3, 'known keyframe stops become typed blocks');
  assert(r.css.includes('r20_raw_css'), 'unsupported keyframe stop stays lossless raw CSS');
  assert(r.css.includes('10%'), 'unsupported keyframe stop value is preserved');
}

function testCssSelectorComplexFallback(): void {
  // 매우 복잡한 selector (parser 가 분해 못함) — r20_selector_complex 로 100% 보존.
  const css = `body > .foo + .bar:not(:first-child) ~ [data-x="1"] { color: red; }`;
  const r = importSheet({ css });
  assert(r.stats.cssMatched === 1, 'rule matched');
  // r20_selector_complex 또는 정상 분해 둘 다 OK (분해돼도 selector_complex 가 잔여로 박힘 가능)
  // 핵심: r20_literal_string 으로 박히지 않음 + warning 발생 1+
  const literalCount = (r.css.match(/r20_literal_string/g) || []).length;
  assert(literalCount === 0, 'no r20_literal_string fallback');
}

function testModernCssAndMixedScriptPreservation(): void {
  const html = `
    <div class="sheet-frame"><input name="attr_hp"></div>
    <script type="text/worker">on('change:hp', function(){ setAttrs({ hp: 1 }); });</script>
    <script type="text/javascript" src="page-runtime.js">window.sheetReady = true;</script>
  `;
  const css = `
    .sheet-frame:has(> input) { display: grid; }
    @container sheet (min-width: 420px) { .sheet-frame { gap: 4px; } }
  `;
  const r = importSheet({ html, css });
  assert(r.html.includes('r20_raw_worker'), 'worker source stays in worker workspace');
  assert(r.html.includes('r20_page_js_slot'), 'page script keeps an HTML anchor');
  assert(r.js.includes('r20_raw_page_js'), 'page script enters the page-JS workspace');
  assert(!r.html.includes('window.sheetReady'), 'page script body does not become visible sheet content');
  assert(r.css.includes('r20_selector_pseudo'), 'modern selector remains structured');
  assert(r.css.includes('&gt; input'), 'modern pseudo argument is preserved');
  assert(r.css.includes('r20_css_at_rule'), 'container rule maps to a generic at-rule block');
  assert(r.css.includes('r20_css_rule'), 'nested container rule remains structured');
  assert(r.css.includes('@container sheet'), 'container rule remains lossless');
  assert(r.stats.cssRawFallback === 0, 'structured container rule has no raw fallback');

  const supports = importSheet({
    css: '@supports (display: grid) { @layer components { .card { display: grid; } } }',
  });
  assert((supports.css.match(/r20_css_at_rule/g) || []).length === 2, 'nested at-rules map recursively');
  assert(supports.css.includes('field name="NAME">card'), 'nested at-rule selector is preserved');

  const malformed = importSheet({
    css: '@container sheet (min-width: 420px { .card { display: grid; } }',
  });
  assert(!malformed.css.includes('r20_css_at_rule'), 'unbalanced at-rule prelude is not typed');
  assert(malformed.css.includes('r20_raw_css'), 'unbalanced at-rule remains raw');
}

function testCssCompoundSelector(): void {
  // tag.class compound — `input.sheet-hide`.
  const css = `input.sheet-hide { display: none; }`;
  const r = importSheet({ css });
  assert(r.stats.cssMatched === 1, 'rule matched');
  assert(r.css.includes('r20_selector_compound'), 'compound block emitted');
  assert(r.css.includes('r20_selector_element'), 'leading element preserved');
}

function testCssPseudoElementWebkit(): void {
  const css = `input[type=number]::-webkit-outer-spin-button { display: none; }`;
  const r = importSheet({ css });
  assert(r.stats.cssMatched === 1, 'rule matched');
  assert(r.css.includes('r20_selector_pseudo_element'), 'pseudo-element block emitted');
}

function testCssExtendedElementTags(): void {
  // Roll20 시트에서 자주 쓰는 bare-tag — textarea / table / caption 등.
  const css = `textarea { background: #fff; } table { width: 100%; } caption { font-weight: bold; }`;
  const r = importSheet({ css });
  assert(r.stats.cssMatched === 3, '3 rules matched');
  // selector_element 가 textarea/table/caption 까지 핸들 — selector_complex fallback 0.
  const complexMatches = (r.css.match(/r20_selector_complex/g) || []).length;
  assert(complexMatches === 0, `no selector_complex fallback (got ${complexMatches})`);
}

function testCssCustomElementSelector(): void {
  const r = importSheet({
    css: 'li { list-style: none; } custom-card { display: block; }',
  });
  assert(r.stats.cssMatched === 2, 'custom tag rules matched');
  assert((r.css.match(/r20_selector_tag/g) || []).length === 2, 'simple unknown tags stay editable');
  assert(!r.css.includes('r20_selector_complex'), 'simple unknown tags avoid opaque selector fallback');
}

function testScriptSourceClassification(): void {
  const source = [
    '<script type="text/worker">on("sheet:opened", function () {});</script>',
    '<script>setAttrs({ hp: 10 });</script>',
    '<script type="text/javascript" src="page-runtime.js">window.ready = true;</script>',
    '<script data-role="page">window.pageOnly = true;</script>',
  ].join('');
  const scripts = extractRoll20ScriptSources(source);
  assert(scripts.length === 4, 'all authored script tags are extracted');
  assert(scripts[0].kind === 'worker', 'explicit text/worker is a worker');
  assert(scripts[1].kind === 'worker', 'untyped Roll20 API script is a worker');
  assert(scripts[2].kind === 'page', 'typed page script remains page JavaScript');
  assert(scripts[2].attrs.includes('src="page-runtime.js"'), 'page attributes are preserved');
  assert(scripts[3].body.includes('pageOnly'), 'page source body is preserved');
  assert(classifyRoll20Script('text/javascript', 'on("click", fn);') === 'page', 'typed page type wins');
  assert(isOrdinaryPageScript('', 'window.ready = true;'), 'ordinary untyped page script is page JavaScript');
  assert(!isOrdinaryPageScript('', 'getAttrs(["hp"], function () {});'), 'untyped worker API is not page JavaScript');
  assert(
    isOrdinaryPageScript('', 'const docs = "getAttrs([hp])"; // setAttrs({ hp: 1 });'),
    'worker API names inside strings and comments do not classify page JavaScript as worker',
  );
  assert(
    isOrdinaryPageScript('', '/* getAttrs([hp]) */ window.ready = true;'),
    'worker API names inside block comments do not classify page JavaScript as worker',
  );
}

function testPageScriptMapsToEditableBlock(): void {
  const r = importSheet({
    html: '<script type="text/javascript" src="page-runtime.js" defer>window.ready = true;</script>',
  });
  assert(r.js.includes('r20_raw_page_js'), 'ordinary page script maps to an editable page-JS block');
  assert(r.js.includes('page-runtime.js'), 'page script attributes survive import');
  assert(r.js.includes('window.ready = true;'), 'page script body survives import');
  assert(r.html.includes('r20_page_js_slot'), 'HTML keeps a source-order anchor block');
  assert(!r.html.includes('window.ready = true;'), 'page script body leaves the HTML workspace');
  assert(r.stats.pageScriptBlocks === 1, 'page script count is reported');
}

function testDataScriptStaysInHtml(): void {
  const html =
    '<div data-role="before">Before</div>' +
    '<script type="application/json" id="sheet-data">{"hp":10}</script>' +
    '<script type="text/template" id="row-template"><div class="row"></div></script>';
  const r = importSheet({ html });
  assert(!r.js.includes('r20_raw_page_js'), 'data scripts do not enter Page JS workspace');
  assert(r.html.includes('sheet-data'), 'JSON data script remains in HTML workspace');
  assert(r.html.includes('row-template'), 'template script remains in HTML workspace');
  assert(r.stats.pageScriptBlocks === 0, 'data scripts are excluded from page JS count');
  assert(classifyRoll20Script('application/json', '{}') === 'data', 'JSON type is data');
  assert(classifyRoll20Script('text/template', '<div />') === 'data', 'template type is data');
  assert(isExecutablePageScript('text/javascript'), 'JavaScript MIME is executable');
  assert(!isExecutablePageScript('application/json'), 'JSON MIME is inert');
}

const tests = [
  ['text input', testBasicTextInput],
  ['number input', testNumberInput],
  ['other native input leaf', testOtherNativeInputStaysAnEditableLeaf],
  ['generic void element leaf', testGenericVoidElementStaysAnEditableLeaf],
  ['nested div', testNestedDiv],
  ['semantic container tags', testSemanticContainerTagsStayStructured],
  ['unknown safe elements', testUnknownSafeElementsStayEditable],
  ['repeating section', testRepeatingSection],
  ['invalid repeating section contract', testInvalidRepeatingSectionsStayLosslessAndVisible],
  ['structural label container', testStructuralLabelContainer],
  ['list containers', testListContainers],
  ['direct text node', testDirectTextNodePreserved],
  ['HTML comments', testHtmlCommentsStayEditable],
  ['rolltemplate direct Mustache text', testRolltemplateDirectMustacheTextPreserved],
  ['whitespace-only text', testWhitespaceOnlyTextDoesNotInflate],
  ['inline sibling whitespace', testInlineWhitespaceBetweenSiblingsPreserved],
  ['stable formatted text', testFormattedDirectTextHasStableWhitespace],
  ['radio label wrapper', testRadioLabelDoesNotNestOnEmit],
  ['radio wrapper attribute boundary', testRadioWrapperKeepsInputAttributesOrFallsBackLosslessly],
  ['default control state', testDefaultControlStateIsEditable],
  ['omitted control defaults', testOmittedControlDefaultsStayOmittedInBlockState],
  ['select option groups', testSelectOptionGroupsStayEditable],
  ['unknown attributes', testUnknownAttributesSurviveMatchedBlocks],
  ['css rule', testCssRule],
  ['i18n json', testI18nJson],
  ['i18n flat', testI18nFlat],
  ['raw fallback', testRawFallback],
  ['coverage', testCoverageStat],
  ['css coverage exposes raw fallback', testCssCoverageExposesRawFallback],
  ['inline bold <b>', testInlineBoldB],
  ['inline bold <strong>', testInlineBoldStrong],
  ['inline italic <em>', testInlineItalicEm],
  ['inline italic <i>', testInlineItalicI],
  ['semantic inline container with nested i18n', testSemanticInlineContainerKeepsNestedI18n],
  ['table caption', testTableCaption],
  ['inline break <br>', testInlineBreak],
  ['css @font-face', testCssFontFace],
  ['table column structure', testTableColumnStructure],
  ['generic input table stays atomic', testGenericInputTableDoesNotCollapseToSkillRow],
  ['css @import', testCssImport],
  ['css bare at-rule preservation', testCssBareAtRulePreservation],
  ['css @media structure', testCssMediaQueryStructure],
  ['css @keyframes structure', testCssKeyframesStructureAndFallback],
  ['css selector_complex fallback', testCssSelectorComplexFallback],
  ['modern CSS and mixed script preservation', testModernCssAndMixedScriptPreservation],
  ['css compound selector', testCssCompoundSelector],
  ['css pseudo-element ::-webkit-*', testCssPseudoElementWebkit],
  ['css extended element tags', testCssExtendedElementTags],
  ['css custom element selector', testCssCustomElementSelector],
  ['script source classification', testScriptSourceClassification],
  ['page script editable block', testPageScriptMapsToEditableBlock],
  ['data script stays in HTML', testDataScriptStaysInHtml],
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
