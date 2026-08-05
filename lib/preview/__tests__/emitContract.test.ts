import * as Blockly from 'blockly';
import { registerAllBlocks } from '@/lib/blocks/registry';
import {
  composeEmittedWorkspaces,
  emitAll,
  emitWorkspace,
  normalizeBlockIdAttributes,
  normalizeEmittedRoll20Pair,
} from '../emit';
import { isRoll20WorkerScript } from '@/lib/import/worker_source';
import { importSheet } from '@/lib/import/index';
import { serializeRawHtml } from '@/lib/import/block_matcher';
import type { DomNode } from '@/lib/import/dom_walker';
import { getBlocklyAdapter } from '@/lib/blockly/adapter';
import { replaceWorkerWorkspaceFromSourceHtml } from '@/lib/blockly/workerWorkspace';

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function testRawFallbackPair(): void {
  const result = normalizeEmittedRoll20Pair(
    '<div class="maindiv"><label class="name">Name</label></div>',
    '.charsheet .maindiv .name { color: red; }',
  );

  assert(result.html.includes('class="maindiv"'), 'raw HTML class stays authored');
  assert(result.html.includes('class="name"'), 'nested raw HTML class stays authored');
  assert(result.css.includes('.charsheet .maindiv .name'), 'raw CSS matches authored HTML');
}

function testAuthoredClassAndIdRoundTrip(): void {
  registerAllBlocks();
  const imported = importSheet({
    html: '<div id="root" class="panel sheet-kept"><input type="text" name="attr_name" class="field sheet-field"></div>',
    css: '.panel { color: red; } .sheet-kept { display: block; } #root { padding: 4px; }',
  });
  const htmlWorkspace = new Blockly.Workspace();
  const cssWorkspace = new Blockly.Workspace();
  Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(imported.html), htmlWorkspace);
  Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(imported.css), cssWorkspace);

  const result = emitAll({ html: htmlWorkspace, css: cssWorkspace });
  assert(result.html.includes('id="root"'), 'authored id survives import and emit');
  assert(
    result.html.includes('class="panel sheet-kept"'),
    'mixed modern and sheet-prefixed classes survive import and emit',
  );
  assert(
    result.html.includes('class="field sheet-field"'),
    'nested class tokens survive import and emit',
  );
  assert(!result.html.includes('sheet-panel'), 'modern emit does not invent a sheet prefix');
  assert(result.css.includes('.panel {'), 'modern class selector survives import and emit');
  assert(result.css.includes('.sheet-kept {'), 'authored sheet-prefixed selector survives');
  assert(result.css.includes('#root {'), 'authored id selector survives');

  htmlWorkspace.dispose();
  cssWorkspace.dispose();
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

  assert(result.html.includes('.panel .title'), 'inline style selectors stay authored');
  assert(result.html.includes('class="panel"'), 'inline style HTML stays authored');
  assert(result.css.includes('.panel .title'), 'external CSS stays authored');
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

function testComposedWorkspaceCacheResultsKeepTheOutputContract(): void {
  const result = composeEmittedWorkspaces({
    html: { code: '<div class="panel">ok</div>', warnings: [], generatedCss: '.panel { position: absolute; }' },
    css: { code: '.panel { color: red; }', warnings: [], generatedCss: '' },
    i18n: { code: '{"panel":"Panel"}', warnings: [], generatedCss: '' },
    js: { code: 'window.pageReady = true;', warnings: [], generatedCss: '' },
    worker: { code: 'on("sheet:opened", function () {});', warnings: [], generatedCss: '' },
  });
  assert(result.html.includes('class="panel"'), 'cached HTML result preserves authored classes');
  assert(result.css.includes('position: absolute'), 'cached generated CSS is composed');
  assert(result.css.includes('color: red'), 'cached authored CSS is composed');
  assert(result.i18n.includes('panel'), 'cached i18n result is preserved');
  assert(result.js.includes('pageReady'), 'cached page JS result is preserved');
  assert(result.worker.includes('sheet:opened'), 'cached worker result is preserved');
}

