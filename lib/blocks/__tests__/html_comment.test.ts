import assert from 'node:assert/strict';
import { ADVANCED_BLOCKS } from '../advanced';

const definition = ADVANCED_BLOCKS.find((block) => block.type === 'r20_html_comment');
assert(definition?.generator, 'HTML comment generator is registered');

const emit = (text: string): string => String(definition.generator!(
  { getFieldValue: () => text } as never,
  {} as never,
));

assert.equal(
  emit('  first\n second  '),
  '<!--  first\n second  -->',
  'authored comment boundary and multiline whitespace remain exact',
);
assert.equal(
  emit('first\r\nsecond'),
  '<!--first\nsecond-->',
  'comment line endings use one stable representation',
);
assert.equal(
  emit('unsafe-->tail'),
  '<!--unsafe--&gt;tail-->',
  'an edited comment cannot close its own wrapper',
);
assert.equal(
  emit('trailing-'),
  '<!--trailing- -->',
  'a trailing hyphen remains a stable valid comment',
);

console.log('html comment generator test PASS');
