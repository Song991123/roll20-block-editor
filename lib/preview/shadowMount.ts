/**
 * shadowMount — emit 결과 (html, css) 를 host element 의 Shadow DOM 으로
 * 박는 헬퍼. Phase A — iframe 동일성 보장 (시각 only, 인터랙션 phase B+).
 *
 * Anchor: docs/spec/21_wysiwyg_unified.md (옵션 D Shadow DOM 채택)
 *
 * 설계 메모:
 *   - shadow root 는 host 당 한번만 attach 가능 → 동일 host 재mount 시 innerHTML
 *     reset 으로 재사용.
 *   - `:host { all: initial }` 로 outer page CSS bleed 차단.
 *   - `contain: layout style` — Shadow 안 reflow 가 outer layout 에 안 새도록.
 *   - runtimeCss + layerFilterCss + user css 는 호출자가 합쳐서 css 인자로 박음
 *     (buildSheetParts 가 합성).
 *
 * 시스템 specific 0.
 */

export interface ShadowMountOptions {
  /** 박을 user HTML — 이미 autoPrefix 처리된 상태 가정. */
  html: string;
  /** runtimeCss + layerCss + userCss 합성본. */
  css: string;
  /** body 에 박을 data-layer 값 (Shadow 안에서는 wrapper div 에 박음). */
  layer?: string;
  /** dark mode 토큰. */
  darkMode?: boolean;
}

export interface ShadowMountResult {
  shadow: ShadowRoot;
  /** Shadow 내부 모두 비움. */
  cleanup: () => void;
}

/**
 * host element 의 Shadow Root 에 user 시트를 박는다.
 *
 * - 이미 shadowRoot 있으면 재사용 (re-attach 불가)
 * - 항상 innerHTML reset 후 새 style + container 박음
 */
export function mountSheetShadow(
  host: HTMLElement,
  opts: ShadowMountOptions,
): ShadowMountResult {
  let shadow = host.shadowRoot;
  if (!shadow) {
    shadow = host.attachShadow({ mode: 'open' });
  }
  // reset
  shadow.innerHTML = '';

  const styleEl = document.createElement('style');
  // :host reset — outer page CSS 가 새지 않게.
  // contain: layout style — Shadow 안 reflow 가 outer 에 안 새도록.
  styleEl.textContent = `
:host {
  all: initial;
  display: block;
  width: 100%;
  height: 100%;
  contain: layout style;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #1f2328;
  background: #fff;
}
:host([data-theme="dark"]) {
  color: #e6edf3;
  background: #0d1117;
}
:host *, :host *::before, :host *::after { box-sizing: border-box; }
${opts.css}
`;
  shadow.appendChild(styleEl);

  const container = document.createElement('div');
  container.className = 'charsheet';
  container.setAttribute('data-layer', opts.layer ?? 'all');
  if (opts.darkMode) {
    container.setAttribute('data-theme', 'dark');
    host.setAttribute('data-theme', 'dark');
  } else {
    host.removeAttribute('data-theme');
  }
  container.innerHTML = opts.html;
  shadow.appendChild(container);

  return {
    shadow,
    cleanup: () => {
      if (shadow) shadow.innerHTML = '';
    },
  };
}