function testBuilderLayoutCssIsEmittedWithItsBlock(): void {
  registerAllBlocks();
  const colrowWorkspace = new Blockly.Workspace();
  const colrow = colrowWorkspace.newBlock('r20_colrow_n');
  colrow.setFieldValue('3', 'N');
  const colrowPair = emitAll({ html: colrowWorkspace });
  assert(colrowPair.html.includes('sheet-colrow-3'), 'column block keeps its structural class');
  assert(colrowPair.css.includes(':where(.sheet-colrow-3)'), 'column helper CSS is emitted with the block');
  colrowWorkspace.dispose();

  const spacerWorkspace = new Blockly.Workspace();
  const spacer = spacerWorkspace.newBlock('r20_spacer');
  spacer.setFieldValue('large', 'SIZE');
  const spacerPair = emitAll({ html: spacerWorkspace });
  assert(spacerPair.html.includes('sheet-spacer-large'), 'spacer block keeps its structural class');
  assert(spacerPair.css.includes(':where(.sheet-spacer-large)'), 'spacer helper CSS is emitted with the block');
  spacerWorkspace.dispose();
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
  assert(result.html.includes('class="shell"'), 'semantic container class is emitted exactly');
  assert(result.html.includes('>Title</h2>'), 'semantic container child is emitted');
  assert(result.html.includes('data-r20-block-id='), 'semantic container remains selectable');
  workspace.dispose();
}

function testTopLevelHtmlCommentDoesNotGainLayoutWrapper(): void {
  registerAllBlocks();
  const workspace = new Blockly.Workspace();
  const comment = workspace.newBlock('r20_html_comment');
  comment.setFieldValue('top note', 'TEXT');

  const emitted = emitWorkspace(workspace, 'html').code;
  assert(emitted === '<!--top note-->', 'top-level HTML comment emits without a layout wrapper');
  assert(!emitted.includes('<div'), 'hidden source comment does not create a visible sheet object');

  const imported = importSheet({ html: emitted });
  assert(
    (imported.html.match(/r20_html_comment/g) || []).length === 1,
    'top-level HTML comment remains one block after re-import',
  );
  workspace.dispose();
}

function testNestedMultilineHtmlCommentKeepsAuthoredWhitespace(): void {
  registerAllBlocks();
  const source = '<section><!--first\n    second\n\tthird--><span>After</span></section>';
  const imported = importSheet({ html: source });
  const workspace = new Blockly.Workspace();
  Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(imported.html), workspace);

  const emitted = emitAll({ html: workspace }).html;
  assert(
    emitted.includes('<!--first\n    second\n\tthird-->'),
    'nested multiline HTML comment keeps authored internal whitespace',
  );

  const reimported = importSheet({ html: emitted });
  const roundTripWorkspace = new Blockly.Workspace();
  Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(reimported.html), roundTripWorkspace);
  const roundTrip = emitAll({ html: roundTripWorkspace }).html;
  assert(
    emitted.replace(/\sdata-r20-block-id="[^"]*"/g, '')
      === roundTrip.replace(/\sdata-r20-block-id="[^"]*"/g, ''),
    'nested multiline HTML comment stays stable after re-import',
  );

  workspace.dispose();
  roundTripWorkspace.dispose();
}

function testBlockIdAttributeEscaping(): void {
  registerAllBlocks();
  const workspace = new Blockly.Workspace();
  const textarea = workspace.newBlock('r20_textarea', 'unsafe"/id<&>');
  textarea.setFieldValue('notes', 'NAME');
  textarea.setFieldValue('field', 'CLASS');

  const result = emitAll({ html: workspace });
  assert(
    result.html.includes('data-r20-block-id="unsafe&quot;/id&lt;&amp;&gt;"'),
    'block id is escaped before it enters an HTML attribute',
  );
  assert(result.html.includes('<textarea '), 'escaped block id keeps the opening tag valid');
  assert(result.html.includes('</textarea>'), 'escaped block id keeps the closing tag valid');
  workspace.dispose();
}

function testStaleRawBlockIdIsReplaced(): void {
  registerAllBlocks();
  const workspace = new Blockly.Workspace();
  const raw = workspace.newBlock('r20_raw_html', 'current"id');
  raw.setFieldValue(
    '<textarea data-r20-block-id="stale"tail" name="attr_notes">Text</textarea>',
    'HTML',
  );

  const result = emitAll({ html: workspace }).html;
  assert(
    result.includes('data-r20-block-id="current&quot;id"'),
    'raw HTML receives the escaped current block id',
  );
  assert(!result.includes('stale"tail'), 'a stale malformed block id is fully replaced');
  assert(result.includes(' name="attr_notes"'), 'attributes after a stale block id remain intact');
  workspace.dispose();
}

function testNestedStaleRawBlockIdIsRemoved(): void {
  registerAllBlocks();
  const workspace = new Blockly.Workspace();
  const raw = workspace.newBlock('r20_raw_html', 'current-root');
  raw.setFieldValue(
    '<section><textarea data-r20-block-id="stale"tail" name="attr_notes">Text</textarea></section>',
    'HTML',
  );

  const result = emitAll({ html: workspace }).html;
  assert(result.includes('data-r20-block-id="current-root"'), 'current outer raw block marker remains');
  assert(!result.includes('stale"tail'), 'nested stale block marker is removed at the HTML boundary');
  assert(result.includes('<textarea name="attr_notes">'), 'nested authored markup remains after cleanup');
  workspace.dispose();
}

