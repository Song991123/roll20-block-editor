/**
 * Roll20 Block Editor — 9 카테고리 메타데이터.
 *
 * 진실 기준: docs/audit/04_block_taxonomy_v2.md §3
 *
 * Scratch hue 매핑 (Blockly 의 색상은 hue degree 0-360, saturation/value 는 theme 에서):
 *   - 논리(Logic):           210 (cool blue)        - 06_plan §C 지시
 *   - 수학(Math):             230 (purple-blue)     - 06_plan §C 지시
 *   - 텍스트(Text):           160 (teal)            - 06_plan §C 지시
 *   - 변수(Variables):        330 (red-pink)        - 06_plan §C 지시
 *   - 컨테이너(Container):    320 (magenta/pink)
 *   - 입력(Input):            175 (cyan-teal)
 *   - 표시(Display):           45 (amber/gold)
 *   - 주사위(Dice):             0 (red)
 *   - 식(Expression):          85 (lime/green)
 *   - 시트워커(SheetWorker):  280 (purple)
 *   - 번역(i18n):             190 (cyan)
 *   - CSS:                    340 (pink)
 */

export type CategoryId =
  | 'logic'
  | 'math'
  | 'text'
  | 'variables'
  | 'container'
  | 'input'
  | 'display'
  | 'dice'
  | 'expression'
  | 'sheetworker'
  | 'i18n'
  | 'css';

export interface CategoryMeta {
  id: CategoryId;
  label: string;
  hue: number;
  /** preview swatch — globals.css 의 --hue-* var 와 매치 */
  swatch: string;
}

export const CATEGORIES: Record<CategoryId, CategoryMeta> = {
  logic: { id: 'logic', label: '논리', hue: 210, swatch: 'var(--hue-logic)' },
  math: { id: 'math', label: '수학', hue: 230, swatch: 'var(--hue-math)' },
  text: { id: 'text', label: '텍스트', hue: 160, swatch: 'var(--hue-text)' },
  variables: { id: 'variables', label: '변수', hue: 330, swatch: 'var(--hue-variables)' },
  container: { id: 'container', label: '컨테이너', hue: 320, swatch: 'var(--hue-container)' },
  input: { id: 'input', label: '입력', hue: 175, swatch: 'var(--hue-input)' },
  display: { id: 'display', label: '표시', hue: 45, swatch: 'var(--hue-display)' },
  dice: { id: 'dice', label: '주사위', hue: 0, swatch: 'var(--hue-dice)' },
  expression: { id: 'expression', label: '식', hue: 85, swatch: 'var(--hue-expression)' },
  sheetworker: { id: 'sheetworker', label: '시트워커', hue: 280, swatch: 'var(--hue-sheetworker)' },
  i18n: { id: 'i18n', label: '번역', hue: 190, swatch: 'var(--hue-i18n)' },
  css: { id: 'css', label: 'CSS', hue: 340, swatch: 'var(--hue-css)' },
};

export const CATEGORY_ORDER: CategoryId[] = [
  'logic',
  'math',
  'text',
  'variables',
  'container',
  'input',
  'display',
  'dice',
  'expression',
  'sheetworker',
  'i18n',
  'css',
];
