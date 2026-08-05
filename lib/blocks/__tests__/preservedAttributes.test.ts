import {
  hasImportedAttributeSnapshot,
  injectPreservedAttributes,
  PRESERVED_ATTRIBUTE_TARGET,
  readPreservedAttribute,
  removePreservedStyleDeclarations,
  serializePreservedAttributes,
} from '../preservedAttributes';
import { INPUT_BLOCKS } from '../input';

assert(
  readPreservedAttribute('[["name","plain-name"]]', 'name') === 'plain-name',
  'preserved authored name can be read by input generators',
);
assert(hasImportedAttributeSnapshot('[]'), 'empty imported attribute snapshot stays distinguishable');
assert(!hasImportedAttributeSnapshot(''), 'new blocks have no imported attribute snapshot');

const textInput = INPUT_BLOCKS.find((definition) => definition.type === 'r20_text_input');
assert(textInput, 'text input block definition exists');
function emitInput(type: string, fields: Record<string, string>): string {
  const definition = INPUT_BLOCKS.find((candidate) => candidate.type === type);
  assert(definition, `${type} block definition exists`);
  const generated = definition?.generator({
    getFieldValue: (name: string) => fields[name] ?? '',
  } as never, {} as never);
  if (typeof generated !== 'string') throw new Error(`${type} generator returned a reporter tuple`);
  return generated;
}
const emitTextInput = (fields: Record<string, string>) => emitInput('r20_text_input', fields);
assert(
  emitTextInput({ NAME: 'plain-name', __R20_PRESERVED_ATTRS: '[["name","plain-name"]]' })
    .includes('name="plain-name"'),
  'unchanged imported plain name remains exact',
);
assert(
  !emitTextInput({ NAME: 'plain', __R20_PRESERVED_ATTRS: '[["name","attr_plain"]]' })
    .includes('type="text"'),
  'imported text input keeps an omitted default type omitted',
);
assert(
  emitTextInput({ NAME: 'plain', __R20_PRESERVED_ATTRS: '' }).includes('type="text"'),
  'new text input still emits its explicit design default type',
);
assert(
  !emitInput('r20_number_input', {
    NAME: 'score', DEFAULT: '', __R20_PRESERVED_ATTRS: '[["name","attr_score"],["type","number"]]',
  }).includes(' value='),
  'imported number input does not invent a zero value',
);
assert(
  !emitInput('r20_hidden_input', {
    NAME: 'state', DEFAULT: '', __R20_PRESERVED_ATTRS: '[["name","attr_state"],["type","hidden"]]',
  }).includes(' value='),
  'imported hidden input does not invent a zero value',
);
assert(
  !emitInput('r20_textarea', {
    NAME: 'notes', ROWS: '2', __R20_PRESERVED_ATTRS: '[["name","attr_notes"]]',
  }).includes(' rows='),
  'imported textarea keeps an omitted rows attribute omitted',
);
assert(
  emitInput('r20_textarea', { NAME: 'notes', ROWS: '3', __R20_PRESERVED_ATTRS: '' })
    .includes(' rows="3"'),
  'new textarea still emits its explicit design default rows',
);
assert(
  emitTextInput({ NAME: 'hp', __R20_PRESERVED_ATTRS: '[["name","attr_hp"]]' })
    .includes('name="attr_hp"'),
  'unchanged imported Roll20 name remains exact',
);
assert(
  emitTextInput({ NAME: 'renamed', __R20_PRESERVED_ATTRS: '[["name","plain-name"]]' })
    .includes('name="attr_renamed"'),
  'edited imported name uses Roll20 attr prefix',
);

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

const preservedClassSpacing = serializePreservedAttributes({ class: 'sheet-wide  sheet-col' });
assert(
  injectPreservedAttributes('<div class="sheet-col sheet-wide"></div>', preservedClassSpacing)
    .includes('class="sheet-wide  sheet-col"'),
  'semantically unchanged class restores authored order and spacing',
);
assert(
  injectPreservedAttributes('<div class="sheet-col sheet-edited"></div>', preservedClassSpacing)
    .includes('class="sheet-col sheet-edited"'),
  'edited class wins over the stale preserved snapshot',
);

