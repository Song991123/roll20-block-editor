import assert from 'node:assert/strict';
import * as Blockly from 'blockly';
import { registerAllBlocks } from '@/lib/blocks/registry';
import { getBlocklyAdapter } from '@/lib/blockly/adapter';

registerAllBlocks();

const adapter = getBlocklyAdapter();
const workspace = new Blockly.Workspace();
adapter.registerWorkspace('html', workspace);

try {
  assert.equal(workspace.rendered, false, 'the model workspace must be headless');
  assert.equal(adapter.getWorkspaceSvg('html'), null, 'headless models must not expose an SVG surface');

  adapter.hydrateFromXml(
    'html',
    '<xml xmlns="https://developers.google.com/blockly/xml">' +
      '<block type="r20_raw_html" id="headless-test" x="24" y="24">' +
      '<field name="HTML">&lt;div&gt;headless&lt;/div&gt;</field>' +
      '</block>' +
      '</xml>',
  );

  assert.equal(adapter.countBlocks('html'), 1, 'headless hydrate should create one model block');
  assert.equal(workspace.getBlockById('headless-test')?.rendered, false);
  assert.match(adapter.serializeXml('html'), /r20_raw_html/);
  console.log('headless workspace adapter test PASS');
} finally {
  adapter.unregisterWorkspace('html');
  workspace.dispose();
}
