'use client';

import { useMemo, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useUiStore } from '@/lib/stores/uiStore';
import { useWorkspaceStore } from '@/lib/stores/workspaceStore';
import { toast } from 'sonner';

const SUB_TABS = [
  {
    id: 'html',
    label: 'HTML',
    empty: '아직 생성된 HTML이 없어요. 시트 요소를 추가해 보세요.',
    note: 'Roll20 시트 본문입니다.',
  },
  {
    id: 'css',
    label: 'CSS',
    empty: '아직 생성된 CSS가 없어요. 스타일을 추가해 보세요.',
    note: 'Roll20에 함께 올릴 시트 스타일입니다.',
  },
  {
    id: 'worker',
    label: '시트 동작',
    empty: '아직 시트 동작 코드가 없어요. 가져온 시트의 worker 스크립트는 여기에 보존됩니다.',
    note: '시트 위에는 표시하지 않고 Roll20에서 실행되는 코드입니다.',
  },
  {
    id: 'i18n',
    label: '번역',
    empty: '아직 번역 JSON이 없어요.',
    note: 'Roll20 translation.json으로 내보낼 내용입니다.',
  },
] as const;

/**
 * 우측 [코드] 모드 — emit 결과 raw 표시 (read-only).
 *
 * Anchor: docs/spec/08_wireframes.md W2-E.
 */
export default function CodeTabs() {
  const subTab = useUiStore((s) => s.codeSubTab);
  const setSubTab = useUiStore((s) => s.setCodeSubTab);
  const emit = useWorkspaceStore((s) => s.emitCache);
  const [copied, setCopied] = useState(false);

  const activeTab = SUB_TABS.find((tab) => tab.id === subTab) ?? SUB_TABS[0];
  const content = subTab === 'i18n' ? emit.i18n : emit[subTab];
  const byteCount = useMemo(() => new TextEncoder().encode(content).length, [content]);

  const onCopy = async () => {
    if (!content) {
      toast('복사할 코드가 없어요', { duration: 1500 });
      return;
    }
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast('복사 실패 — 직접 선택해 주세요', { duration: 1500 });
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-border px-3 pt-2 pb-2">
        <ToggleGroup
          type="single"
          value={subTab}
          onValueChange={(v) => v && setSubTab(v as 'html' | 'css' | 'i18n' | 'worker')}
          size="sm"
          className="w-full"
        >
          {SUB_TABS.map((t) => (
            <ToggleGroupItem
              key={t.id}
              value={t.id}
              className="flex-1 text-[11px]"
              data-testid={`code-subtab-${t.id}`}
            >
              {t.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <div
          className="mt-2 rounded border border-border/70 bg-[var(--bg-elevated-2)] px-2.5 py-2 text-[11px] leading-relaxed text-muted-foreground"
          data-testid="code-tab-status"
        >
          <span className="font-medium text-foreground">{activeTab.label}</span>
          <span className="mx-1 text-border">|</span>
          <span>{byteCount.toLocaleString()} B</span>
          <span className="mx-1 text-border">|</span>
          <span>{activeTab.note}</span>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <pre className="m-0 p-3 font-mono text-[11px] leading-relaxed text-foreground whitespace-pre-wrap break-all">
          {content || (
            <span className="text-muted-foreground italic" data-testid="code-tab-empty">
              {activeTab.empty}
            </span>
          )}
        </pre>
      </ScrollArea>

      <div className="shrink-0 border-t border-border p-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full justify-center gap-1.5 text-xs"
          onClick={onCopy}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" /> 복사됨
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" /> 클립보드에 복사
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
