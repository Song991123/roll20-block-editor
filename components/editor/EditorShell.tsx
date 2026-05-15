'use client';

import { useCallback, useEffect, useRef, type CSSProperties, type MouseEvent } from 'react';
import { cn } from '@/lib/utils/cn';
import { useUiStore, type MainMode } from '@/lib/stores/uiStore';
import EditorHeader from './EditorHeader';
import SidebarLeft from './SidebarLeft';
import SidebarRight from './SidebarRight';
import PreviewMain from './PreviewMain';
import Statusbar from './Statusbar';
import BlocklyModelHost from './BlocklyModelHost';
import MainAreaToolbar from './MainAreaToolbar';
import WorkspaceSubToolbar from './WorkspaceSubToolbar';

/**
 * 새 UX 셸 — Preview-first 3-zone grid + 메인 영역 분할 뷰 (D26 ②-재재).
 *
 * Anchor: docs/spec/08_wireframes.md W2 + docs/spec/10_system_architecture.md §3.
 *
 *   ┌────────────────── EditorHeader (56px) ──────────────────────────┐
 *   │  로고  [예시][불러오기]      [저장][다운로드] ⚙ ?                 │
 *   ├──────────┬────────────────────────────────────┬─────────────────┤
 *   │ Sidebar  │  MainAreaToolbar  [⬌][🟦][📄]     │  Sidebar        │
 *   │ Left     │  ────────────────────────────────  │  Right          │
 *   │ 280px    │  [HTML CSS i18n][zoom][cleanUp]    │  320px          │
 *   │          │  ┌─Workspace──┃─Preview───────┐   │                 │
 *   │          │  │ Blockly    ┃  iframe       │   │                 │
 *   │          │  │            ↑               │   │                 │
 *   │          │  │     resizer (col-resize)   │   │                 │
 *   │          │  └────────────┴───────────────┘   │                 │
 *   │          │                  PreviewToolbar    │                 │
 *   ├──────────┴────────────────────────────────────┴─────────────────┤
 *   │  Statusbar (32px)                                                │
 *   └──────────────────────────────────────────────────────────────────┘
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
  if (m === 'split') return 'assemble';
  if (m === 'assemble') return 'preview';
  return 'split';
}

export default function EditorShell() {
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

  // Stage S§11 — 글로벌 단축키.
  // Cmd+B = 메인 모드 cycle (split → assemble → preview → split)
  // Cmd+[ Cmd+] = 사이드바 collapse
  // Cmd+1~4 = 좌측 mode / 우측 tab 전환
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

  const workspaceVisible = mainMode !== 'preview';
  const previewVisible = mainMode !== 'assemble';

  // onResize 는 dependency-free — store 의 최신 mainSplit 을 매 호출 시 getState 로 직접 읽음.
  // 이전 버전은 `[mainSplit.left]` 를 deps 로 박았는데, mousemove 이벤트가
  // 같은 tick 안에 연속 발생하면 closure 가 stale 상태를 잡고 있어서 결과적으로
  // 한 번의 drag 가 ~20px 이상 이동을 못 했음. fresh getState 로 그 문제 해소.
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

  // 각 pane 의 width style — mode 별 다름.
  let workspaceStyle: CSSProperties = {};
  let previewStyle: CSSProperties = {};
  if (mainMode === 'split') {
    workspaceStyle = { width: `${mainSplit.left}%`, flexShrink: 0 };
    previewStyle = { width: `${mainSplit.right}%`, flexShrink: 0 };
  } else if (mainMode === 'assemble') {
    workspaceStyle = { flex: '1 1 auto' };
    previewStyle = { width: 0, flexShrink: 0, overflow: 'hidden', pointerEvents: 'none' };
  } else {
    // preview
    workspaceStyle = { width: 0, flexShrink: 0, overflow: 'hidden', pointerEvents: 'none' };
    previewStyle = { flex: '1 1 auto' };
  }

  return (
    <div className="flex h-screen flex-col bg-[var(--bg-app)] text-foreground">
      <EditorHeader />
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
            {/* Workspace pane — 항상 DOM 에 있어야 Blockly state 유지. width 로만 토글. */}
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

            {/* Resizer — 분할 모드일 때만 */}
            {mainMode === 'split' && <Resizer onResize={onResize} />}

            {/* Preview pane — workspace 와 동일 구조. */}
            <div
              className="relative flex flex-col min-h-0"
              style={previewStyle}
              data-testid="preview-pane"
              data-visible={previewVisible ? 'true' : 'false'}
            >
              {previewVisible && <PreviewMain />}
            </