'use client';

/**
 * BlocklyModelHost — Blockly workspace 3개 (HTML/CSS/i18n) 의 hidden mount.
 *
 * Anchor: docs/spec/10_system_architecture.md §3.2 + §3.3.
 * 결정: D51 — `display:none` 대신 width/height 0 + visibility hidden + setVisible(false).
 *       (display:none 은 Blockly inject 시 0px viewport 로 inject 실패 — visibility 사용)
 *
 * UI 가 직접 import 하지 않음 — BlocklyModelHost 와 lib/blockly/adapter.ts 만.
 * 모든 외부 호출 site = lib/blockly/adapter.ts 통해서.
 */

import { useEffect, useRef } from 'react';
import * as Blockly from 'blockly';
import { getBlocklyAdapter } from '@/lib/blockly/adapter';
import {
  useWorkspaceStore,
  type WorkspaceKey,
} from '@/lib/stores/workspaceStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { registerAllBlocks } from '@/lib/blocks/registry';

const WORKSPACE_KEYS: WorkspaceKey[] = ['html', 'css', 'i18n'];

export default function BlocklyModelHost() {
  const hostRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<Partial<Record<WorkspaceKey, Blockly.WorkspaceSvg>>>({});
  const renderer = useSettingsStore((s) => s.blocklyRenderer);
  const setXmlCache = useWorkspaceStore((s) => s.setXmlCache);

  useEffect(() => {
    if (!hostRef.current) return;
    registerAllBlocks();
    const adapter = getBlocklyAdapter();

    for (const key of WORKSPACE_KEYS) {
      const mountId = `bl-host-${key}`;
      const mountPoint = hostRef.current.querySelector<HTMLDivElement>(`#${mountId}`);
      if (!mountPoint) continue;
      const ws = Blockly.inject(mountPoint, {
        toolbox: null as unknown as undefined,
        renderer,
        readOnly: false,
        trashcan: false,
        zoom: { controls: false, wheel: false, startScale: 1 },
        move: { scrollbars: false, drag: false, wheel: false },
        scrollbars: false,
        sounds: false,
      });
      // D51: 사용자 안 보임 + 렌더 비용 최소.
      ws.setVisible(false);
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

  return (
    <div
      ref={hostRef}
      className="blockly-model-host"
      aria-hidden="true"
      data-testid="blockly-model-host"
    >
      {/* 각 워크스페이스의 mount point. 사용자 안 보임 (visibility hidden). */}
      <div id="bl-host-html" style={{ width: 480, height: 360 }} />
      <div id="bl-host-css" style={{ width: 480, height: 360 }} />
      <div id="bl-host-i18n" style={{ width: 480, height: 360 }} />
    </div>
  );
}
