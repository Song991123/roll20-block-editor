# 26. Composite blocks — atomic 폭주 완화 + 일반 시트 호환 (Phase 1)

> **목적**: 대형 커스텀 시트를 import 하면 atomic 블록 수가 수천 단위로
> 부풀어 renderer 가 freeze 되는 문제 (referred to "9093 inflation") 를
> 구조적으로 해결한다.
> **방법**: 자주 반복되는 atomic 패턴 (능력치 카드, 스킬 행, 반복 섹션 ...) 을
> "composite block" 으로 묶어 1 단위로 인식 + emit. 동일 HTML 을 atomic
> 풀어쓰기와 100 % round-trip 동등하게 유지.
> **소비자**: import pipeline (`lib/import/composite_matcher.ts`) + emit
> generator (`lib/blocks/composite_*.ts`).
> **범위**: Phase 1 = `r20_attribute_card` 1 종. Phase 2~3 = skill_row /
> repeating_section_wrapper / dot_tracker / pbta_move (backlog).

본 문서는 기존 atomic 블록 카탈로그를 그대로 두고 그 위에 합성 layer 1개를
얹는다. atomic 카탈로그 수정 0 — 기존 import / emit / round-trip 회귀 0
보장.

---

## §1 왜 composite 가 필요한가

### 1.1 측정된 inflation

영시영 1부 (732 KB HTML, CoC 7e 변형) import 시:

| layer | 블록 수 | 비고 |
|---|---:|---|
| atomic only (현재) | ~9,093 | renderer freeze. 사용자 분노. |
| `r20_td` 단독 | 2,289 | 33 % — 표 셀이 1:1 atomic 인 한 줄지 못함 |
| `r20_roll_button` + `r20_literal_string` (1:1 짝) | 808 + 808 | 같은 짝 1,616 블록 |
| `r20_checkbox` (스킬 토글) | 427 | 거의 모든 스킬 행에 동일 |
| `r20_i18n_text` (label) | 874 | 거의 모든 label/cell |

`docs/validation/working/yshy_part1/html_blocks_dist.json` 의 distribution +
사용자 보고. 정확 9093 은 worker block 포함값.

### 1.2 사용자 관점 문제

- **renderer freeze** — Blockly 가 1000+ 블록 동시 인스턴스화하면 main thread
  blocking. 영시영 외 어떤 커스텀 시트도 동일.
- **편집 부담** — 능력치 1 개 = atomic 9 개 (td×3 + i18n + input + button×2
  + literal×2). 능력치 수정하려면 9 블록을 정확히 찾아야 함. UX 0.
- **공식 시트 호환** — 동일 패턴이 D&D 5e / CoC / 인세인 / PbtA 거의 모든
  시트에 반복. 한 번 묶으면 모든 시트가 같은 혜택.

### 1.3 atomic 보존 원칙

composite 는 atomic 의 **wrapper** 일 뿐. emit 시:
- composite block → 동등한 HTML (atomic 펼침과 글자 단위 동일)
- HTML → composite matcher 가 atomic chain 을 인식 → composite 1 개로 packing
- composite 를 atomic 으로 "ungroup" 가능 (사용자가 분해하고 싶을 때).

→ atomic 카탈로그 / matcher / emitter 모두 무변경.

---

## §2 Phase 1~3 candidate matrix

영시영 1부 + 공식 시트 (`docs/spec/20_official_sheet_patterns.md`,
`21_official_sheet_phase2.md`) 의 빈도 cross-reference.

| # | type | priority | 시각 영향 | 시스템 보편성 | atomic / composite ratio | Phase |
|---|---|---|---|---|---:|---|
| 1 | `r20_attribute_card` | **P0** | 높음 | D&D 5e STR/DEX/CON/...×6, CoC×8, 거의 모든 시스템에 능력치 카드 | ~9:1 | **Phase 1** |
| 2 | `r20_skill_row` | **P0** | 매우 높음 | CoC 50 + 영시영 100 + 인세인 / PbtA `<tr>` 행 패턴 | ~12:1 | Phase 2 |
| 3 | `r20_repeating_section_wrapper` | **P0** | 중간 | `<fieldset class="repeating_X">` 거의 전 시스템 (19/20 — `docs/spec/20` §3) | ~5:1 (header + thead/tbody 묶음) | Phase 2 |
| 4 | `r20_dot_tracker` | P1 | 높음 | WoD / CoD / BitD dot UI (라디오 N 펼침) | ~N:1 (N=4~10) | Phase 3 |
| 5 | `r20_pbta_move` | P1 | 높음 | MotW 1128, Dungeon World, Apocalypse Keys ... | ~7:1 | Phase 3 |
| 6 | `r20_page_tabs` | P2 | 중간 | DnD 5e / CoD / Fate / M&M / Forbidden Lands tab nav | ~(2N+1):1 | backlog |
| 7 | `r20_clock_tracker` | P2 | 낮음 | BitD FitD family 전용 | ~4~8:1 | backlog |

