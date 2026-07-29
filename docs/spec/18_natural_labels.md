# 18. 자연어 블록 라벨 (Block Label Naturalization)

**Anchor:** spec 02 §3 (131 블록 카탈로그), spec 09 §1.1 (9 카테고리)
**Driver feedback:** 사용자 (2026-05) — "스크래치는 어린애들도 다룰 수 있게 '10만큼 움직이기' 이런 직관적인 말로 되어있는데, 우리 블록은 개발자/웹디 / 배운 사람들만 알아들을 수 있는 용어다."

---

## §1. Scratch 라벨 패턴 (분석 결과)

`scratch.mit.edu/projects/editor/?lang=ko` 9 카테고리 (동작/형태/소리/이벤트/제어/감지/연산/변수/내 블록) 전수 조사.

### §1.1 형태 패턴

| 패턴 | 예시 (Scratch) | 메모 |
|---|---|---|
| 동사 우선 + 어미 `-기` | `10 만큼 움직이기` | gerund/imperative — 명령 어조 |
| 명사 + `(으)로 정하기` | `x좌표를 0 (으)로 정하기` | 상태 변경 |
| 수치 + `만큼 바꾸기` | `크기를 10 만큼 바꾸기` | 증감 |
| 시간 + `초 동안` | `1 초 동안 ... 이동` | 시간 단위 명시 |
| 이벤트 (hat) — `...했을 때` / `...을 때` | `클릭됐을 때`, `메시지1 신호를 받았을 때` | trigger 어조 |
| 조건 (c-block) | `만약 (이)라면` | 한국어 자연 조건 |
| 반복 | `10 번 반복하기`, `무한 반복하기`, `까지 반복하기` | gerund |
| 논리 — 자연어 토큰 | `그리고`, `또는`, `이(가) 아니다` | `&&` / `||` / `!` 0 |
| 비교 — 기호 only | `○ > 50`, `○ = 50` | label 없이 기호로 |
| 산술 — 기호 only | `○ + ○`, `○ * ○` | label 없이 기호로 |

### §1.2 절대 회피하는 토큰

- 영어 함수명: `concat`, `length`, `contains` → 대신 `결합하기`, `길이`, `포함하는가?`
- 자료형 명: `string`, `boolean` → 등장 X (slot 색으로 구분)
- 자료구조 명: `loop`, `array`, `event handler` → 등장 X
- 약어: `var`, `fn`, `len` → 풀어 씀

### §1.3 캡처

세션 conversation 에 inline screenshot 5장 첨부 — 동작 / 형태 / 제어 / 연산 / 변수.

---

## §2. 우리 적용 원칙

1. **동사형 / 명사형 혼용 OK.** 블록은 명사 (`박스`, `숫자`) 와 동사 (`...했을 때`, `... 바꾸기`) 둘 다 자연. 카테고리 의미에 맞게 선택.
2. **HTML 태그명 노출 0.** `<div>`, `<span>`, `<fieldset>`, `<tr>`, `<td>` → 자연어로. 단 직접 HTML 작성 (고급) 블록은 예외.
3. **영문 단어 — 한국어 일반 명사로.** `row` → `가로 줄`, `col` → `세로 줄`, `select` → `선택 메뉴`, `placeholder` → `안내문`, `worker` → 등장 X (또는 `자동화`).
4. **약어 X — 풀어 씀.** `JS` 는 `직접 JS 작성` 처럼 카테고리 prefix 가 자연어일 때만 허용.
5. **Roll20 전용 토큰 (rolltemplate / @{} / [[ ]] / v.NAME) — 자연어 prefix + 기호 병기.**
   `rolltemplate` → `굴림 결과 틀`, `@{속성}` → `시트 값 가져오기`.
