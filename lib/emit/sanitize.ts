/**
 * Roll20 구버전 sandbox 호환 모드 — CSS 자동 무해화.
 *
 * Anchor:
 *   - docs/spec/19_sanitize_and_default_view.md §1
 *   - docs/spec/12_roll20_output_spec.md §2 (emit contract)
 *
 * 입력 CSS 텍스트 → 변환된 CSS + warning 목록.
 *
 * 본 모듈은 순수 함수 (no DOM, no fs). 단순 정규식 + 상태 머신 기반 — fastpath.
 *
 * 시스템 specific 토큰 0. 영시영 / 1부 / 2부 / 펄프 등 식별자 hardcoding 없음.
 */

export type SanitizeWarningCode =
  | 'transform-complex'
  | 'transform-converted'
  | 'animation-stripped'
  | 'keyframes-stripped'
  | 'var-unresolved'
  | 'var-inlined'
  | 'position-fixed'
  | 'position-sticky'
  | 'var-decl-stripped';

export interface SanitizeWarning {
  code: SanitizeWarningCode;
  message: string;
  /** 원본 CSS 안 0-based 줄 번호 (가능하면). */
  line?: number;
  /** 잘린 / 변환된 원본 텍스트. */
  source?: string;
}

export interface SanitizeResult {
  sanitized: string;
  warnings: SanitizeWarning[];
}

/**
 * 메인 entry — 입력 CSS 를 sandbox 호환 모드로 변환.
 *
 * 변환 순서:
 *   1) `@keyframes` at-rule 전체 제거.
 *   2) `var()` mapping 수집 (`:root` 우선) + inline 치환.
 *   3) 줄 단위 declaration 변환:
 *        - `transform: scale(N)` → `zoom: N` (단순 case 만).
 *        - `transform: <기타>` → 제거 + warning.
 *        - `animation*` → 제거 + warning.
 *        - `position: fixed` → `position: absolute` + warning.
 *        - `position: sticky` → `position: relative` + warning.
 *        - `--x: ...` 선언 제거 (이미 2단계서 치환됨) + warning.
 *
 * 비변환 항목 (측정 불가 — 그대로 둠):
 *   `vh/vw/vmin/vmax`, `:has`, container query, `aspect-ratio`, `gap`.
 */
export function sanitizeForRoll20Legacy(css: string): SanitizeResult {
  const warnings: SanitizeWarning[] = [];

  // ---------- step 1: @keyframes 제거 ----------
  const afterKeyframes = stripKeyframes(css, warnings);

  // ---------- step 2: var() 치환 ----------
  const varMap = collectVarDecls(afterKeyframes);
  const afterVars = replaceVarUsages(afterKeyframes, varMap, warnings);

  // ---------- step 3: 줄 단위 declaration 변환 ----------
  const transformed = transformDeclarations(afterVars, warnings);

  return { sanitized: transformed, warnings };
}

// ============================================================================
// step 1: @keyframes at-rule 제거
// ============================================================================

function stripKeyframes(css: string, warnings: SanitizeWarning[]): string {
  // `@keyframes name { ... }` / `@-webkit-keyframes ... { ... }` 통째 제거.
  // 중첩 brace 처리 — 단순 depth 카운터.
  let out = '';
  let i = 0;
  const n = css.length;
  while (i < n) {
    // case-insensitive @keyframes / @-webkit-keyframes 시작 매칭.
    const slice = css.slice(i);
    const kw = matchKeyframesStart(slice);
    if (kw) {
      // body 의 `{` 찾기.
      const braceStart = css.indexOf('{', i + kw.length);
      if (braceStart < 0) {
        // malformed — 그대로 옮김.
        out += css.slice(i);
        break;
      }
      // depth 매칭으로 `}` 찾기.
      let depth = 1;
      let j = braceStart + 1;
      while (j < n && depth > 0) {
        const c = css[j];
        if (c === '{') depth += 1;
        else if (c === '}') depth -= 1;
        j += 1;
      }
      const ruleEnd = depth === 0 ? j : n;
      const original = css.slice(i, ruleEnd);
      warnings.push({
        code: 'keyframes-stripped',
        message: `@keyframes at-rule 가 sandbox 차단으로 제거됨.`,
        line: lineOf(css, i),
        source: shorten(original),
      });
      // 빈 줄 보존 (gap 생기지 않도록 newline 1 개 정도).
      i = ruleEnd;
      // 연속 공백 정리 — 줄 끝 newline 만 보존.
      if (css[i] === '\n') i += 1;
    } else {
      out += css[i];
      i += 1;
    }
  }
  return out;
}

