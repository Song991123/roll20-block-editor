'use client';

import { useMemo } from 'react';
import { MousePointerSquareDashed } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWorkspaceStore } from '@/lib/stores/workspaceStore';
import { getBlocklyAdapter, type BlockSnapshot } from '@/lib/blockly/adapter';

/**
 * Inspector — 선택된 블록의 schema 기반 자동 폼.
 *
 * Anchor: docs/spec/08_wireframes.md W2-D + D54.
 *
 * Phase 1 = 블록 metadata 표시 + 폼 placeholder.
 * Phase 4 = 블록 별 inspectorSchema 따라 자동 폼.
 */
export default function Inspector() {
  const selectedId = useWorkspaceStore((s) => s.selectedBlockId);
  // 세 워크스페이스의 xmlCache 의존성 — 한 곳이 바뀌어도 snap 재계산.
  const htmlXml = useWorkspaceStore((s) => s.workspaces.html.xmlCache);
  const cssXml = useWorkspaceStore((s) => s.workspaces.css.xmlCache);
  const i18nXml = useWorkspaceStore((s) => s.workspaces.i18n.xmlCache);

  const snap: BlockSnapshot | null = useMemo(() => {
    if (!selectedId) return null;
    const adapter = getBlocklyAdapter();
    for (const key of ['html', 'css', 'i18n'] as const) {
      const s = adapter.getBlock(key, selectedId);
      if (s) return s;
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, htmlXml, cssXml, i18nXml]);

  if (!selectedId || !snap) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 py-8 text-center">
        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-elevated-2)] text-muted-foreground">
          <MousePointerSquareDashed className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium text-foreground">선택된 블록 없음</p>
        <p className="mt-1 max-w-[240px] text-[11px] leading-relaxed text-muted-foreground">
          왼쪽 트리에서 블록을 선택하거나 미리보기에서 클릭해 보세요.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-3">
        <div>
          <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">블록</div>
          <div className="mt-0.5 text-sm font-medium text-foreground">{snap.label}</div>
          <div className="mt-0.5 font-mono text-[10.5px] text-muted-foreground">{snap.type}</div>
          <div className="mt-0.5 font-mono text-[10px] text-muted-foreground/70">id: {snap.id}</div>
        </div>

        {snap.preview && (
          <div>
            <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">미리보기 값</div>
            <div className="mt-0.5 text-xs text-foreground">{snap.preview}</div>
          </div>
        )}

        <div className="rounded-md border border-dashed border-border bg-[var(--bg-elevated-2)] p-3 text-[11px] text-muted-foreground">
          속성 편집 폼은 블록 카탈로그 (Stage A) 완료 후 자동 생성돼요.
          <br />
          현재는 selectedBlockId sync 확인 단계.
        </div>
      </div>
    </ScrollArea>
  );
}
