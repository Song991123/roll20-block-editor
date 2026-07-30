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
    '  <button type="roll" name="roll_check" value="&amp;{template:default} {{name=Sandbox proof}} {{result=[[1d20]]}}">Roll</button>',
    '  <script type="text/worker">on(\'clicked:roll_check\', function () { setAttrs({ clicked: \'1\' }); });</script>',
    '</div>',
  ].join('\n'),
  'fixture-A/source.css': [
    '.sheet-sandbox-proof { background: #fff0f5; border: 2px solid #d96b91; box-sizing: border-box; color: #3b2730; }',
    '.sheet-sandbox-proof label { display: block; font-weight: 700; }',
    '.sheet-sandbox-proof button[type="roll"] { display: block; margin-top: 12px; }',
  ].join('\n'),
  'fixture-A/source.i18n': JSON.stringify({ name: 'Name' }),
  'fixture-A/manifest.json': JSON.stringify({
    id: 'fixture-A',
    synthetic: true,
    legacyMode: 'modern',
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
    if (!files['fixture-A/source.css'].includes('#fff0f5')) {
      throw new Error('synthetic CSS marker missing');
    }
    if (JSON.parse(files['fixture-A/source.i18n']).name !== 'Name') {
      throw new Error('synthetic translation marker missing');
    }
    if (JSON.parse(files['fixture-A/manifest.json']).synthetic !== true) {
      throw new Error('synthetic manifest marker missing');
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
    `${JSON.stringify({ synthetic: true, fixtureIds: ['fixture-A'], files: Object.keys(files) }, null, 2)}\n`,
    'utf8',
  );
  console.log(`VISUAL SYNTHETIC FIXTURE GENERATED ${outDir}`);
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
