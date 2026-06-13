# Roll20 Mapping Fidelity — YSHY 1부 (source vs emitted)

Date: 2026-06-12
Method: live app bundle in headless Chromium → `window.__perfHook.importSheet(source)` → `getEmitContent()` → multiset comparison of Roll20-meaningful tokens between source and emitted HTML/CSS/i18n.
Fixture: `test-fixtures/visual/yshy-commission-1bu` (731 KB HTML, 6531 blocks, match 100%, 2 warnings).

## Result after this fix batch: all Roll20-meaningful categories EXACT

| Category | Source | Emitted | Verdict |
| --- | ---: | ---: | --- |
| `name="attr_*"` inputs | 1069 | 1069 | exact multiset |
| `<input>` elements by type | 1049 | 1049 | exact |
| roll buttons (name+value, quote-insensitive) | 808 | 808 | exact |
| `data-i18n` keys (entity-insensitive) | 1083 | 1083 | exact |
| `data-i18n-placeholder` keys | 65 | 65 | exact |
| `placeholder=` attributes | 140 | 140 | exact |
| `disabled=` attributes | 6 | 6 | exact |
| rolltemplates / selects / textareas / imgs / repeating fieldsets | 19/11/9/11/12 | same | exact |
| translation.json keys | 399 | 399 | exact |
| CSS selectors | 192 | 192 | count exact; see notes |

Remaining diffs are comparison artifacts only: attribute quote style (`'` → `"`), HTML entity escaping (`&` → `&amp;`), CSS whitespace normalization (`tr,span` → `tr, span`), and the by-design unprefixed in-app CSS storage (`.sheet-section` stored as `.section`; auto-prefix re-attaches `sheet-` at emit/preview).

## Defects found by this verification and FIXED

| # | Defect | Root cause | Fix |
| --- | --- | --- | --- |
| 1 | Browser import silently lost 57 inputs + 49 roll buttons (SAN block, custom/`_inv`/`_da` skill rows) | Source uses self-closing non-void tags (`<button ... />`); HTML5 `DOMParser` keeps such tags OPEN so following siblings are swallowed as children. Node fallback parser was unaffected — browser-only divergence. | `normalizeSelfClosingTags()` in `lib/import/dom_walker.ts` (quote-aware scanner) applied before DOMParser. |
| 2 | Skill % input + 2nd roll button dropped from every matched skill row | `r20_skill_row` Blockly block DEFINITION lacked `INPUT2_*`, `ROLL2_*`, `ROLL3_*`, `CELL_*` fields that the importer writes — Blockly hydrate logs "Ignoring non-existent field" and drops them. | Added all missing fields to init + inspectorSchema in `lib/blocks/composite_skill_row.ts`. |
| 3 | `CELL_TD_CLASSES` used `` as separator | `` is an illegal XML 1.0 character — corrupts workspace XML (autosave/export/hydrate). | Separator changed to tab; emit splits `/[\t]/` for legacy compat. |
| 4 | placeholder text emitted as `value=` (real attribute value pollution) | `r20_i18n_placeholder` generator wrote DEFAULT into `value`; matcher also merged `value`/`placeholder` into one field. | Generator emits `placeholder=`; block gained separate `VALUE` + `DISABLED` fields; matcher fills them separately. |
| 5 | i18n keys mangled (`fighting(brawl)-u` → `fightingbrawl-u`, `Move rate-u` → `Moverate-u`) | `sanitizeKey` stripped everything outside `[A-Za-z0-9_.-]` — breaks the user's translation.json (Roll20 allows spaces/parens/slashes/`&`/Korean). | `sanitizeKey` now strips control characters only; attribute escaping is handled by `attr()`/`escapeAttr`. |
| 6 | `placeholder` / `data-i18n` / `disabled` lost on plain text/number inputs, textareas, headings, captions | Block definitions had no fields for them; matcher never captured them. | Added `PLACEHOLDER`/`I18N`(`data-i18n`)/`DISABLED` to `r20_text_input`, `PLACEHOLDER`/`DISABLED` to `r20_number_input`, `PLACEHOLDER`/`I18N_PLACEHOLDER` to `r20_textarea`, `I18N` to `r20_heading` and `r20_table_caption`; matcher + generators updated. |
| 7 | CSS attribute selector values lost internal spaces (`[class="repcontainer editmode"]` → `repcontainereditmode`) | `r20_selector_compound` generator stripped ALL whitespace from TAIL including inside quoted strings. | Quote-aware sanitizer in `lib/blocks/css.ts`. |
| 8 | Re-import of own emit rewrote section classes (`sheet-col sheet-small-outline sheet-section-oublie` → `sheet-section sheet-section-oublie`) and lost tokens | `sheet-section-*` / `sheet-toggle-*` container matchers had no multi-class guard (row/col already had one). | Guard added: only exact 1-token (`sheet-section-N`) or 2-token (`sheet-section sheet-section-N`) class lists match; otherwise `r20_div` preserves all tokens. |
| 9 | Whitespace-only lines inside worker scripts grew one indent level per roundtrip | Pretty-printer indents non-empty lines; whitespace-only lines are "non-empty". | `dedentCommonIndent` collapses whitespace-only lines to empty (emitter does not indent empty lines). |
| 10 | UI showed empty-state after hook import (preview/edit blank, "블록 0개") | `__perfHook.importSheet` hydrates with Blockly events disabled and never called `bumpStructure` (the real ImportDialog does). | Hook now bumps store metadata like the product path. |

## Cross-checks after the batch (no regressions)

- Browser L2 roundtrip: **3/3 PASS** (AW2E, Les-Oublies, YSHY 1부) — `reports/roundtrip-browser/`.
- Edit-flow drag/drop smoke: PASS — `reports/edit-flow-smoke/`.
- `corepack pnpm run lint` / `build`: PASS.
- Preview/edit UI smoke after import: renders the YSHY sheet identically in both modes, 0 console errors (background imgur images can flake in the sandbox network; not a code path issue).

## How to reproduce

```
corepack pnpm run build
# serve out/ + headless chromium, then in page context:
#   r = await window.__perfHook.importSheet({html, css, i18n})
#   e = window.__perfHook.getEmitContent()
# compare e vs source with a multiset diff (see this report's tables).
node scripts/browser_roundtrip_smoke.mjs --out-dir ./out --report-dir reports/roundtrip-browser
```

## What this does NOT prove

- Not pixel-level Roll20 visual parity (separate pipeline; viewport/crop normalization still DOING).
- Not all-sheet support — exact-match evidence is YSHY 1부; AW2E (70.5% match) and Les-Oublies (99.7%) keep their unmatched raw fallbacks faithful but unverified at this token level.
- Roll20 sandbox 실기 동작 (worker 실행/굴림)은 본 보고서 범위 밖.
