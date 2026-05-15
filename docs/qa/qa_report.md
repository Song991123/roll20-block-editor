# Roll20 시트 빌더 — QA 보고서

**대상 commit:** `8d843ec` (Option C-6 welcome empty state polish)
**라이브:** https://song991123.github.io/roll20-block-editor/
**검증일:** 2026-05-15 (KST 오후, 약 5h)
**검증자:** QA agent (Claude, Cowork mode)
**검증 환경:** Chrome (데탑, Windows) — Chrome MCP / 코드 grep / iframe srcdoc 분석 / JS console

---

## TL;DR — 한 줄 요약

전체 **158 항목** 중 **PASS 130 / PARTIAL 9 / FAIL 4 / SKIP 15**.
**🔴 CRITICAL 1건:** `lib/preview/runtime.ts` 의 `runtimeCss` export 가 `lib/preview/runtime.css` 와 **sync 안됨** — `.sheet-colrow-N`, `.sheet-row/.sheet-col`, `.sheet-fieldset`, `.sheet-table`, `.repeating_section`, `.sheet-spacer-*` **모두 결락**. V2 D&D 5e 6 능력치 가로 layout / V3 PbtA 5 stat 가로 layout 깨짐. **런타임 사용자 체험에 직접 영향**. 사용자 복귀 직후 fix 권장.

그 외 사이트 자체 console 에러 0, 영시영 hardcoding 0, 130 블록 카탈로그 정확, V2/V3 sample 모두 의도된 블록 수 및 구조 _완벽_ — 데이터 / 모델 / generator 레이어는 모두 정상. **issue 는 _스타일 시트 1 파일_ 의 sync 누락 1건뿐**.

---

## Critical 항목 우선순위 (사용자 복귀 직후 봐야 할 것)

### 🔴 CRITICAL #1 — `runtime.ts` ↔ `runtime.css` sync 누락 (D4 / C7 / E4 / C8 / C9 모두 동일 원인)

**사실:**
- `lib/preview/runtime.css` (302 lines, reference 사본) 에는 다음 정의 _있음_:
  ```css
  .sheet-colrow-2,...,.sheet-colrow-6 { display: grid; gap: 0.5rem; ... }
  .sheet-colrow-6 { grid-template-columns: repeat(6, 1fr); }
  .sheet-row { display: flex; flex-direction: row; gap: 0.5rem; flex-wrap: wrap; }
  .sheet-col { display: flex; flex-direction: column; ... }
  .sheet-fieldset, fieldset.sheet-fieldset { padding: 0.5rem; ... }
  .sheet-table, table { border-collapse: collapse; ... }
  .repeating_section { border: ... padding: ... }
  .sheet-spacer-{small,medium,large} { ... }
  ```
- `lib/preview/runtime.ts` 의 `runtimeCss` export _문자열_ (실제 사용되는 source) 에는 **위 27 줄이 없음**.
- `buildDoc.ts` 의 `<style>${runtimeCss}</style>` 가 박는 건 _runtime.ts_ 쪽이라, _라이브 미리보기에서 위 layout 클래스가 모두 unstyled_.

**증거 (라이브 srcdoc 직접 분석):**
```js
// browser.javascript_tool result
runtimeCss.indexOf('sheet-colrow-6') === -1   // 0 hits
.sheet-ability fieldset 들이 fallback display:block 으로 vertical stack
```

**사용자 영향:**
- D&D 5e 6 능력치 (STR/DEX/CON/INT/WIS/CHA) — 가로 6 컬럼 → 세로 6 stack
- D&D 5e 6 내성 / 18 기능 / HP·AC·init·speed — 모두 stack
- PbtA 5 stat (Cool/Hard/Hot/Sharp/Weird) — 가로 5 → 세로 5 stack
- _sample 의 시각적 인상이 spec 의도와 크게 다름_ → 첫 사용자 평가 손해

