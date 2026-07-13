## 2026-07-13 Table Layout Constraint Probe TODO Note

- DONE: Added `diagnose:roll20-chat-table-layout-constraint` to separate ineffective width/min-width/max-width constraints from table auto-layout/min-content behavior.
- VERIFIED: `corepack pnpm run diagnose:roll20-chat-table-layout-constraint -- reports\roll20-actual-compare\2026-06-18-state-map-v1 ..\_tmp_codex_smoke\rolltemplate-chat-smoke-coc-table-intrinsic-clamp-20260713-r2\rolltemplate-chat-smoke-results.json --source-context-dir ..\_tmp_codex_smoke\chat-source-context-source-css-audit-20260713-r4 --intrinsic-width-dir ..\_tmp_codex_smoke\chat-intrinsic-width-coc-table-intrinsic-clamp-20260713-r3 --table-intrinsic-dir ..\_tmp_codex_smoke\chat-table-intrinsic-coc-table-intrinsic-clamp-20260713-r2 --out-dir ..\_tmp_codex_smoke\chat-table-layout-constraint-coc-clamp-20260713-r2` passed.
- RESULT: The new report is `TABLE_LAYOUT_CONSTRAINT_ACTIONABLE` with only YSHY actionable: `ACTUAL_MAX_WIDTH_CAPTURE_GAP_BEFORE_AUTO_LAYOUT_MODEL`. AW2E and Les-Oublies stay `LAYOUT_CONSTRAINT_SECONDARY` for this axis.
- EVIDENCE: YSHY source table has `max-width:280px`, the local clamp candidate computes `maxWidth=1249px`, but local used table width still exceeds it (`1317.141px`) and scrollWidth tracks used width. Actual Roll20 sidecars predate `maxWidth/minWidth`, so actual computed max-width must be recaptured before the auto-layout model can be promoted.
- CURRENT: Next YSHY P0 is actual Roll20 chat DOM recapture with updated `minWidth/maxWidth` fields, then a table auto-layout/min-content model. Do not retry source `max-width`, measured `max-width`, transform, spacing, or broad font CSS as production renderer patches.

## 2026-07-13 CoC Table Intrinsic Clamp Rejection TODO Note

- DONE: Reran diagnostic-only `coc-table-intrinsic-clamp` with YSHY table font context after adding `minWidth`/`maxWidth` to local and Roll20 chat capture style sidecars.
- VERIFIED: `rolltemplate_chat_smoke` passed 3/3 fixtures at `..\_tmp_codex_smoke\rolltemplate-chat-smoke-coc-table-intrinsic-clamp-20260713-r2`.
- VERIFIED: `gate:roll20-chat-candidate-experiment` at `..\_tmp_codex_smoke\candidate-experiment-coc-table-intrinsic-clamp-20260713-r2` rejected the candidate with `HOLD_PRODUCTION_RENDERER_PATCH`, `reject-regresses-fixtures`, `REJECT_STYLE_CONTRADICTION`, and `reject-row-raster-regression`.
- EVIDENCE: YSHY local candidate computed `maxWidth=1249px`, but the table used width and scroll width stayed about `1317px`; `diagnose:roll20-chat-table-intrinsic-probe` at `..\_tmp_codex_smoke\chat-table-intrinsic-coc-table-intrinsic-clamp-20260713-r2` records `local table used width +1317.141px exceeds computed max-width +1249px`.
- FIXED: `diagnose:roll20-chat-intrinsic-width` no longer reports missing actual `maxWidth` as fake `0px`; rerun at `..\_tmp_codex_smoke\chat-intrinsic-width-coc-table-intrinsic-clamp-20260713-r3` keeps only the verified local max-width evidence.
- CURRENT: Do not retry `coc-table-intrinsic-clamp` as production CSS. Next YSHY P0 is a real table auto-layout/min-content model, likely around table formatting context and crop/top-origin, not another `max-width`, transform, spacing, or broad font patch.

## 2026-07-13 Source CSS Audit TODO Note

- DONE: `diagnose:roll20-chat-source-context` now reads fixture `source.css` through `--fixtures-dir` and records exact rolltemplate source declarations for root/table/caption/td targets.
- FIXED: The source CSS selector matcher now uses exact rolltemplate class boundaries, so `.sheet-rolltemplate-coc` no longer accidentally includes `.sheet-rolltemplate-coc-attack` or `.sheet-rolltemplate-coc-defence` rules.
- VERIFIED: Rerun at `..\_tmp_codex_smoke\chat-source-context-source-css-audit-20260713-r4` reports YSHY `.sheet-rolltemplate-coc table` source declarations as `width=100%, max-width=280px, background-size=100%`.
- EVIDENCE: The same report records YSHY caption/td source typography as BookkMyungjo-Bd (`caption font-size=13px`, `td font-size=12px`) and records `sourceMaxWidthExceeded=true`: source table `max-width: 280px` exists, but local/actual used table width still exceeds it while the active table context remains `TABLE_INTRINSIC_SOURCE_CONTEXT_REQUIRED`.
- CURRENT: Next YSHY work should inspect Roll20 rule order/sanitize and table layout semantics around source `width:100%`/`max-width:280px`; do not promote broad table scaling or width declarations.

## 2026-07-13 YSHY Intrinsic Constraint Classification TODO Note

- DONE: `diagnose:roll20-chat-intrinsic-width` now classifies table-wide scroll/client width deltas as `TABLE_SCROLL_INTRINSIC_CONSTRAINT` even when the active style-proof set does not include a transform-contradicted candidate.
- VERIFIED: Rerun at `..\_tmp_codex_smoke\chat-intrinsic-width-yshy-crop-origin-actual-font-20260713-r2` keeps YSHY at `TABLE_SCROLL_INTRINSIC_MODEL_REQUIRED`, but the constraint model is no longer vague `CONSTRAINT_SECONDARY`.
- EVIDENCE: YSHY constraint signals are now explicit: structure matches, row deltas are uniform, cells are small-delta, `tableScrollTracksWidth=true`, `clientTracksWidth=true`, `cssMetricCandidatesRejected=true`, table scrollWidth delta `-69px`, first cell delta `-0.188px`, actual/local table width `0.948x`.
- CURRENT: Next renderer experiment should be a direct table scroll/client intrinsic width model. Do not spend another pass on crop-origin, measured width declarations, spacing/letter replay, transform, or broad font CSS.

## 2026-07-13 YSHY Intrinsic Width Model TODO Note

- VERIFIED: `diagnose:roll20-chat-intrinsic-width` against the rejected crop-origin actual-font smoke wrote ignored output to `..\_tmp_codex_smoke\chat-intrinsic-width-yshy-crop-origin-actual-font-20260713-r1`.
- RESULT: The diagnostic reports `INTRINSIC_WIDTH_MODEL_REQUIRED`.
- RESULT: YSHY is now narrowed to `TABLE_SCROLL_INTRINSIC_MODEL_REQUIRED`: table delta `-68.813px`, first-cell delta `-0.188px`, transform contradicted `NO`.
- RESULT: AW2E and Les-Oublies are classified as `CSS_METRIC_CANDIDATES_REJECTED`, so they should not be solved by the same YSHY table-scroll model.
- CURRENT: Next YSHY P0 is to model Roll20 table scroll/intrinsic width calculation directly. Do not retry transform, broad font CSS, simple top-origin replay, or measured width declarations as fixes.

## 2026-07-13 YSHY Crop-Origin Source-Context Rejection TODO Note

- DONE: Added diagnostic-only chat geometry policy `coc-overflow-crop-origin-y20`, combining CoC/YSHY overflow crop, measured table width declarations, and a `20px` table top-origin offset.
- VERIFIED: `rolltemplate_chat_smoke` for `yshy-coc-table-source-context-crop-origin-actual-font-r1` passed 3/3 fixtures in ignored output at `..\_tmp_codex_smoke\rolltemplate-chat-smoke-yshy-coc-table-source-context-crop-origin-actual-font-20260713-r1`.
- VERIFIED: The candidate only moved YSHY root/table/caption/cell top by `+20px`; table width stayed `1317.140625px`, so measured width declarations still did not control used table width.
- VERIFIED: `gate:roll20-chat-candidate-experiment` rejected the candidate with the same signature as actual-font alone: `HOLD_PRODUCTION_RENDERER_PATCH`, `reject-regresses-fixtures`, `REJECT_STYLE_CONTRADICTION`, `reject-row-raster-regression`, mean aligned delta `16.47`, regressions `2`.
- EVIDENCE: Row raster remained worse than baseline: AW2E weighted `17.93% -> 62%` (`+44.07`), YSHY weighted `21.41% -> 31.55%` (`+10.14`).
- VERIFIED: `diagnose:roll20-chat-table-intrinsic-probe` still reports YSHY `TABLE_WIDE_INTRINSIC_WITH_CROP_OFFSET`: root `-3px`, table `-68.813px`, row spread `0px`, max cell `+0.906px`, top offset `+52.703px`.
- CURRENT: Do not promote `coc-overflow-crop-origin-y20` or the `yshy-coc-table-source-context-crop-origin-actual-font-r1` candidate. Simple top-origin/crop replay is now negative evidence. Next P0 should inspect the table intrinsic/max-content calculation itself.

## 2026-07-13 YSHY Actual-Font Source-Context Rejection TODO Note

- DONE: `diagnose:roll20-chat-candidate-style` now routes `yshy-coc-table-source-context*actual-font*` through the actual Roll20 YSHY table font-context proof instead of the older missing-Bookk proof.
- VERIFIED: `rolltemplate_chat_smoke` for `yshy-coc-table-source-context-actual-font-r1` passed 3/3 fixtures in ignored output at `..\_tmp_codex_smoke\rolltemplate-chat-smoke-yshy-coc-table-source-context-actual-font-20260713-r1`.
- VERIFIED: `gate:roll20-chat-candidate-experiment` rejected that candidate with `HOLD_PRODUCTION_RENDERER_PATCH`, risk `reject-regresses-fixtures`, style `REJECT_STYLE_CONTRADICTION`, row raster `reject-row-raster-regression`, mean aligned delta `16.47`, and regressions `2`.
- EVIDENCE: YSHY style proof says font/source now matches, but table width still contradicts actual Roll20: local `1317.140625px` vs actual `1248.328125px`.
- EVIDENCE: Row raster regressed from baseline: AW2E weighted `17.93% -> 62%` (`+44.07`), YSHY weighted `21.41% -> 31.55%` (`+10.14`).
- VERIFIED: `diagnose:roll20-chat-table-intrinsic-probe` on the same candidate still classifies YSHY as `TABLE_WIDE_INTRINSIC_WITH_CROP_OFFSET`: root `-3px`, table `-68.813px`, row spread `0px`, max cell `+0.906px`, top offset `+52.703px`.
- CURRENT: Do not promote `yshy-coc-table-source-context-actual-font-r1`. Next P0 is a table intrinsic width plus rolltemplate crop/top-origin probe; keep broad width, transform, global font, and spacing patches out of production renderer defaults.

## 2026-07-13 YSHY Table Intrinsic Probe TODO Note

- DONE: `diagnose:roll20-chat-table-intrinsic-probe` now accepts `[local-smoke-json]` plus `--out-dir`, so YSHY/CoC candidate smokes can be checked in ignored temp output without rewriting canonical actual-run reports.
- DONE: `diagnose:roll20-chat-font-intrinsic` now accepts `--out-dir` for the same locked-report-safe diagnostic workflow.
- FIXED: The table intrinsic probe no longer treats a tiny root width delta as a root/message blocker when the table delta is much larger. This avoids misrouting YSHY: root delta `-3px` vs table delta `-68.813px`.
- VERIFIED: Temp YSHY source-context probe at `..\_tmp_codex_smoke\chat-table-intrinsic-yshy-source-context-20260713-r2` reports `TABLE_WIDE_INTRINSIC_WITH_CROP_OFFSET` for `yshy-commission-1bu`.
- VERIFIED: Temp font/intrinsic probe at `..\_tmp_codex_smoke\chat-font-intrinsic-current-20260713-r1` reports YSHY as `FONT_CONTEXT_BEFORE_WIDTH_CSS`, with width override candidates `NO_GAIN`.
- CURRENT: Do not promote CoC/YSHY width, transform, global font, spacing, or broad ChatPane CSS. Next P0 candidate must model CoC/YSHY table-wide intrinsic width together with rolltemplate crop/top-origin and font-face activation/order proof.

## 2026-07-13 Dynamic Chat Candidate Source-Context TODO Note

- DONE: `diagnose:roll20-chat-candidates` and `diagnose:roll20-chat-row-raster-candidates` can now include dynamic candidate names when matching smoke/screenshot overrides are supplied.
- DONE: `diagnose:roll20-chat-candidate-style` now has explicit style-proof handling for the `yshy-coc-table-source-context*` diagnostic family, combining CoC/YSHY table width proof with YSHY font/source-context proof.
- DONE: Moved the `coc-table-actual-width` diagnostic width rule into the post-user-CSS diagnostic override layer as well, so this diagnostic path is not silently weaker than source rolltemplate CSS.
- VERIFIED: `rolltemplate_chat_smoke` for `yshy-coc-table-source-context-r2` passed 3/3 fixtures using `--chat-geometry-policy coc-table-actual-width` and `--chat-typography-policy yshy-missing-bookk-table-font-context`.
- VERIFIED: The candidate experiment gate still returned `HOLD_PRODUCTION_RENDERER_PATCH`, with candidate risk `reject-regresses-fixtures`, style proof `REJECT_STYLE_CONTRADICTION`, and row-raster risk `reject-row-raster-regression`.
- EVIDENCE: The new style proof narrowed the YSHY/CoC failure: font/source context matched, but table width stayed wrong (`localCandidate=1317.140625`, actual Roll20 `1248.328125`). This means a simple table `width` override is not enough; the next useful probe must target table intrinsic/min-content/layout constraints.
- CURRENT: Do not promote `yshy-coc-table-source-context-r1/r2`. Continue with a CoC/YSHY table intrinsic constraint probe, not broad font, transform, or global ChatPane CSS.

## 2026-07-13 Chat Candidate Experiment Bundle TODO Note

- DONE: Added `gate:roll20-chat-candidate-experiment` to bundle one already-generated ChatPane candidate through candidate comparison, row-raster comparison, style proof, table-width budget, and the final renderer action gate.
- DONE: `diagnose:roll20-chat-candidates` and `diagnose:roll20-chat-row-raster-candidates` now accept `--include-candidates`, so isolated experiments run only the default baseline plus named candidates instead of recalculating every historical candidate.
- VERIFIED: `gate:roll20-chat-candidate-experiment` with `aw2e-message-cell-font-context` completed in isolated temp output at `..\_tmp_codex_smoke\candidate-experiment-aw2e-cell-font-20260713-r2`.
- VERIFIED: The bundle returned `HOLD_PRODUCTION_RENDERER_PATCH`, candidate risk `reject-regresses-fixtures`, style proof `REJECT_STYLE_CONTRADICTION`, row-raster risk `reject-row-raster-regression`, and table budget `TABLE_WIDTH_BUDGET_ACTIONABLE`.
- CURRENT: Candidate experiment evidence is now reproducible through the top renderer gate without starting a browser/dev server or rewriting canonical reports. This does not change product renderer CSS, relink assets, upload to Roll20, or prove visual parity.

## 2026-07-13 Renderer Gate Candidate Override TODO Note

- DONE: `gate:roll20-renderer-action` now accepts `--chat-candidate-comparison-dir`, `--chat-candidate-style-proof-dir`, and `--chat-row-raster-candidates-dir`.
- VERIFIED: Renderer gate with AW2E cell-context temp candidate reports records all three overrides and still returns `HOLD_PRODUCTION_RENDERER_PATCH`.
- VERIFIED: The final gate now surfaces temp-only candidate evidence directly: `aw2e-message-cell-font-context` and `aw2e-message-cell-wrap-context` are both rejected by candidate comparison, style proof, and row-raster comparison.
- VERIFIED: The same gate lists both AW2E cell-context candidates in the production exclusion notes, with row-raster deltas around `+44%` for AW2E and `+8.68%` for YSHY.
- CURRENT: Candidate experiment evidence can now flow from ignored temp reports into the final renderer gate without rewriting canonical reports. This does not change product renderer CSS, relink assets, upload to Roll20, or prove visual parity.

## 2026-07-13 Renderer Gate Table-Budget Override TODO Note

- DONE: `gate:roll20-renderer-action` now accepts `--chat-table-budget-dir`, so ignored temp table-budget evidence can reach the final renderer action gate.
- VERIFIED: Renderer gate with `--chat-table-budget-dir ..\_tmp_codex_smoke\chat-table-width-budget-targeted-override-20260713-r1` records `reportOverrides.chatTableWidthBudget` and still returns `HOLD_PRODUCTION_RENDERER_PATCH`.
- VERIFIED: The final gate surfaces the temp budget decisions: AW2E `MESSAGE_CONTENT_WIDTH_BUDGET`, Les `NARROW_WIDTH_MODEL_REQUIRED`, YSHY `TEXT_LAYOUT_CONSTRAINT_BUDGET`.
- CURRENT: This completes the table-budget evidence route from diagnostic output -> targeted plan -> renderer action gate. It does not change product renderer CSS, relink assets, upload to Roll20, or prove visual parity.

## 2026-07-13 Table Budget Override Routing TODO Note

- DONE: `diagnose:roll20-chat-table-width-budget` now accepts `--out-dir`, so agents can write ignored temp budget evidence without rewriting canonical actual-run reports.
- DONE: `plan:roll20-chat-renderer-targets` now accepts `--table-budget-dir` and reads the current table-budget schema (`budgetDecision`, `tableWidthDelta`) from that override.
- VERIFIED: Temp budget output at `..\_tmp_codex_smoke\chat-table-width-budget-targeted-override-20260713-r1` reports AW2E `MESSAGE_CONTENT_WIDTH_BUDGET` (`+15.75px` table delta, `+0.148px` residual), Les `NARROW_WIDTH_MODEL_REQUIRED`, and YSHY `TEXT_LAYOUT_CONSTRAINT_BUDGET` (`-24.531px` table delta).
- VERIFIED: Targeted renderer plan with the table-budget override records `reportOverrides.tableBudget`, returns `HOLD_PRODUCTION_RENDERER_PATCH`, and preserves the split AW2E/YSHY strategies.
- CURRENT: This improves P0 evidence routing for the next renderer experiments. It does not change product renderer CSS, relink assets, upload to Roll20, or prove visual parity.

## 2026-07-13 AW2E Cell Context Targeted-Plan Routing TODO Note

- DONE: `plan:roll20-chat-renderer-targets` now carries `aw2e-message-cell-font-context` and `aw2e-message-cell-wrap-context` in AW2E tried-candidate evidence.
- VERIFIED: Targeted renderer plan with the isolated cell-context candidate comparison now reports both as already tried and not promotable: `aw2e-message-cell-font-context` delta `+41.29%`, `aw2e-message-cell-wrap-context` delta `+41.27%`.
- VERIFIED: The same plan still returns `HOLD_PRODUCTION_RENDERER_PATCH` and increases blockers from `20` to `22`, which is expected because these are additional rejected paths, not renderer fixes.
- CURRENT: Future renderer work should start from the table-width budget/source-context path, not from AW2E `27.3px` cell-context replay. No visual parity claim.

## 2026-07-13 AW2E Cell Context Axis Rejection TODO Note

- DONE: Split the AW2E source-context hypothesis into two narrower smoke candidates: `aw2e-message-cell-font-context` and `aw2e-message-cell-wrap-context`.
- VERIFIED: Both narrow candidates passed 3/3 functional rolltemplate smoke, so the rejection is visual/style evidence, not a click/runtime failure.
- VERIFIED: Candidate comparison rejected both: `risk=reject-regresses-fixtures`, mean `16.3%`, regressions `2`, AW2E aligned mismatch about `59.3%`, YSHY delta `+7.62%`.
- VERIFIED: Row-raster comparison rejected both: AW2E weighted about `62.1%` (`+44.17` / `+44.15`), worst about `65.7%` (`+39.48` / `+39.42`), YSHY weighted `30.09%` (`+8.68`).
- VERIFIED: Style proof rejected both with `REJECT_STYLE_CONTRADICTION`: local AW2E table width `547.921875px` vs actual Roll20 `359.53125px`, and row text-cell widths roughly doubled.
- CURRENT: Do not promote AW2E `27.3px` cell font/context or wrap-context candidates. The next useful P0 is a table intrinsic/source-model probe that explains why actual Roll20 keeps the AW2E table around `359.5px` while local context expands to `547.9px`.

## 2026-07-13 AW2E Source-Context Candidate Rejection TODO Note

- DONE: Added `aw2e-message-source-context` as a diagnostic-only candidate route for candidate comparison, row-raster comparison, style proof, and targeted renderer planning.
- DONE: `plan:roll20-chat-renderer-targets` now accepts `--candidate-comparison-dir` so isolated temp candidate evidence can be included without rewriting canonical reports.
- VERIFIED: Syntax checks for the four touched renderer-diagnostic scripts passed.
- VERIFIED: `rolltemplate_chat_smoke` for `aw2e-message-source-context` passed 3/3 functional rolltemplate smoke.
- VERIFIED: Candidate comparison rejected it: mean `16.55%`, regressions `2`, AW2E delta `+42.03%`, YSHY delta `+7.62%`.
- VERIFIED: Row-raster comparison rejected it: AW2E weighted `62.71%` (`+44.78`), worst `66.48%` (`+40.2`); YSHY weighted `30.09%` (`+8.68`), worst `42.36%` (`+14.63`).
- VERIFIED: Style proof rejected it with `REJECT_STYLE_CONTRADICTION`; AW2E chat/message width matched, but table/text-cell widths contradicted actual Roll20 evidence.
- VERIFIED: Targeted renderer plan with `--candidate-comparison-dir` surfaced the rejected candidate as a blocker and still returned `HOLD_PRODUCTION_RENDERER_PATCH`.
- CURRENT: This prevents a tempting AW2E source-context replay from becoming production renderer CSS. Next P0 remains asset relink plus a narrower exact text metric/table intrinsic model. No visual parity claim.

## 2026-07-13 Chat Current Metrics Out-Dir/Fallback TODO Note

- DONE: `diagnose:roll20-chat-current-metrics` now honors `--out-dir` so agents can write ignored temp evidence when the canonical actual-run report folder is locked.
- DONE: When no explicit `--out-dir` is supplied, locked canonical writes now fall back to ignored `..\_tmp_codex_smoke\...` output on `EPERM`/`EACCES` instead of blocking the diagnostic chain.
- DONE: `scripts/README.md` documents the writable output override and locked-report fallback behavior.
- VERIFIED: `node --check scripts\roll20_chat_current_metrics_audit.mjs` passed.
- VERIFIED: `corepack pnpm run diagnose:roll20-chat-current-metrics -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --out-dir ..\_tmp_codex_smoke\chat-current-metrics-source-context-20260713-r2` passed with `ROLL20 CHAT CURRENT METRICS PASS`, fixtures `3/3 current`, and `missingFields=0`.
- VERIFIED: A follow-up `gate:roll20-renderer-action` run still returned `HOLD_PRODUCTION_RENDERER_PATCH`; this confirms the current-metrics sidecars are no longer the blocker, while source-context/assets/template-scope proof still hold production renderer CSS.
- CURRENT: This is diagnostic plumbing and evidence freshness only. It does not change product renderer CSS, relink assets, upload to Roll20, or prove Roll20 visual parity.

## 2026-07-13 Targeted Renderer Source-Context Plan TODO Note

- DONE: `plan:roll20-chat-renderer-targets` now consumes `chat-source-context-probe-results.json` and carries rule-order/font-face/table-context blockers into the targeted renderer plan instead of leaving that proof only to downstream gates.
- DONE: The plan accepts `--source-context-dir`; when no explicit override is supplied and the canonical source-context report is missing or weak, it auto-selects the newest same-run ignored temp `chat-source-context*` report.
- DONE: `scripts/README.md` now documents the source-context override and auto-fallback behavior for `plan:roll20-chat-renderer-targets`.
- VERIFIED: `corepack pnpm run test:roll20-chat-renderer-targets` passed with self-test assertions for AW2E `RULE_ORDER_FONT_FACE_TABLE_CONTEXT_REQUIRED` and YSHY `SANITIZE_REPLAY_REJECTED_SOURCE_MODEL_REQUIRED`.
- VERIFIED: `corepack pnpm run plan:roll20-chat-renderer-targets -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --out-dir ..\_tmp_codex_smoke\chat-targeted-renderer-plan-source-context-20260713-r1` recorded `reportOverrides.sourceContext=..\_tmp_codex_smoke\chat-source-context-autofallback-20260713-r2`, returned `HOLD_PRODUCTION_RENDERER_PATCH`, and listed source-context blockers for AW2E and YSHY.
- VERIFIED: Feeding that targeted plan into `gate:roll20-chat-template-scope` still returned `HOLD_GLOBAL_CHAT_RENDERER_PATCH`; feeding the template-scope report into `gate:roll20-renderer-action` still returned `HOLD_PRODUCTION_RENDERER_PATCH`.
- CURRENT: This improves plan truthfulness and prevents unsafe renderer-review drift. It does not change product renderer CSS, relink missing assets, upload to Roll20, or prove visual parity.

## 2026-07-13 Chat Source Context Row/Paint Auto Fallback TODO Note

- DONE: `diagnose:roll20-chat-source-context` now auto-selects the newest same-run ignored temp `row-paint-source*` report when the canonical row/paint/source report has weaker sanitize-replay evidence and no explicit `--row-paint-source-dir` was supplied.
- DONE: The fallback requires the candidate report `runDir` to resolve to the active Roll20 actual run, and explicit CLI overrides still win.
- VERIFIED: `corepack pnpm run diagnose:roll20-chat-source-context -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --out-dir ..\_tmp_codex_smoke\chat-source-context-autofallback-20260713-r2` recorded `reportOverrides.rowPaintSourceDir=..\_tmp_codex_smoke\row-paint-source-sanitize-replay-20260713-r1`.
- VERIFIED: The refreshed source-context report stays `SOURCE_CONTEXT_ACTIONABLE`: AW2E and Les-Oublies are `RULE_ORDER_FONT_FACE_TABLE_CONTEXT_REQUIRED`, and YSHY is `SANITIZE_REPLAY_REJECTED_SOURCE_MODEL_REQUIRED` with row/paint/source prior decision `SANITIZE_REPLAY_REJECTED_SOURCE_MODEL_REQUIRED` and sanitize replay delta `+14.95%`.
- VERIFIED: `gate:roll20-chat-template-scope` with the refreshed source-context report still returns `HOLD_GLOBAL_CHAT_RENDERER_PATCH`, and `gate:roll20-renderer-action` with the refreshed source-context/template-scope reports still returns `HOLD_PRODUCTION_RENDERER_PATCH`.
- CURRENT: This is evidence freshness and false-promotion prevention only. It does not change product renderer CSS, relink AW2E/YSHY assets, upload to Roll20, or prove visual parity.

## 2026-07-13 Template Scope Source-Context Auto Fallback TODO Note

- DONE: `gate:roll20-chat-template-scope` now auto-uses the newest same-run ignored temp `chat-cell-allocation-probe-*` and `chat-source-context-*` reports when canonical report folders are missing and no explicit override was supplied.
- DONE: `gate:roll20-renderer-action` now auto-uses the newest same-run ignored temp `chat-template-scope-*` report when the canonical template-scope report lacks source-context evidence.
- VERIFIED: `gate:roll20-chat-template-scope` without manual `--source-context-dir` now records source-context overrides and reports AW2E as `RULE_ORDER_FONT_FACE_TABLE_CONTEXT_REQUIRED` and YSHY as `SANITIZE_REPLAY_REJECTED_SOURCE_MODEL_REQUIRED` instead of collapsing to `MISSING_SOURCE_CONTEXT`.
- VERIFIED: `gate:roll20-renderer-action` without manual `--chat-template-scope-dir` now records the autosource template-scope override and surfaces the same source-context blockers in the top renderer hold output.
- CURRENT: Renderer remains `HOLD_PRODUCTION_RENDERER_PATCH`. This improves gate freshness/truthfulness only; assets, scoped renderer CSS, Roll20 upload, and visual parity remain open.

## 2026-07-13 Chat Renderer Proof Checklist TODO Note

- DONE: `plan:roll20-chat-renderer-targets` now emits a per-fixture `requiredProofChecklist` so AW2E, YSHY/CoC, and unknown narrow-model work cannot be reviewed from strategy names alone.
- DONE: `gate:roll20-chat-template-scope` now propagates the targeted checklist, or derives the same checklist from the required model when an older targeted-plan report is used.
- DONE: Markdown reports now show `Proof checklist`, including AW2E requirements for `.sheet-rolltemplate-aw` style proof, message/content width sidecar, exact text metrics, and Les/YSHY nonregression; YSHY/CoC requirements for `.sheet-rolltemplate-coc` style proof, table intrinsic sidecar, font-face/rule-order/sanitize source context, and AW2E/Les nonregression.
- VERIFIED: `node --check scripts\roll20_chat_targeted_renderer_plan.mjs`, `node --check scripts\roll20_chat_template_scope_gate.mjs`, `corepack pnpm run test:roll20-chat-renderer-targets`, `corepack pnpm run test:roll20-chat-template-scope`, targeted plan run, template-scope gate run, proof-checklist `rg`, `corepack pnpm run lint`, `corepack pnpm run build`, and top renderer gate run passed.
- CURRENT: Renderer action remains correctly held: targeted plan `HOLD_PRODUCTION_RENDERER_PATCH`, template-scope gate `HOLD_GLOBAL_CHAT_RENDERER_PATCH`, top gate `HOLD_PRODUCTION_RENDERER_PATCH`. This is expected because asset relink, style proof, source-context proof, and scoped nonregression are still unresolved.
- CLAIM BOUNDARY: This hardens the diagnostic gate only. It does not change product renderer CSS, upload generated sheets to Roll20, supply user-owned asset URLs, or prove visual parity.

## 2026-07-13 Worker Code Boundary TODO Note

- DONE: The right Code panel now distinguishes Worker JS from visible sheet HTML/CSS. The Worker JS tab shows byte count and states that worker code is preserved for the Roll20 runtime instead of being shown as a sheet canvas object.
- DONE: `smoke:export-dialog` now verifies the right Code tab, Worker JS subtab activation, runtime-boundary copy, and empty-state preservation copy.
- VERIFIED: `node --check scripts\export_dialog_browser_smoke.mjs`, `corepack pnpm run guard:ui-copy`, `corepack pnpm run lint`, `corepack pnpm run build`, and `corepack pnpm run smoke:export-dialog -- --report-dir ..\_tmp_codex_smoke\export-dialog-worker-boundary-20260713-r1 --port 4393` passed.
- CURRENT: This is a UI/verification boundary improvement. Worker JS block editing, full sheet-worker API simulation, actual Roll20 upload verification, and visual parity remain open.

## 2026-07-13 Export Sandbox Diagnostics Progressive Disclosure TODO Note

- DONE: Moved the Roll20 Sandbox cleanup diagnostic rows behind a collapsed advanced section in the export dialog. The user still sees the upload readiness and fatal/non-fatal Sandbox status, but low-level HTML/CSS cleanup metrics no longer crowd the default path.
- DONE: `smoke:export-dialog` now verifies the advanced section starts collapsed, the diagnostic list is not visible before expansion, and the section can be opened to reveal the four preserved diagnostic rows.
- VERIFIED: `node --check scripts\export_dialog_browser_smoke.mjs`, `corepack pnpm run guard:ui-copy`, `corepack pnpm run lint`, `corepack pnpm run build`, `corepack pnpm run smoke:export-dialog -- --report-dir ..\_tmp_codex_smoke\export-dialog-sandbox-details-20260713-r3 --port 4392`, and `corepack pnpm run check:server-hygiene` passed.
- CURRENT: This removes one confusing default UI surface only. Actual Roll20 visual parity, asset relink readiness, Sandbox upload verification, and renderer CSS promotion remain open.

## 2026-07-13 Imported Edit No-Rollback and Interaction Split TODO Note

- DONE: Strengthened `smoke:imported-edit-sync` so imported real-fixture pointer drags must now keep four post-drop samples aligned with the emitted absolute position. This extends the no-rollback guard from the synthetic edit-flow fixture to imported sheets.
- DONE: Split imported non-leaf subtree pixel parity from the default interaction pass with `--require-nonleaf-visual-sync`. Non-leaf layer reorder still records subtree screenshots and pixel diff, but default interaction now tracks structure, preview geometry sync, emitted order, and reimport stability without falsely failing because external resources or pixel-level visual parity are still unresolved.
- DONE: Fixed imported canvas flow insertion smoke so it only drops when the active canvas drop mode is `inside`. If a candidate resolves to `before`/`after`, the smoke skips that drop and tries another target instead of creating an absolute widget and reporting a misleading flow failure.
- VERIFIED: `node --check scripts\imported_edit_sync_smoke.mjs`, `corepack pnpm run smoke:imported-edit-sync -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir ..\_tmp_codex_smoke\imported-edit-no-rollback-strict-20260713-r2 --port 4387`, and `corepack pnpm run check:server-hygiene` passed.
- OBSERVED: AW2E, Les-Oublies, synthetic-nonleaf-flow, and YSHY all report `interaction=PASS`. The moved imported block timelines all report `numericSampleCount=4`, `leftDrift=0`, `topDrift=0`, and first/final sampled coordinates equal the emitted coordinate. AW2E/Les-Oublies/YSHY still report resource WARN/failure and non-leaf subtree pixel visual false, so this is edit interaction/sync proof only.
- CURRENT: Actual Roll20 visual parity, asset relink readiness, external image/font loading, and production renderer CSS remain unresolved.

## 2026-07-13 Edit Drag No-Rollback Strict Smoke TODO Note

- DONE: Strengthened `smoke:edit-flow` so the existing object-drag path now proves all four post-drop samples (`after-pointerup`, `after-1raf`, `after-50ms`, `after-250ms`) stay aligned with the final emitted HTML/CSS position.
- WHY: The user-visible failure mode is not just a final wrong coordinate; it is the feeling that the object snaps back or jitters before the model commit catches up. The smoke now fails if the first rendered post-drop coordinate diverges from the final emitted coordinate by more than 2px.
- VERIFIED: `node --check scripts\edit_flow_browser_smoke.mjs`, `corepack pnpm run smoke:edit-flow -- --out-dir ./out --base-path /roll20-block-editor --report-dir ..\_tmp_codex_smoke\edit-flow-no-rollback-strict-20260713 --port 4386`, and `corepack pnpm run check:server-hygiene` passed. The smoke observed `numericSampleCount=4`, `leftDrift=0`, `topDrift=0`, and identical sampled coordinates `472px, 264px`.
- CURRENT: This is a regression guard for the synthetic edit-flow fixture. It does not prove imported large-sheet drag performance, actual Roll20 visual parity, asset relink readiness, or production renderer CSS readiness.

## 2026-07-13 Asset Placeholder Relink Guard TODO Note

- DONE: Asset replacement maps now reject uncommented draft placeholder targets such as `<paste-user-owned-https-url-here>` instead of treating them as usable replacement URLs.
- DONE: Export readiness now counts placeholder targets separately and warns the user that real Roll20 verification requires user-owned HTTP(S) URLs.
- DONE: `smoke:export-dialog` now verifies that an active placeholder map does not rewrite preview output, does not leak the placeholder into render output, and exposes the expected `미입력` readiness state.
- DONE: The actual-verification CLI paths now reject the same placeholder targets. `scripts/lib/assetReplacements.mjs` will not apply them to baseline/preupload payloads, and `plan:roll20-asset-relink` keeps affected fixtures at `MISSING_RELINK` instead of counting them as local-only coverage.
- VERIFIED: `node --check scripts\export_dialog_browser_smoke.mjs`, `corepack pnpm run test:asset-replacements`, `corepack pnpm run test:roll20-asset-relink`, `node --check scripts\roll20_asset_relink_verification_plan.mjs`, `node --check scripts\lib\assetReplacements.mjs`, `git diff --check`, `corepack pnpm run guard:ui-copy`, `corepack pnpm run lint`, `corepack pnpm run build`, `corepack pnpm run smoke:export-dialog -- --out-dir ./out --base-path /roll20-block-editor --report-dir ..\_tmp_codex_smoke\export-dialog-placeholder-guard-20260713-r3 --port 4383`, `corepack pnpm run plan:roll20-asset-relink -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --map-file ..\_tmp_codex_smoke\asset-placeholder-map.txt --out-dir ..\_tmp_codex_smoke\asset-relink-placeholder-guard-20260713-r1`, and `corepack pnpm run check:server-hygiene` passed.
- CURRENT: This prevents a false "relinked" state from draft maps. AW2E/YSHY still need real user-owned HTTP(S) replacement URLs and Roll20 Sandbox/test-room re-comparison before asset or renderer parity can be claimed.

## 2026-07-13 Edit Layer Mini Map TODO Note

- DONE: Added a compact visual mini-map to each edit layer row so users can scan frame/flow/table-like containers, child density, selected state, and whether the row can receive dropped children without reading DOM-only text.
- DONE: Extended `smoke:edit-flow` so layer drop verification now asserts the mini-map exists on a droppable frame row and exposes role, drop mode, can-drop, and child-count metadata.
- VERIFIED: `node --check scripts\edit_flow_browser_smoke.mjs`, `corepack pnpm run test:layer-roles`, `corepack pnpm run lint`, `corepack pnpm run build`, and `corepack pnpm run smoke:edit-flow -- --out-dir ./out --base-path /roll20-block-editor --report-dir ..\_tmp_codex_smoke\edit-flow-layer-minimap-20260713-r1 --port 4382` passed.
- CURRENT: This improves edit-mode layer readability only. It does not change Roll20 renderer CSS, does not relink AW2E/YSHY assets, and does not prove actual Roll20 visual parity.

## 2026-07-13 Export Asset Relink Draft TODO Note

- DONE: Shared the asset replacement draft builder between import and export flows. The export dialog can now generate a commented `old URL => <paste-user-owned-https-url-here>` draft from the current exported HTML/CSS asset refs, not only from the import dialog.
- DONE: `smoke:export-dialog` now verifies the export draft button, an enabled draft path for an exported asset URL, source URL preservation in the commented map, export-source labeling, and the existing preview/edit/export replacement persistence path.
- DONE: Hardened the export dialog smoke screenshot calls with a short retry so transient Chromium `Page.captureScreenshot` protocol errors do not mask real UI checks.
- VERIFIED: `node --check scripts\export_dialog_browser_smoke.mjs`, `corepack pnpm run test:asset-refs`, `corepack pnpm run test:asset-replacements`, `corepack pnpm run lint`, `corepack pnpm run build`, and `corepack pnpm run smoke:export-dialog -- --out-dir ./out --base-path /roll20-block-editor --report-dir ..\_tmp_codex_smoke\export-dialog-asset-draft-20260713-r3 --port 4381` passed.
- CURRENT: This removes one user-facing relink friction point. AW2E/YSHY still need real user-owned HTTP(S) replacement URLs, followed by local preview/edit/export rerun and Roll20 Sandbox/test-room re-comparison before renderer CSS can be promoted or visual parity can be claimed.

## 2026-07-13 Roll20 Sandbox Font Proxy Candidate TODO Note

- DONE: Added a diagnostic-only `roll20-sandbox-font-proxy` ChatPane font policy. It suppresses document-level user font registration and rewrites rolltemplate font URLs through the Roll20 image-proxy approximation so the font-url/sandbox hypothesis can be measured instead of guessed.
- DONE: Wired the candidate into `rolltemplate_chat_smoke`, `diagnose:roll20-chat-candidates`, `diagnose:roll20-chat-row-raster-candidates`, and `diagnose:roll20-chat-candidate-style` candidate lookup paths.
- VERIFIED: `node --check scripts\rolltemplate_chat_smoke.mjs`, `node --check scripts\roll20_chat_candidate_compare.mjs`, `node --check scripts\roll20_chat_candidate_style_proof.mjs`, `corepack pnpm run build`, and `node scripts\rolltemplate_chat_smoke.mjs --out-dir .\out --base-path /roll20-block-editor --fixtures test-fixtures\visual --report-dir ..\_tmp_codex_smoke\rolltemplate-chat-smoke-roll20-sandbox-font-proxy-20260713-r1 --chat-font-policy roll20-sandbox-font-proxy --port 4371` passed.
- OBSERVED: Candidate comparison rejected `roll20-sandbox-font-proxy`: mean aligned delta `+16.22%`, regressions `2`, AW2E delta `+41.04%`, YSHY delta `+7.62%` (`20.68%` to `28.30%` aligned mismatch).
- OBSERVED: Row-raster comparison also rejected it: AW2E weighted row delta `+44.07%`, YSHY weighted row delta `+8.68%`, `rowRasterRisk=reject-row-raster-regression`.
- CURRENT: Do not promote this candidate. Font URL proxying plus user-font suppression is not the missing Roll20 parity model by itself; next P0 remains exact Roll20 rule order, template shell typography, table intrinsic context, asset/paint context, and scoped model proof before renderer CSS.

## 2026-07-13 Template Scope Source Context Gate TODO Note

- DONE: `gate:roll20-chat-template-scope` now accepts `--source-context-dir` and consumes `chat-source-context-probe-results.json` before a scoped renderer candidate can be reviewed.
- DONE: P0 template-scope promotion is now explicitly blocked when source/context evidence still says `RULE_ORDER_FONT_FACE_TABLE_CONTEXT_REQUIRED`, `SANITIZE_REPLAY_REJECTED_SOURCE_MODEL_REQUIRED`, `FONT_FACE_ACTIVATION_REQUIRED`, or `TABLE_INTRINSIC_SOURCE_CONTEXT_REQUIRED`.
- VERIFIED: `node --check scripts\roll20_chat_template_scope_gate.mjs`, `corepack pnpm run test:roll20-chat-template-scope`, and `corepack pnpm run gate:roll20-chat-template-scope -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --source-context-dir ..\_tmp_codex_smoke\chat-source-context-20260713-r2 --cell-allocation-dir ..\_tmp_codex_smoke\chat-cell-allocation-probe-2026-06-18-state-map-v1-1783904920839 --out-dir ..\_tmp_codex_smoke\chat-template-scope-source-context-20260713-r2` passed.
- OBSERVED: The scoped gate still returns `HOLD_GLOBAL_CHAT_RENDERER_PATCH`, now with `11` blockers. AW2E remains blocked by source/context `RULE_ORDER_FONT_FACE_TABLE_CONTEXT_REQUIRED`, row-raster regression, asset relink, and no style proof; YSHY remains blocked by `SANITIZE_REPLAY_REJECTED_SOURCE_MODEL_REQUIRED`, asset relink, and rejected candidates.
- CURRENT: No production renderer CSS is enabled. Next P0 is a scoped source model that proves Roll20 rule order, font-face activation, and table intrinsic context before any ChatPane renderer promotion.

## 2026-07-13 Chat Source Context Probe TODO Note

- DONE: Added `diagnose:roll20-chat-source-context` to fuse actual Roll20 chat CSS activation, font-face checks, computed table styles, text-measurement samples, width reconciliation, intrinsic-width, and row/paint/source evidence before any renderer CSS change.
- DONE: `gate:roll20-renderer-action` now accepts `--chat-source-context-dir` and includes source-context decisions in the renderer hold report.
- VERIFIED: `node --check scripts\roll20_chat_source_context_probe.mjs` and `corepack pnpm run diagnose:roll20-chat-source-context -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --row-paint-source-dir ..\_tmp_codex_smoke\row-paint-source-sanitize-replay-20260713-r1 --out-dir ..\_tmp_codex_smoke\chat-source-context-20260713-r2` passed.
- VERIFIED: `node --check scripts\roll20_renderer_action_gate.mjs` and `corepack pnpm run gate:roll20-renderer-action -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --chat-source-context-dir ..\_tmp_codex_smoke\chat-source-context-20260713-r2 --row-paint-source-dir ..\_tmp_codex_smoke\row-paint-source-sanitize-replay-20260713-r1 --out-dir ..\_tmp_codex_smoke\renderer-gate-source-context-20260713-r2` passed.
- OBSERVED: Current source-context report is `SOURCE_CONTEXT_ACTIONABLE`. AW2E is P0 at `18.03%`, Les-Oublies is P1 at `6.34%`, and YSHY is P0 at `20.68%`; all have actual Roll20 chat CSS `EXPECTED_RULE_PRESENT` but local-vs-actual font/table context differences.
- OBSERVED: YSHY remains the strongest blocker: actual Roll20 has `.sheet-rolltemplate-coc` rules present, but six `BookkMyungjo-Bd` font checks pass locally and fail in actual Roll20, table context differs across `fontFamily`, `fontSize`, `letterSpacing`, `overflowWrap`, `borderSpacing`, and `width`, and the rejected sanitize replay candidate still worsens YSHY by `+14.95%`.
- CURRENT: Renderer remains held. Next renderer work should build a template-scoped rule-order/font-face/table-intrinsic diagnostic model; do not promote broad typography, filter, transform, or global ChatPane CSS.

## 2026-07-13 YSHY Sanitize Replay Source Model TODO Note

- DONE: `diagnose:roll20-chat-row-paint-source` now separates YSHY/CoC's rejected sanitize replay path from the broader table-intrinsic bucket.
- DONE: When `yshy-sanitize-typography` makes a `TABLE_SCROLL_INTRINSIC` fixture worse, the probe reports `SANITIZE_REPLAY_REJECTED_SOURCE_MODEL_REQUIRED` and records `sourceEvidence.sanitizeReplayDeltaPct`.
- DONE: `gate:roll20-renderer-action` now accepts `--row-paint-source-dir`, so ignored temp row/paint/source diagnostics can feed the renderer decision gate without rewriting canonical Roll20 evidence.
- VERIFIED: `node --check scripts\roll20_chat_row_paint_source_probe.mjs`, `node --check scripts\roll20_renderer_action_gate.mjs`, `corepack pnpm run diagnose:roll20-chat-row-paint-source -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --out-dir ..\_tmp_codex_smoke\row-paint-source-sanitize-replay-20260713-r1`, and `corepack pnpm run gate:roll20-renderer-action -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --row-paint-source-dir ..\_tmp_codex_smoke\row-paint-source-sanitize-replay-20260713-r1 --out-dir ..\_tmp_codex_smoke\renderer-gate-row-paint-sanitize-replay-20260713-r1` passed.
- OBSERVED: YSHY remains P0 at `20.68%` aligned mismatch. Its row/paint/source decision is now `SANITIZE_REPLAY_REJECTED_SOURCE_MODEL_REQUIRED`; `yshy-sanitize-typography` worsens YSHY by `+14.95%`, so simply replaying observed Roll20 typography/sanitize values as local CSS is explicitly rejected.
- CURRENT: Renderer remains `HOLD_PRODUCTION_RENDERER_PATCH` / `rendererReady=NO`. Next YSHY work should compare actual Roll20 rule order, font-face activation, and table intrinsic source context for `.sheet-rolltemplate-coc`; do not promote transform, filter, or broad typography CSS.

## 2026-07-13 Renderer Gate Cell Allocation Fallback TODO Note

- DONE: `gate:roll20-renderer-action` now auto-uses the newest matching ignored temp `chat-cell-allocation-probe-*` report when the canonical `chat-cell-allocation-probe` folder is missing and no explicit `--cell-allocation-dir` was supplied.
- DONE: The auto-selected report must contain a JSON `runDir` that resolves to the active Roll20 actual run, so unrelated temp probes are not silently reused.
- VERIFIED: `corepack pnpm run gate:roll20-renderer-action -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --out-dir ..\_tmp_codex_smoke\renderer-gate-current-20260713-autocell` now records the fallback in `reportOverrides.chatCellAllocation` and reports cell allocation evidence instead of the stale "probe has not been run" warning.
- OBSERVED: Current cell-allocation evidence remains `CELL_ALLOCATION_SECONDARY_OR_ACCEPTABLE`, scenarios `1`, rejected `0`; all three current fixtures route to `UNIFORM_TABLE_SCALE_OR_CROP_CONTEXT`.
- CURRENT: Renderer remains `HOLD_PRODUCTION_RENDERER_PATCH` / `rendererReady=NO`; this fixes gate truthfulness only and does not prove visual parity.

## 2026-07-13 Server Hygiene Check TODO Note

- DONE: Added `check:server-hygiene` so agents can verify leftover project dev/smoke listeners before and after browser work without manually reading all Windows listeners.
- DONE: The checker treats `3000`, `3001`, `3002`, and `4300-4499` as project dev/smoke ports and reports Roll20 CDP `9222` as preserved instead of a failure.
- DONE: `--kill-project` is explicit and limited to matching `node.exe` project listeners; unknown, system, security, Discord, OneDrive, Wacom, and other non-node processes are not killed by this helper.
- VERIFIED: `corepack pnpm run test:server-hygiene`, `node --check scripts\server_hygiene_check.mjs`, and `corepack pnpm run check:server-hygiene` passed. Current check reports no project dev/smoke listener and preserves `127.0.0.1:9222`.
- OBSERVED: This sandbox can deny `tasklist.exe`, so the helper falls back to PID/port evidence with `processName: "unknown"` instead of failing the hygiene check.
- CURRENT: This is workflow safety tooling. It does not change Roll20 rendering, asset relinking, edit sync, or visual parity.

## 2026-07-13 Export README Asset Relink Guidance TODO Note

- DONE: Exported `README.txt` now explains that external images, fonts, Roll20 image proxies, and Imgur page links are not embedded in the zip and must be relinked to user-owned http(s) URLs for Roll20 verification.
- DONE: When `asset-replacements.json` is included in the zip, the README now explicitly tells the user to review the replaced URLs and recompare in Sandbox or a new test room.
- DONE: Added `test:export-readme` so the asset guidance and zip/readme wiring cannot silently disappear.
- VERIFIED: `corepack pnpm run test:export-readme`, `corepack pnpm run test:asset-replacements`, `corepack pnpm run lint`, `corepack pnpm run build`, `corepack pnpm run guard:roll20-evidence -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `git diff --check`, and `corepack pnpm run smoke:export-dialog -- --port 4370 --report-dir ..\_tmp_codex_smoke\export-dialog-readme-assets-20260713-r1` passed.
- OBSERVED: Export dialog smoke still reports console issues `0`, page errors `0`, request failures `0`, external resource requests `0`, and no mojibake.
- CURRENT: This improves the user-facing Roll20 upload/relink path. It does not relink missing third-party assets, does not change production renderer CSS, and does not prove Roll20 visual parity.

## 2026-07-13 Cell Allocation Locked-Report Fallback TODO Note

- DONE: `diagnose:roll20-chat-cell-allocation` now falls back to `..\_tmp_codex_smoke\...` when the canonical `chat-cell-allocation-probe` report folder is locked with `EPERM`/`EACCES` and no explicit `--out-dir` was provided.
- VERIFIED: `node --check scripts\roll20_chat_cell_allocation_probe.mjs`, `corepack pnpm run test:roll20-chat-cell-allocation`, `corepack pnpm run guard:roll20-evidence -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `git diff --check`, `corepack pnpm run lint`, and `corepack pnpm run build` passed.
- VERIFIED: The previously failing command now passes and wrote `..\_tmp_codex_smoke\chat-cell-allocation-probe-2026-06-18-state-map-v1-1783904920839`.
- VERIFIED: Feeding that fallback report into `gate:roll20-renderer-action` wrote `..\_tmp_codex_smoke\renderer-action-gate-2026-06-18-state-map-v1-1783904928615` and replaces the stale "cell allocation probe has not been run" warning with actual evidence.
- OBSERVED: Default cell allocation is `CELL_ALLOCATION_SECONDARY_OR_ACCEPTABLE`; AW2E, Les-Oublies, and YSHY all route to `UNIFORM_TABLE_SCALE_OR_CROP_CONTEXT`, so the next renderer work should keep focusing on template-scoped message/table width, crop/context, assets, and style proof rather than broad cell/font/wrap CSS.
- CURRENT: Renderer still remains `HOLD_PRODUCTION_RENDERER_PATCH` / `rendererReady=NO`; this closes a stale diagnostic gap but does not prove Roll20 visual parity.

## 2026-07-13 Actual Status/Gate Locked-Report Fallback TODO Note

- DONE: `status:roll20-actual` and `gate:roll20-renderer-action` now fall back to `..\_tmp_codex_smoke\...` when the default canonical report output folder is locked with `EPERM`/`EACCES` and no explicit `--out-dir` was provided.
- DONE: `test:layer-roles` now asserts the Korean layer role labels (`프레임`, `흐름`, `표`, `입력`, `버튼`, `텍스트`, `이미지`, `스크립트`, `노드`) so layer-panel copy regressions are caught.
- VERIFIED: `node --check scripts\roll20_actual_status.mjs`, `node --check scripts\roll20_renderer_action_gate.mjs`, `corepack pnpm run test:layer-roles`, `corepack pnpm run lint`, `corepack pnpm run build`, `corepack pnpm run guard:roll20-evidence -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, and `git diff --check` passed.
- VERIFIED: `corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1` now passes after fallback and wrote `..\_tmp_codex_smoke\actual-verification-status-2026-06-18-state-map-v1-1783904650122`.
- VERIFIED: `corepack pnpm run gate:roll20-renderer-action -- reports\roll20-actual-compare\2026-06-18-state-map-v1` now passes after fallback and wrote `..\_tmp_codex_smoke\renderer-action-gate-2026-06-18-state-map-v1-1783904651010`.
- OBSERVED: Current Roll20 actual status remains `rendererReady=NO`, `rendererBlockers=8`, same-structure high chat mismatch `2/3`, max aligned mismatch `20.68%`; this is not a parity claim.

## 2026-07-13 Local App Asset Request TODO Note

- DONE: Removed the app-level Pretendard CDN stylesheet/preconnect from `app/layout.tsx` and restored the Korean metadata title/description.
- DONE: Copied Blockly package media into `public/blockly-media/` and configured both the hidden Blockly workspaces and block gallery previews to use that local media path.
- DONE: `smoke:export-dialog` now records intercepted external resource requests and fails if the old CDN font or remote Blockly sprite path is requested.
- VERIFIED: `corepack pnpm run lint`, `corepack pnpm run build`, and `corepack pnpm run smoke:export-dialog -- --port 4370 --report-dir ..\_tmp_codex_smoke\export-dialog-local-assets-20260713-r1` passed.
- VERIFIED: The final smoke reported console issues `0`, page errors `0`, request failures `0`, and external resource requests `0`.
- CURRENT: This removes app-shell CDN noise from the verified path. It does not change Roll20 sheet rendering, and user sheet assets can still intentionally reference external URLs that must be relinked/verified separately.

## 2026-07-13 Export Dialog Copy and Smoke Reliability TODO Note

- DONE: Cleaned the Roll20 export dialog wording so user-facing Korean no longer mixes stiff/unclear copy around zip export, asset replacement, Roll20 upload readiness, Sandbox diagnostics, and legacy sanitize mode.
- DONE: `smoke:export-dialog` now checks the same normal Korean copy that users see instead of mojibake/broken expected strings.
- DONE: The export-dialog smoke records failed request URLs and locally stubs the known external-only test environment resources (Pretendard CDN CSS and Blockly sprite PNG), so a restricted-network run can still enforce console/page/request failure counts.
- VERIFIED: `node --check scripts\export_dialog_browser_smoke.mjs` passed.
- VERIFIED: `corepack pnpm run lint` and `corepack pnpm run build` passed.
- VERIFIED: `corepack pnpm run smoke:export-dialog -- --port 4370 --report-dir ..\_tmp_codex_smoke\export-dialog-copy-20260713-final` passed with console issues `0`, page errors `0`, and request failures `0`.
- CURRENT: This improves export/import UX truthfulness and the browser smoke gate. It does not add new actual Roll20 screenshots, does not prove visual parity, and does not promote renderer CSS.

## 2026-07-13 Candidate Asset Evidence Override TODO Note

- DONE: `diagnose:roll20-chat-background-assets` now accepts `--out-dir`, `--background-source-dir`, and `--background-raster-dir`, so candidate-specific background evidence can flow into asset byte checks without rewriting canonical reports.
- DONE: `plan:roll20-chat-assets` now accepts `--asset-probe-dir`, `--background-raster-dir`, and `--target-plan-dir` overrides, so asset policy can follow the same candidate evidence branch.
- VERIFIED: `node --check` and self-tests passed for `roll20_chat_background_asset_probe.mjs` and `roll20_chat_asset_preservation_plan.mjs`.
- VERIFIED: First sandboxed candidate asset probe wrote `..\_tmp_codex_smoke\background-assets-aw2e-width-text-metrics-20260713-r1` but reported `ASSET_FETCH_INCOMPLETE`; the network-enabled rerun wrote `..\_tmp_codex_smoke\background-assets-aw2e-width-text-metrics-net-20260713-r1`.
- OBSERVED: With network access, AW2E and YSHY both report `ASSET_BYTES_MATCH_BUT_SOURCE_PLACEHOLDER`: local and actual proxy bytes match (`200 image/png 503b png 161x81`), and the decoded source is the same `removed.png` placeholder.
- VERIFIED: Candidate asset preservation plan wrote `..\_tmp_codex_smoke\chat-assets-aw2e-width-text-metrics-20260713-r1` and keeps `HOLD_RENDERER_FOR_ASSET_POLICY` with `SOURCE_ASSET_LOST_RELINK_REQUIRED` for AW2E and YSHY.
- CURRENT: For these evidence fixtures, no renderer CSS can honestly prove original visual parity until the user supplies/relinks user-owned live assets and the local preview/edit/export plus Roll20 Sandbox comparison are rerun.

## 2026-07-13 AW2E Width/Text Metrics Background-Raster Follow-Up TODO Note

- VERIFIED: Candidate background-raster routing wrote `..\_tmp_codex_smoke\background-raster-aw2e-width-text-metrics-20260713-r1` using the `aw2e-message-width-text-metrics` smoke, candidate row-raster output, candidate row-compositing output, and candidate background-source output.
- OBSERVED: For AW2E, the candidate path routes to `COLOR_ASSET_RASTER_MODEL_REQUIRED`: row weighted mismatch `24.69%`, luma correction gain `-1.39%`, and width experiment `CHAT_MESSAGE_CONTENT_WIDTH`.
- OBSERVED: This confirms that once AW2E width/text measurement is matched, the remaining rejected-candidate axis is color/asset/background raster context, not another global width, font-size, table-cell, or wrapping CSS tweak.
- CURRENT: Keep renderer CSS held. Next AW2E work should compare asset bytes/source placeholders, browser decode/color management, and Roll20 paint/capture context for the flat background rows before any ChatPane CSS promotion.

## 2026-07-13 AW2E Width/Text Metrics Font-Glyph Follow-Up TODO Note

- DONE: `diagnose:roll20-chat-font-glyph` now accepts `--out-dir` / `--report-dir`, so default and candidate smoke evidence can be compared in ignored temp folders without rewriting canonical Roll20 reports.
- VERIFIED: `node --check scripts\roll20_chat_font_glyph_model.mjs` passed.
- VERIFIED: Default font/glyph rerun wrote `..\_tmp_codex_smoke\chat-font-glyph-default-outdir-20260713-r1`. Current default AW2E evidence still says text measurement explains the table delta: `tableDelta=+15.75px`, `tableTextDelta=+15.602px`, residual `+0.148px`, `12` compared samples.
- VERIFIED: Candidate font/glyph rerun wrote `..\_tmp_codex_smoke\chat-font-glyph-aw2e-message-width-text-metrics-20260713-r1`. For AW2E, `aw2e-message-width-text-metrics` brings `tableDelta`, `tableTextDelta`, and residual to `0px`, with `12` compared samples and no table font-family or font-availability change.
- VERIFIED: Fresh row-raster candidate comparison wrote `..\_tmp_codex_smoke\row-raster-candidates-aw2e-width-text-metrics-20260713-r1` and still rejects `aw2e-message-width-text-metrics`: AW2E weighted mismatch worsens `17.93% -> 24.69%`, worst row worsens `26.28% -> 34.28%`.
- VERIFIED: Candidate row-compositing wrote `..\_tmp_codex_smoke\row-compositing-aw2e-width-text-metrics-20260713-r1`; AW2E worst-row mismatch is flat-paint dominated (`edge=0%`, `flat=100%`, `localDarker=68.48%`), not a row text/edge issue.
- VERIFIED: Candidate background-source rerun with the candidate smoke wrote `..\_tmp_codex_smoke\background-source-aw2e-width-text-metrics-candidate-smoke-20260713-r1`; AW2E reports `bg=DECLARATIONS_MATCH`, `widthDelta=0px`, and `BACKGROUND_SOURCE_SECONDARY`.
- CURRENT: `aw2e-message-width-text-metrics` is useful diagnostic evidence because it proves AW2E width/text measurement can be matched, but it remains production-rejected by row raster. The next AW2E probe should compare browser paint/capture/compositing context for the flat row background, not another width/font CSS tweak.

## 2026-07-13 AW2E Width/Text Metrics Cell Allocation Follow-Up TODO Note

- VERIFIED: `aw2e-message-width-text-metrics` was rerun through `diagnose:roll20-chat-cell-allocation` with isolated output at `..\_tmp_codex_smoke\chat-cell-allocation-aw2e-message-width-text-metrics-20260713-r1`.
- OBSERVED: For `official-roll20-AW2E`, this narrower candidate preserves the current local cell allocation exactly in the probe (`tableDelta=0px`, max text-cell delta `0px`, max ratio delta `0%`). It is not rejected for the broad cell-allocation break seen in `aw2e-message-cell-wrap-context`.
- VERIFIED: Feeding that cell-allocation evidence into `gate:roll20-chat-template-scope` wrote `..\_tmp_codex_smoke\chat-template-scope-aw2e-message-width-text-metrics-cell-20260713-r1` and still returned `HOLD_GLOBAL_CHAT_RENDERER_PATCH` with `9` blockers.
- VERIFIED: Feeding the same evidence into `gate:roll20-renderer-action` wrote `..\_tmp_codex_smoke\renderer-gate-aw2e-message-width-text-metrics-cell-20260713-r1` and still returned `HOLD_PRODUCTION_RENDERER_PATCH`.
- OBSERVED: The remaining AW2E blocker is not cell allocation. The candidate is still not promotion-ready because the renderer gate reports `no-meaningful-gain`, `style=NOT_STYLE_PROVEN`, asset relink blockers, and row-raster regression (`weighted delta=+6.76%`, worst-row delta `+8%`).
- CURRENT: Keep `aw2e-message-width-text-metrics` diagnostic-only. Next AW2E work should build a style-proofed, template-scoped message/content width plus exact text measurement model that does not regress row raster, and asset relink remains required before visual parity can be judged.

## 2026-07-13 Cell Allocation Gate Integration TODO Note

- DONE: `gate:roll20-chat-template-scope` now accepts `--cell-allocation-dir` and consumes `chat-cell-allocation-probe-results.json`. A production-blocking cell allocation scenario now becomes a template-scope blocker instead of staying as a standalone diagnostic note.
- DONE: `gate:roll20-renderer-action` now accepts `--cell-allocation-dir` and `--chat-template-scope-dir`, summarizes cell allocation evidence, and adds a top-level production renderer blocker for production-unsafe cell allocation scenarios.
- DONE: `diagnose:roll20-chat-refresh` now runs the default cell allocation probe before the template-scope gate, so future isolated refresh runs carry the default row/cell allocation evidence automatically.
- VERIFIED: `node --check` passed for `roll20_chat_template_scope_gate.mjs`, `roll20_renderer_action_gate.mjs`, and `roll20_chat_diagnostic_refresh.mjs`; `test:roll20-chat-template-scope` passed.
- VERIFIED: Template-scope gate with isolated cell allocation evidence wrote `..\_tmp_codex_smoke\chat-template-scope-cell-allocation-aw2e-wrap-20260713-r1` and increased blockers to `10`, including `official-roll20-AW2E: aw2e-message-cell-wrap-context cell allocation rejected (BROAD_STYLE_BREAKS_CELL_ALLOCATION; table delta=-188.391px, max text-cell delta=+73.719px, max ratio delta=+6.8%)`.
- VERIFIED: Renderer action gate with the same overrides wrote `..\_tmp_codex_smoke\renderer-gate-cell-allocation-aw2e-wrap-20260713-r1` and now includes a top-level blocker: `chat cell allocation probe rejects production-unsafe scenarios: official-roll20-AW2E/aw2e-message-cell-wrap-context=BROAD_STYLE_BREAKS_CELL_ALLOCATION`.
- CURRENT: The broad AW2E cell/wrap/font path is now blocked at the top renderer gate. Next renderer work should preserve default cell ratios and focus on AW2E message/content width plus exact text metrics, while YSHY remains a separate CoC/YSHY table intrinsic/sanitize/font-context track.

## 2026-07-13 AW2E Cell Allocation Probe TODO Note

- DONE: Added `diagnose:roll20-chat-cell-allocation` and `test:roll20-chat-cell-allocation` to compare actual Roll20 chat DOM sidecars against local/candidate smoke row-cell allocation. The report records table width deltas, text-cell deltas, ratio deltas, and per-scenario decisions.
- DONE: Candidate smokes that intentionally cover only one fixture are now reported as `SCENARIO_NOT_IN_LOCAL_SMOKE` for the other fixtures instead of false renderer blockers.
- VERIFIED: `node --check scripts\roll20_chat_cell_allocation_probe.mjs` and `corepack pnpm run test:roll20-chat-cell-allocation` passed.
- VERIFIED: Live diagnostic output wrote `..\_tmp_codex_smoke\chat-cell-allocation-aw2e-wrap-20260713-r2`.
- OBSERVED: Default local chat rendering keeps cell ratios stable for all three current fixtures: AW2E `tableDelta=+15.75px`, max text-cell delta `+4.953px`, max ratio delta `+0.255%`; Les-Oublies `tableDelta=+12px`, max ratio `+0.602%`; YSHY `tableDelta=-24.531px`, max ratio `+0.039%`.
- OBSERVED: The AW2E `aw2e-message-cell-wrap-context` candidate is explicitly rejected as `BROAD_STYLE_BREAKS_CELL_ALLOCATION`: `tableDelta=-188.391px`, max text-cell delta `+73.719px`, max ratio delta `+6.802%`.
- CURRENT: Do not promote or retry broad AW2E cell/wrap/font CSS copying. The next AW2E renderer work should inspect narrower nested text wrappers, table width constraints, or Roll20 paint/crop context while preserving the stable default cell ratios.

## 2026-07-13 AW2E Cell Wrap Context Candidate TODO Note

- DONE: Added a diagnostic-only `aw2e-message-cell-wrap-context` ChatPane typography policy and wired it into local smoke/candidate/style/row-raster diagnostic allowlists. The default ChatPane renderer is unchanged.
- DONE: `rolltemplate_chat_smoke` now records `policyDiagnostics`, including active chat policy attributes plus targeted computed-style checks. This prevents agents from confusing "policy was set" with "policy actually affected computed style."
- DONE: `diagnose:roll20-chat-intrinsic-width` now accepts `--out-dir` and records the selected local smoke plus policy diagnostics, so default and candidate smoke evidence can be compared against actual Roll20 without rewriting canonical reports.
- VERIFIED: AW2E-only local smoke passed to ignored temp output `..\_tmp_codex_smoke\rolltemplate-chat-smoke-aw2e-cell-wrap-policy-diag-20260713-r1`; `policyDiagnostics.status=APPLIED` for `aw2e-message-cell-wrap-context`; post-smoke `netstat` showed no listening `4432` server, only the existing Roll20 CDP listener on `9222`.
- VERIFIED: Intrinsic-width model reruns passed with isolated outputs `..\_tmp_codex_smoke\intrinsic-width-default-outdir-20260713-r1` and `..\_tmp_codex_smoke\intrinsic-width-aw2e-cell-wrap-policy-diag-20260713-r1`.
- OBSERVED: Once measured with policy diagnostics, the candidate reproduces the same bad width profile as the earlier rejected cell-font candidate: AW2E local `table.rect.width=547.921875px` vs actual Roll20 `359.53125px`; text-cell widths are also too wide (`Succeeds` `151.0625px` vs `85.53125px`; `Succeeds partially` `167.4375px` vs `93.71875px`).
- OBSERVED: Default AW2E intrinsic-width comparison remains a small cell-allocation delta (`tableWidthDelta=+15.75px`, max cell delta `+4.953px`, actual/local table width `1.046x`), but the applied wrap/cell-font candidate flips to a broken allocation profile (`tableWidthDelta=-188.391px`, max cell delta `73.719px`, actual/local table width `0.656x`) while row text/counts still match.
- REJECTED: Pixel candidate comparison rejects the candidate: `aw2e-message-cell-wrap-context` reports `fixture-local-incomplete-coverage`, mean delta `+41.27%`, and `1` regression.
- REJECTED: Style proof reports `REJECT_STYLE_CONTRADICTION`; row-raster comparison worsens AW2E weighted mismatch from baseline `17.93%` to `62.08%` (`+44.15`) and worst-row mismatch from `26.28%` to `65.7%` (`+39.42`).
- CURRENT: Do not promote width-close, broad cell-font, or wrap-context CSS to production. The next AW2E renderer investigation should locate a narrower DOM/style layer that yields Roll20 table/cell widths without changing the row paint/raster output, then rerun style proof plus row-raster before any renderer gate change.

## 2026-07-13 AW2E Cell Font Width-Guard TODO Note

- DONE: `rolltemplate_chat_smoke` and the Roll20 chat capture probe snippet now record per-cell `computedStyle` plus box metrics (`offset/client/scroll` width and height). Future Roll20 chat sidecars can prove cell-level font/box context instead of only row/table summaries.
- DONE: `diagnose:roll20-chat-candidate-style` now requires the AW2E `message width + cell font` proof path to match actual Roll20 `table` width as well as message-shell width and font context.
- DONE: The same style proof now checks AW2E text-cell rect widths from `rowMetrics`, so broad cell-font candidates cannot pass by matching only `td:first`.
- VERIFIED: `node --check` passed for `scripts\rolltemplate_chat_smoke.mjs`, `scripts\roll20_chat_capture_plan.mjs`, and `scripts\roll20_chat_candidate_style_proof.mjs`.
- VERIFIED: Targeted style-proof reruns passed with temp outputs `..\_tmp_codex_smoke\chat-style-aw2e-cell-font-width-guard-20260713-r1` and `..\_tmp_codex_smoke\chat-style-aw2e-cell-width-profile-20260713-r1`.
- OBSERVED: `aw2e-message-cell-font-context` is now explicitly rejected by actual table-width evidence: local candidate `table.rect.width=547.921875px` vs actual Roll20 `359.53125px` while chat/message width and `td:first.fontSize` match. This confirms the earlier `+188.391px` table-width explosion is a real blocker, not just stale background-source routing.
- OBSERVED: The same candidate is also rejected by text-cell width evidence: `Succeeds` local `151.0625px` vs actual `85.53125px`, and `Succeeds partially` local `167.4375px` vs actual `93.71875px`. Matching only the empty/result marker cell is insufficient.
- OBSERVED: A local-only smoke combining `aw2e-root-width-actual` with `aw2e-message-cell-font-context` still leaves the internal table at `547.921875px` while the template root is `279px`, so root-width forcing alone does not model actual Roll20 table layout.
- CURRENT: Do not promote or retry broad AW2E cell-font copying. The next AW2E work should model the table/message width and crop context before any luma/background/text antialiasing candidate is considered production-ready. Roll20 visual parity remains unproven.

## 2026-07-13 Background Source/Raster Candidate Evidence Override TODO Note

- DONE: `diagnose:roll20-chat-background-source` now accepts isolated evidence overrides: `--out-dir`, `--default-smoke`, `--parity-dir`, `--style-context-dir`, `--row-compositing-dir`, `--row-raster-candidates-dir`, and `--style-proof-dir`.
- DONE: `diagnose:roll20-chat-background-raster` now accepts `--out-dir`, `--background-source-dir`, `--row-compositing-dir`, `--row-raster-dir`, `--row-raster-candidates-dir`, and `--width-reconciliation-dir`. Both reports record `reportOverrides`.
- DONE: `diagnose:roll20-chat-background-source` now computes observed local-vs-actual table rect width deltas directly from the selected local smoke and Roll20 DOM sidecar, so candidate-specific width explosions are not hidden behind stale canonical style-context deltas.
- DONE: `diagnose:roll20-chat-background-raster` now treats `TABLE_WIDTH_CONTEXT_BEFORE_BACKGROUND_CSS` as higher priority than a promising luma correction. This prevents a broken-width candidate from being misread as a luma renderer fix.
- VERIFIED: `node --check` passed for both changed scripts, and `node scripts\roll20_chat_background_raster_model_probe.mjs --self-test` passed.
- VERIFIED: Default temp-output background source and raster runs passed against `reports\roll20-actual-compare\2026-06-18-state-map-v1`, writing to `..\_tmp_codex_smoke\background-source-outdir-smoke-20260713-r1` and `..\_tmp_codex_smoke\background-raster-outdir-smoke-20260713-r1`.
- VERIFIED: Candidate-specific runs consumed the rejected `aw2e-message-cell-font-context` smoke/compositing/row-raster evidence. Outputs: `..\_tmp_codex_smoke\background-source-aw2e-cell-font-20260713-r1` and `..\_tmp_codex_smoke\background-raster-aw2e-cell-font-20260713-r1`.
- OBSERVED: With direct observed width evidence, the rejected AW2E cell-font candidate shows table rect width delta `+188.391px` versus actual Roll20. Background raster now routes it to `TABLE_WIDTH_CONTEXT_BEFORE_LUMA_MODEL`, not `ROW_LUMA_MODEL_PROMISING`.
- OBSERVED: YSHY routes to `BACKGROUND_SIZE_CANDIDATE_REJECTED` / `BACKGROUND_SIZE_SCALE_REJECTED` under the same candidate-specific evidence. Do not retry background-size/table-scale or filter hacks for YSHY.
- CURRENT: The next implementation candidate should be diagnostic-only and template-scoped. For AW2E, fix or model message/table width/crop context before treating luma correction as a renderer model. For YSHY, compare fetched image/proxy bytes and browser paint output next. Roll20 visual parity remains unproven.

## 2026-07-13 AW2E Cell Font Row Compositing Follow-Up TODO Note

- DONE: `diagnose:roll20-chat-row-paint-source` now accepts isolated evidence overrides: `--out-dir`, `--candidate-comparison-dir`, `--style-proof-dir`, `--parity-dir`, `--mask-dir`, `--row-geometry-dir`, `--width-reconciliation-dir`, `--font-intrinsic-dir`, `--default-smoke`, and `--paint-smoke`.
- DONE: `diagnose:roll20-chat-row-compositing` now accepts `--out-dir`, `--parity-dir`, `--row-raster-dir`, and `--row-paint-source-dir` while still preserving the existing positional local smoke/screenshot arguments. Reports record `reportOverrides` so agents can tell whether a run used canonical or temp candidate evidence.
- VERIFIED: Syntax checks passed for both changed scripts. Default temp-output runs passed against `reports\roll20-actual-compare\2026-06-18-state-map-v1` and wrote to `..\_tmp_codex_smoke\row-paint-source-outdir-smoke-20260713-r1` plus `..\_tmp_codex_smoke\row-compositing-outdir-smoke-20260713-r1`.
- VERIFIED: Candidate-specific reruns consumed the rejected `aw2e-message-cell-font-context` smoke, row-raster, candidate comparison, and style-proof temp evidence. Final compositing output was `..\_tmp_codex_smoke\row-compositing-aw2e-cell-font-with-paint-source-20260713-r1`.
- OBSERVED: The rejected AW2E cell-font candidate worsens AW2E row-weighted mismatch to `62.73%`, but a virtual luma correction drops that to `14.83%` (`-47.9%` gain). The decision is `LUMA_BACKGROUND_COMPOSITING_MODEL_REQUIRED`, not a font-size or width promotion.
- OBSERVED: In the same candidate-specific compositing run, YSHY routes to `BACKGROUND_COMPOSITING_MODEL_REQUIRED`; the next YSHY/CoC experiment should target row background/source compositing and must not promote a CSS filter hack.
- CURRENT: Do not retry or promote `aw2e-message-cell-font-context`. Next P0 is a template-scoped background/luma compositing probe for AW2E, then a separate YSHY/CoC background/source compositing probe. This still does not prove Roll20 visual parity.

## 2026-07-13 AW2E Cell Font Context Candidate TODO Note

- DONE: Added a diagnostic-only `aw2e-message-cell-font-context` ChatPane typography policy. It can be combined with `aw2e-message-full-width` to test the actual Roll20 AW2E chat/message width plus table/cell font context without changing the default renderer.
- DONE: `diagnose:roll20-chat-candidates`, `diagnose:roll20-chat-row-raster-candidates`, and `diagnose:roll20-chat-candidate-style` can now consume temp candidate smoke evidence through `--candidate-screenshots`, `--candidate-smoke`, and `--candidate-comparison-dir` overrides. This is needed because `reports/` is read-only on this machine and new candidate smoke output must stay in ignored temp folders.
- VERIFIED: `node --check` passed for the changed chat scripts. `node scripts\rolltemplate_chat_smoke.mjs ... --report-dir ..\_tmp_codex_smoke\rolltemplate-chat-smoke-aw2e-message-cell-font-context-20260713-r1 --chat-geometry-policy aw2e-message-full-width --chat-typography-policy aw2e-message-cell-font-context` passed for all three visual fixtures.
- OBSERVED: The candidate style proof confirms the AW2E computed-style target itself: chat/message width `340px`, table font size `13.65px`, and `td:first` font size `27.3px` match actual Roll20 evidence.
- REJECTED: Pixel and row-raster evidence reject the candidate. Candidate comparison reports `aw2e-message-cell-font-context` as `reject-regresses-fixtures`, mean aligned delta `+16.55%`, AW2E delta `+42.04%`, and YSHY delta `+7.62%`. Row-raster reports AW2E weighted mismatch worsening from `17.93%` to `62.73%` (`+44.8%`) and worst-row mismatch worsening by `+40.24%`.
- CURRENT: Matching isolated computed font-size values is not sufficient. The next AW2E investigation should inspect row paint/source/rasterization, crop/scale, and possibly nested element-specific text rendering before adding another CSS candidate. Do not promote `aw2e-message-cell-font-context`.

## 2026-07-13 Chat Candidate Style-Proof Best-Candidate Coverage TODO Note

- DONE: `diagnose:roll20-chat-candidate-style` now supports `--include-best-per-fixture` and `--include-candidates <comma-list>`. The default behavior remains narrow, but agents can now force the style-proof report to cover the exact best candidates later consumed by `gate:roll20-chat-template-scope`.
- WHY: The template-scope gate was selecting best pixel candidates such as `aw2e-message-width-text-metrics` and `paint-dim-background`, but the style-proof script only covered `candidate-needs-style-proof` / `single-fixture-only` risks. Those best candidates therefore appeared as `NOT_STYLE_PROVEN` instead of being accepted or rejected by actual Roll20 computed-style evidence.
- VERIFIED: `node --check scripts\roll20_chat_candidate_style_proof.mjs` passed.
- VERIFIED: Live run passed with `--include-best-per-fixture --out-dir ..\_tmp_codex_smoke\chat-candidate-style-proof-best-20260713-r2`, selecting `no-shadow`, `aw2e-message-width-text-metrics`, `roll20-intrinsic-spacing`, and `paint-dim-background`.
- OBSERVED: The expanded style proof reports `REJECT_STYLE_CONTRADICTION` for `3/4` selected candidates. AW2E's message-width/text-metrics candidate matches chat/message width and table font size, but contradicts actual Roll20 on `td:first` font size (`13.65px` local candidate vs `27.3px` actual). YSHY's `paint-dim-background` pixel gain comes from a local CSS filter, while actual Roll20 computed `filter` is `none`.
- VERIFIED: Feeding the expanded style proof into `gate:roll20-chat-template-scope` still returns `HOLD_GLOBAL_CHAT_RENDERER_PATCH` with `9` blockers, now with AW2E and YSHY best candidates classified as style contradictions instead of style-proof gaps.
- CURRENT: Next renderer work should stop retrying these best candidates as-is. AW2E needs a narrower cell font/context model, and YSHY needs a real table/font/asset model rather than local paint filters. Asset relink remains a separate blocker before visual parity can be claimed.

## 2026-07-13 Chat Template Scope Isolated Evidence Override TODO Note

- DONE: `diagnose:roll20-chat-candidate-style` now accepts `--out-dir <writable-report-dir>`, so style-proof reruns can read canonical Roll20 actual evidence while writing into ignored temp folders instead of rewriting `chat-candidate-style-proof` inside the selected run.
- DONE: `gate:roll20-chat-template-scope` now accepts report override directories for targeted plan, width reconciliation, policy, candidate comparison, style proof, asset plan, and row-raster candidate reports. Override paths are recorded in the generated JSON/Markdown so later agents can audit whether the gate used canonical or temp evidence.
- VERIFIED: `node --check` passed for both changed scripts, and `node scripts\roll20_chat_template_scope_gate.mjs --self-test` passed.
- VERIFIED: Live temp-output style proof passed against `reports\roll20-actual-compare\2026-06-18-state-map-v1` with `--out-dir ..\_tmp_codex_smoke\chat-candidate-style-proof-outdir-20260713-r1`.
- VERIFIED: Live temp-output candidate and row-raster candidate comparisons passed, then `gate:roll20-chat-template-scope` consumed those temp reports with `--candidate-comparison-dir`, `--style-proof-dir`, and `--row-raster-candidates-dir`.
- OBSERVED: The override gate still returns `HOLD_GLOBAL_CHAT_RENDERER_PATCH` with `9` blockers. AW2E remains scoped to `.sheet-rolltemplate-aw` / `MESSAGE_CONTENT_TEXT_METRICS` and its best text-metrics candidate is blocked by `NOT_STYLE_PROVEN`, asset relink, and row-raster regression. YSHY remains scoped to `.sheet-rolltemplate-coc` / `TABLE_INTRINSIC_SANITIZE_FONT`; `paint-dim-background` improves YSHY aligned mismatch but is still rejected by fixture regression and asset blockers.
- CURRENT: This is evidence isolation and gate wiring only. It does not promote ChatPane CSS, relink assets, upload to Roll20, or prove Roll20 visual parity. Next P0 remains building a genuinely template-scoped candidate that survives style proof, row-raster checks, and asset policy.

## 2026-07-13 Renderer Gate Root Report Override TODO Note

- DONE: `gate:roll20-renderer-action` now accepts `--full-root-dir`, `--scroll-metrics-full-root-dir`, `--root-cutoff-dir`, and `--geometry-dir` report overrides. This lets a fresh isolated root/geometry diagnostic run feed the renderer action gate without rewriting canonical actual evidence folders.
- DONE: The renderer gate output JSON records `reportOverrides`, so later agents can tell whether the gate used canonical reports or temp isolated reports.
- VERIFIED: `node --check scripts\roll20_renderer_action_gate.mjs` passed.
- VERIFIED: Live override run passed against `reports\roll20-actual-compare\2026-06-18-state-map-v1` with `--full-root-dir ..\_tmp_codex_smoke\full-root-candidates-outdir-20260713`, `--geometry-dir ..\_tmp_codex_smoke\geometry-outdir-20260713`, and temp gate output `..\_tmp_codex_smoke\renderer-gate-with-root-overrides-20260713`.
- OBSERVED: The override gate still returns `HOLD_PRODUCTION_RENDERER_PATCH`. It now includes the fresh diagnostic evidence lines: AW2E best `normal-state-map` `8.23%`, Les-Oublies best `normal-state-map` `7.77%`, and YSHY best `sandbox-inline-block-font-zero-source` `15.69%`.
- CURRENT: This connects isolated root diagnostics to the renderer decision flow. It still does not promote CSS or prove visual parity; the active blockers remain chat/template split models, asset relink for AW2E/YSHY, and non-uniform diagnostic patch families.

## 2026-07-13 Root Geometry Diagnostics Out-Dir TODO Note

- DONE: `diagnose:roll20-geometry`, `diagnose:roll20-height-drift`, and `smoke:roll20-full-root-candidates` now accept `--out-dir <writable-report-dir>`, so agents can rerun Roll20 root/height diagnostics without rewriting canonical actual evidence folders.
- DONE: `smoke:roll20-full-root-candidates` now uses `out-dir/.build` for its temporary `buildDoc.ts` compile when `--out-dir` is supplied. This avoids the older locked/read-only `.tmp/full-root-candidate-build` folder that blocked fresh runs.
- VERIFIED: Syntax checks passed for all three scripts. Live temp-output runs passed for geometry, Les-Oublies height drift, and full-root candidates against `reports\roll20-actual-compare\2026-06-18-state-map-v1`.
- OBSERVED: Temp geometry output from canonical sources reports Les-Oublies root delta `-3.625px` and top content finding `TABLE.sheet-center-content`; temp height drift for Les-Oublies reports `height-close`, root delta `-3px`, and `localTailInk=0%`.
- OBSERVED: Fresh temp full-root candidate output reports AW2E best `normal-state-map` mismatch `8.23%` with root delta `-7268.063`, Les-Oublies best `normal-state-map` mismatch `7.77%` with root delta `-594.234`, and YSHY best `sandbox-inline-block-font-zero-source` mismatch `15.69%` with root delta `585.828`.
- CURRENT: This is diagnostic repeatability and evidence isolation only. It does not promote renderer CSS, does not update canonical Roll20 evidence, and does not prove visual parity. The next P0 is to decide whether a temp-run copy or explicit source-report wiring is needed so renderer gates can consume fresh isolated full-root output without contaminating canonical reports.

## 2026-07-13 Layer Role Token Classification TODO Note

- DONE: `lib/editor/layerRoles.ts` now classifies block roles by block-type tokens instead of arbitrary substring matches. Exact table tokens such as `r20_tr`, `r20_td`, and `r20_th` still map to table roles, but `r20_attr_ref`, `r20_attr_ref_max`, and `r20_attribute_card` no longer inherit a false table/container role from the `tr` letters inside `attr`.
- WHY: The edit layer panel uses these roles to decide labels, rails, and whether a node looks like it can receive children. Misclassifying attr/attribute blocks as table containers makes the Figma-like layer model lie to the user and can advertise impossible drop targets.
- VERIFIED: `test:layer-roles` passes and asserts table, flow, frame, control, action, media, text, and runtime classifications, including the attr false-positive regression.
- VERIFIED: `smoke:edit-flow -- --port 4416 --report-dir ...\_tmp_codex_smoke\edit-flow-layer-role-token-20260713` passed. The smoke still reports flow/absolute drops, before/inside/after layer modes, persistent container affordance, selection sync, free placement inside frame, canvas width controls, and clean edit UI copy. The nested input layer path now reports role `control`, while frame containers still report `frame`.
- CURRENT: This fixes role truthfulness only. Broader imported-sheet edit UX and actual Roll20 visual parity still need the existing smoke and Roll20 gates before any DONE claim.

## 2026-07-13 Asset Relink Plan Out-Dir TODO Note

- DONE: `plan:roll20-asset-relink` now accepts `--out-dir <writable-dir>`, matching the current Roll20 status/renderer diagnostic temp-output workflow.
- WHY: The script was reading canonical Roll20 evidence but still wrote its JSON/Markdown/template into the selected actual-run folder. On the active run this failed with `EPERM` when Windows or another process locked the generated report files.
- VERIFIED: `node --check scripts\roll20_asset_relink_verification_plan.mjs`, `test:roll20-asset-relink`, and both live `--out-dir` argument orders passed against `reports\roll20-actual-compare\2026-06-18-state-map-v1`.
- CURRENT: The live plan still reports `RELINK_MAP_REQUIRED`: `official-roll20-AW2E` and `yshy-commission-1bu` remain `MISSING_RELINK` with no map entries. This is the correct blocker state, not a visual-parity pass.
- SERVER HYGIENE: No project dev/smoke server was started for this check. Preserve the existing Roll20 CDP listener on port `9222`; do not stop user/system processes such as Discord, OneDrive, Wacom, or security modules without explicit user approval.
- CLAIM BOUNDARY: This is verification resilience only. It does not relink assets, change product renderer CSS, upload to Roll20, or prove local-vs-Roll20 visual parity.

## 2026-07-13 Edit Canvas Before/After Drop Marker TODO Note

- DONE: Canvas widget drag now creates an edit-only `data-r20-drop-position-marker="1"` overlay for before/after insertion targets. The marker is a fixed-position blue line computed from the target element rect, and it is removed on drop, dragleave, or target reset.
- WHY: The existing canvas before/after state was attached to the small target element itself, so dropping around inputs could still feel ambiguous. This makes the insertion line read like a visual editor placement guide while preserving the real preview render underneath.
- VERIFIED: `smoke:edit-flow -- --port 4414 --report-dir ...\_tmp_codex_smoke\edit-flow-canvas-drop-marker-20260713` passed. The smoke observed `dropMarkerMode=before/after`, `dropMarkerPosition=fixed`, marker width `133`, marker height `3`, and existing flow nesting, layer before/inside/after, no-drift drag, absolute-in-frame, free-placement, layer path/search/autoscroll checks still passed.
- VERIFIED: `node --check scripts\edit_flow_browser_smoke.mjs`, `lint`, `build`, `guard:ui-copy`, `git diff --check`, and post-smoke server hygiene passed. Smoke port `4414` had only `TIME_WAIT`; no local app server remained. Port `9222` remains the Roll20 CDP listener.
- CLAIM BOUNDARY: This improves edit-mode drop affordance only. It does not change emitted sheet HTML/CSS, upload to Roll20, relink assets, or prove actual Roll20 visual parity.

## 2026-07-13 Edit Canvas Persistent Container Affordance TODO Note

- DONE: Edit Shadow DOM now gives droppable containers a subtle persistent outline even before a widget is dragged over them. Frame/flow/table roles use separate outline colors, while selected objects and active drop targets still take priority.
- WHY: The layer panel already classified containers, but the canvas itself did not continuously show which rendered objects can receive children. This made Figma-like "put this inside that frame" editing harder to read before drag.
- VERIFIED: `smoke:edit-flow -- --port 4413 --report-dir ...\_tmp_codex_smoke\edit-flow-persistent-affordance-20260713-r3` passed. The smoke observed `data-r20-can-drop=1`, `data-r20-layer-role=frame`, selected outline `solid`, persistent affordance outline `dashed`, outline width `1px`, and non-empty inset box shadow. Existing flow drop, before/inside/after, absolute-in-frame, free-placement, layer search/path/autoscroll, and no-drift drag checks still passed.
- VERIFIED: `node --check scripts\edit_flow_browser_smoke.mjs`, `guard:ui-copy`, `lint`, `build`, `git diff --check`, and post-smoke port hygiene passed. Smoke ports `4411`-`4413` had only `TIME_WAIT`; no local app server remained. Port `9222` remains the Roll20 CDP listener.
- CLAIM BOUNDARY: This is edit-overlay UX only. It does not change emitted sheet HTML/CSS, does not prove actual Roll20 visual parity, and does not unblock current chat/asset renderer gates.

## 2026-07-13 Chat Asset/Paint Out-Dir TODO Note

- DONE: `plan:roll20-chat-assets` and `plan:roll20-chat-browser-paint` now accept `--out-dir <writable-dir>`, so agents can refresh asset and browser-paint routing from a locked/canonical actual-run folder without rewriting generated reports inside that folder.
- WHY: The active renderer work must keep canonical Roll20 evidence read-only when Windows or another tool locks generated report files. Without `--out-dir`, agents either failed on locked reports or had to refresh canonical evidence just to check whether CSS work is still blocked.
- VERIFIED: `node --check` for both scripts, `test:roll20-chat-assets`, `test:roll20-chat-browser-paint`, and live `--out-dir` runs against `reports\roll20-actual-compare\2026-06-18-state-map-v1` passed.
- OBSERVED: Current asset plan remains `HOLD_RENDERER_FOR_ASSET_POLICY`; AW2E/YSHY remain `SOURCE_ASSET_LOST_RELINK_REQUIRED`. Current browser-paint plan remains `BROWSER_PAINT_BLOCKED_BY_RELINK`; Les-Oublies is secondary/no-background-image.
- CURRENT: This is verification resilience only. Renderer CSS remains held until user-owned HTTP(S) relink maps are supplied and local preview/edit/export plus Roll20 Sandbox comparison are rerun.

## 2026-07-13 Chat Asset Probe Fetch-Failure Preservation TODO Note

- DONE: `diagnose:roll20-chat-background-assets` now preserves stronger previous byte/placeholder evidence when a rerun hits `ASSET_FETCH_INCOMPLETE` for unchanged background URLs. The report records `preservedFetchFailureCount` and keeps the fresh fetch-failure side evidence instead of downgrading the fixture decision.
- WHY: Isolated full refresh copies the canonical run and then reruns every diagnostic. If the current network cannot fetch Roll20/Imgur URLs, the asset probe could previously replace known placeholder evidence with weaker `FETCH_FAIL` evidence, which then misrouted downstream asset-preservation and browser-paint plans.
- VERIFIED: `node --check scripts\roll20_chat_background_asset_probe.mjs`, `node scripts\roll20_chat_background_asset_probe.mjs --self-test`, and live isolated `diagnose:roll20-chat-refresh -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --work-run-dir ...\_tmp_codex_smoke\chat-refresh-asset-preserve-20260713` passed.
- OBSERVED: The isolated refresh asset probe reported `preservedFetchFailureCount=2` and kept AW2E/YSHY as `ASSET_BYTES_MATCH_BUT_SOURCE_PLACEHOLDER`; the asset preservation plan returned `SOURCE_ASSET_LOST_RELINK_REQUIRED`; the template-scope gate stayed `HOLD_GLOBAL_CHAT_RENDERER_PATCH` with `9` blockers.
- CURRENT: Renderer remains held. This improves evidence stability only; it does not relink assets, change ChatPane rendering, or prove Roll20 visual parity.

## 2026-07-13 Chat Refresh Isolated Work Run TODO Note

- DONE: `diagnose:roll20-chat-refresh` now accepts `--work-run-dir <empty-temp-run-dir>`. When supplied, it copies the selected Roll20 actual-run folder into that temp run and executes the entire downstream chat diagnostic chain against the copy, leaving the canonical evidence folder untouched.
- WHY: Passing only per-script `--out-dir` is not enough for the full refresh chain because later diagnostics read earlier reports from `runDir/<report>`. A temp run copy keeps reads and writes coherent without overwriting locked or canonical report files.
- VERIFIED: `node --check scripts\roll20_chat_diagnostic_refresh.mjs`, `node scripts\roll20_chat_diagnostic_refresh.mjs --self-test`, and live `diagnose:roll20-chat-refresh -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --work-run-dir ...\_tmp_codex_smoke\chat-refresh-isolated-run-final-20260713` passed.
- OBSERVED: The isolated refresh still reports `rendererReady=NO`, same-structure chat high mismatch `2/3`, max aligned mismatch `20.68%`, and `HOLD_PRODUCTION_RENDERER_PATCH`. In this network-restricted run, the refreshed background asset probe produced `FETCH_FAIL`/`RECAPTURE_ASSET_BYTES` in the temp copy; the canonical source evidence was not changed.
- SERVER HYGIENE: No Next/smoke server was started. Only the existing Roll20 CDP listener on `9222` was present before the batch.
- CLAIM BOUNDARY: Verification orchestration only. This does not change product rendering, upload to Roll20, relink assets, or prove Roll20 visual parity.

## 2026-07-13 Chat Candidate Isolated Output TODO Note

- DONE: `diagnose:roll20-chat-parity`, `diagnose:roll20-chat-candidates`, and `diagnose:roll20-chat-row-raster-candidates` now support temp/isolated output for the current locked Roll20 actual-run workflow. Candidate comparison with `--out-dir` writes each internal parity probe under `parity-probes/<candidate>` instead of overwriting canonical `chat-parity-diagnostics`.
- WHY: The current canonical actual evidence folder can be locked by Windows, and candidate comparisons were also able to contaminate the default parity report with the last experimental screenshot set. That makes renderer gates brittle and makes later agents misread an experiment as the baseline.
- VERIFIED: Syntax checks passed for all three changed scripts. Live `diagnose:roll20-chat-candidates -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --out-dir ...\_tmp_codex_smoke\chat-candidates-outdir` completed with isolated parity probes. Live `diagnose:roll20-chat-row-raster-candidates -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --out-dir ...\_tmp_codex_smoke\row-raster-candidates-outdir` also completed.
- CURRENT CANDIDATE STATE: `paint-dim-background` improves YSHY aligned mismatch from `20.68%` to `19.06%`, but remains unsafe because it regresses another fixture and is still blocked by asset/style proof. `aw2e-message-width-text-metrics` remains rejected by row-raster evidence because AW2E row-weighted mismatch worsens from `17.93%` to `24.69%`.
- SERVER HYGIENE: No Next/smoke server was started for this batch. Only the existing Roll20 CDP listener on `9222` was present in the pre-check; do not stop it while actual Roll20 verification is active.
- CLAIM BOUNDARY: Diagnostic isolation only. This does not change product rendering, relink assets, upload to Roll20, or prove Roll20 visual parity.

## 2026-07-13 Template Scope Asset/Row-Raster Gate TODO Note

- DONE: `gate:roll20-chat-template-scope` now accepts `--out-dir <writable-report-dir>` and reads asset-preservation plus row-raster candidate evidence in addition to targeted plan, width reconciliation, policy, candidate comparison, and style proof.
- WHY: The previous template-scope gate correctly blocked global ChatPane CSS when AW2E/YSHY required different template models, but it did not show the asset placeholder blocker and row-raster regression in the same table. That made the next renderer action easier to misread as "try another broad CSS candidate."
- VERIFIED: `node --check scripts\roll20_chat_template_scope_gate.mjs`, `test:roll20-chat-template-scope`, live runs against `reports\roll20-actual-compare\2026-06-18-state-map-v1` with `--out-dir` before and after the run dir, `lint`, `build`, and `git diff --check` passed. Current result remains `HOLD_GLOBAL_CHAT_RENDERER_PATCH`, now with `9` blockers; AW2E shows `SOURCE_ASSET_LOST_RELINK_REQUIRED` plus row-raster regression, and YSHY shows `SOURCE_ASSET_LOST_RELINK_REQUIRED`.
- SERVER HYGIENE: No Next/smoke server was started for this batch. Only the existing Roll20 CDP listener on `9222` was present in the pre-check.
- CLAIM BOUNDARY: This is renderer-safety and diagnostic precision only. It does not change product rendering, relink assets, upload to Roll20, or prove visual parity.

## 2026-07-13 Renderer Diagnostics Out-Dir TODO Note

- DONE: `gate:roll20-renderer-action` and `plan:roll20-chat-renderer-targets` now accept `--out-dir <writable-report-dir>`, matching the earlier `status:roll20-actual` / `preflight:roll20-cdp` temp-output behavior.
- WHY: The canonical actual-run folder can have locked generated report files on Windows. The scripts must still be able to read the evidence and write refreshed diagnostic summaries to ignored temp folders.
- VERIFIED: `node --check` for both changed scripts, `test:roll20-chat-renderer-targets`, both commands against `reports\roll20-actual-compare\2026-06-18-state-map-v1` with `--out-dir` after the run dir and before the run dir, `lint`, `build`, and `git diff --check` passed. Current renderer state remains `HOLD_PRODUCTION_RENDERER_PATCH`, `same-structure high mismatch=2/3`, and max aligned mismatch `20.68%`.
- SERVER HYGIENE: No Next/smoke server was started for this batch. Only the existing Roll20 CDP listener on `9222` was present in the pre-check.
- CLAIM BOUNDARY: Verification resilience only. This does not change product rendering, upload a sheet to Roll20, relink assets, or prove Roll20 visual parity.

## 2026-07-13 Roll20 Verification Out-Dir TODO Note

- DONE: `status:roll20-actual` and `preflight:roll20-cdp` now accept `--out-dir <writable-report-dir>`. This lets agents read the canonical Roll20 evidence run while writing refreshed summaries into a temp folder when Windows locks the existing generated JSON/Markdown files under the run directory.
- WHY: This batch hit `EPERM` on both `actual-verification-status-results.json` and `roll20-cdp-preflight-results.json` even though the source evidence was readable. The hardcoded output path made actual Roll20 verification brittle.
- VERIFIED: Both commands passed with temp output directories under `D:\훙냥냥\마렌상\영시영 시트 고치기\_tmp_codex_smoke\...`, including reversed option order. Current measured status remains `rendererReady=NO`, `rendererAction=HOLD_PRODUCTION_RENDERER_PATCH`, `chatSameStructureHighMismatch=2/3`, and `chatSameStructureMaxAlignedMismatch=20.68%`. CDP is `READY`, but `plannedFixtures=0`, so the correct next action is renderer/template/asset diagnostics, not blind recapture.
- SERVER HYGIENE: No project dev/smoke server was started for this batch. Port `3000` was not listening; port `9222` remains the existing Roll20 CDP browser listener.
- CLAIM BOUNDARY: This is verification resilience only. It does not change product rendering, upload a sheet to Roll20, relink assets, or prove visual parity.

## 2026-07-13 Edit Layer Selection Path TODO Note

- DONE: The edit layer panel now shows a `선택 위치` breadcrumb for the selected object. When a nested input is selected, the panel exposes its parent frame/container path instead of only highlighting one row in a long virtualized list.
- VERIFIED: `smoke:edit-flow -- --port 4406 --report-dir D:\훙냥냥\마렌상\영시영 시트 고치기\_tmp_codex_smoke\edit-flow-selection-path` passed. The new `layerSelectionPath` check observed `visible=true`, `depth=2`, `hasSection=true`, `endsWithInput=true`, and `currentIsInput=true`.
- SERVER HYGIENE: Port `4406` had only `TIME_WAIT` connections after the smoke run; no listening smoke server remained. Port `3000` was not listening before/after this batch. Port `9222` remains the Roll20 CDP browser listener from earlier actual-screen work.
- VERIFY NOTE: The sandboxed browser logged the same two `ERR_NETWORK_ACCESS_DENIED` resource warnings seen in prior smokes, with `pageErrors=0` and smoke pass intact.
- CLAIM BOUNDARY: This improves Figma-like edit-layer context and container visibility only. It does not change actual Roll20 renderer parity, asset-relink blockers, worker JS block coding scope, or all-sheet support.

## 2026-07-13 Edit Layer Auto-Scroll TODO Note

- DONE: The edit layer panel now scrolls the selected layer row into view when selection changes. Clicking a rendered object on the canvas can pull its layer row into the visible layer panel even in long sheets.
- VERIFIED: `smoke:edit-flow -- --port 4405 --report-dir D:\훙냥냥\마렌상\영시영 시트 고치기\_tmp_codex_smoke\edit-flow-autoscroll` passed. The new `layerAutoScroll` check selected the 80th synthetic layer from the canvas and observed `beforeScrollTop=0`, `afterScrollTop=2715`, `rowRendered=true`, and `rowVisible=true`.
- SERVER HYGIENE: Port `4405` had only `TIME_WAIT` connections after the smoke run; no listening smoke server remained.
- VERIFY NOTE: The first smoke attempt hit a locked generated PNG under `reports/edit-flow-smoke`; the verified rerun used a workspace-local temp report directory. The sandboxed browser also logged two `ERR_NETWORK_ACCESS_DENIED` resource warnings, with `pageErrors=0` and smoke pass intact.
- CLAIM BOUNDARY: This improves edit-layer navigation usability only. It does not change actual Roll20 parity, renderer readiness, or asset-relink blockers.

## 2026-07-13 Edit Canvas-to-Layer Selection TODO Note

- DONE: Edit layer rows now expose a testable selected state, and clicking a rendered object in the edit canvas updates the corresponding layer row selection.
- VERIFIED: `smoke:edit-flow -- --port 4403` passed with `canvasSelectionSync.selected=true`, `rowSelected=1`, and the clicked Shadow DOM section carrying `.r20-selected`.
- WHY: This closes the other half of the layer/canvas pairing. Users can now use either the layer list or the rendered sheet object and still see the same selection state.
- CLAIM BOUNDARY: This is edit-mode selection UX only. It does not prove edit/preview parity for every imported sheet or actual Roll20 renderer parity.

## 2026-07-13 Edit Layer Selection Sync TODO Note

- DONE: Edit mode now synchronizes selected layer rows with the actual Shadow DOM sheet object. Clicking a layer row applies the same `.r20-selected` outline to the rendered object instead of only changing the layer list state.
- DONE: Clicking a rendered object in EditCanvas now updates `workspaceStore.selectedBlockId`, matching the preview-mode selection model.
- VERIFIED: `smoke:edit-flow -- --port 4402` passed and now checks `layerSelectionSync.selected=true` for a nested input selected from the layer panel.
- CLAIM BOUNDARY: This improves layer-to-canvas visual pairing only. It does not change Roll20 actual-screen parity, renderer readiness, asset relink status, or import/export fidelity claims.

## 2026-07-13 Layer Search Context TODO Note

- DONE: Edit-mode layer search now preserves ancestor/container context. Searching for a nested child no longer leaves the child floating without its parent frame/flow context.
- DONE: Layer rows expose search-match/context-only attributes and show a compact `상위 맥락` badge for ancestor rows included only to explain where a matching child lives. Nested rows also expose a visible depth guide.
- VERIFIED: `smoke:edit-flow -- --port 4401` passed. The smoke now searches for a nested input block id and confirms the parent section remains visible as `contextOnly=1`, the child remains `searchMatch=1`, and the child row has a depth guide.
- CLAIM BOUNDARY: This improves Figma-like layer readability and search behavior only. It does not change actual Roll20 renderer parity, asset relink status, worker JS block coding scope, or all-sheet support.

## 2026-07-13 Layer Self-Drop Affordance TODO Note

- DONE: Layer rows no longer show a before/inside/after drop target when the dragged layer is hovering over itself.
- WHY: The previous behavior could show a valid-looking drop badge even though the move would be ignored, which made layer editing feel less like a trustworthy Figma-style layer panel.
- VERIFY: Existing `smoke:edit-flow` before/inside/after layer-mode coverage is rerun after this change to guard against regressions. A browser-synthetic self-drag probe was not kept because it produced unstable stale-event results that do not match the real drag-start path.
- CLAIM BOUNDARY: This improves edit-layer affordance truthfulness only. It does not change Roll20 visual parity or renderer readiness.

## 2026-07-13 Runtime Visibility Verification Bundle TODO Note

- DONE: Added `verify:runtime-visibility`, a local verification bundle for the requirement that Roll20 worker scripts and rolltemplates stay out of the visible sheet canvas while worker state and rolltemplate chat simulation still run.
- VERIFIED: The bundle runs worker workspace separation, worker state smoke, Roll20 Sandbox expected-preview runtime stripping, preview/edit visual runtime-node checks, and roll button -> ChatPane rolltemplate smoke in one command.
- CURRENT VERIFIED SHAPE: Existing focused runs passed in this batch: `smoke:worker`, `smoke:worker-state`, `smoke:roll20-sandbox-preview:all`, `smoke:preview-edit-visual`, and `rolltemplate_chat_smoke.mjs`. Sandbox expected preview showed `rolltemplateCount=0` and `sourceWorkerScriptCount=0` for all three prepared fixtures; preview/edit visual smoke reported visible runtime nodes `0`; rolltemplate chat smoke passed all three prepared fixtures with `kind=rolltemplate`.
- CLAIM BOUNDARY: This proves local preview/edit/runtime behavior for the prepared ignored fixtures only. It does not prove actual Roll20 Sandbox/test-room visual parity, all-sheet support, future JS block coding completion, or renderer readiness.

## 2026-07-13 Edit Mode Flow + Imported Sync Recheck TODO Note

- DONE: Rechecked the Figma-like edit flow smoke against the current static app build.
- VERIFIED: `smoke:edit-flow -- --port 4384` passed. Evidence covered flow widget nesting, absolute widget placement, canvas before/inside/after drop indicators, layer-panel before/inside/after modes, non-leaf group reorder, free absolute placement inside a frame, drift-free drag commit (`leftDrift=0`, `topDrift=0`), and editable sheet canvas width (`850 -> 930`, rolltemplate width `280`).
- VERIFIED: `guard:ui-copy` passed and the edit-mode text sample showed clean Korean copy with `hasMojibakeHan=false`.
- VERIFIED: `smoke:imported-edit-sync -- --port 4385` passed for `official-roll20-AW2E`, `official-roll20-Les-Oublies`, `synthetic-nonleaf-flow`, and `yshy-commission-1bu`. Each reported `interaction=PASS` and `resources=PASS`, with the moved imported block matching edit and preview coordinates.
- CLAIM BOUNDARY: This proves local static-app edit/preview synchronization for the covered fixtures. It does not prove actual Roll20 visual parity, Roll20 Sandbox upload parity, worker JS block coding, or all-sheet support.

## 2026-07-13 Browser Paint Plan Routing TODO Note

- DONE: Added `plan:roll20-chat-browser-paint`, a diagnostic-only router that reads current chat asset, asset-preservation, background-raster, background-source, and row-compositing evidence.
- WHY: AW2E/YSHY now point at a flat-paint/browser-color-model axis, but browser paint work is only valid after dead placeholder assets are relinked or the fixture is classified as non-image/secondary.
- CURRENT EXPECTED ROUTING: With the current `reports\roll20-actual-compare\2026-06-18-state-map-v1` evidence, AW2E and YSHY should remain `BLOCKED_BY_ASSET_RELINK`, while no-background-image fixtures stay secondary instead of prompting renderer CSS changes.
- VERIFIED: `test:roll20-chat-browser-paint`, syntax checks for the new planner and diagnostic refresh, current `plan:roll20-chat-assets`, current `plan:roll20-chat-browser-paint`, `gate:roll20-renderer-action`, `guard:roll20-evidence`, full `diagnose:roll20-chat-refresh`, `lint`, and `build` passed.
- CLAIM BOUNDARY: This is browser-paint investigation routing only. It does not relink assets, upload to Roll20, change production renderer CSS, or prove visual parity.

## 2026-07-13 Asset Probe Flat-Paint Decision Bridge TODO Note

- DONE: `diagnose:roll20-chat-background-assets` and `plan:roll20-chat-assets` now recognize the new `FLAT_PAINT_SOURCE_OR_BROWSER_COLOR_MODEL_REQUIRED` raster decision.
- WHY: After dead assets are relinked/rehosted, the next correct path should be browser paint/decode/context verification, not falling through to a secondary asset bucket or repeating width/font CSS candidates.
- VERIFIED: `test:roll20-chat-background-assets`, `test:roll20-chat-assets`, syntax checks for both scripts, fresh `diagnose:roll20-chat-background-assets`, fresh `plan:roll20-chat-assets`, and `gate:roll20-renderer-action -- reports\roll20-actual-compare\2026-06-18-state-map-v1` passed.
- CURRENT: The current evidence still reports `SOURCE_ASSET_LOST_RELINK_REQUIRED` for AW2E and YSHY because both source/proxy paths resolve to the `503b png 161x81 removed.png` placeholder. Renderer remains `HOLD_PRODUCTION_RENDERER_PATCH`.
- CLAIM BOUNDARY: This is evidence-routing and future regression coverage only. It does not relink assets, upload to Roll20, or prove visual parity.

## 2026-07-13 Background Raster Flat-Paint Classification TODO Note

- DONE: `diagnose:roll20-chat-background-raster` now preserves row-compositing bucket evidence in its fixture output and uses it for routing decisions.
- OBSERVED: Current AW2E and YSHY evidence is now classified as `FLAT_PAINT_SOURCE_OR_BROWSER_COLOR_MODEL_REQUIRED`, not a generic source/paint bucket. Both have `0%` edge mismatch share and `100%` flat-paint mismatch share, with local darker/chroma-heavy rows.
- OBSERVED: Current run output:
  - AW2E: row `17.93%`, luma gain `-0.34%`, flat `100%`, darker `66.87%`, chroma `48.62%`, worst row `1 26.28%`.
  - YSHY 1BU: row `21.41%`, luma gain `+0.57%`, flat `100%`, darker `65.99%`, chroma `49.02%`, worst row `5 27.73%`.
- VERIFIED: `test:roll20-chat-background-raster`, `node --check scripts\roll20_chat_background_raster_model_probe.mjs`, `diagnose:roll20-chat-background-raster -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, and `gate:roll20-renderer-action -- reports\roll20-actual-compare\2026-06-18-state-map-v1` passed.
- CURRENT: Production ChatPane renderer remains `HOLD_PRODUCTION_RENDERER_PATCH`. The next useful P0 remains source/proxy byte, browser decode, Roll20 paint-context, and user-owned asset relink verification, not another broad width/font/background-size CSS candidate.
- CLAIM BOUNDARY: This is diagnostic routing only. It does not upload to Roll20, relink dead assets, or prove Roll20 visual parity.

## 2026-07-13 Targeted Renderer Plan Row-Raster Precision TODO Note

- DONE: `plan:roll20-chat-renderer-targets` now carries row-raster worst-row evidence from `chat-row-raster-probe` instead of reporting `unknown worst row`.
- WHY: The active renderer gate is held partly because AW2E and YSHY have row/luma raster mismatches even when some width/text candidates improve raw crop. The handoff plan must preserve the actual row-weighted and worst-row numbers so agents do not repeat rejected width/font CSS guesses.
- VERIFIED: `test:roll20-chat-renderer-targets` passed, and the regenerated targeted plan records AW2E `weighted 17.93%, worst row 1 26.28%, luma -66.819` plus YSHY `weighted 21.41%, worst row 5 27.73%, luma -35.682`.
- CLAIM BOUNDARY: This improves diagnostic precision only. Production ChatPane renderer remains `HOLD_PRODUCTION_RENDERER_PATCH`, and no Roll20 visual parity claim is allowed.

## 2026-07-13 CDP Preflight No-Plan Renderer-Hold TODO Note

- DONE: `preflight:roll20-cdp` now reads the current actual-status summary and distinguishes "CDP ready but no capture fixtures are planned" from "load fixture and capture missing evidence".
- WHY: The active run already has generated actual screenshots/diffs `6/6`, trusted full-root `3/3`, and normalized chat evidence `3/3`, but renderer action is still `HOLD_PRODUCTION_RENDERER_PATCH`. A READY CDP browser with `plannedFixtures=0` should not tell agents to recapture blindly.
- VERIFIED: `test:roll20-cdp-preflight` passed, and `preflight:roll20-cdp -- --run-dir reports\roll20-actual-compare\2026-06-18-state-map-v1` now prints `rendererAction=HOLD_PRODUCTION_RENDERER_PATCH`, `rendererReady=NO`, and a next action pointing to renderer/template/asset diagnostics unless `--fixture` or `--all` is intentionally used.
- CLAIM BOUNDARY: This is verification orchestration and truthful handoff only. It does not change product rendering, upload to Roll20, or prove visual parity.

## 2026-07-13 Asset Relink Roll20-Ready Target TODO Note

- DONE: Export asset replacement UI now classifies replacement targets as Roll20-ready `http(s)` targets versus local-only targets such as `data:` or relative paths.
- WHY: `data:` replacement maps are useful for local preview/edit smoke tests, but Roll20 Sandbox re-comparison needs user-owned hosted URLs. The UI now shows the count so a local-only map is not mistaken for upload-ready evidence.
- VERIFIED: `test:asset-replacements`, `test:asset-refs`, `guard:ui-copy`, `build`, and `smoke:export-dialog -- --port 4383` passed. Browser smoke proves the restored data-URL map reports `localOnlyTargets=1` and `roll20ReadyTargets=0`.
- CLAIM BOUNDARY: This reduces relink verification mistakes. It does not supply hosted assets, upload to Roll20, or prove Roll20 visual parity.

## 2026-07-13 Roll20 Proxy Source Relink Draft TODO Note

- DONE: Import asset preflight now keeps the decoded source URL inside Roll20 proxy refs and includes it in the local-only asset replacement draft.
- WHY: Current actual Roll20 evidence still shows AW2E/YSHY background sources resolving to tiny placeholder images. Users need a clear `old URL => user-owned URL` map for both full proxy URLs and the original `src` URLs before Sandbox re-comparison can prove visual parity.
- VERIFIED: `test:asset-refs`, `test:asset-replacements`, `guard:ui-copy`, and `smoke:export-dialog -- --port 4382` passed. Browser smoke reports `importAssetDraft.hasSourceUrl=true` and the draft stays commented until the user fills a replacement URL.
- CLAIM BOUNDARY: This improves relink UX and verification readiness only. It does not provide replacement assets, upload to Roll20, or prove Roll20 visual parity.

## 2026-07-13 AW2E Row Raster Candidate Gate TODO Note

- DONE: Extended `diagnose:roll20-chat-row-raster-candidates` and `gate:roll20-renderer-action` so row-raster candidate comparison reports AW2E as well as YSHY deltas.
- OBSERVED: `aw2e-message-width-text-metrics` improves AW2E raw crop mismatch, but row-raster comparison rejects it: AW2E row-weighted mismatch worsens `17.93% -> 24.69%` and worst row worsens `26.28% -> 34.28%`.
- OBSERVED: `aw2e-message-width-font-size` is also rejected by row raster: AW2E row-weighted mismatch worsens to `24.75%`, worst row to `34.44%`.
- CURRENT: This rules out promoting AW2E width/text-metric candidates as renderer fixes. The next AW2E P0 is row/background/text antialiasing or paint-context modeling after asset relink, not more message-width CSS.
- VERIFIED: `diagnose:roll20-chat-row-raster-candidates` now compares `9/9` candidates and `gate:roll20-renderer-action` reports AW2E reject deltas directly.
- CLAIM BOUNDARY: This is diagnostic evidence only. It keeps production ChatPane renderer held and does not prove Roll20 visual parity.

## 2026-07-13 AW2E Message Width + Text Metrics Candidate TODO Note

- DONE: Added the diagnostic-only `aw2e-message-width-text-metrics` candidate to the chat candidate comparison/style-proof/target-plan plumbing.
- OBSERVED: Fresh smoke for this candidate passed all 3 chat fixtures. AW2E raw rolltemplate-crop mismatch improved from the current default `26.9%` to `17.94%`, but AW2E aligned mismatch is only `17.94%` vs default aligned `18.03%`, so this is not enough for production promotion.
- CURRENT: The candidate confirms the AW2E axis is message/content width plus text metrics, but it does not reduce the global high-mismatch count because YSHY remains `20.68%` aligned and Les-Oublies stays in the default/P1 bucket.
- STILL TODO: Keep this candidate diagnostic-only. Next AW2E work should inspect row/background/text-antialiasing residuals after width/text metrics, while YSHY still needs a separate CoC table intrinsic/sanitize/font-context model.
- CLAIM BOUNDARY: This is not Roll20 visual parity and not a ChatPane production renderer patch.

## 2026-07-13 Chat Renderer Target Plan TODO Note

- DONE: Sharpened `plan:roll20-chat-renderer-targets` next commands so AW2E and YSHY no longer point primarily at broad/global candidate reruns.
- CURRENT: AW2E remains P0 with `AW2E_TEMPLATE_SCOPED_TEXT_METRICS`; next diagnostics now focus on relink coverage, message shell, table-width budget, and font/glyph evidence.
- CURRENT: YSHY remains P0 with `COC_TABLE_INTRINSIC_AND_SANITIZE_MODEL`; next diagnostics now focus on relink coverage, table intrinsic, overflow/crop, intrinsic width, font/glyph, and font-intrinsic evidence.
- VERIFIED: `node scripts\roll20_chat_targeted_renderer_plan.mjs --self-test` passed and `plan:roll20-chat-renderer-targets -- reports\roll20-actual-compare\2026-06-18-state-map-v1` regenerated the ignored plan.
- STILL TODO: Use those focused diagnostics to build fixture/template-scoped renderer experiments. Do not promote global ChatPane width, padding, font, paint, or transform CSS while the renderer gate reports split fixture axes and asset relink blockers.
- CLAIM BOUNDARY: This is planning/orchestration only. It does not fix ChatPane rendering or prove Roll20 visual parity.

## 2026-07-13 Asset Map Preupload Pipeline TODO Note

- DONE: Added script-side `--asset-map-file` support to `roll20_actual_local_baseline.mjs` and `verify:roll20-preupload`, using the same `old URL => new URL` map format as the product export/import UI.
- DONE: The map is applied before local preview/edit screenshots and before emitted Roll20 upload payload HTML/CSS are written, so local verification and Sandbox payloads no longer diverge from the user-filled relink map.
- DONE: Hardened `roll20_state_selector_audit.mjs` and `roll20_asset_resource_audit.mjs` against UTF-8 BOM-prefixed fixture manifests/source files.
- VERIFIED: A copyright-safe synthetic fixture in ignored `.tmp` produced `assetMapEntryCount=2` and `assetReplacement.replacements=2`; payload checks confirmed the old synthetic HTML/CSS URLs were gone and the replacement targets were present.
- VERIFIED: `verify:roll20-preupload -- reports\roll20-actual-compare\2026-07-13-asset-map-pipe-smoke --fixtures .tmp\asset-map-fixtures --out-dir ./out --base-path /roll20-block-editor --asset-map-file .tmp\asset-map-pipe-smoke.txt` passed local baseline, payload audit, Sandbox sanitize audit, cleaned-payload visual roundtrip, state selector audit, asset/resource audit, and evidence guard.
- VERIFIED: Syntax checks passed for the changed baseline/preupload/audit helper scripts, and `guard:roll20-evidence -- reports\roll20-actual-compare\2026-07-13-asset-map-pipe-smoke` passed.
- CURRENT: `plan:roll20-asset-relink -- reports\roll20-actual-compare\2026-06-18-state-map-v1` still reports `RELINK_MAP_REQUIRED` for AW2E/YSHY because no user-owned replacement URLs have been supplied for the real blockers.
- STILL TODO: Fill the ignored `asset-relink-map-template.txt` with user-owned HTTP(S) asset URLs, rerun `plan:roll20-asset-relink --map-file`, then rerun local preview/edit/export plus Roll20 Sandbox comparison. Do not commit the map, screenshots, fixtures, or generated reports.
- CLAIM BOUNDARY: This proves the verification pipeline consumes a relink map. It does not provide replacement assets, upload to Roll20, or prove Roll20 visual parity.

## 2026-07-13 Roll20 Chat Asset Preservation TODO Note

- DONE: Added a diagnostic asset-preservation planner for Roll20 chat/background evidence: `corepack pnpm run plan:roll20-chat-assets -- reports\roll20-actual-compare\<label>`.
- DONE: Added `docs/spec/31_asset_preservation_policy.md` and linked it from the agent startup rules so preview/parity work checks external asset and placeholder risk before renderer CSS work.
- DONE: Extended the export dialog asset preflight panel so users can see Roll20 proxy and placeholder-risk counts before downloading a zip.
- DONE: Added an export dialog local-only asset replacement map. Users can enter `old URL => new URL`; the final zip HTML/CSS and export diagnostics use the replaced URLs without mutating the workspace or source folders.
- DONE: Added import dialog asset preflight using the same analyzer, so users see external URL, relative path, Roll20 proxy, Imgur page, and placeholder-risk counts before importing.
- DONE: Shared the local-only asset replacement map through preview iframe, edit Shadow render, and export. The same relink text now rewrites rendered HTML/CSS for local preview/edit verification as well as zip payload generation.
- DONE: Added import-side replacement-map draft generation. When asset preflight finds external or relative refs, the import dialog can append commented `old URL => <paste-user-owned-url-here>` lines to the shared replacement map without activating them prematurely.
- DONE: Persisted the shared asset replacement map in the IndexedDB autosave/manual-save XML and restored it through the autosave recovery banner.
- DONE: Added named local-only asset replacement profiles in the export dialog, so users can save and reload sheet-specific URL relink sets without storing actual third-party image/font files.
- DONE: Added `plan:roll20-asset-relink`, a local-only URL-text coverage gate that checks whether a replacement map covers current asset-preservation blockers before Roll20 Sandbox re-comparison.
- DONE: Added export-dialog copy and txt-save controls for the active local-only asset replacement map. The saved text is meant to be passed directly to `plan:roll20-asset-relink --map-file` before Roll20 Sandbox re-comparison.
- DONE: Extended `plan:roll20-asset-relink` to write an ignored `asset-relink-map-template.txt` with commented candidate URL rules for unresolved asset blockers, so the next relink pass starts from exact source/proxy URL text without committing asset files.
- VERIFIED: The current run plan reports `HOLD_RENDERER_FOR_ASSET_POLICY` with P0 `SOURCE_ASSET_LOST_RELINK_REQUIRED` for AW2E and YSHY chat background evidence. Local and actual proxy bytes match, but the source resolves to a placeholder, so CSS cannot recover the intended original image.
- VERIFIED: `smoke:export-dialog -- --port 4363` passed and confirms the asset preflight panel exposes `Roll20 proxy` and `placeholder risk` metrics without console/page errors.
- VERIFIED: `test:asset-replacements`, `lint`, `build`, and `smoke:export-dialog -- --port 4365` passed for the replacement-map batch.
- VERIFIED: `test:asset-refs`, `test:asset-replacements`, `lint`, `build`, `smoke:export-dialog -- --port 4367`, and `guard:roll20-evidence` passed for the import-side warning batch.
- VERIFIED: `test:asset-refs`, `test:asset-replacements`, `lint`, `build`, `smoke:export-dialog -- --port 4368`, and `guard:roll20-evidence -- reports\roll20-actual-compare\2026-06-18-state-map-v1` passed for the shared preview/edit/export replacement batch. The browser smoke uses a copyright-safe synthetic asset URL and proves preview iframe plus edit Shadow DOM contain the replacement target and not the original URL.
- VERIFIED: `test:asset-refs`, `test:asset-replacements`, `lint`, `build`, `smoke:export-dialog -- --port 4369`, and `guard:roll20-evidence -- reports\roll20-actual-compare\2026-06-18-state-map-v1` passed for the import draft batch. The browser smoke now fills a synthetic Imgur URL in the import dialog, confirms the draft button appears, and verifies the generated map entry stays commented until the user relinks.
- VERIFIED: `node --check scripts\export_dialog_browser_smoke.mjs`, `test:asset-refs`, `test:asset-replacements`, `lint`, `build`, `smoke:export-dialog -- --port 4370`, `git diff --check`, and `guard:roll20-evidence -- reports\roll20-actual-compare\2026-06-18-state-map-v1` passed for the autosave persistence batch. The browser smoke confirms IndexedDB XML contains `<asset-replacement-map>`, then reloads and restores the map into `previewStore`.
- VERIFIED: `test:roll20-chat-assets`, `plan:roll20-chat-assets -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, and `node --check scripts\roll20_chat_asset_preservation_plan.mjs` passed after updating the asset-preservation plan to point at the implemented local-only replacement map instead of asking agents to build that UX again.
- VERIFIED: `gate:roll20-renderer-action -- reports\roll20-actual-compare\2026-06-18-state-map-v1` now reads the asset-preservation plan and adds a renderer blocker when the plan reports `HOLD_RENDERER_FOR_ASSET_POLICY`. Current gate output includes `chat asset preservation policy holds renderer CSS` for AW2E and YSHY and routes next actions to the local-only asset replacement map plus Roll20 Sandbox re-comparison.
- VERIFIED: `smoke:export-dialog -- --port 4371` passed after adding replacement profiles. The smoke confirms profile controls render, a synthetic profile is created, autosave XML contains `<asset-replacement-profiles>`, and reload + autosave restore brings the profile back without committing any generated report evidence.
- VERIFIED: `test:roll20-asset-relink` passed. `plan:roll20-asset-relink -- reports\roll20-actual-compare\2026-06-18-state-map-v1` currently reports `RELINK_MAP_REQUIRED` with AW2E/YSHY missing. A temporary ignored map smoke classified AW2E as `COVERED_ROLL20_READY` with an HTTP(S) target and YSHY as `COVERED_LOCAL_ONLY` with a data URL target.
- VERIFIED: `node --check scripts\export_dialog_browser_smoke.mjs`, `test:asset-replacements`, `test:roll20-asset-relink`, `guard:ui-copy`, `lint`, `build`, and `smoke:export-dialog -- --port 4381` passed for the asset-map copy/txt-save bridge. Browser smoke confirms the copy/download controls exist and become enabled after autosave restores a synthetic map.
- VERIFIED: `node --check scripts\roll20_asset_relink_verification_plan.mjs`, `test:roll20-asset-relink`, `plan:roll20-asset-relink -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `guard:roll20-evidence -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `git diff --check`, `lint`, and `build` passed after adding the map template. The generated ignored template contains 6 commented replacement-rule candidate lines for the current AW2E/YSHY unresolved blockers.
- CURRENT: Production ChatPane renderer remains held. Asset relink/rehost UX is now a P0 product requirement before claiming visual parity for fixtures whose source images are dead.
- STILL TODO: Rerun actual Roll20 sandbox comparison after the user relinks/rehosts dead assets. Do not commit downloaded third-party assets, screenshots, or generated report evidence.

## 2026-07-12 Roll20 Chat Targeted Candidate Results TODO Note

- DONE: Ran the targeted local smoke candidates from the renderer target plan:
  - `official-roll20-AW2E` with `aw2e-text-metrics`: smoke PASS, candidate comparison says `no-meaningful-gain`, AW2E aligned delta `+0.1%`.
  - `yshy-commission-1bu` with `yshy-sanitize-typography`: smoke PASS, candidate comparison says `reject-regresses-fixtures`, YSHY aligned delta `+14.95%`.
  - `yshy-commission-1bu` with `coc-table-intrinsic-clamp`: smoke PASS, candidate comparison says `no-meaningful-gain`, YSHY aligned delta `0%`.
- VERIFIED: `diagnose:roll20-chat-candidates`, `diagnose:roll20-chat-candidate-style`, `diagnose:roll20-chat-font-intrinsic`, `diagnose:roll20-chat-row-paint-source`, `diagnose:roll20-chat-background-source`, `diagnose:roll20-chat-row-raster`, `diagnose:roll20-chat-background-assets`, and `diagnose:roll20-chat-background-raster` completed.
- CURRENT: Production chat renderer remains `HOLD_PRODUCTION_RENDERER_PATCH`. The plan now records 16 blockers, including tried-and-rejected candidates plus background/raster evidence.
- CURRENT: New root-cause evidence says CSS declarations can match while rendered pixels still differ:
  - AW2E: `COLOR_ASSET_RASTER_MODEL_REQUIRED`, row raster worst mismatch `26.28%`, background asset probe says local/actual bytes match but source resolves to a Roll20 `removed.png` placeholder.
  - YSHY: `SOURCE_IMAGE_OR_BROWSER_PAINT_MODEL_REQUIRED`, row raster worst mismatch `27.73%`, background asset probe also sees the placeholder image path.
- STILL TODO: Do not rerun the failed text/sanitize/clamp candidates. Next P0 is an asset-preservation/proxy/browser-paint investigation for chat/background images before any renderer CSS promotion.

## 2026-07-12 Roll20 Chat Targeted Renderer Plan TODO Note

- DONE: Added `plan:roll20-chat-renderer-targets`, a diagnostic-only planner that reads the current Roll20 actual chat evidence reports and turns them into scoped next renderer experiments.
- VERIFIED: `test:roll20-chat-renderer-targets` passed, and the planner ran against `reports\roll20-actual-compare\2026-06-18-state-map-v1`.
- CURRENT: The planner keeps production chat renderer changes on `HOLD_PRODUCTION_RENDERER_PATCH` with 4 blockers. Current split:
  - `official-roll20-AW2E`: P0, `AW2E_TEMPLATE_SCOPED_TEXT_METRICS`, aligned mismatch `18.03%`; next experiment is message-width plus exact text-metric allocation scoped to `.sheet-rolltemplate-aw`.
  - `official-roll20-Les-Oublies`: P1, `KEEP_DEFAULT`, aligned mismatch `6.34%`; do not spend the next renderer pass here unless it regresses.
  - `yshy-commission-1bu`: P0, `COC_TABLE_INTRINSIC_AND_SANITIZE_MODEL`, aligned mismatch `20.68%`; next experiment is CoC/YSHY-scoped table intrinsic sizing, font availability, and sanitize-order modeling.
- STILL TODO: Run the targeted AW2E and YSHY smoke/candidate commands from `reports\roll20-actual-compare\2026-06-18-state-map-v1\chat-targeted-renderer-plan\chat-targeted-renderer-plan-results.md`. Do not promote global ChatPane width/font/padding CSS.

## 2026-07-12 Roll20 Chat Overlay-Clean Recapture TODO Note

- DONE: Confirmed the first Les-Oublies same-template recapture still had a screenshot-quality problem: the character sheet dialog overlapped the text chat, so `roll20-chat.png` included sheet UI (`Modify`) even though DOM evidence selected `sheet-rolltemplate-initiative-roll`.
- DONE: Closed the overlapping Roll20 character dialog and recaptured Les-Oublies chat with `--skip-click --expected-template-class sheet-rolltemplate-initiative-roll`. The new PNG visibly contains only the `Initiative :` rolltemplate.
- DONE: Hardened `capture:roll20-chat-cdp` so it closes overlapping character-sheet dialogs before chat probing/capture by default. Use `--keep-dialogs` only for diagnostic cases where the overlap itself must be inspected.
- DONE: Hardened the generated chat DOM probe so iframe/dialog samples over the selected rolltemplate become overlay candidates instead of passing foreground proof.
- VERIFIED: `diagnose:roll20-chat-refresh` now reports trusted same-structure chat evidence with `chatCaptureSuspects=0`, `chatActualTemplatePixelSuspect=0`, `chatStructure=STRUCTURE_MATCHED`, `chatStructureMismatch=0/3`, `chatSameStructureHighMismatch=2/3`, and `chatSameStructureMaxAlignedMismatch=20.68%`.
- CURRENT: Les-Oublies is no longer P0 for chat renderer work: `diagnose:roll20-chat-renderer-policy` classifies it as `KEEP_DEFAULT_CHAT_RENDERER` with aligned mismatch `6.34%`. Remaining P0 axes are AW2E `CHAT_MESSAGE_CONTENT_WIDTH` and YSHY `TABLE_SCROLL_INTRINSIC`.
- STILL TODO: Build narrow diagnostics/renderer experiments for AW2E message/content width and YSHY/CoC table intrinsic sizing. Do not promote a global ChatPane width/font/padding patch.

## 2026-07-12 Les Same-Template Roll20 Chat Recapture Resolved

- DONE: Added `apply:roll20-upload-cdp` as a guarded local-only CDP helper for executing generated Sandbox upload snippets against an explicit dedicated Sandbox/test campaign id. It writes ignored apply results under `reports/.../roll20-upload-handoff/cdp-apply/` and does not treat upload/storage as visual parity.
- DONE: Applied the current `official-roll20-Les-Oublies` payload to the dedicated Roll20 Sandbox/test campaign `21639681` through the guarded settings-page path, then reopened the Sandbox editor and character dialog.
- DONE: Fixed `capture:roll20-chat-cdp` roll-button clicking so hidden zero-size duplicate buttons do not block visible iframe roll buttons. The tool now tries visible nonzero buttons first and has a DOM click fallback.
- DONE: Updated the chat capture plan/probe so same-template recapture carries `--expected-template-class` and the DOM probe selects the target rolltemplate class before falling back to the largest visible template.
- VERIFIED: Fresh Les-Oublies targeted capture with `roll_initiative` and expected `sheet-rolltemplate-initiative-roll` passed. `diagnose:roll20-chat-structure` now reports `STRUCTURE_MATCHED`, `chatStructureMismatch=0/3`, and all three chat fixtures are same-structure.
- VERIFIED: Current `status:roll20-actual` remains renderer-held, not done: `rendererReady=NO`, `rendererAction=HOLD_PRODUCTION_RENDERER_PATCH`, `chatSameStructureHighMismatch=3/3`, and `chatSameStructureMaxAlignedMismatch=50.1%`.
- STILL TODO: The blocker has moved from "wrong template captured" to real ChatPane/rolltemplate visual mismatch. Next P0 is per-template Roll20 chat message/content width and table/text layout modeling; do not promote a global ChatPane width/padding/font patch.

## 2026-07-12 Les Same-Template Capture Plan TODO Note

- DONE: Updated `plan:roll20-chat-capture` so chat structure mismatches force a recapture plan even when `roll20-chat.png` and DOM sidecar already exist. Les-Oublies now plans `roll_initiative` -> `sheet-rolltemplate-initiative-roll` instead of allowing any visible rolltemplate.
- DONE: Updated `preflight:roll20-cdp` to reuse the capture plan's exact `chatCaptureCommand`, so it now prints `--roll-button roll_initiative` for Les-Oublies instead of a generic capture command.
- DONE: Hardened `capture:roll20-chat-cdp` so a requested `--roll-button` must also appear in the current sheet-frame evidence before capture proceeds.
- VERIFIED: `plan:roll20-chat-capture -- ... official-roll20-Les-Oublies` reports `NEEDS_CAPTURE` with reason `same-template recapture`. `preflight:roll20-cdp` is `READY` and prints the targeted capture command.
- OBSERVED: Opening `Witrav Upijek` and probing the current Roll20 iframe produced sheet-frame evidence, but `capture:roll20-chat-cdp -- --roll-button roll_initiative` correctly blocked because that evidence did not contain `roll_initiative`. The current Roll20 character/sheet state is not the intended Les same-template state yet.
- STILL TODO: Load/apply the Les-Oublies fixture state that actually exposes `roll_initiative`, rerun sheet-frame probe until it proves that roll button, then rerun targeted chat capture.

## 2026-07-12 Roll20 Chat Structure-Aware Status TODO Note

- DONE: Updated `status:roll20-actual` so it reports chat structure state separately from raw chat pixel mismatch: `chatStructure=STRUCTURE_MISMATCH_FOUND`, `chatStructureMismatch=1/3`, `chatSameStructureHighMismatch=2/3`, and `chatSameStructureMaxAlignedMismatch=20.68%`.
- DONE: Updated `gate:roll20-renderer-action` so the renderer mismatch blocker excludes structure-mismatched Les-Oublies from the same-structure count. The gate now reports `2/3` same-structure authoritative chat mismatches instead of treating all `3/3` as renderer CSS evidence.
- VERIFIED: Raw max aligned mismatch still remains `54.1%` because it includes the wrong-template Les-Oublies capture, but same-structure renderer evidence max is now `20.68%` across AW2E/YSHY. The next action remains same-template Les-Oublies recapture.
- STILL TODO: Recapture Les-Oublies `sheet-rolltemplate-initiative-roll` in Roll20, then rerun the full chat refresh/status/gate chain.

## 2026-07-12 Roll20 Chat Structure Gate TODO Note

- DONE: Added `corepack pnpm run diagnose:roll20-chat-structure -- reports\roll20-actual-compare\2026-06-18-state-map-v1` to compare local ChatPane rolltemplate class/row/text structure against actual Roll20 chat sidecars before treating pixel diffs as renderer evidence.
- DONE: Wired the structure report into `gate:roll20-renderer-action` and `diagnose:roll20-chat-refresh`, so renderer CSS stays held when actual Roll20 captured a different rolltemplate than the local smoke.
- VERIFIED: Current structure result is `STRUCTURE_MISMATCH_FOUND`: AW2E `sheet-rolltemplate-aw` rows `2/2` matches, YSHY `sheet-rolltemplate-coc` rows `7/7` matches, but Les-Oublies local `sheet-rolltemplate-initiative-roll` rows `3` differs from actual `sheet-rolltemplate-classic-roll` rows `5`.
- CURRENT: Les-Oublies `54.1%` aligned chat pixel mismatch must not be used as renderer CSS evidence until same-template Roll20 chat evidence is recaptured. The renderer gate now prints this as a blocker.
- STILL TODO: Recapture Les-Oublies actual chat by targeting the same local smoke roll button/template (`roll_initiative` / `sheet-rolltemplate-initiative-roll`), then rerun `diagnose:roll20-chat-refresh` before continuing ChatPane CSS work.

## 2026-07-12 AW2E Chat Width Hypothesis TODO Note

- DONE: Tested the AW2E root-cause hypothesis that local ChatPane needs both Roll20's full-width message/content box and the Roll20-observed `13.65px` AW2E table font size.
- DONE: Added the diagnostic-only `aw2e-message-width-font-size` candidate to chat candidate comparison/style-proof plumbing and documented its smoke command. This candidate is not production renderer behavior.
- VERIFIED: Fresh AW2E-only local captures:
  - default fresh: raw mismatch `26.9%`, best aligned `18.03%`.
  - font-size-only fresh: raw mismatch `27.21%`, best aligned `18.01%`.
  - message-width + font-size: raw mismatch `18.46%`, best aligned `18.46%`, offset `0,0`.
- CURRENT: The combined candidate removes the AW2E alignment offset and improves raw crop mismatch, but it is still worse than default after alignment (`18.46%` vs `18.03%`) and only has `1/3` fixture coverage. It is classified as `fixture-local-incomplete-coverage`, not a safe renderer fix.
- STILL TODO: AW2E needs a narrower row/background/crop or exact text/source-order model next. Do not promote the width+font candidate.

## 2026-07-12 Roll20 Chat Diagnostic Refresh TODO Note

- DONE: Added `corepack pnpm run diagnose:roll20-chat-refresh -- reports\roll20-actual-compare\2026-06-18-state-map-v1` so chat parity, current metrics, style/candidate diagnostics, width/message/table models, row/background probes, width reconciliation, and `gate:roll20-renderer-action` are regenerated from the same current evidence set.
- VERIFIED: The refresh command completed successfully after the AW2E actual chat recapture. Current actual evidence remains complete: `generatedActualScreenshots=6/6`, `generatedDiffed=6/6`, `generatedAuthoritative=YES`, `chatCaptureSuspects=0`, `chatCurrentMetrics=3/3`.
- CURRENT: Renderer is still correctly held: `HOLD_PRODUCTION_RENDERER_PATCH`, `rendererReady=NO`, `chatNormalizedHighMismatch=3`, `chatAlignedHighMismatch=3`, `chatMaxAlignedMismatch=54.1%`.
- CURRENT: Fresh width reconciliation splits the next work into three P0 axes:
  - `official-roll20-AW2E`: `CHAT_MESSAGE_CONTENT_WIDTH`, aligned mismatch `18.03%`, table delta `+15.75px`; model per-template message/content width, not global ChatPane width.
  - `official-roll20-Les-Oublies`: `NEW_NARROW_MODEL_REQUIRED`, aligned mismatch `54.1%`; current candidates are rejected/no-gain, and row/text/table structure parity must be compared before CSS promotion.
  - `yshy-commission-1bu`: `TABLE_SCROLL_INTRINSIC`, aligned mismatch `20.68%`, table delta `-24.531px`; build a CoC/YSHY-scoped table intrinsic/font/sanitize model, not transform or broad typography CSS.
- STILL TODO: Implement the next narrow diagnostics/renderer experiments in that order. Do not expose a public chat renderer option or enable production ChatPane CSS until the gate stops reporting split fixture axes and high mismatch.

## 2026-07-12 AW2E Roll20 Foreground Chat Recapture TODO Note

- DONE: Reapplied `official-roll20-AW2E` to the dedicated Roll20 Custom Sheet Sandbox (`21639681`) through the guarded settings-page endpoint fallback. The settings page reported `Your changes were saved successfully`, and the snippet reported no translation JSON parse error and no Roll20 editor parse error.
- DONE: Reopened the sandbox character through `open:roll20-character-cdp` and saved fresh AW2E sheet-frame DOM evidence: `probe:roll20-sheet-frame` returned `VISIBLE_MATCH`, frame `Character sheet for Witrav Upijek`, `sheetHitCount=92`, `rootCount=3`, `attrCount=486`, and `rollButtonCount=13`.
- DONE: Captured foreground AW2E Roll20 chat evidence with `capture:roll20-chat-cdp -- --fixture official-roll20-AW2E`. The capture wrote fresh ignored `roll20-chat.png` and `roll20-chat-dom-evidence.json`.
- DONE: Tightened CDP page selection in `probe:roll20-sheet-frame`, `capture:roll20-chat-cdp`, and `open:roll20-character-cdp` so `/editor` is preferred over `/editor/character/...` popout pages. This prevents empty popout shells from being mistaken for the active VTT editor.
- VERIFIED: `status:roll20-actual` now reports `generatedActualScreenshots=6/6`, `generatedDiffed=6/6`, `generatedAuthoritative=YES`, `chatCaptureSuspects=0`, `chatNormalizedCompared=3/3`, and `chatNeedsNormalizedCapture=0`.
- CURRENT: `diagnose:roll20-chat-parity` now compares all 3 chat fixtures and reports high rolltemplate-crop mismatch for all three: AW2E `26.9%`, Les-Oublies `58.73%`, YSHY `24.73%`. Renderer remains `HOLD_PRODUCTION_RENDERER_PATCH`; the blocker has moved from missing evidence to real ChatPane/rolltemplate mismatch.
- STILL TODO: Build the next renderer investigation around actual Roll20 chat shell/message/template width and table intrinsic sizing. Do not promote a single global ChatPane width/padding/font patch while fixture deltas conflict.

## 2026-07-12 YSHY Roll20 Foreground Chat Recapture TODO Note

- DONE: Used only the dedicated Roll20 Custom Sheet Sandbox/test-room editor (`Codex Roll20 Verify`, campaign `21639681`) and opened the sandbox character through Roll20's own `Campaign.characters` viewer path. Existing real rooms were not edited.
- DONE: Saved fresh YSHY sheet-frame DOM evidence after the character iframe opened: `probe:roll20-sheet-frame` returned `VISIBLE_MATCH`, frame `Character sheet for Witrav Upijek`, `sheetHitCount=65`, `rootCount=3`, `attrCount=1069`, and `rollButtonCount=808`.
- DONE: Clicked a YSHY roll button in that loaded character sheet, closed the overlapping character dialog, and recaptured foreground Roll20 chat evidence with `capture:roll20-chat-cdp -- --fixture yshy-commission-1bu --skip-click`. The capture wrote fresh ignored `roll20-chat.png` and `roll20-chat-dom-evidence.json`.
- DONE: Added `scripts/roll20_character_cdp_open.mjs` plus `open:roll20-character-cdp` so future actual-screen sessions can list/open/close sandbox characters before running the sheet-frame probe.
- VERIFIED: `node scripts\roll20_actual_screenshot_diff.mjs reports\roll20-actual-compare\2026-06-18-state-map-v1` now diffs YSHY chat (`42.73%` screenshot mismatch). `diagnose:roll20-chat-parity` now compares 2/3 chat fixtures and reports YSHY normalized rolltemplate mismatch `24.73%`.
- CURRENT: `status:roll20-actual` improved to `generatedActualScreenshots=5/6` and `generatedDiffed=5/6`. `official-roll20-AW2E` still lacks trustworthy foreground chat evidence, so `rendererReady=NO` and `rendererAction=HOLD_PRODUCTION_RENDERER_PATCH` remain correct.
- STILL TODO: Apply/open the AW2E fixture in the dedicated sandbox, prove its sheet iframe with `probe:roll20-sheet-frame`, then recapture AW2E foreground `roll20-chat.png` with a fresh sidecar.

## 2026-06-21 Codex Update - AW2E live Roll20 chat observation, extension screenshot blocked

Status: VERIFY/BLOCKED_CAPTURE_PATH. This batch used the logged-in Roll20 editor tab and did not edit existing room/settings/source. It observed live AW2E sheet/chat behavior, but did not add trusted Roll20 chat visual evidence.

- OBSERVED: The dedicated Roll20 editor tab opened the `Yadunka Esowhaz` character sheet iframe. The iframe contained AW2E sheet markers: `sheetCount=3`, `attrCount=486`, `rollCount=13`, and Playbook/Hardholder text.
- OBSERVED: Clicking `roll_dsuf`, submitting the Roll20 `Macro Options` modal with default `0`, and switching to the chat tab produced a visible `.sheet-rolltemplate-aw` message. DOM foreground probing found `elementFromPoint` hits on the selected TABLE/TH/TD rolltemplate nodes.
- BLOCKED: Chrome extension `tab.screenshot()` still returned JPEG bytes for `.png` filenames and did not capture the visible right-side text chat surface in the saved page screenshot. A trial crop caught Roll20 UI/Sandbox Tools instead of the rolltemplate and was removed immediately.
- DONE: `scripts/roll20_chrome_observation_audit.mjs` now also accepts a `local-baseline/<fixture>/screenshots` folder with `roll20-chat-dom-evidence.json`, so page-only extension screenshots are explicitly classified as observation-only instead of trusted chat evidence.
- CURRENT STATUS: AW2E remains missing trusted canonical `roll20-chat.png`; recapture still needs CDP or a verified screenshot adapter that visibly captures the foreground text chat panel.

## 2026-06-21 Codex Update - Roll20 chat recapture handoff ordering

Status: DONE/VERIFY_HANDOFF_ORDER. This batch updated the Roll20 recapture plans so every chat recapture handoff now tells agents to prove the character-sheet iframe before capturing chat.

- DONE: `plan:roll20-chat-capture` now includes `sheetFrameEvidence`, `sheetFrameProbeCommand`, and `chatCaptureCommand` per fixture.
- DONE: The generated chat recapture Markdown table now shows the required `roll20-sandbox-dom-evidence.json` path, and each checklist tells agents to run `probe:roll20-sheet-frame` before `capture:roll20-chat-cdp`.
- DONE: `handoff:roll20-chat-current` now surfaces the sheet-frame probe command and gated chat capture command for each stale fixture.
- DONE: `handoff:roll20-upload` upload order now includes sheet-frame probing before root/chat evidence capture.
- VERIFIED: `node --check` passed for `roll20_chat_capture_plan`, `roll20_chat_current_handoff`, and `roll20_upload_handoff`. `test:roll20-chat-capture-plan`, `handoff:roll20-chat-current`, and `handoff:roll20-upload -- ... official-roll20-AW2E --missing-only` passed.
- CURRENT STATUS: AW2E and YSHY still need trusted foreground chat recapture; this batch improves the handoff/order and does not add new screenshots.

## 2026-06-21 Codex Update - Roll20 chat capture requires sheet-frame evidence

Status: DONE/VERIFY_CHAT_CAPTURE_GATE. This batch hardened the actual Roll20 chat capture path so rolltemplate screenshots cannot be captured for an unproven or wrong character-sheet iframe.

- DONE: `capture:roll20-chat-cdp` now requires positive `roll20-sandbox-dom-evidence.json` from `probe:roll20-sheet-frame` before it clicks a roll button or captures `roll20-chat.png`.
- DONE: The gate rejects missing, malformed, wrong-fixture, non-`VISIBLE_MATCH`, or generic-root-only sheet evidence. It requires expected fixture markers such as generated `attr_`, `roll_`, or visible sheet text tokens.
- DONE: Successful chat sidecars now include a summary of the sheet-frame evidence used for that capture.
- VERIFIED: `node --check scripts\roll20_chat_cdp_capture.mjs`, `corepack pnpm run test:roll20-chat-cdp-readiness`, `corepack pnpm run capture:roll20-chat-cdp -- --run-dir reports\roll20-actual-compare\2026-06-18-state-map-v1 --fixture official-roll20-AW2E --plan-only`, `corepack pnpm run test:roll20-sheet-frame-probe`, `corepack pnpm run test:roll20-upload-snippet`, `corepack pnpm run lint`, `corepack pnpm run build`, and `corepack pnpm run guard:roll20-evidence -- reports\roll20-actual-compare\2026-06-18-state-map-v1` passed.
- OBSERVED: `capture:roll20-chat-cdp --dry-run` still reports `BLOCKED_CDP_ENDPOINT` because `127.0.0.1:9222` is not listening in the current desktop state.
- VERIFY NEXT: Start/attach a CDP-enabled Roll20 tab, run `probe:roll20-sheet-frame`, then rerun `capture:roll20-chat-cdp` for AW2E and YSHY.
- CLAIM BOUNDARY: This prevents false chat capture. It does not add new trusted `roll20-chat.png` evidence and does not change renderer readiness.

## 2026-06-21 Codex Update - Roll20 sheet frame DOM evidence tool

Status: VERIFY/CHAT_RECAPTURE_STILL_NEEDED. This batch added a reusable frame-aware CDP probe for the Roll20 character-sheet iframe. It does not add visual parity or trusted chat screenshots.

- DONE: Added `scripts/roll20_sheet_frame_probe.mjs` and package scripts `probe:roll20-sheet-frame` / `test:roll20-sheet-frame-probe`.
- DONE: The probe reads generated payload hints, inspects Roll20 top page plus child frames, and writes `roll20-sandbox-dom-evidence.json` only when expected fixture markers are found in the character-sheet iframe.
- SAFETY: The probe refuses to save positive evidence for generic roots alone; expected payload hits (`attr_`, `roll_`, or visible text tokens) outrank generic root/attr counts.
- OBSERVED: Current normal CDP endpoint `127.0.0.1:9222` is closed, so `probe:roll20-sheet-frame --dry-run` reports `BLOCKED_CDP_ENDPOINT` in this desktop state.
- OBSERVED: Through the logged-in Chrome MCP path, opening the dedicated Roll20 editor and a test character again showed AW2E in the character iframe: `rootCount=3`, `attrCount=486`, `rollButtonCount=13`, and Playbook markers.
- LOCAL EVIDENCE: Saved ignored local `roll20-sandbox-dom-evidence.json` for `official-roll20-AW2E` from that frame-aware observation. This is DOM evidence only and must not be committed.
- VERIFIED: `node --check scripts\roll20_sheet_frame_probe.mjs`, `corepack pnpm run test:roll20-sheet-frame-probe`, `corepack pnpm run test:roll20-upload-snippet`, `corepack pnpm run lint`, `corepack pnpm run build`, and `corepack pnpm run guard:roll20-evidence -- reports\roll20-actual-compare\2026-06-18-state-map-v1` passed.
- CURRENT STATUS: `status:roll20-actual` still reports `rendererReady=NO`, `rendererAction=HOLD_PRODUCTION_RENDERER_PATCH`, `generatedActualScreenshots=4/6`, `generatedDiffed=4/6`, and missing/suspect chat foreground evidence for `official-roll20-AW2E` and `yshy-commission-1bu`.
- VERIFY NEXT: Use a CDP-enabled browser or a verified Chrome-extension foreground crop adapter to recapture AW2E/YSHY `roll20-chat.png` with fresh `roll20-chat-dom-evidence.json`.
- CLAIM BOUNDARY: Sheet iframe DOM activation is proven for the observed AW2E tab, but no screenshot parity or chat parity is proven.

## 2026-06-21 Codex Update - Roll20 sheet iframe activation routing

Status: VERIFY/FRAME_AWARE_ACTIVATION_NEEDED. This batch rechecked the live Roll20 editor after the earlier AW2E `CHAT_TEMPLATE_ONLY`/`NOT_PROVEN` result and found that the sheet body can live inside the character-sheet iframe even when the top document has zero sheet markers.

- OBSERVED: The visible Roll20 top document had `charsheet=0`, `sheetform=0`, `attr=0`, `roll=0`, `charactereditor=1`, and chat rolltemplate classes. This explains why top-document-only activation checks reported no sheet body.
- OBSERVED: After closing the unsaved character edit dialog with `Cancel`, the character viewer dialog exposed an iframe titled `Character sheet for Yadunka Esowhaz`.
- OBSERVED: A frame-aware browser probe of that iframe found AW2E sheet content: `attrCount=486`, `rollCount=13`, `charsheetCount=3`, and visible text beginning `Name: Playbook: Lock/Unlock Playbook Angel...`.
- DONE: Updated `scripts/roll20_upload_snippet.mjs` so generated activation checks inspect same-context character-sheet iframes when possible and otherwise report `SHEET_IFRAME_PRESENT_NEEDS_FRAME_PROBE` instead of collapsing the case into `CHAT_TEMPLATE_ONLY` or `NOT_PROVEN`.
- DONE: Added `CHARACTER_DIALOG_NO_SHEET_BODY` for the case where a character dialog/edit shell is open but the sheet iframe/body is not visible yet.
- DONE: Updated `scripts/README.md` and `test:roll20-upload-snippet` to document and guard the new activation statuses.
- VERIFIED: `node --check scripts\roll20_upload_snippet.mjs`, `corepack pnpm run test:roll20-upload-snippet`, `corepack pnpm run snippet:roll20-upload -- reports\roll20-actual-compare\2026-06-18-state-map-v1 official-roll20-AW2E`, `corepack pnpm run lint`, and `corepack pnpm run build` passed.
- CURRENT STATUS: `status:roll20-actual` still reports `rendererReady=NO`, `rendererAction=HOLD_PRODUCTION_RENDERER_PATCH`, `generatedActualScreenshots=4/6`, and missing/suspect chat evidence for `official-roll20-AW2E` and `yshy-commission-1bu`.
- VERIFY NEXT: Add or use a frame-aware capture/probe path for actual root/chat evidence. Top-document browser snippets alone are not enough on current Roll20 because the character sheet body may be iframe-contained.
- CLAIM BOUNDARY: This proves the current live Roll20 tab can expose AW2E controls in a character-sheet iframe. It does not prove visual parity, does not add a trusted screenshot, and does not unblock renderer production changes by itself.

## 2026-06-21 Codex Update - Roll20 settings manifest shape recheck

Status: VERIFY/BLOCKED_ACTIVATION. This batch rechecked the live Roll20 Custom Sheet Sandbox settings path while trying to continue AW2E/YSHY trusted chat recapture; it does not add new trusted chat screenshots and does not change product rendering.

- DONE FOLLOW-UP: Cleaned product-facing Korean copy in `MainAreaToolbar` and `PreviewEmptyState`, replacing mojibake mode labels/tooltips and empty-preview guidance with clear local-preview wording.
- DONE FOLLOW-UP: Replaced temporary text-symbol mode markers in `MainAreaToolbar` with lucide icons (`PencilRuler`, `PanelsLeftRight`, `Blocks`, `Eye`) while keeping text labels visible.
- DONE FOLLOW-UP: Cleaned `PreviewToolbar` Korean labels/tooltips/aria text and removed the dead refresh button that had no action handler. The legacy Roll20 CSS toggle remains available.
- DONE FOLLOW-UP: Cleaned product-facing Korean copy and ARIA labels in `Statusbar` and `SidebarLeft`, replacing mojibake block/save/autosave/workspace/sidebar labels with readable app copy.
- VERIFIED FOLLOW-UP: `guard:ui-copy`, `lint`, `build`, and `smoke:edit-flow -- --port 4210` passed. The smoke reported `editUiCopy.hasMojibakeHan=false`.
- DONE FOLLOW-UP: Added `corepack pnpm run test:roll20-upload-snippet`, a self-test that fails if the settings-page manifest builder regresses from `{ sheet, userOptions, jsoninfo }` back to plain exported `sheet.json`.
- VERIFIED FOLLOW-UP: `test:roll20-upload-snippet` passed and regenerated AW2E upload snippet reports `shape=wrapped-jsoninfo`.
- DONE FOLLOW-UP: Upload snippets now classify a Roll20 `/editor` JSON parse failure as `ROLL20_EDITOR_PARSE_ERROR`, separate from ordinary `NOT_PROVEN` activation.
- DONE FOLLOW-UP: `snippet:roll20-upload` now also generates matching `/editor` `*-activation-check-snippet.js` files, and the self-test verifies the activation statuses `VISIBLE_MATCH`, `ROLL20_EDITOR_PARSE_ERROR`, and `NOT_PROVEN`.
- DONE FOLLOW-UP: `snippet:roll20-upload` now supports explicit `--apply-settings --endpoint-campaign-id <id>` generation. Default snippets remain non-submitting; apply snippets enable endpoint fallback and settings save only when the dedicated Sandbox/test campaign id is provided.
- DONE FOLLOW-UP: Corrected `docs/operations/37_roll20_actual_verification.md`; it now matches the 2026-06-21 live finding that plain `sheet.json` is the known-bad settings fallback shape and `{ sheet, userOptions, jsoninfo }` is the current guarded path.
- OBSERVED FOLLOW-UP: A live AW2E apply attempt posted HTML/CSS/translation with `200`, but `/editor` returned a Roll20 JSON parse error. Inspecting settings showed `customcharsheet_json` contained two JSON objects concatenated as `}{`, caused by the upload snippet writing both the submitted manifest field and an Ace text-input mirror.
- DONE FOLLOW-UP: Narrowed the generated manifest setter to submitted `textarea/input[name="customcharsheet_json"]` controls and stopped writing `.ace_text-input[name="customcharsheet_json"]`. `test:roll20-upload-snippet` now fails if that broad Ace mirror write returns.
- OBSERVED FOLLOW-UP: After regenerating and applying the fixed AW2E snippet in the dedicated Sandbox, `customcharsheet_json` stayed parseable with `concatIndex=-1`, `/editor` no longer returned the Roll20 parse error, and `sheet-rolltemplate-aw` appeared in chat. However, sheet body markers were still absent (`charsheetCount=0`, `rollButtonCount=0`, attrs/text hits 0), so this is not sheet-root activation proof.
- DONE FOLLOW-UP: Tightened activation checks so rolltemplate-only evidence becomes `CHAT_TEMPLATE_ONLY` instead of `VISIBLE_MATCH`. Sheet-root evidence now requires expected roll buttons, attrs, or text tokens.
- OBSERVED: The original Roll20 editor tab was still logged in and showed Les-Oublies chat templates with `devicePixelRatio=1.25`.
- OBSERVED: The claimed original tab's CDP capability was blocked by `paused document response`, but a fresh temporary Chrome tab opened to `https://app.roll20.net/sheetsandbox/settings/21639681` had working tab-scoped CDP.
- OBSERVED: Applying AW2E with the generated snippet's current plain `customcharsheet_json` value posted HTML/CSS/translation with `200`, but `/editor` returned a Roll20 JSON parse error: `unexpected token at '{ "html": "sheet.html", ... }'`.
- RECOVERED: Reapplied Les-Oublies using the settings-page wrapper shape `{ sheet, userOptions, jsoninfo }`; `/editor` loaded again and visible chat had `sheet-rolltemplate-classic-roll` entries. This recovered the dedicated verification sandbox from the plain-manifest error state.
- PARTIAL: Applying AW2E with the wrapper shape no longer crashed `/editor`, but no AW2E sheet/roll button activation was visible in the checked editor DOM. AW2E trusted chat recapture is still blocked until visible activation is proven.
- OBSERVED: The live Roll20 editor tab activation checker returned `NOT_PROVEN` for both `official-roll20-AW2E` and `yshy-commission-1bu`; the visible tab still showed Les-Oublies rolltemplate classes and no sheet/roll-button markers for those fixtures.
- BLOCKED: The current Chrome tab could not execute the apply snippet automatically: tab CDP was blocked by a paused document response, and the read-only page execution surface disables `eval`/`Function`.
- DONE: Updated `scripts/roll20_upload_snippet.mjs` and `scripts/README.md` so settings-page snippets write the wrapper shape again and warn that the plain exported `sheet.json` text caused a live `/editor` parse error on 2026-06-21.
- NEXT P0: Run the generated apply snippet in the dedicated Sandbox settings page with a CDP-capable/manual console path, then run the activation checker after save/reload for AW2E/YSHY and only recapture `roll20-chat.png` when it returns `VISIBLE_MATCH` and the visible sheet/chat belongs to the intended fixture.

## 2026-06-21 Codex Update - Les-Oublies trusted chat recapture

Status: VERIFY/HOLD_RENDERER. This batch captured one trusted Roll20 chat PNG/sidecar pair for Les-Oublies through the logged-in Chrome tab CDP capability; it does not prove chat parity and does not change product rendering.

- DONE: Ran the generated Les-Oublies DOM probe through tab-scoped CDP `Runtime.evaluate`. It returned `templateForegroundEvidence=FOREGROUND_TEMPLATE_HIT`, `templateHitRatio=1`, `chatSelector=#textchat`, `chatElementSelector=#textchat`, and no overlay candidates.
- DONE: `Page.captureScreenshot` with the raw CSS clip captured Sandbox Tools, proving again that this Roll20 tab needs DPR correction. Capturing the physical DPR clip, then downscaling to CSS size, produced a true PNG foreground rolltemplate crop.
- DONE: Saved ignored local evidence to `reports/roll20-actual-compare/2026-06-18-state-map-v1/local-baseline/official-roll20-Les-Oublies/screenshots/roll20-chat.png` and `roll20-chat-dom-evidence.json`. The sidecar records `captureDprCorrection.applied=true`.
- VERIFIED: `roll20_actual_screenshot_diff` now diffs Les-Oublies chat. `diagnose:roll20-chat-parity` now compares 1/3 normalized chat fixtures and reports Les-Oublies high mismatch: actual `267x180` vs local `267x84`, aligned mismatch `54.1%`.
- VERIFIED: `status:roll20-actual` improved to `generatedActualScreenshots=4/6`, `generatedDiffed=4/6`, `chatCaptureSuspects=2`, `chatNeedsNormalizedCapture=2`. Remaining chat recaptures: AW2E and YSHY.
- NEXT P0: Recapture AW2E and YSHY with the same foreground+DPR-corrected path. Keep renderer action on HOLD; Les-Oublies now has real mismatch evidence, not parity.

## 2026-06-21 Codex Update - chat sidecar foreground evidence gate

Status: DONE/VERIFY. This batch makes `templateForegroundEvidence` mandatory for trusting Roll20 chat sidecars; it does not add fresh Roll20 screenshots.

- DONE: `validateChatForeground` in `roll20_chat_capture_plan`, `roll20_actual_status`, `roll20_chat_parity_diagnostics`, and `roll20_upload_handoff` now rejects sidecars captured before `templateForegroundEvidence` existed.
- DONE: Existing sidecars without `templateForegroundEvidence` are classified as foreground-suspect / needs-normalized-capture instead of being treated as normalized chat visual evidence.
- VERIFIED: `diagnose:roll20-chat-parity` now reports `NEEDS_NORMALIZED_CAPTURE` for all 3 chat fixtures because AW2E, Les-Oublies, and YSHY sidecars predate the foreground proof field.
- VERIFIED: `status:roll20-actual` now reports `PARTIAL_GENERATED_ACTUAL_SCREENSHOTS`, `generatedActualScreenshots=3/6`, `generatedDiffed=3/6`, `chatCaptureSuspects=3`, `chatNeedsNormalizedCapture=3`, and missing generated chat evidence for all 3 fixtures.
- VERIFIED: `plan:roll20-chat-capture --require-current-metrics` now plans 3/3 recaptures and says each one needs `templateForegroundEvidence`.
- NEXT P0: Recapture AW2E, Les-Oublies, and YSHY chat evidence through a trusted Roll20 path. Each sidecar must include `templateForegroundEvidence=FOREGROUND_TEMPLATE_HIT`, current typography/table metrics, and a fresh true-PNG `roll20-chat.png`.

## 2026-06-21 Codex Update - chat capture foreground probe hardening

Status: DONE/VERIFY. This batch hardens the Roll20 chat recapture path; it does not add a new trusted Roll20 screenshot and does not change product rendering.

- DONE: `scripts/roll20_chat_capture_plan.mjs` now emits `templateForegroundEvidence` in generated browser DOM probe snippets. The probe samples `document.elementFromPoint` across the selected rolltemplate clip and records known overlay candidates such as Sandbox Tools, HTML/CSS/Translation controls, reload/session banners, and other intersecting page elements.
- DONE: `scripts/roll20_chat_cdp_capture.mjs` now refuses to save `roll20-chat.png` when the DOM sidecar is missing `templateForegroundEvidence` or when its status is not `FOREGROUND_TEMPLATE_HIT`.
- VERIFIED: `test:roll20-chat-capture-plan`, `test:roll20-chat-cdp-readiness`, and the Les-Oublies `plan:roll20-chat-capture --require-current-metrics` passed. The regenerated Les-Oublies snippet contains `templateForegroundEvidence`, `FOREGROUND_TEMPLATE_HIT`, and `overlayCandidates`.
- VERIFIED: `capture:roll20-chat-cdp --plan-only` still prints the expected Les-Oublies target paths and suggested roll buttons.
- NEXT P0: Open a CDP-enabled logged-in Roll20 Sandbox/test-room tab and rerun the real capture. The next capture must satisfy both foreground DOM evidence and foreground pixel sanity before renderer work can continue.

## 2026-06-21 Codex Update - Chrome observation audit guard

Status: DONE/VERIFY. This batch adds a guard for Chrome-extension Roll20 observations; it does not prove Roll20 visual parity and does not change product rendering.

- DONE: Added `scripts/roll20_chrome_observation_audit.mjs` and `corepack pnpm run audit:roll20-chrome-observation`.
- DONE: The audit reads local-only `chrome-extension-roll20-observation` folders and classifies DOM-template-only evidence, session-refresh markers, `.png` filenames containing JPEG bytes, direct template clips from the untrusted extension screenshot path, and selected clip/chat-root/template coordinate consistency.
- VERIFIED: The self-test passed. Running the audit on `official-roll20-Les-Oublies/after-refresh` returned `OBSERVATION_ONLY_BLOCKED_CAPTURE_PATH`, `domTemplates=3`, `trustedCapture=NO`, and named the false-proof reasons: session-refresh markers remain and the extension screenshot files are JPEG bytes despite `.png` filenames.
- LOCAL EVIDENCE: Ignored audit output was written under `reports/roll20-actual-compare/2026-06-18-state-map-v1/chrome-extension-roll20-observation/official-roll20-Les-Oublies/after-refresh/chrome-observation-audit/`.
- NEXT P0: Use this audit before considering any Chrome-extension Roll20 observation as evidence. Les-Oublies still needs trusted CDP capture or a separately verified full-screenshot crop adapter that emits true foreground PNG evidence tied to the visible text chat panel.

## 2026-06-21 Codex Update - Roll20 Chrome observation capture boundary

Status: VERIFY/BLOCKED_CAPTURE_PATH. This batch observed the logged-in Roll20 Sandbox/editor tab through the Chrome extension path; it does not prove Roll20 visual parity and does not change product rendering.

- OBSERVED: The open Chrome Roll20 tab is `Codex Roll20 Verify | Roll20` at `https://app.roll20.net/editor`. After clicking the visible Roll20 `Reload` session-refresh control, the tab returned to a normal `1843x968` CSS viewport with the dedicated Sandbox editor visible.
- OBSERVED: Read-only DOM/hit-test evidence found visible Les-Oublies chat templates in Roll20: two `.sheet-rolltemplate-classic-roll` cards and one `.sheet-rolltemplate-initiative-roll`; `elementFromPoint` over the measured card coordinates hit `.sheet-template-header` / `.sheet-template-first-col`.
- BLOCKED: Chrome extension `tab.screenshot({ clip })` did not produce trustworthy template pixels. Raw DOM coordinates captured `Sheet Sandbox Tools` / VTT UI instead of the rolltemplate, and a browser-zoom-corrected clip still missed the template. These PNGs remain ignored local evidence only and must not be promoted as Roll20 parity proof.
- BLOCKED: The tab-scoped CDP capability could not run `Page.captureScreenshot`; it reported that raw CDP is unavailable while Browser Use is resolving a paused document response. The normal `127.0.0.1:9222` CDP endpoint still remains the required trusted capture path unless a dedicated extension screenshot adapter is added and verified.
- LOCAL EVIDENCE: Ignored observations were written under `reports/roll20-actual-compare/2026-06-18-state-map-v1/chrome-extension-roll20-observation/official-roll20-Les-Oublies/`.
- NEXT P0: Keep `rendererAction=HOLD_PRODUCTION_RENDERER_PATCH` until Les-Oublies has a same-action trusted foreground chat capture. Prefer a CDP-enabled logged-in Roll20 Sandbox/test-room tab; alternatively implement and verify a Chrome-extension full-screenshot crop adapter that accounts for Roll20 zoom/coordinate transforms and overlapping Sandbox Tools.

## 2026-06-20 Codex Update - product UI copy regression guard

Status: DONE/VERIFY. This batch adds a guard against broken Korean/mojibake product UI copy; it does not claim Roll20 visual parity.

- DONE: Added `scripts/ui_copy_guard.mjs` and `corepack pnpm run guard:ui-copy`. The guard scans product-facing UI source folders (`components`, `lib/editor`, `lib/widgets`, related stores, and `shadowMount`) for replacement characters, CJK compatibility/unified ideographs, and common mojibake tokens.
- SAFETY: The guard intentionally excludes Roll20 base CSS, fixtures, reports, generated evidence, and imported sheet corpora because user sheets may contain arbitrary languages and copyrighted source text.
- VERIFIED: `node --check scripts\ui_copy_guard.mjs` passed. `corepack pnpm run guard:ui-copy` passed with `files=49`.
- VERIFIED: `corepack pnpm run smoke:edit-flow -- --port 4210` passed. The smoke observed clean product copy in edit mode: `시트 편집`, `흐름`, `자유`, `레이어`, and `번역`; `hasMojibakeHan=false`, console/page errors `0`.
- CLAIM BOUNDARY: This protects visible app copy and edit-layer terminology from regression. It does not prove imported sheets match actual Roll20, and it does not alter renderer CSS.

## 2026-06-20 Codex Update - Roll20 chat capture frame-offset hardening

Status: VERIFY/BLOCKED_CDP. This batch improves the actual Roll20 chat evidence capture tooling; it does not change product rendering and does not prove Roll20 visual parity.

- DONE FOLLOW-UP: `capture:roll20-chat-cdp` now decodes the captured PNG in browser canvas before writing `roll20-chat.png`. If Roll20 DOM evidence contains rolltemplate text but the PNG has almost no dark/edge foreground pixels, it fails with `BLOCKED_FOREGROUND_PIXEL_SUSPECT` and does not overwrite existing evidence.
- DONE: `scripts/roll20_chat_capture_plan.mjs` now selects a visible/text-rich rolltemplate for recapture instead of blindly using the latest template. This avoids Les-Oublies choosing the sparse `Initiative` card when richer `classic-roll` templates are visible.
- DONE: `scripts/roll20_chat_cdp_capture.mjs` now probes Roll20 frames for usable rolltemplate evidence and records both `screenshotCssClip` (DOM/frame-local clip) and `screenshotClipApplied` (top-level screenshot clip after frame offset). The sidecar also records `captureFrame`.
- OBSERVED: Chrome extension read-only evidence shows the current Roll20 page can report chat DOM coordinates around `x=50` while the visible full-page screenshot shows the chat panel on the far right. This confirms the old crop path could capture Sandbox Tools/VTT UI instead of the rolltemplate.
- VERIFIED: `node --check scripts\roll20_chat_capture_plan.mjs`, `node --check scripts\roll20_chat_cdp_capture.mjs`, `corepack pnpm run test:roll20-chat-capture-plan`, `corepack pnpm run test:roll20-chat-cdp-readiness`, and `corepack pnpm run plan:roll20-chat-capture -- reports\roll20-actual-compare\2026-06-18-state-map-v1 official-roll20-Les-Oublies --require-current-metrics` passed.
- CURRENT STATUS: `corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1` still reports `GENERATED_ACTUAL_SCREENSHOTS_DIFFED_WITH_SUSPECT_CHAT`, `generatedActualScreenshots=6/6`, `generatedDiffed=6/6`, `chatCurrentMetrics=3/3`, `chatActualTemplatePixelSuspect=1`, `generatedAuthoritative=NO`, `rendererAction=HOLD_PRODUCTION_RENDERER_PATCH`, and `rendererReady=NO`.
- BLOCKED: `corepack pnpm run capture:roll20-chat-cdp -- --run-dir reports\roll20-actual-compare\2026-06-18-state-map-v1 --fixture official-roll20-Les-Oublies --skip-click --dry-run` still reports `BLOCKED_CDP_ENDPOINT` because `127.0.0.1:9222` is not listening. No new trusted Roll20 `roll20-chat.png` was captured in this batch.
- NEXT P0: Open a CDP-enabled logged-in Roll20 Sandbox/test-room tab or add a separate Chrome-extension full-screenshot crop path, then recapture Les-Oublies chat so `chatActualTemplatePixelSuspect` drops to `0` before any ChatPane renderer tuning.

## 2026-06-20 Codex Update - Roll20 sandbox settings chat recapture

Status: VERIFY/HOLD_RENDERER. This batch used the dedicated Roll20 Sandbox settings page, not existing real rooms, to refresh actual Roll20 chat evidence.

- DONE/OBSERVED: Opened `https://app.roll20.net/sheetsandbox/settings/21639681`; the page exposes `#settingsform`, `#save-changes-button`, `textarea[name="customcharsheet_json"]`, and Ace `editors.json`.
- DONE/OBSERVED: The normal Chrome file chooser route is still blocked by extension file access (`fileChooser.setFiles failed: Not allowed`), but the dedicated settings fallback can set plain exported `sheet.json`, update `editors.json`, POST HTML/CSS/translation to `/sheetsandbox/savesheetsettings`, and save the sandbox form.
- DONE: Reapplied `official-roll20-Les-Oublies` and `official-roll20-AW2E` in the dedicated sandbox only. Editor reload showed matching Roll20 chat templates (`sheet-rolltemplate-classic-roll` / `sheet-rolltemplate-initiative-roll` for Les, `sheet-rolltemplate-aw` for AW2E).
- DONE: Recaptured AW2E and Les Roll20 chat PNG/DOM sidecars under ignored local reports. `corepack pnpm run diagnose:roll20-chat-current-metrics -- reports\roll20-actual-compare\2026-06-18-state-map-v1` now reports `PASS`, `fixtures=3/3 current`, `missingFields=0`.
- CURRENT STATUS: `status:roll20-actual` now reports `chatCurrentMetrics=3/3` and `chatCurrentMetricsMissing=0`; this removes the previous AW2E/Les missing-filter-field blocker.
- STILL BLOCKED: Renderer action remains `HOLD_PRODUCTION_RENDERER_PATCH`. Current status is `GENERATED_ACTUAL_SCREENSHOTS_DIFFED_WITH_SUSPECT_CHAT`, `generatedAuthoritative=NO`, `chatCaptureSuspects=2`, `chatActualCaptureScaleSuspect=1`, `chatActualTemplatePixelSuspect=1`, and `rendererReady=NO`.
- NEXT P0: Fix the remaining Les chat foreground/crop capture suspicion and then continue chat renderer model work from measured differences, not from broad CSS guesses. Do not claim visual parity.

## 2026-06-20 Codex Update - Roll20 sandbox snippet recheck

Status: VERIFY/BLOCKED_UPLOAD_APPLICATION. This batch rechecked the live Roll20 dedicated sandbox tab and corrected stale script documentation.

- OBSERVED: No project dev server/CDP endpoint was listening on `3000`, `3001`, `3002`, or `9222`. Remaining listeners were Discord, Steam, OneDrive, Wacom, VS Code, system, or security-related processes and were not stopped.
- OBSERVED: The only open Roll20 tab is `Codex Roll20 Verify | Roll20` at `https://app.roll20.net/editor`. `Sheet Sandbox Tools` is visible, and `#sheetHtml`, `#sheetCss`, and `#sheetTranslation` exist.
- BLOCKED/OBSERVED: Running the latest Les-Oublies upload snippet in the dedicated sandbox tools dispatched all three generated files, but the activation probe found `0` expected visible markers after upload. Result status: `FILE_INPUTS_DISPATCHED_BUT_VISIBLE_MATCH_NOT_PROVEN`.
- LOCAL EVIDENCE: Ignored report saved at `reports/roll20-actual-compare/2026-06-18-state-map-v1/roll20-upload-handoff/official-roll20-Les-Oublies-current-snippet-result.json`.
- DONE: Fixed stale `scripts/README.md` wording. It now says the Roll20 upload snippet fills `customcharsheet_json` with the plain exported `sheet.json` text and explicitly warns not to wrap it as `{ sheet, userOptions, jsoninfo }`.
- STILL TODO P0: Open the dedicated Sandbox settings/save path or use the real file chooser route so the generated fixture visibly reloads expected sheet markers, then recapture AW2E and Les-Oublies same-action `roll20-chat.png` plus current `roll20-chat-dom-evidence.json`.
- CLAIM BOUNDARY: File-input dispatch is not Roll20 rendering proof. Do not use this snippet attempt for screenshot/chat parity or renderer CSS promotion.

## 2026-06-20 Codex Update - final rendered resource gate for imported edit smoke

Status: DONE/VERIFY. This batch separates transient request aborts during edit/reimport from actual final missing images/backgrounds.

- DONE: `smoke:imported-edit-sync` now collects final rendered resource state from both edit Shadow DOM and preview iframe after the edit/reimport path settles.
- DONE: The final gate checks visible `<img>` nodes and computed CSS `background-image` URLs. It records failed image/background counts in the ignored smoke report.
- DONE: Resource requests that only failed as `net::ERR_ABORTED` image requests are now classified as `transient-aborted-images-final-rendered` only when final edit and preview resources both pass.
- VERIFIED: Full `corepack pnpm run smoke:imported-edit-sync:strict -- --port 4196` passed for AW2E, Les-Oublies, synthetic-nonleaf-flow, and YSHY 1BU.
- LOCAL RESULT: AW2E and synthetic are `clean`; Les-Oublies and YSHY 1BU are `transient-aborted-images-final-rendered` with final edit/preview failures `0 img/0 bg`.
- VERIFIED: `corepack pnpm run budget:imported-edit -- --port 4199` now reports overall `PASS`; YSHY 1BU import total was about `4992.1ms`, under the current warn budget.
- STILL TODO P0: This is local app edit/preview evidence only. Actual Roll20 Sandbox/test-room screenshot/chat recapture remains required before visual parity or renderer-production claims.

## 2026-06-20 Codex Update - browser asset diagnostics for imported edit resources

Status: VERIFY. This batch improves resource diagnostics only; it does not prove Roll20 visual parity or change production renderer behavior.

- DONE: `scripts/roll20_asset_resource_audit.mjs` now supports `--browser-probe true`, which launches Chromium and checks image-like HTTP refs with actual browser image loading after the existing HTTP probe.
- DONE: Added `corepack pnpm run audit:assets:browser` and documented it in `scripts/README.md`.
- DONE: Browser smoke resource summaries now preserve Playwright `request.failure().errorText`, so reports show concrete causes such as `net::ERR_ABORTED` instead of only `failed image imgur.com`.
- VERIFIED: `node --check` passed for the changed scripts. `audit:assets:browser` against `reports\roll20-actual-compare\2026-06-18-state-map-v1` reported 0 failed HTTP probes, 0 failed browser image probes, and 0 missing local refs for AW2E, Les-Oublies, and YSHY 1BU source/payload refs.
- LOCAL RESULT: Strict imported-edit smoke still fails only on resource status for affected fixtures, while interaction remains PASS. Les-Oublies reports `1x failed image raw.githubusercontent.com (net::ERR_ABORTED)` and YSHY reports `11x failed image imgur.com (net::ERR_ABORTED)`.
- INTERPRETATION: Current evidence does not show dead image URLs. The remaining resource WARN is more likely a render-context/request-abort or DOM replacement timing issue in the imported edit smoke. Do not count it as actual Roll20 visual parity failure until final rendered image/background state is checked.
- DONE FOLLOW-UP: The final-render resource gate now exists in `smoke:imported-edit-sync`; keep extending it if more resource classes appear.
- STILL TODO P0: Actual Roll20 Sandbox/test-room upload and screenshot/chat recapture remain blocked by CDP/login/upload setup; no Roll20 parity claim is allowed.

## 2026-06-20 Codex Update - shared Roll20 CDP readiness helper

Status: DONE/VERIFY. This batch removes duplicated Roll20 page-readiness logic from CDP preflight and chat capture tooling.

- DONE: Added `scripts/lib/roll20Readiness.mjs` as the single source of truth for Roll20 page readiness classification and next-action text.
- DONE: `preflight:roll20-cdp` and `capture:roll20-chat-cdp` now use the shared helper, so login/challenge/unknown-page handling cannot drift independently.
- VERIFIED: `test:roll20-chat-cdp-readiness` passed, `preflight:roll20-cdp` still reports current `CDP_CLOSED`, closed-CDP dry-run still fails with expected `BLOCKED_CDP_ENDPOINT`, and `lint`, `build`, `guard:roll20-evidence` passed.
- STILL TODO P0: Use the shared guard with a logged-in CDP Roll20 Sandbox/test-room tab and recapture AW2E/Les-Oublies chat evidence.

## 2026-06-20 Codex Update - Roll20 chat CDP capture readiness guard

Status: VERIFY/BLOCKED_CDP. This batch prevents `capture:roll20-chat-cdp` from attempting evidence capture on Roll20 login/challenge/non-room pages.

- DONE: `scripts/roll20_chat_cdp_capture.mjs` now classifies the matched Roll20 page before clicking or evaluating the chat probe. Non-ready pages throw structured `ROLL20 CHAT CDP CAPTURE BLOCKED_PAGE_NOT_READY`.
- DONE: Dry-run output now includes page readiness and next action. Added `corepack pnpm run test:roll20-chat-cdp-readiness` for local readiness classification self-test.
- VERIFIED: `test:roll20-chat-cdp-readiness` passed. Closed-CDP dry-run still fails with the expected structured `BLOCKED_CDP_ENDPOINT`. `lint`, `build`, and `guard:roll20-evidence` passed.
- STILL TODO P0: Open a CDP-enabled, logged-in Roll20 Sandbox/test-room tab, rerun preflight until `READY`, then run actual AW2E/Les-Oublies chat captures.

## 2026-06-20 Codex Update - Roll20 CDP preflight readiness classification

Status: VERIFY/BLOCKED_LOGIN. This batch prevents the CDP preflight from treating Roll20 login/challenge pages as capture-ready.

- DONE: `preflight:roll20-cdp` now classifies matching Roll20 targets as `CAPTURE_READY`, `LOGIN_REQUIRED`, `CHALLENGE_OR_WAITING`, or `UNKNOWN_ROLL20_PAGE` instead of reporting `READY` for any `app.roll20.net` tab.
- VERIFIED: During a launched CDP Chrome check, `preflight:roll20-cdp` classified the Roll20 login/challenge page as not capture-ready instead of `READY`. A later non-launched verification returned `CDP_CLOSED`, which is also correctly non-capturable.
- CURRENT BLOCKER: Automated chat recapture still needs a CDP-enabled Chrome tab that is both logged in to Roll20 and opened to the approved Sandbox/test room.
- STILL TODO P0: Start or keep open the CDP-enabled Chrome, log in to Roll20 there, open the approved Sandbox/test room with the intended fixture loaded, rerun preflight until it reports `READY`, then capture AW2E and Les-Oublies chat evidence.

## 2026-06-20 Codex Update - Roll20 CDP preflight for chat recapture

Status: VERIFY/BLOCKED_CDP. This batch adds a repeatable CDP readiness check for the remaining Roll20 chat current-metrics recapture; it does not capture new Roll20 evidence.

- DONE: Added `scripts/roll20_cdp_preflight.mjs` and `corepack pnpm run preflight:roll20-cdp -- --run-dir <run-dir>`.
- DONE: The preflight checks `http://127.0.0.1:9222/json/list`, lists matching Roll20 targets when available, writes ignored local output under `<run-dir>/roll20-cdp-preflight/`, and prints exact per-fixture capture commands from the current chat capture plan.
- VERIFIED: `corepack pnpm run preflight:roll20-cdp -- --run-dir reports\roll20-actual-compare\2026-06-18-state-map-v1` reports `CDP_CLOSED`, `plannedFixtures=2`, and capture commands for `official-roll20-AW2E` and `official-roll20-Les-Oublies`.
- CURRENT BLOCKER: No CDP endpoint is listening on `127.0.0.1:9222`, so automated Roll20 chat recapture cannot run in the current browser state.
- STILL TODO P0: Start or attach a CDP-enabled Roll20 Sandbox/test-room browser, rerun preflight until it reports a Roll20 target, then run `capture:roll20-chat-cdp` for AW2E and Les-Oublies.

## 2026-06-20 Codex Update - Roll20 chat current-metrics handoff

Status: VERIFY. This batch makes the next Roll20 chat recapture step repeatable; it does not claim chat or full renderer parity.

- DONE: Added `scripts/roll20_chat_current_handoff.mjs` and `corepack pnpm run handoff:roll20-chat-current -- <run-dir>`.
- DONE: The handoff runs chat current-metrics audit, current-metrics recapture plan generation, and capture-plan self-test in one command, then writes an ignored local report under `<run-dir>/roll20-chat-current-handoff/`.
- VERIFIED: `corepack pnpm run handoff:roll20-chat-current -- reports\roll20-actual-compare\2026-06-18-state-map-v1` passed all 3 wrapped commands and reports `NEEDS_RECAPTURE`.
- CURRENT EVIDENCE: Generated-sheet actual screenshots/diffs are present for 6/6 generated targets, trusted full-root evidence is 3/3, but renderer action remains `HOLD_PRODUCTION_RENDERER_PATCH`.
- CURRENT BLOCKER: Chat current row/typography/paint-filter sidecars are current for 1/3 fixtures. `official-roll20-AW2E` and `official-roll20-Les-Oublies` need recapture because `latestTemplate.computedStyle.filter` and `table.computedStyle.filter` are missing.
- STILL TODO P0: In the dedicated Roll20 Sandbox/test room, recapture same-action `roll20-chat.png` plus `roll20-chat-dom-evidence.json` for AW2E and Les-Oublies using the generated snippets, then rerun screenshot diff, `diagnose:roll20-chat-parity`, `gate:roll20-renderer-action`, and `status:roll20-actual`.

## 2026-06-20 Codex Update - edit layer copy smoke cleanup

Status: DONE/VERIFY. This batch cleaned the local edit/layer UI copy and rechecked the edit-flow smoke; it does not claim new actual Roll20 sandbox parity.

- DONE: Tightened edit-canvas status/tooltip copy so the Figma-style edit controls read consistently in Korean (`이동할 수 없습니다`, `틀 안에 놓되 해당 틀 기준으로 자유 배치합니다`).
- DONE: Normalized the layer preview secondary marker from a middle dot to ASCII `-` so the smoke remains stable across console/font/codepage paths.
- VERIFIED: `corepack pnpm run lint`, `corepack pnpm run build`, `corepack pnpm run smoke:edit-flow -- --port 4210`, and `corepack pnpm run guard:roll20-evidence` passed.
- LOCAL RESULT: `smoke:edit-flow` reports `editUiCopy.hasExpectedLabels=true`, `editUiCopy.hasMojibakeHan=false`, `consoleErrors=[]`, `pageErrors=[]`, and drag position drift `0px`.
- CLAIM BOUNDARY: This is local edit UX/copy verification only. It does not prove generated sheets match actual Roll20 sandbox/test-room rendering.
- STILL TODO P0: Resume actual Roll20 sandbox/test-room upload or manual-assisted capture, then compare local preview/edit against real Roll20 evidence before making visual parity claims.

## 2026-06-20 Codex Update - Roll20 sandbox tab recheck and CDP capture handoff

Status: VERIFY/BLOCKED. This batch rechecked the live Roll20 verification tab and improved the capture handoff; it did not produce new generated-sheet parity evidence.

- OBSERVED: No local app dev server was listening on ports `3000`, `3001`, `3002`, or `9222`; the remaining node processes were Codex/browser/Figma/agent-bridge runtimes, so no project server was killed.
- OBSERVED: Chrome still had `Codex Roll20 Verify | Roll20` open at `https://app.roll20.net/editor`. The visible Roll20 page is a VTT room with `Sheet Sandbox Tools` open, not an open character-sheet dialog.
- DONE: Saved read-only local evidence for the current Roll20 room under ignored `reports/roll20-actual-compare/2026-06-18-state-map-v1/room-observation/2026-06-20-current-vtt/`. It shows `0` character-sheet roots on screen and `4` visible `.sheet-rolltemplate-coc` chat templates. This is solo-room/wrapper/chat observation evidence only.
- BLOCKED/OBSERVED: The Sandbox Tools file inputs are visible as `#sheetHtml`, `#sheetCss`, and `#sheetTranslation`, but automated upload remains blocked in the current Chrome extension path. A visible label click detached browser control, hidden input `filechooser` timed out, CDP `DOM.setFileInputFiles` is unsupported, and CDP `Runtime.evaluate` became unstable. No existing room was modified.
- DONE: `scripts/roll20_chat_cdp_capture.mjs` now supports `--plan-only`/`--print-plan`, which prints the fixture snippet, `roll20-chat.png`, sidecar targets, CDP endpoint, and suggested roll buttons without requiring a live CDP endpoint.
- DONE: `scripts/roll20_chat_cdp_capture.mjs` now reports a structured `ROLL20 CHAT CDP CAPTURE BLOCKED_CDP_ENDPOINT` message when `127.0.0.1:9222` is not listening, instead of dumping an ambiguous Playwright stack as the only clue.
- VERIFIED: `node --check scripts\roll20_chat_cdp_capture.mjs` passed. `corepack pnpm run capture:roll20-chat-cdp -- --run-dir reports\roll20-actual-compare\2026-06-18-state-map-v1 --fixture official-roll20-AW2E --plan-only` passed and listed AW2E roll buttons (`roll_dsuf`, `roll_gasbf`, `roll_som`, `roll_rasrap`, `roll_oyb`, `roll_move`).
- EXPECTED BLOCKER CHECK: `corepack pnpm run capture:roll20-chat-cdp -- --run-dir reports\roll20-actual-compare\2026-06-18-state-map-v1 --fixture official-roll20-AW2E --skip-click --dry-run` fails cleanly because no CDP endpoint is listening at `http://127.0.0.1:9222`.
- STILL TODO P0: Recapture AW2E and Les-Oublies same-action `roll20-chat.png` plus current `roll20-chat-dom-evidence.json` in a dedicated Roll20 Sandbox/test-room where the fixture is actually loaded, then rerun screenshot diff, chat parity diagnostics, renderer action gate, and `status:roll20-actual`.
- CLAIM BOUNDARY: Current local edit/preview fixture parity is not actual Roll20 visual parity. The live Roll20 check above proves only that the verification tab and Sandbox Tools are reachable and that upload/capture automation remains gated.

## 2026-06-20 Codex Update - edit canvas auto-width parity

Status: VERIFY. This fixes the local AW2E edit/preview full-root visual regression caused by edit mode rendering before preview auto-width settled.

- ROOT CAUSE: `EditCanvas` measured Shadow sheet height but did not update `sheetCanvasWidth`; the imported smoke captured edit first at a stale/narrower canvas width, then preview iframe auto-sized wider. AW2E therefore compared `876px` edit root screenshots against `902px` preview root screenshots and produced a broad `11.93%` sheet-root mismatch.
- DONE: `EditCanvas` now measures Shadow sheet content width and height, raises `sheetCanvasWidth` when the rendered sheet needs more width, and keeps height behavior unchanged.
- DONE: `smoke:imported-edit-sync` now records sheet-root visual hot cells, mismatch coverage, and edit/preview root geometry deltas so future broad visual diffs can be routed to width/geometry/paint/state instead of guessed.
- VERIFIED: `node --check scripts\imported_edit_sync_smoke.mjs`, `corepack pnpm run lint`, `corepack pnpm run build`, AW2E-only `corepack pnpm run smoke:imported-edit-sync -- --only official-roll20-AW2E --port 4198`, full `corepack pnpm run smoke:imported-edit-sync -- --port 4196`, `corepack pnpm run smoke:edit-flow -- --port 4210`, and `corepack pnpm run guard:roll20-evidence` passed.
- LOCAL RESULT: AW2E sheet-root visual mismatch improved from `11.93%` to `1.84%`; root geometry delta is now `0px` width/height/scroll/client, and form-state diff remains `0`.
- LOCAL RESULT: Full imported smoke sheet-root mismatch is `AW2E 1.84%`, `Les-Oublies 1.98%`, `synthetic-nonleaf-flow 0%`, and `yshy-commission-1bu 1.04%`, all classified as `visual-pass` under the current local `2%` budget.
- CURRENT LIMITATION: This proves local edit/preview parity for the current fixture set, not actual Roll20 sandbox parity. `Les-Oublies` and `yshy-commission-1bu` still have resource warnings, so real visual parity still needs asset/state/crop normalization and Roll20 evidence.
- STILL TODO P0: Promote strict sheet-root sync only after deciding how resource warnings and actual Roll20 sandbox/test-room evidence gate production claims.

## 2026-06-20 Codex Update - Shadow edit worker state mirror

Status: VERIFY. This fixes the local edit/preview form-state drift found in the previous batch; it does not solve the remaining AW2E sheet-root visual delta.

- DONE: `mountSheetShadow()` now installs a minimal Roll20 sheet-worker runtime inside the Shadow/edit DOM, including `on`, `getAttrs`, `setAttrs`, `getSectionIDs`, `generateRowID`, `getTranslationByKey`, `getTranslationByLang`, and `getTranslationLanguage`.
- DONE: Shadow/edit runtime now triggers `sheet:opened`, writes hidden/text/radio/checkbox/select/textarea state into the actual Shadow DOM, and mirrors the same checked/value attributes that iframe preview uses for CSS selectors.
- DONE: `PreviewMain` and `EditCanvas` pass emitted `translation.json` text into the Shadow runtime so worker translation helpers can resolve keys without hardcoding a sheet.
- VERIFIED: `corepack pnpm run lint`, `corepack pnpm run build`, AW2E-only `corepack pnpm run smoke:imported-edit-sync -- --only official-roll20-AW2E --port 4198`, full `corepack pnpm run smoke:imported-edit-sync -- --port 4196`, `corepack pnpm run smoke:edit-flow -- --port 4210`, and `corepack pnpm run guard:roll20-evidence` passed.
- LOCAL RESULT: `formStateDiff.diffCount` is now `0` for `official-roll20-AW2E`, `official-roll20-Les-Oublies`, `synthetic-nonleaf-flow`, and `yshy-commission-1bu`.
- LOCAL RESULT: Sheet-root visual mismatch is now `AW2E 11.93%` classified as `unclassified-sheet-root-visual-delta`, `Les-Oublies 1.98%` classified as `visual-pass`, `synthetic-nonleaf-flow 0%` classified as `visual-pass`, and `yshy-commission-1bu 1.04%` classified as `visual-pass`.
- CURRENT LIMITATION: AW2E is no longer explained by form/default state drift. The next P0 is to classify the remaining full-root visual delta by CSS source/paint/geometry/resource/crop instead of applying another broad CSS patch.
- STILL TODO P0: Actual Roll20 renderer parity remains separate and still requires Roll20 sandbox/test-room evidence before any parity claim.

## 2026-06-20 Codex Update - form-state divergence classification

Status: VERIFY. This turns the latest sheet-root edit/preview visual mismatch into a more concrete diagnosis; it does not fix the underlying state divergence yet.

- DONE: `smoke:imported-edit-sync` now collects `input`, `select`, and `textarea` runtime state from both the edit Shadow DOM and preview iframe after imported edit operations.
- DONE: The smoke compares edit/preview form control values, checked state, selected index, and control counts, then writes `formStateDiff` into the ignored local JSON/markdown report.
- DONE: Sheet-root visual mismatch now records a classification: `visual-pass`, `visual-pass-with-form-state-diff`, `likely-form-control-state-divergence`, or `unclassified-sheet-root-visual-delta`.
- VERIFIED: `node --check scripts\imported_edit_sync_smoke.mjs`, `corepack pnpm run lint`, AW2E-only `corepack pnpm run smoke:imported-edit-sync -- --only official-roll20-AW2E --port 4198`, full `corepack pnpm run smoke:imported-edit-sync -- --port 4196`, `corepack pnpm run build`, `corepack pnpm run guard:roll20-evidence`, and `corepack pnpm run smoke:edit-flow -- --port 4210` passed.
- LOCAL RESULT: `official-roll20-AW2E` still has sheet-root visual mismatch `11.93%`, now classified as `likely-form-control-state-divergence`; form state diffs are `2` controls (`input:hidden:1`, `input:radio:1`), including `attr_SHEETVERSION` edit `1.0` vs preview `1.1` and `attr_harm` radio value `0` unchecked in edit vs checked in preview.
- LOCAL RESULT: `official-roll20-Les-Oublies` has sheet-root visual mismatch `1.98%`, classified as `visual-pass-with-form-state-diff`; form state diffs are `9` controls, mostly hidden/default attributes. `yshy-commission-1bu` has mismatch about `1.04%`, classified as `visual-pass-with-form-state-diff`; form state diffs are `51` hidden/i18n-default controls. `synthetic-nonleaf-flow` has `0%` mismatch and form state match.
- INTERPRETATION: The worst current local edit/preview full-sheet mismatch is not proven to be a broad CSS cascade/layout collapse. It is now routed toward preview runtime/default attribute and sheet-worker state being applied in preview but not mirrored in edit mode.
- STILL TODO P0: Design and implement an edit-mode runtime state layer so edit mode renders the same post-worker/default state as preview while native inputs remain object-like/non-interactive for Figma-style editing.
- STILL TODO P0: Keep actual Roll20 renderer parity separate; this is local app edit/preview evidence only.

## 2026-06-20 Codex Update - sheet-root edit/preview visual diagnostic

Status: VERIFY. This adds a wider local visual diagnostic after imported edit operations; it is not yet a default hard gate because it exposed known/full-root state and resource differences that need triage.

- DONE: `smoke:imported-edit-sync` now captures the full `#charsheet-root` from both edit Shadow DOM and preview iframe after imported edit operations.
- DONE: The smoke compares those root PNGs with the same browser-canvas diff path used for non-leaf subtree crops and records `sheetVisualSync` in the local JSON/markdown report.
- DONE: Added `--sheet-visual-limit-pct` (default `2`) and `--require-sheet-visual-sync true`. By default the sheet-root result is reported as PASS/WARN; with the require flag it becomes a hard gate.
- VERIFIED: `node --check scripts\imported_edit_sync_smoke.mjs`, `corepack pnpm run lint`, full `corepack pnpm run smoke:imported-edit-sync -- --port 4196`, strict `corepack pnpm run smoke:imported-edit-sync -- --only official-roll20-AW2E --require-sheet-visual-sync true --port 4198` failed as expected, `corepack pnpm run build`, `corepack pnpm run guard:roll20-evidence`, and `corepack pnpm run smoke:edit-flow -- --port 4210`.
- LOCAL RESULT: Latest default full run passed imported edit sync. Sheet-root visual mismatch was `AW2E 11.93%` (WARN, over 2%), `Les-Oublies 1.98%`, `synthetic-nonleaf-flow 0%`, and `yshy-commission-1bu 0.98%`.
- CURRENT LIMITATION: AW2E root mismatch appears concentrated around form control state/paint rather than the moved subtree; strict sheet-root visual sync correctly catches it but is not enabled by default until state/resource causes are triaged.
- STILL TODO P0: Diagnose AW2E edit/preview form-control state divergence, then consider promoting sheet-root visual sync to a default gate. Actual Roll20 renderer parity remains separate.

## 2026-06-20 Codex Update - non-leaf edit/preview screenshot diff

Status: VERIFY. This adds screenshot-level local evidence after imported non-leaf subtree layer moves; it still is not actual Roll20 parity.

- DONE: `smoke:imported-edit-sync` now captures the moved non-leaf subtree from both the edit Shadow DOM and preview iframe into ignored report screenshots.
- DONE: The smoke compares those two PNGs in a browser canvas and records `mismatchPct`, `meanAbsChannelDelta`, compared size, and mismatch bounds in the local JSON report.
- DONE: Non-leaf subtree reorder now requires visual mismatch to stay under `--nonleaf-visual-limit-pct` (default `2%`) in addition to rect sync, layer relation, child preservation, and emitted-order checks.
- VERIFIED: `node --check scripts\imported_edit_sync_smoke.mjs`, `corepack pnpm run lint`, `corepack pnpm run smoke:imported-edit-sync -- --only synthetic-nonleaf-flow --port 4197`, `corepack pnpm run smoke:imported-edit-sync -- --port 4196`, `corepack pnpm run build`, `corepack pnpm run guard:roll20-evidence`, and `corepack pnpm run smoke:edit-flow -- --port 4210` passed.
- LOCAL FIXTURE RESULT: Non-leaf subtree edit/preview screenshot mismatch was `0%` for `official-roll20-AW2E`, `official-roll20-Les-Oublies`, `synthetic-nonleaf-flow`, and `yshy-commission-1bu`; resource checks were clean in the latest full imported smoke.
- STILL TODO P0: Extend screenshot comparison from the moved subtree crop to larger viewport/sheet crops after user operations. Actual Roll20 renderer parity remains gated by Roll20 evidence.

## 2026-06-20 Codex Update - non-leaf edit/preview rect sync

Status: VERIFY. This adds stronger local proof that imported non-leaf subtree layer moves render the same in edit and preview after the drop.

- DONE: `runImportedNonLeafLayerReorder()` now re-reads the moved subtree after layer reorder in both the edit Shadow DOM and the preview iframe.
- DONE: The imported non-leaf pass condition now requires edit/preview relative `left`, `top`, `width`, and `height` to match within `2px`, in addition to layer relation, same parent/depth, child preservation, and emitted-order checks.
- DONE: The imported edit-sync markdown report now labels non-leaf reorder as `preview sync` when the subtree rect check passes.
- VERIFIED: `node --check scripts\imported_edit_sync_smoke.mjs`, `corepack pnpm run lint`, `corepack pnpm run smoke:imported-edit-sync -- --only synthetic-nonleaf-flow --port 4197`, `corepack pnpm run smoke:imported-edit-sync -- --port 4196`, `corepack pnpm run build`, `corepack pnpm run guard:roll20-evidence`, and `corepack pnpm run smoke:edit-flow -- --port 4210` passed.
- LOCAL FIXTURE RESULT: Non-leaf subtree edit/preview rect sync passed on `official-roll20-AW2E`, `official-roll20-Les-Oublies`, `synthetic-nonleaf-flow`, and `yshy-commission-1bu`.
- CURRENT LIMITATION: The latest full imported smoke still recorded `7` resource warnings for `yshy-commission-1bu`; local edit/preview geometry sync passed, but resource warnings remain a visual-parity concern.
- STILL TODO P0: Add screenshot-level edit/preview comparison after subtree moves, not only rect-level comparison. Actual Roll20 renderer parity remains gated.

## 2026-06-20 Codex Update - synthetic imported non-leaf coverage

Status: VERIFY. This closes the previous local coverage gap for imported non-leaf subtree layer reorder, but it remains local-app evidence rather than actual Roll20 parity.

- DONE: Added a copyright-safe built-in fixture, `synthetic-nonleaf-flow`, inside `smoke:imported-edit-sync` so non-leaf imported subtree editing can be exercised without committing real sheet assets.
- DONE: `listFixtures()` now tolerates a missing ignored fixture directory and still runs built-in synthetic coverage; `--only synthetic-nonleaf-flow` can target the committed synthetic case directly.
- DONE: Imported non-leaf candidate selection now uses layer snapshot parent/depth semantics instead of relying on misleading Blockly `parentId` metadata.
- VERIFIED: `node --check scripts\imported_edit_sync_smoke.mjs`, `corepack pnpm run lint`, `corepack pnpm run build`, `corepack pnpm run guard:roll20-evidence`, `corepack pnpm run smoke:imported-edit-sync -- --only synthetic-nonleaf-flow --port 4197`, `corepack pnpm run smoke:imported-edit-sync -- --port 4196`, and `corepack pnpm run smoke:edit-flow -- --port 4210` passed.
- LOCAL FIXTURE RESULT: `official-roll20-AW2E`, `official-roll20-Les-Oublies`, `synthetic-nonleaf-flow`, and `yshy-commission-1bu` all passed imported edit/preview sync with resource checks clean. Non-leaf subtree relation reorder passed on all four. Leaf sibling relation reorder passed on `official-roll20-Les-Oublies` and `synthetic-nonleaf-flow`; it skipped on `AW2E` and `yshy-commission-1bu` because no safe imported leaf sibling pair was found.
- STILL TODO P0: Broaden this from local reorder smoke to real user-facing layer UX checks: visible layer preview, before/after/inside affordance clarity, and edit=preview screenshot comparison after imported subtree moves.
- STILL TODO P0: Actual Roll20 renderer parity remains gated; this change does not alter production renderer CSS.

## 2026-06-20 Codex Update - imported layer relation smoke

Status: VERIFY. This strengthens imported-sheet edit verification; it does not prove every imported sheet layer operation is solved.

- DONE: `smoke:imported-edit-sync` now uses `window.__perfHook.getLayerSnapshot()` when selecting imported layer reorder candidates.
- DONE: Imported leaf sibling reorder now requires the moving row to be an explicit `sibling` with `layerPreviousId` pointing at the target before it is accepted as a safe test candidate.
- DONE: Imported non-leaf subtree reorder candidates now require matching layer parent/depth semantics and record `layerRelationMatches`, `layerSameParent`, and `layerSameDepth` in the local report.
- VERIFIED: `node --check scripts\imported_edit_sync_smoke.mjs`, `corepack pnpm run lint`, `corepack pnpm run build`, `corepack pnpm run guard:roll20-evidence`, `corepack pnpm run smoke:imported-edit-sync -- --port 4196`, and `corepack pnpm run smoke:edit-flow -- --port 4210` passed.
- LOCAL FIXTURE RESULT: `official-roll20-AW2E`, `official-roll20-Les-Oublies`, and `yshy-commission-1bu` all passed imported edit/preview sync with resource checks clean. The strengthened imported leaf layer relation check executed and passed on `official-roll20-Les-Oublies`; `AW2E` and `yshy-commission-1bu` skipped it because no safe imported leaf sibling pair was found.
- STILL TODO P0: Imported non-leaf subtree relation coverage is still missing in current fixtures because no safe visible non-leaf sibling subtree was found. Add or synthesize a copyright-safe fixture that exercises this path before claiming broad Figma-like layer editing.
- STILL TODO P0: Actual Roll20 renderer parity remains gated; this is local app edit-sync evidence only.

## 2026-06-20 Codex Update - layer relation badges and smoke

Status: VERIFY. This improves the edit layer panel's structural honesty; it does not complete the Figma-like editor or prove Roll20 renderer parity.

- DONE: `BlockSnapshot` now carries explicit layer semantics: `layerParentId`, `layerPreviousId`, and `layerRelation` (`root`, `child`, `sibling`).
- DONE: Edit layer rows now expose those semantics through data attributes and visible badges: `루트`, `하위`, and `흐름 형제`.
- DONE: `window.__perfHook.getLayerSnapshot()` exposes the same snapshot for browser smokes without leaking source fixture content.
- DONE: `smoke:edit-flow` now verifies that non-leaf sibling reorder keeps both child inputs inside their original containers and that the layer row identifies the target as a flow sibling before the drop.
- VERIFIED: `corepack pnpm run lint`, `node --check scripts\edit_flow_browser_smoke.mjs`, `corepack pnpm run build`, `corepack pnpm run smoke:edit-flow -- --port 4210`, and `corepack pnpm run guard:roll20-evidence` passed.
- STILL TODO P0: Imported-sheet layer semantics need broader fixture coverage. This patch only proves the synthetic non-leaf reorder case, not every real Roll20 sheet layout.
- STILL TODO P0: Actual Roll20 renderer parity remains gated by current evidence; renderer action is still not ready for production promotion.

## 2026-06-20 Codex Update - layer traversal depth cleanup

Status: VERIFY. This is a small edit-layer structure improvement; it does not complete the Figma-like editing model.

- DONE: Updated `DefaultAdapter.listAllBlocks()` traversal so explicit Blockly `next` chains are walked intentionally with a shared `seen` set instead of relying on broad `getChildren(true)` traversal.
- RESULT: Layer listing is less prone to duplicate/over-broad traversal when blocks are connected through statement chains, which is groundwork for making the layer panel more trustworthy.
- VERIFIED: `corepack pnpm run lint`, `corepack pnpm run smoke:edit-flow -- --port 4210`, `corepack pnpm run build`, and `corepack pnpm run guard:roll20-evidence` passed.
- STILL TODO P0: The layer panel still needs clearer visual hierarchy semantics for imported sheets, including a user-facing distinction between DOM children and Blockly next-chain siblings where Blockly parent metadata can look misleading.

## 2026-06-20 Codex Update - Roll20 chat CDP capture runner

Status: VERIFY. This adds a runner for the next actual Roll20 chat recapture, but no new Roll20 screenshot was captured in this batch.

- DONE: Added `scripts/roll20_chat_cdp_capture.mjs` and package command `corepack pnpm run capture:roll20-chat-cdp`.
- DONE: The runner connects to an already-open Chrome/Edge CDP endpoint, optionally clicks a Roll20 sheet roll button, executes the generated chat DOM probe snippet, validates current `filter` fields, and writes `roll20-chat.png` plus `roll20-chat-dom-evidence.json` to the ignored fixture screenshot folder.
- VERIFIED: `node --check scripts\roll20_chat_cdp_capture.mjs`, `corepack pnpm run lint`, `corepack pnpm run build`, and `corepack pnpm run guard:roll20-evidence` passed.
- CURRENT LIMITATION: No local Chrome/Edge remote debugging endpoint was listening on the checked ports, so the actual AW2E/Les-Oublies Roll20 recapture was not performed.
- STILL TODO P0: Open or attach a Roll20 Sandbox/test-room browser with CDP enabled, then run this runner for `official-roll20-AW2E` and `official-roll20-Les-Oublies`, followed by screenshot diff, chat parity, renderer action, and status gates.

## 2026-06-20 Codex Update - chat capture filter self-test hardening

Status: VERIFY. This hardens the Roll20 chat capture helper only; it does not add new Roll20 screenshots and does not change renderer parity.

- DONE: `scripts/roll20_chat_capture_plan.mjs` self-test now fails if generated chat DOM evidence omits `latestTemplate.computedStyle.filter`.
- DONE: The same self-test now also requires the captured rolltemplate table evidence to include `computedStyle.filter`.
- VERIFIED: `node --check .\scripts\roll20_chat_capture_plan.mjs`, `corepack pnpm run test:roll20-chat-capture-plan`, `corepack pnpm run plan:roll20-chat-capture -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --require-current-metrics`, `corepack pnpm run lint`, `corepack pnpm run build`, and `corepack pnpm run guard:roll20-evidence` passed.
- CURRENT RESULT: The capture plan still reports `NEEDS_CAPTURE` for `2/3` chat fixtures. AW2E and Les-Oublies still need fresh same-action Roll20 `roll20-chat.png` plus `roll20-chat-dom-evidence.json` with the current filter fields.
- STILL TODO P0: Recapture AW2E and Les-Oublies inside the dedicated Roll20 Custom Sheet Sandbox or approved test room, then rerun chat parity/status/renderer gates. No Roll20 visual parity claim is allowed before that evidence exists.

## 2026-06-20 Codex Update - layer role label cleanup

Status: VERIFY. This fixes a visible edit-mode usability issue only; it does not change Roll20 renderer parity.

- DONE: Replaced mojibake layer role labels in `lib/editor/layerRoles.ts` with readable Korean labels: `프레임`, `흐름`, `표`, `입력`, `버튼`, `텍스트`, `이미지`, `스크립트`, and `노드`.
- VERIFIED: `node` UTF-8 inspection confirmed the actual source labels are correct even when the PowerShell terminal font/encoding renders Korean incorrectly.
- VERIFIED: `corepack pnpm run lint`, `corepack pnpm run build`, and `corepack pnpm run smoke:edit-flow -- --port 4210` passed.
- LOCAL SMOKE RESULT: `smoke:edit-flow` reported `editUiCopy.hasExpectedLabels=true`, `editUiCopy.hasMojibakeHan=false`, and the layer row text included `r20_div프레임담기 가능흐름`.
- STILL TODO P0: Continue edit-mode semantics work beyond copy: imported-sheet non-leaf subtree reorder coverage, broader fixture coverage, and eventually editable lazy/ungroup support for compacted large rows.
- STILL TODO P0: Roll20 renderer parity remains blocked by the existing `HOLD_PRODUCTION_RENDERER_PATCH` evidence.

## 2026-06-20 Codex Update - optional wide row compact import

Status: VERIFY. This adds an explicit opt-in speed path for very large imported sheets. It is not enabled by default because bundled rows preserve rendered HTML but limit direct block editing inside those rows until an ungroup/lazy-materialization path exists.

- DONE: `importSheet(..., { html: { compactWideRows: true } })` can now compact repeated large `r20_tr` subtrees into raw row bundles after normal generic composite packing.
- DONE: The import dialog exposes a clearly labeled option, `큰 표 행 빠르게 불러오기`, with the editing tradeoff explained to the user.
- DONE: `window.__perfHook.importSheet`, `smoke:imported-edit-sync --compact-wide-rows true`, and `budget:imported-edit` now report actual `wideRowBundles` and `wideRowCollapsed` metrics.
- LOCAL PRIVATE RESULT: On the current private YSHY 1BU fixture, optional compaction produced `4` wide row bundles and collapsed `432` blocks, changing HTML block count from the previous `6530` baseline to `6094`.
- LOCAL PRIVATE RESULT: The compact run passed imported edit/preview sync, canvas insert, free insert, reimport stability, console/page errors, resource checks, and drag drift `0px`.
- LOCAL PRIVATE RESULT: Import total was about `5434.3ms`, inject about `5086.3ms`, emit about `221.8ms`; this is better than the prior diagnostic baseline but still WARN-level.
- STILL TODO P0: Add a true editable lazy-materialization/ungroup path so large repeated rows can be fast without hiding their internal controls from block editing.
- STILL TODO P0: Continue optimizing the remaining largest root subtree; this first slice does not prove all large sheets are fast, and it does not prove Roll20 visual parity.

## 2026-06-20 Codex Update - wide row bundle dry-run estimate

Status: VERIFY. This adds an estimate for the likely gain from bundling/lazy-materializing the strongest remaining table-row signature; it does not change import behavior yet.

- DONE: `budget:imported-edit` now reports `estimatedWideRowReduction` and `projectedHtmlBlocksWithTopRowBundle`.
- LOCAL PRIVATE RESULT: For the current 6530 HTML-block private fixture, the top remaining row signature could reduce about `1222` blocks if represented as one lazy/bundle unit per row.
- LOCAL PRIVATE RESULT: The dry-run projection is `6530 -> 5308` HTML blocks for that one signature only.
- INTERPRETATION: A row-bundle/lazy strategy has a meaningful but not complete payoff. It should be combined with either more signatures, a safer editable composite, or lazy Blockly materialization rather than pretending one matcher solves the whole performance problem.
- STILL TODO P0: Implement the first safe optimization slice and prove emitted HTML/CSS token equivalence before enabling it by default.

## 2026-06-20 Codex Update - remaining row signature diagnostics

Status: VERIFY. This adds a diagnostic for repeated remaining `r20_tr` structures after current composite packing; it does not add a new matcher yet.

- DONE: `smoke:imported-edit-sync` now records top remaining table-row structural signatures from sanitized block-type counts.
- DONE: `budget:imported-edit` now reports the top remaining row signature row count and descendant-block total.
- LOCAL PRIVATE RESULT: After current composites, the strongest remaining row signature appears `13` times and accounts for `1235` descendant blocks, averaging `95` descendant blocks per row.
- LOCAL PRIVATE RESULT: The top row signature contains repeated `r20_td`, `r20_literal_string`, `r20_roll_button`, `r20_checkbox`, `r20_i18n_text`, and `r20_text_input` patterns.
- INTERPRETATION: This is the first concrete target for the next optimization: a generic wide table/control-row composite or lazy subtree materialization could attack a four-digit block cluster without hardcoding the private sheet.
- STILL TODO P0: Design the next matcher/lazy path against this repeated row signature and verify emitted HTML/CSS stays token-equivalent.

## 2026-06-20 Codex Update - composite packing diagnostics exposed

Status: VERIFY. This exposes composite packing stats in import/performance reports; it does not add new composites yet.

- DONE: `importSheet` now carries composite packing diagnostics in `ImportStats`: atomic total, after-pack total, collapsed count, and packed-by-type counts.
- DONE: `window.__perfHook.importSheet()` and `budget:imported-edit` now include sanitized composite counts, so large private fixtures can be analyzed without publishing source snippets or block IDs.
- LOCAL PRIVATE RESULT: The 6530 HTML-block private fixture currently packs only `r20_attribute_card:8`, `r20_skill_row:49`, and `r20_repeating_section_wrapper:12`, collapsing `253` atomic blocks total.
- LOCAL PRIVATE RESULT: The same run still has largest root subtree `4158` blocks (`63.7%`) and inject remains WARN-level at about `5551.4ms`.
- INTERPRETATION: Existing Phase 2 composites are working but far too narrow for this sheet. Next P0 should either widen generic table/control-row composites or bypass full Blockly materialization for massive subtrees.
- STILL TODO P0: Add a diagnostic that lists unmatched repeated row/table patterns by structural signature, then choose the highest-return generic composite/lazy path.

## 2026-06-20 Codex Update - imported root-subtree shape metrics

Status: VERIFY. This adds sanitized root-subtree diagnostics to imported edit smoke/budget reports; it does not reduce injection time yet.

- DONE: `smoke:imported-edit-sync` now records `htmlWorkspaceShape` with root-subtree block counts, max depth, and top block types without persisting block IDs/text/source snippets.
- DONE: `budget:imported-edit` now reports `Max root subtree`, largest-root percentage, and max depth in redacted summaries.
- LOCAL PRIVATE RESULT: A 6530 HTML-block private fixture had `7` HTML roots; the largest root subtree contained `4158` blocks (`63.7%`) with max depth `47`.
- LOCAL PRIVATE RESULT: Top types in the largest root were mostly table/control-derived blocks (`r20_td`, `r20_literal_string`, `r20_roll_button`, `r20_tr`, `r20_i18n_text`), pointing toward composite reduction or lazy subtree materialization rather than more top-level chunking.
- LOCAL PRIVATE RESULT: The latest shape run passed edit/preview/reimport sync, resource checks, console/page checks, and drag drift stayed `0px`; import was about `4939.1ms`, inject about `4801ms`, emit about `58.9ms`.
- STILL TODO P0: Implement structural import optimization against the largest root-subtree path: composite table/control row reduction, lazy Blockly materialization, or subtree-level hydration.

## 2026-06-20 Codex Update - imported workspace shape metrics

Status: VERIFY. This adds workspace shape metrics to imported edit smoke/budget reports; it does not reduce injection time yet.

- DONE: `smoke:imported-edit-sync` now records `workspaceAfterImport` with total/root block counts per workspace.
- DONE: `budget:imported-edit` now reports `Root HTML` and total workspace blocks in sanitized summaries.
- LOCAL PRIVATE RESULT: A 6530 HTML-block private fixture had only `7` root HTML blocks and `8627` total workspace blocks across HTML/CSS/i18n/worker. This explains why top-level chunking alone does not split the largest imported subtrees enough.
- LOCAL PRIVATE RESULT: The shape run still passed edit/preview/reimport sync with `0px` drag drift, but inject time remained high/noisy around `5.8s`.
- STILL TODO P0: Investigate structural import optimization: composite reduction, lazy Blockly materialization, or subtree-level hydration rather than only top-level chunking.

## 2026-06-20 Codex Update - hydrate resize suppression

Status: VERIFY. This applies a small Blockly hydrate safety/performance improvement; it is not the full import optimization.

- DONE: Updated `DefaultAdapter.hydrateFromXml` so Blockly workspace resize handling is disabled during XML clear/import and re-enabled afterward, matching the existing chunked hydrate pattern.
- LOCAL PRIVATE RESULT: On a 6530-block private fixture, redacted budget changed from about `4799ms total / 4666ms inject` to about `4761ms total / 4619ms inject`, with drag drift still `0px`. This is a small/noisy improvement, not a solved performance issue.
- VERIFIED: private `smoke:imported-edit-sync` passed after the change, and `smoke:edit-flow` passed.
- STILL TODO P0: Real import performance work must reduce Blockly injection/hydration cost structurally; this patch only avoids resize work during synchronous hydrate.

## 2026-06-20 Codex Update - imported edit performance budget

Status: VERIFY. This adds a reusable local performance budget summary for imported edit smoke results; it does not optimize Blockly injection yet.

- DONE: Added `scripts/imported_edit_perf_budget.mjs` and package command `budget:imported-edit`.
- DONE: The budget command reads `smoke:imported-edit-sync` JSON and emits sanitized timing/status summaries: block count, import total, parse, Blockly inject, emit, drag drift, edit/preview sync, reimport stability, resource warnings, and page errors.
- DONE: Added `--redact-ids true` so local private reports can hide fixture names and source paths while keeping useful metrics.
- LOCAL PRIVATE RESULT: Redacted budget for a 6530-block private fixture reports `WARN` only because resources warn; import total, inject, emit, drag drift, page errors, edit/preview sync, and reimport stability are all under current budget.
- VERIFIED: `corepack pnpm run budget:imported-edit -- --results <ignored-report> --redact-ids true`, `node --check scripts\imported_edit_perf_budget.mjs`.
- STILL TODO P0: Use this budget as the baseline before optimizing import/hydration/Blockly injection.

## 2026-06-20 Codex Update - imported edit drag timing evidence

Status: VERIFY. This extends imported-fixture edit smoke timing; private fixture evidence stays ignored and is not committed.

- DONE: Extended `smoke:imported-edit-sync` so each real imported pointer-drag attempt records position samples after pointer-up, after one animation frame, after 50ms, and after 350ms.
- LOCAL PRIVATE RESULT: A 6530-block private sheet fixture passed import/edit/preview/reimport sync with `0px` left/top drag drift in the recorded attempt.
- OBSERVED BOTTLENECK: The same private fixture spent roughly 4.6-4.7s importing, with about 4.5s in Blockly injection and about 50ms in emit. That points the next optimization target toward import/hydration/injection, not the post-drop visual lock path.
- RESOURCE NOTE: The private run still has resource warnings from blocked external/local assets, so this is edit-sync evidence only, not visual parity evidence.
- VERIFIED: `corepack pnpm run smoke:imported-edit-sync -- --fixtures reports\local-private-fixtures --only <private-fixture> ...` passed locally; generated reports/screenshots remain ignored.
- STILL TODO P0: Add a reusable large-fixture performance budget/report command that summarizes import parse/inject/emit/render separately without committing private sheet content.

## 2026-06-20 Codex Update - edit drag drift smoke coverage

Status: VERIFY. This adds a regression guard for drag rollback; it does not prove large imported sheets are fast enough yet.

- DONE: Extended `smoke:edit-flow` to sample moved element position immediately after pointer-up, after one animation frame, after 50ms, and after 250ms.
- RESULT: Current synthetic edit-flow drag has `0px` left/top drift across those samples, so the small synthetic path does not reproduce the user-visible rollback.
- VERIFIED: `corepack pnpm run smoke:edit-flow` passed with the new timeline guard.
- STILL TODO P0: Run the same timing-style probe against large imported private fixtures in ignored local reports, because the likely remaining issue is heavy DOM/emit/remount cost rather than the basic synthetic drag path.

## 2026-06-20 Codex Update - edit surface copy cleanup

Status: VERIFY. This cleans visible edit/preview UI wording; it does not change renderer parity, Roll20 upload evidence, or the Figma-like editing model.

- DONE: Normalized `EditCanvas` toolbar/layer-panel copy so flow/free placement, layer search, container badges, and empty states use readable wording.
- DONE: Adjusted `PreviewToolbar` width/fit labels and `WidgetGallery` add/toast copy so the editor surface is less translation-like.
- DONE: Kept the existing layer-role taxonomy (`frame`, `flow`, `table`, `control`, `action`, `text`, `media`, `runtime`, `other`) intact while clarifying the runtime label as script.
- VERIFIED: `corepack pnpm run lint` passed after the copy cleanup.
- STILL TODO P0: Continue Roll20 actual upload/recapture work for AW2E and Les-Oublies; this UI cleanup does not reduce `HOLD_PRODUCTION_RENDERER_PATCH`.
- STILL TODO P0: Continue edit-mode semantics work: same rendered preview/edit surface, overlay-only editing, flow-aware before/after/inside drop zones, and faster HTML/CSS sync.

## 2026-06-20 Codex Update - sandbox upload activation guard

Status: VERIFY. This hardens the Roll20 Sandbox upload handoff; it does not recapture AW2E/Les-Oublies chat evidence and does not prove visual parity.

- DONE: `scripts/roll20_upload_snippet.mjs` now embeds generic activation hints extracted from payload HTML/CSS/translation/manifest: rolltemplate classes, roll button names, attr names, and visible text tokens.
- DONE: Generated upload snippets now compare before/after Roll20 DOM markers and return `activation.status`.
- RESULT: `FILE_INPUTS_DISPATCHED_BUT_VISIBLE_MATCH_NOT_PROVEN` is now distinct from `VISIBLE_MATCH`, so a synthetic file-input dispatch cannot be treated as proof that Roll20 actually loaded the uploaded sheet.
- VERIFIED: `node --check scripts\roll20_upload_snippet.mjs`, snippet generation for `official-roll20-AW2E`, generated snippet syntax check, and `plan:roll20-chat-capture --require-current-metrics` passed.
- BLOCKED/OBSERVED: The current Chrome/Roll20 session still shows YSHY/CoC chat after an AW2E synthetic upload dispatch. Normal file chooser remains blocked/timed out in the Chrome extension path, and one attempted patched snippet execution timed out before returning evidence. No existing rooms were modified.
- STILL TODO P0: Enable/repair real browser file upload (`Allow access to file URLs` for the Codex Chrome extension) or use the approved Roll20 settings save/Sandbox route, then recapture AW2E and Les-Oublies same-action `roll20-chat.png` plus `roll20-chat-dom-evidence.json` with current metrics.

## 2026-06-20 Codex Update - header and public example copy cleanup

Status: VERIFY. This removes visible mojibake and clarifies public-example rules; it does not change Roll20 renderer parity.

- DONE: Rewrote `components/editor/EditorHeader.tsx` user-facing Korean copy for header title, tooltips, button labels, confirm dialog, and save/new-sheet toasts.
- DONE: Cleaned `lib/examples/index.ts` and `lib/stores/examplesStore.ts` comments so the public example catalog clearly states that real/community/user sheets stay in ignored local fixtures only.
- RESULT: Public sample UI remains hidden while `EXAMPLES` is empty.
- VERIFIED: mojibake scan over `components`, `lib`, and `app` excluding generated Roll20 base CSS found no remaining matches; `lint`, `build`, empty-workspace `smoke:export-dialog` on port `4501`, and `guard:roll20-evidence` passed.
- STILL TODO P0: Continue actual Roll20 AW2E/Les-Oublies chat recapture and renderer gate work; this UI cleanup does not reduce `HOLD_PRODUCTION_RENDERER_PATCH`.

## 2026-06-20 Codex Update - chat current-metrics audit gate

Status: PARTIAL. This tightens actual Roll20 chat evidence gating; it does not recapture AW2E/Les-Oublies and does not make renderer parity pass.

- DONE: Added `scripts/roll20_chat_current_metrics_audit.mjs` and package command `diagnose:roll20-chat-current-metrics`.
- DONE: The audit reports whether each actual Roll20 `roll20-chat-dom-evidence.json` sidecar contains current row metrics, table structure, computed styles, text rasterization fields, paint `filter`, font evidence, text measure samples, and viewport DPR.
- DONE: Wired the renderer action gate to read the audit when present and print fixture-level missing fields in the blocker text.
- RESULT: Current `2026-06-18-state-map-v1` audit is `NEEDS_RECAPTURE`: `1/3` fixtures are current, with AW2E and Les-Oublies missing `latestTemplate.computedStyle.filter` and `table.computedStyle.filter`.
- RESULT: A read-only Chrome check found the current Roll20 tab showing YSHY `.sheet-rolltemplate-coc`, which is already the current-metrics fixture. Attempting normal Sandbox file-input upload for AW2E again failed because the browser file chooser did not open.
- VERIFIED: `node --check` for the new audit and renderer gate, `diagnose:roll20-chat-current-metrics`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Recapture AW2E and Les-Oublies chat screenshot+DOM sidecar in the dedicated Roll20 Sandbox or approved test room. If file chooser remains blocked, use the generated Roll20 upload snippet path or browser settings file access fix before retrying.

## 2026-06-20 Codex Update - export asset preflight UI

Status: VERIFY. This improves export-time truthfulness and user guidance; it does not prove Roll20 visual parity or fix the remaining renderer gate.

- DONE: Export dialog now includes an `외부 자산 점검` panel that counts emitted HTML/CSS asset references as external URL, relative path, and data URL.
- DONE: The dialog warns that images/fonts are not bundled into the zip and may render differently in Roll20 if the source URL, Roll20 proxy, or Imgur link resolves to a placeholder.
- DONE: Export dialog Korean copy was normalized in the touched export flow, and export smoke now checks the new asset-preflight panel plus mojibake absence.
- VERIFIED: `corepack pnpm run lint`, `corepack pnpm run build`, empty-workspace `smoke:export-dialog` on port `4493`, imported Les-Oublies `smoke:export-dialog` on port `4494`, and `guard:roll20-evidence` passed.
- RESULT: Empty workspace shows `외부 자산 없음`; imported fixture with external/proxied refs shows `확인 필요`.
- STILL TODO P0: This is only static export preflight. Actual Roll20 asset loading and visual parity still require Sandbox/test-room screenshots, trusted full-root evidence, and chat sidecar/screenshot comparison.

## 2026-06-20 Codex Update - chat background asset/proxy bytes probe

Status: PARTIAL. This adds byte-level asset evidence; it does not change production ChatPane defaults and does not prove Roll20 visual parity.

- DONE: Added `scripts/roll20_chat_background_asset_probe.mjs` and package command `diagnose:roll20-chat-background-assets`.
- DONE: Wired the asset/proxy probe into `gate:roll20-renderer-action`.
- RESULT: AW2E and YSHY 1BU local/actual background fetches match byte-for-byte, so the current local-vs-actual chat mismatch is not caused by different background image bytes.
- RESULT: Both AW2E and YSHY 1BU background sources currently resolve to tiny removed-placeholder images: `200 image/png`, `503b`, `161x81`, final/source path includes `removed.png`.
- RESULT: Les-Oublies has no table background image in current evidence and stays on non-image declaration/cascade diagnostics.
- RESULT: `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH` and now reports the asset/proxy probe as evidence.
- VERIFIED: `node --check` for the new script and renderer gate, `diagnose:roll20-chat-background-assets`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Preserve/rehost missing source assets before judging original-sheet visual parity for affected fixtures; for local-vs-actual parity, continue with browser paint/context and table/crop diagnostics because the bytes match.
- STILL TODO P0: Recapture AW2E and Les-Oublies Roll20 chat sidecars with current row/typography/filter fields before cross-fixture renderer decisions.

## 2026-06-20 Codex Update - chat background raster model probe routes next paint work

Status: PARTIAL. This adds another diagnostic gate; it does not change production ChatPane defaults and does not prove Roll20 visual parity.

- DONE: Added `scripts/roll20_chat_background_raster_model_probe.mjs` and package command `diagnose:roll20-chat-background-raster`.
- DONE: Wired the raster-model probe into `gate:roll20-renderer-action`.
- RESULT: AW2E stays on `COLOR_ASSET_RASTER_MODEL_REQUIRED`; do not reuse YSHY/CoC background candidates there.
- RESULT: Les-Oublies is `DECLARATION_DIFF_BEFORE_RASTER_MODEL`; exact background declaration/cascade must be resolved before pixel-tuned paint work.
- RESULT: YSHY 1BU is now `SOURCE_IMAGE_OR_BROWSER_PAINT_MODEL_REQUIRED`: background declarations match, row-weighted mismatch is `23.15%`, luma correction only gains `-0.58%p`, and `coc-background-size-actual` remains rejected by row-raster regression.
- RESULT: `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH` and now reports the raster-model routing as evidence.
- VERIFIED: `node --check` for the new script and renderer gate, `diagnose:roll20-chat-background-raster`, and `gate:roll20-renderer-action`.
- STILL TODO P0: For YSHY/CoC, compare fetched background image bytes, Roll20 proxy decode behavior, and browser paint output before trying any more production ChatPane CSS.
- STILL TODO P0: Recapture AW2E and Les-Oublies Roll20 chat sidecars with current row/typography/filter fields before cross-fixture renderer decisions.

## 2026-06-20 Codex Update - chat background/source probe routes YSHY raster mismatch

Status: PARTIAL. This adds another diagnostic routing layer; it does not change production ChatPane defaults and does not prove Roll20 visual parity.

- DONE: Added `scripts/roll20_chat_background_source_probe.mjs` and package command `diagnose:roll20-chat-background-source`.
- DONE: Wired the background/source probe into `gate:roll20-renderer-action`.
- RESULT: The probe compares local vs actual computed table background declarations, row compositing output, table width context, and rejected background-size evidence.
- RESULT: YSHY 1BU is now classified as `BACKGROUND_DECLARATION_MATCHES_BUT_RASTER_DIFFERS`: background declarations match, row-weighted mismatch is `23.15%`, luma-corrected mismatch is `22.57%`, and simple luma correction only gains `-0.58%p`.
- RESULT: `coc-background-size-actual` stays rejected for YSHY/CoC: background-size tuning worsens YSHY row raster (`+1.38%p` weighted, `+8.36%p` worst row), so do not retry background-size as the next fix.
- RESULT: Les-Oublies is separated as `BACKGROUND_DECLARATION_DIFFERS`; it needs exact background declaration/cascade comparison before any pixel-tuned paint CSS.
- RESULT: AW2E is separated as `COLOR_ASSET_RASTER_CONTEXT_REQUIRED`; it must not reuse YSHY/CoC background-size or row-background candidates.
- RESULT: `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH` and now reports the background/source probe as evidence.
- VERIFIED: `node --check` for the new script and renderer gate, `diagnose:roll20-chat-background-source`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Build the next YSHY/CoC diagnostic around rendered background raster/source context where CSS declarations match but flat pixels differ.
- STILL TODO P0: Recapture AW2E and Les-Oublies Roll20 chat sidecars with current row/typography/filter fields before cross-fixture renderer decisions.

## 2026-06-20 Codex Update - row compositing probe narrows YSHY/CoC axis

Status: PARTIAL. This adds a diagnostic decomposition report; it does not change production ChatPane defaults and does not prove Roll20 visual parity.

- DONE: Added `scripts/roll20_chat_row_compositing_probe.mjs` and package command `diagnose:roll20-chat-row-compositing`.
- DONE: Wired row-compositing evidence into `gate:roll20-renderer-action`.
- RESULT: The probe splits row mismatch into text/edge, flat background, local darker/brighter, and chroma/color buckets.
- RESULT: YSHY 1BU is classified as `BACKGROUND_COMPOSITING_MODEL_REQUIRED`: row-weighted mismatch `23.15%`, edge mismatch share `0%`, flat paint mismatch share `100%`, local-darker share `63.32%`.
- RESULT: Virtual row luma correction is a weak explanation for YSHY: row-weighted mismatch only moves `23.15% -> 22.57%` (`-0.58%p`). Do not try a simple brightness/filter/luma CSS patch.
- RESULT: This supports the current P0 direction: the next YSHY/CoC candidate should model row background compositing/source context, not text antialiasing, CSS filters, table scale, background-size, or broad typography.
- RESULT: Les-Oublies is `LOCAL_BACKGROUND_TOO_DARK` in this diagnostic, but it remains lower priority and still needs current same-action sidecar recapture before cross-fixture rollout.
- RESULT: AW2E is `COLOR_ASSET_RASTER_MODEL_REQUIRED`, confirming again that chat renderer work is split by template and cannot become a global ChatPane CSS patch.
- RESULT: `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH` and now reports compositing decisions for all three fixtures.
- VERIFIED: `node --check` for the new script and renderer gate, `diagnose:roll20-chat-row-compositing`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Build the next YSHY/CoC row-background/source-context diagnostic candidate and compare it with smoke, candidate comparison, style proof, row raster, row-raster candidate comparison, row compositing, renderer gate, lint, build, and evidence guard.
- STILL TODO P0: Recapture AW2E and Les-Oublies Roll20 chat sidecars with current row/typography/filter fields before making cross-fixture renderer decisions.

## 2026-06-20 Codex Update - row raster candidate comparison gate

Status: PARTIAL. This adds a diagnostic comparison gate; it does not change production ChatPane defaults and does not prove Roll20 visual parity.

- DONE: Added `--report-dir` to `diagnose:roll20-chat-row-raster` so candidate probes no longer overwrite the default row-raster evidence used by `gate:roll20-renderer-action`.
- DONE: Added `scripts/roll20_chat_row_raster_candidate_compare.mjs` and package command `diagnose:roll20-chat-row-raster-candidates`.
- DONE: Wired row-raster candidate comparison into `gate:roll20-renderer-action`.
- RESULT: Default baseline restored: YSHY aligned mismatch `22.33%`, row-weighted mismatch `23.15%`, worst row `5` mismatch `30.89%`.
- RESULT: `paint-dim-background` improves row raster numerically (`23.15% -> 20.51%`, worst row `30.89% -> 27.98%`) but remains blocked because actual Roll20 computed style contradicts it (`filter: none`).
- RESULT: `coc-background-size-actual` is rejected by row raster regression: row-weighted `23.15% -> 24.53%`, worst row `30.89% -> 39.25%` (`+8.36%p`).
- RESULT: `yshy-sanitize-typography` is rejected by row raster regression: row-weighted `23.15% -> 39.03%`, worst row `30.89% -> 55.37%` (`+24.48%p`).
- RESULT: `gate:roll20-renderer-action` reports `chat row raster candidate comparison: compared=7/7, rejected=2, noMeaningfulGain=3` and remains `HOLD_PRODUCTION_RENDERER_PATCH`.
- INTERPRETATION: The next YSHY/CoC P0 should not retry background-size, broad typography, or filter CSS. Build the next candidate around actual row text/background compositing, source/capture context, or a Roll20-specific raster model that also has style proof.
- VERIFIED: `node --check` for changed scripts, `diagnose:roll20-chat-row-raster`, `diagnose:roll20-chat-row-raster-candidates`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Build the next YSHY/CoC row-level renderer candidate from text/background compositing or source/capture context, then run smoke, candidate comparison, style proof, row-raster candidate comparison, renderer gate, lint, build, and evidence guard.
- STILL TODO P0: Recapture AW2E and Les-Oublies Roll20 chat sidecars with current row/typography/filter fields before any cross-fixture renderer rollout.

## 2026-06-20 Codex Update - CoC background-size raster candidate rejected

Status: PARTIAL. This tested a narrow diagnostic candidate; it does not change production ChatPane defaults and does not prove Roll20 visual parity.

- DONE: Added diagnostic-only ChatPane paint policy `coc-background-size-actual`.
- DONE: Added the candidate to `rolltemplate_chat_smoke`, `diagnose:roll20-chat-candidates`, and script docs.
- DONE: Added style-proof handling for the candidate when it becomes relevant.
- RESULT: Candidate smoke PASSed AW2E, Les-Oublies, and YSHY.
- RESULT: Candidate comparison classifies `coc-background-size-actual` as `no-meaningful-gain`: YSHY aligned mismatch moves only `22.33% -> 21.94%` (`-0.39%`), below the `-0.5%` meaningful threshold.
- RESULT: Candidate row-raster probe worsened YSHY's worst row mismatch from default `30.89%` to candidate `39.25%`, even though the overall aligned mismatch moved slightly.
- RESULT: `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH`.
- INTERPRETATION: CoC background-size/table-width raster scale alone does not explain YSHY. The next P0 should inspect row-level text/background compositing or actual capture/source-order context, not promote background-size, filter, or broad typography CSS.
- VERIFIED: `build`, `rolltemplate_chat_smoke --chat-paint-policy coc-background-size-actual`, `diagnose:roll20-chat-candidates`, `diagnose:roll20-chat-candidate-style`, candidate/default `diagnose:roll20-chat-row-raster`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Build the next YSHY/CoC row-level renderer candidate around text/background compositing or source/capture context. Keep `coc-background-size-actual` diagnostic-only and rejected for production.

## 2026-06-20 Codex Update - row raster probe for YSHY/CoC chat

Status: PARTIAL. This adds row-level PNG raster diagnostics; it does not change production ChatPane defaults and does not prove Roll20 visual parity.

- DONE: Added `scripts/roll20_chat_row_raster_probe.mjs` and package command `diagnose:roll20-chat-row-raster`.
- DONE: Wired row raster evidence into `gate:roll20-renderer-action`.
- RESULT: YSHY 1BU is classified as `COC_ROW_RASTER_MODEL_REQUIRED`.
- RESULT: YSHY row-weighted mismatch is `23.15%`; worst row is row `5` with `30.89%` mismatch.
- RESULT: YSHY worst-row signed luma delta is `-27.232`, so the current local row raster is darker than actual Roll20 on the dominant mismatching row.
- RESULT: AW2E is separately classified as `ROW_LUMA_RASTER_MODEL_REQUIRED`, row-weighted mismatch `13.43%`; this confirms the chat renderer still needs split per-template models rather than a global patch.
- RESULT: Les-Oublies remains `RASTER_SECONDARY` in this probe.
- RESULT: `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH`.
- INTERPRETATION: The next YSHY/CoC P0 is a row-level background/text raster experiment using this evidence. Do not promote `paint-dim-background`; it gives a numeric clue but is still contradicted by actual Roll20 `filter: none`.
- VERIFIED: `node --check` for changed scripts, `diagnose:roll20-chat-row-raster`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Build a YSHY/CoC row-level renderer candidate from actual row raster evidence, then run local smoke, candidate comparison, style proof, row raster probe, renderer gate, lint, build, and evidence guard.
- STILL TODO P0: Recapture AW2E and Les-Oublies Roll20 chat sidecars with current row/typography/filter fields before any cross-fixture renderer rollout.

## 2026-06-20 Codex Update - YSHY row/paint/source probe

Status: PARTIAL. This adds a renderer-routing diagnostic; it does not change production ChatPane defaults and does not prove Roll20 visual parity.

- DONE: Added `scripts/roll20_chat_row_paint_source_probe.mjs` and package command `diagnose:roll20-chat-row-paint-source`.
- DONE: Wired the row/paint/source probe into `gate:roll20-renderer-action`.
- DONE: Fixed `roll20_chat_width_reconciliation.mjs` so it reads `chat-row-geometry` decisions from `rowModel.decision`.
- RESULT: New probe classifies YSHY 1BU as `ROW_BAND_RASTER_CONTEXT_REQUIRED`.
- RESULT: YSHY remains high mismatch: aligned mismatch `22.33%`; this work does not improve pixels by itself.
- RESULT: `paint-dim-background` is still numerically useful for YSHY (`-2.48%`) but blocked because actual Roll20 computed style reports `filter: none`.
- RESULT: `yshy-sanitize-typography` is rejected for YSHY (`+14.13%` aligned delta), so simply replaying observed Roll20 typography/sanitize values is not the fix.
- RESULT: `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH`.
- INTERPRETATION: The next YSHY/CoC P0 is a real row-band background/text rasterization plus source-order/capture-context probe around the CoC rolltemplate table. Do not promote filter, broad typography, or direct width CSS.
- VERIFIED: `node --check` for changed scripts, `diagnose:roll20-chat-row-paint-source`, `diagnose:roll20-chat-width-reconciliation`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Build the next YSHY/CoC capture/probe that compares actual row-band background/text rasterization and source-order around the CoC table without using CSS filters.
- STILL TODO P0: Recapture AW2E and Les-Oublies Roll20 chat sidecars with current row/typography/filter fields before making cross-fixture renderer decisions.

## 2026-06-20 Codex Update - YSHY font availability candidates rejected

Status: PARTIAL. This tested narrow YSHY/CoC font-context diagnostics; it does not change production ChatPane defaults and does not prove visual parity.

- DONE: Added diagnostic-only ChatPane font policy `yshy-bookk-unavailable`.
- DONE: Added diagnostic-only typography policies `yshy-table-font-context`, `yshy-bookk-missing-render`, and `yshy-missing-bookk-table-font-context`.
- DONE: Added these candidates to `rolltemplate_chat_smoke`, `diagnose:roll20-chat-candidates`, `diagnose:roll20-chat-candidate-style`, and script docs.
- RESULT: All new candidates rendered rolltemplate chat cards successfully in smoke.
- RESULT: Removing uploaded `BookkMyungjo-Bd` `@font-face` was not enough to mirror actual Roll20 missing-font evidence: local `document.fonts.check()` still returned true for Bookk specs, and the table widened to `1305.578px`.
- RESULT: Forcing missing Bookk rendering also widened the table to `1305.578px`; combining missing Bookk with Proxima table context widened it to `1317.141px`.
- RESULT: Candidate comparison rejects all new font-context candidates: `yshy-bookk-unavailable` `+5.39%` YSHY aligned delta, `yshy-table-font-context` `+2.57%`, `yshy-bookk-table-font-context` `+6.69%`, `yshy-bookk-missing-render` `+5.39%`, `yshy-missing-bookk-table-font-context` `+6.69%`.
- RESULT: `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH`.
- INTERPRETATION: Bookk missing-font simulation is not the YSHY fix. The next P0 should inspect Roll20 chat crop/row-band paint and table source/sanitized CSS ordering beyond font availability, while keeping `paint-dim-background` blocked because actual Roll20 reports `filter: none`.
- VERIFIED: `build`, all new candidate smokes, `diagnose:roll20-chat-candidates`, `diagnose:roll20-chat-candidate-style`, `diagnose:roll20-chat-font-intrinsic`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Build the next YSHY/CoC diagnostic around row-band/crop/background paint or sanitized source ordering, not Bookk font availability.

## 2026-06-20 Codex Update - Font/intrinsic probe split

Status: PARTIAL. This adds a renderer-routing diagnostic; it does not change production ChatPane defaults and does not prove visual parity.

- DONE: Added `scripts/roll20_chat_font_intrinsic_probe.mjs` and package command `diagnose:roll20-chat-font-intrinsic`.
- DONE: Wired the font/intrinsic probe into `gate:roll20-renderer-action` so the gate now reports combined font availability, table font-family, text-width residual, intrinsic-width, overflow/crop, and width-override evidence.
- RESULT: AW2E is now explicitly routed to `TEXT_METRIC_WIDTH_MODEL`: table delta `+15.744px`, measured text delta `+15.602px`, residual `+0.142px`, font availability unchanged.
- RESULT: Les-Oublies remains `WIDTH_SECONDARY`: table delta `+0.8px`.
- RESULT: YSHY is now explicitly routed to `FONT_FACE_INTRINSIC_MODEL_REQUIRED`: table delta `-24.309px`, measured text delta `-54.946px`, residual `+30.637px`, font availability changed, table font-family changed, direct width override candidates have `NO_GAIN`.
- RESULT: `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH`.
- INTERPRETATION: The next YSHY/CoC P0 is not another width/overflow CSS candidate. It should mirror Roll20 font-face availability/order first, then measure table min-content/intrinsic sizing under that font context.
- VERIFIED: `node --check` for the new script and renderer gate, `diagnose:roll20-chat-font-intrinsic`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Build a YSHY/CoC diagnostic candidate that suppresses or reorders the relevant local `BookkMyungjo-Bd` font-face availability to match actual Roll20, then rerun rolltemplate chat smoke, candidate comparison, font/intrinsic probe, renderer gate, lint, build, and evidence guard.

## 2026-06-20 Codex Update - CoC overflow/crop candidate rejected

Status: PARTIAL. This tested the first YSHY/CoC overflow-crop candidate; it does not change production ChatPane defaults and does not prove visual parity.

- DONE: Added diagnostic-only ChatPane geometry policy `coc-overflow-crop-model`.
- DONE: Inserted the diagnostic override CSS after user rolltemplate CSS so this candidate tests the post-user cascade path instead of losing to the uploaded sheet CSS.
- DONE: Added the candidate to `rolltemplate_chat_smoke`, `diagnose:roll20-chat-candidates`, `diagnose:roll20-chat-candidate-style`, and script docs.
- RESULT: Candidate smoke PASSed all three prepared fixtures.
- RESULT: The candidate did not change YSHY used table width: local table stayed `1272.859px` even with post-user `width: 1248.55px !important`, `max-width: 1248.55px !important`, `border-spacing: 0`, and `overflow-wrap: break-word`.
- RESULT: Candidate comparison classifies `coc-overflow-crop-model` as `no-meaningful-gain`: YSHY remains raw `26.45%`, aligned `22.33%`, delta `0%`.
- RESULT: `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH`.
- INTERPRETATION: The remaining YSHY width/crop mismatch is not fixed by width/overflow declarations alone. The next P0 should inspect Roll20 table intrinsic/min-content calculation and font-face availability/order for the CoC template, especially why actual Roll20 computes a narrower used table despite matching root width.
- VERIFIED: `build`, `rolltemplate_chat_smoke --chat-geometry-policy coc-overflow-crop-model`, `diagnose:roll20-chat-candidates`, `diagnose:roll20-chat-candidate-style`, `diagnose:roll20-chat-overflow-crop`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Build the next YSHY/CoC diagnostic around font-face availability/order plus table min-content/intrinsic sizing. Do not promote `coc-overflow-crop-model`.

## 2026-06-20 Codex Update - YSHY overflow/crop probe

Status: PARTIAL. This adds another diagnostic layer for Roll20 chat parity; it does not change production ChatPane CSS and does not prove visual parity.

- DONE: Added `scripts/roll20_chat_overflow_crop_probe.mjs` and package command `diagnose:roll20-chat-overflow-crop`.
- DONE: Wired the overflow/crop probe into `gate:roll20-renderer-action` so renderer decisions now include table overflow, table-to-crop ratio, scroll/client width, crop/top-offset, and best current candidate evidence.
- RESULT: AW2E is still `MESSAGE_WIDTH_MODEL`: table delta `+15.744px`, overflow delta `0px`, table-to-crop delta `+0.00105`, top offset `+184.178px`. Do not route AW2E through YSHY-style table overflow work.
- RESULT: Les-Oublies remains `WIDTH_SECONDARY`: table delta `+0.8px`, overflow delta `0px`, table-to-crop delta `+0.003`.
- RESULT: YSHY is now classified as `TABLE_OVERFLOW_CROP_MODEL_REQUIRED`: table delta `-24.309px`, overflow delta `0px`, table-to-crop delta `-0.09104`, top offset `+125.884px`.
- RESULT: `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH`; next YSHY work must be a CoC/YSHY-scoped overflow/crop candidate from actual table scroll/client width and rolltemplate crop origin, not paint filters or broad typography.
- VERIFIED: `node --check` for the new script and renderer gate, `diagnose:roll20-chat-overflow-crop`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Build the narrow CoC/YSHY overflow/crop diagnostic candidate, then run chat smoke, candidate comparison, style proof, renderer gate, lint, build, and evidence guard before any production renderer change.

## 2026-06-20 Codex Update - YSHY live filter sidecar recapture

Status: PARTIAL. This updates local-only Roll20 chat evidence for YSHY; it does not change production ChatPane CSS and does not prove visual parity.

- DONE: Claimed the existing Chrome Roll20 verification editor tab in read-only mode and confirmed the live YSHY `.sheet-rolltemplate-coc` chat DOM exposes computed `filter` values.
- DONE: Added `latestTemplate.computedStyle.filter`, `table.computedStyle.filter`, and sampled child `filter` fields to the ignored local YSHY Roll20 chat sidecar from live Roll20 DOM evidence.
- DONE: Restored `roll20-chat.png` from the matching prior DPR-corrected YSHY recapture candidate after a browser screenshot-scale probe produced a mismatched temporary capture. The final PNG is back to `267x586`.
- RESULT: `status:roll20-actual` moved `chatCurrentMetrics` from `0/3` to `1/3`; remaining missing current filter fields are `official-roll20-AW2E` and `official-roll20-Les-Oublies`.
- RESULT: YSHY chat parity returned to the prior authoritative baseline: raw mismatch `26.45%`, aligned mismatch `22.33%`, crop/scale/pixel suspects `0`.
- RESULT: `paint-dim-background` is no longer blocked by missing YSHY sidecar fields; it is now contradicted by actual Roll20 style for YSHY because actual Roll20 reports `filter: none`.
- RESULT: `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH`; no paint/rasterization CSS should be promoted.
- VERIFIED: `roll20_actual_screenshot_diff`, `diagnose:roll20-chat-parity`, `status:roll20-actual`, `diagnose:roll20-chat-candidate-style`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Recapture AW2E and Les-Oublies Roll20 chat sidecars with computed `filter` fields from their own live Roll20 roll actions.
- STILL TODO P0: Build the next YSHY/CoC model around table intrinsic/width/overflow behavior, not a CSS paint filter.

## 2026-06-20 Codex Update - YSHY paint filter proof gate

Status: PARTIAL. This improves the renderer gate for YSHY paint/rasterization candidates; it does not change production ChatPane CSS.

- DONE: Split `paint-dim-background` into diagnostic sub-candidates `paint-dim-brightness` and `paint-dim-saturate`.
- DONE: Added computed `filter` capture to local ChatPane smoke and Roll20 chat capture snippets.
- DONE: Added paint/filter style proof for `paint-dim-background`, `paint-dim-brightness`, and `paint-dim-saturate`.
- DONE: Updated `plan:roll20-chat-capture` and `status:roll20-actual` so current chat DOM sidecars must include `latestTemplate.computedStyle.filter` and `table.computedStyle.filter`.
- RESULT: `paint-dim-brightness` and `paint-dim-saturate` are `no-meaningful-gain`; YSHY remains `22.33%`.
- RESULT: `paint-dim-background` remains the only current YSHY pixel-improving paint candidate: YSHY `22.33% -> 19.85%`, delta `-2.48%`, no fixture regressions.
- RESULT: `paint-dim-background` is now blocked by style proof as `NEEDS_NEW_SIDECAR_FIELDS` because existing actual Roll20 sidecars do not contain computed `filter` fields. This prevents a false production promotion.
- RESULT: `status:roll20-actual` now reports `chatCurrentMetrics=0/3`, missing `latestTemplate.computedStyle.filter` and `table.computedStyle.filter` for all three fixtures.
- RESULT: `gate:roll20-renderer-action` still returns `HOLD_PRODUCTION_RENDERER_PATCH` and now includes the missing paint-filter sidecar blocker.
- VERIFIED: paint candidate smokes, `diagnose:roll20-chat-candidates`, `diagnose:roll20-chat-candidate-style`, `plan:roll20-chat-capture -- --all --require-current-metrics`, `status:roll20-actual`, `gate:roll20-renderer-action`, `lint`, `build`, and evidence guard.
- STILL TODO P0: Recapture actual Roll20 chat DOM sidecars with computed `filter` fields before any paint/rasterization candidate can be considered for production renderer behavior.

## 2026-06-20 Codex Update - YSHY crop-origin candidate rejected

Status: PARTIAL. This tested the next YSHY/CoC crop/table interaction hypothesis; it does not change production ChatPane CSS.

- DONE: Added diagnostic-only ChatPane geometry policy `coc-crop-origin-y20`.
- DONE: Added candidate comparison rows for `coc-crop-origin-y20`, `coc-table-actual-width-dim-background`, and `coc-crop-origin-y20-dim-background`.
- DONE: Updated candidate selection tie-breakers in width reconciliation, table-width budget, and table-intrinsic probe so equally scoring composite candidates do not displace the simpler candidate.
- RESULT: `coc-crop-origin-y20` is `no-meaningful-gain`: YSHY remains `22.33%` aligned mismatch, delta `0%`.
- RESULT: `coc-table-actual-width-dim-background` and `coc-crop-origin-y20-dim-background` match `paint-dim-background` exactly: YSHY `19.85%`, delta `-2.48%`, no added gain from table-width or y-origin changes.
- RESULT: The current best YSHY diagnostic candidate remains `paint-dim-background`; table actual-width and simple y-origin crop offset are not the missing model.
- RESULT: `gate:roll20-renderer-action` still returns `HOLD_PRODUCTION_RENDERER_PATCH`.
- VERIFIED: chat smoke for the new candidates, `diagnose:roll20-chat-candidates`, `diagnose:roll20-chat-table-width-budget`, `diagnose:roll20-chat-width-reconciliation`, `diagnose:roll20-chat-table-intrinsic-probe`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Move the next YSHY/CoC probe away from table-width/y-offset hacks. Investigate paint/background/rasterization and actual Roll20 user CSS activation around the CoC template before any production CSS.

## 2026-06-20 Codex Update - YSHY table intrinsic probe

Status: PARTIAL. This adds the next YSHY/CoC routing diagnostic; it does not change production ChatPane CSS.

- DONE: Added `scripts/roll20_chat_table_intrinsic_probe.mjs` and package command `diagnose:roll20-chat-table-intrinsic-probe`.
- DONE: Wired the probe report into `gate:roll20-renderer-action` so the gate now reports root/table/scroll/caption/first-cell deltas, row spread, max cell delta, uniform top offset, best current candidate, and next action.
- RESULT: AW2E is classified as `ROOT_OR_MESSAGE_WIDTH_CONTEXT`: root delta `+12px`, table delta `+15.744px`, scroll delta `+16px`. Do not route AW2E through a table-intrinsic patch first.
- RESULT: Les-Oublies is `WIDTH_SECONDARY`: table delta only `+0.8px`; keep it out of the next P0 width patch.
- RESULT: YSHY is classified as `TABLE_WIDE_INTRINSIC_WITH_CROP_OFFSET`: root delta `0px`, table delta `-24.309px`, scroll delta `-24px`, row spread `0px`, max cell delta `+0.909px`, uniform top offset `+125.884px`.
- RESULT: For YSHY, the next P0 is a CoC/YSHY-scoped table intrinsic width plus rolltemplate crop/top-origin probe. Transform, global font, broad typography, and spacing bundles remain rejected or contradicted.
- RESULT: `gate:roll20-renderer-action` still returns `HOLD_PRODUCTION_RENDERER_PATCH`.
- VERIFIED: `diagnose:roll20-chat-table-intrinsic-probe` and `gate:roll20-renderer-action`.
- STILL TODO P0: Build the next diagnostic candidate around YSHY/CoC table intrinsic width plus crop/top-origin context, then run chat smoke, candidate comparison, style proof, renderer gate, lint, and build before any production renderer change.

## 2026-06-20 Codex Update - YSHY table-width budget

Status: PARTIAL. This sharpens the YSHY/CoC next renderer axis; it does not change production ChatPane CSS.

- DONE: Added `scripts/roll20_chat_table_width_budget.mjs` and package command `diagnose:roll20-chat-table-width-budget`.
- DONE: Wired the budget report into `gate:roll20-renderer-action` so the gate now reports table delta, measureText delta, residual, rejected axes, and the next table-width action.
- RESULT: AW2E is classified as `MESSAGE_CONTENT_WIDTH_BUDGET`: table delta `+15.744px`, text delta `+15.602px`, residual `+0.142px`, best candidate `aw2e-message-full-width`.
- RESULT: Les-Oublies is `WIDTH_SECONDARY`: table delta only `+0.8px`.
- RESULT: YSHY is classified as `LAYOUT_CONSTRAINT_AFTER_REJECTED_CSS`: table delta `-24.309px`, measureText table delta `-54.946px`, residual `+30.637px`.
- RESULT: For YSHY, broad font/typography, spacing/letter, and transform/scale axes are already rejected or contradicted. The next P0 is a table-layout/intrinsic constraint probe, not another font or global width CSS candidate.
- RESULT: `gate:roll20-renderer-action` still returns `HOLD_PRODUCTION_RENDERER_PATCH`.
- VERIFIED: `diagnose:roll20-chat-table-width-budget` and `gate:roll20-renderer-action`.
- STILL TODO P0: Build a YSHY/CoC scoped table-layout/intrinsic constraint probe from actual table scroll/client/text residual evidence.

## 2026-06-20 Codex Update - AW2E message-shell candidate

Status: PARTIAL. This replaces the best AW2E explanation candidate with a narrower diagnostic; it still does not enable production ChatPane CSS.

- DONE: Added diagnostic-only ChatPane geometry policy `aw2e-message-full-width`, scoped to chat cards containing `.sheet-rolltemplate-aw` via `:has(...)`.
- DONE: Added the candidate to local chat smoke, candidate comparison, candidate style proof, and script docs.
- RESULT: `aw2e-message-full-width` matches the prior `aw2e-root-width-actual` pixel gain without touching Les/YSHY: AW2E aligned mismatch delta `-7.63%`, Les `0%`, YSHY `0%`, mean delta `-2.54%`, regressions `0`.
- RESULT: Style proof now classifies it as `STYLE_COMPATIBLE_NEEDS_PIXEL_REVIEW`: AW2E local/actual chat and message width both match `340px`; Les/YSHY are `STYLE_NEUTRAL` because their message width remains matching actual Roll20.
- RESULT: `diagnose:roll20-chat-width-reconciliation` now selects `aw2e-message-full-width` as AW2E's best candidate instead of the harder-coded `aw2e-root-width-actual`.
- RESULT: `gate:roll20-renderer-action` still returns `HOLD_PRODUCTION_RENDERER_PATCH`; the candidate is not a public/product default because other fixtures still require different renderer axes.
- VERIFIED: `rolltemplate-chat-smoke-aw2e-message-full-width`, `diagnose:roll20-chat-candidates`, `diagnose:roll20-chat-candidate-style`, `diagnose:roll20-chat-width-reconciliation`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Convert the diagnostic into a generic message/content-width rule only after proving the rule is not AW2E-specific and after YSHY table intrinsic work no longer conflicts.

## 2026-06-20 Codex Update - chat message shell model

Status: PARTIAL. This adds a narrower diagnostic for AW2E chat width; it does not enable production ChatPane CSS.

- DONE: Added `scripts/roll20_chat_message_shell_model.mjs` and package command `diagnose:roll20-chat-message-shell`.
- DONE: Wired the message-shell report into `gate:roll20-renderer-action` so renderer decisions now include message width, content/template width, chat-right gutter, and actual message shell model evidence.
- RESULT: AW2E is isolated as `MESSAGE_CONTENT_WIDTH_MODEL_REQUIRED`: actual Roll20 uses `FULL_CHAT_WIDTH_MESSAGE`, with message width delta `+12px` and content/template width delta `+12px`.
- RESULT: Les-Oublies and YSHY are now `MESSAGE_SHELL_SECONDARY`; their message width delta is `0px`, so their remaining mismatch should not be "fixed" by a global message width patch.
- RESULT: `gate:roll20-renderer-action` still returns `HOLD_PRODUCTION_RENDERER_PATCH`; the next AW2E task is a per-template message/content width model, while YSHY stays on table scroll/intrinsic sizing.
- VERIFIED: default `rolltemplate_chat_smoke` 3/3 PASS, `diagnose:roll20-chat-width`, `diagnose:roll20-chat-message-shell`, `diagnose:roll20-chat-width-reconciliation`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Build a generic Roll20 message/content-width rule or candidate that explains AW2E without changing Les/YSHY globally; do not expose diagnostic candidates in public UI.

## 2026-06-20 Codex Update - chat message/content width split

Status: PARTIAL. This sharpens the next renderer model; it does not enable production ChatPane CSS.

- DONE: Added diagnostic `roll20-chat-shell-width-340` policy and regenerated local browser chat smoke for it.
- DONE: `rolltemplate_chat_smoke` now records local message rect/style evidence so candidate style proof can compare local message width against actual Roll20 sidecars.
- DONE: `diagnose:roll20-chat-width` now distinguishes `CHAT_MESSAGE_CONTENT_WIDTH_MODEL_REQUIRED` before table-width work when message width and template width move together.
- RESULT: AW2E is now classified as `CHAT_MESSAGE_CONTENT_WIDTH_MODEL_REQUIRED`; actual message width/template content explains the root-width mismatch better than a table-only model.
- RESULT: The broad `roll20-chat-shell-width-340` candidate is rejected: mean delta `-2.07%` but `2` fixture regressions, so do not widen the global ChatPane shell.
- RESULT: `diagnose:roll20-chat-width-reconciliation` now routes AW2E to `CHAT_MESSAGE_CONTENT_WIDTH`, Les-Oublies to `KEEP_DEFAULT`, and YSHY 1BU to `TABLE_SCROLL_INTRINSIC`.
- RESULT: `gate:roll20-renderer-action` still returns `HOLD_PRODUCTION_RENDERER_PATCH`, now with the clearer blocker that global shell width regresses other fixtures.
- VERIFIED: `rolltemplate-chat-smoke-roll20-chat-shell-width-340`, `diagnose:roll20-chat-width`, `diagnose:roll20-chat-candidates`, `diagnose:roll20-chat-candidate-style`, `diagnose:roll20-chat-width-reconciliation`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Build a per-template/message-context width model that can reproduce AW2E's Roll20 content width without changing Les/YSHY shells globally. Continue YSHY on table intrinsic/crop/paint context.

## 2026-06-20 Codex Update - AW2E root-width renderer candidate

Status: PARTIAL. This adds and validates diagnostic-only renderer candidates; it does not change the default product ChatPane renderer.

- DONE: Added diagnostic ChatPane policies `aw2e-root-width-actual`, `aw2e-font-size-only`, `coc-table-actual-width`, and `coc-table-intrinsic-clamp`. They are only enabled through smoke-script localStorage policies and are not exposed in the UI.
- DONE: Regenerated browser smoke evidence for the new candidates:
  - `rolltemplate-chat-smoke-aw2e-root-width-actual`
  - `rolltemplate-chat-smoke-aw2e-font-size-only`
  - `rolltemplate-chat-smoke-coc-table-actual-width`
  - `rolltemplate-chat-smoke-coc-table-intrinsic-clamp`
- RESULT: `aw2e-root-width-actual` is the first current chat candidate with both meaningful AW2E pixel gain and style proof: AW2E aligned mismatch improved from `13.5%` to `5.87%` (`-7.63%`), with no fixture regressions, and actual/style proof reports root width `279px` vs local candidate `279px`, transform `none`.
- RESULT: `aw2e-font-size-only` is not enough by itself (`-0.47%` AW2E only). The useful axis is root/template width, not just font size.
- RESULT: `coc-table-actual-width` and `coc-table-intrinsic-clamp` produced no YSHY gain. YSHY remains blocked by table/crop/paint/intrinsic context rather than a direct width CSS clamp.
- RESULT: `gate:roll20-renderer-action` still returns `HOLD_PRODUCTION_RENDERER_PATCH`; the surviving AW2E candidate is fixture-scoped and must be generalized into a Roll20-like rolltemplate root intrinsic-width model before any product default change.
- VERIFIED: `build`, candidate browser smokes, `diagnose:roll20-chat-candidates`, `diagnose:roll20-chat-candidate-style`, `diagnose:roll20-chat-width-reconciliation`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Replace the hardcoded AW2E `279px` diagnostic with a generic rolltemplate root intrinsic-width model, then re-run candidate comparison/style proof/gate. Continue YSHY with crop/paint/overflow context; direct table width probes failed.

## 2026-06-20 Codex Update - chat width reconciliation gate

Status: PARTIAL. This chooses the next renderer experiment axis from current evidence; it does not change production ChatPane rendering yet.

- DONE: Added `scripts/roll20_chat_width_reconciliation.mjs` and package command `diagnose:roll20-chat-width-reconciliation`.
- DONE: Wired the reconciliation report into `gate:roll20-renderer-action` so the gate now prints fixture-specific next experiments after chat width/intrinsic/font/row diagnostics.
- RESULT: The next renderer work is now split by evidence instead of guesswork:
  - `official-roll20-AW2E`: `TEXT_METRIC_ALLOCATION`, because table width delta `+15.744px` is explained by exact text metrics with residual `+0.142px`.
  - `yshy-commission-1bu`: `TABLE_SCROLL_INTRINSIC`, because table delta is `-24.309px`, scroll delta is `-24px`, and text residual is overconstrained at `+30.637px`.
  - `official-roll20-Les-Oublies`: `KEEP_DEFAULT` for now because aligned mismatch is `6.34%`, below the high-mismatch threshold.
- RESULT: `gate:roll20-renderer-action` still returns `HOLD_PRODUCTION_RENDERER_PATCH`; no global width/padding/font CSS is safe.
- VERIFIED: `diagnose:roll20-chat-width-reconciliation`, `gate:roll20-renderer-action`, and `status:roll20-actual`.
- STILL TODO P0: Build an AW2E-scoped exact text/cell allocation candidate and a YSHY/CoC-scoped table scroll/intrinsic probe, then run candidate comparison, style proof, renderer gate, lint, and build before any production renderer change.

## 2026-06-20 Codex Update - Roll20 chat current-metrics normalization

Status: PARTIAL. This removes stale-evidence false blockers and exposes the real renderer work; it does not solve chat visual parity.

- DONE: `status:roll20-actual` and `plan:roll20-chat-capture` can now treat legacy actual Roll20 sidecars as current when `latestTemplate.computedChildren` already contains measured table `boxMetrics` and style evidence. The normalized field is marked as `legacy-computedChildren`, not as a fresh recapture.
- DONE: `diagnose:roll20-chat-intrinsic-width` now preserves `tableStructure.table` instead of dropping it, so table `scrollWidth/clientWidth/overflow` deltas are available.
- DONE: `plan:roll20-chat-capture` now uses `captureDprCorrection.cssClip` when judging screenshot scale. This removes the Les-Oublies false `SCALE_OR_FORMAT_SUSPECT` warning for its DPR-corrected template crop.
- RESULT: `chatCurrentMetrics` moved from `1/3` to `3/3`; `chatCurrentMetricsMissing=0`; `chatCaptureSuspects=0`; capture plan reports AW2E, Les-Oublies, and YSHY as `PRESENT`.
- RESULT: Renderer action still correctly stays `HOLD_PRODUCTION_RENDERER_PATCH`; current blockers are now true renderer/model blockers, not stale evidence blockers.
- RESULT: Intrinsic model is sharper: AW2E table `scrollDelta=+16px`, Les intrinsic width remains secondary, and YSHY is now `TABLE_SCROLL_INTRINSIC_MODEL_REQUIRED` with `scrollDelta=-24px`.
- VERIFIED: `node --check` for changed scripts, `status:roll20-actual`, `plan:roll20-chat-capture -- --all --require-current-metrics`, `diagnose:roll20-chat-intrinsic-width`, `diagnose:roll20-chat-parity`, `diagnose:roll20-chat-rows`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Build narrow renderer diagnostics/patch candidates from the now-current evidence: AW2E exact cell/text allocation, Les-Oublies shadow/border/crop paint, and YSHY table scroll/intrinsic width. Do not ship a global ChatPane CSS patch.

## 2026-06-20 Codex Update - YSHY Roll20 chat DPR recapture corrected

Status: PARTIAL. This fixes a bad evidence capture and keeps renderer CSS blocked; it does not solve Roll20 visual parity.

- DONE: Confirmed the latest YSHY `roll20-chat.png` had captured the Roll20 Sandbox Tools panel, not the `.sheet-rolltemplate-coc` card. The earlier `98.57%` chat mismatch was therefore bad evidence, not a renderer conclusion.
- DONE: Hardened `scripts/roll20_chat_parity_diagnostics.mjs` so a sidecar that records an uncorrected CSS clip with CDP `scale=1` is marked as crop-geometry suspect.
- DONE: Recaptured YSHY in the dedicated Roll20 verification editor with a DPR-multiplied CDP clip, downscaled it to the CSS template size, and updated the ignored local sidecar with `captureDprCorrection.applied=true`.
- RESULT: `diagnose:roll20-chat-parity` now returns `HIGH_MISMATCH` with `actualCropGeometrySuspect=0`; YSHY aligned mismatch is now authoritative at `22.33%` (`26.45%` raw), not the false `98.57%`.
- RESULT: `status:roll20-actual` is back to `GENERATED_ACTUAL_SCREENSHOTS_DIFFED`, `generatedAuthoritative=YES`, `chatCaptureSuspects=0`, `rendererReady=NO`.
- RESULT: Current row/tableStructure sidecars are `1/3` current. YSHY is current; AW2E and Les-Oublies still need same-action Roll20 chat recapture because they are missing `latestTemplate.tableStructure`.
- VERIFIED: `node --check scripts\roll20_chat_parity_diagnostics.mjs`, `roll20_actual_screenshot_diff`, `diagnose:roll20-chat-parity`, `diagnose:roll20-chat-intrinsic-width`, `status:roll20-actual`, `gate:roll20-renderer-action`, and `plan:roll20-chat-capture -- --all --require-current-metrics`.
- STILL TODO P0: Recapture AW2E and Les-Oublies actual Roll20 chat PNG + DOM sidecars with the current tableStructure probe before tuning ChatPane renderer CSS.
- STILL TODO P0: Keep `HOLD_PRODUCTION_RENDERER_PATCH`; current authoritative chat high mismatch is still `2/3` and candidate families remain split.

## 2026-06-20 Codex Update - Roll20 chat tableStructure evidence gate

Status: PARTIAL. This makes Roll20 chat/table intrinsic-width evidence stricter; it does not solve visual parity yet.

- DONE: Local ChatPane rolltemplate smoke now records `templateComputed.tableStructure`, including table box metrics, colgroup/col summaries, and longest-token text profile.
- DONE: Roll20 chat capture plan snippets now record the same `latestTemplate.tableStructure` shape for future actual Roll20 sidecars.
- DONE: `status:roll20-actual` and `gate:roll20-renderer-action` now treat missing `latestTemplate.tableStructure` as stale current metrics.
- RESULT: Current actual Roll20 chat sidecars are no longer considered current for table intrinsic-width work: `chatCurrentMetrics=0/3`, missing `latestTemplate.tableStructure` for AW2E, Les-Oublies, and YSHY 1BU.
- RESULT: Renderer action remains `HOLD_PRODUCTION_RENDERER_PATCH`, now with an explicit blocker requiring same-action Roll20 chat screenshot + DOM sidecar recapture before tuning ChatPane CSS.
- VERIFIED: `node --check` for changed scripts, `test:roll20-chat-capture-plan`, local `rolltemplate_chat_smoke` 3/3 PASS, `plan:roll20-chat-capture -- --all --require-current-metrics`, `diagnose:roll20-chat-intrinsic-width`, `diagnose:roll20-chat-font-glyph`, `diagnose:roll20-chat-rows`, `status:roll20-actual`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Recapture actual Roll20 chat sidecars with the new tableStructure probe, then rerun screenshot diff and renderer gate before any production renderer CSS change.

## 2026-06-20 Codex Update - Roll20 chat row geometry gate evidence

Status: PARTIAL. This improves the Roll20 renderer gate and next-action routing, but does not prove actual Roll20 visual parity.

- DONE: Fixed `scripts/roll20_chat_row_geometry_compare.mjs` so actual Roll20 table evidence is read from `computedChildren` when the sidecar does not expose the older `elements` array.
- DONE: Added row-geometry classification for chat rolltemplate evidence and wired it into `scripts/roll20_renderer_action_gate.mjs`.
- RESULT: Current row geometry split on `reports\roll20-actual-compare\2026-06-18-state-map-v1` is fixture-specific, not a single global CSS fix:
  - `official-roll20-AW2E`: `CELL_ALLOCATION_WITH_UNIFORM_OFFSET`
  - `official-roll20-Les-Oublies`: `UNIFORM_OFFSET_PAINT_OR_CROP`
  - `yshy-commission-1bu`: `TABLE_WIDE_WIDTH_WITH_UNIFORM_OFFSET`
- RESULT: `gate:roll20-renderer-action` still returns `HOLD_PRODUCTION_RENDERER_PATCH`, now with row-geometry evidence included in the blocker report and next actions.
- VERIFIED: `node --check scripts\roll20_chat_row_geometry_compare.mjs`, `node --check scripts\roll20_renderer_action_gate.mjs`, `corepack pnpm run diagnose:roll20-chat-rows -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `corepack pnpm run gate:roll20-renderer-action -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `corepack pnpm run lint`, and `corepack pnpm run build`.
- STILL TODO P0: Do not ship a global ChatPane width/padding/font patch. Follow the split next actions: AW2E needs cell allocation/exact text metrics, Les needs crop/shell/paint context, and YSHY needs table-wide intrinsic width or source rolltemplate structure modeling.

## 2026-06-20 Codex Update - edit/preview UI labels and design CSS roundtrip fixed

Status: PARTIAL. This improves edit-mode usability and export/re-import stability, but does not prove actual Roll20 visual parity.

- DONE: Cleaned main mode labels/tooltips so users see `편집`, `분할`, `블록`, and `미리보기` instead of awkward or unclear wording.
- DONE: Cleaned preview toolbar labels/tooltips for sheet width, zoom, background mode, and legacy CSS toggle.
- DONE: Cleaned shared layer role labels in `lib/editor/layerRoles.ts`; role badges now use `프레임`, `흐름`, `표`, `입력`, `버튼`, `텍스트`, `이미지`, `런타임`, and `노드`.
- DONE: Changed editor-generated design classes from unprefixed `r20-node-*` to stable `sheet-r20-node-*` so moved-object CSS does not drift after export/re-import.
- RESULT: `smoke:imported-edit-sync` now PASSes all prepared fixtures again: edit position, preview position, emitted position CSS, flow insert, free insert, layer reorder where available, and re-import stability.
- RESULT: `smoke:preview-edit-visual` still PASSes all prepared fixtures: AW2E `1.87%`, Les-Oublies `2.07%`, YSHY 1BU `1.02%` local preview/edit mismatch.
- VERIFIED: `corepack pnpm run lint`, `corepack pnpm run build`, `corepack pnpm run smoke:preview-edit-visual -- --out-dir ./out --report-dir reports/preview-edit-visual`, and `corepack pnpm run smoke:imported-edit-sync -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/imported-edit-sync`.
- NOTE: A raw `corepack pnpm exec tsc --noEmit --pretty false` still fails on pre-existing test/import configuration issues outside this batch; `next build` TypeScript check passes.
- STILL TODO P0: Continue actual Roll20 renderer parity work; current production renderer gate remains blocked by prior `HOLD_PRODUCTION_RENDERER_PATCH` evidence.

## 2026-06-20 Codex Update - YSHY sanitize typography candidate rejected

Status: PARTIAL. A plausible YSHY sanitize/font-activation candidate was tested and rejected; do not promote it.

- DONE: Added diagnostic-only `yshy-sanitize-typography` ChatPane policy scoped to `.sheet-rolltemplate-coc`.
- DONE: The candidate applies actual Roll20-observed typography/wrapping/border-spacing values: Proxima stack, `13.65px`, `letter-spacing: normal`, `overflow-wrap: break-word`, and `border-spacing: 0`.
- DONE: Added the candidate to `scripts/roll20_chat_candidate_compare.mjs` and documented the smoke command in `scripts/README.md`.
- RESULT: Candidate smoke PASSed all three fixtures, proving the probe renders.
- RESULT: Candidate comparison rejected it hard: `risk=reject-regresses-fixtures`, mean delta `+4.71%`, YSHY aligned mismatch worsened from `21.02%` to `35.14%` (`+14.12%`).
- RESULT: `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH` and now lists `yshy-sanitize-typography` among rejected candidates.
- VERIFIED: `node --check` for changed scripts, `lint`, `build`, `rolltemplate_chat_smoke` for the new candidate, `diagnose:roll20-chat-candidates`, `diagnose:roll20-chat-candidate-style`, `diagnose:roll20-chat-intrinsic-width`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Stop testing broad observed-style bundles for YSHY. Next probe should isolate table intrinsic/max-content calculation or source rolltemplate structure, because combined sanitize typography makes pixels worse.

## 2026-06-20 Codex Update - YSHY table-wide constraint model added

Status: PARTIAL. YSHY chat/template mismatch is now narrowed to a table-wide intrinsic constraint, not cell allocation or transform.

- DONE: Enhanced `scripts/roll20_chat_intrinsic_width_model.mjs` with a `constraintModel` that checks row-width uniformity, max cell delta, row/cell content parity, CSS metric candidate rejection, and transform contradiction.
- DONE: Updated `scripts/roll20_renderer_action_gate.mjs` so intrinsic evidence prints `constraint`, `rowSpread`, and `maxCellDelta`.
- RESULT: YSHY now reports `TABLE_WIDE_CONSTRAINT_MODEL_REQUIRED` / `TABLE_WIDE_CONSTRAINT_NOT_TRANSFORM`.
- RESULT: YSHY table width delta is `-24.309px`, row width delta spread is `0px`, and max cell delta is only `0.909px`; row/cell content matches. This means the mismatch is table-wide intrinsic/max-content sizing or sanitize/font activation, not per-cell allocation.
- RESULT: Transform/scale remains blocked by actual Roll20 style proof (`transform:none`) and spacing candidates remain rejected/no-gain.
- RESULT: Les-Oublies is now `INTRINSIC_WIDTH_SECONDARY_OR_ACCEPTABLE`; current P0 should focus on YSHY table-wide constraint and AW2E cell/text metrics.
- VERIFIED: `node --check scripts\roll20_chat_intrinsic_width_model.mjs`, `node --check scripts\roll20_renderer_action_gate.mjs`, `diagnose:roll20-chat-intrinsic-width`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Build a diagnostic probe for Roll20 table intrinsic/max-content sizing and sanitize/font activation, without using transform, global spacing, or broad typography patches.

## 2026-06-20 Codex Update - chat shell geometry center-assumption fixed

Status: PARTIAL. A false YSHY shell-offset diagnosis was removed; renderer parity is still not solved.

- DONE: `scripts/rolltemplate_chat_smoke.mjs` now records the rolltemplate root `getBoundingClientRect()` in local `templateComputed.rect`.
- DONE: `scripts/roll20_chat_shell_geometry.mjs` now computes local table offset from actual root/table rects when available instead of assuming `(rootWidth - tableWidth) / 2`.
- RESULT: Rebuilt default local chat smoke; all three fixtures still PASS.
- RESULT: YSHY table offset changed from the previous false `+502.93px` model to `0px/0px`; the old offset was a diagnostic-script artifact, not Roll20 behavior.
- RESULT: Les-Oublies is now `SHELL_OK_OR_SECONDARY`; its table offset is only `-0.4px/-0.4px`, so shell geometry is not the current primary blocker.
- RESULT: YSHY remains `WIDTH_MODEL_REQUIRED`, but now because table width/intrinsic layout differs (`tableDelta=-24.309px`), not because the local table is anchored hundreds of pixels away.
- RESULT: `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH`; current actual status remains `GENERATED_ACTUAL_SCREENSHOTS_DIFFED`, `generatedAuthoritative=YES`, `chatCaptureSuspects=0`, `rendererReady=NO`.
- VERIFIED: default `rolltemplate_chat_smoke`, `diagnose:roll20-chat-parity`, `diagnose:roll20-chat-candidates`, `diagnose:roll20-chat-shell-geometry`, `diagnose:roll20-chat-width`, `diagnose:roll20-chat-font-glyph`, `diagnose:roll20-chat-mask-strategy`, `gate:roll20-renderer-action`, and `status:roll20-actual --require-actual`.
- STILL TODO P0: Build a YSHY intrinsic/table-width probe from the corrected zero-offset geometry, and avoid any candidate based on the old `502.93px` offset.

## 2026-06-20 Codex Update - AW2E text-metric candidate rejected as no-gain

Status: PARTIAL. Added one safe diagnostic candidate, then rejected it as insufficient evidence for production.

- DONE: Added diagnostic-only `aw2e-text-metrics` ChatPane typography policy. It applies actual Roll20-observed `13.65px` table/cell text metrics only to `.sheet-rolltemplate-aw`.
- DONE: Added the candidate to `scripts/roll20_chat_candidate_compare.mjs` and documented the smoke command in `scripts/README.md`.
- RESULT: `rolltemplate_chat_smoke` PASSed all three fixtures for `reports/rolltemplate-chat-smoke-aw2e-text-metrics`.
- RESULT: Candidate comparison classified `aw2e-text-metrics` as `no-meaningful-gain`: mean aligned delta `-0.13%`, regressions `0`, YSHY delta `0%`.
- RESULT: `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH`; the AW2E text-width split is not enough for a production renderer change.
- VERIFIED: `node --check` for changed scripts, `lint`, `build`, `rolltemplate_chat_smoke` for the new candidate, `diagnose:roll20-chat-candidates`, `diagnose:roll20-chat-candidate-style`, `diagnose:roll20-chat-font-glyph`, and `gate:roll20-renderer-action`.
- STILL TODO P0: For AW2E, inspect sanitize/order/crop/paint evidence rather than only text metrics. For Les, test row/cell paint/allocation masks. For YSHY, model table-layout/wrapping/intrinsic constraints.

## 2026-06-20 Codex Update - chat text-width model split added

Status: PARTIAL. The next renderer blocker is now split by text-width cause instead of one vague font/glyph bucket.

- DONE: Enhanced `scripts/roll20_chat_font_glyph_model.mjs` with a narrow text-width model that compares exact `measureText` deltas against actual table-width deltas.
- DONE: Updated `scripts/roll20_renderer_action_gate.mjs` so the gate prints each fixture's `textWidthModel` and table text residual.
- RESULT: AW2E is now `TEXT_WIDTH_SCALE_MODEL_REQUIRED` / `TEXT_WIDTH_EXPLAINS_TABLE_WIDTH`; table text residual is only `+0.142px`, so the table width is almost fully explained by measured text width.
- RESULT: Les-Oublies is `TEXT_MEASUREMENT_DELTA_MODEL_REQUIRED` / `TEXT_WIDTH_SECONDARY_TO_PAINT_OR_CELL_ALLOCATION`; table delta is only `+0.8px`, so width is not the main blocker.
- RESULT: YSHY is `TEXT_WIDTH_LAYOUT_CONSTRAINT_MODEL_REQUIRED` / `TEXT_WIDTH_OVERCONSTRAINED_BY_LAYOUT`; table text residual is `+30.637px`, so font/width CSS alone would be unsafe.
- RESULT: `gate:roll20-renderer-action` still correctly returns `HOLD_PRODUCTION_RENDERER_PATCH`.
- VERIFIED: `node --check scripts\roll20_chat_font_glyph_model.mjs`, `node --check scripts\roll20_renderer_action_gate.mjs`, `diagnose:roll20-chat-font-glyph`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Build fixture/template-specific candidate probes from these split decisions: AW2E exact text metrics, Les row/cell paint or allocation masks, YSHY table-layout/wrapping/intrinsic constraints.

## 2026-06-20 Codex Update - DPR-corrected chat crop gate fixed

Status: PARTIAL. Roll20 chat evidence is now authoritative again, but renderer parity is still blocked by real local-vs-Roll20 template differences.

- DONE: Fixed `scripts/roll20_chat_parity_diagnostics.mjs` so DPR-corrected template-only PNGs use `captureDprCorrection.cssClip` instead of stale broad `#textchat`/sidebar clip metadata.
- RESULT: `diagnose:roll20-chat-parity` now reports `actualTemplatePixelSuspect=0` and `actualCaptureScaleSuspect=0`.
- RESULT: `status:roll20-actual` returned to `GENERATED_ACTUAL_SCREENSHOTS_DIFFED`, with `generatedAuthoritative=YES`, `chatCaptureSuspects=0`, `chatNeedsNormalizedCapture=0`, `chatCurrentMetrics=3/3`, and `rendererReady=NO`.
- RESULT: Current authoritative chat mismatch is still high for 2/3 fixtures: AW2E aligned `13.5%`, Les-Oublies aligned `6.34%`, YSHY aligned `21.02%`.
- RESULT: `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH`, now for actual renderer-model reasons rather than suspect capture evidence.
- RESULT: Current split: AW2E and YSHY need table/intrinsic/text-width modeling; Les-Oublies is now width-secondary and should be treated as residual/paint/cell-allocation evidence rather than the main width blocker.
- VERIFIED: `node --check scripts\roll20_chat_parity_diagnostics.mjs`, `diagnose:roll20-chat-parity`, `status:roll20-actual`, `gate:roll20-renderer-action`, `diagnose:roll20-chat-font-glyph`, and `diagnose:roll20-chat-width`.
- STILL TODO P0: Build a narrow text/table-width renderer model from actual `measureText` deltas and table intrinsic metrics. Do not promote a broad global width/padding/font patch.

## 2026-06-20 Codex Update - Les/YSHY actual chat text measurement recaptured

Status: PARTIAL. Actual Roll20 chat text-measure evidence now exists for all 3 prepared fixtures, but chat/template visual parity and production renderer CSS remain blocked.

- DONE: Used only the dedicated `Codex Roll20 Verify` Custom Sheet Sandbox/test campaign; no existing real room was modified.
- DONE: Recovered the Roll20 editor after the settings-page manifest wrapper caused an `unexpected token` editor parse failure.
- DONE: Confirmed the current Roll20 settings page must receive plain exported `sheet.json` text in `customcharsheet_json`; the generated upload snippet no longer wraps it as `{ sheet, userOptions, jsoninfo }`.
- DONE: Recaptured `official-roll20-Les-Oublies` actual Roll20 chat DOM sidecar and DPR-corrected template-only `roll20-chat.png`.
- DONE: Recaptured `yshy-commission-1bu` actual Roll20 chat DOM sidecar and DPR-corrected template-only `roll20-chat.png`.
- RESULT: Les-Oublies now has `textMeasureEvidence.status=MEASURED`, `samples=12`, latest template `sheet-rolltemplate-initiative-roll`, and normalized crop mismatch `2.92%` (`local=267x84`, `actual=267x82`).
- RESULT: YSHY now has `textMeasureEvidence.status=MEASURED`, `samples=19`, latest template `sheet-rolltemplate-coc`, and normalized crop mismatch `35.23%` (`local=267x586`, `actual=267x586`).
- RESULT: `diagnose:roll20-chat-font-glyph` no longer reports `TEXT_MEASURE_RECAPTURE_REQUIRED`; all 3 fixtures are now `TEXT_MEASUREMENT_DELTA_MODEL_REQUIRED`.
- RESULT: `status:roll20-actual` is still `GENERATED_ACTUAL_SCREENSHOTS_DIFFED_WITH_SUSPECT_CHAT`, `rendererReady=NO`, `rendererAction=HOLD_PRODUCTION_RENDERER_PATCH`.
- RESULT: The latest gate still reports chat screenshot scale/foreground suspects and high aligned mismatch; do not tune production ChatPane CSS from these PNGs yet.
- VERIFIED: `node --check scripts\roll20_upload_snippet.mjs`, `snippet:roll20-upload`, `plan:roll20-chat-capture`, `roll20_actual_screenshot_diff`, `diagnose:roll20-chat-parity`, `diagnose:roll20-chat-font-glyph`, `status:roll20-actual`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Fix the Roll20 chat capture pipeline so DPR-corrected PNGs are not reported as non-1x/foreground suspects, then recapture or normalize before production renderer modeling.
- STILL TODO P0: Investigate the settings save path. Direct `FormData(settingsform)` POST corrupts Roll20 advanced JSON, and programmatic Ace value changes plus real save can still be fragile; prefer real UI/file inputs or a verified settings serializer.

## 2026-06-20 Codex Update - AW2E actual chat text measurement recaptured

Status: PARTIAL. One actual Roll20 chat fixture advanced from stale sidecar to measured text-width evidence; Roll20 chat/template parity still fails and production renderer CSS remains blocked.

- DONE: Used the dedicated Roll20 verification editor tab only; no existing room was modified.
- DONE: Recaptured `official-roll20-AW2E` actual Roll20 chat DOM evidence with the generated probe snippet.
- DONE: Fixed probe schema stability so `textRendering`, `webkitFontSmoothing`, and `mozOsxFontSmoothing` are always present even when the browser returns an empty platform value.
- DONE: Removed a bad full-panel/wrong-region chat screenshot and replaced it with a DPR-corrected, template-only `roll20-chat.png` crop saved under ignored local reports.
- RESULT: AW2E actual chat sidecar now has `textMeasureEvidence.status=MEASURED`, `samples=12`, `latestTemplate=sheet-rolltemplate-aw`, and `captureDprCorrection.applied=true`.
- RESULT: `diagnose:roll20-chat-font-glyph` now classifies AW2E as `TEXT_MEASUREMENT_DELTA_MODEL_REQUIRED` with mean text-width delta `3.642px`, instead of stale recapture required.
- RESULT: Les-Oublies and YSHY still require actual Roll20 chat sidecar recapture with `textMeasureEvidence.samples`.
- RESULT: `status:roll20-actual` reports generated screenshots/diffs `6/6`, `chatCurrentMetrics=3/3`, `chatNormalizedHighMismatch=3`, `rendererReady=NO`.
- RESULT: `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH`; current blockers include Les/YSHY textMeasure recapture and non-uniform renderer candidates.
- VERIFIED: `test:roll20-chat-capture-plan`, `plan:roll20-chat-capture --all --require-current-metrics`, `roll20_actual_screenshot_diff`, `diagnose:roll20-chat-parity`, `diagnose:roll20-chat-font-glyph`, `status:roll20-actual`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Load/restore Les-Oublies and YSHY in the dedicated Roll20 Sandbox/test room, recapture template-only `roll20-chat.png` plus same-action DOM sidecars with text measurement, then rerun the same gates.

## 2026-06-20 Codex Update - Chat text measurement evidence added

Status: PARTIAL. Roll20 chat/template parity is still blocked, but the next font/glyph probe is now evidence-gated instead of guesswork.

- DONE: `scripts/rolltemplate_chat_smoke.mjs` now records local `textMeasureEvidence` with canvas `measureText` widths, element widths, computed CSS font strings, probe strings, and CSSOM font-face status.
- DONE: `scripts/roll20_chat_capture_plan.mjs` now emits Roll20 DOM probe snippets with the same `textMeasureEvidence` shape and treats old sidecars as stale when `--require-current-metrics` is used.
- DONE: `scripts/roll20_chat_font_glyph_model.mjs` compares text-measure sidecars and now reports `TEXT_MEASURE_RECAPTURE_REQUIRED` instead of implying a broad font/spacing CSS fix.
- RESULT: Local rolltemplate smoke still PASSes all 3 prepared fixtures and now has local samples: AW2E `12`, Les-Oublies `12`, YSHY `19`.
- RESULT: Existing actual Roll20 chat sidecars are stale: 3/3 lack `textMeasureEvidence.samples`, so all three fixtures need actual Roll20 chat DOM recapture before another ChatPane text-width candidate.
- RESULT: `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH` and now includes a blocker for missing actual text measurement evidence.
- VERIFIED: `node --check` for changed scripts, `test:roll20-chat-capture-plan`, `corepack pnpm run build`, local `rolltemplate_chat_smoke`, `diagnose:roll20-chat-font-glyph`, `plan:roll20-chat-capture --all --require-current-metrics`, and `gate:roll20-renderer-action`.
- STILL TODO P0: In the actual Roll20 Custom Sheet Sandbox/test room, recapture `roll20-chat-dom-evidence.json` with the new snippet beside same-action `roll20-chat.png`, then rerun font/glyph diagnosis and renderer gate.

## 2026-06-20 Codex Update - CoC table-scale candidate style-proof rejected

Status: PARTIAL. The YSHY/CoC width candidate was narrowed further: visual scaling helps pixels, but actual Roll20 computed styles reject transform-based promotion.

- DONE: Added `diagnose:roll20-chat-intrinsic-width`, which compares local vs actual Roll20 rolltemplate table/row/cell intrinsic metrics.
- RESULT: Current intrinsic-width status is `INTRINSIC_WIDTH_MODEL_REQUIRED`.
- RESULT: `yshy-commission-1bu` is `TRANSFORM_REJECTED_INTRINSIC_WIDTH_MODEL_REQUIRED`: actual Roll20 rejects the `scaleX` explanation (`transform:none`) while table width is `-24.309px` from local.
- RESULT: `official-roll20-AW2E` and `official-roll20-Les-Oublies` are `CSS_METRIC_DELTA_INTRINSIC_MODEL_REQUIRED`, so a global width/scale patch is still unsafe.
- DONE: Added diagnostic-only spacing candidates: `roll20-intrinsic-spacing`, `roll20-border-spacing`, and `roll20-letter-spacing`.
- RESULT: `roll20-border-spacing` has no meaningful pixel gain; `roll20-letter-spacing` and combined `roll20-intrinsic-spacing` regress YSHY (`21.45% -> 24.45%` aligned).
- RESULT: Intrinsic model now classifies AW2E/Les as `CSS_METRIC_CANDIDATES_REJECTED` and YSHY as `TRANSFORM_AND_SPACING_REJECTED_FONT_GLYPH_MODEL_REQUIRED`.
- DONE: Added `diagnose:roll20-chat-font-glyph`, which compares font availability, computed font stacks, broad font candidate outcomes, and row text-width signals.
- RESULT: YSHY is `FONT_AVAILABILITY_CHANGED_CANDIDATES_REJECTED`: actual Roll20 has different font availability and table font family, while broad font/typography candidates already regress or fail to help.
- RESULT: AW2E/Les are `FONT_STYLE_CHANGED_CANDIDATES_REJECTED`: font/style signals remain relevant, but exact text measurement is needed rather than broad font CSS.
- RESULT: `gate:roll20-renderer-action` now includes the intrinsic-width model in evidence and next actions.
- DONE: `diagnose:roll20-chat-candidate-style` now checks both `candidate-needs-style-proof` and `single-fixture-only` candidates.
- DONE: Added style-proof coverage for `coc-table-scale-x` using its local smoke sidecar.
- RESULT: Style proof now reports `contradicted=2/2`: `no-shadow` and `coc-table-scale-x` are both contradicted by actual Roll20 computed styles.
- RESULT: `coc-table-scale-x` is contradicted because actual Roll20 `.sheet-rolltemplate-coc table` has `transform: none`, while the candidate uses `scaleX(0.981)`.
- RESULT: Renderer policy moves YSHY from `CANDIDATE_ONLY_DO_NOT_EXPOSE` to `NEEDS_NARROW_TEMPLATE_MODEL`.
- RESULT: `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH` and now explicitly blocks style-contradicted candidates.
- VERIFIED: `node --check scripts\roll20_chat_candidate_style_proof.mjs`, `diagnose:roll20-chat-candidate-style`, `diagnose:roll20-chat-renderer-policy`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Capture actual/local per-font `measureText` widths and CSSOM font-face activation so YSHY/CoC can be modeled without broad font/typography CSS.

## 2026-06-20 Codex Update - CoC rolltemplate table-scale candidate isolated

Status: PARTIAL. A fixture-local YSHY/CoC chat-width candidate now exists, but Roll20 chat/template parity is still blocked and the candidate is not product-enabled.

- DONE: Added diagnostic-only `coc-table-scale-x` ChatPane geometry policy for `.sheet-rolltemplate-coc table`.
- DONE: Added smoke support and candidate-comparison coverage through `reports/rolltemplate-chat-smoke-coc-table-scale-x`.
- RESULT: Functional smoke PASSed all 3 prepared fixtures.
- RESULT: Candidate comparison shows `coc-table-scale-x` improves YSHY aligned mismatch `21.45% -> 20.11%` (`-1.34%`) with `0` regressions, unlike global `table-scale-x` which remains `reject-regresses-fixtures`.
- RESULT: Renderer policy still keeps YSHY as `CANDIDATE_ONLY_DO_NOT_EXPOSE`; the candidate is fixture-local and still needs actual Roll20 style proof before any renderer-model/default use.
- RESULT: `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH`; this is a narrower diagnostic candidate, not Roll20 visual parity.
- VERIFIED: `corepack pnpm run build`, `rolltemplate_chat_smoke` with `--chat-geometry-policy coc-table-scale-x`, `diagnose:roll20-chat-candidates`, `diagnose:roll20-chat-renderer-policy`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Add actual-style proof for the YSHY/CoC table transform candidate or create a more faithful intrinsic-width model that explains the `4.607x` actual table/crop ratio without relying on visual-only scaling.

## 2026-06-20 Codex Update - Per-template chat width model added

Status: PARTIAL. Roll20 chat/template parity is still blocked, but the width/overflow blocker is now separated by fixture/template instead of treated as one global CSS problem.

- DONE: Added `scripts/roll20_chat_width_model.mjs` and package alias `diagnose:roll20-chat-width`.
- DONE: Wired the width model into `gate:roll20-renderer-action` and documented the command in `scripts/README.md`.
- RESULT: Width model status is `WIDTH_MODEL_REQUIRED`, actionable `2/3`.
- RESULT: `official-roll20-AW2E` is `WIDTH_SECONDARY_OR_ACCEPTABLE` on the chat-width axis for now.
- RESULT: `official-roll20-Les-Oublies` is `CHAT_SHELL_WIDTH_MODEL_REQUIRED`: table width is nearly aligned (`+0.8px`) but shell/message/crop width still differs.
- RESULT: `yshy-commission-1bu` is `TABLE_WIDTH_MODEL_REQUIRED`: actual table/crop ratio is `4.607x`, proving this is an overflowed large-table crop case rather than a normal narrow-card width patch.
- RESULT: `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH`; this model blocks unsafe global width/padding/overflow CSS until a per-template candidate is proven.
- VERIFIED: `node --check` for the new script and renderer gate, `diagnose:roll20-chat-width`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Build the next targeted candidate from this split: Les shell/message width separately from YSHY intrinsic/overflowed table width, then rerun chat smoke/parity/candidate comparison.

## 2026-06-20 Codex Update - Custom rolltemplate app class leak removed

Status: PARTIAL. A real app-CSS leak in ChatPane custom rolltemplate roots was removed, but Roll20 chat/template visual parity is still blocked.

- DONE: `components/editor/ChatPane.tsx` now renders imported/custom rolltemplate bodies with only the Roll20-style `sheet-rolltemplate-*` class on the template root.
- DONE: The app fallback card classes (`rt-card text-xs rounded ...`) remain only for generated/default fallback rolltemplates that have no imported custom body.
- RESULT: Functional local rolltemplate smoke still PASSes all 3 prepared fixtures.
- RESULT: Updated chat parity remains `HIGH_MISMATCH`: authoritative normalized high mismatch `2/3`, max aligned mismatch `21.45%`.
- RESULT: Raw current mismatches are AW2E `7.09%`, Les-Oublies `18.38%`, YSHY `24.84%`; aligned policy evidence still reports Les-Oublies `12.98%` and YSHY `21.45%` as blockers.
- RESULT: `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH`; removing the app class leak is correct isolation work, not a sufficient renderer fix.
- VERIFIED: `corepack pnpm run build`, `rolltemplate_chat_smoke`, `diagnose:roll20-chat-parity`, `diagnose:roll20-chat-candidates`, `diagnose:roll20-chat-style`, `diagnose:roll20-chat-shell-geometry`, `diagnose:roll20-chat-font-cell`, `diagnose:roll20-chat-renderer-policy`, `diagnose:roll20-chat-residual`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Build a narrower per-template chat renderer model. Current evidence splits Les-Oublies toward shadow/border/rasterization and YSHY toward geometry/width conflict; do not promote one global ChatPane CSS patch.

## 2026-06-20 Codex Update - Cell metrics candidate rejected

Status: PARTIAL. Roll20 chat/template parity is still blocked; a narrow cell metrics hypothesis was tested and rejected.

- DONE: Added hidden diagnostic-only `roll20-cell-metrics` ChatPane typography policy and smoke path.
- DONE: Added `cell-metrics` to chat candidate comparison and surfaced its result in `diagnose:roll20-chat-font-cell` / `gate:roll20-renderer-action`.
- RESULT: Functional smoke passed for all 3 fixtures.
- RESULT: Pixel comparison rejects `cell-metrics`: Les-Oublies worsened `12.90% -> 13.30%`, YSHY worsened `21.45% -> 34.93%`, while AW2E improved `7.35% -> 6.59%`.
- RESULT: Font size / letter-spacing / cell metric adjustment alone is not the Les fix. The font/cell model now classifies Les as `CELL_METRIC_CANDIDATES_REJECTED`.
- VERIFIED: `rolltemplate_chat_smoke` for `roll20-cell-metrics`, `diagnose:roll20-chat-candidates`, `diagnose:roll20-chat-font-cell`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Inspect CSS cascade/order and intrinsic table allocation for Les before another ChatPane typography/cell candidate.

## 2026-06-20 Codex Update - Chat font/cell model boundary added

Status: PARTIAL. Roll20 chat/template parity is still blocked, but broad typography patches are now explicitly separated from narrow cell allocation work.

- DONE: Added `diagnose:roll20-chat-font-cell`, which combines shell geometry, style context, candidate comparison, and renderer policy reports.
- DONE: Wired the font/cell model summary into `gate:roll20-renderer-action`.
- RESULT: `official-roll20-Les-Oublies` is `NARROW_CELL_ALLOCATION_MODEL_REQUIRED`: first cell width is `+4.141px`, font size differs by `+1.65px`, but `template-typography` only changed Les by `-0.01%` and is not a valid broad fix.
- RESULT: `yshy-commission-1bu` is `WIDTH_MODEL_BEFORE_FONT_CELL`; table width/overflow must be solved before font/cell tuning.
- RESULT: `official-roll20-AW2E` stays `KEEP_DEFAULT_FOR_NOW` because its aligned chat mismatch is below the high-mismatch threshold.
- VERIFIED: `diagnose:roll20-chat-font-cell`, `node --check scripts\roll20_chat_font_cell_model.mjs`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Build a narrow, actual-style-proven cell allocation diagnostic for Les. Do not promote broad typography, font fallback, width, padding, or paint CSS globally.

## 2026-06-20 Codex Update - Chat shell geometry narrows Les mismatch

Status: PARTIAL. Roll20 chat/template parity is still blocked, but the Les-Oublies shell/crop hypothesis is now narrower.

- DONE: Added `diagnose:roll20-chat-shell-geometry`, which compares local ChatPane root/table/cell geometry with actual Roll20 chat DOM sidecars.
- DONE: Wired shell geometry into `gate:roll20-renderer-action`.
- RESULT: Current shell status is `SHELL_MODEL_NEEDED`.
- RESULT: `official-roll20-Les-Oublies` is now `CELL_WIDTH_MODEL_MISMATCH`: message width and template width match, actual crop margin is `2/2/2/2`, but actual first cell is `+4.141px` wider and template height is `-1.2px` compared with local.
- RESULT: `yshy-commission-1bu` remains `WIDTH_MODEL_REQUIRED`; actual table width differs by `-24.309px`.
- RESULT: `official-roll20-AW2E` remains shell-secondary for this axis because its aligned chat mismatch is below the current high-mismatch threshold.
- VERIFIED: `diagnose:roll20-chat-shell-geometry`, `node --check scripts\roll20_chat_shell_geometry.mjs`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Build a font/cell-width diagnostic model before any production ChatPane CSS. Prior broad typography and paint candidates are not sufficient evidence for a global patch.

## 2026-06-20 Codex Update - Chat mask strategy gate added

Status: PARTIAL. Roll20 chat/template parity is still blocked, but the next renderer strategy is now less ambiguous.

- DONE: Added `diagnose:roll20-chat-mask-strategy`, which reads existing chat parity/residual/candidate reports and classifies the next action from row-band, left-edge, luma, and mask evidence.
- DONE: Wired the mask strategy summary into `gate:roll20-renderer-action`.
- RESULT: Current strategy status is `STRATEGY_NEEDED`, high mismatch `2/3`.
- RESULT: `official-roll20-Les-Oublies` is now classified as `RECROP_OR_SHELL_CONTEXT_BEFORE_CSS`; next step is to compare actual/local message shell padding, template crop x/y, and row-band masks before another CSS candidate.
- RESULT: `yshy-commission-1bu` is now classified as `MODEL_TEMPLATE_WIDTH_BEFORE_PAINT`; next step is a per-template chat width model before paint CSS.
- RESULT: `official-roll20-AW2E` stays `KEEP_DEFAULT_FOR_NOW` for this chat axis.
- VERIFIED: `diagnose:roll20-chat-mask-strategy`, `node --check` for the new strategy script and renderer gate, and `gate:roll20-renderer-action`.
- STILL TODO P0: Build the Les crop/shell diagnostic probe and the YSHY per-template width model. This does not prove Roll20 visual parity and does not authorize production ChatPane CSS.

## 2026-06-20 Codex Update - Chat paint residual candidates tested

Status: PARTIAL. Roll20 chat/template parity is still blocked; two paint/raster hypotheses were tested as diagnostic-only candidates and must not be promoted.

- DONE: Added hidden localStorage-only `chatPaintPolicy` diagnostics in `ChatPane`: `roll20-dim-background` and `roll20-edge-shadow`.
- DONE: Added smoke support for `--chat-paint-policy` and included both paint candidates in `diagnose:roll20-chat-candidates`.
- RESULT: Both candidates functionally rendered all 3 fixtures in local ChatPane smoke.
- RESULT: `paint-dim-background` improved YSHY from `21.45%` to `19.65%`, but Les-Oublies only changed `12.90% -> 12.85%`; this is not a Les fix and remains `single-fixture-only`.
- RESULT: `paint-edge-shadow` did not help; Les-Oublies worsened `12.90% -> 13.15%`.
- RESULT: `gate:roll20-renderer-action` still correctly reports `HOLD_PRODUCTION_RENDERER_PATCH`.
- VERIFIED: `corepack pnpm run build`, two `rolltemplate_chat_smoke` paint-policy runs, `diagnose:roll20-chat-candidates`, `diagnose:roll20-chat-renderer-policy`, `diagnose:roll20-chat-residual`, `gate:roll20-renderer-action`, `corepack pnpm run lint`, and `guard:roll20-evidence`.
- STILL TODO P0: Les-Oublies residual is not solved by simple dimming or edge shadow. Next diagnostic should compare actual/local chat crop shell, row-band masks, and Roll20 canvas/browser rasterization around the rolltemplate boundary.
- STILL TODO P0: YSHY still needs a per-template chat width model; `paint-dim-background` is only a diagnostic clue and not a production renderer patch.

## 2026-06-20 Codex Update - Chat residual axes classified

Status: PARTIAL. Roll20 chat/template parity is still blocked, but the next investigation target is now narrower.

- DONE: Added `diagnose:roll20-chat-residual`, which reads the current chat parity/style/candidate/policy reports and classifies remaining mismatch by residual axis.
- DONE: Wired the residual summary into `gate:roll20-renderer-action` so future renderer work sees the axis split in the standard gate output.
- RESULT: Current residual status is `RESIDUALS_REMAIN`, high mismatch `2/3`.
- RESULT: `official-roll20-Les-Oublies` is classified as `SHADOW_BORDER_RASTERIZATION`, not simple typography or width. Next diagnostic: test border/shadow/background negative controls against actual computed style and pixel masks.
- RESULT: `yshy-commission-1bu` is classified as `GEOMETRY_WIDTH_CONFLICT`. Next diagnostic: compare Roll20 chat shell/message/template width model per template before any width or padding patch.
- RESULT: `official-roll20-AW2E` remains `DEFAULT_ACCEPTABLE_FOR_NOW` for chat because default aligned mismatch is `7.35%`, below the current high-mismatch threshold.
- VERIFIED: `corepack pnpm run diagnose:roll20-chat-residual -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `corepack pnpm run gate:roll20-renderer-action -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `corepack pnpm run lint`, and `corepack pnpm run build`.
- STILL TODO P0: Build and test a Les-only paint/raster diagnostic candidate; do not try more broad typography candidates.

## 2026-06-20 Codex Update - Template typography candidate rejected

Status: PARTIAL. A plausible Les-Oublies chat hypothesis was tested and rejected; Roll20 chat/template parity is still blocked.

- DONE: Added a hidden diagnostic-only `roll20-template-typography` ChatPane policy and `template-typography` candidate smoke path.
- DONE: The candidate applies observed Roll20 template typography/color/letter-spacing/font-smoothing to rolltemplate roots, tables, captions, and cells for local comparison only. It is not exposed in product UI.
- RESULT: Functional smoke passed for AW2E, Les-Oublies, and YSHY, so the candidate is mechanically testable.
- RESULT: Pixel comparison rejected it: Les-Oublies improved only `12.90% -> 12.89%`, AW2E regressed `7.35% -> 7.76%`, and YSHY regressed badly `21.45% -> 31.00%`.
- RESULT: `gate:roll20-renderer-action` now reports `template-typography` as a fixture-regressing candidate; it must not be promoted to production ChatPane CSS.
- VERIFIED: `node scripts\rolltemplate_chat_smoke.mjs --out-dir .\out --base-path /roll20-block-editor --fixtures test-fixtures\visual --report-dir reports\rolltemplate-chat-smoke-template-typography --chat-typography-policy roll20-template-typography --port 4197`, `diagnose:roll20-chat-candidates`, `diagnose:roll20-chat-renderer-policy`, `gate:roll20-renderer-action`, and `corepack pnpm run lint`.
- STILL TODO P0: Les-Oublies still needs a new diagnostic model. The remaining Les mismatch is not solved by simple template typography; next work should inspect background/border/shadow/anti-aliasing or crop shell effects from actual Roll20 evidence.

## 2026-06-20 Codex Update - Chat renderer policy gate

Status: PARTIAL. Roll20 chat/template parity is still blocked, but the unsafe global-patch boundary is now explicit.

- DONE: Added `diagnose:roll20-chat-renderer-policy`, which converts current actual Roll20 chat parity/style/candidate evidence into a diagnostic-only per-fixture renderer policy.
- DONE: Wired the policy into `gate:roll20-renderer-action` so agents see the split before attempting another global ChatPane width/padding/font patch.
- RESULT: Current policy is `HOLD_GLOBAL_CHAT_RENDERER_PATCH`, `publicUi=DO_NOT_EXPOSE`, with no global-safe candidates.
- RESULT: Fixture decisions are split: `official-roll20-AW2E=KEEP_DEFAULT_CHAT_RENDERER`, `official-roll20-Les-Oublies=NEEDS_NEW_DIAGNOSTIC_MODEL`, `yshy-commission-1bu=CANDIDATE_ONLY_DO_NOT_EXPOSE`.
- RESULT: The policy records the conflicting actual table-width deltas: AW2E `+33.134px`, Les-Oublies `+0.8px`, YSHY `-24.309px`.
- VERIFIED: `corepack pnpm run diagnose:roll20-chat-renderer-policy -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `corepack pnpm run gate:roll20-renderer-action -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `corepack pnpm run lint`, and `corepack pnpm run build`.
- STILL TODO P0: Create a new Les-Oublies chat diagnostic model and prove or reject the YSHY fixture-local candidates from actual Roll20 computed style before any production ChatPane CSS.

## 2026-06-20 Codex Update - Header manual save is real

Status: PARTIAL. Header chrome is less misleading, but Roll20 visual parity is still not proven.

- DONE: Removed the nonfunctional header `설정` and `도움말` buttons from the product surface.
- DONE: Changed the header `저장` button from a placeholder toast into a real IndexedDB save action using the same workspace snapshot path as autosave.
- DONE: Added an exported `saveCurrentWorkspaceSnapshot()` helper so manual save and autosave share the same XML serialization and save-state marking logic.
- VERIFIED: `corepack pnpm run lint`, `corepack pnpm run build`, browser smoke on `http://localhost:3000/` showing no visible `설정`/`도움말`/`준비 중` header copy, manual save success toast, `smoke:export-dialog`, `guard:roll20-evidence`, `guard:roll20-renderer-model`, `status:roll20-actual`, and `diagnose:roll20-renderer-blocker`.
- NOTE: Browser console still shows a React hydration warning caused by an installed extension injecting `cz-shortcut-listen` into `<body>` during dev verification. This was not an app runtime error in the smoke run.
- STILL TODO P0: Continue actual Roll20 renderer/chat parity work. Latest status remains `rendererAction=HOLD_PRODUCTION_RENDERER_PATCH`, `rendererReady=NO`, normalized chat high mismatch `2/3`, max aligned mismatch `21.45%`.

## 2026-06-20 Codex Update - Preview diagnostic chrome hidden from product UI

Status: PARTIAL. The preview surface is less confusing, but Roll20 visual parity is still not proven.

- DONE: Removed the user-facing `Sandbox 예상` toggle from the main toolbar. The Roll20 Sandbox expected-render path remains available to verification scripts and export diagnostics, not as a normal preview-mode control.
- DONE: Removed the preview toolbar render-mode toggle (`Roll20 보기` / `편집 보기`) so preview mode stays on the iframe Roll20-style path. Edit mode remains the separate real-preview-plus-overlay surface.
- DONE: Removed the preview layer-filter dropdown from the preview toolbar. Layer/object manipulation belongs in edit mode, not in the plain preview surface.
- DONE: Updated `scripts/roll20_sandbox_preview_smoke.mjs` to enable Sandbox expected rendering through `window.__perfHook.setRoll20SandboxSanitize(true)` instead of waiting for a hidden product UI button.
- VERIFIED: `corepack pnpm run lint`, `corepack pnpm run build`, `corepack pnpm run smoke:roll20-sandbox-preview -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --fixture official-roll20-Les-Oublies --report-dir reports/roll20-sandbox-preview-smoke --port 4331`, and `corepack pnpm run guard:roll20-renderer-model`.
- STILL TODO P0: Continue actual Roll20 renderer/chat parity work. This UI cleanup does not change the current `HOLD_PRODUCTION_RENDERER_PATCH` boundary and does not prove visual parity.

## 2026-06-20 Codex Update - Input-flow rollout policy is machine-readable

Status: PARTIAL. The input-flow renderer model still must not be exposed, but the boundary is now machine-readable.

- DONE: `diagnose:roll20-input-flow-axis` now writes `modelRollout` with `globalDecision`, `publicUiDecision`, per-fixture `productDecision`, recommended diagnostic model, blockers, and required evidence.
- DONE: `gate:roll20-renderer-action` now reads the rollout policy and reports it as standard warning/evidence.
- RESULT: Latest rollout policy is `globalDecision=DO_NOT_ENABLE_GLOBALLY`, `publicUiDecision=DO_NOT_EXPOSE`, candidate models `renderer-model:input-flow-276` and `renderer-model:input-flow-27`, blocker `official-roll20-AW2E:KEEP_DEFAULT_BLOCKS_GLOBAL`.
- RESULT: Per-fixture policy is now explicit: AW2E keeps `default`; Les-Oublies and YSHY are `CANDIDATE_ONLY_DO_NOT_EXPOSE`.
- STILL TODO P0: Broaden the fixture set and separate source/default-state-dominant sheets from input-flow-friendly sheets before any automatic renderer model selection.
- VERIFIED: `diagnose:roll20-input-flow-axis`, `gate:roll20-renderer-action`, and `diagnose:roll20-renderer-blocker`.

## 2026-06-20 Codex Update - Renderer model rollout guard

Status: PARTIAL. The input-flow renderer model is still diagnostic-only, and accidental production enablement is now guarded.

- DONE: Added `guard:roll20-renderer-model`, which scans app/component/lib production paths and fails if `input-flow-27` or `input-flow-276` is enabled outside the diagnostic `buildDoc` gate.
- DONE: Connected the renderer-model guard into `guard:roll20-evidence` and `.githooks/pre-commit`.
- RESULT: Current guard passes: no non-default renderer model is enabled in user-facing app paths, `buildDoc` keeps the explicit model union, defaults to `default`, and emits no renderer-model CSS for default.
- RESULT: `diagnose:roll20-input-flow-axis` still reports `SPLIT_RENDERER_AXIS_CONFIRMED`, apply candidates `2`, block global model `1`, `globalModelSafe=NO`.
- STILL TODO P0: Define the actual per-sheet/per-template boundary before exposing or enabling `roll20RendererModel` outside diagnostics.
- VERIFIED: `guard:roll20-renderer-model`, `guard:roll20-evidence`, `diagnose:roll20-input-flow-axis`, `corepack pnpm run lint`, and `corepack pnpm run build`.

## 2026-06-20 Codex Update - Renderer blocker matrix now includes chat axis

Status: PARTIAL. Renderer parity is still blocked, but the diagnostic handoff is clearer and safer.

- DONE: Extended `diagnose:roll20-renderer-blocker` so its conclusion follows the renderer action gate. If `gate:roll20-renderer-action` is `HOLD_PRODUCTION_RENDERER_PATCH`, the blocker matrix now also concludes `HOLD_PRODUCTION_RENDERER_PATCH`.
- DONE: Added a `Chat Rolltemplate Axis` section to the blocker matrix. It now reports chat crop mismatch, local/actual crop sizes, table-width deltas, top style deltas, and chat candidate regression risks beside the full-root patch matrix.
- RESULT: Latest matrix explicitly separates full-root sheet rendering from chat rolltemplate rendering. Current chat axis remains blocked: normalized `3/3`, authoritative high mismatch `2`, max aligned mismatch `21.452%`, table-width conflict `yes`.
- RESULT: `diagnose:roll20-computed-style-context` still reports `DO_NOT_PROMOTE_DIRECTLY` for `3/3`. Les-Oublies favors an inline/text-input candidate slice, but AW2E and YSHY do not support a global renderer CSS promotion.
- STILL TODO P0: Implement or prototype a renderer-model boundary that can represent input/inline-flow and chat-template differences per fixture/template without turning them into one global CSS patch.
- VERIFIED: `diagnose:roll20-renderer-blocker`, `diagnose:roll20-computed-style-context`, `corepack pnpm run lint`, and `corepack pnpm run build`.

## 2026-06-20 Codex Update - Chat candidate proof gate cleanup

Status: PARTIAL. Roll20 chat/template parity still fails; no production ChatPane CSS was promoted.

- DONE: Updated `gate:roll20-renderer-action` so a candidate already classified by `diagnose:roll20-chat-candidate-style` is no longer also reported as "without actual Roll20 style proof".
- RESULT: A tentative default `overflow-wrap: break-word` ChatPane patch was tested and then reverted because it is not globally safe. It improved/changed some geometry but worsened the overall renderer target enough that it must stay diagnostic-only.
- RESULT: Current regenerated chat parity still reports `HIGH_MISMATCH`: `2/3` authoritative normalized fixtures fail, authoritative max aligned mismatch is `21.45%`, and current metrics are present for `3/3`.
- RESULT: Current candidate comparison rejects fixture-regressing candidates and leaves no `candidate-needs-style-proof` candidate after the latest baseline; `roll20-break-word` is now `no-meaningful-gain`, not a production patch.
- STILL TODO P0: Build a narrower per-fixture/per-template renderer model. AW2E and YSHY still have opposite actual table-width deltas, so one global ChatPane width/padding/wrap patch is blocked.
- VERIFIED: `node scripts/rolltemplate_chat_smoke.mjs`, `diagnose:roll20-chat-parity`, `diagnose:roll20-chat-style`, `diagnose:roll20-chat-candidates`, `diagnose:roll20-chat-candidate-style`, `gate:roll20-renderer-action`, `corepack pnpm run lint`, and `corepack pnpm run build`.

## 2026-06-20 Codex Update - Roll20 chat current metrics complete

Status: PARTIAL. Actual Roll20 chat evidence is now current for the 3-fixture set, but renderer/chat parity still fails.

- DONE: Reclaimed only the dedicated `Codex Roll20 Verify` Roll20 Sandbox/editor. No existing real room was edited.
- DONE: Recaptured AW2E, Les-Oublies, and YSHY `roll20-chat.png` plus same-action `roll20-chat-dom-evidence.json` with current row/typography/text-rendering fields.
- RESULT: `plan:roll20-chat-capture -- --require-current-metrics` now reports `ALL_CHAT_EVIDENCE_TRUSTED`, `plannedFixtures=0/3`.
- RESULT: `status:roll20-actual -- --require-actual` now reports `chatCurrentMetrics=3/3`, `chatCurrentMetricsMissing=0`, `chatCaptureSuspects=0`, and `chatActualCaptureScaleSuspect=0`.
- RESULT: `diagnose:roll20-chat-candidate-style` now rejects `text-auto-aa` with actual Roll20 style evidence. `no-shadow` and `table-scale-x` remain rejected; `roll20-break-word` is not enough for a global renderer patch.
- STILL TODO P0: Renderer gate remains `HOLD_PRODUCTION_RENDERER_PATCH`; current blocker is real chat/template mismatch, not stale sidecar evidence. Latest chat parity reports `3/3` normalized high mismatch and authoritative max aligned mismatch `23.07%`.
- STILL TODO P0: Fix ChatPane/Roll20 shell-template sizing and per-template renderer modeling before touching edit-mode UX claims or production renderer CSS.

## 2026-06-20 Codex Update - Text rasterization sidecar fields

Status: PARTIAL. The remaining `text-auto-aa` candidate now has a concrete evidence path; actual Roll20 chat sidecars must be recaptured.

- DONE: Added `textRendering`, `webkitFontSmoothing`, and `mozOsxFontSmoothing` to local rolltemplate chat smoke sidecars and to the Roll20 chat DOM probe snippet generated by `plan:roll20-chat-capture`.
- DONE: `status:roll20-actual` and `plan:roll20-chat-capture -- --require-current-metrics` now treat missing text-rasterization fields as stale current metrics.
- RESULT: Existing actual Roll20 chat sidecars are now correctly marked stale for `3/3` fixtures because they lack `latestTemplate.computedStyle.textRasterization` and `table.computedStyle.textRasterization`.
- RESULT: Re-ran local `rolltemplate-chat-smoke-text-auto-aa`; it still PASSes and records local `textRendering=auto` / `webkitFontSmoothing=auto`.
- STILL TODO P0: Recapture AW2E, Les-Oublies, and YSHY actual Roll20 chat DOM sidecars with the new text-rasterization fields, then rerun `diagnose:roll20-chat-candidate-style` to prove or reject `text-auto-aa`.

## 2026-06-20 Codex Update - Chat candidate actual-style proof

Status: PARTIAL. Three pixel-improving ChatPane candidates are now rejected by actual Roll20 computed style; renderer/chat parity is still blocked.

- DONE: Added `diagnose:roll20-chat-candidate-style`, which compares `candidate-needs-style-proof` local ChatPane candidates against actual Roll20 chat DOM sidecars.
- RESULT: `table-scale-x` is contradicted by actual Roll20 table `transform` for `3/3` fixtures. Actual Roll20 uses no matching `scaleX(0.981)` transform.
- RESULT: `no-shadow` is contradicted by YSHY actual Roll20 cells: comparable nodes still keep strong `text-shadow`, so blanket no-shadow is not a valid generic renderer patch.
- RESULT: `roll20-break-word` is compatible with YSHY but contradicted by AW2E and Les-Oublies, so it is not global-safe.
- RESULT: `text-auto-aa` cannot be proven with current sidecar fields; it needs actual `text-rendering` / font smoothing evidence before any production consideration.
- STILL TODO P0: Stop treating `no-shadow`, `table-scale-x`, and `roll20-break-word` as production candidates. Next useful work is either richer text rasterization sidecars for `text-auto-aa`, or a narrower per-template renderer model supported by actual Roll20 styles.

## 2026-06-20 Codex Update - Chat candidate gate hardening

Status: PARTIAL. The renderer gate now blocks unsafe ChatPane candidate promotion directly; Roll20 renderer/chat parity is still not solved.

- DONE: `gate:roll20-renderer-action` now reads `chat-candidate-comparison-results.json` and surfaces candidate risk in the standard blocker/next-action output.
- RESULT: Current gate adds explicit blockers for fixture-regressing candidates (`tight-cell-spacing`, `shell-typography`, `font-fallback*`, `soft-shadow-rejected`, `roll20-message-padding`) and for numerically promising but unproven candidates (`no-shadow`, `table-scale-x`, `roll20-break-word`, `text-auto-aa`).
- RESULT: The gate markdown now includes a `Chat Candidate Boundary` table with per-fixture deltas, mean delta, regression counts, and style-proof requirements.
- STILL TODO P0: Prove any promising candidate from actual Roll20 computed style before production CSS. If no actual style proof exists, keep it diagnostic-only.
- STILL TODO P0: Roll20 chat/template mismatch remains real: authoritative max aligned mismatch is still `23.4%`, and renderer action remains `HOLD_PRODUCTION_RENDERER_PATCH`.

## 2026-06-20 Codex Update - Chat candidate regression risk table

Status: PARTIAL. Candidate diagnostics are clearer; Roll20 renderer/chat parity is still blocked.

- DONE: `diagnose:roll20-chat-candidates` now reports per-fixture aligned deltas, mean delta, regression count, and a promotion-risk label instead of leaning on the YSHY number alone.
- RESULT: Latest candidate comparison shows `no-shadow` mean `-1.46%` and `table-scale-x` mean `-1.01%`, both marked `candidate-needs-style-proof` because they improve pixels without actual Roll20 computed-style proof.
- RESULT: `soft-shadow-rejected`, `roll20-message-padding`, `font-fallback`, `tight-cell-spacing`, and `shell-typography` are now clearly classified as fixture-regressing candidates.
- STILL TODO P0: Do not promote any ChatPane width/padding/shadow/table transform to production CSS until actual Roll20 style evidence explains the cross-fixture conflict.
- STILL TODO P0: Renderer gate must remain `HOLD_PRODUCTION_RENDERER_PATCH`; no Roll20 visual parity or all-sheet support claim is allowed.

## 2026-06-20 Codex Update - Les chat authoritative recapture cleared

Status: PARTIAL. The Les-Oublies chat crop trust blocker is cleared; Roll20 renderer/chat parity is still blocked.

- DONE: Reclaimed the dedicated `Codex Roll20 Verify` Roll20 editor/Sandbox tab and captured Les-Oublies `sheet-rolltemplate-initiative-roll` from the visible text chat panel with CDP `Page.captureScreenshot`.
- DONE: Saved the corrected crop and sidecar only under ignored local `reports/roll20-actual-compare/2026-06-18-state-map-v1/`; no real room was modified and no private sheet/source evidence is to be committed.
- RESULT: `plan:roll20-chat-capture -- --require-current-metrics` now reports `ALL_CHAT_EVIDENCE_TRUSTED` and `plannedFixtures=0/3`.
- RESULT: `status:roll20-actual -- --require-actual` now passes with `GENERATED_ACTUAL_SCREENSHOTS_DIFFED`, `generatedAuthoritative=YES`, `chatCaptureSuspects=0`, `chatActualCropGeometrySuspect=0`, and `chatActualTemplatePixelSuspect=0`.
- RESULT: `diagnose:roll20-chat-parity` still reports real mismatch after the capture fix: AW2E `28.89%` raw, Les-Oublies `16.04%` raw, YSHY `26.98%` raw; aligned authoritative high mismatch remains `2/3` with max `23.4%`.
- STILL TODO P0: Renderer gate remains `HOLD_PRODUCTION_RENDERER_PATCH`; next work is local ChatPane/Roll20 shell/template sizing and default-state renderer analysis, not more Les crop cleanup.
- STILL TODO P0: `gate:roll20-renderer-ready` must keep failing until renderer/chat parity is proven. Do not claim Roll20 visual parity or all-sheet support.

Follow-up diagnostic: Added rejected local-only chat geometry candidate `roll20-message-padding` because current actual crops show local rolltemplate screenshots about `12px` wider than Roll20 crops. Functional smoke passed for AW2E, Les-Oublies, and YSHY, but `diagnose:roll20-chat-candidates` rejected it: YSHY aligned mismatch worsened from `22.68%` to `27.54%`. Keep it as a reproducible negative control; do not promote it to production ChatPane CSS.

Follow-up style context diagnostic: Added `diagnose:roll20-chat-style`, which compares local ChatPane computed style/row sidecars against actual Roll20 chat sidecars. Latest report compares `3/3` fixtures and narrows the structured deltas: AW2E has actual table width `+33.134px` plus typography deltas, Les-Oublies is mostly typography-only with tiny geometry deltas, and YSHY has table width `-24.309px` plus clipped-overflow evidence. A new `roll20-break-word` candidate tested the YSHY `overflow-wrap: break-word` clue, but candidate comparison rejected it as neutral/slightly worse (`22.68% -> 22.77%` aligned). Keep both padding and break-word as negative controls; next P0 should compare table/font rasterization and the `table-scale-x`/shadow diagnostics against actual computed style before production CSS.

Follow-up renderer gate integration: `gate:roll20-renderer-action` now reads `chat-style-context-diagnostics` and adds a blocker when actual Roll20 chat table-width deltas conflict across fixtures. Current gate explicitly blocks single ChatPane width/padding promotion because AW2E is `+33.134px`, Les-Oublies is `+0.8px`, and YSHY is `-24.309px`. This makes the next P0 table/font/shadow renderer investigation visible in the standard gate output instead of buried in local reports.

## 2026-06-20 Codex Update - Roll20 chat crop foreground guard

Status: PARTIAL. Evidence quality improved; renderer/chat parity remains blocked.

- DONE: Detected that the latest Les-Oublies actual `roll20-chat.png` is not a trustworthy rolltemplate crop. The PNG contains map/grid pixels while the DOM sidecar reports `sheet-rolltemplate-initiative-roll` text.
- DONE: `diagnose:roll20-chat-parity` now computes foreground pixel sanity metrics and reports `actualTemplatePixelSuspect=1` for this bad crop.
- DONE: `status:roll20-actual` and `gate:roll20-renderer-action` now expose `chatActualTemplatePixelSuspect` / foreground-pixel blockers so agents do not tune production ChatPane CSS from contaminated evidence.
- DECISION: Reverted the tentative ChatPane `340px` production width change. The live Roll20 DOM supports investigating `340px`, but the screenshot evidence must be recaptured before any production CSS promotion.
- RESULT: Current status remains `rendererReady=NO`. Authoritative normalized chat mismatch is now `2/3` after excluding the contaminated Les crop; authoritative max aligned mismatch is `23.4%`. The suspect-including max remains `91.69%` and must not be used as a CSS target.
- VERIFIED: `corepack pnpm run lint`, `corepack pnpm run build`, `diagnose:roll20-chat-parity`, `status:roll20-actual`, `gate:roll20-renderer-action`, and `guard:roll20-evidence`.
- STILL TODO P0: Recapture Les-Oublies actual chat from a visibly open text chat panel with verified screenshot surface coordinates. Then rerun the full chat parity/status/gate loop before changing ChatPane shell sizing.
- STILL TODO P0: AW2E/YSHY still have authoritative Roll20 chat mismatch; do not claim Roll20 chat parity or all-sheet support.

Follow-up: Narrowed the Roll20 viewport and scrolled the text chat panel so the Les-Oublies `Initiative :` template was visibly captured in ignored local evidence. `diagnose:roll20-chat-parity` now reports `actualTemplatePixelSuspect=0`, but the sidecar is marked with manual coordinate calibration, so `actualCropGeometrySuspect=1` and `NEEDS_AUTHORITATIVE_CAPTURE` is still correct. Current `status:roll20-actual`: `chatAuthoritativeNormalizedHighMismatch=2`, `chatActualCropGeometrySuspect=1`, `chatMaxAlignedMismatch=65.02%`, `rendererReady=NO`.

Follow-up status hardening: `status:roll20-actual` now reports `GENERATED_ACTUAL_SCREENSHOTS_DIFFED_WITH_SUSPECT_CHAT` instead of the overly broad `GENERATED_ACTUAL_SCREENSHOTS_DIFFED` when chat capture suspects remain. Current command output: `generatedAuthoritative=NO`, `chatCaptureSuspects=1`, `actualEvidenceComplete=false`; `--require-actual` correctly exits non-zero until authoritative chat evidence is recaptured.

Follow-up capture-plan hardening: `plan:roll20-chat-capture -- --require-current-metrics` now includes chat parity crop/pixel/scale suspects in its recapture reasons. It currently reports `NEEDS_CAPTURE`, `plannedFixtures=1/3`, with Les-Oublies listed for manual coordinate calibration. This remains the next concrete Roll20 evidence task.

## 2026-06-20 Codex Update - AW2E/Les Roll20 chat current-metric recapture

Status: PARTIAL. Current row/typography evidence is now complete for all three real Roll20 chat fixtures, but Roll20 chat/template parity is still failing.

- DONE: Recaptured AW2E `sheet-rolltemplate-aw` current DOM evidence from the dedicated Roll20 verification Sandbox/editor tab. No existing real room was modified.
- DONE: Recaptured Les-Oublies `sheet-rolltemplate-initiative-roll` current DOM evidence from the same dedicated verification tab. Les upload file-input dispatch ran in the Sandbox Tools, but the manifest target was missing on the visible editor page, so this is treated as chat evidence recapture, not a fresh proven sheet-body activation.
- DONE: Both sidecars now include `latestTemplate.computedStyle`, `latestTemplate.rowMetrics`, `latestTemplate.computedChildren[selector="table"]` computed style/box metrics, `fontEvidence.checks`, and `viewportEvidence.devicePixelRatio`.
- RESULT: `plan:roll20-chat-capture -- --require-current-metrics` reports `ALL_CHAT_EVIDENCE_TRUSTED` with `plannedFixtures=0/3`.
- RESULT: `status:roll20-actual` reports `chatCurrentMetrics=3/3`, `chatCurrentMetricsMissing=0`, `chatActualCaptureScaleSuspect=0`, and `chatActualCropGeometrySuspect=0`.
- RESULT: `diagnose:roll20-chat-parity` still reports `HIGH_MISMATCH`: AW2E `26.78%` raw / `21.49%` aligned, Les-Oublies `17.79%` raw / `17.79%` aligned, YSHY `26.21%` raw / `22.77%` aligned.
- RESULT: `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH` with 2 blockers: chat rolltemplate crops differ for `3/3`, and full-root renderer patch families are still split across fixtures.
- STILL TODO P0: Re-normalize local ChatPane vs actual Roll20 chat shell/template geometry using the new current sidecars. Do not promote production ChatPane CSS while all three chat crops are high mismatch.
- STILL TODO P0: Resolve the split full-root renderer model before returning to edit-mode UX changes.

## 2026-06-20 Codex Update - YSHY Roll20 chat current-metric recapture

Status: PARTIAL. One real Roll20 chat fixture now has current row/typography evidence; Roll20 chat/template parity is still NOT done.

- DONE: Applied YSHY generated HTML/CSS/translation to the dedicated Roll20 Custom Sheet Sandbox/test editor. File-input dispatch succeeded, but Roll20 later showed a translation parse warning; the endpoint fallback to `/sheetsandbox/savesheetsettings` returned `200` for HTML, CSS, and translation.
- DONE: Captured visible `sheet-rolltemplate-coc` evidence from the actual Roll20 chat panel with current DOM sidecar fields: `latestTemplate.computedStyle`, `latestTemplate.rowMetrics`, table computed style, table box metrics, `fontEvidence.checks`, and `viewportEvidence.devicePixelRatio`.
- FIXED CAPTURE PROCEDURE: The first CDP crop used CSS coordinates and captured the wrong Sandbox Tools region on a DPR `1.25` tab. The accepted capture used DPR-multiplied physical coordinates, then downscaled back to CSS pixel size and recorded the correction in the sidecar.
- RESULT: `plan:roll20-chat-capture -- --require-current-metrics` now plans `2/3` fixtures instead of `3/3`; YSHY is no longer a current-metric blocker.
- RESULT: Current status reports `chatCurrentMetrics=1/3`, `chatCurrentMetricsMissing=2`, `chatActualCaptureScaleSuspect=0`, `chatActualCropGeometrySuspect=0`, and `chatMaxAlignedMismatch=22.77%`.
- STILL TODO P0: Recapture AW2E and Les-Oublies with same-action current-metric sidecars. Do not synthesize simplified chat commands just to make the metric count green; the rolltemplate screenshot must remain comparable to local smoke evidence.
- STILL TODO P0: YSHY itself still has a high chat mismatch (`26.21%` raw, `22.77%` aligned). Treat the new sidecar as root-cause evidence, not parity.

## 2026-06-20 Codex Update - Status/gate now surface stale Roll20 chat sidecars

Status: PARTIAL. Roll20 chat/template parity is still NOT done; the status and renderer gate now expose the stale-sidecar blocker directly.

- DONE: `status:roll20-actual` now reads each fixture's `roll20-chat-dom-evidence.json` and reports whether current row/typography fields are present.
- RESULT: Current run reports `chatCurrentMetrics=0/3` and `chatCurrentMetricsMissing=3` for AW2E, Les-Oublies, and YSHY. The old chat screenshots are normalized enough for crop comparison, but their DOM sidecars predate the current row/typography probe.
- DONE: `gate:roll20-renderer-action` now adds a blocker when current Roll20 chat sidecars lack `latestTemplate.computedStyle`, `latestTemplate.rowMetrics`, table computed style, table box metrics, `fontEvidence.checks`, or `viewportEvidence.devicePixelRatio`.
- RESULT: Renderer gate remains `HOLD_PRODUCTION_RENDERER_PATCH` with 3 blockers: YSHY/local ChatPane mismatch, stale current-metric chat sidecars, and split renderer patch family.
- STILL TODO P0: Recapture Roll20 chat for all 3 fixtures, prioritizing YSHY `sheet-rolltemplate-coc`, using the `--require-current-metrics` capture plan. Then rerun screenshot diff, chat parity, renderer gate, and status before changing production ChatPane CSS.

## 2026-06-20 Codex Update - Current-metric Roll20 chat recapture gate

Status: PARTIAL. Roll20 chat/template parity is still NOT done; the next real recapture blocker is now encoded in tooling.

- DONE: Added `--require-current-metrics` to `plan:roll20-chat-capture`. It now treats a Roll20 chat sidecar as stale when it lacks current renderer-diagnostic fields: `latestTemplate.computedStyle`, `latestTemplate.rowMetrics`, table computed style, table box metrics, `fontEvidence.checks`, and `viewportEvidence.devicePixelRatio`.
- RESULT: `plan:roll20-chat-capture -- reports/.../2026-06-18-state-map-v1 yshy-commission-1bu --require-current-metrics` now reports `NEEDS_CAPTURE` even though the old YSHY screenshot/sidecar pair exists, because the sidecar predates the current row/typography probe.
- RESULT: Running the same plan across all fixtures reports AW2E, Les-Oublies, and YSHY as needing current-metric recapture. This reconciles the prior contradiction where `status:roll20-actual` accepted chat evidence while `diagnose:roll20-chat-rows` said `NEEDS_RECAPTURE`.
- STILL TODO P0: Load/reroll YSHY in the dedicated Roll20 Sandbox/test room, capture `roll20-chat.png` and `roll20-chat-dom-evidence.json` from the same `sheet-rolltemplate-coc` action, and rerun screenshot diff, chat parity, renderer gate, and status.

## 2026-06-20 Codex Update - Roll20 shell typography candidate rejected

Status: PARTIAL. Roll20 chat/template parity is still NOT done; one live-style hypothesis is now reproducibly rejected.

- DONE: Added diagnostic-only `--chat-typography-policy roll20-shell-typography` to local `rolltemplate_chat_smoke` and ChatPane. It applies the observed Roll20 shell typography (`13.65px`, normal letter spacing, Proxima stack) to rolltemplate roots/tables only when explicitly enabled through localStorage/smoke args.
- RESULT: Fresh default local smoke remains functional PASS for AW2E, Les-Oublies, and YSHY and compares to actual Roll20 at raw mismatches AW2E `12.78%`, Les-Oublies `10.09%`, YSHY `28.36%`.
- REJECTED: Fresh shell-typography candidate is also functional PASS but worsens pixels: AW2E `13.09%`, Les-Oublies `10.09%`, YSHY `30.52%`. Do not promote this as production ChatPane behavior.
- INTERPRETATION: The live Roll20 shell font-size/letter-spacing mismatch is real, but direct shell typography override is not the missing renderer model. Continue investigating YSHY text/highlight/shadow compositing and actual `sheet-rolltemplate-coc` recapture instead.
- STILL TODO P0: Recapture/probe YSHY `sheet-rolltemplate-coc` in actual Roll20 with current typography/row fields, then compare same-moment sidecar and screenshot before changing production ChatPane CSS.

## 2026-06-20 Codex Update - Live chat typography probe classified

Status: PARTIAL. Roll20 chat/template parity is still NOT done; this batch prevents a live probe from being misread as the wrong fixture.

- DONE: Added `diagnose:roll20-chat-live-typography`, which compares a read-only live Roll20 typography probe against the latest local `rolltemplate_chat_smoke` metrics and maps the selected rolltemplate class to a known fixture.
- DONE: Added `--expect-fixture <fixture-id>` to the live typography diagnostic so an intended YSHY probe fails loudly if the selected live card is actually AW2E or another fixture.
- RESULT: The current ignored live probe at `reports/.../chat-row-geometry/yshy-live-typography-probe.json` selected `sheet-rolltemplate-aw`, so it maps to `official-roll20-AW2E`, not YSHY. The filename is misleading local evidence and must not be used to explain the YSHY `sheet-rolltemplate-coc` mismatch.
- RESULT: For that AW2E-like probe, template size matches local (`267x189`, delta `0x0`) but the table is wider in actual Roll20 by `33.134px` (`326.391px` local vs `359.525px` actual). Actual Roll20 DPR was `1.25`.
- RESULT: Main style deltas in the AW2E-like probe are Roll20 shell typography: local template/table `font-size=12px`, `letter-spacing=-0.16px`; actual `font-size=13.65px`, `letter-spacing=normal`. This is live DOM/style evidence only, not pixel parity.
- BROWSER OBSERVED: The current `Codex Roll20 Verify` editor tab contains 2 visible `sheet-rolltemplate-aw` cards and 0 `sheet-rolltemplate-coc` cards, so current Chrome state cannot recapture YSHY typography without loading/running YSHY again in the Sandbox/test room.
- STILL TODO P0: Recapture or probe the actual YSHY `sheet-rolltemplate-coc` card with the current typography/row sidecar fields before changing production ChatPane CSS for YSHY.
- STILL TODO P0: Production renderer gate remains `HOLD_PRODUCTION_RENDERER_PATCH`; no Roll20 visual parity claim is allowed.

## 2026-06-20 Codex Update - Chat mismatch breakdown and text-AA candidate

Status: PARTIAL. Roll20 chat/template parity is still NOT done, but the YSHY mismatch is now classified more precisely.

- FOLLOW-UP RESULT: Tested a Roll20 shell/root-font candidate after live Chrome read-only style inspection showed actual YSHY root/table inherit `13.65px` Proxima while local custom rolltemplate root used app-added `text-xs`/`12px`.
- FOLLOW-UP RESULT: Removing the app-added rolltemplate `text-xs`, with and without matching Proxima shell inheritance, did not improve the decisive aligned metric. It moved Les-Oublies raw below the high threshold but worsened AW2E and YSHY aligned comparison (`AW2E 7.49% -> 8.96%`, `YSHY 22.46% -> 22.54%` in the combined candidate).
- DECISION: Do not promote the shell/root-font candidate yet. The live style mismatch is real, but pixel parity needs a narrower fix that does not regress AW2E/YSHY aligned crops.
- FOLLOW-UP RESULT: Added diagnostic-only `--chat-shadow-policy no-template-shadow`. This reduced YSHY raw/aligned mismatch from `28.36%/22.46%` to `27.09%/21.14%` while AW2E and Les-Oublies stayed at `12.78%/7.49%` and `10.09%/9.14%`.
- DECISION: Keep shadow suppression diagnostic-only. Actual Roll20 computed style still has the 16-layer dark text-shadow, so this is evidence that local shadow/font compositing contributes to the dark-pixel gap, not a production-safe renderer patch.
- REJECTED: A `soft-template-shadow` candidate reduced YSHY similarly (`27.11%` raw) but regressed AW2E and Les-Oublies (`14.98%`, `11.44%`) and raised aligned high mismatch from `1/3` to `2/3`. It was not kept.
- DONE: Added highlight/shadow mask metrics to `diagnose:roll20-chat-parity`. Current default shows YSHY highlight pixels have an `85.92%` mismatch ratio and shadow-candidate pixels account for `59.54%` of best-aligned mismatches, confirming the remaining YSHY problem is concentrated around text mask/shadow compositing.
- DONE: Added mask geometry deltas. Current default shows AW2E/Les highlight centroid deltas are under 1px, while YSHY highlight centroid is `+3.36px x / -20.72px y` and local highlight pixel count is `6256` vs actual `12222`. This points to YSHY text mask/rasterization placement and intensity, not a global chat crop issue.
- RESULT: Re-ran existing candidates with the mask geometry diagnostic. `no-template-shadow` is the only candidate that improves YSHY without touching AW2E/Les (`YSHY 22.46% -> 21.14%` aligned, highlight centroid y delta `-20.72px -> -16.15px`). `font-fallback` increases local highlight count (`6256 -> 8276`) but worsens YSHY aligned mismatch to `27.93%` and shadow mismatch share to `73.73%`.
- DONE: Added `diagnose:roll20-chat-candidates` to compare default/no-shadow/font-fallback/text-AA/soft-shadow candidates sequentially without manual report overwrite mistakes. Latest output goes to ignored `reports/.../chat-candidate-comparison/`.
- REJECTED: `font-fallback + no-template-shadow` was tested. It increased local YSHY highlight pixels (`8853` vs actual `12175`) but worsened raw/aligned mismatch to `30.82%/26.74%` and pushed shadow mismatch share to `74.61%`, so it is kept only as a rejected candidate in the comparison table.
- DONE: Added row/cell geometry capture to local smoke and future Roll20 chat capture sidecars, plus `diagnose:roll20-chat-rows`. Current actual sidecars correctly report `NEEDS_RECAPTURE` because they predate rowMetrics; next Roll20 recapture can compare row top/height/cell deltas directly.
- LIVE PROBE: Read-only Chrome probe on the dedicated Roll20 verification tab saved ignored `chat-row-geometry/yshy-live-row-probe.json`. YSHY actual-vs-local row top/height deltas are effectively zero (`topRelDelta -0.003px`, `heightDelta 0px` for rows 0-6), while row/table width differs by `24.309px` (`1272.859px` local vs `1248.55px` actual). Treat the remaining YSHY chat mismatch as width/font/shadow compositing, not vertical row geometry collapse. This probe is local-only and not a same-moment screenshot sidecar.
- DIAGNOSTIC RESULT: Added diagnostic-only chat geometry policies and compared `tight-cell-spacing` / `table-scale-x`. `tight-cell-spacing` is rejected for now (`YSHY 28.36%/22.46% -> 29.54%/24.09%`). `table-scale-x` is a useful clue (`YSHY 28.36%/22.46% -> 25.84%/20.75%`, AW2E/Les raw also slightly lower), but it is not production-safe because actual Roll20 computed style does not include a table transform and the gate would still hold with high mismatch. Candidate comparison now restores the default chat parity diagnostic after running candidates so status/gate do not accidentally read the last experimental report.
- DONE: Expanded local smoke and future Roll20 chat capture sidecars with typography/table metrics: `fontStretch`, `fontKerning`, `fontVariantLigatures`, `letterSpacing`, `borderCollapse`, `borderSpacing`, `tableLayout`, `transformOrigin`, `zoom`, element `offset/client/scroll` box metrics, and viewport DPR/scale. Latest local YSHY metric records table `letterSpacing=-0.16px`, `borderSpacing=2px`, `tableLayout=auto`, `transform=none`, `zoom=1`, DPR `1`; actual Roll20 sidecars still need recapture before these fields can explain the remaining 24px table-width delta.
- DONE: Added luma/row/column mismatch breakdown to `diagnose:roll20-chat-parity` so chat diffs are not only a single percentage. The markdown table now includes bright mismatch share, dark mismatch share, and worst row band.
- DONE: Added diagnostic-only `__r20ChatTextPolicy=roll20-auto-aa` support in ChatPane and `rolltemplate_chat_smoke --chat-text-policy roll20-auto-aa`.
- RESULT: `roll20-auto-aa` did not change the current local-vs-actual PNG mismatch numbers. Default and candidate both report AW2E `12.78%/7.49%`, Les-Oublies `10.09%/9.14%`, and YSHY `28.36%/22.46%` raw/aligned.
- RESULT: YSHY best-aligned mismatch is mostly bright text/highlight pixels, not a missing large background: bright mismatch share `63.34%`, dark share `24.16%`, mid-tone share `12.50%`. Bright mismatches have local luma lower than actual by `-44.347` on average.
- RESULT: Les-Oublies mismatch is almost entirely bright pixels (`97.91%` share). AW2E is also bright-dominant (`72.40%`) but much lower after alignment.
- DECISION: Do not promote text antialiasing policy to production behavior. Keep the switch diagnostic-only.
- STILL TODO P0: Compare actual/local computed text-shadow color, opacity, transform/scale, device pixel ratio, and chat screenshot compositing for YSHY. The current best evidence points to text/highlight rendering brightness rather than Roll20 user CSS absence.
- STILL TODO P0: Production renderer gate remains `HOLD_PRODUCTION_RENDERER_PATCH` because YSHY chat crop still differs after alignment and the sheet-root renderer patch family is split across fixtures.

## 2026-06-20 Codex Update - Chat font fallback candidate rejected

Status: PARTIAL. A concrete YSHY font hypothesis was tested and rejected for production.

- DONE: Added a diagnostic-only chat font policy switch. `rolltemplate_chat_smoke --chat-font-policy roll20-chat-fallback` strips ChatPane rolltemplate `@font-face` rules and suppresses preview user-font registration at the app document level.
- DONE: Rebuilt the app and compared default vs `roll20-chat-fallback` screenshots against the same Roll20 actual evidence.
- RESULT DEFAULT: YSHY raw mismatch `28.36%`, aligned `22.46%`; AW2E raw/aligned `12.78%/7.49%`; Les raw/aligned `10.09%/9.14%`.
- RESULT FALLBACK: YSHY raw mismatch worsened to `31.85%`, aligned `27.93%`. It made the first YSHY label cell width closer to actual (`15.8594px -> 14.8281px`, actual `14.95px`) but harmed the overall pixels.
- DECISION: Do not promote chat font fallback as production behavior. Keep it as a diagnostic switch only.
- STILL TODO P0: YSHY mismatch is not explained by font availability alone. Next candidate should target screenshot/crop text-antialiasing or Roll20 chat page-scale/rendering differences without changing the production renderer globally.

## 2026-06-20 Codex Update - YSHY chat font evidence added

Status: PARTIAL. Root cause narrowed; parity is still NOT done.

- DONE: Added computed-style evidence to future Roll20 chat DOM probe sidecars and local `rolltemplate_chat_smoke` reports. The recorded fields include template/table/caption/td/inlineroll style, rects, background image, line-height, font family, and text-shadow.
- DONE: Added font availability checks for `BookkMyungjo-Bd` and generic sans-serif to both the Roll20 capture plan snippet and local smoke output.
- FOUND: In the live Roll20 YSHY tab, `.sheet-rolltemplate-coc` CSS is present and computed styles mostly match local, but `document.fonts.check("700 12px BookkMyungjo-Bd")` is `false`. Local smoke currently reports the same font checks as `true`.
- FOUND: Actual Roll20 YSHY first label cell is narrower than local (`14.95px` computed width actual vs `15.8594px` local) while line-height and text-shadow match. This points toward font availability/rendering metrics, not a missing rolltemplate CSS rule.
- CURRENT: This batch does not yet change production ChatPane font behavior because the first font-face removal experiment did not change the current screenshot numbers. A safer next step is to add a Roll20-chat-font policy switch or diagnostic candidate and compare it across AW2E/Les/YSHY before promoting it.
- STILL TODO P0: build a controlled local candidate that mimics actual Roll20 chat font availability for YSHY without regressing AW2E/Les, then rerun smoke/diagnose/status/gate.

## 2026-06-20 Codex Update - Chat parity aligned diagnostic stabilized

Status: PARTIAL. Roll20 chat/template parity is closer and the reports now agree, but renderer readiness is still NOT done.

- DONE: Local ChatPane now waits for rolltemplate background images and fonts before smoke screenshots. This fixed the false mostly-blue AW2E local capture caused by screenshotting before the remote background decoded.
- DONE: ChatPane rolltemplate extraction now preserves simple `@font-face` blocks and keeps font asset URLs direct instead of proxying them through Roll20 image proxy URLs. `@import` is intentionally still excluded because an inline import attempt broke Les-Oublies rolltemplate application.
- DONE: ChatPane rolltemplate box model moved closer to actual Roll20 chat evidence (`content-box`, `line-height:17.0625px`). YSHY local template height moved from the earlier `554px` drift to `586px`, matching the actual `585px` height within 1px.
- DONE: `diagnose:roll20-chat-parity` now reports both raw mismatch and small-offset aligned mismatch. `status:roll20-actual` and `gate:roll20-renderer-action` now use the same aligned high-mismatch boundary so status, gate, and diagnostic no longer contradict each other.
- CURRENT: `chatNormalizedCompared=3/3`, `chatActualCropGeometrySuspect=0`, `chatNormalizedHighMismatch=3`, `chatAlignedHighMismatch=1`, `chatAuthoritativeNormalizedHighMismatch=1`, `rendererReady=NO`.
- CURRENT RAW/ALIGNED: AW2E `12.78% -> 7.49%` at offset `1,0`; Les-Oublies `10.09% -> 9.14%` at offset `-5,0`; YSHY `28.36% -> 22.46%` at offset `4,-2`.
- CLASSIFICATION: AW2E and Les-Oublies are now mostly crop/anti-alias/small-offset level, not proven parity. YSHY remains the real chat/template mismatch target. Renderer action is still `HOLD_PRODUCTION_RENDERER_PATCH` because the sheet-root renderer patch family is also split across fixtures.
- VERIFIED THIS BATCH: `diagnose:roll20-chat-parity`, `status:roll20-actual`, and `gate:roll20-renderer-action` reran successfully on `reports\roll20-actual-compare\2026-06-18-state-map-v1`.
- STILL TODO P0: reduce YSHY rolltemplate aligned mismatch, then resolve the split production renderer model (`AW2E=none`, Les/YSHY=`inline-block+text-input-height`) before returning to edit-mode UX.

## 2026-06-20 Codex Update - Roll20 chat element-bound recapture

Status: PARTIAL. The chat evidence is finally geometry-authoritative, but parity is still NOT done.

- DONE: Recaptured AW2E, Les-Oublies, and YSHY Roll20 chat screenshots from live Roll20 Sandbox/editor tabs using element-bound CDP clips. Evidence stays local-only and ignored under `reports/roll20-actual-compare/...`.
- DONE: `diagnose:roll20-chat-parity` now reports `actualCropGeometrySuspect=0`, replacing the previous suspect coordinate-calibrated state.
- CURRENT: `chatNormalizedCompared=3/3`, `chatAuthoritativeNormalizedHighMismatch=2`, `rendererReady=NO`.
- CURRENT MISMATCHES: AW2E `64.49%`, Les-Oublies `8.41%`, YSHY `33.53%`.
- CLASSIFICATION: Les-Oublies is now below high-mismatch threshold after proper crop. AW2E still fails because local ChatPane background/table rendering differs badly. YSHY still fails because actual Roll20 template height is `585px` while local is `554px`.
- NEXT P0: fix AW2E rolltemplate background/table rendering, then investigate YSHY line-height/table/body height drift. Edit-mode UX remains blocked behind real Roll20 preview/chat parity work.

## 2026-06-20 Codex Update - Chat crop evidence tightened

Status: PARTIAL. The comparison pipeline is stricter and less misleading, but Roll20 chat parity is still NOT done.

- DONE: Local rolltemplate smoke screenshots now use element screenshots, not viewport clips. This fixes local template PNG truncation (`255px` stale captures vs `279px` DOM width).
- DONE: Local ChatPane rolltemplate message width is now `328px`, producing `267px` template crops for Les-Oublies and YSHY, matching the current actual Roll20 crop width.
- DONE: Chat parity diagnostics/gate/status now split `normalizedHighMismatch` from `authoritativeNormalizedHighMismatch` and track `actualCropGeometrySuspect`.
- VERIFIED: `corepack pnpm run build`, `corepack pnpm run lint`, `node scripts\rolltemplate_chat_smoke.mjs --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports\rolltemplate-chat-smoke --port 4452`, `corepack pnpm run diagnose:roll20-chat-parity -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `corepack pnpm run gate:roll20-renderer-action -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, and `corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1`.
- CURRENT: `diagnose:roll20-chat-parity` now reports `NEEDS_AUTHORITATIVE_CAPTURE`, `actualCropGeometrySuspect=3`, and `authoritativeNormalizedHighMismatch=0`. This means the current Roll20 chat PNGs are not safe to use for renderer tuning.
- STILL TODO P0: recapture Roll20 chat evidence with element-bound template screenshots and fresh DOM sidecars. Do not claim Roll20 chat parity and do not tune production renderer CSS from the current coordinate-calibrated/relocated chat PNGs.

## 2026-06-20 Codex Update - ChatPane Roll20 shell/resource alignment

Status: PARTIAL. This improves local Roll20 chat reproduction, but visual/chat parity is still NOT done.

- DONE: `components/editor/ChatPane.tsx` now rewrites rolltemplate CSS external `url(...)` assets through the Roll20 image proxy shape and preserves Roll20-hosted/direct-safe URLs. This fixed local rolltemplate smoke resource failures; latest resource issues are `0/3`.
- DONE: Local ChatPane no longer forces `withoutavatars`; it uses the avatar-on Roll20 chat shell seen in actual Roll20 evidence.
- DONE: Local rolltemplate card/message shell now uses the observed Roll20 chat width baseline of `340px` and no longer clamps rolltemplate wrappers with `max-width:100%` inside the padded message body.
- VERIFIED: `corepack pnpm run build`, `node scripts\rolltemplate_chat_smoke.mjs --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/rolltemplate-chat-smoke --port 4452`, `corepack pnpm run diagnose:roll20-chat-parity -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `corepack pnpm run gate:roll20-renderer-action -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, and `corepack pnpm run lint` ran successfully.
- CURRENT: Chat parity remains failing, but improved. Max normalized mismatch is now `48.73%` instead of `63.95%`; AW2E improved to `37.95%`, Les-Oublies is `26.92%`, and YSHY is `48.73%`.
- STILL TODO: compare local/actual using the same crop scope. Current local smoke captures template-only regions while several actual Roll20 evidence images include chat shell/left strip or vertical crop drift. Do not claim parity until crop normalization and renderer gate pass.

## 2026-06-20 Codex Update - AW2E chat normalized, parity still failing

Status: PARTIAL. The AW2E missing normalized Roll20 chat evidence blocker is closed, but Roll20 chat/renderer parity is still NOT done.

- VERIFIED: The dedicated Roll20 Custom Sheet Sandbox/editor was used, not an existing real room. AW2E produced actual Roll20 `.sheet-rolltemplate-aw` chat DOM from a real sheet roll button/macro-option flow.
- VERIFIED: `official-roll20-AW2E` now has local-only ignored `roll20-chat.png` plus `roll20-chat-dom-evidence.json` with normalized rolltemplate metadata. The capture sidecar explicitly marks the temporary `#rightsidebar` relocation used only to work around Chrome/Roll20 screenshot compositor behavior; this is style/parity evidence, not geometry proof.
- VERIFIED: `corepack pnpm run diagnose:roll20-chat-parity -- reports\roll20-actual-compare\2026-06-18-state-map-v1` reports `compared=3`, `normalizedCompared=3`, `normalizedHighMismatch=3`.
- VERIFIED: `corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1` reports `generatedActualScreenshots=6/6`, `generatedDiffed=6/6`, `trustedFullRoot=3/3`, `reliableTrustedFullRoot=3/3`, `chatNormalizedCompared=3/3`, `chatNeedsNormalizedCapture=0`, `chatNormalizedHighMismatch=3`, and `rendererReady=NO`.
- CURRENT: `corepack pnpm run gate:roll20-renderer-action -- reports\roll20-actual-compare\2026-06-18-state-map-v1` remains `HOLD_PRODUCTION_RENDERER_PATCH`. Remaining blockers are chat crop mismatch for 3/3 normalized fixtures and split renderer patch families (`AW2E=none`, Les/YSHY=`inline-block+text-input-height`).
- CURRENT MISMATCHES: AW2E `63.95%`, Les-Oublies `27.61%`, YSHY `46.39%`. This proves Roll20 chat parity is still false.
- NEXT P0: align local ChatPane/rolltemplate shell sizing and crop normalization against this complete actual evidence set. Do not claim Roll20 visual parity and do not promote production renderer CSS until the gate passes.

## 2026-06-20 Codex Update - Les/YSHY chat evidence normalized, AW2E still blocked

Status: PARTIAL. Roll20 actual-screen evidence improved, but Roll20 chat/renderer parity is still NOT done.

- Normalized local-only Roll20 chat evidence now exists for `official-roll20-Les-Oublies` and `yshy-commission-1bu`; `official-roll20-AW2E` remains `FOREGROUND_SUSPECT`.
- Current measured status: `PARTIAL_GENERATED_ACTUAL_SCREENSHOTS`, `generatedActualScreenshots=5/6`, `generatedDiffed=5/6`, `trustedFullRoot=3/3`, `reliableTrustedFullRoot=3/3`, `chatNormalizedCompared=2/3`, `chatNeedsNormalizedCapture=1`, `chatNormalizedHighMismatch=2`, `rendererReady=NO`.
- Current measured chat crop mismatches: `official-roll20-Les-Oublies=27.61%`, `yshy-commission-1bu=46.39%`; these are failures, not parity claims.
- Tried to inspect/capture the open AW2E Roll20 editor tab through Chrome, but the Roll20 tab calls repeatedly timed out. Existing AW2E `roll20-chat.png` was visually inspected and shows overlapping sheet/dialog content rather than a trustworthy foreground chat crop, so it must not be promoted.
- Hardened Roll20 evidence readers against UTF-8 BOM in `roll20-chat-dom-evidence.json` and related report JSON files. This prevents PowerShell-authored local sidecars from being silently treated as missing/old evidence by Node scripts.
- Verification: `node --check` for changed Roll20 scripts PASS, `plan:roll20-chat-capture` reports `plannedFixtures=1/3`, `diagnose:roll20-chat-parity` reports `normalizedCompared=2/3`, `status:roll20-actual` reports `generatedActualScreenshots=5/6`, `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH`, and `guard:roll20-evidence` PASS.
- NEXT P0: recapture `official-roll20-AW2E` foreground chat/rolltemplate evidence from a responsive Roll20 Sandbox/test-room state, then rerun screenshot diff, chat parity diagnostics, status, and renderer gate. Do not tune production ChatPane/renderer CSS until that evidence exists.

## 2026-06-20 Codex Update - Roll20 chat evidence foreground correction

Status: PARTIAL. This corrects a false-positive evidence claim; Roll20 chat parity is still NOT done.

- Visual inspection of the current `roll20-chat.png` files showed they captured overlapping character/dialog sheet content, not the foreground Roll20 chat/template area. The previous `chatActualCaptureScaleSuspect=0` was not enough to prove correct foreground capture.
- Hardened `scripts/roll20_chat_capture_plan.mjs`, `scripts/roll20_actual_status.mjs`, `scripts/roll20_upload_handoff.mjs`, and `scripts/roll20_chat_parity_diagnostics.mjs` so older sidecars without `chatElementSelector` are `FOREGROUND_SUSPECT` / `NEEDS_NORMALIZED_CAPTURE`.
- Re-ran the active status: `PARTIAL_GENERATED_ACTUAL_SCREENSHOTS`, `generatedActualScreenshots=3/6`, `generatedDiffed=3/6`, `chatNormalizedCompared=0/3`, `chatNeedsNormalizedCapture=3`, and missing chat evidence for AW2E, Les-Oublies, and YSHY as `chat-screenshot-foreground-suspect`.
- Re-ran the renderer gate: production renderer patch remains `HOLD`, now blocked by incomplete generated-sheet actual evidence and missing trustworthy Roll20 chat screenshots rather than by a misleading 3/3 high-mismatch comparison.
- Local ChatPane smoke was corrected to separate functional errors from external resource 403s. Latest `node scripts\rolltemplate_chat_smoke.mjs --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/rolltemplate-chat-smoke --port 4452` PASS for all three fixtures; AW2E/YSHY still record resource issues separately.
- Verification: `node --check` for changed scripts PASS, `corepack pnpm run test:roll20-chat-capture-plan` PASS, `plan:roll20-chat-capture` reports `plannedFixtures=3/3`, `diagnose:roll20-chat-parity` reports `NEEDS_NORMALIZED_CAPTURE`, `status:roll20-actual` reports `PARTIAL_GENERATED_ACTUAL_SCREENSHOTS`, `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH`, `guard:roll20-evidence` PASS, `corepack pnpm run lint` PASS, and `corepack pnpm run build` PASS.
- NEXT P0: recapture actual Roll20 chat foreground with the current DOM probe, preferably targeting `#textchat` or `.textchatcontainer` rather than broad `#rightsidebar`, then rerun diff/status/gate before tuning ChatPane CSS.

## 2026-06-20 Codex Update - Roll20 upload snippet Ace manifest and chat probe hardening

Status: PARTIAL. Upload/capture tooling is more trustworthy; Roll20 visual/chat parity is still NOT done.

- Fixed `scripts/roll20_upload_snippet.mjs` so generated Roll20 Sandbox/settings snippets update the observed Roll20 Ace editor instance `editors.json` as well as `customcharsheet_json` textareas. This closes the stale-manifest path where the settings page could still save the previous fixture even after the textarea looked updated.
- Generated snippet results now report `aceJsonSet`, `editorKeys`, and manifest `valueLength` so future Roll20 upload logs can prove whether the real settings editor was touched.
- Hardened the generated `plan:roll20-chat-capture` DOM probe so it picks a visible chat root from `#textchat`, `.textchatcontainer`, then `#rightsidebar`, and records both `chatSelector` and `chatElementSelector`. This reduces future clip/sidecar mismatches.
- Current measured status after the latest trusted captures: `generatedActualScreenshots=6/6`, `generatedDiffed=6/6`, `trustedFullRoot=3/3`, `reliableTrustedFullRoot=3/3`, `chatNormalizedCompared=3/3`, `chatNeedsNormalizedCapture=0`, `chatActualCaptureScaleSuspect=0`, `chatNormalizedHighMismatch=3`, `rendererReady=NO`, `rendererAction=HOLD_PRODUCTION_RENDERER_PATCH`.
- Current measured chat parity is failing, not passing: all 3 normalized fixtures are high mismatch, with max normalized mismatch `94.44%`. The next P0 is fixing local ChatPane / rolltemplate shell sizing and template rendering against the now-trusted actual Roll20 evidence.
- Verification: `node --check scripts\roll20_upload_snippet.mjs`, `node --check scripts\roll20_chat_capture_plan.mjs`, `corepack pnpm run test:roll20-chat-capture-plan`, `corepack pnpm run snippet:roll20-upload -- reports\roll20-actual-compare\2026-06-18-state-map-v1 yshy-commission-1bu`, generated snippet `node --check`, `corepack pnpm run plan:roll20-chat-capture -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `corepack pnpm run diagnose:roll20-chat-parity -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `corepack pnpm run gate:roll20-renderer-action -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `corepack pnpm run guard:roll20-evidence -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `corepack pnpm run lint`, and `corepack pnpm run build` PASS.

## 2026-06-20 Codex Update - AW2E chat recaptured as true PNG 1x

Status: PARTIAL. One evidence-quality blocker closed; Roll20 visual/chat parity is still NOT done.

- Recaptured `official-roll20-AW2E` Roll20 chat evidence from the dedicated `Codex Roll20 Verify` Sandbox editor as true PNG with CDP `Page.captureScreenshot` and `clip.scale=1`.
- Saved same-moment local-only ignored evidence beside the fixture: `roll20-chat.png` and `roll20-chat-dom-evidence.json`. These files remain under ignored `reports/` and must not be committed.
- Current measured plan improved from `plannedFixtures=2/3` to `plannedFixtures=1/3`.
- Remaining recapture target: `yshy-commission-1bu` is still `SCALE_OR_FORMAT_SUSPECT`; the older `roll20-chat-cdp-test.png` is PNG but captured at devicePixelRatio scale, not CSS 1x, so it must not be promoted as proof.
- Tried applying YSHY HTML/CSS/translation in the dedicated Sandbox editor: file-input dispatch and endpoint fallback returned success, local payload validation passed, and the sandbox body text did not show a translation parse error, but opening existing characters still produced no `.charactersheet` / `.charsheet` root or roll buttons.
- Next P0: make YSHY render in the dedicated Sandbox or another verified test room, then click a real `roll_str_check`-style button and recapture `roll20-chat.png` as true PNG CSS 1x with matching DOM sidecar.

## 2026-06-20 Codex Update - Chat capture plan now rejects JPEG/0.8x evidence

Status: PARTIAL. The recapture plan is more truthful; Roll20 chat visual parity is still NOT done.

- Updated `plan:roll20-chat-capture` so it rejects actual Roll20 chat screenshots when the file bytes are not PNG or when the screenshot scale is not CSS 1x against the recorded clip.
- Current measured plan: `plannedFixtures=2/3`, `snippetSyntax=PASS`.
- Current recapture targets: `official-roll20-AW2E` and `yshy-commission-1bu` are `SCALE_OR_FORMAT_SUSPECT` because their `roll20-chat.png` files are JPEG bytes captured at about `0.8x`.
- Current non-recapture fixture: `official-roll20-Les-Oublies` has true PNG 1x chat evidence, but still has a `29.21%` local-vs-actual rolltemplate crop mismatch.
- Next P0: recapture AW2E and YSHY chat crops through CDP `Page.captureScreenshot` with `format=png` and `clip.scale=1`, then rerun `diagnose:roll20-chat-parity`, `status:roll20-actual`, and `gate:roll20-renderer-action`.

## 2026-06-20 Codex Update - Chat capture scale gate added

Status: PARTIAL. Evidence quality improved; Roll20 chat visual parity is still NOT done.

- Found that AW2E and YSHY Roll20 chat evidence files are JPEG bytes saved with a .png filename and captured at about 0.8x CSS scale; Les-Oublies was recaptured as true PNG at 1x via CDP.
- Updated chat parity diagnostics to report local/actual image format, actual screenshot scale, actual source crop, and compared size.
- Updated renderer/status gates so non-PNG or non-1x actual chat captures are explicit blockers before using pixel mismatch as a production ChatPane/CSS target.
- Current measured status: chatNormalizedCompared=3/3, chatNeedsNormalizedCapture=0, chatActualCaptureScaleSuspect=2, rendererAction=HOLD_PRODUCTION_RENDERER_PATCH, rendererBlockers=3, rendererReady=NO.
- Current measured chat crop mismatches after Les 1x PNG recapture: AW2E=95.13% (JPEG 0.8x evidence), Les-Oublies=29.21% (PNG 1x evidence), YSHY=38.25% (JPEG 0.8x evidence).
- Next P0: recapture AW2E and YSHY chat crops as true PNG with CDP Page.captureScreenshot format=png and clip.scale=1, then rerun diagnose/status/gate before changing local ChatPane rendering.

## 2026-06-20 Codex Update - Les-Oublies chat normalized evidence captured

Status: PARTIAL. Missing normalized chat evidence is closed; Roll20 chat visual parity is still NOT done.

- Captured fresh local-only Roll20 Sandbox chat evidence for official-roll20-Les-Oublies from the already-open dedicated Codex Roll20 Verify editor. Existing rooms were not modified.
- Corrected the Les capture from stale classic-roll chat evidence to the same visible roll_initiative / initiative-roll action used by local smoke.
- Re-ran chat diagnostics for reports\roll20-actual-compare\2026-06-18-state-map-v1: compared=3/3, normalizedCompared=3/3, chatNeedsNormalizedCapture=0, normalizedHighMismatch=3.
- Current measured chat crop mismatches: official-roll20-AW2E=95.13%, official-roll20-Les-Oublies=33.16%, yshy-commission-1bu=38.25%.
- Current measured status: rendererAction=HOLD_PRODUCTION_RENDERER_PATCH, rendererReady=NO, rendererBlockers=2, generatedActualScreenshots=6/6, generatedDiffed=6/6.
- Updated scripts/roll20_chat_capture_plan.mjs so future DOM probe snippets preserve left/top rect fields and emit latestTemplate as a rolltemplates-compatible cloned object.
- Next P0: fix or further diagnose actual Roll20 rolltemplate/chat shell sizing and template rendering differences now that user rolltemplate CSS is active for 3/3 normalized chat captures.

## 2026-06-20 Codex Update - Rolltemplate crop diagnostic corrected

Status: PARTIAL. Diagnostic accuracy improved; Roll20 visual/chat parity is still NOT done.

- Fixed scripts/roll20_chat_parity_diagnostics.mjs so actual Roll20 chat crop selection prefers latestTemplate when it intersects the screenshot clip, then falls back to the latest in-clip rolltemplate instead of the first stale/offscreen template.
- Re-ran chat diagnostics for reports\roll20-actual-compare\2026-06-18-state-map-v1: compared=2/3, normalizedCompared=2/3, normalizedHighMismatch=2, chatNeedsNormalizedCapture=1.
- Current measured chat crop mismatches: official-roll20-AW2E=95.13%, yshy-commission-1bu=38.25%; official-roll20-Les-Oublies still needs normalized rolltemplate rect/clip metadata.
- Current measured status remains rendererAction=HOLD_PRODUCTION_RENDERER_PATCH, rendererReady=NO, rendererBlockers=3, generatedActualScreenshots=6/6, generatedDiffed=6/6.
- Verified YSHY now selects latestTemplate, class sheet-rolltemplate-coc, intersectsClip=true, so the prior 98.31% mismatch was partly a stale-template diagnostic artifact, not a valid renderer target.
- Next P0: recapture Les-Oublies normalized chat evidence, then classify remaining AW2E/YSHY rolltemplate crop differences before changing production renderer or ChatPane CSS.
## 2026-06-20 Codex Update - Les-Oublies actual recapture still blocked

Status: PARTIAL. Tooling improved; Roll20 visual/chat parity is still NOT done.

- Current measured status after rerun: `generatedActualScreenshots=6/6`, `generatedDiffed=6/6`, `chatNormalizedCompared=2/3`, `chatNeedsNormalizedCapture=1`, `rendererReady=NO`, `rendererAction=HOLD_PRODUCTION_RENDERER_PATCH`, `rendererBlockers=3`.
- Tried to close the remaining Les-Oublies normalized chat gap in the dedicated Roll20 Sandbox only. Existing rooms were not modified.
- Editor file-input snippet dispatch succeeded for HTML/CSS/translation and removed the visible translation parse warning, but reopening the sandbox character still produced a blank character iframe.
- Endpoint fallback POSTs to `/sheetsandbox/savesheetsettings` returned `200` for Les HTML/CSS/translation, and the settings page saved wrapped `customcharsheet_json` with Roll20 success text. This is storage/application evidence only.
- Current session could not reproduce a rendered Les `.charactersheet` root, so no fresh `rolltemplates[].rect` / clip sidecar was captured. Do not count Les chat parity as normalized.
- Updated `scripts/roll20_upload_snippet.mjs` so future generated snippets can explicitly log endpoint fallback attempts with `USE_ENDPOINT_FALLBACK` and `ENDPOINT_CAMPAIGN_ID` while warning that endpoint/file-input success is not render proof.
- Next P0: find a reliable Roll20 activation path for Les in the dedicated sandbox or another verified test sandbox state, then recapture the same-action `roll20-chat.png` + `roll20-chat-dom-evidence.json` with `rolltemplates[].rect`, `clip`, `screenshotClipApplied`, and `chatCssEvidence`.
- Next P0 after that: address the actual chat crop mismatch for AW2E/YSHY (`95.13%` and `98.31%`) and the split renderer model (`AW2E=none`, Les/YSHY=`inline-block+text-input-height`) before touching production renderer CSS.

## 2026-06-19 Codex Update - YSHY actual Roll20 chat recapture completed

Status: PARTIAL overall, but DONE for the missing YSHY generated chat evidence.

- Ran the generated YSHY Roll20 upload fallback in the dedicated `Codex Roll20 Verify` Sandbox editor via CDP. Local validation remained PASS: `translation.json` object with 399 keys, `sheet.json` PASS, settings manifest wrapper PASS.
- Confirmed the Sandbox character iframe changed to the YSHY/CoC Korean sheet after upload by reading visible sheet text such as `근력`, `민첩`, `정신`, `기준치`, and Korean skill rows.
- Clicked a real YSHY roll control (`roll_str_check` candidate after confirming duplicate count) and confirmed Roll20 chat changed from messages `9` to `10`, rolltemplates `1` to `2`.
- Captured fresh ignored local-only `roll20-chat.png` and `roll20-chat-dom-evidence.json` for `yshy-commission-1bu`; normalized `latestTemplate/latestMessage` after browser serialization repeated object references.
- Actual status improved to `GENERATED_ACTUAL_SCREENSHOTS_DIFFED`: generated actual screenshots `6/6`, generated diffs `6/6`.
- Renderer gate remains HOLD, but blockers dropped to 3: Les-Oublies still needs normalized rolltemplate crop metadata, actual Roll20 chat crop differs from local ChatPane for 2/2 normalized fixtures (max `98.31%`), and diagnostic renderer patch is not uniform across fixtures.
- Next P0: recapture or normalize `official-roll20-Les-Oublies` chat DOM sidecar so chat parity becomes normalized `3/3`; then diagnose why Roll20 rolltemplate crop differs from local ChatPane so severely.

## 2026-06-19 Codex Update - YSHY upload snippet validation

Status: PARTIAL. This improves the next Roll20 upload attempt, but does not complete YSHY actual recapture.

- Enhanced `roll20_upload_snippet.mjs` so generated Sandbox upload snippets include local validation for `translation.json`, `sheet.json`, and the settings-page manifest wrapper.
- Generated the YSHY upload snippet locally. Validation result: translation JSON `PASS` (`object`, 399 keys), sheet manifest `PASS`, settings manifest wrapper `PASS`.
- The previous Roll20-visible translation parse warning is therefore not explained by invalid local exported JSON. Next investigation should focus on Sandbox upload/application behavior or stale uploaded state.
- The snippet runtime now logs visible Roll20 Sandbox warning text after dispatching file changes, so the next manual/allowed upload can preserve whether Roll20 still reports a translation parse error.
- Next P0 remains: load YSHY HTML/CSS/translation into the dedicated Roll20 Sandbox, capture fresh `roll20-chat.png` + `roll20-chat-dom-evidence.json`, then rerun screenshot diff, chat parity diagnostics, renderer gate, and status.

## 2026-06-19 Codex Update - Chat probe JSON serialization hardening

Status: DONE for capture-tool hardening, NOT DONE for Roll20 parity.

- Updated `roll20_chat_capture_plan.mjs` so generated DOM probe snippets clone `chatRect`, `clip`, `screenshotClipApplied`, and `screenshotCssClip` instead of reusing the same object reference.
- Extended `test:roll20-chat-capture-plan` to verify JSON serialization and to fail if `[Circular]` appears or clip aliases are lost.
- Re-ran chat capture planning: planned fixtures are now `2/3` (`official-roll20-Les-Oublies`, `yshy-commission-1bu`). `official-roll20-AW2E` no longer needs stale recapture after the previous actual Roll20 evidence update.
- Current chat parity remains high mismatch: AW2E `95.13%`, YSHY `96.93%`; this is evidence against visual parity, not a pass.
- Next P0: recapture YSHY via Roll20 Sandbox Tools after file upload access is available or manual upload is done, then recapture Les-Oublies with normalized crop metadata.

## 2026-06-19 Codex Update - Roll20 actual AW2E chat recapture

Status: PARTIAL. Actual Roll20 parity is still NOT DONE.

- Captured fresh local-only Roll20 chat evidence for `official-roll20-AW2E` under ignored `reports/roll20-actual-compare/2026-06-18-state-map-v1/`.
- Status improved from generated actual screenshots `4/6` to `5/6`; `official-roll20-AW2E` is no longer listed as stale chat evidence.
- New diagnostic result: AW2E normalized rolltemplate chat crop mismatch is `95.13%`, so Roll20 chat visual parity is clearly not achieved.
- Current status still holds production renderer changes: `rendererAction=HOLD_PRODUCTION_RENDERER_PATCH`, `rendererReady=NO`, `rendererBlockers=7`.
- Remaining missing generated evidence: `yshy-commission-1bu:chat:chat-screenshot-dom-stale`.
- Observed Roll20 sandbox warning: `Translation JSON parse error` while the sandbox tools were open. Local exported YSHY/AW2E `translation.json` files parse successfully, so investigate Roll20 upload/settings packaging rather than assuming source JSON is invalid.
- Attempted YSHY sandbox upload through Roll20 file chooser, but Chrome automation returned `Not allowed` on `fileChooser.setFiles`. To continue actual YSHY capture, enable file upload access for the Codex Chrome extension or upload the three local payload files manually in the Roll20 Sandbox Tools: `sheet.html`, `sheet.css`, `translation.json`.

## 2026-06-19 Codex Update - Roll20 chat capture probe self-test

Status: DONE for capture-tool hardening, NOT DONE for actual Roll20 parity.

- Added `test:roll20-chat-capture-plan` to self-test the browser-side Roll20 chat DOM probe before using it for fresh captures.
- The self-test verifies required evidence fields: `clip`, `screenshotClipApplied`, `screenshotCssClip`, `rolltemplates[].rect`, and `chatCssEvidence`.
- Re-ran the active actual-screen status and renderer gate. Result remains `HOLD_PRODUCTION_RENDERER_PATCH` with 7 blockers.
- Next P0 remains actual Roll20 recapture: `official-roll20-AW2E` and `yshy-commission-1bu` need fresh same-moment `roll20-chat.png` + `roll20-chat-dom-evidence.json`; `official-roll20-Les-Oublies` needs normalized rolltemplate crop metadata.
## 2026-06-19 Chat Capture Snippet Metadata Fix

- DONE: strengthened `plan:roll20-chat-capture` snippets so future Roll20 chat sidecars include `rolltemplates[].rect`, top-level `clip`, `screenshotClipApplied`, `screenshotCssClip`, and `chatCssEvidence`.
- DONE: added snippet syntax checks to the plan output; current run reports `snippetSyntax=PASS`.
- WHY: `diagnose:roll20-chat-parity` requires `rolltemplates[].rect` plus `clip` for normalized rolltemplate crop comparison. Without these fields, recaptured chat evidence could still remain `NEEDS_NORMALIZED_CAPTURE`.
- NEXT P0: use the generated snippets with fresh Roll20 chat screenshots for AW2E/YSHY and normalized crop metadata for Les-Oublies, then rerun the chat parity/status gates.
## 2026-06-19 Chat Capture Plan Tool

- DONE: added `corepack pnpm run plan:roll20-chat-capture -- <run> [fixture-id] [--all]` to produce a focused local-only Roll20 chat recapture plan.
- VERIFIED: current plan for `reports\roll20-actual-compare\2026-06-18-state-map-v1` reports `plannedFixtures=3/3`: AW2E and YSHY have stale screenshot/DOM sidecar pairs, while Les-Oublies has fresh chat evidence but still needs normalized rolltemplate crop metadata.
- CURRENT: `status:roll20-actual` now points to the chat capture plan command when generated sheet roots are present but chat evidence is missing/suspect.
- NEXT P0: use the generated plan/snippets to recapture Roll20 chat PNG + DOM sidecar from the same roll action, then rerun screenshot diff, chat parity diagnostics, renderer gate, and status.
- CLAIM BOUNDARY: this is planning/tooling only. It does not prove Roll20 visual parity and does not remove renderer HOLD.
## 2026-06-19 Status Next-Action Correction

- DONE: `status:roll20-actual` now prints fixture-level missing generated targets and no longer collapses current `4/6` generated evidence into a generic file-upload blocker.
- CURRENT: latest status remains `PARTIAL_GENERATED_ACTUAL_SCREENSHOTS`, `generatedActualScreenshots=4/6`, `generatedDiffed=4/6`, `rendererReady=NO`, `rendererBlockers=7`.
- CURRENT MISSING GENERATED TARGETS: `official-roll20-AW2E:chat:chat-screenshot-dom-stale` and `yshy-commission-1bu:chat:chat-screenshot-dom-stale`.
- NEXT P0: recapture `roll20-chat.png` and `roll20-chat-dom-evidence.json` from the same Roll20 roll action for AW2E and YSHY, then rerun `roll20_actual_screenshot_diff`, `diagnose:roll20-chat-parity`, `gate:roll20-renderer-action`, and `status:roll20-actual`.
- CLAIM BOUNDARY: this is a truthfulness/operations fix only. It does not prove Roll20 visual parity and does not remove renderer HOLD.
## 2026-06-19 19:50 +09:00 - Roll20 upload attempt and live chat evidence

Status: PARTIAL ACTUAL EVIDENCE, NOT VISUAL PARITY.

What happened:
- Chrome file chooser capture failed for hidden `#sheetHtml/#sheetCss/#sheetTranslation` inputs and visible Sandbox Tools labels in the current Codex Chrome wrapper.
- Raw CDP `DOM.setFileInputFiles` is blocked by the extension allowlist.
- The generated upload snippet executed in the Roll20 editor, but file input state cannot be trusted from the current isolated/read-only automation contexts.
- Improved `scripts/roll20_upload_snippet.mjs` so generated snippets fall back to defining an own `files` property when direct `input.files = ...` is ignored.

Actual Roll20 evidence saved locally only:
- `reports/roll20-actual-compare/2026-06-18-state-map-v1/local-baseline/official-roll20-AW2E/screenshots/roll20-sandbox-after-upload-attempt.png`
- `reports/roll20-actual-compare/2026-06-18-state-map-v1/local-baseline/official-roll20-AW2E/screenshots/roll20-sandbox-after-upload-attempt-dom-evidence.json`
- `reports/roll20-actual-compare/2026-06-18-state-map-v1/local-baseline/official-roll20-AW2E/screenshots/roll20-chat-after-roll-attempt-page.png`
- `reports/roll20-actual-compare/2026-06-18-state-map-v1/local-baseline/official-roll20-AW2E/screenshots/roll20-chat-after-roll-attempt-dom-evidence.json`

Observed facts:
- Character iframe had `.charactersheet` root, 13 roll buttons, and AW2E-looking text content.
- Clicking a visible iframe roll button produced actual Roll20 chat DOM with `sheet-rolltemplate-coc` classes, messageCount 9, templateCount 2, last template width about 267px and height about 545px.
- Chat DOM confirms Roll20 runtime uses `.sheet-rolltemplate-*` for template wrappers and unprefixed `.inlinerollresult` style runtime classes, matching the latest export selector preservation direction.

Not done / next:
- The evidence is fixture-mixed/suspect: the iframe text looked AW2E while the new chat template was `sheet-rolltemplate-coc`. Do not count it as AW2E visual parity.
- Need a reliable upload path or user-assisted file chooser access, then recapture the expected fixture with accepted filenames and normalized chat/root evidence.
- Current `status:roll20-actual` remains `rendererReady=NO`, `rendererBlockers=7`.
## 2026-06-19 19:45 +09:00 - Rolltemplate runtime selector preservation

Status: IMPLEMENTED + LOCAL PREUPLOAD VERIFIED, ACTUAL ROLL20 RECAPTURE STILL REQUIRED.

What changed:
- Preserved Roll20 inline-roll runtime CSS classes (`.inlinerollresult`, `.fullcrit`, `.fullfail`, `.importantroll`) as unprefixed selectors while still restoring user sheet selectors such as `.sheet-rolltemplate-*`.
- Added payload audit errors for unprefixed `.rolltemplate-*` selectors and incorrectly prefixed `.sheet-inlinerollresult` / `.sheet-fullcrit` / `.sheet-fullfail` / `.sheet-importantroll`.

Evidence:
- `corepack pnpm run lint`: PASS.
- `corepack pnpm run build`: PASS.
- `corepack pnpm run verify:roll20-preupload -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --fixtures test-fixtures/visual --out-dir ./out --base-path /roll20-block-editor --state-map reports\visual-state-candidates\visual-state-candidates-state-map.json`: PASS.
- `corepack pnpm run audit:payload -- reports\roll20-actual-compare\2026-06-18-state-map-v1`: PASS for AW2E, Les-Oublies, and YSHY 1BU.
- Regenerated ignored AW2E/YSHY payload CSS now contains `.sheet-rolltemplate-* .inlinerollresult.fullcrit` style selectors rather than `.sheet-inlinerollresult`.

Not done / next:
- Upload the regenerated payload to Roll20 Custom Sheet Sandbox/test room and recapture actual chat/preview evidence.
- Current status still says `rendererReady=NO`, `rendererBlockers=7`, generated actual screenshots `4/6`.
## 2026-06-19 19:29 +09:00 - Rolltemplate CSS selector export fix

Status: IMPLEMENTED + LOCAL PREUPLOAD VERIFIED, ACTUAL ROLL20 RECAPTURE STILL REQUIRED.

What changed:
- Fixed CSS block export so `r20_selector_class` restores Roll20 .sheet- class selectors instead of emitting unprefixed .rolltemplate-* selectors after import.
- Added block-level regression coverage for .rolltemplate-aw -> .sheet-rolltemplate-aw and no double-prefix for .sheet-header.
- Updated Roll20 status/gate/chat diagnostics to keep actual chat CSS scoped/prefix mismatch as a separate blocker instead of hiding it inside generic CSS inactive/missing buckets.

Evidence:
- corepack pnpm run lint: PASS.
- corepack pnpm run build: PASS.
- corepack pnpm run verify:roll20-preupload -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --fixtures test-fixtures/visual --out-dir ./out --base-path /roll20-block-editor --state-map reports\visual-state-candidates\visual-state-candidates-state-map.json: PASS.
- Regenerated ignored AW2E payload now contains .sheet-rolltemplate-aw table, .sheet-rolltemplate-aw th, .sheet-rolltemplate-aw td, and prefixed inner template classes.
- corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1: rendererReady=NO, rendererBlockers=7, generatedActualScreenshots=4/6, generatedDiffed=4/6, chatActualCssInactive=1, chatActualCssScopedMismatch=1.

Not done / next:
- Re-upload the regenerated payload to Roll20 Custom Sheet Sandbox and recapture actual chat screenshots; current actual evidence still reflects old or incomplete Roll20 state.
- Do not claim Roll20 visual parity until missing 2/6 generated actual screenshots and chat normalized crop evidence are recaptured and diffed.
## 2026-06-19 Actual Status Chat Gate Final Rerun

- VERIFY: after rerunning `gate:roll20-renderer-action` and then `status:roll20-actual`, the current status reads `rendererBlockers=6`.
- Latest measured output: `generatedActualScreenshots=4/6`, `generatedDiffed=4/6`, `roomObservationScreenshots=0/3`, `reliableTrustedFullRoot=3/3`, `rendererReady=NO`, `chatNormalizedCompared=2/3`, `chatNeedsNormalizedCapture=1`, `chatActualCssInactive=2`, `chatNormalizedHighMismatch=1`.
- Additional current gate blockers now visible: generated-sheet actual evidence is incomplete and trustworthy Roll20 chat screenshots are missing for AW2E and YSHY. Treat the earlier `rendererBlockers=4` note below as superseded by this rerun.
## 2026-06-19 Actual Status Chat Gate Surface Update

- VERIFY: `status:roll20-actual` now surfaces chat parity blockers directly, so the one-command status cannot hide Roll20 chat CSS/crop issues behind the broader renderer HOLD.
- Latest command: `corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1`.
- Current measured output: `generatedActualScreenshots=4/6`, `generatedDiffed=4/6`, `reliableTrustedFullRoot=3/3`, `rendererReady=NO`, `rendererBlockers=4`, `chatNormalizedCompared=2/3`, `chatNeedsNormalizedCapture=1`, `chatActualCssInactive=2`, `chatNormalizedHighMismatch=1`.
- NEXT P0: recapture/prove a Roll20 Custom Sheet Sandbox or new test-room chat state where user rolltemplate CSS is active, and capture the missing normalized Les-Oublies rolltemplate rect/clip sidecar. Do not tune production ChatPane or renderer CSS from the current CSS-inactive actual chat evidence.

## 2026-06-19 Chat CSS Evidence Gate Update

Status: DOING, renderer still HOLD.

Evidence now:
- Added chatCssEvidence to local-only Roll20 chat sidecars for AW2E and YSHY by reading the current Roll20 editor tabs in Chrome without modifying the rooms/settings.
- Both current actual chat captures are CSS_RULE_MISSING_IN_PAGE_STYLES: AW2E lacks .sheet-rolltemplate-aw rules and YSHY lacks .sheet-rolltemplate-coc rules in the Roll20 page styles.
- Updated diagnose:roll20-chat-parity to report actualChatCssInactive/actualChatCssUnknown and per-fixture Actual CSS status.
- Updated gate:roll20-renderer-action so CSS-inactive actual chat evidence is a separate blocker. This prevents agents from misreading the YSHY 96.93% mismatch as proof that local CSS-enabled ChatPane should be disabled.

Current gate:
- rendererReady=NO.
- actualChatCssInactive=2/3, needsNormalizedCapture=1/3, normalizedHighMismatch=1/2.
- Next P0: obtain or prove a Roll20 Sandbox/test-room chat state where user rolltemplate CSS is active. If Roll20 genuinely keeps chat rolltemplate CSS inactive for custom sheets, document that as Roll20 behavior and adjust the simulator only after repeated evidence across correctly uploaded sheets.

## 2026-06-19 Rolltemplate chat CSS parity update

Status: DOING, not parity.

Evidence now:
- Implemented: local ChatPane now runs emitted rolltemplate CSS through the same Roll20 auto-prefix path used by preview, and rolltemplate body class tokens are normalized to Roll20-style sheet-* classes before rendering.
- Verified: corepack pnpm run build PASS, corepack pnpm run lint PASS, corepack pnpm run guard:roll20-evidence PASS, git diff --check PASS.
- Local chat smoke after CSS activation: AW2E and YSHY render paths still produce rolltemplate cards, but the smoke command currently FAILs because external sheet assets return 403/resource errors; Les-Oublies PASSes.
- Actual Roll20 Chrome observation: current AW2E/YSHY Roll20 editor tabs have rolltemplate DOM, but page styles do not contain .sheet-rolltemplate-aw or .sheet-rolltemplate-coc; computed styles show Roll20 default chat typography/background, not user rolltemplate CSS.
- Chat parity numbers after local CSS activation: AW2E mismatch 9.90% (was 11.65% immediately before this patch), YSHY mismatch 96.93% because current actual evidence is CSS-inactive while local now applies rolltemplate CSS, Les-Oublies still needs normalized actual crop evidence.

Decision:
- Keep production renderer gate on HOLD.
- Do not claim Roll20 chat parity from the current actual screenshots, because they are CSS-inactive evidence.
- Next P0: recapture or upload a Roll20 sandbox/test-room state where sheet CSS is actually active in chat, or explicitly classify Roll20 sandbox chat as CSS-inactive and align the local simulator to that verified behavior only if repeated across correctly uploaded sheets.
## 2026-06-19 Active TODO Refresh - Normalized Chat Evidence

- DONE: Recaptured YSHY 1BU actual Roll20 chat evidence from the dedicated sandbox after clicking the same iframe `[name="roll_str_check"]` button used by local smoke. The ignored sidecar now records a latest `sheet-rolltemplate-coc` rect and CDP physical clip with no visible `#textchat` dialog overlap.
- DONE: Fixed local rolltemplate lookup so `sheet-rolltemplate-coc` no longer accidentally matches `sheet-rolltemplate-coc-dice-roll`; local ChatPane now also applies emitted translation JSON/comment data to rolltemplate field text and simple `data-i18n` labels.
- VERIFY: `node scripts\rolltemplate_chat_smoke.mjs --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/rolltemplate-chat-smoke` PASS for AW2E, Les-Oublies, and YSHY 1BU after the fix.
- STILL OPEN: Actual chat parity remains blocked. Latest normalized diagnostic: `normalizedCompared=2/3`, `needsNormalizedCapture=1` (Les-Oublies), `normalizedHighMismatch=2`, YSHY 1BU mismatch `35%`, AW2E still reports `93.26%` from old suspect capture.
- NEXT P0: recapture AW2E and Les-Oublies chat with same-button fresh Roll20 messages and normalized sidecars, then fix remaining rolltemplate row/height parity before claiming Roll20 chat visual parity.

## 2026-06-19 Active TODO Refresh - Chat Parity

- VERIFY: Actual Roll20 chat screenshots and fresh DOM sidecars exist for generated-sheet targets; status still reports `generatedActualScreenshots=6/6` and `generatedDiffed=6/6`.
- BLOCKER: Local ChatPane vs actual Roll20 chat parity is not close enough: compared 3/3, highMismatch 3/3; AW2E 13.02%, Les-Oublies 27.95%, YSHY 12.74%.
- NEXT P0: fix local ChatPane rolltemplate shell sizing/content to match actual Roll20 chat, rerun local rolltemplate smoke, then rerun `diagnose:roll20-chat-parity` and `gate:roll20-renderer-action`.

## 2026-06-19 Active TODO Refresh - Live Roll20 Iframe Probe

- VERIFY: Dedicated Roll20 editor tab is reachable and iframe root can be read with CDP isolated world. Latest observed root: 852px x 11788.0879px.
- STILL OPEN: `roomObservationScreenshots=0/3`, `roomObservationDiffed=0/3`, `rendererReady=NO`, `rendererBlockers=1`.
- NEXT P0: connect fresh iframe probe evidence to fixture-specific status only after a normalized root/chat capture is produced; do not count generic viewport evidence as parity.

## 2026-06-19 Active TODO Refresh - Live Roll20 Iframe Probe

- VERIFY: Dedicated Roll20 editor tab is reachable and iframe root can be read with CDP isolated world. Latest observed root: 852px x 11788.0879px.
- STILL OPEN: `roomObservationScreenshots=0/3`, `roomObservationDiffed=0/3`, `rendererReady=NO`, `rendererBlockers=1`.
- NEXT P0: connect fresh iframe probe evidence to fixture-specific status only after a normalized root/chat capture is produced; do not count generic viewport evidence as parity.
# 2026-06-19 Input-Flow Boundary TODO Update

- DONE: input-flow model boundary is now machine-readable and surfaced in the renderer action gate.
- Current status: `applyCandidate=2` (Les-Oublies, YSHY), `blockGlobalModel=1` (AW2E), `globalModelSafe=NO`.
- TODO P0: add more fixture coverage before any automatic model selection. A model can be considered for product use only after the gate proves no source/state-dominant fixture is harmed.
# 2026-06-19 Production-Path Input-Flow TODO Update

- VERIFY: `roll20RendererModel` now exists in the real preview builder as a gated diagnostic option, with candidate coverage in `smoke:roll20-full-root-candidates`.
- Current proof: production-path input-flow candidates reproduce the diagnostic injection numbers for Les-Oublies/YSHY, but AW2E still prefers source-state under scroll-metrics. Latest gate remains `HOLD_PRODUCTION_RENDERER_PATCH`, `rendererReady=NO`.
- TODO P0: decide the generic model boundary for when input-flow applies. Do not expose or enable it globally until the renderer action gate no longer reports cross-fixture patch-family disagreement.
# 2026-06-19 Input/Inline-Flow Axis TODO Update

- DONE: added input/inline-flow axis diagnostic. Command: `corepack pnpm run diagnose:roll20-input-flow-axis -- reports\roll20-actual-compare\2026-06-18-state-map-v1`.
- Current result: `SPLIT_RENDERER_AXIS_CONFIRMED` with inlineBest `2` (Les-Oublies, YSHY) and sourceGeometryBest `1` (AW2E via scroll-metrics source-state).
- TODO P0: model the Les/YSHY input/inline-flow baseline as a generic Roll20 wrapper/base behavior, then rerun full-root candidates, computed-style context, renderer blocker matrix, and renderer action gate. Do not apply it globally if AW2E remains source/state-dominant.
# 2026-06-19 Renderer Patch-Family TODO Update

- DONE: added scroll-metrics-aware renderer blocker matrix. Command: `corepack pnpm run diagnose:roll20-renderer-blocker -- reports\roll20-actual-compare\2026-06-18-state-map-v1`.
- Current evidence: AW2E source-state is already a qualified scroll-metrics candidate (`root +8.188px`, panels `11/11`, maxY `16.6px`, maxH `9.05px`), but Les-Oublies/YSHY remain best on `inline-block+text-input-height`.
- TODO P0: split the next renderer investigation into two axes: (1) Les/YSHY Roll20 input/inline-flow baseline, (2) AW2E selector/default-state/source-state behavior. Do not ship a one-size CSS patch until both axes agree under the gate.
# 2026-06-19 Current Renderer TODO Update

- VERIFY: root-cutoff accounting was refined. Latest `status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1` reports `trustedFullRoot=3/3`, `reliableTrustedFullRoot=3/3`, `trustedFullRootCutoffRisk=1`, `trustedFullRootCutoffUnresolved=0`, `scrollMetricsReplacement=1`, `rendererBlockers=1`, and `rendererReady=NO`.
- TODO P0: resolve the remaining cross-fixture renderer patch-family disagreement. Current gate still HOLDs because AW2E compares as `none` while Les-Oublies/YSHY compare as `inline-block+text-input-height`.
- TODO P0: keep AW2E's old cutoff-prone stitched screenshot excluded from parity claims. Scroll-metrics is acceptable for diagnostic renderer-candidate comparison, not for claiming final Roll20 visual parity.
# 31. Active TODO Board

Date: 2026-05-19

This board is the live working list for Codex/Claude/other agents. Keep claims tied to evidence. Do not mark browser roundtrip, Roll20 visual parity, or full import/export as done unless the linked report proves that exact level.

## Status Legend

- TODO: not started.
- DOING: actively being worked on.
- BLOCKED: cannot proceed without external account/tool/permission.
- VERIFY: code or docs changed; needs lint/build/browser/corpus verification.
- DONE: verified with the command/report named in the note.

## Now

Current Roll20 renderer safety note, 2026-06-19 YSHY actual iframe computed-style sidecar captured:
Applied the YSHY 1BU payload to the dedicated Roll20 Custom Sheet Sandbox through the observed endpoint/settings-form fallback: `/sheetsandbox/savesheetsettings` accepted HTML/CSS/translation with status 200, and `/campaigns/savesettings/21639681` accepted the full `#settingsform` save with wrapped `customcharsheet_json`. Opening the sandbox character `-OvSWvivVPTt2z_4goPF` then exposed a live same-origin character iframe with `.charactersheet` root width `850px`, `1049` inputs, `808` roll buttons, `88` tables, `9` textareas, and `9` scripts. Saved ignored local sidecar `live-iframe-probe/yshy-commission-1bu-computed-styles.json`. Latest `diagnose:roll20-computed-style-context` is now `compared=3/3, missingActualStyle=0`, but still `DO_NOT_PROMOTE_DIRECTLY`; `status:roll20-actual` still reports `rendererReady=NO`, `rendererBlockers=2`, and `rendererAction=HOLD_PRODUCTION_RENDERER_PATCH`. Next P0 is resolving AW2E root-cutoff/live-sidecar disagreement and cross-fixture patch-family disagreement before any production renderer CSS promotion.
Current Roll20 renderer safety note, 2026-06-19 YSHY sandbox upload automation blocked:
Attempted to load the YSHY 1BU payload into the dedicated Roll20 Custom Sheet Sandbox editor so the missing actual computed-style sidecar could be captured. The editor page exposes `#sheetHtml`, `#sheetCss`, and `#sheetTranslation`, but all tested automation paths failed without applying files: generated page snippet returned `no-file-on-input` for all three inputs, Chrome/CDP `DOM.setFileInputFiles` is unsupported in this extension surface, and visible label/file chooser activation timed out. No existing room was modified. Latest evidence remains `diagnose:roll20-computed-style-context => compared=2/3, missingActualStyle=1`, `status:roll20-actual => rendererReady=NO`, and `rendererAction=HOLD_PRODUCTION_RENDERER_PATCH`. Next P0 is a manual/alternate upload path for YSHY or enabling a working Chrome file-chooser route, then capturing `live-iframe-probe/yshy-commission-1bu-computed-styles.json`.
Current Roll20 renderer safety note, 2026-06-19 AW2E computed-style sidecar captured:
Chrome/CDP read-only probing of the dedicated Roll20 editor iframe saved ignored local sidecar `live-iframe-probe/official-roll20-AW2E-computed-styles.json`. Rerunning `diagnose:roll20-computed-style-context` now compares `2/3` fixtures and leaves only YSHY as `MISSING_ACTUAL_STYLE`. The result is still `DO_NOT_PROMOTE_DIRECTLY`: AW2E best style candidate is `sandbox-sheet-alias-attr-class-state-first-12-source` but actual input height is `27.6px` while the local best-style candidate input is `24px`; Les-Oublies still has row/column/table style/count differences. Renderer remains `HOLD_PRODUCTION_RENDERER_PATCH` and `rendererReady=NO`.
Current Roll20 renderer safety note, 2026-06-19 computed-style context diagnostic:
Added `diagnose:roll20-computed-style-context` to compare actual Roll20 computed-style sidecars against local full-root candidates for `.sheet-2colrow`, `.sheet-3colrow`, `.sheet-col`, table, input, and textarea. Latest run is `DO_NOT_PROMOTE_DIRECTLY`: compared `1/3` fixtures, missing actual style sidecars for AW2E and YSHY, and Les-Oublies still has style/count differences even though `sandbox-inline-block-text-input-276-source` matches input height closely. Next P0 is refreshing actual computed-style sidecars for all fixtures before any inline-flow/input-height renderer CSS is promoted.
Current Roll20 renderer safety note, 2026-06-19 promotion-risk gate:
`diagnose:roll20-renderer-blocker` now writes a `Promotion Risk` section for every diagnostic patch family. Latest report keeps the renderer at `DO_NOT_PROMOTE_DIRECTLY` because `gate:roll20-renderer-action` still has 2 blockers: fixture-best families differ (`none` for AW2E reliable source, `inline-block+text-input-height` for Les-Oublies/YSHY) and AW2E trusted stitched root still disagrees with the live sidecar by `2620.088px`. The matrix now explicitly says that `inline-block+text-input-height` helps Les-Oublies/YSHY but is not fixture-best everywhere, so it must remain diagnostic until actual Roll20 computed styles for `.sheet-2colrow`, `.sheet-3colrow`, `.sheet-col`, text inputs, and textarea prove a generic wrapper/base-context correction.
Current Roll20 renderer experiment note, 2026-06-19 production-path inline-flow patch rejected:
A temporary production-path experiment added the diagnostic inline-block/input-height CSS directly to `buildSheetDoc`/`buildSheetParts`, then reran `smoke:roll20-full-root-candidates`, `gate:roll20-renderer-action`, and `diagnose:roll20-renderer-blocker`. Les-Oublies/YSHY baseline improved to the previous best range, but the best candidates moved to additional inline-block word-spacing patches and the renderer gate still held with AW2E root-cutoff disagreement. The temporary CSS was removed and the candidate/matrix reports were regenerated back to the non-experiment production path. Next work must prove real Roll20 wrapper/base context before shipping any inline-flow CSS.
Current Roll20 renderer blocker note, 2026-06-19 targeted experiment boundary:
`diagnose:roll20-renderer-blocker` was rerun after the 27px candidate smoke. Latest matrix now says `NEEDS_TARGETED_LOCAL_EXPERIMENT`: `inline-block+text-input-height` and `nowrap+text-input-height` help 2 fixtures and are neutral for AW2E, but fixture-best families still differ and AW2E still has the trusted stitched root vs live sidecar root blocker. Do not promote the word-spacing/nowrap/input-height diagnostic CSS to production until a targeted local experiment proves it as a Roll20 baseline/context correction rather than a fixture-specific visual patch.
Current Roll20 renderer gate note, 2026-06-19 unified input-flow candidate probe:
`smoke:roll20-full-root-candidates` now includes diagnostic `inline-block+text-input-height` and `inline-block-nowrap+text-input-height` candidates at `27px`, and root-height ties now prefer the lower pixel mismatch. Latest full-root candidate smoke converges Les-Oublies and YSHY on `sandbox-inline-block-text-input-270-source`: Les-Oublies `3.76%` mismatch with rootDelta `-3.625px`, YSHY `4.23%` mismatch with rootDelta `-0.375px`. AW2E still does not share that best family in the trusted full-root table, and its reliable comparison still uses the scroll-metrics source candidate (`rootDelta +8.188px`, panelY `+16.6px`, panelH `+0.2px`). Renderer remains `HOLD_PRODUCTION_RENDERER_PATCH` and `rendererReady=NO`; this is stronger cross-fixture evidence for a Roll20 input/inline-block axis, not production visual parity.

Current Roll20 renderer gate note, 2026-06-19 scroll-metrics reliable candidate:
`gate:roll20-renderer-action` now allows a root-cutoff HIGH fixture to contribute a reliable renderer candidate when its scroll-metrics source render is tightly aligned (`rootDelta <= 50px`, `panelY <= 50px`, `panelH <= 10px`). Latest AW2E uses the scroll-metrics source candidate with rootDelta +8.188px, panelY +16.6px, panelH +0.2px, so the reliable evidence shortage blocker is gone. Renderer still HOLDs because reliable patch families disagree across fixtures: `none` for AW2E, `inline-block+text-input-height` for Les-Oublies, and `text-input-height` for YSHY; the old trusted stitched root cutoff warning remains as evidence hygiene, not as the AW2E renderer comparison source.
Current Roll20 renderer gate note, 2026-06-19 reliable patch-family comparison:
`gate:roll20-renderer-action` now excludes fixtures with root-cutoff HIGH from reliable patch-family comparison. Latest gate reports reliable cross-fixture renderer evidence `2/3`, explicitly warns that AW2E's old trusted full-root candidate is excluded, and keeps HOLD. Remaining blockers are now phrased as reliable-evidence shortage, Les/YSHY patch-family disagreement, and AW2E stitched-vs-sidecar root disagreement.
Current Roll20 actual-status note, 2026-06-19 reliable full-root accounting:
`status:roll20-actual` now separates raw trusted full-root files from reliable trusted full-root evidence. AW2E still has a root-cutoff HIGH diagnostic, so the latest status prints `trustedFullRoot=3/3`, `reliableTrustedFullRoot=2/3`, and `trustedFullRootCutoffRisk=1`. This prevents stale/cutoff root evidence from being mistaken for renderer readiness. Renderer remains HOLD and `rendererReady=NO`.
Current Roll20 renderer note, 2026-06-19 scroll-metrics geometry candidate selection:
`smoke:roll20-full-root-candidates` now uses the geometry-best candidate, not merely the root-height closest candidate, when producing `targetGeometry`; root-height ties are broken by geometry score before pixel mismatch. Latest AW2E scroll-metrics warning now reports `sandbox-source-state` rootDelta +8.188px, panelY +16.6px, panelH +0.2px, and chosen state panels maxYDelta 16.6px instead of the earlier inflated 552.6px from a worse attr-class candidate. Renderer remains HOLD because pixel-best still over-hides and the old trusted stitched root still disagrees with the live sidecar root.
Current Roll20 renderer note, 2026-06-19 Roll20 chrome selector scoping:
Implemented a generic sanitizer guard for Roll20 chrome selectors when `prefixSelectors:false`: selectors targeting `.ui-dialog`, `.dialog`, `.largedialog`, `.tab-content`, `.sheetform`, `#dialog-window`, or `#tab-content` are scoped under `.charsheet`, preventing uploaded user CSS from styling the Roll20 dialog/base wrapper. `buildSheetParts()` now honors `roll20SandboxSanitize`, and Preview/Edit pass the same toggle, reducing preview/edit CSS-path drift. Latest AW2E scroll-metrics after this change: `sandbox-source-state` rootDelta improved from -189.5px to +8.188px, statePanelYDelta from -2349px to +16.6px, and statePanelHeightDelta from -70.2px to +0.2px. Gate remains HOLD because pixel-best still over-hides and the old trusted stitched root still disagrees with the live sidecar root; this is a concrete renderer improvement, not visual parity.
Current Roll20 renderer note, 2026-06-19 AW2E textarea cascade diagnostic:
`diagnose:roll20-scroll-metrics-candidates` added diagnostic-only `textarea-height` and `text-input-textarea-height` candidates. Against actual AW2E 852x11788, the previous root-closest `sandbox-text-input-280-source` was rootDelta -185.5px with right support panels too short; `sandbox-textarea-150-source` reduced rootDelta to -34.313px and state panel height delta to +0.2px; `sandbox-text-input-280-textarea-150-source` is now height-closest at rootDelta +17.688px with state panels compared 11/11, maxYDelta 122.6px, maxHeightDelta 4px. This strongly confirms a textarea/base cascade leak axis, but it is diagnostic-only. Production renderer remains HOLD and `rendererReady=NO` until the fix is generalized as Roll20 selector/base scoping rather than a hardcoded AW2E patch.
Current Roll20 renderer note, 2026-06-19 AW2E scroll-metrics state panel geometry:
`diagnose:roll20-scroll-metrics-candidates` now normalizes actual `visiblePanels` from the Roll20 root-container sidecar and compares them against local candidate `statePanels`. Latest AW2E root-closest candidate remains `sandbox-text-input-280-source` with rootDelta -185.5px. All 11 actual state panels now compare against local panels. Main left playbook panels are height-aligned within +0.2px but local y is about -119px to -126px early. Right-side support panels are too short by -68px to -276px, producing cumulative y drift up to -2297px at the marine/food panel. This points the next P0 toward right-column box/support-panel flow and sizing, not blanket sheet-class aliasing or top playbook selector state. Renderer remains HOLD and `rendererReady=NO`.
Current Roll20 renderer note, 2026-06-19 AW2E scroll-metrics candidate comparison:
Added `diagnose:roll20-scroll-metrics-candidates` as a separate diagnostic path so the new 852x11788 AW2E scroll-metrics stitch can be compared without replacing the trusted/full-root gate output. Latest AW2E diagnostic comparison: actual 852x11788, pixel best `sandbox-sheet-alias-playbook-hide-source` at 7.08% but local root 852x2532 and rootDelta -9256.125px, so it is structurally wrong and must not be promoted. Height/root closest moved back toward source/text-input candidates: `sandbox-text-input-280-source` is -185.5px, while `normal-source-state` is -195.063px and `sandbox-source-state` is -189.5px. This means the older first-13/default-state clue was partly tied to the 9168px cutoff capture. Renderer remains HOLD and `rendererReady=NO`.
Current Roll20 renderer note, 2026-06-19 AW2E scroll-metrics stitch diagnostic:
Using the read-only iframe metrics, Chrome/CDP captured 23 ignored local sheet-root segments and stitched diagnostic aw2e-root-scroll-metrics-stitch-20260619.png at 852x11788 from manifest aw2e-root-scroll-metrics-manifest-20260619.json. audit:roll20-root-stitch now surfaces this as DIAGNOSTIC_SCROLL_METRICS, duplicate segments 0, coverage issues 0, and plan:roll20-root-capture lists it as scroll-metrics. This is stronger recapture evidence but not promoted to trusted roll20-sandbox-root-full-dpr-corrected.png; renderer remains HOLD and rendererReady=NO until the diagnostic is compared/classified and intentionally promoted or recaptured.
Current Roll20 renderer note, 2026-06-19 AW2E root container metrics sidecar:
Chrome/CDP read the dedicated Roll20 character iframe in read-only mode and saved ignored local sidecar `live-iframe-probe/official-roll20-AW2E-root-container-metrics.json`. Latest `diagnose:roll20-root-cutoff` now uses that sidecar before the older attr_class sidecar and reports source `official-roll20-AW2E-root-container-metrics.json`, root/form height `11788.087890625px`, dialog scroller `top=11223.2, h=626/11849`, stitched height `9168px`, delta `2620.088px`, risk `HIGH`. Existing rooms/settings were not modified. Renderer remains HOLD and `rendererReady=NO`; next P0 is recapturing or deriving full-root segments against the authoritative `11788.087890625px` root height.

Current Roll20 renderer note, 2026-06-19 root capture plan cutoff blocker:
`plan:roll20-root-capture` now treats high root-cutoff risk as a capture target even when trusted DPR full-root files already exist. Latest AW2E plan reports `NEEDS_CAPTURE`, `plannedFixtures=1`, with issue `trusted root cutoff disagreement: stitched=9168px sidecar=11788.087890625px delta=2620.088px`. This prevents `trustedFullRoot=3/3` from being mistaken for renderer readiness when live sidecar root/container metrics disagree. Renderer remains HOLD and `rendererReady=NO`.

Current Roll20 renderer note, 2026-06-19 AW2E root cutoff diagnostic:
Added `scripts/roll20_root_cutoff_diagnostics.mjs` and `corepack pnpm run diagnose:roll20-root-cutoff -- reports\roll20-actual-compare\2026-06-18-state-map-v1 [fixture-id]`. Latest AW2E cutoff report compares trusted stitched root evidence against the live attr_class sidecar root: stitched height `9168px`, sidecar root height `11788.087890625px`, delta `2620.088px`, risk `HIGH`. The stitch manifest notes placement was derived from visual overlap because iframe scrollTop/root metadata was unavailable. `gate:roll20-renderer-action` now treats this as an additional blocker before production CSS. Renderer remains HOLD and `rendererReady=NO`.
Current Roll20 renderer note, 2026-06-19 AW2E attr_class panel geometry:
Added `scripts/roll20_attr_class_panel_geometry_diagnostics.mjs` and `corepack pnpm run diagnose:roll20-attr-class-geometry -- reports\roll20-actual-compare\2026-06-18-state-map-v1 [fixture-id]`. Latest AW2E geometry report explains why actual-visible panel names did not reproduce full-root height: actual stitched root height is `9168px`, sidecar-visible panel rows intersecting that height are `14`, but only `13` are fully inside. The height-closest local candidate remains `sandbox-sheet-alias-attr-class-state-first-13-source` (`+208.5px`). `gate:roll20-renderer-action` now surfaces this as evidence. Renderer remains HOLD and `rendererReady=NO`; next P0 is DOM container/root cutoff analysis before production CSS.
Current Roll20 renderer note, 2026-06-19 AW2E actual-visible candidate probe:
`smoke:roll20-full-root-candidates` now reads the ignored attr-class visibility diagnostic and adds actual-sidecar-based candidates without changing production renderer CSS. AW2E results: actual-visible explicit class candidate is `9.04%` mismatch with root delta `+1310.5px`; actual-visible via forced checked classes is `9.06%` / `+1310.5px`; actual-visible-plus-checked is `9.02%` / `+1861.5px`. These are all worse than the height-closest `sandbox-sheet-alias-attr-class-state-first-13-source` (`8.98%`, `+208.5px`) and do not beat the pixel-best over-hidden `playbook-hide-only` candidate (`7.22%`, `-6636.125px`). Conclusion: actual display-visible panel names alone are not enough to model AW2E Roll20 default state; next P0 is source order/DOM geometry/default hidden-state analysis before production CSS.
Current Roll20 renderer note, 2026-06-19 AW2E attr_class visibility diagnostics:
Added `scripts/roll20_attr_class_visibility_diagnostics.mjs` and `corepack pnpm run diagnose:roll20-attr-class-visibility -- reports\roll20-actual-compare\2026-06-18-state-map-v1 [fixture-id]`. Latest AW2E run compares the actual Roll20 attr_class sidecar with emitted payload selector/class shapes: actual checked value is still `Hardholder`, but actual visible panel values count is `15` and `24` checked show selectors are unprefixed while the emitted/Roll20 HTML shape is `sheet-` prefixed. `gate:roll20-renderer-action` now includes this as positive root-cause evidence while still returning `HOLD_PRODUCTION_RENDERER_PATCH`; `rendererReady=NO`. Next P0 is to model Roll20 selector prefix/default-state behavior without promoting blanket `sheet-` alias CSS or forced checked-state candidates.

Current Roll20 renderer note, 2026-06-19 AW2E actual attr_class sidecar:
Chrome/CDP read the generated AW2E Roll20 character iframe in the dedicated sandbox without modifying existing rooms. Ignored local sidecar `live-iframe-probe/official-roll20-AW2E-attr-class-state.json` records 81 `attr_class`/`class` inputs and actual checked value `Hardholder`. The updated attr-class plan now marks AW2E `CAPTURED_NEEDS_ANALYSIS`: actual checked `Hardholder` does not explain the height-closest `first-13` candidate (`+208.5px`) while Hardholder-only is far too short. Updated playbook diagnostics and renderer gate now point to selector prefix/state visibility analysis instead of repeating the same capture. Renderer remains `HOLD_PRODUCTION_RENDERER_PATCH` and `rendererReady=NO`.

Current Roll20 renderer note, 2026-06-19 attr_class state capture plan:
Added `scripts/roll20_attr_class_state_capture_plan.mjs` and `corepack pnpm run plan:roll20-attr-class-state -- reports\roll20-actual-compare\2026-06-18-state-map-v1 [fixture-id]`. Latest run classifies AW2E as the only P0 attr_class capture target: 18 emitted `attr_class` values, actual height bracketed by `first-12` (`-324.5px`) and `first-13` (`+208.5px`). Les-Oublies/YSHY have 0 `attr_class` values for this specific probe. `gate:roll20-renderer-action` now points to the new plan command before renderer CSS work. This is planning/snippet automation only; the actual Roll20 checked/value sidecar is still TODO and `rendererReady=NO`.

Current Roll20 renderer note, 2026-06-19 generic attr_class state probes:
`smoke:roll20-full-root-candidates` no longer relies on a hardcoded AW2E playbook array for forced default-state candidates. It now derives `attr_class` values from each emitted payload's `input[name="attr_class"]` controls and adds generic `attr-class-state-first-N` probes. Latest AW2E result reproduces the earlier height bracket without sheet-name hardcoding: `first-12` is `850x8844` / `-324.5px`, `first-13` is `850x9377` / `+208.5px`, and `first-14` is `850x9946` / `+777.5px` against actual `850x9168`. Pixel best remains `sandbox-sheet-alias-playbook-hide-source` at `7.22%` but is too short (`-6636.125px`), so renderer CSS still stays HOLD. Next P0: capture or reconstruct the actual Roll20 checked/value state for the controlling `attr_class` inputs, then rerun the full-root/gate scripts before any production renderer change.

Current Roll20 renderer note, 2026-06-19 playbook-state diagnostic automation:
Added `scripts/roll20_playbook_state_diagnostics.mjs` and `corepack pnpm run diagnose:roll20-playbook-state -- reports\roll20-actual-compare\2026-06-18-state-map-v1`. Latest report marks AW2E `playbookSignal=YES` while Les-Oublies/YSHY are `NO`. AW2E pixel-best and height-closest candidates disagree: pixel best is `sandbox-sheet-alias-playbook-hide-source` (`7.22%`, root `-6636.125px`), height closest is `sandbox-sheet-alias-playbook-state-through-quarantine-source` (`8.98%`, root `+208.5px`). This is a default/playbook state probe target, not visual parity or renderer readiness. Renderer remains HOLD.

Current Roll20 renderer note, 2026-06-19 AW2E playbook state height probe:
`smoke:roll20-full-root-candidates` now records a separate `closestRootHeightCandidate`. AW2E pixel best remains `sandbox-sheet-alias-playbook-hide-source` at `7.22%`, but it is structurally wrong (`850x2532`, root delta `-6636.125px`). The closest height candidate is `sandbox-sheet-alias-playbook-state-through-quarantine-source`, with `850x9377` and root delta `+208.5px`; `through-news` is `850x8844` / `-324.5px`. This strongly suggests AW2E actual Roll20 state is around 12-13 playbook sections visible, not all visible and not only Hardholder. Next P0: capture/derive actual Roll20 playbook/default attr state before any renderer CSS promotion.

Current Roll20 renderer note, 2026-06-19 AW2E grouped selector candidates:
`smoke:roll20-full-root-candidates` now splits the diagnostic `sheet-` alias CSS into grouped candidates (`hide-only`, `show-only`, `playbook-hide-only`, `control-state-only`). Latest AW2E candidate table: `normal-source-state` is `8.98%` mismatch with root delta `+2424.938px` (`850x11593`); full alias is `7.89%` but root delta `-7393.125px` (`850x1775`); hide-only is `8.23%` / `-7427.688px`; show-only is `9.18%` / `+2430.5px`; playbook-hide-only is best by pixels at `7.22%` but still root delta `-6636.125px` (`850x2532`); control-state-only is `8.97%` / `+2430.5px`. Interpretation: playbook hide selectors are the strongest AW2E axis, but applying them as-is over-hides the sheet. Production renderer remains HOLD until actual Roll20 state/DOM explains which playbook sections should stay visible.

Current Roll20 renderer note, 2026-06-19 AW2E selector/height diagnostics:
Added `scripts/roll20_visibility_selector_diagnostics.mjs`, `corepack pnpm run diagnose:roll20-visibility-selectors -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, and image-based `scripts/roll20_height_drift_diagnostics.mjs`. The selector report finds alias-only hide selector references in all current fixtures: AW2E `23`, Les-Oublies `6`, YSHY `5`, plus YSHY `33` missing hide refs. This supports a generic Roll20 `sheet-` prefix/default-state investigation, not an AW2E-only fix. `smoke:roll20-full-root-candidates` now includes diagnostic sheet-class-alias CSS candidates. Latest result: AW2E mismatch improves `8.98% -> 7.89%`, but root height flips from `+2424.938px` too tall to `-7393.125px` too short, so full selector aliasing over-hides content and must not be promoted. Renderer remains `HOLD_PRODUCTION_RENDERER_PATCH`; next P0 is to inspect actual Roll20 DOM/state/selector behavior more narrowly before production renderer changes.

Current Roll20 renderer note, 2026-06-19 blocker matrix:
Added `scripts/roll20_renderer_blocker_matrix.mjs` and `corepack pnpm run diagnose:roll20-renderer-blocker -- reports\roll20-actual-compare\2026-06-18-state-map-v1` to summarize cross-fixture patch effects after `smoke:roll20-full-root-candidates`. Latest ignored report `renderer-blocker-matrix-results.md` keeps production renderer CSS on HOLD: AW2E best is `none` with root delta `+2424.938px`, Les-Oublies best is `inline-block+text-input-height` at `3.87%`, and YSHY best is `text-input-height` at `4.28%`. The matrix shows no patch family is uniform enough to promote; Les-friendly inline-block/input tweaks are neutral or harmful for other fixtures. Next P0 is AW2E root-height drift/default-state or structure analysis, not CSS promotion.
Current Roll20 actual-screen note, 2026-06-19 AW2E trusted DPR root evidence:
AW2E now has ignored local DPR-corrected full-root evidence generated from the dedicated Roll20 editor tab. CDP `Page.captureScreenshot` could capture top-page sheet-root clips even though iframe `contentDocument` and CDP target attach remain unavailable. The accepted segment set is `aw2e-root-dpr-complete-segments-20260619/segment-000..023.png`, stitched to `roll20-sandbox-root-full-dpr-corrected.png` at `850x9168` with `roll20-root-dpr-complete-manifest.json`. Verification: `corepack pnpm run audit:roll20-root-stitch -- reports\roll20-actual-compare\2026-06-18-state-map-v1` PASS for AW2E, Les-Oublies, and YSHY; `node scripts\roll20_actual_screenshot_diff.mjs reports\roll20-actual-compare\2026-06-18-state-map-v1` reports AW2E sandbox mismatch `10.52%`; `corepack pnpm run smoke:roll20-full-root-candidates -- reports\roll20-actual-compare\2026-06-18-state-map-v1` reports AW2E best `normal-source-state` at `8.98%` with root delta `+2424.938px`; `corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1` now reports `trustedFullRoot=3/3`. Renderer remains HOLD: `gate:roll20-renderer-action` now has one blocker, because the best diagnostic patch is not uniform across fixtures (`none` for AW2E, `inline-block+text-input-height` for Les-Oublies, `text-input-height` for YSHY). This is stronger actual Roll20 evidence, not Roll20 visual parity and not permission to apply production renderer CSS.
Current Roll20 actual-screen note, 2026-06-19 AW2E full-root capture attempt:
AW2E actual Roll20 editor segment capture succeeded with five ignored local screenshots under `reports/roll20-actual-compare/2026-06-18-state-map-v1/local-baseline/official-roll20-AW2E/screenshots/`. Added `scripts/roll20_overlap_stitch_diagnostic.mjs` and `corepack pnpm run stitch:roll20-overlap-diagnostic` to inspect segment continuity when iframe DOM/scrollTop cannot be read. The generated `aw2e-overlap-stitch-diagnostic.png` is `720x2093` and useful for diagnosis, but visible seams remain, so it is not promoted to trusted `roll20-sandbox-root-full-dpr-corrected.png` evidence. Renderer action remains HOLD until AW2E gets a stricter DPR-corrected full-root capture/manifest or a validated stitch path.

Current Roll20 renderer note, 2026-06-19 AW2E long diagnostic capture:
A longer AW2E Roll20 iframe segment capture reached 38 ignored local screenshots and stitched to `aw2e-long-overlap-stitch-diagnostic.png` at `720x12062`. This reduced the diagnostic root-height delta from `+10398.063px` to `+1726.938px`, proving the earlier 10-segment diagnostic was too short. The evidence remains `DIAGNOSTIC_ONLY`: `audit:roll20-root-stitch` still skips AW2E as untrusted, and `gate:roll20-renderer-action` remains HOLD. The next action is not CSS yet; resolve AW2E coverage/default-state/root-height drift or capture trusted DPR-corrected full-root evidence.

Current Roll20 renderer note, 2026-06-19 diagnostic-only AW2E full-root comparison:
`smoke:roll20-full-root-candidates` now compares overlap-stitch images only as `DIAGNOSTIC_COMPARED`, storing the best result as `diagnosticBestCandidate` instead of trusted `bestCandidate`. AW2E diagnostic comparison produced `sandbox-text-input-270-source` at `7.93%`, but the local root height delta is `+10398.063px`, so it is evidence that AW2E still needs a trustworthy full-root capture rather than a production renderer patch. `gate:roll20-renderer-action` now prints this as a `WARNING` while keeping `HOLD_PRODUCTION_RENDERER_PATCH` and trusted full-root count at `2/3`.
Current Roll20 actual-screen note, 2026-06-19 AW2E dense segment/audit update:
AW2E is visible in the dedicated Roll20 Sandbox editor via the visible DOM/iframe-expanded controls, but the iframe document/root remains unreadable through normal page DOM. A denser ignored local capture set was created as `aw2e-dense-scroll-segment-00..09.jpg`, producing `aw2e-dense-overlap-stitch-diagnostic.png` at `720x3418` with 10 segments. This is better diagnostic coverage, not trusted full-root evidence. `audit:roll20-root-stitch` now reports AW2E as `SKIP` with `DIAGNOSTIC_ONLY` overlap evidence, and `gate:roll20-renderer-action` now surfaces that exact blocker. Roll20 upload refresh attempts through JS snippet, CDP `DOM.setFileInputFiles`, and file chooser remained blocked/unsupported in the current Chrome extension environment.
Current Roll20 renderer/chat note, 2026-06-19 actual evidence gate cleanup:
`scripts/roll20_renderer_action_gate.mjs` now treats generated-sheet Sandbox/chat evidence separately from optional solo-room observation evidence. Latest gate rerun no longer blocks on `actual evidence incomplete` once `status:roll20-actual` reports `GENERATED_ACTUAL_SCREENSHOTS_DIFFED`, `generatedActualScreenshots=6/6`, and `generatedDiffed=6/6`. Production renderer CSS is still HOLD because only 2/3 fixtures have full-root candidates and the best diagnostic patch family is not uniform across fixtures.

Current local chat-renderer note, 2026-06-19 Roll20 message shell update:
`components/editor/ChatPane.tsx` now injects a Roll20-derived chat shell subset for `textchatcontainer`, `message`, `spacer`, `by`, `tstamp`, inline rolls, and the default rolltemplate table. Local chat cards now use Roll20's message-row structure instead of treating `.spacer` as a card wrapper, and the remaining broken Korean copy in the chat pane was replaced with readable labels. Latest local smoke: `node scripts\rolltemplate_chat_smoke.mjs --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/rolltemplate-chat-smoke --port 4411` PASS for AW2E, Les-Oublies, and YSHY. Message rows now measure `300px` in the local app panel and inner rolltemplate cards measure `269px`; actual Roll20 chat screenshots still mismatch heavily, so this is a shell-alignment step, not actual Roll20 chat parity.
Current edit-mode verification note, 2026-06-19 imported sync smoke hardening:
`scripts/imported_edit_sync_smoke.mjs` now rejects non-leaf layer-reorder candidates unless the moving node and target are true siblings with the same parent/depth. This prevents a parent/child container from being treated as a Figma-like sibling reorder target. The free-placement check also no longer uses a naive first-closing-tag string bound after DOM already proves the new widget is nested under the active frame; that false-negative hid a valid absolute-in-frame drop in Les-Oublies. Latest local rerun: `corepack pnpm run smoke:imported-edit-sync -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/imported-edit-sync --port 4424` PASS for AW2E, Les-Oublies, and YSHY 1BU. AW2E/YSHY still report resource WARNs from external image loading, so this is edit interaction/sync evidence only, not visual parity.

Current local chat-renderer note, 2026-06-19 Roll20 shell alignment:
`components/editor/ChatPane.tsx` now uses readable Korean copy and wraps local
chat cards with Roll20-like `textchatcontainer`, `message`, `spacer`, `by`, and
`tstamp` classes. `scripts/rolltemplate_chat_smoke.mjs` now verifies that shell
structure in addition to rolltemplate card rendering. Latest local smoke:
`node scripts\rolltemplate_chat_smoke.mjs --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/rolltemplate-chat-smoke --port 4411`
PASS for AW2E, Les-Oublies, and YSHY; all three rendered rolltemplate cards at
`280px`, with Roll20 shell markers present and no debug `rolltemplate:name`
label. This is still local app evidence only, not actual Roll20 chat parity.

Current Roll20 actual-screen note, 2026-06-19 chat evidence split:
`scripts/roll20_actual_status.mjs` and `scripts/roll20_upload_handoff.mjs` now
distinguish Roll20 chat DOM evidence and page-level screenshots from a
trustworthy `roll20-chat.png` screenshot. Latest status/handoff rerun shows
AW2E and YSHY still have missing chat screenshots, while Les-Oublies is
`chat-dom-page-screenshot-only` / `DOM_PAGE_ONLY`: Roll20 chat DOM evidence and
`roll20-chat-page.png` exist, but the page screenshot is not accepted as chat
visual evidence. This means local rolltemplate/chat smoke remains useful, but
actual Roll20 rolltemplate visual parity is still unverified.

Current Roll20 actual-screen note, 2026-06-19 handoff alignment update:
Chrome could still claim the dedicated Roll20 editor tab, but the ordinary page
DOM path could not read the character iframe (`contentDocument` unavailable for
the relevant iframes), and this Chrome runtime blocks the CDP target discovery/
auto-attach methods needed for the deeper iframe probe. No existing room was
modified. `scripts/roll20_upload_handoff.mjs` now uses the same sandbox evidence
gate as status/diff: AW2E is listed as `SUSPECT` and still needs generated
actual evidence because its fallback `roll20-sandbox.png` has no positive DOM/
root sidecar; Les-Oublies and YSHY have generated sheet evidence present but
still need Roll20 chat screenshots. Latest handoff command:
`corepack pnpm run handoff:roll20-upload -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --missing-only`.

Current Roll20 actual-screen note, 2026-06-19 screenshot-diff truthfulness update:
`scripts/roll20_actual_screenshot_diff.mjs` now applies the same evidence gate as
`scripts/roll20_actual_status.mjs`. A fallback `roll20-sandbox.png` viewport
capture is no longer diffed unless positive iframe DOM/root evidence proves the
sheet actually rendered. Latest local rerun:
`node scripts\roll20_actual_screenshot_diff.mjs reports\roll20-actual-compare\2026-06-18-state-map-v1`
reports AW2E sandbox `SUSPECT`, Les-Oublies sandbox `6.57%`, YSHY sandbox
`22.93%`, and all room/chat targets still `SKIP`. This keeps endpoint-storage or
blank-iframe screenshots from being counted as Roll20 visual evidence. Actual
Roll20 parity is still not proven; next P0 remains file-input/full activation
for AW2E plus trustworthy Roll20 chat screenshots.

Current Roll20 actual-screen note, 2026-06-19 legacy manifest update:
live Roll20 sandbox verification found that the AW2E official source
`sheet.json` declares `"legacy": true`, while the generated local verification
payload had been writing `"legacy": false`. `scripts/roll20_actual_local_baseline.mjs`
now resolves fixture legacy mode from fixture metadata or the official source
`sheet.json`; regenerating AW2E produced a payload `sheet.json` with
`"legacy": true`. Applying the regenerated AW2E payload to the dedicated
Roll20 sandbox still left the character iframe blank, and applying the official
AW2E source files plus original `sheet.json` also left the iframe blank. Treat
AW2E endpoint-fallback evidence as blocked/invalid until the file-input upload
path or another Roll20 sandbox condition is verified. A later attempt to restore
the YSHY generated payload through the same endpoint path also reopened as an
empty iframe, so the endpoint fallback itself is now suspect as an activation
path and must not be used as render proof without a fresh iframe DOM check.
Current status remains
partial: `corepack pnpm run status:roll20-actual --
reports\roll20-actual-compare\2026-06-18-state-map-v1` reports
`generatedActualScreenshots=2/6`, `generatedDiffed=2/6`,
`roomObservationScreenshots=0/3`, and `roomObservationDiffed=0/3`; this does
not prove AW2E visual parity. AW2E is now reported as `SUSPECT` because only a
fallback viewport PNG exists without positive iframe DOM/root sidecar evidence.

Current Roll20 actual-screen note, 2026-06-19 endpoint viewport update:
the dedicated Roll20 sandbox endpoint fallback was reused for AW2E and YSHY.
POSTs to `/sheetsandbox/savesheetsettings` accepted base64 HTML/CSS/translation,
and `/campaigns/savesettings/21639681` saved each fixture's
`customcharsheet_json`. Later rechecks downgraded AW2E endpoint viewport
evidence to `SUSPECT`, so it must not be used as render proof. Ignored
evidence currently counts Les-Oublies DPR-corrected full-root mismatch `6.57%`
and YSHY DPR-corrected full-root mismatch `22.93%`; AW2E needs a fresh
file-input/full-activation check. Latest status is still partial:
`corepack pnpm run status:roll20-actual --
reports\roll20-actual-compare\2026-06-18-state-map-v1` reports
`generatedActualScreenshots=2/6`, `generatedDiffed=2/6`,
`roomObservationScreenshots=0/3`, and `roomObservationDiffed=0/3`.
`--require-actual` still correctly fails because all 3 Roll20 chat screenshots
are missing. AW2E/YSHY viewport screenshots classify as
`viewport/crop/sheet size dominates current diff`; they still need
DPR-corrected sheet-root/full-root capture before renderer CSS conclusions.

Current Roll20 actual-screen note, 2026-06-19 DPR-corrected update:
complete DPR-corrected sheet-root-only evidence is now preferred over the older
contaminated `roll20-sandbox-root-full.png`. `corepack pnpm run
audit:roll20-root-stitch -- reports\roll20-actual-compare\2026-06-18-state-map-v1`
PASSes Les-Oublies and records the old scaled full-image stitch as superseded
evidence. `node scripts\roll20_actual_screenshot_diff.mjs
reports\roll20-actual-compare\2026-06-18-state-map-v1` now compares local
preview against `roll20-sandbox-root-full-dpr-corrected.png` and reports
Les-Oublies sandbox mismatch `6.57%` (`850x3771` local vs `852x4122` actual).
`corepack pnpm run smoke:roll20-full-root-candidates -- ...` now finds
diagnostic candidate `sandbox-inline-block-text-input-276-source` at `3.87%`
with root delta `-0.656px`; `diagnose:roll20-geometry` shows rows/tables are
near-aligned in that candidate. This is a strong next renderer clue, not visual
parity and not a production CSS patch yet. AW2E/YSHY generated Roll20 full-root
captures and trustworthy chat screenshots remain missing.
Pre-upload/evidence guard update: the prior `payload-roundtrip` FAIL was stale
local baseline evidence. Regenerating the local baseline for all three prepared
fixtures with the same state map, then rerunning payload roundtrip, produced
AW2E `0%`, Les-Oublies `0%`, and YSHY `0%`. `verify:roll20-preupload` now
regenerates local baseline/upload payloads before the audits so this stale
baseline failure mode is less likely to recur. Les-Oublies remains the only
fixture with generated actual Roll20 full-root screenshot evidence in this run.
Follow-up full-root candidate decomposition: `corepack pnpm run
smoke:roll20-full-root-candidates --
reports\roll20-actual-compare\2026-06-18-state-map-v1` now clears each
fixture's candidate artifact folder before writing crops, adds text-input-height
only candidates, and writes a Component Effect Summary. Latest Les-Oublies
result still finds diagnostic `sandbox-inline-block-text-input-276-source` as
pixel/geometry best at `3.87%` mismatch and root delta `-0.656px`. The
decomposition shows text-input height alone does not explain the Roll20 delta
and actually worsens geometry, while inline-block whitespace/fit candidates
remove the row wrap and provide most of the improvement. This remains
diagnostic-only: do not promote `word-spacing`, `nowrap`, or input-height CSS to
production until repeated actual Roll20 captures across AW2E/YSHY or additional
fixtures confirm it is a generic Roll20 runtime behavior.
Follow-up upload/capture handoff update: direct Chrome upload automation was
retried against the dedicated Roll20 sandbox. The standard file chooser path
timed out, and heavier editor CDP inspection also timed out on the Roll20 editor
DOM, so no new actual Roll20 screenshot was captured in this batch. The handoff
script now supports `--missing-only` and lists exact payload files, screenshot
targets, stitch manifest path, stitch/audit/diff/status commands, and whether
generated actual/chat evidence is still missing. Latest command
`corepack pnpm run handoff:roll20-upload --
reports\roll20-actual-compare\2026-06-18-state-map-v1 --missing-only` writes
local-only ignored handoff evidence and shows 3 visible entries: AW2E and YSHY
need generated actual + chat evidence, while Les-Oublies still needs chat
evidence. `corepack pnpm run status:roll20-actual --
reports\roll20-actual-compare\2026-06-18-state-map-v1 --require-actual`
correctly fails with `PARTIAL_GENERATED_ACTUAL_SCREENSHOTS`,
`generatedActualScreenshots=1/6`, and `commandGate=NEEDS_ACTION`.

Current Roll20 actual-screen note, 2026-06-19: the older Les-Oublies `18.81%`
full/viewport sandbox screenshot diff is superseded by the preferred
`roll20-sandbox-root.png` crop path. `corepack pnpm run crop:roll20-actual`
created a local-only root crop from measured iframe metadata, and
`node scripts\roll20_actual_screenshot_diff.mjs reports\roll20-actual-compare\2026-06-18-state-map-v1`
now reports Les-Oublies sandbox mismatch `21.67%` after CSS-size normalization.
`corepack pnpm run classify:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1`
now separates two facts: the root crop is only the visible top of the tall
sheet (`760x556` vs local full preview `850x4478`), and the compared visible
viewport itself still mismatches by `21.67%`. This is partial actual Roll20
evidence, not visual parity; next evidence step is visible-crop CSS/assets/state
inspection plus full-height/scroll-stitched Roll20 root capture before any
full-sheet parity claim.
Follow-up visible-crop diagnostics:
`corepack pnpm run diagnose:roll20-visible-crop -- reports\roll20-actual-compare\2026-06-18-state-map-v1`
now writes ignored PNG artifacts and reports Les-Oublies `760x556` mismatch
`21.67%`, top-aligned local crop gain only `0.34%`, full-crop mismatch bounds
`0,0,760,556`, dominant band `bottom`, dominant quadrant `bottomLeft`. This
rules out simple horizontal crop drift as the main cause; next inspection should
compare actual/local visible CSS, default state, asset rendering, and Roll20
scale/layout context.
Follow-up visible-context diagnostics:
`corepack pnpm run diagnose:roll20-visible-context -- reports\roll20-actual-compare\2026-06-18-state-map-v1`
now reports that current evidence still cannot read the actual Roll20 iframe
DOM/CSS. For Les-Oublies, the top ranked issue is the Roll20
viewport/full-height evidence gap: actual visible crop `760x556` covers only
`12.42%` of local `850x4477`; the matched visible crop still mismatches
`21.67%`, crop gain is only `0.34%`, sandbox sanitize rewrites both HTML/CSS,
the local state hint `act_fullsheet` needs actual confirmation, 7 asset URLs are
proxied, and chat has DOM evidence but no trustworthy screenshot. AW2E and YSHY
still lack generated Roll20 sandbox screenshots. This is diagnostic triage, not
visual parity.
Follow-up same-context visible smoke:
`corepack pnpm run smoke:roll20-same-context-visible -- reports\roll20-actual-compare\2026-06-18-state-map-v1`
renders local payload candidates using normal root, local Sandbox expected root,
measured frame inset, and fit-to-visible-width captures. Les-Oublies best
candidate is `normal-root-top-left` at `21.60%`, barely different from the
previous `21.67%`. This means measured local context simulation does not
materially explain the remaining visible mismatch; next work should prioritize
actual computed-style/state/asset evidence and full-height/scroll-stitched
Roll20 root capture rather than more crop/inset guessing.
Follow-up live iframe computed-style probe:
Chrome/CDP could read the actual Roll20 character iframe for the generated
Les-Oublies sandbox sheet. Local ignored evidence is under
`reports/roll20-actual-compare/2026-06-18-state-map-v1/live-iframe-probe/`.
Actual Roll20 state is `sheetTab=combat` / `sheetTabForBtn=combat`; adding
no-state local candidates only moved the same-context smoke best result to
`normal-root-no-state` at `21.60%`, so the state-map mismatch alone does not
explain the visible delta. The computed-style comparison now shows a concrete
Roll20 baseline mismatch: actual `.charactersheet` is content-box, `832px`
computed width plus `10px` padding, `13px` font, `18.5714px` line-height, and
transparent background, while the best local candidate still uses app-like
`border-box`, `900px` root width, `14px` font, `20px` line-height, white
background, and Bootstrap/app-style input padding. Next renderer work should
align local preview/edit baseline CSS with these actual Roll20 values before
tuning crop/inset guesses.
Renderer alignment slice:
the obsolete hand-written `roll20BaselineCss` fallback was removed from iframe
and Shadow render paths, and the full Roll20 `vtt.css` dump was removed from the
sheet preview baseline because it injected app/VTT UI font rules into the sheet.
The Shadow edit host also no longer forces every rendered sheet element to
`box-sizing: border-box`; actual Roll20 probe evidence showed the sheet root is
content-box, and the forced edit-only box model was a preview/edit divergence
risk.
After this change, `corepack pnpm run smoke:roll20-same-context-visible --
reports\roll20-actual-compare\2026-06-18-state-map-v1` reports Les-Oublies best
candidate `normal-root-no-state` at `21.38%` instead of `21.60%`. The improvement
is small but the computed-style probe is cleaner: `html` no longer differs, and
input font/background/padding no longer show the app-like `proxima`/white/padded
override. Remaining deltas are root width/context (`852` actual vs `900` local in
the same-context probe), full-height mismatch, table-count/structure mismatch,
and control height/button background details. This is still not visual parity.
Regression check after the Shadow box-model change:
`corepack pnpm run smoke:preview-edit-visual -- --out-dir ./out --base-path
/roll20-block-editor --fixtures test-fixtures/visual --report-dir
reports/preview-edit-visual --port 4336` PASS: AW2E `1.75%`, Les-Oublies
`2.02%`, YSHY 1BU `1.01%`.
Follow-up DPR/root-width same-context diagnostic:
`corepack pnpm run smoke:roll20-same-context-visible --
reports\roll20-actual-compare\2026-06-18-state-map-v1` PASS after the smoke
began rendering local candidates with the measured Roll20 crop DPR
(`deviceScaleFactor=1.25`), actual-root-width context patches, native-pixel
comparison, and root-relative computed-style samples. Les-Oublies now selects
`sandbox-actual-root-width-no-state` by the computed-style tie-breaker, with CSS
mismatch `21.49%` and native mismatch `21.55%`. This is not a material parity
gain over `21.67%`; it proves width/context alone is not the fix. The best local
candidate root width can match actual `852px`, but root height still differs
(`4121.575px` actual vs `4963.266px` local). Follow-up Chrome/CDP fresh selected
selector probing saved ignored live evidence under
`reports/roll20-actual-compare/2026-06-18-state-map-v1/live-iframe-probe/`;
rerunning the same smoke now shows `.sheet-2colrow`, `.sheet-col`, `img`,
`table`, and `input` counts all come from `selected` sources and match local
counts. The remaining clue is not selector-count loss, but geometry: first
`.sheet-2colrow` height `310.6px` actual vs `554px` local, table/input height
deltas, and full root height mismatch. Next P0 is full-height/scroll-stitched
Roll20 root capture plus deeper row/table/control height comparison before
changing generic renderer CSS.
Follow-up geometry delta diagnostic:
`corepack pnpm run diagnose:roll20-geometry --
reports\roll20-actual-compare\2026-06-18-state-map-v1` now writes an ignored
row/table/input height report. It confirms selected counts match and ranks the
content issue as `.sheet-2colrow` geometry, not selector loss. A targeted actual
Roll20 row probe shows row 0 actual is `310.6px` with two inline columns on one
line, while the local best candidate wraps the second column to the next line
and makes row 0 `554px`. A diagnostic `sandbox-inline-block-fit-tolerance`
candidate proves the wrap can be removed (`554px -> 297px`), but its image
mismatch is slightly worse (`21.56%` vs `21.49%`), so this is evidence, not a
production CSS patch. Next P0 remains full-height/scroll-stitched capture plus
generic Roll20 inline-block/rounding context investigation.
2026-06-19 follow-up: `diagnose:roll20-geometry` now falls back to the newer
full-root candidate smoke when the older same-context visible report is SKIP,
so it compares the stitched full-height Roll20 root against the best local
full-root candidate instead of repeating visible-crop guidance. Current
Les-Oublies unresolved gaps are narrowed to row 0 and row 3 inline-block
wrap/placement plus table 4 and table 5 height deltas of about `106px` and
`104px`. Local candidate/baseline geometry probes now capture two descendant
levels plus `white-space`, `word-spacing`, `letter-spacing`, and `zoom`; the
next fresh Roll20 iframe probe should capture the same depth before any generic
renderer CSS patch.
2026-06-19 deep-probe follow-up: a fresh ignored Chrome/CDP target-geometry
probe from the dedicated Roll20 sandbox iframe is now preferred by
`diagnose:roll20-geometry`. The report normalizes y positions relative to the
sheet root because the Roll20 iframe may be scrolled, and it no longer truncates
nested target comparisons at 12 children. The table height problem is now
localized to Roll20 repeating control rows: table 4 rows 1/16 and table 5 rows
16/17 are `Modify+Add` rows where actual Roll20 is `37.6px` high and the local
candidate is `86.734px` high, about `49px` extra per row. This is a generic
repeating-control/runtime CSS investigation target, not a Les-Oublies-specific
sheet patch. Row 0/3 inline-block wrap remains the other active geometry gap.
2026-06-19 repeating-runtime follow-up: preview/edit now hide
`fieldset.repeating_*` prototypes and add Roll20-like `repcontainer` plus
`repcontrol` (`Modify`, `+Add`) nodes during rendering only; the exported source
HTML is not mutated. Direct full-root candidate evidence improved root height
delta from `841.266px` before the repeating work to `375.375px` after the
runtime emulation. `diagnose:roll20-geometry` now shows table 4/5 height deltas
are no longer the active large gap; row 0 and row 3 `.sheet-2colrow` wrapping
remain. Current direct candidate mismatch is `8.58%` and the prior actual
Roll20 full-root screenshot diff improved from `6.90%` to `6.63%` after a fresh
local baseline/diff. The classifier still reports `sheet root geometry/height
differs after full-height capture`, so this is not visual parity.
2026-06-19 inline-block candidate follow-up: `smoke:roll20-full-root-candidates`
now tests word-spacing tolerances (`-0.25px` to `-1px`), a font-size-zero
inline-block diagnostic, and a combined inline-block plus text-input native
height diagnostic. The combined `sandbox-inline-block-text-input-276-source`
candidate is useful evidence because it nearly matches full-root height
(`rootDelta -0.656px`) and fixes row 0/table 0 geometry (`row0 311.375px`,
`table0 198.375px`, text input `27.594px`), but its image mismatch is worse
(`9.10%` versus the current direct best `8.58%` and the app local-preview diff
`6.63%`). Do not promote this to production CSS yet. Next P0 is to inspect why
the app local-preview path remains visually closer than direct candidates and to
capture/compare actual Chrome-local preview versus Roll20 Chrome before adding a
generic inline-block/native-input metric patch.
2026-06-19 source-vs-payload split follow-up:
`scripts/roll20_payload_roundtrip_visual_smoke.mjs` now records target geometry,
and `diagnose:roll20-geometry` now renders separate app source-preview and
export-payload-preview geometry sections. Latest payload roundtrip still FAILs
overall because AW2E/YSHY exceed the strict local 2% gate, but Les-Oublies
PASSes with `0%` source-vs-payload mismatch. Les-Oublies source preview and
export payload preview are both `850x3771`, both have row 0 at `553px`, and both
have row 3 at `274px`; actual Roll20 remains `852x4122`, row 0 `310.6px`, row 3
`140.2px`. This rules out emitted-payload drift as the current Les-Oublies root
cause and keeps the next P0 on actual Roll20 inline-block fitting/layout context.
2026-06-19 geometry-fit split follow-up:
`smoke:roll20-full-root-candidates` now separates pixel best from geometry best.
Additional diagnostic candidates tested actual root width `+1/+2px`, row width
`+1/+2px`, `white-space: nowrap`, and nowrap plus text input `27.6px`.
Les-Oublies pixel best is still `normal-actual-root-width-source` at `8.58%`
mismatch but with poor geometry score `1129.775`; geometry best is
`sandbox-nowrap-text-input-276-source` with near-matching root/row geometry
(`rootDelta -0.656px`, row0 `+0.775px`, row3 `-3.2px`) but worse visual
mismatch `9.09%`. This means the next P0 is not an off-by-one width patch. The
geometry-best overlay/crop/state needs inspection before any generic nowrap or
native-input CSS is promoted to production.
2026-06-19 mismatch-distribution follow-up:
`scripts/roll20_full_root_candidate_smoke.mjs` now records dominant vertical,
horizontal, and decile diff regions per candidate. Latest Les-Oublies evidence:
pixel best `normal-actual-root-width-source` has dominant diff `top 12.35%`,
`left 9.65%`, `d0 15.99%`; geometry best
`sandbox-nowrap-text-input-276-source` has dominant diff `top 13.07%`,
`left 9.83%`, `d1 20.18%`. The geometry-best candidate fixes the root height
but worsens the upper-sheet visual mismatch, so the next P0 is to inspect the
top/d1 overlay and actual Roll20 screenshot state/background/crop before any
production renderer CSS change. AW2E/YSHY still need actual full-root
screenshots; this remains diagnostic only, not visual parity.
2026-06-19 actual full-root crop/stitch correction:
dominant decile crop triplets are now written by
`scripts/roll20_full_root_candidate_smoke.mjs`. Inspecting the geometry-best
Les-Oublies crop showed the actual `roll20-sandbox-root-full.png` includes
Roll20 VTT toolbar/grid pixels on the left while the local crop is sheet-only.
`scripts/roll20_actual_difference_classify.mjs` now reads
`roll20-sandbox-root-full.json` and classifies Les-Oublies as
`actual full-root crop/stitch includes non-sheet context or scale mismatch`.
Latest evidence: `8/8` full-image clipped segments with source width `682px`
are scaled to claimed root width `852px`. Next P0 is to recapture generated
Roll20 full-root screenshots with sheet-root-only clipping that excludes VTT
toolbar/grid before applying renderer CSS changes. Treat the current full-root
geometry/height diagnosis as lower-confidence until that capture is normalized.
2026-06-19 Chrome DPR capture probe:
CDP `DOM.getBoxModel` in the Roll20 editor tab can read the actual
`.charactersheet` box (`852px` wide, about `4121.6px` tall). A screenshot clip
using `devicePixelRatio=1.25` correction produced clean sheet-only visible
evidence; uncorrected clips still included VTT grid context. Added
`corepack pnpm run audit:roll20-root-stitch -- <run-dir>` to fail suspect or
incomplete stitched-root evidence. Latest audit intentionally FAILs the current
Les-Oublies evidence because the old full-root stitch scales `682px -> 852px`
full-image segments and the first DPR-corrected manifest is incomplete. Do not
use current full-root diff for renderer CSS decisions until a complete
DPR-corrected sheet-root-only stitch passes this audit.
Follow-up actual layout-context probe:
Chrome/CDP read-only probing of the dedicated Roll20 sandbox iframe saved
ignored evidence at `live-iframe-probe/official-roll20-Les-Oublies-layout-context.json`.
Actual Roll20 has the expected source `.sheet-outline` wrapper, so the wrapper
was not lost by import/export. The row chain is row -> `.sheet-character` ->
`.sheet-outline` -> `.charactersheet` -> `form.sheetform` -> `.tab-content` ->
`.dialog.largedialog.characterviewer` -> `#dialog-window.ui-dialog`. A new
diagnostic `sandbox-dpr-border-snap-no-state` same-context candidate tested
whether DPR-scaled border widths alone explain the row wrap; it did not beat the
current best and row 0 still wrapped. The current strongest clue is still
inline-block whitespace/fit behavior: a word-spacing tolerance candidate keeps
row 0 on one line but slightly worsens overall image mismatch, so it is not a
production patch.
Follow-up full-height Roll20 root capture:
Chrome/CDP read-only probing of the dedicated Roll20 sandbox iframe captured 8
scroll segments from `#dialog-window`, then
`corepack pnpm run stitch:roll20-actual-root -- --manifest reports\roll20-actual-compare\2026-06-18-state-map-v1\local-baseline\official-roll20-Les-Oublies\screenshots\roll20-root-stitch-clipped-manifest.json --out reports\roll20-actual-compare\2026-06-18-state-map-v1\local-baseline\official-roll20-Les-Oublies\screenshots\roll20-sandbox-root-full.png`
created a local-only `852x4122` full-height root image. The first full-height
diff now reports Les-Oublies sandbox mismatch `6.90%`, replacing the old
`21.67%` visible-top crop as the main generated-sheet evidence for this fixture.
`corepack pnpm run classify:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1`
now classifies the remaining mismatch as `sheet root geometry/height differs
after full-height capture`: Roll20 actual root is `852x4122`, while the local
preview is `850x4478`. This is real progress toward Roll20 parity but still not
visual parity. AW2E/YSHY generated Roll20 screenshots and all trustworthy chat
screenshots remain missing, and the next P0 is actual-vs-local row/table/control
geometry comparison before renderer CSS changes.

| Status | Owner | Task | Evidence / Next Check |
| --- | --- | --- | --- |
| DOING | Codex | Keep this TODO board current while work proceeds. | Update after each implementation/verification batch. |
| DONE | Codex agents | Audit why edit canvas and preview can diverge. | Report: split renderer/CSS path risk. Rechecked against current `web-push-main` before patching. |
| DONE | Codex agents | Audit worker JS and rolltemplate/chat path. | Report: current branch already has chat tab; worker layer still needs long-term split. |
| DONE | Codex agents | Audit CI/CD and browser roundtrip setup. | Report: use current `web-push-main` as source of truth; older `web` notes are stale where they conflict. |
| DONE | Claude CLI | Run read-only cross-review when auth/tooling allows. | Claude CLI `2.1.144`; review confirmed current reports prove Node import determinism only. |
| DONE | Codex/Claude | First Figma-like flow drop slice for edit mode. | Browser smoke PASS: `reports/edit-flow-smoke/edit-flow-smoke-results.md`. Real `dragover`/`drop` DragEvents verified: background drop -> absolute frame, drop over section -> flow nesting with no `position:absolute`, 0 console errors. Existing-object mouse drag is covered too: latest smoke moved a section and confirmed computed position and emitted CSS rule both landed at `left: 464px; top: 256px`. Canvas dragover now marks the active container with `data-r20-drop-mode="inside"`, and leaf sibling targets expose `before`/`after` insertion line modes; dropping new text inputs before and after an existing nested input changes emitted HTML order. Layer row dragover exposes top/middle/bottom -> `before,inside,after`. Latest synthetic layer smoke also moves a non-leaf group with a connected next sibling after its sibling, while preserving both groups child inputs in emitted HTML. Latest synthetic absolute-inside-frame smoke drags an input inside a frame and confirms emitted/computed parent `position:relative` plus child `position:absolute; left/top` match. Edit toolbar now has readable `?�름`/`?�유` placement mode and `scripts/edit_flow_browser_smoke.mjs` checks `?�트 ?�집`, `?�이??, `?�이??검??, `?�름`, `?�유` with no Han-range mojibake in the edit canvas text. Latest synthetic free-mode smoke drops a gallery text input into a frame and confirms the child is nested inside that frame with emitted/computed `position:absolute; left/top`, while the frame is `position:relative`. Smoke runs against static `out/` export via `scripts/edit_flow_browser_smoke.mjs`; no dev server needed. |
| DONE | Codex | Organize project docs and operating rules. | Added `docs/operations/33_working_rules_and_requirements.md`, `docs/PROJECT_STRUCTURE.md`, `docs/README.md`, `reports/README.md`, and `scripts/README.md`; `lint` and `build` passed. |
| DONE | Codex | Archive stale QA markdown and add folder indexes. | Moved old `qa_*` snapshots into `docs/qa/archive/`; added README indexes for docs subfolders; `lint` and `build` passed. |
| DONE | Codex | Split requirements into actionable gap matrix and branch plan. | Added `docs/qa/34_requirements_gap_matrix.md`, `docs/operations/34_branch_and_deployment_plan.md`, and CI workflow. `lint`, `build`, `main` CI, `dev` CI, and Pages deploy passed. |
| DONE | Codex | Harden shared agent rules with mandatory references. | Added startup checklist, source safety, forbidden claims, branch/deploy rules, and minimum verification commands to `docs/operations/33_working_rules_and_requirements.md`; `lint` and `build` passed. |
| DONE | Codex | Move agent-only rules out of README files. | Added root `AGENTS.md`, removed agent-only startup rule text from README files, and linked `AGENTS.md` from the operations rulebook; `lint` and `build` passed. |
| DONE | Codex | Add standalone preview cascade leak diagnostics. | Added `scripts/make_cascade_leak_pages.mjs` and `scripts/serve_static_dir.mjs`; Browser-computed report: `reports/cascade-leak/cascade-leak-results.md`. |
| DONE | Codex | Add live Shadow DOM cascade leak diagnostics. | `scripts/live_shadow_cascade_smoke.mjs` PASS for AW2E, Les-Oublies, YSHY 1BU: preview/edit Shadow DOM sampled visible properties had 0 app-like CSS winners. Report: `reports/live-shadow-cascade/live-shadow-cascade-results.md`. External asset failures are tracked separately from cascade leakage. |
| DONE | Codex | Add imported fixture preview/edit screenshot smoke. | `corepack pnpm run smoke:preview-edit-visual -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/preview-edit-visual --port 4314` PASS after `build`: 3 fixtures rendered preview root + edit root with 0 console/page errors and 0 resource issues after iframe referrer policy alignment. Latest diagnostic mismatch: AW2E 1.76%, Les-Oublies 1.68%, YSHY 1BU 0.85%; edit host/content height delta is 0 for all 3 and preview/edit toolbar overlap is 0. New DOM signature parity gate also PASS: preview/edit node counts, block-id counts, first 120-node sequence hash, tag/control counts, and visible runtime node count match for AW2E, Les-Oublies, and YSHY 1BU. This is local preview/edit parity evidence, not Roll20 actual-screen parity. |
| DONE | Codex | Add imported real-fixture edit drag sync smoke. | `scripts/imported_edit_sync_smoke.mjs` PASS after `build`: the 3 prepared ignored fixtures each found an imported visible input node that moved through the real edit pointer path, landed at the same position in preview, emitted matching absolute CSS, accepted a friendly widget drop into a visible imported sheet insertion target as non-absolute flow content, accepted a second user-facing free-placement drop as nested absolute content inside an imported frame/flow target, and survived edited emit -> re-import -> emit stability checks. Report: ignored `reports/imported-edit-sync/imported-edit-sync-results.md`. One fixture also found a safe imported layer leaf sibling pair and reordered it through the layer row path; the others record SKIP for that sub-check. 2026-06-19: smoke report now separates `Interaction` from `Resources`; `corepack pnpm run smoke:imported-edit-sync -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/imported-edit-sync --only yshy-commission-1bu --port 4296` reports interaction PASS but resources WARN for YSHY Imgur/Typekit failures. `corepack pnpm run smoke:imported-edit-sync:strict -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/imported-edit-sync --only official-roll20-AW2E --port 4298` PASS proves the strict path succeeds when resources load. This is local static-app evidence only, not actual Roll20 parity. |
| VERIFY | Codex | Capture full-height Roll20 sandbox root evidence. | DPR-corrected path captured 8 read-only Chrome/CDP sheet-root-only segments from the dedicated Roll20 sandbox iframe for Les-Oublies and stitched ignored `roll20-sandbox-root-full-dpr-corrected.png` at `852x4122`. `corepack pnpm run audit:roll20-root-stitch -- reports\roll20-actual-compare\2026-06-18-state-map-v1` PASSes Les-Oublies and treats the older scaled `roll20-sandbox-root-full.png` evidence as superseded. `node scripts\roll20_actual_screenshot_diff.mjs reports\roll20-actual-compare\2026-06-18-state-map-v1` reports generated Les-Oublies sandbox mismatch `6.57%` against local `850x3771`; classifier confirms DPR-corrected full-root evidence and keeps the issue as `sheet root geometry/height differs after full-height capture`. Endpoint fallback now also produced ignored Roll20 sandbox viewport screenshots for AW2E and YSHY, but those classify as viewport/crop/sheet-size dominated evidence, not full-root evidence. `verify:roll20-preupload` PASSes after fresh baseline regeneration. Still not DONE: AW2E/YSHY DPR-corrected full-root captures and all trustworthy chat screenshots remain missing, and the renderer fix is not yet promoted. |
| VERIFY | Codex | Diagnose full-root state/geometry candidates before renderer CSS changes. | `corepack pnpm run smoke:roll20-full-root-candidates -- reports\roll20-actual-compare\2026-06-18-state-map-v1` now uses DPR-corrected full-root evidence when present. Latest result: Les-Oublies best diagnostic candidate is `sandbox-inline-block-text-input-276-source` at `3.87%`, root delta `-0.656px`, row0 delta `0.775px`, row3 delta `-3.2px`, dominant diff middle/left/d5. `corepack pnpm run diagnose:roll20-geometry -- ...` now reports root delta `-0.656px` and top finding `TABLE.sheet-center-content`; row/table counts match in the best candidate. This is a renderer clue, not a shipped CSS fix. Next P0: inspect the best-candidate dominant crop and convert only generic Roll20 inline-block/control-height behavior into production if it survives preview/edit regression and additional actual screenshots. |
| DOING | Codex | Add Roll20 actual-screen verification workflow. | Latest local pre-upload gate PASS with state-map-aware baseline: `corepack pnpm run verify:roll20-preupload -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --fixtures test-fixtures\visual --out-dir ./out --base-path /roll20-block-editor --state-map reports\visual-state-candidates\visual-state-candidates-state-map.json`. `scripts/roll20_actual_status.mjs`, `scripts/roll20_actual_screenshot_diff.mjs`, and `scripts/roll20_upload_handoff.mjs` now all treat fallback `roll20-sandbox.png` as `SUSPECT` unless a positive iframe DOM/root sidecar proves the sheet rendered. Status/handoff also split chat DOM evidence from visual chat screenshots: Les-Oublies currently has `chat-dom-only`, while AW2E and YSHY have missing chat screenshots. Latest handoff rerun lists AW2E as `SUSPECT + needs generated actual`; Les-Oublies and YSHY have generated sheet evidence present but still need chat screenshots. Latest diff rerun reports AW2E `SUSPECT`, Les-Oublies sandbox `6.57%`, YSHY sandbox `22.93%`, and all room/chat targets `SKIP`. Latest status command reports `PARTIAL_GENERATED_ACTUAL_SCREENSHOTS`, `generatedActualScreenshots=2/6`, `generatedDiffed=2/6`, `roomObservationScreenshots=0/3`, and `roomObservationDiffed=0/3`. Chrome can claim the dedicated editor tab, but normal iframe DOM access is unavailable and this runtime blocks CDP target discovery/auto-attach, so no new actual screenshot was captured in this batch. This is partial actual Roll20 evidence, not visual parity. Next: unblock the file-input/full settings activation path, recapture AW2E, and add trustworthy Roll20 chat screenshots before renderer CSS promotion. |
| VERIFY | Codex | Align local preview/export with actual Roll20 sandbox sanitize/prefix behavior. | 2026-06-19 Chrome observation of the dedicated Roll20 sandbox settings page found `customcharsheet_json` on the visible settings surface and script references for `customcharsheet_layout`, `customcharsheet_style`, and `#customsheet-preview iframe -> #root`. Added first dedicated module `lib/emit/roll20SandboxSanitize.ts`, separate from `sanitizeForRoll20Legacy`, covering observed `.charsheet` selector prefixing, Roll20 URL allow/proxy/drop handling, mobile/comment stripping, unsafe-token rejection, HTML allow-listing, runtime-node stripping, and class-token prefix exceptions for `attr_`, `sheet-`, `repeating_`, `roll_`, and `act_`. Added `scripts/roll20_sandbox_sanitize_audit.mjs`, package script `audit:roll20-sandbox-sanitize`, and included it in `verify:roll20-preupload`. The export dialog exposes the same expected-transform diagnostics, and preview now has a `Sandbox ?�상` toggle that applies the sanitizer approximation in iframe preview only. Latest fixture browser smoke PASS: `corepack pnpm run smoke:roll20-sandbox-preview -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --fixture official-roll20-Les-Oublies --report-dir reports/roll20-sandbox-preview-smoke --port 4331`; normal preview `colgroup=6`, `rolltemplate=3`, `workerScripts=1`; Sandbox expected preview `colgroup=0`, `rolltemplate=0`, `workerScripts=0`, console/page errors 0. Verification: `corepack pnpm run test:roll20-sandbox-sanitize` PASS, `corepack pnpm run audit:roll20-sandbox-sanitize -- reports\roll20-actual-compare\2026-06-18-state-map-v1` PASS, `corepack pnpm run verify:roll20-preupload -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --fixtures test-fixtures\visual --out-dir ./out --base-path /roll20-block-editor --state-map reports\visual-state-candidates\visual-state-candidates-state-map.json` PASS from the prior gate, `corepack pnpm run lint` PASS, `corepack pnpm run build` PASS, and `corepack pnpm run smoke:preview-edit-visual -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/preview-edit-visual --port 4332` PASS. This is still not actual Roll20 visual parity. |
| VERIFY | Codex | Expand Roll20 Sandbox expected preview smoke to all prepared fixtures. | Added `--all` support and package script `smoke:roll20-sandbox-preview:all` for `scripts/roll20_sandbox_preview_smoke.mjs`. Latest run PASS/WARN: `corepack pnpm run smoke:roll20-sandbox-preview:all -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/roll20-sandbox-preview-smoke --port 4333`. AW2E, Les-Oublies, and YSHY 1BU all passed fixture-level sanitizer render checks; Sandbox expected preview stripped visible rolltemplate/source-worker runtime nodes to 0 for all three (`2 -> 0`, `4 -> 0`, `20 -> 0`). `Console status=WARN` records Roll20 image-proxy font CORS and source sheet numeric-expression warnings separately from sanitizer failures; page errors were 0. Verification: `node --check scripts\roll20_sandbox_preview_smoke.mjs` PASS, `corepack pnpm run lint` PASS, `corepack pnpm run build` PASS, and `corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1` still reports `PREUPLOAD_READY_MISSING_GENERATED_ACTUAL`. This is local expected-render coverage only, not actual Roll20 visual parity. |
| DONE | Codex | Surface Roll20 upload readiness clearly in the export dialog. | `components/editor/ExportDialog.tsx` separates local zip-file readiness from actual Roll20 Sandbox/test-room visual verification and uses readable Korean UI copy. It now also exposes a Roll20 Sandbox expected-transform diagnostic panel driven by `sanitizeRoll20SandboxHtml/Css`, showing HTML/CSS rewrite risk, runtime stripping, class/tag rewrites, URL proxy/drop counts, and fatal reject risk without mutating the zip payload. Latest static app smoke PASS: `corepack pnpm run smoke:export-dialog -- --out-dir ./out --base-path /roll20-block-editor --report-dir reports/export-dialog-smoke --port 4326`; it confirms the header and empty-state Korean copy, confirms no sample UI appears when the public sample catalog is empty, confirms no mojibake in the initial shell or export dialog text, opens the export dialog, confirms 5 readiness items, confirms the `?�제 검�??�요` badge, confirms the Sandbox diagnostics panel with 4 diagnostic rows, confirms the legacy toggle and local-vs-actual verification warning copy, opens the import dialog, and verifies main mode tab clicks with 0 console/page errors. New fixture-mode smoke PASS: `corepack pnpm run smoke:export-dialog -- --out-dir ./out --base-path /roll20-block-editor --report-dir reports/export-dialog-smoke-imported --fixtures test-fixtures/visual --fixture official-roll20-Les-Oublies --port 4325`; it imports a copied ignored fixture first, then confirms the export Sandbox diagnostics report `치명 ?�류 ?�음`, 4 rows, and expected rewrite rows for the real emitted payload. `corepack pnpm run test:roll20-sandbox-sanitize`, `corepack pnpm run audit:roll20-sandbox-sanitize -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `corepack pnpm run lint`, and `corepack pnpm run build` also PASS. Actual Roll20 visual parity remains under the separate Roll20 actual-screen TODO. |

## Critical Product Tasks

| Status | Priority | Task | Notes |
| --- | ---: | --- | --- |
| VERIFY | P0 | Make edit canvas and preview render from the same emitted HTML/CSS path, with edit overlays only. | Latest renderer-regression check after removing the Shadow edit forced `border-box` reset: `corepack pnpm run smoke:preview-edit-visual -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/preview-edit-visual --port 4336` PASS: AW2E 1.75%, Les-Oublies 2.02%, YSHY 1BU 1.01%. Earlier DOM-signature gate PASS showed matching preview/edit screenshot dimensions, edit host/content height delta 0, preview/edit toolbar overlap 0, 0 visible runtime nodes, and DOM signature parity PASS for node counts, block-id counts, tag/control counts, and sequence hash. Edit no longer keeps a fixed 900px canvas shell or renders the preview toolbar over the sheet. `scripts/imported_edit_sync_smoke.mjs` also PASS for 3 imported fixtures after fixing Shadow image referrer behavior and optimistic move clearing, and now includes imported visible-node move sync, imported canvas flow insertion, edited emit -> re-import -> emit stability, safe imported layer reorder where available, and non-leaf subtree reorder for all 3 prepared fixtures. Needs remaining fixture-specific visual fixes and actual Roll20 comparison before DONE. |
| DONE | P0 | Hide `script`, `script[type="text/worker"]`, and `rolltemplate` from sheet canvas in every render mode. | `lib/preview/buildDoc.ts` now hard-hides them after user CSS in iframe and shadow/edit render paths; fixture render report confirms source script/rolltemplate nodes remain for runtime/chat extraction. |
| VERIFY | P0 | Preserve worker JS as a separate future block-coding workspace. | Worker workspace split is implemented and now source-audited: import replaces the worker workspace from source `<script type="text/worker">` bodies, including nested/raw worker scripts, strips worker scripts from visual HTML, and emit appends one Roll20 worker script without duplicate visual/runtime leakage. `corepack pnpm run audit:worker -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/worker-source-audit` PASS for AW2E, Les-Oublies, and YSHY 1BU with exact worker source bodies. `corepack pnpm run smoke:worker`, `scripts/browser_roundtrip_smoke.mjs`, and `scripts/imported_edit_sync_smoke.mjs` also PASS for the 3 prepared ignored fixtures. Still needs broader corpus audit and actual Roll20 sandbox/test-room worker runtime parity before DONE. |
| DONE | P0 | Implement real browser L2 roundtrip: import -> emit -> import -> compare. | **3/3 fixtures PASS** (AW2E, Les-Oublies, YSHY 1?� 6531 blocks): `reports/roundtrip-browser/browser-roundtrip-results.md`. Fix chain: worker wrapper newline + indent growth, section/toggle multi-class guard, whitespace-only line growth. This proves browser emit stability for 3 fixtures only ??NOT all-sheet support. Imported edit-step smoke now exists separately in `reports/imported-edit-sync/`; expand fixtures next. |
| VERIFY | P0 | Add visual/cascade leak verification for Roll20 preview. | Standalone report (`reports/cascade-leak/cascade-leak-results.md`) and live Shadow DOM report (`reports/live-shadow-cascade/live-shadow-cascade-results.md`) both show 0 app-like CSS winners across 3 fixtures. `preview_edit_visual_smoke` records resource diagnostics and currently reports 0 resource issues for the local preview/edit screenshot path. `capture_visual_fixture_previews.mjs` now also separates render status from resource status and supports `--fail-on-resource-issues true`; latest YSHY and AW2E strict preview captures PASS with resources PASS. Imported edit/reimport still has external image failures to normalize/cache/classify against actual Roll20. |
| DONE | P0 | Add asset URL reachability regression audit. | `corepack pnpm run audit:assets -- --fixtures test-fixtures\visual --payload-run reports\roll20-actual-compare\2026-06-18-pseudo-fix-v1 --report-dir reports\asset-resource-audit` PASS. AW2E, Les-Oublies, and YSHY 1BU source/payload asset refs had 0 failed HTTP probes and 0 missing local relative refs; payload introduced 0 new asset regressions. Local reachability guard only, not Roll20 visual parity. |
| DOING | P0 | Build screenshot-based sheet visual verification from existing preview images. | Inventory, fixture prep, shared preview render, and browser capture smoke are working. Next: normalize viewport/crop and add pixel diff against references. |
| DONE | P0 | Add first browser-canvas pixel diff harness. | `reports/visual-fixture-diff/visual-fixture-diff-results.md`; first diagnostic diff computed for 2 fixtures. Needs viewport/state/crop normalization before parity gating. |
| DOING | P0 | Normalize visual diff viewport, initial sheet state, and crop region. | `corepack pnpm run diff:visual-fixtures` now first captures live local preview PNGs through `scripts/capture_visual_fixture_previews.mjs`, applies optional state-map action/control hints, regenerates diff pages, collects browser JSON, and writes ignored classification reports. The capture step can also be run directly as `corepack pnpm run capture:visual-fixtures` or strict resource mode as `corepack pnpm run capture:visual-fixtures:strict`. Latest strict spot checks PASS: AW2E applies `control_attr_class_Hardholder` with resources PASS, and YSHY 1BU captures initial preview state with resources PASS. Latest full diff run PASS: AW2E applies `control_attr_class_Hardholder` (`attr_class=Hardholder`) and reports 16.23% best mismatch; Les-Oublies applies `act_fullsheet` (`sheetTabForBtn=fullsheet`, `sheetTab=fullsheet`) and reports 8.84% best mismatch. `node scripts\classify_visual_fixture_diffs.mjs reports\visual-fixture-diff test-fixtures\visual` now detects that those state hints are already applied and classifies both AW2E and Les-Oublies as `reference/capture context mismatch`; next action is crop/context normalization or actual Roll20 screenshot collection before renderer CSS changes. The runner was hardened for large fullsheet data-URL pages by waiting on the result JSON instead of locator visibility. `scripts/roll20_actual_local_baseline.mjs`, `scripts/roll20_payload_roundtrip_visual_smoke.mjs`, and `scripts/roll20_preupload_verification.mjs` also accept/forward optional `--state-map`, so the local baseline and cleaned-payload visual roundtrip compare the same state. Latest state-map run `2026-06-18-state-map-v1` is local pre-upload PASS with 0% payload-roundtrip mismatch. This is state/crop triage and upload-readiness evidence only, not actual Roll20 parity. |
| TODO | P1 | Improve raw fallback coverage for sheets such as custom Magica. | Current custom-magica coverage is 95.7%, rawFallback 76. |
| VERIFY | P1 | Make layer panel useful as a Figma-like hierarchy/reparenting surface. | Layer rows expose explicit drag zones (`before`, `inside`, `after`), adapter supports top-level and nested sibling insertion, and children inside a statement chain can be reordered before/after siblings. Canvas widget dragover now exposes `inside`, `before`, and `after`; layer rows now visibly show role labels, `?�기 가?? for containers, default placement mode (`?�름` / `?�유`), and Korean drop badges (`?�에 ?�음` / `?�에 ?�음` / `?�에 ?�음`). `corepack pnpm run smoke:edit-flow -- --out-dir ./out --base-path /roll20-block-editor --report-dir reports/edit-flow-smoke --port 4318` verifies zone detection, nested input reorder, canvas insertion of new inputs before/after an existing nested input, readable Korean edit UI labels, layer role/drop affordance attributes/text, and synthetic non-leaf group movement with child preservation in emitted HTML. `imported_edit_sync_smoke` now also verifies imported canvas insertion as non-absolute flow content for 3 fixtures, imported layer leaf reorder for Les-Oublies when a safe leaf sibling pair exists, and imported non-leaf subtree reorder with direct child preservation for AW2E, Les-Oublies, and YSHY 1BU. 2026-06-19 strict resource mode was added so visual-parity work cannot hide broken external images/fonts behind an edit-interaction PASS. Still needs richer screenshot evidence for real user drags and actual Roll20 comparison before DONE. |
| VERIFY | P1 | Define absolute positioning inside frames/groups. | Synthetic browser smoke now verifies two paths: dragging an existing frame child creates parent design CSS `position: relative` plus child design CSS `position: absolute; left/top`; and the user-facing free placement mode drops a new gallery text input into a frame as a nested absolute child with emitted/computed left/top matching. Imported real-fixture smoke also PASS for the 3 prepared ignored fixtures: free placement produced nested absolute inputs inside imported frame/flow targets with parent `relative`, child `absolute`, and emitted/computed left/top matching. Evidence: `scripts/edit_flow_browser_smoke.mjs` and `scripts/imported_edit_sync_smoke.mjs` PASS against static `out/`. Still needs richer UX screenshot evidence and actual Roll20 sandbox/test-room comparison before DONE. |
| DONE | P1 | Add shared DOM layer role classification for edit UX. | `lib/editor/layerRoles.ts` gives frame/flow/table/control/action/text/media/runtime roles used by the layer panel, gallery drop detection, and Shadow DOM edit affordance CSS. Real drag/drop browser smoke passed (`reports/edit-flow-smoke/`): dropped section exposes `data-r20-layer-role="frame"` + `data-r20-can-drop="1"` and receives flow children. |
| VERIFY | P1 | Expand Roll20 worker simulator and chat rolltemplate rendering. | Local chat smoke now clears chat per fixture and checks exactly 1 card, 280px rolltemplate width, no app-only `rolltemplate:name` debug label, and Roll20-like chat shell classes (`textchatcontainer`, `message`, `spacer`, `by`, `tstamp`). Latest report: `reports/rolltemplate-chat-smoke/rolltemplate-chat-smoke-results.md`; AW2E, Les-Oublies, and YSHY all PASS with real `user-click`, rolltemplate kind, 280px card width, and shell markers present after `components/editor/ChatPane.tsx` Korean copy cleanup. Added `corepack pnpm run smoke:worker-state`: synthetic Roll20 tab sheet PASS proves action buttons trigger worker `setAttrs`, hidden input DOM property and `value` attribute both update, CSS `[value=...]` sibling selectors switch visible panels, and duplicate `attr_*` checkbox/radio controls mirror checked state so CSS `:checked` anchors update. Latest worker-state smoke has 0 console/page errors; source worker preservation rechecked by `corepack pnpm run audit:worker` PASS for AW2E, Les-Oublies, and YSHY. Actual Roll20 chat/worker parity remains TODO: latest actual status splits Les-Oublies as `chat-dom-only` and AW2E/YSHY as missing `roll20-chat.png`, so no actual Roll20 chat visual parity claim is allowed. Worker simulator split still TODO. |
| VERIFY | P1 | Add explicit modern/legacy Roll20 preview/export mode checks. | Export-level synthetic audit PASS: `corepack pnpm run audit:legacy-export -- --report-dir reports/legacy-export-audit`. Preview/edit render-path smoke PASS: `corepack pnpm run smoke:legacy-preview -- --report-dir reports/legacy-preview-smoke`, and the toolbar exposes `data-testid="preview-legacy-css-toggle"` for the local preview/edit legacy CSS mode. Imported-fixture visual smoke PASS: `corepack pnpm run smoke:legacy-fixture-visual -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/legacy-fixture-visual`; AW2E and YSHY 1BU had no legacy-risk CSS in the emitted preview chunk, while Les-Oublies reduced risk `1 -> 0` with 0 console/page/resource issues. Actual Roll20 legacy sandbox/test-room parity still TODO. |
| DONE | P0 | Add default-state CSS selector regression audit. | `corepack pnpm run audit:state-selectors -- --fixtures test-fixtures\visual --payload-run reports\roll20-actual-compare\2026-06-18-pseudo-fix-v1 --report-dir reports\state-selector-audit` PASS. It verifies source and generated payload controls against hidden/value/checked CSS state selectors, and fails only when payload creates a new missing-anchor regression beyond source. AW2E and Les-Oublies had 0 source/payload anchor issues; YSHY had 7 source-only dead/worker-driven selector anchors and 0 payload regressions. Local semantic guard only, not Roll20 visual parity. |
| DOING | P0 | Run Roll20 actual-screen check with Chrome session. | Clean local payloads are generated by `scripts/roll20_actual_local_baseline.mjs` and gated by `corepack pnpm run verify:roll20-preupload -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --fixtures test-fixtures\visual --out-dir ./out --base-path /roll20-block-editor --state-map reports\visual-state-candidates\visual-state-candidates-state-map.json`, latest PASS. Chrome reached the dedicated Roll20 Custom Sheet Sandbox, but filechooser upload is still blocked and endpoint `200` responses are now treated as storage-only unless fresh iframe DOM/root evidence confirms activation. Latest status reports `PARTIAL_GENERATED_ACTUAL_SCREENSHOTS`, `generatedActualScreenshots=2/6`, `generatedDiffed=2/6`, `roomObservationScreenshots=0/3`, and `roomObservationDiffed=0/3`; AW2E is `SUSPECT`, Les-Oublies and YSHY have generated sandbox evidence, and all Roll20 chat screenshots remain missing. Existing solo rooms are observation-only; generated sheet checks must use Custom Sheet Sandbox first or a new test room. Store screenshots/reports locally only. |
| VERIFY | P0 | Implement actual Roll20 sandbox sanitize/prefix contract locally. | First module/test slice exists in `lib/emit/roll20SandboxSanitize.ts` and `lib/emit/__tests__/roll20SandboxSanitize.test.ts`; package command `corepack pnpm run test:roll20-sandbox-sanitize` covers selector prefixing, Roll20 URL proxy/drop behavior, unsafe CSS rejection, HTML allow-list/class exceptions, runtime source stripping, and HTML URL proxy/drop behavior. The module is now wired into `scripts/roll20_sandbox_sanitize_audit.mjs`, the local `verify:roll20-preupload` gate, the export dialog's explicit Sandbox expected-transform panel, and a preview-only `Sandbox ?�상` render toggle. Latest preview toggle smoke PASS: `corepack pnpm run smoke:roll20-sandbox-preview -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --fixture official-roll20-Les-Oublies --report-dir reports/roll20-sandbox-preview-smoke --port 4331` verifies the imported fixture changes from normal preview `colgroup=6`, `rolltemplate=3`, `sourceWorkerScript=1` to Sandbox expected preview `colgroup=0`, `rolltemplate=0`, `sourceWorkerScript=0` with 0 console/page errors. Latest checks PASS: `corepack pnpm run test:roll20-sandbox-sanitize`, `corepack pnpm run audit:roll20-sandbox-sanitize -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, empty-workspace export smoke on port 4326, imported-fixture export smoke on port 4325, `corepack pnpm run lint`, `corepack pnpm run build`, and `corepack pnpm run smoke:preview-edit-visual -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/preview-edit-visual --port 4332`. Next: compare against actual Roll20 screenshots after upload unblocks. |
| VERIFY | P1 | Separate auto-prefix preview sanitize from real legacy Roll20 CSS sanitize in fixture reports. | `scripts/render_visual_fixture_doc.mjs` now reports `Auto-prefix` and `Legacy CSS sanitize` separately; actual legacy CSS sanitizer preview mode remains TODO. |
| DONE | P0 | Establish `dev` branch and predeploy CI. | `dev` branch pushed to origin; CI passed on `main` and `dev` when checked on 2026-06-12. `main` remains the only GitHub Pages deploy branch. |
| TODO | P1 | Decide separate public preview hosting for `dev`. | GitHub Pages currently provides one repo site; recommended options are Vercel/Netlify, a second Pages repo, or a same-site `/dev/` artifact merge. |
| DONE | P2 | Move old duplicated QA files into `docs/qa/archive/` after checking references. | `rg` showed no code/script references outside QA self-references; archived old v1/v2 QA snapshots and added `docs/qa/README.md`. |
| DONE | P0 | Render prepared visual fixtures through the shared preview document path. | `reports/visual-fixture-render/visual-fixture-render.md`; rendered 3 copied fixtures through `buildSheetDoc`. This is not visual parity yet. |

## Verified So Far

## Latest State Visibility Diagnostic

2026-06-19: `corepack pnpm run diagnose:roll20-state-visibility --
reports\roll20-actual-compare\2026-06-18-state-map-v1` writes ignored evidence
under `state-visibility-diagnostics/` and reports Les-Oublies as
`ACTUAL_CSS_STATE_SELECTORS_DO_NOT_MATCH_PREFIXED_HTML`. The captured actual
Roll20 iframe has hidden `sheetTab=combat` / `sheetTabForBtn=combat`, but still
shows sampled character/skills/combat/equipment/journal panels. The actual CSSOM
state rules use unprefixed anchors such as `.tabstoggle[...]`, while generated
HTML anchors are `sheet-tabstoggle` / `sheet-tabstoggleforbtn`; sampled panels
have 0 matched state rules. This is a P0 root-cause clue for local preview vs
actual Roll20 state divergence, not visual parity. Next action: separate
source-preserving local preview from actual Roll20 expected-render behavior and
revise the sandbox sanitize/prefix model using this evidence, then rerun
full-root candidate and preview/edit regression smokes.

2026-06-19 follow-up: actual-iframe sandbox CSS prefix alignment is implemented.
`sanitizeRoll20SandboxCss()` now has an explicit `prefixSelectors: false` mode,
and `buildSheetDoc()` / ExportDialog diagnostics / sandbox sanitize audit use
that mode for Roll20 actual expected-render evidence. Verification passed:
`test:roll20-sandbox-sanitize` 6/6, `audit:roll20-sandbox-sanitize`,
`smoke:roll20-sandbox-preview`, `smoke:preview-edit-visual`, empty/imported
`smoke:export-dialog`, `lint`, `build`, and evidence guard. The full-root
candidate smoke still leaves Les-Oublies at `8.52%` best direct mismatch with
local root about `841px` taller than actual, so visual parity is still TODO.
Next P0 remains row/table/control geometry and additional actual Roll20
screenshots for AW2E/YSHY plus trustworthy chat evidence.
Follow-up state-diagnostic report wording update: `scripts/roll20_state_visibility_diagnostics.mjs` now records that local Sandbox expected render paths already keep CSS selectors unprefixed (`prefixSelectors: false` in `buildSheetDoc`, ExportDialog diagnostics, and sandbox sanitize audit). The Les-Oublies finding remains `ACTUAL_CSS_STATE_SELECTORS_DO_NOT_MATCH_PREFIXED_HTML`, but the next action is cross-fixture re-verification and local Sandbox expected visibility comparison, not reintroducing blanket CSS selector prefixing.
Follow-up local expected visibility comparison: `scripts/roll20_state_visibility_diagnostics.mjs` now renders the payload HTML/CSS in a local Roll20 wrapper and compares the actual-visible panel selector set. Latest rerun for Les-Oublies reports local Sandbox expected visibility matches actual sampled visibility `9/9`; keep cross-fixture re-verification open, but for this fixture prioritize geometry/assets/control styling over more state-selector changes.
Follow-up sampled panel height delta update: the same diagnostic now lists local-vs-actual height deltas for the sampled visible panels. Latest Les-Oublies lightweight-wrapper sample highlights `.sheet-section-competences` (+496.872px) and `.sheet-skills` (+496.272px) as the largest local-over-actual panel deltas. Treat these as geometry triage clues only; full-root candidate evidence still remains the stronger renderer signal.
Follow-up renderer action gate: `corepack pnpm run gate:roll20-renderer-action -- reports\roll20-actual-compare\2026-06-18-state-map-v1` now consolidates status, full-root candidates, state visibility, and geometry evidence. Latest recommendation is `HOLD_PRODUCTION_RENDERER_PATCH`: AW2E lacks trusted root evidence, all Roll20 chat screenshots are missing, only 2/3 fixtures have full-root candidates, and best diagnostic patches differ across fixtures. Keep diagnostic CSS candidates out of production until these blockers are cleared.





| Status | Scope | Evidence |
| --- | --- | --- |
| DONE | Full corpus static inventory | `reports/corpus-static-audit/corpus-static-audit.md`; 1434 sheets, 18676 files. |
| DONE | Selected Node import determinism | `reports/roundtrip-node/summary.md`; 7 selected fixtures PASS at Node-side import determinism level. |
| DONE | Malformed `<` parser hang fix | `custom-magica` dropped from >300000 ms timeout to 61 ms in `reports/roundtrip-node/summary.md`. |
| DONE | CI/CD deploy for latest commit | GitHub Actions run for `1620b61` completed successfully and GitHub Pages returned 200. |
| DONE | Claude CLI setup | Installed `@anthropic-ai/claude-code`; executable path `C:\Users\acorn\AppData\Roaming\npm\claude.cmd`; verified version `2.1.144`. |
| DONE | Local smoke after render CSS patch | `corepack pnpm run lint`, `corepack pnpm run build`, and `http://127.0.0.1:3000/` browser load with no console errors. |
| DONE | Visual reference inventory | `reports/visual-reference-inventory/visual-reference-inventory.md`; found 1497 source sheet folders, 9114 images, 491 visual candidates. |
| DONE | Visual fixture preparation smoke | `scripts/prepare_visual_fixture.mjs` copied `official-roll20:Les-Oublies` and `official-roll20:AW2E` into ignored `test-fixtures/visual/` with manifests. |
| DONE | Explicit YSHY 1BU fixture smoke | `scripts/prepare_explicit_fixture.mjs` copied `1?� HTML.html`, `1?� CSS.css`, and `踰덉�?txt` into ignored fixture `yshy-commission-1bu`; `buildSheetDoc` render and Browser Use load completed with 0 console errors/warnings. |
| DONE | Roll20 dialog class context restored | `buildSheetDoc` and `buildSheetParts` now put `ui-dialog ui-widget ui-widget-content ui-corner-all` on `#dialog-window`; regenerated YSHY fixture confirms wrapper context while visible dialog chrome remains suppressed. |
| DONE | Visual fixture render smoke | `scripts/render_visual_fixture_doc.mjs` wrote standalone preview HTML for 2 copied fixtures and `reports/visual-fixture-render/visual-fixture-render.md`. |
| DONE | Preview non-canvas node hiding | `script`, `script[type="text/worker"]`, and `rolltemplate` get final-source-order hidden CSS with zero layout/hit-test footprint in both build paths. |
| DONE | Browser capture smoke for visual fixtures | Opened both generated fixture HTML files through Browser Use; captured local PNGs with 0 console errors. Full-page captures show fixture-state/viewport normalization is still needed before pixel diff. |
| DONE | Browser-canvas diagnostic pixel diff | `reports/visual-fixture-diff/visual-fixture-diff-results.md`; 2 fixtures diffed with 0 browser console errors. Multi-mode diff and automated headless result collection are now available through `corepack pnpm run diff:visual-fixtures`. |
| DONE | Visual fixture render terminology refresh | `node scripts/render_visual_fixture_doc.mjs`; report now renders 3 fixtures and no longer labels preview auto-prefix as legacy sanitize. |
| DONE | Documentation structure index | `docs/README.md`, `docs/PROJECT_STRUCTURE.md`, `reports/README.md`, and `scripts/README.md` document where future work should live. |
| DONE | Edit-flow smoke hook compile check | Added `window.__perfHook.appendFriendlyWidgetForEditSmoke()` for flow-vs-absolute widget insertion diagnostics; `corepack pnpm run lint` and `corepack pnpm run build` passed on 2026-06-12. |
| DONE | Edit-flow browser smoke (real DragEvents) | `scripts/edit_flow_browser_smoke.mjs` PASS in headless Chromium against static `out/`: hook flow/absolute paths + real dragover/drop nesting into a frame container, canvas drop indicator state (`hostDropMode=inside`, active target mode `inside`), canvas sibling insertion indicators (`before` and `after`), canvas insertion of new inputs before and after an existing nested input in emitted HTML, existing-object drag, layer row drop-zone detection (`before,inside,after`), nested input reorder, synthetic non-leaf group reorder with child inputs preserved in emitted HTML, synthetic absolute-inside-frame drag where parent relative CSS and child absolute CSS match computed coordinates, and user-facing free placement mode gallery drop into a frame as a nested absolute child. Report: `reports/edit-flow-smoke/edit-flow-smoke-results.md`. `lint`/`build` re-passed on 2026-06-18. |
| DONE | Imported real-fixture edit sync smoke | `scripts/imported_edit_sync_smoke.mjs` PASS for the 3 prepared ignored fixtures against static `out/`: each selected imported input moved through the real edit pointer path, preview landed on the same block position, emitted HTML/CSS carried matching absolute position data, a friendly widget inserted into an imported sheet target as non-absolute flow content, a second widget inserted through free placement as nested absolute content, and the edited emit survived a re-import/emit cycle. One fixture additionally verified imported layer leaf reorder; all 3 fixtures now verify imported non-leaf subtree reorder through the layer panel with direct child preservation. Local evidence only; actual Roll20 parity remains unverified. |
| DONE | First browser L2 roundtrip harness | `scripts/browser_roundtrip_smoke.mjs` + `reports/roundtrip-browser/`. Now **3/3 PASS** after the mapping-fidelity and worker source-preservation fix batches. Block counts remain diagnostics because source worker scripts can be canonicalized into one emitted Roll20 worker script. |
| DONE | Worker source preservation audit | `scripts/worker_source_audit.mjs` PASS for AW2E, Les-Oublies, and YSHY 1BU: source worker script bodies were preserved exactly in the emitted worker workspace output, including the prior nested worker-script case. Report: ignored `reports/worker-source-audit/worker-source-audit-results.md`. |
| VERIFY | Local rolltemplate chat smoke | `scripts/rolltemplate_chat_smoke.mjs` reports AW2E, Les-Oublies, and YSHY PASS in the static app with real user-clicks. Each tested fixture clears prior chat first and verifies 1 card, 280px width, `Debug label=no`. Les-Oublies was restored by preserving `class="sheet-tabstoggle..."` on hidden inputs, which lets its Roll20 CSS default tab selectors match. Actual Roll20 chat/sandbox parity is still unverified. |
| DONE | YSHY mapping-fidelity verification + 10-defect fix batch | `reports/mapping-fidelity/mapping-fidelity-yshy.md`. All Roll20-meaningful token categories now EXACT between source and emit for YSHY 1?� (attr 1069, inputs 1049, roll buttons 808 name+value, data-i18n 1083, placeholders 140, disabled 6, i18n keys 399). Fixed: DOMParser self-closing tag swallowing, r20_skill_row missing field definitions,  XML-illegal separator, placeholder->value pollution, i18n key mangling, placeholder/data-i18n/disabled loss on input/textarea/heading/caption, CSS attribute-selector space loss, section/toggle multi-class guard, whitespace-line indent growth, hook bumpStructure. `lint`/`build`/smoke/roundtrip all re-passed 2026-06-12. |

## Forbidden Claims

- Do not say "100% import/export" yet.
- Do not say "Roll20 visual parity" yet.
- Do not say "all sheets are supported" yet.
- Do not say worker JS block coding is complete yet.

## External Source Safety

Never write into:

- `D:\??�깷??留덈???roll20-character-sheets-master`
- `D:\??�깷??留덈????곗븣\[以묒???�ㅼ?????�듃`
- `D:\??�깷??留덈????곗븣\0 CoC\?곸떆??H???�ㅻ?????�듃`

If fixtures are needed, copy selected files into workspace-owned ignored folders only.

## 2026-06-19 Roll20 Browser Recheck TODO Note

- Dedicated Roll20 editor/settings tabs were reclaimed for Custom Sheet Sandbox verification only; no existing room was modified.
- The sandbox settings page still held the YSHY `customcharsheet_json` manifest, so AW2E is not currently proven as the loaded generated sheet.
- AW2E upload through the visible `Sheet Sandbox Tools` HTML file chooser still failed with Chrome `Not allowed`; the file-input/full-activation blocker remains.
- An initial `roll20-chat.png` capture used uncorrected CSS clip coordinates and captured the sandbox tools dialog. That bad local PNG was removed.
- A DPR-corrected chat capture showed the Roll20 chat panel, but only default chat tips/invite text, not a rolltemplate card.
- Les-Oublies `roll20-chat-dom-evidence.json` was refreshed from the current DOM and now records 5 messages and 0 rolltemplates.
- Latest actual status remains `PARTIAL_GENERATED_ACTUAL_SCREENSHOTS`, `generatedActualScreenshots=2/6`, `generatedDiffed=2/6`; Roll20 chat visual evidence is still missing.

## 2026-06-19 Chat Evidence Gate TODO Note

- Hardened `scripts/roll20_actual_status.mjs`, `scripts/roll20_actual_screenshot_diff.mjs`, and `scripts/roll20_upload_handoff.mjs` so `roll20-chat.png` is not trusted by itself.
- Chat evidence now requires a `roll20-chat-dom-evidence.json` sidecar with rendered rolltemplate markers.
- The chat PNG and DOM sidecar must be fresh relative to each other; stale pairs are reported as suspect instead of proof.
- Temporary regression check copied a local PNG into the Les-Oublies chat target while the current sidecar had 0 rolltemplates. Status stayed `generatedActualScreenshots=2/6`, and screenshot diff reported Les-Oublies chat `SUSPECT`. The temporary PNG was removed.
- Current actual status remains `PARTIAL_GENERATED_ACTUAL_SCREENSHOTS`; no Roll20 chat visual parity claim is allowed.

## 2026-06-19 Export Dialog Evidence-Boundary TODO Note

- DONE: Export dialog now separates local zip readiness from browser upload permission and actual Roll20 screenshot verification.
- DONE: Export dialog smoke now requires 6 readiness items, file-access blocker copy, and explicit zip-is-not-proof copy.
- VERIFIED: `smoke:export-dialog` passed for empty workspace on port 4432 and imported Les-Oublies fixture on port 4433 after `corepack pnpm run build`.
- STILL TODO: actual Roll20 file chooser upload remains blocked until Chrome/Codex file URL access is enabled or another verified activation path is found.
- STILL TODO: AW2E trusted root evidence and all trustworthy Roll20 chat screenshots remain missing; no Roll20 visual parity claim is allowed.

## 2026-06-19 Sandbox Upload Snippet TODO Note

- DONE: Added `corepack pnpm run snippet:roll20-upload` to generate ignored Custom Sheet Sandbox upload snippets from local-baseline payloads.
- VERIFIED: `node --check scripts\roll20_upload_snippet.mjs`, `node --check scripts\roll20_upload_handoff.mjs`, and snippet generation for `official-roll20-AW2E` passed. The generated snippet also passed `node --check` syntax validation.
- STILL TODO: run the snippet or normal file chooser inside the actual dedicated Roll20 Custom Sheet Sandbox, then capture trusted AW2E root evidence and Roll20 chat screenshots. Snippet generation alone is not visual parity.
## 2026-06-19 Chrome Read-Only Check TODO Note

- VERIFIED: Existing Roll20 editor/settings tabs are still open and the editor snapshot still contains `Sheet Sandbox Tools`.
- BLOCKED/TODO: The current browser automation path exposed only read-only evaluation, and the file input ids were not visible in the snapshot, so the generated upload snippet was not executed in this batch.
- NEXT: open/expand Sheet Sandbox Tools in the dedicated editor tab, run the generated snippet or normal file chooser upload, then capture trusted root/chat evidence.

## 2026-06-19 AW2E Actual Roll20 Render Evidence TODO Note

- VERIFIED: The dedicated Roll20 Custom Sheet Sandbox editor was reclaimed without touching existing rooms. The visible character sheet tab now shows generated AW2E controls such as `Angel`, `Battlebabe`, `Brainer`, `Child-Thing`, `Chopper`, `Driver`, `Faceless`, `GunLugger`, and `Hardholder`.
- VERIFIED: Ignored local evidence was saved under `reports/roll20-actual-compare/2026-06-18-state-map-v1/local-baseline/official-roll20-AW2E/screenshots/` as `roll20-sandbox.png` plus positive `roll20-sandbox-dom-evidence.json`.
- VERIFIED: `node scripts\roll20_actual_screenshot_diff.mjs reports\roll20-actual-compare\2026-06-18-state-map-v1` now diffs AW2E sandbox at `14.01%`. A follow-up `corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1` reports `generatedActualScreenshots=3/6` and `generatedDiffed=3/6`.
- STILL TODO: all Roll20 chat/rolltemplate screenshots are missing, AW2E still lacks full-root candidate evidence, and `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH`. Do not claim Roll20 visual parity.

## 2026-06-19 AW2E Actual Roll20 Chat Evidence TODO Note

- VERIFIED: The dedicated Roll20 Custom Sheet Sandbox editor tab was used only for the verification character; existing rooms/private logs were not modified.
- VERIFIED: Clicking a visible AW2E sheet roll button in actual Roll20 opened the macro option flow and, after submit, produced a Roll20 chat message with `.sheet-rolltemplate-aw` markers.
- VERIFIED: Ignored local evidence now includes `roll20-chat.png` plus fresh `roll20-chat-dom-evidence.json` under `reports/roll20-actual-compare/2026-06-18-state-map-v1/local-baseline/official-roll20-AW2E/screenshots/`.
- VERIFIED: `corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1` reports `generatedActualScreenshots=4/6` and `generatedDiffed=4/6` after screenshot diff.
- VERIFIED: `corepack pnpm run handoff:roll20-upload -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --missing-only` now lists only Les-Oublies and YSHY as remaining visible entries.
- STILL TODO: Les-Oublies and YSHY still need trustworthy Roll20 chat screenshots; only 2/3 fixtures have full-root candidates; `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH`.
- CLAIM BOUNDARY: This proves AW2E actual Roll20 rolltemplate/chat evidence, not full Roll20 visual parity.

## 2026-06-19 Sandbox Settings Manifest Wrapper TODO Note

- DONE: `scripts/roll20_upload_snippet.mjs` now wraps the plain export `sheet.json` into Roll20 settings fallback shape `{ sheet, userOptions, jsoninfo }` before filling `customcharsheet_json`.
- VERIFIED: `node --check scripts\roll20_upload_snippet.mjs`, `corepack pnpm run snippet:roll20-upload -- reports\roll20-actual-compare\2026-06-18-state-map-v1 official-roll20-AW2E`, generated snippet `node --check`, `status:roll20-actual`, `gate:roll20-renderer-action`, and `guard:roll20-evidence` were rerun.
- CURRENT: `status:roll20-actual` remains `GENERATED_ACTUAL_SCREENSHOTS_DIFFED` with `generatedActualScreenshots=6/6` and `generatedDiffed=6/6`.
- STILL TODO: `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH` because only 2/3 fixtures have full-root candidates and diagnostic patch families differ. Do not claim Roll20 visual parity.
## 2026-06-19 Renderer Gate Next-Action Precision TODO Note

- DONE: `scripts/roll20_renderer_action_gate.mjs` now reports the current blocker precisely as missing full-root candidate comparison for `official-roll20-AW2E` instead of implying that generated/chat evidence is still missing.
- VERIFIED: `corepack pnpm run gate:roll20-renderer-action -- reports\roll20-actual-compare\2026-06-18-state-map-v1` now lists next actions only for AW2E DPR-corrected full-root evidence, cross-fixture patch-family comparison, and keeping diagnostic CSS out of production.
- CURRENT: generated sandbox/chat evidence remains 6/6 diffed, but production renderer CSS still stays HOLD because full-root candidate evidence is only 2/3 and Les/YSHY prefer different diagnostic patch families.
## 2026-06-19 Roll20 Screenshot MIME Hardening TODO Note

- DONE: Roll20 actual screenshot/diff/stitch scripts now detect PNG vs JPEG from file bytes instead of trusting the filename extension. This matters because the Chrome screenshot surface can return JPEG bytes even when agents save a `.png` filename.
- VERIFIED: `node --check` passed for the changed scripts, and reruns of `roll20_actual_screenshot_diff`, `smoke:roll20-same-context-visible`, `smoke:roll20-full-root-candidates`, `status:roll20-actual`, `gate:roll20-renderer-action`, and `guard:roll20-evidence` all completed successfully on `2026-06-18-state-map-v1`.
- CURRENT: AW2E visible Roll20 sheet capture was possible in the dedicated sandbox editor, but browser control became unstable before a trustworthy DPR-corrected full-root stitch could be completed. The renderer gate remains HOLD with the same real blocker: AW2E lacks full-root candidate comparison.

## 2026-06-19 AW2E Overlap Transition Audit TODO Note

- DONE: `scripts/roll20_overlap_stitch_diagnostic.mjs` now writes transition quality metadata without embedding the giant image data URL in the JSON sidecar.
- DONE: `scripts/roll20_root_stitch_audit.mjs` now surfaces overlap transition warnings in the root-stitch audit table as `low advance` and `high score` counts.
- VERIFIED: The latest long AW2E diagnostic stitch is `720x12062` from 38 ignored local segments. Transition summary: median advance `321px`, `lowAdvanceTransitions=1`, `highScoreTransitions=0`.
- CURRENT: `audit:roll20-root-stitch` still classifies AW2E as `SKIP` because only overlap diagnostic evidence exists; Les-Oublies and YSHY remain PASS on trusted DPR-corrected full-root evidence.
- STILL TODO: AW2E needs trusted DPR-corrected full-root capture or a validated manifest-backed stitch path before renderer CSS can be promoted. The remaining diagnostic root-height delta is not enough to justify production CSS.

## 2026-06-19 AW2E Duplicate Segment Capture Audit TODO Note

- DONE: `scripts/roll20_overlap_stitch_diagnostic.mjs` now hashes input segments and records duplicate segment groups in the diagnostic JSON.
- DONE: `scripts/roll20_root_stitch_audit.mjs` and `scripts/roll20_renderer_action_gate.mjs` now surface duplicate segment counts in AW2E diagnostic-only evidence.
- VERIFIED: Regenerating `aw2e-long-overlap-stitch-diagnostic.png` from 38 ignored local segments reports `duplicateSegments=2`, `duplicateGroups=1`; segments 36 and 37 are byte-identical.
- CURRENT: `gate:roll20-renderer-action` still returns `HOLD_PRODUCTION_RENDERER_PATCH` and now names AW2E's best diagnostic as 38 segments, max score `6.605`, duplicate segments `2`.
- STILL TODO: recapture AW2E with real DPR-corrected sheet-root segment metadata or a manifest-backed scroll source. Do not promote the current overlap stitch to trusted full-root evidence.

## 2026-06-19 Trusted Stitch Duplicate Guard TODO Note

- DONE: `scripts/roll20_actual_stitch_root.mjs` now records SHA-256 duplicate segment summaries in stitched full-root metadata.
- DONE: `scripts/roll20_root_stitch_audit.mjs` now fails trusted stitched metadata or DPR capture manifests when segment image entries are byte-identical.
- VERIFIED: Existing trusted DPR evidence for Les-Oublies and YSHY still passes `audit:roll20-root-stitch`; AW2E remains `SKIP` because it has only diagnostic overlap evidence.
- CURRENT: `gate:roll20-renderer-action` still holds production CSS and preserves the AW2E duplicate-segment blocker detail.
- STILL TODO: recapture AW2E with non-duplicate DPR-corrected sheet-root segments plus manifest-backed coverage before running it as trusted full-root evidence.

## 2026-06-19 Actual Status Truthfulness TODO Note

- DONE: `status:roll20-actual` now prints trusted full-root evidence and renderer readiness separately from generated screenshot/diff counts.
- VERIFIED: latest `2026-06-18-state-map-v1` status prints generated `6/6`, trusted full-root `2/3`, renderer action `HOLD_PRODUCTION_RENDERER_PATCH`, rendererReady `NO`.
- CURRENT: this prevents `generatedActualScreenshots=6/6` from being mistaken for Roll20 visual parity or production renderer approval.
- STILL TODO: recapture AW2E as trusted DPR-corrected full-root evidence, rerun root-stitch audit, screenshot diff, full-root candidate smoke, and renderer action gate.

## 2026-06-19 Renderer Ready Gate TODO Note

- DONE: Added `--require-renderer-ready` to `status:roll20-actual` and exposed it as `corepack pnpm run gate:roll20-renderer-ready -- <run-dir>`.
- VERIFIED: current `2026-06-18-state-map-v1` correctly fails this gate because generated screenshots/diffs are `6/6`, but trusted full-root is still `2/3`, renderer action is `HOLD_PRODUCTION_RENDERER_PATCH`, and rendererReady is `NO`.
- CURRENT: this is the required precondition gate before production renderer CSS changes or visual-parity claims.
- STILL TODO: recapture AW2E trusted DPR-corrected full-root evidence and rerun the renderer-ready gate until it passes for `3/3` trusted full-root fixtures.

## 2026-06-19 AW2E Root Capture Plan TODO Note

- DONE: Added `corepack pnpm run plan:roll20-root-capture -- <run-dir> [fixture-id]` to generate a local-only handoff plan for missing trusted DPR-corrected full-root evidence.
- VERIFIED: current AW2E plan reports generated screenshots/diffs `6/6`, trusted full-root `2/3`, renderer action `HOLD_PRODUCTION_RENDERER_PATCH`, rendererReady `NO`, and AW2E missing `roll20-root-dpr-complete-manifest.json`, `roll20-sandbox-root-full-dpr-corrected.png`, and sidecar JSON.
- CURRENT: the plan uses Les-Oublies/YSHY trusted manifests as examples and lists AW2E diagnostic-only captures plus post-capture stitch/audit/diff/renderer-ready commands.
- STILL TODO: run the actual Roll20 DPR-corrected sheet-root capture for AW2E and rerun the generated plan/gates until trusted full-root reaches `3/3`.

## 2026-06-19 Root Capture Plan Linkage TODO Note

- DONE: `status:roll20-actual`, `gate:roll20-renderer-action`, and `handoff:roll20-upload` now point directly to `corepack pnpm run plan:roll20-root-capture -- <run-dir> [fixture-id]` when trusted full-root evidence is missing.
- VERIFIED: current `2026-06-18-state-map-v1` reports the AW2E plan command in status next action, renderer gate next actions, and upload handoff markdown.
- CURRENT: this reduces handoff ambiguity; `generatedActualScreenshots=6/6` still does not mean rendererReady because trusted full-root remains `2/3`.
- STILL TODO: perform the actual AW2E DPR-corrected full-root capture and rerun the linked gates until rendererReady can pass.

## 2026-06-20 Edit Layer Structure Visualization TODO Note

- DONE: `BlockSnapshot` now includes `childCount`, so the edit layer panel can expose whether a frame/flow/table node actually contains children instead of only showing a flat label.
- DONE: Layer rows now expose `data-r20-layer-child-count`, a role/relationship rail, and a compact child-count badge for non-leaf nodes.
- VERIFIED: `corepack pnpm run smoke:edit-flow -- --port 4210` passes after rebuilding `out/`; nested frame evidence includes `childCount=1`, `roleRail=true`, `childBadge=1`, and before/inside/after layer drop modes.
- CLAIM BOUNDARY: This improves edit-layer structure visibility only. It does not change Roll20 preview parity, renderer CSS, or actual Roll20 screenshot evidence.

## 2026-06-21 Local Preview Claim Boundary TODO Note

- DONE: Empty preview copy no longer says the center canvas is where an "actual Roll20 sheet" renders. It now describes the view as a local Roll20-format preview.
- DONE: Preview mode tooltip now uses the same local-preview wording instead of implying actual Roll20 verification.
- VERIFIED: `corepack pnpm run smoke:export-dialog -- --out-dir ./out --base-path /roll20-block-editor --report-dir reports/export-dialog-smoke --port 4326` passes after rebuild with `hasLocalPreviewBoundaryCopy=true`, `hasActualRoll20PreviewClaim=false`, `hasMojibake=false`, and console/page errors 0.
- CLAIM BOUNDARY: This is product truthfulness/UI cleanup only. It does not change renderer CSS and does not prove Roll20 visual parity.

## 2026-06-21 Chat Foreground Suspect Handoff Precision TODO Note

- DONE: `status:roll20-actual` now preserves fixture-level chat parity suspect details instead of only reporting aggregate `chatActualTemplatePixelSuspect=1`.
- DONE: `gate:roll20-renderer-action` now names the affected fixture in the foreground-pixel blocker and next action.
- VERIFIED: Current run reports `official-roll20-Les-Oublies` as the only foreground-pixel suspect: dark `0%`, edge `0%`, non-white `5.15%`, PNG `1x1`. The next action now points directly to `corepack pnpm run plan:roll20-chat-capture -- reports\roll20-actual-compare\2026-06-18-state-map-v1`.
- CLAIM BOUNDARY: This improves evidence handoff and prevents CSS tuning from contaminated chat pixels. It does not recapture Roll20 and does not prove chat visual parity.

## 2026-06-21 Current Status and ETA TODO Note

- DONE: Added `docs/qa/38_current_project_status.md` as the compact handoff snapshot for current evidence, claim boundaries, and realistic ETA.
- VERIFIED: Current status snapshot is based on rerunning `status:roll20-actual`, `gate:roll20-renderer-action`, and `smoke:preview-edit-visual` against the active `2026-06-18-state-map-v1` run.
- CURRENT: local preview/edit is good enough for continued edit UX work on the active fixtures, but actual Roll20 chat/rolltemplate capture remains blocked/incomplete (`generatedActualScreenshots=4/6`, `chatNeedsNormalizedCapture=2`, `rendererReady=NO`).
- STILL TODO: finish trustworthy AW2E/YSHY Roll20 chat captures or a verified foreground chat capture adapter before any production renderer promotion.
- ETA: evidence-safe MVP checkpoint is estimated at 2-4 focused working days; a private-alpha level for the current prepared fixture set is estimated at 5-9 working days; broader mixed-sheet beta is estimated at 2-4 weeks.

## 2026-06-21 Edit Layer Drop Truthfulness TODO Note

- DONE: Edit layer rows now compute `canReceiveChildren` from both the visual layer role and the Blockly adapter's actual `canNestInContainer()` result. The layer panel no longer marks a node as droppable just because its type name looks like a frame.
- DONE: The edit layer panel now shows a compact visible count and legend for droppable containers, child nodes, and single elements.
- VERIFIED: `corepack pnpm run smoke:edit-flow -- --port 4341` passes after the change. Evidence still covers flow drop, absolute drop, before/inside/after layer modes, non-leaf reorder, free placement inside a frame, no mojibake in sampled edit UI copy, and zero console/page errors.
- CURRENT PROGRESS ESTIMATE: compared with the starting goal state, local edit/drop UX is roughly `55-65%`, local preview/edit visual sync is roughly `70%`, actual Roll20 root reproduction is roughly `55-65%`, actual Roll20 chat/rolltemplate reproduction is roughly `25-35%`, and the whole product goal remains roughly `35-45%`.
- CLAIM BOUNDARY: This improves edit-mode trust and usability only. It does not create new actual Roll20 evidence and does not make the production renderer ready.

## 2026-07-12 Chat Capture Plan-Only Handoff TODO Note

- DONE: `capture:roll20-chat-cdp --plan-only` now prints the required `roll20-sandbox-dom-evidence.json` path, the exact `probe:roll20-sheet-frame` command, and the gated capture command for the fixture.
- DONE: `handoff:roll20-chat-current` now preserves the exact per-fixture sheet-frame probe and chat capture commands from the capture plan instead of falling back to generic handoff text.
- VERIFIED: `node --check scripts\roll20_chat_cdp_capture.mjs`, `node --check scripts\roll20_chat_current_handoff.mjs`, `corepack pnpm run test:roll20-chat-cdp-readiness`, `corepack pnpm run test:roll20-chat-capture-plan`, plan-only runs for `official-roll20-AW2E` and `yshy-commission-1bu`, and `corepack pnpm run handoff:roll20-chat-current -- reports\roll20-actual-compare\2026-06-18-state-map-v1` passed.
- CURRENT: `preflight:roll20-cdp` still reports `CDP_CLOSED`; no new Roll20 chat PNG or sidecar evidence was captured. Current actual status remains `generatedActualScreenshots=4/6`, `chatNeedsNormalizedCapture=2`, and `rendererReady=NO`.
- STILL TODO: open a CDP-enabled Roll20 Sandbox/test-room tab, run the printed sheet-frame probe until it writes `VISIBLE_MATCH`, then run the printed capture command for AW2E and YSHY.
- CLAIM BOUNDARY: This is capture-handoff tooling only. It does not prove Roll20 chat parity and does not justify production renderer CSS.

## 2026-07-12 CDP Preflight Probe Ordering TODO Note

- DONE: `preflight:roll20-cdp` now prints the exact `probe:roll20-sheet-frame` commands before the `capture:roll20-chat-cdp` commands for all planned fixtures and for a single `--fixture` filter.
- VERIFIED: `node --check scripts\roll20_cdp_preflight.mjs`, `corepack pnpm run preflight:roll20-cdp -- --run-dir reports\roll20-actual-compare\2026-06-18-state-map-v1`, and the same preflight with `--fixture yshy-commission-1bu` passed.
- CURRENT: CDP remains closed in the current environment, so this does not capture or validate new Roll20 screenshots. It only makes the next live capture sequence harder to run out of order.
- STILL TODO: launch or attach a CDP-enabled Roll20 Sandbox/test-room tab, rerun preflight until it is not `CDP_CLOSED`, then follow probe -> capture for AW2E/YSHY.
- CLAIM BOUNDARY: This is recapture orchestration only. Renderer remains `HOLD_PRODUCTION_RENDERER_PATCH`.

## 2026-07-12 Edit Canvas Width and Zoom Control TODO Note

- DONE: Edit mode now exposes a direct canvas width input plus `맞춤`/`100%` zoom controls in the edit toolbar, so users can treat the sheet as a fixed Roll20-sized canvas instead of guessing from hidden state.
- DONE: Sheet editing and rolltemplate editing now use separate canvas widths. Sheet mode defaults to `850px` and can auto-expand for wider imported sheet roots; rolltemplate mode preserves the `280px` chat/template canvas by default and no longer auto-expands from ordinary sheet geometry.
- DONE: The edit toolbar status text now explains the active placement model: flow drops reorder/push surrounding elements, while free drops write frame-relative `left/top`.
- VERIFIED: `smoke:edit-flow` now clears persisted `r20-ui` state for deterministic runs and checks width behavior directly: sheet `850 -> 930`, rolltemplate `280`, and sheet width restored to `930` after returning from rolltemplate mode.
- VERIFIED: `node --check scripts\edit_flow_browser_smoke.mjs`, `corepack pnpm run lint`, `corepack pnpm run build`, `corepack pnpm run guard:ui-copy`, and `corepack pnpm run smoke:edit-flow -- --port 4352` passed.
- CLAIM BOUNDARY: This improves edit-mode usability and prevents sheet/rolltemplate width leakage. It does not add actual Roll20 screenshot evidence and does not change renderer readiness.

## 2026-07-12 CDP Launch Recheck TODO Note

- DONE: `preflight:roll20-cdp --launch` now waits briefly after launching Chrome/Edge and records both the initial endpoint status and the post-launch recheck status in the ignored JSON/Markdown report.
- DONE: The preflight console output now always prints a `next=` line so the next agent/user can see whether to log in, open a Sandbox/test room, probe the sheet frame, or capture chat.
- VERIFIED: Running `corepack pnpm run preflight:roll20-cdp -- --run-dir reports\roll20-actual-compare\2026-06-18-state-map-v1 --launch --wait-after-launch-ms 5000` started a CDP Chrome on port `9222`; the recheck classified the visible Roll20 target as `LOGIN_REQUIRED`, not capture-ready.
- VERIFIED: `probe:roll20-sheet-frame --dry-run` and `capture:roll20-chat-cdp --dry-run` both stopped at `LOGIN_REQUIRED` and did not write new screenshot evidence.
- VERIFIED: `node --check scripts\roll20_cdp_preflight.mjs`, two non-launch preflight paths, `corepack pnpm run lint`, `corepack pnpm run build`, `corepack pnpm run guard:ui-copy`, `corepack pnpm run guard:roll20-evidence -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, and `corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1` passed.
- CURRENT: A CDP Chrome temp profile is open on `https://app.roll20.net/login`. It needs Roll20 login plus the dedicated Sandbox/test-room page before actual sheet-frame probe or chat capture can proceed.
- CLAIM BOUNDARY: This is browser-readiness orchestration only. No new Roll20 visual parity evidence was captured, and `rendererReady` remains `NO`.

## 2026-07-12 CDP Roll20 Target Filtering TODO Note

- DONE: `preflight:roll20-cdp` now counts only real top-level Roll20 page targets (`app.roll20.net` / `roll20.net`) instead of any CDP target whose URL merely contains `app.roll20.net` in a referrer or encoded iframe parameter.
- ROOT CAUSE: The old substring match misclassified third-party Stripe iframe targets as Roll20 targets because their URLs contained encoded Roll20 referrers.
- VERIFIED: With the current CDP browser on `https://roll20.net/welcome`, preflight reports `targets=7`, `roll20Targets=1`, and `ROLL20_PAGE_NOT_READY`; the ignored report's `roll20Targets` list contains only the real Roll20 welcome page while Stripe/Twitter iframes remain only in the raw target list.
- VERIFIED: `node --check scripts\roll20_cdp_preflight.mjs`, `node --check scripts\lib\roll20Readiness.mjs`, `corepack pnpm run test:roll20-chat-cdp-readiness`, and both full/single-fixture `preflight:roll20-cdp` paths passed before the final lint/build batch.
- CURRENT: This prevents false readiness or misleading target counts, but it does not capture new Roll20 screenshots. The next real verification step is still to navigate the CDP browser to the dedicated Sandbox/test room, run sheet-frame probe, then capture AW2E/YSHY chat evidence.
- CLAIM BOUNDARY: Verification orchestration only. Actual Roll20 visual parity and chat parity remain unproven.

## 2026-07-12 Shared CDP Roll20 Page Filter TODO Note

- DONE: Moved real Roll20 page detection into `scripts/lib/roll20Readiness.mjs` and reused it from `preflight:roll20-cdp`, `probe:roll20-sheet-frame`, and `capture:roll20-chat-cdp`.
- DONE: The shared filter rejects iframe/service targets whose URLs only contain Roll20 in an encoded referrer, while accepting real top-level Roll20 pages such as `https://roll20.net/welcome` for readiness classification.
- VERIFIED: `test:roll20-chat-cdp-readiness` and `test:roll20-sheet-frame-probe` pass with the new shared filter.
- VERIFIED: Against the current CDP browser, preflight reports `roll20Targets=1`; `probe:roll20-sheet-frame --dry-run` and `capture:roll20-chat-cdp --dry-run` both select `https://roll20.net/welcome` and stop as `DRY_RUN_NOT_READY` / `UNKNOWN_ROLL20_PAGE` without writing new evidence.
- CURRENT: Capture is still waiting on the dedicated Sandbox/test-room page. The current CDP page is a Roll20 welcome page, not a loaded custom sheet.
- CLAIM BOUNDARY: This closes another false-positive capture path. It does not add Roll20 screenshot evidence or change `rendererReady=NO`.

## 2026-07-12 CDP Ready But Sheet Frame Missing TODO Note

- OBSERVED: Navigating the CDP browser from `https://roll20.net/welcome` to `https://app.roll20.net/editor` makes preflight report `READY`, but the page currently has only one frame and no character-sheet iframe.
- OBSERVED: Full sheet-frame probes for AW2E and YSHY both return `NOT_PROVEN` with `sheetHitCount=0`, `rootCount=0`, `attrCount=0`, and `rollButtonCount=0`.
- DONE: `probe:roll20-sheet-frame --dry-run` now runs a lightweight non-writing frame probe when the URL is capture-ready, so it prints `probeStatus=NOT_PROVEN` and the best-frame counts before any evidence is saved.
- DONE: `capture:roll20-chat-cdp --dry-run` now prints an explicit next action when the editor URL is open but no character-sheet iframe is present.
- VERIFIED: Current AW2E dry-runs show `probeStatus=NOT_PROVEN` and `next=Open the intended character sheet iframe/tab or apply the generated fixture before saving DOM evidence.`
- CURRENT: The next real action is still to open/load the intended generated custom sheet in the dedicated Sandbox/test room; URL readiness alone is not enough.
- CLAIM BOUNDARY: This improves blocker visibility only. No Roll20 screenshot or chat evidence was captured.

## 2026-07-13 Chat Renderer Target Plan Run-Dir Safety TODO Note

- DONE: `plan:roll20-chat-renderer-targets` now builds every generated next-command from the run directory passed to the script instead of hardcoding the old `reports\roll20-actual-compare\2026-06-18-state-map-v1` path.
- ROOT CAUSE: The targeted renderer plan correctly identified split chat renderer axes, but its Markdown handoff commands could send the next agent back to stale evidence when a newer actual Roll20 run directory is used.
- VERIFIED: `node --check scripts\roll20_chat_targeted_renderer_plan.mjs`, `corepack pnpm run test:roll20-chat-renderer-targets`, `corepack pnpm run plan:roll20-chat-renderer-targets -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `git diff --check`, `corepack pnpm run lint`, `corepack pnpm run build`, and `corepack pnpm run guard:ui-copy` passed.
- CURRENT: Actual Roll20 chat structure is matched, but renderer action remains `HOLD_PRODUCTION_RENDERER_PATCH`; AW2E and YSHY still need template-scoped width/text/intrinsic modeling plus asset relink before any CSS promotion.
- CLAIM BOUNDARY: This is handoff/gate safety only. It does not prove Roll20 chat visual parity and does not change product renderer CSS.

## 2026-07-13 Chat Template Scope Gate TODO Note

- DONE: Added `corepack pnpm run gate:roll20-chat-template-scope -- <run-dir>` to turn the targeted renderer plan and width-reconciliation evidence into an explicit template-scope gate.
- DONE: Wired the new gate into `gate:roll20-renderer-action` and `diagnose:roll20-chat-refresh`, so the top-level renderer gate now surfaces the template-scope blocker after refresh.
- CURRENT RESULT: The active run reports `HOLD_GLOBAL_CHAT_RENDERER_PATCH` with 4 blockers: high-mismatch fixtures need split models (`MESSAGE_CONTENT_TEXT_METRICS` vs `TABLE_INTRINSIC_SANITIZE_FONT`), split scopes (`.sheet-rolltemplate-aw` vs `.sheet-rolltemplate-coc`), and current best candidates are not promotion-ready.
- CURRENT NEXT: AW2E needs a `.sheet-rolltemplate-aw` scoped message/content width plus exact text-metric candidate; YSHY needs a `.sheet-rolltemplate-coc` scoped table intrinsic/sanitize/font-context candidate. Do not widen global ChatPane CSS.
- VERIFIED: `node --check scripts\roll20_chat_template_scope_gate.mjs`, `node --check scripts\roll20_renderer_action_gate.mjs`, `node --check scripts\roll20_chat_diagnostic_refresh.mjs`, `corepack pnpm run test:roll20-chat-template-scope`, `corepack pnpm run gate:roll20-chat-template-scope -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `corepack pnpm run gate:roll20-renderer-action -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `corepack pnpm run diagnose:roll20-chat-refresh -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `git diff --check`, `corepack pnpm run lint`, and `corepack pnpm run build` passed.
- CLAIM BOUNDARY: This is renderer-promotion safety only. It does not make Roll20 chat visual parity pass and does not promote product CSS.

## 2026-07-13 Edit Canvas Drop Label Feedback TODO Note

- DONE: Edit canvas widget dragover now creates a visible Shadow DOM badge for the active drop operation. Flow mode shows `안에 넣기`, `앞에 넣기`, or `뒤에 넣기`; free mode inside a frame shows `자유 배치`.
- DONE: The badge is written as an edit overlay marker and is cleared with the existing drop target cleanup, so it is not part of exported sheet HTML/CSS.
- VERIFIED: `corepack pnpm run smoke:edit-flow -- --out-dir ./out --base-path /roll20-block-editor --report-dir ..\_tmp_edit_flow_smoke_drop_label --port 4319` passed after rebuilding `out/`. The smoke asserts fixed-position label markers for inside, before, after, and free-placement drags, plus existing nested flow insert, sibling insert, layer reorder, non-leaf reorder, absolute-inside-frame, width control, and 0 console/page errors.
- VERIFIED: `corepack pnpm run check:server-hygiene`, `corepack pnpm run test:layer-roles`, `corepack pnpm run lint`, and `corepack pnpm run build` passed. Final server hygiene preserved only CDP `9222` and found no project dev/smoke listeners.
- CURRENT: This makes drag intent more legible, but edit-mode UX still needs richer screenshot review on imported real sheets and actual Roll20 comparison remains separate.
- CLAIM BOUNDARY: Edit overlay usability only. This is not a Roll20 visual parity claim and does not promote chat/rolltemplate renderer CSS.

## 2026-07-13 CDP Preflight Locked-Report Fallback TODO Note

- DONE: `preflight:roll20-cdp` now uses the same locked-report fallback pattern as other Roll20 gates. If the default canonical report folder is read-only and no explicit `--out-dir` was supplied, it writes ignored local evidence under `..\_tmp_codex_smoke`.
- DONE: The report JSON records `output.requestedOutDir`, `output.outDir`, and `output.fallbackReason`, and the console prints `WARNING report write fallback`.
- VERIFIED: `node --check scripts\roll20_cdp_preflight.mjs`, `node scripts\roll20_cdp_preflight.mjs --self-test`, and `corepack pnpm run preflight:roll20-cdp -- --run-dir reports\roll20-actual-compare\2026-06-18-state-map-v1` passed. The live preflight reports `READY`, `targets=8`, `roll20Targets=2`, `plannedFixtures=0`, `rendererReady=NO`, and fallback output `..\_tmp_codex_smoke\roll20-cdp-preflight-2026-06-18-state-map-v1-1783929646464`.
- CURRENT: CDP/browser readiness is not the active blocker right now. Since no fixtures are currently planned for recapture, the next real work remains renderer/template/asset diagnostics named by `gate:roll20-renderer-action`.
- CLAIM BOUNDARY: Verification workflow reliability only. This does not add new Roll20 screenshots, upload a sheet, relink assets, or prove visual parity.

## 2026-07-13 Asset Relink and Browser Paint Locked-Report Fallback TODO Note

- DONE: `plan:roll20-asset-relink` and `plan:roll20-chat-browser-paint` now fall back to ignored temp evidence when their default canonical report folders are read-only. Explicit `--out-dir` remains strict.
- VERIFIED: `node --check scripts\roll20_asset_relink_verification_plan.mjs`, `node --check scripts\roll20_chat_browser_paint_plan.mjs`, `corepack pnpm run test:roll20-asset-relink`, and `corepack pnpm run test:roll20-chat-browser-paint` passed.
- VERIFIED: Live `plan:roll20-asset-relink` now returns `RELINK_MAP_REQUIRED`, AW2E/YSHY `MISSING_RELINK`, and writes fallback template output under `..\_tmp_codex_smoke\asset-relink-verification-plan-2026-06-18-state-map-v1-1783929958954`.
- VERIFIED: Live `plan:roll20-chat-browser-paint` now returns `BROWSER_PAINT_BLOCKED_BY_RELINK`, with AW2E/YSHY blocked by `BLOCKED_BY_ASSET_RELINK` and Les-Oublies secondary because current evidence has no chat background image.
- CURRENT: The active P0 visual-parity blocker is not another broad ChatPane CSS patch. AW2E/YSHY need user-owned HTTP(S) replacement URLs in the local-only asset map, followed by local preview/edit/export and Roll20 Sandbox recomparison.
- CLAIM BOUNDARY: No replacement URL was invented, no third-party asset was copied, and no production renderer CSS was promoted.

## 2026-07-13 Asset Canonical Candidate TODO Note

- DONE: Import/export asset preflight now counts insecure `HTTP URL`, `직링크 후보`, and `Imgur 직링크` cases in the UI.
- DONE: Replacement-map drafts now include commented canonical/direct candidates for review, including `https://imgur.com/<id>.png` -> `https://i.imgur.com/<id>.png`, `http://i.imgur.com/<id>.jpg` -> `https://i.imgur.com/<id>.jpg`, protocol-relative URLs, and Roll20 proxy `src=` values when a canonical source can be inferred.
- VERIFIED: `test:asset-refs`, `test:asset-replacements`, `lint`, `build`, and `smoke:export-dialog -- --report-dir ..\_tmp_codex_smoke\export-dialog-asset-canonical-20260713-r3 --port 4388` passed. The browser smoke confirms import/export drafts contain canonical suggestions and the new metrics render with no console/page errors.
- CURRENT: This helps users relink blocked/dead/external assets before Roll20 comparison, but it still does not apply candidates automatically and does not prove visual parity.
- STILL TODO: Fill user-owned replacement URLs for the active fixtures, rerun local preview/edit/export with the map, then compare in Roll20 Sandbox/test room.

## 2026-07-13 Asset Relink CLI Canonical Template TODO Note

- DONE: `plan:roll20-asset-relink` now writes the same kind of commented canonical/direct candidates into `asset-relink-map-template.txt` that the import/export UI draft shows.
- DONE: Replacement-map parsers strip trailing generated explanation notes such as `# imgur-direct-image:verify-permission` after a user activates a draft line, so the note is not treated as part of the replacement URL.
- VERIFIED: `test:asset-replacements`, `test:roll20-asset-relink`, and a live ignored run `plan:roll20-asset-relink -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --out-dir ..\_tmp_codex_smoke\asset-relink-canonical-template-20260713-r1` passed. The live template contains `verify-permission` suggestions and remains local-only.
- CURRENT: Active fixtures still need user-owned HTTP(S) replacement URLs before local preupload and Roll20 Sandbox/test-room recomparison can move forward.

## 2026-07-13 Script Asset Replacement Parser Coverage TODO Note

- OBSERVED: Current actual Roll20 status remains `GENERATED_ACTUAL_SCREENSHOTS_DIFFED`, with generated screenshots/diffs `6/6`, chat structure matched, `rendererAction=HOLD_PRODUCTION_RENDERER_PATCH`, and `rendererReady=NO`.
- OBSERVED: `plan:roll20-asset-relink` still reports `RELINK_MAP_REQUIRED`; AW2E/YSHY are `MISSING_RELINK` because no user-owned HTTP(S) replacements are supplied yet.
- DONE: Added direct self-test coverage for `scripts/lib/assetReplacements.mjs`, the parser used by local actual-baseline/preupload tooling.
- DONE: `test:asset-replacements` now runs both the app-side TypeScript parser test and the script-side parser test, preventing preview/edit/export UI behavior from silently drifting away from local verification scripts.
- STILL TODO: Fill a local ignored asset replacement map with user-owned HTTP(S) URLs, rerun `plan:roll20-asset-relink --map-file`, then rerun local preview/edit/export and Roll20 Sandbox/test-room comparison. Keep all maps, screenshots, generated reports, and real sheet evidence ignored.
- CLAIM BOUNDARY: Verification-path consistency only. No asset was relinked, no generated sheet was uploaded to Roll20, no product renderer CSS changed, and visual parity is still unproven.

## 2026-07-13 Preupload Asset Map Readiness TODO Note

- DONE: Added script-side readiness counts for active asset replacement maps: Roll20-ready targets, local-only targets, and placeholders.
- DONE: Local baseline reports now include readiness counts but still allow `data:` or relative replacements for local preview/edit plumbing tests.
- DONE: Preupload verification now stops early when an asset map contains local-only or placeholder targets, so `data:`/relative replacements cannot be mistaken for Roll20 Sandbox upload readiness.
- DONE: Preupload verification now falls back to ignored `..\_tmp_codex_smoke` output when the canonical actual-run report folder is locked and no explicit `--report-out-dir` was supplied.
- STILL TODO: Supply user-owned HTTP(S) replacement URLs for AW2E/YSHY before rerunning preupload and Roll20 Sandbox/test-room comparison.
- CLAIM BOUNDARY: Upload-readiness safety only. No real asset was relinked, no Roll20 upload happened, no renderer CSS changed, and visual parity remains unproven.

## 2026-07-13 Import/Export Asset Copy Polish TODO Note

- DONE: Replaced mixed English asset labels in the import/export UI with Korean-first labels: `Roll20 프록시`, `Imgur 페이지`, `placeholder 위험`, `데이터 URL`, `HTTPS/직링크 후보`, and `placeholder 대상`.
- DONE: Localized app-side asset replacement parser warnings that appear in the export dialog, including placeholder and unsafe target warnings.
- DONE: Extended `guard:ui-copy` so these product UI paths fail if the old mixed labels return.
- VERIFIED: `corepack pnpm run guard:ui-copy`, `corepack pnpm run test:asset-refs`, `corepack pnpm run test:asset-replacements`, `corepack pnpm run build`, `corepack pnpm run smoke:export-dialog -- --report-dir ..\_tmp_codex_smoke\export-dialog-copy-polish-20260713-r2 --port 4390`, `corepack pnpm run lint`, `git diff --check`, and `corepack pnpm run check:server-hygiene` passed.
- CURRENT: This improves user-facing clarity around asset relink/upload readiness. It does not change the active actual-Roll20 blocker: AW2E/YSHY still need user-owned HTTP(S) replacement URLs and fresh Sandbox/test-room comparison.
- CLAIM BOUNDARY: Wording/guard coverage only. No asset was relinked, no Roll20 upload happened, no product renderer CSS changed, and visual parity remains unproven.

## 2026-07-13 Roll20 Sandbox Diagnostic Copy Polish TODO Note

- DONE: Export dialog Sandbox diagnostic rows now use Korean-first labels for rewrite details: `선택자 보정`, `클래스 보정`, `태그 제거`, `프록시 처리`, and `제거`.
- DONE: `smoke:export-dialog` now fails if visible Sandbox diagnostic rows contain `selector prefix`, `class prefix`, `proxy`, or `drop`.
- VERIFIED: `corepack pnpm run guard:ui-copy`, `node --check scripts\export_dialog_browser_smoke.mjs`, `corepack pnpm run build`, `corepack pnpm run smoke:export-dialog -- --report-dir ..\_tmp_codex_smoke\export-dialog-sandbox-copy-20260713-r1 --port 4391`, `corepack pnpm run lint`, `git diff --check`, and `corepack pnpm run check:server-hygiene` passed.
- CURRENT: This reduces visible implementation jargon in the upload-readiness UI. It does not alter actual Roll20 render behavior or unblock renderer readiness.
- CLAIM BOUNDARY: UI copy and smoke coverage only. No asset relink, Roll20 upload, renderer CSS promotion, or visual parity proof happened.
