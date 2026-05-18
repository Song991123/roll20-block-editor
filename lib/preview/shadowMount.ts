/**
 * shadowMount — emit 결과 (html, css) 를 host element 의 Shadow DOM 으로
 * 박는 헬퍼. Phase A — iframe 동일성 보장 (시각 only).
 *
 * Phase B:
 *   - Shadow 안 click delegation → `data-r20-block-id` 가진 가장 가까운 ancestor
 *     찾아서 `onSelect(blockId)` 호출.
 *   - 반환 객체에 `setSelected(blockId | null)` 추가 — 외부 selectedBlockId 변경
 *     시 동기적으로 outline 토글 (모든 `.r20-selected` 제거 → 새 element 부착).
 *
 * Phase C (이 commit) — drag-to-move:
 *   - pointerdown 으로 가장 가까운 `[data-r20-block-id]` ancestor 식별 → drag state
 *     기록 + setPointerCapture → cursor: grabbing.
 *   - pointermove → 매 frame onDragMove(dx, dy) (viewport px). zoom scale 변환은
 *     호출자 (PreviewMain) 에서 host getBoundingClientRect 로 계산.
 *   - pointerup / pointercancel → onDragEnd. drag threshold (3px) 미만 시 click
 *     으로 간주, onSelect 호출만 + onDragEnd 호출 안 함.
 *   - native form 요소 (input/textarea/select/button) 위에서는 drag 시작 안 함
 *     — focus / typing 보존, onSelect 만 호출.
 *
 * Phase D (이 commit) — inline text 편집:
 *   - dblclick → 가장 가까운 `[data-r20-block-id]` ancestor 찾고, target 이 텍스트
 *     노드를 가진 element 면 그 element 자체, 아니면 blockEl 을 contentEditable 로
 *     swap. 전체 선택 후 focus.
 *   - blur 시 contentEditable=false 로 되돌리고, 변경된 텍스트면 onEditText(id, val)
 *     호출 → 호출자가 setBlockField 로 commit.
 *   - editing 중인 element 는 `.r20-editing` 클래스 부여 — green dashed outline 시각
 *     피드백. blur 시 제거.
 *   - input/textarea/select 같은 native form 위에선 dblclick 무시 — native 동작
 *     (단어 선택 등) 보존. drag 시작도 마찬가지로 차단됨 (Phase C 룰).
 *   - editing 중에는 pointerdown drag 시작 안 함 (editingState 검사) — 텍스트 박스
 *     안에서 마우스 selection 이 자연스럽게.
 *
 * Anchor: docs/spec/17_wysiwyg_mode.md §12 (Phase B / Phase C / Phase D).
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
 *   - drag 시작 후엔 click 이벤트가 자연 발화 — drag 동안 click 무시 (suppressClick
 *     플래그) 해서 onSelect 가 중복 호출되지 않게.
 *
 * 시스템 specific 0.
 */

/** Drag threshold — pointerdown 이후 이만큼 움직여야 drag 으로 간주 (px). */
const DRAG_THRESHOLD_PX = 3;

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
  /**
   * Phase C — drag 시작 (threshold 초과 직후). dragStart 후엔 onSelect 가
   * 호출되지 않음 — drag 중 click 이벤트는 suppress.
   */
  onDragStart?: (blockId: string, clientX: number, clientY: number) => void;
  /**
   * Phase C — drag 이동. dx/dy 는 dragStart 시점부터의 viewport px delta.
   * zoom scale 변환은 호출자에서 host.getBoundingClientRect() 비례로 처리.
   */
  onDragMove?: (
    blockId: string,
    dx: number,
    dy: number,
    clientX: number,
    clientY: number,
  ) => void;
  /**
   * Phase C — drag 종료. drop 위치는 호출자가 onDragMove 의 마지막 dx/dy
   * 를 누적해서 사용. drag 시작 안 됐으면 (threshold 미만) 호출 안 됨.
   */
  onDragEnd?: (blockId: string) => void;
  /**
   * Phase D — inline text 편집 완료. dblclick → contentEditable → blur 시 호출.
   * newText 는 element.innerText.trim() — 호출자가 trim 한번 더 해도 무해.
   * 호출자는 보통 adapter.setBlockField(blockId, 'TEXT' | 'LABEL' | ..., newText).
   * 텍스트 변경이 없으면 호출 안 됨 (orig === newText).
   */
  onEditText?: (blockId: string, newText: string) => void;
  /**
   * Phase E — Shadow 안 element 우클릭 (contextmenu).
   * 가장 가까운 `[data-r20-block-id]` ancestor 찾고 그 id 와 (clientX, clientY)
   * 를 호출자에 전달. preventDefault() 가 호출되어 native 메뉴는 안 뜸.
   * form element (input/textarea/select/button/option/label) 위 우클릭도
   * 동일하게 Shadow 메뉴를 띄움 — 사용자 멘탈 모델 (블록 단위 조작) 유지.
   * 호출자는 ShadowContextMenu 컴포넌트를 (x, y) 에 띄우는 책임.
   */
  onContextMenu?: (blockId: string, x: number, y: number) => void;
}

