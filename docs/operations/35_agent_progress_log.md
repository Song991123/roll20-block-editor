## 2026-06-20 03:03 +09:00 - Roll20 chat font fallback candidate rejected

Status: PARTIAL. The YSHY font hypothesis was tested, but the candidate is not production-safe.

- Added diagnostic-only `__r20ChatFontPolicy=roll20-chat-fallback` support in ChatPane and `rolltemplate_chat_smoke --chat-font-policy roll20-chat-fallback`.
- Added diagnostic-only `__r20SuppressUserDocumentFonts=1` in the preview Shadow DOM font registration path so the candidate can suppress user `@font-face` at document scope, not only in ChatPane CSS.
- Rebuilt and ran default and fallback local chat smoke against AW2E, Les-Oublies, and YSHY.
- Default remains the better current baseline: YSHY raw/aligned `28.36%/22.46%`.
- Fallback made one metric more Roll20-like, first YSHY label cell width `15.8594px -> 14.8281px` vs actual `14.95px`, but worsened visual mismatch to raw/aligned `31.85%/27.93%`.
- Decision: keep the switch for diagnostics only and do not promote it to production ChatPane behavior.
- Latest restored baseline after rerun: `chatNormalizedCompared=3/3`, `chatAlignedHighMismatch=1`, `chatAuthoritativeNormalizedHighMismatch=1`, `rendererReady=NO`, `rendererAction=HOLD_PRODUCTION_RENDERER_PATCH`.

## 2026-06-20 03:03 +09:00 - YSHY chat font/root-cause probe

Status: PARTIAL. YSHY chat mismatch has a concrete suspect, but no production renderer change is promoted yet.

- Claimed the already-open dedicated Roll20 YSHY verification tab read-only and inspected the latest `.sheet-rolltemplate-coc` computed styles. No Roll20 room/settings data was modified.
- Actual Roll20 computed styles mostly match local for YSHY: `content-box`, `line-height:17.0625px`, `font-size:12px`, `font-weight:700`, 16-layer `text-shadow`, and the same background image proxy path.
- The key mismatch is font availability/metrics: actual Roll20 reports `document.fonts.check("700 12px BookkMyungjo-Bd") === false`, while local smoke reports the BookkMyungjo checks as `true`.
- The measured cell geometry also points at font metrics: actual first label cell computed width is `14.95px`, local is `15.8594px`, with otherwise matching padding/line-height/text-shadow.
- Updated `scripts/roll20_chat_capture_plan.mjs` and `scripts/rolltemplate_chat_smoke.mjs` to record computed style and font evidence so future Roll20 captures can prove this without manual browser inspection.
- A quick experiment excluding `@font-face` from ChatPane rolltemplate extraction did not change current screenshot mismatch numbers in this environment, likely because the font remained available through cache or another injected style path. The experiment was reverted.
- Next P0: create a controlled diagnostic candidate for Roll20-chat font availability/fallback and compare it across AW2E, Les-Oublies, and YSHY before making any production ChatPane font policy change.

## 2026-06-20 03:03 +09:00 - Chat parity aligned diagnostic and ChatPane asset stabilization

Status: PARTIAL. Roll20 chat evidence is normalized and the biggest mismatch count is down, but visual parity is still not achieved.

- Added a local ChatPane smoke wait for rolltemplate background images and `document.fonts.ready` before screenshot capture. This addresses the AW2E false local screenshot where the template was captured before the remote background image decoded.
- Preserved simple rolltemplate `@font-face` blocks in `components/editor/ChatPane.tsx` and kept font asset URLs direct. An attempted `@import` path was rejected because it caused Les-Oublies rolltemplate rules to collapse, so imported fonts remain a later targeted task.
- Adjusted local ChatPane rolltemplate box model toward actual Roll20 evidence: `content-box` and `line-height:17.0625px`. This moved YSHY local rolltemplate height to `586px` against actual `585px`.
- Added small-offset aligned pixel comparison to `scripts/roll20_chat_parity_diagnostics.mjs` and propagated the same aligned boundary through `status:roll20-actual` and `gate:roll20-renderer-action`.
- Current verified diagnostic numbers: raw high mismatch `3/3`, aligned high mismatch `1/3`, authoritative normalized high mismatch `1/3`, actual crop geometry suspect `0`.
- Current fixture numbers: AW2E raw/aligned `12.78%/7.49%`, Les-Oublies `10.09%/9.14%`, YSHY `28.36%/22.46%`.
- Renderer gate remains `HOLD_PRODUCTION_RENDERER_PATCH` with two blockers: YSHY chat/template crop still differs after alignment, and the full sheet renderer patch family is still split across AW2E vs Les/YSHY.
- Verification so far: `diagnose:roll20-chat-parity`, `status:roll20-actual`, and `gate:roll20-renderer-action` passed sequentially against `reports\roll20-actual-compare\2026-06-18-state-map-v1`.
- Next P0: finish verification (`rolltemplate_chat_smoke`, lint, build, evidence guard), then continue reducing YSHY rolltemplate mismatch before edit-mode UX work.

## 2026-06-20 05:25 +09:00 - Roll20 chat element-bound recapture

Status: PARTIAL. Chat evidence is now geometry-authoritative, but Roll20 chat parity is still failing for AW2E and YSHY.

- Used logged-in Chrome Roll20 Sandbox/editor tabs to recapture local-only ignored `roll20-chat.png` and `roll20-chat-dom-evidence.json` for AW2E, Les-Oublies, and YSHY with live rolltemplate element-bound CDP screenshots. These files remain under ignored `reports/roll20-actual-compare/...` evidence folders and are not committed.
- Confirmed previous coordinate-calibrated chat captures were misleading: Les/YSHY visible PNGs included chat shell/scrollbar/left-strip areas even though sidecars claimed full template crops.
- Current verified status after recapture: `chatNormalizedCompared=3/3`, `chatActualCropGeometrySuspect=0`, `chatAuthoritativeNormalizedHighMismatch=2`, `rendererReady=NO`.
- Current chat mismatches: AW2E `64.49%`, Les-Oublies `8.41%`, YSHY `33.53%`. Les-Oublies is below the high-mismatch threshold; AW2E and YSHY remain failures.
- Visual classification: AW2E local ChatPane is missing/offsetting the 189x189 rolltemplate background/table rendering, leaving the local card mostly blue. YSHY width/background match better, but actual Roll20 template height is `585px` while local is `554px`, so font/line-height/table/body rendering still drifts.
- Verification: `corepack pnpm run diagnose:roll20-chat-parity -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `corepack pnpm run gate:roll20-renderer-action -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, and `corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1` all ran successfully.
- Next P0: fix AW2E rolltemplate background/table rendering and investigate YSHY height drift before returning to edit-mode UX.

## 2026-06-20 04:55 +09:00 - Chat parity crop evidence tightened

Status: PARTIAL. Local ChatPane capture is cleaner, but the current Roll20 chat evidence is no longer accepted as geometry-authoritative.

- Fixed `scripts/rolltemplate_chat_smoke.mjs` so local rolltemplate screenshots use Playwright element screenshots instead of viewport `clip` screenshots. The previous clip path truncated templates at the right viewport edge (`255px` local PNGs while DOM width was `279px`), creating false local/actual width signals.
- Adjusted local ChatPane rolltemplate message width from `340px` to `328px`; local template screenshots for Les-Oublies and YSHY now measure `267px` wide, matching the current actual Roll20 template crop width.
- Tightened `scripts/roll20_chat_parity_diagnostics.mjs`, `scripts/roll20_renderer_action_gate.mjs`, and `scripts/roll20_actual_status.mjs` so coordinate-calibrated or relocated Roll20 chat captures are classified as crop-geometry suspects instead of trusted normalized evidence.
- Verification: `corepack pnpm run build` PASS, `corepack pnpm run lint` PASS, `node scripts\rolltemplate_chat_smoke.mjs --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/rolltemplate-chat-smoke --port 4452` PASS, `corepack pnpm run diagnose:roll20-chat-parity -- reports\roll20-actual-compare\2026-06-18-state-map-v1` PASS, `corepack pnpm run gate:roll20-renderer-action -- reports\roll20-actual-compare\2026-06-18-state-map-v1` PASS, and `corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1` PASS.
- Current truth: `chatNormalizedCompared=3/3`, but `chatActualCropGeometrySuspect=3` and `chatAuthoritativeNormalizedHighMismatch=0`. The old mismatch numbers are diagnostic only because the actual Roll20 PNGs visibly include chat shell/scrollbar/left-strip or relocation artifacts.
- Renderer gate remains `HOLD_PRODUCTION_RENDERER_PATCH`. Next P0 is element-bound Roll20 chat recapture with fresh DOM sidecars before more ChatPane tuning or edit-mode UX work.

## 2026-06-20 04:25 +09:00 - ChatPane Roll20 shell/resource alignment

Status: PARTIAL. Local ChatPane is closer to actual Roll20 chat, but chat parity and renderer readiness are still failing.

- Updated `components/editor/ChatPane.tsx` so rolltemplate CSS external `url(...)` assets are rewritten through Roll20's image proxy shape (`https://imgsrv.roll20.net/?src=...`) while already-Roll20-hosted assets remain untouched.
- Changed the local chat shell from forced `withoutavatars` to the normal Roll20 avatar-on chat structure, matching the actual Roll20 evidence where the left avatar/sender strip is present.
- Changed local rolltemplate chat card/message width from `300px` to Roll20's observed default `340px`, and stopped clamping rolltemplate wrappers with `max-width:100%` inside the padded message body.
- Verification: `corepack pnpm run build` PASS, `node scripts\rolltemplate_chat_smoke.mjs --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/rolltemplate-chat-smoke --port 4452` PASS for AW2E, Les-Oublies, and YSHY, and `corepack pnpm run lint` PASS.
- Resource result improved: latest rolltemplate chat smoke reports `resourceIssues=0` for AW2E, Les-Oublies, and YSHY after the URL proxy rewrite. YSHY local rolltemplate background now renders.
- Chat parity result improved but still fails: max normalized mismatch moved from `63.95%` to `48.73%`; AW2E improved from `63.95%` to `37.95%`, Les-Oublies is `26.92%`, and YSHY remains high at `48.73%`.
- Renderer gate remains `HOLD_PRODUCTION_RENDERER_PATCH` with `rendererReady=NO`; remaining work is crop normalization/message-shell comparison and the split renderer patch-family issue.

## 2026-06-20 04:05 +09:00 - AW2E chat evidence normalized, renderer still held

Status: PARTIAL. The missing AW2E normalized Roll20 chat evidence blocker is closed, but Roll20 chat/renderer parity is still failing.

- Reclaimed the dedicated `Codex Roll20 Verify` Roll20 Sandbox/editor tab through Chrome and confirmed the active AW2E sheet can produce `.sheet-rolltemplate-aw` chat DOM after a real roll button/macro-option flow.
- Found a Chrome/Roll20 compositor mismatch: `#textchat` and `.sheet-rolltemplate-aw` were visible to DOM hit-testing and computed styles, but ordinary screenshots captured the map/grid surface instead of the right sidebar content. The final AW2E evidence therefore uses a documented temporary `#rightsidebar` relocation for capture, immediately restored afterward. Treat this as rolltemplate style/parity evidence only, not geometry evidence.
- Replaced local-only ignored AW2E `roll20-chat.png` and `roll20-chat-dom-evidence.json` under `reports/roll20-actual-compare/2026-06-18-state-map-v1/local-baseline/official-roll20-AW2E/screenshots/`.
- Verification: `corepack pnpm run diagnose:roll20-chat-parity -- reports\roll20-actual-compare\2026-06-18-state-map-v1` now reports `compared=3`, `normalizedCompared=3`, `normalizedHighMismatch=3`.
- Current measured status: `generatedActualScreenshots=6/6`, `generatedDiffed=6/6`, `trustedFullRoot=3/3`, `reliableTrustedFullRoot=3/3`, `chatNormalizedCompared=3/3`, `chatNeedsNormalizedCapture=0`, `chatNormalizedHighMismatch=3`, `rendererReady=NO`.
- Current measured chat crop mismatches: AW2E `63.95%`, Les-Oublies `27.61%`, YSHY `46.39%`. These are failures, not parity claims.
- Current renderer gate remains `HOLD_PRODUCTION_RENDERER_PATCH` with 2 real blockers: actual Roll20 rolltemplate crop differs from local ChatPane for 3/3 normalized fixtures, and best diagnostic renderer patch is not uniform across fixtures.
- Next P0: fix/diagnose local ChatPane rolltemplate shell sizing and template crop normalization against the now-complete actual Roll20 evidence set before touching edit-mode UX or production renderer CSS.

## 2026-06-20 03:05 +09:00 - Current Roll20 chat evidence state corrected

Status: PARTIAL. This narrows the remaining actual Roll20 evidence blocker to AW2E chat capture.

- Promoted only visually checked local-only evidence: Les-Oublies and YSHY now have normalized rolltemplate crop metadata accepted by `diagnose:roll20-chat-parity`.
- Current status command reports `generatedActualScreenshots=5/6`, `generatedDiffed=5/6`, `chatNormalizedCompared=2/3`, `chatNeedsNormalizedCapture=1`, and `rendererReady=NO`.
- Current chat mismatch is still high for the normalized fixtures: Les-Oublies `27.61%`, YSHY `46.39%`.
- AW2E remains blocked because the existing PNG visibly captures overlapping sheet/dialog content, and the open Roll20 tab repeatedly timed out during Chrome inspection/screenshot attempts.
- Fixed Roll20 evidence JSON readers to strip a leading UTF-8 BOM before `JSON.parse`; this matters because local PowerShell-created sidecars can otherwise be misread as missing/stale evidence.
- Verification: `node --check` for the changed Roll20 scripts PASS, `plan:roll20-chat-capture` now plans only AW2E, `diagnose:roll20-chat-parity` compares 2/3 normalized fixtures, `status:roll20-actual` and `gate:roll20-renderer-action` reran, and `guard:roll20-evidence` PASS.
- Next P0: recapture AW2E foreground chat from a responsive dedicated Sandbox/test-room state before using chat pixel diffs to tune local ChatPane or renderer CSS.

## 2026-06-20 02:20 +09:00 - Roll20 chat foreground evidence correction

Status: PARTIAL. This prevents tuning local ChatPane against the wrong actual screenshot crop.

- Opened the current ignored `roll20-chat.png` files for AW2E, Les-Oublies, and YSHY and found they visually show overlapping character/dialog sheet content rather than the foreground Roll20 chat/template area.
- The previous capture-quality check only proved PNG format and CSS 1x scale. It did not prove the screenshot foreground matched the DOM sidecar's rolltemplate rect.
- Hardened `scripts/roll20_chat_capture_plan.mjs`, `scripts/roll20_actual_status.mjs`, `scripts/roll20_upload_handoff.mjs`, and `scripts/roll20_chat_parity_diagnostics.mjs` so older sidecars without `chatElementSelector` become foreground-suspect evidence.
- Current corrected status: `PARTIAL_GENERATED_ACTUAL_SCREENSHOTS`, `generatedActualScreenshots=3/6`, `generatedDiffed=3/6`, `chatNormalizedCompared=0/3`, `chatNeedsNormalizedCapture=3`, with all three chat screenshots missing trustworthy foreground proof.
- Current renderer gate now HOLDs on missing trustworthy Roll20 chat screenshots and normalized crop evidence, not on the earlier misleading 3/3 chat high-mismatch values.
- Also updated `scripts/rolltemplate_chat_smoke.mjs` so external resource 403 console messages are tracked as resource issues instead of failing local chat functionality. Latest local chat smoke PASSes all three prepared fixtures.
- Next P0: recapture Roll20 chat from the actual foreground chat root with the current probe, then only after that use pixel mismatch to tune local ChatPane/rolltemplate styling.

## 2026-06-20 01:55 +09:00 - Roll20 upload manifest and chat probe hardening

Status: PARTIAL. This improves the reliability of future Roll20 Sandbox uploads/captures; it does not prove Roll20 parity.

- Fixed `scripts/roll20_upload_snippet.mjs` so the generated settings fallback updates Roll20's observed Ace editor object `editors.json` in addition to the hidden/visible `customcharsheet_json` fields. This directly addresses the stale AW2E/YSHY manifest risk found on the settings page.
- The generated snippet now logs `aceJsonSet`, `editorKeys`, and manifest length in its `Manifest:` result, making future handoff logs auditable.
- Hardened `scripts/roll20_chat_capture_plan.mjs` generated DOM probe to select a visible chat root in priority order `#textchat`, `.textchatcontainer`, `#rightsidebar` instead of accepting the first selector match. The sidecar now records both the chosen selector and the actual element identity.
- Verification: `node --check scripts\roll20_upload_snippet.mjs`, `node --check scripts\roll20_chat_capture_plan.mjs`, `corepack pnpm run test:roll20-chat-capture-plan`, YSHY snippet generation, generated snippet syntax check, `plan:roll20-chat-capture`, `diagnose:roll20-chat-parity`, `status:roll20-actual`, `gate:roll20-renderer-action`, `guard:roll20-evidence`, `corepack pnpm run lint`, and `corepack pnpm run build` PASS.
- Current active run remains renderer-blocked: all actual chat captures are trusted (`plannedFixtures=0/3`, `chatActualCaptureScaleSuspect=0`), but normalized local-vs-actual chat mismatch is still high for 3/3 fixtures, with max mismatch `94.44%`.
- Next P0 after the remaining verification commands is the actual implementation fix: align local ChatPane/rolltemplate shell and sizing against the trusted Roll20 evidence before touching edit-mode UX.

## 2026-06-20 01:20 +09:00 - AW2E Roll20 chat PNG 1x recapture

Status: PARTIAL. AW2E no longer blocks on capture format/scale; YSHY still does.

- Used only the dedicated `Codex Roll20 Verify` Roll20 Sandbox/editor. Existing real rooms were not modified.
- Applied regenerated AW2E upload snippet in the editor Sandbox Tools with file-input dispatch plus endpoint fallback to campaign `21639681`; all three endpoint posts returned `200`, and the Sandbox body text no longer showed the translation JSON parse warning.
- Reused the visible AW2E `sheet-rolltemplate-aw` chat message in the dedicated editor, captured `roll20-chat.png` through CDP `Page.captureScreenshot` with `format=png` and `clip.scale=1`, and immediately wrote a matching DOM sidecar from the generated probe snippet.
- Verification: `plan:roll20-chat-capture` now reports `plannedFixtures=1/3`; AW2E is no longer `SCALE_OR_FORMAT_SUSPECT`.
- YSHY attempt: regenerated/applied YSHY snippet in the same dedicated Sandbox editor. File-input dispatch and endpoint fallback succeeded, local validation passed, and Sandbox body text did not show a parse warning; however existing character viewers still exposed no `.charactersheet` / `.charsheet` root and no roll buttons, so no new YSHY rolltemplate could be generated.
- Claim boundary: AW2E capture quality improved, but AW2E mismatch remains high and Roll20 parity is still failing. YSHY remains the next recapture blocker.

## 2026-06-20 00:55 +09:00 - Chat capture plan evidence-quality rejection

Status: PARTIAL. This closes a truthfulness gap in the next Roll20 recapture step, not visual parity.

- Extended `scripts/roll20_chat_capture_plan.mjs` so existing actual Roll20 chat screenshots are inspected by file bytes and sidecar clip scale before they can be treated as usable pixel evidence.
- The plan now flags non-PNG or non-1x screenshots as `SCALE_OR_FORMAT_SUSPECT` and keeps them in the recapture queue.
- Verification before broader CI: `node --check scripts\roll20_chat_capture_plan.mjs` PASS; `corepack pnpm run test:roll20-chat-capture-plan` PASS; `corepack pnpm run plan:roll20-chat-capture -- reports\roll20-actual-compare\2026-06-18-state-map-v1` reports `plannedFixtures=2/3`.
- Current recapture queue is exactly `official-roll20-AW2E` and `yshy-commission-1bu`; `official-roll20-Les-Oublies` remains the only current true PNG 1x chat capture.
- Claim boundary: this prevents agents from tuning local ChatPane CSS against invalid JPEG/0.8x evidence. Actual Roll20 parity remains unproven and currently failing.

## 2026-06-20 00:40 +09:00 - Roll20 chat capture scale gate

Status: PARTIAL. This prevents premature ChatPane CSS tuning from low-confidence pixel evidence.

- Found actual Roll20 chat evidence quality mismatch: AW2E and YSHY roll20-chat.png files contain JPEG bytes and were captured at about 0.8x CSS scale despite the .png filename.
- Recaptured Les-Oublies chat via CDP Page.captureScreenshot format=png with clip.scale=1 after scrolling the same roll_initiative / initiative-roll message into the text chat clip. Les mismatch moved from 33.16% to 29.21%.
- Updated scripts/roll20_chat_parity_diagnostics.mjs to report image format, actual capture scale, source crop, and compared size in the JSON/Markdown report.
- Updated scripts/roll20_renderer_action_gate.mjs and scripts/roll20_actual_status.mjs so non-PNG or non-1x chat captures are explicit blockers. Latest status reports chatActualCaptureScaleSuspect=2 and rendererBlockers=3.
- Verification: node --check for changed scripts PASS; test:roll20-chat-capture-plan PASS; diagnose:roll20-chat-parity, gate:roll20-renderer-action, and status:roll20-actual reran successfully.
- Claim boundary: Roll20 chat visual parity is false. Next P0 is AW2E/YSHY true PNG 1x recapture before using their pixel diffs to tune ChatPane CSS.

## 2026-06-20 00:27 +09:00 - Les-Oublies normalized Roll20 chat capture

Status: PARTIAL. One evidence blocker was closed, but visual parity is still failing.

- Used the already-open dedicated Codex Roll20 Verify Roll20 editor tab and did not modify existing real rooms.
- Captured fresh local-only official-roll20-Les-Oublies roll20-chat.png plus roll20-chat-dom-evidence.json with clip metadata, rolltemplates[].rect, latestTemplate, and chatCssEvidence.
- Found and corrected a first Les capture-context mismatch: the old chat message was sheet-rolltemplate-classic-roll, while local smoke clicked roll_initiative / sheet-rolltemplate-initiative-roll. Reopened the sandbox character, clicked the visible roll_initiative button, scrolled chat so the new template intersected the clip, and recaptured the same action.
- Validation: corepack pnpm run diagnose:roll20-chat-parity -- reports\roll20-actual-compare\2026-06-18-state-map-v1 now reports compared=3/3, normalizedCompared=3/3, needsNormalizedCapture=0.
- Validation: corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1 now reports rendererBlockers=2, chatNormalizedCompared=3/3, chatNeedsNormalizedCapture=0, chatNormalizedHighMismatch=3.
- Current mismatch values after same-action Les recapture: AW2E 95.13%, Les-Oublies 33.16%, YSHY 38.25%. This is strong evidence that local ChatPane/rolltemplate rendering still differs from actual Roll20.
- Updated scripts/roll20_chat_capture_plan.mjs so future generated DOM probes include left/top rect fields and clone latestTemplate from templateInfos instead of using a divergent shape.
- Claim boundary: Roll20 chat visual parity remains false; the next work should target chat shell/template sizing and Roll20 runtime styling differences rather than more normalized recapture.

## 2026-06-20 00:22 +09:00 - Rolltemplate crop diagnostic correction

Status: PARTIAL. This improves truthfulness of Roll20 actual comparison, not parity itself.

- Changed chat parity diagnostics to choose the latest/in-clip actual Roll20 rolltemplate crop instead of the first rect-bearing template in the sidecar.
- Validation: node --check scripts\roll20_chat_parity_diagnostics.mjs PASS; corepack pnpm run diagnose:roll20-chat-parity -- reports\roll20-actual-compare\2026-06-18-state-map-v1 reports AW2E 95.13%, YSHY 38.25%, Les NEEDS_NORMALIZED_CAPTURE.
- Validation: corepack pnpm run gate:roll20-renderer-action -- reports\roll20-actual-compare\2026-06-18-state-map-v1 still holds production renderer patch with 3 blockers.
- Validation: corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1 remains GENERATED_ACTUAL_SCREENSHOTS_DIFFED, generatedActualScreenshots=6/6, generatedDiffed=6/6, rendererReady=NO.
- Validation: corepack pnpm run guard:roll20-evidence -- reports\roll20-actual-compare\2026-06-18-state-map-v1, corepack pnpm run lint, and corepack pnpm run build PASS.
- Claim boundary: Roll20 visual parity is not achieved. This patch prevents the next renderer work from chasing an invalid stale-template diff.
## 2026-06-20 - Les-Oublies Roll20 recapture attempt and upload snippet hardening

- Reused only the dedicated `Codex Roll20 Verify` Custom Sheet Sandbox, not an existing real room.
- Re-ran current actual gates before live work: `status:roll20-actual` stayed `GENERATED_ACTUAL_SCREENSHOTS_DIFFED`, `generatedActualScreenshots=6/6`, `generatedDiffed=6/6`, `chatNormalizedCompared=2/3`, `chatNeedsNormalizedCapture=1`, and `rendererAction=HOLD_PRODUCTION_RENDERER_PATCH`.
- Applied the generated Les-Oublies payload through the editor file-input snippet path; all three inputs reported `dispatched`, local payload validation passed, and the visible Roll20 translation parse warning disappeared.
- Because the character iframe stayed blank, posted the same Les-Oublies HTML/CSS/translation to the observed dedicated endpoint `/sheetsandbox/savesheetsettings`; all three requests returned `200`.
- Saved the wrapped Les-Oublies `customcharsheet_json` through the settings page; Roll20 showed `Your changes were saved successfully`.
- Reopening the sandbox character still produced no rendered `.charactersheet` root in the current session. A local-only blocker evidence file was written under the ignored report folder: `roll20-les-current-blank-after-endpoint-save.json`.
- Do not overwrite the earlier trusted Les-Oublies root/chat evidence from 2026-06-19. Current work did not produce the missing normalized Les rolltemplate rect/clip sidecar, so chat parity remains `2/3`.
- Hardened `scripts/roll20_upload_snippet.mjs`: generated snippets now include an explicit, off-by-default `USE_ENDPOINT_FALLBACK`, optional `ENDPOINT_CAMPAIGN_ID`, endpoint result logging, and README warnings that endpoint/file-input success is only storage/application evidence until a fresh iframe DOM/root proves rendering.
- Verification: `node --check scripts\roll20_upload_snippet.mjs` PASS; regenerated the ignored Les upload snippet; `plan:roll20-chat-capture` still reports Les needs normalized rolltemplate crop metadata; `gate:roll20-renderer-action` still HOLDs with 3 blockers.
## 2026-06-19 - Roll20 chat capture snippet metadata fix

- Inspected `roll20_chat_parity_diagnostics.mjs` and confirmed normalized comparison requires sidecar `rolltemplates[].rect` and top-level `clip`/`screenshotClipApplied` metadata.
- Updated `scripts/roll20_chat_capture_plan.mjs` generated snippets to emit `rolltemplates`, `clip`, `screenshotClipApplied`, `screenshotCssClip`, and diagnostic `chatCssEvidence` so future captures can feed the existing parity diagnostic directly.
- Added generated-snippet syntax checks to the plan report and console output.
## 2026-06-19 - Roll20 chat capture plan tooling

- Added `scripts/roll20_chat_capture_plan.mjs` and package alias `plan:roll20-chat-capture`.
- The command reads ignored actual-compare evidence, identifies missing/stale chat targets, extracts suggested `roll_*` button names from payload HTML, and writes ignored handoff output plus browser-side DOM probe snippets under `roll20-chat-capture-plan/`.
- Rerun on the active state-map run reports three planned captures: AW2E stale DOM, Les-Oublies needs normalized crop metadata, and YSHY stale DOM.
- Updated `status:roll20-actual` next action to point directly to the new focused chat capture plan when roots are already present but generated chat evidence is incomplete.
## 2026-06-19 - Roll20 status next-action correction

- Investigated the current `status:roll20-actual` output after selector/export fixes.
- Found the current `generatedActualScreenshots=4/6` gap is not missing sandbox root evidence; both missing generated targets are stale chat screenshot/DOM sidecar pairs for AW2E and YSHY.
- Updated `scripts/roll20_actual_status.mjs` so console output lists `missingGenerated=<fixture>:<target>:<kind>` and `nextAction=...`.
- The next P0 is fresh same-action Roll20 chat capture for AW2E and YSHY, not another generic upload attempt.
- Chrome Roll20 tab claim timed out in this batch, so no new live Roll20 screenshot was captured.
## 2026-06-19 Actual Status Chat Gate Surface Update

- Updated `scripts/roll20_actual_status.mjs` so the one-command actual status reads `chat-parity-diagnostics-results.json` and prints chat parity blockers beside renderer status.
- Latest status output now includes `chatParity=PRESENT`, `chatNormalizedCompared=2/3`, `chatNeedsNormalizedCapture=1`, `chatActualCssInactive=2`, and `chatNormalizedHighMismatch=1`.
- Claim boundary: this is reporting/guardrail work. It does not prove Roll20 visual parity. It prevents agents from ignoring the current CSS-inactive Roll20 chat evidence while the renderer gate remains HOLD.
- Next P0 remains actual evidence capture: prove or recapture a Roll20 Sandbox/test-room chat state where user rolltemplate CSS is active, plus the missing normalized Les-Oublies rolltemplate rect/clip sidecar.

## 2026-06-19 Chat CSS Evidence Gate Update

- Added a diagnostic boundary for actual Roll20 chat CSS activation. Current local-only sidecars for AW2E and YSHY now include chatCssEvidence captured from Chrome editor tabs.
- The current actual Roll20 chat evidence is CSS-inactive: expected sheet-rolltemplate CSS rules are absent from page styles even though rolltemplate DOM exists.
- `scripts/roll20_chat_parity_diagnostics.mjs` now reports actualChatCssInactive/Unknown and per-fixture Actual CSS state.
- `scripts/roll20_renderer_action_gate.mjs` now blocks on CSS-inactive actual chat evidence and changes the next action from local ChatPane tweaking to recapturing/proving CSS-active Roll20 chat evidence first.

## 2026-06-19 Rolltemplate CSS investigation

- Found a real local bug: ChatPane was extracting rolltemplate CSS from raw emitted CSS without Roll20 auto-prefix, so emitted dot-rolltemplate selectors did not match rendered dot-sheet-rolltemplate DOM.
- Patched ChatPane to apply autoPrefixCssClasses before extracting rolltemplate CSS.
- Patched rolltemplate body rendering to normalize user class tokens to Roll20-style sheet-* classes while preserving runtime classes: inlinerollresult, fullcrit, fullfail, importantroll.
- Browser/Chrome observation showed the current Roll20 actual chat evidence is not applying user rolltemplate CSS: style text lacks dot-sheet-rolltemplate-aw and dot-sheet-rolltemplate-coc, and computed styles remain Roll20 default chat styles.
- Therefore the current high YSHY mismatch after the patch is evidence-context mismatch, not proof that the local CSS-enabled renderer is wrong.
- Keep TODO open until actual Roll20 upload/capture proves whether chat CSS is active for correctly configured custom sheet sandbox/test room.
## 2026-06-19 Roll20 Chat Evidence Normalization Follow-up

