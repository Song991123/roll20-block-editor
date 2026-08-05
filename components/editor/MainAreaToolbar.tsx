'use client';

import { Blocks, Dice5, Eye, FileText, FlaskConical, Languages, PanelsLeftRight, PencilRuler, ShieldAlert, ShieldCheck, SlidersHorizontal, type LucideIcon } from 'lucide-react';
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
 * Alpha 기본 흐름은 미리보기 → 고급 블록 편집이다. 화면 직접 편집은
 * 별도 시험 기능을 켠 사용자에게만 표시한다.
 */
const MODES: Array<{
  key: MainMode;
  label: string;
  Icon: LucideIcon;
  tooltip: string;
}> = [
  { key: 'preview', label: '미리보기', Icon: Eye, tooltip: '완성된 시트가 어떻게 보이는지 화면 가득 확인해요.' },
  { key: 'assemble', label: '블록 조립', Icon: Blocks, tooltip: '블록을 끼워 맞춰 시트를 만드는 조립 공간을 넓게 써요.' },
  { key: 'split', label: '나란히 보기', Icon: PanelsLeftRight, tooltip: '왼쪽엔 블록, 오른쪽엔 미리보기를 함께 놓고 작업해요.' },
];

const DIRECT_EDIT_MODE = {
  key: 'edit' as const,
  label: '화면 편집',
  Icon: PencilRuler,
  tooltip: '시험 기능입니다. 시트 화면에서 요소를 직접 고르고 옮겨요.',
};

const SUBMODES: Array<{ key: EditSubmode; label: string; Icon: LucideIcon; tooltip: string }> = [
  { key: 'sheet', label: '시트 디자인', Icon: FileText, tooltip: '캐릭터 시트 화면을 편집해요.' },
  { key: 'rolltemplate', label: '주사위 결과', Icon: Dice5, tooltip: '주사위를 굴렸을 때 대화창에 뜨는 결과 카드를 편집해요.' },
];

export default function MainAreaToolbar() {
  const mainMode = useUiStore((s) => s.mainMode);
  const setMainMode = useUiStore((s) => s.setMainMode);
  const mainSplit = useUiStore((s) => s.mainSplit);
  const editSubmode = useUiStore((s) => s.editSubmode);
  const setEditSubmode = useUiStore((s) => s.setEditSubmode);
  const directEditExperimentalEnabled = useUiStore((s) => s.directEditExperimentalEnabled);
  const setDirectEditExperimentalEnabled = useUiStore((s) => s.setDirectEditExperimentalEnabled);
  const legacyCssSanitize = usePreviewStore((s) => s.legacyCssSanitize);
  const setRoll20CompatibilityMode = usePreviewStore((s) => s.setRoll20CompatibilityMode);
  const roll20SandboxSanitize = usePreviewStore((s) => s.roll20SandboxSanitize);
  const setRoll20SandboxSanitize = usePreviewStore((s) => s.setRoll20SandboxSanitize);
  const documentLanguage = usePreviewStore((s) => s.documentLanguage);
  const setDocumentLanguage = usePreviewStore((s) => s.setDocumentLanguage);
  const roll20Mode: Roll20CompatibilityMode = legacyCssSanitize ? 'legacy' : 'modern';
  const visibleModes = directEditExperimentalEnabled
    ? [MODES[0], DIRECT_EDIT_MODE, ...MODES.slice(1)]
    : MODES;

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className="r20-strip flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-b border-[var(--border-subtle)] px-3 py-1.5"
        data-testid="main-area-toolbar"
      >
        {mainMode === 'preview' && <span className="sr-only" data-testid="preview-focus-toolbar" />}
        <div role="tablist" aria-label="화면 모드" className="r20-seg shrink-0">
          {visibleModes.map((mode) => {
            const isActive = mainMode === mode.key;
            const Icon = mode.Icon;
            return (
              <Tooltip key={mode.key}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-label={mode.label}
                    onClick={() => setMainMode(mode.key)}
                    className="r20-seg-btn"
                    data-testid={`main-mode-${mode.key}`}
                  >
                    <Icon aria-hidden="true" className="h-[18px] w-[18px]" />
                    <span className="hidden 2xl:inline">{mode.label}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>{mode.tooltip}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2.5 text-muted-foreground">
          {mainMode === 'edit' && (
            <div
              role="tablist"
              aria-label="편집 대상"
              className="r20-seg r20-seg--compact"
              data-testid="edit-submode-toolbar"
            >
              {SUBMODES.map((sub) => {
                const isActive = editSubmode === sub.key;
                const Icon = sub.Icon;
                return (
                  <Tooltip key={sub.key}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        aria-label={sub.label}
                        onClick={() => setEditSubmode(sub.key)}
                        className="r20-seg-btn"
                        data-testid={`edit-submode-${sub.key}`}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                        <span className="hidden 2xl:inline">{sub.label}</span>
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
              <label className="inline-flex h-9 cursor-pointer select-none items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated-2)] px-3 text-xs font-medium">
                <FlaskConical className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="hidden 2xl:inline">화면 편집 시험 기능</span>
                <input
                  type="checkbox"
                  checked={directEditExperimentalEnabled}
                  onChange={(event) => setDirectEditExperimentalEnabled(event.target.checked)}
                  aria-label="화면 직접 편집 시험 기능"
                  data-testid="direct-edit-experimental-toggle"
                  className="h-4 w-4 accent-[var(--primary)]"
                />
              </label>
            </TooltipTrigger>
            <TooltipContent>
              개발 중인 화면 직접 편집을 사용할 때만 켜세요. 설정은 이 브라우저에 저장됩니다.
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <label className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated-2)] px-3 text-xs font-medium">
                <Languages className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="hidden 2xl:inline">문서 언어</span>
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
            <span className="hidden px-2 text-xs font-semibold text-muted-foreground 2xl:inline">Roll20</span>
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
                      aria-label={`Roll20 ${label}`}
                      onClick={() => setRoll20CompatibilityMode(key)}
                      className="r20-seg-btn"
                      data-testid={`roll20-mode-${key}`}
                    >
                      <Icon aria-hidden="true" className="h-4 w-4" />
                      <span className="hidden 2xl:inline">{label}</span>
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
          <Tooltip>
            <TooltipTrigger asChild>
              <label className="inline-flex h-9 cursor-pointer select-none items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated-2)] px-3 text-xs font-medium">
                <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="hidden 2xl:inline">업로드 전 정리</span>
                <input
                  type="checkbox"
                  checked={roll20SandboxSanitize}
                  onChange={(event) => setRoll20SandboxSanitize(event.target.checked)}
                  aria-label="Roll20 업로드 전 정리 적용"
                  data-testid="roll20-sandbox-sanitize-toggle"
                  className="h-4 w-4 accent-[var(--primary)]"
                />
              </label>
            </TooltipTrigger>
            <TooltipContent>
              Roll20 샌드박스에 올리기 전에 필요한 정리를 미리 적용해요. 신버전·구버전 선택과는 별개예요.
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
