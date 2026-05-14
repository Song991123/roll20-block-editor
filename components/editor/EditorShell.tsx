'use client';

import EditorHeader from './EditorHeader';
import BlockWorkspace from './BlockWorkspace';

/**
 * Phase 1 의 최소 에디터 shell.
 *
 * 추후 (Phase 2~3):
 * - WorkspaceTabs (HTML / CSS / i18n 3-탭) 추가
 * - RightPanel (Code / Preview 4-탭) 추가
 * - ToolboxPanel (커스텀 카테고리 toolbox) 추가
 *
 * 지금은 빈 Blockly workspace 만 띄움 — Blockly inject 동작 확인용.
 */
export default function EditorShell() {
  return (
    <div className="flex flex-col h-screen">
      <EditorHeader />
      <main className="flex flex-1 min-h-0">
        <div className="flex-1 min-w-0">
          <BlockWorkspace />
        </div>
        <aside className="w-[400px] border-l border-neutral-800 bg-neutral-900/50 flex flex-col">
          <div className="px-4 py-3 border-b border-neutral-800 text-sm text-neutral-400">
            우측 패널 (Phase 2 에서 코드/미리보기 추가)
          </div>
          <div className="flex-1 overflow-auto p-4 text-xs text-neutral-500 font-mono">
            <p className="mb-2">Phase 1 — Blockly workspace bootstrap.</p>
            <p className="mb-2">블록을 끌어보세요. (현재는 logic + math 표준 블록만 등록)</p>
            <p>Phase 2 에서 156 Roll20 블록 마이그레이션.</p>
          </div>
        </aside>
      </main>
    </div>
  );
}
