# Emit Full Roundtrip — Stage 2 Verify (Generic)

**Anchor**: V2 ("100% 일치 = byte-by-byte 동일 또는 명시적 차이 문서화")
**Script**: `web/scripts/emit_roundtrip_playwright.mjs`
**측정 시각**: 2026-05-18
**대상**: live build (`https://song991123.github.io/roll20-block-editor/`)

## TL;DR

| 시트 카테고리 | 입력 | r1 블록 | r2 블록 | emit1 vs emit2 (block-id strip 후) | 결과 |
|---|---|---|---|---|---|
| 사용자 시트 — mini subset (2 KB) | 2,151 byte | 32 | 32 | NOT identical (30 byte diff) | FAIL |
| 사용자 시트 — 9 KB subset | 9,195 byte | **133** | **133** | NOT identical (42 byte diff) | FAIL |
| 빌트인 D&D 5e 예제 | 23 KB emit | 509 | **234** (54 % loss) | NOT identical + CSS PASS | FAIL |

**핵심 결론: full emit roundtrip 은 byte-identical 미달성.**

CSS 는 byte-identical PASS — CSS emit-import 동치성은 성립.

결손 패턴 3 가지:
1. **table row 평탄화** — `<tr><td data-i18n>label</td><td><input></td></tr>` 가 2차 import 후 `<span data-i18n>label</span>` 만 남고 부모 row/td/input 누락.
2. **multi-class 손실** — `class="sheet-row sheet-header"` → `class="sheet-row"`.
3. **i18n emit 포맷 mismatch** — emit 가 `<!-- i18n[locale] "k": "v" -->` HTML comment 로 출력하는데 importer 가 이걸 i18n key 로 파싱 못함 → 2차 emit 시 escape 누적.

## 측정 방법

본 sandbox 환경(디스크 144 MB)에서 Playwright + Chromium (~300 MB) install 불가 → Chrome MCP `javascript_tool` 로 동일 procedure 수행. Script `emit_roundtrip_playwright.mjs` 는 같은 procedure 의 Playwright 자동화 버전 (보통 환경에서 그대로 동작).

Procedure:
1. live site 로드 + `localStorage.setItem('__perfOn','1')` + reload → `window.__perfHook` 활성.
2. base64 chunked 전송으로 sample HTML 페이지에 inject.
3. `__perfHook.importSheet({html,css,i18n})` 호출 → r1.
4. "코드" tab → HTML/CSS/번역 radio click → `document.querySelector('pre').textContent` 로 emit1 본문 회수.
5. `__perfHook.clearAll()` → emit1 으로 `importSheet` 재호출 → r2.
6. emit2 본문 회수.
7. raw SHA256 + `data-r20-block-id` strip 후 SHA256 비교.

## 측정 결과 sample별

### Sample 1 — Mini (~2 KB)

- r1: **32 블록**, matchPct 100 %, warnings 1.
- emit1 HTML **2,931 byte** (block-id 주입 + 인덴트 정규화 때문에 입력보다 큼).
- r2 (re-import emit1): **32 블록 (동일!)** — block 수 보존.
- emit2 HTML **2,901 byte** (block-id 재할당 + 일부 평탄화).
- **SHA256 byteEqual: false**.
- block-id strip 후도 NOT identical (1619 → 1589 byte, 30 byte diff).
- 첫 diff 위치 583 — emit1 의 `<tr><td data-i18n>label</td><td><input>...</td></tr>` 가 emit2 에서 `<span data-i18n>label</span><span data-i18n>...</span>...` 로 평탄화.

### Sample 2 — 9 KB subset

| 항목 | r1 | r2 |
|---|---|---|
| 입력 byte | 9,195 | 13,620 (emit1) |
| 블록 수 | 133 | **133** (동일) |
| matchPct | 100 % | 100 % |
| warnings | (n/a) | **0** |
| emit byte | 13,620 | 13,578 |
| SHA256 (raw) | `0b7009f5…` | `61cb839a…` |
| SHA256 (block-id strip) | `58ff2e69…` | `302b43bc…` |
| stripped byte | 8,823 | 8,781 (42 byte 손실) |

- NOT byte-identical even after stripping block-ids.
- 첫 diff 위치 533: emit1 `<table><tbody><tr><td data-i18n>label</td><td><input ...></td></tr>` 패턴 → emit2 `<span data-i18n>label</span><span data-i18n>...</span>...<table>` 평탄화.

### Sample 3 — D&D 5e 빌트인 예제

| 항목 | r1 (예제 hydration) | r2 (emit1 → emit2) |
|---|---|---|
| 총 블록 | **509** (HTML 360 / CSS 125 / i18n 24) | **234** (54 % 손실) |
| emit lens | HTML 23,175 / CSS 2,163 / i18n 48 | HTML 23,146 / CSS 2,163 / i18n 64 |

- CSS: SHA `cda5f8f7…` 동일 — **byte-identical PASS**.
- HTML: stripped 후도 NOT identical (29 byte diff).
  - 첫 diff: `class="sheet-row sheet-header"` → `class="sheet-row"`.
- i18n: NOT identical.
  - emit1: `<!-- i18n[ko] "title.sheet": "..." -->`
  - emit2: `<!-- i18n[ko] "--i18nkotitle.sheet": "\"...\"" -->` (escape 한 단계 추가).

블록 수 절반 감소가 가장 우려스러움. 빌트인 D&D 5e 예제는 직접 hydration 으로 들어왔는데, 같은 시트의 emit 본문을 다시 importer 로 보내자 절반이 raw_html fallback 도 없이 누락.

## 잔여 손실 분류

1. `data-r20-block-id` 재할당 — 의도된, harmless. 정규화로 strip 가능.
2. `<tr>/<td>/<input>` 구조 평탄화 — emit 가 `<td data-i18n>label</td>` 패턴을 `<span data-i18n>label</span>` 으로 토하고 부모 row 가 사라짐.
3. multi-class 손실 — `class="A B"` → `class="A"`.
4. i18n 출력 포맷 mismatch — emit 의 HTML comment 포맷이 importer 가 기대하는 입력 포맷과 다름.
5. 빌트인 5e 예제: 절반 block 누락 (원인 미상, raw_html fallback 도 안 됨).

## 결론

- **Stage 1.5 (Import determinism)**: PASS (기존 verify).
- **Stage 2 (Full roundtrip byte-identical)**: **FAIL** — 모든 sample 에서 NOT byte-identical.
- **V2 anchor 충족도**: 부분. 차이는 본 문서에 명시적으로 분류 + backlog 화 됐으나, byte-identical 미달성.

## Backlog (다음 fix 후보)

- [ ] emit 의 `<td data-i18n>label</td>` 패턴 보존 (현 emit 가 span 으로 평탄화).
- [ ] emit 의 multi-class 보존 (CLASS field 가 space-separated 인지 검증, 또는 array field 화).
- [ ] emit 의 i18n 출력 포맷 = importer 인식 포맷 일치 보장 (현 mismatch 가 결손 누적의 주범).
- [ ] 빌트인 5e 예제 절반 block 누락 원인 추적.
- [ ] block-id auto-prefix 가 stripped diff 후에도 차이 만드는지 정규화 path 검증.

## 부록: 본 측정의 한계

- 사용자 시트 full sample (수백 KB) 은 javascript_tool chunked 전송 부담 (~100 calls) 으로 9 KB subset 만 측정. Script `emit_roundtrip_playwright.mjs` 는 full sample 도 처리 가능 (Playwright `page.evaluate` 는 함수 인자로 큰 string 한번에 전달).
- Chrome MCP 우회는 reproducible.
