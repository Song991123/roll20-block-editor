## 2026-07-18 Persistent Preview Synthetic Pointer Smoke Recheck

- VERIFY: The persistent preview smoke was re-run with `./out` as the static
  app root and a separate ignored report directory. Sidebar, import, and
  earlier iframe checks begin, but both modern and legacy runs time out while
  waiting for the parent drop overlay after the synthetic pointermove.
- CORRECTION: An earlier failed attempt used the report directory as
  `--out-dir`, which caused a 404 and was not a valid product result. The
  corrected run reaches the pointer bridge wait, so the remaining issue is
  isolated to the synthetic event observation path.
- BOUNDARY: No product pointer code was changed and no actual Roll20 claim is
  added. A real-pointer or focused bridge diagnostic is required before any
  renderer/edit UX change.

## 2026-07-18 Roll20 Upload Reconnect Guard

- DONE: Hardened `scripts/roll20_upload_cdp_apply.mjs` for the observed Roll20
  behavior where submitting a Sandbox file recreates the document context.
  A navigation-related evaluation error is now recorded as
  `reloadDuringSubmit=true` only when the page returns to Roll20 and the
  Sandbox inputs are present; unrelated evaluation failures remain blocking.
- VERIFIED LOCAL: CDP helper self-test, syntax check, diff check, and the full
  `corepack pnpm run ci:verify` gate pass.
- VERIFY: The guard still requires a post-reload activation probe and cannot
  promote a Sandbox submission to visual parity by itself.

## 2026-07-18 Public Sample Surface and Hydration Warning Fix

- Removed the public sample-sheet menu and empty-state sample action from the
  product. The public first-run path is now blank creation or user import;
  ignored local fixtures remain development-only.
- Found and fixed the real Blockly warning source: the preserved-attribute
  initializer was wrapped after registration, so Blockly retained the old
  function. The registry now replaces the live `Blockly.Blocks` entry too.
- Corrected the export browser smoke to inspect the persistent iframe frame and
  to verify placeholder maps preserve the original URL until a valid target is
  provided.
- Fresh build + `smoke:export-dialog`: PASS. Console issues `0`, page errors
  `0`, request failures `0`, external resource requests `0`.
- Boundary: no actual Roll20 parity claim; modern Sandbox and legacy-room
  verification remain `VERIFY` until the permitted browser session returns.

## 2026-07-18 Roll20 Sandbox Reconnect Attempt

- PREPARED LOCAL: `.tmp/roll20-actual-synthetic/` contains only an anonymous,
  development-only HTML/CSS/translation payload for a narrow modern Sandbox
  smoke. It contains no copied sheet source, reference image, or public sample.
- OBSERVED: The signed-in one-member Roll20 room still exposes the dedicated
  `Sheet Sandbox Tools` controls and the expected HTML/CSS/Translation file
  inputs. Existing character dialogs remained observation-only.
- VERIFY: A browser file selection caused Roll20 to recreate the sheet iframe
  and briefly detach the automation connection. The follow-up iframe still
  showed the pre-existing room sheet, so this attempt provides no new positive
  activation or visual-parity evidence. It is not promoted to `DONE`.
- NEXT P0: Reconnect the Sandbox with a page-reload-tolerant upload path, prove
  the anonymous payload marker inside a fresh sheet iframe, then capture the
  normalized root and asset state. Legacy must still be tested separately in a
  dedicated legacy-enabled room.

## 2026-07-18 Active Goal Rewrite

The user clarified that the running goal itself needed to be reset, not only
the implementation notes. The canonical objective is now the product-reset
statement in `docs/operations/41_product_reset_and_short_term_goals.md`:
first establish the real current state and user workflow, then reset the app
design, unify the actual preview/edit surface, verify modern and legacy
Roll20 behavior, and only then deepen Figma-like editing and worker/chat
support. No copyrighted samples belong in the public product.

The live goal container was subsequently rewritten in the Codex UI to the
product-reset objective. This log keeps the repository-side control document
as the durable source of truth for the same scope.

## 2026-07-18 Local Render Unification Regression Pass

`ci:verify`, `smoke:persistent-preview-surface`, and `smoke:edit-flow` all
passed. The paired local preview/edit visual smoke also passed for all three
local comparison fixtures in both modern and legacy modes with zero mismatched
pixels. This raises the shared preview/edit evidence level to `3/4` in the
control document.

This remains local evidence only. The live Roll20 modern Sandbox and dedicated
legacy-room comparison are still `VERIFY`; no actual Roll20 parity claim is
made until the permitted browser session is connected again.

## 2026-07-18 Generic HTML Roundtrip Stabilization

The browser roundtrip harness initially exposed three generic instability paths:
formatted direct text accumulated indentation, radio controls re-emitted a
nested label, and punctuation between controls drifted by one space. The
importer now canonicalizes ordinary text-node layout whitespace while keeping
`pre`/`textarea` raw, and it collapses the common authored radio-label wrapper
into the radio block's native output shape.

After a fresh production build, all three ignored local comparison fixtures
passed import -> emit -> import with stable HTML/CSS/i18n/worker outputs. The
focused import suite is `27/27`, full `ci:verify` passes, and the paired
modern/legacy visual smoke remains exact. This is local generic-corpus evidence;
live Roll20 parity and all-sheet coverage remain open.

## 2026-07-18 Dead Shadow Editor Removal

- Removed the unmounted `LegacyShadowEditCanvas` and its obsolete drag/emit helpers. The visible edit experience remains the persistent Roll20 iframe with parent-owned toolbar, layer panel, and interaction overlays.
- Removed renderer/widget imports left behind by that inactive implementation.
- Updated the render-mode smoke to assert one shared iframe render surface between preview and edit; it now passes with the active architecture.
- Local lint and production build pass. Full `ci:verify` must be rerun after this source/test cleanup; no actual Roll20 parity claim is added.

## 2026-07-18 Modern Sandbox CSS Pair Finding

- Used the dedicated Roll20 Custom Sheet Sandbox upload path with a local-only generated payload. The activation checker returned `VISIBLE_MATCH` for the expected modern runtime and a visible character iframe; no existing room settings or sheet source were changed.
- The first actual screenshot exposed a generic render-contract issue: HTML class tokens had the canonical `sheet-*` prefix while CSS raw fallbacks retained authored unprefixed selectors. The iframe therefore showed the structure but missed most user styling.
- Added a final `normalizeEmittedRoll20Pair()` boundary in `lib/preview/emit.ts`, applying the same idempotent HTML/CSS prefix mapping to raw and parsed output. Added synthetic regression coverage in `lib/preview/__tests__/emitContract.test.ts` and a package script.
- Evidence boundary: the actual upload/activation finding is current, but visual parity after this patch is not yet rechecked. Legacy remains a separate test-room destination.
- Follow-up: regenerated a local-only payload with the shared HTML/CSS class normalization and valid JSON translation, re-applied it to the dedicated Sandbox, and ran a fresh activation checker. It returned VISIBLE_MATCH; iframe computed styles showed prefixed selectors, section background images, translation text, and 3-column landmarks.
- Remaining evidence: the Roll20 iframe reported one external font face in error state. No font-specific or fixture-specific CSS patch was added; full screenshot diff and asset parity remain VERIFY items.
- Gates: local lint/build/ci:verify/server hygiene passed; remote CI run 29598910200 passed safety/unit verification, lint, and build.

## 2026-07-18 Composite Attribute Safety Gate

- Implemented a generic fail-safe in `lib/import/composite_matcher.ts`: composite packing now checks the hidden preserved-attribute metadata against the attributes each compact renderer can actually emit. Unsupported attributes keep the atomic `tr/td/input` or header tree instead of being erased by `skill_row`, `attribute_card`, or repeating-header packing.
- Added `hasPreservedAttributeOutside` to `lib/blocks/preservedAttributes.ts` and regression coverage for input inline style and unknown input attributes.
- Verified locally with composite Phase 1 `11/11`, Phase 2 `13/13`, high-priority import `20/20`, wrapper preservation `11/11`, basic import `25/25`, preserved-attribute test, and `git diff --check`.
- Boundary: this is importer safety evidence only. Roll20 upload remains blocked by the browser file-chooser policy (`Not allowed`), so no actual Sandbox render or parity claim is added.

## 2026-07-17 Direct Text Node Import Contract

- Implemented: `matchChildren()` now turns meaningful direct text nodes into the generic `r20_text_node` block, preserving text around nested inputs and other elements in source order. The emitter escapes the text and emits it without a synthetic wrapper.
- Verified: Import unit suite `23/23`, `ci:verify`, lint, production build, `git diff --check`, and server-hygiene check passed.
- Boundary: This is a generic importer structure fix only. It does not claim universal HTML/CSS/attribute fidelity, actual Roll20 parity, worker runtime parity, or rolltemplate/chat parity.
- Next: Retry the blocked modern Sandbox upload through an explicitly permitted browser file-upload path; keep legacy actual validation separate in a legacy-enabled test room.

## 2026-07-17 Direct Text Whitespace Guard

- Implemented: The direct-text matcher ignores indentation-only nodes in ordinary containers, while preserving whitespace-only content in `pre` and `textarea` parents.
- Verified: Import unit suite `24/24`, lint, and `git diff --check` passed.
- Boundary: This is an importer inflation guard only. It does not prove actual Roll20 parity, complete attribute preservation, or all-sheet mapping.

## 2026-07-17 Target-Specific Canvas Width Contract

- Preview and edit continue to share the persistent iframe; the active edit target now selects the matching canvas width for both surfaces.
- Added a synthetic regression for switching from sheet editing to roll-result editing and committing a distinct width. The browser smoke passed after a fresh build with zero console/page errors.
- No external source data, source identifiers, screenshots, or derived external measurements were added to this record.

## 2026-07-17 Matching-Runtime Activation Evidence

- Rechecked the paired actual evidence against later local runs and confirmed that the previously reported shared `+9px` row drift was stale: current modern local root height matches actual at `1936px`, while legacy retains an isolated roughly `2px` final-section difference.
- Captured read-only matching-runtime evidence in the dedicated modern Sandbox and legacy test room. Modern actual/local root scroll is `1189x1936` in both. Legacy actual is `896x1917` versus local `895x1919`.
- Localized the remaining geometry. Modern final row is `433.913px` actual versus `434.30px` local; legacy is `432.313px` actual versus `434.30px` local. Inside it, the asset-table row is effectively exact in modern (`113.138px` actual, `113.14px` local) but `1.603px` shorter in actual legacy (`111.537px`).
- Extended `roll20_upload_snippet.mjs` so its generated activation checker also returns bounded final-layout descendants, table spacing/collapse/layout styles, and grouped duplicate-attribute state instead of an unstructured duplicate list.
- Added an explicit ignored output override for locked canonical reports. A real local payload generated under `%TEMP%\roll20-activation-render-evidence-r5`; source and generated activation snippets passed syntax/self-tests.
- No Roll20 room or sheet source was modified and no private evidence was added to Git. No renderer CSS was changed because table spacing/collapse/allocation evidence is not yet complete enough for a generic mode-specific rule.

## 2026-07-17 Canonical Iframe Edit Surface Phase 2F

- Connected iframe right click to the existing edit context menu through the validated opaque-origin bridge. Parent coordinates account for iframe scaling, and non-left pointerdown no longer enters drag state.
- Added worker replacement coverage: a live A-to-B source update resets old handlers, runs the new `sheet:opened`, preserves one iframe and one worker script, and does not reload in either compatibility mode.
- Split the runtime edit path from the old Shadow implementation. The default component now renders only toolbar/layer chrome and the persistent iframe slot; the named fallback is not mounted, so duplicate source preparation, Shadow DOM, and observers no longer run.
- Final local evidence `.tmp/persistent-lightweight-chrome-r63` PASSes the complete synthetic interaction contract independently in modern and legacy with Shadow hosts `0`, iframe reloads `0`, and browser errors `0`.
- Claim boundary: local preview/edit now share one live render surface. Actual Roll20 visual parity and broad third-party worker API support remain separate open gates.

## 2026-07-17 Persistent Iframe Edit Surface Phase 2E

- Promoted the persistent preview iframe to the visible edit canvas without remounting it. Parent-owned toolbar, layer panel, selection outline, and drop-target outline remain outside the Roll20 document.
- Added containing-block geometry and managed design CSS commits for free placement. The visible drop position is held optimistically until the live iframe apply acknowledgement, avoiding rollback paint and keeping design coordinates out of authored HTML inline styles.
- Bridged friendly widget drag/drop through the sandbox boundary. Only the known MIME and registered preset payloads are accepted; flow drops update Blockly topology and free drops use generated CSS classes.
- Local evidence `.tmp/persistent-widget-drop-r55` PASSes modern and legacy independently. Each row verifies visible iframe geometry, flow and free commits, gallery drop, state preservation, zero iframe reloads, and zero browser errors.
- Expanded evidence `.tmp/persistent-zoom-roll-r58` verifies layer selection in both directions, fit/100% zoom without iframe replacement, and a real preview roll button rendering a rolltemplate chat card in modern and legacy independently.
- Static evidence: focused protocol/target/position tests, lint, and production build PASS.
- Remaining boundary: the hidden Shadow render is still mounted as a transitional fallback, and actual Roll20 visual parity is not claimed. Worker-source replacement and context actions still need visible-iframe coverage before duplicate Shadow removal; actual Roll20 upload comparison remains separate.

## 2026-07-17 Persistent Iframe Edit Bridge Phase 2D

- Added revisioned in-frame HTML/CSS/i18n live apply with an explicit acknowledgement. The persistent iframe keeps its document identity and Roll20 form/runtime state instead of reloading `srcdoc` after each emit.
- Added iframe flow pointer-up commit through the existing Blockly before/inside/after adapter operations. Parent-owned optimistic translation remains visible until the corresponding apply acknowledgement.
- Fixed the post-import intrinsic-width race by reopening the one-shot grow-only width measurement at apply acknowledgement. This returned the large prepared fixture from `7,233/7,329` preview/edit differing pixels to the established `22/0` modern/legacy baseline.
- Browser evidence `.tmp/persistent-flow-commit-r51` PASSes independently in modern and legacy: real target nesting, increasing apply revision, preserved input/runtime token, legacy-only style where required, iframe reload count `0`, and no console/page errors.
- Shadow fallback regression `.tmp/edit-flow-live-apply-r46` PASSes with flow/free placement, layer before/inside/after, absolute-in-frame placement, and zero post-drop drift.
- Final paired visual evidence `.tmp/preview-edit-live-apply-final-r52` keeps the strict threshold: Les-Oublies exact in both modes; YSHY modern `22` pixels different and legacy exact; AW2E `36` pixels different in both. Style and geometry parity pass, but the three non-exact rows remain failed rather than being rounded into success.
- Hardened the synthetic persistent smoke against a rare clear/import startup race after one legacy run returned zero blocks. A subsequent clean paired run passed both modes.
- The visible edit surface is still Shadow-backed. Free placement on the iframe, changed-worker-source state, roll/chat, zoom, final surface exposure, and actual Roll20 upload remain P0 and must pass separately in modern and legacy.

## 2026-07-17 Persistent Iframe Edit Bridge Phase 2C

- Replaced captured-event target lookup with `document.elementFromPoint`, so the original drag subject remains stable while the hit path follows the actual pointer location.
- Added `lib/editor/iframeDropTarget.ts` and a CI unit test. The resolver combines iframe geometry with live Blockly roles, returns before/inside/after, and excludes the moving subject and its descendants from cyclic drops.
- `PreviewMain` now renders a separate parent-owned drop candidate rectangle without adding application CSS inside the Roll20 iframe.
- Browser evidence `.tmp/persistent-drop-target-r38` PASSes independently in modern and legacy. In both rows the subject and target ids differ during a real rAF pointermove, the frame resolves to `inside`, cancel removes the target overlay, input/runtime state survives, reload count stays `0`, and console/page errors stay empty.
- Regression evidence `.tmp/edit-flow-drop-target-r39` PASSes current Shadow flow/free interactions with zero drift. `.tmp/preview-edit-drop-target-r39` is exact in both modes.
- The harness temporarily makes the persistent pane paint-visible because Chromium suspends rAF in a hidden iframe. This proves the move path but is not yet the shipped visible iframe editor. Pointer-up commit, optimistic translation, emit/apply acknowledgement, and the final visible-surface switch remain P0.

## 2026-07-17 Persistent Iframe Edit Bridge Phase 2B

- Extended `r20:edit-hit` with stable pointer identity/button state, `pointercancel`, fixed drag subject geometry, ancestor hit paths, and offset-parent/position evidence.
- The iframe now attempts pointer capture, coalesces move reports with rAF, retains the pointer-down subject across the sequence, and clears pending state on cancel or edit-mode exit.
- Hardened parent acceptance so subject, offset-parent, and every hit-path block id must exist in the live HTML Blockly adapter before the edit overlay is updated.
- Modern and legacy browser evidence is separate in `.tmp/persistent-pointer-geometry-r35`: both PASS with hit-path length `3`, a valid containing block, final cancel state, preserved input/runtime state, zero iframe reloads, and no console/page errors. The legacy row also requires its mode-specific runtime style.
- Regression evidence `.tmp/edit-flow-pointer-geometry-r34` PASSes current Shadow interactions with `0px` drift. Focused `.tmp/preview-edit-pointer-geometry-r34` is pixel exact in both modes. `ci:verify`, lint, production build, and server hygiene pass.
- A first smoke attempt deadlocked because the iframe is deliberately `visibility:hidden` during transitional edit mode and Chromium suspends its rAF. The harness now verifies synchronous down/cancel geometry in that state; it does not misreport a visible pointer-move stream.
- Next P0 is the visible iframe edit-surface switch, parent-derived flow targets, optimistic overlay drag paint, one Blockly commit on pointer-up, and iframe apply/ack. Shadow remains the fallback until modern and legacy pass those gates independently.

## 2026-07-16 Persistent Iframe Edit Bridge Phase 2A

- Added `lib/preview/iframeEditBridge.ts` as the typed/validated parent boundary for persistent iframe edit messages.
- Extended the iframe runtime with a random per-document bridge id, edit-mode command handling, rAF-coalesced pointer geometry, selected-node measurement, native-control interception while edit mode is enabled, and a ready handshake.
- Hardened the parent listener to require the current iframe source, opaque `null` origin, valid protocol payload, current bridge id, and a live HTML block id before updating selection or overlay state.
- Added an edit-only parent overlay around the measured iframe block. This is the first bridge slice and remains hidden behind the current Shadow fallback UI; no iframe drag commit is claimed yet.
- Browser evidence `.tmp/persistent-iframe-edit-bridge-r29`: modern PASS and legacy PASS independently, stale bridge id rejected, overlay selection/measure roundtrip PASS, form/runtime state preserved, and iframe load count `0` in both modes.
- Regression evidence: `.tmp/preview-edit-iframe-bridge-r30` is exact for the focused ignored fixture in modern and legacy; `.tmp/edit-flow-iframe-bridge-r31` PASSes the current Shadow fallback interactions with zero post-drop drift.
- Added `test:iframe-edit-bridge` to the common CI suite. Remaining Phase 2 work is pointer identity/cancel, ancestor and containing-block geometry, parent-derived flow targets, optimistic drag overlay, and in-frame apply/ack before the visible canvas can switch safely.

## 2026-07-16 Persistent Preview Surface Phase 1

- Changed `EditorShell` so `PreviewMain` remains mounted in every main mode. Preview/edit switches now hide the pane without replacing the iframe, which preserves live Roll20 runtime and form state for the future overlay editor.
- Added `scripts/persistent_preview_surface_smoke.mjs` and the `smoke:persistent-preview-surface` command. The smoke uses synthetic source only and validates modern and legacy independently, including the legacy-only runtime style marker.
- Final persistent-surface evidence `.tmp/persistent-preview-surface-final-r27`: modern PASS and legacy PASS, iframe count `1`, load count `0`, same DOM element before/during/after edit, and input/runtime token preserved in both modes.
- Focused ignored-fixture visual evidence `.tmp/preview-edit-persistent-r23`: modern `EXACT`, legacy `EXACT`, console errors `0`, page errors `0` for both rows.
- During edit-flow regression, found a harness defect: a synthetic layer reorder omitted the body dataset normally set by `dragstart`, then read a row that React could replace after `dragover`. The smoke now mirrors the actual drag state and re-queries the current row. `.tmp/edit-flow-persistent-r26` PASSes with zero position drift and no console/page errors.
- Claim boundary: the iframe is now persistent, but edit mode still renders the Shadow interaction surface. The next slice is iframe bridge plus overlay; do not remove Shadow or claim preview/edit single-DOM completion until modern and legacy interaction/runtime gates pass separately.

## 2026-07-16 Shared Render Contract and Two-Mode Preview/Edit Gate

- Introduced a shared prepared render contract so iframe and Shadow serializers no longer repeat prefix, Sandbox sanitize, legacy sanitize, translation, autocalc, and repeating-runtime transformations.
- Updated PreviewMain and EditCanvas to consume the same atomic `modern|legacy` input. This is the safe prerequisite for the persistent single-surface migration; it does not yet claim one live DOM.
- Extended the preview/edit visual smoke with `modern`, `legacy`, and `both` execution. The paired run now produces six independently labeled results for three ignored fixtures.
- Paired evidence `.tmp/preview-edit-both-contract-r19`: Les-Oublies exact in both modes; YSHY exact in legacy and `22` pixels different in modern; AW2E `36` pixels different in both. Every case has matching computed styles and visible geometry. Focused AW2E rerun `.tmp/preview-edit-aw2e-both-r20` reproduced `35-36` pixels, so the strict threshold remains unchanged and the result stays failed rather than being rounded into a pass.
- Edit interaction regressions were not introduced: `.tmp/edit-flow-render-contract-r21` PASSed flow nesting, sibling insertion, absolute-in-frame placement, optimistic lock, and canvas width controls. `.tmp/imported-edit-render-contract-r21` PASSed imported edit-to-preview coordinate synchronization and stable re-import.
- Full paired fixture smoke `.tmp/paired-shared-contract-r22` also PASSed all three ignored fixtures through modern and legacy with zero console/page errors. `ci:verify`, lint, and production build pass for the shared-contract batch.
- Next implementation slice: persistent iframe ownership in EditorShell plus an edit overlay/bridge. Do not remove the Shadow path until modern and legacy visual, drag/drop, worker, roll/chat, and nested-coordinate gates all pass independently.

## 2026-07-16 Modern and Legacy Mode Invariant Hardening

- Audited the current compatibility path after the user reconfirmed that modern and legacy Roll20 are equally required targets.
- Removed two independent preview-store mutators that could split HTML prefixing from legacy CSS sanitization. The product-facing and verification paths now converge on one atomic `modern|legacy` action.
- Preserved the legacy-named browser-smoke alias as a compatibility shim, but it now selects the complete legacy or modern contract instead of toggling CSS alone.
- Expanded final-row layout diagnostics. Local modern and legacy both measure the last row at `434.30px`; actual modern is about `433.91px` and actual legacy about `432.31px`. The larger legacy-only delta remains a real open runtime-model question.
- Attempted read-only DOM collection from the already-open dedicated Roll20 modern and legacy tabs. Tab discovery succeeded, but the heavy editor tabs timed out before computed-style extraction. No Roll20 room or sheet was changed and no speculative geometry patch was made.
- Verification passed: `ci:verify`, `test:roll20-render-modes`, lint, production build, `git diff --check`, and paired browser smoke `.tmp/paired-mode-invariant-r18` across all 3 ignored fixtures in both modes. `check:server-hygiene` reported zero project listeners after the browser smoke.
- Next P0: obtain actual final-row computed-style evidence, then continue the stronger single-live-render-surface edit architecture without weakening either compatibility mode.

## 2026-07-16 Paired Runtime Paint and Initial Autocalc

- Removed app CSS that overrode imported sheet background repeat/position and split disabled-input paint so modern and legacy remain independent runtime contracts.
- Added Roll20 runtime `btn`/`ui-draggable` classes and repeating-control classes to both iframe and Shadow mounts.
- Added deterministic preview-only autocalc for disabled number controls using the existing parser/executor. The prepared fixture now resolves HP max `10`, MP max `10`, and SAN max `99` in both modes while preserving every original formula in the HTML value attribute.
- Latest ignored paired smoke `.tmp/paired-all-runtime-r16` PASSes all 3 prepared fixtures in both modes. The measured fixture renders modern `1189x1936` and legacy `895x1919`, with import `6530` blocks, worker `1`, warnings `2`, console errors `0`, and page errors `0`.
- Actual/local delta-60 results: modern `4.434%` with mean absolute channel delta `5.318`; legacy best-aligned `6.375%` with mean `8.725`. These are partial improvements, not visual parity.
- Preview/edit DOM signature, computed-style, and visible-geometry parity all PASSed. Pixel comparison is currently `BLOCKED_ASSET`: the ignored private fixture root background returned Imgur `403` in the Shadow capture. The evidence remains local and no external asset bytes were added to the repository.
- Verification completed in this batch: `test:roll20-render-modes`, lint, production build, paired browser fixture smoke, syntax check, and diff check. Preview/edit pixel PASS remains open until a user-owned ignored relink target is supplied.
- Next: preserve the two-mode gate, rerun asset-safe preview/edit parity, then diagnose the remaining legacy bottom geometry without fixture-specific CSS.

## 2026-07-16 Roll20 Runtime Control Geometry Alignment

- Live actual Roll20 geometry showed that roll-button box size already matched, but generated Roll20 roll buttons align to the middle while the local baseline used the browser's baseline alignment. This accounted for about `9px` of false height in the HP/wound/SAN region in both modern and legacy modes.
- Added the measured roll-button alignment and repeating-control minimum height to the shared preview/edit runtime baseline. The declarations are not fixture selectors and remain lower priority than imported user CSS.
- Expanded `smoke:legacy-fixture-visual` evidence with control state, layout-contributor, and flow-segment diagnostics while keeping all fixture/report output ignored.
- Latest paired local evidence `.tmp/paired-repcontrol-r8`: modern `1189x1936`, legacy `895x1918`, preview errors `0`, page errors `0`. Actual roots remain modern `1189x1936` and legacy `896x1917`.
- Best-aligned actual-vs-local channel-delta-60 mismatch improved from `7.61%` to `5.64%` modern and from `9.65%` to `7.28%` legacy. Mean absolute channel difference is `6.33` modern and `9.29` legacy.
- Modern downstream landmark geometry is now within roughly `0.04px` of the measured actual root. Legacy retains a small bottom-section difference: center position about `-0.37px`, final section height about `+1.58px`.
- Claim boundary: both destinations improved, but neither mode is declared visually identical. Persisted Roll20 values/focus state, raster/font normalization, broader fixture coverage, and the remaining legacy bottom geometry are still open.

## 2026-07-16 Paired Full-Root Modern and Legacy Verification

- Persisted ignored actual Roll20 full-root screenshots for the same prepared payload in both dedicated destinations: modern `1189x1936`, legacy `896x1917`. No screenshot, payload, fixture source, or generated report is staged for public Git.
- Fixed the local visual harness to call the atomic compatibility action. This keeps modern authored-class preservation and legacy HTML prefix plus CSS sanitization from being measured as independent, impossible product states.
- Replaced long-element screenshot capture with a clipping-safe full-root iframe compositor and added per-mode computed-style, input-height, top-level landmark, and nested landmark evidence.
- Added a small post-snapshot runtime parity layer for the currently measured Roll20 text-input height and roll-button defaults. It is shared by preview iframe and edit Shadow render, and remains lower priority than user sheet CSS.
- Local verification on the prepared fixture: import `6530` blocks, worker `1`, warnings `2`; preview/edit underlying paint `EXACT` with `0` mismatched pixels. Final paired smoke `.tmp/paired-modern-legacy-final` passed at modern `1189x1944`, legacy `895x1933`, mode mismatch `9.17%`, console errors `0`, and page errors `0`.
- Actual-vs-local evidence remains partial: at channel delta `60`, modern full-root mismatch is `7.61%` and legacy is `9.65%`. The comparison still includes stitched-JPEG/font noise and different persisted Roll20 attribute/focus state.
- Geometry triage localized the remaining height drift to the HP/wound/SAN row and downstream skills content. Top/logo and the first two-column row match closely; modern downstream offset is about `+12px`, legacy about `+18px`.
- Next P0 is paired state normalization plus nested row/skills diagnosis. Do not claim full modern parity, full legacy sanitizer parity, or all-sheet support from this batch.

## 2026-07-16 Modern and Legacy Recheck and Dead Toolbar Cleanup

- Rechecked one matching prepared payload in the dedicated modern and legacy Roll20 destinations. Modern measured `attr-input` at `210x26px`, root width `850px`, scroll size `1189x1936`; legacy measured `sheet-attr-input` at `52x40px`, root width `850px`, scroll size `896x1917`.
- Both runtimes retained translation markers and hid source script nodes. The geometry divergence is direct evidence for maintaining two independent compatibility contracts.
- Removed the unmounted `components/editor/PreviewToolbar.tsx`. Its duplicate controls were not user-facing but kept the static smoke coupled to dead UI.
- Updated `scripts/roll20_legacy_preview_smoke.mjs` to require the actually mounted `MainAreaToolbar` modern/legacy selector and the atomic store action only. `test:roll20-render-modes` passes.
- Claim boundary: DOM/runtime evidence is refreshed; full-height normalized modern/legacy screenshots and pixel parity are still unverified.

## 2026-07-16 Modern and Legacy Runtime Split

- Rechecked the same prepared generated payload in two dedicated Roll20 destinations. The modern Custom Sheet Sandbox preserved `attr-input` at `210x26px` with root `cssWidth=850px`, `scrollWidth=1189`, and `scrollHeight=1936`. The dedicated legacy test room produced `sheet-attr-input` at `52x40px` with root `cssWidth=850px`, `scrollWidth=896`, and `scrollHeight=1917`.
- Both runtimes translated the sampled `name` and `strength` markers and exposed zero source script nodes. This is direct evidence that modern and legacy are separate render contracts, not one CSS-only preference.
- Added an atomic compatibility action shared by Preview toolbar and Export dialog. Modern preserves authored class names and exports `legacy:false`; legacy enables class prefixing plus legacy CSS sanitization and exports `legacy:true`. Exported `README.txt` records the selected destination mode.
- Found that the standalone `PreviewToolbar.tsx` is not mounted in the current product tree. Added the actual `Roll20 | 신버전 | 구버전` segmented selector to mounted `MainAreaToolbar` instead of treating dead component code as user-facing coverage.
- Live-inspected Roll20's delegated Sandbox Tools handler. It reads generated browser `File` objects through `FileReader`, submits form-encoded base64 source to `/sheetsandbox/savesheetsettings`, then reloads sheet data/open characters. The upload helper now follows this path and prevents a duplicate endpoint fallback.
- Added expected-runtime detection to upload/activation snippets. `RUNTIME_MODE_MISMATCH` blocks evidence capture when `sheet.json` and the actual Roll20 runtime disagree.
- Verification completed: export smoke PASS, sandbox sanitizer `7/7` PASS, modern/legacy local render contract PASS, upload snippet self-test PASS, legacy export audit PASS, `ci:verify` PASS, lint PASS, and production build PASS.
- Browser smoke `.tmp/export-dialog-modern-legacy-r5` proved Export legacy -> central toolbar legacy -> central toolbar modern -> Export modern synchronization. It reported console issues `0`, page errors `0`, request failures `0`, and external resource requests `0`. Post-smoke server hygiene found no project listener.
- Claim boundary: this proves selectable mode wiring and actual Roll20 mode divergence. It does not prove complete legacy sanitizer fidelity or modern/legacy pixel parity.

## 2026-07-16 Translation Runtime Unification and Roll20 Upload Boundary

- Traced an actual/local language discrepancy to format handling, not CSS: Blockly emitted locale comments, export normalized them to JSON, while preview/edit only parsed JSON.
- Added `parseTranslationMap` in `lib/export/payload.ts` and routed iframe preview, Shadow edit, sheet-worker translation APIs, chat/export normalization, and CI through the shared translation contract.
- Added post-parse Shadow translation application and Roll20-supported `data-i18n-alt` / `data-i18n-label` handling. This removed the last hidden-input DOM mismatch between preview and edit.
- Added `lib/export/__tests__/translation_payload.test.ts`, `test:translation-payload`, CI coverage, and translation counts to `scripts/preview_edit_visual_smoke.mjs`.
- Verification: `ci:verify`, lint, build, and translation unit tests passed. Ignored `.tmp/preview-edit-visual-20260716-r19` passed 3/3 with all translation matches (`436/436`, `0/0`, `1148/1148`), zero style/geometry differences, two exact pixel matches, and one 14-pixel raster-tolerance match. Ignored `.tmp/edit-flow-translation-sync-20260716-r1` passed with no console/page errors.
- Superseded by the Modern and Legacy Runtime Split above: native chooser automation failed, but live handler inspection proved the generated browser-`File` snippet dispatches Roll20's same delegated upload handler. File URL permission is no longer the active upload blocker.
- Current P0: re-upload matching modern/legacy exports through that handler, require the expected runtime mode, and recapture normalized root screenshots/diffs before renderer changes.
- CI maintenance: after the feature-branch run passed, GitHub warned that `actions/checkout@v4` and `actions/setup-node@v4` still target deprecated Node 20. Both CI and Pages workflows now use the official Node 24-based `@v6` actions; the follow-up branch run is the verification gate.

## 2026-07-16 Preview/Edit Underlying Paint Gate

- Investigated the regression from historical 1-2% local preview/edit mismatch to 5-9%. Direct screenshot inspection showed edit-only layer affordances were being counted as renderer differences.
- Found a second false-diff source: one fixture's remaining mismatch was exactly two full-width 12px bands at the outer browser viewport boundary while all 107 visible element geometries matched. It was Playwright element-screenshot stitching, not sheet layout.
- Split Shadow host isolation and edit-only overlay CSS into independent `data-r20-style-source` styles. Both edit surfaces explicitly keep overlays enabled; the parity smoke disables only `edit-shadow-overlay` while retaining a separate overlay screenshot.
- Extended `scripts/preview_edit_visual_smoke.mjs` to wait for fonts/images and stable text/geometry, expand the viewport to contain the complete sheet, compare DOM signatures, sampled computed styles, all visible geometry, and report exact mismatch pixels, ppm, and max channel delta instead of rounding tiny differences to `0%`.
- Local evidence: `.tmp/preview-edit-visual-20260716-r14` passed 3/3 prepared ignored fixtures. Two were `EXACT` at `0` mismatched pixels; one was `RASTER_TOLERANCE` at `14/1,666,050` pixels (`8.4 ppm`, max channel delta `12`). All three had zero style/geometry differences, matching text hashes and DOM signatures, and no console/page/resource errors.
- Regression evidence: `.tmp/edit-flow-overlay-split-20260716-r2` passed the real synthetic drag/drop paths and confirmed persistent frame affordances still render. The smoke now also requires separate `shadow-host-reset` and `edit-shadow-overlay` sources and rejects the old combined source.
- Final verification: `ci:verify`, lint, build, and `git diff --check` passed. `ci:verify` now runs without the previous typeless TypeScript test warning by using the same `node --no-warnings` convention as the adjacent TypeScript tests.
- Claim boundary: local underlying render equivalence is verified only within the recorded exact/raster limits on the prepared fixture set. Actual Roll20 visual parity, modern/legacy Sandbox comparison, and a literal single live iframe/render node are not complete.

## 2026-07-13 Edit Canvas Edge Drop Targeting

- UX refinement: canvas widget drops now use the same before/inside/after mental model as the layer panel. A container's top edge inserts before it, the middle drops inside it, and the bottom edge inserts after it.
- Updated `components/editor/EditCanvas.tsx` by extracting canvas drop-mode picking and applying it to child-capable containers, instead of always returning `inside` for the whole container.
- Verification: `corepack pnpm run lint`, `corepack pnpm run build`, and edit-flow browser smoke passed at ignored temp `..\_tmp_codex_smoke\edit-flow-canvas-edge-drop-20260713-r1`.
- Smoke evidence: real DragEvent path still passed flow nesting, canvas sibling insertion indicators, layer before/inside/after modes, absolute-in-frame movement, free-placement widget drop, and canvas width control checks.
- Server hygiene: checked after smoke; no project dev/smoke listener remained.

## 2026-07-13 Risky Roll20 Asset Replacement URL Guard

- Root cause refinement: the current asset relink blocker can be hidden if the app treats Roll20 proxy URLs or Imgur page URLs as fully Roll20-ready. Actual Roll20 may still decode those to removed/placeholder assets.
- Updated `lib/export/asset_replacements.ts` so explicit `http(s)` targets are Roll20-ready, protocol-relative/data/local targets are not, and risky Roll20 proxy or non-direct Imgur page targets are counted separately.
- Updated `components/editor/ExportDialog.tsx` to show the risky-target count and warn users to replace risky targets with direct user-owned HTTPS asset URLs before Sandbox comparison.
- Updated asset replacement unit tests and `scripts/export_dialog_browser_smoke.mjs` so the browser smoke captures `data-risky-roll20-targets`.
- Synced `scripts/lib/assetReplacements.mjs` and `scripts/roll20_asset_relink_verification_plan.mjs`; risky Roll20 proxy/Imgur-page targets now produce `COVERED_RISKY_ROLL20_URL` instead of passing as Roll20-ready.
- Verification: `node --check scripts\export_dialog_browser_smoke.mjs`, `corepack pnpm run test:asset-replacements`, `corepack pnpm run guard:ui-copy`, `corepack pnpm run lint`, `corepack pnpm run build`, and export-dialog browser smoke passed.
- Verification: `node --check scripts\roll20_asset_relink_verification_plan.mjs` and `corepack pnpm run test:roll20-asset-relink` passed.
- Server hygiene: checked after smoke; no project dev/smoke listener remained, and CDP `9222` was preserved.
- Current evidence: this is a false-positive guard and export UX improvement only. The AW2E/YSHY relink map still needs user-owned direct URLs before Roll20 visual parity can move again.

## 2026-07-13 Chat Background Paint Relink Blocker

- Root cause refinement: after rejecting fallback/width/font candidates, the remaining YSHY/AW2E chat background mismatch is flat-paint dominated but blocked by missing source assets, not ready for another renderer CSS candidate.
- Reran current temp diagnostics: row/paint/source, background-source, background-raster, background-asset, asset-preservation, and browser-paint routing.
- Updated `scripts/roll20_chat_browser_paint_plan.mjs` so it accepts override dirs for asset probe, asset plan, background raster, background source, and row compositing evidence. Updated `scripts/README.md` with the new command form.
- Verification: `diagnose:roll20-chat-row-paint-source` kept YSHY at `SANITIZE_REPLAY_REJECTED_SOURCE_MODEL_REQUIRED`.
- Verification: `diagnose:roll20-chat-background-raster` classified AW2E/YSHY as `FLAT_PAINT_SOURCE_OR_BROWSER_COLOR_MODEL_REQUIRED`; YSHY row mismatch is `21.41%` and luma gain is only `+0.57%`.
- Verification: `diagnose:roll20-chat-background-assets` found AW2E/YSHY local and actual proxy bytes match, but both source paths resolve to `200 image/png 503b png 161x81 removed.png`.
- Verification: with current temp overrides, `plan:roll20-chat-assets` returned `HOLD_RENDERER_FOR_ASSET_POLICY` with `4` blockers, and `plan:roll20-chat-browser-paint` returned `BROWSER_PAINT_BLOCKED_BY_RELINK`.
- Verification: `plan:roll20-asset-relink` wrote ignored template `..\_tmp_codex_smoke\asset-relink-current-20260713-r1\asset-relink-map-template.txt` and reported `RELINK_MAP_REQUIRED`, required `2`, covered Roll20-ready `0`, missing `2`.
- Current evidence: fill the local-only asset replacement map with user-owned HTTP(S) URLs, rerun preupload/Sandbox comparison, then rerun browser-paint routing. Do not promote another width/font/background-size ChatPane CSS candidate before that.

## 2026-07-13 YSHY Roll20 Fallback Stack Rejection

- Root cause refinement: matching YSHY/CoC table used width and a few Korean fallback glyph metrics is not enough to reproduce actual Roll20 chat rendering.
- Added diagnostic-only ChatPane typography policy `yshy-roll20-fallback-stack`; it is localStorage-gated and is not a product default.
- Added `yshy-roll20-fallback-stack` support to the chat smoke allow-list and chat candidate style proof, so candidate bundles no longer treat the experiment as unknown.
- Verification: `node --check scripts\rolltemplate_chat_smoke.mjs` and `node --check scripts\roll20_chat_candidate_style_proof.mjs` passed.
- Verification: after rebuilding `out/`, rolltemplate smoke with `--chat-font-policy roll20-sandbox-font-proxy --chat-typography-policy yshy-roll20-fallback-stack` passed 3/3 fixtures at ignored temp `..\_tmp_codex_smoke\rolltemplate-chat-smoke-yshy-roll20-fallback-stack-20260713-r2`.
- Evidence: local candidate matched actual Roll20 YSHY table width exactly (`1248.328125px`) and matched Bookk-failure fallback metrics for caption (`23.92px`) and first td/label (`37.032px`).
- Rejection evidence: style proof returned `REJECT_STYLE_CONTRADICTION` because only `3/7` computed font/style fields matched and max text metric delta was still `9.421px`.
- Rejection evidence: `gate:roll20-chat-candidate-experiment` stayed `HOLD_PRODUCTION_RENDERER_PATCH` with `reject-regresses-fixtures`, `REJECT_STYLE_CONTRADICTION`, and `reject-row-raster-regression`.
- Current evidence: this is guardrail/negative evidence only. Do not promote fallback-stack CSS; the next useful route is source/intrinsic plus row paint/crop/rule-order analysis.

## 2026-07-13 Source/Intrinsic Candidate Audit

- Root cause refinement: the current evidence has many partial/rejected chat renderer experiments, but nothing proves the combined source/intrinsic axes needed for production CSS review. A separate audit is now needed before any future candidate can look "close enough" by one metric.
- Added `scripts/roll20_chat_source_intrinsic_candidate_audit.mjs` and package script `diagnose:roll20-chat-source-intrinsic-candidates`.
- Updated diagnostic refresh, targeted renderer planning, and renderer action gate so source/intrinsic candidate readiness is visible and can block production renderer CSS.
- Evidence: `diagnose:roll20-chat-source-intrinsic-candidates` against `reports\roll20-actual-compare\2026-06-18-state-map-v1` plus ignored temp source-intrinsic evidence wrote `..\_tmp_codex_smoke\chat-source-intrinsic-candidate-audit-20260713-r1` and returned `SOURCE_INTRINSIC_CANDIDATE_BLOCKED`.
- Reproduction evidence: the same audit was rerun at `..\_tmp_codex_smoke\chat-source-intrinsic-candidate-audit-20260713-r2` and again returned `SOURCE_INTRINSIC_CANDIDATE_BLOCKED` with all fixtures at `ready=0`.
- Evidence: the audit found `readyCandidates=0`; AW2E/Les/YSHY are partial or blocked, with AW2E and YSHY additionally blocked by source/intrinsic matrix and asset-policy evidence.
- Renderer gate evidence: with `--chat-source-intrinsic-dir ..\_tmp_codex_smoke\chat-source-intrinsic-yshy-current-20260713-r1` and `--chat-source-intrinsic-candidates-dir ..\_tmp_codex_smoke\chat-source-intrinsic-candidate-audit-20260713-r1`, `gate:roll20-renderer-action` stayed `HOLD_PRODUCTION_RENDERER_PATCH` and now lists the candidate audit as a blocker.
- Renderer gate reproduction: rerun with `..\_tmp_codex_smoke\chat-source-intrinsic-candidate-audit-20260713-r2` produced the same `HOLD_PRODUCTION_RENDERER_PATCH` result and blocker text.
- Verification: syntax checks passed for the new/updated scripts, audit self-test passed, `git diff --check`, `guard:roll20-evidence`, lint, and build passed.
- Current evidence: this improves routing and false-positive prevention only. It does not improve pixels, does not prove Roll20 visual parity, and does not unblock ChatPane renderer CSS.
- Server hygiene: checked before and after validation; no project dev/smoke listener was running, and CDP `9222` was preserved.

## 2026-07-13 Source/Intrinsic Pipeline Propagation

- Root cause refinement: the previous matrix gate blocked the final renderer action, but targeted planning, template-scope review, candidate experiment bundles, and diagnostic refresh could still omit or stale-read that source/intrinsic blocker. That created false-review risk for one-off ChatPane candidates.
- Updated `scripts/roll20_chat_targeted_renderer_plan.mjs` with `--source-intrinsic-dir`, latest ignored-temp fallback, P0 blocker/evidence text, source/intrinsic command routing, and proof checklist requirements.
- Updated `scripts/roll20_chat_template_scope_gate.mjs` so source/intrinsic decisions are summarized per fixture, included in Markdown, counted in summary, and treated as promotion blockers before scoped renderer review.
- Updated `scripts/roll20_chat_candidate_experiment_gate.mjs` to forward `--source-intrinsic-dir` into the final renderer action gate.
- Updated `scripts/roll20_chat_diagnostic_refresh.mjs` so a full refresh runs `diagnose:roll20-chat-source-intrinsic` before row/paint and renderer gates.
- Fixed `scripts/roll20_actual_status.mjs` so a newest preupload run with missing chat parity evidence reports missing evidence instead of crashing on an absent `mismatchFixtures` array.
- Verification: syntax checks passed for all four touched scripts; targeted renderer plan self-test, template-scope gate self-test, and diagnostic refresh self-test passed.
- Verification: `status:roll20-actual` now passes both default latest-run selection and the explicit `reports\roll20-actual-compare\2026-06-18-state-map-v1` baseline run.
- Evidence: targeted plan with `..\_tmp_codex_smoke\chat-source-intrinsic-yshy-current-20260713-r1` stayed `HOLD_PRODUCTION_RENDERER_PATCH` with source/intrinsic blockers. Template-scope gate stayed `HOLD_GLOBAL_CHAT_RENDERER_PATCH` and listed AW2E `CROP_AND_TABLE_INTRINSIC_SPLIT_REQUIRED` plus YSHY `SANITIZE_INTRINSIC_CROP_MODEL_REQUIRED`. Final renderer gate stayed `HOLD_PRODUCTION_RENDERER_PATCH`.
- Server hygiene: checked during work; no project dev/smoke listener was running, and CDP `9222` was preserved.
- Current evidence: routing/guardrail improved only. Roll20 visual parity, asset relink, and production ChatPane CSS remain unproven and blocked.

## 2026-07-13 Source/Intrinsic Matrix Gate

- Root cause refinement: the current blocker is not "missing one width CSS rule"; AW2E and YSHY need source/context, intrinsic table sizing, and crop/top-origin evidence to be considered together before any ChatPane renderer CSS can be reviewed.
- Added `scripts/roll20_chat_source_intrinsic_matrix.mjs` and package script `diagnose:roll20-chat-source-intrinsic`.
- Wired `--chat-source-intrinsic-dir` into `gate:roll20-renderer-action`, including JSON/Markdown summaries and a production renderer blocker when the matrix marks P0 fixtures as promotion blockers.
- Verification: syntax checks passed for the new matrix and renderer gate scripts; matrix self-test passed; `git diff --check`, `guard:roll20-evidence`, `status:roll20-actual`, `corepack pnpm run lint`, and `corepack pnpm run build` passed.
- Live evidence: `diagnose:roll20-chat-source-intrinsic` against current ignored temp sidecar diagnostics wrote `..\_tmp_codex_smoke\chat-source-intrinsic-yshy-current-20260713-r1` and classified AW2E as `CROP_AND_TABLE_INTRINSIC_SPLIT_REQUIRED`, Les-Oublies as `CROP_AND_TABLE_INTRINSIC_SPLIT_REQUIRED`, and YSHY as `SANITIZE_INTRINSIC_CROP_MODEL_REQUIRED`.
- Renderer gate evidence: with `--chat-source-intrinsic-dir ..\_tmp_codex_smoke\chat-source-intrinsic-yshy-current-20260713-r1`, `gate:roll20-renderer-action` stayed `HOLD_PRODUCTION_RENDERER_PATCH` and now explicitly blocks renderer CSS on AW2E/YSHY source-intrinsic evidence.
- Current evidence: this improves truthfulness and routing only. It does not prove Roll20 visual parity, does not ship renderer CSS, and does not clear the asset/template-scope/row-raster gates.
- Server hygiene: checked before and after validation; no project dev/smoke listener was running, and CDP `9222` was preserved.

## 2026-07-13 YSHY CoC Table Width + Fallback Candidate Rejected

- Added a diagnostic style-proof route for one-off `yshy-coc-table-source-context-*-fallback-only` candidates so combined table/source-context experiments can be classified instead of reported as unknown candidates.
- Ran `rolltemplate_chat_smoke` with `coc-table-actual-width` and `yshy-bookk-fallback-only`; smoke passed 3/3 fixtures and wrote ignored evidence to `..\_tmp_codex_smoke\rolltemplate-chat-smoke-yshy-coc-table-source-context-fallback-only-20260713-r1`.
- Ran `gate:roll20-chat-candidate-experiment`; result stayed `HOLD_PRODUCTION_RENDERER_PATCH`.
- Evidence: candidate comparison rejected the combined candidate (`meanAlignedDeltaPct=+15.28`, regressions `2`, AW2E `+41.04`, YSHY `+4.81`), and row raster rejected it (`AW2E +44.07`, `YSHY +10.67` weighted).
- Interpretation: even with YSHY-compatible style proof, hard-forcing the observed CoC table width plus Bookk fallback is not the Roll20 model. Continue with source rule order, intrinsic sizing, and crop/top-origin modeling; do not promote width/fallback CSS.

## 2026-07-13 Strict Sheet-Frame Evidence and Temp Capture Routing

- Root cause refinement: the live Roll20 page was capture-ready, but the currently opened character sheet was only weakly matching `yshy-commission-1bu` through generic `attr_str`/`attr_int` markers. That is not enough to trust a YSHY chat capture.
- Added `--out-dir` support to `scripts/roll20_sheet_frame_probe.mjs` and `scripts/roll20_chat_cdp_capture.mjs` so fresh actual Roll20 evidence can be written under ignored temp directories instead of rewriting locked canonical screenshots.
- Added `--sheet-frame-evidence` to chat capture, and `--actual-sidecar <fixture-id>=<json>` to `scripts/roll20_chat_table_layout_constraint_probe.mjs`, allowing temp sheet-frame/chat evidence to flow into diagnostics without copying private evidence into canonical reports.
- Tightened sheet-frame proof: `VISIBLE_MATCH` now requires an expected roll button marker, expected visible text marker, or at least five expected attr markers. Weak matches such as only `attr_str`/`attr_int` now return `NOT_PROVEN`.
- Live evidence: `probe:roll20-sheet-frame` for Witrav Upijek against `yshy-commission-1bu` now blocks with `activationMatch=weak marker match: rollButtons=0, attrs=2, text=0`.
- Live evidence: a no-click chat capture wrote temp files, but selected `sheet-rolltemplate-classic-roll`; it is not YSHY `sheet-rolltemplate-coc` evidence and was not fed into the YSHY table-layout probe.
- Verification: `test:roll20-sheet-frame-probe`, `test:roll20-chat-cdp-readiness`, and syntax checks for `roll20_sheet_frame_probe.mjs`, `roll20_chat_cdp_capture.mjs`, and `roll20_chat_table_layout_constraint_probe.mjs` passed.
- Current evidence: before the YSHY max-width/min-width recapture can continue, the dedicated Roll20 Sandbox/test room must be reloaded/applied with the correct `yshy-commission-1bu` payload and must pass strict sheet-frame proof. This is an activation/setup blocker, not a renderer parity pass.

## 2026-07-13 Table Layout Constraint Probe

- Root cause refinement: after `coc-table-intrinsic-clamp` was rejected, the missing piece was distinguishing an ineffective CSS constraint from a true Roll20 table auto-layout/min-content constraint.
- Added `scripts/roll20_chat_table_layout_constraint_probe.mjs` and package script `diagnose:roll20-chat-table-layout-constraint`.
- The probe reads a local smoke JSON plus source-context, intrinsic-width, and table-intrinsic reports, then records source max-width, local/actual computed max-width, used width, scrollWidth, table auto-layout flags, and recapture gaps.
- Verification: `node --check scripts\roll20_chat_table_layout_constraint_probe.mjs` passed.
- Verification: `corepack pnpm run diagnose:roll20-chat-table-layout-constraint -- reports\roll20-actual-compare\2026-06-18-state-map-v1 ..\_tmp_codex_smoke\rolltemplate-chat-smoke-coc-table-intrinsic-clamp-20260713-r2\rolltemplate-chat-smoke-results.json --source-context-dir ..\_tmp_codex_smoke\chat-source-context-source-css-audit-20260713-r4 --intrinsic-width-dir ..\_tmp_codex_smoke\chat-intrinsic-width-coc-table-intrinsic-clamp-20260713-r3 --table-intrinsic-dir ..\_tmp_codex_smoke\chat-table-intrinsic-coc-table-intrinsic-clamp-20260713-r2 --out-dir ..\_tmp_codex_smoke\chat-table-layout-constraint-coc-clamp-20260713-r2` passed.
- Evidence: the report is `TABLE_LAYOUT_CONSTRAINT_ACTIONABLE`; YSHY is `ACTUAL_MAX_WIDTH_CAPTURE_GAP_BEFORE_AUTO_LAYOUT_MODEL`, while AW2E and Les-Oublies are secondary for this axis.
- Evidence: YSHY source table max-width is `280px`, the local clamp candidate computed max-width is `1249px`, but local used table width still exceeds it at about `1317px` and scrollWidth tracks used width.
- Evidence: actual Roll20 chat sidecars still lack `maxWidth/minWidth`; the next actual-screen step is recapture with updated sidecar fields before claiming whether Roll20 drops, applies, or ignores the source max-width.
- Current evidence: next YSHY P0 is actual chat DOM recapture plus table auto-layout/min-content modeling. Do not retry max-width, transform, spacing, or broad font CSS as production renderer patches.

## 2026-07-13 CoC Table Intrinsic Clamp Rejection

- Root cause hypothesis tested: the existing diagnostic `coc-table-intrinsic-clamp` might reproduce Roll20 by constraining the YSHY/CoC table with `max-width` while keeping transform-free table layout.
- Updated local and Roll20 chat capture style sidecars to include `minWidth` and `maxWidth`, then surfaced computed max-width overflow notes in the intrinsic probes.
- Verification: `node --check scripts\rolltemplate_chat_smoke.mjs`, `node --check scripts\roll20_chat_capture_plan.mjs`, `node --check scripts\roll20_chat_table_intrinsic_probe.mjs`, and `node --check scripts\roll20_chat_intrinsic_width_model.mjs` passed.
- Verification: `node scripts\rolltemplate_chat_smoke.mjs --out-dir .\out --base-path /roll20-block-editor --fixtures test-fixtures\visual --report-dir ..\_tmp_codex_smoke\rolltemplate-chat-smoke-coc-table-intrinsic-clamp-20260713-r2 --chat-geometry-policy coc-table-intrinsic-clamp --chat-typography-policy yshy-table-font-context --port 4403` passed 3/3 fixtures.
- Verification: `corepack pnpm run gate:roll20-chat-candidate-experiment -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --candidate coc-table-intrinsic-clamp --candidate-smoke ..\_tmp_codex_smoke\rolltemplate-chat-smoke-coc-table-intrinsic-clamp-20260713-r2\rolltemplate-chat-smoke-results.json --candidate-screenshots ..\_tmp_codex_smoke\rolltemplate-chat-smoke-coc-table-intrinsic-clamp-20260713-r2\screenshots --source-context-dir ..\_tmp_codex_smoke\chat-source-context-source-css-audit-20260713-r4 --out-dir ..\_tmp_codex_smoke\candidate-experiment-coc-table-intrinsic-clamp-20260713-r2` returned `HOLD_PRODUCTION_RENDERER_PATCH`.
- Evidence: the candidate regressed AW2E and YSHY (`meanAlignedDeltaPct=16.47`, fixture deltas `AW2E=+41.04`, `YSHY=+8.36`), contradicted actual Roll20 styles for AW2E/Les-Oublies, and regressed row raster (`AW2E +44.07`, `YSHY +10.14` weighted).
- Evidence: YSHY local candidate has computed `maxWidth=1249px`, but table used width and scroll width stay around `1317px`; `diagnose:roll20-chat-table-intrinsic-probe` records `local table used width +1317.141px exceeds computed max-width +1249px`.
- Fixed a truthfulness bug in `scripts/roll20_chat_intrinsic_width_model.mjs`: missing `maxWidth` is now `null`, not a misleading `0px`. Rerun at `..\_tmp_codex_smoke\chat-intrinsic-width-coc-table-intrinsic-clamp-20260713-r3` keeps only verified local max-width overflow evidence.
- Server hygiene: after the smoke, `corepack pnpm run check:server-hygiene -- --kill-project` and the normal hygiene check preserved CDP `9222` and left no project server listeners.
- Current evidence: `coc-table-intrinsic-clamp` is rejected. The next YSHY/CoC renderer work should model table auto-layout/min-content behavior directly, alongside crop/top-origin evidence; do not retry max-width, transform, spacing, or broad font patches.

## 2026-07-13 Source CSS Audit in Source-Context Probe

- Root cause refinement: YSHY table intrinsic work needs to know what the original rolltemplate CSS actually declared, not only local/actual computed styles. The relevant source block has `width: 100%` and `max-width: 280px`, while local/actual used table widths are far larger.
- Updated `scripts/roll20_chat_source_context_probe.mjs` to read fixture `source.css` via `--fixtures-dir` and record exact rolltemplate source declarations for root/table/caption/td targets.
- Fixed selector matching so `.sheet-rolltemplate-coc` does not accidentally match `.sheet-rolltemplate-coc-attack`, `.sheet-rolltemplate-coc-defence`, or other prefixed variants.
- Verification: `node --check scripts\roll20_chat_source_context_probe.mjs` passed.
- Verification: `corepack pnpm run diagnose:roll20-chat-source-context -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --intrinsic-width-dir ..\_tmp_codex_smoke\chat-intrinsic-width-yshy-crop-origin-actual-font-20260713-r2 --out-dir ..\_tmp_codex_smoke\chat-source-context-source-css-audit-20260713-r4` passed.
- Evidence: YSHY source audit now reports exactly one `.sheet-rolltemplate-coc table` rule with `width=100%`, `max-width=280px`, and `background-size=100%`.
- Evidence: YSHY caption/td source typography is now captured as BookkMyungjo-Bd (`caption font-size=13px`, `td font-size=12px`) instead of being flattened into computed-style-only evidence.
- Evidence: the source-context report records `sourceMaxWidthExceeded=true`; source `max-width: 280px` exists, but local/actual used table width exceeds it while table context remains `TABLE_INTRINSIC_SOURCE_CONTEXT_REQUIRED`.
- Current evidence: next YSHY work should inspect Roll20 rule order/sanitize and table layout semantics around source `width:100%`/`max-width:280px`, not broad scaling, transform, or measured width declarations.

## 2026-07-13 YSHY Intrinsic Constraint Classification

- Root cause refinement: the YSHY intrinsic-width script already detected `TABLE_SCROLL_INTRINSIC_MODEL_REQUIRED`, but the nested constraint model still reported `CONSTRAINT_SECONDARY` unless a transform candidate was present and contradicted. That made the next action less obvious for source-context/crop-origin candidates where transform is not the active failure.
- Updated `scripts/roll20_chat_intrinsic_width_model.mjs` so table-wide scroll/client width deltas with matching structure, uniform row deltas, small cell deltas, and rejected CSS metric candidates classify as `TABLE_SCROLL_INTRINSIC_CONSTRAINT`.
- Verification: `node --check scripts\roll20_chat_intrinsic_width_model.mjs` passed.
- Verification: `corepack pnpm run diagnose:roll20-chat-intrinsic-width -- reports\roll20-actual-compare\2026-06-18-state-map-v1 ..\_tmp_codex_smoke\rolltemplate-chat-smoke-yshy-coc-table-source-context-crop-origin-actual-font-20260713-r1\rolltemplate-chat-smoke-results.json --out-dir ..\_tmp_codex_smoke\chat-intrinsic-width-yshy-crop-origin-actual-font-20260713-r2` passed.
- Evidence: YSHY still reports `TABLE_SCROLL_INTRINSIC_MODEL_REQUIRED`, now with constraint `TABLE_SCROLL_INTRINSIC_CONSTRAINT`.
- Evidence: the explicit signals are `structureMatches=true`, `rowDeltaUniform=true`, `cellsSmall=true`, `tableScrollTracksWidth=true`, `clientTracksWidth=true`, `cssMetricCandidatesRejected=true`, table scrollWidth delta `-69px`, first cell delta `-0.188px`, and actual/local table width `0.948x`.
- Current evidence: next YSHY renderer work should model table scroll/client intrinsic width directly. Crop-origin, measured width declarations, spacing/letter replay, transform, and broad font CSS remain rejected or misrouted.

## 2026-07-13 YSHY Intrinsic Width Model Routing

- Root cause hypothesis refined: after actual-font and crop-origin source-context candidates were rejected, the remaining YSHY/CoC blocker should be treated as a table scroll/intrinsic width calculation problem, not a CSS declaration replay problem.
- Verification: `corepack pnpm run diagnose:roll20-chat-intrinsic-width -- reports\roll20-actual-compare\2026-06-18-state-map-v1 ..\_tmp_codex_smoke\rolltemplate-chat-smoke-yshy-coc-table-source-context-crop-origin-actual-font-20260713-r1\rolltemplate-chat-smoke-results.json --out-dir ..\_tmp_codex_smoke\chat-intrinsic-width-yshy-crop-origin-actual-font-20260713-r1` passed.
- Evidence: the diagnostic returned `INTRINSIC_WIDTH_MODEL_REQUIRED`.
- Evidence: YSHY is classified as `TABLE_SCROLL_INTRINSIC_MODEL_REQUIRED`, with table delta `-68.813px`, first-cell delta `-0.188px`, and `transformContradicted=NO`.
- Evidence: AW2E and Les-Oublies are classified as `CSS_METRIC_CANDIDATES_REJECTED`, confirming they should remain separate axes instead of sharing the YSHY table-scroll model.
- Server hygiene: `corepack pnpm run check:server-hygiene` passed after the diagnostic; no project dev/smoke listener remained and CDP `127.0.0.1:9222` was preserved.
- Current evidence: next YSHY P0 is direct Roll20 table scroll/intrinsic width modeling. Do not retry transform, broad font CSS, simple top-origin replay, or measured width declarations as renderer fixes.

## 2026-07-13 YSHY Crop-Origin Source-Context Rejection

- Root cause hypothesis tested: YSHY/CoC may need the measured table-width override, overflow crop, actual font context, and a top-origin offset combined before table intrinsic/crop evidence improves.
- Added diagnostic-only `coc-overflow-crop-origin-y20` to `components/editor/ChatPane.tsx` and allowed it in `scripts/rolltemplate_chat_smoke.mjs`.
- Verification: `node --check scripts\rolltemplate_chat_smoke.mjs` passed.
- Verification: `corepack pnpm run build` passed before the browser smoke.
- Verification: `node scripts\rolltemplate_chat_smoke.mjs --out-dir .\out --base-path /roll20-block-editor --fixtures test-fixtures\visual --report-dir ..\_tmp_codex_smoke\rolltemplate-chat-smoke-yshy-coc-table-source-context-crop-origin-actual-font-20260713-r1 --chat-geometry-policy coc-overflow-crop-origin-y20 --chat-typography-policy yshy-table-font-context --port 4401` passed 3/3 fixtures.
- Evidence: the candidate moved YSHY root/table/caption/cell top by `+20px`, but width remained unchanged: root `267px`, table `1317.140625px`, caption `1317.140625px`; Bookk stayed active in caption and first cell.
- Verification: `gate:roll20-chat-candidate-experiment` rejected `yshy-coc-table-source-context-crop-origin-actual-font-r1` with `HOLD_PRODUCTION_RENDERER_PATCH`, `reject-regresses-fixtures`, `REJECT_STYLE_CONTRADICTION`, `reject-row-raster-regression`, mean aligned delta `16.47`, fixture deltas `AW2E=41.04`, `Les=0`, `YSHY=8.36`, and regressions `2`.
- Evidence: row-raster comparison stayed worse than baseline: AW2E weighted `17.93% -> 62%`, YSHY weighted `21.41% -> 31.55%`.
- Verification: table intrinsic probe still reports YSHY `TABLE_WIDE_INTRINSIC_WITH_CROP_OFFSET` with root `-3px`, table `-68.813px`, row spread `0px`, max cell `+0.906px`, and top offset `+52.703px`.
- Server hygiene: `corepack pnpm run check:server-hygiene` passed after the smoke/gate/probe; no project dev/smoke listener remained and CDP `127.0.0.1:9222` was preserved.
- Current evidence: `coc-overflow-crop-origin-y20` is a rejected diagnostic, not a renderer fix. Simple crop-origin replay should not be retried until the table intrinsic/max-content calculation is measured directly.

## 2026-07-13 YSHY Actual-Font Source-Context Rejection

- Root cause hypothesis tested: the previous YSHY/CoC source-context candidate may have been unfairly evaluated against a missing-Bookk font proof, while actual Roll20 evidence shows Bookk is active inside caption/cells.
- Updated `scripts/roll20_chat_candidate_style_proof.mjs` so `yshy-coc-table-source-context*actual-font*` uses `yshy-table-font-context`; older source-context candidates continue to use the missing-Bookk proof.
- Verification: `node --check scripts\roll20_chat_candidate_style_proof.mjs` passed.
- Verification: the already-generated smoke for `yshy-coc-table-source-context-actual-font-r1` passed 3/3 fixtures; the candidate root/table metrics for YSHY were root `267px`, table `1317.140625px`, caption `1317.140625px`, with Bookk active in caption and first cell.
- Verification: `gate:roll20-chat-candidate-experiment` wrote ignored output to `..\_tmp_codex_smoke\candidate-experiment-yshy-coc-table-source-context-actual-font-20260713-r1` and returned `HOLD_PRODUCTION_RENDERER_PATCH`.
- Evidence: the gate rejected the candidate with risk `reject-regresses-fixtures`, style `REJECT_STYLE_CONTRADICTION`, row raster `reject-row-raster-regression`, mean aligned delta `16.47`, fixture deltas `AW2E=41.04`, `Les=0`, `YSHY=8.36`, and regressions `2`.
- Evidence: style proof now narrows the failure to table width only for YSHY: local `1317.140625px` vs actual Roll20 `1248.328125px`; root/table font and Bookk caption/cell font match actual evidence.
- Evidence: row-raster comparison rejects this path: AW2E weighted mismatch regresses from `17.93%` to `62%`, and YSHY from `21.41%` to `31.55%`.
- Verification: `diagnose:roll20-chat-table-intrinsic-probe` on the same candidate still reports YSHY `TABLE_WIDE_INTRINSIC_WITH_CROP_OFFSET` with root `-3px`, table `-68.813px`, first cell `-0.188px`, row spread `0px`, max cell `+0.906px`, and top offset `+52.703px`.
- Server hygiene: `corepack pnpm run check:server-hygiene` passed after the diagnostic run. No project dev/smoke listener remained; CDP `127.0.0.1:9222` was preserved.
- Current evidence: actual-font source context is a rejected diagnostic candidate, not a product renderer fix. Next renderer work should model table intrinsic width plus Roll20 crop/top-origin context.

## 2026-07-13 YSHY Table Intrinsic Probe Routing

- Root cause hypothesis: YSHY/CoC still fails because table width declarations are weaker than the table's intrinsic/crop context, not because another broad ChatPane CSS rule should be promoted.
- Added ignored-output support to `scripts/roll20_chat_table_intrinsic_probe.mjs` (`[local-smoke-json] --out-dir <dir>`) and `scripts/roll20_chat_font_intrinsic_probe.mjs` (`--out-dir <dir>`), then documented the commands in `scripts/README.md`.
- Fixed the table intrinsic classifier: a tiny root delta no longer masks a much larger table-wide delta. The observed YSHY candidate evidence is root `-3px`, table `-68.813px`, row spread `0px`, max cell `+0.906px`, and top offset `+52.703px`.
- Verification: `node --check scripts\roll20_chat_table_intrinsic_probe.mjs` and `node --check scripts\roll20_chat_font_intrinsic_probe.mjs` passed.
- Verification: `diagnose:roll20-chat-table-intrinsic-probe` with the `yshy-coc-table-source-context-r2` smoke wrote ignored output to `..\_tmp_codex_smoke\chat-table-intrinsic-yshy-source-context-20260713-r2` and now classifies YSHY as `TABLE_WIDE_INTRINSIC_WITH_CROP_OFFSET`.
- Verification: `diagnose:roll20-chat-font-intrinsic --out-dir ..\_tmp_codex_smoke\chat-font-intrinsic-current-20260713-r1` reports YSHY as `FONT_CONTEXT_BEFORE_WIDTH_CSS`, with `widthOverride=NO_GAIN`.
- Current evidence: next YSHY/CoC renderer work should combine table-wide intrinsic width, crop/top-origin, and font-face activation/order evidence. Do not promote transform, global font, spacing, or broad width CSS.
- Claim boundary: diagnostic routing only. No product renderer CSS was promoted, no Roll20 upload happened, and visual parity remains unproven.

## 2026-07-13 Dynamic Chat Candidate Source-Context Probe

- Root cause hypothesis: the next renderer blocker is not another broad ChatPane CSS candidate. AW2E and YSHY require split renderer models, and YSHY/CoC specifically needs table intrinsic/source-context proof before CSS promotion.
- Updated `scripts/roll20_chat_candidate_compare.mjs` and `scripts/roll20_chat_row_raster_candidate_compare.mjs` so included candidate names can be dynamic when matching smoke/screenshot overrides are supplied.
- Updated `scripts/roll20_chat_candidate_style_proof.mjs` with explicit `yshy-coc-table-source-context*` handling. It checks the CoC/YSHY table width and font/source context together instead of leaving dynamic candidates as `UNKNOWN_CANDIDATE`.
- Updated `components/editor/ChatPane.tsx` so `coc-table-actual-width` also exists in the post-user-CSS diagnostic override layer. This keeps the diagnostic candidate from being silently weaker than user rolltemplate CSS.
- Verification: syntax checks for the three touched diagnostic scripts passed.
- Verification: `node scripts\rolltemplate_chat_smoke.mjs --out-dir .\out --base-path /roll20-block-editor --fixtures test-fixtures\visual --report-dir ..\_tmp_codex_smoke\rolltemplate-chat-smoke-yshy-coc-table-source-context-20260713-r2 --chat-geometry-policy coc-table-actual-width --chat-typography-policy yshy-missing-bookk-table-font-context --port 4399` passed 3/3 fixtures.
- Verification: `gate:roll20-chat-candidate-experiment` for `yshy-coc-table-source-context-r2` passed and returned `HOLD_PRODUCTION_RENDERER_PATCH`, `reject-regresses-fixtures`, `REJECT_STYLE_CONTRADICTION`, and `reject-row-raster-regression`.
- Evidence: the style proof showed YSHY/CoC font/source context matched, but table width still contradicted actual Roll20: local candidate `1317.140625px` vs actual `1248.328125px`. The simple `width: 1248.55px !important` diagnostic is insufficient because the table intrinsic/min-content/layout constraint still expands the used table width.
- Current evidence: do not promote the r1/r2 source-context candidates. The next P0 is a CoC/YSHY table intrinsic constraint probe, not transform, broad typography, or global ChatPane CSS.

## 2026-07-13 Chat Candidate Experiment Bundle Gate

- Root cause: after candidate/style/row-raster/table-budget overrides were added, testing one renderer candidate still required manually running several scripts and then hand-wiring their temp report folders into the top renderer gate. That was slow and error-prone enough to create false PASS risk.
- Added `scripts/roll20_chat_candidate_experiment_gate.mjs` and package script `gate:roll20-chat-candidate-experiment`.
- The bundle consumes an existing candidate smoke JSON and screenshot folder, runs candidate comparison, row-raster comparison, candidate style proof, table-width budget, and `gate:roll20-renderer-action`, then writes `chat-candidate-experiment-gate-results.json/.md` into an ignored output folder.
- Added `--include-candidates` to `scripts/roll20_chat_candidate_compare.mjs` and `scripts/roll20_chat_row_raster_candidate_compare.mjs` so isolated experiments run only `default` plus the named candidate instead of recalculating every historical candidate.
- Verification: `node --check scripts\roll20_chat_candidate_compare.mjs`, `node --check scripts\roll20_chat_row_raster_candidate_compare.mjs`, and `node --check scripts\roll20_chat_candidate_experiment_gate.mjs` passed.
- Verification: `corepack pnpm run gate:roll20-chat-candidate-experiment -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --candidate aw2e-message-cell-font-context --candidate-smoke ..\_tmp_codex_smoke\rolltemplate-chat-smoke-aw2e-cell-font-context-20260713-r1\rolltemplate-chat-smoke-results.json --candidate-screenshots ..\_tmp_codex_smoke\rolltemplate-chat-smoke-aw2e-cell-font-context-20260713-r1\screenshots --source-context-dir ..\_tmp_codex_smoke\chat-source-context-autofallback-20260713-r2 --out-dir ..\_tmp_codex_smoke\candidate-experiment-aw2e-cell-font-20260713-r2` passed.
- Evidence: the bundle returned `HOLD_PRODUCTION_RENDERER_PATCH`, `reject-regresses-fixtures`, `REJECT_STYLE_CONTRADICTION`, and `reject-row-raster-regression`; AW2E row-weighted delta stayed `+44.17` and YSHY row-weighted delta stayed `+8.68`.
- Current evidence: this makes negative and future candidate experiments repeatable through the final gate. It does not improve pixels, relink assets, upload to Roll20, or authorize production renderer CSS.

## 2026-07-13 Renderer Gate Candidate Override Routing

- Root cause: isolated candidate experiments could reach targeted planning and template-scope gates, but the final `gate:roll20-renderer-action` still read canonical candidate comparison, style proof, and row-raster candidate reports only. That meant a temp candidate could be rejected in local evidence without appearing in the top production renderer hold.
- Updated `scripts/roll20_renderer_action_gate.mjs` with `--chat-candidate-comparison-dir`, `--chat-candidate-style-proof-dir`, and `--chat-row-raster-candidates-dir`.
- Updated `scripts/README.md` so the renderer action gate command documents the new candidate/style/row-raster overrides.
- Verification: `node --check scripts\roll20_renderer_action_gate.mjs` passed.
- Verification: `corepack pnpm run gate:roll20-renderer-action -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --chat-candidate-comparison-dir ..\_tmp_codex_smoke\chat-candidates-aw2e-cell-context-20260713-r1 --chat-candidate-style-proof-dir ..\_tmp_codex_smoke\chat-style-aw2e-cell-context-20260713-r1 --chat-row-raster-candidates-dir ..\_tmp_codex_smoke\row-raster-aw2e-cell-context-20260713-r1 --chat-table-budget-dir ..\_tmp_codex_smoke\chat-table-width-budget-targeted-override-20260713-r1 --chat-source-context-dir ..\_tmp_codex_smoke\chat-source-context-autofallback-20260713-r2 --out-dir ..\_tmp_codex_smoke\renderer-gate-candidate-overrides-20260713-r1` passed with `HOLD_PRODUCTION_RENDERER_PATCH`.
- Evidence: the generated renderer gate report records all three candidate overrides and now surfaces `aw2e-message-cell-font-context` / `aw2e-message-cell-wrap-context` as rejected by candidate comparison, contradicted by actual Roll20 style proof, and row-raster-regressing (`+44%` AW2E weighted row delta, `+8.68%` YSHY weighted row delta).
- Current evidence: this completes isolated candidate evidence routing to the top renderer gate. It does not improve pixels, relink assets, upload to Roll20, or authorize production renderer CSS.

## 2026-07-13 Renderer Gate Table-Budget Override

- Root cause: `diagnose:roll20-chat-table-width-budget` and `plan:roll20-chat-renderer-targets` could now use ignored temp table-budget evidence, but the final `gate:roll20-renderer-action` still read only the canonical table-budget report. That left the last production renderer gate unable to consume isolated table-budget experiments.
- Updated `scripts/roll20_renderer_action_gate.mjs` with `--chat-table-budget-dir` and routed table-budget reads through the same override-aware `readReportJson` path used by other gate inputs.
- Updated `scripts/README.md` so the renderer action gate command documents the table-budget override.
- Verification: `node --check scripts\roll20_renderer_action_gate.mjs` passed.
- Verification: `corepack pnpm run gate:roll20-renderer-action -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --chat-table-budget-dir ..\_tmp_codex_smoke\chat-table-width-budget-targeted-override-20260713-r1 --chat-source-context-dir ..\_tmp_codex_smoke\chat-source-context-autofallback-20260713-r2 --out-dir ..\_tmp_codex_smoke\renderer-gate-table-budget-override-20260713-r1` passed with `HOLD_PRODUCTION_RENDERER_PATCH`.
- Evidence: the generated renderer gate report records `reportOverrides.chatTableWidthBudget` and surfaces the temp budget decisions: AW2E `MESSAGE_CONTENT_WIDTH_BUDGET`, Les-Oublies `NARROW_WIDTH_MODEL_REQUIRED`, and YSHY `TEXT_LAYOUT_CONSTRAINT_BUDGET`.
- Current evidence: this finishes table-budget evidence routing to the top renderer gate. It does not improve pixels, relink assets, upload to Roll20, or authorize production renderer CSS.

## 2026-07-13 Table Budget Override Routing

- Root cause: the next renderer P0 needs iterative AW2E/YSHY table-budget experiments, but `diagnose:roll20-chat-table-width-budget` could only write canonical report output and `plan:roll20-chat-renderer-targets` could not consume an isolated temp table-budget report. Also, the targeted plan read older table-budget field names, so newer `budgetDecision` / `tableWidthDelta` evidence was not surfaced directly in its signals.
- Updated `scripts/roll20_chat_table_width_budget.mjs` with `--out-dir` and report output metadata.
- Updated `scripts/roll20_chat_targeted_renderer_plan.mjs` with `--table-budget-dir`, table-budget report override recording, and current schema reads for `budgetDecision` and `tableWidthDelta`.
- Updated `scripts/README.md` to document the new table-budget output override and targeted-plan table-budget override.
- Verification: `node --check scripts\roll20_chat_table_width_budget.mjs`, `node --check scripts\roll20_chat_targeted_renderer_plan.mjs`, and `corepack pnpm run test:roll20-chat-renderer-targets` passed.
- Verification: `corepack pnpm run diagnose:roll20-chat-table-width-budget -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --out-dir ..\_tmp_codex_smoke\chat-table-width-budget-targeted-override-20260713-r1` passed with `TABLE_WIDTH_BUDGET_ACTIONABLE`.
- Evidence: temp budget output reports AW2E `MESSAGE_CONTENT_WIDTH_BUDGET` with table delta `+15.75px`, text delta `+15.602px`, residual `+0.148px`; Les-Oublies `NARROW_WIDTH_MODEL_REQUIRED`; YSHY `TEXT_LAYOUT_CONSTRAINT_BUDGET` with table delta `-24.531px`, text delta `-54.946px`, residual `+30.415px`.
- Verification: targeted plan with `--table-budget-dir ..\_tmp_codex_smoke\chat-table-width-budget-targeted-override-20260713-r1` and `--source-context-dir ..\_tmp_codex_smoke\chat-source-context-autofallback-20260713-r2` passed with `HOLD_PRODUCTION_RENDERER_PATCH` and recorded the table-budget override.
- Current evidence: this improves renderer planning and temp evidence routing only. It does not improve pixels, relink assets, upload to Roll20, or authorize production renderer CSS.

## 2026-07-13 AW2E Cell Context Targeted-Plan Routing

- Root cause: after the cell-font and cell-wrap context candidates were rejected, `plan:roll20-chat-renderer-targets` still did not list those two names in AW2E tried-candidate evidence. A future renderer pass could therefore miss that the `27.3px` cell-context replay had already been tested and rejected.
- Updated `scripts/roll20_chat_targeted_renderer_plan.mjs` so AW2E tried candidates include `aw2e-message-cell-font-context` and `aw2e-message-cell-wrap-context`.
- Verification: `node --check scripts\roll20_chat_targeted_renderer_plan.mjs` and `corepack pnpm run test:roll20-chat-renderer-targets` passed.
- Verification: targeted plan with `--candidate-comparison-dir ..\_tmp_codex_smoke\chat-candidates-aw2e-cell-context-20260713-r1` and `--source-context-dir ..\_tmp_codex_smoke\chat-source-context-autofallback-20260713-r2` passed with `HOLD_PRODUCTION_RENDERER_PATCH` and blockers `22`.
- Evidence: the plan now reports `aw2e-message-cell-font-context is already tried and not promotable (reject-regresses-fixtures, delta +41.29%)` and `aw2e-message-cell-wrap-context is already tried and not promotable (reject-regresses-fixtures, delta +41.27%)`.
- Current evidence: this is renderer planning truthfulness only. It does not improve pixels, relink assets, upload to Roll20, or authorize production renderer CSS.

## 2026-07-13 AW2E Cell Context Axis Rejection

- Root cause tested: after the combined AW2E source-context candidate was rejected, the next question was whether the regression came from the AW2E message shell, the `27.3px` cell font context, or the wrap/color context. The diagnostic split tested the cell-font axis and the cell-wrap axis separately without promoting product CSS.
- Verification: `node scripts\rolltemplate_chat_smoke.mjs --out-dir .\out --base-path /roll20-block-editor --fixtures test-fixtures\visual --report-dir ..\_tmp_codex_smoke\rolltemplate-chat-smoke-aw2e-cell-font-context-20260713-r1 --chat-typography-policy aw2e-message-cell-font-context --port 4396` passed 3/3 functional rolltemplate smoke.
- Verification: `node scripts\rolltemplate_chat_smoke.mjs --out-dir .\out --base-path /roll20-block-editor --fixtures test-fixtures\visual --report-dir ..\_tmp_codex_smoke\rolltemplate-chat-smoke-aw2e-cell-wrap-context-20260713-r1 --chat-typography-policy aw2e-message-cell-wrap-context --port 4397` passed 3/3 functional rolltemplate smoke.
- Evidence: candidate comparison rejected both narrow candidates with `risk=reject-regresses-fixtures`, mean `16.3%`, regressions `2`, AW2E aligned mismatch about `59.3%`, and YSHY aligned delta `+7.62%`.
- Evidence: row-raster comparison rejected both. `aw2e-message-cell-font-context` had AW2E weighted `62.1%` (`+44.17`) and worst `65.76%` (`+39.48`); `aw2e-message-cell-wrap-context` had AW2E weighted `62.08%` (`+44.15`) and worst `65.7%` (`+39.42`).
- Evidence: style proof rejected both with `REJECT_STYLE_CONTRADICTION`; local AW2E table width was `547.921875px` while actual Roll20 was `359.53125px`, and local row text-cell widths were roughly doubled (`151.0625` vs `85.53125`, `167.4375` vs `93.71875`).
- Server hygiene: `corepack pnpm run check:server-hygiene` passed after both smokes and diagnostics. No project dev/smoke listener remained; the CDP listener on `127.0.0.1:9222` was preserved.
- Current evidence: the `27.3px` AW2E cell font/context path is unsafe. The next useful P0 is a table intrinsic/source-model probe rather than another broad typography replay. This does not prove visual parity or authorize production renderer CSS.

## 2026-07-13 AW2E Source-Context Candidate Rejection

- Root cause tested: the previous renderer gate pointed at AW2E source-context proof (`RULE_ORDER_FONT_FACE_TABLE_CONTEXT_REQUIRED`). A tempting next step was to combine AW2E's full-width Roll20 chat message shell with Roll20-observed AW2E cell font/wrap context as one scoped local renderer candidate.
- Added the diagnostic-only `aw2e-message-source-context` candidate route to candidate comparison, row-raster comparison, style proof, and targeted renderer planning.
- Updated `scripts/roll20_chat_targeted_renderer_plan.mjs` to accept `--candidate-comparison-dir`, so isolated ignored-temp candidate evidence can be included in the plan without rewriting canonical reports.
- Updated `scripts/README.md` with the candidate-comparison override and the new diagnostic smoke command.
- Verification: `node --check scripts\roll20_chat_candidate_compare.mjs`, `node --check scripts\roll20_chat_row_raster_candidate_compare.mjs`, `node --check scripts\roll20_chat_candidate_style_proof.mjs`, and `node --check scripts\roll20_chat_targeted_renderer_plan.mjs` passed.
- Verification: `node scripts\rolltemplate_chat_smoke.mjs --out-dir .\out --base-path /roll20-block-editor --fixtures test-fixtures\visual --report-dir ..\_tmp_codex_smoke\rolltemplate-chat-smoke-aw2e-message-source-context-20260713-r1 --chat-geometry-policy aw2e-message-full-width --chat-typography-policy aw2e-message-cell-wrap-context --port 4395` passed 3/3 functional rolltemplate smoke.
- Evidence: candidate comparison rejected the candidate with `risk=reject-regresses-fixtures`, mean `16.55%`, regressions `2`, AW2E delta `+42.03%`, and YSHY delta `+7.62%`.
- Evidence: row-raster comparison rejected the same candidate with `risk=reject-row-raster-regression`; AW2E weighted `62.71%` (`+44.78`) and worst `66.48%` (`+40.2`), while YSHY weighted `30.09%` (`+8.68`) and worst `42.36%` (`+14.63`).
- Evidence: style proof rejected it with `REJECT_STYLE_CONTRADICTION`. The AW2E chat/message width matched actual Roll20, but table width and text-cell widths contradicted the actual Roll20 capture.
- Evidence: targeted renderer planning with `--candidate-comparison-dir ..\_tmp_codex_smoke\chat-candidates-aw2e-source-context-20260713-r1` surfaced `aw2e-message-source-context is already tried and not promotable` and still returned `HOLD_PRODUCTION_RENDERER_PATCH`.
- Current evidence: this is a negative result that narrows the renderer search. It does not improve visual parity, relink missing assets, upload to Roll20, or justify production renderer CSS.

## 2026-07-13 Chat Current Metrics Out-Dir/Fallback

- Root cause: `scripts/roll20_chat_current_metrics_audit.mjs` parsed only the first positional argument and always wrote to the canonical `chat-current-metrics-audit` folder. Passing `--out-dir` through the package script was ignored, so a locked canonical report folder could stop the current-metrics diagnostic even when a writable temp output was supplied.
- Updated the script to parse `--out-dir`, keep the run directory as the first positional argument, write JSON/Markdown to the requested output, and record `output.requestedOutDir`, `output.outDir`, and `output.fallbackReason` in the report.
- Added a conservative fallback for implicit canonical writes only: if no explicit `--out-dir` is supplied and the canonical write fails with `EPERM` or `EACCES`, the report is written to ignored `..\_tmp_codex_smoke\chat-current-metrics-audit-<run>-<timestamp>`.
- Updated `scripts/README.md` with the new output override and fallback behavior.
- Verification: `node --check scripts\roll20_chat_current_metrics_audit.mjs` passed.
- Verification: `corepack pnpm run diagnose:roll20-chat-current-metrics -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --out-dir ..\_tmp_codex_smoke\chat-current-metrics-source-context-20260713-r2` passed with `ROLL20 CHAT CURRENT METRICS PASS`, fixtures `3/3 current`, and `missingFields=0`.
- Verification: `corepack pnpm run gate:roll20-renderer-action -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --out-dir ..\_tmp_codex_smoke\renderer-gate-after-current-metrics-20260713-r1` passed and still returned `HOLD_PRODUCTION_RENDERER_PATCH`.
- Current evidence: the current chat metric sidecars are fresh enough for the renderer gate, but production renderer CSS remains held by source-context, asset, and template-scope blockers. No visual parity claim was made.

## 2026-07-13 Targeted Renderer Source-Context Plan

- Root cause: `gate:roll20-chat-template-scope` and `gate:roll20-renderer-action` already held renderer CSS on source-context proof, but `plan:roll20-chat-renderer-targets` did not read that report directly. A future agent could start from the targeted plan and miss that AW2E/YSHY still require rule-order/font-face/table-context proof before CSS review.
- Updated `scripts/roll20_chat_targeted_renderer_plan.mjs` to accept `--source-context-dir`, auto-select the newest same-run ignored temp `chat-source-context*` report when canonical source-context evidence is missing or weak, and write the chosen override into `reportOverrides`.
- The targeted plan now adds source-context blockers and evidence to high-mismatch fixtures. AW2E carries `RULE_ORDER_FONT_FACE_TABLE_CONTEXT_REQUIRED`, actual chat CSS `EXPECTED_RULE_PRESENT`, font decision `FONT_FACE_ACTIVATION_DIFFERS`, and table decision `TABLE_INTRINSIC_SOURCE_CONTEXT_REQUIRED`. YSHY carries `SANITIZE_REPLAY_REJECTED_SOURCE_MODEL_REQUIRED`, `6` changed font checks, table width delta `-24.531px`, and sanitize replay delta `+14.95%`.
- Updated `scripts/README.md` so the command table documents the new source-context override and auto-fallback behavior.
- Verification: `node --check scripts\roll20_chat_targeted_renderer_plan.mjs` and `corepack pnpm run test:roll20-chat-renderer-targets` passed.
- Verification: `corepack pnpm run plan:roll20-chat-renderer-targets -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --out-dir ..\_tmp_codex_smoke\chat-targeted-renderer-plan-source-context-20260713-r1` passed with `HOLD_PRODUCTION_RENDERER_PATCH`, `19` blockers, and `reportOverrides.sourceContext=..\_tmp_codex_smoke\chat-source-context-autofallback-20260713-r2`.
- Verification: `corepack pnpm run gate:roll20-chat-template-scope -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --targeted-plan-dir ..\_tmp_codex_smoke\chat-targeted-renderer-plan-source-context-20260713-r1 --out-dir ..\_tmp_codex_smoke\chat-template-scope-targeted-source-context-20260713-r1` passed with `HOLD_GLOBAL_CHAT_RENDERER_PATCH`, and the top renderer gate using that output passed with `HOLD_PRODUCTION_RENDERER_PATCH`.
- Current evidence: this makes the planning report safer and more truthful. It does not change product renderer CSS, upload to Roll20, relink missing assets, or prove visual parity.

## 2026-07-13 Chat Source Context Row/Paint Auto Fallback

- Root cause: the strongest YSHY row/paint/source evidence was in ignored temp output, where the top-level row/paint decision had been promoted to `SANITIZE_REPLAY_REJECTED_SOURCE_MODEL_REQUIRED`. The canonical row/paint/source report still had only weaker mixed evidence, so a normal source-context run could under-report which row/paint/source proof it used unless the temp report was passed manually.
- Updated `scripts/roll20_chat_source_context_probe.mjs` so normal runs auto-select the newest same-run ignored temp `row-paint-source*` report when it has a stronger promoted sanitize-replay rejection than the canonical row/paint/source report. Explicit `--row-paint-source-dir` still wins, and candidates must match the active Roll20 actual `runDir`.
- Verification: `node --check scripts\roll20_chat_source_context_probe.mjs` and `corepack pnpm run diagnose:roll20-chat-source-context -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --out-dir ..\_tmp_codex_smoke\chat-source-context-autofallback-20260713-r2` passed. The refreshed source-context report recorded `rowPaintSourceDir=..\_tmp_codex_smoke\row-paint-source-sanitize-replay-20260713-r1`.
- Evidence: refreshed source-context decisions are `RULE_ORDER_FONT_FACE_TABLE_CONTEXT_REQUIRED` for AW2E, `RULE_ORDER_FONT_FACE_TABLE_CONTEXT_REQUIRED` for Les-Oublies, and `SANITIZE_REPLAY_REJECTED_SOURCE_MODEL_REQUIRED` for YSHY. YSHY now carries row/paint/source prior decision `SANITIZE_REPLAY_REJECTED_SOURCE_MODEL_REQUIRED`, source order `SANITIZE_STYLE_REPLAY_REJECTED`, and sanitize replay delta `+14.95%`.
- Verification: `corepack pnpm run gate:roll20-chat-template-scope -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --source-context-dir ..\_tmp_codex_smoke\chat-source-context-autofallback-20260713-r2 --out-dir ..\_tmp_codex_smoke\chat-template-scope-source-autofallback-20260713-r2` passed with `HOLD_GLOBAL_CHAT_RENDERER_PATCH`.
- Verification: `corepack pnpm run gate:roll20-renderer-action -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --chat-source-context-dir ..\_tmp_codex_smoke\chat-source-context-autofallback-20260713-r2 --chat-template-scope-dir ..\_tmp_codex_smoke\chat-template-scope-source-autofallback-20260713-r2 --out-dir ..\_tmp_codex_smoke\renderer-gate-source-autofallback-20260713-r1` passed with `HOLD_PRODUCTION_RENDERER_PATCH`.
- Current evidence: this improves diagnostic freshness and prevents false promotion from stale canonical row/paint evidence. It does not change product renderer CSS, upload to Roll20, relink missing assets, or prove visual parity.

## 2026-07-13 Template Scope Source-Context Auto Fallback

- Root cause: the current usable `chat-source-context` and `chat-cell-allocation` reports were written to ignored `..\_tmp_codex_smoke` output, while `gate:roll20-chat-template-scope` only read canonical report folders unless every override was passed manually. This made normal gate runs collapse back to weaker `MISSING_SOURCE_CONTEXT` evidence even though a same-run source-context report already existed.
- Updated `scripts/roll20_chat_template_scope_gate.mjs` so normal runs auto-select the newest same-run ignored temp `chat-cell-allocation-probe-*` and `chat-source-context-*` reports when canonical folders are missing and no explicit override was supplied. Explicit `--cell-allocation-dir` and `--source-context-dir` still win.
- Updated `scripts/roll20_renderer_action_gate.mjs` so normal top-level renderer gate runs auto-select the newest same-run ignored temp `chat-template-scope-*` report when the canonical template-scope report lacks source-context evidence. The fallback is accepted only when the report contains non-`MISSING_SOURCE_CONTEXT` fixture evidence.
- Verification: `node --check scripts\roll20_chat_template_scope_gate.mjs`, `corepack pnpm run test:roll20-chat-template-scope`, and `corepack pnpm run gate:roll20-chat-template-scope -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --out-dir ..\_tmp_codex_smoke\chat-template-scope-autosource-20260713-r1` passed. The generated report recorded `reportOverrides.cellAllocation` and `reportOverrides.sourceContext`, and the source-context blockers now name `RULE_ORDER_FONT_FACE_TABLE_CONTEXT_REQUIRED` for AW2E and `SANITIZE_REPLAY_REJECTED_SOURCE_MODEL_REQUIRED` for YSHY.
- Verification: `node --check scripts\roll20_renderer_action_gate.mjs` and `corepack pnpm run gate:roll20-renderer-action -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --out-dir ..\_tmp_codex_smoke\renderer-gate-autotemplate-source-20260713-r1` passed. The top gate recorded `reportOverrides.chatTemplateScope` pointing to the autosource template-scope report and now surfaces the source-context blockers in the main renderer hold output.
- Current evidence: renderer remains `HOLD_PRODUCTION_RENDERER_PATCH`. This change makes the hold reason more truthful and current; it does not relink missing assets, promote renderer CSS, upload to Roll20, or prove visual parity.

## 2026-07-13 Chat Renderer Proof Checklist Gate

- Root cause: the renderer gate already knew AW2E and YSHY require different template-scoped chat models, but the targeted plan did not carry a machine-readable proof checklist through the downstream template-scope report. That left future work too dependent on prose when deciding whether a scoped renderer candidate is reviewable.
- Added `requiredProofChecklist` to `scripts/roll20_chat_targeted_renderer_plan.mjs`. AW2E now requires asset relink or explicit placeholder acceptance, `.sheet-rolltemplate-aw` style proof, message/content width sidecar evidence, exact text-measurement sidecar evidence, Les/YSHY nonregression, and row-raster/background nonregression before renderer review. YSHY/CoC now requires asset relink or placeholder acceptance, `.sheet-rolltemplate-coc` style proof, scrollWidth/clientWidth table-intrinsic sidecar evidence, font-face/rule-order/sanitize source-context evidence, AW2E/Les nonregression, and row-raster/background nonregression.
- Propagated that checklist into `scripts/roll20_chat_template_scope_gate.mjs`, including fallback checklist generation by required model. Both Markdown reports now show the proof checklist in the fixture table, and fixture detail sections print the required proof before renderer review.
- Verification: `node --check scripts\roll20_chat_targeted_renderer_plan.mjs`, `node --check scripts\roll20_chat_template_scope_gate.mjs`, `corepack pnpm run test:roll20-chat-renderer-targets`, `corepack pnpm run test:roll20-chat-template-scope`, `corepack pnpm run plan:roll20-chat-renderer-targets -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --out-dir ..\_tmp_codex_smoke\chat-targeted-renderer-plan-proofcheck-20260713-r1`, `corepack pnpm run gate:roll20-chat-template-scope -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --targeted-plan-dir ..\_tmp_codex_smoke\chat-targeted-renderer-plan-proofcheck-20260713-r1 --out-dir ..\_tmp_codex_smoke\chat-template-scope-proofcheck-20260713-r1`, `rg -n "Proof checklist|requiredProofChecklist|message-content-width-sidecar|font-face-rule-order-sanitize-source-context|style-proof" ..\_tmp_codex_smoke\chat-targeted-renderer-plan-proofcheck-20260713-r1 ..\_tmp_codex_smoke\chat-template-scope-proofcheck-20260713-r1`, `corepack pnpm run lint`, `corepack pnpm run build`, and `corepack pnpm run gate:roll20-renderer-action -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --chat-template-scope-dir ..\_tmp_codex_smoke\chat-template-scope-proofcheck-20260713-r1 --out-dir ..\_tmp_codex_smoke\renderer-gate-proofcheck-20260713-r1` passed.
- Current evidence: the targeted plan still returns `HOLD_PRODUCTION_RENDERER_PATCH`; the template-scope gate still returns `HOLD_GLOBAL_CHAT_RENDERER_PATCH`; the top renderer gate still returns `HOLD_PRODUCTION_RENDERER_PATCH`. This is the expected safe result because AW2E and YSHY still lack asset/style/source-context proof and current candidates are not promotion-ready.
- Claim boundary: this is renderer gate/report hardening only. It does not promote product CSS, relink assets, upload to Roll20, change preview pixels, or prove Roll20 visual parity.

## 2026-07-13 Worker Code Boundary Copy

- Root cause: worker JS was already preserved through the emit/code path, but the right code panel did not clearly tell users that worker scripts are Roll20 runtime code, not visible sheet objects. This could make hidden script behavior look like a preview bug.
- Updated `components/editor/CodeTabs.tsx` with per-tab status text, byte counts, and tab-specific empty messages. The Worker JS tab now states that worker code is not shown on the sheet canvas and is preserved for the Roll20 runtime.
- Added `data-testid` hooks for the right code tab and code subtabs, then extended `scripts/export_dialog_browser_smoke.mjs` so the browser smoke verifies the Worker JS tab can be selected and exposes the runtime-boundary/preservation copy.
- Verification: `node --check scripts\export_dialog_browser_smoke.mjs`, `corepack pnpm run guard:ui-copy`, `corepack pnpm run lint`, `corepack pnpm run build`, and `corepack pnpm run smoke:export-dialog -- --report-dir ..\_tmp_codex_smoke\export-dialog-worker-boundary-20260713-r1 --port 4393` passed.
- Evidence: the smoke reported `codeTabs.workerSelected=true`, Worker status text `Worker JS|0 B|시트 위에는 표시하지 않고 Roll20 런타임에서 실행되는 코드입니다.`, no console/page/request errors, and no external resource requests.
- Claim boundary: this clarifies and regression-tests the worker-code UI boundary only. It does not implement worker JS block editing, simulate all sheet-worker APIs, upload to Roll20, or prove actual Roll20 visual parity.

## 2026-07-13 Export Sandbox Diagnostics Progressive Disclosure

- Root cause: the Roll20 export dialog was exposing low-level Sandbox cleanup diagnostics directly in the main upload path. That preserved evidence, but it added cognitive noise for users who only need to know whether the zip is ready and what must be verified in Roll20.
- Changed `components/editor/ExportDialog.tsx` so the Sandbox cleanup rows now live in a native collapsed `<details>` advanced section. The status badge remains visible, while byte counts, HTML/CSS cleanup counts, class/tag cleanup, and external URL cleanup details are hidden until the user opens the section.
- Extended `scripts/export_dialog_browser_smoke.mjs` so the browser smoke now proves the advanced section exists, starts collapsed, hides the diagnostic list before expansion, and can still expand to expose the four diagnostic rows.
- Verification: `node --check scripts\export_dialog_browser_smoke.mjs`, `corepack pnpm run guard:ui-copy`, `corepack pnpm run lint`, `corepack pnpm run build`, `corepack pnpm run smoke:export-dialog -- --report-dir ..\_tmp_codex_smoke\export-dialog-sandbox-details-20260713-r3 --port 4392`, and `corepack pnpm run check:server-hygiene` passed.
- Evidence: the smoke reported `sandboxDiagnosticsInitiallyOpen=false`, `sandboxDiagnosticListVisibleBeforeExpand=false`, `sandboxDiagnosticsExpanded=true`, `consoleIssues=0`, `pageErrors=0`, `requestFailures=0`, and `externalResourceRequests=0`.
- Server hygiene: no project dev/smoke listener remained after the smoke; the existing Roll20 CDP listener on `127.0.0.1:9222` was preserved.
- Claim boundary: this is UI decluttering and regression coverage for the export dialog only. It does not upload a sheet to Roll20, relink AW2E/YSHY assets, change renderer CSS, or prove actual Roll20 visual parity.

## 2026-07-13 Imported Edit No-Rollback and Interaction Split

- Root cause: imported-sheet edit smoke sampled post-drop coordinates, but the pass condition did not require those samples to stay aligned with emitted absolute CSS. Separately, non-leaf subtree pixel diff and flow canvas insertion were folded into the interaction result in a way that could misreport the real state.
- Updated `scripts/imported_edit_sync_smoke.mjs` so imported pointer-drag attempts require four post-drop samples, first/final sampled coordinates matching emitted `left/top` within 2px, and `leftDrift/topDrift` within 2px.
- Added `--require-nonleaf-visual-sync` and made it default to false, matching the existing sheet-root visual-sync split. Non-leaf reorder still records subtree pixel diff, but default interaction pass now means structure/order/geometry/emit/reimport sync rather than unresolved visual parity.
- Fixed imported canvas flow insertion smoke so it only dispatches the drop when the current canvas drop mode is `inside`; before/after candidates are recorded and skipped instead of mutating the sheet into an absolute-placement failure.
- Verification: `node --check scripts\imported_edit_sync_smoke.mjs` passed. Full `corepack pnpm run smoke:imported-edit-sync -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir ..\_tmp_codex_smoke\imported-edit-no-rollback-strict-20260713-r2 --port 4387` passed for AW2E, Les-Oublies, synthetic-nonleaf-flow, and YSHY with `interaction=PASS`.
- Evidence: all four imported pointer-drag timelines reported `numericSampleCount=4`, `leftDrift=0`, `topDrift=0`, and first/final sampled positions equal to emitted `left/top`. AW2E/Les-Oublies/YSHY still reported resource failures and non-leaf subtree visual mismatch, so those stay visual-parity blockers rather than edit-interaction blockers.
- Server hygiene: `corepack pnpm run check:server-hygiene` passed after the smoke. No project dev/smoke listener remained; the existing Roll20 CDP listener on `127.0.0.1:9222` was preserved.
- Claim boundary: this improves imported-sheet edit interaction evidence and smoke truthfulness only. It does not relink user assets, fix external images/fonts, upload to Roll20, or prove visual parity.

## 2026-07-13 Edit Drag No-Rollback Strict Smoke

- Root cause guard: edit mode already keeps the dropped object visually locked while the Blockly/CSS model commit follows, but the previous smoke only checked broad drift after the move. It did not explicitly require the first post-pointerup coordinate to match the final emitted HTML/CSS coordinate.
- Updated `scripts/edit_flow_browser_smoke.mjs` to record `numericSampleCount`, first sampled position, and final sampled position for the section drag timeline.
- The pass condition now requires four post-drop samples, first sampled position matching the final computed position within 2px, final sampled position matching the emitted HTML/CSS position within 2px, and the existing drift guard.
- Verification: `node --check scripts\edit_flow_browser_smoke.mjs` passed. `corepack pnpm run smoke:edit-flow -- --out-dir ./out --base-path /roll20-block-editor --report-dir ..\_tmp_codex_smoke\edit-flow-no-rollback-strict-20260713 --port 4386` passed with all four samples at `472px, 264px` and `leftDrift=0`, `topDrift=0`.
- Server hygiene: `corepack pnpm run check:server-hygiene` passed after the smoke. No project dev/smoke listener remained; the existing Roll20 CDP listener on `127.0.0.1:9222` was preserved.
- Claim boundary: this strengthens the regression net for the synthetic edit-flow fixture. It does not prove imported large-sheet performance, actual Roll20 parity, AW2E/YSHY asset relink, or production renderer readiness.

## 2026-07-13 Asset Placeholder Relink Guard

- Root cause: asset relink drafts use `<paste-user-owned-https-url-here>` as a safe placeholder, but an uncommented draft line could be misread as an active replacement rule and create a false "ready" state.
- Updated `lib/export/asset_replacements.ts` so placeholder targets are rejected, counted separately in readiness, and never applied to preview/edit/export HTML/CSS.
- Updated `components/editor/ExportDialog.tsx` so the replacement status and readiness panel show placeholder target counts and tell the user to replace them with user-owned HTTP(S) URLs before actual Roll20 verification.
- Extended `scripts/export_dialog_browser_smoke.mjs` with a placeholder guard that imports a preserved Roll20-style input value, verifies the old URL remains, verifies the placeholder does not leak into render output, and checks the UI warning/counters.
- Updated `scripts/lib/assetReplacements.mjs` and `scripts/roll20_asset_relink_verification_plan.mjs` so the actual-verification CLI paths reject the same placeholder targets. A placeholder-only map now produces `mapEntries=0`, keeps AW2E/YSHY at `MISSING_RELINK`, and cannot create false local-only coverage.
- Verification: `node --check scripts\export_dialog_browser_smoke.mjs`, `corepack pnpm run test:asset-replacements`, `corepack pnpm run test:roll20-asset-relink`, `node --check scripts\roll20_asset_relink_verification_plan.mjs`, `node --check scripts\lib\assetReplacements.mjs`, `git diff --check`, `corepack pnpm run guard:ui-copy`, `corepack pnpm run lint`, `corepack pnpm run build`, `corepack pnpm run smoke:export-dialog -- --out-dir ./out --base-path /roll20-block-editor --report-dir ..\_tmp_codex_smoke\export-dialog-placeholder-guard-20260713-r3 --port 4383`, `corepack pnpm run plan:roll20-asset-relink -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --map-file ..\_tmp_codex_smoke\asset-placeholder-map.txt --out-dir ..\_tmp_codex_smoke\asset-relink-placeholder-guard-20260713-r1`, and `corepack pnpm run check:server-hygiene` passed.
- Server hygiene: no project dev/smoke listener remained after the smoke; the existing Roll20 CDP listener on `127.0.0.1:9222` was preserved.
- Claim boundary: this prevents false asset relink readiness only. It does not supply user-owned replacement URLs, relink AW2E/YSHY, upload to Roll20, promote renderer CSS, or prove Roll20 visual parity.

## 2026-07-13 Edit Layer Mini Map

- Root cause: edit mode already supported flow/free drops and layer reordering, but the layer list was still mostly text plus small badges. Users could not quickly see which rows were frame-like containers or how much child structure they contained.
- Added a compact mini-map to each edit layer row in `components/editor/EditCanvas.tsx`. It is app UI only, carries `data-r20-layer-mini-*` metadata for verification, and is not inserted into exported Roll20 sheet HTML/CSS.
- Extended `scripts/edit_flow_browser_smoke.mjs` so the layer drop-mode check now requires the mini-map on the droppable frame row and verifies role, can-drop, default drop mode, and child count.
- Verification: `node --check scripts\edit_flow_browser_smoke.mjs`, `corepack pnpm run test:layer-roles`, `corepack pnpm run lint`, `corepack pnpm run build`, and `corepack pnpm run smoke:edit-flow -- --out-dir ./out --base-path /roll20-block-editor --report-dir ..\_tmp_codex_smoke\edit-flow-layer-minimap-20260713-r1 --port 4382` passed.
- Claim boundary: edit-mode readability and Figma-like layer affordance only. This does not affect actual Roll20 renderer parity, AW2E/YSHY asset relink, or production renderer readiness.

## 2026-07-13 Asset Relink and Browser Paint Locked-Report Fallback

- Root cause: the next P0 path from the renderer gate depends on `plan:roll20-asset-relink` and `plan:roll20-chat-browser-paint`, but both scripts failed with `EPERM` when the active run's canonical report folders were read-only.
- Added the same default-output fallback pattern used by `preflight:roll20-cdp`: if no explicit `--out-dir` is supplied and the canonical report folder is locked, the scripts write ignored evidence under `..\_tmp_codex_smoke\...` and print `WARNING report write fallback`.
- Live asset relink rerun: `plan:roll20-asset-relink` now reports `RELINK_MAP_REQUIRED`, with AW2E and YSHY both `MISSING_RELINK`, and writes template evidence to `..\_tmp_codex_smoke\asset-relink-verification-plan-2026-06-18-state-map-v1-1783929958954`.
- Live browser paint rerun: `plan:roll20-chat-browser-paint` now reports `BROWSER_PAINT_BLOCKED_BY_RELINK`; AW2E and YSHY are blocked by source asset relink, while Les-Oublies is secondary because no chat background image is present in current evidence.
- Verification: syntax checks, `test:roll20-asset-relink`, `test:roll20-chat-browser-paint`, and the two live plan reruns passed.
- Claim boundary: workflow reliability and blocker clarity only. No asset was downloaded, no replacement URL was invented, no renderer CSS was promoted, and Roll20 visual parity remains unproven until user-owned HTTP(S) assets are supplied and reverified.

## 2026-07-13 CDP Preflight Locked-Report Fallback

- Root cause: `preflight:roll20-cdp` still failed hard when the canonical `reports\roll20-actual-compare\...\roll20-cdp-preflight` folder was read-only, even though other Roll20 gates already fall back to ignored temp output under `..\_tmp_codex_smoke`.
- Added `EPERM`/`EACCES` fallback writing to `scripts/roll20_cdp_preflight.mjs` for the default report path. Explicit `--out-dir` failures still fail, so user-specified output mistakes are not hidden.
- Live rerun: `corepack pnpm run preflight:roll20-cdp -- --run-dir reports\roll20-actual-compare\2026-06-18-state-map-v1` now succeeds, reports `READY`, `targets=8`, `roll20Targets=2`, `plannedFixtures=0`, and writes fallback evidence to `..\_tmp_codex_smoke\roll20-cdp-preflight-2026-06-18-state-map-v1-1783929646464`.
- Current next action from the tool: do not recapture blindly because no fixtures are currently planned for capture; continue renderer/template/asset diagnostics from `gate:roll20-renderer-action` unless a fresh live capture is intentionally requested.
- Verification: `node --check scripts\roll20_cdp_preflight.mjs` and `node scripts\roll20_cdp_preflight.mjs --self-test` passed before the live preflight rerun.
- Claim boundary: this repairs actual-verification workflow reliability only. It does not upload a sheet, capture new Roll20 screenshots, relink assets, or prove visual parity.

## 2026-07-13 Roll20 Sandbox Font Proxy Candidate

- Root cause test: actual Roll20 fails YSHY `BookkMyungjo-Bd` font checks, while local ChatPane had been preserving font URLs directly. The hypothesis was that local needed a Roll20-sandbox-like font URL proxy/failure model.
- Added diagnostic-only `roll20-sandbox-font-proxy` support in `components/editor/ChatPane.tsx`. It rewrites rolltemplate font URLs through the Roll20 image-proxy approximation when explicitly enabled and relies on `rolltemplate_chat_smoke` to suppress document-level user font registration for the run.
- Added the candidate to chat candidate comparison, row-raster candidate comparison, and style-proof lookup tables so future diagnostic refreshes do not silently skip it.
- Verification: syntax checks passed for the three changed scripts. `corepack pnpm run build` passed. Local smoke wrote `..\_tmp_codex_smoke\rolltemplate-chat-smoke-roll20-sandbox-font-proxy-20260713-r1` and passed all three fixtures.
- Rejection evidence: candidate comparison at `..\_tmp_codex_smoke\chat-candidates-roll20-sandbox-font-proxy-20260713-r1` reports `reject-regresses-fixtures`, mean aligned delta `+16.22%`, AW2E `+41.04%`, YSHY `+7.62%`.
- Row-raster evidence: `..\_tmp_codex_smoke\row-raster-roll20-sandbox-font-proxy-20260713-r2` reports `reject-row-raster-regression`, AW2E weighted row delta `+44.07%`, YSHY weighted row delta `+8.68%`.
- Claim boundary: this is diagnostic-only and rejected. It does not enable production renderer CSS, does not prove Roll20 visual parity, and does not remove the need for exact scoped rule-order/table-intrinsic/paint-context modeling.

## 2026-07-13 Template Scope Source Context Gate

- Root cause update: the template-scope gate knew AW2E and YSHY require different renderer models, but it did not directly consume the source-context probe. That left room for a scoped candidate to be reviewed before rule order, font-face activation, and table intrinsic source context were proven together.
- Added `--source-context-dir` to `scripts/roll20_chat_template_scope_gate.mjs` and made source/context decisions promotion blockers for non-P2 fixtures.
- Verification: `node --check scripts\roll20_chat_template_scope_gate.mjs` and `corepack pnpm run test:roll20-chat-template-scope` passed.
- Live isolated gate run wrote `..\_tmp_codex_smoke\chat-template-scope-source-context-20260713-r2` and returned `HOLD_GLOBAL_CHAT_RENDERER_PATCH` with `11` blockers.
- Top renderer gate consumed that scoped output at `..\_tmp_codex_smoke\renderer-gate-template-source-context-20260713-r2` and still returned `HOLD_PRODUCTION_RENDERER_PATCH`.
- Current evidence: AW2E source/context remains `RULE_ORDER_FONT_FACE_TABLE_CONTEXT_REQUIRED`; YSHY remains `SANITIZE_REPLAY_REJECTED_SOURCE_MODEL_REQUIRED` with `+14.95%` sanitize replay regression and `6` changed font checks.
- Claim boundary: gate accuracy and next-action narrowing only. No production renderer CSS, asset relink, Roll20 upload, or visual parity claim changed.

## 2026-07-13 Chat Source Context Probe

- Root cause update: current actual Roll20 chat evidence already proves user rolltemplate CSS is present, so the remaining high-mismatch chat path is not "CSS missing" and should not be attacked with broad local typography/filter/transform patches.
- Added `scripts/roll20_chat_source_context_probe.mjs` plus `diagnose:roll20-chat-source-context`.
- Connected the new report to `scripts/roll20_renderer_action_gate.mjs` through `--chat-source-context-dir`, so the top renderer hold report can show source/context evidence without rewriting canonical Roll20 evidence.
- The probe compares actual Roll20 `chatCssEvidence`, local/actual `fontEvidence`, template/table/caption/cell computed styles, text measurement samples, width reconciliation, intrinsic-width decisions, and the latest row/paint/source route.
- Verification: syntax check passed. Live isolated run wrote `..\_tmp_codex_smoke\chat-source-context-20260713-r2`.
- Gate verification: renderer action gate consumed that source-context report plus the fresh row/paint/source report at `..\_tmp_codex_smoke\renderer-gate-source-context-20260713-r2` and still returned `HOLD_PRODUCTION_RENDERER_PATCH`.
- Current evidence: AW2E `18.03%` and Les-Oublies `6.34%` both route to `RULE_ORDER_FONT_FACE_TABLE_CONTEXT_REQUIRED`; YSHY `20.68%` routes to `SANITIZE_REPLAY_REJECTED_SOURCE_MODEL_REQUIRED`.
- YSHY specifics: actual `.sheet-rolltemplate-coc` CSS is present, but six `BookkMyungjo-Bd` checks pass locally and fail in actual Roll20; table styles differ on font family, size, letter spacing, wrapping, border spacing, and width; sanitize replay remains rejected at `+14.95%`.
- Claim boundary: diagnostic routing only. No production renderer CSS, Roll20 upload, asset relink, or visual parity claim changed.

## 2026-07-13 YSHY Sanitize Replay Source Model

- Root cause update: the active evidence does not support simply copying observed Roll20 typography/sanitize values into local ChatPane CSS for YSHY/CoC. The existing `yshy-sanitize-typography` candidate worsens YSHY by `+14.95%`, while actual Roll20 and local still differ on table intrinsic/source context such as border spacing, font family, letter spacing, overflow wrapping, and table width.
- Updated `scripts/roll20_chat_row_paint_source_probe.mjs` to classify that path as `SANITIZE_REPLAY_REJECTED_SOURCE_MODEL_REQUIRED` instead of the broader `TABLE_INTRINSIC_SOURCE_CONTEXT_REQUIRED` bucket, and to record `sourceEvidence.sanitizeReplayDeltaPct`.
- Added `--row-paint-source-dir` to `scripts/roll20_renderer_action_gate.mjs` so a fresh ignored temp row/paint/source report can flow into the renderer gate without rewriting canonical Roll20 evidence.
- Verification: syntax checks passed for both changed scripts. The fresh row/paint/source probe wrote `..\_tmp_codex_smoke\row-paint-source-sanitize-replay-20260713-r1`, and the renderer gate consumed it at `..\_tmp_codex_smoke\renderer-gate-row-paint-sanitize-replay-20260713-r1`.
- Current evidence: YSHY stays P0 with aligned mismatch `20.68%`; the next YSHY work is actual Roll20 rule order, font-face activation, and `.sheet-rolltemplate-coc` table intrinsic source context, not transform/filter/broad typography CSS.
- Claim boundary: diagnostic narrowing only. Renderer remains `HOLD_PRODUCTION_RENDERER_PATCH` / `rendererReady=NO`; no production CSS, Roll20 upload, or asset relink happened.

## 2026-07-13 Renderer Gate Cell Allocation Fallback

- Root cause: `gate:roll20-renderer-action` accepted `--cell-allocation-dir`, but a normal gate run still emitted the stale warning "chat cell allocation probe has not been run" when the canonical report folder was locked/missing and the usable probe lived under ignored `_tmp_codex_smoke`.
- Added implicit fallback discovery for `chat-cell-allocation-probe-*` temp reports. The gate only auto-selects a report when the canonical report is missing, no explicit override was supplied, and the report JSON `runDir` resolves to the active Roll20 actual run.
- Verification: `node --check scripts\roll20_renderer_action_gate.mjs` passed. `gate:roll20-renderer-action -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --out-dir ..\_tmp_codex_smoke\renderer-gate-current-20260713-autocell` now records `reportOverrides.chatCellAllocation` and emits actual cell allocation evidence.
- Current evidence: cell allocation is `CELL_ALLOCATION_SECONDARY_OR_ACCEPTABLE`, scenarios `1`, rejected `0`, with AW2E/Les/YSHY all classified as `UNIFORM_TABLE_SCALE_OR_CROP_CONTEXT`.
- Claim boundary: renderer still stays `HOLD_PRODUCTION_RENDERER_PATCH` / `rendererReady=NO`. This removes a stale diagnostic warning; it does not promote renderer CSS, upload to Roll20, relink assets, or prove visual parity.

## 2026-07-13 Server Hygiene Check

- Root cause: agents were checking `netstat` manually and had to remember which listeners were project leftovers versus Roll20 CDP or user/system apps. That made it easy to either miss a leftover smoke server or consider stopping unrelated software.
- Added `scripts/server_hygiene_check.mjs` plus `check:server-hygiene` and `test:server-hygiene`.
- The checker watches project dev/smoke ports `3000`, `3001`, `3002`, and `4300-4499`, while preserving Roll20 CDP `9222` as an expected actual-verification listener.
- Safety boundary: `--kill-project` is opt-in and only attempts to stop matching `node.exe` listeners. When process-name lookup is denied, it reports `unknown` and skips killing rather than guessing.
- Verification: `corepack pnpm run test:server-hygiene`, `node --check scripts\server_hygiene_check.mjs`, and `corepack pnpm run check:server-hygiene` passed. Current environment reports no project dev/smoke listener and preserves `127.0.0.1:9222`.
- Claim boundary: workflow hygiene only. No renderer CSS, Roll20 upload, asset relink, or edit-mode sync behavior changed.

## 2026-07-13 Export README Asset Relink Guidance

- Root cause: the export dialog already had asset replacement UI, but the generated `README.txt` only described Roll20 upload slots. That left users without the critical warning that external images/fonts are not packaged and that local/data URLs are not enough for Roll20 visual parity.
- Updated `lib/export/readme.ts` so every export README includes an external image/font section covering zip limits, user-owned http(s) relink targets, data/local-path limits, Roll20 proxy/Imgur placeholder risk, and Sandbox/new-test-room recomparison.
- Updated `lib/export/zip_builder.ts` to tell the README when `asset-replacements.json` is included.
- Added `lib/export/__tests__/readme.test.ts` plus `test:export-readme` to guard the new README guidance and zip wiring.
- Verification: `corepack pnpm run test:export-readme`, `corepack pnpm run test:asset-replacements`, `corepack pnpm run lint`, `corepack pnpm run build`, `corepack pnpm run guard:roll20-evidence -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `git diff --check`, and `corepack pnpm run smoke:export-dialog -- --port 4370 --report-dir ..\_tmp_codex_smoke\export-dialog-readme-assets-20260713-r1` passed. The smoke reported console issues `0`, page errors `0`, request failures `0`, external resource requests `0`, and no mojibake.
- Server hygiene: no local app server remained listening after the smoke; only the existing Roll20 CDP listener on `127.0.0.1:9222` stayed open.
- Claim boundary: this improves user-facing export/relink instructions only. It does not relink missing assets, promote renderer CSS, or prove Roll20 visual parity.

## 2026-07-13 Cell Allocation Locked-Report Fallback

- Root cause: `diagnose:roll20-chat-cell-allocation` could not write the canonical `chat-cell-allocation-probe` folder in the active Roll20 run because Windows returned `EPERM` on `mkdir`, leaving the default renderer gate with a stale "cell allocation probe has not been run" warning unless an override path was supplied.
- Added automatic `EPERM`/`EACCES` fallback for `diagnose:roll20-chat-cell-allocation`: without an explicit `--out-dir`, locked canonical writes now fall back to `..\_tmp_codex_smoke\...`.
- Verification: `node --check scripts\roll20_chat_cell_allocation_probe.mjs`, `corepack pnpm run test:roll20-chat-cell-allocation`, `corepack pnpm run guard:roll20-evidence -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `git diff --check`, `corepack pnpm run lint`, and `corepack pnpm run build` passed.
- Live rerun: `diagnose:roll20-chat-cell-allocation` wrote `..\_tmp_codex_smoke\chat-cell-allocation-probe-2026-06-18-state-map-v1-1783904920839`; `gate:roll20-renderer-action --cell-allocation-dir ..\_tmp_codex_smoke\chat-cell-allocation-probe-2026-06-18-state-map-v1-1783904920839` wrote `..\_tmp_codex_smoke\renderer-action-gate-2026-06-18-state-map-v1-1783904928615`.
- Current evidence: default cell allocation is `CELL_ALLOCATION_SECONDARY_OR_ACCEPTABLE`, with all three fixtures classified as `UNIFORM_TABLE_SCALE_OR_CROP_CONTEXT`. The remaining renderer work is therefore message/table width, crop/context, style proof, assets, and split template scope, not a broad cell/font/wrap CSS patch.
- Claim boundary: renderer remains `HOLD_PRODUCTION_RENDERER_PATCH` and `rendererReady=NO`; no Roll20 visual parity claim changed.

## 2026-07-13 Candidate Asset Evidence Override

- Added isolated-output/report-override support to asset routing:
  - `scripts/roll20_chat_background_asset_probe.mjs`: `--out-dir`, `--background-source-dir`, `--background-raster-dir`.
  - `scripts/roll20_chat_asset_preservation_plan.mjs`: `--asset-probe-dir`, `--background-raster-dir`, `--target-plan-dir`.
- Updated `scripts/README.md` with the override arguments.
- Verification: syntax checks and self-tests passed for both changed scripts.
- Sandboxed candidate asset probe output `..\_tmp_codex_smoke\background-assets-aw2e-width-text-metrics-20260713-r1` reported `ASSET_FETCH_INCOMPLETE`, so the probe was rerun with network access.
- Network-enabled candidate asset probe output `..\_tmp_codex_smoke\background-assets-aw2e-width-text-metrics-net-20260713-r1` reports AW2E and YSHY as `ASSET_BYTES_MATCH_BUT_SOURCE_PLACEHOLDER`: local and actual proxy bytes match (`200 image/png 503b png 161x81`), and the source resolves to the same `removed.png` placeholder.
- Candidate asset plan output `..\_tmp_codex_smoke\chat-assets-aw2e-width-text-metrics-20260713-r1` keeps `HOLD_RENDERER_FOR_ASSET_POLICY`; AW2E and YSHY are `SOURCE_ASSET_LOST_RELINK_REQUIRED`.
- Claim boundary: no assets were downloaded into the repo, no real sheet assets were committed, no Roll20 upload happened, and visual parity remains unproven until user-owned live assets are relinked and reverified.

## 2026-07-13 AW2E Width/Text Metrics Background-Raster Follow-Up

- Fed the `aw2e-message-width-text-metrics` candidate evidence through the background-raster routing probe.
- Live output: `..\_tmp_codex_smoke\background-raster-aw2e-width-text-metrics-20260713-r1`.
- Evidence: AW2E routes to `COLOR_ASSET_RASTER_MODEL_REQUIRED` with row weighted mismatch `24.69%`, luma correction gain `-1.39%`, and width experiment `CHAT_MESSAGE_CONTENT_WIDTH`.
- Interpretation: after the candidate matches AW2E width/text measurement, the remaining rejection is a color/asset/background raster context problem. Do not try another broad width/font/cell/wrap CSS patch for this axis.
- Claim boundary: diagnostic routing only. No production renderer CSS changed, no Roll20 upload happened, and visual parity remains unproven.

## 2026-07-13 AW2E Width/Text Metrics Font-Glyph Follow-Up

- Added `--out-dir` / `--report-dir` support to `scripts/roll20_chat_font_glyph_model.mjs` so candidate-specific font/glyph evidence can stay in ignored temp output instead of rewriting the canonical actual Roll20 report folder.
- Updated `scripts/README.md` for the new font/glyph diagnostic argument shape.
- Verification: `node --check scripts\roll20_chat_font_glyph_model.mjs` passed.
- Default font/glyph evidence: `..\_tmp_codex_smoke\chat-font-glyph-default-outdir-20260713-r1` reports AW2E `tableDelta=+15.75px`, `tableTextDelta=+15.602px`, residual `+0.148px`, and `12` compared textMeasure samples.
- Candidate font/glyph evidence: `..\_tmp_codex_smoke\chat-font-glyph-aw2e-message-width-text-metrics-20260713-r1` reports AW2E `tableDelta=0px`, `tableTextDelta=0px`, residual `0px`, and no table font-family/font-availability change.
- Candidate raster evidence: `..\_tmp_codex_smoke\row-raster-candidates-aw2e-width-text-metrics-20260713-r1` still rejects `aw2e-message-width-text-metrics`; AW2E weighted row mismatch worsens from `17.93%` to `24.69%`, and worst-row mismatch worsens from `26.28%` to `34.28%`.
- Candidate compositing evidence: `..\_tmp_codex_smoke\row-compositing-aw2e-width-text-metrics-20260713-r1` classifies AW2E as `LOCAL_BACKGROUND_TOO_DARK`; worst row is `edge=0%`, `flat=100%`, `localDarker=68.48%`.
- Candidate background-source evidence: `..\_tmp_codex_smoke\background-source-aw2e-width-text-metrics-candidate-smoke-20260713-r1` reports AW2E `bg=DECLARATIONS_MATCH`, `widthDelta=0px`, and `BACKGROUND_SOURCE_SECONDARY`.
- Claim boundary: this is diagnostic routing only. The candidate proves the width/text measurement axis can be matched, but it is still rejected for production because row raster gets worse. No Roll20 upload, asset relink, or production ChatPane CSS change happened.

## 2026-07-13 AW2E Width/Text Metrics Cell Allocation Follow-Up

- Reran the existing `aw2e-message-width-text-metrics` candidate through the cell allocation probe instead of promoting or retrying broad AW2E cell/font CSS.
- Live diagnostic: `corepack pnpm run diagnose:roll20-chat-cell-allocation -- reports\roll20-actual-compare\2026-06-18-state-map-v1 reports\rolltemplate-chat-smoke\rolltemplate-chat-smoke-results.json --candidate-smoke aw2e-message-width-text-metrics=reports\rolltemplate-chat-smoke-aw2e-message-width-text-metrics\rolltemplate-chat-smoke-results.json --out-dir ..\_tmp_codex_smoke\chat-cell-allocation-aw2e-message-width-text-metrics-20260713-r1`.
- Evidence: for `official-roll20-AW2E`, `aw2e-message-width-text-metrics` preserves cell allocation in the probe (`tableDelta=0px`, max text-cell delta `0px`, max ratio delta `0%`). This separates it from the rejected `aw2e-message-cell-wrap-context` path, which broke allocation.
- Gate evidence: `..\_tmp_codex_smoke\chat-template-scope-aw2e-message-width-text-metrics-cell-20260713-r1` still returns `HOLD_GLOBAL_CHAT_RENDERER_PATCH`, and `..\_tmp_codex_smoke\renderer-gate-aw2e-message-width-text-metrics-cell-20260713-r1` still returns `HOLD_PRODUCTION_RENDERER_PATCH`.
- Remaining blocker: the candidate is cell-allocation-safe but not renderer-safe. The top renderer gate still reports `no-meaningful-gain`, `style=NOT_STYLE_PROVEN`, asset relink blockers, and AW2E row-raster regression (`weighted delta=+6.76%`, worst-row delta `+8%`).
- Server hygiene: no local app/dev server was started for this check. The only expected listener remains the Roll20 CDP browser on `127.0.0.1:9222`.
- Claim boundary: no production ChatPane CSS changed, no Roll20 upload happened, no asset relink happened, and Roll20 visual parity remains unproven.

## 2026-07-13 Cell Allocation Gate Integration

- Connected cell allocation evidence to the renderer decision path instead of leaving it as a standalone report.
- `scripts/roll20_chat_template_scope_gate.mjs` now accepts `--cell-allocation-dir`, records cell allocation summaries per fixture, and adds blockers for production-unsafe scenarios such as `BROAD_STYLE_BREAKS_CELL_ALLOCATION`.
- `scripts/roll20_renderer_action_gate.mjs` now accepts `--cell-allocation-dir` and `--chat-template-scope-dir`, summarizes the cell allocation probe, and emits a top-level production renderer blocker when a candidate breaks row/cell allocation.
- `scripts/roll20_chat_diagnostic_refresh.mjs` now runs `diagnose:roll20-chat-cell-allocation` before the template-scope gate during default refreshes.
- Verification: syntax checks passed for the three changed scripts and `test:roll20-chat-template-scope` passed.
- Live gate evidence: `..\_tmp_codex_smoke\chat-template-scope-cell-allocation-aw2e-wrap-20260713-r1` reports `10` blockers, including the AW2E `aw2e-message-cell-wrap-context` allocation rejection (`tableDelta=-188.391px`, max text-cell delta `+73.719px`).
- Live top-level evidence: `..\_tmp_codex_smoke\renderer-gate-cell-allocation-aw2e-wrap-20260713-r1` keeps `HOLD_PRODUCTION_RENDERER_PATCH` and includes the cell allocation blocker alongside split-model, asset, style-proof, row-raster, and candidate-regression blockers.
- Claim boundary: no production ChatPane CSS changed and no new Roll20 capture/upload happened. This is promotion safety and diagnostic routing only.

## 2026-07-13 AW2E Cell Allocation Probe

- Added `scripts/roll20_chat_cell_allocation_probe.mjs` plus `diagnose:roll20-chat-cell-allocation` and `test:roll20-chat-cell-allocation`.
- Purpose: compare actual Roll20 chat DOM sidecars with local/candidate smoke at row/cell allocation level before trying another ChatPane CSS candidate.
- Verification: `node --check scripts\roll20_chat_cell_allocation_probe.mjs` and `corepack pnpm run test:roll20-chat-cell-allocation` passed.
- Live diagnostic: `corepack pnpm run diagnose:roll20-chat-cell-allocation -- reports\roll20-actual-compare\2026-06-18-state-map-v1 reports\rolltemplate-chat-smoke\rolltemplate-chat-smoke-results.json --candidate-smoke aw2e-message-cell-wrap-context=..\_tmp_codex_smoke\rolltemplate-chat-smoke-aw2e-cell-wrap-policy-diag-20260713-r1\rolltemplate-chat-smoke-results.json --out-dir ..\_tmp_codex_smoke\chat-cell-allocation-aw2e-wrap-20260713-r2`.
- Evidence: default renderer preserves cell ratios for current actual evidence (`max ratio delta` AW2E `+0.255%`, Les-Oublies `+0.602%`, YSHY `+0.039%`), which points to root/table/crop context before typography CSS.
- Evidence: the AW2E wrap/cell-font candidate breaks allocation (`tableDelta=-188.391px`, max text-cell delta `+73.719px`, max ratio delta `+6.802%`) and remains rejected.
- Claim boundary: no production ChatPane CSS changed, no Roll20 upload happened, and Roll20 visual parity remains unproven.

## 2026-07-13 AW2E Cell Wrap Context Candidate

- Tested a narrower AW2E diagnostic hypothesis after the cell-font width guard: keep the candidate local-only, add `aw2e-message-cell-wrap-context`, and feed its temp smoke evidence into candidate comparison, style proof, and row-raster diagnostics.
- Added policy-effect diagnostics to `rolltemplate_chat_smoke`: the JSON/Markdown now records active chat policy attrs and targeted computed-style checks, so a future diagnostic candidate cannot be mistaken as applied merely because localStorage was set.
- Added isolated-output support to `diagnose:roll20-chat-intrinsic-width`, and the report now records the selected local smoke path plus local policy diagnostics. Fresh candidate smoke can now flow into intrinsic table/cell allocation analysis without rewriting canonical Roll20 reports.
- Verification: AW2E-only rolltemplate smoke passed at `..\_tmp_codex_smoke\rolltemplate-chat-smoke-aw2e-cell-wrap-policy-diag-20260713-r1`, with `policyDiagnostics.status=APPLIED`; downstream comparison wrote `..\_tmp_codex_smoke\chat-candidates-aw2e-cell-wrap-policy-diag-20260713-r1`, `..\_tmp_codex_smoke\chat-style-aw2e-cell-wrap-policy-diag-20260713-r1`, and `..\_tmp_codex_smoke\row-raster-candidates-aw2e-cell-wrap-policy-diag-20260713-r1`.
- Verification: Intrinsic-width reruns passed for both the canonical default smoke and the AW2E wrap-policy smoke, writing `..\_tmp_codex_smoke\intrinsic-width-default-outdir-20260713-r1` and `..\_tmp_codex_smoke\intrinsic-width-aw2e-cell-wrap-policy-diag-20260713-r1`.
- Evidence: the applied candidate does not fix width. It blows AW2E local table width back to `547.921875px` versus actual Roll20 `359.53125px`, with text-cell widths still far too wide (`151.0625px`/`167.4375px` local vs `85.53125px`/`93.71875px` actual).
- Evidence: the default AW2E intrinsic profile is small but real (`tableWidthDelta=+15.75px`, max cell delta `+4.953px`), while the applied wrap/cell-font profile is a true cell-allocation break (`tableWidthDelta=-188.391px`, max cell delta `73.719px`, actual/local table width `0.656x`).
- Result: reject the candidate. Pixel comparison reports mean delta `+41.27%` with `1` regression, style proof reports `REJECT_STYLE_CONTRADICTION`, and row-raster comparison worsens AW2E weighted mismatch from `17.93%` to `62.08%`.
- Server hygiene: no project dev server remained after the smoke; only the existing Roll20 CDP listener on `127.0.0.1:9222` is expected to stay open.
- Claim boundary: no production ChatPane CSS was promoted, no Roll20 upload happened, no asset relink happened, and Roll20 visual parity remains unproven.

## 2026-07-13 AW2E Cell Font Width-Guard

- Root cause update: the rejected AW2E `message width + cell font` candidate matched the obvious style probes (`chat/message` width and `td:first.fontSize`) but blew up the actual rolltemplate table width. That made the candidate look style-compatible in one narrow proof while pixel/row-raster evidence correctly rejected it.
- Added per-cell `computedStyle` and box metrics to local chat smoke and Roll20 chat capture sidecars so future captures can compare cell-level font/box context directly.
- Tightened `scripts/roll20_chat_candidate_style_proof.mjs`: AW2E message/cell-font candidates now must also match actual Roll20 `table.rect.width` within an 8px tolerance before they can be style-compatible.
- Follow-up tightening: AW2E message/cell-font candidates now also compare text-cell rect widths from `rowMetrics`, preventing `td:first` marker-cell evidence from standing in for the real text cells that drive table width.
- Verification: syntax checks passed for the three changed scripts. Targeted rerun wrote `..\_tmp_codex_smoke\chat-style-aw2e-cell-font-width-guard-20260713-r1` and reports `aw2e-message-cell-font-context` as `REJECT_STYLE_CONTRADICTION`.
- Evidence: AW2E candidate local `table.rect.width=547.921875px`; actual Roll20 `table.rect.width=359.53125px`. The candidate remains diagnostic-only and rejected.
- Additional evidence: text-cell widths diverge sharply (`Succeeds` `151.0625px` local vs `85.53125px` actual; `Succeeds partially` `167.4375px` local vs `93.71875px` actual). A local-only smoke combining `aw2e-root-width-actual` and `aw2e-message-cell-font-context` still leaves the table at `547.921875px`, so root width alone is not the missing model.
- Claim boundary: no production ChatPane CSS changed, no Roll20 upload happened, no assets were relinked, and visual parity remains unproven.

## 2026-07-13 Background Source/Raster Candidate Evidence Override

- Added isolated evidence override support to background source and background raster probes, so temp candidate compositing/row-raster evidence can flow into the next diagnostic layer without rewriting canonical Roll20 reports.
- Verification: `node --check` passed for both scripts, and the background raster self-test passed.
- Default temp-output runs passed against `reports\roll20-actual-compare\2026-06-18-state-map-v1`. Candidate-specific runs consumed the rejected `aw2e-message-cell-font-context` evidence through `..\_tmp_codex_smoke\background-source-aw2e-cell-font-20260713-r1` and `..\_tmp_codex_smoke\background-raster-aw2e-cell-font-20260713-r1`.
- Follow-up fix: background source now computes observed local-vs-actual table rect width deltas from the selected local smoke plus Roll20 DOM sidecar, instead of relying only on canonical style-context deltas. The rejected AW2E cell-font candidate shows a `+188.391px` table width explosion versus actual Roll20.
- Result: AW2E now routes to `TABLE_WIDTH_CONTEXT_BEFORE_LUMA_MODEL`, not `ROW_LUMA_MODEL_PROMISING`. Next AW2E work must resolve table/message width and crop context before treating luma correction as a renderer model.
- Result: YSHY routes to `BACKGROUND_SIZE_CANDIDATE_REJECTED` / `BACKGROUND_SIZE_SCALE_REJECTED`; do not retry background-size/table-scale/filter hacks for YSHY.
- Claim boundary: diagnostic routing only. No production renderer CSS changed, no assets were relinked, no Roll20 upload happened, and visual parity remains unproven.

## 2026-07-13 AW2E Cell Font Row Compositing Follow-Up

- Added isolated evidence override support to the row paint/source and row compositing probes, so temp candidate smoke, style proof, row-raster, and candidate-comparison reports can be inspected without copying them into canonical Roll20 evidence.
- Verification: `node --check` passed for both changed scripts. Default temp-output runs passed for row paint/source and row compositing against `reports\roll20-actual-compare\2026-06-18-state-map-v1`.
- Candidate-specific rerun consumed `aw2e-message-cell-font-context` temp evidence from `_tmp_codex_smoke`. AW2E row-weighted mismatch stayed rejected at `62.73%`, but virtual luma correction reduced it to `14.83%` (`-47.9%`), routing the next AW2E work to `LUMA_BACKGROUND_COMPOSITING_MODEL_REQUIRED`.
- YSHY in the same candidate-specific row compositing run routes to `BACKGROUND_COMPOSITING_MODEL_REQUIRED`, so the next YSHY/CoC experiment should target row background/source compositing and not a CSS filter hack.
- Claim boundary: this is diagnostic routing only. No production ChatPane CSS changed, no assets were relinked, no Roll20 upload happened, and Roll20 visual parity remains unproven.

## 2026-07-13 AW2E Cell Font Context Candidate

- Root cause hypothesis tested: AW2E's previous text-metrics candidate failed style proof because local `td:first` stayed at `13.65px` while actual Roll20 reported `27.3px`. A plausible next hypothesis was that matching chat/message width plus AW2E table/cell font context would improve parity.
- Added diagnostic-only ChatPane typography policy `aw2e-message-cell-font-context`: AW2E rolltemplate table stays `13.65px`, while AW2E caption/td become `27.3px`, with normal letter spacing and auto font smoothing. This is behind localStorage diagnostic policy only; default ChatPane rendering is unchanged.
- Added temp-evidence overrides to candidate diagnostics:
  - `roll20_chat_candidate_compare.mjs`: `--candidate-screenshots name=path`
  - `roll20_chat_row_raster_candidate_compare.mjs`: `--candidate-smoke name=path`, `--candidate-screenshots name=path`
  - `roll20_chat_candidate_style_proof.mjs`: `--candidate-comparison-dir <dir>`, `--candidate-smoke name=path`
- Verification: the new smoke ran to ignored temp output and passed all three fixtures. Candidate comparison, style proof, row-raster comparison, and template-scope gate all consumed the temp evidence via overrides.
- Result: reject the candidate. Style proof confirms the targeted AW2E computed styles match actual Roll20 (`td:first` `27.3px`), but screenshot and row-raster evidence get much worse: candidate comparison mean delta `+16.55%`, AW2E delta `+42.04%`; AW2E row-weighted mismatch `62.73%` vs baseline `17.93%`.
- Root cause update: AW2E parity is not solved by copying isolated computed font-size values into ChatPane. The remaining gap is likely in row paint/source rasterization, crop/scale, or more specific nested text rendering. The candidate must stay diagnostic-only and rejected.
- Claim boundary: no production renderer CSS was promoted, no Roll20 visual parity claim changed, and generated candidate evidence stayed local-only under `_tmp_codex_smoke`.

## 2026-07-13 Chat Candidate Style-Proof Best-Candidate Coverage

- Root cause: `scripts/roll20_chat_candidate_style_proof.mjs` only selected candidates whose comparison risk was `candidate-needs-style-proof` or `single-fixture-only`. The template-scope gate, however, chooses each fixture's best pixel candidate by fixture delta. That meant the actual gate-selected candidates could be missing from style proof and appear as `NOT_STYLE_PROVEN` even when their computed-style evidence could already reject them.
- Added `--include-best-per-fixture` to include the best candidate selected for each fixture in the candidate-comparison report.
- Added `--include-candidates <comma-list>` for targeted proof of named candidates.
- Added a `selection` block to the style-proof JSON/Markdown so agents can see why a candidate was included.
- Verification: `node --check scripts\roll20_chat_candidate_style_proof.mjs` passed. Live style proof with `--include-best-per-fixture` selected `no-shadow`, `aw2e-message-width-text-metrics`, `roll20-intrinsic-spacing`, and `paint-dim-background`.
- Current evidence: `3/4` selected candidates are rejected by actual Roll20 style evidence. `aw2e-message-width-text-metrics` contradicts actual Roll20 at AW2E `td:first` font size (`13.65px` candidate vs `27.3px` actual). `paint-dim-background` contradicts actual Roll20 because its pixel gain comes from a local `filter` while actual computed `filter` is `none`.
- Gate result with the expanded style proof remains `HOLD_GLOBAL_CHAT_RENDERER_PATCH` with `9` blockers, but the failure is now more precise: AW2E/YSHY best candidates are style contradictions, not merely unproven candidates.
- Claim boundary: diagnostic truthfulness only. No production ChatPane CSS changed, no assets were relinked, no Roll20 upload happened, and visual parity remains unproven.

## 2026-07-13 Chat Template Scope Isolated Evidence Override

- Root cause: style-proof diagnostics still wrote only into the selected actual-run folder, and the template-scope gate could not consume freshly generated candidate/style/row-raster temp reports without copying them back into canonical evidence. That made renderer investigation brittle on locked Windows report folders and made it too easy to mix stale canonical evidence with fresh temp diagnostics.
- Added `--out-dir <writable-report-dir>` to `scripts/roll20_chat_candidate_style_proof.mjs`.
- Added report override options to `scripts/roll20_chat_template_scope_gate.mjs`: `--targeted-plan-dir`, `--width-reconciliation-dir`, `--policy-dir`, `--candidate-comparison-dir`, `--style-proof-dir`, `--asset-plan-dir`, and `--row-raster-candidates-dir`.
- The template-scope gate now records `reportOverrides` in JSON and Markdown. If an override directory is provided but the expected report JSON is missing, the gate fails instead of silently falling back to stale canonical evidence.
- Verification: `node --check scripts\roll20_chat_candidate_style_proof.mjs`, `node --check scripts\roll20_chat_template_scope_gate.mjs`, and `node scripts\roll20_chat_template_scope_gate.mjs --self-test` passed.
- Live verification passed against `reports\roll20-actual-compare\2026-06-18-state-map-v1`:
  - `diagnose:roll20-chat-candidate-style -- ... --out-dir ..\_tmp_codex_smoke\chat-candidate-style-proof-outdir-20260713-r1`
  - `diagnose:roll20-chat-candidates -- ... --out-dir ..\_tmp_codex_smoke\chat-candidates-outdir-20260713-r1`
  - `diagnose:roll20-chat-row-raster-candidates -- ... --out-dir ..\_tmp_codex_smoke\row-raster-candidates-outdir-20260713-r1`
  - `gate:roll20-chat-template-scope -- ... --candidate-comparison-dir ... --style-proof-dir ... --row-raster-candidates-dir ... --out-dir ..\_tmp_codex_smoke\chat-template-scope-overrides-20260713-r1`
- Current result: `HOLD_GLOBAL_CHAT_RENDERER_PATCH` with `9` blockers. AW2E's best text-metrics candidate is still not style-proven and regresses row-raster evidence; YSHY's `paint-dim-background` candidate improves aligned mismatch but still regresses another fixture and remains held by asset policy.
- Claim boundary: isolated evidence wiring only. No product renderer CSS changed, no Roll20 upload happened, no assets were relinked, and visual parity remains unproven.

## 2026-07-13 Renderer Gate Root Report Override

- Root cause: fresh isolated full-root/geometry diagnostics could be generated safely with `--out-dir`, but `gate:roll20-renderer-action` still read only fixed report paths under the canonical actual-run folder. That meant agents had no safe way to test a renderer action recommendation against fresh temp root evidence without copying files back into canonical reports.
- Added `--full-root-dir`, `--scroll-metrics-full-root-dir`, `--root-cutoff-dir`, and `--geometry-dir` to `scripts/roll20_renderer_action_gate.mjs`. Override directories must contain the expected report JSON; if an override is provided but missing, the gate fails instead of silently falling back.
- Added `reportOverrides` to the generated gate JSON so the evidence source is auditable.
- Verification: `node --check scripts\roll20_renderer_action_gate.mjs` passed. Live gate run with fresh isolated full-root and geometry reports passed:
  - `gate:roll20-renderer-action -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --full-root-dir ..\_tmp_codex_smoke\full-root-candidates-outdir-20260713 --geometry-dir ..\_tmp_codex_smoke\geometry-outdir-20260713 --out-dir ..\_tmp_codex_smoke\renderer-gate-with-root-overrides-20260713`
- Current result: `HOLD_PRODUCTION_RENDERER_PATCH`. The gate now sees the fresh diagnostic full-root candidates (`8.23%` AW2E, `7.77%` Les-Oublies, `15.69%` YSHY), but the renderer remains held by split chat/template models, asset relink blockers, rejected candidate regressions, and non-uniform patch families.
- Claim boundary: renderer gate wiring only. No production CSS was promoted, no canonical reports were rewritten, and Roll20 visual parity remains unproven.

## 2026-07-13 Root Geometry Diagnostics Out-Dir

- Root cause: several Roll20 root/height diagnostics still wrote only into the selected actual-run folder, and `smoke:roll20-full-root-candidates` also compiled `buildDoc.ts` into the old `.tmp/full-root-candidate-build` folder. On this machine that build folder is read-only/locked, so a fresh full-root candidate rerun failed before it could write the requested temp report.
- Added `--out-dir <writable-report-dir>` to `scripts/roll20_geometry_delta_diagnostics.mjs`, `scripts/roll20_height_drift_diagnostics.mjs`, and `scripts/roll20_full_root_candidate_smoke.mjs`.
- Added `--build-dir <writable-build-dir>` to `scripts/roll20_full_root_candidate_smoke.mjs`; when `--out-dir` is present and `--build-dir` is omitted, the temporary TypeScript compile now goes to `out-dir/.build` instead of the old `.tmp` folder.
- Verification: `node --check` passed for all three scripts. Live temp-output runs passed:
  - `diagnose:roll20-geometry -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --out-dir ..\_tmp_codex_smoke\geometry-outdir-20260713`
  - `diagnose:roll20-height-drift -- reports\roll20-actual-compare\2026-06-18-state-map-v1 official-roll20-Les-Oublies --out-dir ..\_tmp_codex_smoke\height-drift-outdir-20260713`
  - `smoke:roll20-full-root-candidates -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --out-dir ..\_tmp_codex_smoke\full-root-candidates-outdir-20260713`
- Current evidence: canonical-source geometry still says Les-Oublies root delta is close (`-3.625px`) and height drift classifies as `height-close`; fresh isolated full-root candidates still show non-parity mismatches (`7.77%` best for Les-Oublies, `8.23%` AW2E, `15.69%` YSHY).
- Claim boundary: diagnostic rerun safety only. The canonical actual evidence was not rewritten, renderer gates were not changed, and Roll20 visual parity remains unproven.

## 2026-07-13 Layer Role Token Classification

- Root cause: `classifyLayerRole()` used broad substring checks like `t.includes('tr')`, so non-table block types containing those letters, especially `r20_attr_ref`, `r20_attr_ref_max`, and `r20_attribute_card`, could be classified as table roles.
- Product impact: the edit layer panel derives role badges, color rails, and droppable-container affordances from this classifier. A false table role can make an attribute/control block look like a container, which is wrong for the Figma-like layer model.
- Changed the classifier to split block types into exact lowercase tokens and match table/flow/frame/control/action/media/text/runtime roles from those tokens. Exact Roll20 table blocks still classify as table; attr/attribute blocks classify as control and do not receive children by default.
- Added `lib/editor/__tests__/layerRoles.test.ts` plus `test:layer-roles` to lock the regression.
- Verification: `node --check lib\editor\layerRoles.ts`, `node --check lib\editor\__tests__\layerRoles.test.ts`, `corepack pnpm run test:layer-roles`, `corepack pnpm run guard:ui-copy`, `corepack pnpm run lint`, `corepack pnpm run build`, and `corepack pnpm run smoke:edit-flow -- --port 4416 --report-dir D:\...\_tmp_codex_smoke\edit-flow-layer-role-token-20260713` passed.
- Smoke evidence: edit UI copy stayed clean, the nested input layer path reported role `control`, the container section reported `frame`, and existing flow/absolute drop plus before/inside/after checks still passed. The sandboxed smoke logged the same external-resource `ERR_NETWORK_ACCESS_DENIED` warnings seen in prior runs, with `pageErrors=[]` and overall pass.
- Claim boundary: layer-role truthfulness only. It does not change actual Roll20 renderer parity, asset relink state, or imported-sheet visual parity by itself.

## 2026-07-13 Asset Relink Plan Out-Dir

- Root cause: `scripts/roll20_asset_relink_verification_plan.mjs` supported the current asset relink policy, but it still wrote `asset-relink-verification-plan-results.*` and `asset-relink-map-template.txt` only into the canonical actual-run folder. That broke the safe rerun workflow when the canonical generated files were locked.
- Added `--out-dir <writable-report-dir>` to the script. The selected run directory remains the evidence source, while refreshed JSON/Markdown/template output can go to ignored temp folders.
- Added self-test coverage for both option orders: `--out-dir <dir> <run-dir>` and `<run-dir> --out-dir <dir>`.
- Live verification against `reports\roll20-actual-compare\2026-06-18-state-map-v1` now succeeds in both argument orders and reports the unchanged current blocker state: `RELINK_MAP_REQUIRED`, with `official-roll20-AW2E` and `yshy-commission-1bu` still `MISSING_RELINK`.
- Verification: `node --check scripts\roll20_asset_relink_verification_plan.mjs`, `corepack pnpm run test:roll20-asset-relink`, and both live temp-output commands passed.
- Server hygiene: no Next/smoke server was started. The only project-relevant listener is the existing Roll20 CDP Chrome on port `9222`, which was preserved.
- Claim boundary: diagnostic output isolation only. No asset was copied, relinked, uploaded, embedded, or committed; production renderer and Roll20 parity remain gated by asset relink and chat renderer evidence.

## 2026-07-13 Edit Canvas Before/After Drop Marker

- Root cause: canvas before/after dragover already set `data-r20-drop-mode`, but the visual cue lived on the target element itself. For small controls like inputs, that makes the intended insertion position harder to read than a Figma-like placement line.
- Added an edit-only Shadow DOM `data-r20-drop-position-marker="1"` overlay in `components/editor/EditCanvas.tsx`. Before/after targets now get a fixed-position blue line derived from the target rect; inside drops still use the container highlight. The marker is removed whenever the drop target is cleared, dropped, or drag-leaves the canvas.
- Extended `scripts/edit_flow_browser_smoke.mjs` so the canvas sibling insertion checks assert the marker mode, fixed positioning, width, and 3px height for both before and after dragover.
- Verification: `node --check scripts\edit_flow_browser_smoke.mjs`, `corepack pnpm run lint`, `corepack pnpm run build`, `corepack pnpm run guard:ui-copy`, `corepack pnpm run smoke:edit-flow -- --port 4414 --report-dir D:\...\_tmp_codex_smoke\edit-flow-canvas-drop-marker-20260713`, and `git diff --check` passed.
- Server hygiene: post-smoke `netstat` showed port `4414` only in `TIME_WAIT`; no project dev/smoke server remained. Port `9222` remains the active Roll20 CDP listener and was not stopped.
- Claim boundary: edit overlay affordance only. The emitted Roll20 sheet HTML/CSS is unchanged, and no actual Roll20 visual-parity evidence changed.

## 2026-07-13 Edit Canvas Persistent Container Affordance

- Root cause: layer rows exposed frame/flow/table container semantics, but the rendered edit canvas only highlighted containers during active widget drag. Users had to start dragging before they could see which sheet objects were safe container targets.
- Added subtle persistent edit-overlay outlines in `lib/preview/shadowMount.ts` for `[data-r20-can-drop="1"]` containers. Frame, flow, and table roles get different color hints. `.r20-selected` and `.r20-drop-target` remain higher-priority, so selected objects and active drop targets still read clearly.
- Extended `scripts/edit_flow_browser_smoke.mjs` to prove the overlay behavior. The smoke now checks that the generated section is a frame container, the selected outline is still solid, and the persistent container affordance becomes dashed with a non-empty inset shadow when selection is temporarily removed for measurement.
- Verification: `node --check scripts\edit_flow_browser_smoke.mjs`, `corepack pnpm run guard:ui-copy`, `corepack pnpm run lint`, `corepack pnpm run build`, `corepack pnpm run smoke:edit-flow -- --port 4413 --report-dir D:\...\_tmp_codex_smoke\edit-flow-persistent-affordance-20260713-r3`, and `git diff --check` passed.
- Server hygiene: post-smoke `netstat` showed ports `4411`, `4412`, and `4413` only in `TIME_WAIT`; no project dev/smoke server remained. Port `9222` remains the active Roll20 CDP listener and was not stopped.
- Claim boundary: edit overlay affordance only. No emitted Roll20 sheet HTML/CSS was changed, no actual Roll20 screenshot evidence was added, and renderer parity remains gated by the existing chat/asset blockers.

## 2026-07-13 Chat Asset/Paint Out-Dir

- Root cause: the chat asset preservation and browser-paint routing scripts still wrote only into the selected actual-run folder. That made quick reruns unsafe or brittle when canonical Roll20 evidence output files were locked, even though the scripts only needed to read the source evidence and write a refreshed diagnostic summary.
- Added `--out-dir <writable-dir>` to `scripts/roll20_chat_asset_preservation_plan.mjs` and `scripts/roll20_chat_browser_paint_plan.mjs`, matching the newer renderer/status/template-scope temp-output workflow.
- Live temp-output verification against `reports\roll20-actual-compare\2026-06-18-state-map-v1` kept the current decisions unchanged: asset plan `HOLD_RENDERER_FOR_ASSET_POLICY`; browser-paint plan `BROWSER_PAINT_BLOCKED_BY_RELINK`; AW2E/YSHY still require user-owned relink URLs before CSS or browser-paint conclusions.
- Verification: `node --check` for both scripts, `test:roll20-chat-assets`, `test:roll20-chat-browser-paint`, and both live `--out-dir` command shapes passed.
- Claim boundary: diagnostic output isolation only. No renderer CSS was promoted, no assets were relinked, and Roll20 visual parity remains unproven.

## 2026-07-13 Chat Asset Probe Fetch-Failure Preservation

- Root cause: after isolated refresh copied a canonical run, `diagnose:roll20-chat-background-assets` could still overwrite copied strong asset byte evidence with weaker `ASSET_FETCH_INCOMPLETE` if the current network/session could not fetch Roll20/Imgur background URLs.
- Added unchanged-URL evidence preservation in `scripts/roll20_chat_background_asset_probe.mjs`. When a fresh probe only has `ASSET_FETCH_INCOMPLETE`, but the previous report in the same run has strong byte evidence for the same local/actual/source URLs, the fixture keeps the previous decision and records `preservedFromPreviousProbe`, `freshFetchDecision`, and `preservedFetchFailureCount`.
- Self-test now covers three cases: normal browser-paint-ready asset bytes, placeholder detection, and preserving previous placeholder byte evidence only when URLs are unchanged.
- Live isolated refresh against `reports\roll20-actual-compare\2026-06-18-state-map-v1` produced `preservedFetchFailureCount=2`. AW2E/YSHY stayed `ASSET_BYTES_MATCH_BUT_SOURCE_PLACEHOLDER`, asset preservation stayed `SOURCE_ASSET_LOST_RELINK_REQUIRED`, and the template-scope gate stayed `HOLD_GLOBAL_CHAT_RENDERER_PATCH` with 9 blockers.
- Verification: `node --check scripts\roll20_chat_background_asset_probe.mjs`, `node scripts\roll20_chat_background_asset_probe.mjs --self-test`, and the live isolated full refresh passed.
- Claim boundary: evidence stability only. No assets were relinked, no renderer CSS was promoted, and Roll20 visual parity remains unproven.

## 2026-07-13 Chat Refresh Isolated Work Run

- Root cause: the full `diagnose:roll20-chat-refresh` chain cannot be made safe by passing only per-script `--out-dir`. Later diagnostics read earlier outputs from `runDir/<report>`, so isolated writes without an isolated read model can make downstream steps consume stale canonical reports.
- Added `--work-run-dir <empty-temp-run-dir>` to `scripts/roll20_chat_diagnostic_refresh.mjs`. The refresh now copies the source actual-run folder to an empty temp run, makes the copy writable, and runs every chat diagnostic step against the copy.
- Added `--self-test` for the isolated-copy guard. It verifies that a source run is copied, the marker file appears in the work run, and a non-empty work run is rejected instead of being silently merged or overwritten.
- Live isolated refresh passed against `reports\roll20-actual-compare\2026-06-18-state-map-v1` using `_tmp_codex_smoke\chat-refresh-isolated-run-final-20260713`. It left the canonical run untouched while producing a coherent temp-run chain.
- Current evidence from the isolated refresh still holds renderer work: `rendererReady=NO`, same-structure chat high mismatch `2/3`, max aligned mismatch `20.68%`, and `HOLD_PRODUCTION_RENDERER_PATCH`.
- Note: because this execution could not fetch the background asset URLs, the temp copy's background asset probe classified AW2E/YSHY as `FETCH_FAIL` / `RECAPTURE_ASSET_BYTES`. Treat that as current-run environment evidence, not a replacement for the canonical asset-placeholder evidence.
- Server hygiene: no project dev/smoke server was started. Port `9222` remains the existing Roll20 CDP listener.
- Claim boundary: diagnostic orchestration only. No renderer CSS was promoted and no Roll20 visual parity claim changed.

## 2026-07-13 Chat Candidate Isolated Output

- Root cause: `diagnose:roll20-chat-candidates` called `roll20_chat_parity_diagnostics.mjs` for each experimental screenshot set and wrote into the canonical `chat-parity-diagnostics` folder. In a locked Windows report folder this can fail; when it succeeds, the last candidate can temporarily replace the baseline parity report.
- Added `--out-dir <writable-report-dir>` to `roll20_chat_parity_diagnostics.mjs`, `roll20_chat_candidate_compare.mjs`, and `roll20_chat_row_raster_candidate_compare.mjs`. Candidate comparison now writes candidate parity probes under `parity-probes/<candidate>` whenever `--out-dir` is supplied.
- Live candidate comparison with temp output completed against `reports\roll20-actual-compare\2026-06-18-state-map-v1`. Current useful but unsafe result: `paint-dim-background` lowers YSHY aligned mismatch from `20.68%` to `19.06%`, but is rejected because it regresses another fixture and lacks asset/style proof.
- Live row-raster candidate comparison with temp output completed. Current AW2E result still rejects `aw2e-message-width-text-metrics`: AW2E row-weighted mismatch worsens from `17.93%` to `24.69%`, with worst-row delta worsening too.
- Server hygiene: no project dev/smoke server was started. Port `9222` remains the existing Roll20 CDP listener; no `3000`/smoke listener was present in the pre-check.
- Claim boundary: diagnostic isolation only. No product renderer CSS was changed, no assets were relinked, and Roll20 visual parity remains unproven.

## 2026-07-13 Template Scope Asset/Row-Raster Gate

- Root cause: `gate:roll20-chat-template-scope` only combined targeted plan, width reconciliation, renderer policy, candidate comparison, and style proof. Asset-preservation blockers and row-raster candidate regressions were visible in the top renderer gate, but not in the template-scope report where agents choose the next scoped chat model.
- Added `--out-dir <writable-report-dir>` to the template-scope gate so locked canonical report folders can still be read while refreshed JSON/Markdown output goes to ignored temp folders.
- Added asset-preservation and row-raster candidate evidence to the fixture table and promotion readiness decision. P0 fixtures with `SOURCE_ASSET_LOST_RELINK_REQUIRED` or row-raster regression now stay non-ready in this gate too.
- Live current result: `HOLD_GLOBAL_CHAT_RENDERER_PATCH` with 9 blockers. AW2E remains `.sheet-rolltemplate-aw` / `MESSAGE_CONTENT_TEXT_METRICS`, but its best candidate `aw2e-message-width-text-metrics` is held by `NOT_STYLE_PROVEN`, asset relink, and row-raster regression. YSHY remains `.sheet-rolltemplate-coc` / `TABLE_INTRINSIC_SANITIZE_FONT`, with asset relink and non-ready candidate blockers.
- Verification: `node --check scripts\roll20_chat_template_scope_gate.mjs`, `test:roll20-chat-template-scope`, two live `--out-dir` argument shapes, `lint`, `build`, and `git diff --check` passed.
- Server hygiene: no project dev/smoke server was started. Port `9222` remains the existing Roll20 CDP listener.
- Claim boundary: renderer diagnostic precision only. No production ChatPane CSS was promoted and no Roll20 visual parity claim changed.

## 2026-07-13 Renderer Diagnostics Out-Dir

- Root cause: `gate:roll20-renderer-action` and `plan:roll20-chat-renderer-targets` still wrote only inside the canonical Roll20 actual-run folder. When Windows locked those generated report files, the source evidence was readable but the renderer diagnostic refresh failed with `EPERM`.
- Added `--out-dir <writable-report-dir>` to both scripts. The run directory remains the evidence source, while JSON/Markdown output can be written to ignored temp folders.
- Live verification with the locked run succeeded through temp output folders in both argument orders:
  - `gate:roll20-renderer-action -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --out-dir ...\_tmp_codex_smoke\renderer-gate-outdir`
  - `gate:roll20-renderer-action -- --out-dir ...\_tmp_codex_smoke\renderer-gate-outdir-order reports\roll20-actual-compare\2026-06-18-state-map-v1`
  - `plan:roll20-chat-renderer-targets -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --out-dir ...\_tmp_codex_smoke\targeted-renderer-plan-outdir`
  - `plan:roll20-chat-renderer-targets -- --out-dir ...\_tmp_codex_smoke\targeted-renderer-plan-outdir-order reports\roll20-actual-compare\2026-06-18-state-map-v1`
- Current evidence boundary from those runs: renderer remains `HOLD_PRODUCTION_RENDERER_PATCH`, same-structure chat high mismatch is `2/3`, and max aligned mismatch is `20.68%`.
- Verification: `node --check` for both changed scripts, `test:roll20-chat-renderer-targets`, all four live `--out-dir` command shapes, `lint`, `build`, and `git diff --check` passed.
- Server hygiene: no project dev/smoke server was started. Port `9222` remains the existing Roll20 CDP listener; no `3000`/smoke server was present at the pre-check.
- Claim boundary: verification tooling only. No Roll20 parity claim changed.

## 2026-07-13 Roll20 Verification Out-Dir

- Root cause: `status:roll20-actual` and `preflight:roll20-cdp` always rewrote their summaries inside the canonical Roll20 run folder. When Windows locked those generated files, agents could still read the source evidence but could not refresh status or CDP readiness.
- Added `--out-dir <writable-report-dir>` to both scripts. The run directory remains the evidence source, while JSON/Markdown output can go to a temporary ignored folder.
- Live verification with the locked run succeeded through temp output folders:
  - `status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --out-dir D:\훙냥냥\마렌상\영시영 시트 고치기\_tmp_codex_smoke\actual-status-outdir`
  - `preflight:roll20-cdp -- --run-dir reports\roll20-actual-compare\2026-06-18-state-map-v1 --out-dir D:\훙냥냥\마렌상\영시영 시트 고치기\_tmp_codex_smoke\cdp-preflight-outdir`
- Current evidence boundary from those runs: renderer remains `HOLD_PRODUCTION_RENDERER_PATCH`, `rendererReady=NO`, same-structure chat high mismatch is `2/3`, max aligned mismatch is `20.68%`, and CDP is `READY` with `plannedFixtures=0`.
- Verification: `node --check` for both changed scripts, `test:roll20-cdp-preflight`, two `--out-dir` live command shapes for both scripts, `corepack pnpm run lint`, `corepack pnpm run build`, and `git diff --check` passed.
- Server hygiene: no Next/smoke server was started. Port `9222` remains the existing Roll20 CDP listener; `3000` was not listening.
- Claim boundary: verification tooling only. No Roll20 parity claim changed.

## 2026-07-13 Edit Layer Selection Path

- Root cause: the adapter already exposed `layerParentId`, but the edit layer panel did not render a selected object's ancestry path. Selecting a nested input could highlight the row/canvas object without showing which frame/container it belonged to.
- Added `buildLayerPath()` in `components/editor/EditCanvas.tsx` and rendered a compact `선택 위치` breadcrumb in the layer panel. Each breadcrumb item carries block id, role kind, and current-selection attributes, and clicking an ancestor selects that layer.
- Extended `scripts/edit_flow_browser_smoke.mjs` with `layerSelectionPath`, verifying a nested input selection renders a two-item path from the section/frame to the input.
- Verification: `node --check scripts\edit_flow_browser_smoke.mjs`, `git diff --check`, `corepack pnpm run lint`, `corepack pnpm run build`, `corepack pnpm run smoke:edit-flow -- --port 4406 --report-dir D:\훙냥냥\마렌상\영시영 시트 고치기\_tmp_codex_smoke\edit-flow-selection-path`, and `corepack pnpm run guard:ui-copy` passed.
- Server hygiene: `4406` had only `TIME_WAIT` entries after smoke, and `3000` was not listening. The remaining `9222` listener is the Roll20 CDP browser port from earlier actual-screen verification work.
- Claim boundary: edit-layer context usability only. No Roll20 renderer CSS was promoted and no actual Roll20 parity evidence changed.

## 2026-07-13 Edit Layer Auto-Scroll

- Added selection-driven auto-scroll to the edit layer panel. When the selected block changes, the virtualized layer panel now scrolls the selected row into view.
- Extended `scripts/edit_flow_browser_smoke.mjs` with `layerAutoScroll`: it imports 80 synthetic div layers, clicks the 80th rendered Shadow object, and verifies the matching layer row is rendered and visible after the layer panel scrolls.
- Verification: `node --check scripts\edit_flow_browser_smoke.mjs`, `corepack pnpm run lint`, `corepack pnpm run build`, `corepack pnpm run smoke:edit-flow -- --port 4405 --report-dir D:\훙냥냥\마렌상\영시영 시트 고치기\_tmp_codex_smoke\edit-flow-autoscroll`, `corepack pnpm run guard:ui-copy`, and `git diff --check` passed.
- Server hygiene: checked port `4405` after the smoke run; only `TIME_WAIT` entries remained, not a listening server.
- Claim boundary: edit navigation UX only. No actual Roll20 renderer evidence changed.

## 2026-07-13 Edit Canvas-to-Layer Selection

- Added a row-level selected data attribute to the edit layer panel and extended the browser smoke to click a rendered Shadow DOM section, then verify the matching layer row is selected.
- Current verified bidirectional selection shape:
  - Layer row click -> rendered Shadow object receives `.r20-selected`.
  - Rendered Shadow object click -> matching layer row exposes `data-r20-layer-selected="1"`.
- Verification: `node --check scripts\edit_flow_browser_smoke.mjs`, `corepack pnpm run lint`, `corepack pnpm run build`, and `corepack pnpm run smoke:edit-flow -- --port 4403` passed.
- Claim boundary: edit-mode UX only. It does not change actual Roll20 visual evidence.

## 2026-07-13 Edit Layer Selection Sync

- Found a concrete edit UX wiring gap: `EditCanvas` mounted a Shadow selection API, but layer-row selection changes were not pushed back into the Shadow DOM. A layer row could become selected without the actual rendered sheet object showing the orange `.r20-selected` outline.
- Wired `EditCanvas` to the shared `workspaceStore.selectedBlockId` / `selectionOrigin` flow, matching the PreviewMain pattern. Layer row clicks now highlight the real Shadow object; object clicks in the edit canvas now update the shared selected block id.
- Extended `scripts/edit_flow_browser_smoke.mjs` with `layerSelectionSync`, which clicks a nested input layer row and verifies the Shadow DOM object receives `.r20-selected`.
- Verification: `node --check scripts\edit_flow_browser_smoke.mjs`, `corepack pnpm run lint`, `corepack pnpm run build`, and `corepack pnpm run smoke:edit-flow -- --port 4402` passed.
- Claim boundary: edit UX selection pairing only. No Roll20 renderer parity or actual-screen evidence changed.

## 2026-07-13 Layer Search Context

- Improved the edit layer panel so search keeps ancestor context. A nested input search now shows both the matching child and its parent container instead of hiding the frame that explains where the child lives.
- Added row-level search/context attributes plus a visible `상위 맥락` badge and depth guide, then extended `scripts/edit_flow_browser_smoke.mjs` to verify the behavior through the browser.
- Verification: `node --check scripts\edit_flow_browser_smoke.mjs`, `git diff --check`, `corepack pnpm run lint`, `corepack pnpm run build`, `corepack pnpm run smoke:edit-flow -- --port 4401`, and `corepack pnpm run guard:ui-copy` passed.
- Claim boundary: edit-layer UX only. This does not change Roll20 actual-screen parity or renderer readiness.

## 2026-07-13 Layer Self-Drop Affordance

- Tightened the edit layer panel so a row does not display a before/inside/after drop affordance when the dragged layer is hovering over itself.
- Rerun `scripts/edit_flow_browser_smoke.mjs` after this change to guard the existing before/inside/after checks for valid target rows. A browser-synthetic self-drag assertion was not kept because it produced stale-event noise outside the real drag-start path.
- Claim boundary: this is edit UX truthfulness only. It does not alter Roll20 renderer parity.

## 2026-07-13 Current Status Snapshot Refresh

- Refreshed `docs/qa/38_current_project_status.md` from the current `status:roll20-actual`, renderer gate, template-scope gate, browser-paint plan, and runtime visibility bundle.
- Updated the main progress estimate: local edit/drop UX `58-68%`, local preview/edit sync `~70%`, actual Roll20 sheet-root reproduction `60-70%`, actual Roll20 chat/rolltemplate reproduction `40-50%`, and whole user-ready goal `45-55%`.
- Added a superseding note to `docs/qa/34_requirements_gap_matrix.md` so older historical `2/6` or `4/6` chat-capture counts are not mistaken for the current state.
- Current truth: generated actual screenshots/diffs are `6/6` and authoritative, but renderer remains `HOLD_PRODUCTION_RENDERER_PATCH` because same-structure chat mismatch remains high for `2/3` fixtures, AW2E/YSHY need asset relink, and global ChatPane CSS is unsafe.

## 2026-07-13 Runtime Visibility Verification Bundle

- Added `scripts/roll20_runtime_visibility_verify.mjs` and package alias `verify:runtime-visibility`.
- Purpose: make the user's "script/worker/rolltemplate must not show in preview/edit" requirement repeatable as one local gate instead of scattered manual commands.
- The bundle runs worker workspace separation, worker state smoke, sandbox expected-preview runtime stripping, preview/edit visual runtime-node checks, and local rolltemplate chat smoke.
- Focused verification immediately before adding the wrapper passed: `smoke:worker`, `smoke:worker-state`, `smoke:roll20-sandbox-preview:all`, `smoke:preview-edit-visual`, and direct `rolltemplate_chat_smoke.mjs`.
- Evidence boundary: this is local app/runtime evidence. Actual Roll20 Sandbox/test-room root and chat screenshots are still required before any visual-parity or renderer-ready claim.

## 2026-07-13 Edit Mode Flow + Imported Sync Recheck

- Re-ran the current edit UX smoke after the browser-paint routing batch to prove the visual editor path still works.
- `smoke:edit-flow -- --port 4384` passed. The smoke covered widget flow nesting, absolute placement, layer-panel drop modes, non-leaf group reorder, absolute placement inside frames, stable post-drop coordinates with zero drift, and sheet/rolltemplate canvas width controls.
- `smoke:imported-edit-sync -- --port 4385` passed for AW2E, Les-Oublies, YSHY 1BU, and a synthetic non-leaf flow fixture. Each covered fixture reported edit/preview coordinate agreement for the moved imported block plus resource PASS.
- `guard:ui-copy` passed; current edit-mode Korean copy is clean in the smoke sample.
- Claim boundary: local edit/preview sync evidence only. Actual Roll20 visual parity and Sandbox upload parity remain held by the existing renderer/asset blockers.

## 2026-07-13 Browser Paint Plan Routing

- Added `scripts/roll20_chat_browser_paint_plan.mjs`, a diagnostic-only planner for the next browser paint/decode investigation after chat asset and raster evidence is refreshed.
- The planner classifies fixture work as blocked by asset relink, ready for browser paint context probing, proxy/cache bytes first, recapture first, or secondary/no-background-image.
- Wired the planner into `diagnose:roll20-chat-refresh` after `plan:roll20-chat-assets` and before renderer gates, so refresh output keeps asset policy, flat-paint evidence, and renderer hold decisions in the same chain.
- Expected current result: AW2E and YSHY stay blocked by asset relink while placeholder assets are still the evidence source; production renderer CSS remains held.
- Claim boundary: this is evidence routing only. It does not provide hosted assets, upload to Roll20, change the ChatPane renderer, or prove Roll20 visual parity.

## 2026-07-13 Asset Probe Flat-Paint Decision Bridge

- Updated `diagnose:roll20-chat-background-assets` so the new flat-paint/color raster decision routes to `ASSET_BYTES_MATCH_BROWSER_PAINT_NEXT` when asset bytes are healthy.
- Updated `plan:roll20-chat-assets` so `FLAT_PAINT_SOURCE_OR_BROWSER_COLOR_MODEL_REQUIRED` keeps CSS held under `BROWSER_PAINT_CONTEXT_REQUIRED` after assets are relinked.
- Added self-test coverage for both scripts. Current real evidence still lands on `SOURCE_ASSET_LOST_RELINK_REQUIRED` for AW2E and YSHY because the fetched source/proxy image is the `503b png 161x81 removed.png` placeholder.
- Verification: background asset self-test, asset preservation self-test, current asset probe, current asset plan, and renderer action gate passed.
- Claim boundary: evidence routing only. No asset files, screenshots, or production renderer CSS changed.

## 2026-07-13 Background Raster Flat-Paint Classification

- Updated `diagnose:roll20-chat-background-raster` so the report no longer collapses row-compositing evidence into a vague source/browser-paint bucket.
- The report now carries edge, flat-paint, local-darker, local-brighter, chroma, and worst-row details from `chat-row-compositing-probe`.
- Current AW2E and YSHY chat evidence routes to `FLAT_PAINT_SOURCE_OR_BROWSER_COLOR_MODEL_REQUIRED`: both are `100%` flat-paint mismatch, `0%` edge mismatch, and only weakly affected by virtual luma correction.
- Verification: `test:roll20-chat-background-raster`, syntax check, current `diagnose:roll20-chat-background-raster`, and `gate:roll20-renderer-action` passed.
- Claim boundary: this improves the next investigation path only. Renderer remains held and no product CSS was promoted.

## 2026-07-13 Targeted Renderer Plan Row-Raster Precision

- Fixed `plan:roll20-chat-renderer-targets` so it reads `worstRows[0]` and `summary` from `chat-row-raster-probe` instead of looking for a non-existent `worstRow` field.
- The targeted plan now preserves row-raster/luma details in fixture blockers and evidence: AW2E `weighted 17.93%, worst row 1 26.28%, luma -66.819`; YSHY `weighted 21.41%, worst row 5 27.73%, luma -35.682`.
- Added self-test coverage so AW2E row-raster blocker text must include the concrete worst-row signal.
- Verification: `test:roll20-chat-renderer-targets`, `node --check scripts\roll20_chat_targeted_renderer_plan.mjs`, regenerated `plan:roll20-chat-renderer-targets`, and `gate:roll20-renderer-action` passed.
- Claim boundary: diagnostic handoff only. Renderer remains held and no production CSS was promoted.

## 2026-07-13 CDP Preflight No-Plan Renderer-Hold Split

- Updated `preflight:roll20-cdp` so a READY CDP browser with `plannedFixtures=0` no longer tells agents to recapture blindly.
- The preflight report now includes a current actual-evidence snapshot from `actual-verification-status`, including generated screenshots/diffs, trusted full-root count, renderer action, renderer readiness, blocker count, and same-structure chat mismatch count.
- When current evidence is already captured but renderer readiness is still `NO`, the next action points to renderer/template/asset diagnostics from `gate:roll20-renderer-action`. Passing `--fixture` still prints the explicit sheet-frame probe and chat capture commands for intentional fresh capture.
- Verification: `test:roll20-cdp-preflight`, `node --check scripts\roll20_cdp_preflight.mjs`, and live `preflight:roll20-cdp -- --run-dir reports\roll20-actual-compare\2026-06-18-state-map-v1` passed.
- Claim boundary: this is handoff safety only. Product rendering and Roll20 visual parity remain unchanged.

## 2026-07-13 Asset Relink Roll20-Ready Target Split

- Added `summarizeAssetReplacementReadiness()` so replacement maps report how many active target URLs are Roll20-ready `http(s)` versus local-only (`data:` or relative path).
- Export asset replacement UI now displays the Roll20-ready target count and a warning when a map can prove local preview/edit plumbing but is not suitable for Roll20 Sandbox upload.
- Browser smoke now verifies the synthetic data-URL relink map reports `localOnlyTargets=1` and `roll20ReadyTargets=0`.
- Verification: `test:asset-replacements`, `test:asset-refs`, `guard:ui-copy`, `build`, and `smoke:export-dialog -- --port 4383` passed.
- Claim boundary: this prevents confusing local-only relink checks with actual Roll20 upload readiness. It does not relink real assets or prove visual parity.

## 2026-07-13 Roll20 Proxy Source Relink Draft

- Improved import asset preflight so each Roll20 proxy ref can carry its decoded `src` URL as `proxySourceRef` plus a `replacementRefs` candidate list.
- The import-side "asset replacement draft" now emits commented replacement lines for both the full Roll20 proxy URL and the decoded source URL, deduped across the sheet.
- This addresses the current AW2E/YSHY asset blocker shape: Roll20 proxy/local/actual bytes can match while the original source resolves to a placeholder, so users need exact URL-text candidates for user-owned rehosting before Sandbox re-comparison.
- Verification: `test:asset-refs`, `test:asset-replacements`, `guard:ui-copy`, and `smoke:export-dialog -- --port 4382` passed. The browser smoke confirms `importAssetDraft.hasSourceUrl=true`.
- Claim boundary: product UX/verification readiness only. No asset files are committed, no Roll20 upload happens, and visual parity remains unproven.

## 2026-07-13 Chat Renderer Target Plan Command Sharpening

- Updated `plan:roll20-chat-renderer-targets` so its next commands follow the current split evidence instead of sending agents back through generic candidate runs.
- AW2E now points first at asset relink coverage, message shell, table-width budget, and font/glyph diagnostics for the `.sheet-rolltemplate-aw` text-metric/message-width model.
- YSHY now points first at asset relink coverage, table intrinsic, overflow/crop, intrinsic width, font/glyph, and font-intrinsic diagnostics for the CoC/YSHY table/sanitize model.
- Verification: `node scripts\roll20_chat_targeted_renderer_plan.mjs --self-test` and `plan:roll20-chat-renderer-targets -- reports\roll20-actual-compare\2026-06-18-state-map-v1`.
- Claim boundary: this is orchestration only. Production renderer remains `HOLD_PRODUCTION_RENDERER_PATCH`; no visual parity claim changed.

## 2026-07-13 Asset Map Preupload Pipeline

- Added a shared script-side asset replacement helper for local verification tooling.
- `roll20_actual_local_baseline.mjs` now accepts `--asset-map-file <local-map.txt>` and applies the same URL-text relink map to local preview/edit render state and emitted Roll20 upload payload HTML/CSS.
- `verify:roll20-preupload` now forwards `--asset-map-file` into the regenerated local baseline and records the map path in the preupload report.
- Hardened `roll20_state_selector_audit.mjs` and `roll20_asset_resource_audit.mjs` so Windows UTF-8 BOM-prefixed `manifest.json`/source files do not crash the gate.
- Synthetic local-only verification: `.tmp\asset-map-fixtures\asset-map-pipe-smoke` plus `.tmp\asset-map-pipe-smoke.txt` produced 2 actual payload URL replacements, then `verify:roll20-preupload` passed all checks including payload audit, Sandbox sanitize audit, payload roundtrip, state selectors, asset audit, and evidence guard.
- Current real evidence boundary: `plan:roll20-asset-relink -- reports\roll20-actual-compare\2026-06-18-state-map-v1` still reports `RELINK_MAP_REQUIRED` for AW2E/YSHY. The pipeline is connected, but the user still needs user-owned HTTP(S) replacement URLs before Roll20 Sandbox re-comparison or visual parity claims.
- Claim boundary: this proves local/preupload relink plumbing with copyright-safe synthetic URLs only. It does not rehost assets, upload to Roll20, or prove Roll20 visual parity.

## 2026-07-13 Asset Relink Map Template

- Extended `plan:roll20-asset-relink` so every run writes an ignored `asset-relink-map-template.txt` beside the JSON/Markdown report.
- The template lists unresolved asset blockers as commented `old URL => <paste-user-owned-https-url-here>` rules, using source/proxy candidate URL text only. It stays inert until the placeholder is replaced with a user-owned HTTP(S) target and the comment marker is removed.
- Current run: `plan:roll20-asset-relink -- reports\roll20-actual-compare\2026-06-18-state-map-v1` still reports `RELINK_MAP_REQUIRED` for AW2E/YSHY and now generates 6 candidate replacement-rule lines under the ignored report folder.
- Verification: `node --check scripts\roll20_asset_relink_verification_plan.mjs`, `test:roll20-asset-relink`, the current run plan command, `guard:roll20-evidence -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `git diff --check`, `lint`, and `build`.
- Claim boundary: this reduces relink handoff ambiguity. It does not host assets, apply a map, upload to Roll20, or prove visual parity.

## 2026-07-13 Asset Relink Autosave Persistence

- Persisted the shared local-only asset replacement map into the combined IndexedDB autosave/manual-save XML as preview metadata.
- Restoring from the autosave banner now restores the map into `previewStore`, so preview iframe, edit Shadow render, and export keep using the same relink text after reload.
- Hardened `smoke:export-dialog` so it saves a synthetic relink map, confirms the XML contains `<asset-replacement-map>`, reloads, restores autosave, and verifies the map is back in `previewStore`.
- Verification: `node --check scripts\export_dialog_browser_smoke.mjs`, `test:asset-refs`, `test:asset-replacements`, `lint`, `build`, `smoke:export-dialog -- --port 4370`, `git diff --check`, and `guard:roll20-evidence -- reports\roll20-actual-compare\2026-06-18-state-map-v1`.
- Claim boundary: this preserves user relink work across reloads. It does not prove actual Roll20 visual parity; Sandbox/test-room comparison still needs fresh evidence after assets are relinked/rehosted.

## 2026-07-13 Asset Preservation Plan Wording Sync

- Updated `plan:roll20-chat-assets` so dead-source asset blockers now direct agents/users to the implemented local-only asset replacement map, then local preview/edit/export and Roll20 Sandbox comparison.
- The plan no longer says the user-facing relink path still needs to be built; it records the implemented local-map/autosave-restore status in product requirements.
- Verification: `test:roll20-chat-assets`, `plan:roll20-chat-assets -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, and `node --check scripts\roll20_chat_asset_preservation_plan.mjs`.
- Claim boundary: this is evidence-routing cleanup. It does not relink the dead third-party assets and does not make `rendererReady` pass.

## 2026-07-13 Renderer Gate Asset Policy Link

- Wired `gate:roll20-renderer-action` to read `chat-asset-preservation-plan-results.json` alongside the chat/background diagnostics.
- The renderer gate now emits an explicit blocker when asset preservation says renderer CSS must stay held. Current evidence reports AW2E and YSHY source/proxy image paths resolving to a placeholder, so the gate routes next work to the local-only asset replacement map and a fresh local preview/edit/export plus Roll20 Sandbox comparison.
- Verification: `node --check scripts\roll20_renderer_action_gate.mjs`, `plan:roll20-chat-assets -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, and `gate:roll20-renderer-action -- reports\roll20-actual-compare\2026-06-18-state-map-v1`.
- Claim boundary: this prevents a false CSS promotion path. It does not relink assets, create new Roll20 screenshots, or prove visual parity.

## 2026-07-13 Asset Replacement Profiles

- Added named local-only asset replacement profiles to the export dialog. Users can save the current `old URL => new URL` relink text under a sheet-specific name, reload it later, or delete it.
- Profiles are stored as replacement-map text only, never image/font bytes, and are persisted in the combined IndexedDB autosave/manual-save XML under preview metadata.
- Restore now brings back both the active replacement map and the saved profile list. The browser smoke verifies a synthetic profile is created, saved into XML, and restored after reload.
- Verification: `node --check scripts\export_dialog_browser_smoke.mjs`, `lint`, `build`, and `smoke:export-dialog -- --port 4371`.
- Claim boundary: this improves repeated relink verification UX. It does not supply replacement assets and does not make Roll20 visual parity pass.

## 2026-07-13 Asset Relink Verification Gate

- Added `plan:roll20-asset-relink` to check whether a local-only replacement-map text file covers the current asset-preservation blockers before agents proceed to Roll20 Sandbox re-comparison.
- The gate separates `MISSING_RELINK`, `COVERED_LOCAL_ONLY`, and `COVERED_ROLL20_READY`, so data URL targets can prove local preview/edit plumbing without being mistaken for Roll20-upload-ready hosted assets.
- Current run without a map reports `RELINK_MAP_REQUIRED` for AW2E and YSHY. A temporary ignored smoke map classified AW2E as Roll20-ready through an HTTP(S) target and YSHY as local-only through a data URL target.
- Verification: `node --check scripts\roll20_asset_relink_verification_plan.mjs`, `test:roll20-asset-relink`, `plan:roll20-asset-relink -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, and a temporary `.tmp` map smoke.
- Claim boundary: this is a readiness gate for the next Sandbox comparison. It does not host assets, upload to Roll20, or prove visual parity.

## 2026-07-13 Asset Map Export Bridge

- Added copy and txt-save controls to the export dialog's local-only asset replacement map panel.
- The downloaded text contains only the user's `old URL => new URL` rules and can be passed directly to `corepack pnpm run plan:roll20-asset-relink -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --map-file <file>`.
- Browser smoke now verifies that those controls exist and are enabled after a synthetic relink map is restored from autosave, while preview iframe and edit Shadow render still consume the same replacement map.
- Verification: `node --check scripts\export_dialog_browser_smoke.mjs`, `test:asset-replacements`, `test:roll20-asset-relink`, `guard:ui-copy`, `lint`, `build`, and `smoke:export-dialog -- --port 4381`.
- Claim boundary: this bridges product UI to the relink gate. It does not provide user-owned hosted assets and does not make Roll20 visual parity pass.

## 2026-07-12 Targeted Chat Candidate Results

- Ran the target-plan smoke candidates. All local smoke runs passed, but candidate comparison rejects them as renderer fixes: AW2E `aw2e-text-metrics` is `no-meaningful-gain` with AW2E aligned delta `+0.1%`; YSHY `yshy-sanitize-typography` regresses with YSHY aligned delta `+14.95%`; YSHY `coc-table-intrinsic-clamp` is `no-meaningful-gain` with delta `0%`.
- Updated `scripts/roll20_chat_targeted_renderer_plan.mjs` so tried-and-rejected candidates are recorded as blockers and the next commands move toward row/background/source diagnostics instead of repeating the same smoke runs.
- Additional diagnostics now point beyond simple CSS: background declarations match but raster differs for AW2E/YSHY, row raster remains high (`26.28%` AW2E worst row, `27.73%` YSHY worst row), and background asset probes report matching local/actual bytes against a Roll20 `removed.png` placeholder source.
- Boundary: production renderer remains held. The next practical investigation is asset preservation/proxy/browser-paint behavior, not global ChatPane width/font/padding CSS.

## 2026-07-12 Targeted Chat Renderer Plan

- Added `scripts/roll20_chat_targeted_renderer_plan.mjs` plus package aliases `plan:roll20-chat-renderer-targets` and `test:roll20-chat-renderer-targets`.
- Purpose: convert the current Roll20 actual chat evidence into scoped next experiments and keep production renderer changes held while fixture axes conflict.
- Verification: `test:roll20-chat-renderer-targets` passed. Running `plan:roll20-chat-renderer-targets -- reports\roll20-actual-compare\2026-06-18-state-map-v1` reports `HOLD_PRODUCTION_RENDERER_PATCH`, 4 blockers, AW2E `18.03%` as `AW2E_TEMPLATE_SCOPED_TEXT_METRICS`, Les `6.34%` as `KEEP_DEFAULT`, and YSHY `20.68%` as `COC_TABLE_INTRINSIC_AND_SANITIZE_MODEL`.
- Boundary: this is a planning/guardrail improvement, not a product renderer parity fix. Next work should run the exact targeted smoke/candidate commands written under the ignored `chat-targeted-renderer-plan` report.

## 2026-07-12 Les Same-Template Capture Handoff

- `plan:roll20-chat-capture` now reads `chat-structure-compare` and treats structure mismatch as a recapture reason. For Les-Oublies, the target is explicit: `roll_initiative` should render `sheet-rolltemplate-initiative-roll`.
- `preflight:roll20-cdp` now reuses the capture plan's exact command instead of reconstructing a generic capture command, so the preflight output preserves `--roll-button roll_initiative`.
- `capture:roll20-chat-cdp` now checks requested `--roll-button` against the saved sheet-frame evidence before clicking. This caught the current live state: the open `Witrav Upijek` iframe did not contain `roll_initiative`, so the capture stopped before generating misleading chat evidence.
- Boundary: this still has not recaptured Les-Oublies. It prevents another wrong-template capture and shows the next manual/browser step: load the intended Les fixture state, prove `roll_initiative` in the sheet iframe, then capture.

## 2026-07-12 Structure-Aware Roll20 Status/Gate

- Refined the post-capture status layer so raw chat pixel mismatch and same-structure renderer evidence are no longer conflated.
- `status:roll20-actual` now prints both the raw max aligned chat mismatch (`54.1%`, still including the wrong-template Les-Oublies capture) and the same-structure max aligned mismatch (`20.68%`, AW2E/YSHY only).
- `gate:roll20-renderer-action` now excludes structure-mismatched fixtures from the same-structure renderer mismatch blocker while still keeping a separate blocker that requires Les-Oublies same-template recapture.
- Boundary: this is evidence interpretation hardening. It does not change Roll20 capture data, local ChatPane CSS, or actual visual parity.

## 2026-07-12 Roll20 Chat Structure Gate

- Root cause found: the largest current Les-Oublies chat mismatch was comparing different rendered rolltemplates. Local smoke clicked `roll_initiative` and rendered `sheet-rolltemplate-initiative-roll`, while the actual Roll20 sidecar selected `sheet-rolltemplate-classic-roll`.
- Added `scripts/roll20_chat_structure_compare.mjs` and package alias `diagnose:roll20-chat-structure` to compare local chosen roll/template, actual selected template, row signatures, and table text before CSS interpretation.
- Integrated the structure report into `scripts/roll20_renderer_action_gate.mjs` and `scripts/roll20_chat_diagnostic_refresh.mjs`. The gate now blocks renderer CSS promotion with a same-template recapture instruction when structure mismatch exists.
- Verification: `diagnose:roll20-chat-structure` reports AW2E and YSHY as `STRUCTURE_MATCH`; Les-Oublies is `TEMPLATE_CLASS_MISMATCH` (`initiative-roll` local vs `classic-roll` actual, rows `3/5`). `gate:roll20-renderer-action` now surfaces that mismatch as a blocker and keeps `HOLD_PRODUCTION_RENDERER_PATCH`.
- Boundary: this does not fix ChatPane rendering and does not prove Roll20 parity. It prevents a false renderer conclusion and makes the next Roll20 capture target concrete.

## 2026-07-12 AW2E Chat Width Hypothesis Check

- Investigated the AW2E chat mismatch before changing production renderer CSS. Root-cause hypothesis: local ChatPane was 12px narrower than actual Roll20 (`328/267` local chat/template vs `340/279` actual) and AW2E table text metrics differed at `13px` local vs `13.65px` actual.
- Generated fresh AW2E-only local chat screenshots for default, `aw2e-font-size-only`, and combined `aw2e-message-width-font-size`.
- Added `aw2e-message-width-font-size` as a diagnostic-only candidate in `scripts/roll20_chat_candidate_compare.mjs` / `scripts/roll20_chat_candidate_style_proof.mjs`, and documented the smoke command in `scripts/README.md`.
- Result: combined width+font improved raw AW2E crop mismatch from `26.9%` to `18.46%` and removed the `8,0` alignment offset, but best-aligned mismatch is still worse than default (`18.46%` vs `18.03%`) and coverage is only `1/3`. Candidate is correctly classified as `fixture-local-incomplete-coverage`.
- Boundary: production renderer remains held. Next AW2E work should inspect row/background/crop context or exact source/text model instead of promoting the width+font candidate.

## 2026-07-12 Roll20 Chat Diagnostic Refresh

- Added `scripts/roll20_chat_diagnostic_refresh.mjs` and package alias `diagnose:roll20-chat-refresh` to rerun the Roll20 chat diagnostic chain from a single current evidence set after actual chat recaptures.
- Ran the refresh against `reports\roll20-actual-compare\2026-06-18-state-map-v1`; it completed and regenerated parity/current-metrics/style/candidate/width/message/table/row/background/reconciliation reports plus the renderer action gate.
- Current verified evidence remains complete but not visually matching: generated actual screenshots `6/6`, generated diffs `6/6`, authoritative generated evidence `YES`, chat capture suspects `0`, current metrics `3/3`, renderer action `HOLD_PRODUCTION_RENDERER_PATCH`.
- Fresh split:
  - AW2E: `CHAT_MESSAGE_CONTENT_WIDTH`, aligned mismatch `18.03%`.
  - Les-Oublies: `NEW_NARROW_MODEL_REQUIRED`, aligned mismatch `54.1%`; current CSS candidates are not safe enough and row/text structure needs a narrower probe.
  - YSHY 1BU: `TABLE_SCROLL_INTRINSIC`, aligned mismatch `20.68%`.
- Boundary: this is better truth maintenance and renderer triage, not a visual parity fix. The production renderer remains held.

## 2026-07-12 AW2E Actual Roll20 Chat Recapture

- Reapplied `official-roll20-AW2E` only to the dedicated Roll20 Custom Sheet Sandbox/test-room (`21639681`) with the guarded settings-page endpoint fallback. The page saved successfully and reported no translation or editor parse error.
- Reopened the sandbox character through `open:roll20-character-cdp`; `probe:roll20-sheet-frame -- --fixture official-roll20-AW2E` saved positive iframe DOM evidence with `VISIBLE_MATCH`, `sheetHitCount=92`, `rootCount=3`, `attrCount=486`, and `rollButtonCount=13`.
- `capture:roll20-chat-cdp -- --fixture official-roll20-AW2E` captured a fresh foreground Roll20 chat PNG/sidecar pair. The AW2E chat crop now enters the screenshot diff and chat-parity diagnostics.
- Fixed CDP page selection in the open/probe/capture helpers so exact `/editor` pages win over `/editor/character/...` popout targets. This closes a false-negative path where probes could inspect an empty character popout shell while the real VTT editor was open.
- Latest status: `generatedActualScreenshots=6/6`, `generatedDiffed=6/6`, `generatedAuthoritative=YES`, `chatCaptureSuspects=0`, `chatNormalizedCompared=3/3`, `chatNeedsNormalizedCapture=0`. Renderer still remains `HOLD_PRODUCTION_RENDERER_PATCH` because all three normalized Roll20 chat crops differ materially from local ChatPane.

## 2026-07-12 YSHY Actual Roll20 Chat Recapture

- Used the dedicated Roll20 Custom Sheet Sandbox/test-room editor only. No existing real rooms or private campaign settings were modified.
- Opened the sandbox character through Roll20's internal `Campaign.characters` viewer path after ordinary visible journal clicking failed to expose the iframe.
- `probe:roll20-sheet-frame -- --fixture yshy-commission-1bu` saved positive iframe DOM evidence: `VISIBLE_MATCH`, `sheetHitCount=65`, `rootCount=3`, `attrCount=1069`, and `rollButtonCount=808`.
- The first chat capture attempt correctly failed as `FOREGROUND_SUSPECT` because the open character dialog overlapped the right-side chat panel. Closing the character dialog and rerunning `capture:roll20-chat-cdp -- --fixture yshy-commission-1bu --skip-click` saved fresh foreground `roll20-chat.png` and `roll20-chat-dom-evidence.json`.
- Added `scripts/roll20_character_cdp_open.mjs` and package alias `open:roll20-character-cdp` to make the repeatable sequence explicit: open character -> probe sheet iframe -> click/capture chat -> close character if it overlaps chat.
- Verification so far: screenshot diff now includes YSHY chat (`42.73%` mismatch), chat parity compares 2/3 fixtures, and evidence guard passes. Overall actual status is now `generatedActualScreenshots=5/6`, `generatedDiffed=5/6`; AW2E chat is still missing and renderer remains HOLD.

## 2026-06-21 AW2E Live Roll20 Chat Observation

- Used the logged-in `Codex Roll20 Verify | Roll20` editor tab only; no existing room settings, sheet source, character data, or campaign configuration were edited.
- Opened the `Yadunka Esowhaz` character viewer and verified AW2E sheet iframe content through read-only browser access: `sheetCount=3`, `attrCount=486`, `rollCount=13`, and visible Playbook/Hardholder text.
- Clicked the AW2E `roll_dsuf` roll button and submitted Roll20's `Macro Options` modal with the default value. The Roll20 chat DOM then contained a new `.sheet-rolltemplate-aw` card, and foreground hit-testing returned TABLE/TH/TD hits inside the selected template.
- Capture boundary: the Chrome extension screenshot path still produced JPEG bytes and did not include the visible right-side text chat panel in the saved page screenshot. A trial crop captured Roll20 UI/Sandbox Tools instead of the rolltemplate, so it was removed and not promoted as `roll20-chat.png`.
- Tooling hardening: `scripts/roll20_chrome_observation_audit.mjs` now accepts screenshot folders containing `roll20-chat-dom-evidence.json` and flags `roll20-chat-page`-only captures as observation-only.
- Next P0: use a CDP-capable tab or a separately verified full-screenshot crop adapter before writing canonical `roll20-chat.png` for AW2E/YSHY.

## 2026-06-21 Roll20 Chat Recapture Handoff Ordering

- Updated `scripts/roll20_chat_capture_plan.mjs` so each planned chat recapture includes `sheetFrameEvidence`, `sheetFrameProbeCommand`, and `chatCaptureCommand`.
- The generated chat capture Markdown now shows the required `roll20-sandbox-dom-evidence.json` target and explicitly tells agents to run `probe:roll20-sheet-frame` before `capture:roll20-chat-cdp`.
- Updated `scripts/roll20_chat_current_handoff.mjs` so the current-metrics handoff table includes the sheet-frame probe and gated chat capture commands for stale fixtures.
- Updated `scripts/roll20_upload_handoff.mjs` so the upload order inserts sheet-frame probing before root/chat evidence capture.
- Verification: `node --check` for the three changed handoff/plan scripts, `test:roll20-chat-capture-plan`, `handoff:roll20-chat-current`, and `handoff:roll20-upload -- ... official-roll20-AW2E --missing-only` passed.

## 2026-06-21 Roll20 Chat Capture Sheet-Frame Gate

- Hardened `scripts/roll20_chat_cdp_capture.mjs` so actual chat capture now requires positive `roll20-sandbox-dom-evidence.json` from `probe:roll20-sheet-frame` before clicking a roll button or saving `roll20-chat.png`.
- The gate rejects missing evidence, wrong fixture ids, non-`VISIBLE_MATCH` statuses, and generic root/body-only evidence that does not contain expected generated sheet markers.
- Successful chat sidecars now record a summary of the sheet-frame evidence used for that capture, tying future `roll20-chat.png` evidence back to the loaded character-sheet iframe.
- Verification: `node --check scripts\roll20_chat_cdp_capture.mjs`, `test:roll20-chat-cdp-readiness`, and `capture:roll20-chat-cdp --plan-only` for AW2E passed.
- Current environment still has no CDP endpoint at `127.0.0.1:9222`; dry-run correctly reports `BLOCKED_CDP_ENDPOINT`.

## 2026-06-21 Roll20 Sheet Frame DOM Evidence Tool

- Added `scripts/roll20_sheet_frame_probe.mjs` and package aliases `probe:roll20-sheet-frame` / `test:roll20-sheet-frame-probe`.
- The probe connects to a CDP-enabled Roll20 Sandbox/test-room page, searches all frames, and saves `roll20-sandbox-dom-evidence.json` only when the frame contains expected generated payload markers.
- Self-test guards that expected fixture hits outrank generic Roll20 roots, so the tool should not create false-positive evidence for the wrong sheet iframe.
- Current desktop state has no CDP endpoint at `127.0.0.1:9222`; the probe dry-run correctly reports `BLOCKED_CDP_ENDPOINT`.
- Used the logged-in Chrome MCP path as an observation fallback, opened the dedicated Roll20 editor/test character, and rechecked AW2E iframe evidence: `rootCount=3`, `attrCount=486`, `rollButtonCount=13`, and Playbook markers.
- Saved ignored local AW2E `roll20-sandbox-dom-evidence.json` from that observation. This file is local evidence only and is not committed.
- Verification: `node --check scripts\roll20_sheet_frame_probe.mjs`, `test:roll20-sheet-frame-probe`, `test:roll20-upload-snippet`, `lint`, `build`, and `guard:roll20-evidence` passed.
- `status:roll20-actual` remains `rendererReady=NO` / `HOLD_PRODUCTION_RENDERER_PATCH`; generated actual screenshots are `4/6`, generated diffs are `4/6`, and AW2E/YSHY still need trusted foreground chat recapture.

## 2026-06-21 Roll20 Sheet Iframe Activation Routing

- Rechecked the live Roll20 editor through the logged-in Chrome tab without modifying existing room settings.
- Top-document Roll20 state still showed no sheet body markers (`charsheet=0`, `sheetform=0`, `attr=0`, `roll=0`) while chat rolltemplate classes were present, which explains the earlier top-document-only `CHAT_TEMPLATE_ONLY`/`NOT_PROVEN` results.
- Closed the unsaved character edit dialog with `Cancel` and observed a character viewer dialog containing an iframe titled `Character sheet for Yadunka Esowhaz`.
- Frame-aware browser probing of that iframe found AW2E body evidence: `attrCount=486`, `rollCount=13`, `charsheetCount=3`, and Playbook text beginning with `Name: Playbook: Lock/Unlock Playbook Angel...`.
- Updated `scripts/roll20_upload_snippet.mjs` so generated upload and activation-check snippets inspect same-context sheet iframes when possible and otherwise report `SHEET_IFRAME_PRESENT_NEEDS_FRAME_PROBE`; character dialog shells without sheet body now report `CHARACTER_DIALOG_NO_SHEET_BODY`.
- Updated `scripts/README.md` and the upload-snippet self-test so future agents cannot treat chat-only evidence as sheet activation or treat iframe-contained sheets as ordinary upload failure.
- Verification: `node --check scripts\roll20_upload_snippet.mjs`, `test:roll20-upload-snippet`, AW2E snippet regeneration, `lint`, and `build` passed. `status:roll20-actual` remains `rendererReady=NO` / `HOLD_PRODUCTION_RENDERER_PATCH` with AW2E and YSHY chat evidence still missing/suspect.
- Boundary: this is activation routing and live DOM evidence only. It does not provide a trusted Roll20 screenshot, visual parity, or renderer readiness.

## 2026-06-21 Product UI Copy Cleanup

- Replaced mojibake user-facing labels/tooltips in `components/editor/MainAreaToolbar.tsx` with clear Korean mode names: 편집, 분할, 블록, 미리보기.
- Replaced temporary text-symbol mode markers with lucide icons (`PencilRuler`, `PanelsLeftRight`, `Blocks`, `Eye`) so the mode switcher follows the editor UI icon rule while keeping readable text labels.
- Replaced mojibake labels/tooltips/ARIA text in `components/editor/PreviewToolbar.tsx` and removed its dead refresh button. The explicit legacy Roll20 CSS toggle remains available for old-sheet verification.
- Replaced the empty preview state copy in `components/editor/PreviewEmptyState.tsx` so it accurately says this is a local Roll20-format preview and actual Roll20 results still require Sandbox/test-room verification.
- Replaced product-facing mojibake in `components/editor/Statusbar.tsx` and `components/editor/SidebarLeft.tsx`, including block count, save state, autosave state, workspace label, and collapsed sidebar ARIA labels.
- Verification: `guard:ui-copy`, `smoke:legacy-preview`, `lint`, `build`, and `smoke:edit-flow -- --port 4210` passed. The edit smoke reported `editUiCopy.hasMojibakeHan=false`.
- Claim boundary: this improves product usability and truthfulness only. It does not prove Roll20 visual parity and does not change renderer readiness.

## 2026-06-21 Roll20 Upload Activation Check Snippets

- Added matching `*-activation-check-snippet.js` generation to `scripts/roll20_upload_snippet.mjs`.
- The activation checker is intended for `https://app.roll20.net/editor` after Sandbox settings save/reload and reports `VISIBLE_MATCH`, `ROLL20_EDITOR_PARSE_ERROR`, or `NOT_PROVEN` before any root/chat evidence capture.
- Extended `test:roll20-upload-snippet` so it now guards both the settings manifest wrapper and activation checker status surface.
- Added explicit apply-mode generation: `--apply-settings --endpoint-campaign-id <id>` keeps default snippets non-submitting but creates a dedicated Sandbox/test-room snippet that enables endpoint fallback and settings save when intentionally requested.
- Live AW2E recheck found a concrete upload-snippet bug: `customcharsheet_json` was saved with two JSON objects concatenated as `}{` after the snippet wrote both the submitted manifest control and an Ace text-input mirror. `/editor` returned a Roll20 JSON parse error instead of loading the sheet.
- Fixed the generated setter so it only writes submitted `textarea/input[name="customcharsheet_json"]` controls and no longer assigns `.ace_text-input[name="customcharsheet_json"]`. The self-test now guards that selector boundary.
- Regenerated and applied AW2E in the dedicated Sandbox after the selector fix. The saved manifest stayed parseable (`concatIndex=-1`) and `/editor` no longer showed the Roll20 parse error, but only `sheet-rolltemplate-aw` appeared in chat; sheet body markers remained absent (`charsheetCount=0`, `rollButtonCount=0`, attrs/text hits 0).
- Tightened activation classification so chat rolltemplate-only evidence reports `CHAT_TEMPLATE_ONLY`, not `VISIBLE_MATCH`. Sheet-root capture remains blocked until roll buttons, attrs, or expected sheet text are visible.
- Live browser check: the current Roll20 editor tab returned `NOT_PROVEN` for AW2E and YSHY activation, with Les-Oublies rolltemplate classes still visible. Automated apply execution was blocked because tab CDP was paused and the read-only page execution surface disables `eval`/`Function`.
- Claim boundary: this is upload/capture gating only. It does not prove AW2E/YSHY loaded in Roll20, does not add new screenshots, and does not make the renderer ready.

## 2026-06-21 Roll20 Settings Manifest Shape Recheck

- Rechecked the live dedicated Roll20 Custom Sheet Sandbox while continuing the AW2E/YSHY trusted chat recapture task.
- Added `corepack pnpm run test:roll20-upload-snippet`, a self-test for the Roll20 upload snippet settings manifest builder. It verifies that generated settings-page snippets use the `{ sheet, userOptions, jsoninfo }` wrapper and that README text documents the plain-manifest parse-error hazard.
- Upload snippets now classify Roll20 editor JSON parse failures as `ROLL20_EDITOR_PARSE_ERROR`, so a broken `/editor` reload is not lumped together with ordinary missing activation markers.
- Corrected `docs/operations/37_roll20_actual_verification.md`; it now matches the 2026-06-21 live finding that plain `sheet.json` is the known-bad settings fallback shape and `{ sheet, userOptions, jsoninfo }` is the current guarded path.
- Verification: `node --check scripts\roll20_upload_snippet.mjs`, `corepack pnpm run test:roll20-upload-snippet`, and AW2E snippet regeneration passed; the regenerated ignored AW2E snippet reports `shape=wrapped-jsoninfo` and contains `ROLL20_EDITOR_PARSE_ERROR`.
- The original claimed editor tab still showed Les-Oublies chat templates and `devicePixelRatio=1.25`, but its CDP capability was blocked by a paused document response. A fresh temporary Chrome tab opened to `https://app.roll20.net/sheetsandbox/settings/21639681` had working tab-scoped CDP.
- Applying AW2E with the current generated snippet's plain `customcharsheet_json` text posted HTML/CSS/translation to `/sheetsandbox/savesheetsettings` with `200`, but `/editor` returned a Roll20 JSON parse error around the plain `{ "html": "sheet.html", ... }` manifest.
- Recovered the dedicated verification sandbox by applying Les-Oublies through the settings-page wrapper shape `{ sheet, userOptions, jsoninfo }`; `/editor` loaded again and visible chat contained `sheet-rolltemplate-classic-roll`.
- Tried AW2E again with the wrapper shape. It did not crash `/editor`, but AW2E sheet/roll button activation was not visible in the checked editor DOM, so AW2E chat recapture remains blocked.
- Updated `scripts/roll20_upload_snippet.mjs` and `scripts/README.md` so settings-page snippets write the wrapper shape and warn that plain exported `sheet.json` caused a live `/editor` parse error on 2026-06-21.
- Boundary: no new trusted Roll20 chat screenshot was captured. Current actual status remains missing trusted AW2E/YSHY chat evidence until visible fixture activation is proven and foreground+DPR capture succeeds.

## 2026-06-21 Les-Oublies Trusted Chat Recapture

- Used the existing logged-in Chrome Roll20 editor tab and its tab-scoped CDP capability; no real room settings were changed.
- Ran the generated Les-Oublies chat DOM probe through `Runtime.evaluate`. It returned `templateForegroundEvidence=FOREGROUND_TEMPLATE_HIT`, `templateHitRatio=1`, `chatSelector=#textchat`, `chatElementSelector=#textchat`, and no overlay candidates.
- Verified the coordinate-space issue directly: `Page.captureScreenshot` with the CSS clip captured Sandbox Tools, while DPR physical clip (`devicePixelRatio=1.25`) captured the intended rolltemplate. The physical PNG was downscaled back to the CSS clip size and the sidecar records `captureDprCorrection.applied=true`.
- Saved ignored local evidence as Les-Oublies `roll20-chat.png` and `roll20-chat-dom-evidence.json` under the active actual-compare run.
- Verification: screenshot diff now includes Les-Oublies chat; chat parity compares 1/3 normalized fixtures and reports Les-Oublies actual `267x180` vs local `267x84`, aligned mismatch `54.1%`.
- Status now reports `generatedActualScreenshots=4/6`, `generatedDiffed=4/6`, `chatCaptureSuspects=2`, and `chatNeedsNormalizedCapture=2`. AW2E and YSHY still need recapture. Renderer action remains HOLD.

## 2026-06-21 Chat Sidecar Foreground Evidence Gate

- Made `templateForegroundEvidence` mandatory across the Roll20 chat sidecar trust path, not only during CDP capture.
- Updated `validateChatForeground` in status, capture-plan, parity diagnostics, and upload handoff so sidecars captured before the foreground proof field are rejected as foreground-suspect.
- Verification: `diagnose:roll20-chat-parity` now reports `NEEDS_NORMALIZED_CAPTURE` for all 3 chat fixtures; `status:roll20-actual` now reports `PARTIAL_GENERATED_ACTUAL_SCREENSHOTS`, `generatedActualScreenshots=3/6`, `generatedDiffed=3/6`, `chatCaptureSuspects=3`, and `chatNeedsNormalizedCapture=3`.
- `plan:roll20-chat-capture --require-current-metrics` now plans all 3 chat recaptures because the existing sidecars predate `templateForegroundEvidence`.
- Boundary: this intentionally downgrades older chat evidence. It is a truthfulness gate, not a renderer regression or product UI change.

## 2026-06-21 Chat Capture Foreground Probe Hardening

- Updated generated Roll20 chat DOM probe snippets so they include `templateForegroundEvidence`.
- The foreground probe samples `document.elementFromPoint` across the selected rolltemplate clip and records overlay candidates intersecting the clip, including Sandbox Tools, HTML/CSS/Translation controls, reload banners, and session-refresh banners.
- Updated `scripts/roll20_chat_cdp_capture.mjs` so it refuses to save `roll20-chat.png` unless `templateForegroundEvidence.status` is `FOREGROUND_TEMPLATE_HIT`.
- Verification: `node --check` for the changed scripts, `test:roll20-chat-capture-plan`, `test:roll20-chat-cdp-readiness`, Les-Oublies `plan:roll20-chat-capture --require-current-metrics`, `capture:roll20-chat-cdp --plan-only`, and the Chrome observation audit passed.
- Boundary: this does not add trusted Roll20 chat pixels. It prevents the next actual capture from silently accepting an overlapped or background crop.

## 2026-06-21 Chrome Observation Audit Guard

- Added `scripts/roll20_chrome_observation_audit.mjs` and package alias `audit:roll20-chrome-observation`.
- The audit is intentionally local-only and diagnostic. It reads Chrome-extension Roll20 observation folders, checks DOM template presence, session-refresh markers, image magic bytes, true PNG/JPEG status, and selected clip overlap with the recorded chat root/template rects.
- Verified with `node --check`, the script self-test, and the current Les-Oublies Chrome observation. The Les audit correctly reports `OBSERVATION_ONLY_BLOCKED_CAPTURE_PATH`, `domTemplates=3`, `trustedCapture=NO`, and flags that the extension wrote JPEG bytes to `.png` filenames.
- The generated canvas crop from the full screenshot still shows Sandbox Tools, not the rolltemplate. This reinforces that the extension screenshot path cannot be promoted without a verified coordinate/foreground adapter.
- Boundary: this improves false-proof prevention only. It does not clear `chatActualTemplatePixelSuspect` and does not unlock renderer tuning.

## 2026-06-21 Roll20 Chrome Observation Capture Boundary

- Used the logged-in Chrome Roll20 tab `Codex Roll20 Verify | Roll20` at `https://app.roll20.net/editor`; no existing campaign room settings were modified.
- The page initially had a visible `Your session needs to be refreshed` state and a tiny `267x82` CSS viewport. Clicking the page's own `Reload` control restored the normal editor viewport to about `1843x968` CSS px.
- Read-only DOM/hit-test checks confirmed Les-Oublies chat template structure is present in the Roll20 page: two `.sheet-rolltemplate-classic-roll` cards and one `.sheet-rolltemplate-initiative-roll`, with `elementFromPoint` hitting actual `sheet-template-*` nodes at measured coordinates.
- Attempted Chrome extension screenshots as ignored local observations only. Raw CSS-coordinate crop captured Sandbox Tools/VTT UI instead of the rolltemplate, and a browser-zoom corrected crop still missed the template. These images are not parity proof.
- Attempted the tab-scoped CDP capability for `Page.captureScreenshot`, but it was unavailable while Browser Use was resolving a paused document response. This leaves the trusted capture path as the normal CDP endpoint workflow or a future verified extension screenshot adapter.
- Local ignored evidence path: `reports/roll20-actual-compare/2026-06-18-state-map-v1/chrome-extension-roll20-observation/official-roll20-Les-Oublies/`.
- Boundary: this is useful live Roll20 diagnosis, but it does not clear `chatActualTemplatePixelSuspect` and does not unlock production ChatPane renderer tuning.

## 2026-06-20 Roll20 Sandbox Settings Chat Recapture

- Used the logged-in Chrome Roll20 session and opened the dedicated Sandbox settings page at `https://app.roll20.net/sheetsandbox/settings/21639681`.
- Confirmed the correct settings surface exposes `#settingsform`, `#save-changes-button`, `textarea[name="customcharsheet_json"]`, and Ace `editors.json`. The earlier `/campaigns/settings/21639681` URL is not the right settings path.
- Retried the normal visible Sandbox Tools file chooser route. It still fails before upload with `fileChooser.setFiles failed: Not allowed`, so file chooser upload remains blocked until Chrome extension file URL access is enabled.
- Applied `official-roll20-Les-Oublies` and `official-roll20-AW2E` only to the dedicated Sandbox through the settings fallback: POST HTML/CSS/translation to `/sheetsandbox/savesheetsettings`, set the plain exported `sheet.json` in `customcharsheet_json`, update `editors.json`, and click the real save button.
- After editor reload, Roll20 chat showed matching generated templates: Les produced `sheet-rolltemplate-classic-roll` / `sheet-rolltemplate-initiative-roll`, and AW2E produced `sheet-rolltemplate-aw`.
- Recaptured ignored local Roll20 chat evidence for AW2E and Les under `reports/roll20-actual-compare/2026-06-18-state-map-v1/local-baseline/<fixture>/screenshots/`.
- Verification: `node scripts\roll20_actual_screenshot_diff.mjs reports\roll20-actual-compare\2026-06-18-state-map-v1`, `corepack pnpm run diagnose:roll20-chat-parity -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `corepack pnpm run diagnose:roll20-chat-current-metrics -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, and `corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1`.
- Result: chat current metrics improved to `3/3` with `missingFields=0`. Overall status is still `GENERATED_ACTUAL_SCREENSHOTS_DIFFED_WITH_SUSPECT_CHAT`, renderer action remains `HOLD_PRODUCTION_RENDERER_PATCH`, and `rendererReady=NO`.
- Boundary: this removes the stale AW2E/Les current-metrics blocker, but it does not prove Roll20 visual parity. Les still has chat foreground/crop suspicion, and broad ChatPane/renderer CSS patches remain blocked.

## 2026-06-20 Roll20 Sandbox Snippet Recheck

- Rechecked the dedicated `Codex Roll20 Verify | Roll20` tab through the Chrome extension path. The tab is still the Roll20 editor with visible `Sheet Sandbox Tools`, including `#sheetHtml`, `#sheetCss`, and `#sheetTranslation`; no project dev server was running on the usual app/CDP ports.
- Reran the current Les-Oublies upload snippet in the dedicated sandbox tools only. The file inputs accepted generated `File` objects and fired `change` events, but the activation probe found `0` expected visible markers after upload (`rollButtonNames`, `attrNames`, `rolltemplateClasses`, and text tokens all stayed empty).
- Saved ignored local evidence at `reports/roll20-actual-compare/2026-06-18-state-map-v1/roll20-upload-handoff/official-roll20-Les-Oublies-current-snippet-result.json`.
- Conclusion: file-input dispatch alone still does not apply the generated sheet in this Roll20 state, so it must not be used for screenshot/chat parity evidence. The next valid path is the real file chooser/settings-save route, or a dedicated settings page where `customcharsheet_json`/Ace `editors.json` can be updated and Roll20 visibly reloads the expected sheet markers.
- Docs fix: `scripts/README.md` no longer says the upload snippet wraps `sheet.json` as `{ sheet, userOptions, jsoninfo }`; current rules require the plain exported `sheet.json` text because the wrapper shape is known-bad for the verified Sandbox settings page.
- Claim boundary: this is an upload-path blocker recheck and documentation correction only. It does not add AW2E/Les current chat metrics, does not change renderer CSS, and does not prove Roll20 visual parity.

## 2026-06-20 Final Rendered Resource Gate For Imported Edit Smoke

- Added final rendered resource collection to `scripts/imported_edit_sync_smoke.mjs` after the edit/reimport path settles.
- The smoke now checks visible `<img>` nodes and computed CSS background-image URLs in both edit Shadow DOM and preview iframe, then records final image/background failure counts.
- Resource status now distinguishes raw request failures from final-render failures. Image requests that only fail as `net::ERR_ABORTED` can pass as `transient-aborted-images-final-rendered` only when final edit/preview resource state is clean.
- Verification: full `smoke:imported-edit-sync:strict -- --port 4196` PASSed for AW2E, Les-Oublies, synthetic-nonleaf-flow, and YSHY 1BU.
- Local result: AW2E and synthetic are `clean`; Les-Oublies and YSHY 1BU are `transient-aborted-images-final-rendered` with final edit/preview failures `0 img/0 bg`.
- Budget result: `budget:imported-edit -- --port 4199` reports overall `PASS`; YSHY 1BU import total is about `4992.1ms`, below the current warn budget.
- Boundary: this clears a local imported edit smoke false failure. It does not prove actual Roll20 visual parity or renderer readiness.

## 2026-06-20 Browser Asset Diagnostics For Imported Edit Resources

- Added optional Chromium image-load probing to `scripts/roll20_asset_resource_audit.mjs` behind `--browser-probe true`, plus package alias `audit:assets:browser`.
- The browser probe only targets image-like refs, using HTTP probe `content-type` and URL extensions to avoid false failures from font/CSS URLs.
- Updated browser smoke resource summaries to keep `request.failure().errorText` in grouped resource reports.
- Verification: `node --check` passed for `roll20_asset_resource_audit`, `imported_edit_sync_smoke`, `capture_visual_fixture_previews`, and `preview_edit_visual_smoke`.
- Local diagnostic run: `audit:assets:browser` against `reports\roll20-actual-compare\2026-06-18-state-map-v1` reported 0 failed HTTP probes, 0 failed browser image probes, and 0 missing local refs for AW2E, Les-Oublies, and YSHY source/payload refs.
- Follow-up strict imported-edit checks still fail resource status only: Les-Oublies is `1x failed image raw.githubusercontent.com (net::ERR_ABORTED)`, YSHY is `11x failed image imgur.com (net::ERR_ABORTED)`, while edit/preview interaction sync remains PASS.
- Interpretation: the current evidence points away from dead image URLs and toward render-context/request-abort timing in the imported edit smoke. Follow-up gate work now verifies final-settled image/background state before classifying these aborts as transient.
- Boundary: this is diagnostics and reporting accuracy only. It does not prove actual Roll20 visual parity and does not change production renderer behavior.

## 2026-06-20 Shared Roll20 CDP Readiness Helper

- Added `scripts/lib/roll20Readiness.mjs` and moved Roll20 login/challenge/editor/campaign/unknown page classification into it.
- Updated both `scripts/roll20_cdp_preflight.mjs` and `scripts/roll20_chat_cdp_capture.mjs` to use the shared helper, reducing the chance that preflight says one thing while capture enforces another.
- Verification: readiness self-test passed, `preflight:roll20-cdp` still reports the current closed-CDP state, the closed-CDP capture dry-run still fails with expected `BLOCKED_CDP_ENDPOINT`, and `lint`, `build`, `guard:roll20-evidence` passed.
- Boundary: this is tooling reliability work. No new Roll20 screenshot or chat sidecar was captured.

## 2026-06-20 Roll20 Chat CDP Capture Readiness Guard

- Tightened `scripts/roll20_chat_cdp_capture.mjs` so it checks the matched Roll20 page readiness before clicking roll buttons or evaluating the chat DOM probe. Login, challenge, and unknown Roll20 pages now block with structured `ROLL20 CHAT CDP CAPTURE BLOCKED_PAGE_NOT_READY`.
- Added `test:roll20-chat-cdp-readiness` to exercise login/challenge/editor/campaign/unknown classification without a live CDP endpoint.
- Verification: readiness self-test passed; closed-CDP dry-run still fails with the expected `BLOCKED_CDP_ENDPOINT`; `lint`, `build`, and `guard:roll20-evidence` passed.
- Boundary: no Roll20 chat evidence was recaptured. This is a guardrail against false or stale evidence while waiting for a logged-in CDP Sandbox/test-room tab.

## 2026-06-20 Roll20 CDP Readiness Classification

- Launched a dedicated CDP Chrome profile and navigated it to Roll20 during the session. That proved the endpoint path can become reachable, but the tab resolved to Roll20 login/challenge flow rather than the Sandbox/test room; later non-launched verification can return `CDP_CLOSED` if that browser is closed.
- Tightened `scripts/roll20_cdp_preflight.mjs` so a Roll20 domain tab is no longer automatically `READY`. It now classifies targets as `CAPTURE_READY`, `LOGIN_REQUIRED`, `CHALLENGE_OR_WAITING`, or `UNKNOWN_ROLL20_PAGE`.
- Verification: a launched CDP check reported `LOGIN_REQUIRED`, `roll20Targets=1`, and planned capture commands for AW2E/Les-Oublies; the final full verification also confirmed `CDP_CLOSED` is still handled as a non-capturable state.
- Boundary: no Roll20 chat evidence was recaptured. The next real-world step is logging in inside the CDP-enabled Chrome and opening the dedicated Sandbox/test room before running capture.

## 2026-06-20 Roll20 CDP Preflight For Chat Recapture

- Added `scripts/roll20_cdp_preflight.mjs` and the `preflight:roll20-cdp` package script so the remaining AW2E/Les-Oublies Roll20 chat recapture can fail early with actionable browser setup instructions instead of a raw CDP connection stack.
- Verification run: `corepack pnpm run preflight:roll20-cdp -- --run-dir reports\roll20-actual-compare\2026-06-18-state-map-v1`.
- Current result: `CDP_CLOSED`; no endpoint is listening at `http://127.0.0.1:9222`. The preflight still found the active capture plan and printed capture commands for `official-roll20-AW2E` and `official-roll20-Les-Oublies`.
- Boundary: no new Roll20 screenshot or sidecar was captured in this batch. The next real-world step is opening a CDP-enabled Roll20 Sandbox/test-room browser, rerunning preflight until a Roll20 target appears, then running `capture:roll20-chat-cdp` for the two planned fixtures.

## 2026-06-20 Roll20 Chat Current-Metrics Handoff

- Added `scripts/roll20_chat_current_handoff.mjs` and the `handoff:roll20-chat-current` package script so the next Roll20 chat recapture step is one repeatable command instead of three separate commands.
- The handoff wraps `diagnose:roll20-chat-current-metrics`, `plan:roll20-chat-capture --require-current-metrics`, and `test:roll20-chat-capture-plan`, then writes an ignored local summary under the selected run folder.
- Verification run: `corepack pnpm run handoff:roll20-chat-current -- reports\roll20-actual-compare\2026-06-18-state-map-v1`.
- Current result: handoff status `NEEDS_RECAPTURE`, wrapped commands `3/3` passed, chat current metrics `1/3`, missing fields `4`, planned fixtures `2` (`official-roll20-AW2E`, `official-roll20-Les-Oublies`).
- Boundary: generated Roll20 actual screenshots/diffs are present for generated targets, but production renderer CSS remains on hold. The next real-world step is recapturing same-action Roll20 chat PNG plus DOM sidecar for AW2E and Les-Oublies with current `filter` fields.

## 2026-06-20 Edit Layer Copy Smoke Cleanup

- Cleaned small but visible edit/layer UI copy issues in `EditCanvas`: unavailable-move status, free-placement tooltip, and layer preview secondary marker.
- Reverified the Figma-style edit smoke after the cleanup. `editUiCopy.hasExpectedLabels=true`, `editUiCopy.hasMojibakeHan=false`, no browser console/page errors, and drag drift stayed at `0px`.
- Verification: `lint`, `build`, `smoke:edit-flow -- --port 4210`, and `guard:roll20-evidence`.
- Boundary: this batch improves local edit UX/readability only. Actual Roll20 sandbox/test-room visual parity is still gated by the upload/capture blocker and must not be claimed from this evidence.

## 2026-06-20 Roll20 Sandbox Recheck And CDP Chat Capture Handoff

- Checked local listening ports before continuing. No app/dev/CDP server was listening on `3000`, `3001`, `3002`, or `9222`; visible node processes were Codex/browser/Figma/agent-bridge related, so no project server was stopped.
- Reclaimed the existing Chrome tab `Codex Roll20 Verify | Roll20` at `https://app.roll20.net/editor`. The visible page is a VTT room with `Sheet Sandbox Tools` open. No existing real room settings or sheet source were modified.
- Saved ignored read-only room observation evidence at `reports/roll20-actual-compare/2026-06-18-state-map-v1/room-observation/2026-06-20-current-vtt/`. The current viewport has `0` character-sheet roots and `4` `.sheet-rolltemplate-coc` chat templates, so it is useful for Roll20 wrapper/chat observation but not generated-sheet parity proof.
- Rechecked Sandbox Tools upload controls. `#sheetHtml`, `#sheetCss`, and `#sheetTranslation` are present, but automatic upload is still blocked in the current Chrome extension route: visible label click detached browser control, hidden input file chooser timed out, CDP `DOM.setFileInputFiles` is unsupported, and CDP `Runtime.evaluate` became unstable.
- Updated `scripts/roll20_chat_cdp_capture.mjs` with `--plan-only` / `--print-plan` and a structured `ROLL20 CHAT CDP CAPTURE BLOCKED_CDP_ENDPOINT` failure message for closed CDP endpoints.
- Verified `node --check scripts\roll20_chat_cdp_capture.mjs` and AW2E `--plan-only`. The expected closed-CDP dry-run now fails cleanly with the blocker text. No Roll20 visual parity claim is allowed from this batch.

## 2026-06-20 Edit Canvas Auto-Width Parity

- Root cause: AW2E's remaining local full-root edit/preview mismatch was largely caused by stale edit canvas width. The smoke captured edit first at a narrower root (`876px`) before the preview iframe auto-sized the shared canvas to `902px`, producing a broad `11.93%` screenshot diff.
- Changed `EditCanvas` so Shadow edit mode measures rendered sheet content width as well as height and raises `sheetCanvasWidth` when imported content needs a wider Roll20-style fixed sheet canvas.
- Extended `scripts/imported_edit_sync_smoke.mjs` with visual hot-cell diagnostics, mismatch coverage, and root geometry deltas. This gives future broad screenshot diffs a concrete routing signal instead of a vague `unclassified` label.
- Verification: `node --check scripts\imported_edit_sync_smoke.mjs`, `lint`, `build`, AW2E-only `smoke:imported-edit-sync -- --only official-roll20-AW2E --port 4198`, full `smoke:imported-edit-sync -- --port 4196`, `smoke:edit-flow -- --port 4210`, and `guard:roll20-evidence`.
- Local result: AW2E sheet-root mismatch dropped from `11.93%` to `1.84%`; root geometry and form-state deltas are now `0`. Full imported smoke reports `AW2E 1.84%`, `Les-Oublies 1.98%`, synthetic `0%`, and YSHY `1.04%`, all within the current local `2%` edit/preview budget.
- Boundary: this proves local edit/preview parity for the current fixture set only. It does not prove actual Roll20 sandbox parity, and resource warnings remain for Les-Oublies/YSHY.

## 2026-06-20 Shadow Edit Worker State Mirror

- Added a minimal Roll20 sheet-worker runtime to `mountSheetShadow()` so Shadow/edit rendering runs `sheet:opened` and supports `on`, `getAttrs`, `setAttrs`, `getSectionIDs`, row id stubs, and translation helpers against the Shadow DOM.
- Wired `PreviewMain` and `EditCanvas` to pass emitted translation JSON into the Shadow runtime. This keeps the implementation generic and avoids fixture-specific default-state patches.
- Verification: `lint`, `build`, AW2E-only `smoke:imported-edit-sync -- --only official-roll20-AW2E --port 4198`, full `smoke:imported-edit-sync -- --port 4196`, `smoke:edit-flow -- --port 4210`, and `guard:roll20-evidence`.
- Local result: edit/preview `formStateDiff.diffCount` is now `0` across AW2E, Les-Oublies, synthetic-nonleaf-flow, and YSHY. Previously AW2E had `2` concrete form-state diffs and Les/YSHY had hidden/default-state diffs.
- Remaining delta: AW2E sheet-root visual mismatch remains `11.93%`, but is now classified as `unclassified-sheet-root-visual-delta` rather than form-control state divergence. Les-Oublies (`1.98%`), synthetic (`0%`), and YSHY (`1.04%`) are within the current local sheet-root budget.
- Boundary: this improves local edit=preview state mirroring only. It does not prove actual Roll20 visual parity, does not authorize production renderer CSS changes, and does not resolve the remaining AW2E visual delta.

## 2026-06-20 Form-State Divergence Classification

- Extended `scripts/imported_edit_sync_smoke.mjs` so imported edit smoke now compares form-control runtime state between edit Shadow DOM and preview iframe after the same edit operation.
- Added `formStateDiff` to the ignored local report and classified sheet-root visual diffs against that state evidence.
- Verification: `node --check scripts\imported_edit_sync_smoke.mjs`, `lint`, AW2E-only `smoke:imported-edit-sync -- --only official-roll20-AW2E --port 4198`, full `smoke:imported-edit-sync -- --port 4196`, `build`, `guard:roll20-evidence`, and `smoke:edit-flow -- --port 4210`.
- Local result: AW2E remains the hard local edit/preview outlier at `11.93%` sheet-root mismatch, now classified as `likely-form-control-state-divergence`. The concrete differences are `attr_SHEETVERSION` edit `1.0` vs preview `1.1` and `attr_harm` radio value `0` unchecked in edit vs checked in preview.
- Local result: Les-Oublies and YSHY remain visually within the current `2%` local sheet-root budget but still report form-state differences, mostly hidden/default/translation-derived controls. The synthetic fixture is clean.
- Interpretation: next P0 is not another generic CSS patch. Edit mode needs to mirror preview runtime/default attribute state while still blocking native input interaction and exposing objects/layers for Figma-style editing.
- Boundary: this is local app evidence only. Actual Roll20 visual parity and sandbox/upload verification remain gated separately.

## 2026-06-20 Sheet-Root Edit/Preview Visual Diagnostic

- Added full `#charsheet-root` screenshot comparison to `scripts/imported_edit_sync_smoke.mjs` after imported edit operations. It captures edit Shadow DOM and preview iframe roots and compares them with the existing browser-canvas PNG diff helper.
- Added `sheetVisualSync` report fields plus `--sheet-visual-limit-pct` and `--require-sheet-visual-sync true`. The default run records PASS/WARN; the require flag turns it into a hard gate.
- Verification: `node --check`, `lint`, full `smoke:imported-edit-sync -- --port 4196`, strict AW2E `smoke:imported-edit-sync -- --only official-roll20-AW2E --require-sheet-visual-sync true --port 4198` failed as expected, `build`, `guard:roll20-evidence`, and `smoke:edit-flow -- --port 4210`.
- Local result: default imported edit sync still passes. Sheet-root visual mismatch is AW2E `11.93%` (WARN over 2%), Les-Oublies `1.98%`, synthetic `0%`, and YSHY `0.98%`. Latest Les/YSHY runs still had resource warnings in the default report.
- Interpretation: subtree edit/preview sync is strong, but full-root edit/preview parity is not fully clean. AW2E likely needs form-control state/paint triage before sheet-root visual sync can become a default gate.
- Boundary: this is local edit/preview evidence only; actual Roll20 renderer parity remains gated separately.

## 2026-06-20 Non-Leaf Edit/Preview Screenshot Diff

- Added subtree-level screenshot capture to `scripts/imported_edit_sync_smoke.mjs`: after imported non-leaf layer reorder, the moved subtree is captured from both edit Shadow DOM and preview iframe.
- Added browser-canvas PNG comparison for those subtree screenshots, recording mismatch percent, mean absolute channel delta, compared size, and mismatch bounds in the ignored local report.
- Non-leaf subtree reorder now requires the visual mismatch to stay under `--nonleaf-visual-limit-pct` (default `2%`) in addition to rect sync and structural/layer checks.
- Verification: `node --check`, `lint`, `smoke:imported-edit-sync -- --only synthetic-nonleaf-flow --port 4197`, full `smoke:imported-edit-sync -- --port 4196`, `build`, `guard:roll20-evidence`, and `smoke:edit-flow -- --port 4210`.
- Local result: AW2E, Les-Oublies, synthetic-nonleaf-flow, and YSHY all had `0%` non-leaf subtree edit/preview screenshot mismatch in the latest full imported smoke, with clean resource checks.
- Boundary: this proves a local subtree-crop edit/preview sync path. It does not prove full-sheet visual parity, actual Roll20 parity, or chat/worker parity.

## 2026-06-20 Non-Leaf Edit/Preview Rect Sync

- Strengthened imported non-leaf subtree reorder verification so it now reads the moved subtree from both edit Shadow DOM and preview iframe after the drop.
- The non-leaf pass condition now requires `left`, `top`, `width`, and `height` to match within `2px` between edit and preview, in addition to the existing layer relation, same parent/depth, child preservation, and emitted-order checks.
- Report output now annotates passing non-leaf reorder as `preview sync`.
- Verification: `node --check`, `lint`, `smoke:imported-edit-sync -- --only synthetic-nonleaf-flow --port 4197`, full `smoke:imported-edit-sync -- --port 4196`, `build`, `guard:roll20-evidence`, and `smoke:edit-flow -- --port 4210`.
- Local result: AW2E, Les-Oublies, synthetic-nonleaf-flow, and YSHY all passed non-leaf subtree edit/preview rect sync. The latest YSHY run still had resource warnings, so this is geometry/edit-sync evidence only, not visual parity.
- Boundary: next step should compare screenshots/crops after subtree moves and keep actual Roll20 renderer parity separate.

## 2026-06-20 Synthetic Imported Non-Leaf Coverage

- Added a built-in copyright-safe `synthetic-nonleaf-flow` fixture to `scripts/imported_edit_sync_smoke.mjs`, so the committed smoke can exercise imported non-leaf subtree editing even without private fixture folders.
- Made `listFixtures()` tolerate a missing ignored fixture directory while still allowing `--only synthetic-nonleaf-flow`.
- Fixed imported non-leaf candidate selection to use layer snapshot parent/depth semantics instead of Blockly `parentId` metadata, which can make flow siblings look nested internally.
- Verification: `node --check`, `lint`, `build`, `guard:roll20-evidence`, `smoke:imported-edit-sync -- --only synthetic-nonleaf-flow --port 4197`, full `smoke:imported-edit-sync -- --port 4196`, and `smoke:edit-flow -- --port 4210`.
- Local result: AW2E, Les-Oublies, synthetic-nonleaf-flow, and YSHY all passed imported edit/preview sync with clean resource checks. Non-leaf subtree relation reorder passed on all four; leaf sibling relation reorder passed on Les-Oublies and synthetic, and safely skipped on AW2E/YSHY.
- Boundary: this is local edit-sync coverage, not actual Roll20 renderer parity. Next UX work should expose clearer visual layer previews and edit/preview screenshot comparison after subtree moves.

## 2026-06-20 Imported Layer Relation Smoke

- Strengthened `scripts/imported_edit_sync_smoke.mjs` so imported layer reorder candidates are selected against `getLayerSnapshot()` semantics instead of only Blockly graph metadata.
- Imported leaf sibling reorder now requires the moving row to be an explicit flow sibling whose `layerPreviousId` points at the target row.
- Imported non-leaf subtree reorder now requires matching layer parent/depth semantics and records relation proof fields in the ignored local report.
- Verification: `node --check scripts\imported_edit_sync_smoke.mjs`, `lint`, `build`, `guard:roll20-evidence`, `smoke:imported-edit-sync -- --port 4196`, and `smoke:edit-flow -- --port 4210`.
- Local fixture result: AW2E, Les-Oublies, and YSHY all passed imported edit/preview sync. The strengthened imported leaf layer relation path executed and passed on Les-Oublies; AW2E/YSHY skipped due no safe leaf sibling pair. Non-leaf imported subtree coverage still needs a fixture with a safe visible sibling subtree.
- Current boundary: this improves local edit-sync verification. It does not prove actual Roll20 renderer parity or complete Figma-like layer editing for every sheet.

## 2026-06-20 Layer Relation Badges and Smoke

- Added explicit edit-layer semantics to `BlockSnapshot`: root, DOM child, and flow sibling are now represented separately from Blockly's internal parent metadata.
- The edit layer panel now shows those semantics as visible badges (`루트`, `하위`, `흐름 형제`) and exposes them as row data attributes for smoke tests and future UX work.
- Added `window.__perfHook.getLayerSnapshot()` so browser validation can inspect the same layer snapshot without dumping private fixture source.
- Strengthened `smoke:edit-flow` to validate a non-leaf sibling reorder: the target row must be a flow sibling before drop, both groups must share a layer parent/depth, the moved group reorders after the target, and both nested inputs stay inside their original group containers.
- Verification: `lint`, `node --check scripts\edit_flow_browser_smoke.mjs`, `build`, `smoke:edit-flow -- --port 4210`, and `guard:roll20-evidence`.
- Current boundary: this is one structural edit UX improvement. Imported real-sheet layer semantics, broader visual layer previews, and actual Roll20 renderer parity remain active P0 work.

## 2026-06-20 Layer Traversal Depth Cleanup

- Updated `DefaultAdapter.listAllBlocks()` to walk explicit Blockly `next` chains with a shared `seen` set instead of broad `getChildren(true)` recursion.
- This is a groundwork fix for the edit layer panel: it makes traversal more deliberate and reduces the risk of duplicate/over-broad layer rows as the Figma-like structure panel grows.
- Verification: `lint`, `smoke:edit-flow -- --port 4210`, `build`, and `guard:roll20-evidence`.
- Current boundary: Blockly `parentId` metadata can still look like a nested parent for statement-chain siblings in diagnostics. The next UX step should display DOM child vs flow sibling semantics more explicitly instead of claiming the layer tree is fully solved.

## 2026-06-20 Roll20 Chat CDP Capture Runner

- Added `scripts/roll20_chat_cdp_capture.mjs` plus `capture:roll20-chat-cdp` for actual Roll20 chat recapture when a Chrome/Edge CDP endpoint is available.
- The runner uses the existing `plan:roll20-chat-capture` snippet for a fixture, optionally clicks a suggested or explicit roll button, validates current filter evidence fields, and saves the paired `roll20-chat.png` / `roll20-chat-dom-evidence.json` into the ignored run folder.
- Verification: `node --check`, `lint`, `build`, and `guard:roll20-evidence`.
- Current evidence boundary: checked common debug ports were not listening, so no live Roll20 AW2E/Les-Oublies recapture happened in this batch. Renderer action remains `HOLD_PRODUCTION_RENDERER_PATCH`.

## 2026-06-20 Chat Capture Filter Self-Test Hardening

- Strengthened `scripts/roll20_chat_capture_plan.mjs` so the fake-DOM self-test requires both the latest rolltemplate and its table evidence to include `computedStyle.filter`.
- This directly protects the current Roll20 renderer gate blocker: stale AW2E/Les-Oublies chat sidecars were missing filter fields needed for paint/shadow decisions.
- Verification: `node --check`, `test:roll20-chat-capture-plan`, `plan:roll20-chat-capture --require-current-metrics`, `lint`, `build`, and `guard:roll20-evidence`.
- Current evidence boundary: the run still needs fresh AW2E and Les-Oublies actual Roll20 chat recaptures. This batch improves the capture contract; it does not create visual parity evidence or authorize production ChatPane CSS.

## 2026-06-20 Wide Row Bundle Dry-Run Estimate

- Extended `scripts/imported_edit_perf_budget.mjs` with a dry-run estimate for replacing the top remaining `r20_tr` structural signature with one lazy/bundle unit per row.
- Local private result: the strongest remaining row signature appears 13 times with 1235 descendant blocks, so a bundle/lazy representation would reduce about 1222 blocks.
- Projection for the current private fixture: 6530 HTML blocks would become about 5308 HTML blocks for that one signature only.
- Interpretation: this is a meaningful but incomplete optimization target. It should not be implemented as a blind raw-HTML pack unless the UX tradeoff is explicit; the safer path is either editable wide-row composite fields or lazy materialization with an ungroup/edit escape hatch.
- Claim boundary: estimate only. Import behavior, emitted HTML/CSS, and renderer output did not change.

## 2026-06-20 Remaining Row Signature Diagnostics

- Added sanitized remaining `r20_tr` structural signatures to `scripts/imported_edit_sync_smoke.mjs`.
- `scripts/imported_edit_perf_budget.mjs` now surfaces the top remaining row signature row count and descendant-block total in redacted summaries.
- Local private result: after current composites, the strongest remaining table-row signature appears 13 times and accounts for 1235 descendant blocks, averaging 95 descendant blocks per row.
- The top signature is table/control heavy: repeated `r20_td`, `r20_literal_string`, `r20_roll_button`, `r20_checkbox`, `r20_i18n_text`, and `r20_text_input`.
- Interpretation: this is now the best concrete P0 target for structural import performance. A generic wide row/control-row composite or lazy subtree path can be designed from this signature without hardcoding private sheet content.
- Claim boundary: diagnostic only. No matcher behavior, emitted HTML, or renderer output changed.

## 2026-06-20 Composite Packing Diagnostics Exposed

- Added composite packing diagnostics to `ImportStats`: original atomic total, after-pack total, collapsed count, and packed-by-type counts.
- `window.__perfHook.importSheet()` now returns composite collapsed/type counts, and `budget:imported-edit` renders them in redacted summaries.
- Local private result after rebuilding `out/`: 6530 HTML blocks, largest root subtree 4158 blocks (`63.7%`), composite collapsed 253 blocks, packed types `r20_attribute_card:8`, `r20_skill_row:49`, `r20_repeating_section_wrapper:12`.
- Timing from the same run: import about `5670.5ms`, inject about `5551.4ms`, emit about `41.5ms`, drag drift `0px`, edit/preview/reimport sync PASS, console/page/resource checks PASS.
- Interpretation: existing composites are active but not strong enough for the largest root subtree. The next useful diagnostic should inventory unmatched repeated row/table/control signatures before adding another generic composite or lazy subtree path.
- Claim boundary: diagnostics only. No new composite matcher behavior, production performance improvement, or Roll20 visual parity was shipped in this batch.

## 2026-06-20 Imported Root-Subtree Shape Metrics

- Added sanitized root-subtree diagnostics to `scripts/imported_edit_sync_smoke.mjs`.
- `htmlWorkspaceShape` records HTML root count, largest root-subtree block count/percentage, max depth, and top block types while omitting block IDs, DOM text, HTML snippets, CSS snippets, and private paths.
- Extended `scripts/imported_edit_perf_budget.mjs` so redacted budget summaries include max root subtree, largest-root percentage, and max root depth.
- Local private result: 6530 HTML blocks, 7 HTML roots, largest root subtree 4158 blocks (`63.7%`), max depth 47, total workspace blocks 8627.
- Timing from the same run: import about `4939.1ms`, Blockly inject about `4801ms`, emit about `58.9ms`, drag drift `0px`, edit/preview/reimport sync PASS, console/page/resource checks PASS.
- Interpretation: the next import performance work should target the largest root subtree. More top-level chunking is unlikely to be enough; likely paths are table/control composite reduction, lazy Blockly materialization, or subtree-level hydration.
- Claim boundary: diagnostics only. No production performance optimization or Roll20 visual parity was shipped in this batch.

## 2026-06-20 Imported Workspace Shape Metrics

- Added `workspaceAfterImport` to `scripts/imported_edit_sync_smoke.mjs`.
- Added root HTML and total workspace block counts to `scripts/imported_edit_perf_budget.mjs`.
- Local private shape result: 6530 HTML blocks, only 7 root HTML blocks, 8627 total workspace blocks across HTML/CSS/i18n/worker.
- Interpretation: large sheets can be dominated by a few huge root subtrees. Top-level chunking is not enough; the next performance step should be composite reduction, lazy Blockly materialization, or subtree-level hydration.
- The same local run still passed edit/preview/reimport sync with `0px` drag drift, while inject remained high/noisy at about `5.8s`.

## 2026-06-20 Hydrate Resize Suppression

- Changed `DefaultAdapter.hydrateFromXml` to call `workspace.setResizesEnabled(false)` during XML clear/import and restore resize handling afterward.
- This mirrors the existing chunked hydrate behavior and avoids unnecessary workspace resize work during synchronous hydrate.
- Local private measurement on a 6530-block fixture: about `4799ms total / 4666ms inject` before versus about `4761ms total / 4619ms inject` after, with drag drift still `0px`.
- Interpretation: the change is safe and directionally right, but the improvement is small/noisy. The real P0 remains structural import/hydration reduction or lazy/virtual Blockly materialization.
- Verification: private `smoke:imported-edit-sync`, redacted `budget:imported-edit`, and `smoke:edit-flow`.

## 2026-06-20 Imported Edit Performance Budget

- Added `scripts/imported_edit_perf_budget.mjs` and `corepack pnpm run budget:imported-edit`.
- The command converts local `smoke:imported-edit-sync` JSON into a sanitized performance budget summary: block count, parse/inject/emit/import timings, drag drift, edit/preview sync, reimport stability, resource warnings, and page errors.
- Added `--redact-ids true` for private fixtures. In that mode the report hides fixture names and source paths but keeps numeric metrics.
- Local private baseline: one 6530-block fixture reports `WARN` due resource warnings; import total/inject/emit/drift/page-error budgets pass. This creates the baseline for the next import/hydration optimization work.
- Claim boundary: budget/reporting only. No production performance optimization was shipped in this batch.

## 2026-06-20 Imported Edit Drag Timing Evidence

- Extended `scripts/imported_edit_sync_smoke.mjs` to record drag position timeline samples for imported fixtures at pointer-up, after one animation frame, after 50ms, and after 350ms.
- Ran the smoke locally against an ignored private 6530-block fixture. It passed import/edit/preview/reimport sync and recorded `0px` left/top post-drop drift.
- The same private run showed the likely performance bottleneck: total import about 4.6-4.7s, Blockly injection about 4.5s, emit about 50ms.
- Resource warnings remain due blocked external/local assets, so this is edit-sync/performance-routing evidence only, not Roll20 visual parity evidence.
- Claim boundary: private fixture files, screenshots, and generated reports remain ignored and uncommitted.

## 2026-06-20 Edit Drag Drift Smoke Coverage

- Extended `scripts/edit_flow_browser_smoke.mjs` so the real pointer-drag slice records moved element position at pointer-up, after one animation frame, after 50ms, and after 250ms.
- Current synthetic edit-flow result: `leftDrift: 0`, `topDrift: 0`; the small synthetic drag path stays visually stable after drop.
- Interpretation: the user-visible rollback/lag is likely tied to larger imported sheets, heavier emit/remount cost, or specific fixture structure rather than the basic synthetic drag path.
- Verification: `corepack pnpm run smoke:edit-flow`.
- Claim boundary: regression coverage only. No production edit behavior changed in this batch.

## 2026-06-20 Edit Surface Copy Cleanup

- Cleaned visible wording in the edit surface: placement mode labels, layer panel empty/search text, container/drop badges, preview width/fit controls, and widget-gallery add feedback.
- Kept this batch intentionally UI-copy-only. It does not change renderer CSS, Roll20 actual evidence, upload flow, or edit synchronization semantics.
- Verification: `corepack pnpm run lint`.
- Claim boundary: readable editor UI only. Roll20 visual parity and the Figma-like editing model remain active P0 work.

## 2026-06-20 Sandbox Upload Activation Guard

- Added generic activation-hint extraction to `scripts/roll20_upload_snippet.mjs` for Roll20 Sandbox upload snippets: expected rolltemplate classes, roll button names, attr names, and visible text tokens are derived from local payloads.
- Generated snippets now capture before/after DOM activation probes and return `activation.status`, separating `VISIBLE_MATCH` from `FILE_INPUTS_DISPATCHED_BUT_VISIBLE_MATCH_NOT_PROVEN`.
- Browser observation: the dedicated Roll20 verification tab remained on YSHY/CoC chat after a synthetic AW2E file-input dispatch. That means file-input dispatch/handler consumption is not enough to trust a recapture.
- Browser limitation: the normal file chooser path still timed out in the Chrome extension upload flow, and a patched snippet execution attempt timed out before returning trustworthy activation evidence.
- Verification: `node --check scripts\roll20_upload_snippet.mjs`, generated AW2E upload snippet syntax, and `plan:roll20-chat-capture --require-current-metrics`.
- Claim boundary: this is evidence-gate hardening only. AW2E and Les-Oublies current-metrics chat sidecars are still stale, and Roll20 visual parity remains unclaimed.

## 2026-06-20 Header and Public Example Copy Cleanup

- Rewrote visible `EditorHeader` copy: title, subtitle, panel tooltips, new/import/save/export labels, confirm dialog, and toasts now use readable Korean.
- Cleaned public example registry/store comments so copyright policy is explicit: public examples must be synthetic; real/user/community sheets stay in ignored local fixtures/reports.
- Verified public sample UI remains hidden with the empty `EXAMPLES` catalog through export-dialog browser smoke.
- Verification: mojibake scan over `components`, `lib`, and `app` excluding generated Roll20 base CSS; `corepack pnpm run lint`; `corepack pnpm run build`; `smoke:export-dialog` on port `4501`; `guard:roll20-evidence`.
- Claim boundary: product-surface cleanup only. No renderer CSS changed and Roll20 visual parity remains gated.

## 2026-06-20 Chat Current-Metrics Audit Gate

- Added `scripts/roll20_chat_current_metrics_audit.mjs` and `corepack pnpm run diagnose:roll20-chat-current-metrics`.
- The audit checks actual Roll20 chat DOM sidecars for current renderer-diagnostic fields: row metrics, table structure, computed style, text rasterization, paint `filter`, font evidence, text measure samples, and viewport DPR.
- Wired `scripts/roll20_renderer_action_gate.mjs` to consume the audit report when present and print fixture-level missing fields in the HOLD blocker.
- Current `2026-06-18-state-map-v1` result: `NEEDS_RECAPTURE`, `1/3` current, AW2E and Les-Oublies missing `latestTemplate.computedStyle.filter` and `table.computedStyle.filter`.
- Browser check: the live Roll20 tab currently shows YSHY `.sheet-rolltemplate-coc`, which already has current metrics. Normal Sandbox file input upload for AW2E timed out waiting for the file chooser, matching the existing upload blocker.
- Verification: `node --check` for the new audit and renderer gate, `diagnose:roll20-chat-current-metrics`, and `gate:roll20-renderer-action`.
- Claim boundary: evidence-gating only. No Roll20 screenshot was replaced, no existing room was modified, no production renderer CSS changed, and `HOLD_PRODUCTION_RENDERER_PATCH` remains.

## 2026-06-20 Export Asset Preflight UI

- Added export-dialog asset preflight for emitted HTML/CSS asset references.
- The UI now separates local zip composition from external image/font availability: external URLs, relative paths, data URLs, and host names are surfaced before download.
- Empty workspace export smoke reports `외부 자산 없음`; imported Les-Oublies export smoke reports `확인 필요` and shows the external-asset warning copy.
- Updated `scripts/export_dialog_browser_smoke.mjs` so it asserts the asset-preflight panel, current Korean copy, and no mojibake in both empty and imported-fixture flows.
- Verification: `corepack pnpm run lint`, `corepack pnpm run build`, `smoke:export-dialog` empty on port `4493`, `smoke:export-dialog` imported Les-Oublies on port `4494`, and `guard:roll20-evidence`.
- Claim boundary: this is user-facing export safety only. It does not bundle third-party assets, does not fetch private URLs, does not make `HOLD_PRODUCTION_RENDERER_PATCH` pass, and does not prove Roll20 visual parity.

## 2026-06-20 Chat Background Asset/Proxy Probe

- Added `scripts/roll20_chat_background_asset_probe.mjs` and `corepack pnpm run diagnose:roll20-chat-background-assets`.
- The probe reads current background/source evidence, fetches referenced background URLs, records hash/format/dimensions, and flags removed-placeholder assets.
- Wired the probe into `gate:roll20-renderer-action`.
- Current result on `2026-06-18-state-map-v1`:
  - AW2E: `ASSET_BYTES_MATCH_BUT_SOURCE_PLACEHOLDER`, local/actual/source all return `200 image/png`, `503b`, `161x81`, same hash, source final path includes `removed.png`.
  - Les-Oublies: `NO_BACKGROUND_IMAGE` for current table evidence.
  - YSHY 1BU: `ASSET_BYTES_MATCH_BUT_SOURCE_PLACEHOLDER`, local/actual/source all return `200 image/png`, `503b`, `161x81`, same hash, source final path includes `removed.png`.
- Interpretation: the current local-vs-actual chat mismatch is not explained by local and Roll20 receiving different background image bytes. For original-sheet parity, affected missing assets must be preserved or rehosted; for local-vs-actual parity, the next work remains browser paint/context plus table/crop diagnostics.
- `gate:roll20-renderer-action` still returns `HOLD_PRODUCTION_RENDERER_PATCH`.
- Claim boundary: diagnostic-only. No production renderer CSS, no visual parity claim, no private/generated evidence committed.

## 2026-06-20 Chat Background Raster Model Probe

- Added `scripts/roll20_chat_background_raster_model_probe.mjs` and `corepack pnpm run diagnose:roll20-chat-background-raster`.
- The probe routes whether the current chat background mismatch is explained by already-tested raster-only models: background-size/scale, row luma correction, or table width/crop context.
- Wired the probe into `gate:roll20-renderer-action`.
- Current result on `2026-06-18-state-map-v1`:
  - AW2E: `COLOR_ASSET_RASTER_MODEL_REQUIRED`, row `13.43%`, luma gain `+0.22%`, width axis `CHAT_MESSAGE_CONTENT_WIDTH`.
  - Les-Oublies: `DECLARATION_DIFF_BEFORE_RASTER_MODEL`, row `5.15%`, luma gain `+0.01%`, width axis `KEEP_DEFAULT`.
  - YSHY 1BU: `SOURCE_IMAGE_OR_BROWSER_PAINT_MODEL_REQUIRED`, row `23.15%`, luma gain `-0.58%`, `coc-background-size-actual` risk `reject-row-raster-regression`, width axis `TABLE_SCROLL_INTRINSIC`.
- Interpretation: for YSHY/CoC, the CSS declarations already match while flat pixels differ, and simple raster models are weak or rejected. The next P0 is image/proxy decode/browser paint comparison, not background-size, luma/filter, broad typography, or direct table-scale CSS.
- `gate:roll20-renderer-action` still returns `HOLD_PRODUCTION_RENDERER_PATCH`.
- Claim boundary: diagnostic-only. No production renderer CSS, no visual parity claim, no private/generated evidence committed.

## 2026-06-20 Chat Background/Source Probe

- Added `scripts/roll20_chat_background_source_probe.mjs` and `corepack pnpm run diagnose:roll20-chat-background-source`.
- The probe fuses computed local/actual table background styles, row compositing buckets, table-width context, and rejected `coc-background-size-actual` evidence.
- Wired the probe into `gate:roll20-renderer-action`.
- Current result on `2026-06-18-state-map-v1`:
  - AW2E: `COLOR_ASSET_RASTER_CONTEXT_REQUIRED`, background image equivalent but style differs, width delta `15.744px`, luma gain `+0.22`.
  - Les-Oublies: `BACKGROUND_DECLARATION_DIFFERS`, background image equivalent but style differs, width delta `0.8px`, luma gain `+0.01`.
  - YSHY 1BU: `BACKGROUND_DECLARATION_MATCHES_BUT_RASTER_DIFFERS`, background declarations match, width delta `-24.309px`, luma gain `-0.58`, `coc-background-size-actual` row-raster risk `reject-row-raster-regression`.
- Interpretation: YSHY/CoC should not retry background-size, broad typography, filters, or simple luma correction. The next useful diagnostic is rendered background raster/source context where Roll20 and local CSS declarations already appear equivalent but flat pixels differ.
- `gate:roll20-renderer-action` still returns `HOLD_PRODUCTION_RENDERER_PATCH`.
- Claim boundary: diagnostic-only. No production renderer CSS, no visual parity claim, no private/generated evidence committed.

## 2026-06-20 Row Compositing Probe

- Added `scripts/roll20_chat_row_compositing_probe.mjs` and `corepack pnpm run diagnose:roll20-chat-row-compositing`.
- The probe decomposes row-level screenshot mismatch into edge/text, flat background, local-darker/local-brighter, and chroma buckets.
- Wired the probe into `gate:roll20-renderer-action`.
- Current result on `2026-06-18-state-map-v1`:
  - AW2E: `COLOR_ASSET_RASTER_MODEL_REQUIRED`, weighted `13.43%`, luma-corrected `13.65%`, edge `0%`, flat `100%`, local darker `37.25%`.
  - Les-Oublies: `LOCAL_BACKGROUND_TOO_DARK`, weighted `5.15%`, luma-corrected `5.16%`, edge `0%`, flat `100%`, local darker `62.22%`.
  - YSHY 1BU: `BACKGROUND_COMPOSITING_MODEL_REQUIRED`, weighted `23.15%`, luma-corrected `22.57%`, edge `0%`, flat `100%`, local darker `63.32%`.
- Interpretation: YSHY/CoC should move to a row background compositing/source-context candidate, but not a simple luma/brightness/filter patch; virtual luma correction only improves YSHY by `-0.58%p`. The evidence argues against another text antialiasing, table scale, background-size, broad typography, or filter CSS attempt.
- `gate:roll20-renderer-action` still returns `HOLD_PRODUCTION_RENDERER_PATCH`.
- Claim boundary: diagnostic-only. No production renderer CSS, no visual parity claim, no private/generated evidence committed.

## 2026-06-20 Row Raster Candidate Comparison Gate

- Added `--report-dir` to `scripts/roll20_chat_row_raster_probe.mjs` so candidate probes write isolated evidence instead of replacing the default row-raster report.
- Added `scripts/roll20_chat_row_raster_candidate_compare.mjs` and `corepack pnpm run diagnose:roll20-chat-row-raster-candidates`.
- Wired the comparison report into `gate:roll20-renderer-action`.
- Current baseline on `2026-06-18-state-map-v1`:
  - YSHY aligned mismatch `22.33%`.
  - YSHY row-weighted mismatch `23.15%`.
  - YSHY worst row `5` mismatch `30.89%`.
- Candidate comparison result:
  - `paint-dim-background`: row raster improves (`20.51%`, worst `27.98%`) but is still style-proof blocked by actual Roll20 `filter: none`.
  - `coc-background-size-actual`: rejected; YSHY row-weighted worsens to `24.53%`, worst row to `39.25%`.
  - `yshy-sanitize-typography`: rejected; YSHY row-weighted worsens to `39.03%`, worst row to `55.37%`.
- `gate:roll20-renderer-action` now reports row-raster candidate comparison `compared=7/7`, `rejected=2`, `noMeaningfulGain=3`, and remains `HOLD_PRODUCTION_RENDERER_PATCH`.
- Claim boundary: diagnostic-only. No production renderer CSS, no visual parity claim, no private/generated evidence committed.

## 2026-06-20 CoC Background-Size Raster Candidate Rejected

- Added diagnostic-only ChatPane paint policy `coc-background-size-actual`.
- Added the candidate to rolltemplate chat smoke, candidate comparison, candidate style proof routing, and scripts docs.
- Candidate smoke PASSed AW2E, Les-Oublies, and YSHY.
- Candidate comparison result: `coc-background-size-actual` is `no-meaningful-gain`.
  - YSHY aligned mismatch moved `22.33% -> 21.94%` (`-0.39%`).
  - AW2E and Les-Oublies stayed neutral.
- Row-raster check against the candidate showed the YSHY worst row got worse: default row `5` mismatch `30.89%`, candidate row `5` mismatch `39.25%`.
- Interpretation: CoC background-size/table-width raster scale alone is not the missing Roll20 renderer model. Continue with row-level text/background compositing or capture/source-order context; do not promote this candidate.
- `gate:roll20-renderer-action` still returns `HOLD_PRODUCTION_RENDERER_PATCH`.
- Claim boundary: diagnostic-only. No production renderer CSS, no visual parity claim, no private/generated evidence committed.

## 2026-06-20 Row Raster Probe for YSHY/CoC Chat

- Added `scripts/roll20_chat_row_raster_probe.mjs` and `corepack pnpm run diagnose:roll20-chat-row-raster`.
- The probe compares local and actual rolltemplate PNGs by DOM row using existing local-only screenshots and sidecars. It reports row-weighted mismatch, worst row, signed luma delta, and bright/dark mismatch shares.
- Wired the probe into `gate:roll20-renderer-action`.
- Current result on `2026-06-18-state-map-v1`:
  - AW2E: `ROW_LUMA_RASTER_MODEL_REQUIRED`, row-weighted mismatch `13.43%`, worst row `1` mismatch `19.87%`, luma delta `+23.413`.
  - Les-Oublies: `RASTER_SECONDARY`.
  - YSHY 1BU: `COC_ROW_RASTER_MODEL_REQUIRED`, row-weighted mismatch `23.15%`, worst row `5` mismatch `30.89%`, luma delta `-27.232`.
- Interpretation: YSHY's current mismatch is not ready for product CSS. The next experiment should use row-level background/text raster evidence and still avoid filter-based fixes because actual Roll20 reports `filter: none`.
- `gate:roll20-renderer-action` still returns `HOLD_PRODUCTION_RENDERER_PATCH`.
- Claim boundary: diagnostic-only. No production renderer CSS, no visual parity claim, no private/generated evidence committed.

## 2026-06-20 YSHY Row/Paint/Source Probe

- Added `scripts/roll20_chat_row_paint_source_probe.mjs` and `corepack pnpm run diagnose:roll20-chat-row-paint-source`.
- The probe fuses row geometry, mask bands, candidate pixel gains, actual computed styles, and Roll20 chat CSS activation/source evidence.
- Wired the probe into `gate:roll20-renderer-action`.
- Fixed `roll20_chat_width_reconciliation.mjs` so row geometry decisions are read from `rowModel.decision`.
- Current result on `2026-06-18-state-map-v1`:
  - AW2E: keeps its current axis. Still needs message/content width work, not YSHY row-paint work.
  - Les-Oublies: keeps default axis for now. Its current Roll20 sidecar still lacks the newest row/typography/filter evidence.
  - YSHY 1BU: `ROW_BAND_RASTER_CONTEXT_REQUIRED`, aligned mismatch `22.33%`.
- Interpretation: `paint-dim-background` remains a useful diagnostic clue (`-2.48%` for YSHY), but it is contradicted by actual Roll20 `filter: none`; `yshy-sanitize-typography` regresses YSHY by `+14.13%`. The next useful work is a CoC/YSHY row-band background/text rasterization plus source-order/capture-context probe, not production CSS.
- `gate:roll20-renderer-action` still returns `HOLD_PRODUCTION_RENDERER_PATCH`.
- Claim boundary: diagnostic-only. No production renderer CSS, no visual parity claim, no private/generated evidence committed.

## 2026-06-20 YSHY Font Availability Candidates Rejected

- Added diagnostic-only ChatPane font policy `yshy-bookk-unavailable`.
- Added diagnostic-only typography policies `yshy-table-font-context`, `yshy-bookk-missing-render`, and `yshy-missing-bookk-table-font-context`.
- Added the new candidates to rolltemplate chat smoke, candidate comparison, candidate style proof, and scripts docs.
- All new smoke runs produced visible rolltemplate chat cards.
- Result: `yshy-bookk-unavailable` did not make local Bookk checks false; local `document.fonts.check()` still returned true for Bookk specs, and YSHY table width widened to `1305.578px`.
- Result: `yshy-table-font-context` widened YSHY table width to `1284.438px`.
- Result: `yshy-bookk-missing-render` widened YSHY table width to `1305.578px`.
- Result: `yshy-missing-bookk-table-font-context` widened YSHY table width to `1317.141px`.
- Candidate comparison rejects the new family:
  - `yshy-bookk-unavailable`: YSHY aligned delta `+5.39%`.
  - `yshy-table-font-context`: YSHY aligned delta `+2.57%`.
  - `yshy-bookk-table-font-context`: YSHY aligned delta `+6.69%`.
  - `yshy-bookk-missing-render`: YSHY aligned delta `+5.39%`.
  - `yshy-missing-bookk-table-font-context`: YSHY aligned delta `+6.69%`.
- Interpretation: the remaining YSHY mismatch is not solved by Bookk missing-font simulation or Proxima table-context alone. Next YSHY work should move toward row-band/crop/background paint or sanitized source ordering, while keeping filter-based paint candidates blocked by actual Roll20 `filter: none`.
- `gate:roll20-renderer-action` still returns `HOLD_PRODUCTION_RENDERER_PATCH`.
- Claim boundary: diagnostic-only. No production ChatPane CSS, no Roll20 visual parity claim, no private/generated evidence committed.

## 2026-06-20 Font/Intrinsic Probe Split

- Added `scripts/roll20_chat_font_intrinsic_probe.mjs` and `corepack pnpm run diagnose:roll20-chat-font-intrinsic`.
- The probe fuses existing font/glyph, intrinsic-width, overflow/crop, candidate comparison, and chat parity evidence into one fixture-level next-action decision.
- Wired the probe into `gate:roll20-renderer-action`.
- Current result on `2026-06-18-state-map-v1`:
  - AW2E: `TEXT_METRIC_WIDTH_MODEL`, table delta `+15.744px`, measured text delta `+15.602px`, residual `+0.142px`, font availability unchanged. Continue AW2E on exact text metric/message width work.
  - Les-Oublies: `WIDTH_SECONDARY`, table delta `+0.8px`.
  - YSHY 1BU: `FONT_FACE_INTRINSIC_MODEL_REQUIRED`, table delta `-24.309px`, measured text delta `-54.946px`, residual `+30.637px`, font availability changed, table font-family changed, width override candidates `NO_GAIN`.
- Interpretation: YSHY/CoC should not get another direct width/overflow CSS candidate first. The next useful diagnostic is to mirror Roll20 font-face availability/order and then measure table min-content/intrinsic sizing under that font context.
- `gate:roll20-renderer-action` still returns `HOLD_PRODUCTION_RENDERER_PATCH`.
- Claim boundary: diagnostic-only. No production ChatPane CSS, no Roll20 visual parity claim, no private/generated evidence committed.

## 2026-06-20 CoC Overflow/Crop Candidate Rejected

- Added diagnostic-only ChatPane geometry policy `coc-overflow-crop-model`.
- Unlike older geometry probes, this candidate writes a post-user diagnostic style block after uploaded rolltemplate CSS. That verifies the candidate under the cascade order it needs instead of silently losing to the sheet CSS.
- The candidate attempts the current YSHY measured values: message overflow clipping, CoC table `border-spacing: 0`, `overflow-wrap: break-word`, `width: 1248.55px !important`, and `max-width: 1248.55px !important`.
- Browser smoke PASSed AW2E, Les-Oublies, and YSHY.
- The candidate still failed to move YSHY used table width. The smoke sidecar reports the YSHY table at `1272.859px`, not the actual Roll20 `1248.55px`.
- Candidate comparison result: `coc-overflow-crop-model` is `no-meaningful-gain`; YSHY remains raw `26.45%`, aligned `22.33%`, delta `0%`.
- Interpretation: the YSHY/CoC mismatch is not a simple cascade/width/overflow declaration problem. The next diagnostic should target table intrinsic/min-content calculation and font-face availability/order, because actual Roll20 computes a narrower used table while keeping the same `267px` rolltemplate root.
- `gate:roll20-renderer-action` still returns `HOLD_PRODUCTION_RENDERER_PATCH`.
- Claim boundary: diagnostic-only. No production ChatPane default changed, no Roll20 visual parity claim, no private/generated evidence committed.

## 2026-06-20 YSHY Overflow/Crop Probe

- Added `scripts/roll20_chat_overflow_crop_probe.mjs` and `corepack pnpm run diagnose:roll20-chat-overflow-crop`.
- The probe compares local ChatPane rolltemplate geometry with actual Roll20 chat DOM sidecars for root width, table width, table scroll/client width, table overflow, table-to-crop ratio, scroll-to-crop ratio, row uniformity, and crop/top-offset signals.
- Wired the probe into `gate:roll20-renderer-action` so the renderer gate now reports overflow/crop evidence and next actions.
- Current result on `2026-06-18-state-map-v1`:
  - AW2E: `MESSAGE_WIDTH_MODEL`, table delta `+15.744px`, overflow delta `0px`, table-to-crop delta `+0.00105`, top offset `+184.178px`. This stays on message/content width.
  - Les-Oublies: `WIDTH_SECONDARY`, table delta `+0.8px`, overflow delta `0px`, table-to-crop delta `+0.003`.
  - YSHY 1BU: `TABLE_OVERFLOW_CROP_MODEL_REQUIRED`, table delta `-24.309px`, overflow delta `0px`, table-to-crop delta `-0.09104`, top offset `+125.884px`.
- Interpretation: YSHY is not explained by paint filters, broad typography, transform, or raw overflow pixels. The next diagnostic candidate should model CoC/YSHY table scroll/client width and rolltemplate crop origin together, while AW2E remains a separate message-width track.
- `gate:roll20-renderer-action` still returns `HOLD_PRODUCTION_RENDERER_PATCH`.
- Claim boundary: diagnostic-only. No production ChatPane CSS, no Roll20 visual parity claim, no private/generated evidence committed.

## 2026-06-20 YSHY Live Filter Sidecar Recapture

- Used the existing Chrome Roll20 verification editor tab in read-only mode. No existing room/settings/source was modified.
- Confirmed the visible live YSHY `.sheet-rolltemplate-coc` chat DOM reports `filter: none` for the template/table/sampled rolltemplate children.
- Updated only ignored local evidence under `reports/roll20-actual-compare/2026-06-18-state-map-v1/`:
  - YSHY `roll20-chat-dom-evidence.json` now has `latestTemplate.computedStyle.filter`, `table.computedStyle.filter`, and sampled child `filter` fields.
  - YSHY `roll20-chat.png` was restored from the matching DPR-corrected recapture candidate after a temporary browser screenshot-scale mismatch was detected.
- Verification recovered the authoritative YSHY chat baseline: raw mismatch `26.45%`, aligned mismatch `22.33%`, no crop/scale/template-pixel suspect.
- `status:roll20-actual` now reports `chatCurrentMetrics=1/3`; AW2E and Les-Oublies still need live Roll20 recapture with filter fields.
- `paint-dim-background` moved from "needs new sidecar fields" to actual style contradiction for YSHY, because the real Roll20 DOM does not apply a CSS filter. Keep the paint-filter candidate out of production.
- `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH`.
- Claim boundary: this is local-only evidence refinement. No production renderer CSS, no visual parity claim, no private/generated evidence committed.

## 2026-06-20 YSHY Paint Filter Proof Gate

- Split the current YSHY paint candidate into diagnostic sub-candidates:
  - `paint-dim-background`
  - `paint-dim-brightness`
  - `paint-dim-saturate`
- Added computed `filter` capture to local ChatPane smoke and Roll20 chat capture snippets.
- Added paint/filter style proof for the paint candidates.
- Updated Roll20 chat capture planning and actual status so current chat DOM sidecars require `latestTemplate.computedStyle.filter` and `table.computedStyle.filter`.
- Candidate comparison result:
  - `paint-dim-brightness`: no gain, YSHY remains `22.33%`.
  - `paint-dim-saturate`: no gain, YSHY remains `22.33%`.
  - `paint-dim-background`: still the only current paint candidate with YSHY gain, `22.33% -> 19.85%` (`-2.48%`), no fixture regressions.
- Style proof result: `paint-dim-background` is now `NEEDS_NEW_SIDECAR_FIELDS`, not style-compatible, because existing actual Roll20 sidecars lack computed `filter` fields.
- Status result: `chatCurrentMetrics=0/3`; all three fixtures need same-action Roll20 chat DOM sidecar recapture with filter fields before paint/rasterization conclusions.
- `gate:roll20-renderer-action` still returns `HOLD_PRODUCTION_RENDERER_PATCH` and now includes the paint-filter sidecar blocker.
- Claim boundary: diagnostic-only. No production ChatPane CSS, no Roll20 visual parity claim, no private/generated evidence committed.

## 2026-06-20 YSHY Crop-Origin Candidate Rejected

- Added diagnostic-only ChatPane geometry policy `coc-crop-origin-y20`.
- Added candidate comparison entries for:
  - `coc-crop-origin-y20`
  - `coc-table-actual-width-dim-background`
  - `coc-crop-origin-y20-dim-background`
- Generated local smoke evidence for the new candidates. All three prepared fixtures rendered rolltemplate cards successfully.
- Candidate comparison result:
  - `coc-crop-origin-y20`: no gain. YSHY stays at `22.33%` aligned mismatch.
  - `coc-table-actual-width-dim-background`: same as `paint-dim-background`, YSHY `19.85%`, delta `-2.48%`.
  - `coc-crop-origin-y20-dim-background`: same as `paint-dim-background`, YSHY `19.85%`, delta `-2.48%`.
- Updated best-candidate tie-breaking in the table-width budget, width reconciliation, and table-intrinsic probe so equally scoring composite candidates do not hide the simpler candidate.
- Interpretation: forcing actual table width and a simple `+20px` CoC y-origin shift do not explain the remaining YSHY mismatch. The next YSHY probe should focus on paint/background/rasterization and actual Roll20 user CSS activation around the CoC template, not table-width or y-offset hacks.
- `gate:roll20-renderer-action` still returns `HOLD_PRODUCTION_RENDERER_PATCH`.
- Claim boundary: diagnostic-only. No production ChatPane CSS, no Roll20 visual parity claim, no private/generated evidence committed.

## 2026-06-20 YSHY Table Intrinsic Probe

- Added `scripts/roll20_chat_table_intrinsic_probe.mjs` and `corepack pnpm run diagnose:roll20-chat-table-intrinsic-probe`.
- The probe compares local ChatPane DOM metrics with actual Roll20 chat sidecars for root/table/caption/first-cell width, table scrollWidth, style deltas, row uniformity, and crop/top-offset signals.
- Wired the probe into `gate:roll20-renderer-action`.
- Current result on `2026-06-18-state-map-v1`:
  - AW2E: `ROOT_OR_MESSAGE_WIDTH_CONTEXT`, root delta `+12px`, table delta `+15.744px`, scroll delta `+16px`. This keeps AW2E on the message/content-width track.
  - Les-Oublies: `WIDTH_SECONDARY`, table delta `+0.8px`.
  - YSHY 1BU: `TABLE_WIDE_INTRINSIC_WITH_CROP_OFFSET`, root delta `0px`, table delta `-24.309px`, scroll delta `-24px`, row spread `0px`, max cell delta `+0.909px`, uniform top offset `+125.884px`.
- Interpretation: YSHY is not a per-cell allocation problem and should not be handled with transform, global font, or spacing bundles. The next diagnostic candidate must combine CoC/YSHY table intrinsic width with rolltemplate crop/top-origin context.
- `gate:roll20-renderer-action` still returns `HOLD_PRODUCTION_RENDERER_PATCH`.
- Claim boundary: diagnostic-only. No production ChatPane CSS, no Roll20 visual parity claim, no private/generated evidence committed.

## 2026-06-20 YSHY Table-Width Budget

- Added `scripts/roll20_chat_table_width_budget.mjs` and `corepack pnpm run diagnose:roll20-chat-table-width-budget`.
- The report consolidates width model, intrinsic width model, font/glyph model, message shell model, candidate comparison, style proof, and chat parity into a table-width delta budget.
- Current result on `2026-06-18-state-map-v1`:
  - AW2E: `MESSAGE_CONTENT_WIDTH_BUDGET`, table delta `+15.744px`, measureText table delta `+15.602px`, residual `+0.142px`, best candidate `aw2e-message-full-width`.
  - Les-Oublies: `WIDTH_SECONDARY`, table delta `+0.8px`.
  - YSHY 1BU: `LAYOUT_CONSTRAINT_AFTER_REJECTED_CSS`, table delta `-24.309px`, measureText table delta `-54.946px`, residual `+30.637px`.
- Interpretation: YSHY font/text metrics explain the direction but over-explain the width delta, so the remaining work is a table-layout/intrinsic constraint model. Broad font/typography candidates, spacing/letter candidates, and transform/scale candidates are already rejected or style-contradicted.
- `gate:roll20-renderer-action` now surfaces this budget evidence while still returning `HOLD_PRODUCTION_RENDERER_PATCH`.
- Verification: `node --check`, `diagnose:roll20-chat-table-width-budget`, and `gate:roll20-renderer-action`.
- Claim boundary: diagnostic-only. No production ChatPane CSS, no Roll20 visual parity claim, no private/generated evidence committed.

## 2026-06-20 AW2E Message-Shell Candidate

- Added diagnostic-only ChatPane geometry policy `aw2e-message-full-width`.
- The candidate uses `:has(.sheet-rolltemplate-aw)` to make only AW2E rolltemplate chat messages use the observed full Roll20 chat message width. It does not widen all chat cards.
- Browser smoke: `rolltemplate-chat-smoke-aw2e-message-full-width` PASSed AW2E, Les-Oublies, and YSHY.
- Candidate comparison:
  - AW2E aligned delta `-7.63%`.
  - Les-Oublies delta `0%`.
  - YSHY delta `0%`.
  - Mean delta `-2.54%`, regressions `0`.
- Candidate style proof:
  - `aw2e-message-full-width` is `STYLE_COMPATIBLE_NEEDS_PIXEL_REVIEW`.
  - AW2E local/actual chat/message widths match at `340px`.
  - Les-Oublies and YSHY are `STYLE_NEUTRAL`; their actual message width remains matched and the candidate does not modify them.
- Width reconciliation now chooses `aw2e-message-full-width` as AW2E's best candidate instead of the more hardcoded `aw2e-root-width-actual`.
- Renderer gate remains `HOLD_PRODUCTION_RENDERER_PATCH` because the overall renderer axes still disagree across fixtures, especially YSHY table intrinsic sizing.
- Claim boundary: this is a better diagnostic candidate, not production CSS and not Roll20 visual parity.

## 2026-06-20 Chat Message Shell Model

- Added `scripts/roll20_chat_message_shell_model.mjs` and `corepack pnpm run diagnose:roll20-chat-message-shell`.
- The report separates Roll20 chat message-box geometry from rolltemplate table/template geometry:
  - message width delta
  - content/template width delta
  - chat-right gutter delta
  - template left/right inset inside the message
  - actual shell classification (`FULL_CHAT_WIDTH_MESSAGE` vs `INSET_CHAT_WIDTH_MESSAGE`)
- Current evidence on `2026-06-18-state-map-v1`:
  - AW2E: `MESSAGE_CONTENT_WIDTH_MODEL_REQUIRED`, actual shell `FULL_CHAT_WIDTH_MESSAGE`, message delta `+12px`, content delta `+12px`, gutter delta `0px`.
  - Les-Oublies: `MESSAGE_SHELL_SECONDARY`, actual shell `INSET_CHAT_WIDTH_MESSAGE`, message delta `0px`.
  - YSHY 1BU: `MESSAGE_SHELL_SECONDARY`, actual shell `INSET_CHAT_WIDTH_MESSAGE`, message delta `0px`; width work remains table/intrinsic, not message shell.
- Wired this report into `gate:roll20-renderer-action`. The gate still returns `HOLD_PRODUCTION_RENDERER_PATCH`, but now names AW2E's next work as a per-template message/content-width model rather than a global chat shell width patch.
- Verification: `node --check`, `build`, default `rolltemplate_chat_smoke`, `diagnose:roll20-chat-width`, `diagnose:roll20-chat-message-shell`, `diagnose:roll20-chat-width-reconciliation`, and `gate:roll20-renderer-action`.
- Claim boundary: diagnostic-only. No product default ChatPane CSS changed, no visual parity claim, no private/generated evidence committed.

## 2026-06-20 Chat Message/Content Width Split

- Added diagnostic-only ChatPane geometry policy `roll20-chat-shell-width-340`.
- `scripts/rolltemplate_chat_smoke.mjs` now records local `.message` rect/style evidence as `cardInfo.latestMessage` and `cardInfo.messages`, matching the actual Roll20 sidecar shape closely enough for shell-width style proof.
- `scripts/roll20_chat_width_model.mjs` now classifies a fixture as `CHAT_MESSAGE_CONTENT_WIDTH_MODEL_REQUIRED` when message width and template width deltas move together. This prevents AW2E from being mislabeled as only a table-intrinsic problem.
- Current evidence:
  - AW2E width model: `CHAT_MESSAGE_CONTENT_WIDTH_MODEL_REQUIRED`.
  - Les-Oublies width model: `WIDTH_SECONDARY_OR_ACCEPTABLE`.
  - YSHY 1BU width model: `TABLE_WIDTH_MODEL_REQUIRED` / still routed to table intrinsic/crop context.
- Candidate evidence:
  - `roll20-chat-shell-width-340` smoke PASSed all fixtures but candidate comparison rejected it: mean delta `-2.07%`, regressions `2`, YSHY aligned mismatch worsened by `+0.88%`.
  - This confirms that global shell widening is not safe, even though AW2E's root-width issue is a message/content shell issue.
- Reconciliation now routes AW2E to `CHAT_MESSAGE_CONTENT_WIDTH`, Les-Oublies to `KEEP_DEFAULT`, and YSHY to `TABLE_SCROLL_INTRINSIC`.
- `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH`.
- Verification: `node --check`, `build`, `rolltemplate-chat-smoke-roll20-chat-shell-width-340`, `diagnose:roll20-chat-width`, `diagnose:roll20-chat-candidates`, `diagnose:roll20-chat-candidate-style`, `diagnose:roll20-chat-width-reconciliation`, and `gate:roll20-renderer-action`.
- Claim boundary: no product default renderer CSS, no visual parity claim, no generated/private evidence committed.

## 2026-06-20 AW2E Root Width Renderer Candidate

- Added diagnostic-only ChatPane policies for the current split renderer axes:
  - `aw2e-root-width-actual`
  - `aw2e-font-size-only`
  - `coc-table-actual-width`
  - `coc-table-intrinsic-clamp`
- Regenerated local browser chat smoke evidence for those candidates. These report outputs are ignored local evidence and were not committed.
- Candidate comparison result:
  - `aw2e-root-width-actual`: AW2E aligned mismatch `13.5% -> 5.87%` (`-7.63%`), no fixture regressions, mean delta `-2.54%`.
  - `aw2e-font-size-only`: only `-0.47%` AW2E gain, so font-size alone is not the primary fix.
  - `coc-table-actual-width`: no YSHY gain.
  - `coc-table-intrinsic-clamp`: no YSHY gain.
- Style proof result: `aw2e-root-width-actual` is `STYLE_COMPATIBLE_NEEDS_PIXEL_REVIEW`; actual Roll20 root width and local candidate root width are both `279px`, with `transform:none`.
- `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH`. The new evidence does not authorize a product default CSS patch; it routes the next AW2E work toward a generic rolltemplate root intrinsic-width model instead of hardcoded `279px`.
- Verification: `node --check` for changed `.mjs`, `build`, candidate browser smokes, `diagnose:roll20-chat-candidates`, `diagnose:roll20-chat-candidate-style`, `diagnose:roll20-chat-width-reconciliation`, and `gate:roll20-renderer-action`.
- Claim boundary: diagnostic-only policies, no visual parity claim, no UI exposure, no private report commit.

## 2026-06-20 Chat Width Reconciliation Gate

- Added `scripts/roll20_chat_width_reconciliation.mjs` and `corepack pnpm run diagnose:roll20-chat-width-reconciliation`.
- The new diagnostic consolidates chat parity, width model, intrinsic width, font/glyph, row geometry, residual, candidate comparison, and style-proof outputs into one fixture-level next experiment.
- Wired the report into `gate:roll20-renderer-action`, so the renderer gate now lists the next chat renderer experiment axis directly.
- Current result on `2026-06-18-state-map-v1`:
  - AW2E: `TEXT_METRIC_ALLOCATION`, P0. Table delta `+15.744px`, text residual `+0.142px`, scroll delta `+16px`. Next action is an AW2E-scoped exact text/cell allocation candidate.
  - Les-Oublies: `KEEP_DEFAULT`, P1. Current aligned mismatch is `6.34%`; do not spend the next global renderer patch here.
  - YSHY 1BU: `TABLE_SCROLL_INTRINSIC`, P0. Table delta `-24.309px`, text residual `+30.637px`, scroll delta `-24px`. Next action is a CoC/YSHY-scoped table intrinsic/scroll probe, not transform or broad font CSS.
- `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH`; the useful progress is that the next patches are now evidence-routed and fixture-scoped.
- Verification: `node --check`, `diagnose:roll20-chat-width-reconciliation`, `gate:roll20-renderer-action`, and `status:roll20-actual`.
- Claim boundary: no visual parity claim, no public UI, and no production ChatPane CSS change in this batch.

## 2026-06-20 Roll20 Chat Current-Metrics Normalization

- Confirmed the dedicated Roll20 editor tab currently shows YSHY chat only; applying AW2E through the visible Sandbox Tools file inputs dispatched files without translation errors but did not visibly swap the active sheet in this session.
- Instead of claiming a recapture, normalized existing actual Roll20 chat sidecars when they already contain measured legacy table evidence in `latestTemplate.computedChildren`.
- `scripts/roll20_actual_status.mjs` and `scripts/roll20_chat_capture_plan.mjs` now accept `legacy-computedChildren` table evidence as current for the `latestTemplate.tableStructure` requirement, while recording the source so this is not mistaken for a fresh sidecar.
- `scripts/roll20_chat_intrinsic_width_model.mjs` now keeps `tableStructure.table` and can synthesize table structure from legacy table evidence. This exposes table scroll/client/overflow deltas that were previously `n/a`.
- `scripts/roll20_chat_capture_plan.mjs` now checks `captureDprCorrection.cssClip` before old broad chat clips, removing the Les-Oublies false scale warning for a verified DPR-corrected template crop.
- Current status: `GENERATED_ACTUAL_SCREENSHOTS_DIFFED`, `generatedAuthoritative=YES`, `chatCaptureSuspects=0`, `chatCurrentMetrics=3/3`, `rendererReady=NO`.
- Current capture plan: AW2E, Les-Oublies, and YSHY all `PRESENT`; no current-metrics recapture blocker remains.
- Current renderer gate still holds production CSS. The next real work is fixture-specific renderer modeling: AW2E cell/text allocation, Les-Oublies paint/crop/shadow, and YSHY table scroll/intrinsic width.
- Verification: `node --check` for changed scripts, `status:roll20-actual`, `plan:roll20-chat-capture -- --all --require-current-metrics`, `diagnose:roll20-chat-intrinsic-width`, `diagnose:roll20-chat-parity`, `diagnose:roll20-chat-rows`, and `gate:roll20-renderer-action`.
- Claim boundary: this is evidence normalization and diagnostic accuracy work. It does not prove Roll20 visual parity and does not authorize a global ChatPane renderer patch.

## 2026-06-20 YSHY Roll20 Chat DPR Recapture Correction

- Found that the newest YSHY actual chat PNG had captured the foreground Roll20 Sandbox Tools panel instead of the `.sheet-rolltemplate-coc` rolltemplate. The `98.57%` chat mismatch was a bad-crop artifact.
- Added a crop-geometry guard in `scripts/roll20_chat_parity_diagnostics.mjs`: sidecars that explicitly record an uncorrected CSS clip with CDP `scale=1` are marked suspect, because that path can capture the wrong Roll20 screen region on high-DPR tabs.
- Used the dedicated Roll20 verification editor tab only, recaptured the visible YSHY rolltemplate with a DPR-multiplied CDP clip, downscaled it back to CSS template size, and updated only ignored local evidence under `reports/roll20-actual-compare/2026-06-18-state-map-v1/`.
- Current status after recapture: `GENERATED_ACTUAL_SCREENSHOTS_DIFFED`, `generatedAuthoritative=YES`, `chatCaptureSuspects=0`, `chatCurrentMetrics=1/3`, `rendererReady=NO`.
- Current chat parity after recapture: AW2E `15.07%` raw, Les-Oublies `7.38%` raw, YSHY `26.45%` raw / `22.33%` aligned. The YSHY mismatch is now trusted evidence again, but visual parity still fails.
- Renderer action remains `HOLD_PRODUCTION_RENDERER_PATCH`; AW2E and Les-Oublies still need same-action chat recapture with `latestTemplate.tableStructure`.
- Verification: `node --check scripts\roll20_chat_parity_diagnostics.mjs`, `roll20_actual_screenshot_diff`, `diagnose:roll20-chat-parity`, `diagnose:roll20-chat-intrinsic-width`, `status:roll20-actual`, `gate:roll20-renderer-action`, and `plan:roll20-chat-capture -- --all --require-current-metrics`.
- Claim boundary: no real sheet assets/screenshots are committed; this is evidence-gate hardening plus ignored local Roll20 recapture, not Roll20 visual parity.

## 2026-06-20 Roll20 Chat TableStructure Evidence Gate

- Added `tableStructure` capture to the local ChatPane rolltemplate smoke evidence: table box metrics, colgroup/col summaries, and longest-token text profile.
- Added the same `latestTemplate.tableStructure` field to generated Roll20 chat DOM probe snippets and self-test coverage.
- Updated `status:roll20-actual` so current chat metrics now require `latestTemplate.tableStructure`, not only row metrics/text measurement.
- Updated `gate:roll20-renderer-action` so intrinsic-width evidence exposes scroll/overflow/column/token deltas and blocks renderer tuning when current sidecars are stale.
- Latest status on `2026-06-18-state-map-v1`: `chatCurrentMetrics=0/3`, because AW2E, Les-Oublies, and YSHY actual sidecars predate `tableStructure`.
- Verification: `build`, `test:roll20-chat-capture-plan`, local `rolltemplate_chat_smoke` 3/3 PASS, `plan:roll20-chat-capture -- --all --require-current-metrics`, intrinsic/font/row diagnostics, `status:roll20-actual`, and `gate:roll20-renderer-action`.
- Claim boundary: this is stricter evidence gating. It does not fix Roll20 chat pixels and does not authorize production ChatPane CSS.

## 2026-06-20 Roll20 Chat Row Geometry Gate Evidence

- Fixed row-geometry comparison so actual Roll20 table style and cell evidence comes from `computedChildren` when current sidecars do not have the old `elements` array.
- Added fixture-level row geometry models and surfaced them inside `gate:roll20-renderer-action`.
- Latest split for `2026-06-18-state-map-v1`: AW2E is `CELL_ALLOCATION_WITH_UNIFORM_OFFSET`, Les-Oublies is `UNIFORM_OFFSET_PAINT_OR_CROP`, and YSHY 1BU is `TABLE_WIDE_WIDTH_WITH_UNIFORM_OFFSET`.
- The renderer gate still returns `HOLD_PRODUCTION_RENDERER_PATCH`. The important progress is that future work now has concrete, fixture-specific next actions instead of another unsafe global ChatPane CSS guess.
- Verification: `node --check` for both changed scripts, `diagnose:roll20-chat-rows`, `gate:roll20-renderer-action`, `lint`, and `build` all passed.
- Claim boundary: this is diagnostic/gate progress only. It does not make actual Roll20 chat visual parity pass and does not authorize production renderer CSS.

## 2026-06-20 Edit/Preview UI Labels and Design CSS Roundtrip

- Cleaned the user-facing mode/preview/layer role labels so the edit surface no longer exposes unclear translated wording for the main mode toolbar, preview toolbar, and layer role badges.
- Changed editor-generated design CSS classes to `sheet-r20-node-*` instead of `r20-node-*`. This keeps moved-object position CSS stable across export/re-import instead of letting the importer prefix it later.
- Verification: `lint`, `build`, `smoke:preview-edit-visual`, and `smoke:imported-edit-sync` all PASSed after rebuilding the static `out` bundle.
- Current local preview/edit evidence: AW2E mismatch `1.87%`, Les-Oublies `2.07%`, YSHY 1BU `1.02%`; imported edit sync PASSes all three fixtures with re-import stability.
- Claim boundary: this fixes a local edit-mode roundtrip/UX problem. It does not change the actual Roll20 renderer gate, which remains blocked by prior `HOLD_PRODUCTION_RENDERER_PATCH` evidence.

## 2026-06-20 YSHY Sanitize Typography Candidate Rejected

- Added diagnostic-only ChatPane policy `yshy-sanitize-typography`, scoped to `.sheet-rolltemplate-coc`, to test whether observed Roll20 typography/wrapping/border-spacing values explain the YSHY table-wide constraint.
- Local smoke PASSed all fixtures, but candidate comparison rejected it: mean aligned delta `+4.71%`, YSHY aligned mismatch worsened by `+14.12%` (`21.02%` -> `35.14%`).
- Renderer gate remains `HOLD_PRODUCTION_RENDERER_PATCH` and includes this candidate in rejected fixture-regressing evidence.
- Claim boundary: this is useful negative evidence. Do not expose or promote `yshy-sanitize-typography`; next YSHY work should isolate table intrinsic/max-content calculation or source rolltemplate structure rather than bundling observed computed styles.

## 2026-06-20 YSHY Table-Wide Constraint Model

- Enhanced `scripts/roll20_chat_intrinsic_width_model.mjs` with a `constraintModel` that distinguishes table-wide intrinsic constraint deltas from row content mismatch and cell allocation mismatch.
- Updated `scripts/roll20_renderer_action_gate.mjs` to surface `constraint`, `rowSpread`, and `maxCellDelta` in intrinsic evidence.
- Latest YSHY result: `TABLE_WIDE_CONSTRAINT_MODEL_REQUIRED` / `TABLE_WIDE_CONSTRAINT_NOT_TRANSFORM`, table delta `-24.309px`, row width delta spread `0px`, max cell delta `0.909px`, transform contradicted by actual Roll20 style proof.
- This rules out the previous broad transform/spacing direction and points the next P0 at table intrinsic/max-content sizing plus sanitize/font activation.
- Claim boundary: this is a sharper renderer diagnosis. It does not prove chat visual parity or authorize production ChatPane CSS.

## 2026-06-20 Chat Shell Geometry Center-Assumption Fix

- Found and fixed a diagnostic bug in `scripts/roll20_chat_shell_geometry.mjs`: local table offset was computed as `(rootWidth - tableWidth) / 2`, which created a false YSHY `+502.93px` shell offset.
- `scripts/rolltemplate_chat_smoke.mjs` now stores local rolltemplate root rects, and shell geometry uses actual root/table rects when available.
- After regenerating default local chat smoke, YSHY table offset is `0px/0px`, Les-Oublies is `-0.4px/-0.4px`, and shell geometry now classifies Les as `SHELL_OK_OR_SECONDARY`.
- YSHY remains a real blocker, but the axis is now corrected to table width/intrinsic layout (`tableDelta=-24.309px`) rather than a huge table anchoring error.
- Renderer gate remains `HOLD_PRODUCTION_RENDERER_PATCH`. Claim boundary: this is evidence cleanup and better diagnosis, not Roll20 chat parity.

## 2026-06-20 AW2E Text-Metric Candidate Probe

- Added diagnostic-only ChatPane typography policy `aw2e-text-metrics`, scoped to `.sheet-rolltemplate-aw` table/caption/cells. It is activated only through the smoke script/localStorage diagnostic path and does not change default product behavior.
- Added the candidate to `scripts/roll20_chat_candidate_compare.mjs` and documented the command in `scripts/README.md`.
- Local smoke PASSed all fixtures, but candidate comparison classified it as `no-meaningful-gain`: mean aligned delta `-0.13%`, regressions `0`, YSHY delta `0%`.
- Candidate style proof and renderer gate still keep production renderer action at `HOLD_PRODUCTION_RENDERER_PATCH`.
- Claim boundary: this disproves a simple AW2E text-metric-only fix. Continue with sanitize/order/crop/paint evidence before changing production ChatPane behavior.

## 2026-06-20 Chat Text-Width Model Split

- Enhanced `scripts/roll20_chat_font_glyph_model.mjs` so exact `textMeasureEvidence` is no longer summarized only as a mean delta. The report now compares table `measureText` deltas against actual table-width deltas and classifies a narrow `textWidthModel`.
- Updated `scripts/roll20_renderer_action_gate.mjs` to surface `textWidthModel` and table text residual in gate evidence.
- Latest split on `2026-06-18-state-map-v1`: AW2E is `TEXT_WIDTH_EXPLAINS_TABLE_WIDTH` with table text residual `+0.142px`; Les-Oublies is `TEXT_WIDTH_SECONDARY_TO_PAINT_OR_CELL_ALLOCATION` with table delta only `+0.8px`; YSHY is `TEXT_WIDTH_OVERCONSTRAINED_BY_LAYOUT` with table text residual `+30.637px`.
- Renderer gate remains `HOLD_PRODUCTION_RENDERER_PATCH`. This is a sharper diagnostic split, not a production CSS patch.
- Next P0: test fixture/template-specific probes from the split model instead of another broad ChatPane typography/width change.

## 2026-06-20 AW2E Actual Chat Text Measurement Recapture

- Claimed the existing dedicated Roll20 verification editor tab only; no existing room/settings were modified.
- The visible Roll20 chat tab already contained actual AW2E `.sheet-rolltemplate-aw` chat cards.
- Ran the generated AW2E chat DOM probe through the actual Chrome/CDP page runtime because read-only Playwright evaluation cannot create a canvas 2D context.
- Captured actual `textMeasureEvidence` successfully: `MEASURED`, `12` samples, CSSOM font-face data present.
- Fixed the generated probe schema so text-rasterization fields remain present as empty strings when the platform-specific value is unavailable. This prevents `mozOsxFontSmoothing` from disappearing during JSON serialization.
- A first screenshot attempt captured the foreground `Sheet Sandbox Tools` panel due to coordinate/DPR mismatch. That bad `roll20-chat.png` was removed.
- Recaptured using a DPR-multiplied CDP clip, then saved a template-only, CSS-sized `roll20-chat.png` for the latest visible AW2E rolltemplate card. Physical DPR source images remain ignored local evidence beside the final PNG.
- Latest AW2E chat parity now compares local `267x189` vs actual `279x189`, mismatch `15.07%`.
- Latest font/glyph model moves AW2E to `TEXT_MEASUREMENT_DELTA_MODEL_REQUIRED` with mean text-width delta `3.642px`.
- Les-Oublies and YSHY still lack actual `textMeasureEvidence.samples`, so the renderer gate remains `HOLD_PRODUCTION_RENDERER_PATCH`.
- Verification: `roll20_actual_screenshot_diff`, `diagnose:roll20-chat-parity`, `diagnose:roll20-chat-font-glyph`, `status:roll20-actual`, `gate:roll20-renderer-action`, and `plan:roll20-chat-capture --all --require-current-metrics`.
- Claim boundary: this is one fixture's actual Roll20 chat measurement progress. It does not prove Roll20 visual parity and does not authorize production ChatPane CSS.

## 2026-06-20 Chat Text Measurement Evidence Gate

- Added local `textMeasureEvidence` to `scripts/rolltemplate_chat_smoke.mjs`: canvas `measureText` widths, element widths, computed CSS font strings, probe strings, and CSSOM font-face status are now captured beside local ChatPane rolltemplate smoke evidence.
- Added the same `textMeasureEvidence` shape to generated Roll20 chat DOM probe snippets in `scripts/roll20_chat_capture_plan.mjs`.
- `--require-current-metrics` now treats actual Roll20 chat sidecars without `textMeasureEvidence.samples` as stale.
- Updated `scripts/roll20_chat_font_glyph_model.mjs` so missing exact text measurement sidecars produce `TEXT_MEASURE_RECAPTURE_REQUIRED`, not a broad font/spacing CSS recommendation.
- Latest local smoke still PASSes AW2E, Les-Oublies, and YSHY; local text samples are present (`12`, `12`, and `19` respectively).
- Latest actual Roll20 run `2026-06-18-state-map-v1` needs recapture for all three chat sidecars because existing actual sidecars predate text measurement evidence.
- Renderer gate remains `HOLD_PRODUCTION_RENDERER_PATCH` and now explicitly blocks another ChatPane text-width candidate until actual Roll20 sidecars are recaptured.
- Verification: `node --check` for changed scripts, `test:roll20-chat-capture-plan`, `corepack pnpm run build`, local `rolltemplate_chat_smoke`, `diagnose:roll20-chat-font-glyph`, `plan:roll20-chat-capture --all --require-current-metrics`, and `gate:roll20-renderer-action`.
- Claim boundary: this is diagnostic infrastructure and recapture routing only. It does not prove Roll20 chat/template parity and does not authorize production renderer CSS.

## 2026-06-20 CoC Table-Scale Style Proof Rejected

- Added `scripts/roll20_chat_intrinsic_width_model.mjs` and package alias `diagnose:roll20-chat-intrinsic-width`.
- The diagnostic compares local ChatPane rolltemplate table/row/cell metrics against actual Roll20 chat DOM sidecars and records transform style-proof status.
- Latest result: `INTRINSIC_WIDTH_MODEL_REQUIRED`.
- YSHY/CoC is now classified as `TRANSFORM_REJECTED_INTRINSIC_WIDTH_MODEL_REQUIRED`: table delta `-24.309px`, first-cell delta `-0.909px`, and actual Roll20 table transform is `none`.
- AW2E and Les-Oublies are classified as `CSS_METRIC_DELTA_INTRINSIC_MODEL_REQUIRED`, which keeps broad/global ChatPane width or scale patches blocked.
- Added diagnostic-only spacing candidates in `ChatPane`: `roll20-intrinsic-spacing`, `roll20-border-spacing`, and `roll20-letter-spacing`.
- Current spacing candidate result: `roll20-border-spacing` is no meaningful gain, while `roll20-letter-spacing` and combined `roll20-intrinsic-spacing` regress YSHY from `21.45%` to `24.45%` aligned mismatch.
- Updated the intrinsic-width model to read candidate comparison evidence. It now classifies AW2E/Les as `CSS_METRIC_CANDIDATES_REJECTED` and YSHY/CoC as `TRANSFORM_AND_SPACING_REJECTED_FONT_GLYPH_MODEL_REQUIRED`.
- Added `scripts/roll20_chat_font_glyph_model.mjs` and package alias `diagnose:roll20-chat-font-glyph`.
- The font/glyph model compares local and actual Roll20 font availability, computed font stacks, rejected broad font candidates, and row/cell text-width signals.
- Current result: `FONT_GLYPH_MODEL_REQUIRED`.
- YSHY/CoC is `FONT_AVAILABILITY_CHANGED_CANDIDATES_REJECTED`: actual Roll20 differs in font availability and table font stack, but prior broad font/typography candidates regress or fail to help.
- AW2E and Les-Oublies are `FONT_STYLE_CHANGED_CANDIDATES_REJECTED`: exact text measurement and CSSOM font-face activation need probing before another renderer candidate.
- Next P0: capture actual/local per-font `measureText` widths and CSSOM font-face activation rather than another scale, spacing, or global ChatPane width candidate.
- The renderer action gate now reads the intrinsic-width report and surfaces these next actions while keeping production renderer action on HOLD.
- Claim boundary: this is still diagnostic evidence. It does not prove Roll20 chat/template parity and does not authorize production CSS.
- Extended `scripts/roll20_chat_candidate_style_proof.mjs` so it checks `single-fixture-only` candidates, not only `candidate-needs-style-proof`.
- Added `coc-table-scale-x` to the candidate smoke lookup and routed it through the same table-transform proof as `table-scale-x`.
- Result: style proof reports `contradicted=2/2`; both `no-shadow` and `coc-table-scale-x` are contradicted by actual Roll20 computed styles.
- The decisive YSHY/CoC finding: actual Roll20 table `transform` is `none`, while the local candidate uses `scaleX(0.981)`.
- Renderer policy now classifies YSHY as `NEEDS_NARROW_TEMPLATE_MODEL` instead of leaving the transform candidate as a viable private renderer candidate.
- Renderer gate remains `HOLD_PRODUCTION_RENDERER_PATCH` and explicitly lists `coc-table-scale-x` under actual-style contradictions.
- Next P0: build a narrow intrinsic table-width model for `.sheet-rolltemplate-coc` instead of using CSS transform.

## 2026-06-20 CoC Rolltemplate Table-Scale Candidate

- Added diagnostic-only ChatPane geometry policy `coc-table-scale-x`, scoped to `.sheet-rolltemplate-coc table`.
- Added `rolltemplate_chat_smoke` support and candidate-comparison coverage at `reports/rolltemplate-chat-smoke-coc-table-scale-x`.
- The candidate mechanically PASSed AW2E, Les-Oublies, and YSHY smoke.
- Candidate comparison result: `coc-table-scale-x` improves YSHY aligned mismatch from `21.45%` to `20.11%` (`-1.34%`) with `0` regressions.
- Global `table-scale-x` still remains rejected because it regresses another fixture; this new candidate proves the narrower per-template path is safer but still not production-ready.
- Renderer policy keeps YSHY as `CANDIDATE_ONLY_DO_NOT_EXPOSE`; actual Roll20 style proof or a better intrinsic-width model is still required.
- Renderer gate remains `HOLD_PRODUCTION_RENDERER_PATCH`; no visual parity claim and no public UI/default renderer change.
- Next P0: prove or replace the YSHY/CoC width candidate using actual Roll20 style evidence, then separately address Les shell/message width.

## 2026-06-20 Per-Template Chat Width Model

- Added `scripts/roll20_chat_width_model.mjs` and package alias `diagnose:roll20-chat-width`.
- The diagnostic compares local ChatPane sidecars with actual Roll20 chat DOM evidence and separates chat shell/message width, table intrinsic width, and overflowed table crop behavior.
- Wired the width model summary into `gate:roll20-renderer-action` so future agents see it before trying ChatPane width, padding, or overflow CSS.
- Current result: `WIDTH_MODEL_REQUIRED`, actionable `2/3`.
- `official-roll20-AW2E`: `WIDTH_SECONDARY_OR_ACCEPTABLE`.
- `official-roll20-Les-Oublies`: `CHAT_SHELL_WIDTH_MODEL_REQUIRED`, with table width nearly aligned but shell/message/crop width still needing a separate model.
- `yshy-commission-1bu`: `TABLE_WIDTH_MODEL_REQUIRED`, actual table/crop ratio `4.607x`; this is an overflowed large-table crop case, not a generic narrow-card width patch.
- Renderer gate remains `HOLD_PRODUCTION_RENDERER_PATCH`; this is evidence routing, not Roll20 visual parity.
- Next P0: create a targeted candidate for Les shell/message width and a separate YSHY overflow/table intrinsic-width model. Do not merge them into one global ChatPane CSS patch.

## 2026-06-20 Custom Rolltemplate App-Class Leak Removed

- Removed app UI wrapper classes from imported/custom rolltemplate card roots in `components/editor/ChatPane.tsx`.
- Custom rolltemplate bodies now mount with `sheet-rolltemplate-*` only, so Tailwind `text-xs` and the app fallback card class no longer directly override the custom template root.
- Kept the previous app card styling only for the generated fallback rolltemplate body, where there is no imported custom Roll20 template to preserve.
- Verification: production build passed; `rolltemplate_chat_smoke` still passed for AW2E, Les-Oublies, and YSHY.
- Diagnostics after the change: chat parity remains `HIGH_MISMATCH` with authoritative normalized high mismatch `2/3` and max aligned mismatch `21.45%`.
- Current raw crop mismatches: AW2E `7.09%`, Les-Oublies `18.38%`, YSHY `24.84%`.
- Renderer gate remains `HOLD_PRODUCTION_RENDERER_PATCH`; this patch fixes a real CSS isolation bug but does not prove Roll20 visual parity.
- Next P0: continue with a narrower per-template chat renderer model rather than global ChatPane width/font/paint CSS.

## 2026-06-20 Cell Metrics Candidate Rejected

- Added hidden diagnostic-only ChatPane typography policy `roll20-cell-metrics`.
- The candidate keeps user template font-family intact while applying Roll20-like rolltemplate font-size/letter-spacing/cell metrics.
- Added the candidate to `rolltemplate_chat_smoke`, `roll20_chat_candidate_compare`, and `roll20_chat_font_cell_model`.
- Functional smoke passed for AW2E, Les-Oublies, and YSHY.
- Pixel comparison rejected it: AW2E improved `7.35% -> 6.59%`, but Les-Oublies worsened `12.90% -> 13.30%` and YSHY worsened `21.45% -> 34.93%`.
- The font/cell model now classifies Les-Oublies as `CELL_METRIC_CANDIDATES_REJECTED`.
- Next P0: inspect CSS cascade/order and intrinsic table allocation for Les. Font-size/letter-spacing/cell metric candidates are not enough.

## 2026-06-20 Chat Font/Cell Model Boundary

- Added `scripts/roll20_chat_font_cell_model.mjs` and package alias `diagnose:roll20-chat-font-cell`.
- The diagnostic combines shell geometry, style context, candidate comparison, and renderer policy evidence to distinguish narrow cell allocation work from broad typography patches.
- Wired the font/cell model summary into `gate:roll20-renderer-action`.
- Current Les-Oublies result: `NARROW_CELL_ALLOCATION_MODEL_REQUIRED`. The first cell is `+4.141px` wider in actual Roll20 and font size differs by `+1.65px`, but the broad `template-typography` candidate only moved Les by `-0.01%`, so broad typography remains rejected.
- Current YSHY result: `WIDTH_MODEL_BEFORE_FONT_CELL`; solve table width/overflow before font/cell tuning.
- Current AW2E result: `KEEP_DEFAULT_FOR_NOW` because aligned mismatch is below the high-mismatch threshold.
- Claim boundary: this is a model-boundary diagnostic. It does not prove Roll20 chat parity and does not authorize production ChatPane typography, width, padding, or paint CSS.

## 2026-06-20 Chat Shell Geometry Probe

- Added `scripts/roll20_chat_shell_geometry.mjs` and package alias `diagnose:roll20-chat-shell-geometry`.
- The probe compares local ChatPane rolltemplate root/table/cell geometry against actual Roll20 chat DOM sidecars and writes local-only shell geometry reports.
- Wired shell geometry into `gate:roll20-renderer-action`.
- Current Les-Oublies result: `CELL_WIDTH_MODEL_MISMATCH`. Message width and template width match, actual crop margins are `2/2/2/2`, but actual first cell width is `+4.141px` wider and template height is `-1.2px` compared with local.
- Current YSHY result: `WIDTH_MODEL_REQUIRED`, with table width delta `-24.309px`.
- Current AW2E result: shell geometry is secondary for now because the aligned chat mismatch is below the high-mismatch threshold.
- Claim boundary: this narrows the root cause. It does not prove Roll20 chat parity and does not authorize a production ChatPane font/width/paint patch.

## 2026-06-20 Chat Mask Strategy Gate

- Added `scripts/roll20_chat_mask_strategy.mjs` and package alias `diagnose:roll20-chat-mask-strategy`.
- The diagnostic reads existing local-only chat parity/residual/candidate reports and turns row-band, left-edge, luma, and mask evidence into a next renderer strategy.
- Wired the strategy summary into `gate:roll20-renderer-action`.
- Current result: `official-roll20-Les-Oublies` is `RECROP_OR_SHELL_CONTEXT_BEFORE_CSS`, so the next work should compare actual/local message shell padding, template crop x/y, and row-band masks before testing another CSS candidate.
- Current result: `yshy-commission-1bu` is `MODEL_TEMPLATE_WIDTH_BEFORE_PAINT`, so paint candidates should wait until a per-template chat width model exists.
- Current result: `official-roll20-AW2E` stays `KEEP_DEFAULT_FOR_NOW` on the chat axis.
- Claim boundary: this is strategy/gating progress only. It does not prove Roll20 chat parity and does not enable production ChatPane renderer CSS.

## 2026-06-20 Chat Paint Residual Candidates

- Added hidden diagnostic-only ChatPane paint policies: `roll20-dim-background` and `roll20-edge-shadow`.
- Extended `rolltemplate_chat_smoke` with `--chat-paint-policy` and added both candidate screenshot sets to `roll20_chat_candidate_compare`.
- Local smoke result: both paint candidates passed all 3 rolltemplate fixtures mechanically.
- Candidate comparison result: `paint-dim-background` improves YSHY (`21.45% -> 19.65%`) but barely moves Les-Oublies (`12.90% -> 12.85%`), so it is not a Les fix and remains diagnostic-only.
- Candidate comparison result: `paint-edge-shadow` worsens Les-Oublies (`12.90% -> 13.15%`) and provides no meaningful gain.
- Renderer gate remains `HOLD_PRODUCTION_RENDERER_PATCH`; no production ChatPane renderer CSS was promoted.
- Next P0: inspect Les-Oublies chat crop shell/row-band masks/raster boundary instead of trying broader paint or typography patches.

## 2026-06-20 Preview Diagnostic Chrome Cleanup

- Removed the default product-surface `Sandbox 예상` control from `MainAreaToolbar`. Sandbox expected rendering remains a verification/export diagnostic path, not a normal preview toggle.
- Removed the preview toolbar render-mode switch and layer-filter dropdown. Preview mode now presents the iframe Roll20-style render path without exposing edit/shadow or layer-filter concepts; edit mode remains the place for overlays and layer manipulation.
- Updated `scripts/roll20_sandbox_preview_smoke.mjs` so the Roll20 Sandbox expected-render smoke uses `window.__perfHook.setRoll20SandboxSanitize(true)` directly instead of requiring a user-visible toolbar button.
- Verification: `corepack pnpm run lint`, `corepack pnpm run build`, focused `smoke:roll20-sandbox-preview` for Les-Oublies, and `guard:roll20-renderer-model` passed.
- Claim boundary: this is product UI cleanup and smoke preservation only. It does not change production renderer CSS, does not expose `roll20RendererModel`, and does not prove Roll20 visual parity.

## 2026-06-20 Input-Flow Rollout Policy

- Extended `scripts/roll20_input_flow_axis_diagnostics.mjs` with a machine-readable `modelRollout` section.
- The rollout policy now records `globalDecision`, `publicUiDecision`, candidate models, blockers, and per-fixture product decisions. Current policy is `DO_NOT_ENABLE_GLOBALLY` and `DO_NOT_EXPOSE`.
- Per-fixture current evidence: AW2E remains `KEEP_DEFAULT_BLOCKS_GLOBAL`; Les-Oublies and YSHY are `CANDIDATE_ONLY_DO_NOT_EXPOSE`.
- Updated `scripts/roll20_renderer_action_gate.mjs` to surface the rollout policy as standard warning/evidence so agents do not have to infer it from prose.
- Verified: `diagnose:roll20-input-flow-axis`, `gate:roll20-renderer-action`, and `diagnose:roll20-renderer-blocker`.

## 2026-06-20 Renderer Model Rollout Guard

- Added `scripts/roll20_renderer_model_guard.mjs` and package script `guard:roll20-renderer-model`.
- The guard fails if a non-default `roll20RendererModel` (`input-flow-27` or `input-flow-276`) is enabled in app/component/lib production paths outside the gated `buildDoc` implementation.
- Wired the guard into `guard:roll20-evidence` and `.githooks/pre-commit` so future sessions cannot accidentally ship the diagnostic input-flow renderer model while `globalModelSafe=NO`.
- Current evidence remains split: `diagnose:roll20-input-flow-axis` reports `SPLIT_RENDERER_AXIS_CONFIRMED`, apply candidates `2`, block global model `1`, and `globalModelSafe=NO`.
- Verified: `guard:roll20-renderer-model`, `guard:roll20-evidence`, `diagnose:roll20-input-flow-axis`, `corepack pnpm run lint`, and `corepack pnpm run build`.

## 2026-06-20 Renderer Blocker Matrix Chat Axis

- Updated `scripts/roll20_renderer_blocker_matrix.mjs` to read chat parity/style/candidate reports in addition to full-root candidate reports.
- The blocker matrix now keeps its conclusion aligned with `gate:roll20-renderer-action`; when the gate is `HOLD_PRODUCTION_RENDERER_PATCH`, the matrix no longer presents a targeted experiment as if it were a production-ready path.
- Added a `Chat Rolltemplate Axis` table showing fixture crop mismatch, local/actual crop sizes, table-width deltas, top style deltas, and candidate regression risk. Current evidence still blocks chat parity: authoritative high mismatch `2/3`, max aligned mismatch `21.452%`, and opposite table-width deltas across AW2E/YSHY.
- Re-ran `diagnose:roll20-computed-style-context`; it still reports `DO_NOT_PROMOTE_DIRECTLY` for `3/3`, reinforcing that the next implementation should define a renderer-model boundary instead of shipping global CSS.
- Verified: `diagnose:roll20-renderer-blocker`, `diagnose:roll20-computed-style-context`, `corepack pnpm run lint`, and `corepack pnpm run build`.

## 2026-06-20 Chat Candidate Proof Gate Cleanup

- Tested promoting the Roll20-compatible `overflow-wrap: break-word` behavior into default ChatPane CSS, then reverted it because regenerated parity numbers did not support a global production patch.
- Updated `scripts/roll20_renderer_action_gate.mjs` so style-proof-classified candidates are not also counted as "without actual Roll20 style proof". Rejected and sidecar-missing candidates remain blockers; style-compatible candidates become evidence only.
- Regenerated local-only chat smoke/diagnostic evidence. Current renderer gate remains `HOLD_PRODUCTION_RENDERER_PATCH`: chat/template mismatch is still `2/3`, authoritative max aligned mismatch is `21.45%`, and actual table-width deltas still conflict across fixtures (`AW2E +33.134px`, `Les +0.8px`, `YSHY -24.309px`).
- Verified: `node scripts/rolltemplate_chat_smoke.mjs`, `diagnose:roll20-chat-parity`, `diagnose:roll20-chat-style`, `diagnose:roll20-chat-candidates`, `diagnose:roll20-chat-candidate-style`, `gate:roll20-renderer-action`, `corepack pnpm run lint`, and `corepack pnpm run build`.

## 2026-06-20 Roll20 Chat Current-Metric Recapture Complete

- Used the dedicated `Codex Roll20 Verify` Roll20 Sandbox/editor only. Existing campaign rooms remained observation-only and were not modified.
- Recaptured actual Roll20 chat evidence for AW2E, Les-Oublies, and YSHY with same-action PNG crops plus DOM sidecars containing `textRendering`, `webkitFontSmoothing`, and table/root computed styles.
- The capture plan now reports `ALL_CHAT_EVIDENCE_TRUSTED` with `plannedFixtures=0/3`; actual status reports `chatCurrentMetrics=3/3` and `chatCurrentMetricsMissing=0`.
- The richer sidecars reject `text-auto-aa` as a production ChatPane candidate: actual Roll20 reports `textRendering=optimizespeed` for the recaptured fixtures, not the local candidate's `auto`.
- Current renderer gate still correctly holds: actual Roll20 rolltemplate crops differ from local ChatPane for `3/3` normalized fixtures, with authoritative max aligned mismatch `23.07%`.
- Claim boundary: this completes the stale-sidecar evidence task only. It does not prove Roll20 visual parity, does not make `rendererReady` pass, and does not authorize production renderer CSS.
- Next P0: build a narrower ChatPane renderer model from actual Roll20 shell/template geometry instead of promoting broad width, padding, shadow, text-rendering, or table-transform patches.

## 2026-06-20 Text Rasterization Sidecar Fields

- Added text-rasterization style fields (`textRendering`, `webkitFontSmoothing`, `mozOsxFontSmoothing`) to local `rolltemplate_chat_smoke` computed style sidecars and to the Roll20 chat DOM probe snippet generated by `plan:roll20-chat-capture`.
- Updated `status:roll20-actual` and `plan:roll20-chat-capture -- --require-current-metrics` so existing actual Roll20 chat sidecars are stale when those fields are missing.
- Re-ran local `rolltemplate-chat-smoke-text-auto-aa`; all 3 fixtures still PASS and the local candidate sidecar now records `textRendering=auto` / `webkitFontSmoothing=auto`.
- Current actual Roll20 sidecars are now intentionally marked current-metric stale for `3/3` fixtures until AW2E, Les-Oublies, and YSHY are recaptured with the new fields.
- Claim boundary: this does not prove `text-auto-aa`; it creates the evidence path needed to prove or reject it on the next actual Roll20 chat recapture.

## 2026-06-20 Chat Candidate Actual-Style Proof

- Added `scripts/roll20_chat_candidate_style_proof.mjs` and package alias `diagnose:roll20-chat-candidate-style`.
- The diagnostic reads local candidate smoke sidecars plus actual Roll20 `roll20-chat-dom-evidence.json` files and checks whether pixel-improving candidates match actual computed styles.
- Latest proof rejects `table-scale-x` for all 3 fixtures because actual Roll20 table `transform` does not match `scaleX(0.981)`.
- Latest proof rejects blanket `no-shadow` because YSHY actual Roll20 cells still have strong `text-shadow`.
- Latest proof rejects `roll20-break-word` as global CSS because it only matches YSHY; AW2E and Les-Oublies actual sidecars do not match that overflow-wrap candidate.
- `text-auto-aa` remains unproven because current sidecars do not capture `text-rendering` / font smoothing. Capture richer sidecar fields before considering that candidate.
- Updated the renderer gate so style-proof contradictions and missing sidecar fields are standard blockers.
- Claim boundary: this removes unsafe candidates from production consideration. It does not change production CSS and does not solve Roll20 chat parity.

## 2026-06-20 Chat Candidate Gate Hardening

- Updated `scripts/roll20_renderer_action_gate.mjs` to load the local-only chat candidate comparison report.
- The renderer gate now treats fixture-regressing chat candidates as blockers and also blocks numerically promising candidates until actual Roll20 computed-style evidence proves the same behavior.
- Latest gate output now includes a `Chat Candidate Boundary` table and explicitly keeps `no-shadow`, `table-scale-x`, `roll20-break-word`, and `text-auto-aa` diagnostic-only.
- Updated `scripts/roll20_chat_candidate_compare.mjs` console output to include risk, mean delta, and regression count so command output is harder to misread.
- Claim boundary: no production ChatPane CSS changed. This is a guardrail against unsafe renderer patches, not Roll20 visual parity.

## 2026-06-20 07:10 +09:00 - Les authoritative chat recapture cleared

Status: PARTIAL. The Roll20 evidence gate is now blocked by real renderer mismatch, not by a suspect Les-Oublies chat crop.

- Reclaimed the dedicated Roll20 verification editor/Sandbox tab only. No existing room or user campaign settings were modified.
- Captured the visible Les-Oublies `sheet-rolltemplate-initiative-roll` card from Roll20 text chat with CDP `Page.captureScreenshot`, then recorded the DOM rect and the paint-aligned screenshot clip in the ignored local sidecar.
- Updated ignored local evidence only under `reports/roll20-actual-compare/2026-06-18-state-map-v1/`; this evidence remains private/local and must not be committed.
- Verification: `plan:roll20-chat-capture -- --require-current-metrics` now reports `ALL_CHAT_EVIDENCE_TRUSTED`, `plannedFixtures=0/3`.
- Verification: `status:roll20-actual -- --require-actual` passes with `GENERATED_ACTUAL_SCREENSHOTS_DIFFED`, `generatedAuthoritative=YES`, `chatCaptureSuspects=0`, `chatActualCropGeometrySuspect=0`, and `chatActualTemplatePixelSuspect=0`.
- Verification: `diagnose:roll20-chat-parity` still reports `HIGH_MISMATCH`: AW2E `28.89%` raw, Les-Oublies `16.04%` raw, YSHY `26.98%` raw. The authoritative aligned high mismatch remains `2/3`, max `23.4%`.
- Current gate: `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH`; `gate:roll20-renderer-ready` is expected to fail with `rendererReady=NO`.
- Next P0: work on the actual local ChatPane/Roll20 shell-template renderer mismatch and default-state model. Do not spend another cycle on Les crop trust unless the diagnostics regress.

Follow-up diagnostic: Added `roll20-message-padding` as a local-only ChatPane geometry candidate after the fresh Roll20 crops showed local rolltemplate captures about `12px` wider. The candidate smoke passed functionally, but candidate comparison rejected it: YSHY aligned mismatch worsened `22.68% -> 27.54%`. This is now a negative-control candidate only, not production CSS.

Follow-up style context diagnostic: Added `diagnose:roll20-chat-style` to compare local ChatPane computed-style/row evidence directly against actual Roll20 chat sidecars. Latest run compares all 3 fixtures. It shows AW2E table width is actual `+33.134px` while YSHY table width is actual `-24.309px`, so a single message/card width patch cannot explain both. It also shows Les-Oublies is nearly geometry-aligned and mainly differs in shell typography. Tested the YSHY `overflow-wrap: break-word` clue as a local-only `roll20-break-word` candidate; it passed functional smoke but was rejected by pixel comparison (`22.68% -> 22.77%` aligned). Next P0 is table/font rasterization or shadow/scale diagnostics, not padding or break-word production CSS.

Follow-up renderer gate integration: `scripts/roll20_renderer_action_gate.mjs` now loads the chat-style context report and surfaces the conflicting table-width direction as a production blocker. Latest gate adds: AW2E `+33.134px`, Les-Oublies `+0.8px`, YSHY `-24.309px`; therefore a single ChatPane width/padding patch is explicitly blocked until a narrower renderer model explains the split.

## 2026-06-20 06:35 +09:00 - Roll20 chat crop foreground guard

Status: PARTIAL. This batch improves evidence truthfulness; Roll20 chat/template parity is still not solved.

- Found that the latest Les-Oublies `roll20-chat.png` was a bad crop of the VTT map/grid, even though the DOM sidecar still reported a visible `sheet-rolltemplate-initiative-roll`.
- Reverted the tentative production ChatPane width change. Live Roll20 DOM suggests the default chat shell is `340px`, but the pixel evidence is currently contaminated and must not drive production CSS yet.
- Added foreground-pixel sanity checks to `diagnose:roll20-chat-parity`: when the DOM sidecar has template text but the PNG has almost no dark/edge pixels, the fixture is marked `actualTemplatePixelSuspect`.
- Updated `status:roll20-actual` and `gate:roll20-renderer-action` to surface that suspect state and block renderer CSS tuning until recapture.
- Verification: `diagnose:roll20-chat-parity` now reports `actualTemplatePixelSuspect=1` and reduces authoritative normalized high mismatch from 3 fixtures to 2 fixtures.
- Verification: `gate:roll20-renderer-action` now separates the contaminated Les capture from real remaining chat mismatches; authoritative max aligned mismatch is `23.4%`, while the old `91.69%` number is explicitly treated as suspect-including evidence.
- Verification: `corepack pnpm run lint`, `corepack pnpm run build`, `status:roll20-actual`, `gate:roll20-renderer-action`, and `guard:roll20-evidence` passed.
- Next P0: recapture Les-Oublies chat from a visible text chat panel with matching screenshot surface coordinates, then rerun chat parity before any ChatPane/Roll20 chat shell CSS change.

Follow-up: Les-Oublies foreground was recaptured locally after narrowing the Roll20 viewport and scrolling the text chat panel. The new local-only `roll20-chat.png` shows the `Initiative :` template text, so `chatActualTemplatePixelSuspect` is now `0`; however the sidecar is explicitly marked as manual coordinate calibration, so `chatActualCropGeometrySuspect=1` and the renderer gate still blocks CSS tuning. Suspect-including max aligned mismatch changed from `91.69%` to `65.02%`; authoritative max aligned mismatch remains `23.4%` across AW2E/YSHY.

Follow-up status hardening: `status:roll20-actual` now separates diffed screenshots from authoritative generated evidence. Current status is `GENERATED_ACTUAL_SCREENSHOTS_DIFFED_WITH_SUSPECT_CHAT`, with `generatedAuthoritative=NO`, `chatCaptureSuspects=1`, and `actualEvidenceComplete=false`; `--require-actual` now fails until the suspect chat capture is replaced.

Follow-up capture-plan hardening: `plan:roll20-chat-capture -- --require-current-metrics` now reads chat parity crop/pixel/scale suspects, not only missing files or stale current metrics. Current plan correctly reports `NEEDS_CAPTURE`, `plannedFixtures=1/3`, and lists Les-Oublies because its chat crop used manual coordinate calibration.

## 2026-06-20 05:13 +09:00 - AW2E/Les actual Roll20 chat current-metric recapture

Status: PARTIAL. Current Roll20 chat sidecar coverage is now complete; visual/chat parity remains blocked.

- Used only the dedicated Roll20 verification editor/Sandbox tab. No existing real room was modified.
- AW2E: captured the visible `sheet-rolltemplate-aw` card with current computed style, row metrics, table metrics, font checks, viewport DPR, and DPR-corrected screenshot notes. Browser screenshots returned JPEG bytes, so the local-only physical crop was converted to CSS-size PNG under ignored `reports/`.
- Les-Oublies: ran the generated Sandbox Tools upload snippet. File input dispatch succeeded for HTML/CSS/translation, but the visible editor page did not expose the manifest settings target, so this is not treated as a fresh sheet-body activation proof. Existing visible `sheet-rolltemplate-initiative-roll` chat evidence was recaptured with current metrics.
- Verification: `plan:roll20-chat-capture -- --require-current-metrics` now reports `ALL_CHAT_EVIDENCE_TRUSTED` and `plannedFixtures=0/3`.
- Verification: `status:roll20-actual` now reports `chatCurrentMetrics=3/3`, `chatCurrentMetricsMissing=0`, `chatActualCaptureScaleSuspect=0`, and `chatActualCropGeometrySuspect=0`.
- Verification: `diagnose:roll20-chat-parity` still reports `HIGH_MISMATCH`: AW2E `26.78%` raw / `21.49%` aligned, Les-Oublies `17.79%` raw / `17.79%` aligned, and YSHY `26.21%` raw / `22.77%` aligned.
- Renderer gate remains `HOLD_PRODUCTION_RENDERER_PATCH`. The stale-sidecar blocker is gone, but the remaining blockers are real: all three chat crops still differ from local ChatPane, and full-root renderer patch families are split.
- Next P0: use the new 3/3 current sidecars to re-normalize ChatPane/Roll20 chat shell geometry and table sizing. Do not promote production renderer CSS from these mismatched crops.

## 2026-06-20 06:10 +09:00 - YSHY actual Roll20 chat current-metric recapture

Status: PARTIAL. This batch improves actual Roll20 evidence for YSHY only; it does not prove Roll20 chat parity.

- Used the dedicated Roll20 verification editor/Sandbox tab only. No existing real room was modified.
- Applied YSHY source through Sandbox Tools and then endpoint fallback. File inputs dispatched for HTML/CSS/translation, but Roll20 later displayed a translation parse warning; endpoint fallback returned `200` for all three source fields.
- Recaptured the visible `sheet-rolltemplate-coc` chat card with current DOM evidence: template/table computed styles, row metrics, table box metrics, font checks, and viewport DPR.
- Rejected a bad CDP crop that captured Sandbox Tools instead of the chat template. The working path multiplied the CSS template rect by DPR `1.25`, captured the physical Roll20 PNG, then downscaled it back to CSS-pixel dimensions and recorded `captureDprCorrection` in the sidecar.
- Verification after recapture: `plan:roll20-chat-capture -- --require-current-metrics` now reports `plannedFixtures=2/3`; `status:roll20-actual` reports `chatCurrentMetrics=1/3`, `chatCurrentMetricsMissing=2`, `chatActualCaptureScaleSuspect=0`, and `chatMaxAlignedMismatch=22.77%`.
- Current renderer gate remains `HOLD_PRODUCTION_RENDERER_PATCH`: YSHY still has high chat mismatch, AW2E/Les-Oublies still lack current-metric sidecars, and the full-root renderer patch family remains split.
- Next P0: recapture AW2E and Les-Oublies with true same-action current-metric chat sidecars. Avoid simplified synthetic chat commands unless the report labels them non-comparable diagnostic evidence.

## 2026-06-20 05:32 +09:00 - Status/gate current-metric chat blocker

Status: PARTIAL. This batch prevents old Roll20 chat sidecars from being mistaken for current row/typography evidence.

- Updated `scripts/roll20_actual_status.mjs` to inspect fixture chat DOM sidecars for current renderer-diagnostic fields and print `chatCurrentMetrics` / `chatCurrentMetricsMissing`.
- Updated `scripts/roll20_renderer_action_gate.mjs` to treat missing current row/typography metrics as a production renderer blocker.
- Verification result: current `2026-06-18-state-map-v1` status reports `chatCurrentMetrics=0/3`, `chatCurrentMetricsMissing=3`.
- Verification result: renderer action remains `HOLD_PRODUCTION_RENDERER_PATCH` and now lists the current-metric sidecar gap as an explicit blocker for AW2E, Les-Oublies, and YSHY.
- Claim boundary: this is gate truthfulness and handoff automation only. It does not prove Roll20 chat parity and does not change production renderer CSS.
- Next P0: recapture same-action Roll20 `roll20-chat.png` plus `roll20-chat-dom-evidence.json` with current metrics, prioritizing YSHY `sheet-rolltemplate-coc`.

## 2026-06-20 05:11 +09:00 - Current-metric Roll20 chat recapture gate

Status: PARTIAL. This batch turns the YSHY recapture requirement into a repeatable gate instead of a manual note.

- Added `--require-current-metrics` to `scripts/roll20_chat_capture_plan.mjs`.
- The plan now inspects `roll20-chat-dom-evidence.json` for current row/typography fields and marks capture needed when sidecars lack `latestTemplate.computedStyle`, `latestTemplate.rowMetrics`, table computed style, table box metrics, `fontEvidence.checks`, or `viewportEvidence.devicePixelRatio`.
- Verified YSHY specifically now plans `NEEDS_CAPTURE` because the existing `sheet-rolltemplate-coc` sidecar has only basic rect/class/text evidence.
- Verified all three current fixtures plan recapture under this stricter mode, matching `diagnose:roll20-chat-rows` and preventing status/gate output from being mistaken for current-metric chat evidence.
- Next P0 remains actual Roll20 YSHY reroll/recapture in Sandbox/test room with a same-action screenshot and DOM sidecar.

## 2026-06-20 04:52 +09:00 - Roll20 shell typography candidate rejected

Status: PARTIAL. This batch adds a reproducible diagnostic switch and rejects it for production.

- Added diagnostic-only `ChatTypographyPolicy` with `roll20-shell-typography`, exposed through `rolltemplate_chat_smoke --chat-typography-policy roll20-shell-typography`.
- Generated fresh default and shell-typography local chat smoke reports against the same build. Both are functional PASS for AW2E, Les-Oublies, and YSHY.
- Fresh default actual comparison: AW2E `12.78%`, Les-Oublies `10.09%`, YSHY `28.36%` raw mismatch.
- Fresh shell-typography actual comparison: AW2E `13.09%`, Les-Oublies `10.09%`, YSHY `30.52%` raw mismatch.
- Decision: keep shell typography diagnostic-only and do not promote it. It confirms that the observed Roll20 shell typography mismatch is not sufficient as a direct CSS override; the next P0 remains YSHY same-fixture recapture/probe and text/shadow compositing.

## 2026-06-20 04:31 +09:00 - Live chat typography probe classified

Status: PARTIAL. This batch adds guardrails around live Roll20 probe interpretation; parity is still not achieved.

- Added `scripts/roll20_chat_live_typography_compare.mjs` and package alias `diagnose:roll20-chat-live-typography`.
- Added `--expect-fixture <fixture-id>` so fixture-targeted recapture checks can fail loudly when Chrome is showing a different rolltemplate class than intended.
- The diagnostic reads an ignored live typography probe plus the latest local `rolltemplate_chat_smoke` report, maps the selected rolltemplate class to a fixture, and writes a local-only report under `reports/.../chat-live-typography-compare/`.
- Current run classified the probe file named `yshy-live-typography-probe.json` as `official-roll20-AW2E`, because the selected template class is `sheet-rolltemplate-aw`. That file must not be cited as YSHY evidence.
- Measured AW2E-like deltas: template size matches (`267x189` both), actual Roll20 table is wider by `33.134px`, actual DPR is `1.25`, and actual Roll20 shell typography uses `13.65px`/normal letter spacing where the local smoke uses `12px`/`-0.16px`.
- Current Chrome observation: the dedicated `Codex Roll20 Verify` editor tab has 2 `sheet-rolltemplate-aw` cards and 0 `sheet-rolltemplate-coc` cards, so YSHY must be reloaded/rerolled before a trustworthy YSHY live typography probe can be captured.
- Claim boundary: this is read-only DOM/style evidence only, not same-moment screenshot evidence and not Roll20 visual parity.
- Next P0: recapture/probe the actual YSHY `sheet-rolltemplate-coc` card with current typography fields, then compare against local before changing production ChatPane CSS.

## 2026-06-20 03:45 +09:00 - Chat mismatch breakdown and text-AA candidate

Status: PARTIAL. This batch improves diagnosis and rejects another unsafe production candidate; Roll20 parity is still not achieved.

- Follow-up live Roll20 read-only inspection confirmed actual YSHY chat root/table inherits Proxima-style Roll20 chat font sizing (`13.65px`) while local custom rolltemplate root was affected by an app-added `text-xs` class (`12px`). This is a real style mismatch.
- Tested the shell/root-font candidate locally by removing the app-added rolltemplate `text-xs` and trying Roll20-like Proxima shell inheritance. It did not pass the production-safety bar: Les-Oublies raw mismatch improved slightly, but AW2E and YSHY aligned comparisons worsened. The candidate was reverted.
- Current decision: do not change production ChatPane shell/root font yet. Next candidate must explain why the real style mismatch is not translating cleanly to better pixel parity, especially the YSHY bright-pixel luma gap.
- Added diagnostic-only `__r20ChatShadowPolicy=no-template-shadow` plus `rolltemplate_chat_smoke --chat-shadow-policy no-template-shadow`.
- Shadow suppression improved only YSHY: raw/aligned `28.36%/22.46% -> 27.09%/21.14%`. AW2E and Les-Oublies stayed unchanged at `12.78%/7.49%` and `10.09%/9.14%`.
- Decision: keep the shadow switch diagnostic-only because actual Roll20 computed style still includes the dark 16-layer text-shadow. This narrows root cause toward local shadow/font compositing rather than a missing user CSS rule.
- Tested and rejected a `soft-template-shadow` candidate. It kept YSHY near the no-shadow result (`27.11%` raw) but regressed AW2E/Les-Oublies and increased aligned high mismatch to `2/3`, so the code was reverted and only the existing no-shadow diagnostic remains.
- Added highlight/shadow mask metrics to `diagnose:roll20-chat-parity`. Current default run shows YSHY highlight mask mismatch ratio `85.92%` and shadow-candidate mismatch share `59.54%`, pointing the next investigation at text mask placement/font rasterization plus shadow compositing rather than broad background or missing CSS.
- Added mask geometry deltas to the diagnostic markdown/JSON. Current default run shows AW2E and Les-Oublies highlight centroids differ by less than 1px, but YSHY highlight centroid differs by `+3.36px x / -20.72px y` and local highlight pixels are `6256` vs actual `12222`.
- Re-ran default, no-shadow, font-fallback, and text-auto-aa candidates through the new mask geometry diagnostics. Only no-shadow improved YSHY without changing AW2E/Les (`22.46% -> 21.14%` aligned; highlight y delta `-20.72px -> -16.15px`). Font fallback increased YSHY local highlight pixels but worsened overall aligned mismatch to `27.93%`.
- Added `scripts/roll20_chat_candidate_compare.mjs` and `diagnose:roll20-chat-candidates` so candidate comparisons run sequentially and write an ignored summary under `reports/.../chat-candidate-comparison/`.
- Tested `font-fallback + no-template-shadow`; rejected it because YSHY worsened to raw/aligned `30.82%/26.74%` and shadow mismatch share rose to `74.61%`. Added it to the candidate comparison list as `font-fallback-no-shadow-rejected`.
- Added row/cell geometry capture to local `rolltemplate_chat_smoke`, future Roll20 `plan:roll20-chat-capture` sidecars, and new `diagnose:roll20-chat-rows`. Current actual sidecars report `NEEDS_RECAPTURE`, which is expected because they were captured before rowMetrics existed.
- Follow-up read-only Chrome probe on the dedicated Roll20 verification tab saved ignored `chat-row-geometry/yshy-live-row-probe.json` without mutating the existing screenshot sidecar. The live YSHY row geometry matches local vertically (`topRelDelta -0.003px`, `heightDelta 0px` across rows 0-6), but row/table width differs by `24.309px` (`1272.859px` local vs `1248.55px` actual). This narrows the remaining YSHY chat mismatch toward width/font/shadow compositing rather than vertical row layout.
- Added diagnostic-only chat geometry policies. `tight-cell-spacing` was rejected (`YSHY 29.54%/24.09%`, worse than default `28.36%/22.46%`). `table-scale-x` improved YSHY to `25.84%/20.75%` and slightly lowered AW2E/Les raw mismatch, but it remains diagnostic-only because actual Roll20 does not report a table transform and the renderer gate still holds. `diagnose:roll20-chat-candidates` now restores the default chat parity diagnostic after candidate comparisons to prevent status/gate from reading the last experimental report.
- Expanded the local smoke report and future Roll20 chat capture sidecars with typography/table metrics (`fontStretch`, `fontKerning`, `letterSpacing`, `borderSpacing`, `tableLayout`, `zoom`, box scroll/client/offset sizes, and viewport DPR/scale). Latest local YSHY metric now records table `letterSpacing=-0.16px`, `borderSpacing=2px`, `tableLayout=auto`, `transform=none`, `zoom=1`, DPR `1`; the actual sidecars still need recapture with the current probe before this can classify the 24px table-width delta.
- Added breakdown fields to `scripts/roll20_chat_parity_diagnostics.mjs`: row bands, column bands, and luma buckets for raw and best-aligned comparison. This makes it possible to distinguish text/highlight mismatch from broad background mismatch.
- Added diagnostic-only `__r20ChatTextPolicy=roll20-auto-aa` in `components/editor/ChatPane.tsx` and `--chat-text-policy roll20-auto-aa` in `scripts/rolltemplate_chat_smoke.mjs`. The smoke markdown now records both chat font policy and chat text policy.
- Rebuilt, regenerated default local chat smoke, generated the text-AA candidate smoke, and compared both against the same Roll20 actual evidence.
- Result: `roll20-auto-aa` produced the same current mismatch numbers as default, so it is not a production fix.
- Current default/candidate numbers: AW2E raw/aligned `12.78%/7.49%`, Les-Oublies `10.09%/9.14%`, YSHY `28.36%/22.46%`.
- Breakdown: YSHY best-aligned mismatch share is bright `63.34%`, dark `24.16%`, mid `12.50%`; bright mismatch local-vs-actual signed luma delta is `-44.347`, so the local crop is materially darker than actual on the pixels that differ.
- Current gate remains `HOLD_PRODUCTION_RENDERER_PATCH`: `chatNormalizedCompared=3/3`, `chatActualCropGeometrySuspect=0`, `chatAlignedHighMismatch=1`, `chatMaxAlignedMismatch=22.46%`, `rendererReady=NO`.
- Next P0: inspect YSHY actual/local text-shadow colors, opacity/compositing, transform/scale, and capture device-pixel behavior before touching production ChatPane CSS.

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

## 2026-06-20 DPR-Corrected Roll20 Chat Crop Gate Fix

- Fixed `scripts/roll20_chat_parity_diagnostics.mjs` to prefer `captureDprCorrection.cssClip` when the saved `roll20-chat.png` is already a DPR-corrected template-only crop. The prior diagnostic compared the template-only PNG against stale broad chat-panel clip metadata, which falsely produced non-1x scale and foreground-pixel suspects.
- Latest `diagnose:roll20-chat-parity` on `2026-06-18-state-map-v1`: `actualTemplatePixelSuspect=0`, `actualCaptureScaleSuspect=0`, normalized compared `3/3`.
- Latest `status:roll20-actual`: `GENERATED_ACTUAL_SCREENSHOTS_DIFFED`, `generatedAuthoritative=YES`, `chatCaptureSuspects=0`, `chatCurrentMetrics=3/3`, `rendererReady=NO`.
- Current authoritative chat aligned mismatch remains real renderer work: AW2E `13.5%`, Les-Oublies `6.34%`, YSHY `21.02%`.
- Latest `gate:roll20-renderer-action` still holds production renderer CSS, but the blocker is now actual model disagreement rather than bad evidence capture.
- Claim boundary: this makes the chat evidence trustworthy enough for the next diagnostic model. It does not prove Roll20 chat parity and does not authorize broad ChatPane CSS.

## 2026-06-20 Les/YSHY Actual Roll20 Chat Recapture

- Claimed only the dedicated `Codex Roll20 Verify` Roll20 Sandbox editor/settings pages. Existing real rooms were not modified.
- Found a real Roll20 settings fallback hazard: putting a `{ sheet, userOptions, jsoninfo }` wrapper into `customcharsheet_json` made `/editor` fail with an `unexpected token` JSON parse error. The sandbox was recovered through the settings page using the real `#save-changes-button`.
- Updated `scripts/roll20_upload_snippet.mjs` so generated settings-page snippets fill `customcharsheet_json` with the plain exported `sheet.json` text and no longer wrap it. The snippet also avoids falling back to arbitrary `button[type=submit]` when `SUBMIT_SETTINGS_FORM` is enabled.
- Recaptured ignored local actual Roll20 chat evidence for `official-roll20-Les-Oublies`: `roll20-chat-dom-evidence.json` now has `textMeasureEvidence.status=MEASURED`, `samples=12`, and latest template `sheet-rolltemplate-initiative-roll`; DPR-corrected `roll20-chat.png` is `267x82`.
- Recaptured ignored local actual Roll20 chat evidence for `yshy-commission-1bu`: `roll20-chat-dom-evidence.json` now has `textMeasureEvidence.status=MEASURED`, `samples=19`, and latest template `sheet-rolltemplate-coc`; DPR-corrected `roll20-chat.png` is `267x586`.
- Latest diagnostics: `diagnose:roll20-chat-font-glyph` now compares all 3 fixtures and reports `TEXT_MEASUREMENT_DELTA_MODEL_REQUIRED` for AW2E, Les-Oublies, and YSHY. The prior YSHY `TEXT_MEASURE_RECAPTURE_REQUIRED` blocker is cleared.
- Latest renderer gate still returns `HOLD_PRODUCTION_RENDERER_PATCH`: chat PNG scale/foreground suspects remain, YSHY normalized mismatch is still high, and no global-safe ChatPane renderer patch is proven.
- Claim boundary: this is stronger actual Roll20 measurement evidence and a fixed upload helper contract. It is not Roll20 visual parity, not renderer readiness, and not approval for production ChatPane CSS.

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
## 2026-06-20 Product UI Copy Regression Guard

- Added `scripts/ui_copy_guard.mjs` plus `corepack pnpm run guard:ui-copy` so product-facing UI source fails fast on mojibake-looking Korean copy regressions.
- The guard scope is intentionally narrow: app/editor/widget UI source only. It excludes Roll20 base CSS, fixtures, reports, generated evidence, and imported sheet corpora because user sheets can legitimately contain arbitrary languages.
- Verification: `node --check scripts\ui_copy_guard.mjs`, `corepack pnpm run guard:ui-copy`, and `corepack pnpm run smoke:edit-flow -- --port 4210` passed. The edit smoke observed clean Korean edit UI copy (`시트 편집`, `흐름`, `자유`, `레이어`, `번역`) with `hasMojibakeHan=false` and no console/page errors.
- Claim boundary: this improves product trust and prevents a recurring UI-copy regression class. It does not change Roll20 renderer CSS and does not prove actual Roll20 visual parity.

## 2026-06-20 Roll20 Chat Capture Frame Offset Hardening

- Hardened the Roll20 chat recapture path rather than changing the product renderer. The capture-plan snippet now prefers a visible/text-rich rolltemplate, so Les-Oublies does not default to the sparse latest `Initiative` card when richer `classic-roll` cards are visible.
- Updated `capture:roll20-chat-cdp` to evaluate the chat probe in the frame that actually contains Roll20 rolltemplate evidence, then translate the DOM/frame-local clip into a top-level `Page.captureScreenshot` clip. New sidecars distinguish `screenshotCssClip`, `screenshotClipApplied`, and `captureFrame`.
- Added a pre-write foreground sanity check to `capture:roll20-chat-cdp`: the captured PNG is decoded in browser canvas, and the command fails with `BLOCKED_FOREGROUND_PIXEL_SUSPECT` instead of overwriting evidence when DOM rolltemplate text exists but the PNG has almost no dark/edge pixels.
- Chrome extension read-only check confirmed the root bug shape: Roll20 DOM reported chat/template rects around `x=50` inside the chat target, while the full visible screenshot placed the chat panel on the far right. Existing suspect Les PNGs can therefore be wrong-region captures and must not drive ChatPane CSS.
- Verification passed for syntax, capture-plan self-test, CDP readiness self-test, and Les recapture plan generation. Actual recapture is still blocked because no CDP endpoint is listening at `127.0.0.1:9222`; current `status:roll20-actual` remains `GENERATED_ACTUAL_SCREENSHOTS_DIFFED_WITH_SUSPECT_CHAT`, `rendererAction=HOLD_PRODUCTION_RENDERER_PATCH`, and `rendererReady=NO`.
- Claim boundary: this is verification-tool hardening only. It does not prove Roll20 visual parity, does not reduce the current Les `chatActualTemplatePixelSuspect=1`, and does not authorize production ChatPane renderer changes.

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

## 2026-06-20 Chat Candidate Regression Risk Table

- Updated `scripts/roll20_chat_candidate_compare.mjs` so chat renderer candidates are judged across AW2E, Les-Oublies, and YSHY together.
- The generated comparison now includes per-fixture aligned deltas, mean aligned delta, regression count, and `promotionRisk`.
- Latest ignored local report classifies `no-shadow` and `table-scale-x` as numerically promising but still `candidate-needs-style-proof`; direct production CSS is still blocked because actual Roll20 computed styles and table-width deltas conflict across fixtures.
- Negative controls are now easier to reject: `soft-shadow-rejected`, `roll20-message-padding`, `font-fallback`, `tight-cell-spacing`, and `shell-typography` all regress at least one fixture.
- Claim boundary: this is diagnostic/reporting work only. It does not change production ChatPane rendering, does not make `rendererReady` pass, and does not prove Roll20 visual parity.

## 2026-06-20 Layer Role Label Cleanup

- Fixed visible edit-layer role labels in `lib/editor/layerRoles.ts`: `프레임`, `흐름`, `표`, `입력`, `버튼`, `텍스트`, `이미지`, `스크립트`, and `노드`.
- Node UTF-8 inspection confirmed the file contains correct Korean labels; PowerShell may still display Korean as mojibake in raw `Get-Content` output depending on terminal encoding.
- Verification: `lint`, `build`, and `smoke:edit-flow -- --port 4210` passed. The smoke reported `editUiCopy.hasExpectedLabels=true`, `editUiCopy.hasMojibakeHan=false`, and layer row text containing `프레임`, `담기 가능`, and `흐름`.
- Claim boundary: this improves edit-mode usability and trust in the layer panel only. It does not change production Roll20 renderer CSS or prove Roll20 visual parity.

## 2026-06-20 Optional Wide Row Compact Import

- Added an opt-in import speed path for very large sheets: `compactWideRows` compacts repeated large table-row subtrees into raw row bundles after the normal generic composite pass.
- Added user-facing import dialog control `큰 표 행 빠르게 불러오기`; default remains off to preserve the normal “every HTML element is an editable block” expectation.
- Added perf/smoke plumbing: `window.__perfHook.importSheet({ compactWideRows })`, `smoke:imported-edit-sync --compact-wide-rows true`, and budget columns for `wideRowBundles` / `wideRowCollapsed`.
- Private YSHY 1BU fixture evidence, ignored locally: `4` wide row bundles, `432` blocks collapsed, HTML blocks `6530 -> 6094`, import total about `5434.3ms`, inject about `5086.3ms`, emit about `221.8ms`.
- Verification: compact private imported-edit smoke passed interaction/resource checks, edit/preview sync, canvas/free insert, reimport stability, console/page errors, and `0px` drag drift; `lint`, `build`, `node --check`, and `guard:roll20-evidence` passed.
- Claim boundary: this is a speed option, not Roll20 visual parity. It preserves rendered row HTML as raw bundles, but internal controls inside bundled rows are not directly block-editable until an ungroup/lazy-materialization feature exists.

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

## 2026-07-12 Roll20 Chat Overlay-Clean Recapture

- Found a second evidence-quality issue after the Les same-template recapture: the selected DOM template was `sheet-rolltemplate-initiative-roll`, but the first PNG crop included the overlapping character-sheet dialog (`Modify` visible in the crop). This made `actualTemplatePixelSuspect=1` and downgraded `generatedAuthoritative=NO`.
- Closed the overlapping Roll20 character dialog and recaptured Les-Oublies with `capture:roll20-chat-cdp -- --skip-click --expected-template-class sheet-rolltemplate-initiative-roll`. Visual inspection of the ignored local PNG showed only the `Initiative :` rolltemplate.
- Hardened `capture:roll20-chat-cdp` to close overlapping character-sheet dialogs before chat probe/capture by default. The helper records `overlayCleanup` in `captureAutomation`; `--keep-dialogs` preserves old behavior for diagnostics.
- Hardened generated chat probes so `IFRAME`/character dialog samples over the selected rolltemplate are recorded as overlay candidates. This prevents a 60% foreground hit ratio from passing when a character iframe covers part of the chat template.
- After `diagnose:roll20-chat-refresh`, current status is authoritative again: `generatedAuthoritative=YES`, `chatCaptureSuspects=0`, `chatActualTemplatePixelSuspect=0`, `chatStructure=STRUCTURE_MATCHED`, `chatStructureMismatch=0/3`, `chatSameStructureHighMismatch=2/3`, and `chatSameStructureMaxAlignedMismatch=20.68%`.
- Les-Oublies improved from the stale wrong-template/overlap path to `KEEP_DEFAULT_CHAT_RENDERER` with aligned mismatch `6.34%`. Remaining P0 chat renderer work is now AW2E message/content width (`18.03%`) and YSHY table intrinsic sizing (`20.68%`).
- Claim boundary: Roll20 chat parity is still not achieved. This batch improves evidence trust and narrows the remaining renderer problem; production ChatPane CSS remains held.

## 2026-07-12 Les Same-Template Roll20 Chat Recapture

- Added `scripts/roll20_upload_cdp_apply.mjs` and package alias `apply:roll20-upload-cdp` so generated Sandbox upload snippets can be executed through a CDP-enabled Roll20 session instead of manual console paste. The helper requires an explicit `--endpoint-campaign-id`, navigates to the dedicated Sandbox settings page by default, and saves only ignored local apply evidence.
- Used the helper against the dedicated Roll20 Sandbox/test campaign `21639681` for `official-roll20-Les-Oublies`. The settings-page result was `APPLY_NOT_PROVEN` because settings pages cannot prove sheet-body activation, but endpoint fallback posted and settings save clicked. The following editor/character probe proved the loaded iframe: `sheetHitCount=100`, `rootCount=3`, `attrCount=141`, `rollButtonCount=40`.
- Fixed `capture:roll20-chat-cdp` to skip zero-size duplicate roll buttons and click visible iframe roll buttons first, with a DOM click fallback. This unblocked `roll_initiative`, which previously failed after hitting a hidden `0x0` duplicate.
- Updated `plan:roll20-chat-capture` and the generated chat DOM probe for same-template recapture. The capture command now includes `--expected-template-class sheet-rolltemplate-initiative-roll`, and the probe selects the target rolltemplate class before the previous largest-template heuristic.
- Captured fresh Roll20 chat evidence for Les-Oublies using `roll_initiative` and the expected `sheet-rolltemplate-initiative-roll`. `diagnose:roll20-chat-structure` improved from `STRUCTURE_MISMATCH_FOUND` to `STRUCTURE_MATCHED`; `chatStructureMismatch` is now `0/3`.
- Current measured status after recapture: `generatedActualScreenshots=6/6`, `generatedDiffed=6/6`, `generatedAuthoritative=YES`, `chatCaptureSuspects=0`, `chatNeedsNormalizedCapture=0`, `chatCurrentMetrics=3/3`, `chatSameStructureHighMismatch=3/3`, `chatSameStructureMaxAlignedMismatch=50.1%`, `rendererReady=NO`.
- Claim boundary: this removes a false/wrong-template evidence blocker. It does not prove Roll20 chat parity and does not authorize production ChatPane CSS. The next P0 is per-template message/content width and table/text layout modeling from same-structure evidence.

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

## 2026-06-20 Chat Residual Axes Classified

- Added `scripts/roll20_chat_residual_diagnostics.mjs` and package alias `diagnose:roll20-chat-residual`.
- The diagnostic reads existing chat parity/style/candidate/policy reports and classifies remaining mismatch by residual axis using row/column bands, luma buckets, highlight/shadow masks, style deltas, and candidate outcomes.
- Wired the renderer action gate to read the residual report and surface high-mismatch fixture axes in standard `EVIDENCE` and next-action output.
- Current residual classification for `2026-06-18-state-map-v1`: AW2E `DEFAULT_ACCEPTABLE_FOR_NOW`, Les-Oublies `SHADOW_BORDER_RASTERIZATION`, YSHY `GEOMETRY_WIDTH_CONFLICT`.
- This narrows the next P0: Les should get border/shadow/background paint diagnostics, while YSHY should stay on a per-template width/shell model path.
- Verification: `diagnose:roll20-chat-residual`, `gate:roll20-renderer-action`, `corepack pnpm run lint`, and `corepack pnpm run build`.
- Claim boundary: this is a diagnostic classifier. It does not change production ChatPane CSS and does not prove Roll20 chat parity.

## 2026-07-13 Export Asset Relink Draft

- Moved asset replacement draft generation into shared `lib/export/asset_refs.ts` so import and export use the same URL classification and commented map format.
- Export dialog now has a `교체 목록 초안 만들기` action that appends commented `old URL => <paste-user-owned-https-url-here>` entries from the current exported HTML/CSS refs.
- `smoke:export-dialog` now verifies both import-side and export-side draft creation, the shared preview/edit/export replacement persistence path, and 0 console/page/request failures.
- Added a retry wrapper around the smoke's screenshot calls after Chromium returned a transient `Page.captureScreenshot` protocol error.
- Verification: `node --check scripts\export_dialog_browser_smoke.mjs`, `test:asset-refs`, `test:asset-replacements`, `lint`, `build`, and `smoke:export-dialog -- --out-dir ./out --base-path /roll20-block-editor --report-dir ..\_tmp_codex_smoke\export-dialog-asset-draft-20260713-r3 --port 4381`.
- Claim boundary: this is user-facing relink workflow progress only. It does not supply replacement asset URLs, relink AW2E/YSHY, promote renderer CSS, or prove Roll20 visual parity.

## 2026-06-20 Template Typography Candidate Rejected

- Tested the Les-Oublies hypothesis that the remaining chat mismatch was mainly template typography/color/letter-spacing/font-smoothing.
- Added hidden diagnostic policy `roll20-template-typography` in `ChatPane` and candidate row `template-typography` in `roll20_chat_candidate_compare`.
- Functional smoke passed for all three current fixtures, so the candidate is reproducible.
- Candidate comparison rejected it as production CSS: Les-Oublies barely moved (`12.90% -> 12.89%`), AW2E regressed (`7.35% -> 7.76%`), and YSHY regressed heavily (`21.45% -> 31.00%`).
- The renderer action gate now lists `template-typography` with the other fixture-regressing candidates.
- Claim boundary: this is a negative-control diagnostic. It does not improve Roll20 parity and must not be exposed or promoted.
- Next P0: investigate Les-Oublies background/border/shadow/anti-aliasing or crop-shell effects; simple template typography is not the root cause.

## 2026-06-20 Chat Renderer Policy Gate

- Added `scripts/roll20_chat_renderer_policy.mjs` and package alias `diagnose:roll20-chat-renderer-policy`.
- The policy reads current actual Roll20 chat parity, chat style context, candidate comparison, and candidate style-proof reports. It emits local-only JSON/Markdown under `reports/roll20-actual-compare/<run>/chat-renderer-policy/`.
- Wired the renderer action gate to read the policy and add a blocker when it holds global ChatPane renderer changes.
- Current policy for `2026-06-18-state-map-v1`: `HOLD_GLOBAL_CHAT_RENDERER_PATCH`, `publicUi=DO_NOT_EXPOSE`, no global-safe candidates.
- Current per-fixture decisions: AW2E keeps default, Les-Oublies needs a new diagnostic model, and YSHY has fixture-local candidates that must not be exposed.
- Current root cause boundary: actual Roll20 chat table-width deltas conflict by fixture (`+33.134px`, `+0.8px`, `-24.309px`), so a single width/padding/font ChatPane patch remains unsafe.
- Verification: `diagnose:roll20-chat-renderer-policy`, `gate:roll20-renderer-action`, `corepack pnpm run lint`, and `corepack pnpm run build`.
- Claim boundary: this is a guardrail and diagnostic handoff. It does not make Roll20 chat/template parity pass and does not change production ChatPane CSS.

## 2026-06-20 Header Manual Save Cleanup

- Removed the product-surface placeholder `설정` and `도움말` header buttons.
- Replaced the placeholder `저장` action with a real manual save through the IndexedDB workspace snapshot path.
- Added `saveCurrentWorkspaceSnapshot()` in `lib/persist/autosave.ts` so manual save and autosave use one serialization/save-state implementation.
- Browser verification on `http://localhost:3000/`: header no longer exposes `설정`, `도움말`, `준비 중`, or the previous diagnostic preview controls; clicking `저장` shows the success toast and the button returns to the enabled state.
- Verification: `corepack pnpm run lint`, `corepack pnpm run build`, `smoke:export-dialog`, `guard:roll20-evidence`, `guard:roll20-renderer-model`, `status:roll20-actual`, and `diagnose:roll20-renderer-blocker`.
- Claim boundary: this improves product usability only. It does not change production Roll20 renderer CSS and does not prove Roll20 visual parity. Current renderer action remains `HOLD_PRODUCTION_RENDERER_PATCH`.

## 2026-07-13 AW2E Row Raster Candidate Gate

- Extended row-raster candidate comparison beyond YSHY so AW2E candidate deltas are visible in both the isolated report and top-level renderer gate.
- Current `aw2e-message-width-text-metrics` evidence: AW2E raw crop mismatch improves, but row raster regresses from `17.93%` to `24.69%` weighted and from `26.28%` to `34.28%` on the worst row.
- Current `aw2e-message-width-font-size` evidence is similar: row raster regresses to `24.75%` weighted and `34.44%` worst row.
- Conclusion: AW2E width/text-metric candidates remain diagnostic-only and should not be promoted. The remaining axis is row/background/text antialiasing or paint/source context, with asset relink still blocking any visual parity claim.
- Verification: `diagnose:roll20-chat-row-raster-candidates` compared `9/9` candidates, and `gate:roll20-renderer-action` now prints AW2E row-raster reject deltas.

## 2026-07-13 AW2E Message Width + Text Metrics Candidate

- Root cause hypothesis tested: AW2E Roll20 chat mismatch is driven by the combined Roll20 message/content width context plus AW2E table/cell text metrics, not by a global chat shell patch.
- Ran a fresh diagnostic smoke with `--chat-geometry-policy aw2e-message-full-width --chat-typography-policy aw2e-text-metrics` into ignored `reports/rolltemplate-chat-smoke-aw2e-message-width-text-metrics`.
- Result: smoke passed all 3 fixtures. AW2E raw crop mismatch dropped to `17.94%`, but aligned mismatch only improved from default `18.03%` to `17.94%`; YSHY remained `20.68%`.
- Added the candidate to automated candidate comparison, style-proof lookup, and targeted renderer planning so later runs record it instead of repeating ad hoc measurement.
- Claim boundary: diagnostic-only. Production ChatPane renderer remains held by split AW2E/YSHY axes and asset-relink blockers.

## 2026-06-20 Edit Layer Structure Visualization

- Added direct `childCount` metadata to `BlockSnapshot` from Blockly input children.
- Edit layer rows now expose `data-r20-layer-child-count`, render a role/relationship color rail, and show a compact child-count badge when a node has children.
- Updated the edit-flow browser smoke to require the structure rail and child-count evidence on a frame after nested drop.
- Claim boundary: this is an edit UX structure-visibility improvement. It does not alter production Roll20 renderer CSS or prove visual parity.

## 2026-06-21 Local Preview Claim Boundary

- Current actual status is still renderer-ready `NO`, even though trusted full-root evidence has reached `3/3`; chat/rolltemplate foreground and split renderer-model blockers remain.
- The empty preview state no longer claims the center canvas renders the "actual Roll20 sheet"; it now says it is a local Roll20-format preview.
- The preview-mode tooltip uses the same local-preview boundary.
- `scripts/export_dialog_browser_smoke.mjs` now guards against the old misleading actual-Roll20 preview claim returning.
- Claim boundary: copy/truthfulness only. No Roll20 renderer CSS or parity claim changed.

## 2026-07-13 Export Dialog Copy and Smoke Reliability

- Cleaned `components/editor/ExportDialog.tsx` copy around Roll20 zip export, upload readiness, asset replacement, Sandbox diagnostics, and legacy sanitize mode.
- Repaired `scripts/export_dialog_browser_smoke.mjs` so it asserts normal Korean UI text instead of mojibake strings.
- Added request-failure evidence to the export dialog smoke and stubbed known external environment resources (Pretendard CDN CSS and Blockly sprite PNG) so restricted-network QA still requires console/page/request failures to stay at `0`.
- Verification: `node --check scripts\export_dialog_browser_smoke.mjs`, `corepack pnpm run lint`, `corepack pnpm run build`, and `corepack pnpm run smoke:export-dialog -- --port 4370 --report-dir ..\_tmp_codex_smoke\export-dialog-copy-20260713-final` passed.
- Server hygiene: post-smoke `netstat` showed no listening app/smoke server on `3000`, `3001`, `4431`, `4432`, or `4370`; only the existing Roll20 CDP listener on `127.0.0.1:9222` remained.
- Claim boundary: this is UX copy and QA reliability work. It does not add actual Roll20 screenshot evidence, does not prove visual parity, and does not change renderer CSS.

## 2026-07-13 Local App Asset Request Cleanup

- Removed the root layout's Pretendard CDN stylesheet/preconnect and restored the Korean metadata title/description.
- Copied Blockly package media into `public/blockly-media/`, then set `media: 'blockly-media/'` for both `BlocklyModelHost` and block gallery preview workspaces.
- Hardened `smoke:export-dialog` so old external CDN/font or Blockly remote sprite requests are recorded and fail the smoke instead of being silently stubbed.
- Verification: `corepack pnpm run lint`, `corepack pnpm run build`, and `corepack pnpm run smoke:export-dialog -- --port 4370 --report-dir ..\_tmp_codex_smoke\export-dialog-local-assets-20260713-r1` passed with console issues `0`, page errors `0`, request failures `0`, and external resource requests `0`.
- Claim boundary: this removes app-shell external request noise from the verified path. It does not change Roll20 sheet renderer parity or the policy for user-supplied sheet asset URLs.

## 2026-07-13 Actual Status/Gate Locked-Report Fallback

- Added automatic `EPERM`/`EACCES` fallback for `status:roll20-actual` and `gate:roll20-renderer-action`: if their default canonical output folder is locked and no explicit `--out-dir` is supplied, they now write refreshed JSON/Markdown under `..\_tmp_codex_smoke\...`.
- Added `test:layer-roles` assertions for Korean layer role labels so Figma-like layer-panel role copy cannot silently regress.
- Verification: `node --check scripts\roll20_actual_status.mjs`, `node --check scripts\roll20_renderer_action_gate.mjs`, `corepack pnpm run test:layer-roles`, `corepack pnpm run lint`, `corepack pnpm run build`, `corepack pnpm run guard:roll20-evidence -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, and `git diff --check` passed.
- Live rerun: `status:roll20-actual` wrote `..\_tmp_codex_smoke\actual-verification-status-2026-06-18-state-map-v1-1783904650122`; `gate:roll20-renderer-action` wrote `..\_tmp_codex_smoke\renderer-action-gate-2026-06-18-state-map-v1-1783904651010`.
- Current measured gate remains unchanged: `rendererReady=NO`, `rendererBlockers=8`, same-structure high chat mismatch `2/3`, max aligned mismatch `20.68%`.
- Claim boundary: this improves evidence refresh reliability only. It does not reduce renderer blockers, relink assets, or prove Roll20 parity.

## 2026-06-21 Chat Foreground Suspect Handoff Precision

- Root cause: the aggregate `chatActualTemplatePixelSuspect=1` status made the next action too generic even though `chat-parity-diagnostics` already knew the exact fixture and pixel sanity reason.
- `scripts/roll20_actual_status.mjs` now stores `chatParity.suspectFixtures` with per-fixture reasons and pixel sanity stats.
- `scripts/roll20_renderer_action_gate.mjs` now carries the same fixture-level suspect list into blocker and next-action text.
- Current verification points to `official-roll20-Les-Oublies` only: foreground pixel sanity dark `0%`, edge `0%`, non-white `5.15%`; the recapture command is `corepack pnpm run plan:roll20-chat-capture -- reports\roll20-actual-compare\2026-06-18-state-map-v1`.
- Claim boundary: this is evidence-handoff precision. It does not change local ChatPane CSS, does not recapture Roll20, and does not prove chat parity.

## 2026-06-21 Current Status and ETA Snapshot

- Added `docs/qa/38_current_project_status.md` so the next agent/user pass has one compact status source instead of reconstructing the project from scattered run logs.
- Latest measured local preview/edit smoke: AW2E `1.86%`, Les-Oublies `2.07%`, YSHY `1.02%`.
- Latest actual Roll20 status: `PARTIAL_GENERATED_ACTUAL_SCREENSHOTS`, generated screenshots/diffs `4/6`, trusted full-root `3/3`, chat normalized capture still needed for `2` cases, rendererReady `NO`.
- Latest renderer gate: `HOLD_PRODUCTION_RENDERER_PATCH` with `9` blockers, so no production renderer CSS/chat model promotion is currently justified.
- ETA recorded in the status doc: 2-4 working days for an evidence-safe MVP checkpoint, 5-9 working days for a private alpha around the current prepared fixtures, and 2-4 weeks for broader mixed official/custom sheet beta.
- Claim boundary: this is reporting and handoff documentation only. It does not create new Roll20 evidence and does not change runtime behavior.

## 2026-06-21 Edit Layer Drop Truthfulness

- Changed `components/editor/EditCanvas.tsx` so layer rows only show `담기 가능` when both the role classifier and the Blockly adapter agree that the block can receive children.
- Added a compact count and legend to the layer panel so users can distinguish droppable frames, child nodes, and single elements without reading DOM terms.
- Verification: `corepack pnpm run smoke:edit-flow -- --port 4341` passed with flow/absolute drop, before/inside/after layer modes, non-leaf reorder, absolute placement inside a frame, and edit UI copy sanity.
- Current measured gates remain unchanged for actual Roll20: `status:roll20-actual` is still `PARTIAL_GENERATED_ACTUAL_SCREENSHOTS`, and `gate:roll20-renderer-action` still holds production renderer patches.
- Progress estimate reported to user: starting goal state was roughly `10-15%`; current total product goal is roughly `35-45%`, with local edit/drop UX `55-65%`, local preview/edit sync around `70%`, actual Roll20 root `55-65%`, and actual Roll20 chat/rolltemplate `25-35%`.
- Claim boundary: this is edit UX truthfulness and user guidance. It does not prove Roll20 visual parity.

## 2026-07-12 Chat Capture Plan-Only Handoff

- Rechecked the active actual run: `status:roll20-actual` remains `PARTIAL_GENERATED_ACTUAL_SCREENSHOTS`, generated screenshots/diffs `4/6`, missing trusted chat evidence for AW2E and YSHY, and `rendererReady=NO`.
- Rechecked CDP readiness: `preflight:roll20-cdp` reports `CDP_CLOSED`, so this batch did not capture new Roll20 pixels.
- Updated `scripts/roll20_chat_cdp_capture.mjs` so `--plan-only` prints the sheet-frame evidence path, exact `probe:roll20-sheet-frame` command, and exact gated chat capture command before telling agents to rerun without `--plan-only`.
- Updated `scripts/roll20_chat_current_handoff.mjs` so the generated current-metrics handoff table preserves the exact sheet-frame probe and gated chat capture commands from `roll20_chat_capture_plan.mjs`.
- Verification: `node --check scripts\roll20_chat_cdp_capture.mjs`, `node --check scripts\roll20_chat_current_handoff.mjs`, `test:roll20-chat-cdp-readiness`, `test:roll20-chat-capture-plan`, `handoff:roll20-chat-current`, and `capture:roll20-chat-cdp --plan-only` for `official-roll20-AW2E` and `yshy-commission-1bu`.
- Claim boundary: this reduces handoff mistakes for the next actual Roll20 recapture. It does not add visual evidence, does not change ChatPane CSS, and does not prove parity.

## 2026-07-12 CDP Preflight Probe Ordering

- Updated `scripts/roll20_cdp_preflight.mjs` so the console output and Markdown report include sheet-frame probe commands before chat capture commands for each planned fixture.
- Verified both the full planned fixture set and a single-fixture preflight path; both still report `CDP_CLOSED` but now print the correct probe -> capture order.
- Verification: `node --check scripts\roll20_cdp_preflight.mjs`, `preflight:roll20-cdp -- --run-dir reports\roll20-actual-compare\2026-06-18-state-map-v1`, and `preflight:roll20-cdp -- --run-dir reports\roll20-actual-compare\2026-06-18-state-map-v1 --fixture yshy-commission-1bu`.
- Claim boundary: no Roll20 browser was captured. This is orchestration safety for the next live recapture only.

## 2026-07-12 Edit Canvas Width and Zoom Control

- Added direct edit-toolbar controls for canvas width, fit zoom, and 100% zoom.
- Split edit canvas width by target: sheet mode uses `sheetCanvasWidth` (`850px` default, still auto-expands for wider imported roots), while rolltemplate mode uses `rolltemplateCanvasWidth` (`280px` default) and no longer inherits or auto-expands from sheet geometry.
- Updated toolbar guidance so flow placement and free placement describe their real HTML/CSS effect instead of using a generic "will be reflected" message.
- Hardened `scripts/edit_flow_browser_smoke.mjs` by clearing persisted `r20-ui` state and asserting the width-control roundtrip: sheet `850 -> 930`, rolltemplate `280`, then sheet returns to `930`.
- Verification: `node --check scripts\edit_flow_browser_smoke.mjs`, `corepack pnpm run lint`, `corepack pnpm run build`, `corepack pnpm run guard:ui-copy`, and `corepack pnpm run smoke:edit-flow -- --port 4352`.
- Claim boundary: edit UX only. Actual Roll20 capture status remains `PARTIAL_GENERATED_ACTUAL_SCREENSHOTS`, and renderer CSS remains gated.

## 2026-07-12 CDP Launch Recheck

- Updated `scripts/roll20_cdp_preflight.mjs` so `--launch` rechecks the CDP endpoint after a short wait and records `initialStatus`, `initialEndpoint`, and the launch recheck fields in the ignored report.
- Added a `next=` console line to preflight output, so the action after `CDP_CLOSED`, `LOGIN_REQUIRED`, `CHALLENGE_OR_WAITING`, or `READY` is visible without opening the Markdown report.
- Live check: `preflight:roll20-cdp -- --run-dir reports\roll20-actual-compare\2026-06-18-state-map-v1 --launch --wait-after-launch-ms 5000` opened CDP Chrome on `9222`; the post-launch report found a Roll20 login page and correctly classified it as `LOGIN_REQUIRED`.
- Safety check: `probe:roll20-sheet-frame --dry-run` and `capture:roll20-chat-cdp --dry-run` both refused to proceed on the login page and wrote no new visual evidence.
- Verification: `node --check scripts\roll20_cdp_preflight.mjs`, full and single-fixture preflight, the two dry-run guards, `lint`, `build`, `guard:ui-copy`, `guard:roll20-evidence`, and `status:roll20-actual`.
- Claim boundary: no new Roll20 screenshots were captured. The next real-world step is logging into the visible CDP Chrome window, opening the dedicated Sandbox/test room, then rerunning preflight -> sheet-frame probe -> chat capture.

## 2026-07-12 CDP Roll20 Target Filtering

- Root cause: `preflight:roll20-cdp` used a raw URL substring match for `app.roll20.net`, so third-party iframe targets such as Stripe could be counted as Roll20 targets when their encoded URL/referrer mentioned Roll20.
- Updated `scripts/roll20_cdp_preflight.mjs` to count only CDP targets with `type: "page"` and a real Roll20 hostname (`app.roll20.net` or `roll20.net`).
- Live recheck against the current CDP browser now reports `targets=7`, `roll20Targets=1`, `ROLL20_PAGE_NOT_READY`; the one Roll20 target is `https://roll20.net/welcome`, while Stripe/Twitter iframe targets stay out of `roll20Targets`.
- Verification: `node --check scripts\roll20_cdp_preflight.mjs`, `node --check scripts\lib\roll20Readiness.mjs`, `test:roll20-chat-cdp-readiness`, and full/single-fixture `preflight:roll20-cdp`.
- Claim boundary: this hardens readiness reporting only. It does not add actual Roll20 screenshot evidence or change renderer readiness.

## 2026-07-12 Shared CDP Roll20 Page Filter

- Follow-up root cause: `probe:roll20-sheet-frame` and `capture:roll20-chat-cdp` still selected pages with `page.url().includes(PAGE_MATCH)`, so the same referrer/iframe false-positive shape could reappear after preflight.
- Moved Roll20 page detection into `scripts/lib/roll20Readiness.mjs` as `isRoll20PageUrl` / `isRoll20PageTarget`, then reused it from preflight, sheet-frame probe, and chat capture.
- Self-test now includes a Stripe iframe URL with an encoded Roll20 referrer and verifies it is not a Roll20 page target.
- Live dry-run check: preflight still reports `roll20Targets=1`; both sheet-frame probe and chat capture select the real `https://roll20.net/welcome` page and stop as `UNKNOWN_ROLL20_PAGE` without writing evidence.
- Verification: syntax checks, `test:roll20-chat-cdp-readiness`, `test:roll20-sheet-frame-probe`, preflight, probe dry-run, and capture dry-run.
- Claim boundary: capture readiness is safer. Actual Roll20 chat evidence remains missing/suspect for AW2E and YSHY.

## 2026-07-13 YSHY Bookk Fallback-Only Candidate Rejected

- Added `scripts/roll20_chat_font_fallback_probe.mjs` plus `diagnose:roll20-chat-font-fallback`.
- The probe confirmed the actual Roll20 Bookk-failure text samples match local `Noto Sans KR` canvas widths exactly for 3/3 sampled caption/td selectors.
- Added diagnostic-only ChatPane typography policy `yshy-bookk-fallback-only`, scoped to `.sheet-rolltemplate-coc` caption/td/template value/label only.
- Functional smoke passed 3/3, but the candidate experiment gate rejected the policy: `HOLD_PRODUCTION_RENDERER_PATCH`, `reject-regresses-fixtures`, mean `+15.75%`, AW2E delta `+41.04%`, YSHY delta `+6.21%`.
- Row raster rejected it as well: AW2E weighted `+44.07%`, YSHY weighted `+12.29%`.
- Claim boundary: this is useful negative evidence. It proves that matching the failed Bookk fallback glyph widths alone is not enough; the next candidate must include table auto-layout/min-content and crop context without breaking row raster.

## 2026-07-13 Chat Min-Content Model Diagnostic

- Added `scripts/roll20_chat_min_content_model.mjs` plus `diagnose:roll20-chat-min-content`.
- The report fuses text measurement, table used/scroll/max-width signals, row/cell uniformity, crop/top-offset, and source-context decisions before any new CoC/YSHY renderer candidate is attempted.
- Wired the new diagnostic into `diagnose:roll20-chat-refresh`; the refresh chain now also runs `diagnose:roll20-chat-source-context` and `diagnose:roll20-chat-table-layout-constraint`, which were previously absent from the full chat refresh sequence.
- Updated the targeted renderer plan so YSHY/CoC next commands include table-layout and min-content diagnostics before another candidate.
- Fresh YSHY actual sidecar result: AW2E routes to `TEXT_METRIC_WIDTH_MODEL`; YSHY routes to `TABLE_AUTO_LAYOUT_MIN_CONTENT_MODEL_REQUIRED`; Les-Oublies is kept on crop/context investigation.
- Claim boundary: this still does not promote renderer CSS or prove visual parity. It prevents the next candidate from being another broad font/width/transform replay.

## 2026-07-13 Fresh Actual Sidecar Routing for Chat Font/Source Diagnostics

- Server hygiene before this batch passed: no project dev/smoke listeners were running; the existing Roll20 CDP browser on `127.0.0.1:9222` was preserved.
- Added `--actual-sidecar <fixture-id>=<json>` to `diagnose:roll20-chat-font-glyph` and `diagnose:roll20-chat-source-context`, allowing fresh ignored-temp Roll20 chat sidecars to feed the font/glyph and source/context models directly.
- Added `--font-glyph-dir` to `diagnose:roll20-chat-font-intrinsic`, so an isolated font/glyph report can feed the next fused font/intrinsic route without rewriting canonical reports.
- Added `--actual-sidecar <fixture-id>=<json>` to `diagnose:roll20-chat-intrinsic-width` and `diagnose:roll20-chat-table-intrinsic-probe`, completing the fresh actual sidecar route for the intrinsic table/row/cell diagnostics.
- Updated `scripts/README.md` with the new override commands.
- Verification against fresh YSHY CoC Roll20 chat sidecar:
  - `diagnose:roll20-chat-font-glyph` passed and kept YSHY at `TEXT_WIDTH_LAYOUT_CONSTRAINT_MODEL_REQUIRED`.
  - `diagnose:roll20-chat-source-context` passed and kept YSHY at `SANITIZE_REPLAY_REJECTED_SOURCE_MODEL_REQUIRED`.
  - `diagnose:roll20-chat-font-intrinsic` passed with isolated font/glyph input and kept YSHY at `FONT_CONTEXT_BEFORE_WIDTH_CSS`.
  - `diagnose:roll20-chat-intrinsic-width` passed and kept YSHY at `TABLE_SCROLL_INTRINSIC_MODEL_REQUIRED`.
  - `diagnose:roll20-chat-table-intrinsic-probe` passed and kept YSHY at `TABLE_WIDE_INTRINSIC_WITH_CROP_OFFSET`.
  - `diagnose:roll20-chat-table-layout-constraint` passed and classified YSHY as `TABLE_AUTO_LAYOUT_MIN_CONTENT_MODEL_REQUIRED`.
  - `gate:roll20-renderer-action` with fresh source/context override still returned `HOLD_PRODUCTION_RENDERER_PATCH`.
- Claim boundary: this improves evidence routing and root-cause confidence only. No renderer CSS was promoted, no visual parity was claimed, no user/private evidence was committed, and asset relink blockers remain.

## 2026-07-12 CDP Ready But Sheet Frame Missing

- Navigated the CDP browser from Roll20 welcome to `https://app.roll20.net/editor` without editing any room/sheet settings.
- Preflight then reported `READY`, but sheet-frame probe showed the important missing piece: `frames=1`, `sheetHitCount=0`, `rootCount=0`, `attrCount=0`, `rollButtonCount=0`.
- Full probes for both `official-roll20-AW2E` and `yshy-commission-1bu` returned `ROLL20 SHEET FRAME PROBE NOT_PROVEN`, so no positive DOM sidecar was written.
- Updated `probe:roll20-sheet-frame --dry-run` to run a lightweight non-writing frame probe when the Roll20 URL is capture-ready.
- Updated `capture:roll20-chat-cdp --dry-run` to warn when `/editor` is open but no character-sheet iframe is present, and to point back to the required sheet-frame probe command.
- Verification: syntax checks plus live AW2E dry-runs for probe and capture. The dry-runs now distinguish URL readiness from loaded-fixture readiness.
- Claim boundary: no actual Roll20 evidence was captured. The next step is loading/opening the intended generated sheet in the dedicated Sandbox/test room.
## 2026-07-13 Roll20 Chat Asset Preservation Plan

- Added `scripts/roll20_chat_asset_preservation_plan.mjs` plus `plan:roll20-chat-assets` and `test:roll20-chat-assets`.
- The planner reads current chat background asset/proxy/raster evidence and separates renderer CSS work from asset-preservation failures.
- Current evidence for `reports\roll20-actual-compare\2026-06-18-state-map-v1` keeps renderer work held: AW2E and YSHY background sources resolve to placeholder image bytes even though local/actual Roll20 proxy bytes match.
- Added `docs/spec/31_asset_preservation_policy.md` and linked it from agent startup rules. New P0 product requirement: warn about external assets and require relink/rehost before claiming visual parity when source assets are dead.
- Extended `ExportDialog` asset preflight with visible `Roll20 proxy` and `placeholder risk` metrics. `smoke:export-dialog -- --port 4363` passed and checked the new metrics in the rendered dialog.
- Added `lib/export/asset_replacements.ts` and export dialog UI for a local-only `old URL => new URL` replacement map. The final zip payload and export-side diagnostics use replaced HTML/CSS; source workspaces and external corpus folders are not mutated.
- Verification for this batch: `test:asset-replacements`, `lint`, `build`, and `smoke:export-dialog -- --port 4365` passed.
- Moved asset-reference analysis into shared `lib/export/asset_refs.ts` and added import dialog asset preflight. Import now surfaces external URL, relative path, Roll20 proxy, Imgur page, and placeholder-risk counts before users commit to importing.
- Verification for the import warning batch: `test:asset-refs`, `test:asset-replacements`, `lint`, `build`, `smoke:export-dialog -- --port 4367`, and `guard:roll20-evidence` passed.
- Shared the same local-only replacement map through preview iframe, edit Shadow render, and export by moving the text state into `previewStore` and applying it before `buildSheetDoc`/`buildSheetParts` in both preview and edit paths.
- Hardened `smoke:export-dialog` with a synthetic asset URL check: it imports a tiny synthetic sheet, applies an `old URL => data:image/...` relink, then verifies the preview iframe `srcdoc` and edit Shadow DOM contain the replacement target and no original URL.
- Verification for the shared render-path batch: `node --check scripts\export_dialog_browser_smoke.mjs`, `test:asset-refs`, `test:asset-replacements`, `lint`, `build`, `smoke:export-dialog -- --port 4368`, `git diff --check`, and `guard:roll20-evidence -- reports\roll20-actual-compare\2026-06-18-state-map-v1` passed.
- Extended `asset_refs` to return local UI-safe ref summaries and added an import dialog draft button. The button appends commented replacement-map lines for detected external/relative assets so users can fill user-owned hosted URLs before activating the map.
- Verification for the import draft batch: `test:asset-refs`, `test:asset-replacements`, `lint`, `build`, `smoke:export-dialog -- --port 4369`, and `guard:roll20-evidence -- reports\roll20-actual-compare\2026-06-18-state-map-v1` passed. Smoke confirms a synthetic Imgur URL produces a commented draft entry and still verifies preview/edit render replacement separately.
- Claim boundary: this is diagnostic/planning and safety policy. It does not make Roll20 chat visual parity pass and does not embed or commit any real sheet assets.

## 2026-07-13 Chat Renderer Target Plan Run-Dir Safety

- Rechecked current actual Roll20 status: generated actual screenshots and diffs are `6/6`, trusted full-root is `3/3`, chat structure is `STRUCTURE_MATCHED`, but renderer action remains `HOLD_PRODUCTION_RENDERER_PATCH`.
- Current blockers are now narrower: AW2E needs a `.sheet-rolltemplate-aw` scoped message/content width plus exact text-metric model; YSHY needs a CoC/YSHY-scoped table intrinsic/sanitize/font-context model; Les-Oublies stays on the default renderer for now.
- Fixed `scripts/roll20_chat_targeted_renderer_plan.mjs` so generated next commands use the run directory supplied to the script. This prevents future actual Roll20 run directories from producing handoff Markdown that points back to stale `2026-06-18-state-map-v1` evidence.
- Verification: `node --check scripts\roll20_chat_targeted_renderer_plan.mjs`, `corepack pnpm run test:roll20-chat-renderer-targets`, `corepack pnpm run plan:roll20-chat-renderer-targets -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `git diff --check`, `corepack pnpm run lint`, `corepack pnpm run build`, and `corepack pnpm run guard:ui-copy` passed.
- Claim boundary: handoff/gate safety only. No renderer CSS was promoted and no new actual Roll20 screenshot evidence was captured.

## 2026-07-13 Chat Template Scope Gate

- Added `scripts/roll20_chat_template_scope_gate.mjs` plus `gate:roll20-chat-template-scope` and `test:roll20-chat-template-scope`.
- The gate reads the targeted renderer plan, width reconciliation, candidate comparison, style proof, and renderer policy reports. It blocks global ChatPane renderer CSS when high-mismatch fixtures require different template scopes or models.
- Current active run result: `HOLD_GLOBAL_CHAT_RENDERER_PATCH`. AW2E is routed to `.sheet-rolltemplate-aw` with `MESSAGE_CONTENT_TEXT_METRICS`; YSHY is routed to `.sheet-rolltemplate-coc` with `TABLE_INTRINSIC_SANITIZE_FONT`; Les-Oublies remains default/P1 for now.
- Wired the scope gate into `gate:roll20-renderer-action`, so the top-level renderer gate now emits a blocker: high-mismatch fixtures require split renderer models and split template scopes, and current best candidates are not promotion-ready.
- Added the scope gate to `diagnose:roll20-chat-refresh` after the targeted plan and before the top-level renderer action gate.
- Verification: syntax checks, `test:roll20-chat-template-scope`, standalone scope gate against `2026-06-18-state-map-v1`, top-level `gate:roll20-renderer-action`, full `diagnose:roll20-chat-refresh`, `git diff --check`, `lint`, and `build` all passed.
- Claim boundary: this is promotion safety. It does not prove visual parity and does not apply renderer CSS.

## 2026-07-13 Edit Canvas Drop Label Feedback

- Added a visible Shadow DOM drop-label marker for edit-canvas widget drags. Canvas targets now show Korean badges for `안에 넣기`, `앞에 넣기`, `뒤에 넣기`, and `자유 배치` while preserving the existing Roll20-rendered sheet plus edit overlay approach.
- The label marker is separate from the before/after insertion line, so flow insertion and frame-relative free placement are both readable during drag, not only after drop.
- Hardened `scripts/edit_flow_browser_smoke.mjs` so the browser smoke fails unless those label markers are present with fixed overlay positioning for inside, before, after, and free-placement drags.
- Verification: `check:server-hygiene` passed before and after smoke, `test:layer-roles` passed, `lint` passed, `build` passed, and `smoke:edit-flow -- --out-dir ./out --base-path /roll20-block-editor --report-dir ..\_tmp_edit_flow_smoke_drop_label --port 4319` passed with 0 console/page errors.
- Note: the repo `reports/` directory was read-only in this Windows session, so this smoke's local screenshots/JSON were written to ignored parent temp evidence instead of `web-push-main/reports/`.
- Claim boundary: this improves edit-mode drag clarity only. It does not prove actual Roll20 visual parity and does not change chat/rolltemplate renderer readiness.

## 2026-07-13 Asset Canonical Candidate Detection

- Extended `lib/export/asset_refs.ts` so import/export preflight distinguishes insecure HTTP assets, canonical/direct URL candidates, and Imgur direct-link candidates.
- Replacement-map drafts now keep the normal placeholder lines and additionally add commented `verify-permission` candidates for review. Examples covered by tests: `https://imgur.com/<id>.png` to `https://i.imgur.com/<id>.png`, `http://i.imgur.com/<id>.jpg` to HTTPS, protocol-relative URLs, and Roll20 `imgsrv.roll20.net/?src=` sources.
- Updated Import and Export dialogs to show `HTTP URL`, `직링크 후보`, and `Imgur 직링크` metrics, plus Korean copy explaining that candidates still require permission/ownership and Roll20 loading checks.
- Hardened `scripts/export_dialog_browser_smoke.mjs` so browser smoke fails unless both import and export drafts include canonical/direct suggestions and the new UI metrics render.
- Verification: `test:asset-refs`, `test:asset-replacements`, `lint`, `build`, and `smoke:export-dialog -- --report-dir ..\_tmp_codex_smoke\export-dialog-asset-canonical-20260713-r3 --port 4388` passed. Final server hygiene still found no project dev/smoke listener and preserved CDP `9222`.
- Claim boundary: this does not copy assets, does not silently rewrite user sheets, and does not prove Roll20 visual parity. It only makes the relink step less blind before the next Sandbox/test-room comparison.

## 2026-07-13 Asset Relink CLI Template Alignment

- Updated `scripts/roll20_asset_relink_verification_plan.mjs` so the ignored `asset-relink-map-template.txt` includes canonical/direct `verify-permission` suggestions for unresolved asset blockers, matching the import/export dialog draft behavior.
- Hardened replacement-map parsing in `lib/export/asset_replacements.ts`, `scripts/lib/assetReplacements.mjs`, and the relink verification plan so generated trailing notes are stripped from active replacement targets. This prevents a user from activating a draft line and accidentally turning the explanatory `# reason` text into part of the URL.
- Verification: `node --check scripts\roll20_asset_relink_verification_plan.mjs`, `corepack pnpm run test:asset-replacements`, `corepack pnpm run test:roll20-asset-relink`, and a live ignored relink-plan run against `reports\roll20-actual-compare\2026-06-18-state-map-v1` passed. Pattern check on the ignored template found `verify-permission` suggestions without committing private URLs.
- Claim boundary: this is relink workflow usability only. It still requires user-owned HTTP(S) replacements and fresh local + Roll20 Sandbox/test-room comparison before visual parity can be judged.

## 2026-07-13 Script Asset Replacement Parser Coverage

- Rechecked the active Roll20 actual status before changing code: generated actual screenshots/diffs are `6/6`, chat structure is matched, but renderer action remains `HOLD_PRODUCTION_RENDERER_PATCH` and `rendererReady=NO`.
- Current blockers are unchanged: AW2E/YSHY still require user-owned HTTP(S) asset relinks before local preview/edit/export plus Roll20 Sandbox/test-room comparison can honestly judge visual parity.
- Added `scripts/lib/assetReplacements.test.mjs` so the script-side relink parser used by local baseline/preupload tooling is tested directly, not only through the app-side TypeScript parser.
- Extended `test:asset-replacements` to run both the app parser tests and the script parser tests. The script test covers active draft-note stripping, placeholder rejection, unsafe target rejection, duplicate handling, and HTML/CSS URL replacement.
- Claim boundary: this hardens the next real verification path only. No user asset was relinked, no Roll20 upload happened, no renderer CSS was promoted, and Roll20 visual parity remains unproven.

## 2026-07-13 Preupload Asset Map Roll20 Readiness Gate

- Added script-side Roll20 readiness classification for replacement-map targets: http(s)/protocol-relative targets count as Roll20-ready, while `data:` and relative paths stay local-only.
- `roll20_actual_local_baseline` now records asset-map readiness counts in local-only reports while still allowing local-only targets for preview/edit plumbing checks.
- `verify:roll20-preupload` now fails before upload-package checks when `--asset-map-file` contains local-only or placeholder targets, because those maps cannot prove Roll20 Sandbox visual parity.
- Also added ignored temp fallback for preupload verification reports when the canonical run folder is locked/read-only.
- Claim boundary: this prevents a false Roll20-upload-ready state only. It does not provide user-owned replacement URLs, upload to Roll20, or prove visual parity.

## 2026-07-13 Import/Export Asset Copy Polish

- Cleaned product-facing import/export asset wording so users see Korean labels such as `Roll20 프록시`, `Imgur 페이지`, `placeholder 위험`, `데이터 URL`, `HTTPS/직링크 후보`, and `placeholder 대상` instead of mixed English/translationese.
- Localized app-side asset replacement parser warnings because those warnings are displayed directly in the export dialog.
- Extended `guard:ui-copy` to scan `lib/export/asset_replacements.ts` and reject the old mixed labels in product UI paths.
- Verification: `guard:ui-copy`, `test:asset-refs`, `test:asset-replacements`, `build`, `smoke:export-dialog -- --report-dir ..\_tmp_codex_smoke\export-dialog-copy-polish-20260713-r2 --port 4390`, `lint`, `git diff --check`, and `check:server-hygiene` passed. The smoke confirmed `hasMojibake=false`, zero console/page errors, and the placeholder guard text now uses Korean parser warnings.
- Claim boundary: UI wording clarity only. This does not relink assets, upload to Roll20, promote renderer CSS, or prove Roll20 visual parity.

## 2026-07-15 Render Boundary, CI/CD Gate, and Research Track

- Reaffirmed the product boundary in `AGENTS.md` and `docs/operations/33_working_rules_and_requirements.md`: no copyrighted/public Roll20 sheet samples in the app or public repo; user import and ignored local evidence are allowed; mapping must remain universal; legacy and modern Roll20 modes must stay separate.
- Added `ci:verify` through `scripts/ci_verify.mjs` so CI reuses the same pnpm executable that launched the script, avoiding Windows/Corepack nested-pnpm drift.
- Updated `.github/workflows/ci.yml` so `main`, `dev`, and PRs run safety/unit verification, lint, and build.
- Updated `.github/workflows/deploy.yml` so the GitHub Pages deploy repeats safety/unit verification and lint before static export/upload.
- Updated `docs/operations/34_branch_and_deployment_plan.md`: GitHub Pages is enough for the current static export, while actual Roll20 room/sandbox verification remains local/browser evidence because it depends on login/private sheet material.
- Reran current source/intrinsic diagnostics into ignored temp evidence: AW2E and Les need crop/top-origin separated from intrinsic table width; YSHY needs Roll20 sanitize/rule order, table auto-layout intrinsic sizing, and crop/top-origin modeled together.
- Current renderer gate still correctly holds production renderer CSS: `HOLD_PRODUCTION_RENDERER_PATCH`, with source/intrinsic, template-scope, candidate-audit, and asset-policy blockers.
- External research started: Roll20 official/wiki/GitHub sources remain the implementation baseline, while dated forum posts are only hypotheses. Initial useful lead: newer sheet sanitizer and rolltemplate sanitizer behavior may differ, so rolltemplate parity cannot be inferred from sheet iframe parity.
- Verification so far: `corepack pnpm run ci:verify` passed; `gh auth status` confirms authenticated access to `Song991123/roll20-block-editor`.
- Claim boundary: CI/CD is safer and renderer evidence is fresher, but this does not prove Roll20 visual parity, does not relink private assets, and does not promote renderer CSS.

## 2026-07-15 Multi-Agent Render Plan, Optimization, and Security Strategy

- Added `docs/research/40_roll20_render_reference_inventory.md` so Roll20/GitHub/forum/editor references are tracked with evidence boundaries instead of scattered chat memory.
- Added `docs/operations/38_multi_agent_render_plan.md` with current progress estimates, branch strategy, server hygiene commands, Codex/Claude/MacBook allocation, copy-paste prompts, optimization strategy, security strategy, and reporting contract.
- Updated `AGENTS.md` startup order so future agents read the research inventory and multi-agent plan before branching, optimizing, or claiming status.
- Added shared skill source at `agent/skills/roll20-render-ops` and installed the same skill locally at `C:\Users\acorn\.codex\skills\roll20-render-ops`. MacBook should copy or symlink the repo skill folder into its Codex skills directory.
- Claim boundary: this is operations/security/performance planning and handoff tooling. It does not itself improve Roll20 pixels, edit UX, or renderer readiness.

## 2026-07-15 Two-Host Codex and Claude Code Execution Prompts

- Added `docs/operations/39_two_host_agent_prompts.md` for the actual available capacity: this Windows Codex lead, one additional MacBook Codex, and two Claude Code workers.
- Claude Code is assigned persistent implementation tracks rather than short read-only Cowork audits: Windows owns universal mapping plus legacy/modern separation; MacBook owns CI/CD plus security/public-evidence gates.
- Each worker uses a separate physical worktree or clone and branch. Only the Windows Codex lead merges, updates shared progress docs, pushes the integration branch, and decides deployment readiness.
- Every prompt includes startup reads, protected file boundaries, acceptance commands, commit/push requirements, and a structured handoff with commit hash and residual VERIFY items.
- Verification: `git diff --check` and `corepack pnpm run check:server-hygiene` passed; no project dev/smoke listener or CDP listener was active.
- Claim boundary: coordination and handoff implementation only. No renderer, importer, editor, Roll20 upload, or visual parity behavior changed in this batch.

## 2026-07-13 Roll20 Sandbox Diagnostic Copy Polish

- Cleaned the export dialog's Roll20 Sandbox diagnostic rows so implementation terms no longer leak into visible UI: `selector prefix` became `선택자 보정`, `class prefix` became `클래스 보정`, and `proxy/drop` became `프록시 처리/제거`.
- Hardened `smoke:export-dialog` so the Sandbox diagnostic rows fail if those mixed English implementation terms return.
- Verification: `guard:ui-copy`, `node --check scripts\export_dialog_browser_smoke.mjs`, `build`, `smoke:export-dialog -- --report-dir ..\_tmp_codex_smoke\export-dialog-sandbox-copy-20260713-r1 --port 4391`, `lint`, `git diff --check`, and `check:server-hygiene` passed. The browser smoke confirmed the new Korean diagnostic row text, `hasMojibake=false`, and zero console/page errors.
- Claim boundary: visible UI clarity and regression coverage only. No renderer CSS was promoted, no Roll20 upload happened, no asset was relinked, and visual parity remains unproven.

## 2026-07-13 YSHY Roll20 Actual Payload Reapplied and Chat Metrics Refreshed

- Server hygiene before live Roll20 work: no project dev/smoke listeners were running; only the approved CDP browser on `127.0.0.1:9222` remained open for Roll20 verification.
- Re-applied `yshy-commission-1bu` to the dedicated Roll20 Sandbox/test campaign `21639681`. The settings page apply helper reported storage/save as not enough for visual proof, so the editor was reloaded and the character iframe was probed separately.
- Reopened sandbox character `Witrav Upijek` and captured strong sheet-frame evidence in ignored temp output: `sheetHitCount=65`, `rootCount=3`, `attrCount=1069`, `rollButtonCount=808`.
- Added safe output routing for the live chat proof chain: `plan:roll20-chat-capture --out-dir` writes fresh snippets outside locked canonical `reports/`, and `capture:roll20-chat-cdp --snippet` can consume that temp snippet without copying private evidence into the repo.
- Fresh Roll20 chat capture clicked `roll_str_check` and captured `sheet-rolltemplate-coc` with `rolltemplateCount=6`, paired `roll20-chat.png`, current row metrics, and computed style fields.
- Important measured result: actual Roll20 CoC table computed `display=table`, `tableLayout=auto`, `minWidth=0px`, `maxWidth=280px`, but used table width was `1248.328125px`.
- Feeding that sidecar into `diagnose:roll20-chat-table-layout-constraint` classified YSHY as `TABLE_AUTO_LAYOUT_OVERRIDES_MAX_WIDTH_BOTH_CONTEXTS`; source `max-width` exists and is applied, but table auto-layout/intrinsic sizing still determines used width.
- Claim boundary: this is actual Roll20 iframe/chat evidence and a stronger root-cause classification, not visual parity and not a production renderer CSS patch. Next P0 is a scoped `.sheet-rolltemplate-coc` table intrinsic/min-content model with AW2E/Les nonregression proof.

## 2026-07-13 YSHY Korean Glyph Metric Candidate Rejected

- Added diagnostic-only ChatPane typography policy `yshy-korean-glyph-metrics` after comparing actual Roll20 text measurement evidence against local browser font-family candidates.
- The hypothesis was useful but narrow: the candidate matched the YSHY CoC table used width exactly (`1248.328125px`) while keeping source `maxWidth=280px`, proving the table-width delta is strongly tied to glyph/text metrics.
- The same candidate failed visual gates and must not become production CSS:
  - `diagnose:roll20-chat-candidates` with isolated candidate screenshots returned `reject-regresses-fixtures`, mean `+15.25%`, regressions `2`, YSHY aligned delta `+4.7%`.
  - `diagnose:roll20-chat-row-raster-candidates` returned `reject-row-raster-regression`, AW2E weighted `17.93% -> 62%` (`+44.07`) and YSHY weighted `21.41% -> 32.11%` (`+10.7`).
- Claim boundary: this is negative diagnostic evidence only. It does not change default ChatPane rendering, does not prove visual parity, and should prevent future agents from chasing glyph metric substitution as the production fix.

## 2026-07-17 - External font runtime split from actual Roll20 evidence

- Read-only actual evidence isolated a real mode-specific cause in the prepared sheet: modern kept the direct external `@font-face` URL and activated the font, while legacy rewrote it through `imgsrv.roll20.net` and fell back because the font was inactive. Both runtimes otherwise reported the same table collapse/spacing/layout values.
- Added `lib/preview/runtimeFontPolicy.ts` and applied it through the shared prepared render contract. The rule is generic and limited to external URLs inside `@font-face`: modern remains authored, legacy uses the Roll20 proxy, already-Roll20-hosted/proxied and non-http URLs are preserved.
- Export remains a separate boundary. Preview-only proxy URLs are not baked into ZIP CSS; the legacy ZIP still uses the existing compatibility sanitizer and writes `sheet.json.legacy=true`, while modern preserves authored CSS and writes `false`.
- Synthetic contract and ZIP tests pass. Ignored browser evidence `%TEMP%\roll20-legacy-font-policy-r9` passes with modern `1189x1936`, active direct font, and legacy `898x1918`, inactive proxied font. The legacy final table is now `181.28px` local versus `180.675px` actual, but column allocation remains `178.13/171.61px` local versus `166.075/183.637px` actual.
- The browser smoke keeps the expected proxy-font CORS messages in evidence and fails only on unrelated console errors. Generated source, screenshots, and reports remain ignored; no Roll20 room/source was modified.
- Next: diagnose the remaining legacy intrinsic column allocation and 2px root-width/1px height residual using generic computed-style/font metrics. Do not promote a table-, attribute-, or font-family-specific patch.
## 2026-07-17 Roll20 Document Language and Import SFX

- Recovered after a Codex desktop restart and resumed from the existing clean branch plus the in-progress ignored visual harness. No unneeded project or CDP listener was left running.
- Added `lib/editor/blocklySoundPolicy.ts` with a focused regression test. Blockly import/create events stay silent; only a real drag into a changed parent plays `block.snap`.
- Added a validated document-language input to the shared preview contract. The default now follows measured Roll20 evidence (`en`), the mounted toolbar exposes an override, and iframe source/live patch/Shadow fallback use the same value.
- Extended `smoke:legacy-fixture-visual` with fresh-page legacy capture, transition-vs-fresh geometry comparison, table direct-text/control diagnostics, and a reversible document-language probe.
- Focused ignored evidence `%TEMP%\roll20-legacy-language-and-sfx-r14` PASSed: import `6530` blocks, structural match `100%`, AudioContext errors `0`, modern `1189x1936`, legacy transition/fresh `896x1919`, and transition/fresh maximum geometry delta `0`.
- Actual-vs-local claim remains partial. Actual legacy is `896x1917`; local final-table cells are `172.297/177.438px` versus actual `166.075/183.637px`. The remaining intrinsic allocation and height residual stay P0.
- Verification: `test:blockly-sound-policy`, `test:roll20-render-modes`, lint, production build, `check:server-hygiene`, focused external-resource browser smoke, and `git diff --check` passed.
- Private fixture source, screenshots, and reports remain ignored and uncommitted.

## 2026-07-17 Capture Stability and Collapsed Sidebar Cleanup

- Windows Event Viewer confirmed that the Codex desktop package itself crashed during the long-running session: `OpenAI.Codex_26.707.9981.0` / `ChatGPT.exe`, exception `0xc06d007f`. The protected WER dump contents were not readable in the current process, so the underlying module/root cause remains unproven. Heavy browser checks are being run sequentially and project listeners are closed after each smoke.
- Added browser executable/version/user-agent evidence to `smoke:legacy-fixture-visual` and hardened full-sheet capture against its own temporary layout changes. A capture is accepted only when pre/post geometry matches; one bounded retry is allowed after stabilization.
- Ignored Chrome 150 run `%TEMP%\roll20-legacy-capture-stability-r16` proved the guard works: unstable first modern/fresh attempts were discarded and stable retries were accepted. The run still FAILed overall because 34 external Imgur image requests failed, so its shortened geometry is not used for Roll20 parity claims.
- The preceding complete-asset Chrome 150 DOM evidence `%TEMP%\roll20-legacy-installed-chrome-r15` put legacy root/table allocation within subpixel distance of actual Roll20 evidence. This makes the older Chromium 148 residual browser/context-sensitive; no renderer CSS compensation was added.
- Removed the collapsed left sidebar's duplicate no-op button and unused `56px` rail. The real header toggle now collapses the sidebar to `0px` with no mounted child.
- `%TEMP%\persistent-preview-sidebar-r17` PASSed modern and legacy independently: sidebar `280px -> 0px -> 279.125px`, collapsed button/child count `0`, persistent iframe reload count `0`, console/page errors `0`, and existing worker/rolltemplate/edit interaction assertions intact.
- Verification: syntax checks, `git diff --check`, lint, production build, and persistent preview surface browser smoke PASSed. Actual Roll20 runtime metadata and a same-asset local/actual recapture remain P0.

## 2026-07-17 - Mode-specific runtime asset contract

- Recovered from a confirmed Codex desktop application crash with the task branch clean at merge commit `6c4bea6`. Heavy browser work remained sequential and the focused smoke listener was closed after each run.
- Read-only Chrome evidence from the dedicated modern Sandbox and legacy test room proved a four-way asset rule for the same payload: modern proxies HTML images but leaves stylesheet/inline CSS direct; legacy leaves HTML images direct but proxies stylesheet and inline CSS URLs. Both actual runtimes loaded all `11` images.
- Replaced `runtimeFontPolicy.ts` with fixture-agnostic `runtimeAssetPolicy.ts`. Iframe preview, persistent live patch, and Shadow fallback now share the same measured policy. Authored source and ZIP export remain unmodified.
- Added synthetic coverage for quoted/unquoted images, stylesheet fonts/backgrounds, inline-style backgrounds, relative/data URLs, Roll20-managed URLs, double-proxy prevention, hostname lookalikes, and parentheses. The optional Sandbox diagnostic path now defers URL direction to the same mode-specific policy.
- Extended `smoke:legacy-fixture-visual` with host-only asset evidence for image attributes/current sources, user CSS, inline CSS, computed backgrounds, and failed/pending image counts.
- Ignored Chrome 150 run `%TEMP%\roll20-runtime-asset-policy-r20` matched actual host direction in modern and legacy, but FAILed its visual gate because all remote images/fonts failed locally. Its shortened geometry is recorded as blocked evidence, not parity.
- One initial integration assertion used a nonexistent live-patch field and was corrected to the real `html` field. A second test caught invalid quote nesting for a bare CSS URL inside `style="..."`; the policy now chooses the opposite quote for bare inline URLs and preserves valid HTML.
- Production build initially hit `EPERM` on a `.next` diagnostic file owned by the prior Codex sandbox identity. No locking process was reported; the approved user-context build succeeded. This was an environment ownership issue, not a TypeScript/build failure.
- Contract verification passed: full `ci:verify`, lint, `test:runtime-asset-policy`, `test:roll20-sandbox-sanitize`, `test:roll20-render-modes`, `test:export-smoke`, and the production build. Commit/push and GitHub CI remain for the end of this coherent batch.
- Next P0: obtain asset-complete same-Chrome local evidence and compare modern/legacy geometry independently. Do not convert network/relink failure into renderer CSS.

## 2026-07-17 - Generation-specific Roll20 validation destinations

- User-confirmed operating constraint: Custom Sheet Sandbox does not recognize or reproduce the legacy Roll20 runtime.
- Updated agent rules, actual-screen operations, the Sandbox contract, and the active TODO so modern actual checks target Custom Sheet Sandbox while legacy checks target a dedicated legacy-enabled test room.
- A legacy-intended package shown in Sandbox is now classified as `RUNTIME_MODE_MISMATCH`; it cannot count as legacy PASS, legacy FAIL, or visual-parity evidence.
- This is a validation-contract correction only. It does not itself change preview rendering or prove modern/legacy parity.

## 2026-07-17 - Same-Chrome asset-complete comparison and render-toggle optimization

- Ran same-browser local/actual diagnostics without retaining source identity, media, screenshots, dimensions, asset counts, or per-sheet measurements. The run confirmed that the mode-specific runtime asset policy is pointed in the right direction, but strict visual parity remains unproven.
- The diagnostic exposed a large render-toggle stall. `PreviewMain` prepared the same source independently for iframe document, live patch, and Shadow fallback.
- Added `buildSheetRenderBundle` so iframe outputs and optional Shadow parts share one prepared contract. Shadow serialization is produced only when Shadow mode is selected.
- Removed both quadratic paths in legacy `stripKeyframes`: bounded keyword matching no longer processes the remaining stylesheet at every character, and warning line numbers no longer rescan from the beginning for every keyframe.
- Added the legacy sanitizer suite to `ci:verify`. Its copyright-safe synthetic scaling case doubles keyframe-heavy input, checks warning-line correctness, rejects quadratic growth, and enforces a broad absolute ceiling.
- Added an HTML-stable live-patch fast path. CSS-only edits now preserve the mounted sheet DOM and skip full attribute collection, worker reinstall, repeating-control rebuild, and block recount; unchanged style nodes are not rewritten. Structural HTML changes still use the conservative full-root replacement path.
- Synthetic contract tests verify that CSS-only changes retain the HTML key while structural changes invalidate it. Mounted large-sheet interaction latency remains `VERIFY`; do not describe the fast path as a complete lag fix until an ephemeral browser run proves frame and commit budgets.
- Remaining performance blocker: structural edits still parse and replace the full root. Keyed/partial structural apply plus a stricter interaction budget remain P0.
- Third-party external validation sources are now ephemeral-only. Their identity, URL, source, media, screenshots, fixtures, and per-sheet reports must not be retained; only generic fixes and synthetic tests may persist.
- Verification for this batch: focused render/sanitizer/bridge tests, full `ci:verify`, lint, and the production build passed. Browser-mounted performance proof was intentionally not claimed in this batch.

## 2026-07-17 Anonymous Performance Report Privacy Guard

- DONE: Imported-edit performance summaries now always use anonymous fixture labels and a generic local source label. Legacy opt-out arguments cannot restore identifiers or absolute paths.
- DONE: Added a privacy self-test to the normal CI safety suite. It fails if a private fixture label or local source path escapes into the generated summary.
- VERIFIED LOCAL: The privacy self-test, lint, and full `ci:verify` passed. No external sheet identity, source text, asset URL, screenshot, or source-specific report was added.
- CLAIM BOUNDARY: This protects report output only. It does not make the current local performance metrics proof of Roll20 visual parity or broad import fidelity.

## 2026-07-17 Keyed Structural Apply

- DONE: Structural iframe updates now try a block-keyed DOM patch first, reusing matching nodes and moving only the affected order/structure. The previous full-root replacement remains as a guarded fallback.
- DONE: Added runtime counters for keyed patches and fallback replacements so a smoke can distinguish the two paths.
- VERIFIED SYNTHETIC: Persistent preview modern/legacy smoke passed with one iframe, zero reloads, no page/console errors, and zero structural fallback applies in the exercised path.
- VERIFIED SYNTHETIC: Edit-flow smoke and full `ci:verify` passed after the patch.
- CLAIM BOUNDARY: This reduces local structural apply churn; mounted latency on a broad user-import corpus and actual Roll20 parity remain unverified.
## 2026-07-17 Anonymous Batch Update: Canonical Render and Interaction Smoke

- Implemented: automatic canvas measurement now uses descendant paint bounds instead of the generated wrapper viewport, so narrow imported sheets are not forced to the default width.
- Implemented: new-sheet reset restores the `850px` default; manual width entry remains stable until the user resets automatic sizing.
- Implemented: imported edit synchronization smoke now observes the persistent iframe directly instead of the retired Shadow Canvas selector.
- Verified: modern/legacy persistent preview smoke, large synthetic smoke, canonical synthetic edit/preview coordinate sync, lint, build, `ci:verify`, and server hygiene passed.
- Boundary: these checks prove the local renderer contract and synthetic interaction path only. Actual Roll20 parity and broad user-import coverage are still open gates.
- Privacy: this update records no creator, sheet, source URL, source snippet, asset URL, screenshot, or source-derived measurement. Future progress entries must use the same anonymous convention.
## 2026-07-17 Canonical Iframe Smoke Repair

- Repaired the preview/edit visual smoke to use the product's persistent iframe in both modes. The old Shadow Canvas selector had caused false 30-second failures after the visible edit surface migration.
- Added parent-overlay-aware capture: clean edit screenshots hide only parent edit overlays, while a separate overlay capture retains the interaction affordance.
- Legacy smoke now distinguishes the known Roll20 font-proxy CORS pair from unexpected console errors without hiding unrelated failures.
- Verified: modern/legacy visual smoke, canonical imported-edit interaction smoke, and roll-button chat smoke passed locally. No external source identity or source-derived evidence was added to this progress entry.
- Boundary: actual Roll20 screenshot parity, broad worker coverage, and fixtures without roll buttons remain separate gates.

## 2026-07-17 Canonical Edit Flow Smoke and Cycle Guard

- Replaced the old Shadow Canvas browser smoke with a synthetic-only test against the persistent preview/edit iframe. The test covers flow/free placement, canvas widget insertion, layer before/inside/after dispatch, selection synchronization, width input, and cycle rejection.
- Added a final cycle invariant in the Blockly adapter and shared layer-tree helper so ancestor-to-descendant nesting is rejected even if a caller bypasses the panel guard.
- Verified locally with zero console/page errors; no external sheet source, identifier, screenshot, or derived measurement was added to this entry.
- Boundary: this proves the local interaction contract only. Actual Roll20 Sandbox/legacy-room behavior and broad imported-sheet coverage remain VERIFY.
## 2026-07-17 Canonical Roll20 Context and Immediate Edit Placement

- DONE: The persistent iframe keeps the actual Roll20 dialog selector context in its baseline CSS. Shadow fallback continues to use its isolated selector rewrite; the contracts are not conflated.
- DONE: Added an explicit preview dialog wrapper contract for `ui-dialog`, `dialog`, `tab-content`, `sheetform`, and `charsheet-root`. The wrapper remains visually chrome-free while preserving authored Roll20 selector context.
- DONE: Edit dragging applies a transient transform to the existing iframe node during pointer movement. Pointer updates are coalesced by `requestAnimationFrame`, and the transform is cleared when the live patch is acknowledged or the move is rejected.
- DONE: Drop hit testing ignores the transiently moved subject, preserves a current flow container while the pointer remains on the subject, and allows a deliberate background drop to move the block back to root. Absolute children use parent-relative rendered geometry for subsequent moves.
- VERIFIED SYNTHETIC: Modern and legacy persistent preview smoke passed with zero iframe reloads, zero console/page errors, live flow nesting, free placement, re-commit, widget insertion, worker change, and rolltemplate/chat checks.
- VERIFIED SYNTHETIC: Edit-flow smoke, preview/edit visual smoke, iframe drop-target tests, build-doc bundle tests, lint, production build, and full `ci:verify` passed.
- VERIFY: Actual Roll20 modern Sandbox and dedicated legacy-room parity remain open. Local exactness is not actual Roll20 parity; external source identity, source payload, screenshots, and derived per-sheet evidence remain untracked.

## 2026-07-17 Actual Roll20 Sandbox Retry

- OBSERVED: The authenticated dedicated verification room loaded successfully in Chrome and exposed the modern Custom Sheet Sandbox controls.
- BLOCKED TOOLING: Both Playwright file-chooser selection and the browser's isolated page-evaluation path were unable to provide files to Roll20. The file chooser rejected local paths, while the isolated evaluator did not expose the browser `File` constructor needed to dispatch the same change event.
- VERIFIED STATE: After the retry, all three Sandbox file inputs still had zero selected files and no character-sheet iframe was created. Therefore no Roll20 sheet render screenshot or actual visual-parity result was produced.
- SAFETY: No existing room was modified. No third-party source identity, source payload, screenshot, asset URL, or derived measurement was added to tracked documentation.
- NEXT: Retry through a user-visible native file picker or an explicitly permitted browser upload path, then capture the dedicated Sandbox result before updating the actual-parity gate.

## 2026-07-17 Canonical Edit Surface Follow-up

- Updated friendly-widget creation to use deterministic sheet-space slots (`24px` origin with a small grid offset). The previous viewport-center measurement made first insertion positions depend on the surrounding browser layout and added unnecessary synchronous geometry reads.
- Reduced edit-layer ambiguity by making the Figma-style layer tree HTML-only. CSS and translation remain available through their own editing surfaces; they are not presented as visual DOM layers.
- Hardened iframe intrinsic sizing: fixed/sticky descendants and non-finite rectangles are excluded from content bounds, preventing surrounding dialog controls from participating in sheet height feedback.
- Focused verification passed: `test:build-doc-bundle`, `test:iframe-drop-target`, `lint`, and `git diff --check`.
- Full verification after the patch: `build`, `ci:verify`, `check:server-hygiene`, canonical edit-flow smoke, and persistent modern/legacy iframe smoke passed. Preview/edit visual smoke produced two passing comparisons and one mismatch with zero browser errors; the mismatch remains open.
- Claim boundary: this is a local interaction/sizing improvement. It is not actual Roll20 parity evidence, not broad import coverage, and not worker/roll-template completion. The modern upload remains tooling-blocked and the legacy destination remains separately unverified.

## 2026-07-17 Height Contract and Roll20 Upload Retry

- Implemented: iframe host height updates now commit one-pixel changes instead of ignoring every change below `8px`; this prevents small content growth from being clipped at the bottom.
- Verified locally: all three available anonymous preview/edit comparisons reached exact pixel parity, with matching DOM/style/geometry and zero browser/page errors.
- Verified locally: persistent modern/legacy iframe smoke, edit-flow smoke, `ci:verify`, production build, lint, and server hygiene passed. No project listeners remain.
- Actual Roll20 boundary: the dedicated modern Sandbox remained reachable, but Playwright `filechooser.setFiles` and the native-picker attempt were rejected by the current browser automation boundary. The file inputs remained unconfirmed and no sheet iframe was created; this run is not Roll20 parity evidence.
- Remaining: dedicated legacy-room verification, broad anonymous import coverage, and worker/roll-template parity. No source identity, payload, screenshot, asset URL, or derived source measurement was recorded.
- CI/CD: expanded CI push coverage to `main`, `dev`, and `codex/**`; Pages deployment remains `main`-only. Remote Actions run `29577253344` passed with `ci:verify`, lint, and build.

## 2026-07-17 Post-Update Stability Recheck
- Verified locally after the desktop update: `ci:verify` passed, including modern/legacy render modes, iframe edit bridge/drop target/layer-role tests, privacy guards, upload-snippet self-test, and chat-template scope checks.
- Verified locally: preview/edit visual smoke passed for both compatibility modes across the available anonymous local fixtures with pixel mismatch `0`, translation checks passing, and no browser/page errors.
- Verified locally: persistent preview surface reported `loads=0` for modern and legacy; edit-flow smoke passed.
- Tooling note: three standalone local audits hit Windows `EPERM` while reusing old ignored report/build directories. This is an evidence-folder/process cleanup issue, not renderer evidence; rerun in a fresh short-path local root before promoting those reports.
- Claim boundary: actual modern Sandbox render, dedicated legacy-room render, broad user imports, and worker/roll-template parity remain open.

## 2026-07-17 Local Payload Audit Recovery

- Repaired the local audit path without touching protected corpus folders: default reports/builds use short user Temp paths when old ignored folders are locked, while explicit output arguments remain available.
- Repaired the local baseline edit capture to use the same persistent iframe as preview. The prior Shadow Canvas selector caused false timeouts after the visible edit surface migration.
- Fresh local evidence (ignored Temp only) passed `3/3` baseline packages and `3/3` payload audits. The package boundary removed internal editor IDs, normalized comment-style translations to JSON, and preserved the required ZIP files.
- Focused checks passed: sandbox sanitizer test `7/7`, translation payload test, export smoke, and baseline generation.
- The pre-existing ignored baseline remains stale and failing by design of its old generated payload; it was not overwritten. No source identity, source payload, screenshot, fixture, or report was added to tracked docs.
- Actual Roll20 upload/render is still unverified because the current browser file-input path rejected local files and the Sandbox sheet iframe was not created. Legacy still requires its dedicated legacy-enabled room.

## 2026-07-17 Universal Structural Import Follow-up

- Implemented: Added generic container blocks for nested control labels and ordered/unordered list structures. Child nodes remain editable and their source order is preserved for layer operations.
- Verified: Import unit suite `22/22` passed, lint passed, and an anonymous local corpus rerun exercised the new matcher without writing source-derived measurements to the repository.
- Boundary: This is a focused importer improvement, not a claim of universal 100% mapping, actual Roll20 visual parity, or complete worker support.
- Blocker: Modern Sandbox upload is still blocked by the current Chrome file-input permission boundary; legacy actual verification still requires a separate legacy-enabled room.

## 2026-07-17 Structural Import CI Confirmation

- Verified remotely: CI run `29579712566` passed safety/unit verification, lint, and production build for the pushed structural import batch.
- Boundary: The remote green build validates the implementation batch only. Actual modern Sandbox rendering and dedicated legacy-room rendering remain unverified.

## 2026-07-17 Repeating Section Visibility Fix

- Implemented: Removed the generic runtime `display:none` rule that was hiding `fieldset.repeating_*` content. App-only repeating hints are no longer visible in the sheet surface.
- Verified: Runtime contract test, full local CI, production build, server hygiene, and both modern/legacy preview-edit visual smoke passed with no browser/page errors or pixel mismatch in the measured anonymous set.
- Boundary: This is local renderer evidence only. Actual Roll20 Sandbox upload/render and the separate legacy-room check remain open.
## 2026-07-17 Preserved Attribute Metadata

- Implemented a generic hidden Blockly field for safe attributes that do not yet have dedicated visible block fields. Emit re-injects only attributes not already generated by the block.
- Security boundary: event-handler attributes, `srcdoc`, and the internal block id are rejected. No raw sheet source or external identity was added to the repository.
- Verification: focused import/attribute tests, `ci:verify`, lint, production build, diff check, and server-hygiene passed locally.
- Still open: actual modern Sandbox upload/render and separate legacy-room validation. This batch is local importer/emitter evidence, not Roll20 parity evidence.
## 2026-07-17 Drop Commit Emit Flush

- Implemented an immediate emit path for completed iframe drops and friendly-widget inserts. Continuous pointer movement still uses the existing debounce; the drop result is published immediately and cancels the pending duplicate callback.
- Synthetic `6000`-block modern/legacy smoke passed after a production build. Optimistic placement remained under the `75ms` budget in both modes, structural patch fallback stayed at `0`, iframe reloads stayed at `0`, and browser/page errors stayed at `0`.
- The measured acknowledgement is local synthetic evidence only. Actual Roll20 modern Sandbox and dedicated legacy-room visual checks remain open.
## 2026-07-18 Roll20 Sandbox Upload Retry

- Read-only browser inspection reached the logged-in Roll20 Sandbox Tools dialog and confirmed the expected upload controls.
- The supported file chooser rejected the same local payload from both the workspace path and an isolated temporary copy. No upload, iframe creation, room mutation, or parity claim occurred.
- Next handoff condition: user-visible native picker or another approved upload mechanism. Existing Roll20 rooms remain untouched; legacy validation remains separate from modern Sandbox validation.

## 2026-07-18 Persistent Iframe Apply Race Fix

- Root cause: the first live apply could be posted while the persistent iframe was still transitioning through its load/bridge-ready lifecycle. The cleanup cancelled retries, while the pending-source guard prevented the load-triggered effect from sending again. The iframe stayed on its empty placeholder even though import and emit had succeeded.
- Implemented: `PreviewMain` now retries against the current iframe ref and permits the `onLoad`-triggered apply effect to resend an unapplied source. Large HTML patches are sent through a bounded `r20:edit-apply-chunk-start` plus `r20:edit-apply-chunk` protocol; the iframe joins and validates the chunks before one apply.
- Verified: fresh production build; `test:build-doc-bundle`; persistent synthetic modern/legacy smoke at `10,000` nodes with `loads=0`, zero console/page errors, flow/free placement, widget insertion, worker replacement, and rolltemplate chat; fresh ignored local anonymous fixture baseline PASS with actual iframe DOM detection and preview/edit capture.
- Verified remotely: GitHub Actions CI run `29610986192` passed safety/unit verification, lint, and production build for commit `7ec25e8`.
- Evidence boundary: the local baseline package and screenshots are ignored Temp artifacts only. The result proves the local persistent-render path and removes a false placeholder PASS; it does not claim actual Roll20 pixel parity or all-sheet support.
- Cleanup: temporary message probes and diagnostic DOM attributes were removed before the clean rerun. No source-derived fixture, screenshot, payload, report, creator identity, or external asset identity was added to tracked files.
## 2026-07-18 Canonical Iframe Recheck

- Re-read the active editor path after the desktop update. `EditorShell` mounts `PreviewMain` as the persistent render surface; `EditCanvas` supplies the toolbar and HTML layer panel while edit overlays are drawn over that iframe.
- Re-ran the anonymous local imported edit-sync smoke: PASS, preview/edit coordinates remained synchronized, and browser/page errors were zero.
- Re-ran anonymous local preview/edit visual smoke for modern and legacy modes: all three available inputs PASS with zero measured mismatch and zero browser/page errors.
- This does not change the actual Roll20 gate. The current logged-in modern Sandbox and separate legacy room were only read-only shape observations in this pass; no same-payload Roll20 parity claim is made.
- The old `LegacyShadowEditCanvas` function is not mounted by `EditorShell`; it remains an explicit cleanup candidate and must not be confused with the current edit renderer.
## 2026-07-18 Autosave Render-Context Preservation

- Added `documentLanguage` to the preview section of the combined autosave XML. The parser treats the field as optional so older autosaves still restore normally.
- Autosave now subscribes to language changes; restoring a snapshot reapplies the value before the next render contract is built.
- This is generic state preservation, not a fixture-specific language guess and not a claim that modern and legacy use the same font/asset policy.
- Fresh local legacy fixture smoke was recorded as diagnostic only: one input had equivalent transition geometry, while two exposed external Roll20 font-proxy failures and mode-specific width differences. No speculative renderer CSS was added.
- Verification passed: `ci:verify`, lint, production build, `git diff --check`, and `check:server-hygiene`.

## 2026-07-18 Post-Update Browser Stability Recheck

- Roll20 browser tooling recovered after the desktop update: the logged-in editor and Sandbox Tools surface were reachable and the expected three source controls were present.
- A pre-existing verification character opened successfully, but its rendered sheet was not the current local payload. It remains observation-only and is not parity evidence.
- The fresh supported upload attempt was rejected at `fileChooser.setFiles` with `Not allowed`; no file, sheet settings, or room state was changed.
- The desktop crash did not reproduce in this retry. Keep the actual modern Sandbox render and dedicated legacy-room render as `VERIFY`, not `DONE`.
## 2026-07-18 Product Goal Reset

- STATUS: The previous broad goal was too large to steer safely. The active control plane is now `docs/operations/41_product_reset_and_short_term_goals.md`.
- CURRENT TRUTH: Local shared preview/edit plumbing is implemented, but actual Roll20 visual parity is not proven. Modern Sandbox activation is partial evidence only; legacy requires the separate legacy-enabled destination. Universal mapping, worker/chat behavior, and direct-manipulation UX remain partial.
- DESIGN HANDOFF: Claude should work only from `docs/operations/42_claude_design_reset_handoff.md` in a separate worktree. The lead retains renderer, import/export, evidence, and shared status ownership.
- REPOSITORY CLEANUP: No protected source folder, legacy sibling, experiment copy, fixture, screenshot, or generated report was moved in this batch. The repository map and context pack now define the safe cleanup order.
- NEXT: Create the isolated design branch, review its first user-journey batch, then implement the preview-focus and edit-overlay acceptance checks in the lead worktree.
- DESIGN DIRECTION: The surrounding app UI will use an original light-pink/pastel system, not a Roll20 clone and not a dark blue/purple AI-dashboard palette. Imported sheet styling remains a separate render contract.
- TRUST SURFACE: Current persistence is local browser autosave/IndexedDB only. A future login/cloud-sync feature is not implemented. The product header still contains a GitHub link and requires a follow-up replacement with `mailto:sjh11235678@gmail.com`.

## 2026-07-18 Preview Focus And App Chrome Batch

- IMPLEMENTED: `EditorShell` now treats preview as a sheet-focused surface. The left/right panels and statusbar are not mounted in preview, while `PreviewMain` keeps the one canonical iframe alive.
- IMPLEMENTED: The header hides panel toggles in preview, exposes `mailto:sjh11235678@gmail.com` for bug reports, and no longer exposes a GitHub/source link in product chrome.
- IMPLEMENTED: `.app-shell.pastel` supplies an original pink/pastel shell palette without changing the iframe's Roll20 baseline or user stylesheet.
- VERIFIED: `smoke:persistent-preview-surface` passed modern and legacy after adding explicit focus assertions. `smoke:edit-flow` passed with zero console/page errors. Local lint, build, and CI verification passed.
- PARTIAL: The prepared visual smoke still has one modern-only anonymous fixture mismatch at `9.21%`; leave renderer promotion and actual Roll20 parity as VERIFY. This batch did not tune sheet CSS for that result.
- NEXT: Review the design branch against the reset handoff, then separately address the remaining generic renderer mismatch and actual Sandbox/legacy-room evidence.
