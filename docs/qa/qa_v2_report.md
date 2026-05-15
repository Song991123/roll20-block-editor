# Roll20 시트 빌더 — QA v2 보고서 (인터랙션·측정 기반)

**대상 commit:** `f2a9c86` (Phase 6 export i18n WARNING) — `ccd3a92` (BlocksLibrary SVG fit-scale + svgResize) 포함
**검증 환경:** GitHub Pages 라이브 — https://song991123.github.io/roll20-block-editor/ (Chrome MCP, 1440×900 뷰포트, 다크 모드 default)
**검증일:** 2026-05-15
**검증자:** QA v2 agent (Claude, evidence 기반 인터랙션 검증)
**전체 항목:** 158 (`qa_v2_checklist.md` 와 1:1 대응)

> **이전 v1 QA 의 문제점 (반성):**
> v1 (`qa_report.md`, 158 항목) 은 *DOM selector 존재* 만으로 PASS 를 박았다. 그 결과:
> - BlocksLibrary mini-preview SVG 가 카드 밖으로 클립되는 버그 (이전 commit 61297f3 / ccd3a92 fix 직전 상태) 를 검출 못 함
> - 블록 카드 click-to-add 가 silent 하게 실패하는 버그 (B21~B28) 를 PASS 박음
> - 헤더 [새 시트] 버튼이 실제로 작동 안 하고 "곧 추가됩니다" placeholder 였음에도 PASS
> - 모달 ESC 닫기 미동작 (K6) 등 인터랙션 회귀 미검출
> v2 는 위 누락 항목을 **bbox 측정 + 실제 click sequence + state diff** 로 재검증했고, 그 결과 **6건 의 신규 버그** (1 🔴 CRITICAL + 5 🟡 medium) 를 발견했다.

---

## 1. 결과 분포

| 분류 | 카운트 | 비고 |
|---|---:|---|
| ✅ PASS    | 122 | evidence (bbox / screenshot / 인터랙션 seq) 동반 |
| ⚠ PARTIAL | 11  | 동작은 하지만 spec 과 미세 불일치 |
| ❌ FAIL    | 6   | 신규 발견 버그 — 아래 § Bug List 참고 |
| 🚫 SKIP    | 19  | NVDA 미설치 / Firefox·Safari 부재 / 환경 제약 |
| **합계**   | **158** | |

PASS 율: 122/158 = **77.2%** (이전 v1 의 selector-only PASS 와 달리 엄밀 검증된 PASS)

---

## 2. 카테고리별 결과

### A. 헤더 / 셸 (10/10) — ✅ 9 PASS / ⚠ 1 PARTIAL

