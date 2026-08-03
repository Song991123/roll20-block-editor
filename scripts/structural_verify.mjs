#!/usr/bin/env node
/**
 * structural_verify.mjs — DOM tree ↔ block tree 구조적 동일성 진실성 검증.
 *
 * 사용:
 *   node scripts/structural_verify.mjs <working_dir>
 *
 * 입력:
 *   <working_dir>/original.html
 *   <working_dir>/emit_html.xml
 *
 * 출력 (stdout): JSON 진단 보고서.
 *
 * 비-set-기반: 단순 "토큰이 어딘가에 존재" 가 아니라, 위치 (parent-child / sibling
 * 순서) 별로 element ↔ block 매핑 후 attribute / children / text 보존 측정.
 *
 * 모든 카운트는 정수. 표본 (sample) 은 실제 케이스 처음 N 개 캡쳐.
 */

import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

// ---------------------------------------------------------------------------
// HTML 파서 — measure_fidelity.mjs 와 동일 가벼운 파서 (외부 의존 0).
// ---------------------------------------------------------------------------

const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);
const RAW_TEXT_TAGS = new Set(['script', 'style']);

function parseHtml(html) {
  const root = { tag: '#root', attrs: {}, children: [], parent: null };
  let cur = root;
  let i = 0;
  const n = html.length;
  while (i < n) {
    if (html[i] === '<') {
      if (html.startsWith('<!--', i)) {
        const end = html.indexOf('-->', i + 4);
        if (end < 0) break;
        i = end + 3;
        continue;
      }
      if (html[i + 1] === '!' || html[i + 1] === '?') {
        const end = html.indexOf('>', i);
        if (end < 0) break;
        i = end + 1;
        continue;
      }
      if (html[i + 1] === '/') {
        const end = html.indexOf('>', i);
        if (end < 0) break;
        const tagName = html.slice(i + 2, end).trim().toLowerCase();
        let target = cur;
        while (target && target.tag !== tagName) target = target.parent;
        if (target && target.parent) cur = target.parent;
        i = end + 1;
        continue;
      }
      const tagMatch = /^<([a-zA-Z][a-zA-Z0-9-]*)/.exec(html.slice(i));
      if (!tagMatch) { i++; continue; }
      const tagName = tagMatch[1].toLowerCase();
      let j = i + tagMatch[0].length;
      const attrs = {};
      let selfClose = false;
      while (j < n) {
        while (j < n && /\s/.test(html[j])) j++;
        if (html[j] === '>') { j++; break; }
        if (html[j] === '/' && html[j + 1] === '>') { selfClose = true; j += 2; break; }
        const nameMatch = /^([^\s=>/]+)/.exec(html.slice(j));
        if (!nameMatch) { j++; continue; }
        const name = nameMatch[1].toLowerCase();
        j += nameMatch[0].length;
        while (j < n && /\s/.test(html[j])) j++;
        let value = '';
        if (html[j] === '=') {
          j++;
          while (j < n && /\s/.test(html[j])) j++;
          if (html[j] === '"' || html[j] === "'") {
            const quote = html[j];
            const end = html.indexOf(quote, j + 1);
            value = html.slice(j + 1, end < 0 ? n : end);
            j = end < 0 ? n : end + 1;
          } else {
            const valMatch = /^[^\s>]+/.exec(html.slice(j));
            if (valMatch) {
              value = valMatch[0];
              j += valMatch[0].length;
            }
          }
        }
        attrs[name] = value;
      }
      const node = { tag: tagName, attrs, children: [], parent: cur };
      cur.children.push(node);
      const isVoid = VOID_TAGS.has(tagName) || selfClose;
      if (!isVoid && (RAW_TEXT_TAGS.has(tagName) || tagName === 'rolltemplate')) {
        const closeRe = new RegExp(`</${tagName}\\s*>`, 'i');
        const rest = html.slice(j);
        const m = closeRe.exec(rest);
        if (m) {
          const text = rest.slice(0, m.index);
          if (tagName === 'rolltemplate') {
            // rolltemplate 내부도 element 로 재귀 파싱 — script/style 처럼 raw 가 아님.
            const inner = parseHtml(text);
            for (const c of inner.children) { c.parent = node; node.children.push(c); }
          } else if (text.length) {
            node.children.push({ tag: '#text', text, children: [], parent: node });
          }
          i = j + m.index + m[0].length;
        } else {
          i = n;
        }
        continue;
      }
      if (!isVoid) cur = node;
      i = j;
      continue;
    }
    const next = html.indexOf('<', i);
    const end = next < 0 ? n : next;
    const text = html.slice(i, end);
    if (text.trim().length) {
      cur.children.push({ tag: '#text', text, children: [], parent: cur });
    }
    i = end;
  }
  return root;
}

// ---------------------------------------------------------------------------
// Blockly XML 파서 — block 트리 (statement / next / value 모두 인식).
// ---------------------------------------------------------------------------

