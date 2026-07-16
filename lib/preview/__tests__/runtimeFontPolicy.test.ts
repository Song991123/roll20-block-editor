import { strict as assert } from 'node:assert';
import { applyRoll20RuntimeFontUrlPolicy } from '../runtimeFontPolicy.ts';

const externalFont = `
@font-face {
  font-family: "Probe Font";
  src: url("https://fonts.example.test/probe.woff2") format("woff2");
}
.sheet-card { background-image: url("https://images.example.test/card.png"); }
`.trim();

const modern = applyRoll20RuntimeFontUrlPolicy(externalFont, 'modern');
assert.equal(modern, externalFont, 'modern preserves authored CSS byte-for-byte');

const legacy = applyRoll20RuntimeFontUrlPolicy(externalFont, 'legacy');
assert.match(
  legacy,
  /url\("https:\/\/imgsrv\.roll20\.net\/\?src=https%3A%2F%2Ffonts\.example\.test%2Fprobe\.woff2"\)/,
  'legacy proxies an external font URL',
);
assert.match(
  legacy,
  /background-image:\s*url\("https:\/\/images\.example\.test\/card\.png"\)/,
  'legacy font policy does not rewrite non-font asset URLs',
);

const managed = applyRoll20RuntimeFontUrlPolicy(`
@font-face { font-family: A; src: url("https://files.d20.io/fonts/a.woff2"); }
@font-face { font-family: B; src: url("https://imgsrv.roll20.net/?src=https%3A%2F%2Fexample.test%2Fb.woff2"); }
`, 'legacy');
assert.equal((managed.match(/imgsrv\.roll20\.net/g) ?? []).length, 1, 'existing proxy is not nested');
assert.match(managed, /https:\/\/files\.d20\.io\/fonts\/a\.woff2/, 'Roll20-managed font remains direct');

const lookalike = applyRoll20RuntimeFontUrlPolicy(
  '@font-face { font-family: C; src: url("https://files.d20.io.evil.test/c(test).woff2"); }',
  'legacy',
);
assert.match(lookalike, /imgsrv\.roll20\.net/, 'lookalike hostname does not bypass the allow-list');
assert.match(lookalike, /c%28test%29\.woff2/, 'quoted font URLs may contain parentheses');

console.log('Runtime font policy tests passed.');
