import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { prepareRoll20UploadFiles } from '../lib/export/payload';

const args = process.argv.slice(2);
const outIndex = args.indexOf('--out-dir');
const legacy = args.includes('--legacy');
const layout = args.includes('--layout');
const outDir = path.resolve(
  outIndex >= 0 && args[outIndex + 1]
    ? args[outIndex + 1]
    : '.tmp/roll20-sandbox-synthetic',
);

async function main() {
  const payload = prepareRoll20UploadFiles({
    html: (layout ? [
      '<div class="sheet-layout-proof" style="width:760px;min-height:320px;padding:16px">',
      '  <div class="sheet-2colrow">',
      '    <div class="sheet-col">',
      '      <label data-i18n="name">Name</label>',
      '      <input type="text" name="attr_name" value="">',
      '      <textarea name="attr_notes" rows="3"></textarea>',
      '    </div>',
      '    <div class="sheet-col">',
      '      <label data-i18n="role">Role</label>',
      '      <select name="attr_role"><option value="one">One</option><option value="two">Two</option></select>',
      '      <table class="sheet-layout-table">',
      '        <thead><tr><th data-i18n="score">Score</th><th data-i18n="state">State</th></tr></thead>',
      '        <tbody><tr><td><input type="number" name="attr_score" value="0"></td><td data-i18n="ready">Ready</td></tr></tbody>',
      '      </table>',
      '      <button type="roll" name="roll_layout" value="&amp;{template:default} {{name=Layout proof}} {{result=[[1d20]]}}">Roll</button>',
      '    </div>',
      '  </div>',
      '  <script type="text/worker">on(\'clicked:roll_layout\', function () { setAttrs({ layout_clicked: \'1\' }); });</script>',
      '</div>',
    ] : [
      '<div class="sheet-sandbox-proof" style="width:420px;min-height:180px;padding:16px">',
      '  <label data-i18n="name">Name</label>',
      '  <input type="text" name="attr_name" value="">',
      '  <button type="roll" name="roll_check" value="&amp;{template:default} {{name=Sandbox proof}} {{result=[[1d20]]}}">Roll</button>',
      '  <script type="text/worker">on(\'clicked:roll_check\', function () { setAttrs({ clicked: \'1\' }); });</script>',
      '</div>',
    ]).join('\n'),
    css: (layout ? [
      '.sheet-layout-proof { background: #fffafc; border: 2px solid #d96b91; box-sizing: border-box; color: #3b2730; }',
      '.sheet-layout-proof .sheet-2colrow { display: flex; gap: 16px; align-items: flex-start; }',
      '.sheet-layout-proof .sheet-col { flex: 1 1 0; min-width: 0; }',
      '.sheet-layout-proof label { display: block; font-weight: 700; margin-bottom: 6px; }',
      '.sheet-layout-proof textarea, .sheet-layout-proof select { display: block; margin-top: 8px; }',
      '.sheet-layout-proof table { width: 100%; margin-top: 14px; border-collapse: collapse; }',
      '.sheet-layout-proof th, .sheet-layout-proof td { border: 1px solid #e7b5c6; padding: 4px; }',
      '.sheet-layout-proof button[type="roll"] { display: block; margin-top: 12px; }',
    ] : [
      '.sheet-sandbox-proof { background: #fff0f5; border: 2px solid #d96b91; box-sizing: border-box; color: #3b2730; }',
      '.sheet-sandbox-proof label { display: block; font-weight: 700; }',
      '.sheet-sandbox-proof button[type="roll"] { display: block; margin-top: 12px; }',
    ]).join('\n'),
    translation: JSON.stringify(layout ? {
      name: 'Name',
      role: 'Role',
      score: 'Score',
      state: 'State',
      ready: 'Ready',
    } : { name: 'Name' }),
    warnings: [],
  }, { legacy });

  await mkdir(outDir, { recursive: true });
  for (const file of payload.files) {
    await writeFile(path.join(outDir, file.name), file.content, 'utf8');
  }
  await writeFile(
    path.join(outDir, 'payload-meta.json'),
    `${JSON.stringify({
      synthetic: true,
      legacy,
      layout,
      removedInternalBlockIds: payload.removedInternalBlockIds,
      legacyWarnings: payload.legacyWarnings,
      files: payload.files.map(({ name, content }) => ({ name, bytes: content.length })),
    }, null, 2)}\n`,
    'utf8',
  );

  console.log(JSON.stringify({
    outDir,
    legacy,
    layout,
    files: payload.files.map(({ name, content }) => ({ name, bytes: content.length })),
    removedInternalBlockIds: payload.removedInternalBlockIds,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
