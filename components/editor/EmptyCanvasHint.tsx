'use client';

/**
 * EmptyCanvasHint — 빈 블록 조립 공간 안내 (design-reset, UI 전용).
 *
 * 활성 작업 종류에 블록이 하나도 없을 때, 점 격자 위에 "여기가 뭐 하는
 * 곳인지"를 알려주는 카드를 띄운다. pointer-events: none + aria-hidden 이라
 * 드래그/클릭/스모크에 일절 간섭하지 않음 (순수 표시용).
 */
import { PackageOpen } from 'lucide-react';
import { useWorkspaceStore } from '@/lib/stores/workspaceStore';

export default function EmptyCanvasHint() {
  const active = useWorkspaceStore((s) => s.activeWorkspace);
  const count = useWorkspaceStore((s) => s.workspaces[active].blockCount);
  if (count > 0) return null;
  return (
    <div
      className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center"
      aria-hidden="true"
    >
      <div className="mx-6 max-w-sm rounded-2xl border-2 border-dashed border-[var(--primary-soft-border)] bg-[var(--bg-elevated)]/85 px-6 py-5 text-center shadow-[0_1px_2px_rgba(var(--shadow-tint),0.07),0_4px_14px_rgba(var(--shadow-tint),0.09)] backdrop-blur-[2px]">
        <PackageOpen className="mx-auto mb-2.5 h-9 w-9 text-[var(--primary)]" />
        <p className="text-base font-bold text-foreground">여기는 블록 조립 공간이에요</p>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">
          왼쪽 꾸러미에서 블록을 누르거나
          <br />
          이 자리로 끌어다 놓으면 차곡차곡 쌓여요.
        </p>
      </div>
    </div>
  );
}