- Recaptured YSHY 1BU actual Roll20 chat evidence from the dedicated sandbox after opening the chat tab, scrolling the target message fully into view, and clicking the same iframe `[name="roll_str_check"]` roll button used by local smoke. Evidence is local-only under ignored `reports/roll20-actual-compare/2026-06-18-state-map-v1/local-baseline/yshy-commission-1bu/screenshots/`.
- Fixed a rolltemplate lookup bug: `sheet-rolltemplate-coc` was matching the earlier `sheet-rolltemplate-coc-dice-roll` prefix because the old regex used a word boundary before `-`. Lookup now matches exact class tokens.
- Added Roll20-style chat card shell normalization, local template wrapper crop screenshots, and normalized chat parity diagnostics so local/actual comparisons use rolltemplate wrapper rects instead of full chat panes or overflow table screenshots.
- Added ChatPane translation application for rolltemplate field text and simple `data-i18n` labels via the existing Roll20 translation normalizer. Local YSHY chat now renders Korean labels such as `근력`, `기준치`, and `굴림`.
- Verification: `corepack pnpm run build` PASS, `corepack pnpm run lint` PASS, `node scripts\rolltemplate_chat_smoke.mjs --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/rolltemplate-chat-smoke` PASS.
- Current blocker: renderer gate remains `HOLD_PRODUCTION_RENDERER_PATCH`. Latest chat diagnostic is still `HIGH_MISMATCH`: normalized `2/3`, needs normalized capture `1/3`, YSHY mismatch `35%`, AW2E mismatch `93.26%` from an old suspect capture. This is not Roll20 chat visual parity.

## 2026-06-19 Roll20 Chat Parity Gate Update

- Refreshed actual Roll20 AW2E chat evidence in the dedicated sandbox: `roll20-chat.png` + `roll20-chat-dom-evidence.json` now capture a visible `sheet-rolltemplate-aw` with `rolltemplateCount=1` and `messageCount=8`.
- Re-ran local `rolltemplate_chat_smoke.mjs`: AW2E, Les-Oublies, and YSHY 1BU all PASS locally.
- Added `scripts/roll20_chat_parity_diagnostics.mjs` and `diagnose:roll20-chat-parity` to compare local ChatPane screenshots against actual Roll20 chat screenshots. Latest result: compared 3/3, highMismatch 3/3; AW2E 13.02%, Les-Oublies 27.95%, YSHY 12.74%.
- `roll20_renderer_action_gate.mjs` now treats chat parity high mismatch as a blocker. Renderer action remains `HOLD_PRODUCTION_RENDERER_PATCH`.

## 2026-06-19 Current Roll20 Iframe Probe Refresh

- Captured fresh ignored Chrome evidence from the dedicated Roll20 editor tab under `reports/roll20-actual-compare/2026-06-18-state-map-v1/live-iframe-probe/`.
- Current character iframe frameId was readable through CDP `Page.getFrameTree` + `Page.createIsolatedWorld`; captured `.charactersheet` root metrics: width 852px, height 11788.0879px, content-box, font 13px / 18.5714px, textLength 16196, htmlLength 93382.
- This is positive live iframe evidence only. It does not change `rendererReady=NO`, does not prove visual parity, and does not satisfy room-observation/chat evidence.

## 2026-06-19 Current Roll20 Iframe Probe Refresh

- Captured fresh ignored Chrome evidence from the dedicated Roll20 editor tab under `reports/roll20-actual-compare/2026-06-18-state-map-v1/live-iframe-probe/`.
- Current character iframe frameId was readable through CDP `Page.getFrameTree` + `Page.createIsolatedWorld`; captured `.charactersheet` root metrics: width 852px, height 11788.0879px, content-box, font 13px / 18.5714px, textLength 16196, htmlLength 93382.
- This is positive live iframe evidence only. It does not change `rendererReady=NO`, does not prove visual parity, and does not satisfy room-observation/chat evidence.
# 2026-06-19 Input-Flow Model Boundary Gate

- Extended `diagnose:roll20-input-flow-axis` with explicit model-boundary statuses: `APPLY_CANDIDATE_FOR_THIS_AXIS`, `BLOCK_GLOBAL_MODEL`, and `globalModelSafe`.
- Latest result: apply candidates are Les-Oublies and YSHY; AW2E blocks global input-flow because scroll-metrics source rootDelta `+8.188px` worsens to `+47.188px` under input-flow.
- `gate:roll20-renderer-action` now surfaces this boundary directly: input-flow is candidate-only for Les-Oublies/YSHY and blocked by AW2E. Renderer remains HOLD and `rendererReady=NO`.
# 2026-06-19 Production-Path Input-Flow Renderer Model Candidate

- Added a gated `roll20RendererModel` option to `buildSheetDoc()` / `buildSheetParts()` with `input-flow-27` and `input-flow-276`. Default remains `default`; this is not exposed as a finished user feature and must stay off until gates pass.
- Added production-path candidates `sandbox-renderer-input-flow-270-source` and `sandbox-renderer-input-flow-276-source` to `smoke:roll20-full-root-candidates`. They reproduce the previous diagnostic injection candidates through the real preview builder rather than post-load style injection.
- Latest evidence: Les-Oublies production-path `input-flow-27` matches the diagnostic candidate at mismatch `3.757%`, rootDelta `-3.625px`; YSHY matches at `4.231%`, rootDelta `-0.375px`; AW2E scroll-metrics source remains safer (`+8.188px`) than input-flow (`+47.188px`). Renderer gate remains HOLD.
# 2026-06-19 Input/Inline-Flow Axis Diagnostic

- Added `scripts/roll20_input_flow_axis_diagnostics.mjs` and package script `diagnose:roll20-input-flow-axis` to compare source-state vs inline/text-input-height candidates against actual Roll20 computed-style sidecars.
- Latest command: `corepack pnpm run diagnose:roll20-input-flow-axis -- reports\roll20-actual-compare\2026-06-18-state-map-v1` => `SPLIT_RENDERER_AXIS_CONFIRMED`, inlineBest `2`, sourceGeometryBest `1`.
- Evidence: Les-Oublies source rootDelta `+375.375px` improves to `-0.656px` with inline/text-input; YSHY source `-2.375px` improves to `-0.375px`; AW2E scroll-metrics source is already `+8.188px` and worsens to `+47.188px` with inline/text-input. Keep renderer HOLD until these axes are modeled separately.
# 2026-06-19 Renderer Patch-Family Drilldown

- Extended `scripts/roll20_renderer_blocker_matrix.mjs` to include scroll-metrics replacement evidence beside the default full-root candidate matrix.
- Latest `diagnose:roll20-renderer-blocker -- reports\roll20-actual-compare\2026-06-18-state-map-v1` explains the remaining HOLD: AW2E source-state already matches live scroll-metrics root/panel geometry tightly (`root +8.188px`, `11/11` panels, maxY `16.6px`, maxH `9.05px`), while Les-Oublies/YSHY still prefer `inline-block+text-input-height`.
- Conclusion: the remaining blocker is not solved by blindly shipping the Les/YSHY inline-flow/input-height candidate. Investigate it as a generic Roll20 input/inline-flow baseline axis while keeping AW2E on its source-state/selector-state path.
# 2026-06-19 Root Cutoff Superseded, Renderer Still HOLD

- Updated `scripts/roll20_renderer_action_gate.mjs` so a root-cutoff HIGH fixture is a blocker only when no qualified scroll-metrics replacement exists. AW2E now has a qualified scroll-metrics source replacement for renderer-candidate comparison: rootDelta `+8.188px`, panelY `+16.6px`, panelH `+0.2px`.
- Updated `scripts/roll20_actual_status.mjs` to report raw cutoff risk separately from unresolved cutoff risk. Latest status: `trustedFullRoot=3/3`, `reliableTrustedFullRoot=3/3`, `trustedFullRootCutoffRisk=1`, `trustedFullRootCutoffUnresolved=0`, `scrollMetricsReplacement=1`.
- Renderer still remains `HOLD_PRODUCTION_RENDERER_PATCH` and `rendererReady=NO`. The remaining blocker is real: reliable patch families still disagree across fixtures (`none` for AW2E, `inline-block+text-input-height` for Les-Oublies/YSHY). Do not promote renderer CSS until that cross-fixture mismatch is explained or resolved.
## 2026-06-19 Scroll Metrics Reliable Renderer Candidate

- Updated `scripts/roll20_renderer_action_gate.mjs` to use a scroll-metrics source candidate for reliable patch-family comparison when a cutoff-HIGH fixture has tight root/panel alignment.
- Latest AW2E scroll-metrics source candidate qualifies with rootDelta +8.188px, panelY +16.6px, and panelH +0.2px. The gate now compares AW2E as `none`, Les-Oublies as `inline-block+text-input-height`, and YSHY as `text-input-height`.
- Renderer remains HOLD. The reliable evidence shortage blocker is gone, but the remaining blocker is real cross-fixture patch-family disagreement plus the old AW2E stitched-root cutoff warning.
## 2026-06-19 Reliable Renderer Gate Patch-Family Comparison

- Updated `scripts/roll20_renderer_action_gate.mjs` so root-cutoff HIGH fixtures are excluded from reliable patch-family comparison.
- Latest gate now reports reliable cross-fixture renderer evidence `2/3` and warns that AW2E's old trusted full-root candidate result is excluded because root-cutoff risk is HIGH.
- Renderer remains HOLD. The next real blocker is AW2E authoritative full-root promotion/recapture, plus resolving the remaining Les/YSHY diagnostic patch-family disagreement.
## 2026-06-19 Reliable Full-Root Status Accounting

- Updated `scripts/roll20_actual_status.mjs` to read root-cutoff diagnostics and discount high-risk stitched roots from reliable renderer readiness.
- Latest status now reports `trustedFullRoot=3/3`, `reliableTrustedFullRoot=2/3`, and `trustedFullRootCutoffRisk=1` for the active Roll20 actual run.
- This is a reporting/guardrail fix: it prevents stale/cutoff root evidence from looking production-ready while AW2E still needs authoritative full-root promotion or recapture.
## 2026-06-19 Scroll Metrics Geometry Candidate Selection

- Adjusted `scripts/roll20_full_root_candidate_smoke.mjs` so target geometry reporting prefers `bestGeometryCandidate` before root-height-only candidates.
- Root-height candidate ties now break on geometry score before pixel mismatch. This prevents a visually lower-mismatch but geometrically worse attr-class candidate from controlling panel-drift reporting.
- Latest AW2E scroll-metrics gate warning now shows source rootDelta +8.188px, panelY +16.6px, panelH +0.2px, and chosen maxYDelta 16.6px. Renderer remains HOLD for the remaining pixel-best over-hide and stale trusted-stitch blockers.
## 2026-06-19 Roll20 Chrome Selector Scoping

- Implemented Roll20 chrome selector protection in `sanitizeRoll20SandboxCss(..., { prefixSelectors:false })`: wrapper selectors such as `.largedialog textarea` are scoped away from the dialog chrome instead of overriding Roll20 base CSS.
- `buildSheetParts()` now applies `roll20SandboxSanitize` the same way `buildSheetDoc()` does, and both PreviewMain Shadow parts and EditCanvas pass the toggle. This narrows preview/edit render-path drift.
- Latest AW2E scroll-metrics after the production sanitizer change: `sandbox-source-state` rootDelta +8.188px, statePanelYDelta +16.6px, statePanelHeightDelta +0.2px. Before the change, the comparable source path was rootDelta -189.5px with panelY -2349px and panelH -70.2px.
- Claim boundary: renderer gate remains HOLD and `rendererReady=NO`; the old 9168px trusted stitch vs 11788px sidecar blocker still exists, and pixel-best remains an over-hidden candidate. This is a verified cascade/scoping improvement, not Roll20 visual parity.
## 2026-06-19 AW2E Textarea Cascade Diagnostic

- Added diagnostic-only `textarea-height` and `text-input-textarea-height` candidates to `scripts/roll20_full_root_candidate_smoke.mjs`.
- Latest scroll-metrics run: AW2E actual 852x11788; prior root-closest `sandbox-text-input-280-source` rootDelta -185.5px; `sandbox-textarea-150-source` rootDelta -34.313px; `sandbox-text-input-280-textarea-150-source` rootDelta +17.688px.
- State panel evidence improved from right support panels being about -70.2px too short to +0.2px height delta, with 11/11 state panels compared and gate maxHeightDelta now 4px.
- Claim boundary: this confirms the textarea/base cascade axis as a likely root cause, but it is not yet a production renderer fix. Next step is to convert the diagnostic into a generic Roll20 CSS scoping/base behavior model and recheck all fixtures.
## 2026-06-19 AW2E Scroll Metrics State Panel Geometry

- Expanded full-root candidate diagnostics to normalize Roll20 root-container `visiblePanels` and collect local `statePanels` from candidate renders.
- Latest AW2E scroll-metrics diagnostic compares 11/11 actual state panels against the root-closest `sandbox-text-input-280-source` candidate. Left playbook panels are height-aligned within +0.2px, but local y is already about -119px to -126px early.
- Right-side support panels are materially too short: Stock/Custom Weapons are about -68px to -69px, and later Quarantine/Waterbearer boxes are about -276px. The cumulative local y drift reaches -2297px at the Marine/Food support panel.
- Claim boundary: diagnostic evidence only. The next renderer investigation should target right-column box/support-panel flow and sizing before any production CSS promotion.
## 2026-06-19 AW2E Scroll Metrics Candidate Comparison

- Added separate scroll-metrics candidate comparison mode through `diagnose:roll20-scroll-metrics-candidates`, writing to ignored `full-root-candidate-smoke-scroll-metrics` output so the default trusted renderer gate output is not overwritten.
- Latest AW2E diagnostic comparison uses actual 852x11788. Pixel best remains `sandbox-sheet-alias-playbook-hide-source` at 7.08%, but it is only 852x2532 with root delta -9256.125px, so it is over-hidden and not promotable.
- Root-height closest moved toward source/text-input candidates: `sandbox-text-input-280-source` is -185.5px, `normal-source-state` is -195.063px, and `sandbox-source-state` is -189.5px. This shows the previous first-13/9168px clue was affected by the older cutoff capture.
- Claim boundary: diagnostic evidence only; renderer remains HOLD and `rendererReady=NO`.
# 35. Agent Progress Log

Date: 2026-06-14

This file is for Codex, Claude, and future agents. Do not move this content into `README.md`; the README is reserved for the Korean portfolio/project overview.

## How To Use

- Read this after `AGENTS.md`, the working rules, TODO board, and gap matrix.
- Keep entries short, evidence-based, and scoped to what was actually verified.
- Update this when folder organization, agent handoff context, or the current next-task sequence changes.
- Use `docs/qa/31_active_todo.md` for task status. Use this file for narrative handoff notes.

## Current Source Of Truth

| Area | Current Source |
| --- | --- |
| Active repo/worktree | `web-push-main/` |
| User-facing project overview | `README.md` |
| Agent rules | `AGENTS.md` |
| Live TODO | `docs/qa/31_active_todo.md` |
| Requirement gaps | `docs/qa/34_requirements_gap_matrix.md` |
| Verification evidence | local ignored `reports/` outputs plus summarized TODO notes |
| Repeatable scripts | `scripts/` |






## 2026-06-19 YSHY Actual Roll20 Computed-Style Sidecar

- Used only the dedicated Roll20 Custom Sheet Sandbox campaign `21639681`; existing rooms were not modified.
- Standard Chrome file chooser still fails at `fileChooser.setFiles` with `Not allowed`, but the visible input probe proved the chooser path itself opens once inputs are made visible.
- Applied YSHY 1BU through the observed endpoint/settings-form fallback: `/sheetsandbox/savesheetsettings` accepted HTML/CSS/translation and the full `#settingsform` save accepted wrapped `customcharsheet_json`.
- Opened sandbox character `-OvSWvivVPTt2z_4goPF`; the actual Roll20 iframe rendered a live `.charactersheet` root at `850px` width with `1049` inputs, `808` roll buttons, `88` tables, `9` textareas, and `9` scripts.
- Saved ignored local sidecar `reports/roll20-actual-compare/2026-06-18-state-map-v1/live-iframe-probe/yshy-commission-1bu-computed-styles.json`.
- Latest diagnostics: `diagnose:roll20-computed-style-context => compared=3/3, missingActualStyle=0`, but still `DO_NOT_PROMOTE_DIRECTLY`; `status:roll20-actual => rendererReady=NO`, `rendererBlockers=2`.
- Claim boundary: this proves YSHY actual Roll20 iframe/style capture, not visual parity and not production renderer readiness.
## 2026-06-19 YSHY Sandbox Upload Automation Blocker

- Reclaimed the dedicated Roll20 Custom Sheet Sandbox editor/settings tabs only; no existing room was modified.
- Confirmed the settings page has only `customcharsheet_json`, while the editor page exposes `#sheetHtml`, `#sheetCss`, and `#sheetTranslation`.
- Attempted three upload automation paths for YSHY 1BU: generated snippet/DataTransfer dispatch, CDP `DOM.setFileInputFiles`, and visible label/file-chooser activation. None applied files: the snippet reported `no-file-on-input`, CDP file setting is unsupported in this extension surface, and the file chooser timed out.
- Latest diagnostics remain `diagnose:roll20-computed-style-context => compared=2/3, missingActualStyle=1` and `status:roll20-actual => rendererReady=NO`.
- Claim boundary: this is a real blocker record, not a Roll20 visual-parity result. Next P0 is enabling a working manual/alternate YSHY sandbox upload path, then capturing `live-iframe-probe/yshy-commission-1bu-computed-styles.json`.
## 2026-06-19 AW2E Computed-Style Sidecar Capture

- Claimed the dedicated `Codex Roll20 Verify | Roll20` editor tab in read-only mode; no existing room/settings were modified.
- CDP `Page.getFrameTree` found the generated character iframe at `/editor/character/21639681/-OvSWvivVPTt2z_4goPF/true?popout=false`; `Page.createIsolatedWorld` + `Runtime.evaluate` captured selected computed styles from inside the iframe.
- Saved ignored local sidecar `reports/roll20-actual-compare/2026-06-18-state-map-v1/live-iframe-probe/official-roll20-AW2E-computed-styles.json`.
- Rerunning `diagnose:roll20-computed-style-context` now compares `2/3` fixtures and reports `DO_NOT_PROMOTE_DIRECTLY`: AW2E still differs from local candidates (notably actual input height `27.6px` vs local best-style candidate `24px`), Les-Oublies still has row/column/table style/count differences, and YSHY still lacks an actual computed-style sidecar.

## 2026-06-19 Computed-Style Context Diagnostic

- Added `scripts/roll20_computed_style_context_diagnostics.mjs` and package script `diagnose:roll20-computed-style-context`.
- Latest active run status: `DO_NOT_PROMOTE_DIRECTLY`, compared `1/3`, missing actual computed-style sidecars for AW2E and YSHY.
- Les-Oublies best style candidate is `sandbox-inline-block-text-input-276-source`; input height is close, but row/column/table style and count differences remain. This supports the current rule: no inline-flow/input-height production CSS until the real Roll20 computed-style probe is refreshed for every fixture.
## 2026-06-19 Renderer Promotion-Risk Guard

- Added a `Promotion Risk` section to `scripts/roll20_renderer_blocker_matrix.mjs` so broad-help diagnostic CSS candidates are not mistaken for production renderer patches.
- Latest matrix now marks every current diagnostic patch family as `DO_NOT_PROMOTE_DIRECTLY` while the renderer action gate still has 2 blockers.
- `inline-block+text-input-height` helps Les-Oublies and YSHY, but it is not fixture-best everywhere and AW2E still has the trusted stitched-root vs live-sidecar root disagreement. Next evidence needed: actual Roll20 computed-style comparison for row/column/input/textarea context before any inline-flow CSS is promoted.
## 2026-06-19 Production Inline-Flow Experiment Rejected

- Temporarily added the current diagnostic inline-block/input-height CSS to the real preview/edit render path, then reran `smoke:roll20-full-root-candidates`, `gate:roll20-renderer-action`, and `diagnose:roll20-renderer-blocker`.
- Result: Les-Oublies and YSHY baseline moved into the previous best range, but the best candidates shifted to further word-spacing patches. AW2E still held the gate because of the root-cutoff/live-sidecar disagreement.
- The temporary CSS was removed and the ignored candidate/matrix reports were regenerated back to the normal production path.
- Decision: do not ship hardcoded inline-flow CSS yet. The next implementation needs stronger proof that the behavior comes from actual Roll20 wrapper/base context, not from fixture-specific pixel tuning.
## 2026-06-19 Targeted Renderer Experiment Boundary

- Reran `diagnose:roll20-renderer-blocker` after the 27px candidate smoke. The matrix now classifies the next action as `NEEDS_TARGETED_LOCAL_EXPERIMENT` rather than a direct production patch.
- `inline-block+text-input-height` helps Les-Oublies and YSHY and is neutral for AW2E in the current fixture set; `nowrap+text-input-height` shows a similar pattern.
- Production renderer CSS still stays on HOLD because AW2E has a live sidecar root disagreement and the actual best candidate families still differ.
- Next renderer work should prove whether the inline-block/input-height behavior comes from Roll20 wrapper/base context. Do not ship a hardcoded `word-spacing`, `white-space: nowrap`, or `input min-height` patch from the diagnostic matrix alone.
## 2026-06-19 Unified Input-Flow Candidate Probe

- Added diagnostic 27px input-flow candidates to `scripts/roll20_full_root_candidate_smoke.mjs`: `sandbox-inline-block-text-input-270-source` and `sandbox-nowrap-text-input-270-source`.
- Tightened full-root candidate tie-breaking so equal root-height candidates choose the lower pixel mismatch. This makes Les-Oublies and YSHY converge on the same diagnostic family instead of splitting between 27.6px and text-input-only variants.
- Latest active run: Les-Oublies best `sandbox-inline-block-text-input-270-source` at `3.76%` mismatch and rootDelta `-3.625px`; YSHY best `sandbox-inline-block-text-input-270-source` at `4.23%` and rootDelta `-0.375px`.
- AW2E remains the exception: trusted full-root pixel candidates still disagree, and reliable gate comparison uses the scroll-metrics source candidate because its geometry is tight (`rootDelta +8.188px`, panelY `+16.6px`, panelH `+0.2px`).
- Claim boundary: this is stronger evidence for a generic Roll20 inline-block/text-input-height axis, but production renderer CSS remains `HOLD_PRODUCTION_RENDERER_PATCH` and `rendererReady=NO`.

## 2026-06-14 Folder/Docs Review

- Parent folder contains many legacy and experiment copies; current development must stay in `web-push-main/`.
- Root `AGENTS.md` points agents to `web-push-main/AGENTS.md`; do not treat root-level `block-editor.html`, `viewer.html`, `PLAN.md`, or `HANDOFF.md` as current truth.
- `README.md` in `web-push-main/` is a Korean portfolio-style overview. Keep it visual-first and do not add verification tables, agent-only status logs, or private sheet details there.
- Agent progress and handoff notes belong in this file plus `docs/qa/31_active_todo.md`.
- Real Roll20/user sheet fixtures and generated reports are local-only. Do not commit them to the public repo.
- Folder guide exists at the parent level as `?�더 ?�내.md`; update it only when actual top-level folder roles change.

## Local Evidence Snapshot

| Scope | Evidence |
| --- | --- |
| Browser L2 roundtrip | Local ignored `reports/roundtrip-browser/`; limited fixture scope only. |
| Mapping fidelity | Local ignored `reports/mapping-fidelity/`; selected private fixture scope only. |
| Edit flow smoke | Local ignored `reports/edit-flow-smoke/`; gallery drop and container nesting smoke. |
| Standalone preview cascade | Local ignored `reports/cascade-leak/`; standalone `buildSheetDoc` scope only. |
| Live preview/edit Shadow DOM cascade | Local ignored `reports/live-shadow-cascade/`; selected fixture scope only. |

## Next Development Sequence

1. Local preview/edit screenshot baseline for a selected ignored fixture.
2. Roll20 Room View Check: observe existing solo rooms only; no edits.
3. Roll20 Custom Sheet Upload Check: use Custom Sheet Sandbox first, or a new test room if sandbox is insufficient.
4. Asset loading parity: classify or cache external image resources that return 403 in browser fixtures.
5. Layer panel explicit before/after/inside drop zones.
6. Absolute positioning inside frames/groups with a clear UX mode.
7. Worker JS separate workspace plan and first source-preserving implementation slice.
8. Create a copyright-safe synthetic public example before re-enabling the sample loader.

## 2026-06-18 Roll20 Actual Verification Setup

- Added `docs/operations/37_roll20_actual_verification.md` as the source of truth for solo-room observation, sandbox/test-room upload checks, and local-only evidence.
- Chrome Roll20 reachability was checked at `https://app.roll20.net/campaigns/search`; the page was reachable in a logged-in state.
- No existing Roll20 room was inspected in detail, edited, or modified.
- Created `scripts/roll20_actual_compare_manifest.mjs` to generate ignored local report scaffolds under `reports/roll20-actual-compare/`.

## 2026-06-18 Edit Drag Responsiveness Slice

- Fixed an edit-canvas rollback risk: Shadow DOM remount cleanup no longer cancels the delayed Blockly/CSS commit timer.
- On drag end, `EditCanvas` now patches the emitted HTML cache immediately so the preview/edit render path sees the dropped position before the heavier model commit catches up.
- Expanded `scripts/edit_flow_browser_smoke.mjs` to cover existing-object mouse drag, not only gallery drop.
- Latest local ignored smoke report: `reports/edit-flow-smoke/edit-flow-smoke-results.json` PASS. The moved section's computed position and emitted CSS rule both reported `left: 464px; top: 256px`.
- Scope note: this proves synthetic edit-flow behavior in the static app only. Imported real-sheet object drag and actual Roll20 visual parity remain unproven.

## 2026-06-18 Preview/Edit Visual Smoke Setup

- Added `scripts/preview_edit_visual_smoke.mjs` for local imported-fixture preview/edit screenshot comparison.
- The script imports ignored fixtures through `window.__perfHook.importSheet`, captures only `#charsheet-root` for preview and edit, then computes a browser-canvas pixel diff over the shared crop.
- Latest local ignored report: `reports/preview-edit-visual/preview-edit-visual-results.md` PASS as a diagnostic pipeline with 0 console/page errors.
- Removed persistent edit-only drop/container outlines from the normal Shadow DOM render. Drop affordances now appear while widget drag is active, so edit mode is less visually polluted at rest.
- Added coarse mismatch bounds/quadrants and widened the browser capture viewport to 2200x1200 for fairer preview/edit screenshot comparison.
- Current mismatch diagnostics after the outline fix: AW2E 25.51% (bounds 0,10 850x1070), Les-Oublies 0%/10 px, YSHY 1BU 4.03% (bounds 0,223 850x857). These numbers are not a parity gate yet; they identify the next visual-difference work.
- Added `window.__perfHook.setPreviewZoom` so visual smoke scripts can force 100% zoom and avoid fit-to-width artifacts.

## 2026-06-18 Shadow Font Alignment Slice

- Fixed a major preview/edit visual divergence source: Shadow DOM edit render now registers Roll20 glyph font faces at document level, so dice/pictos pseudo-elements can resolve without leaking Roll20 selector rules into the app document.
- The Shadow mount also extracts only user CSS `@import` and `@font-face` declarations from the sheet CSS chunk for document-level font registration. User selector rules remain scoped inside the Shadow render.
- `scripts/preview_edit_visual_smoke.mjs` now records roll-button computed diagnostics and edit-toolbar occlusion metrics. The toolbar is hidden only while taking root screenshots, while the original overlap is still reported separately.
- Latest local ignored report after `lint` and `build`: `reports/preview-edit-visual/preview-edit-visual-results.md` PASS with 0 console/page errors. Diagnostic mismatch: AW2E 4.96% (bounds 0,404 850x676), Les-Oublies 0%/10 px, YSHY 1BU 1.26% (bounds 0,17 851x1063). Roll button counts match preview/edit for all 3 fixtures.
- Scope note: this proves improved local preview/edit alignment only. Actual Roll20 sandbox/room visual comparison remains unverified.

## 2026-06-18 Roll20 Local Baseline Package Slice

- Added `scripts/roll20_actual_local_baseline.mjs` to prepare the local-only baseline required before Roll20 sandbox/test-room checks.
- The script imports ignored fixtures through the static app, captures local preview/edit screenshots, writes emitted `sheet.html`, `sheet.css`, `translation.json`, `sheet.json`, and creates `upload.zip` for Custom Sheet Sandbox/test-room use.
- Restored `data-testid="preview-iframe"` on `PreviewMain` so browser verification scripts can reliably target the iframe render path without visual UI changes.
- Latest local ignored report: `reports/roll20-actual-compare/2026-06-18-local-baseline-smoke/local-baseline-results.md` PASS for AW2E, Les-Oublies, and YSHY 1BU. All 3 generated payloads had no blocking export warnings and matching preview/edit roll button counts.
- Scope note: this is the local baseline/payload preparation step only. It does not prove actual Roll20 visual parity until the payload is applied in Custom Sheet Sandbox or a new test room and compared.

## 2026-06-18 Rolltemplate Chat Smoke Slice

- Added `scripts/rolltemplate_chat_smoke.mjs` for local preview iframe -> ChatPane rolltemplate smoke.
- The script imports ignored fixtures through the static app, chooses a real roll button, clicks it, and verifies that a visible chat card appears.
- Latest local ignored report: `reports/rolltemplate-chat-smoke/rolltemplate-chat-smoke-results.md` PASS for AW2E, Les-Oublies, and YSHY 1BU.
- Follow-up hardening removed the visible app-only `rolltemplate:name` helper line, constrains rolltemplate chat cards to 280px, and clears simulated chat between fixtures so screenshots/results cannot accidentally reuse a prior fixture's card.
- Current smoke checks each fixture has exactly 1 resulting chat card, `Debug label=no`, and rolltemplate card width 280px.
- Click-mode evidence: AW2E, Les-Oublies, and YSHY all use `user-click`.
- Les-Oublies was temporarily SKIP after the hidden-DOM click fallback was removed. Root cause was importer/emitter loss of `class="sheet-tabstoggle..."` on hidden inputs; preserving that class restored the Roll20 CSS default-tab selector and actionable roll buttons.
- Scope note: this proves the local app's roll button bridge, dice/rolltemplate parser path, and ChatPane render path for selected fixtures only. It does not prove actual Roll20 chat parity, worker parity, or all-sheet support.

## 2026-06-18 Hidden Input Class Preservation Slice

- Fixed `r20_hidden_input` import/export so hidden inputs preserve their `class` attribute as well as name, value, and style.
- This matters for Roll20 sheets that use hidden attribute controls as CSS state switches. Les-Oublies uses `.sheet-tabstoggle[value="combat"] ~ div.sheet-combat`; without the class, the emitted sheet kept the value but lost the selector anchor, leaving the default screen falsely empty.
- Latest local ignored validation after the fix:
  - `scripts/rolltemplate_chat_smoke.mjs`: AW2E, Les-Oublies, and YSHY 1BU PASS with user-click, exactly 1 chat card, 280px card width, and no debug label.
  - `scripts/browser_roundtrip_smoke.mjs`: 3/3 PASS.
  - `scripts/preview_edit_visual_smoke.mjs`: PASS with AW2E 4.96%, Les-Oublies 4.76%, YSHY 1BU 1.26%.
