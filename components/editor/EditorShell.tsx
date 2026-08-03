'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { cn } from '@/lib/utils/cn';
import { useUiStore, type MainMode } from '@/lib/stores/uiStore';
import EditorHeader from './EditorHeader';
import SidebarLeft from './SidebarLeft';
import SidebarRight from './SidebarRight';
import PreviewMain from './PreviewMain';
import EditCanvas from './EditCanvas';
import RolltemplateEditSurface from './RolltemplateEditSurface';
import Statusbar from './Statusbar';
import AutosaveBanner from './AutosaveBanner';
import dynamic from 'next/dynamic';
import { useEmitPipeline } from '@/lib/preview/useEmitPipeline';
import { installPerfHook } from '@/lib/perf/hook';
import MainAreaToolbar from './MainAreaToolbar';
import WorkspaceSubToolbar from './WorkspaceSubToolbar';
import EmptyCanvasHint from './EmptyCanvasHint';
import {
  EDIT_SURFACE_TOOLBAR_HEIGHT_PX,
  getEditLayerPanelTrack,
  shouldOverlayEditLayerPanel,
} from '@/lib/editor/editSurfaceLayout';
import { installAutosave } from '@/lib/persist/autosave';
import { loadWorkspace, AUTOSAVE_KEY, type SavedRecord } from '@/lib/persist/indexeddb';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { useChatStore } from '@/lib/stores/chatStore';
import { ROLL20_CHAT_PANEL_MIN_WIDTH } from '@/lib/dice/roll20ChatGeometry';
import { useIsMobile } from './useIsMobile';
import { WORKSPACE_KEYS, useWorkspaceStore } from '@/lib/stores/workspaceStore';
import { MAX_SVG_BLOCKS } from '@/lib/blockly/renderPolicy';

/**
 * 새 UX 셸 — Preview-first 3-zone grid + 메인 영역 분할 뷰 (D26 ②-재재).
 *
 * Anchor: docs/spec/08_wireframes.md W2 + docs/spec/10_system_architecture.md §3.
 *
 * BlocklyModelHost — 항상 mount, visible prop 으로 메인 영역 fill or off-screen.
 *   - mainMode='split' / 'assemble' = workspace pane 안에 visible.
 *   - mainMode='preview' = off-screen (모델만 유지, emit pipeline 정상).
 */

const MIN_PANE_PX = 280;

function Resizer({ onResize }: { onResize: (deltaX: number) => void }) {
  const onMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    let lastX = e.clientX;
    const handleMove = (ev: globalThis.MouseEvent) => {
      const dx = ev.clientX - lastX;
      lastX = ev.clientX;
      if (dx !== 0) onResize(dx);
    };
    const handleUp = () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="메인 영역 크기 조절"
      tabIndex={0}
      className="main-resizer"
      onMouseDown={onMouseDown}
      data-testid="main-resizer"
    />
  );
}

function cycleMode(m: MainMode): MainMode {
  if (m === 'split') return 'edit';
  if (m === 'edit') return 'assemble';
  if (m === 'assemble') return 'preview';
  return 'split';
}

/**
 * BlocklyModelHost dynamic import — Blockly 12 코어 (~500KB) 를 별도 chunk 로 split.
 * cold-load critical path 단축 + 첫 assemble entry 까지 chunk 로딩이 idle 시간에 진행.
 *
 * ssr:false — Blockly 는 window/SVG 접근 → server-render 시 즉시 throw.
 * loading: null — preview / edit 모드에서는 placeholder 도 보일 일 없음 (off-screen).
 */
const BlocklyModelHost = dynamic(() => import('./BlocklyModelHost'), {
  ssr: false,
  loading: () => null,
});