export interface ShadowMountResult {
  shadow: ShadowRoot;
  /** Shadow 내부 모두 비움 + listener 제거. */
  cleanup: () => void;
  /**
   * 외부 selection 변경 → Shadow 안 outline 동기화.
   * 모든 `.r20-selected` 제거 후 해당 blockId element 에 부착.
   * blockId === null → outline 모두 해제.
   *
   * Phase F (spec 17 §13) — `opts.scrollIntoView` 가 true 이면 element 가
   * viewport 밖이면 `scrollIntoView({behavior:'smooth', block:'center'})`
   * 호출. tree → preview sync 시 사용 (preview 안에서 클릭 origin 은 이미
   * viewport 안이므로 호출자가 false 로 막음).
   */
  setSelected: (blockId: string | null, opts?: { scrollIntoView?: boolean }) => void;
  /**
   * Phase F (spec 17 §13) — partial re-render 후보 API.
   * 특정 blockId 의 element 만 `outerHTML` 로 교체. element 없으면 false 반환
   * (호출자가 full re-mount fallback). 다른 element 의 DOM 노드 / selection /
   * scroll position / contentEditable state 는 보존.
   *
   * **현재는 호출자 (PreviewMain) 에서 wire 안 됨** — emit 단위 diff 가 없어
   * 어느 blockId 가 바뀌었는지 추적 필요. follow-up backlog.
   */
  updateBlock: (blockId: string, newOuterHtml: string) => boolean;
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
  // .r20-dragging — Phase C drag 중 cursor: grabbing + 약한 opacity 로 시각 피드백.
  styleEl.textContent = `
:host {
  /* all: initial — outer page 의 Tailwind / shadcn / global utility 룰이
     host 자체에 박는 색/폰트/박스 모델 등 모든 상속 가능 속성을 reset.
     이 reset 후엔 아래 explicit 한 fallback 만 남는다.
     shadow 안 element 는 host 의 inheritable 속성 (font-family, color, ...)
     을 상속하지만, body.charsheet 가 곧 자체 font/color 를 baseline 으로부터
     얻으므로 host 의 fallback 은 body{} 룰이 안 매칭됐을 때만 보임. */
  all: initial;
  display: block;
  width: 100%;
  height: 100%;
  contain: layout style;
  /* Roll20 baseline 과 동일 폰트/색조 — body{} 룰이 안 박힌 경우의 fallback. */
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 14px;
  line-height: 1.42857143;
  color: #333;
  background: #fff;
}
:host([data-theme="dark"]) {
  /* Roll20 dark mode 의 대표 색조 — editor-darkmode.css 가 매칭 안 된 경우의 fallback. */
  color: #e6e6e6;
  background: #1f1f1f;
}
:host([data-r20-dragging]) {
  cursor: grabbing !important;
}
:host([data-r20-dragging]) * {
  cursor: grabbing !important;
  user-select: none !important;
}
:host *, :host *::before, :host *::after { box-sizing: border-box; }
[data-r20-block-id].r20-selected {
  outline: 2px solid #f60;
  outline-offset: 2px;
}
[data-r20-block-id].r20-dragging {
  opacity: 0.7;
  outline: 2px dashed #f60;
  outline-offset: 2px;
}
[data-r20-block-id] .r20-editing,
[data-r20-block-id].r20-editing {
  outline: 2px dashed #16a34a;
  outline-offset: 2px;
  background: rgba(22, 163, 74, 0.06);
  cursor: text !important;
}
${opts.css}
`;
  shadow.appendChild(styleEl);