- Scope note: this is local import/render/chat evidence only. Actual Roll20 sandbox/test-room visual and chat parity remain unverified.

## 2026-06-18 Roll20 Actual Screenshot Diff Helper Slice

- Added `scripts/roll20_actual_screenshot_diff.mjs` so actual Roll20 screenshots can be compared against the local baseline run without committing private evidence.
- Expected local-only screenshot names are `roll20-sandbox.png`, `roll20-room.png`, and `roll20-chat.png` under each fixture's ignored `screenshots/` folder.
- Regenerated latest local baseline: `reports/roll20-actual-compare/2026-06-18-actual-diff-ready/local-baseline-results.md` PASS for AW2E, Les-Oublies, and YSHY 1BU.
- Ran the new diff helper against that run. Result: all actual Roll20 targets are SKIP because no sandbox/room/chat screenshots have been captured yet. This is correct and must not be reported as Roll20 parity.
- Scope note: the comparison pipeline is ready for captured evidence; authenticated Roll20 solo-room observation and Custom Sheet Sandbox/test-room upload remain TODO.

## 2026-06-18 Imported Edit Sync Slice

- Added `scripts/imported_edit_sync_smoke.mjs` for local static-app evidence that imported real-fixture nodes can move through the actual edit pointer path and sync back to preview plus emitted HTML/CSS position data.
- Fixed an imported edit desync source: `EditCanvas` now recognizes both raw design classes and Roll20-prefixed `sheet-r20-node-*` classes when deciding whether an optimistic drag move has been committed.
- Fixed a Shadow edit vs iframe preview layout difference caused by hotlink-sensitive sheet images: Shadow edit images now use `referrerPolicy="no-referrer"`, matching iframe `srcdoc` behavior for the tested assets.
- Shadow edit no longer adds an extra outer `body.charsheet`; the real `#charsheet-root.charsheet` from `buildSheetParts()` carries layer state, making the selector shape closer to iframe preview.
- Latest local ignored validation after `lint` and `build`:
  - `scripts/imported_edit_sync_smoke.mjs`: PASS for AW2E, Les-Oublies, and YSHY 1BU.
  - `scripts/preview_edit_visual_smoke.mjs`: PASS, diagnostic mismatch AW2E 4.96%, Les-Oublies 4.76%, YSHY 1BU 1.25%.
  - `scripts/edit_flow_browser_smoke.mjs`: PASS.
- Scope note: this is local preview/edit sync evidence only. Actual Roll20 room/sandbox visual and chat parity remain unverified.

## 2026-06-18 Roll20 Sandbox Reachability Slice

- Chrome Roll20 session was reachable and logged in.
- Created a new isolated Custom Sheet Sandbox for verification rather than modifying existing user sandboxes or real rooms.
- Launched the sandbox editor and confirmed the built-in `Sheet Sandbox Tools` dialog has separate file inputs for HTML, CSS, and Translation.
- Tried the first payload upload through the browser file chooser. Upload did not reach Roll20 because the Codex Chrome extension rejected local file access with `fileChooser.setFiles failed: Not allowed`.
- Local-only evidence is under ignored `reports/roll20-actual-compare/2026-06-18-actual-diff-ready/roll20-sandbox-observation/`.
- Next action: enable `Allow access to file URLs` for the Codex Chrome extension, then retry payload upload in the kept sandbox editor tab and capture actual Roll20 screenshots.
- Scope note: this proves actual Roll20 sandbox reachability and upload UI discovery only. It does not prove Roll20 visual parity.

## 2026-06-18 Imported Edit Re-import Stability Slice

- Hardened `scripts/imported_edit_sync_smoke.mjs` so the local imported edit smoke now checks the full edited emit -> re-import -> emit cycle after a real pointer drag.
- Candidate selection now prefers leaf-like editable nodes (`control`, `action`, `media`, `text`) over structural frame/flow/table containers, with penalties for nested block containers. This avoids false failures where the smoke repeatedly dragged large wrapper nodes that are visible but not the user's likely direct-edit target.
- Re-import CSS comparison is canonicalized for whitespace and the managed design-CSS marker while still recording raw CSS drift. Current raw drift is design CSS formatting around `r20-design-css:managed`; canonical selector/declaration content stays stable.
- Latest local ignored validation after `lint` and `build`: `scripts/imported_edit_sync_smoke.mjs` PASS for AW2E, Les-Oublies, and YSHY 1BU. Each fixture moved an imported `input`, matched edit/preview coordinates, emitted absolute position data, and re-imported stably.
- Console 403 resource errors remain on AW2E/YSHY external asset loads; there were no page errors. This is still local static-app evidence only, not actual Roll20 parity.

## 2026-06-18 Asset Referrer and Resource Diagnostics Slice

- Added `<meta name="referrer" content="no-referrer">` to the iframe preview document generated by `buildSheetDoc`.
- Added a Shadow edit document referrer policy helper in `mountSheetShadow()` so Shadow CSS/image requests use `no-referrer` as well as the existing per-`<img>` `referrerPolicy="no-referrer"`.
- `scripts/preview_edit_visual_smoke.mjs` now records HTTP/resource failures by status, resource type, host, and example URL. Latest local ignored report PASS: AW2E, Les-Oublies, and YSHY 1BU have 0 resource issues in the preview/edit screenshot path.
- `scripts/imported_edit_sync_smoke.mjs` now records the same resource diagnostics. Latest local ignored report PASS for movement/re-import stability, but still classifies external image failures during edit/reimport: AW2E 10, Les-Oublies 5, YSHY 23. Top hosts are `i.imgur.com`, `imgur.com`, and `raw.githubusercontent.com`.
- Scope note: resource failures are now visible and separated from cascade/edit-sync failures. This does not prove actual Roll20 asset parity; next work is to compare with Roll20 sandbox/test-room behavior and decide whether local verification should cache or rewrite these external assets.

## 2026-06-18 Layer Drop Zone Slice

- Added explicit layer-panel drag zones: row top = `before`, row middle = `inside` when the target can receive children, row bottom = `after`.
- Added `moveBlockAfter()` to the Blockly adapter for top-level layer ordering. `inside` still routes through `nestBlockInContainer()`.
- Layer rows now expose `data-testid="edit-layer-row"` and `data-r20-layer-drop-mode` while a layer drag is hovering, so browser smoke can verify the user's intended insertion mode instead of inferring it.
- Latest local ignored validation after `lint` and `build`: `scripts/edit_flow_browser_smoke.mjs` PASS. The smoke still covers background absolute drop, container flow nesting, existing-object drag, and now verifies frame-row hover modes `before,inside,after`.
- Scope note: this is the first layer-panel insertion slice. Nested sibling before/after reordering inside Blockly statement chains and canvas-side insertion indicators remain TODO.

## 2026-06-18 Nested Layer Reorder Slice

- Extended `moveBlockBefore()` and `moveBlockAfter()` so leaf children inside a Blockly statement chain can be reordered around sibling blocks. Top-level ordering behavior remains available as the fallback path.
- The implementation intentionally rejects moving a block that has a connected `nextConnection`; moving whole subtrees/stacks needs a separate safer UX and test slice.
- Expanded `scripts/edit_flow_browser_smoke.mjs`: after nesting two text inputs into a section, it uses the layer-row `before` drop path to move the second emitted input before the first and verifies the emitted HTML order changed.
- Latest local ignored validation after `lint` and `build`: `scripts/edit_flow_browser_smoke.mjs` PASS with 0 console/page errors.
- Scope note: this proves layer-panel sibling reorder for leaf flow children in the synthetic edit smoke. Imported-sheet layer reordering and canvas insertion indicators remain TODO.

## 2026-06-18 Canvas Drop Indicator Slice

- Canvas widget dragover now records the active container on the Shadow host with `data-r20-drop-target` and `data-r20-drop-mode="inside"`.
- The active target element also receives `data-r20-drop-mode="inside"` alongside `.r20-drop-target`; the Shadow CSS adds an inset highlight for the active inside drop.
- `scripts/edit_flow_browser_smoke.mjs` now captures `c2-drop-indicator.png` and verifies the dragover state before dropping: host dragging flag is set, host mode is `inside`, active target id matches the section, and active target mode is `inside`.
- Latest local ignored validation after `lint` and `build`: `scripts/edit_flow_browser_smoke.mjs` PASS with 0 console/page errors.
- Scope note: this proves canvas container-inside insertion feedback for friendly widget drag. Canvas before/after sibling insertion lines remain TODO.

## 2026-06-18 Canvas Sibling Insertion Slice

- Canvas widget dragover now distinguishes `inside` containers from leaf sibling targets. For non-container targets, the upper half is `before` and the lower half is `after`.
- Shadow edit affordance CSS now draws insertion lines for canvas `before` and `after` modes instead of only the green inside-container outline.
- `appendFriendlyWidgetPreset()` can create a new flow widget before or after a sibling via the Blockly adapter, stripping absolute positioning when the move succeeds.
- Expanded `scripts/edit_flow_browser_smoke.mjs`: after two text inputs are nested into a section, it verifies canvas `before` and `after` indicators on a nested input, drops a new text input on the `before` zone, and confirms the new block appears before the target in emitted HTML.
- Latest local ignored validation: `scripts/edit_flow_browser_smoke.mjs` PASS with 0 console/page errors; `canvasSiblingInsert.beforeIndicator.hostDropMode=before`, `afterIndicator.hostDropMode=after`, and emitted HTML index for the new input is before the target input.
- Scope note: this proves synthetic canvas sibling insertion for a leaf input target. Imported-sheet coverage, non-leaf subtree moves, and a separate committed `after` insertion test remain TODO/VERIFY.

## 2026-06-18 Canvas After Insertion Fix Slice

- Strengthened `scripts/edit_flow_browser_smoke.mjs` so canvas sibling insertion now commits both directions: one new input before the target and one new input after the same target.
- The stronger smoke exposed a real adapter bug: nested `moveBlockAfter()` failed when the target already had a next sibling because it treated the occupied target next-connection as a hard failure.
- Fixed `moveNestedBlockAfter()` to splice safely: disconnect `target -> oldNext`, connect `target -> moving`, then connect `moving -> oldNext`.
- Latest local ignored validation after the fix: `corepack pnpm run lint` PASS, `corepack pnpm run build` PASS, and `scripts/edit_flow_browser_smoke.mjs` PASS. Evidence includes `afterNewId` present and `afterNewIndexAfterEmit` greater than `targetIndexAfterAfterDrop`.
- Scope note: this proves synthetic leaf sibling after-insertion in the browser path. Imported-sheet layer reorder coverage and non-leaf subtree movement remain TODO/VERIFY.

## 2026-06-18 Imported Canvas Flow Insert Slice

- Expanded `scripts/imported_edit_sync_smoke.mjs` beyond imported drag sync: it now also tests friendly widget insertion into imported sheet geometry and records imported layer leaf reorder when a safe adjacent pair exists.
- Added `canNestInContainer()` to the Blockly adapter and wired edit Shadow role attributes/canvas drop target selection to the actual statement-slot check. This fixes misleading drop affordances where a node looked like a frame/flow container but could not actually accept child blocks.
- Added `window.__perfHook.getBlockGraph()` for local-only verification so smoke scripts can distinguish real Blockly chain relationships from DOM nodes that merely look like siblings.
- Important test adjustment: imported canvas insertion waits past the `lastClearedAt` creation guard and only drops after a dragover indicator exists, preventing false background absolute drops in dense imported layouts.
- Latest local ignored validation after `lint` and `build`:
  - `scripts/edit_flow_browser_smoke.mjs`: PASS.
  - `scripts/imported_edit_sync_smoke.mjs`: PASS for AW2E, Les-Oublies, and YSHY 1BU.
- Evidence: all 3 fixtures passed imported visible-node move sync, imported canvas insertion as non-absolute flow content, and edited emit -> re-import stability. Les-Oublies also passed imported layer leaf reorder; AW2E/YSHY recorded SKIP for that sub-check because no safe imported leaf sibling pair was found.
- Scope note: this is still local static-app evidence. Actual Roll20 sandbox/room parity, non-leaf subtree movement, and broader corpus coverage remain TODO/VERIFY.

## 2026-06-18 Non-Leaf Layer Reorder Slice

- Extended nested layer reordering so moving a block with a connected `nextConnection` uses Blockly stack healing first, then inserts only the selected block and its input/statement descendants at the requested before/after target.
- Added a guard against dropping a block relative to one of its own input/statement descendants, which would create an invalid cycle.
- Expanded `scripts/edit_flow_browser_smoke.mjs` with a copyright-safe synthetic import: `outer > group-a/input-a + group-b/input-b`. The smoke moves non-leaf `group-a` after `group-b` through the real layer-row drop path, then verifies emitted order changed and both child inputs stayed inside their original groups.
- Latest local ignored validation: `corepack pnpm run lint` PASS, `corepack pnpm run build` PASS, `scripts/edit_flow_browser_smoke.mjs` PASS, and `scripts/imported_edit_sync_smoke.mjs` PASS for the 3 prepared ignored fixtures.
- Scope note: this proves synthetic non-leaf group movement and keeps imported fixture edit-sync green. Imported real-sheet non-leaf layer reorder coverage remains VERIFY/TODO; actual Roll20 visual parity remains unverified.

## 2026-06-18 Absolute-Inside-Frame Smoke Slice

- Expanded `scripts/edit_flow_browser_smoke.mjs` with a copyright-safe synthetic frame/input import to lock down the "absolute positioning inside a frame" behavior requested for Figma-like editing.
- The smoke drags a child input inside its parent frame through the real pointer path. It verifies the parent frame gets a managed design CSS rule with `position: relative`, the child gets a managed design CSS rule with `position: absolute; left/top`, and emitted left/top matches the Shadow edit computed left/top.
- Latest local ignored validation: `corepack pnpm run lint` PASS, `corepack pnpm run build` PASS, and `scripts/edit_flow_browser_smoke.mjs` PASS.
- Scope note: this proves the synthetic edit path. It does not yet prove imported real-sheet absolute-inside-frame behavior or provide a user-facing mode selector for choosing flow vs absolute placement inside a frame.

## 2026-06-18 Free Placement Mode Slice

- Added a user-facing edit placement mode control with `?�름` and `?�유` choices. `?�름` keeps gallery drops as flow/nesting operations; `?�유` lets a drop inside a capable frame become a nested absolute child.
- `appendFriendlyWidgetPreset()` now accepts `absolute-in-container`, nests the new widget into the target frame, writes child `position:absolute; left/top`, and adds a parent `position:relative` fallback when needed.
- Expanded `scripts/edit_flow_browser_smoke.mjs` with a copyright-safe synthetic free-placement import. The smoke clicks `?�유`, drops a gallery text input into a frame, and verifies the emitted HTML nests the input inside the frame with matching computed/emitted absolute coordinates.
- Latest local ignored validation: `corepack pnpm run lint` PASS, `corepack pnpm run build` PASS, and `scripts/edit_flow_browser_smoke.mjs` PASS.
- Scope note: this proves the user-facing synthetic free-placement path only. Imported real-sheet frame placement, UX screenshots, and actual Roll20 visual parity remain unverified.

## 2026-06-18 Imported Free Placement Smoke Slice

- Expanded `scripts/imported_edit_sync_smoke.mjs` so imported real-fixture edit sync now covers both placement modes:
  flow mode drops a friendly widget into an imported frame/flow target as non-absolute content, and free mode drops a second widget into an imported frame/flow target as nested absolute content.
- The free-placement smoke clicks the real `free` placement control, sends real `dragover`/`drop` events, and verifies parent/child structure plus computed/emitted positioning.
- Latest local ignored validation: `scripts/imported_edit_sync_smoke.mjs` PASS for the 3 prepared ignored fixtures. Free insert evidence is stored only in the ignored report; all checked fixtures had parent `relative`, input `absolute`, and matching emitted/computed coordinates.
- Scope note: this is still local static-app evidence. It strengthens imported-sheet edit UX coverage, but actual Roll20 sandbox/test-room visual parity and chat parity remain unverified.

## 2026-06-18 Worker Workspace Split Slice

- Added a fourth Blockly workspace key, `worker`, so sheet worker JS no longer has to remain in the visual HTML workspace after import.
- Import paths now move imported top-level sheet worker blocks from `html` to `worker`; final emit merges the worker body back into `sheet.html` as a single `<script type="text/worker">`.
- Autosave/restore, code tabs, status/counts, and `window.__perfHook` now include the worker workspace.
- Added `scripts/worker_workspace_smoke.mjs` and package alias `corepack pnpm run smoke:worker`.
- Latest validation: `corepack pnpm run lint` PASS, `corepack pnpm run build` PASS, `corepack pnpm run smoke:worker` PASS, and `scripts/imported_edit_sync_smoke.mjs` PASS for the 3 prepared ignored fixtures.
- Scope note: this is a source-preserving workspace split and local static-app smoke. It is not a claim that worker JS block coding is complete or that actual Roll20 worker behavior is parity-verified.

## 2026-06-18 Worker Roundtrip Guard Slice

- Strengthened `scripts/browser_roundtrip_smoke.mjs` so L2 browser roundtrip now checks `worker` raw body equality, worker block-count stability, worker body length, and emitted worker script count in addition to HTML/CSS/i18n stability.
- Latest local ignored validation: `node scripts/browser_roundtrip_smoke.mjs --out-dir ./out --base-path /roll20-block-editor --report-dir reports/roundtrip-browser` PASS for AW2E, Les-Oublies, and YSHY 1BU.
- Scope note: this catches worker split drift in the local app bundle, but still does not prove actual Roll20 worker runtime parity.

## 2026-06-18 Worker Source Preservation Audit/Fix Slice

- Added `scripts/worker_source_audit.mjs` and package alias `corepack pnpm run audit:worker`.
- Fixed worker extraction for nested/raw `<script type="text/worker">` cases. Import now rebuilds the worker workspace directly from source worker script bodies, strips those scripts from visual HTML blocks, and final emit appends one Roll20 worker script so worker code is not displayed on the sheet canvas or duplicated on re-import.
- Important scope: the emitted Roll20 sheet may canonicalize multiple source worker scripts into one final `<script type="text/worker">`; block counts are diagnostics, while exact worker source-body preservation is the gate for this slice.
- Latest local ignored validation:
  - `corepack pnpm run audit:worker -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/worker-source-audit`: PASS for AW2E, Les-Oublies, and YSHY 1BU with exact worker bodies.
  - `node scripts/browser_roundtrip_smoke.mjs --out-dir ./out --base-path /roll20-block-editor --report-dir reports/roundtrip-browser`: PASS for the same 3 fixtures.
  - `corepack pnpm run smoke:worker -- --out-dir ./out --base-path /roll20-block-editor --report-dir reports/worker-workspace-smoke`: PASS.
  - `node scripts/imported_edit_sync_smoke.mjs --out-dir ./out --base-path /roll20-block-editor --report-dir reports/imported-edit-sync`: PASS.
- Scope note: this is local import/export preservation evidence. It does not prove actual Roll20 sandbox/test-room worker runtime parity or JS block-coding UX completeness.

## 2026-06-18 Roll20 Payload Hygiene Slice

- Added `lib/export/payload.ts` as the final Roll20 export boundary cleanup. Preview/edit still keep `data-r20-block-id` for selection and drag sync, but zip export strips those internal IDs from `sheet.html`.
- Export now converts internal `<!-- i18n[lang] "key": "value" -->` comment output into valid Roll20 `translation.json` object payloads. This fixed a real pre-upload defect caught by the new audit: AW2E and YSHY were previously writing non-JSON translation files.
- Added `scripts/roll20_payload_audit.mjs` and package alias `corepack pnpm run audit:payload`.
- Updated `scripts/roll20_actual_local_baseline.mjs` so generated Sandbox payload files and `upload.zip` use the same internal-id stripping and translation normalization.
- Latest local ignored validation after `lint` and `build`:
  - `node scripts/roll20_actual_local_baseline.mjs --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/roll20-actual-compare --run-label 2026-06-18-payload-clean-v2`: PASS for AW2E, Les-Oublies, and YSHY 1BU.
  - `corepack pnpm run audit:payload -- reports/roll20-actual-compare/2026-06-18-payload-clean-v2`: PASS for the same 3 fixtures with 0 issues.
- Scope note: this proves local upload payload hygiene only. Actual Roll20 sandbox/test-room upload and screenshot/chat parity remain unverified until Chrome file upload access is enabled.

## 2026-06-18 Roll20 Payload Roundtrip Visual Slice

- Added `scripts/roll20_payload_roundtrip_visual_smoke.mjs` and package alias `corepack pnpm run smoke:payload-roundtrip`.
- The smoke re-imports the exact cleaned Roll20 payload files from `reports/roll20-actual-compare/<run>/local-baseline/<fixture>/payload/`, captures a preview screenshot, and compares it against the local baseline preview screenshot.
- The first strict top-left diff flagged AW2E and YSHY due to tiny screenshot alignment/width differences, so the helper now records a small-offset crop-normalized best match. This keeps the check useful for real payload drift without failing on a one-pixel capture offset.
- The first post-build smoke still failed AW2E after offset normalization. Root cause was CSS pseudo-class loss: imported selectors such as `.sheet-lock:not(:checked)` were emitted as `.lock:hover(:checked)` because the CSS pseudo block dropdown did not allow `not`. Expanded the pseudo-class allowlist to include common Roll20/official-sheet selectors (`not`, child/type position pseudos, validity/state pseudos).
- Latest local ignored validation:
  - `node scripts/roll20_actual_local_baseline.mjs --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/roll20-actual-compare --run-label 2026-06-18-pseudo-fix-v1`: PASS for AW2E, Les-Oublies, and YSHY 1BU.
  - `corepack pnpm run audit:payload -- reports/roll20-actual-compare/2026-06-18-pseudo-fix-v1`: PASS for all 3 fixtures with 0 issues.
  - `corepack pnpm run smoke:payload-roundtrip -- reports/roll20-actual-compare/2026-06-18-pseudo-fix-v1 --out-dir ./out --base-path /roll20-block-editor`: PASS for AW2E, Les-Oublies, and YSHY 1BU with 0% cleaned-payload preview mismatch and no visible script/rolltemplate runtime nodes.
- Scope note: this proves cleaned upload payloads still roundtrip visually inside the local static app. It still does not prove actual Roll20 sandbox/test-room visual parity.

## 2026-06-18 Legacy Export Audit Slice

- Added `scripts/roll20_legacy_export_audit.mjs` and package alias `corepack pnpm run audit:legacy-export`.
- The audit uses only synthetic CSS. It checks that modern CSS keeps modern declarations in the source, legacy export CSS rewrites/removes legacy-risk declarations through `sanitizeForRoll20Legacy`, warnings are emitted, and `ExportDialog` gates sanitizer routing plus `sanitize-warnings.json` behind legacy mode.
- Latest local ignored validation: `corepack pnpm run lint` PASS, `corepack pnpm run build` PASS, and `corepack pnpm run audit:legacy-export -- --report-dir reports/legacy-export-audit` PASS with 10 sanitizer warnings from the synthetic fixture.
- Scope note: this is an export-path sanitizer/routing gate. It does not prove preview-level legacy visual differences or actual Roll20 legacy sandbox/test-room parity.

## 2026-06-18 Roll20 Sandbox Upload Recheck + Legacy Preview Toggle Slice

- Rechecked the existing Chrome Roll20 verification tab. The Custom Sheet Sandbox dialog is open and exposes visible HTML/CSS/Translation upload labels backed by `#sheetHtml`, `#sheetCss`, and `#sheetTranslation`.
- A visible HTML label upload attempt for the YSHY local payload still failed at `fileChooser.setFiles` with `Not allowed`. This confirms the remaining actual Roll20 upload blocker is Chrome extension file URL access, not a missing sandbox control.
- Added `legacyCssSanitize` to the preview store and wired it through both local render paths: `buildSheetDoc` for iframe preview and `buildSheetParts` for Shadow/edit preview.
- Added the toolbar `구버??CSS` toggle (`data-testid="preview-legacy-css-toggle"`) so users can compare modern/original CSS preview against legacy Roll20 CSS sanitize locally before export.
- Added `scripts/roll20_legacy_preview_smoke.mjs` and package alias `corepack pnpm run smoke:legacy-preview`.
- Latest local ignored validation: `corepack pnpm run smoke:legacy-preview -- --report-dir reports/legacy-preview-smoke` PASS. It proves iframe and Shadow/edit user CSS chunks both preserve modern CSS when OFF and route through `sanitizeForRoll20Legacy` when ON.
- Scope note: this is local preview/edit option plumbing and synthetic CSS proof. It does not prove actual Roll20 legacy visual parity; that still needs Sandbox/test-room upload and screenshots after Chrome file upload is enabled.

## 2026-06-18 Imported Legacy Fixture Visual Smoke Slice

- Added `window.__perfHook.setLegacyCssSanitize()` so browser verification scripts can toggle preview legacy mode without relying on localized toolbar text.
- Added `scripts/roll20_legacy_fixture_visual_smoke.mjs` and package alias `corepack pnpm run smoke:legacy-fixture-visual`.
- The smoke imports ignored fixtures through the static app, captures preview iframe screenshots with legacy CSS sanitize OFF and ON, reads the final `#r20-user` CSS chunk, and checks that legacy-risk declarations are reduced when present.
- Latest local ignored validation after `lint` and `build`: `corepack pnpm run smoke:legacy-fixture-visual -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/legacy-fixture-visual` PASS for AW2E, Les-Oublies, and YSHY 1BU.
- Fixture result summary: Les-Oublies reduced legacy-risk CSS `1 -> 0`; AW2E and YSHY 1BU were classified `no-risk-css`. All three had 0 console errors, 0 page errors, 0 resource issues, no visible script/rolltemplate runtime nodes, and 0% modern-vs-legacy screenshot mismatch for the tested preview state.
- Scope note: this proves local imported-fixture preview toggle behavior only. Actual Roll20 legacy sandbox/test-room parity remains unverified until the Sandbox upload blocker is resolved and actual screenshots are captured.

## 2026-06-18 Automated Reference Diff Runner Slice

- Rechecked the kept Roll20 Custom Sheet Sandbox tab. File inputs still exist as `#sheetHtml`, `#sheetCss`, and `#sheetTranslation`; a hidden input click timed out, and a visible-label upload retry did not complete through the Chrome automation channel. Do not claim actual Roll20 upload/parity from this.
- Improved `scripts/make_visual_diff_pages.mjs`: generated diff pages now embed local reference/capture images as data URLs to avoid canvas taint, and compare native plus scaled reference candidates with 2D capture-crop search.
- Added `scripts/run_visual_fixture_diff_pages.mjs` and package alias `corepack pnpm run diff:visual-fixtures` so visual reference diff pages are executed in headless Chromium and summarized automatically.
- Latest local ignored validation: `corepack pnpm run diff:visual-fixtures` PASS. It generated 2 diff pages and collected JSON/Markdown with 0 console/page errors. Best diagnostics: AW2E 18.33% mismatch at crop `0,200,838,761`; Les-Oublies 13.51% at crop `10,544,824,799`.
- Scope note: this strengthens local reference-image diagnostics and crop normalization, but it is still not a Roll20 visual parity gate. Remaining mismatch needs classification by default state, viewport/reference crop, assets, wrapper/context, and CSS.

## 2026-06-18 Reference Diff Classification Slice

- Extended the generated visual diff JSON with mismatch bounds, quadrant counts, edge/center bands, dominant area, and crop-improvement ratio.
- Updated the headless runner Markdown to include a heuristic classification column. Latest PASS still reports AW2E 18.33% and Les-Oublies 13.51% with 0 console/page errors.
- Current classification: AW2E is `crop/state offset likely; large visual/style/default-state delta`; Les-Oublies is `crop does not explain most mismatch; medium delta`. These are triage hints, not parity claims.
- Next action: use the classification to inspect fixture default state/reference crop before changing rendering code.

## Reporting Guardrails

- Do not claim Roll20 visual parity yet.
- Do not claim all-sheet support yet.
- Do not collapse standalone preview evidence into live edit-mode evidence.
- Do not call auto-prefix real legacy sanitize.
- Do not edit protected external source corpus folders.

## 2026-06-18 Roll20 Evidence Guard Slice

- Added `scripts/roll20_actual_evidence_guard.mjs` and package alias `corepack pnpm run guard:roll20-evidence`.
- The guard checks the active git root, `.gitignore`, `.githooks/pre-commit`, tracked files, and staged files so local fixtures, generated reports, private screenshots, and public example folders do not leak into commits.
- When given a `reports/roll20-actual-compare/<label>` run folder, it also checks that local baseline, payload hygiene audit, and cleaned-payload visual roundtrip outputs exist and have no `FAIL` marker before any Roll20 sandbox/test-room upload attempt.
- Scope note: this is a safety/checklist gate only. It does not upload to Roll20 and does not prove Roll20 visual parity.

## 2026-06-18 Visual Diff Cause Classifier Slice

- Added `scripts/classify_visual_fixture_diffs.mjs` and package alias `corepack pnpm run classify:visual-fixtures`.
- `corepack pnpm run diff:visual-fixtures` now runs the classifier after generating browser diff results, writing ignored `reports/visual-fixture-diff/visual-fixture-diff-classification.md/.json`.
- The classifier combines visual diff metrics with copied fixture HTML/CSS/i18n source signals: hidden/checkbox/radio controls, `:checked`, `[value]`, sibling selectors, URL/background usage, media queries, absolute positioning, and translation hints.
- Latest local ignored classification after the integrated diff run: AW2E remains a crop/default-state-first investigation; Les-Oublies is not mostly explained by crop and should start with hidden/value selector default state plus non-crop visual delta.
- Scope note: this is local reference-image triage only. It does not prove Roll20 visual parity and should guide what to inspect in the Roll20 sandbox/solo-room screenshots.

## 2026-06-18 State Selector Audit Slice

- Added `scripts/roll20_state_selector_audit.mjs` and package alias `corepack pnpm run audit:state-selectors`.
- The audit checks Roll20 CSS default-state anchors such as hidden inputs, `:checked`, `[value]`, and sibling selectors against source HTML controls and generated Roll20 upload payload controls.
- It treats source-only dead/worker-driven selectors as diagnostics, but fails if export payloads introduce new missing-anchor regressions.
- Latest local ignored validation: AW2E, Les-Oublies, and YSHY 1BU PASS against `reports/roll20-actual-compare/2026-06-18-pseudo-fix-v1`; YSHY still records 7 source-only selector anchors that need actual Roll20/worker-state observation, but payload introduced 0 new state-anchor regressions.
- Scope note: this is semantic default-state preservation evidence only. It does not prove actual Roll20 visual parity.

## 2026-06-18 Roll20 Upload Handoff Slice

