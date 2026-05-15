/**
 * MatchedBlock 트리 → Blockly XML 직렬화.
 *
 * Anchor:
 *   - docs/spec/10_system_architecture.md §3.3 (Blockly hydrate 입력 포맷)
 *   - public/examples/dnd5e/dnd5e.xml (참고 XML 형식)
 *
 * 출력 XML 형식:
 *   <xml xmlns="https://developers.google.com/blockly/xml">
 *     <block type="...">
 *       <field name="...">...</field>
 *       <statement name="CONTENT">
 *         <block type="..."> ... </block>
 *       </statement>
 *       <next>
 *         <block type="..."> ... </block>
 *       </next>
 *     </block>
 *   </xml>
 *
 * 시스템 specific 토큰 0.
 */

import type { MatchedBlock } from './block_matcher';

const XML_NS = 'https://developers.google.com/blockly/xml';

/**
 * Top-level chain → 단일 stream. 첫 블록은 top-level block,
 * 나머지는 `<next>` chain 으로 묶임.
 */
export function emitWorkspaceXml(top: MatchedBlock[]): string {
  if (!top.length) {
    return `<xml xmlns="${XML_NS}"></xml>`;
  }
  const buf: string[] = [];
  buf.push(`<xml xmlns="${XML_NS}">`);
  // 모든 top-level block 을 별개 stack 으로 둔다 (chain 으로 묶지 않음 — UI 가 자동 chain).
  // 단, 첫 top-level 블록 안의 자식 chain 은 emitBlock 이 처리.
  buf.push(emitTopBlock(top, 20, 20));
  buf.push('</xml>');
  return buf.join('');
}

function emitTopBlock(chain: MatchedBlock[], x: number, y: number): string {
  if (!chain.length) return '';
  return emitChainedBlock(chain, 0, ` x="${x}" y="${y}"`);
}

/**
 * 단일 block 직렬화. chain[i] 이 본 block, chain[i+1..] 은 next chain.
 */
function emitChainedBlock(chain: MatchedBlock[], i: number, topAttrs: string = ''): string {
  const b = chain[i];
  if (!b) return '';
  const buf: string[] = [];
  buf.push(`<block type="${escapeAttr(b.blockType)}"${topAttrs}>`);

  // raw_html 의 경우 HTML 필드만 박고 끝.
  if (b.blockType === 'r20_raw_html' && b.raw && !b.fields.HTML) {
    buf.push(`<field name="HTML">${escapeText(b.raw)}</field>`);
  } else {
    for (const [name, value] of Object.entries(b.fields ?? {})) {
      if (value == null) continue;
      buf.push(`<field name="${escapeAttr(name)}">${escapeText(String(value))}</field>`);
    }
  }

  // value inputs
  for (const [name, inner] of Object.entries(b.valueInputs ?? {})) {
    buf.push(`<value name="${escapeAttr(name)}">${emitChainedBlock([inner], 0)}</value>`);
  }

  // statement inputs
  for (const [name, children] of Object.entries(b.children ?? {})) {
    if (!children || !children.length) continue;
    buf.push(`<statement name="${escapeAttr(name)}">`);
    buf.push(emitChainedBlock(children, 0));
    buf.push(`</statement>`);
  }

  // next chain
  if (i + 1 < chain.length) {
    buf.push(`<next>`);
    buf.push(emitChainedBlock(chain, i + 1));
    buf.push(`</next>`);
  }

  buf.push(`</block>`);
  return buf.join('');
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
function escapeText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