본 phase 는 (1) `r20_attribute_card` 만 first cut. (2~3) 은 같은 frame 으로
후속 (별도 commit).

---

## §3 `r20_attribute_card` — Phase 1

### 3.1 정의

능력치 1 개 = (label) + (현재값 input) + (선택적 최대값 input) + (굴림 버튼)
+ (i18n key) 의 합성 단위.

| field | type | 예 (CoC STR) | 비고 |
|---|---|---|---|
| `LABEL` | text | "근력" | UI 표시. composite block 위의 라벨 텍스트. |
| `I18N_KEY` | text | "STR-u" | `data-i18n` 키 (label 의 다국어). 비면 i18n 노드 미emit. |
| `ATTR_NAME` | text | "str" | `attr_str` 의 base. `attr_` prefix 는 emit 시 자동 추가. |
| `CURRENT_VALUE` | text | "50" | `<input>` 의 value 기본값. |
| `MAX_VALUE` | text | "" | 비면 max 칸 미emit. (CoC 처럼 max 없는 시스템 호환.) |
| `ROLL_BUTTON_NAME` | text | "str_check" | `roll_NAME`. 비면 roll button 미emit. |
| `ROLL_EXPR` | text | "&{template:coc} ..." | roll button value. matcher 가 원본 expression 보존. |
| `INPUT_CLASS` | text | "attr-input" | input 의 추가 class (matcher 보존). |
| `LABEL_CLASS` | text | "attr-label" | label wrapper 의 추가 class. |

### 3.2 emit HTML 구조

```html
<td class="attr-label LABEL_CLASS"><strong data-i18n="I18N_KEY">LABEL</strong></td>
<td><input class="attr-input INPUT_CLASS" type="text" name="attr_ATTR_NAME" value="CURRENT_VALUE"/></td>
<!-- MAX_VALUE 있으면 -->
<td><input class="attr-max" type="text" name="attr_ATTR_NAME_max" value="MAX_VALUE"/></td>
<!-- ROLL_BUTTON_NAME 있으면 -->
<td class="attr-roll"><button type="roll" name="roll_ROLL_BUTTON_NAME" value="ROLL_EXPR"></button></td>
```

— atomic 펼침 (`r20_td` + `r20_i18n_text` + `r20_text_input` + `r20_roll_button`
+ `r20_literal_string`) 의 결과 HTML 과 글자 단위 동일.

### 3.3 round-trip 정합성

1. **composite emit → atomic re-import**
   - composite 가 emit 한 HTML 을 다시 importer 에 통과시키면 atomic chain
     으로 풀린다. (composite matcher off 인 경우 fallback.)
2. **composite emit → composite re-import**
   - composite matcher 가 같은 atomic chain 을 인식 → composite 1 개로
     packing.
3. **composite 출력 ≡ atomic chain 출력**
   - 같은 input 으로 두 경로의 HTML 이 byte 단위 동일해야 함. test 강제.

### 3.4 sanity rules (V8 — 새 블록 4 step)

| step | 적용 |
|---|---|
| 카탈로그 정의 | `lib/blocks/composite_attribute_card.ts` — Phase 1 commit |
| import matcher | `lib/import/composite_matcher.ts` — packing layer |
| emit 룰 | composite 자체 generator + atomic 펼침과 결과 동등 |
| 회귀 테스트 | `lib/blocks/__tests__/composite_attribute_card.test.ts` + `lib/import/__tests__/composite_matcher.test.ts` — Phase 1 commit |

---

## §4 import packing — composite matcher algorithm

### 4.1 layered 구조

atomic matcher (`lib/import/block_matcher.ts`) 는 **그대로**. 그 위에 후처리
layer 를 둔다:

```
parseHtml(html)
  → matchTree(root) : MatchedBlock[]          # atomic chain (현재)
  → packComposites(chain): MatchedBlock[]      # 신규 — chain 안 연속 atomic 묶음을 composite 1 개로 치환
  → emitWorkspaceXml(chain)
```

`packComposites` 는 chain 을 한 번 traverse 하면서 window 패턴 매칭. 매칭 안
되면 atomic 그대로 유지. 즉 `packComposites` 가 fail-safe — atomic 카탈로그
+ matcher 동작 100 % 보존.

### 4.2 attribute card pattern 인식

영시영 1부 의 능력치 카드 atomic 시퀀스 (1 행 안 td chain):

```
r20_td [class=attr-label]  ← children: r20_inline_bold {TEXT:"근력", CLASS:""} or r20_i18n_text {KEY:"STR-u", DEFAULT:"근력"}
r20_td [class=""]          ← children: r20_text_input {NAME:"str", CLASS:"attr-input", DEFAULT:"50"}
r20_td [class=attr-roll]   ← children: r20_roll_button {NAME:"str_check"} + literal EXPR
```

matcher 알고리즘 (window-based):

