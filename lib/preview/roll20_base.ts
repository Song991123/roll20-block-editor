/**
 * roll20_base.ts — Roll20 sandbox CSS 의 합성 헬퍼.
 *
 * `roll20_base_inline.ts` 의 raw CSS string 들을:
 *   - iframe srcdoc 용 — 변환 없이 그대로 (html / body 가 실 element 이므로 매칭 OK).
 *   - Shadow DOM 용 — `:root` → `:host` rewrite (CSS variable cascade 보존).
 *     `html` / `body` 는 wrapper element 가 흉내내므로 그대로 (shadowMount 가
 *     `<body class="charsheet">` 로 래핑).
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
 * iframe srcdoc 모드 — 실 Roll20 sandbox CSS 를 변환 없이 그대로 직렬화.
 * 순서: base (normalize+bootstrap+grimoire vars) → charactersheet → jquery.
 * dark mode 는 별도 — 호출자가 darkMode flag 따라 추가 inject.
 */
export const roll20BaseIframeCss = [
  roll20BaseCss,
  roll20CharsheetCss,
  roll20JqueryCss,
].join('\n');

/**
 * Shadow DOM 모드 — `:root` 를 `:host` 로 rewrite 해 CSS variable 정의가
 * shadow tree 안 후손에게 cascade 되도록.
 *
 * html / body 는 rewrite X — shadowMount 가 `<body class="charsheet">` 로 user
 * HTML 을 래핑하므로 body 셀렉터는 정상 매칭. html 셀렉터는 매칭 안 됨 (의도
 * 적 — Shadow 안에 <html> 노드 없음) 이지만 html 룰은 대부분 normalize 의
 * font-family 한 줄이라 body 룰로 cover 됨.
 *
 * 추가 변환:
 *   - `html[data-theme="X"]` → `:host([data-theme="X"]), [data-theme="X"]`
 *     dark mode 토글이 host 에 박혀도 / wrapper 에 박혀도 둘 다 매칭.
 *
 * 주의: 정규식 기반 — perfect CSS parser 아님. edge case 는 first-pass 만 처리.
 *   base.css 의 실제 `:root` / `html` 사용은 대부분 standalone selector 라 안전.
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
  // `html input[disabled]` 같은 descendant 결합자는 그대로 두고 매칭 실패 허용.
  out = out.replace(/(^|[\s,{])html(\s*[,{])/g, '$1:host$2');
  return out;
}

/** Shadow DOM 모드 합성본. */
export const roll20BaseShadowCss = [
  rewriteForShadow(roll20BaseCss),
  rewriteForShadow(roll20CharsheetCss),
  rewriteForShadow(roll20JqueryCss),
].join('\n');

/**
 * Dark mode — iframe / shadow 공용. Shadow 용은 마찬가지로 :root / html 변환만
 * 적용. 호출자가 darkMode === true 일 때만 inject.
 */
export const roll20DarkmodeIframeCss = roll20DarkmodeCss;
export const roll20DarkmodeShadowCss = rewriteForShadow(roll20DarkmodeCss);
