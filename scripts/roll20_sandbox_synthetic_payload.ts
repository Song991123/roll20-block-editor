import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { upsertManagedCssRule } from '../lib/editor/designPosition';
import {
  getSectionComposition,
  SECTION_COMPOSITIONS,
  type SectionComposition,
} from '../lib/editor/sectionCompositions';
import { getSectionLayout } from '../lib/editor/sectionLayouts';
import { getSectionTheme } from '../lib/editor/sectionThemes';
import { prepareRoll20UploadFiles } from '../lib/export/payload';

const args = process.argv.slice(2);
const outIndex = args.indexOf('--out-dir');
const legacy = args.includes('--legacy');
const layout = args.includes('--layout');
const rolltemplate = args.includes('--rolltemplate');
const compositionIndex = args.indexOf('--section-composition');
const requestedCompositionId = compositionIndex >= 0 ? args[compositionIndex + 1] : null;
const sectionCompositionId = resolveCompositionId(requestedCompositionId);
const outDir = path.resolve(
  outIndex >= 0 && args[outIndex + 1]
    ? args[outIndex + 1]
    : '.tmp/roll20-sandbox-synthetic',
);

type SyntheticPayloadOptions = {
  legacy: boolean;
  layout: boolean;
  rolltemplate: boolean;
  sectionCompositionId: SectionComposition['id'] | null;
};

function buildSyntheticSource({
  layout,
  rolltemplate,
  sectionCompositionId: compositionId,
}: Omit<SyntheticPayloadOptions, 'legacy'>) {
  const templateName = rolltemplate ? 'proof' : 'default';
  const sheetHtml = compositionId ? buildCompositionHtml(compositionId, templateName) : layout ? [
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
    `      <button type="roll" name="roll_layout" value="&amp;{template:${templateName}} {{name=Layout proof}} {{result=[[1d20]]}}">Roll</button>`,
    '      <label data-i18n="worker">Worker</label>',
    '      <input type="text" name="attr_layout_clicked" value="0" readonly>',
    '      <button type="action" name="act_layout_mark">Mark</button>',
    '    </div>',
    '  </div>',
    '  <script type="text/worker">on(\'clicked:layout_mark\', function () { setAttrs({ layout_clicked: \'1\' }); });</script>',
    '</div>',
  ] : [
    '<div class="sheet-sandbox-proof" style="width:420px;min-height:180px;padding:16px">',
    '  <label data-i18n="name">Name</label>',
    '  <input type="text" name="attr_name" value="">',
    `  <button type="roll" name="roll_check" value="&amp;{template:${templateName}} {{name=Sandbox proof}} {{result=[[1d20]]}}">Roll</button>`,
    '  <script type="text/worker">on(\'clicked:roll_check\', function () { setAttrs({ clicked: \'1\' }); });</script>',
    '</div>',
  ];
  if (rolltemplate) {
    sheetHtml.push(
      '<rolltemplate class="sheet-rolltemplate-proof">',
      '  <div class="sheet-proof-card">',
      '    <div class="sheet-proof-title">{{name}}</div>',
      '    <div class="sheet-proof-row"><span data-i18n="result">Result</span><strong>{{result}}</strong></div>',
      '  </div>',
      '</rolltemplate>',
    );
  }

  const sheetCss = compositionId ? buildCompositionCss(compositionId) : layout ? [
    '.sheet-layout-proof { background: #fffafc; border: 2px solid #d96b91; box-sizing: border-box; color: #3b2730; }',
    '.sheet-layout-proof .sheet-2colrow { display: flex; gap: 16px; align-items: flex-start; }',
    '.sheet-layout-proof .sheet-col { flex: 1 1 0; min-width: 0; }',
    '.sheet-layout-proof label { display: block; font-weight: 700; margin-bottom: 6px; }',
    '.sheet-layout-proof textarea, .sheet-layout-proof select { display: block; margin-top: 8px; }',
    '.sheet-layout-proof table { width: 100%; margin-top: 14px; border-collapse: collapse; }',
    '.sheet-layout-proof th, .sheet-layout-proof td { border: 1px solid #e7b5c6; padding: 4px; }',
    '.sheet-layout-proof button[type="roll"] { display: block; margin-top: 12px; }',
    '.sheet-layout-proof button[type="action"] { margin-left: 8px; }',
  ] : [
    '.sheet-sandbox-proof { background: #fff0f5; border: 2px solid #d96b91; box-sizing: border-box; color: #3b2730; }',
    '.sheet-sandbox-proof label { display: block; font-weight: 700; }',
    '.sheet-sandbox-proof button[type="roll"] { display: block; margin-top: 12px; }',
  ];
  if (rolltemplate) {
    sheetCss.push(
      '.sheet-rolltemplate-proof .sheet-proof-card { width: 280px; overflow: hidden; border: 2px solid #d96b91; border-radius: 6px; background: #fffafc; color: #3b2730; }',
      '.sheet-rolltemplate-proof .sheet-proof-title { padding: 10px 12px; background: #d96b91; color: #ffffff; font-size: 17px; font-weight: 700; }',
      '.sheet-rolltemplate-proof .sheet-proof-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 12px; }',
      '.sheet-rolltemplate-proof .sheet-proof-row strong { color: #9f3158; font-size: 20px; }',
    );
  }

  const translation: Record<string, string> = compositionId ? {
    section_title: 'Generated section',
    name: 'Name',
    role: 'Role',
    worker: 'Worker',
    result: 'Result',
  } : layout ? {
    name: 'Name',
    role: 'Role',
    score: 'Score',
    state: 'State',
    ready: 'Ready',
    worker: 'Worker',
  } : { name: 'Name' };
  if (rolltemplate) Object.assign(translation, { result: 'Result' });

  return {
    html: sheetHtml.join('\n'),
    css: sheetCss.join('\n'),
    translation: JSON.stringify(translation),
    warnings: [],
  };
}

