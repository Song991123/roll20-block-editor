/**
 * Import 공통 타입.
 *
 * Anchor:
 *   - docs/spec/02_functional_spec.md §3 (블록 카탈로그)
 *   - docs/spec/12_roll20_output_spec.md §2/§3 (HTML/CSS emit contract)
 *
 * importSheet 의 출력 형태 — 3 워크스페이스의 Blockly XML 문자열 + coverage stats.
 *
 * 단일 시스템 specific 토큰 0. 어떤 Roll20 시트도 입력 가능해야 함.
 */

/** Import 한 결과 — 3 워크스페이스의 XML + 진단. */
export interface ImportResult {
  /** HTML 워크스페이스 XML. */
  html: string;
  /** CSS 워크스페이스 XML. */
  css: string;
  /** i18n 워크스페이스 XML. */
  i18n: string;
  /** 매칭 / fallback / 누락 등 진단 메시지. */
  warnings: ImportWarning[];
  /** 통계. */
  stats: ImportStats;
}

export interface ImportWarning {
  severity: 'info' | 'warning' | 'error';
  /** 짧은 코드 — UI grouping 용. */
  code: string;
  /** 사람 친화 메시지. */
  message: string;
  /** 어떤 워크스페이스에 영향. */
  workspace: 'html' | 'css' | 'i18n' | null;
  /** 원본 토큰 (디버깅용 — 영시영 specific markup 그대로 박힐 수 있으므로 local-only 분석에만 사용). */
  hint?: string;
}

export interface ImportStats {
  /** HTML 워크스페이스: 매칭된 블록 / 전체 요소. */
  htmlMatched: number;
  htmlTotal: number;
  htmlRawFallback: number;
  /** CSS 워크스페이스: 매칭된 규칙 / 전체 규칙. */
  cssMatched: number;
  cssTotal: number;
  cssRawFallback: number;
  /** i18n 워크스페이스: 추출된 key/value 페어 수. */
  i18nKeys: number;
  /** 종합 coverage % (HTML 기준). */
  coverage: number;
  /**
   * 보안상 제거된 인라인 이벤트 핸들러 (onclick / onload / ...) 의 총 개수.
   * UI 가 0 보다 크면 사용자에게 명시적 경고를 표시 (silent drop 방지).
   */
  sanitizeDropped: number;
  /**
   * Sheet worker `<script type="text/worker">` body 의 inner-block 분해 통계
   * (Stage worker-1). htmlMatched / htmlTotal 은 element-level 그대로.
   */
  scriptBlocksMatched: number;
  scriptStatementsRaw: number;
  /** Composite packing diagnostics. Structural counts only; no source text. */
  compositeAtomicTotal?: number;
  compositeAfterPackTotal?: number;
  compositeCollapsed?: number;
  compositePackedByType?: Record<string, number>;
  wideRowBundles?: number;
  wideRowCollapsed?: number;
}

export interface ImportHtmlOptions {
  /**
   * Experimental speed path for very large sheets: repeated wide `<tr>`
   * structures may be represented as raw row bundles. This preserves rendered
   * HTML but limits direct block editing inside the bundled row.
   */
  compactWideRows?: boolean;
}

export interface ImportInput {
  html?: string;
  css?: string;
  /**
   * Roll20 표준 translation.json 또는 `key=value` 줄 형식.
   * JSON / flat key=value / 자동 감지.
   */
  i18n?: string;
}
