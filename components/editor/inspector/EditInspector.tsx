'use client';

/**
 * EditInspector — inspector for the block selected on the edit canvas.
 *
 * Shows identity (label/type/role), placement context (parent container,
 * placement mode), geometry (position/size with commit through the editor
 * command layer), class/style basics, and the block's schema fields.
 *
 * All mutations go through lib/editor/editorCommands so the canvas, layer
 * panel, and emitted HTML/CSS stay in sync through the normal emit pipeline.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, MousePointerSquareDashed, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  getBlocklyAdapter,
  type BlockFieldInfo,
  type BlockSnapshot,
} from '@/lib/blockly/adapter';
import { getLayerRole } from '@/lib/editor/layerRoles';
import { measureBlockRectInHost, parseCssPx, type SheetRect } from '@/lib/editor/geometry';
import {
  commitResize,
  deleteBlockCommand,
  duplicateBlockCommand,
  resolveBlockWorkspace,
  setBlockFieldCommand,
  upsertCssDeclarations,
} from '@/lib/editor/editorCommands';
import { useWorkspaceStore, type WorkspaceKey } from '@/lib/stores/workspaceStore';

const GEOMETRY_FIELDS = new Set(['LEFT_PX', 'TOP_PX', 'WIDTH_PX', 'HEIGHT_PX', 'STYLE', 'CLASS']);

function findShadowHost(): HTMLDivElement | null {
  return document.querySelector<HTMLDivElement>('[data-testid="edit-canvas-shadow-host"]');
}

export default function EditInspector() {
  const selectedId = useWorkspaceStore((s) => s.selectedBlockId);
  const htmlV = useWorkspaceStore((s) => s.workspaces.html.structureVersion);
  const cssV = useWorkspaceStore((s) => s.workspaces.css.structureVersion);
  const i18nV = useWorkspaceStore((s) => s.workspaces.i18n.structureVersion);
  const setSelected = useWorkspaceStore((s) => s.setSelectedBlockId);
  const [measured, setMeasured] = useState<SheetRect | null>(null);

  const { snap, ws }: { snap: BlockSnapshot | null; ws: WorkspaceKey | null } = useMemo(() => {
    void htmlV;
    void cssV;
    void i18nV;
    if (!selectedId) return { snap: null, ws: null };
    const wsKey = resolveBlockWorkspace(selectedId);
    if (!wsKey) return { snap: null, ws: null };
    return { snap: getBlocklyAdapter().getBlock(wsKey, selectedId), ws: wsKey };
  }, [selectedId, htmlV, cssV, i18nV]);

  const parentSnap = useMemo(() => {
    if (!snap?.layerParentId || !ws) return null;
    return getBlocklyAdapter().getBlock(ws, snap.layerParentId);
  }, [snap, ws]);

  const fields: BlockFieldInfo[] = useMemo(() => {
    if (!selectedId || !ws) return [];
    return getBlocklyAdapter().getBlockFields(ws, selectedId);
  }, [selectedId, ws, htmlV, cssV, i18nV]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (!selectedId) {
        setMeasured(null);
        return;
      }
      const host = findShadowHost();
      setMeasured(host ? measureBlockRectInHost(host, selectedId) : null);
    }, 60);
    return () => window.clearTimeout(handle);
  }, [selectedId, htmlV, cssV, i18nV]);

  const style = useMemo(() => {
    if (!selectedId || !ws) return '';
    return getBlocklyAdapter().getBlockField(ws, selectedId, 'STYLE') ?? '';
  }, [selectedId, ws, htmlV, cssV, i18nV]); // eslint-disable-line react-hooks/exhaustive-deps

  const adapter = getBlocklyAdapter();
  const hasPosFields = Boolean(
    selectedId && ws && adapter.hasBlockField(ws, selectedId, 'LEFT_PX') && adapter.hasBlockField(ws, selectedId, 'TOP_PX'),
  );
  const styleLeft = parseCssPx(style, 'left');
  const styleTop = parseCssPx(style, 'top');
  const isAbsolute = hasPosFields || /position\s*:\s*absolute/i.test(style);

  const posLeft = hasPosFields && selectedId && ws
    ? Number.parseFloat(adapter.getBlockField(ws, selectedId, 'LEFT_PX') ?? '0') || 0
    : styleLeft;
  const posTop = hasPosFields && selectedId && ws
    ? Number.parseFloat(adapter.getBlockField(ws, selectedId, 'TOP_PX') ?? '0') || 0
    : styleTop;

  const setPosition = useCallback(
    (axis: 'left' | 'top', value: number) => {
      if (!selectedId || !ws) return;
      const px = Math.max(0, Math.round(value));
      if (hasPosFields) {
        setBlockFieldCommand(selectedId, axis === 'left' ? 'LEFT_PX' : 'TOP_PX', String(px));
        return;
      }
      const current = getBlocklyAdapter().getBlockField(ws, selectedId, 'STYLE') ?? '';
      setBlockFieldCommand(selectedId, 'STYLE', upsertCssDeclarations(current, { [axis]: `${px}px` }));
    },
    [selectedId, ws, hasPosFields],
  );

  const setSize = useCallback(
    (dim: 'width' | 'height', value: number) => {
      if (!selectedId) return;
      const host = findShadowHost();
      const rect = host ? measureBlockRectInHost(host, selectedId) : null;
      const width = dim === 'width' ? value : rect?.width ?? value;
      const height = dim === 'height' ? value : rect?.height ?? value;
      commitResize({ blockId: selectedId, width, height });
    },
    [selectedId],
  );

  const onFieldChange = useCallback(
    (name: string, value: string) => {
      if (!selectedId) return;
      setBlockFieldCommand(selectedId, name, value);
    },
    [selectedId],
  );

  if (!selectedId || !snap) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 py-8 text-center" data-testid="edit-inspector-empty">
        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-elevated-2)] text-muted-foreground">
          <MousePointerSquareDashed className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium text-foreground">선택한 요소가 없어요</p>
        <p className="mt-1 max-w-[240px] text-[11px] leading-relaxed text-muted-foreground">
          시트에서 요소를 클릭하거나 왼쪽 갤러리에서 새 요소를 끌어오세요.
        </p>
      </div>
    );
  }

  const role = getLayerRole(snap.type);
  const schemaFields = fields.filter((f) => !GEOMETRY_FIELDS.has(f.name));
  const classField = fields.find((f) => f.name === 'CLASS');

  return (
    <ScrollArea className="h-full">
      <div className="space-y-3.5 p-3" data-testid="edit-inspector">
        <header>
          <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">요소</div>
          <div className="mt-0.5 flex items-center gap-2">
            <span
              aria-hidden
              className={`grid h-4 w-4 shrink-0 place-items-center rounded border text-[9px] ${role.className}`}
            >
              {role.icon}
            </span>
            <span className="min-w-0 truncate text-sm font-medium text-foreground">{snap.label}</span>
            <span className="shrink-0 rounded border border-border bg-[var(--bg-elevated-2)] px-1.5 py-0.5 text-[9px] text-muted-foreground">
              {role.label}
            </span>
          </div>
          <div className="mt-0.5 font-mono text-[10.5px] text-muted-foreground">{snap.type}</div>
          <div className="mt-2 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                const newId = duplicateBlockCommand(selectedId);
                if (newId) setSelected(newId, 'tree');
              }}
              className="inline-flex items-center gap-1 rounded border border-border bg-[var(--bg-elevated-2)] px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-[var(--bg-hover)] hover:text-foreground"
              data-testid="edit-inspector-duplicate"
            >
              <Copy aria-hidden="true" className="h-3 w-3" />
              복제
            </button>
            <button
              type="button"
              onClick={() => {
                if (deleteBlockCommand(selectedId)) setSelected(null, 'tree');
              }}
              className="inline-flex items-center gap-1 rounded border border-border bg-[var(--bg-elevated-2)] px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-500"
              data-testid="edit-inspector-delete"
            >
              <Trash2 aria-hidden="true" className="h-3 w-3" />
              삭제
            </button>
          </div>
        </header>

        <Section title="배치">
          <div className="space-y-1.5 rounded border border-border bg-[var(--bg-elevated-2)] p-2 text-[11px]">
            <Row label="상위 틀">
              {parentSnap ? (
                <button
                  type="button"
                  onClick={() => setSelected(parentSnap.id, 'tree')}
                  className="max-w-full truncate rounded border border-border bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground"
                  data-testid="edit-inspector-parent"
                  title={`${parentSnap.label} (${parentSnap.type})`}
                >
                  {parentSnap.label}
                </button>
              ) : (
                <span className="text-muted-foreground">시트 바탕 (루트)</span>
              )}
            </Row>
            <Row label="배치 방식">
              <span data-testid="edit-inspector-placement">
                {isAbsolute ? '자유 배치 (absolute)' : '흐름 배치 (flow)'}
              </span>
            </Row>
            <Row label="담기 가능">
              <span>{role.canReceiveChildren ? `가능 (하위 ${snap.childCount}개)` : '불가'}</span>
            </Row>
          </div>
        </Section>

        <Section title="위치 / 크기">
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              label="x"
              value={posLeft}
              disabled={!isAbsolute && posLeft == null}
              onCommit={(v) => setPosition('left', v)}
              testid="edit-inspector-x"
            />
            <NumberField
              label="y"
              value={posTop}
              disabled={!isAbsolute && posTop == null}
              onCommit={(v) => setPosition('top', v)}
              testid="edit-inspector-y"
            />
            <NumberField
              label="너비"
              value={parseCssPx(style, 'width') ?? (measured ? Math.round(measured.width) : null)}
              onCommit={(v) => setSize('width', v)}
              testid="edit-inspector-width"
            />
            <NumberField
              label="높이"
              value={parseCssPx(style, 'height') ?? (measured ? Math.round(measured.height) : null)}
              onCommit={(v) => setSize('height', v)}
              testid="edit-inspector-height"
            />
          </div>
          {!isAbsolute && (
            <p className="mt-1.5 text-[10.5px] leading-relaxed text-muted-foreground">
              흐름 배치 요소는 x/y 대신 순서로 움직입니다. 레이어 패널이나 캔버스 드래그로 순서를 바꿀 수 있어요.
            </p>
          )}
          {measured && (
            <p className="mt-1 text-[10px] tabular-nums text-muted-foreground/80" data-testid="edit-inspector-measured">
              화면 측정 {Math.round(measured.width)} x {Math.round(measured.height)}px / 캔버스 기준 ({Math.round(measured.left)}, {Math.round(measured.top)})
            </p>
          )}
        </Section>

        {classField && (
          <Section title="CSS 클래스">
            <input
              type="text"
              value={classField.value}
              onChange={(e) => onFieldChange('CLASS', e.target.value)}
              placeholder="예: stat-box highlighted"
              className="w-full rounded border border-border bg-[var(--bg-elevated-2)] px-2 py-1 text-xs outline-none transition-colors focus:border-[var(--color-primary,#2563eb)] focus:ring-1 focus:ring-[var(--color-primary,#2563eb)]"
              data-testid="edit-inspector-class"
              spellCheck={false}
              autoComplete="off"
            />
          </Section>
        )}

        {fields.some((f) => f.name === 'STYLE') && (
          <Section title="인라인 스타일">
            <textarea
              value={style}
              onChange={(e) => onFieldChange('STYLE', e.target.value)}
              rows={3}
              className="w-full rounded border border-border bg-[var(--bg-elevated-2)] px-2 py-1 font-mono text-[11px] outline-none transition-colors focus:border-[var(--color-primary,#2563eb)] focus:ring-1 focus:ring-[var(--color-primary,#2563eb)]"
              data-testid="edit-inspector-style"
              spellCheck={false}
            />
          </Section>
        )}

        {schemaFields.length > 0 && (
          <Section title="필드">
            <div className="space-y-2.5">
              {schemaFields.map((f) => (
                <FieldRow key={f.name} field={f} onChange={onFieldChange} />
              ))}
            </div>
          </Section>
        )}
      </div>
    </ScrollArea>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right text-foreground">{children}</span>
    </div>
  );
}

function NumberField({
  label,
  value,
  disabled,
  onCommit,
  testid,
}: {
  label: string;
  value: number | null;
  disabled?: boolean;
  onCommit: (v: number) => void;
  testid?: string;
}) {
  const [draft, setDraft] = useState<string>(value == null ? '' : String(value));
  const [prevValue, setPrevValue] = useState<number | null>(value);
  if (value !== prevValue) {
    // Reset the draft when the committed value changes (React "adjust state
    // during render" pattern instead of a cascading effect).
    setPrevValue(value);
    setDraft(value == null ? '' : String(value));
  }
  const commit = () => {
    const n = Number.parseFloat(draft);
    if (Number.isFinite(n)) onCommit(n);
  };
  return (
    <label className="flex items-center gap-1.5 text-xs">
      <span className="w-8 shrink-0 text-[11px] font-medium text-muted-foreground">{label}</span>
      <input
        type="number"
        value={draft}
        disabled={disabled}
        placeholder={disabled ? '-' : ''}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
        }}
        className="min-w-0 flex-1 rounded border border-border bg-[var(--bg-elevated-2)] px-2 py-1 text-xs tabular-nums outline-none transition-colors focus:border-[var(--color-primary,#2563eb)] focus:ring-1 focus:ring-[var(--color-primary,#2563eb)] disabled:opacity-50"
        data-testid={testid}
      />
    </label>
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
