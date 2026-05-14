'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import EditorHeader from './EditorHeader';
import BlockWorkspace from './BlockWorkspace';
import RightPanel from './RightPanel';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

/**
 * 에디터 레이아웃 — 3-column.
 *
 *   ┌────────────────── header (h-14) ───────────────────┐
 *   │ [toolbox 240px] [workspace flex-1] [right 380px]   │
 *   └────────────────────────────────────────────────────┘
 *
 * 좌측 toolbox 는 Blockly 가 BlockWorkspace 내부에서 자체 렌더 (Blockly inject 사양).
 * 우측 패널은 lg(≥1024px) 에서는 고정 컬럼, 그 아래에서는 Sheet drawer.
 */
export default function EditorShell() {
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col">
      <EditorHeader onOpenMobileSidebar={() => setMobileSheetOpen(true)} />
      <main className="flex flex-1 min-h-0">
        <div className="flex-1 min-w-0 bg-[var(--workspace-bg)]">
          <BlockWorkspace
            onRequestLoadExample={() =>
              toast('D&D 5e 예시 — 곧 추가됩니다', { duration: 2200 })
            }
          />
        </div>
        <aside className="hidden lg:flex w-[380px] shrink-0 border-l border-border bg-card flex-col">
          <RightPanel />
        </aside>

        <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
          <SheetContent side="right" className="w-[90vw] max-w-md p-0 flex flex-col">
            <SheetHeader className="border-b border-border px-4 py-3">
              <SheetTitle>출력 패널</SheetTitle>
              <SheetDescription>HTML · CSS · 번역 · 미리보기</SheetDescription>
            </SheetHeader>
            <div className="flex-1 min-h-0">
              <RightPanel />
            </div>
          </SheetContent>
        </Sheet>
      </main>
    </div>
  );
}
