# 22 — HIGH 우선순위 신규 블록 5종

Anchor:
- docs/spec/02_functional_spec.md §3 (130 블록 카탈로그)
- docs/spec/04_block_taxonomy_v2.md (카테고리 별 인벤토리)
- docs/spec/12_roll20_output_spec.md §2/§3 (emit contract)

본 스펙은 공식 시트 분석(local_3a68261d Phase 1+2 — 40 시스템 코퍼스) 에서 HIGH 우선
순위로 식별된 신규 블록 5 종 + 기존 블록 옵션 확장 1 종을 정의한다.

## 측정 근거

| 블록 | 사용 빈도 | 시스템 예시 |
|---|---|---|
| `r20_get_compendium` | 4/40 | PF2, DW, Mothership, SW |
| `r20_get_translation` (LANG 확장) | 17/40 | i18n 지원 거의 모든 시트 |
| `r20_css_var_decl` (value 슬롯) | 7/40 | 디자인 시스템 가진 시트 |
| `r20_value_switch_panel` | 10/40 | era / mode / panel toggle |
| `r20_attr_ref` SCOPE 옵션 | 100% (모든 시트) | selected/target 비율 따라 |

## 1. `r20_get_compendium` — 컴펜디움 조회

**카테고리**: `sheet_worker` (HUE 0)
**Shape**: `reporter`
**필드**:
- `PATH` (text input) — compendium 페이지 경로. 예: `Spells/Fireball`.
- `SUBPATH` (text input, optional) — 하위 필드 경로. 예: `description`.

**Emit 규칙**:
- `SUBPATH` 비면 → `getCompendiumPage('${PATH}')`.
- `SUBPATH` 채우면 → `getCompendiumEntries('${PATH}', '${SUBPATH}')`.

**사용 예시**:

```text
[묶음: 자동 계산 칸 NAME=spell_desc]
  v.spell_desc = 컴펜디움(Spells/Fireball, description) ;
```

**시스템 specific 토큰 0** — PATH/SUBPATH 모두 사용자 입력. 시트 시스템 별 (PF2/DW/Mothership/SW)
경로 형식은 사용자 책임.

## 2. `r20_get_translation` — 번역 가져오기 (LANG 확장)

**카테고리**: `sheet_worker` (HUE 0)
**Shape**: `reporter`
**필드**:
- `KEY` (text input) — 번역 키. 예: `strength`.
- `LANG` (text input, optional) — 언어 코드. 예: `ko`, `en`. 비면 현재 언어.

**Emit 규칙**:
- `LANG` 비면 → `getTranslationByKey('${KEY}')` (기존 동작 유지).
- `LANG` 채우면 → `getTranslationByLang('${LANG}', '${KEY}')`.

**Backward compat**: 영시영 1부 등 LANG 미사용 시트는 기존 emit 보존 → 매칭 회귀 0.

## 3. `r20_css_var_decl` — 변수 선언 (값 슬롯)

**카테고리**: `css` (HUE 120)
**Shape**: `stack`
**필드**:
- `VAR_NAME` (text input) — 변수 이름. `--` 접두사 자동 제거 (사용자가 `--accent`,
  `accent` 모두 입력 가능).
- `VALUE_TEXT` (text input, fallback) — 슬롯이 비어 있을 때 사용.

**값 슬롯**:
- `VALUE` (any reporter) — `r20_color_literal` / `r20_color_var` / 표현식 블록 등.

**Emit 규칙**:
- 슬롯이 채워져 있으면 슬롯 값 사용. 비면 `VALUE_TEXT` 사용.
- 출력: `--${VAR_NAME}: ${VALUE};`.
- `VAR_NAME` 비면 emit 생략.

**기존 `r20_css_var_def` 와 차이**: `r20_css_var_def` 는 텍스트만 받음. 본 블록은
다른 블록을 슬롯에 꽂아 동적 색/계산 구성 가능.

## 4. `r20_value_switch_panel` + `r20_value_case` — 값별 영역 전환

**카테고리**: `composite` (HUE 270)
**Shape**: `c` (parent) / `stack` (case)

