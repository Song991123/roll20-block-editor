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
