'use client';

import { Settings2, CodeXml, MessageSquare } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useUiStore } from '@/lib/stores/uiStore';
import { useChatStore } from '@/lib/stores/chatStore';
import Inspector from './Inspector';
import CodeTabs from './CodeTabs';
import ChatPane from './ChatPane';

/**
 * 우측 사이드 — [속성] / [코드] / [채팅] tabs (D49 + dice 채팅 확장).
 *
 * Anchor: docs/spec/08_wireframes.md W2-D / W2-E.
 *
 * [채팅] 탭: 미리보기 영역의 굴림 버튼 클릭 시 결과 카드 누적.
 * 새 굴림 발생 시 자동으로 [채팅] 탭 활성화 (PreviewMain 의 click handler 가 setTab).
 */
export default function SidebarRight() {
  const tab = useUiStore((s) => s.sidebarRightTab);
  const setTab = useUiStore((s) => s.setSidebarRightTab);
  const chatCount = useChatStore((s) => s.rolls.length);

  return (
    <Tabs
      value={tab}
      onValueChange={(v) => setTab(v as 'attrs' | 'code' | 'chat')}
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
          <TabsTrigger
            value="chat"
            className="flex-1 gap-1.5 text-xs"
            data-testid="tab-chat"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            채팅
            {chatCount > 0 && (
              <span className="ml-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary/80 px-1 text-[9px] font-semibold text-primary-foreground">
                {chatCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="attrs" className="flex-1 m-0 min-h-0 overflow-hidden">
        <Inspector />
      </TabsContent>
      <TabsContent value="code" className="flex-1 m-0 min-h-0 overflow-hidden">
        <CodeTabs />
      </TabsContent>
      <TabsContent value="chat" className="flex-1 m-0 min-h-0 overflow-hidden">
        <ChatPane />
      </TabsContent>
    </Tabs>
  );
}
