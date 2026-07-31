import {
  injectPreservedAttributes,
  removePreservedStyleDeclarations,
  serializePreservedAttributes,
} from '../preservedAttributes';

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

const raw = serializePreservedAttributes({
  id: 'frame',
  'data-layout': 'grid',
  'aria-label': 'Frame',
  onclick: 'alert(1)',
  srcdoc: '<script>alert(1)</script>',
});

assert(raw.includes('data-layout'), 'data attribute serialized');
assert(raw.includes('aria-label'), 'ARIA attribute serialized');
assert(raw.includes('id'), 'id serialized');
assert(!raw.includes('onclick'), 'event handler rejected');
assert(!raw.includes('srcdoc'), 'srcdoc rejected');

const injected = injectPreservedAttributes('<div class="sheet-frame"></div>', raw);
assert(injected.includes('id="frame"'), 'id emitted');
assert(injected.includes('data-layout="grid"'), 'data attribute emitted');
assert(injected.includes('aria-label="Frame"'), 'ARIA attribute emitted');
assert(!injected.includes('onclick'), 'event handler never emitted');
assert(injectPreservedAttributes('<div id="existing"></div>', raw).includes('id="existing"'), 'existing attr wins');

const styled = serializePreservedAttributes({
  style: 'position:absolute;left:8px;color:red;padding:4px',
  'data-hook': 'value',
});
const stripped = removePreservedStyleDeclarations(styled, ['position', 'left', 'padding']);
assert(stripped.includes('["data-hook","value"]'), 'unrelated preserved attribute survives');
assert(stripped.includes('["style","color:red"]'), 'unmanaged style declaration survives');
assert(!stripped.includes('position'), 'managed position removed from preserved style');
assert(!stripped.includes('padding'), 'managed presentation removed from preserved style');

console.log('preservedAttributes.test PASS');
