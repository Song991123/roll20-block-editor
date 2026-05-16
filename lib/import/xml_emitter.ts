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
 * Top-level chain → 단일 stream.
 *
 * v1 (518ad63): 모든 top-level 블록을 단일 `<next>` 체인으로 묶음 →
 *   N >= ~3K 시 emitChainedBlock 재귀로 V8 stack overflow.
 * v2 (regression fix): top-level 들은 별개 `<block>` 으로 직렬화 — comment 가
 *   원래 의도였던 그대로. Blockly 가 import 시 자동 chain 안 함 → 워크스페이스
 *   상 top-level 로 N 개 그대로 박힘. (이게 영시영 1부 import 의 의도된 동작.)
 *   `<next>` 안 쓰면 emit 도 재귀 안 함 → 6000+ 블록도 stack-safe.
 *
 * 일반화: 시트 size N 에 무관하게 안전 (system-specific 토큰 0).
 */
export function emitWorkspaceXml(top: MatchedBlock[]): string {
  if (!top.length) {
    return `<xml xmlns="${XML_NS}"></xml>`;
  }
  const buf: string[] = [];
  buf.push(`<xml xmlns="${XML_NS}">`);
  // 각 top-level block 을 별개 `<block>` 으로 — chain 안 함. (loop 으로 평탄.)
  for (let i = 0; i < top.length; i += 1) {
    const xy = i === 0 ? ` x="20" y="20"` : ''; // 첫 블록만 좌표 — 나머지는 Blockly 자동 배치.
    buf.push(emitSingleBlock(top[i], xy));
  }
  buf.push('</xml>');
  return buf.join('');
}

/**
 * 단일 block 직렬화 — `<next>` 체인은 사용 안 함 (top-level 평탄화).
 * value / statement 안의 child block 은 여전히 재귀하지만, 그 depth 는 시트 구조
 * 상 작음 (영시영 1부 최대 depth ~ 10). 사용자 시트 specific 가정 0.
 */
function emitSingleBlock(b: MatchedBlock, topAttrs: string = ''): string {
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

  // value inputs — 단일 inner block.
  for (const [name, inner] of Object.entries(b.valueInputs ?? {})) {
    buf.push(`<value name="${escapeAttr(name)}">${emitSingleBlock(inner)}</value>`);
  }

  // statement inputs — child chain. 여기는 `<next>` 사용 (statement 의미상 chain).
  // 단, 재귀가 아닌 iterative 로 풀어서 deep statement 도 stack-safe.
  for (const [name, children] of Object.entries(b.children ?? {})) {
    if (!children || !children.length) continue;
    buf.push(`<statement name="${escapeAttr(name)}">`);
    buf.push(emitStatementChain(children));
    buf.push(`</statement>`);
  }

  buf.push(`</block>`);
  return buf.join('');
}

/**
 * Statement 안 child chain — 첫 블록 외엔 `<next>` 안에 감쌈.
 * 재귀 대신 iterative 로 build → chain 길이 무관하게 stack-safe.
 */
function emitStatementChain(chain: MatchedBlock[]): string {
  if (!chain.length) return '';
  const opens: string[] = [];
  const closes: string[] = [];
  for (let i = 0; i < chain.length; i += 1) {
    opens.push(emitBlockOpenAndBody(chain[i]));
    if (i + 1 < chain.length) {
      opens.push(`<next>`);
      closes.push(`</next>`);
    }
    closes.push(`</block>`);
  }
  // closes 는 역순으로 닫음 (마지막 block 부터 닫고 그 위 next, 그 위 block...)
  closes.reverse();
  return opens.join('') + closes.join('');
}

/**
 * `<block type=...>` open 태그 + 내부 fields/value/statement (단, `</block>` 은
 * 닫지 않음 — emitStatementChain 이 chain 끝에서 한꺼번에 닫음).
 */
function emitBlockOpenAndBody(b: MatchedBlock): string {
  const buf: string[] = [];
  buf.push(`<block type="${escapeAttr(b.blockType)}">`);
  if (b.blockType === 'r20_raw_html' && b.raw && !b.fields.HTML) {
    buf.push(`<field name="HTML">${escapeText(b.raw)}</field>`);
  } else {
    for (const [name, value] of Object.entries(b.fields ?? {})) {
      if (value == null) continue;
      buf.push(`<field name="${escapeAttr(name)}">${escapeText(String(value))}</field>`);
    }
  }
  for (const [name, inner] of Object.entries(b.valueInputs ?? {})) {
    buf.push(`<value name="${escapeAttr(name)}">${emitSingleBlock(inner)}</value>`);
  }
  for (const [name, children] of Object.entries(b.children ?? {})) {
    if (!children || !children.length) continue;
    buf.push(`<statement name="${escapeAttr(name)}">`);
    buf.push(emitStatementChain(children));
    buf.push(`</statement>`);
  }
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
