'use client';

import { useCallback, useMemo } from 'react';
import { Copy, MousePointerSquareDashed, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  getBlocklyAdapter,
  type BlockFieldInfo,
  type BlockSnapshot,
} from '@/lib/blockly/adapter';
import { getLayerRole } from '@/lib/editor/layerRoles';
import { useWorkspaceStore, WORKSPACE_KEYS, type WorkspaceKey } from '@/lib/stores/workspaceStore';

const GEOMETRY_FIELDS = new Set(['LEFT_PX', 'TOP_PX', 'WIDTH_PX', 'HEIGHT_PX']);

function resolveSelectedBlock(blockId: string | null): {
  snapshot: BlockSnapshot | null;
  workspace: WorkspaceKey | null;
} {
  if (!blockId) return { snapshot: null, workspace: null };
  const adapter = getBlocklyAdapter();
  for (const workspace of WORKSPACE_KEYS) {
    const snapshot = adapter.listAllBlocks(workspace).find((block) => block.id === blockId);
    if (snapshot) return { snapshot, workspace };
  }
  return { snapshot: null, workspace: null };
}

export default function EditInspector() {
  const selectedId = useWorkspaceStore((s) => s.selectedBlockId);
  const structureVersion = useWorkspaceStore((s) =>
    s.workspaces.html.structureVersion
    + s.workspaces.css.structureVersion
    + s.workspaces.i18n.structureVersion
    + s.workspaces.worker.structureVersion,
  );
  const setSelected = useWorkspaceStore((s) => s.setSelectedBlockId);
  const { snapshot, workspace } = useMemo(() => {
    return {
      ...resolveSelectedBlock(selectedId),
    };
  // structureVersion is an intentional invalidation signal for the adapter's
  // external Blockly model; it is not read as a value inside the selector.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, structureVersion]);

  const fields = useMemo(() => {
    if (!selectedId || !workspace) return [];
    return getBlocklyAdapter().getBlockFields(workspace, selectedId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, workspace, structureVersion]);

  const commitField = useCallback((name: string, value: string) => {
    if (!selectedId || !workspace) return;
    const adapter = getBlocklyAdapter();
    if (!adapter.setBlockField(workspace, selectedId, name, value)) return;
    useWorkspaceStore.getState().bumpStructure(workspace, adapter.countBlocks(workspace));
  }, [selectedId, workspace]);

  const deleteSelected = useCallback(() => {
    if (!selectedId || !workspace) return;
    const adapter = getBlocklyAdapter();
    if (!adapter.deleteBlock(workspace, selectedId)) return;
    useWorkspaceStore.getState().bumpStructure(workspace, adapter.countBlocks(workspace));
    setSelected(null, 'inspector');
  }, [selectedId, workspace, setSelected]);

  const duplicateSelected = useCallback(() => {
    if (!selectedId || !workspace) return;
    const adapter = getBlocklyAdapter();
    const duplicateId = adapter.duplicateBlock(workspace, selectedId);
    if (!duplicateId) return;
    useWorkspaceStore.getState().bumpStructure(workspace, adapter.countBlocks(workspace));
    setSelected(duplicateId, 'inspector');
  }, [selectedId, workspace, setSelected]);

  if (!snapshot || !workspace) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 py-8 text-center" data-testid="edit-inspector-empty">
        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-elevated-2)] text-muted-foreground">
          <MousePointerSquareDashed className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium text-foreground">선택한 요소가 없어요</p>
        <p className="mt-1 max-w-[240px] text-[11px] leading-relaxed text-muted-foreground">
          시트에서 요소를 클릭하거나 레이어에서 선택하면 속성을 바꿀 수 있어요.
        </p>
      </div>
    );
  }

  const role = getLayerRole(snapshot.type);
  const parent = snapshot.layerParentId
    ? getBlocklyAdapter().listAllBlocks(workspace).find((item) => item.id === snapshot.layerParentId)
    : null;
  const geometry = fields.filter((field) => GEOMETRY_FIELDS.has(field.name));
  const editable = fields.filter((field) => !GEOMETRY_FIELDS.has(field.name));

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-3" data-testid="edit-inspector">
        <header className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">선택한 요소</div>
            <div className="mt-1 truncate text-sm font-semibold text-foreground">{snapshot.label}</div>
            <div className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">{snapshot.type}</div>
          </div>
          <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] ${role.className}`} data-testid="edit-inspector-role">
            {role.label}
          </span>
        </header>

        <div className="grid grid-cols-2 gap-2 text-[10px]" data-testid="edit-inspector-context">
          <ContextItem label="작업 공간" value={workspace.toUpperCase()} />
          <ContextItem label="관계" value={snapshot.layerRelation === 'child' ? '하위 요소' : snapshot.layerRelation === 'sibling' ? '같은 단계' : '최상위'} />
          <ContextItem label="부모 틀" value={parent?.label ?? '없음'} />
          <ContextItem label="자식" value={`${snapshot.childCount}개`} />
        </div>

        {geometry.length > 0 && (
          <Section title="위치와 크기">
            <div className="grid grid-cols-2 gap-2">
              {geometry.map((field) => (
                <FieldEditor key={field.name} field={field} onChange={commitField} />
              ))}
            </div>
          </Section>
        )}

        {editable.length > 0 && (
          <Section title="연결된 속성">
            <div className="space-y-2">
              {editable.map((field) => (
                <FieldEditor key={field.name} field={field} onChange={commitField} />
              ))}
            </div>
          </Section>
        )}

        {editable.length === 0 && geometry.length === 0 && (
          <p className="rounded border border-dashed border-border bg-[var(--bg-elevated-2)] p-3 text-[11px] leading-relaxed text-muted-foreground">
            이 요소는 바로 바꿀 수 있는 블록 속성이 없어요. 시트 위에서 끌어 위치를 바꿀 수 있습니다.
          </p>
        )}

        <div className="flex gap-2 border-t border-border pt-3">
          <button type="button" onClick={duplicateSelected} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded border border-border bg-[var(--bg-elevated-2)] px-2 py-1.5 text-xs text-muted-foreground hover:bg-[var(--bg-hover)] hover:text-foreground" data-testid="edit-inspector-duplicate">
            <Copy className="h-3.5 w-3.5" aria-hidden="true" /> 복제
          </button>
          <button type="button" onClick={deleteSelected} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded border border-red-500/30 bg-red-500/5 px-2 py-1.5 text-xs text-red-600 hover:bg-red-500/10" data-testid="edit-inspector-delete">
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> 삭제
          </button>
        </div>
      </div>
    </ScrollArea>
  );
}

function ContextItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border bg-[var(--bg-elevated-2)] px-2 py-1.5">
      <div className="text-[9px] text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate font-medium text-foreground">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-1.5 text-[10px] font-semibold text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function FieldEditor({ field, onChange }: { field: BlockFieldInfo; onChange: (name: string, value: string) => void }) {
  const label = field.name.replaceAll('_', ' ').toLowerCase();
  if (field.kind === 'checkbox') {
    return (
      <label className="flex items-center gap-2 rounded border border-border bg-[var(--bg-elevated-2)] px-2 py-1.5 text-xs">
        <input type="checkbox" checked={field.value === 'TRUE' || field.value === 'true' || field.value === '1'} onChange={(event) => onChange(field.name, event.target.checked ? 'TRUE' : 'FALSE')} />
        <span className="truncate">{label}</span>
      </label>
    );
  }
  if (field.kind === 'dropdown') {
    return (
      <label className="block space-y-1">
        <span className="block text-[10px] text-muted-foreground">{label}</span>
        <select value={field.value} onChange={(event) => onChange(field.name, event.target.value)} className="h-8 w-full rounded border border-border bg-[var(--bg-elevated-2)] px-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring">
          {(field.options ?? []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
    );
  }
  return (
    <label className="block space-y-1">
      <span className="block text-[10px] text-muted-foreground">{label}</span>
      <input type="text" inputMode={field.kind === 'number' ? 'decimal' : undefined} value={field.value} onChange={(event) => onChange(field.name, event.target.value)} className="h-8 w-full rounded border border-border bg-[var(--bg-elevated-2)] px-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring" data-testid={`edit-inspector-field-${field.name.toLowerCase()}`} />
    </label>
  );
}
