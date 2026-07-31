'use client';

import { RotateCcw } from 'lucide-react';
import type { LayerRole } from '@/lib/editor/layerRoles';
import type { ManagedDesignDeclarations } from '@/lib/editor/designPosition';
import { cn } from '@/lib/utils/cn';

type VisualStyleInspectorProps = {
  values: Record<string, string>;
  role: LayerRole;
  onPatch: (declarations: ManagedDesignDeclarations) => void;
};

type LayoutMode = 'auto' | 'row' | 'column' | 'grid';

export default function VisualStyleInspector({
  values,
  role,
  onPatch,
}: VisualStyleInspectorProps) {
  const layoutMode = resolveLayoutMode(values);

  return (
    <div className="space-y-4" data-testid="visual-style-inspector">
      <StyleSection title="크기와 여백">
        <div className="grid grid-cols-2 gap-2">
          <PxField
            label="너비"
            value={values.width}
            onChange={(value) => onPatch({ width: value })}
            testid="design-style-width"
          />
          <PxField
            label="최소 높이"
            value={values['min-height']}
            onChange={(value) => onPatch({ 'min-height': value })}
            testid="design-style-min-height"
          />
          <PxField
            label="안쪽 여백"
            value={values.padding}
            onChange={(value) => onPatch({ padding: value })}
            testid="design-style-padding"
          />
          <PxField
            label="모서리"
            value={values['border-radius']}
            onChange={(value) => onPatch({ 'border-radius': value })}
            testid="design-style-radius"
          />
        </div>
      </StyleSection>

      <StyleSection title="색">
        <div className="space-y-2">
          <ColorField
            label="채우기"
            value={values['background-color']}
            onChange={(value) => onPatch({ 'background-color': value })}
            testid="design-style-background"
          />
          <ColorField
            label="글자"
            value={values.color}
            onChange={(value) => onPatch({ color: value })}
            testid="design-style-color"
          />
        </div>
      </StyleSection>

      <StyleSection title="테두리">
        <div className="grid grid-cols-2 gap-2">
          <PxField
            label="두께"
            value={values['border-width']}
            onChange={(value) => onPatch({ 'border-width': value })}
            testid="design-style-border-width"
          />
          <label className="block">
            <span className="r20-field-label">선 모양</span>
            <select
              value={values['border-style'] ?? ''}
              onChange={(event) => onPatch({ 'border-style': event.target.value || null })}
              className="r20-input"
              data-testid="design-style-border-style"
            >
              <option value="">없음</option>
              <option value="solid">실선</option>
              <option value="dashed">점선</option>
              <option value="dotted">둥근 점선</option>
              <option value="double">이중선</option>
            </select>
          </label>
        </div>
        <div className="mt-2">
          <ColorField
            label="선 색"
            value={values['border-color']}
            onChange={(value) => onPatch({ 'border-color': value })}
            testid="design-style-border-color"
          />
        </div>
      </StyleSection>

      {role.canReceiveChildren && (
        <StyleSection title="안쪽 배치">
          <div
            className="grid grid-cols-4 overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated-2)]"
            role="group"
            aria-label="안쪽 요소 배치"
            data-testid="design-style-layout"
          >
            {([
              ['auto', '기본'],
              ['row', '가로'],
              ['column', '세로'],
              ['grid', '격자'],
            ] as const).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                aria-pressed={layoutMode === mode}
                className={cn(
                  'h-9 border-r border-[var(--border-subtle)] px-2 text-xs font-semibold last:border-r-0',
                  layoutMode === mode
                    ? 'bg-[var(--primary-strong)] text-white'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
                )}
                onClick={() => onPatch(layoutPatch(mode))}
                data-testid={`design-style-layout-${mode}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <PxField
              label="사이 간격"
              value={values.gap}
              onChange={(value) => onPatch({ gap: value })}
              testid="design-style-gap"
            />
            <label className="block">
              <span className="r20-field-label">맞춤</span>
              <select
                value={values['align-items'] ?? ''}
                onChange={(event) => onPatch({ 'align-items': event.target.value || null })}
                className="r20-input"
                data-testid="design-style-align"
              >
                <option value="">기본</option>
                <option value="flex-start">시작</option>
                <option value="center">가운데</option>
                <option value="flex-end">끝</option>
                <option value="stretch">늘이기</option>
              </select>
            </label>
          </div>
        </StyleSection>
      )}

      <StyleSection title="글자">
        <div className="grid grid-cols-2 gap-2">
          <PxField
            label="크기"
            value={values['font-size']}
            onChange={(value) => onPatch({ 'font-size': value })}
            testid="design-style-font-size"
          />
          <label className="block">
            <span className="r20-field-label">굵기</span>
            <select
              value={values['font-weight'] ?? ''}
              onChange={(event) => onPatch({ 'font-weight': event.target.value || null })}
              className="r20-input"
              data-testid="design-style-font-weight"
            >
              <option value="">기본</option>
              <option value="400">보통</option>
              <option value="600">도톰</option>
              <option value="700">굵게</option>
              <option value="900">아주 굵게</option>
            </select>
          </label>
        </div>
        <label className="mt-2 block">
          <span className="r20-field-label">정렬</span>
          <select
            value={values['text-align'] ?? ''}
            onChange={(event) => onPatch({ 'text-align': event.target.value || null })}
            className="r20-input"
            data-testid="design-style-text-align"
          >
            <option value="">기본</option>
            <option value="left">왼쪽</option>
            <option value="center">가운데</option>
            <option value="right">오른쪽</option>
          </select>
        </label>
      </StyleSection>
    </div>
  );
}

function StyleSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-[var(--text-secondary)]">{title}</h3>
      {children}
    </section>
  );
}

function PxField({
  label,
  value,
  onChange,
  testid,
}: {
  label: string;
  value?: string;
  onChange: (value: string | null) => void;
  testid: string;
}) {
  return (
    <label className="block">
      <span className="r20-field-label">{label}</span>
      <div className="relative">
        <input
          type="number"
          min="0"
          step="1"
          value={readNumber(value)}
          onChange={(event) => {
            const next = event.target.value;
            onChange(next === '' ? null : `${Math.max(0, Number(next))}px`);
          }}
          className="r20-input pr-8 tabular-nums"
          data-testid={testid}
        />
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">px</span>
      </div>
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
  testid,
}: {
  label: string;
  value?: string;
  onChange: (value: string | null) => void;
  testid: string;
}) {
  const swatch = normalizeHex(value) ?? '#ffffff';
  return (
    <div className="grid grid-cols-[72px_40px_minmax(0,1fr)_34px] items-center gap-2">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        type="color"
        value={swatch}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-10 cursor-pointer rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-1"
        aria-label={`${label} 색상표`}
        data-testid={`${testid}-swatch`}
      />
      <input
        type="text"
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value || null)}
        placeholder="없음"
        spellCheck={false}
        className="r20-input min-w-0 font-mono"
        aria-label={`${label} 색상 값`}
        data-testid={`${testid}-text`}
      />
      <button
        type="button"
        onClick={() => onChange(null)}
        className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-muted-foreground hover:bg-[var(--bg-hover)] hover:text-foreground"
        title={`${label} 되돌리기`}
        aria-label={`${label} 되돌리기`}
        data-testid={`${testid}-clear`}
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function resolveLayoutMode(values: Record<string, string>): LayoutMode {
  if (values.display === 'grid') return 'grid';
  if (values.display === 'flex') {
    return values['flex-direction'] === 'column' ? 'column' : 'row';
  }
  return 'auto';
}

function layoutPatch(mode: LayoutMode): ManagedDesignDeclarations {
  if (mode === 'row') return { display: 'flex', 'flex-direction': 'row' };
  if (mode === 'column') return { display: 'flex', 'flex-direction': 'column' };
  if (mode === 'grid') return { display: 'grid', 'flex-direction': null };
  return { display: null, 'flex-direction': null };
}

function readNumber(value?: string): string {
  if (!value) return '';
  const match = value.match(/^-?\d+(?:\.\d+)?/);
  return match ? match[0] : '';
}

function normalizeHex(value?: string): string | null {
  const raw = String(value ?? '').trim();
  if (/^#[0-9a-f]{6}$/i.test(raw)) return raw;
  const short = raw.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i);
  return short ? `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}` : null;
}