function testGeneratedBlockIdsSurviveFinalNormalization(): void {
  const escape = (value: string) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  for (let index = 0; index < 128; index += 1) {
    const id = Blockly.utils.idGenerator.genUid();
    const normalized = normalizeBlockIdAttributes(
      `<textarea data-r20-block-id="${escape(id)}"></textarea>`,
      new Set([id]),
    );
    assert(
      normalized.includes(`data-r20-block-id="${escape(id)}"`),
      'generated block id survives final HTML normalization',
    );
  }

  for (let index = 0; index < 64; index += 1) {
    const workspace = new Blockly.Workspace();
    const container = workspace.newBlock('r20_div');
    const id = Blockly.utils.idGenerator.genUid();
    const textarea = workspace.newBlock('r20_textarea', id);
    textarea.setFieldValue('notes', 'NAME');
    container.getInput('CONTENT')!.connection!.connect(textarea.previousConnection!);
    const emitted = emitAll({ html: workspace }).html;
    assert(
      emitted.includes(`data-r20-block-id="${escape(id)}"`),
      'generated nested textarea id survives the complete emit path',
    );
    if (index < 32) {
      const imported = importSheet({ html: emitted });
      const importedWorkspace = new Blockly.Workspace();
      Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(imported.html), importedWorkspace);
      const importedTextarea = importedWorkspace.getAllBlocks(false)
        .find((block) => block.type === 'r20_textarea');
      assert(importedTextarea?.getFieldValue('NAME') === 'notes', 'generated textarea name survives re-import');
      assert(String(importedTextarea?.getFieldValue('ROWS')) === '3', 'generated textarea rows survive re-import');
      importedWorkspace.dispose();
    }
    workspace.dispose();
  }
}

function testBlockIdNormalizationOnlyTouchesOpeningTags(): void {
  const source = [
    '<script type="text/worker">var marker = \' data-r20-block-id="worker-literal"\';</script>',
    '<textarea name="attr_notes"> data-r20-block-id="textarea-literal"</textarea>',
    '<div> data-r20-block-id="text-literal"</div>',
    '<!-- data-r20-block-id="comment-literal" -->',
  ].join('');
  assert(
    normalizeBlockIdAttributes(source, new Set()) === source,
    'block marker cleanup leaves Worker, RCDATA, text, and comments untouched',
  );

  const current = normalizeBlockIdAttributes(
    '<section data-r20-block-id="current"><span data-r20-block-id="stale">Text</span></section>',
    new Set(['current']),
  );
  assert(current.includes('data-r20-block-id="current"'), 'allowed opening-tag marker remains');
  assert(!current.includes('data-r20-block-id="stale"'), 'stale opening-tag marker is removed');
}

function testRawSerializationDropsNestedEditorMarkers(): void {
  const root: DomNode = {
    type: 'element' as const,
    tag: 'section',
    attrs: { class: 'panel', 'data-r20-block-id': 'stale-root' },
    parent: null,
    children: [],
  };
  const child: DomNode = {
    type: 'element' as const,
    tag: 'textarea',
    attrs: {
      name: 'attr_notes',
      'data-r20-block-id': 'stale"child',
      'data-r20-text-node': '1',
    },
    parent: root,
    children: [],
  };
  root.children.push(child);

  const result = serializeRawHtml(root);
  assert(!result.includes('data-r20-block-id'), 'raw serialization drops nested block markers');
  assert(!result.includes('data-r20-text-node'), 'raw serialization drops nested text markers');
  assert(result.includes('<textarea name="attr_notes"></textarea>'), 'authored nested attributes remain');
}

function testImportDropsNestedEditorMarkersBeforeMatching(): void {
  registerAllBlocks();
  const imported = importSheet({
    html: '<section data-r20-block-id="stale-root"><textarea data-r20-block-id="stale-textarea" name="attr_notes">Text</textarea><input data-r20-block-id="stale-input" name="attr_name"></section>',
  });
  const workspace = new Blockly.Workspace();
  Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(imported.html), workspace);
  const result = emitAll({ html: workspace }).html;

  assert(!result.includes('stale-root'), 'import drops a stale root editor marker');
  assert(!result.includes('stale-textarea'), 'import drops a stale nested textarea marker');
  assert(!result.includes('stale-input'), 'import drops a stale nested input marker');
  assert(result.includes('name="attr_notes"'), 'authored textarea attributes survive marker cleanup');
  assert(result.includes('name="attr_name"'), 'authored input attributes survive marker cleanup');
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
  assert(result.html.includes('class="panel"'), 'generic element class is emitted exactly');
  assert(result.html.includes('>Open</span>'), 'generic element child is emitted');
  workspace.dispose();
}