6. **카테고리 prefix 회피 (어수선해짐).** 블록 이름이 카테고리에 속하면 카테고리 단어 반복 X (예: i18n 카테고리 안의 블록은 `번역 ...` 까지가 한계).
7. **잘 알려진 외래어는 그대로.** `이미지`, `아이콘`, `라디오 버튼`, `체크`, `ID`. 억지 한국어화 X.
8. **`code 탭 / 인스펙터 type 필드` 의 `r20_xxx` 는 그대로.** 그건 식별자라 자연어화 안 함 (사용자 face 노출 0).

---

## §3. 131 블록 라벨 매핑

### §3.1 컨테이너 (18)

| type | 현 라벨 (dev) | 새 라벨 (자연어) |
|---|---|---|
| `r20_div` | 박스 `<div>` | 박스 (그룹) |
| `r20_span` | 인라인 `<span>` | 글자 묶음 |
| `r20_fieldset` | 필드셋 `<fieldset>` | 둘러싸인 그룹 |
| `r20_semantic_container` | 의미 태그 묶음 | 의미 있는 묶음 |
| `r20_row` | 행 row | 가로 줄 |
| `r20_col` | 열 col | 세로 줄 |
| `r20_colrow_n` | N칸 행 | 여러 칸 가로 줄 |
| `r20_table` | 표 `<table>` | 표 |
| `r20_thead` | `<thead>` | 표 머리 |
| `r20_tbody` | `<tbody>` | 표 몸통 |
| `r20_tr` | `<tr>` 행 | 표의 한 줄 |
| `r20_th` | `<th>` 헤더 | 표의 머리 칸 |
| `r20_td` | `<td>` 칸 | 표의 칸 |
| `r20_repeating_section` | 반복 섹션 | 반복 영역 |
| `r20_repeating_row` | 반복 행 | 반복 영역의 한 줄 |
| `r20_label` | `<label>` 텍스트 | 이름표 |
| `r20_section_wrap` | 섹션 wrap | 섹션 묶음 |
| `r20_toggle_wrap` | 토글 wrap | 펼치기 / 접기 묶음 |
| `r20_grid` | 그리드 grid | 격자 배치 |

### §3.2 입력 (9)

| type | 현 | 새 |
|---|---|---|
| `r20_text_input` | 텍스트 입력 | 글자 입력칸 |
| `r20_number_input` | 숫자 입력 | 숫자 입력칸 |
| `r20_checkbox` | 체크박스 | 체크 상자 |
| `r20_select` | 드롭다운 select | 선택 메뉴 |
| `r20_select_option` | option 항목 | 선택 항목 |
| `r20_textarea` | 여러 줄 textarea | 여러 줄 입력칸 |
| `r20_radio` | 라디오 버튼 | 라디오 버튼 |
| `r20_hidden_input` | 숨김 hidden | 숨김 값 |
| `r20_file_input` | 파일 선택 | 파일 선택 |

### §3.3 표시 (7)

| type | 현 | 새 |
|---|---|---|
| `r20_heading` | 제목 (h1~h6) | 제목 |
| `r20_hr` | 가로선 hr | 가로 구분선 |
| `r20_static_text` | 정적 텍스트 | 고정 글자 |
| `r20_image` | 이미지 | 이미지 |
| `r20_icon` | 아이콘 | 아이콘 |
| `r20_spacer` | 여백 spacer | 여백 |
| `r20_disabled_text` | 비활성 텍스트 | 흐린 안내 글자 |

### §3.4 굴림 (12)

