import { diagnoseRawWorkerSource } from '../workerDiagnostics';

function assert(cond: unknown, message: string): void {
  if (!cond) throw new Error(`Assertion failed: ${message}`);
}

function codes(source: string): string[] {
  return diagnoseRawWorkerSource(source).map((diagnostic) => diagnostic.code);
}

const cases: Array<{ name: string; source: string; expected: string }> = [
  {
    name: 'switch statement',
    source: 'switch (value) { case 1: setAttrs({ result: 1 }); break; }',
    expected: 'switch-case',
  },
  {
    name: 'try catch',
    source: 'try { setAttrs({ result: 1 }); } catch (error) { console.log(error); }',
    expected: 'error-handling',
  },
  {
    name: 'async statement',
    source: 'await Promise.resolve();',
    expected: 'async-flow',
  },
  {
    name: 'unsupported loop',
    source: 'while (ready) { setAttrs({ result: 1 }); }',
    expected: 'unsupported-loop',
  },
  {
    name: 'function declaration',
    source: 'function updateSheet() { setAttrs({ result: 1 }); }',
    expected: 'declaration',
  },
  {
    name: 'advanced worker API shape',
    source: 'setAttrs({ hp: 10 }, { silent: false });',
    expected: 'worker-api-shape',
  },
  {
    name: 'generic unsupported statement',
    source: 'throw new Error("stop");',
    expected: 'unsupported-statement',
  },
  {
    name: 'parseable source kept raw by choice',
    source: `on('change:hp', function() { setAttrs({ hp: 10 }); });`,
    expected: 'source-preserved',
  },
];

let passed = 0;
for (const testCase of cases) {
  const actual = codes(testCase.source);
  assert(actual.includes(testCase.expected), `${testCase.name}: expected ${testCase.expected}, got ${actual.join(', ')}`);
  passed += 1;
  console.log(`  ok    ${testCase.name}`);
}

assert(diagnoseRawWorkerSource('   ').length === 0, 'empty source has no diagnostic');
assert(
  codes(`on('change:hp', function() { /* switch (fake) {} */ setAttrs({ hp: 10 }); });`)[0] === 'source-preserved',
  'supported source is not misclassified by a keyword inside a comment',
);
assert(
  codes(`on('change:hp change:mp', function(eventInfo) { setAttrs({ source: eventInfo.sourceType }); });`)[0] === 'source-preserved',
  'structured multi-event source is no longer reported as unsupported',
);

console.log(`\n${passed + 3}/${cases.length + 3} passed`);
