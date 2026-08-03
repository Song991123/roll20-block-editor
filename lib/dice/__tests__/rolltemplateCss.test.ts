import assert from 'node:assert/strict';
import { extractRolltemplateCss } from '../rolltemplateCss';

const source = `
  .sheet-page-only { color: black; }
  .sheet-rolltemplate-proof .sheet-card { color: #111; animation: pulse 1s linear; }
  @media (max-width: 1px) {
    .sheet-rolltemplate-proof .sheet-card { color: #f00; }
    .sheet-page-only { display: none; }
  }
  @supports (display: grid) {
    @layer cards {
      .sheet-rolltemplate-proof .sheet-grid { display: grid; }
    }
  }
  @keyframes pulse { from { opacity: .5; } to { opacity: 1; } }
  @keyframes unused { from { opacity: 0; } to { opacity: 1; } }
  @font-face { font-family: "Proof Font"; src: url("https://example.test/proof.woff2"); }
`;

const extracted = extractRolltemplateCss(source);
assert.match(extracted, /\.sheet-rolltemplate-proof \.sheet-card/);
assert.doesNotMatch(extracted, /\.sheet-page-only/);
assert.match(extracted, /@media \(max-width: 1px\)\s*\{/);
assert.match(extracted, /@supports \(display: grid\)\s*\{/);
assert.match(extracted, /@layer cards\s*\{/);
assert.match(extracted, /animation:\s*r20-chat-pulse 1s linear/);
assert.match(extracted, /@keyframes r20-chat-pulse/);
assert.doesNotMatch(extracted, /@keyframes unused/);
assert.match(extracted, /@font-face/);
assert.match(extracted, /url\("https:\/\/example\.test\/proof\.woff2"\)/);

const noFonts = extractRolltemplateCss(source, 'roll20-chat-fallback');
assert.doesNotMatch(noFonts, /@font-face/);

const proxiedFont = extractRolltemplateCss(source, 'roll20-sandbox-font-proxy');
assert.match(proxiedFont, /imgsrv\.roll20\.net\/\?src=/);

const autoPrefixed = extractRolltemplateCss(
  '.rolltemplate-plain .card { color: red; } .ordinary-sheet { color: blue; }',
);
assert.match(autoPrefixed, /\.sheet-rolltemplate-plain \.sheet-card/);
assert.doesNotMatch(autoPrefixed, /ordinary-sheet/);

const scopedSelectors = extractRolltemplateCss(`
  .sheet-rolltemplate-proof .sheet-card,
  body,
  [data-label="a,b"] .sheet-rolltemplate-proof {
    color: red;
  }
`);
assert.match(
  scopedSelectors,
  /:where\(\.r20-chat-pane\) \.sheet-rolltemplate-proof \.sheet-card/,
);
assert.match(
  scopedSelectors,
  /:where\(\.r20-chat-pane\) \[data-label="a,b"\] \.sheet-rolltemplate-proof/,
);
assert.doesNotMatch(scopedSelectors, /(?:^|,)\s*body\b/m);

console.log('rolltemplate CSS extraction test PASS');
