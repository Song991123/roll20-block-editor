'use client';

import { Box, ListTree, LayoutPanelLeft } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useUiStore } from '@/lib/stores/uiStore';
import { cn } from '@/lib/utils/cn';
import dynamic from 'next/dynamic';

/**
 * BlocksLibrary dynamic — Blockly 미니프리뷰 inject 코드 + 130 블록 정의가 큰 chunk.
 * SidebarLeft 의 [블록] 모드 진입 시점에만 로드.
 *
 * ssr:false — Blockly 사용 → server-render 시 throw.
 * loading: null — 잠시 비어 보이는 게 chunk 크기 정직한 신호.
 */
const BlocksLibrary = dynamic(() => import('./BlocksLibrary'), {
  ssr: false,
  loading: () => null,
});
import WorkspaceTree from './WorkspaceTree';
import WidgetGallery from './WidgetGallery';

/**
 * 좌측 사이드 — [블록] / [트리] 2 모드 (D48). 편집 모드일 때는 [위젯] 갤러리.
 *
 * Anchor: docs/spec/08_wireframes.md W2-A/W2-B + 17_wysiwyg_mode.md §5.
 */
export default function SidebarLeft({ collapsed }: { collapsed: boolean }) {
  const mode = useUiStore((s) => s.sidebarLeftMode);
  const setMode = useUiStore((s) => s.setSidebarLeftMode);
  const mainMode = useUiStore((s) => s.mainMode);
  const isEdit = mainMode === 'edit';

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2 py-3">
        {isEdit ? (
          <button
            type="button"
            aria-label="위젯 갤러리"
            className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--bg-active)] text-foreground"
          >
            <LayoutPanelLeft className="h-4 w-4" />
          </button>
        ) : (
          <>
            <button
              type="button"
              aria-label="블록 라이브러리"
              onClick={() => setMode('blocks')}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[var(--bg-hover)]',
                mode === 'blocks' && 'bg-[var(--bg-active)] text-foreground',
              )}
            >
              <Box className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="워크스페이스 트리"
              onClick={() => setMode('tree')}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[var(--bg-hover)]',
                mode === 'tree' && 'bg-[var(--bg-active)] text-foreground',
              )}
            >
              <ListTree className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    );
  }

  // 편집 모드 — 위젯 갤러리 (BlocksLibrary 대신).
  if (isEdit) {
    return <WidgetGallery />;
  }

  return (
    <>
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3">
        <ToggleGroup
          type="single"
          value={mode}
          onValueChange={(v) => v && setMode(v as 'blocks' | 'tree')}
          size="sm"
          className="w-full"
        >
          <ToggleGroupItem value="blocks" aria-label="블록 라이브러리 (Cmd+1)" className="flex-1 gap-1.5">
            <Box className="h-3.5 w-3.5" />
            블록
          </ToggleGroupItem>
          <ToggleGroupItem value="tree" aria-label="워크스페이스 트리 (Cmd+2)" className="flex-1 gap-1.5">
            <ListTree className="h-3.5 w-3.5" />
            트리
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="flex-1 min-h-0">
        {mode === 'blocks' ? <BlocksLibrary /> : <WorkspaceTree />}
      </div>
    </>
  );
}