function testGenericVoidElementEmit(): void {
  registerAllBlocks();
  const atomWorkspace = new Blockly.Workspace();
  const atom = atomWorkspace.newBlock('r20_element_atom');
  atom.setFieldValue('source', 'TAG');
  atom.setFieldValue('audio-source', 'CLASS');
  atom.setFieldValue('display: none', 'STYLE');

  assert(!atom.getInput('CONTENT'), 'generic void element has no child slot');
  const atomResult = emitAll({ html: atomWorkspace });
  assert(atomResult.html.includes('<source'), 'generic void element tag is emitted');
  assert(atomResult.html.includes('class="audio-source"'), 'generic void class is emitted exactly');
  assert(!atomResult.html.includes('</source>'), 'generic void element remains a leaf');
  atomWorkspace.dispose();

  const containerWorkspace = new Blockly.Workspace();
  const container = containerWorkspace.newBlock('r20_element_container');
  container.setFieldValue('source', 'TAG');
  const containerResult = emitAll({ html: containerWorkspace });
  assert(containerResult.html.includes('<section'), 'container rejects a void element tag');
  assert(!containerResult.html.includes('<source'), 'container cannot emit a false void frame');
  containerWorkspace.dispose();
}

function testInlineBreakClassEmit(): void {
  registerAllBlocks();
  const workspace = new Blockly.Workspace();
  const block = workspace.newBlock('r20_inline_break');
  block.setFieldValue('line-break', 'CLASS');
  block.setFieldValue('display: block', 'STYLE');

  const result = emitAll({ html: workspace });
  assert(result.html.includes('<br'), 'inline break element is emitted');
  assert(result.html.includes('class="line-break"'), 'inline break class is preserved');
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

function testInlineSelectSiblingRoundTrip(): void {
  registerAllBlocks();
  const source = '<label><select name="attr_mode"><option value="a">A</option></select><span>Mode</span></label>';
  const imported = importSheet({ html: source });
  const firstWorkspace = new Blockly.Workspace();
  Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(imported.html), firstWorkspace);
  const first = emitAll({ html: firstWorkspace }).html;

  const reimported = importSheet({ html: first });
  const secondWorkspace = new Blockly.Workspace();
  Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(reimported.html), secondWorkspace);
  const second = emitAll({ html: secondWorkspace }).html;
  const stripIds = (html: string) => html.replace(/\sdata-r20-block-id="[^"]*"/g, '');

  assert(!/<\/select>\s+<span>/.test(stripIds(first)), 'inline select does not invent sibling whitespace');
  assert(stripIds(first) === stripIds(second), 'inline select siblings stay stable after re-import');
  firstWorkspace.dispose();
  secondWorkspace.dispose();
}

function testTextareaRcdataRoundTrip(): void {
  registerAllBlocks();
  const source = '<div><textarea name="attr_code"><div class="sample"/> &lt;span&gt; @{name} &amp;{template:card}</textarea><span>After</span></div>';
  const imported = importSheet({ html: source });
  const firstWorkspace = new Blockly.Workspace();
  Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(imported.html), firstWorkspace);
  const first = emitAll({ html: firstWorkspace }).html;
  const reimported = importSheet({ html: first });
  const secondWorkspace = new Blockly.Workspace();
  Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(reimported.html), secondWorkspace);
  const second = emitAll({ html: secondWorkspace }).html;
  const stripIds = (html: string) => html.replace(/\sdata-r20-block-id="[^"]*"/g, '');

  assert(first.includes('&lt;div class=&quot;sample&quot;/&gt;'), 'textarea keeps literal self-closing markup as text');
  assert(first.includes('&lt;span&gt;'), 'textarea keeps encoded markup text');
  assert(stripIds(first) === stripIds(second), 'textarea RCDATA stays stable after re-import');
  firstWorkspace.dispose();
  secondWorkspace.dispose();
}

