import { getBlocklyAdapter } from '@/lib/blockly/adapter';
import { commitManagedDesignPosition } from '@/lib/editor/designPosition';
import { useWorkspaceStore } from '@/lib/stores/workspaceStore';
import { flushEmitPipeline } from '@/lib/preview/useEmitPipeline';

export const FRIENDLY_WIDGET_MIME = 'application/x-r20-friendly-widget';

export type FriendlyWidgetGroup = 'layout' | 'text' | 'input' | 'action' | 'media';

export type FriendlyWidgetPreset = {
  id: string;
  group: FriendlyWidgetGroup;
  label: string;
  description: string;
  blockType: string;
  fields: Record<string, string>;
  preview: 'box' | 'heading' | 'label' | 'text' | 'number' | 'textarea' | 'checkbox' | 'image' | 'button';
};

export type AppendFriendlyWidgetOptions = {
  mode?: 'absolute' | 'flow' | 'absolute-in-container';
  containerBlockId?: string | null;
  placement?: 'inside' | 'before' | 'after';
  siblingBlockId?: string | null;
};

export const FRIENDLY_WIDGET_GROUPS: Record<FriendlyWidgetGroup, string> = {
  layout: '레이아웃',
  text: '텍스트',
  input: '입력',
  action: '버튼',
  media: '이미지',
};

export const FRIENDLY_WIDGET_PRESETS: FriendlyWidgetPreset[] = [
  {
    id: 'section',
    group: 'layout',
    label: '구역 박스',
    description: '여러 요소를 묶는 기본 영역',
    blockType: 'r20_div',
    preview: 'box',
    fields: {
      CLASS: 'section',
      STYLE: 'width: 320px; min-height: 180px; padding: 12px; border: 1px solid #d4d4d8',
    },
  },
  {
    id: 'row',
    group: 'layout',
    label: '가로줄',
    description: '입력칸을 가로로 정렬하는 줄',
    blockType: 'r20_row',
    preview: 'box',
    fields: {
      STYLE: 'width: 360px; min-height: 42px; display: flex; gap: 8px; align-items: center',
    },
  },
  {
    id: 'heading',
    group: 'text',
    label: '제목',
    description: '시트 구역 제목',
    blockType: 'r20_heading',
    preview: 'heading',
    fields: {
      LEVEL: '2',
      TEXT: '제목',
      CLASS: 'section-title',
      STYLE: 'font-size: 22px; font-weight: 700',
    },
  },
  {
    id: 'label',
    group: 'text',
    label: '라벨',
    description: '입력칸 옆에 붙는 짧은 글자',
    blockType: 'r20_static_text',
    preview: 'label',
    fields: {
      TEXT: '라벨',
      CLASS: 'field-label',
      STYLE: 'font-weight: 600',
    },
  },
  {
    id: 'text-input',
    group: 'input',
    label: '글자 입력',
    description: '이름, 직업 같은 짧은 값',
    blockType: 'r20_text_input',
    preview: 'text',
    fields: {
      NAME: 'name',
      CLASS: 'text-input',
      DEFAULT: '',
      STYLE: 'width: 180px',
    },
  },
  {
    id: 'number-input',
    group: 'input',
    label: '숫자 입력',
    description: 'HP, 능력치 같은 수치 값',
    blockType: 'r20_number_input',
    preview: 'number',
    fields: {
      NAME: 'value',
      CLASS: 'number-input',
      DEFAULT: '0',
      STYLE: 'width: 72px; text-align: center',
    },
  },
  {
    id: 'textarea',
    group: 'input',
    label: '긴 글 입력',
    description: '메모, 설명, 배경 설정',
    blockType: 'r20_textarea',
    preview: 'textarea',
    fields: {
      NAME: 'notes',
      CLASS: 'textarea',
      ROWS: '4',
      DEFAULT: '',
      STYLE: 'width: 260px; min-height: 96px',
    },
  },
  {
    id: 'checkbox',
    group: 'input',
    label: '체크박스',
    description: '켜짐/꺼짐 상태',
    blockType: 'r20_checkbox',
    preview: 'checkbox',
    fields: {
      NAME: 'flag',
      VALUE: '1',
      CLASS: 'checkbox',
      STYLE: '',
    },
  },
  {
    id: 'chat-button',
    group: 'action',
    label: '채팅 버튼',
    description: '누르면 채팅에 문장이나 매크로를 보냅니다',
    blockType: 'r20_chat_button',
    preview: 'button',
    fields: {
      NAME: 'say',
      LABEL: '말하기',
      MESSAGE: 'Hello',
      CLASS: 'chat-button',
      STYLE: 'min-width: 86px',
    },
  },
  {
    id: 'action-button',
    group: 'action',
    label: '액션 버튼',
    description: '시트 worker의 clicked 이벤트용 버튼',
    blockType: 'r20_action_button',
    preview: 'button',
    fields: {
      NAME: 'action',
      LABEL: 'Action',
      CLASS: 'action-button',
      STYLE: 'min-width: 86px',
    },
  },
  {
    id: 'image',
    group: 'media',
    label: '이미지',
    description: '로고, 배경 조각, 장식 이미지',
    blockType: 'r20_image',
    preview: 'image',
    fields: {
      SRC: '',
      ALT: '',
      CLASS: 'image',
      WIDTH: '160',
      HEIGHT: '',
      STYLE: 'width: 160px; min-height: 90px; object-fit: cover',
    },
  },
];

