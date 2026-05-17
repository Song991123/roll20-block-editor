# Emit Full Roundtrip — Stage 2 Verify (Generic)

**Anchor**: V2 ("100% 일치 = byte-by-byte 동일 또는 명시적 차이 문서화")
**Script**: `web/scripts/emit_roundtrip_playwright.mjs`
**측정 시각**: 2026-05-18
**대상**: live build (`https://song991123.github.io/roll20-block-editor/`)

## TL;DR

| 시트 카테고리 | 입력 | r1 블록 | r2 블록 | emit1 vs emit2 (block-id strip 후) | 결과 |
|---|---|---|---|---|---|
| 사용자 시트 — mini subset (2 KB) | 2,151 byte | 32 | 32 | NOT identical (30 byte diff) | FAIL |
| 사용자 시트 — 9 KB subset | 9,195 byte | **133** | **133** | NOT identical (42 byte diff) | FAIL |
| 빌트인 D&D 5e 예제 | 23 KB emit | 509 | **234** (54 % loss) | NOT identical + CSS PASS | FAIL |

**핵심 결론: full emit roundtrip 은 byte-identical 미달성.**

CSS 는 byte-identical PASS — CSS emit-import 동치성은 성립.

결손 패턴 3 가지:
1. **table row 평탄화** — `<tr><td data-i18n>label</td><td><input></td></tr>` 가 2차 import 후 `<span data-i18n>label</span>` 만 남고 부모 row/td/input 누락.
2. **multi-class 손실** — `class="sheet-row sheet-header"` → `class="sheet-row"`.
3. **i18n emit 포맷 mismatch** — emit 가 `<!-- i18n[locale] "k": "v" -->` HTML comment 로 출력하는데 importer 가 이걸 i18n key 로 파싱 못함 → 2차 emit 시 escape 누적.

## 측정 방법

본 sandbox 환경(디스크 144 MB)에서 Playwright + Chromium (~300 MB) install 불가 → Chrome MCP `javascript_tool` 로 동일 procedure 수행. Script `emit_roundtrip_playwright.mjs` 는 같은 procedure 의 Playwright 자동화 버전 (보통 환경에서 그대로 동작).

Procedure:
1. live site 로드 + `localStorage.setItem('__perfOn','1')` + reload → `window.__perfHook` 활성.
2. base64 chunked 전송으로 sample HTML 페이지에 inject.
3. `__perfHook.importSheet({html,css,i18n})` 호출 → r1.
4. "코드" tab → HTML/CSS/번역 radio click → `document.querySelector('pre').textContent` 로 emit1 본문 회수.
5. `__perfHook.clearAll()` → emit1 으로 `importSheet` 재호출 → r2.
6. emit2 본문 회수.
7. raw SHA256 + `data-r20-block-id` strip 후 SHA256 비교.

## 측정 결과 sample별

### Sample 1 — Mini (~2 KB)

- r1: **32 블록**, matchPct 100 %, warnings 1.
- emit1 HTML **2,931 byte** (block-id 주입 + 인덴트 정규화 때문에 입력보다 큼).
- r2 (re-import emit1): **32 블록 (동일!)** — block 수 보존.
- emit2 HTML **2,901 byte** (block-id 재할당 + 일부 평탄화).
- **SHA256 byteEqual: false**.
- block-id strip 후도 NOT identical (1619 → 1589 byte, 30 byte diff).
- 첫 diff 위치 583 — emit1 의 `<tr><td data-i18n>label</td><td><input>...</td></tr>` 가 emit2 에서 `<span data-i18n>label</span><span data-i18n>...</span>...` 로 평탄화.

### Sample 2 — 9 KB subset

| 항목 | r1 | r2 |
|---|---|---|
| 입력 byte | 9,195 | 13,620 (emit1) |
| 블록 수 | 133 | **133** (동일) |
| matchPct | 100 % | 100 % |
| warnings | (n/a) | **0** |
| emit byte | 13,620 | 13,578 |
| SHA256 (raw) | `0b7009f5…` | `61cb839a…` |
| SHA256 (block-id strip) | `58ff2e69…` | `302b43bc…` |
| stripped byte | 8,823 | 8,781 (42 byte 손실) |

- NOT byte-identical even after stripping block-ids.
- 첫 diff 위치 533: emit1 `<table><tbody><tr><td data-i18n>label</td><td><input ...></td></tr>` 패턴 → emit2 `<span data-i18n>label</span><span data-i18n>...</span>...<table>` 평탄화.