| type | 현 | 새 |
|---|---|---|
| `r20_roll_button` | 굴림 버튼 | 굴림 버튼 |
| `r20_action_button` | 액션 버튼 | 동작 버튼 |
| `r20_chat_button` | 채팅 버튼 | 채팅 보내기 버튼 |
| `r20_rolltemplate_define` | rolltemplate 정의 | 굴림 결과 틀 만들기 |
| `r20_rolltemplate_row` | rolltemplate 행 | 굴림 결과 틀: 한 줄 |
| `r20_rolltemplate_cond_if` | 조건 if (rolltemplate) | 굴림 결과 틀: 만약 ... 이라면 |
| `r20_rolltemplate_cond_unless` | 조건 unless | 굴림 결과 틀: 만약 ... 아니라면 |
| `r20_rolltemplate_each` | 반복 each | 굴림 결과 틀: 각각 반복 |
| `r20_rolltemplate_field_ref` | 필드 참조 `{{NAME}}` | 굴림 결과 틀: 값 넣기 |
| `r20_rolltemplate_helper` | rolltemplate 헬퍼 | 굴림 결과 틀: 도우미 |
| `r20_rolltemplate_computed` | 계산 필드 computed | 굴림 결과 틀: 자동 계산 |
| `r20_template_invoke` | rolltemplate 호출 | 굴림 결과 틀 사용하기 |

### §3.5 값과 계산 (Expression — 21)

| type | 현 | 새 |
|---|---|---|
| `r20_literal_number` | 숫자 | 숫자 |
| `r20_literal_string` | 문자열 | 글자 |
| `r20_attr_ref` | `@{속성}` | 시트 값 가져오기 |
| `r20_attr_ref_max` | `@{속성|max}` | 시트 값의 최댓값 |
| `r20_attr_ref_qualified` | `@{대상|속성}` | 다른 시트의 값 |
| `r20_character_name` | `@{character_name}` | 캐릭터 이름 |
| `r20_character_id` | `@{character_id}` | 캐릭터 ID |
| `r20_ability_ref` | `%{능력}` | 능력 매크로 |
| `r20_inline_roll` | `[[ 인라인 굴림 ]]` | 즉시 굴림 |
| `r20_dice_expr` | 주사위 NdM | 주사위 (예: 1d20) |
| `r20_dice_modifier` | 주사위 수정자 | 주사위 옵션 |
| `r20_dice_label` | 굴림 라벨 | 굴림에 이름 붙이기 |
| `r20_query_input` | ? 사용자 입력 | 사용자에게 물어보기 |
| `r20_query_option` | ? 옵션 항목 | 사용자 선택지 |
| `r20_arith_op` | 계산식 | 계산하기 ( + − × ÷ ) |
| `r20_unary_fn` | 함수 (1항) | 한 값 함수 (반올림 등) |
| `r20_binary_fn` | 함수 (2항) | 두 값 함수 (최댓값 등) |
| `r20_cmp_op` | 비교 | 비교하기 ( = < > ) |
| `r20_logic_op` | 논리 결합 | 그리고 / 또는 |
| `r20_logic_not` | 부정 | ... 이 아니다 |
| `r20_paren` | ( 괄호 ) | ( 묶기 ) |

### §3.6 시트 자동화 (25)

