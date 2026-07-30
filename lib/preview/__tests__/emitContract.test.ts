import * as Blockly from 'blockly';
import { registerAllBlocks } from '@/lib/blocks/registry';
import { emitAll, emitWorkspace, normalizeEmittedRoll20Pair } from '../emit';
import { isRoll20WorkerScript } from '@/lib/import/worker_source';
import { importSheet } from '@/lib/import/index';

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function testRawFallbackPair(): void {
  const result = normalizeEmittedRoll20Pair(
    '<div class="maindiv"><label class="name">Name</label></div>',
    '.charsheet .maindiv .name { color: red; }',
  );

  assert(result.html.includes('class="sheet-maindiv"'), 'raw HTML class is prefixed');
  assert(result.html.includes('sheet-name'), 'nested raw HTML class is prefixed');
  assert(result.css.includes('.charsheet .sheet-maindiv .sheet-name'), 'raw CSS matches HTML');
}

function testAlreadyCanonicalPair(): void {
  const result = normalizeEmittedRoll20Pair(
    '<div class="sheet-row sheet-maindiv"></div>',
    '.charsheet .sheet-row .sheet-maindiv { display: block; }',
  );

  assert(
    result.html === '<div class="sheet-row sheet-maindiv"></div>',
    'canonical HTML is not double-prefixed',
  );
  assert(
    result.css === '.charsheet .sheet-row .sheet-maindiv { display: block; }',
    'canonical CSS is not double-prefixed',
  );
}

function testInlineStylePair(): void {
  const result = normalizeEmittedRoll20Pair(
    '<style>.panel .title { color: blue; }</style><div class="panel"><span class="title">T</span></div>',
    '.panel .title { color: blue; }',
  );

  assert(result.html.includes('.sheet-panel .sheet-title'), 'inline style selectors are prefixed');
  assert(result.html.includes('class="sheet-panel"'), 'inline style HTML is prefixed');
  assert(result.css.includes('.sheet-panel .sheet-title'), 'external CSS is prefixed');
}

function testGeneratedPositionCss(): void {
  registerAllBlocks();
  const workspace = new Blockly.Workspace();
  const block = workspace.newBlock('r20_pos_div');
  block.setFieldValue('32', 'LEFT_PX');
  block.setFieldValue('48', 'TOP_PX');
  block.setFieldValue('240', 'WIDTH_PX');
  block.setFieldValue('120', 'HEIGHT_PX');
  block.setFieldValue('positioned', 'CLASS');
  block.setFieldValue('border: 1px solid red', 'STYLE');

  const htmlResult = emitWorkspace(workspace, 'html');
  assert(htmlResult.code.includes('sheet-r20-position-'), 'position block has a stable generated class');
  assert(!htmlResult.code.includes('position:absolute'), 'position block does not put layout in HTML style');
  assert(htmlResult.generatedCss.includes('position: absolute'), 'position layout is registered as generated CSS');
  assert(htmlResult.generatedCss.includes('border: 1px solid red'), 'position block user style moves with generated CSS');

  const pair = emitAll({ html: workspace });
  assert(pair.css.includes('.sheet-r20-position-'), 'generated position CSS is part of CSS output');
  assert(pair.css.includes('left: 32px'), 'generated position left is preserved');
  workspace.dispose();
}

function testSemanticContainerEmit(): void {
  registerAllBlocks();
  const workspace = new Blockly.Workspace();
  const container = workspace.newBlock('r20_semantic_container');
  container.setFieldValue('article', 'TAG');
  container.setFieldValue('shell', 'CLASS');
  container.setFieldValue('padding: 8px', 'STYLE');

  const heading = workspace.newBlock('r20_heading');
  heading.setFieldValue('2', 'LEVEL');
  heading.setFieldValue('Title', 'TEXT');
  container.getInput('CONTENT')!.connection!.connect(heading.previousConnection!);

  const result = emitAll({ html: workspace });
  assert(result.html.includes('<article'), 'semantic container tag is emitted');
  assert(result.html.includes('class="sheet-shell"'), 'semantic container class is emitted');
  assert(result.html.includes('>Title</h2>'), 'semantic container child is emitted');
  assert(result.html.includes('data-r20-block-id='), 'semantic container remains selectable');
  workspace.dispose();
}

function testGenericElementEmit(): void {
  registerAllBlocks();
  const workspace = new Blockly.Workspace();
  const element = workspace.newBlock('r20_element_container');
  element.setFieldValue('custom-card', 'TAG');
  element.setFieldValue('panel', 'CLASS');
  const child = workspace.newBlock('r20_static_text');
  child.setFieldValue('Open', 'TEXT');
  element.getInput('CONTENT')!.connection!.connect(child.previousConnection!);

  const result = emitAll({ html: workspace });
  assert(result.html.includes('<custom-card'), 'generic element tag is emitted');
  assert(result.html.includes('class="sheet-panel"'), 'generic element class is emitted');
  assert(result.html.includes('>Open</span>'), 'generic element child is emitted');
  workspace.dispose();
}