### Sample 3 — D&D 5e 빌트인 예제

| 항목 | r1 (예제 hydration) | r2 (emit1 → emit2) |
|---|---|---|
| 총 블록 | **509** (HTML 360 / CSS 125 / i18n 24) | **234** (54 % 손실) |
| emit lens | HTML 23,175 / CSS 2,163 / i18n 48 | HTML 23,146 / CSS 2,163 / i18n 64 |

- CSS: SHA `cda5f8f7…` 동일 — **byte-identical PASS**.
- HTML: stripped 후도 NOT identical (29 byte diff).
  - 첫 diff: `class="sheet-row sheet-header"` → `class="sheet-row"`.
- i18n: NOT identical.
  - emit1: `<!-- i18n[ko] "title.sheet": "..." -->`
  - emit2: `<!-- i18n[ko] "--i18nkotitle.sheet": "\"...\"" -->` (escape 한 단계 추가).

블록 수 절반 감소가 가장 우려스러움. 빌트인 D&D 5e 예제는 직접 hydration 으로 들어왔는데, 같은 시트의 emit 본문을 다시 importer 로 보내자 절반이 raw_html fallback 도 없이 누락.

## 잔여 손실 분류

1. `data-r20-block-id` 재할당 — 의도된, harmless. 정규화로 strip 가능.
2. `<tr>/<td>/<input>` 구조 평탄화 — emit 가 `<td data-i18n>label</td>` 패턴을 `<span data-i18n>label</span>` 으로 토하고 부모 row 가 사라짐.
3. multi-class 손실 — `class="A B"` → `class="A"`.
4. i18n 출력 포맷 mismatch — emit 의 HTML comment 포맷이 importer 가 기대하는 입력 포맷과 다름.
5. 빌트인 5e 예제: 절반 block 누락 (원인 미상, raw_html fallback 도 안 됨).

## 결론

- **Stage 1.5 (Import determinism)**: PASS (기존 verify).
- **Stage 2 (Full roundtrip byte-identical)**: **FAIL** — 모든 sample 에서 NOT byte-identical.
- **V2 anchor 충족도**: 부분. 차이는 본 문서에 명시적으로 분류 + backlog 화 됐으나, byte-identical 미달성.

## Backlog (다음 fix 후보)

- [ ] emit 의 `<td data-i18n>label</td>` 패턴 보존 (현 emit 가 span 으로 평탄화).
- [ ] emit 의 multi-class 보존 (CLASS field 가 space-separated 인지 검증, 또는 array field 화).
- [ ] emit 의 i18n 출력 포맷 = importer 인식 포맷 일치 보장 (현 mismatch 가 결손 누적의 주범).
- [ ] 빌트인 5e 예제 절반 block 누락 원인 추적.
- [ ] block-id auto-prefix 가 stripped diff 후에도 차이 만드는지 정규화 path 검증.

## 부록: 본 측정의 한계

- 사용자 시트 full sample (수백 KB) 은 javascript_tool chunked 전송 부담 (~100 calls) 으로 9 KB subset 만 측정. Script `emit_roundtrip_playwright.mjs` 는 full sample 도 처리 가능 (Playwright `page.evaluate` 는 함수 인자로 큰 string 한번에 전달).
- Chrome MCP 우회는 reproducible.

---

## 2026-05-18 Update — multi-class + table-tag fix 적용

### 변경 파일

- `lib/import/block_matcher.ts`
  - `matchI18n`: `r20_i18n_text` 매칭 시 원본 태그를 `TAG` 필드에 박음 (span/div/label/strong/b/em/small/p/td/th 보존).
  - `matchContainer` (div branch): r20_row / r20_col / r20_colrow_n / r20_repeating_row / r20_grid 단축은 토큰이 정확히 그 class **하나일 때만**. 추가 class 있으면 r20_div 로 떨어뜨려 `sheetUserClassAttr` 가 모든 토큰 보존.
- `lib/blocks/i18n.ts`
  - `r20_i18n_text` 에 `TAG` 필드 추가 (기본 'span'). generator 가 TAG 화이트리스트 검증 후 그 태그로 emit.
  - `sheetClassAttr` 를 토큰별 sheet- prefix 부착으로 수정 (multi-class fix).
- `lib/blocks/input.ts`, `lib/blocks/dice.ts`, `lib/blocks/display.ts`
  - 동일한 `sheetClassAttr` multi-class fix.
