'use client';

import {
  Sparkles,
  MousePointerSquareDashed,
  ListTree,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useUiStore } from '@/lib/stores/uiStore';
import {
  EXAMPLES,
  loadExampleIntoWorkspaces,
} from '@/lib/examples';

/**
 * 미리보기 영역의 빈 상태 — 첫 진입 시 사용자가 무엇을 할지 보이게.
 *
 * Anchor: docs/spec/02_functional_spec.md §9 (Onboarding) + 08_wireframes.md W2.
 * 한국어 톤: 친근 / "코딩 못해도 OK". Notion 식 부드러운 카드.
 */
export default function PreviewEmptyState() {
  const setSidebarLeftMode = useUiStore((s) => s.setSidebarLeftMode);
  const setBlocksSearch = useUiStore((s) => s.setBlocksSearch);

  const handleLoadFirstExample = async () => {
    const ex = EXAMPLES[0];
    if (!ex) {
      toast('아직 등록된 샘플이 없어요.', { duration: 1800 });
      return;
    }
    try {
      const counts = await loadExampleIntoWorkspaces(ex);
      const total = counts.html + counts.css + counts.i18n;
      toast.success(
        `${ex.shortName} 샘플을 불러왔어요. 블록 ${total}개`,
        { duration: 2200 },
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`${ex.shortName} 샘플을 불러오지 못했어요: ${msg}`, { duration: 3000 });
    }
  };

  const handleStartBlank = () => {
    setSidebarLeftMode('blocks');
    setBlocksSearch('');
    toast('왼쪽 [블록] 패널에서 필요한 블록을 끌어와 보세요.', {
      duration: 2400,
    });
  };

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center px-6 text-center">
      <div
        className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl text-primary ring-1 ring-primary/25"
        style={{
          background:
            'radial-gradient(circle at 30% 25%, color-mix(in srgb, var(--primary) 22%, transparent), transparent 70%), var(--bg-elevated)',
        }}
      >
        <Sparkles className="h-7 w-7" />
      </div>
      <h2 className="mb-2 text-[22px] font-semibold tracking-tight text-foreground">
        새 시트를 만들어 볼까요?
      </h2>
      <p className="mb-7 max-w-md text-[13px] leading-relaxed text-muted-foreground">
        가운데가 Roll20 시트 화면이에요. 왼쪽에서 블록이나 요소를 끌어오면 바로 여기에 나타나요.
        <br />
        오른쪽 [속성] 패널에서 이름, 라벨, 기본값을 다듬을 수 있어요.
      </p>

      <div className="mb-7 grid w-full max-w-md gap-2">
        <Hint
          step={1}
          accent="var(--cat-container)"
          icon={<ListTree className="h-4 w-4" />}
          title="블록으로 뼈대 만들기"
          body="왼쪽 [블록] 패널에서 구역, 입력칸, 표시용 블록을 끌어오세요."
        />
        <Hint
          step={2}
          accent="var(--cat-display)"
          icon={<MousePointerSquareDashed className="h-4 w-4" />}
          title="화면에서 바로 고르기"
          body="시트 안 요소를 클릭하면 트리와 속성 패널이 같은 대상을 보여줘요."
        />
        <Hint
          step={3}
          accent="var(--cat-dice)"
          icon={<Sparkles className="h-4 w-4" />}
          title="Roll20용으로 내보내기"
          body="상단 [내보내기]로 sheet.html, sheet.css, translation.json이 들어간 .zip을 만들어요."
        />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={handleLoadFirstExample}
          className="gap-1.5"
        >
          샘플 시트 보기
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleStartBlank}>
          빈 시트로 시작
        </Button>
      </div>
    </div>
  );
}

function Hint({
  step,
  accent,
  icon,
  title,
  body,
}: {
  step: number;
  accent: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="group flex items-start gap-3 rounded-lg border border-border bg-[var(--bg-elevated)] p-3 text-left transition-colors hover:border-[color-mix(in_srgb,_var(--primary)_40%,_transparent)] hover:bg-[var(--bg-elevated-2)]">
      <div
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-foreground"
        style={{ background: `color-mix(in srgb, ${accent} 20%, var(--bg-elevated-2))` }}
        aria-hidden
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span
            className="text-[10px] font-mono tabular-nums"
            style={{ color: accent }}
            aria-hidden
          >
            {String(step).padStart(2, '0')}
          </span>
          <span className="text-xs font-medium text-foreground">{title}</span>
        </div>
        <div className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
          {body}
        </div>
      </div>
    </div>
  );
}
