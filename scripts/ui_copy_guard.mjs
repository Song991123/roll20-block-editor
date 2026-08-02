/**
 * Guard product-facing UI copy against mojibake regressions.
 *
 * Imported Roll20 sheets can contain arbitrary text, so this scanner is
 * intentionally limited to product UI source folders.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOTS = [
  'components',
  'lib/editor',
  'lib/widgets',
  'lib/stores',
  'lib/export/asset_replacements.ts',
  'lib/preview/shadowMount.ts',
];

const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs']);
const PRODUCT_COPY_BLOCKLIST = [
  { token: 'Roll20 proxy', reason: 'use Korean product copy for this label' },
  { token: 'Imgur page', reason: 'use Korean product copy for this label' },
  { token: 'placeholder risk', reason: 'use Korean product copy for this label' },
  { token: 'data URL', reason: 'use Korean product copy for this label' },
  { token: 'https/direct', reason: 'use Korean product copy for this label' },
  { token: 'placeholder target', reason: 'use Korean product copy for this label' },
  { token: 'local preview only target', reason: 'use Korean product copy for this label' },
];
const PRODUCT_LITERAL_BLOCKLIST = [
  { token: '워크스페이스', reason: 'hide internal editor architecture from users' },
  { token: '최종 payload', reason: 'say final files instead of payload' },
  { token: '런타임 제거', reason: 'say executable code cleanup in plain Korean' },
  { token: '인라인 이벤트 핸들러', reason: 'describe automatically executed browser code in plain Korean' },
];

verifyLiteralScanner();

const files = ROOTS.flatMap((root) => collectFiles(path.resolve(root)));
const findings = [];

for (const file of files) {
  const text = readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  text.split(/\r?\n/).forEach((line, index) => {
    const reasons = suspiciousReasons(line);
    if (reasons.length === 0) return;
    findings.push({
      file: path.relative(process.cwd(), file),
      line: index + 1,
      reasons,
      text: line.trim().slice(0, 180),
    });
  });
  findings.push(...findBlockedProductLiterals(file, text));
}

if (findings.length > 0) {
  console.error('UI COPY GUARD FAIL');
  for (const finding of findings.slice(0, 80)) {
    console.error(`${finding.file}:${finding.line} ${finding.reasons.join(', ')} :: ${finding.text}`);
  }
  if (findings.length > 80) console.error(`...and ${findings.length - 80} more`);
  process.exit(1);
}

console.log(`UI COPY GUARD PASS files=${files.length}`);

function collectFiles(entry, output = []) {
  if (!existsSync(entry)) return output;
  const stat = statSync(entry);
  if (stat.isFile()) {
    if (EXTENSIONS.has(path.extname(entry))) output.push(entry);
    return output;
  }
  for (const name of readdirSync(entry)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    collectFiles(path.join(entry, name), output);
  }
  return output;
}

function suspiciousReasons(line) {
  const reasons = [];
  if (line.includes('\uFFFD')) reasons.push('replacement-character');
  if (containsCjkIdeograph(line)) reasons.push('cjk-mojibake-looking-character');

  const mojibakeMarkers = ['쨌', '遺', '덈', '윭', '紐', '媛', '筌', '揶', '野', '獄'];
  const marker = mojibakeMarkers.find((candidate) => line.includes(candidate));
  if (marker) reasons.push(`common-mojibake-marker:${marker}`);

  const blocked = PRODUCT_COPY_BLOCKLIST.find((candidate) => line.includes(candidate.token));
  if (blocked) reasons.push(`blocked-product-copy:${blocked.reason}`);
  return reasons;
}

function findBlockedProductLiterals(file, text) {
  const extension = path.extname(file).toLowerCase();
  const scriptKind = extension === '.tsx' || extension === '.jsx'
    ? ts.ScriptKind.TSX
    : ts.ScriptKind.TS;
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, scriptKind);
  const results = [];

  const inspect = (node) => {
    const literalText = productLiteralText(node);
    if (literalText != null) {
      const blocked = PRODUCT_LITERAL_BLOCKLIST.filter((candidate) => literalText.includes(candidate.token));
      if (blocked.length > 0) {
        const position = source.getLineAndCharacterOfPosition(node.getStart(source));
        results.push({
          file: path.relative(process.cwd(), file),
          line: position.line + 1,
          reasons: blocked.map((candidate) => `blocked-product-literal:${candidate.reason}`),
          text: literalText.trim().replace(/\s+/g, ' ').slice(0, 180),
        });
      }
    }
    ts.forEachChild(node, inspect);
  };

  inspect(source);
  return results;
}

function productLiteralText(node) {
  if (ts.isStringLiteralLike(node) || ts.isJsxText(node)) return node.text;
  if (
    node.kind === ts.SyntaxKind.TemplateHead
    || node.kind === ts.SyntaxKind.TemplateMiddle
    || node.kind === ts.SyntaxKind.TemplateTail
  ) {
    return node.text;
  }
  return null;
}

function verifyLiteralScanner() {
  const source = [
    '// 워크스페이스 is allowed in an internal comment.',
    "const safe = '편집 화면을 준비하고 있어요';",
    "const first = '워크스페이스 연결 오류';",
    'const second = `최종 payload 저장`;',
    'const view = <span>인라인 이벤트 핸들러</span>;',
  ].join('\n');
  const result = findBlockedProductLiterals(path.resolve('components/__ui_copy_guard_self_test.tsx'), source);
  if (result.length !== 3) {
    console.error(`UI COPY GUARD SELF-TEST FAIL expected=3 actual=${result.length}`);
    process.exit(1);
  }
}

function containsCjkIdeograph(value) {
  for (const char of value) {
    const codePoint = char.codePointAt(0);
    if ((codePoint >= 0x3400 && codePoint <= 0x9fff) || (codePoint >= 0xf900 && codePoint <= 0xfaff)) {
      return true;
    }
  }
  return false;
}
