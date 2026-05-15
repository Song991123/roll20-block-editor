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
import { firstTextContent, allTextContent } from './dom_walker';

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
  warnings: Array<{ code: string; message: string; hint?: string }>;
}

export function newMatchContext(): MatchContext {
  return { rawFallbackCount: 0, matchedCount: 0, totalCount: 0, sanitizeDropped: 0, warnings: [] };
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
    return result;
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
    if (a['data-i18n-placeholder']) {
      return {
        blockType: 'r20_i18n_placeholder',
        fields: {
          KEY: a['data-i18n-placeholder'],
          DEFAULT: a.placeholder || '',
        },
        children: {},
      };
    }

    if (inputType === 'text') {
      return {
        blockType: 'r20_text_input',
        fields: { NAME: name, CLASS: cls, DEFAULT: a.value || '' },
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
        },
        children: {},
      };
    }
    if (inputType === 'checkbox') {
      return {
        blockType: 'r20_checkbox',
        fields: {
          NAME: name, CLASS: cls,
          CHECKED: 'checked' in a || a.checked != null ? 'TRUE' : 'FALSE',
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
        },
        children: {},
      };
    }
    if (inputType === 'hidden') {
      return {
        blockType: 'r20_hidden_input',
        fields: { NAME: name, DEFAULT: a.value || '0' },
        children: {},
      };
    }
    if (inputType === 'file') {
      return {
        blockType: 'r20_file_input',
        fields: { NAME: name, CLASS: cls, ACCEPT: a.accept || '' },
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
      fields: { NAME: name, CLASS: cls },
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
      fields: { NAME: name, CLASS: cls, ROWS: rows, DEFAULT: text },
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
      },
      children: {},
    };
  }
  return {
    blockType: 'r20_select_option',
    fields: { VALUE: a.value || '', LABEL: label },
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
          fields: { NAME: name, LABEL: label, MESSAGE: expr, CLASS: cls },
          children: {},
        };
      }
      return {
        blockType: 'r20_roll_button',
        fields: { NAME: name, LABEL: label, CLASS: cls },
        children: {},
        // EXPR 은 raw 표현식 — value-input 슬롯에 raw_expression 으로 박음.
        valueInputs: expr ? { EXPR: rawExpression(expr) } : undefined,
      };
    }
    if (btype === 'action') {
      const name = rawName.startsWith('act_') ? rawName.slice(4) : rawName;
      return {
        blockType: 'r20_action_button',
        fields: { NAME: name, LABEL: label, CLASS: cls },
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
      fields: { NAME: name },
      children: { ROWS: rows },
    };
  }

  return null;
}

function matchI18n(node: DomNode, ctx: MatchContext): MatchedBlock | null {
  const tag = node.tag;
  if (!tag) return null;
  const a = node.attrs ?? {};

  // data-i18n="KEY" 가 있으면 i18n 우선.
  if (a['data-i18n'] && ['span','div','label','strong','b','em','small','p','td','th'].includes(tag)) {
    const text = firstTextContent(node);
    return {
      blockType: 'r20_i18n_text',
      fields: { KEY: a['data-i18n'], DEFAULT: text, CLASS: stripSheetPrefix(a.class || '') },
      children: {},
    };
  }
  if (a['data-i18n-html'] && (tag === 'span' || tag === 'div')) {
    const inner = innerHtmlSerialize(node);
    return {
      blockType: 'r20_i18n_html',
      fields: { KEY: a['data-i18n-html'], DEFAULT: inner },
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
      },
      children: {},
    };
  }
  if (tag === 'legend' && a['data-i18n']) {
    return {
      blockType: 'r20_i18n_legend',
      fields: { KEY: a['data-i18n'], DEFAULT: firstTextContent(node) },
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
      },
      children: {},
    };
  }
  return null;
}