function createSyntheticPayload(options: SyntheticPayloadOptions) {
  return prepareRoll20UploadFiles(buildSyntheticSource(options), { legacy: options.legacy });
}

function contentOf(
  payload: ReturnType<typeof createSyntheticPayload>,
  name: 'sheet.html' | 'sheet.css' | 'translation.json',
) {
  const file = payload.files.find((candidate) => candidate.name === name);
  assert.ok(file, `${name} must be generated`);
  return file.content;
}

function runSelfTest() {
  const variants: SyntheticPayloadOptions[] = [
    { legacy: false, layout: false, rolltemplate: false, sectionCompositionId: null },
    { legacy: false, layout: true, rolltemplate: true, sectionCompositionId: null },
    { legacy: true, layout: true, rolltemplate: true, sectionCompositionId: null },
    { legacy: false, layout: true, rolltemplate: true, sectionCompositionId: 'mint-sidebar' },
    { legacy: true, layout: true, rolltemplate: true, sectionCompositionId: 'mint-sidebar' },
  ];

  for (const options of variants) {
    const payload = createSyntheticPayload(options);
    const html = contentOf(payload, 'sheet.html');
    const css = contentOf(payload, 'sheet.css');
    const translation = JSON.parse(contentOf(payload, 'translation.json')) as Record<string, string>;

    assert.equal(payload.files.length, 3);
    assert.equal(payload.removedInternalBlockIds, 0);
    assert.doesNotMatch(html, /data-r20-block-id/);

    if (options.sectionCompositionId) {
      assert.match(html, /sheet-r20-node-composition-root/);
      assert.match(html, /sheet-r20-node-composition-title/);
      assert.match(css, /\.sheet-r20-node-composition-root\.sheet-r20-node-composition-root/);
      assert.match(css, /background-color: #f2fbf7/);
      assert.match(css, /grid-template-columns: minmax\(0, 2fr\) minmax\(0, 1fr\)/);
      assert.match(css, /grid-column: 1 \/ -1/);
    }

    if (options.rolltemplate) {
      assert.match(html, /&amp;\{template:proof\}/);
      assert.match(html, /sheet-rolltemplate-proof/);
      assert.match(css, /\.sheet-rolltemplate-proof \.sheet-proof-card/);
      assert.equal(translation.result, 'Result');
    } else {
      assert.match(html, /&amp;\{template:default\}/);
      assert.doesNotMatch(html, /sheet-rolltemplate-proof/);
      assert.doesNotMatch(css, /sheet-rolltemplate-proof/);
      assert.equal(translation.result, undefined);
    }
  }

  console.log('roll20 sandbox synthetic payload self-test PASS');
}

async function main() {
  if (args.includes('--self-test')) {
    runSelfTest();
    return;
  }

  const payload = createSyntheticPayload({
    legacy,
    layout: layout || Boolean(sectionCompositionId),
    rolltemplate,
    sectionCompositionId,
  });

  await mkdir(outDir, { recursive: true });
  for (const file of payload.files) {
    await writeFile(path.join(outDir, file.name), file.content, 'utf8');
  }
  await writeFile(
    path.join(outDir, 'payload-meta.json'),
    `${JSON.stringify({
      synthetic: true,
      legacy,
      layout: layout || Boolean(sectionCompositionId),
      rolltemplate,
      sectionCompositionId,
      removedInternalBlockIds: payload.removedInternalBlockIds,
      legacyWarnings: payload.legacyWarnings,
      files: payload.files.map(({ name, content }) => ({ name, bytes: content.length })),
    }, null, 2)}\n`,
    'utf8',
  );

  console.log(JSON.stringify({
    outDir,
    legacy,
    layout: layout || Boolean(sectionCompositionId),
    rolltemplate,
    sectionCompositionId,
    files: payload.files.map(({ name, content }) => ({ name, bytes: content.length })),
    removedInternalBlockIds: payload.removedInternalBlockIds,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

function resolveCompositionId(value: string | null): SectionComposition['id'] | null {
  if (!value) return null;
  const match = SECTION_COMPOSITIONS.find((candidate) => candidate.id === value);
  if (!match) {
    throw new Error(`Unknown --section-composition value: ${value}`);
  }
  return match.id;
}

function buildCompositionHtml(
  compositionId: SectionComposition['id'],
  templateName: string,
): string[] {
  const label = getSectionComposition(compositionId).label;
  return [
    '<section class="sheet-layout-proof sheet-r20-node-composition-root" style="width:760px;min-height:320px">',
    `  <h2 class="sheet-r20-node-composition-title" data-i18n="section_title">${label}</h2>`,
    '  <div class="sheet-composition-panel sheet-composition-main">',
    '    <label data-i18n="name">Name</label>',
    '    <input type="text" name="attr_name" value="">',
    '    <textarea name="attr_notes" rows="3"></textarea>',
    '  </div>',
    '  <div class="sheet-composition-panel sheet-composition-side">',
    '    <label data-i18n="role">Role</label>',
    '    <select name="attr_role"><option value="one">One</option><option value="two">Two</option></select>',
    '  </div>',
    '  <div class="sheet-composition-panel sheet-composition-actions">',
    `    <button type="roll" name="roll_layout" value="&amp;{template:${templateName}} {{name=Generated section}} {{result=[[1d20]]}}">Roll</button>`,
    '    <button type="action" name="act_layout_mark">Mark</button>',
    '    <label data-i18n="worker">Worker</label>',
    '    <input type="text" name="attr_layout_clicked" value="0" readonly>',
    '  </div>',
    '  <script type="text/worker">on(\'clicked:layout_mark\', function () { setAttrs({ layout_clicked: \'1\' }); });</script>',
    '</section>',
  ];
}

function buildCompositionCss(compositionId: SectionComposition['id']): string[] {
  const compositionValue = getSectionComposition(compositionId);
  const theme = getSectionTheme(compositionValue.themeId);
  const layoutValue = getSectionLayout(compositionValue.layoutId);
  const rootDeclarations = definedDeclarations({
    ...theme.parts.root,
    ...layoutValue.parts.root,
    'box-sizing': 'border-box',
  });
  const titleDeclarations = definedDeclarations({
    ...theme.parts.title,
    ...layoutValue.parts.header,
  });
  let managedCss = upsertManagedCssRule(
    '',
    'sheet-r20-node-composition-root',
    rootDeclarations,
  );
  managedCss = upsertManagedCssRule(
    managedCss,
    'sheet-r20-node-composition-title',
    titleDeclarations,
  );
  return [
    managedCss,
    '.sheet-composition-panel { min-width: 0; padding: 10px; border: 1px solid #b8ddd0; border-radius: 3px; background: rgba(255, 255, 255, 0.72); }',
    '.sheet-composition-panel label { display: block; margin-bottom: 6px; font-weight: 700; }',
    '.sheet-composition-panel textarea, .sheet-composition-panel select { display: block; margin-top: 8px; }',
    '.sheet-composition-actions button, .sheet-composition-actions label, .sheet-composition-actions input { margin-right: 8px; }',
  ];
}

function definedDeclarations(
  declarations: Record<string, string | null>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(declarations).filter((entry): entry is [string, string] => entry[1] != null),
  );
}
