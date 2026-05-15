'use client';

import { useEffect } from 'react';
import { cn } from '@/lib/utils/cn';
import { useUiStore } from '@/lib/stores/uiStore';
import EditorHeader from './EditorHeader';
import SidebarLeft from './SidebarLeft';
import SidebarRight from './SidebarRight';
import PreviewMain from './PreviewMain';
import Statusbar from './Statusbar';
import BlocklyModelHost from './BlocklyModelHost';
import MainAreaToolbar from './MainAreaToolbar';

/**
 * 새 UX 셸 — Preview-first 3-zone grid + 메인 영역 [조립]/[미리보기] 토글 (D26 ② 재).
 *
 * Anchor: docs/spec/08_wireframes.md W2 + docs/spec/10_system_architecture.md §3.
 *
 *   ┌────────────────── EditorHeader (56px) ──────────────────┐
 *   │  로고  [예시][불러오기]      [저장][다운로드] ⚙ ?         │
 *   ├──────────┬───────────────────────────────┬──────────────┤
 *   │ Sidebar  │  MainAreaToolbar (h-10)       │  Sidebar     │
 *   │ Left     │  [조립][미리보기]  [HTML CSS i18n]│  Right       │
 *   │ 280px    │  ─────────────────────────────│  320px       │
 *   │          │  조립 = visible Blockly       │              │
 *   │          │  미리보기 = iframe srcdoc     │              │
 *   │          │                               │              │
 *   ├──────────┴───────────────────────────────┴──────────────┤
 *   │  Statusbar (32px) — 블록 수 · 저장 · v0.x · 워크스페이스  │
 *   └─────────────────────────────────────────────────────────┘
 *
 * BlocklyModelHost — 항상 mount, visible prop 으로 메인 영역 fill or off-screen.
 *   - mainMode='assemble' = 메인 영역에 visible, 사용자 드래그/스냅/줌 가능.
 *   - mainMode='preview' = off-screen, 모델만 유지 (PreviewMain emit 그대로 사용).
 */
export default function EditorShell() {
  const mainMode = useUiStore((s) => s.mainMode);
  const setMainMode = useUiStore((s) => s.setMainMode);
  const leftCollapsed = useUiStore((s) => s.sidebarLeftCollapsed);
  const rightCollapsed = useUiStore((s) => s.sidebarRightCollapsed);
  const rightWidth = useUiStore((s) => s.sidebarRightWidth);
  const toggleLeft = useUiStore((s) => s.toggleSidebarLeft);
  const toggleRight = useUiStore((s) => s.toggleSidebarRight);
  const setLeftMode = useUiStore((s) => s.setSidebarLeftMode);
  const setRightTab = useUiStore((s) => s.setSidebarRightTab);

  // Stage S§11 — 글로벌 단축키.
  // Cmd+B = 메인 모드 토글 (assemble ↔ preview)
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
        setMainMode(mainMode === 'assemble' ? 'preview' : 'assemble');
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

  const assembleVisible = mainMode === 'assemble';

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
          {/* 메인 영역 contents — relative 컨테이너로 BlocklyModelHost / PreviewMain 둘 다 안에 mount.
              BlocklyModelHost 는 항상 mount (워크스페이스 alive 유지). visible prop 으로 위치 토글. */}
          <div className="relative flex-1 min-h-0">
            <BlocklyModelHost visible={assembleVisible} />
            {/* PreviewMain — mainMode='preview' 일 때만 렌더 (emit pipeline 까지 살아있음 — workspaceStore 변경 시 자동 재emit). */}
            {!assembleVisible && (
              <div className="absolute inset-0">
                <PreviewMain />
              </div>
            )}
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
