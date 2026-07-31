/**
 * Pure renderer + types for `r20_skill_row` (Phase 2).
 *
 * Anchor: docs/spec/26_composite_blocks.md §6 + Phase 2 spec.
 *
 * Blockly 의존 0 — composite_skill_row.ts 와 composite_matcher.ts 가 본 모듈
 * 만 import. 단위 테스트도 Blockly 미사용으로 본 모듈만 호출.
 *
 * 일반화 — legacy-sheet-corpus / CoC / DnD 5e / PbtA / 인세인 어떤 시트도 같은 schema:
 *   `<tr>` 한 행 = (체크박스?) + (label, 보통 i18n) + (값 input)×1~2 +
 *   (굴림 버튼)×0~3 + 가능한 empty spacer td.
 *   각 부분은 선택적 (없으면 해당 `<td>` 미emit). legacy-sheet-corpus hardcoding 0.
 *
 * CELL_LAYOUT 필드로 cell 순서/spacer 보존 — round-trip 시 원본의 빈 td 와
 * 자식 배치를 byte-identical 로 복원하기 위해.
 */

import { injectPreservedAttributes } from './preservedAttributes';

export interface SkillRowFields {
  /** `<tr>` 자체의 class. */
  TR_CLASS: string;
  /** `<tr>` 자체의 style. */
  TR_STYLE: string;
  TR_ATTRS: string;

  /** cell 총 갯수 (string 으로 직렬화). */
  CELL_COUNT: string;
  /**
   * cell 별 slot 종류 — comma-separated.
   *   'checkbox' | 'label' | 'input' | 'input2' | 'roll' | 'roll2' | 'roll3' | 'spacer'
   * round-trip 보존 — emit 시 본 순서대로 `<td>` 출력.
   */
  CELL_LAYOUT: string;
  /**
   * cell 별 `<td>` 의 class — '' (SOH) 로 split (',' 이 class 토큰
   * 안에 등장할 수 있으므로 ascii 제어문자로 분리).
   * length === CELL_COUNT.
   */
  CELL_TD_CLASSES: string;
  CELL_TD_ATTRS: string;
  CELL_TD_TEXTS: string;

  /** checkbox slot — HAS_CHECKBOX === 'TRUE' 면 출력. */
  HAS_CHECKBOX: string;
  CHECKBOX_TD_CLASS: string;
  CHECKBOX_NAME: string;
  CHECKBOX_CLASS: string;
  CHECKBOX_VALUE: string;
  CHECKBOX_CHECKED: string;
  CHECKBOX_ATTRS: string;

  /** label slot. */
  HAS_LABEL: string;
  LABEL_TD_CLASS: string;
  I18N_KEY: string;
  LABEL_TEXT: string;
  LABEL_TAG: string;
  LABEL_CLASS: string;
  LABEL_ATTRS: string;

  /** primary input. */
  HAS_INPUT: string;
  INPUT_TD_CLASS: string;
  INPUT_TYPE: string;
  INPUT_NAME: string;
  INPUT_CLASS: string;
  INPUT_VALUE: string;
  INPUT_ATTRS: string;

  /** 2nd input (optional). */
  HAS_INPUT2: string;
  INPUT2_TD_CLASS: string;
  INPUT2_TYPE: string;
  INPUT2_NAME: string;
  INPUT2_CLASS: string;
  INPUT2_VALUE: string;
  INPUT2_ATTRS: string;

  /** primary roll. */
  HAS_ROLL: string;
  ROLL_TD_CLASS: string;
  ROLL_NAME: string;
  ROLL_LABEL: string;
  ROLL_CLASS: string;
  ROLL_EXPR: string;
  ROLL_ATTRS: string;

  /** 2nd roll (legacy-sheet-corpus dual-roll, CoC critical 등). */
  HAS_ROLL2: string;
  ROLL2_TD_CLASS: string;
  ROLL2_NAME: string;
  ROLL2_LABEL: string;
  ROLL2_CLASS: string;
  ROLL2_EXPR: string;
  ROLL2_ATTRS: string;