function testEditedBoundaryWhitespaceRoundTrip(): void {
  registerAllBlocks();
  const workspace = new Blockly.Workspace();
  const container = workspace.newBlock('r20_semantic_container');
  container.setFieldValue('p', 'TAG');
  const leadingSpace = workspace.newBlock('r20_text_node');
  leadingSpace.setFieldValue(' ', 'TEXT');
  const label = workspace.newBlock('r20_static_text');
  label.setFieldValue('Alpha', 'TEXT');
  container.getInput('CONTENT')!.connection!.connect(leadingSpace.previousConnection!);
  leadingSpace.nextConnection!.connect(label.previousConnection!);

  const first = emitAll({ html: workspace }).html;
  assert(!/>\s+<span/.test(first), 'ordinary container drops a stranded leading whitespace block');

  const imported = importSheet({ html: first });
  const secondWorkspace = new Blockly.Workspace();
  Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(imported.html), secondWorkspace);
  const second = emitAll({ html: secondWorkspace }).html;
  const stripIds = (html: string) => html.replace(/\sdata-r20-block-id="[^"]*"/g, '');
  assert(stripIds(first) === stripIds(second), 'edited boundary whitespace is stable after re-import');

  const preWorkspace = new Blockly.Workspace();
  const pre = preWorkspace.newBlock('r20_semantic_container');
  pre.setFieldValue('pre', 'TAG');
  const preSpace = preWorkspace.newBlock('r20_text_node');
  preSpace.setFieldValue(' ', 'TEXT');
  const preLabel = preWorkspace.newBlock('r20_static_text');
  preLabel.setFieldValue('Alpha', 'TEXT');
  pre.getInput('CONTENT')!.connection!.connect(preSpace.previousConnection!);
  preSpace.nextConnection!.connect(preLabel.previousConnection!);
  assert(/>\s+<span/.test(emitAll({ html: preWorkspace }).html), 'pre keeps leading whitespace');

  workspace.dispose();
  secondWorkspace.dispose();
  preWorkspace.dispose();
}

function testNestedRawTextIndentationRoundTrip(): void {
  registerAllBlocks();
  const source = [
    '<div class="outer">',
    '  <div class="inner">',
    '    <textarea name="attr_notes" rows="4">Alpha\n    Beta\n\tGamma</textarea>',
    '    <pre>One\n  Two</pre>',
    '  </div>',
    '</div>',
  ].join('\n');
  const emitImported = (html: string) => {
    const imported = importSheet({ html });
    const workspace = new Blockly.Workspace();
    Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(imported.html), workspace);
    const emitted = emitAll({ html: workspace }).html;
    workspace.dispose();
    return emitted;
  };
  const first = emitImported(source);
  const second = emitImported(first);
  const stripIds = (html: string) => html.replace(/\sdata-r20-block-id="[^"]*"/g, '');
  assert(stripIds(first) === stripIds(second), 'nested textarea and pre indentation stays stable');

  const attributeSource = '<section><div data-note="Alpha\n  Beta"><span>Text</span></div></section>';
  const attributeFirst = emitImported(attributeSource);
  const attributeSecond = emitImported(attributeFirst);
  assert(
    stripIds(attributeFirst) === stripIds(attributeSecond),
    'multiline attribute whitespace stays stable inside nested containers',
  );
}

function testProtectedIndentRestoresLiteralReplacementTokens(): void {
  registerAllBlocks();
  const workspace = new Blockly.Workspace();
  const container = workspace.newBlock('r20_div', 'container-id');
  const textarea = workspace.newBlock('r20_textarea', "textarea-$`-$&-$'-$$_id");
  textarea.setFieldValue('notes', 'NAME');
  textarea.setFieldValue('Alpha\nBeta', 'DEFAULT');
  container.getInput('CONTENT')!.connection!.connect(textarea.previousConnection!);

  const emitted = emitAll({ html: workspace }).html;
  assert(
    emitted.includes('data-r20-block-id="textarea-$`-$&amp;-$\'-$$_id"'),
    'protected textarea restores block ids without replacement-token expansion',
  );
  assert((emitted.match(/<textarea\b/g) || []).length === 1, 'protected textarea is emitted once');
  assert((emitted.match(/<div\b/g) || []).length === 1, 'protected textarea does not duplicate its parent');
  assert(emitted.includes('Alpha\nBeta</textarea>'), 'protected textarea keeps multiline text intact');
  workspace.dispose();
}

function testRolltemplateDirectMustacheTokensRoundTrip(): void {
  registerAllBlocks();
  const source = [
    '<rolltemplate class="sheet-rolltemplate-demo">',
    '{{#title}}',
    '<div class="sheet-title">{{title}}</div>',
    '{{/title}}',
    '<div class="sheet-row">{{label}}: {{value}}</div>',
    'tail',
    '</rolltemplate>',
  ].join('');
  const imported = importSheet({ html: source });
  const workspace = new Blockly.Workspace();
  Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(imported.html), workspace);
  const emitted = emitAll({ html: workspace }).html;
  assert(emitted.includes('<rolltemplate'), 'rolltemplate wrapper survives workspace hydration');
  assert(emitted.includes('{{#title}}'), 'opening Mustache token survives emit');
  assert(emitted.includes('{{title}}'), 'field Mustache token survives emit');
  assert(emitted.includes('{{/title}}'), 'closing Mustache token survives emit');
  assert(emitted.includes('tail'), 'direct trailing text survives emit');
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

