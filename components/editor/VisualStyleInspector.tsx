'use client';

import type { CSSProperties, KeyboardEvent } from 'react';
import { Dice5, RotateCcw } from 'lucide-react';
import type { LayerRole } from '@/lib/editor/layerRoles';
import type { ManagedDesignDeclarations } from '@/lib/editor/designPosition';
import {
  getVisualStylePresetGroup,
  presetMatches,
  type VisualStylePreset,
  type VisualStylePresetFamily,
  type VisualStylePresetScope,
} from '@/lib/editor/stylePresets';
import { cn } from '@/lib/utils/cn';

type VisualStyleInspectorProps = {
  values: Record<string, string>;
  role: LayerRole;
  blockType: string;
  scope: VisualStylePresetScope;
  onPatch: (declarations: ManagedDesignDeclarations) => void;
};

type LayoutMode = 'auto' | 'row' | 'column' | 'grid';

export default function VisualStyleInspector({
  values,
  role,
  blockType,
  scope,
  onPatch,
}: VisualStyleInspectorProps) {
  const layoutMode = resolveLayoutMode(values);
  const presetGroup = getVisualStylePresetGroup(role, blockType, scope);

  return (
    <div className="space-y-4" data-testid="visual-style-inspector">
      {presetGroup && (
        <StyleSection title={presetGroup.title}>
          <div className="grid grid-cols-2 gap-2" data-testid="design-style-presets">
            {presetGroup.presets.map((preset) => {
              const active = presetMatches(values, preset);
              return (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={active}
                  aria-label={`${presetGroup.title} ${preset.label}`}
                  title={preset.description}
                  className={cn(
                    'grid min-h-[104px] grid-rows-[68px_auto] gap-2 rounded-lg border p-2 text-left transition-colors',
                    active
                      ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-active)]'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--primary-soft-border)] hover:bg-[var(--bg-hover)]',
                  )}
                  onClick={() => onPatch(preset.declarations)}
                  data-testid={`design-preset-${presetGroup.family}-${preset.id}`}
                >
                  <PresetPreview family={presetGroup.family} preset={preset} />
                  <span className="truncate px-0.5 text-xs font-semibold">{preset.label}</span>
                </button>
              );
            })}
          </div>
        </StyleSection>
      )}

      <StyleSection title="크기와 여백">
        <div className="grid grid-cols-2 gap-2">
          <LengthField
            label="너비"
            value={values.width}
            onChange={(value) => onPatch({ width: value })}
            testid="design-style-width"
          />
          <LengthField
            label="최소 높이"
            value={values['min-height']}
            onChange={(value) => onPatch({ 'min-height': value })}
            testid="design-style-min-height"
          />
          <LengthField
            label="안쪽 여백"
            value={values.padding}
            onChange={(value) => onPatch({ padding: value })}
            testid="design-style-padding"
          />
          <LengthField
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
          <LengthField
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
            <LengthField
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
          <LengthField
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

function PresetPreview({
  family,
  preset,
}: {
  family: VisualStylePresetFamily;
  preset: VisualStylePreset;
}) {
  const declarations = preset.declarations;
  const style: CSSProperties = {
    backgroundColor: declarations['background-color'] ?? undefined,
    backgroundImage: declarations['background-image'] ?? undefined,
    color: declarations.color ?? undefined,
    borderWidth: declarations['border-width'] ?? undefined,
    borderStyle: declarations['border-style'] ?? undefined,
    borderColor: declarations['border-color'] ?? undefined,
    borderRadius: declarations['border-radius'] ?? undefined,
    boxShadow: declarations['box-shadow'] ?? undefined,
    fontSize: declarations['font-size'] ?? undefined,
    fontWeight: declarations['font-weight'] ?? undefined,
    textAlign: declarations['text-align'] as CSSProperties['textAlign'],
  };

  if (family === 'button') {
    return (
      <span className="grid h-[68px] w-full place-items-center overflow-hidden bg-[var(--bg-elevated-2)] px-2" aria-hidden="true">
        <span className="grid min-h-9 min-w-[76px] place-items-center gap-1 px-2" style={style}>
          <Dice5 className="h-4 w-4" />
        </span>
      </span>
    );
  }
  if (family === 'text') {
    return (
      <span className="grid h-[68px] w-full place-items-center overflow-hidden bg-[var(--bg-elevated-2)] px-2" aria-hidden="true">
        <span className="w-full" style={style}>구역 제목</span>
      </span>
    );
  }
  if (family === 'control') {
    return (
      <span className="grid h-[68px] w-full place-items-center overflow-hidden bg-[var(--bg-elevated-2)] px-2" aria-hidden="true">
        <span className="flex h-9 w-full items-center overflow-hidden px-2 text-xs" style={style}>12</span>
      </span>
    );
  }
  if (family === 'result-card') {
    return (
      <span className="grid h-[68px] w-full place-items-center overflow-hidden bg-[var(--bg-elevated-2)] px-2 py-1.5" aria-hidden="true">
        <span className="flex h-full w-full flex-col" style={style}>
          <span className="flex min-h-6 items-center justify-between border-b border-current/20 px-2 text-[9px] font-bold">
            <span>판정</span><Dice5 className="h-3 w-3" />
          </span>
          <span className="flex flex-1 items-center justify-between px-2 text-[9px]">
            <span className="opacity-65">결과</span><strong className="text-xs">12</strong>
          </span>
        </span>
      </span>
    );
  }
  if (family === 'result') {
    return (
      <span className="grid h-[68px] w-full place-items-center overflow-hidden bg-[var(--bg-elevated-2)] px-2" aria-hidden="true">
        <span className="flex h-10 w-full items-center justify-between gap-2 overflow-hidden px-2" style={style}>
          <span className="text-[9px] opacity-65">결과</span>
          <strong className="text-xs">12</strong>
        </span>
      </span>
    );
  }
  return (
    <span className="grid h-[68px] w-full place-items-center overflow-hidden bg-[var(--bg-elevated-2)] px-2 py-1.5" aria-hidden="true">
      <span className="flex h-full w-full flex-col justify-center gap-2 overflow-hidden px-2" style={style}>
        <span className="h-1.5 w-2/3 rounded-full bg-current opacity-70" />
        <span className="h-1.5 w-4/5 rounded-full bg-current opacity-30" />
      </span>
    </span>
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

function LengthField({
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
  const commit = (input: HTMLInputElement) => {
    const next = normalizeLengthValue(input.value);
    input.value = next ?? '';
    if (next !== (value || null)) onChange(next);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') event.currentTarget.blur();
    if (event.key === 'Escape') {
      event.preventDefault();
      event.currentTarget.value = value ?? '';
    }
  };

  return (
    <label className="block">
      <span className="r20-field-label">{label}</span>
      <input
        key={value ?? ''}
        type="text"
        inputMode="decimal"
        defaultValue={value ?? ''}
        onBlur={(event) => commit(event.currentTarget)}
        onKeyDown={onKeyDown}
        placeholder="자동"
        spellCheck={false}
        className="r20-input tabular-nums"
        data-testid={testid}
      />
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

function normalizeLengthValue(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  if (/^-?\d+(?:\.\d+)?$/.test(raw)) return `${Math.max(0, Number(raw))}px`;
  return raw;
}

function normalizeHex(value?: string): string | null {
  const raw = String(value ?? '').trim();
  if (/^#[0-9a-f]{6}$/i.test(raw)) return raw;
  const short = raw.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i);
  return short ? `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}` : null;
}
