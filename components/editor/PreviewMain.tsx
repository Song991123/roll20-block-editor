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
import { buildSheetRenderBundle } from '@/lib/preview/buildDoc';
import { flushEmitPipeline } from '@/lib/preview/useEmitPipeline';
import { applyAssetReplacements } from '@/lib/export/asset_replacements';
import { mountSheetShadow } from '@/lib/preview/shadowMount';
import { getBlocklyAdapter } from '@/lib/blockly/adapter';
import ShadowContextMenu, { type ShadowContextMenuAction } from './ShadowContextMenu';
import { playSfx } from '@/lib/sfx';
import PreviewEmptyState from './PreviewEmptyState';
import {
  R20_IFRAME_EDIT_PROTOCOL,
  isTrustedIframeMessage,
  parseIframeEditBridgeMessage,
  type IframeEditHitMessage,
} from '@/lib/preview/iframeEditBridge';
import {
  commitIframeFlowDrop,
  resolveIframeEditDropTarget,
  resolveIframeFreePlacement,
  resolveIframeWidgetDropTarget,
  type IframeEditDropTarget,
} from '@/lib/editor/iframeDropTarget';
import { commitManagedDesignPosition } from '@/lib/editor/designPosition';
import {
  appendFriendlyWidgetPreset,
  decodeFriendlyWidgetDrag,
} from '@/lib/widgets/presets';

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
  const legacyCssSanitize = usePreviewStore((s) => s.legacyCssSanitize);
  const roll20SandboxSanitize = usePreviewStore((s) => s.roll20SandboxSanitize);
  const assetReplacementMap = usePreviewStore((s) => s.assetReplacementMap);
  const sandbox = usePreviewStore((s) => s.iframeSandbox);
  const renderMode = usePreviewStore((s) => s.renderMode);
  const documentLanguage = usePreviewStore((s) => s.documentLanguage);
  const setRenderMode = usePreviewStore((s) => s.setRenderMode);
  const zoom = useUiStore((s) => s.previewZoom);
  const sheetCanvasWidth = useUiStore((s) => s.sheetCanvasWidth);
  const rolltemplateCanvasWidth = useUiStore((s) => s.rolltemplateCanvasWidth);
  const sheetCanvasWidthAuto = useUiStore((s) => s.sheetCanvasWidthAuto);
  const rolltemplateCanvasWidthAuto = useUiStore((s) => s.rolltemplateCanvasWidthAuto);
  const setAutoSheetCanvasWidth = useUiStore((s) => s.setAutoSheetCanvasWidth);
  const setAutoRolltemplateCanvasWidth = useUiStore((s) => s.setAutoRolltemplateCanvasWidth);
  const previewLayer = useUiStore((s) => s.previewLayer);
  const setHoveredWidgetId = useUiStore((s) => s.setHoveredWidgetId);
  const setSelectedWidgetId = useUiStore((s) => s.setSelectedWidgetId);
  const selectedWidgetId = useUiStore((s) => s.selectedWidgetId);
  const hoveredWidgetId = useUiStore((s) => s.hoveredWidgetId);
  const editSubmode = useUiStore((s) => s.editSubmode);
  const mainMode = useUiStore((s) => s.mainMode);
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
  const [iframeEditBridgeId, setIframeEditBridgeId] = useState<string | null>(null);
  const [iframeLoadRevision, setIframeLoadRevision] = useState(0);
  const iframeEditBridgeIdRef = useRef<string | null>(null);
  const [iframeEditOverlay, setIframeEditOverlay] = useState<IframeEditHitMessage | null>(null);
  const [iframeEditDropTarget, setIframeEditDropTarget] = useState<IframeEditDropTarget | null>(null);
  const iframeEditDropTargetRef = useRef<IframeEditDropTarget | null>(null);
  const [iframeEditDragOrigin, setIframeEditDragOrigin] = useState<IframeEditHitMessage | null>(null);
  const iframeEditDragOriginRef = useRef<IframeEditHitMessage | null>(null);
  const applyRevisionRef = useRef(0);
  const applySourcesRef = useRef(new Map<number, string>());
  const lastAppliedSourceRef = useRef<string | null>(null);
  const pendingApplySourceRef = useRef<string | null>(null);
  const [lastApplyAck, setLastApplyAck] = useState(0);
  const [pendingApplyRevision, setPendingApplyRevision] = useState(0);
  const autoWidthSizedRef = useRef(false);
  // Phase E — Inspector 활성화에 쓰일 sidebarRightTab/collapse setter.
  // 'attrs' 가 Inspector 패널 (D49).
  const setSidebarRightTab = useUiStore((s) => s.setSidebarRightTab);
  const sidebarRightCollapsed = useUiStore((s) => s.sidebarRightCollapsed);
  const toggleSidebarRight = useUiStore((s) => s.toggleSidebarRight);

  const total = htmlCount + cssCount + i18nCount;
  const isEmpty = total === 0;
  const canvasWidth = editSubmode === 'rolltemplate'
    ? rolltemplateCanvasWidth
    : sheetCanvasWidth;
  const setAutoCanvasWidth = editSubmode === 'rolltemplate'
    ? setAutoRolltemplateCanvasWidth
    : setAutoSheetCanvasWidth;
  const canvasWidthAuto = editSubmode === 'rolltemplate'
    ? rolltemplateCanvasWidthAuto
    : sheetCanvasWidthAuto;
  const compatibilityMode = legacyCssSanitize ? 'legacy' : 'modern';
  const previewAssetText = useMemo(
    () => applyAssetReplacements({ html: emitHtml, css: emitCss }, assetReplacementMap),
    [emitHtml, emitCss, assetReplacementMap],
  );
  const fitScale =
    zoom === 'fit' && viewportWidth > 0
      ? Math.min(1, Math.max(0.25, (viewportWidth - 48) / canvasWidth))
      : 1;
  const scale = zoom === 'fit' ? fitScale : zoom;
  const iframeEditDragDelta = iframeEditDragOrigin && iframeEditOverlay
    && (iframeEditOverlay.phase === 'pointermove' || iframeEditOverlay.phase === 'pointerup')
    ? {
        x: iframeEditOverlay.pointer.x - iframeEditDragOrigin.pointer.x,
        y: iframeEditOverlay.pointer.y - iframeEditDragOrigin.pointer.y,
      }
    : { x: 0, y: 0 };

  useEffect(() => {
    setRenderMode('iframe');
  }, [setRenderMode]);

  // srcdoc — emitCache + 미리보기 토글 (sanitize/darkMode/previewLayer) 의 순수 derive.
  // useState + useEffect 였을 때: 마운트 시 초기값 = 빈 placeholder → useEffect 가 다음
  // tick 에 setSrcdoc → React 가 srcDoc prop 갱신, 하지만 iframe 이 reload 안 함 (Chrome
  // 의 srcdoc 속성 변경 quirk). useMemo 로 바꿔 첫 렌더부터 올바른 값으로 렌더 →
  // 모드 전환 후에도 즉시 컨텐츠 표시.
  const renderBundle = useMemo(
    () =>
      buildSheetRenderBundle(
        {
          html: previewAssetText.html,
          css: previewAssetText.css,
          i18n: emitI18n,
          compatibilityMode,
          roll20SandboxSanitize,
          darkMode,
          previewLayer,
          includeEditorOverlays: renderMode === 'shadow',
          documentLanguage,
        },
        { includeParts: renderMode === 'shadow' },
      ),
    [renderMode, previewAssetText.html, previewAssetText.css, emitI18n, compatibilityMode, roll20SandboxSanitize, darkMode, previewLayer, documentLanguage],
  );
  const srcdoc = renderBundle.doc;
  const livePatch = renderBundle.livePatch;
  const [iframeDocumentSrcdoc] = useState(srcdoc);

  // spec 21 Phase A — Shadow DOM 모드 mount.
  // host element 에 Shadow Root attach → buildSheetParts(html, css) 인젝션.
  // 시각 동일성 보장 — buildSheetParts 는 buildSheetDoc 과 같은 runtime/layer/prefix CSS 사용.
  // Phase A 범위 = 시각만 동일. Phase B+ 의 인터랙션 (select / drag / inline edit) 은 미구현.
  useEffect(() => {
    autoWidthSizedRef.current = false;
    iframeEditBridgeIdRef.current = null;
    queueMicrotask(() => setIframeHeight(120));
  }, [iframeDocumentSrcdoc]);

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
  const parts = renderBundle.parts ?? null;
  useEffect(() => {
    if (renderMode !== 'shadow') return;
    if (!parts) return;
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
      i18n: emitI18n,
      includeEditorOverlays: true,
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
  }, [renderMode, parts, emitI18n, previewLayer, darkMode, setSelected]);

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
      if (!isTrustedIframeMessage(e, iframeRef.current)) return;
      const editMessage = parseIframeEditBridgeMessage(e.data);
      if (editMessage?.type === 'r20:edit-ready') {
        if (iframeEditBridgeIdRef.current !== editMessage.bridgeId) {
          setIframeEditOverlay(null);
          setIframeEditDropTarget(null);
          setIframeEditDragOrigin(null);
          iframeEditDragOriginRef.current = null;
        }
        iframeEditBridgeIdRef.current = editMessage.bridgeId;
        if (lastAppliedSourceRef.current == null) {
          lastAppliedSourceRef.current = iframeDocumentSrcdoc;
        }
        setIframeEditBridgeId(editMessage.bridgeId);
        return;
      }
      if (editMessage?.type === 'r20:edit-applied') {
        if (editMessage.bridgeId !== iframeEditBridgeIdRef.current) return;
        const appliedSource = applySourcesRef.current.get(editMessage.revision);
        if (!appliedSource) return;
        lastAppliedSourceRef.current = appliedSource;
        applySourcesRef.current.delete(editMessage.revision);
        if (pendingApplySourceRef.current === appliedSource) {
          pendingApplySourceRef.current = null;
          setPendingApplyRevision(0);
        }
        // applyLivePatch schedules its resize for the next animation frame.
        // Reset here as well so a stale pre-apply resize cannot consume the
        // one-shot intrinsic-width measurement for the newly applied sheet.
        autoWidthSizedRef.current = false;
        setIframeEditDragOrigin(null);
        iframeEditDragOriginRef.current = null;
        setIframeEditDropTarget(null);
        setLastApplyAck(editMessage.revision);
        const target = iframeRef.current?.contentWindow;
        target?.postMessage({
          type: 'r20:edit-mode',
          protocol: R20_IFRAME_EDIT_PROTOCOL,
          bridgeId: editMessage.bridgeId,
          enabled: useUiStore.getState().mainMode === 'edit',
          selectedBlockId: useWorkspaceStore.getState().selectedBlockId,
        }, '*');
        return;
      }
      if (editMessage?.type === 'r20:edit-hit') {
        if (editMessage.bridgeId !== iframeEditBridgeIdRef.current) return;
        if (useUiStore.getState().mainMode !== 'edit') return;
        const adapter = getBlocklyAdapter();
        if (!adapter.getBlock('html', editMessage.blockId)) return;
        if (!editMessage.hitPath.every((item) => adapter.getBlock('html', item.blockId))) return;
        if (
          editMessage.subject.offsetParentBlockId
          && !adapter.getBlock('html', editMessage.subject.offsetParentBlockId)
        ) return;
        const nextDropTarget = resolveIframeEditDropTarget(editMessage, {
          getBlock: (blockId) => adapter.getBlock('html', blockId),
          canNestInContainer: (blockId) => adapter.canNestInContainer('html', blockId),
        });
        setIframeEditOverlay(editMessage);
        setIframeEditDropTarget(nextDropTarget);
        if (editMessage.phase === 'pointermove') {
          const ui = useUiStore.getState();
          const flowTarget = ui.editPlacementMode === 'flow' ? nextDropTarget : null;
          iframeEditDropTargetRef.current = flowTarget;
          iframeRef.current?.contentWindow?.postMessage({
            type: 'r20:edit-flow-target',
            protocol: R20_IFRAME_EDIT_PROTOCOL,
            bridgeId: editMessage.bridgeId,
            pointerId: editMessage.pointerId,
            subjectBlockId: editMessage.subject.blockId,
            placement: flowTarget?.mode ?? null,
            containerBlockId: flowTarget?.containerBlockId ?? null,
            siblingBlockId: flowTarget?.siblingBlockId ?? null,
          }, '*');
        }
        if (editMessage.phase === 'pointerdown') {
          iframeEditDropTargetRef.current = null;
          iframeEditDragOriginRef.current = editMessage;
          setIframeEditDragOrigin(editMessage);
          setSelected(editMessage.blockId, 'preview');
        } else if (editMessage.phase === 'pointercancel') {
          iframeEditDropTargetRef.current = null;
          iframeEditDragOriginRef.current = null;
          setIframeEditDragOrigin(null);
        } else if (editMessage.phase === 'pointerup') {
          const ui = useUiStore.getState();
          const committedDropTarget = nextDropTarget ?? iframeEditDropTargetRef.current;
          let moved = false;
          if (ui.editPlacementMode === 'flow') {
            moved = commitIframeFlowDrop(editMessage.subject.blockId, committedDropTarget, adapter);
          } else {
            const origin = iframeEditDragOriginRef.current;
            const placement = origin
              ? resolveIframeFreePlacement(origin, editMessage, {
                  getBlock: (blockId) => adapter.getBlock('html', blockId),
                  canNestInContainer: (blockId) => adapter.canNestInContainer('html', blockId),
                }, ui.snapEnabled ? 8 : 1)
              : null;
            if (placement) {
              const subject = adapter.getBlock('html', editMessage.subject.blockId);
              const currentParentId = subject?.layerParentId ?? null;
              let structureMoved = true;
              if (placement.containingBlockId && currentParentId !== placement.containingBlockId) {
                structureMoved = adapter.nestBlockInContainer(
                  'html',
                  editMessage.subject.blockId,
                  placement.containingBlockId,
                );
              } else if (!placement.containingBlockId && currentParentId) {
                structureMoved = adapter.moveBlockToRoot('html', editMessage.subject.blockId);
              }
              if (structureMoved) {
                const committed = commitManagedDesignPosition(adapter, {
                  workspace: 'html',
                  blockId: editMessage.subject.blockId,
                  left: placement.left,
                  top: placement.top,
                  containingBlockId: placement.containingBlockId,
                  containingBlockNeedsRelative: placement.containingBlockNeedsRelative,
                });
                moved = committed.moved;
                if (committed.cssBlockCreated) {
                  useWorkspaceStore.getState().bumpStructure('css', adapter.countBlocks('css'));
                }
              }
            }
          }
          if (moved) {
            if (ui.editPlacementMode === 'flow' && committedDropTarget) {
              iframeRef.current?.contentWindow?.postMessage({
                type: 'r20:edit-optimistic-flow',
                protocol: R20_IFRAME_EDIT_PROTOCOL,
                bridgeId: editMessage.bridgeId,
                subjectBlockId: editMessage.subject.blockId,
                placement: committedDropTarget.mode,
                containerBlockId: committedDropTarget.containerBlockId,
                siblingBlockId: committedDropTarget.siblingBlockId,
              }, '*');
            }
            const store = useWorkspaceStore.getState();
            store.bumpStructure('html', adapter.countBlocks('html'));
            flushEmitPipeline();
            store.setSelectedBlockId(editMessage.subject.blockId, 'preview');
          } else {
            iframeEditDragOriginRef.current = null;
            setIframeEditDragOrigin(null);
          }
          iframeRef.current?.contentWindow?.postMessage({
            type: 'r20:edit-optimistic-flow-finalize',
            protocol: R20_IFRAME_EDIT_PROTOCOL,
            bridgeId: editMessage.bridgeId,
            committed: moved,
          }, '*');
          iframeEditDropTargetRef.current = null;
        }
        return;
      }
      if (editMessage?.type === 'r20:widget-drag') {
        if (editMessage.bridgeId !== iframeEditBridgeIdRef.current) return;
        if (useUiStore.getState().mainMode !== 'edit') return;
        if (editMessage.phase === 'dragleave') {
          setIframeEditDropTarget(null);
          return;
        }
        const adapter = getBlocklyAdapter();
        if (!editMessage.hitPath.every((item) => adapter.getBlock('html', item.blockId))) return;
        const nextDropTarget = resolveIframeWidgetDropTarget(editMessage, {
          getBlock: (blockId) => adapter.getBlock('html', blockId),
          canNestInContainer: (blockId) => adapter.canNestInContainer('html', blockId),
        });
        setIframeEditDropTarget(nextDropTarget);
        if (editMessage.phase !== 'drop' || !editMessage.payload) return;
        const preset = decodeFriendlyWidgetDrag(editMessage.payload);
        if (!preset) {
          setIframeEditDropTarget(null);
          return;
        }
        const ui = useUiStore.getState();
        const freeInside = ui.editPlacementMode === 'free'
          && nextDropTarget?.mode === 'inside'
          && Boolean(nextDropTarget.containerBlockId);
        const position = freeInside && nextDropTarget
          ? {
              left: Math.max(0, Math.round(
                editMessage.pointer.x
                - nextDropTarget.geometry.rect.left
                - nextDropTarget.geometry.clientLeft
                + nextDropTarget.geometry.scrollLeft,
              )),
              top: Math.max(0, Math.round(
                editMessage.pointer.y
                - nextDropTarget.geometry.rect.top
                - nextDropTarget.geometry.clientTop
                + nextDropTarget.geometry.scrollTop,
              )),
            }
          : {
              left: Math.max(0, Math.round(editMessage.pointer.x)),
              top: Math.max(0, Math.round(editMessage.pointer.y)),
            };
        const id = appendFriendlyWidgetPreset(preset, position, {
          mode: freeInside ? 'absolute-in-container' : nextDropTarget ? 'flow' : 'absolute',
          placement: nextDropTarget?.mode,
          containerBlockId: nextDropTarget?.containerBlockId ?? nextDropTarget?.blockId ?? null,
          siblingBlockId: nextDropTarget?.siblingBlockId ?? null,
        });
        setIframeEditDropTarget(null);
        if (id) setSelected(id, 'preview');
        return;
      }
      if (editMessage?.type === 'r20:edit-context-menu') {
        if (editMessage.bridgeId !== iframeEditBridgeIdRef.current) return;
        if (useUiStore.getState().mainMode !== 'edit') return;
        const adapter = getBlocklyAdapter();
        if (!adapter.getBlock('html', editMessage.blockId)) return;
        const iframe = iframeRef.current;
        if (!iframe) return;
        const rect = iframe.getBoundingClientRect();
        const scaleX = iframe.offsetWidth > 0 ? rect.width / iframe.offsetWidth : 1;
        const scaleY = iframe.offsetHeight > 0 ? rect.height / iframe.offsetHeight : scaleX;
        setSelected(editMessage.blockId, 'preview');
        setContextMenuState({
          blockId: editMessage.blockId,
          x: rect.left + editMessage.pointer.x * scaleX,
          y: rect.top + editMessage.pointer.y * scaleY,
        });
        return;
      }
      const data = e.data;
      if (data?.type === 'r20:select' && typeof data.blockId === 'string') {
        setSelected(data.blockId, 'preview');
        return;
      }
      if (data?.type === 'r20:resize' && typeof data.height === 'number') {
        const nextHeight = Math.max(120, Math.min(60000, Math.ceil(data.height)));
        // Keep the iframe host at least as tall as the sheet. A wide threshold
        // hides small but real content growth and can clip the final rows.
        setIframeHeight((prev) => (Math.abs(prev - nextHeight) >= 1 ? nextHeight : prev));
        if (
          !autoWidthSizedRef.current
          && canvasWidthAuto
          && typeof data.width === 'number'
        ) {
          autoWidthSizedRef.current = true;
          const nextWidth = editSubmode === 'rolltemplate'
            ? Math.max(200, Math.min(600, Math.ceil(data.width)))
            : Math.max(320, Math.min(2000, Math.ceil(data.width)));
          const currentWidth = editSubmode === 'rolltemplate'
            ? useUiStore.getState().rolltemplateCanvasWidth
            : useUiStore.getState().sheetCanvasWidth;
          if (Math.abs(nextWidth - currentWidth) > 8) {
            setAutoCanvasWidth(nextWidth);
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
  }, [canvasWidthAuto, editSubmode, iframeDocumentSrcdoc, setAutoCanvasWidth, setHoveredWidgetId, setSelected, setSelectedWidgetId]);

  useEffect(() => {
    if (!iframeEditBridgeId) return;
    if (lastAppliedSourceRef.current === srcdoc) return;
    if (!iframeRef.current?.contentWindow) return;
    const revision = applyRevisionRef.current + 1;
    applyRevisionRef.current = revision;
    applySourcesRef.current.set(revision, srcdoc);
    pendingApplySourceRef.current = srcdoc;
    // A persistent iframe first reports the empty/default document width. Let
    // each applied sheet source report its own intrinsic width while manual
    // width input remains authoritative until the user resets automatic sizing.
    autoWidthSizedRef.current = false;
    setPendingApplyRevision(revision);
    const chunked = livePatch.html.length > 300000;
    const messages: Array<Record<string, unknown>> = chunked
      ? (() => {
          const chunkSize = 32000;
          const totalChunks = Math.ceil(livePatch.html.length / chunkSize);
          const { html, ...metadata } = livePatch;
          const start = {
            type: 'r20:edit-apply-chunk-start',
            protocol: R20_IFRAME_EDIT_PROTOCOL,
            bridgeId: iframeEditBridgeId,
            revision,
            htmlLength: html.length,
            totalChunks,
            ...metadata,
          };
          const chunks = [];
          for (let index = 0; index < totalChunks; index += 1) {
            chunks.push({
              type: 'r20:edit-apply-chunk',
              protocol: R20_IFRAME_EDIT_PROTOCOL,
              bridgeId: iframeEditBridgeId,
              revision,
              index,
              text: html.slice(index * chunkSize, (index + 1) * chunkSize),
            });
          }
          return [start, ...chunks];
        })()
      : [{
          type: 'r20:edit-apply',
          protocol: R20_IFRAME_EDIT_PROTOCOL,
          bridgeId: iframeEditBridgeId,
          revision,
          ...livePatch,
        }];
    let retryTimer: number | null = null;
    let attempts = 0;
    const send = () => {
      const currentFrame = iframeRef.current;
      const currentTarget = currentFrame?.contentWindow;
      if (
        iframeEditBridgeIdRef.current !== iframeEditBridgeId
        || pendingApplySourceRef.current !== srcdoc
      ) return;
      if (!currentTarget) return;
      try {
        messages.forEach((message) => currentTarget.postMessage(message, '*'));
      } catch {
        setPendingApplyRevision(0);
        pendingApplySourceRef.current = null;
        applySourcesRef.current.delete(revision);
        return;
      }
      attempts += 1;
      if (attempts < (chunked ? 10 : 60)) retryTimer = window.setTimeout(send, 50);
    };
    send();
    return () => {
      if (retryTimer !== null) window.clearTimeout(retryTimer);
    };
  }, [iframeEditBridgeId, iframeLoadRevision, lastApplyAck, livePatch, srcdoc]);

  useEffect(() => {
    if (!iframeEditBridgeId) return;
    const target = iframeRef.current?.contentWindow;
    if (!target) return;
    target.postMessage({
      type: 'r20:edit-mode',
      protocol: R20_IFRAME_EDIT_PROTOCOL,
      bridgeId: iframeEditBridgeId,
      enabled: mainMode === 'edit',
      selectedBlockId: selectedId,
    }, '*');
  }, [iframeEditBridgeId, mainMode, selectedId, lastApplyAck]);

  useEffect(() => {
    if (mainMode === 'edit') return;
    const frame = window.requestAnimationFrame(() => setContextMenuState(null));
    return () => window.cancelAnimationFrame(frame);
  }, [mainMode]);

  // 선택된 블록 → iframe 안 highlight.
  useEffect(() => {
    if (!selectedId) return;
    const w = iframeRef.current?.contentWindow;
    if (!w) return;
    w.postMessage({ type: 'r20:highlight', blockId: selectedId }, '*');
  }, [selectedId, lastApplyAck]);

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
    <div
      className="relative flex h-full min-h-0 flex-col"
      data-r20-edit-bridge-ready={iframeEditBridgeId ? '1' : '0'}
      data-r20-apply-pending={pendingApplyRevision || ''}
      data-r20-apply-acked={lastApplyAck || ''}
    >
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
              width: `${canvasWidth * scale}px`,
              height: `${iframeHeight * scale}px`,
              maxWidth: 'none',
            }}
          >
            <div
              className={`relative origin-top ${
              renderMode === 'iframe' ? 'bg-transparent' : 'bg-white shadow-lg ring-1 ring-border'
            }`}
            style={{
              width: `${canvasWidth}px`,
              height: `${iframeHeight}px`,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
          >
            {renderMode === 'iframe' ? (
              <iframe
                ref={iframeRef}
                data-testid="preview-iframe"
                title="시트 미리보기"
                sandbox={sandbox}
                srcDoc={iframeDocumentSrcdoc}
                onLoad={() => setIframeLoadRevision((value) => value + 1)}
                className="block w-full border-0"
                style={{ width: `${canvasWidth}px`, height: `${iframeHeight}px` }}
              />
            ) : (
              <div
                ref={hostRef}
                data-testid="preview-shadow-host"
                className="block h-[calc(100vh-220px)] w-full overflow-auto"
              />
            )}
            {renderMode === 'iframe' && mainMode === 'edit' && iframeEditOverlay && (
              <div
                aria-hidden="true"
                data-testid="iframe-edit-overlay"
                data-r20-block-id={iframeEditOverlay.blockId}
                data-r20-edit-phase={iframeEditOverlay.phase}
                data-r20-pointer-id={iframeEditOverlay.pointerId}
                data-r20-hit-path-length={iframeEditOverlay.hitPath.length}
                data-r20-offset-parent-block-id={iframeEditOverlay.subject.offsetParentBlockId ?? ''}
                className="pointer-events-none absolute z-20 border-2 border-amber-500 bg-amber-400/10"
                style={{
                  left: `${iframeEditOverlay.rect.left + iframeEditDragDelta.x}px`,
                  top: `${iframeEditOverlay.rect.top + iframeEditDragDelta.y}px`,
                  width: `${iframeEditOverlay.rect.width}px`,
                  height: `${iframeEditOverlay.rect.height}px`,
                  boxSizing: 'border-box',
                }}
              />
            )}
            {renderMode === 'iframe' && mainMode === 'edit' && iframeEditDropTarget && (
              <div
                aria-hidden="true"
                data-testid="iframe-edit-drop-overlay"
                data-r20-drop-target-id={iframeEditDropTarget.blockId}
                data-r20-drop-mode={iframeEditDropTarget.mode}
                className={`pointer-events-none absolute z-30 border-2 ${
                  iframeEditDropTarget.mode === 'inside'
                    ? 'border-rose-500 bg-rose-400/10'
                    : 'border-teal-500 bg-teal-400/10'
                }`}
                style={{
                  left: `${iframeEditDropTarget.geometry.rect.left}px`,
                  top: `${iframeEditDropTarget.geometry.rect.top}px`,
                  width: `${iframeEditDropTarget.geometry.rect.width}px`,
                  height: `${iframeEditDropTarget.geometry.rect.height}px`,
                  boxSizing: 'border-box',
                }}
              />
            )}
            </div>
          </div>
        )}
      </div>
      {contextMenuState && mainMode === 'edit' && (
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