function testCssDeclarationKeepsNestedSemicolons(): void {
  registerAllBlocks();
  const workspace = new Blockly.Workspace();
  const rule = workspace.newBlock('r20_css_rule');
  const selector = workspace.newBlock('r20_selector_class');
  selector.setFieldValue('asset-proof', 'NAME');
  rule.getInput('SELECTOR')!.connection!.connect(selector.outputConnection!);
  const background = workspace.newBlock('r20_css_decl');
  background.setFieldValue('background-image', 'PROPERTY');
  background.setFieldValue('url("data:image/png;base64,AAAA")', 'VALUE');
  const content = workspace.newBlock('r20_css_decl');
  content.setFieldValue('content', 'PROPERTY');
  content.setFieldValue('"left;right"; color: red', 'VALUE');
  rule.getInput('DECLS')!.connection!.connect(background.previousConnection!);
  background.nextConnection!.connect(content.previousConnection!);

  const result = emitAll({ css: workspace });
  assert(
    result.css.includes('url("data:image/png;base64,AAAA")'),
    'semicolon inside a CSS function is preserved',
  );
  assert(/content: "left;right"\s+color: red;/.test(result.css), 'quoted semicolon is preserved');
  assert(!result.css.includes('content: "left;right"; color: red;'), 'top-level declaration delimiter is removed');
  workspace.dispose();
}

function testI18nAriaLabelTagEmit(): void {
  registerAllBlocks();
  const workspace = new Blockly.Workspace();
  const block = workspace.newBlock('r20_i18n_aria_label');
  block.setFieldValue('panel.label', 'KEY');
  block.setFieldValue('Panel', 'DEFAULT');
  block.setFieldValue('div', 'TAG');
  block.setFieldValue('panel', 'CLASS');

  const result = emitAll({ html: workspace });
  assert(result.html.includes('<div'), 'i18n aria-label keeps the authored tag');
  assert(result.html.includes('data-i18n-aria-label="panel.label"'), 'i18n aria key is emitted');
  assert(!result.html.includes('<span data-i18n-aria-label="panel.label"'), 'aria label is not forced to span');
  workspace.dispose();
}

function testI18nTitleAndHtmlTagEmit(): void {
  registerAllBlocks();
  const workspace = new Blockly.Workspace();
  const title = workspace.newBlock('r20_i18n_title');
  title.setFieldValue('panel.title', 'KEY');
  title.setFieldValue('Panel title', 'DEFAULT');
  title.setFieldValue('div', 'TAG');

  const rich = workspace.newBlock('r20_i18n_html');
  rich.setFieldValue('panel.rich', 'KEY');
  rich.setFieldValue('<b>Panel</b>', 'DEFAULT');
  rich.setFieldValue('div', 'TAG');

  const result = emitAll({ html: workspace });
  assert(result.html.includes('<div'), 'i18n title keeps the authored tag');
  assert(result.html.includes('title="Panel title"'), 'i18n title value is emitted');
  assert(result.html.includes('data-i18n-html="panel.rich"'), 'i18n html key is emitted');
  assert(result.html.includes('<b>Panel</b>'), 'i18n html body is emitted');
  assert(!result.html.includes('<span title="Panel title"'), 'i18n title is not forced to span');
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

function testImportedPageScriptBodyWhitespaceRoundTrip(): void {
  registerAllBlocks();
  const source = '<section>Before</section><script data-role="page">first();\n  second();</script>';
  const imported = importSheet({ html: source });
  const htmlWorkspace = new Blockly.Workspace();
  const jsWorkspace = new Blockly.Workspace();
  Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(imported.html), htmlWorkspace);
  Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(imported.js), jsWorkspace);

  const emitted = emitAll({ html: htmlWorkspace, js: jsWorkspace });
  assert(
    emitted.html.includes('<script data-role="page">first();\n  second();</script>'),
    'page script body whitespace stays authored',
  );
  assert(
    !emitted.html.match(/<script\b[^>]*data-r20-block-id/i),
    'page script does not receive an editor-only block marker',
  );
  const reimported = importSheet({ html: emitted.html });
  const firstScript = Blockly.utils.xml.textToDom(imported.js).querySelector('block');
  const secondScript = Blockly.utils.xml.textToDom(reimported.js).querySelector('block');
  const firstJs = firstScript?.querySelector('field[name="JS"]')?.textContent;
  const secondJs = secondScript?.querySelector('field[name="JS"]')?.textContent;
  assert(firstJs === secondJs, 'page script body remains exact after re-import');

  htmlWorkspace.dispose();
  jsWorkspace.dispose();
}

