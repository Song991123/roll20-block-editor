'use client';

import { Blocks, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUiStore } from '@/lib/stores/uiStore';

const EMPTY_SHEET_HEIGHT = 600;

type PreviewEmptyStateProps = {
  canvasWidth: number;
  scale: number;
};

/** Editor-only blank canvas. It never becomes part of emitted sheet HTML. */
export default function PreviewEmptyState({
  canvasWidth,
  scale,
}: PreviewEmptyStateProps) {
  const setMainMode = useUiStore((state) => state.setMainMode);
  const handleImport = () => {
    window.dispatchEvent(new Event('r20:open-import'));
  };

  return (
    <div
      data-testid="empty-sheet-canvas-frame"
      className="mx-auto"
      style={{
        width: `${canvasWidth * scale}px`,
        height: `${EMPTY_SHEET_HEIGHT * scale}px`,
        maxWidth: 'none',
      }}
    >
      <div
        data-testid="empty-sheet-canvas"
        className="relative origin-top overflow-hidden bg-white shadow-sm ring-1 ring-zinc-200"
        style={{
          width: `${canvasWidth}px`,
          height: `${EMPTY_SHEET_HEIGHT}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center p-10 text-center">
          <div className="flex max-w-xs flex-col items-center gap-4">
            <FolderOpen
              className="h-9 w-9 text-[var(--primary-active)]"
              strokeWidth={1.6}
              aria-hidden="true"
            />
            <div>
              <h2 className="text-xl font-semibold text-zinc-800">시트 불러오기</h2>
              <p className="mt-1.5 text-sm leading-6 text-zinc-500">
                가지고 있는 HTML, CSS, 번역 파일로 시작하세요.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                size="sm"
                onClick={handleImport}
                className="gap-2"
                data-testid="empty-import-button"
              >
                <FolderOpen aria-hidden="true" />
                파일 선택하기
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMainMode('assemble')}
                className="gap-2 bg-white text-zinc-800"
                data-testid="empty-start-button"
              >
                <Blocks aria-hidden="true" />
                빈 시트로 시작
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
