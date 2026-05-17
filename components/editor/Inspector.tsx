'use client';

import { useCallback, useMemo } from 'react';
import { MousePointerSquareDashed } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWorkspaceStore, type WorkspaceKey } from '@/lib/stores/workspaceStore';
import { useUiStore } from '@/lib/stores/uiStore';
import WidgetInspector from './WidgetInspector';
import {
  getBlocklyAdapter,
  type BlockSnapshot,
  type BlockFieldInfo,
} from '@/lib/blockly/adapter';
import { CATEGORIES } from '@/lib/blocks/types';

/**
 * Inspector — 선택된 블록의 schema 기반 자동 폼.
 *
 * Anchor: docs/spec/08_wireframes.md W2-D + D54 + 06_ia.md §3X.3.
 *
 * Stage A-1.5:
 *   - Blockly Block.inputList → editable fields 평탄화 (number / text / dropdown / checkbox).
 *   - 폼 onChange → adapter.setFieldValue → Blockly fireChangeListener → structureVersion 갱신
 *     → 미리보기 srcdoc 재생성.
 */
export default function Inspector() {
  const mainMode = useUiStore((s) => s.mainMode);
  if (mainMode === 'edit') {
    return <WidgetInspector />;
  }
  return <BlockInspector />;
}

function BlockInspector() {
  const selectedId = useWorkspaceStore((s) => s.selectedBlockId);
  // Perf hot path #3: see workspaceStore.WorkspaceMeta — counter, not string.
  const htmlV = useWorkspaceStore((s) => s.workspaces.html.structureVersion);
  const cssV = useWorkspaceStore((s) => s.workspaces.css.structureVersion);
  const i18nV = useWorkspaceStore((s) => s.workspaces.i18n.structureVersion);

  const { snap, key }: { snap: BlockSnapshot | null; key: WorkspaceKey | null } = useMemo(() => {
    if (!selectedId) return { snap: null, key: null };
    const adapter = getBlocklyAdapter();
    for (const k of ['html', 'css', 'i18n'] as WorkspaceKey[]) {
      const s = adapter.getBlock(k, selectedId);
      if (s) return { snap: s, key: k };
    }
    return { snap: null, key: null };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, htmlV, cssV, i18nV]);

  const fields: BlockFieldInfo[] = useMemo(() => {
    if (!selectedId || !key) return [];
    return getBlocklyAdapter().getBlockFields(key, selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, key, htmlV, cssV, i18nV]);

  const onFieldChange = useCallback(
    (name: string, value: string) => {
      if (!selectedId || !key) return;
      const adapter = getBlocklyAdapter();
      // Phase F (spec 17 §13) — setBlockField 는 events-guard 가 있어
      // hydrate / perfHook 의 Events.disable 카운터 미해소 환경에서도
      // BLOCK_CHANGE 가 정상 발화됨. 추가로 명시적 bumpStructure 호출 —
      // PreviewMain.onEditText 와 동일한 belt+suspenders 패턴 (Phase D fix
      // local_86b826b4 / Phase D fix add-block local_1abb2993 참고).
      const ok = adapter.setBlockField(key, selectedId, name, value);
      if (ok) {
        const count = adapter.listAllBlocks(key).length;
        useWorkspaceStore.getState().bumpStructure(key, count);
      }
    },
    [selectedId, key],
  );

  if (!selectedId || !snap) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 py-8 text-center">
        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-elevated-2)] text-muted-foreground">
          <MousePointerSquareDashed className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium text-foreground">선택된 블록 없음</p>
        <p className="mt-1 max-w-[240px] text-[11px] leading-relaxed text-muted-foreground">
          왼쪽 트리에서 블록을 선택하거나 미리보기에서 클릭해 보세요.
        </p>
      </div>
    );
  }

  const catMeta = snap.category ? CATEGORIES[snap.category] : null;

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-3">
        <div>
          <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">블록</div>
          <div className="mt-0.5 flex items-center gap-2">
            {catMeta && (
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: catMeta.swatchVar }}
                aria-hidden
              />
            )}
            <span className="text-sm font-medium text-foreground">{snap.label}</span>
          </div>
          <div className="mt-0.5 font-mono text-[10.5px] text-muted-foreground">{snap.type}</div>
          <div className="mt-0.5 font-mono text-[10px] text-muted-foreground/70">id: {snap.id}</div>
        </div>

        {fields.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-[var(--bg-elevated-2)] p-3 text-[11px] text-muted-foreground">
            편집 가능한 필드가 없는 블록이에요.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
              필드
            </div>
            {fields.map((f) => (
              <FieldRow key={f.name} field={f} onChange={onFieldChange} />
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

function FieldRow({
  field,
  onChange,
}: {
  field: BlockFieldInfo;
  onChange: (name: string, value: string) => void;
}) {
  const labelText = field.name;
  if (field.kind === 'dropdown') {
    return (
      <label className="block space-y-1">
        <span className="block text-[10.5px] font-medium text-muted-foreground">{labelText}</span>
        <select
          value={field.value}
          onChange={(e) => onChange(field.name, e.target.value)}
          className="h-8 w-full rounded-md border border-border bg-[var(--bg-elevated-2)] px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {(field.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    );
  }
  if (field.kind === 'number') {
    return (
      <label className="block space-y-1">
        <span className="block text-[10.5px] font-medium text-muted-foreground">{labelText}</span>
        <input
          type="number"
          value={field.value}
          onChange={(e) => onChange(field.name, e.target.value)}
          className="h-8 w-full rounded-md border border-border bg-[var(--bg-elevated-2)] px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </label>
    );
  }
  if (field.kind === 'checkbox') {
    return (
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={field.value === 'TRUE' || field.value === 'true'}
          onChange={(e) => onChange(field.name, e.target.checked ? 'TRUE' : 'FALSE')}
          className="h-3.5 w-3.5"
        />
        <span className="text-xs text-foreground">{labelText}</span>
      </label>
    );
  }
  return (
    <label className="block space-y-1">
      <span className="block text-[10.5px] font-medium text-muted-foreground">{labelText}</span>
      <input
        type="text"
        value={field.value}
        onChange={(e) => onChange(field.name, e.target.value)}
        className="h-8 w-full rounded-md border border-border bg-[var(--bg-elevated-2)] px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </label>
  );
}
