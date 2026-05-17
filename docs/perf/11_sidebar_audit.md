# 11. Sidebar UI Audit — Scratch 비교

날짜: 2026-05-18
대상 라이브: https://song991123.github.io/roll20-block-editor/
참고: `docs/feedback_study_scratch_properly.md`

## 현재 상태 (라이브 screenshot)

좌측 [블록] 모드 — 검색 박스 + 9~10 카테고리 × 138 블록. BlockTile = 진짜 Blockly Zelos SVG mini preview + 라벨.

### Strengths

- BlockTile 의 mini Blockly preview = Scratch / Blockly 의 toolbox 시각 그대로. 색·모양 (puzzle, c-shape) 정확하게 보임.
- 카테고리 expand/collapse + 검색 box + 고급 카테고리 toggle 구조 완비.
- IntersectionObserver lazy mount + structureVersion 으로 138 블록 inject 비용 흡수 (Phase F 작업).

### Gaps vs Scratch

| 측면 | Scratch | 현재 | 갭 |
| --- | --- | --- | --- |
| 카테고리 색 명확성 | 좌측 9~10 색 stripe (full-height) + 헤더 색 background | 카테고리 헤더에 작은 dot + tile 좌측 1.5px border (faint) | 색 stripe 가 약함 — 어떤 카테고리에 있는지 한눈에 안 보임 |
| 카테고리 헤더 sticky | scroll 시 헤더 stuck | scroll 시 카테고리 헤더 사라짐 — 현재 위치 미상 | sticky 없음 |
| BlockTile hover 시각 | bg 강하게 변화 + 색 ring | bg 변화 (var(--bg-hover)) 만 — 약함 | hover 강도 부족 |
| BlockTile active/press | 누르는 동안 inset shadow | active 시 별다른 시각 없음 | 클릭 feedback 부족 |
| 검색 박스 | placeholder + clear button + 키워드 fuzzy | placeholder 있음, clear button 없음 | clear button 누락 (minor) |
| 카탈로그 width | 1blocky 폭 + 좁은 label | sidebar-left-w = 280px — BlockTile preview 144px + label — 적정 | OK |

## 실제 측정 — 카테고리 색 토큰

`globals.css`:
- `--cat-container: #2EC4B6` (teal)
- `--cat-input: #4C97FF` (blue)
- `--cat-display: #9966FF` (purple)
- `--cat-dice: #FFBF00` (yellow)
- `--cat-i18n: #FF6680` (pink)
- `--cat-expression: #5CB1D6` (sky)
- `--cat-sheetworker: #F85149` (red)
- `--cat-css: #59C059` (green)
- `--cat-advanced: #7C7F86` (gray)
- `--cat-composite: #6E5494` (mauve)

→ 토큰은 이미 Scratch 팔레트와 거의 동일. **문제는 사용 강도** — dot 3px 짜리만 보임.

## 적용 polish (Step 2)

A. **카테고리 색 stripe 강화** — BlockTile 좌측 4px stripe + 카테고리 헤더에 동일 색 left-border 8px / tinted bg.
B. **BlockTile hover/active 시각** — hover 시 카테고리 색 5% tint bg + 0.5px solid stroke + active translateY(1px) press, focus-visible ring 강화.
C. **카테고리 헤더 sticky** — scroll 시 category header `position: sticky; top: 0` + tinted backdrop.

## 남은 backlog

- 검색 박스 clear button (X) — placeholder 시각 일치 위해.
- 검색 결과 카테고리 그룹화 (현재 flat list).
- 카테고리 collapse 애니메이션 (현재 instant).
- BlockTile "최근 사용" 별표 / 즐겨찾기.