export default function EditorShell() {
  // emit pipeline — mainMode 무관, 항상 mount → import 후 Code 탭 즉시 반영.
  useEmitPipeline();

  // window.__perfHook — localStorage.__perfOn=1 시만 활성.
  useEffect(() => { installPerfHook(); }, []);

  // Autosave (spec 22) — settings.autosave 가 ON 일 때만 install.
  // install 은 idempotent (두 번째 호출 no-op) — autosave 토글이 ON 으로 바뀔
  // 때 다시 호출해서 안전. 토글 OFF 시 cleanup 반환된 unsub 호출 → timer + sub 해제.
  const autosaveEnabled = useSettingsStore((s) => s.autosave);
  useEffect(() => {
    if (!autosaveEnabled) return;
    const cleanup = installAutosave();
    return cleanup;
  }, [autosaveEnabled]);

  // Mount 시 직전 자동저장 발견하면 배너로 묻는다.
  // BlocklyModelHost 가 mount 되어 adapter.registerWorkspace 가 끝난 후에야
  // hydrate 가능 → setTimeout 으로 next-tick 에 호출 (mount 보장 X 이지만,
  // 사용자가 [복구] 누르는 데 충분한 delay 가 있음).
  const [recovered, setRecovered] = useState<SavedRecord | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const rec = await loadWorkspace(AUTOSAVE_KEY);
        if (!alive || !rec || !rec.xml) return;
        setRecovered(rec);
      } catch {
        // graceful — IDB 미지원 / 권한 등 → 그냥 배너 안 띄움.
      }
    })();
    return () => { alive = false; };
  }, []);
  const mainMode = useUiStore((s) => s.mainMode);
  const editSubmode = useUiStore((s) => s.editSubmode);
  const editLayerPanelWidth = useUiStore((s) => s.editLayerPanelWidth);
  const setMainMode = useUiStore((s) => s.setMainMode);
  const mainSplit = useUiStore((s) => s.mainSplit);
  const setMainSplit = useUiStore((s) => s.setMainSplit);
  const leftCollapsed = useUiStore((s) => s.sidebarLeftCollapsed);
  const rightCollapsed = useUiStore((s) => s.sidebarRightCollapsed);
  const rightWidth = useUiStore((s) => s.sidebarRightWidth);
  const rightTab = useUiStore((s) => s.sidebarRightTab);
  const chatCount = useChatStore((s) => s.rolls.length);
  const toggleLeft = useUiStore((s) => s.toggleSidebarLeft);
  const toggleRight = useUiStore((s) => s.toggleSidebarRight);
  const setLeftMode = useUiStore((s) => s.setSidebarLeftMode);
  const setRightTab = useUiStore((s) => s.setSidebarRightTab);
  const resetCanvasWidths = useUiStore((s) => s.resetCanvasWidths);
  const hasLargeWorkspace = useWorkspaceStore((s) =>
    WORKSPACE_KEYS.some((key) => s.workspaces[key].blockCount > MAX_SVG_BLOCKS),
  );

  // 반응형 셸 (design-reset) — 920px 이하에서는 사이드바가 서랍(드로어)이 된다.
  // 모바일 진입 시 열려 있던 사이드바를 접어 시트가 화면을 가리지 않게 한다.
  // (기존 uiStore 토글 액션만 사용 — 상태 구조/기능 변경 없음.)
  const isMobile = useIsMobile();
  useEffect(() => {
    if (!isMobile) return;
    const st = useUiStore.getState();
    if (mainMode === 'split') setMainMode('edit');
    if (!st.sidebarLeftCollapsed) st.toggleSidebarLeft();
    if (!st.sidebarRightCollapsed) st.toggleSidebarRight();
  }, [isMobile, mainMode, setMainMode]);

  const splitContainerRef = useRef<HTMLDivElement>(null);
  const [compactEditLayerPanel, setCompactEditLayerPanel] = useState(false);

  useLayoutEffect(() => {
    const node = splitContainerRef.current;
    if (!node) return;
    const update = () => {
      setCompactEditLayerPanel(shouldOverlayEditLayerPanel(node.getBoundingClientRect().width));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (mainMode !== 'edit' || editSubmode !== 'rolltemplate') return;
    const ui = useUiStore.getState();
    if (ui.sidebarRightCollapsed) ui.toggleSidebarRight();
    if (ui.sidebarRightTab !== 'attrs') ui.setSidebarRightTab('attrs');
  }, [editSubmode, mainMode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const cmd = e.metaKey || e.ctrlKey;
      if (!cmd) return;
      if (e.key === '[') {
        e.preventDefault();
        toggleLeft();
      } else if (e.key === ']') {
        e.preventDefault();
        toggleRight();
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        setMainMode(cycleMode(mainMode));
      } else if (e.key === '1') {
        e.preventDefault();
        setLeftMode('blocks');
      } else if (e.key === '3') {
        e.preventDefault();
        setRightTab('attrs');
      } else if (e.key === '4') {
        e.preventDefault();
        setRightTab('code');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleLeft, toggleRight, setLeftMode, setRightTab, setMainMode, mainMode]);

  const previewFocus = mainMode === 'preview';
  // Preview hides editor chrome until a roll exists. Once ChatPane has a
  // result, keep that one user-facing surface visible beside the same sheet.
  const previewChatVisible = previewFocus && rightTab === 'chat' && chatCount > 0;
  const leftWidth = previewFocus || leftCollapsed ? '0px' : 'var(--sidebar-left-w)';
  const effectiveRightWidth = rightTab === 'chat'
    ? Math.max(rightWidth, ROLL20_CHAT_PANEL_MIN_WIDTH)
    : rightWidth;
  const rightWidthPx = (previewFocus && !previewChatVisible) || rightCollapsed
    ? '0px'
    : `${effectiveRightWidth}px`;

  // Keep one canonical Roll20 iframe mounted across preview and edit. In edit
  // mode the same pane is placed over the canvas slot while EditCanvas owns
  // only the toolbar/layer chrome beneath it.
  const workspaceVisible = mainMode !== 'preview' && mainMode !== 'edit';
  const previewVisible = mainMode !== 'assemble';
  const renderWorkspaceSvg = workspaceVisible && !hasLargeWorkspace;

  // onResize: store getState() 로 fresh 읽기 — deps 가 [setMainSplit] 만 → stable callback.
  // 이전: deps=[mainSplit.left] → mousemove 다발 발생 시 closure stale → 한 drag 가 ~20px 한계.
  const onResize = useCallback(
    (deltaX: number) => {
      const node = splitContainerRef.current;
      if (!node) return;
      const totalW = node.getBoundingClientRect().width;
      const minTotal = MIN_PANE_PX * 2 + 6;
      if (totalW < minTotal) return;
      const freshLeft = useUiStore.getState().mainSplit.left;
      const currentLeftPx = (freshLeft / 100) * totalW;
      let nextLeftPx = currentLeftPx + deltaX;
      nextLeftPx = Math.max(MIN_PANE_PX, Math.min(totalW - MIN_PANE_PX - 6, nextLeftPx));
      const nextLeftPct = (nextLeftPx / totalW) * 100;
      setMainSplit(nextLeftPct, 100 - nextLeftPct);
    },
    [setMainSplit],
  );

  // edit 모드는 캔버스 자체가 full pane.
  const editVisible = mainMode === 'edit';
  const rolltemplateEditVisible = editVisible && editSubmode === 'rolltemplate';
  const layerPanelOverlay = isMobile || compactEditLayerPanel;
  const editLayerPanelTrack = layerPanelOverlay ? '0px' : getEditLayerPanelTrack(editLayerPanelWidth);
  const hiddenPaneStyle: CSSProperties = {
    width: 0,
    flexShrink: 0,
    overflow: 'hidden',
    pointerEvents: 'none',
    visibility: 'hidden',
  };
  let workspaceStyle: CSSProperties = {};
  let previewStyle: CSSProperties = {};
  let editStyle: CSSProperties = hiddenPaneStyle;
  let rolltemplateEditStyle: CSSProperties = hiddenPaneStyle;
  if (mainMode === 'split') {
    workspaceStyle = { width: `${mainSplit.left}%`, flexShrink: 0 };
    previewStyle = { width: `${mainSplit.right}%`, flexShrink: 0 };
  } else if (mainMode === 'assemble') {
    workspaceStyle = { flex: '1 1 auto' };
    previewStyle = hiddenPaneStyle;
  } else if (mainMode === 'preview') {
    workspaceStyle = hiddenPaneStyle;
    previewStyle = { flex: '1 1 auto' };
  } else {
    // mainMode === 'edit'
    workspaceStyle = hiddenPaneStyle;
    previewStyle = {
      position: 'absolute',
      left: editLayerPanelTrack,
      top: EDIT_SURFACE_TOOLBAR_HEIGHT_PX,
      right: 0,
      bottom: 0,
      zIndex: 20,
      minWidth: 0,
      background: 'var(--bg-canvas)',
      visibility: rolltemplateEditVisible ? 'hidden' : 'visible',
      pointerEvents: rolltemplateEditVisible ? 'none' : 'auto',
    };
    if (rolltemplateEditVisible) {
      rolltemplateEditStyle = {
        position: 'absolute',
        left: editLayerPanelTrack,
        top: EDIT_SURFACE_TOOLBAR_HEIGHT_PX,
        right: 0,
        bottom: 0,
        zIndex: 21,
        minWidth: 0,
        background: 'var(--bg-canvas)',
      };
    }
    editStyle = { flex: '1 1 auto' };
  }

  return (
    <div
      className="app-shell pastel flex h-screen flex-col bg-[var(--bg-app)] text-foreground"
      data-preview-focus={previewFocus ? 'true' : 'false'}
    >
      <EditorHeader onNewSheet={() => {
        resetCanvasWidths();
        setRecovered(null);
      }} />
      {recovered && (
        <AutosaveBanner
          xml={recovered.xml}
          meta={recovered.meta}
          onDismiss={() => setRecovered(null)}
        />
      )}
      <main
        className="editor-main grid flex-1 min-h-0 gap-2.5 p-2.5"
        style={{
          gridTemplateColumns: `${leftWidth} 1fr ${rightWidthPx}`,
          transition: 'grid-template-columns 180ms ease',
        }}
      >
        <aside
          className={cn(
            'r20-shell-card flex flex-col min-h-0 overflow-hidden',
            (leftCollapsed || previewFocus) && 'border-0 shadow-none',
          )}
          aria-hidden={previewFocus}
          data-open={!leftCollapsed && !previewFocus ? 'true' : 'false'}
          data-testid="sidebar-left"
        >
          {!leftCollapsed && !previewFocus && <SidebarLeft />}
        </aside>

        <section className="r20-shell-card relative flex flex-col min-w-0 min-h-0 overflow-hidden bg-[var(--bg-canvas)]">
          <MainAreaToolbar />
          <div
            ref={splitContainerRef}
            className="relative flex flex-1 min-h-0"
            data-testid="main-split-container"
            data-main-mode={mainMode}
          >
            <div
              className="relative flex flex-col min-h-0"
              style={workspaceStyle}
              data-testid="workspace-pane"
              data-visible={workspaceVisible ? 'true' : 'false'}
            >
              {workspaceVisible && <WorkspaceSubToolbar />}
              <div className="relative flex-1 min-h-0">
                <BlocklyModelHost
                  visible={workspaceVisible}
                  renderSvg={renderWorkspaceSvg}
                />
                {workspaceVisible && <EmptyCanvasHint />}
              </div>
            </div>

            {mainMode === 'split' && <Resizer onResize={onResize} />}

            <div
              className="relative flex flex-col min-h-0"
              style={previewStyle}
              data-testid="preview-pane"
              data-visible={previewVisible && !rolltemplateEditVisible ? 'true' : 'false'}
              data-persistent-render-surface="true"
              data-edit-render-surface={mainMode === 'edit' ? 'iframe' : undefined}
              aria-hidden={previewVisible && !rolltemplateEditVisible ? undefined : true}
            >
              <PreviewMain />
            </div>

            <div
              className="relative flex min-h-0 flex-col"
              style={rolltemplateEditStyle}
              data-testid="rolltemplate-edit-pane"
              data-visible={rolltemplateEditVisible ? 'true' : 'false'}
              data-edit-render-surface="chat-renderer"
              aria-hidden={rolltemplateEditVisible ? undefined : true}
            >
              {rolltemplateEditVisible && <RolltemplateEditSurface />}
            </div>

            <div
              className="relative flex flex-col min-h-0"
              style={editStyle}
              data-testid="edit-pane"
              data-visible={editVisible ? 'true' : 'false'}
            >
              {editVisible && <EditCanvas layerPanelOverlay={layerPanelOverlay} />}
            </div>
          </div>
        </section>

        <aside
          className={cn(
            'r20-shell-card flex flex-col min-h-0 overflow-hidden',
            (rightCollapsed || (previewFocus && !previewChatVisible)) && 'border-0 shadow-none',
          )}
          aria-hidden={previewFocus && !previewChatVisible}
          data-open={!rightCollapsed && (!previewFocus || previewChatVisible) ? 'true' : 'false'}
          data-testid="sidebar-right"
        >
          {!rightCollapsed && (!previewFocus || previewChatVisible) && <SidebarRight />}
        </aside>
      </main>
      {isMobile
        && ((!leftCollapsed && !previewFocus)
          || (!rightCollapsed && (!previewFocus || previewChatVisible))) && (
        <div
          className="r20-mobile-scrim"
          aria-hidden="true"
          onClick={() => {
            const st = useUiStore.getState();
            if (!st.sidebarLeftCollapsed) st.toggleSidebarLeft();
            if (!st.sidebarRightCollapsed) st.toggleSidebarRight();
          }}
        />
      )}
      {!previewFocus && <Statusbar />}
    </div>
  );
}
