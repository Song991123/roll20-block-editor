import assert from 'node:assert/strict';
import { detectTemplateMarkers } from '../templateMarkers';

const expanded = detectTemplateMarkers('<div class="sheet-root"><input name="attr_hp"></div>');
assert.equal(expanded.count, 0, 'ordinary Roll20 HTML must not warn');

const jinja = detectTemplateMarkers(`
  <div>{% include "header.html" %}</div>
  {% if show_extra %}<span>Extra</span>{% endif %}
`);
assert.equal(jinja.count, 3, 'Jinja directives are counted without source retention');
assert.deepEqual(jinja.kinds, ['jinja']);

const erb = detectTemplateMarkers('<div><%= value %></div>');
assert.equal(erb.count, 1, 'ERB markers are detected');
assert.deepEqual(erb.kinds, ['erb']);

const handlebars = detectTemplateMarkers('{{#if show}}{{> header}}{{/if}}');
assert.equal(handlebars.count, 3, 'structural Handlebars markers are detected');
assert.deepEqual(handlebars.kinds, ['handlebars-structure']);

const ordinaryRoll20Text = detectTemplateMarkers('<button type="roll" value="{{name}}">Roll</button>');
assert.equal(ordinaryRoll20Text.count, 0, 'ordinary double-brace text is not treated as a template');

const rolltemplateHelpers = detectTemplateMarkers(`
  <rolltemplate class="sheet-rolltemplate-proof">
    {{#rollGreater() result 1}}<span>{{result}}</span>{{/rollGreater() result 1}}
    {{#name}}<b>{{name}}</b>{{/name}}
  </rolltemplate>
`);
assert.equal(rolltemplateHelpers.count, 0, 'Roll20 Rolltemplate sections are valid imported source');

const mixedRolltemplateAndBuildTemplate = detectTemplateMarkers(`
  <rolltemplate class="sheet-rolltemplate-proof">
    {{#rollGreater() result 1}}<span>{{result}}</span>{{/rollGreater() result 1}}
  </rolltemplate>
  {{#if show_unexpanded}}<div>Build-only source</div>{{/if}}
`);
assert.equal(mixedRolltemplateAndBuildTemplate.count, 2, 'build-template markers outside Rolltemplates still warn');
assert.deepEqual(mixedRolltemplateAndBuildTemplate.kinds, ['handlebars-structure']);

console.log('template marker detection tests: PASS');
