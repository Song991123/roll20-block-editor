'use client';

import { Box, LayoutPanelLeft } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useUiStore } from '@/lib/stores/uiStore';

const BlocksLibrary = dynamic(() => import('./BlocksLibrary'), {
  ssr: false,
  loading: () => null,
});
import WidgetGallery from './WidgetGallery';

export default function SidebarLeft({ collapsed }: { collapsed: boolean }) {
  const mainMode = useUiStore((s) => s.mainMode);
  const isEdit = mainMode === 'edit';

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2 py-3">
        <button
          type="button"
          aria-label={isEdit ? '위젯 갤러리' : '블록 라이브러리'}
          className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--bg-active)] text-foreground"
        >
          {isEdit ? <LayoutPanelLeft className="h-4 w-4" /> : <Box className="h-4 w-4" />}
        </button>
      </div>
    );
  }

  if (isEdit) {
    return <WidgetGallery />;
  }

  return (
    <>
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3 text-xs font-medium text-foreground">
        <Box className="h-3.5 w-3.5" />
        블록
      </div>
      <div className="flex-1 min-h-0">
        <BlocksLibrary />
      </div>
    </>
  );
}
