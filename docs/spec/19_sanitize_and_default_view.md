# 19 — 구버전 Roll20 sandbox 호환 모드 + Default view (CSS sibling trick)

Anchor:
- docs/spec/12_roll20_output_spec.md §2/§3 (emit contract)
- docs/spec/02_functional_spec.md §3 (블록 카탈로그)
- docs/spec/14_risk_register.md (sandbox 차단 항목 리스크)

본 스펙은 두 가지 독립 기능을 정의한다.

1. **구버전 무해화 (Legacy sandbox compatibility)** — Roll20 옛 시트 sandbox 가 차단하는 CSS 속성을 emit 단계에서 자동 변환 / 제거 / warning 처리.
2. **Default view (CSS sibling trick) 블록** — checkbox 의 `:checked ~ .area` selector 로 sheet 안의 영역을 토글하는 일반화된 블록 카탈로그.

두 기능은 서로 직교 (orthogonal) — 한쪽만 켜고 다른 쪽을 끌 수 있어야 한다.

---

## 1. 구버전 무해화

### 1.1 차단 항목 — 측정 근거

본 스펙은 다음 자료를 reference 로 한다:

- Roll20 Community Wiki: Sheet sandbox CSS restrictions (직접 fetch 권한 없을 시 운영 경험치 + 오픈소스 시트 grep 결과 사용)
- `roll20-character-sheets-master` 안의 official 시트가 사용 / 회피하는 패턴
- 본 프로젝트의 roll20-sheet-builder 1부 / 2부 검증에서 확인된 케이스

**측정 못 한 항목은 "측정 불가" 로 표기. 추측 변환 금지** (V10, R1).

| 차단 카테고리 | 항목 | 변환 규칙 | 측정 근거 |
|---|---|---|---|
| 트랜스폼 | `transform: scale(N)` (단일 scale) | `zoom: N` 으로 치환 | Roll20 wiki + community 실측 |
| 트랜스폼 | `transform: rotate/translate/skew/...` (복합) | 제거 + warning (대체 불가) | 변환 불가능 |
| 애니메이션 | `animation: ...` 선언 | 제거 + warning | sandbox 차단 |
| 애니메이션 | `@keyframes <name>` at-rule | 제거 + warning | sandbox 차단 |
| 변수 | `var(--x)` | 컴파일 시 `:root` / 같은 selector 안의 `--x` 정의를 inline 치환. 정의 못 찾으면 strip + warning. | 변수 치환 가능 — 안전. fallback 표기 `var(--x, FOO)` 의 `FOO` 도 사용. |
| 위치 | `position: fixed` | `position: absolute` 로 치환 + warning | sandbox 가 fixed 무시 |
| 위치 | `position: sticky` | `position: relative` + warning | 부분 지원 / 안정성 |
| 단위 | `vh` / `vw` / `vmin` / `vmax` | 그대로 (대부분 정상 동작) — but warning if sheet 안에서 — 측정 불가 시 그대로 둠 | iframe 안 동작 미확정 |
| 셀렉터 | `:has(...)` | 그대로 (모던 sandbox 지원). 측정 불가 시 warning only. | 측정 불가 |

### 1.2 변환 규칙 정밀화

#### 1.2.1 `transform: scale(N)` → `zoom: N`

매칭 정규식 (대략): `^\s*scale\(\s*([0-9.]+)\s*\)\s*$` 의 value.

```css
/* before */
.sheet { transform: scale(0.8); }
/* after */
.sheet { zoom: 0.8; }
```

복합 / 여러 함수 (예: `transform: scale(0.8) translate(10px, 0)`) 는 변환 불가 — 그대로 두면 일부 sandbox 가 무시. **제거 + warning** 으로 처리.

#### 1.2.2 `var(--x)` inline 치환

```css
/* before */
:root { --primary: #b22; }
.title { color: var(--primary); }

/* after */
.title { color: #b22; }
```

알고리즘:
1. 1차 pass — 모든 `--x: VALUE;` 선언을 mapping table 에 수집 (`:root` 우선, 같은 selector scope 안의 정의 차상).
2. 2차 pass — `var(--x, FALLBACK)` / `var(--x)` 를 mapping 으로 치환. 못 찾으면 fallback 사용. fallback 도 없으면 `initial` 또는 strip + warning.
3. `--x: ...` 선언 자체는 그대로 둬도 무해 (sandbox 가 unknown property 처리) — but 정리하려면 strip.

