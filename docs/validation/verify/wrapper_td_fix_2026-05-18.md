# Wrapper td/th 보존 P0 #1 — fix 검증 (2026-05-18)

## 배경

`docs/validation/verify/yshy_1bu_structural.md` §5: 영시영 1부에서 593 `<td data-i18n>` + 7 `<th data-i18n>` = **600 wrapper element** 가 emit 시 `<span data-i18n>` 으로 평탄화 → `<tr>` 안 직속 span → 표 행 깨짐. 모든 표 사용 시트 (CoC / D&D / 인세인 / 영시영 등) 공통 문제.

## Fix 위치

이미 commit `56bf050` ("fix(emit): preserve multi-class + table tag") 에 적용 완료:

1. `lib/import/block_matcher.ts` matchI18n: `<td data-i18n>` / `<th data-i18n>` 매칭 시 TAG 필드에 원본 태그 저장 ('td' 또는 'th').
2. `lib/blocks/i18n.ts` r20_i18n_text: TAG 필드 + `pickI18nTextTag` — 허용 태그 (span/div/label/strong/b/em/small/p/td/th) 만 통과, 나머지는 'span' fallback (backwards-compat).

본 round 추가:
3. `lib/import/__tests__/wrapper_td_preserve.test.ts` — 11 케이스 회귀 테스트.
4. `scripts/structural_verify.mjs` — wrapper loss 카운터가 TAG 필드 일치 시 보존된 것으로 인식하도록 보완.

## 검증 결과 (영시영 1부)

`node scripts/structural_verify.mjs docs/validation/working/yshy_part1`

| 메트릭 | 이전 보고 (`yshy_1bu_structural.md`) | 현 측정 (2026-05-18 fresh emit) |
|---|---:|---:|
| `wrapper_element_lost` | **600** | **0** |
| `block_match_pct` | 100% | 100% |
| `attribute_preservation_pct` | 80.8% | **86.9%** (style + class fix 동시 반영) |
| `attr_dropped_count` | 1899 | 1292 |
| `children_count_match_pct` | 100% | 100% |
| `text_preserved` / `text_lost` | 1078 / 0 | 1077 / 0 |

`wrapper_element_lost`: **600 → 0**. P0 #1 해결.

## 단위 테스트

`tsx lib/import/__tests__/wrapper_td_preserve.test.ts`

- `<td data-i18n> → TAG=td` ✓
- `<th data-i18n> → TAG=th` ✓
- `<span data-i18n> → TAG=span` (fallback) ✓
- `<div data-i18n> → TAG=div` ✓
- `<label data-i18n> → TAG=label` ✓
- `<tr><td data-i18n><td><input>` mixed structure ✓
- nested thead/tbody/tr with th+td data-i18n ✓
- 능력치 표 (3 stat rows) ✓
- `<td class="X Y" data-i18n>` multi-class ✓
- `<td data-i18n style="...">` STYLE 필드 보존 ✓
- `repeating_section` 안 `<td data-i18n>` ✓

**11/11 PASS**.

기존 `lib/blocks/__tests__/table_multiclass.test.ts` 8/8 PASS (회귀 0).

## 작은 sample 라이브 검증

입력:
```html
<table><tbody><tr>
  <td data-i18n="@x">label</td>
  <td><input type="text" name="attr_val"></td>
</tr></tbody></table>
```

import 결과 block types:
```
r20_table > r20_tbody > r20_tr > [
  r20_i18n_text (TAG=td, KEY=@x, DEFAULT=label),
  r20_td > r20_text_input (NAME=val)
]
```

→ emit (Blockly generator) 가 `pickI18nTextTag('td') = 'td'` 로 `<td data-i18n="@x">label</td>` 출력. `<tr>` 안 직속 자식이 `<td>` 로 유지 → 표 행 깨짐 없음.

## 못 한 거 (솔직히)

- **emit→HTML 의 byte-identical round-trip 측정**: 환경 제약 (Blockly DOM runtime 필요) — 본 round 은 import 차원 검증만. table_multiclass.test.ts 의 D&D 5e 시뮬레이션은 별도 측정.
- **시각 bbox screenshot**: Chrome MCP 없는 환경. 사용자 측 미리보기로 확인 권유.
- **2부 / 3부 측정**: 본 round 은 1부만. 영시영 2/3부 도 동일 markup pattern 이므로 동일 fix 효과 예상 (영시영 hardcoding 0 — generic 적용).
