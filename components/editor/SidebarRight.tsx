'use client';

import { Settings2, CodeXml } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useUiStore } from '@/lib/stores/uiStore';
import Inspector from './Inspector';
import CodeTabs from './CodeTabs';

/**
 * 우측 사이드 — [속성] / [코드] tabs (D49).
 *
 * Anchor: docs/spec/08_wireframes.md W2-D / W2-E.
 */
export default function SidebarRight() {
  const tab = useUiStore((s) => s.sidebarRightTab);
  const setTab = useUiStore((s) => s.setSidebarRightTab);

  return (
    <Tabs
      value={tab}
      onValueChange={(v) => setTab(v as 'attrs' | 'code')}
      className="flex h-full flex-col"
    >
      <div className="h-10 shrink-0 border-b border-border px-3 flex items-center">
        <TabsList className="h-7 bg-[var(--bg-elevated-2)] w-full">
          <TabsTrigger value="attrs" className="flex-1 gap-1.5 text-xs">
            <Settings2 className="h-3.5 w-3.5" />
            속성
          </TabsTrigger>
          <TabsTrigger value="code" className="flex-1 gap-1.5 text-xs">
            <CodeXml className="h-3.5 w-3.5" />
            코드
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="attrs" className="flex-1 m-0 min-h-0 overflow-hidden">
        <Inspector />
      </TabsContent>
      <TabsContent value="code" className="flex-1 m-0 min-h-0 overflow-hidden">
        <CodeTabs />
      </TabsContent>
    </Tabs>
  );
}