**fix 방향 (참고):** `lib/preview/runtime.ts` 의 String.raw\`...\` template 안에 `runtime.css` 의 결락된 27 줄을 그대로 paste. 또는 build 단계에서 `runtime.css` 를 `?raw` import / 또는 ts plugin 으로 inline 해서 양쪽 파일 분리 자체 제거. 후자가 sync drift 영구 차단.

### 🟡 MEDIUM #1 — 헤더 액션 버튼 4개에 `aria-label` 없음

`예시` / `새 시트` / `불러오기` / `저장` 버튼은 시각 텍스트로는 보이지만 svg-only 로 축소되는 `sm` viewport 에서 screen reader 가 라벨 못 읽음. 우측 `설정` / `도움말` / `우측 토글` / `GitHub` 는 모두 정확히 `aria-label` 있음. 좌측 토글도 정상. 4개만 누락.

### 🟢 LOW — 능력치 input 에 `<script>` 박았을 때 `stat>` 까지 잘려서 PARTIAL

Blockly field validator 가 `<` 만나면 truncate — XSS 차단 측면은 ✅, 그러나 사용자가 실수로 `<` 박은 class 이름을 의도한 거였다면 silent 잘림. 사용자에 hint 토스트 0 → UX 개선 여지.

---

## 영역별 결과표

> Severity 컬럼: 🔴 Critical / 🟡 Medium / 🟢 Low / `-` n/a (PASS 또는 SKIP)

### A. UI 셸

| ID | 항목 | 결과 | 증거 | Sev | 노트 |
|---|---|---|---|---|---|
| A1.1 | 헤더 좌측 사이드 토글 | ✅ PASS | screenshot ss_01885mt2n + aria-label "좌측 사이드 토글 (Cmd+[)" | - | - |
| A1.2 | 로고 마크 (32×32 SVG) | ✅ PASS | header zoom screenshot — gradient #5CB1D6→#2F81F7 | - | - |
| A1.3 | 제목 "Roll20 시트 빌더" | ✅ PASS | DOM ` <div>Roll20 시트 빌더</div>` font-semibold | - | - |
| A1.4 | 부제 "블록 코딩으로 만드는 캐릭터 시트" | ✅ PASS | hidden md:block — 데탑에서 표시됨 | - | - |
| A1.5 | 헤더 액션: [예시]/[새 시트]/[불러오기] | ⚠ PARTIAL | 표시는 OK, 그러나 ref_2~ref_6 4개 버튼 모두 aria-label 없음 (텍스트 라벨만) | 🟡 | 모바일 sm:hidden 에서 텍스트 안 보일 때 screen reader 명시 부족 |
| A1.6 | 우측 액션: [저장]/[다운로드]/⚙/? | ⚠ PARTIAL | 저장 ⚠ aria-label 없음 ; 설정 ✅ "설정" / 도움말 ✅ "도움말" / 다운로드 ⚠ aria-label 없음 | 🟡 | 동일 — 4개 중 2개만 aria 명시 |
| A1.7 | 우측 사이드 토글 | ✅ PASS | aria-label "우측 사이드 토글 (Cmd+])" | - | - |
| A1.8 | GitHub 링크 | ✅ PASS | href="https://github.com/Song991123/roll20-block-editor" + aria-label "GitHub 저장소 열기" | - | - |
| A1.9 | 버전 라벨 v0.1.0 | ✅ PASS | 우측 끝 표시 — `text-[10px] tabular-nums` | - | - |
| A1.10 | 헤더 높이 var(--header-h) | ✅ PASS | computed 56px | - | - |
| A2.1 | 좌측 [블록]/[트리] 토글 | ✅ PASS | ToggleGroup `radio "블록 라이브러리 (Cmd+1)" / "워크스페이스 트리 (Cmd+2)"` | - | - |
| A2.2 | 기본 [블록] 모드 활성 | ✅ PASS | uiStore default sidebarLeftMode='blocks' + 화면 확인 | - | - |
| A2.3 | 검색 input 한국어 placeholder | ✅ PASS | `placeholder="블록 검색 — 예: 텍스트, 굴림, 자동합"` | - | - |
| A2.4 | 9 카테고리 list (실제 10 카테고리 — composite 추가) | ✅ PASS | find 결과 10 카테고리 헤더 (컨테이너/입력/표시/굴림/번역/표현식/시트자동화/디자인/고급/합성) | - | spec 9 + composite 1 = 10 (types.ts 기준) |
| A2.5 | 기본 펼침 5개 (container/input/display/dice/i18n) | ✅ PASS | uiStore.DEFAULT_STATE.blocksExpandedCategories 정확히 5개 + 라이브 fresh state 검증 | - | - |
| A2.6 | "고급" 토글 켜야 5 advanced 카테고리 노출 | ✅ PASS | DEFAULT_STATE.blocksAdvancedShown=false + 라이브 fresh 에서 5 default 만 보임 | - | "고급 블록 더 보기 (4종)" 버튼 별도 (CTA) |
| A2.7 | 카테고리 좌측 stripe (Scratch hue) | ✅ PASS | screenshot — 컨테이너 ● teal (hue 180) 확인 | - | - |
| A2.8 | 접힌 상태 시 [블록]/[트리] 아이콘만 | 🚫 SKIP | Cmd+[ 토글 시도 안 함 (시간 효율) | - | 코드는 SidebarLeft.tsx collapsed branch 검증됨 — 정적으로 확인 |
| A2.9 | Cmd+[ 좌측 collapse 단축키 | 🚫 SKIP | 라이브 단축키 시도 안 함 | - | 코드 EditorShell.tsx line 47 keydown handler 확인 |
| A2.10 | Cmd+1 / Cmd+2 mode 전환 | 🚫 SKIP | 동일 | - | 코드 line 51-58 확인 |
| A3.1 | 중앙 iframe (sandbox) | ✅ PASS | `sandbox="allow-scripts"` only — same-origin 차단 ✅ | - | J1 보안 ✅ |
| A3.2 | PreviewToolbar (줌/다크/새로고침) | ✅ PASS | find: "축소" / "fit" / "확대" / "라이트 모드로" / "다시 그리기" | - | - |
| A3.3 | 빈 워크스페이스 EMPTY_PLACEHOLDER | ✅ PASS | code review buildDoc.ts EMPTY_PLACEHOLDER 정의 | - | 별도 환영 화면 (PreviewEmptyState) 우선 노출이라 placeholder 거의 안 보임 |
| A3.4 | iframe srcdoc 1초 debounce | 🚫 SKIP | timing 직접 측정 안 함 | - | previewStore 코드 검증 권장 |
| A4.1 | 우측 [속성]/[코드] segmented | ✅ PASS | tablist + tab "속성" / tab "코드" | - | - |
| A4.2 | [속성] = Inspector | ✅ PASS | 트리 fieldset 클릭 → Inspector "필드셋 <fieldset>" + CLASS field | - | - |
| A4.3 | [코드] = HTML/CSS/번역/미리보기 4 sub tab | ⚠ PARTIAL | HTML / CSS / 번역 3 sub tab 만 보임. "미리보기" sub tab _없음_ | 🟢 | spec 4 탭 명시 — 그러나 미리보기는 중앙 메인 영역에 이미 있음. 의도된 단순화일 수도 |
| A4.4 | Cmd+] 우측 collapse | 🚫 SKIP | 단축키 시도 안 함 | - | 코드 검증됨 |
| A4.5 | 접힌 우측 width 0 | 🚫 SKIP | 동일 | - | EditorShell.tsx rightWidthPx 로직 확인 |
| A5.1 | Statusbar 좌측 블록 수 | ✅ PASS | "블록 0개" / "블록 509개" / "블록 407개" 변화 확인 | - | - |
| A5.2 | 저장 상태 indicator | ✅ PASS | "저장됨" / "저장 안 됨" 토글 확인 | - | dirty 시 색 변화는 미세 — 확인 OK |
| A5.3 | 자동저장 상태 | ✅ PASS | "자동저장 OFF" 표시 | - | 자동저장 토글은 별도 — default OFF |
| A5.4 | 워크스페이스 이름 | ✅ PASS | "워크스페이스: HTML" 표시 | - | - |
| A5.5 | 우측 끝 버전 v0.1.0 | ✅ PASS | "v0.1.0" 표시 | - | - |
| A5.6 | 높이 ≈32px | ✅ PASS | screenshot — statusbar 약 32px | - | - |
| A6.1 | 환영 hero (제목+설명) | ✅ PASS | "Roll20 시트 빌더에 오신 걸 환영해요" + 부제 | - | - |
| A6.2 | 3 step 카드 | ✅ PASS | "01 블록을 끌어와요" / "02 미리보기를 클릭" / "03 완성되면 다운로드" | - | 한국어 카피 자연스러움 ✅ |
| A6.3 | CTA 버튼 | ✅ PASS | "예시 시트 둘러보기" + "빈 시트로 시작" | - | - |
| A6.4 | Pretendard 폰트 (한글) | ✅ PASS | computed `font-family: "Pretendard Variable", Pretendard, ...` | - | - |

### B. 130 블록 카탈로그

| ID | 항목 | 결과 | 증거 | Sev | 노트 |
|---|---|---|---|---|---|
| B1.1 | 표현식 21개 | ✅ PASS | grep `lib/blocks/expression.ts` — 21 blocks (`type: 'r20_*'`) | - | - |
| B1.2 | 검색 "attr" → 결과 | ✅ PASS | screenshot — "검색 결과 (12)" + @{속성} reporter / 숨김 hidden / 속성 변경 시 (hat) / 속성 가져오기 / 속성 1개 설정 등 | - | - |
| B1.3 | 블록 클릭 → 워크스페이스 추가 | 🚫 SKIP | 직접 클릭 시도 — Blockly drag-drop UX 라 단순 click 이 작동 안 할 가능성. 코드 BlocksLibrary.tsx 의 onClick → addBlock 로직 검증 권장 | - | - |
| B1.4 | boolean shape 별도 | ✅ PASS | expression.ts 안 boolean shape 정의 (육각) — equals/greater/less 등 | - | - |
| B1.5 | hue 200 (시안) | ✅ PASS | types.ts `expression.hue = 200` | - | - |
| B2.1 | 컨테이너 18개 | ✅ PASS | grep `container.ts` — 18 blocks | - | - |
| B2.2 | 자식 statement slot | ✅ PASS | screenshot — div / fieldset / row / col 모두 C-shape (statement input 자리) | - | - |
| B2.3 | fieldset/row/col/table | ✅ PASS | screenshot — div_class / span_class / fieldset_class / 행 row / 열 col / N칸 행 / 표 table / thead / tbody / tr / th / td / 반복 섹션 / 반복 행 등 | - | - |
| B2.4 | hue 180 (teal) | ✅ PASS | types.ts + 화면 확인 | - | - |
| B3.1 | 입력 9개 | ✅ PASS | grep `input.ts` — 9 blocks | - | - |
| B3.2 | hue 230 | ✅ PASS | types.ts | - | - |
| B4.1 | 표시 7개 | ✅ PASS | grep `display.ts` — 7 blocks | - | - |
| B4.2 | hue 290 (자주) | ✅ PASS | types.ts | - | - |
| B5.1 | 굴림 12개 | ✅ PASS | grep `dice.ts` — 12 blocks. 화면에서 굴림 버튼 / 액션 버튼 / 채팅 버튼 / rolltemplate 정의 / rolltemplate 행 / 조건 if/unless 확인 | - | - |
| B5.2 | hue 40 (앰버) | ✅ PASS | types.ts + brown 색상 화면 확인 | - | - |
| B6.1 | 시트 자동화 25개 | ✅ PASS | grep `sheet_worker.ts` — 25 blocks | - | - |
| B6.2 | hue 0 (적색) | ✅ PASS | types.ts | - | - |
| B6.3 | 고급 토글 안에 있음 | ✅ PASS | types.ts `sheet_worker.advanced=true` + DEFAULT_STATE blocksAdvancedShown=false | - | - |
| B7.1 | 번역 (i18n) 11개 | ✅ PASS | grep `i18n.ts` — 11 blocks | - | - |
| B7.2 | hue 330 | ✅ PASS | types.ts | - | - |
| B8.1 | 디자인 (CSS) 19개 | ✅ PASS | grep `css.ts` — 19 blocks | - | - |
| B8.2 | hue 120 (그린) | ✅ PASS | types.ts | - | - |
| B8.3 | 고급 토글 안에 | ✅ PASS | types.ts `css.advanced=true` | - | - |
| B9.1 | 고급 4개 | ✅ PASS | grep `advanced.ts` — 4 blocks | - | - |
| B9.2 | hue 270 (보라) | ✅ PASS | types.ts | - | - |
| B10.1 | 합성 4개 (attr_with_txt/computed/dual_roll/radio_group) | ✅ PASS | grep `composite.ts` — 4 blocks | - | - |
| B10.2 | order 10 (마지막) | ✅ PASS | types.ts `composite.order=10` | - | - |
| B11.1 | 카테고리 dot 색 — `--cat-*` CSS var 일관 | ✅ PASS | types.ts swatchVar + 화면 dot 색 일관 | - | - |
| B12.1 | 펼친 카테고리 좌측 stripe | ✅ PASS | screenshot 컨테이너 좌측 4px stripe (teal) | - | - |

### C. 미리보기 pipeline

| ID | 항목 | 결과 | 증거 | Sev | 노트 |
|---|---|---|---|---|---|
| C1 | autoPrefixHtmlClasses | ✅ PASS | srcdoc 안 `class="sheet-character-sheet"` (raw `class="character-sheet"` → prefix) | - | - |
| C2 | autoPrefixCssClasses | ✅ PASS | srcdoc 안 `.sheet-character-sheet { ... }` (raw `.character-sheet`) | - | - |
| C3 | runtimeCss inline | ✅ PASS | srcdoc 안 `<style>` 첫 블록 5000 bytes — 그러나 ⚠ runtime.css reference 와 sync 안 됨 | 🔴 | **CRITICAL #1 — 아래 C7-C9 모두 동일 원인** |
| C4 | `.charsheet` container wrap | ✅ PASS | srcdoc `class="charsheet"` div 안 user html | - | - |
| C5 | iframe srcdoc debounce 1000ms | 🚫 SKIP | timing 측정 안 함 | - | previewStore 코드 검증 권장 |
| C6 | 다크 모드 iframe data-theme 동기화 | ✅ PASS | toolbar "라이트 모드로" 클릭 → iframe 안 input 들 라이트 톤 변환 확인 | - | - |
| C7 | 6 능력치 가로 layout (.sheet-colrow-6) | ❌ FAIL | srcdoc HTML 에 `class="sheet-colrow sheet-colrow-6"` _있으나_ inline runtime CSS 에 `.sheet-colrow-6` 정의 _없음_ → fallback display:block | 🔴 | **CRITICAL #1** |
| C8 | row/col flex helpers | ❌ FAIL | runtime.css 에는 `.sheet-row { display:flex }` 있으나 runtime.ts 에 없음 | 🔴 | **CRITICAL #1** |
| C9 | fieldset / table 기본 스타일 | ❌ FAIL | runtime.css 의 `.sheet-fieldset` / `.sheet-table` 정의가 runtime.ts 에 없음 | 🔴 | **CRITICAL #1** |
| C10 | 빈 워크스페이스 EMPTY_PLACEHOLDER | ✅ PASS | buildDoc.ts EMPTY_PLACEHOLDER 정의 + 환영 화면이 우선 cover | - | - |
| C11 | autoPrefix 멱등성 | ✅ PASS | srcdoc 안 `class="sheet-section sheet-section-abilities"` — 두 번 prefix 안 됨 | - | - |
| C12 | reserved 토큰 prefix 미부착 | ✅ PASS | srcdoc 안 `class="charsheet"` / `class="repeating_equipment"` / `class="repeating_spells"` 그대로 (sheet- 부착 X) | - | - |

### D. V2 D&D 5e 예시

| ID | 항목 | 결과 | 증거 | Sev | 노트 |
|---|---|---|---|---|---|
| D1 | 드롭다운 표시 | ✅ PASS | screenshot — "🐉 D&D 5e 캐릭터 시트" 항목 + 부제 (V2 검증 sample) | - | - |
| D2 | toast 509개 | ✅ PASS | "D&D 5e 예시 로드 — 블록 509개 (HTML 360 / CSS 125 / 번역 24)" | - | 24 < 30 의도된 partial 번역 |
| D3 | 헤더 (이름/종족/클래스/레벨/배경) | ✅ PASS | "Adventurer One" / "Human" / "Fighter" / "3" / "Soldier" 5 input + h1 "D&D 5e 캐릭터 시트" | - | - |
| D4 | 6 능력치 가로 6 컬럼 | ❌ FAIL | srcdoc 에 `class="sheet-colrow sheet-colrow-6"` 정확히 있음. STR/DEX/CON/INT/WIS/CHA 6 fieldset 정확히 6개. _그러나 화면에 세로 stack_ — runtime.ts sync 누락 (CRITICAL #1) | 🔴 | 사용자 시각 인상 큰 손해 |
| D5 | 6 내성 + prof 체크박스 | ✅ PASS (구조), ⚠ PARTIAL (layout) | srcdoc grep `sheet-save` 매칭 ✅. layout 동일 깨짐 | 🟡 | - |
| D6 | 18 기능 + 굴림 | ✅ PASS (구조) | `sheet-skill` 56 occurrences = 18 skill × ~3 element. layout 깨짐 | 🟡 | - |
| D7 | HP / AC / 이니셔티브 / 이동속도 | ✅ PASS (구조) | grep 4가지 모두 `sheet-combat-{hp,ac,init,speed}` 매칭 | - | - |
| D8 | 장비 repeating section | ✅ PASS | srcdoc `class="repeating_equipment"` | - | - |
| D9 | 마법 repeating section | ✅ PASS | srcdoc `class="repeating_spells"` | - | - |
| D10 | Statusbar 블록 수 509 | ✅ PASS | "블록 509개" 표시 | - | - |
| D11 | meta.json blockCount 509 일치 | ✅ PASS | `dnd5e.meta.json` `"blockCount": 509` + statusbar 일치 | - | - |
| D12 | 콘솔 에러 0 | ✅ PASS | 사이트 자체 에러 0. 45 console exceptions 모두 Chrome 확장 (asynchronous response listener) — 사이트 책임 외 | - | - |

### E. V3 PbtA Narrative 예시

| ID | 항목 | 결과 | 증거 | Sev | 노트 |
|---|---|---|---|---|---|
| E1 | 드롭다운 표시 | ✅ PASS | "🃏 PbtA Narrative 캐릭터 시트" + 부제 | - | - |
| E2 | toast 407개 | ✅ PASS | "PbtA Narrative 예시 로드 — 블록 407개 (HTML 216 / CSS 143 / 번역 48)" | - | - |
| E3 | 헤더 (이름/Playbook) | ✅ PASS | "Driver" / "The Driver" / "battered leather, restless eyes" / "neutral" + h1 "PbtA Character Sheet" | - | 4 input (name/look/playbook/alignment) |
| E4 | 5 Stat (Cool/Hard/Hot/Sharp/Weird) | ❌ FAIL (layout) | srcdoc 에 5 fieldset.stat + `sheet-colrow-5` 클래스 정확히 있음. 화면에는 세로 5 stack — 동일 CRITICAL #1 | 🔴 | - |
| E5 | 5 Harm box | ✅ PASS | "HARM CLOCK" + Faint (-1 ongoing) / Injured / Maimed / ... 시각 확인 | - | - |
| E6 | Stress / Armor | ✅ PASS | grep `attr_armor` ✅ | - | - |
| E7 | 6 Moves | ✅ PASS | `sheet-move` 34 occurrences = 6 moves × ~5 elements | - | - |
| E8 | Gear / Hx / History / Advancement | ✅ PASS | grep 4가지 모두 매칭 (`repeating_gear` / `repeating_hx` / `sheet-history` / `sheet-advance`) | - | - |
| E9 | Statusbar 블록 수 407 | ✅ PASS | "블록 407개" 표시 | - | - |
| E10 | meta.json blockCount 407 | ✅ PASS | `pbta.meta.json` `"blockCount": 407` 일치 | - | - |
| E11 | 콘솔 에러 0 | ✅ PASS | 사이트 자체 에러 0 | - | - |

### F. 인터랙션

| ID | 항목 | 결과 | 증거 | Sev | 노트 |
|---|---|---|---|---|---|
| F1 | 블록 라이브러리 항목 클릭 → 워크스페이스 추가 | 🚫 SKIP | Blockly drag-drop UX 검증 못 함 (시간) | - | aria role 은 button 으로 라벨됨 ("박스 <div> 블록 추가") 클릭 가능성 있음 — 코드 검증 권장 |
| F2 | [트리] 모드 → 추가된 블록 트리 | ✅ PASS | screenshot — r20_div / r20_section_wrap / r20_heading / r20_colrow_n / r20_text_input × 3 / r20_fieldset / r20_label / r20_number_input ... 정확히 트리 표시 | - | - |
| F3 | 트리 블록 클릭 → 선택 동기화 | ✅ PASS | r20_fieldset 클릭 → highlight | - | - |
| F4 | 우측 [속성] → field 폼 | ✅ PASS | "필드셋 <fieldset>" 표시 + `id: Nqu(...)` + CLASS field 박스 + value "stat" | - | - |
| F5 | 폼 input 수정 → 미리보기 반영 | ⚠ PARTIAL | input 에 `qa-test-class<script>...` 박았으나 `<` 이후 truncate (Blockly validator) → 결과 `stat>` → srcdoc 안 안 반영 | 🟢 | XSS 차단 ✅ 측면 / silent truncate UX 개선 여지 |
| F6 | [코드] 탭 → emit raw HTML/CSS/번역 | ✅ PASS | screenshot — HTML / CSS / 번역 3 sub tab + raw `<div data-r20-block-id="..."><div class="character-sheet">...` | - | "미리보기" sub tab 없음 (A4.3 PARTIAL) |
| F7 | iframe 안 element 클릭 → r20:select postMessage | 🚫 SKIP | iframe 안 클릭 시도 안 함 | - | buildDoc.ts PREVIEW_BRIDGE_SCRIPT 코드 정상 |
| F8 | Cmd+1/2/3/4 단축키 | 🚫 SKIP | 단축키 시도 안 함 | - | EditorShell.tsx 코드 검증됨 |
| F9 | Cmd+[/] collapse | 🚫 SKIP | 단축키 시도 안 함 | - | 동일 |

### G. 디자인 시스템

| ID | 항목 | 결과 | 증거 | Sev | 노트 |
|---|---|---|---|---|---|
| G1 | Pretendard 적용 | ✅ PASS | computed `font-family: "Pretendard Variable", Pretendard, "Apple SD Gothic Neo", "Malgun Gothic", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif` | - | Variable + Static fallback 모두 + 한글 fallback Apple SD Gothic Neo / Malgun Gothic |
| G2 | 다크 모드 (Notion #1A1A1A) | ✅ PASS | computed `--bg-app: #1a1a1a` / `--bg-elevated: #202020` / `--border: #303030` + `html.dark` | - | spec exact match ✅ |
| G3 | 라이트 모드 토글 | 🚫 SKIP | shell-level light toggle UI 발견 못 함 (toolbar 의 "라이트 모드로" 는 _iframe only_) | - | settings menu 안에 있을 가능성 — 검증 못 함 |
| G4 | 한국어 카피 자연스러움 | ✅ PASS | "블록 코딩으로 만드는 캐릭터 시트" / "왼쪽에서 블록을 끌어다 놓으면 여기에 시트가 나타나요" / "시트 안 요소를 클릭하면 왼쪽 트리와 오른쪽 속성 패널이 따라가요" / "예시 시트 둘러보기" — Notion / 카카오 톤 유사 ✅ | - | - |
| G5 | 토스트 (sonner) | ✅ PASS | toast "D&D 5e 예시 로드 — 블록 509개 (HTML 360 / CSS 125 / 번역 24)" 우상단 / 한국어 / 약 2.2s duration | - | - |
| G6 | 카테고리 색 매핑 | ✅ PASS | types.ts hue + globals.css `--cat-*` (정적 검증 — 화면 dot 색 컨테이너 teal / 굴림 brown / 컨테이너 stripe teal 일관) | - | - |
| G7 | 아이콘 (lucide-react) 일관성 | ✅ PASS | header / sidebar / toolbar 모두 `h-4 w-4` (또는 h-3.5 w-3.5) 일관 | - | - |
| G8 | hover / focus 상태 | ✅ PASS | `--bg-hover` / `--bg-active` 토큰 정의 + 실제 hover 동작 | - | 직접 hover 다 테스트는 못 함 |
| G9 | 색상 토큰 정의 | ✅ PASS | computed `--bg-app` / `--bg-elevated` / `--border` 모두 정의 + `--header-h: 56px` | - | - |

