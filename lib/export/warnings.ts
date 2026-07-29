/**
 * Export warning 검사 — emit 결과 (html / css / translation) 텍스트를 정밀 스캔해
 * Roll20 Custom Sheet Sandbox 업로드 시 거부되거나 보안 문제를 일으킬 만한 패턴을
 * 검출. ERROR severity 1건이라도 있으면 다운로드 차단 (D18 ①).
 *
 * Anchor:
 *   - docs/spec/16_redesign_decision_log.md D18 ① (ERROR 급 차단 정책)
 *   - docs/spec/12_roll20_output_spec.md §6 (보안 제약: iframe / 외부 fetch / eval 금지)
 *
 * 시스템 specific 토큰 0. 시스템 이름 / 스킬 / 룰 분기 일체 없음.
 */

import type { EmitWarning } from '@/lib/stores/workspaceStore';
import type { EmitOutput } from './types';
import { parseTranslationMap } from './payload';

/** export.* prefix — emit.ts 의 warning code 와 충돌 방지. */
const PREFIX = 'export.';

const CODE = {
  IFRAME: `${PREFIX}html.iframe`,
  EXTERNAL_FETCH: `${PREFIX}script.external_fetch`,
  EVAL_USAGE: `${PREFIX}script.eval`,
  ON_ATTR: `${PREFIX}html.inline_handler`,
  REMOTE_IMG: `${PREFIX}html.remote_image`,
  IMPORT_RULE: `${PREFIX}css.import`,
  LARGE_TEMPLATE: `${PREFIX}html.large_rolltemplate`,
  EMPTY_TRANSLATION: `${PREFIX}i18n.empty`,
  TRANSLATION_PARSE: `${PREFIX}i18n.parse`,
  EMPTY_HTML: `${PREFIX}html.empty`,
  CIRCULAR_WORKER: `${PREFIX}script.circular`,
} as const;

const LARGE_TEMPLATE_BYTES = 16 * 1024; // 16 KiB

/**
 * emit 결과 4 텍스트를 받아 ERROR / WARN / INFO 리스트를 반환.
 * 호출자는 이 리스트를 기존 emit warning 리스트 뒤에 이어 붙임.
 */