  /** 3rd roll. */
  HAS_ROLL3: string;
  ROLL3_TD_CLASS: string;
  ROLL3_NAME: string;
  ROLL3_LABEL: string;
  ROLL3_CLASS: string;
  ROLL3_EXPR: string;
  ROLL3_ATTRS: string;
}

export const EMPTY_SKILL_ROW_FIELDS: SkillRowFields = {
  TR_CLASS: '',
  TR_STYLE: '',
  TR_ATTRS: '',
  CELL_COUNT: '0',
  CELL_LAYOUT: '',
  CELL_TD_CLASSES: '',
  CELL_TD_ATTRS: '',
  CELL_TD_TEXTS: '',
  HAS_CHECKBOX: 'FALSE',
  CHECKBOX_TD_CLASS: '',
  CHECKBOX_NAME: '',
  CHECKBOX_CLASS: '',
  CHECKBOX_VALUE: '',
  CHECKBOX_CHECKED: 'FALSE',
  CHECKBOX_ATTRS: '',
  HAS_LABEL: 'FALSE',
  LABEL_TD_CLASS: '',
  I18N_KEY: '',
  LABEL_TEXT: '',
  LABEL_TAG: '',
  LABEL_CLASS: '',
  LABEL_ATTRS: '',
  HAS_INPUT: 'FALSE',
  INPUT_TD_CLASS: '',
  INPUT_TYPE: 'text',
  INPUT_NAME: '',
  INPUT_CLASS: '',
  INPUT_VALUE: '',
  INPUT_ATTRS: '',
  HAS_INPUT2: 'FALSE',
  INPUT2_TD_CLASS: '',
  INPUT2_TYPE: 'text',
  INPUT2_NAME: '',
  INPUT2_CLASS: '',
  INPUT2_VALUE: '',
  INPUT2_ATTRS: '',
  HAS_ROLL: 'FALSE',
  ROLL_TD_CLASS: '',
  ROLL_NAME: '',
  ROLL_LABEL: '',
  ROLL_CLASS: '',
  ROLL_EXPR: '',
  ROLL_ATTRS: '',
  HAS_ROLL2: 'FALSE',
  ROLL2_TD_CLASS: '',
  ROLL2_NAME: '',
  ROLL2_LABEL: '',
  ROLL2_CLASS: '',
  ROLL2_EXPR: '',
  ROLL2_ATTRS: '',
  HAS_ROLL3: 'FALSE',
  ROLL3_TD_CLASS: '',
  ROLL3_NAME: '',
  ROLL3_LABEL: '',
  ROLL3_CLASS: '',
  ROLL3_EXPR: '',
  ROLL3_ATTRS: '',
};

export type CompositeWarn = (
  code: string,
  severity: 'error' | 'warning' | 'info',
  message: string,
) => void;

// ---------- escape ----------

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

function sanitizeAttrName(value: string): string {
  return String(value ?? '').replace(/[^A-Za-z0-9_\-]/g, '');
}

function isTrue(value: string): boolean {
  return String(value ?? '').toUpperCase() === 'TRUE';
}

function withPreservedAttributes(code: string, raw: string): string {
  return injectPreservedAttributes(code, String(raw ?? ''));
}

function tdOpen(cls: string, rawAttrs = ''): string {
  const c = String(cls ?? '').trim();
  const base = c ? `<td class="${escapeAttr(c)}">` : `<td>`;
  return withPreservedAttributes(base, rawAttrs);
}

// ---------- cell renderers ----------

function renderCheckboxInner(f: SkillRowFields, warn: CompositeWarn): string | null {
  const rawName = sanitizeAttrName(f.CHECKBOX_NAME);
  if (!rawName) {
    warn(
      'COMPOSITE_SKILL_ROW_CHECKBOX_NAME_MISSING',
      'warning',
      'r20_skill_row: HAS_CHECKBOX=TRUE 인데 CHECKBOX_NAME 비어 있음 — 체크박스 td 생략.',
    );
    return null;
  }
  const cls = String(f.CHECKBOX_CLASS ?? '').trim();
  const clsAttr = cls ? ` class="${escapeAttr(cls)}"` : '';
  const value = String(f.CHECKBOX_VALUE ?? '');
  const valueAttr = value ? ` value="${escapeAttr(value)}"` : '';
  const checkedAttr = isTrue(f.CHECKBOX_CHECKED) ? ' checked="checked"' : '';
  return withPreservedAttributes(
    `<input type="checkbox" name="${escapeAttr('attr_' + rawName)}"${clsAttr}${valueAttr}${checkedAttr}>`,
    f.CHECKBOX_ATTRS,
  );
}

