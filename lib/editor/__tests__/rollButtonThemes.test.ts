import assert from 'node:assert/strict';
import { sanitizeForRoll20Legacy } from '../../emit/sanitize';
import { sanitizeRoll20SandboxCss } from '../../emit/roll20SandboxSanitize';
import { MANAGED_DESIGN_STATES } from '../designPosition';
import {
  getRollButtonTheme,
  ROLL_BUTTON_THEMES,
  rollButtonThemeMatches,
} from '../rollButtonThemes';

assert.equal(ROLL_BUTTON_THEMES.length, 4);
assert.deepEqual(ROLL_BUTTON_THEMES.map((theme) => theme.id), [
  'ribbon',
  'ticket',
  'mint-tab',
  'ink-stamp',
]);

for (const candidate of ROLL_BUTTON_THEMES) {
  for (const state of MANAGED_DESIGN_STATES) {
    assert(Object.keys(candidate.states[state]).length > 0, `${candidate.id} missing ${state}`);
  }
  assert.equal(candidate.states.base['background-image'], 'none');
  assert.equal(candidate.states.base['letter-spacing'], '0');
  assert.equal(candidate.before.display, 'inline-block');
  assert.equal(candidate.before['margin-right'], '6px');
  assert.equal(candidate.states.hover['border-radius'], null);
  assert.equal(candidate.states.active.padding, null);
  assert.equal(candidate.states.focus['background-color'], null);
  for (const state of ['base', 'hover', 'active'] as const) {
    const background = candidate.states[state]['background-color'];
    const foreground = candidate.states[state].color ?? candidate.states.base.color;
    assert(
      typeof background === 'string'
        && typeof foreground === 'string'
        && contrastRatio(background, foreground) >= 4.5,
      `${candidate.id} ${state} text contrast fell below 4.5:1`,
    );
  }
}

const ribbon = getRollButtonTheme('ribbon');
const exactStates = Object.fromEntries(
  MANAGED_DESIGN_STATES.map((state) => [state, { ...ribbon.states[state] }]),
) as Record<(typeof MANAGED_DESIGN_STATES)[number], Record<string, string>>;
assert.equal(
  rollButtonThemeMatches(exactStates, ribbon.before as Record<string, string>, ribbon),
  true,
);
exactStates.hover['background-color'] = '#000000';
assert.equal(
  rollButtonThemeMatches(exactStates, ribbon.before as Record<string, string>, ribbon),
  false,
);

const css = [
  `.sheet-r20-node-roll { background-color: ${ribbon.states.base['background-color']}; }`,
  `.sheet-r20-node-roll:hover { background-color: ${ribbon.states.hover['background-color']}; }`,
  `.sheet-r20-node-roll:active { background-color: ${ribbon.states.active['background-color']}; }`,
  `.sheet-r20-node-roll:focus { ${format(ribbon.states.focus)} }`,
  `.sheet-r20-node-roll::before { ${format(ribbon.before)} }`,
].join('\n');
const modern = sanitizeRoll20SandboxCss(css);
const legacy = sanitizeForRoll20Legacy(css);
for (const token of [':hover', ':active', ':focus', '::before', '#d96b91', 'outline-offset']) {
  assert(modern.css.includes(token), `modern sanitize dropped ${token}`);
  assert(legacy.sanitized.includes(token), `legacy sanitize dropped ${token}`);
}

console.log('rollButtonThemes.test PASS');

function format(declarations: Record<string, string | null>): string {
  return Object.entries(declarations)
    .filter((entry): entry is [string, string] => entry[1] != null)
    .map(([property, value]) => `${property}: ${value};`)
    .join(' ');
}

function contrastRatio(first: string, second: string): number {
  const values = [relativeLuminance(first), relativeLuminance(second)];
  return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
}

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
  const linear = channels.map((value) => (
    value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  ));
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}
