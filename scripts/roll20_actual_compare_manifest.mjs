#!/usr/bin/env node
/**
 * Create a local-only Roll20 actual-screen verification report scaffold.
 *
 * This writes only metadata/checklist placeholders. Do not put real sheet
 * source, screenshots, room names, campaign IDs, character names, or asset URLs
 * into committed files. The output path is ignored by Git.
 *
 * Usage:
 *   node scripts/roll20_actual_compare_manifest.mjs [run-label]
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const label = slug(process.argv[2] || new Date().toISOString().slice(0, 19));
const outDir = path.resolve('reports/roll20-actual-compare', label);

function slug(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'roll20-check';
}

const manifest = {
  createdAt: new Date().toISOString(),
  label,
  privacy: 'local-only ignored report; do not commit generated evidence',
  tracks: {
    localBaseline: {
      status: 'TODO',
      requiredArtifacts: [
        'local-preview screenshot',
        'local-edit screenshot',
        'export zip or exported html/css/translation payload',
      ],
    },
    roomViewCheck: {
      status: 'TODO',
      safety: 'existing solo rooms are observation-only',
      requiredArtifacts: [
        'default sheet state observation',
        'wrapper/dialog sizing notes',
        'rolltemplate/chat behavior notes when visible',
      ],
    },
    customSheetUploadCheck: {
      status: 'TODO',
      safety: 'use Custom Sheet Sandbox first; use a new test room only if sandbox is insufficient',
      requiredArtifacts: [
        'sandbox/test-room initial sheet screenshot',
        'basic input/default state notes',
        'roll button/chat smoke notes',
      ],
    },
  },
  differenceCategories: [
    'wrapper/context',
    'Roll20 base CSS',
    'user CSS cascade',
    'default attr/state',
    'translation/i18n',
    'worker JS',
    'rolltemplate/chat',
    'asset loading',
    'viewport/crop/sheet size',
    'edit overlay',
    'optimistic drag/commit latency',
  ],
};

const markdown = `# Roll20 Actual-Screen Verification

Run label: \`${label}\`

Generated: ${manifest.createdAt}

This report folder is local-only and ignored by Git. Do not commit real room screenshots, sheet source, generated fixture HTML, asset URLs, room names, character names, or campaign IDs.

## Checklist

| Track | Status | Notes |
| --- | --- | --- |
| Local preview vs edit baseline | TODO | Capture local preview/edit screenshots and export payload locally. |
| Existing solo room observation | TODO | Observe only; do not edit existing rooms. |
| Custom Sheet Sandbox upload check | TODO | Prefer sandbox; use a new test room only if sandbox is insufficient. |
| Difference classification | TODO | Classify each visible difference by category. |

## Difference Categories

${manifest.differenceCategories.map((item) => `- ${item}`).join('\n')}

## Result Summary

- Visual parity: TODO
- Preview/edit sync: TODO
- Roll20 sandbox/test-room parity: TODO
- Rolltemplate/chat smoke: TODO
- Asset loading: TODO
`;

await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
await writeFile(path.join(outDir, 'README.md'), markdown, 'utf8');

console.log(JSON.stringify({ outDir, files: ['manifest.json', 'README.md'] }, null, 2));