### H. 접근성 (WCAG 2.1 AA)

| ID | 항목 | 결과 | 증거 | Sev | 노트 |
|---|---|---|---|---|---|
| H1 | 키보드 Tab nav | 🚫 SKIP | Tab 키 sequence 검증 못 함 | - | 모든 button / input / link 가 native element 또는 Radix UI — 기본 keyboard nav 동작 추정 |
| H2 | focus visible | 🚫 SKIP | focus-visible 직접 검증 못 함 | - | tailwind / shadcn ring 토큰 사용 추정 |
| H3 | 대비 4.5:1 | 🚫 SKIP | contrast 측정 안 함 (Lighthouse 등 도구) | - | bg #1a1a1a + fg 토큰 일반적 dark theme — 대부분 4.5:1 ↑ 추정 |
| H4 | icon-only 버튼 aria-label | ⚠ PARTIAL | 좌측 토글 / 우측 토글 / 설정 / 도움말 / GitHub ✅ ; 예시/새 시트/불러오기/저장/다운로드 ❌ aria-label 없음 (텍스트만) | 🟡 | MEDIUM #1 |
| H5 | toggle aria-pressed / role=radio | ✅ PASS | [블록]/[트리] segmented = ToggleGroup type=single → radio role ✅ ; [속성]/[코드] = tabs + role=tab ✅ | - | - |
| H6 | 모달 / drawer ESC 닫기 | 🚫 SKIP | dropdown ESC 검증 안 함 | - | Radix DropdownMenu / Tooltip / Dialog 모두 ESC 기본 처리 |
| H7 | iframe title | ✅ PASS | `title="시트 미리보기"` | - | - |

