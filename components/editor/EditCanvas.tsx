'use client';

import { useUiStore } from '@/lib/stores/uiStore';

/**
 * EditCanvas — WYSIWYG 시트/굴림틀 캔버스 (A-1 stub, A-2 본격).
 *
 * Anchor: docs/spec/17_wysiwyg_mode.md §6.
 */
export default function EditCanvas() {
  const editSubmode = useUiStore((s) => s.editSubmode);

  return (
    <div
      className="flex flex-1 min-h-0 flex-col items-center justify-center bg-[var(--bg-canvas)] text-muted-foreground text-sm"
      data-testid="edit-canvas-stub"
      data-edit-submode={editSubmode}
    >
      <div>편집 모드 — {editSubmode === 'sheet' ? '시트' : '굴림틀'} (A-2에서 캔버스 구현)</div>
    </div>
  );
}