- Reclaimed the kept `Codex Roll20 Verify | Roll20` Chrome tab and confirmed the Custom Sheet Sandbox file inputs still exist: `#sheetHtml`, `#sheetCss`, and `#sheetTranslation`.
- Retried official Les-Oublies payload upload through the visible `label.btn.html` control. It still failed at `fileChooser.setFiles` with `Not allowed`, confirming the blocker is Chrome extension local file access rather than missing Roll20 controls.
- Added `scripts/roll20_upload_handoff.mjs` and package alias `corepack pnpm run handoff:roll20-upload`.
- Generated an ignored handoff checklist for `official-roll20-Les-Oublies` under `reports/roll20-actual-compare/2026-06-18-pseudo-fix-v1/roll20-upload-handoff/`, listing payload files, screenshot destinations, and the diff command.
- Scope note: this does not prove Roll20 visual parity. It keeps the actual upload path ready once Chrome allows file URL access for the Codex extension.

## 2026-06-18 Asset Resource Audit Slice

- Added `scripts/roll20_asset_resource_audit.mjs` and package alias `corepack pnpm run audit:assets`.
- The audit extracts asset references from copied fixture source HTML/CSS and generated Roll20 payload HTML/CSS, probes HTTP(S) resources with no referrer, and records missing local relative refs.
- Latest local ignored validation against `reports/roll20-actual-compare/2026-06-18-pseudo-fix-v1`: AW2E, Les-Oublies, and YSHY 1BU PASS with 0 failed HTTP probes, 0 missing local relative refs, and 0 payload-introduced asset regressions.
- Scope note: this proves local source/payload asset URL reachability only. It does not prove Roll20 sandbox/test-room asset rendering until actual upload screenshots exist.

## 2026-06-18 Roll20 Pre-upload Gate Slice

- Added `scripts/roll20_preupload_verification.mjs` and package alias `corepack pnpm run verify:roll20-preupload`.
- The gate runs payload hygiene, cleaned-payload visual roundtrip, default-state selector audit, asset/resource audit, and local evidence guard in order, then writes an ignored `preupload-verification-results.md/.json` under the actual-compare run folder.
- Latest local ignored validation for `reports/roll20-actual-compare/2026-06-18-pseudo-fix-v1` PASS. This means the 3 prepared payloads are locally upload-ready; it still does not prove Roll20 visual parity because actual sandbox screenshots are missing.

## 2026-06-18 Export Dialog Roll20 Readiness UI Slice

- Added a user-facing `Roll20 ?�로??준�??�태` section to `components/editor/ExportDialog.tsx`.
- The dialog now separates local zip composition readiness (`sheet.html`, `sheet.css`, `translation.json`, `sheet.json + README`) from actual Roll20 verification, which remains pending until a Custom Sheet Sandbox or new test room upload screenshot exists.
- The section explicitly tells users to compare legacy sanitize ON/OFF zips in Sandbox for old sheets, and keeps existing real rooms observation-only.
- Latest local validation:
  - `corepack pnpm run lint`: PASS.
  - `corepack pnpm run build`: PASS.
  - `corepack pnpm run guard:roll20-evidence reports\roll20-actual-compare\2026-06-18-pseudo-fix-v1`: PASS.
- Follow-up root cause: the first browser check used the dev server/static server with the wrong production `basePath`, so the page rendered HTML but client events were not a valid signal.
- Added stable header action selectors and `scripts/export_dialog_browser_smoke.mjs` with package alias `corepack pnpm run smoke:export-dialog`.
- Latest static-app validation: `corepack pnpm run smoke:export-dialog -- --out-dir ./out --base-path /roll20-block-editor --report-dir reports/export-dialog-smoke` PASS. It opens the export dialog, confirms 5 readiness items, confirms the `?�제 검�??�요` badge, opens the import dialog, and verifies main mode tab clicks with 0 console/page errors.
- Scope note: this improves user-facing status clarity only. It does not upload to Roll20 and does not prove Roll20 visual parity.

## 2026-06-18 Roll20 Upload Recheck + Visual State Detail Slice

- Rechecked the kept `Codex Roll20 Verify | Roll20` Chrome tab again. The Custom Sheet Sandbox still exposes `#sheetHtml`, `#sheetCss`, and `#sheetTranslation`.
- A hidden input file chooser route did not produce a usable chooser. A visible `label.btn.html` upload attempt for the official Les-Oublies cleaned payload did reach the file chooser path but failed at `fileChooser.setFiles` with `Not allowed`.
- Current actual Roll20 blocker remains Chrome extension local file access, not missing Roll20 controls. Keep the actual-screen TODO open until Sandbox/test-room screenshots exist.
- Enhanced `scripts/classify_visual_fixture_diffs.mjs` so `corepack pnpm run diff:visual-fixtures` now emits state selector samples, input/default samples, and reference/capture dimension clues in `reports/visual-fixture-diff/visual-fixture-diff-classification.md`.
- Latest local ignored validation: `corepack pnpm run diff:visual-fixtures` PASS with 0 console/page errors. AW2E remains 18.33% best mismatch with reference/capture `1240x761 -> 838x1377`, bestCropY `200`; Les-Oublies remains 13.51% with `824x799 -> 838x1491`, bestCropY `544`.
- Actionable next clues: AW2E starts with crop/default-state alignment; Les-Oublies starts with `.sheet-tabstoggle[value=...] ~ ...` selectors and hidden `attr_sheetTabForBtn` / `attr_sheetTab` defaults.
- Scope note: this is local reference-image triage. It does not prove actual Roll20 visual parity.

## 2026-06-18 Worker State Selector Runtime Slice

- Fixed the preview iframe sheet-worker simulator so `setAttrs` updates CSS-visible DOM attributes, not only DOM properties: text/hidden inputs now update `value`, and checkbox/radio inputs now update/remove `checked`.
- This matters for Roll20 sheets that use state selectors such as `.sheet-tabstoggle[value="combat"] ~ div.sheet-combat`; property-only updates do not make browser CSS attribute selectors recalculate.
- Added `scripts/sheet_worker_state_smoke.mjs` and package alias `corepack pnpm run smoke:worker-state`.
- Latest local validation:
  - `corepack pnpm run build`: PASS.
  - `corepack pnpm run smoke:worker-state -- --out-dir ./out --base-path /roll20-block-editor --report-dir reports/sheet-worker-state-smoke`: PASS. Initial combat state, action-click character state, and action-click combat state all updated both input property and input attribute, with the expected visible panel.
  - `corepack pnpm run lint`: PASS.
  - `corepack pnpm run diff:visual-fixtures`: PASS, unchanged diagnostics AW2E 18.33% and Les-Oublies 13.51%.
  - `node scripts/rolltemplate_chat_smoke.mjs --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/rolltemplate-chat-smoke`: PASS for AW2E, Les-Oublies, and YSHY.
- Scope note: this proves the local preview iframe worker/CSS-state path. Actual Roll20 sandbox/test-room parity remains unverified until upload screenshots exist.

## 2026-06-18 Raw Worker Hydration Warning Cleanup Slice

- The first worker-state smoke exposed a Blockly warning: `Ignoring non-existent input CHILDREN in block r20_raw_worker`.
- Root cause: importer-side worker parsing could attach parsed worker blocks under `r20_raw_worker.CHILDREN`, but `r20_raw_worker` was primarily the raw source preservation block. Some parsed worker descendants are reporter-shaped, so forcing them into a statement input can break Blockly XML hydration.
- Kept `r20_raw_worker` capable of holding manual worker children, but stopped automatic parsed-child insertion during HTML import. The importer still records parsed worker stats and preserves the original worker source body in the JS field.
- Latest local validation:
  - `corepack pnpm run build`: PASS.
  - `corepack pnpm run smoke:worker-state -- --out-dir ./out --base-path /roll20-block-editor --report-dir reports/sheet-worker-state-smoke`: PASS with 0 console/page errors.
  - `corepack pnpm run audit:worker -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/worker-source-audit`: PASS, exact worker source preserved for AW2E, Les-Oublies, and YSHY.
  - `node scripts/rolltemplate_chat_smoke.mjs --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/rolltemplate-chat-smoke`: PASS.
  - `corepack pnpm run lint`: PASS.
- Scope note: this removes local runtime noise and keeps source fidelity. It does not complete future worker block-coding UX or actual Roll20 runtime parity.

## 2026-06-18 Visual State Candidate Slice

- Added `scripts/visual_state_candidate_smoke.mjs` and package alias `corepack pnpm run smoke:visual-state-candidates`.
- The smoke imports ignored visual fixtures through the static app, captures the initial preview iframe sheet root, then clicks visible `button[type="action"]` candidates one by one and compares each resulting screenshot against the copied reference image.
- Latest local ignored validation: `corepack pnpm run smoke:visual-state-candidates -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/visual-state-candidates` PASS with 0 console/page errors.
- Result summary: AW2E exposed only the initial visible state and stayed around `18%` mismatch. Les-Oublies improved from live initial combat `11.51%` to `8.84%` after `act_fullsheet`, with hidden state hints `attr_sheetTabForBtn=fullsheet` and `attr_sheetTab=fullsheet`.
- Existing `corepack pnpm run diff:visual-fixtures` still reports Les-Oublies `13.51%` because that command compares the older rendered screenshot path, not the new live action-state candidate captures. Keep those scopes separate.
- Scope note: this identifies likely reference tab/default state. It does not prove actual Roll20 visual parity; next useful step is wiring discovered state metadata into the main baseline/diff flow and comparing against actual Roll20 Sandbox screenshots once upload is unblocked.

## 2026-06-18 Visual State Map Reuse Slice

- `scripts/visual_state_candidate_smoke.mjs` now writes compact ignored state-map artifacts: `visual-state-candidates-state-map.json` and `.md`.
- `scripts/classify_visual_fixture_diffs.mjs` now reads that state map from sibling `reports/visual-state-candidates/` when available, adds a `State hint` column, and changes `Next action` for fixtures whose reference image is likely not the initial state.
- Latest local validation:
  - `corepack pnpm run smoke:visual-state-candidates -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/visual-state-candidates`: PASS.
  - `corepack pnpm run diff:visual-fixtures`: PASS. The classification report now tells agents to re-run Les-Oublies in `act_fullsheet` before renderer changes, with local candidate mismatch `8.84%`.
  - `corepack pnpm run lint`: PASS.
- Scope note: state-map reuse improves triage continuity only. It does not yet make the main baseline capture switch tabs automatically, and it is still not actual Roll20 parity evidence.

## 2026-06-18 Local Baseline State-Map Capture Slice

- Extended `scripts/roll20_actual_local_baseline.mjs` with optional `--state-map reports/visual-state-candidates/visual-state-candidates-state-map.json`.
- When supplied, the baseline script applies a discovered local preview action-state candidate before taking `local-preview.png`, and records `initial`, `APPLIED`, or `SKIP` plus hidden attr before/after state in the ignored local baseline report.
- Export payload files, `upload.zip`, and the edit screenshot remain source-derived; the state hint only affects the local preview screenshot capture state.
- Latest local validation:
  - `node --check scripts\roll20_actual_local_baseline.mjs`: PASS.
  - `node scripts\roll20_actual_local_baseline.mjs --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/roll20-actual-compare --run-label 2026-06-18-state-map-v1 --state-map reports/visual-state-candidates/visual-state-candidates-state-map.json`: PASS for AW2E, Les-Oublies, and YSHY 1BU. Les-Oublies recorded `act_fullsheet APPLIED (sheetTabForBtn=fullsheet, sheetTab=fullsheet)`.
  - `corepack pnpm run guard:roll20-evidence`: PASS for commit-boundary checks.
  - `corepack pnpm run lint`: PASS.
  - `corepack pnpm run build`: PASS.
- Run-folder evidence guard for `2026-06-18-state-map-v1` is not upload-ready yet because payload hygiene audit and cleaned-payload roundtrip were intentionally not generated for that new run.
- Scope note: this prepares better local baseline evidence for reference-state comparison. It does not prove actual Roll20 visual parity and still requires Custom Sheet Sandbox/test-room screenshots after the Chrome file-access blocker is resolved.

## 2026-06-18 State-Map Pre-upload Gate Slice

- Extended `scripts/roll20_payload_roundtrip_visual_smoke.mjs` with optional `--state-map`, matching the local baseline script. The cleaned-payload re-import screenshot now applies the same local preview action-state hint before diffing against `local-preview.png`.
- Extended `scripts/roll20_preupload_verification.mjs` so `--state-map` is forwarded to the cleaned-payload visual roundtrip check.
- Latest local ignored validation:
  - `corepack pnpm run verify:roll20-preupload -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --fixtures test-fixtures\visual --out-dir ./out --base-path /roll20-block-editor --state-map reports\visual-state-candidates\visual-state-candidates-state-map.json`: PASS.
  - Payload roundtrip recorded 0% mismatch for AW2E, Les-Oublies, and YSHY 1BU; Les-Oublies recorded `act_fullsheet APPLIED (sheetTabForBtn=fullsheet, sheetTab=fullsheet)`.
  - Payload roundtrip also recorded 0 visible runtime nodes, 0 console/page errors, and 0 resource issues.
- Scope note: this makes `2026-06-18-state-map-v1` locally upload-ready. It still does not prove actual Roll20 visual parity; the next step is Roll20 Custom Sheet Sandbox upload and actual screenshots once Chrome file URL access is available.

## 2026-06-18 Roll20 Upload Retry + Handoff Hardening Slice

- Reclaimed the kept `Codex Roll20 Verify | Roll20` Chrome tab and confirmed the Custom Sheet Sandbox still exposes `#sheetHtml`, `#sheetCss`, and `#sheetTranslation`.
- Retried uploading `official-roll20-Les-Oublies` from `2026-06-18-state-map-v1`; the visible `label.btn.html` file chooser opened, but `fileChooser.setFiles` still failed with `Not allowed`.
- Attempted to open `chrome://extensions` to inspect/enable the Codex extension's file URL access. Browser automation blocked that page by security policy, so agents must not work around it. The user has to enable `Allow access to file URLs` manually before automated upload can continue.
- Inspected the Roll20 page for a direct HTML/CSS/Translation code editor fallback. None was present; the Sandbox Tools file inputs are the only discovered apply path.
- Saved local-only blocker evidence under ignored `reports/roll20-actual-compare/2026-06-18-state-map-v1/roll20-sandbox-observation/`.
- Hardened `scripts/roll20_upload_handoff.mjs`: if no run folder is provided, it now auto-selects the newest PASS pre-upload run, and a single non-path argument is treated as the fixture id. Both `corepack pnpm run handoff:roll20-upload -- official-roll20-Les-Oublies` and the explicit run command now resolve to `2026-06-18-state-map-v1`.
- `node scripts\roll20_actual_screenshot_diff.mjs reports\roll20-actual-compare\2026-06-18-state-map-v1` currently SKIPs sandbox/room/chat targets because actual Roll20 screenshots are still missing.
- Scope note: this improves handoff safety and records the real blocker. It still does not prove actual Roll20 visual parity.

## 2026-06-18 Imported Non-leaf Layer Reorder Slice

- Expanded `scripts/imported_edit_sync_smoke.mjs` with an imported-sheet non-leaf layer reorder check.
- The smoke now finds a visible imported container/subtree with direct children, drags that subtree through the real layer panel `before`/`after` drop path, and verifies both emitted order movement and direct child parent preservation.
- Latest local ignored validation:
  - `node --check scripts\imported_edit_sync_smoke.mjs`: PASS.
  - `node scripts\imported_edit_sync_smoke.mjs --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/imported-edit-sync`: PASS for AW2E, Les-Oublies, and YSHY 1BU.
  - Non-leaf evidence: AW2E moved `div before input` with 1 child preserved; Les-Oublies moved `div after div` with 1 child preserved; YSHY 1BU moved `div after div` with 1 child preserved.
  - Page errors stayed 0. YSHY still reports external Imgur resource/console failures in the local ignored report; this is tracked as resource diagnostics, not Roll20 actual parity evidence.
- Scope note: this closes the previous imported-sheet non-leaf coverage gap for the 3 prepared fixtures only. It does not prove broad corpus behavior, richer manual UX screenshots, or actual Roll20 sandbox/test-room parity.

## 2026-06-18 Edit Canvas Height + Chrome Cleanup Slice

- Removed the edit canvas fixed `900px` sheet shell and now size the edit Shadow host from the actual `#charsheet-root` content height, including visible absolutely positioned descendants.
- Removed the preview toolbar from edit mode. Edit-specific controls remain in the edit toolbar/layer panel; the preview toolbar was app chrome overlapping the rendered sheet and was not part of the Roll20 sheet result.
- Expanded `scripts/preview_edit_visual_smoke.mjs` with edit canvas height diagnostics and a strict host/content-height check.
- Latest local ignored validation:
  - `node --check scripts\preview_edit_visual_smoke.mjs`: PASS.
  - `corepack pnpm run build`: PASS.
  - `node scripts\preview_edit_visual_smoke.mjs --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/preview-edit-visual`: PASS.
  - Preview/edit mismatch improved from the previous 4.96% / 4.76% / 1.25% to AW2E 1.76%, Les-Oublies 1.68%, and YSHY 1BU 0.85%.
  - Edit host/content height delta is 0 for all 3 prepared fixtures, and preview/edit toolbar overlap is 0.
- Scope note: this is stronger local preview/edit evidence only. Actual Roll20 sandbox/test-room parity remains unverified until the upload blocker is resolved and screenshots exist.

## 2026-06-18 State-map Visual Diff Capture Slice

- Added `scripts/capture_visual_fixture_previews.mjs`.
- `corepack pnpm run diff:visual-fixtures` now captures live local preview PNGs first, applies `reports/visual-state-candidates/visual-state-candidates-state-map.json` when available, then generates/runs/classifies browser diff pages.
- Hardened `scripts/run_visual_fixture_diff_pages.mjs` for large fullsheet data-URL pages by waiting for the result JSON directly and isolating each diff page in its own Chromium process.
- Latest local validation:
  - `node --check scripts\capture_visual_fixture_previews.mjs`: PASS.
  - `node --check scripts\run_visual_fixture_diff_pages.mjs`: PASS.
  - `corepack pnpm run build`: PASS.
  - `corepack pnpm run smoke:visual-state-candidates -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/visual-state-candidates`: PASS.
  - `corepack pnpm run diff:visual-fixtures`: PASS. AW2E captured initial state and reports 18% best mismatch. Les-Oublies applied `act_fullsheet` and reports 8.84% best mismatch, replacing the stale default-state 13.51% diagnostic.
  - `corepack pnpm run lint`: PASS.
  - `corepack pnpm run guard:roll20-evidence`: PASS.
- Scope note: this fixes the local reference-image diagnostic pipeline. It still does not prove actual Roll20 visual parity; Custom Sheet Sandbox/test-room screenshots are still blocked by Chrome file URL upload access.

## 2026-06-18 Duplicate Attr Mirror + Control State Candidate Slice

- Fixed the preview iframe runtime so direct user changes on `input/select/textarea[name^="attr_"]` mirror through all duplicate Roll20 `attr_*` controls before firing `change:<attr>` sheet-worker handlers.
- This matters for sheets that pair a visible control with hidden CSS anchors such as `.sheet-lock:checked ~ .sheet-class`; changing only the clicked input leaves the hidden anchor stale and the local preview state diverges from Roll20-like behavior.
- Expanded `scripts/sheet_worker_state_smoke.mjs` with a duplicate attribute checkbox case. Latest local validation: `corepack pnpm run smoke:worker-state -- --out-dir ./out --base-path /roll20-block-editor --report-dir reports/sheet-worker-state-smoke` PASS, including visible/hidden checked mirroring and CSS `display:none` transition.
- Expanded `scripts/visual_state_candidate_smoke.mjs` and downstream state-map consumers so visual state hints can be action buttons or checkbox/radio controls. `scripts/capture_visual_fixture_previews.mjs`, `scripts/roll20_actual_local_baseline.mjs`, and `scripts/roll20_payload_roundtrip_visual_smoke.mjs` now apply those control hints consistently.
- Latest local visual diagnostics:
  - `corepack pnpm run smoke:visual-state-candidates -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/visual-state-candidates`: PASS. AW2E best local candidate is `control_attr_class_Hardholder` at 16.23%; Les-Oublies remains `act_fullsheet` at 8.84%.
  - `corepack pnpm run diff:visual-fixtures`: PASS and applies the same control/action state hints before diffing.
  - `node scripts\roll20_actual_local_baseline.mjs --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures\visual --report-dir reports\roll20-actual-compare --run-label 2026-06-18-state-map-v1 --state-map reports\visual-state-candidates\visual-state-candidates-state-map.json`: PASS for AW2E, Les-Oublies, and YSHY 1BU.
  - `corepack pnpm run verify:roll20-preupload -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --fixtures test-fixtures\visual --out-dir ./out --base-path /roll20-block-editor --state-map reports\visual-state-candidates\visual-state-candidates-state-map.json`: PASS. Cleaned-payload visual roundtrip reports 0% mismatch for all 3 ignored fixtures.
- Scope note: this is local preview/runtime and upload-readiness evidence only. AW2E still needs reference crop/viewport normalization because its reference image includes a wider Roll20 screen/chat context, and actual Roll20 visual parity remains blocked until Custom Sheet Sandbox/test-room screenshots exist.

## 2026-06-18 Core UI Copy Cleanup Slice

- Replaced mojibake/translation-style text in `components/editor/EditorHeader.tsx`, `components/editor/PreviewEmptyState.tsx`, and `components/editor/ExportDialog.tsx` with readable Korean labels, tooltips, confirmations, and toasts.
- Hid the public sample menu/button when `EXAMPLES` is empty. This avoids presenting a dead sample action and matches the copyright rule that real sheet examples must not be committed publicly.
- Hardened `scripts/export_dialog_browser_smoke.mjs` so it now checks the header title, empty-state title, blank-sheet CTA, hidden sample UI, no mojibake in initial shell text, export readiness badge text, import dialog opening, and edit-tab selection.
- Latest validation:
  - `node --check scripts\export_dialog_browser_smoke.mjs`: PASS.
  - `corepack pnpm run lint`: PASS.
  - `corepack pnpm run build`: PASS.
  - `corepack pnpm run smoke:export-dialog -- --out-dir ./out --base-path /roll20-block-editor --report-dir reports/export-dialog-smoke`: PASS with 0 console/page errors.
- Scope note: this improves core app usability and export/verification clarity. It does not prove actual Roll20 visual parity and does not claim all editor copy is fully cleaned.

## 2026-06-19 Roll20 Actual Status Gate Slice

- Reclaimed the kept `Codex Roll20 Verify | Roll20` Chrome tab again and confirmed the Custom Sheet Sandbox still exposes `#sheetHtml`, `#sheetCss`, and `#sheetTranslation`.
- Retried uploading `official-roll20-Les-Oublies` HTML from `2026-06-18-state-map-v1`; `fileChooser.setFiles` still failed with `Not allowed`.
- Added `scripts/roll20_actual_status.mjs` and package script `corepack pnpm run status:roll20-actual`.
- The status script reports local pre-upload readiness separately from actual Roll20 screenshot evidence:
  - Default command exits successfully for a readable status report but prints `PREUPLOAD_READY_MISSING_ACTUAL` when screenshots are absent.
  - `--require-actual` exits non-zero until required Roll20 screenshots and diffs exist.
- Latest local validation:
  - `node --check scripts\roll20_actual_status.mjs`: PASS.
  - `corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1`: `PREUPLOAD_READY_MISSING_ACTUAL`, `actualScreenshots=0/9`, `diffed=0/9`.
  - `corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --require-actual`: fails as expected because actual Roll20 screenshots are still missing.
- Scope note: this is a truthfulness gate and handoff aid. It does not prove actual Roll20 visual parity; the next unblock remains enabling file URL access for the Codex Chrome extension or manually placing Roll20 screenshots into the ignored run folder.

## 2026-06-19 Imported Edit Resource Strictness Slice

- Confirmed the latest YSHY imported edit sync path still moves the selected imported input correctly in edit and preview, but browser-rendered external assets still report Imgur/Typekit failures.
- Hardened `scripts/imported_edit_sync_smoke.mjs` so reports now separate:
  - `Interaction`: edit pointer movement, preview sync, flow insertion, free insertion, layer reorder, and re-import stability.
  - `Resources`: browser-rendered image/font resource loading.
- Added `--fail-on-resource-issues true` plus package script `corepack pnpm run smoke:imported-edit-sync:strict`.
- Latest local validation:
  - `node --check scripts\imported_edit_sync_smoke.mjs`: PASS.
  - `corepack pnpm run smoke:imported-edit-sync -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/imported-edit-sync --only yshy-commission-1bu --port 4296`: interaction PASS, resources WARN.
  - `corepack pnpm run smoke:imported-edit-sync:strict -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/imported-edit-sync --only official-roll20-AW2E --port 4298`: PASS, proving strict mode succeeds when resources load.
- Scope note: this does not fix YSHY's external asset failures yet. It prevents future visual-parity work from treating an edit-interaction PASS as a full visual readiness PASS.

## 2026-06-19 Preview Capture Resource Strictness Slice

- Hardened `scripts/capture_visual_fixture_previews.mjs` so local preview screenshot captures now separate:
  - `Status`: imported fixture rendered in the preview iframe without visible runtime nodes or console/page errors.
  - `Resources`: browser-rendered image/font resource loading.
- Added `--fail-on-resource-issues true` and package scripts:
  - `corepack pnpm run capture:visual-fixtures`
  - `corepack pnpm run capture:visual-fixtures:strict`
- Latest local validation:
  - `node --check scripts\capture_visual_fixture_previews.mjs`: PASS.
  - `corepack pnpm run build`: PASS.
  - `corepack pnpm run capture:visual-fixtures -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/visual-fixture-render --state-map reports/visual-state-candidates/visual-state-candidates-state-map.json --only yshy-commission-1bu --port 4301`: PASS, resources PASS.
  - `corepack pnpm run capture:visual-fixtures:strict -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/visual-fixture-render --state-map reports/visual-state-candidates/visual-state-candidates-state-map.json --only official-roll20-AW2E --port 4302`: PASS, resources PASS.
  - `corepack pnpm run capture:visual-fixtures:strict -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/visual-fixture-render --state-map reports/visual-state-candidates/visual-state-candidates-state-map.json --only yshy-commission-1bu --port 4303`: PASS, resources PASS.
  - `corepack pnpm run lint`: PASS.
  - `corepack pnpm run guard:roll20-evidence -- reports\roll20-actual-compare\2026-06-18-state-map-v1`: PASS.
- Scope note: this proves the local preview capture path is not hiding resource failures for the checked fixtures. It does not prove actual Roll20 visual parity, and it does not clear the imported edit/reimport resource WARN path.

## 2026-06-19 Roll20 Upload Retry After Preview Strictness

- Reclaimed the kept `Codex Roll20 Verify | Roll20` Chrome tab and confirmed the sandbox still exposes `#sheetHtml`, `#sheetCss`, and `#sheetTranslation`.
- Retried the Les-Oublies generated payload HTML upload through the visible `label.btn.html` file chooser.
- Result: chooser opened, but `fileChooser.setFiles` returned `Not allowed` again. This remains the Chrome extension file URL access blocker, not a payload readiness failure.
- Regenerated ignored handoff instructions with `corepack pnpm run handoff:roll20-upload -- official-roll20-Les-Oublies`; output is under `reports/roll20-actual-compare/2026-06-18-state-map-v1/roll20-upload-handoff`.
- Next unblock: in Chrome, open `chrome://extensions`, open Details for the Codex extension, and enable `Allow access to file URLs`; then retry sandbox upload and capture `roll20-sandbox.png` / `roll20-chat.png`.

## 2026-06-19 Edit UI Copy Cleanup + Smoke Gate

- Cleaned the edit canvas and layer panel user-facing copy:
  - edit toolbar labels now use readable `?�트 ?�집`, `?�름`, `?�유`, and Korean placement tooltips.
  - layer role labels now use Korean names such as `?�`, `?�름`, `??, `?�력`, and `버튼`.
  - friendly widget gallery preset names/descriptions now use readable Korean copy.
- Hardened `scripts/edit_flow_browser_smoke.mjs` with an `editUiCopy` check. It now verifies the edit canvas contains `?�트 ?�집`, `?�이??, `?�이??검??, `?�름`, and `?�유`, and that the scoped edit canvas text has no Han-range mojibake.
- Latest validation:
  - scoped source mojibake scan over `components/editor/EditCanvas.tsx`, `lib/editor/layerRoles.ts`, and `lib/widgets/presets.ts`: PASS.
  - `corepack pnpm run lint`: PASS.
  - `corepack pnpm run build`: PASS.
  - `node scripts\edit_flow_browser_smoke.mjs --out-dir ./out --base-path /roll20-block-editor --report-dir reports/edit-flow-smoke --port 4311`: PASS. Existing flow/free placement, layer reorder, absolute-in-frame, and edit UI copy checks all passed.
- Scope note: this improves edit-mode usability and prevents this copy regression from returning. It does not prove actual Roll20 visual parity.

## 2026-06-19 Core Shell/Export Copy Verification Refresh

- Rechecked the core shell copy after finding stale mojibake expectations in `docs/qa/31_active_todo.md` and `scripts/export_dialog_browser_smoke.mjs`.
- Cleaned the user-facing Korean copy in:
  - `components/editor/EditorHeader.tsx`
  - `components/editor/PreviewEmptyState.tsx`
  - `components/editor/ExportDialog.tsx`
- Hardened `scripts/export_dialog_browser_smoke.mjs` so it now verifies:
  - header title, empty-state title, blank-sheet CTA, and hidden public sample UI;
  - no mojibake in initial shell text;
  - export dialog title, 5 readiness items, `?�제 검�??�요` badge, legacy toggle copy, and local-vs-actual Roll20 verification warning;
  - no mojibake in export dialog text;
  - import dialog opening and edit-mode tab selection.
- Latest validation:
  - `node --check scripts\export_dialog_browser_smoke.mjs`: PASS.
  - `corepack pnpm run lint`: PASS.
  - `corepack pnpm run build`: PASS.
  - `corepack pnpm run smoke:export-dialog -- --out-dir ./out --base-path /roll20-block-editor --report-dir reports/export-dialog-smoke --port 4312`: PASS with 0 console/page errors.
- Scope note: this keeps the app's core flow readable and its export UI honest about Roll20 actual-screen verification. It does not prove actual Roll20 visual parity; Custom Sheet Sandbox/test-room screenshots are still missing.

## 2026-06-19 Roll20 Actual Status Gate Split

- Rechecked the current Roll20 actual-screen status after the latest Chrome retry.
- Confirmed the kept Roll20 tab still exposes Sandbox upload controls, but hidden input upload timed out and the visible file chooser path remains blocked by Chrome extension file URL access.
- Updated `scripts/roll20_actual_status.mjs` so generated-sheet actual evidence is separated from optional solo-room observation:
  - generated-sheet gate: `roll20-sandbox.png` and `roll20-chat.png`;
  - read-only observation: `roll20-room.png`.
- Latest validation:
  - `node --check scripts\roll20_actual_status.mjs`: PASS.
  - `corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1`: PASS and reports `PREUPLOAD_READY_MISSING_GENERATED_ACTUAL`, `generatedActualScreenshots=0/6`, `generatedDiffed=0/6`, `roomObservationScreenshots=0/3`, `roomObservationDiffed=0/3`.
  - `corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --require-actual`: fails as expected because generated Sandbox/chat evidence is missing.
- Scope note: this is a truthfulness/status split only. It does not prove actual Roll20 visual parity; the next unblock remains enabling file URL access for the Codex Chrome extension, uploading the generated payloads in Custom Sheet Sandbox, and capturing `roll20-sandbox.png` / `roll20-chat.png`.

## 2026-06-19 Preview/Edit DOM Signature Parity Gate

- Hardened `scripts/preview_edit_visual_smoke.mjs` so preview iframe and edit Shadow DOM are compared by DOM signature, not only screenshot mismatch and height:
  - total node count;
  - `data-r20-block-id` count and unique count;
  - tag count map;
  - form control `tag/type/name` count map;
  - first 120-node structural sequence hash;
  - visible `script` / `rolltemplate` runtime node count.
- Added package script `corepack pnpm run smoke:preview-edit-visual`.
- Latest local validation:
  - `node --check scripts\preview_edit_visual_smoke.mjs`: PASS.
  - `corepack pnpm run lint`: PASS.
  - `corepack pnpm run build`: PASS.
  - `corepack pnpm run smoke:preview-edit-visual -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/preview-edit-visual --port 4314`: PASS.
- Latest evidence from the ignored local report:
  - AW2E: preview/edit nodes `1903/1903`, blocks `575/575`, sequence hash `41cc331a/41cc331a`, mismatch `1.76%`.
  - Les-Oublies: preview/edit nodes `664/664`, blocks `611/611`, sequence hash `d74453ad/d74453ad`, mismatch `1.68%`.
  - YSHY 1BU: preview/edit nodes `6336/6336`, blocks `5820/5820`, sequence hash `0e0258ca/0e0258ca`, mismatch `0.85%`.
  - Visible runtime nodes are 0 for all 3 fixtures.
- Scope note: this is stronger local evidence that edit mode uses the same rendered sheet structure with overlays outside the root capture. It still does not prove actual Roll20 visual parity.

## 2026-06-19 Roll20 Upload Blocker Recheck + Layer Row UX Slice

- Rechecked the kept Chrome Roll20 verification tab at `https://app.roll20.net/editor`.
- Sandbox DOM state:
  - `#sheetHtml`, `#sheetCss`, and `#sheetTranslation` exist.
  - Visible upload controls are `label.btn.html`, `label.btn.css`, and `label.btn.translation`.
  - Hidden `#sheetHtml` direct click did not open a usable file chooser.
  - CDP `DOM.setFileInputFiles` is not allowed by the browser capability and instructs using the file chooser flow instead.
  - Visible `label.btn.html` did open the chooser, but `fileChooser.setFiles` still failed with `Not allowed`.