function matchKeyframesStart(s: string): string | null {
  // `@keyframes` 또는 vendor prefix 변종.
  // 정규식 보다 직접 매칭이 빠름.
  const candidates = [
    '@keyframes',
    '@-webkit-keyframes',
    '@-moz-keyframes',
    '@-o-keyframes',
    '@-ms-keyframes',
  ];
  const lower = s.toLowerCase();
  for (const c of candidates) {
    if (lower.startsWith(c)) {
      // 다음 글자가 공백 또는 식별자 시작이어야 함.
      const next = lower[c.length];
      if (!next || /\s|[a-zA-Z0-9_\-]/.test(next)) return c;
    }
  }
  return null;
}

// ============================================================================
// step 2: var() inline 치환
// ============================================================================

function collectVarDecls(css: string): Map<string, string> {
  const map = new Map<string, string>();
  // `--name: value;` 매칭. value 는 `;` 또는 `}` 또는 EOL 까지.
  const re = /(--[A-Za-z_][\w-]*)\s*:\s*([^;}]+?)\s*(?=[;}]|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) {
    const name = m[1];
    const value = m[2].trim();
    // 가장 마지막 선언이 이김 — Map.set 자체 동작. :root 우선 처리 안 함 (단순).
    map.set(name, value);
  }
  return map;
}

function replaceVarUsages(
  css: string,
  map: Map<string, string>,
  warnings: SanitizeWarning[],
): string {
  // `var(--x)` 또는 `var(--x, fallback)` 매칭. 중첩 var 도 단순 1-pass 처리.
  // 보수적으로 5 회 까지 반복 — 중첩 한도.
  let cur = css;
  for (let pass = 0; pass < 5; pass++) {
    let changed = false;
    cur = cur.replace(/var\(\s*(--[A-Za-z_][\w-]*)\s*(?:,\s*([^()]*?)\s*)?\)/g, (full, name, fb) => {
      const v = map.get(name);
      if (v !== undefined) {
        // 자기 자신 재귀 방지 — 치환값이 또 var(--name) 이면 풀지 않음.
        if (v.includes(`var(${name})`)) {
          warnings.push({
            code: 'var-unresolved',
            message: `${name} 변수 정의가 자기 자신을 참조 — strip.`,
            source: full,
          });
          return fb ?? 'initial';
        }
        warnings.push({
          code: 'var-inlined',
          message: `${name} → "${shorten(v)}" 치환됨.`,
          source: full,
        });
        changed = true;
        return v;
      }
      if (fb !== undefined && fb !== '') {
        warnings.push({
          code: 'var-inlined',
          message: `${name} 정의 못 찾음 — fallback "${shorten(fb)}" 사용.`,
          source: full,
        });
        changed = true;
        return fb;
      }
      warnings.push({
        code: 'var-unresolved',
        message: `${name} 정의 못 찾음 + fallback 없음 — strip.`,
        source: full,
      });
      changed = true;
      return 'initial';
    });
    if (!changed) break;
  }
  return cur;
}

// ============================================================================
// step 3: declaration 단위 변환
// ============================================================================

function transformDeclarations(css: string, warnings: SanitizeWarning[]): string {
  // 줄 단위 분해 후 각 줄에서 declaration 변환.
  // 안전을 위해 selector / body 구별 안 함 — declaration pattern (`prop : value`) 만 매칭.
  const lines = css.split('\n');
  const out: string[] = [];
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    // 여러 declaration 이 한 줄에 박힌 경우 처리 — `;` 로 split.
    // 단 selector 줄 (예: `.foo, .bar {`) 은 영향 X — `:` 가 selector 안에 있어도 declaration 매칭은 prop:value pattern.
    out.push(transformLine(line, li, warnings));
  }
  return out.join('\n');
}