| type | 현 | 새 |
|---|---|---|
| `r20_on_sheet_opened` | 시트 열림 시 | 시트가 열렸을 때 |
| `r20_on_attr_change` | 속성 변경 시 | 시트 값이 바뀌었을 때 |
| `r20_on_repeating_change` | 반복 섹션 속성 변경 시 | 반복 영역 값이 바뀌었을 때 |
| `r20_on_repeating_remove` | 반복 섹션 행 제거 시 | 반복 영역의 한 줄이 지워졌을 때 |
| `r20_on_button_click` | 버튼 클릭 시 | 버튼을 눌렀을 때 |
| `r20_worker_if` | 만약 (worker) | 만약 ... 이라면 |
| `r20_worker_for_count` | 횟수 반복 (worker) | ... 번 반복하기 |
| `r20_get_section_ids` | 반복 섹션 ID 가져오기 | 반복 영역 줄 목록 가져오기 |
| `r20_for_each_id` | ID 각각에 대해 | 각 줄마다 반복하기 |
| `r20_get_attrs` | 속성 가져오기 | 시트 값들 가져오기 |
| `r20_set_attrs` | 속성 1개 설정 | 시트 값 바꾸기 |
| `r20_set_attrs_pair` | 속성 여러 개 설정 | 시트 값 여러 개 바꾸기 |
| `r20_generate_row_id` | 새 행 ID 생성 | 새 줄 만들기 (ID) |
| `r20_remove_repeating_row` | 반복 섹션 행 삭제 | 반복 영역의 줄 지우기 |
| `r20_worker_var_set` | 변수 재대입 | 변수 값 바꾸기 |
| `r20_worker_var_let` | 변수 선언 (let) | 변수 만들기 |
| `r20_worker_console_log` | 콘솔 로그 | 콘솔에 출력하기 |
| `r20_worker_return` | 반환 | 값 돌려주기 |
| `r20_worker_v_ref` | 속성 값 v.NAME | 시트 값 |
| `r20_worker_v_max_ref` | 속성 최댓값 v.NAME_max | 시트 값의 최댓값 |
| `r20_worker_let_ref` | 변수 값 | 변수 값 |
| `r20_worker_arith` | 사칙연산 (worker) | 계산하기 |
| `r20_worker_cmp` | 비교 (worker) | 비교하기 |
| `r20_worker_logic` | 논리 (worker) | 그리고 / 또는 |
| `r20_get_translation` | 번역 가져오기 | 번역 가져오기 |

### §3.7 번역 (11)

| type | 현 | 새 |
|---|---|---|
| `r20_i18n_text` | 번역 텍스트 | 번역 글자 |
| `r20_i18n_ref` | `data-i18n` 속성 | 번역 키 연결 |
| `r20_i18n_title` | 번역 title 툴팁 | 번역 (말풍선 도움말) |
| `r20_i18n_placeholder` | 번역 placeholder | 번역 (입력칸 안내문) |
| `r20_i18n_aria_label` | 번역 aria-label | 번역 (스크린리더 라벨) |
| `r20_i18n_var_pair` | i18n 변수 페어 | 번역에 값 끼우기 |
| `r20_locale_value` | 번역 사전 항목 | 번역 사전 항목 |
| `r20_i18n_html` | 번역 HTML 허용 | 번역 (HTML 허용) |
| `r20_i18n_select_option` | 번역 옵션 | 번역 (선택 항목) |
| `r20_i18n_button` | 번역 버튼 | 번역 버튼 |
| `r20_i18n_legend` | 번역 legend | 번역 (그룹 제목) |

### §3.8 디자인 (CSS — 19)

