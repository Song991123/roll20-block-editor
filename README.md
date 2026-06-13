# Roll20 Block Editor

Roll20 커스텀 캐릭터 시트를 더 쉽게 만들기 위한 웹 기반 시트 빌더입니다.  
HTML/CSS/번역/시트 워커로 구성된 Roll20 시트를 불러와 블록과 시각 편집 레이어로 다루고, 실제 Roll20 환경에 가까운 미리보기와 내보내기 흐름을 목표로 개발하고 있습니다.

> 이 README는 포트폴리오용 프로젝트 소개 문서입니다. 에이전트 작업 규칙과 진행 상황은 `AGENTS.md`, `docs/qa/31_active_todo.md`, `docs/operations/`에 따로 관리합니다.

## 프로젝트 목표

Roll20 커스텀 시트 제작은 HTML, CSS, Sheet Worker JavaScript, rolltemplate, 번역 파일을 모두 이해해야 해서 진입 장벽이 높습니다. 이 프로젝트는 그 복잡한 구조를 다음 두 층으로 나누는 것을 목표로 합니다.

| 층 | 목표 |
| --- | --- |
| 블록 편집 | HTML/CSS/속성/roll button/번역/worker 구조를 손실 없이 블록으로 표현 |
| 시각 편집 | Figma처럼 실제 시트 위에서 요소를 선택, 배치, 그룹화, 컨테이너에 삽입 |

최종 목표는 비개발자도 시트를 직접 구성할 수 있게 하면서, Roll20에 업로드 가능한 HTML/CSS/translation/export 결과를 유지하는 것입니다.

## 핵심 기능

- Roll20 시트 HTML/CSS/translation import
- Blockly 기반 구조 편집
- 실제 Roll20 wrapper와 base CSS를 반영한 미리보기
- Shadow DOM 기반 시트 CSS 격리
- script, sheet worker, rolltemplate의 시트 캔버스 노출 방지
- Roll20 roll button과 chat/rolltemplate 시뮬레이션 기반
- IndexedDB autosave
- GitHub Pages 자동 배포
- fixture 기반 roundtrip, cascade, visual diff 검증 파이프라인

## 기술 스택

| 영역 | 사용 기술 |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS v4, Radix UI, lucide-react |
| Block Editor | Blockly 12 |
| State | Zustand, idb-keyval |
| Export | JSZip, static export |
| Verification | custom fixture scripts, browser smoke tests, GitHub Actions |

## 현재 검증된 범위

아래 항목은 현재 리포트가 있는 범위만 적었습니다. 전체 Roll20 시트 호환성을 의미하지 않습니다.

| 검증 항목 | 현재 결과 | 근거 |
| --- | --- | --- |
| 브라우저 L2 roundtrip | 3개 fixture PASS | `reports/roundtrip-browser/browser-roundtrip-results.md` |
| 영시영 1부 mapping fidelity | 주요 Roll20 의미 토큰 exact match | `reports/mapping-fidelity/mapping-fidelity-yshy.md` |
| edit flow drop smoke | gallery drop, container nesting PASS | `reports/edit-flow-smoke/edit-flow-smoke-results.md` |
| standalone preview CSS cascade | sampled visible sheet element app-like winner 0 | `reports/cascade-leak/cascade-leak-results.md` |
| visual diff pipeline | diagnostic 단계 | `reports/visual-fixture-diff/visual-fixture-diff-results.md` |

## 아직 남은 과제

- 실제 Roll20 editor/sandbox 화면과 local preview의 시각 비교
- 미리보기/편집 화면의 screenshot parity 검증
- worker JS를 별도 블록 workspace로 분리
- rolltemplate/chat 렌더링 정확도 향상
- legacy Roll20 sanitize on/off 검증
- 레이어 패널의 before/after/inside drop zone 구현
- 공식/커스텀 시트 fixture 확대 검증

## 실행 방법

```bash
corepack pnpm install
corepack pnpm run dev
corepack pnpm run lint
corepack pnpm run build
```

개발 서버 기본 주소:

```text
http://localhost:3000
```

배포 주소:

```text
https://song991123.github.io/roll20-block-editor/
```

## 문서 구조

| 위치 | 내용 |
| --- | --- |
| `AGENTS.md` | Codex/Claude 등 에이전트 작업 규칙 |
| `docs/qa/31_active_todo.md` | 현재 TODO와 검증 상태 |
| `docs/qa/34_requirements_gap_matrix.md` | 요구사항별 gap matrix |
| `docs/spec/` | Roll20 출력, WYSIWYG, mapping contract 등 기술 명세 |
| `docs/ux/` | DOM/layer 기반 편집 UX 설계 |
| `reports/` | 실제 검증 리포트 |
| `scripts/` | 반복 가능한 검증/fixture 스크립트 |

## 설계 원칙

1. 기존 시트 원본을 임의로 정리하거나 손실시키지 않는다.
2. 미리보기는 실제 Roll20 환경에 가까운 wrapper, baseline CSS, user CSS 순서를 따른다.
3. 편집 화면은 별도 그림이 아니라 실제 렌더 결과 위에 overlay를 얹는다.
4. "전체 지원"이나 "100% 일치"는 검증 리포트가 있는 범위에서만 말한다.
5. 사용자 친화적 편집 UX와 원본 fidelity를 분리해 설계한다.
