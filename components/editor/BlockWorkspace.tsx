'use client';

import { useEffect, useRef, useState } from 'react';
import * as Blockly from 'blockly';
import { registerAllBlocks, getDefaultToolbox } from '@/lib/blocks/registry';
import { buildEditorTheme } from '@/lib/blocks/theme';
import { useWorkspaceStore } from '@/lib/stores/workspaceStore';
import EmptyWorkspaceHint from './EmptyWorkspaceHint';

/**
 * Blockly workspace wrapper.
 *
 * - useRef + useEffect 만 사용 (wrapper 라이브러리 안 씀 — 결정 10-6)
 * - Zelos renderer (둥근 모양, Scratch 식)
 * - 커스텀 다크 테마 (lib/blocks/theme.ts) — toolbox 텍스트 콘트라스트
 * - blockCount === 0 일 때 EmptyWorkspaceHint 오버레이
 */
export default function BlockWorkspace({
  onRequestLoadExample,
}: {
  onRequestLoadExample?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const markDirty = useWorkspaceStore((s) => s.markDirty);
  const setBlockCount = useWorkspaceStore((s) => s.setBlockCount);
  const blockCount = useWorkspaceStore((s) => s.workspaces.html.blockCount);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    registerAllBlocks();

    const ws = Blockly.inject(containerRef.current, {
      toolbox: getDefaultToolbox(),
      renderer: 'zelos',
      theme: buildEditorTheme(),
      grid: {
        spacing: 24,
        length: 1,
        colour: 'rgba(255,255,255,0.04)',
        snap: true,
      },
      zoom: {
        controls: true,
        wheel: true,
        startScale: 0.9,
        maxScale: 3,
        minScale: 0.3,
        scaleSpeed: 1.2,
      },
      trashcan: true,
      move: { scrollbars: true, drag: true, wheel: false },
    });
    workspaceRef.current = ws;
    setHydrated(true);

    const listener = () => {
      markDirty('html');
      setBlockCount('html', ws.getAllBlocks(false).length);
    };
    ws.addChangeListener(listener);

    const onResize = () => {
      if (workspaceRef.current) Blockly.svgResize(workspaceRef.current);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      ws.removeChangeListener(listener);
      ws.dispose();
      workspaceRef.current = null;
    };
  }, [markDirty, setBlockCount]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {hydrated && blockCount === 0 && (
        <EmptyWorkspaceHint onLoadExample={onRequestLoadExample} />
      )}
    </div>
  );
}
