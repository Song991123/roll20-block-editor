#!/usr/bin/env node
/**
 * Generate copyright-safe Rolltemplate fixtures for local and actual parity
 * checks. Every result is deterministic so local and Roll20 screenshots can
 * be compared without treating a dice result as a renderer difference.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
const outIndex = args.indexOf('--out-dir');
const outDir = path.resolve(
  outIndex >= 0 && args[outIndex + 1]
    ? args[outIndex + 1]
    : '.tmp/rolltemplate-synthetic',
);
const selfTest = args.includes('--self-test');

const fixtures = {
  'card-block': {
    html: [
      '<div class="sheet-card-launcher" style="width:360px;padding:12px">',
      '  <button type="roll" name="roll_block" value="&amp;{template:blockproof} {{title=Block proof}} {{result=[[1]]}}">Roll</button>',
      '</div>',
      '<rolltemplate class="sheet-rolltemplate-blockproof">',
      '  <div class="sheet-block-card">',
      '    <div class="sheet-block-title">{{title}}</div>',
      '    <div class="sheet-block-row"><span data-i18n="result"></span><strong>{{result}}</strong></div>',
      '  </div>',
      '</rolltemplate>',
    ].join('\n'),
    css: [
      '.sheet-card-launcher { box-sizing: border-box; background: #fff7fa; border: 1px solid #e8a8bf; }',
      '.sheet-rolltemplate-blockproof .sheet-block-card { width: 276px; overflow: hidden; border: 2px solid #cf668d; border-radius: 4px; background: #fffafd; color: #432a34; }',
      '.sheet-rolltemplate-blockproof .sheet-block-title { padding: 8px 10px; background: #cf668d; color: #fff; font-weight: 700; }',
      '.sheet-rolltemplate-blockproof .sheet-block-row { display: flex; justify-content: space-between; align-items: center; padding: 9px 10px; }',
    ].join('\n'),
    i18n: JSON.stringify({ result: 'Result' }),
    expectedTemplate: 'blockproof',
    chatExpectations: {
      templateClassName: 'sheet-rolltemplate-blockproof',
      textIncludes: ['Block proof', 'Result', '1'],
      templatePaintClipped: false,
    },
  },
  'card-table': {
    html: [
      '<div class="sheet-card-launcher" style="width:360px;padding:12px">',
      '  <button type="roll" name="roll_table" value="&amp;{template:tableproof} {{name=Table proof}} {{result=[[2]]}} {{note=Stable}}">Roll</button>',
      '</div>',
      '<rolltemplate class="sheet-rolltemplate-tableproof">',
      '  <table class="sheet-table-card">',
      '    <caption>{{name}}</caption>',
      '    <tbody>',
      '      <tr><th data-i18n="result"></th><td>{{result}}</td></tr>',
      '      <tr><th data-i18n="note"></th><td>{{note}}</td></tr>',
      '    </tbody>',
      '  </table>',
      '</rolltemplate>',
    ].join('\n'),
    css: [
      '.sheet-card-launcher { box-sizing: border-box; background: #f8fbff; border: 1px solid #a9bfd8; }',
      '.sheet-rolltemplate-tableproof .sheet-table-card { width: 278px; border-collapse: collapse; border: 1px solid #55728f; background: #fff; color: #263746; }',
      '.sheet-rolltemplate-tableproof caption { padding: 7px 9px; background: #55728f; color: #fff; font-weight: 700; text-align: left; }',
      '.sheet-rolltemplate-tableproof th, .sheet-rolltemplate-tableproof td { border-top: 1px solid #c8d4df; padding: 6px 8px; text-align: left; }',
      '.sheet-rolltemplate-tableproof th { width: 72px; font-weight: 700; }',
    ].join('\n'),
    i18n: JSON.stringify({ result: 'Result', note: 'Note' }),
    expectedTemplate: 'tableproof',
    chatExpectations: {
      templateClassName: 'sheet-rolltemplate-tableproof',
      textIncludes: ['Table proof', 'Result', 'Note', 'Stable', '2'],
      templatePaintClipped: false,
      childStyles: [
        { className: 'sheet-table-card', styles: { borderCollapse: 'collapse' } },
      ],
    },
  },
  'card-conditional': {
    html: [
      '<div class="sheet-card-launcher" style="width:360px;padding:12px">',
      '  <button type="roll" name="roll_conditional" value="&amp;{template:conditionalproof} {{name=Conditional proof}} {{result=[[3]]}}">Roll</button>',
      '</div>',
      '<rolltemplate class="sheet-rolltemplate-conditionalproof">',
      '  <div class="sheet-conditional-card">',
      '    <strong class="sheet-conditional-title">{{name}}</strong>',
      '    <span class="sheet-conditional-result">{{result}}</span>',
      '    {{#rollGreater() result 1}}<span class="sheet-conditional-state" data-i18n="passed"></span>{{/rollGreater() result 1}}',
      '  </div>',
      '</rolltemplate>',
    ].join('\n'),
    css: [
      '.sheet-card-launcher { box-sizing: border-box; background: #f7fff9; border: 1px solid #9ac9aa; }',
      '.sheet-rolltemplate-conditionalproof .sheet-conditional-card { box-sizing: border-box; width: 276px; padding: 10px; border: 2px solid #5b9f72; background: #f8fff9; color: #274532; }',
      '@media (max-width: 1px) {',
      '  .sheet-rolltemplate-conditionalproof .sheet-conditional-card { background: #ff0000; }',
      '}',
      '@supports (display: grid) {',
      '  @layer synthetic-result-card {',
      '    .sheet-rolltemplate-conditionalproof .sheet-conditional-card { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: center; }',
      '    .sheet-rolltemplate-conditionalproof .sheet-conditional-state { grid-column: 1 / -1; padding-top: 6px; border-top: 1px solid #b9dbc4; }',
      '  }',
      '}',
    ].join('\n'),
    i18n: JSON.stringify({ passed: 'Passed' }),
    expectedTemplate: 'conditionalproof',
    chatExpectations: {
      templateClassName: 'sheet-rolltemplate-conditionalproof',
      textIncludes: ['Conditional proof', 'Passed', '3'],
      templatePaintClipped: false,
      childStyles: [
        {
          className: 'sheet-conditional-card',
          styles: {
            display: 'grid',
            boxSizing: 'border-box',
            backgroundColor: 'rgb(248, 255, 249)',
          },
        },
        {
          className: 'sheet-conditional-state',
          styles: {
            borderTopWidth: '1px',
            borderTopStyle: 'solid',
            borderTopColor: 'rgb(185, 219, 196)',
          },
        },
      ],
    },
  },
  'card-default': {
    html: [
      '<div class="sheet-card-launcher" style="width:360px;padding:12px">',
      '  <button type="roll" name="roll_default" value="&amp;{template:default} {{name=Default proof}} {{result=[[4]]}} {{note=Stable}}">Roll</button>',
      '</div>',
    ].join('\n'),
    css: '.sheet-card-launcher { box-sizing: border-box; background: #fffaf2; border: 1px solid #d5b67d; }',
    i18n: '{}',
    expectedTemplate: 'default',
    chatExpectations: {
      templateClassName: 'sheet-rolltemplate-default',
      textIncludes: ['Default proof', 'Result', 'Note', 'Stable', '4'],
      templatePaintClipped: false,
    },
  },
};

function filesForFixture(id, fixture) {
  return {
    [`${id}/source.html`]: fixture.html,
    [`${id}/source.css`]: fixture.css,
    [`${id}/source.i18n`]: fixture.i18n,
    [`${id}/manifest.json`]: JSON.stringify({
      id,
      synthetic: true,
      legacyMode: false,
      purpose: 'anonymous result-card renderer regression',
      expectedTemplate: fixture.expectedTemplate,
      chatExpectations: fixture.chatExpectations,
    }),
  };
}

const files = Object.assign(
  {},
  ...Object.entries(fixtures).map(([id, fixture]) => filesForFixture(id, fixture)),
);

async function main() {
  if (selfTest) {
    assertFixtureMatrix();
    console.log('ROLLTEMPLATE SYNTHETIC MATRIX SELF-TEST PASS');
    return;
  }

  for (const [relative, content] of Object.entries(files)) {
    const destination = path.join(outDir, relative);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, `${content}\n`, 'utf8');
  }
  await writeFile(
    path.join(outDir, 'synthetic-meta.json'),
    `${JSON.stringify({ synthetic: true, fixtureIds: Object.keys(fixtures), files: Object.keys(files) }, null, 2)}\n`,
    'utf8',
  );
  console.log(`ROLLTEMPLATE SYNTHETIC MATRIX GENERATED ${outDir}`);
}

function assertFixtureMatrix() {
  const ids = Object.keys(fixtures);
  if (ids.length !== 4) throw new Error(`expected four result-card fixtures, got ${ids.length}`);

  for (const [id, fixture] of Object.entries(fixtures)) {
    const rollButtons = fixture.html.match(/<button\b[^>]*type="roll"/g) ?? [];
    if (rollButtons.length !== 1) throw new Error(`${id} must contain exactly one Roll button`);
    if (!fixture.html.includes(`&amp;{template:${fixture.expectedTemplate}}`)) {
      throw new Error(`${id} Roll button does not invoke its expected template`);
    }
    if (/\[\[\s*\d+d\d+/i.test(fixture.html)) {
      throw new Error(`${id} must use deterministic numeric inline results`);
    }
    if (/https?:\/\//i.test(`${fixture.html}\n${fixture.css}`)) {
      throw new Error(`${id} must not contain external assets or source URLs`);
    }
    const parsedI18n = JSON.parse(fixture.i18n);
    if (!parsedI18n || typeof parsedI18n !== 'object' || Array.isArray(parsedI18n)) {
      throw new Error(`${id} translation must be a JSON object`);
    }
    const manifest = JSON.parse(files[`${id}/manifest.json`]);
    if (manifest.synthetic !== true || manifest.legacyMode !== false) {
      throw new Error(`${id} manifest must stay anonymous, synthetic, and modern by default`);
    }
    if (!manifest.chatExpectations?.templateClassName || !manifest.chatExpectations?.textIncludes?.length) {
      throw new Error(`${id} manifest must define result-card browser expectations`);
    }
  }

  if (!fixtures['card-table'].html.includes('<table')) {
    throw new Error('table result-card structure is missing');
  }
  if (!fixtures['card-conditional'].html.includes('{{#rollGreater() result 1}}')) {
    throw new Error('conditional Rolltemplate helper is missing');
  }
  if (!fixtures['card-conditional'].css.includes('@media (max-width: 1px)')) {
    throw new Error('false media-condition regression is missing');
  }
  if (!fixtures['card-conditional'].css.includes('@supports (display: grid)')) {
    throw new Error('nested supports regression is missing');
  }
  const conditionalBorderExpectation = fixtures['card-conditional'].chatExpectations.childStyles
    ?.find((item) => item.className === 'sheet-conditional-state');
  if (conditionalBorderExpectation?.styles?.borderTopWidth !== '1px') {
    throw new Error('conditional layered-border cascade regression is missing');
  }
  if (fixtures['card-default'].html.includes('<rolltemplate')) {
    throw new Error('default card must exercise the Roll20 built-in fallback');
  }
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