function matchDisplay(node: DomNode, ctx: MatchContext): MatchedBlock | null {
  const tag = node.tag;
  if (!tag) return null;
  const a = node.attrs ?? {};

  if (tag === 'script') {
    return {
      blockType: 'r20_raw_worker',
      fields: { JS: allTextContent(node) },
      children: {},
    };
  }
  if (/^h[1-6]$/.test(tag)) {
    return {
      blockType: 'r20_heading',
      fields: {
        LEVEL: tag.slice(1),
        TEXT: allTextContent(node),
        CLASS: stripSheetPrefix(a.class || ''),
      },
      children: {},
    };
  }
  if (tag === 'hr') {
    return {
      blockType: 'r20_hr',
      fields: { CLASS: stripSheetPrefix(a.class || '') },
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
        fields: { NAME: m[1], CLASS: '' },
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
        fields: { SIZE: m[1] },
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
      },
      children: {},
    };
  }
  // <b>, <strong> — bold emphasis → r20_inline_bold (시맨틱 보존).
  if ((tag === 'b' || tag === 'strong') && hasOnlyText(node) && !a['data-i18n']) {
    return {
      blockType: 'r20_inline_bold',
      fields: {
        TEXT: firstTextContent(node),
        CLASS: stripSheetPrefix(a.class || ''),
      },
      children: {},
    };
  }
  // <em>, <i> — italic emphasis → r20_inline_italic.
  // <i> 가 sheet-icon-* 마크업이면 위쪽 icon branch 가 먼저 잡고 여기 안 옴.
  if ((tag === 'em' || tag === 'i') && hasOnlyText(node) && !a['data-i18n']) {
    return {
      blockType: 'r20_inline_italic',
      fields: {
        TEXT: firstTextContent(node),
        CLASS: stripSheetPrefix(a.class || ''),
      },
      children: {},
    };
  }
  // <small>, <u> — text-only inline emphasis (legacy) → static_text. (별도 블록 없음)
  if (['small','u'].includes(tag) && hasOnlyText(node) && !a['data-i18n']) {
    return {
      blockType: 'r20_static_text',
      fields: {
        TEXT: firstTextContent(node),
        CLASS: (stripSheetPrefix(a.class || '') + ' ' + tag).trim(),
      },
      children: {},
    };
  }
  // <br> — void linebreak → r20_inline_break.
  if (tag === 'br') {
    return {
      blockType: 'r20_inline_break',
      fields: {},
      children: {},
    };
  }
  // <caption> — table caption → r20_table_caption.
  if (tag === 'caption') {
    return {
      blockType: 'r20_table_caption',
      fields: {
        TEXT: allTextContent(node),
        CLASS: stripSheetPrefix(a.class || ''),
      },
      children: {},
    };
  }
  // 단순 텍스트 <span>
  if (tag === 'span' && hasOnlyText(node)) {
    return {
      blockType: 'r20_static_text',
      fields: {
        TEXT: firstTextContent(node),
        CLASS: stripSheetPrefix(a.class || ''),
      },
      children: {},
    };
  }
  if (tag === 'label' && hasOnlyText(node)) {
    return {
      blockType: 'r20_label',
      fields: { TEXT: firstTextContent(node) },
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
        fields: { NAME: repeating[1] },
        children: { CONTENT: matchChildren(node, ctx) },
      };
    }
    return {
      blockType: 'r20_fieldset',
      fields: { CLASS: stripSheetPrefix(cls) },
      children: { CONTENT: matchChildren(node, ctx) },
    };
  }

  if (tag === 'div') {
    const cls = a.class || '';
    // row / col / colrow / section / toggle / grid 매칭
    if (/\bsheet-row\b/.test(cls)) {
      return {
        blockType: 'r20_row',
        fields: {},
        children: { CONTENT: matchChildren(node, ctx) },
      };
    }
    if (/\bsheet-col\b/.test(cls)) {
      return {
        blockType: 'r20_col',
        fields: {},
        children: { CONTENT: matchChildren(node, ctx) },
      };
    }
    const colrowN = /\bsheet-colrow-(\d+)\b/.exec(cls);
    if (colrowN) {
      return {
        blockType: 'r20_colrow_n',
        fields: { N: colrowN[1] },
        children: { CONTENT: matchChildren(node, ctx) },
      };
    }
    const sectionN = /\bsheet-section-(\S+)/.exec(cls);
    if (sectionN) {
      return {
        blockType: 'r20_section_wrap',
        fields: { NAME: sectionN[1] },
        children: { CONTENT: matchChildren(node, ctx) },
      };
    }
    const toggleN = /\bsheet-toggle-(\S+)/.exec(cls);
    if (toggleN) {
      return {
        blockType: 'r20_toggle_wrap',
        fields: { NAME: toggleN[1] },
        children: { CONTENT: matchChildren(node, ctx) },
      };
    }
    if (/\bsheet-repeating-row\b/.test(cls)) {
      return {
        blockType: 'r20_repeating_row',
        fields: {},
        children: { CONTENT: matchChildren(node, ctx) },
      };
    }
    if (/\bsheet-grid\b/.test(cls)) {
      const cols = extractGridCols(a.style || '') || '2';
      return {
        blockType: 'r20_grid',
        fields: { COLS: cols },
        children: { CONTENT: matchChildren(node, ctx) },
      };
    }
    return {
      blockType: 'r20_div',
      fields: { CLASS: stripSheetPrefix(cls) },
      children: { CONTENT: matchChildren(node, ctx) },
    };
  }

  if (tag === 'span') {
    return {
      blockType: 'r20_span',
      fields: { CLASS: stripSheetPrefix(a.class || '') },
      children: { CONTENT: matchChildren(node, ctx) },
    };
  }

  if (tag === 'table') {
    return {
      blockType: 'r20_table',
      fields: { CLASS: stripSheetPrefix(a.class || '') },
      children: { CONTENT: matchChildren(node, ctx) },
    };
  }
  if (tag === 'thead' || tag === 'tbody' || tag === 'tr' || tag === 'th' || tag === 'td') {
    return {
      blockType: `r20_${tag}`,
      fields: {},
      children: { CONTENT: matchChildren(node, ctx) },
    };
  }
  if (tag === 'label') {
    // text-only label 은 display 가 처리, 자식 있는 label 은 wrap 으로 raw fallback.
    return null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Helpers.
// ---------------------------------------------------------------------------

function matchChildren(node: DomNode, ctx: MatchContext): MatchedBlock[] {
  const out: MatchedBlock[] = [];
  for (const c of node.children) {
    if (c.type !== 'element') continue;
    const m = matchElement(c, ctx);
    if (m) out.push(m);
  }
  return out;
}

function hasOnlyText(node: DomNode): boolean {
  return node.children.every((c) => c.type === 'text' || c.type === 'comment');
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

function rawExpression(expr: string): MatchedBlock {
  // expression 카테고리 raw block — 단순 텍스트.
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