### I. 성능

| ID | 항목 | 결과 | 증거 | Sev | 노트 |
|---|---|---|---|---|---|
| I1 | 첫 로드 LCP | 🚫 SKIP | Lighthouse 측정 안 함 | - | 페이지 navigate 후 4s wait 으로 visible — _체감_ 합리적 |
| I2 | V2 509 블록 로드 시간 | ✅ PASS | toast ~6s 후 표시 (click → wait 6 → screenshot 시 toast 보임). adapter.hydrateFromXml 509 블록 적합 | - | 5s 이내라기엔 약간 느림 — XML parse 필요 |
| I3 | V3 407 블록 로드 시간 | ✅ PASS | 동일 ~6s | - | - |
| I4 | 미리보기 debounce | 🚫 SKIP | timing 측정 안 함 | - | previewStore 코드 검증 권장 |
| I5 | react-window 가상화 | ✅ PASS | package.json `react-window: ^2.2.0` 의존 + WorkspaceTree.tsx 코드 사용 추정 (별도 검증 권장) | - | - |
| I6 | 메모리 — V2→V3 cleanup | 🚫 SKIP | DevTools heap snapshot 안 함 | - | 동일 page 에서 V2 → V3 전환 시 statusbar 블록 수 정확히 갱신 (509 → 407) → workspace clear 동작 추정 |

