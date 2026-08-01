/**
 * WYSIWYG 위젯 — 메타데이터 + 카테고리 (spec 17 §5).
 */
import type { WidgetType } from '@/lib/stores/workspaceStore';

export type WidgetCategory =
  | 'basic'
  | 'input'
  | 'display'
  | 'dice'
  | 'container'
  | 'rolltemplate';

export interface WidgetCategoryMeta {
  id: WidgetCategory;
  label: string;
  order: number;
}

export const CATEGORIES: WidgetCategoryMeta[] = [
  { id: 'basic', label: '기본', order: 0 },
  { id: 'input', label: '입력', order: 1 },
  { id: 'display', label: '표시', order: 2 },
  { id: 'dice', label: '굴림', order: 3 },
  { id: 'container', label: '컨테이너', order: 4 },
  { id: 'rolltemplate', label: '주사위 결과 카드', order: 5 },
];

export interface WidgetDef {
  type: WidgetType;
  label: string;
  category: WidgetCategory;
  /** 어느 캔버스에서 사용 가능한가. */
  targets: ('sheet' | 'rolltemplate')[];
  /** 위젯 카드 가로 px (gallery 용). */
  cardWidth: number;
  /** 위젯 카드 세로 px (gallery 용). */
  cardHeight: number;
}