본 phase 는 안전하게 **선언 strip + 인라인 치환** 둘 다.

#### 1.2.3 `animation` / `@keyframes` 제거

`@keyframes <name> { ... }` at-rule 전체를 통째 제거 + warning.
`animation: ...` / `animation-*: ...` 선언 제거 + warning.

#### 1.2.4 `position: fixed` → `absolute`

property 라인 안의 value 만 치환 — selector 는 보존.

### 1.3 API

`lib/emit/sanitize.ts`:

```ts
export interface SanitizeWarning {
  code: 'transform-complex' | 'animation-stripped' | 'keyframes-stripped'
      | 'var-unresolved' | 'position-fixed' | 'position-sticky';
  message: string;
  /** 원본 CSS 안에서 줄 번호 (0-based) — 가능하면. */
  line?: number;
  /** 잘려 나간 또는 변환된 원본 텍스트. */
  source?: string;
}

export interface SanitizeResult {
  sanitized: string;
  warnings: SanitizeWarning[];
}

export function sanitizeForRoll20Legacy(css: string): SanitizeResult;
```

순수 함수 — DOM / 외부 의존 0. 단순 정규식 + 상태 머신 기반.

### 1.4 호출 hook

본 phase 에서는 ExportDialog 에 toggle 옵션 박힘. 사용자 명시적 on → `sanitizeForRoll20Legacy(css)` 호출 → 결과를 .zip 출력.

Phase 다음: 정식 emit 파이프라인 (`lib/preview/emit.ts` — 다른 세션 영역 예정) 에서 동일 함수를 hook.

### 1.5 측정 불가 — 솔직히

- Roll20 sandbox 실제 차단 항목 risk 정확 목록은 직접 sandbox 안에서 PoC 측정해야 확정. 본 phase 의 차단 항목 표는 wiki + 오픈소스 시트 grep 기반의 **추정** + 운영 경험. R6 에 따라 Stage 4 (실 sandbox 시각 검증) 에서 확정.
- `vh/vw/vmin/vmax`, `:has(...)`, container query, `gap` (flex), `aspect-ratio` 등 모던 항목 동작 여부는 **측정 불가** — 그대로 둠.

---

## 2. Default view — CSS sibling trick 블록

### 2.1 일반화된 패턴

```html
<input type="checkbox" id="show-pulp" class="r20-toggle">
<label for="show-pulp">펄프 모드</label>

<div class="r20-toggle-on r20-toggle-on--show-pulp">
  <!-- 켜졌을 때만 보임 -->
</div>
<div class="r20-toggle-off r20-toggle-off--show-pulp">
  <!-- 꺼졌을 때만 보임 (default) -->
</div>
```

```css
/* default state: off → on hidden, off shown */
.r20-toggle-on--show-pulp { display: none; }
.r20-toggle-off--show-pulp { display: block; }

#show-pulp:checked ~ .r20-toggle-on--show-pulp { display: block; }
#show-pulp:checked ~ .r20-toggle-off--show-pulp { display: none; }
```

`~` (general sibling) selector 가 sandbox 에서 동작 — roll20-sheet-builder 1부 / 2부 합치기에 쓰는 패턴.

### 2.2 블록 카탈로그 — 3 블록

본 phase 에서는 `advanced` 카테고리에 추가. ID prefix `r20_toggle_*`.

#### 2.2.1 `r20_toggle_checkbox` (stack)

| 필드 | 라벨 | 종류 | default | 비고 |
|---|---|---|---|---|
| `ID` | 토글 ID | text | `show-area` | HTML id attribute. unique. |
| `LABEL` | 라벨 텍스트 | text | `영역 표시` | `<label>` 안 텍스트. |
| `DEFAULT` | 처음에 켜짐 | boolean | false | `checked` attribute. |

emit:
```html
<input type="checkbox" id="{ID}" class="r20-toggle"{ checked if DEFAULT}>
<label for="{ID}">{LABEL}</label>
```

#### 2.2.2 `r20_toggle_on_area` (c — statement slot)

| 필드 | 라벨 | 종류 | default | 비고 |
|---|---|---|---|---|
| `REF_ID` | 토글 ID 참조 | text | `show-area` | 위 `r20_toggle_checkbox.ID` 와 매칭. |
| `CONTENT` | 내부 블록 | statement | — | 자식 블록들. |

