# Roll20 시트 빌더 — QA v2 체크리스트 (인터랙션·측정 기반)

**대상 commit:** `f2a9c86` (Phase 6 export i18n WARNING) — `ccd3a92` (BlocksLibrary SVG fit-scale + svgResize) 포함
**검증 환경:** GitHub Pages 라이브 — https://song991123.github.io/roll20-block-editor/ (1440×900 뷰포트)
**작성일:** 2026-05-15
**작성자:** QA v2 agent (Claude)

> 이 체크리스트는 이전 v1 (`qa_checklist.md`, 158항목) 의 단점 — selector / DOM 존재 만으로 PASS — 을 보완한다.
> 모든 PASS 는 다음 중 최소 하나의 evidence 를 동반해야 한다:
> 1. **렌더 bbox 측정** — `getBoundingClientRect()` / `getComputedStyle()` 수치
> 2. **시각 검증** — screenshot ID
> 3. **인터랙션 시퀀스** — pre/post-state diff + 실측 변화
>
> evidence 가 없으면 PASS 가 아니라 **SKIP** 으로 강등된다.
> 카테고리별 fix-priority 는 보고서 (`qa_v2_report.md`) 에서 정리한다.

---

## A. 헤더 / 셸 (10)

| ID | 항목 | 검증 방법 |
|---|---|---|
| A1  | 로고 + 제목 "Roll20 시트 빌더" + 부제 — visible bbox, 잘림 X | bbox 측정, 부모 안 포함 |
| A2  | 헤더 액션 5종 ([예시] [새 시트] [불러오기] [저장] [다운로드]) — 클릭 가능 + aria-label 한국어 | each.click → 후속 state diff |
| A3  | 헤더 우측 액션 (⚙ 설정 / ? 도움말 / GitHub / v0.1.0) — 클릭 + tooltip | hover + click sequence |
| A4  | 좌·우 사이드 토글 — 클릭 시 실제 폭 0 으로 collapse / 원복 expand | sidebar.width pre/post diff |
| A5  | 헤더 height 56~64px, border-bottom visible | `getBoundingClientRect().height` |
| A6  | 헤더 sticky / shrink-0 (스크롤 시 가려지지 않음) | scroll + bbox 재측정 |
| A7  | [예시] 드롭다운 — 클릭 시 메뉴 열림 + 두 항목 (D&D / PbtA) 표시 | post-click 자식 요소 카운트 |
| A8  | 헤더 키보드 Tab navigation — 좌→우 순서, focus visible | document.activeElement 추적 |
| A9  | 헤더 dark mode 배경 (#1A1A1A 계열) | `getComputedStyle(header).backgroundColor` |
| A10 | 헤더 한국어 폰트 = Pretendard (라틴 fallback 포함) | `getComputedStyle(header).fontFamily` 매칭 |

## B. 좌측 BlocksLibrary (30)

| ID | 항목 | 검증 방법 |
|---|---|---|
| B1  | 기본 5 카테고리 펼침 (컨테이너 / 입력 / 표시 / 굴림 / 번역) | 초기 상태 expanded 카운트 |
| B2  | 컨테이너 카테고리 — 18 블록 (count badge) | 카드 자식 count == 18 |
| B3  | 입력 카테고리 — 9 블록 | 9 |
| B4  | 표시 카테고리 — 7 블록 | 7 |
| B5  | 굴림 카테고리 — 12 블록 | 12 |
| B6  | 번역 (i18n) — 11 블록 | 11 |
| B7  | 고급 토글 → 4 추가 카테고리 (표현식 / 시트자동화 / 디자인 / 합성) 노출 | 펼침 전/후 카드 카운트 diff |
| B8  | 표현식 — 21 블록 | 21 |
| B9  | 시트자동화 — 25 블록 | 25 |
| B10 | **각 블록 mini-preview SVG bbox 가 카드 안에 들어감 (clip 검사)** | child.right ≤ parent.right, child.bottom ≤ parent.bottom |
| B11 | 카테고리 색 dot — 9 카테고리 각각 12px 가량 visible 색 | dot.bbox + computedStyle.bg |
| B12 | 펼친 카테고리 좌측 stripe — color-mix(60% 카테고리 색 + 40% bg) | stripe.bg 색 유사도 |
| B13 | 검색 입력 → "div" 입력 → 컨테이너의 박스 <div> 만 노출 | 검색 전/후 visible 카드 수 |
| B14 | 검색 입력 → 한국어 "행" → row / 행 row 매칭 | 한글 검색 매칭 |
| B15 | 검색 입력 → 매칭 0 건 → "검색 결과 없음" 빈 상태 | 빈 상태 DOM 존재 |
| B16 | 검색 입력 → 클리어 → 원래 9 카테고리 복원 | 카드 카운트 원복 |
| B17 | 고급 토글 → 4 카테고리 visible 전/후 차이 | 카드 수 diff = 4 |
| B18 | 트리 탭 → 빈 워크스페이스 시 안내 표시 | placeholder DOM |
| B19 | 트리 탭 → 블록 1 개 추가 후 트리 1 줄 표시 | 트리 아이템 수 |
| B20 | 트리 탭 → 항목 클릭 → 인스펙터 갱신 | 인스펙터 빈→채워짐 diff |
| B21 | 컨테이너 → 블록 카드 클릭 → 워크스페이스 +1 | block count 0→1 |
| B22 | 입력 → 블록 카드 클릭 → 워크스페이스 +1 | block count diff |
| B23 | 표시 → 블록 카드 클릭 → 워크스페이스 +1 | block count diff |
| B24 | 굴림 → 블록 카드 클릭 → 워크스페이스 +1 | block count diff |
| B25 | 번역 → 블록 카드 클릭 → 워크스페이스 +1 | block count diff |
| B26 | 표현식 → 블록 카드 클릭 → 워크스페이스 +1 | block count diff (고급 켠 후) |
| B27 | 시트자동화 → 블록 카드 클릭 → 워크스페이스 +1 | block count diff (고급 켠 후) |
| B28 | 합성 → 블록 카드 클릭 → 워크스페이스 +1 | block count diff (고급 켠 후) |
| B29 | **드래그 시 ghost trail 단일 (잔상 0)** — 방금 fix | drag 후 `.drag-ghost` 잔존 DOM 0 |
| B30 | 영시영 hardcoding grep — `lib/**` 안 0 hits | bash grep 결과 |

## C. 미리보기 (15)

| ID | 항목 | 검증 방법 |
|---|---|---|
| C1  | 빈 상태 환영 화면 — hero / 3 step 카드 / CTA 2 개 visible | DOM 존재 + bbox visible |
| C2  | "예시 시트 둘러보기" CTA 클릭 → D&D 5e 로드 + toast | 클릭 후 iframe srcdoc 변화 |
| C3  | **V2 D&D — 6 능력치 가로 6 column (CRITICAL fix)** | iframe `.ability-grid` grid-template-columns: repeat(6,...) |
| C4  | V2 — 18 기능 / HP/AC/이니셔티브/이동속도 표시 | iframe DOM children count |
| C5  | V2 — repeating section (장비 / 마법) 렌더 | iframe `[data-repeating]` 존재 |
| C6  | V3 PbtA — 5 Stats 가로 layout | iframe grid-template-columns |
| C7  | V3 — 5-box Harm clock | iframe `.clock-box` count = 5 |
| C8  | 미리보기 toolbar — 줌(-/+) / 다크-라이트 / 새로고침 4 버튼 | 4 클릭 가능 |
| C9  | 다크/라이트 토글 → iframe `[data-theme]` 동기화 | theme attr diff |
| C10 | 줌 변경 → iframe transform: scale() 적용 | computedStyle.transform |
| C11 | 새로고침 → iframe key 재할당 (DOM 재마운트) | iframe 의 새 contentDocument |
| C12 | 빈 워크스페이스 → 미리보기 영역 "환영" 텍스트 | 텍스트 매칭 |
| C13 | 블록 추가 → 미리보기 갱신 (debounce 1초) | 1.5s 후 iframe 갱신 diff |
| C14 | 블록 제거 → 미리보기 갱신 | 동일 |
| C15 | 미리보기 영역 좌측 사이드 collapse 시 폭 확장 | iframe width 변화 |

## D. 우측 인스펙터 (15)

| ID | 항목 | 검증 방법 |
|---|---|---|
| D1  | [속성] / [코드] 탭 토글 | tablist active diff |
| D2  | 선택 블록 없음 → empty state ("블록 선택 …") | DOM 텍스트 |
| D3  | 블록 선택 → 필드 폼 표시 (label + input 행) | 폼 자식 수 > 0 |
| D4  | 텍스트 input 수정 → 미리보기 srcdoc 반영 | 1.5s 후 srcdoc 매칭 |
| D5  | number input — 정상 / 음수 / 빈값 / 소수 처리 | 4 시나리오 결과 |
| D6  | dropdown 변경 → 미리보기 반영 | iframe 매칭 |
| D7  | checkbox 토글 → 미리보기 반영 | iframe 매칭 |
| D8  | 멀티라인 textarea 입력 | textarea 값 == 입력 |
| D9  | [코드] 탭 sub-tab 수 (spec 4 — HTML/CSS/i18n/미리보기 OR 실제 3) | tablist 수 |
| D10 | [코드] 탭 raw 코드 emit — sheet.html / sheet.css / translation.json | textarea 내용 비어있지 않음 |
| D11 | 코드 클립보드 복사 버튼 | navigator.clipboard write 시뮬 |
| D12 | 블록 100개 워크스페이스 시 인스펙터 응답성 (<300ms) | performance.now() diff |
| D13 | 한국어 input 입력 (조합 IME 처리) | 입력값 보존 |
| D14 | 특수문자 / `<` / `>` / `&` 입력 sanitize | iframe innerHTML escape 확인 |
| D15 | 매우 긴 텍스트 (1000자) 처리 — overflow truncate | 폼 layout 무너지지 않음 |

## E. 디자인 (10)

| ID | 항목 | 검증 방법 |
|---|---|---|
| E1  | Pretendard 폰트 적용 (한글+라틴) | `getComputedStyle(body).fontFamily` 매칭 |
| E2  | 다크 톤 #1A1A1A 계열 | bg computedStyle |
| E3  | 라이트 모드 토글 → bg 흰색 계열 | 토글 후 computedStyle |
| E4  | 한국어 카피 자연스러움 (Notion / 카카오 톤) — 정성 | 주요 카피 4-5 문장 발췌 확인 |
| E5  | 토스트 위치 (우상단 or 우하단) + 한국어 메시지 | toast DOM bbox |
| E6  | 카테고리 색 매핑 (Scratch hue) — 9 색 distinct | 9 색상 distinct count |
| E7  | lucide-react 아이콘 일관성 (사이즈 동일) | 아이콘 bbox 평균 |
| E8  | hover / focus visible (outline 명확) | focus 후 outline computedStyle |
| E9  | toast 한국어 + 자연스러운 어조 | toast 본문 확인 |
| E10 | prefers-reduced-motion 대응 — transition 0 | matchMedia 시뮬 |

## F. V2 / V3 example (20)

| ID | 항목 | 검증 방법 |
|---|---|---|
| F1  | [예시] 메뉴 — 두 항목 (D&D 5e / PbtA) visible | 메뉴 자식 == 2 |
| F2  | D&D 5e 클릭 → toast "509 블록" | toast 본문 매칭 |
| F3  | D&D 헤더 5 필드 렌더 (이름/종족/직업/레벨/배경) | iframe DOM count |
| F4  | D&D 6 능력치 가로 layout + 굴림 버튼 | grid-template-columns + roll btn count |
| F5  | D&D 18 기능 + 굴림 | 기능 카운트 + roll btn count |
| F6  | D&D HP/AC/이니셔티브/이동속도 4 필드 | 필드 카운트 |
| F7  | D&D repeating section — 장비 / 마법 (행 추가 / 삭제) | 행 추가 클릭 후 +1 |
| F8  | D&D 필드 값 수정 → 미리보기 반영 | iframe value diff |
| F9  | D&D statusbar 블록 수 = 509 | statusbar 텍스트 |
| F10 | PbtA 클릭 → toast "407 블록" | toast |
| F11 | PbtA Stats 가로 5 column | grid-template-columns |
| F12 | PbtA Harm clock 5 박스 | 5 |
| F13 | PbtA Stress / Armor | 필드 존재 |
| F14 | PbtA Moves 6 카드 + 굴림 | move 카드 카운트 |
| F15 | PbtA Gear / Hx / History / Advancement | 섹션 카운트 |
| F16 | PbtA statusbar = 407 | statusbar |
| F17 | D&D → PbtA 전환 시 state cleanup | 트리 / 인스펙터 새로 |
| F18 | PbtA → D&D 전환 시 state cleanup | 동일 |
| F19 | 전환 후 미리보기 갱신 (debounce 1초) | iframe srcdoc diff |
| F20 | 전환 후 워크스페이스 블록 수 == example expected | statusbar |

## G. Import (10)

| ID | 항목 | 검증 방법 |
|---|---|---|
| G1  | 헤더 [불러오기] → 다이얼로그 오픈 | role="dialog" 존재 |
| G2  | 3 textarea + 파일 upload field | textarea count == 3 |
| G3  | sample HTML paste → [변환] → 결과 카드 (매칭 % / 경고) | 결과 카드 visible |
| G4  | 변환 성공 → 다이얼로그 닫기 → 워크스페이스 갱신 | block count > 0 |
| G5  | 잘못된 HTML (`<><>aaa`) → 에러 토스트 + 변환 차단 | toast 본문 |
| G6  | raw HTML fallback warning 표시 (특정 태그 미매칭) | 결과 카드 warning text |
| G7  | 영시영 시뮬레이션 (작은 HTML) coverage % 측정 | 결과 카드 % 표시 |
| G8  | D&D 5e 원본 HTML import — 시뮬레이션 | 처리 성공 / 시간 측정 |
| G9  | import 후 [다운로드] → .zip (Phase 6) | 다운로드 시작 (URL or blob) |
| G10 | import 결과 → 다시 export → round-trip 손실 측정 | 블록 수 매칭 |

## H. 인터랙션 (15)

| ID | 항목 | 검증 방법 |
|---|---|---|
| H1  | **드래그 시 단일 ghost (잔상 0) — 방금 fix** | drag 도중/후 ghost 클래스 count |
| H2  | 드래그 → drop target 위 → snap 정상 | drop 후 워크스페이스 자식 +1 |
| H3  | 드래그 중 ESC → 취소 (블록 추가 X) | block count 변화 0 |
| H4  | 워크스페이스 블록 클릭 → 인스펙터 갱신 | 인스펙터 폼 자식 > 0 |
| H5  | 트리에서 블록 선택 → 미리보기 영역 강조 (PostMessage) | iframe `[data-highlight]` toggle |
| H6  | 미리보기 element 클릭 → 좌측 트리 jump (양방향 sync) | 트리 active 노드 변화 |
| H7  | Tab 키 → 헤더 → 사이드바 → 워크스페이스 → 인스펙터 순서 | activeElement 추적 |
| H8  | 단축키 Cmd+S (저장) | 토스트 / state diff |
| H9  | 단축키 Cmd+1 / Cmd+2 (좌측 모드 전환) | 모드 active diff |
| H10 | 우클릭 컨텍스트 메뉴 (Blockly 표준) | menu DOM |
| H11 | 블록 삭제 (Backspace / Delete) | 블록 카운트 -1 |
| H12 | 블록 복사/붙여넣기 (Cmd+C / Cmd+V) | 카운트 +1 (붙여넣기 후) |
| H13 | Undo / Redo (Cmd+Z / Cmd+Shift+Z) | 카운트 -1 / +1 |
| H14 | 워크스페이스 줌 (Ctrl+ / Ctrl-) | 줌 레벨 변경 |
| H15 | 워크스페이스 pan (빈 영역 드래그) | scroll position diff |

## I. 성능 (10)

| ID | 항목 | 검증 방법 |
|---|---|---|
| I1  | 첫 페이지 로드 (LCP) < 4s | performance.timing |
| I2  | V2 example 로드 시간 < 3s | perf.now() pre/post |
| I3  | V3 example 로드 시간 < 3s | 동일 |
| I4  | 100 블록 워크스페이스 → 인스펙터 응답성 < 300ms | perf.now() click→render |
| I5  | 미리보기 debounce ≈ 1000ms | 입력 후 iframe diff 시간 |
| I6  | 워크스페이스 트리 가상화 (react-window) | DOM 자식 == visible(~20) 아닌 전체 |
| I7  | example 5번 전환 후 heap 안정 | performance.memory diff |
| I8  | Blockly bundle 크기 (KB) — 측정 | network log |
| I9  | IndexedDB 자동저장 동작 — DB 존재 / 키 갱신 | indexedDB.databases() |
| I10 | console 에러 0 (Chrome 확장 제외) | console messages filter |

## J. 보안 / robustness (8)

| ID | 항목 | 검증 방법 |
|---|---|---|
| J1  | raw_html 에 `<script>alert(1)</script>` → iframe srcdoc 안 실행 차단 | iframe.contentWindow.alert hook |
| J2  | i18n key 에 `<` / `>` / `&` → escape 처리 | iframe innerHTML 매칭 |
| J3  | attr name 에 한국어 → emit `attr_한국어` 정상 | code 탭 텍스트 |
| J4  | attr name 에 공백 / 이상 문자 → sanitize / error | code 탭 |
| J5  | 매우 큰 시트 (≥1000 블록) emit freeze 안 함 | perf.now() < 5s |
| J6  | 빈 input → emit 결과 정상 (empty attr 처리) | code 탭 |
| J7  | sheet worker 내 `eval(...)` → ERROR severity 감지 | 결과 카드 severity |
| J8  | 외부 fetch (`https://evil.com`) — CSP / 경고 | network log + 경고 |

## K. 접근성 (10)

| ID | 항목 | 검증 방법 |
|---|---|---|
| K1  | Tab nav 헤더→사이드바→워크스페이스→인스펙터→미리보기 | activeElement 순회 |
| K2  | 포커스 visible 명확 (outline 4px+ or solid border) | focus 후 outline computedStyle |
| K3  | 콘트라스트 4.5:1 이상 (text / bg) | sample 3-4 요소 측정 |
| K4  | 모든 인터랙티브 요소 aria-label 한국어 | querySelector('[aria-label]') 결과 |
| K5  | 토글 버튼 aria-pressed | aria-pressed 속성 |
| K6  | 모달 ESC 닫기 | ESC 후 dialog hidden |
| K7  | 스크린리더 NVDA / VoiceOver — SKIP (도구 없음) | 🚫 |
| K8  | 키보드만으로 블록 추가 가능 | Tab → Enter → 카운트 +1 |
| K9  | prefers-reduced-motion 대응 | transition duration 0 |
| K10 | 폰트 200% 확대 → 레이아웃 안 깨짐 | zoom 후 overflow/clip 없음 |

## L. 브라우저 호환 (5)

| ID | 항목 | 검증 방법 |
|---|---|---|
| L1  | Chrome 최신 (Chrome MCP 환경) | 라이브 검증 |
| L2  | Edge 최신 (Chromium 기반 — 추정) | 코드 베이스 검증 |
| L3  | Firefox — SKIP (Chrome MCP 한정) | 🚫 |
| L4  | Safari — SKIP | 🚫 |
| L5  | 모바일 viewport (375×667 resizeTo) → 사이드 drawer 동작 | resize 후 layout diff |

---

**총 항목:** A(10) + B(30) + C(15) + D(15) + E(10) + F(20) + G(10) + H(15) + I(10) + J(8) + K(10) + L(5) = **158**

> 이전 v1 158 항목보다 **인터랙션 + 측정 비중** 이 크게 증가했다. 단순 "selector 존재" 위주 항목 (A, K, L 일부) 외에 거의 모든 항목이 동적 검증이다.
> 본 체크리스트는 `qa_v2_report.md` 와 1:1 대응하며, 각 ID 별 evidence (screenshot / 측정값 / 인터랙션 sequence) 가 보고서에 기록된다.
