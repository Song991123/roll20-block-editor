/**
 * STYLE 필드 공통 헬퍼 — 모든 HTML emit 블록에 inline `style="..."` 보존.
 *
 * Anchor:
 *   - docs/validation/verify/yshy_1bu_structural.md §4.3 (style 607 전건 100% 손실)
 *   - docs/spec/12_roll20_output_spec.md §2 (HTML emit contract — generic attr)
 *
 * 배경:
 *   영시영 1부 측정 결과 inline `style` 속성 607 건이 100% drop — 표 셀 폭/색,
 *   display:none 토글 컨트롤, font-weight 등 시각 정보 전건 손실. 모든 시트
 *   (D&D 5e / PbtA / 영시영) 공통 패턴이므로 시스템 specific 가 아닌 generic
 *   필드로 모든 visual 블록에 STYLE 필드 추가.
 *
 * 본 모듈은 두 함수만 노출 — 카탈로그 블록 generator 가 동일 규약으로 emit:
 *   1. `addStyleField(input)` — Blockly init 의 appendDummyInput() 에 STYLE
 *      필드를 부착 (label "스타일" + FieldTextInput).
 *   2. `styleAttr(value)` — generator 가 받은 STYLE 값을 ` style="..."` 문자열로
 *      변환. 비면 빈 문자열 (no-op — `style=""` 출력 금지).
 *
 * 시스템 specific 토큰 0. 영시영 hardcoding 0 — 모든 시트 호환 generic.
 */

import * as Blockly from 'blockly';

/** HTML attribute value escape — 다른 블록 파일의 escapeAttr 와 동일 규약. */
function escapeAttr(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Blockly init 의 dummy input 에 STYLE 필드를 추가.
 *
 * 사용 패턴:
 *   b.appendDummyInput()
 *     .appendField('스타일')
 *     .appendField(new Blockly.FieldTextInput(''), 'STYLE');
 *
 * 혹은 helper:
 *   appendStyleField(b);
 *
 * 두 사용 모두 동일 규약. 본 helper 는 후자 단축형.
 */
export function appendStyleField(b: Blockly.Block): void {
  b.appendDummyInput()
    .appendField('스타일')
    .appendField(new Blockly.FieldTextInput(''), 'STYLE');
}

/**
 * STYLE 필드 값을 emit-ready 문자열로 변환.
 *
 *   styleAttr('')                  → ''           (no-op, `style=""` 안 출력)
 *   styleAttr('   ')               → ''           (whitespace-only 도 no-op)
 *   styleAttr('width:60px')        → ' style="width:60px"'
 *   styleAttr('color:"red"')       → ' style="color:&quot;red&quot;"'  (escape)
 *
 * 사용 패턴 (generator 안):
 *   const style = String(b.getFieldValue('STYLE') ?? '');
 *   return `<div${classAttr(cls)}${styleAttr(style)}>...</div>`;
 *
 * 절대 위치 / display:none / width / color / font-weight 등 시각 정보 보존.
 */
export function styleAttr(value: string): string {
  const v = String(value ?? '').trim();
  if (!v) return '';
  return ` style="${escapeAttr(v)}"`;
}

/**
 * 사용자 STYLE + generator 자체 inline style (예: r20_grid 의
 * `grid-template-columns:repeat(N,1fr)`) 을 병합 — 둘 다 있을 때 한 attribute 로.
 *
 *   mergeStyle('', 'grid-template-columns:repeat(2,1fr)')
 *     → ' style="grid-template-columns:repeat(2,1fr)"'
 *   mergeStyle('color:red', 'grid-template-columns:repeat(2,1fr)')
 *     → ' style="grid-template-columns:repeat(2,1fr); color:red"'
 *     (built-in 이 먼저 — 사용자 STYLE 가 cascade 로 override)
 *   mergeStyle('color:red', '')
 *     → ' style="color:red"'
 *   mergeStyle('', '')
 *     → ''
 */
export function mergeStyle(userStyle: string, builtinStyle: string): string {
  const user = String(userStyle ?? '').trim().replace(/;\s*$/, '');
  const built = String(builtinStyle ?? '').trim().replace(/;\s*$/, '');
  if (!user && !built) return '';
  if (!user) return ` style="${escapeAttr(built)}"`;
  if (!built) return ` style="${escapeAttr(user)}"`;
  return ` style="${escapeAttr(`${built}; ${user}`)}"`;
}
