import { strict as assert } from 'node:assert';
import { buildTargetedHtmlPatchPlan } from '../targetedHtmlPatch.ts';

const keys = {
  baseHtmlKey: 'before-key-1',
  nextHtmlKey: 'after-key-2',
};

assert.deepEqual(buildTargetedHtmlPatchPlan({
  beforeHtml: `<div data-r20-block-id='target-1' class="before" style='color: red'>Text</div>`,
  afterHtml: `<div style="color: blue" data-r20-block-id='target-1' class='after'>Text</div>`,
  blockIds: ['target-1'],
  ...keys,
}), {
  ...keys,
  patches: [{
    blockId: 'target-1',
    tagName: 'div',
    beforeClassName: 'before',
    beforeStyleText: 'color: red',
    className: 'after',
    styleText: 'color: blue',
  }],
});

assert.deepEqual(buildTargetedHtmlPatchPlan({
  beforeHtml: '<section data-r20-block-id="one" class="a"><input data-r20-block-id=\'two\' style="width: 1px" /></section>',
  afterHtml: '<section class="b" data-r20-block-id="one"><input style=\'width: 2px\' data-r20-block-id="two" /></section>',
  blockIds: ['two', 'one'],
  ...keys,
}), {
  ...keys,
  patches: [
    {
      blockId: 'two',
      tagName: 'input',
      beforeClassName: null,
      beforeStyleText: 'width: 1px',
      className: null,
      styleText: 'width: 2px',
    },
    {
      blockId: 'one',
      tagName: 'section',
      beforeClassName: 'a',
      beforeStyleText: null,
      className: 'b',
      styleText: null,
    },
  ],
});

const base = '<div data-r20-block-id="target" class="a" aria-label="same"><span>Text</span></div>';
assert.equal(buildTargetedHtmlPatchPlan({
  beforeHtml: base,
  afterHtml: '<div data-r20-block-id="target" class="b" aria-label="same"><span>Changed</span></div>',
  blockIds: ['target'],
  ...keys,
}), null, 'rejects unrelated text changes');
assert.equal(buildTargetedHtmlPatchPlan({
  beforeHtml: base,
  afterHtml: '<div data-r20-block-id="target" class="b" aria-label="changed"><span>Text</span></div>',
  blockIds: ['target'],
  ...keys,
}), null, 'rejects unrelated attribute changes');
assert.equal(buildTargetedHtmlPatchPlan({
  beforeHtml: base,
  afterHtml: '<div data-r20-block-id="target" class="b" aria-label="same"><em><span>Text</span></em></div>',
  blockIds: ['target'],
  ...keys,
}), null, 'rejects structure changes');
assert.equal(buildTargetedHtmlPatchPlan({
  beforeHtml: `${base}<p data-r20-block-id="other" class="x">Other</p>`,
  afterHtml: '<div data-r20-block-id="target" class="b" aria-label="same"><span>Text</span></div><p data-r20-block-id="other" class="y">Other</p>',
  blockIds: ['target'],
  ...keys,
}), null, 'rejects class changes outside the allowlist');

assert.equal(buildTargetedHtmlPatchPlan({
  beforeHtml: base,
  afterHtml: base.replace('class="a"', 'class="b"'),
  blockIds: ['missing'],
  ...keys,
}), null, 'rejects missing target ids');
assert.equal(buildTargetedHtmlPatchPlan({
  beforeHtml: '<div data-r20-block-id="target" class="a"></div><div data-r20-block-id="target"></div>',
  afterHtml: '<div data-r20-block-id="target" class="b"></div><div data-r20-block-id="target"></div>',
  blockIds: ['target'],
  ...keys,
}), null, 'rejects duplicate target ids in HTML');
assert.equal(buildTargetedHtmlPatchPlan({
  beforeHtml: '<div data-r20-block-id="target" class="a"></div><div data-r20-block-id=target></div>',
  afterHtml: '<div data-r20-block-id="target" class="b"></div><div data-r20-block-id=target></div>',
  blockIds: ['target'],
  ...keys,
}), null, 'rejects an unquoted duplicate target id');
assert.equal(buildTargetedHtmlPatchPlan({
  beforeHtml: base,
  afterHtml: base.replace('class="a"', 'class="b"'),
  blockIds: ['target', 'target'],
  ...keys,
}), null, 'rejects duplicate requested ids');

