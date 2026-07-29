'use client';

import { Puzzle } from 'lucide-react';
import dynamic from 'next/dynamic';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useUiStore } from '@/lib/stores/uiStore';
import WidgetGallery from './WidgetGallery';
import HelpTip from './HelpTip';

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
    <TooltipProvider delayDuration={250}>
      <div className="r20-panel-head">
        <Puzzle className="h-[18px] w-[18px] text-[var(--primary)]" aria-hidden="true" />
        <span>블록 꾸러미</span>
        <span className="flex-1" />
        <HelpTip label="블록 꾸러미 도움말" side="right">
          시트를 만드는 조각들이에요. 블록을 누르면 작업 공간에 추가되고,
          끌어다 놓을 수도 있어요. 색깔은 블록의 종류를 뜻해요.
        </HelpTip>
      </div>
      <div className="min-h-0 flex-1">
        <BlocksLibrary />
      </div>
    </TooltipProvider>
  );
}
