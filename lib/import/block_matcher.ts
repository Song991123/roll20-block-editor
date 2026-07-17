/**
 * Block matcher — DomNode → BlockDef 타입 매칭.
 *
 * Anchor:
 *   - docs/spec/02_functional_spec.md §3 (130 블록 카탈로그)
 *   - docs/spec/12_roll20_output_spec.md §2 (HTML emit contract)
 *
 * 입력: dom_walker 의 DomNode (element)
 * 출력: { blockType, fields, children, raw? } — Blockly XML serializer 가 사용.
 *
 * 매칭 안 되면 r20_raw_html escape hatch fallback. fallback 카운트로 coverage 측정.
 *
 * 일반화 원칙: 영시영 / D&D 5e / PbtA 어느 시트도 동일 알고리즘으로 매칭.
 * 한글 라벨 / class name hardcoding 0.
 */

import type { DomNode } from './dom_walker';
import type { CompositePackStats } from './composite_matcher';
import { firstTextContent, allTextContent } from './dom_walker';
import { parseAttrRefToken } from './expression_parser';
import { parseSheetWorkerScript } from './script_parser';

export interface MatchedBlock {
  /** 130 블록 중 하나의 type, 또는 'r20_raw_html' fallback. */
  blockType: string;
  /** 필드값 (NAME / CLASS / TEXT / ...). */
  fields: Record<string, string>;
  /** 자식 statement chain (CONTENT / OPTIONS / etc.). */
  children: Record<string, MatchedBlock[]>;
  /** value input (EXPR / SELECTOR 등). */
  valueInputs?: Record<string, MatchedBlock>;
  /** raw fallback 일 때 — 원본 HTML 보존. */
  raw?: string;
  /** Original sanitized element HTML for optional lossless compaction. */
  sourceRaw?: string;
  /** 디버깅: 매칭에 사용된 token (어떤 hint 가 매칭 결정했는지). */
  hint?: string;
}

export interface MatchContext {
  /** raw fallback 횟수 카운트. */
  rawFallbackCount: number;
  /** 매칭된 element 수. */
  matchedCount: number;
  /** 전체 element 수 (root 제외, raw 포함). */
  totalCount: number;
  /**
   * XSS 방지로 제거된 인라인 이벤트 핸들러 (onclick / onload / onerror 등) 카운트.
   * 0 이 아니면 ImportDialog 에서 사용자에게 경고로 표시 — 더는 silent drop 아님.
   */
  sanitizeDropped: number;
  /**
   * Sheet worker `<script type="text/worker">` body 의 inner statement
   * matching 통계 (Stage worker-1 — script_parser.ts).
   *   - scriptBlocksMatched: sheet_worker 25 카탈로그로 인식된 inner block 수.
   *   - scriptStatementsRaw: 패턴 매칭 실패해서 raw_worker statement fallback 으로 박은 inner statement 수.
   * htmlMatched / htmlTotal 은 element-level 그대로 유지 — 본 카운터는 별도 보고.
  */
  scriptBlocksMatched: number;
  scriptStatementsRaw: number;
  /** Composite packing diagnostics, filled after `matchTree` by import/index. */
  compositePackStats?: CompositePackStats;
  warnings: Array<{ code: string; message: string; hint?: string }>;
}

export function newMatchContext(): MatchContext {
  return {
    rawFallbackCount: 0,
    matchedCount: 0,
    totalCount: 0,
    sanitizeDropped: 0,
    scriptBlocksMatched: 0,
    scriptStatementsRaw: 0,
    warnings: [],
  };
}

// ---------------------------------------------------------------------------
// Public — top-level walk.
// ---------------------------------------------------------------------------

/**
 * root 노드의 자식 element 들을 차례로 매칭. 반환 = top-level chain.
 *
 * 각 element 는:
 *   1) 표준 블록 매칭 (input/container/display/dice/i18n/...) 시도
 *   2) 실패 시 raw_html fallback
 */
