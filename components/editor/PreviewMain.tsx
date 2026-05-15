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
import { buildSheetDoc } from '@/lib/preview/buildDoc';
import PreviewToolbar from './PreviewToolbar';
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
 *   - xmlCache / sanitize / darkMode 변경 → 500ms 디바운스 후 재emit.
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
  const appendBlock = useWorkspaceStore((s) => s.appendBlockToActive);
  const setSelected = useWorkspaceStore((s) => s.setSelectedBlockId);
  const darkMode = usePreviewStore((s) => s.darkMode);
  const sanitize = usePreviewStore((s) => s.sanitize);
  const sandbox = usePreviewStore((s) => s.iframeSandbox);
  const zoom = useUiStore((s) => s.previewZoom);
  const previewLayer = useUiStore((s) => s.previewLayer);
  const setHoveredWidgetId = useUiStore((s) => s.setHoveredWidgetId);
  const setSelectedWidgetId = useUiStore((s) => s.setSelectedWidgetId);
  const selectedWidgetId = useUiStore((s) => s.selectedWidgetId);
  const hoveredWidgetId = useUiStore((s) => s.hoveredWidgetId);
  const editSubmode = useUiStore((s) => s.editSubmode);
  const sheetWidgetsList = useWorkspaceStore((s) => s.sheetWidgets);
  const rolltemplateWidgetsList = useWorkspaceStore((s) => s.rolltemplateWidgets);
  const [dragOver, setDragOver] = useState(false);

  const total = htmlCount + cssCount + i18nCount;
  const isEmpty = total === 0;
  const scale = zoom === 'fit' ? 1 : zoom;

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
      }),
    [emitHtml, emitCss, emitI18n, sanitize, darkMode, previewLayer],
  );


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
  }, [selectedWidgetId, hoveredWidgetId, editSubmode, sheetWidgetsList, rolltemplateWidgetsList, srcdoc]);

  // 미리보기 → 우측 인스펙터 sync + 굴림 결과 채팅 박음 (postMessage).
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== iframeRef.current?.contentWindow) return;
      const data = e.data;
      if (data?.type === 'r20:select' && typeof data.blockId === 'string') {
        setSelected(data.blockId, 'preview');
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
  }, [setSelected]);

  // 선택된 블록 → iframe 안 highlight.
  useEffect(() => {
    if (!selectedId) return;
    const w = iframeRef.current?.contentWindow;
    if (!w) return;
    w.postMessage({ type: 'r20:highlight', blockId: selectedId }, '*');
  }, [selectedId, srcdoc]);

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div
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
            className="mx-auto bg-white shadow-lg ring-1 ring-border"
            style={{
              width: zoom === 'fit' ? '100%' : `${850 * (typeof scale === 'number' ? scale : 1)}px`,
              maxWidth: '960px',
              transition: 'width 120ms ease',
            }}
          >
            <iframe
              ref={iframeRef}
              title="시트 미리보기"
              sandbox={sandbox}
              srcDoc={srcdoc}
              className="block h-[calc(100vh-220px)] w-full border-0"
            />
          </div>
        )}
      </div>
      <PreviewToolbar />
    </div>
  );
}

