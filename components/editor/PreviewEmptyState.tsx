'use client';

import { FilePlus, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
            <FilePlus
              className="h-9 w-9 text-[var(--primary-active)]"
              strokeWidth={1.6}
              aria-hidden="true"
            />
            <div>
              <h2 className="text-xl font-semibold text-zinc-800">빈 시트</h2>
              <p className="mt-1.5 text-sm leading-6 text-zinc-500">
                왼쪽에서 조각을 끌어 놓으세요.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleImport}
              className="gap-2 bg-white text-zinc-800"
              data-testid="empty-import-button"
            >
              <FolderOpen aria-hidden="true" />
              시트 파일 불러오기
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
