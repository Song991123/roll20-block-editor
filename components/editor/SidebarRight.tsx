'use client';

import { Settings2, CodeXml, Dices } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useUiStore } from '@/lib/stores/uiStore';
import { useChatStore } from '@/lib/stores/chatStore';
import Inspector from './Inspector';
import CodeTabs from './CodeTabs';
import ChatPane from './ChatPane';

export default function SidebarRight() {
  const tab = useUiStore((s) => s.sidebarRightTab);
  const setTab = useUiStore((s) => s.setSidebarRightTab);
  const chatCount = useChatStore((s) => s.rolls.length);

  return (
    <TooltipProvider delayDuration={300}>
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as 'attrs' | 'code' | 'chat')}
        className="flex h-full flex-col"
      >
        <div className="flex h-[54px] shrink-0 items-center border-b border-border px-2.5">
          <TabsList className="h-11 w-full">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex flex-1">
                  <TabsTrigger value="attrs" className="flex-1" data-testid="tab-attrs">
                    <Settings2 className="h-[17px] w-[17px]" aria-hidden="true" />
                    속성
                  </TabsTrigger>
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom">선택한 요소의 이름·값·크기를 바꿔요</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex flex-1">
                  <TabsTrigger value="code" className="flex-1" data-testid="tab-code">
                    <CodeXml className="h-[17px] w-[17px]" aria-hidden="true" />
                    코드
                  </TabsTrigger>
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom">내보낼 실제 코드를 보는 고급 화면이에요. 몰라도 괜찮아요!</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex flex-1">
                  <TabsTrigger value="chat" className="flex-1" data-testid="tab-chat">
                    <Dices className="h-[17px] w-[17px]" aria-hidden="true" />
                    굴림
                    {chatCount > 0 && (
                      <span className="ml-0.5 inline-flex h-[20px] min-w-[20px] items-center justify-center rounded-full bg-[var(--primary-strong)] px-1.5 text-xs font-semibold leading-none text-primary-foreground">
                        {chatCount}
                      </span>
                    )}
                  </TabsTrigger>
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom">주사위를 굴려 결과 말풍선을 미리 봐요</TooltipContent>
            </Tooltip>
          </TabsList>
        </div>
        <TabsContent value="attrs" className="m-0 min-h-0 flex-1 overflow-hidden">
          <Inspector />
        </TabsContent>
        <TabsContent value="code" className="m-0 min-h-0 flex-1 overflow-hidden">
          <CodeTabs />
        </TabsContent>
        <TabsContent value="chat" className="m-0 min-h-0 flex-1 overflow-hidden">
          <ChatPane />
        </TabsContent>
      </Tabs>
    </TooltipProvider>
  );
}