export function matchTree(root: DomNode, ctx: MatchContext): MatchedBlock[] {
  const out: MatchedBlock[] = [];
  for (const c of root.children) {
    if (c.type === 'text') {
      const text = meaningfulText(c.text, root.tag);
      if (text !== null) {
        out.push(textNodeBlock(text));
      }
      continue;
    }
    if (c.type !== 'element') continue;
    const m = matchElement(c, ctx);
    if (m) out.push(m);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Element → MatchedBlock.
// ---------------------------------------------------------------------------

export function matchElement(node: DomNode, ctx: MatchContext): MatchedBlock | null {
  if (node.type !== 'element' || !node.tag) return null;
  ctx.totalCount++;

  // XSS 방지 — 인라인 이벤트 핸들러 (onclick / onload / onerror / ...) 는
  // 구조화 매칭에서 dropped, raw_html fallback 에서는 살아남을 수 있음. 양쪽
  // 다 위험. 발견 시 카운트 + 경고 + node.attrs 에서도 제거 (raw 직렬화 안전).
  if (node.attrs) {
    for (const k of Object.keys(node.attrs)) {
      if (/^on[a-z]+$/i.test(k)) {
        ctx.sanitizeDropped += 1;
        ctx.warnings.push({
          code: 'sanitize_dropped',
          message: `<${node.tag}> 의 인라인 이벤트 핸들러 '${k}' 가 제거되었습니다 (XSS 방지).`,
          hint: k,
        });
        delete node.attrs[k];
      }
    }
  }

  const result =
    matchInput(node, ctx) ??
    matchDice(node, ctx) ??
    matchI18n(node, ctx) ??
    matchDisplay(node, ctx) ??
    matchContainer(node, ctx);

  if (result) {
    ctx.matchedCount++;
    return {
      ...result,
      sourceRaw: serializeRawHtml(node),
    };
  }

  // fallback — raw HTML.
  ctx.rawFallbackCount++;
  ctx.warnings.push({
    code: 'raw_fallback',
    message: `<${node.tag}> 패턴이 130 블록에 매칭되지 않음 — raw_html 로 박음`,
    hint: node.tag,
  });
  return {
    blockType: 'r20_raw_html',
    fields: { HTML: serializeRawHtml(node) },
    children: {},
    raw: serializeRawHtml(node),
    hint: `unmatched:${node.tag}`,
  };
}

// ---------------------------------------------------------------------------
// 카테고리별 matcher — 순서가 specificity. input/i18n 같은 sub-classified
// 매칭이 먼저, container 같은 generic 이 뒤에.
// ---------------------------------------------------------------------------

function matchInput(node: DomNode, ctx: MatchContext): MatchedBlock | null {
  const tag = node.tag;
  if (!tag) return null;
  const a = node.attrs ?? {};

  if (tag === 'input') {
    const inputType = (a.type || 'text').toLowerCase();
    const name = stripAttrPrefix(a.name || '');
    const cls = stripSheetPrefix(a.class || '');

    // i18n placeholder — data-i18n-placeholder 있으면 i18n 블록 우선.
    // NAME / CLASS / TYPE 등 input attribute 보존 (Roll20 sheet attr 식별자
    // attr_minionhp / sheet-attr_minionhp 등이 export 시 살아남아야 sandbox
    // 업로드 후 sheet 동작 깨지지 않음). raw 그대로 박음 (prefix 안 깎음) —
    // i18n_button 과 동일 컨벤션.
    if (a['data-i18n-placeholder']) {
      return {
        blockType: 'r20_i18n_placeholder',
        fields: {
          KEY: a['data-i18n-placeholder'],
          // DEFAULT = placeholder 텍스트, VALUE = 실제 value 속성 — 합치면
          // placeholder 가 값으로 오염되거나 (구버전 사고) value 가 소실된다.
          DEFAULT: a.placeholder || '',
          VALUE: a.value || '',
          DISABLED: 'disabled' in a ? 'TRUE' : 'FALSE',
          NAME: a.name || '',
          CLASS: a.class || '',
          TYPE: (a.type || 'text').toLowerCase(),
          ACCEPT: a.accept || '',
          MIN: a.min || '',
          MAX: a.max || '',
          STYLE: a.style || '',
        },
        children: {},
      };
    }

    if (inputType === 'text') {
      return {
        blockType: 'r20_text_input',
        fields: {
          NAME: name, CLASS: cls, DEFAULT: a.value || '',
          PLACEHOLDER: a.placeholder || '',
          I18N: a['data-i18n'] || '',
          DISABLED: 'disabled' in a ? 'TRUE' : 'FALSE',
          STYLE: a.style || '',
        },
        children: {},
      };
    }
    if (inputType === 'number') {
      return {
        blockType: 'r20_number_input',
        fields: {
          NAME: name, CLASS: cls,
          MIN: a.min || '', MAX: a.max || '',
          DEFAULT: a.value || '0',
          PLACEHOLDER: a.placeholder || '',
          DISABLED: 'disabled' in a ? 'TRUE' : 'FALSE',
          STYLE: a.style || '',
        },
        children: {},
      };
    }
    if (inputType === 'checkbox') {
      return {
        blockType: 'r20_checkbox',
        fields: {
          NAME: name, CLASS: cls,
          VALUE: a.value || '',
          CHECKED: 'checked' in a || a.checked != null ? 'TRUE' : 'FALSE',
          STYLE: a.style || '',
        },
        children: {},
      };
    }
    if (inputType === 'radio') {
      return {
        blockType: 'r20_radio',
        fields: {
          NAME: name, VALUE: a.value || '', CLASS: cls,
          LABEL: '',
          STYLE: a.style || '',
        },
        children: {},
      };
    }
    if (inputType === 'hidden') {
      return {
        blockType: 'r20_hidden_input',
        fields: { NAME: name, DEFAULT: a.value || '0', CLASS: cls, STYLE: a.style || '' },
        children: {},
      };
    }
    if (inputType === 'file') {
      return {
        blockType: 'r20_file_input',
        fields: { NAME: name, CLASS: cls, ACCEPT: a.accept || '', STYLE: a.style || '' },
        children: {},
      };
    }
    return null;
  }

  if (tag === 'select') {
    const name = stripAttrPrefix(a.name || '');
    const cls = stripSheetPrefix(a.class || '');
    const options: MatchedBlock[] = [];
    for (const c of node.children) {
      if (c.type === 'element' && c.tag === 'option') {
        const matched = matchOption(c, ctx);
        if (matched) options.push(matched);
      }
    }
    return {
      blockType: 'r20_select',
      fields: { NAME: name, CLASS: cls, STYLE: a.style || '' },
      children: { OPTIONS: options },
    };
  }

  if (tag === 'option') {
    return matchOption(node, ctx);
  }

  if (tag === 'textarea') {
    const name = stripAttrPrefix(a.name || '');
    const cls = stripSheetPrefix(a.class || '');
    const rows = a.rows || '3';
    const text = firstTextContent(node);
    return {
      blockType: 'r20_textarea',
      fields: {
        NAME: name, CLASS: cls, ROWS: rows, DEFAULT: text,
        PLACEHOLDER: a.placeholder || '',
        I18N_PLACEHOLDER: a['data-i18n-placeholder'] || '',
        STYLE: a.style || '',
      },
      children: {},
    };
  }

  return null;
}

function matchOption(node: DomNode, _ctx: MatchContext): MatchedBlock {
  const a = node.attrs ?? {};
  const label = firstTextContent(node);
  if (a['data-i18n']) {
    return {
      blockType: 'r20_i18n_select_option',
      fields: {
        KEY: a['data-i18n'],
        DEFAULT: label,
        VALUE: a.value || '',
        STYLE: a.style || '',
      },
      children: {},
    };
  }
  return {
    blockType: 'r20_select_option',
    fields: { VALUE: a.value || '', LABEL: label, STYLE: a.style || '' },
    children: {},
  };
}

function matchDice(node: DomNode, _ctx: MatchContext): MatchedBlock | null {
  const tag = node.tag;
  if (!tag) return null;
  const a = node.attrs ?? {};

  if (tag === 'button') {
    const btype = (a.type || 'button').toLowerCase();
    const label = firstTextContent(node);
    const rawName = a.name || '';
    const cls = stripSheetPrefix(a.class || '');

    if (btype === 'roll') {
      const name = rawName.startsWith('roll_') ? rawName.slice(5) : rawName;
      const expr = a.value || '';
      // value 가 dice expression 처럼 보이면 roll button — 아니면 chat button.
      // 단순 휴리스틱: value 가 '@{', '/', '!' 시작 또는 'd' 포함이면 roll.
      const looksLikeRoll = /(@\{|\[\[|\b\d*d\d+|\/r|\/roll)/i.test(expr);
      if (!looksLikeRoll && expr) {
        return {
          blockType: 'r20_chat_button',
          fields: { NAME: name, LABEL: label, MESSAGE: expr, CLASS: cls, STYLE: a.style || '' },
          children: {},
        };
      }
      return {
        blockType: 'r20_roll_button',
        fields: { NAME: name, LABEL: label, CLASS: cls, STYLE: a.style || '' },
        children: {},
        // EXPR 은 raw 표현식 — value-input 슬롯에 raw_expression 으로 박음.
        valueInputs: expr ? { EXPR: rawExpression(expr) } : undefined,
      };
    }
    if (btype === 'action') {
      const name = rawName.startsWith('act_') ? rawName.slice(4) : rawName;
      return {
        blockType: 'r20_action_button',
        fields: { NAME: name, LABEL: label, CLASS: cls, STYLE: a.style || '' },
        children: {},
      };
    }
    return null;
  }

  if (tag === 'rolltemplate') {
    const cls = (a.class || '').trim();
    const m = /sheet-rolltemplate-(\S+)/.exec(cls);
    const name = m ? m[1] : 'default';
    const rows: MatchedBlock[] = [];
    for (const c of node.children) {
      if (c.type === 'element') {
        const m2 = matchElement(c, _ctx);
        if (m2) rows.push(m2);
      }
    }
    return {
      blockType: 'r20_rolltemplate_define',
      fields: { NAME: name, STYLE: a.style || '' },
      children: { ROWS: rows },
    };
  }

  return null;
}

function matchI18n(node: DomNode, _ctx: MatchContext): MatchedBlock | null {
  const tag = node.tag;
  if (!tag) return null;
  const a = node.attrs ?? {};

  // data-i18n="KEY" 가 있으면 i18n 우선.
  //
  // TAG 보존 (table 평탄화 fix): r20_i18n_text 가 항상 <span> 으로 emit 되면
  // <td data-i18n="k">label</td> 가 emit 시 <span data-i18n="k">label</span> 로
  // 바뀌어 <tr><span>...</span><td>...</td></tr> 가 invalid HTML 이 되고, 재
  // import 시 브라우저 파서가 span 을 hoist 해 table 구조가 평탄화된다.
  // 해결: 매처가 TAG 필드에 원본 태그를 박고 emit 가 그 태그로 출력. div/label/
  // strong/b/em/small/p 도 동일하게 보존되어 round-trip byte-identical 에 기여.
  if (a['data-i18n'] && ['span','div','label','strong','b','em','small','p','td','th'].includes(tag)) {
    const text = allTextContent(node).trim();
    return {
      blockType: 'r20_i18n_text',
      fields: {
        KEY: a['data-i18n'],
        DEFAULT: text,
        CLASS: stripSheetPrefix(a.class || ''),
        TAG: tag,
        STYLE: a.style || '',
      },
      children: {},
    };
  }
  if (a['data-i18n-html'] && (tag === 'span' || tag === 'div')) {
    const inner = innerHtmlSerialize(node);
    return {
      blockType: 'r20_i18n_html',
      fields: { KEY: a['data-i18n-html'], DEFAULT: inner, STYLE: a.style || '' },
      children: {},
    };
  }
  if (a['data-i18n-title']) {
    return {
      blockType: 'r20_i18n_title',
      fields: {
        KEY: a['data-i18n-title'],
        DEFAULT: a.title || '',
        CLASS: stripSheetPrefix(a.class || ''),
        STYLE: a.style || '',
      },
      children: {},
    };
  }
  if (a['data-i18n-aria-label']) {
    return {
      blockType: 'r20_i18n_aria_label',
      fields: {
        KEY: a['data-i18n-aria-label'],
        DEFAULT: a['aria-label'] || '',
        STYLE: a.style || '',
      },
      children: {},
    };
  }
  if (tag === 'legend' && a['data-i18n']) {
    return {
      blockType: 'r20_i18n_legend',
      fields: { KEY: a['data-i18n'], DEFAULT: firstTextContent(node), STYLE: a.style || '' },
      children: {},
    };
  }
  if (tag === 'button' && a['data-i18n']) {
    const label = firstTextContent(node);
    return {
      blockType: 'r20_i18n_button',
      fields: {
        KEY: a['data-i18n'],
        DEFAULT: label,
        TYPE: (a.type || 'button').toLowerCase(),
        NAME: a.name || '',
        CLASS: stripSheetPrefix(a.class || ''),
        STYLE: a.style || '',
      },
      children: {},
    };
  }
  return null;
}

/**
 * script body 의 모든 비어있지 않은 줄이 공유하는 선행 들여쓰기(스페이스/탭)를
 * 제거한다. HTML emitter 의 pretty-print 가 매 roundtrip 마다 들여쓰기를
 * 누적시키는 것을 canonical 형태로 수렴시키기 위한 정규화.
 */
function dedentCommonIndent(text: string): string {
  if (!text) return text;
  const lines = text.split('\n');
  let common: string | null = null;
  for (const line of lines) {
    if (!line.trim()) continue;
    const indent = (/^[ \t]*/.exec(line) as RegExpExecArray)[0];
    if (common === null) {
      common = indent;
    } else {
      let i = 0;
      while (i < common.length && i < indent.length && common[i] === indent[i]) i += 1;
      common = common.slice(0, i);
    }
    if (!common) return text;
  }
  if (!common) return text;
  const width = common.length;
  // 공백만 있는 줄은 빈 줄로 수렴 — HTML emitter 의 pretty-print 가 비어있지
  // 않은 줄에만 indent 를 더하므로, 공백-전용 줄을 그대로 두면 그 줄만 매
  // roundtrip 마다 indent 가 증식한다 (Les-Oublies L2 FAIL 잔여 원인).
  return lines.map((line) => (line.trim() ? line.slice(width) : '')).join('\n');
}

function matchDisplay(node: DomNode, ctx: MatchContext): MatchedBlock | null {
  const tag = node.tag;
  if (!tag) return null;
  const a = node.attrs ?? {};

  if (tag === 'script') {
    // Stage 22 §1/§2 — script body 가 단일 reporter call (compendium /
    // translation) 이면 카탈로그 reporter 로 매칭.
    //
    // Stage worker-1 (현재): `<script type="text/worker">` body 가 sheet
    // worker 25 패턴 (on/getAttrs/setAttrs/...) 으로 분해되면 r20_raw_worker
    // 안에 분해된 sub-block 들을 CHILDREN 으로 박음. element-level 매칭은
    // 그대로 1 (raw_worker) — htmlMatched / htmlTotal 비율 회귀 0.
    // scriptBlocksMatched / scriptStatementsRaw 가 분해 통계.
    //
    // body 가 단일 reporter 인 경우는 기존 분기 (Stage 22) 가 우선.
    // 주의: allTextContent 는 whitespace 를 collapse 함 (' ' 1 개로 합침).
    // 그러면 `//` line comment 가 의도치 않게 다음 statement 까지 삼킴 →
    // 파서가 인식 못 함. script body 는 raw text 그대로 보존.
    const rawBody = node.children
      .filter((c) => c.type === 'text' && c.text)
      .map((c) => c.text as string)
      .join('');
    // Roundtrip 멱등성 (browser L2 roundtrip, reports/roundtrip-browser/):
    // 1) r20_raw_worker emit 은 `<script ...>\n${JS}\n</script>` 로 wrapper
    //    개행을 추가한다 → import 가 포함시키면 매 라운드 `\n` 1개 증식.
    //    선두 개행 1개 + 말미 개행 1개(+들여쓰기)를 벗긴다.
    // 2) HTML emitter 는 중첩 요소 children 을 pretty-print 로 +indent 한다.
    //    일반 요소 텍스트는 collapse 돼 매번 동일하게 재생성되지만 script
    //    body 는 raw 보존이라 매 라운드 들여쓰기가 누적 증가 → 공통 선행
    //    들여쓰기를 dedent 해 canonical 형태로 저장한다 (JS 의미 동일;
    //    멀티라인 template literal 의 공통 들여쓰기도 함께 줄어드는 trade-off
    //    는 허용).
    const body = dedentCommonIndent(
      rawBody.replace(/^\r?\n/, '').replace(/\r?\n[ \t]*$/, ''),
    );
    const reporter = matchSheetWorkerReporter(body);
    if (reporter) return reporter;

    const scriptType = (a.type || '').toLowerCase();
    if (scriptType === 'text/worker' || scriptType === '') {
      const parsed = parseSheetWorkerScript(body);
      if (parsed.blocks.length > 0 && parsed.stats.matched > 0) {
        ctx.scriptBlocksMatched += parsed.stats.matched;
        ctx.scriptStatementsRaw += parsed.stats.unparsed;
        if (parsed.stats.unparsed > 0) {
          ctx.warnings.push({
            code: 'sheet_worker_partial',
            message: `<script> 본문의 ${parsed.stats.unparsed} 개 statement 가 sheet_worker 카탈로그에 매칭되지 않음 — raw_worker 단편으로 fallback`,
            hint: `matched=${parsed.stats.matched} raw=${parsed.stats.unparsed}`,
          });
        }
        // Keep parsed worker stats for reports, but preserve source as raw JS.
        // Parsed children can mix statement/reporter shapes; auto-inserting
        // them under r20_raw_worker breaks Blockly XML hydration.
        return {
          blockType: 'r20_raw_worker',
          fields: { JS: body },
          children: {},
        };
      }
    }

    return {
      blockType: 'r20_raw_worker',
      fields: { JS: body },
      children: {},
    };
  }
  if (/^h[1-6]$/.test(tag)) {
    return {
      blockType: 'r20_heading',
      fields: {
        LEVEL: tag.slice(1),
        TEXT: allTextContent(node),
        I18N: a['data-i18n'] || '',
        CLASS: stripSheetPrefix(a.class || ''),
        STYLE: a.style || '',
      },
      children: {},
    };
  }
  if (tag === 'hr') {
    return {
      blockType: 'r20_hr',
      fields: { CLASS: stripSheetPrefix(a.class || ''), STYLE: a.style || '' },
      children: {},
    };
  }
  if (tag === 'img') {
    return {
      blockType: 'r20_image',
      fields: {
        SRC: a.src || '',
        ALT: a.alt || '',
        CLASS: stripSheetPrefix(a.class || ''),
        WIDTH: a.width || '',
        HEIGHT: a.height || '',
        STYLE: a.style || '',
      },
      children: {},
    };
  }
  // <i class="sheet-icon sheet-icon-NAME"> → icon block
  if (tag === 'i') {
    const m = /(?:^|\s)sheet-icon-([\w-]+)(?:\s|$)/.exec(a.class || '');
    if (m) {
      return {
        blockType: 'r20_icon',
        fields: { NAME: m[1], CLASS: '', STYLE: a.style || '' },
        children: {},
      };
    }
  }
  // <div class="sheet-spacer sheet-spacer-SIZE"></div>
  if (tag === 'div') {
    const cls = a.class || '';
    const m = /(?:^|\s)sheet-spacer-(small|medium|large)(?:\s|$)/.exec(cls);
    if (m && /sheet-spacer/.test(cls)) {
      return {
        blockType: 'r20_spacer',
        fields: { SIZE: m[1], STYLE: a.style || '' },
        children: {},
      };
    }
  }
  // <span aria-disabled="true">
  if (tag === 'span' && a['aria-disabled'] === 'true') {
    return {
      blockType: 'r20_disabled_text',
      fields: {
        TEXT: allTextContent(node),
        CLASS: stripSheetPrefix(a.class || '').replace(/sheet-disabled-text\s*/, '').trim(),
        STYLE: a.style || '',
      },
      children: {},
    };
  }
  // <b>, <strong> — bold emphasis → r20_inline_bold (시맨틱 보존).
  // hasOnlyTextOrInline 로 <b><i>x</i></b> / <b>mix <i>i</i></b> 같은 nested inline 도 매칭.
  // (1부 RAW 419 <b> 중 109 만 매칭하던 버그 fix — nested 시 텍스트만 보존, 의미 손실 명시.)
  if ((tag === 'b' || tag === 'strong') && hasOnlyTextOrInline(node) && !a['data-i18n']) {
    return {
      blockType: 'r20_inline_bold',
      fields: {
        TEXT: allTextContent(node),
        CLASS: stripSheetPrefix(a.class || ''),
        STYLE: a.style || '',
      },
      children: {},
    };
  }
  // <em>, <i> — italic emphasis → r20_inline_italic.
  // <i> 가 sheet-icon-* 마크업이면 위쪽 icon branch 가 먼저 잡고 여기 안 옴.
  // hasOnlyTextOrInline 로 <em><b>x</b></em> 같은 nested inline 도 매칭.
  if ((tag === 'em' || tag === 'i') && hasOnlyTextOrInline(node) && !a['data-i18n']) {
    return {
      blockType: 'r20_inline_italic',
      fields: {
        TEXT: allTextContent(node),
        CLASS: stripSheetPrefix(a.class || ''),
        STYLE: a.style || '',
      },
      children: {},
    };
  }
  // <small>, <u> — text-only (또는 nested-inline-only) inline emphasis (legacy) → static_text.
  if (['small','u'].includes(tag) && hasOnlyTextOrInline(node) && !a['data-i18n']) {
    return {
      blockType: 'r20_static_text',
      fields: {
        TEXT: allTextContent(node),
        CLASS: (stripSheetPrefix(a.class || '') + ' ' + tag).trim(),
        STYLE: a.style || '',
      },
      children: {},
    };
  }
  // <br> — void linebreak → r20_inline_break.
  if (tag === 'br') {
    return {
      blockType: 'r20_inline_break',
      fields: { STYLE: a.style || '' },
      children: {},
    };
  }
  // <caption> — table caption → r20_table_caption.
  if (tag === 'caption') {
    return {
      blockType: 'r20_table_caption',
      fields: {
        TEXT: allTextContent(node),
        I18N: a['data-i18n'] || '',
        CLASS: stripSheetPrefix(a.class || ''),
        STYLE: a.style || '',
      },
      children: {},
    };
  }
  // 단순 텍스트 <span> — nested inline 허용 (동일 fix).
  if (tag === 'span' && hasOnlyTextOrInline(node)) {
    return {
      blockType: 'r20_static_text',
      fields: {
        TEXT: allTextContent(node),
        CLASS: stripSheetPrefix(a.class || ''),
        STYLE: a.style || '',
      },
      children: {},
    };
  }
  if (tag === 'label' && hasOnlyTextOrInline(node)) {
    return {
      blockType: 'r20_label',
      fields: { TEXT: allTextContent(node), STYLE: a.style || '' },
      children: {},
    };
  }
  return null;
}

function matchContainer(node: DomNode, ctx: MatchContext): MatchedBlock | null {
  const tag = node.tag;
  if (!tag) return null;
  const a = node.attrs ?? {};

  if (tag === 'fieldset') {
    const cls = a.class || '';
    const repeating = /(?:^|\s)repeating_(\S+)/.exec(cls);
    if (repeating) {
      return {
        blockType: 'r20_repeating_section',
        fields: { NAME: repeating[1], STYLE: a.style || '' },
        children: { CONTENT: matchChildren(node, ctx) },
      };
    }
    return {
      blockType: 'r20_fieldset',
      fields: { CLASS: stripSheetPrefix(cls), STYLE: a.style || '' },
      children: { CONTENT: matchChildren(node, ctx) },
    };
  }

  if (tag === 'div') {
    const cls = a.class || '';
    // value switch panel 매칭 (Stage 22 §4) — `sheet-X-switch` wrapper.
    // 내부에 inline `<style>` + radio + panel div 들이 묶여 있을 때 묶음 분해.
    const switchMatch = matchValueSwitchPanel(node, cls, ctx);
    if (switchMatch) {
      // matcher 가 totalCount 카운트는 직접 안 함 — 매칭 자체로 1 으로 침.
      return switchMatch;
    }
    // row / col / colrow / section / toggle / grid 매칭.
    //
    // multi-class fix: <div class="sheet-row sheet-header"> 같이 인식 class 외
    // 추가 토큰이 있으면 r20_row 로 단축하지 않고 r20_div 로 떨어뜨림.
    // r20_row 의 generator 는 `class="sheet-row"` 만 emit → 추가 class 손실.
    // r20_div 의 generator (sheetUserClassAttr) 는 모든 토큰을 보존.
    const tokens = cls.split(/\s+/).filter(Boolean);
    if (/\bsheet-row\b/.test(cls) && tokens.length === 1 && tokens[0] === 'sheet-row') {
      return {
        blockType: 'r20_row',
        fields: { STYLE: a.style || '' },
        children: { CONTENT: matchChildren(node, ctx) },
      };
    }
    if (/\bsheet-col\b/.test(cls) && tokens.length === 1 && tokens[0] === 'sheet-col') {
      return {
        blockType: 'r20_col',
        fields: { STYLE: a.style || '' },
        children: { CONTENT: matchChildren(node, ctx) },
      };
    }
    const colrowN = /\bsheet-colrow-(\d+)\b/.exec(cls);
    if (
      colrowN &&
      tokens.length === 2 &&
      tokens.includes('sheet-colrow') &&
      tokens.includes(`sheet-colrow-${colrowN[1]}`)
    ) {
      return {
        blockType: 'r20_colrow_n',
        fields: { N: colrowN[1], STYLE: a.style || '' },
        children: { CONTENT: matchChildren(node, ctx) },
      };
    }
    // multi-class guard (row/col 과 동일 원칙): 인식 패턴 외 추가 class 토큰이
    // 있으면 r20_div 로 떨어뜨려 모든 토큰을 보존한다. 가드가 없으면
    // `sheet-col small-outline section-oublie` 가 자기 emit 을 재import 할 때
    // section_wrap 으로 흡수돼 col/small-outline 이 소실됐다 (Les-Oublies
    // browser L2 roundtrip FAIL 원인).
    const sectionN = /\bsheet-section-(\S+)/.exec(cls);
    if (
      sectionN &&
      ((tokens.length === 1 && tokens[0] === `sheet-section-${sectionN[1]}`) ||
        (tokens.length === 2 &&
          tokens.includes('sheet-section') &&
          tokens.includes(`sheet-section-${sectionN[1]}`)))
    ) {
      return {
        blockType: 'r20_section_wrap',
        fields: { NAME: sectionN[1], STYLE: a.style || '' },
        children: { CONTENT: matchChildren(node, ctx) },
      };
    }
    const toggleN = /\bsheet-toggle-(\S+)/.exec(cls);
    if (
      toggleN &&
      ((tokens.length === 1 && tokens[0] === `sheet-toggle-${toggleN[1]}`) ||
        (tokens.length === 2 &&
          tokens.includes('sheet-toggle') &&
          tokens.includes(`sheet-toggle-${toggleN[1]}`)))
    ) {
      return {
        blockType: 'r20_toggle_wrap',
        fields: { NAME: toggleN[1], STYLE: a.style || '' },
        children: { CONTENT: matchChildren(node, ctx) },
      };
    }
    if (
      /\bsheet-repeating-row\b/.test(cls) &&
      tokens.length === 1 &&
      tokens[0] === 'sheet-repeating-row'
    ) {
      return {
        blockType: 'r20_repeating_row',
        fields: { STYLE: a.style || '' },
        children: { CONTENT: matchChildren(node, ctx) },
      };
    }
    if (
      /\bsheet-grid\b/.test(cls) &&
      tokens.length === 1 &&
      tokens[0] === 'sheet-grid'
    ) {
      const cols = extractGridCols(a.style || '') || '2';
      return {
        blockType: 'r20_grid',
        fields: { COLS: cols, STYLE: a.style || '' },
        children: { CONTENT: matchChildren(node, ctx) },
      };
    }
    return {
      blockType: 'r20_div',
      fields: { CLASS: stripSheetPrefix(cls), STYLE: a.style || '' },
      children: { CONTENT: matchChildren(node, ctx) },
    };
  }

  if (tag === 'span') {
    return {
      blockType: 'r20_span',
      fields: { CLASS: stripSheetPrefix(a.class || ''), STYLE: a.style || '' },
      children: { CONTENT: matchChildren(node, ctx) },
    };
  }

  if (tag === 'table') {
    return {
      blockType: 'r20_table',
      fields: { CLASS: stripSheetPrefix(a.class || ''), STYLE: a.style || '' },
      children: { CONTENT: matchChildren(node, ctx) },
    };
  }
  if (tag === 'thead' || tag === 'tbody' || tag === 'tr' || tag === 'th' || tag === 'td') {
    return {
      blockType: `r20_${tag}`,
      fields: { CLASS: stripSheetPrefix(a.class || ''), STYLE: a.style || '' },
      children: { CONTENT: matchChildren(node, ctx) },
    };
  }
  if (tag === 'label' && node.children.some((child) => child.type === 'element')) {
    return {
      blockType: 'r20_label_container',
      fields: {
        FOR: a.for || '',
        CLASS: stripSheetPrefix(a.class || ''),
        STYLE: a.style || '',
      },
      children: { CONTENT: matchChildren(node, ctx) },
    };
  }
  if (tag === 'ul' || tag === 'ol') {
    return {
      blockType: 'r20_list',
      fields: {
        TAG: tag,
        CLASS: stripSheetPrefix(a.class || ''),
        STYLE: a.style || '',
      },
      children: { CONTENT: matchChildren(node, ctx) },
    };
  }
  if (tag === 'li') {
    return {
      blockType: 'r20_list_item',
      fields: {
        CLASS: stripSheetPrefix(a.class || ''),
        STYLE: a.style || '',
      },
      children: { CONTENT: matchChildren(node, ctx) },
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Helpers.
// ---------------------------------------------------------------------------

/**
 * `sheet-X-switch` wrapper div → r20_value_switch_panel 복합 블록 분해.
 *
 * 인식 패턴 (lib/blocks/composite.ts emit 결과 역방향):
 *   <div class="sheet-X-switch">
 *     <style> ...sibling rule... </style>
 *     <input type="radio" class="sheet-X-input" name="attr_X" value="V1">
 *     <input ... value="V2">
 *     <div class="sheet-X-panel sheet-X-panel-V1">PANEL1</div>
 *     <div class="sheet-X-panel sheet-X-panel-V2">PANEL2</div>
 *   </div>
 *
 * ATTR_NAME 추출: class `sheet-X-switch` 의 X.
 * VALUE 별 PANEL: `sheet-X-panel-V` 의 V → 매칭. panel 내용은 div 의 자식들
 * matchTree 재귀.
 *
 * 매칭 실패 (input/panel 0 개 or X 불일치) 시 null → 호출 측이 일반 div 처리.
 */
function matchValueSwitchPanel(
  node: DomNode,
  cls: string,
  ctx: MatchContext,
): MatchedBlock | null {
  const m = /(?:^|\s)sheet-([\w-]+?)-switch(?:\s|$)/.exec(cls);
  if (!m) return null;
  const attr = m[1];
  if (!attr) return null;
  // Note: template literal 안의 `\s` 는 escape 안 됨 → `\\s` 로 해야 RegExp 안에 `\s` 도달.
  const inputClsRe = new RegExp('(?:^|\\s)sheet-' + escapeRegExp(attr) + '-input(?:\\s|$)');
  const panelClsRe = new RegExp('(?:^|\\s)sheet-' + escapeRegExp(attr) + '-panel-([\\w-]+)(?:\\s|$)');
  // 자식 element 들 중 input (radio) + panel div 추출.
  const radioValues: string[] = [];
  const panelByValue = new Map<string, DomNode>();
  for (const c of node.children) {
    if (c.type !== 'element') continue;
    const ca = c.attrs ?? {};
    const childCls = ca.class || '';
    if (c.tag === 'input' && inputClsRe.test(childCls)) {
      const v = ca.value || '';
      if (v) radioValues.push(v);
      continue;
    }
    if (c.tag === 'div') {
      const mm = panelClsRe.exec(childCls);
      if (mm) {
        const v = mm[1];
        if (!panelByValue.has(v)) panelByValue.set(v, c);
      }
    }
    // <style> 자식은 skip — emit 가 다시 채우므로 round-trip 시 동일.
  }
  // 매칭 조건: panel 1 개 이상.
  if (panelByValue.size === 0) return null;
  // 순서 — radio 등장 순서 우선, panel-only value 는 뒤에 추가.
  const seen = new Set<string>();
  const orderedValues: string[] = [];
  for (const v of radioValues) {
    if (panelByValue.has(v) && !seen.has(v)) {
      seen.add(v);
      orderedValues.push(v);
    }
  }
  for (const v of panelByValue.keys()) {
    if (!seen.has(v)) {
      seen.add(v);
      orderedValues.push(v);
    }
  }
  const cases: MatchedBlock[] = [];
  for (const v of orderedValues) {
    const panelDiv = panelByValue.get(v);
    if (!panelDiv) continue;
    // PANEL 슬롯 = panel div 의 자식 element 들을 matchTree 처리.
    const panelChildren: MatchedBlock[] = [];
    for (const c of panelDiv.children) {
      if (c.type !== 'element') continue;
      const matched = matchElement(c, ctx);
      if (matched) panelChildren.push(matched);
    }
    cases.push({
      blockType: 'r20_value_case',
      fields: { VALUE: v },
      children: panelChildren.length ? { PANEL: panelChildren } : {},
    });
  }
  return {
    blockType: 'r20_value_switch_panel',
    fields: { ATTR_NAME: attr },
    children: { CASES: cases },
  };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function meaningfulText(raw: string | undefined, parentTag = ''): string | null {
  if (!raw) return null;
  const text = String(raw);
  if (text.trim() || parentTag === 'pre' || parentTag === 'textarea') return text;
  return null;
}

function textNodeBlock(text: string): MatchedBlock {
  return {
    blockType: 'r20_text_node',
    fields: { TEXT: text },
    children: {},
  };
}

function matchChildren(node: DomNode, ctx: MatchContext): MatchedBlock[] {
  const out: MatchedBlock[] = [];
  for (const c of node.children) {
    if (c.type === 'text') {
      const text = meaningfulText(c.text, node.tag);
      if (text !== null) out.push(textNodeBlock(text));
      continue;
    }
    if (c.type !== 'element') continue;
    const m = matchElement(c, ctx);
    if (m) out.push(m);
  }
  return out;
}

/**
 * text/comment 또는 inline emphasis element (재귀) 만 자식으로 가지는지.
 *
 * <b><i>x</i></b> / <b>mix <i>i</i> text</b> 같은 중첩 inline 케이스를
 * r20_inline_bold / r20_inline_italic / r20_static_text / r20_label 로 매칭하기
 * 위함. 의미적으로 nested element 구조는 잃지만 (TEXT 한 줄로 합쳐짐) 텍스트는
 * 보존. <a> 같은 non-emphasis inline 은 제외 (의미 손실 큼 → raw_html 로 fallback).
 *
 * 1부 검증: RAW 419 <b> 중 109 만 매칭하던 hasOnlyText 의 buggy 제약 fix.
 */
const INLINE_TEXT_TAGS = new Set([
  'b', 'strong', 'em', 'small', 'u', 'i', 'br', 'span', 'sub', 'sup',
]);

function hasOnlyTextOrInline(node: DomNode): boolean {
  return node.children.every((c) => {
    if (c.type === 'text' || c.type === 'comment') return true;
    if (c.type !== 'element' || !c.tag) return false;
    if (!INLINE_TEXT_TAGS.has(c.tag)) return false;
    // <i class="sheet-icon-*"> 같은 아이콘은 흡수 X (의미 손실 큼).
    if (c.tag === 'i' && /(?:^|\s)sheet-icon-/.test((c.attrs?.class) || '')) return false;
    // data-i18n 가진 자식은 별도 i18n 블록이어야 — 흡수 X.
    if (c.attrs && (c.attrs['data-i18n'] || c.attrs['data-i18n-html'])) return false;
    return hasOnlyTextOrInline(c);
  });
}

/** `attr_foo` → `foo`. 영시영 / Roll20 표준 prefix. */
function stripAttrPrefix(name: string): string {
  return name.replace(/^attr_/, '');
}

/** `sheet-foo sheet-bar` → `foo bar`. */
function stripSheetPrefix(cls: string): string {
  return cls
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => t.replace(/^sheet-/, ''))
    .join(' ');
}

function extractGridCols(style: string): string {
  const m = /grid-template-columns\s*:\s*repeat\((\d+)/.exec(style);
  return m ? m[1] : '';
}

/**
 * Sheet worker `<script>` body 가 단일 reporter call (compendium /
 * translation) 이면 카탈로그 reporter 블록으로 분해.
 *
 * 매칭 패턴 (앞뒤 whitespace + 후행 `;` 허용, 따옴표는 ' 또는 " 둘 다):
 *   - `getCompendiumPage('PATH')` → r20_get_compendium PATH
 *   - `getCompendiumEntries('PATH', 'SUB')` → r20_get_compendium PATH+SUBPATH
 *   - `getTranslationByKey('KEY')` → r20_get_translation KEY
 *   - `getTranslationByLang('LANG', 'KEY')` → r20_get_translation KEY+LANG
 *
 * 외부 컨텍스트가 있는 (`if`, `=`, `;` 가 본문에 추가로 있는) 복합 worker 는
 * 매칭 안 함 → raw_worker fallback.
 */
function matchSheetWorkerReporter(body: string): MatchedBlock | null {
  if (!body) return null;
  // 단순 reporter — 전체 본문이 한 expression call.
  const trimmed = body.trim().replace(/;\s*$/, '');
  if (!trimmed) return null;
  // PATH/SUBPATH/KEY/LANG 의 따옴표 안은 자유 텍스트 — escape 안전한 매처.
  const RE_COMPENDIUM_PAGE =
    /^getCompendiumPage\(\s*(?:'([^']*)'|"([^"]*)")\s*\)$/;
  const m1 = RE_COMPENDIUM_PAGE.exec(trimmed);
  if (m1) {
    const path = m1[1] ?? m1[2] ?? '';
    return {
      blockType: 'r20_get_compendium',
      fields: { PATH: path, SUBPATH: '' },
      children: {},
    };
  }
  const RE_COMPENDIUM_ENTRIES =
    /^getCompendiumEntries\(\s*(?:'([^']*)'|"([^"]*)")\s*,\s*(?:'([^']*)'|"([^"]*)")\s*\)$/;
  const m2 = RE_COMPENDIUM_ENTRIES.exec(trimmed);
  if (m2) {
    const path = m2[1] ?? m2[2] ?? '';
    const sub = m2[3] ?? m2[4] ?? '';
    return {
      blockType: 'r20_get_compendium',
      fields: { PATH: path, SUBPATH: sub },
      children: {},
    };
  }
  const RE_TRANSLATION_KEY =
    /^getTranslationByKey\(\s*(?:'([^']*)'|"([^"]*)")\s*\)$/;
  const m3 = RE_TRANSLATION_KEY.exec(trimmed);
  if (m3) {
    const key = m3[1] ?? m3[2] ?? '';
    return {
      blockType: 'r20_get_translation',
      fields: { KEY: key, LANG: '' },
      children: {},
    };
  }
  const RE_TRANSLATION_LANG =
    /^getTranslationByLang\(\s*(?:'([^']*)'|"([^"]*)")\s*,\s*(?:'([^']*)'|"([^"]*)")\s*\)$/;
  const m4 = RE_TRANSLATION_LANG.exec(trimmed);
  if (m4) {
    const lang = m4[1] ?? m4[2] ?? '';
    const key = m4[3] ?? m4[4] ?? '';
    return {
      blockType: 'r20_get_translation',
      fields: { KEY: key, LANG: lang },
      children: {},
    };
  }
  return null;
}

function rawExpression(expr: string): MatchedBlock {
  // expression 카테고리 — 단일 `@{...}` 토큰이면 r20_attr_ref(_max) 로 분해
  // (Stage 22 §5 round-trip). 패턴 외엔 raw literal_string 유지.
  const attrRef = parseAttrRefToken(expr);
  if (attrRef) return attrRef;
  return {
    blockType: 'r20_literal_string',
    fields: { STR: expr },
    children: {},
  };
}

function innerHtmlSerialize(node: DomNode): string {
  const buf: string[] = [];
  for (const c of node.children) buf.push(serializeRawHtml(c));
  return buf.join('');
}

/**
 * fallback 용 raw HTML 직렬화 — 어떤 element 든 안전하게 원본 markup 으로
 * 되돌림 (autoPrefix 가 sheet- 부착하므로 stripSheetPrefix 는 안 함).
 */
export function serializeRawHtml(node: DomNode): string {
  if (node.type === 'text') return escapeText(node.text || '');
  if (node.type === 'comment') return `<!--${node.text || ''}-->`;
  if (node.type !== 'element' || !node.tag) return '';
  const attrs = Object.entries(node.attrs || {})
    .map(([k, v]) => ` ${k}="${escapeAttr(v)}"`)
    .join('');
  if (isVoidTag(node.tag)) return `<${node.tag}${attrs}>`;
  const inner = node.children.map(serializeRawHtml).join('');
  return `<${node.tag}${attrs}>${inner}</${node.tag}>`;
}

function escapeText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}
function isVoidTag(tag: string): boolean {
  return [
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr',
  ].includes(tag);
}
