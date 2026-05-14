'use client';

import { useEffect, useRef } from 'react';
import * as Blockly from 'blockly';
import { registerAllBlocks, getPhase1Toolbox } from '@/lib/blocks/registry';
import { useWorkspaceStore } from '@/lib/stores/workspaceStore';

/**
 * Native + useRef Blockly 통합.
 *
 * 결정 (10-6): wrapper 라이브러리 안 씀 — Blockly 의 inject/dispose 가 단일 div 대상이라
 * useRef + useEffect 만으로 충분. wrapper 의존성 추가 시 Blockly major 버전 업 위험.
 *
 * Phase 1 범위:
 * - Blockly 12 inject (Zelos renderer — 결정 10-9)
 * - 표준 logic/math 블록만 (커스텀 블록 130개는 Phase 2)
 * - changeListener 로 store 의 blockCount + dirty 갱신
 *
 * Phase 2+ 에서 추가:
 * - 워크스페이스 3개 (HTML / CSS / i18n) 탭 전환 시 dispose+inject
 * - XML serialize / deserialize
 * - example XML 로드
 */
export default function BlockWorkspace() {
  const containerRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const markDirty = useWorkspaceStore((s) => s.markDirty);
  const setBlockCount = useWorkspaceStore((s) => s.setBlockCount);

  useEffect(() => {
    if (!containerRef.current) return;
    // 블록 등록은 멱등 (Blockly.defineBlocksWithJsonArray 가 같은 type 중복 시 console.warn).
    registerAllBlocks();

    const ws = Blockly.inject(containerRef.current, {
      toolbox: getPhase1Toolbox(),
      renderer: 'zelos',
      theme: Blockly.Themes.Classic, // Phase 6 에서 커스텀 다크 테마
      grid: {
        spacing: 20,
        length: 1,
        colour: '#2a2e36',
        snap: true,
      },
      zoom: {
        controls: true,
        wheel: true,
        startScale: 0.85,
        maxScale: 3,
        minScale: 0.3,
        scaleSpeed: 1.2,
      },
      trashcan: true,
      move: {
        scrollbars: true,
        drag: true,
        wheel: false,
      },
    });
    workspaceRef.current = ws;

    const listener = () => {
      markDirty('html');
      setBlockCount('html', ws.getAllBlocks(false).length);
    };
    ws.addChangeListener(listener);

    // resize 시 Blockly viewport 갱신
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

  return <div ref={containerRef} className="w-full h-full" />;
}
