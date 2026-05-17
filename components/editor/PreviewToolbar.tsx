'use client';

import { Maximize2, Minus, Plus, RefreshCw, Moon, Sun, Layers, Check, Frame } from 'lucide-react';
import type { PreviewLayer } from '@/lib/stores/uiStore';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useUiStore } from '@/lib/stores/uiStore';
import { usePreviewStore } from '@/lib/stores/previewStore';
import { cn } from '@/lib/utils/cn';

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2];

// spec 17 §9.1 — 9 레이어. 라벨은 자연어, desc 는 보조 설명.
const LAYERS: Array<{ id: PreviewLayer; label: string; desc: string }> = [
  { id: 'all', label: '전체', desc: '모든 element 정상' },
  { id: 'structure', label: '구조', desc: 'fieldset / section 윤곽선' },
  { id: 'input', label: '입력', desc: 'input / select / textarea / 체크박스 / 라디오' },
  { id: 'roll', label: '굴림 버튼', desc: 'button[type=roll]' },
  { id: 'text', label: '텍스트', desc: 'label / heading / 정적 텍스트' },
  { id: 'image', label: '이미지', desc: 'img / icon / 배경 이미지' },
  { id: 'table', label: '표', desc: 'table / thead / tbody / tr / td' },
  { id: 'repeating', label: '반복 영역', desc: 'fieldset.repeating_*' },
  { id: 'custom', label: '사용자정의', desc: '사용자 클래스' },
];

/**
 * 미리보기 줌 / 옵션 컨트롤.
 *
 * Anchor: docs/spec/08_wireframes.md W2-C + D52 (fit-to-width default).
 * Polish: Phase A-9 — 통일된 버튼 크기 (h-8) + 통일된 lucide 아이콘 (h-4 w-4) +
 *         레이어 dropdown 은 Radix Portal 기반 (DropdownMenu) 사용해 viewport
 *         밖으로 잘리는 것 방지 (`side="top"` + `sideOffset=6`).
 */
export default function PreviewToolbar() {
  const zoom = useUiStore((s) => s.previewZoom);
  const setZoom = useUiStore((s) => s.setPreviewZoom);
  const darkMode = usePreviewStore((s) => s.darkMode);
  const setDarkMode = usePreviewStore((s) => s.setDarkMode);
  const renderMode = usePreviewStore((s) => s.renderMode);
  const setRenderMode = usePreviewStore((s) => s.setRenderMode);

  const numericZoom = typeof zoom === 'number' ? zoom : 1;

  const previewLayer = useUiStore((s) => s.previewLayer);
  const setPreviewLayer = useUiStore((s) => s.setPreviewLayer);

  const stepZoom = (dir: 1 | -1) => {
    const idx = ZOOM_STEPS.indexOf(numericZoom);
    const nextIdx = idx === -1
      ? ZOOM_STEPS.findIndex((s) => s >= numericZoom)
      : Math.max(0, Math.min(ZOOM_STEPS.length - 1, idx + dir));
    setZoom(ZOOM_STEPS[nextIdx] ?? ZOOM_STEPS[2]);
  };

  // 모든 아이콘 버튼: h-8 w-8, 아이콘 h-4 w-4 — 통일성.
  const ICON_BTN = 'h-8 w-8';
  const ICON_SIZE = 'h-4 w-4';

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-11 shrink-0 items-center justify-center gap-1 border-t border-border bg-[var(--bg-elevated)] px-3 text-xs">
        {/* 줌 컨트롤 그룹 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={ICON_BTN}
              onClick={() => stepZoom(-1)}
              aria-label="축소"
            >
              <Minus className={ICON_SIZE} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">축소</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={zoom === 'fit' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 gap-1.5 px-2.5 text-[11px]"
              onClick={() => setZoom('fit')}
              aria-label="화면 맞춤"
              aria-pressed={zoom === 'fit'}
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span>맞춤</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">화면 폭에 맞춤</TooltipContent>
        </Tooltip>

        <span className="min-w-[52px] text-center font-mono tabular-nums text-muted-foreground">
          {zoom === 'fit' ? '맞춤' : `${Math.round(numericZoom * 100)}%`}
        </span>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={ICON_BTN}
              onClick={() => stepZoom(1)}
              aria-label="확대"
            >
              <Plus className={ICON_SIZE} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">확대</TooltipContent>
        </Tooltip>

        <span className="mx-1.5 h-5 w-px bg-border" />

        {/* 다크 모드 토글 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={darkMode ? 'secondary' : 'ghost'}
              size="icon"
              className={ICON_BTN}
              onClick={() => setDarkMode(!darkMode)}
              aria-label={darkMode ? '라이트 모드로' : '다크 모드로'}
              aria-pressed={darkMode}
            >
              {darkMode ? <Sun className={ICON_SIZE} /> : <Moon className={ICON_SIZE} />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">{darkMode ? '라이트' : '다크'} 미리보기</TooltipContent>
        </Tooltip>

        <span className="mx-1.5 h-5 w-px bg-border" />

        {/* spec 21 Phase A — Roll20 환경 시뮬 토글 (ON = iframe sandbox, OFF = Shadow DOM) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={renderMode === 'iframe' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 gap-1.5 px-2.5 text-[11px]"
              onClick={() => setRenderMode(renderMode === 'iframe' ? 'shadow' : 'iframe')}
              aria-label="Roll20 환경 시뮬"
              aria-pressed={renderMode === 'iframe'}
              data-testid="preview-rendermode-toggle"
            >
              <Frame className="h-3.5 w-3.5" />
              <span>{renderMode === 'iframe' ? 'Roll20 시뮬' : '편집 모드'}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {renderMode === 'iframe'
              ? 'iframe sandbox — Roll20 환경 시뮬레이션 (현재)'
              : 'Shadow DOM — 편집 가능 컨테이너 (현재)'}
          </TooltipContent>
        </Tooltip>

        <span className="mx-1.5 h-5 w-px bg-border" />

        {/* 레이어 토글 — Radix Portal 기반 DropdownMenu 사용 (viewport 안 자동 배치) */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant={previewLayer !== 'all' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-8 gap-1.5 px-2.5 text-[11px]"
                  aria-label="레이어"
                  data-testid="preview-layer-button"
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>
                    {LAYERS.find((l) => l.id === previewLayer)?.label ?? '레이어'}
                  </span>
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="top">레이어 (9개)</TooltipContent>
          </Tooltip>
          <DropdownMenuContent
            side="top"
            align="end"
            sideOffset={6}
            className="w-64"
            data-testid="preview-layer-menu"
          >
            <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              레이어 (9)
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {LAYERS.map((l) => {
              const active = previewLayer === l.id;
              return (
                <DropdownMenuItem
                  key={l.id}
                  onSelect={() => setPreviewLayer(l.id)}
                  data-testid={`preview-layer-${l.id}`}
                  className={cn(
                    'flex items-start gap-2 py-1.5',
                    active && 'bg-[var(--bg-active)] text-foreground',
                  )}
                >
                  <span className="mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                    {active ? <Check className="h-3.5 w-3.5" /> : null}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-[12px] leading-tight">{l.label}</span>
                    <span className="text-[10px] leading-tight text-muted-foreground">
                      {l.desc}
                    </span>
                  </span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <span className="mx-1.5 h-5 w-px bg-border" />

        {/* 새로고침 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={ICON_BTN}
              aria-label="다시 그리기"
            >
              <RefreshCw className={ICON_SIZE} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">다시 그리기</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
