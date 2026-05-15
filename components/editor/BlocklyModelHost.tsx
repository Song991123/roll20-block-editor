'use client';

/**
 * BlocklyModelHost — Blockly workspace 3개 (HTML/CSS/i18n) mount.
 *
 * Anchor: docs/spec/10_system_architecture.md §3.2 + §3.3 + D26 ② 재결정.
 *
 * 결정 변경:
 *   - 이전 D51: workspace 영구 off-screen (left:-9999px) → 사용자 블록 조립 불가능.
 *   - 신규 D26 ② 재: `visible` prop 으로 메인 영역에서 직접 visible.
 *     mainMode='assemble' = 메인 영역에 fill, 사용자가 드래그/스냅/줌/팬 가능.
 *     mainMode='preview' = off-screen, 모델만 유지 (PreviewMain emit pipeline 변함 없음).
 *   - 워크스페이스 3개는 같은 컨테이너에 absolute 로 겹쳐 mount.
 *     활성 워크스페이스만 visibility:visible — 나머지는 hidden (D51 의 setVisible 회피 이유 그대로:
 *     Blockly inject 가 0 측정 시 newBlock + render 실패).
 *
 * UI 가 직접 import 하지 않음 — BlocklyModelHost 와 lib/blockly/adapter.ts 만.
 * 모든 외부 호출 site = lib/blockly/adapter.ts 통해서.
 */

import { useEffect, useRef, useState, type DragEvent } from 'react';
import * as Blockly from 'blockly';
import { toast } from 'sonner';
import { getBlocklyAdapter } from '@/lib/blockly/adapter';
import {
  useWorkspaceStore,
  type WorkspaceKey,
} from '@/lib/stores/workspaceStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { registerAllBlocks, getBlockDef } from '@/lib/blocks/registry';

const WORKSPACE_KEYS: WorkspaceKey[] = ['html', 'css', 'i18n'];

interface Props {
  /** true = 메인 영역에 visible (블록 조립 가능). false = off-screen (모델만 유지). */
  visible: boolean;
}

export default function BlocklyModelHost({ visible }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<Partial<Record<WorkspaceKey, Blockly.WorkspaceSvg>>>({});
  const renderer = useSettingsStore((s) => s.blocklyRenderer);
  const setXmlCache = useWorkspaceStore((s) => s.setXmlCache);
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);
  const appendBlock = useWorkspaceStore((s) => s.appendBlockToActive);
  const [dragOver, setDragOver] = useState(false);

  // Blockly inject — 한 번만, renderer 변경 시 재mount.
  useEffect(() => {
    if (!hostRef.current) return;
    registerAllBlocks();
    const adapter = getBlocklyAdapter();

    for (const key of WORKSPACE_KEYS) {
      const mountId = `bl-host-${key}`;
      const mountPoint = hostRef.current.querySelector<HTMLDivElement>(`#${mountId}`);
      if (!mountPoint) continue;
      // mainMode='assemble' 에서 사용자 인터랙션 받음 — zoom/scroll/drag 다 활성.
      const ws = Blockly.inject(mountPoint, {
        toolbox: null as unknown as undefined,
        renderer,
        readOnly: false,
        trashcan: true,
        zoom: {
          controls: true,
          wheel: true,
          startScale: 1,
          maxScale: 3,
          minScale: 0.3,
          scaleSpeed: 1.2,
        },
        move: { scrollbars: true, drag: true, wheel: true },
        scrollbars: true,
        sounds: false,
        grid: { spacing: 20, length: 3, colour: '#303030', snap: true },
      });
      wsRef.current[key] = ws;
      adapter.registerWorkspace(key, ws);

      // 변경 시 직렬화 → store 캐시.
      const listener = () => {
        if (ws.isDragging()) return;
        try {
          const dom = Blockly.Xml.workspaceToDom(ws);
          const xml = Blockly.Xml.domToText(dom);
          const count = ws.getAllBlocks(false).length;
          setXmlCache(key, xml, count);
        } catch {
          /* ignore — 직렬화 실패는 자주 회복 가능 */
        }
      };
      ws.addChangeListener(listener);
    }

    const cleanupRef = wsRef.current;
    return () => {
      for (const key of WORKSPACE_KEYS) {
        const ws = cleanupRef[key];
        if (ws) {
          adapter.unregisterWorkspace(key);
          ws.dispose();
        }
      }
      wsRef.current = {};
    };
  }, [renderer, setXmlCache]);

  // visible 또는 activeWorkspace 변경 → 활성 워크스페이스 svgResize.
  // 컨테이너 크기가 변하면 (off-screen 1px → fill) Blockly 가 자동 측정 안 함 → 명시 호출 필요.
  useEffect(() => {
    if (!visible) return;
    let raf1 = 0;
    let raf2 = 0;
    const doResize = () => {
      const ws = wsRef.current[activeWorkspace];
      if (ws) {
        try {
          Blockly.svgResize(ws);
        } catch {
          /* noop */
        }
      }
    };
    raf1 = requestAnimationFrame(() => {
      doResize();
      raf2 = requestAnimationFrame(doResize);
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [visible, activeWorkspace]);

  // ResizeObserver — 윈도우/사이드바 resize 시 활성 워크스페이스 재측정.
  useEffect(() => {
    if (!visible || !hostRef.current) return;
    const node = hostRef.current;
    const observer = new ResizeObserver(() => {
      const ws = wsRef.current[activeWorkspace];
      if (ws) {
        try {
          Blockly.svgResize(ws);
        } catch {
          /* noop */
        }
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible, activeWorkspace]);

  const isDragSource = (e: DragEvent<HTMLDivElement>) =>
    e.dataTransfer.types.includes('application/x-r20-block-type');

  return (
    <div
      ref={hostRef}
      className={`blockly-model-host${visible ? ' is-visible' : ''}${
        visible && dragOver ? ' is-drag-over' : ''
      }`}
      aria-hidden={!visible}
      data-testid="blockly-model-host"
      onDragOver={
        visible
          ? (e) => {
              if (!isDragSource(e)) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = 'copy';
              if (!dragOver) setDragOver(true);
            }
          : undefined
      }
      onDragLeave={
        visible
          ? (e) => {
              if (e.currentTarget === e.target) setDragOver(false);
            }
          : undefined
      }
      onDrop={
        visible
          ? (e) => {
              const type = e.dataTransfer.getData('application/x-r20-block-type');
              setDragOver(false);
              if (!type) return;
              e.preventDefault();
              const id = appendBlock(type);
              const def = getBlockDef(type);
              if (id) {
                toast(
                  `'${def?.label ?? type}' 추가됨 — ${activeWorkspace.toUpperCase()} 워크스페이스`,
                  { duration: 1600 },
                );
              } else {
                toast.error('블록 추가 실패', { duration: 2200 });
              }
            }
          : undefined
      }
    >
      <div
        id="bl-host-html"
        className={`blockly-host-slot${activeWorkspace === 'html' ? ' is-active' : ''}`}
        style={{ width: 480, height: 360 }}
      />
      <div
        id="bl-host-css"
        className={`blockly-host-slot${activeWorkspace === 'css' ? ' is-active' : ''}`}
        style={{ width: 480, height: 360 }}
      />
      <div
        id="bl-host-i18n"
        className={`blockly-host-slot${activeWorkspace === 'i18n' ? ' is-active' : ''}`}
        style={{ width: 480, height: 360 }}
      />
    </div>
  );
}