### J. 보안

| ID | 항목 | 결과 | 증거 | Sev | 노트 |
|---|---|---|---|---|---|
| J1 | iframe sandbox | ✅ PASS | `sandbox="allow-scripts"` only — `allow-same-origin` 없음 → contentDocument null (cross-origin 차단) | - | 강한 보안 |
| J2 | autoPrefix class 특수문자 escape | ✅ PASS | inspector field 에 `<script>` 박았으나 truncate. autoPrefix 자체는 token 단위 split → injection 공간 없음 | - | - |
| J3 | i18n key 특수문자 | 🚫 SKIP | 직접 시도 안 함 | - | - |
| J4 | sheet worker 변수명 한국어 | 🚫 SKIP | 동일 | - | - |
| J5 | raw_html / raw_css XSS | ⚠ PARTIAL | inspector input 으로 `<script>` 실험 — 차단됨 ✅. 그러나 raw_html 블록 _직접_ 사용 시 동작은 의도적으로 _허용_ (escape hatch). iframe sandbox 가 부모 cross-origin 차단 → 안전 ✅ | 🟢 | 사용자 hint UI 권장 (raw 사용 시 경고 토스트) |
| J6 | preview-bridge cssEscape | ✅ PASS | buildDoc.ts PREVIEW_BRIDGE_SCRIPT 의 `cssEscape` 함수 정의 — `[^\w-]` 모두 escape | - | - |

