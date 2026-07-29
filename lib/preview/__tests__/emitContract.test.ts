import * as Blockly from 'blockly';
import { registerAllBlocks } from '@/lib/blocks/registry';
import { emitAll, emitWorkspace, normalizeEmittedRoll20Pair } from '../emit';
import { isRoll20WorkerScript } from '@/lib/import/worker_source';

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

testRawFallbackPair();
testAlreadyCanonicalPair();
testInlineStylePair();
testGeneratedPositionCss();
testSemanticContainerEmit();
testGenericElementEmit();
testGenericCssTagEmit();
testTypedPageScriptExportPreserved();
testUntypedPageScriptExportPreserved();
console.log('Emit Roll20 class-pair tests passed.');
