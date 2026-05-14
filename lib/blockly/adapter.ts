/**
 * Blockly adapter — Blockly 12 API wrapping.
 *
 * Anchor: docs/spec/10_system_architecture.md §3.3 + §3.2.
 *
 * 모든 외부 컴포넌트는 본 adapter 통해서만 Blockly 호출.
 * 직접 `import * as Blockly` 는 BlocklyModelHost 와 본 모듈에서만 허용.
 *
 * 미래에 Blockly 메이저 변경 시 (R-9) — 본 모듈만 수정하면 컴포넌트 전부 무영향.
 */

import * as Blockly from 'blockly';
import type { WorkspaceKey } from '@/lib/stores/workspaceStore';

export interface BlockSnapshot {
  id: string;
  type: string;
  /** 자식 / 다음 블록 chain 의 들여쓰기 깊이. */
  depth: number;
  /** 사용자 표시용 한국어 라벨 (블록 정의 label). */
  label: string;
  /** 핵심 필드 미리보기 (예: text_input 의 name 필드 값). */
  preview: string;
  /** 카테고리 id — UI 색 띠 표시. */
  category: string | null;
}

export interface BlocklyAdapter {
  /** 3 워크스페이스의 Blockly 인스턴스 등록 (BlocklyModelHost 가 호출). */
  registerWorkspace(key: WorkspaceKey, ws: Blockly.WorkspaceSvg): void;
  unregisterWorkspace(key: WorkspaceKey): void;

  getWorkspace(key: WorkspaceKey): Blockly.WorkspaceSvg | null;

  /** flat snapshot — 좌측 트리 가상 리스트용. */
  listAllBlocks(key: WorkspaceKey): BlockSnapshot[];

  getBlock(key: WorkspaceKey, id: string): BlockSnapshot | null;

  /** Inspector 폼 onChange → 호출. */
  setFieldValue(key: WorkspaceKey, blockId: string, fieldName: string, value: string): void;

  /** 워크스페이스 → XML 직렬화 (스토어 캐시 / 자동저장). */
  serializeXml(key: WorkspaceKey): string;

  /** XML → 워크스페이스 하이드레이트. */
  hydrateFromXml(key: WorkspaceKey, xml: string): void;

  /** workspace event listener 등록. unsubscribe 함수 반환. */
  onChange(key: WorkspaceKey, listener: () => void): () => void;
}

class DefaultAdapter implements BlocklyAdapter {
  private workspaces: Partial<Record<WorkspaceKey, Blockly.WorkspaceSvg>> = {};

  registerWorkspace(key: WorkspaceKey, ws: Blockly.WorkspaceSvg): void {
    this.workspaces[key] = ws;
  }

  unregisterWorkspace(key: WorkspaceKey): void {
    delete this.workspaces[key];
  }

  getWorkspace(key: WorkspaceKey): Blockly.WorkspaceSvg | null {
    return this.workspaces[key] ?? null;
  }

  listAllBlocks(key: WorkspaceKey): BlockSnapshot[] {
    const ws = this.workspaces[key];
    if (!ws) return [];
    const out: BlockSnapshot[] = [];
    for (const block of ws.getTopBlocks(true)) {
      this.walk(block, 0, out);
    }
    return out;
  }

  private walk(block: Blockly.Block, depth: number, out: BlockSnapshot[]): void {
    out.push({
      id: block.id,
      type: block.type,
      depth,
      label: block.type, // Stage A 의 BlockDef.label 로 후속 교체
      preview: this.previewFor(block),
      category: null,
    });
    for (const child of block.getChildren(true)) {
      this.walk(child, depth + 1, out);
    }
  }

  private previewFor(block: Blockly.Block): string {
    // 첫 필드 값 1개만 표시 (UX 단순)
    const fields = block.inputList.flatMap((input) => input.fieldRow);
    for (const f of fields) {
      const v = f.getValue?.();
      if (typeof v === 'string' && v && v !== 'undefined') return String(v).slice(0, 40);
    }
    return '';
  }

  getBlock(key: WorkspaceKey, id: string): BlockSnapshot | null {
    const ws = this.workspaces[key];
    if (!ws) return null;
    const b = ws.getBlockById(id);
    if (!b) return null;
    return {
      id: b.id,
      type: b.type,
      depth: 0,
      label: b.type,
      preview: this.previewFor(b),
      category: null,
    };
  }

  setFieldValue(key: WorkspaceKey, blockId: string, fieldName: string, value: string): void {
    const ws = this.workspaces[key];
    const b = ws?.getBlockById(blockId);
    b?.setFieldValue(value, fieldName);
  }

  serializeXml(key: WorkspaceKey): string {
    const ws = this.workspaces[key];
    if (!ws) return '';
    const dom = Blockly.Xml.workspaceToDom(ws);
    return Blockly.Xml.domToText(dom);
  }

  hydrateFromXml(key: WorkspaceKey, xml: string): void {
    const ws = this.workspaces[key];
    if (!ws || !xml) return;
    Blockly.Events.disable();
    try {
      ws.clear();
      const dom = Blockly.utils.xml.textToDom(xml);
      Blockly.Xml.domToWorkspace(dom, ws);
    } finally {
      Blockly.Events.enable();
    }
  }

  onChange(key: WorkspaceKey, listener: () => void): () => void {
    const ws = this.workspaces[key];
    if (!ws) return () => {};
    ws.addChangeListener(listener);
    return () => ws.removeChangeListener(listener);
  }
}

let _adapter: BlocklyAdapter | null = null;

export function getBlocklyAdapter(): BlocklyAdapter {
  if (!_adapter) _adapter = new DefaultAdapter();
  return _adapter;
}