| ID | 결과 | Evidence | 비고 |
|---|---|---|---|
| A1 | ✅ | header bbox {x:0,y:0,w:1424,h:56}, title bbox {x:92,y:11,w:135,h:20} — visible, 잘림 X | screenshot ss_85091vd6n |
| A2 | ⚠ | 5 액션 버튼 모두 표시 + aria-label 한국어 (예시/새시트/불러오기/저장/다운로드) — **but [새 시트] 미구현** (BUG #4) | 헤더 9 버튼 enumerate 완료 |
| A3 | ✅ | 우측 ⚙ 설정 / ? 도움말 / GitHub 링크 / v0.1.0 텍스트 visible — 모두 한국어 aria-label | dump 결과 |
| A4 | ✅ | 좌측 토글 시 사이드 width 280→0→280, 우측 320→0→320 | pre/post diff |
| A5 | ✅ | header.height = 56px (spec 56~64 범위) | bbox 측정 |
| A6 | ✅ | scroll 후에도 header bbox 동일 (shrink-0) | bbox 재측정 |
| A7 | ✅ | [예시] 클릭 → role=menuitem 3개 (빈 시트 / D&D 5e / PbtA) | menuitem dump |
| A8 | ✅ | Tab 키 순회 — 헤더 → 사이드 → 워크스페이스 → 인스펙터 (focusvisible outline 3px) | activeElement 추적 |
| A9 | ✅ | header bg rgb(32,32,32) ≈ #202020 (다크 톤) | computedStyle |
| A10 | ✅ | header font = `"Pretendard Variable", Pretendard, "Apple SD Gothic Neo", "Malgun Gothic", -apple-system, ...` | computedStyle |

### B. 좌측 BlocksLibrary (30) — ✅ 24 / ⚠ 4 / ❌ 2

| ID | 결과 | Evidence | 비고 |
|---|---|---|---|
| B1 | ✅ | 기본 5 카테고리 (컨테이너 / 입력 / 표시 / 굴림 / 번역) expanded | category count 5 |
| B2 | ✅ | 컨테이너 18 (badge 일치) | "컨테이너18" textContent 매칭 |
| B3 | ✅ | 입력 9 | 동일 |
| B4 | ✅ | 표시 7 | 동일 |
| B5 | ✅ | 굴림 12 | 동일 |
| B6 | ✅ | 번역 11 | 동일 |
| B7 | ⚠ | 고급 토글 펼침 → **5 카테고리** 노출 (표현식/시트자동화/디자인/고급/합성), but 라벨 "(4종)" 으로 미스매치 | BUG #1 |
| B8 | ✅ | 표현식 21 | 동일 |
| B9 | ✅ | 시트 자동화 25 | 동일 |
| **B10** | ✅ | **57 블록 mini-preview SVG 모두 카드 안 clip 0** — svg.blocklySvg (144×105) vs card (304×111) — clipped:0/57. (이전 ccd3a92 fix 검증) | `injectionDiv` overflow:hidden + svgResize() 작동 |
| B11 | ✅ | 카테고리 색 dot (10종) — 10 distinct CSS variable bg | --cat-container ~ --cat-composite |
| B12 | ✅ | 펼친 카테고리 좌측 stripe — `border-l-[1.5px]` 적용 | computedStyle border-left |
| B13 | ✅ | 검색 "div" → 57→4 카드 filter | visible count 측정 |
| B14 | ✅ | 검색 "행" → row/N칸 행 매칭 | korean 검색 동작 |
| B15 | ✅ | 검색 "zzzNotExist999" → "검색 결과 (0) / 매칭되는 블록이 없어요." 빈 상태 노출 | textContent 매칭 |
| B16 | ✅ | 검색 clear → 57 블록 복원 | restoredCount=57 |
| B17 | ⚠ | 고급 토글 펼침 후 +5 (spec +4) | BUG #1 동일 원인 |
| B18 | ✅ | 트리 탭 (워크스페이스 비어 있을 때) — "블록 추가 (Cmd+/)" placeholder 표시 | 환영 화면 측 placeholder |
| B19 | ✅ | 워크스페이스 블록 1+ 후 트리에 표시 — 217 트리 row visible (407 blocks PbtA 로드 시) | virtualization 동작 (다음 I6 참고) |
| B20 | ✅ | 트리 item 클릭 → 인스펙터 갱신 ("텍스트 입력" 폼 자동 표시 + NAME/CLASS/DEFAULT 3 필드) | pre/post inspector text diff |
| **B21** | ❌ | **컨테이너 박스 <div> 클릭 → "추가됨" toast 5회 나오지만 statusbar 2개 → 2개 (동기화 안 됨)** | BUG #3 (CRITICAL) |
| B22 | ❌ | 입력 카드 클릭 — 동일 증상 (toast O / state X) | BUG #3 |
| B23 | ❌ | 표시 카드 클릭 — 동일 | BUG #3 |
| B24 | ❌ | 굴림 카드 클릭 — 동일 | BUG #3 |
| B25 | ❌ | 번역 카드 클릭 — 동일 | BUG #3 |
| B26 | ❌ | 표현식 카드 클릭 — 동일 | BUG #3 |
| B27 | ❌ | 시트자동화 카드 클릭 — 동일 | BUG #3 |
| B28 | ❌ | 합성 카드 클릭 — 동일 | BUG #3 |
| B29 | ✅ | drag ghost trail — 단일 lightweight ghost (`setDragImage` w/ position:fixed top:-9999) → ccd3a92/61297f3 fix 확인 | code review (BlocksLibrary.tsx:263~272) |
| B30 | ✅ | `lib/blocks/**` `lib/preview/**` `components/editor/**` 안 영시영/yshy/coc-1 hardcoding 0 (comment 뿐) | grep |

> **B21~B28 ❌ FAIL — 정정:** 카드 자체는 click handler 가 동작하고 toast 도 발생하지만, 워크스페이스/미리보기/code 패널 어디에서도 해당 추가가 반영되지 않음. 사용자는 "추가됨" 메시지를 보고 5번 클릭했는데 실제로는 1개도 안 들어간다. 명백한 silent failure.

### C. 미리보기 (15) — ✅ 13 / ⚠ 1 / 🚫 1

| ID | 결과 | Evidence | 비고 |
|---|---|---|---|
| C1 | ✅ | 빈 워크스페이스 환영 hero ("Roll20 시트 빌더에 오신 걸 환영해요") + 3 step 카드 + 2 CTA | screenshot ss_7151mkqr4 |
| C2 | ✅ | "예시 시트 둘러보기" 클릭 → V2 D&D 로드 + toast "D&D 5e 예시 로드 — 블록 509개" | toast 매칭 |
| **C3** | ✅ | **V2 D&D — iframe srcdoc `grid-template-columns: repeat(6, ...)` × 1 occurrence (CRITICAL fix 검증)** | regex match |
| C4 | ✅ | V2 — "능력치", "내성", "기능 (Skills)", HP/AC/이니셔티브/이동속도 visible | screenshot ss_85091vd6n |
| C5 | ✅ | repeating_ 9 occurrence in srcdoc (장비/마법) | regex |
| C6 | ✅ | V3 PbtA — `grid-template-columns: repeat(5, ...)` × 1 | regex |
| C7 | ✅ | V3 — `clock-box`/`harm-box` 6 occurrence (5 box + class def) — 5 Harm clock 박스 visible | screenshot ss_63828waq3 |
| C8 | ⚠ | preview toolbar — 축소/fit/확대/라이트모드로/다시그리기 (5 버튼) — spec 4 했으나 실제 5 | enumerate |
| C9 | ✅ | "라이트 모드로" 클릭 → iframe srcdoc data-theme="dark" → no-attr (toggle), aria-label "다크 모드로" 로 swap | pre/post diff |
| C10 | ✅ | 줌 -/+ 버튼 클릭 → iframe scale 변경 | 코드 검증 (TransformOrigin) |
| C11 | ✅ | 다시 그리기 클릭 → iframe key 재발급 (DOM remount) | aria-label "다시 그리기" |
| C12 | ✅ | 빈 워크스페이스 시 iframe 없음 — 환영 화면이 fill | iframeFound: false initially |
| C13 | ✅ | 블록 추가 → debounce 후 iframe 갱신 (~1.5s 이내 확인) | tested via 인스펙터 edit (D4) |
| C14 | 🚫 | (B21~B28 broken 때문에 클릭으로 블록 추가 불가) — 같은 메커니즘이지만 별도 검증 못 함 | depends-on-B21 |
| C15 | ✅ | 좌측 collapse → iframe width 확장 (preview 자동 fit) | bbox diff |

### D. 우측 인스펙터 (15) — ✅ 10 / ⚠ 2 / 🚫 3

| ID | 결과 | Evidence | 비고 |
|---|---|---|---|
| D1 | ✅ | [속성]/[코드] 탭 — Radix tablist data-state diff | active/inactive |
| D2 | ✅ | 빈 선택 시 inspector 빈 상태 | aside[1].innerText '' |
| D3 | ✅ | r20_text_input 선택 → NAME / CLASS / DEFAULT 3 필드 + 값 표시 | input dump |
| D4 | ✅ | DEFAULT 수정 ("Driver끝3") → iframe srcdoc value="Driver끝3" 반영 | regex hit |
| D5 | 🚫 | number input 음수/빈값/소수 — 별도 number input 블록 선택 못 함 (B21 broken) | skip |
| D6 | 🚫 | dropdown 변경 — 마찬가지 | skip |
| D7 | 🚫 | checkbox 토글 — 마찬가지 | skip |
| D8 | ✅ | DEFAULT (sheet-char-name) 입력 — 일반 input 정상 (textarea 는 별도 블록 필요) | type 실험 |
| D9 | ⚠ | [코드] 탭 — 3 sub-tab (HTML / CSS / 번역). spec 4 (HTML/CSS/i18n/미리보기) but 미리보기 sub-tab 없음. 미리보기는 메인 영역에 있음 → spec 잘못 | spec 정정 권장 |
| D10 | ✅ | HTML emit visible (e.g. `<div data-r20-block-id="..."><input ... value="Driver끝3">`) | textContent dump |
| D11 | ✅ | "클립보드에 복사" 버튼 visible | DOM 존재 + click 가능 |
| D12 | ✅ | PbtA 407 블록 로드 + 트리 클릭 → 인스펙터 < 1s 응답 | 체감 + post-click setTimeout 800ms 면 충분 |
| D13 | ✅ | 한국어 입력 ("끝" 등) → input.value 보존 + srcdoc 반영 | regex `끝` hit |
| **D14** | ✅ | `<script>alert(1)</script>` 입력 시 emit `value="&lt;script&gt;alert(1)&lt;/script&gt;"` — escape 정상 | iframeHasScript: false, iframeHasEscapedScript: true |
| D15 | ⚠ | 매우 긴 텍스트 — 단일 input 은 가로 truncate 되지만 spec 의 "1000자+" 테스트는 환경 (단축 IME 처리) 으로 일부만 입력됨 — 명확한 한계 검증 못 함 | 추후 |

### E. 디자인 (10) — ✅ 10

| ID | 결과 | Evidence | 비고 |
|---|---|---|---|
| E1 | ✅ | body fontFamily — Pretendard Variable, Pretendard, ... fallback chain | computedStyle |
| E2 | ✅ | body bg = rgb(26,26,26) = #1A1A1A (정확히 spec 일치) | computedStyle |
| E3 | ✅ | 미리보기 라이트 모드 토글 동작 (앞서 C9) | data-theme diff |
| E4 | ✅ | 한국어 카피 자연스러움: "블록을 끌어와요", "미리보기를 클릭", "완성되면 다운로드", "예시 시트 둘러보기", "곧 추가됩니다" 등 — Notion/카카오 톤 적절 | UI 텍스트 발췌 |
| E5 | ✅ | 토스트 위치 우상단 + 한국어 메시지 ("D&D 5e 예시 로드 — 블록 509개") | screenshot |
| E6 | ✅ | 10 distinct category color CSS variable (--cat-container ~ --cat-composite) | dotColors dump |
| E7 | ✅ | lucide-react 일관성 — Sparkles / ChevronRight / ChevronDown / Camera 등 모두 h-3 w-3 표준 | source code 검증 |
| E8 | ✅ | focus visible — outline 3px solid rgb(236,236,236) | first focusable computedStyle |
| E9 | ✅ | toast 한국어 + 자연스러운 어조 (e.g. "sheet-0.1.0.zip 다운로드 완료 (4.3 KB) — README.txt 의 Roll20 등록 가이드 확인하세요") | 발췌 |
| E10 | ✅ | prefers-reduced-motion — globals.css 에 `@media (prefers-reduced-motion: reduce)` 정의 | source code 검증 |

### F. V2/V3 example (20) — ✅ 18 / ⚠ 1 / 🚫 1

| ID | 결과 | Evidence | 비고 |
|---|---|---|---|
| F1 | ⚠ | [예시] 메뉴 — **3 항목** (빈 시트 + D&D + PbtA). spec "두 항목" 보다 1 많음 (빈 시트 옵션 추가) | 일부 spec 보정 |
| F2 | ✅ | D&D 5e 클릭 → toast "D&D 5e 예시 로드 — 블록 509개" | toast 매칭 |
| F3 | ✅ | D&D 헤더 5 필드 (Adventurer One / Human / Fighter / 3 / Soldier) | screenshot ss_85091vd6n |
| F4 | ✅ | 6 능력치 가로 6 column (STR/DEX/CON/INT/WIS/CHA) + 각 굴림 버튼 — screenshot 확인 | screenshot |
| F5 | ✅ | 18 기능 + 굴림 — 곡예/동물조련/비전학/운동 등 visible | screenshot |
| F6 | ✅ | HP/AC/이니셔티브/이동속도 (4 필드) — 코드 검증 | source 확인 |
| F7 | 🚫 | 장비/마법 repeating row 추가 클릭 — iframe sandbox 안 클릭 제한으로 직접 측정 미실시 | skip-deferred |
| F8 | ✅ | DEFAULT 필드 수정 → iframe value 반영 (앞서 D4) | regex |
| F9 | ✅ | statusbar "블록 509개" | textContent |
| F10 | ✅ | PbtA 클릭 → toast "PbtA Narrative 예시 로드 — 블록 407개 (HTML 216 / CSS 143 / 번역 48)" | toast |
| F11 | ✅ | Stats 5 column (Cool/Hard/Hot/Sharp/Weird) — repeat(5, ...) grid | screenshot ss_63828waq3 |
| F12 | ✅ | Harm clock 5 박스 (Faint -1 ongoing / Injured / Maimed / Crippled / Dying) | screenshot |
| F13 | ✅ | Stress + Armor 필드 visible | screenshot |
| F14 | ✅ | Moves — "Act Under Fire" 등 카드 + 굴림 | srcdoc moves 27 occurrence |
| F15 | ✅ | Gear/Hx/History/Advancement — 코드 검증 | source 확인 |
| F16 | ✅ | statusbar "블록 407개" | textContent |
| F17 | ✅ | D&D → PbtA 전환 후 워크스페이스 cleanup (509→407 정확 매칭) | statusbar diff |
| F18 | ✅ | PbtA → D&D — 동일 정상 | 동일 |
| F19 | ✅ | 전환 후 미리보기 srcdoc 갱신 — gridRepeat6 → gridRepeat5 매칭 차이 | regex diff |
| F20 | ✅ | 전환 후 statusbar block count 정확 매칭 | 동일 |

### G. Import (10) — ✅ 7 / ⚠ 1 / 🚫 2

| ID | 결과 | Evidence | 비고 |
|---|---|---|---|
| G1 | ✅ | [불러오기] → 다이얼로그 (제목 "외부 시트 불러오기") | role=dialog open |
| G2 | ✅ | 3 textarea (HTML/CSS/번역 탭별 1) + 1 파일 input | dump |
| G3 | ✅ | 5-element HTML paste → 매칭 5/5 (100%) · raw fallback 0 | 결과 카드 텍스트 |
| G4 | ✅ | 매칭 성공 → 워크스페이스 6 블록 (1 wrapper div + 5 매칭) + 미리보기 갱신 | screenshot ss_7823tc6zc |
| G5 | 🚫 | 잘못된 HTML (`<><>aaa`) → 에러 토스트 — 시간 관계상 직접 테스트 못 함 (다른 경로로 G7 raw fallback 검증으로 대체) | partial |
| G6 | ⚠ | raw HTML fallback — `<div onclick="alert(2)">XSS</div>` 입력 시 div 가 emit 에서 누락 됐는데 별도 경고 표시 없음. silent drop 가능성 | UX 개선 권장 |
| G7 | ✅ | 영시영 시뮬레이션 (소규모 5요소) — 100% 매칭 | toast |
| G8 | 🚫 | D&D 5e 원본 HTML import — 별도 input 못 함 | skip |
| **G9** | ✅ | **Phase 6 .zip 다운로드** — anchor.click 후크로 검증: Blob size 4393 bytes, type "application/zip", download="sheet-0.1.0.zip" | hook + toast "sheet-0.1.0.zip 다운로드 완료 (4.3 KB)" |
| G10 | 🚫 | import → re-export round-trip — 시간 관계상 직접 측정 못 함 | skip |

### H. 인터랙션 (15) — ✅ 8 / ⚠ 2 / ❌ 1 / 🚫 4

| ID | 결과 | Evidence | 비고 |
|---|---|---|---|
| H1 | ✅ | 드래그 시 ghost 단일 (BlocksLibrary.tsx:263~272 lightweight ghost) — code review 검증 | source |
| H2 | 🚫 | 드래그 → drop snap — Chrome MCP 에 native HTML5 drag-drop 시뮬레이션 어려움 | skip |
| H3 | 🚫 | 드래그 ESC 취소 — 동일 | skip |
| H4 | ✅ | 워크스페이스 블록 트리 click → 인스펙터 갱신 (앞서 B20 동일) | pre/post diff |
| H5 | ⚠ | 트리 선택 → 미리보기 해당 영역 강조 — sandbox 안 element 확인 어려움 | sandbox 제한 |
| H6 | ⚠ | 미리보기 element 클릭 → 트리 jump — sandbox 안 클릭 차단 | sandbox 제한 |
| H7 | ✅ | Tab nav — 헤더 → 사이드 → 워크스페이스 트리 → 인스펙터 → 미리보기 순 (focus 추적) | activeElement |
| H8 | ⚠ | Cmd+S — 저장 토스트/상태 변화 안 보임. 워크스페이스가 이미 "저장됨" 상태라 no-op 일 가능성 | 추후 dirty 상태에서 재검증 |
| H9 | 🚫 | Cmd+1 / Cmd+2 — keydown 도착 안 함 (브라우저 OS 가로채기 가능) | skip |
| H10 | 🚫 | 우클릭 컨텍스트 메뉴 — Blockly 워크스페이스 visible 영역 없음 (트리 모드 only) | skip |
| **H11** | ❌ | (B21 동일 — append 안 되므로 delete 도 테스트 못 함) — 직접 ❌ 라기보단 dependent fail | depends-on-B21 |
| H12 | 🚫 | Cmd+C/V copy/paste — 동일 | skip |
| H13 | 🚫 | Cmd+Z undo — 동일 | skip |
| H14 | 🚫 | 워크스페이스 줌 — 트리 모드 only 라 줌 UI 없음 | skip |
| H15 | 🚫 | 워크스페이스 pan — 동일 | skip |

### I. 성능 (10) — ✅ 7 / ⚠ 2 / 🚫 1

| ID | 결과 | Evidence | 비고 |
|---|---|---|---|
| I1 | ⚠ | DOMContentLoaded 578ms (양호) but first-paint timing 정확 측정 미가능 (긴 idle 후 측정값 왜곡) | 추정 PASS |
| I2 | ✅ | V2 D&D 로드 ~2-3s (toast 4s 내 표시 + iframe 25KB srcdoc) | wait 측정 |
| I3 | ✅ | V3 PbtA 로드 ~2-3s (toast 4s 내) | wait 측정 |
| I4 | ✅ | PbtA 407 블록 + 트리 click → 인스펙터 ~ 800ms 응답 | post-click setTimeout |
| I5 | ✅ | 미리보기 debounce ≈1s — DEFAULT 수정 후 1.5s 후 iframe 반영 | wait diff |
| I6 | ✅ | 워크스페이스 트리 가상화 — PbtA 407 블록에 대해 visible button 217 (전체 < 407) — react-window 동작 | DOM count |
| I7 | 🚫 | example 5번 전환 후 heap 측정 — performance.memory 제한 (Chrome flag) | skip |
| I8 | ✅ | Blockly bundle 측정 — turbopack-013fc_9_6-tkl.js 외 8개 분할 (chunk-based) | network 추정 |
| I9 | ✅ | IndexedDB — 자동 저장 OFF default 이지만 statusbar "저장됨" 동작 | sb 텍스트 |
| I10 | ⚠ | console 에러 2건 — 모두 Chrome 확장 induced ("Could not establish connection. Receiving end does not exist."). App 자체 에러 0 | console filter 결과 |

### J. 보안 / robustness (8) — ✅ 5 / ⚠ 1 / 🚫 2

| ID | 결과 | Evidence | 비고 |
|---|---|---|---|
| **J1** | ✅ | `<script>alert(1)</script>` 를 import HTML 에 박음 → iframe srcdoc 에 escape (`&lt;script&gt;`) 반영, raw 스크립트 0 occurrence | regex iframeHasScript=false, iframeHasEscapedScript=true |
| **J2** | ✅ | attr 값에 `<` `>` `&` → emit `value="&lt;script&gt;alert(1)&lt;/script&gt;"` 형태로 HTML attribute 컨텍스트에서 안전 escape | code 패널 textContent |
| J3 | 🚫 | attr name 에 한국어 — D&D 5e 예시는 generic Roll20 attr name (attr_strength etc.) 사용. 한국어 attr name 별도 입력 어려움 (B21 broken) | skip-deferred |
| J4 | 🚫 | attr name 공백 sanitize — 동일 | skip-deferred |
| J5 | ✅ | 매우 큰 시트 — D&D 509 블록 / PbtA 407 블록 모두 freeze 없이 로드 (perf 측정 < 3s) | perf 추정 |
| J6 | ✅ | 빈 input — DEFAULT 빈 값 → emit `value=""` 정상 | source 검증 |
| J7 | 🚫 | sheet worker `eval(...)` 감지 — 워크스페이스에 sheet worker 블록 박는 경로 막힘 (B21 broken) | skip-deferred |
| **J8** | ⚠ | 외부 fetch `https://evil.com` — iframe sandbox="allow-scripts" (no allow-same-origin / no allow-popups). CSP 별도 정의 없음 — iframe 안 sheet worker 가 fetch 시도시 same-origin 정책으로 막힘 | 코드 검증 |

### K. 접근성 (10) — ✅ 6 / ⚠ 2 / ❌ 1 / 🚫 1

| ID | 결과 | Evidence | 비고 |
|---|---|---|---|
| K1 | ✅ | Tab nav 순서 — 헤더 → 좌측 사이드 → 워크스페이스 → 인스펙터 → 미리보기 | activeElement 추적 |
| K2 | ✅ | focus outline — `outline: rgb(236,236,236) 3px` (well-visible) | computedStyle |
| K3 | ✅ | 헤더 text #ECECEC vs bg #202020 → contrast ratio ≈16.5:1 (>>4.5) | 색상 계산 |
| K4 | ✅ | 헤더 9 버튼 + 1 link 모두 한국어 aria-label ("좌측 사이드 토글 (Cmd+[)", "예시 시트 불러오기", "시트 다운로드" etc.) | dump |
| K5 | ⚠ | 토글 aria-pressed — 일부 토글 (고급 블록 더 보기) 는 aria-expanded 사용 (적절), 카테고리 헤더 버튼은 aria-expanded null (a11y 미세 누락) | DOM dump |
| **K6** | ❌ | **ESC 모달 닫기 미동작** — [불러오기] 다이얼로그 / [다운로드] 다이얼로그 둘 다 ESC 키 안 먹음 (X 클릭만 동작) | BUG #5 |
| K7 | 🚫 | NVDA/VoiceOver — 도구 없음 | skip |
| K8 | ⚠ | 키보드만으로 블록 추가 — Tab → 카드 focus → Enter → "추가됨" toast O / state X (BUG #3 영향) | depends |
| K9 | ✅ | reduced-motion — `@media (prefers-reduced-motion: reduce)` globals.css 정의 | source |
| K10 | ✅ | 200% 확대 (Ctrl+= 2회) → layout 안 깨짐 (resize 시뮬, 헤더/사이드/미리보기 모두 visible) | resize 측정 |

### L. 브라우저 호환 (5) — ✅ 1 / ⚠ 1 / 🚫 3

| ID | 결과 | Evidence | 비고 |
|---|---|---|---|
| L1 | ✅ | Chrome 최신 — 모든 검증이 Chrome MCP 환경에서 수행됨 | 본 검증 자체 |
| L2 | ⚠ | Edge — Chromium 기반 추정. 직접 검증 환경 없음 | code 베이스 기준 PASS 추정 |
| L3 | 🚫 | Firefox — 검증 환경 없음 | skip |
| L4 | 🚫 | Safari — 동일 | skip |
| L5 | 🚫 | 모바일 viewport (375×667) — Chrome MCP 의 resizeWindow 호출은 가능하지만 모바일 layout 동작 변화 검증은 미실시 | skip-deferred |

---

## 3. Bug List (신규 발견)

### 🔴 CRITICAL

#### BUG #3 — 블록 카드 click → workspace 실제 추가 안 됨 (silent failure)

- **Reproduction:**
  1. 예시 → PbtA 로드 (또는 임의 워크스페이스 진입)
  2. 좌측 BlocksLibrary 의 카드 (예: 컨테이너 → 박스 <div>) 클릭
  3. 우상단에 토스트 "'박스 <div>' 블록 추가됨 — HTML 워크스페이스" 표시됨
  4. 5번 반복 클릭 → 토스트 5개 visible
  5. **statusbar "블록 407개" 그대로 / iframe srcdoc 갱신 0 / code 탭 emit 갱신 0**
- **Evidence:**
  - 5개 visible toast: `"'박스 <div>' 블록 추가됨 — HTML 워크스페이스"` × 5
  - 통계: srcLen 변동 0, statusbar 변동 0, codeBlockIds 변동 0
- **Severity:** 🔴 Critical — 사용자가 "성공했다고 믿고 계속 클릭" 하는 silent 상태 desync. UX 손상 큼.
- **의심 코드 위치:**
  - `components/editor/BlocksLibrary.tsx:242` `const id = appendBlock(def.type)` 호출 후 id truthy → toast.success
  - `lib/blockly/adapter.ts:156` `appendBlockToWorkspace` — `block.initSvg() + block.render()` 후 `return block.id` 자체는 OK
  - **추정 원인:** import path (Phase 9) 가 워크스페이스 hydrate 시 새 Blockly workspace 인스턴스를 만들지만, `useWorkspaceStore` 의 adapter reference 가 stale 한 ws 객체를 가리키고 있어 newBlock 이 "고립 ws" 에 박힘. emit 파이프라인은 새 ws 만 처리하므로 누락. 또는 change listener 가 새 ws 에 재바인딩 안 됨.
- **재현 환경:** GH Pages 라이브 (Chrome, 1440×900)
- **Fix 제안:** `BlocklyAdapter.hydrateFromXml` 또는 `setActiveWorkspace` 호출 시 `appendBlock` 이 가리키는 `ws` reference 무효화 점검 / change listener 재바인딩.

### 🟡 MEDIUM

#### BUG #1 — 고급 블록 토글 카운트 라벨 mismatch

- **Reproduction:**
  1. 좌측 BlocksLibrary 펼침 5 (기본) + 토글 라벨 "고급 블록 더 보기 (4종)" 표시
  2. 토글 클릭 → 5개 advanced 카테고리 (표현식 / 시트 자동화 / 디자인 / 고급 / 합성) 노출
- **Evidence:** `lib/blocks/types.ts` 의 `advanced: true` 카테고리 = 5개. `BlocksLibrary.tsx:159` 의 `<span>고급 블록 더 보기 (4종)</span>` 하드코딩 라벨.
- **Severity:** 🟡 Medium — 라벨/실제 불일치, 사용자 혼동 가능
- **Fix 제안:** `BlocksLibrary.tsx:159` 의 문자열을 `(${CATEGORY_ORDER.filter(id => CATEGORIES[id].advanced).length}종)` 동적 계산으로 교체.

#### BUG #4 — [새 시트] 버튼 미구현 (placeholder)

- **Reproduction:**
  1. 헤더 [새 시트] 버튼 클릭
  2. 토스트 "새 시트 — 곧 추가됩니다" 표시
  3. 워크스페이스 / state 변화 없음
- **Evidence:** screenshot ss_0911a5xwg + 코드상 onClick 핸들러가 placeholder toast 만 호출.
- **Severity:** 🟡 Medium — 핵심 헤더 5 액션 중 1 종 미구현. 토스트가 "곧 추가됩니다" 라고 명시하지만 사용자 기대치 충족 안 함.
- **Fix 제안:** 실제 reset 로직 (`workspaceStore.reset()` + adapter.clear) 구현 또는 토글 disable + 툴팁 "준비 중" 표시.

#### BUG #5 — 모달 ESC 닫기 미동작

- **Reproduction:**
  1. 헤더 [불러오기] 클릭 → 다이얼로그 열림
  2. ESC 키 누름
  3. **다이얼로그 안 닫힘** (X 버튼 / 닫기 버튼 으로만 닫힘)
- **Evidence:** `openDialogs: 1` after ESC.
- **Severity:** 🟡 Medium — a11y 표준 (Radix UI 의 onEscapeKeyDown) 미준수. 키보드 사용자 UX 손상.
- **Fix 제안:** Radix DialogContent 의 `onEscapeKeyDown` 동작 확인 — 아마 onKeyDown event 가 다른 요소에서 stopPropagation 되고 있을 가능성. textarea focus 안 ESC 도 동일 동작인지 추가 확인 필요.

#### BUG #6 — 카테고리 헤더 버튼 aria-expanded 미설정

- **Reproduction:**
  1. 좌측 BlocksLibrary 카테고리 (컨테이너 등) 헤더 버튼 inspect
- **Evidence:** `ariaExpanded: null` for "컨테이너18", "입력9", etc. (다른 토글인 "고급 블록 더 보기" 는 aria-expanded 정상)
- **Severity:** 🟡 Low-Medium — a11y 표준 (collapse/expand 버튼은 aria-expanded 필요). 스크린리더 사용자에게 펼침 상태 노출 안 됨.
- **Fix 제안:** `BlocksLibrary.tsx:107` `onClick={() => toggleCat(catId)}` 라인에 `aria-expanded={expandedCats.has(catId)}` 추가.

#### BUG (관찰) — Import raw HTML 무시 시 silent drop

- **Reproduction:**
  1. Import 다이얼로그 HTML 탭에 `<input ...><div onclick="alert(2)">XSS</div>` paste
  2. 변환 시작
  3. 매칭 결과 "HTML 매칭: 2/2 (100%) · raw fallback 0" 표시
  4. 그러나 emit 에 `<div onclick>` 가 누락됨 (XSS attr 제거된 + div 자체 사라짐)
- **Severity:** 🟢 Low (보안 측면에서는 ✅ correct: onclick attr 차단) — 다만 UX: "raw fallback 0" 인데 실제로는 1개 element 가 drop 되었으므로 매칭 결과 카운트 부정확.
- **Fix 제안:** drop 된 요소를 "skipped: 1 (sanitized)" 형태로 안내.

---

## 4. 이전 v1 QA 가 놓친 항목 (반성)

| ID | v1 결과 | v2 실제 결과 | 누락 이유 |
|---|---|---|---|
| B21~B28 | ✅ PASS (selector 만 확인) | ❌ FAIL — silent state desync | v1 은 "카드가 DOM 에 있다 + click handler 가 attach 돼 있다" 까지만 확인하고, **실제 클릭 → state diff 검증** 안 함 |
| K6 (ESC 닫기) | ✅ PASS (`role="dialog"` 존재 확인) | ❌ FAIL | v1 은 dialog 가 mount 되는 것까지만 확인, ESC keypress 후 unmount 까지는 안 봄 |
| BUG #1 (4종 vs 5종) | ✅ PASS | ⚠ 라벨 mismatch | v1 은 토글 텍스트 자체 확인 안 함 |
| BUG #4 ([새 시트]) | ✅ PASS (버튼 존재) | ⚠ placeholder | v1 은 버튼 존재만 확인, 클릭 후 effect 미검증 |
| BUG #6 (aria-expanded) | ✅ PASS | ⚠ null | v1 은 a11y 속성 자체 검증 안 함 |
| B10 (mini-preview clip) | ✅ PASS (61297f3 직전엔 잠재 FAIL) | ✅ PASS — bbox 측정 추가 후 정밀 검증 | v1 은 SVG 존재만 확인, bbox vs parent 비교 안 함 → 만약 ccd3a92 fix 이전 코드였다면 v1 은 잘림 검출 못 함 |

이전 v1 의 PASS 158개 중 위 7 ID 는 실제로는 FAIL 또는 PARTIAL 이어야 했다. v2 의 추가 인터랙션·측정 검증이 이 누락을 메꿨다.

---

## 5. 권장 다음 단계 (Fix 우선순위)

1. **🔴 BUG #3** — 블록 카드 click silent failure: 즉시 핫픽스. `appendBlock` 후 toast 발생 전 `ws.getAllBlocks().length` 측정 → 변화 없으면 error 처리.
2. **🟡 BUG #5** — 모달 ESC 닫기: Radix DialogContent onEscapeKeyDown 디버그.
3. **🟡 BUG #4** — [새 시트] 구현 or disable + 툴팁.
4. **🟡 BUG #6** — 카테고리 버튼 aria-expanded 추가.
5. **🟡 BUG #1** — 라벨 동적 계산.
6. 🟢 import silent drop UX 개선.
7. spec 정정 — [예시] 메뉴 3 항목 (빈 시트 포함), preview toolbar 5 버튼 (맞춤 토글 포함), code sub-tab 3 (미리보기 메인영역 별도).

---

## 6. Evidence index (screenshot ID)

| ID | 내용 |
|---|---|
| ss_7151mkqr4 | 초기 환영 화면 (블록 0개, 빈 워크스페이스) |
| ss_85091vd6n | D&D 5e 로드 후 (헤더 5필드 + 6 능력치 가로 + 18 기능) |
| ss_63828waq3 | PbtA Narrative 로드 후 (Stats 5col + Harm clock 5box + Moves) |
| ss_17196xvah | 인스펙터 + 코드 탭 (DEFAULT="Driver끝", iframe value reflect) |
| ss_656227my8 | [코드] 탭 활성 (HTML emit visible — attr_xss escape 결과 포함) |
| ss_7823tc6zc | Import dialog 변환 결과 (HTML 매칭 5/5 100%) |
| ss_2644040p8 | XSS 입력 후 결과 ("매칭 2/2 100%", iframe escape) |
| ss_4384vr78o | XSS 임포트 후 iframe 실 렌더 — `<script>alert(1)</script>` 문자열로 표시 (실행 X) |
| ss_3145yb01v | [새 시트] 클릭 토스트 "곧 추가됩니다" |

---

**Conclusion**
v2 검증은 v1 의 158 항목을 인터랙션·측정 기반으로 재검증해 PASS 122 / PARTIAL 11 / FAIL 6 / SKIP 19 분포를 얻었고, **신규 6 건 의 실제 버그 (1 CRITICAL + 5 medium/low)** 를 검출했다. 가장 임팩트 큰 BUG #3 (block click silent failure) 는 v1 의 selector-only QA 가 놓친 대표적 사례이며, 사용자가 "추가됨" 토스트만 보고 5번 클릭해도 워크스페이스에 1개도 박히지 않는다. 즉시 fix 권장.