assert(
  injectPreservedAttributes(
    '<input type="text">',
    serializePreservedAttributes({ type: 'TEXT' }),
  ).includes('type="TEXT"'),
  'semantically unchanged input type restores authored casing',
);
assert(
  injectPreservedAttributes(
    '<input type="text">',
    serializePreservedAttributes({ type: '' }),
  ).includes('type=""'),
  'explicit empty input type retains its authored browser-default form',
);
assert(
  injectPreservedAttributes(
    '<input type="number">',
    serializePreservedAttributes({ type: 'TEXT' }),
  ).includes('type="number"'),
  'edited input type wins over the stale preserved snapshot',
);

const targeted = injectPreservedAttributes(
  `<label><input ${PRESERVED_ATTRIBUTE_TARGET} type="radio" name="attr_mode"></label>`,
  serializePreservedAttributes({ type: 'radio', name: 'attr_mode', value: 'beta', 'data-hook': 'mode' }),
);
assert(!targeted.startsWith('<label name='), 'wrapper does not receive source input attributes');
const targetedInput = targeted.match(/<input\b[^>]*>/)?.[0] ?? '';
assert(targetedInput.includes('type="radio"'), 'nested source element keeps generated type');
assert(targetedInput.includes('name="attr_mode"'), 'nested source element keeps generated name');
assert(targetedInput.includes('value="beta"'), 'nested source element receives preserved value');
assert(targetedInput.includes('data-hook="mode"'), 'nested source element receives preserved data attribute');
assert(!targeted.includes(PRESERVED_ATTRIBUTE_TARGET), 'preserved target marker is removed');
assert(
  !injectPreservedAttributes(`<label><input ${PRESERVED_ATTRIBUTE_TARGET} type="radio"></label>`, '').includes(PRESERVED_ATTRIBUTE_TARGET),
  'empty preserved state still removes target marker',
);

const checkedRadio = serializePreservedAttributes({
  type: 'radio',
  name: 'attr_mode',
  value: 'a',
  checked: '',
});
assert(
  injectPreservedAttributes(
    `<label><input ${PRESERVED_ATTRIBUTE_TARGET} type="radio" name="attr_mode" value="a" checked="checked"></label>`,
    checkedRadio,
  ).includes(' value="a" checked>'),
  'unchanged radio restores authored boolean checked form',
);
assert(
  !injectPreservedAttributes(
    `<label><input ${PRESERVED_ATTRIBUTE_TARGET} type="radio" name="attr_mode" value="a"></label>`,
    checkedRadio,
  ).includes(' checked'),
  'editing an imported radio to unchecked wins over the old snapshot',
);

const checkedCheckbox = serializePreservedAttributes({ type: 'checkbox', checked: 'checked' });
assert(
  injectPreservedAttributes('<input type="checkbox" checked>', checkedCheckbox)
    .includes('checked="checked"'),
  'unchanged checkbox restores authored checked value',
);
assert(
  !injectPreservedAttributes('<input type="checkbox">', checkedCheckbox).includes(' checked'),
  'editing an imported checkbox to unchecked wins over the old snapshot',
);

const styled = serializePreservedAttributes({
  style: 'position:absolute;left:8px;color:red;padding:4px',
  'data-hook': 'value',
});
const stripped = removePreservedStyleDeclarations(styled, ['position', 'left', 'padding']);
assert(stripped.includes('["data-hook","value"]'), 'unrelated preserved attribute survives');
assert(stripped.includes('["style","color:red"]'), 'unmanaged style declaration survives');
assert(!stripped.includes('position'), 'managed position removed from preserved style');
assert(!stripped.includes('padding'), 'managed presentation removed from preserved style');

const untouchedStyle = '[["style","padding: 4px"],["data-hook","keep-format"]]';
assert(
  removePreservedStyleDeclarations(untouchedStyle, ['position', 'left', 'top']) === untouchedStyle,
  'unrelated preserved style remains byte-for-byte unchanged',
);

console.log('preservedAttributes.test PASS');