- Current blocker remains Chrome Codex extension local-file access, not missing Roll20 controls or missing payload files.
- While actual Roll20 upload is blocked, improved edit-layer row affordance:
  - layer rows now expose `data-r20-layer-role-kind`, `data-r20-can-drop`, and `data-r20-default-drop-mode`;
  - rows visibly show the role label, `?�기 가?? for containers, and default placement mode (`?�름` / `?�유`);
  - drag target badges now use Korean labels (`?�에 ?�음`, `?�에 ?�음`, `?�에 ?�음`) instead of raw `before/inside/after`.
- `scripts/edit_flow_browser_smoke.mjs` now checks the new layer row affordance attributes/text for the section row.
- Added package script `corepack pnpm run smoke:edit-flow`.
- Validation:
  - `node --check scripts\edit_flow_browser_smoke.mjs`: PASS.
  - `git diff --check`: PASS with CRLF warnings only.
  - `corepack pnpm run lint`: PASS.
  - `corepack pnpm run build`: PASS.
  - `corepack pnpm run smoke:edit-flow -- --out-dir ./out --base-path /roll20-block-editor --report-dir reports/edit-flow-smoke --port 4318`: PASS; the section layer row reported `roleKind=frame`, `canDrop=1`, `defaultDropMode=flow`, and visible text including `?�`, `?�기 가??, and `?�름`.

## 2026-06-19 Visual Diff Classification State-Applied Gate

- Fixed `scripts/classify_visual_fixture_diffs.mjs` so state-map hints are not treated as pending work when the current diff already reflects the same state.
- Added `stateCandidateApplied` to the JSON report and an `Applied` column to the Markdown summary.
- Added `reference/capture context mismatch` as a distinct category when the reference image and captured local preview have incompatible context, sheet height, or a large best-crop offset.
- Latest local validation:
  - `node --check scripts\classify_visual_fixture_diffs.mjs`: PASS.
  - `node scripts\classify_visual_fixture_diffs.mjs reports\visual-fixture-diff test-fixtures\visual`: PASS.
- Latest ignored classification output:
  - AW2E: state `control_attr_class_Hardholder` is already applied; likely cause is `viewport/crop/default-state offset; default attr/state; reference/capture context mismatch`; next action is crop/context normalization or actual Roll20 screenshot collection before renderer CSS changes.
  - Les-Oublies: state `act_fullsheet` is already applied; likely cause is `viewport/crop/default-state offset; default attr/state; reference/capture context mismatch`; next action is crop/context normalization or actual Roll20 screenshot collection before renderer CSS changes.
- Scope note: this improves triage truthfulness. It does not reduce the visual mismatch by itself and does not prove Roll20 visual parity.
## 2026-06-19 Roll20 Actual Sandbox Contract Observation

- Used the logged-in Chrome Roll20 session on the dedicated verification sandbox and found the settings URL shape `sheetsandbox/settings/<campaignId>`.
- Confirmed the visible settings page exposes `customcharsheet_json`; the page script references the preview path for `customcharsheet_layout`, `customcharsheet_style`, and `#customsheet-preview iframe -> #root`.
- Documented observed Roll20 sandbox CSS/HTML sanitize behavior in `docs/spec/30_roll20_actual_sandbox_contract.md`, including `.charsheet` selector prefixing, URL proxy/drop rules, HTML tag allow-list, and class prefix exceptions.
- Important boundary: this is structure/runtime evidence, not generated-sheet visual parity. Actual upload/screenshots remain blocked by Chrome extension file upload permissions.

## 2026-06-19 Roll20 Sandbox Sanitize Module Slice

- Added `lib/emit/roll20SandboxSanitize.ts` as a dedicated Roll20 sandbox sanitize/prefix approximation, explicitly separate from `sanitizeForRoll20Legacy`.
- Added `lib/emit/__tests__/roll20SandboxSanitize.test.ts` and package script `test:roll20-sandbox-sanitize`.
- Covered observed selector prefixing, Roll20 URL proxy/drop behavior, unsafe CSS rejection, HTML allow-list/class prefix exceptions, runtime source stripping, and HTML URL handling.
- Verification: `corepack pnpm run test:roll20-sandbox-sanitize`, `corepack pnpm run lint`, and `corepack pnpm run build` PASS.
- Scope note: this is a local module/test slice. It is not yet wired into preview/export and still does not prove actual Roll20 visual parity.

## 2026-06-19 Roll20 Sandbox Sanitize Preupload Gate Slice

- Added `scripts/roll20_sandbox_sanitize_audit.mjs` and package script `audit:roll20-sandbox-sanitize`.
- Wired the new audit into `scripts/roll20_preupload_verification.mjs` immediately after payload hygiene.
- Latest ignored run `2026-06-18-state-map-v1` PASS: AW2E, Les-Oublies, and YSHY all produce `htmlChanged=true` and `cssChanged=true` under observed Roll20 sandbox sanitize rules, but none hit the fatal empty/rejected gate.
- Diagnostic rewrite sizes from the local report: AW2E HTML `94235 -> 92210`, CSS `12678 -> 14084`; Les-Oublies HTML `57358 -> 47217`, CSS `12922 -> 14603`; YSHY 1BU HTML `598439 -> 497753`, CSS `26815 -> 29181`.
- Full local pre-upload gate with the new audit PASS: `corepack pnpm run verify:roll20-preupload -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --fixtures test-fixtures\visual --out-dir ./out --base-path /roll20-block-editor --state-map reports\visual-state-candidates\visual-state-candidates-state-map.json`.
- Scope note: this proves local upload-readiness now includes a Roll20 sandbox sanitize diagnostic. It still does not prove actual Roll20 visual parity; generated sandbox/chat screenshots remain missing.

## 2026-06-19 Export Sandbox Diagnostics UI Slice

- Added a user-facing `Roll20 Sandbox ?�상 변?? panel to `components/editor/ExportDialog.tsx`.
- The panel uses the same observed sandbox sanitizer module as the local audit (`sanitizeRoll20SandboxHtml/Css`) against the prepared Roll20 payload, and reports HTML/CSS rewrite risk, runtime stripping, class/tag rewrites, URL proxy/drop counts, and fatal reject risk.
- This is diagnostic only: it does not mutate the downloaded zip payload and does not replace actual Roll20 Sandbox/test-room screenshot verification.
- Hardened `scripts/export_dialog_browser_smoke.mjs` so the static app smoke now checks the Sandbox diagnostics panel, 4 diagnostic rows, and the status badge.
- Latest validation:
  - `node --check scripts\export_dialog_browser_smoke.mjs`: PASS.
  - `corepack pnpm run lint`: PASS.
  - `corepack pnpm run build`: PASS.
  - `corepack pnpm run smoke:export-dialog -- --out-dir ./out --base-path /roll20-block-editor --report-dir reports/export-dialog-smoke --port 4322`: PASS with 0 console/page errors.
  - `corepack pnpm run test:roll20-sandbox-sanitize`: PASS (Node still prints the known module-type warning).
  - `corepack pnpm run audit:roll20-sandbox-sanitize -- reports\roll20-actual-compare\2026-06-18-state-map-v1`: PASS.
- Scope note: local upload readiness is clearer in the app, but actual Roll20 generated-sheet visual parity remains blocked until the Chrome extension can upload local files or screenshots are manually placed in the ignored report folder.

## 2026-06-19 Imported Fixture Export Diagnostics Smoke

- Extended `scripts/export_dialog_browser_smoke.mjs` with optional `--fixtures` and `--fixture` arguments.
- In fixture mode, the smoke enables `window.__perfHook`, imports the ignored copied fixture through the real browser import path, then opens the export dialog and verifies the Sandbox diagnostics against the emitted payload.
- Latest imported-fixture validation:
  - `corepack pnpm run smoke:export-dialog -- --out-dir ./out --base-path /roll20-block-editor --report-dir reports/export-dialog-smoke-imported --fixtures test-fixtures/visual --fixture official-roll20-Les-Oublies --port 4325`: PASS.
  - Imported fixture stats: 653 blocks, 4 worker blocks, emitted bytes HTML 82409 / CSS 12922 / worker 7496.
  - Export dialog reported `치명 ?�류 ?�음`, 4 diagnostics rows, expected rewrite rows for HTML/CSS/classes, 0 console/page errors, and no mojibake.
- Rechecked empty-workspace export smoke too:
  - `corepack pnpm run smoke:export-dialog -- --out-dir ./out --base-path /roll20-block-editor --report-dir reports/export-dialog-smoke --port 4326`: PASS.
- Additional validation:
  - `node --check scripts\export_dialog_browser_smoke.mjs`: PASS.
  - `corepack pnpm run lint`: PASS.
  - `corepack pnpm run build`: PASS.
- Scope note: this proves the new export diagnostics UI works after a real local fixture import. It still does not prove actual Roll20 visual parity because no generated-sheet Roll20 Sandbox/chat screenshots have been captured.

## 2026-06-19 Roll20 Sandbox Expected Preview Toggle

- Added a preview-only Roll20 Custom Sheet Sandbox expected-render mode.
- `buildSheetDoc` can now apply `sanitizeRoll20SandboxHtml/Css` after auto-prefix and before optional legacy CSS sanitize, while normal preview remains source-preserving by default.
- Added `roll20SandboxSanitize` to `usePreviewStore`, exposed it through `window.__perfHook.setRoll20SandboxSanitize()`, and surfaced a compact `Sandbox ?�상` toggle in the main toolbar whenever preview is visible.
- Added package script `corepack pnpm run smoke:roll20-sandbox-preview`.
- Latest imported-fixture browser validation:
  - `corepack pnpm run smoke:roll20-sandbox-preview -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --fixture official-roll20-Les-Oublies --report-dir reports/roll20-sandbox-preview-smoke --port 4331`: PASS.
  - Normal preview: `rootInnerBytes=82511`, `userCssBytes=14302`, `colgroupCount=6`, `rolltemplateCount=3`, `sourceWorkerScriptCount=1`.
  - Sandbox expected preview: `rootInnerBytes=69761`, `userCssBytes=15488`, `colgroupCount=0`, `rolltemplateCount=0`, `sourceWorkerScriptCount=0`.
  - Console/page errors: 0.
- Regression checks:
  - `corepack pnpm run lint`: PASS.
  - `corepack pnpm run build`: PASS.
  - `corepack pnpm run test:roll20-sandbox-sanitize`: PASS, with the known Node module-type warning.
  - `corepack pnpm run smoke:preview-edit-visual -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/preview-edit-visual --port 4332`: PASS for AW2E, Les-Oublies, and YSHY 1BU with the same mismatch bounds as before.
  - `corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1`: still `PREUPLOAD_READY_MISSING_GENERATED_ACTUAL`.
- Scope note: this is a local Roll20 Sandbox expected-render diagnostic. It does not prove actual Roll20 visual parity; generated Roll20 Sandbox/chat screenshots remain missing until the Chrome upload permission blocker is resolved.

## 2026-06-19 Roll20 Sandbox Expected Preview All-Fixture Gate

- Extended `scripts/roll20_sandbox_preview_smoke.mjs` with `--all` and added package script `corepack pnpm run smoke:roll20-sandbox-preview:all`.
- The smoke now loops over every prepared ignored visual fixture, writes per-fixture screenshots under the ignored report folder, and separates sanitizer render failures from console/resource warnings.
- Latest validation:
  - `node --check scripts\roll20_sandbox_preview_smoke.mjs`: PASS.
  - `corepack pnpm run lint`: PASS.
  - `corepack pnpm run build`: PASS.
  - `corepack pnpm run smoke:roll20-sandbox-preview:all -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/roll20-sandbox-preview-smoke --port 4333`: PASS with `Console status=WARN`.
  - `corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1`: still `PREUPLOAD_READY_MISSING_GENERATED_ACTUAL`.
- Fixture evidence from the ignored local report:
  - AW2E: runtime nodes `2 -> 0`, sandbox bytes `115081`, page errors 0.
  - Les-Oublies: runtime nodes `4 -> 0`, sandbox bytes `69755`, page errors 0.
  - YSHY 1BU: runtime nodes `20 -> 0`, sandbox bytes `678830`, page errors 0.
- Console WARN reasons were Roll20 image-proxy font CORS and source sheet numeric-expression warnings; these remain diagnostics, not sanitizer render failures. Pass `--fail-on-console-issues` when a strict console gate is needed.
- Scope note: this expands local expected-render coverage only. It still does not prove actual Roll20 visual parity until generated Roll20 Sandbox/chat screenshots are captured and diffed.

## 2026-06-19 Roll20 Actual Sandbox First Generated Sheet Evidence

- Reused the dedicated Roll20 Custom Sheet Sandbox, not an existing real room.
- The Roll20 editor's `Sheet Sandbox Tools` file chooser path remained blocked, but its handler was observed to POST base64 source to `/sheetsandbox/savesheetsettings`.
- Applied the generated Les-Oublies payload through that dedicated-sandbox endpoint for HTML, CSS, and translation, then saved `customcharsheet_json` on the sandbox settings page so the character iframe would load the custom sheet.
- Opened a sandbox character and confirmed the Roll20 character iframe contained the generated Les-Oublies sheet (`form.sheetform` and `div.charactersheet` were present).
- Captured a trustworthy actual Roll20 sheet screenshot as ignored local evidence: `reports/roll20-actual-compare/2026-06-18-state-map-v1/local-baseline/official-roll20-Les-Oublies/screenshots/roll20-sandbox.png`.
- Fixed `scripts/roll20_actual_screenshot_diff.mjs` to load screenshots as PNG/JPEG data URLs instead of `file://` URLs, which avoided Windows/Korean-path browser image load failures.
- Latest actual screenshot diff command: `node scripts\roll20_actual_screenshot_diff.mjs reports\roll20-actual-compare\2026-06-18-state-map-v1`.
- Latest actual screenshot diff result: Les-Oublies sandbox mismatch `18.81%`; AW2E/YSHY sandbox, room, and chat targets remain SKIP.
- Latest status command: `corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1`.
- Latest status result: `PARTIAL_GENERATED_ACTUAL_SCREENSHOTS`, `generatedActualScreenshots=1/6`, `generatedDiffed=1/6`, `roomObservationScreenshots=0/3`, and `roomObservationDiffed=0/3`.
- Clicked a real Roll20 roll button in the generated sheet iframe; Roll20 created one `sheet-rolltemplate-classic-roll` chat DOM message. DOM evidence is local-only under the ignored screenshot folder.
- Tried to capture the right Roll20 chat pane, but Roll20 UI overlays and Chrome screenshot coordinate behavior repeatedly produced non-chat images. Removed the misleading `roll20-chat.png`; chat screenshot/diff remains missing.
- Scope note: this is the first real generated Roll20 sheet render/diff evidence. It is not visual parity, and it does not yet prove chat/rolltemplate screenshot parity or coverage for AW2E/YSHY.

## 2026-06-19 Roll20 Actual Difference Classification Gate

- Added `scripts/roll20_actual_difference_classify.mjs` and package script `corepack pnpm run classify:roll20-actual`.
- The classifier reads ignored local evidence from a Roll20 actual run: local baseline, actual screenshot diff, sandbox sanitize audit, status report, and optional chat DOM evidence.
- Latest command: `corepack pnpm run classify:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1`.
- Latest result: PASS as heuristic triage, not parity. Les-Oublies sandbox diff is classified as primarily `viewport/crop/sheet size`, because the actual Roll20 screenshot is `720x538` while the local preview is `850x4478`; the actual screenshot covers only `12.01%` of the local preview height.
- Secondary Les-Oublies factors recorded by the classifier: Roll20 sandbox sanitize/prefix rewrites, local baseline state hint `act_fullsheet`, and Roll20 URL proxying for HTML/CSS assets.
- Chat DOM evidence is recorded as existing for Les-Oublies (`sheet-rolltemplate-classic-roll`), but chat screenshot evidence remains missing and must not be counted as chat visual parity.
- Next action: add a Roll20 character-iframe root crop capture path so actual screenshots compare sheet root to sheet root before changing renderer CSS.

## 2026-06-19 Roll20 Actual Root Crop Slice

- Reopened the dedicated Roll20 Custom Sheet Sandbox editor and created/saved a sandbox-only test character so the generated Les-Oublies sheet viewer iframe opened in the Roll20 character dialog.
- Captured a local-only full viewport screenshot and iframe/dialog metadata under the ignored run folder. The visible Roll20 page showed the generated Les-Oublies sheet, but the iframe `contentDocument` was unavailable to the automation layer and CDP was blocked by a paused document response.
- Added `scripts/roll20_actual_screenshot_crop.mjs` and package script `corepack pnpm run crop:roll20-actual` to crop a Roll20 viewport screenshot into a preferred `roll20-sandbox-root.png` using measured metadata and CSS-pixel insets.
- Updated `scripts/roll20_actual_screenshot_diff.mjs` so sandbox diffs prefer `roll20-sandbox-root.png` over `roll20-sandbox.png` and scale a root crop back to its CSS crop size when adjacent crop metadata exists.
- Updated `scripts/roll20_actual_status.mjs` so `roll20-sandbox-root.png` counts as the preferred generated-sheet sandbox screenshot while the older `roll20-sandbox.png` remains a fallback.
- Latest local-only crop command used `--inset-css 140,116,0,0`, producing a `760x556` CSS crop (`608x444` screenshot pixels) from the visible Roll20 sheet area.
- Latest validation:
  - `node --check scripts\roll20_actual_screenshot_crop.mjs`: PASS.
  - `node --check scripts\roll20_actual_screenshot_diff.mjs`: PASS.
  - `node --check scripts\roll20_actual_status.mjs`: PASS.
  - `node --check scripts\roll20_actual_difference_classify.mjs`: PASS.
  - `node scripts\roll20_actual_screenshot_diff.mjs reports\roll20-actual-compare\2026-06-18-state-map-v1`: PASS, Les-Oublies sandbox mismatch `21.67%`.
  - `corepack pnpm run classify:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1`: PASS, classifies the remaining Les-Oublies mismatch as viewport/crop/sheet-size because the normalized root crop is only `760x556` versus local preview `850x4478`.
  - `corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1`: PASS, still `PARTIAL_GENERATED_ACTUAL_SCREENSHOTS`.
- Scope note: this proves the Roll20 generated sheet is visibly rendering and that root-crop evidence can be produced from the dedicated sandbox. It does not prove visual parity; next evidence step is a full-height/scroll-stitched Roll20 root capture or matching local visible viewport crop, plus trustworthy chat screenshot evidence.

## 2026-06-19 Roll20 Visible Crop Classification Slice

- Updated `scripts/roll20_actual_difference_classify.mjs` so `roll20-sandbox-root.png` runs with crop metadata now report a separate `matched visible viewport diff` category.
- Current Les-Oublies evidence has two distinct signals: the actual Roll20 crop is only `760x556` versus the local full preview `850x4478`, and that matched visible viewport still mismatches by `21.67%`.
- The classifier next action now points to visible-crop CSS/assets/default-state investigation while keeping full-height/scroll-stitched Roll20 evidence as the required gate before any full-sheet parity claim.
- Scope note: this is evidence classification and TODO alignment only. It does not change the renderer and does not prove visual parity.

## 2026-06-19 Roll20 Visible Crop Diagnostics Slice

- Added `scripts/roll20_visible_crop_diagnostics.mjs` and package script `corepack pnpm run diagnose:roll20-visible-crop`.
- The script consumes existing ignored actual-screen evidence, normalizes `roll20-sandbox-root.png` to the measured CSS crop size, compares it to the matching local visible crop, and writes local-only PNG artifacts: `local-visible-crop.png`, `best-local-visible-crop.png`, `actual-visible-normalized.png`, and `visible-diff-overlay.png`.
- Latest command: `corepack pnpm run diagnose:roll20-visible-crop -- reports\roll20-actual-compare\2026-06-18-state-map-v1`.
- Latest Les-Oublies result: visible crop `760x556`, mismatch `21.67%`, top-aligned local crop gain `0.34%`, mismatch bounds `0,0,760,556`, dominant band `bottom`, dominant quadrant `bottomLeft`.
- Interpretation: simple horizontal crop drift does not explain the mismatch. Next investigation should compare actual/local visible CSS, default state, asset rendering, and Roll20 scale/layout context before renderer changes.
- Scope note: this is local-only visual diagnosis. It does not prove Roll20 visual parity and does not replace full-height/scroll-stitched Roll20 root evidence.

## 2026-06-19 Roll20 Visible Context Diagnostics Slice

- Added `scripts/roll20_visible_context_diagnostics.mjs` and package script `corepack pnpm run diagnose:roll20-visible-context`.
- The script reads existing ignored Roll20 actual evidence and consolidates local preview size/state, actual iframe/crop metadata, sandbox sanitize rewrites, visible-crop gain, chat DOM evidence, and missing screenshot status into ranked hypotheses.
- Latest command: `corepack pnpm run diagnose:roll20-visible-context -- reports\roll20-actual-compare\2026-06-18-state-map-v1`.
- Latest result:
  - AW2E: generated Roll20 sandbox screenshot missing.
  - Les-Oublies: actual iframe DOM/CSS is not readable in the current evidence; top blocker is the full-height evidence gap (`760x556` actual visible crop is `12.42%` of local `850x4477`), followed by visible CSS/state/asset mismatch (`21.67%`, crop gain `0.34%`), sandbox sanitize rewrite, unconfirmed actual default state, asset proxying, and missing chat screenshot.
  - YSHY 1BU: generated Roll20 sandbox screenshot missing.
- Scope note: this is triage only. It helps choose the next probe and explicitly says not to change renderer CSS from this report alone.

## 2026-06-19 Roll20 Same-Context Visible Smoke Slice

- Added `scripts/roll20_same_context_visible_smoke.mjs` and package script `corepack pnpm run smoke:roll20-same-context-visible`.
- The script renders generated payloads locally through `buildSheetDoc`, applies the state hint when present, captures normal root, local Sandbox expected root, measured frame-inset, and fit-to-visible-width candidates, then compares each candidate against the existing actual Roll20 `roll20-sandbox-root.png`.
- Latest command: `corepack pnpm run smoke:roll20-same-context-visible -- reports\roll20-actual-compare\2026-06-18-state-map-v1`.
- Latest result:
  - AW2E/YSHY 1BU: SKIP because generated Roll20 sandbox root screenshots are still missing.
  - Les-Oublies: previous actual visible mismatch `21.67%`; best local same-context candidate `normal-root-top-left` is `21.60%`; local Sandbox expected root is also `21.60%`; measured frame-inset and fit-visible-width candidates are worse (`24.09%`, `23.34%`).
- Interpretation: local frame/inset/sandbox-width simulation does not materially explain the remaining Les-Oublies visible mismatch. Next P0 should collect actual computed-style/state/asset evidence when the iframe is readable and capture full-height/scroll-stitched Roll20 root evidence.
- Scope note: this is still not Roll20 visual parity.

## 2026-06-19 Roll20 Actual Iframe Computed-Style Probe

- Reused the dedicated Roll20 Custom Sheet Sandbox and the existing generated Les-Oublies sheet, not a real user room.
- Chrome/Playwright could not read the iframe through plain `contentDocument`, but frame access plus a CDP isolated execution world succeeded for the character iframe URL under `/editor/character/...`.
- Saved local-only live iframe metrics and computed-style evidence under `reports/roll20-actual-compare/2026-06-18-state-map-v1/live-iframe-probe/`.
- Actual Roll20 iframe facts from the ignored evidence:
  - `form.sheetform` and `div.charactersheet` are present.
  - actual default state is `sheetTab=combat` and `sheetTabForBtn=combat`.
  - actual `.charactersheet` root rect is about `852x4121.575`; computed CSS is content-box, `width: 832px`, `padding: 10px`, `font-size: 13px`, `line-height: 18.5714px`, transparent background.
  - actual `.sheet-combat` exists and `.sheet-fullsheet` does not; actual selected counts include 8 tables, 135 inputs, 40 roll buttons, and 6 action buttons.
- Extended `scripts/roll20_same_context_visible_smoke.mjs` with no-state candidates and optional computed-style comparison against `live-iframe-probe/<fixture>-computed-styles.json`.
- Latest command: `corepack pnpm run smoke:roll20-same-context-visible -- reports\roll20-actual-compare\2026-06-18-state-map-v1`.
- Latest result: Les-Oublies best local candidate is `normal-root-no-state` at `21.60%`, effectively unchanged from the prior `21.67%` actual visible mismatch. State-map mismatch alone is not the cause.
- The computed-style comparison points to a concrete Roll20 baseline/root mismatch: the best local candidate still has app-like border-box sizing, `900px` root width, `14px` font, `20px` line-height, white root background, and `6px 12px` input padding.
- Scope note: this is the strongest current root-cause evidence for the Roll20 visual mismatch, but it is not visual parity. Next renderer work should align local preview/edit baseline CSS and wrapper metrics to actual Roll20, then rerun the same-context visible smoke.

## 2026-06-19 Roll20 Baseline CSS Alignment Slice

- Removed `roll20BaselineCss` from the live iframe and Shadow render paths. That hand-written fallback was overriding the actual Roll20 dump with stale Bootstrap-like guesses.
- Removed full `vtt.css` injection from `roll20BaseIframeCss` and `roll20BaseShadowCss`. The live Roll20 character iframe did not match those VTT/app UI font rules, and local inputs were inheriting app-like `proxima-nova` before this fix.
- Kept Roll20 `base.css`, `charactersheet.css`, `jquery.css`, and optional dark mode CSS as the sheet preview baseline. Chat/VTT UI styling remains a separate future ChatPane concern.
- Adjusted preview runtime `html, body` reset to stop forcing a viewport-height shell and to keep a Roll20-like white body background.
- Removed the Shadow edit-only `:host * { box-sizing: border-box; }` reset. Actual Roll20 probe evidence showed the sheet root is content-box, so edit mode should not force a different box model than iframe preview.
- Latest command: `corepack pnpm run smoke:roll20-same-context-visible -- reports\roll20-actual-compare\2026-06-18-state-map-v1`.
- Latest result: Les-Oublies best candidate is `normal-root-no-state` at `21.38%`, improved from the prior `21.60%`.
- Local preview/edit regression command: `corepack pnpm run smoke:preview-edit-visual -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/preview-edit-visual --port 4336`.
- Local preview/edit result: PASS with AW2E `1.75%`, Les-Oublies `2.02%`, and YSHY 1BU `1.01%`.
- Computed-style result: prior `html` diffs and input font/background/padding app-style diffs are gone. Remaining diffs include actual root context/width (`852` actual vs `900` local in this probe), full-sheet height, table count (`8` actual vs `11` local), input height, and roll-button background/geometry.
- Scope note: this is real movement toward Roll20 actual parity, not completion. AW2E/YSHY actual screenshots and full-height Roll20 capture are still missing.

## 2026-06-19 Roll20 Same-Context DPR + Column Flow Diagnostic

- Refined `scripts/roll20_same_context_visible_smoke.mjs` so local payload candidates render in a per-fixture Playwright context using the measured Roll20 screenshot scale. Current Les-Oublies crop metadata maps to `deviceScaleFactor=1.25`.
- Added context candidates for actual Roll20 root width, actual CSS scale, and Roll20-like dialog padding. The report now includes native-pixel mismatch alongside CSS-size mismatch, and uses computed-style score as a tie-breaker when image mismatch is effectively equal.
- Expanded computed-style probes for `.sheet-2colrow`, `.sheet-col`, and `img`. Selector sample coordinates are normalized relative to the sheet root so the report focuses on layout differences instead of the Roll20 iframe's page offset.
- Latest command: `corepack pnpm run smoke:roll20-same-context-visible -- reports\roll20-actual-compare\2026-06-18-state-map-v1`.
- Latest result:
  - AW2E/YSHY 1BU: SKIP because generated Roll20 sandbox root screenshots are still missing.
  - Les-Oublies: best candidate `sandbox-actual-root-width-no-state`, CSS mismatch `21.49%`, native mismatch `21.55%`, computed-style score `339`.
  - Root width can match actual (`852px`), but root height still differs: actual `4121.575px` vs local `4963.266px`.
  - The strongest new clue is flow/height behavior: first `.sheet-2colrow` is `310.6px` high in actual Roll20 and `554px` locally; `.sheet-col` samples show actual keeps the first columns side-by-side while local rendering wraps/extends the flow.
- Scope note: this is still not Roll20 visual parity. The next renderer decision should be based on a fresh live iframe probe/full-height capture that confirms whether the column wrapping is generic Roll20 context behavior, not a Les-Oublies-specific patch target.

