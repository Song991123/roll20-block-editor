import { strict as assert } from 'node:assert';
import { analyzeAssetRefs, buildAssetReplacementDraft } from '../asset_refs.ts';

const result = analyzeAssetRefs(
  [
    '<img src="https://imgur.com/dead">',
    '<img src="//cdn.example.com/direct.png">',
    '<img src="local/background.png">',
  ].join('\n'),
  [
    '.a { background-image: url("https://imgsrv.roll20.net/?src=https://imgur.com/dead"); }',
    '.b { background-image: url(data:image/png;base64,aaa); }',
  ].join('\n'),
);

assert.equal(result.externalRefs, 3);
assert.equal(result.relativeRefs, 1);
assert.equal(result.dataRefs, 1);
assert.equal(result.roll20ProxyRefs, 1);
assert.equal(result.imgurPageRefs, 1);
assert.equal(result.placeholderRiskRefs, 2);
assert.deepEqual(result.hosts, ['cdn.example.com', 'imgsrv.roll20.net', 'imgur.com']);
assert.deepEqual(
  result.refs.map((item) => ({
    ref: item.ref,
    kind: item.kind,
    placeholderRisk: item.placeholderRisk,
    proxySourceRef: item.proxySourceRef,
    replacementRefs: item.replacementRefs,
  })),
  [
    {
      ref: 'https://imgsrv.roll20.net/?src=https://imgur.com/dead',
      kind: 'external-url',
      placeholderRisk: true,
      proxySourceRef: 'https://imgur.com/dead',
      replacementRefs: [
        'https://imgsrv.roll20.net/?src=https://imgur.com/dead',
        'https://imgur.com/dead',
      ],
    },
    {
      ref: 'data:image/png;base64,aaa',
      kind: 'data-url',
      placeholderRisk: false,
      proxySourceRef: null,
      replacementRefs: [],
    },
    {
      ref: 'https://imgur.com/dead',
      kind: 'external-url',
      placeholderRisk: true,
      proxySourceRef: null,
      replacementRefs: ['https://imgur.com/dead'],
    },
    {
      ref: '//cdn.example.com/direct.png',
      kind: 'external-url',
      placeholderRisk: false,
      proxySourceRef: null,
      replacementRefs: ['//cdn.example.com/direct.png'],
    },
    {
      ref: 'local/background.png',
      kind: 'relative-url',
      placeholderRisk: false,
      proxySourceRef: null,
      replacementRefs: ['local/background.png'],
    },
  ],
);

const draft = buildAssetReplacementDraft(result, { sourceLabel: 'unit test' });
assert.match(draft, /Asset replacement draft from unit test/);
assert.match(draft, /https:\/\/imgsrv\.roll20\.net\/\?src=https:\/\/imgur\.com\/dead => <paste-user-owned-https-url-here> # placeholder-risk/);
assert.match(draft, /https:\/\/imgur\.com\/dead => <paste-user-owned-https-url-here> # placeholder-risk/);
assert.match(draft, /local\/background\.png => <paste-user-owned-https-url-here> # relative-path/);
assert.doesNotMatch(draft, /data:image\/png/);

console.log('asset_refs.test PASS');
