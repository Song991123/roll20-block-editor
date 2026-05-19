'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useWorkspaceStore, type WorkspaceKey } from '@/lib/stores/workspaceStore';
import { useChatStore } from '@/lib/stores/chatStore';
import { parseRoot } from '@/lib/dice/parser';
import {
  executeRoot,
  type AttrResolver,
  type QueryResolver,
  type RollResult,
} from '@/lib/dice/executor';
import { usePreviewStore } from '@/lib/stores/previewStore';
import { useUiStore } from '@/lib/stores/uiStore';
import { getBlockDef } from '@/lib/blocks/registry';
import { buildSheetDoc, buildSheetParts } from '@/lib/preview/buildDoc';
import { mountSheetShadow } from '@/lib/preview/shadowMount';
import { getBlocklyAdapter } from '@/lib/blockly/adapter';
import ShadowContextMenu, { type ShadowContextMenuAction } from './ShadowContextMenu';
import { playSfx } from '@/lib/sfx';
import PreviewEmptyState from './PreviewEmptyState';

/**
 * 미리보기 메인 — iframe srcdoc, sandbox.
 *
 * Anchor: docs/spec/08_wireframes.md W2-C + 10_system_architecture §3 + D52 / D50.
 *
 * Phase 2:
 *   - workspace 의 모든 블록을 emit (lib/preview/emit) → autoPrefix → runtimeCss 합성
 *     (lib/preview/buildDoc) → iframe srcdoc 으로 박음.
 *   - structureVersion / sanitize / darkMode 변경 → 500ms 디바운스 후 재emit.
 *   - 미리보기 → 우측 인스펙터 sync 는 postMessage(r20:select) 유지.
 *   - 선택된 블록 → iframe 안 highlight 는 postMessage(r20:highlight) 송신.
 *   - 좌측 사이드 카드 drag → 본 영역 drop → appendBlockToActive.
 *
 * Phase 5+ 에서 emit-worker 로 이동 (현재는 main thread).
 */
