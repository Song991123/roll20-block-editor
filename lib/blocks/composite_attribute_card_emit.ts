/**
 * Pure renderer + types for `r20_attribute_card` (Phase 1).
 *
 * Anchor: docs/spec/26_composite_blocks.md §3.
 *
 * Blockly 의존 0 — composite_attribute_card.ts (Blockly init/field 정의) 와
 * composite_matcher.ts (import packing 의 round-trip 검증) 양쪽이 본 모듈만
 * import 한다. 단위 테스트도 Blockly 미사용으로 본 모듈만 호출.
 *
 * 시스템 specific 토큰 0. legacy-sheet-corpus hardcoding 0.
 */

export interface AttributeCardFields {
  LABEL: string;
  I18N_KEY: string;
  ATTR_NAME: string;
  CURRENT_VALUE: string;
  MAX_VALUE: string;
  ROLL_BUTTON_NAME: string;
  ROLL_EXPR: string;
  LABEL_CLASS: string;
  INPUT_CLASS: string;
}

export const EMPTY_ATTRIBUTE_CARD_FIELDS: AttributeCardFields = {
  LABEL: '',
  I18N_KEY: '',
  ATTR_NAME: '',
  CURRENT_VALUE: '',
  MAX_VALUE: '',
  ROLL_BUTTON_NAME: '',
  ROLL_EXPR: '',
  LABEL_CLASS: '',
  INPUT_CLASS: '',
};

export type CompositeWarn = (
  code: string,
  severity: 'error' | 'warning' | 'info',
  message: string,
) => void;

function escapeAttr(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeText(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function joinClass(...parts: Array<string | undefined | null>): string {
  return parts
    .map((p) => String(p ?? '').trim())
    .filter((p) => p.length > 0)
    .join(' ');
}

/**
 * Composite renderer — atomic chain (r20_td × N + r20_i18n_text +
 * r20_text_input + r20_roll_button + r20_literal_string) 펼침과 동일 HTML.
 *
 * 의도적으로 atomic generator 를 호출하지 않음 — composite 가 atomic 카탈로그를
 * 모르고 독립적으로 동등 HTML 을 만들어내는 self-contained 책임 (atomic
 * generator API 변경 시 composite 가 깨지지 않게).
 */
export function renderAttributeCardHtml(
  f: AttributeCardFields,
  warn: CompositeWarn = () => undefined,
): string {
  if (!f.ATTR_NAME) {
    warn(
      'COMPOSITE_ATTR_CARD_NAME_MISSING',
      'warning',
      'r20_attribute_card: ATTR_NAME 비어 있음 — emit 생략.',
    );
    return '';
  }
  const attr = f.ATTR_NAME.replace(/[^A-Za-z0-9_-]/g, '');
  if (!attr) {
    warn(
      'COMPOSITE_ATTR_CARD_NAME_INVALID',
      'warning',
      'r20_attribute_card: ATTR_NAME 에 invalid 문자만 있음 — emit 생략.',
    );
    return '';
  }
  const parts: string[] = [];

  // ── label td ─────────────────────────────────────────────────────────
  const labelCls = joinClass(f.LABEL_CLASS);
  const labelClsAttr = labelCls ? ` class="${escapeAttr(labelCls)}"` : '';
  const labelText = escapeText(f.LABEL);
  let labelInner: string;
  if (f.I18N_KEY) {
    labelInner = `<strong data-i18n="${escapeAttr(f.I18N_KEY)}">${labelText}</strong>`;
  } else if (f.LABEL) {
    labelInner = `<strong>${labelText}</strong>`;
  } else {
    labelInner = '';
  }
  parts.push(`<td${labelClsAttr}>${labelInner}</td>`);

  // ── current value td ─────────────────────────────────────────────────
  const inputCls = joinClass(f.INPUT_CLASS);
  const inputClsAttr = inputCls ? ` class="${escapeAttr(inputCls)}"` : '';
  const inputName = escapeAttr(`attr_${attr}`);
  const inputValue = escapeAttr(f.CURRENT_VALUE);
  parts.push(
    `<td><input${inputClsAttr} type="text" name="${inputName}" value="${inputValue}"/></td>`,
  );

  // ── (optional) max value td ──────────────────────────────────────────
  if (f.MAX_VALUE !== '') {
    const maxName = escapeAttr(`attr_${attr}_max`);
    const maxValue = escapeAttr(f.MAX_VALUE);
    parts.push(
      `<td><input class="attr-max" type="text" name="${maxName}" value="${maxValue}"/></td>`,
    );
  }

  // ── (optional) roll button td ────────────────────────────────────────
  if (f.ROLL_BUTTON_NAME) {
    const rollName = escapeAttr(`roll_${f.ROLL_BUTTON_NAME}`);
    const rollExpr = escapeAttr(f.ROLL_EXPR);
    parts.push(
      `<td class="attr-roll"><button type="roll" name="${rollName}" value="${rollExpr}"></button></td>`,
    );
  }

  // atomic 펼침과 동일 — line break 없이 concat (table cell 사이 whitespace 회피).
  return parts.join('');
}
