import { strict as assert } from 'node:assert';
import { analyzeAssetRefs, buildAssetReplacementDraft } from '../asset_refs.ts';

const result = analyzeAssetRefs(
  [
    '<img src="https://imgur.com/dead">',
    '<img src="https://imgur.com/OsEX9Qg.png">',
    '<img src="http://i.imgur.com/OjBPJL9.jpg">',
    '<img src="//cdn.example.com/direct.png">',
    '<img src="local/background.png">',
  ].join('\n'),
  [
    '.a { background-image: url("https://imgsrv.roll20.net/?src=https://imgur.com/dead"); }',
    '.b { background-image: url("https://imgsrv.roll20.net/?src=http://i.imgur.com/RNob7Yh.jpg"); }',
    '.b { background-image: url(data:image/png;base64,aaa); }',
  ].join('\n'),
);

assert.equal(result.externalRefs, 6);
assert.equal(result.relativeRefs, 1);
assert.equal(result.dataRefs, 1);
assert.equal(result.insecureHttpRefs, 1);
assert.equal(result.roll20ProxyRefs, 2);
assert.equal(result.imgurPageRefs, 1);
assert.equal(result.imgurDirectCandidateRefs, 1);
assert.equal(result.canonicalDirectRefs, 4);
assert.equal(result.placeholderRiskRefs, 3);
assert.deepEqual(result.hosts, ['cdn.example.com', 'i.imgur.com', 'imgsrv.roll20.net', 'imgur.com']);
assert.deepEqual(
  result.refs.map((item) => ({
    ref: item.ref,
    kind: item.kind,
    insecureHttp: item.insecureHttp,
    imgurDirectCandidate: item.imgurDirectCandidate,
    placeholderRisk: item.placeholderRisk,
    proxySourceRef: item.proxySourceRef,
    canonicalDirectRef: item.canonicalDirectRef,
    canonicalReason: item.canonicalReason,
    replacementRefs: item.replacementRefs,
  })),
  [
    {
      ref: 'https://imgsrv.roll20.net/?src=https://imgur.com/dead',
      kind: 'external-url',
      insecureHttp: false,
      imgurDirectCandidate: false,
      placeholderRisk: true,
      proxySourceRef: 'https://imgur.com/dead',
      canonicalDirectRef: null,
      canonicalReason: null,
      replacementRefs: [
        'https://imgsrv.roll20.net/?src=https://imgur.com/dead',
        'https://imgur.com/dead',
      ],
    },
    {
      ref: 'https://imgsrv.roll20.net/?src=http://i.imgur.com/RNob7Yh.jpg',
      kind: 'external-url',
      insecureHttp: false,
      imgurDirectCandidate: false,
      placeholderRisk: true,
      proxySourceRef: 'http://i.imgur.com/RNob7Yh.jpg',
      canonicalDirectRef: 'https://i.imgur.com/RNob7Yh.jpg',
      canonicalReason: 'roll20-proxy-imgur-https-upgrade',
      replacementRefs: [
        'https://imgsrv.roll20.net/?src=http://i.imgur.com/RNob7Yh.jpg',
        'http://i.imgur.com/RNob7Yh.jpg',
      ],
    },
    {
      ref: 'data:image/png;base64,aaa',
      kind: 'data-url',
      insecureHttp: false,
      imgurDirectCandidate: false,
      placeholderRisk: false,
      proxySourceRef: null,
      canonicalDirectRef: null,
      canonicalReason: null,
      replacementRefs: [],
    },
    {
      ref: 'https://imgur.com/dead',
      kind: 'external-url',
      insecureHttp: false,
      imgurDirectCandidate: false,
      placeholderRisk: true,
      proxySourceRef: null,
      canonicalDirectRef: null,
      canonicalReason: null,
      replacementRefs: ['https://imgur.com/dead'],
    },
    {
      ref: 'https://imgur.com/OsEX9Qg.png',
      kind: 'external-url',
      insecureHttp: false,
      imgurDirectCandidate: true,
      placeholderRisk: false,
      proxySourceRef: null,
      canonicalDirectRef: 'https://i.imgur.com/OsEX9Qg.png',
      canonicalReason: 'imgur-direct-image',
      replacementRefs: ['https://imgur.com/OsEX9Qg.png'],
    },
    {
      ref: 'http://i.imgur.com/OjBPJL9.jpg',
      kind: 'external-url',
      insecureHttp: true,
      imgurDirectCandidate: false,
      placeholderRisk: false,
      proxySourceRef: null,
      canonicalDirectRef: 'https://i.imgur.com/OjBPJL9.jpg',
      canonicalReason: 'imgur-https-upgrade',
      replacementRefs: ['http://i.imgur.com/OjBPJL9.jpg'],
    },
    {
      ref: '//cdn.example.com/direct.png',
      kind: 'external-url',
      insecureHttp: false,
      imgurDirectCandidate: false,
      placeholderRisk: false,
      proxySourceRef: null,
      canonicalDirectRef: 'https://cdn.example.com/direct.png',
      canonicalReason: 'protocol-relative-https',
      replacementRefs: ['//cdn.example.com/direct.png'],
    },
    {
      ref: 'local/background.png',
      kind: 'relative-url',
      insecureHttp: false,
      imgurDirectCandidate: false,
      placeholderRisk: false,
      proxySourceRef: null,
      canonicalDirectRef: null,
      canonicalReason: null,
      replacementRefs: ['local/background.png'],
    },
  ],
);