| type | 현 | 새 |
|---|---|---|
| `r20_css_rule` | CSS 규칙 | 디자인 규칙 |
| `r20_selector_class` | `.클래스` 셀렉터 | 클래스 고르기 (.이름) |
| `r20_selector_id` | `#아이디` 셀렉터 | ID 고르기 (#이름) |
| `r20_selector_element` | 요소 셀렉터 | 태그 고르기 |
| `r20_selector_attr` | `[속성]` 셀렉터 | 속성으로 고르기 |
| `r20_selector_descendant` | 자손 (공백) | 안쪽 모든 자손 |
| `r20_selector_child` | 자식 > | 바로 안쪽 자식 |
| `r20_selector_sibling_adj` | 인접 형제 + | 바로 다음 형제 |
| `r20_selector_sibling_gen` | 일반 형제 ~ | 뒤따르는 모든 형제 |
| `r20_selector_pseudo` | 의사 클래스 : | 상태로 고르기 ( :hover 등 ) |
| `r20_selector_comma` | 여러 셀렉터 , | 여러 개 같이 고르기 |
| `r20_css_decl` | 선언 | 스타일 한 줄 |
| `r20_color_literal` | 색 (HEX) | 색 |
| `r20_color_var` | CSS 변수 참조 | 색 변수 가져오기 |
| `r20_css_var_def` | CSS 변수 정의 | 색 변수 만들기 |
| `r20_media_query` | `@media` | 화면 크기 조건 |
| `r20_keyframes` | `@keyframes` | 움직임 정의 |
| `r20_keyframe_stop` | 키프레임 정지점 | 움직임 단계 |
| `r20_css_rule_chain` | 규칙 묶음 | 규칙 묶음 |

### §3.9 고급 (4)

| type | 현 | 새 |
|---|---|---|
| `r20_raw_html` | raw HTML | 직접 HTML 작성 (고급) |
| `r20_raw_css` | raw CSS | 직접 CSS 작성 (고급) |
| `r20_raw_worker` | raw 시트 자동화 | 직접 JS 작성 (고급) |
| `r20_html_comment` | HTML 주석 | 메모 (숨김) |

### §3.10 자주 쓰는 묶음 (Composite — 4)

| type | 현 | 새 |
|---|---|---|
| `r20_attr_with_txt_helper` | 합성: 속성+텍스트 보조 | 묶음: 입력칸 + 안내 글자 |
| `r20_computed_attr` | 합성: 자동 계산 속성 | 묶음: 자동 계산 칸 |
| `r20_dual_roll_button` | 합성: 굴림 버튼 2개(한 줄) | 묶음: 굴림 버튼 두 개 (한 줄) |
| `r20_radio_group` | 합성: 라디오 그룹 | 묶음: 라디오 묶음 |

**합계: 기존 130 + 범용 의미 태그 묶음 1 = 131 ✓**

---

## §4. 카테고리 라벨

| id | 현 라벨 | 새 라벨 | 메모 |
|---|---|---|---|
| `container` | 컨테이너 | 컨테이너 | 그대로 (외래어지만 통용) |
| `input` | 입력 | 입력 | 그대로 |
| `display` | 표시 | 표시 | 그대로 |
| `dice` | 굴림 | 굴림 | 그대로 — TRPG 표준어 |
| `i18n` | 번역 | 번역 | 그대로 |
| `expression` | 표현식 | **값과 계산** | `표현식` 은 학문 jargon |
| `sheet_worker` | 시트 자동화 | 시트 자동화 | 그대로 |
| `css` | 디자인 | 디자인 | 그대로 |
| `advanced` | 고급 | 고급 | 그대로 |
| `composite` | 합성 | **자주 쓰는 묶음** | `합성` 은 추상적 |

설명 (description) 도 일부 다듬음 — `placeholder` / `worker` / `markup` 같은 영문 용어 0.

---

## §5. 인스펙터 필드 라벨 (Out of scope)

블록 내부 inspector 폼 필드 라벨 (예: `HTML 내용`, `JS 식`) 은 v1 범위 X.
v2 에서 추가 자연어화 예정. 우선순위:
- `JS 식` → `식 (자바스크립트)` 또는 `계산식`
- `sheet worker JS` → 위와 동일
- `i18n 변수 페어` 내부 — `i18n` 토큰 제거

---

## §6. 검증 기준 (R1)

PASS 조건:
1. 131 BlockDef 의 `label:` 가 위 §3 매핑 표대로 갱신됨.
2. `pnpm build` + `pnpm lint --max-warnings=0` 통과.
3. 라이브 deployment 의 9 카테고리 펼침 시 dev 토큰 0:
   - `<div>` / `<span>` / `row` / `col` / `select` / `textarea` / `worker` / `rolltemplate` / `i18n` 0
   - `r20_` prefix 0 (사용자 face)
4. 사용자가 "박스 / 표 / 가로 줄 / 시트 값 가져오기" 같은 단어로 블록을 찾을 수 있음.

---

## §7. 후속 작업

- spec 02 §3 의 130 카탈로그 표 — label 컬럼 동기화 (별도 PR).
- 검색 인덱스 (`searchBlocks`) — 새 라벨로 자동 갱신됨 (label 필드 사용).
- 예제 프로젝트 (`public/examples/*`) — 라벨 변경은 도움말 캡션에만 영향, 데이터 무관.
- v2: inspector 필드 라벨 자연어화 (§5).