function transformLine(line: string, lineIdx: number, warnings: SanitizeWarning[]): string {
  // 빠른 검사 — 변환 후보 키워드 없으면 원본 그대로.
  const lower = line.toLowerCase();
  if (
    !lower.includes('transform') &&
    !lower.includes('animation') &&
    !lower.includes('position') &&
    !lower.includes('--')
  ) {
    return line;
  }

  // declaration 별로 처리. 줄 안의 segment 를 `;` 로 split — 단 마지막 `;` 없는 경우도 포함.
  // `{` `}` 는 그대로 두고 그 안만 처리.
  // 보수적 접근: 줄 안에서 prop:value 패턴 정규식 치환.

  let result = line;

  // 1) transform 변환.
  result = result.replace(
    /(^|[\s;{])(transform)\s*:\s*([^;}]+?)(\s*(?:;|}|$))/gi,
    (_full, pre, _prop, value, post) => {
      const v = String(value).trim();
      // scale(N) 단일 case → zoom.
      const scaleM = v.match(/^scale\(\s*([\d.]+)\s*\)$/i);
      if (scaleM) {
        const num = scaleM[1];
        warnings.push({
          code: 'transform-converted',
          message: `transform: scale(${num}) → zoom: ${num}`,
          line: lineIdx,
          source: v,
        });
        return `${pre}zoom: ${num}${post}`;
      }
      // 그 외 transform → 제거 + warning.
      warnings.push({
        code: 'transform-complex',
        message: `transform: ${v} 변환 불가 — 제거됨.`,
        line: lineIdx,
        source: v,
      });
      // declaration 통째 제거. post 의 ; 도 함께 — 단 `}` 는 보존.
      const postClean = post.includes('}') ? post : '';
      return `${pre}${postClean}`;
    },
  );

  // 2) animation 변환.
  result = result.replace(
    /(^|[\s;{])(animation(?:-[a-z-]+)?)\s*:\s*([^;}]+?)(\s*(?:;|}|$))/gi,
    (_full, pre, prop, value, post) => {
      warnings.push({
        code: 'animation-stripped',
        message: `${prop}: ${String(value).trim()} 제거됨 (sandbox 차단).`,
        line: lineIdx,
        source: String(value).trim(),
      });
      const postClean = post.includes('}') ? post : '';
      return `${pre}${postClean}`;
    },
  );

  // 3) position 변환.
  result = result.replace(
    /(^|[\s;{])(position)\s*:\s*(fixed|sticky)(\s*(?:;|}|$))/gi,
    (_full, pre, prop, value, post) => {
      const v = String(value).toLowerCase();
      const replacement = v === 'fixed' ? 'absolute' : 'relative';
      warnings.push({
        code: v === 'fixed' ? 'position-fixed' : 'position-sticky',
        message: `position: ${v} → ${replacement}`,
        line: lineIdx,
        source: `position: ${v}`,
      });
      return `${pre}${prop}: ${replacement}${post}`;
    },
  );

  // 4) `--x: value;` 선언 제거 (이미 2단계서 치환됨).
  result = result.replace(
    /(^|[\s;{])(--[A-Za-z_][\w-]*)\s*:\s*([^;}]+?)(\s*(?:;|}|$))/g,
    (_full, pre, name, value, post) => {
      warnings.push({
        code: 'var-decl-stripped',
        message: `${name}: ${String(value).trim()} 선언 제거됨 (이미 인라인 치환됨).`,
        line: lineIdx,
        source: `${name}: ${String(value).trim()}`,
      });
      const postClean = post.includes('}') ? post : '';
      return `${pre}${postClean}`;
    },
  );

  return result;
}

// ============================================================================
// helpers
// ============================================================================

function lineOf(text: string, index: number): number {
  let line = 0;
  for (let i = 0; i < index && i < text.length; i++) {
    if (text[i] === '\n') line += 1;
  }
  return line;
}

function shorten(s: string, max = 80): string {
  const trimmed = s.replace(/\s+/g, ' ').trim();
  return trimmed.length > max ? trimmed.slice(0, max - 1) + '…' : trimmed;
}
