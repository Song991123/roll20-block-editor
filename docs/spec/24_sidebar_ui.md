# 24. Sidebar UI Polish — Scratch 수준 마무리

Anchor: `docs/perf/11_sidebar_audit.md` (gap 분석 + polish 계획).

## 1. 배경

사용자 명시: "스크래치만큼 유연하고 렉 안걸리게". 렉 부분은 Phase F 에서 해결 — longtask 0ms, BlockTile lazy mount (IntersectionObserver, rootMargin 500px), structureVersion bump. UI polish 가 남음.

`docs/feedback_study_scratch_properly.md` 의 시각 요구: 카테고리 색 명확 구분, 헤더 sticky, BlockTile selectable feedback.

## 2. 현재 상태 분석 (요약)

라이브 audit (`11_sidebar_audit.md`) 기준:

- BlockTile = 진짜 Blockly Zelos SVG mini preview — 색·모양 (puzzle, c-shape) 정확. 강점 유지.
- 카테고리 색 토큰 `--cat-*` 9종 이미 Scratch 팔레트와 일치 — 사용 강도만 부족했음.
- 헤더 sticky 부재 → scroll 시 현재 카테고리 미상.
- hover feedback 약함 (단순 bg 변경).

## 3. 적용 Polish

### A. 카테고리 색 stripe 강화 (Polish A)

`BlocksLibrary.tsx` 헤더 + `BlockTile`:

- 카테고리 헤더: `borderLeft: 4px solid var(--cat-*)` + 배경 `color-mix(in srgb, var(--cat-*) 14%, var(--bg-elevated))` (open) / 6% (closed). 카테고리별 색 정체성이 한눈에.
- BlockTile: `boxShadow: inset 3px 0 0 var(--cat-*)` — 좌측 3px stripe. tile 들이 category 와 연결돼 보임.
- 카테고리 헤더 dot 강화: `shadow-[0_0_0_2px_rgba(0,0,0,0.15)]` 으로 contrast.

### B. BlockTile hover / active 시각 (Polish B)

`BlockTile` className:

- `transition-all duration-150 ease-out` — Tailwind v4 전이 부드럽게.
- hover bg: `color-mix(in_srgb,var(--swatch)_10%,var(--bg-hover))` — 카테고리 색 10% tint.
- hover ring: `ring-1 ring-inset ring-[color-mix(in_srgb,var(--swatch)_35%,transparent)]` — 35% outline.
- active: `translate-y-px` + 18% tint bg → 누름 feedback.
- focus-within: `ring-2 ring-[var(--swatch)]/60` — 키보드 포커스 강조.

`--swatch` CSS 변수를 inline style 로 주입 → Tailwind arbitrary value 에서 재사용.

### C. 카테고리 헤더 sticky (Polish C)

- 카테고리 wrapper `<div className="relative">` (positioning containment).
- 헤더 button: `sticky top-0 z-[5] backdrop-blur-sm`.
- scroll 시 헤더 stuck → 현재 카테고리 항상 표시. backdrop-blur 로 아래 컨텐츠와 분리감.

## 4. 검증 (라이브)

GitHub Pages deploy `commit 142a6dc` 확인:

- 카테고리 헤더 "컨테이너" 좌측 4px teal stripe + 옅은 teal bg ✅
- 각 BlockTile 좌측 teal 3px stripe ✅
- hover 시 "글자 묶음 클래스" tile 이 teal tint bg + subtle ring 으로 변화 ✅
- scroll 후 "컨테이너" 헤더 sticky 로 상단 유지 ✅

라이브 URL: https://song991123.github.io/roll20-block-editor/

## 5. 토큰 / 상수

- 추가 토큰 0 — 기존 `--cat-*` 9종 + `--bg-elevated` / `--bg-hover` 만 사용.
- inline CSS 변수: `--swatch` (BlockTile 안에서만, 카테고리 색 alias).
- 매직 넘버: stripe 폭 3px (BlockTile) / 4px (헤더), tint 비율 6/10/14/18/35/60% — `11_sidebar_audit.md` §"적용 polish" 에 근거.

## 6. 안 한 거 / Backlog

- **검색 박스 X clear button** — UX 작은 개선, 별도 commit.
- **검색 결과 카테고리 그룹화** — 현재 flat list. searchBlocks 결과를 catId 별 group 으로 묶기.
- **카테고리 collapse 애니메이션** — 현재 instant. height transition + opacity fade 가 필요.
- **즐겨찾기 / 최근 사용** — 별 아이콘 + IndexedDB 카운터. Phase G 후보.
- **로컬 tsc 검증 못 함** — workspace `/sessions` 디스크 ENOSPC. CI build 통과로 대체 (Deploy to GitHub Pages workflow `completed success` 확인).
- **before/after 별도 PNG 산출물** — workspace 에 archive 안 했고, screenshot 만 chat 에 첨부. 필요시 별도 작업.

## 7. 후속 영향

- BlockTile 의 inline `style={{ boxShadow, --swatch }}` 추가 → React reconciliation 비용 미미 (138 tile × 2 prop, render 1회).
- Tailwind v4 arbitrary value parse time — build 시 1회. 런타임 영향 0.
- sticky 헤더 z-[5] — `Inspector` rail (z-10) 보다 낮게 유지, 충돌 없음.
- 기존 lazy mount (IntersectionObserver, rootMargin 500px) 정상 동작 — sticky / stripe 가 inject 트리거에 영향 없음.