export function findFriendlyWidgetPreset(id: string): FriendlyWidgetPreset | null {
  return FRIENDLY_WIDGET_PRESETS.find((preset) => preset.id === id) ?? null;
}

export function appendFriendlyWidgetPreset(
  preset: FriendlyWidgetPreset,
  position?: { left: number; top: number },
  options: AppendFriendlyWidgetOptions = {},
): string | null {
  const state = useWorkspaceStore.getState();
  if (Date.now() - state.lastClearedAt < 1200) return null;

  const requestedFlow = options.mode === 'flow' && Boolean(options.containerBlockId || options.siblingBlockId);
  const requestedAbsoluteInContainer = options.mode === 'absolute-in-container' && Boolean(options.containerBlockId);
  const targetPosition = requestedFlow ? position : findOpenWidgetPosition(position);
  const id = state.appendBlockToActive(preset.blockType, 'html');
  if (!id) return null;

  const adapter = getBlocklyAdapter();
  for (const [field, value] of Object.entries(preset.fields)) {
    if (field === 'STYLE') continue;
    adapter.setBlockField('html', id, field, value);
  }

  const baseStyle = preset.fields.STYLE ?? '';
  let useFlowStyle = false;
  let useContainerAbsoluteStyle = false;
  if (requestedFlow && options.placement === 'before' && options.siblingBlockId) {
    useFlowStyle = adapter.moveBlockBefore('html', id, options.siblingBlockId);
    if (useFlowStyle) {
      state.bumpStructure('html', adapter.countBlocks('html'));
      state.setSelectedBlockId(id, 'tree');
    }
  } else if (requestedFlow && options.placement === 'after' && options.siblingBlockId) {
    useFlowStyle = adapter.moveBlockAfter('html', id, options.siblingBlockId);
    if (useFlowStyle) {
      state.bumpStructure('html', adapter.countBlocks('html'));
      state.setSelectedBlockId(id, 'tree');
    }
  } else if (requestedFlow && options.containerBlockId) {
    useFlowStyle = adapter.nestBlockInContainer('html', id, options.containerBlockId);
    if (useFlowStyle) {
      state.bumpStructure('html', adapter.countBlocks('html'));
      state.setSelectedBlockId(id, 'tree');
    }
  } else if (requestedAbsoluteInContainer && options.containerBlockId) {
    useContainerAbsoluteStyle = adapter.nestBlockInContainer('html', id, options.containerBlockId);
    if (useContainerAbsoluteStyle) {
      state.bumpStructure('html', adapter.countBlocks('html'));
      state.setSelectedBlockId(id, 'tree');
    }
  }

  const style = removeCssDeclarations(baseStyle, ['position', 'left', 'top']);
  if (style || adapter.hasBlockField('html', id, 'STYLE')) {
    adapter.setBlockField('html', id, 'STYLE', style);
  }
  if (!useFlowStyle) {
    const containingBlockId = useContainerAbsoluteStyle ? options.containerBlockId ?? null : null;
    const parentStyle = containingBlockId
      ? adapter.getBlockField('html', containingBlockId, 'STYLE') ?? ''
      : '';
    const committed = commitManagedDesignPosition(adapter, {
      workspace: 'html',
      blockId: id,
      left: useContainerAbsoluteStyle ? position?.left ?? 24 : targetPosition?.left ?? 24,
      top: useContainerAbsoluteStyle ? position?.top ?? 24 : targetPosition?.top ?? 24,
      containingBlockId,
      containingBlockNeedsRelative: Boolean(containingBlockId) && !hasPositionDeclaration(parentStyle),
    });
    if (committed.cssBlockCreated) {
      state.bumpStructure('css', adapter.countBlocks('css'));
    }
  }
  flushEmitPipeline();
  return id;
}