function testOrphanedPageScriptDoesNotDisappear(): void {
  registerAllBlocks();
  const htmlWorkspace = new Blockly.Workspace();
  const jsWorkspace = new Blockly.Workspace();
  const html = htmlWorkspace.newBlock('r20_raw_html');
  html.setFieldValue('<div id="without-anchor">Sheet</div>', 'HTML');
  const script = jsWorkspace.newBlock('r20_raw_page_js');
  script.setFieldValue('page-stale', 'SLOT');
  script.setFieldValue('data-role="page"', 'ATTRS');
  script.setFieldValue('window.staleSlotWasPreserved = true;', 'JS');

  const result = emitAll({ html: htmlWorkspace, js: jsWorkspace });
  assert(
    result.html.includes('window.staleSlotWasPreserved = true;'),
    'a page script survives when its HTML source anchor is missing',
  );
  assert(!result.html.includes('r20-page-js-slot:'), 'stale internal slot marker is not exported');
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
  const before = result.html.indexOf('id="before-script"');
  const pageScript = result.html.indexOf('data-role="page"');
  const after = result.html.indexOf('id="after-script"');
  const worker = result.html.indexOf('type="text/worker"');
  const workerCount = (result.html.match(/<script\b[^>]*type="text\/worker"/g) ?? []).length;

  assert(before >= 0 && before < pageScript, 'page script follows preceding HTML');
  assert(pageScript < after, 'page script stays before following HTML');
  assert(after < worker, 'worker source is emitted after the HTML source body');
  assert(workerCount === 1, 'worker source is emitted exactly once');
  workspace.dispose();
  workerWorkspace.dispose();
}

function testMultipleWorkerScriptBoundariesSurviveReimport(): void {
  registerAllBlocks();
  const adapter = getBlocklyAdapter();
  const workspace = new Blockly.Workspace();
  adapter.registerWorkspace('worker', workspace);
  try {
    const firstBody = 'on("sheet:opened", function () { setAttrs({ hp: 10 }); });';
    const secondBody = 'on("change:hp", function () { setAttrs({ mp: 5 }); });';
    const source = [
      `<script type="text/worker"> \n  ${firstBody}\n </script>`,
      `<script type="text/worker">\t\n  ${secondBody}\n\t</script>`,
    ].join('\n');

    const imported = replaceWorkerWorkspaceFromSourceHtml(source);
    assert(imported.scriptCount === 2, 'both authored worker scripts are discovered');
    assert(imported.targetCount === 2, 'multiple scripts stay as separate raw roots');
    assert(
      adapter.listAllBlocks('worker').every((block) => block.type === 'r20_raw_worker'),
      'multi-script input uses exact raw roots until script containers exist',
    );
    const firstImportedBodies = workspace.getAllBlocks(false)
      .map((block) => String(block.getFieldValue('JS') ?? ''));
    assert(firstImportedBodies.includes(firstBody), 'first worker body trims wrapper whitespace');
    assert(firstImportedBodies.includes(secondBody), 'second worker body trims wrapper whitespace');

    const firstEmit = emitAll({ worker: adapter.getWorkspace('worker') });
    const firstCount = (firstEmit.html.match(/<script\b[^>]*type="text\/worker"/g) ?? []).length;
    assert(firstCount === 2, 'emit preserves two worker script tags');
    assert(firstEmit.html.indexOf(firstBody) < firstEmit.html.indexOf(secondBody), 'script order is preserved');

    replaceWorkerWorkspaceFromSourceHtml(firstEmit.html);
    const secondImportedBodies = workspace.getAllBlocks(false)
      .map((block) => String(block.getFieldValue('JS') ?? ''));
    assert(
      JSON.stringify(secondImportedBodies) === JSON.stringify(firstImportedBodies),
      'worker fields remain stable after emit and reimport',
    );
    const secondEmit = emitAll({ worker: adapter.getWorkspace('worker') });
    const secondCount = (secondEmit.html.match(/<script\b[^>]*type="text\/worker"/g) ?? []).length;
    assert(secondCount === 2, 'reimport and emit preserve worker script count');
    assert(secondEmit.html.indexOf(firstBody) < secondEmit.html.indexOf(secondBody), 'reimport keeps script order');
  } finally {
    adapter.unregisterWorkspace('worker');
    workspace.dispose();
  }
}

