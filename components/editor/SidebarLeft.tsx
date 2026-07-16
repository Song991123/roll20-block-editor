'use client';

import { Box } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useUiStore } from '@/lib/stores/uiStore';
import WidgetGallery from './WidgetGallery';

const BlocksLibrary = dynamic(() => import('./BlocksLibrary'), {
  ssr: false,
  loading: () => null,
});

export default function SidebarLeft() {
  const mainMode = useUiStore((s) => s.mainMode);
  const isEdit = mainMode === 'edit';

  if (isEdit) {
    return <WidgetGallery />;
  }

  return (
    <>
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3 text-xs font-medium text-foreground">
        <Box className="h-3.5 w-3.5" />
        블록
      </div>
      <div className="min-h-0 flex-1">
        <BlocksLibrary />
      </div>
    </>
  );
}