const draft = buildAssetReplacementDraft(result, { sourceLabel: 'unit test' });
assert.match(draft, /Asset replacement draft from unit test/);
assert.match(draft, /https:\/\/imgsrv\.roll20\.net\/\?src=https:\/\/imgur\.com\/dead => <paste-user-owned-https-url-here> # placeholder-risk/);
assert.match(draft, /https:\/\/imgur\.com\/dead => <paste-user-owned-https-url-here> # placeholder-risk/);
assert.match(draft, /https:\/\/imgur\.com\/OsEX9Qg\.png => https:\/\/i\.imgur\.com\/OsEX9Qg\.png # imgur-direct-image:verify-permission/);
assert.match(draft, /http:\/\/i\.imgur\.com\/OjBPJL9\.jpg => https:\/\/i\.imgur\.com\/OjBPJL9\.jpg # imgur-https-upgrade:verify-permission/);
assert.match(draft, /https:\/\/imgsrv\.roll20\.net\/\?src=http:\/\/i\.imgur\.com\/RNob7Yh\.jpg => https:\/\/i\.imgur\.com\/RNob7Yh\.jpg # roll20-proxy-imgur-https-upgrade:verify-permission/);
assert.match(draft, /local\/background\.png => <paste-user-owned-https-url-here> # relative-path/);
assert.doesNotMatch(draft, /data:image\/png/);

const htmlAttributeRefs = analyzeAssetRefs(
  [
    '<picture>',
    '  <source srcset="https://cdn.example.com/small.png 1x, https://cdn.example.com/large.png 2x">',
    '  <img srcset="/images/card-small.png 480w, /images/card-large.png 960w" poster="https://cdn.example.com/poster.png">',
    '  <div style="background-image: url(./inline-background.png)"></div>',
    '</picture>',
  ].join('\n'),
  '',
);

assert.equal(htmlAttributeRefs.externalRefs, 3);
assert.equal(htmlAttributeRefs.relativeRefs, 3);
assert.equal(htmlAttributeRefs.totalRefs, 6);
assert.deepEqual(
  htmlAttributeRefs.refs.map((item) => item.ref),
  [
    'https://cdn.example.com/poster.png',
    'https://cdn.example.com/small.png',
    'https://cdn.example.com/large.png',
    '/images/card-small.png',
    '/images/card-large.png',
    './inline-background.png',
  ],
);

console.log('asset_refs.test PASS');