function parseXml(xml) {
  // 매우 단순한 SAX-ish 파서 — 블록 트리만 build.
  // 노드 형태: { type:'block', blockType, fields:{}, statements:{name: [block,...]}, values:{name: block}, next: block|null }
  let i = 0;
  const n = xml.length;
  const root = { type: 'root', children: [] };

  function skipWs() { while (i < n && /\s/.test(xml[i])) i++; }
  function parseTag() {
    // expects current char is '<'
    if (xml[i] !== '<') return null;
    if (xml.startsWith('<!--', i)) {
      const e = xml.indexOf('-->', i + 4);
      i = e < 0 ? n : e + 3;
      return { kind: 'comment' };
    }
    let j = i + 1;
    const closing = xml[j] === '/';
    if (closing) j++;
    const nameStart = j;
    while (j < n && !/[\s/>]/.test(xml[j])) j++;
    const tag = xml.slice(nameStart, j);
    const attrs = {};
    while (j < n && xml[j] !== '>' && !(xml[j] === '/' && xml[j+1] === '>')) {
      while (j < n && /\s/.test(xml[j])) j++;
      if (xml[j] === '>' || xml[j] === '/') break;
      const nameMatch = /^([^\s=>/]+)/.exec(xml.slice(j));
      if (!nameMatch) { j++; continue; }
      const aname = nameMatch[1];
      j += nameMatch[0].length;
      let aval = '';
      if (xml[j] === '=') {
        j++;
        if (xml[j] === '"' || xml[j] === "'") {
          const q = xml[j];
          const e = xml.indexOf(q, j + 1);
          aval = xml.slice(j + 1, e < 0 ? n : e);
          j = e < 0 ? n : e + 1;
        }
      }
      attrs[aname] = aval;
    }
    let selfClose = false;
    if (xml[j] === '/' && xml[j+1] === '>') { selfClose = true; j += 2; }
    else if (xml[j] === '>') j++;
    i = j;
    return { kind: 'tag', tag, attrs, closing, selfClose };
  }

  function readText(untilTag) {
    // 다음 close tag 까지 읽음. text 반환 + i 가 close tag 시작 위치에 멈춤.
    const lower = untilTag.toLowerCase();
    let buf = '';
    while (i < n) {
      if (xml[i] === '<' && xml[i+1] === '/' && xml.slice(i+2, i+2+lower.length).toLowerCase() === lower) {
        return buf;
      }
      buf += xml[i++];
    }
    return buf;
  }

  function parseBlock(typeFromOpen, openAttrs) {
    const block = {
      type: 'block',
      blockType: typeFromOpen,
      attrs: openAttrs,
      fields: {},
      statements: {},
      values: {},
      next: null,
    };
    while (i < n) {
      // skip whitespace
      while (i < n && /\s/.test(xml[i])) i++;
      if (i >= n) break;
      if (xml[i] !== '<') { i++; continue; }
      const tok = parseTag();
      if (!tok || tok.kind === 'comment') continue;
      if (tok.closing) {
        // </block> close — done.
        return block;
      }
      if (tok.tag === 'field') {
        const fname = tok.attrs.name || '';
        // field text content until </field>
        const txt = readText('field');
        block.fields[fname] = unescapeXml(txt);
        // consume </field>
        const close = parseTag();
        if (!close || !close.closing || close.tag !== 'field') {
          // tolerate
        }
        continue;
      }
      if (tok.tag === 'statement') {
        const sname = tok.attrs.name || '';
        const chain = parseChain('statement');
        block.statements[sname] = chain;
        continue;
      }
      if (tok.tag === 'value') {
        const sname = tok.attrs.name || '';
        const single = parseChain('value');
        block.values[sname] = single[0] || null;
        continue;
      }
      if (tok.tag === 'next') {
        const chain = parseChain('next');
        block.next = chain[0] || null;
        continue;
      }
      if (tok.tag === 'mutation' || tok.tag === 'data' || tok.tag === 'comment') {
        // skip until matching close
        readText(tok.tag);
        parseTag(); // consume close
        continue;
      }
      // unknown — skip
    }
    return block;
  }

  function parseChain(parentTagName) {
    // parses a sequence of <block>...</block> linked by <next>, ends at </parentTagName>
    const chain = [];
    while (i < n) {
      while (i < n && /\s/.test(xml[i])) i++;
      if (i >= n) break;
      if (xml[i] !== '<') { i++; continue; }
      const tok = parseTag();
      if (!tok || tok.kind === 'comment') continue;
      if (tok.closing && tok.tag === parentTagName) return chain;
      if (tok.tag === 'block') {
        const bt = tok.attrs.type || '';
        const b = parseBlock(bt, tok.attrs);
        chain.push(b);
        // unfold next chain into linear sibling sequence
        let cursor = b;
        while (cursor.next) {
          chain.push(cursor.next);
          cursor = cursor.next;
        }
        continue;
      }
      // unexpected token inside chain — skip
    }
    return chain;
  }

  // top-level
  while (i < n) {
    while (i < n && /\s/.test(xml[i])) i++;
    if (i >= n) break;
    if (xml[i] !== '<') { i++; continue; }
    const tok = parseTag();
    if (!tok || tok.kind === 'comment') continue;
    if (tok.tag === 'xml' && !tok.closing) {
      // children are blocks at top level
      const chain = parseChain('xml');
      for (const c of chain) root.children.push(c);
      continue;
    }
    if (tok.closing && tok.tag === 'xml') break;
  }
  return root;
}

function unescapeXml(s) {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}

// ---------------------------------------------------------------------------
// 매핑 규칙 — block_matcher.ts 와 동일한 결정 트리. 위치별 매칭 확인용.
// ---------------------------------------------------------------------------

const INLINE_TAGS = new Set(['b','strong','em','small','u','i','br','span','sub','sup']);

function isIcon(node) {
  return node.tag === 'i' && /(?:^|\s)sheet-icon-/.test(node.attrs.class || '');
}

function hasOnlyTextOrInline(node) {
  return node.children.every((c) => {
    if (c.tag === '#text' || c.tag === '#comment') return true;
    if (!INLINE_TAGS.has(c.tag)) return false;
    if (isIcon(c)) return false;
    if (c.attrs && (c.attrs['data-i18n'] || c.attrs['data-i18n-html'])) return false;
    return hasOnlyTextOrInline(c);
  });
}

function elementChildren(node) {
  return node.children.filter((c) => !c.tag.startsWith('#'));
}