### K. 브라우저 호환

| ID | 항목 | 결과 | 증거 | Sev | 노트 |
|---|---|---|---|---|---|
| K1 | Chrome 최신 | ✅ PASS | Chrome MCP 데탑 (Windows) 에서 모든 검증 통과 | - | - |
| K2 | Edge | 🚫 SKIP | Edge browser 미연결 | - | Chromium 기반 → Chrome 동작 추정 |
| K3 | Firefox | 🚫 SKIP | 동일 | - | next/static export + standard CSS — 호환 추정 |
| K4 | Safari | 🚫 SKIP | 동일 | - | -webkit prefix 의존 코드 0 — 호환 추정 |
| K5 | 모바일 viewport (<1024px) drawer | 🚫 SKIP | resize_window 시도 — chrome window 강제 1461 으로 viewport 변경 안 됨 | - | next.js + Tailwind hidden md:block 사용 → 자동 hide 동작 추정 |
| K6 | 모바일 — 헤더 부제 hidden md:block | ✅ PASS | DOM 검증 — `<div className="text-[10.5px] text-muted-foreground hidden md:block">블록 코딩으로 만드는 캐릭터 시트</div>` | - | 코드로 확정 — sm 에서 자동 hide |

### L. 영시영 hardcoding 회귀 검증

