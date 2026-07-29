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
  WORKSPACE_KEYS,
  useWorkspaceStore,
  type WorkspaceKey,
} from '@/lib/stores/workspaceStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { registerAllBlocks, getBlockDef } from '@/lib/blocks/registry';
import { playSfx } from '@/lib/sfx';
import { shouldPlayBlockSnap } from '@/lib/editor/blocklySoundPolicy';

const BLOCKLY_MEDIA_PATH = 'blockly-media/';

interface Props {
  /** true = 메인 영역에 visible (블록 조립 가능). false = off-screen (모델만 유지). */
  visible: boolean;
}

export default function BlocklyModelHost({ visible }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<Partial<Record<WorkspaceKey, Blockly.Workspace>>>({});
  const serializedRef = useRef<Partial<Record<WorkspaceKey, string>>>({});
  const renderer = useSettingsStore((s) => s.blocklyRenderer);
  const bumpStructure = useWorkspaceStore((s) => s.bumpStructure);
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);
  const appendBlock = useWorkspaceStore((s) => s.appendBlockToActive);
  const [dragOver, setDragOver] = useState(false);

  // Blockly inject — 한 번만, renderer 변경 시 재mount.
  useEffect(() => {
    if (!hostRef.current) return;
    registerAllBlocks();
    const adapter = getBlocklyAdapter();
    const serializedStore = serializedRef.current;

    for (const key of WORKSPACE_KEYS) {
      const mountId = `bl-host-${key}`;
      const mountPoint = hostRef.current.querySelector<HTMLDivElement>(`#${mountId}`);
      if (visible && !mountPoint) continue;
      // mainMode='assemble' 에서 사용자 인터랙션 받음 — zoom/scroll/drag 다 활성.
      const ws: Blockly.Workspace = visible
        ? Blockly.inject(mountPoint!, {
            toolbox: null as unknown as undefined,
            renderer,
            media: BLOCKLY_MEDIA_PATH,
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
          })
        : new Blockly.Workspace();
      wsRef.current[key] = ws;
      adapter.registerWorkspace(key, ws);

      const savedXml = serializedStore[key];
      if (savedXml) {
        try {
          adapter.hydrateFromXml(key, savedXml);
        } finally {
          delete serializedStore[key];
        }
      }

      // Perf hot path #3 (Phase 4): replace 50-200ms serialize-on-every-event
      // with a sub-microsecond version bump.
      //
      // Old listener: ran `Blockly.Xml.workspaceToDom + domToText` on EVERY
      //   Blockly event (UI clicks, viewport pans, selection changes, etc.) —
      //   serializing the full workspace at 4500 blocks ≈ 50-200ms per event,
      //   easily 5-15 longtasks per interactive second.
      // New listener:
      //   (a) Filter to MUTATION events only (BLOCK_CHANGE/CREATE/DELETE/MOVE
      //       + VAR_* + COMMENT_*). UI / viewport / selection events bypass.
      //   (b) No serialize — just `getAllBlocks(false).length` (single O(N)
      //       tree walk, < 0.5ms at 4500 blocks) + bumpStructure (counter++).
      //   (c) Coalesce bursts (Blockly fires CREATE+MOVE+CHANGE together for a
      //       single add) into one bump per microtask.
      //   (d) The serialized XML is fetched on-demand by ExportDialog / Save
      //       via `adapter.serializeXml(key)` — same cost, but only once per
      //       user export, not 5-15× per second.
      //
      // SFX behaviour preserved verbatim (snap on drag-end BLOCK_MOVE w/ parent
      // change).
      let bumpScheduled = false;
      const listener = (ev?: Blockly.Events.Abstract) => {
        if (ws.rendered && (ws as Blockly.WorkspaceSvg).isDragging()) return;
        if (!ev) return;
        // Snap SFX — preserved (drag-end BLOCK_MOVE with parent change).
        if (ev.type === Blockly.Events.BLOCK_MOVE) {
          const mv = ev as Blockly.Events.BlockMove;
          if (shouldPlayBlockSnap(mv)) {
            playSfx('block.snap');
          }
        }
        // Mutation gate — UI / viewport / theme events are NO-OP for store.
        const t = ev.type;
        const isMutation =
          t === Blockly.Events.BLOCK_CHANGE ||
          t === Blockly.Events.BLOCK_CREATE ||
          t === Blockly.Events.BLOCK_DELETE ||
          t === Blockly.Events.BLOCK_MOVE ||
          t === Blockly.Events.VAR_CREATE ||
          t === Blockly.Events.VAR_DELETE ||
          t === Blockly.Events.VAR_RENAME ||
          t === Blockly.Events.COMMENT_CHANGE ||
          t === Blockly.Events.COMMENT_CREATE ||
          t === Blockly.Events.COMMENT_DELETE ||
          t === Blockly.Events.COMMENT_MOVE ||
          t === Blockly.Events.FINISHED_LOADING;
        if (!isMutation) return;
        if (bumpScheduled) return;
        bumpScheduled = true;
        queueMicrotask(() => {
          bumpScheduled = false;
          try {
            const count = ws.getAllBlocks(false).length;
            bumpStructure(key, count);
          } catch {
            /* workspace torn down mid-event */
          }
        });
      };
      ws.addChangeListener(listener);
    }

    const cleanupRef = wsRef.current;
    return () => {
      for (const key of WORKSPACE_KEYS) {
        const ws = cleanupRef[key];
        if (ws) {
          try {
            serializedStore[key] = adapter.serializeXml(key);
          } catch {
            delete serializedStore[key];
          }
          adapter.unregisterWorkspace(key);
          ws.dispose();
        }
      }
      wsRef.current = {};
    };
  }, [renderer, visible, bumpStructure]);

  // visible 또는 activeWorkspace 변경 → 활성 워크스페이스 svgResize.
  // 컨테이너 크기가 변하면 (off-screen 1px → fill) Blockly 가 자동 측정 안 함 → 명시 호출 필요.
  useEffect(() => {
    if (!visible) return;
    let raf1 = 0;
    let raf2 = 0;
    const doResize = () => {
      const ws = getBlocklyAdapter().getWorkspaceSvg(activeWorkspace);
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
      const ws = getBlocklyAdapter().getWorkspaceSvg(activeWorkspace);
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
                playSfx('block.add');
                toast(
                  `'${def?.label ?? type}' 추가됨 — ${activeWorkspace.toUpperCase()} 워크스페이스`,
                  { duration: 1600 },
                );
              } else {
                playSfx('toast.error');
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
      <div
        id="bl-host-worker"
        className={`blockly-host-slot${activeWorkspace === 'worker' ? ' is-active' : ''}`}
        style={{ width: 480, height: 360 }}
      />
    </div>
  );
}