function testInlineBreakClassEmit(): void {
  registerAllBlocks();
  const workspace = new Blockly.Workspace();
  const block = workspace.newBlock('r20_inline_break');
  block.setFieldValue('line-break', 'CLASS');
  block.setFieldValue('display: block', 'STYLE');

  const result = emitAll({ html: workspace });
  assert(result.html.includes('<br'), 'inline break element is emitted');
  assert(result.html.includes('class="sheet-line-break"'), 'inline break class is preserved');
  assert(result.html.includes('style="display: block"'), 'inline break style is preserved');
  workspace.dispose();
}

function testTopLevelWhitespaceTextRoundTrip(): void {
  registerAllBlocks();
  const workspace = new Blockly.Workspace();
  const text = workspace.newBlock('r20_text_node');
  text.setFieldValue(' ', 'TEXT');

  const first = emitAll({ html: workspace });
  assert(first.html.includes('<span data-r20-text-node="1"'), 'top-level text uses an inline marker');
  assert(!first.html.includes('<div data-r20-block-id='), 'top-level text is not wrapped in a block div');

  const imported = importSheet({ html: first.html });
  assert(imported.html.includes('r20_text_node'), 'inline text marker rehydrates as a text block');
  const secondWorkspace = new Blockly.Workspace();
  Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(imported.html), secondWorkspace);
  const second = emitAll({ html: secondWorkspace });
  const stripIds = (html: string) => html.replace(/\sdata-r20-block-id="[^"]*"/g, '');
  assert(stripIds(first.html) === stripIds(second.html), 'top-level whitespace survives import -> emit');
  workspace.dispose();
  secondWorkspace.dispose();
}

function testInlineFlowDoesNotGainWhitespace(): void {
  registerAllBlocks();
  const imported = importSheet({ html: '<p>🕷<b>Select a Playbook above to get started</b>🕷</p>' });
  const workspace = new Blockly.Workspace();
  Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(imported.html), workspace);
  const emitted = emitAll({ html: workspace }).html;
  assert(!/🕷\s+<b/.test(emitted), 'inline text before bold does not gain whitespace');
  assert(!/<\/b>\s+🕷/.test(emitted), 'inline text after bold does not gain whitespace');
  workspace.dispose();
}

function testGenericCssTagEmit(): void {
  registerAllBlocks();
  const workspace = new Blockly.Workspace();
  const rule = workspace.newBlock('r20_css_rule');
  const tag = workspace.newBlock('r20_selector_tag');
  tag.setFieldValue('custom-card', 'TAG');
  rule.getInput('SELECTOR')!.connection!.connect(tag.outputConnection!);
  const decl = workspace.newBlock('r20_css_decl');
  decl.setFieldValue('display', 'PROPERTY');
  decl.setFieldValue('block', 'VALUE');
  rule.getInput('DECLS')!.connection!.connect(decl.previousConnection!);

  const result = emitAll({ css: workspace });
  assert(result.css.includes('custom-card {'), 'generic CSS tag is emitted');
  assert(result.css.includes('display: block;'), 'generic CSS declaration is emitted');
  workspace.dispose();
}

function testTypedPageScriptExportPreserved(): void {
  registerAllBlocks();
  const workspace = new Blockly.Workspace();
  const block = workspace.newBlock('r20_raw_html');
  block.setFieldValue(
    '<script type="text/javascript" src="sheet-runtime.js">window.sheetReady = true;</script>',
    'HTML',
  );

  const result = emitAll({ html: workspace });
  assert(result.html.includes('type="text/javascript"'), 'typed script type is preserved');
  assert(result.html.includes('src="sheet-runtime.js"'), 'typed script src is preserved');
  assert(!result.html.includes('type="text/worker"'), 'typed page script is not rewritten as worker');
  workspace.dispose();
}

function testUntypedPageScriptExportPreserved(): void {
  registerAllBlocks();
  const workspace = new Blockly.Workspace();
  const block = workspace.newBlock('r20_raw_html');
  block.setFieldValue('<script>window.sheetReady = true;</script>', 'HTML');

  const result = emitAll({ html: workspace });
  assert(!isRoll20WorkerScript('', 'window.sheetReady = true;'), 'untyped page script is not classified as worker');
  assert(result.html.includes('<script') && result.html.includes('window.sheetReady = true;'), 'untyped page script is preserved');
  assert(!result.html.includes('type="text/worker"'), 'untyped page script is not rewritten as a worker');
  workspace.dispose();
}

function testEditablePageScriptExportPreserved(): void {
  registerAllBlocks();
  const workspace = new Blockly.Workspace();
  const block = workspace.newBlock('r20_raw_page_js');
  block.setFieldValue('type="text/javascript" src="page-runtime.js" defer', 'ATTRS');
  block.setFieldValue('window.pageReady = true;', 'JS');

  const result = emitAll({ html: workspace });
  assert(result.html.includes('r20_raw_page_js') === false, 'page script does not leak its block type into output');
  assert(result.html.includes('src="page-runtime.js"'), 'editable page script keeps attributes');
  assert(result.html.includes('window.pageReady = true;'), 'editable page script keeps body');
  assert(!result.html.includes('type="text/worker"'), 'editable page script stays outside worker output');
  workspace.dispose();
}

