import { normalizeEmittedRoll20Pair } from '../emit';

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function testRawFallbackPair(): void {
  const result = normalizeEmittedRoll20Pair(
    '<div class="maindiv"><label class="name">Name</label></div>',
    '.charsheet .maindiv .name { color: red; }',
  );

  assert(result.html.includes('class="sheet-maindiv"'), 'raw HTML class is prefixed');
  assert(result.html.includes('sheet-name'), 'nested raw HTML class is prefixed');
  assert(result.css.includes('.charsheet .sheet-maindiv .sheet-name'), 'raw CSS matches HTML');
}

function testAlreadyCanonicalPair(): void {
  const result = normalizeEmittedRoll20Pair(
    '<div class="sheet-row sheet-maindiv"></div>',
    '.charsheet .sheet-row .sheet-maindiv { display: block; }',
  );

  assert(
    result.html === '<div class="sheet-row sheet-maindiv"></div>',
    'canonical HTML is not double-prefixed',
  );
  assert(
    result.css === '.charsheet .sheet-row .sheet-maindiv { display: block; }',
    'canonical CSS is not double-prefixed',
  );
}

function testInlineStylePair(): void {
  const result = normalizeEmittedRoll20Pair(
    '<style>.panel .title { color: blue; }</style><div class="panel"><span class="title">T</span></div>',
    '.panel .title { color: blue; }',
  );

  assert(result.html.includes('.sheet-panel .sheet-title'), 'inline style selectors are prefixed');
  assert(result.html.includes('class="sheet-panel"'), 'inline style HTML is prefixed');
  assert(result.css.includes('.sheet-panel .sheet-title'), 'external CSS is prefixed');
}

testRawFallbackPair();
testAlreadyCanonicalPair();
testInlineStylePair();
console.log('Emit Roll20 class-pair tests passed.');
