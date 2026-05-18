'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { cn } from '@/lib/utils/cn';
import { useUiStore, type MainMode } from '@/lib/stores/uiStore';
import EditorHeader from './EditorHeader';
import SidebarLeft from './SidebarLeft';
import SidebarRight from './SidebarRight';
import PreviewMain from './PreviewMain';
import EditCanvas from './EditCanvas';
import Statusbar from './Statusbar';
import AutosaveBanner from './AutosaveBanner';
import dynamic from 'next/dynamic';
import { useEmitPipeline } from '@/lib/preview/useEmitPipeline';
import { installPerfHook } from '@/lib/perf/hook';
import MainAreaToolbar from './MainAreaToolbar';
import WorkspaceSubToolbar from './WorkspaceSubToolbar';
import { installAutosave } from '@/lib/persist/autosave';
import { loadWorkspace, AUTOSAVE_KEY, type SavedRecord } from '@/lib/persist/indexeddb';
import { useSettingsStore } from '@/lib/stores/settingsStore';

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
  const setMainMode = useUiStore((s) => s.setMainMode);
  const mainSplit = useUiStore((s) => s.mainSplit);
  const setMainSplit = useUiStore((s) => s.setMainSplit);
  const leftCollapsed = useUiStore((s) => s.sidebarLeftCollapsed);
  const rightCollapsed = useUiStore((s) => s.sidebarRightCollapsed);
  const rightWidth = useUiStore((s) => s.sidebarRightWidth);
  const toggleLeft = useUiStore((s) => s.toggleSidebarLeft);
  const toggleRight = useUiStore((s) => s.toggleSidebarRight);
  const setLeftMode = useUiStore((s) => s.setSidebarLeftMode);
  const setRightTab = useUiStore((s) => s.setSidebarRightTab);

  const splitContainerRef = useRef<HTMLDivElement>(null);

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
      } else if (e.key === '2') {
        e.preventDefault();
        setLeftMode('tree');
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

  const leftWidth = leftCollapsed ? 'var(--sidebar-left-collapsed)' : 'var(--sidebar-left-w)';
  const rightWidthPx = rightCollapsed ? '0px' : `${rightWidth}px`;

  // edit 모드 = workspace/preview 둘 다 hidden, EditCanvas 만 표시.
  const workspaceVisible = mainMode !== 'preview' && mainMode !== 'edit';
  const previewVisible = mainMode !== 'assemble' && mainMode !== 'edit';

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
  let workspaceStyle: CSSProperties = {};
  let previewStyle: CSSProperties = {};
  let editStyle: CSSProperties = { width: 0, flexShrink: 0, overflow: 'hidden', pointerEvents: 'none' };
  if (mainMode === 'split') {
    workspaceStyle = { width: `${mainSplit.left}%`, flexShrink: 0 };
    previewStyle = { width: `${mainSplit.right}%`, flexShrink: 0 };
  } else if (mainMode === 'assemble') {
    workspaceStyle = { flex: '1 1 auto' };
    previewStyle = { width: 0, flexShrink: 0, overflow: 'hidden', pointerEvents: 'none' };
  } else if (mainMode === 'preview') {
    workspaceStyle = { width: 0, flexShrink: 0, overflow: 'hidden', pointerEvents: 'none' };
    previewStyle = { flex: '1 1 auto' };
  } else {
    // mainMode === 'edit'
    workspaceStyle = { width: 0, flexShrink: 0, overflow: 'hidden', pointerEvents: 'none' };
    previewStyle = { width: 0, flexShrink: 0, overflow: 'hidden', pointerEvents: 'none' };
    editStyle = { flex: '1 1 auto' };
  }

  return (
    <div className="app-shell dark flex h-screen flex-col bg-[var(--bg-app)] text-foreground">
      <EditorHeader />
      {recovered && (
        <AutosaveBanner
          xml={recovered.xml}
          meta={recovered.meta}
          onDismiss={() => setRecovered(null)}
        />
      )}
      <main
        className="grid flex-1 min-h-0"
        style={{
          gridTemplateColumns: `${leftWidth} 1fr ${rightWidthPx}`,
          transition: 'grid-template-columns 180ms ease',
        }}
      >
        <aside
          className={cn(
            'flex flex-col border-r border-border bg-[var(--bg-elevated)] min-h-0 overflow-hidden',
            leftCollapsed && 'items-stretch',
          )}
        >
          <SidebarLeft collapsed={leftCollapsed} />
        </aside>

        <section className="relative flex flex-col min-w-0 min-h-0 bg-[var(--bg-canvas)]">
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
                <BlocklyModelHost visible={workspaceVisible} />
              </div>
            </div>

            {mainMode === 'split' && <Resizer onResize={onResize} />}

            <div
              className="relative flex flex-col min-h-0"
              style={previewStyle}
              data-testid="preview-pane"
              data-visible={previewVisible ? 'true' : 'false'}
            >
              {previewVisible && <PreviewMain />}
            </div>

            <div
              className="relative flex flex-col min-h-0"
              style={editStyle}
              data-testid="edit-pane"
              data-visible={editVisible ? 'true' : 'false'}
            >
              {editVisible && <EditCanvas />}
            </div>
          </div>
        </section>

        <aside
          className={cn(
            'flex flex-col border-l border-border bg-[var(--bg-elevated)] min-h-0 overflow-hidden',
            rightCollapsed && 'border-l-0',
          )}
        >
          {!rightCollapsed && <SidebarRight />}
        </aside>
      </main>
      <Statusbar />
    </div>
  );
}