영시영 era toggle 같은 "값에 따라 다른 영역 보이기" 패턴을 일반화. 시스템 specific
이름 0 — `ATTR_NAME` 이 사용자 입력.

### 부모 — `r20_value_switch_panel`

**필드**:
- `ATTR_NAME` (text input) — `attr_${ATTR_NAME}` 라디오 그룹의 base 이름.

**자식 슬롯**:
- `CASES` (statement) — `r20_value_case` 자식 시퀀스.

### 자식 — `r20_value_case`

**필드**:
- `VALUE` (text input) — 대응 값. 예: `pulp`, `modern`, `1`, `2`.

**자식 슬롯**:
- `PANEL` (statement) — 해당 값일 때 보일 컨텐츠.

### Emit 결과 (HTML + 인라인 `<style>`)

```html
<div class="sheet-${ATTR}-switch">
  <style>
    .sheet-${ATTR}-panel { display: none; }
    .sheet-${ATTR}-input[value="V1"]:checked ~ .sheet-${ATTR}-panel-V1 { display: block; }
    .sheet-${ATTR}-input[value="V2"]:checked ~ .sheet-${ATTR}-panel-V2 { display: block; }
  </style>
  <input type="radio" class="sheet-${ATTR}-input" name="attr_${ATTR}" value="V1">
  <input type="radio" class="sheet-${ATTR}-input" name="attr_${ATTR}" value="V2">
  <div class="sheet-${ATTR}-panel sheet-${ATTR}-panel-V1">PANEL1</div>
  <div class="sheet-${ATTR}-panel sheet-${ATTR}-panel-V2">PANEL2</div>
</div>
```

**중복 값 처리**: 같은 `VALUE` 가 2번 이상 나오면 첫 번째만 채택 + warning.
**빈 ATTR_NAME**: emit 생략 + warning.
**빈 CASES**: wrapper 만 emit + warning.

**영시영 era toggle 과 호환**: era panel 5개 (`pulp` / `modern` / ...) 가 본 패턴과
sibling rule 형태 동일 → 매칭 회귀 0.

## 5. `r20_attr_ref` SCOPE 옵션 확장

**카테고리**: `expression` (HUE 200)
**Shape**: `reporter`
**필드**:
- `SCOPE` (dropdown, **신규**) — 시트 참조 범위:
  - `self` (기본) → `@{NAME}`
  - `selected` → `@{selected|NAME}`
  - `target` → `@{target|NAME}`
  - `character_id` → `@{character_id}` (NAME 무시)
- `NAME` (text input) — 속성 이름.

**Emit 규칙**:
- `character_id` 일 때 NAME 무시 + `@{character_id}` emit.
- `self` 일 때 `@{NAME}`.
- 그 외 (`selected` / `target`) → `@{${SCOPE}|${NAME}}`.
- 알 수 없는 SCOPE 값은 `self` 로 fallback.

**Backward compat**: 기존 `r20_attr_ref_qualified` / `r20_character_id` 블록은 유지.
본 확장은 단일 블록으로 4 케이스를 cover 하는 새로운 사용처용. 기존 워크스페이스에서
SCOPE 필드 누락 시 dropdown 의 첫 번째 값(`self`) 자동 적용 → emit 결과 `@{NAME}`
(기존 동작) → 회귀 0.

## 6. Import matcher 영향

본 패치는 emit 단(generator) 만 확장한다. Import matcher (`lib/import/block_matcher.ts`)
는 본 블록들을 자동 인식하지 않는다 — 후속 작업 항목.

영시영 1부 6134 매칭 회귀 확인됨 (Step 7, `htmlMatched=6134, htmlRawFallback=0`).

## 7. 측정 못 한 항목

- compendium API 의 시스템 별 정확한 PATH 형식 — 사용자 책임 (R1).
- `r20_value_switch_panel` 의 inline `<style>` 가 Roll20 sandbox 에서 적용되는지 — 영시영
  1부 era pattern 과 등가이므로 정상 동작 추정. 다른 sandbox 정책 변경 시 영향.
- `getTranslationByLang` API 실재 여부 — Roll20 공식 wiki 직접 fetch 권한 없음 (R10).
  운영 경험치 기준 emit, 실제 사용 시 검증 필요.
