import assert from 'node:assert/strict';
import {
  defaultRolltemplateBody,
  extractRolltemplateBody,
  renderTemplateBody,
} from '../rolltemplateRender';
import {
  buildRolltemplatePreviewResult,
  collectRolltemplatePreviewFields,
} from '../rolltemplatePreview';

const source = `
<rolltemplate class="sheet-rolltemplate-default">
  <table class="result-card">
    <caption>{{title}}</caption>
    <tr class="critical-row">{{#rollWasCrit()}}<td class="label">Critical</td>{{/rollWasCrit()}}</tr>
    <tr><td class="label">{{unsafe}}</td><td class="inlinerollresult">{{total}}</td></tr>
    <img src="javascript:alert(1)" onerror="alert(2)" style="color:red">
    <script>alert(3)</script>
  </table>
</rolltemplate>`;

const body = extractRolltemplateBody(source, 'default');
assert.ok(body);

const rendered = renderTemplateBody(
  body,
  [
    { key: 'title', raw: 'Attack', detail: null, text: 'Attack' },
    { key: 'unsafe', raw: '<img src=x>', detail: null, text: '<img src=x>' },
    {
      key: 'total',
      raw: '[[1d20]]',
      detail: {
        kind: 'expr',
        expression: '1d20',
        dice: [{ count: 1, sides: 20, raw: [20], kept: [20] }],
        total: 20,
        isCrit: true,
        isFumble: false,
        resolvedAttrs: {},
        queries: [],
      },
      text: '20',
    },
  ],
  { anyCrit: true, anyFumble: false },
  { Attack: '공격' },
);

assert.match(rendered, /sheet-result-card/);
assert.match(rendered, /공격/);
assert.match(rendered, /<span class="rt-total">20<\/span>/);
assert.match(rendered, /<span class="rt-dice">\[20\]<\/span>/);
assert.match(rendered, /sheet-label/);
assert.match(rendered, /Critical/);
assert.match(rendered, /&lt;img src=x&gt;/);
assert.doesNotMatch(rendered, /<img src=x>/);
assert.match(rendered, /class="inlinerollresult"/);
assert.doesNotMatch(rendered, /javascript:|onerror|style=|<script/i);

const hiddenCritical = renderTemplateBody(
  body,
  [{ key: 'title', raw: 'Attack', detail: null, text: 'Attack' }],
  { anyCrit: false, anyFumble: false },
);
assert.doesNotMatch(hiddenCritical, /Critical/);

const defaultBody = defaultRolltemplateBody({
  kind: 'rolltemplate',
  templateName: 'default',
  fields: [
    { key: 'name', raw: 'Sandbox proof', detail: null, text: 'Sandbox proof' },
    {
      key: 'result',
      raw: '[[1d20]]',
      detail: {
        kind: 'expr',
        expression: '1d20',
        dice: [{ count: 1, sides: 20, raw: [12], kept: [12] }],
        total: 12,
        isCrit: false,
        isFumble: false,
        resolvedAttrs: {},
        queries: [],
      },
      text: '12',
    },
  ],
  anyCrit: false,
  anyFumble: false,
});

assert.match(defaultBody, /^<table><caption>Sandbox proof<\/caption>/);
assert.match(defaultBody, /<tr><td>Result<\/td><td>/);
assert.match(defaultBody, /class="inlinerollresult showtip tipsy-n-right"/);
assert.match(defaultBody, />12<\/span>/);
assert.doesNotMatch(defaultBody, /<th>|\[12\]|<td>name<\/td>/i);

const previewFields = collectRolltemplatePreviewFields(`
  <div>{{name}}</div>
  {{#rollWasCrit() result}}<div>{{result}}</div>{{/rollWasCrit() result}}
  <div>{{computed::bonus}}</div>
  <div>{{result}}</div>
`);
assert.deepEqual(
  previewFields.map((field) => [field.key, field.text]),
  [['name', '예시 이름'], ['result', '12'], ['computed::bonus', '예시 bonus']],
  'visual editor derives stable anonymous preview values without duplicating fields',
);
const previewResult = buildRolltemplatePreviewResult('<div>{{name}} {{total}}</div>', 'card');
assert.equal(previewResult.templateName, 'card', 'visual editor keeps the selected template name');
assert.deepEqual(previewResult.fields.map((field) => field.text), ['예시 이름', '12']);

console.log('rolltemplate render test PASS');