## 2026-06-19 Same-Context Probe Source Truthfulness Slice

- Updated `scripts/roll20_same_context_visible_smoke.mjs` so computed-style selector entries record whether they came from a real selected-selector probe, a missing selector, or the older `visibleTop` fallback.
- Partial fallback entries no longer contribute selector-count penalty to the computed-style tie-breaker, and the Markdown report now shows `Actual source` / `Local source`.
- Latest command: `corepack pnpm run smoke:roll20-same-context-visible -- reports\roll20-actual-compare\2026-06-18-state-map-v1`.
- Latest result still selects Les-Oublies `sandbox-actual-root-width-no-state` with CSS mismatch `21.49%` and native mismatch `21.55%`, but `.sheet-2colrow`, `.sheet-col`, and `img` actual entries are now explicitly labeled `visibleTop-fallback (partial)`.
- Correction for future agents: do not treat the fallback `.sheet-2colrow=1` / `.sheet-col=2` counts as Roll20 truth. A later read-only Chrome frameLocator check saw the generated Roll20 iframe expose `.sheet-2colrow=4` and `.sheet-col=15`. The remaining proven clue is root height/geometry mismatch; collect fresh selected-selector geometry and full-height/scroll-stitched root evidence before changing generic renderer CSS.

## 2026-06-19 Fresh Roll20 Iframe Geometry Probe

- Used the logged-in Chrome Roll20 editor tab for the dedicated verification sandbox only; did not inspect or modify existing real rooms.
- CDP `Page.getFrameTree` found the generated character iframe under `/editor/character/21639681/...`; `Page.createIsolatedWorld` plus read-only `Runtime.evaluate` captured fresh selected-selector geometry from inside the iframe.
- Saved ignored evidence to `reports/roll20-actual-compare/2026-06-18-state-map-v1/live-iframe-probe/official-roll20-Les-Oublies-computed-styles.json`.
- Actual Roll20 facts from the fresh probe: state `sheetTab=combat` / `sheetTabForBtn=combat`; root rect `852x4121.575`; `.sheet-2colrow=4`, `.sheet-col=15`, `img=5`, `table=8`, `input=135`.
- Rerunning `corepack pnpm run smoke:roll20-same-context-visible -- reports\roll20-actual-compare\2026-06-18-state-map-v1` keeps best candidate `sandbox-actual-root-width-no-state` at CSS mismatch `21.49%`, but computed-style score improves from `339` to `147` because selector counts now come from selected probes and match local counts.
- Updated conclusion: the remaining Les-Oublies actual/local problem is not selector-count loss. It is geometry/height: first `.sheet-2colrow` height `310.6px` actual vs `554px` local, table/input height deltas, and full root height mismatch. Next P0 is full-height/scroll-stitched Roll20 capture plus deeper row/table/control height comparison.

## 2026-06-19 Roll20 Geometry Delta Diagnostic

- Added `scripts/roll20_geometry_delta_diagnostics.mjs` and package script `corepack pnpm run diagnose:roll20-geometry`.
- Extended `scripts/roll20_same_context_visible_smoke.mjs` so candidate metrics include target geometry for `.sheet-2colrow`, first tables, and images.
- Captured actual Roll20 target geometry from the dedicated sandbox iframe as ignored evidence: `live-iframe-probe/official-roll20-Les-Oublies-target-geometry.json`.
- Latest command: `corepack pnpm run diagnose:roll20-geometry -- reports\roll20-actual-compare\2026-06-18-state-map-v1`.
- Result: selected selector counts match; row 0 is the top content geometry delta. Actual row 0 is `310.6px` high with two inline columns on the same line. The best local candidate wraps the second `.sheet-col` to the next line and makes row 0 `554px`.
- Added a diagnostic same-context candidate `sandbox-inline-block-fit-tolerance-no-state`; it removes the row 0 wrap and lowers local row 0 to `297px`, but the overall image mismatch is slightly worse (`21.56%` vs current best `21.49%`). Do not promote it to production CSS yet.
- Next P0: full-height/scroll-stitched Roll20 capture and a generic Roll20 inline-block/rounding context investigation. Avoid Les-Oublies-specific CSS patches.

## 2026-06-19 Roll20 Layout Context Probe

- Used the logged-in Chrome Roll20 editor tab for the dedicated verification sandbox only; existing rooms were not inspected or modified.
- Captured a read-only iframe layout-context probe as ignored evidence: `live-iframe-probe/official-roll20-Les-Oublies-layout-context.json`.
- Actual Roll20 wrapper chain for the first `.sheet-2colrow`: row -> `.sheet-character` -> `.sheet-outline` -> `.charactersheet` -> `form.sheetform` -> `.tab-content` -> `.dialog.largedialog.characterviewer` -> `#dialog-window.ui-dialog`.
- Actual wrapper metrics include `.dialog.largedialog.characterviewer { padding: 0 20px; width: 852px; }`, `.charactersheet { width: 832px; padding: 10px; }`, `.sheet-outline { width: 800px; padding: 10px; border: 1.6px solid gray; overflow: hidden; }`, and row width `800px`.
- The local generated payload also contains source `.outline`/`.sheet-outline`; the issue is not wrapper loss.
- Added a diagnostic same-context candidate `sandbox-dpr-border-snap-no-state` to test whether DPR-scaled border widths alone explain the wrap. It did not change row 0 wrapping and did not beat the current best mismatch.
- Current strongest clue remains inline-block whitespace/fit behavior: `sandbox-inline-block-fit-tolerance-no-state` keeps row 0 columns on one line but slightly worsens overall image mismatch, so it remains a diagnostic clue only.

## 2026-06-19 Roll20 Full-Height Root Stitch Evidence

- Used the logged-in Chrome Roll20 editor tab for the dedicated verification sandbox only; existing rooms were not inspected or modified.
- Added `scripts/roll20_actual_stitch_root.mjs` and package script `corepack pnpm run stitch:roll20-actual-root`.
- Chrome/CDP read `#dialog-window` and `.charactersheet` metrics from the generated Les-Oublies character iframe: root `852x4121.575`, viewport `900x672`, scroller `#dialog-window`.
- Captured 8 local-only clipped root segments under the ignored report folder and stitched them with:
  `corepack pnpm run stitch:roll20-actual-root -- --manifest reports\roll20-actual-compare\2026-06-18-state-map-v1\local-baseline\official-roll20-Les-Oublies\screenshots\roll20-root-stitch-clipped-manifest.json --out reports\roll20-actual-compare\2026-06-18-state-map-v1\local-baseline\official-roll20-Les-Oublies\screenshots\roll20-sandbox-root-full.png`.
- Updated the stitcher to support `"cropImage": "full"` for pre-clipped segment screenshots, avoiding browser screenshot scale ambiguity.
- Latest diff command:
  `node scripts\roll20_actual_screenshot_diff.mjs reports\roll20-actual-compare\2026-06-18-state-map-v1`.
- Latest Les-Oublies generated Roll20 sandbox result: full-height actual `852x4122` vs local preview `850x4478`, mismatch `6.90%`.
- Updated `scripts/roll20_actual_difference_classify.mjs` so full-height evidence is explicitly categorized. Latest classifier result: `sheet root geometry/height differs after full-height capture`.
- Status remains partial: `corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1` reports `PARTIAL_GENERATED_ACTUAL_SCREENSHOTS`, `generatedActualScreenshots=1/6`, `generatedDiffed=1/6`, `roomObservationScreenshots=0/3`, and `roomObservationDiffed=0/3`.
- Scope note: this replaces the old visible-top `21.67%` crop as the main generated-sheet evidence for Les-Oublies, but it is still not Roll20 visual parity. AW2E/YSHY actual screenshots and trustworthy chat screenshots remain missing. Next renderer work should compare actual-vs-local row/table/control geometry before applying generic CSS changes.

## 2026-06-19 Roll20 Full-Root Candidate + State Visibility Probe

- Added `scripts/roll20_full_root_candidate_smoke.mjs` and package script `corepack pnpm run smoke:roll20-full-root-candidates`.
- The script compares local full-root render candidates against stitched `roll20-sandbox-root-full.png`, separating source/default state, state-map, local Sandbox expected sanitize, and actual-root-width candidates.
- Latest command: `corepack pnpm run smoke:roll20-full-root-candidates -- reports\roll20-actual-compare\2026-06-18-state-map-v1`.
- Latest Les-Oublies result:
  - Existing app `local-preview.png` reference remains the closest current screenshot at `6.90%`.
  - Best direct local candidate is `normal-actual-root-width-source` at `8.52%`.
  - State-map and source/default candidates are visually close, so a simple local state toggle is not enough.
  - Best direct local root is still about `841px` taller than the stitched Roll20 root.
  - Row/table geometry remains the dominant clue: row 0 `310.6px` actual vs `554px` local; row 3 `140.2px` actual vs `318.563px` local; tables 4/5 are about `106px`/`104px` taller locally.
- Added `targetGeometry` capture to `scripts/roll20_actual_local_baseline.mjs` so future local baselines include app preview/edit rows, tables, images, inputs, and roll/action button geometry.
- Verification smoke for the new local baseline geometry field:
  `node scripts\roll20_actual_local_baseline.mjs --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures\visual --report-dir reports\roll20-actual-compare --run-label 2026-06-19-local-geometry-smoke --only official-roll20-Les-Oublies --state-map reports\visual-state-candidates\visual-state-candidates-state-map.json` PASS.
- A second no-state local geometry smoke showed source/default local preview was much shorter (`1189px`) than actual Roll20 (`4122px`), so the actual default display cannot be inferred from hidden attr values alone.
- Fresh read-only Chrome/CDP state visibility probe saved ignored evidence at `live-iframe-probe/official-roll20-Les-Oublies-state-visibility.json`.
- Actual Roll20 facts from that probe: hidden `attr_sheetTab` and `attr_sheetTabForBtn` both have `value` attribute and property `combat`, but `.sheet-section-oublie`, `.sheet-section-competences`, `.sheet-section-montures`, and `.sheet-combat` are visible. Next P0 is to compare the actual CSS selectors controlling those visible sections against local preview, rather than treating hidden attr state as the whole truth.
- Scope note: this is diagnostic groundwork. It does not prove visual parity and it does not justify a Les-Oublies-specific CSS patch.

## 2026-06-19 Roll20 State Visibility Selector Diagnostic

- Added `scripts/roll20_state_visibility_diagnostics.mjs` and package script `corepack pnpm run diagnose:roll20-state-visibility`.
- Latest command: `corepack pnpm run diagnose:roll20-state-visibility -- reports\roll20-actual-compare\2026-06-18-state-map-v1`.
- Latest result: `official-roll20-Les-Oublies` is classified as `ACTUAL_CSS_STATE_SELECTORS_DO_NOT_MATCH_PREFIXED_HTML`.
- Evidence shape: actual hidden state inputs are `sheetTab=combat` and `sheetTabForBtn=combat`; actual Roll20 still shows 9 sampled panels/sections; actual CSSOM state rules use unprefixed anchors such as `.tabstoggle[...]`; generated HTML anchors are `sheet-tabstoggle` and `sheet-tabstoggleforbtn`; sampled top-level panels have 0 matched state rules.
- Interpretation: the old local Roll20 Sandbox expected-render assumption that CSS selectors are blanket-prefixed is incomplete for the actual generated character iframe path. Local preview can therefore hide/show panels differently from actual Roll20.
- Next P0: separate source-preserving preview from actual Roll20 expected-render behavior, revise the sandbox sanitize/prefix model with this evidence, then rerun full-root candidates, preview/edit visual smoke, and actual Roll20 diff classification.
- Scope note: this is a root-cause diagnostic for one captured generated fixture. It is not Roll20 visual parity and not all-sheet proof.

## 2026-06-19 Actual-Iframe Sandbox CSS Prefix Alignment

- Added a `prefixSelectors: false` option to `sanitizeRoll20SandboxCss()` for the actual generated character iframe path while keeping the older selector-prefix behavior available for backward-compatible diagnostics.
- `buildSheetDoc()` now treats `roll20SandboxSanitize` as an actual Roll20 expected-render mode: HTML goes through the sandbox HTML sanitizer from source HTML, while CSS goes through URL/reject/comment cleanup without blanket selector prefixing.
- Export dialog sandbox diagnostics and `scripts/roll20_sandbox_sanitize_audit.mjs` now use the same actual-iframe CSS mode, so fixture diagnostics report `selector prefix 0` when matching the latest Roll20 evidence.
- Verification:
  - `corepack pnpm run test:roll20-sandbox-sanitize` PASS, 6/6.
  - `corepack pnpm run audit:roll20-sandbox-sanitize -- reports\roll20-actual-compare\2026-06-18-state-map-v1` PASS; Les-Oublies CSS warnings now show URL proxying only, not selector prefixing.
  - `corepack pnpm run smoke:roll20-full-root-candidates -- reports\roll20-actual-compare\2026-06-18-state-map-v1` PASS/SKIP; Les-Oublies best direct candidate remains `normal-actual-root-width-source` at `8.52%`, and `sandbox-actual-root-width-source` now ties it at `8.52%`.
  - `corepack pnpm run smoke:roll20-sandbox-preview -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --fixture official-roll20-Les-Oublies --report-dir reports/roll20-sandbox-preview-smoke --port 4331` PASS; sandbox preview has `selector prefix 0` behavior and runtime nodes hidden.
  - `corepack pnpm run smoke:preview-edit-visual -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/preview-edit-visual --port 4336` PASS with AW2E `1.75%`, Les-Oublies `2.02%`, YSHY `1.01%`.
  - `corepack pnpm run smoke:export-dialog` PASS in empty and imported Les-Oublies modes.
- Interpretation: the local Sandbox expected preview no longer over-applies CSS state selector prefixing. This removes one false local/actual divergence source, but it does not reduce the remaining full-root height problem by itself.
- Next P0: continue row/table/control geometry work. Current actual generated Les-Oublies root remains `852x4122`, while direct local candidates are still around `852x4964`; AW2E/YSHY actual screenshots and trustworthy chat screenshots are still missing.

## 2026-06-19 Geometry Diagnostic Full-Root Fallback

- Updated `scripts/roll20_geometry_delta_diagnostics.mjs` so `corepack pnpm run diagnose:roll20-geometry -- reports\roll20-actual-compare\2026-06-18-state-map-v1` can use the newer `full-root-candidate-smoke` report when the older same-context visible smoke is SKIP.
- Latest ignored report now compares the stitched full-height Roll20 root against the best local full-root candidate for Les-Oublies and keeps the claim boundary as diagnostic only.
- Current unresolved gaps are narrowed to row 0 and row 3 inline-block wrap/relative placement plus table 4 and table 5 height deltas around `106px` and `104px`.
- `scripts/roll20_full_root_candidate_smoke.mjs` and `scripts/roll20_actual_local_baseline.mjs` now capture two descendant levels plus `white-space`, `word-spacing`, `letter-spacing`, and `zoom` in local target geometry. The next fresh Roll20 iframe probe should capture the same fields/depth before a generic renderer CSS patch.
- Verification so far: full-root candidate smoke PASS/SKIP and geometry diagnostic PASS/SKIP against the existing local-only evidence. This does not prove Roll20 visual parity.

## 2026-06-19 Roll20 Deep Geometry Probe Row Isolation

- Continued from the full-root fallback batch and reused only the dedicated Roll20 Custom Sheet Sandbox iframe evidence; existing rooms were not inspected or modified.
- Updated `scripts/roll20_geometry_delta_diagnostics.mjs` to prefer `live-iframe-probe/<fixture>-target-geometry-deep.json`, normalize target y positions relative to each sheet root, preserve all nested child comparisons instead of truncating at 12 children, and render a `Target Table Row Details` section for large table deltas.
- Latest command: `corepack pnpm run diagnose:roll20-geometry -- reports\roll20-actual-compare\2026-06-18-state-map-v1`.
- Latest result:
  - AW2E and YSHY remain SKIP because generated Roll20 sandbox screenshots/full-root captures are still missing.
  - Les-Oublies remains COMPARED, with actual full-root `852x4122` versus local candidate about `841px` taller.
  - Row 0 and row 3 still show inline-block/relative-y wrap gaps.
  - Table 4 rows 1/16 and table 5 rows 16/17 are now isolated as Roll20 repeating control `Modify+Add` rows: actual `37.6px`, local `86.734px`, about `49px` extra per row.
- Interpretation: the big table deltas are no longer a generic table-height mystery. They point to Roll20 repeating control/runtime CSS behavior that local preview/edit does not yet match. This is still not Roll20 visual parity and does not justify a Les-Oublies-specific patch.
- Next P0: inspect the actual/local DOM/CSS around repeating control rows and implement a generic Roll20 repeating-control rendering fix only if it holds across fixtures; keep row 0/3 inline-block wrapping as the parallel geometry gap.

## 2026-06-19 Roll20 Repeating Runtime Emulation Slice

- Implemented a generic preview/edit render-only Roll20 repeating runtime approximation:
  - `fieldset.repeating_*` prototypes are hidden in preview runtime CSS to match actual Roll20.
  - iframe preview bridge adds sibling `div.repcontainer` and `div.repcontrol` controls with `Modify` and `+Add`.
  - Shadow edit mount applies the same DOM transform after mounting, so edit mode and preview mode do not diverge.
  - Exported HTML/CSS payloads are not mutated by this render-only transform.
- Latest direct full-root candidate command:
  `corepack pnpm run smoke:roll20-full-root-candidates -- reports\roll20-actual-compare\2026-06-18-state-map-v1`.
- Result: Les-Oublies direct local root height delta improved from `841.266px` before the repeating runtime work to `375.375px`; after the transform, table 4/5 are no longer the large geometry deltas in `diagnose:roll20-geometry`.
- Fresh local baseline plus existing Roll20 full-root screenshot diff now reports Les-Oublies generated sandbox mismatch `6.63%`, improved from the previous `6.90%`.
- Remaining major gaps: row 0 `DIV.sheet-2colrow` still wraps/places the second column too low (`310.6px` actual vs `554px` local), and row 3 remains too tall (`140.2px` actual vs `274px` local).
- Claim boundary: this is a generic renderer-parity improvement, not Roll20 visual parity. AW2E/YSHY generated Roll20 full-root captures are still missing, and Les-Oublies still classifies as sheet root geometry/height mismatch after the fresh baseline/diff.

## 2026-06-19 Inline-Block Candidate Diagnostic Slice

- Extended `scripts/roll20_full_root_candidate_smoke.mjs` with multiple diagnostic-only inline-block candidates:
  - word-spacing tolerances at `-0.25px`, `-0.5px`, `-0.75px`, and `-1px`;
  - a `font-size: 0` row candidate with child font restoration;
  - a combined inline-block plus text-input native height candidate using `min-height: 27.6px`.
- Latest command: `corepack pnpm run smoke:roll20-full-root-candidates -- reports\roll20-actual-compare\2026-06-18-state-map-v1`.
- Result: the current direct best remains `normal-actual-root-width-source` at `8.58%` mismatch and `rootDelta 375.375px`.
- The combined `sandbox-inline-block-text-input-276-source` candidate is geometry-useful but visually worse: it nearly matches the full root height (`852x4122`, `rootDelta -0.656px`) and row 0/table 0 geometry (`row0 311.375px`, `table0 198.375px`, text input `27.594px`), but image mismatch worsens to `9.10%`.
- Fresh local baseline/diff/classifier after the diagnostic rerun:
  - `node scripts\roll20_actual_local_baseline.mjs --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures\visual --report-dir reports\roll20-actual-compare --run-label 2026-06-18-state-map-v1 --only official-roll20-Les-Oublies --state-map reports\visual-state-candidates\visual-state-candidates-state-map.json` PASS.
  - `node scripts\roll20_actual_screenshot_diff.mjs reports\roll20-actual-compare\2026-06-18-state-map-v1` still reports Les-Oublies sandbox mismatch `6.63%`.
  - `corepack pnpm run classify:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1` still classifies the fixture as `sheet root geometry/height differs after full-height capture`.
  - `corepack pnpm run diagnose:roll20-geometry -- reports\roll20-actual-compare\2026-06-18-state-map-v1` still ranks row 0 and row 3 wrapping as the active top gap.
- Interpretation: do not promote the diagnostic inline-block/native-input CSS to production yet. It proves a plausible geometry mechanism, but visual mismatch gets worse and the app local-preview screenshot remains closer than direct candidate renders. Next P0 is to compare actual Chrome-local preview against Roll20 Chrome or inspect the app preview path difference before adding generic renderer CSS.

## 2026-06-19 Source Preview vs Export Payload Geometry Split

- Added geometry capture to `scripts/roll20_payload_roundtrip_visual_smoke.mjs` so the local export-payload re-import path records the same row/table/input target geometry as the source-import baseline.
- Updated `scripts/roll20_geometry_delta_diagnostics.mjs` to read `payload-roundtrip-visual-results.json` and render separate `App Local Preview Geometry` and `Export Payload Preview Geometry` sections.
- Latest commands:
  - `corepack pnpm run smoke:payload-roundtrip -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --out-dir ./out --base-path /roll20-block-editor --report-dir reports\roll20-actual-compare\2026-06-18-state-map-v1\payload-roundtrip-visual --state-map reports\visual-state-candidates\visual-state-candidates-state-map.json --port 4340` returned FAIL overall because AW2E/YSHY are still outside the strict 2% local roundtrip gate, but Les-Oublies PASSed with `0%` source-vs-payload mismatch.
  - `corepack pnpm run diagnose:roll20-geometry -- reports\roll20-actual-compare\2026-06-18-state-map-v1` PASSed and now shows source preview and export payload preview have identical Les-Oublies geometry: both `850x3771`, both row 0 `553px`, both row 3 `274px`.
- Interpretation: for the currently uploaded generated Les-Oublies evidence, the remaining Roll20 delta is not caused by source import vs emitted payload drift. It is still the local Roll20 layout context versus actual Roll20 iframe layout context: actual row 0 is `310.6px`, local source/payload preview row 0 is `553px`, and direct candidate row 0 is `554px`.
- Additional computed evidence: row 0 child computed styles are mostly identical (`width: 380px`, `display: inline-block`, `word-spacing: 0px`, content-box, same margins), but actual Roll20 places child 2 at `x=459.775` while local wraps it to the next line. This points to subpixel inline-block fitting/whitespace/context behavior, not selector loss or payload cleanup.
- Claim boundary: this is still diagnostic evidence only. Do not ship a generic `word-spacing` or `font-size:0` patch until it improves visual mismatch, because prior candidates fixed geometry but worsened image diff.

## 2026-06-19 Geometry-Fit vs Pixel-Best Candidate Split

- Extended `scripts/roll20_full_root_candidate_smoke.mjs` with more diagnostic-only layout-context candidates:
  - actual root width `+1px` and `+2px`;
  - row width `calc(100% + 1px/2px)`;
  - `white-space: nowrap` with child `.sheet-col { white-space: normal }`;
  - nowrap plus text input native-height candidate.
- Added a separate `geometryFit` score and `bestGeometryCandidate` to the full-root smoke report, so future agents do not confuse the visually best candidate with the geometry closest candidate.
- Latest command: `corepack pnpm run smoke:roll20-full-root-candidates -- reports\roll20-actual-compare\2026-06-18-state-map-v1`.
- Latest result for Les-Oublies:
  - Pixel best remains `normal-actual-root-width-source`, mismatch `8.58%`, but its geometry is poor: score `1129.775`, root delta `375.375px`, row0/row3 deltas `243.4px/133.8px`.
  - Geometry best is `sandbox-nowrap-text-input-276-source`, score `8.606`, root delta `-0.656px`, row0/row3 deltas `0.775px/-3.2px`, but mismatch worsens to `9.09%`.
  - `row-width +1/+2px` and `actual root width +1/+2px` do not remove the wrapping and do not improve mismatch.
- Interpretation: the remaining issue is not a simple available-width off-by-one. The closest geometry candidate still loses on visual diff, so the next P0 is to inspect pixel mismatch areas/overlay for the geometry-best candidate and confirm whether the actual Roll20 screenshot state/crop/background differs before promoting any generic nowrap/native-input patch.
- Claim boundary: no production renderer CSS changed in this slice. This only improves diagnostics and prevents a false "geometry fixed = visual parity" claim.

## 2026-06-19 Full-Root Candidate Mismatch Distribution

- Added vertical, horizontal, and decile mismatch distribution capture to `scripts/roll20_full_root_candidate_smoke.mjs`.
- Latest command: `corepack pnpm run smoke:roll20-full-root-candidates -- reports\roll20-actual-compare\2026-06-18-state-map-v1`.
- Latest Les-Oublies result:
  - Pixel best `normal-actual-root-width-source`: mismatch `8.58%`, geometry score `1129.775`, root delta `375.375px`, dominant diff `top 12.35%`, `left 9.65%`, `d0 15.99%`.
  - Geometry best `sandbox-nowrap-text-input-276-source`: mismatch `9.09%`, geometry score `8.606`, root delta `-0.656px`, dominant diff `top 13.07%`, `left 9.83%`, `d1 20.18%`.
- Interpretation: the geometry-best candidate fixes root height and row 0/3 height but shifts or exposes a worse visual mismatch in the upper sheet region, especially vertical decile `d1`. Do not promote the diagnostic nowrap/native-input patch to production CSS yet.
- Follow-up verification passed: `node --check scripts\roll20_full_root_candidate_smoke.mjs`, `corepack pnpm run diagnose:roll20-geometry -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, and `corepack pnpm run classify:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1`.
- Claim boundary: this is still diagnostic only. AW2E/YSHY actual full-root screenshots are missing, and Les-Oublies still classifies as `sheet root geometry/height differs after full-height capture`.

## 2026-06-19 Actual Full-Root Crop/Stitch Suspect

- Extended `scripts/roll20_full_root_candidate_smoke.mjs` again so each candidate writes dominant decile crop triplets: actual, local, and overlay.
- Visual inspection of the geometry-best Les-Oublies crop (`sandbox-nowrap-text-input-276-source`, dominant `d1 412-824`) showed the actual crop includes Roll20 VTT toolbar/grid pixels on the left while the local crop is sheet-only.
- The full actual image `roll20-sandbox-root-full.png` also visibly contains repeated Roll20 VTT toolbar/grid context beside the sheet window, so it is not safe to treat that file as a clean sheet-root-only capture.
- Updated `scripts/roll20_actual_difference_classify.mjs` to read `roll20-sandbox-root-full.json` and classify this evidence as `actual full-root crop/stitch includes non-sheet context or scale mismatch` when full-image clipped segments are scaled into the claimed root width.
- Latest classifier evidence: Les-Oublies uses `8/8` full-image clipped segments with source width `682px` scaled to `852px`; next action is to recapture Roll20 full-root evidence with sheet-root-only clipping that excludes the VTT toolbar/grid before renderer CSS changes.
- Claim boundary: the previous full-root geometry/height findings are now lower-confidence until the actual Roll20 capture is normalized. This does not roll back local renderer work; it prevents a false CSS patch based on contaminated evidence.

## 2026-06-19 Chrome DPR Sheet-Root Capture Probe

- Used the logged-in Roll20 editor Chrome tab in read-only/scroll-capture mode only. Existing rooms/settings were not modified.
- CDP `DOM.getBoxModel` can identify the actual iframe `.charactersheet` box at about `x=431.4`, `y=167.3`, `w=852`, `h=4121.6` CSS pixels.
- A DPR-corrected screenshot clip (`x/y/w/h * 1.25`) produced a clean sheet-only visible crop, while the uncorrected clip still included left-side Roll20 grid context.
- A first attempt to automate multiple DPR-corrected segments timed out and produced an incomplete ignored manifest, so it was not promoted as valid evidence.
- Added `scripts/roll20_root_stitch_audit.mjs` and package script `corepack pnpm run audit:roll20-root-stitch -- <run-dir>` to fail suspect stitched-root evidence before renderer CSS conclusions are drawn.
- Latest audit against `reports\roll20-actual-compare\2026-06-18-state-map-v1` intentionally FAILs Les-Oublies: the old stitched full-root uses `8/8` full-image clipped segments scaled `682px -> 852px`, and the incomplete DPR manifest has top/coverage gaps.
- Next P0: rerun the Chrome capture in smaller chunks from true sheet top, generate a complete DPR-corrected sheet-root-only manifest, stitch it, then rerun stitch audit, screenshot diff, classifier, and geometry diagnostics.

## 2026-06-19 DPR-Corrected Roll20 Root Evidence Preferred

- Used the logged-in Roll20 editor Chrome tab only for the dedicated verification sandbox; existing rooms/settings were not modified.
- Complete DPR-corrected sheet-root-only evidence for Les-Oublies now exists locally as ignored `roll20-sandbox-root-full-dpr-corrected.png`, stitched from 8 Chrome/CDP root segments into `852x4122`.
- Updated diff/status/classifier/full-root-candidate helpers to prefer `roll20-sandbox-root-full-dpr-corrected.png` before legacy `roll20-sandbox-root-full.png`, visible root crops, or full viewport screenshots.
- `corepack pnpm run audit:roll20-root-stitch -- reports\roll20-actual-compare\2026-06-18-state-map-v1` now PASSes Les-Oublies, SKIPs AW2E/YSHY because they still lack stitched root metadata, and records the older scaled full-root stitch as superseded.
- `node scripts\roll20_actual_screenshot_diff.mjs reports\roll20-actual-compare\2026-06-18-state-map-v1` now reports generated Les-Oublies sandbox mismatch `6.57%` using DPR-corrected full-root evidence (`850x3771` local preview vs `852x4122` actual).
- `corepack pnpm run classify:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1` confirms `usedDprCorrectedFullRoot=true`, full-root stitch evidence is not suspect, and the remaining classification is `sheet root geometry/height differs after full-height capture`.
- `corepack pnpm run smoke:roll20-full-root-candidates -- reports\roll20-actual-compare\2026-06-18-state-map-v1` now finds diagnostic candidate `sandbox-inline-block-text-input-276-source` at `3.87%`, with root delta `-0.656px`, row0 delta `0.775px`, and row3 delta `-3.2px`.
- `corepack pnpm run diagnose:roll20-geometry -- reports\roll20-actual-compare\2026-06-18-state-map-v1` reports root delta `-0.656px` and top finding `TABLE.sheet-center-content`; row/table counts match for the best diagnostic candidate.
- Investigated the later `verify:roll20-preupload` failure at `payload-roundtrip`. Root cause was stale local baseline evidence, not confirmed export payload drift: AW2E/YSHY `local-baseline-results.json` lacked the newer preview geometry and their `local-preview.png` files came from an older render path, while Les-Oublies had been refreshed.
- Regenerated the local baseline for all three prepared fixtures with the same state map, then reran `corepack pnpm run smoke:payload-roundtrip -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --out-dir ./out --base-path /roll20-block-editor --state-map reports\visual-state-candidates\visual-state-candidates-state-map.json`; AW2E, Les-Oublies, and YSHY all PASSed with `0%` mismatch.
- Updated `scripts/roll20_preupload_verification.mjs` so `verify:roll20-preupload` first regenerates the local baseline and upload payloads for the selected run before running payload audit, sandbox sanitize audit, payload roundtrip, state selector audit, asset audit, and evidence guard.
- Rerunning `corepack pnpm run verify:roll20-preupload -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --fixtures test-fixtures\visual --out-dir ./out --base-path /roll20-block-editor --state-map reports\visual-state-candidates\visual-state-candidates-state-map.json` now PASSes all checks, including evidence guard.
- Claim boundary: this is stronger Roll20 actual-screen evidence and a much better renderer clue, not visual parity and not a production CSS patch. AW2E/YSHY generated actual screenshots and trustworthy chat screenshots remain missing.

## 2026-06-19 Full-Root Candidate Component Decomposition

- Updated `scripts/roll20_full_root_candidate_smoke.mjs` so each fixture's ignored candidate artifact directory is cleared before writing new screenshots/crops. This prevents stale dominant-crop PNGs from being mistaken for current evidence.
- Added diagnostic text-input-height-only candidates (`26`, `27`, `27.6`, `28px`) and a Component Effect Summary that compares each layout-context candidate against `sandbox-actual-root-width-source`.
- Latest command: `corepack pnpm run smoke:roll20-full-root-candidates -- reports\roll20-actual-compare\2026-06-18-state-map-v1`.
- Latest Les-Oublies result:
  - Pixel and geometry best remain `sandbox-inline-block-text-input-276-source`, mismatch `3.87%`, root delta `-0.656px`, geometry score `8.606`.
  - Text-input-height-only candidates do not improve pixel mismatch (`~6.25%-6.28%`) and worsen geometry/root height, so input height alone is not the root cause.
  - Inline-block whitespace/fit candidates provide most of the gain by removing the row wrap (`~4.35%-4.47%` before input-height combination).
  - The combined inline-block whitespace/fit plus input-height diagnostic reaches the best current score, but it is still not a production CSS patch because AW2E/YSHY actual full-root captures are missing.
- Follow-up verification passed: `node --check scripts\roll20_full_root_candidate_smoke.mjs`, `corepack pnpm run diagnose:roll20-geometry -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, and `corepack pnpm run classify:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1`.
- Claim boundary: this narrows the actual Roll20 mismatch to inline-block whitespace/fit behavior plus control-height interaction for Les-Oublies only. Do not claim Roll20 visual parity or all-sheet support.

