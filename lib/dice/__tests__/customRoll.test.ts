import assert from 'node:assert/strict';
import type { RolltemplateResult } from '../executor';
import {
  normalizeComputedRollResults,
  toSheetWorkerRollResult,
  withComputedRollResults,
} from '../customRoll';
import { renderTemplateBody } from '../rolltemplateRender';

const result: RolltemplateResult = {
  kind: 'rolltemplate',
  templateName: 'custom',
  fields: [
    { key: 'name', raw: 'Worker roll', detail: null, text: 'Worker roll' },
    {
      key: 'roll1',
      raw: '[[1d1+4]]',
      detail: {
        kind: 'expr',
        expression: '[[1d1+4]]',
        dice: [{ count: 1, sides: 1, raw: [1], kept: [1], rerolled: [], subtotal: 1 }],
        total: 5,
        isCrit: false,
        isFumble: false,
        resolvedAttrs: {},
        queries: {},
      },
      text: '5',
    },
  ],
  anyCrit: false,
  anyFumble: false,
};

const worker = toSheetWorkerRollResult('roll-1', result);
assert.equal(worker.rollId, 'roll-1');
assert.deepEqual(worker.results.roll1, {
  result: 5,
  dice: [1],
  expression: '1d1+4',
  rolls: [{ dice: 1, sides: 1, results: [1] }],
});

const normalized = normalizeComputedRollResults({
  roll1: 10,
  label: 'success',
  ignored: true,
  infinite: Number.POSITIVE_INFINITY,
});
assert.deepEqual(normalized, { roll1: 10, label: 'success' });

const computed = withComputedRollResults(result, normalized);
assert.equal(computed.kind, 'rolltemplate');
if (computed.kind !== 'rolltemplate') throw new Error('expected rolltemplate result');
assert.equal(computed.fields.find((field) => field.key === 'computed::roll1')?.text, '10');
assert.equal(computed.fields.find((field) => field.key === 'computed::label')?.text, 'success');

const rendered = renderTemplateBody(
  '<div>{{roll1}}</div><div>{{computed::roll1}}</div>{{#rollTotal() computed::roll1 10}}<b>matched</b>{{/rollTotal() computed::roll1 10}}',
  computed.fields,
  computed,
);
assert.match(rendered, />5<\/span>/);
assert.match(rendered, />10<\/span>/);
assert.match(rendered, /matched/);

console.log('custom roll test PASS');