  // spec 25 + isolation fix — wrapper 를 <body class="charsheet"> 로 만들어
  // Roll20 base.css 의 body{} 룰이 정상 매칭되도록. createElement('body') 는
  // HTMLBodyElement 를 반환하지만 shadow 안에서는 일반 flow content 로 동작.
  const container = document.createElement('body');
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
  //
  // Phase C — drag 중에는 click suppress (suppressClickRef.value === true).
  // pointerup 직후 click 이 자연 발화하므로, 다음 task 까지 무시.
  let suppressClick = false;
  const onClick = (e: Event) => {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
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

  // Phase C — pointer drag state.
  // dragState 는 pointerdown 시 채워지고 pointermove 임계점 초과 시 active = true.
  // pointerup 에서 cleanup.
  type DragState = {
    pointerId: number;
    blockId: string;
    blockEl: HTMLElement;
    startX: number;
    startY: number;
    active: boolean;
  };
  let dragState: DragState | null = null;

  // Phase D — inline text editing state. dblclick 으로 contentEditable 활성 시
  // editingState 채워짐. blur 또는 cleanup 시 비워짐.
  // editingState != null 동안에는 pointerdown drag 시작을 차단해 마우스 selection
  // 이 텍스트 박스 안에서 정상 동작.
  type EditingState = {
    blockId: string;
    el: HTMLElement;
    orig: string;
    onBlur: (ev: Event) => void;
    onKey: (ev: KeyboardEvent) => void;
  };
  let editingState: EditingState | null = null;

  const isFormElement = (el: Element | null): boolean => {
    if (!el) return false;
    const tag = el.tagName;
    if (
      tag === 'INPUT' ||
      tag === 'TEXTAREA' ||
      tag === 'SELECT' ||
      tag === 'BUTTON' ||
      tag === 'OPTION' ||
      tag === 'LABEL'
    ) {
      return true;
    }
    return !!el.closest?.('input, textarea, select, button, option');
  };

  const onPointerDown = (ev: Event) => {
    const e = ev as PointerEvent;
    // 좌클릭 only — wheel/right 무시.
    if (e.button !== 0) return;
    const target = e.target as HTMLElement | null;
    if (!target) return;
    // Phase D — inline 편집 중이면 drag/select 무시 — 마우스 selection 우선.
    if (editingState) return;
    // contentEditable element 위에서도 drag 시작 안 함.
    if (target.isContentEditable) return;
    // form 위에선 drag 시작 안 함 — native focus / typing 보존.
    // onSelect 는 click handler 가 알아서 호출함 (drag 시작 안 했으니 suppressClick=false).
    if (isFormElement(target)) return;
    const el = target.closest('[data-r20-block-id]') as HTMLElement | null;
    if (!el) return;
    const blockId = el.dataset.r20BlockId;
    if (!blockId) return;
    dragState = {
      pointerId: e.pointerId,
      blockId,
      blockEl: el,
      startX: e.clientX,
      startY: e.clientY,
      active: false,
    };
    // Pointer capture — drag 중 host 밖으로 나가도 pointermove 계속 받음.
    // ShadowRoot 은 setPointerCapture 가 없으므로 host 에 캡처.
    try {
      host.setPointerCapture(e.pointerId);
    } catch {
      /* 일부 환경에선 unsupported — 그래도 document-level move 로 대체 */
    }
  };

  const onPointerMove = (ev: Event) => {
    const e = ev as PointerEvent;
    if (!dragState) return;
    if (e.pointerId !== dragState.pointerId) return;
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    if (!dragState.active) {
      if (Math.abs(dx) < DRAG_THRESHOLD_PX && Math.abs(dy) < DRAG_THRESHOLD_PX) {
        return;
      }
      dragState.active = true;
      dragState.blockEl.classList.add('r20-dragging');
      host.setAttribute('data-r20-dragging', '');
      opts.onDragStart?.(dragState.blockId, e.clientX, e.clientY);
    }
    opts.onDragMove?.(dragState.blockId, dx, dy, e.clientX, e.clientY);
  };

  const finishDrag = (ev: Event) => {
    const e = ev as PointerEvent;
    if (!dragState) return;
    if (e.pointerId !== dragState.pointerId) return;
    const wasActive = dragState.active;
    const blockEl = dragState.blockEl;
    const blockId = dragState.blockId;
    const pointerId = dragState.pointerId;
    dragState = null;
    blockEl.classList.remove('r20-dragging');
    host.removeAttribute('data-r20-dragging');
    try {
      host.releasePointerCapture(pointerId);
    } catch {
      /* ignore */
    }
    if (wasActive) {
      // drag 후엔 자동으로 click 이 발화됨 (browser quirk) — suppress 한 번.
      suppressClick = true;
      opts.onDragEnd?.(blockId);
    }
  };

  // ShadowRoot 에 직접 pointerdown — bubble phase 로 받음.
  // pointermove / pointerup 은 host (capture target) 에서 받아야 안정적.
  shadow.addEventListener('pointerdown', onPointerDown);
  host.addEventListener('pointermove', onPointerMove);
  host.addEventListener('pointerup', finishDrag);
  host.addEventListener('pointercancel', finishDrag);

  // Phase D — dblclick → inline text 편집.
  // 1) target 이 form element 면 무시 (native dblclick = word select).
  // 2) [data-r20-block-id] ancestor 없으면 무시.
  // 3) target 이 직속 텍스트 자식을 가진 element 면 target 자체, 없으면 blockEl
  //    을 textEl 로 선택. 후자는 wrapper 가 text 만 직접 보유한 단순 케이스
  //    (예: <label data-r20-block-id>이름</label>) 를 노린 휴리스틱.
  // 4) contentEditable='true' + 전체 선택 + focus. blur 시 false 로 되돌리고
  //    orig 와 비교해 변경 시 onEditText 호출.
  // 5) Escape — 원본으로 되돌리고 blur. Enter — blur (개행 막음).
  const onDblClick = (ev: Event) => {
    const e = ev as MouseEvent;
    const target = e.target as HTMLElement | null;
    if (!target) return;
    if (isFormElement(target)) return;
    const blockEl = target.closest('[data-r20-block-id]') as HTMLElement | null;
    if (!blockEl) return;
    const blockId = blockEl.dataset.r20BlockId;
    if (!blockId) return;
    // 이미 편집 중이면 무시 (blur 가 먼저 처리).
    if (editingState) return;
    // 텍스트 자식 노드 (nodeType=3) 가 있는 element 우선, 없으면 blockEl.
    const hasTextChild = Array.from(target.childNodes).some(
      (n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim().length > 0,
    );
    const textEl: HTMLElement = hasTextChild ? target : blockEl;
    // textEl 이 input/textarea 면 (블록 자체가 form element) 무시.
    if (isFormElement(textEl)) return;

    e.preventDefault();
    e.stopPropagation();
    const orig = (textEl.innerText ?? textEl.textContent ?? '').trim();
    textEl.setAttribute('contenteditable', 'true');
    textEl.classList.add('r20-editing');
    textEl.focus();
    // 전체 선택 — Shadow Root selection API 우선.
    try {
      const range = document.createRange();
      range.selectNodeContents(textEl);
      const root = textEl.getRootNode() as ShadowRoot & {
        getSelection?: () => Selection | null;
      };
      const sel = root.getSelection?.() ?? window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    } catch {
      /* selection 미지원 환경 — 그래도 contentEditable 자체는 동작 */
    }

    const onBlur = () => {
      if (!editingState || editingState.el !== textEl) return;
      const state = editingState;
      editingState = null;
      textEl.removeAttribute('contenteditable');
      textEl.classList.remove('r20-editing');
      textEl.removeEventListener('blur', state.onBlur);
      textEl.removeEventListener('keydown', state.onKey);
      const newText = (textEl.innerText ?? textEl.textContent ?? '').trim();
      // 변경 없으면 commit 안 함.
      if (newText !== state.orig) {
        opts.onEditText?.(state.blockId, newText);
      }
    };
    const onKey = (kev: KeyboardEvent) => {
      if (kev.key === 'Escape') {
        kev.preventDefault();
        // 원본 복구 후 blur.
        if (editingState) {
          textEl.innerText = editingState.orig;
        }
        textEl.blur();
      } else if (kev.key === 'Enter' && !kev.shiftKey) {
        kev.preventDefault();
        textEl.blur();
      }
    };
    textEl.addEventListener('blur', onBlur);
    textEl.addEventListener('keydown', onKey);
    editingState = { blockId, el: textEl, orig, onBlur, onKey };
  };
  shadow.addEventListener('dblclick', onDblClick);

  // Phase E — contextmenu (우클릭) 위임.
  // 1) target 의 가장 가까운 [data-r20-block-id] ancestor 찾기. 없으면 native 메뉴.
  // 2) 있으면 preventDefault → native 메뉴 차단 → 호출자에 (blockId, x, y) 전달.
  //    호출자가 ShadowContextMenu 컴포넌트를 (x, y) 에 띄움.
  // 3) form element 위에서도 동일 — input 위 우클릭이 native [잘라내기 / 복사 / 붙여넣기]
  //    가 아니라 [속성/삭제/...] 메뉴로 통일 (사용자 멘탈 모델 = 블록).
  // 4) editingState 활성 (contentEditable) 중이면 그대로 통과 — native 메뉴 우선
  //    (텍스트 편집 중엔 잘라내기/복사가 필요).
  const onContextMenu = (ev: Event) => {
    const e = ev as MouseEvent;
    if (editingState) return; // contentEditable 중엔 native 메뉴 보존.
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const el = target.closest('[data-r20-block-id]') as HTMLElement | null;
    if (!el) return;
    const blockId = el.dataset.r20BlockId;
    if (!blockId) return;
    e.preventDefault();
    e.stopPropagation();
    opts.onContextMenu?.(blockId, e.clientX, e.clientY);
  };
  shadow.addEventListener('contextmenu', onContextMenu);

  const escapeAttr = (raw: string): string =>
    (typeof CSS !== 'undefined' && CSS.escape)
      ? CSS.escape(raw)
      : raw.replace(/(["\\])/g, '\\$1');

  // Phase F — element 가 viewport 밖이면 부드럽게 가운데로 스크롤.
  // Shadow 안 element 의 scrollIntoView 는 nearest scroll ancestor (보통
  // PreviewMain 의 overflow-auto wrapper) 를 따라 움직임. block:'center' 로
  // 상하 가운데, inline:'nearest' 로 가로 스크롤 최소화.
  const scrollIntoViewIfNeeded = (el: HTMLElement) => {
    try {
      const rect = el.getBoundingClientRect();
      const inView =
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth);
      if (!inView) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      }
    } catch {
      /* JSDOM / 일부 환경 — scrollIntoView 미지원 */
    }
  };

  const setSelected = (
    blockId: string | null,
    selOpts?: { scrollIntoView?: boolean },
  ) => {
    if (!shadow) return;
    // clear all
    const prev = shadow.querySelectorAll<HTMLElement>('[data-r20-block-id].r20-selected');
    prev.forEach((el) => el.classList.remove('r20-selected'));
    if (blockId == null) return;
    const escaped = escapeAttr(blockId);
    const target = shadow.querySelector<HTMLElement>(
      `[data-r20-block-id="${escaped}"]`,
    );
    if (!target) return;
    target.classList.add('r20-selected');
    if (selOpts?.scrollIntoView) {
      scrollIntoViewIfNeeded(target);
    }
  };

  // Phase F — partial re-render API. 호출자 (PreviewMain) 에서 emit 단위 diff
  // 가 없어 현재 wire 안 됨. follow-up backlog.
  const updateBlock = (blockId: string, newOuterHtml: string): boolean => {
    if (!shadow) return false;
    const escaped = escapeAttr(blockId);
    const target = shadow.querySelector<HTMLElement>(
      `[data-r20-block-id="${escaped}"]`,
    );
    if (!target) return false;
    // contentEditable 중이면 swap 보류 — 사용자의 입력 잃으면 안 됨.
    if (target.isContentEditable || target.querySelector('[contenteditable=\"true\"]')) {
      return false;
    }
    try {
      target.outerHTML = newOuterHtml;
      return true;
    } catch {
      return false;
    }
  };

  return {
    shadow,
    updateBlock,
    cleanup: () => {
      // editing 중이라면 — blur listener 정리 + contentEditable off.
      if (editingState) {
        const s = editingState;
        editingState = null;
        try {
          s.el.removeAttribute('contenteditable');
          s.el.classList.remove('r20-editing');
          s.el.removeEventListener('blur', s.onBlur);
          s.el.removeEventListener('keydown', s.onKey);
        } catch {
          /* element already removed by innerHTML reset */
        }
      }
      if (shadow) {
        shadow.removeEventListener('click', onClick);
        shadow.removeEventListener('pointerdown', onPointerDown);
        shadow.removeEventListener('dblclick', onDblClick);
        shadow.removeEventListener('contextmenu', onContextMenu);
        shadow.innerHTML = '';
      }
      host.removeEventListener('pointermove', onPointerMove);
      host.removeEventListener('pointerup', finishDrag);
      host.removeEventListener('pointercancel', finishDrag);
      host.removeAttribute('data-r20-dragging');
    },
    setSelected,
  };
}
