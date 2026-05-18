/**
 * roll20_base.ts — Roll20 sandbox CSS 의 합성 헬퍼.
 *
 * `roll20_base_inline.ts` 의 raw CSS string 들을:
 *   - iframe srcdoc 용 — 변환 후 그대로.
 *   - Shadow DOM 용 — `:root` → `:host` rewrite.
 *
 * 두 모드 공통 변환:
 *   - `.ui-dialog ` 조상 prefix 제거 — Shadow / iframe wrapper 모두
 *     `.ui-dialog` 가 존재하지 않으므로 (jQuery UI Dialog 의 position:absolute
 *     /width:300px 이 wrapper 에 적용되면 안 됨), descendant 셀렉터의
 *     `.ui-dialog ` prefix 를 지워 `.charsheet …` 로 만든다. 이로써 charactersheet.css
 *     의 모든 룰 (예: `.ui-dialog .charsheet button[type=roll]:before { font-family:
 *     "dicefontd20"; content: "t" }`) 이 매칭된다.
 *
 * Anchor: docs/spec/25_roll20_baseline.md §3 (주입 순서) + isolation 섹션.
 *
 * 시스템 specific 0.
 */

import {
  roll20BaseCss,
  roll20CharsheetCss,
  roll20JqueryCss,
  roll20DarkmodeCss,
} from './roll20_base_inline';

/**
 * descendant prefix `.ui-dialog ` 제거.
 *
 * 예:
 *   `.ui-dialog .charsheet button` → `.charsheet button`
 *   `.ui-dialog, .other` → 그대로 (단독 `.ui-dialog` 룰은 매칭 안 됨 — 영향 없음)
 *   `.ui-dialog.foo` → 그대로 (붙어 있는 compound 셀렉터는 별도 처리 안 함)
 *
 * comma-separated 셀렉터 list 의 각 chunk 의 시작 부분만 처리.
 */
function stripUiDialogPrefix(css: string): string {
  // (시작 또는 콤마 이후) 공백 후 `.ui-dialog ` (공백) 또는 `.ui-dialog\t` 의 prefix 제거.
  // `.ui-dialog,` (자기 자신만) / `.ui-dialog.foo` (compound) / `.ui-dialog{` (룰 시작) 은 영향 X.
  return css.replace(/(^|,)(\s*)\.ui-dialog(\s+)/g, '$1$2');
}

function rewriteForShadow(css: string): string {
  let out = css;
  // `html[data-theme="X"]` → `:host([data-theme="X"]), [data-theme="X"]`
  out = out.replace(
    /(^|[\s,{])html\[data-theme=("[^"]+")\]/g,
    '$1:host([data-theme=$2]), [data-theme=$2]',
  );
  // `:root` → `:host` (selector boundary 인 경우만)
  out = out.replace(/(^|[\s,{])(:root)\b/g, '$1:host');
  // Standalone `html` selector (followed by `{` or `,`) → `:host`.
  out = out.replace(/(^|[\s,{])html(\s*[,{])/g, '$1:host$2');
  // `.ui-dialog ` prefix 제거 — Shadow wrapper 가 `.ui-dialog` 없으므로.
  out = stripUiDialogPrefix(out);
  return out;
}

/**
 * iframe srcdoc 모드 — `.ui-dialog ` prefix 제거만 적용.
 * iframe wrapper 도 `.ui-dialog` 없이 `<div class="charsheet">` 만 박으므로 동일 변환.
 */
export const roll20BaseIframeCss = [
  stripUiDialogPrefix(roll20BaseCss),
  stripUiDialogPrefix(roll20CharsheetCss),
  stripUiDialogPrefix(roll20JqueryCss),
].join('\n');

/** Shadow DOM 모드 합성본. */
export const roll20BaseShadowCss = [
  rewriteForShadow(roll20BaseCss),
  rewriteForShadow(roll20CharsheetCss),
  rewriteForShadow(roll20JqueryCss),
].join('\n');

/** Dark mode — iframe / shadow 공용. */
export const roll20DarkmodeIframeCss = stripUiDialogPrefix(roll20DarkmodeCss);
export const roll20DarkmodeShadowCss = rewriteForShadow(roll20DarkmodeCss);