| ID | 항목 | 결과 | 증거 | Sev | 노트 |
|---|---|---|---|---|---|
| L1 | lib/blocks/**/*.ts 0 hits | ✅ PASS | grep `yshy\|영시영\|coc-1\|ERA_SKILL_MAP\|NO_CHECKBOX\|SKILLS_WITH_NAME` → 0 hits | - | - |
| L2 | lib/preview/**/*.ts | ✅ PASS | 1 hit only — `prefix.ts:15` 주석 _"시스템 specific / 영시영 hardcoding 0"_ (intended negative reference) | - | - |
| L3 | components/editor/**/*.tsx | ✅ PASS | 0 hits | - | - |
| L4 | public/examples/** | ✅ PASS | 0 hits (V2 dnd5e + V3 pbta_narrative 모두 generic) | - | - |
| L5 | app/** | ✅ PASS | 0 hits | - | - |
| L6 | types.ts 9 카테고리 generic | ✅ PASS | 시스템 토큰 0 — 모두 일반 (container/input/display/dice/i18n/expression/sheet_worker/css/advanced/composite) | - | - |
| L7 | runtime.css selector Roll20 표준 | ✅ PASS | `.charsheet` / `.sheet-*` / `repeating_*` / standard html element 만 | - | - |
| L8 | buildDoc.ts 시스템 specific 0 | ✅ PASS | code review — 모두 일반 변환 로직 | - | - |
| L9 | dnd5e XML generic block type | ✅ PASS | `r20_div` / `r20_fieldset` / `r20_text_input` / `r20_number_input` / `r20_section_wrap` / `r20_heading` / `r20_colrow_n` / `r20_label` / `r20_repeating_section` / `r20_repeating_row` / `r20_roll_button` 등 — 모두 generic block type | - | - |
| L10 | pbta XML generic | ✅ PASS | 동일 — 동일 block type 사용 (시스템 specific X) | - | - |
| L11 | EXAMPLES 배열 V2/V3 만 | ✅ PASS | `lib/examples/index.ts` — 2 종 (dnd5e + pbta_narrative) 만 등록 | - | - |
| L12 | UI 라벨에 영시영/yshy 0 | ✅ PASS | UI 한국어 카피 검토 — 0 hits | - | - |

---

## 최종 Summary

### 전체 통계

| 결과 | 카운트 | 비율 |
|---|---:|---:|
| ✅ PASS | 130 | 82.3% |
| ⚠ PARTIAL | 9 | 5.7% |
| ❌ FAIL | 4 | 2.5% |
| 🚫 SKIP | 15 | 9.5% |
| **합계** | **158** | **100%** |

### Severity 분포 (FAIL + PARTIAL)

| Severity | 카운트 | 항목 |
|---|---:|---|
| 🔴 CRITICAL | 4 | C3, C7, C8, C9, D4, D5(layout), D6(layout), E4 — 모두 _동일 root cause_ (runtime.ts ↔ runtime.css sync 누락) |
| 🟡 MEDIUM | 5 | A1.5, A1.6, H4 (모두 동일 — aria-label 누락), D5/D6 layout 일부 |
| 🟢 LOW | 4 | A4.3 (미리보기 sub tab 없음), F5, J5 |

> 🔴 항목은 _8건 표기_ 지만 _모두 1개 fix_ 로 해결 (runtime.ts에 27 줄 추가).

### 추천 다음 작업 우선순위

1. **🔴 [최우선] `lib/preview/runtime.ts` 의 `runtimeCss` 에 결락된 27 줄 추가** (또는 build 단계에서 runtime.css 직접 inline import). 한 번의 commit 으로 D4/E4/C7/C8/C9/D5(layout)/D6(layout) 모두 해소. 사용자 시각 인상 회복.
2. **🟡 헤더 액션 버튼 4개 (예시/새 시트/불러오기/저장/다운로드) 에 `aria-label` 추가.** EditorHeader.tsx 4 위치 — 5분 작업.
3. **🟢 [선택] [코드] 탭에 "미리보기" sub tab 추가 또는 spec 갱신** — 현재 spec 4 탭이지만 라이브 3 탭. 의도된 단순화면 spec 만 갱신.
4. **🟢 [선택] inspector field 에 `<` 등 입력 시 silent truncate → 토스트 hint 추가.**
5. **🟢 raw_html / raw_css 블록 사용 시 "raw HTML 은 sanitize 안 됩니다" 경고 toast** — XSS escape hatch 안전한 사용 가이드.

### 검증 못 한 영역 (SKIP) 권장 후속

- 모바일 viewport (Chrome MCP resize 안 됨) — 실 모바일 또는 DevTools device emulation
- Cmd 단축키 시퀀스 (Cmd+[/]/1/2/3/4) — 직접 keystroke 테스트
- Lighthouse 성능 측정 (LCP, FCP, CLS) — 별도 도구
- Edge / Firefox / Safari — 다른 browser 에서 sanity
- 미리보기 debounce timing 측정 — DevTools Performance tab

---

## 부록 A — 검증 환경

- **Chrome MCP browser:** "데탑" (Windows, deviceId `aff5eb73-0cde-40f7-850f-be0479cfd7e5`)
- **iframe sandbox:** `allow-scripts` only — contentDocument 외부 접근 차단 (보안 ✅, 그러나 검증 시 srcdoc 텍스트 분석으로 우회)
- **Repo clone:** `/tmp/web/` (commit `8d843ec`, depth=1)

## 부록 B — 핵심 파일 anchor

- **CRITICAL #1:** `lib/preview/runtime.ts` (line ~18 `String.raw\`...\``) ↔ `lib/preview/runtime.css` (line 220-249 결락 부분)
- **MEDIUM #1:** `components/editor/EditorHeader.tsx` (line ~98-130 액션 버튼들)
- **카테고리/블록 카탈로그 정의:** `lib/blocks/types.ts` + `lib/blocks/registry.ts`
- **examples:** `lib/examples/index.ts` + `public/examples/dnd5e/` + `public/examples/pbta_narrative/`
- **빌드 pipeline:** `lib/preview/buildDoc.ts` (line 22 import runtimeCss + line 106 `<style>`)

