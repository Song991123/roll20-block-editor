'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useUiStore } from '@/lib/stores/uiStore';
import { useWorkspaceStore } from '@/lib/stores/workspaceStore';
import { toast } from 'sonner';

const SUB_TABS = [
  { id: 'html', label: 'HTML' },
  { id: 'css', label: 'CSS' },
  { id: 'worker', label: 'Worker' },
  { id: 'i18n', label: '번역' },
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

  const content = subTab === 'i18n' ? emit.i18n : emit[subTab];

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
            <ToggleGroupItem key={t.id} value={t.id} className="flex-1 text-[11px]">
              {t.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <pre className="m-0 p-3 font-mono text-[11px] leading-relaxed text-foreground whitespace-pre-wrap break-all">
          {content || <span className="text-muted-foreground italic">아직 생성된 코드가 없어요. 블록을 추가해 보세요.</span>}
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
