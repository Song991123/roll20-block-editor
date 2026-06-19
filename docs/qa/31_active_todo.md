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
| DONE | Codex/Claude | First Figma-like flow drop slice for edit mode. | Browser smoke PASS: `reports/edit-flow-smoke/edit-flow-smoke-results.md`. Real `dragover`/`drop` DragEvents verified: background drop -> absolute frame, drop over section -> flow nesting with no `position:absolute`, 0 console errors. Existing-object mouse drag is covered too: latest smoke moved a section and confirmed computed position and emitted CSS rule both landed at `left: 464px; top: 256px`. Canvas dragover now marks the active container with `data-r20-drop-mode="inside"`, and leaf sibling targets expose `before`/`after` insertion line modes; dropping new text inputs before and after an existing nested input changes emitted HTML order. Layer row dragover exposes top/middle/bottom -> `before,inside,after`. Latest synthetic layer smoke also moves a non-leaf group with a connected next sibling after its sibling, while preserving both groups child inputs in emitted HTML. Latest synthetic absolute-inside-frame smoke drags an input inside a frame and confirms emitted/computed parent `position:relative` plus child `position:absolute; left/top` match. Edit toolbar now has readable `?êÎ¶Ñ`/`?êÏú†` placement mode and `scripts/edit_flow_browser_smoke.mjs` checks `?úÌä∏ ?∏Ïßë`, `?àÏù¥??, `?àÏù¥??Í≤Ä??, `?êÎ¶Ñ`, `?êÏú†` with no Han-range mojibake in the edit canvas text. Latest synthetic free-mode smoke drops a gallery text input into a frame and confirms the child is nested inside that frame with emitted/computed `position:absolute; left/top`, while the frame is `position:relative`. Smoke runs against static `out/` export via `scripts/edit_flow_browser_smoke.mjs`; no dev server needed. |
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
| VERIFY | Codex | Align local preview/export with actual Roll20 sandbox sanitize/prefix behavior. | 2026-06-19 Chrome observation of the dedicated Roll20 sandbox settings page found `customcharsheet_json` on the visible settings surface and script references for `customcharsheet_layout`, `customcharsheet_style`, and `#customsheet-preview iframe -> #root`. Added first dedicated module `lib/emit/roll20SandboxSanitize.ts`, separate from `sanitizeForRoll20Legacy`, covering observed `.charsheet` selector prefixing, Roll20 URL allow/proxy/drop handling, mobile/comment stripping, unsafe-token rejection, HTML allow-listing, runtime-node stripping, and class-token prefix exceptions for `attr_`, `sheet-`, `repeating_`, `roll_`, and `act_`. Added `scripts/roll20_sandbox_sanitize_audit.mjs`, package script `audit:roll20-sandbox-sanitize`, and included it in `verify:roll20-preupload`. The export dialog exposes the same expected-transform diagnostics, and preview now has a `Sandbox ?àÏÉÅ` toggle that applies the sanitizer approximation in iframe preview only. Latest fixture browser smoke PASS: `corepack pnpm run smoke:roll20-sandbox-preview -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --fixture official-roll20-Les-Oublies --report-dir reports/roll20-sandbox-preview-smoke --port 4331`; normal preview `colgroup=6`, `rolltemplate=3`, `workerScripts=1`; Sandbox expected preview `colgroup=0`, `rolltemplate=0`, `workerScripts=0`, console/page errors 0. Verification: `corepack pnpm run test:roll20-sandbox-sanitize` PASS, `corepack pnpm run audit:roll20-sandbox-sanitize -- reports\roll20-actual-compare\2026-06-18-state-map-v1` PASS, `corepack pnpm run verify:roll20-preupload -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --fixtures test-fixtures\visual --out-dir ./out --base-path /roll20-block-editor --state-map reports\visual-state-candidates\visual-state-candidates-state-map.json` PASS from the prior gate, `corepack pnpm run lint` PASS, `corepack pnpm run build` PASS, and `corepack pnpm run smoke:preview-edit-visual -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/preview-edit-visual --port 4332` PASS. This is still not actual Roll20 visual parity. |
| VERIFY | Codex | Expand Roll20 Sandbox expected preview smoke to all prepared fixtures. | Added `--all` support and package script `smoke:roll20-sandbox-preview:all` for `scripts/roll20_sandbox_preview_smoke.mjs`. Latest run PASS/WARN: `corepack pnpm run smoke:roll20-sandbox-preview:all -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/roll20-sandbox-preview-smoke --port 4333`. AW2E, Les-Oublies, and YSHY 1BU all passed fixture-level sanitizer render checks; Sandbox expected preview stripped visible rolltemplate/source-worker runtime nodes to 0 for all three (`2 -> 0`, `4 -> 0`, `20 -> 0`). `Console status=WARN` records Roll20 image-proxy font CORS and source sheet numeric-expression warnings separately from sanitizer failures; page errors were 0. Verification: `node --check scripts\roll20_sandbox_preview_smoke.mjs` PASS, `corepack pnpm run lint` PASS, `corepack pnpm run build` PASS, and `corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1` still reports `PREUPLOAD_READY_MISSING_GENERATED_ACTUAL`. This is local expected-render coverage only, not actual Roll20 visual parity. |
| DONE | Codex | Surface Roll20 upload readiness clearly in the export dialog. | `components/editor/ExportDialog.tsx` separates local zip-file readiness from actual Roll20 Sandbox/test-room visual verification and uses readable Korean UI copy. It now also exposes a Roll20 Sandbox expected-transform diagnostic panel driven by `sanitizeRoll20SandboxHtml/Css`, showing HTML/CSS rewrite risk, runtime stripping, class/tag rewrites, URL proxy/drop counts, and fatal reject risk without mutating the zip payload. Latest static app smoke PASS: `corepack pnpm run smoke:export-dialog -- --out-dir ./out --base-path /roll20-block-editor --report-dir reports/export-dialog-smoke --port 4326`; it confirms the header and empty-state Korean copy, confirms no sample UI appears when the public sample catalog is empty, confirms no mojibake in the initial shell or export dialog text, opens the export dialog, confirms 5 readiness items, confirms the `?§Ï†ú Í≤ÄÏ¶??ÑÏöî` badge, confirms the Sandbox diagnostics panel with 4 diagnostic rows, confirms the legacy toggle and local-vs-actual verification warning copy, opens the import dialog, and verifies main mode tab clicks with 0 console/page errors. New fixture-mode smoke PASS: `corepack pnpm run smoke:export-dialog -- --out-dir ./out --base-path /roll20-block-editor --report-dir reports/export-dialog-smoke-imported --fixtures test-fixtures/visual --fixture official-roll20-Les-Oublies --port 4325`; it imports a copied ignored fixture first, then confirms the export Sandbox diagnostics report `ÏπòÎ™Ö ?§Î•ò ?ÜÏùå`, 4 rows, and expected rewrite rows for the real emitted payload. `corepack pnpm run test:roll20-sandbox-sanitize`, `corepack pnpm run audit:roll20-sandbox-sanitize -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `corepack pnpm run lint`, and `corepack pnpm run build` also PASS. Actual Roll20 visual parity remains under the separate Roll20 actual-screen TODO. |

## Critical Product Tasks

| Status | Priority | Task | Notes |
| --- | ---: | --- | --- |
| VERIFY | P0 | Make edit canvas and preview render from the same emitted HTML/CSS path, with edit overlays only. | Latest renderer-regression check after removing the Shadow edit forced `border-box` reset: `corepack pnpm run smoke:preview-edit-visual -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/preview-edit-visual --port 4336` PASS: AW2E 1.75%, Les-Oublies 2.02%, YSHY 1BU 1.01%. Earlier DOM-signature gate PASS showed matching preview/edit screenshot dimensions, edit host/content height delta 0, preview/edit toolbar overlap 0, 0 visible runtime nodes, and DOM signature parity PASS for node counts, block-id counts, tag/control counts, and sequence hash. Edit no longer keeps a fixed 900px canvas shell or renders the preview toolbar over the sheet. `scripts/imported_edit_sync_smoke.mjs` also PASS for 3 imported fixtures after fixing Shadow image referrer behavior and optimistic move clearing, and now includes imported visible-node move sync, imported canvas flow insertion, edited emit -> re-import -> emit stability, safe imported layer reorder where available, and non-leaf subtree reorder for all 3 prepared fixtures. Needs remaining fixture-specific visual fixes and actual Roll20 comparison before DONE. |
| DONE | P0 | Hide `script`, `script[type="text/worker"]`, and `rolltemplate` from sheet canvas in every render mode. | `lib/preview/buildDoc.ts` now hard-hides them after user CSS in iframe and shadow/edit render paths; fixture render report confirms source script/rolltemplate nodes remain for runtime/chat extraction. |
| VERIFY | P0 | Preserve worker JS as a separate future block-coding workspace. | Worker workspace split is implemented and now source-audited: import replaces the worker workspace from source `<script type="text/worker">` bodies, including nested/raw worker scripts, strips worker scripts from visual HTML, and emit appends one Roll20 worker script without duplicate visual/runtime leakage. `corepack pnpm run audit:worker -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/worker-source-audit` PASS for AW2E, Les-Oublies, and YSHY 1BU with exact worker source bodies. `corepack pnpm run smoke:worker`, `scripts/browser_roundtrip_smoke.mjs`, and `scripts/imported_edit_sync_smoke.mjs` also PASS for the 3 prepared ignored fixtures. Still needs broader corpus audit and actual Roll20 sandbox/test-room worker runtime parity before DONE. |
| DONE | P0 | Implement real browser L2 roundtrip: import -> emit -> import -> compare. | **3/3 fixtures PASS** (AW2E, Les-Oublies, YSHY 1?∫¬Ä 6531 blocks): `reports/roundtrip-browser/browser-roundtrip-results.md`. Fix chain: worker wrapper newline + indent growth, section/toggle multi-class guard, whitespace-only line growth. This proves browser emit stability for 3 fixtures only ??NOT all-sheet support. Imported edit-step smoke now exists separately in `reports/imported-edit-sync/`; expand fixtures next. |
| VERIFY | P0 | Add visual/cascade leak verification for Roll20 preview. | Standalone report (`reports/cascade-leak/cascade-leak-results.md`) and live Shadow DOM report (`reports/live-shadow-cascade/live-shadow-cascade-results.md`) both show 0 app-like CSS winners across 3 fixtures. `preview_edit_visual_smoke` records resource diagnostics and currently reports 0 resource issues for the local preview/edit screenshot path. `capture_visual_fixture_previews.mjs` now also separates render status from resource status and supports `--fail-on-resource-issues true`; latest YSHY and AW2E strict preview captures PASS with resources PASS. Imported edit/reimport still has external image failures to normalize/cache/classify against actual Roll20. |
| DONE | P0 | Add asset URL reachability regression audit. | `corepack pnpm run audit:assets -- --fixtures test-fixtures\visual --payload-run reports\roll20-actual-compare\2026-06-18-pseudo-fix-v1 --report-dir reports\asset-resource-audit` PASS. AW2E, Les-Oublies, and YSHY 1BU source/payload asset refs had 0 failed HTTP probes and 0 missing local relative refs; payload introduced 0 new asset regressions. Local reachability guard only, not Roll20 visual parity. |
| DOING | P0 | Build screenshot-based sheet visual verification from existing preview images. | Inventory, fixture prep, shared preview render, and browser capture smoke are working. Next: normalize viewport/crop and add pixel diff against references. |
| DONE | P0 | Add first browser-canvas pixel diff harness. | `reports/visual-fixture-diff/visual-fixture-diff-results.md`; first diagnostic diff computed for 2 fixtures. Needs viewport/state/crop normalization before parity gating. |
| DOING | P0 | Normalize visual diff viewport, initial sheet state, and crop region. | `corepack pnpm run diff:visual-fixtures` now first captures live local preview PNGs through `scripts/capture_visual_fixture_previews.mjs`, applies optional state-map action/control hints, regenerates diff pages, collects browser JSON, and writes ignored classification reports. The capture step can also be run directly as `corepack pnpm run capture:visual-fixtures` or strict resource mode as `corepack pnpm run capture:visual-fixtures:strict`. Latest strict spot checks PASS: AW2E applies `control_attr_class_Hardholder` with resources PASS, and YSHY 1BU captures initial preview state with resources PASS. Latest full diff run PASS: AW2E applies `control_attr_class_Hardholder` (`attr_class=Hardholder`) and reports 16.23% best mismatch; Les-Oublies applies `act_fullsheet` (`sheetTabForBtn=fullsheet`, `sheetTab=fullsheet`) and reports 8.84% best mismatch. `node scripts\classify_visual_fixture_diffs.mjs reports\visual-fixture-diff test-fixtures\visual` now detects that those state hints are already applied and classifies both AW2E and Les-Oublies as `reference/capture context mismatch`; next action is crop/context normalization or actual Roll20 screenshot collection before renderer CSS changes. The runner was hardened for large fullsheet data-URL pages by waiting on the result JSON instead of locator visibility. `scripts/roll20_actual_local_baseline.mjs`, `scripts/roll20_payload_roundtrip_visual_smoke.mjs`, and `scripts/roll20_preupload_verification.mjs` also accept/forward optional `--state-map`, so the local baseline and cleaned-payload visual roundtrip compare the same state. Latest state-map run `2026-06-18-state-map-v1` is local pre-upload PASS with 0% payload-roundtrip mismatch. This is state/crop triage and upload-readiness evidence only, not actual Roll20 parity. |
| TODO | P1 | Improve raw fallback coverage for sheets such as custom Magica. | Current custom-magica coverage is 95.7%, rawFallback 76. |
| VERIFY | P1 | Make layer panel useful as a Figma-like hierarchy/reparenting surface. | Layer rows expose explicit drag zones (`before`, `inside`, `after`), adapter supports top-level and nested sibling insertion, and children inside a statement chain can be reordered before/after siblings. Canvas widget dragover now exposes `inside`, `before`, and `after`; layer rows now visibly show role labels, `?¥Í∏∞ Í∞Ä?? for containers, default placement mode (`?êÎ¶Ñ` / `?êÏú†`), and Korean drop badges (`?ûÏóê ?£Ïùå` / `?àÏóê ?£Ïùå` / `?§Ïóê ?£Ïùå`). `corepack pnpm run smoke:edit-flow -- --out-dir ./out --base-path /roll20-block-editor --report-dir reports/edit-flow-smoke --port 4318` verifies zone detection, nested input reorder, canvas insertion of new inputs before/after an existing nested input, readable Korean edit UI labels, layer role/drop affordance attributes/text, and synthetic non-leaf group movement with child preservation in emitted HTML. `imported_edit_sync_smoke` now also verifies imported canvas insertion as non-absolute flow content for 3 fixtures, imported layer leaf reorder for Les-Oublies when a safe leaf sibling pair exists, and imported non-leaf subtree reorder with direct child preservation for AW2E, Les-Oublies, and YSHY 1BU. 2026-06-19 strict resource mode was added so visual-parity work cannot hide broken external images/fonts behind an edit-interaction PASS. Still needs richer screenshot evidence for real user drags and actual Roll20 comparison before DONE. |
| VERIFY | P1 | Define absolute positioning inside frames/groups. | Synthetic browser smoke now verifies two paths: dragging an existing frame child creates parent design CSS `position: relative` plus child design CSS `position: absolute; left/top`; and the user-facing free placement mode drops a new gallery text input into a frame as a nested absolute child with emitted/computed left/top matching. Imported real-fixture smoke also PASS for the 3 prepared ignored fixtures: free placement produced nested absolute inputs inside imported frame/flow targets with parent `relative`, child `absolute`, and emitted/computed left/top matching. Evidence: `scripts/edit_flow_browser_smoke.mjs` and `scripts/imported_edit_sync_smoke.mjs` PASS against static `out/`. Still needs richer UX screenshot evidence and actual Roll20 sandbox/test-room comparison before DONE. |
| DONE | P1 | Add shared DOM layer role classification for edit UX. | `lib/editor/layerRoles.ts` gives frame/flow/table/control/action/text/media/runtime roles used by the layer panel, gallery drop detection, and Shadow DOM edit affordance CSS. Real drag/drop browser smoke passed (`reports/edit-flow-smoke/`): dropped section exposes `data-r20-layer-role="frame"` + `data-r20-can-drop="1"` and receives flow children. |
| VERIFY | P1 | Expand Roll20 worker simulator and chat rolltemplate rendering. | Local chat smoke now clears chat per fixture and checks exactly 1 card, 280px rolltemplate width, no app-only `rolltemplate:name` debug label, and Roll20-like chat shell classes (`textchatcontainer`, `message`, `spacer`, `by`, `tstamp`). Latest report: `reports/rolltemplate-chat-smoke/rolltemplate-chat-smoke-results.md`; AW2E, Les-Oublies, and YSHY all PASS with real `user-click`, rolltemplate kind, 280px card width, and shell markers present after `components/editor/ChatPane.tsx` Korean copy cleanup. Added `corepack pnpm run smoke:worker-state`: synthetic Roll20 tab sheet PASS proves action buttons trigger worker `setAttrs`, hidden input DOM property and `value` attribute both update, CSS `[value=...]` sibling selectors switch visible panels, and duplicate `attr_*` checkbox/radio controls mirror checked state so CSS `:checked` anchors update. Latest worker-state smoke has 0 console/page errors; source worker preservation rechecked by `corepack pnpm run audit:worker` PASS for AW2E, Les-Oublies, and YSHY. Actual Roll20 chat/worker parity remains TODO: latest actual status splits Les-Oublies as `chat-dom-only` and AW2E/YSHY as missing `roll20-chat.png`, so no actual Roll20 chat visual parity claim is allowed. Worker simulator split still TODO. |
| VERIFY | P1 | Add explicit modern/legacy Roll20 preview/export mode checks. | Export-level synthetic audit PASS: `corepack pnpm run audit:legacy-export -- --report-dir reports/legacy-export-audit`. Preview/edit render-path smoke PASS: `corepack pnpm run smoke:legacy-preview -- --report-dir reports/legacy-preview-smoke`, and the toolbar exposes `data-testid="preview-legacy-css-toggle"` for the local preview/edit legacy CSS mode. Imported-fixture visual smoke PASS: `corepack pnpm run smoke:legacy-fixture-visual -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/legacy-fixture-visual`; AW2E and YSHY 1BU had no legacy-risk CSS in the emitted preview chunk, while Les-Oublies reduced risk `1 -> 0` with 0 console/page/resource issues. Actual Roll20 legacy sandbox/test-room parity still TODO. |
| DONE | P0 | Add default-state CSS selector regression audit. | `corepack pnpm run audit:state-selectors -- --fixtures test-fixtures\visual --payload-run reports\roll20-actual-compare\2026-06-18-pseudo-fix-v1 --report-dir reports\state-selector-audit` PASS. It verifies source and generated payload controls against hidden/value/checked CSS state selectors, and fails only when payload creates a new missing-anchor regression beyond source. AW2E and Les-Oublies had 0 source/payload anchor issues; YSHY had 7 source-only dead/worker-driven selector anchors and 0 payload regressions. Local semantic guard only, not Roll20 visual parity. |
| DOING | P0 | Run Roll20 actual-screen check with Chrome session. | Clean local payloads are generated by `scripts/roll20_actual_local_baseline.mjs` and gated by `corepack pnpm run verify:roll20-preupload -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --fixtures test-fixtures\visual --out-dir ./out --base-path /roll20-block-editor --state-map reports\visual-state-candidates\visual-state-candidates-state-map.json`, latest PASS. Chrome reached the dedicated Roll20 Custom Sheet Sandbox, but filechooser upload is still blocked and endpoint `200` responses are now treated as storage-only unless fresh iframe DOM/root evidence confirms activation. Latest status reports `PARTIAL_GENERATED_ACTUAL_SCREENSHOTS`, `generatedActualScreenshots=2/6`, `generatedDiffed=2/6`, `roomObservationScreenshots=0/3`, and `roomObservationDiffed=0/3`; AW2E is `SUSPECT`, Les-Oublies and YSHY have generated sandbox evidence, and all Roll20 chat screenshots remain missing. Existing solo rooms are observation-only; generated sheet checks must use Custom Sheet Sandbox first or a new test room. Store screenshots/reports locally only. |
| VERIFY | P0 | Implement actual Roll20 sandbox sanitize/prefix contract locally. | First module/test slice exists in `lib/emit/roll20SandboxSanitize.ts` and `lib/emit/__tests__/roll20SandboxSanitize.test.ts`; package command `corepack pnpm run test:roll20-sandbox-sanitize` covers selector prefixing, Roll20 URL proxy/drop behavior, unsafe CSS rejection, HTML allow-list/class exceptions, runtime source stripping, and HTML URL proxy/drop behavior. The module is now wired into `scripts/roll20_sandbox_sanitize_audit.mjs`, the local `verify:roll20-preupload` gate, the export dialog's explicit Sandbox expected-transform panel, and a preview-only `Sandbox ?àÏÉÅ` render toggle. Latest preview toggle smoke PASS: `corepack pnpm run smoke:roll20-sandbox-preview -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --fixture official-roll20-Les-Oublies --report-dir reports/roll20-sandbox-preview-smoke --port 4331` verifies the imported fixture changes from normal preview `colgroup=6`, `rolltemplate=3`, `sourceWorkerScript=1` to Sandbox expected preview `colgroup=0`, `rolltemplate=0`, `sourceWorkerScript=0` with 0 console/page errors. Latest checks PASS: `corepack pnpm run test:roll20-sandbox-sanitize`, `corepack pnpm run audit:roll20-sandbox-sanitize -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, empty-workspace export smoke on port 4326, imported-fixture export smoke on port 4325, `corepack pnpm run lint`, `corepack pnpm run build`, and `corepack pnpm run smoke:preview-edit-visual -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/preview-edit-visual --port 4332`. Next: compare against actual Roll20 screenshots after upload unblocks. |
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
| DONE | Explicit YSHY 1BU fixture smoke | `scripts/prepare_explicit_fixture.mjs` copied `1?∫¬Ä HTML.html`, `1?∫¬Ä CSS.css`, and `Ë∏∞ÎçâÎø?txt` into ignored fixture `yshy-commission-1bu`; `buildSheetDoc` render and Browser Use load completed with 0 console errors/warnings. |
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
| DONE | YSHY mapping-fidelity verification + 10-defect fix batch | `reports/mapping-fidelity/mapping-fidelity-yshy.md`. All Roll20-meaningful token categories now EXACT between source and emit for YSHY 1?∫¬Ä (attr 1069, inputs 1049, roll buttons 808 name+value, data-i18n 1083, placeholders 140, disabled 6, i18n keys 399). Fixed: DOMParser self-closing tag swallowing, r20_skill_row missing field definitions,  XML-illegal separator, placeholder->value pollution, i18n key mangling, placeholder/data-i18n/disabled loss on input/textarea/heading/caption, CSS attribute-selector space loss, section/toggle multi-class guard, whitespace-line indent growth, hook bumpStructure. `lint`/`build`/smoke/roundtrip all re-passed 2026-06-12. |

## Forbidden Claims

- Do not say "100% import/export" yet.
- Do not say "Roll20 visual parity" yet.
- Do not say "all sheets are supported" yet.
- Do not say worker JS block coding is complete yet.

## External Source Safety

Never write into:

- `D:\??áÍπ∑??ÔßçÎçà???roll20-character-sheets-master`
- `D:\??áÍπ∑??ÔßçÎçà????Í≥óÎ∏£\[‰ª•Î¨í???å„Öº?????óÎìÉ`
- `D:\??áÍπ∑??ÔßçÎçà????Í≥óÎ∏£\0 CoC\?Í≥∏ÎñÜ??H???å„Öª?????óÎìÉ`

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
