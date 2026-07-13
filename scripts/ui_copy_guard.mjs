/**
 * Guard product-facing UI copy against mojibake regressions.
 *
 * Roll20 sheets may legitimately contain arbitrary user text, so this scanner is
 * intentionally limited to product UI source folders. It should not scan
 * fixtures, generated reports, Roll20 base CSS, or imported sheet corpora.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOTS = [
  'components',
  'lib/editor',
  'lib/widgets',
  'lib/stores',
  'lib/export/asset_replacements.ts',
  'lib/preview/shadowMount.ts',
];

const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs']);
const COMMON_MOJIBAKE_TOKENS = [
  '鍮',
  '嫄',
  '援',
  '濡',
  '瑜',
  '踰',
  '留',
  '硫',
  '媛',
  '寃',
  '諛',
  '釉',
  '?ㅼ',
  '?대',
  '?쒗',
  '?섑',
  '?덉',
  '?먯',
  '?닿',
  '?쑀',
  '?몄',
  '?붿',
  '?낅',
  '?띿',
  '?꾨',
  '?ㅽ',
];

const PRODUCT_COPY_BLOCKLIST = [
  { token: 'Roll20 proxy', reason: 'use Roll20 프록시 in product UI' },
  { token: 'Imgur page', reason: 'use Imgur 페이지 in product UI' },
  { token: 'placeholder risk', reason: 'use placeholder 위험 in product UI' },
  { token: 'data URL', reason: 'use 데이터 URL in product UI' },
  { token: 'https/direct', reason: 'use HTTPS/직링크 in product UI' },
  { token: 'placeholder target', reason: 'use placeholder 대상 in product UI' },
  { token: 'local preview only target', reason: 'use 로컬 미리보기 전용 대상 in product UI' },
];

const findings = [];

for (const file of ROOTS.flatMap((root) => collectFiles(path.resolve(root)))) {
  const text = readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    const reasons = suspiciousReasons(line);
    if (!reasons.length) return;
    findings.push({
      file: path.relative(process.cwd(), file),
      line: index + 1,
      reasons,
      text: line.trim().slice(0, 180),
    });
  });
}

if (findings.length) {
  console.error('UI COPY GUARD FAIL');
  for (const finding of findings.slice(0, 80)) {
    console.error(`${finding.file}:${finding.line} ${finding.reasons.join(', ')} :: ${finding.text}`);
  }
  if (findings.length > 80) console.error(`...and ${findings.length - 80} more`);
  process.exit(1);
}

console.log(`UI COPY GUARD PASS files=${ROOTS.flatMap((root) => collectFiles(path.resolve(root))).length}`);

function collectFiles(entry, out = []) {
  if (!existsSync(entry)) return out;
  const stat = statSync(entry);
  if (stat.isFile()) {
    if (EXTENSIONS.has(path.extname(entry))) out.push(entry);
    return out;
  }
  for (const name of readdirSync(entry)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    collectFiles(path.join(entry, name), out);
  }
  return out;
}

function suspiciousReasons(line) {
  const reasons = [];
  if (line.includes('\uFFFD')) reasons.push('replacement-character');
  if (containsCjkOrCompatibilityIdeograph(line)) reasons.push('cjk-mojibake-looking-character');
  const token = COMMON_MOJIBAKE_TOKENS.find((candidate) => line.includes(candidate));
  if (token) reasons.push(`common-mojibake-token:${token}`);
  const blocked = PRODUCT_COPY_BLOCKLIST.find((candidate) => line.includes(candidate.token));
  if (blocked) reasons.push(`blocked-product-copy:${blocked.reason}`);
  return reasons;
}

function containsCjkOrCompatibilityIdeograph(value) {
  for (const char of value) {
    const cp = char.codePointAt(0);
    if ((cp >= 0x3400 && cp <= 0x9fff) || (cp >= 0xf900 && cp <= 0xfaff)) return true;
  }
  return false;
}