function testWorkerIfDoesNotDuplicateReporterGrouping(): void {
  registerAllBlocks();
  const workspace = new Blockly.Workspace();
  const ifBlock = workspace.newBlock('r20_worker_if');
  const comparison = workspace.newBlock('r20_worker_cmp');
  const lhs = workspace.newBlock('r20_worker_v_ref');
  const rhs = workspace.newBlock('r20_literal_string');
  comparison.setFieldValue('>', 'OP');
  lhs.setFieldValue('hp', 'NAME');
  rhs.setFieldValue('0', 'STR');
  comparison.getInput('LHS')?.connection?.connect(lhs.outputConnection!);
  comparison.getInput('RHS')?.connection?.connect(rhs.outputConnection!);
  ifBlock.getInput('CONDITION')?.connection?.connect(comparison.outputConnection!);

  const result = emitWorkspace(workspace, 'worker').code;
  assert(result.includes('if (v.hp > 0) {}'), 'worker if keeps one condition grouping');
  assert(!result.includes('if ((v.hp > 0))'), 'worker if avoids duplicate grouping');
  workspace.dispose();
}

function testWorkerDeclarationKindIsEmitted(): void {
  registerAllBlocks();
  const workspace = new Blockly.Workspace();
  const varBlock = workspace.newBlock('r20_worker_var_let');
  const varValue = workspace.newBlock('r20_literal_string');
  varBlock.setFieldValue('var', 'KIND');
  varBlock.setFieldValue('legacyValue', 'VAR');
  varValue.setFieldValue('5', 'STR');
  varBlock.getInput('VALUE')?.connection?.connect(varValue.outputConnection!);

  const constBlock = workspace.newBlock('r20_worker_var_let');
  const constValue = workspace.newBlock('r20_literal_string');
  constBlock.setFieldValue('const', 'KIND');
  constBlock.setFieldValue('stableValue', 'VAR');
  constValue.setFieldValue('5', 'STR');
  constBlock.getInput('VALUE')?.connection?.connect(constValue.outputConnection!);
  varBlock.nextConnection?.connect(constBlock.previousConnection!);

  const result = emitWorkspace(workspace, 'worker').code;
  assert(result.includes('var legacyValue = 5;'), 'var declaration keyword is emitted');
  assert(result.includes('const stableValue = 5;'), 'const declaration keyword is emitted');
  workspace.dispose();
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
testAuthoredClassAndIdRoundTrip();
testAlreadyCanonicalPair();
testInlineStylePair();
testGeneratedPositionCss();
testComposedWorkspaceCacheResultsKeepTheOutputContract();
testBuilderLayoutCssIsEmittedWithItsBlock();
testSemanticContainerEmit();
testTopLevelHtmlCommentDoesNotGainLayoutWrapper();
testNestedMultilineHtmlCommentKeepsAuthoredWhitespace();
testBlockIdAttributeEscaping();
testStaleRawBlockIdIsReplaced();
testNestedStaleRawBlockIdIsRemoved();
testGeneratedBlockIdsSurviveFinalNormalization();
testBlockIdNormalizationOnlyTouchesOpeningTags();
testRawSerializationDropsNestedEditorMarkers();
testImportDropsNestedEditorMarkersBeforeMatching();
testGenericElementEmit();
testGenericVoidElementEmit();
testInlineBreakClassEmit();
testTopLevelWhitespaceTextRoundTrip();
testInlineFlowDoesNotGainWhitespace();
testInlineSelectSiblingRoundTrip();
testTextareaRcdataRoundTrip();
testEditedBoundaryWhitespaceRoundTrip();
testNestedRawTextIndentationRoundTrip();
testProtectedIndentRestoresLiteralReplacementTokens();
testRolltemplateDirectMustacheTokensRoundTrip();
testGenericCssTagEmit();
testCssDeclarationKeepsNestedSemicolons();
testI18nAriaLabelTagEmit();
testI18nTitleAndHtmlTagEmit();
testTypedPageScriptExportPreserved();
testUntypedPageScriptExportPreserved();
testEditablePageScriptExportPreserved();
testDedicatedPageScriptWorkspaceAppendsExportOnly();
testImportedPageScriptReturnsToItsHtmlSlot();
testImportedPageScriptBodyWhitespaceRoundTrip();
testOrphanedPageScriptDoesNotDisappear();
testPageScriptOrderAndWorkerUniqueness();
testMultipleWorkerScriptBoundariesSurviveReimport();
testWorkerIfDoesNotDuplicateReporterGrouping();
testWorkerDeclarationKindIsEmitted();
testMalformedRawTagDoesNotReceivePartialBlockId();
console.log('Emit Roll20 class-pair tests passed.');