function testDedicatedPageScriptWorkspaceAppendsExportOnly(): void {
  registerAllBlocks();
  const workspace = new Blockly.Workspace();
  const block = workspace.newBlock('r20_raw_page_js');
  block.setFieldValue('defer', 'ATTRS');
  block.setFieldValue('window.pageReady = true;', 'JS');

  const result = emitAll({ html: null, js: workspace });
  assert(/<script[^>]*\bdefer>/.test(result.html), 'dedicated JS workspace emits a normal page script');
  assert(result.js.includes('window.pageReady = true;'), 'dedicated JS output remains observable separately');
  assert(!result.html.includes('type="text/worker"'), 'dedicated page JS does not enter the worker boundary');
  workspace.dispose();
}

function testImportedPageScriptReturnsToItsHtmlSlot(): void {
  registerAllBlocks();
  const htmlWorkspace = new Blockly.Workspace();
  const jsWorkspace = new Blockly.Workspace();
  const anchor = htmlWorkspace.newBlock('r20_page_js_slot');
  anchor.setFieldValue('page-0', 'SLOT');
  const script = jsWorkspace.newBlock('r20_raw_page_js');
  script.setFieldValue('page-0', 'SLOT');
  script.setFieldValue('data-role="page"', 'ATTRS');
  script.setFieldValue('window.pageReady = true;', 'JS');

  const result = emitAll({ html: htmlWorkspace, js: jsWorkspace });
  const before = result.html.indexOf('r20-page-js-slot');
  const page = result.html.indexOf('data-role="page"');
  assert(before < 0, 'internal page-JS slot marker is resolved');
  assert(page >= 0, 'imported page script is emitted');
  assert(result.html.indexOf('window.pageReady = true;') >= 0, 'page script body is emitted');
  htmlWorkspace.dispose();
  jsWorkspace.dispose();
}

function testPageScriptOrderAndWorkerUniqueness(): void {
  registerAllBlocks();
  const workspace = new Blockly.Workspace();
  const workerWorkspace = new Blockly.Workspace();
  const block = workspace.newBlock('r20_raw_html');
  block.setFieldValue(
    '<div id="before-script">Before</div>' +
      '<script data-role="page">window.pageReady = true;</script>' +
      '<div id="after-script">After</div>',
    'HTML',
  );
  const workerBlock = workerWorkspace.newBlock('r20_raw_worker');
  workerBlock.setFieldValue(
    'on("sheet:opened", function () { setAttrs({ hp: 10 }); });',
    'JS',
  );

  const result = emitAll({ html: workspace, worker: workerWorkspace });
  const before = result.html.indexOf('id="sheet-before-script"');
  const pageScript = result.html.indexOf('data-role="page"');
  const after = result.html.indexOf('id="sheet-after-script"');
  const worker = result.html.indexOf('type="text/worker"');
  const workerCount = (result.html.match(/<script\b[^>]*type="text\/worker"/g) ?? []).length;

  assert(before >= 0 && before < pageScript, 'page script follows preceding HTML');
  assert(pageScript < after, 'page script stays before following HTML');
  assert(after < worker, 'worker source is emitted after the HTML source body');
  assert(workerCount === 1, 'worker source is emitted exactly once');
  workspace.dispose();
  workerWorkspace.dispose();
}

function testMalformedRawTagDoesNotReceivePartialBlockId(): void {
  registerAllBlocks();
  const workspace = new Blockly.Workspace();
  const block = workspace.newBlock('r20_raw_html');
  block.setFieldValue(
    '<td<span class="sheet-description" colspan="2"><i>{{desc}}</i></td>',
    'HTML',
  );

  const result = emitAll({ html: workspace });
  assert(
    result.html.includes('<td<span class="sheet-description"'),
    'malformed raw tag is preserved as authored',
  );
  assert(
    !result.html.includes('<td data-r20-block-id="<span'),
    'block id is not inserted into a partial malformed tag name',
  );
  assert(
    result.html.includes('<div data-r20-block-id='),
    'malformed raw content remains selectable through a valid outer wrapper',
  );
  workspace.dispose();
}

testRawFallbackPair();
testAlreadyCanonicalPair();
testInlineStylePair();
testGeneratedPositionCss();
testSemanticContainerEmit();
testGenericElementEmit();
testInlineBreakClassEmit();
testTopLevelWhitespaceTextRoundTrip();
testInlineFlowDoesNotGainWhitespace();
testGenericCssTagEmit();
testTypedPageScriptExportPreserved();
testUntypedPageScriptExportPreserved();
testEditablePageScriptExportPreserved();
testDedicatedPageScriptWorkspaceAppendsExportOnly();
testImportedPageScriptReturnsToItsHtmlSlot();
testPageScriptOrderAndWorkerUniqueness();
testMalformedRawTagDoesNotReceivePartialBlockId();
console.log('Emit Roll20 class-pair tests passed.');
