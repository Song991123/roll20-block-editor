import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..', '..', '..');
const readmeSource = readFileSync(path.join(repoRoot, 'lib', 'export', 'readme.ts'), 'utf8');
const zipBuilderSource = readFileSync(path.join(repoRoot, 'lib', 'export', 'zip_builder.ts'), 'utf8');

function testReadmeSourceExplainsExternalAssets(): void {
  assert.match(readmeSource, /외부 이미지\/폰트 확인/);
  assert.match(readmeSource, /실제 파일은 zip 안에 포함되지 않습니다/);
  assert.match(readmeSource, /http\(s\) 이미지\/폰트 URL/);
  assert.match(readmeSource, /data: URL, 로컬 경로, 임시 파일 경로/);
  assert.match(readmeSource, /placeholder 이미지/);
}

function testZipWiresAssetReplacementNotice(): void {
  assert.match(readmeSource, /includesAssetReplacements/);
  assert.match(readmeSource, /asset-replacements\.json/);
  assert.match(readmeSource, /Sandbox 또는 새 테스트 방/);
  assert.match(zipBuilderSource, /includesAssetReplacements:\s*Boolean\(payload\.extraFiles\?\.\['asset-replacements\.json'\]\)/);
}

function testZipExplainsUnsupportedScriptBackup(): void {
  assert.match(readmeSource, /includesUnsupportedScripts/);
  assert.match(readmeSource, /ZIP_FILES\.UNSUPPORTED_SCRIPTS/);
  assert.match(readmeSource, /Roll20에 올리지 마세요/);
  assert.match(
    zipBuilderSource,
    /includesUnsupportedScripts:\s*Boolean\(payload\.extraFiles\?\.\[ZIP_FILES\.UNSUPPORTED_SCRIPTS\]\)/,
  );
}

testReadmeSourceExplainsExternalAssets();
testZipWiresAssetReplacementNotice();
testZipExplainsUnsupportedScriptBackup();
console.log('readme.test PASS');
