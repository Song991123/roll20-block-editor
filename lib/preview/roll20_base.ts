/**
 * roll20_base.ts — Roll20 sandbox CSS 의 합성 헬퍼.
 *
 * `roll20_base_inline.ts` 의 raw CSS string 들을:
 *   - iframe srcdoc 용 — `.ui-dialog ` prefix 제거만 적용.
 *   - Shadow DOM 용 — `:root` → `:host` rewrite + `.ui-dialog ` prefix 제거.
 *
 * 두 모드 공통 변환 (.ui-dialog prefix 제거):
 *   charactersheet.css 의 모든 시트 룰은 `.ui-dialog .charsheet …` 형태 (Roll20
 *   sandbox 가 character dialog 안에 시트를 띄우는 컨텍스트 가정). 우리 wrapper
 *   는 `.ui-dialog` 없이 `.charsheet` 만 박으므로 prefix 제거하면 매칭 정상화.
 *   `.ui-dialog` 단독 룰 (jquery.css 의 position:absolute/width:300px) 은 영향 X
 *   — 자기 자신만 셀렉팅하므로 wrapper 에 안 박힘.
 *
 * Anchor: docs/spec/25_roll20_baseline.md §3.
 *
 * 시스템 specific 0.
 */

import {
  roll20BaseCss,
  roll20VttCss,
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
 *   `.ui-dialog.foo` → 그대로 (compound 셀렉터는 별도 처리 안 함)
 *
 * comma-separated 셀렉터 list 의 각 chunk 의 시작 부분만 처리.
 */
function stripUiDialogPrefix(css: string): string {
  // (시작 또는 콤마 이후) 공백 후 `.ui-dialog` 다음에 공백/탭 prefix 제거.
  // `.ui-dialog,` (자기 자신만) / `.ui-dialog.foo` (compound) / `.ui-dialog{` 영향 X.
  return css.replace(/(^|,)(\s*)\.ui-dialog(\s+)/g, '$1$2');
}

/**
 * Shadow DOM 모드 — `:root` 를 `:host` 로 rewrite + `.ui-dialog` prefix 제거.
 */
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
 * iframe srcdoc 모드 — Roll20 dialog wrapper 를 함께 렌더하므로 raw selector 보존.
 * `.ui-dialog .charsheet`, `.sheetform`, `.charactersheet`, `.largedialog`
 * selectors must match the same wrapper structure Roll20 uses.
 */
export const roll20BaseIframeCss = [
  roll20BaseCss,
  roll20VttCss,
  roll20CharsheetCss,
  roll20JqueryCss,
].join('\n');

/** Shadow DOM 모드 합성본. */
export const roll20BaseShadowCss = [
  rewriteForShadow(roll20BaseCss),
  rewriteForShadow(roll20VttCss),
  rewriteForShadow(roll20CharsheetCss),
  rewriteForShadow(roll20JqueryCss),
].join('\n');

/** Dark mode — iframe / shadow 공용. */
export const roll20DarkmodeIframeCss = roll20DarkmodeCss;
export const roll20DarkmodeShadowCss = rewriteForShadow(roll20DarkmodeCss);
