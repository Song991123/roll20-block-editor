'use client';

import { Blocks, Eye, Languages, PanelsLeftRight, PencilRuler, ShieldAlert, ShieldCheck, type LucideIcon } from 'lucide-react';
import { useUiStore, type EditSubmode, type MainMode } from '@/lib/stores/uiStore';
import { usePreviewStore, type Roll20CompatibilityMode } from '@/lib/stores/previewStore';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * 화면 모드 전환 툴바 (design-reset).
 * 라벨은 "무엇을 하는 화면인지" 기준의 자연어 — 기술 용어 없이.
 * 순서는 처음 쓰는 사람의 흐름: 미리보기 → 직접 편집 → 블록 조립 → 나란히 보기.
 */
const MODES: Array<{
  key: MainMode;
  label: string;
  Icon: LucideIcon;
  tooltip: string;
}> = [
  { key: 'preview', label: '미리보기', Icon: Eye, tooltip: '완성된 시트가 어떻게 보이는지 화면 가득 확인해요.' },
  { key: 'edit', label: '직접 편집', Icon: PencilRuler, tooltip: '시트 화면을 직접 클릭해서 요소를 고르고, 옮기고, 고쳐요.' },
  { key: 'assemble', label: '블록 조립', Icon: Blocks, tooltip: '블록을 끼워 맞춰 시트를 만드는 조립 공간을 넓게 써요.' },
  { key: 'split', label: '나란히 보기', Icon: PanelsLeftRight, tooltip: '왼쪽엔 블록, 오른쪽엔 미리보기를 함께 놓고 작업해요.' },
];

const SUBMODES: Array<{ key: EditSubmode; label: string; tooltip: string }> = [
  { key: 'sheet', label: '시트', tooltip: '캐릭터 시트 화면을 편집해요.' },
  { key: 'rolltemplate', label: '굴림 결과', tooltip: '주사위를 굴렸을 때 대화창에 뜨는 결과 말풍선을 편집해요.' },
];

export default function MainAreaToolbar() {
  const mainMode = useUiStore((s) => s.mainMode);
  const setMainMode = useUiStore((s) => s.setMainMode);
  const mainSplit = useUiStore((s) => s.mainSplit);
  const editSubmode = useUiStore((s) => s.editSubmode);
  const setEditSubmode = useUiStore((s) => s.setEditSubmode);
  const legacyCssSanitize = usePreviewStore((s) => s.legacyCssSanitize);
  const setRoll20CompatibilityMode = usePreviewStore((s) => s.setRoll20CompatibilityMode);
  const documentLanguage = usePreviewStore((s) => s.documentLanguage);
  const setDocumentLanguage = usePreviewStore((s) => s.setDocumentLanguage);
  const roll20Mode: Roll20CompatibilityMode = legacyCssSanitize ? 'legacy' : 'modern';

  return (
    <TooltipProvider delayDuration={300}>
      <div className="r20-strip flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-b border-[var(--border-subtle)] px-3 py-1.5">
        <div role="tablist" aria-label="화면 모드" className="r20-seg shrink-0">
          {MODES.map((mode) => {
            const isActive = mainMode === mode.key;
            const Icon = mode.Icon;
            return (
              <Tooltip key={mode.key}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setMainMode(mode.key)}
                    className="r20-seg-btn"
                    data-testid={`main-mode-${mode.key}`}
                  >
                    <Icon aria-hidden="true" className="h-[18px] w-[18px]" />
                    {mode.label}
                  </button>
                </TooltipTrigger>
                <TooltipContent>{mode.tooltip}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center gap-2.5 text-muted-foreground">
          {mainMode === 'edit' && (
            <div
              role="tablist"
              aria-label="편집 대상"
              className="r20-seg r20-seg--compact"
              data-testid="edit-submode-toolbar"
            >
              {SUBMODES.map((sub) => {
                const isActive = editSubmode === sub.key;
                return (
                  <Tooltip key={sub.key}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => setEditSubmode(sub.key)}
                        className="r20-seg-btn"
                        data-testid={`edit-submode-${sub.key}`}
                      >
                        {sub.label}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{sub.tooltip}</TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          )}
          {mainMode === 'split' && (
            <span className="r20-chip hidden tabular-nums xl:inline-flex" data-testid="split-ratio">
              {Math.round(mainSplit.left)}% / {Math.round(mainSplit.right)}%
            </span>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <label className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated-2)] px-3 text-xs font-medium">
                <Languages className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="hidden xl:inline">문서 언어</span>
                <input
                  type="text"
                  value={documentLanguage}
                  onChange={(event) => setDocumentLanguage(event.target.value)}
                  placeholder="en"
                  maxLength={35}
                  spellCheck={false}
                  aria-label="Roll20 문서 언어"
                  data-testid="roll20-document-language"
                  className="h-6 w-14 border-0 bg-transparent px-1 text-center text-xs font-semibold text-foreground outline-none"
                />
              </label>
            </TooltipTrigger>
            <TooltipContent>시트가 쓰일 언어 코드예요. 예: en(영어), ko(한국어), ja(일본어)</TooltipContent>
          </Tooltip>
          <div
            role="group"
            aria-label="Roll20 렌더 버전"
            className="r20-seg r20-seg--compact"
            data-testid="roll20-mode-control"
          >
            <span className="px-2 text-xs font-semibold text-muted-foreground">Roll20</span>
            {([
              { key: 'modern' as const, label: '신버전', Icon: ShieldCheck },
              { key: 'legacy' as const, label: '구버전', Icon: ShieldAlert },
            ]).map(({ key, label, Icon }) => {
              const isActive = roll20Mode === key;
              return (
                <Tooltip key={key}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setRoll20CompatibilityMode(key)}
                      className="r20-seg-btn"
                      data-testid={`roll20-mode-${key}`}
                    >
                      <Icon aria-hidden="true" className="h-4 w-4" />
                      {label}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {key === 'legacy'
                      ? '옛날 방식의 Roll20 화면 기준으로 미리 보여줘요. 신버전 화면과는 다를 수 있어요.'
                      : '요즘 방식의 Roll20 화면 기준으로 미리 보여줘요. 구버전 화면과는 다를 수 있어요.'}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
