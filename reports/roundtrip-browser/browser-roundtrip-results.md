# Browser L2 Roundtrip (import → emit → re-import → compare)

Date: 2026-06-12
Script: `scripts/browser_roundtrip_smoke.mjs`
Environment: headless Chromium (chrome-headless-shell 148, playwright-core) running the live static `out/` bundle; the real `window.__perfHook.importSheet` pipeline (parse → Blockly hydrate → emit) both times.
Raw data: `browser-roundtrip-results.json` (merged from per-fixture runs).

## Scope

This is the FIRST real-browser L2 roundtrip evidence. Per fixture: `r1 = importSheet(source)` → `e1 = emit` → `clearAll` → `r2 = importSheet(e1)` → `e2 = emit`, comparing `e1` vs `e2` with `data-r20-block-id` attributes stripped (ids are regenerated randomly on every import by design; raw equality is reported separately as `htmlRawWithIds`).

## Results (updated after the 2026-06-12 mapping-fidelity fix batch): 3/3 PASS

| Fixture | Import | Blocks | Match% | e1 vs e2 (ids stripped) | Verdict |
| --- | ---: | ---: | ---: | --- | --- |
| official-roll20-AW2E | 643 ms | 589 = 589 | 70.5 | html/css/i18n byte-equal | PASS |
| yshy-commission-1bu | 4230 ms | 6531 = 6531 | 100 | html/css/i18n byte-equal | PASS |
| official-roll20-Les-Oublies | 712 ms | 655 = 655 | 99.7 | html/css/i18n byte-equal | PASS |

0 console errors and 0 page errors in all runs. Les-Oublies was originally FAIL for two reasons, both fixed: the `sheet-section-*`/`sheet-toggle-*` container matchers had no multi-class guard (re-import of own emit rewrote `sheet-col sheet-small-outline sheet-section-oublie` into `sheet-section sheet-section-oublie`, +30 blocks), and whitespace-only lines inside worker scripts gained one indent level per roundtrip (pretty-printer indents non-empty lines; `dedentCommonIndent` now collapses whitespace-only lines to empty). See `reports/mapping-fidelity/mapping-fidelity-yshy.md` for the full fixed-defect ledger.

## Bugs found and FIXED during this work (`lib/import/block_matcher.ts`)

Both made every fixture fail before the fix and would grow emitted HTML unboundedly with repeated import/export cycles:

1. **Worker wrapper newline growth.** `r20_raw_worker` emit wraps the body as `<script …>\n${JS}\n</script>`; import kept the wrapper newlines in the body, so each roundtrip added one `\n`. Import now strips exactly one leading and one trailing wrapper newline.
2. **Worker indentation growth.** The HTML emitter pretty-prints nested children with indentation. Normal element text is whitespace-collapsed so it regenerates identically, but script bodies are preserved raw, so each roundtrip added one nesting level of indentation to every worker line. Import now dedents the common leading indentation of the script body (canonical form). Trade-off: multi-line template literals inside worker JS lose their common indentation; accepted and documented in code.

## Remaining defect

None at this fixture set — all three fixtures are fixed points of import→emit (ids stripped). The next escalation level is roundtrip WITH an edit step in between, and a wider fixture set.

## Hollow-pass guard (methodology note)

`clearAll()` remounts the Blockly hosts; an `importSheet` issued in the same tick lands in the disposed workspace and silently produces 0 blocks and EMPTY emits — `e1 === e2` then passes trivially. The script now retries the import until it yields live blocks and requires `blockCount > 0 && e1.html.length > 0` for a PASS. The first (discarded) run of this report had exactly those hollow passes.

## How to rerun

```
corepack pnpm run build
node scripts/browser_roundtrip_smoke.mjs --out-dir ./out --report-dir reports/roundtrip-browser [--only <fixtureId>]
```

Fixtures are read from `test-fixtures/visual/*/source.{html,css,i18n}`. In the sandbox the three fixtures were run as separate processes (45 s shell limit); running all three in one process previously got the process killed during the 732 KB YSHY import, so prefer per-fixture runs in constrained environments.

## What this does NOT prove

- Not visual parity, not Roll20 behavior, not full import/export for all sheets (3 fixtures only).
- e1 vs SOURCE equality is not asserted (L2 is emit stability, not source fidelity).
- The id-stripped comparison intentionally ignores `data-r20-block-id` churn.