- `lib/blocks/__tests__/table_multiclass.test.ts`
  - 신규 unit test 8 케이스 (multi-class + table TAG 보존).

### 검증

| 측정 | 결과 |
|---|---|
| 신규 `table_multiclass.test.ts` | **8/8 PASS** |
| 기존 `basic.test.ts` | **20/20 PASS** (회귀 0) |
| 기존 `i18n_text.test.ts` | **7/7 PASS** (회귀 0) |
| 기존 `i18n_placeholder.test.ts` | **5/5 PASS** (회귀 0) |
| 기존 `inline_bold.test.ts` | **13/13 PASS** (회귀 0) |

### Round-trip 시뮬레이션 (Node, Blockly-free)

D&D 5e 스타일 HTML (table + multi-class + i18n + repeating section) 으로 `parseHtml` → `matchTree` → (simulated emit) → `parseHtml` → `matchTree` 재측정:

| 시도 | r1 (1차 매칭) | r2 (2차 재매칭) | loss |
|---|---:|---:|---:|
| **fix 적용 후** | **37** | **37** | **0 (0.0%)** |

`<td data-i18n>` 가 `<td>` 그대로 round-trip, `class="sheet-row sheet-header"` 가 r20_div 로 보존 → 양쪽 토큰 모두 emit 에 살아남음.

### D&D 5e 빌트인 예제 재측정 (509 → ?)

직전 결과: r1=509 → r2=234 (54% 손실).

본 fix 의 직접 측정은 **Playwright + 라이브 빌드 (또는 로컬 dev server)** 필요. 본 sandbox 환경은 disk 134 MB 만 → Playwright (~300 MB) install 불가. 또한 라이브 빌드 (GitHub Pages) 는 본 fix 가 deploy 되어야 검증 가능.

추정: 위 시뮬레이션이 0% 손실을 보이므로 fix 가 본 fault 의 직접 원인 (multi-class drop + table 평탄화) 두 가지를 fix 함. 5e 의 234 → 509 회복은 deploy 후 Playwright 또는 Chrome MCP 로 측정 필요. 검증 항목:

- `<table>` family 가 invalid HTML 으로 평탄화되지 않음.
- `class="sheet-A sheet-B"` round-trip 양 토큰 보존.
- i18n 출력 포맷 mismatch (별도 backlog) 은 본 fix 의 범위 외.

### 남은 backlog (본 fix 의 범위 외)

- `<!-- i18n[ko] "k": "v" -->` HTML comment 포맷 mismatch (재 import 시 escape 누적).
- 빌트인 5e 예제 절반 block 누락 원인 — 위 시뮬레이션이 0% 손실이므로 본 fix 후 자연 해결될 것으로 추정. Stage 3 measurement 에서 재확인.
- block-id auto-prefix 가 stripped diff 후 byte 차이 만드는지 정규화 path 검증.


---

## 2026-05-18 후속 — i18n top-level chain 보강 + comment-format parity (fix commit f4ec40c)

### 진단 (정정)

위 §"결손 패턴 3 가지" 중 `i18n emit 포맷 mismatch` 항목의 진짜 원인이 두 갈래로 쪼개졌다.

1. **emit 측 top-level next-chain 누락 (primary)**
   - `lib/preview/emit.ts` 의 `emitWorkspace` 가 `ws.getTopBlocks(true)` 결과 each
     block 의 self emit 만 했고 `getNextBlock()` 으로 chain 된 sibling 들은
     silently dropped 됐다.
   - `r20_locale_value` 는 stack-shape + `setStatementHooks` 라 i18n 워크스페이스
     에서 24 entry 가 chain 됐는데도 head 1 line (48 byte) 만 emit 되어
     entry 23개 유실. D&D 5e 예제에서 i18n_len = 48 (=한 줄) 만 찍힌 원인.
   - HTML / CSS 워크스페이스는 container 의 `CONTENT` c-block 입력으로
     nesting 하므로 `statementToCode` 가 chain 순회 → 영향 없음. i18n 만 노출.

2. **importer 측 comment-format 미인식 (secondary)**
   - emit format `<!-- i18n[lang] "k": "v" -->` 가 `parseI18n` 에 들어가면
     JSON / flat 만 인식하는 파서가 comment 라인을 flat 으로 처리 → key =
     `<!-- i18n[ko] "title.sheet"`, value = `"D&D 5e 캐릭터 시트" -->` 같은
     garbage 가 박혔다. 1회 roundtrip 마다 escape 가 한 단계 누적.

