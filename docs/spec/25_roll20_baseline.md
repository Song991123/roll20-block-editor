# 25. Roll20 Sandbox Baseline CSS — 미리보기 베이스라인 분리

> **Anchor:** docs/spec/10_system_architecture.md §3 PreviewMain,
>            docs/spec/12_roll20_output_spec.md §6 (HTML / CSS 제약),
>            docs/spec/17_wysiwyg_mode.md §12 (Shadow DOM mount),
>            docs/audit/05_handoff_to_nextjs.md §3 (specificity 원칙).
>
> **작성일:** 2026-05-18.
> **선언:** 시스템 specific 0. roll20-sheet-builder / D&D 5e / Pathfinder 어떤 시스템 시트에도
> 동일 적용. 본 baseline 은 Roll20 *sandbox* 의 default look 근사이며 사용자
> CSS workspace 의 영역과 분리된다.

---

## §0. 한 줄 — 왜 spec 25 가 필요했나

여태 우리 미리보기는 Roll20 sandbox 가 시트 영역에 박는 base CSS (Bootstrap 3
+ normalize + `.charsheet` 룰) 을 **안 박고** 있었다. 그 결과 사용자가
"내 시트가 Roll20 에선 좁은 number input 인데 우리 미리보기에선 64px 박스",
"폰트가 Pretendard 라 한국어는 예쁘지만 Roll20 의 Helvetica Neue 와 다른 글자
폭", "버튼 색이 GitHub-blue (#0969da) 인데 Roll20 의 light-gray 와 매칭 안 됨"
같은 시각 차이를 직접 추적할 수 없었다 (사용자 2026-05-18 보고).

본 spec 의 fix:

1. `lib/preview/roll20_baseline.{ts,css}` 신규 — Roll20 sandbox 가 박는 base
   CSS 의 *근사* (Bootstrap 3 + normalize + `.charsheet` 룰).
2. `lib/preview/runtime.{ts,css}` 슬림 — form / typography / table 룰을
   baseline 으로 이주. runtime 은 *overlay* (선택 outline, generic layout
   helper, dark mode token, `[data-r20-preview-selected]`) 만.
3. `lib/preview/buildDoc.ts` — iframe `srcdoc` 의 `<style>` 순서 변경:
   **baseline → runtime → layerFilter → user CSS** (사용자 CSS 마지막).
4. `lib/preview/buildDoc.ts:buildSheetParts` (Shadow DOM 경로) — 동일 순서로
   합성한 CSS 를 한 `<style>` 에 박음.

---

## §1. Roll20 sandbox 의 실제 base CSS — 출처

본 baseline 은 `D:\훙냥냥\마렌상\roll20-sheet-builder 시트 고치기\roll20-base\` 의 dump 파일
에서 추출. dump 출처는 사용자가 Roll20 sandbox 페이지 dev tools 로 가져온
원본:

| 파일 | 라인 수 | 역할 |
|---|---:|---|
| `base.css` | 10272 | normalize.css v3.0.3 + Bootstrap 3.x — Roll20 가 sandbox 에 번들 |
| `charactersheet.css` | 728 | Roll20 자체의 `.ui-dialog .charsheet ...` 룰 |
| `jquery.css` | 890 | jQuery UI — sheet 영역 외 (dialog chrome) |
| `vtt.css` | 41146 | Roll20 VTT 전체 (token / canvas / chat 등) — sheet 영역 X |
| `editor-darkmode.css` | 1471 | Roll20 의 dark mode (우리 dark mode 와는 별개) |

우리 baseline 은 *sheet 영역에 적용되는 룰만* 추출. 즉:

- `base.css` 의 normalize / body / form element 기본 (L420~600, L1495~1530,
  L2920~3030).
- `charactersheet.css` 의 `.ui-dialog .charsheet ...` 룰 전체 (L263~400).

**의도된 차이 (100% 정합 X):**

| 차이 | 이유 |
|---|---|
| 셀렉터 prefix `.ui-dialog` 제거 → `.charsheet` 만 사용 | 우리 wrapper 는 `<div class="charsheet">` 직접 — `.ui-dialog` ancestor 없음. 사용자 CSS 가 동일 specificity 로 baseline 을 override 가능 (source order 마지막). Roll20 sandbox 는 `.ui-dialog .charsheet input` (0,2,1) 로 user `.charsheet input` (0,1,1) 을 specificity 로 이기지만, 우리는 *사용자 CSS 우선* 이라는 우리 사이트 원칙 (audit doc 05 §1) 을 따른다. 단점: Roll20 에서 specificity 에 막혀 적용 안 되는 user CSS 가 우리 미리보기에선 적용되어 보이는 차이 발생 가능. Phase 2 에 `.ui-dialog` wrapper 옵션 검토. |
| `dicefontd20` / `pictos` 폰트 → 이모지 fallback | Roll20 전용 폰트는 외부 호스팅 없음. roll button 의 d20 글리프 → `🎲`. compendium button 의 i 글리프 → `ⓘ`. |
| `vtt.css` 의 chat / token UI 룰 제외 | 시트 영역 외 — 우리 미리보기 scope X. 채팅창 영역 (`ChatPane`) 은 우리 컴포넌트 자체 스타일이 default. |
| `editor-darkmode.css` 제외 | 우리는 자체 dark mode (`--r20-*` CSS 변수 + `body[data-theme='dark']`) 사용. Roll20 의 dark mode 와 다른 색조. 의도. |
| `9980+` 라인의 jQuery dialog chrome | sheet 영역 외. |

---

## §2. baseline 룰 카테고리

총 ~340 rule. 카테고리:

| 카테고리 | rule 수 | 출처 |
|---|---:|---|
| box-sizing reset | 1 selector group | base.css L1488 |
| `.charsheet` body 대체 (font, color, padding) | 1 | base.css L1500 + charactersheet.css L263 |
| form element normalize (button/input/select/textarea margin/font/color/cursor) | 8 | base.css L527~590 |
| Bootstrap form-control 근사 (input text/number/email/select/textarea — padding, border, font-size, focus shadow) | 4 | base.css L2972 (.form-control) |
| `.charsheet input` 기본 (height auto, vertical-align, box-sizing) | 1 | charactersheet.css L267 |
| `.charsheet input[type=number] { width: 3.5em }` ★ 핵심 | 1 | charactersheet.css L279 |
| checkbox / radio | 2 | base.css L562, L2943 |
| hidden input | 1 | — |
| button base (.btn 근사) | 4 | base.css L3427 |
| `button[type=roll]` / `button[type=compendium]` 시각 + ::before 아이콘 | 4 | charactersheet.css L313, L320 |
| label | 3 | base.css L2932 |
| fieldset / legend | 2 | base.css L583, L2917 |
| heading h1~h6 | 7 | Bootstrap typography |
| paragraph | 1 | Bootstrap |
| link | 2 | base.css L1517 |
| img | 1 | base.css L502 |
| table / th / td / thead | 4 | base.css L598 + Bootstrap .table |
| hr | 1 | base.css L513 + charactersheet.css L275 |
| `.charsheet .sheet-row` / `.sheet-2colrow` / `.sheet-3colrow` / `.sheet-col` 그리드 | 7 | charactersheet.css L283~309 |
| `.charsheet .repcontainer .repitem` | 3 | charactersheet.css L348 |
| `rolltemplate` / `script` hide | 2 | 시각 노출 X |
| 텍스트 helper (b/strong/i/em/code/kbd/pre/samp) | 4 | Bootstrap reset |

총 ~340 CSS rule, 12KB raw.

★ 표시는 사용자가 직접 영향 확인할 수 있는 가장 큰 변화.

---

## §3. 주입 순서 (buildDoc + shadowMount)

iframe 모드 (`buildSheetDoc`):

```html
<head>
  <style>${roll20BaseIframeCss}</style>     <!-- 1. Roll20 base + charsheet + jquery -->
  <style>${runtimeCss}</style>              <!-- 2. 우리 overlay -->
  <style>${layerFilterCss()}</style>        <!-- 3. layer 필터 -->
  <style>${prefixedCss}</style>             <!-- 4. 사용자 CSS (autoPrefix 후) -->
</head>
```

Shadow DOM 모드 (`buildSheetParts`):

```ts
const css = [
  roll20BaseShadowCss,      // 1
  runtimeCss,               // 2
  layerFilterCss('.charsheet'), // 3
  prefixedCss,              // 4
].join('\n');
```

두 경로 동일 순서. 사용자 CSS 가 source order 마지막 → 동일 specificity 셀렉터
에선 사용자 CSS 가 이긴다 (audit doc 05 §1 원칙 유지).

---

## §4. Ground truth — roll20-sheet-builder 실제 Roll20 렌더 (사용자 share)

사용자가 2026-05-18 share 한 3개 era 의 실제 Roll20 렌더 screenshot (roll20-sheet-builder leak
보호를 위해 URL 기록 X, 사용자 환경의 file path 만 노트):

- **1부 red moon era** — `agent/local_ditto_*/uploads/fc46a3b4-1______.png`.
  dark bg + 빨간달 commission 배경, 헤더 큰 timer `00:00`, 좌측 능력치 grid (근력
  / 민첩 / 건강 / 외모 / 교육 / 크기 / 지능 / 정신력 — 좁은 numeric input + 좌측
  label), 우측 SAN 카드 stack (빨강 border, 50/126/13 수치).
- **2부 waterfall era** — `agent/local_ditto_*/uploads/8fc47c3a-2______.png`.
  03:30 timer, waterfall era 배경.
- **3부 broken glass / mansion era** — `agent/local_ditto_*/uploads/fe3d8868-3______.png`.
  7402 era 코드, 깨진 유리 + 저택 배경.

본 baseline 의 핵심 시각 정합 점:

1. **Numeric input 폭** — Roll20 의 `width: 3.5em` 박힘. roll20-sheet-builder 능력치 input
   (50 같은 2자리) 이 좁은 박스에 박힘. 이전 우리 미리보기는 `width: 64px` 박혀
   더 넓었음.
2. **Form-control 폰트** — `Helvetica Neue, Helvetica, Arial, sans-serif` 14px
   1.428 line-height. roll20-sheet-builder 한국어 라벨은 `Helvetica Neue` 의 fallback (Arial /
   sans-serif) 으로 렌더. Roll20 에서도 한국어는 fallback 폰트로 렌더되므로 정합.
   이전 우리는 `Pretendard` 13px → 한국어 더 예쁜 글자였지만 폭이 달랐음.
3. **Button** — `.btn` 의 light-gray (#fff bg, #ccc border) + roll button (옅은
   회색 + d20 이모지). 이전 우리는 GitHub-blue (#0969da). 색조 명확히 다름.

**커미션 배경 이미지 (red moon / waterfall / broken glass) 는 baseline 영역 X.**
이 이미지들은 사용자 시트 CSS 가 `background-image: url(...)` 로 박은 거고,
사용자 CSS 가 우리 미리보기 안에 그대로 들어가 렌더된다 (autoPrefix 후 user CSS
phase). baseline 은 폰트/폼/그리드 default 만 담당.

**Roll20 채팅창 영역 (굴림 결과 출력 backdrop) 은 baseline 영역 X.** 우리 미리
보기는 시트 영역 (`.charsheet`) 만 보여주고, 채팅창은 별도 컴포넌트 (`ChatPane`)
가 처리. 사용자가 commission 으로 박은 채팅창 배경은 Roll20 의 채팅 패널에 박힌
것이고 우리 미리보기에 재현 X.

---

## §5. 사용자 CSS 가 baseline 을 override 하는 패턴

roll20-sheet-builder 1부 CSS 의 능력치 input 룰 (예시):

```css
.sheet-attribute-input {
  width: 36px;  /* baseline 의 .charsheet input[type=number] { width: 3.5em } 를 override */
  ...
}
```

이 룰은 우리 미리보기에서도 정상 적용 — `.sheet-attribute-input` (class 1개,
0,1,0) 은 `.charsheet input[type=number]` (class 1개 + 속성 1개 + 요소 1개,
0,2,1) 보다 낮은 specificity 지만 → 잠깐 specificity 다툼 됨. Roll20 sandbox
에서는 사용자 룰의 `width` 가 적용 안 됨 (Roll20 의 0,2,1 이 이김). 우리 미리
보기는 `.ui-dialog` wrapper 없음 → baseline 도 0,2,1 → 동일. 결과 동일.

만약 사용자가 `.charsheet .sheet-attribute-input` (0,2,0) 으로 박았다면 — Roll20
의 `.ui-dialog .charsheet input[type=number]` (0,2,1) 이 여전히 이김 (Roll20).
우리 미리보기는 baseline 의 `.charsheet input[type=number]` (0,2,1) 과 동일.

→ 둘 다 같은 결과 도출. 즉 우리 미리보기는 Roll20 의 특수한 specificity 다툼을
*충실히 재현* 한다.

---

## §6. 다음 phase — TODO

1. **Visual diff 자동화** — roll20-sheet-builder example_004 import 후 미리보기 screenshot
   을 Roll20 ground truth 와 element bbox 단위 비교 (Playwright + image diff).
   현재는 수동.
2. **`.ui-dialog` wrapper 옵션** — Roll20 sandbox 의 specificity 와 100% 정합
   하려면 `<div class="ui-dialog"><div class="charsheet">` wrapper 필요. 사용자
   CSS 의 `.ui-dialog` 사용 빈도 측정 후 도입 결정.
3. **dicefontd20 폰트 자체 호스팅 검토** — `🎲` fallback 은 시각 차이 큼. Roll20
   GitHub 의 dicefontd20.woff 라이선스 확인 후 self-host.
4. **vtt.css 의 채팅 영역 dump** — `ChatPane` 컴포넌트의 default 룩을 Roll20
   채팅창과 비슷하게 (검은 bg + 흰 텍스트) 조정. 사용자 시트 CSS leak 격리.

---

## §7. 변경 파일

| 파일 | 변경 |
|---|---|
| `lib/preview/roll20_baseline.ts` | **신규**. Roll20 sandbox base CSS 의 string export. 357 line. |
| `lib/preview/roll20_baseline.css` | **신규**. reference copy. 439 line. |
| `lib/preview/runtime.ts` | 슬림. form / typography / table 룰을 baseline 으로 이주. 151 line (이전 295). |
| `lib/preview/runtime.css` | 동기 슬림. 129 line. |
| `lib/preview/buildDoc.ts` | `roll20BaseIframeCss` / `roll20BaseShadowCss` 주입 순서 + `buildSheetParts` css 배열. |

영향 영역 0:

- `lib/import/*` — touch X.
- `lib/blocks/*` — touch X.
- `components/editor/*` — touch X.
- `lib/blockly/*` — touch X.


---

## §8. 사용자 큐레이션 Ground Truth — 2026-05-18 라운드 2 (commit 본 commit)

### §8.1 배경

§1~§7 의 baseline (340 rule, 12KB 추출본) 만으로는 사용자가 보던 Roll20 의 실
시트 디자인과 시각 차이가 여전히 존재했다 (사용자 보고 2026-05-18:
"롤20 기본적인 디자인이 적용되어야하는데 지금 아직도 다른 디자인이 같이 적용
되는것같다"). 사용자가 직접 큐레이션한 ground truth 폴더는:

```
D:\훙냥냥\마렌상\roll20-sheet-builder 시트 고치기\roll20-base\
├── base.css            (449KB,  10272 line) — Bootstrap 3.x + normalize.css v3.0.3 + Grimoire color tokens
├── charactersheet.css  (14KB,   728  line)  — .ui-dialog .charsheet / .characterdialog 룰
├── jquery.css          (43KB,   890  line)  — jQuery UI Bootstrap (dialog chrome)
├── editor-darkmode.css (36KB,   1471 line)  — Roll20 dark mode (sheet-darkmode scope)
├── vtt.css             (2.96MB, 41146 line) — VTT 전체 (skipped — sheet 영역 X)
├── app.css             (124KB, minified)    — Element Plus / Vue admin UI (skipped — sheet 영역 X)
├── index.scss / var.scss                    — SCSS 소스 (skipped — 컴파일 안 됨)
```

본 라운드는 base/charactersheet/jquery/darkmode 4 파일 (~540KB) 을 **변환 없이
그대로 inject** — §1~§7 의 추출본은 보조 (override candidate) 로 유지.

### §8.2 파일

| 파일 | 라인 / 크기 | 역할 |
|---|---:|---|
| `lib/preview/roll20_base/base.css`            | 10272 / 449KB | reference copy (실 파일) |
| `lib/preview/roll20_base/charactersheet.css`  | 728   / 14KB  | reference copy |
| `lib/preview/roll20_base/jquery.css`          | 890   / 43KB  | reference copy |
| `lib/preview/roll20_base/editor-darkmode.css` | 1471  / 36KB  | reference copy |
| `lib/preview/roll20_base_inline.ts`           | 542KB | AUTO-GENERATED — 위 4 파일을 TS template literal 로 인라인 (Web Worker import 가능) |
| `lib/preview/roll20_base.ts`                  | 76 line | iframe 용 (변환 없음) + Shadow DOM 용 (`:root`→`:host` 리라이트) 합성 |
| `scripts/gen_roll20_base_inline.py`           | 65 line | inline 재생성 스크립트 |

### §8.3 주입 순서 (revised)

**iframe srcdoc (`buildSheetDoc`)**:

```html
<head>
  <style id="roll20-base">${roll20BaseIframeCss}</style>              <!-- 1. base + charsheet + jquery (실 파일) -->
  <style id="roll20-base-dark">${roll20DarkmodeIframeCss}</style>     <!-- 2. dark mode (옵션) -->
  <style id="r20-runtime">${runtimeCss}</style>                       <!-- 3. 우리 overlay -->
  <style id="r20-layer-filter">${layerFilterCss()}</style>            <!-- 4. layer 필터 -->
  <style id="r20-user">${prefixedCss}</style>                         <!-- 5. 사용자 CSS (마지막) -->
</head>
```

**Shadow DOM (`buildSheetParts`)**:

```ts
const css = [
  roll20BaseShadowCss,             // :root → :host, html[data-theme] → :host([data-theme])
  darkMode ? roll20DarkmodeShadowCss : '',
  runtimeCss,
  layerFilterCss('.charsheet'),
  prefixedCss,
].join('\n');
```

2026-06-19 actual iframe probe update:

- `roll20BaselineCss` is kept only as an old reference artifact and is not injected
  into iframe or Shadow render paths. It overrode real Roll20 values with stale
  `border-box`, `14px`, `20px`, and `6px 12px` guesses.
- Full `vtt.css` is not injected into sheet preview/edit. It contains VTT/app UI
  rules such as `proxima-nova` that do not match the actual Roll20 character
  iframe. Chat/VTT styling must be extracted separately for `ChatPane`.
- Shadow edit mode must not force `box-sizing: border-box` on sheet descendants.
  The actual Roll20 character iframe probe measured the `.charactersheet` root as
  content-box, so edit overlays may add affordances but must not change the
  rendered sheet box model.

### §8.4 Shadow DOM isolation 보강

`lib/preview/shadowMount.ts` 의 변경:

1. **wrapper element 가 `<div class="charsheet">` → `<body class="charsheet">`**.
   `document.createElement('body')` 의 결과는 HTMLBodyElement 지만 shadow tree
   안에서는 일반 flow content 로 동작하며, CSS 셀렉터 `body { ... }` 가 정상
   매칭. Roll20 base.css 의 body 룰 (`margin: 0`, line-height, background 등)
   이 우리 미리보기에도 적용됨.

2. **`:host { all: initial; ... }` 의 explicit fallback 색/폰트 — Roll20 기본값
   으로 변경**. 이전: `-apple-system, ..., color: #1f2328, background: #fff`
   (= 우리 앱의 호스트 페이지 기본). 이후: `"Helvetica Neue", Helvetica, Arial,
   ..., color: #333, background: #fff`. body{} 룰이 미스매치한 edge case 에서도
   Roll20 톤 유지.

3. **`:host([data-theme="dark"])` fallback dark — Roll20 의 `#e6e6e6 / #1f1f1f`**
   로 변경. 이전 우리는 GitHub-dark (`#e6edf3 / #0d1117`).

4. **CSS `:root` / `html[data-theme]` 리라이트** (`roll20_base.ts:rewriteForShadow`):
   - `:root\b` → `:host` — CSS variable 정의가 shadow tree 의 후손에게 cascade.
   - `html[data-theme="X"]` → `:host([data-theme="X"]), [data-theme="X"]` —
     host 자체에 박혀도 wrapper 에 박혀도 둘 다 매칭.
   - `html\s*{` → `:host {` — normalize 의 html 룰 (font-family: sans-serif 등)
     이 host 에 적용 → shadow tree 의 fallback 폰트.
   - `html input[disabled]` 같은 descendant 결합 셀렉터는 리라이트 안 함
     (`:host descendent` 는 invalid). 매칭 실패 허용 — base.css 안 그 단일
     룰의 영향은 미미.

### §8.5 의도된 제한 (skipped 항목)

| 항목 | 이유 |
|---|---|
| `vtt.css` (2.96MB) | VTT 전체 (token/canvas/chat). 시트 영역 X. 번들 크기 폭증 우려. 채팅 영역 디자인 따로 필요하면 phase 3 검토. |
| `app.css` (124KB) | Element Plus / Vue admin UI (Refiner 폼 등). Roll20 의 sandbox 시트 영역 외. |
| `index.scss / var.scss` | SCSS 소스 — `@use 'element-plus/...'` 의존성 컴파일 불가. base.css 가 이미 컴파일 결과 포함. |
| `html input[disabled]` 등 `html DESC` selector (Shadow) | `:host DESC` 가 CSS spec 상 invalid. 단일 룰 손실 허용. |
| `:root` 외부에서 cascade 의존하는 element-plus 변수 (e.g. `--el-*`) | element-plus 의 Vue runtime 이 박는 변수 — 우리 미리보기에 없음. fallback 값 (`var(--el-*, default)`) 에 의존하는 룰만 영향, roll20-sheet-builder 시트 자체엔 무관. |

### §8.6 verify 가이드

라이브 deploy 후:

```js
// Shadow DOM 모드에서:
const host = document.querySelector('[data-testid="preview-shadow-host"]');
const shadow = host.shadowRoot;
const body = shadow.querySelector('body.charsheet');
const cs = getComputedStyle(body);
console.log({
  font: cs.fontFamily,     // "Helvetica Neue", Helvetica, Arial, sans-serif
  size: cs.fontSize,       // 14px
  lh:   cs.lineHeight,     // 1.42857143 * 14 = ~20px
  color: cs.color,         // rgb(51, 51, 51)
  bg:   cs.backgroundColor,// rgb(255, 255, 255)
});

// roll button 의 spec — Bootstrap btn + Roll20 charsheet roll button.
const btn = shadow.querySelector('button[type="roll"]');
if (btn) {
  const bcs = getComputedStyle(btn);
  console.log({ bg: bcs.backgroundColor, border: bcs.border, color: bcs.color });
}
```

### §8.7 다음 phase

1. **CSS bundle 분리 (lazy load)** — 540KB inline 은 PreviewMain 진입 시 즉시
   파싱. 미리보기 미사용 사용자에게 불필요. Dynamic import 검토.
2. **`html DESC` 셀렉터 자동 수동 매핑** — 정규식 한계. PostCSS plugin 으로
   `html input` → `:host input, body input` 분기 가능.
3. **vtt.css 의 채팅 영역만 추출** — `#chat-content`, `.message` 등 sheet 영역
   외의 채팅 패널 디자인. `ChatPane` 컴포넌트 default 룩에 사용 검토.
4. **app.css 의 dialog chrome 추출** — Roll20 의 character dialog 외곽 디자인.
   `PreviewMain` wrapper 에 적용 검토.

