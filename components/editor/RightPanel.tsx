'use client';

import { CodeXml, Palette, Languages, Eye } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

/**
 * 우측 패널 — HTML / CSS / 번역 / 미리보기 4-탭.
 *
 * Phase 1 에서는 각 탭에 친화적 안내 문구만. 코드 뷰어 / iframe 미리보기는 추후.
 */
export default function RightPanel() {
  return (
    <Tabs defaultValue="html" className="flex h-full flex-col p-3">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="html" className="gap-1.5">
          <CodeXml className="h-3.5 w-3.5" />
          HTML
        </TabsTrigger>
        <TabsTrigger value="css" className="gap-1.5">
          <Palette className="h-3.5 w-3.5" />
          CSS
        </TabsTrigger>
        <TabsTrigger value="i18n" className="gap-1.5">
          <Languages className="h-3.5 w-3.5" />
          번역
        </TabsTrigger>
        <TabsTrigger value="preview" className="gap-1.5">
          <Eye className="h-3.5 w-3.5" />
          미리보기
        </TabsTrigger>
      </TabsList>

      <TabsContent value="html">
        <PanelPlaceholder
          icon={<CodeXml className="h-5 w-5" />}
          title="시트 HTML"
          body="블록을 끌어놓으면 여기에 Roll20 시트 HTML이 생성돼요."
        />
      </TabsContent>
      <TabsContent value="css">
        <PanelPlaceholder
          icon={<Palette className="h-5 w-5" />}
          title="시트 스타일"
          body="시트의 색상·폰트·레이아웃이 자동으로 만들어집니다."
        />
      </TabsContent>
      <TabsContent value="i18n">
        <PanelPlaceholder
          icon={<Languages className="h-5 w-5" />}
          title="다국어 번역"
          body="여러 언어로 시트를 번역할 수 있어요."
        />
      </TabsContent>
      <TabsContent value="preview">
        <PanelPlaceholder
          icon={<Eye className="h-5 w-5" />}
          title="실시간 미리보기"
          body="실제 Roll20에서 어떻게 보일지 미리 확인할 수 있어요."
        />
      </TabsContent>
    </Tabs>
  );
}

function PanelPlaceholder({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border bg-card/30 px-4 py-10 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        {icon}
      </div>
      <div className="text-sm font-medium text-foreground">{title}</div>
      <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