assert.equal(buildTargetedHtmlPatchPlan({
  beforeHtml: '<div data-r20-block-id="target" class="a">Text</div>',
  afterHtml: '<span data-r20-block-id="target" class="b">Text</span>',
  blockIds: ['target'],
  ...keys,
}), null, 'rejects tag changes');
assert.equal(buildTargetedHtmlPatchPlan({
  beforeHtml: base,
  afterHtml: base,
  blockIds: ['target'],
  ...keys,
}), null, 'rejects identical HTML');
assert.equal(buildTargetedHtmlPatchPlan({
  beforeHtml: '<div data-r20-block-id="target" class="a">Text</div>',
  afterHtml: "<div class='a' data-r20-block-id='target'>Text</div>",
  blockIds: ['target'],
  ...keys,
}), null, 'rejects serialization-only no-op changes');

assert.deepEqual(buildTargetedHtmlPatchPlan({
  beforeHtml: '<div data-r20-block-id="entity" class="a&amp;b" style="content: &quot;a&gt;b&quot;"></div>',
  afterHtml: '<div data-r20-block-id="entity" class="a&#38;b" style=\'content: &quot;b&gt;c&quot;\'></div>',
  blockIds: ['entity'],
  ...keys,
}), {
  ...keys,
  patches: [{
    blockId: 'entity',
    tagName: 'div',
    beforeClassName: 'a&amp;b',
    beforeStyleText: 'content: &quot;a&gt;b&quot;',
    className: 'a&#38;b',
    styleText: 'content: &quot;b&gt;c&quot;',
  }],
}, 'preserves encoded attribute values');
assert.deepEqual(buildTargetedHtmlPatchPlan({
  beforeHtml: '<div data-r20-block-id="quoted" class="a>b" style="--label: \'x>y\';"></div>',
  afterHtml: '<div data-r20-block-id="quoted" class="c>d" style="--label: \'z>w\';"></div>',
  blockIds: ['quoted'],
  ...keys,
})?.patches[0], {
  blockId: 'quoted',
  tagName: 'div',
  beforeClassName: 'a>b',
  beforeStyleText: "--label: 'x>y';",
  className: 'c>d',
  styleText: "--label: 'z>w';",
}, 'keeps tag delimiters inside quoted values');

assert.equal(buildTargetedHtmlPatchPlan({
  beforeHtml: base,
  afterHtml: base.replace('class="a"', 'class="b"'),
  blockIds: ['target'],
  baseHtmlKey: 'INVALID KEY',
  nextHtmlKey: 'valid-key',
}), null, 'rejects invalid keys');
assert.equal(buildTargetedHtmlPatchPlan({
  beforeHtml: base,
  afterHtml: base.replace('class="a"', 'class="b"'),
  blockIds: ['target'],
  baseHtmlKey: undefined as unknown as string,
  nextHtmlKey: 'valid-key',
}), null, 'rejects non-string keys at runtime');
assert.equal(buildTargetedHtmlPatchPlan({
  beforeHtml: base,
  afterHtml: base.replace('class="a"', 'class="b"'),
  blockIds: ['target'],
  baseHtmlKey: 'same-key',
  nextHtmlKey: 'same-key',
}), null, 'rejects unchanged keys');
assert.equal(buildTargetedHtmlPatchPlan({
  beforeHtml: base,
  afterHtml: base.replace('class="a"', 'class="b"'),
  blockIds: Array.from({ length: 129 }, (_, index) => `target-${index}`),
  ...keys,
}), null, 'rejects more than 128 ids');
assert.equal(buildTargetedHtmlPatchPlan({
  beforeHtml: base,
  afterHtml: base.replace('class="a"', 'class="b"'),
  blockIds: ['x'.repeat(257)],
  ...keys,
}), null, 'rejects oversized block ids');
assert.doesNotThrow(() => buildTargetedHtmlPatchPlan({
  beforeHtml: '<div data-r20-block-id="&#999999999;" class="a"></div>',
  afterHtml: '<div data-r20-block-id="&#999999999;" class="b"></div>',
  blockIds: ['target'],
  ...keys,
}), 'invalid numeric entities fall back instead of throwing');