## 2026-06-19 Missing Actual Evidence Handoff Tightening

- Reconnected to the user's logged-in Chrome Roll20 verification tabs and confirmed the dedicated sandbox settings/editor tabs are still open. Existing real rooms were not modified.
- Retried the standard file chooser upload flow against the sandbox tool inputs. The chooser path timed out before accepting the AW2E HTML file, matching the known Chrome extension file-upload blocker.
- Tried a lighter CDP-based inspection path, but deep Roll20 editor DOM/CDP calls timed out repeatedly because the editor page is very large. No new Roll20 actual screenshot was captured in this batch.
- Updated `scripts/roll20_upload_handoff.mjs`:
  - `--missing-only` now filters the rendered handoff report to fixtures that still need generated actual or chat evidence.
  - The report now records current evidence state, visible generated screenshot targets, DPR full-root target, stitch manifest path, stitch/audit/diff/status commands, and a clearer console `visibleEntries` count.
- Latest command: `corepack pnpm run handoff:roll20-upload -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --missing-only`.
  - It writes local-only ignored handoff evidence under `reports\roll20-actual-compare\2026-06-18-state-map-v1\roll20-upload-handoff`.
  - It lists AW2E and YSHY as missing generated actual + chat evidence, and Les-Oublies as missing chat evidence.
- Verification boundary: `corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --require-actual` still fails as expected with `PARTIAL_GENERATED_ACTUAL_SCREENSHOTS`, `generatedActualScreenshots=1/6`, and `commandGate=NEEDS_ACTION`.
- Next P0 remains actual Roll20 capture for AW2E/YSHY and trustworthy Roll20 chat screenshots. Do not promote the Les-Oublies diagnostic CSS candidate to production before that cross-fixture evidence exists.

## 2026-06-19 Endpoint Fallback Captured AW2E and YSHY Viewports

- Used only the dedicated Roll20 Custom Sheet Sandbox campaign `21639681`; existing rooms and existing chat archives were not modified.
- Reused the observed sandbox endpoint fallback for the two missing generated fixtures:
  - AW2E: POST `/sheetsandbox/savesheetsettings` accepted base64 `html`, `css`, and `translation`; `/campaigns/savesettings/21639681` saved the AW2E `customcharsheet_json`.
  - YSHY: the same endpoint/settings path accepted the larger generated payload and saved the YSHY `customcharsheet_json`.
- Reopened the sandbox character in the Roll20 editor. AW2E and YSHY both rendered in the character iframe; YSHY was additionally confirmed by iframe text markers such as `?�름`, `?�레?�어`, `직업`, `?�이`, `?�성`, and `근력`.
- Captured ignored local viewport evidence:
  - `reports/roll20-actual-compare/2026-06-18-state-map-v1/local-baseline/official-roll20-AW2E/screenshots/roll20-sandbox.png`
  - `reports/roll20-actual-compare/2026-06-18-state-map-v1/local-baseline/yshy-commission-1bu/screenshots/roll20-sandbox.png`
  - `reports/roll20-actual-compare/2026-06-18-state-map-v1/local-baseline/yshy-commission-1bu/screenshots/roll20-sandbox-dom-evidence.json`
- Latest actual screenshot diff:
  - AW2E sandbox mismatch `14.90%` from viewport evidence.
  - Les-Oublies sandbox mismatch `6.57%` from DPR-corrected full-root evidence.
  - YSHY sandbox mismatch `45.05%` from viewport evidence.
- Later status validation supersedes the AW2E viewport evidence as `SUSPECT`; the PNG remains local evidence but no longer counts as generated actual render proof without positive iframe DOM/root sidecar evidence.
- Latest classifier:
  - AW2E and YSHY classify as `viewport/crop/sheet size dominates current diff`.
  - Les-Oublies remains `sheet root geometry/height differs after full-height capture`.
- Latest status:
  - This section's old status count was superseded by the later status truthfulness gate. Current status reports `generatedActualScreenshots=2/6`, `generatedDiffed=2/6`, and AW2E `SUSPECT`.
  - `corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --require-actual` still fails as expected because all three `roll20-chat.png` screenshots are missing.
- Claim boundary: this section is superseded by the later AW2E blank recheck and status truthfulness gate. It does not prove all three prepared fixtures render in Roll20. Next P0 is file-input/full-activation verification for AW2E and trustworthy Roll20 chat screenshot/DOM-to-screenshot evidence.

## 2026-06-19 AW2E Legacy Manifest and Endpoint Blank Recheck

- Rechecked AW2E in the dedicated Roll20 Custom Sheet Sandbox before moving on to edit-mode work.
- Found a real local-baseline defect: AW2E's official source `sheet.json` declares `"legacy": true`, but `scripts/roll20_actual_local_baseline.mjs` had hard-coded every generated payload manifest to `"legacy": false`.
- Updated the local baseline generator to resolve legacy mode from fixture metadata or, for official Roll20 fixtures, the source `sheet.json` under `roll20-character-sheets-master`. Regenerating AW2E now writes payload `sheet.json` with `"legacy": true` and records the legacy source in the ignored local baseline report/readme.
- Applied the regenerated AW2E payload to the dedicated sandbox through the endpoint fallback. `/sheetsandbox/savesheetsettings` returned 200 for HTML/CSS/translation and `/campaigns/savesettings/21639681` returned 200 for `customcharsheet_json`, but reopening the sandbox character still produced an empty character iframe (`bodyLen=0`, no `.charactersheet`, no inputs/buttons).
- Applied the official AW2E source HTML/CSS/translation plus original official `sheet.json` through the same endpoint fallback. It also produced an empty character iframe.
- Attempted to restore the previously rendering YSHY generated payload through the same endpoint fallback afterward. The endpoint returned 200 for HTML/CSS/translation/settings, but reopening the sandbox character also produced an empty iframe. This makes the endpoint fallback suspect as a sheet activation path, not just as an AW2E-specific issue.
- Current conclusion: AW2E now proves the legacy manifest preservation bug, but live Roll20 evidence shows endpoint 200 responses are storage-only evidence unless a fresh iframe DOM/root check confirms rendering. Treat previous endpoint viewport evidence as suspect until the Roll20 file-input upload path, a full settings-form save path, or another sandbox activation condition is verified.
- Verification run after the code change: `node scripts\roll20_actual_local_baseline.mjs --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/roll20-actual-compare --run-label 2026-06-18-state-map-v1 --state-map reports/visual-state-candidates/visual-state-candidates-state-map.json --only official-roll20-AW2E --port 4392` PASS; `corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1` remains `PARTIAL_GENERATED_ACTUAL_SCREENSHOTS`; `corepack pnpm run guard:roll20-evidence -- reports\roll20-actual-compare\2026-06-18-state-map-v1` PASS.
- Claim boundary: this is a generator correctness fix plus a live Roll20 blocker discovery. It is not AW2E/YSHY visual parity and not edit-mode readiness.

## 2026-06-19 Actual Status Demotes Unproven Endpoint Viewports

- Rechecked the dedicated Roll20 sandbox settings page and found the real settings form submits many fields through `#settingsform` to `/campaigns/savesettings/21639681`; earlier endpoint fallback saves posted only `customcharsheet_json`, so those responses are insufficient activation proof.
- Clicked the visible `#save-changes-button` to submit the full settings form after restoring the YSHY manifest. Roll20 reported `Your changes were saved successfully`, but reopening the sandbox character still produced an empty iframe (`bodyLen=0`, no `.charactersheet`, no inputs/buttons).
- Tried the browser filechooser path against the in-editor Sheet Sandbox Tools. Clicking the visible HTML label did not open a chooser, and forcing the hidden `#sheetHtml` input also timed out. Raw CDP `DOM.setFileInputFiles` is blocked in this environment and explicitly redirects agents back to the filechooser flow.
- Updated `scripts/roll20_actual_status.mjs` so fallback `roll20-sandbox.png` counts only when a positive DOM/root sidecar proves the iframe rendered. DPR/full-root evidence with sidecars still counts; unproven fallback viewport images are reported as `SUSPECT` and excluded from generated evidence counts.
- Latest status command: `corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1` now reports `generatedActualScreenshots=2/6`, `generatedDiffed=2/6`, `roomObservationScreenshots=0/3`, and `roomObservationDiffed=0/3`. Fixture table: AW2E `SUSPECT`, Les-Oublies `DIFFED`, YSHY `DIFFED`.
- Claim boundary: this is a truthfulness fix to prevent endpoint-storage screenshots from masquerading as actual Roll20 render proof. It does not unblock file upload or prove visual parity.

## 2026-06-19 Actual Screenshot Diff Demotes Suspect Viewports

- Extended the same truthfulness rule into `scripts/roll20_actual_screenshot_diff.mjs`, not only the status summarizer.
- The screenshot diff now refuses to compare a fallback `roll20-sandbox.png` unless positive iframe DOM/root evidence proves the Roll20 sheet rendered.
- Preferred DPR/root captures still diff normally; fallback endpoint viewport PNGs without DOM evidence become `SUSPECT`.
- Latest rerun: `node scripts\roll20_actual_screenshot_diff.mjs reports\roll20-actual-compare\2026-06-18-state-map-v1`.
  - AW2E sandbox: `SUSPECT`.
  - Les-Oublies sandbox: `DIFFED`, mismatch `6.57%`.
  - YSHY sandbox: `DIFFED`, mismatch `22.93%`.
  - All room/chat targets: `SKIP`.
- Verification passed: `node --check scripts\roll20_actual_screenshot_diff.mjs`, `git diff --check`, `corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `corepack pnpm run guard:roll20-evidence -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `corepack pnpm run lint`, and `corepack pnpm run build`.
- Claim boundary: this is stricter evidence handling, not Roll20 visual parity. Next P0 remains AW2E file-input/full activation with positive DOM/root evidence and trustworthy Roll20 chat screenshots before renderer CSS promotion.

## 2026-06-19 Upload Handoff Uses Same Evidence Gate

- Reclaimed the dedicated Roll20 editor Chrome tab for read-only observation. Existing rooms were not modified.
- Ordinary page DOM reads could not access the Roll20 character iframe; the relevant iframes returned no `contentDocument`.
- The current Chrome runtime also blocks CDP `Target.getTargets` and `Target.setAutoAttach`, so this batch did not capture a new actual Roll20 iframe DOM/root screenshot.
- Updated `scripts/roll20_upload_handoff.mjs` so handoff/missing-only mode uses the same generated-sheet evidence rule as `roll20_actual_status` and `roll20_actual_screenshot_diff`.
  - Root screenshots require a sidecar/manifest.
  - Fallback `roll20-sandbox.png` requires positive `roll20-sandbox-dom-evidence.json`.
  - Otherwise the handoff marks the fixture `SUSPECT` and still needing generated actual evidence.
- Latest command: `corepack pnpm run handoff:roll20-upload -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --missing-only`.
  - AW2E: `SUSPECT`, still needs generated actual evidence and chat.
  - Les-Oublies: generated actual evidence present, still needs chat.
  - YSHY: generated actual evidence present, still needs chat.
- Verification passed: `node --check scripts\roll20_upload_handoff.mjs`, `corepack pnpm run handoff:roll20-upload -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --missing-only`, `corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `node scripts\roll20_actual_screenshot_diff.mjs reports\roll20-actual-compare\2026-06-18-state-map-v1`, `corepack pnpm run guard:roll20-evidence -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `corepack pnpm run lint`, and `corepack pnpm run build`.
- Claim boundary: this removes another stale/false-success path from agent handoff. It does not solve Roll20 upload activation or prove visual parity.

## 2026-06-19 Chat DOM Evidence Is Not Chat Visual Evidence

- Updated `scripts/roll20_actual_status.mjs` so the `chat` target distinguishes missing screenshot, DOM-only evidence, screenshot-only evidence, and screenshot plus DOM sidecar.
- Updated `scripts/roll20_upload_handoff.mjs` with the same chat evidence split.
- Latest status/handoff rerun:
  - AW2E: missing `roll20-chat.png`.
  - Les-Oublies: `chat-dom-only`; Roll20 chat DOM evidence exists, but `roll20-chat.png` is missing.
  - YSHY: missing `roll20-chat.png`.
- Interpretation: local app chat smoke can stay useful, but actual Roll20 rolltemplate/chat visual parity remains unverified until trustworthy chat screenshots are captured.
- Verification passed: `node --check scripts\roll20_actual_status.mjs`, `node --check scripts\roll20_upload_handoff.mjs`, `corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `corepack pnpm run handoff:roll20-upload -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --missing-only`, `node scripts\roll20_actual_screenshot_diff.mjs reports\roll20-actual-compare\2026-06-18-state-map-v1`, `corepack pnpm run guard:roll20-evidence -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `corepack pnpm run lint`, and `corepack pnpm run build`.

## 2026-06-19 Local ChatPane Roll20 Shell Alignment

- Rewrote `components/editor/ChatPane.tsx` copy that was still mojibake into readable Korean.
- Wrapped local chat output in Roll20-like structural classes:
  - `.textchatcontainer.withoutavatars` around the chat list.
  - `.message.general` on each chat card.
  - `.spacer`, `.by`, and `.tstamp` inside each card.
- Kept rolltemplate cards constrained to the Roll20-style 280px width used by the existing smoke.
- Updated `scripts/rolltemplate_chat_smoke.mjs` so PASS now requires the shell markers as well as rolltemplate kind, one visible card, <=300px width, and no debug template label.
- Latest local smoke: `node scripts\rolltemplate_chat_smoke.mjs --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/rolltemplate-chat-smoke --port 4411`.
  - AW2E, Les-Oublies, and YSHY all PASS.
  - All three produced rolltemplate cards at 280px with `textchatcontainer`, `message`, `spacer`, `by`, and `tstamp` present.
- Claim boundary: this improves local Roll20-chat comparison readiness. Actual Roll20 chat visual parity still requires trustworthy `roll20-chat.png` evidence.

## 2026-06-19 Imported Edit Sync Smoke Hardening

- Re-ran actual-status and upload-handoff summaries for `reports\roll20-actual-compare\2026-06-18-state-map-v1`; Roll20 actual evidence remains partial at `generatedActualScreenshots=2/6`, with no room screenshots and missing trustworthy chat screenshots.
- Re-ran local edit flow smoke on port 4421; it PASSed and confirmed readable Korean edit UI copy, no mojibake in the edit panel text sample, inside/before/after canvas indicators, layer role/drop affordances, nested reorder, absolute-inside-frame movement, and free placement inside a frame.
- Re-ran preview/edit visual smoke on port 4422; AW2E, Les-Oublies, and YSHY 1BU PASSed with diagnostic mismatches of 1.87%, 2.07%, and 1.02%. This is local preview/edit evidence only.
- Hardened `scripts/imported_edit_sync_smoke.mjs`: non-leaf layer reorder candidates now require a true sibling target with the same parent/depth, preventing parent/child containers from masquerading as sibling reorder targets; free absolute-in-frame checks no longer rely on a naive first closing tag after DOM nesting is already proven.
- Latest imported edit sync rerun on port 4424 PASSed all 3 prepared fixtures. AW2E/YSHY still have external-image resource WARNs, so visual parity remains unproven.
## 2026-06-19 Chat Page Screenshot Rejected As Chat Evidence

- Tightened the actual Roll20 chat evidence gate again: `roll20-chat-page.png` is now reported separately from `roll20-chat.png`.
- Les-Oublies currently has Roll20 chat DOM evidence plus `roll20-chat-page.png`, but no trustworthy `roll20-chat.png`; status reports `chat-dom-page-screenshot-only` and handoff reports `DOM_PAGE_ONLY`.
- The handoff report now lists current existence for screenshot targets, including `chatPage`, so agents can see that a page screenshot exists without mistaking it for rolltemplate/chat visual evidence.
- AW2E and YSHY still have missing chat screenshots. Actual Roll20 rolltemplate visual parity remains unverified.
## 2026-06-19 State Visibility Diagnostic Uses Current Prefix Model

- Updated `scripts/roll20_state_visibility_diagnostics.mjs` so its report detects that local Roll20 Sandbox expected-render paths already use `sanitizeRoll20SandboxCss(..., { prefixSelectors: false })`.
- The diagnostic still reports Les-Oublies as `ACTUAL_CSS_STATE_SELECTORS_DO_NOT_MATCH_PREFIXED_HTML`, because actual Roll20 CSSOM state anchors are unprefixed while HTML anchors are `sheet-` prefixed and 9 sampled panels remain visible.
- The report no longer tells agents to patch the local expected path for blanket selector-prefix behavior when that patch already exists. Next checks now point to cross-fixture re-verification and local Sandbox expected visibility comparison before renderer CSS changes.
- Claim boundary: this is a report-truthfulness change, not Roll20 visual parity and not a production renderer CSS patch.
## 2026-06-19 Local Expected Visibility Matches Les-Oublies Actual Sample

- Extended `scripts/roll20_state_visibility_diagnostics.mjs` to render payload HTML/CSS in a local Roll20 wrapper and compare panel visibility against the captured actual Roll20 panel selector set.
- Latest Les-Oublies rerun reports local Sandbox expected panel visibility matches actual sampled visibility `9/9`.
- Interpretation: for this captured fixture, do not chase more state-selector changes before geometry/assets/control styling; the state behavior still needs cross-fixture re-verification because AW2E lacks trusted root evidence and chat screenshots are missing.
- Claim boundary: this is local diagnostic narrowing, not Roll20 visual parity.
## 2026-06-19 State Visibility Adds Sampled Height Deltas

- Extended `scripts/roll20_state_visibility_diagnostics.mjs` again so local expected panel samples include actual height, local height, and delta.
- Latest Les-Oublies lightweight-wrapper sample still matches panel visibility `9/9`, and its largest sampled panel deltas are `.sheet-section-competences` +496.872px and `.sheet-skills` +496.272px.
- Claim boundary: these height deltas are triage clues from a lightweight wrapper, not a production CSS fix. Use the full-root candidate smoke and actual Roll20 captures as stronger renderer evidence before patching generic CSS.
## 2026-06-19 Renderer Action Gate Holds Production CSS

- Added `scripts/roll20_renderer_action_gate.mjs` and package command `corepack pnpm run gate:roll20-renderer-action -- <run-dir>`.
- The gate consolidates actual status, full-root candidate smoke, state visibility, and geometry diagnostics into one renderer-action recommendation.
- Latest run for `reports\roll20-actual-compare\2026-06-18-state-map-v1` reports `HOLD_PRODUCTION_RENDERER_PATCH`.
- Blockers: AW2E lacks trusted generated root evidence, all Roll20 chat screenshots are missing, only 2/3 fixtures have full-root candidates, and the best diagnostic patch is not uniform (`inline-block+text-input-height` for Les-Oublies vs `text-input-height` for YSHY).
- Positive evidence: Les-Oublies diagnostic best is 3.87% with root delta -0.656px; YSHY best is 4.28% with root delta -0.375px; local Sandbox expected panel visibility matches actual sampled panels for Les-Oublies.
- Claim boundary: this is a safety gate to prevent premature renderer CSS promotion, not visual parity.

## 2026-06-19 Roll20 Browser Recheck: File Upload Still Blocked, Chat Evidence Reset

- Reclaimed the dedicated Roll20 editor and sandbox settings tabs for the Custom Sheet Sandbox only; no existing room was modified.
- The sandbox settings page still had the YSHY `customcharsheet_json` manifest active, so AW2E cannot be considered the currently loaded generated sheet.
- Retried the visible `Sheet Sandbox Tools` HTML file chooser against the AW2E payload. Chrome still returned `fileChooser.setFiles failed` with `Not allowed`, matching the documented extension file-access blocker.
- A first chat-pane screenshot attempt used uncorrected CSS coordinates and captured the sandbox tools dialog, not chat. The bad local `roll20-chat.png` was removed.
- A DPR-corrected chat-pane screenshot captured the real Roll20 chat panel, but the current panel showed only default chat tips and invite text, not a rolltemplate card.
- Refreshed `roll20-chat-dom-evidence.json` for Les-Oublies from the current DOM; it now records 5 messages and 0 rolltemplates. Latest status is back to `generatedActualScreenshots=2/6`, `generatedDiffed=2/6`.
- Claim boundary: there is still no trustworthy Roll20 chat visual evidence, and AW2E still lacks trusted generated root evidence.

## 2026-06-19 Chat Evidence Gate Requires Fresh Rolltemplate Sidecar

- Hardened `scripts/roll20_actual_status.mjs`, `scripts/roll20_actual_screenshot_diff.mjs`, and `scripts/roll20_upload_handoff.mjs` so `roll20-chat.png` is not trusted by itself.
- Chat evidence now requires a `roll20-chat-dom-evidence.json` sidecar with rendered rolltemplate markers.
- The chat PNG and DOM sidecar must be fresh relative to each other; stale pairs are reported as suspect instead of proof.
- Temporary regression check copied a local PNG into the Les-Oublies chat target while the current sidecar had 0 rolltemplates. Status stayed `generatedActualScreenshots=2/6`, and screenshot diff reported Les-Oublies chat `SUSPECT`. The temporary PNG was removed.
- Current actual status remains `PARTIAL_GENERATED_ACTUAL_SCREENSHOTS`; no Roll20 chat visual parity claim is allowed.

## 2026-06-19 Export Dialog Actual-Roll20 Evidence Boundary

- Updated `components/editor/ExportDialog.tsx` so the Roll20 upload readiness panel separates local zip readiness from browser upload permission and actual Roll20 screenshot verification.
- The readiness panel now has a distinct browser upload permission item and states that Chrome file chooser blocking requires enabling file URL access for the Codex extension before retrying upload.
- The dialog also states that downloading a zip is not proof that Roll20 will display the sheet correctly.
- Updated `scripts/export_dialog_browser_smoke.mjs` so the smoke requires 6 readiness items plus the file-access blocker copy and zip-is-not-proof copy.
- Verification passed after rebuilding static output: empty-workspace `corepack pnpm run smoke:export-dialog -- --out-dir ./out --base-path /roll20-block-editor --report-dir reports/export-dialog-smoke --port 4432`, imported Les-Oublies fixture `corepack pnpm run smoke:export-dialog -- --out-dir ./out --base-path /roll20-block-editor --report-dir reports/export-dialog-smoke-imported --fixtures test-fixtures/visual --fixture official-roll20-Les-Oublies --port 4433`, `corepack pnpm run lint`, `corepack pnpm run build`, `corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `corepack pnpm run gate:roll20-renderer-action -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `corepack pnpm run guard:roll20-evidence -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, and `git diff --check`.
- Claim boundary: this improves user-facing truthfulness around the upload blocker. It does not unblock Chrome file chooser upload, does not add AW2E trusted root evidence, and does not prove Roll20 visual parity.

## 2026-06-19 Sandbox Upload Snippet Fallback

- Added `scripts/roll20_upload_snippet.mjs` and package command `corepack pnpm run snippet:roll20-upload`.
- The helper generates ignored, local-only browser snippets under the Roll20 upload handoff folder. The snippets embed source-derived payload files, create in-page `File` objects, dispatch `change` on Roll20 Sandbox Tools inputs, and fill `customcharsheet_json` when the settings field exists.
- Updated `scripts/roll20_upload_handoff.mjs` and `scripts/README.md` to point agents to this fallback when Chrome file chooser upload remains blocked.
- Verification passed: `node --check scripts\roll20_upload_snippet.mjs`, `node --check scripts\roll20_upload_handoff.mjs`, `corepack pnpm run snippet:roll20-upload -- reports\roll20-actual-compare\2026-06-18-state-map-v1 official-roll20-AW2E`, `node --check reports\roll20-actual-compare\2026-06-18-state-map-v1\roll20-upload-handoff\snippets\official-roll20-AW2E-upload-snippet.js`, and `corepack pnpm run handoff:roll20-upload -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --missing-only`.
- Claim boundary: this reduces the upload blocker but does not itself upload to Roll20 or prove visual parity. Actual screenshot evidence is still required.
## 2026-06-19 Chrome Read-Only Check After Snippet Generator

- Reconnected to the existing Chrome Roll20 session and listed Roll20 tabs.
- Found the dedicated editor tab `https://app.roll20.net/editor` and settings tab `https://app.roll20.net/sheetsandbox/settings/21639681` still open.
- Claimed the editor tab read-only and confirmed the visible snapshot still contains `Sheet Sandbox Tools`, but hidden file input ids such as `sheetHtml`, `sheetCss`, and `sheetTranslation` were not exposed in the current snapshot. No upload or page mutation was performed.
- The browser runtime's Playwright evaluate surface is read-only, so the generated upload snippet was not executed through that path in this batch.
- Claim boundary: the snippet generator is ready, but actual Roll20 upload/root/chat evidence is still missing until the snippet or normal file chooser is run in the dedicated sandbox and screenshots are captured.

## 2026-06-19 AW2E Actual Roll20 Render Evidence Captured

- Reclaimed only the dedicated Roll20 Custom Sheet Sandbox editor tab. Existing rooms and private chat/log tabs were not modified.
- The editor snapshot showed the verification character sheet tab with generated AW2E controls visible: `Angel`, `Battlebabe`, `Brainer`, `Child-Thing`, `Chopper`, `Driver`, `Faceless`, `GunLugger`, and `Hardholder`.
- Saved ignored local evidence:
  - `reports/roll20-actual-compare/2026-06-18-state-map-v1/local-baseline/official-roll20-AW2E/screenshots/roll20-sandbox.png`
  - `reports/roll20-actual-compare/2026-06-18-state-map-v1/local-baseline/official-roll20-AW2E/screenshots/roll20-sandbox-dom-evidence.json`
  - `reports/roll20-actual-compare/2026-06-18-state-map-v1/live-iframe-probe/official-roll20-AW2E-live-character-sheet-viewport.png`
- Verification after capture:
  - `corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1`: `generatedActualScreenshots=3/6`, then after diff `generatedDiffed=3/6`.
  - `node scripts\roll20_actual_screenshot_diff.mjs reports\roll20-actual-compare\2026-06-18-state-map-v1`: AW2E sandbox diffed at `14.01%`.
  - `corepack pnpm run gate:roll20-renderer-action -- reports\roll20-actual-compare\2026-06-18-state-map-v1`: still `HOLD_PRODUCTION_RENDERER_PATCH`.
  - `corepack pnpm run guard:roll20-evidence -- reports\roll20-actual-compare\2026-06-18-state-map-v1`: PASS.
- Claim boundary: AW2E now has actual Roll20 render evidence for the generated sheet, but not full-root evidence, not Roll20 chat/rolltemplate visual evidence, and not visual parity.

## 2026-06-19 AW2E Actual Roll20 Rolltemplate Chat Evidence Captured

- Continued in the same dedicated Roll20 Custom Sheet Sandbox editor tab; no existing room or private room log was modified.
- Clicked a visible AW2E stat roll button in the actual Roll20 sheet, submitted the Roll20 macro option dialog, and observed a new Roll20 chat message.
- Saved ignored local evidence:
  - `reports/roll20-actual-compare/2026-06-18-state-map-v1/local-baseline/official-roll20-AW2E/screenshots/roll20-chat.png`
  - `reports/roll20-actual-compare/2026-06-18-state-map-v1/local-baseline/official-roll20-AW2E/screenshots/roll20-chat-dom-evidence.json`
- The final screenshot was captured with CDP device-pixel coordinates because normal screenshot clipping mixed Roll20 CSS coordinates with Windows/Chrome scaling. The screenshot shows the actual Roll20 `#textchat` panel and the AW2E `.sheet-rolltemplate-aw` card.
- Verification after capture:
  - `corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1`: `generatedActualScreenshots=4/6`, `generatedDiffed=4/6`.
  - `node scripts\roll20_actual_screenshot_diff.mjs reports\roll20-actual-compare\2026-06-18-state-map-v1`: AW2E chat diffed at `58.97%` against the local chat render. This is evidence of a large remaining local-vs-actual chat visual gap, not parity.
  - `corepack pnpm run handoff:roll20-upload -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --missing-only`: visible entries reduced to Les-Oublies and YSHY.
  - `corepack pnpm run gate:roll20-renderer-action -- reports\roll20-actual-compare\2026-06-18-state-map-v1`: still `HOLD_PRODUCTION_RENDERER_PATCH`.
- Claim boundary: AW2E now has actual Roll20 generated-sheet and rolltemplate/chat evidence. Roll20 visual parity is still not proven; Les-Oublies/YSHY chat evidence, cross-fixture full-root evidence, and a uniform renderer fix remain P0 before edit-mode UX work should become the main focus.

## 2026-06-19 Roll20 Actual Evidence And Chat Shell Slice

