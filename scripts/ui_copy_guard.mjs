/**
 * Guard product-facing UI copy against mojibake regressions.
 *
 * Imported Roll20 sheets can contain arbitrary text, so this scanner is
 * intentionally limited to product UI source folders.
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
const PRODUCT_COPY_BLOCKLIST = [
  { token: 'Roll20 proxy', reason: 'use Korean product copy for this label' },
  { token: 'Imgur page', reason: 'use Korean product copy for this label' },
  { token: 'placeholder risk', reason: 'use Korean product copy for this label' },
  { token: 'data URL', reason: 'use Korean product copy for this label' },
  { token: 'https/direct', reason: 'use Korean product copy for this label' },
  { token: 'placeholder target', reason: 'use Korean product copy for this label' },
  { token: 'local preview only target', reason: 'use Korean product copy for this label' },
];

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

function containsCjkIdeograph(value) {
  for (const char of value) {
    const codePoint = char.codePointAt(0);
    if ((codePoint >= 0x3400 && codePoint <= 0x9fff) || (codePoint >= 0xf900 && codePoint <= 0xfaff)) {
      return true;
    }
  }
  return false;
}
