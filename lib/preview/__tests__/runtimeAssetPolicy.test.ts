import { strict as assert } from 'node:assert';
import {
  applyRoll20RuntimeCssAssetPolicy,
  applyRoll20RuntimeHtmlAssetPolicy,
} from '../runtimeAssetPolicy.ts';

const authoredHtml = [
  '<img class="remote" src="https://images.example.test/card(one).png">',
  '<img class="relative" src="./card.png">',
  '<img class="inline" src="data:image/png;base64,AAAA">',
  '<img class="bare" src=https://images.example.test/bare.png>',
  '<img class="query" src="https://images.example.test/query.png?a=1&amp;b=2">',
  '<div style="background-image: url(\'https://images.example.test/inline.png\')"></div>',
  '<a href="https://images.example.test/page">link</a>',
].join('');

const legacyHtml = applyRoll20RuntimeHtmlAssetPolicy(authoredHtml, 'legacy');
assert.match(legacyHtml, /src="https:\/\/images\.example\.test\/card\(one\)\.png"/, 'legacy preserves authored HTML image URLs');
assert.match(
  legacyHtml,
  /style="background-image: url\(\'https:\/\/imgsrv\.roll20\.net\/\?src=https%3A%2F%2Fimages\.example\.test%2Finline\.png\'\)"/,
  'legacy proxies external URLs in inline style declarations',
);

const modernHtml = applyRoll20RuntimeHtmlAssetPolicy(authoredHtml, 'modern');
assert.match(
  modernHtml,
  /src="https:\/\/imgsrv\.roll20\.net\/\?src=https%3A%2F%2Fimages\.example\.test%2Fcard%28one%29\.png"/,
  'modern proxies an external image URL',
);
assert.match(modernHtml, /src="\.\/card\.png"/, 'modern preserves relative image URLs');
assert.match(modernHtml, /src="data:image\/png;base64,AAAA"/, 'modern preserves data image URLs');
assert.match(
  modernHtml,
  /src="https:\/\/imgsrv\.roll20\.net\/\?src=https%3A%2F%2Fimages\.example\.test%2Fbare\.png"/,
  'modern proxies an unquoted external image URL',
);
assert.match(
  modernHtml,
  /src="https:\/\/imgsrv\.roll20\.net\/\?src=https%3A%2F%2Fimages\.example\.test%2Fquery\.png%3Fa%3D1%26b%3D2"/,
  'modern decodes HTML ampersand entities before proxying image URLs',
);
assert.match(modernHtml, /style="background-image: url\('https:\/\/images\.example\.test\/inline\.png'\)"/, 'modern preserves inline CSS URLs');
assert.match(modernHtml, /href="https:\/\/images\.example\.test\/page"/, 'HTML policy does not rewrite links');

const authoredCss = `
@font-face {
  font-family: "Probe Font";
  src: url("https://fonts.example.test/probe(one).woff2") format("woff2");
}
.sheet-card { background-image: url('https://images.example.test/card.png'); }
.sheet-relative { background-image: url(./relative.png); }
.sheet-inline { background-image: url("data:image/png;base64,AAAA"); }
`.trim();

assert.equal(
  applyRoll20RuntimeCssAssetPolicy(authoredCss, 'modern'),
  authoredCss,
  'modern preserves authored CSS byte-for-byte',
);

const legacyCss = applyRoll20RuntimeCssAssetPolicy(authoredCss, 'legacy');
assert.match(
  legacyCss,
  /url\("https:\/\/imgsrv\.roll20\.net\/\?src=https%3A%2F%2Ffonts\.example\.test%2Fprobe%28one%29\.woff2"\)/,
  'legacy proxies an external font URL',
);
assert.match(
  legacyCss,
  /url\('https:\/\/imgsrv\.roll20\.net\/\?src=https%3A%2F%2Fimages\.example\.test%2Fcard\.png'\)/,
  'legacy proxies an external background image URL',
);
assert.match(legacyCss, /url\(\.\/relative\.png\)/, 'legacy preserves relative CSS URLs');
assert.match(legacyCss, /url\("data:image\/png;base64,AAAA"\)/, 'legacy preserves data CSS URLs');

const managedHtml = applyRoll20RuntimeHtmlAssetPolicy([
  '<img src="https://files.d20.io/images/a.png">',
  '<img src="https://imgsrv.roll20.net/?src=https%3A%2F%2Fexample.test%2Fb.png">',
].join(''), 'modern');
assert.equal((managedHtml.match(/imgsrv\.roll20\.net/g) ?? []).length, 1, 'existing HTML proxy is not nested');

const managedCss = applyRoll20RuntimeCssAssetPolicy(`
.a { background: url("https://app.roll20.net/images/a.png"); }
.b { background: url("https://s3.amazonaws.com/files.d20.io/images/b.png"); }
.c { background: url("https://imgsrv.roll20.net/?src=https%3A%2F%2Fexample.test%2Fc.png"); }
`, 'legacy');
assert.equal((managedCss.match(/imgsrv\.roll20\.net/g) ?? []).length, 1, 'existing CSS proxy is not nested');

const lookalike = applyRoll20RuntimeCssAssetPolicy(
  '.c { background: url("https://files.d20.io.evil.test/c(test).png"); }',
  'legacy',
);
assert.match(lookalike, /imgsrv\.roll20\.net/, 'lookalike hostname does not bypass the allow-list');
assert.match(lookalike, /c%28test%29\.png/, 'quoted CSS URLs may contain parentheses');

console.log('Runtime asset policy tests passed.');
