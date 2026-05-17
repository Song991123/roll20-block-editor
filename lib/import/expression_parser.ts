/**
 * Expression-level token parser — `@{...}` / `--var` 같은 텍스트 토큰을
 * 적절한 카탈로그 블록으로 변환.
 *
 * Anchor:
 *   - docs/spec/23_high_priority_blocks.md §5 (r20_attr_ref SCOPE 옵션)
 *   - lib/blocks/expression.ts (r20_attr_ref / r20_attr_ref_max / r20_attr_ref_qualified)
 *
 * 본 모듈은 emit 측 출력 텍스트(roll button EXPR / rolltemplate 등) 안의
 * `@{...}` 토큰을 import 단에서 카탈로그 블록으로 되돌리는 round-trip 보조.
 *
 * 단일 token 이 전체 텍스트인 케이스만 분해 — 복합 표현식 (`@{x}+@{y}`) 은
 * 손실 없는 매처가 없으므로 호출 측에서 raw_string fallback 유지.
 *
 * 시스템 specific 토큰 0.
 */
import type { MatchedBlock } from './block_matcher';

/**
 * 입력 텍스트가 단일 `@{...}` 토큰이면 r20_attr_ref / r20_attr_ref_max 로 변환.
 * 인식 패턴 (모두 단일 토큰, 앞뒤 whitespace 만 허용):
 *   1. `@{character_id}` → SCOPE=character_id
 *   2. `@{selected|NAME}` → SCOPE=selected NAME=NAME
 *   3. `@{target|NAME}` → SCOPE=target NAME=NAME
 *   4. `@{NAME|max}` → r20_attr_ref_max NAME=NAME
 *   5. `@{NAME}` → SCOPE=self NAME=NAME
 *
 * 패턴이 아니면 null 반환. 매칭된 NAME 은 영시영/일반 attr 식별자 허용
 * 문자만 (`[\w-]+`).
 */
export function parseAttrRefToken(text: string): MatchedBlock | null {
  if (!text) return null;
  const t = text.trim();
  if (!t) return null;
  // 단일 토큰 — `@{...}` 한 번만 등장 + 외곽 다른 문자 없음.
  const m = /^@\{([^}]+)\}$/.exec(t);
  if (!m) return null;
  const inner = m[1];

  // 1) character_id
  if (inner === 'character_id') {
    return {
      blockType: 'r20_attr_ref',
      fields: { SCOPE: 'character_id', NAME: '' },
      children: {},
    };
  }

  // 2/3) selected|NAME / target|NAME — SCOPE prefix.
  const pipeIdx = inner.indexOf('|');
  if (pipeIdx > 0) {
    const head = inner.slice(0, pipeIdx);
    const tail = inner.slice(pipeIdx + 1);
    if (!head || !tail) return null;
    // 4) NAME|max
    if (tail === 'max') {
      if (!/^[\w-]+$/.test(head)) return null;
      return {
        blockType: 'r20_attr_ref_max',
        fields: { NAME: head },
        children: {},
      };
    }
    if (head === 'selected' || head === 'target') {
      if (!/^[\w-]+$/.test(tail)) return null;
      return {
        blockType: 'r20_attr_ref',
        fields: { SCOPE: head, NAME: tail },
        children: {},
      };
    }
    // 다른 pipe 패턴 — 보존 안 함 → 호출 측 raw 유지.
    return null;
  }

  // 5) self — `@{NAME}` (NAME 식별자 외 문자 있으면 raw 유지).
  if (!/^[\w-]+$/.test(inner)) return null;
  return {
    blockType: 'r20_attr_ref',
    fields: { SCOPE: 'self', NAME: inner },
    children: {},
  };
}