export default function PreviewMain() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // emit 결과는 useEmitPipeline (EditorShell 에서 항상 mount) 가 store 에 박는다.
  // PreviewMain 은 본 결과를 읽어 buildSheetDoc → srcdoc 만 생성.
  const emitHtml = useWorkspaceStore((s) => s.emitCache.html);
  const emitCss = useWorkspaceStore((s) => s.emitCache.css);
  const emitI18n = useWorkspaceStore((s) => s.emitCache.i18n);
  const htmlCount = useWorkspaceStore((s) => s.workspaces.html.blockCount);
  const cssCount = useWorkspaceStore((s) => s.workspaces.css.blockCount);
  const i18nCount = useWorkspaceStore((s) => s.workspaces.i18n.blockCount);
  const activeWs = useWorkspaceStore((s) => s.activeWorkspace);
  const selectedId = useWorkspaceStore((s) => s.selectedBlockId);
  // Phase F (spec 17 §13) — origin === 'tree' 면 preview 안 element 가
  // viewport 밖일 때 scrollIntoView. preview origin (이미 클릭한 element 가
  // viewport 안) 이나 inspector / init 는 scroll 안 함 (UX: 갑작스러운 점프 방지).
  const selectionOrigin = useWorkspaceStore((s) => s.selectionOrigin);
  const appendBlock = useWorkspaceStore((s) => s.appendBlockToActive);
  const setSelected = useWorkspaceStore((s) => s.setSelectedBlockId);
  const darkMode = usePreviewStore((s) => s.darkMode);
  const sanitize = usePreviewStore((s) => s.sanitize);
  const sandbox = usePreviewStore((s) => s.iframeSandbox);
  const renderMode = usePreviewStore((s) => s.renderMode);
  const setRenderMode = usePreviewStore((s) => s.setRenderMode);
  const zoom = useUiStore((s) => s.previewZoom);
  const sheetCanvasWidth = useUiStore((s) => s.sheetCanvasWidth);
  const setSheetCanvasWidth = useUiStore((s) => s.setSheetCanvasWidth);
  const previewLayer = useUiStore((s) => s.previewLayer);
  const setHoveredWidgetId = useUiStore((s) => s.setHoveredWidgetId);
  const setSelectedWidgetId = useUiStore((s) => s.setSelectedWidgetId);
  const selectedWidgetId = useUiStore((s) => s.selectedWidgetId);
  const hoveredWidgetId = useUiStore((s) => s.hoveredWidgetId);
  const editSubmode = useUiStore((s) => s.editSubmode);
  const sheetWidgetsList = useWorkspaceStore((s) => s.sheetWidgets);
  const rolltemplateWidgetsList = useWorkspaceStore((s) => s.rolltemplateWidgets);
  const [dragOver, setDragOver] = useState(false);
  // Phase E — 우클릭 컨텍스트 메뉴 state. Shadow onContextMenu 가 (blockId, x, y) 채움.
  // null 이면 안 그림. 액션 dispatch / 외부 클릭 / Escape 시 null 로 리셋.
  const [contextMenuState, setContextMenuState] = useState<{
    blockId: string;
    x: number;
    y: number;
  } | null>(null);
  const [iframeHeight, setIframeHeight] = useState(900);
  const [viewportWidth, setViewportWidth] = useState(0);
  const autoWidthSizedRef = useRef(false);
  // Phase E — Inspector 활성화에 쓰일 sidebarRightTab/collapse setter.
  // 'attrs' 가 Inspector 패널 (D49).
  const setSidebarRightTab = useUiStore((s) => s.setSidebarRightTab);
  const sidebarRightCollapsed = useUiStore((s) => s.sidebarRightCollapsed);
  const toggleSidebarRight = useUiStore((s) => s.toggleSidebarRight);

  const total = htmlCount + cssCount + i18nCount;
  const isEmpty = total === 0;
  const fitScale =
    zoom === 'fit' && viewportWidth > 0
      ? Math.min(1, Math.max(0.25, (viewportWidth - 48) / sheetCanvasWidth))
      : 1;
  const scale = zoom === 'fit' ? fitScale : zoom;

  useEffect(() => {
    setRenderMode('iframe');
  }, [setRenderMode]);

  // srcdoc — emitCache + 미리보기 토글 (sanitize/darkMode/previewLayer) 의 순수 derive.
  // useState + useEffect 였을 때: 마운트 시 초기값 = 빈 placeholder → useEffect 가 다음
  // tick 에 setSrcdoc → React 가 srcDoc prop 갱신, 하지만 iframe 이 reload 안 함 (Chrome
  // 의 srcdoc 속성 변경 quirk). useMemo 로 바꿔 첫 렌더부터 올바른 값으로 렌더 →
  // 모드 전환 후에도 즉시 컨텐츠 표시.
  const srcdoc = useMemo(
    () =>
      buildSheetDoc({
        html: emitHtml,
        css: emitCss,
        i18n: emitI18n,
        sanitize,
        darkMode,
        previewLayer,
        includeEditorOverlays: false,
      }),
    [emitHtml, emitCss, emitI18n, sanitize, darkMode, previewLayer],
  );

  // spec 21 Phase A — Shadow DOM 모드 mount.
  // host element 에 Shadow Root attach → buildSheetParts(html, css) 인젝션.
  // 시각 동일성 보장 — buildSheetParts 는 buildSheetDoc 과 같은 runtime/layer/prefix CSS 사용.
  // Phase A 범위 = 시각만 동일. Phase B+ 의 인터랙션 (select / drag / inline edit) 은 미구현.
  useEffect(() => {
    autoWidthSizedRef.current = false;
    queueMicrotask(() => setIframeHeight(120));
  }, [srcdoc]);

  const previewAreaRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = previewAreaRef.current;
    if (!node) return;
    const update = () => setViewportWidth(node.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  const hostRef = useRef<HTMLDivElement>(null);
  // spec 17 §12 Phase B — Shadow mount 가 반환하는 setSelected 를 ref 로 잡아
  // selectedBlockId 변경 effect 에서 호출. mount 사이클 (parts 변경) 마다 새 ref
  // 발급 — cleanup 단계에서 null 로 비워 stale 호출 방지.
  const shadowSetSelectedRef = useRef<((id: string | null, opts?: { scrollIntoView?: boolean }) => void) | null>(null);
  const parts = useMemo(
    () =>
      buildSheetParts({
        html: emitHtml,
        css: emitCss,
        i18n: emitI18n,
        sanitize,
        darkMode,
        previewLayer,
        includeEditorOverlays: true,
      }),
    [emitHtml, emitCss, emitI18n, sanitize, darkMode, previewLayer],
  );
  useEffect(() => {
    if (renderMode !== 'shadow') return;
    const host = hostRef.current;
    if (!host) return;
    // Phase C drag — 시작 시점의 LEFT_PX/TOP_PX 를 origin 으로 저장.
    // pointermove 마다 (origLeft+dx/scale, origTop+dy/scale) 로 갱신.
    // scale = host.getBoundingClientRect().width / host.offsetWidth — zoom 보정.
    // 호스트가 zoom 적용 안 됐으면 1.
    let dragOrigin: {
      blockId: string;
      origLeft: number;
      origTop: number;
      ws: WorkspaceKey;
      scale: number;
      hasPos: boolean;
    } | null = null;
    // Phase C — pending setFieldValue (rAF 합치기). pointermove 가 frame 보다
    // 빠를 때 (touch 일부 환경) 마지막 값만 commit.
    let dragOriginPending: { ws: WorkspaceKey; blockId: string; left: number; top: number } | null = null;
    let dragOriginRaf: number | null = null;

    const { cleanup, setSelected: setShadowSelected } = mountSheetShadow(host, {
      html: parts.html,
      css: parts.css,
      layer: previewLayer,
      darkMode,
      // Phase B — Shadow 안 element 클릭 → workspaceStore.selectedBlockId 갱신.
      // origin 'preview' — 양방향 sync 시 src 구분.
      onSelect: (blockId) => setSelected(blockId, 'preview'),
      // Phase C — drag 시작. 모든 워크스페이스 (html / css / i18n) 에서 LEFT_PX/TOP_PX
      // 가진 block 검색. 없으면 hasPos=false → 이후 move 호출은 noop (안전 무시).
      onDragStart: (blockId) => {
        const adapter = getBlocklyAdapter();
        // active 우선, 없으면 html 워크스페이스에서 찾기.
        const cand: WorkspaceKey[] = [
          useWorkspaceStore.getState().activeWorkspace as WorkspaceKey,
          'html', 'css', 'i18n',
        ];
        let foundWs: WorkspaceKey | null = null;
        for (const k of cand) {
          if (adapter.hasBlockField(k, blockId, 'LEFT_PX') ||
              adapter.hasBlockField(k, blockId, 'TOP_PX')) {
            foundWs = k;
            break;
          }
          // block 이 해당 ws 에 있지만 pos field 없으면 — 다음 ws 도 검색 안 됨.
          if (adapter.getBlock(k, blockId)) {
            foundWs = k;
            break;
          }
        }
        const ws = foundWs ?? 'html';
        const hasL = adapter.hasBlockField(ws, blockId, 'LEFT_PX');
        const hasT = adapter.hasBlockField(ws, blockId, 'TOP_PX');
        const hasPos = hasL && hasT;
        const origLeft = hasL
          ? Number(adapter.getBlockField(ws, blockId, 'LEFT_PX') ?? '0')
          : 0;
        const origTop = hasT
          ? Number(adapter.getBlockField(ws, blockId, 'TOP_PX') ?? '0')
          : 0;
        // zoom 보정 — host CSS scale 이 있으면 (transform: scale()) viewport px
        // → sheet px 변환 필요. 현재 시트 wrapper 는 width 조정으로 zoom 처리하므로
        // scale 은 (rendered width / intrinsic width).
        const rect = host.getBoundingClientRect();
        const scale = host.offsetWidth > 0 ? rect.width / host.offsetWidth : 1;
        dragOrigin = { blockId, origLeft, origTop, ws, scale, hasPos };
        if (!hasPos) {
          // 위치 필드 없는 블록 — drag 무시 + 사용자에 한 번 통보 (toast).
          // sonner toast 는 정의되어 있으나 너무 시끄러울 수 있어 console.debug 로 대체.
          // 추후 W3 UX 가 결정.
           
          console.debug('[wysiwyg] block has no LEFT_PX/TOP_PX — drag ignored:', blockId);
        }
      },
      onDragMove: (blockId, dx, dy) => {
        if (!dragOrigin || dragOrigin.blockId !== blockId) return;
        if (!dragOrigin.hasPos) return;
        // rAF coalesce — pointermove 는 60-120Hz, setFieldValue 는 BLOCK_CHANGE
        // event + bumpStructure 트리거. 60Hz 면 충분, 더 빠르면 emit 디바운스가
        // 흡수 못 함. rAF 안에서만 호출.
        const s = dragOrigin.scale || 1;
        dragOriginPending = {
          ws: dragOrigin.ws,
          blockId,
          left: Math.max(0, Math.round(dragOrigin.origLeft + dx / s)),
          top: Math.max(0, Math.round(dragOrigin.origTop + dy / s)),
        };
        if (dragOriginRaf == null) {
          dragOriginRaf = window.requestAnimationFrame(() => {
            dragOriginRaf = null;
            const pend = dragOriginPending;
            dragOriginPending = null;
            if (!pend) return;
            const adapter = getBlocklyAdapter();
            adapter.setBlockField(pend.ws, pend.blockId, 'LEFT_PX', String(pend.left));
            adapter.setBlockField(pend.ws, pend.blockId, 'TOP_PX', String(pend.top));
          });
        }
      },
      onDragEnd: () => {
        // pending flush — rAF 한 프레임 남은 갱신 commit.
        if (dragOriginRaf != null) {
          window.cancelAnimationFrame(dragOriginRaf);
          dragOriginRaf = null;
        }
        const pend = dragOriginPending;
        dragOriginPending = null;
        if (pend) {
          const adapter = getBlocklyAdapter();
          adapter.setBlockField(pend.ws, pend.blockId, 'LEFT_PX', String(pend.left));
          adapter.setBlockField(pend.ws, pend.blockId, 'TOP_PX', String(pend.top));
        }
        dragOrigin = null;
      },
      // Phase D — inline text 편집 commit.
      // dblclick → contentEditable → blur 시 호출.
      // 블록 종류별 텍스트 필드 이름이 달라 (TEXT / LABEL / VALUE) — 우선순위 순으로
      // 첫 매치되는 필드에 setBlockField. 셋 다 없으면 noop + 디버그 로그.
      // 워크스페이스도 active 기준 + html/css/i18n 순회로 탐색 (drag 와 동일 전략).
      onEditText: (blockId, newText) => {
        const adapter = getBlocklyAdapter();
        const cand: WorkspaceKey[] = [
          useWorkspaceStore.getState().activeWorkspace as WorkspaceKey,
          'html', 'css', 'i18n',
        ];
        // 중복 제거.
        const order: WorkspaceKey[] = [];
        for (const k of cand) if (!order.includes(k)) order.push(k);
        const FIELD_PREFS = ['TEXT', 'LABEL', 'VALUE', 'CONTENT'] as const;
        for (const ws of order) {
          if (!adapter.getBlock(ws, blockId)) continue;
          for (const fname of FIELD_PREFS) {
            if (adapter.hasBlockField(ws, blockId, fname)) {
              const ok = adapter.setBlockField(ws, blockId, fname, newText);
              // Phase D fix (local_86b826b4 검증) — emit pipeline 강제 트리거.
              // 정상 경로에선 setFieldValue → BLOCK_CHANGE → BlocklyModelHost
              // changeListener → bumpStructure 가 자동으로 돌지만, 라이브 verify
              // 에서 시각 편집은 OK 인데 emit raw HTML 에 변화가 안 박히는 케이스가
              // 발견됨 (Blockly v12 의 외부 setFieldValue 이벤트 전파 누락 또는
              // perfHook hydrate 의 Events.disable 카운터 미해소). bumpStructure
              // 를 명시적으로 호출해 useEmitPipeline 의 500ms 디바운스가 확실히
              // 트리거되도록. 정상 경로에선 동일 frame 내 중복 bump (counter+2)
              // 이지만 emit 은 1회만 실행되어 무해.
              if (ok) {
                const count = adapter.listAllBlocks(ws).length;
                useWorkspaceStore.getState().bumpStructure(ws, count);
              }
              return;
            }
          }
          // 블록 존재 but 텍스트 필드 없음 — 더 찾지 말고 종료.
           
          console.debug('[wysiwyg] block has no TEXT/LABEL/VALUE/CONTENT field — edit ignored:', blockId);
          return;
        }
         
        console.debug('[wysiwyg] block not found in any workspace — edit ignored:', blockId);
      },
      // Phase E — 우클릭 → state 갱신 → ShadowContextMenu 렌더.
      // (x, y) 는 viewport 좌표. ShadowContextMenu 가 position:fixed 으로 사용.
      // 같은 element 연속 우클릭은 기존 메뉴 close 후 새 위치로 재오픈.
      onContextMenu: (blockId, x, y) => {
        setContextMenuState({ blockId, x, y });
      },
    });
    shadowSetSelectedRef.current = setShadowSelected;
    // mount 직후 한번 — 현재 selectedBlockId 가 있으면 outline 복원.
    // mount 시점엔 scroll 안 함 (init 직후 갑작스러운 점프 방지).
    const currentSelected = useWorkspaceStore.getState().selectedBlockId;
    if (currentSelected) setShadowSelected(currentSelected, { scrollIntoView: false });
    return () => {
      shadowSetSelectedRef.current = null;
      dragOrigin = null;
      dragOriginPending = null;
      if (dragOriginRaf != null) {
        window.cancelAnimationFrame(dragOriginRaf);
        dragOriginRaf = null;
      }
      cleanup();
    };
  }, [renderMode, parts, previewLayer, darkMode, setSelected]);

  // Phase B — selectedBlockId 변경 → Shadow 안 outline 동기화.
  // iframe 모드 or 미마운트 시 ref.current === null → noop.
  // Phase F (spec 17 §13) — selectionOrigin === 'tree' 시 element 가 viewport
  // 밖이면 부드럽게 가운데로 스크롤. tree row 클릭 후 preview 영역에서 시각적
  // 페어링이 즉시 보이도록.
  useEffect(() => {
    if (renderMode !== 'shadow') return;
    shadowSetSelectedRef.current?.(selectedId, {
      scrollIntoView: selectionOrigin === 'tree',
    });
  }, [selectedId, selectionOrigin, renderMode]);


  // spec 17 §8 — 캔버스 widget 선택/hover → preview iframe 강조
  useEffect(() => {
    const list = editSubmode === 'sheet' ? sheetWidgetsList : rolltemplateWidgetsList;
    const selected = list.find((w) => w.id === selectedWidgetId);
    const hovered = list.find((w) => w.id === hoveredWidgetId);
    const selectedName = (selected?.attrs.name as string | undefined) ?? null;
    const hoveredName = (hovered?.attrs.name as string | undefined) ?? null;
    const cw = iframeRef.current?.contentWindow;
    if (!cw) return;
    try {
      cw.postMessage({ type: 'r20:widget-select', widgetName: selectedName }, '*');
      cw.postMessage({ type: 'r20:widget-hover-in', widgetName: hoveredName }, '*');
    } catch {
      /* iframe not ready */
    }
  }, [
    selectedWidgetId,
    hoveredWidgetId,
    editSubmode,
    sheetWidgetsList,
    rolltemplateWidgetsList,
    srcdoc,
    setHoveredWidgetId,
    setSelectedWidgetId,
  ]);

  // 미리보기 → 우측 인스펙터 sync + 굴림 결과 채팅 박음 (postMessage).
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== iframeRef.current?.contentWindow) return;
      const data = e.data;
      if (data?.type === 'r20:select' && typeof data.blockId === 'string') {
        setSelected(data.blockId, 'preview');
        return;
      }
      if (data?.type === 'r20:resize' && typeof data.height === 'number') {
        const nextHeight = Math.max(120, Math.min(60000, Math.ceil(data.height)));
        setIframeHeight((prev) => (Math.abs(prev - nextHeight) > 8 ? nextHeight : prev));
        if (!autoWidthSizedRef.current && typeof data.width === 'number') {
          autoWidthSizedRef.current = true;
          const nextWidth = Math.max(850, Math.min(2400, Math.ceil(data.width)));
          const currentWidth = useUiStore.getState().sheetCanvasWidth;
          if (nextWidth > currentWidth + 8) {
            setSheetCanvasWidth(nextWidth);
          }
        }
        return;
      }
      // spec 17 §8 + N3 — widget hover/click (양방향 sync 간단)
      if (data?.type === 'r20:widget-hover') {
        const widgetName: string | null = data.widgetName ?? null;
        if (widgetName == null) {
          setHoveredWidgetId(null);
          return;
        }
        // 현 캔버스에서 같은 name 의 위젯 찾아 hover 표시
        const ws = useWorkspaceStore.getState();
        const tgt = useUiStore.getState().editSubmode === 'sheet' ? 'sheet' : 'rolltemplate';
        const list = tgt === 'sheet' ? ws.sheetWidgets : ws.rolltemplateWidgets;
        const w = list.find((x) => (x.attrs.name as string | undefined) === widgetName);
        setHoveredWidgetId(w?.id ?? null);
        return;
      }
      if (data?.type === 'r20:widget-click') {
        const widgetName: string | undefined = data.widgetName;
        if (!widgetName) return;
        const ws = useWorkspaceStore.getState();
        const tgt = useUiStore.getState().editSubmode === 'sheet' ? 'sheet' : 'rolltemplate';
        const list = tgt === 'sheet' ? ws.sheetWidgets : ws.rolltemplateWidgets;
        const w = list.find((x) => (x.attrs.name as string | undefined) === widgetName);
        if (w) setSelectedWidgetId(w.id);
        return;
      }
      if (data?.type === 'r20:roll') {
        const attrsMap: Record<string, string> = (data.attrs ?? {}) as Record<string, string>;
        const resolver: AttrResolver = (name) => {
          if (Object.prototype.hasOwnProperty.call(attrsMap, name)) return attrsMap[name];
          return undefined;
        };
        const query: QueryResolver = (prompt, fallback) => {
          if (typeof window === 'undefined') return fallback;
          const ans = window.prompt(prompt, fallback);
          return ans === null ? fallback : ans;
        };
        const expression = String(data.value ?? '').trim();
        const label = String(data.label ?? '').trim();
        const senderRaw = String(data.name ?? '').trim();
        const sender = label || (senderRaw ? senderRaw.replace(/^roll_/, '') : 'Sheet');
        let result: RollResult;
        try {
          const root = parseRoot(expression);
          result = executeRoot(root, { attr: resolver, query });
        } catch (err) {
          result = {
            kind: 'error',
            message: err instanceof Error ? err.message : String(err),
            raw: expression,
          };
        }
        useChatStore.getState().pushRoll({
          sender,
          expression,
          result,
        });
        // SFX — 결과별 분기.
        //   error  → toast.error 사운드
        //   crit   → 상승 fanfare
        //   fumble → 하강 sad horn
        //   else   → dice tumble + pop
        if (result.kind === 'error') {
          playSfx('toast.error');
        } else if (result.kind === 'expr' && result.isCrit) {
          playSfx('roll.crit');
        } else if (result.kind === 'expr' && result.isFumble) {
          playSfx('roll.fumble');
        } else if (result.kind === 'rolltemplate' && result.anyCrit) {
          playSfx('roll.crit');
        } else if (result.kind === 'rolltemplate' && result.anyFumble) {
          playSfx('roll.fumble');
        } else {
          playSfx('roll.click');
        }
        // 굴림 발생 시 [채팅] 탭으로 자동 전환 + 우측 사이드 펼침.
        const ui = useUiStore.getState();
        if (ui.sidebarRightCollapsed) ui.toggleSidebarRight();
        if (ui.sidebarRightTab !== 'chat') ui.setSidebarRightTab('chat');
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [setHoveredWidgetId, setSelected, setSelectedWidgetId, setSheetCanvasWidth]);

  // 선택된 블록 → iframe 안 highlight.
  useEffect(() => {
    if (!selectedId) return;
    const w = iframeRef.current?.contentWindow;
    if (!w) return;
    w.postMessage({ type: 'r20:highlight', blockId: selectedId }, '*');
  }, [selectedId, srcdoc]);

  // Phase E — 컨텍스트 메뉴 액션 디스패치.
  // - inspect: selectedBlockId 갱신 + sidebar right 펼침 + 'attrs' (Inspector) 탭 활성.
  // - delete: adapter.deleteBlock → BLOCK_DELETE event → bumpStructure → emit → preview 재mount.
  // - duplicate: adapter.duplicateBlock → 실패 (null) 시 toast.
  // - moveUp/moveDown: adapter.moveBlockUp/Down → false (statement chain 등) 시 toast '지원 예정'.
  // 워크스페이스 키는 active 우선, 없으면 html/css/i18n 순회 — drag/edit 와 동일 전략.
  const dispatchContextAction = (
    action: ShadowContextMenuAction,
    blockId: string,
  ) => {
    const adapter = getBlocklyAdapter();
    const cand: WorkspaceKey[] = [
      useWorkspaceStore.getState().activeWorkspace as WorkspaceKey,
      'html', 'css', 'i18n',
    ];
    const order: WorkspaceKey[] = [];
    for (const k of cand) if (!order.includes(k)) order.push(k);
    let ws: WorkspaceKey | null = null;
    for (const k of order) {
      if (adapter.getBlock(k, blockId)) { ws = k; break; }
    }
    if (!ws) {
      toast.error('블록을 찾을 수 없습니다', { duration: 1800 });
      return;
    }
    switch (action) {
      case 'inspect': {
        setSelected(blockId, 'inspector');
        if (sidebarRightCollapsed) toggleSidebarRight();
        setSidebarRightTab('attrs');
        return;
      }
      case 'delete': {
        const ok = adapter.deleteBlock(ws, blockId);
        if (!ok) toast.error('삭제 실패', { duration: 1800 });
        return;
      }
      case 'duplicate': {
        const newId = adapter.duplicateBlock(ws, blockId);
        if (!newId) toast('복사 지원 예정 (이 블록은 복제 불가)', { duration: 2000 });
        else toast('블록 복사됨', { duration: 1200 });
        return;
      }
      case 'moveUp': {
        const ok = adapter.moveBlockUp(ws, blockId);
        if (!ok) toast('위로 이동 지원 예정 (현재 최상단 또는 statement chain)', { duration: 2000 });
        return;
      }
      case 'moveDown': {
        const ok = adapter.moveBlockDown(ws, blockId);
        if (!ok) toast('아래로 이동 지원 예정 (현재 최하단 또는 statement chain)', { duration: 2000 });
        return;
      }
      default: return;
    }
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div
        ref={previewAreaRef}
        className={`relative flex-1 min-h-0 overflow-auto p-6 ${
          dragOver ? 'ring-2 ring-primary ring-inset' : ''
        }`}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes('application/x-r20-block-type')) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            if (!dragOver) setDragOver(true);
          }
        }}
        onDragLeave={(e) => {
          if (e.currentTarget === e.target) setDragOver(false);
        }}
        onDrop={(e) => {
          const type = e.dataTransfer.getData('application/x-r20-block-type');
          setDragOver(false);
          if (!type) return;
          e.preventDefault();
          const id = appendBlock(type);
          const def = getBlockDef(type);
          if (id) {
            playSfx('block.add');
            toast(
              `'${def?.label ?? type}' 추가됨 — ${(activeWs as WorkspaceKey).toUpperCase()} 워크스페이스`,
              { duration: 1600 },
            );
          } else {
            playSfx('toast.error');
            toast.error('블록 추가 실패', { duration: 2200 });
          }
        }}
      >
        {isEmpty ? (
          <PreviewEmptyState />
        ) : (
          <div
            className="mx-auto"
            style={{
              width: `${sheetCanvasWidth * scale}px`,
              height: `${iframeHeight * scale}px`,
              maxWidth: 'none',
            }}
          >
            <div
              className={`origin-top ${
              renderMode === 'iframe' ? 'bg-transparent' : 'bg-white shadow-lg ring-1 ring-border'
            }`}
            style={{
              width: `${sheetCanvasWidth}px`,
              height: `${iframeHeight}px`,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
          >
            {renderMode === 'iframe' ? (
              <iframe
                ref={iframeRef}
                title="시트 미리보기"
                sandbox={sandbox}
                srcDoc={srcdoc}
                className="block w-full border-0"
                style={{ width: `${sheetCanvasWidth}px`, height: `${iframeHeight}px` }}
              />
            ) : (
              <div
                ref={hostRef}
                data-testid="preview-shadow-host"
                className="block h-[calc(100vh-220px)] w-full overflow-auto"
              />
            )}
            </div>
          </div>
        )}
      </div>
      {contextMenuState && renderMode === 'shadow' && (
        <ShadowContextMenu
          blockId={contextMenuState.blockId}
          x={contextMenuState.x}
          y={contextMenuState.y}
          onAction={(action) =>
            dispatchContextAction(action, contextMenuState.blockId)
          }
          onClose={() => setContextMenuState(null)}
        />
      )}
    </div>
  );
}

