# Roll20 시트 빌더 — QA 체크리스트

**대상 commit:** `8d843ec` (Option C-6 welcome empty state polish)
**검증 환경:** GitHub Pages 라이브 — https://song991123.github.io/roll20-block-editor/
**작성일:** 2026-05-15
**작성자:** QA agent (Claude, ~6h 학원 부재 동안 자동 검증)

> 본 체크리스트는 _A. UI 셸 → L. 영시영 회귀_ 12 영역으로 나뉘며,
> 각 항목은 `qa_report.md` 의 동일 ID 행과 1:1 대응한다.
> 결과는 ✅ PASS / ⚠ PARTIAL / ❌ FAIL / 🚫 SKIP 4 카테고리로 기록한다.

---

## A. UI 셸 (Phase 1 Stage S — EditorShell 3-zone grid)

| ID | 항목 |
|---|---|
| A1.1 | 헤더 — 좌측 사이드 토글 버튼 표시 (`PanelLeft` 아이콘) + Tooltip "좌측 토글 (Cmd+[)" |
| A1.2 | 헤더 — 로고 마크 (32×32 SVG, 그라데이션 #5CB1D6→#2F81F7) 표시 |
| A1.3 | 헤더 — 제목 "Roll20 시트 빌더" (한국어, font-semibold) |
| A1.4 | 헤더 — 부제 "블록 코딩으로 만드는 캐릭터 시트" (md 이상에서만 표시) |
| A1.5 | 헤더 — 액션 그룹: [예시] 드롭다운 / [새 시트] / [불러오기] |
| A1.6 | 헤더 — 우측 액션: [저장] / [다운로드] / ⚙ 설정 / ? 도움말 |
| A1.7 | 헤더 — 우측 사이드 토글 (`PanelRight`) + Tooltip "우측 토글 (Cmd+])" |
| A1.8 | 헤더 — GitHub 링크 (octocat svg) 표시 + 외부 링크 동작 |
| A1.9 | 헤더 — 우측 끝 버전 라벨 `v0.1.0` 표시 |
| A1.10 | 헤더 — 전체 높이 `var(--header-h)` (≈56px), border-bottom 적용 |
| A2.1 | 좌측 사이드 — 상단 [블록]/[트리] 토글 그룹 (segmented) |
| A2.2 | 좌측 — 기본값 [블록] 모드 (BlocksLibrary) 활성 |
| A2.3 | 좌측 — [블록] 모드 검색 입력 (placeholder 한국어) |
| A2.4 | 좌측 — 9 카테고리 list (컨테이너/입력/표시/굴림/번역/표현식/시트자동화/디자인/고급/합성) |
| A2.5 | 좌측 — 기본 펼침: 컨테이너/입력/표시/굴림/번역 (defaultExpanded:true 5개) |
| A2.6 | 좌측 — "고급" 토글 켜야 표현식/시트자동화/디자인/고급/합성 5개 노출 |
| A2.7 | 좌측 — 카테고리 좌측 stripe 색 (Scratch hue 매핑) |
| A2.8 | 좌측 — 접힌 상태 (collapsed) 시 [블록]/[트리] 아이콘만 (32px column) |
| A2.9 | 좌측 — Cmd+[ 로 좌측 collapse 토글 |
| A2.10 | 좌측 — Cmd+1 / Cmd+2 로 [블록] / [트리] 모드 전환 |
| A3.1 | 중앙 PreviewMain — iframe 표시 (sandbox 처리) |
| A3.2 | 중앙 — 상단 PreviewToolbar (줌 / 다크 모드 토글 / 새로고침) |
| A3.3 | 중앙 — 빈 워크스페이스 시 EMPTY_PLACEHOLDER (h1 "시트 미리보기" 등) 표시 |
| A3.4 | 중앙 — iframe srcDoc 변경 시 1초 debounce |
| A4.1 | 우측 사이드 — [속성]/[코드] segmented (Cmd+3 / Cmd+4) |
| A4.2 | 우측 — [속성] 모드 = Inspector (선택 블록 폼) |
| A4.3 | 우측 — [코드] 모드 = CodeTabs (HTML / CSS / 번역 / 미리보기 4 탭) |
| A4.4 | 우측 — Cmd+] 로 우측 collapse 토글 |
| A4.5 | 우측 — 접힌 상태 시 width 0px (안 보임) |
| A5.1 | Statusbar — 좌측 블록 수 표시 (워크스페이스별 합) |
| A5.2 | Statusbar — 저장 상태 indicator (dirty 시 색 변화) |
| A5.3 | Statusbar — 자동저장 상태 표시 |
| A5.4 | Statusbar — 워크스페이스 이름 표시 |
| A5.5 | Statusbar — 우측 끝 버전 라벨 |
| A5.6 | Statusbar — 전체 높이 ≈32px |
| A6.1 | 빈 워크스페이스 환영 — hero 영역 (제목 + 설명) |
| A6.2 | 환영 — 3 step 카드 표시 |
| A6.3 | 환영 — CTA 버튼 (예: "예시 로드하기") |
| A6.4 | 환영 — Pretendard 폰트 정상 적용 (한글) |

## B. 130 블록 카탈로그 (Stage A — 9 카테고리)

| ID | 항목 |
|---|---|
| B1.1 | 표현식 — 21개 등록 (둥근 reporter + 육각 boolean) |
| B1.2 | 표현식 — 검색 input 에 "attr" 입력 시 attr_value / @{...} 류 노출 |
| B1.3 | 표현식 — 블록 클릭 → 워크스페이스 추가 |
| B1.4 | 표현식 — boolean shape 블록 (예: equals, greater_than) 별도 표시 |
| B1.5 | 표현식 — 카테고리 hue 200 (시안) |
| B2.1 | 컨테이너 — 18개 등록 (C/stack 모양) |
| B2.2 | 컨테이너 — 자식 statement slot 표시 |
| B2.3 | 컨테이너 — fieldset / row / col / table 등 |
| B2.4 | 컨테이너 — hue 180 |
| B3.1 | 입력 — 9개 (text / number / checkbox / select / textarea 등) |
| B3.2 | 입력 — hue 230 |
| B4.1 | 표시 — 7개 (heading / hr / image / icon / spacer 등) |
| B4.2 | 표시 — hue 290 |
| B5.1 | 굴림 — 12개 (roll button / rolltemplate 등) |
| B5.2 | 굴림 — hue 40 (옐로우-앰버) |
| B6.1 | 시트 자동화 — 25개 (hat / C / stack / reporter 모두) |
| B6.2 | 시트 자동화 — hue 0 (적색) |
| B6.3 | 시트 자동화 — 고급 토글 안에 있어야 보임 |
| B7.1 | 번역 (i18n) — 11개 (i18n_key, placeholder, aria 등) |
| B7.2 | 번역 — hue 330 |
| B8.1 | 디자인 (CSS) — 19개 (selector / decl / at-rule) |
| B8.2 | 디자인 — hue 120 (그린) |
| B8.3 | 디자인 — 고급 토글 안에 있어야 보임 |
| B9.1 | 고급 — 4개 (raw_html / raw_css / imgur / etc.) |
| B9.2 | 고급 — hue 270 |
| B10.1 | 합성 — 4개 (attr_with_txt / computed / dual_roll / radio_group) |
| B10.2 | 합성 — order 10 (마지막) |
| B11.1 | 카테고리 dot 색 = `--cat-*` CSS var (Scratch hue 매핑 일관) |
| B12.1 | 펼친 카테고리 좌측 stripe 4px width |

## C. 미리보기 pipeline (Phase 2)

| ID | 항목 |
|---|---|
| C1 | autoPrefixHtmlClasses — `class="foo"` → `class="sheet-foo"` 변환 |
| C2 | autoPrefixCssClasses — `.foo` → `.sheet-foo` 변환 |
| C3 | runtimeCss — buildSheetDoc 의 `<style>` 1번 박스 inline 로드 |
| C4 | `.charsheet` container — bodyInner wrap |
| C5 | iframe srcdoc — debounce 1000ms 후 갱신 |
| C6 | 다크 모드 토글 — body[data-theme=dark] 동기화 |
| C7 | 6 능력치 가로 layout — `.sheet-colrow-6` (또는 동급 grid) |
| C8 | row / col flex — runtime.css 의 .sheet-row/.sheet-col 동작 |
| C9 | fieldset / table 기본 스타일 (border, padding) 동작 |
| C10 | 빈 워크스페이스 시 EMPTY_PLACEHOLDER 표시 |
| C11 | 멱등성 — `sheet-foo` 두 번 prefix 시 `sheet-sheet-foo` 안 됨 |
| C12 | reserved 토큰 (`charsheet`, `repeating_*`, `sheet-rolltemplate-*`) prefix 안 부착 |

## D. V2 D&D 5e 예시

| ID | 항목 |
|---|---|
| D1 | 헤더 [예시] 드롭다운 → "🐉 D&D 5e 캐릭터 시트" 항목 표시 |
| D2 | 클릭 → toast `D&D 5e 예시 로드 — 블록 509개 (HTML x / CSS y / 번역 z)` |
| D3 | 미리보기 — 캐릭터 헤더 (이름 / 종족 / 클래스 / 레벨 / 배경) 렌더 |
| D4 | 미리보기 — 6 능력치 (STR/DEX/CON/INT/WIS/CHA) 가로 6 컬럼 |
| D5 | 미리보기 — 6 내성 + prof 체크박스 |
| D6 | 미리보기 — 18 기능 (Skills) + 굴림 버튼 |
| D7 | 미리보기 — HP / AC / 이니셔티브 / 이동속도 |
| D8 | 미리보기 — 장비 repeating section (`repeating_inventory` 또는 동등) |
| D9 | 미리보기 — 마법 repeating section |
| D10 | Statusbar — HTML 워크스페이스 블록 수 ≈509 (또는 합계) 표시 |
| D11 | meta.json `blockCount: 509` 와 일치 |
| D12 | 콘솔 에러 0 |

## E. V3 PbtA Narrative 예시

| ID | 항목 |
|---|---|
| E1 | [예시] → "🃏 PbtA Narrative 캐릭터 시트" 항목 표시 |
| E2 | 클릭 → toast `PbtA Narrative 예시 로드 — 블록 407개` |
| E3 | 미리보기 — 헤더 (이름 / Playbook) |
| E4 | 미리보기 — 5 Stat (Cool / Hard / Hot / Sharp / Weird) |
| E5 | 미리보기 — 5 Harm box (Faint ~ Dying or 동등) |
| E6 | 미리보기 — Stress / Armor 표시 |
| E7 | 미리보기 — 6 Moves (이름 + 설명 + 굴림) |
| E8 | 미리보기 — Gear / Hx / History / Advancement 섹션 |
| E9 | Statusbar 블록 수 ≈407 (또는 합계) 표시 |
| E10 | meta.json `blockCount: 407` 와 일치 |
| E11 | 콘솔 에러 0 |

## F. 인터랙션

| ID | 항목 |
|---|---|
| F1 | 블록 라이브러리 항목 클릭 → 워크스페이스 추가 → 미리보기 즉시 갱신 (debounce 후) |
| F2 | 좌측 [트리] 토글 → 추가된 블록 트리 표시 |
| F3 | 트리 블록 클릭 → uiStore.selectedBlockId 갱신 |
| F4 | 우측 [속성] → 선택 블록 field 폼 표시 |
| F5 | 폼 input 수정 → 미리보기 즉시 (debounce 후) 반영 |
| F6 | 우측 [코드] 탭 → emit 결과 raw HTML / CSS / 번역 / 미리보기 4탭 표시 |
| F7 | iframe 안 element 클릭 → postMessage `r20:select` → 우측 inspector 동기화 |
| F8 | Cmd+1 / Cmd+2 / Cmd+3 / Cmd+4 단축키 동작 |
| F9 | Cmd+[ / Cmd+] 사이드 collapse 동작 |

## G. 디자인 시스템

| ID | 항목 |
|---|---|
| G1 | Pretendard 웹 폰트 적용 (한글 + 라틴 모두) |
| G2 | 다크 모드 톤 (Notion 풍 #1A1A1A 계열) — bg-app / bg-elevated 토큰 |
| G3 | 라이트 모드 토글 가능 (사용자 설정) |
| G4 | 한국어 카피 자연스러움 — Notion / 카카오 톤 (검수) |
| G5 | 토스트 (sonner) — 우상단 / 한국어 / duration 1.8~3s |
| G6 | 카테고리 색 매핑 — types.ts 의 hue 와 globals.css `--cat-*` 일치 |
| G7 | 아이콘 (lucide-react) — 일관된 stroke / size (h-4 w-4 기본) |
| G8 | hover / focus 상태 — `--bg-hover` / `--bg-active` 토큰 동작 |
| G9 | 색상 토큰 — `--bg-app`, `--bg-elevated`, `--border`, `--foreground` 정의 |

## H. 접근성 (WCAG 2.1 AA)

| ID | 항목 |
|---|---|
| H1 | 키보드 Tab nav — 헤더 → 좌측 → 중앙 → 우측 → statusbar 순회 |
| H2 | 포커스 visible — outline / ring 명확 (focus-visible CSS) |
| H3 | 텍스트 vs 배경 명도 대비 4.5:1 이상 (다크 모드 기준) |
| H4 | 모든 icon-only 버튼에 aria-label (한국어) |
| H5 | 토글 버튼 (segmented) — aria-pressed / role=radio 적절 |
| H6 | 모달 / drawer ESC 닫기 |
| H7 | iframe `title` 속성 ("시트 미리보기" 등) |

## I. 성능

| ID | 항목 |
|---|---|
| I1 | 첫 로드 LCP — Lighthouse / DevTools 추정 (~3s 이내?) |
| I2 | V2 (509 블록) 로드 시간 — toast 등장까지 (~5s 이내?) |
| I3 | V3 (407 블록) 로드 시간 (~5s 이내?) |
| I4 | 미리보기 srcdoc 갱신 — debounce 1000ms 동작 |
| I5 | 워크스페이스 트리 — react-window 가상화 (큰 블록 수 fast scroll) |
| I6 | 메모리 — 이전 example 정리 (예: V2 → V3 전환 후 리크 X) |

## J. 보안 / Robustness

| ID | 항목 |
|---|---|
| J1 | iframe sandbox — `<script>` 박혀도 부모창 cross-origin 제약 |
| J2 | autoPrefix — `class` 속성 escape 동작 (특수문자 미파괴) |
| J3 | i18n key 특수문자 박았을 때 sanitize 동작 |
| J4 | sheet worker 변수명 한국어 — emit 시 깨짐 없음 |
| J5 | raw_html / raw_css 블록 안 사용자 텍스트 — autoPrefix 우회? 의도된 동작 검증 |
| J6 | preview-bridge script — `cssEscape` 으로 selector injection 방지 |

## K. 브라우저 호환

| ID | 항목 |
|---|---|
| K1 | Chrome 최신 — 라이브 사이트 정상 (Chrome MCP) |
| K2 | Edge — Chromium 기반 동작 (추정 / 코드 검증) |
| K3 | Firefox — 동작 (추정 / standard web API 사용 검증) |
| K4 | Safari — 동작 (추정 / -webkit prefix 의존성 검증) |
| K5 | 모바일 viewport (<1024px) — 우측 패널 drawer 모드 |
| K6 | 모바일 viewport — 헤더 부제 / 텍스트 hidden md:block |

## L. 영시영 hardcoding 회귀 검증 (D26 ⑤ deletion 검증)

| ID | 항목 (grep 키워드 = 0 hits 기대) |
|---|---|
| L1 | `lib/blocks/**/*.ts` — `yshy\|영시영\|coc-1\|ERA_SKILL_MAP\|NO_CHECKBOX\|SKILLS_WITH_NAME` |
| L2 | `lib/preview/**/*.ts` — 동일 키워드 |
| L3 | `components/editor/**/*.tsx` — 동일 키워드 |
| L4 | `public/examples/**` — 동일 키워드 (V2 / V3 모두 generic) |
| L5 | `app/**` — 동일 키워드 |
| L6 | `lib/blocks/types.ts` — 9 카테고리 generic (시스템 토큰 0) |
| L7 | `lib/preview/runtime.css` — selector 모두 Roll20 표준 (`.charsheet` `.sheet-*` `repeating_*`) — 시스템 specific 0 |
| L8 | `lib/preview/buildDoc.ts` — 시스템 specific 0 |
| L9 | examples/dnd5e XML — generic block type 사용 (시스템 specific 블록 X) |
| L10 | examples/pbta_narrative XML — 동일 |
| L11 | EXAMPLES 배열 — 2 종 (V2/V3) 만 등록, 영시영 sample 0 |
| L12 | 한국어 라벨에 "영시영" / "yshy" 노출 0 |

