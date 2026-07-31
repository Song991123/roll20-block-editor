import { strict as assert } from 'node:assert';
import {
  backgroundImageUrlPatch,
  normalizeBackgroundImageUrl,
  readBackgroundImageSource,
} from '../backgroundImageStyle.ts';
import { sanitizeRoll20SandboxCss } from '../../emit/roll20SandboxSanitize.ts';
import { sanitizeForRoll20Legacy } from '../../emit/sanitize.ts';

assert.deepEqual(readBackgroundImageSource(), {
  kind: 'empty',
  url: '',
  insecureHttp: false,
});
assert.deepEqual(readBackgroundImageSource('none'), {
  kind: 'empty',
  url: '',
  insecureHttp: false,
});
assert.deepEqual(readBackgroundImageSource('url("https://assets.example.test/paper.png")'), {
  kind: 'remote',
  url: 'https://assets.example.test/paper.png',
  insecureHttp: false,
});
assert.deepEqual(readBackgroundImageSource('linear-gradient(#fff, #eee)'), {
  kind: 'complex',
  url: '',
  insecureHttp: false,
});

assert.deepEqual(normalizeBackgroundImageUrl('//assets.example.test/paper.png'), {
  url: 'https://assets.example.test/paper.png',
  error: null,
  insecureHttp: false,
});
assert.deepEqual(normalizeBackgroundImageUrl('http://assets.example.test/paper.png'), {
  url: 'http://assets.example.test/paper.png',
  error: null,
  insecureHttp: true,
});
assert.match(normalizeBackgroundImageUrl('data:image/png;base64,AAAA').error ?? '', /웹 이미지 주소/);
assert.match(normalizeBackgroundImageUrl('javascript:alert(1)').error ?? '', /웹 이미지 주소/);
assert.match(normalizeBackgroundImageUrl('./paper.png').error ?? '', /https:\/\//);
assert.match(normalizeBackgroundImageUrl('https://user:secret@example.test/paper.png').error ?? '', /로그인 정보/);

const authored = backgroundImageUrlPatch('https://assets.example.test/paper image.png', {});
assert.equal(authored.result.error, null);
assert.deepEqual(authored.declarations, {
  'background-image': 'url("https://assets.example.test/paper%20image.png")',
  'background-size': 'cover',
  'background-position': 'center center',
  'background-repeat': 'no-repeat',
});

const preserved = backgroundImageUrlPatch('https://assets.example.test/new.png', {
  'background-size': 'contain',
  'background-position': 'right bottom',
  'background-repeat': 'repeat-x',
});
assert.deepEqual(preserved.declarations, {
  'background-image': 'url("https://assets.example.test/new.png")',
});

const cleared = backgroundImageUrlPatch('', {
  'background-size': 'cover',
  'background-position': 'center center',
  'background-repeat': 'no-repeat',
});
assert.deepEqual(cleared.declarations, {
  'background-image': null,
  'background-size': null,
  'background-position': null,
  'background-repeat': null,
});

const managedCss = `.sheet-r20-node-frame {
  background-image: ${authored.declarations?.['background-image']};
  background-size: cover;
  background-position: right bottom;
  background-repeat: no-repeat;
}`;
const modern = sanitizeRoll20SandboxCss(managedCss);
assert.match(modern.css, /\.charsheet \.sheet-r20-node-frame/);
assert.match(modern.css, /https:\/\/imgsrv\.roll20\.net\/\?src=/);
assert.match(modern.css, /background-size: cover/);
assert.match(modern.css, /background-position: right bottom/);
assert.match(modern.css, /background-repeat: no-repeat/);
const legacy = sanitizeForRoll20Legacy(managedCss);
assert.match(legacy.sanitized, /background-image: url\("https:\/\/assets\.example\.test\/paper%20image\.png"\)/);
assert.match(legacy.sanitized, /background-size: cover/);
assert.match(legacy.sanitized, /background-position: right bottom/);
assert.match(legacy.sanitized, /background-repeat: no-repeat/);

console.log('backgroundImageStyle.test PASS');