- Generated-sheet actual Roll20 evidence is now present and diffed for the current run: `corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1` reports `GENERATED_ACTUAL_SCREENSHOTS_DIFFED`, `generatedActualScreenshots=6/6`, and `generatedDiffed=6/6`.
- `scripts/roll20_renderer_action_gate.mjs` now separates generated Sandbox/chat evidence from optional solo-room observation evidence. Missing `roll20-room.png` files no longer create a false generated-evidence blocker.
- Production renderer CSS remains gated: `gate:roll20-renderer-action` is still `HOLD_PRODUCTION_RENDERER_PATCH` because only 2/3 fixtures have full-root candidates and Les-Oublies/YSHY prefer different diagnostic patch families.
- `components/editor/ChatPane.tsx` now uses a Roll20-derived `textchatcontainer` / `message` / `spacer` / `by` / `tstamp` shell instead of app-card wrappers, and the remaining broken Korean chat labels were replaced.
- `scripts/rolltemplate_chat_smoke.mjs` now measures message width separately from inner rolltemplate width, matching actual Roll20 evidence where the sidebar message is wider than the rendered template card.
- Latest local verification: `node scripts\rolltemplate_chat_smoke.mjs --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/rolltemplate-chat-smoke --port 4411` PASS for AW2E, Les-Oublies, and YSHY. This is local app evidence only; actual Roll20 chat screenshots still mismatch heavily and visual parity is not proven.
## 2026-06-19 Sandbox Settings Manifest Wrapper

- Updated the Sandbox upload snippet so `customcharsheet_json` receives the settings-page wrapper shape `{ sheet, userOptions, jsoninfo }` while the exported zip payload keeps its plain `sheet.json`.
- Updated `docs/operations/37_roll20_actual_verification.md` to record that endpoint/file-input/settings success is storage/configuration evidence only until fresh iframe DOM/root evidence proves the sheet rendered.
- Verification passed: `node --check scripts\roll20_upload_snippet.mjs`, `corepack pnpm run snippet:roll20-upload -- reports\roll20-actual-compare\2026-06-18-state-map-v1 official-roll20-AW2E`, `node --check reports\roll20-actual-compare\2026-06-18-state-map-v1\roll20-upload-handoff\snippets\official-roll20-AW2E-upload-snippet.js`, `corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `corepack pnpm run gate:roll20-renderer-action -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, and `corepack pnpm run guard:roll20-evidence -- reports\roll20-actual-compare\2026-06-18-state-map-v1`.
- Claim boundary: this fixes a Roll20 settings fallback shape trap for future uploads. It does not change the renderer, does not prove visual parity, and the renderer gate remains `HOLD_PRODUCTION_RENDERER_PATCH`.
## 2026-06-19 Renderer Gate Next-Action Precision

- Updated `scripts/roll20_renderer_action_gate.mjs` so its blockers and next actions match the latest evidence state.
- The gate now explicitly names `official-roll20-AW2E` as missing full-root candidate comparison while keeping generated sandbox/chat evidence separate.
- Latest rerun: `corepack pnpm run gate:roll20-renderer-action -- reports\roll20-actual-compare\2026-06-18-state-map-v1` still returns `HOLD_PRODUCTION_RENDERER_PATCH`, now with targeted next actions: capture/stitch AW2E DPR-corrected full-root evidence, compare differing diagnostic patch families, and keep diagnostic CSS out of production until behavior repeats across fixtures.
- Claim boundary: this is gate truthfulness and next-action hygiene. It does not render a new Roll20 screenshot and does not prove visual parity.
## 2026-06-19 Roll20 Screenshot MIME Hardening

- During AW2E full-root capture attempts, the Chrome screenshot surface returned JPEG bytes for some files that had been saved with `.png` names. Existing reports still loaded, but extension-based MIME selection is too fragile for Roll20 actual evidence.
- Updated actual evidence image loaders in screenshot diff, crop, stitch, visible-crop diagnostics, same-context visible smoke, and full-root candidate smoke to sniff PNG/JPEG magic bytes before building data URLs.
- Rerun evidence stayed stable: actual screenshot diff still reports AW2E sandbox 14.01%, Les-Oublies sandbox 6.57%, YSHY sandbox 22.93%; full-root candidate smoke still compares Les-Oublies and YSHY while skipping AW2E full-root; renderer gate still holds production CSS.
- Claim boundary: this is evidence pipeline hardening. It does not add trusted AW2E full-root evidence and does not prove Roll20 visual parity.

## 2026-06-19 AW2E Overlap Stitch Diagnostic

- Captured five ignored local AW2E Roll20 editor/root scroll segments under `reports/roll20-actual-compare/2026-06-18-state-map-v1/local-baseline/official-roll20-AW2E/screenshots/` after the visible editor showed generated AW2E controls.
- Added `scripts/roll20_overlap_stitch_diagnostic.mjs` and package command `corepack pnpm run stitch:roll20-overlap-diagnostic` to visually stitch scrolled segments by overlap when iframe DOM/scrollTop remains unreadable.
- Generated ignored diagnostic output `aw2e-overlap-stitch-diagnostic.png` at `720x2093` from five segment JPGs. It is useful for continuity inspection, but visible seams remain, so it is not trusted full-root evidence and must not be renamed/promoted to `roll20-sandbox-root-full-dpr-corrected.png`.
- Claim boundary: this is actual Roll20 evidence-pipeline work only. It does not change the renderer, does not prove Roll20 visual parity, and the next action remains stricter DPR-corrected AW2E full-root capture/manifest or a validated stitch path before production renderer CSS changes.
## 2026-06-19 AW2E Dense Segment And Root Audit Gate

- Reclaimed the dedicated Roll20 Sandbox editor tab and confirmed AW2E controls are visible through the browser visible-DOM path even though the top-level page body does not expose iframe sheet text.
- Tried to refresh/reapply the AW2E payload through the existing snippet, CDP `DOM.setFileInputFiles`, and the documented file chooser route. The snippet could not attach files, CDP explicitly rejected `DOM.setFileInputFiles`, and the file chooser timed out in this Chrome extension environment. No existing room was modified.
- Captured a denser ignored local AW2E segment set, `aw2e-dense-scroll-segment-00..09.jpg`, from the visible Roll20 iframe area. The overlap diagnostic output is `aw2e-dense-overlap-stitch-diagnostic.png` at `720x3418`; overlap scores are stable enough for investigation, but this remains diagnostic-only evidence.
- Updated `scripts/roll20_root_stitch_audit.mjs` so overlap stitch JSON files are reported as `DIAGNOSTIC_ONLY`, not silently ignored or treated as trusted full-root evidence.
- Updated `scripts/roll20_renderer_action_gate.mjs` so the AW2E blocker now says it has only overlap diagnostic evidence and names the best diagnostic file/segment count/max score.
- Latest gate remains `HOLD_PRODUCTION_RENDERER_PATCH`: AW2E still lacks trusted DPR-corrected full-root evidence, only 2/3 fixtures have full-root candidate comparisons, and Les-Oublies/YSHY still prefer different diagnostic patch families.
- Claim boundary: this improves actual evidence truthfulness and gives future agents a clearer next action. It does not prove Roll20 visual parity and does not justify production renderer CSS changes.
## 2026-06-19 Diagnostic-Only AW2E Candidate Comparison

- Updated `scripts/roll20_full_root_candidate_smoke.mjs` so overlap-stitch full-root images can be compared as `DIAGNOSTIC_COMPARED` while keeping trusted `bestCandidate` empty.
- AW2E diagnostic-only full-root comparison now reports `sandbox-text-input-270-source` at `7.93%`, with local root height delta `+10398.063px`. This is useful for triage, but it strongly reinforces that the overlap stitch is not trusted full-root evidence.
- Updated `scripts/roll20_renderer_action_gate.mjs` to read `diagnosticBestCandidate`, print it as a `WARNING`, and keep trusted renderer blockers unchanged.
- Latest gate remains `HOLD_PRODUCTION_RENDERER_PATCH`: AW2E has only diagnostic full-root comparison, trusted full-root evidence remains 2/3 fixtures, and patch-family agreement is still missing.
- Claim boundary: this expands root-cause visibility without making any visual parity or production renderer claim.

## 2026-06-19 AW2E Long Diagnostic Full-Root Capture

- Reclaimed the dedicated Roll20 Sandbox editor tab that exposes AW2E controls through the visible DOM and captured a longer ignored local segment set, `aw2e-long-scroll-segment-00..37.jpg`, from the visible iframe area.
- The long overlap diagnostic stitched to `aw2e-long-overlap-stitch-diagnostic.png` at `720x12062` from 38 segments. The last captured segment repeated, so the scroll likely reached the bottom of the visible Roll20 sheet viewport.
- Rerunning `smoke:roll20-full-root-candidates` changed AW2E from `sandbox-text-input-270-source` at `7.93%` / root delta `+10398.063px` to `normal-actual-root-width-source` at `8.87%` / root delta `+1726.938px`.
- Interpretation: the earlier 10-segment diagnostic was too short. The remaining 1726px height gap is still too large for renderer CSS work and likely needs trusted DPR-corrected capture, better coverage validation, or default/hidden-state investigation.
- Updated `scripts/roll20_renderer_action_gate.mjs` so large diagnostic root-height deltas create an explicit next action. Latest gate remains `HOLD_PRODUCTION_RENDERER_PATCH`.
- Claim boundary: this is stronger actual Roll20 diagnostic evidence, not visual parity and not trusted full-root evidence.

## 2026-06-19 AW2E Overlap Transition Quality Audit

- Added transition summary output to `scripts/roll20_overlap_stitch_diagnostic.mjs`: median/min/max scroll advance, median/min/max overlap score, low-advance transitions, high-score transitions, and median segment height.
- Updated `scripts/roll20_root_stitch_audit.mjs` so overlap diagnostics are easier to triage from the markdown table instead of opening each JSON sidecar.
- Latest regenerated AW2E long diagnostic metadata reports 37 transitions, median advance `321px`, one low-advance transition at the bottom (`35 -> 36`, advance `23px`), and zero high-score transitions.
- Latest `audit:roll20-root-stitch` still leaves AW2E as `SKIP` / diagnostic-only, while Les-Oublies and YSHY remain PASS on trusted DPR-corrected root evidence.
- Claim boundary: this narrows the AW2E blocker toward capture coverage/default-state/root-height drift. It does not validate the overlap stitch as trusted full-root evidence and does not authorize production renderer CSS.

## 2026-06-19 AW2E Duplicate Segment Capture Audit

- Chrome could still claim the dedicated Roll20 Sandbox editor tab and confirm AW2E controls in the visible snapshot. The ordinary page DOM still cannot read the character iframe internals, and CDP `Target.setAutoAttach` / `Target.getTargets` remain unsupported in the extension surface.
- A small screenshot-clip probe confirmed the visible iframe clip is capturable and returns `720x502` JPEG bytes; after focusing the iframe, scroll changes the captured image. This confirms visual scrolling is possible, but it still does not expose trustworthy `scrollTop` or root-height metadata.
- Added duplicate segment hashing to the overlap diagnostic and root-stitch audit path. The latest AW2E long diagnostic has 38 segments with one duplicate group: segments 36 and 37 are byte-identical.
- Latest renderer gate still holds production CSS and now exposes the duplicate-segment clue in the blocker: AW2E best diagnostic `aw2e-long-overlap-stitch-diagnostic.json`, 38 segments, max score `6.605`, duplicate segments `2`.
- Claim boundary: the blocker is now more precise. AW2E needs a true DPR-corrected manifest/root capture or another verified scroll metadata source; the current overlap stitch remains diagnostic-only.

## 2026-06-19 Trusted Stitch Duplicate Guard

- Hardened the trusted full-root path, not just the diagnostic path: `roll20_actual_stitch_root.mjs` now writes segment hash summaries into stitched metadata, and `roll20_root_stitch_audit.mjs` fails trusted stitched metadata or capture manifests that reuse byte-identical segment images.
- This prevents a repeated bottom viewport frame from being accidentally stitched and counted as DPR-corrected full-root evidence.
- Verification: `node --check` for the changed scripts, `audit:roll20-root-stitch`, `gate:roll20-renderer-action`, and `status:roll20-actual` all pass on `2026-06-18-state-map-v1`. Les-Oublies/YSHY remain trusted PASS; AW2E remains diagnostic-only SKIP.
- Claim boundary: this is evidence-hardening toward Roll20 parity. It does not add AW2E trusted root evidence and does not change renderer CSS.

## 2026-06-19 Actual Status Truthfulness Split

- Updated `scripts/roll20_actual_status.mjs` so generated screenshot/diff completeness is reported separately from trusted full-root coverage and renderer readiness.
- Latest status on `2026-06-18-state-map-v1`: generated actual screenshots `6/6`, generated diffs `6/6`, trusted full-root `2/3`, renderer action `HOLD_PRODUCTION_RENDERER_PATCH`, rendererReady `NO`.
- Claim boundary: this is truthfulness/reporting hardening only. It does not add AW2E trusted root evidence and does not authorize production renderer CSS.

## 2026-06-19 Renderer Ready Gate

- Added `--require-renderer-ready` to `scripts/roll20_actual_status.mjs` and package alias `gate:roll20-renderer-ready`.
- Verified the gate currently fails as expected on `2026-06-18-state-map-v1`: generated actual screenshots/diffs `6/6`, trusted full-root `2/3`, renderer action `HOLD_PRODUCTION_RENDERER_PATCH`, rendererReady `NO`.
- Claim boundary: this prevents false production-readiness claims. It does not add AW2E trusted root evidence.

## 2026-06-19 AW2E Root Capture Plan Tool

- Added `scripts/roll20_root_capture_plan.mjs` and package alias `plan:roll20-root-capture`.
- The ignored report for `2026-06-18-state-map-v1 official-roll20-AW2E` now states: generated screenshots/diffs `6/6`, trusted full-root `2/3`, renderer action `HOLD_PRODUCTION_RENDERER_PATCH`, rendererReady `NO`, trusted examples `2`, planned missing fixture `1`.
- The AW2E plan lists the three required trusted-root outputs, the existing diagnostic-only segment captures, a browser metrics snippet, and the exact stitch/audit/diff/renderer-ready commands to run after recapture.
- Claim boundary: this is recapture handoff automation only. It does not add trusted AW2E full-root evidence and does not prove Roll20 visual parity.

## 2026-06-19 Root Capture Plan Linkage

- Wired `plan:roll20-root-capture` into `scripts/roll20_actual_status.mjs`, `scripts/roll20_renderer_action_gate.mjs`, and `scripts/roll20_upload_handoff.mjs` so the next action is no longer a prose-only instruction.
- Verified generated markdown for `2026-06-18-state-map-v1` includes the AW2E root capture plan command in actual status, renderer action gate, and upload handoff outputs.
- Claim boundary: this is workflow/handoff alignment. It does not add trusted AW2E root evidence or change renderer CSS.

## 2026-06-19 AW2E Trusted DPR Root Evidence

- Reclaimed the dedicated Roll20 editor tab and confirmed AW2E is visibly rendered in the character iframe. The ordinary page DOM still cannot read iframe `contentDocument`, and CDP target discovery/auto-attach remains unsupported in the Chrome extension surface.
- Used top-page CDP `Page.captureScreenshot` with a DPR `1.25` sheet-root clip to capture `aw2e-root-dpr-complete-segments-20260619/segment-000..023.png`. The accepted segment set has no byte-identical duplicates; the trailing repeated bottom frames were excluded.
- Generated ignored local `roll20-root-dpr-complete-manifest.json`, stitched `roll20-sandbox-root-full-dpr-corrected.png` at `850x9168`, and reran the evidence gates.
- Verification: `audit:roll20-root-stitch` PASS for AW2E, Les-Oublies, and YSHY; `roll20_actual_screenshot_diff` reports AW2E sandbox mismatch `10.52%`; `smoke:roll20-full-root-candidates` reports AW2E best `normal-source-state` at `8.98%` with root delta `+2424.938px`; `status:roll20-actual` now reports `trustedFullRoot=3/3`.
- Latest renderer gate still holds production CSS with one blocker: the best diagnostic patch is not uniform across fixtures (`none` for AW2E, `inline-block+text-input-height` for Les-Oublies, `text-input-height` for YSHY). This is actual evidence progress, not Roll20 visual parity.

## 2026-06-19 Renderer Blocker Matrix

- Added `scripts/roll20_renderer_blocker_matrix.mjs` and package alias `diagnose:roll20-renderer-blocker` to turn the renderer gate blocker into a cross-fixture patch-effect table.
- Latest report on `2026-06-18-state-map-v1` concludes `HOLD_PRODUCTION_RENDERER_PATCH`: AW2E best patch family is `none`, Les-Oublies prefers `inline-block+text-input-height`, and YSHY prefers `text-input-height`.
- The matrix shows no candidate patch family is uniform enough to promote. In particular, the Les-friendly inline-block/text-input combined patch helps Les by `-2.4%` but hurts YSHY by `+0.3%` and is neutral for AW2E.
- Claim boundary: this is diagnostic guardrail work. It does not change renderer CSS, does not prove visual parity, and points the next P0 toward AW2E root-height drift/default-state/structure analysis.
## 2026-06-19 AW2E Selector And Height Drift Diagnostics

- Added `scripts/roll20_visibility_selector_diagnostics.mjs` and package command `diagnose:roll20-visibility-selectors` to detect emitted CSS hide selectors that only match emitted HTML through a `sheet-` alias.
- Latest selector diagnostics on `2026-06-18-state-map-v1`: AW2E has `23` alias-only hide refs, Les-Oublies has `6`, and YSHY has `5` alias-only plus `33` missing hide refs. This points at a generic Roll20 class-prefix/default-state modeling problem, not a sheet-specific renderer patch.
- Added `scripts/roll20_height_drift_diagnostics.mjs` and package command `diagnose:roll20-height-drift` to classify full-root height drift from existing ignored screenshot evidence.
- Added diagnostic-only `sheet-class-alias-css` full-root candidates. AW2E mismatch improved from `8.98%` to `7.89%`, but the root-height delta flipped from `+2424.938px` to `-7393.125px`, so blanket aliasing hides too much content and must stay out of production.
- Latest renderer gate remains `HOLD_PRODUCTION_RENDERER_PATCH`: AW2E prefers `sheet-class-alias-css`, Les-Oublies prefers `inline-block+text-input-height`, and YSHY prefers `text-input-height`.
- Claim boundary: this narrows the AW2E cause toward Roll20 `sheet-` selector/default-state behavior. It does not prove Roll20 visual parity and does not authorize production renderer CSS changes.
## 2026-06-19 AW2E Grouped Selector Candidate Smoke

- Added grouped diagnostic `sheet-` alias candidates to `scripts/roll20_full_root_candidate_smoke.mjs`: `hide-only`, `show-only`, `playbook-hide-only`, and `control-state-only`.
- Latest AW2E numbers: `normal-source-state` is `8.98%` mismatch with root delta `+2424.938px`; full alias is `7.89%` with root delta `-7393.125px`; `playbook-hide-only` is the best pixel candidate at `7.22%`, but still has root delta `-6636.125px` and local size `850x2532` versus actual `850x9168`.
- The renderer gate now reports the AW2E patch family as `sheet-class-alias-css:playbook-hide-only`, not a vague blanket alias.
- Interpretation: AW2E mismatch is strongly tied to playbook/default-state visibility, but the naive alias candidates over-hide content. The next P0 is actual Roll20 DOM/state/selector probing or a targeted state model, not production CSS promotion.
- Claim boundary: this improves root-cause isolation only. It does not prove Roll20 visual parity and does not make the app renderer ready.
## 2026-06-19 AW2E Playbook State Height Probe

- Added forced playbook-state diagnostic candidates to `scripts/roll20_full_root_candidate_smoke.mjs`, including Hardholder-only and front-of-list playbook sets through News, Quarantine, and SavvyHead.
- Added `closestRootHeightCandidate` to the full-root candidate smoke JSON/Markdown so pixel-best and height-best candidates are not conflated.
- Latest AW2E evidence: pixel best is still `sandbox-sheet-alias-playbook-hide-source` at `7.22%`, but it is far too short (`850x2532`, root delta `-6636.125px`). The closest-height candidate is `sandbox-sheet-alias-playbook-state-through-quarantine-source` at `850x9377`, root delta `+208.5px`; `through-news` is `850x8844`, root delta `-324.5px`.
- Interpretation: AW2E actual Roll20 likely has roughly 12-13 playbook sections visible. This points to default/state modeling, not a generic renderer CSS patch.
- Claim boundary: this is still local diagnostic evidence against trusted actual screenshots. It does not prove visual parity and renderer action remains HOLD.
## 2026-06-19 Playbook State Diagnostic Automation

- Added `scripts/roll20_playbook_state_diagnostics.mjs` and package command `diagnose:roll20-playbook-state` to summarize playbook/default-state candidates from full-root smoke output.
- The report separates pixel-best from height-closest candidates so a visually lower mismatch cannot be mistaken for a structurally correct default state.
- Latest `2026-06-18-state-map-v1` result: AW2E has `playbookSignal=YES`; Les-Oublies and YSHY have `playbookSignal=NO` and should not be interpreted through AW2E playbook heuristics.
- AW2E pixel-best remains `sandbox-sheet-alias-playbook-hide-source` at `7.22%`, but it is far too short (`-6636.125px`). Height-closest is `sandbox-sheet-alias-playbook-state-through-quarantine-source` at root delta `+208.5px`, making it the next default-state probe target.
- Claim boundary: this is derived diagnostic evidence only. It does not prove Roll20 visual parity, and renderer action remains HOLD.

## 2026-06-19 Generic Attr Class State Probes

- Removed the AW2E-specific hardcoded playbook value array from `scripts/roll20_full_root_candidate_smoke.mjs`.
- The full-root candidate smoke now derives `attr_class` probe values from emitted payload HTML and creates generic `sandbox-sheet-alias-attr-class-state-*` candidates.
- Latest rerun on `2026-06-18-state-map-v1`: AW2E height-closest is now `sandbox-sheet-alias-attr-class-state-first-13-source` at root delta `+208.5px`; `first-12` brackets from below at `-324.5px`. This reproduces the earlier default-state clue without sheet-specific candidate values.
- `scripts/roll20_playbook_state_diagnostics.mjs` now labels the report as `attr_class/playbook default-state` diagnostics and records derived probe values.
- Claim boundary: this is diagnostic automation only. `gate:roll20-renderer-ready` still fails with `rendererReady=NO`, so no production renderer CSS or Roll20 visual parity claim is allowed.

## 2026-06-19 Attr Class State Capture Plan

- Added `scripts/roll20_attr_class_state_capture_plan.mjs` and package alias `plan:roll20-attr-class-state` to generate ignored local reports and browser snippets for actual Roll20 `attr_class` checked/value capture.
- Latest run on `2026-06-18-state-map-v1` marks `official-roll20-AW2E` as P0 with 18 emitted `attr_class` values. Its actual height is bracketed by `sandbox-sheet-alias-attr-class-state-first-12-source` (`-324.5px`) and `sandbox-sheet-alias-attr-class-state-first-13-source` (`+208.5px`).
- Les-Oublies and YSHY have 0 emitted `attr_class` values for this probe, so the plan keeps them P1/no-bracket instead of mixing in unrelated sheet-alias diagnostics.
- `scripts/roll20_renderer_action_gate.mjs` now links the attr_class capture plan as the next action when a fixture has `attr_class` values and pixel-best/height-closest state candidates disagree.
- Verification: `node --check` for the new/changed scripts, `plan:roll20-attr-class-state`, `gate:roll20-renderer-action`, `status:roll20-actual`, `guard:roll20-evidence`, `lint`, and `build` passed. `gate:roll20-renderer-ready` still fails as expected with `rendererReady=NO`.
- Claim boundary: this improves the next Roll20 state-capture step only. It does not capture the actual checked/value sidecar yet, does not change production renderer CSS, and does not prove Roll20 visual parity.

## 2026-06-19 AW2E Actual Attr Class Sidecar

- Claimed the existing dedicated Roll20 editor tab only; no existing room/settings were modified.
- Chrome/CDP `Page.getFrameTree` found the generated character iframe, and `Page.createIsolatedWorld` allowed read-only iframe evaluation.
- Saved ignored local sidecar `reports/roll20-actual-compare/2026-06-18-state-map-v1/live-iframe-probe/official-roll20-AW2E-attr-class-state.json` with 81 `attr_class`/`class` inputs and actual checked value `Hardholder`.
- Updated `scripts/roll20_attr_class_state_capture_plan.mjs` so a found sidecar changes the fixture to `CAPTURED_NEEDS_ANALYSIS` instead of asking for the same capture again.
- Updated `scripts/roll20_playbook_state_diagnostics.mjs` and `scripts/roll20_renderer_action_gate.mjs` to read the sidecar and report the key contradiction: actual checked `Hardholder` does not explain the height-closest `sandbox-sheet-alias-attr-class-state-first-13-source`; next work is selector prefix/state visibility analysis, not forcing more checked values.
- Verification: `node --check` for changed scripts, `plan:roll20-attr-class-state`, `diagnose:roll20-playbook-state`, `gate:roll20-renderer-action`, `status:roll20-actual`, `guard:roll20-evidence`, `lint`, and `build` passed. `gate:roll20-renderer-ready` still fails as expected with `rendererReady=NO`.
- Claim boundary: this is real Roll20 state evidence and diagnostic routing, not visual parity and not a production renderer CSS patch.

## 2026-06-19 AW2E Attr Class Visibility Diagnostics

- Added `scripts/roll20_attr_class_visibility_diagnostics.mjs` and package alias `diagnose:roll20-attr-class-visibility`.
- The diagnostic reads only ignored local evidence: the actual Roll20 iframe attr_class sidecar plus emitted payload HTML/CSS.
- Latest AW2E evidence: actual checked value is `Hardholder`, actual visible panel count is `15`, and `24` checked show selectors are unprefixed while the emitted/Roll20 HTML class shape is `sheet-` prefixed.
- `scripts/roll20_renderer_action_gate.mjs` now reads this report and surfaces the result as root-cause evidence while keeping production renderer CSS on HOLD.
- Claim boundary: this explains the AW2E default-state/selector mismatch more precisely. It does not prove Roll20 visual parity and does not authorize blanket `sheet-` alias CSS or forced checked-state patches.

## 2026-06-19 AW2E Actual-Visible Candidate Probe

- Updated `scripts/roll20_full_root_candidate_smoke.mjs` to read the local ignored attr-class visibility diagnostic and add actual-sidecar-based candidates.
- Added two diagnostic-only paths: explicit display of actual visible target classes after playbook hide aliasing, and forced attr_class values from actual visible/checked lists.
- Latest AW2E full-root result: actual-visible explicit candidate is `9.04%` mismatch with root delta `+1310.5px`; actual-visible forced checked is `9.06%` / `+1310.5px`; actual-visible-plus-checked is `9.02%` / `+1861.5px`.
- The height-closest candidate remains `sandbox-sheet-alias-attr-class-state-first-13-source` at root delta `+208.5px`; pixel-best remains over-hidden `sandbox-sheet-alias-playbook-hide-source` at `7.22%` and `-6636.125px`.
- Claim boundary: actual display-visible panel names are not sufficient to model AW2E Roll20 default state. This is diagnostic evidence only and still keeps renderer action on HOLD.

## 2026-06-19 AW2E Attr Class Panel Geometry

- Added `scripts/roll20_attr_class_panel_geometry_diagnostics.mjs` and package alias `diagnose:roll20-attr-class-geometry`.
- The diagnostic compares actual Roll20 attr_class panel rects against stitched full-root height and emitted `attr_class` source order.
- Latest AW2E result: actual stitched root height `9168px`; sidecar-visible panel values intersecting that height `14`; fully inside `13`; clipped at the bottom `Quarantine, Waterbearer`; below actual root `Marine`.
- This explains why actual-visible panel names were too broad while `sandbox-sheet-alias-attr-class-state-first-13-source` remains the height-closest candidate at `+208.5px`.
- `scripts/roll20_renderer_action_gate.mjs` now reads this diagnostic and reports it as root-cause evidence while keeping production renderer CSS on HOLD.
- Claim boundary: this is geometry/source-order evidence only. It does not prove Roll20 visual parity and does not authorize production CSS.

## 2026-06-19 AW2E Root Cutoff Diagnostic

- Added `scripts/roll20_root_cutoff_diagnostics.mjs` and package alias `diagnose:roll20-root-cutoff`.
- The diagnostic compares trusted stitched root metadata against live iframe sidecar root metrics and attr_class panel boundary data.
- Latest AW2E result: stitched full-root height `9168px`, live sidecar root height `11788.087890625px`, delta `2620.088px`, risk `HIGH`.
- The accepted AW2E DPR manifest notes placement was derived from visual overlap because iframe `scrollTop`/root metadata was not readable; this must be separated from renderer CSS conclusions.
- `scripts/roll20_renderer_action_gate.mjs` now treats high root cutoff risk as an explicit blocker in addition to cross-fixture patch-family disagreement.
- Claim boundary: trusted full-root evidence remains useful, but this cutoff disagreement means AW2E is not ready for production renderer CSS or visual parity claims.
## 2026-06-19 Root Capture Plan Cutoff Blocker

- Updated `scripts/roll20_root_capture_plan.mjs` so high `root-cutoff` risk makes a fixture planned even if trusted DPR full-root evidence exists.
- Latest AW2E plan: `NEEDS_CAPTURE`, `plannedFixtures=1`, root cutoff disagreement `stitched=9168px`, `sidecar=11788.087890625px`, `delta=2620.088px`.
- The plan now requires manifest outputCss to cover or explain authoritative Roll20 `.charactersheet/form` root height and records whether placements came from readable scrollTop/root metrics or visual overlap.
- Claim boundary: this is evidence-gate hardening only. It does not add new Roll20 screenshots, does not make the renderer ready, and does not prove Roll20 visual parity.
## 2026-06-19 AW2E Root Container Metrics Sidecar

- Claimed only the dedicated Roll20 verification editor tab and used Chrome/CDP read-only iframe evaluation; no existing room/settings were modified.
- Saved ignored local sidecar `reports/roll20-actual-compare/2026-06-18-state-map-v1/live-iframe-probe/official-roll20-AW2E-root-container-metrics.json`.
- Updated `scripts/roll20_root_cutoff_diagnostics.mjs` to prefer that root/container sidecar over the older attr_class sidecar when comparing stitched evidence against live Roll20 metrics.
- Latest root cutoff diagnostic still reports `HIGH`: stitched `9168px`, live root/form `11788.087890625px`, delta `2620.088px`, dialog scroll `top=11223.2`, `h=626/11849`.
- Claim boundary: this is stronger actual Roll20 measurement evidence, not a new screenshot, not renderer readiness, and not visual parity.

## 2026-06-19 AW2E Scroll Metrics Stitch Diagnostic

- Used the read-only `#dialog-window` scroll metrics from the dedicated Roll20 sandbox iframe to capture 23 sheet-root-only segments under ignored local reports.
- Stitched diagnostic `aw2e-root-scroll-metrics-stitch-20260619.png` is `852x11788`, matching the live root/form height rather than the older `9168px` trusted stitch.
- `audit:roll20-root-stitch` now reports the file as `DIAGNOSTIC_SCROLL_METRICS` with duplicate segments `0` and coverage issues `0`; `plan:roll20-root-capture` lists it as a `scroll-metrics` diagnostic.
- Claim boundary: this is a promising recapture diagnostic. It is not yet promoted to the preferred trusted Roll20 root screenshot and does not make renderer CSS ready.