function renderLabelInner(f: SkillRowFields, _warn: CompositeWarn): string {
  const i18nKey = String(f.I18N_KEY ?? '').trim();
  const labelText = escapeText(f.LABEL_TEXT);
  const labelTag = String(f.LABEL_TAG ?? '').trim();
  const labelCls = String(f.LABEL_CLASS ?? '').trim();

  if (i18nKey && labelTag && labelTag !== 'td') {
    const clsAttr = labelCls ? ` class="${escapeAttr(labelCls)}"` : '';
    return withPreservedAttributes(
      `<${labelTag}${clsAttr} data-i18n="${escapeAttr(i18nKey)}">${labelText}</${labelTag}>`,
      f.LABEL_ATTRS,
    );
  }
  if (i18nKey) {
    // td-direct i18n marker — handled at td level.
    return `__TD_DATA_I18N__${i18nKey}|${labelText}|${labelCls}__`;
  }
  if (labelTag && labelTag !== 'td') {
    const clsAttr = labelCls ? ` class="${escapeAttr(labelCls)}"` : '';
    return withPreservedAttributes(
      `<${labelTag}${clsAttr}>${labelText}</${labelTag}>`,
      f.LABEL_ATTRS,
    );
  }
  // Imported static labels are represented as text fields in the composite
  // contract, but their original inline element still matters for styles and
  // data attributes. Restore the generic span when that metadata is present.
  if (String(f.LABEL_ATTRS ?? '').trim()) {
    const clsAttr = labelCls ? ` class="${escapeAttr(labelCls)}"` : '';
    return withPreservedAttributes(
      `<span${clsAttr}>${labelText}</span>`,
      f.LABEL_ATTRS,
    );
  }
  return withPreservedAttributes(labelText, f.LABEL_ATTRS);
}

function renderInputInner(
  has: string,
  name: string,
  type: string,
  cls: string,
  value: string,
  warnCode: string,
  warn: CompositeWarn,
): string | null {
  if (!isTrue(has)) return null;
  const rawName = sanitizeAttrName(name);
  if (!rawName) {
    warn(warnCode, 'warning', `r20_skill_row: ${warnCode} — input td 생략.`);
    return null;
  }
  const t = String(type ?? '').trim() || 'text';
  const c = String(cls ?? '').trim();
  const clsAttr = c ? ` class="${escapeAttr(c)}"` : '';
  const v = String(value ?? '');
  return `<input${clsAttr} type="${escapeAttr(t)}" name="${escapeAttr('attr_' + rawName)}" value="${escapeAttr(v)}"/>`;
}

function renderRollInner(
  has: string,
  name: string,
  label: string,
  cls: string,
  expr: string,
  warnCode: string,
  warn: CompositeWarn,
): string | null {
  if (!isTrue(has)) return null;
  const rawName = String(name ?? '').trim();
  if (!rawName) {
    warn(warnCode, 'warning', `r20_skill_row: ${warnCode} — roll td 생략.`);
    return null;
  }
  const c = String(cls ?? '').trim();
  const clsAttr = c ? ` class="${escapeAttr(c)}"` : '';
  const labelText = escapeText(label);
  const exprEsc = escapeAttr(expr);
  return `<button type="roll" name="${escapeAttr('roll_' + rawName)}" value="${exprEsc}"${clsAttr}>${labelText}</button>`;
}

/**
 * `<tr>` 한 행 emit — atomic 펼침과 동일 HTML.
 *
 * CELL_LAYOUT 필드의 순서대로 각 cell 의 `<td>` 출력. spacer 는 빈 `<td>`
 * (class 만 보존). slot 별 (checkbox / label / input / roll) 내용은 해당 필드
 * 에서 가져옴.
 *
 * CELL_LAYOUT 비어 있으면 (legacy / new block UI 에서 사용자가 만든 경우)
 * 기본 순서: checkbox + label + input + input2 + roll + roll2 + roll3.
 */
