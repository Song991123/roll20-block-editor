/**
 * Pure renderer + types for `r20_repeating_section_wrapper` (Phase 2).
 *
 * Anchor: docs/spec/26_composite_blocks.md §6 (Phase 2).
 *
 * Blockly 의존 0 — composite_repeating_section_wrapper.ts (Blockly init/field
 * 정의) 와 composite_matcher.ts (import packing) 양쪽이 본 모듈만 import 한다.
 *
 * 일반화 — 거의 모든 시스템 (Roll20 표준 idiom):
 *   `<fieldset class="repeating_X" name="repeating_X">`
 *     (선택) `<thead><tr><th>...</th>...</tr></thead>`
 *     [children — 자식 행]
 *   `</fieldset>`
 *
 * 자식 행은 emit 시 외부에서 statement 로 들어옴 — body 파라미터로 받는다.
 * 시스템 specific 토큰 0. 영시영 hardcoding 0.
 */

export interface RepeatingSectionWrapperFields {
  /** repeating_X 의 X — 'inventory' / 'skills' / 'spells' 등. */
  SECTION_NAME: string;
  /** fieldset 의 추가 class (repeating_X 이외 — 보통 공백). */
  FIELDSET_CLASS: string;
  /** fieldset 자체의 style. */
  FIELDSET_STYLE: string;

  /** thead 가 있는가. 'TRUE' / 'FALSE'. */
  HAS_HEADER: string;
  /** thead 의 class. */
  HEADER_THEAD_CLASS: string;
  /** thead 안의 tr class. */
  HEADER_TR_CLASS: string;
  /**
   * 헤더 컬럼 list — 1 줄에 1 컬럼.
   * 포맷: `i18n_key|text|th_class` (각 필드 선택, '|' 로 분리).
   *   - i18n_key: 비면 data-i18n 미emit
   *   - text: th 안의 표시 텍스트 (escape 적용)
   *   - th_class: 비면 class 미emit
   */
  COLUMNS: string;
}

export const EMPTY_REPEATING_SECTION_WRAPPER_FIELDS: RepeatingSectionWrapperFields = {
  SECTION_NAME: '',
  FIELDSET_CLASS: '',
  FIELDSET_STYLE: '',
  HAS_HEADER: 'FALSE',
  HEADER_THEAD_CLASS: '',
  HEADER_TR_CLASS: '',
  COLUMNS: '',
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

function isTrue(value: string): boolean {
  return String(value ?? '').toUpperCase() === 'TRUE';
}

function sanitizeSectionName(value: string): string {
  // Roll20 의 repeating section name 규칙: [a-zA-Z0-9_]+ 만 허용 (-, : 등은 깎음).
  return String(value ?? '').replace(/[^A-Za-z0-9_]/g, '');
}

export interface ParsedColumn {
  i18nKey: string;
  text: string;
  thClass: string;
}

export function parseColumns(raw: string): ParsedColumn[] {
  return String(raw ?? '')
    .split(/\r?\n/)
    .map((line) => line)
    .filter((line) => line.length > 0)
    .map((line) => {
      const parts = line.split('|');
      return {
        i18nKey: (parts[0] ?? '').trim(),
        text: parts[1] ?? '',
        thClass: (parts[2] ?? '').trim(),
      };
    });
}

/**
 * `<fieldset class="repeating_X" name="repeating_X">` + optional thead 까지의
 * shell HTML emit. body (자식 행) 는 외부에서 statement 로 들어와 join 됨.
 */
export function renderRepeatingSectionWrapperHtml(
  f: RepeatingSectionWrapperFields,
  body: string,
  warn: CompositeWarn = () => undefined,
): string {
  const section = sanitizeSectionName(f.SECTION_NAME);
  if (!section) {
    warn(
      'COMPOSITE_REPEATING_WRAPPER_NAME_MISSING',
      'warning',
      'r20_repeating_section_wrapper: SECTION_NAME 비어 있음 — emit 생략.',
    );
    return '';
  }
  const repeatingCls = `repeating_${section}`;
  const extraCls = String(f.FIELDSET_CLASS ?? '').trim();
  const fieldsetCls = extraCls
    ? `${repeatingCls} ${extraCls}`
    : repeatingCls;
  const style = String(f.FIELDSET_STYLE ?? '').trim();
  const styleAttr = style ? ` style="${escapeAttr(style)}"` : '';
  const open =
    `<fieldset class="${escapeAttr(fieldsetCls)}" name="${escapeAttr(repeatingCls)}"${styleAttr}>`;

  const parts: string[] = [open];

  if (isTrue(f.HAS_HEADER)) {
    const theadCls = String(f.HEADER_THEAD_CLASS ?? '').trim();
    const theadClsAttr = theadCls ? ` class="${escapeAttr(theadCls)}"` : '';
    const trCls = String(f.HEADER_TR_CLASS ?? '').trim();
    const trClsAttr = trCls ? ` class="${escapeAttr(trCls)}"` : '';
    const cols = parseColumns(f.COLUMNS);
    if (cols.length === 0) {
      warn(
        'COMPOSITE_REPEATING_WRAPPER_HEADER_EMPTY',
        'info',
        'r20_repeating_section_wrapper: HAS_HEADER=TRUE 인데 COLUMNS 비어 있음 — 빈 thead emit.',
      );
    }
    const ths = cols
      .map((c) => {
        const cls = c.thClass ? ` class="${escapeAttr(c.thClass)}"` : '';
        if (c.i18nKey) {
          return `<th${cls} data-i18n="${escapeAttr(c.i18nKey)}">${escapeText(c.text)}</th>`;
        }
        return `<th${cls}>${escapeText(c.text)}</th>`;
      })
      .join('');
    parts.push(`<thead${theadClsAttr}><tr${trClsAttr}>${ths}</tr></thead>`);
  }

  if (body && body.length > 0) {
    parts.push(body);
  }
  parts.push(`</fieldset>`);
  return parts.join('');
}
