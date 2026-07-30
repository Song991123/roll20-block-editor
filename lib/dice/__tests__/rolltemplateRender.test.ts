import assert from 'node:assert/strict';
import {
  extractRolltemplateBody,
  renderTemplateBody,
} from '../rolltemplateRender';

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

console.log('rolltemplate render test PASS');
