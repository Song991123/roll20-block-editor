#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const args = new Set(process.argv.slice(2));
const staged = args.has('--staged');

const rules = [
  {
    id: 'machine-path',
    test: (text) =>
      /(?:^|[\s"'`(<\[])(?:[A-Za-z]:[\\/]|\\\\[A-Za-z0-9._$-]+[\\/])/.test(text) ||
      /(?:^|[\s"'`(<\[])\/(?:Users|home)\/[A-Za-z0-9._-]+\//.test(text),
  },
  {
    id: 'campaign-identifier',
    test: (text) =>
      /\b(?:campaigns?\/(?:details|settings|savesettings|launch|editor)\/|campaign(?:_?id)?\s*[:=]\s*)[A-Za-z0-9_-]*\d[A-Za-z0-9_-]*/i.test(
        text,
      ),
  },
  {
    id: 'source-fixture-label',
    test: (text) => /\b[Ff]ixture(?:[-_ ]+[A-Z](?:\d+)?|[A-Z]\d*)\b/.test(text),
  },
];

const sensitiveEvidence =
  /\b(?:(?:anonymous|private|protected|real|copied|third[- ]party|external validation|source[- ](?:redacted|derived|specific)|user[- ]owned)\s+(?:roll20\s+)?(?:sheet|fixture|input|corpus|payload|capture|screenshot|observation|evidence|report)s?)\b/i;
const numericMeasurement =
  /(?:\b\d+(?:[.,]\d+)*(?:\s*\/\s*\d+(?:[.,]\d+)*)?\s*(?:%|ppm|px|ms|seconds?|minutes?|blocks?|nodes?|files?|fixtures?|cases?|rows?|screenshots?|captures?|members?|inputs?)\b|\b\d+\s*\/\s*\d+\b)/i;
const sourceUrl = /https?:\/\/\S+/i;

if (args.has('--self-test')) {
  runSelfTest();
} else {
  runGuard();
}

function runGuard() {
  const repoRoot = git(['rev-parse', '--show-toplevel']).trim();
  const files = git(['ls-files', '--cached', '-z'])
    .split('\0')
    .filter((file) => file.toLowerCase().endsWith('.md'));
  const violations = [];

  for (const file of files) {
    const content = readDocument(repoRoot, file);
    if (content === null) continue;
    violations.push(...inspectDocument(file, content));
  }

  if (violations.length > 0) {
    console.error(`TRACKED_DOCS_PRIVACY_FAIL count=${violations.length}`);
    for (const violation of violations) {
      console.error(`${violation.file}:${violation.line} ${violation.rule}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`TRACKED_DOCS_PRIVACY_OK files=${files.length} mode=${staged ? 'staged' : 'worktree'}`);
}

function inspectDocument(file, content) {
  const violations = [];
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    for (const rule of rules) {
      if (rule.test(line)) {
        violations.push({ file, line: index + 1, rule: rule.id });
      }
    }
  });

  for (const block of paragraphBlocks(lines)) {
    const isSyntheticOnly = /\bsynthetic\b/i.test(block.text) &&
      !/\b(?:private|protected|real|copied|third[- ]party|external validation|source[- ](?:redacted|derived|specific)|user[- ]owned)\b/i.test(
        block.text,
      );
    if (sensitiveEvidence.test(block.text) && numericMeasurement.test(block.text) && !isSyntheticOnly) {
      violations.push({ file, line: block.line, rule: 'source-derived-measurement' });
    }
    if (sensitiveEvidence.test(block.text) && sourceUrl.test(block.text)) {
      violations.push({ file, line: block.line, rule: 'source-url' });
    }
  }

  return dedupe(violations);
}

function paragraphBlocks(lines) {
  const blocks = [];
  let start = 0;
  let buffer = [];

  const flush = () => {
    if (buffer.length > 0) {
      blocks.push({ line: start + 1, text: buffer.join(' ') });
      buffer = [];
    }
  };

  lines.forEach((line, index) => {
    if (line.trim() === '') {
      flush();
      return;
    }
    if (buffer.length > 0 && /^(?:#{1,6}\s|[-*+]\s|\d+\.\s|\|)/.test(line.trim())) {
      flush();
    }
    if (buffer.length === 0) start = index;
    buffer.push(line.trim());
  });
  flush();
  return blocks;
}

function dedupe(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.file}:${item.line}:${item.rule}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function readDocument(repoRoot, file) {
  if (staged) {
    try {
      return git(['show', `:${file}`]);
    } catch {
      return null;
    }
  }
  const absolute = path.join(repoRoot, file);
  return existsSync(absolute) ? readFileSync(absolute, 'utf8') : null;
}

function git(commandArgs) {
  return execFileSync('git', commandArgs, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 16 * 1024 * 1024,
  });
}

function runSelfTest() {
  const allowed = [
    'Project page: https://example.test/product',
    'Synthetic fixture passed 6/6 cases.',
    'Never record source-derived measurements in tracked documents.',
    'Use --fixture <fixture-id> for a generated test.',
    '- Remove source-derived records.\n- Documentation shrank by 96.1%.',
  ];
  const blocked = [
    ['machine-path', 'Input lives at C:\\private\\sheet.html'],
    ['machine-path', 'Input lives at /Users/example/private/sheet.html'],
    ['campaign-identifier', 'POST campaigns/savesettings/123456'],
    ['source-fixture-label', 'Fixture A passed locally.'],
    ['source-derived-measurement', 'Anonymous fixture rendered at 852.8px.'],
    ['source-derived-measurement', 'External validation input passed 3/3 cases.'],
    ['source-url', 'Third-party sheet source: https://example.test/private-sheet'],
  ];

  for (const text of allowed) {
    const found = inspectDocument('allowed.md', text);
    if (found.length > 0) {
      throw new Error(`Allowed self-test text was blocked: ${text}`);
    }
  }

  for (const [rule, text] of blocked) {
    const found = inspectDocument('blocked.md', text);
    if (!found.some((item) => item.rule === rule)) {
      throw new Error(`Blocked self-test text missed ${rule}: ${text}`);
    }
  }

  console.log(`TRACKED_DOCS_PRIVACY_SELF_TEST_OK allowed=${allowed.length} blocked=${blocked.length}`);
}
