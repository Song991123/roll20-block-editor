import { CSS_BLOCKS } from '../css';

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

const definition = CSS_BLOCKS.find((block) => block.type === 'r20_css_font_face');
assert(definition, '@font-face block exists');

const fields: Record<string, string> = {
  FAMILY: 'FixtureFont',
  SRC: "url('data:font/woff2;base64,AA;BB') format('woff2')",
  WEIGHT: '700',
  STYLE: 'normal',
  EXTRA_DESCRIPTORS: [
    'font-display: swap;',
    'unicode-range: U+0000-00FF;',
    'font-stretch: 75% 125%;',
    'font-weight: 800;',
  ].join('\n'),
};

const emitted = definition?.generator(
  { getFieldValue: (name: string) => fields[name] ?? '' } as never,
  {
    indent: (value: string) => value.split('\n').map((line) => `  ${line}`).join('\n'),
    statementToCode: () => '',
    valueToCode: () => '',
  } as never,
);

assert(typeof emitted === 'string', '@font-face emits stack source');
const css = String(emitted);
assert(css.includes("src: url('data:font/woff2;base64,AA;BB') format('woff2');"), 'src grammar stays intact');
assert(css.includes('font-display: swap;'), 'font-display emits');
assert(css.includes('unicode-range: U+0000-00FF;'), 'unicode-range emits');
assert(css.includes('font-stretch: 75% 125%;'), 'font-stretch emits');
assert(css.includes('font-weight: 800;'), 'duplicate descriptor override emits after structured field');

console.log('CSS FONT FACE TEST PASS');