```ts
function tryMatchAttributeCard(chain, idx): { matched: boolean; consumed: number; pack: MatchedBlock | null } {
  // window: idx ~ idx+N, N ∈ {2, 3, 4}.
  // 모든 entry 가 r20_td 일 것. (단순 chain — repeating section 안일 수도 있고 일반 tr 안일 수도 있음.)
  // 1) label td: children 가 정확히 1개, type 이 r20_inline_bold | r20_i18n_text | r20_static_text 면 LABEL.
  // 2) input td: children 가 정확히 1개, type 이 r20_text_input | r20_number_input 면 CURRENT.
  // 3) (선택) input td: 같은 input 패턴 + name 이 *_max 면 MAX.
  // 4) (선택) roll td: children 가 1개, type 이 r20_roll_button 면 ROLL.
  //
  // 4 항목 다 부합하면 r20_attribute_card 로 packing.
  // 부합 안 하면 idx + 1 로 진행 (이 window 는 atomic 유지).
}

function packComposites(chain: MatchedBlock[]): MatchedBlock[] {
  // chain 자신 + 자식 chain (재귀) 모두 시도.
  // attribute card 외 후속 composite 도 같은 dispatcher 에 추가.
}
```

### 4.3 보수적 매칭 — 의심스러우면 atomic 유지

- 사용자가 능력치 카드를 직접 편집해서 td 갯수 / class / name 패턴을 바꿨다면
  matcher 가 인식 못 함. atomic chain 으로 fallback. **never 사용자 데이터
  파손**.
- name 패턴은 매우 보수적 — "label td 의 i18n KEY 와 input td 의 NAME 사이의
  prefix 가 부합" 같은 정합성 조건 강제. 다른 시스템 시트에서 우연 매칭 안
  되도록.

### 4.4 inflation 예상

영시영 1부 8 능력치 × atomic 7~9 = ~64 atomic. Phase 1 적용 후 → 8 composite.
**약 56 block 감소.**

스킬 행 (Phase 2): 50 ~ 100 행 × atomic 12 ≈ 600 ~ 1200 atomic → 50 ~ 100
composite. **~550 ~ 1100 block 감소.**

repeating section wrapper (Phase 2): 12 × atomic 5 ≈ 60 atomic → 12 composite.
**48 block 감소.**

dot tracker / pbta move (Phase 3, 영시영 비해당) — 영시영 1부 의 9093 → ~1500
은 Phase 1 + 2 만으로는 부족. Phase 3 + matcher fine-tuning 이 필요.

본 Phase 1 commit 의 측정 목표: **8 atomic 감소** (sanity check), composite
matcher pipeline 정상 동작 입증.

---

## §5 generic 시트 호환 강조

- composite block 의 모든 field 는 `LABEL` / `ATTR_NAME` / `ROLL_EXPR` 등
  **general parameter**. 영시영 / D&D 5e / PbtA / CoC 무엇이든 같은 schema.
- matcher 의 인식 조건은 HTML 구조 + 표준 Roll20 idiom (`attr_X` /
  `data-i18n="KEY"` / `type="roll"`) 만. 한글 라벨 / 영시영 specific class
  hardcoding 0.
- 어떤 시스템도 능력치 카드 패턴이 있으면 자동 packing. 사용자가 새 시트를
  import 해도 같은 혜택.

---

## §6 미해결 / Phase 2~3 backlog

1. **Phase 2** — `r20_skill_row` 추가. atomic 12 → composite 1 (영시영 1부
   100+ 행 → ~1100 atomic 감소).
2. **Phase 2** — `r20_repeating_section_wrapper`. 영시영 12 instance —
   `<fieldset class="repeating_X">` + `<thead>` + `<tbody>` packing.
3. **Phase 3** — `r20_dot_tracker` (WoD / BitD). 영시영 비해당이지만 generic
   compat 강화.
4. **Phase 3** — `r20_pbta_move` (MotW / DW / Apocalypse Keys). PbtA family
   ~7:1 ratio.
5. **measurement infra** — `scripts/measure_composite_inflation.mjs` (atomic
   only vs composite-on 비교 자동화). 본 phase 는 측정 결과만 보고.
6. **사용자 ungroup** — composite 를 atomic chain 으로 펼치는 UI (workspace
   right-click "분해"). 본 phase 비범위.

---

## §7 정직 보고 — R10

- 본 phase 의 측정값 (`r20_attribute_card` matcher 만 적용) 은 영시영 1부
  기준 atomic 감소 폭이 미미 (~8 블록). **사용자가 기대한 "9093 → 1500"
  까지는 Phase 2~3 누적 + 후처리가 필요**. Phase 1 commit 은 **infra +
  contract** — composite layer 가 회귀 없이 돌아간다는 것이 본 commit 의
  goal.
- `r20_attribute_card` matcher 의 인식 조건이 너무 보수적이면 우연 매칭 0
  대신 영시영 8 능력치 일부도 못 잡을 수 있음. 본 phase 는 false-negative
  허용 (conservative). Phase 2 에서 sample 늘리면서 인식 조건 완화.
- atomic 카탈로그 / matcher / emitter 어느 것도 본 phase 에서 수정 안
  됨. 회귀 0 보장.
