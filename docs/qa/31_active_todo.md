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