emit:
```html
<div class="r20-toggle-on r20-toggle-on--{REF_ID}">
  {CONTENT emit}
</div>
```

emit 시 CSS rule 도 함께 자동 emit (워크스페이스 CSS 안의 별도 rule 로 박힘):
```css
.r20-toggle-on--{REF_ID} { display: none; }
#{REF_ID}:checked ~ .r20-toggle-on--{REF_ID} { display: block; }
```

#### 2.2.3 `r20_toggle_off_area` (c — statement slot)

| 필드 | 라벨 | 종류 | default | 비고 |
|---|---|---|---|---|
| `REF_ID` | 토글 ID 참조 | text | `show-area` | 위와 매칭. |
| `CONTENT` | 내부 블록 | statement | — | 자식 블록들. |

emit:
```html
<div class="r20-toggle-off r20-toggle-off--{REF_ID}">
  {CONTENT emit}
</div>
```

CSS:
```css
.r20-toggle-off--{REF_ID} { display: block; }
#{REF_ID}:checked ~ .r20-toggle-off--{REF_ID} { display: none; }
```

### 2.3 일반화 보장 — hardcoding 0

roll20-sheet-builder / 1부 / 2부 / 펄프 등 시스템 specific 식별자는 **블록 정의에 들어가지 않는다**. 사용자가 ID / LABEL 을 직접 입력. block label 도 일반 한국어 ("토글 체크박스", "켜졌을 때 보이는 영역", "꺼졌을 때 보이는 영역").

### 2.4 측정 불가 — 솔직히

- `~` (general sibling) selector 가 모든 Roll20 sandbox 버전에서 동작하는지는 **측정 불가** (sandbox PoC 필요). community 보고 + roll20-sheet-builder 1부 working copy 의 동작 사례 기반 추정.
- `:checked` pseudo 도 동일 — sandbox 확인 필요.
- block API 가 실제로 워크스페이스 / generator 파이프라인에 연결돼 end-to-end 동작하는지는 본 phase 에서 단위 테스트 + type check 만 — **live UI regression 측정은 R5 회귀 phase 에서 별도**.

---

## 3. ExportDialog 토글 UI

`components/editor/ExportDialog.tsx` 에 다음 추가:

```
☐ 구버전 Roll20 sandbox 호환 모드 (CSS 자동 변환)
    [툴팁] transform → zoom, animation 제거, var() inline, position:fixed → absolute.
           변환된 항목은 결과 패널에 warning 으로 표시.
```

기본 off. 사용자가 on 시 `sanitizeForRoll20Legacy(css)` 호출 → 결과 .zip 내 `sheet.css` 가 sanitized 버전 + `sanitize-warnings.json` 동봉.

---

## 4. 회귀 phase (R5) — 본 스펙 범위 밖

R5 에 따라 다음은 본 phase 의 코드 작성 phase 와 **분리**:

- 빈 워크스페이스 → 토글 블록 3개 추가 → 미리보기 → 체크박스 swap 확인
- export .zip → CSS 안에 sanitized rule 박힘 확인
- screenshot 3장 evidence

본 phase 는 코드 + 스펙 + 단위 테스트만. 회귀는 별도 세션에서 dev server 띄우고 Chrome MCP 로 측정.

---

## 5. 의존 phase

- Phase A1~A7 (블록 카탈로그) — 본 phase 의 conditional_view 블록 추가 시 동일 registry pattern.
- emit 파이프라인 (`lib/preview/emit.ts`) — 본 phase 의 sanitize 함수를 import 해서 hook.
- 12_roll20_output_spec.md — output contract 의 sanitize 단계 명시 (다른 phase 에서 갱신).

---

## 6. 못 푼 것 / 솔직하게 (V10, R1)

- 본 스펙은 변환 규칙 정의 + API 정의만. 실 sandbox 안에서의 각 항목 차단 여부 PoC 검증은 **측정 불가** (Chrome MCP file:// 제약 + Roll20 sandbox 접근 미확정).
- `vh/vw`, `:has(...)`, container query 등 모던 CSS 동작은 측정 불가 — 추측 변환 금지 → 그대로 둠.
- 본 스펙의 변환 표는 정식 sandbox PoC 측정 후 갱신 필요. 그 전까지는 "best effort + warning" 정책.