function textContent(node) {
  // allTextContent — depth-first concat of text node values.
  if (node.tag === '#text') return node.text || '';
  let out = '';
  for (const c of node.children) out += textContent(c);
  return out;
}

function expectedBlockType(node) {
  if (!node || node.tag.startsWith('#')) return null;
  const tag = node.tag;
  const a = node.attrs || {};

  // matchInput
  if (tag === 'input') {
    if (a['data-i18n-placeholder']) return 'r20_i18n_placeholder';
    const t = (a.type || 'text').toLowerCase();
    if (t === 'text') return 'r20_text_input';
    if (t === 'number') return 'r20_number_input';
    if (t === 'checkbox') return 'r20_checkbox';
    if (t === 'radio') return 'r20_radio';
    if (t === 'hidden') return 'r20_hidden_input';
    if (t === 'file') return 'r20_file_input';
    return 'r20_generic_input';
  }
  if (tag === 'select') return 'r20_select';
  if (tag === 'optgroup') return 'r20_optgroup';
  if (tag === 'option') {
    if (a['data-i18n']) return 'r20_i18n_select_option';
    return 'r20_select_option';
  }
  if (tag === 'textarea') return 'r20_textarea';

  // matchDice
  if (tag === 'button') {
    if (a['data-i18n']) return 'r20_i18n_button';
    const bt = (a.type || 'button').toLowerCase();
    if (bt === 'roll') {
      const expr = a.value || '';
      const looksLikeRoll = /(@\{|\[\[|\b\d*d\d+|\/r|\/roll)/i.test(expr);
      if (!looksLikeRoll && expr) return 'r20_chat_button';
      return 'r20_roll_button';
    }
    if (bt === 'action') return 'r20_action_button';
    return null;
  }
  if (tag === 'rolltemplate') return 'r20_rolltemplate_define';

  // matchI18n
  if (a['data-i18n'] && ['span','div','label','strong','b','em','small','p','td','th'].includes(tag)) {
    return 'r20_i18n_text';
  }
  if (a['data-i18n-html'] && ['span','div','label','strong','b','em','small','p','td','th'].includes(tag)) {
    return 'r20_i18n_html';
  }
  if (a['data-i18n-title'] && ['span','div','label','strong','b','em','small','p','td','th'].includes(tag)) {
    return 'r20_i18n_title';
  }
  if (a['data-i18n-aria-label'] && ['span','div','label','strong','b','em','small','p','td','th'].includes(tag)) {
    return 'r20_i18n_aria_label';
  }
  if (tag === 'legend' && a['data-i18n']) return 'r20_i18n_legend';

  // matchDisplay
  if (tag === 'script') return 'r20_raw_worker';
  if (/^h[1-6]$/.test(tag)) return 'r20_heading';
  if (tag === 'hr') return 'r20_hr';
  if (tag === 'img') return 'r20_image';
  if (isIcon(node)) return 'r20_icon';
  if (tag === 'div') {
    const cls = a.class || '';
    if (/(?:^|\s)sheet-spacer-(small|medium|large)(?:\s|$)/.test(cls) && /sheet-spacer/.test(cls)) return 'r20_spacer';
  }
  if (tag === 'span' && a['aria-disabled'] === 'true') return 'r20_disabled_text';
  if ((tag === 'b' || tag === 'strong') && hasOnlyTextOrInline(node) && !a['data-i18n']) return 'r20_inline_bold';
  if ((tag === 'em' || tag === 'i') && hasOnlyTextOrInline(node) && !a['data-i18n']) return 'r20_inline_italic';
  if (['small','u'].includes(tag) && hasOnlyTextOrInline(node) && !a['data-i18n']) return 'r20_static_text';
  if (tag === 'br') return 'r20_inline_break';
  if (tag === 'caption') return 'r20_table_caption';
  if (tag === 'span' && hasOnlyTextOrInline(node)) return 'r20_static_text';
  if (tag === 'label' && hasOnlyTextOrInline(node)) return 'r20_label';

  // matchContainer
  if (tag === 'fieldset') {
    const cls = a.class || '';
    if (/(?:^|\s)repeating_/.test(cls)) return 'r20_repeating_section';
    return 'r20_fieldset';
  }
  if (tag === 'div') {
    const cls = a.class || '';
    if (/\bsheet-row\b/.test(cls)) return 'r20_row';
    if (/\bsheet-col\b/.test(cls)) return 'r20_col';
    if (/\bsheet-colrow-(\d+)\b/.test(cls)) return 'r20_colrow_n';
    if (/\bsheet-section-/.test(cls)) return 'r20_section_wrap';
    if (/\bsheet-toggle-/.test(cls)) return 'r20_toggle_wrap';
    if (/\bsheet-repeating-row\b/.test(cls)) return 'r20_repeating_row';
    if (/\bsheet-grid\b/.test(cls)) return 'r20_grid';
    return 'r20_div';
  }
  if (tag === 'span') return 'r20_span';
  if (tag === 'table') return 'r20_table';
  if (tag === 'colgroup') return 'r20_colgroup';
  if (tag === 'col') return 'r20_table_col';
  if (['thead','tbody','tr','th','td'].includes(tag)) return `r20_${tag}`;
  if (tag === 'label') return null; // children-having label falls back to raw
  if (VOID_TAGS.has(tag)) return 'r20_element_atom';

  return null; // → raw_html fallback
}

/**
 * 이 element 가 부모 inline 흡수에 의해 별도 block 으로 emit 안 되는지 판정.
 * (예: <b><i>x</i></b> → r20_inline_bold 하나만 emit, 내부 <i> 는 skip)
 */
function isAbsorbedByInlineParent(node) {
  let cur = node.parent;
  while (cur && !cur.tag.startsWith('#') && cur.tag !== '#root') {
    if (INLINE_TAGS.has(cur.tag) && hasOnlyTextOrInline(cur)) {
      // 부모가 inline 흡수 매칭 (b/strong/em/i/small/u/span/label) 이면 자식 skip
      const ptag = cur.tag;
      const pa = cur.attrs || {};
      if ((ptag === 'b' || ptag === 'strong') && !pa['data-i18n']) return true;
      if ((ptag === 'em' || ptag === 'i') && !pa['data-i18n'] && !isIcon(cur)) return true;
      if (['small','u'].includes(ptag) && !pa['data-i18n']) return true;
      if (ptag === 'span' && !pa['data-i18n'] && !pa['data-i18n-html'] && pa['aria-disabled'] !== 'true') return true;
      if (ptag === 'label' && !pa['data-i18n']) return true;
    }
    cur = cur.parent;
  }
  return false;
}

// rolltemplate 자식들도 별도 처리 (특수): block_matcher 가 rolltemplate 의 자식을 다시 matchElement
// 함수로 처리 → 일반 element 와 같음. fieldset/select 는 자식을 CONTENT 또는 OPTIONS 슬롯에 박음.

function isUnderRawHtmlFallback(node) {
  // 매칭 실패한 부모 (raw_html fallback) 의 자식은 emit 시 raw HTML blob 안 으로 들어가므로
  // 별도 block 으로 안 나옴.
  let cur = node.parent;
  while (cur && !cur.tag.startsWith('#') && cur.tag !== '#root') {
    if (expectedBlockType(cur) === null && cur.tag !== 'option' /* select 자식 option 은 별도 처리 */) {
      // raw_html 로 떨어졌으니 그 자식은 raw blob 안에 박힘
      return true;
    }
    cur = cur.parent;
  }
  return false;
}

// ---------------------------------------------------------------------------
// 구조적 매핑: HTML 트리 DFS ↔ block 트리 DFS 병렬 walk.
// 각 element 가 가야 할 block 위치를 expectedBlockType + 위치 정보로 찾아 비교.
// ---------------------------------------------------------------------------

// '@implicit' = block-type 선택 자체가 이 attribute 를 인코딩 (예: type=text → r20_text_input). emit 시 그 attribute 가 자동 복원되므로 drop 아님.
// '@value_expr' = button.value 가 valueInputs.EXPR 로 들어감 (field 가 아님).
const ATTR_FIELD_MAP = {
  r20_text_input: { name: 'NAME', class: 'CLASS', value: 'DEFAULT', type: '@implicit', style: 'STYLE' },
  r20_number_input: { name: 'NAME', class: 'CLASS', value: 'DEFAULT', min: 'MIN', max: 'MAX', type: '@implicit', style: 'STYLE' },
  r20_checkbox: { name: 'NAME', class: 'CLASS', value: 'VALUE', type: '@implicit', checked: '@implicit', style: 'STYLE' },
  r20_radio: { name: 'NAME', class: 'CLASS', value: 'VALUE', type: '@implicit', style: 'STYLE' },
  r20_hidden_input: { name: 'NAME', class: 'CLASS', value: 'DEFAULT', type: '@implicit', style: 'STYLE' },
  r20_file_input: { name: 'NAME', class: 'CLASS', accept: 'ACCEPT', type: '@implicit', style: 'STYLE' },
  r20_generic_input: {
    type: 'TYPE',
    name: 'NAME',
    class: 'CLASS',
    value: 'DEFAULT',
    placeholder: 'PLACEHOLDER',
    min: 'MIN',
    max: 'MAX',
    step: 'STEP',
    disabled: '@implicit',
    readonly: '@implicit',
    style: 'STYLE',
  },
  r20_element_atom: { class: 'CLASS', style: 'STYLE' },
  r20_i18n_placeholder: { 'data-i18n-placeholder': 'KEY', name: 'NAME', class: 'CLASS', type: 'TYPE', value: 'DEFAULT', accept: 'ACCEPT', min: 'MIN', max: 'MAX', style: 'STYLE' },
  r20_select: { name: 'NAME', class: 'CLASS', style: 'STYLE' },
  r20_optgroup: { label: 'LABEL', disabled: '@implicit', class: 'CLASS', style: 'STYLE' },
  r20_select_option: { value: 'VALUE', selected: '@implicit', class: 'CLASS', style: 'STYLE' },
  r20_i18n_select_option: { 'data-i18n': 'KEY', value: 'VALUE', selected: '@implicit', class: 'CLASS', style: 'STYLE' },
  r20_textarea: { name: 'NAME', class: 'CLASS', rows: 'ROWS', style: 'STYLE' },
  r20_roll_button: { name: 'NAME', class: 'CLASS', type: '@implicit', value: '@value_expr', style: 'STYLE' },
  r20_chat_button: { name: 'NAME', class: 'CLASS', type: '@implicit', value: 'MESSAGE', style: 'STYLE' },
  r20_action_button: { name: 'NAME', class: 'CLASS', type: '@implicit', style: 'STYLE' },
  r20_i18n_button: { 'data-i18n': 'KEY', type: 'TYPE', name: 'NAME', class: 'CLASS', style: 'STYLE' },
  r20_rolltemplate_define: { style: 'STYLE' }, // NAME 은 class 에서 추출
  r20_i18n_text: { 'data-i18n': 'KEY', class: 'CLASS', style: 'STYLE' },
  r20_i18n_html: { 'data-i18n-html': 'KEY', class: 'CLASS', style: 'STYLE' },
  r20_i18n_title: { 'data-i18n-title': 'KEY', title: 'DEFAULT', class: 'CLASS', style: 'STYLE' },
  r20_i18n_aria_label: { 'data-i18n-aria-label': 'KEY', 'aria-label': 'DEFAULT', class: 'CLASS', style: 'STYLE' },
  r20_i18n_legend: { 'data-i18n': 'KEY', class: 'CLASS', style: 'STYLE' },
  r20_raw_worker: {},
  r20_heading: { class: 'CLASS', style: 'STYLE' },
  r20_hr: { class: 'CLASS', style: 'STYLE' },
  r20_image: { src: 'SRC', alt: 'ALT', class: 'CLASS', width: 'WIDTH', height: 'HEIGHT', style: 'STYLE' },
  r20_icon: { class: 'CLASS', style: 'STYLE' },
  r20_spacer: { class: 'CLASS', style: 'STYLE' },
  r20_disabled_text: { class: 'CLASS', style: 'STYLE' },
  r20_inline_bold: { class: 'CLASS', style: 'STYLE' },
  r20_inline_italic: { class: 'CLASS', style: 'STYLE' },
  r20_static_text: { class: 'CLASS', style: 'STYLE' },
  r20_inline_break: { class: 'CLASS', style: 'STYLE' },
  r20_table_caption: { class: 'CLASS', style: 'STYLE' },
  r20_label: { class: 'CLASS', style: 'STYLE' },
  r20_fieldset: { class: 'CLASS', style: 'STYLE' },
  r20_repeating_section: { class: 'CLASS', style: 'STYLE' },
  r20_row: { class: 'CLASS', style: 'STYLE' },
  r20_col: { class: 'CLASS', style: 'STYLE' },
  r20_colrow_n: { class: 'CLASS', style: 'STYLE' },
  r20_section_wrap: { class: 'CLASS', style: 'STYLE' },
  r20_toggle_wrap: { class: 'CLASS', style: 'STYLE' },
  r20_repeating_row: { class: 'CLASS', style: 'STYLE' },
  r20_grid: { class: 'CLASS', style: 'STYLE' },
  r20_div: { class: 'CLASS', style: 'STYLE' },
  r20_span: { class: 'CLASS', style: 'STYLE' },
  r20_table: { class: 'CLASS', style: 'STYLE' },
  r20_thead: { class: 'CLASS', style: 'STYLE' },
  r20_tbody: { class: 'CLASS', style: 'STYLE' },
  r20_tr: { class: 'CLASS', style: 'STYLE' },
  r20_th: { class: 'CLASS', style: 'STYLE' },
  r20_td: { class: 'CLASS', style: 'STYLE' },
};

// 카테고리별 attribute 손실. PER_ATTR_NEVER_KEPT = block 의 field set 에 절대 없는 attr.
const ATTRS_INTRINSICALLY_DROPPED_GLOBAL = new Set([
  'style', 'id', 'title', 'colspan', 'rowspan', 'align', 'valign',
  'border', 'cellpadding', 'cellspacing', 'width', 'height',
  'tabindex', 'role', 'spellcheck', 'autocomplete', 'autocorrect',
  'placeholder', 'maxlength', 'pattern', 'readonly', 'disabled',
  'multiple', 'size', 'wrap', 'data-tip', 'data-section',
  'data-tooltip', 'data-show', 'data-hide',
]);

// Inline 흡수 부모용 표시
function isInlineMergedHere(htmlNode) {
  // 부모가 inline-merge 되어 이 element 는 emit X
  return isAbsorbedByInlineParent(htmlNode);
}

/**
 * 핵심 비교 함수.
 * htmlNode: HTML element (또는 root)
 * blocks: 동위 sibling block chain (parent block 의 CONTENT chain)
 *
 * 위치 매칭으로 element[i] ↔ blocks[k] 매핑. inline 흡수 / raw_html fallback /
 * select-option / rolltemplate-row 같은 특수 슬롯 인식.
 *
 * 반환: { processed, mismatches, ... }
 */

function compare(rootHtml, rootBlocks) {
  const loss = {
    elements_total: 0,
    elements_inline_absorbed: 0,
    elements_under_raw_fallback: 0,
    elements_expected_block: 0,
    elements_matched_block: 0,
    elements_wrong_block_type: 0,
    elements_missing_block: 0,

    // 카운트만 — sample 5
    samples: {
      wrong_block_type: [],
      missing_block: [],
      attr_drop_style: [],
      attr_drop_id: [],
      attr_drop_colspan_rowspan: [],
      attr_drop_title_misc: [],
      multi_class_lost: [],
      nested_flattened: [],
      sibling_order_diverged: [],
      text_lost: [],
      input_value_dropped: [],
    },

    attr_preserved_count: 0,
    attr_dropped_count: 0,
    attr_drops_by_name: {},
    attr_drops_by_block_type: {},

    // structural counts
    nested_flatten_inline: 0, // <b><i>X</i></b> → 1 block
    nested_table_collapse_td_to_text: 0,
    text_preserved: 0,
    text_lost: 0,
    input_value_preserved: 0,
    input_value_dropped: 0,

    // 자식 chain count diff per parent element
    children_count_match: 0,
    children_count_mismatch: 0,
  };

  // 최대 sample 캡쳐 수
  const SAMPLE_MAX = 5;
  function pushSample(arr, item) {
    if (arr.length < SAMPLE_MAX) arr.push(item);
  }

  function shortHtml(node, max = 200) {
    if (!node || node.tag === '#root') return '#root';
    if (node.tag === '#text') return JSON.stringify((node.text || '').slice(0, 60));
    let s = `<${node.tag}`;
    for (const [k, v] of Object.entries(node.attrs || {})) {
      s += ` ${k}=${JSON.stringify((v || '').slice(0, 60))}`;
    }
    s += '>';
    if (s.length > max) s = s.slice(0, max - 1) + '…';
    return s;
  }

  // walk: htmlNode 의 element 자식들과 블록 sibling chain 매핑.
  function walk(htmlNode, blockSiblings) {
    const htmlElems = elementChildren(htmlNode);
    const emittable = htmlElems;

    // block 트리 인접한 sibling 시퀀스에서 위치 단위 매칭 (greedy).
    let bi = 0;
    for (const el of emittable) {
      loss.elements_total++;

      // inline 흡수 — 별도 block 없음
      if (isInlineMergedHere(el)) {
        loss.elements_inline_absorbed++;
        // 부모 inline block 의 TEXT 안에 들어 있으면 OK — 카운트만
        continue;
      }
      // 부모가 raw_html fallback 인 경우 자식들은 raw blob 안에 들어 있음
      if (isUnderRawHtmlFallback(el)) {
        loss.elements_under_raw_fallback++;
        continue;
      }

      loss.elements_expected_block++;
      const expectedType = expectedBlockType(el);

      // 매칭 block 찾기 — 현재 위치 bi 부터 expectedType 또는 r20_raw_html
      let matchedBlock = null;
      let matchedIdx = -1;
      // 우선 위치 단위로 잡음: blockSiblings[bi]
      const candidate = blockSiblings[bi];
      if (candidate) {
        if (candidate.blockType === expectedType || candidate.blockType === 'r20_raw_html') {
          matchedBlock = candidate;
          matchedIdx = bi;
          loss.elements_matched_block++;
        } else if (expectedType === null && candidate.blockType === 'r20_raw_html') {
          matchedBlock = candidate;
          matchedIdx = bi;
          loss.elements_matched_block++;
        } else {
          // wrong type — but block at this position exists
          loss.elements_wrong_block_type++;
          pushSample(loss.samples.wrong_block_type, {
            html: shortHtml(el),
            expected: expectedType,
            got: candidate.blockType,
            pos: bi,
          });
          // 그래도 위치 단위로 다음 element 와 짝짓기 위해 advance
          matchedBlock = candidate;
          matchedIdx = bi;
        }
      } else {
        // 위치에 블록이 없음 = missing
        loss.elements_missing_block++;
        pushSample(loss.samples.missing_block, {
          html: shortHtml(el),
          expected: expectedType,
          pos: bi,
        });
        continue;
      }

      bi = matchedIdx + 1;

      if (matchedBlock.blockType === 'r20_raw_html') {
        // raw blob — attribute 비교 의미 없음 (raw 안에 다 들어 있음). 자식도 raw blob 안.
        // count 만
        continue;
      }

      // wrapper element semantic loss — <td/th data-i18n=X>이름</td> 가 r20_i18n_text 가 됨
      // (table cell wrapper 자체가 사라짐 — emit 시 <span data-i18n> 으로 나옴, <td> 손실).
      //
      // P0 #1 fix (56bf050 / a6bef8b): r20_i18n_text 에 TAG 필드 추가.
      // matcher 가 원본 태그를 TAG 에 박고 emit 가 그 태그로 출력 → <td data-i18n>
      // wrapper 가 emit HTML 에 다시 등장. fields.TAG 가 element tag 와 일치하면
      // wrapper 보존된 것으로 카운트. 불일치 / 미설정 시에만 loss.
      if ((el.tag === 'td' || el.tag === 'th' || el.tag === 'p') &&
          matchedBlock.blockType === 'r20_i18n_text') {
        const tagField = (matchedBlock.fields && matchedBlock.fields.TAG) || '';
        if (tagField.toLowerCase() !== el.tag) {
          loss.wrapper_element_lost = (loss.wrapper_element_lost || 0) + 1;
          pushSample(loss.samples.wrapper_lost = loss.samples.wrapper_lost || [], {
            html: shortHtml(el),
            lostWrapper: el.tag,
            block: matchedBlock.blockType,
            tagField,
          });
        }
      }

      // attribute 보존 측정
      const expectedMap = ATTR_FIELD_MAP[matchedBlock.blockType] || {};
      const attrs = el.attrs || {};
      for (const [aname, aval] of Object.entries(attrs)) {
        // sanitize-dropped on* 이벤트 — drop 의도됨, 별도 카운트 안 함
        if (/^on[a-z]+$/i.test(aname)) continue;

        const fieldName = expectedMap[aname];
        if (fieldName === '@implicit') {
          // block-type 자체가 인코딩 (예: type=text → r20_text_input). emit 자동 복원.
          loss.attr_preserved_count++;
          loss.attr_preserved_implicit = (loss.attr_preserved_implicit || 0) + 1;
          continue;
        }
        if (fieldName === '@value_expr') {
          // button.value → valueInputs.EXPR (r20_literal_string.STR)
          const exprBlock = matchedBlock.values && matchedBlock.values.EXPR;
          const got = exprBlock && exprBlock.fields ? (exprBlock.fields.STR || '') : '';
          if (got === aval) {
            loss.attr_preserved_count++;
          } else {
            loss.attr_dropped_count++;
            loss.attr_drops_by_name[aname] = (loss.attr_drops_by_name[aname] || 0) + 1;
            loss.attr_drops_by_block_type[matchedBlock.blockType] =
              (loss.attr_drops_by_block_type[matchedBlock.blockType] || 0) + 1;
          }
          continue;
        }
        if (fieldName) {
          // expected to preserve — check field value
          let fv = matchedBlock.fields[fieldName] || '';
          // strip 처리 — block-type 별 다름.
          // r20_i18n_placeholder / r20_i18n_button: name 을 RAW 로 보존 (attr_ 안 깎음).
          // r20_i18n_placeholder: class 도 RAW (sheet- 안 깎음).
          const blockType = matchedBlock.blockType;
          const namesRawBlocks = new Set(['r20_i18n_placeholder', 'r20_i18n_button']);
          const classRawBlocks = new Set(['r20_i18n_placeholder']);
          let expected = aval;
          if (aname === 'name' && !namesRawBlocks.has(blockType)) {
            expected = expected.replace(/^attr_/, '').replace(/^roll_/, '').replace(/^act_/, '');
          } else if (aname === 'class' && !classRawBlocks.has(blockType)) {
            expected = expected.split(/\s+/).filter(Boolean).map(t => t.replace(/^sheet-/, '')).join(' ');
          }
          if (fv === expected || fv.trim() === expected.trim()) {
            loss.attr_preserved_count++;
          } else if (fv === '' && expected === '') {
            loss.attr_preserved_count++;
          } else if (aname === 'class') {
            // multi-class: 토큰 셋 일치 검사
            const setA = new Set(expected.split(/\s+/).filter(Boolean));
            const setB = new Set(fv.split(/\s+/).filter(Boolean));
            const inter = [...setA].filter(t => setB.has(t)).length;
            if (inter === setA.size && setA.size === setB.size) {
              loss.attr_preserved_count++;
            } else if (inter < setA.size) {
              // 손실: 일부 class 토큰 누락
              loss.attr_dropped_count++;
              loss.attr_drops_by_name[aname] = (loss.attr_drops_by_name[aname] || 0) + 1;
              loss.attr_drops_by_block_type[matchedBlock.blockType] =
                (loss.attr_drops_by_block_type[matchedBlock.blockType] || 0) + 1;
              pushSample(loss.samples.multi_class_lost, {
                html: shortHtml(el),
                expectedClass: expected,
                gotClass: fv,
                block: matchedBlock.blockType,
              });
            } else {
              loss.attr_preserved_count++;
            }
          } else {
            // 값 mismatch — drop 으로 카운트
            loss.attr_dropped_count++;
            loss.attr_drops_by_name[aname] = (loss.attr_drops_by_name[aname] || 0) + 1;
            loss.attr_drops_by_block_type[matchedBlock.blockType] =
              (loss.attr_drops_by_block_type[matchedBlock.blockType] || 0) + 1;
            if (aname === 'value') {
              loss.input_value_dropped++;
              pushSample(loss.samples.input_value_dropped, {
                html: shortHtml(el), expected, got: fv, block: matchedBlock.blockType,
              });
            }
          }
        } else {
          // 해당 block 에 이 attribute 를 받을 field 가 없음 — drop 확정
          loss.attr_dropped_count++;
          loss.attr_drops_by_name[aname] = (loss.attr_drops_by_name[aname] || 0) + 1;
          loss.attr_drops_by_block_type[matchedBlock.blockType] =
            (loss.attr_drops_by_block_type[matchedBlock.blockType] || 0) + 1;
          if (aname === 'style') {
            pushSample(loss.samples.attr_drop_style, {
              html: shortHtml(el), styleVal: aval.slice(0, 100), block: matchedBlock.blockType,
            });
          } else if (aname === 'id') {
            pushSample(loss.samples.attr_drop_id, {
              html: shortHtml(el), idVal: aval, block: matchedBlock.blockType,
            });
          } else if (aname === 'colspan' || aname === 'rowspan') {
            pushSample(loss.samples.attr_drop_colspan_rowspan, {
              html: shortHtml(el), attr: aname, val: aval, block: matchedBlock.blockType,
            });
          } else if (['title','align','valign','width','height','tabindex','role','placeholder','maxlength','pattern','readonly','disabled','multiple','size','wrap'].includes(aname)) {
            pushSample(loss.samples.attr_drop_title_misc, {
              html: shortHtml(el), attr: aname, val: (aval || '').slice(0, 60), block: matchedBlock.blockType,
            });
          }
        }
      }

      // value 보존 카운트 (input/select/textarea/button)
      if (['input','option','textarea','button'].includes(el.tag)) {
        const v = (attrs.value || '');
        if (v) {
          // 우리 매핑이 보존했는지 (위 attribute 루프 결과로 처리됨) — extra count
          const f = ATTR_FIELD_MAP[matchedBlock.blockType] || {};
          if (f.value) {
            const fv = matchedBlock.fields[f.value] || '';
            if (fv === v) loss.input_value_preserved++;
            // dropped 는 위 루프에서 카운트
          } else {
            // value 자체를 받을 field 가 없음
            // 이미 위에서 drop 으로 카운트됨
          }
        }
      }

      // text content 보존
      const textChild = (el.children || []).find(c => c.tag === '#text');
      if (textChild) {
        const tc = textContent(el).replace(/\s+/g, ' ').trim();
        if (tc) {
          let textInBlock = false;
          for (const fv of Object.values(matchedBlock.fields)) {
            if (typeof fv === 'string' && fv.includes(tc)) { textInBlock = true; break; }
          }
          if (textInBlock) loss.text_preserved++;
          else {
            // 자식 block 에 들어 있을 수도 있음 — recursive 비교 시 잡힘
            // 일단 보수적으로 lost 마킹 안 함
          }
        }
      }

      // 자식 비교 — CONTENT 또는 OPTIONS / ROWS 슬롯 매칭
      const htmlChildElems = elementChildren(el);
      let blockChildChain = matchedBlock.statements['CONTENT'] || [];

      // 특수: select/optgroup → OPTIONS, rolltemplate → ROWS
      if (matchedBlock.blockType === 'r20_select' || matchedBlock.blockType === 'r20_optgroup') {
        const opts = matchedBlock.statements['OPTIONS'] || [];
        const optElems = htmlChildElems.filter(c =>
          c.tag === 'option' || (matchedBlock.blockType === 'r20_select' && c.tag === 'optgroup'));
        if (opts.length !== optElems.length) {
          loss.children_count_mismatch++;
        } else {
          loss.children_count_match++;
        }
        walk(el, opts);
        continue;
      }
      if (matchedBlock.blockType === 'r20_rolltemplate_define') {
        blockChildChain = matchedBlock.statements['ROWS'] || [];
      }
      if (matchedBlock.blockType === 'r20_repeating_section' || matchedBlock.blockType === 'r20_fieldset') {
        blockChildChain = matchedBlock.statements['CONTENT'] || [];
      }

      // children count 비교 — emittable 자식 (inline-absorb 제외) 만 카운트
      const emittableChildCount = htmlChildElems.filter(c => {
        if (htmlNode.tag === 'select' && c.tag === 'option') return false;
        if (isInlineMergedHere(c)) return false;
        return true;
      }).length;

      // emit 가 inline 흡수한 inline 텍스트는 children 으로 안 나타남 — 그건 OK
      // 흡수가 아니라 그냥 inline 매칭 (r20_inline_bold 같은) 인 경우엔 block 으로 나타남
      // inline-bold/italic 의 자식들은 흡수됨 (TEXT 한 줄로 합쳐짐)

      if (['r20_inline_bold','r20_inline_italic','r20_static_text','r20_label'].includes(matchedBlock.blockType)) {
        // 자식 모두 흡수 — children chain 비교 의미 X
        if (htmlChildElems.some(c => !INLINE_TAGS.has(c.tag) && c.tag !== '#text')) {
          // 흡수 못 할 자식 있는데 흡수된 케이스 — 의미 손실
          loss.nested_flatten_inline++;
          pushSample(loss.samples.nested_flattened, {
            html: shortHtml(el),
            block: matchedBlock.blockType,
            note: 'inline 흡수 but non-inline 자식 있음 → text 합침',
          });
        }
        continue;
      }

      if (matchedBlock.blockType === 'r20_i18n_text' ||
          matchedBlock.blockType === 'r20_i18n_html' ||
          matchedBlock.blockType === 'r20_i18n_placeholder' ||
          matchedBlock.blockType === 'r20_heading' ||
          matchedBlock.blockType === 'r20_table_caption' ||
          matchedBlock.blockType === 'r20_disabled_text' ||
          matchedBlock.blockType === 'r20_i18n_button' ||
          matchedBlock.blockType === 'r20_i18n_legend' ||
          matchedBlock.blockType === 'r20_i18n_title' ||
          matchedBlock.blockType === 'r20_i18n_aria_label') {
        // text-only 매칭 — 자식 element 다 평탄화됨
        const childElems = htmlChildElems.filter(c => !c.tag.startsWith('#'));
        if (childElems.length > 0) {
          // <td data-i18n="X">내부에 다른 element 가 있는 케이스
          loss.nested_table_collapse_td_to_text++;
          pushSample(loss.samples.nested_flattened, {
            html: shortHtml(el),
            block: matchedBlock.blockType,
            childCount: childElems.length,
            note: 'i18n/text 블록인데 자식 element 가 평탄화됨',
          });
        }
        continue;
      }

      // 일반 container — children chain 비교
      const expectedChildCount = emittableChildCount;
      const actualChildCount = blockChildChain.length;
      if (expectedChildCount === actualChildCount) {
        loss.children_count_match++;
      } else {
        loss.children_count_mismatch++;
        pushSample(loss.samples.sibling_order_diverged, {
          html: shortHtml(el),
          block: matchedBlock.blockType,
          expectedKids: expectedChildCount,
          actualKids: actualChildCount,
        });
      }

      walk(el, blockChildChain);
    }
  }

  walk(rootHtml, rootBlocks);
  return loss;
}

// ---------------------------------------------------------------------------
// Main.
// ---------------------------------------------------------------------------

const workDir = process.argv[2];
if (!workDir) {
  console.error('Usage: node scripts/structural_verify.mjs <working_dir>');
  process.exit(1);
}
const dir = resolve(workDir);
const html = readFileSync(join(dir, 'original.html'), 'utf8');
const xml = readFileSync(join(dir, 'emit_html.xml'), 'utf8');

const htmlRoot = parseHtml(html);
const xmlRoot = parseXml(xml);

// flat counts (for sanity)
function countHtmlElems(node) {
  let c = 0;
  if (!node.tag.startsWith('#') && node.tag !== '#root') c++;
  for (const ch of node.children) c += countHtmlElems(ch);
  return c;
}
function countBlocks(b) {
  let c = 1;
  for (const chain of Object.values(b.statements || {})) {
    for (const sb of chain) c += countBlocks(sb);
  }
  for (const vb of Object.values(b.values || {})) {
    if (vb) c += countBlocks(vb);
  }
  return c;
}
let totalBlocks = 0;
for (const top of xmlRoot.children) totalBlocks += countBlocks(top);

const htmlElems = countHtmlElems(htmlRoot);

const loss = compare(htmlRoot, xmlRoot.children);

const result = {
  meta: {
    html_file: 'original.html',
    xml_file: 'emit_html.xml',
    html_elements: htmlElems,
    block_count: totalBlocks,
  },
  loss,
  derived: {
    block_match_pct: loss.elements_expected_block === 0 ? 0 :
      Math.round((loss.elements_matched_block * 1000) / loss.elements_expected_block) / 10,
    attribute_preservation_pct: (loss.attr_preserved_count + loss.attr_dropped_count) === 0 ? 0 :
      Math.round((loss.attr_preserved_count * 1000) / (loss.attr_preserved_count + loss.attr_dropped_count)) / 10,
    children_count_match_pct: (loss.children_count_match + loss.children_count_mismatch) === 0 ? 0 :
      Math.round((loss.children_count_match * 1000) / (loss.children_count_match + loss.children_count_mismatch)) / 10,
  },
};

console.log(JSON.stringify(result, null, 2));