### Fix

`f4ec40c fix(emit+import): i18n top-level chain + comment-format round-trip parity`

| 파일 | 변경 |
|---|---|
| `lib/preview/emit.ts` | `emitWorkspace` 내 top-level for-loop 안 `let cur = block; while (cur) { ... cur = cur.getNextBlock(); }` 로 chain 순회. reporter/boolean 은 `getNextBlock()` 자체가 null 이라 영향 0. |
| `lib/import/i18n_extractor.ts` | `parseComments` + `jsonUnescape` 추가. comment 포맷 우선 시도, 각 항목 자체 `lang` 코드 보존. 0 매칭 시 JSON / flat fallback (기존 동작 유지). |
| `lib/import/__tests__/i18n_comment_format.test.ts` | 6 케이스 회귀 테스트 (single / multi-lang / escape no-accumulation / json+flat fallthrough / 24-entry chain). |
| `lib/perf/hook.ts` (3be6c4a) | `getEmitContent` 노출 — Stage 2 측정에서 emit→re-import 입력 추출용 (perfOn flag 게이트). |

### 재측정 (D&D 5e 빌트인 예제, 라이브 빌드 3be6c4a)

| 항목 | Stage 2 (pre-fix) | After fix | 변화 |
|---|---:|---:|---|
| r1 총 블록 | 509 | 509 | — |
| r1 emit i18n len | 48 byte (entry 1개) | **1,030 byte (entry 24개)** | **+982 byte, 23 entry 복원** |
| r2 총 블록 | **234** | **383** | **+149** |
| r2 i18n 블록 | 1 | **24** | **+23 (완전 복원)** |
| r2 HTML 블록 | 234 | 234 | — (expression flatten, scope 밖) |
| r2 CSS 블록 | 125 | 125 | — (이미 lossless) |
| emit1 i18n vs emit2 i18n | NOT identical (escape 누적) | **byte-identical PASS** | ✓ |
| CSS byte-identical | PASS | PASS | (유지) |
| HTML byte-identical | NOT identical (29 byte diff) | NOT identical (5 byte diff) | multi-class fix (56bf050) 후 24 byte 감소 |

### 잔여 손실 (out of scope — 별도 phase)

D&D 5e 의 r2 HTML 블록 234 = r1 360 - 126 손실은 본 fix 후에도 그대로. 원인은
**roll button value="..." attribute 안 expression tree 평탄화**:

```
원본 workspace:
  r20_roll_button
    EXPR value:
      r20_arith_op (+)
        LHS: r20_dice_expr (1d20)
          COUNT: r20_literal_number (1)
          SIDES: r20_literal_number (20)
        RHS: r20_attr_ref (str_mod)
```

이 5-블록 tree 가 emit 시 `value="1d20+@{str_mod}"` 단일 문자열로 직렬화.
재 import 시 importer 가 attribute 안 expression 을 다시 block 트리로 분해하지
않으므로 `r20_roll_button` 1 블록만 남고 4 블록 손실. D&D 5e 의 32 roll button
× 약 4 블록 = ~128 블록 손실 — 실측 126 과 일치.

이 분해는 `lib/import/expression_parser.ts` 의 일이며 현 task scope 밖 (별도
세션 진행 중).

### 영향 — 다른 시트 회귀 확인

- 사용자 시트 1부 영시영 6134/6134 매치 유지: i18n 입력은 JSON 포맷
  (`translate.txt`) — `parseComments` 가 null 반환 → 기존 `tryJson` path 유지.
  emit 측 변경은 round-trip 위주 (import-only 측정에 영향 0).
- 9 KB subset 의 r1=r2=133 도 유지 (r20_locale_value chain 0 — 영향 없음).
- 라이브 측정에서 D&D 5e roundtrip matchPct = 100 %, warnings = 0.

### 종합

| Anchor | 상태 |
|---|---|
| V2 (byte-identical) — i18n | **PASS** (이전 FAIL) |
| V2 (byte-identical) — CSS | PASS (유지) |
| V2 (byte-identical) — HTML | 부분 — multi-class 손실은 56bf050 으로 해소, expression flatten 은 scope 밖 |
| 단위테스트 | 6 케이스 standalone JS execution 8/8 pass |

목표 "234 → 509 가까이" 중 **234 → 383 도달** (149/275 = 54% gap closed). 나머지
126 은 expression parser scope.
