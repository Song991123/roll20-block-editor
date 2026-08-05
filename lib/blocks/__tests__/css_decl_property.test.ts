import { CSS_BLOCKS } from '../css';
import { newCssCtx, parseCss } from '../../import/css_parser';
import { preserveCssDeclarationProperty } from '../../utils/cssDeclarationProperty';

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

const accepted = [
  'color',
  '-webkit-user-select',
  '_width',
  '*zoom',
  '--accent',
  '\\31 0px',
  '색상',
];

for (const property of accepted) {
  assert(
    preserveCssDeclarationProperty(property) === property,
    `${property} is preserved verbatim`,
  );
}

for (const property of ['', '*', 'bad property', 'color:background', 'color; background', 'color\nbackground']) {
  assert(preserveCssDeclarationProperty(property) === null, `${JSON.stringify(property)} is rejected`);
}

const definition = CSS_BLOCKS.find((block) => block.type === 'r20_css_decl');
assert(definition, 'CSS declaration block exists');

for (const property of accepted.filter((value) => value !== '--accent')) {
  const emitted = definition?.generator({
    getFieldValue: (name: string) => (name === 'PROPERTY' ? property : 'value'),
  } as never, {} as never);
  assert(emitted === `${property}: value;`, `${property} generator output stays exact`);
}

const ctx = newCssCtx();
const parsed = parseCss('.fixture { *zoom: 1; _width: 10px; bad property: red; }', ctx);
const declarations = parsed[0]?.children?.DECLS ?? [];
assert(declarations[0]?.blockType === 'r20_css_decl', 'legacy star property stays structured');
assert(declarations[0]?.fields?.PROPERTY === '*zoom', 'legacy star property text stays exact');
assert(declarations[1]?.fields?.PROPERTY === '_width', 'legacy underscore property text stays exact');
assert(declarations[2]?.blockType === 'r20_raw_css', 'unsafe property falls back to raw CSS');
assert(declarations[2]?.fields?.CSS === 'bad property: red;', 'raw fallback keeps the declaration text');
assert(ctx.rawFallback === 1, 'raw fallback is reported');

console.log('CSS DECLARATION PROPERTY TEST PASS');
