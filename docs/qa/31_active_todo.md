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
| DONE | Codex/Claude | First Figma-like flow drop slice for edit mode. | Browser smoke PASS: `reports/edit-flow-smoke/edit-flow-smoke-results.md`. Real `dragover`/`drop` DragEvents verified: background drop -> absolute frame, drop over section -> flow nesting with no `position:absolute`, 0 console errors. Existing-object mouse drag is covered too: latest smoke moved a section and confirmed computed position and emitted CSS rule both landed at `left: 464px; top: 256px`. Canvas dragover now marks the active container with `data-r20-drop-mode="inside"`, and leaf sibling targets expose `before`/`after` insertion line modes; dropping new text inputs before and after an existing nested input changes emitted HTML order. Layer row dragover exposes top/middle/bottom -> `before,inside,after`. Latest synthetic layer smoke also moves a non-leaf group with a connected next sibling after its sibling, while preserving both groups child inputs in emitted HTML. Latest synthetic absolute-inside-frame smoke drags an input inside a frame and confirms emitted/computed parent `position:relative` plus child `position:absolute; left/top` match. Edit toolbar now has readable `흐름`/`자유` placement mode and `scripts/edit_flow_browser_smoke.mjs` checks `시트 편집`, `레이어`, `레이어 검색`, `흐름`, `자유` with no Han-range mojibake in the edit canvas text. Latest synthetic free-mode smoke drops a gallery text input into a frame and confirms the child is nested inside that frame with emitted/computed `position:absolute; left/top`, while the frame is `position:relative`. Smoke runs against static `out/` export via `scripts/edit_flow_browser_smoke.mjs`; no dev server needed. |
| DONE | Codex | Organize project docs and operating rules. | Added `docs/operations/33_working_rules_and_requirements.md`, `docs/PROJECT_STRUCTURE.md`, `docs/README.md`, `reports/README.md`, and `scripts/README.md`; `lint` and `build` passed. |
| DONE | Codex | Archive stale QA markdown and add folder indexes. | Moved old `qa_*` snapshots into `docs/qa/archive/`; added README indexes for docs subfolders; `lint` and `build` passed. |
| DONE | Codex | Split requirements into actionable gap matrix and branch plan. | Added `docs/qa/34_requirements_gap_matrix.md`, `docs/operations/34_branch_and_deployment_plan.md`, and CI workflow. `lint`, `build`, `main` CI, `dev` CI, and Pages deploy passed. |
| DONE | Codex | Harden shared agent rules with mandatory references. | Added startup checklist, source safety, forbidden claims, branch/deploy rules, and minimum verification commands to `docs/operations/33_working_rules_and_requirements.md`; `lint` and `build` passed. |
| DONE | Codex | Move agent-only rules out of README files. | Added root `AGENTS.md`, removed agent-only startup rule text from README files, and linked `AGENTS.md` from the operations rulebook; `lint` and `build` passed. |
| DONE | Codex | Add standalone preview cascade leak diagnostics. | Added `scripts/make_cascade_leak_pages.mjs` and `scripts/serve_static_dir.mjs`; Browser-computed report: `reports/cascade-leak/cascade-leak-results.md`. |
| DONE | Codex | Add live Shadow DOM cascade leak diagnostics. | `scripts/live_shadow_cascade_smoke.mjs` PASS for AW2E, Les-Oublies, YSHY 1BU: preview/edit Shadow DOM sampled visible properties had 0 app-like CSS winners. Report: `reports/live-shadow-cascade/live-shadow-cascade-results.md`. External asset failures are tracked separately from cascade leakage. |
| DONE | Codex | Add imported fixture preview/edit screenshot smoke. | `corepack pnpm run smoke:preview-edit-visual -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/preview-edit-visual --port 4314` PASS after `build`: 3 fixtures rendered preview root + edit root with 0 console/page errors and 0 resource issues after iframe referrer policy alignment. Latest diagnostic mismatch: AW2E 1.76%, Les-Oublies 1.68%, YSHY 1BU 0.85%; edit host/content height delta is 0 for all 3 and preview/edit toolbar overlap is 0. New DOM signature parity gate also PASS: preview/edit node counts, block-id counts, first 120-node sequence hash, tag/control counts, and visible runtime node count match for AW2E, Les-Oublies, and YSHY 1BU. This is local preview/edit parity evidence, not Roll20 actual-screen parity. |
| DONE | Codex | Add imported real-fixture edit drag sync smoke. | `scripts/imported_edit_sync_smoke.mjs` PASS after `build`: the 3 prepared ignored fixtures each found an imported visible input node that moved through the real edit pointer path, landed at the same position in preview, emitted matching absolute CSS, accepted a friendly widget drop into a visible imported sheet insertion target as non-absolute flow content, accepted a second user-facing free-placement drop as nested absolute content inside an imported frame/flow target, and survived edited emit -> re-import -> emit stability checks. Report: ignored `reports/imported-edit-sync/imported-edit-sync-results.md`. One fixture also found a safe imported layer leaf sibling pair and reordered it through the layer row path; the others record SKIP for that sub-check. 2026-06-19: smoke report now separates `Interaction` from `Resources`; `corepack pnpm run smoke:imported-edit-sync -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/imported-edit-sync --only yshy-commission-1bu --port 4296` reports interaction PASS but resources WARN for YSHY Imgur/Typekit failures. `corepack pnpm run smoke:imported-edit-sync:strict -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/imported-edit-sync --only official-roll20-AW2E --port 4298` PASS proves the strict path succeeds when resources load. This is local static-app evidence only, not actual Roll20 parity. |
| VERIFY | Codex | Capture full-height Roll20 sandbox root evidence. | New clipped-segment path captured 8 read-only Chrome/CDP segments from the dedicated Roll20 sandbox iframe for Les-Oublies and stitched ignored `roll20-sandbox-root-full.png` at `852x4122`. `node scripts\roll20_actual_screenshot_diff.mjs reports\roll20-actual-compare\2026-06-18-state-map-v1` now reports generated Les-Oublies sandbox mismatch `6.90%` against local `850x4478`. `corepack pnpm run classify:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1` classifies the remaining issue as `sheet root geometry/height differs after full-height capture`. Still not DONE: AW2E/YSHY generated Roll20 screenshots and trustworthy chat screenshots remain missing, and the geometry cause still needs renderer work. |
| VERIFY | Codex | Diagnose full-root state/geometry candidates before renderer CSS changes. | Added `corepack pnpm run smoke:roll20-full-root-candidates -- reports\roll20-actual-compare\2026-06-18-state-map-v1`. Latest result: Les-Oublies direct local candidates do not beat the existing app `local-preview.png` reference (`6.90%`); best direct candidate is `normal-actual-root-width-source` at `8.52%`, with local root still `841px` taller than Roll20 actual. State-map and source/default candidates are visually close, so a simple state toggle is not the whole fix. Added `targetGeometry` capture to `scripts/roll20_actual_local_baseline.mjs`; single-fixture smoke `node scripts\roll20_actual_local_baseline.mjs --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures\visual --report-dir reports\roll20-actual-compare --run-label 2026-06-19-local-geometry-smoke --only official-roll20-Les-Oublies --state-map reports\visual-state-candidates\visual-state-candidates-state-map.json` PASS. A fresh read-only Roll20 state probe saved ignored `live-iframe-probe/official-roll20-Les-Oublies-state-visibility.json`: hidden `attr_sheetTab` and `attr_sheetTabForBtn` are both `combat`, but Roll20 still shows `.sheet-section-oublie`, `.sheet-section-competences`, and `.sheet-section-montures`. Next P0: compare actual visible-section CSS selectors and local app preview geometry, not just hidden attr values. |
| DOING | Codex | Add Roll20 actual-screen verification workflow. | Latest local pre-upload gate PASS with state-map-aware baseline: `corepack pnpm run verify:roll20-preupload -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --fixtures test-fixtures\visual --out-dir ./out --base-path /roll20-block-editor --state-map reports\visual-state-candidates\visual-state-candidates-state-map.json`. It reruns payload hygiene, Roll20 sandbox sanitize diagnostics, cleaned-payload visual roundtrip, default-state selector audit, asset/resource audit, and evidence guard for the 3 ignored fixtures. Chrome upload controls were blocked by `fileChooser.setFiles`, but the Roll20 sandbox handler was observed to POST base64 HTML/CSS/translation to `/sheetsandbox/savesheetsettings`; using that endpoint in the dedicated sandbox plus saving `customcharsheet_json` applied the generated Les-Oublies payload. Roll20 rendered the generated character sheet in the character iframe, and preferred root-crop diff now exists: `node scripts\roll20_actual_screenshot_diff.mjs reports\roll20-actual-compare\2026-06-18-state-map-v1` reports Les-Oublies sandbox mismatch `21.67%` from `roll20-sandbox-root.png`. Classifier `corepack pnpm run classify:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1` PASS now records both `root crop captured` and `matched visible viewport diff`: the normalized root crop is `760x556` versus local full preview `850x4478`, and the matched visible viewport still mismatches by `21.67%`. Visible-crop diagnostic `corepack pnpm run diagnose:roll20-visible-crop -- reports\roll20-actual-compare\2026-06-18-state-map-v1` PASS writes ignored crop/overlay PNGs and shows simple top-aligned horizontal crop drift explains only `0.34%`; mismatch spans the full visible crop with dominant bottom/bottom-left concentration. Same-context visible smoke now includes DPR-aware local rendering, actual-root-width/context candidates, native-pixel mismatch, computed-style tie-break scoring, and root-relative selector samples. Latest `corepack pnpm run smoke:roll20-same-context-visible -- reports\roll20-actual-compare\2026-06-18-state-map-v1` PASS selects Les-Oublies `sandbox-actual-root-width-no-state`, CSS mismatch `21.49%`, native mismatch `21.55%`, style score `339`; this is still not a material improvement over `21.67%`. Remaining evidence points to flow/height structure: actual root height `4121.575px` vs local `4963.266px`, first `.sheet-2colrow` `310.6px` actual vs `554px` local, and local `.sheet-col` flow appears to wrap/extend where Roll20 keeps columns side-by-side. AW2E/YSHY still need generated sandbox screenshots. `corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1` reports `PARTIAL_GENERATED_ACTUAL_SCREENSHOTS`, `generatedActualScreenshots=1/6`, `generatedDiffed=1/6`, `roomObservationScreenshots=0/3`, and `roomObservationDiffed=0/3`. A Roll20 roll button click created one `sheet-rolltemplate-classic-roll` chat DOM message, saved locally as ignored DOM evidence, but chat screenshot capture was not trustworthy and remains missing. This is partial actual Roll20 evidence, not visual parity. |
| VERIFY | Codex | Align local preview/export with actual Roll20 sandbox sanitize/prefix behavior. | 2026-06-19 Chrome observation of the dedicated Roll20 sandbox settings page found `customcharsheet_json` on the visible settings surface and script references for `customcharsheet_layout`, `customcharsheet_style`, and `#customsheet-preview iframe -> #root`. Added first dedicated module `lib/emit/roll20SandboxSanitize.ts`, separate from `sanitizeForRoll20Legacy`, covering observed `.charsheet` selector prefixing, Roll20 URL allow/proxy/drop handling, mobile/comment stripping, unsafe-token rejection, HTML allow-listing, runtime-node stripping, and class-token prefix exceptions for `attr_`, `sheet-`, `repeating_`, `roll_`, and `act_`. Added `scripts/roll20_sandbox_sanitize_audit.mjs`, package script `audit:roll20-sandbox-sanitize`, and included it in `verify:roll20-preupload`. The export dialog exposes the same expected-transform diagnostics, and preview now has a `Sandbox 예상` toggle that applies the sanitizer approximation in iframe preview only. Latest fixture browser smoke PASS: `corepack pnpm run smoke:roll20-sandbox-preview -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --fixture official-roll20-Les-Oublies --report-dir reports/roll20-sandbox-preview-smoke --port 4331`; normal preview `colgroup=6`, `rolltemplate=3`, `workerScripts=1`; Sandbox expected preview `colgroup=0`, `rolltemplate=0`, `workerScripts=0`, console/page errors 0. Verification: `corepack pnpm run test:roll20-sandbox-sanitize` PASS, `corepack pnpm run audit:roll20-sandbox-sanitize -- reports\roll20-actual-compare\2026-06-18-state-map-v1` PASS, `corepack pnpm run verify:roll20-preupload -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --fixtures test-fixtures\visual --out-dir ./out --base-path /roll20-block-editor --state-map reports\visual-state-candidates\visual-state-candidates-state-map.json` PASS from the prior gate, `corepack pnpm run lint` PASS, `corepack pnpm run build` PASS, and `corepack pnpm run smoke:preview-edit-visual -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/preview-edit-visual --port 4332` PASS. This is still not actual Roll20 visual parity. |
| VERIFY | Codex | Expand Roll20 Sandbox expected preview smoke to all prepared fixtures. | Added `--all` support and package script `smoke:roll20-sandbox-preview:all` for `scripts/roll20_sandbox_preview_smoke.mjs`. Latest run PASS/WARN: `corepack pnpm run smoke:roll20-sandbox-preview:all -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/roll20-sandbox-preview-smoke --port 4333`. AW2E, Les-Oublies, and YSHY 1BU all passed fixture-level sanitizer render checks; Sandbox expected preview stripped visible rolltemplate/source-worker runtime nodes to 0 for all three (`2 -> 0`, `4 -> 0`, `20 -> 0`). `Console status=WARN` records Roll20 image-proxy font CORS and source sheet numeric-expression warnings separately from sanitizer failures; page errors were 0. Verification: `node --check scripts\roll20_sandbox_preview_smoke.mjs` PASS, `corepack pnpm run lint` PASS, `corepack pnpm run build` PASS, and `corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1` still reports `PREUPLOAD_READY_MISSING_GENERATED_ACTUAL`. This is local expected-render coverage only, not actual Roll20 visual parity. |
| DONE | Codex | Surface Roll20 upload readiness clearly in the export dialog. | `components/editor/ExportDialog.tsx` separates local zip-file readiness from actual Roll20 Sandbox/test-room visual verification and uses readable Korean UI copy. It now also exposes a Roll20 Sandbox expected-transform diagnostic panel driven by `sanitizeRoll20SandboxHtml/Css`, showing HTML/CSS rewrite risk, runtime stripping, class/tag rewrites, URL proxy/drop counts, and fatal reject risk without mutating the zip payload. Latest static app smoke PASS: `corepack pnpm run smoke:export-dialog -- --out-dir ./out --base-path /roll20-block-editor --report-dir reports/export-dialog-smoke --port 4326`; it confirms the header and empty-state Korean copy, confirms no sample UI appears when the public sample catalog is empty, confirms no mojibake in the initial shell or export dialog text, opens the export dialog, confirms 5 readiness items, confirms the `실제 검증 필요` badge, confirms the Sandbox diagnostics panel with 4 diagnostic rows, confirms the legacy toggle and local-vs-actual verification warning copy, opens the import dialog, and verifies main mode tab clicks with 0 console/page errors. New fixture-mode smoke PASS: `corepack pnpm run smoke:export-dialog -- --out-dir ./out --base-path /roll20-block-editor --report-dir reports/export-dialog-smoke-imported --fixtures test-fixtures/visual --fixture official-roll20-Les-Oublies --port 4325`; it imports a copied ignored fixture first, then confirms the export Sandbox diagnostics report `치명 오류 없음`, 4 rows, and expected rewrite rows for the real emitted payload. `corepack pnpm run test:roll20-sandbox-sanitize`, `corepack pnpm run audit:roll20-sandbox-sanitize -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `corepack pnpm run lint`, and `corepack pnpm run build` also PASS. Actual Roll20 visual parity remains under the separate Roll20 actual-screen TODO. |

## Critical Product Tasks

| Status | Priority | Task | Notes |
| --- | ---: | --- | --- |
| VERIFY | P0 | Make edit canvas and preview render from the same emitted HTML/CSS path, with edit overlays only. | Latest renderer-regression check after removing the Shadow edit forced `border-box` reset: `corepack pnpm run smoke:preview-edit-visual -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/preview-edit-visual --port 4336` PASS: AW2E 1.75%, Les-Oublies 2.02%, YSHY 1BU 1.01%. Earlier DOM-signature gate PASS showed matching preview/edit screenshot dimensions, edit host/content height delta 0, preview/edit toolbar overlap 0, 0 visible runtime nodes, and DOM signature parity PASS for node counts, block-id counts, tag/control counts, and sequence hash. Edit no longer keeps a fixed 900px canvas shell or renders the preview toolbar over the sheet. `scripts/imported_edit_sync_smoke.mjs` also PASS for 3 imported fixtures after fixing Shadow image referrer behavior and optimistic move clearing, and now includes imported visible-node move sync, imported canvas flow insertion, edited emit -> re-import -> emit stability, safe imported layer reorder where available, and non-leaf subtree reorder for all 3 prepared fixtures. Needs remaining fixture-specific visual fixes and actual Roll20 comparison before DONE. |
| DONE | P0 | Hide `script`, `script[type="text/worker"]`, and `rolltemplate` from sheet canvas in every render mode. | `lib/preview/buildDoc.ts` now hard-hides them after user CSS in iframe and shadow/edit render paths; fixture render report confirms source script/rolltemplate nodes remain for runtime/chat extraction. |
| VERIFY | P0 | Preserve worker JS as a separate future block-coding workspace. | Worker workspace split is implemented and now source-audited: import replaces the worker workspace from source `<script type="text/worker">` bodies, including nested/raw worker scripts, strips worker scripts from visual HTML, and emit appends one Roll20 worker script without duplicate visual/runtime leakage. `corepack pnpm run audit:worker -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/worker-source-audit` PASS for AW2E, Les-Oublies, and YSHY 1BU with exact worker source bodies. `corepack pnpm run smoke:worker`, `scripts/browser_roundtrip_smoke.mjs`, and `scripts/imported_edit_sync_smoke.mjs` also PASS for the 3 prepared ignored fixtures. Still needs broader corpus audit and actual Roll20 sandbox/test-room worker runtime parity before DONE. |
| DONE | P0 | Implement real browser L2 roundtrip: import -> emit -> import -> compare. | **3/3 fixtures PASS** (AW2E, Les-Oublies, YSHY 1遺 6531 blocks): `reports/roundtrip-browser/browser-roundtrip-results.md`. Fix chain: worker wrapper newline + indent growth, section/toggle multi-class guard, whitespace-only line growth. This proves browser emit stability for 3 fixtures only ??NOT all-sheet support. Imported edit-step smoke now exists separately in `reports/imported-edit-sync/`; expand fixtures next. |
| VERIFY | P0 | Add visual/cascade leak verification for Roll20 preview. | Standalone report (`reports/cascade-leak/cascade-leak-results.md`) and live Shadow DOM report (`reports/live-shadow-cascade/live-shadow-cascade-results.md`) both show 0 app-like CSS winners across 3 fixtures. `preview_edit_visual_smoke` records resource diagnostics and currently reports 0 resource issues for the local preview/edit screenshot path. `capture_visual_fixture_previews.mjs` now also separates render status from resource status and supports `--fail-on-resource-issues true`; latest YSHY and AW2E strict preview captures PASS with resources PASS. Imported edit/reimport still has external image failures to normalize/cache/classify against actual Roll20. |
| DONE | P0 | Add asset URL reachability regression audit. | `corepack pnpm run audit:assets -- --fixtures test-fixtures\visual --payload-run reports\roll20-actual-compare\2026-06-18-pseudo-fix-v1 --report-dir reports\asset-resource-audit` PASS. AW2E, Les-Oublies, and YSHY 1BU source/payload asset refs had 0 failed HTTP probes and 0 missing local relative refs; payload introduced 0 new asset regressions. Local reachability guard only, not Roll20 visual parity. |
| DOING | P0 | Build screenshot-based sheet visual verification from existing preview images. | Inventory, fixture prep, shared preview render, and browser capture smoke are working. Next: normalize viewport/crop and add pixel diff against references. |
| DONE | P0 | Add first browser-canvas pixel diff harness. | `reports/visual-fixture-diff/visual-fixture-diff-results.md`; first diagnostic diff computed for 2 fixtures. Needs viewport/state/crop normalization before parity gating. |
| DOING | P0 | Normalize visual diff viewport, initial sheet state, and crop region. | `corepack pnpm run diff:visual-fixtures` now first captures live local preview PNGs through `scripts/capture_visual_fixture_previews.mjs`, applies optional state-map action/control hints, regenerates diff pages, collects browser JSON, and writes ignored classification reports. The capture step can also be run directly as `corepack pnpm run capture:visual-fixtures` or strict resource mode as `corepack pnpm run capture:visual-fixtures:strict`. Latest strict spot checks PASS: AW2E applies `control_attr_class_Hardholder` with resources PASS, and YSHY 1BU captures initial preview state with resources PASS. Latest full diff run PASS: AW2E applies `control_attr_class_Hardholder` (`attr_class=Hardholder`) and reports 16.23% best mismatch; Les-Oublies applies `act_fullsheet` (`sheetTabForBtn=fullsheet`, `sheetTab=fullsheet`) and reports 8.84% best mismatch. `node scripts\classify_visual_fixture_diffs.mjs reports\visual-fixture-diff test-fixtures\visual` now detects that those state hints are already applied and classifies both AW2E and Les-Oublies as `reference/capture context mismatch`; next action is crop/context normalization or actual Roll20 screenshot collection before renderer CSS changes. The runner was hardened for large fullsheet data-URL pages by waiting on the result JSON instead of locator visibility. `scripts/roll20_actual_local_baseline.mjs`, `scripts/roll20_payload_roundtrip_visual_smoke.mjs`, and `scripts/roll20_preupload_verification.mjs` also accept/forward optional `--state-map`, so the local baseline and cleaned-payload visual roundtrip compare the same state. Latest state-map run `2026-06-18-state-map-v1` is local pre-upload PASS with 0% payload-roundtrip mismatch. This is state/crop triage and upload-readiness evidence only, not actual Roll20 parity. |
| TODO | P1 | Improve raw fallback coverage for sheets such as custom Magica. | Current custom-magica coverage is 95.7%, rawFallback 76. |
| VERIFY | P1 | Make layer panel useful as a Figma-like hierarchy/reparenting surface. | Layer rows expose explicit drag zones (`before`, `inside`, `after`), adapter supports top-level and nested sibling insertion, and children inside a statement chain can be reordered before/after siblings. Canvas widget dragover now exposes `inside`, `before`, and `after`; layer rows now visibly show role labels, `담기 가능` for containers, default placement mode (`흐름` / `자유`), and Korean drop badges (`앞에 넣음` / `안에 넣음` / `뒤에 넣음`). `corepack pnpm run smoke:edit-flow -- --out-dir ./out --base-path /roll20-block-editor --report-dir reports/edit-flow-smoke --port 4318` verifies zone detection, nested input reorder, canvas insertion of new inputs before/after an existing nested input, readable Korean edit UI labels, layer role/drop affordance attributes/text, and synthetic non-leaf group movement with child preservation in emitted HTML. `imported_edit_sync_smoke` now also verifies imported canvas insertion as non-absolute flow content for 3 fixtures, imported layer leaf reorder for Les-Oublies when a safe leaf sibling pair exists, and imported non-leaf subtree reorder with direct child preservation for AW2E, Les-Oublies, and YSHY 1BU. 2026-06-19 strict resource mode was added so visual-parity work cannot hide broken external images/fonts behind an edit-interaction PASS. Still needs richer screenshot evidence for real user drags and actual Roll20 comparison before DONE. |
| VERIFY | P1 | Define absolute positioning inside frames/groups. | Synthetic browser smoke now verifies two paths: dragging an existing frame child creates parent design CSS `position: relative` plus child design CSS `position: absolute; left/top`; and the user-facing free placement mode drops a new gallery text input into a frame as a nested absolute child with emitted/computed left/top matching. Imported real-fixture smoke also PASS for the 3 prepared ignored fixtures: free placement produced nested absolute inputs inside imported frame/flow targets with parent `relative`, child `absolute`, and emitted/computed left/top matching. Evidence: `scripts/edit_flow_browser_smoke.mjs` and `scripts/imported_edit_sync_smoke.mjs` PASS against static `out/`. Still needs richer UX screenshot evidence and actual Roll20 sandbox/test-room comparison before DONE. |
| DONE | P1 | Add shared DOM layer role classification for edit UX. | `lib/editor/layerRoles.ts` gives frame/flow/table/control/action/text/media/runtime roles used by the layer panel, gallery drop detection, and Shadow DOM edit affordance CSS. Real drag/drop browser smoke passed (`reports/edit-flow-smoke/`): dropped section exposes `data-r20-layer-role="frame"` + `data-r20-can-drop="1"` and receives flow children. |
| VERIFY | P1 | Expand Roll20 worker simulator and chat rolltemplate rendering. | Local chat smoke now clears chat per fixture and checks exactly 1 card, 280px rolltemplate width, and no app-only `rolltemplate:name` debug label. Latest report: `reports/rolltemplate-chat-smoke/rolltemplate-chat-smoke-results.md`. AW2E, Les-Oublies, and YSHY all PASS with real `user-click` after preserving `r20_hidden_input` classes; Les-Oublies now exposes actionable default-tab roll buttons. Added `corepack pnpm run smoke:worker-state`: synthetic Roll20 tab sheet PASS proves action buttons trigger worker `setAttrs`, hidden input DOM property and `value` attribute both update, CSS `[value=...]` sibling selectors switch visible panels, and duplicate `attr_*` checkbox/radio controls mirror checked state so CSS `:checked` anchors update. Latest worker-state smoke has 0 console/page errors; source worker preservation rechecked by `corepack pnpm run audit:worker` PASS for AW2E, Les-Oublies, and YSHY. Actual Roll20 chat/worker parity remains TODO. Worker simulator split still TODO. |
| VERIFY | P1 | Add explicit modern/legacy Roll20 preview/export mode checks. | Export-level synthetic audit PASS: `corepack pnpm run audit:legacy-export -- --report-dir reports/legacy-export-audit`. Preview/edit render-path smoke PASS: `corepack pnpm run smoke:legacy-preview -- --report-dir reports/legacy-preview-smoke`, and the toolbar exposes `data-testid="preview-legacy-css-toggle"` for the local preview/edit legacy CSS mode. Imported-fixture visual smoke PASS: `corepack pnpm run smoke:legacy-fixture-visual -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/legacy-fixture-visual`; AW2E and YSHY 1BU had no legacy-risk CSS in the emitted preview chunk, while Les-Oublies reduced risk `1 -> 0` with 0 console/page/resource issues. Actual Roll20 legacy sandbox/test-room parity still TODO. |
| DONE | P0 | Add default-state CSS selector regression audit. | `corepack pnpm run audit:state-selectors -- --fixtures test-fixtures\visual --payload-run reports\roll20-actual-compare\2026-06-18-pseudo-fix-v1 --report-dir reports\state-selector-audit` PASS. It verifies source and generated payload controls against hidden/value/checked CSS state selectors, and fails only when payload creates a new missing-anchor regression beyond source. AW2E and Les-Oublies had 0 source/payload anchor issues; YSHY had 7 source-only dead/worker-driven selector anchors and 0 payload regressions. Local semantic guard only, not Roll20 visual parity. |
| DOING | P0 | Run Roll20 actual-screen check with Chrome session. | Clean local payloads are generated by `scripts/roll20_actual_local_baseline.mjs` and gated by `corepack pnpm run verify:roll20-preupload -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --fixtures test-fixtures\visual --out-dir ./out --base-path /roll20-block-editor --state-map reports\visual-state-candidates\visual-state-candidates-state-map.json`, latest PASS. Chrome reached the dedicated Roll20 Custom Sheet Sandbox. File chooser upload remained blocked, but direct sandbox endpoint application succeeded for Les-Oublies: POST `/sheetsandbox/savesheetsettings` accepted generated HTML/CSS/translation, `customcharsheet_json` was saved on the settings page, a sandbox character opened the generated sheet iframe, and preferred `roll20-sandbox-root.png` evidence was cropped from the visible Roll20 sheet area. `node scripts\roll20_actual_screenshot_diff.mjs reports\roll20-actual-compare\2026-06-18-state-map-v1` reports Les-Oublies sandbox mismatch `21.67%`; `corepack pnpm run classify:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1` now distinguishes the partial-height evidence (`760x556` visible crop vs `850x4478` full local preview) from the matched visible viewport mismatch (`21.67%`). `corepack pnpm run diagnose:roll20-visible-crop -- reports\roll20-actual-compare\2026-06-18-state-map-v1` adds ignored visual crop/overlay artifacts and shows horizontal top-crop search improves only `0.34%`, so simple x-offset is not the main cause. AW2E/YSHY and chat screenshots still SKIP. A Roll20 roll button click generated one `sheet-rolltemplate-classic-roll` chat DOM message, but right-pane screenshot capture was blocked/misleading because Roll20 UI layers and capture coordinate handling kept producing non-chat images; the wrong `roll20-chat.png` was removed so status remains truthful. Current status command reports `PARTIAL_GENERATED_ACTUAL_SCREENSHOTS`, `generatedActualScreenshots=1/6`, `generatedDiffed=1/6`, `roomObservationScreenshots=0/3`, and `roomObservationDiffed=0/3`. Existing solo rooms are observation-only; generated sheet checks must use Custom Sheet Sandbox first or a new test room. Store screenshots/reports locally only. |
| VERIFY | P0 | Implement actual Roll20 sandbox sanitize/prefix contract locally. | First module/test slice exists in `lib/emit/roll20SandboxSanitize.ts` and `lib/emit/__tests__/roll20SandboxSanitize.test.ts`; package command `corepack pnpm run test:roll20-sandbox-sanitize` covers selector prefixing, Roll20 URL proxy/drop behavior, unsafe CSS rejection, HTML allow-list/class exceptions, runtime source stripping, and HTML URL proxy/drop behavior. The module is now wired into `scripts/roll20_sandbox_sanitize_audit.mjs`, the local `verify:roll20-preupload` gate, the export dialog's explicit Sandbox expected-transform panel, and a preview-only `Sandbox 예상` render toggle. Latest preview toggle smoke PASS: `corepack pnpm run smoke:roll20-sandbox-preview -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --fixture official-roll20-Les-Oublies --report-dir reports/roll20-sandbox-preview-smoke --port 4331` verifies the imported fixture changes from normal preview `colgroup=6`, `rolltemplate=3`, `sourceWorkerScript=1` to Sandbox expected preview `colgroup=0`, `rolltemplate=0`, `sourceWorkerScript=0` with 0 console/page errors. Latest checks PASS: `corepack pnpm run test:roll20-sandbox-sanitize`, `corepack pnpm run audit:roll20-sandbox-sanitize -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, empty-workspace export smoke on port 4326, imported-fixture export smoke on port 4325, `corepack pnpm run lint`, `corepack pnpm run build`, and `corepack pnpm run smoke:preview-edit-visual -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/preview-edit-visual --port 4332`. Next: compare against actual Roll20 screenshots after upload unblocks. |
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
| DONE | Explicit YSHY 1BU fixture smoke | `scripts/prepare_explicit_fixture.mjs` copied `1遺 HTML.html`, `1遺 CSS.css`, and `踰덉뿭.txt` into ignored fixture `yshy-commission-1bu`; `buildSheetDoc` render and Browser Use load completed with 0 console errors/warnings. |
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
| DONE | YSHY mapping-fidelity verification + 10-defect fix batch | `reports/mapping-fidelity/mapping-fidelity-yshy.md`. All Roll20-meaningful token categories now EXACT between source and emit for YSHY 1遺 (attr 1069, inputs 1049, roll buttons 808 name+value, data-i18n 1083, placeholders 140, disabled 6, i18n keys 399). Fixed: DOMParser self-closing tag swallowing, r20_skill_row missing field definitions,  XML-illegal separator, placeholder->value pollution, i18n key mangling, placeholder/data-i18n/disabled loss on input/textarea/heading/caption, CSS attribute-selector space loss, section/toggle multi-class guard, whitespace-line indent growth, hook bumpStructure. `lint`/`build`/smoke/roundtrip all re-passed 2026-06-12. |

## Forbidden Claims

- Do not say "100% import/export" yet.
- Do not say "Roll20 visual parity" yet.
- Do not say "all sheets are supported" yet.
- Do not say worker JS block coding is complete yet.

## External Source Safety

Never write into:

- `D:\?숇깷??留덈젋??roll20-character-sheets-master`
- `D:\?숇깷??留덈젋???곗븣\[以묒슂]而ㅼ뒪??쒗듃`
- `D:\?숇깷??留덈젋???곗븣\0 CoC\?곸떆??H??而ㅻ????쒗듃`

If fixtures are needed, copy selected files into workspace-owned ignored folders only.
