/**
 * Block primitives — TS 타입 + 카테고리 메타.
 *
 * Anchor:
 *   - docs/spec/02_functional_spec.md §3 (130 블록 카탈로그)
 *   - docs/spec/09_design_system.md §1.1 (9 카테고리 hue)
 *   - docs/spec/16_redesign_decision_log.md §9
 *
 * 단일 시스템 specific 토큰 0. 9 카테고리 일반.
 */

/** 6 Scratch shape (blocklytaxonomy §3.2). */
export type BlockShape =
  | 'hat'        // sheet worker on_change 진입점
  | 'stack'      // 일반 명령
  | 'c'          // 1 statement slot wrapper
  | 'e'          // if-else (2 statement slot)
  | 'cap'        // 종결
  | 'reporter'   // 둥근, 값 반환
  | 'boolean';   // 육각, true/false 반환

/** 9 카테고리. spec §3.1 (3.5 toolbox 순서). */
export type BlockCategory =
  | 'container'
  | 'input'
  | 'display'
  | 'dice'
  | 'expression'
  | 'sheet_worker'
  | 'i18n'
  | 'css'
  | 'advanced';

/** Typed slot kind — 잘못된 결합 차단 (§3.3). */
export type BlockSlotKind =
  | 'statement'
  | 'value-number'
  | 'value-string'
  | 'value-boolean'
  | 'value-color'
  | 'value-any'
  | 'dropdown'
  | 'field-text'
  | 'field-number';

/** 카테고리 메타 (UI 표시용). */
export interface CategoryMeta {
  id: BlockCategory;
  /** UI 표시 라벨 (한국어). */
  label: string;
  /** Blockly hue 값 (Scratch 매핑). */
  hue: number;
  /** UI 칩 색 — globals.css 의 --cat-* var */
  swatchVar: string;
  /** default 펼침 여부 (5 default + 4 고급 토글). */
  defaultExpanded: boolean;
  /** 고급 카테고리 여부 — 설정 토글에 영향. */
  advanced: boolean;
  /** spec §3.5 의 toolbox 정렬 순서 (1~9). */
  order: number;
  /** 짧은 한국어 설명. */
  description: string;
}

/** 9 카테고리 정의 — spec §3.5 의 순서 + §1.1 hue 매핑. */
export const CATEGORIES: Record<BlockCategory, CategoryMeta> = {
  container: {
    id: 'container',
    label: '컨테이너',
    hue: 180,
    swatchVar: 'var(--cat-container)',
    defaultExpanded: true,
    advanced: false,
    order: 1,
    description: '시트 뼈대 — 박스 / 표 / 섹션',
  },
  input: {
    id: 'input',
    label: '입력',
    hue: 230,
    swatchVar: 'var(--cat-input)',
    defaultExpanded: true,
    advanced: false,
    order: 2,
    description: '값을 받는 필드 — 텍스트 / 숫자 / 체크박스',
  },
  display: {
    id: 'display',
    label: '표시',
    hue: 290,
    swatchVar: 'var(--cat-display)',
    defaultExpanded: true,
    advanced: false,
    order: 3,
    description: '라벨 / 이미지 / 헤더',
  },
  dice: {
    id: 'dice',
    label: '굴림',
    hue: 40,
    swatchVar: 'var(--cat-dice)',
    defaultExpanded: true,
    advanced: false,
    order: 4,
    description: '주사위 굴리기 + rolltemplate',
  },
  i18n: {
    id: 'i18n',
    label: '번역',
    hue: 330,
    swatchVar: 'var(--cat-i18n)',
    defaultExpanded: true,
    advanced: false,
    order: 5,
    description: '다국어 키 / placeholder / aria-label',
  },
  expression: {
    id: 'expression',
    label: '표현식',
    hue: 200,
    swatchVar: 'var(--cat-expression)',
    defaultExpanded: false,
    advanced: true,
    order: 6,
    description: '계산식 / 조건 / 동적 값',
  },
  sheet_worker: {
    id: 'sheet_worker',
    label: '시트 자동화',
    hue: 0,
    swatchVar: 'var(--cat-sheetworker)',
    defaultExpanded: false,
    advanced: true,
    order: 7,
    description: '자동 합계 / 이벤트 / sheet worker',
  },
  css: {
    id: 'css',
    label: '디자인',
    hue: 120,
    swatchVar: 'var(--cat-css)',
    defaultExpanded: false,
    advanced: true,
    order: 8,
    description: 'CSS 스타일 / 색 / 폰트',
  },
  advanced: {
    id: 'advanced',
    label: '고급',
    hue: 270,
    swatchVar: 'var(--cat-advanced)',
    defaultExpanded: false,
    advanced: true,
    order: 9,
    description: 'raw markup / composite / imgur',
  },
};

/** 카테고리 표시 순서 (spec §3.5). */
export const CATEGORY_ORDER: BlockCategory[] = (
  Object.values(CATEGORIES) as CategoryMeta[]
)
  .sort((a, b) => a.order - b.order)
  .map((c) => c.id);

/** Inspector 폼 필드 schema (D54). */
export interface InspectorField {
  name: string;
  label: string;
  kind: 'text' | 'number' | 'select' | 'boolean' | 'color' | 'block-ref' | 'textarea';
  /** select 일 때 옵션. */
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  defaultValue?: unknown;
  description?: string;
}

/** Block 정의. */
export interface BlockDef {
  type: string;
  shape: BlockShape;
  category: BlockCategory;
  label: string;
  tooltip: string;
  /** Blockly Block init 함수. */
  init?: (block: unknown) => void;
  /** generator: 블록 → emit 문자열 (또는 [code, order]). */
  generator?: (block: unknown, ctx: GeneratorContext) => string | [string, number];
  /** Inspector 자동 폼 schema (D54). */
  inspectorSchema?: InspectorField[];
  /** 고급 토글 안에 보임? */
  advanced?: boolean;
  /** 직접 편집 sync 용. */
  domAnchor?: 'self' | 'parent' | 'none';
}

export interface GeneratorContext {
  valueToCode(block: unknown, name: string, order: number): string;
  statementToCode(block: unknown, name: string): string;
  indent(code: string, level?: number): string;
  warn(blockId: string, code: string, message: string, severity: 'error' | 'warning' | 'info'): void;
}

/** generator order — Blockly 표준 (precedence). */
export const ORDER = {
  ATOMIC: 0,
  UNARY: 4,
  MULTIPLICATION: 5,
  ADDITION: 6,
  RELATIONAL: 9,
  LOGICAL_AND: 13,
  LOGICAL_OR: 14,
  NONE: 99,
} as const;