export function analyzeEmit(out: EmitOutput): EmitWarning[] {
  const found: EmitWarning[] = [];

  // ── ERROR: <iframe> ──────────────────────────────────────────────────────
  if (/<iframe[\s>]/i.test(out.html)) {
    found.push({
      severity: 'error',
      code: CODE.IFRAME,
      message:
        'HTML 안에 <iframe> 태그가 발견되었습니다. Roll20 시트 샌드박스는 iframe 을 허용하지 않으며 업로드 시 거부됩니다. iframe 블록을 제거한 뒤 다시 시도하세요.',
      blockId: null,
    });
  }

  // ── ERROR: 외부 fetch / XHR (sheet worker / 인라인 스크립트) ──────────────
  const fetchPattern =
    /\b(?:fetch|XMLHttpRequest|navigator\.sendBeacon|WebSocket|EventSource)\s*\(/;
  if (fetchPattern.test(out.html) || fetchPattern.test(out.translation)) {
    found.push({
      severity: 'error',
      code: CODE.EXTERNAL_FETCH,
      message:
        '시트 워커 또는 인라인 스크립트에서 외부 네트워크 호출 (fetch / XHR / WebSocket) 이 감지되었습니다. Roll20 시트는 외부 통신이 금지되어 있어 업로드 시 거부됩니다.',
      blockId: null,
    });
  }

  // ── ERROR: eval / Function 동적 코드 실행 ────────────────────────────────
  if (/\b(?:eval|Function)\s*\(/.test(out.html)) {
    found.push({
      severity: 'error',
      code: CODE.EVAL_USAGE,
      message:
        '시트 워커 또는 스크립트 영역에서 eval() / new Function() 호출이 감지되었습니다. Roll20 샌드박스는 동적 코드 실행을 차단합니다. 해당 호출을 제거하세요.',
      blockId: null,
    });
  }

  // ── ERROR: on* 인라인 이벤트 핸들러 ─────────────────────────────────────
  if (/\son[a-z]+\s*=\s*["']/i.test(out.html)) {
    found.push({
      severity: 'error',
      code: CODE.ON_ATTR,
      message:
        'HTML 에 onClick / onLoad 같은 인라인 이벤트 핸들러 속성이 있습니다. Roll20 은 인라인 핸들러를 허용하지 않습니다. sheet worker (on(\'change:…\')) 로 옮기세요.',
      blockId: null,
    });
  }

  // ── WARN: 외부 이미지 URL (https://) ────────────────────────────────────
  if (/<img[^>]+src\s*=\s*["']https?:\/\//i.test(out.html)) {
    found.push({
      severity: 'warning',
      code: CODE.REMOTE_IMG,
      message:
        '<img> 태그에 외부 URL 이 사용되었습니다. Roll20 은 일부 외부 호스트를 차단하므로 이미지가 표시되지 않을 수 있습니다. 가능한 한 Roll20 미디어 라이브러리 또는 imgur 직링크를 권장합니다.',
      blockId: null,
    });
  }

  // ── WARN: CSS @import (외부 폰트 / 스타일시트) ──────────────────────────
  if (/@import\s+/i.test(out.css)) {
    found.push({
      severity: 'warning',
      code: CODE.IMPORT_RULE,
      message:
        'CSS 에 @import 규칙이 있습니다. Roll20 은 외부 스타일시트 import 를 일부 제한합니다. 가능하면 직접 스타일을 작성하세요.',
      blockId: null,
    });
  }

  // ── WARN: 큰 rolltemplate body (>16KiB) — 성능 저하 위험 ──────────────
  const rollTemplateBytes = measureRollTemplateBytes(out.html);
  if (rollTemplateBytes > LARGE_TEMPLATE_BYTES) {
    found.push({
      severity: 'warning',
      code: CODE.LARGE_TEMPLATE,
      message: `roll template 본문이 ${(rollTemplateBytes / 1024).toFixed(1)}KiB 로 큽니다 (>16KiB). 채팅 출력이 느려질 수 있으니 템플릿을 분할하거나 불필요한 노드를 줄이세요.`,
      blockId: null,
    });
  }

  // ── WARN: 빈 HTML ───────────────────────────────────────────────────────
  if (out.html.trim().length === 0) {
    found.push({
      severity: 'warning',
      code: CODE.EMPTY_HTML,
      message:
        'HTML 워크스페이스가 비어 있어 빈 시트가 생성됩니다. 최소 1개 블록을 배치한 뒤 다시 다운로드하세요.',
      blockId: null,
    });
  }

  // ── INFO: 번역 JSON 검증 ───────────────────────────────────────────────
  const tr = out.translation.trim();
  if (tr.length === 0 || tr === '{}') {
    found.push({
      severity: 'info',
      code: CODE.EMPTY_TRANSLATION,
      message:
        '번역 (translation.json) 이 비어 있습니다. 한 언어만 지원할 거면 무시해도 됩니다.',
      blockId: null,
    });
  } else {
    if (Object.keys(parseTranslationMap(tr)).length === 0) {
      found.push({
        severity: 'warning',
        code: CODE.TRANSLATION_PARSE,
        message:
          'translation.json 이 Roll20용 평면 문자열 맵이 아닙니다. 다운로드는 가능하지만 Roll20에서 번역이 동작하지 않을 수 있으니 { "키": "문구" } 형식으로 고치세요.',
        blockId: null,
      });
    }
  }

  // ── INFO: sheet worker 의 self-reference (circular dep 휴리스틱) ────────
  if (detectCircularWorker(out.html)) {
    found.push({
      severity: 'warning',
      code: CODE.CIRCULAR_WORKER,
      message:
        'sheet worker 의 trigger attribute 가 자기 자신을 setAttrs 로 다시 쓰는 패턴이 감지되었습니다. 무한 루프가 발생할 수 있으니 가드 조건을 확인하세요.',
      blockId: null,
    });
  }

  return found;
}

/** <rolltemplate>...</rolltemplate> 본문의 누적 바이트 (utf-8). */
function measureRollTemplateBytes(html: string): number {
  const re = /<rolltemplate\b[^>]*>([\s\S]*?)<\/rolltemplate>/gi;
  let total = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    total += new TextEncoder().encode(m[1]).length;
  }
  return total;
}

/**
 * 매우 단순한 휴리스틱:
 *   on('change:foo', () => setAttrs({ foo: ... }))
 * 같은 직접 자기참조를 검출. 정확도 우선이 아니라 false-negative 허용.
 */
function detectCircularWorker(html: string): boolean {
  const re =
    /on\(\s*['"]change:([a-z0-9_]+)['"][\s\S]{0,400}?setAttrs\s*\(\s*\{\s*['"]?\1['"]?\s*:/gi;
  return re.test(html);
}
