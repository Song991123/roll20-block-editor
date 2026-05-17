'use client';

/**
 * ShadowContextMenu — Phase E WYSIWYG 우클릭 메뉴.
 *
 * Anchor: docs/spec/17_wysiwyg_mode.md §12 (Phase E).
 *
 * 미리보기 (Shadow DOM) 안 element 우클릭 → mountSheetShadow 의
 *   onContextMenu 콜백 → PreviewMain 의 contextMenuState 세팅 →
 *   본 컴포넌트가 (x, y) absolute 위치로 렌더.
 *
 * 항목 5개 (spec 17 Phase E 결정):
 *   - 속성 (inspect)  — Inspector 활성 + selectedBlockId 갱신
 *   - 삭제 (delete)   — adapter.deleteBlock
 *   - 복사 (duplicate)— adapter.duplicateBlock
 *   - 위로 이동       — adapter.moveBlockUp (없으면 toast)
 *   - 아래로 이동     — adapter.moveBlockDown (없으면 toast)
 *
 * 외부 클릭 시 onClose. Escape 키도 동일.
 *
 * 의존 0 — Radix DropdownMenu 미사용 (마우스 위치 기준 absolute 띄우기엔
 * 단순 div 가 더 짧음). 외부 클릭 감지는 `mousedown` capture phase 로
 * 메뉴 안 클릭과 구분.
 *
 * 시각: Tailwind 클래스. 메뉴 너비 ~160px, 항목 padding 6px/10px, hover
 *   = bg-accent. 다크 모드는 Tailwind 기본 (bg-popover/text-popover-foreground).
 *
 * 시스템 specific 0.
 */

import { useEffect, useRef } from 'react';

export type ShadowContextMenuAction =
  | 'inspect'
  | 'delete'
  | 'duplicate'
  | 'moveUp'
  | 'moveDown';

interface Props {
  blockId: string;
  x: number;
  y: number;
  onAction: (action: ShadowContextMenuAction) => void;
  onClose: () => void;
}

const ITEMS: Array<{ id: ShadowContextMenuAction; label: string; danger?: boolean }> = [
  { id: 'inspect', label: '속성' },
  { id: 'duplicate', label: '복사' },
  { id: 'moveUp', label: '위로 이동' },
  { id: 'moveDown', label: '아래로 이동' },
  { id: 'delete', label: '삭제', danger: true },
];

export default function ShadowContextMenu({ blockId, x, y, onAction, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 외부 클릭 — capture phase 로 잡아 메뉴 안 클릭과 구분.
    // (메뉴 안 클릭은 항목 button 의 onClick 이 먼저 onAction → onClose 호출.)
    const onDocMouseDown = (e: MouseEvent) => {
      if (!ref.current) return;
      if (ref.current.contains(e.target as Node)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    // contextmenu — 다른 element 우클릭 시 기존 메뉴 닫고 새 메뉴 띄울 수 있게.
    // (PreviewMain 이 새 onContextMenu 콜백을 받아 state 를 갱신하면 본 컴포넌트는
    // 새 위치로 리렌더 — but blockId 같으면 그대로. 안전하게 close.)
    document.addEventListener('mousedown', onDocMouseDown, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  // viewport 경계 보정 — 메뉴가 화면 밖으로 나가지 않게 clamp.
  // 메뉴 크기 추정 (실측 후 보정도 가능하나 first paint 에 단순화).
  const W = 160;
  const H = ITEMS.length * 32 + 8;
  const left = typeof window !== 'undefined' ? Math.min(x, window.innerWidth - W - 4) : x;
  const top = typeof window !== 'undefined' ? Math.min(y, window.innerHeight - H - 4) : y;

  return (
    <div
      ref={ref}
      role="menu"
      data-testid="shadow-context-menu"
      data-r20-block-id={blockId}
      style={{
        position: 'fixed',
        left: `${left}px`,
        top: `${top}px`,
        zIndex: 9999,
        width: `${W}px`,
      }}
      className="rounded-md border border-border bg-popover py-1 text-popover-foreground shadow-lg"
      onContextMenu={(e) => {
        // 메뉴 자체 우클릭은 native 차단 (메뉴 안 native 메뉴 중첩 방지).
        e.preventDefault();
      }}
    >
      {ITEMS.map((it) => (
        <button
          key={it.id}
          type="button"
          role="menuitem"
          onClick={() => {
            onAction(it.id);
            onClose();
          }}
          className={
            'flex w-full items-center px-3 py-1.5 text-left text-[12px] hover:bg-accent hover:text-accent-foreground ' +
            (it.danger ? 'text-destructive' : '')
          }
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
