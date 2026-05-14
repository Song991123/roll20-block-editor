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

/**
 * 새 UX 셸 — Preview-first 3-zone grid.
 *
 * Anchor: docs/spec/08_wireframes.md W2 + docs/spec/10_system_architecture.md §3.
 *
 *   ┌────────────────── EditorHeader (56px) ──────────────────┐
 *   │  로고  [예시][불러오기]      [저장][다운로드] ⚙ ?         │
 *   ├──────────┬───────────────────────────────┬──────────────┤
 *   │ Sidebar  │                               │  Sidebar     │
 *   │ Left     │      PreviewMain (iframe)     │  Right       │
 *   │ 280px    │      (메인, fit-to-width)      │  320px       │
 *   │          │                               │              │
 *   ├──────────┴───────────────────────────────┴──────────────┤
 *   │  Statusbar (32px) — 블록 수 · 저장 · v0.x · 워크스페이스  │
 *   └─────────────────────────────────────────────────────────┘
 *
 * BlocklyModelHost = hidden div, Blockly workspace 3개 (HTML/CSS/i18n) mount.
 * 사용자 안 보임 — model API 만 사용 (D51).
 */
export default function EditorShell() {
  const leftCollapsed = useUiStore((s) => s.sidebarLeftCollapsed);
  const rightCollapsed = useUiStore((s) => s.sidebarRightCollapsed);
  const rightWidth = useUiStore((s) => s.sidebarRightWidth);
  const toggleLeft = useUiStore((s) => s.toggleSidebarLeft);
  const toggleRight = useUiStore((s) => s.toggleSidebarRight);
  const setLeftMode = useUiStore((s) => s.setSidebarLeftMode);
  const setRightTab = useUiStore((s) => s.setSidebarRightTab);

  // Stage S§11 — 글로벌 단축키 (Cmd+1~4 mode 전환 / Cmd+[ Cmd+] collapse)
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
  }, [toggleLeft, toggleRight, setLeftMode, setRightTab]);

  const leftWidth = leftCollapsed ? 'var(--sidebar-left-collapsed)' : 'var(--sidebar-left-w)';
  const rightWidthPx = rightCollapsed ? '0px' : `${rightWidth}px`;

  return (
    <div className="flex h-screen flex-col bg-[var(--bg-app)] text-foreground">
      <EditorHeader />
      <BlocklyModelHost />
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
          <PreviewMain />
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
