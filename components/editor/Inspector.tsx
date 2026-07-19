'use client';

import { useCallback, useMemo } from 'react';
import { MousePointerSquareDashed } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { WORKSPACE_KEYS, useWorkspaceStore, type WorkspaceKey } from '@/lib/stores/workspaceStore';
import { useUiStore } from '@/lib/stores/uiStore';
import EditInspector from './EditInspector';
import {
  getBlocklyAdapter,
  type BlockSnapshot,
  type BlockFieldInfo,
} from '@/lib/blockly/adapter';
import { CATEGORIES } from '@/lib/blocks/types';
import { fieldDisplayLabel } from './fieldLabels';

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
    return <EditInspector />;
  }
  return <BlockInspector />;
}

function BlockInspector() {
  const selectedId = useWorkspaceStore((s) => s.selectedBlockId);
  // Perf hot path #3: see workspaceStore.WorkspaceMeta — counter, not string.
  const htmlV = useWorkspaceStore((s) => s.workspaces.html.structureVersion);
  const cssV = useWorkspaceStore((s) => s.workspaces.css.structureVersion);
  const i18nV = useWorkspaceStore((s) => s.workspaces.i18n.structureVersion);
  const workerV = useWorkspaceStore((s) => s.workspaces.worker.structureVersion);

  const { snap, key }: { snap: BlockSnapshot | null; key: WorkspaceKey | null } = useMemo(() => {
    if (!selectedId) return { snap: null, key: null };
    const adapter = getBlocklyAdapter();
    for (const k of WORKSPACE_KEYS) {
      const s = adapter.getBlock(k, selectedId);
      if (s) return { snap: s, key: k };
    }
    return { snap: null, key: null };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, htmlV, cssV, i18nV, workerV]);

  const fields: BlockFieldInfo[] = useMemo(() => {
    if (!selectedId || !key) return [];
    return getBlocklyAdapter().getBlockFields(key, selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, key, htmlV, cssV, i18nV, workerV]);

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
        <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--bg-elevated-2)] text-muted-foreground">
          <MousePointerSquareDashed className="h-6 w-6" aria-hidden="true" />
        </div>
        <p className="text-base font-semibold text-foreground">아직 고른 블록이 없어요</p>
        <p className="mt-1.5 max-w-[260px] text-sm leading-relaxed text-[var(--text-secondary)]">
          작업 공간에서 블록을 클릭하거나, 시트 화면에서 원하는 요소를 눌러보세요.
        </p>
      </div>
    );
  }

  const catMeta = snap.category ? CATEGORIES[snap.category] : null;

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-3.5">
        <div className="r20-form-card">
          <div className="text-xs font-semibold text-muted-foreground">고른 블록</div>
          <div className="mt-1.5 flex items-center gap-2">
            {catMeta && (
              <span
                className="inline-block h-3 w-3 shrink-0 rounded-full ring-1 ring-inset ring-black/10"
                style={{ backgroundColor: catMeta.swatchVar }}
                aria-hidden
              />
            )}
            <span className="text-base font-semibold text-foreground">{snap.label}</span>
          </div>
          {catMeta && (
            <div className="mt-1 text-sm text-[var(--text-secondary)]">{catMeta.label} 종류</div>
          )}
          <details className="mt-2 group">
            <summary className="cursor-pointer select-none text-xs font-medium text-muted-foreground hover:text-foreground">
              자세한 정보 보기
            </summary>
            <div className="mt-1.5 rounded-lg bg-[var(--bg-elevated-2)] px-2.5 py-2 font-mono text-xs leading-relaxed text-muted-foreground">
              <div>{snap.type}</div>
              <div className="opacity-80">id: {snap.id}</div>
            </div>
          </details>
        </div>

        {fields.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-elevated-2)] p-3.5 text-sm leading-relaxed text-[var(--text-secondary)]">
            이 블록에는 여기서 바꿀 수 있는 값이 없어요.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm font-semibold text-[var(--text-secondary)]">
              바꿀 수 있는 값
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
  const labelText = fieldDisplayLabel(field.name);
  if (field.kind === 'dropdown') {
    return (
      <label className="block">
        <span className="r20-field-label">{labelText}</span>
        <select
          value={field.value}
          onChange={(e) => onChange(field.name, e.target.value)}
          className="r20-input"
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
      <label className="block">
        <span className="r20-field-label">{labelText}</span>
        <input
          type="number"
          value={field.value}
          onChange={(e) => onChange(field.name, e.target.value)}
          className="r20-input tabular-nums"
        />
      </label>
    );
  }
  if (field.kind === 'checkbox') {
    return (
      <label className="flex items-center gap-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm font-medium">
        <input
          type="checkbox"
          checked={field.value === 'TRUE' || field.value === 'true'}
          onChange={(e) => onChange(field.name, e.target.checked ? 'TRUE' : 'FALSE')}
          className="h-[18px] w-[18px] accent-[var(--primary)]"
        />
        <span className="text-foreground">{labelText}</span>
      </label>
    );
  }
  return (
    <label className="block">
      <span className="r20-field-label">{labelText}</span>
      <input
        type="text"
        value={field.value}
        onChange={(e) => onChange(field.name, e.target.value)}
        className="r20-input"
      />
    </label>
  );
}