export function encodeFriendlyWidgetDrag(id: string): string {
  return JSON.stringify({ id });
}

export function decodeFriendlyWidgetDrag(value: string): FriendlyWidgetPreset | null {
  try {
    const parsed = JSON.parse(value) as { id?: unknown };
    return typeof parsed.id === 'string' ? findFriendlyWidgetPreset(parsed.id) : null;
  } catch {
    return null;
  }
}

function findOpenWidgetPosition(position?: { left: number; top: number }): { left: number; top: number } {
  const adapter = getBlocklyAdapter();
  const base = position ?? defaultWidgetPosition(adapter.countBlocks('html'));
  const existing = adapter
    .listAllBlocks('html')
    .map((block) => adapter.getBlockField('html', block.id, 'STYLE') ?? '')
    .map(parseStylePosition)
    .filter((pos): pos is { left: number; top: number } => Boolean(pos));

  let left = Math.max(0, Math.round(base.left));
  let top = Math.max(0, Math.round(base.top));
  for (let i = 0; i < 40; i += 1) {
    const occupied = existing.some((pos) => Math.abs(pos.left - left) < 28 && Math.abs(pos.top - top) < 28);
    if (!occupied) return { left, top };
    left += 28;
    top += 28;
  }
  return { left, top };
}

function defaultWidgetPosition(count: number): { left: number; top: number } {
  // Keep creation deterministic in sheet coordinates.  Measuring the visible
  // editor viewport here made the first widget appear near the screen center
  // (often around x=350) and forced a layout read on every add/drop.
  // The sheet canvas is 850px by default, so start inside its upper-left safe
  // area and use a small grid offset to avoid overlap between new widgets.
  const index = Math.max(0, count);
  return {
    left: 24 + (index % 8) * 28,
    top: 24 + Math.floor(index / 8) * 28,
  };
}

function parseStylePosition(style: string): { left: number; top: number } | null {
  const left = parseCssPx(style, 'left');
  const top = parseCssPx(style, 'top');
  if (left == null || top == null) return null;
  return { left, top };
}

function parseCssPx(style: string, prop: 'left' | 'top'): number | null {
  const re = new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*(-?\\d+(?:\\.\\d+)?)px\\s*(?:;|$)`, 'i');
  const match = style.match(re);
  if (!match) return null;
  const n = Number.parseFloat(match[1]);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : null;
}

function removeCssDeclarations(style: string, props: string[]): string {
  const remove = new Set(props.map((prop) => prop.toLowerCase()));
  const map = new Map<string, string>();
  for (const chunk of style.split(';')) {
    const idx = chunk.indexOf(':');
    if (idx <= 0) continue;
    const key = chunk.slice(0, idx).trim().toLowerCase();
    const value = chunk.slice(idx + 1).trim();
    if (key && value && !remove.has(key)) map.set(key, value);
  }
  return Array.from(map.entries())
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ');
}

function hasPositionDeclaration(style: string): boolean {
  return /(?:^|;)\s*position\s*:/i.test(style);
}
