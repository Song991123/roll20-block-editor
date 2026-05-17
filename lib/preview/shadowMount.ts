/**
 * shadowMount — emit 결과 (html, css) 를 host element 의 Shadow DOM 으로
 * 박는 헬퍼. Phase A — iframe 동일성 보장 (시각 only).
 *
 * Phase B (이 commit):
 *   - Shadow 안 click delegation → `data-r20-block-id` 가진 가장 가까운 ancestor
 *     찾아서 `onSelect(blockId)` 호출.
 *   - 반환 객체에 `setSelected(blockId | null)` 추가 — 외부 selectedBlockId 변경
 *     시 동기적으로 outline 토글 (모든 `.r20-selected` 제거 → 새 element 부착).
 *
 * Anchor: docs/spec/17_wysiwyg_mode.md §12 (Phase B / 양방향 sync full).
 *
 * 설계 메모:
 *   - shadow root 는 host 당 한번만 attach 가능 → 동일 host 재mount 시 innerHTML
 *     reset 으로 재사용.
 *   - `:host { all: initial }` 로 outer page CSS bleed 차단.
 *   - `contain: layout style` — Shadow 안 reflow 가 outer layout 에 안 새도록.
 *   - runtimeCss + layerFilterCss + user css 는 호출자가 합쳐서 css 인자로 박음
 *     (buildSheetParts 가 합성).
 *   - click handler 는 capture phase 가 아닌 bubble phase — input/button 의 native
 *     change 가 발생한 후 select 처리되어 자연스러움. preventDefault 는 form submit
 *     같은 navigation 방지용 (좁게).
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
  /**
   * Shadow 안 element 가 클릭됐을 때 호출. ancestor 검색으로 가장 가까운
   * `[data-r20-block-id]` element 의 id 를 넘긴다. 없으면 호출 안 됨.
   * Phase B — workspaceStore.setSelectedBlockId 와 연결.
   */
  onSelect?: (blockId: string) => void;
}

export interface ShadowMountResult {
  shadow: ShadowRoot;
  /** Shadow 내부 모두 비움 + listener 제거. */
  cleanup: () => void;
  /**
   * 외부 selection 변경 → Shadow 안 outline 동기화.
   * 모든 `.r20-selected` 제거 후 해당 blockId element 에 부착.
   * blockId === null → outline 모두 해제.
   */
  setSelected: (blockId: string | null) => void;
}

/**
 * host element 의 Shadow Root 에 user 시트를 박는다.
 *
 * - 이미 shadowRoot 있으면 재사용 (re-attach 불가)
 * - 항상 innerHTML reset 후 새 style + container 박음
 * - click listener 는 매 mount 마다 새로 등록 (innerHTML reset 시 자동 제거 안 됨
 *   → cleanup 에서 removeEventListener 호출)
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
  // .r20-selected — Phase B 선택 outline (orange #f60 + 2px offset).
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
[data-r20-block-id].r20-selected {
  outline: 2px solid #f60;
  outline-offset: 2px;
}
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

  // Phase B — click delegation.
  // ShadowRoot 은 EventTarget — click 은 bubble phase 에서 shadow root 가 받음.
  // closest('[data-r20-block-id]') 로 ancestor 검색.
  // preventDefault — form submit / a navigation 차단 (편집 모드의 의도).
  // stopPropagation 은 일부러 안 함 (Shadow 밖으로 click 새는 일이 없음, 그리고
  // 다른 외부 listener 가 필요할 수도).
  const onClick = (e: Event) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const el = target.closest('[data-r20-block-id]') as HTMLElement | null;
    if (!el) return;
    const blockId = el.dataset.r20BlockId;
    if (!blockId) return;
    e.preventDefault();
    opts.onSelect?.(blockId);
  };
  shadow.addEventListener('click', onClick);

  const setSelected = (blockId: string | null) => {
    if (!shadow) return;
    // clear all
    const prev = shadow.querySelectorAll<HTMLElement>('[data-r20-block-id].r20-selected');
    prev.forEach((el) => el.classList.remove('r20-selected'));
    if (blockId == null) return;
    // CSS escape — blockId 는 Blockly id (영숫자 + 약간의 special) 인데 그래도
    // attribute selector 에서 quoting + escape 안전하게.
    const escaped = (typeof CSS !== 'undefined' && CSS.escape)
      ? CSS.escape(blockId)
      : blockId.replace(/(["\\])/g, '\\$1');
    const target = shadow.querySelector<HTMLElement>(
      `[data-r20-block-id="${escaped}"]`,
    );
    if (target) target.classList.add('r20-selected');
  };

  return {
    shadow,
    cleanup: () => {
      if (shadow) {
        shadow.removeEventListener('click', onClick);
        shadow.innerHTML = '';
      }
    },
    setSelected,
  };
}
