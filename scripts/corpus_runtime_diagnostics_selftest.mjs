#!/usr/bin/env node

import {
  summarizeResourceIssueCategories,
  summarizeRuntimeIssueCategories,
} from './lib/corpus_runtime_diagnostics.mjs';

const secretPath = 'C:/private/source/sheet.html';
const secretUrl = 'https://private.example.invalid/asset.png';
const runtime = summarizeRuntimeIssueCategories([
  `Failed to load resource: net::ERR_FAILED ${secretUrl}`,
  `TypeError: cannot read properties of undefined at ${secretPath}`,
], [
  `ReferenceError: privateValue is not defined at ${secretPath}`,
]);
const resources = summarizeResourceIssueCategories([
  {
    kind: 'http',
    status: 404,
    resourceType: 'image',
    host: 'private.example.invalid',
    examples: [secretUrl],
  },
], { classification: 'final-rendered-resource-failure' });

if (runtime.categories.join(',') !== 'reference-error,resource-load,type-error') {
  throw new Error('runtime categories do not match the fixed taxonomy');
}
if (runtime.applicationErrorCount !== 2 || runtime.resourceConsoleErrorCount !== 1) {
  throw new Error('runtime and resource-origin console errors were not separated');
}
if (resources.join(',') !== 'final-render-failure,http-client,type:image') {
  throw new Error('resource categories do not match the fixed taxonomy');
}
const serialized = JSON.stringify({ runtime, resources });
if (serialized.includes(secretPath) || serialized.includes(secretUrl) || serialized.includes('private.example.invalid')) {
  throw new Error('runtime diagnostics leaked source-identifying data');
}

console.log('corpus runtime diagnostics self-test PASS');