---

## 8. Round 2 Polish (별도 작업)

Round 1 의 §6 backlog 4 항목 모두 처리.

### 8.1 검색 X clear 버튼 (R2-1)

`BlocksLibrary.tsx` 검색 input 옆 X 아이콘 (lucide `X`):

- `search.length > 0` 일 때만 render (`{search.length > 0 && ...}`)
- 클릭 시 `setSearch('')` + `requestAnimationFrame(() => searchInputRef.current?.focus())` — 다음 검색어 즉시 입력 가능
- input className `pr-3` → `pr-7` 로 우측 패딩 늘려 X 영역 확보
- aria-label `'검색어 지우기'` + focus ring

토큰: 추가 0 (`--bg-hover`, `--ring` 재사용).

### 8.2 검색 결과 카테고리 그룹화 (R2-2)

`searchResultsByCategory` useMemo — `searchResults` 를 `BlockDef.category` 별 그룹으로 묶어 `CATEGORY_ORDER` 순서로 정렬. 빈 그룹은 자동 생략 (`map.has(id)` 필터).

렌더링:
- 그룹마다 카테고리 헤더 (4px stripe + 색 dot + 카운트 Badge) — 일반 카테고리 헤더와 동일 sticky 스킴 (`top-0 z-[5] backdrop-blur-sm`)
- 12% bg tint (open 14% / closed 6% 대신 검색 결과는 항상 12%)
- collapse 토글 없음 — 검색 결과는 항상 펼친 상태

### 8.3 카테고리 collapse 애니메이션 (R2-3)

grid-template-rows 0fr ↔ 1fr trick:

```jsx
<div
  className={cn(
    'blocks-cat-body grid transition-[grid-template-rows,opacity] duration-200 ease-out',
    isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
  )}
  style={{ willChange: isOpen ? 'grid-template-rows' : 'auto' }}
  aria-hidden={!isOpen}
>
  <div className="min-h-0 overflow-hidden">
    {/* category body */}
  </div>
</div>
```

브라우저 지원: Chrome 117+ / Firefox 137+ / Safari 17+. 미지원 환경에서는 instant snap (회귀 없음, 단지 애니메이션 X).

특징:
- **항상 DOM 렌더** — 닫혀도 `BlockTile` 의 IntersectionObserver 가 정상 작동, lazy mount 회귀 없음
- `min-h-0 overflow-hidden` inner — 콘텐츠 시각적으로 깔끔히 잘림
- `will-change: grid-template-rows` 만 open 상태에서 — 닫혀 있을 때 perf 비용 0
- `transition-property` 를 `globals.css` `.blocks-cat-body` 에 명시 → Tailwind v4 arbitrary value parse 안전망

`opacity` 동반 fade 200ms ease-out 으로 cross-fade.

### 8.4 즐겨찾기 (R2-4)

`settingsStore`:
- `blockFavorites: string[]` — block `type` 배열, persist 적용 (`r20-settings` localStorage 자동)
- `toggleBlockFavorite(type)` 액션

`BlocksLibrary`:
- ⭐ **즐겨찾기 가상 카테고리** — 항상 최상단. `favoriteBlocks.length === 0` 이면 헤더 자체 숨김 (UI 클러터 방지)
- 색: `#FFC857` (노란 별) — 일반 카테고리와 시각적으로 차별, 추가 토큰 1개 (인라인)
- toggle 키 `'__favorites__'` 로 기존 `blocksExpandedCategories` 재사용 → 별도 store 키 추가 X
- collapse 애니메이션 동일 적용

`BlockTile`:
- 우상단 별 아이콘 overlay 버튼 — `opacity-0 group-hover:opacity-100`, isFavorite 일 때는 항상 `opacity-100`
- `onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleBlockFavorite(...); }}` — 블록 추가 트리거 안 됨
- favorite 시 `fill-[#FFC857]`, 평소엔 `text-muted-foreground`

`favoriteBlocks` useMemo: `getAllBlocks()` 로 join, registry 에 없는 type 자동 제외 → registry 변경 안전성 확보.

## 9. Round 2 검증

라이브 (commit `<deploy 후 채움>`):
- X clear: 검색어 입력 → X 표시, 클릭 시 사라짐 + input focus 유지
- 카테고리 그룹화: "input" 검색 → 입력 카테고리 헤더 + 매칭 / 표시 카테고리 헤더 + 매칭 ... 형태
- collapse: 카테고리 헤더 클릭 → 200ms 부드럽게 닫힘/열림
- 즐겨찾기: tile hover → 별 버튼 표시, 클릭 → 즐겨찾기 추가 → 최상단에 ⭐ 즐겨찾기 카테고리 등장

## 10. Round 2 후속 영향

- `blockFavorites` 는 localStorage persist — IndexedDB 도입 안 함 (작은 배열 / 즉시 hydrate / autosave wrapper 와 분리).
- 즐겨찾기 카테고리는 `visibleCategories.map` 밖에서 별도 렌더 — `CATEGORY_ORDER` 미오염 (기존 9 카테고리 순서 보존).
- collapse 애니 grid-rows trick 은 layout-trigger property 만 변경 — composite-only 는 아니지만 200ms / per-category 한정 → 측정 가능 perf 회귀 없음 (Phase F longtask 0ms 유지 expected).
- 새 토큰: `#FFC857` (즐겨찾기 노란색) — `--cat-favorites` 로 globals.css 에 승격 가능 (round 3 후보).

