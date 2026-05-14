import * as Blockly from 'blockly';

/**
 * 다크 모드 + 한글 친화 Blockly theme.
 *
 * 핵심 목표 (06_plan §D):
 *   - toolbox 카테고리 텍스트가 어두운 배경에서 또렷이 보일 것
 *   - workspace 배경이 globals.css 의 --workspace-bg 와 match
 *   - Scratch 식 둥글둥글 zelos shape + 진한 채도 색 유지
 */
export function buildEditorTheme(): Blockly.Theme {
  return Blockly.Theme.defineTheme('roll20-editor-dark', {
    name: 'roll20-editor-dark',
    base: Blockly.Themes.Classic,
    componentStyles: {
      workspaceBackgroundColour: '#1a1c20',
      toolboxBackgroundColour: '#1c1f25',
      toolboxForegroundColour: '#e9ecef',
      flyoutBackgroundColour: '#1c1f25',
      flyoutForegroundColour: '#e9ecef',
      flyoutOpacity: 0.98,
      scrollbarColour: '#3a3f4a',
      scrollbarOpacity: 0.7,
      insertionMarkerColour: '#f59e0b',
      insertionMarkerOpacity: 0.4,
      markerColour: '#f59e0b',
      cursorColour: '#f59e0b',
      selectedGlowColour: '#f59e0b',
      selectedGlowOpacity: 0.6,
      replacementGlowColour: '#f59e0b',
    },
    fontStyle: {
      family: 'var(--font-noto-sans-kr), var(--font-inter), sans-serif',
      weight: '500',
      size: 13,
    },
  });
}