export function renderSkillRowHtml(
  f: SkillRowFields,
  warn: CompositeWarn = () => undefined,
): string {
  const hasAny =
    isTrue(f.HAS_CHECKBOX) ||
    isTrue(f.HAS_LABEL) ||
    isTrue(f.HAS_INPUT) ||
    isTrue(f.HAS_INPUT2) ||
    isTrue(f.HAS_ROLL) ||
    isTrue(f.HAS_ROLL2) ||
    isTrue(f.HAS_ROLL3);
  if (!hasAny) {
    warn(
      'COMPOSITE_SKILL_ROW_EMPTY',
      'warning',
      'r20_skill_row: 모든 슬롯이 비어 있음 — emit 생략.',
    );
    return '';
  }

  const layoutStr = String(f.CELL_LAYOUT ?? '').trim();
  const tdClassesStr = String(f.CELL_TD_CLASSES ?? '');
  const tdAttrsStr = String(f.CELL_TD_ATTRS ?? '');
  const tdTextsStr = String(f.CELL_TD_TEXTS ?? '');
  let layout: string[];
  let tdClasses: string[];
  let tdAttrs: string[];
  let tdTexts: string[];
  if (layoutStr) {
    layout = layoutStr.split(',');
    // \u0001 는 구버전 구분자 호환 (XML 불법 문자라 탭으로 교체됨).
    tdClasses = tdClassesStr.split(/[\t\u0001]/);
    tdAttrs = tdAttrsStr.split(/[\t\u0001]/);
    tdTexts = tdTextsStr.split(/[\t\u0001]/);
  } else {
    // Default order — new-block UI fallback. spacer 안 넣음.
    layout = [];
    if (isTrue(f.HAS_CHECKBOX)) layout.push('checkbox');
    if (isTrue(f.HAS_LABEL)) layout.push('label');
    if (isTrue(f.HAS_INPUT)) layout.push('input');
    if (isTrue(f.HAS_INPUT2)) layout.push('input2');
    if (isTrue(f.HAS_ROLL)) layout.push('roll');
    if (isTrue(f.HAS_ROLL2)) layout.push('roll2');
    if (isTrue(f.HAS_ROLL3)) layout.push('roll3');
    tdClasses = layout.map((slot) => {
      switch (slot) {
        case 'checkbox': return String(f.CHECKBOX_TD_CLASS ?? '');
        case 'label': return String(f.LABEL_TD_CLASS ?? '');
        case 'input': return String(f.INPUT_TD_CLASS ?? '');
        case 'input2': return String(f.INPUT2_TD_CLASS ?? '');
        case 'roll': return String(f.ROLL_TD_CLASS ?? '');
        case 'roll2': return String(f.ROLL2_TD_CLASS ?? '');
        case 'roll3': return String(f.ROLL3_TD_CLASS ?? '');
        default: return '';
      }
    });
    tdAttrs = layout.map(() => '');
    tdTexts = layout.map(() => '');
  }
  // padding so tdClasses[i] always defined.
  while (tdClasses.length < layout.length) tdClasses.push('');
  while (tdAttrs.length < layout.length) tdAttrs.push('');
  while (tdTexts.length < layout.length) tdTexts.push('');

  const cells: string[] = [];
  for (let i = 0; i < layout.length; i++) {
    const slot = layout[i];
    const tdCls = tdClasses[i] ?? '';
    const tdRawAttrs = tdAttrs[i] ?? '';
    switch (slot) {
      case 'checkbox': {
        const inner = renderCheckboxInner(f, warn);
        if (inner == null) cells.push(`${tdOpen(tdCls, tdRawAttrs)}</td>`);
        else cells.push(`${tdOpen(tdCls, tdRawAttrs)}${inner}</td>`);
        break;
      }
      case 'label': {
        const inner = renderLabelInner(f, warn);
        const m = /^__TD_DATA_I18N__([^|]*)\|([\s\S]*?)\|([^_]*)__$/.exec(inner);
        if (m) {
          // td 자체에 data-i18n 부여 — td_class + label_class 결합.
          const labelTdCls = tdCls.trim();
          const labelCls = m[3].trim();
          const fullCls = [labelTdCls, labelCls].filter((s) => s).join(' ');
          const clsAttr = fullCls ? ` class="${escapeAttr(fullCls)}"` : '';
          cells.push(withPreservedAttributes(
            withPreservedAttributes(
              `<td${clsAttr} data-i18n="${escapeAttr(m[1])}">${m[2]}</td>`,
              f.LABEL_ATTRS,
            ),
            tdRawAttrs,
          ));
        } else {
          cells.push(`${tdOpen(tdCls, tdRawAttrs)}${inner}</td>`);
        }
        break;
      }
      case 'input': {
        const inner = renderInputInner(
          f.HAS_INPUT,
          f.INPUT_NAME,
          f.INPUT_TYPE,
          f.INPUT_CLASS,
          f.INPUT_VALUE,
          'COMPOSITE_SKILL_ROW_INPUT_NAME_MISSING',
          warn,
        );
        cells.push(`${tdOpen(tdCls, tdRawAttrs)}${withPreservedAttributes(inner ?? '', f.INPUT_ATTRS)}</td>`);
        break;
      }
      case 'input2': {
        const inner = renderInputInner(
          f.HAS_INPUT2,
          f.INPUT2_NAME,
          f.INPUT2_TYPE,
          f.INPUT2_CLASS,
          f.INPUT2_VALUE,
          'COMPOSITE_SKILL_ROW_INPUT2_NAME_MISSING',
          warn,
        );
        cells.push(`${tdOpen(tdCls, tdRawAttrs)}${withPreservedAttributes(inner ?? '', f.INPUT2_ATTRS)}</td>`);
        break;
      }
      case 'roll': {
        const inner = renderRollInner(
          f.HAS_ROLL,
          f.ROLL_NAME,
          f.ROLL_LABEL,
          f.ROLL_CLASS,
          f.ROLL_EXPR,
          'COMPOSITE_SKILL_ROW_ROLL_NAME_MISSING',
          warn,
        );
        cells.push(`${tdOpen(tdCls, tdRawAttrs)}${withPreservedAttributes(inner ?? '', f.ROLL_ATTRS)}</td>`);
        break;
      }
      case 'roll2': {
        const inner = renderRollInner(
          f.HAS_ROLL2,
          f.ROLL2_NAME,
          f.ROLL2_LABEL,
          f.ROLL2_CLASS,
          f.ROLL2_EXPR,
          'COMPOSITE_SKILL_ROW_ROLL2_NAME_MISSING',
          warn,
        );
        cells.push(`${tdOpen(tdCls, tdRawAttrs)}${withPreservedAttributes(inner ?? '', f.ROLL2_ATTRS)}</td>`);
        break;
      }
      case 'roll3': {
        const inner = renderRollInner(
          f.HAS_ROLL3,
          f.ROLL3_NAME,
          f.ROLL3_LABEL,
          f.ROLL3_CLASS,
          f.ROLL3_EXPR,
          'COMPOSITE_SKILL_ROW_ROLL3_NAME_MISSING',
          warn,
        );
        cells.push(`${tdOpen(tdCls, tdRawAttrs)}${withPreservedAttributes(inner ?? '', f.ROLL3_ATTRS)}</td>`);
        break;
      }
      default:
        // spacer — empty td (class 만 보존).
        cells.push(`${tdOpen(tdCls, tdRawAttrs)}${escapeText(tdTexts[i] ?? '')}</td>`);
        break;
    }
  }

  return wrapTr(cells.join(''), f);
}

function wrapTr(inner: string, f: SkillRowFields): string {
  const cls = String(f.TR_CLASS ?? '').trim();
  const style = String(f.TR_STYLE ?? '').trim();
  const clsAttr = cls ? ` class="${escapeAttr(cls)}"` : '';
  const styleAttr = style ? ` style="${escapeAttr(style)}"` : '';
  return withPreservedAttributes(`<tr${clsAttr}${styleAttr}>${inner}</tr>`, f.TR_ATTRS);
}
