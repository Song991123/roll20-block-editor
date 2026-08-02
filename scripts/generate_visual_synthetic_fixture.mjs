#!/usr/bin/env node
/**
 * Generate the anonymous fixture used by the local preview/edit pixel gate.
 *
 * This fixture is synthetic by design. It contains no third-party sheet
 * source, identity, asset URL, screenshot, or source-derived measurement.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
const outIndex = args.indexOf('--out-dir');
const outDir = path.resolve(
  outIndex >= 0 && args[outIndex + 1] ? args[outIndex + 1] : '.tmp/visual-synthetic',
);
const selfTest = args.includes('--self-test');

const files = {
  'fixture-A/source.html': [
    '<div class="sheet-sandbox-proof" style="width:420px;min-height:180px;padding:16px">',
    '  <label data-i18n="name"></label>',
    '  <input type="text" name="attr_name" value="">',
    '  <input type="hidden" name="attr_clicked" value="0">',
    '  <div class="sheet-proof-actions">',
    '    <button type="roll" name="roll_check" value="&amp;{template:proof} {{name=Sandbox proof}} {{result=[[1d20]]}}">Roll</button>',
    '    <button type="action" name="act_mark" data-i18n="mark"></button>',
    '  </div>',
    '  <script type="text/worker">on(\'clicked:mark\', function () { setAttrs({ clicked: \'1\' }); });</script>',
    '</div>',
    '<rolltemplate class="sheet-rolltemplate-proof">',
    '  <div class="sheet-proof-card">',
    '    <div class="sheet-proof-title">{{name}}</div>',
    '    <div class="sheet-proof-row"><span data-i18n="result"></span><strong>{{result}}</strong></div>',
    '  </div>',
    '</rolltemplate>',
  ].join('\n'),
  'fixture-A/source.css': [
    '.sheet-sandbox-proof { background: #fff0f5; border: 2px solid #d96b91; box-sizing: border-box; color: #3b2730; }',
    '.sheet-sandbox-proof label { display: block; font-weight: 700; }',
    '.sheet-sandbox-proof .sheet-proof-actions { display: flex; align-items: center; gap: 8px; margin-top: 12px; }',
    '.sheet-sandbox-proof .sheet-proof-actions button { margin: 0; }',
    '.sheet-rolltemplate-proof .sheet-proof-card { width: 280px; overflow: hidden; border: 2px solid #d96b91; border-radius: 6px; background: #fffafc; color: #3b2730; }',
    '.sheet-rolltemplate-proof .sheet-proof-title { padding: 10px 12px; background: #d96b91; color: #ffffff; font-size: 17px; font-weight: 700; }',
    '.sheet-rolltemplate-proof .sheet-proof-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 12px; }',
    '.sheet-rolltemplate-proof .sheet-proof-row strong { color: #9f3158; font-size: 20px; }',
  ].join('\n'),
  'fixture-A/source.i18n': JSON.stringify({ name: 'Name', result: 'Result', mark: 'Mark' }),
  'fixture-A/manifest.json': JSON.stringify({
    id: 'fixture-A',
    synthetic: true,
    legacyMode: 'modern',
  }),
  'fixture-B/source.html': [
    '<div class="sheet-layout-proof" style="width:760px;min-height:320px;padding:16px">',
    '  <div class="sheet-2colrow">',
    '    <div class="sheet-col">',
    '      <label data-i18n="name"></label>',
    '      <input type="text" name="attr_name" value="">',
    '      <textarea name="attr_notes" rows="3"></textarea>',
    '    </div>',
    '    <div class="sheet-col">',
    '      <label data-i18n="role"></label>',
    '      <select name="attr_role"><option value="one">One</option><option value="two">Two</option></select>',
    '      <table class="sheet-layout-table">',
    '        <thead><tr><th data-i18n="score"></th><th data-i18n="state"></th></tr></thead>',
    '        <tbody><tr><td><input type="number" name="attr_score" value="0"></td><td data-i18n="ready"></td></tr></tbody>',
    '      </table>',
    '    </div>',
    '  </div>',
    '</div>',
  ].join('\n'),
  'fixture-B/source.css': [
    '.sheet-layout-proof { background: #fffafc; border: 2px solid #d96b91; box-sizing: border-box; color: #3b2730; }',
    '.sheet-layout-proof .sheet-2colrow { display: flex; gap: 16px; align-items: flex-start; }',
    '.sheet-layout-proof .sheet-col { flex: 1 1 0; min-width: 0; }',
    '.sheet-layout-proof label { display: block; font-weight: 700; margin-bottom: 6px; }',
    '.sheet-layout-proof textarea, .sheet-layout-proof select { display: block; margin-top: 8px; }',
    '.sheet-layout-proof table { width: 100%; margin-top: 14px; border-collapse: collapse; }',
    '.sheet-layout-proof th, .sheet-layout-proof td { border: 1px solid #e7b5c6; padding: 4px; }',
  ].join('\n'),
  'fixture-B/source.i18n': JSON.stringify({
    name: 'Name',
    role: 'Role',
    score: 'Score',
    state: 'State',
    ready: 'Ready',
  }),
  'fixture-B/manifest.json': JSON.stringify({
    id: 'fixture-B',
    synthetic: true,
    legacyMode: 'modern',
    purpose: 'generic layout/control regression',
  }),
};

async function main() {
  if (selfTest) {
    if (!files['fixture-A/source.html'].includes('sheet-sandbox-proof')) {
      throw new Error('synthetic HTML marker missing');
    }
    if (!files['fixture-A/source.html'].includes('type="text/worker"')) {
      throw new Error('synthetic worker marker missing');
    }
    if (!files['fixture-A/source.html'].includes('<rolltemplate')) {
      throw new Error('synthetic Rolltemplate marker missing');
    }
    if (!files['fixture-A/source.html'].includes('&amp;{template:proof}')) {
      throw new Error('synthetic Roll button template marker missing');
    }
    if (!files['fixture-A/source.html'].includes('type="action" name="act_mark"')) {
      throw new Error('synthetic action button marker missing');
    }
    if (!files['fixture-A/source.html'].includes("on('clicked:mark'")) {
      throw new Error('synthetic action worker event missing');
    }
    if (!files['fixture-A/source.css'].includes('#fff0f5')) {
      throw new Error('synthetic CSS marker missing');
    }
    if (JSON.parse(files['fixture-A/source.i18n']).name !== 'Name') {
      throw new Error('synthetic translation marker missing');
    }
    if (JSON.parse(files['fixture-A/source.i18n']).result !== 'Result') {
      throw new Error('synthetic Rolltemplate translation marker missing');
    }
    if (JSON.parse(files['fixture-A/source.i18n']).mark !== 'Mark') {
      throw new Error('synthetic action translation marker missing');
    }
    if (JSON.parse(files['fixture-A/manifest.json']).synthetic !== true) {
      throw new Error('synthetic manifest marker missing');
    }
    if (!files['fixture-B/source.html'].includes('sheet-2colrow')) {
      throw new Error('layout fixture row marker missing');
    }
    if (!files['fixture-B/source.html'].includes('<table')) {
      throw new Error('layout fixture table marker missing');
    }
    if (!files['fixture-B/source.html'].includes('textarea')) {
      throw new Error('layout fixture textarea marker missing');
    }
    if (JSON.parse(files['fixture-B/source.i18n']).ready !== 'Ready') {
      throw new Error('layout fixture translation marker missing');
    }
    console.log('VISUAL SYNTHETIC FIXTURE SELF-TEST PASS');
    return;
  }

  for (const [relative, content] of Object.entries(files)) {
    const destination = path.join(outDir, relative);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, `${content}\n`, 'utf8');
  }
  await writeFile(
    path.join(outDir, 'synthetic-meta.json'),
    `${JSON.stringify({ synthetic: true, fixtureIds: ['fixture-A', 'fixture-B'], files: Object.keys(files) }, null, 2)}\n`,
    'utf8',
  );
  console.log(`VISUAL SYNTHETIC FIXTURE GENERATED ${outDir}`);
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
