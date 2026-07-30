import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { prepareRoll20UploadFiles } from '../lib/export/payload';

const args = process.argv.slice(2);
const outIndex = args.indexOf('--out-dir');
const legacy = args.includes('--legacy');
const outDir = path.resolve(
  outIndex >= 0 && args[outIndex + 1]
    ? args[outIndex + 1]
    : '.tmp/roll20-sandbox-synthetic',
);

async function main() {
  const payload = prepareRoll20UploadFiles({
    html: [
      '<div class="sheet-sandbox-proof" style="width:420px;min-height:180px;padding:16px">',
      '  <label data-i18n="name">Name</label>',
      '  <input type="text" name="attr_name" value="">',
      '  <button type="roll" name="roll_check" value="&amp;{template:default} {{name=Sandbox proof}} {{result=[[1d20]]}}">Roll</button>',
      '  <script type="text/worker">on(\'clicked:roll_check\', function () { setAttrs({ clicked: \'1\' }); });</script>',
      '</div>',
    ].join('\n'),
    css: [
      '.sheet-sandbox-proof { background: #fff0f5; border: 2px solid #d96b91; box-sizing: border-box; color: #3b2730; }',
      '.sheet-sandbox-proof label { display: block; font-weight: 700; }',
      '.sheet-sandbox-proof button[type="roll"] { display: block; margin-top: 12px; }',
    ].join('\n'),
    translation: JSON.stringify({ name: 'Name' }),
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
      removedInternalBlockIds: payload.removedInternalBlockIds,
      legacyWarnings: payload.legacyWarnings,
      files: payload.files.map(({ name, content }) => ({ name, bytes: content.length })),
    }, null, 2)}\n`,
    'utf8',
  );

  console.log(JSON.stringify({
    outDir,
    legacy,
    files: payload.files.map(({ name, content }) => ({ name, bytes: content.length })),
    removedInternalBlockIds: payload.removedInternalBlockIds,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
