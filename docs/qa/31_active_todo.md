## 2026-07-30 Exact before/inside/after drop indicators

- DONE LOCAL: The persistent iframe overlay now paints `before` and `after`
  as thin edge insertion lines and `inside` as a full container frame. Each
  mode has a plain Korean action label; the layer panel uses the same visual
  distinction instead of one ambiguous full-row highlight.
- VERIFIED BROWSER: `smoke:edit-flow -- --port 4197` observed exact `before`
  and `after` modes, `data-r20-drop-indicator=exact`, labels `앞에 놓기` /
  `뒤에 놓기`, and 4px marker height while the flow move remained immediate
  and authoritative after emit/apply.
- VERIFIED LOCAL: `test:drop-indicator`, iframe drop-target tests, lint, and
  production build pass. The new helper is geometry-only and does not enter
  the Roll20 iframe stylesheet.
- CLAIM BOUNDARY: This improves local edit affordance truthfulness only. It
  does not promote actual modern Sandbox or dedicated legacy-room parity.
- NEXT P0: Complete user-visible three-file selection in the isolated modern
  Sandbox, then capture positive root/state/worker/roll/chat evidence. Keep
  legacy verification in a separate participant-gated test room.

## 2026-07-30 Worker overflow preservation

- FIXED LOCAL: `setAttrs` statements with more properties than the three-slot
  visual block now stay intact in `r20_raw_worker` instead of silently dropping
  later properties during import.
- VERIFIED LOCAL: worker parser regression now passes `26/26`; the full local
  CI, lint, build, and edit-flow gates remain required before the batch is
  pushed.
- CLAIM BOUNDARY: This improves lossless fallback behavior only. It does not
  claim that arbitrary worker JavaScript is block-mapped or executed by live
  Roll20.

## 2026-07-30 Worker options preservation

- FIXED LOCAL: `setAttrs(attributes, options)` now stays in the explicit raw
  worker boundary when the second options object is present. The prior parser
  kept only the first object, which could silently remove Roll20 behavior such
  as `{ silent: true }`.
- VERIFIED LOCAL: a regression test confirms the complete options statement is
  preserved and counted as one unsupported statement.
- CLAIM BOUNDARY: This is lossless preservation, not block-level support for
  `setAttrs` options or proof of live Roll20 worker execution.

## 2026-07-30 Worker declaration keyword preservation

- FIXED LOCAL: The shared variable-declaration block now carries `let`, `var`,
  or `const` as an explicit field. Import no longer silently rewrites `var`
  declarations to `let`, and the emitted worker source uses the selected
  keyword.
- VERIFIED LOCAL: parser regressions cover all three declaration keywords;
  broader CI and build gates remain required for this batch.
- CLAIM BOUNDARY: This preserves declaration kind; it does not claim complete
  JavaScript parsing or live worker execution.

## 2026-07-30 Isolated Sandbox connection retry

- VERIFIED EXTERNAL: A fresh tab listing still found the expected isolated
  Sandbox editor tab.
- BLOCKED EXTERNAL: Claiming that exact tab timed out before DOM inspection or
  file selection could begin.
- NO MUTATION: No existing room, campaign setting, chat, upload, or source
  material was touched. Actual Sandbox render parity remains open.
- NEXT P0: Recover a stable user-visible Sandbox handoff, then select only the
  anonymous HTML/CSS/translation payload and capture positive root/state,
  worker, roll, and chat evidence.

## 2026-07-30 Modern Sandbox file-selection retry

- VERIFIED EXTERNAL: The isolated Sandbox showed exactly one visible member and
  separate HTML, CSS, and Translation controls.
- BLOCKED EXTERNAL: A user-visible click and keyboard selection attempt did not
  attach the anonymous HTML file; the input still reported zero files and no
  sheet root or iframe appeared.
- NO MUTATION: No existing room, campaign setting, chat message, or source
  material was changed. The dedicated tab remains a handoff for manual file
  selection.
- NEXT P0: Select the three anonymous files through the visible native chooser,
  then capture positive modern root/state/worker/roll/chat evidence. Keep the
  legacy-enabled room as a separate gate.

## 2026-07-30 Worker binary-expression mapping

- DONE LOCAL: The worker parser now recursively maps supported top-level
  arithmetic (`+ - * / %`), comparison (`=== !== < <= > >=`), and logical
  (`&& ||`) expressions to the existing worker blocks. Unsupported syntax
  remains on the literal/raw preservation path.
- FIXED LOCAL: Worker `if` emission no longer adds a redundant outer pair of
  condition parentheses, allowing stable parsed-block roundtrip for the
  supported expression shape.
- VERIFIED LOCAL: parser `25/25`, worker workspace smoke, lint, production
  build, full `ci:verify`, persistent preview modern/legacy, edit-flow, and
  strict imported-edit synchronization all pass.
- VERIFY OPEN: This proves local parser/workspace/emit behavior only. Actual
  Roll20 worker execution, chat/roll runtime parity, modern Sandbox upload,
  and the separate legacy-enabled room remain unverified.
- NEXT P0: Complete user-visible three-file selection in the isolated modern
  Sandbox, then capture positive root/state/worker/roll/chat evidence.

## 2026-07-30 i18n title/html tag preservation

- DONE LOCAL: `data-i18n-title` and `data-i18n-html` now share the same
  supported-tag policy as aria labels. Their imported source tag is carried in
  an editable `TAG` field and emitted unchanged; unsupported tags continue to
  generic/container matching.
- VERIFIED LOCAL: import structure `41/41`, style/import `16/16`, emit
  contract, high-priority mapping `22/22` and `25/25`, lint, build, full
  `ci:verify`, persistent preview modern/legacy, edit-flow, and strict
  imported-edit sync pass.
- VERIFY OPEN: This closes two targeted i18n structure-loss cases. It does not
  prove arbitrary HTML/CSS losslessness or actual Roll20 parity.
- NEXT P0: Complete the user-visible three-file selection in the isolated
  modern Sandbox, then capture positive root/state/worker/roll/chat evidence.

## 2026-07-30 Sandbox positive-render retry

- VERIFIED EXTERNAL: The isolated modern Sandbox still shows exactly
  `1 구성원` and separate HTML, CSS, and Translation file controls.
- BLOCKED EXTERNAL: The connected page context exposes no `File`,
  `DataTransfer`, or `Uint8Array`, and the available file-input locator has no
  supported file-attachment method. No sheet root or iframe appeared.
- NO MUTATION: No existing room, chat, campaign setting, or source-derived
  payload was changed. The dedicated Sandbox tab was left as a handoff.
- NEXT P0: Select the three anonymous files through a user-visible native
  chooser or a supported browser context, then capture active root/state,
  worker, roll, chat, and asset evidence. Keep legacy verification separate.

## 2026-07-30 i18n aria-label tag preservation

- DONE LOCAL: Added a shared i18n display-tag policy and preserved the source
  tag for `data-i18n-aria-label` blocks through import and emit. Unsupported
  tags are left for the generic/container matcher instead of being rewritten
  to `<span>`.
- VERIFIED LOCAL: style/import tests `16/16`, import structure `41/41`, emit
  contract, lint, build, full `ci:verify`, modern/legacy persistent preview,
  edit-flow, strict imported-edit sync, and legacy preview smoke pass.
- VERIFY OPEN: This is one targeted mapping correction, not full HTML/CSS
  losslessness or actual Roll20 parity. Sandbox upload and dedicated legacy
  room evidence remain open.
- NEXT P0: Complete the user-visible three-file selection in the isolated
  modern Sandbox, then capture positive root/state/worker/roll/chat evidence.

## 2026-07-30 Anonymous Sandbox payload regenerated

- DONE LOCAL: Regenerated an anonymous three-file Sandbox payload under
  ignored `.tmp/roll20-sandbox-synthetic/` (`sheet.html`, `sheet.css`,
  `translation.json`). It contains no real sheet identity or internal block
  ids and is ready for a user-visible file selection in the dedicated Sandbox.
- VERIFIED LOCAL: Full `ci:verify` passed after the evidence purge, including
  upload safety, Sandbox sanitizer tests, render modes, worker/chat guards,
  privacy guard, and UI copy guard.
- LIMIT: Standalone `audit:payload` and `audit:roll20-sandbox-sanitize` still
  require a retained `reports/roll20-actual-compare/<run>/local-baseline/`.
  Their failure after the intentional evidence purge is an absent-input
  condition, not a parity result; use `roll20_preupload_verification.mjs` to
  regenerate a fresh local baseline before running those audits.
- NEXT P0: Select the three files in the open Sandbox and capture positive
  active-root/state/input/roll/chat evidence.

## 2026-07-30 Shared preview/edit render-surface audit

- VERIFIED LOCAL: `smoke:persistent-preview-surface` passed for modern and
  legacy modes with iframe load count `0`; the same iframe retained input and
  worker/runtime state while the compatibility mode changed.
- VERIFIED LOCAL: `smoke:edit-flow` passed and
  `smoke:imported-edit-sync:strict` passed for anonymous imported structures.
  Flow/free placement, iframe overlay, emitted HTML/CSS position state, and
  preview/edit synchronization stayed aligned.
- VERIFIED HYGIENE: server and CDP listener checks are clear after the run.
- CLAIM BOUNDARY: This confirms the local shared-surface contract only. It is
  not proof of visual equality with actual Roll20.
- NEXT P0: Complete the user-assisted modern Sandbox upload, then run the
  separate participant-gated legacy-room verification.

## 2026-07-30 Roll20 Sandbox handoff preparation

- DONE LOCAL: Regenerated an anonymous synthetic Sandbox payload containing
  HTML, CSS, and translation files under the ignored local handoff folder.
- VERIFY OPEN: The authenticated Sandbox dialog is visible in Chrome, but the
  supported native file chooser still requires a user-visible file selection.
  No upload, save, room change, screenshot, or parity claim has occurred.
- NEXT P0: Select the three synthetic files in the dedicated Sandbox only,
  then capture positive sheet-root, state, roll-control, and chat evidence.
  Keep legacy verification in a separate dedicated legacy-enabled room.

## 2026-07-30 Worker workspace boundary recheck

- VERIFIED LOCAL: The worker workspace smoke keeps ordinary page JavaScript in
  the separate JS workspace, moves Roll20 worker blocks out of visible HTML,
  emits one worker script, and survives the local re-import check.
- VERIFIED LOCAL: Worker state smoke and HTML/CSS/translation/worker emit
  contract tests pass. This confirms the local boundary only; actual Roll20
  worker execution and generated-sheet parity remain external gates.
- NEXT P1: Expand anonymous worker syntax coverage before claiming broad JS
  support; keep unsupported statements in the explicit raw-worker boundary.

## 2026-07-30 Worker classification false-positive guard

- FIXED LOCAL: Untyped legacy-script detection now ignores JavaScript strings
  and line/block comments before looking for Roll20 worker API calls. Ordinary
  page code containing documentation text is no longer moved to worker space.
- VERIFIED LOCAL: Import structure, emit contract, lint, build, and full
  `ci:verify` pass with explicit string/comment regression cases.
- LIMIT: This remains a lightweight classifier, not a complete JavaScript
  parser; unsupported worker statements must remain in the raw-worker block.

## 2026-07-30 Local compatibility roundtrip regression fix

- DONE LOCAL: Browser L2 import -> emit -> re-import -> emit now passes for
  one anonymous custom compatibility fixture and one anonymous legacy
  compatibility fixture. HTML/CSS/translation/worker outputs are stable and
  browser console and page errors are zero for both.
- FIXED LOCAL: Inline text, controls, labels, radio wrappers, `<br>`, and
  mixed inline/block list content no longer gain or lose whitespace during
  re-import. Reserved top-level text markers rehydrate as text blocks.
- VERIFIED LOCAL: emit/import focused tests, lint, production build, and the
  full `ci:verify` gate pass.
- PRIVACY: The source-derived inputs existed only in ignored local fixtures.
  Deletion was attempted after verification but the host rejected the guarded
  recursive operation before execution; they remain local-only and untracked.
- OPEN: This is browser L2 determinism, not visual parity with Roll20. Modern
  Sandbox activation and a separate legacy-enabled room remain external gates.

## 2026-07-30 Local render/edit gate refresh

- DONE LOCAL: `ci:verify` passed all unit, safety, import, legacy-sanitize,
  worker/chat-boundary, visual-synthetic, and evidence-guard checks.
- VERIFIED BROWSER: `smoke:persistent-preview-surface` passed modern and
  legacy modes; `smoke:fresh-sheet` and `smoke:edit-flow` passed. The edit
  surface still uses one persistent iframe and layer/gallery flow/free drops
  remain synchronized with model and emitted HTML.
- VERIFIED HYGIENE: no project or CDP listener remains after the run.
- BLOCKED EXTERNAL: Chrome tab control timed out while claiming the existing
  Roll20 Sandbox tab. No Sandbox upload, room write, screenshot, or parity
  comparison occurred.
- NEXT P0: Recover a supported user-assisted Sandbox file chooser, capture
  visible sheet-root/state/input/roll/chat evidence, then verify legacy in a
  separate dedicated test room with a fresh solo-participant preflight.

## 2026-07-30 Layer-panel drop onto the persistent iframe

- DONE LOCAL: Added a typed `r20:layer-drag` bridge so a layer row dragged
  from the Figma-style panel reaches the same iframe drop resolver as gallery
  blocks and widgets.
- DONE LOCAL: Flow drops preserve `before/inside/after` and free drops place
  the existing layer at the pointer coordinate, with cycle and container
  compatibility checks before Blockly changes.
- VERIFIED BROWSER: `smoke:edit-flow` confirms model parent, emitted HTML,
  and rendered iframe parent agree after both flow and free
  layer-panel-to-canvas drops; free mode also persists finite `left/top` and
  managed absolute CSS.
- VERIFIED LOCAL: bridge, build-doc, drop-target, design-position, lint, build,
  `ci:verify`, and server-hygiene checks pass.
- CLAIM BOUNDARY: This is anonymous local editor evidence only. It does not
  prove modern Sandbox or dedicated legacy-room visual parity.
- NEXT P0: Recover a supported modern Sandbox file-selection path and capture
  positive sheet-root/state/chat evidence; verify legacy separately.

## 2026-07-30 Block gallery drop through persistent iframe

- DONE LOCAL: Added a dedicated iframe edit-bridge message for block-gallery
  drags. Drops over the real rendered sheet now resolve the shared layer target
  contract instead of disappearing at the iframe boundary.
- VERIFIED BROWSER: Flow mode inserts a new block inside a valid frame;
  free mode keeps the frame parent and persists absolute `left/top` placement.
  The persistent preview/edit iframe remains the only render surface.
- VERIFIED LOCAL: bridge/build-doc tests, `smoke:edit-flow`, persistent preview,
  fresh-sheet, strict imported-edit sync, lint, build, and `ci:verify` pass.
- CLAIM BOUNDARY: This proves the anonymous local editor interaction only. It
  does not prove actual Roll20 Sandbox visual parity or arbitrary-sheet parity.
- NEXT P0: Recover a supported Sandbox file-selection path and capture positive
  modern root/state/chat evidence; keep legacy verification separate.

## 2026-07-30 Upload diagnostic and status-safety pass

- DONE LOCAL: Added `SANDBOX_NO_VISIBLE_SHEET_TARGET` to the generated Roll20
  upload and activation probes so an empty Sandbox character surface is
  distinguished from a parse or runtime failure.
- DONE LOCAL: Replaced the current status snapshot with an anonymous version;
  removed room identifiers, source-derived measurements, and historical
  private evidence references from the tracked document.
- VERIFIED LOCAL: upload-snippet self-test, lint, `ci:verify`, and production
  build passed. Generated outputs were removed afterward.
- VERIFY OPEN: Roll20 Sandbox activation and dedicated legacy-room comparison
  still require a stable browser handoff and visible sheet-root evidence.

## 2026-07-30 Roll20 Sandbox upload retry

- VERIFIED EXTERNAL: The dedicated `Sheet Sandbox Tools` dialog was present;
  the anonymous synthetic payload was dispatched to the HTML/CSS/Translation
  inputs and Roll20 reported modern runtime (`legacySanitization=false`).
- BLOCKED_EXTERNAL: The Sandbox page exposed no active sheet root, iframe,
  form, attribute, or roll button after dispatch, so activation was not
  visible and no parity screenshot was captured. The supported native chooser
  then timed out and reset the browser connection.
- NOT PROVEN: Upload persistence, sheet-root rendering, rolltemplate/chat,
  and visual parity. Do not treat the dispatch result as Roll20 parity.
- NEXT P0: Recover a stable visible chooser or open a Sandbox character sheet
  after user-assisted upload; then capture root/state/chat evidence. Keep
  legacy verification in a separate dedicated test room.

## 2026-07-30 Disposable evidence purge

- DONE LOCAL: Removed generated report evidence under `reports/`, retaining
  only the tracked policy README; about `1.09 GB` was deleted.
- DONE LOCAL: Removed `.next/`, `out/`, `.tmp/`, generated TypeScript/build
  files, and `debug.log` from the active worktree.
- VERIFIED: Server hygiene is clean, no generated report/fixture/build output
  is tracked, and protected source folders were not touched.
- NEXT P0: Re-run the modern Roll20 Sandbox upload with a supported visible
  file chooser, then verify legacy separately in a dedicated test room.

## 2026-07-30 Roll20 Sandbox upload handoff retry

- VERIFIED READ-ONLY: The open Roll20 page exposed the dedicated `Sheet
  Sandbox Tools` dialog and unique HTML/CSS/Translation file controls.
- BLOCKED_EXTERNAL: Applying the anonymous synthetic HTML reached the supported
  file chooser flow, but Chrome rejected `setFiles` with `Not allowed` before
  any file bytes were transmitted. No Roll20 room, chat, save, or setting was
  changed.
- REQUIRED HANDOFF: Chrome's ChatGPT extension must allow file URL access for
  the supported chooser flow, or the user must select the three synthetic
  files visibly. Actual Sandbox sheet-root, CSS, translation, rolltemplate,
  and screenshot evidence is still missing.
- NEXT P0: Re-run only after the upload permission/user-assisted chooser is
  available, then capture positive root/state/chat evidence before comparing.

## 2026-07-30 Reproducible synthetic visual gate

- DONE LOCAL: Added `generate:visual-synthetic` and
  `smoke:preview-edit-visual:synthetic`. The generator creates only an
  anonymous ignored fixture, and the browser gate confirms modern/legacy
  preview-edit equality at `0 pixels / 0 ppm`.
- GUARDED CI: `test:visual-synthetic` now checks the fixture contract inside
  `ci:verify`; it does not add any sheet sample, screenshot, or report to the
  public tree.
- VERIFY OPEN: This reproduces local render unification only. Actual Roll20
  Sandbox and dedicated legacy-room evidence still require the blocked upload
  handoff.

## 2026-07-30 Local runtime visibility and chat bundle

- DONE LOCAL: Synthetic worker-state smoke passed, including hidden input
  attribute updates used by CSS state selectors.
- DONE LOCAL: Synthetic roll button smoke passed and rendered a local
  rolltemplate card in ChatPane.
- DONE LOCAL: `roll20_runtime_visibility_verify` passed worker separation,
  hidden runtime nodes, preview/edit pixel equality, and rolltemplate chat in
  one bundle.
- VERIFY OPEN: This proves the local runtime simulation only; actual Roll20
  worker execution and chat screenshot parity remain unverified.

## 2026-07-30 Synthetic Roll20 pre-upload handoff

- DONE LOCAL: Anonymous synthetic `fixture-A` passed the full pre-upload gate:
  local baseline/payload hygiene, Sandbox sanitize audit, cleaned-payload
  roundtrip, state-selector audit, asset audit, and evidence guard.
- DONE LOCAL: Generated ignored handoff artifacts with HTML, CSS, Translation,
  ZIP paths and the required modern Sandbox activation/root/chat capture steps.
- VERIFY OPEN: The handoff correctly reports generated Sandbox and chat
  evidence as missing. No actual Roll20 screenshot, DOM sidecar, or parity
  result is implied by the pre-upload PASS.

## 2026-07-30 Large-workspace edit UX regression

- DONE LOCAL: The synthetic 5,200-item import kept `5,205` model blocks,
  rendered `0` SVG blocks, and preserved structure search/selection.
- DONE LOCAL: Edit mode used one persistent iframe, `20` virtual layer rows,
  and `0` Shadow edit hosts. The layer `inside` reparenting update matched the
  model, emitted HTML, and iframe nesting with no console/page errors.
- VERIFY OPEN: This is synthetic performance and interaction evidence; broad
  arbitrary-sheet and actual Roll20 runtime behavior remain separate gates.

## 2026-07-30 Local render regression batch

- DONE LOCAL: Fresh-sheet smoke passed with zero HTML blocks/layers in the blank
  state, no ghost `sheet-section`, default canvas width `850px`, one iframe,
  and non-screen-derived first placement.
- DONE LOCAL: Imported edit-sync strict smoke passed for synthetic generic and
  non-leaf flow fixtures; persistent preview surface passed for modern and
  legacy; edit-flow and worker workspace smokes passed.
- DONE LOCAL: An anonymous synthetic fixture in ignored `.tmp/visual-synthetic`
  rendered preview and edit for both modern and legacy. Pixel diff was `0`
  pixels / `0 ppm` in both modes, with nonblank screenshots and i18n `1/1`.
- VERIFY OPEN: The standard `test-fixtures/visual` directory remains absent by
  policy. No copyrighted or source-identifying fixture was recreated; the
  synthetic result is not actual Roll20 parity evidence.

## 2026-07-30 Archive cleanup completed

- DONE LOCAL: The explicitly authorized `03_ARCHIVE/legacy-single-file/`
  archive was fully removed after boundary, contents, and target absence were
  checked.
- VERIFIED: No protected source, canonical worktree, or external sheet folder
  was touched. Earlier blocked-attempt notes remain historical only.
- NEXT P0: Continue the modern Sandbox upload and separate legacy-room
  evidence gate; cleanup completion does not imply Roll20 parity.

## 2026-07-30 Page JS import/emit path reconciliation

- FIXED LOCAL: The browser/diagnostic import path now clears and hydrates the
  dedicated Page JS workspace, bumps its block count, and includes its output
  in the shared emit cache. This prevents stale or invisible page-JS blocks
  when importing a new sheet through `__perfHook.importSheet`.
- GUARDED LOCAL: The worker workspace browser smoke now imports a synthetic
  ordinary page script alongside a worker and verifies the Page JS block,
  emitted HTML script, and separate `emit.js` output.
- VERIFIED LOCAL: Page-JS smoke, legacy preview contract smoke, and the
  production build pass. Actual Roll20 page-script execution remains outside
  the sheet preview and is intentionally not run locally.
- NEXT P0: Resume the modern Sandbox upload handoff, then verify the separate
  legacy-room destination with a fresh solo participant preflight.

## 2026-07-30 Sandbox chooser handoff retry

- VERIFIED READ-ONLY: The existing Chrome tab exposed the dedicated `Sheet
  Sandbox Tools` dialog and the expected HTML/CSS/Translation file controls.
- BLOCKED: The supported native file chooser timed out on the synthetic
  HTML selection, and a follow-up tab claim timed out. No HTML, CSS, or
  translation file was transmitted; no room, chat, save, or setting changed.
- VERIFIED LOCAL: The browser session was finalized and project/CDP listener
  hygiene remains clear.
- NEXT P0: Resume through a user-assisted visible chooser or a newly
  supported Sandbox handoff, then require positive sheet-root evidence before
  capturing assets, state, or chat.

## 2026-07-30 Sandbox upload-rule toggle boundary

- FIXED LOCAL: The shared preview/edit toolbar now exposes the observed
  Custom Sheet Sandbox HTML/CSS cleanup as an explicit `업로드 규칙` toggle.
  It remains separate from the modern/legacy selector and defaults to OFF so
  authored modern classes are not silently rewritten.
- GUARDED LOCAL: The legacy preview smoke checks the toggle, store setter, and
  shared render-contract flag. This proves local wiring only; it does not
  prove current Roll20 Sandbox visual parity.
- VERIFIED REMOTE: GitHub Actions CI run `30515011933` for commit `91fa7fc`
  passed safety/unit verification, lint, and build.
- NEXT P0: Reconnect a supported modern Sandbox upload path and capture actual
  sheet-root, asset, state, and chat evidence; verify the legacy contract in a
  dedicated legacy-enabled test room.

## 2026-07-30 Visual display-atom role audit

- FIXED LOCAL: Visible `hr`, spacer, and line-break blocks now use the Flow
  layer role for authored ordering while explicitly advertising
  `canReceiveChildren=false`; icons use the Image role. They no longer look
  like invalid inside-drop containers in the layer panel or Shadow surface.
- FIXED LOCAL: The line-break generator now preserves its authored class in
  emitted HTML instead of silently dropping it.
- GUARDED LOCAL: The block catalog regression test now requires every
  user-facing display block to have a non-`other` layer role while keeping
  translation dictionary entries explicitly source-only.
- VERIFIED LOCAL: `test:layer-roles`, `test:emit-contract`,
  `test:import-structure`, `ci:verify`, lint, build, `smoke:edit-flow`, and
  strict imported-edit sync pass. Post-run server hygiene reports zero
  project/CDP listeners. Actual modern/legacy Roll20 parity remains
  unverified; the browser handoff gate is unchanged.
- NEXT P0: Run the full local CI/browser gates, then resume modern Sandbox and
  separate legacy-room evidence only through the participant/file-selection
  safety rules.

## 2026-07-30 Layer mini-map drop contract

- FIXED LOCAL: The layer mini-map now uses the same `canReceiveChildren`
  contract as the actual drop guard. Atomic flow/table layers such as packed
  rows, cell groups, `col`, and `caption` no longer look like child-receiving
  containers merely because their broad role is `flow` or `table`.
- VERIFIED LOCAL: `test:layer-roles`, `test:iframe-drop-target`, `lint`,
  `build`, `smoke:edit-flow`, and strict imported-edit sync all pass. The
  smoke now asserts that every layer-row mini-map container signal matches its
  row drop signal. Post-run server hygiene reports no project listeners.
- VERIFIED REMOTE: GitHub Actions CI run `30513828228` for commit `c9dfa74`
  passed safety/unit verification, lint, and build.
- EXTERNAL VERIFY: The authenticated Chrome tab remains visible in the tab
  list, but direct tab control and claim both timed out. The in-app browser is
  at the Roll20 login surface. No participant count was accepted as fresh, and
  no room, sheet, chat, or Sandbox state was changed.
- CURRENT EVIDENCE: Modern/legacy actual generated-sheet screenshots remain
  unproven at the active gate; local same-renderer evidence must not be called
  Roll20 parity.
- NEXT P0: Resume from a supported/user-assisted Sandbox file selection, then
  capture positive sheet-root, full-height, asset, state, console, and chat
  evidence. Verify the legacy path separately in a dedicated legacy-enabled
  test room after a fresh visible participant count of exactly one.

## 2026-07-30 Packed table-row drop contract

- FIXED LOCAL: `r20_skill_row` now participates in table structural validation
  as a real row because its composite emitter produces a complete `<tr>`.
  Packed rows can therefore be inserted under `tbody`, `thead`, or `table`,
  while the row itself remains a non-droppable atomic layer.
- VERIFIED LOCAL: `test:layer-roles`, `test:iframe-drop-target`, and the full
  `ci:verify` gate pass. This covers structural insertion rules only; it does
  not prove browser drag latency or actual modern/legacy Roll20 parity.
- FIXED LOCAL: `r20_attribute_card` is treated as a cell group: it can reorder
  inside its source `tr`, but cannot be dropped directly into `table` or
  `tbody` where its unwrapped sibling cells would make invalid HTML.
- FIXED LOCAL: role inventory now marks list and conditional areas as child-
  receiving frames/flow, inline emphasis as Text, radio as Input, and worker
  event/code blocks as Sheet action instead of misleading `other` layers.
- FIXED LOCAL: atomic table metadata blocks (`col` and `caption`) no longer
  advertise an `inside` child drop even though their shared Table styling is
  still used for ordering and color.
- FIXED LOCAL: list structural drops now enforce `ul/ol -> li`; ordinary
  content can enter an `li`, while a direct `li -> li` insertion is rejected.
- VERIFIED BROWSER: edit-flow and imported edit-sync smoke remain PASS after
  list validation; post-run server hygiene still reports zero project
  listeners.
- VERIFIED BROWSER: `smoke:edit-flow` and imported edit-sync pass after the
  role inventory update; the post-run server hygiene check reports no project
  dev/smoke listener.
- NEXT P0: finish the remaining local imported-edit role/inventory coverage,
  then resume the separate modern Sandbox and legacy-room evidence gate.

## 2026-07-29 Roll20 Sandbox browser retry

- VERIFIED READ-ONLY: The logged-in Roll20 tab still exposes the isolated
  Sheet Sandbox Tools dialog and the visible member count is one. No existing
  room settings, sheet source, or chat message was changed.
- VERIFY BLOCKED: The three file inputs are present but hidden native controls;
  the supported chooser/click path timed out before a chooser was opened. No
  local payload was transmitted.
- CURRENT EVIDENCE: Actual generated screenshots remain `0/6`, room
  observation screenshots remain `0/3`, and the Sandbox tab is left as a user
  handoff.
- NEXT P0: Use the visible Sandbox file-selection surface manually or through
  a supported chooser, then capture positive sheet-root DOM evidence before
  chat or parity comparison.

## 2026-07-29 Layer drop root-before fix

- FIXED LOCAL: A nested layer can now be dragged before a top-level target.
  The adapter reconnects the nested block directly to the target's root
  predecessor when no predecessor exists.
- VERIFIED LOCAL: `test:blockly-layer-operations`, `ci:verify`, lint, and build
  all pass. The regression asserts the moved block leaves its container and
  becomes the target's immediate predecessor.
- CLAIM BOUNDARY: This covers the Blockly layer-operation invariant only. It
  does not prove browser drag latency or actual Roll20 parity.
- NEXT P0: Reconnect the isolated Roll20 Sandbox for real root/DOM evidence;
  keep modern Sandbox and legacy-room verification separate.

## 2026-07-29 Local parity regression refresh

- VERIFIED LOCAL: Preview/edit visual smoke passed `3 fixtures x 2 modes`;
  all six comparisons were `0%` mismatch / `EXACT`.
- VERIFIED LOCAL: Strict imported-edit sync passed all five prepared local
  fixtures with interaction and resource checks passing.
- CLAIM BOUNDARY: These are same-renderer local checks only. They do not prove
  actual Roll20 Sandbox or legacy-room parity.
- VERIFY: Roll20 CDP preflight currently reports `targets=0`; actual evidence
  remains `generatedActualScreenshots=0/6` and `roomObservationScreenshots=0/3`.
- NEXT P0: Reconnect only to the isolated Sandbox through a supported or
  user-assisted browser path, capture root/DOM evidence, then run chat and
  screenshot diff gates.

## 2026-07-29 Roll20 upload handoff regeneration

- VERIFIED PREUPLOAD: The ignored handoff was regenerated for the latest PASS
  run and contains all three anonymous fixture payload sets.
- VERIFIED TOOLING: Upload snippet, CDP apply self-test, CDP preflight
  self-test, and participant-gate self-test all pass.
- VERIFY: `generatedActualScreenshots=0/6` and `roomObservationScreenshots=0/3`
  remain unchanged. No local payload was sent to Roll20 in this batch.
- NEXT P0: Use the isolated Sandbox page's user-assisted file chooser or
  supported browser path, then capture root/DOM/chat evidence before any
  parity claim. Legacy remains a separate dedicated-room task.

## 2026-07-29 CSS Bare At-Rule Preservation and Cleanup Retry

- FIXED LOCAL: Unsupported semicolon-terminated at-rules such as `@charset`,
  `@namespace`, and `@layer` now remain raw CSS with their original `;`
  terminator instead of being reconstructed as an empty `{}` block.
- VERIFIED LOCAL: Import structure passed `37/37`; `ci:verify`, lint, build,
  preview/edit visual smoke passed `3 fixtures x 2 modes` at `0%` mismatch,
  and strict imported-edit sync passed all five prepared anonymous fixtures.
- VERIFY: The user-authorized cleanup retry rechecked eight explicit generated
  or stale targets. The host blocked recursive directory deletion again, so
  none of those directories is counted as deleted.
- PRESERVED: Active dependencies, current ignored fixtures/baselines, the
  canonical visual report, protected reference roots, and both Git worktrees.

## 2026-07-29 Roll20 Sandbox Connection Recheck

- VERIFIED ACTUAL: A logged-in Chrome session reached the Roll20 editor and
  exposed the Sheet Sandbox Tools surface. The currently visible participant
  indicator read exactly `1 구성원`; no existing room was selected or changed.
- VERIFY BLOCKED: The supported browser file-chooser path rejected the local
  HTML file assignment, and the tab's raw CDP path explicitly disallowed direct
  file injection. No HTML, CSS, or translation payload was transmitted, and
  no generated Sandbox screenshot was counted.
- VERIFIED REMOTE: GitHub Actions run `30459222308` passed safety/unit
  verification, lint, and build for commit `be4e4f3`.
- SAFETY: The participant gate remains active. Existing rooms are observation
  only; generated writes remain limited to Sandbox or a dedicated test room.
- NEXT P0: Continue from this open Sandbox surface with a supported chooser or
  user-assisted file selection, then capture the same anonymous fixture's root,
  full sheet, console, and roll/chat evidence. Run the legacy path separately
  in a dedicated room after a fresh visible count of exactly one.

## 2026-07-29 Optimistic Flow Commit Fast Path

- FIXED LOCAL: A committed flow drop now carries only the validated
  subject/placement/container or sibling ids to the persistent iframe. When
  the iframe confirms that the optimistic DOM move already matches that
  operation, it acknowledges the new HTML key without reparsing and morphing
  the entire sheet. Any mismatch falls back to the existing full structural
  patch.
- VERIFIED LOCAL: The 6,000-block anonymous fixture passed in modern and
  legacy modes. Both accepted the fast path once, recorded zero structural
  fallbacks, and measured iframe apply cost below 1ms in the captured runs.
  The local persistent-preview gate,
  imported edit sync, visual preview/edit smoke, buildDoc bundle tests, drop
  target tests, bridge tests, lint, build, and server hygiene all passed.
- CLAIM BOUNDARY: The measured end-to-end acknowledgement still includes
  browser/CDP scheduling variance and does not prove a fixed user-facing
  latency number. This is local renderer evidence, not actual Roll20 parity.
- NEXT P0: Repeat the same operation with a supported browser session and
  participant-gated Roll20 Sandbox/legacy-room evidence; keep actual rooms
  read-only and exclude any room whose visible participant count is not
  exactly one.

## 2026-07-29 Workspace Harness Retention Pass

- DONE: Confirmed the four-zone harness, active worktree, protected source
  roots, and listener state before cleanup.
- DONE: Removed only the generated `debug.log` and
  `tsconfig.tsbuildinfo` files from the active worktree.
- VERIFY: Recursive deletion of generated directories and stale metadata was
  rejected by the host safety policy. The remaining candidates are not
  deleted; do not count this as disk cleanup completion.
- NEXT P1: Run the listed directory cleanup only through a permitted
  maintenance operation, then re-run worktree, listener, and Git checks.

## 2026-07-29 Blockly Import Resize Batch

- FIXED LOCAL: `hydrateFromXml` and `hydrateFromXmlChunked` now keep the
  Blockly workspace resize setter suppressed until the whole XML batch ends.
  `Blockly.Xml.domToWorkspace` was re-enabling it after every chunk, causing
  repeated scrollbar and screen-coordinate work during large imports.
- VERIFIED LOCAL: Anonymous fixture performance changed from `5,556.8ms` to
  `4,896.0ms` inject and from `5,775.9ms` to `5,084.8ms` total import on the
  largest prepared fixture. The local budget moved from `WARN` to `PASS`.
  Strict imported-edit sync remained PASS for all five prepared fixtures, with
  edit/preview sync, reimport stability, and resource checks passing.
- CLAIM BOUNDARY: This is a local Blockly import performance improvement. It
  does not prove Roll20 Sandbox/legacy-room parity or universal sheet support.
- NEXT P0: Keep the actual Roll20 Sandbox and participant-gated legacy-room
  verification separate from this local performance gate.

## 2026-07-29 Render Surface Dimension Contract

- FIXED LOCAL: The authored `form.sheetform > .charactersheet.charsheet`
  root is no longer forced by editor-owned `!important` dimensions. Imported
  sheet CSS and inline width/height/min-size/overflow can now determine the
  sheet canvas as they do in Roll20; the app still owns the surrounding
  dialog/form shell.
- VERIFIED LOCAL: The build-document regression asserts the root dimension
  declarations stay non-important. Full prepared-fixture preview/edit smoke
  passed `3 fixtures x 2 modes` with `0` mismatched pixels and `EXACT` parity
  in modern and legacy modes. The first run had a transient modern external
  background-asset timing mismatch (`2.21%`); the repeat and full run were
  exact, so external asset readiness remains a diagnostic risk rather than a
  claimed Roll20 result.
- CLAIM BOUNDARY: This proves local render-surface parity and preserves
  authored dimensions. It does not prove actual Roll20 Sandbox pixel parity,
  live worker behavior, or universal sheet compatibility.
- NEXT P0: Capture normalized modern Sandbox and isolated legacy-room evidence
  after a supported CDP browser session is available. Keep existing rooms
  read-only and require a fresh visible participant count of exactly one.

## 2026-07-29 Pre-upload Run Reproducibility

- FIXED LOCAL: `verify:roll20-preupload` now creates its ignored run directory
  when given a new label. It no longer depends on a deleted historical report
  folder existing before it can generate the local baseline.
- VERIFIED LOCAL: Fresh modern and legacy runs both passed local-baseline,
  payload hygiene, Sandbox sanitize, cleaned-payload roundtrip, state-selector,
  asset, and evidence guards.
- CLAIM BOUNDARY: These are upload-readiness gates only; they do not prove a
  live Roll20 Sandbox or legacy-room screenshot match.

## 2026-07-29 Current gate update

- DONE LOCAL: Keyed structural iframe patches now use a per-parent keyed
  sibling index and cursor, removing the previous full-sibling scan for every
  keyed node. This reduces structural reconciliation from the prior quadratic
  keyed lookup shape toward linear lookup while preserving duplicate-key and
  unkeyed order behavior.
- VERIFIED LOCAL: Mounted `6000`-synthetic-node latency smoke passed in modern
  and legacy independently. Optimistic placement was `26.9ms` / `31.0ms`,
  structural patch fallbacks `0`, iframe reloads `0`, and browser errors `0`.
  This proves the optimistic placement budget, not end-to-end acknowledgement
  parity.
- NEXT P0: Reduce the separately measured pointer-to-ack observation. The two
  latest runs ranged from `152.5ms` to `167.5ms` modern and `161.6ms` to
  `203.2ms` legacy; HTML reflection is therefore not yet claimed immediately
  complete for large sheets.
- DONE LOCAL: Drag commits now queue the immediate emit after Blockly's
  coalesced mutation microtask, preventing the parent bump and listener bump
  from scheduling two full emit passes for one drop.
- DONE LOCAL: The persistent iframe now builds its initial document once and
  uses a content-derived live-patch identity for later updates. A raw Blockly
  version no longer causes a stale live patch to apply before the emit cache is
  ready. The modern/legacy persistent smoke remains green after this split.
- DONE LOCAL: Synchronous committed-drop emits now mark the exact workspace
  snapshot they published, so the following structure-version effect skips a
  duplicate delayed emit. Ordinary non-committed edits still use the debounce
  path.
- DONE LOCAL: CSS simple tag selectors outside the fixed dropdown now map to
  the editable `r20_selector_tag` block. Prepared anonymous fixtures retain
  `405/405` structured CSS rules and `0` `raw_css` fallback blocks.
- DONE LOCAL: The browser smoke expectations were aligned with the current
  design-reset copy. `smoke:export-dialog` now passes and still checks import
  dialog opening, export readiness, worker visibility boundary, and modern /
  legacy mode synchronization.
- VERIFIED SAFETY: Existing Roll20 rooms are selected by a fresh visible
  participant count only. Exactly one member is eligible for read-only
  observation; any other, unreadable, or ambiguous state blocks the room.
  Generated writes remain limited to Sandbox or a dedicated test room.
- VERIFY: Actual Roll20 Sandbox and dedicated legacy-room screenshots remain
  uncollected because the supported CDP session is unavailable. No existing
  room was opened or modified in this run.

## 2026-07-29 Form-State Browser Regression

- VERIFIED LOCAL: `smoke:imported-edit-sync:strict` passed for all prepared
  local fixtures and the synthetic non-leaf flow case after default-state
  mapping changes.
- VERIFIED LOCAL: `smoke:preview-edit-visual -- --compatibility-mode both`
  passed modern and legacy local preview/edit comparisons with `0%` mismatch
  across the prepared local fixtures.
- VERIFIED HYGIENE: post-smoke server check found no project or CDP listener.
- CLAIM BOUNDARY: local `0%` mismatch is not an actual Roll20 screenshot or
  Sandbox parity result.

## 2026-07-29 Default Form-State Mapping

- DONE LOCAL: `checked` radio inputs and `selected` select options now map to
  editable block fields and emit back to HTML. `data-i18n` options use the
  same selected-state field.
- VERIFIED LOCAL: Generic import suite passes `33/33`; lint and attribute
  preservation tests pass.
- CLAIM BOUNDARY: This proves local block/emit state preservation only. The
  actual Roll20 default tab/era rendering still requires isolated Sandbox or
  dedicated legacy-room evidence.

## 2026-07-29 External Roll20 Verification Gate

- VERIFY: Read-only participant preflight could not connect to the CDP
  endpoint in this run. No existing room was opened, changed, or used as
  evidence.
- RULE: Before any existing-room observation, read the fresh visible member
  indicator. Exactly one visible member is required; any other, missing, or
  ambiguous state blocks the room.
- REMAINING: Run modern Sandbox comparison and dedicated legacy-room
  comparison only after a supported CDP browser is available. Do not mark
  actual parity complete from local CI or synthetic screenshots.

## 2026-07-29 Generic Locale Preservation

- DONE: Translation comment parsing and the locale-value block now accept
  validated BCP-47-like tags instead of only `ko/en/ja/zh`, preserving custom
  sheet locales such as regional and script tags.
- PRESERVED: Roll20 export remains a flat `translation.json` string map;
  nested JSON is still rejected rather than being silently rewritten.
- VERIFIED LOCAL: Custom-locale import tests pass and are now part of
  `test:import-structure` and `ci:verify`.
- CLAIM BOUNDARY: This proves local locale preservation only. Actual Roll20
  Sandbox translation application remains a separate external verification.

## 2026-07-29 Generic CSS At-Rule Mapping

- DONE: Simple single-condition `@media` imports now become
  `r20_media_query` blocks with nested CSS rules. Standard `@keyframes`
  imports now become `r20_keyframes` with typed known stops.
- PRESERVED: Complex media conditions and keyframe percentages outside the
  current block dropdown remain raw CSS with their original values.
- VERIFIED LOCAL: Generic import tests pass `32/32`. Full `ci:verify`, lint,
  build, and browser render smoke remain required before this batch is called
  complete.
- CLAIM BOUNDARY: This improves generic CSS mapping; it does not prove full
  CSS block coverage or actual Roll20 visual parity.

## 2026-07-29 Preview Page-Script Runtime Boundary

- DONE: The shared iframe/live-patch/Shadow preview builders now omit normal
  page `<script>` elements from the rendered sheet. This prevents imported
  page JavaScript and external `src` files from executing inside the editor.
- PRESERVED: The original script remains an HTML raw block for source editing
  and export. Explicit Roll20 worker scripts and recognizable legacy worker
  API scripts remain in the preview so the worker bridge can execute them.
- VERIFIED LOCAL: `test:build-doc-bundle`, `ci:verify`,
  `smoke:persistent-preview-surface`, `verify:runtime-visibility`,
  `smoke:preview-edit-visual`, `lint`, and `build` passed. No external Roll20
  room or browser session was used in this batch.
- CLAIM BOUNDARY: This closes a local preview execution boundary; it does not
  prove that arbitrary page JavaScript is supported by Roll20 or that actual
  modern/legacy visual parity is complete.

## 2026-07-29 Legacy Upload Participant Recheck

- FIXED: `roll20_upload_cdp_apply.mjs --require-solo-room` now checks the
  visible `.party-page-members` indicator before navigation, then revisits the
  original room editor URL after navigation and immediately before evaluating
  the upload snippet. It returns to the settings page only after each check.
- SAFETY: Every check requires exactly one readable visible member. A missing,
  hidden, zero, or multi-member indicator aborts before the generated write.
  Sandbox uploads remain on the isolated Sandbox path and do not use this
  existing-room gate.
- VERIFIED LOCAL: `node --check scripts/roll20_upload_cdp_apply.mjs`, its
  self-test, `ci:verify`, lint, and build pass. This is a safety-path proof,
  not evidence that a legacy room was modified or that visual parity is done.
- NEXT P0: Use the gate on the dedicated legacy test room only when a fresh
  supported browser session is available; keep ordinary existing rooms
  observation-only.

## 2026-07-29 Roll20 Root Wrapper Contract

- FIXED: The generated sheet wrapper no longer adds the editor-only
  `id="charsheet-root"`. Preview bridge, Shadow edit mounting, intrinsic-size
  CSS, and local browser fixtures now locate the authored root through the
  Roll20-shaped `form.sheetform > .charactersheet.charsheet` structure.
- VERIFIED LOCAL: `test:build-doc-bundle`, lint, build, `ci:verify`,
  `smoke:persistent-preview-surface`, `smoke:imported-edit-sync:strict`,
  `smoke:preview-edit-visual -- --compatibility-mode both`, and
  `smoke:roll20-sandbox-preview:all` passed. Preview/edit visual smoke reported
  0% local mismatch for both compatibility modes across the prepared local
  fixtures; Sandbox expected-render smoke reported 0 console/page errors.
- VERIFIED INTERACTION: `smoke:edit-flow` also passed after the wrapper change,
  including layer collapse/expand, before/inside/after insertion, reorder,
  eject, cycle rejection, selection sync, and canvas-width controls.
- VERIFIED REMOTE: GitHub Actions run `30420232700` for commit `918a48f`
  passed safety/unit verification, lint, and build on the task branch.
- SAFETY: Actual Roll20 observation scripts keep their generic class fallbacks
  so live DOM evidence is not confused with the local generated wrapper.
- CLAIM BOUNDARY: This removes one local DOM-contract mismatch. It does not
  prove actual Roll20 pixel parity or universal sheet support. Existing rooms
  remain observation-only and the participant gate is unchanged.
- NEXT P0: Continue normalized modern Sandbox versus dedicated legacy-room
  viewport/state/crop comparison after a fresh supported upload path.

## 2026-07-29 Optimistic Drag Reconciliation

- FIXED: The persistent iframe now clears the temporary drag `transform` for
  every authoritative live patch, including CSS-only updates. Previously a
  free-placement edit could keep its visual drag offset because the HTML key
  did not change.
- VERIFIED LOCAL: `corepack pnpm run smoke:persistent-preview-surface` passed
  modern and legacy contracts. The real pointer smoke observed a temporary
  `translate3d(40px, 24px, 0px)` during drag and `transform: none` after the
  CSS-only commit, with one iframe, zero reloads, and zero console/page errors.
- CLAIM BOUNDARY: This closes one local preview/edit rollback path. It does
  not prove live Roll20 visual parity or universal import/export coverage.

## 2026-07-29 CI Branch Coverage

- FIXED: The repository CI workflow now runs on pushes to `claude/**` as well
  as `main`, `dev`, and `codex/**`. GitHub Pages deployment remains restricted
  to `main`.
- VERIFIED REMOTE: GitHub Actions run `30419719796` for commit `60245d9`
  passed safety/unit verification, lint, and build on the Claude task branch.

## 2026-07-29 Participant Gate Hardening

- IMPLEMENTED: Existing-room participant checks now read only the currently
  visible `.party-page-members` element. They no longer scan the whole page
  text, chat history, room name, or stale navigation labels.
- SAFETY GATE: A missing, hidden, unreadable, zero, or multi-member indicator
  blocks the room. Only one visible member count passes the observation gate.
- VERIFIED LOCAL: `corepack pnpm run test:roll20-room-members` and the upload
  guard self-test pass. Sandbox writes remain on the isolated Sandbox path;
  existing rooms remain observation-only.

## 2026-07-29 Clean Sandbox Recheck

- VERIFIED ACTUAL SAFETY: The currently open Roll20 Sandbox page exposed the
  visible participant indicator `1 구성원` and the `Sheet Sandbox Tools`
  dialog. No existing room was selected and no room settings were changed.
- VERIFY BLOCKED: This browser connection exposes the three Sandbox file
  inputs, but its file-chooser event did not arrive after the visible HTML
  upload control was clicked; the supported CDP fallback also rejected file
  injection. The retry therefore produced no new uploaded-sheet evidence and
  must not be counted as a fresh render result.
- NEXT P0: Use a supported file chooser path or a manual user-assisted file
  selection in the same isolated Sandbox, then capture a clean iframe/root
  probe and console log. Keep the visible one-member gate immediately before
  any write.

## 2026-07-29 Pre-upload Contract Propagation

- FIXED: `roll20_preupload_verification.mjs` now accepts and forwards
  `--compatibility-mode auto|modern|legacy` to local baseline generation and
  records the selected contract in its report.
- INVARIANT: A modern Sandbox pre-upload run and a legacy-room pre-upload run
  must use separate report folders and explicit matching modes. A local gate
  PASS still does not prove actual Roll20 visual parity.
- VERIFIED LOCAL: Full pre-upload gates passed in separate ignored report
  folders for explicit `modern` and explicit `legacy` contracts. Both runs
  passed local-baseline, payload-audit, sandbox-sanitize-audit,
  payload-roundtrip, state-selectors, assets, and evidence-guard. This proves
  contract propagation and payload safety only; it does not prove live visual
  parity or authorize an existing-room write.

## 2026-07-29 Dual Roll20 Contract Baseline

- FIXED: `roll20_actual_local_baseline.mjs` now accepts
  `--compatibility-mode auto|modern|legacy`. `auto` preserves fixture metadata;
  the explicit modes prepare the same imported input for the matching Sandbox
  or dedicated legacy-room destination.
- VERIFIED LOCAL: An explicit modern baseline completed successfully with
  `100%` structural import matching, `40` roll controls, and zero console/page
  errors. Its local root measured `850px x 1185px`.
- CLAIM BOUNDARY: The fresh live modern frame measured `852px x 1148.44px`
  under a clipped Roll20 dialog viewport. The remaining difference is still
  state/viewport/crop-sensitive; this change improves comparison validity but
  does not claim pixel parity.
- NEXT P0: Generate the corresponding legacy baseline with the explicit legacy
  mode, then compare both contracts only against their matching actual
  destination evidence.

## 2026-07-29 Render Contract Comparison Probe

- VERIFIED LOCAL: The active iframe renderer computes the same Roll20 root
  contract observed in the fresh modern Sandbox: `content-box`, `13px`,
  `18.5714px` line-height, `10px` padding, transparent root background, and
  `position: relative`. The local probe reported zero console/page errors.
- VERIFIED LOCAL: The current local baseline exposes `40` roll controls and a
  root rectangle of `850px` by `1185px`; the fresh modern live frame exposed
  the same `40` roll controls and a root rectangle of `852px` by `1148.44px`.
- FINDING: The remaining size difference is not explained by a broad base-CSS
  mismatch. The live frame is captured inside a shorter Roll20 viewport/state,
  while the local baseline captures the whole rendered root. The 2px width
  delta is within the current fixed canvas/wrapper measurement boundary.
- VERIFIED LOCAL: `corepack pnpm run smoke:persistent-preview-surface` and
  `corepack pnpm run smoke:imported-edit-sync:strict` passed. The server
  hygiene check found no project or CDP listeners after the runs.
- DECISION: No production-wide CSS override is justified by this evidence.
  Keep modern and legacy CSS contracts separate and do not promote this to a
  Roll20 pixel-parity PASS.
- NEXT P0: Normalize viewport, default tab/state, crop, and root geometry;
  then isolate the live Sandbox runtime console findings in a clean one-member
  Sandbox run before changing renderer code.

## 2026-07-29 Modern Sandbox Fresh Payload Render

- VERIFIED ACTUAL SAFETY: Immediately before the modern Sandbox write and
  again before reopening the character, the visible participant indicator was
  exactly `1 구성원`. No unrelated or multi-member room was used.
- VERIFIED ACTUAL UPLOAD: The generated HTML, CSS, and translation payload was
  dispatched through the Sandbox path, the save requests returned HTTP 200,
  and a full reload plus character reopen made the fresh payload visible in the
  live iframe.
- VERIFIED ACTUAL RENDER: The live iframe exposed `40` roll-capable controls,
  `207` form controls, no inline `on*` attributes, and a sheet root measuring
  `852px` wide by `1148.44px` tall. The local baseline exposed the same `40`
  roll-capable controls, but measured `850px` by `1185px`.
- VERIFIED ACTUAL ROLL/CHAT: Clicking the visible initiative control produced a
  live chat message with the sheet's `sheet-rolltemplate-initiative-roll` and
  `sheet-template-container` classes. The expected no-token turn-tracker
  warning also appeared; it is a sandbox-state warning, not a sheet render
  failure.
- VERIFIED ACTUAL CONSOLE FINDING: The run is not console-clean. Existing chat
  history referenced unavailable `aw`, `coc`, and `synthetic` templates, and a
  Roll20 runtime `jqote` `toString` TypeError appeared after the roll. These
  are recorded as separate runtime issues and are not attributed to local
  CSS without further isolation.
- CLAIM BOUNDARY: The upload and same-payload render are now proven for this
  modern Sandbox run. Pixel parity is still NOT DONE: the iframe wrapper,
  viewport crop, root geometry, hidden template accounting, and chat/worker
  behavior still need normalized comparison against local preview/edit.
- NEXT P0: Isolate the runtime console errors, then normalize the local
  preview, edit, and live iframe crop; compare computed CSS and bottom
  geometry across the cleanest available state.

## 2026-07-29 Actual Legacy Room Participant Gate And Render

- VERIFIED ACTUAL SAFETY: Immediately before opening settings, before saving,
  and after reloading the dedicated legacy test room, the visible participant
  indicator was exactly `1 구성원`. No room with zero, unknown, or multiple
  visible participants was used.
- VERIFIED ACTUAL LEGACY: The dedicated room's campaign settings showed
  `Custom` and the legacy sanitization checkbox enabled. The generated local
  HTML/CSS/translation payload was saved through the visible Roll20 settings
  editors, and the existing character sheet reopened with a live iframe.
- VERIFIED ACTUAL RENDER: The live iframe exposed translated sheet text,
  `135` inputs, and `66` roll-capable controls. The visible viewport was
  `900px` wide with a scrollable sheet root measured at `852px` wide and
  `1174px` tall. A screenshot and metrics remain in ignored local evidence.
- CLAIM BOUNDARY: This proves the dedicated legacy room accepted and rendered
  the generated payload under the checked legacy mode. It does not yet prove
  pixel parity against local preview/edit, modern Sandbox parity, or all-sheet
  coverage.
- NEXT P0: Reconnect the permitted modern Sandbox path, apply the same
  generated payload, capture its iframe, and classify local-versus-Roll20
  differences without reusing legacy evidence.

## 2026-07-29 Layer Drop Safety And Room Eligibility

- DONE: Layer-panel drag feedback now survives pointer movement over nested
  row content, uses the grabbed row as the drag preview, and clears its shared
  drag state after cancellation.
- DONE: Cycle-producing layer drops are blocked during `dragover`, with no
  valid drop highlight and `dropEffect=none`.
- VERIFIED LOCAL: `corepack pnpm run smoke:edit-flow -- --report-dir
  reports/edit-flow-smoke/layer-drag-v2` passed `before / inside / after`,
  internal-child highlight preservation, reorder/eject, cycle protection,
  selection sync, width inputs, and zero console/page errors. `lint`, `build`,
  `smoke:persistent-preview-surface`, and the participant-preflight self-test
  also passed.
- SAFETY RULE: An existing Roll20 room is considered usable only when a fresh
  visible participant count is exactly `1`. A count of `0`, more than `1`, or
  an unreadable/ambiguous count is an automatic exclusion. Existing rooms are
  observation-only; generated uploads use Sandbox or a new dedicated test
  room.
- VERIFY: Actual Roll20 Sandbox and dedicated legacy-room screenshots are not
  counted by this local result. Do not call local exact pixels Roll20 parity.

## 2026-07-29 Roll20 Room Safety And Design PR Boundary

- VERIFIED LOCAL: Extended `smoke:persistent-preview-surface` with a same-iframe
  `modern -> legacy -> modern` compatibility roundtrip. The mode-specific
  legacy layer appeared/disappeared, a synthetic non-reserved compatibility
  probe changed `fixed -> absolute -> fixed`, input state and runtime token
  survived, iframe load count stayed `0`, and both modes had zero console/page
  errors. This proves local live-patch synchronization, not Roll20 visual
  parity.
- CLAIM BOUNDARY: The fixture is synthetic and the imported emitter already
  normalizes authored class tokens to the `sheet-*` Roll20 contract. It does
  not prove every legacy sanitizer rule or any actual-room screenshot result.
- NEXT P0: Keep the participant preflight ahead of any real-room action, then
  collect fresh modern Sandbox evidence and legacy evidence only in a
  dedicated one-member test room.

- VERIFIED LOCAL: `smoke:imported-edit-sync:strict` passed across all four
  ignored local fixtures: official fixture-A (`2,004` HTML blocks), official
  fixture-B (`837`), fixture-C commission 1bu (`7,290`, `8` composite collapses),
  and the synthetic non-leaf flow (`7`). Each reached `100%` structural import
  match, edit-to-preview sync, stable re-import, zero resource issues, and zero
  console/page errors.
- CLAIM BOUNDARY: This confirms the local import/edit synchronization path for
  the current ignored fixture set. It does not prove byte-identical HTML/CSS,
  all-sheet coverage, or actual Roll20 visual parity.

- VERIFIED LOCAL: `smoke:preview-edit-visual --compatibility-mode both` reported
  `EXACT` with `0` mismatched pixels for fixture-A, fixture-B, and fixture-C 1bu in both
  modern and legacy contracts. Translation probes passed where each fixture
  declares them (`60/60` fixture-A and `93/93` fixture-C); the fixture without i18n had
  no translation probes. This directly verifies the canonical preview/edit
  render surface for the current ignored fixture set.
- CLAIM BOUNDARY: Exact local preview/edit pixels do not mean exact pixels in
  Roll20. Wrapper context, browser engine, assets, persisted attributes, chat,
  and actual modern/legacy destinations still require independent evidence.

- VERIFIED LOCAL: Rebuilt the current export payloads from the three ignored
  visual fixtures under `2026-07-29-current-export-audit`. The local baseline
  and `roll20_payload_audit` both passed for fixture-A, fixture-B, and fixture-C 1bu;
  the audit found no app wrapper/edit marker leakage, invalid translation or
  manifest data, or ZIP payload mismatch.
- EVIDENCE CORRECTION: The older `2026-06-18` audit still fails because it
  inspects historical payloads generated before the current export boundary
  fixes. It is not evidence against the current exporter and remains ignored
  local history, not a current PASS/FAIL gate.

- DONE: Added a mandatory participant preflight. Existing rooms are excluded
  when the current visible member count is unknown or greater than one; they
  are never upload, save, chat, or settings destinations.
- VERIFIED: The design-reset branch is pushed as draft PR #7 and its GitHub CI
  check is green. This is a separate UI candidate and is not yet merged into
  production.
- VERIFY: No new external sheet upload or screenshot was counted in this
  batch. The discovered existing room was not used because its participant
  state was non-solo, and the Sandbox-only browser path did not reach an
  authenticated Sandbox surface.
- NEXT P0: Open only the Roll20 home/Sandbox flow after authentication is
  available, verify the destination is isolated, then upload the ignored
  anonymous modern payload. Keep legacy verification in a dedicated test room.

## 2026-07-18 Fresh Sheet Canvas Baseline

- DONE: Blank workspaces now start with automatic intrinsic-width measurement
  disabled, so the documented 850px sheet canvas is not replaced by the first
  widget's smaller content width. Imported files explicitly opt into the
  existing intrinsic-width path after their HTML/CSS/translation payload is
  accepted.
- VERIFIED LOCAL: `smoke:fresh-sheet` passes with zero HTML/CSS/i18n blocks after
  clear, no emitted ghost `sheet-section`, first widget creation, one persistent
  iframe, and edit-mode reuse of that iframe. `smoke:edit-flow`,
  `smoke:persistent-preview-surface` modern/legacy, build, lint, and
  `ci:verify` also pass.
- CLAIM BOUNDARY: This proves the local first-run/canvas contract only. It does
  not promote modern Sandbox or legacy-room visual parity beyond `VERIFY`.
- NEXT P0: reconnect the permitted Roll20 session and apply the ignored
  anonymous payload through the supported CDP/file handoff.

## 2026-07-18 Widget Gallery Direct Creation

- DONE: Extended `scripts/fresh_sheet_browser_smoke.mjs` to click the real
  `widget-card-text-input` control in edit mode after the blank-sheet setup.
- VERIFIED LOCAL: The click increased HTML blocks from `2` to `3`, added one
  layer to emitted HTML, advanced the iframe apply acknowledgement from `1` to
  `2`, preserved one iframe, and produced zero console/page errors.
- CLAIM BOUNDARY: This proves the local gallery-click path only. Dragging from
  the gallery and live Roll20 visual parity remain `VERIFY`.

## 2026-07-18 Roll20 Reconnect Boundary

- OBSERVED: Chrome MCP rediscovered the permitted Roll20 editor tab and its
  logged-in tab list.
- VERIFY BLOCKED: The first DOM snapshot after claiming the Roll20 tab timed
  out and reset the browser kernel. No HTML/CSS/translation payload was sent,
  and no Sandbox or legacy-room screenshot was captured.
- DECISION: Stop repeating the same browser call in this batch. Keep modern
  Sandbox activation, legacy-room parity, and visual comparison as `VERIFY`
  until a stable browser/file handoff is available.

## 2026-07-18 Roll20 CDP Handoff Check

- VERIFIED TOOLING: `node scripts/roll20_upload_cdp_apply.mjs --self-test`
  passes, and the ignored synthetic payload remains available locally.
- VERIFY BLOCKED: No process is listening on CDP port `9222`; the latest
  preflight is `CDP_CLOSED`. No upload request was made and no Roll20 result
  was inferred from the script self-test.
- DECISION: Keep actual modern Sandbox activation and legacy-room parity at
  `VERIFY`; a future run needs a logged-in CDP-enabled browser or a stable
  browser file handoff.

## 2026-07-18 App Chrome Typography

- DONE: Removed the app-shell's negative letter-spacing override. The product
  chrome now uses neutral `letter-spacing: 0`; imported Roll20 sheet CSS and
  chat diagnostic styling were left untouched.
- VERIFIED LOCAL: lint, build, `ci:verify`, `smoke:fresh-sheet`,
  `smoke:edit-flow`, both modern/legacy persistent-preview runs, and server
  hygiene all pass after this CSS-only shell change.
- CLAIM BOUNDARY: This is app-chrome readability work, not Roll20 visual
  parity evidence.

## 2026-07-18 Layer Palette Alignment

- DONE: Aligned edit-layer drop indicators and mini-map accents with the
  existing pastel role palette: frame/container rose, flow teal, table amber,
  and neutral runtime/other states. No iframe sheet CSS was changed.
- VERIFIED LOCAL: fresh-sheet, edit-flow, modern/legacy persistent-preview,
  lint, build, `ci:verify`, and server hygiene all pass.
- CLAIM BOUNDARY: This improves app-shell visual language only; it does not
  change or prove Roll20 renderer parity.

## 2026-07-18 GitHub Actions CI

- VERIFIED REMOTE: GitHub Actions run `29621836381` for commit `4718564`
  passed safety/unit verification, lint, and production build.
- BOUNDARY: This proves the pushed branch is green. It does not replace the
  missing live Roll20 Sandbox/legacy-room visual evidence.

## 2026-07-18 Pastel UI Reset Slice

- DONE: Replaced the editor logo's blue gradient with the app's pink brand
  accent and moved frame/flow/table/text layer-role chips away from the old
  blue/indigo/violet emphasis to rose/teal/amber/pink role colors.
- VERIFIED LOCAL: `test:layer-roles`, `ci:verify`, `lint`, and
  `check:server-hygiene` pass. No Roll20 render contract, imported sheet CSS,
  or local-only fixture was changed.
- CLAIM BOUNDARY: This is one small app-chrome design slice, not completion of
  the full UI reset. Preview/edit usability, responsive shell review, and
  screenshot-based visual review remain P2/VERIFY items.

## 2026-07-18 Roll20 Sandbox File Chooser Recheck

- VERIFIED OBSERVATION: The permitted Chrome session is on the Roll20 editor
  with the `Sheet Sandbox Tools` dialog open. The dialog exposes the expected
  `#sheetHtml`, `#sheetCss`, and `#sheetTranslation` inputs and states that a
  selected file reloads and saves the game sheet.
- VERIFY BLOCKED: Chrome MCP can inspect the dialog and its visible labels, but
  the hidden native file input does not emit a `filechooser` event for either
  locator or coordinate click. No payload was submitted and no Roll20 visual
  result was claimed.
- CLAIM BOUNDARY: This is an automation-channel limitation, not evidence that
  Roll20 rejects the payload. Modern Sandbox activation and legacy-room
  parity remain open.
- NEXT P0: use a supported file-chooser/CDP handoff to apply only the ignored
  anonymous payload, then capture a post-reload activation marker and screenshot
  before comparing against local preview/edit.

## 2026-07-18 Real Pointer Edit Smoke

- VERIFIED LOCAL: `smoke:persistent-preview-surface` now drives the iframe
  edit path with Playwright `page.mouse` input instead of a synthetic
  `pointermove` dispatched on the subject node. The fixture selects a safe
  point on the subject so overlapping test-only widgets cannot steal the
  pointer target.
- VERIFIED LOCAL: Modern and legacy runs both pass. Each run observed the
  same subject selection, an `inside` drop target, flow nesting, absolute
  in-container placement, widget drop, worker update, rolltemplate/chat
  output, zero iframe reloads, and zero console/page errors.
- CLAIM BOUNDARY: This is anonymous local synthetic evidence for the editor
  bridge. It does not prove visual parity with live Roll20 Sandbox or a
  legacy-enabled room.
- NEXT P0: reconnect the permitted Roll20 session and capture positive
  modern Sandbox evidence, then run the same user-owned payload in the
  dedicated legacy room.

## 2026-07-18 Persistent Preview Synthetic Pointer Smoke Recheck

- VERIFIED LOCAL: Re-ran `smoke:persistent-preview-surface` with the correct
  static build root (`./out`) and a separate ignored report directory. The
  failure is now isolated to the synthetic `pointermove` wait at
  `scripts/persistent_preview_surface_smoke.mjs:492`/`500`; it is not the
  earlier mistaken 404 caused by passing the report directory as `--out-dir`.
- CLAIM BOUNDARY: The stale report from the previous run must not be used as
  current PASS evidence. This does not prove a product regression or actual
  Roll20 parity; the test harness cannot currently observe the parent drop
  overlay after its synthetic pointermove.
- TODO: Reproduce the same path with a real browser pointer sequence or a
  narrower bridge-level diagnostic before changing product pointer handling.

## 2026-07-18 Roll20 Upload Reconnect Guard

- DONE: `scripts/roll20_upload_cdp_apply.mjs` now distinguishes a Roll20
  document reload during Sandbox submission from an ordinary JavaScript or
  wrong-page failure. It writes `reloadDuringSubmit` to the ignored local
  result and returns `APPLY_CONTEXT_RELOADED_NEEDS_ACTIVATION_PROBE` so a
  fresh iframe marker check is still mandatory.
- VERIFIED LOCAL: `node scripts/roll20_upload_cdp_apply.mjs --self-test`,
  `node --check scripts/roll20_upload_cdp_apply.mjs`, `git diff --check`, and
  `corepack pnpm run ci:verify` pass.
- CLAIM BOUNDARY: This improves the upload harness only. It does not create
  Roll20 visual evidence or close modern/legacy parity.

## 2026-07-18 Public Sample Surface Removal and Export Smoke Repair

- DONE: Removed the public sample-sheet menu and empty-state sample CTA. A
  fresh public workspace now offers blank creation or user import only; local
  ignored fixtures remain test-only and are not product content.
- DONE: Registered the preserved-attribute field in Blockly's live block map
  after wrapping block initializers. This removes the `Ignoring non-existent
  field __R20_PRESERVED_ATTRS` warnings during import/hydration.
- DONE: Updated the export smoke to inspect the persistent preview iframe's
  document rather than its stale initial `srcdoc` attribute. Placeholder
  replacement guards now prove the original URL stays in the render until a
  user-owned target is supplied.
- VERIFIED LOCAL: After a fresh production build, `smoke:export-dialog` passed
  with no console issues, page errors, request failures, or external-resource
  requests. The smoke also passed modern/legacy mode synchronization, asset
  replacement in preview and edit, autosave restore, and absence of public
  sample UI.
- CLAIM BOUNDARY: This is local product and harness evidence. It does not
  close actual Roll20 modern Sandbox or legacy-room visual parity.
- VERIFY: Reconnect the permitted Roll20 browser session and run the same
  user-owned payload through modern Sandbox and the dedicated legacy room.

## 2026-07-18 Active Goal Rewrite Alignment

- DONE: Reframed the active work from incremental feature completion to a
  product reset: current-state audit, user-facing design reset, shared
  preview/edit rendering, modern/legacy runtime correctness, flow-aware visual
  editing, and only then worker/rolltemplate expansion.
- DONE: Made `docs/operations/41_product_reset_and_short_term_goals.md` the
  authoritative short-term objective and evidence boundary. The active Codex
  goal was subsequently rewritten in the Codex UI to the same product-reset
  objective; this repository document remains the durable execution record.
- VERIFY: The actual Roll20 Sandbox upload/render comparison is still separate
  evidence and is not closed by this objective rewrite.
- NEXT: Continue from the rewritten P0 order; do not report the old broad goal
  as complete from local implementation evidence.

## 2026-07-18 Local Render Unification Regression Pass

- VERIFIED LOCAL: `corepack pnpm run ci:verify` passed, including the Roll20
  renderer-mode, privacy, import, asset-policy, and UI-copy guards.
- VERIFIED LOCAL: persistent preview surface passed independently in modern and
  legacy modes with zero iframe loads; edit-flow smoke passed with no browser
  errors.
- VERIFIED LOCAL: paired preview/edit visual smoke passed for the three local
  comparison fixtures in both modes: `0` mismatched pixels and `0` ppm for each
  fixture/mode pair.
- CLAIM BOUNDARY: These are local renderer/fixture results. They do not prove
  pixel parity with the live Roll20 Sandbox or a legacy-enabled Roll20 room.
- VERIFY: Reconnect the permitted Roll20 browser session and repeat the same
  payload comparison in modern Sandbox and the dedicated legacy room.

## 2026-07-18 Generic HTML Roundtrip Stabilization

- DONE: Normalized ordinary direct text nodes at import boundaries so browser
  pretty-print whitespace does not accumulate across import -> emit -> import.
  `pre` and `textarea` content remains raw.
- DONE: Collapsed the authored radio-label pattern into the radio block that
  owns its Roll20 `<label>` wrapper, preventing nested labels on re-emit.
- VERIFIED LOCAL: Browser roundtrip passed for all three ignored local
  comparison fixtures with stable HTML/CSS/i18n/worker outputs and zero page or
  console errors. No fixture source or report is tracked.
- VERIFIED LOCAL: `test:import-structure` passed `27/27`, production build,
  `ci:verify`, and modern/legacy preview-edit visual smoke all passed.
- CLAIM BOUNDARY: This improves the measured local corpus only. It does not
  prove all arbitrary HTML structures or actual Roll20 visual parity.
- VERIFY: Expand the synthetic structure corpus and compare the same payload
  against live modern Sandbox and legacy-room output.

## 2026-07-18 Dead Shadow Editor Removal

- DONE: Removed the unmounted `LegacyShadowEditCanvas` implementation and its editor-only drag/emit helpers from `components/editor/EditCanvas.tsx`. The product edit path remains the single persistent Roll20 iframe mounted by `PreviewMain`, with `EditCanvas` limited to toolbar and layer-panel chrome.
- DONE: Removed now-unused renderer/widget imports and updated `test:roll20-render-modes` so the contract checks the actual shared iframe surface instead of requiring the inactive editor to prepare a second render.
- VERIFIED LOCAL: lint, production build, `test:roll20-render-modes`, and `git diff --check` passed. The full `ci:verify` command was rerun before the contract update and failed only at the stale Shadow-oriented assertion; rerun the full gate after this entry is committed.
- CLAIM BOUNDARY: This removes duplicate inactive code and prevents accidental reintroduction of a second editor renderer. It does not close actual Roll20 visual parity, legacy-room parity, or all-sheet import coverage.
- NEXT P0: Rerun full CI and the persistent iframe/edit-flow browser smoke, then continue same-payload modern Sandbox and dedicated legacy-room evidence.

## 2026-07-18 Modern Sandbox CSS Pair Finding

- VERIFIED ACTUAL MODERN: A local-only generated payload was applied in the dedicated Custom Sheet Sandbox and the fresh character iframe returned `VISIBLE_MATCH` with the expected modern runtime marker. Existing room content was opened for read-only observation only.
- FOUND P0: The visible sheet structure loaded, but the screenshot was not visually equivalent to the local preview. The uploaded HTML had `sheet-*` class tokens while raw fallback CSS still targeted the unprefixed class names, so the user stylesheet missed its main selectors.
- IMPLEMENTED LOCAL: The final emit boundary now normalizes HTML and CSS together with an idempotent Roll20 class-prefix contract. This is generic for raw fallback and parsed blocks; it is not a fixture-specific selector patch.
- VERIFIED LOCAL: `test:emit-contract` passes for raw HTML/CSS, already-canonical classes, and inline-style selectors. Local and remote lint/build/CI gates passed, and a fresh Sandbox screenshot/computed-style follow-up was captured locally.
- VERIFIED ACTUAL MODERN FOLLOW-UP: After applying the class-pair fix and normalized translation JSON, the dedicated Sandbox upload passed local manifest/translation validation and a fresh activation checker returned VISIBLE_MATCH. Roll20 iframe computed styles showed the prefixed sheet selectors, section background images, and 3-column geometry active.
- REMAINING ACTUAL DIFFERENCE: The external font face reported a Roll20-side load error. This is now separated as asset-loading evidence; full pixel diff and font parity are not claimed.
- CLAIM BOUNDARY: Modern upload activation and selector application are proven for one anonymous local payload, not visual parity or all-sheet support. Legacy still requires a separate legacy-enabled test room.
- VERIFIED GATES: Local lint, production build, ci:verify, server hygiene, and remote CI run 29598910200 all passed.
- NEXT P0: Continue asset-loading classification and dedicated legacy verification; do not promote this modern result to visual parity.

## 2026-07-18 Composite Attribute Safety Gate

- DONE: Added a generic preserved-attribute capability check before `attribute_card`, `skill_row`, and repeating-header packing. A composite is now rejected when its compact schema cannot represent an imported attribute; the atomic block tree remains available so `style`, `data-*`, ARIA, form-state, and other attributes are not silently discarded.
- VERIFIED LOCAL: Composite Phase 1 `11/11`, Phase 2 `13/13`, high-priority import `20/20`, wrapper preservation `11/11`, basic import `25/25`, preserved-attribute test PASS, and `git diff --check` PASS.
- CLAIM BOUNDARY: This closes a generic lossy-composite path. It does not prove byte-identical HTML/CSS, all-sheet mapping, actual Roll20 parity, or worker/rolltemplate runtime parity.
- NEXT P0: Complete a permitted user-visible Roll20 Sandbox upload and compare the same modern render; keep legacy verification in the separate legacy-enabled room.

## 2026-07-17 Direct Text Node Import Contract

- DONE: Imported containers now retain meaningful direct text nodes in source order instead of dropping text around nested controls. The text is represented as a generic editable block and emitted without adding a wrapper element.
- VERIFIED LOCAL: Import unit suite `23/23`, full `ci:verify`, lint, production build, `git diff --check`, and server-hygiene check passed.
- CLAIM BOUNDARY: This closes one generic HTML-structure loss path. It does not prove universal attribute fidelity, all-sheet mapping, actual Roll20 visual parity, worker runtime parity, or rolltemplate/chat parity.
- NEXT P0: Retry modern Custom Sheet Sandbox upload through an explicitly permitted file-upload path, then verify modern and dedicated legacy-room renders independently.

## 2026-07-17 Direct Text Whitespace Guard

- DONE: Meaningful direct text is preserved without turning normal HTML indentation into imported blocks. Whitespace remains available in `pre` and `textarea` contexts where it is content.
- VERIFIED LOCAL: Import unit suite `24/24`, lint, and `git diff --check` passed.
- CLAIM BOUNDARY: This prevents one importer inflation regression; it does not expand actual Roll20 parity or universal attribute fidelity.

## 2026-07-17 Target-Specific Canvas Width Contract

- DONE: The persistent preview/edit surface now derives its canvas width from the active edit target. Sheet and roll-result widths are independent, and the same width is used for fit scaling, iframe CSS sizing, and the outer layout slot.
- VERIFIED LOCAL: Synthetic edit-flow smoke passed after a fresh production build. Sheet width input committed `930px`; switching targets and entering `410px` produced iframe CSS/offset width `410px`. Console errors and page errors were both `0`.
- VERIFIED GATES: `corepack pnpm run lint`, `corepack pnpm run ci:verify`, production build, and server-hygiene check passed.
- CLAIM BOUNDARY: This closes the local target-width synchronization gap only. It does not claim all-sheet visual parity or actual Roll20 parity.

## 2026-07-17 Mode-Specific Runtime Asset Contract

- VERIFIED DESTINATION RULE: Custom Sheet Sandbox is modern-only and does not reproduce legacy mode. Modern actual checks use Sandbox; legacy sanitization/prefix/runtime checks use the dedicated legacy-enabled test room. Sandbox output must not be counted as legacy PASS or FAIL.
- VERIFIED ACTUAL MODERN: In the dedicated modern Roll20 Sandbox, the prepared payload rendered at `1189x1936`. All `11` HTML image attributes/current sources used `imgsrv.roll20.net`; the user style block retained `1` direct font URL and `14` direct Imgur CSS URLs; all `3` inline-style URLs and visible computed backgrounds remained direct. Images loaded `11/11`.
- VERIFIED ACTUAL LEGACY: In the dedicated legacy test room, the same payload rendered at `896x1917`. All `11` HTML image attributes/current sources remained direct Imgur URLs; all `15` user-style URLs and all `3` inline-style URLs used `imgsrv.roll20.net`; computed backgrounds were proxy-hosted. Images loaded `11/11`.
- DONE: Replaced the font-only preview policy with `runtimeAssetPolicy.ts`. The shared iframe, live-patch, and Shadow fallback contract now applies modern HTML-image proxying and legacy stylesheet/inline-style URL proxying without mutating authored source or ZIP export payloads. Already Roll20-managed, relative, and data URLs are preserved; proxy nesting and hostname lookalikes are covered.
- DONE: `roll20SandboxSanitize` no longer preemptively applies one URL rule to both modes inside the shared render contract. Its allow-list/class/selector diagnostics run first, then the same measured modern/legacy runtime asset policy decides the visual URL surface.
- VERIFIED CONTRACT: `ci:verify`, lint, and the production build pass. Focused coverage includes `test:runtime-asset-policy`, `test:roll20-sandbox-sanitize`, `test:roll20-render-modes`, and `test:export-smoke`; the render-mode test covers iframe, Shadow serialization, live patch, and the optional Sandbox diagnostic path.
- VERIFIED LOCAL HOST CONTRACT: Ignored Chrome `150.0.7871.115` run `%TEMP%\roll20-runtime-asset-policy-r20` imported `6530` blocks at reported structural match `100%`. Modern host direction matched actual (`11` proxied HTML images, direct CSS/inline assets); legacy host direction matched actual (`11` direct HTML images, `15` proxied user-style URLs, `3` proxied inline-style URLs). Transition and fresh-page legacy agreed.
- PARTIAL SAME-CHROME EVIDENCE: A fresh local/actual run supported the mode-specific asset policy, but its source-derived counts, dimensions, screenshots, and pixel measurements were deliberately not retained. Strict visual parity remains open.
- VERIFIED PERFORMANCE CAUSE: Large-input diagnostics exposed duplicate render-contract preparation and quadratic keyframe sanitization. Iframe document/live patch/optional Shadow parts now share one prepared contract, and keyframe keyword plus warning-line scans are bounded/linear.
- VERIFIED PERFORMANCE GUARD: Legacy sanitizer behavior is now part of `ci:verify`. A copyright-safe synthetic scaling test doubles keyframe-heavy input, validates warning lines, rejects quadratic growth, and keeps a broad absolute runtime ceiling.
- DONE CSS-ONLY APPLY FAST PATH: The live patch carries an HTML source key. When only CSS/layer/theme data changes, the iframe preserves the mounted sheet DOM and skips attribute collection, worker/repeating/autocalc rebuild, root replacement, and block recount. Structural HTML changes keep the full replacement fallback. Synthetic bundle tests cover same-key and invalidation behavior.
- VERIFY PERFORMANCE: Run an ephemeral mounted large-sheet drag/edit smoke for pointer-frame pacing and drop-to-ack latency. Do not retain fixture identity, source-derived counts, dimensions, screenshots, or per-sheet timing reports.
- CURRENT P0: Add keyed structural patching after the CSS-only fast path and enforce frame/commit latency budgets for direct manipulation. Continue normalized same-browser parity checks ephemerally, retaining only generic conclusions and synthetic regressions.
- VERIFIED BATCH GATES: Focused render/sanitizer/bridge tests, full `ci:verify`, lint, and production build pass. This is implementation/contract proof, not mounted interaction or Roll20 visual-parity proof.
- CLAIM BOUNDARY: Runtime URL host behavior is verified for this prepared payload in both Roll20 generations. All-sheet asset behavior and Roll20 visual parity remain unproven.

## 2026-07-17 Capture Stability, Browser Runtime, and Collapsed UI

- DONE: `smoke:legacy-fixture-visual` now records the exact browser version, user agent, and executable used for evidence. It rejects a full-sheet capture when temporary ancestor unclipping changes sheet geometry, retries once after stabilization, and fails instead of publishing a second unstable capture.
- VERIFIED HARNESS: In ignored Chrome 150 evidence `%TEMP%\roll20-legacy-capture-stability-r16`, the first modern and fresh-legacy capture attempts changed after restoration and were discarded. Their bounded second attempts restored exactly; transition legacy restored on its first attempt. This closes a false-evidence path, not renderer parity.
- VERIFIED ENGINE SENSITIVITY: The earlier complete-asset Chrome 150 run `%TEMP%\roll20-legacy-installed-chrome-r15` measured legacy root `895x1917` and final cells `166.109/183.625px`, close to actual legacy `896x1917` and `166.075/183.637px`. Playwright Chromium 148 produced the previous roughly `6.22px` allocation residual. Do not add a CSS compensation until the actual Roll20 browser/runtime version and same-asset context are captured.
- BLOCKED EVIDENCE: The latest r16 run correctly FAILed because 34 remote Imgur image requests failed; its shorter `895x1861` legacy geometry is not parity evidence. Asset-complete local and actual captures must be compared under the same browser/runtime before this P0 can close.
- DONE UI: Removed the collapsed left sidebar's mounted no-op button and the unused `56px` rail. The header toggle is now the sole control; collapsed width is `0px` and no invisible sidebar child remains mounted.
- VERIFIED UI: `%TEMP%\persistent-preview-sidebar-r17` PASSed modern and legacy independently. Both measured `280px -> 0px -> 279.125px`, zero collapsed buttons/children, one persistent iframe, zero iframe reloads, and zero console/page errors while retaining edit flow/free placement, worker replacement, and rolltemplate chat smoke.
- VERIFIED GATES: `node --check` for both modified browser smokes, `git diff --check`, lint, and production build PASSed.
- CURRENT P0: Capture actual Roll20 user agent/runtime metadata and rerun asset-complete local/actual legacy comparison. Keep browser-engine drift, asset loading, and Roll20 runtime/context as separate causes; no fixture-specific or speculative CSS patch.

## 2026-07-17 Roll20 Document Language and Import SFX Evidence

- DONE: Replaced the preview builder's unconditional `lang="ko"` with a validated BCP-47 document-language contract. The measured Roll20 default is `en`, and users can override it from the mounted main toolbar. Iframe source, persistent live patch, and the Shadow fallback receive the same value.
- DONE: Programmatic Blockly import/create moves no longer play the block-snap sound. Snap feedback is now limited to `BLOCK_MOVE` events whose reason includes `drag` and whose destination parent changed.
- VERIFIED CAUSE: In the ignored language probe, legacy `lang=ko`/no-lang rendered root width `898px` and direct label text `52.219px`; `lang=en` rendered root width `896px` and direct label text `47.500px`. Actual Roll20 legacy evidence is root width `896px` and direct label text `47.525px`.
- VERIFIED LOCAL: `%TEMP%\roll20-legacy-language-and-sfx-r14` PASSed the prepared ignored import at `6530` blocks and `100%` structural match. Modern remained `1189x1936`. Transition legacy and fresh-page legacy both rendered `896x1919`, with maximum root/table/cell delta `0`.
- VERIFIED ERROR BOUNDARY: Import-time WebAudio/AudioContext errors fell to `0`. The remaining two legacy console messages are the expected correlated CORS/resource pair for the Roll20-proxied external font and remain recorded rather than hidden.
- PARTIAL: Legacy root width now matches actual, but full parity is not reached. Local height is `1919px` versus actual `1917px`; final-table cells are `172.297/177.438px` local versus `166.075/183.637px` actual.
- CURRENT P0: Diagnose the remaining generic roughly `6.22px` intrinsic column allocation and roughly `2px` height residual. Do not add fixture-, table-, attribute-, language-, or font-family-specific CSS.
- P1: Persist the selected document language with workspace save/restore and consider import-time language suggestion when the chosen translation filename supplies a reliable locale. Do not infer a locale from translated text.
- VERIFIED GATES: `test:blockly-sound-policy`, `test:roll20-render-modes`, lint, production build, server hygiene, and the focused ignored browser smoke passed.
- CLAIM BOUNDARY: This closes one measured fallback-font/root-width cause and one import-side interaction error. It does not prove all-sheet parity, complete legacy sanitization, or the remaining table/height residual.

## 2026-07-17 Mode-Specific External Font Runtime

- DONE: Added a fixture-agnostic Roll20 runtime font policy. Modern preview/edit/live-patch CSS preserves authored external `@font-face` URLs; legacy preview/edit/live-patch CSS rewrites only external font URLs through `imgsrv.roll20.net`. Background/image URLs and export payload CSS are not changed by this policy.
- VERIFIED CONTRACT: `test:roll20-render-modes` proves iframe, Shadow serialization, and live patch keep modern-direct and legacy-proxy font URLs separate. `test:export-smoke` proves both ZIPs preserve the authored font URL while modern keeps authored CSS with `sheet.json.legacy=false` and legacy applies the existing CSS compatibility transform with `sheet.json.legacy=true`.
- VERIFIED ACTUAL CAUSE: Fresh read-only Roll20 evidence shows the same authored font active in modern (`document.fonts.check=true`, direct CDN URL) and inactive in legacy (`false`, `imgsrv.roll20.net` URL). Table collapse, spacing, layout mode, and source `colspan` handling do not explain the mode split.
- VERIFIED LOCAL MODERN: Ignored browser report `%TEMP%\roll20-legacy-font-policy-r9` remains `1189x1936`, matching actual modern. The final table is `349.73x182.28px` local versus `349.712x182.275px` actual and the custom font is active in both.
- PARTIAL LOCAL LEGACY: The same report is `898x1918` local versus `896x1917` actual. The final table improved from the previous `182.28px` local height to `181.28px`, versus `180.675px` actual; its final row is now `112.14px` versus `111.537px` actual. This is closer, not parity.
- CURRENT P0: Legacy final-table column allocation still differs materially: local `178.13/171.61px` versus actual `166.075/183.637px`. Diagnose the remaining generic intrinsic-width/input-allocation or fallback-font rule-order cause before another renderer patch. Do not hardcode the measured table, attribute names, or font family.
- HARNESS: `smoke:legacy-fixture-visual` now records generic font-face activation and visible table row/cell geometry. A legacy font-proxy CORS pair is retained as expected evidence; only that correlated pair is exempted, while unrelated console errors still fail the smoke.
- CLAIM BOUNDARY: This closes one measured modern/legacy font-runtime difference for the prepared local fixture. It is not complete legacy sanitization, all-sheet parity, or proof that every non-font asset follows the same URL policy.

## 2026-07-17 Matching-Runtime Activation Render Evidence

- DONE: Extended the generated post-upload activation checker with generic, fixture-agnostic render evidence: sheet-root rect/scroll size, visible top-level rows, bounded direct-child and final-layout computed styles, table spacing/collapse/layout values, focused-control state, and grouped representative `attr_*` values.
- DONE: Added `--out-dir <ignored-local-folder>` to `snippet:roll20-upload` so locked canonical evidence can remain untouched while a fresh modern or legacy handoff is generated elsewhere.
- VERIFIED ACTUAL MODERN: Read-only collection from the dedicated modern Roll20 Sandbox measured root scroll `1189x1936`. Local modern is also `1189x1936`; top-level row deltas are subpixel and the final row is `434.30px` local versus `433.913px` actual.
- VERIFIED ACTUAL LEGACY: Read-only collection from the dedicated legacy test room measured root scroll `896x1917`. Local legacy is `895x1919`; landmarks through the center background agree within subpixel rounding, while the final row is `434.30px` local versus `432.313px` actual.
- VERIFIED LOCALIZATION: The modern final asset-table row is `113.138px` actual versus `113.14px` local. The same legacy row is `111.537px` actual versus `113.14px` local, accounting for about `1.60px` of the remaining roughly `1.99px` final-section delta. No room or source was modified and no guessed CSS correction was added.
- VERIFIED TOOLING: `node --check scripts/roll20_upload_snippet.mjs`, `test:roll20-upload-snippet`, and a real ignored payload handoff under `%TEMP%\roll20-activation-render-evidence-r5` PASS; its generated activation checker also passes `node --check`.
- NEXT P0: Recapture that final table with the upgraded `border-spacing`, `border-collapse`, `table-layout`, width-allocation, and grouped state evidence in both runtimes. Add a renderer rule only if the difference is generic to the measured Roll20 mode, then rerun modern and legacy independently.
- CLAIM BOUNDARY: Modern root geometry is matched for this prepared payload and the remaining legacy drift is localized. This is not all-sheet pixel parity, complete legacy-sanitizer fidelity, or permission to use one mode's evidence for the other.

## 2026-07-17 Canonical Iframe Edit Surface Phase 2F

- DONE: The default edit component is now lightweight chrome only: the `36px` toolbar, `248px` layer panel, and an iframe slot. It does not subscribe to emitted sheet source, rebuild preview parts, mount a Shadow root, or install duplicate drag/resize observers.
- DONE: The old Shadow implementation remains an explicit named fallback component but is not mounted by the product path. The visible and interactive sheet in preview and edit is one persistent iframe.
- DONE: Added validated iframe context-menu messages with parent-viewport coordinate conversion. Right click no longer starts a left-button drag, and the existing inspect/duplicate/reorder/delete menu actions are available from the iframe surface.
- VERIFIED WORKER: `.tmp/persistent-worker-change-r61` proves worker A runs, source B live-applies, B `sheet:opened` runs, A's previous `change:probe` handler is removed, one worker script remains, and iframe reload count stays `0` in modern and legacy independently.
- VERIFIED FINAL SURFACE: `.tmp/persistent-lightweight-chrome-r63` PASSes modern and legacy independently with Shadow host count `0`, iframe slot count `1`, iframe count `1`, reload count `0`, context inspect, layer roundtrip, flow/free/widget commits, zoom, rolltemplate chat, worker replacement, and browser errors `0`.
- VERIFIED STATIC: iframe bridge tests, lint, and production build PASS after the final surface split.
- PARTIAL: This completes the local single-render-surface edit migration. It does not prove actual Roll20 pixel parity or every third-party sheet/worker API; actual Sandbox/test-room upload and broader corpus verification remain P0.
- NEXT P0: Re-run the actual Roll20 modern Sandbox and legacy test-room upload comparison from ignored fixtures, classify remaining render differences, and fix only measured shared or mode-specific causes.
- COPYRIGHT: All committed test source is synthetic. Generated reports and actual Roll20 evidence stay ignored and untracked.

## 2026-07-17 Persistent Iframe Edit Surface Phase 2E

- DONE: The one persistent Roll20 iframe is now the visible sheet surface in edit mode. It occupies the canvas area after the `248px` layer panel and `36px` edit toolbar, while selection and drop indicators remain parent-owned overlays.
- DONE: Added containing-block-aware free placement. Pointer movement is painted optimistically, then pointer-up writes generated `sheet-r20-node-*` classes and a separate `r20-design-css:managed` CSS block instead of adding `position`, `left`, or `top` to the authored HTML style field.
- DONE: Added a validated iframe widget-drag boundary. The iframe accepts only the friendly-widget MIME while edit mode is enabled; the parent validates source/origin/protocol/current bridge ids and resolves only registered preset payloads before committing flow or free placement.
- DONE: Widget gallery absolute placement now uses managed CSS rules. Flow placement still nests/reorders the Blockly topology and removes positional declarations.
- VERIFIED MODERN: `.tmp/persistent-widget-drop-r55` modern PASS; visible edit iframe, exact layer/toolbar boundary, flow move, snapped free move, gallery drag/drop into a container, live apply acknowledgements, preserved input/runtime state, iframe reload count `0`, and console/page errors `0`.
- VERIFIED LEGACY: The same report contains an independent legacy PASS with the same interaction/state assertions plus the legacy-only runtime style. Modern evidence is not reused.
- VERIFIED INTERACTION: `.tmp/persistent-zoom-roll-r58` adds independent modern and legacy proof for layer-panel-to-iframe and iframe-to-layer selection, `100% -> fit -> 100%` zoom without iframe replacement, and a real preview roll button producing one rendered rolltemplate chat card. Both rows keep reload count `0` and browser errors `0`.
- VERIFIED STATIC: `test:design-position`, `test:iframe-drop-target`, `test:iframe-edit-bridge`, lint, and production build PASS.
- PARTIAL: `EditCanvas` still mounts the transitional Shadow surface underneath the visible iframe. Layer selection, gallery drag, roll/chat, and zoom now have two-mode coverage; worker-source replacement and context actions remain before duplicate-render removal.
- PARTIAL: This proves local edit/preview surface identity and interaction persistence, not visual parity with actual Roll20. Actual Sandbox/test-room upload and strict modern/legacy comparison remain open.
- NEXT P0: Add visible-iframe worker-source replacement and context-action browser proof, then stop mounting the duplicate Shadow sheet surface and re-run both mode gates.
- COPYRIGHT: Test source is synthetic. Generated reports remain ignored under `.tmp/`; no private sheet source, screenshot, or asset is staged.

## 2026-07-17 Persistent Iframe Edit Bridge Phase 2D

- DONE: Added revisioned `r20:edit-apply` / `r20:edit-applied` live updates. The persistent iframe now replaces emitted sheet HTML and the allow-listed dynamic CSS/i18n/runtime layers without changing `srcdoc` or remounting the document.
- DONE: Preserved Roll20 form attributes and existing worker handlers when the worker source is unchanged. A changed worker source is deliberately reinstalled and is not claimed to preserve worker-local state.
- DONE: Flow-mode pointer-up now commits the resolved `before` / `inside` / `after` target once through the Blockly adapter. The parent keeps optimistic drag translation until the matching apply acknowledgement clears it.
- DONE: Fixed a persistent-iframe width race. Each live source may grow the canvas from its measured intrinsic width, while the existing rule still prevents automatic shrinking of a wider user-selected canvas.
- VERIFIED MODERN: `.tmp/persistent-flow-commit-r51` modern PASS; initial and subsequent apply acknowledgements increase, the subject is nested in the resolved target, input/runtime state survives, and iframe reload count stays `0`.
- VERIFIED LEGACY: The same report contains an independent legacy PASS with identical interaction/state assertions plus the legacy-only runtime style. Modern evidence is not reused.
- VERIFIED REGRESSION: `.tmp/edit-flow-live-apply-r46` PASSes the current Shadow fallback flow/free interactions, layer modes, absolute-in-frame placement, and `0px` post-drop drift with no console/page errors.
- VISUAL DIAGNOSTIC: Final paired run `.tmp/preview-edit-live-apply-final-r52` restores the established baseline: fixture-B is exact in both modes; fixture-C is `22` pixels different in modern and exact in legacy; fixture-A is `36` pixels different in both. DOM signatures, sampled computed styles, and visible geometry match, but the strict pixel gate correctly remains failed for those three non-exact rows.
- HARNESS: A one-off legacy startup returned `blockCount=0` before the fixture mounted. The persistent smoke now retries its synthetic clear/import preparation and fails explicitly if no blocks are created; the next clean run passed both modes.
- PARTIAL: The shipped edit pane still paints the transitional Shadow surface. Iframe flow commit/live apply is verified, but iframe free placement, worker-source-change state, roll/chat, zoom, and the final visible-surface switch remain open.
- NEXT P0: Make the persistent iframe the visible edit surface, add containing-block-aware free placement commit, then run worker/roll/chat/zoom and actual Roll20 upload checks independently in modern and legacy before removing the Shadow fallback.
- COPYRIGHT: The committed smoke source is synthetic. Prepared sheet sources, screenshots, and generated reports remain ignored local evidence.

## 2026-07-17 Persistent Iframe Edit Bridge Phase 2C

- DONE: Pointer capture now preserves the original drag subject while `document.elementFromPoint` resolves the block actually under the pointer. The bridge no longer mistakes the captured subject for every later hit target.
- DONE: Added a parent-side, pure drop-target resolver for `before` / `inside` / `after`. It uses iframe hit geometry plus live Blockly layer roles, rejects the subject and its descendants as cyclic targets, and requires a real Blockly statement container before returning `inside`.
- DONE: Added a separate parent-owned candidate overlay. Selection and drop-target rectangles remain iframe siblings; no editor CSS is injected into the Roll20 document.
- VERIFIED MODERN: `.tmp/persistent-drop-target-r38` modern PASS keeps the card as the stable subject, resolves a different frame under pointermove, selects `inside`, clears the candidate on cancel, preserves runtime/input state, and reloads the iframe `0` times.
- VERIFIED LEGACY: The same report contains an independent legacy PASS with the same interaction assertions plus the legacy-only runtime style. Modern evidence is not reused.
- VERIFIED: `test:iframe-drop-target` covers leaf before/after, container inside, subject/descendant cycle rejection, and non-drag phases. `.tmp/edit-flow-drop-target-r39` keeps the Shadow fallback regression green with `0px` drift; `.tmp/preview-edit-drop-target-r39` remains pixel exact in modern and legacy.
- PARTIAL: The smoke temporarily makes the persistent pane paint-visible to prove the rAF pointermove path. The shipped edit mode still displays the Shadow fallback, and no iframe drop commits Blockly yet.
- NEXT P0: Expose the persistent iframe in the edit canvas, add optimistic subject translation, commit the resolved target once on pointer-up, and apply emitted HTML/CSS back into the live iframe with acknowledgement. Keep modern and legacy as separate gates.
- COPYRIGHT: New tests use synthetic source only. Generated reports remain ignored under `.tmp/`.

## 2026-07-17 Persistent Iframe Edit Bridge Phase 2B

- DONE: Extended the iframe edit contract with a stable pointer subject, `pointerId`/button state, `pointercancel`, ancestor `hitPath`, and offset-parent geometry. The parent rejects every unknown block id before showing the overlay.
- DONE: Pointer move messages are rAF-coalesced inside the iframe, while pointer-up/cancel keeps the original subject and clears pointer/capture state. This remains a read-only geometry bridge; no Blockly drag commit is claimed.
- VERIFIED MODERN: `.tmp/persistent-pointer-geometry-r35` has a separate modern PASS with pointer id `17`, final `pointercancel`, hit-path length `3`, a recognized offset-parent block, input/runtime preservation, iframe reload count `0`, and console/page errors `0`.
- VERIFIED LEGACY: The same report has an independent legacy PASS with the same bridge assertions, legacy-only runtime style present, iframe reload count `0`, and console/page errors `0`. Modern evidence is not reused for this row.
- VERIFIED: `.tmp/edit-flow-pointer-geometry-r34` PASSes the existing Shadow fallback flow/free drag paths with `0px` post-drop drift. `.tmp/preview-edit-pointer-geometry-r34` is `EXACT` for the focused ignored fixture in modern and legacy (`0` differing pixels in each mode).
- VERIFIED: `ci:verify`, lint, production build, `test:iframe-edit-bridge`, `test:roll20-render-modes`, and server hygiene PASS.
- PARTIAL: The iframe is hidden while the transitional Shadow editor is visible, so the browser can suspend iframe `requestAnimationFrame`. Down/cancel, stable subject, ancestor path, and containing-block geometry are browser-verified; a visible-surface pointer-move stream is not yet verified.
- NEXT P0: Make the persistent iframe the visible edit surface, derive before/inside/after targets from the reported path, paint optimistic drag feedback in the parent overlay, commit Blockly once on pointer-up, and add an in-frame apply/ack path. Keep Shadow fallback until these gates pass independently in modern and legacy.
- COPYRIGHT: All browser evidence remains ignored under `.tmp/`; no fixture source, screenshot, or generated report is staged.

## 2026-07-16 Persistent Iframe Edit Bridge Phase 2A

- DONE: Added a typed `r20:edit-ready` / `r20:edit-mode` / `r20:edit-hit` protocol for the persistent sandboxed iframe. The iframe now reports block geometry for pointer and selected-node measurement without exposing or reparenting its DOM.
- DONE SECURITY: Parent acceptance requires the current iframe `WindowProxy`, opaque origin `null`, protocol/schema validation, the current per-document random `bridgeId`, and an existing HTML block id in the Blockly adapter. The child also requires the parent source, protocol, and matching `bridgeId` before enabling edit interception.
- DONE: `PreviewMain` renders a pointer-transparent selection rectangle as an iframe sibling using iframe CSS-pixel geometry. It is edit-mode-only and does not add app CSS inside the Roll20 document.
- VERIFIED MODERN: `.tmp/persistent-iframe-edit-bridge-r29` PASS; edit command, stale-token rejection, pointerdown default prevention, parent selection/measure overlay, highlight roundtrip, state preservation, and iframe reload count `0`.
- VERIFIED LEGACY: The same report has a separate legacy PASS with the same bridge assertions, legacy-only runtime style present, and iframe reload count `0`. Modern evidence is not reused for this row.
- VERIFIED: Focused preview/edit visual regression `.tmp/preview-edit-iframe-bridge-r30` remains `EXACT` in modern and legacy with console/page errors `0`. Existing Shadow fallback edit regression `.tmp/edit-flow-iframe-bridge-r31` PASSes with `0px` post-drop drift.
- DONE: Added `test:iframe-edit-bridge` to `ci:verify` for malformed protocol, bridge id, phase, block id, coordinate bounds, source, and origin rejection.
- PARTIAL: The protocol does not yet commit iframe pointer drags. Stable pointer identity, cancel/pointer-capture, ancestor hit paths, containing-block geometry, flow target calculation, and an in-frame apply/ack path are still required before replacing the Shadow canvas.
- NEXT P0: Extend the protocol with stable pointer subject, `down/move/up/cancel`, ancestor geometry, and parent-derived before/inside/after targets. Commit Blockly once on pointer-up, keep optimistic overlay paint until emit/apply acknowledgement, and verify modern/legacy independently before switching the visible edit surface.
- COPYRIGHT: The bridge and tests use synthetic source only. Ignored fixtures, screenshots, and generated reports remain untracked.

## 2026-07-16 Persistent Preview Surface Phase 1

- DONE: `EditorShell` now keeps one canonical preview iframe mounted across `preview -> edit -> preview`. Hidden panes use zero width, hidden visibility, and disabled pointer events instead of unmounting the Roll20 runtime.
- DONE: Added copyright-safe `smoke:persistent-preview-surface`. It runs modern and legacy as separate rows and checks iframe element identity, iframe count, reload count, input value, runtime token, pane visibility, and the mode-specific legacy input-state layer.
- VERIFIED MODERN: `.tmp/persistent-preview-surface-final-r27` PASS; same iframe node, reload count `0`, input/runtime state preserved, and legacy input-state CSS absent.
- VERIFIED LEGACY: `.tmp/persistent-preview-surface-final-r27` PASS independently; same iframe node, reload count `0`, input/runtime state preserved, and legacy input-state CSS present.
- VERIFIED: Focused preview/edit visual regression `.tmp/preview-edit-persistent-r23` is `EXACT` for the measured ignored fixture in both modern and legacy, with console/page errors `0` in both rows.
- VERIFIED: Edit-flow regression `.tmp/edit-flow-persistent-r26` PASSes flow/free placement, before/inside/after insertion, non-leaf reorder, absolute positioning inside a frame, canvas width controls, and `0px` post-drop drift. The smoke now mirrors the real layer `dragstart` state and re-queries a React-replaced row before reading its drop mode.
- PARTIAL: Edit mode still displays the transitional Shadow interaction surface while the persistent iframe is hidden. This phase preserves the future canonical runtime but does not yet satisfy the final "preview render plus edit-only overlay" contract.
- NEXT P0: Add a typed iframe edit bridge and parent-owned overlay for selection, drag preview, flow insertion, and absolute-in-frame coordinates. Keep Shadow as fallback until pointer, worker, roll/chat, zoom, optimistic drop, and modern/legacy gates pass independently.
- COPYRIGHT: The synthetic persistent-surface input is committed; all real fixture source, screenshots, and generated report files remain ignored local evidence.

## 2026-07-16 Shared Render Contract and Two-Mode Preview/Edit Gate

- DONE: Added `prepareSheetRenderContract` as the single source transformation path for iframe preview and Shadow edit serialization. Prefixing, expected Sandbox sanitization, legacy CSS sanitization, translation, initial autocalc, and repeating runtime HTML are now prepared once.
- DONE: Preview and edit now pass one atomic `compatibilityMode` input instead of independently forwarding `sanitize` and `legacyCssSanitize` booleans. Existing low-level callers remain backward-compatible, while product components cannot create a mixed mode.
- DONE: Added `--compatibility-mode modern|legacy|both` to `smoke:preview-edit-visual`. A `both` run stores separate mode labels and screenshot names for the same fixture instead of treating one mode as evidence for the other.
- VERIFIED: `test:roll20-render-modes` proves the atomic modern/legacy contract matches the previous paired low-level results for both iframe and Shadow serializers. `ci:verify`, lint, production build, edit-flow smoke `.tmp/edit-flow-render-contract-r21`, and imported edit sync `.tmp/imported-edit-render-contract-r21` PASS.
- VERIFIED: Full paired fixture smoke `.tmp/paired-shared-contract-r22` PASSes all 3 ignored fixtures in both modes with zero console/page errors. Modern/legacy sizes remain fixture-A `850x1290/850x1290`, fixture-B `850x1161/850x1161`, and fixture-C `1189x1936/895x1919`; the fixture-C cross-mode `10.9%` value is diagnostic difference between contracts, not a parity score.
- VERIFIED MODERN: In `.tmp/preview-edit-both-contract-r19`, fixture-B is pixel exact; fixture-C has `22` differing pixels (`13.05ppm`, max channel delta `12`); fixture-A has `36` differing pixels (`32.83ppm`, max channel delta `33`). All three have zero computed-style and zero visible-geometry differences.
- VERIFIED LEGACY: In the same paired run, fixture-B and fixture-C are pixel exact; fixture-A has `36` differing pixels (`32.83ppm`, max channel delta `33`). A focused rerun reproduced fixture-A at `35-36` pixels in both modes, again with matching styles and geometry.
- PARTIAL: The strict pixel gate intentionally remains failed for the small reproducible fixture-A raster region and the `22` modern fixture-C pixels. The threshold was not relaxed. This is direct evidence that two separately rasterized surfaces can differ even when their DOM/style/geometry contracts match.
- NEXT P0: Make one persistent iframe the canonical visible sheet surface owned by `EditorShell`, then add edit-only overlay/bridge behavior without remounting the iframe or losing optimistic drop placement. Keep the current Shadow edit path until pointer, containing-block, worker, roll/chat, zoom, and both compatibility modes pass on the replacement.
- COPYRIGHT: All fixture source, screenshots, and generated reports used by this gate remain ignored local evidence and are not staged.

## 2026-07-16 Modern and Legacy Mode Invariant Hardening

- DONE: Removed the preview store's independent `setSanitize` and `setLegacyCssSanitize` mutation actions. Product code can now change HTML class-prefix behavior and legacy CSS sanitization only through the atomic `modern|legacy` compatibility action.
- DONE: Kept the old browser-smoke `setLegacyCssSanitize` alias for compatibility, but routed it through the same atomic mode action so diagnostics cannot create an impossible mixed state.
- DONE: Extended the paired ignored-fixture diagnostic to include top-level row `6`, which contains the remaining bottom-section geometry difference.
- VERIFIED: `test:roll20-render-modes` now rejects independent compatibility mutators and passes with the atomic alias. Paired browser smoke `.tmp/paired-mode-invariant-r18` PASSes all 3 ignored fixtures in both modes: fixture-A `0%`, fixture-B `0%`, and the measured fixture-C fixture `9.9%` modern-vs-legacy diagnostic difference, with no fixture failure.
- VERIFIED: `ci:verify`, lint, and production build PASS. `check:server-hygiene` reports zero project listeners on `3000`, `3001`, `3002`, and `4300-4499` after the browser smoke.
- VERIFIED MODERN: The current local final row remains `434.30px`; actual modern is about `433.91px`, a roughly `+0.39px` local delta.
- VERIFIED LEGACY: The current local final row is also `434.30px`; actual legacy is about `432.31px`, a roughly `+1.99px` local delta. This proves the remaining mode-specific behavior is not represented locally yet.
- VERIFY P0: Read the actual modern and legacy final-row computed styles before changing baseline CSS. The existing Roll20 tabs stayed open, but read-only DOM collection timed out in this pass; no fixture-specific or guessed `-2px` correction was added.
- CONTRACT: Modern and legacy are both required destinations and must pass independently. A shared implementation is acceptable only for behavior measured as shared; one mode's screenshot, geometry, or sanitizer evidence never passes the other.

## 2026-07-16 Paired Runtime Paint and Initial Autocalc

- DONE: Removed app-owned dialog CSS that forced `.charsheet` background repeat/position and common disabled-input paint over imported user CSS. Modern mode now keeps native modern disabled control paint; legacy mode receives a separate, overridable legacy input-state layer.
- DONE: Mirrored Roll20-generated runtime classes on roll, compendium, and repeating-section buttons in both iframe preview and Shadow edit mounts. The implementation is generic runtime behavior and contains no fixture selector.
- DONE: Added deterministic initial Roll20 autocalc for disabled number inputs by reusing the existing dice parser/executor. The preview-only runtime value is stored separately while the original HTML `value` formula remains unchanged for export and block roundtrip.
- VERIFIED MODERN: The prepared ignored fixture renders at `1189x1936`; `attr_hp_max=10`, `attr_mp_max=10`, and `attr_san_max=99` match the captured actual Roll20 initial state. Actual-vs-local channel-delta-60 mismatch improved from `4.458%` to `4.434%`; mean absolute channel difference improved from `5.357` to `5.318`.
- VERIFIED LEGACY: The same source renders through the independent legacy contract at `895x1919` versus actual `896x1917`; the same three initial number values resolve to `10`, `10`, and `99`. With the recorded one-pixel vertical alignment, channel-delta-60 mismatch improved from `6.379%` to `6.375%`; mean absolute channel difference is `8.725` versus the prior `8.720` and therefore is not claimed as a uniform pixel improvement.
- VERIFIED: Full paired smoke `.tmp/paired-all-runtime-r16` PASSes all 3 prepared ignored fixtures in both modes. The measured fixture imported `6530` blocks with worker `1`, warnings `2`, stable geometry, console errors `0`, and page errors `0`. `test:roll20-render-modes`, lint, and production build also PASS.
- PARTIAL: Current preview/edit browser smoke has identical DOM signatures, computed styles, and visible geometry, but pixel parity is blocked by a private fixture background request returning Imgur `403` only during the Shadow capture. The failed external asset is recorded separately; no copyrighted asset is embedded, cached, or committed as a workaround.
- CONTRACT: Modern and legacy remain separate required destinations. This batch is accepted only because runtime behavior is shared where Roll20 behavior is shared and mode-specific paint stays isolated; neither mode borrows the other's visual evidence.
- NEXT P0: Re-run preview/edit pixel parity with a user-owned ignored asset-relink map, then isolate the remaining legacy bottom-section geometry and expand actual Roll20 evidence beyond this prepared fixture.

## 2026-07-16 Roll20 Runtime Control Geometry Alignment

- ROOT CAUSE: Actual Roll20 gives generated roll buttons runtime behavior equivalent to `vertical-align: middle`; the local shared baseline left them at the browser default `baseline`. The button boxes were already `20x20`, but their inline alignment made the HP/wound/SAN row about `9px` too tall in both render modes.
- DONE: Added the measured roll-button alignment and repeating-section control minimum height to the shared iframe/Shadow Roll20 runtime layer. User sheet CSS is still appended later and can override these baseline declarations.
- DONE: Extended the paired ignored-fixture smoke with state/control geometry, bottom layout contributors, and flow-column segment evidence. These diagnostics are generated under ignored `.tmp/` output and do not publish the user fixture.
- VERIFIED MODERN: Local full root is now `1189x1936`, matching the actual modern Roll20 root size `1189x1936`. The HP row is `200.27px` locally versus `200.24px` actual, and the next skills/center landmarks are within about `0.04px`.
- VERIFIED LEGACY: Local full root is now `895x1918` versus actual legacy `896x1917`. The HP row is `200.27px` locally versus `200.57px` actual; downstream center position remains about `0.37px` high and the final section is about `1.58px` taller locally.
- PARTIAL: Best-aligned actual-vs-local full-root mismatch at channel delta `60` improved from `7.61%` to `5.64%` in modern mode and from `9.65%` to `7.28%` in legacy mode. Mean absolute channel difference is now `6.33` modern and `9.29` legacy. This is material improvement, not a parity claim; persisted values, focus state, raster/font noise, and the remaining legacy bottom-section geometry are not normalized.
- CONTRACT: Modern and legacy remain separate required destinations. This patch is accepted only because the paired smoke improved both; future changes must continue to report both measurements independently.
- NEXT P0: Normalize the remaining actual/local attribute and focus state, then isolate the legacy final-section `1.58px` height difference without applying fixture-specific CSS.

## 2026-07-16 Paired Full-Root Modern and Legacy Evidence

- VERIFIED: Captured and persisted ignored full-root evidence for the same prepared user-import payload in both dedicated Roll20 destinations. Modern is `1189x1936`; legacy is `896x1917`. Evidence stays local under `reports/roll20-actual-compare/2026-07-16-modern-legacy-pair/` and is not committed.
- DONE: Corrected `smoke:legacy-fixture-visual` so a mode change uses the product's atomic `setRoll20CompatibilityMode` action. The smoke now switches HTML class-prefix behavior and legacy CSS sanitization together instead of toggling CSS alone.
- DONE: Added clipping-safe full-root iframe capture to the local paired smoke and recorded computed styles, text-input height groups, top-level landmarks, and nested landmarks for each mode.
- DONE: Added current measured Roll20 text-input and roll-button runtime defaults to the shared iframe/Shadow baseline. User sheet CSS is appended later and can still override these generic defaults.
- VERIFIED: The prepared import remains structurally matched at `6530` blocks with worker `1` and warnings `2`. Local preview/edit comparison remains `EXACT` at `0` mismatched pixels for this fixture. Final paired smoke `.tmp/paired-modern-legacy-final` passed with modern `1189x1944`, legacy `895x1933`, mode mismatch `9.17%`, console errors `0`, and page errors `0`.
- PARTIAL: Actual-vs-local full-root diagnostics are not yet Roll20 visual parity. At a channel-delta threshold of `60`, modern mismatch is `7.61%` and legacy mismatch is `9.65%`; stitched JPEG capture, font antialiasing, persisted Roll20 attribute values, and focus state are not normalized.
- VERIFY P0: Remaining geometry drift is localized rather than global. The HP/wound/SAN row is about `+9px` taller locally in both modes; downstream modern landmarks end about `+12px` lower and legacy landmarks about `+18px` lower. Normalize default attribute/state evidence and isolate these nested row/skills differences before another renderer patch.
- CONTRACT: Modern and legacy remain separate required targets. A fix is acceptable only when the paired gate shows that it preserves the other mode; neither mode can borrow the other's evidence or be treated as the fallback implementation.

## 2026-07-16 Modern and Legacy Recheck and Dead Toolbar Cleanup

- VERIFIED: Rechecked the same prepared user-import payload in the dedicated modern Custom Sheet Sandbox and dedicated legacy test room. Modern preserved `attr-input` at `210x26px` with root `cssWidth=850px`, `scrollWidth=1189`, and `scrollHeight=1936`; legacy produced `sheet-attr-input` at `52x40px` with root `cssWidth=850px`, `scrollWidth=896`, and `scrollHeight=1917`.
- VERIFIED: Both destinations applied the sampled translations and exposed zero source script nodes. This reconfirms that modern and legacy are separate runtime contracts, not a single CSS preference.
- DONE: Removed the unmounted `PreviewToolbar.tsx` and its duplicate mode/width/zoom controls. Updated the render-mode smoke so it validates only the actually mounted `MainAreaToolbar` atomic `modern|legacy` control.
- VERIFIED: `test:roll20-render-modes` passes after the cleanup. Product mode selection still switches HTML class handling and legacy CSS sanitization together.
- SUPERSEDED: The paired full-root section above now records persisted ignored screenshots and initial pixel classification. State/font/crop normalization and final visual parity remain P0.

## 2026-07-16 Modern and Legacy Roll20 Render Modes

- DONE: Added one atomic Roll20 compatibility selector. Modern mode preserves authored HTML/CSS class names and writes `"legacy": false`; legacy mode enables HTML class prefixing plus legacy CSS sanitization and writes `"legacy": true`.
- DONE: Preview toolbar and Export dialog now use the same store action, so preview/edit and exported `sheet.json` cannot silently select different Roll20 generations. Exported `README.txt` records the selected mode and the matching Roll20 game-setting instruction.
- DONE: Added the actual mounted `Roll20 | 신버전 | 구버전` segmented control to the central editor toolbar; the older standalone Preview toolbar is not the product's mounted mode surface.
- DONE: Updated the generated Sandbox upload helper to dispatch Roll20's real delegated file-input `change` handler. Live handler inspection confirmed that Roll20 uses `FileReader`, form-encoded POSTs to `/sheetsandbox/savesheetsettings`, then calls `reloadSheetData()` and `reloadOpenCharacters()`.
- DONE: The upload/activation helper now derives the expected `modern|legacy` runtime from `sheet.json` and returns `RUNTIME_MODE_MISMATCH` before visual evidence can be accepted.
- VERIFIED: Actual modern Custom Sheet Sandbox runtime preserved `attr-input`; the sampled input was `210x26px`, root `cssWidth=850px`, `scrollWidth=1189`, `scrollHeight=1936`, translated markers `name=1`, `strength=2`, and script nodes `0`.
- VERIFIED: Actual dedicated legacy test room prefixed the same source to `sheet-attr-input`; the sampled input was `52x40px`, root `cssWidth=850px`, `scrollWidth=896`, `scrollHeight=1917`, translated markers `name=1`, `strength=2`, and script nodes `0`.
- VERIFIED: `test:export-smoke`, `test:roll20-sandbox-sanitize` (7/7), `test:roll20-render-modes`, `test:roll20-upload-snippet`, and `audit:legacy-export` pass. These are contract checks, not pixel parity.
- VERIFIED: Browser smoke `.tmp/export-dialog-modern-legacy-r5` passed Export legacy -> central toolbar legacy -> central toolbar modern -> Export modern synchronization, with console issues `0`, page errors `0`, failed requests `0`, and external requests `0`.
- VERIFIED: Final `ci:verify`, lint, build, `git diff --check`, and post-smoke server hygiene pass; no project dev/smoke listener remains.
- VERIFY: Full-height normalized screenshot/diff evidence for the same generated payload in both modern and legacy Roll20 remains P0. The current local legacy sanitizer is an evidence-backed approximation, not a claim of complete Roll20 sanitizer parity.
- NEXT P0: Generate matching modern and legacy exports from the same ignored fixture, upload each only to its matching dedicated runtime, capture normalized sheet-root evidence, and classify the remaining wrapper/CSS/state/asset differences.

## 2026-07-16 Translation Payload and Preview/Edit Runtime Parity

- ROOT CAUSE: The Blockly i18n workspace emits internal `<!-- i18n[ko] "key": "value" -->` comments. Export normalized those comments to Roll20 JSON, but local preview/edit attempted JSON-only parsing. The generated Roll20 payload therefore translated while the local render could remain English.
- DONE: Added one shared `parseTranslationMap` path for Roll20 JSON and the internal locale-comment format. Preview iframe, Shadow edit runtime, sheet-worker translation APIs, chat, and export now consume the same normalized translation map.
- DONE: Reapplied translations after Shadow DOM parsing so void/hidden elements retain the same runtime DOM state as iframe preview. Added Roll20-documented translated attributes `alt` and `label` alongside `title`, `placeholder`, and `aria-label`.
- DONE: Added `test:translation-payload` to `ci:verify` and extended `smoke:preview-edit-visual` to report all and visible translation matches separately.
- VERIFIED: Ignored local run `.tmp/preview-edit-visual-20260716-r19` passed all 3 prepared fixtures. Translation state was preview/edit `436/436`, `0/0`, and `1148/1148`; visible translation matches were `53/53`, `0/0`, and `93/93`. Computed-style and visible-geometry differences remained `0`; pixel status remained two `EXACT` and one `RASTER_TOLERANCE` at `14` pixels / `8.33 ppm`.
- VERIFIED: `.tmp/edit-flow-translation-sync-20260716-r1` passed selection, before/inside/after insertion, nested reorder, non-leaf reorder, absolute-in-frame movement, free placement, emitted CSS coordinates, layer synchronization, and canvas-width control with console/page errors `0`.
- VERIFY: The dedicated modern Sandbox and dedicated legacy test room both render the generated translated sheet, but they intentionally produce different class/geometry results. The upload path is no longer blocked on Chrome file-URL permission; normalized two-mode screenshot/diff evidence is still required.
- NEXT P0: Re-upload matching modern/legacy exports through the generated delegated-handler snippet, require a matching runtime mode, then recapture root width/height/scrollWidth, sampled attribute classes, screenshots, and diffs.

## 2026-07-16 Preview/Edit Underlying Paint Separation

- ROOT CAUSE: The local visual smoke mixed edit-only container outlines into the preview/edit pixel diff, and long element screenshots crossed the browser viewport boundary. The latter produced a full-width stitched band even when DOM, computed style, and visible geometry were identical.
- DONE: Split Shadow host isolation CSS (`shadow-host-reset`) from edit-only manipulation paint (`edit-shadow-overlay`). Edit mode still enables the overlay; the parity capture can disable only that style source without mutating imported sheet elements or user CSS.
- DONE: Hardened `smoke:preview-edit-visual` with font/image readiness, stable text/geometry polling, full-sheet viewport expansion, separate edit-overlay evidence, DOM signature checks, sampled computed-style comparison, all-visible-element geometry comparison, and exact pixel/ppm/max-channel reporting.
- VERIFIED: Ignored local run `.tmp/preview-edit-visual-20260716-r14` passed all 3 prepared fixtures. Two were byte-threshold exact (`0` mismatched pixels); one retained `14` background-image resampling pixels across `1,666,050` pixels (`8.4 ppm`, max channel delta `12`) and passed the explicit `RASTER_TOLERANCE` limit (`10 ppm`, max channel `16`). All 3 had computed-style differences `0`, geometry differences `0`, matching DOM/text signatures, visible runtime nodes `0`, resource issues `0`, console errors `0`, and page errors `0`.
- VERIFIED: Synthetic `smoke:edit-flow` passed at ignored local `.tmp/edit-flow-overlay-split-20260716-r2`; persistent container affordances, selection, before/inside/after indicators, flow nesting, absolute-in-frame movement, free placement, emitted CSS coordinates, and the separate style-source contract all pass after the split.
- VERIFIED: Final `corepack pnpm run ci:verify`, `corepack pnpm run lint`, `corepack pnpm run build`, and `git diff --check` passed. The lone typeless TypeScript test warning was removed by aligning that script with the repository's existing `node --no-warnings` test convention.
- VERIFY: This proves local underlying preview/edit equivalence within the recorded exact/raster limits only for the 3 prepared ignored fixtures. The app still has iframe and Shadow mounting paths, so the stronger single-live-render-surface architecture and actual Roll20 Sandbox modern/legacy parity remain P0.
- NEXT P0: Reuse this strict local gate while moving toward one canonical render surface, then compare the same generated payload in Roll20 Custom Sheet Sandbox with user-owned/relinked assets. Keep the global ChatPane renderer patch on HOLD.

## 2026-07-15 Render Unification Product Boundary Note

- TODO: Continue renderer unification against actual Roll20 evidence, not against a bundled sample sheet.
- RULE: Do not add real Roll20/commissioned/official sheet files, screenshots, generated fixtures, or reference images to the app or public repo. Use ignored local fixtures/reports only.
- RULE: Users may import their own HTML/CSS/translation/assets, and that import/export path must remain the supported workflow.
- RULE: Support modern and legacy Roll20 modes separately; legacy mode must be a real selectable behavior, not a renamed prefixing path.
- RULE: Mapping must stay universal for custom sheets, official-style sheets, translation/i18n files, assets, and future worker JS block/layer support. Do not hard-code fixture-C, CoC, fixture-A, or one official family as product logic.
- CURRENT: Renderer parity is still unproven. The current highest-value renderer work is template-scoped source/intrinsic modeling plus asset relink-safe Roll20 comparison.

## 2026-07-15 CI/CD and Roll20 Research TODO Note

- DONE: Added `ci:verify` as the shared lightweight CI safety suite for local, PR/dev CI, and production Pages deploy.
- DONE: Updated CI to run safety/unit verification, lint, and build on `main`, `dev`, and PRs.
- DONE: Updated GitHub Pages deploy to repeat safety/unit verification and lint before static export/upload.
- DONE: Confirmed `gh` is authenticated for `Song991123/roll20-block-editor`, so future pushed branches can be checked with GitHub Actions/Pages status commands.
- VERIFIED: Local `corepack pnpm run ci:verify` passed.
- CURRENT: GitHub Pages remains the right current host because the app is statically exported. A separate public dev URL is still TODO and should use Vercel/Netlify, a second Pages repo, or a controlled same-site `/dev/` artifact only after a hosting strategy is chosen.
- RESEARCH TODO: Keep collecting Roll20 technical references from official docs/wiki, the official `roll20-character-sheets` GitHub repo, and dated forum threads. Treat forum posts as hypotheses until verified in Sandbox/CDP.
- RESEARCH NOTE: Initial external sources indicate legacy sanitization must be tested as a real option, and Roll20 rolltemplates may still behave differently from the newer iframe sheet sanitizer. Fold this into the render-unification checklist before promoting rolltemplate CSS.

## 2026-07-15 Multi-Agent Optimization and Security TODO Note

- DONE: Added external reference inventory at `docs/research/40_roll20_render_reference_inventory.md`.
- DONE: Added multi-agent branch/server/CI/prompt/optimization/security plan at `docs/operations/38_multi_agent_render_plan.md`.
- DONE: Added shared Codex skill source at `agent/skills/roll20-render-ops` and installed the same skill locally for this Windows session.
- VERIFY: On MacBook, copy or symlink `agent/skills/roll20-render-ops` into `~/.codex/skills/roll20-render-ops` before using `$roll20-render-ops`.
- TODO: Run the next real render batch on a dedicated render branch: source/intrinsic model, asset-safe local preview/edit/export, then Roll20 Sandbox/test-room comparison.
- TODO: Run the next edit UX batch on a dedicated edit branch: drag latency smoke, flow-aware insertion polish, and layer visualization.
- TODO: Expand security checks for untrusted worker JS and private evidence leakage before worker block coding is implemented.
- TODO: Add measurable performance budgets for import wall time, drag frame time, drop commit latency, and route bundle size.

## 2026-07-13 Edit Canvas Edge Drop Target TODO Note

- DONE: Updated edit-canvas widget drop targeting so containers distinguish top edge `before`, middle `inside`, and bottom edge `after` instead of treating the whole container as inside-only.
- VERIFIED: `corepack pnpm run lint`, `corepack pnpm run build`, and `corepack pnpm run smoke:edit-flow -- --out-dir ./out --base-path /roll20-block-editor --report-dir ..\_tmp_codex_smoke\edit-flow-canvas-edge-drop-20260713-r1 --port 4338` passed.
- VERIFIED: The smoke confirmed real DragEvent behavior for flow nesting, canvas sibling insertion indicators, layer before/inside/after modes, absolute-in-frame movement, and free-placement widget drop.
- VERIFIED: `corepack pnpm run check:server-hygiene` passed after smoke; no project dev/smoke listener remained.
- CURRENT: This improves one Figma-like editing affordance. It does not finish full drag-to-restructure UX, multi-select/grouping, or Roll20 visual parity.
- NEXT P1: Add clearer visual differentiation between candidate containers and exact before/inside/after drop positions on the canvas and layer panel.

## 2026-07-13 Risky Roll20 Asset Replacement URL TODO Note

- DONE: Tightened export asset replacement readiness so only explicit `http(s)` targets count as Roll20-ready; protocol-relative and data/local targets stay local-only.
- DONE: Added a separate risky-target count for Roll20 proxy URLs and non-direct Imgur page URLs, because they can resolve to placeholder/removed assets in actual Roll20 even when they look like web URLs.
- DONE: Surfaced the risky-target count in the Export dialog status/readiness UI with `data-risky-roll20-targets`, so browser smoke and future MCP checks can prove whether the UI is warning correctly.
- DONE: Synced the script-side asset replacement helper and `plan:roll20-asset-relink`; risky Roll20 proxy/Imgur-page targets now report `COVERED_RISKY_ROLL20_URL` instead of `COVERED_ROLL20_READY`.
- VERIFIED: `node --check scripts\export_dialog_browser_smoke.mjs`, `corepack pnpm run test:asset-replacements`, `corepack pnpm run guard:ui-copy`, `corepack pnpm run lint`, `corepack pnpm run build`, and `corepack pnpm run smoke:export-dialog -- --out-dir ./out --base-path /roll20-block-editor --report-dir ..\_tmp_codex_smoke\export-dialog-risky-relink-20260713-r1 --port 4337` passed.
- VERIFIED: `node --check scripts\roll20_asset_relink_verification_plan.mjs` and `corepack pnpm run test:roll20-asset-relink` passed after adding risky coverage.
- VERIFIED: `corepack pnpm run check:server-hygiene` passed after browser smoke; no project dev/smoke listener remained and CDP `9222` was preserved.
- CURRENT: This prevents false confidence in asset relink maps. It does not relink fixture-A/fixture-C assets, does not prove Roll20 visual parity, and does not unblock ChatPane renderer CSS.
- NEXT P0: Fill the ignored relink template with user-owned direct HTTPS asset URLs, rerun local preupload/Sandbox evidence, then rerun browser-paint routing.

## 2026-07-13 Chat Background Paint Relink Blocker TODO Note

- DONE: Reran current row/paint/source, background-source, background-raster, background-asset, asset-preservation, and browser-paint routing into ignored temp evidence under `..\_tmp_codex_smoke\chat-*-current-20260713-r1`.
- DONE: Added override inputs to `plan:roll20-chat-browser-paint` (`--asset-probe-dir`, `--asset-plan-dir`, `--background-raster-dir`, `--background-source-dir`, `--row-compositing-dir`) so candidate/temp evidence can flow into the browser-paint decision instead of silently reading stale canonical folders.
- VERIFIED: `diagnose:roll20-chat-row-paint-source` still classifies fixture-C as `SANITIZE_REPLAY_REJECTED_SOURCE_MODEL_REQUIRED`.
- VERIFIED: `diagnose:roll20-chat-background-source` classifies fixture-A, fixture-B, and fixture-C as `BACKGROUND_DECLARATION_MATCHES_BUT_RASTER_DIFFERS`; for fixture-C, `coc-background-size-actual` is already `reject-row-raster-regression`.
- VERIFIED: `diagnose:roll20-chat-background-raster` classifies fixture-A and fixture-C as `FLAT_PAINT_SOURCE_OR_BROWSER_COLOR_MODEL_REQUIRED`, with fixture-C row mismatch `21.41%` and weak luma gain `+0.57%`.
- VERIFIED: `diagnose:roll20-chat-background-assets` reports fixture-A/fixture-C local and actual proxy bytes match, but both resolve to the same tiny source placeholder (`200 image/png 503b png 161x81 removed.png`).
- VERIFIED: `plan:roll20-chat-assets` stays `HOLD_RENDERER_FOR_ASSET_POLICY` with `4` blockers, and `plan:roll20-chat-browser-paint` now returns `BROWSER_PAINT_BLOCKED_BY_RELINK` for fixture-A/fixture-C when fed the current temp evidence.
- VERIFIED: `plan:roll20-asset-relink` generated ignored template `..\_tmp_codex_smoke\asset-relink-current-20260713-r1\asset-relink-map-template.txt` and reports `RELINK_MAP_REQUIRED`, required `2`, covered Roll20-ready `0`, missing `2`.
- CURRENT: Browser-paint/decode work is blocked until affected assets are relinked to user-owned HTTP(S) URLs and the local preupload plus Roll20 Sandbox comparison are rerun. Do not chase another width/font/background-size CSS candidate before that.
- NEXT P0: Use the local-only asset replacement map flow for fixture-A/fixture-C, then rerun preupload/Sandbox screenshots and the same browser-paint plan with the relinked evidence.

## 2026-07-13 fixture-C Roll20 Fallback Stack Rejection TODO Note

- DONE: Added diagnostic-only ChatPane typography policy `fixture-c-roll20-fallback-stack` and smoke-script allow-list support. This is not a product default.
- DONE: Added style-proof handling for `fixture-c-roll20-fallback-stack` so one-off candidate reports classify it instead of reporting `UNKNOWN_CANDIDATE`.
- VERIFIED: Functional rolltemplate smoke passed 3/3 fixtures after rebuilding static `out/`, at ignored temp `..\_tmp_codex_smoke\rolltemplate-chat-smoke-fixture-c-roll20-fallback-stack-20260713-r2`.
- EVIDENCE: The candidate exactly matched the actual Roll20 fixture-C table used width (`1248.328125px`) and the Bookk-failure Korean label metrics for caption (`23.92px`) plus first td/label (`37.032px`).
- REJECTED: Style proof returned `REJECT_STYLE_CONTRADICTION`: table width matched, but only `3/7` computed font/style fields matched actual Roll20 and max text metric delta remained `9.421px`.
- REJECTED: Candidate experiment gate returned `HOLD_PRODUCTION_RENDERER_PATCH` with `risk=reject-regresses-fixtures`, `style=REJECT_STYLE_CONTRADICTION`, and `rowRaster=reject-row-raster-regression`.
- REJECTED: Candidate comparison stayed worse than baseline: mean aligned delta `+15.25%`, regressions `2`, and fixture-C aligned delta `+4.7%`; row-raster also regressed fixture-C by `+10.7` weighted mismatch and worst row by `+16.85`.
- CURRENT: This is useful negative evidence only. Matching fixture-C table width and a few Korean fallback metrics does not reproduce actual Roll20 paint/raster behavior.
- NEXT P0: Continue with the source/intrinsic route: inspect row luma/background/paint/source/crop and Roll20 sanitize/rule order instead of promoting fallback-stack CSS.

## 2026-07-13 Source/Intrinsic Candidate Audit TODO Note

- DONE: Added diagnostic-only `diagnose:roll20-chat-source-intrinsic-candidates` to audit whether current fixture-A/Les/fixture-C source-intrinsic evidence is ready for renderer CSS review.
- DONE: Wired the candidate audit into `diagnose:roll20-chat-refresh`, targeted renderer plan command routing, and the final `gate:roll20-renderer-action` blocker surface.
- VERIFIED: Candidate audit run at ignored temp `..\_tmp_codex_smoke\chat-source-intrinsic-candidate-audit-20260713-r1` returned `SOURCE_INTRINSIC_CANDIDATE_BLOCKED`, with `readyCandidates=0`.
- VERIFIED: Reproduced the same audit at ignored temp `..\_tmp_codex_smoke\chat-source-intrinsic-candidate-audit-20260713-r2`: fixture-A `ready=0`, fixture-B `ready=0`, fixture-C `ready=0`.
- VERIFIED: Renderer gate with both source-intrinsic matrix and candidate-audit overrides stayed `HOLD_PRODUCTION_RENDERER_PATCH` and now blocks on "no candidate ready for renderer CSS review".
- VERIFIED: `node --check` passed for the new/updated scripts, audit self-test passed, `git diff --check`, `guard:roll20-evidence`, `corepack pnpm run lint`, and `corepack pnpm run build` passed.
- VERIFIED: Server hygiene passed after validation; no project dev/smoke listener remained, and CDP `9222` was preserved.
- RESULT: fixture-A still needs paired evidence for message-content-width, crop-top-origin, intrinsic-width-split, row-raster nonregression, style proof, and asset policy. fixture-C still needs sanitize/rule-order, table auto-layout intrinsic sizing, crop/top-origin, row-raster nonregression, style proof, and asset policy together.
- CURRENT: This is another truthfulness guardrail, not a visual fix. Do not ship ChatPane renderer CSS from the existing partial candidates.
- NEXT P0: Build a scoped source/intrinsic model candidate that clears all required axes before another renderer CSS review.

## 2026-07-13 Source/Intrinsic Pipeline Propagation TODO Note

- DONE: Wired source/intrinsic matrix evidence into `plan:roll20-chat-renderer-targets`, `gate:roll20-chat-template-scope`, `gate:roll20-chat-candidate-experiment`, and `diagnose:roll20-chat-refresh`.
- DONE: Targeted renderer plans now accept `--source-intrinsic-dir`, auto-fallback to the latest ignored temp matrix when canonical evidence is not actionable, list `diagnose:roll20-chat-source-intrinsic` as a required command for fixture-A/fixture-C P0 routes, and add `source-intrinsic-matrix-promotion-blocker-cleared` to the renderer proof checklist.
- DONE: Template-scope gate now records source/intrinsic decision metrics per fixture and blocks scoped/global renderer promotion when fixture-A/fixture-C still require `CROP_AND_TABLE_INTRINSIC_SPLIT_REQUIRED` or `SANITIZE_INTRINSIC_CROP_MODEL_REQUIRED`.
- DONE: Candidate experiment bundle now forwards `--source-intrinsic-dir` into the final renderer action gate, so one-off candidate reports cannot bypass the source/intrinsic blocker.
- FIXED: `status:roll20-actual` no longer throws when the newest preupload run has no chat parity diagnostic; missing chat parity is now reported as missing evidence instead of a TypeError.
- VERIFIED: `node --check` passed for `roll20_chat_targeted_renderer_plan.mjs`, `roll20_chat_template_scope_gate.mjs`, `roll20_chat_diagnostic_refresh.mjs`, and `roll20_chat_candidate_experiment_gate.mjs`.
- VERIFIED: Self-tests passed for targeted renderer plan, template-scope gate, and diagnostic refresh; `status:roll20-actual` now passes both the default latest-run path and the explicit `2026-06-18-state-map-v1` baseline path.
- VERIFIED: With ignored temp matrix `..\_tmp_codex_smoke\chat-source-intrinsic-fixture-c-current-20260713-r1`, targeted plan stayed `HOLD_PRODUCTION_RENDERER_PATCH` with 21 blockers, template-scope gate stayed `HOLD_GLOBAL_CHAT_RENDERER_PATCH` with 13 blockers, and final renderer gate stayed `HOLD_PRODUCTION_RENDERER_PATCH`.
- CURRENT: This is a pipeline truthfulness/guardrail improvement only. It does not improve pixels, does not prove Roll20 visual parity, does not relink placeholder assets, and does not authorize ChatPane renderer CSS.
- NEXT P0: Build the actual template-scoped source/intrinsic renderer model: fixture-A needs crop/top-origin separated from intrinsic width; fixture-C needs Roll20 sanitize/rule order, table auto-layout intrinsic sizing, and crop/top-origin modeled together.

## 2026-07-13 Source/Intrinsic Matrix Gate TODO Note

- DONE: Added diagnostic-only `diagnose:roll20-chat-source-intrinsic` to combine source CSS, source/context, intrinsic-width, table-intrinsic, table-layout, min-content, row/cell, and crop/top-offset evidence before renderer CSS review.
- DONE: Wired `--chat-source-intrinsic-dir` into `gate:roll20-renderer-action` so ignored temp matrix reports can block production renderer CSS without copying private evidence into canonical `reports/`.
- VERIFIED: `node --check scripts\roll20_chat_source_intrinsic_matrix.mjs`, `node --check scripts\roll20_renderer_action_gate.mjs`, `node scripts\roll20_chat_source_intrinsic_matrix.mjs --self-test`, `git diff --check`, `guard:roll20-evidence`, `status:roll20-actual`, `corepack pnpm run lint`, and `corepack pnpm run build` passed.
- VERIFIED: Current matrix run at ignored temp `..\_tmp_codex_smoke\chat-source-intrinsic-fixture-c-current-20260713-r1` returned `SOURCE_INTRINSIC_MATRIX_ACTIONABLE`: fixture-A `CROP_AND_TABLE_INTRINSIC_SPLIT_REQUIRED`, fixture-B `CROP_AND_TABLE_INTRINSIC_SPLIT_REQUIRED`, and fixture-C `SANITIZE_INTRINSIC_CROP_MODEL_REQUIRED`.
- VERIFIED: Renderer gate with the matrix override stayed `HOLD_PRODUCTION_RENDERER_PATCH` and now adds a source/intrinsic blocker for fixture-A and fixture-C. This is a guardrail improvement, not Roll20 visual parity and not permission to ship ChatPane CSS.
- VERIFIED: Server hygiene passed after validation; no project dev/smoke listener remained, and CDP `9222` was preserved.
- EVIDENCE: fixture-C still has source `.sheet-rolltemplate-coc table` max-width `280px`, actual/local table auto-layout evidence, table delta `-24.531px`, row width spread `0px`, max cell delta `+0.906px`, and top offset `+52.703px`; the next model must combine sanitize/rule order, table intrinsic sizing, and crop/top-origin.
- CURRENT: Do not retry broad font fallback, direct used-width clamps, transforms, or global ChatPane CSS. Next P0 is a template-scoped source/intrinsic model that preserves fixture-A/Les nonregression and then passes row-raster, style-proof, asset, template-scope, and renderer gates.

## 2026-07-13 fixture-C CoC Table Width + Fallback Rejection TODO Note

- DONE: Tested diagnostic-only combined candidate `fixture-c-coc-table-source-context-fallback-only` using `--chat-geometry-policy coc-table-actual-width` plus `--chat-typography-policy fixture-c-bookk-fallback-only`.
- VERIFIED: Functional rolltemplate smoke passed 3/3 fixtures at ignored temp `rolltemplate-chat-smoke-fixture-c-coc-table-source-context-fallback-only-20260713-r1`.
- REJECTED: Candidate experiment gate returned `HOLD_PRODUCTION_RENDERER_PATCH`: `reject-regresses-fixtures`, mean aligned delta `+15.28%`, regressions `2`, fixture-A delta `+41.04%`, fixture-C delta `+4.81%`.
- REJECTED: Row raster rejected it as well: fixture-A weighted `+44.07%`, fixture-C weighted `+10.67%`.
- RESULT: Style proof was compatible for the fixture-C/CoC target, so the blocker is not "style proof missing"; the blocker is that forcing the observed table width still worsens the real pixel/row raster model.
- CURRENT: Do not retry `coc-table-actual-width` plus font fallback as renderer CSS. Next P0 should model Roll20's source rule order, intrinsic table sizing, and crop/top-origin behavior without hard-coding a used width.

## 2026-07-13 fixture-C Bookk Fallback-Only Rejection TODO Note

- DONE: Added diagnostic-only `diagnose:roll20-chat-font-fallback` to measure actual Roll20 Bookk failure samples against local Chromium fallback candidates.
- RESULT: For actual Roll20 Bookk-failure samples, local `Noto Sans KR` exactly matched 3/3 measured widths: caption `23.92px`, `td:first` `37.032px`, and `sheet-template_label:first` `37.032px`.
- DONE: Added diagnostic-only ChatPane typography policy `fixture-c-bookk-fallback-only`, scoped only to `.sheet-rolltemplate-coc` caption/td/template value/label font-family. It does not alter root/table font, width, transform, border-spacing, or global ChatPane CSS.
- VERIFIED: Functional rolltemplate smoke passed 3/3 fixtures at ignored temp `rolltemplate-chat-smoke-fixture-c-bookk-fallback-only-20260713-r1`.
- REJECTED: Candidate experiment gate returned `HOLD_PRODUCTION_RENDERER_PATCH`: candidate comparison `reject-regresses-fixtures`, mean `+15.75%`, regressions `2`, fixture-A delta `+41.04%`, fixture-C delta `+6.21%`.
- REJECTED: Row raster also rejected it: fixture-A weighted `+44.07%`, fixture-C weighted `+12.29%`.
- EVIDENCE: The candidate narrowed fixture-C local table width to `1236.765625px`, undershooting actual Roll20 `1248.328125px`; matching only Bookk fallback glyph width is not sufficient for the full table/crop/raster model.
- CURRENT: Do not promote or retry `fixture-c-bookk-fallback-only` as renderer CSS. Next P0 must combine font fallback evidence with table auto-layout/min-content and crop context, then pass row-raster and cross-fixture gates.

## 2026-07-13 Chat Min-Content Model TODO Note

- DONE: Added `diagnose:roll20-chat-min-content` to fuse fresh actual Roll20 sidecars with local ChatPane smoke, font/glyph, intrinsic-width, table-intrinsic, table-layout, and source-context evidence.
- DONE: Added the min-content route to `diagnose:roll20-chat-refresh`, and added `diagnose:roll20-chat-table-layout-constraint` plus `diagnose:roll20-chat-min-content` to the targeted fixture-C/CoC renderer-plan command list.
- VERIFIED: Fresh fixture-C sidecar run passed at ignored temp `chat-min-content-fixture-c-current-sidecar-20260713-r1`.
- RESULT: fixture-A is classified as `TEXT_METRIC_WIDTH_MODEL` (`tableDelta=+15.75px`, `textDelta=+15.602px`, residual `+0.148px`), so fixture-A remains a message/text-metric route.
- RESULT: fixture-C is classified as `TABLE_AUTO_LAYOUT_MIN_CONTENT_MODEL_REQUIRED` (`tableDelta=-24.531px`, `textDelta=-54.946px`, residual `+30.415px`, table/text ratio delta `+0.012x`), so text metrics alone over-explain the table delta and the next candidate must preserve table auto-layout/min-content behavior.
- CURRENT: Next P0 is to create a scoped `.sheet-rolltemplate-coc` table auto-layout/min-content candidate and run the full smoke/candidate comparison/row raster/style proof/renderer gate. Do not promote broad font, glyph substitution, transform, width clamp, or global ChatPane CSS.

## 2026-07-13 Fresh Actual Sidecar Routing TODO Note

- DONE: `diagnose:roll20-chat-font-glyph` now accepts `--actual-sidecar <fixture-id>=<json>`, matching the locked-report-safe actual Roll20 evidence flow already used by the table-layout probe.
- DONE: `diagnose:roll20-chat-source-context` now accepts `--actual-sidecar <fixture-id>=<json>`, so fresh ignored-temp Roll20 chat captures can feed rule-order/font-face/table-context checks without copying evidence into `reports/`.
- DONE: `diagnose:roll20-chat-font-intrinsic` now accepts `--font-glyph-dir`, so isolated font/glyph evidence can flow into the font/intrinsic route.
- DONE: `diagnose:roll20-chat-intrinsic-width` and `diagnose:roll20-chat-table-intrinsic-probe` now also accept `--actual-sidecar <fixture-id>=<json>`, so fresh actual Roll20 table/row/cell metrics are not stranded outside the intrinsic model.
- VERIFIED: Fresh fixture-C sidecar at ignored temp `chat-capture-fixture-c-coc-current-metrics-20260713-r2` feeds the new route. Font/glyph keeps fixture-C at `TEXT_WIDTH_LAYOUT_CONSTRAINT_MODEL_REQUIRED` with table delta `-24.531px`, text residual `+30.415px`, and changed font/table signals.
- VERIFIED: Source/context with the same sidecar reports fixture-C `SANITIZE_REPLAY_REJECTED_SOURCE_MODEL_REQUIRED`, while fixture-A/Les remain `RULE_ORDER_FONT_FACE_TABLE_CONTEXT_REQUIRED`.
- VERIFIED: Intrinsic-width with the same sidecar reports fixture-C `TABLE_SCROLL_INTRINSIC_MODEL_REQUIRED`, table delta `-24.531px`, first-cell delta `-0.906px`, and no transform contradiction.
- VERIFIED: Table-intrinsic with the same sidecar reports fixture-C `TABLE_WIDE_INTRINSIC_WITH_CROP_OFFSET`, row spread `0px`, max cell delta `+0.906px`, and top offset `+52.703px`.
- VERIFIED: Table-layout with the same sidecar reports fixture-C `TABLE_AUTO_LAYOUT_MIN_CONTENT_MODEL_REQUIRED`; actual Roll20 computes `maxWidth=280px` but the used table width is still `1248.328125px`.
- VERIFIED: Renderer gate with the fresh source/context override still returns `HOLD_PRODUCTION_RENDERER_PATCH`; no production renderer CSS is safe to promote yet.
- CURRENT: Next P0 is a scoped `.sheet-rolltemplate-coc` table auto-layout/min-content diagnostic model using actual rule order, font activation, and table intrinsic context together. Do not retry broad font/glyph substitution, simple max-width clamp, transform, or global ChatPane CSS.

## 2026-07-13 fixture-C Roll20 Actual Payload and Chat Metrics Note

- DONE: Re-applied `fixture-c-commission-1bu` to the dedicated Roll20 Sandbox/test campaign `21639681` using the generated upload helper plus the full settings save path. Existing real rooms were not modified.
- VERIFIED: Reopened sandbox character `Witrav Upijek` and `probe:roll20-sheet-frame` passed with strong iframe markers: `sheetHitCount=65`, `rootCount=3`, `attrCount=1069`, `rollButtonCount=808`.
- DONE: `plan:roll20-chat-capture` now supports `--out-dir`, and `capture:roll20-chat-cdp` now supports `--snippet <probe-snippet.js>`, so fresh chat sidecars can be generated from ignored temp snippets when canonical `reports/` output is locked.
- VERIFIED: Fresh Roll20 chat capture for `roll_str_check` passed in ignored temp output with `sheet-rolltemplate-coc`, `rolltemplateCount=6`, a paired `roll20-chat.png`, and current `rowMetrics`/computed style fields.
- EVIDENCE: Actual Roll20 CoC table computed `maxWidth=280px`, `minWidth=0px`, `display=table`, `tableLayout=auto`, but used table width was `1248.328125px`. This proves the old missing `maxWidth` field was a capture gap, and the remaining issue is table auto-layout/intrinsic sizing rather than a missing source `max-width` rule.
- RESULT: `diagnose:roll20-chat-table-layout-constraint` now classifies fixture-C as `TABLE_AUTO_LAYOUT_OVERRIDES_MAX_WIDTH_BOTH_CONTEXTS`; next renderer work should model the table auto-layout/min-content behavior directly.
- CURRENT: Do not promote global ChatPane CSS, broad font changes, transforms, or another max-width clamp. Next P0 is a scoped `.sheet-rolltemplate-coc` intrinsic table model with fixture-A/Les nonregression proof, then the same live Roll20 capture loop.

## 2026-07-13 fixture-C Korean Glyph Metric Rejection TODO Note

- DONE: Added diagnostic-only typography policy `fixture-c-korean-glyph-metrics` to test whether matching the actual Roll20 Korean glyph width can explain the fixture-C CoC table delta.
- VERIFIED: fixture-C-only smoke passed and moved the local CoC table from default `1305.578125px` to actual Roll20 `1248.328125px` exactly, while preserving source `maxWidth=280px`.
- REJECTED: Full candidate comparison rejected the policy: `risk=reject-regresses-fixtures`, mean `+15.25%`, regressions `2`, fixture-C aligned delta `+4.7%`.
- REJECTED: Row-raster comparison rejected the policy harder: fixture-A weighted `17.93% -> 62%` (`+44.07`), fixture-C weighted `21.41% -> 32.11%` (`+10.7`).
- CURRENT: Do not promote `fixture-c-korean-glyph-metrics`. It is useful negative evidence: glyph metric substitution can match table width numerically, but it breaks visual raster and cross-fixture behavior. Next useful model must preserve actual source/rendered style and row raster, not just table width.

## 2026-07-13 Strict Roll20 Sheet-Frame Match TODO Note

- DONE: `probe:roll20-sheet-frame` and `capture:roll20-chat-cdp` now support ignored temp output paths, so locked canonical Roll20 evidence folders no longer force agents to overwrite stale reports.
- DONE: `diagnose:roll20-chat-table-layout-constraint` now accepts `--actual-sidecar <fixture-id>=<json>`, allowing a fresh temp Roll20 chat sidecar to feed the table-layout probe without copying evidence into `reports/`.
- FIXED: Sheet-frame proof no longer treats a weak generic attr match such as `attr_str`/`attr_int` as `VISIBLE_MATCH`. A fixture now needs an expected roll button marker, expected visible text marker, or at least five expected attr markers before chat capture can trust it.
- VERIFIED: `corepack pnpm run test:roll20-sheet-frame-probe`, `corepack pnpm run test:roll20-chat-cdp-readiness`, and syntax checks for the three touched scripts passed.
- LIVE CHECK: Current Roll20 Witrav/fixture-C attempt is now correctly blocked as `NOT_PROVEN`: `sheetHitCount=2`, `rollButtons=0`, `attrs=2`, `text=0`, activation reason `weak marker match`.
- LIVE CHECK: A temp chat capture without clicking did succeed, but it selected `sheet-rolltemplate-classic-roll`, not fixture-C `sheet-rolltemplate-coc`; that capture is not valid evidence for the fixture-C CoC table P0.
- SUPERSEDED: The fixture-C reload/apply and CoC recapture step above has now been completed in the `2026-07-13 fixture-C Roll20 Actual Payload and Chat Metrics Note`. Continue from the intrinsic table model work, not from another plain recapture.

## 2026-07-13 Table Layout Constraint Probe TODO Note

- DONE: Added `diagnose:roll20-chat-table-layout-constraint` to separate ineffective width/min-width/max-width constraints from table auto-layout/min-content behavior.
- VERIFIED: `corepack pnpm run diagnose:roll20-chat-table-layout-constraint -- reports\roll20-actual-compare\2026-06-18-state-map-v1 ..\_tmp_codex_smoke\rolltemplate-chat-smoke-coc-table-intrinsic-clamp-20260713-r2\rolltemplate-chat-smoke-results.json --source-context-dir ..\_tmp_codex_smoke\chat-source-context-source-css-audit-20260713-r4 --intrinsic-width-dir ..\_tmp_codex_smoke\chat-intrinsic-width-coc-table-intrinsic-clamp-20260713-r3 --table-intrinsic-dir ..\_tmp_codex_smoke\chat-table-intrinsic-coc-table-intrinsic-clamp-20260713-r2 --out-dir ..\_tmp_codex_smoke\chat-table-layout-constraint-coc-clamp-20260713-r2` passed.
- RESULT: The new report is `TABLE_LAYOUT_CONSTRAINT_ACTIONABLE` with only fixture-C actionable: `ACTUAL_MAX_WIDTH_CAPTURE_GAP_BEFORE_AUTO_LAYOUT_MODEL`. fixture-A and fixture-B stay `LAYOUT_CONSTRAINT_SECONDARY` for this axis.
- EVIDENCE: fixture-C source table has `max-width:280px`, the local clamp candidate computes `maxWidth=1249px`, but local used table width still exceeds it (`1317.141px`) and scrollWidth tracks used width. Actual Roll20 sidecars predate `maxWidth/minWidth`, so actual computed max-width must be recaptured before the auto-layout model can be promoted.
- CURRENT: Next fixture-C P0 is actual Roll20 chat DOM recapture with updated `minWidth/maxWidth` fields, then a table auto-layout/min-content model. Do not retry source `max-width`, measured `max-width`, transform, spacing, or broad font CSS as production renderer patches.

## 2026-07-13 CoC Table Intrinsic Clamp Rejection TODO Note

- DONE: Reran diagnostic-only `coc-table-intrinsic-clamp` with fixture-C table font context after adding `minWidth`/`maxWidth` to local and Roll20 chat capture style sidecars.
- VERIFIED: `rolltemplate_chat_smoke` passed 3/3 fixtures at `..\_tmp_codex_smoke\rolltemplate-chat-smoke-coc-table-intrinsic-clamp-20260713-r2`.
- VERIFIED: `gate:roll20-chat-candidate-experiment` at `..\_tmp_codex_smoke\candidate-experiment-coc-table-intrinsic-clamp-20260713-r2` rejected the candidate with `HOLD_PRODUCTION_RENDERER_PATCH`, `reject-regresses-fixtures`, `REJECT_STYLE_CONTRADICTION`, and `reject-row-raster-regression`.
- EVIDENCE: fixture-C local candidate computed `maxWidth=1249px`, but the table used width and scroll width stayed about `1317px`; `diagnose:roll20-chat-table-intrinsic-probe` at `..\_tmp_codex_smoke\chat-table-intrinsic-coc-table-intrinsic-clamp-20260713-r2` records `local table used width +1317.141px exceeds computed max-width +1249px`.
- FIXED: `diagnose:roll20-chat-intrinsic-width` no longer reports missing actual `maxWidth` as fake `0px`; rerun at `..\_tmp_codex_smoke\chat-intrinsic-width-coc-table-intrinsic-clamp-20260713-r3` keeps only the verified local max-width evidence.
- CURRENT: Do not retry `coc-table-intrinsic-clamp` as production CSS. Next fixture-C P0 is a real table auto-layout/min-content model, likely around table formatting context and crop/top-origin, not another `max-width`, transform, spacing, or broad font patch.

## 2026-07-13 Source CSS Audit TODO Note

- DONE: `diagnose:roll20-chat-source-context` now reads fixture `source.css` through `--fixtures-dir` and records exact rolltemplate source declarations for root/table/caption/td targets.
- FIXED: The source CSS selector matcher now uses exact rolltemplate class boundaries, so `.sheet-rolltemplate-coc` no longer accidentally includes `.sheet-rolltemplate-coc-attack` or `.sheet-rolltemplate-coc-defence` rules.
- VERIFIED: Rerun at `..\_tmp_codex_smoke\chat-source-context-source-css-audit-20260713-r4` reports fixture-C `.sheet-rolltemplate-coc table` source declarations as `width=100%, max-width=280px, background-size=100%`.
- EVIDENCE: The same report records fixture-C caption/td source typography as BookkMyungjo-Bd (`caption font-size=13px`, `td font-size=12px`) and records `sourceMaxWidthExceeded=true`: source table `max-width: 280px` exists, but local/actual used table width still exceeds it while the active table context remains `TABLE_INTRINSIC_SOURCE_CONTEXT_REQUIRED`.
- CURRENT: Next fixture-C work should inspect Roll20 rule order/sanitize and table layout semantics around source `width:100%`/`max-width:280px`; do not promote broad table scaling or width declarations.

## 2026-07-13 fixture-C Intrinsic Constraint Classification TODO Note

- DONE: `diagnose:roll20-chat-intrinsic-width` now classifies table-wide scroll/client width deltas as `TABLE_SCROLL_INTRINSIC_CONSTRAINT` even when the active style-proof set does not include a transform-contradicted candidate.
- VERIFIED: Rerun at `..\_tmp_codex_smoke\chat-intrinsic-width-fixture-c-crop-origin-actual-font-20260713-r2` keeps fixture-C at `TABLE_SCROLL_INTRINSIC_MODEL_REQUIRED`, but the constraint model is no longer vague `CONSTRAINT_SECONDARY`.
- EVIDENCE: fixture-C constraint signals are now explicit: structure matches, row deltas are uniform, cells are small-delta, `tableScrollTracksWidth=true`, `clientTracksWidth=true`, `cssMetricCandidatesRejected=true`, table scrollWidth delta `-69px`, first cell delta `-0.188px`, actual/local table width `0.948x`.
- CURRENT: Next renderer experiment should be a direct table scroll/client intrinsic width model. Do not spend another pass on crop-origin, measured width declarations, spacing/letter replay, transform, or broad font CSS.

## 2026-07-13 fixture-C Intrinsic Width Model TODO Note

- VERIFIED: `diagnose:roll20-chat-intrinsic-width` against the rejected crop-origin actual-font smoke wrote ignored output to `..\_tmp_codex_smoke\chat-intrinsic-width-fixture-c-crop-origin-actual-font-20260713-r1`.
- RESULT: The diagnostic reports `INTRINSIC_WIDTH_MODEL_REQUIRED`.
- RESULT: fixture-C is now narrowed to `TABLE_SCROLL_INTRINSIC_MODEL_REQUIRED`: table delta `-68.813px`, first-cell delta `-0.188px`, transform contradicted `NO`.
- RESULT: fixture-A and fixture-B are classified as `CSS_METRIC_CANDIDATES_REJECTED`, so they should not be solved by the same fixture-C table-scroll model.
- CURRENT: Next fixture-C P0 is to model Roll20 table scroll/intrinsic width calculation directly. Do not retry transform, broad font CSS, simple top-origin replay, or measured width declarations as fixes.

## 2026-07-13 fixture-C Crop-Origin Source-Context Rejection TODO Note

- DONE: Added diagnostic-only chat geometry policy `coc-overflow-crop-origin-y20`, combining CoC/fixture-C overflow crop, measured table width declarations, and a `20px` table top-origin offset.
- VERIFIED: `rolltemplate_chat_smoke` for `fixture-c-coc-table-source-context-crop-origin-actual-font-r1` passed 3/3 fixtures in ignored output at `..\_tmp_codex_smoke\rolltemplate-chat-smoke-fixture-c-coc-table-source-context-crop-origin-actual-font-20260713-r1`.
- VERIFIED: The candidate only moved fixture-C root/table/caption/cell top by `+20px`; table width stayed `1317.140625px`, so measured width declarations still did not control used table width.
- VERIFIED: `gate:roll20-chat-candidate-experiment` rejected the candidate with the same signature as actual-font alone: `HOLD_PRODUCTION_RENDERER_PATCH`, `reject-regresses-fixtures`, `REJECT_STYLE_CONTRADICTION`, `reject-row-raster-regression`, mean aligned delta `16.47`, regressions `2`.
- EVIDENCE: Row raster remained worse than baseline: fixture-A weighted `17.93% -> 62%` (`+44.07`), fixture-C weighted `21.41% -> 31.55%` (`+10.14`).
- VERIFIED: `diagnose:roll20-chat-table-intrinsic-probe` still reports fixture-C `TABLE_WIDE_INTRINSIC_WITH_CROP_OFFSET`: root `-3px`, table `-68.813px`, row spread `0px`, max cell `+0.906px`, top offset `+52.703px`.
- CURRENT: Do not promote `coc-overflow-crop-origin-y20` or the `fixture-c-coc-table-source-context-crop-origin-actual-font-r1` candidate. Simple top-origin/crop replay is now negative evidence. Next P0 should inspect the table intrinsic/max-content calculation itself.

## 2026-07-13 fixture-C Actual-Font Source-Context Rejection TODO Note

- DONE: `diagnose:roll20-chat-candidate-style` now routes `fixture-c-coc-table-source-context*actual-font*` through the actual Roll20 fixture-C table font-context proof instead of the older missing-Bookk proof.
- VERIFIED: `rolltemplate_chat_smoke` for `fixture-c-coc-table-source-context-actual-font-r1` passed 3/3 fixtures in ignored output at `..\_tmp_codex_smoke\rolltemplate-chat-smoke-fixture-c-coc-table-source-context-actual-font-20260713-r1`.
- VERIFIED: `gate:roll20-chat-candidate-experiment` rejected that candidate with `HOLD_PRODUCTION_RENDERER_PATCH`, risk `reject-regresses-fixtures`, style `REJECT_STYLE_CONTRADICTION`, row raster `reject-row-raster-regression`, mean aligned delta `16.47`, and regressions `2`.
- EVIDENCE: fixture-C style proof says font/source now matches, but table width still contradicts actual Roll20: local `1317.140625px` vs actual `1248.328125px`.
- EVIDENCE: Row raster regressed from baseline: fixture-A weighted `17.93% -> 62%` (`+44.07`), fixture-C weighted `21.41% -> 31.55%` (`+10.14`).
- VERIFIED: `diagnose:roll20-chat-table-intrinsic-probe` on the same candidate still classifies fixture-C as `TABLE_WIDE_INTRINSIC_WITH_CROP_OFFSET`: root `-3px`, table `-68.813px`, row spread `0px`, max cell `+0.906px`, top offset `+52.703px`.
- CURRENT: Do not promote `fixture-c-coc-table-source-context-actual-font-r1`. Next P0 is a table intrinsic width plus rolltemplate crop/top-origin probe; keep broad width, transform, global font, and spacing patches out of production renderer defaults.

## 2026-07-13 fixture-C Table Intrinsic Probe TODO Note

- DONE: `diagnose:roll20-chat-table-intrinsic-probe` now accepts `[local-smoke-json]` plus `--out-dir`, so fixture-C/CoC candidate smokes can be checked in ignored temp output without rewriting canonical actual-run reports.
- DONE: `diagnose:roll20-chat-font-intrinsic` now accepts `--out-dir` for the same locked-report-safe diagnostic workflow.
- FIXED: The table intrinsic probe no longer treats a tiny root width delta as a root/message blocker when the table delta is much larger. This avoids misrouting fixture-C: root delta `-3px` vs table delta `-68.813px`.
- VERIFIED: Temp fixture-C source-context probe at `..\_tmp_codex_smoke\chat-table-intrinsic-fixture-c-source-context-20260713-r2` reports `TABLE_WIDE_INTRINSIC_WITH_CROP_OFFSET` for `fixture-c-commission-1bu`.
- VERIFIED: Temp font/intrinsic probe at `..\_tmp_codex_smoke\chat-font-intrinsic-current-20260713-r1` reports fixture-C as `FONT_CONTEXT_BEFORE_WIDTH_CSS`, with width override candidates `NO_GAIN`.
- CURRENT: Do not promote CoC/fixture-C width, transform, global font, spacing, or broad ChatPane CSS. Next P0 candidate must model CoC/fixture-C table-wide intrinsic width together with rolltemplate crop/top-origin and font-face activation/order proof.

## 2026-07-13 Dynamic Chat Candidate Source-Context TODO Note

- DONE: `diagnose:roll20-chat-candidates` and `diagnose:roll20-chat-row-raster-candidates` can now include dynamic candidate names when matching smoke/screenshot overrides are supplied.
- DONE: `diagnose:roll20-chat-candidate-style` now has explicit style-proof handling for the `fixture-c-coc-table-source-context*` diagnostic family, combining CoC/fixture-C table width proof with fixture-C font/source-context proof.
- DONE: Moved the `coc-table-actual-width` diagnostic width rule into the post-user-CSS diagnostic override layer as well, so this diagnostic path is not silently weaker than source rolltemplate CSS.
- VERIFIED: `rolltemplate_chat_smoke` for `fixture-c-coc-table-source-context-r2` passed 3/3 fixtures using `--chat-geometry-policy coc-table-actual-width` and `--chat-typography-policy fixture-c-missing-bookk-table-font-context`.
- VERIFIED: The candidate experiment gate still returned `HOLD_PRODUCTION_RENDERER_PATCH`, with candidate risk `reject-regresses-fixtures`, style proof `REJECT_STYLE_CONTRADICTION`, and row-raster risk `reject-row-raster-regression`.
- EVIDENCE: The new style proof narrowed the fixture-C/CoC failure: font/source context matched, but table width stayed wrong (`localCandidate=1317.140625`, actual Roll20 `1248.328125`). This means a simple table `width` override is not enough; the next useful probe must target table intrinsic/min-content/layout constraints.
- CURRENT: Do not promote `fixture-c-coc-table-source-context-r1/r2`. Continue with a CoC/fixture-C table intrinsic constraint probe, not broad font, transform, or global ChatPane CSS.

## 2026-07-13 Chat Candidate Experiment Bundle TODO Note

- DONE: Added `gate:roll20-chat-candidate-experiment` to bundle one already-generated ChatPane candidate through candidate comparison, row-raster comparison, style proof, table-width budget, and the final renderer action gate.
- DONE: `diagnose:roll20-chat-candidates` and `diagnose:roll20-chat-row-raster-candidates` now accept `--include-candidates`, so isolated experiments run only the default baseline plus named candidates instead of recalculating every historical candidate.
- VERIFIED: `gate:roll20-chat-candidate-experiment` with `fixture-a-message-cell-font-context` completed in isolated temp output at `..\_tmp_codex_smoke\candidate-experiment-fixture-a-cell-font-20260713-r2`.
- VERIFIED: The bundle returned `HOLD_PRODUCTION_RENDERER_PATCH`, candidate risk `reject-regresses-fixtures`, style proof `REJECT_STYLE_CONTRADICTION`, row-raster risk `reject-row-raster-regression`, and table budget `TABLE_WIDTH_BUDGET_ACTIONABLE`.
- CURRENT: Candidate experiment evidence is now reproducible through the top renderer gate without starting a browser/dev server or rewriting canonical reports. This does not change product renderer CSS, relink assets, upload to Roll20, or prove visual parity.

## 2026-07-13 Renderer Gate Candidate Override TODO Note

- DONE: `gate:roll20-renderer-action` now accepts `--chat-candidate-comparison-dir`, `--chat-candidate-style-proof-dir`, and `--chat-row-raster-candidates-dir`.
- VERIFIED: Renderer gate with fixture-A cell-context temp candidate reports records all three overrides and still returns `HOLD_PRODUCTION_RENDERER_PATCH`.
- VERIFIED: The final gate now surfaces temp-only candidate evidence directly: `fixture-a-message-cell-font-context` and `fixture-a-message-cell-wrap-context` are both rejected by candidate comparison, style proof, and row-raster comparison.
- VERIFIED: The same gate lists both fixture-A cell-context candidates in the production exclusion notes, with row-raster deltas around `+44%` for fixture-A and `+8.68%` for fixture-C.
- CURRENT: Candidate experiment evidence can now flow from ignored temp reports into the final renderer gate without rewriting canonical reports. This does not change product renderer CSS, relink assets, upload to Roll20, or prove visual parity.

## 2026-07-13 Renderer Gate Table-Budget Override TODO Note

- DONE: `gate:roll20-renderer-action` now accepts `--chat-table-budget-dir`, so ignored temp table-budget evidence can reach the final renderer action gate.
- VERIFIED: Renderer gate with `--chat-table-budget-dir ..\_tmp_codex_smoke\chat-table-width-budget-targeted-override-20260713-r1` records `reportOverrides.chatTableWidthBudget` and still returns `HOLD_PRODUCTION_RENDERER_PATCH`.
- VERIFIED: The final gate surfaces the temp budget decisions: fixture-A `MESSAGE_CONTENT_WIDTH_BUDGET`, Les `NARROW_WIDTH_MODEL_REQUIRED`, fixture-C `TEXT_LAYOUT_CONSTRAINT_BUDGET`.
- CURRENT: This completes the table-budget evidence route from diagnostic output -> targeted plan -> renderer action gate. It does not change product renderer CSS, relink assets, upload to Roll20, or prove visual parity.

## 2026-07-13 Table Budget Override Routing TODO Note

- DONE: `diagnose:roll20-chat-table-width-budget` now accepts `--out-dir`, so agents can write ignored temp budget evidence without rewriting canonical actual-run reports.
- DONE: `plan:roll20-chat-renderer-targets` now accepts `--table-budget-dir` and reads the current table-budget schema (`budgetDecision`, `tableWidthDelta`) from that override.
- VERIFIED: Temp budget output at `..\_tmp_codex_smoke\chat-table-width-budget-targeted-override-20260713-r1` reports fixture-A `MESSAGE_CONTENT_WIDTH_BUDGET` (`+15.75px` table delta, `+0.148px` residual), Les `NARROW_WIDTH_MODEL_REQUIRED`, and fixture-C `TEXT_LAYOUT_CONSTRAINT_BUDGET` (`-24.531px` table delta).
- VERIFIED: Targeted renderer plan with the table-budget override records `reportOverrides.tableBudget`, returns `HOLD_PRODUCTION_RENDERER_PATCH`, and preserves the split fixture-A/fixture-C strategies.
- CURRENT: This improves P0 evidence routing for the next renderer experiments. It does not change product renderer CSS, relink assets, upload to Roll20, or prove visual parity.

## 2026-07-13 fixture-A Cell Context Targeted-Plan Routing TODO Note

- DONE: `plan:roll20-chat-renderer-targets` now carries `fixture-a-message-cell-font-context` and `fixture-a-message-cell-wrap-context` in fixture-A tried-candidate evidence.
- VERIFIED: Targeted renderer plan with the isolated cell-context candidate comparison now reports both as already tried and not promotable: `fixture-a-message-cell-font-context` delta `+41.29%`, `fixture-a-message-cell-wrap-context` delta `+41.27%`.
- VERIFIED: The same plan still returns `HOLD_PRODUCTION_RENDERER_PATCH` and increases blockers from `20` to `22`, which is expected because these are additional rejected paths, not renderer fixes.
- CURRENT: Future renderer work should start from the table-width budget/source-context path, not from fixture-A `27.3px` cell-context replay. No visual parity claim.

## 2026-07-13 fixture-A Cell Context Axis Rejection TODO Note

- DONE: Split the fixture-A source-context hypothesis into two narrower smoke candidates: `fixture-a-message-cell-font-context` and `fixture-a-message-cell-wrap-context`.
- VERIFIED: Both narrow candidates passed 3/3 functional rolltemplate smoke, so the rejection is visual/style evidence, not a click/runtime failure.
- VERIFIED: Candidate comparison rejected both: `risk=reject-regresses-fixtures`, mean `16.3%`, regressions `2`, fixture-A aligned mismatch about `59.3%`, fixture-C delta `+7.62%`.
- VERIFIED: Row-raster comparison rejected both: fixture-A weighted about `62.1%` (`+44.17` / `+44.15`), worst about `65.7%` (`+39.48` / `+39.42`), fixture-C weighted `30.09%` (`+8.68`).
- VERIFIED: Style proof rejected both with `REJECT_STYLE_CONTRADICTION`: local fixture-A table width `547.921875px` vs actual Roll20 `359.53125px`, and row text-cell widths roughly doubled.
- CURRENT: Do not promote fixture-A `27.3px` cell font/context or wrap-context candidates. The next useful P0 is a table intrinsic/source-model probe that explains why actual Roll20 keeps the fixture-A table around `359.5px` while local context expands to `547.9px`.

## 2026-07-13 fixture-A Source-Context Candidate Rejection TODO Note

- DONE: Added `fixture-a-message-source-context` as a diagnostic-only candidate route for candidate comparison, row-raster comparison, style proof, and targeted renderer planning.
- DONE: `plan:roll20-chat-renderer-targets` now accepts `--candidate-comparison-dir` so isolated temp candidate evidence can be included without rewriting canonical reports.
- VERIFIED: Syntax checks for the four touched renderer-diagnostic scripts passed.
- VERIFIED: `rolltemplate_chat_smoke` for `fixture-a-message-source-context` passed 3/3 functional rolltemplate smoke.
- VERIFIED: Candidate comparison rejected it: mean `16.55%`, regressions `2`, fixture-A delta `+42.03%`, fixture-C delta `+7.62%`.
- VERIFIED: Row-raster comparison rejected it: fixture-A weighted `62.71%` (`+44.78`), worst `66.48%` (`+40.2`); fixture-C weighted `30.09%` (`+8.68`), worst `42.36%` (`+14.63`).
- VERIFIED: Style proof rejected it with `REJECT_STYLE_CONTRADICTION`; fixture-A chat/message width matched, but table/text-cell widths contradicted actual Roll20 evidence.
- VERIFIED: Targeted renderer plan with `--candidate-comparison-dir` surfaced the rejected candidate as a blocker and still returned `HOLD_PRODUCTION_RENDERER_PATCH`.
- CURRENT: This prevents a tempting fixture-A source-context replay from becoming production renderer CSS. Next P0 remains asset relink plus a narrower exact text metric/table intrinsic model. No visual parity claim.

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
- VERIFIED: `corepack pnpm run test:roll20-chat-renderer-targets` passed with self-test assertions for fixture-A `RULE_ORDER_FONT_FACE_TABLE_CONTEXT_REQUIRED` and fixture-C `SANITIZE_REPLAY_REJECTED_SOURCE_MODEL_REQUIRED`.
- VERIFIED: `corepack pnpm run plan:roll20-chat-renderer-targets -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --out-dir ..\_tmp_codex_smoke\chat-targeted-renderer-plan-source-context-20260713-r1` recorded `reportOverrides.sourceContext=..\_tmp_codex_smoke\chat-source-context-autofallback-20260713-r2`, returned `HOLD_PRODUCTION_RENDERER_PATCH`, and listed source-context blockers for fixture-A and fixture-C.
- VERIFIED: Feeding that targeted plan into `gate:roll20-chat-template-scope` still returned `HOLD_GLOBAL_CHAT_RENDERER_PATCH`; feeding the template-scope report into `gate:roll20-renderer-action` still returned `HOLD_PRODUCTION_RENDERER_PATCH`.
- CURRENT: This improves plan truthfulness and prevents unsafe renderer-review drift. It does not change product renderer CSS, relink missing assets, upload to Roll20, or prove visual parity.

## 2026-07-13 Chat Source Context Row/Paint Auto Fallback TODO Note

- DONE: `diagnose:roll20-chat-source-context` now auto-selects the newest same-run ignored temp `row-paint-source*` report when the canonical row/paint/source report has weaker sanitize-replay evidence and no explicit `--row-paint-source-dir` was supplied.
- DONE: The fallback requires the candidate report `runDir` to resolve to the active Roll20 actual run, and explicit CLI overrides still win.
- VERIFIED: `corepack pnpm run diagnose:roll20-chat-source-context -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --out-dir ..\_tmp_codex_smoke\chat-source-context-autofallback-20260713-r2` recorded `reportOverrides.rowPaintSourceDir=..\_tmp_codex_smoke\row-paint-source-sanitize-replay-20260713-r1`.
- VERIFIED: The refreshed source-context report stays `SOURCE_CONTEXT_ACTIONABLE`: fixture-A and fixture-B are `RULE_ORDER_FONT_FACE_TABLE_CONTEXT_REQUIRED`, and fixture-C is `SANITIZE_REPLAY_REJECTED_SOURCE_MODEL_REQUIRED` with row/paint/source prior decision `SANITIZE_REPLAY_REJECTED_SOURCE_MODEL_REQUIRED` and sanitize replay delta `+14.95%`.
- VERIFIED: `gate:roll20-chat-template-scope` with the refreshed source-context report still returns `HOLD_GLOBAL_CHAT_RENDERER_PATCH`, and `gate:roll20-renderer-action` with the refreshed source-context/template-scope reports still returns `HOLD_PRODUCTION_RENDERER_PATCH`.
- CURRENT: This is evidence freshness and false-promotion prevention only. It does not change product renderer CSS, relink fixture-A/fixture-C assets, upload to Roll20, or prove visual parity.

## 2026-07-13 Template Scope Source-Context Auto Fallback TODO Note

- DONE: `gate:roll20-chat-template-scope` now auto-uses the newest same-run ignored temp `chat-cell-allocation-probe-*` and `chat-source-context-*` reports when canonical report folders are missing and no explicit override was supplied.
- DONE: `gate:roll20-renderer-action` now auto-uses the newest same-run ignored temp `chat-template-scope-*` report when the canonical template-scope report lacks source-context evidence.
- VERIFIED: `gate:roll20-chat-template-scope` without manual `--source-context-dir` now records source-context overrides and reports fixture-A as `RULE_ORDER_FONT_FACE_TABLE_CONTEXT_REQUIRED` and fixture-C as `SANITIZE_REPLAY_REJECTED_SOURCE_MODEL_REQUIRED` instead of collapsing to `MISSING_SOURCE_CONTEXT`.
- VERIFIED: `gate:roll20-renderer-action` without manual `--chat-template-scope-dir` now records the autosource template-scope override and surfaces the same source-context blockers in the top renderer hold output.
- CURRENT: Renderer remains `HOLD_PRODUCTION_RENDERER_PATCH`. This improves gate freshness/truthfulness only; assets, scoped renderer CSS, Roll20 upload, and visual parity remain open.

## 2026-07-13 Chat Renderer Proof Checklist TODO Note

- DONE: `plan:roll20-chat-renderer-targets` now emits a per-fixture `requiredProofChecklist` so fixture-A, fixture-C/CoC, and unknown narrow-model work cannot be reviewed from strategy names alone.
- DONE: `gate:roll20-chat-template-scope` now propagates the targeted checklist, or derives the same checklist from the required model when an older targeted-plan report is used.
- DONE: Markdown reports now show `Proof checklist`, including fixture-A requirements for `.sheet-rolltemplate-aw` style proof, message/content width sidecar, exact text metrics, and Les/fixture-C nonregression; fixture-C/CoC requirements for `.sheet-rolltemplate-coc` style proof, table intrinsic sidecar, font-face/rule-order/sanitize source context, and fixture-A/Les nonregression.
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
- OBSERVED: fixture-A, fixture-B, synthetic-nonleaf-flow, and fixture-C all report `interaction=PASS`. The moved imported block timelines all report `numericSampleCount=4`, `leftDrift=0`, `topDrift=0`, and first/final sampled coordinates equal the emitted coordinate. fixture-A/fixture-B/fixture-C still report resource WARN/failure and non-leaf subtree pixel visual false, so this is edit interaction/sync proof only.
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
- CURRENT: This prevents a false "relinked" state from draft maps. fixture-A/fixture-C still need real user-owned HTTP(S) replacement URLs and Roll20 Sandbox/test-room re-comparison before asset or renderer parity can be claimed.

## 2026-07-13 Edit Layer Mini Map TODO Note

- DONE: Added a compact visual mini-map to each edit layer row so users can scan frame/flow/table-like containers, child density, selected state, and whether the row can receive dropped children without reading DOM-only text.
- DONE: Extended `smoke:edit-flow` so layer drop verification now asserts the mini-map exists on a droppable frame row and exposes role, drop mode, can-drop, and child-count metadata.
- VERIFIED: `node --check scripts\edit_flow_browser_smoke.mjs`, `corepack pnpm run test:layer-roles`, `corepack pnpm run lint`, `corepack pnpm run build`, and `corepack pnpm run smoke:edit-flow -- --out-dir ./out --base-path /roll20-block-editor --report-dir ..\_tmp_codex_smoke\edit-flow-layer-minimap-20260713-r1 --port 4382` passed.
- CURRENT: This improves edit-mode layer readability only. It does not change Roll20 renderer CSS, does not relink fixture-A/fixture-C assets, and does not prove actual Roll20 visual parity.

## 2026-07-13 Export Asset Relink Draft TODO Note

- DONE: Shared the asset replacement draft builder between import and export flows. The export dialog can now generate a commented `old URL => <paste-user-owned-https-url-here>` draft from the current exported HTML/CSS asset refs, not only from the import dialog.
- DONE: `smoke:export-dialog` now verifies the export draft button, an enabled draft path for an exported asset URL, source URL preservation in the commented map, export-source labeling, and the existing preview/edit/export replacement persistence path.
- DONE: Hardened the export dialog smoke screenshot calls with a short retry so transient Chromium `Page.captureScreenshot` protocol errors do not mask real UI checks.
- VERIFIED: `node --check scripts\export_dialog_browser_smoke.mjs`, `corepack pnpm run test:asset-refs`, `corepack pnpm run test:asset-replacements`, `corepack pnpm run lint`, `corepack pnpm run build`, and `corepack pnpm run smoke:export-dialog -- --out-dir ./out --base-path /roll20-block-editor --report-dir ..\_tmp_codex_smoke\export-dialog-asset-draft-20260713-r3 --port 4381` passed.
- CURRENT: This removes one user-facing relink friction point. fixture-A/fixture-C still need real user-owned HTTP(S) replacement URLs, followed by local preview/edit/export rerun and Roll20 Sandbox/test-room re-comparison before renderer CSS can be promoted or visual parity can be claimed.

## 2026-07-13 Roll20 Sandbox Font Proxy Candidate TODO Note

- DONE: Added a diagnostic-only `roll20-sandbox-font-proxy` ChatPane font policy. It suppresses document-level user font registration and rewrites rolltemplate font URLs through the Roll20 image-proxy approximation so the font-url/sandbox hypothesis can be measured instead of guessed.
- DONE: Wired the candidate into `rolltemplate_chat_smoke`, `diagnose:roll20-chat-candidates`, `diagnose:roll20-chat-row-raster-candidates`, and `diagnose:roll20-chat-candidate-style` candidate lookup paths.
- VERIFIED: `node --check scripts\rolltemplate_chat_smoke.mjs`, `node --check scripts\roll20_chat_candidate_compare.mjs`, `node --check scripts\roll20_chat_candidate_style_proof.mjs`, `corepack pnpm run build`, and `node scripts\rolltemplate_chat_smoke.mjs --out-dir .\out --base-path /roll20-block-editor --fixtures test-fixtures\visual --report-dir ..\_tmp_codex_smoke\rolltemplate-chat-smoke-roll20-sandbox-font-proxy-20260713-r1 --chat-font-policy roll20-sandbox-font-proxy --port 4371` passed.
- OBSERVED: Candidate comparison rejected `roll20-sandbox-font-proxy`: mean aligned delta `+16.22%`, regressions `2`, fixture-A delta `+41.04%`, fixture-C delta `+7.62%` (`20.68%` to `28.30%` aligned mismatch).
- OBSERVED: Row-raster comparison also rejected it: fixture-A weighted row delta `+44.07%`, fixture-C weighted row delta `+8.68%`, `rowRasterRisk=reject-row-raster-regression`.
- CURRENT: Do not promote this candidate. Font URL proxying plus user-font suppression is not the missing Roll20 parity model by itself; next P0 remains exact Roll20 rule order, template shell typography, table intrinsic context, asset/paint context, and scoped model proof before renderer CSS.

## 2026-07-13 Template Scope Source Context Gate TODO Note

- DONE: `gate:roll20-chat-template-scope` now accepts `--source-context-dir` and consumes `chat-source-context-probe-results.json` before a scoped renderer candidate can be reviewed.
- DONE: P0 template-scope promotion is now explicitly blocked when source/context evidence still says `RULE_ORDER_FONT_FACE_TABLE_CONTEXT_REQUIRED`, `SANITIZE_REPLAY_REJECTED_SOURCE_MODEL_REQUIRED`, `FONT_FACE_ACTIVATION_REQUIRED`, or `TABLE_INTRINSIC_SOURCE_CONTEXT_REQUIRED`.
- VERIFIED: `node --check scripts\roll20_chat_template_scope_gate.mjs`, `corepack pnpm run test:roll20-chat-template-scope`, and `corepack pnpm run gate:roll20-chat-template-scope -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --source-context-dir ..\_tmp_codex_smoke\chat-source-context-20260713-r2 --cell-allocation-dir ..\_tmp_codex_smoke\chat-cell-allocation-probe-2026-06-18-state-map-v1-1783904920839 --out-dir ..\_tmp_codex_smoke\chat-template-scope-source-context-20260713-r2` passed.
- OBSERVED: The scoped gate still returns `HOLD_GLOBAL_CHAT_RENDERER_PATCH`, now with `11` blockers. fixture-A remains blocked by source/context `RULE_ORDER_FONT_FACE_TABLE_CONTEXT_REQUIRED`, row-raster regression, asset relink, and no style proof; fixture-C remains blocked by `SANITIZE_REPLAY_REJECTED_SOURCE_MODEL_REQUIRED`, asset relink, and rejected candidates.
- CURRENT: No production renderer CSS is enabled. Next P0 is a scoped source model that proves Roll20 rule order, font-face activation, and table intrinsic context before any ChatPane renderer promotion.

## 2026-07-13 Chat Source Context Probe TODO Note

- DONE: Added `diagnose:roll20-chat-source-context` to fuse actual Roll20 chat CSS activation, font-face checks, computed table styles, text-measurement samples, width reconciliation, intrinsic-width, and row/paint/source evidence before any renderer CSS change.
- DONE: `gate:roll20-renderer-action` now accepts `--chat-source-context-dir` and includes source-context decisions in the renderer hold report.
- VERIFIED: `node --check scripts\roll20_chat_source_context_probe.mjs` and `corepack pnpm run diagnose:roll20-chat-source-context -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --row-paint-source-dir ..\_tmp_codex_smoke\row-paint-source-sanitize-replay-20260713-r1 --out-dir ..\_tmp_codex_smoke\chat-source-context-20260713-r2` passed.
- VERIFIED: `node --check scripts\roll20_renderer_action_gate.mjs` and `corepack pnpm run gate:roll20-renderer-action -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --chat-source-context-dir ..\_tmp_codex_smoke\chat-source-context-20260713-r2 --row-paint-source-dir ..\_tmp_codex_smoke\row-paint-source-sanitize-replay-20260713-r1 --out-dir ..\_tmp_codex_smoke\renderer-gate-source-context-20260713-r2` passed.
- OBSERVED: Current source-context report is `SOURCE_CONTEXT_ACTIONABLE`. fixture-A is P0 at `18.03%`, fixture-B is P1 at `6.34%`, and fixture-C is P0 at `20.68%`; all have actual Roll20 chat CSS `EXPECTED_RULE_PRESENT` but local-vs-actual font/table context differences.
- OBSERVED: fixture-C remains the strongest blocker: actual Roll20 has `.sheet-rolltemplate-coc` rules present, but six `BookkMyungjo-Bd` font checks pass locally and fail in actual Roll20, table context differs across `fontFamily`, `fontSize`, `letterSpacing`, `overflowWrap`, `borderSpacing`, and `width`, and the rejected sanitize replay candidate still worsens fixture-C by `+14.95%`.
- CURRENT: Renderer remains held. Next renderer work should build a template-scoped rule-order/font-face/table-intrinsic diagnostic model; do not promote broad typography, filter, transform, or global ChatPane CSS.

## 2026-07-13 fixture-C Sanitize Replay Source Model TODO Note

- DONE: `diagnose:roll20-chat-row-paint-source` now separates fixture-C/CoC's rejected sanitize replay path from the broader table-intrinsic bucket.
- DONE: When `fixture-c-sanitize-typography` makes a `TABLE_SCROLL_INTRINSIC` fixture worse, the probe reports `SANITIZE_REPLAY_REJECTED_SOURCE_MODEL_REQUIRED` and records `sourceEvidence.sanitizeReplayDeltaPct`.
- DONE: `gate:roll20-renderer-action` now accepts `--row-paint-source-dir`, so ignored temp row/paint/source diagnostics can feed the renderer decision gate without rewriting canonical Roll20 evidence.
- VERIFIED: `node --check scripts\roll20_chat_row_paint_source_probe.mjs`, `node --check scripts\roll20_renderer_action_gate.mjs`, `corepack pnpm run diagnose:roll20-chat-row-paint-source -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --out-dir ..\_tmp_codex_smoke\row-paint-source-sanitize-replay-20260713-r1`, and `corepack pnpm run gate:roll20-renderer-action -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --row-paint-source-dir ..\_tmp_codex_smoke\row-paint-source-sanitize-replay-20260713-r1 --out-dir ..\_tmp_codex_smoke\renderer-gate-row-paint-sanitize-replay-20260713-r1` passed.
- OBSERVED: fixture-C remains P0 at `20.68%` aligned mismatch. Its row/paint/source decision is now `SANITIZE_REPLAY_REJECTED_SOURCE_MODEL_REQUIRED`; `fixture-c-sanitize-typography` worsens fixture-C by `+14.95%`, so simply replaying observed Roll20 typography/sanitize values as local CSS is explicitly rejected.
- CURRENT: Renderer remains `HOLD_PRODUCTION_RENDERER_PATCH` / `rendererReady=NO`. Next fixture-C work should compare actual Roll20 rule order, font-face activation, and table intrinsic source context for `.sheet-rolltemplate-coc`; do not promote transform, filter, or broad typography CSS.

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
- OBSERVED: Default cell allocation is `CELL_ALLOCATION_SECONDARY_OR_ACCEPTABLE`; fixture-A, fixture-B, and fixture-C all route to `UNIFORM_TABLE_SCALE_OR_CROP_CONTEXT`, so the next renderer work should keep focusing on template-scoped message/table width, crop/context, assets, and style proof rather than broad cell/font/wrap CSS.
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
- VERIFIED: First sandboxed candidate asset probe wrote `..\_tmp_codex_smoke\background-assets-fixture-a-width-text-metrics-20260713-r1` but reported `ASSET_FETCH_INCOMPLETE`; the network-enabled rerun wrote `..\_tmp_codex_smoke\background-assets-fixture-a-width-text-metrics-net-20260713-r1`.
- OBSERVED: With network access, fixture-A and fixture-C both report `ASSET_BYTES_MATCH_BUT_SOURCE_PLACEHOLDER`: local and actual proxy bytes match (`200 image/png 503b png 161x81`), and the decoded source is the same `removed.png` placeholder.
- VERIFIED: Candidate asset preservation plan wrote `..\_tmp_codex_smoke\chat-assets-fixture-a-width-text-metrics-20260713-r1` and keeps `HOLD_RENDERER_FOR_ASSET_POLICY` with `SOURCE_ASSET_LOST_RELINK_REQUIRED` for fixture-A and fixture-C.
- CURRENT: For these evidence fixtures, no renderer CSS can honestly prove original visual parity until the user supplies/relinks user-owned live assets and the local preview/edit/export plus Roll20 Sandbox comparison are rerun.

## 2026-07-13 fixture-A Width/Text Metrics Background-Raster Follow-Up TODO Note

- VERIFIED: Candidate background-raster routing wrote `..\_tmp_codex_smoke\background-raster-fixture-a-width-text-metrics-20260713-r1` using the `fixture-a-message-width-text-metrics` smoke, candidate row-raster output, candidate row-compositing output, and candidate background-source output.
- OBSERVED: For fixture-A, the candidate path routes to `COLOR_ASSET_RASTER_MODEL_REQUIRED`: row weighted mismatch `24.69%`, luma correction gain `-1.39%`, and width experiment `CHAT_MESSAGE_CONTENT_WIDTH`.
- OBSERVED: This confirms that once fixture-A width/text measurement is matched, the remaining rejected-candidate axis is color/asset/background raster context, not another global width, font-size, table-cell, or wrapping CSS tweak.
- CURRENT: Keep renderer CSS held. Next fixture-A work should compare asset bytes/source placeholders, browser decode/color management, and Roll20 paint/capture context for the flat background rows before any ChatPane CSS promotion.

## 2026-07-13 fixture-A Width/Text Metrics Font-Glyph Follow-Up TODO Note

- DONE: `diagnose:roll20-chat-font-glyph` now accepts `--out-dir` / `--report-dir`, so default and candidate smoke evidence can be compared in ignored temp folders without rewriting canonical Roll20 reports.
- VERIFIED: `node --check scripts\roll20_chat_font_glyph_model.mjs` passed.
- VERIFIED: Default font/glyph rerun wrote `..\_tmp_codex_smoke\chat-font-glyph-default-outdir-20260713-r1`. Current default fixture-A evidence still says text measurement explains the table delta: `tableDelta=+15.75px`, `tableTextDelta=+15.602px`, residual `+0.148px`, `12` compared samples.
- VERIFIED: Candidate font/glyph rerun wrote `..\_tmp_codex_smoke\chat-font-glyph-fixture-a-message-width-text-metrics-20260713-r1`. For fixture-A, `fixture-a-message-width-text-metrics` brings `tableDelta`, `tableTextDelta`, and residual to `0px`, with `12` compared samples and no table font-family or font-availability change.
- VERIFIED: Fresh row-raster candidate comparison wrote `..\_tmp_codex_smoke\row-raster-candidates-fixture-a-width-text-metrics-20260713-r1` and still rejects `fixture-a-message-width-text-metrics`: fixture-A weighted mismatch worsens `17.93% -> 24.69%`, worst row worsens `26.28% -> 34.28%`.
- VERIFIED: Candidate row-compositing wrote `..\_tmp_codex_smoke\row-compositing-fixture-a-width-text-metrics-20260713-r1`; fixture-A worst-row mismatch is flat-paint dominated (`edge=0%`, `flat=100%`, `localDarker=68.48%`), not a row text/edge issue.
- VERIFIED: Candidate background-source rerun with the candidate smoke wrote `..\_tmp_codex_smoke\background-source-fixture-a-width-text-metrics-candidate-smoke-20260713-r1`; fixture-A reports `bg=DECLARATIONS_MATCH`, `widthDelta=0px`, and `BACKGROUND_SOURCE_SECONDARY`.
- CURRENT: `fixture-a-message-width-text-metrics` is useful diagnostic evidence because it proves fixture-A width/text measurement can be matched, but it remains production-rejected by row raster. The next fixture-A probe should compare browser paint/capture/compositing context for the flat row background, not another width/font CSS tweak.

## 2026-07-13 fixture-A Width/Text Metrics Cell Allocation Follow-Up TODO Note

- VERIFIED: `fixture-a-message-width-text-metrics` was rerun through `diagnose:roll20-chat-cell-allocation` with isolated output at `..\_tmp_codex_smoke\chat-cell-allocation-fixture-a-message-width-text-metrics-20260713-r1`.
- OBSERVED: For `fixture-A`, this narrower candidate preserves the current local cell allocation exactly in the probe (`tableDelta=0px`, max text-cell delta `0px`, max ratio delta `0%`). It is not rejected for the broad cell-allocation break seen in `fixture-a-message-cell-wrap-context`.
- VERIFIED: Feeding that cell-allocation evidence into `gate:roll20-chat-template-scope` wrote `..\_tmp_codex_smoke\chat-template-scope-fixture-a-message-width-text-metrics-cell-20260713-r1` and still returned `HOLD_GLOBAL_CHAT_RENDERER_PATCH` with `9` blockers.
- VERIFIED: Feeding the same evidence into `gate:roll20-renderer-action` wrote `..\_tmp_codex_smoke\renderer-gate-fixture-a-message-width-text-metrics-cell-20260713-r1` and still returned `HOLD_PRODUCTION_RENDERER_PATCH`.
- OBSERVED: The remaining fixture-A blocker is not cell allocation. The candidate is still not promotion-ready because the renderer gate reports `no-meaningful-gain`, `style=NOT_STYLE_PROVEN`, asset relink blockers, and row-raster regression (`weighted delta=+6.76%`, worst-row delta `+8%`).
- CURRENT: Keep `fixture-a-message-width-text-metrics` diagnostic-only. Next fixture-A work should build a style-proofed, template-scoped message/content width plus exact text measurement model that does not regress row raster, and asset relink remains required before visual parity can be judged.

## 2026-07-13 Cell Allocation Gate Integration TODO Note

- DONE: `gate:roll20-chat-template-scope` now accepts `--cell-allocation-dir` and consumes `chat-cell-allocation-probe-results.json`. A production-blocking cell allocation scenario now becomes a template-scope blocker instead of staying as a standalone diagnostic note.
- DONE: `gate:roll20-renderer-action` now accepts `--cell-allocation-dir` and `--chat-template-scope-dir`, summarizes cell allocation evidence, and adds a top-level production renderer blocker for production-unsafe cell allocation scenarios.
- DONE: `diagnose:roll20-chat-refresh` now runs the default cell allocation probe before the template-scope gate, so future isolated refresh runs carry the default row/cell allocation evidence automatically.
- VERIFIED: `node --check` passed for `roll20_chat_template_scope_gate.mjs`, `roll20_renderer_action_gate.mjs`, and `roll20_chat_diagnostic_refresh.mjs`; `test:roll20-chat-template-scope` passed.
- VERIFIED: Template-scope gate with isolated cell allocation evidence wrote `..\_tmp_codex_smoke\chat-template-scope-cell-allocation-fixture-a-wrap-20260713-r1` and increased blockers to `10`, including `fixture-A: fixture-a-message-cell-wrap-context cell allocation rejected (BROAD_STYLE_BREAKS_CELL_ALLOCATION; table delta=-188.391px, max text-cell delta=+73.719px, max ratio delta=+6.8%)`.
- VERIFIED: Renderer action gate with the same overrides wrote `..\_tmp_codex_smoke\renderer-gate-cell-allocation-fixture-a-wrap-20260713-r1` and now includes a top-level blocker: `chat cell allocation probe rejects production-unsafe scenarios: fixture-A/fixture-a-message-cell-wrap-context=BROAD_STYLE_BREAKS_CELL_ALLOCATION`.
- CURRENT: The broad fixture-A cell/wrap/font path is now blocked at the top renderer gate. Next renderer work should preserve default cell ratios and focus on fixture-A message/content width plus exact text metrics, while fixture-C remains a separate CoC/fixture-C table intrinsic/sanitize/font-context track.

## 2026-07-13 fixture-A Cell Allocation Probe TODO Note

- DONE: Added `diagnose:roll20-chat-cell-allocation` and `test:roll20-chat-cell-allocation` to compare actual Roll20 chat DOM sidecars against local/candidate smoke row-cell allocation. The report records table width deltas, text-cell deltas, ratio deltas, and per-scenario decisions.
- DONE: Candidate smokes that intentionally cover only one fixture are now reported as `SCENARIO_NOT_IN_LOCAL_SMOKE` for the other fixtures instead of false renderer blockers.
- VERIFIED: `node --check scripts\roll20_chat_cell_allocation_probe.mjs` and `corepack pnpm run test:roll20-chat-cell-allocation` passed.
- VERIFIED: Live diagnostic output wrote `..\_tmp_codex_smoke\chat-cell-allocation-fixture-a-wrap-20260713-r2`.
- OBSERVED: Default local chat rendering keeps cell ratios stable for all three current fixtures: fixture-A `tableDelta=+15.75px`, max text-cell delta `+4.953px`, max ratio delta `+0.255%`; fixture-B `tableDelta=+12px`, max ratio `+0.602%`; fixture-C `tableDelta=-24.531px`, max ratio `+0.039%`.
- OBSERVED: The fixture-A `fixture-a-message-cell-wrap-context` candidate is explicitly rejected as `BROAD_STYLE_BREAKS_CELL_ALLOCATION`: `tableDelta=-188.391px`, max text-cell delta `+73.719px`, max ratio delta `+6.802%`.
- CURRENT: Do not promote or retry broad fixture-A cell/wrap/font CSS copying. The next fixture-A renderer work should inspect narrower nested text wrappers, table width constraints, or Roll20 paint/crop context while preserving the stable default cell ratios.

## 2026-07-13 fixture-A Cell Wrap Context Candidate TODO Note

- DONE: Added a diagnostic-only `fixture-a-message-cell-wrap-context` ChatPane typography policy and wired it into local smoke/candidate/style/row-raster diagnostic allowlists. The default ChatPane renderer is unchanged.
- DONE: `rolltemplate_chat_smoke` now records `policyDiagnostics`, including active chat policy attributes plus targeted computed-style checks. This prevents agents from confusing "policy was set" with "policy actually affected computed style."
- DONE: `diagnose:roll20-chat-intrinsic-width` now accepts `--out-dir` and records the selected local smoke plus policy diagnostics, so default and candidate smoke evidence can be compared against actual Roll20 without rewriting canonical reports.
- VERIFIED: fixture-A-only local smoke passed to ignored temp output `..\_tmp_codex_smoke\rolltemplate-chat-smoke-fixture-a-cell-wrap-policy-diag-20260713-r1`; `policyDiagnostics.status=APPLIED` for `fixture-a-message-cell-wrap-context`; post-smoke `netstat` showed no listening `4432` server, only the existing Roll20 CDP listener on `9222`.
- VERIFIED: Intrinsic-width model reruns passed with isolated outputs `..\_tmp_codex_smoke\intrinsic-width-default-outdir-20260713-r1` and `..\_tmp_codex_smoke\intrinsic-width-fixture-a-cell-wrap-policy-diag-20260713-r1`.
- OBSERVED: Once measured with policy diagnostics, the candidate reproduces the same bad width profile as the earlier rejected cell-font candidate: fixture-A local `table.rect.width=547.921875px` vs actual Roll20 `359.53125px`; text-cell widths are also too wide (`Succeeds` `151.0625px` vs `85.53125px`; `Succeeds partially` `167.4375px` vs `93.71875px`).
- OBSERVED: Default fixture-A intrinsic-width comparison remains a small cell-allocation delta (`tableWidthDelta=+15.75px`, max cell delta `+4.953px`, actual/local table width `1.046x`), but the applied wrap/cell-font candidate flips to a broken allocation profile (`tableWidthDelta=-188.391px`, max cell delta `73.719px`, actual/local table width `0.656x`) while row text/counts still match.
- REJECTED: Pixel candidate comparison rejects the candidate: `fixture-a-message-cell-wrap-context` reports `fixture-local-incomplete-coverage`, mean delta `+41.27%`, and `1` regression.
- REJECTED: Style proof reports `REJECT_STYLE_CONTRADICTION`; row-raster comparison worsens fixture-A weighted mismatch from baseline `17.93%` to `62.08%` (`+44.15`) and worst-row mismatch from `26.28%` to `65.7%` (`+39.42`).
- CURRENT: Do not promote width-close, broad cell-font, or wrap-context CSS to production. The next fixture-A renderer investigation should locate a narrower DOM/style layer that yields Roll20 table/cell widths without changing the row paint/raster output, then rerun style proof plus row-raster before any renderer gate change.

## 2026-07-13 fixture-A Cell Font Width-Guard TODO Note

- DONE: `rolltemplate_chat_smoke` and the Roll20 chat capture probe snippet now record per-cell `computedStyle` plus box metrics (`offset/client/scroll` width and height). Future Roll20 chat sidecars can prove cell-level font/box context instead of only row/table summaries.
- DONE: `diagnose:roll20-chat-candidate-style` now requires the fixture-A `message width + cell font` proof path to match actual Roll20 `table` width as well as message-shell width and font context.
- DONE: The same style proof now checks fixture-A text-cell rect widths from `rowMetrics`, so broad cell-font candidates cannot pass by matching only `td:first`.
- VERIFIED: `node --check` passed for `scripts\rolltemplate_chat_smoke.mjs`, `scripts\roll20_chat_capture_plan.mjs`, and `scripts\roll20_chat_candidate_style_proof.mjs`.
- VERIFIED: Targeted style-proof reruns passed with temp outputs `..\_tmp_codex_smoke\chat-style-fixture-a-cell-font-width-guard-20260713-r1` and `..\_tmp_codex_smoke\chat-style-fixture-a-cell-width-profile-20260713-r1`.
- OBSERVED: `fixture-a-message-cell-font-context` is now explicitly rejected by actual table-width evidence: local candidate `table.rect.width=547.921875px` vs actual Roll20 `359.53125px` while chat/message width and `td:first.fontSize` match. This confirms the earlier `+188.391px` table-width explosion is a real blocker, not just stale background-source routing.
- OBSERVED: The same candidate is also rejected by text-cell width evidence: `Succeeds` local `151.0625px` vs actual `85.53125px`, and `Succeeds partially` local `167.4375px` vs actual `93.71875px`. Matching only the empty/result marker cell is insufficient.
- OBSERVED: A local-only smoke combining `fixture-a-root-width-actual` with `fixture-a-message-cell-font-context` still leaves the internal table at `547.921875px` while the template root is `279px`, so root-width forcing alone does not model actual Roll20 table layout.
- CURRENT: Do not promote or retry broad fixture-A cell-font copying. The next fixture-A work should model the table/message width and crop context before any luma/background/text antialiasing candidate is considered production-ready. Roll20 visual parity remains unproven.

## 2026-07-13 Background Source/Raster Candidate Evidence Override TODO Note

- DONE: `diagnose:roll20-chat-background-source` now accepts isolated evidence overrides: `--out-dir`, `--default-smoke`, `--parity-dir`, `--style-context-dir`, `--row-compositing-dir`, `--row-raster-candidates-dir`, and `--style-proof-dir`.
- DONE: `diagnose:roll20-chat-background-raster` now accepts `--out-dir`, `--background-source-dir`, `--row-compositing-dir`, `--row-raster-dir`, `--row-raster-candidates-dir`, and `--width-reconciliation-dir`. Both reports record `reportOverrides`.
- DONE: `diagnose:roll20-chat-background-source` now computes observed local-vs-actual table rect width deltas directly from the selected local smoke and Roll20 DOM sidecar, so candidate-specific width explosions are not hidden behind stale canonical style-context deltas.
- DONE: `diagnose:roll20-chat-background-raster` now treats `TABLE_WIDTH_CONTEXT_BEFORE_BACKGROUND_CSS` as higher priority than a promising luma correction. This prevents a broken-width candidate from being misread as a luma renderer fix.
- VERIFIED: `node --check` passed for both changed scripts, and `node scripts\roll20_chat_background_raster_model_probe.mjs --self-test` passed.
- VERIFIED: Default temp-output background source and raster runs passed against `reports\roll20-actual-compare\2026-06-18-state-map-v1`, writing to `..\_tmp_codex_smoke\background-source-outdir-smoke-20260713-r1` and `..\_tmp_codex_smoke\background-raster-outdir-smoke-20260713-r1`.
- VERIFIED: Candidate-specific runs consumed the rejected `fixture-a-message-cell-font-context` smoke/compositing/row-raster evidence. Outputs: `..\_tmp_codex_smoke\background-source-fixture-a-cell-font-20260713-r1` and `..\_tmp_codex_smoke\background-raster-fixture-a-cell-font-20260713-r1`.
- OBSERVED: With direct observed width evidence, the rejected fixture-A cell-font candidate shows table rect width delta `+188.391px` versus actual Roll20. Background raster now routes it to `TABLE_WIDTH_CONTEXT_BEFORE_LUMA_MODEL`, not `ROW_LUMA_MODEL_PROMISING`.
- OBSERVED: fixture-C routes to `BACKGROUND_SIZE_CANDIDATE_REJECTED` / `BACKGROUND_SIZE_SCALE_REJECTED` under the same candidate-specific evidence. Do not retry background-size/table-scale or filter hacks for fixture-C.
- CURRENT: The next implementation candidate should be diagnostic-only and template-scoped. For fixture-A, fix or model message/table width/crop context before treating luma correction as a renderer model. For fixture-C, compare fetched image/proxy bytes and browser paint output next. Roll20 visual parity remains unproven.

## 2026-07-13 fixture-A Cell Font Row Compositing Follow-Up TODO Note

- DONE: `diagnose:roll20-chat-row-paint-source` now accepts isolated evidence overrides: `--out-dir`, `--candidate-comparison-dir`, `--style-proof-dir`, `--parity-dir`, `--mask-dir`, `--row-geometry-dir`, `--width-reconciliation-dir`, `--font-intrinsic-dir`, `--default-smoke`, and `--paint-smoke`.
- DONE: `diagnose:roll20-chat-row-compositing` now accepts `--out-dir`, `--parity-dir`, `--row-raster-dir`, and `--row-paint-source-dir` while still preserving the existing positional local smoke/screenshot arguments. Reports record `reportOverrides` so agents can tell whether a run used canonical or temp candidate evidence.
- VERIFIED: Syntax checks passed for both changed scripts. Default temp-output runs passed against `reports\roll20-actual-compare\2026-06-18-state-map-v1` and wrote to `..\_tmp_codex_smoke\row-paint-source-outdir-smoke-20260713-r1` plus `..\_tmp_codex_smoke\row-compositing-outdir-smoke-20260713-r1`.
- VERIFIED: Candidate-specific reruns consumed the rejected `fixture-a-message-cell-font-context` smoke, row-raster, candidate comparison, and style-proof temp evidence. Final compositing output was `..\_tmp_codex_smoke\row-compositing-fixture-a-cell-font-with-paint-source-20260713-r1`.
- OBSERVED: The rejected fixture-A cell-font candidate worsens fixture-A row-weighted mismatch to `62.73%`, but a virtual luma correction drops that to `14.83%` (`-47.9%` gain). The decision is `LUMA_BACKGROUND_COMPOSITING_MODEL_REQUIRED`, not a font-size or width promotion.
- OBSERVED: In the same candidate-specific compositing run, fixture-C routes to `BACKGROUND_COMPOSITING_MODEL_REQUIRED`; the next fixture-C/CoC experiment should target row background/source compositing and must not promote a CSS filter hack.
- CURRENT: Do not retry or promote `fixture-a-message-cell-font-context`. Next P0 is a template-scoped background/luma compositing probe for fixture-A, then a separate fixture-C/CoC background/source compositing probe. This still does not prove Roll20 visual parity.

## 2026-07-13 fixture-A Cell Font Context Candidate TODO Note

- DONE: Added a diagnostic-only `fixture-a-message-cell-font-context` ChatPane typography policy. It can be combined with `fixture-a-message-full-width` to test the actual Roll20 fixture-A chat/message width plus table/cell font context without changing the default renderer.
- DONE: `diagnose:roll20-chat-candidates`, `diagnose:roll20-chat-row-raster-candidates`, and `diagnose:roll20-chat-candidate-style` can now consume temp candidate smoke evidence through `--candidate-screenshots`, `--candidate-smoke`, and `--candidate-comparison-dir` overrides. This is needed because `reports/` is read-only on this machine and new candidate smoke output must stay in ignored temp folders.
- VERIFIED: `node --check` passed for the changed chat scripts. `node scripts\rolltemplate_chat_smoke.mjs ... --report-dir ..\_tmp_codex_smoke\rolltemplate-chat-smoke-fixture-a-message-cell-font-context-20260713-r1 --chat-geometry-policy fixture-a-message-full-width --chat-typography-policy fixture-a-message-cell-font-context` passed for all three visual fixtures.
- OBSERVED: The candidate style proof confirms the fixture-A computed-style target itself: chat/message width `340px`, table font size `13.65px`, and `td:first` font size `27.3px` match actual Roll20 evidence.
- REJECTED: Pixel and row-raster evidence reject the candidate. Candidate comparison reports `fixture-a-message-cell-font-context` as `reject-regresses-fixtures`, mean aligned delta `+16.55%`, fixture-A delta `+42.04%`, and fixture-C delta `+7.62%`. Row-raster reports fixture-A weighted mismatch worsening from `17.93%` to `62.73%` (`+44.8%`) and worst-row mismatch worsening by `+40.24%`.
- CURRENT: Matching isolated computed font-size values is not sufficient. The next fixture-A investigation should inspect row paint/source/rasterization, crop/scale, and possibly nested element-specific text rendering before adding another CSS candidate. Do not promote `fixture-a-message-cell-font-context`.

## 2026-07-13 Chat Candidate Style-Proof Best-Candidate Coverage TODO Note

- DONE: `diagnose:roll20-chat-candidate-style` now supports `--include-best-per-fixture` and `--include-candidates <comma-list>`. The default behavior remains narrow, but agents can now force the style-proof report to cover the exact best candidates later consumed by `gate:roll20-chat-template-scope`.
- WHY: The template-scope gate was selecting best pixel candidates such as `fixture-a-message-width-text-metrics` and `paint-dim-background`, but the style-proof script only covered `candidate-needs-style-proof` / `single-fixture-only` risks. Those best candidates therefore appeared as `NOT_STYLE_PROVEN` instead of being accepted or rejected by actual Roll20 computed-style evidence.
- VERIFIED: `node --check scripts\roll20_chat_candidate_style_proof.mjs` passed.
- VERIFIED: Live run passed with `--include-best-per-fixture --out-dir ..\_tmp_codex_smoke\chat-candidate-style-proof-best-20260713-r2`, selecting `no-shadow`, `fixture-a-message-width-text-metrics`, `roll20-intrinsic-spacing`, and `paint-dim-background`.
- OBSERVED: The expanded style proof reports `REJECT_STYLE_CONTRADICTION` for `3/4` selected candidates. fixture-A's message-width/text-metrics candidate matches chat/message width and table font size, but contradicts actual Roll20 on `td:first` font size (`13.65px` local candidate vs `27.3px` actual). fixture-C's `paint-dim-background` pixel gain comes from a local CSS filter, while actual Roll20 computed `filter` is `none`.
- VERIFIED: Feeding the expanded style proof into `gate:roll20-chat-template-scope` still returns `HOLD_GLOBAL_CHAT_RENDERER_PATCH` with `9` blockers, now with fixture-A and fixture-C best candidates classified as style contradictions instead of style-proof gaps.
- CURRENT: Next renderer work should stop retrying these best candidates as-is. fixture-A needs a narrower cell font/context model, and fixture-C needs a real table/font/asset model rather than local paint filters. Asset relink remains a separate blocker before visual parity can be claimed.

## 2026-07-13 Chat Template Scope Isolated Evidence Override TODO Note

- DONE: `diagnose:roll20-chat-candidate-style` now accepts `--out-dir <writable-report-dir>`, so style-proof reruns can read canonical Roll20 actual evidence while writing into ignored temp folders instead of rewriting `chat-candidate-style-proof` inside the selected run.
- DONE: `gate:roll20-chat-template-scope` now accepts report override directories for targeted plan, width reconciliation, policy, candidate comparison, style proof, asset plan, and row-raster candidate reports. Override paths are recorded in the generated JSON/Markdown so later agents can audit whether the gate used canonical or temp evidence.
- VERIFIED: `node --check` passed for both changed scripts, and `node scripts\roll20_chat_template_scope_gate.mjs --self-test` passed.
- VERIFIED: Live temp-output style proof passed against `reports\roll20-actual-compare\2026-06-18-state-map-v1` with `--out-dir ..\_tmp_codex_smoke\chat-candidate-style-proof-outdir-20260713-r1`.
- VERIFIED: Live temp-output candidate and row-raster candidate comparisons passed, then `gate:roll20-chat-template-scope` consumed those temp reports with `--candidate-comparison-dir`, `--style-proof-dir`, and `--row-raster-candidates-dir`.
- OBSERVED: The override gate still returns `HOLD_GLOBAL_CHAT_RENDERER_PATCH` with `9` blockers. fixture-A remains scoped to `.sheet-rolltemplate-aw` / `MESSAGE_CONTENT_TEXT_METRICS` and its best text-metrics candidate is blocked by `NOT_STYLE_PROVEN`, asset relink, and row-raster regression. fixture-C remains scoped to `.sheet-rolltemplate-coc` / `TABLE_INTRINSIC_SANITIZE_FONT`; `paint-dim-background` improves fixture-C aligned mismatch but is still rejected by fixture regression and asset blockers.
- CURRENT: This is evidence isolation and gate wiring only. It does not promote ChatPane CSS, relink assets, upload to Roll20, or prove Roll20 visual parity. Next P0 remains building a genuinely template-scoped candidate that survives style proof, row-raster checks, and asset policy.

## 2026-07-13 Renderer Gate Root Report Override TODO Note

- DONE: `gate:roll20-renderer-action` now accepts `--full-root-dir`, `--scroll-metrics-full-root-dir`, `--root-cutoff-dir`, and `--geometry-dir` report overrides. This lets a fresh isolated root/geometry diagnostic run feed the renderer action gate without rewriting canonical actual evidence folders.
- DONE: The renderer gate output JSON records `reportOverrides`, so later agents can tell whether the gate used canonical reports or temp isolated reports.
- VERIFIED: `node --check scripts\roll20_renderer_action_gate.mjs` passed.
- VERIFIED: Live override run passed against `reports\roll20-actual-compare\2026-06-18-state-map-v1` with `--full-root-dir ..\_tmp_codex_smoke\full-root-candidates-outdir-20260713`, `--geometry-dir ..\_tmp_codex_smoke\geometry-outdir-20260713`, and temp gate output `..\_tmp_codex_smoke\renderer-gate-with-root-overrides-20260713`.
- OBSERVED: The override gate still returns `HOLD_PRODUCTION_RENDERER_PATCH`. It now includes the fresh diagnostic evidence lines: fixture-A best `normal-state-map` `8.23%`, fixture-B best `normal-state-map` `7.77%`, and fixture-C best `sandbox-inline-block-font-zero-source` `15.69%`.
- CURRENT: This connects isolated root diagnostics to the renderer decision flow. It still does not promote CSS or prove visual parity; the active blockers remain chat/template split models, asset relink for fixture-A/fixture-C, and non-uniform diagnostic patch families.

## 2026-07-13 Root Geometry Diagnostics Out-Dir TODO Note

- DONE: `diagnose:roll20-geometry`, `diagnose:roll20-height-drift`, and `smoke:roll20-full-root-candidates` now accept `--out-dir <writable-report-dir>`, so agents can rerun Roll20 root/height diagnostics without rewriting canonical actual evidence folders.
- DONE: `smoke:roll20-full-root-candidates` now uses `out-dir/.build` for its temporary `buildDoc.ts` compile when `--out-dir` is supplied. This avoids the older locked/read-only `.tmp/full-root-candidate-build` folder that blocked fresh runs.
- VERIFIED: Syntax checks passed for all three scripts. Live temp-output runs passed for geometry, fixture-B height drift, and full-root candidates against `reports\roll20-actual-compare\2026-06-18-state-map-v1`.
- OBSERVED: Temp geometry output from canonical sources reports fixture-B root delta `-3.625px` and top content finding `TABLE.sheet-center-content`; temp height drift for fixture-B reports `height-close`, root delta `-3px`, and `localTailInk=0%`.
- OBSERVED: Fresh temp full-root candidate output reports fixture-A best `normal-state-map` mismatch `8.23%` with root delta `-7268.063`, fixture-B best `normal-state-map` mismatch `7.77%` with root delta `-594.234`, and fixture-C best `sandbox-inline-block-font-zero-source` mismatch `15.69%` with root delta `585.828`.
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
- CURRENT: The live plan still reports `RELINK_MAP_REQUIRED`: `fixture-A` and `fixture-c-commission-1bu` remain `MISSING_RELINK` with no map entries. This is the correct blocker state, not a visual-parity pass.
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
- OBSERVED: Current asset plan remains `HOLD_RENDERER_FOR_ASSET_POLICY`; fixture-A/fixture-C remain `SOURCE_ASSET_LOST_RELINK_REQUIRED`. Current browser-paint plan remains `BROWSER_PAINT_BLOCKED_BY_RELINK`; fixture-B is secondary/no-background-image.
- CURRENT: This is verification resilience only. Renderer CSS remains held until user-owned HTTP(S) relink maps are supplied and local preview/edit/export plus Roll20 Sandbox comparison are rerun.

## 2026-07-13 Chat Asset Probe Fetch-Failure Preservation TODO Note

- DONE: `diagnose:roll20-chat-background-assets` now preserves stronger previous byte/placeholder evidence when a rerun hits `ASSET_FETCH_INCOMPLETE` for unchanged background URLs. The report records `preservedFetchFailureCount` and keeps the fresh fetch-failure side evidence instead of downgrading the fixture decision.
- WHY: Isolated full refresh copies the canonical run and then reruns every diagnostic. If the current network cannot fetch Roll20/Imgur URLs, the asset probe could previously replace known placeholder evidence with weaker `FETCH_FAIL` evidence, which then misrouted downstream asset-preservation and browser-paint plans.
- VERIFIED: `node --check scripts\roll20_chat_background_asset_probe.mjs`, `node scripts\roll20_chat_background_asset_probe.mjs --self-test`, and live isolated `diagnose:roll20-chat-refresh -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --work-run-dir ...\_tmp_codex_smoke\chat-refresh-asset-preserve-20260713` passed.
- OBSERVED: The isolated refresh asset probe reported `preservedFetchFailureCount=2` and kept fixture-A/fixture-C as `ASSET_BYTES_MATCH_BUT_SOURCE_PLACEHOLDER`; the asset preservation plan returned `SOURCE_ASSET_LOST_RELINK_REQUIRED`; the template-scope gate stayed `HOLD_GLOBAL_CHAT_RENDERER_PATCH` with `9` blockers.
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
- CURRENT CANDIDATE STATE: `paint-dim-background` improves fixture-C aligned mismatch from `20.68%` to `19.06%`, but remains unsafe because it regresses another fixture and is still blocked by asset/style proof. `fixture-a-message-width-text-metrics` remains rejected by row-raster evidence because fixture-A row-weighted mismatch worsens from `17.93%` to `24.69%`.
- SERVER HYGIENE: No Next/smoke server was started for this batch. Only the existing Roll20 CDP listener on `9222` was present in the pre-check; do not stop it while actual Roll20 verification is active.
- CLAIM BOUNDARY: Diagnostic isolation only. This does not change product rendering, relink assets, upload to Roll20, or prove Roll20 visual parity.

## 2026-07-13 Template Scope Asset/Row-Raster Gate TODO Note

- DONE: `gate:roll20-chat-template-scope` now accepts `--out-dir <writable-report-dir>` and reads asset-preservation plus row-raster candidate evidence in addition to targeted plan, width reconciliation, policy, candidate comparison, and style proof.
- WHY: The previous template-scope gate correctly blocked global ChatPane CSS when fixture-A/fixture-C required different template models, but it did not show the asset placeholder blocker and row-raster regression in the same table. That made the next renderer action easier to misread as "try another broad CSS candidate."
- VERIFIED: `node --check scripts\roll20_chat_template_scope_gate.mjs`, `test:roll20-chat-template-scope`, live runs against `reports\roll20-actual-compare\2026-06-18-state-map-v1` with `--out-dir` before and after the run dir, `lint`, `build`, and `git diff --check` passed. Current result remains `HOLD_GLOBAL_CHAT_RENDERER_PATCH`, now with `9` blockers; fixture-A shows `SOURCE_ASSET_LOST_RELINK_REQUIRED` plus row-raster regression, and fixture-C shows `SOURCE_ASSET_LOST_RELINK_REQUIRED`.
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
- VERIFIED: Both commands passed with temp output directories under `D:\훙냥냥\마렌상\roll20-sheet-builder 시트 고치기\_tmp_codex_smoke\...`, including reversed option order. Current measured status remains `rendererReady=NO`, `rendererAction=HOLD_PRODUCTION_RENDERER_PATCH`, `chatSameStructureHighMismatch=2/3`, and `chatSameStructureMaxAlignedMismatch=20.68%`. CDP is `READY`, but `plannedFixtures=0`, so the correct next action is renderer/template/asset diagnostics, not blind recapture.
- SERVER HYGIENE: No project dev/smoke server was started for this batch. Port `3000` was not listening; port `9222` remains the existing Roll20 CDP browser listener.
- CLAIM BOUNDARY: This is verification resilience only. It does not change product rendering, upload a sheet to Roll20, relink assets, or prove visual parity.

## 2026-07-13 Edit Layer Selection Path TODO Note

- DONE: The edit layer panel now shows a `선택 위치` breadcrumb for the selected object. When a nested input is selected, the panel exposes its parent frame/container path instead of only highlighting one row in a long virtualized list.
- VERIFIED: `smoke:edit-flow -- --port 4406 --report-dir D:\훙냥냥\마렌상\roll20-sheet-builder 시트 고치기\_tmp_codex_smoke\edit-flow-selection-path` passed. The new `layerSelectionPath` check observed `visible=true`, `depth=2`, `hasSection=true`, `endsWithInput=true`, and `currentIsInput=true`.
- SERVER HYGIENE: Port `4406` had only `TIME_WAIT` connections after the smoke run; no listening smoke server remained. Port `3000` was not listening before/after this batch. Port `9222` remains the Roll20 CDP browser listener from earlier actual-screen work.
- VERIFY NOTE: The sandboxed browser logged the same two `ERR_NETWORK_ACCESS_DENIED` resource warnings seen in prior smokes, with `pageErrors=0` and smoke pass intact.
- CLAIM BOUNDARY: This improves Figma-like edit-layer context and container visibility only. It does not change actual Roll20 renderer parity, asset-relink blockers, worker JS block coding scope, or all-sheet support.

## 2026-07-13 Edit Layer Auto-Scroll TODO Note

- DONE: The edit layer panel now scrolls the selected layer row into view when selection changes. Clicking a rendered object on the canvas can pull its layer row into the visible layer panel even in long sheets.
- VERIFIED: `smoke:edit-flow -- --port 4405 --report-dir D:\훙냥냥\마렌상\roll20-sheet-builder 시트 고치기\_tmp_codex_smoke\edit-flow-autoscroll` passed. The new `layerAutoScroll` check selected the 80th synthetic layer from the canvas and observed `beforeScrollTop=0`, `afterScrollTop=2715`, `rowRendered=true`, and `rowVisible=true`.
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
- VERIFIED: `smoke:imported-edit-sync -- --port 4385` passed for `fixture-A`, `fixture-B`, `synthetic-nonleaf-flow`, and `fixture-c-commission-1bu`. Each reported `interaction=PASS` and `resources=PASS`, with the moved imported block matching edit and preview coordinates.
- CLAIM BOUNDARY: This proves local static-app edit/preview synchronization for the covered fixtures. It does not prove actual Roll20 visual parity, Roll20 Sandbox upload parity, worker JS block coding, or all-sheet support.

## 2026-07-13 Browser Paint Plan Routing TODO Note

- DONE: Added `plan:roll20-chat-browser-paint`, a diagnostic-only router that reads current chat asset, asset-preservation, background-raster, background-source, and row-compositing evidence.
- WHY: fixture-A/fixture-C now point at a flat-paint/browser-color-model axis, but browser paint work is only valid after dead placeholder assets are relinked or the fixture is classified as non-image/secondary.
- CURRENT EXPECTED ROUTING: With the current `reports\roll20-actual-compare\2026-06-18-state-map-v1` evidence, fixture-A and fixture-C should remain `BLOCKED_BY_ASSET_RELINK`, while no-background-image fixtures stay secondary instead of prompting renderer CSS changes.
- VERIFIED: `test:roll20-chat-browser-paint`, syntax checks for the new planner and diagnostic refresh, current `plan:roll20-chat-assets`, current `plan:roll20-chat-browser-paint`, `gate:roll20-renderer-action`, `guard:roll20-evidence`, full `diagnose:roll20-chat-refresh`, `lint`, and `build` passed.
- CLAIM BOUNDARY: This is browser-paint investigation routing only. It does not relink assets, upload to Roll20, change production renderer CSS, or prove visual parity.

## 2026-07-13 Asset Probe Flat-Paint Decision Bridge TODO Note

- DONE: `diagnose:roll20-chat-background-assets` and `plan:roll20-chat-assets` now recognize the new `FLAT_PAINT_SOURCE_OR_BROWSER_COLOR_MODEL_REQUIRED` raster decision.
- WHY: After dead assets are relinked/rehosted, the next correct path should be browser paint/decode/context verification, not falling through to a secondary asset bucket or repeating width/font CSS candidates.
- VERIFIED: `test:roll20-chat-background-assets`, `test:roll20-chat-assets`, syntax checks for both scripts, fresh `diagnose:roll20-chat-background-assets`, fresh `plan:roll20-chat-assets`, and `gate:roll20-renderer-action -- reports\roll20-actual-compare\2026-06-18-state-map-v1` passed.
- CURRENT: The current evidence still reports `SOURCE_ASSET_LOST_RELINK_REQUIRED` for fixture-A and fixture-C because both source/proxy paths resolve to the `503b png 161x81 removed.png` placeholder. Renderer remains `HOLD_PRODUCTION_RENDERER_PATCH`.
- CLAIM BOUNDARY: This is evidence-routing and future regression coverage only. It does not relink assets, upload to Roll20, or prove visual parity.

## 2026-07-13 Background Raster Flat-Paint Classification TODO Note

- DONE: `diagnose:roll20-chat-background-raster` now preserves row-compositing bucket evidence in its fixture output and uses it for routing decisions.
- OBSERVED: Current fixture-A and fixture-C evidence is now classified as `FLAT_PAINT_SOURCE_OR_BROWSER_COLOR_MODEL_REQUIRED`, not a generic source/paint bucket. Both have `0%` edge mismatch share and `100%` flat-paint mismatch share, with local darker/chroma-heavy rows.
- OBSERVED: Current run output:
  - fixture-A: row `17.93%`, luma gain `-0.34%`, flat `100%`, darker `66.87%`, chroma `48.62%`, worst row `1 26.28%`.
  - fixture-C 1BU: row `21.41%`, luma gain `+0.57%`, flat `100%`, darker `65.99%`, chroma `49.02%`, worst row `5 27.73%`.
- VERIFIED: `test:roll20-chat-background-raster`, `node --check scripts\roll20_chat_background_raster_model_probe.mjs`, `diagnose:roll20-chat-background-raster -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, and `gate:roll20-renderer-action -- reports\roll20-actual-compare\2026-06-18-state-map-v1` passed.
- CURRENT: Production ChatPane renderer remains `HOLD_PRODUCTION_RENDERER_PATCH`. The next useful P0 remains source/proxy byte, browser decode, Roll20 paint-context, and user-owned asset relink verification, not another broad width/font/background-size CSS candidate.
- CLAIM BOUNDARY: This is diagnostic routing only. It does not upload to Roll20, relink dead assets, or prove Roll20 visual parity.

## 2026-07-13 Targeted Renderer Plan Row-Raster Precision TODO Note

- DONE: `plan:roll20-chat-renderer-targets` now carries row-raster worst-row evidence from `chat-row-raster-probe` instead of reporting `unknown worst row`.
- WHY: The active renderer gate is held partly because fixture-A and fixture-C have row/luma raster mismatches even when some width/text candidates improve raw crop. The handoff plan must preserve the actual row-weighted and worst-row numbers so agents do not repeat rejected width/font CSS guesses.
- VERIFIED: `test:roll20-chat-renderer-targets` passed, and the regenerated targeted plan records fixture-A `weighted 17.93%, worst row 1 26.28%, luma -66.819` plus fixture-C `weighted 21.41%, worst row 5 27.73%, luma -35.682`.
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
- WHY: Current actual Roll20 evidence still shows fixture-A/fixture-C background sources resolving to tiny placeholder images. Users need a clear `old URL => user-owned URL` map for both full proxy URLs and the original `src` URLs before Sandbox re-comparison can prove visual parity.
- VERIFIED: `test:asset-refs`, `test:asset-replacements`, `guard:ui-copy`, and `smoke:export-dialog -- --port 4382` passed. Browser smoke reports `importAssetDraft.hasSourceUrl=true` and the draft stays commented until the user fills a replacement URL.
- CLAIM BOUNDARY: This improves relink UX and verification readiness only. It does not provide replacement assets, upload to Roll20, or prove Roll20 visual parity.

## 2026-07-13 fixture-A Row Raster Candidate Gate TODO Note

- DONE: Extended `diagnose:roll20-chat-row-raster-candidates` and `gate:roll20-renderer-action` so row-raster candidate comparison reports fixture-A as well as fixture-C deltas.
- OBSERVED: `fixture-a-message-width-text-metrics` improves fixture-A raw crop mismatch, but row-raster comparison rejects it: fixture-A row-weighted mismatch worsens `17.93% -> 24.69%` and worst row worsens `26.28% -> 34.28%`.
- OBSERVED: `fixture-a-message-width-font-size` is also rejected by row raster: fixture-A row-weighted mismatch worsens to `24.75%`, worst row to `34.44%`.
- CURRENT: This rules out promoting fixture-A width/text-metric candidates as renderer fixes. The next fixture-A P0 is row/background/text antialiasing or paint-context modeling after asset relink, not more message-width CSS.
- VERIFIED: `diagnose:roll20-chat-row-raster-candidates` now compares `9/9` candidates and `gate:roll20-renderer-action` reports fixture-A reject deltas directly.
- CLAIM BOUNDARY: This is diagnostic evidence only. It keeps production ChatPane renderer held and does not prove Roll20 visual parity.

## 2026-07-13 fixture-A Message Width + Text Metrics Candidate TODO Note

- DONE: Added the diagnostic-only `fixture-a-message-width-text-metrics` candidate to the chat candidate comparison/style-proof/target-plan plumbing.
- OBSERVED: Fresh smoke for this candidate passed all 3 chat fixtures. fixture-A raw rolltemplate-crop mismatch improved from the current default `26.9%` to `17.94%`, but fixture-A aligned mismatch is only `17.94%` vs default aligned `18.03%`, so this is not enough for production promotion.
- CURRENT: The candidate confirms the fixture-A axis is message/content width plus text metrics, but it does not reduce the global high-mismatch count because fixture-C remains `20.68%` aligned and fixture-B stays in the default/P1 bucket.
- STILL TODO: Keep this candidate diagnostic-only. Next fixture-A work should inspect row/background/text-antialiasing residuals after width/text metrics, while fixture-C still needs a separate CoC table intrinsic/sanitize/font-context model.
- CLAIM BOUNDARY: This is not Roll20 visual parity and not a ChatPane production renderer patch.

## 2026-07-13 Chat Renderer Target Plan TODO Note

- DONE: Sharpened `plan:roll20-chat-renderer-targets` next commands so fixture-A and fixture-C no longer point primarily at broad/global candidate reruns.
- CURRENT: fixture-A remains P0 with `fixture-A_TEMPLATE_SCOPED_TEXT_METRICS`; next diagnostics now focus on relink coverage, message shell, table-width budget, and font/glyph evidence.
- CURRENT: fixture-C remains P0 with `COC_TABLE_INTRINSIC_AND_SANITIZE_MODEL`; next diagnostics now focus on relink coverage, table intrinsic, overflow/crop, intrinsic width, font/glyph, and font-intrinsic evidence.
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
- CURRENT: `plan:roll20-asset-relink -- reports\roll20-actual-compare\2026-06-18-state-map-v1` still reports `RELINK_MAP_REQUIRED` for fixture-A/fixture-C because no user-owned replacement URLs have been supplied for the real blockers.
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
- VERIFIED: The current run plan reports `HOLD_RENDERER_FOR_ASSET_POLICY` with P0 `SOURCE_ASSET_LOST_RELINK_REQUIRED` for fixture-A and fixture-C chat background evidence. Local and actual proxy bytes match, but the source resolves to a placeholder, so CSS cannot recover the intended original image.
- VERIFIED: `smoke:export-dialog -- --port 4363` passed and confirms the asset preflight panel exposes `Roll20 proxy` and `placeholder risk` metrics without console/page errors.
- VERIFIED: `test:asset-replacements`, `lint`, `build`, and `smoke:export-dialog -- --port 4365` passed for the replacement-map batch.
- VERIFIED: `test:asset-refs`, `test:asset-replacements`, `lint`, `build`, `smoke:export-dialog -- --port 4367`, and `guard:roll20-evidence` passed for the import-side warning batch.
- VERIFIED: `test:asset-refs`, `test:asset-replacements`, `lint`, `build`, `smoke:export-dialog -- --port 4368`, and `guard:roll20-evidence -- reports\roll20-actual-compare\2026-06-18-state-map-v1` passed for the shared preview/edit/export replacement batch. The browser smoke uses a copyright-safe synthetic asset URL and proves preview iframe plus edit Shadow DOM contain the replacement target and not the original URL.
- VERIFIED: `test:asset-refs`, `test:asset-replacements`, `lint`, `build`, `smoke:export-dialog -- --port 4369`, and `guard:roll20-evidence -- reports\roll20-actual-compare\2026-06-18-state-map-v1` passed for the import draft batch. The browser smoke now fills a synthetic Imgur URL in the import dialog, confirms the draft button appears, and verifies the generated map entry stays commented until the user relinks.
- VERIFIED: `node --check scripts\export_dialog_browser_smoke.mjs`, `test:asset-refs`, `test:asset-replacements`, `lint`, `build`, `smoke:export-dialog -- --port 4370`, `git diff --check`, and `guard:roll20-evidence -- reports\roll20-actual-compare\2026-06-18-state-map-v1` passed for the autosave persistence batch. The browser smoke confirms IndexedDB XML contains `<asset-replacement-map>`, then reloads and restores the map into `previewStore`.
- VERIFIED: `test:roll20-chat-assets`, `plan:roll20-chat-assets -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, and `node --check scripts\roll20_chat_asset_preservation_plan.mjs` passed after updating the asset-preservation plan to point at the implemented local-only replacement map instead of asking agents to build that UX again.
- VERIFIED: `gate:roll20-renderer-action -- reports\roll20-actual-compare\2026-06-18-state-map-v1` now reads the asset-preservation plan and adds a renderer blocker when the plan reports `HOLD_RENDERER_FOR_ASSET_POLICY`. Current gate output includes `chat asset preservation policy holds renderer CSS` for fixture-A and fixture-C and routes next actions to the local-only asset replacement map plus Roll20 Sandbox re-comparison.
- VERIFIED: `smoke:export-dialog -- --port 4371` passed after adding replacement profiles. The smoke confirms profile controls render, a synthetic profile is created, autosave XML contains `<asset-replacement-profiles>`, and reload + autosave restore brings the profile back without committing any generated report evidence.
- VERIFIED: `test:roll20-asset-relink` passed. `plan:roll20-asset-relink -- reports\roll20-actual-compare\2026-06-18-state-map-v1` currently reports `RELINK_MAP_REQUIRED` with fixture-A/fixture-C missing. A temporary ignored map smoke classified fixture-A as `COVERED_ROLL20_READY` with an HTTP(S) target and fixture-C as `COVERED_LOCAL_ONLY` with a data URL target.
- VERIFIED: `node --check scripts\export_dialog_browser_smoke.mjs`, `test:asset-replacements`, `test:roll20-asset-relink`, `guard:ui-copy`, `lint`, `build`, and `smoke:export-dialog -- --port 4381` passed for the asset-map copy/txt-save bridge. Browser smoke confirms the copy/download controls exist and become enabled after autosave restores a synthetic map.
- VERIFIED: `node --check scripts\roll20_asset_relink_verification_plan.mjs`, `test:roll20-asset-relink`, `plan:roll20-asset-relink -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `guard:roll20-evidence -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `git diff --check`, `lint`, and `build` passed after adding the map template. The generated ignored template contains 6 commented replacement-rule candidate lines for the current fixture-A/fixture-C unresolved blockers.
- CURRENT: Production ChatPane renderer remains held. Asset relink/rehost UX is now a P0 product requirement before claiming visual parity for fixtures whose source images are dead.
- STILL TODO: Rerun actual Roll20 sandbox comparison after the user relinks/rehosts dead assets. Do not commit downloaded third-party assets, screenshots, or generated report evidence.

## 2026-07-12 Roll20 Chat Targeted Candidate Results TODO Note

- DONE: Ran the targeted local smoke candidates from the renderer target plan:
  - `fixture-A` with `fixture-a-text-metrics`: smoke PASS, candidate comparison says `no-meaningful-gain`, fixture-A aligned delta `+0.1%`.
  - `fixture-c-commission-1bu` with `fixture-c-sanitize-typography`: smoke PASS, candidate comparison says `reject-regresses-fixtures`, fixture-C aligned delta `+14.95%`.
  - `fixture-c-commission-1bu` with `coc-table-intrinsic-clamp`: smoke PASS, candidate comparison says `no-meaningful-gain`, fixture-C aligned delta `0%`.
- VERIFIED: `diagnose:roll20-chat-candidates`, `diagnose:roll20-chat-candidate-style`, `diagnose:roll20-chat-font-intrinsic`, `diagnose:roll20-chat-row-paint-source`, `diagnose:roll20-chat-background-source`, `diagnose:roll20-chat-row-raster`, `diagnose:roll20-chat-background-assets`, and `diagnose:roll20-chat-background-raster` completed.
- CURRENT: Production chat renderer remains `HOLD_PRODUCTION_RENDERER_PATCH`. The plan now records 16 blockers, including tried-and-rejected candidates plus background/raster evidence.
- CURRENT: New root-cause evidence says CSS declarations can match while rendered pixels still differ:
  - fixture-A: `COLOR_ASSET_RASTER_MODEL_REQUIRED`, row raster worst mismatch `26.28%`, background asset probe says local/actual bytes match but source resolves to a Roll20 `removed.png` placeholder.
  - fixture-C: `SOURCE_IMAGE_OR_BROWSER_PAINT_MODEL_REQUIRED`, row raster worst mismatch `27.73%`, background asset probe also sees the placeholder image path.
- STILL TODO: Do not rerun the failed text/sanitize/clamp candidates. Next P0 is an asset-preservation/proxy/browser-paint investigation for chat/background images before any renderer CSS promotion.

## 2026-07-12 Roll20 Chat Targeted Renderer Plan TODO Note

- DONE: Added `plan:roll20-chat-renderer-targets`, a diagnostic-only planner that reads the current Roll20 actual chat evidence reports and turns them into scoped next renderer experiments.
- VERIFIED: `test:roll20-chat-renderer-targets` passed, and the planner ran against `reports\roll20-actual-compare\2026-06-18-state-map-v1`.
- CURRENT: The planner keeps production chat renderer changes on `HOLD_PRODUCTION_RENDERER_PATCH` with 4 blockers. Current split:
  - `fixture-A`: P0, `fixture-A_TEMPLATE_SCOPED_TEXT_METRICS`, aligned mismatch `18.03%`; next experiment is message-width plus exact text-metric allocation scoped to `.sheet-rolltemplate-aw`.
  - `fixture-B`: P1, `KEEP_DEFAULT`, aligned mismatch `6.34%`; do not spend the next renderer pass here unless it regresses.
  - `fixture-c-commission-1bu`: P0, `COC_TABLE_INTRINSIC_AND_SANITIZE_MODEL`, aligned mismatch `20.68%`; next experiment is CoC/fixture-C-scoped table intrinsic sizing, font availability, and sanitize-order modeling.
- STILL TODO: Run the targeted fixture-A and fixture-C smoke/candidate commands from `reports\roll20-actual-compare\2026-06-18-state-map-v1\chat-targeted-renderer-plan\chat-targeted-renderer-plan-results.md`. Do not promote global ChatPane width/font/padding CSS.

## 2026-07-12 Roll20 Chat Overlay-Clean Recapture TODO Note

- DONE: Confirmed the first fixture-B same-template recapture still had a screenshot-quality problem: the character sheet dialog overlapped the text chat, so `roll20-chat.png` included sheet UI (`Modify`) even though DOM evidence selected `sheet-rolltemplate-initiative-roll`.
- DONE: Closed the overlapping Roll20 character dialog and recaptured fixture-B chat with `--skip-click --expected-template-class sheet-rolltemplate-initiative-roll`. The new PNG visibly contains only the `Initiative :` rolltemplate.
- DONE: Hardened `capture:roll20-chat-cdp` so it closes overlapping character-sheet dialogs before chat probing/capture by default. Use `--keep-dialogs` only for diagnostic cases where the overlap itself must be inspected.
- DONE: Hardened the generated chat DOM probe so iframe/dialog samples over the selected rolltemplate become overlay candidates instead of passing foreground proof.
- VERIFIED: `diagnose:roll20-chat-refresh` now reports trusted same-structure chat evidence with `chatCaptureSuspects=0`, `chatActualTemplatePixelSuspect=0`, `chatStructure=STRUCTURE_MATCHED`, `chatStructureMismatch=0/3`, `chatSameStructureHighMismatch=2/3`, and `chatSameStructureMaxAlignedMismatch=20.68%`.
- CURRENT: fixture-B is no longer P0 for chat renderer work: `diagnose:roll20-chat-renderer-policy` classifies it as `KEEP_DEFAULT_CHAT_RENDERER` with aligned mismatch `6.34%`. Remaining P0 axes are fixture-A `CHAT_MESSAGE_CONTENT_WIDTH` and fixture-C `TABLE_SCROLL_INTRINSIC`.
- STILL TODO: Build narrow diagnostics/renderer experiments for fixture-A message/content width and fixture-C/CoC table intrinsic sizing. Do not promote a global ChatPane width/font/padding patch.

## 2026-07-12 Les Same-Template Roll20 Chat Recapture Resolved

- DONE: Added `apply:roll20-upload-cdp` as a guarded local-only CDP helper for executing generated Sandbox upload snippets against an explicit dedicated Sandbox/test campaign id. It writes ignored apply results under `reports/.../roll20-upload-handoff/cdp-apply/` and does not treat upload/storage as visual parity.
- DONE: Applied the current `fixture-B` payload to the dedicated Roll20 Sandbox/test campaign `21639681` through the guarded settings-page path, then reopened the Sandbox editor and character dialog.
- DONE: Fixed `capture:roll20-chat-cdp` roll-button clicking so hidden zero-size duplicate buttons do not block visible iframe roll buttons. The tool now tries visible nonzero buttons first and has a DOM click fallback.
- DONE: Updated the chat capture plan/probe so same-template recapture carries `--expected-template-class` and the DOM probe selects the target rolltemplate class before falling back to the largest visible template.
- VERIFIED: Fresh fixture-B targeted capture with `roll_initiative` and expected `sheet-rolltemplate-initiative-roll` passed. `diagnose:roll20-chat-structure` now reports `STRUCTURE_MATCHED`, `chatStructureMismatch=0/3`, and all three chat fixtures are same-structure.
- VERIFIED: Current `status:roll20-actual` remains renderer-held, not done: `rendererReady=NO`, `rendererAction=HOLD_PRODUCTION_RENDERER_PATCH`, `chatSameStructureHighMismatch=3/3`, and `chatSameStructureMaxAlignedMismatch=50.1%`.
- STILL TODO: The blocker has moved from "wrong template captured" to real ChatPane/rolltemplate visual mismatch. Next P0 is per-template Roll20 chat message/content width and table/text layout modeling; do not promote a global ChatPane width/padding/font patch.

## 2026-07-12 Les Same-Template Capture Plan TODO Note

- DONE: Updated `plan:roll20-chat-capture` so chat structure mismatches force a recapture plan even when `roll20-chat.png` and DOM sidecar already exist. fixture-B now plans `roll_initiative` -> `sheet-rolltemplate-initiative-roll` instead of allowing any visible rolltemplate.
- DONE: Updated `preflight:roll20-cdp` to reuse the capture plan's exact `chatCaptureCommand`, so it now prints `--roll-button roll_initiative` for fixture-B instead of a generic capture command.
- DONE: Hardened `capture:roll20-chat-cdp` so a requested `--roll-button` must also appear in the current sheet-frame evidence before capture proceeds.
- VERIFIED: `plan:roll20-chat-capture -- ... fixture-B` reports `NEEDS_CAPTURE` with reason `same-template recapture`. `preflight:roll20-cdp` is `READY` and prints the targeted capture command.
- OBSERVED: Opening `Witrav Upijek` and probing the current Roll20 iframe produced sheet-frame evidence, but `capture:roll20-chat-cdp -- --roll-button roll_initiative` correctly blocked because that evidence did not contain `roll_initiative`. The current Roll20 character/sheet state is not the intended Les same-template state yet.
- STILL TODO: Load/apply the fixture-B fixture state that actually exposes `roll_initiative`, rerun sheet-frame probe until it proves that roll button, then rerun targeted chat capture.

## 2026-07-12 Roll20 Chat Structure-Aware Status TODO Note

- DONE: Updated `status:roll20-actual` so it reports chat structure state separately from raw chat pixel mismatch: `chatStructure=STRUCTURE_MISMATCH_FOUND`, `chatStructureMismatch=1/3`, `chatSameStructureHighMismatch=2/3`, and `chatSameStructureMaxAlignedMismatch=20.68%`.
- DONE: Updated `gate:roll20-renderer-action` so the renderer mismatch blocker excludes structure-mismatched fixture-B from the same-structure count. The gate now reports `2/3` same-structure authoritative chat mismatches instead of treating all `3/3` as renderer CSS evidence.
- VERIFIED: Raw max aligned mismatch still remains `54.1%` because it includes the wrong-template fixture-B capture, but same-structure renderer evidence max is now `20.68%` across fixture-A/fixture-C. The next action remains same-template fixture-B recapture.
- STILL TODO: Recapture fixture-B `sheet-rolltemplate-initiative-roll` in Roll20, then rerun the full chat refresh/status/gate chain.

## 2026-07-12 Roll20 Chat Structure Gate TODO Note

- DONE: Added `corepack pnpm run diagnose:roll20-chat-structure -- reports\roll20-actual-compare\2026-06-18-state-map-v1` to compare local ChatPane rolltemplate class/row/text structure against actual Roll20 chat sidecars before treating pixel diffs as renderer evidence.
- DONE: Wired the structure report into `gate:roll20-renderer-action` and `diagnose:roll20-chat-refresh`, so renderer CSS stays held when actual Roll20 captured a different rolltemplate than the local smoke.
- VERIFIED: Current structure result is `STRUCTURE_MISMATCH_FOUND`: fixture-A `sheet-rolltemplate-aw` rows `2/2` matches, fixture-C `sheet-rolltemplate-coc` rows `7/7` matches, but fixture-B local `sheet-rolltemplate-initiative-roll` rows `3` differs from actual `sheet-rolltemplate-classic-roll` rows `5`.
- CURRENT: fixture-B `54.1%` aligned chat pixel mismatch must not be used as renderer CSS evidence until same-template Roll20 chat evidence is recaptured. The renderer gate now prints this as a blocker.
- STILL TODO: Recapture fixture-B actual chat by targeting the same local smoke roll button/template (`roll_initiative` / `sheet-rolltemplate-initiative-roll`), then rerun `diagnose:roll20-chat-refresh` before continuing ChatPane CSS work.

## 2026-07-12 fixture-A Chat Width Hypothesis TODO Note

- DONE: Tested the fixture-A root-cause hypothesis that local ChatPane needs both Roll20's full-width message/content box and the Roll20-observed `13.65px` fixture-A table font size.
- DONE: Added the diagnostic-only `fixture-a-message-width-font-size` candidate to chat candidate comparison/style-proof plumbing and documented its smoke command. This candidate is not production renderer behavior.
- VERIFIED: Fresh fixture-A-only local captures:
  - default fresh: raw mismatch `26.9%`, best aligned `18.03%`.
  - font-size-only fresh: raw mismatch `27.21%`, best aligned `18.01%`.
  - message-width + font-size: raw mismatch `18.46%`, best aligned `18.46%`, offset `0,0`.
- CURRENT: The combined candidate removes the fixture-A alignment offset and improves raw crop mismatch, but it is still worse than default after alignment (`18.46%` vs `18.03%`) and only has `1/3` fixture coverage. It is classified as `fixture-local-incomplete-coverage`, not a safe renderer fix.
- STILL TODO: fixture-A needs a narrower row/background/crop or exact text/source-order model next. Do not promote the width+font candidate.

## 2026-07-12 Roll20 Chat Diagnostic Refresh TODO Note

- DONE: Added `corepack pnpm run diagnose:roll20-chat-refresh -- reports\roll20-actual-compare\2026-06-18-state-map-v1` so chat parity, current metrics, style/candidate diagnostics, width/message/table models, row/background probes, width reconciliation, and `gate:roll20-renderer-action` are regenerated from the same current evidence set.
- VERIFIED: The refresh command completed successfully after the fixture-A actual chat recapture. Current actual evidence remains complete: `generatedActualScreenshots=6/6`, `generatedDiffed=6/6`, `generatedAuthoritative=YES`, `chatCaptureSuspects=0`, `chatCurrentMetrics=3/3`.
- CURRENT: Renderer is still correctly held: `HOLD_PRODUCTION_RENDERER_PATCH`, `rendererReady=NO`, `chatNormalizedHighMismatch=3`, `chatAlignedHighMismatch=3`, `chatMaxAlignedMismatch=54.1%`.
- CURRENT: Fresh width reconciliation splits the next work into three P0 axes:
  - `fixture-A`: `CHAT_MESSAGE_CONTENT_WIDTH`, aligned mismatch `18.03%`, table delta `+15.75px`; model per-template message/content width, not global ChatPane width.
  - `fixture-B`: `NEW_NARROW_MODEL_REQUIRED`, aligned mismatch `54.1%`; current candidates are rejected/no-gain, and row/text/table structure parity must be compared before CSS promotion.
  - `fixture-c-commission-1bu`: `TABLE_SCROLL_INTRINSIC`, aligned mismatch `20.68%`, table delta `-24.531px`; build a CoC/fixture-C-scoped table intrinsic/font/sanitize model, not transform or broad typography CSS.
- STILL TODO: Implement the next narrow diagnostics/renderer experiments in that order. Do not expose a public chat renderer option or enable production ChatPane CSS until the gate stops reporting split fixture axes and high mismatch.

## 2026-07-12 fixture-A Roll20 Foreground Chat Recapture TODO Note

- DONE: Reapplied `fixture-A` to the dedicated Roll20 Custom Sheet Sandbox (`21639681`) through the guarded settings-page endpoint fallback. The settings page reported `Your changes were saved successfully`, and the snippet reported no translation JSON parse error and no Roll20 editor parse error.
- DONE: Reopened the sandbox character through `open:roll20-character-cdp` and saved fresh fixture-A sheet-frame DOM evidence: `probe:roll20-sheet-frame` returned `VISIBLE_MATCH`, frame `Character sheet for Witrav Upijek`, `sheetHitCount=92`, `rootCount=3`, `attrCount=486`, and `rollButtonCount=13`.
- DONE: Captured foreground fixture-A Roll20 chat evidence with `capture:roll20-chat-cdp -- --fixture fixture-A`. The capture wrote fresh ignored `roll20-chat.png` and `roll20-chat-dom-evidence.json`.
- DONE: Tightened CDP page selection in `probe:roll20-sheet-frame`, `capture:roll20-chat-cdp`, and `open:roll20-character-cdp` so `/editor` is preferred over `/editor/character/...` popout pages. This prevents empty popout shells from being mistaken for the active VTT editor.
- VERIFIED: `status:roll20-actual` now reports `generatedActualScreenshots=6/6`, `generatedDiffed=6/6`, `generatedAuthoritative=YES`, `chatCaptureSuspects=0`, `chatNormalizedCompared=3/3`, and `chatNeedsNormalizedCapture=0`.
- CURRENT: `diagnose:roll20-chat-parity` now compares all 3 chat fixtures and reports high rolltemplate-crop mismatch for all three: fixture-A `26.9%`, fixture-B `58.73%`, fixture-C `24.73%`. Renderer remains `HOLD_PRODUCTION_RENDERER_PATCH`; the blocker has moved from missing evidence to real ChatPane/rolltemplate mismatch.
- STILL TODO: Build the next renderer investigation around actual Roll20 chat shell/message/template width and table intrinsic sizing. Do not promote a single global ChatPane width/padding/font patch while fixture deltas conflict.

## 2026-07-12 fixture-C Roll20 Foreground Chat Recapture TODO Note

- DONE: Used only the dedicated Roll20 Custom Sheet Sandbox/test-room editor (`Codex Roll20 Verify`, campaign `21639681`) and opened the sandbox character through Roll20's own `Campaign.characters` viewer path. Existing real rooms were not edited.
- DONE: Saved fresh fixture-C sheet-frame DOM evidence after the character iframe opened: `probe:roll20-sheet-frame` returned `VISIBLE_MATCH`, frame `Character sheet for Witrav Upijek`, `sheetHitCount=65`, `rootCount=3`, `attrCount=1069`, and `rollButtonCount=808`.
- DONE: Clicked a fixture-C roll button in that loaded character sheet, closed the overlapping character dialog, and recaptured foreground Roll20 chat evidence with `capture:roll20-chat-cdp -- --fixture fixture-c-commission-1bu --skip-click`. The capture wrote fresh ignored `roll20-chat.png` and `roll20-chat-dom-evidence.json`.
- DONE: Added `scripts/roll20_character_cdp_open.mjs` plus `open:roll20-character-cdp` so future actual-screen sessions can list/open/close sandbox characters before running the sheet-frame probe.
- VERIFIED: `node scripts\roll20_actual_screenshot_diff.mjs reports\roll20-actual-compare\2026-06-18-state-map-v1` now diffs fixture-C chat (`42.73%` screenshot mismatch). `diagnose:roll20-chat-parity` now compares 2/3 chat fixtures and reports fixture-C normalized rolltemplate mismatch `24.73%`.
- CURRENT: `status:roll20-actual` improved to `generatedActualScreenshots=5/6` and `generatedDiffed=5/6`. `fixture-A` still lacks trustworthy foreground chat evidence, so `rendererReady=NO` and `rendererAction=HOLD_PRODUCTION_RENDERER_PATCH` remain correct.
- STILL TODO: Apply/open the fixture-A fixture in the dedicated sandbox, prove its sheet iframe with `probe:roll20-sheet-frame`, then recapture fixture-A foreground `roll20-chat.png` with a fresh sidecar.

## 2026-06-21 Codex Update - fixture-A live Roll20 chat observation, extension screenshot blocked

Status: VERIFY/BLOCKED_CAPTURE_PATH. This batch used the logged-in Roll20 editor tab and did not edit existing room/settings/source. It observed live fixture-A sheet/chat behavior, but did not add trusted Roll20 chat visual evidence.

- OBSERVED: The dedicated Roll20 editor tab opened the `Yadunka Esowhaz` character sheet iframe. The iframe contained fixture-A sheet markers: `sheetCount=3`, `attrCount=486`, `rollCount=13`, and Playbook/Hardholder text.
- OBSERVED: Clicking `roll_dsuf`, submitting the Roll20 `Macro Options` modal with default `0`, and switching to the chat tab produced a visible `.sheet-rolltemplate-aw` message. DOM foreground probing found `elementFromPoint` hits on the selected TABLE/TH/TD rolltemplate nodes.
- BLOCKED: Chrome extension `tab.screenshot()` still returned JPEG bytes for `.png` filenames and did not capture the visible right-side text chat surface in the saved page screenshot. A trial crop caught Roll20 UI/Sandbox Tools instead of the rolltemplate and was removed immediately.
- DONE: `scripts/roll20_chrome_observation_audit.mjs` now also accepts a `local-baseline/<fixture>/screenshots` folder with `roll20-chat-dom-evidence.json`, so page-only extension screenshots are explicitly classified as observation-only instead of trusted chat evidence.
- CURRENT STATUS: fixture-A remains missing trusted canonical `roll20-chat.png`; recapture still needs CDP or a verified screenshot adapter that visibly captures the foreground text chat panel.

## 2026-06-21 Codex Update - Roll20 chat recapture handoff ordering

Status: DONE/VERIFY_HANDOFF_ORDER. This batch updated the Roll20 recapture plans so every chat recapture handoff now tells agents to prove the character-sheet iframe before capturing chat.

- DONE: `plan:roll20-chat-capture` now includes `sheetFrameEvidence`, `sheetFrameProbeCommand`, and `chatCaptureCommand` per fixture.
- DONE: The generated chat recapture Markdown table now shows the required `roll20-sandbox-dom-evidence.json` path, and each checklist tells agents to run `probe:roll20-sheet-frame` before `capture:roll20-chat-cdp`.
- DONE: `handoff:roll20-chat-current` now surfaces the sheet-frame probe command and gated chat capture command for each stale fixture.
- DONE: `handoff:roll20-upload` upload order now includes sheet-frame probing before root/chat evidence capture.
- VERIFIED: `node --check` passed for `roll20_chat_capture_plan`, `roll20_chat_current_handoff`, and `roll20_upload_handoff`. `test:roll20-chat-capture-plan`, `handoff:roll20-chat-current`, and `handoff:roll20-upload -- ... fixture-A --missing-only` passed.
- CURRENT STATUS: fixture-A and fixture-C still need trusted foreground chat recapture; this batch improves the handoff/order and does not add new screenshots.

## 2026-06-21 Codex Update - Roll20 chat capture requires sheet-frame evidence

Status: DONE/VERIFY_CHAT_CAPTURE_GATE. This batch hardened the actual Roll20 chat capture path so rolltemplate screenshots cannot be captured for an unproven or wrong character-sheet iframe.

- DONE: `capture:roll20-chat-cdp` now requires positive `roll20-sandbox-dom-evidence.json` from `probe:roll20-sheet-frame` before it clicks a roll button or captures `roll20-chat.png`.
- DONE: The gate rejects missing, malformed, wrong-fixture, non-`VISIBLE_MATCH`, or generic-root-only sheet evidence. It requires expected fixture markers such as generated `attr_`, `roll_`, or visible sheet text tokens.
- DONE: Successful chat sidecars now include a summary of the sheet-frame evidence used for that capture.
- VERIFIED: `node --check scripts\roll20_chat_cdp_capture.mjs`, `corepack pnpm run test:roll20-chat-cdp-readiness`, `corepack pnpm run capture:roll20-chat-cdp -- --run-dir reports\roll20-actual-compare\2026-06-18-state-map-v1 --fixture fixture-A --plan-only`, `corepack pnpm run test:roll20-sheet-frame-probe`, `corepack pnpm run test:roll20-upload-snippet`, `corepack pnpm run lint`, `corepack pnpm run build`, and `corepack pnpm run guard:roll20-evidence -- reports\roll20-actual-compare\2026-06-18-state-map-v1` passed.
- OBSERVED: `capture:roll20-chat-cdp --dry-run` still reports `BLOCKED_CDP_ENDPOINT` because `127.0.0.1:9222` is not listening in the current desktop state.
- VERIFY NEXT: Start/attach a CDP-enabled Roll20 tab, run `probe:roll20-sheet-frame`, then rerun `capture:roll20-chat-cdp` for fixture-A and fixture-C.
- CLAIM BOUNDARY: This prevents false chat capture. It does not add new trusted `roll20-chat.png` evidence and does not change renderer readiness.

## 2026-06-21 Codex Update - Roll20 sheet frame DOM evidence tool

Status: VERIFY/CHAT_RECAPTURE_STILL_NEEDED. This batch added a reusable frame-aware CDP probe for the Roll20 character-sheet iframe. It does not add visual parity or trusted chat screenshots.

- DONE: Added `scripts/roll20_sheet_frame_probe.mjs` and package scripts `probe:roll20-sheet-frame` / `test:roll20-sheet-frame-probe`.
- DONE: The probe reads generated payload hints, inspects Roll20 top page plus child frames, and writes `roll20-sandbox-dom-evidence.json` only when expected fixture markers are found in the character-sheet iframe.
- SAFETY: The probe refuses to save positive evidence for generic roots alone; expected payload hits (`attr_`, `roll_`, or visible text tokens) outrank generic root/attr counts.
- OBSERVED: Current normal CDP endpoint `127.0.0.1:9222` is closed, so `probe:roll20-sheet-frame --dry-run` reports `BLOCKED_CDP_ENDPOINT` in this desktop state.
- OBSERVED: Through the logged-in Chrome MCP path, opening the dedicated Roll20 editor and a test character again showed fixture-A in the character iframe: `rootCount=3`, `attrCount=486`, `rollButtonCount=13`, and Playbook markers.
- LOCAL EVIDENCE: Saved ignored local `roll20-sandbox-dom-evidence.json` for `fixture-A` from that frame-aware observation. This is DOM evidence only and must not be committed.
- VERIFIED: `node --check scripts\roll20_sheet_frame_probe.mjs`, `corepack pnpm run test:roll20-sheet-frame-probe`, `corepack pnpm run test:roll20-upload-snippet`, `corepack pnpm run lint`, `corepack pnpm run build`, and `corepack pnpm run guard:roll20-evidence -- reports\roll20-actual-compare\2026-06-18-state-map-v1` passed.
- CURRENT STATUS: `status:roll20-actual` still reports `rendererReady=NO`, `rendererAction=HOLD_PRODUCTION_RENDERER_PATCH`, `generatedActualScreenshots=4/6`, `generatedDiffed=4/6`, and missing/suspect chat foreground evidence for `fixture-A` and `fixture-c-commission-1bu`.
- VERIFY NEXT: Use a CDP-enabled browser or a verified Chrome-extension foreground crop adapter to recapture fixture-A/fixture-C `roll20-chat.png` with fresh `roll20-chat-dom-evidence.json`.
- CLAIM BOUNDARY: Sheet iframe DOM activation is proven for the observed fixture-A tab, but no screenshot parity or chat parity is proven.

## 2026-06-21 Codex Update - Roll20 sheet iframe activation routing

Status: VERIFY/FRAME_AWARE_ACTIVATION_NEEDED. This batch rechecked the live Roll20 editor after the earlier fixture-A `CHAT_TEMPLATE_ONLY`/`NOT_PROVEN` result and found that the sheet body can live inside the character-sheet iframe even when the top document has zero sheet markers.

- OBSERVED: The visible Roll20 top document had `charsheet=0`, `sheetform=0`, `attr=0`, `roll=0`, `charactereditor=1`, and chat rolltemplate classes. This explains why top-document-only activation checks reported no sheet body.
- OBSERVED: After closing the unsaved character edit dialog with `Cancel`, the character viewer dialog exposed an iframe titled `Character sheet for Yadunka Esowhaz`.
- OBSERVED: A frame-aware browser probe of that iframe found fixture-A sheet content: `attrCount=486`, `rollCount=13`, `charsheetCount=3`, and visible text beginning `Name: Playbook: Lock/Unlock Playbook Angel...`.
- DONE: Updated `scripts/roll20_upload_snippet.mjs` so generated activation checks inspect same-context character-sheet iframes when possible and otherwise report `SHEET_IFRAME_PRESENT_NEEDS_FRAME_PROBE` instead of collapsing the case into `CHAT_TEMPLATE_ONLY` or `NOT_PROVEN`.
- DONE: Added `CHARACTER_DIALOG_NO_SHEET_BODY` for the case where a character dialog/edit shell is open but the sheet iframe/body is not visible yet.
- DONE: Updated `scripts/README.md` and `test:roll20-upload-snippet` to document and guard the new activation statuses.
- VERIFIED: `node --check scripts\roll20_upload_snippet.mjs`, `corepack pnpm run test:roll20-upload-snippet`, `corepack pnpm run snippet:roll20-upload -- reports\roll20-actual-compare\2026-06-18-state-map-v1 fixture-A`, `corepack pnpm run lint`, and `corepack pnpm run build` passed.
- CURRENT STATUS: `status:roll20-actual` still reports `rendererReady=NO`, `rendererAction=HOLD_PRODUCTION_RENDERER_PATCH`, `generatedActualScreenshots=4/6`, and missing/suspect chat evidence for `fixture-A` and `fixture-c-commission-1bu`.
- VERIFY NEXT: Add or use a frame-aware capture/probe path for actual root/chat evidence. Top-document browser snippets alone are not enough on current Roll20 because the character sheet body may be iframe-contained.
- CLAIM BOUNDARY: This proves the current live Roll20 tab can expose fixture-A controls in a character-sheet iframe. It does not prove visual parity, does not add a trusted screenshot, and does not unblock renderer production changes by itself.

## 2026-06-21 Codex Update - Roll20 settings manifest shape recheck

Status: VERIFY/BLOCKED_ACTIVATION. This batch rechecked the live Roll20 Custom Sheet Sandbox settings path while trying to continue fixture-A/fixture-C trusted chat recapture; it does not add new trusted chat screenshots and does not change product rendering.

- DONE FOLLOW-UP: Cleaned product-facing Korean copy in `MainAreaToolbar` and `PreviewEmptyState`, replacing mojibake mode labels/tooltips and empty-preview guidance with clear local-preview wording.
- DONE FOLLOW-UP: Replaced temporary text-symbol mode markers in `MainAreaToolbar` with lucide icons (`PencilRuler`, `PanelsLeftRight`, `Blocks`, `Eye`) while keeping text labels visible.
- DONE FOLLOW-UP: Cleaned `PreviewToolbar` Korean labels/tooltips/aria text and removed the dead refresh button that had no action handler. The legacy Roll20 CSS toggle remains available.
- DONE FOLLOW-UP: Cleaned product-facing Korean copy and ARIA labels in `Statusbar` and `SidebarLeft`, replacing mojibake block/save/autosave/workspace/sidebar labels with readable app copy.
- VERIFIED FOLLOW-UP: `guard:ui-copy`, `lint`, `build`, and `smoke:edit-flow -- --port 4210` passed. The smoke reported `editUiCopy.hasMojibakeHan=false`.
- DONE FOLLOW-UP: Added `corepack pnpm run test:roll20-upload-snippet`, a self-test that fails if the settings-page manifest builder regresses from `{ sheet, userOptions, jsoninfo }` back to plain exported `sheet.json`.
- VERIFIED FOLLOW-UP: `test:roll20-upload-snippet` passed and regenerated fixture-A upload snippet reports `shape=wrapped-jsoninfo`.
- DONE FOLLOW-UP: Upload snippets now classify a Roll20 `/editor` JSON parse failure as `ROLL20_EDITOR_PARSE_ERROR`, separate from ordinary `NOT_PROVEN` activation.
- DONE FOLLOW-UP: `snippet:roll20-upload` now also generates matching `/editor` `*-activation-check-snippet.js` files, and the self-test verifies the activation statuses `VISIBLE_MATCH`, `ROLL20_EDITOR_PARSE_ERROR`, and `NOT_PROVEN`.
- DONE FOLLOW-UP: `snippet:roll20-upload` now supports explicit `--apply-settings --endpoint-campaign-id <id>` generation. Default snippets remain non-submitting; apply snippets enable endpoint fallback and settings save only when the dedicated Sandbox/test campaign id is provided.
- DONE FOLLOW-UP: Corrected `docs/operations/37_roll20_actual_verification.md`; it now matches the 2026-06-21 live finding that plain `sheet.json` is the known-bad settings fallback shape and `{ sheet, userOptions, jsoninfo }` is the current guarded path.
- OBSERVED FOLLOW-UP: A live fixture-A apply attempt posted HTML/CSS/translation with `200`, but `/editor` returned a Roll20 JSON parse error. Inspecting settings showed `customcharsheet_json` contained two JSON objects concatenated as `}{`, caused by the upload snippet writing both the submitted manifest field and an Ace text-input mirror.
- DONE FOLLOW-UP: Narrowed the generated manifest setter to submitted `textarea/input[name="customcharsheet_json"]` controls and stopped writing `.ace_text-input[name="customcharsheet_json"]`. `test:roll20-upload-snippet` now fails if that broad Ace mirror write returns.
- OBSERVED FOLLOW-UP: After regenerating and applying the fixed fixture-A snippet in the dedicated Sandbox, `customcharsheet_json` stayed parseable with `concatIndex=-1`, `/editor` no longer returned the Roll20 parse error, and `sheet-rolltemplate-aw` appeared in chat. However, sheet body markers were still absent (`charsheetCount=0`, `rollButtonCount=0`, attrs/text hits 0), so this is not sheet-root activation proof.
- DONE FOLLOW-UP: Tightened activation checks so rolltemplate-only evidence becomes `CHAT_TEMPLATE_ONLY` instead of `VISIBLE_MATCH`. Sheet-root evidence now requires expected roll buttons, attrs, or text tokens.
- OBSERVED: The original Roll20 editor tab was still logged in and showed fixture-B chat templates with `devicePixelRatio=1.25`.
- OBSERVED: The claimed original tab's CDP capability was blocked by `paused document response`, but a fresh temporary Chrome tab opened to `https://app.roll20.net/sheetsandbox/settings/21639681` had working tab-scoped CDP.
- OBSERVED: Applying fixture-A with the generated snippet's current plain `customcharsheet_json` value posted HTML/CSS/translation with `200`, but `/editor` returned a Roll20 JSON parse error: `unexpected token at '{ "html": "sheet.html", ... }'`.
- RECOVERED: Reapplied fixture-B using the settings-page wrapper shape `{ sheet, userOptions, jsoninfo }`; `/editor` loaded again and visible chat had `sheet-rolltemplate-classic-roll` entries. This recovered the dedicated verification sandbox from the plain-manifest error state.
- PARTIAL: Applying fixture-A with the wrapper shape no longer crashed `/editor`, but no fixture-A sheet/roll button activation was visible in the checked editor DOM. fixture-A trusted chat recapture is still blocked until visible activation is proven.
- OBSERVED: The live Roll20 editor tab activation checker returned `NOT_PROVEN` for both `fixture-A` and `fixture-c-commission-1bu`; the visible tab still showed fixture-B rolltemplate classes and no sheet/roll-button markers for those fixtures.
- BLOCKED: The current Chrome tab could not execute the apply snippet automatically: tab CDP was blocked by a paused document response, and the read-only page execution surface disables `eval`/`Function`.
- DONE: Updated `scripts/roll20_upload_snippet.mjs` and `scripts/README.md` so settings-page snippets write the wrapper shape again and warn that the plain exported `sheet.json` text caused a live `/editor` parse error on 2026-06-21.
- NEXT P0: Run the generated apply snippet in the dedicated Sandbox settings page with a CDP-capable/manual console path, then run the activation checker after save/reload for fixture-A/fixture-C and only recapture `roll20-chat.png` when it returns `VISIBLE_MATCH` and the visible sheet/chat belongs to the intended fixture.

## 2026-06-21 Codex Update - fixture-B trusted chat recapture

Status: VERIFY/HOLD_RENDERER. This batch captured one trusted Roll20 chat PNG/sidecar pair for fixture-B through the logged-in Chrome tab CDP capability; it does not prove chat parity and does not change product rendering.

- DONE: Ran the generated fixture-B DOM probe through tab-scoped CDP `Runtime.evaluate`. It returned `templateForegroundEvidence=FOREGROUND_TEMPLATE_HIT`, `templateHitRatio=1`, `chatSelector=#textchat`, `chatElementSelector=#textchat`, and no overlay candidates.
- DONE: `Page.captureScreenshot` with the raw CSS clip captured Sandbox Tools, proving again that this Roll20 tab needs DPR correction. Capturing the physical DPR clip, then downscaling to CSS size, produced a true PNG foreground rolltemplate crop.
- DONE: Saved ignored local evidence to `reports/roll20-actual-compare/2026-06-18-state-map-v1/local-baseline/fixture-B/screenshots/roll20-chat.png` and `roll20-chat-dom-evidence.json`. The sidecar records `captureDprCorrection.applied=true`.
- VERIFIED: `roll20_actual_screenshot_diff` now diffs fixture-B chat. `diagnose:roll20-chat-parity` now compares 1/3 normalized chat fixtures and reports fixture-B high mismatch: actual `267x180` vs local `267x84`, aligned mismatch `54.1%`.
- VERIFIED: `status:roll20-actual` improved to `generatedActualScreenshots=4/6`, `generatedDiffed=4/6`, `chatCaptureSuspects=2`, `chatNeedsNormalizedCapture=2`. Remaining chat recaptures: fixture-A and fixture-C.
- NEXT P0: Recapture fixture-A and fixture-C with the same foreground+DPR-corrected path. Keep renderer action on HOLD; fixture-B now has real mismatch evidence, not parity.

## 2026-06-21 Codex Update - chat sidecar foreground evidence gate

Status: DONE/VERIFY. This batch makes `templateForegroundEvidence` mandatory for trusting Roll20 chat sidecars; it does not add fresh Roll20 screenshots.

- DONE: `validateChatForeground` in `roll20_chat_capture_plan`, `roll20_actual_status`, `roll20_chat_parity_diagnostics`, and `roll20_upload_handoff` now rejects sidecars captured before `templateForegroundEvidence` existed.
- DONE: Existing sidecars without `templateForegroundEvidence` are classified as foreground-suspect / needs-normalized-capture instead of being treated as normalized chat visual evidence.
- VERIFIED: `diagnose:roll20-chat-parity` now reports `NEEDS_NORMALIZED_CAPTURE` for all 3 chat fixtures because fixture-A, fixture-B, and fixture-C sidecars predate the foreground proof field.
- VERIFIED: `status:roll20-actual` now reports `PARTIAL_GENERATED_ACTUAL_SCREENSHOTS`, `generatedActualScreenshots=3/6`, `generatedDiffed=3/6`, `chatCaptureSuspects=3`, `chatNeedsNormalizedCapture=3`, and missing generated chat evidence for all 3 fixtures.
- VERIFIED: `plan:roll20-chat-capture --require-current-metrics` now plans 3/3 recaptures and says each one needs `templateForegroundEvidence`.
- NEXT P0: Recapture fixture-A, fixture-B, and fixture-C chat evidence through a trusted Roll20 path. Each sidecar must include `templateForegroundEvidence=FOREGROUND_TEMPLATE_HIT`, current typography/table metrics, and a fresh true-PNG `roll20-chat.png`.

## 2026-06-21 Codex Update - chat capture foreground probe hardening

Status: DONE/VERIFY. This batch hardens the Roll20 chat recapture path; it does not add a new trusted Roll20 screenshot and does not change product rendering.

- DONE: `scripts/roll20_chat_capture_plan.mjs` now emits `templateForegroundEvidence` in generated browser DOM probe snippets. The probe samples `document.elementFromPoint` across the selected rolltemplate clip and records known overlay candidates such as Sandbox Tools, HTML/CSS/Translation controls, reload/session banners, and other intersecting page elements.
- DONE: `scripts/roll20_chat_cdp_capture.mjs` now refuses to save `roll20-chat.png` when the DOM sidecar is missing `templateForegroundEvidence` or when its status is not `FOREGROUND_TEMPLATE_HIT`.
- VERIFIED: `test:roll20-chat-capture-plan`, `test:roll20-chat-cdp-readiness`, and the fixture-B `plan:roll20-chat-capture --require-current-metrics` passed. The regenerated fixture-B snippet contains `templateForegroundEvidence`, `FOREGROUND_TEMPLATE_HIT`, and `overlayCandidates`.
- VERIFIED: `capture:roll20-chat-cdp --plan-only` still prints the expected fixture-B target paths and suggested roll buttons.
- NEXT P0: Open a CDP-enabled logged-in Roll20 Sandbox/test-room tab and rerun the real capture. The next capture must satisfy both foreground DOM evidence and foreground pixel sanity before renderer work can continue.

## 2026-06-21 Codex Update - Chrome observation audit guard

Status: DONE/VERIFY. This batch adds a guard for Chrome-extension Roll20 observations; it does not prove Roll20 visual parity and does not change product rendering.

- DONE: Added `scripts/roll20_chrome_observation_audit.mjs` and `corepack pnpm run audit:roll20-chrome-observation`.
- DONE: The audit reads local-only `chrome-extension-roll20-observation` folders and classifies DOM-template-only evidence, session-refresh markers, `.png` filenames containing JPEG bytes, direct template clips from the untrusted extension screenshot path, and selected clip/chat-root/template coordinate consistency.
- VERIFIED: The self-test passed. Running the audit on `fixture-B/after-refresh` returned `OBSERVATION_ONLY_BLOCKED_CAPTURE_PATH`, `domTemplates=3`, `trustedCapture=NO`, and named the false-proof reasons: session-refresh markers remain and the extension screenshot files are JPEG bytes despite `.png` filenames.
- LOCAL EVIDENCE: Ignored audit output was written under `reports/roll20-actual-compare/2026-06-18-state-map-v1/chrome-extension-roll20-observation/fixture-B/after-refresh/chrome-observation-audit/`.
- NEXT P0: Use this audit before considering any Chrome-extension Roll20 observation as evidence. fixture-B still needs trusted CDP capture or a separately verified full-screenshot crop adapter that emits true foreground PNG evidence tied to the visible text chat panel.

## 2026-06-21 Codex Update - Roll20 Chrome observation capture boundary

Status: VERIFY/BLOCKED_CAPTURE_PATH. This batch observed the logged-in Roll20 Sandbox/editor tab through the Chrome extension path; it does not prove Roll20 visual parity and does not change product rendering.

- OBSERVED: The open Chrome Roll20 tab is `Codex Roll20 Verify | Roll20` at `https://app.roll20.net/editor`. After clicking the visible Roll20 `Reload` session-refresh control, the tab returned to a normal `1843x968` CSS viewport with the dedicated Sandbox editor visible.
- OBSERVED: Read-only DOM/hit-test evidence found visible fixture-B chat templates in Roll20: two `.sheet-rolltemplate-classic-roll` cards and one `.sheet-rolltemplate-initiative-roll`; `elementFromPoint` over the measured card coordinates hit `.sheet-template-header` / `.sheet-template-first-col`.
- BLOCKED: Chrome extension `tab.screenshot({ clip })` did not produce trustworthy template pixels. Raw DOM coordinates captured `Sheet Sandbox Tools` / VTT UI instead of the rolltemplate, and a browser-zoom-corrected clip still missed the template. These PNGs remain ignored local evidence only and must not be promoted as Roll20 parity proof.
- BLOCKED: The tab-scoped CDP capability could not run `Page.captureScreenshot`; it reported that raw CDP is unavailable while Browser Use is resolving a paused document response. The normal `127.0.0.1:9222` CDP endpoint still remains the required trusted capture path unless a dedicated extension screenshot adapter is added and verified.
- LOCAL EVIDENCE: Ignored observations were written under `reports/roll20-actual-compare/2026-06-18-state-map-v1/chrome-extension-roll20-observation/fixture-B/`.
- NEXT P0: Keep `rendererAction=HOLD_PRODUCTION_RENDERER_PATCH` until fixture-B has a same-action trusted foreground chat capture. Prefer a CDP-enabled logged-in Roll20 Sandbox/test-room tab; alternatively implement and verify a Chrome-extension full-screenshot crop adapter that accounts for Roll20 zoom/coordinate transforms and overlapping Sandbox Tools.

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
- DONE: `scripts/roll20_chat_capture_plan.mjs` now selects a visible/text-rich rolltemplate for recapture instead of blindly using the latest template. This avoids fixture-B choosing the sparse `Initiative` card when richer `classic-roll` templates are visible.
- DONE: `scripts/roll20_chat_cdp_capture.mjs` now probes Roll20 frames for usable rolltemplate evidence and records both `screenshotCssClip` (DOM/frame-local clip) and `screenshotClipApplied` (top-level screenshot clip after frame offset). The sidecar also records `captureFrame`.
- OBSERVED: Chrome extension read-only evidence shows the current Roll20 page can report chat DOM coordinates around `x=50` while the visible full-page screenshot shows the chat panel on the far right. This confirms the old crop path could capture Sandbox Tools/VTT UI instead of the rolltemplate.
- VERIFIED: `node --check scripts\roll20_chat_capture_plan.mjs`, `node --check scripts\roll20_chat_cdp_capture.mjs`, `corepack pnpm run test:roll20-chat-capture-plan`, `corepack pnpm run test:roll20-chat-cdp-readiness`, and `corepack pnpm run plan:roll20-chat-capture -- reports\roll20-actual-compare\2026-06-18-state-map-v1 fixture-B --require-current-metrics` passed.
- CURRENT STATUS: `corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1` still reports `GENERATED_ACTUAL_SCREENSHOTS_DIFFED_WITH_SUSPECT_CHAT`, `generatedActualScreenshots=6/6`, `generatedDiffed=6/6`, `chatCurrentMetrics=3/3`, `chatActualTemplatePixelSuspect=1`, `generatedAuthoritative=NO`, `rendererAction=HOLD_PRODUCTION_RENDERER_PATCH`, and `rendererReady=NO`.
- BLOCKED: `corepack pnpm run capture:roll20-chat-cdp -- --run-dir reports\roll20-actual-compare\2026-06-18-state-map-v1 --fixture fixture-B --skip-click --dry-run` still reports `BLOCKED_CDP_ENDPOINT` because `127.0.0.1:9222` is not listening. No new trusted Roll20 `roll20-chat.png` was captured in this batch.
- NEXT P0: Open a CDP-enabled logged-in Roll20 Sandbox/test-room tab or add a separate Chrome-extension full-screenshot crop path, then recapture fixture-B chat so `chatActualTemplatePixelSuspect` drops to `0` before any ChatPane renderer tuning.

## 2026-06-20 Codex Update - Roll20 sandbox settings chat recapture

Status: VERIFY/HOLD_RENDERER. This batch used the dedicated Roll20 Sandbox settings page, not existing real rooms, to refresh actual Roll20 chat evidence.

- DONE/OBSERVED: Opened `https://app.roll20.net/sheetsandbox/settings/21639681`; the page exposes `#settingsform`, `#save-changes-button`, `textarea[name="customcharsheet_json"]`, and Ace `editors.json`.
- DONE/OBSERVED: The normal Chrome file chooser route is still blocked by extension file access (`fileChooser.setFiles failed: Not allowed`), but the dedicated settings fallback can set plain exported `sheet.json`, update `editors.json`, POST HTML/CSS/translation to `/sheetsandbox/savesheetsettings`, and save the sandbox form.
- DONE: Reapplied `fixture-B` and `fixture-A` in the dedicated sandbox only. Editor reload showed matching Roll20 chat templates (`sheet-rolltemplate-classic-roll` / `sheet-rolltemplate-initiative-roll` for Les, `sheet-rolltemplate-aw` for fixture-A).
- DONE: Recaptured fixture-A and Les Roll20 chat PNG/DOM sidecars under ignored local reports. `corepack pnpm run diagnose:roll20-chat-current-metrics -- reports\roll20-actual-compare\2026-06-18-state-map-v1` now reports `PASS`, `fixtures=3/3 current`, `missingFields=0`.
- CURRENT STATUS: `status:roll20-actual` now reports `chatCurrentMetrics=3/3` and `chatCurrentMetricsMissing=0`; this removes the previous fixture-A/Les missing-filter-field blocker.
- STILL BLOCKED: Renderer action remains `HOLD_PRODUCTION_RENDERER_PATCH`. Current status is `GENERATED_ACTUAL_SCREENSHOTS_DIFFED_WITH_SUSPECT_CHAT`, `generatedAuthoritative=NO`, `chatCaptureSuspects=2`, `chatActualCaptureScaleSuspect=1`, `chatActualTemplatePixelSuspect=1`, and `rendererReady=NO`.
- NEXT P0: Fix the remaining Les chat foreground/crop capture suspicion and then continue chat renderer model work from measured differences, not from broad CSS guesses. Do not claim visual parity.

## 2026-06-20 Codex Update - Roll20 sandbox snippet recheck

Status: VERIFY/BLOCKED_UPLOAD_APPLICATION. This batch rechecked the live Roll20 dedicated sandbox tab and corrected stale script documentation.

- OBSERVED: No project dev server/CDP endpoint was listening on `3000`, `3001`, `3002`, or `9222`. Remaining listeners were Discord, Steam, OneDrive, Wacom, VS Code, system, or security-related processes and were not stopped.
- OBSERVED: The only open Roll20 tab is `Codex Roll20 Verify | Roll20` at `https://app.roll20.net/editor`. `Sheet Sandbox Tools` is visible, and `#sheetHtml`, `#sheetCss`, and `#sheetTranslation` exist.
- BLOCKED/OBSERVED: Running the latest fixture-B upload snippet in the dedicated sandbox tools dispatched all three generated files, but the activation probe found `0` expected visible markers after upload. Result status: `FILE_INPUTS_DISPATCHED_BUT_VISIBLE_MATCH_NOT_PROVEN`.
- LOCAL EVIDENCE: Ignored report saved at `reports/roll20-actual-compare/2026-06-18-state-map-v1/roll20-upload-handoff/fixture-B-current-snippet-result.json`.
- DONE: Fixed stale `scripts/README.md` wording. It now says the Roll20 upload snippet fills `customcharsheet_json` with the plain exported `sheet.json` text and explicitly warns not to wrap it as `{ sheet, userOptions, jsoninfo }`.
- STILL TODO P0: Open the dedicated Sandbox settings/save path or use the real file chooser route so the generated fixture visibly reloads expected sheet markers, then recapture fixture-A and fixture-B same-action `roll20-chat.png` plus current `roll20-chat-dom-evidence.json`.
- CLAIM BOUNDARY: File-input dispatch is not Roll20 rendering proof. Do not use this snippet attempt for screenshot/chat parity or renderer CSS promotion.

## 2026-06-20 Codex Update - final rendered resource gate for imported edit smoke

Status: DONE/VERIFY. This batch separates transient request aborts during edit/reimport from actual final missing images/backgrounds.

- DONE: `smoke:imported-edit-sync` now collects final rendered resource state from both edit Shadow DOM and preview iframe after the edit/reimport path settles.
- DONE: The final gate checks visible `<img>` nodes and computed CSS `background-image` URLs. It records failed image/background counts in the ignored smoke report.
- DONE: Resource requests that only failed as `net::ERR_ABORTED` image requests are now classified as `transient-aborted-images-final-rendered` only when final edit and preview resources both pass.
- VERIFIED: Full `corepack pnpm run smoke:imported-edit-sync:strict -- --port 4196` passed for fixture-A, fixture-B, synthetic-nonleaf-flow, and fixture-C 1BU.
- LOCAL RESULT: fixture-A and synthetic are `clean`; fixture-B and fixture-C 1BU are `transient-aborted-images-final-rendered` with final edit/preview failures `0 img/0 bg`.
- VERIFIED: `corepack pnpm run budget:imported-edit -- --port 4199` now reports overall `PASS`; fixture-C 1BU import total was about `4992.1ms`, under the current warn budget.
- STILL TODO P0: This is local app edit/preview evidence only. Actual Roll20 Sandbox/test-room screenshot/chat recapture remains required before visual parity or renderer-production claims.

## 2026-06-20 Codex Update - browser asset diagnostics for imported edit resources

Status: VERIFY. This batch improves resource diagnostics only; it does not prove Roll20 visual parity or change production renderer behavior.

- DONE: `scripts/roll20_asset_resource_audit.mjs` now supports `--browser-probe true`, which launches Chromium and checks image-like HTTP refs with actual browser image loading after the existing HTTP probe.
- DONE: Added `corepack pnpm run audit:assets:browser` and documented it in `scripts/README.md`.
- DONE: Browser smoke resource summaries now preserve Playwright `request.failure().errorText`, so reports show concrete causes such as `net::ERR_ABORTED` instead of only `failed image imgur.com`.
- VERIFIED: `node --check` passed for the changed scripts. `audit:assets:browser` against `reports\roll20-actual-compare\2026-06-18-state-map-v1` reported 0 failed HTTP probes, 0 failed browser image probes, and 0 missing local refs for fixture-A, fixture-B, and fixture-C 1BU source/payload refs.
- LOCAL RESULT: Strict imported-edit smoke still fails only on resource status for affected fixtures, while interaction remains PASS. fixture-B reports `1x failed image raw.githubusercontent.com (net::ERR_ABORTED)` and fixture-C reports `11x failed image imgur.com (net::ERR_ABORTED)`.
- INTERPRETATION: Current evidence does not show dead image URLs. The remaining resource WARN is more likely a render-context/request-abort or DOM replacement timing issue in the imported edit smoke. Do not count it as actual Roll20 visual parity failure until final rendered image/background state is checked.
- DONE FOLLOW-UP: The final-render resource gate now exists in `smoke:imported-edit-sync`; keep extending it if more resource classes appear.
- STILL TODO P0: Actual Roll20 Sandbox/test-room upload and screenshot/chat recapture remain blocked by CDP/login/upload setup; no Roll20 parity claim is allowed.

## 2026-06-20 Codex Update - shared Roll20 CDP readiness helper

Status: DONE/VERIFY. This batch removes duplicated Roll20 page-readiness logic from CDP preflight and chat capture tooling.

- DONE: Added `scripts/lib/roll20Readiness.mjs` as the single source of truth for Roll20 page readiness classification and next-action text.
- DONE: `preflight:roll20-cdp` and `capture:roll20-chat-cdp` now use the shared helper, so login/challenge/unknown-page handling cannot drift independently.
- VERIFIED: `test:roll20-chat-cdp-readiness` passed, `preflight:roll20-cdp` still reports current `CDP_CLOSED`, closed-CDP dry-run still fails with expected `BLOCKED_CDP_ENDPOINT`, and `lint`, `build`, `guard:roll20-evidence` passed.
- STILL TODO P0: Use the shared guard with a logged-in CDP Roll20 Sandbox/test-room tab and recapture fixture-A/fixture-B chat evidence.

## 2026-06-20 Codex Update - Roll20 chat CDP capture readiness guard

Status: VERIFY/BLOCKED_CDP. This batch prevents `capture:roll20-chat-cdp` from attempting evidence capture on Roll20 login/challenge/non-room pages.

- DONE: `scripts/roll20_chat_cdp_capture.mjs` now classifies the matched Roll20 page before clicking or evaluating the chat probe. Non-ready pages throw structured `ROLL20 CHAT CDP CAPTURE BLOCKED_PAGE_NOT_READY`.
- DONE: Dry-run output now includes page readiness and next action. Added `corepack pnpm run test:roll20-chat-cdp-readiness` for local readiness classification self-test.
- VERIFIED: `test:roll20-chat-cdp-readiness` passed. Closed-CDP dry-run still fails with the expected structured `BLOCKED_CDP_ENDPOINT`. `lint`, `build`, and `guard:roll20-evidence` passed.
- STILL TODO P0: Open a CDP-enabled, logged-in Roll20 Sandbox/test-room tab, rerun preflight until `READY`, then run actual fixture-A/fixture-B chat captures.

## 2026-06-20 Codex Update - Roll20 CDP preflight readiness classification

Status: VERIFY/BLOCKED_LOGIN. This batch prevents the CDP preflight from treating Roll20 login/challenge pages as capture-ready.

- DONE: `preflight:roll20-cdp` now classifies matching Roll20 targets as `CAPTURE_READY`, `LOGIN_REQUIRED`, `CHALLENGE_OR_WAITING`, or `UNKNOWN_ROLL20_PAGE` instead of reporting `READY` for any `app.roll20.net` tab.
- VERIFIED: During a launched CDP Chrome check, `preflight:roll20-cdp` classified the Roll20 login/challenge page as not capture-ready instead of `READY`. A later non-launched verification returned `CDP_CLOSED`, which is also correctly non-capturable.
- CURRENT BLOCKER: Automated chat recapture still needs a CDP-enabled Chrome tab that is both logged in to Roll20 and opened to the approved Sandbox/test room.
- STILL TODO P0: Start or keep open the CDP-enabled Chrome, log in to Roll20 there, open the approved Sandbox/test room with the intended fixture loaded, rerun preflight until it reports `READY`, then capture fixture-A and fixture-B chat evidence.

## 2026-06-20 Codex Update - Roll20 CDP preflight for chat recapture

Status: VERIFY/BLOCKED_CDP. This batch adds a repeatable CDP readiness check for the remaining Roll20 chat current-metrics recapture; it does not capture new Roll20 evidence.

- DONE: Added `scripts/roll20_cdp_preflight.mjs` and `corepack pnpm run preflight:roll20-cdp -- --run-dir <run-dir>`.
- DONE: The preflight checks `http://127.0.0.1:9222/json/list`, lists matching Roll20 targets when available, writes ignored local output under `<run-dir>/roll20-cdp-preflight/`, and prints exact per-fixture capture commands from the current chat capture plan.
- VERIFIED: `corepack pnpm run preflight:roll20-cdp -- --run-dir reports\roll20-actual-compare\2026-06-18-state-map-v1` reports `CDP_CLOSED`, `plannedFixtures=2`, and capture commands for `fixture-A` and `fixture-B`.
- CURRENT BLOCKER: No CDP endpoint is listening on `127.0.0.1:9222`, so automated Roll20 chat recapture cannot run in the current browser state.
- STILL TODO P0: Start or attach a CDP-enabled Roll20 Sandbox/test-room browser, rerun preflight until it reports a Roll20 target, then run `capture:roll20-chat-cdp` for fixture-A and fixture-B.

## 2026-06-20 Codex Update - Roll20 chat current-metrics handoff

Status: VERIFY. This batch makes the next Roll20 chat recapture step repeatable; it does not claim chat or full renderer parity.

- DONE: Added `scripts/roll20_chat_current_handoff.mjs` and `corepack pnpm run handoff:roll20-chat-current -- <run-dir>`.
- DONE: The handoff runs chat current-metrics audit, current-metrics recapture plan generation, and capture-plan self-test in one command, then writes an ignored local report under `<run-dir>/roll20-chat-current-handoff/`.
- VERIFIED: `corepack pnpm run handoff:roll20-chat-current -- reports\roll20-actual-compare\2026-06-18-state-map-v1` passed all 3 wrapped commands and reports `NEEDS_RECAPTURE`.
- CURRENT EVIDENCE: Generated-sheet actual screenshots/diffs are present for 6/6 generated targets, trusted full-root evidence is 3/3, but renderer action remains `HOLD_PRODUCTION_RENDERER_PATCH`.
- CURRENT BLOCKER: Chat current row/typography/paint-filter sidecars are current for 1/3 fixtures. `fixture-A` and `fixture-B` need recapture because `latestTemplate.computedStyle.filter` and `table.computedStyle.filter` are missing.
- STILL TODO P0: In the dedicated Roll20 Sandbox/test room, recapture same-action `roll20-chat.png` plus `roll20-chat-dom-evidence.json` for fixture-A and fixture-B using the generated snippets, then rerun screenshot diff, `diagnose:roll20-chat-parity`, `gate:roll20-renderer-action`, and `status:roll20-actual`.

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
- VERIFIED: `node --check scripts\roll20_chat_cdp_capture.mjs` passed. `corepack pnpm run capture:roll20-chat-cdp -- --run-dir reports\roll20-actual-compare\2026-06-18-state-map-v1 --fixture fixture-A --plan-only` passed and listed fixture-A roll buttons (`roll_dsuf`, `roll_gasbf`, `roll_som`, `roll_rasrap`, `roll_oyb`, `roll_move`).
- EXPECTED BLOCKER CHECK: `corepack pnpm run capture:roll20-chat-cdp -- --run-dir reports\roll20-actual-compare\2026-06-18-state-map-v1 --fixture fixture-A --skip-click --dry-run` fails cleanly because no CDP endpoint is listening at `http://127.0.0.1:9222`.
- STILL TODO P0: Recapture fixture-A and fixture-B same-action `roll20-chat.png` plus current `roll20-chat-dom-evidence.json` in a dedicated Roll20 Sandbox/test-room where the fixture is actually loaded, then rerun screenshot diff, chat parity diagnostics, renderer action gate, and `status:roll20-actual`.
- CLAIM BOUNDARY: Current local edit/preview fixture parity is not actual Roll20 visual parity. The live Roll20 check above proves only that the verification tab and Sandbox Tools are reachable and that upload/capture automation remains gated.

## 2026-06-20 Codex Update - edit canvas auto-width parity

Status: VERIFY. This fixes the local fixture-A edit/preview full-root visual regression caused by edit mode rendering before preview auto-width settled.

- ROOT CAUSE: `EditCanvas` measured Shadow sheet height but did not update `sheetCanvasWidth`; the imported smoke captured edit first at a stale/narrower canvas width, then preview iframe auto-sized wider. fixture-A therefore compared `876px` edit root screenshots against `902px` preview root screenshots and produced a broad `11.93%` sheet-root mismatch.
- DONE: `EditCanvas` now measures Shadow sheet content width and height, raises `sheetCanvasWidth` when the rendered sheet needs more width, and keeps height behavior unchanged.
- DONE: `smoke:imported-edit-sync` now records sheet-root visual hot cells, mismatch coverage, and edit/preview root geometry deltas so future broad visual diffs can be routed to width/geometry/paint/state instead of guessed.
- VERIFIED: `node --check scripts\imported_edit_sync_smoke.mjs`, `corepack pnpm run lint`, `corepack pnpm run build`, fixture-A-only `corepack pnpm run smoke:imported-edit-sync -- --only fixture-A --port 4198`, full `corepack pnpm run smoke:imported-edit-sync -- --port 4196`, `corepack pnpm run smoke:edit-flow -- --port 4210`, and `corepack pnpm run guard:roll20-evidence` passed.
- LOCAL RESULT: fixture-A sheet-root visual mismatch improved from `11.93%` to `1.84%`; root geometry delta is now `0px` width/height/scroll/client, and form-state diff remains `0`.
- LOCAL RESULT: Full imported smoke sheet-root mismatch is `fixture-A 1.84%`, `fixture-B 1.98%`, `synthetic-nonleaf-flow 0%`, and `fixture-c-commission-1bu 1.04%`, all classified as `visual-pass` under the current local `2%` budget.
- CURRENT LIMITATION: This proves local edit/preview parity for the current fixture set, not actual Roll20 sandbox parity. `fixture-B` and `fixture-c-commission-1bu` still have resource warnings, so real visual parity still needs asset/state/crop normalization and Roll20 evidence.
- STILL TODO P0: Promote strict sheet-root sync only after deciding how resource warnings and actual Roll20 sandbox/test-room evidence gate production claims.

## 2026-06-20 Codex Update - Shadow edit worker state mirror

Status: VERIFY. This fixes the local edit/preview form-state drift found in the previous batch; it does not solve the remaining fixture-A sheet-root visual delta.

- DONE: `mountSheetShadow()` now installs a minimal Roll20 sheet-worker runtime inside the Shadow/edit DOM, including `on`, `getAttrs`, `setAttrs`, `getSectionIDs`, `generateRowID`, `getTranslationByKey`, `getTranslationByLang`, and `getTranslationLanguage`.
- DONE: Shadow/edit runtime now triggers `sheet:opened`, writes hidden/text/radio/checkbox/select/textarea state into the actual Shadow DOM, and mirrors the same checked/value attributes that iframe preview uses for CSS selectors.
- DONE: `PreviewMain` and `EditCanvas` pass emitted `translation.json` text into the Shadow runtime so worker translation helpers can resolve keys without hardcoding a sheet.
- VERIFIED: `corepack pnpm run lint`, `corepack pnpm run build`, fixture-A-only `corepack pnpm run smoke:imported-edit-sync -- --only fixture-A --port 4198`, full `corepack pnpm run smoke:imported-edit-sync -- --port 4196`, `corepack pnpm run smoke:edit-flow -- --port 4210`, and `corepack pnpm run guard:roll20-evidence` passed.
- LOCAL RESULT: `formStateDiff.diffCount` is now `0` for `fixture-A`, `fixture-B`, `synthetic-nonleaf-flow`, and `fixture-c-commission-1bu`.
- LOCAL RESULT: Sheet-root visual mismatch is now `fixture-A 11.93%` classified as `unclassified-sheet-root-visual-delta`, `fixture-B 1.98%` classified as `visual-pass`, `synthetic-nonleaf-flow 0%` classified as `visual-pass`, and `fixture-c-commission-1bu 1.04%` classified as `visual-pass`.
- CURRENT LIMITATION: fixture-A is no longer explained by form/default state drift. The next P0 is to classify the remaining full-root visual delta by CSS source/paint/geometry/resource/crop instead of applying another broad CSS patch.
- STILL TODO P0: Actual Roll20 renderer parity remains separate and still requires Roll20 sandbox/test-room evidence before any parity claim.

## 2026-06-20 Codex Update - form-state divergence classification

Status: VERIFY. This turns the latest sheet-root edit/preview visual mismatch into a more concrete diagnosis; it does not fix the underlying state divergence yet.

- DONE: `smoke:imported-edit-sync` now collects `input`, `select`, and `textarea` runtime state from both the edit Shadow DOM and preview iframe after imported edit operations.
- DONE: The smoke compares edit/preview form control values, checked state, selected index, and control counts, then writes `formStateDiff` into the ignored local JSON/markdown report.
- DONE: Sheet-root visual mismatch now records a classification: `visual-pass`, `visual-pass-with-form-state-diff`, `likely-form-control-state-divergence`, or `unclassified-sheet-root-visual-delta`.
- VERIFIED: `node --check scripts\imported_edit_sync_smoke.mjs`, `corepack pnpm run lint`, fixture-A-only `corepack pnpm run smoke:imported-edit-sync -- --only fixture-A --port 4198`, full `corepack pnpm run smoke:imported-edit-sync -- --port 4196`, `corepack pnpm run build`, `corepack pnpm run guard:roll20-evidence`, and `corepack pnpm run smoke:edit-flow -- --port 4210` passed.
- LOCAL RESULT: `fixture-A` still has sheet-root visual mismatch `11.93%`, now classified as `likely-form-control-state-divergence`; form state diffs are `2` controls (`input:hidden:1`, `input:radio:1`), including `attr_SHEETVERSION` edit `1.0` vs preview `1.1` and `attr_harm` radio value `0` unchecked in edit vs checked in preview.
- LOCAL RESULT: `fixture-B` has sheet-root visual mismatch `1.98%`, classified as `visual-pass-with-form-state-diff`; form state diffs are `9` controls, mostly hidden/default attributes. `fixture-c-commission-1bu` has mismatch about `1.04%`, classified as `visual-pass-with-form-state-diff`; form state diffs are `51` hidden/i18n-default controls. `synthetic-nonleaf-flow` has `0%` mismatch and form state match.
- INTERPRETATION: The worst current local edit/preview full-sheet mismatch is not proven to be a broad CSS cascade/layout collapse. It is now routed toward preview runtime/default attribute and sheet-worker state being applied in preview but not mirrored in edit mode.
- STILL TODO P0: Design and implement an edit-mode runtime state layer so edit mode renders the same post-worker/default state as preview while native inputs remain object-like/non-interactive for Figma-style editing.
- STILL TODO P0: Keep actual Roll20 renderer parity separate; this is local app edit/preview evidence only.

## 2026-06-20 Codex Update - sheet-root edit/preview visual diagnostic

Status: VERIFY. This adds a wider local visual diagnostic after imported edit operations; it is not yet a default hard gate because it exposed known/full-root state and resource differences that need triage.

- DONE: `smoke:imported-edit-sync` now captures the full `#charsheet-root` from both edit Shadow DOM and preview iframe after imported edit operations.
- DONE: The smoke compares those root PNGs with the same browser-canvas diff path used for non-leaf subtree crops and records `sheetVisualSync` in the local JSON/markdown report.
- DONE: Added `--sheet-visual-limit-pct` (default `2`) and `--require-sheet-visual-sync true`. By default the sheet-root result is reported as PASS/WARN; with the require flag it becomes a hard gate.
- VERIFIED: `node --check scripts\imported_edit_sync_smoke.mjs`, `corepack pnpm run lint`, full `corepack pnpm run smoke:imported-edit-sync -- --port 4196`, strict `corepack pnpm run smoke:imported-edit-sync -- --only fixture-A --require-sheet-visual-sync true --port 4198` failed as expected, `corepack pnpm run build`, `corepack pnpm run guard:roll20-evidence`, and `corepack pnpm run smoke:edit-flow -- --port 4210`.
- LOCAL RESULT: Latest default full run passed imported edit sync. Sheet-root visual mismatch was `fixture-A 11.93%` (WARN, over 2%), `fixture-B 1.98%`, `synthetic-nonleaf-flow 0%`, and `fixture-c-commission-1bu 0.98%`.
- CURRENT LIMITATION: fixture-A root mismatch appears concentrated around form control state/paint rather than the moved subtree; strict sheet-root visual sync correctly catches it but is not enabled by default until state/resource causes are triaged.
- STILL TODO P0: Diagnose fixture-A edit/preview form-control state divergence, then consider promoting sheet-root visual sync to a default gate. Actual Roll20 renderer parity remains separate.

## 2026-06-20 Codex Update - non-leaf edit/preview screenshot diff

Status: VERIFY. This adds screenshot-level local evidence after imported non-leaf subtree layer moves; it still is not actual Roll20 parity.

- DONE: `smoke:imported-edit-sync` now captures the moved non-leaf subtree from both the edit Shadow DOM and preview iframe into ignored report screenshots.
- DONE: The smoke compares those two PNGs in a browser canvas and records `mismatchPct`, `meanAbsChannelDelta`, compared size, and mismatch bounds in the local JSON report.
- DONE: Non-leaf subtree reorder now requires visual mismatch to stay under `--nonleaf-visual-limit-pct` (default `2%`) in addition to rect sync, layer relation, child preservation, and emitted-order checks.
- VERIFIED: `node --check scripts\imported_edit_sync_smoke.mjs`, `corepack pnpm run lint`, `corepack pnpm run smoke:imported-edit-sync -- --only synthetic-nonleaf-flow --port 4197`, `corepack pnpm run smoke:imported-edit-sync -- --port 4196`, `corepack pnpm run build`, `corepack pnpm run guard:roll20-evidence`, and `corepack pnpm run smoke:edit-flow -- --port 4210` passed.
- LOCAL FIXTURE RESULT: Non-leaf subtree edit/preview screenshot mismatch was `0%` for `fixture-A`, `fixture-B`, `synthetic-nonleaf-flow`, and `fixture-c-commission-1bu`; resource checks were clean in the latest full imported smoke.
- STILL TODO P0: Extend screenshot comparison from the moved subtree crop to larger viewport/sheet crops after user operations. Actual Roll20 renderer parity remains gated by Roll20 evidence.

## 2026-06-20 Codex Update - non-leaf edit/preview rect sync

Status: VERIFY. This adds stronger local proof that imported non-leaf subtree layer moves render the same in edit and preview after the drop.

- DONE: `runImportedNonLeafLayerReorder()` now re-reads the moved subtree after layer reorder in both the edit Shadow DOM and the preview iframe.
- DONE: The imported non-leaf pass condition now requires edit/preview relative `left`, `top`, `width`, and `height` to match within `2px`, in addition to layer relation, same parent/depth, child preservation, and emitted-order checks.
- DONE: The imported edit-sync markdown report now labels non-leaf reorder as `preview sync` when the subtree rect check passes.
- VERIFIED: `node --check scripts\imported_edit_sync_smoke.mjs`, `corepack pnpm run lint`, `corepack pnpm run smoke:imported-edit-sync -- --only synthetic-nonleaf-flow --port 4197`, `corepack pnpm run smoke:imported-edit-sync -- --port 4196`, `corepack pnpm run build`, `corepack pnpm run guard:roll20-evidence`, and `corepack pnpm run smoke:edit-flow -- --port 4210` passed.
- LOCAL FIXTURE RESULT: Non-leaf subtree edit/preview rect sync passed on `fixture-A`, `fixture-B`, `synthetic-nonleaf-flow`, and `fixture-c-commission-1bu`.
- CURRENT LIMITATION: The latest full imported smoke still recorded `7` resource warnings for `fixture-c-commission-1bu`; local edit/preview geometry sync passed, but resource warnings remain a visual-parity concern.
- STILL TODO P0: Add screenshot-level edit/preview comparison after subtree moves, not only rect-level comparison. Actual Roll20 renderer parity remains gated.

## 2026-06-20 Codex Update - synthetic imported non-leaf coverage

Status: VERIFY. This closes the previous local coverage gap for imported non-leaf subtree layer reorder, but it remains local-app evidence rather than actual Roll20 parity.

- DONE: Added a copyright-safe built-in fixture, `synthetic-nonleaf-flow`, inside `smoke:imported-edit-sync` so non-leaf imported subtree editing can be exercised without committing real sheet assets.
- DONE: `listFixtures()` now tolerates a missing ignored fixture directory and still runs built-in synthetic coverage; `--only synthetic-nonleaf-flow` can target the committed synthetic case directly.
- DONE: Imported non-leaf candidate selection now uses layer snapshot parent/depth semantics instead of relying on misleading Blockly `parentId` metadata.
- VERIFIED: `node --check scripts\imported_edit_sync_smoke.mjs`, `corepack pnpm run lint`, `corepack pnpm run build`, `corepack pnpm run guard:roll20-evidence`, `corepack pnpm run smoke:imported-edit-sync -- --only synthetic-nonleaf-flow --port 4197`, `corepack pnpm run smoke:imported-edit-sync -- --port 4196`, and `corepack pnpm run smoke:edit-flow -- --port 4210` passed.
- LOCAL FIXTURE RESULT: `fixture-A`, `fixture-B`, `synthetic-nonleaf-flow`, and `fixture-c-commission-1bu` all passed imported edit/preview sync with resource checks clean. Non-leaf subtree relation reorder passed on all four. Leaf sibling relation reorder passed on `fixture-B` and `synthetic-nonleaf-flow`; it skipped on `fixture-A` and `fixture-c-commission-1bu` because no safe imported leaf sibling pair was found.
- STILL TODO P0: Broaden this from local reorder smoke to real user-facing layer UX checks: visible layer preview, before/after/inside affordance clarity, and edit=preview screenshot comparison after imported subtree moves.
- STILL TODO P0: Actual Roll20 renderer parity remains gated; this change does not alter production renderer CSS.

## 2026-06-20 Codex Update - imported layer relation smoke

Status: VERIFY. This strengthens imported-sheet edit verification; it does not prove every imported sheet layer operation is solved.

- DONE: `smoke:imported-edit-sync` now uses `window.__perfHook.getLayerSnapshot()` when selecting imported layer reorder candidates.
- DONE: Imported leaf sibling reorder now requires the moving row to be an explicit `sibling` with `layerPreviousId` pointing at the target before it is accepted as a safe test candidate.
- DONE: Imported non-leaf subtree reorder candidates now require matching layer parent/depth semantics and record `layerRelationMatches`, `layerSameParent`, and `layerSameDepth` in the local report.
- VERIFIED: `node --check scripts\imported_edit_sync_smoke.mjs`, `corepack pnpm run lint`, `corepack pnpm run build`, `corepack pnpm run guard:roll20-evidence`, `corepack pnpm run smoke:imported-edit-sync -- --port 4196`, and `corepack pnpm run smoke:edit-flow -- --port 4210` passed.
- LOCAL FIXTURE RESULT: `fixture-A`, `fixture-B`, and `fixture-c-commission-1bu` all passed imported edit/preview sync with resource checks clean. The strengthened imported leaf layer relation check executed and passed on `fixture-B`; `fixture-A` and `fixture-c-commission-1bu` skipped it because no safe imported leaf sibling pair was found.
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
- CURRENT LIMITATION: No local Chrome/Edge remote debugging endpoint was listening on the checked ports, so the actual fixture-A/fixture-B Roll20 recapture was not performed.
- STILL TODO P0: Open or attach a Roll20 Sandbox/test-room browser with CDP enabled, then run this runner for `fixture-A` and `fixture-B`, followed by screenshot diff, chat parity, renderer action, and status gates.

## 2026-06-20 Codex Update - chat capture filter self-test hardening

Status: VERIFY. This hardens the Roll20 chat capture helper only; it does not add new Roll20 screenshots and does not change renderer parity.

- DONE: `scripts/roll20_chat_capture_plan.mjs` self-test now fails if generated chat DOM evidence omits `latestTemplate.computedStyle.filter`.
- DONE: The same self-test now also requires the captured rolltemplate table evidence to include `computedStyle.filter`.
- VERIFIED: `node --check .\scripts\roll20_chat_capture_plan.mjs`, `corepack pnpm run test:roll20-chat-capture-plan`, `corepack pnpm run plan:roll20-chat-capture -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --require-current-metrics`, `corepack pnpm run lint`, `corepack pnpm run build`, and `corepack pnpm run guard:roll20-evidence` passed.
- CURRENT RESULT: The capture plan still reports `NEEDS_CAPTURE` for `2/3` chat fixtures. fixture-A and fixture-B still need fresh same-action Roll20 `roll20-chat.png` plus `roll20-chat-dom-evidence.json` with the current filter fields.
- STILL TODO P0: Recapture fixture-A and fixture-B inside the dedicated Roll20 Custom Sheet Sandbox or approved test room, then rerun chat parity/status/renderer gates. No Roll20 visual parity claim is allowed before that evidence exists.

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
- LOCAL PRIVATE RESULT: On the current private fixture-C 1BU fixture, optional compaction produced `4` wide row bundles and collapsed `432` blocks, changing HTML block count from the previous `6530` baseline to `6094`.
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
- STILL TODO P0: Continue Roll20 actual upload/recapture work for fixture-A and fixture-B; this UI cleanup does not reduce `HOLD_PRODUCTION_RENDERER_PATCH`.
- STILL TODO P0: Continue edit-mode semantics work: same rendered preview/edit surface, overlay-only editing, flow-aware before/after/inside drop zones, and faster HTML/CSS sync.

## 2026-06-20 Codex Update - sandbox upload activation guard

Status: VERIFY. This hardens the Roll20 Sandbox upload handoff; it does not recapture fixture-A/fixture-B chat evidence and does not prove visual parity.

- DONE: `scripts/roll20_upload_snippet.mjs` now embeds generic activation hints extracted from payload HTML/CSS/translation/manifest: rolltemplate classes, roll button names, attr names, and visible text tokens.
- DONE: Generated upload snippets now compare before/after Roll20 DOM markers and return `activation.status`.
- RESULT: `FILE_INPUTS_DISPATCHED_BUT_VISIBLE_MATCH_NOT_PROVEN` is now distinct from `VISIBLE_MATCH`, so a synthetic file-input dispatch cannot be treated as proof that Roll20 actually loaded the uploaded sheet.
- VERIFIED: `node --check scripts\roll20_upload_snippet.mjs`, snippet generation for `fixture-A`, generated snippet syntax check, and `plan:roll20-chat-capture --require-current-metrics` passed.
- BLOCKED/OBSERVED: The current Chrome/Roll20 session still shows fixture-C/CoC chat after an fixture-A synthetic upload dispatch. Normal file chooser remains blocked/timed out in the Chrome extension path, and one attempted patched snippet execution timed out before returning evidence. No existing rooms were modified.
- STILL TODO P0: Enable/repair real browser file upload (`Allow access to file URLs` for the Codex Chrome extension) or use the approved Roll20 settings save/Sandbox route, then recapture fixture-A and fixture-B same-action `roll20-chat.png` plus `roll20-chat-dom-evidence.json` with current metrics.

## 2026-06-20 Codex Update - header and public example copy cleanup

Status: VERIFY. This removes visible mojibake and clarifies public-example rules; it does not change Roll20 renderer parity.

- DONE: Rewrote `components/editor/EditorHeader.tsx` user-facing Korean copy for header title, tooltips, button labels, confirm dialog, and save/new-sheet toasts.
- DONE: Cleaned `lib/examples/index.ts` and `lib/stores/examplesStore.ts` comments so the public example catalog clearly states that real/community/user sheets stay in ignored local fixtures only.
- RESULT: Public sample UI remains hidden while `EXAMPLES` is empty.
- VERIFIED: mojibake scan over `components`, `lib`, and `app` excluding generated Roll20 base CSS found no remaining matches; `lint`, `build`, empty-workspace `smoke:export-dialog` on port `4501`, and `guard:roll20-evidence` passed.
- STILL TODO P0: Continue actual Roll20 fixture-A/fixture-B chat recapture and renderer gate work; this UI cleanup does not reduce `HOLD_PRODUCTION_RENDERER_PATCH`.

## 2026-06-20 Codex Update - chat current-metrics audit gate

Status: PARTIAL. This tightens actual Roll20 chat evidence gating; it does not recapture fixture-A/fixture-B and does not make renderer parity pass.

- DONE: Added `scripts/roll20_chat_current_metrics_audit.mjs` and package command `diagnose:roll20-chat-current-metrics`.
- DONE: The audit reports whether each actual Roll20 `roll20-chat-dom-evidence.json` sidecar contains current row metrics, table structure, computed styles, text rasterization fields, paint `filter`, font evidence, text measure samples, and viewport DPR.
- DONE: Wired the renderer action gate to read the audit when present and print fixture-level missing fields in the blocker text.
- RESULT: Current `2026-06-18-state-map-v1` audit is `NEEDS_RECAPTURE`: `1/3` fixtures are current, with fixture-A and fixture-B missing `latestTemplate.computedStyle.filter` and `table.computedStyle.filter`.
- RESULT: A read-only Chrome check found the current Roll20 tab showing fixture-C `.sheet-rolltemplate-coc`, which is already the current-metrics fixture. Attempting normal Sandbox file-input upload for fixture-A again failed because the browser file chooser did not open.
- VERIFIED: `node --check` for the new audit and renderer gate, `diagnose:roll20-chat-current-metrics`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Recapture fixture-A and fixture-B chat screenshot+DOM sidecar in the dedicated Roll20 Sandbox or approved test room. If file chooser remains blocked, use the generated Roll20 upload snippet path or browser settings file access fix before retrying.

## 2026-06-20 Codex Update - export asset preflight UI

Status: VERIFY. This improves export-time truthfulness and user guidance; it does not prove Roll20 visual parity or fix the remaining renderer gate.

- DONE: Export dialog now includes an `외부 자산 점검` panel that counts emitted HTML/CSS asset references as external URL, relative path, and data URL.
- DONE: The dialog warns that images/fonts are not bundled into the zip and may render differently in Roll20 if the source URL, Roll20 proxy, or Imgur link resolves to a placeholder.
- DONE: Export dialog Korean copy was normalized in the touched export flow, and export smoke now checks the new asset-preflight panel plus mojibake absence.
- VERIFIED: `corepack pnpm run lint`, `corepack pnpm run build`, empty-workspace `smoke:export-dialog` on port `4493`, imported fixture-B `smoke:export-dialog` on port `4494`, and `guard:roll20-evidence` passed.
- RESULT: Empty workspace shows `외부 자산 없음`; imported fixture with external/proxied refs shows `확인 필요`.
- STILL TODO P0: This is only static export preflight. Actual Roll20 asset loading and visual parity still require Sandbox/test-room screenshots, trusted full-root evidence, and chat sidecar/screenshot comparison.

## 2026-06-20 Codex Update - chat background asset/proxy bytes probe

Status: PARTIAL. This adds byte-level asset evidence; it does not change production ChatPane defaults and does not prove Roll20 visual parity.

- DONE: Added `scripts/roll20_chat_background_asset_probe.mjs` and package command `diagnose:roll20-chat-background-assets`.
- DONE: Wired the asset/proxy probe into `gate:roll20-renderer-action`.
- RESULT: fixture-A and fixture-C 1BU local/actual background fetches match byte-for-byte, so the current local-vs-actual chat mismatch is not caused by different background image bytes.
- RESULT: Both fixture-A and fixture-C 1BU background sources currently resolve to tiny removed-placeholder images: `200 image/png`, `503b`, `161x81`, final/source path includes `removed.png`.
- RESULT: fixture-B has no table background image in current evidence and stays on non-image declaration/cascade diagnostics.
- RESULT: `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH` and now reports the asset/proxy probe as evidence.
- VERIFIED: `node --check` for the new script and renderer gate, `diagnose:roll20-chat-background-assets`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Preserve/rehost missing source assets before judging original-sheet visual parity for affected fixtures; for local-vs-actual parity, continue with browser paint/context and table/crop diagnostics because the bytes match.
- STILL TODO P0: Recapture fixture-A and fixture-B Roll20 chat sidecars with current row/typography/filter fields before cross-fixture renderer decisions.

## 2026-06-20 Codex Update - chat background raster model probe routes next paint work

Status: PARTIAL. This adds another diagnostic gate; it does not change production ChatPane defaults and does not prove Roll20 visual parity.

- DONE: Added `scripts/roll20_chat_background_raster_model_probe.mjs` and package command `diagnose:roll20-chat-background-raster`.
- DONE: Wired the raster-model probe into `gate:roll20-renderer-action`.
- RESULT: fixture-A stays on `COLOR_ASSET_RASTER_MODEL_REQUIRED`; do not reuse fixture-C/CoC background candidates there.
- RESULT: fixture-B is `DECLARATION_DIFF_BEFORE_RASTER_MODEL`; exact background declaration/cascade must be resolved before pixel-tuned paint work.
- RESULT: fixture-C 1BU is now `SOURCE_IMAGE_OR_BROWSER_PAINT_MODEL_REQUIRED`: background declarations match, row-weighted mismatch is `23.15%`, luma correction only gains `-0.58%p`, and `coc-background-size-actual` remains rejected by row-raster regression.
- RESULT: `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH` and now reports the raster-model routing as evidence.
- VERIFIED: `node --check` for the new script and renderer gate, `diagnose:roll20-chat-background-raster`, and `gate:roll20-renderer-action`.
- STILL TODO P0: For fixture-C/CoC, compare fetched background image bytes, Roll20 proxy decode behavior, and browser paint output before trying any more production ChatPane CSS.
- STILL TODO P0: Recapture fixture-A and fixture-B Roll20 chat sidecars with current row/typography/filter fields before cross-fixture renderer decisions.

## 2026-06-20 Codex Update - chat background/source probe routes fixture-C raster mismatch

Status: PARTIAL. This adds another diagnostic routing layer; it does not change production ChatPane defaults and does not prove Roll20 visual parity.

- DONE: Added `scripts/roll20_chat_background_source_probe.mjs` and package command `diagnose:roll20-chat-background-source`.
- DONE: Wired the background/source probe into `gate:roll20-renderer-action`.
- RESULT: The probe compares local vs actual computed table background declarations, row compositing output, table width context, and rejected background-size evidence.
- RESULT: fixture-C 1BU is now classified as `BACKGROUND_DECLARATION_MATCHES_BUT_RASTER_DIFFERS`: background declarations match, row-weighted mismatch is `23.15%`, luma-corrected mismatch is `22.57%`, and simple luma correction only gains `-0.58%p`.
- RESULT: `coc-background-size-actual` stays rejected for fixture-C/CoC: background-size tuning worsens fixture-C row raster (`+1.38%p` weighted, `+8.36%p` worst row), so do not retry background-size as the next fix.
- RESULT: fixture-B is separated as `BACKGROUND_DECLARATION_DIFFERS`; it needs exact background declaration/cascade comparison before any pixel-tuned paint CSS.
- RESULT: fixture-A is separated as `COLOR_ASSET_RASTER_CONTEXT_REQUIRED`; it must not reuse fixture-C/CoC background-size or row-background candidates.
- RESULT: `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH` and now reports the background/source probe as evidence.
- VERIFIED: `node --check` for the new script and renderer gate, `diagnose:roll20-chat-background-source`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Build the next fixture-C/CoC diagnostic around rendered background raster/source context where CSS declarations match but flat pixels differ.
- STILL TODO P0: Recapture fixture-A and fixture-B Roll20 chat sidecars with current row/typography/filter fields before cross-fixture renderer decisions.

## 2026-06-20 Codex Update - row compositing probe narrows fixture-C/CoC axis

Status: PARTIAL. This adds a diagnostic decomposition report; it does not change production ChatPane defaults and does not prove Roll20 visual parity.

- DONE: Added `scripts/roll20_chat_row_compositing_probe.mjs` and package command `diagnose:roll20-chat-row-compositing`.
- DONE: Wired row-compositing evidence into `gate:roll20-renderer-action`.
- RESULT: The probe splits row mismatch into text/edge, flat background, local darker/brighter, and chroma/color buckets.
- RESULT: fixture-C 1BU is classified as `BACKGROUND_COMPOSITING_MODEL_REQUIRED`: row-weighted mismatch `23.15%`, edge mismatch share `0%`, flat paint mismatch share `100%`, local-darker share `63.32%`.
- RESULT: Virtual row luma correction is a weak explanation for fixture-C: row-weighted mismatch only moves `23.15% -> 22.57%` (`-0.58%p`). Do not try a simple brightness/filter/luma CSS patch.
- RESULT: This supports the current P0 direction: the next fixture-C/CoC candidate should model row background compositing/source context, not text antialiasing, CSS filters, table scale, background-size, or broad typography.
- RESULT: fixture-B is `LOCAL_BACKGROUND_TOO_DARK` in this diagnostic, but it remains lower priority and still needs current same-action sidecar recapture before cross-fixture rollout.
- RESULT: fixture-A is `COLOR_ASSET_RASTER_MODEL_REQUIRED`, confirming again that chat renderer work is split by template and cannot become a global ChatPane CSS patch.
- RESULT: `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH` and now reports compositing decisions for all three fixtures.
- VERIFIED: `node --check` for the new script and renderer gate, `diagnose:roll20-chat-row-compositing`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Build the next fixture-C/CoC row-background/source-context diagnostic candidate and compare it with smoke, candidate comparison, style proof, row raster, row-raster candidate comparison, row compositing, renderer gate, lint, build, and evidence guard.
- STILL TODO P0: Recapture fixture-A and fixture-B Roll20 chat sidecars with current row/typography/filter fields before making cross-fixture renderer decisions.

## 2026-06-20 Codex Update - row raster candidate comparison gate

Status: PARTIAL. This adds a diagnostic comparison gate; it does not change production ChatPane defaults and does not prove Roll20 visual parity.

- DONE: Added `--report-dir` to `diagnose:roll20-chat-row-raster` so candidate probes no longer overwrite the default row-raster evidence used by `gate:roll20-renderer-action`.
- DONE: Added `scripts/roll20_chat_row_raster_candidate_compare.mjs` and package command `diagnose:roll20-chat-row-raster-candidates`.
- DONE: Wired row-raster candidate comparison into `gate:roll20-renderer-action`.
- RESULT: Default baseline restored: fixture-C aligned mismatch `22.33%`, row-weighted mismatch `23.15%`, worst row `5` mismatch `30.89%`.
- RESULT: `paint-dim-background` improves row raster numerically (`23.15% -> 20.51%`, worst row `30.89% -> 27.98%`) but remains blocked because actual Roll20 computed style contradicts it (`filter: none`).
- RESULT: `coc-background-size-actual` is rejected by row raster regression: row-weighted `23.15% -> 24.53%`, worst row `30.89% -> 39.25%` (`+8.36%p`).
- RESULT: `fixture-c-sanitize-typography` is rejected by row raster regression: row-weighted `23.15% -> 39.03%`, worst row `30.89% -> 55.37%` (`+24.48%p`).
- RESULT: `gate:roll20-renderer-action` reports `chat row raster candidate comparison: compared=7/7, rejected=2, noMeaningfulGain=3` and remains `HOLD_PRODUCTION_RENDERER_PATCH`.
- INTERPRETATION: The next fixture-C/CoC P0 should not retry background-size, broad typography, or filter CSS. Build the next candidate around actual row text/background compositing, source/capture context, or a Roll20-specific raster model that also has style proof.
- VERIFIED: `node --check` for changed scripts, `diagnose:roll20-chat-row-raster`, `diagnose:roll20-chat-row-raster-candidates`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Build the next fixture-C/CoC row-level renderer candidate from text/background compositing or source/capture context, then run smoke, candidate comparison, style proof, row-raster candidate comparison, renderer gate, lint, build, and evidence guard.
- STILL TODO P0: Recapture fixture-A and fixture-B Roll20 chat sidecars with current row/typography/filter fields before any cross-fixture renderer rollout.

## 2026-06-20 Codex Update - CoC background-size raster candidate rejected

Status: PARTIAL. This tested a narrow diagnostic candidate; it does not change production ChatPane defaults and does not prove Roll20 visual parity.

- DONE: Added diagnostic-only ChatPane paint policy `coc-background-size-actual`.
- DONE: Added the candidate to `rolltemplate_chat_smoke`, `diagnose:roll20-chat-candidates`, and script docs.
- DONE: Added style-proof handling for the candidate when it becomes relevant.
- RESULT: Candidate smoke PASSed fixture-A, fixture-B, and fixture-C.
- RESULT: Candidate comparison classifies `coc-background-size-actual` as `no-meaningful-gain`: fixture-C aligned mismatch moves only `22.33% -> 21.94%` (`-0.39%`), below the `-0.5%` meaningful threshold.
- RESULT: Candidate row-raster probe worsened fixture-C's worst row mismatch from default `30.89%` to candidate `39.25%`, even though the overall aligned mismatch moved slightly.
- RESULT: `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH`.
- INTERPRETATION: CoC background-size/table-width raster scale alone does not explain fixture-C. The next P0 should inspect row-level text/background compositing or actual capture/source-order context, not promote background-size, filter, or broad typography CSS.
- VERIFIED: `build`, `rolltemplate_chat_smoke --chat-paint-policy coc-background-size-actual`, `diagnose:roll20-chat-candidates`, `diagnose:roll20-chat-candidate-style`, candidate/default `diagnose:roll20-chat-row-raster`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Build the next fixture-C/CoC row-level renderer candidate around text/background compositing or source/capture context. Keep `coc-background-size-actual` diagnostic-only and rejected for production.

## 2026-06-20 Codex Update - row raster probe for fixture-C/CoC chat

Status: PARTIAL. This adds row-level PNG raster diagnostics; it does not change production ChatPane defaults and does not prove Roll20 visual parity.

- DONE: Added `scripts/roll20_chat_row_raster_probe.mjs` and package command `diagnose:roll20-chat-row-raster`.
- DONE: Wired row raster evidence into `gate:roll20-renderer-action`.
- RESULT: fixture-C 1BU is classified as `COC_ROW_RASTER_MODEL_REQUIRED`.
- RESULT: fixture-C row-weighted mismatch is `23.15%`; worst row is row `5` with `30.89%` mismatch.
- RESULT: fixture-C worst-row signed luma delta is `-27.232`, so the current local row raster is darker than actual Roll20 on the dominant mismatching row.
- RESULT: fixture-A is separately classified as `ROW_LUMA_RASTER_MODEL_REQUIRED`, row-weighted mismatch `13.43%`; this confirms the chat renderer still needs split per-template models rather than a global patch.
- RESULT: fixture-B remains `RASTER_SECONDARY` in this probe.
- RESULT: `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH`.
- INTERPRETATION: The next fixture-C/CoC P0 is a row-level background/text raster experiment using this evidence. Do not promote `paint-dim-background`; it gives a numeric clue but is still contradicted by actual Roll20 `filter: none`.
- VERIFIED: `node --check` for changed scripts, `diagnose:roll20-chat-row-raster`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Build a fixture-C/CoC row-level renderer candidate from actual row raster evidence, then run local smoke, candidate comparison, style proof, row raster probe, renderer gate, lint, build, and evidence guard.
- STILL TODO P0: Recapture fixture-A and fixture-B Roll20 chat sidecars with current row/typography/filter fields before any cross-fixture renderer rollout.

## 2026-06-20 Codex Update - fixture-C row/paint/source probe

Status: PARTIAL. This adds a renderer-routing diagnostic; it does not change production ChatPane defaults and does not prove Roll20 visual parity.

- DONE: Added `scripts/roll20_chat_row_paint_source_probe.mjs` and package command `diagnose:roll20-chat-row-paint-source`.
- DONE: Wired the row/paint/source probe into `gate:roll20-renderer-action`.
- DONE: Fixed `roll20_chat_width_reconciliation.mjs` so it reads `chat-row-geometry` decisions from `rowModel.decision`.
- RESULT: New probe classifies fixture-C 1BU as `ROW_BAND_RASTER_CONTEXT_REQUIRED`.
- RESULT: fixture-C remains high mismatch: aligned mismatch `22.33%`; this work does not improve pixels by itself.
- RESULT: `paint-dim-background` is still numerically useful for fixture-C (`-2.48%`) but blocked because actual Roll20 computed style reports `filter: none`.
- RESULT: `fixture-c-sanitize-typography` is rejected for fixture-C (`+14.13%` aligned delta), so simply replaying observed Roll20 typography/sanitize values is not the fix.
- RESULT: `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH`.
- INTERPRETATION: The next fixture-C/CoC P0 is a real row-band background/text rasterization plus source-order/capture-context probe around the CoC rolltemplate table. Do not promote filter, broad typography, or direct width CSS.
- VERIFIED: `node --check` for changed scripts, `diagnose:roll20-chat-row-paint-source`, `diagnose:roll20-chat-width-reconciliation`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Build the next fixture-C/CoC capture/probe that compares actual row-band background/text rasterization and source-order around the CoC table without using CSS filters.
- STILL TODO P0: Recapture fixture-A and fixture-B Roll20 chat sidecars with current row/typography/filter fields before making cross-fixture renderer decisions.

## 2026-06-20 Codex Update - fixture-C font availability candidates rejected

Status: PARTIAL. This tested narrow fixture-C/CoC font-context diagnostics; it does not change production ChatPane defaults and does not prove visual parity.

- DONE: Added diagnostic-only ChatPane font policy `fixture-c-bookk-unavailable`.
- DONE: Added diagnostic-only typography policies `fixture-c-table-font-context`, `fixture-c-bookk-missing-render`, and `fixture-c-missing-bookk-table-font-context`.
- DONE: Added these candidates to `rolltemplate_chat_smoke`, `diagnose:roll20-chat-candidates`, `diagnose:roll20-chat-candidate-style`, and script docs.
- RESULT: All new candidates rendered rolltemplate chat cards successfully in smoke.
- RESULT: Removing uploaded `BookkMyungjo-Bd` `@font-face` was not enough to mirror actual Roll20 missing-font evidence: local `document.fonts.check()` still returned true for Bookk specs, and the table widened to `1305.578px`.
- RESULT: Forcing missing Bookk rendering also widened the table to `1305.578px`; combining missing Bookk with Proxima table context widened it to `1317.141px`.
- RESULT: Candidate comparison rejects all new font-context candidates: `fixture-c-bookk-unavailable` `+5.39%` fixture-C aligned delta, `fixture-c-table-font-context` `+2.57%`, `fixture-c-bookk-table-font-context` `+6.69%`, `fixture-c-bookk-missing-render` `+5.39%`, `fixture-c-missing-bookk-table-font-context` `+6.69%`.
- RESULT: `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH`.
- INTERPRETATION: Bookk missing-font simulation is not the fixture-C fix. The next P0 should inspect Roll20 chat crop/row-band paint and table source/sanitized CSS ordering beyond font availability, while keeping `paint-dim-background` blocked because actual Roll20 reports `filter: none`.
- VERIFIED: `build`, all new candidate smokes, `diagnose:roll20-chat-candidates`, `diagnose:roll20-chat-candidate-style`, `diagnose:roll20-chat-font-intrinsic`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Build the next fixture-C/CoC diagnostic around row-band/crop/background paint or sanitized source ordering, not Bookk font availability.

## 2026-06-20 Codex Update - Font/intrinsic probe split

Status: PARTIAL. This adds a renderer-routing diagnostic; it does not change production ChatPane defaults and does not prove visual parity.

- DONE: Added `scripts/roll20_chat_font_intrinsic_probe.mjs` and package command `diagnose:roll20-chat-font-intrinsic`.
- DONE: Wired the font/intrinsic probe into `gate:roll20-renderer-action` so the gate now reports combined font availability, table font-family, text-width residual, intrinsic-width, overflow/crop, and width-override evidence.
- RESULT: fixture-A is now explicitly routed to `TEXT_METRIC_WIDTH_MODEL`: table delta `+15.744px`, measured text delta `+15.602px`, residual `+0.142px`, font availability unchanged.
- RESULT: fixture-B remains `WIDTH_SECONDARY`: table delta `+0.8px`.
- RESULT: fixture-C is now explicitly routed to `FONT_FACE_INTRINSIC_MODEL_REQUIRED`: table delta `-24.309px`, measured text delta `-54.946px`, residual `+30.637px`, font availability changed, table font-family changed, direct width override candidates have `NO_GAIN`.
- RESULT: `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH`.
- INTERPRETATION: The next fixture-C/CoC P0 is not another width/overflow CSS candidate. It should mirror Roll20 font-face availability/order first, then measure table min-content/intrinsic sizing under that font context.
- VERIFIED: `node --check` for the new script and renderer gate, `diagnose:roll20-chat-font-intrinsic`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Build a fixture-C/CoC diagnostic candidate that suppresses or reorders the relevant local `BookkMyungjo-Bd` font-face availability to match actual Roll20, then rerun rolltemplate chat smoke, candidate comparison, font/intrinsic probe, renderer gate, lint, build, and evidence guard.

## 2026-06-20 Codex Update - CoC overflow/crop candidate rejected

Status: PARTIAL. This tested the first fixture-C/CoC overflow-crop candidate; it does not change production ChatPane defaults and does not prove visual parity.

- DONE: Added diagnostic-only ChatPane geometry policy `coc-overflow-crop-model`.
- DONE: Inserted the diagnostic override CSS after user rolltemplate CSS so this candidate tests the post-user cascade path instead of losing to the uploaded sheet CSS.
- DONE: Added the candidate to `rolltemplate_chat_smoke`, `diagnose:roll20-chat-candidates`, `diagnose:roll20-chat-candidate-style`, and script docs.
- RESULT: Candidate smoke PASSed all three prepared fixtures.
- RESULT: The candidate did not change fixture-C used table width: local table stayed `1272.859px` even with post-user `width: 1248.55px !important`, `max-width: 1248.55px !important`, `border-spacing: 0`, and `overflow-wrap: break-word`.
- RESULT: Candidate comparison classifies `coc-overflow-crop-model` as `no-meaningful-gain`: fixture-C remains raw `26.45%`, aligned `22.33%`, delta `0%`.
- RESULT: `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH`.
- INTERPRETATION: The remaining fixture-C width/crop mismatch is not fixed by width/overflow declarations alone. The next P0 should inspect Roll20 table intrinsic/min-content calculation and font-face availability/order for the CoC template, especially why actual Roll20 computes a narrower used table despite matching root width.
- VERIFIED: `build`, `rolltemplate_chat_smoke --chat-geometry-policy coc-overflow-crop-model`, `diagnose:roll20-chat-candidates`, `diagnose:roll20-chat-candidate-style`, `diagnose:roll20-chat-overflow-crop`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Build the next fixture-C/CoC diagnostic around font-face availability/order plus table min-content/intrinsic sizing. Do not promote `coc-overflow-crop-model`.

## 2026-06-20 Codex Update - fixture-C overflow/crop probe

Status: PARTIAL. This adds another diagnostic layer for Roll20 chat parity; it does not change production ChatPane CSS and does not prove visual parity.

- DONE: Added `scripts/roll20_chat_overflow_crop_probe.mjs` and package command `diagnose:roll20-chat-overflow-crop`.
- DONE: Wired the overflow/crop probe into `gate:roll20-renderer-action` so renderer decisions now include table overflow, table-to-crop ratio, scroll/client width, crop/top-offset, and best current candidate evidence.
- RESULT: fixture-A is still `MESSAGE_WIDTH_MODEL`: table delta `+15.744px`, overflow delta `0px`, table-to-crop delta `+0.00105`, top offset `+184.178px`. Do not route fixture-A through fixture-C-style table overflow work.
- RESULT: fixture-B remains `WIDTH_SECONDARY`: table delta `+0.8px`, overflow delta `0px`, table-to-crop delta `+0.003`.
- RESULT: fixture-C is now classified as `TABLE_OVERFLOW_CROP_MODEL_REQUIRED`: table delta `-24.309px`, overflow delta `0px`, table-to-crop delta `-0.09104`, top offset `+125.884px`.
- RESULT: `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH`; next fixture-C work must be a CoC/fixture-C-scoped overflow/crop candidate from actual table scroll/client width and rolltemplate crop origin, not paint filters or broad typography.
- VERIFIED: `node --check` for the new script and renderer gate, `diagnose:roll20-chat-overflow-crop`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Build the narrow CoC/fixture-C overflow/crop diagnostic candidate, then run chat smoke, candidate comparison, style proof, renderer gate, lint, build, and evidence guard before any production renderer change.

## 2026-06-20 Codex Update - fixture-C live filter sidecar recapture

Status: PARTIAL. This updates local-only Roll20 chat evidence for fixture-C; it does not change production ChatPane CSS and does not prove visual parity.

- DONE: Claimed the existing Chrome Roll20 verification editor tab in read-only mode and confirmed the live fixture-C `.sheet-rolltemplate-coc` chat DOM exposes computed `filter` values.
- DONE: Added `latestTemplate.computedStyle.filter`, `table.computedStyle.filter`, and sampled child `filter` fields to the ignored local fixture-C Roll20 chat sidecar from live Roll20 DOM evidence.
- DONE: Restored `roll20-chat.png` from the matching prior DPR-corrected fixture-C recapture candidate after a browser screenshot-scale probe produced a mismatched temporary capture. The final PNG is back to `267x586`.
- RESULT: `status:roll20-actual` moved `chatCurrentMetrics` from `0/3` to `1/3`; remaining missing current filter fields are `fixture-A` and `fixture-B`.
- RESULT: fixture-C chat parity returned to the prior authoritative baseline: raw mismatch `26.45%`, aligned mismatch `22.33%`, crop/scale/pixel suspects `0`.
- RESULT: `paint-dim-background` is no longer blocked by missing fixture-C sidecar fields; it is now contradicted by actual Roll20 style for fixture-C because actual Roll20 reports `filter: none`.
- RESULT: `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH`; no paint/rasterization CSS should be promoted.
- VERIFIED: `roll20_actual_screenshot_diff`, `diagnose:roll20-chat-parity`, `status:roll20-actual`, `diagnose:roll20-chat-candidate-style`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Recapture fixture-A and fixture-B Roll20 chat sidecars with computed `filter` fields from their own live Roll20 roll actions.
- STILL TODO P0: Build the next fixture-C/CoC model around table intrinsic/width/overflow behavior, not a CSS paint filter.

## 2026-06-20 Codex Update - fixture-C paint filter proof gate

Status: PARTIAL. This improves the renderer gate for fixture-C paint/rasterization candidates; it does not change production ChatPane CSS.

- DONE: Split `paint-dim-background` into diagnostic sub-candidates `paint-dim-brightness` and `paint-dim-saturate`.
- DONE: Added computed `filter` capture to local ChatPane smoke and Roll20 chat capture snippets.
- DONE: Added paint/filter style proof for `paint-dim-background`, `paint-dim-brightness`, and `paint-dim-saturate`.
- DONE: Updated `plan:roll20-chat-capture` and `status:roll20-actual` so current chat DOM sidecars must include `latestTemplate.computedStyle.filter` and `table.computedStyle.filter`.
- RESULT: `paint-dim-brightness` and `paint-dim-saturate` are `no-meaningful-gain`; fixture-C remains `22.33%`.
- RESULT: `paint-dim-background` remains the only current fixture-C pixel-improving paint candidate: fixture-C `22.33% -> 19.85%`, delta `-2.48%`, no fixture regressions.
- RESULT: `paint-dim-background` is now blocked by style proof as `NEEDS_NEW_SIDECAR_FIELDS` because existing actual Roll20 sidecars do not contain computed `filter` fields. This prevents a false production promotion.
- RESULT: `status:roll20-actual` now reports `chatCurrentMetrics=0/3`, missing `latestTemplate.computedStyle.filter` and `table.computedStyle.filter` for all three fixtures.
- RESULT: `gate:roll20-renderer-action` still returns `HOLD_PRODUCTION_RENDERER_PATCH` and now includes the missing paint-filter sidecar blocker.
- VERIFIED: paint candidate smokes, `diagnose:roll20-chat-candidates`, `diagnose:roll20-chat-candidate-style`, `plan:roll20-chat-capture -- --all --require-current-metrics`, `status:roll20-actual`, `gate:roll20-renderer-action`, `lint`, `build`, and evidence guard.
- STILL TODO P0: Recapture actual Roll20 chat DOM sidecars with computed `filter` fields before any paint/rasterization candidate can be considered for production renderer behavior.

## 2026-06-20 Codex Update - fixture-C crop-origin candidate rejected

Status: PARTIAL. This tested the next fixture-C/CoC crop/table interaction hypothesis; it does not change production ChatPane CSS.

- DONE: Added diagnostic-only ChatPane geometry policy `coc-crop-origin-y20`.
- DONE: Added candidate comparison rows for `coc-crop-origin-y20`, `coc-table-actual-width-dim-background`, and `coc-crop-origin-y20-dim-background`.
- DONE: Updated candidate selection tie-breakers in width reconciliation, table-width budget, and table-intrinsic probe so equally scoring composite candidates do not displace the simpler candidate.
- RESULT: `coc-crop-origin-y20` is `no-meaningful-gain`: fixture-C remains `22.33%` aligned mismatch, delta `0%`.
- RESULT: `coc-table-actual-width-dim-background` and `coc-crop-origin-y20-dim-background` match `paint-dim-background` exactly: fixture-C `19.85%`, delta `-2.48%`, no added gain from table-width or y-origin changes.
- RESULT: The current best fixture-C diagnostic candidate remains `paint-dim-background`; table actual-width and simple y-origin crop offset are not the missing model.
- RESULT: `gate:roll20-renderer-action` still returns `HOLD_PRODUCTION_RENDERER_PATCH`.
- VERIFIED: chat smoke for the new candidates, `diagnose:roll20-chat-candidates`, `diagnose:roll20-chat-table-width-budget`, `diagnose:roll20-chat-width-reconciliation`, `diagnose:roll20-chat-table-intrinsic-probe`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Move the next fixture-C/CoC probe away from table-width/y-offset hacks. Investigate paint/background/rasterization and actual Roll20 user CSS activation around the CoC template before any production CSS.

## 2026-06-20 Codex Update - fixture-C table intrinsic probe

Status: PARTIAL. This adds the next fixture-C/CoC routing diagnostic; it does not change production ChatPane CSS.

- DONE: Added `scripts/roll20_chat_table_intrinsic_probe.mjs` and package command `diagnose:roll20-chat-table-intrinsic-probe`.
- DONE: Wired the probe report into `gate:roll20-renderer-action` so the gate now reports root/table/scroll/caption/first-cell deltas, row spread, max cell delta, uniform top offset, best current candidate, and next action.
- RESULT: fixture-A is classified as `ROOT_OR_MESSAGE_WIDTH_CONTEXT`: root delta `+12px`, table delta `+15.744px`, scroll delta `+16px`. Do not route fixture-A through a table-intrinsic patch first.
- RESULT: fixture-B is `WIDTH_SECONDARY`: table delta only `+0.8px`; keep it out of the next P0 width patch.
- RESULT: fixture-C is classified as `TABLE_WIDE_INTRINSIC_WITH_CROP_OFFSET`: root delta `0px`, table delta `-24.309px`, scroll delta `-24px`, row spread `0px`, max cell delta `+0.909px`, uniform top offset `+125.884px`.
- RESULT: For fixture-C, the next P0 is a CoC/fixture-C-scoped table intrinsic width plus rolltemplate crop/top-origin probe. Transform, global font, broad typography, and spacing bundles remain rejected or contradicted.
- RESULT: `gate:roll20-renderer-action` still returns `HOLD_PRODUCTION_RENDERER_PATCH`.
- VERIFIED: `diagnose:roll20-chat-table-intrinsic-probe` and `gate:roll20-renderer-action`.
- STILL TODO P0: Build the next diagnostic candidate around fixture-C/CoC table intrinsic width plus crop/top-origin context, then run chat smoke, candidate comparison, style proof, renderer gate, lint, and build before any production renderer change.

## 2026-06-20 Codex Update - fixture-C table-width budget

Status: PARTIAL. This sharpens the fixture-C/CoC next renderer axis; it does not change production ChatPane CSS.

- DONE: Added `scripts/roll20_chat_table_width_budget.mjs` and package command `diagnose:roll20-chat-table-width-budget`.
- DONE: Wired the budget report into `gate:roll20-renderer-action` so the gate now reports table delta, measureText delta, residual, rejected axes, and the next table-width action.
- RESULT: fixture-A is classified as `MESSAGE_CONTENT_WIDTH_BUDGET`: table delta `+15.744px`, text delta `+15.602px`, residual `+0.142px`, best candidate `fixture-a-message-full-width`.
- RESULT: fixture-B is `WIDTH_SECONDARY`: table delta only `+0.8px`.
- RESULT: fixture-C is classified as `LAYOUT_CONSTRAINT_AFTER_REJECTED_CSS`: table delta `-24.309px`, measureText table delta `-54.946px`, residual `+30.637px`.
- RESULT: For fixture-C, broad font/typography, spacing/letter, and transform/scale axes are already rejected or contradicted. The next P0 is a table-layout/intrinsic constraint probe, not another font or global width CSS candidate.
- RESULT: `gate:roll20-renderer-action` still returns `HOLD_PRODUCTION_RENDERER_PATCH`.
- VERIFIED: `diagnose:roll20-chat-table-width-budget` and `gate:roll20-renderer-action`.
- STILL TODO P0: Build a fixture-C/CoC scoped table-layout/intrinsic constraint probe from actual table scroll/client/text residual evidence.

## 2026-06-20 Codex Update - fixture-A message-shell candidate

Status: PARTIAL. This replaces the best fixture-A explanation candidate with a narrower diagnostic; it still does not enable production ChatPane CSS.

- DONE: Added diagnostic-only ChatPane geometry policy `fixture-a-message-full-width`, scoped to chat cards containing `.sheet-rolltemplate-aw` via `:has(...)`.
- DONE: Added the candidate to local chat smoke, candidate comparison, candidate style proof, and script docs.
- RESULT: `fixture-a-message-full-width` matches the prior `fixture-a-root-width-actual` pixel gain without touching Les/fixture-C: fixture-A aligned mismatch delta `-7.63%`, Les `0%`, fixture-C `0%`, mean delta `-2.54%`, regressions `0`.
- RESULT: Style proof now classifies it as `STYLE_COMPATIBLE_NEEDS_PIXEL_REVIEW`: fixture-A local/actual chat and message width both match `340px`; Les/fixture-C are `STYLE_NEUTRAL` because their message width remains matching actual Roll20.
- RESULT: `diagnose:roll20-chat-width-reconciliation` now selects `fixture-a-message-full-width` as fixture-A's best candidate instead of the harder-coded `fixture-a-root-width-actual`.
- RESULT: `gate:roll20-renderer-action` still returns `HOLD_PRODUCTION_RENDERER_PATCH`; the candidate is not a public/product default because other fixtures still require different renderer axes.
- VERIFIED: `rolltemplate-chat-smoke-fixture-a-message-full-width`, `diagnose:roll20-chat-candidates`, `diagnose:roll20-chat-candidate-style`, `diagnose:roll20-chat-width-reconciliation`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Convert the diagnostic into a generic message/content-width rule only after proving the rule is not fixture-A-specific and after fixture-C table intrinsic work no longer conflicts.

## 2026-06-20 Codex Update - chat message shell model

Status: PARTIAL. This adds a narrower diagnostic for fixture-A chat width; it does not enable production ChatPane CSS.

- DONE: Added `scripts/roll20_chat_message_shell_model.mjs` and package command `diagnose:roll20-chat-message-shell`.
- DONE: Wired the message-shell report into `gate:roll20-renderer-action` so renderer decisions now include message width, content/template width, chat-right gutter, and actual message shell model evidence.
- RESULT: fixture-A is isolated as `MESSAGE_CONTENT_WIDTH_MODEL_REQUIRED`: actual Roll20 uses `FULL_CHAT_WIDTH_MESSAGE`, with message width delta `+12px` and content/template width delta `+12px`.
- RESULT: fixture-B and fixture-C are now `MESSAGE_SHELL_SECONDARY`; their message width delta is `0px`, so their remaining mismatch should not be "fixed" by a global message width patch.
- RESULT: `gate:roll20-renderer-action` still returns `HOLD_PRODUCTION_RENDERER_PATCH`; the next fixture-A task is a per-template message/content width model, while fixture-C stays on table scroll/intrinsic sizing.
- VERIFIED: default `rolltemplate_chat_smoke` 3/3 PASS, `diagnose:roll20-chat-width`, `diagnose:roll20-chat-message-shell`, `diagnose:roll20-chat-width-reconciliation`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Build a generic Roll20 message/content-width rule or candidate that explains fixture-A without changing Les/fixture-C globally; do not expose diagnostic candidates in public UI.

## 2026-06-20 Codex Update - chat message/content width split

Status: PARTIAL. This sharpens the next renderer model; it does not enable production ChatPane CSS.

- DONE: Added diagnostic `roll20-chat-shell-width-340` policy and regenerated local browser chat smoke for it.
- DONE: `rolltemplate_chat_smoke` now records local message rect/style evidence so candidate style proof can compare local message width against actual Roll20 sidecars.
- DONE: `diagnose:roll20-chat-width` now distinguishes `CHAT_MESSAGE_CONTENT_WIDTH_MODEL_REQUIRED` before table-width work when message width and template width move together.
- RESULT: fixture-A is now classified as `CHAT_MESSAGE_CONTENT_WIDTH_MODEL_REQUIRED`; actual message width/template content explains the root-width mismatch better than a table-only model.
- RESULT: The broad `roll20-chat-shell-width-340` candidate is rejected: mean delta `-2.07%` but `2` fixture regressions, so do not widen the global ChatPane shell.
- RESULT: `diagnose:roll20-chat-width-reconciliation` now routes fixture-A to `CHAT_MESSAGE_CONTENT_WIDTH`, fixture-B to `KEEP_DEFAULT`, and fixture-C 1BU to `TABLE_SCROLL_INTRINSIC`.
- RESULT: `gate:roll20-renderer-action` still returns `HOLD_PRODUCTION_RENDERER_PATCH`, now with the clearer blocker that global shell width regresses other fixtures.
- VERIFIED: `rolltemplate-chat-smoke-roll20-chat-shell-width-340`, `diagnose:roll20-chat-width`, `diagnose:roll20-chat-candidates`, `diagnose:roll20-chat-candidate-style`, `diagnose:roll20-chat-width-reconciliation`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Build a per-template/message-context width model that can reproduce fixture-A's Roll20 content width without changing Les/fixture-C shells globally. Continue fixture-C on table intrinsic/crop/paint context.

## 2026-06-20 Codex Update - fixture-A root-width renderer candidate

Status: PARTIAL. This adds and validates diagnostic-only renderer candidates; it does not change the default product ChatPane renderer.

- DONE: Added diagnostic ChatPane policies `fixture-a-root-width-actual`, `fixture-a-font-size-only`, `coc-table-actual-width`, and `coc-table-intrinsic-clamp`. They are only enabled through smoke-script localStorage policies and are not exposed in the UI.
- DONE: Regenerated browser smoke evidence for the new candidates:
  - `rolltemplate-chat-smoke-fixture-a-root-width-actual`
  - `rolltemplate-chat-smoke-fixture-a-font-size-only`
  - `rolltemplate-chat-smoke-coc-table-actual-width`
  - `rolltemplate-chat-smoke-coc-table-intrinsic-clamp`
- RESULT: `fixture-a-root-width-actual` is the first current chat candidate with both meaningful fixture-A pixel gain and style proof: fixture-A aligned mismatch improved from `13.5%` to `5.87%` (`-7.63%`), with no fixture regressions, and actual/style proof reports root width `279px` vs local candidate `279px`, transform `none`.
- RESULT: `fixture-a-font-size-only` is not enough by itself (`-0.47%` fixture-A only). The useful axis is root/template width, not just font size.
- RESULT: `coc-table-actual-width` and `coc-table-intrinsic-clamp` produced no fixture-C gain. fixture-C remains blocked by table/crop/paint/intrinsic context rather than a direct width CSS clamp.
- RESULT: `gate:roll20-renderer-action` still returns `HOLD_PRODUCTION_RENDERER_PATCH`; the surviving fixture-A candidate is fixture-scoped and must be generalized into a Roll20-like rolltemplate root intrinsic-width model before any product default change.
- VERIFIED: `build`, candidate browser smokes, `diagnose:roll20-chat-candidates`, `diagnose:roll20-chat-candidate-style`, `diagnose:roll20-chat-width-reconciliation`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Replace the hardcoded fixture-A `279px` diagnostic with a generic rolltemplate root intrinsic-width model, then re-run candidate comparison/style proof/gate. Continue fixture-C with crop/paint/overflow context; direct table width probes failed.

## 2026-06-20 Codex Update - chat width reconciliation gate

Status: PARTIAL. This chooses the next renderer experiment axis from current evidence; it does not change production ChatPane rendering yet.

- DONE: Added `scripts/roll20_chat_width_reconciliation.mjs` and package command `diagnose:roll20-chat-width-reconciliation`.
- DONE: Wired the reconciliation report into `gate:roll20-renderer-action` so the gate now prints fixture-specific next experiments after chat width/intrinsic/font/row diagnostics.
- RESULT: The next renderer work is now split by evidence instead of guesswork:
  - `fixture-A`: `TEXT_METRIC_ALLOCATION`, because table width delta `+15.744px` is explained by exact text metrics with residual `+0.142px`.
  - `fixture-c-commission-1bu`: `TABLE_SCROLL_INTRINSIC`, because table delta is `-24.309px`, scroll delta is `-24px`, and text residual is overconstrained at `+30.637px`.
  - `fixture-B`: `KEEP_DEFAULT` for now because aligned mismatch is `6.34%`, below the high-mismatch threshold.
- RESULT: `gate:roll20-renderer-action` still returns `HOLD_PRODUCTION_RENDERER_PATCH`; no global width/padding/font CSS is safe.
- VERIFIED: `diagnose:roll20-chat-width-reconciliation`, `gate:roll20-renderer-action`, and `status:roll20-actual`.
- STILL TODO P0: Build an fixture-A-scoped exact text/cell allocation candidate and a fixture-C/CoC-scoped table scroll/intrinsic probe, then run candidate comparison, style proof, renderer gate, lint, and build before any production renderer change.

## 2026-06-20 Codex Update - Roll20 chat current-metrics normalization

Status: PARTIAL. This removes stale-evidence false blockers and exposes the real renderer work; it does not solve chat visual parity.

- DONE: `status:roll20-actual` and `plan:roll20-chat-capture` can now treat legacy actual Roll20 sidecars as current when `latestTemplate.computedChildren` already contains measured table `boxMetrics` and style evidence. The normalized field is marked as `legacy-computedChildren`, not as a fresh recapture.
- DONE: `diagnose:roll20-chat-intrinsic-width` now preserves `tableStructure.table` instead of dropping it, so table `scrollWidth/clientWidth/overflow` deltas are available.
- DONE: `plan:roll20-chat-capture` now uses `captureDprCorrection.cssClip` when judging screenshot scale. This removes the fixture-B false `SCALE_OR_FORMAT_SUSPECT` warning for its DPR-corrected template crop.
- RESULT: `chatCurrentMetrics` moved from `1/3` to `3/3`; `chatCurrentMetricsMissing=0`; `chatCaptureSuspects=0`; capture plan reports fixture-A, fixture-B, and fixture-C as `PRESENT`.
- RESULT: Renderer action still correctly stays `HOLD_PRODUCTION_RENDERER_PATCH`; current blockers are now true renderer/model blockers, not stale evidence blockers.
- RESULT: Intrinsic model is sharper: fixture-A table `scrollDelta=+16px`, Les intrinsic width remains secondary, and fixture-C is now `TABLE_SCROLL_INTRINSIC_MODEL_REQUIRED` with `scrollDelta=-24px`.
- VERIFIED: `node --check` for changed scripts, `status:roll20-actual`, `plan:roll20-chat-capture -- --all --require-current-metrics`, `diagnose:roll20-chat-intrinsic-width`, `diagnose:roll20-chat-parity`, `diagnose:roll20-chat-rows`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Build narrow renderer diagnostics/patch candidates from the now-current evidence: fixture-A exact cell/text allocation, fixture-B shadow/border/crop paint, and fixture-C table scroll/intrinsic width. Do not ship a global ChatPane CSS patch.

## 2026-06-20 Codex Update - fixture-C Roll20 chat DPR recapture corrected

Status: PARTIAL. This fixes a bad evidence capture and keeps renderer CSS blocked; it does not solve Roll20 visual parity.

- DONE: Confirmed the latest fixture-C `roll20-chat.png` had captured the Roll20 Sandbox Tools panel, not the `.sheet-rolltemplate-coc` card. The earlier `98.57%` chat mismatch was therefore bad evidence, not a renderer conclusion.
- DONE: Hardened `scripts/roll20_chat_parity_diagnostics.mjs` so a sidecar that records an uncorrected CSS clip with CDP `scale=1` is marked as crop-geometry suspect.
- DONE: Recaptured fixture-C in the dedicated Roll20 verification editor with a DPR-multiplied CDP clip, downscaled it to the CSS template size, and updated the ignored local sidecar with `captureDprCorrection.applied=true`.
- RESULT: `diagnose:roll20-chat-parity` now returns `HIGH_MISMATCH` with `actualCropGeometrySuspect=0`; fixture-C aligned mismatch is now authoritative at `22.33%` (`26.45%` raw), not the false `98.57%`.
- RESULT: `status:roll20-actual` is back to `GENERATED_ACTUAL_SCREENSHOTS_DIFFED`, `generatedAuthoritative=YES`, `chatCaptureSuspects=0`, `rendererReady=NO`.
- RESULT: Current row/tableStructure sidecars are `1/3` current. fixture-C is current; fixture-A and fixture-B still need same-action Roll20 chat recapture because they are missing `latestTemplate.tableStructure`.
- VERIFIED: `node --check scripts\roll20_chat_parity_diagnostics.mjs`, `roll20_actual_screenshot_diff`, `diagnose:roll20-chat-parity`, `diagnose:roll20-chat-intrinsic-width`, `status:roll20-actual`, `gate:roll20-renderer-action`, and `plan:roll20-chat-capture -- --all --require-current-metrics`.
- STILL TODO P0: Recapture fixture-A and fixture-B actual Roll20 chat PNG + DOM sidecars with the current tableStructure probe before tuning ChatPane renderer CSS.
- STILL TODO P0: Keep `HOLD_PRODUCTION_RENDERER_PATCH`; current authoritative chat high mismatch is still `2/3` and candidate families remain split.

## 2026-06-20 Codex Update - Roll20 chat tableStructure evidence gate

Status: PARTIAL. This makes Roll20 chat/table intrinsic-width evidence stricter; it does not solve visual parity yet.

- DONE: Local ChatPane rolltemplate smoke now records `templateComputed.tableStructure`, including table box metrics, colgroup/col summaries, and longest-token text profile.
- DONE: Roll20 chat capture plan snippets now record the same `latestTemplate.tableStructure` shape for future actual Roll20 sidecars.
- DONE: `status:roll20-actual` and `gate:roll20-renderer-action` now treat missing `latestTemplate.tableStructure` as stale current metrics.
- RESULT: Current actual Roll20 chat sidecars are no longer considered current for table intrinsic-width work: `chatCurrentMetrics=0/3`, missing `latestTemplate.tableStructure` for fixture-A, fixture-B, and fixture-C 1BU.
- RESULT: Renderer action remains `HOLD_PRODUCTION_RENDERER_PATCH`, now with an explicit blocker requiring same-action Roll20 chat screenshot + DOM sidecar recapture before tuning ChatPane CSS.
- VERIFIED: `node --check` for changed scripts, `test:roll20-chat-capture-plan`, local `rolltemplate_chat_smoke` 3/3 PASS, `plan:roll20-chat-capture -- --all --require-current-metrics`, `diagnose:roll20-chat-intrinsic-width`, `diagnose:roll20-chat-font-glyph`, `diagnose:roll20-chat-rows`, `status:roll20-actual`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Recapture actual Roll20 chat sidecars with the new tableStructure probe, then rerun screenshot diff and renderer gate before any production renderer CSS change.

## 2026-06-20 Codex Update - Roll20 chat row geometry gate evidence

Status: PARTIAL. This improves the Roll20 renderer gate and next-action routing, but does not prove actual Roll20 visual parity.

- DONE: Fixed `scripts/roll20_chat_row_geometry_compare.mjs` so actual Roll20 table evidence is read from `computedChildren` when the sidecar does not expose the older `elements` array.
- DONE: Added row-geometry classification for chat rolltemplate evidence and wired it into `scripts/roll20_renderer_action_gate.mjs`.
- RESULT: Current row geometry split on `reports\roll20-actual-compare\2026-06-18-state-map-v1` is fixture-specific, not a single global CSS fix:
  - `fixture-A`: `CELL_ALLOCATION_WITH_UNIFORM_OFFSET`
  - `fixture-B`: `UNIFORM_OFFSET_PAINT_OR_CROP`
  - `fixture-c-commission-1bu`: `TABLE_WIDE_WIDTH_WITH_UNIFORM_OFFSET`
- RESULT: `gate:roll20-renderer-action` still returns `HOLD_PRODUCTION_RENDERER_PATCH`, now with row-geometry evidence included in the blocker report and next actions.
- VERIFIED: `node --check scripts\roll20_chat_row_geometry_compare.mjs`, `node --check scripts\roll20_renderer_action_gate.mjs`, `corepack pnpm run diagnose:roll20-chat-rows -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `corepack pnpm run gate:roll20-renderer-action -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `corepack pnpm run lint`, and `corepack pnpm run build`.
- STILL TODO P0: Do not ship a global ChatPane width/padding/font patch. Follow the split next actions: fixture-A needs cell allocation/exact text metrics, Les needs crop/shell/paint context, and fixture-C needs table-wide intrinsic width or source rolltemplate structure modeling.

## 2026-06-20 Codex Update - edit/preview UI labels and design CSS roundtrip fixed

Status: PARTIAL. This improves edit-mode usability and export/re-import stability, but does not prove actual Roll20 visual parity.

- DONE: Cleaned main mode labels/tooltips so users see `편집`, `분할`, `블록`, and `미리보기` instead of awkward or unclear wording.
- DONE: Cleaned preview toolbar labels/tooltips for sheet width, zoom, background mode, and legacy CSS toggle.
- DONE: Cleaned shared layer role labels in `lib/editor/layerRoles.ts`; role badges now use `프레임`, `흐름`, `표`, `입력`, `버튼`, `텍스트`, `이미지`, `런타임`, and `노드`.
- DONE: Changed editor-generated design classes from unprefixed `r20-node-*` to stable `sheet-r20-node-*` so moved-object CSS does not drift after export/re-import.
- RESULT: `smoke:imported-edit-sync` now PASSes all prepared fixtures again: edit position, preview position, emitted position CSS, flow insert, free insert, layer reorder where available, and re-import stability.
- RESULT: `smoke:preview-edit-visual` still PASSes all prepared fixtures: fixture-A `1.87%`, fixture-B `2.07%`, fixture-C 1BU `1.02%` local preview/edit mismatch.
- VERIFIED: `corepack pnpm run lint`, `corepack pnpm run build`, `corepack pnpm run smoke:preview-edit-visual -- --out-dir ./out --report-dir reports/preview-edit-visual`, and `corepack pnpm run smoke:imported-edit-sync -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/imported-edit-sync`.
- NOTE: A raw `corepack pnpm exec tsc --noEmit --pretty false` still fails on pre-existing test/import configuration issues outside this batch; `next build` TypeScript check passes.
- STILL TODO P0: Continue actual Roll20 renderer parity work; current production renderer gate remains blocked by prior `HOLD_PRODUCTION_RENDERER_PATCH` evidence.

## 2026-06-20 Codex Update - fixture-C sanitize typography candidate rejected

Status: PARTIAL. A plausible fixture-C sanitize/font-activation candidate was tested and rejected; do not promote it.

- DONE: Added diagnostic-only `fixture-c-sanitize-typography` ChatPane policy scoped to `.sheet-rolltemplate-coc`.
- DONE: The candidate applies actual Roll20-observed typography/wrapping/border-spacing values: Proxima stack, `13.65px`, `letter-spacing: normal`, `overflow-wrap: break-word`, and `border-spacing: 0`.
- DONE: Added the candidate to `scripts/roll20_chat_candidate_compare.mjs` and documented the smoke command in `scripts/README.md`.
- RESULT: Candidate smoke PASSed all three fixtures, proving the probe renders.
- RESULT: Candidate comparison rejected it hard: `risk=reject-regresses-fixtures`, mean delta `+4.71%`, fixture-C aligned mismatch worsened from `21.02%` to `35.14%` (`+14.12%`).
- RESULT: `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH` and now lists `fixture-c-sanitize-typography` among rejected candidates.
- VERIFIED: `node --check` for changed scripts, `lint`, `build`, `rolltemplate_chat_smoke` for the new candidate, `diagnose:roll20-chat-candidates`, `diagnose:roll20-chat-candidate-style`, `diagnose:roll20-chat-intrinsic-width`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Stop testing broad observed-style bundles for fixture-C. Next probe should isolate table intrinsic/max-content calculation or source rolltemplate structure, because combined sanitize typography makes pixels worse.

## 2026-06-20 Codex Update - fixture-C table-wide constraint model added

Status: PARTIAL. fixture-C chat/template mismatch is now narrowed to a table-wide intrinsic constraint, not cell allocation or transform.

- DONE: Enhanced `scripts/roll20_chat_intrinsic_width_model.mjs` with a `constraintModel` that checks row-width uniformity, max cell delta, row/cell content parity, CSS metric candidate rejection, and transform contradiction.
- DONE: Updated `scripts/roll20_renderer_action_gate.mjs` so intrinsic evidence prints `constraint`, `rowSpread`, and `maxCellDelta`.
- RESULT: fixture-C now reports `TABLE_WIDE_CONSTRAINT_MODEL_REQUIRED` / `TABLE_WIDE_CONSTRAINT_NOT_TRANSFORM`.
- RESULT: fixture-C table width delta is `-24.309px`, row width delta spread is `0px`, and max cell delta is only `0.909px`; row/cell content matches. This means the mismatch is table-wide intrinsic/max-content sizing or sanitize/font activation, not per-cell allocation.
- RESULT: Transform/scale remains blocked by actual Roll20 style proof (`transform:none`) and spacing candidates remain rejected/no-gain.
- RESULT: fixture-B is now `INTRINSIC_WIDTH_SECONDARY_OR_ACCEPTABLE`; current P0 should focus on fixture-C table-wide constraint and fixture-A cell/text metrics.
- VERIFIED: `node --check scripts\roll20_chat_intrinsic_width_model.mjs`, `node --check scripts\roll20_renderer_action_gate.mjs`, `diagnose:roll20-chat-intrinsic-width`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Build a diagnostic probe for Roll20 table intrinsic/max-content sizing and sanitize/font activation, without using transform, global spacing, or broad typography patches.

## 2026-06-20 Codex Update - chat shell geometry center-assumption fixed

Status: PARTIAL. A false fixture-C shell-offset diagnosis was removed; renderer parity is still not solved.

- DONE: `scripts/rolltemplate_chat_smoke.mjs` now records the rolltemplate root `getBoundingClientRect()` in local `templateComputed.rect`.
- DONE: `scripts/roll20_chat_shell_geometry.mjs` now computes local table offset from actual root/table rects when available instead of assuming `(rootWidth - tableWidth) / 2`.
- RESULT: Rebuilt default local chat smoke; all three fixtures still PASS.
- RESULT: fixture-C table offset changed from the previous false `+502.93px` model to `0px/0px`; the old offset was a diagnostic-script artifact, not Roll20 behavior.
- RESULT: fixture-B is now `SHELL_OK_OR_SECONDARY`; its table offset is only `-0.4px/-0.4px`, so shell geometry is not the current primary blocker.
- RESULT: fixture-C remains `WIDTH_MODEL_REQUIRED`, but now because table width/intrinsic layout differs (`tableDelta=-24.309px`), not because the local table is anchored hundreds of pixels away.
- RESULT: `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH`; current actual status remains `GENERATED_ACTUAL_SCREENSHOTS_DIFFED`, `generatedAuthoritative=YES`, `chatCaptureSuspects=0`, `rendererReady=NO`.
- VERIFIED: default `rolltemplate_chat_smoke`, `diagnose:roll20-chat-parity`, `diagnose:roll20-chat-candidates`, `diagnose:roll20-chat-shell-geometry`, `diagnose:roll20-chat-width`, `diagnose:roll20-chat-font-glyph`, `diagnose:roll20-chat-mask-strategy`, `gate:roll20-renderer-action`, and `status:roll20-actual --require-actual`.
- STILL TODO P0: Build a fixture-C intrinsic/table-width probe from the corrected zero-offset geometry, and avoid any candidate based on the old `502.93px` offset.

## 2026-06-20 Codex Update - fixture-A text-metric candidate rejected as no-gain

Status: PARTIAL. Added one safe diagnostic candidate, then rejected it as insufficient evidence for production.

- DONE: Added diagnostic-only `fixture-a-text-metrics` ChatPane typography policy. It applies actual Roll20-observed `13.65px` table/cell text metrics only to `.sheet-rolltemplate-aw`.
- DONE: Added the candidate to `scripts/roll20_chat_candidate_compare.mjs` and documented the smoke command in `scripts/README.md`.
- RESULT: `rolltemplate_chat_smoke` PASSed all three fixtures for `reports/rolltemplate-chat-smoke-fixture-a-text-metrics`.
- RESULT: Candidate comparison classified `fixture-a-text-metrics` as `no-meaningful-gain`: mean aligned delta `-0.13%`, regressions `0`, fixture-C delta `0%`.
- RESULT: `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH`; the fixture-A text-width split is not enough for a production renderer change.
- VERIFIED: `node --check` for changed scripts, `lint`, `build`, `rolltemplate_chat_smoke` for the new candidate, `diagnose:roll20-chat-candidates`, `diagnose:roll20-chat-candidate-style`, `diagnose:roll20-chat-font-glyph`, and `gate:roll20-renderer-action`.
- STILL TODO P0: For fixture-A, inspect sanitize/order/crop/paint evidence rather than only text metrics. For Les, test row/cell paint/allocation masks. For fixture-C, model table-layout/wrapping/intrinsic constraints.

## 2026-06-20 Codex Update - chat text-width model split added

Status: PARTIAL. The next renderer blocker is now split by text-width cause instead of one vague font/glyph bucket.

- DONE: Enhanced `scripts/roll20_chat_font_glyph_model.mjs` with a narrow text-width model that compares exact `measureText` deltas against actual table-width deltas.
- DONE: Updated `scripts/roll20_renderer_action_gate.mjs` so the gate prints each fixture's `textWidthModel` and table text residual.
- RESULT: fixture-A is now `TEXT_WIDTH_SCALE_MODEL_REQUIRED` / `TEXT_WIDTH_EXPLAINS_TABLE_WIDTH`; table text residual is only `+0.142px`, so the table width is almost fully explained by measured text width.
- RESULT: fixture-B is `TEXT_MEASUREMENT_DELTA_MODEL_REQUIRED` / `TEXT_WIDTH_SECONDARY_TO_PAINT_OR_CELL_ALLOCATION`; table delta is only `+0.8px`, so width is not the main blocker.
- RESULT: fixture-C is `TEXT_WIDTH_LAYOUT_CONSTRAINT_MODEL_REQUIRED` / `TEXT_WIDTH_OVERCONSTRAINED_BY_LAYOUT`; table text residual is `+30.637px`, so font/width CSS alone would be unsafe.
- RESULT: `gate:roll20-renderer-action` still correctly returns `HOLD_PRODUCTION_RENDERER_PATCH`.
- VERIFIED: `node --check scripts\roll20_chat_font_glyph_model.mjs`, `node --check scripts\roll20_renderer_action_gate.mjs`, `diagnose:roll20-chat-font-glyph`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Build fixture/template-specific candidate probes from these split decisions: fixture-A exact text metrics, Les row/cell paint or allocation masks, fixture-C table-layout/wrapping/intrinsic constraints.

## 2026-06-20 Codex Update - DPR-corrected chat crop gate fixed

Status: PARTIAL. Roll20 chat evidence is now authoritative again, but renderer parity is still blocked by real local-vs-Roll20 template differences.

- DONE: Fixed `scripts/roll20_chat_parity_diagnostics.mjs` so DPR-corrected template-only PNGs use `captureDprCorrection.cssClip` instead of stale broad `#textchat`/sidebar clip metadata.
- RESULT: `diagnose:roll20-chat-parity` now reports `actualTemplatePixelSuspect=0` and `actualCaptureScaleSuspect=0`.
- RESULT: `status:roll20-actual` returned to `GENERATED_ACTUAL_SCREENSHOTS_DIFFED`, with `generatedAuthoritative=YES`, `chatCaptureSuspects=0`, `chatNeedsNormalizedCapture=0`, `chatCurrentMetrics=3/3`, and `rendererReady=NO`.
- RESULT: Current authoritative chat mismatch is still high for 2/3 fixtures: fixture-A aligned `13.5%`, fixture-B aligned `6.34%`, fixture-C aligned `21.02%`.
- RESULT: `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH`, now for actual renderer-model reasons rather than suspect capture evidence.
- RESULT: Current split: fixture-A and fixture-C need table/intrinsic/text-width modeling; fixture-B is now width-secondary and should be treated as residual/paint/cell-allocation evidence rather than the main width blocker.
- VERIFIED: `node --check scripts\roll20_chat_parity_diagnostics.mjs`, `diagnose:roll20-chat-parity`, `status:roll20-actual`, `gate:roll20-renderer-action`, `diagnose:roll20-chat-font-glyph`, and `diagnose:roll20-chat-width`.
- STILL TODO P0: Build a narrow text/table-width renderer model from actual `measureText` deltas and table intrinsic metrics. Do not promote a broad global width/padding/font patch.

## 2026-06-20 Codex Update - Les/fixture-C actual chat text measurement recaptured

Status: PARTIAL. Actual Roll20 chat text-measure evidence now exists for all 3 prepared fixtures, but chat/template visual parity and production renderer CSS remain blocked.

- DONE: Used only the dedicated `Codex Roll20 Verify` Custom Sheet Sandbox/test campaign; no existing real room was modified.
- DONE: Recovered the Roll20 editor after the settings-page manifest wrapper caused an `unexpected token` editor parse failure.
- DONE: Confirmed the current Roll20 settings page must receive plain exported `sheet.json` text in `customcharsheet_json`; the generated upload snippet no longer wraps it as `{ sheet, userOptions, jsoninfo }`.
- DONE: Recaptured `fixture-B` actual Roll20 chat DOM sidecar and DPR-corrected template-only `roll20-chat.png`.
- DONE: Recaptured `fixture-c-commission-1bu` actual Roll20 chat DOM sidecar and DPR-corrected template-only `roll20-chat.png`.
- RESULT: fixture-B now has `textMeasureEvidence.status=MEASURED`, `samples=12`, latest template `sheet-rolltemplate-initiative-roll`, and normalized crop mismatch `2.92%` (`local=267x84`, `actual=267x82`).
- RESULT: fixture-C now has `textMeasureEvidence.status=MEASURED`, `samples=19`, latest template `sheet-rolltemplate-coc`, and normalized crop mismatch `35.23%` (`local=267x586`, `actual=267x586`).
- RESULT: `diagnose:roll20-chat-font-glyph` no longer reports `TEXT_MEASURE_RECAPTURE_REQUIRED`; all 3 fixtures are now `TEXT_MEASUREMENT_DELTA_MODEL_REQUIRED`.
- RESULT: `status:roll20-actual` is still `GENERATED_ACTUAL_SCREENSHOTS_DIFFED_WITH_SUSPECT_CHAT`, `rendererReady=NO`, `rendererAction=HOLD_PRODUCTION_RENDERER_PATCH`.
- RESULT: The latest gate still reports chat screenshot scale/foreground suspects and high aligned mismatch; do not tune production ChatPane CSS from these PNGs yet.
- VERIFIED: `node --check scripts\roll20_upload_snippet.mjs`, `snippet:roll20-upload`, `plan:roll20-chat-capture`, `roll20_actual_screenshot_diff`, `diagnose:roll20-chat-parity`, `diagnose:roll20-chat-font-glyph`, `status:roll20-actual`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Fix the Roll20 chat capture pipeline so DPR-corrected PNGs are not reported as non-1x/foreground suspects, then recapture or normalize before production renderer modeling.
- STILL TODO P0: Investigate the settings save path. Direct `FormData(settingsform)` POST corrupts Roll20 advanced JSON, and programmatic Ace value changes plus real save can still be fragile; prefer real UI/file inputs or a verified settings serializer.

## 2026-06-20 Codex Update - fixture-A actual chat text measurement recaptured

Status: PARTIAL. One actual Roll20 chat fixture advanced from stale sidecar to measured text-width evidence; Roll20 chat/template parity still fails and production renderer CSS remains blocked.

- DONE: Used the dedicated Roll20 verification editor tab only; no existing room was modified.
- DONE: Recaptured `fixture-A` actual Roll20 chat DOM evidence with the generated probe snippet.
- DONE: Fixed probe schema stability so `textRendering`, `webkitFontSmoothing`, and `mozOsxFontSmoothing` are always present even when the browser returns an empty platform value.
- DONE: Removed a bad full-panel/wrong-region chat screenshot and replaced it with a DPR-corrected, template-only `roll20-chat.png` crop saved under ignored local reports.
- RESULT: fixture-A actual chat sidecar now has `textMeasureEvidence.status=MEASURED`, `samples=12`, `latestTemplate=sheet-rolltemplate-aw`, and `captureDprCorrection.applied=true`.
- RESULT: `diagnose:roll20-chat-font-glyph` now classifies fixture-A as `TEXT_MEASUREMENT_DELTA_MODEL_REQUIRED` with mean text-width delta `3.642px`, instead of stale recapture required.
- RESULT: fixture-B and fixture-C still require actual Roll20 chat sidecar recapture with `textMeasureEvidence.samples`.
- RESULT: `status:roll20-actual` reports generated screenshots/diffs `6/6`, `chatCurrentMetrics=3/3`, `chatNormalizedHighMismatch=3`, `rendererReady=NO`.
- RESULT: `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH`; current blockers include Les/fixture-C textMeasure recapture and non-uniform renderer candidates.
- VERIFIED: `test:roll20-chat-capture-plan`, `plan:roll20-chat-capture --all --require-current-metrics`, `roll20_actual_screenshot_diff`, `diagnose:roll20-chat-parity`, `diagnose:roll20-chat-font-glyph`, `status:roll20-actual`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Load/restore fixture-B and fixture-C in the dedicated Roll20 Sandbox/test room, recapture template-only `roll20-chat.png` plus same-action DOM sidecars with text measurement, then rerun the same gates.

## 2026-06-20 Codex Update - Chat text measurement evidence added

Status: PARTIAL. Roll20 chat/template parity is still blocked, but the next font/glyph probe is now evidence-gated instead of guesswork.

- DONE: `scripts/rolltemplate_chat_smoke.mjs` now records local `textMeasureEvidence` with canvas `measureText` widths, element widths, computed CSS font strings, probe strings, and CSSOM font-face status.
- DONE: `scripts/roll20_chat_capture_plan.mjs` now emits Roll20 DOM probe snippets with the same `textMeasureEvidence` shape and treats old sidecars as stale when `--require-current-metrics` is used.
- DONE: `scripts/roll20_chat_font_glyph_model.mjs` compares text-measure sidecars and now reports `TEXT_MEASURE_RECAPTURE_REQUIRED` instead of implying a broad font/spacing CSS fix.
- RESULT: Local rolltemplate smoke still PASSes all 3 prepared fixtures and now has local samples: fixture-A `12`, fixture-B `12`, fixture-C `19`.
- RESULT: Existing actual Roll20 chat sidecars are stale: 3/3 lack `textMeasureEvidence.samples`, so all three fixtures need actual Roll20 chat DOM recapture before another ChatPane text-width candidate.
- RESULT: `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH` and now includes a blocker for missing actual text measurement evidence.
- VERIFIED: `node --check` for changed scripts, `test:roll20-chat-capture-plan`, `corepack pnpm run build`, local `rolltemplate_chat_smoke`, `diagnose:roll20-chat-font-glyph`, `plan:roll20-chat-capture --all --require-current-metrics`, and `gate:roll20-renderer-action`.
- STILL TODO P0: In the actual Roll20 Custom Sheet Sandbox/test room, recapture `roll20-chat-dom-evidence.json` with the new snippet beside same-action `roll20-chat.png`, then rerun font/glyph diagnosis and renderer gate.

## 2026-06-20 Codex Update - CoC table-scale candidate style-proof rejected

Status: PARTIAL. The fixture-C/CoC width candidate was narrowed further: visual scaling helps pixels, but actual Roll20 computed styles reject transform-based promotion.

- DONE: Added `diagnose:roll20-chat-intrinsic-width`, which compares local vs actual Roll20 rolltemplate table/row/cell intrinsic metrics.
- RESULT: Current intrinsic-width status is `INTRINSIC_WIDTH_MODEL_REQUIRED`.
- RESULT: `fixture-c-commission-1bu` is `TRANSFORM_REJECTED_INTRINSIC_WIDTH_MODEL_REQUIRED`: actual Roll20 rejects the `scaleX` explanation (`transform:none`) while table width is `-24.309px` from local.
- RESULT: `fixture-A` and `fixture-B` are `CSS_METRIC_DELTA_INTRINSIC_MODEL_REQUIRED`, so a global width/scale patch is still unsafe.
- DONE: Added diagnostic-only spacing candidates: `roll20-intrinsic-spacing`, `roll20-border-spacing`, and `roll20-letter-spacing`.
- RESULT: `roll20-border-spacing` has no meaningful pixel gain; `roll20-letter-spacing` and combined `roll20-intrinsic-spacing` regress fixture-C (`21.45% -> 24.45%` aligned).
- RESULT: Intrinsic model now classifies fixture-A/Les as `CSS_METRIC_CANDIDATES_REJECTED` and fixture-C as `TRANSFORM_AND_SPACING_REJECTED_FONT_GLYPH_MODEL_REQUIRED`.
- DONE: Added `diagnose:roll20-chat-font-glyph`, which compares font availability, computed font stacks, broad font candidate outcomes, and row text-width signals.
- RESULT: fixture-C is `FONT_AVAILABILITY_CHANGED_CANDIDATES_REJECTED`: actual Roll20 has different font availability and table font family, while broad font/typography candidates already regress or fail to help.
- RESULT: fixture-A/Les are `FONT_STYLE_CHANGED_CANDIDATES_REJECTED`: font/style signals remain relevant, but exact text measurement is needed rather than broad font CSS.
- RESULT: `gate:roll20-renderer-action` now includes the intrinsic-width model in evidence and next actions.
- DONE: `diagnose:roll20-chat-candidate-style` now checks both `candidate-needs-style-proof` and `single-fixture-only` candidates.
- DONE: Added style-proof coverage for `coc-table-scale-x` using its local smoke sidecar.
- RESULT: Style proof now reports `contradicted=2/2`: `no-shadow` and `coc-table-scale-x` are both contradicted by actual Roll20 computed styles.
- RESULT: `coc-table-scale-x` is contradicted because actual Roll20 `.sheet-rolltemplate-coc table` has `transform: none`, while the candidate uses `scaleX(0.981)`.
- RESULT: Renderer policy moves fixture-C from `CANDIDATE_ONLY_DO_NOT_EXPOSE` to `NEEDS_NARROW_TEMPLATE_MODEL`.
- RESULT: `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH` and now explicitly blocks style-contradicted candidates.
- VERIFIED: `node --check scripts\roll20_chat_candidate_style_proof.mjs`, `diagnose:roll20-chat-candidate-style`, `diagnose:roll20-chat-renderer-policy`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Capture actual/local per-font `measureText` widths and CSSOM font-face activation so fixture-C/CoC can be modeled without broad font/typography CSS.

## 2026-06-20 Codex Update - CoC rolltemplate table-scale candidate isolated

Status: PARTIAL. A fixture-local fixture-C/CoC chat-width candidate now exists, but Roll20 chat/template parity is still blocked and the candidate is not product-enabled.

- DONE: Added diagnostic-only `coc-table-scale-x` ChatPane geometry policy for `.sheet-rolltemplate-coc table`.
- DONE: Added smoke support and candidate-comparison coverage through `reports/rolltemplate-chat-smoke-coc-table-scale-x`.
- RESULT: Functional smoke PASSed all 3 prepared fixtures.
- RESULT: Candidate comparison shows `coc-table-scale-x` improves fixture-C aligned mismatch `21.45% -> 20.11%` (`-1.34%`) with `0` regressions, unlike global `table-scale-x` which remains `reject-regresses-fixtures`.
- RESULT: Renderer policy still keeps fixture-C as `CANDIDATE_ONLY_DO_NOT_EXPOSE`; the candidate is fixture-local and still needs actual Roll20 style proof before any renderer-model/default use.
- RESULT: `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH`; this is a narrower diagnostic candidate, not Roll20 visual parity.
- VERIFIED: `corepack pnpm run build`, `rolltemplate_chat_smoke` with `--chat-geometry-policy coc-table-scale-x`, `diagnose:roll20-chat-candidates`, `diagnose:roll20-chat-renderer-policy`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Add actual-style proof for the fixture-C/CoC table transform candidate or create a more faithful intrinsic-width model that explains the `4.607x` actual table/crop ratio without relying on visual-only scaling.

## 2026-06-20 Codex Update - Per-template chat width model added

Status: PARTIAL. Roll20 chat/template parity is still blocked, but the width/overflow blocker is now separated by fixture/template instead of treated as one global CSS problem.

- DONE: Added `scripts/roll20_chat_width_model.mjs` and package alias `diagnose:roll20-chat-width`.
- DONE: Wired the width model into `gate:roll20-renderer-action` and documented the command in `scripts/README.md`.
- RESULT: Width model status is `WIDTH_MODEL_REQUIRED`, actionable `2/3`.
- RESULT: `fixture-A` is `WIDTH_SECONDARY_OR_ACCEPTABLE` on the chat-width axis for now.
- RESULT: `fixture-B` is `CHAT_SHELL_WIDTH_MODEL_REQUIRED`: table width is nearly aligned (`+0.8px`) but shell/message/crop width still differs.
- RESULT: `fixture-c-commission-1bu` is `TABLE_WIDTH_MODEL_REQUIRED`: actual table/crop ratio is `4.607x`, proving this is an overflowed large-table crop case rather than a normal narrow-card width patch.
- RESULT: `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH`; this model blocks unsafe global width/padding/overflow CSS until a per-template candidate is proven.
- VERIFIED: `node --check` for the new script and renderer gate, `diagnose:roll20-chat-width`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Build the next targeted candidate from this split: Les shell/message width separately from fixture-C intrinsic/overflowed table width, then rerun chat smoke/parity/candidate comparison.

## 2026-06-20 Codex Update - Custom rolltemplate app class leak removed

Status: PARTIAL. A real app-CSS leak in ChatPane custom rolltemplate roots was removed, but Roll20 chat/template visual parity is still blocked.

- DONE: `components/editor/ChatPane.tsx` now renders imported/custom rolltemplate bodies with only the Roll20-style `sheet-rolltemplate-*` class on the template root.
- DONE: The app fallback card classes (`rt-card text-xs rounded ...`) remain only for generated/default fallback rolltemplates that have no imported custom body.
- RESULT: Functional local rolltemplate smoke still PASSes all 3 prepared fixtures.
- RESULT: Updated chat parity remains `HIGH_MISMATCH`: authoritative normalized high mismatch `2/3`, max aligned mismatch `21.45%`.
- RESULT: Raw current mismatches are fixture-A `7.09%`, fixture-B `18.38%`, fixture-C `24.84%`; aligned policy evidence still reports fixture-B `12.98%` and fixture-C `21.45%` as blockers.
- RESULT: `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH`; removing the app class leak is correct isolation work, not a sufficient renderer fix.
- VERIFIED: `corepack pnpm run build`, `rolltemplate_chat_smoke`, `diagnose:roll20-chat-parity`, `diagnose:roll20-chat-candidates`, `diagnose:roll20-chat-style`, `diagnose:roll20-chat-shell-geometry`, `diagnose:roll20-chat-font-cell`, `diagnose:roll20-chat-renderer-policy`, `diagnose:roll20-chat-residual`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Build a narrower per-template chat renderer model. Current evidence splits fixture-B toward shadow/border/rasterization and fixture-C toward geometry/width conflict; do not promote one global ChatPane CSS patch.

## 2026-06-20 Codex Update - Cell metrics candidate rejected

Status: PARTIAL. Roll20 chat/template parity is still blocked; a narrow cell metrics hypothesis was tested and rejected.

- DONE: Added hidden diagnostic-only `roll20-cell-metrics` ChatPane typography policy and smoke path.
- DONE: Added `cell-metrics` to chat candidate comparison and surfaced its result in `diagnose:roll20-chat-font-cell` / `gate:roll20-renderer-action`.
- RESULT: Functional smoke passed for all 3 fixtures.
- RESULT: Pixel comparison rejects `cell-metrics`: fixture-B worsened `12.90% -> 13.30%`, fixture-C worsened `21.45% -> 34.93%`, while fixture-A improved `7.35% -> 6.59%`.
- RESULT: Font size / letter-spacing / cell metric adjustment alone is not the Les fix. The font/cell model now classifies Les as `CELL_METRIC_CANDIDATES_REJECTED`.
- VERIFIED: `rolltemplate_chat_smoke` for `roll20-cell-metrics`, `diagnose:roll20-chat-candidates`, `diagnose:roll20-chat-font-cell`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Inspect CSS cascade/order and intrinsic table allocation for Les before another ChatPane typography/cell candidate.

## 2026-06-20 Codex Update - Chat font/cell model boundary added

Status: PARTIAL. Roll20 chat/template parity is still blocked, but broad typography patches are now explicitly separated from narrow cell allocation work.

- DONE: Added `diagnose:roll20-chat-font-cell`, which combines shell geometry, style context, candidate comparison, and renderer policy reports.
- DONE: Wired the font/cell model summary into `gate:roll20-renderer-action`.
- RESULT: `fixture-B` is `NARROW_CELL_ALLOCATION_MODEL_REQUIRED`: first cell width is `+4.141px`, font size differs by `+1.65px`, but `template-typography` only changed Les by `-0.01%` and is not a valid broad fix.
- RESULT: `fixture-c-commission-1bu` is `WIDTH_MODEL_BEFORE_FONT_CELL`; table width/overflow must be solved before font/cell tuning.
- RESULT: `fixture-A` stays `KEEP_DEFAULT_FOR_NOW` because its aligned chat mismatch is below the high-mismatch threshold.
- VERIFIED: `diagnose:roll20-chat-font-cell`, `node --check scripts\roll20_chat_font_cell_model.mjs`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Build a narrow, actual-style-proven cell allocation diagnostic for Les. Do not promote broad typography, font fallback, width, padding, or paint CSS globally.

## 2026-06-20 Codex Update - Chat shell geometry narrows Les mismatch

Status: PARTIAL. Roll20 chat/template parity is still blocked, but the fixture-B shell/crop hypothesis is now narrower.

- DONE: Added `diagnose:roll20-chat-shell-geometry`, which compares local ChatPane root/table/cell geometry with actual Roll20 chat DOM sidecars.
- DONE: Wired shell geometry into `gate:roll20-renderer-action`.
- RESULT: Current shell status is `SHELL_MODEL_NEEDED`.
- RESULT: `fixture-B` is now `CELL_WIDTH_MODEL_MISMATCH`: message width and template width match, actual crop margin is `2/2/2/2`, but actual first cell is `+4.141px` wider and template height is `-1.2px` compared with local.
- RESULT: `fixture-c-commission-1bu` remains `WIDTH_MODEL_REQUIRED`; actual table width differs by `-24.309px`.
- RESULT: `fixture-A` remains shell-secondary for this axis because its aligned chat mismatch is below the current high-mismatch threshold.
- VERIFIED: `diagnose:roll20-chat-shell-geometry`, `node --check scripts\roll20_chat_shell_geometry.mjs`, and `gate:roll20-renderer-action`.
- STILL TODO P0: Build a font/cell-width diagnostic model before any production ChatPane CSS. Prior broad typography and paint candidates are not sufficient evidence for a global patch.

## 2026-06-20 Codex Update - Chat mask strategy gate added

Status: PARTIAL. Roll20 chat/template parity is still blocked, but the next renderer strategy is now less ambiguous.

- DONE: Added `diagnose:roll20-chat-mask-strategy`, which reads existing chat parity/residual/candidate reports and classifies the next action from row-band, left-edge, luma, and mask evidence.
- DONE: Wired the mask strategy summary into `gate:roll20-renderer-action`.
- RESULT: Current strategy status is `STRATEGY_NEEDED`, high mismatch `2/3`.
- RESULT: `fixture-B` is now classified as `RECROP_OR_SHELL_CONTEXT_BEFORE_CSS`; next step is to compare actual/local message shell padding, template crop x/y, and row-band masks before another CSS candidate.
- RESULT: `fixture-c-commission-1bu` is now classified as `MODEL_TEMPLATE_WIDTH_BEFORE_PAINT`; next step is a per-template chat width model before paint CSS.
- RESULT: `fixture-A` stays `KEEP_DEFAULT_FOR_NOW` for this chat axis.
- VERIFIED: `diagnose:roll20-chat-mask-strategy`, `node --check` for the new strategy script and renderer gate, and `gate:roll20-renderer-action`.
- STILL TODO P0: Build the Les crop/shell diagnostic probe and the fixture-C per-template width model. This does not prove Roll20 visual parity and does not authorize production ChatPane CSS.

## 2026-06-20 Codex Update - Chat paint residual candidates tested

Status: PARTIAL. Roll20 chat/template parity is still blocked; two paint/raster hypotheses were tested as diagnostic-only candidates and must not be promoted.

- DONE: Added hidden localStorage-only `chatPaintPolicy` diagnostics in `ChatPane`: `roll20-dim-background` and `roll20-edge-shadow`.
- DONE: Added smoke support for `--chat-paint-policy` and included both paint candidates in `diagnose:roll20-chat-candidates`.
- RESULT: Both candidates functionally rendered all 3 fixtures in local ChatPane smoke.
- RESULT: `paint-dim-background` improved fixture-C from `21.45%` to `19.65%`, but fixture-B only changed `12.90% -> 12.85%`; this is not a Les fix and remains `single-fixture-only`.
- RESULT: `paint-edge-shadow` did not help; fixture-B worsened `12.90% -> 13.15%`.
- RESULT: `gate:roll20-renderer-action` still correctly reports `HOLD_PRODUCTION_RENDERER_PATCH`.
- VERIFIED: `corepack pnpm run build`, two `rolltemplate_chat_smoke` paint-policy runs, `diagnose:roll20-chat-candidates`, `diagnose:roll20-chat-renderer-policy`, `diagnose:roll20-chat-residual`, `gate:roll20-renderer-action`, `corepack pnpm run lint`, and `guard:roll20-evidence`.
- STILL TODO P0: fixture-B residual is not solved by simple dimming or edge shadow. Next diagnostic should compare actual/local chat crop shell, row-band masks, and Roll20 canvas/browser rasterization around the rolltemplate boundary.
- STILL TODO P0: fixture-C still needs a per-template chat width model; `paint-dim-background` is only a diagnostic clue and not a production renderer patch.

## 2026-06-20 Codex Update - Chat residual axes classified

Status: PARTIAL. Roll20 chat/template parity is still blocked, but the next investigation target is now narrower.

- DONE: Added `diagnose:roll20-chat-residual`, which reads the current chat parity/style/candidate/policy reports and classifies remaining mismatch by residual axis.
- DONE: Wired the residual summary into `gate:roll20-renderer-action` so future renderer work sees the axis split in the standard gate output.
- RESULT: Current residual status is `RESIDUALS_REMAIN`, high mismatch `2/3`.
- RESULT: `fixture-B` is classified as `SHADOW_BORDER_RASTERIZATION`, not simple typography or width. Next diagnostic: test border/shadow/background negative controls against actual computed style and pixel masks.
- RESULT: `fixture-c-commission-1bu` is classified as `GEOMETRY_WIDTH_CONFLICT`. Next diagnostic: compare Roll20 chat shell/message/template width model per template before any width or padding patch.
- RESULT: `fixture-A` remains `DEFAULT_ACCEPTABLE_FOR_NOW` for chat because default aligned mismatch is `7.35%`, below the current high-mismatch threshold.
- VERIFIED: `corepack pnpm run diagnose:roll20-chat-residual -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `corepack pnpm run gate:roll20-renderer-action -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `corepack pnpm run lint`, and `corepack pnpm run build`.
- STILL TODO P0: Build and test a Les-only paint/raster diagnostic candidate; do not try more broad typography candidates.

## 2026-06-20 Codex Update - Template typography candidate rejected

Status: PARTIAL. A plausible fixture-B chat hypothesis was tested and rejected; Roll20 chat/template parity is still blocked.

- DONE: Added a hidden diagnostic-only `roll20-template-typography` ChatPane policy and `template-typography` candidate smoke path.
- DONE: The candidate applies observed Roll20 template typography/color/letter-spacing/font-smoothing to rolltemplate roots, tables, captions, and cells for local comparison only. It is not exposed in product UI.
- RESULT: Functional smoke passed for fixture-A, fixture-B, and fixture-C, so the candidate is mechanically testable.
- RESULT: Pixel comparison rejected it: fixture-B improved only `12.90% -> 12.89%`, fixture-A regressed `7.35% -> 7.76%`, and fixture-C regressed badly `21.45% -> 31.00%`.
- RESULT: `gate:roll20-renderer-action` now reports `template-typography` as a fixture-regressing candidate; it must not be promoted to production ChatPane CSS.
- VERIFIED: `node scripts\rolltemplate_chat_smoke.mjs --out-dir .\out --base-path /roll20-block-editor --fixtures test-fixtures\visual --report-dir reports\rolltemplate-chat-smoke-template-typography --chat-typography-policy roll20-template-typography --port 4197`, `diagnose:roll20-chat-candidates`, `diagnose:roll20-chat-renderer-policy`, `gate:roll20-renderer-action`, and `corepack pnpm run lint`.
- STILL TODO P0: fixture-B still needs a new diagnostic model. The remaining Les mismatch is not solved by simple template typography; next work should inspect background/border/shadow/anti-aliasing or crop shell effects from actual Roll20 evidence.

## 2026-06-20 Codex Update - Chat renderer policy gate

Status: PARTIAL. Roll20 chat/template parity is still blocked, but the unsafe global-patch boundary is now explicit.

- DONE: Added `diagnose:roll20-chat-renderer-policy`, which converts current actual Roll20 chat parity/style/candidate evidence into a diagnostic-only per-fixture renderer policy.
- DONE: Wired the policy into `gate:roll20-renderer-action` so agents see the split before attempting another global ChatPane width/padding/font patch.
- RESULT: Current policy is `HOLD_GLOBAL_CHAT_RENDERER_PATCH`, `publicUi=DO_NOT_EXPOSE`, with no global-safe candidates.
- RESULT: Fixture decisions are split: `fixture-A=KEEP_DEFAULT_CHAT_RENDERER`, `fixture-B=NEEDS_NEW_DIAGNOSTIC_MODEL`, `fixture-c-commission-1bu=CANDIDATE_ONLY_DO_NOT_EXPOSE`.
- RESULT: The policy records the conflicting actual table-width deltas: fixture-A `+33.134px`, fixture-B `+0.8px`, fixture-C `-24.309px`.
- VERIFIED: `corepack pnpm run diagnose:roll20-chat-renderer-policy -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `corepack pnpm run gate:roll20-renderer-action -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `corepack pnpm run lint`, and `corepack pnpm run build`.
- STILL TODO P0: Create a new fixture-B chat diagnostic model and prove or reject the fixture-C fixture-local candidates from actual Roll20 computed style before any production ChatPane CSS.

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
- VERIFIED: `corepack pnpm run lint`, `corepack pnpm run build`, `corepack pnpm run smoke:roll20-sandbox-preview -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --fixture fixture-B --report-dir reports/roll20-sandbox-preview-smoke --port 4331`, and `corepack pnpm run guard:roll20-renderer-model`.
- STILL TODO P0: Continue actual Roll20 renderer/chat parity work. This UI cleanup does not change the current `HOLD_PRODUCTION_RENDERER_PATCH` boundary and does not prove visual parity.

## 2026-06-20 Codex Update - Input-flow rollout policy is machine-readable

Status: PARTIAL. The input-flow renderer model still must not be exposed, but the boundary is now machine-readable.

- DONE: `diagnose:roll20-input-flow-axis` now writes `modelRollout` with `globalDecision`, `publicUiDecision`, per-fixture `productDecision`, recommended diagnostic model, blockers, and required evidence.
- DONE: `gate:roll20-renderer-action` now reads the rollout policy and reports it as standard warning/evidence.
- RESULT: Latest rollout policy is `globalDecision=DO_NOT_ENABLE_GLOBALLY`, `publicUiDecision=DO_NOT_EXPOSE`, candidate models `renderer-model:input-flow-276` and `renderer-model:input-flow-27`, blocker `fixture-A:KEEP_DEFAULT_BLOCKS_GLOBAL`.
- RESULT: Per-fixture policy is now explicit: fixture-A keeps `default`; fixture-B and fixture-C are `CANDIDATE_ONLY_DO_NOT_EXPOSE`.
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
- RESULT: `diagnose:roll20-computed-style-context` still reports `DO_NOT_PROMOTE_DIRECTLY` for `3/3`. fixture-B favors an inline/text-input candidate slice, but fixture-A and fixture-C do not support a global renderer CSS promotion.
- STILL TODO P0: Implement or prototype a renderer-model boundary that can represent input/inline-flow and chat-template differences per fixture/template without turning them into one global CSS patch.
- VERIFIED: `diagnose:roll20-renderer-blocker`, `diagnose:roll20-computed-style-context`, `corepack pnpm run lint`, and `corepack pnpm run build`.

## 2026-06-20 Codex Update - Chat candidate proof gate cleanup

Status: PARTIAL. Roll20 chat/template parity still fails; no production ChatPane CSS was promoted.

- DONE: Updated `gate:roll20-renderer-action` so a candidate already classified by `diagnose:roll20-chat-candidate-style` is no longer also reported as "without actual Roll20 style proof".
- RESULT: A tentative default `overflow-wrap: break-word` ChatPane patch was tested and then reverted because it is not globally safe. It improved/changed some geometry but worsened the overall renderer target enough that it must stay diagnostic-only.
- RESULT: Current regenerated chat parity still reports `HIGH_MISMATCH`: `2/3` authoritative normalized fixtures fail, authoritative max aligned mismatch is `21.45%`, and current metrics are present for `3/3`.
- RESULT: Current candidate comparison rejects fixture-regressing candidates and leaves no `candidate-needs-style-proof` candidate after the latest baseline; `roll20-break-word` is now `no-meaningful-gain`, not a production patch.
- STILL TODO P0: Build a narrower per-fixture/per-template renderer model. fixture-A and fixture-C still have opposite actual table-width deltas, so one global ChatPane width/padding/wrap patch is blocked.
- VERIFIED: `node scripts/rolltemplate_chat_smoke.mjs`, `diagnose:roll20-chat-parity`, `diagnose:roll20-chat-style`, `diagnose:roll20-chat-candidates`, `diagnose:roll20-chat-candidate-style`, `gate:roll20-renderer-action`, `corepack pnpm run lint`, and `corepack pnpm run build`.

## 2026-06-20 Codex Update - Roll20 chat current metrics complete

Status: PARTIAL. Actual Roll20 chat evidence is now current for the 3-fixture set, but renderer/chat parity still fails.

- DONE: Reclaimed only the dedicated `Codex Roll20 Verify` Roll20 Sandbox/editor. No existing real room was edited.
- DONE: Recaptured fixture-A, fixture-B, and fixture-C `roll20-chat.png` plus same-action `roll20-chat-dom-evidence.json` with current row/typography/text-rendering fields.
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
- STILL TODO P0: Recapture fixture-A, fixture-B, and fixture-C actual Roll20 chat DOM sidecars with the new text-rasterization fields, then rerun `diagnose:roll20-chat-candidate-style` to prove or reject `text-auto-aa`.

## 2026-06-20 Codex Update - Chat candidate actual-style proof

Status: PARTIAL. Three pixel-improving ChatPane candidates are now rejected by actual Roll20 computed style; renderer/chat parity is still blocked.

- DONE: Added `diagnose:roll20-chat-candidate-style`, which compares `candidate-needs-style-proof` local ChatPane candidates against actual Roll20 chat DOM sidecars.
- RESULT: `table-scale-x` is contradicted by actual Roll20 table `transform` for `3/3` fixtures. Actual Roll20 uses no matching `scaleX(0.981)` transform.
- RESULT: `no-shadow` is contradicted by fixture-C actual Roll20 cells: comparable nodes still keep strong `text-shadow`, so blanket no-shadow is not a valid generic renderer patch.
- RESULT: `roll20-break-word` is compatible with fixture-C but contradicted by fixture-A and fixture-B, so it is not global-safe.
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

- DONE: `diagnose:roll20-chat-candidates` now reports per-fixture aligned deltas, mean delta, regression count, and a promotion-risk label instead of leaning on the fixture-C number alone.
- RESULT: Latest candidate comparison shows `no-shadow` mean `-1.46%` and `table-scale-x` mean `-1.01%`, both marked `candidate-needs-style-proof` because they improve pixels without actual Roll20 computed-style proof.
- RESULT: `soft-shadow-rejected`, `roll20-message-padding`, `font-fallback`, `tight-cell-spacing`, and `shell-typography` are now clearly classified as fixture-regressing candidates.
- STILL TODO P0: Do not promote any ChatPane width/padding/shadow/table transform to production CSS until actual Roll20 style evidence explains the cross-fixture conflict.
- STILL TODO P0: Renderer gate must remain `HOLD_PRODUCTION_RENDERER_PATCH`; no Roll20 visual parity or all-sheet support claim is allowed.

## 2026-06-20 Codex Update - Les chat authoritative recapture cleared

Status: PARTIAL. The fixture-B chat crop trust blocker is cleared; Roll20 renderer/chat parity is still blocked.

- DONE: Reclaimed the dedicated `Codex Roll20 Verify` Roll20 editor/Sandbox tab and captured fixture-B `sheet-rolltemplate-initiative-roll` from the visible text chat panel with CDP `Page.captureScreenshot`.
- DONE: Saved the corrected crop and sidecar only under ignored local `reports/roll20-actual-compare/2026-06-18-state-map-v1/`; no real room was modified and no private sheet/source evidence is to be committed.
- RESULT: `plan:roll20-chat-capture -- --require-current-metrics` now reports `ALL_CHAT_EVIDENCE_TRUSTED` and `plannedFixtures=0/3`.
- RESULT: `status:roll20-actual -- --require-actual` now passes with `GENERATED_ACTUAL_SCREENSHOTS_DIFFED`, `generatedAuthoritative=YES`, `chatCaptureSuspects=0`, `chatActualCropGeometrySuspect=0`, and `chatActualTemplatePixelSuspect=0`.
- RESULT: `diagnose:roll20-chat-parity` still reports real mismatch after the capture fix: fixture-A `28.89%` raw, fixture-B `16.04%` raw, fixture-C `26.98%` raw; aligned authoritative high mismatch remains `2/3` with max `23.4%`.
- STILL TODO P0: Renderer gate remains `HOLD_PRODUCTION_RENDERER_PATCH`; next work is local ChatPane/Roll20 shell/template sizing and default-state renderer analysis, not more Les crop cleanup.
- STILL TODO P0: `gate:roll20-renderer-ready` must keep failing until renderer/chat parity is proven. Do not claim Roll20 visual parity or all-sheet support.

Follow-up diagnostic: Added rejected local-only chat geometry candidate `roll20-message-padding` because current actual crops show local rolltemplate screenshots about `12px` wider than Roll20 crops. Functional smoke passed for fixture-A, fixture-B, and fixture-C, but `diagnose:roll20-chat-candidates` rejected it: fixture-C aligned mismatch worsened from `22.68%` to `27.54%`. Keep it as a reproducible negative control; do not promote it to production ChatPane CSS.

Follow-up style context diagnostic: Added `diagnose:roll20-chat-style`, which compares local ChatPane computed style/row sidecars against actual Roll20 chat sidecars. Latest report compares `3/3` fixtures and narrows the structured deltas: fixture-A has actual table width `+33.134px` plus typography deltas, fixture-B is mostly typography-only with tiny geometry deltas, and fixture-C has table width `-24.309px` plus clipped-overflow evidence. A new `roll20-break-word` candidate tested the fixture-C `overflow-wrap: break-word` clue, but candidate comparison rejected it as neutral/slightly worse (`22.68% -> 22.77%` aligned). Keep both padding and break-word as negative controls; next P0 should compare table/font rasterization and the `table-scale-x`/shadow diagnostics against actual computed style before production CSS.

Follow-up renderer gate integration: `gate:roll20-renderer-action` now reads `chat-style-context-diagnostics` and adds a blocker when actual Roll20 chat table-width deltas conflict across fixtures. Current gate explicitly blocks single ChatPane width/padding promotion because fixture-A is `+33.134px`, fixture-B is `+0.8px`, and fixture-C is `-24.309px`. This makes the next P0 table/font/shadow renderer investigation visible in the standard gate output instead of buried in local reports.

## 2026-06-20 Codex Update - Roll20 chat crop foreground guard

Status: PARTIAL. Evidence quality improved; renderer/chat parity remains blocked.

- DONE: Detected that the latest fixture-B actual `roll20-chat.png` is not a trustworthy rolltemplate crop. The PNG contains map/grid pixels while the DOM sidecar reports `sheet-rolltemplate-initiative-roll` text.
- DONE: `diagnose:roll20-chat-parity` now computes foreground pixel sanity metrics and reports `actualTemplatePixelSuspect=1` for this bad crop.
- DONE: `status:roll20-actual` and `gate:roll20-renderer-action` now expose `chatActualTemplatePixelSuspect` / foreground-pixel blockers so agents do not tune production ChatPane CSS from contaminated evidence.
- DECISION: Reverted the tentative ChatPane `340px` production width change. The live Roll20 DOM supports investigating `340px`, but the screenshot evidence must be recaptured before any production CSS promotion.
- RESULT: Current status remains `rendererReady=NO`. Authoritative normalized chat mismatch is now `2/3` after excluding the contaminated Les crop; authoritative max aligned mismatch is `23.4%`. The suspect-including max remains `91.69%` and must not be used as a CSS target.
- VERIFIED: `corepack pnpm run lint`, `corepack pnpm run build`, `diagnose:roll20-chat-parity`, `status:roll20-actual`, `gate:roll20-renderer-action`, and `guard:roll20-evidence`.
- STILL TODO P0: Recapture fixture-B actual chat from a visibly open text chat panel with verified screenshot surface coordinates. Then rerun the full chat parity/status/gate loop before changing ChatPane shell sizing.
- STILL TODO P0: fixture-A/fixture-C still have authoritative Roll20 chat mismatch; do not claim Roll20 chat parity or all-sheet support.

Follow-up: Narrowed the Roll20 viewport and scrolled the text chat panel so the fixture-B `Initiative :` template was visibly captured in ignored local evidence. `diagnose:roll20-chat-parity` now reports `actualTemplatePixelSuspect=0`, but the sidecar is marked with manual coordinate calibration, so `actualCropGeometrySuspect=1` and `NEEDS_AUTHORITATIVE_CAPTURE` is still correct. Current `status:roll20-actual`: `chatAuthoritativeNormalizedHighMismatch=2`, `chatActualCropGeometrySuspect=1`, `chatMaxAlignedMismatch=65.02%`, `rendererReady=NO`.

Follow-up status hardening: `status:roll20-actual` now reports `GENERATED_ACTUAL_SCREENSHOTS_DIFFED_WITH_SUSPECT_CHAT` instead of the overly broad `GENERATED_ACTUAL_SCREENSHOTS_DIFFED` when chat capture suspects remain. Current command output: `generatedAuthoritative=NO`, `chatCaptureSuspects=1`, `actualEvidenceComplete=false`; `--require-actual` correctly exits non-zero until authoritative chat evidence is recaptured.

Follow-up capture-plan hardening: `plan:roll20-chat-capture -- --require-current-metrics` now includes chat parity crop/pixel/scale suspects in its recapture reasons. It currently reports `NEEDS_CAPTURE`, `plannedFixtures=1/3`, with fixture-B listed for manual coordinate calibration. This remains the next concrete Roll20 evidence task.

## 2026-06-20 Codex Update - fixture-A/Les Roll20 chat current-metric recapture

Status: PARTIAL. Current row/typography evidence is now complete for all three real Roll20 chat fixtures, but Roll20 chat/template parity is still failing.

- DONE: Recaptured fixture-A `sheet-rolltemplate-aw` current DOM evidence from the dedicated Roll20 verification Sandbox/editor tab. No existing real room was modified.
- DONE: Recaptured fixture-B `sheet-rolltemplate-initiative-roll` current DOM evidence from the same dedicated verification tab. Les upload file-input dispatch ran in the Sandbox Tools, but the manifest target was missing on the visible editor page, so this is treated as chat evidence recapture, not a fresh proven sheet-body activation.
- DONE: Both sidecars now include `latestTemplate.computedStyle`, `latestTemplate.rowMetrics`, `latestTemplate.computedChildren[selector="table"]` computed style/box metrics, `fontEvidence.checks`, and `viewportEvidence.devicePixelRatio`.
- RESULT: `plan:roll20-chat-capture -- --require-current-metrics` reports `ALL_CHAT_EVIDENCE_TRUSTED` with `plannedFixtures=0/3`.
- RESULT: `status:roll20-actual` reports `chatCurrentMetrics=3/3`, `chatCurrentMetricsMissing=0`, `chatActualCaptureScaleSuspect=0`, and `chatActualCropGeometrySuspect=0`.
- RESULT: `diagnose:roll20-chat-parity` still reports `HIGH_MISMATCH`: fixture-A `26.78%` raw / `21.49%` aligned, fixture-B `17.79%` raw / `17.79%` aligned, fixture-C `26.21%` raw / `22.77%` aligned.
- RESULT: `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH` with 2 blockers: chat rolltemplate crops differ for `3/3`, and full-root renderer patch families are still split across fixtures.
- STILL TODO P0: Re-normalize local ChatPane vs actual Roll20 chat shell/template geometry using the new current sidecars. Do not promote production ChatPane CSS while all three chat crops are high mismatch.
- STILL TODO P0: Resolve the split full-root renderer model before returning to edit-mode UX changes.

## 2026-06-20 Codex Update - fixture-C Roll20 chat current-metric recapture

Status: PARTIAL. One real Roll20 chat fixture now has current row/typography evidence; Roll20 chat/template parity is still NOT done.

- DONE: Applied fixture-C generated HTML/CSS/translation to the dedicated Roll20 Custom Sheet Sandbox/test editor. File-input dispatch succeeded, but Roll20 later showed a translation parse warning; the endpoint fallback to `/sheetsandbox/savesheetsettings` returned `200` for HTML, CSS, and translation.
- DONE: Captured visible `sheet-rolltemplate-coc` evidence from the actual Roll20 chat panel with current DOM sidecar fields: `latestTemplate.computedStyle`, `latestTemplate.rowMetrics`, table computed style, table box metrics, `fontEvidence.checks`, and `viewportEvidence.devicePixelRatio`.
- FIXED CAPTURE PROCEDURE: The first CDP crop used CSS coordinates and captured the wrong Sandbox Tools region on a DPR `1.25` tab. The accepted capture used DPR-multiplied physical coordinates, then downscaled back to CSS pixel size and recorded the correction in the sidecar.
- RESULT: `plan:roll20-chat-capture -- --require-current-metrics` now plans `2/3` fixtures instead of `3/3`; fixture-C is no longer a current-metric blocker.
- RESULT: Current status reports `chatCurrentMetrics=1/3`, `chatCurrentMetricsMissing=2`, `chatActualCaptureScaleSuspect=0`, `chatActualCropGeometrySuspect=0`, and `chatMaxAlignedMismatch=22.77%`.
- STILL TODO P0: Recapture fixture-A and fixture-B with same-action current-metric sidecars. Do not synthesize simplified chat commands just to make the metric count green; the rolltemplate screenshot must remain comparable to local smoke evidence.
- STILL TODO P0: fixture-C itself still has a high chat mismatch (`26.21%` raw, `22.77%` aligned). Treat the new sidecar as root-cause evidence, not parity.

## 2026-06-20 Codex Update - Status/gate now surface stale Roll20 chat sidecars

Status: PARTIAL. Roll20 chat/template parity is still NOT done; the status and renderer gate now expose the stale-sidecar blocker directly.

- DONE: `status:roll20-actual` now reads each fixture's `roll20-chat-dom-evidence.json` and reports whether current row/typography fields are present.
- RESULT: Current run reports `chatCurrentMetrics=0/3` and `chatCurrentMetricsMissing=3` for fixture-A, fixture-B, and fixture-C. The old chat screenshots are normalized enough for crop comparison, but their DOM sidecars predate the current row/typography probe.
- DONE: `gate:roll20-renderer-action` now adds a blocker when current Roll20 chat sidecars lack `latestTemplate.computedStyle`, `latestTemplate.rowMetrics`, table computed style, table box metrics, `fontEvidence.checks`, or `viewportEvidence.devicePixelRatio`.
- RESULT: Renderer gate remains `HOLD_PRODUCTION_RENDERER_PATCH` with 3 blockers: fixture-C/local ChatPane mismatch, stale current-metric chat sidecars, and split renderer patch family.
- STILL TODO P0: Recapture Roll20 chat for all 3 fixtures, prioritizing fixture-C `sheet-rolltemplate-coc`, using the `--require-current-metrics` capture plan. Then rerun screenshot diff, chat parity, renderer gate, and status before changing production ChatPane CSS.

## 2026-06-20 Codex Update - Current-metric Roll20 chat recapture gate

Status: PARTIAL. Roll20 chat/template parity is still NOT done; the next real recapture blocker is now encoded in tooling.

- DONE: Added `--require-current-metrics` to `plan:roll20-chat-capture`. It now treats a Roll20 chat sidecar as stale when it lacks current renderer-diagnostic fields: `latestTemplate.computedStyle`, `latestTemplate.rowMetrics`, table computed style, table box metrics, `fontEvidence.checks`, and `viewportEvidence.devicePixelRatio`.
- RESULT: `plan:roll20-chat-capture -- reports/.../2026-06-18-state-map-v1 fixture-c-commission-1bu --require-current-metrics` now reports `NEEDS_CAPTURE` even though the old fixture-C screenshot/sidecar pair exists, because the sidecar predates the current row/typography probe.
- RESULT: Running the same plan across all fixtures reports fixture-A, fixture-B, and fixture-C as needing current-metric recapture. This reconciles the prior contradiction where `status:roll20-actual` accepted chat evidence while `diagnose:roll20-chat-rows` said `NEEDS_RECAPTURE`.
- STILL TODO P0: Load/reroll fixture-C in the dedicated Roll20 Sandbox/test room, capture `roll20-chat.png` and `roll20-chat-dom-evidence.json` from the same `sheet-rolltemplate-coc` action, and rerun screenshot diff, chat parity, renderer gate, and status.

## 2026-06-20 Codex Update - Roll20 shell typography candidate rejected

Status: PARTIAL. Roll20 chat/template parity is still NOT done; one live-style hypothesis is now reproducibly rejected.

- DONE: Added diagnostic-only `--chat-typography-policy roll20-shell-typography` to local `rolltemplate_chat_smoke` and ChatPane. It applies the observed Roll20 shell typography (`13.65px`, normal letter spacing, Proxima stack) to rolltemplate roots/tables only when explicitly enabled through localStorage/smoke args.
- RESULT: Fresh default local smoke remains functional PASS for fixture-A, fixture-B, and fixture-C and compares to actual Roll20 at raw mismatches fixture-A `12.78%`, fixture-B `10.09%`, fixture-C `28.36%`.
- REJECTED: Fresh shell-typography candidate is also functional PASS but worsens pixels: fixture-A `13.09%`, fixture-B `10.09%`, fixture-C `30.52%`. Do not promote this as production ChatPane behavior.
- INTERPRETATION: The live Roll20 shell font-size/letter-spacing mismatch is real, but direct shell typography override is not the missing renderer model. Continue investigating fixture-C text/highlight/shadow compositing and actual `sheet-rolltemplate-coc` recapture instead.
- STILL TODO P0: Recapture/probe fixture-C `sheet-rolltemplate-coc` in actual Roll20 with current typography/row fields, then compare same-moment sidecar and screenshot before changing production ChatPane CSS.

## 2026-06-20 Codex Update - Live chat typography probe classified

Status: PARTIAL. Roll20 chat/template parity is still NOT done; this batch prevents a live probe from being misread as the wrong fixture.

- DONE: Added `diagnose:roll20-chat-live-typography`, which compares a read-only live Roll20 typography probe against the latest local `rolltemplate_chat_smoke` metrics and maps the selected rolltemplate class to a known fixture.
- DONE: Added `--expect-fixture <fixture-id>` to the live typography diagnostic so an intended fixture-C probe fails loudly if the selected live card is actually fixture-A or another fixture.
- RESULT: The current ignored live probe at `reports/.../chat-row-geometry/fixture-c-live-typography-probe.json` selected `sheet-rolltemplate-aw`, so it maps to `fixture-A`, not fixture-C. The filename is misleading local evidence and must not be used to explain the fixture-C `sheet-rolltemplate-coc` mismatch.
- RESULT: For that fixture-A-like probe, template size matches local (`267x189`, delta `0x0`) but the table is wider in actual Roll20 by `33.134px` (`326.391px` local vs `359.525px` actual). Actual Roll20 DPR was `1.25`.
- RESULT: Main style deltas in the fixture-A-like probe are Roll20 shell typography: local template/table `font-size=12px`, `letter-spacing=-0.16px`; actual `font-size=13.65px`, `letter-spacing=normal`. This is live DOM/style evidence only, not pixel parity.
- BROWSER OBSERVED: The current `Codex Roll20 Verify` editor tab contains 2 visible `sheet-rolltemplate-aw` cards and 0 `sheet-rolltemplate-coc` cards, so current Chrome state cannot recapture fixture-C typography without loading/running fixture-C again in the Sandbox/test room.
- STILL TODO P0: Recapture or probe the actual fixture-C `sheet-rolltemplate-coc` card with the current typography/row sidecar fields before changing production ChatPane CSS for fixture-C.
- STILL TODO P0: Production renderer gate remains `HOLD_PRODUCTION_RENDERER_PATCH`; no Roll20 visual parity claim is allowed.

## 2026-06-20 Codex Update - Chat mismatch breakdown and text-AA candidate

Status: PARTIAL. Roll20 chat/template parity is still NOT done, but the fixture-C mismatch is now classified more precisely.

- FOLLOW-UP RESULT: Tested a Roll20 shell/root-font candidate after live Chrome read-only style inspection showed actual fixture-C root/table inherit `13.65px` Proxima while local custom rolltemplate root used app-added `text-xs`/`12px`.
- FOLLOW-UP RESULT: Removing the app-added rolltemplate `text-xs`, with and without matching Proxima shell inheritance, did not improve the decisive aligned metric. It moved fixture-B raw below the high threshold but worsened fixture-A and fixture-C aligned comparison (`fixture-A 7.49% -> 8.96%`, `fixture-C 22.46% -> 22.54%` in the combined candidate).
- DECISION: Do not promote the shell/root-font candidate yet. The live style mismatch is real, but pixel parity needs a narrower fix that does not regress fixture-A/fixture-C aligned crops.
- FOLLOW-UP RESULT: Added diagnostic-only `--chat-shadow-policy no-template-shadow`. This reduced fixture-C raw/aligned mismatch from `28.36%/22.46%` to `27.09%/21.14%` while fixture-A and fixture-B stayed at `12.78%/7.49%` and `10.09%/9.14%`.
- DECISION: Keep shadow suppression diagnostic-only. Actual Roll20 computed style still has the 16-layer dark text-shadow, so this is evidence that local shadow/font compositing contributes to the dark-pixel gap, not a production-safe renderer patch.
- REJECTED: A `soft-template-shadow` candidate reduced fixture-C similarly (`27.11%` raw) but regressed fixture-A and fixture-B (`14.98%`, `11.44%`) and raised aligned high mismatch from `1/3` to `2/3`. It was not kept.
- DONE: Added highlight/shadow mask metrics to `diagnose:roll20-chat-parity`. Current default shows fixture-C highlight pixels have an `85.92%` mismatch ratio and shadow-candidate pixels account for `59.54%` of best-aligned mismatches, confirming the remaining fixture-C problem is concentrated around text mask/shadow compositing.
- DONE: Added mask geometry deltas. Current default shows fixture-A/Les highlight centroid deltas are under 1px, while fixture-C highlight centroid is `+3.36px x / -20.72px y` and local highlight pixel count is `6256` vs actual `12222`. This points to fixture-C text mask/rasterization placement and intensity, not a global chat crop issue.
- RESULT: Re-ran existing candidates with the mask geometry diagnostic. `no-template-shadow` is the only candidate that improves fixture-C without touching fixture-A/Les (`fixture-C 22.46% -> 21.14%` aligned, highlight centroid y delta `-20.72px -> -16.15px`). `font-fallback` increases local highlight count (`6256 -> 8276`) but worsens fixture-C aligned mismatch to `27.93%` and shadow mismatch share to `73.73%`.
- DONE: Added `diagnose:roll20-chat-candidates` to compare default/no-shadow/font-fallback/text-AA/soft-shadow candidates sequentially without manual report overwrite mistakes. Latest output goes to ignored `reports/.../chat-candidate-comparison/`.
- REJECTED: `font-fallback + no-template-shadow` was tested. It increased local fixture-C highlight pixels (`8853` vs actual `12175`) but worsened raw/aligned mismatch to `30.82%/26.74%` and pushed shadow mismatch share to `74.61%`, so it is kept only as a rejected candidate in the comparison table.
- DONE: Added row/cell geometry capture to local smoke and future Roll20 chat capture sidecars, plus `diagnose:roll20-chat-rows`. Current actual sidecars correctly report `NEEDS_RECAPTURE` because they predate rowMetrics; next Roll20 recapture can compare row top/height/cell deltas directly.
- LIVE PROBE: Read-only Chrome probe on the dedicated Roll20 verification tab saved ignored `chat-row-geometry/fixture-c-live-row-probe.json`. fixture-C actual-vs-local row top/height deltas are effectively zero (`topRelDelta -0.003px`, `heightDelta 0px` for rows 0-6), while row/table width differs by `24.309px` (`1272.859px` local vs `1248.55px` actual). Treat the remaining fixture-C chat mismatch as width/font/shadow compositing, not vertical row geometry collapse. This probe is local-only and not a same-moment screenshot sidecar.
- DIAGNOSTIC RESULT: Added diagnostic-only chat geometry policies and compared `tight-cell-spacing` / `table-scale-x`. `tight-cell-spacing` is rejected for now (`fixture-C 28.36%/22.46% -> 29.54%/24.09%`). `table-scale-x` is a useful clue (`fixture-C 28.36%/22.46% -> 25.84%/20.75%`, fixture-A/Les raw also slightly lower), but it is not production-safe because actual Roll20 computed style does not include a table transform and the gate would still hold with high mismatch. Candidate comparison now restores the default chat parity diagnostic after running candidates so status/gate do not accidentally read the last experimental report.
- DONE: Expanded local smoke and future Roll20 chat capture sidecars with typography/table metrics: `fontStretch`, `fontKerning`, `fontVariantLigatures`, `letterSpacing`, `borderCollapse`, `borderSpacing`, `tableLayout`, `transformOrigin`, `zoom`, element `offset/client/scroll` box metrics, and viewport DPR/scale. Latest local fixture-C metric records table `letterSpacing=-0.16px`, `borderSpacing=2px`, `tableLayout=auto`, `transform=none`, `zoom=1`, DPR `1`; actual Roll20 sidecars still need recapture before these fields can explain the remaining 24px table-width delta.
- DONE: Added luma/row/column mismatch breakdown to `diagnose:roll20-chat-parity` so chat diffs are not only a single percentage. The markdown table now includes bright mismatch share, dark mismatch share, and worst row band.
- DONE: Added diagnostic-only `__r20ChatTextPolicy=roll20-auto-aa` support in ChatPane and `rolltemplate_chat_smoke --chat-text-policy roll20-auto-aa`.
- RESULT: `roll20-auto-aa` did not change the current local-vs-actual PNG mismatch numbers. Default and candidate both report fixture-A `12.78%/7.49%`, fixture-B `10.09%/9.14%`, and fixture-C `28.36%/22.46%` raw/aligned.
- RESULT: fixture-C best-aligned mismatch is mostly bright text/highlight pixels, not a missing large background: bright mismatch share `63.34%`, dark share `24.16%`, mid-tone share `12.50%`. Bright mismatches have local luma lower than actual by `-44.347` on average.
- RESULT: fixture-B mismatch is almost entirely bright pixels (`97.91%` share). fixture-A is also bright-dominant (`72.40%`) but much lower after alignment.
- DECISION: Do not promote text antialiasing policy to production behavior. Keep the switch diagnostic-only.
- STILL TODO P0: Compare actual/local computed text-shadow color, opacity, transform/scale, device pixel ratio, and chat screenshot compositing for fixture-C. The current best evidence points to text/highlight rendering brightness rather than Roll20 user CSS absence.
- STILL TODO P0: Production renderer gate remains `HOLD_PRODUCTION_RENDERER_PATCH` because fixture-C chat crop still differs after alignment and the sheet-root renderer patch family is split across fixtures.

## 2026-06-20 Codex Update - Chat font fallback candidate rejected

Status: PARTIAL. A concrete fixture-C font hypothesis was tested and rejected for production.

- DONE: Added a diagnostic-only chat font policy switch. `rolltemplate_chat_smoke --chat-font-policy roll20-chat-fallback` strips ChatPane rolltemplate `@font-face` rules and suppresses preview user-font registration at the app document level.
- DONE: Rebuilt the app and compared default vs `roll20-chat-fallback` screenshots against the same Roll20 actual evidence.
- RESULT DEFAULT: fixture-C raw mismatch `28.36%`, aligned `22.46%`; fixture-A raw/aligned `12.78%/7.49%`; Les raw/aligned `10.09%/9.14%`.
- RESULT FALLBACK: fixture-C raw mismatch worsened to `31.85%`, aligned `27.93%`. It made the first fixture-C label cell width closer to actual (`15.8594px -> 14.8281px`, actual `14.95px`) but harmed the overall pixels.
- DECISION: Do not promote chat font fallback as production behavior. Keep it as a diagnostic switch only.
- STILL TODO P0: fixture-C mismatch is not explained by font availability alone. Next candidate should target screenshot/crop text-antialiasing or Roll20 chat page-scale/rendering differences without changing the production renderer globally.

## 2026-06-20 Codex Update - fixture-C chat font evidence added

Status: PARTIAL. Root cause narrowed; parity is still NOT done.

- DONE: Added computed-style evidence to future Roll20 chat DOM probe sidecars and local `rolltemplate_chat_smoke` reports. The recorded fields include template/table/caption/td/inlineroll style, rects, background image, line-height, font family, and text-shadow.
- DONE: Added font availability checks for `BookkMyungjo-Bd` and generic sans-serif to both the Roll20 capture plan snippet and local smoke output.
- FOUND: In the live Roll20 fixture-C tab, `.sheet-rolltemplate-coc` CSS is present and computed styles mostly match local, but `document.fonts.check("700 12px BookkMyungjo-Bd")` is `false`. Local smoke currently reports the same font checks as `true`.
- FOUND: Actual Roll20 fixture-C first label cell is narrower than local (`14.95px` computed width actual vs `15.8594px` local) while line-height and text-shadow match. This points toward font availability/rendering metrics, not a missing rolltemplate CSS rule.
- CURRENT: This batch does not yet change production ChatPane font behavior because the first font-face removal experiment did not change the current screenshot numbers. A safer next step is to add a Roll20-chat-font policy switch or diagnostic candidate and compare it across fixture-A/Les/fixture-C before promoting it.
- STILL TODO P0: build a controlled local candidate that mimics actual Roll20 chat font availability for fixture-C without regressing fixture-A/Les, then rerun smoke/diagnose/status/gate.

## 2026-06-20 Codex Update - Chat parity aligned diagnostic stabilized

Status: PARTIAL. Roll20 chat/template parity is closer and the reports now agree, but renderer readiness is still NOT done.

- DONE: Local ChatPane now waits for rolltemplate background images and fonts before smoke screenshots. This fixed the false mostly-blue fixture-A local capture caused by screenshotting before the remote background decoded.
- DONE: ChatPane rolltemplate extraction now preserves simple `@font-face` blocks and keeps font asset URLs direct instead of proxying them through Roll20 image proxy URLs. `@import` is intentionally still excluded because an inline import attempt broke fixture-B rolltemplate application.
- DONE: ChatPane rolltemplate box model moved closer to actual Roll20 chat evidence (`content-box`, `line-height:17.0625px`). fixture-C local template height moved from the earlier `554px` drift to `586px`, matching the actual `585px` height within 1px.
- DONE: `diagnose:roll20-chat-parity` now reports both raw mismatch and small-offset aligned mismatch. `status:roll20-actual` and `gate:roll20-renderer-action` now use the same aligned high-mismatch boundary so status, gate, and diagnostic no longer contradict each other.
- CURRENT: `chatNormalizedCompared=3/3`, `chatActualCropGeometrySuspect=0`, `chatNormalizedHighMismatch=3`, `chatAlignedHighMismatch=1`, `chatAuthoritativeNormalizedHighMismatch=1`, `rendererReady=NO`.
- CURRENT RAW/ALIGNED: fixture-A `12.78% -> 7.49%` at offset `1,0`; fixture-B `10.09% -> 9.14%` at offset `-5,0`; fixture-C `28.36% -> 22.46%` at offset `4,-2`.
- CLASSIFICATION: fixture-A and fixture-B are now mostly crop/anti-alias/small-offset level, not proven parity. fixture-C remains the real chat/template mismatch target. Renderer action is still `HOLD_PRODUCTION_RENDERER_PATCH` because the sheet-root renderer patch family is also split across fixtures.
- VERIFIED THIS BATCH: `diagnose:roll20-chat-parity`, `status:roll20-actual`, and `gate:roll20-renderer-action` reran successfully on `reports\roll20-actual-compare\2026-06-18-state-map-v1`.
- STILL TODO P0: reduce fixture-C rolltemplate aligned mismatch, then resolve the split production renderer model (`fixture-A=none`, Les/fixture-C=`inline-block+text-input-height`) before returning to edit-mode UX.

## 2026-06-20 Codex Update - Roll20 chat element-bound recapture

Status: PARTIAL. The chat evidence is finally geometry-authoritative, but parity is still NOT done.

- DONE: Recaptured fixture-A, fixture-B, and fixture-C Roll20 chat screenshots from live Roll20 Sandbox/editor tabs using element-bound CDP clips. Evidence stays local-only and ignored under `reports/roll20-actual-compare/...`.
- DONE: `diagnose:roll20-chat-parity` now reports `actualCropGeometrySuspect=0`, replacing the previous suspect coordinate-calibrated state.
- CURRENT: `chatNormalizedCompared=3/3`, `chatAuthoritativeNormalizedHighMismatch=2`, `rendererReady=NO`.
- CURRENT MISMATCHES: fixture-A `64.49%`, fixture-B `8.41%`, fixture-C `33.53%`.
- CLASSIFICATION: fixture-B is now below high-mismatch threshold after proper crop. fixture-A still fails because local ChatPane background/table rendering differs badly. fixture-C still fails because actual Roll20 template height is `585px` while local is `554px`.
- NEXT P0: fix fixture-A rolltemplate background/table rendering, then investigate fixture-C line-height/table/body height drift. Edit-mode UX remains blocked behind real Roll20 preview/chat parity work.

## 2026-06-20 Codex Update - Chat crop evidence tightened

Status: PARTIAL. The comparison pipeline is stricter and less misleading, but Roll20 chat parity is still NOT done.

- DONE: Local rolltemplate smoke screenshots now use element screenshots, not viewport clips. This fixes local template PNG truncation (`255px` stale captures vs `279px` DOM width).
- DONE: Local ChatPane rolltemplate message width is now `328px`, producing `267px` template crops for fixture-B and fixture-C, matching the current actual Roll20 crop width.
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
- CURRENT: Chat parity remains failing, but improved. Max normalized mismatch is now `48.73%` instead of `63.95%`; fixture-A improved to `37.95%`, fixture-B is `26.92%`, and fixture-C is `48.73%`.
- STILL TODO: compare local/actual using the same crop scope. Current local smoke captures template-only regions while several actual Roll20 evidence images include chat shell/left strip or vertical crop drift. Do not claim parity until crop normalization and renderer gate pass.

## 2026-06-20 Codex Update - fixture-A chat normalized, parity still failing

Status: PARTIAL. The fixture-A missing normalized Roll20 chat evidence blocker is closed, but Roll20 chat/renderer parity is still NOT done.

- VERIFIED: The dedicated Roll20 Custom Sheet Sandbox/editor was used, not an existing real room. fixture-A produced actual Roll20 `.sheet-rolltemplate-aw` chat DOM from a real sheet roll button/macro-option flow.
- VERIFIED: `fixture-A` now has local-only ignored `roll20-chat.png` plus `roll20-chat-dom-evidence.json` with normalized rolltemplate metadata. The capture sidecar explicitly marks the temporary `#rightsidebar` relocation used only to work around Chrome/Roll20 screenshot compositor behavior; this is style/parity evidence, not geometry proof.
- VERIFIED: `corepack pnpm run diagnose:roll20-chat-parity -- reports\roll20-actual-compare\2026-06-18-state-map-v1` reports `compared=3`, `normalizedCompared=3`, `normalizedHighMismatch=3`.
- VERIFIED: `corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1` reports `generatedActualScreenshots=6/6`, `generatedDiffed=6/6`, `trustedFullRoot=3/3`, `reliableTrustedFullRoot=3/3`, `chatNormalizedCompared=3/3`, `chatNeedsNormalizedCapture=0`, `chatNormalizedHighMismatch=3`, and `rendererReady=NO`.
- CURRENT: `corepack pnpm run gate:roll20-renderer-action -- reports\roll20-actual-compare\2026-06-18-state-map-v1` remains `HOLD_PRODUCTION_RENDERER_PATCH`. Remaining blockers are chat crop mismatch for 3/3 normalized fixtures and split renderer patch families (`fixture-A=none`, Les/fixture-C=`inline-block+text-input-height`).
- CURRENT MISMATCHES: fixture-A `63.95%`, fixture-B `27.61%`, fixture-C `46.39%`. This proves Roll20 chat parity is still false.
- NEXT P0: align local ChatPane/rolltemplate shell sizing and crop normalization against this complete actual evidence set. Do not claim Roll20 visual parity and do not promote production renderer CSS until the gate passes.

## 2026-06-20 Codex Update - Les/fixture-C chat evidence normalized, fixture-A still blocked

Status: PARTIAL. Roll20 actual-screen evidence improved, but Roll20 chat/renderer parity is still NOT done.

- Normalized local-only Roll20 chat evidence now exists for `fixture-B` and `fixture-c-commission-1bu`; `fixture-A` remains `FOREGROUND_SUSPECT`.
- Current measured status: `PARTIAL_GENERATED_ACTUAL_SCREENSHOTS`, `generatedActualScreenshots=5/6`, `generatedDiffed=5/6`, `trustedFullRoot=3/3`, `reliableTrustedFullRoot=3/3`, `chatNormalizedCompared=2/3`, `chatNeedsNormalizedCapture=1`, `chatNormalizedHighMismatch=2`, `rendererReady=NO`.
- Current measured chat crop mismatches: `fixture-B=27.61%`, `fixture-c-commission-1bu=46.39%`; these are failures, not parity claims.
- Tried to inspect/capture the open fixture-A Roll20 editor tab through Chrome, but the Roll20 tab calls repeatedly timed out. Existing fixture-A `roll20-chat.png` was visually inspected and shows overlapping sheet/dialog content rather than a trustworthy foreground chat crop, so it must not be promoted.
- Hardened Roll20 evidence readers against UTF-8 BOM in `roll20-chat-dom-evidence.json` and related report JSON files. This prevents PowerShell-authored local sidecars from being silently treated as missing/old evidence by Node scripts.
- Verification: `node --check` for changed Roll20 scripts PASS, `plan:roll20-chat-capture` reports `plannedFixtures=1/3`, `diagnose:roll20-chat-parity` reports `normalizedCompared=2/3`, `status:roll20-actual` reports `generatedActualScreenshots=5/6`, `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH`, and `guard:roll20-evidence` PASS.
- NEXT P0: recapture `fixture-A` foreground chat/rolltemplate evidence from a responsive Roll20 Sandbox/test-room state, then rerun screenshot diff, chat parity diagnostics, status, and renderer gate. Do not tune production ChatPane/renderer CSS until that evidence exists.

## 2026-06-20 Codex Update - Roll20 chat evidence foreground correction

Status: PARTIAL. This corrects a false-positive evidence claim; Roll20 chat parity is still NOT done.

- Visual inspection of the current `roll20-chat.png` files showed they captured overlapping character/dialog sheet content, not the foreground Roll20 chat/template area. The previous `chatActualCaptureScaleSuspect=0` was not enough to prove correct foreground capture.
- Hardened `scripts/roll20_chat_capture_plan.mjs`, `scripts/roll20_actual_status.mjs`, `scripts/roll20_upload_handoff.mjs`, and `scripts/roll20_chat_parity_diagnostics.mjs` so older sidecars without `chatElementSelector` are `FOREGROUND_SUSPECT` / `NEEDS_NORMALIZED_CAPTURE`.
- Re-ran the active status: `PARTIAL_GENERATED_ACTUAL_SCREENSHOTS`, `generatedActualScreenshots=3/6`, `generatedDiffed=3/6`, `chatNormalizedCompared=0/3`, `chatNeedsNormalizedCapture=3`, and missing chat evidence for fixture-A, fixture-B, and fixture-C as `chat-screenshot-foreground-suspect`.
- Re-ran the renderer gate: production renderer patch remains `HOLD`, now blocked by incomplete generated-sheet actual evidence and missing trustworthy Roll20 chat screenshots rather than by a misleading 3/3 high-mismatch comparison.
- Local ChatPane smoke was corrected to separate functional errors from external resource 403s. Latest `node scripts\rolltemplate_chat_smoke.mjs --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/rolltemplate-chat-smoke --port 4452` PASS for all three fixtures; fixture-A/fixture-C still record resource issues separately.
- Verification: `node --check` for changed scripts PASS, `corepack pnpm run test:roll20-chat-capture-plan` PASS, `plan:roll20-chat-capture` reports `plannedFixtures=3/3`, `diagnose:roll20-chat-parity` reports `NEEDS_NORMALIZED_CAPTURE`, `status:roll20-actual` reports `PARTIAL_GENERATED_ACTUAL_SCREENSHOTS`, `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH`, `guard:roll20-evidence` PASS, `corepack pnpm run lint` PASS, and `corepack pnpm run build` PASS.
- NEXT P0: recapture actual Roll20 chat foreground with the current DOM probe, preferably targeting `#textchat` or `.textchatcontainer` rather than broad `#rightsidebar`, then rerun diff/status/gate before tuning ChatPane CSS.

## 2026-06-20 Codex Update - Roll20 upload snippet Ace manifest and chat probe hardening

Status: PARTIAL. Upload/capture tooling is more trustworthy; Roll20 visual/chat parity is still NOT done.

- Fixed `scripts/roll20_upload_snippet.mjs` so generated Roll20 Sandbox/settings snippets update the observed Roll20 Ace editor instance `editors.json` as well as `customcharsheet_json` textareas. This closes the stale-manifest path where the settings page could still save the previous fixture even after the textarea looked updated.
- Generated snippet results now report `aceJsonSet`, `editorKeys`, and manifest `valueLength` so future Roll20 upload logs can prove whether the real settings editor was touched.
- Hardened the generated `plan:roll20-chat-capture` DOM probe so it picks a visible chat root from `#textchat`, `.textchatcontainer`, then `#rightsidebar`, and records both `chatSelector` and `chatElementSelector`. This reduces future clip/sidecar mismatches.
- Current measured status after the latest trusted captures: `generatedActualScreenshots=6/6`, `generatedDiffed=6/6`, `trustedFullRoot=3/3`, `reliableTrustedFullRoot=3/3`, `chatNormalizedCompared=3/3`, `chatNeedsNormalizedCapture=0`, `chatActualCaptureScaleSuspect=0`, `chatNormalizedHighMismatch=3`, `rendererReady=NO`, `rendererAction=HOLD_PRODUCTION_RENDERER_PATCH`.
- Current measured chat parity is failing, not passing: all 3 normalized fixtures are high mismatch, with max normalized mismatch `94.44%`. The next P0 is fixing local ChatPane / rolltemplate shell sizing and template rendering against the now-trusted actual Roll20 evidence.
- Verification: `node --check scripts\roll20_upload_snippet.mjs`, `node --check scripts\roll20_chat_capture_plan.mjs`, `corepack pnpm run test:roll20-chat-capture-plan`, `corepack pnpm run snippet:roll20-upload -- reports\roll20-actual-compare\2026-06-18-state-map-v1 fixture-c-commission-1bu`, generated snippet `node --check`, `corepack pnpm run plan:roll20-chat-capture -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `corepack pnpm run diagnose:roll20-chat-parity -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `corepack pnpm run gate:roll20-renderer-action -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `corepack pnpm run guard:roll20-evidence -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `corepack pnpm run lint`, and `corepack pnpm run build` PASS.

## 2026-06-20 Codex Update - fixture-A chat recaptured as true PNG 1x

Status: PARTIAL. One evidence-quality blocker closed; Roll20 visual/chat parity is still NOT done.

- Recaptured `fixture-A` Roll20 chat evidence from the dedicated `Codex Roll20 Verify` Sandbox editor as true PNG with CDP `Page.captureScreenshot` and `clip.scale=1`.
- Saved same-moment local-only ignored evidence beside the fixture: `roll20-chat.png` and `roll20-chat-dom-evidence.json`. These files remain under ignored `reports/` and must not be committed.
- Current measured plan improved from `plannedFixtures=2/3` to `plannedFixtures=1/3`.
- Remaining recapture target: `fixture-c-commission-1bu` is still `SCALE_OR_FORMAT_SUSPECT`; the older `roll20-chat-cdp-test.png` is PNG but captured at devicePixelRatio scale, not CSS 1x, so it must not be promoted as proof.
- Tried applying fixture-C HTML/CSS/translation in the dedicated Sandbox editor: file-input dispatch and endpoint fallback returned success, local payload validation passed, and the sandbox body text did not show a translation parse error, but opening existing characters still produced no `.charactersheet` / `.charsheet` root or roll buttons.
- Next P0: make fixture-C render in the dedicated Sandbox or another verified test room, then click a real `roll_str_check`-style button and recapture `roll20-chat.png` as true PNG CSS 1x with matching DOM sidecar.

## 2026-06-20 Codex Update - Chat capture plan now rejects JPEG/0.8x evidence

Status: PARTIAL. The recapture plan is more truthful; Roll20 chat visual parity is still NOT done.

- Updated `plan:roll20-chat-capture` so it rejects actual Roll20 chat screenshots when the file bytes are not PNG or when the screenshot scale is not CSS 1x against the recorded clip.
- Current measured plan: `plannedFixtures=2/3`, `snippetSyntax=PASS`.
- Current recapture targets: `fixture-A` and `fixture-c-commission-1bu` are `SCALE_OR_FORMAT_SUSPECT` because their `roll20-chat.png` files are JPEG bytes captured at about `0.8x`.
- Current non-recapture fixture: `fixture-B` has true PNG 1x chat evidence, but still has a `29.21%` local-vs-actual rolltemplate crop mismatch.
- Next P0: recapture fixture-A and fixture-C chat crops through CDP `Page.captureScreenshot` with `format=png` and `clip.scale=1`, then rerun `diagnose:roll20-chat-parity`, `status:roll20-actual`, and `gate:roll20-renderer-action`.

## 2026-06-20 Codex Update - Chat capture scale gate added

Status: PARTIAL. Evidence quality improved; Roll20 chat visual parity is still NOT done.

- Found that fixture-A and fixture-C Roll20 chat evidence files are JPEG bytes saved with a .png filename and captured at about 0.8x CSS scale; fixture-B was recaptured as true PNG at 1x via CDP.
- Updated chat parity diagnostics to report local/actual image format, actual screenshot scale, actual source crop, and compared size.
- Updated renderer/status gates so non-PNG or non-1x actual chat captures are explicit blockers before using pixel mismatch as a production ChatPane/CSS target.
- Current measured status: chatNormalizedCompared=3/3, chatNeedsNormalizedCapture=0, chatActualCaptureScaleSuspect=2, rendererAction=HOLD_PRODUCTION_RENDERER_PATCH, rendererBlockers=3, rendererReady=NO.
- Current measured chat crop mismatches after Les 1x PNG recapture: fixture-A=95.13% (JPEG 0.8x evidence), fixture-B=29.21% (PNG 1x evidence), fixture-C=38.25% (JPEG 0.8x evidence).
- Next P0: recapture fixture-A and fixture-C chat crops as true PNG with CDP Page.captureScreenshot format=png and clip.scale=1, then rerun diagnose/status/gate before changing local ChatPane rendering.

## 2026-06-20 Codex Update - fixture-B chat normalized evidence captured

Status: PARTIAL. Missing normalized chat evidence is closed; Roll20 chat visual parity is still NOT done.

- Captured fresh local-only Roll20 Sandbox chat evidence for fixture-B from the already-open dedicated Codex Roll20 Verify editor. Existing rooms were not modified.
- Corrected the Les capture from stale classic-roll chat evidence to the same visible roll_initiative / initiative-roll action used by local smoke.
- Re-ran chat diagnostics for reports\roll20-actual-compare\2026-06-18-state-map-v1: compared=3/3, normalizedCompared=3/3, chatNeedsNormalizedCapture=0, normalizedHighMismatch=3.
- Current measured chat crop mismatches: fixture-A=95.13%, fixture-B=33.16%, fixture-c-commission-1bu=38.25%.
- Current measured status: rendererAction=HOLD_PRODUCTION_RENDERER_PATCH, rendererReady=NO, rendererBlockers=2, generatedActualScreenshots=6/6, generatedDiffed=6/6.
- Updated scripts/roll20_chat_capture_plan.mjs so future DOM probe snippets preserve left/top rect fields and emit latestTemplate as a rolltemplates-compatible cloned object.
- Next P0: fix or further diagnose actual Roll20 rolltemplate/chat shell sizing and template rendering differences now that user rolltemplate CSS is active for 3/3 normalized chat captures.

## 2026-06-20 Codex Update - Rolltemplate crop diagnostic corrected

Status: PARTIAL. Diagnostic accuracy improved; Roll20 visual/chat parity is still NOT done.

- Fixed scripts/roll20_chat_parity_diagnostics.mjs so actual Roll20 chat crop selection prefers latestTemplate when it intersects the screenshot clip, then falls back to the latest in-clip rolltemplate instead of the first stale/offscreen template.
- Re-ran chat diagnostics for reports\roll20-actual-compare\2026-06-18-state-map-v1: compared=2/3, normalizedCompared=2/3, normalizedHighMismatch=2, chatNeedsNormalizedCapture=1.
- Current measured chat crop mismatches: fixture-A=95.13%, fixture-c-commission-1bu=38.25%; fixture-B still needs normalized rolltemplate rect/clip metadata.
- Current measured status remains rendererAction=HOLD_PRODUCTION_RENDERER_PATCH, rendererReady=NO, rendererBlockers=3, generatedActualScreenshots=6/6, generatedDiffed=6/6.
- Verified fixture-C now selects latestTemplate, class sheet-rolltemplate-coc, intersectsClip=true, so the prior 98.31% mismatch was partly a stale-template diagnostic artifact, not a valid renderer target.
- Next P0: recapture fixture-B normalized chat evidence, then classify remaining fixture-A/fixture-C rolltemplate crop differences before changing production renderer or ChatPane CSS.
## 2026-06-20 Codex Update - fixture-B actual recapture still blocked

Status: PARTIAL. Tooling improved; Roll20 visual/chat parity is still NOT done.

- Current measured status after rerun: `generatedActualScreenshots=6/6`, `generatedDiffed=6/6`, `chatNormalizedCompared=2/3`, `chatNeedsNormalizedCapture=1`, `rendererReady=NO`, `rendererAction=HOLD_PRODUCTION_RENDERER_PATCH`, `rendererBlockers=3`.
- Tried to close the remaining fixture-B normalized chat gap in the dedicated Roll20 Sandbox only. Existing rooms were not modified.
- Editor file-input snippet dispatch succeeded for HTML/CSS/translation and removed the visible translation parse warning, but reopening the sandbox character still produced a blank character iframe.
- Endpoint fallback POSTs to `/sheetsandbox/savesheetsettings` returned `200` for Les HTML/CSS/translation, and the settings page saved wrapped `customcharsheet_json` with Roll20 success text. This is storage/application evidence only.
- Current session could not reproduce a rendered Les `.charactersheet` root, so no fresh `rolltemplates[].rect` / clip sidecar was captured. Do not count Les chat parity as normalized.
- Updated `scripts/roll20_upload_snippet.mjs` so future generated snippets can explicitly log endpoint fallback attempts with `USE_ENDPOINT_FALLBACK` and `ENDPOINT_CAMPAIGN_ID` while warning that endpoint/file-input success is not render proof.
- Next P0: find a reliable Roll20 activation path for Les in the dedicated sandbox or another verified test sandbox state, then recapture the same-action `roll20-chat.png` + `roll20-chat-dom-evidence.json` with `rolltemplates[].rect`, `clip`, `screenshotClipApplied`, and `chatCssEvidence`.
- Next P0 after that: address the actual chat crop mismatch for fixture-A/fixture-C (`95.13%` and `98.31%`) and the split renderer model (`fixture-A=none`, Les/fixture-C=`inline-block+text-input-height`) before touching production renderer CSS.

## 2026-06-19 Codex Update - fixture-C actual Roll20 chat recapture completed

Status: PARTIAL overall, but DONE for the missing fixture-C generated chat evidence.

- Ran the generated fixture-C Roll20 upload fallback in the dedicated `Codex Roll20 Verify` Sandbox editor via CDP. Local validation remained PASS: `translation.json` object with 399 keys, `sheet.json` PASS, settings manifest wrapper PASS.
- Confirmed the Sandbox character iframe changed to the fixture-C/CoC Korean sheet after upload by reading visible sheet text such as `근력`, `민첩`, `정신`, `기준치`, and Korean skill rows.
- Clicked a real fixture-C roll control (`roll_str_check` candidate after confirming duplicate count) and confirmed Roll20 chat changed from messages `9` to `10`, rolltemplates `1` to `2`.
- Captured fresh ignored local-only `roll20-chat.png` and `roll20-chat-dom-evidence.json` for `fixture-c-commission-1bu`; normalized `latestTemplate/latestMessage` after browser serialization repeated object references.
- Actual status improved to `GENERATED_ACTUAL_SCREENSHOTS_DIFFED`: generated actual screenshots `6/6`, generated diffs `6/6`.
- Renderer gate remains HOLD, but blockers dropped to 3: fixture-B still needs normalized rolltemplate crop metadata, actual Roll20 chat crop differs from local ChatPane for 2/2 normalized fixtures (max `98.31%`), and diagnostic renderer patch is not uniform across fixtures.
- Next P0: recapture or normalize `fixture-B` chat DOM sidecar so chat parity becomes normalized `3/3`; then diagnose why Roll20 rolltemplate crop differs from local ChatPane so severely.

## 2026-06-19 Codex Update - fixture-C upload snippet validation

Status: PARTIAL. This improves the next Roll20 upload attempt, but does not complete fixture-C actual recapture.

- Enhanced `roll20_upload_snippet.mjs` so generated Sandbox upload snippets include local validation for `translation.json`, `sheet.json`, and the settings-page manifest wrapper.
- Generated the fixture-C upload snippet locally. Validation result: translation JSON `PASS` (`object`, 399 keys), sheet manifest `PASS`, settings manifest wrapper `PASS`.
- The previous Roll20-visible translation parse warning is therefore not explained by invalid local exported JSON. Next investigation should focus on Sandbox upload/application behavior or stale uploaded state.
- The snippet runtime now logs visible Roll20 Sandbox warning text after dispatching file changes, so the next manual/allowed upload can preserve whether Roll20 still reports a translation parse error.
- Next P0 remains: load fixture-C HTML/CSS/translation into the dedicated Roll20 Sandbox, capture fresh `roll20-chat.png` + `roll20-chat-dom-evidence.json`, then rerun screenshot diff, chat parity diagnostics, renderer gate, and status.

## 2026-06-19 Codex Update - Chat probe JSON serialization hardening

Status: DONE for capture-tool hardening, NOT DONE for Roll20 parity.

- Updated `roll20_chat_capture_plan.mjs` so generated DOM probe snippets clone `chatRect`, `clip`, `screenshotClipApplied`, and `screenshotCssClip` instead of reusing the same object reference.
- Extended `test:roll20-chat-capture-plan` to verify JSON serialization and to fail if `[Circular]` appears or clip aliases are lost.
- Re-ran chat capture planning: planned fixtures are now `2/3` (`fixture-B`, `fixture-c-commission-1bu`). `fixture-A` no longer needs stale recapture after the previous actual Roll20 evidence update.
- Current chat parity remains high mismatch: fixture-A `95.13%`, fixture-C `96.93%`; this is evidence against visual parity, not a pass.
- Next P0: recapture fixture-C via Roll20 Sandbox Tools after file upload access is available or manual upload is done, then recapture fixture-B with normalized crop metadata.

## 2026-06-19 Codex Update - Roll20 actual fixture-A chat recapture

Status: PARTIAL. Actual Roll20 parity is still NOT DONE.

- Captured fresh local-only Roll20 chat evidence for `fixture-A` under ignored `reports/roll20-actual-compare/2026-06-18-state-map-v1/`.
- Status improved from generated actual screenshots `4/6` to `5/6`; `fixture-A` is no longer listed as stale chat evidence.
- New diagnostic result: fixture-A normalized rolltemplate chat crop mismatch is `95.13%`, so Roll20 chat visual parity is clearly not achieved.
- Current status still holds production renderer changes: `rendererAction=HOLD_PRODUCTION_RENDERER_PATCH`, `rendererReady=NO`, `rendererBlockers=7`.
- Remaining missing generated evidence: `fixture-c-commission-1bu:chat:chat-screenshot-dom-stale`.
- Observed Roll20 sandbox warning: `Translation JSON parse error` while the sandbox tools were open. Local exported fixture-C/fixture-A `translation.json` files parse successfully, so investigate Roll20 upload/settings packaging rather than assuming source JSON is invalid.
- Attempted fixture-C sandbox upload through Roll20 file chooser, but Chrome automation returned `Not allowed` on `fileChooser.setFiles`. To continue actual fixture-C capture, enable file upload access for the Codex Chrome extension or upload the three local payload files manually in the Roll20 Sandbox Tools: `sheet.html`, `sheet.css`, `translation.json`.

## 2026-06-19 Codex Update - Roll20 chat capture probe self-test

Status: DONE for capture-tool hardening, NOT DONE for actual Roll20 parity.

- Added `test:roll20-chat-capture-plan` to self-test the browser-side Roll20 chat DOM probe before using it for fresh captures.
- The self-test verifies required evidence fields: `clip`, `screenshotClipApplied`, `screenshotCssClip`, `rolltemplates[].rect`, and `chatCssEvidence`.
- Re-ran the active actual-screen status and renderer gate. Result remains `HOLD_PRODUCTION_RENDERER_PATCH` with 7 blockers.
- Next P0 remains actual Roll20 recapture: `fixture-A` and `fixture-c-commission-1bu` need fresh same-moment `roll20-chat.png` + `roll20-chat-dom-evidence.json`; `fixture-B` needs normalized rolltemplate crop metadata.
## 2026-06-19 Chat Capture Snippet Metadata Fix

- DONE: strengthened `plan:roll20-chat-capture` snippets so future Roll20 chat sidecars include `rolltemplates[].rect`, top-level `clip`, `screenshotClipApplied`, `screenshotCssClip`, and `chatCssEvidence`.
- DONE: added snippet syntax checks to the plan output; current run reports `snippetSyntax=PASS`.
- WHY: `diagnose:roll20-chat-parity` requires `rolltemplates[].rect` plus `clip` for normalized rolltemplate crop comparison. Without these fields, recaptured chat evidence could still remain `NEEDS_NORMALIZED_CAPTURE`.
- NEXT P0: use the generated snippets with fresh Roll20 chat screenshots for fixture-A/fixture-C and normalized crop metadata for fixture-B, then rerun the chat parity/status gates.
## 2026-06-19 Chat Capture Plan Tool

- DONE: added `corepack pnpm run plan:roll20-chat-capture -- <run> [fixture-id] [--all]` to produce a focused local-only Roll20 chat recapture plan.
- VERIFIED: current plan for `reports\roll20-actual-compare\2026-06-18-state-map-v1` reports `plannedFixtures=3/3`: fixture-A and fixture-C have stale screenshot/DOM sidecar pairs, while fixture-B has fresh chat evidence but still needs normalized rolltemplate crop metadata.
- CURRENT: `status:roll20-actual` now points to the chat capture plan command when generated sheet roots are present but chat evidence is missing/suspect.
- NEXT P0: use the generated plan/snippets to recapture Roll20 chat PNG + DOM sidecar from the same roll action, then rerun screenshot diff, chat parity diagnostics, renderer gate, and status.
- CLAIM BOUNDARY: this is planning/tooling only. It does not prove Roll20 visual parity and does not remove renderer HOLD.
## 2026-06-19 Status Next-Action Correction

- DONE: `status:roll20-actual` now prints fixture-level missing generated targets and no longer collapses current `4/6` generated evidence into a generic file-upload blocker.
- CURRENT: latest status remains `PARTIAL_GENERATED_ACTUAL_SCREENSHOTS`, `generatedActualScreenshots=4/6`, `generatedDiffed=4/6`, `rendererReady=NO`, `rendererBlockers=7`.
- CURRENT MISSING GENERATED TARGETS: `fixture-A:chat:chat-screenshot-dom-stale` and `fixture-c-commission-1bu:chat:chat-screenshot-dom-stale`.
- NEXT P0: recapture `roll20-chat.png` and `roll20-chat-dom-evidence.json` from the same Roll20 roll action for fixture-A and fixture-C, then rerun `roll20_actual_screenshot_diff`, `diagnose:roll20-chat-parity`, `gate:roll20-renderer-action`, and `status:roll20-actual`.
- CLAIM BOUNDARY: this is a truthfulness/operations fix only. It does not prove Roll20 visual parity and does not remove renderer HOLD.
## 2026-06-19 19:50 +09:00 - Roll20 upload attempt and live chat evidence

Status: PARTIAL ACTUAL EVIDENCE, NOT VISUAL PARITY.

What happened:
- Chrome file chooser capture failed for hidden `#sheetHtml/#sheetCss/#sheetTranslation` inputs and visible Sandbox Tools labels in the current Codex Chrome wrapper.
- Raw CDP `DOM.setFileInputFiles` is blocked by the extension allowlist.
- The generated upload snippet executed in the Roll20 editor, but file input state cannot be trusted from the current isolated/read-only automation contexts.
- Improved `scripts/roll20_upload_snippet.mjs` so generated snippets fall back to defining an own `files` property when direct `input.files = ...` is ignored.

Actual Roll20 evidence saved locally only:
- `reports/roll20-actual-compare/2026-06-18-state-map-v1/local-baseline/fixture-A/screenshots/roll20-sandbox-after-upload-attempt.png`
- `reports/roll20-actual-compare/2026-06-18-state-map-v1/local-baseline/fixture-A/screenshots/roll20-sandbox-after-upload-attempt-dom-evidence.json`
- `reports/roll20-actual-compare/2026-06-18-state-map-v1/local-baseline/fixture-A/screenshots/roll20-chat-after-roll-attempt-page.png`
- `reports/roll20-actual-compare/2026-06-18-state-map-v1/local-baseline/fixture-A/screenshots/roll20-chat-after-roll-attempt-dom-evidence.json`

Observed facts:
- Character iframe had `.charactersheet` root, 13 roll buttons, and fixture-A-looking text content.
- Clicking a visible iframe roll button produced actual Roll20 chat DOM with `sheet-rolltemplate-coc` classes, messageCount 9, templateCount 2, last template width about 267px and height about 545px.
- Chat DOM confirms Roll20 runtime uses `.sheet-rolltemplate-*` for template wrappers and unprefixed `.inlinerollresult` style runtime classes, matching the latest export selector preservation direction.

Not done / next:
- The evidence is fixture-mixed/suspect: the iframe text looked fixture-A while the new chat template was `sheet-rolltemplate-coc`. Do not count it as fixture-A visual parity.
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
- `corepack pnpm run audit:payload -- reports\roll20-actual-compare\2026-06-18-state-map-v1`: PASS for fixture-A, fixture-B, and fixture-C 1BU.
- Regenerated ignored fixture-A/fixture-C payload CSS now contains `.sheet-rolltemplate-* .inlinerollresult.fullcrit` style selectors rather than `.sheet-inlinerollresult`.

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
- Regenerated ignored fixture-A payload now contains .sheet-rolltemplate-aw table, .sheet-rolltemplate-aw th, .sheet-rolltemplate-aw td, and prefixed inner template classes.
- corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1: rendererReady=NO, rendererBlockers=7, generatedActualScreenshots=4/6, generatedDiffed=4/6, chatActualCssInactive=1, chatActualCssScopedMismatch=1.

Not done / next:
- Re-upload the regenerated payload to Roll20 Custom Sheet Sandbox and recapture actual chat screenshots; current actual evidence still reflects old or incomplete Roll20 state.
- Do not claim Roll20 visual parity until missing 2/6 generated actual screenshots and chat normalized crop evidence are recaptured and diffed.
## 2026-06-19 Actual Status Chat Gate Final Rerun

- VERIFY: after rerunning `gate:roll20-renderer-action` and then `status:roll20-actual`, the current status reads `rendererBlockers=6`.
- Latest measured output: `generatedActualScreenshots=4/6`, `generatedDiffed=4/6`, `roomObservationScreenshots=0/3`, `reliableTrustedFullRoot=3/3`, `rendererReady=NO`, `chatNormalizedCompared=2/3`, `chatNeedsNormalizedCapture=1`, `chatActualCssInactive=2`, `chatNormalizedHighMismatch=1`.
- Additional current gate blockers now visible: generated-sheet actual evidence is incomplete and trustworthy Roll20 chat screenshots are missing for fixture-A and fixture-C. Treat the earlier `rendererBlockers=4` note below as superseded by this rerun.
## 2026-06-19 Actual Status Chat Gate Surface Update

- VERIFY: `status:roll20-actual` now surfaces chat parity blockers directly, so the one-command status cannot hide Roll20 chat CSS/crop issues behind the broader renderer HOLD.
- Latest command: `corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1`.
- Current measured output: `generatedActualScreenshots=4/6`, `generatedDiffed=4/6`, `reliableTrustedFullRoot=3/3`, `rendererReady=NO`, `rendererBlockers=4`, `chatNormalizedCompared=2/3`, `chatNeedsNormalizedCapture=1`, `chatActualCssInactive=2`, `chatNormalizedHighMismatch=1`.
- NEXT P0: recapture/prove a Roll20 Custom Sheet Sandbox or new test-room chat state where user rolltemplate CSS is active, and capture the missing normalized fixture-B rolltemplate rect/clip sidecar. Do not tune production ChatPane or renderer CSS from the current CSS-inactive actual chat evidence.

## 2026-06-19 Chat CSS Evidence Gate Update

Status: DOING, renderer still HOLD.

Evidence now:
- Added chatCssEvidence to local-only Roll20 chat sidecars for fixture-A and fixture-C by reading the current Roll20 editor tabs in Chrome without modifying the rooms/settings.
- Both current actual chat captures are CSS_RULE_MISSING_IN_PAGE_STYLES: fixture-A lacks .sheet-rolltemplate-aw rules and fixture-C lacks .sheet-rolltemplate-coc rules in the Roll20 page styles.
- Updated diagnose:roll20-chat-parity to report actualChatCssInactive/actualChatCssUnknown and per-fixture Actual CSS status.
- Updated gate:roll20-renderer-action so CSS-inactive actual chat evidence is a separate blocker. This prevents agents from misreading the fixture-C 96.93% mismatch as proof that local CSS-enabled ChatPane should be disabled.

Current gate:
- rendererReady=NO.
- actualChatCssInactive=2/3, needsNormalizedCapture=1/3, normalizedHighMismatch=1/2.
- Next P0: obtain or prove a Roll20 Sandbox/test-room chat state where user rolltemplate CSS is active. If Roll20 genuinely keeps chat rolltemplate CSS inactive for custom sheets, document that as Roll20 behavior and adjust the simulator only after repeated evidence across correctly uploaded sheets.

## 2026-06-19 Rolltemplate chat CSS parity update

Status: DOING, not parity.

Evidence now:
- Implemented: local ChatPane now runs emitted rolltemplate CSS through the same Roll20 auto-prefix path used by preview, and rolltemplate body class tokens are normalized to Roll20-style sheet-* classes before rendering.
- Verified: corepack pnpm run build PASS, corepack pnpm run lint PASS, corepack pnpm run guard:roll20-evidence PASS, git diff --check PASS.
- Local chat smoke after CSS activation: fixture-A and fixture-C render paths still produce rolltemplate cards, but the smoke command currently FAILs because external sheet assets return 403/resource errors; fixture-B PASSes.
- Actual Roll20 Chrome observation: current fixture-A/fixture-C Roll20 editor tabs have rolltemplate DOM, but page styles do not contain .sheet-rolltemplate-aw or .sheet-rolltemplate-coc; computed styles show Roll20 default chat typography/background, not user rolltemplate CSS.
- Chat parity numbers after local CSS activation: fixture-A mismatch 9.90% (was 11.65% immediately before this patch), fixture-C mismatch 96.93% because current actual evidence is CSS-inactive while local now applies rolltemplate CSS, fixture-B still needs normalized actual crop evidence.

Decision:
- Keep production renderer gate on HOLD.
- Do not claim Roll20 chat parity from the current actual screenshots, because they are CSS-inactive evidence.
- Next P0: recapture or upload a Roll20 sandbox/test-room state where sheet CSS is actually active in chat, or explicitly classify Roll20 sandbox chat as CSS-inactive and align the local simulator to that verified behavior only if repeated across correctly uploaded sheets.
## 2026-06-19 Active TODO Refresh - Normalized Chat Evidence

- DONE: Recaptured fixture-C 1BU actual Roll20 chat evidence from the dedicated sandbox after clicking the same iframe `[name="roll_str_check"]` button used by local smoke. The ignored sidecar now records a latest `sheet-rolltemplate-coc` rect and CDP physical clip with no visible `#textchat` dialog overlap.
- DONE: Fixed local rolltemplate lookup so `sheet-rolltemplate-coc` no longer accidentally matches `sheet-rolltemplate-coc-dice-roll`; local ChatPane now also applies emitted translation JSON/comment data to rolltemplate field text and simple `data-i18n` labels.
- VERIFY: `node scripts\rolltemplate_chat_smoke.mjs --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/rolltemplate-chat-smoke` PASS for fixture-A, fixture-B, and fixture-C 1BU after the fix.
- STILL OPEN: Actual chat parity remains blocked. Latest normalized diagnostic: `normalizedCompared=2/3`, `needsNormalizedCapture=1` (fixture-B), `normalizedHighMismatch=2`, fixture-C 1BU mismatch `35%`, fixture-A still reports `93.26%` from old suspect capture.
- NEXT P0: recapture fixture-A and fixture-B chat with same-button fresh Roll20 messages and normalized sidecars, then fix remaining rolltemplate row/height parity before claiming Roll20 chat visual parity.

## 2026-06-19 Active TODO Refresh - Chat Parity

- VERIFY: Actual Roll20 chat screenshots and fresh DOM sidecars exist for generated-sheet targets; status still reports `generatedActualScreenshots=6/6` and `generatedDiffed=6/6`.
- BLOCKER: Local ChatPane vs actual Roll20 chat parity is not close enough: compared 3/3, highMismatch 3/3; fixture-A 13.02%, fixture-B 27.95%, fixture-C 12.74%.
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
- Current status: `applyCandidate=2` (fixture-B, fixture-C), `blockGlobalModel=1` (fixture-A), `globalModelSafe=NO`.
- TODO P0: add more fixture coverage before any automatic model selection. A model can be considered for product use only after the gate proves no source/state-dominant fixture is harmed.
# 2026-06-19 Production-Path Input-Flow TODO Update

- VERIFY: `roll20RendererModel` now exists in the real preview builder as a gated diagnostic option, with candidate coverage in `smoke:roll20-full-root-candidates`.
- Current proof: production-path input-flow candidates reproduce the diagnostic injection numbers for fixture-B/fixture-C, but fixture-A still prefers source-state under scroll-metrics. Latest gate remains `HOLD_PRODUCTION_RENDERER_PATCH`, `rendererReady=NO`.
- TODO P0: decide the generic model boundary for when input-flow applies. Do not expose or enable it globally until the renderer action gate no longer reports cross-fixture patch-family disagreement.
# 2026-06-19 Input/Inline-Flow Axis TODO Update

- DONE: added input/inline-flow axis diagnostic. Command: `corepack pnpm run diagnose:roll20-input-flow-axis -- reports\roll20-actual-compare\2026-06-18-state-map-v1`.
- Current result: `SPLIT_RENDERER_AXIS_CONFIRMED` with inlineBest `2` (fixture-B, fixture-C) and sourceGeometryBest `1` (fixture-A via scroll-metrics source-state).
- TODO P0: model the Les/fixture-C input/inline-flow baseline as a generic Roll20 wrapper/base behavior, then rerun full-root candidates, computed-style context, renderer blocker matrix, and renderer action gate. Do not apply it globally if fixture-A remains source/state-dominant.
# 2026-06-19 Renderer Patch-Family TODO Update

- DONE: added scroll-metrics-aware renderer blocker matrix. Command: `corepack pnpm run diagnose:roll20-renderer-blocker -- reports\roll20-actual-compare\2026-06-18-state-map-v1`.
- Current evidence: fixture-A source-state is already a qualified scroll-metrics candidate (`root +8.188px`, panels `11/11`, maxY `16.6px`, maxH `9.05px`), but fixture-B/fixture-C remain best on `inline-block+text-input-height`.
- TODO P0: split the next renderer investigation into two axes: (1) Les/fixture-C Roll20 input/inline-flow baseline, (2) fixture-A selector/default-state/source-state behavior. Do not ship a one-size CSS patch until both axes agree under the gate.
# 2026-06-19 Current Renderer TODO Update

- VERIFY: root-cutoff accounting was refined. Latest `status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1` reports `trustedFullRoot=3/3`, `reliableTrustedFullRoot=3/3`, `trustedFullRootCutoffRisk=1`, `trustedFullRootCutoffUnresolved=0`, `scrollMetricsReplacement=1`, `rendererBlockers=1`, and `rendererReady=NO`.
- TODO P0: resolve the remaining cross-fixture renderer patch-family disagreement. Current gate still HOLDs because fixture-A compares as `none` while fixture-B/fixture-C compare as `inline-block+text-input-height`.
- TODO P0: keep fixture-A's old cutoff-prone stitched screenshot excluded from parity claims. Scroll-metrics is acceptable for diagnostic renderer-candidate comparison, not for claiming final Roll20 visual parity.
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

Current Roll20 renderer safety note, 2026-06-19 fixture-C actual iframe computed-style sidecar captured:
Applied the fixture-C 1BU payload to the dedicated Roll20 Custom Sheet Sandbox through the observed endpoint/settings-form fallback: `/sheetsandbox/savesheetsettings` accepted HTML/CSS/translation with status 200, and `/campaigns/savesettings/21639681` accepted the full `#settingsform` save with wrapped `customcharsheet_json`. Opening the sandbox character `-OvSWvivVPTt2z_4goPF` then exposed a live same-origin character iframe with `.charactersheet` root width `850px`, `1049` inputs, `808` roll buttons, `88` tables, `9` textareas, and `9` scripts. Saved ignored local sidecar `live-iframe-probe/fixture-c-commission-1bu-computed-styles.json`. Latest `diagnose:roll20-computed-style-context` is now `compared=3/3, missingActualStyle=0`, but still `DO_NOT_PROMOTE_DIRECTLY`; `status:roll20-actual` still reports `rendererReady=NO`, `rendererBlockers=2`, and `rendererAction=HOLD_PRODUCTION_RENDERER_PATCH`. Next P0 is resolving fixture-A root-cutoff/live-sidecar disagreement and cross-fixture patch-family disagreement before any production renderer CSS promotion.
Current Roll20 renderer safety note, 2026-06-19 fixture-C sandbox upload automation blocked:
Attempted to load the fixture-C 1BU payload into the dedicated Roll20 Custom Sheet Sandbox editor so the missing actual computed-style sidecar could be captured. The editor page exposes `#sheetHtml`, `#sheetCss`, and `#sheetTranslation`, but all tested automation paths failed without applying files: generated page snippet returned `no-file-on-input` for all three inputs, Chrome/CDP `DOM.setFileInputFiles` is unsupported in this extension surface, and visible label/file chooser activation timed out. No existing room was modified. Latest evidence remains `diagnose:roll20-computed-style-context => compared=2/3, missingActualStyle=1`, `status:roll20-actual => rendererReady=NO`, and `rendererAction=HOLD_PRODUCTION_RENDERER_PATCH`. Next P0 is a manual/alternate upload path for fixture-C or enabling a working Chrome file-chooser route, then capturing `live-iframe-probe/fixture-c-commission-1bu-computed-styles.json`.
Current Roll20 renderer safety note, 2026-06-19 fixture-A computed-style sidecar captured:
Chrome/CDP read-only probing of the dedicated Roll20 editor iframe saved ignored local sidecar `live-iframe-probe/fixture-A-computed-styles.json`. Rerunning `diagnose:roll20-computed-style-context` now compares `2/3` fixtures and leaves only fixture-C as `MISSING_ACTUAL_STYLE`. The result is still `DO_NOT_PROMOTE_DIRECTLY`: fixture-A best style candidate is `sandbox-sheet-alias-attr-class-state-first-12-source` but actual input height is `27.6px` while the local best-style candidate input is `24px`; fixture-B still has row/column/table style/count differences. Renderer remains `HOLD_PRODUCTION_RENDERER_PATCH` and `rendererReady=NO`.
Current Roll20 renderer safety note, 2026-06-19 computed-style context diagnostic:
Added `diagnose:roll20-computed-style-context` to compare actual Roll20 computed-style sidecars against local full-root candidates for `.sheet-2colrow`, `.sheet-3colrow`, `.sheet-col`, table, input, and textarea. Latest run is `DO_NOT_PROMOTE_DIRECTLY`: compared `1/3` fixtures, missing actual style sidecars for fixture-A and fixture-C, and fixture-B still has style/count differences even though `sandbox-inline-block-text-input-276-source` matches input height closely. Next P0 is refreshing actual computed-style sidecars for all fixtures before any inline-flow/input-height renderer CSS is promoted.
Current Roll20 renderer safety note, 2026-06-19 promotion-risk gate:
`diagnose:roll20-renderer-blocker` now writes a `Promotion Risk` section for every diagnostic patch family. Latest report keeps the renderer at `DO_NOT_PROMOTE_DIRECTLY` because `gate:roll20-renderer-action` still has 2 blockers: fixture-best families differ (`none` for fixture-A reliable source, `inline-block+text-input-height` for fixture-B/fixture-C) and fixture-A trusted stitched root still disagrees with the live sidecar by `2620.088px`. The matrix now explicitly says that `inline-block+text-input-height` helps fixture-B/fixture-C but is not fixture-best everywhere, so it must remain diagnostic until actual Roll20 computed styles for `.sheet-2colrow`, `.sheet-3colrow`, `.sheet-col`, text inputs, and textarea prove a generic wrapper/base-context correction.
Current Roll20 renderer experiment note, 2026-06-19 production-path inline-flow patch rejected:
A temporary production-path experiment added the diagnostic inline-block/input-height CSS directly to `buildSheetDoc`/`buildSheetParts`, then reran `smoke:roll20-full-root-candidates`, `gate:roll20-renderer-action`, and `diagnose:roll20-renderer-blocker`. fixture-B/fixture-C baseline improved to the previous best range, but the best candidates moved to additional inline-block word-spacing patches and the renderer gate still held with fixture-A root-cutoff disagreement. The temporary CSS was removed and the candidate/matrix reports were regenerated back to the non-experiment production path. Next work must prove real Roll20 wrapper/base context before shipping any inline-flow CSS.
Current Roll20 renderer blocker note, 2026-06-19 targeted experiment boundary:
`diagnose:roll20-renderer-blocker` was rerun after the 27px candidate smoke. Latest matrix now says `NEEDS_TARGETED_LOCAL_EXPERIMENT`: `inline-block+text-input-height` and `nowrap+text-input-height` help 2 fixtures and are neutral for fixture-A, but fixture-best families still differ and fixture-A still has the trusted stitched root vs live sidecar root blocker. Do not promote the word-spacing/nowrap/input-height diagnostic CSS to production until a targeted local experiment proves it as a Roll20 baseline/context correction rather than a fixture-specific visual patch.
Current Roll20 renderer gate note, 2026-06-19 unified input-flow candidate probe:
`smoke:roll20-full-root-candidates` now includes diagnostic `inline-block+text-input-height` and `inline-block-nowrap+text-input-height` candidates at `27px`, and root-height ties now prefer the lower pixel mismatch. Latest full-root candidate smoke converges fixture-B and fixture-C on `sandbox-inline-block-text-input-270-source`: fixture-B `3.76%` mismatch with rootDelta `-3.625px`, fixture-C `4.23%` mismatch with rootDelta `-0.375px`. fixture-A still does not share that best family in the trusted full-root table, and its reliable comparison still uses the scroll-metrics source candidate (`rootDelta +8.188px`, panelY `+16.6px`, panelH `+0.2px`). Renderer remains `HOLD_PRODUCTION_RENDERER_PATCH` and `rendererReady=NO`; this is stronger cross-fixture evidence for a Roll20 input/inline-block axis, not production visual parity.

Current Roll20 renderer gate note, 2026-06-19 scroll-metrics reliable candidate:
`gate:roll20-renderer-action` now allows a root-cutoff HIGH fixture to contribute a reliable renderer candidate when its scroll-metrics source render is tightly aligned (`rootDelta <= 50px`, `panelY <= 50px`, `panelH <= 10px`). Latest fixture-A uses the scroll-metrics source candidate with rootDelta +8.188px, panelY +16.6px, panelH +0.2px, so the reliable evidence shortage blocker is gone. Renderer still HOLDs because reliable patch families disagree across fixtures: `none` for fixture-A, `inline-block+text-input-height` for fixture-B, and `text-input-height` for fixture-C; the old trusted stitched root cutoff warning remains as evidence hygiene, not as the fixture-A renderer comparison source.
Current Roll20 renderer gate note, 2026-06-19 reliable patch-family comparison:
`gate:roll20-renderer-action` now excludes fixtures with root-cutoff HIGH from reliable patch-family comparison. Latest gate reports reliable cross-fixture renderer evidence `2/3`, explicitly warns that fixture-A's old trusted full-root candidate is excluded, and keeps HOLD. Remaining blockers are now phrased as reliable-evidence shortage, Les/fixture-C patch-family disagreement, and fixture-A stitched-vs-sidecar root disagreement.
Current Roll20 actual-status note, 2026-06-19 reliable full-root accounting:
`status:roll20-actual` now separates raw trusted full-root files from reliable trusted full-root evidence. fixture-A still has a root-cutoff HIGH diagnostic, so the latest status prints `trustedFullRoot=3/3`, `reliableTrustedFullRoot=2/3`, and `trustedFullRootCutoffRisk=1`. This prevents stale/cutoff root evidence from being mistaken for renderer readiness. Renderer remains HOLD and `rendererReady=NO`.
Current Roll20 renderer note, 2026-06-19 scroll-metrics geometry candidate selection:
`smoke:roll20-full-root-candidates` now uses the geometry-best candidate, not merely the root-height closest candidate, when producing `targetGeometry`; root-height ties are broken by geometry score before pixel mismatch. Latest fixture-A scroll-metrics warning now reports `sandbox-source-state` rootDelta +8.188px, panelY +16.6px, panelH +0.2px, and chosen state panels maxYDelta 16.6px instead of the earlier inflated 552.6px from a worse attr-class candidate. Renderer remains HOLD because pixel-best still over-hides and the old trusted stitched root still disagrees with the live sidecar root.
Current Roll20 renderer note, 2026-06-19 Roll20 chrome selector scoping:
Implemented a generic sanitizer guard for Roll20 chrome selectors when `prefixSelectors:false`: selectors targeting `.ui-dialog`, `.dialog`, `.largedialog`, `.tab-content`, `.sheetform`, `#dialog-window`, or `#tab-content` are scoped under `.charsheet`, preventing uploaded user CSS from styling the Roll20 dialog/base wrapper. `buildSheetParts()` now honors `roll20SandboxSanitize`, and Preview/Edit pass the same toggle, reducing preview/edit CSS-path drift. Latest fixture-A scroll-metrics after this change: `sandbox-source-state` rootDelta improved from -189.5px to +8.188px, statePanelYDelta from -2349px to +16.6px, and statePanelHeightDelta from -70.2px to +0.2px. Gate remains HOLD because pixel-best still over-hides and the old trusted stitched root still disagrees with the live sidecar root; this is a concrete renderer improvement, not visual parity.
Current Roll20 renderer note, 2026-06-19 fixture-A textarea cascade diagnostic:
`diagnose:roll20-scroll-metrics-candidates` added diagnostic-only `textarea-height` and `text-input-textarea-height` candidates. Against actual fixture-A 852x11788, the previous root-closest `sandbox-text-input-280-source` was rootDelta -185.5px with right support panels too short; `sandbox-textarea-150-source` reduced rootDelta to -34.313px and state panel height delta to +0.2px; `sandbox-text-input-280-textarea-150-source` is now height-closest at rootDelta +17.688px with state panels compared 11/11, maxYDelta 122.6px, maxHeightDelta 4px. This strongly confirms a textarea/base cascade leak axis, but it is diagnostic-only. Production renderer remains HOLD and `rendererReady=NO` until the fix is generalized as Roll20 selector/base scoping rather than a hardcoded fixture-A patch.
Current Roll20 renderer note, 2026-06-19 fixture-A scroll-metrics state panel geometry:
`diagnose:roll20-scroll-metrics-candidates` now normalizes actual `visiblePanels` from the Roll20 root-container sidecar and compares them against local candidate `statePanels`. Latest fixture-A root-closest candidate remains `sandbox-text-input-280-source` with rootDelta -185.5px. All 11 actual state panels now compare against local panels. Main left playbook panels are height-aligned within +0.2px but local y is about -119px to -126px early. Right-side support panels are too short by -68px to -276px, producing cumulative y drift up to -2297px at the marine/food panel. This points the next P0 toward right-column box/support-panel flow and sizing, not blanket sheet-class aliasing or top playbook selector state. Renderer remains HOLD and `rendererReady=NO`.
Current Roll20 renderer note, 2026-06-19 fixture-A scroll-metrics candidate comparison:
Added `diagnose:roll20-scroll-metrics-candidates` as a separate diagnostic path so the new 852x11788 fixture-A scroll-metrics stitch can be compared without replacing the trusted/full-root gate output. Latest fixture-A diagnostic comparison: actual 852x11788, pixel best `sandbox-sheet-alias-playbook-hide-source` at 7.08% but local root 852x2532 and rootDelta -9256.125px, so it is structurally wrong and must not be promoted. Height/root closest moved back toward source/text-input candidates: `sandbox-text-input-280-source` is -185.5px, while `normal-source-state` is -195.063px and `sandbox-source-state` is -189.5px. This means the older first-13/default-state clue was partly tied to the 9168px cutoff capture. Renderer remains HOLD and `rendererReady=NO`.
Current Roll20 renderer note, 2026-06-19 fixture-A scroll-metrics stitch diagnostic:
Using the read-only iframe metrics, Chrome/CDP captured 23 ignored local sheet-root segments and stitched diagnostic fixture-a-root-scroll-metrics-stitch-20260619.png at 852x11788 from manifest fixture-a-root-scroll-metrics-manifest-20260619.json. audit:roll20-root-stitch now surfaces this as DIAGNOSTIC_SCROLL_METRICS, duplicate segments 0, coverage issues 0, and plan:roll20-root-capture lists it as scroll-metrics. This is stronger recapture evidence but not promoted to trusted roll20-sandbox-root-full-dpr-corrected.png; renderer remains HOLD and rendererReady=NO until the diagnostic is compared/classified and intentionally promoted or recaptured.
Current Roll20 renderer note, 2026-06-19 fixture-A root container metrics sidecar:
Chrome/CDP read the dedicated Roll20 character iframe in read-only mode and saved ignored local sidecar `live-iframe-probe/fixture-A-root-container-metrics.json`. Latest `diagnose:roll20-root-cutoff` now uses that sidecar before the older attr_class sidecar and reports source `fixture-A-root-container-metrics.json`, root/form height `11788.087890625px`, dialog scroller `top=11223.2, h=626/11849`, stitched height `9168px`, delta `2620.088px`, risk `HIGH`. Existing rooms/settings were not modified. Renderer remains HOLD and `rendererReady=NO`; next P0 is recapturing or deriving full-root segments against the authoritative `11788.087890625px` root height.

Current Roll20 renderer note, 2026-06-19 root capture plan cutoff blocker:
`plan:roll20-root-capture` now treats high root-cutoff risk as a capture target even when trusted DPR full-root files already exist. Latest fixture-A plan reports `NEEDS_CAPTURE`, `plannedFixtures=1`, with issue `trusted root cutoff disagreement: stitched=9168px sidecar=11788.087890625px delta=2620.088px`. This prevents `trustedFullRoot=3/3` from being mistaken for renderer readiness when live sidecar root/container metrics disagree. Renderer remains HOLD and `rendererReady=NO`.

Current Roll20 renderer note, 2026-06-19 fixture-A root cutoff diagnostic:
Added `scripts/roll20_root_cutoff_diagnostics.mjs` and `corepack pnpm run diagnose:roll20-root-cutoff -- reports\roll20-actual-compare\2026-06-18-state-map-v1 [fixture-id]`. Latest fixture-A cutoff report compares trusted stitched root evidence against the live attr_class sidecar root: stitched height `9168px`, sidecar root height `11788.087890625px`, delta `2620.088px`, risk `HIGH`. The stitch manifest notes placement was derived from visual overlap because iframe scrollTop/root metadata was unavailable. `gate:roll20-renderer-action` now treats this as an additional blocker before production CSS. Renderer remains HOLD and `rendererReady=NO`.
Current Roll20 renderer note, 2026-06-19 fixture-A attr_class panel geometry:
Added `scripts/roll20_attr_class_panel_geometry_diagnostics.mjs` and `corepack pnpm run diagnose:roll20-attr-class-geometry -- reports\roll20-actual-compare\2026-06-18-state-map-v1 [fixture-id]`. Latest fixture-A geometry report explains why actual-visible panel names did not reproduce full-root height: actual stitched root height is `9168px`, sidecar-visible panel rows intersecting that height are `14`, but only `13` are fully inside. The height-closest local candidate remains `sandbox-sheet-alias-attr-class-state-first-13-source` (`+208.5px`). `gate:roll20-renderer-action` now surfaces this as evidence. Renderer remains HOLD and `rendererReady=NO`; next P0 is DOM container/root cutoff analysis before production CSS.
Current Roll20 renderer note, 2026-06-19 fixture-A actual-visible candidate probe:
`smoke:roll20-full-root-candidates` now reads the ignored attr-class visibility diagnostic and adds actual-sidecar-based candidates without changing production renderer CSS. fixture-A results: actual-visible explicit class candidate is `9.04%` mismatch with root delta `+1310.5px`; actual-visible via forced checked classes is `9.06%` / `+1310.5px`; actual-visible-plus-checked is `9.02%` / `+1861.5px`. These are all worse than the height-closest `sandbox-sheet-alias-attr-class-state-first-13-source` (`8.98%`, `+208.5px`) and do not beat the pixel-best over-hidden `playbook-hide-only` candidate (`7.22%`, `-6636.125px`). Conclusion: actual display-visible panel names alone are not enough to model fixture-A Roll20 default state; next P0 is source order/DOM geometry/default hidden-state analysis before production CSS.
Current Roll20 renderer note, 2026-06-19 fixture-A attr_class visibility diagnostics:
Added `scripts/roll20_attr_class_visibility_diagnostics.mjs` and `corepack pnpm run diagnose:roll20-attr-class-visibility -- reports\roll20-actual-compare\2026-06-18-state-map-v1 [fixture-id]`. Latest fixture-A run compares the actual Roll20 attr_class sidecar with emitted payload selector/class shapes: actual checked value is still `Hardholder`, but actual visible panel values count is `15` and `24` checked show selectors are unprefixed while the emitted/Roll20 HTML shape is `sheet-` prefixed. `gate:roll20-renderer-action` now includes this as positive root-cause evidence while still returning `HOLD_PRODUCTION_RENDERER_PATCH`; `rendererReady=NO`. Next P0 is to model Roll20 selector prefix/default-state behavior without promoting blanket `sheet-` alias CSS or forced checked-state candidates.

Current Roll20 renderer note, 2026-06-19 fixture-A actual attr_class sidecar:
Chrome/CDP read the generated fixture-A Roll20 character iframe in the dedicated sandbox without modifying existing rooms. Ignored local sidecar `live-iframe-probe/fixture-A-attr-class-state.json` records 81 `attr_class`/`class` inputs and actual checked value `Hardholder`. The updated attr-class plan now marks fixture-A `CAPTURED_NEEDS_ANALYSIS`: actual checked `Hardholder` does not explain the height-closest `first-13` candidate (`+208.5px`) while Hardholder-only is far too short. Updated playbook diagnostics and renderer gate now point to selector prefix/state visibility analysis instead of repeating the same capture. Renderer remains `HOLD_PRODUCTION_RENDERER_PATCH` and `rendererReady=NO`.

Current Roll20 renderer note, 2026-06-19 attr_class state capture plan:
Added `scripts/roll20_attr_class_state_capture_plan.mjs` and `corepack pnpm run plan:roll20-attr-class-state -- reports\roll20-actual-compare\2026-06-18-state-map-v1 [fixture-id]`. Latest run classifies fixture-A as the only P0 attr_class capture target: 18 emitted `attr_class` values, actual height bracketed by `first-12` (`-324.5px`) and `first-13` (`+208.5px`). fixture-B/fixture-C have 0 `attr_class` values for this specific probe. `gate:roll20-renderer-action` now points to the new plan command before renderer CSS work. This is planning/snippet automation only; the actual Roll20 checked/value sidecar is still TODO and `rendererReady=NO`.

Current Roll20 renderer note, 2026-06-19 generic attr_class state probes:
`smoke:roll20-full-root-candidates` no longer relies on a hardcoded fixture-A playbook array for forced default-state candidates. It now derives `attr_class` values from each emitted payload's `input[name="attr_class"]` controls and adds generic `attr-class-state-first-N` probes. Latest fixture-A result reproduces the earlier height bracket without sheet-name hardcoding: `first-12` is `850x8844` / `-324.5px`, `first-13` is `850x9377` / `+208.5px`, and `first-14` is `850x9946` / `+777.5px` against actual `850x9168`. Pixel best remains `sandbox-sheet-alias-playbook-hide-source` at `7.22%` but is too short (`-6636.125px`), so renderer CSS still stays HOLD. Next P0: capture or reconstruct the actual Roll20 checked/value state for the controlling `attr_class` inputs, then rerun the full-root/gate scripts before any production renderer change.

Current Roll20 renderer note, 2026-06-19 playbook-state diagnostic automation:
Added `scripts/roll20_playbook_state_diagnostics.mjs` and `corepack pnpm run diagnose:roll20-playbook-state -- reports\roll20-actual-compare\2026-06-18-state-map-v1`. Latest report marks fixture-A `playbookSignal=YES` while fixture-B/fixture-C are `NO`. fixture-A pixel-best and height-closest candidates disagree: pixel best is `sandbox-sheet-alias-playbook-hide-source` (`7.22%`, root `-6636.125px`), height closest is `sandbox-sheet-alias-playbook-state-through-quarantine-source` (`8.98%`, root `+208.5px`). This is a default/playbook state probe target, not visual parity or renderer readiness. Renderer remains HOLD.

Current Roll20 renderer note, 2026-06-19 fixture-A playbook state height probe:
`smoke:roll20-full-root-candidates` now records a separate `closestRootHeightCandidate`. fixture-A pixel best remains `sandbox-sheet-alias-playbook-hide-source` at `7.22%`, but it is structurally wrong (`850x2532`, root delta `-6636.125px`). The closest height candidate is `sandbox-sheet-alias-playbook-state-through-quarantine-source`, with `850x9377` and root delta `+208.5px`; `through-news` is `850x8844` / `-324.5px`. This strongly suggests fixture-A actual Roll20 state is around 12-13 playbook sections visible, not all visible and not only Hardholder. Next P0: capture/derive actual Roll20 playbook/default attr state before any renderer CSS promotion.

Current Roll20 renderer note, 2026-06-19 fixture-A grouped selector candidates:
`smoke:roll20-full-root-candidates` now splits the diagnostic `sheet-` alias CSS into grouped candidates (`hide-only`, `show-only`, `playbook-hide-only`, `control-state-only`). Latest fixture-A candidate table: `normal-source-state` is `8.98%` mismatch with root delta `+2424.938px` (`850x11593`); full alias is `7.89%` but root delta `-7393.125px` (`850x1775`); hide-only is `8.23%` / `-7427.688px`; show-only is `9.18%` / `+2430.5px`; playbook-hide-only is best by pixels at `7.22%` but still root delta `-6636.125px` (`850x2532`); control-state-only is `8.97%` / `+2430.5px`. Interpretation: playbook hide selectors are the strongest fixture-A axis, but applying them as-is over-hides the sheet. Production renderer remains HOLD until actual Roll20 state/DOM explains which playbook sections should stay visible.

Current Roll20 renderer note, 2026-06-19 fixture-A selector/height diagnostics:
Added `scripts/roll20_visibility_selector_diagnostics.mjs`, `corepack pnpm run diagnose:roll20-visibility-selectors -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, and image-based `scripts/roll20_height_drift_diagnostics.mjs`. The selector report finds alias-only hide selector references in all current fixtures: fixture-A `23`, fixture-B `6`, fixture-C `5`, plus fixture-C `33` missing hide refs. This supports a generic Roll20 `sheet-` prefix/default-state investigation, not an fixture-A-only fix. `smoke:roll20-full-root-candidates` now includes diagnostic sheet-class-alias CSS candidates. Latest result: fixture-A mismatch improves `8.98% -> 7.89%`, but root height flips from `+2424.938px` too tall to `-7393.125px` too short, so full selector aliasing over-hides content and must not be promoted. Renderer remains `HOLD_PRODUCTION_RENDERER_PATCH`; next P0 is to inspect actual Roll20 DOM/state/selector behavior more narrowly before production renderer changes.

Current Roll20 renderer note, 2026-06-19 blocker matrix:
Added `scripts/roll20_renderer_blocker_matrix.mjs` and `corepack pnpm run diagnose:roll20-renderer-blocker -- reports\roll20-actual-compare\2026-06-18-state-map-v1` to summarize cross-fixture patch effects after `smoke:roll20-full-root-candidates`. Latest ignored report `renderer-blocker-matrix-results.md` keeps production renderer CSS on HOLD: fixture-A best is `none` with root delta `+2424.938px`, fixture-B best is `inline-block+text-input-height` at `3.87%`, and fixture-C best is `text-input-height` at `4.28%`. The matrix shows no patch family is uniform enough to promote; Les-friendly inline-block/input tweaks are neutral or harmful for other fixtures. Next P0 is fixture-A root-height drift/default-state or structure analysis, not CSS promotion.
Current Roll20 actual-screen note, 2026-06-19 fixture-A trusted DPR root evidence:
fixture-A now has ignored local DPR-corrected full-root evidence generated from the dedicated Roll20 editor tab. CDP `Page.captureScreenshot` could capture top-page sheet-root clips even though iframe `contentDocument` and CDP target attach remain unavailable. The accepted segment set is `fixture-a-root-dpr-complete-segments-20260619/segment-000..023.png`, stitched to `roll20-sandbox-root-full-dpr-corrected.png` at `850x9168` with `roll20-root-dpr-complete-manifest.json`. Verification: `corepack pnpm run audit:roll20-root-stitch -- reports\roll20-actual-compare\2026-06-18-state-map-v1` PASS for fixture-A, fixture-B, and fixture-C; `node scripts\roll20_actual_screenshot_diff.mjs reports\roll20-actual-compare\2026-06-18-state-map-v1` reports fixture-A sandbox mismatch `10.52%`; `corepack pnpm run smoke:roll20-full-root-candidates -- reports\roll20-actual-compare\2026-06-18-state-map-v1` reports fixture-A best `normal-source-state` at `8.98%` with root delta `+2424.938px`; `corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1` now reports `trustedFullRoot=3/3`. Renderer remains HOLD: `gate:roll20-renderer-action` now has one blocker, because the best diagnostic patch is not uniform across fixtures (`none` for fixture-A, `inline-block+text-input-height` for fixture-B, `text-input-height` for fixture-C). This is stronger actual Roll20 evidence, not Roll20 visual parity and not permission to apply production renderer CSS.
Current Roll20 actual-screen note, 2026-06-19 fixture-A full-root capture attempt:
fixture-A actual Roll20 editor segment capture succeeded with five ignored local screenshots under `reports/roll20-actual-compare/2026-06-18-state-map-v1/local-baseline/fixture-A/screenshots/`. Added `scripts/roll20_overlap_stitch_diagnostic.mjs` and `corepack pnpm run stitch:roll20-overlap-diagnostic` to inspect segment continuity when iframe DOM/scrollTop cannot be read. The generated `fixture-a-overlap-stitch-diagnostic.png` is `720x2093` and useful for diagnosis, but visible seams remain, so it is not promoted to trusted `roll20-sandbox-root-full-dpr-corrected.png` evidence. Renderer action remains HOLD until fixture-A gets a stricter DPR-corrected full-root capture/manifest or a validated stitch path.

Current Roll20 renderer note, 2026-06-19 fixture-A long diagnostic capture:
A longer fixture-A Roll20 iframe segment capture reached 38 ignored local screenshots and stitched to `fixture-a-long-overlap-stitch-diagnostic.png` at `720x12062`. This reduced the diagnostic root-height delta from `+10398.063px` to `+1726.938px`, proving the earlier 10-segment diagnostic was too short. The evidence remains `DIAGNOSTIC_ONLY`: `audit:roll20-root-stitch` still skips fixture-A as untrusted, and `gate:roll20-renderer-action` remains HOLD. The next action is not CSS yet; resolve fixture-A coverage/default-state/root-height drift or capture trusted DPR-corrected full-root evidence.

Current Roll20 renderer note, 2026-06-19 diagnostic-only fixture-A full-root comparison:
`smoke:roll20-full-root-candidates` now compares overlap-stitch images only as `DIAGNOSTIC_COMPARED`, storing the best result as `diagnosticBestCandidate` instead of trusted `bestCandidate`. fixture-A diagnostic comparison produced `sandbox-text-input-270-source` at `7.93%`, but the local root height delta is `+10398.063px`, so it is evidence that fixture-A still needs a trustworthy full-root capture rather than a production renderer patch. `gate:roll20-renderer-action` now prints this as a `WARNING` while keeping `HOLD_PRODUCTION_RENDERER_PATCH` and trusted full-root count at `2/3`.
Current Roll20 actual-screen note, 2026-06-19 fixture-A dense segment/audit update:
fixture-A is visible in the dedicated Roll20 Sandbox editor via the visible DOM/iframe-expanded controls, but the iframe document/root remains unreadable through normal page DOM. A denser ignored local capture set was created as `fixture-a-dense-scroll-segment-00..09.jpg`, producing `fixture-a-dense-overlap-stitch-diagnostic.png` at `720x3418` with 10 segments. This is better diagnostic coverage, not trusted full-root evidence. `audit:roll20-root-stitch` now reports fixture-A as `SKIP` with `DIAGNOSTIC_ONLY` overlap evidence, and `gate:roll20-renderer-action` now surfaces that exact blocker. Roll20 upload refresh attempts through JS snippet, CDP `DOM.setFileInputFiles`, and file chooser remained blocked/unsupported in the current Chrome extension environment.
Current Roll20 renderer/chat note, 2026-06-19 actual evidence gate cleanup:
`scripts/roll20_renderer_action_gate.mjs` now treats generated-sheet Sandbox/chat evidence separately from optional solo-room observation evidence. Latest gate rerun no longer blocks on `actual evidence incomplete` once `status:roll20-actual` reports `GENERATED_ACTUAL_SCREENSHOTS_DIFFED`, `generatedActualScreenshots=6/6`, and `generatedDiffed=6/6`. Production renderer CSS is still HOLD because only 2/3 fixtures have full-root candidates and the best diagnostic patch family is not uniform across fixtures.

Current local chat-renderer note, 2026-06-19 Roll20 message shell update:
`components/editor/ChatPane.tsx` now injects a Roll20-derived chat shell subset for `textchatcontainer`, `message`, `spacer`, `by`, `tstamp`, inline rolls, and the default rolltemplate table. Local chat cards now use Roll20's message-row structure instead of treating `.spacer` as a card wrapper, and the remaining broken Korean copy in the chat pane was replaced with readable labels. Latest local smoke: `node scripts\rolltemplate_chat_smoke.mjs --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/rolltemplate-chat-smoke --port 4411` PASS for fixture-A, fixture-B, and fixture-C. Message rows now measure `300px` in the local app panel and inner rolltemplate cards measure `269px`; actual Roll20 chat screenshots still mismatch heavily, so this is a shell-alignment step, not actual Roll20 chat parity.
Current edit-mode verification note, 2026-06-19 imported sync smoke hardening:
`scripts/imported_edit_sync_smoke.mjs` now rejects non-leaf layer-reorder candidates unless the moving node and target are true siblings with the same parent/depth. This prevents a parent/child container from being treated as a Figma-like sibling reorder target. The free-placement check also no longer uses a naive first-closing-tag string bound after DOM already proves the new widget is nested under the active frame; that false-negative hid a valid absolute-in-frame drop in fixture-B. Latest local rerun: `corepack pnpm run smoke:imported-edit-sync -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/imported-edit-sync --port 4424` PASS for fixture-A, fixture-B, and fixture-C 1BU. fixture-A/fixture-C still report resource WARNs from external image loading, so this is edit interaction/sync evidence only, not visual parity.

Current local chat-renderer note, 2026-06-19 Roll20 shell alignment:
`components/editor/ChatPane.tsx` now uses readable Korean copy and wraps local
chat cards with Roll20-like `textchatcontainer`, `message`, `spacer`, `by`, and
`tstamp` classes. `scripts/rolltemplate_chat_smoke.mjs` now verifies that shell
structure in addition to rolltemplate card rendering. Latest local smoke:
`node scripts\rolltemplate_chat_smoke.mjs --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/rolltemplate-chat-smoke --port 4411`
PASS for fixture-A, fixture-B, and fixture-C; all three rendered rolltemplate cards at
`280px`, with Roll20 shell markers present and no debug `rolltemplate:name`
label. This is still local app evidence only, not actual Roll20 chat parity.

Current Roll20 actual-screen note, 2026-06-19 chat evidence split:
`scripts/roll20_actual_status.mjs` and `scripts/roll20_upload_handoff.mjs` now
distinguish Roll20 chat DOM evidence and page-level screenshots from a
trustworthy `roll20-chat.png` screenshot. Latest status/handoff rerun shows
fixture-A and fixture-C still have missing chat screenshots, while fixture-B is
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
gate as status/diff: fixture-A is listed as `SUSPECT` and still needs generated
actual evidence because its fallback `roll20-sandbox.png` has no positive DOM/
root sidecar; fixture-B and fixture-C have generated sheet evidence present but
still need Roll20 chat screenshots. Latest handoff command:
`corepack pnpm run handoff:roll20-upload -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --missing-only`.

Current Roll20 actual-screen note, 2026-06-19 screenshot-diff truthfulness update:
`scripts/roll20_actual_screenshot_diff.mjs` now applies the same evidence gate as
`scripts/roll20_actual_status.mjs`. A fallback `roll20-sandbox.png` viewport
capture is no longer diffed unless positive iframe DOM/root evidence proves the
sheet actually rendered. Latest local rerun:
`node scripts\roll20_actual_screenshot_diff.mjs reports\roll20-actual-compare\2026-06-18-state-map-v1`
reports fixture-A sandbox `SUSPECT`, fixture-B sandbox `6.57%`, fixture-C sandbox
`22.93%`, and all room/chat targets still `SKIP`. This keeps endpoint-storage or
blank-iframe screenshots from being counted as Roll20 visual evidence. Actual
Roll20 parity is still not proven; next P0 remains file-input/full activation
for fixture-A plus trustworthy Roll20 chat screenshots.

Current Roll20 actual-screen note, 2026-06-19 legacy manifest update:
live Roll20 sandbox verification found that the fixture-A official source
`sheet.json` declares `"legacy": true`, while the generated local verification
payload had been writing `"legacy": false`. `scripts/roll20_actual_local_baseline.mjs`
now resolves fixture legacy mode from fixture metadata or the official source
`sheet.json`; regenerating fixture-A produced a payload `sheet.json` with
`"legacy": true`. Applying the regenerated fixture-A payload to the dedicated
Roll20 sandbox still left the character iframe blank, and applying the official
fixture-A source files plus original `sheet.json` also left the iframe blank. Treat
fixture-A endpoint-fallback evidence as blocked/invalid until the file-input upload
path or another Roll20 sandbox condition is verified. A later attempt to restore
the fixture-C generated payload through the same endpoint path also reopened as an
empty iframe, so the endpoint fallback itself is now suspect as an activation
path and must not be used as render proof without a fresh iframe DOM check.
Current status remains
partial: `corepack pnpm run status:roll20-actual --
reports\roll20-actual-compare\2026-06-18-state-map-v1` reports
`generatedActualScreenshots=2/6`, `generatedDiffed=2/6`,
`roomObservationScreenshots=0/3`, and `roomObservationDiffed=0/3`; this does
not prove fixture-A visual parity. fixture-A is now reported as `SUSPECT` because only a
fallback viewport PNG exists without positive iframe DOM/root sidecar evidence.

Current Roll20 actual-screen note, 2026-06-19 endpoint viewport update:
the dedicated Roll20 sandbox endpoint fallback was reused for fixture-A and fixture-C.
POSTs to `/sheetsandbox/savesheetsettings` accepted base64 HTML/CSS/translation,
and `/campaigns/savesettings/21639681` saved each fixture's
`customcharsheet_json`. Later rechecks downgraded fixture-A endpoint viewport
evidence to `SUSPECT`, so it must not be used as render proof. Ignored
evidence currently counts fixture-B DPR-corrected full-root mismatch `6.57%`
and fixture-C DPR-corrected full-root mismatch `22.93%`; fixture-A needs a fresh
file-input/full-activation check. Latest status is still partial:
`corepack pnpm run status:roll20-actual --
reports\roll20-actual-compare\2026-06-18-state-map-v1` reports
`generatedActualScreenshots=2/6`, `generatedDiffed=2/6`,
`roomObservationScreenshots=0/3`, and `roomObservationDiffed=0/3`.
`--require-actual` still correctly fails because all 3 Roll20 chat screenshots
are missing. fixture-A/fixture-C viewport screenshots classify as
`viewport/crop/sheet size dominates current diff`; they still need
DPR-corrected sheet-root/full-root capture before renderer CSS conclusions.

Current Roll20 actual-screen note, 2026-06-19 DPR-corrected update:
complete DPR-corrected sheet-root-only evidence is now preferred over the older
contaminated `roll20-sandbox-root-full.png`. `corepack pnpm run
audit:roll20-root-stitch -- reports\roll20-actual-compare\2026-06-18-state-map-v1`
PASSes fixture-B and records the old scaled full-image stitch as superseded
evidence. `node scripts\roll20_actual_screenshot_diff.mjs
reports\roll20-actual-compare\2026-06-18-state-map-v1` now compares local
preview against `roll20-sandbox-root-full-dpr-corrected.png` and reports
fixture-B sandbox mismatch `6.57%` (`850x3771` local vs `852x4122` actual).
`corepack pnpm run smoke:roll20-full-root-candidates -- ...` now finds
diagnostic candidate `sandbox-inline-block-text-input-276-source` at `3.87%`
with root delta `-0.656px`; `diagnose:roll20-geometry` shows rows/tables are
near-aligned in that candidate. This is a strong next renderer clue, not visual
parity and not a production CSS patch yet. fixture-A/fixture-C generated Roll20 full-root
captures and trustworthy chat screenshots remain missing.
Pre-upload/evidence guard update: the prior `payload-roundtrip` FAIL was stale
local baseline evidence. Regenerating the local baseline for all three prepared
fixtures with the same state map, then rerunning payload roundtrip, produced
fixture-A `0%`, fixture-B `0%`, and fixture-C `0%`. `verify:roll20-preupload` now
regenerates local baseline/upload payloads before the audits so this stale
baseline failure mode is less likely to recur. fixture-B remains the only
fixture with generated actual Roll20 full-root screenshot evidence in this run.
Follow-up full-root candidate decomposition: `corepack pnpm run
smoke:roll20-full-root-candidates --
reports\roll20-actual-compare\2026-06-18-state-map-v1` now clears each
fixture's candidate artifact folder before writing crops, adds text-input-height
only candidates, and writes a Component Effect Summary. Latest fixture-B
result still finds diagnostic `sandbox-inline-block-text-input-276-source` as
pixel/geometry best at `3.87%` mismatch and root delta `-0.656px`. The
decomposition shows text-input height alone does not explain the Roll20 delta
and actually worsens geometry, while inline-block whitespace/fit candidates
remove the row wrap and provide most of the improvement. This remains
diagnostic-only: do not promote `word-spacing`, `nowrap`, or input-height CSS to
production until repeated actual Roll20 captures across fixture-A/fixture-C or additional
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
local-only ignored handoff evidence and shows 3 visible entries: fixture-A and fixture-C
need generated actual + chat evidence, while fixture-B still needs chat
evidence. `corepack pnpm run status:roll20-actual --
reports\roll20-actual-compare\2026-06-18-state-map-v1 --require-actual`
correctly fails with `PARTIAL_GENERATED_ACTUAL_SCREENSHOTS`,
`generatedActualScreenshots=1/6`, and `commandGate=NEEDS_ACTION`.

Current Roll20 actual-screen note, 2026-06-19: the older fixture-B `18.81%`
full/viewport sandbox screenshot diff is superseded by the preferred
`roll20-sandbox-root.png` crop path. `corepack pnpm run crop:roll20-actual`
created a local-only root crop from measured iframe metadata, and
`node scripts\roll20_actual_screenshot_diff.mjs reports\roll20-actual-compare\2026-06-18-state-map-v1`
now reports fixture-B sandbox mismatch `21.67%` after CSS-size normalization.
`corepack pnpm run classify:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1`
now separates two facts: the root crop is only the visible top of the tall
sheet (`760x556` vs local full preview `850x4478`), and the compared visible
viewport itself still mismatches by `21.67%`. This is partial actual Roll20
evidence, not visual parity; next evidence step is visible-crop CSS/assets/state
inspection plus full-height/scroll-stitched Roll20 root capture before any
full-sheet parity claim.
Follow-up visible-crop diagnostics:
`corepack pnpm run diagnose:roll20-visible-crop -- reports\roll20-actual-compare\2026-06-18-state-map-v1`
now writes ignored PNG artifacts and reports fixture-B `760x556` mismatch
`21.67%`, top-aligned local crop gain only `0.34%`, full-crop mismatch bounds
`0,0,760,556`, dominant band `bottom`, dominant quadrant `bottomLeft`. This
rules out simple horizontal crop drift as the main cause; next inspection should
compare actual/local visible CSS, default state, asset rendering, and Roll20
scale/layout context.
Follow-up visible-context diagnostics:
`corepack pnpm run diagnose:roll20-visible-context -- reports\roll20-actual-compare\2026-06-18-state-map-v1`
now reports that current evidence still cannot read the actual Roll20 iframe
DOM/CSS. For fixture-B, the top ranked issue is the Roll20
viewport/full-height evidence gap: actual visible crop `760x556` covers only
`12.42%` of local `850x4477`; the matched visible crop still mismatches
`21.67%`, crop gain is only `0.34%`, sandbox sanitize rewrites both HTML/CSS,
the local state hint `act_fullsheet` needs actual confirmation, 7 asset URLs are
proxied, and chat has DOM evidence but no trustworthy screenshot. fixture-A and fixture-C
still lack generated Roll20 sandbox screenshots. This is diagnostic triage, not
visual parity.
Follow-up same-context visible smoke:
`corepack pnpm run smoke:roll20-same-context-visible -- reports\roll20-actual-compare\2026-06-18-state-map-v1`
renders local payload candidates using normal root, local Sandbox expected root,
measured frame inset, and fit-to-visible-width captures. fixture-B best
candidate is `normal-root-top-left` at `21.60%`, barely different from the
previous `21.67%`. This means measured local context simulation does not
materially explain the remaining visible mismatch; next work should prioritize
actual computed-style/state/asset evidence and full-height/scroll-stitched
Roll20 root capture rather than more crop/inset guessing.
Follow-up live iframe computed-style probe:
Chrome/CDP could read the actual Roll20 character iframe for the generated
fixture-B sandbox sheet. Local ignored evidence is under
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
reports\roll20-actual-compare\2026-06-18-state-map-v1` reports fixture-B best
candidate `normal-root-no-state` at `21.38%` instead of `21.60%`. The improvement
is small but the computed-style probe is cleaner: `html` no longer differs, and
input font/background/padding no longer show the app-like `proxima`/white/padded
override. Remaining deltas are root width/context (`852` actual vs `900` local in
the same-context probe), full-height mismatch, table-count/structure mismatch,
and control height/button background details. This is still not visual parity.
Regression check after the Shadow box-model change:
`corepack pnpm run smoke:preview-edit-visual -- --out-dir ./out --base-path
/roll20-block-editor --fixtures test-fixtures/visual --report-dir
reports/preview-edit-visual --port 4336` PASS: fixture-A `1.75%`, fixture-B
`2.02%`, fixture-C 1BU `1.01%`.
Follow-up DPR/root-width same-context diagnostic:
`corepack pnpm run smoke:roll20-same-context-visible --
reports\roll20-actual-compare\2026-06-18-state-map-v1` PASS after the smoke
began rendering local candidates with the measured Roll20 crop DPR
(`deviceScaleFactor=1.25`), actual-root-width context patches, native-pixel
comparison, and root-relative computed-style samples. fixture-B now selects
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
fixture-B unresolved gaps are narrowed to row 0 and row 3 inline-block
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
repeating-control/runtime CSS investigation target, not a fixture-B-specific
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
overall because fixture-A/fixture-C exceed the strict local 2% gate, but fixture-B
PASSes with `0%` source-vs-payload mismatch. fixture-B source preview and
export payload preview are both `850x3771`, both have row 0 at `553px`, and both
have row 3 at `274px`; actual Roll20 remains `852x4122`, row 0 `310.6px`, row 3
`140.2px`. This rules out emitted-payload drift as the current fixture-B root
cause and keeps the next P0 on actual Roll20 inline-block fitting/layout context.
2026-06-19 geometry-fit split follow-up:
`smoke:roll20-full-root-candidates` now separates pixel best from geometry best.
Additional diagnostic candidates tested actual root width `+1/+2px`, row width
`+1/+2px`, `white-space: nowrap`, and nowrap plus text input `27.6px`.
fixture-B pixel best is still `normal-actual-root-width-source` at `8.58%`
mismatch but with poor geometry score `1129.775`; geometry best is
`sandbox-nowrap-text-input-276-source` with near-matching root/row geometry
(`rootDelta -0.656px`, row0 `+0.775px`, row3 `-3.2px`) but worse visual
mismatch `9.09%`. This means the next P0 is not an off-by-one width patch. The
geometry-best overlay/crop/state needs inspection before any generic nowrap or
native-input CSS is promoted to production.
2026-06-19 mismatch-distribution follow-up:
`scripts/roll20_full_root_candidate_smoke.mjs` now records dominant vertical,
horizontal, and decile diff regions per candidate. Latest fixture-B evidence:
pixel best `normal-actual-root-width-source` has dominant diff `top 12.35%`,
`left 9.65%`, `d0 15.99%`; geometry best
`sandbox-nowrap-text-input-276-source` has dominant diff `top 13.07%`,
`left 9.83%`, `d1 20.18%`. The geometry-best candidate fixes the root height
but worsens the upper-sheet visual mismatch, so the next P0 is to inspect the
top/d1 overlay and actual Roll20 screenshot state/background/crop before any
production renderer CSS change. fixture-A/fixture-C still need actual full-root
screenshots; this remains diagnostic only, not visual parity.
2026-06-19 actual full-root crop/stitch correction:
dominant decile crop triplets are now written by
`scripts/roll20_full_root_candidate_smoke.mjs`. Inspecting the geometry-best
fixture-B crop showed the actual `roll20-sandbox-root-full.png` includes
Roll20 VTT toolbar/grid pixels on the left while the local crop is sheet-only.
`scripts/roll20_actual_difference_classify.mjs` now reads
`roll20-sandbox-root-full.json` and classifies fixture-B as
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
fixture-B evidence because the old full-root stitch scales `682px -> 852px`
full-image segments and the first DPR-corrected manifest is incomplete. Do not
use current full-root diff for renderer CSS decisions until a complete
DPR-corrected sheet-root-only stitch passes this audit.
Follow-up actual layout-context probe:
Chrome/CDP read-only probing of the dedicated Roll20 sandbox iframe saved
ignored evidence at `live-iframe-probe/fixture-B-layout-context.json`.
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
`corepack pnpm run stitch:roll20-actual-root -- --manifest reports\roll20-actual-compare\2026-06-18-state-map-v1\local-baseline\fixture-B\screenshots\roll20-root-stitch-clipped-manifest.json --out reports\roll20-actual-compare\2026-06-18-state-map-v1\local-baseline\fixture-B\screenshots\roll20-sandbox-root-full.png`
created a local-only `852x4122` full-height root image. The first full-height
diff now reports fixture-B sandbox mismatch `6.90%`, replacing the old
`21.67%` visible-top crop as the main generated-sheet evidence for this fixture.
`corepack pnpm run classify:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1`
now classifies the remaining mismatch as `sheet root geometry/height differs
after full-height capture`: Roll20 actual root is `852x4122`, while the local
preview is `850x4478`. This is real progress toward Roll20 parity but still not
visual parity. fixture-A/fixture-C generated Roll20 screenshots and all trustworthy chat
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
| DONE | Codex | Add live Shadow DOM cascade leak diagnostics. | `scripts/live_shadow_cascade_smoke.mjs` PASS for fixture-A, fixture-B, fixture-C 1BU: preview/edit Shadow DOM sampled visible properties had 0 app-like CSS winners. Report: `reports/live-shadow-cascade/live-shadow-cascade-results.md`. External asset failures are tracked separately from cascade leakage. |
| DONE | Codex | Add imported fixture preview/edit screenshot smoke. | `corepack pnpm run smoke:preview-edit-visual -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/preview-edit-visual --port 4314` PASS after `build`: 3 fixtures rendered preview root + edit root with 0 console/page errors and 0 resource issues after iframe referrer policy alignment. Latest diagnostic mismatch: fixture-A 1.76%, fixture-B 1.68%, fixture-C 1BU 0.85%; edit host/content height delta is 0 for all 3 and preview/edit toolbar overlap is 0. New DOM signature parity gate also PASS: preview/edit node counts, block-id counts, first 120-node sequence hash, tag/control counts, and visible runtime node count match for fixture-A, fixture-B, and fixture-C 1BU. This is local preview/edit parity evidence, not Roll20 actual-screen parity. |
| DONE | Codex | Add imported real-fixture edit drag sync smoke. | `scripts/imported_edit_sync_smoke.mjs` PASS after `build`: the 3 prepared ignored fixtures each found an imported visible input node that moved through the real edit pointer path, landed at the same position in preview, emitted matching absolute CSS, accepted a friendly widget drop into a visible imported sheet insertion target as non-absolute flow content, accepted a second user-facing free-placement drop as nested absolute content inside an imported frame/flow target, and survived edited emit -> re-import -> emit stability checks. Report: ignored `reports/imported-edit-sync/imported-edit-sync-results.md`. One fixture also found a safe imported layer leaf sibling pair and reordered it through the layer row path; the others record SKIP for that sub-check. 2026-06-19: smoke report now separates `Interaction` from `Resources`; `corepack pnpm run smoke:imported-edit-sync -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/imported-edit-sync --only fixture-c-commission-1bu --port 4296` reports interaction PASS but resources WARN for fixture-C Imgur/Typekit failures. `corepack pnpm run smoke:imported-edit-sync:strict -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/imported-edit-sync --only fixture-A --port 4298` PASS proves the strict path succeeds when resources load. This is local static-app evidence only, not actual Roll20 parity. |
| VERIFY | Codex | Capture full-height Roll20 sandbox root evidence. | DPR-corrected path captured 8 read-only Chrome/CDP sheet-root-only segments from the dedicated Roll20 sandbox iframe for fixture-B and stitched ignored `roll20-sandbox-root-full-dpr-corrected.png` at `852x4122`. `corepack pnpm run audit:roll20-root-stitch -- reports\roll20-actual-compare\2026-06-18-state-map-v1` PASSes fixture-B and treats the older scaled `roll20-sandbox-root-full.png` evidence as superseded. `node scripts\roll20_actual_screenshot_diff.mjs reports\roll20-actual-compare\2026-06-18-state-map-v1` reports generated fixture-B sandbox mismatch `6.57%` against local `850x3771`; classifier confirms DPR-corrected full-root evidence and keeps the issue as `sheet root geometry/height differs after full-height capture`. Endpoint fallback now also produced ignored Roll20 sandbox viewport screenshots for fixture-A and fixture-C, but those classify as viewport/crop/sheet-size dominated evidence, not full-root evidence. `verify:roll20-preupload` PASSes after fresh baseline regeneration. Still not DONE: fixture-A/fixture-C DPR-corrected full-root captures and all trustworthy chat screenshots remain missing, and the renderer fix is not yet promoted. |
| VERIFY | Codex | Diagnose full-root state/geometry candidates before renderer CSS changes. | `corepack pnpm run smoke:roll20-full-root-candidates -- reports\roll20-actual-compare\2026-06-18-state-map-v1` now uses DPR-corrected full-root evidence when present. Latest result: fixture-B best diagnostic candidate is `sandbox-inline-block-text-input-276-source` at `3.87%`, root delta `-0.656px`, row0 delta `0.775px`, row3 delta `-3.2px`, dominant diff middle/left/d5. `corepack pnpm run diagnose:roll20-geometry -- ...` now reports root delta `-0.656px` and top finding `TABLE.sheet-center-content`; row/table counts match in the best candidate. This is a renderer clue, not a shipped CSS fix. Next P0: inspect the best-candidate dominant crop and convert only generic Roll20 inline-block/control-height behavior into production if it survives preview/edit regression and additional actual screenshots. |
| DOING | Codex | Add Roll20 actual-screen verification workflow. | Latest local pre-upload gate PASS with state-map-aware baseline: `corepack pnpm run verify:roll20-preupload -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --fixtures test-fixtures\visual --out-dir ./out --base-path /roll20-block-editor --state-map reports\visual-state-candidates\visual-state-candidates-state-map.json`. `scripts/roll20_actual_status.mjs`, `scripts/roll20_actual_screenshot_diff.mjs`, and `scripts/roll20_upload_handoff.mjs` now all treat fallback `roll20-sandbox.png` as `SUSPECT` unless a positive iframe DOM/root sidecar proves the sheet rendered. Status/handoff also split chat DOM evidence from visual chat screenshots: fixture-B currently has `chat-dom-only`, while fixture-A and fixture-C have missing chat screenshots. Latest handoff rerun lists fixture-A as `SUSPECT + needs generated actual`; fixture-B and fixture-C have generated sheet evidence present but still need chat screenshots. Latest diff rerun reports fixture-A `SUSPECT`, fixture-B sandbox `6.57%`, fixture-C sandbox `22.93%`, and all room/chat targets `SKIP`. Latest status command reports `PARTIAL_GENERATED_ACTUAL_SCREENSHOTS`, `generatedActualScreenshots=2/6`, `generatedDiffed=2/6`, `roomObservationScreenshots=0/3`, and `roomObservationDiffed=0/3`. Chrome can claim the dedicated editor tab, but normal iframe DOM access is unavailable and this runtime blocks CDP target discovery/auto-attach, so no new actual screenshot was captured in this batch. This is partial actual Roll20 evidence, not visual parity. Next: unblock the file-input/full settings activation path, recapture fixture-A, and add trustworthy Roll20 chat screenshots before renderer CSS promotion. |
| VERIFY | Codex | Align local preview/export with actual Roll20 sandbox sanitize/prefix behavior. | 2026-06-19 Chrome observation of the dedicated Roll20 sandbox settings page found `customcharsheet_json` on the visible settings surface and script references for `customcharsheet_layout`, `customcharsheet_style`, and `#customsheet-preview iframe -> #root`. Added first dedicated module `lib/emit/roll20SandboxSanitize.ts`, separate from `sanitizeForRoll20Legacy`, covering observed `.charsheet` selector prefixing, Roll20 URL allow/proxy/drop handling, mobile/comment stripping, unsafe-token rejection, HTML allow-listing, runtime-node stripping, and class-token prefix exceptions for `attr_`, `sheet-`, `repeating_`, `roll_`, and `act_`. Added `scripts/roll20_sandbox_sanitize_audit.mjs`, package script `audit:roll20-sandbox-sanitize`, and included it in `verify:roll20-preupload`. The export dialog exposes the same expected-transform diagnostics, and preview now has a `Sandbox ?�상` toggle that applies the sanitizer approximation in iframe preview only. Latest fixture browser smoke PASS: `corepack pnpm run smoke:roll20-sandbox-preview -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --fixture fixture-B --report-dir reports/roll20-sandbox-preview-smoke --port 4331`; normal preview `colgroup=6`, `rolltemplate=3`, `workerScripts=1`; Sandbox expected preview `colgroup=0`, `rolltemplate=0`, `workerScripts=0`, console/page errors 0. Verification: `corepack pnpm run test:roll20-sandbox-sanitize` PASS, `corepack pnpm run audit:roll20-sandbox-sanitize -- reports\roll20-actual-compare\2026-06-18-state-map-v1` PASS, `corepack pnpm run verify:roll20-preupload -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --fixtures test-fixtures\visual --out-dir ./out --base-path /roll20-block-editor --state-map reports\visual-state-candidates\visual-state-candidates-state-map.json` PASS from the prior gate, `corepack pnpm run lint` PASS, `corepack pnpm run build` PASS, and `corepack pnpm run smoke:preview-edit-visual -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/preview-edit-visual --port 4332` PASS. This is still not actual Roll20 visual parity. |
| VERIFY | Codex | Expand Roll20 Sandbox expected preview smoke to all prepared fixtures. | Added `--all` support and package script `smoke:roll20-sandbox-preview:all` for `scripts/roll20_sandbox_preview_smoke.mjs`. Latest run PASS/WARN: `corepack pnpm run smoke:roll20-sandbox-preview:all -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/roll20-sandbox-preview-smoke --port 4333`. fixture-A, fixture-B, and fixture-C 1BU all passed fixture-level sanitizer render checks; Sandbox expected preview stripped visible rolltemplate/source-worker runtime nodes to 0 for all three (`2 -> 0`, `4 -> 0`, `20 -> 0`). `Console status=WARN` records Roll20 image-proxy font CORS and source sheet numeric-expression warnings separately from sanitizer failures; page errors were 0. Verification: `node --check scripts\roll20_sandbox_preview_smoke.mjs` PASS, `corepack pnpm run lint` PASS, `corepack pnpm run build` PASS, and `corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1` still reports `PREUPLOAD_READY_MISSING_GENERATED_ACTUAL`. This is local expected-render coverage only, not actual Roll20 visual parity. |
| DONE | Codex | Surface Roll20 upload readiness clearly in the export dialog. | `components/editor/ExportDialog.tsx` separates local zip-file readiness from actual Roll20 Sandbox/test-room visual verification and uses readable Korean UI copy. It now also exposes a Roll20 Sandbox expected-transform diagnostic panel driven by `sanitizeRoll20SandboxHtml/Css`, showing HTML/CSS rewrite risk, runtime stripping, class/tag rewrites, URL proxy/drop counts, and fatal reject risk without mutating the zip payload. Latest static app smoke PASS: `corepack pnpm run smoke:export-dialog -- --out-dir ./out --base-path /roll20-block-editor --report-dir reports/export-dialog-smoke --port 4326`; it confirms the header and empty-state Korean copy, confirms no sample UI appears when the public sample catalog is empty, confirms no mojibake in the initial shell or export dialog text, opens the export dialog, confirms 5 readiness items, confirms the `?�제 검�??�요` badge, confirms the Sandbox diagnostics panel with 4 diagnostic rows, confirms the legacy toggle and local-vs-actual verification warning copy, opens the import dialog, and verifies main mode tab clicks with 0 console/page errors. New fixture-mode smoke PASS: `corepack pnpm run smoke:export-dialog -- --out-dir ./out --base-path /roll20-block-editor --report-dir reports/export-dialog-smoke-imported --fixtures test-fixtures/visual --fixture fixture-B --port 4325`; it imports a copied ignored fixture first, then confirms the export Sandbox diagnostics report `치명 ?�류 ?�음`, 4 rows, and expected rewrite rows for the real emitted payload. `corepack pnpm run test:roll20-sandbox-sanitize`, `corepack pnpm run audit:roll20-sandbox-sanitize -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `corepack pnpm run lint`, and `corepack pnpm run build` also PASS. Actual Roll20 visual parity remains under the separate Roll20 actual-screen TODO. |

## Critical Product Tasks

| Status | Priority | Task | Notes |
| --- | ---: | --- | --- |
| VERIFY | P0 | Make edit canvas and preview render from the same emitted HTML/CSS path, with edit overlays only. | Latest renderer-regression check after removing the Shadow edit forced `border-box` reset: `corepack pnpm run smoke:preview-edit-visual -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/preview-edit-visual --port 4336` PASS: fixture-A 1.75%, fixture-B 2.02%, fixture-C 1BU 1.01%. Earlier DOM-signature gate PASS showed matching preview/edit screenshot dimensions, edit host/content height delta 0, preview/edit toolbar overlap 0, 0 visible runtime nodes, and DOM signature parity PASS for node counts, block-id counts, tag/control counts, and sequence hash. Edit no longer keeps a fixed 900px canvas shell or renders the preview toolbar over the sheet. `scripts/imported_edit_sync_smoke.mjs` also PASS for 3 imported fixtures after fixing Shadow image referrer behavior and optimistic move clearing, and now includes imported visible-node move sync, imported canvas flow insertion, edited emit -> re-import -> emit stability, safe imported layer reorder where available, and non-leaf subtree reorder for all 3 prepared fixtures. Needs remaining fixture-specific visual fixes and actual Roll20 comparison before DONE. |
| DONE | P0 | Hide `script`, `script[type="text/worker"]`, and `rolltemplate` from sheet canvas in every render mode. | `lib/preview/buildDoc.ts` now hard-hides them after user CSS in iframe and shadow/edit render paths; fixture render report confirms source script/rolltemplate nodes remain for runtime/chat extraction. |
| VERIFY | P0 | Preserve worker JS as a separate future block-coding workspace. | Worker workspace split is implemented and now source-audited: import replaces the worker workspace from source `<script type="text/worker">` bodies, including nested/raw worker scripts, strips worker scripts from visual HTML, and emit appends one Roll20 worker script without duplicate visual/runtime leakage. `corepack pnpm run audit:worker -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/worker-source-audit` PASS for fixture-A, fixture-B, and fixture-C 1BU with exact worker source bodies. `corepack pnpm run smoke:worker`, `scripts/browser_roundtrip_smoke.mjs`, and `scripts/imported_edit_sync_smoke.mjs` also PASS for the 3 prepared ignored fixtures. Still needs broader corpus audit and actual Roll20 sandbox/test-room worker runtime parity before DONE. |
| DONE | P0 | Implement real browser L2 roundtrip: import -> emit -> import -> compare. | **3/3 fixtures PASS** (fixture-A, fixture-B, fixture-C 1?� 6531 blocks): `reports/roundtrip-browser/browser-roundtrip-results.md`. Fix chain: worker wrapper newline + indent growth, section/toggle multi-class guard, whitespace-only line growth. This proves browser emit stability for 3 fixtures only ??NOT all-sheet support. Imported edit-step smoke now exists separately in `reports/imported-edit-sync/`; expand fixtures next. |
| VERIFY | P0 | Add visual/cascade leak verification for Roll20 preview. | Standalone report (`reports/cascade-leak/cascade-leak-results.md`) and live Shadow DOM report (`reports/live-shadow-cascade/live-shadow-cascade-results.md`) both show 0 app-like CSS winners across 3 fixtures. `preview_edit_visual_smoke` records resource diagnostics and currently reports 0 resource issues for the local preview/edit screenshot path. `capture_visual_fixture_previews.mjs` now also separates render status from resource status and supports `--fail-on-resource-issues true`; latest fixture-C and fixture-A strict preview captures PASS with resources PASS. Imported edit/reimport still has external image failures to normalize/cache/classify against actual Roll20. |
| DONE | P0 | Add asset URL reachability regression audit. | `corepack pnpm run audit:assets -- --fixtures test-fixtures\visual --payload-run reports\roll20-actual-compare\2026-06-18-pseudo-fix-v1 --report-dir reports\asset-resource-audit` PASS. fixture-A, fixture-B, and fixture-C 1BU source/payload asset refs had 0 failed HTTP probes and 0 missing local relative refs; payload introduced 0 new asset regressions. Local reachability guard only, not Roll20 visual parity. |
| DOING | P0 | Build screenshot-based sheet visual verification from existing preview images. | Inventory, fixture prep, shared preview render, and browser capture smoke are working. Next: normalize viewport/crop and add pixel diff against references. |
| DONE | P0 | Add first browser-canvas pixel diff harness. | `reports/visual-fixture-diff/visual-fixture-diff-results.md`; first diagnostic diff computed for 2 fixtures. Needs viewport/state/crop normalization before parity gating. |
| DOING | P0 | Normalize visual diff viewport, initial sheet state, and crop region. | `corepack pnpm run diff:visual-fixtures` now first captures live local preview PNGs through `scripts/capture_visual_fixture_previews.mjs`, applies optional state-map action/control hints, regenerates diff pages, collects browser JSON, and writes ignored classification reports. The capture step can also be run directly as `corepack pnpm run capture:visual-fixtures` or strict resource mode as `corepack pnpm run capture:visual-fixtures:strict`. Latest strict spot checks PASS: fixture-A applies `control_attr_class_Hardholder` with resources PASS, and fixture-C 1BU captures initial preview state with resources PASS. Latest full diff run PASS: fixture-A applies `control_attr_class_Hardholder` (`attr_class=Hardholder`) and reports 16.23% best mismatch; fixture-B applies `act_fullsheet` (`sheetTabForBtn=fullsheet`, `sheetTab=fullsheet`) and reports 8.84% best mismatch. `node scripts\classify_visual_fixture_diffs.mjs reports\visual-fixture-diff test-fixtures\visual` now detects that those state hints are already applied and classifies both fixture-A and fixture-B as `reference/capture context mismatch`; next action is crop/context normalization or actual Roll20 screenshot collection before renderer CSS changes. The runner was hardened for large fullsheet data-URL pages by waiting on the result JSON instead of locator visibility. `scripts/roll20_actual_local_baseline.mjs`, `scripts/roll20_payload_roundtrip_visual_smoke.mjs`, and `scripts/roll20_preupload_verification.mjs` also accept/forward optional `--state-map`, so the local baseline and cleaned-payload visual roundtrip compare the same state. Latest state-map run `2026-06-18-state-map-v1` is local pre-upload PASS with 0% payload-roundtrip mismatch. This is state/crop triage and upload-readiness evidence only, not actual Roll20 parity. |
| TODO | P1 | Improve raw fallback coverage for sheets such as custom Magica. | Current custom-magica coverage is 95.7%, rawFallback 76. |
| VERIFY | P1 | Make layer panel useful as a Figma-like hierarchy/reparenting surface. | Layer rows expose explicit drag zones (`before`, `inside`, `after`), adapter supports top-level and nested sibling insertion, and children inside a statement chain can be reordered before/after siblings. Canvas widget dragover now exposes `inside`, `before`, and `after`; layer rows now visibly show role labels, `?�기 가?? for containers, default placement mode (`?�름` / `?�유`), and Korean drop badges (`?�에 ?�음` / `?�에 ?�음` / `?�에 ?�음`). `corepack pnpm run smoke:edit-flow -- --out-dir ./out --base-path /roll20-block-editor --report-dir reports/edit-flow-smoke --port 4318` verifies zone detection, nested input reorder, canvas insertion of new inputs before/after an existing nested input, readable Korean edit UI labels, layer role/drop affordance attributes/text, and synthetic non-leaf group movement with child preservation in emitted HTML. `imported_edit_sync_smoke` now also verifies imported canvas insertion as non-absolute flow content for 3 fixtures, imported layer leaf reorder for fixture-B when a safe leaf sibling pair exists, and imported non-leaf subtree reorder with direct child preservation for fixture-A, fixture-B, and fixture-C 1BU. 2026-06-19 strict resource mode was added so visual-parity work cannot hide broken external images/fonts behind an edit-interaction PASS. Still needs richer screenshot evidence for real user drags and actual Roll20 comparison before DONE. |
| VERIFY | P1 | Define absolute positioning inside frames/groups. | Synthetic browser smoke now verifies two paths: dragging an existing frame child creates parent design CSS `position: relative` plus child design CSS `position: absolute; left/top`; and the user-facing free placement mode drops a new gallery text input into a frame as a nested absolute child with emitted/computed left/top matching. Imported real-fixture smoke also PASS for the 3 prepared ignored fixtures: free placement produced nested absolute inputs inside imported frame/flow targets with parent `relative`, child `absolute`, and emitted/computed left/top matching. Evidence: `scripts/edit_flow_browser_smoke.mjs` and `scripts/imported_edit_sync_smoke.mjs` PASS against static `out/`. Still needs richer UX screenshot evidence and actual Roll20 sandbox/test-room comparison before DONE. |
| DONE | P1 | Add shared DOM layer role classification for edit UX. | `lib/editor/layerRoles.ts` gives frame/flow/table/control/action/text/media/runtime roles used by the layer panel, gallery drop detection, and Shadow DOM edit affordance CSS. Real drag/drop browser smoke passed (`reports/edit-flow-smoke/`): dropped section exposes `data-r20-layer-role="frame"` + `data-r20-can-drop="1"` and receives flow children. |
| VERIFY | P1 | Expand Roll20 worker simulator and chat rolltemplate rendering. | Local chat smoke now clears chat per fixture and checks exactly 1 card, 280px rolltemplate width, no app-only `rolltemplate:name` debug label, and Roll20-like chat shell classes (`textchatcontainer`, `message`, `spacer`, `by`, `tstamp`). Latest report: `reports/rolltemplate-chat-smoke/rolltemplate-chat-smoke-results.md`; fixture-A, fixture-B, and fixture-C all PASS with real `user-click`, rolltemplate kind, 280px card width, and shell markers present after `components/editor/ChatPane.tsx` Korean copy cleanup. Added `corepack pnpm run smoke:worker-state`: synthetic Roll20 tab sheet PASS proves action buttons trigger worker `setAttrs`, hidden input DOM property and `value` attribute both update, CSS `[value=...]` sibling selectors switch visible panels, and duplicate `attr_*` checkbox/radio controls mirror checked state so CSS `:checked` anchors update. Latest worker-state smoke has 0 console/page errors; source worker preservation rechecked by `corepack pnpm run audit:worker` PASS for fixture-A, fixture-B, and fixture-C. Actual Roll20 chat/worker parity remains TODO: latest actual status splits fixture-B as `chat-dom-only` and fixture-A/fixture-C as missing `roll20-chat.png`, so no actual Roll20 chat visual parity claim is allowed. Worker simulator split still TODO. |
| VERIFY | P1 | Add explicit modern/legacy Roll20 preview/export mode checks. | Export-level synthetic audit PASS: `corepack pnpm run audit:legacy-export -- --report-dir reports/legacy-export-audit`. Preview/edit render-path smoke PASS: `corepack pnpm run smoke:legacy-preview -- --report-dir reports/legacy-preview-smoke`, and the toolbar exposes `data-testid="preview-legacy-css-toggle"` for the local preview/edit legacy CSS mode. Imported-fixture visual smoke PASS: `corepack pnpm run smoke:legacy-fixture-visual -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/legacy-fixture-visual`; fixture-A and fixture-C 1BU had no legacy-risk CSS in the emitted preview chunk, while fixture-B reduced risk `1 -> 0` with 0 console/page/resource issues. Actual Roll20 legacy sandbox/test-room parity still TODO. |
| DONE | P0 | Add default-state CSS selector regression audit. | `corepack pnpm run audit:state-selectors -- --fixtures test-fixtures\visual --payload-run reports\roll20-actual-compare\2026-06-18-pseudo-fix-v1 --report-dir reports\state-selector-audit` PASS. It verifies source and generated payload controls against hidden/value/checked CSS state selectors, and fails only when payload creates a new missing-anchor regression beyond source. fixture-A and fixture-B had 0 source/payload anchor issues; fixture-C had 7 source-only dead/worker-driven selector anchors and 0 payload regressions. Local semantic guard only, not Roll20 visual parity. |
| DOING | P0 | Run Roll20 actual-screen check with Chrome session. | Clean local payloads are generated by `scripts/roll20_actual_local_baseline.mjs` and gated by `corepack pnpm run verify:roll20-preupload -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --fixtures test-fixtures\visual --out-dir ./out --base-path /roll20-block-editor --state-map reports\visual-state-candidates\visual-state-candidates-state-map.json`, latest PASS. Chrome reached the dedicated Roll20 Custom Sheet Sandbox, but filechooser upload is still blocked and endpoint `200` responses are now treated as storage-only unless fresh iframe DOM/root evidence confirms activation. Latest status reports `PARTIAL_GENERATED_ACTUAL_SCREENSHOTS`, `generatedActualScreenshots=2/6`, `generatedDiffed=2/6`, `roomObservationScreenshots=0/3`, and `roomObservationDiffed=0/3`; fixture-A is `SUSPECT`, fixture-B and fixture-C have generated sandbox evidence, and all Roll20 chat screenshots remain missing. Existing solo rooms are observation-only; generated sheet checks must use Custom Sheet Sandbox first or a new test room. Store screenshots/reports locally only. |
| VERIFY | P0 | Implement actual Roll20 sandbox sanitize/prefix contract locally. | First module/test slice exists in `lib/emit/roll20SandboxSanitize.ts` and `lib/emit/__tests__/roll20SandboxSanitize.test.ts`; package command `corepack pnpm run test:roll20-sandbox-sanitize` covers selector prefixing, Roll20 URL proxy/drop behavior, unsafe CSS rejection, HTML allow-list/class exceptions, runtime source stripping, and HTML URL proxy/drop behavior. The module is now wired into `scripts/roll20_sandbox_sanitize_audit.mjs`, the local `verify:roll20-preupload` gate, the export dialog's explicit Sandbox expected-transform panel, and a preview-only `Sandbox ?�상` render toggle. Latest preview toggle smoke PASS: `corepack pnpm run smoke:roll20-sandbox-preview -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --fixture fixture-B --report-dir reports/roll20-sandbox-preview-smoke --port 4331` verifies the imported fixture changes from normal preview `colgroup=6`, `rolltemplate=3`, `sourceWorkerScript=1` to Sandbox expected preview `colgroup=0`, `rolltemplate=0`, `sourceWorkerScript=0` with 0 console/page errors. Latest checks PASS: `corepack pnpm run test:roll20-sandbox-sanitize`, `corepack pnpm run audit:roll20-sandbox-sanitize -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, empty-workspace export smoke on port 4326, imported-fixture export smoke on port 4325, `corepack pnpm run lint`, `corepack pnpm run build`, and `corepack pnpm run smoke:preview-edit-visual -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/preview-edit-visual --port 4332`. Next: compare against actual Roll20 screenshots after upload unblocks. |
| VERIFY | P1 | Separate auto-prefix preview sanitize from real legacy Roll20 CSS sanitize in fixture reports. | `scripts/render_visual_fixture_doc.mjs` now reports `Auto-prefix` and `Legacy CSS sanitize` separately; actual legacy CSS sanitizer preview mode remains TODO. |
| DONE | P0 | Establish `dev` branch and predeploy CI. | `dev` branch pushed to origin; CI passed on `main` and `dev` when checked on 2026-06-12. `main` remains the only GitHub Pages deploy branch. |
| TODO | P1 | Decide separate public preview hosting for `dev`. | GitHub Pages currently provides one repo site; recommended options are Vercel/Netlify, a second Pages repo, or a same-site `/dev/` artifact merge. |
| DONE | P2 | Move old duplicated QA files into `docs/qa/archive/` after checking references. | `rg` showed no code/script references outside QA self-references; archived old v1/v2 QA snapshots and added `docs/qa/README.md`. |
| DONE | P0 | Render prepared visual fixtures through the shared preview document path. | `reports/visual-fixture-render/visual-fixture-render.md`; rendered 3 copied fixtures through `buildSheetDoc`. This is not visual parity yet. |

## Verified So Far

## Latest State Visibility Diagnostic

2026-06-19: `corepack pnpm run diagnose:roll20-state-visibility --
reports\roll20-actual-compare\2026-06-18-state-map-v1` writes ignored evidence
under `state-visibility-diagnostics/` and reports fixture-B as
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
candidate smoke still leaves fixture-B at `8.52%` best direct mismatch with
local root about `841px` taller than actual, so visual parity is still TODO.
Next P0 remains row/table/control geometry and additional actual Roll20
screenshots for fixture-A/fixture-C plus trustworthy chat evidence.
Follow-up state-diagnostic report wording update: `scripts/roll20_state_visibility_diagnostics.mjs` now records that local Sandbox expected render paths already keep CSS selectors unprefixed (`prefixSelectors: false` in `buildSheetDoc`, ExportDialog diagnostics, and sandbox sanitize audit). The fixture-B finding remains `ACTUAL_CSS_STATE_SELECTORS_DO_NOT_MATCH_PREFIXED_HTML`, but the next action is cross-fixture re-verification and local Sandbox expected visibility comparison, not reintroducing blanket CSS selector prefixing.
Follow-up local expected visibility comparison: `scripts/roll20_state_visibility_diagnostics.mjs` now renders the payload HTML/CSS in a local Roll20 wrapper and compares the actual-visible panel selector set. Latest rerun for fixture-B reports local Sandbox expected visibility matches actual sampled visibility `9/9`; keep cross-fixture re-verification open, but for this fixture prioritize geometry/assets/control styling over more state-selector changes.
Follow-up sampled panel height delta update: the same diagnostic now lists local-vs-actual height deltas for the sampled visible panels. Latest fixture-B lightweight-wrapper sample highlights `.sheet-section-competences` (+496.872px) and `.sheet-skills` (+496.272px) as the largest local-over-actual panel deltas. Treat these as geometry triage clues only; full-root candidate evidence still remains the stronger renderer signal.
Follow-up renderer action gate: `corepack pnpm run gate:roll20-renderer-action -- reports\roll20-actual-compare\2026-06-18-state-map-v1` now consolidates status, full-root candidates, state visibility, and geometry evidence. Latest recommendation is `HOLD_PRODUCTION_RENDERER_PATCH`: fixture-A lacks trusted root evidence, all Roll20 chat screenshots are missing, only 2/3 fixtures have full-root candidates, and best diagnostic patches differ across fixtures. Keep diagnostic CSS candidates out of production until these blockers are cleared.





| Status | Scope | Evidence |
| --- | --- | --- |
| DONE | Full corpus static inventory | `reports/corpus-static-audit/corpus-static-audit.md`; 1434 sheets, 18676 files. |
| DONE | Selected Node import determinism | `reports/roundtrip-node/summary.md`; 7 selected fixtures PASS at Node-side import determinism level. |
| DONE | Malformed `<` parser hang fix | `custom-magica` dropped from >300000 ms timeout to 61 ms in `reports/roundtrip-node/summary.md`. |
| DONE | CI/CD deploy for latest commit | GitHub Actions run for `1620b61` completed successfully and GitHub Pages returned 200. |
| DONE | Claude CLI setup | Installed `@anthropic-ai/claude-code`; executable path `C:\Users\acorn\AppData\Roaming\npm\claude.cmd`; verified version `2.1.144`. |
| DONE | Local smoke after render CSS patch | `corepack pnpm run lint`, `corepack pnpm run build`, and `http://127.0.0.1:3000/` browser load with no console errors. |
| DONE | Visual reference inventory | `reports/visual-reference-inventory/visual-reference-inventory.md`; found 1497 source sheet folders, 9114 images, 491 visual candidates. |
| DONE | Visual fixture preparation smoke | `scripts/prepare_visual_fixture.mjs` copied `official-roll20:fixture-B` and `official-roll20:fixture-A` into ignored `test-fixtures/visual/` with manifests. |
| DONE | Explicit fixture-C 1BU fixture smoke | `scripts/prepare_explicit_fixture.mjs` copied `1?� HTML.html`, `1?� CSS.css`, and `踰덉�?txt` into ignored fixture `fixture-c-commission-1bu`; `buildSheetDoc` render and Browser Use load completed with 0 console errors/warnings. |
| DONE | Roll20 dialog class context restored | `buildSheetDoc` and `buildSheetParts` now put `ui-dialog ui-widget ui-widget-content ui-corner-all` on `#dialog-window`; regenerated fixture-C fixture confirms wrapper context while visible dialog chrome remains suppressed. |
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
| DONE | Worker source preservation audit | `scripts/worker_source_audit.mjs` PASS for fixture-A, fixture-B, and fixture-C 1BU: source worker script bodies were preserved exactly in the emitted worker workspace output, including the prior nested worker-script case. Report: ignored `reports/worker-source-audit/worker-source-audit-results.md`. |
| VERIFY | Local rolltemplate chat smoke | `scripts/rolltemplate_chat_smoke.mjs` reports fixture-A, fixture-B, and fixture-C PASS in the static app with real user-clicks. Each tested fixture clears prior chat first and verifies 1 card, 280px width, `Debug label=no`. fixture-B was restored by preserving `class="sheet-tabstoggle..."` on hidden inputs, which lets its Roll20 CSS default tab selectors match. Actual Roll20 chat/sandbox parity is still unverified. |
| DONE | fixture-C mapping-fidelity verification + 10-defect fix batch | `reports/mapping-fidelity/mapping-fidelity-fixture-c.md`. All Roll20-meaningful token categories now EXACT between source and emit for fixture-C 1?� (attr 1069, inputs 1049, roll buttons 808 name+value, data-i18n 1083, placeholders 140, disabled 6, i18n keys 399). Fixed: DOMParser self-closing tag swallowing, r20_skill_row missing field definitions,  XML-illegal separator, placeholder->value pollution, i18n key mangling, placeholder/data-i18n/disabled loss on input/textarea/heading/caption, CSS attribute-selector space loss, section/toggle multi-class guard, whitespace-line indent growth, hook bumpStructure. `lint`/`build`/smoke/roundtrip all re-passed 2026-06-12. |

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
- The sandbox settings page still held the fixture-C `customcharsheet_json` manifest, so fixture-A is not currently proven as the loaded generated sheet.
- fixture-A upload through the visible `Sheet Sandbox Tools` HTML file chooser still failed with Chrome `Not allowed`; the file-input/full-activation blocker remains.
- An initial `roll20-chat.png` capture used uncorrected CSS clip coordinates and captured the sandbox tools dialog. That bad local PNG was removed.
- A DPR-corrected chat capture showed the Roll20 chat panel, but only default chat tips/invite text, not a rolltemplate card.
- fixture-B `roll20-chat-dom-evidence.json` was refreshed from the current DOM and now records 5 messages and 0 rolltemplates.
- Latest actual status remains `PARTIAL_GENERATED_ACTUAL_SCREENSHOTS`, `generatedActualScreenshots=2/6`, `generatedDiffed=2/6`; Roll20 chat visual evidence is still missing.

## 2026-06-19 Chat Evidence Gate TODO Note

- Hardened `scripts/roll20_actual_status.mjs`, `scripts/roll20_actual_screenshot_diff.mjs`, and `scripts/roll20_upload_handoff.mjs` so `roll20-chat.png` is not trusted by itself.
- Chat evidence now requires a `roll20-chat-dom-evidence.json` sidecar with rendered rolltemplate markers.
- The chat PNG and DOM sidecar must be fresh relative to each other; stale pairs are reported as suspect instead of proof.
- Temporary regression check copied a local PNG into the fixture-B chat target while the current sidecar had 0 rolltemplates. Status stayed `generatedActualScreenshots=2/6`, and screenshot diff reported fixture-B chat `SUSPECT`. The temporary PNG was removed.
- Current actual status remains `PARTIAL_GENERATED_ACTUAL_SCREENSHOTS`; no Roll20 chat visual parity claim is allowed.

## 2026-06-19 Export Dialog Evidence-Boundary TODO Note

- DONE: Export dialog now separates local zip readiness from browser upload permission and actual Roll20 screenshot verification.
- DONE: Export dialog smoke now requires 6 readiness items, file-access blocker copy, and explicit zip-is-not-proof copy.
- VERIFIED: `smoke:export-dialog` passed for empty workspace on port 4432 and imported fixture-B fixture on port 4433 after `corepack pnpm run build`.
- STILL TODO: actual Roll20 file chooser upload remains blocked until Chrome/Codex file URL access is enabled or another verified activation path is found.
- STILL TODO: fixture-A trusted root evidence and all trustworthy Roll20 chat screenshots remain missing; no Roll20 visual parity claim is allowed.

## 2026-06-19 Sandbox Upload Snippet TODO Note

- DONE: Added `corepack pnpm run snippet:roll20-upload` to generate ignored Custom Sheet Sandbox upload snippets from local-baseline payloads.
- VERIFIED: `node --check scripts\roll20_upload_snippet.mjs`, `node --check scripts\roll20_upload_handoff.mjs`, and snippet generation for `fixture-A` passed. The generated snippet also passed `node --check` syntax validation.
- STILL TODO: run the snippet or normal file chooser inside the actual dedicated Roll20 Custom Sheet Sandbox, then capture trusted fixture-A root evidence and Roll20 chat screenshots. Snippet generation alone is not visual parity.
## 2026-06-19 Chrome Read-Only Check TODO Note

- VERIFIED: Existing Roll20 editor/settings tabs are still open and the editor snapshot still contains `Sheet Sandbox Tools`.
- BLOCKED/TODO: The current browser automation path exposed only read-only evaluation, and the file input ids were not visible in the snapshot, so the generated upload snippet was not executed in this batch.
- NEXT: open/expand Sheet Sandbox Tools in the dedicated editor tab, run the generated snippet or normal file chooser upload, then capture trusted root/chat evidence.

## 2026-06-19 fixture-A Actual Roll20 Render Evidence TODO Note

- VERIFIED: The dedicated Roll20 Custom Sheet Sandbox editor was reclaimed without touching existing rooms. The visible character sheet tab now shows generated fixture-A controls such as `Angel`, `Battlebabe`, `Brainer`, `Child-Thing`, `Chopper`, `Driver`, `Faceless`, `GunLugger`, and `Hardholder`.
- VERIFIED: Ignored local evidence was saved under `reports/roll20-actual-compare/2026-06-18-state-map-v1/local-baseline/fixture-A/screenshots/` as `roll20-sandbox.png` plus positive `roll20-sandbox-dom-evidence.json`.
- VERIFIED: `node scripts\roll20_actual_screenshot_diff.mjs reports\roll20-actual-compare\2026-06-18-state-map-v1` now diffs fixture-A sandbox at `14.01%`. A follow-up `corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1` reports `generatedActualScreenshots=3/6` and `generatedDiffed=3/6`.
- STILL TODO: all Roll20 chat/rolltemplate screenshots are missing, fixture-A still lacks full-root candidate evidence, and `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH`. Do not claim Roll20 visual parity.

## 2026-06-19 fixture-A Actual Roll20 Chat Evidence TODO Note

- VERIFIED: The dedicated Roll20 Custom Sheet Sandbox editor tab was used only for the verification character; existing rooms/private logs were not modified.
- VERIFIED: Clicking a visible fixture-A sheet roll button in actual Roll20 opened the macro option flow and, after submit, produced a Roll20 chat message with `.sheet-rolltemplate-aw` markers.
- VERIFIED: Ignored local evidence now includes `roll20-chat.png` plus fresh `roll20-chat-dom-evidence.json` under `reports/roll20-actual-compare/2026-06-18-state-map-v1/local-baseline/fixture-A/screenshots/`.
- VERIFIED: `corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1` reports `generatedActualScreenshots=4/6` and `generatedDiffed=4/6` after screenshot diff.
- VERIFIED: `corepack pnpm run handoff:roll20-upload -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --missing-only` now lists only fixture-B and fixture-C as remaining visible entries.
- STILL TODO: fixture-B and fixture-C still need trustworthy Roll20 chat screenshots; only 2/3 fixtures have full-root candidates; `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH`.
- CLAIM BOUNDARY: This proves fixture-A actual Roll20 rolltemplate/chat evidence, not full Roll20 visual parity.

## 2026-06-19 Sandbox Settings Manifest Wrapper TODO Note

- DONE: `scripts/roll20_upload_snippet.mjs` now wraps the plain export `sheet.json` into Roll20 settings fallback shape `{ sheet, userOptions, jsoninfo }` before filling `customcharsheet_json`.
- VERIFIED: `node --check scripts\roll20_upload_snippet.mjs`, `corepack pnpm run snippet:roll20-upload -- reports\roll20-actual-compare\2026-06-18-state-map-v1 fixture-A`, generated snippet `node --check`, `status:roll20-actual`, `gate:roll20-renderer-action`, and `guard:roll20-evidence` were rerun.
- CURRENT: `status:roll20-actual` remains `GENERATED_ACTUAL_SCREENSHOTS_DIFFED` with `generatedActualScreenshots=6/6` and `generatedDiffed=6/6`.
- STILL TODO: `gate:roll20-renderer-action` remains `HOLD_PRODUCTION_RENDERER_PATCH` because only 2/3 fixtures have full-root candidates and diagnostic patch families differ. Do not claim Roll20 visual parity.
## 2026-06-19 Renderer Gate Next-Action Precision TODO Note

- DONE: `scripts/roll20_renderer_action_gate.mjs` now reports the current blocker precisely as missing full-root candidate comparison for `fixture-A` instead of implying that generated/chat evidence is still missing.
- VERIFIED: `corepack pnpm run gate:roll20-renderer-action -- reports\roll20-actual-compare\2026-06-18-state-map-v1` now lists next actions only for fixture-A DPR-corrected full-root evidence, cross-fixture patch-family comparison, and keeping diagnostic CSS out of production.
- CURRENT: generated sandbox/chat evidence remains 6/6 diffed, but production renderer CSS still stays HOLD because full-root candidate evidence is only 2/3 and Les/fixture-C prefer different diagnostic patch families.
## 2026-06-19 Roll20 Screenshot MIME Hardening TODO Note

- DONE: Roll20 actual screenshot/diff/stitch scripts now detect PNG vs JPEG from file bytes instead of trusting the filename extension. This matters because the Chrome screenshot surface can return JPEG bytes even when agents save a `.png` filename.
- VERIFIED: `node --check` passed for the changed scripts, and reruns of `roll20_actual_screenshot_diff`, `smoke:roll20-same-context-visible`, `smoke:roll20-full-root-candidates`, `status:roll20-actual`, `gate:roll20-renderer-action`, and `guard:roll20-evidence` all completed successfully on `2026-06-18-state-map-v1`.
- CURRENT: fixture-A visible Roll20 sheet capture was possible in the dedicated sandbox editor, but browser control became unstable before a trustworthy DPR-corrected full-root stitch could be completed. The renderer gate remains HOLD with the same real blocker: fixture-A lacks full-root candidate comparison.

## 2026-06-19 fixture-A Overlap Transition Audit TODO Note

- DONE: `scripts/roll20_overlap_stitch_diagnostic.mjs` now writes transition quality metadata without embedding the giant image data URL in the JSON sidecar.
- DONE: `scripts/roll20_root_stitch_audit.mjs` now surfaces overlap transition warnings in the root-stitch audit table as `low advance` and `high score` counts.
- VERIFIED: The latest long fixture-A diagnostic stitch is `720x12062` from 38 ignored local segments. Transition summary: median advance `321px`, `lowAdvanceTransitions=1`, `highScoreTransitions=0`.
- CURRENT: `audit:roll20-root-stitch` still classifies fixture-A as `SKIP` because only overlap diagnostic evidence exists; fixture-B and fixture-C remain PASS on trusted DPR-corrected full-root evidence.
- STILL TODO: fixture-A needs trusted DPR-corrected full-root capture or a validated manifest-backed stitch path before renderer CSS can be promoted. The remaining diagnostic root-height delta is not enough to justify production CSS.

## 2026-06-19 fixture-A Duplicate Segment Capture Audit TODO Note

- DONE: `scripts/roll20_overlap_stitch_diagnostic.mjs` now hashes input segments and records duplicate segment groups in the diagnostic JSON.
- DONE: `scripts/roll20_root_stitch_audit.mjs` and `scripts/roll20_renderer_action_gate.mjs` now surface duplicate segment counts in fixture-A diagnostic-only evidence.
- VERIFIED: Regenerating `fixture-a-long-overlap-stitch-diagnostic.png` from 38 ignored local segments reports `duplicateSegments=2`, `duplicateGroups=1`; segments 36 and 37 are byte-identical.
- CURRENT: `gate:roll20-renderer-action` still returns `HOLD_PRODUCTION_RENDERER_PATCH` and now names fixture-A's best diagnostic as 38 segments, max score `6.605`, duplicate segments `2`.
- STILL TODO: recapture fixture-A with real DPR-corrected sheet-root segment metadata or a manifest-backed scroll source. Do not promote the current overlap stitch to trusted full-root evidence.

## 2026-06-19 Trusted Stitch Duplicate Guard TODO Note

- DONE: `scripts/roll20_actual_stitch_root.mjs` now records SHA-256 duplicate segment summaries in stitched full-root metadata.
- DONE: `scripts/roll20_root_stitch_audit.mjs` now fails trusted stitched metadata or DPR capture manifests when segment image entries are byte-identical.
- VERIFIED: Existing trusted DPR evidence for fixture-B and fixture-C still passes `audit:roll20-root-stitch`; fixture-A remains `SKIP` because it has only diagnostic overlap evidence.
- CURRENT: `gate:roll20-renderer-action` still holds production CSS and preserves the fixture-A duplicate-segment blocker detail.
- STILL TODO: recapture fixture-A with non-duplicate DPR-corrected sheet-root segments plus manifest-backed coverage before running it as trusted full-root evidence.

## 2026-06-19 Actual Status Truthfulness TODO Note

- DONE: `status:roll20-actual` now prints trusted full-root evidence and renderer readiness separately from generated screenshot/diff counts.
- VERIFIED: latest `2026-06-18-state-map-v1` status prints generated `6/6`, trusted full-root `2/3`, renderer action `HOLD_PRODUCTION_RENDERER_PATCH`, rendererReady `NO`.
- CURRENT: this prevents `generatedActualScreenshots=6/6` from being mistaken for Roll20 visual parity or production renderer approval.
- STILL TODO: recapture fixture-A as trusted DPR-corrected full-root evidence, rerun root-stitch audit, screenshot diff, full-root candidate smoke, and renderer action gate.

## 2026-06-19 Renderer Ready Gate TODO Note

- DONE: Added `--require-renderer-ready` to `status:roll20-actual` and exposed it as `corepack pnpm run gate:roll20-renderer-ready -- <run-dir>`.
- VERIFIED: current `2026-06-18-state-map-v1` correctly fails this gate because generated screenshots/diffs are `6/6`, but trusted full-root is still `2/3`, renderer action is `HOLD_PRODUCTION_RENDERER_PATCH`, and rendererReady is `NO`.
- CURRENT: this is the required precondition gate before production renderer CSS changes or visual-parity claims.
- STILL TODO: recapture fixture-A trusted DPR-corrected full-root evidence and rerun the renderer-ready gate until it passes for `3/3` trusted full-root fixtures.

## 2026-06-19 fixture-A Root Capture Plan TODO Note

- DONE: Added `corepack pnpm run plan:roll20-root-capture -- <run-dir> [fixture-id]` to generate a local-only handoff plan for missing trusted DPR-corrected full-root evidence.
- VERIFIED: current fixture-A plan reports generated screenshots/diffs `6/6`, trusted full-root `2/3`, renderer action `HOLD_PRODUCTION_RENDERER_PATCH`, rendererReady `NO`, and fixture-A missing `roll20-root-dpr-complete-manifest.json`, `roll20-sandbox-root-full-dpr-corrected.png`, and sidecar JSON.
- CURRENT: the plan uses fixture-B/fixture-C trusted manifests as examples and lists fixture-A diagnostic-only captures plus post-capture stitch/audit/diff/renderer-ready commands.
- STILL TODO: run the actual Roll20 DPR-corrected sheet-root capture for fixture-A and rerun the generated plan/gates until trusted full-root reaches `3/3`.

## 2026-06-19 Root Capture Plan Linkage TODO Note

- DONE: `status:roll20-actual`, `gate:roll20-renderer-action`, and `handoff:roll20-upload` now point directly to `corepack pnpm run plan:roll20-root-capture -- <run-dir> [fixture-id]` when trusted full-root evidence is missing.
- VERIFIED: current `2026-06-18-state-map-v1` reports the fixture-A plan command in status next action, renderer gate next actions, and upload handoff markdown.
- CURRENT: this reduces handoff ambiguity; `generatedActualScreenshots=6/6` still does not mean rendererReady because trusted full-root remains `2/3`.
- STILL TODO: perform the actual fixture-A DPR-corrected full-root capture and rerun the linked gates until rendererReady can pass.

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
- VERIFIED: Current run reports `fixture-B` as the only foreground-pixel suspect: dark `0%`, edge `0%`, non-white `5.15%`, PNG `1x1`. The next action now points directly to `corepack pnpm run plan:roll20-chat-capture -- reports\roll20-actual-compare\2026-06-18-state-map-v1`.
- CLAIM BOUNDARY: This improves evidence handoff and prevents CSS tuning from contaminated chat pixels. It does not recapture Roll20 and does not prove chat visual parity.

## 2026-06-21 Current Status and ETA TODO Note

- DONE: Added `docs/qa/38_current_project_status.md` as the compact handoff snapshot for current evidence, claim boundaries, and realistic ETA.
- VERIFIED: Current status snapshot is based on rerunning `status:roll20-actual`, `gate:roll20-renderer-action`, and `smoke:preview-edit-visual` against the active `2026-06-18-state-map-v1` run.
- CURRENT: local preview/edit is good enough for continued edit UX work on the active fixtures, but actual Roll20 chat/rolltemplate capture remains blocked/incomplete (`generatedActualScreenshots=4/6`, `chatNeedsNormalizedCapture=2`, `rendererReady=NO`).
- STILL TODO: finish trustworthy fixture-A/fixture-C Roll20 chat captures or a verified foreground chat capture adapter before any production renderer promotion.
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
- VERIFIED: `node --check scripts\roll20_chat_cdp_capture.mjs`, `node --check scripts\roll20_chat_current_handoff.mjs`, `corepack pnpm run test:roll20-chat-cdp-readiness`, `corepack pnpm run test:roll20-chat-capture-plan`, plan-only runs for `fixture-A` and `fixture-c-commission-1bu`, and `corepack pnpm run handoff:roll20-chat-current -- reports\roll20-actual-compare\2026-06-18-state-map-v1` passed.
- CURRENT: `preflight:roll20-cdp` still reports `CDP_CLOSED`; no new Roll20 chat PNG or sidecar evidence was captured. Current actual status remains `generatedActualScreenshots=4/6`, `chatNeedsNormalizedCapture=2`, and `rendererReady=NO`.
- STILL TODO: open a CDP-enabled Roll20 Sandbox/test-room tab, run the printed sheet-frame probe until it writes `VISIBLE_MATCH`, then run the printed capture command for fixture-A and fixture-C.
- CLAIM BOUNDARY: This is capture-handoff tooling only. It does not prove Roll20 chat parity and does not justify production renderer CSS.

## 2026-07-12 CDP Preflight Probe Ordering TODO Note

- DONE: `preflight:roll20-cdp` now prints the exact `probe:roll20-sheet-frame` commands before the `capture:roll20-chat-cdp` commands for all planned fixtures and for a single `--fixture` filter.
- VERIFIED: `node --check scripts\roll20_cdp_preflight.mjs`, `corepack pnpm run preflight:roll20-cdp -- --run-dir reports\roll20-actual-compare\2026-06-18-state-map-v1`, and the same preflight with `--fixture fixture-c-commission-1bu` passed.
- CURRENT: CDP remains closed in the current environment, so this does not capture or validate new Roll20 screenshots. It only makes the next live capture sequence harder to run out of order.
- STILL TODO: launch or attach a CDP-enabled Roll20 Sandbox/test-room tab, rerun preflight until it is not `CDP_CLOSED`, then follow probe -> capture for fixture-A/fixture-C.
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
- CURRENT: This prevents false readiness or misleading target counts, but it does not capture new Roll20 screenshots. The next real verification step is still to navigate the CDP browser to the dedicated Sandbox/test room, run sheet-frame probe, then capture fixture-A/fixture-C chat evidence.
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
- OBSERVED: Full sheet-frame probes for fixture-A and fixture-C both return `NOT_PROVEN` with `sheetHitCount=0`, `rootCount=0`, `attrCount=0`, and `rollButtonCount=0`.
- DONE: `probe:roll20-sheet-frame --dry-run` now runs a lightweight non-writing frame probe when the URL is capture-ready, so it prints `probeStatus=NOT_PROVEN` and the best-frame counts before any evidence is saved.
- DONE: `capture:roll20-chat-cdp --dry-run` now prints an explicit next action when the editor URL is open but no character-sheet iframe is present.
- VERIFIED: Current fixture-A dry-runs show `probeStatus=NOT_PROVEN` and `next=Open the intended character sheet iframe/tab or apply the generated fixture before saving DOM evidence.`
- CURRENT: The next real action is still to open/load the intended generated custom sheet in the dedicated Sandbox/test room; URL readiness alone is not enough.
- CLAIM BOUNDARY: This improves blocker visibility only. No Roll20 screenshot or chat evidence was captured.

## 2026-07-13 Chat Renderer Target Plan Run-Dir Safety TODO Note

- DONE: `plan:roll20-chat-renderer-targets` now builds every generated next-command from the run directory passed to the script instead of hardcoding the old `reports\roll20-actual-compare\2026-06-18-state-map-v1` path.
- ROOT CAUSE: The targeted renderer plan correctly identified split chat renderer axes, but its Markdown handoff commands could send the next agent back to stale evidence when a newer actual Roll20 run directory is used.
- VERIFIED: `node --check scripts\roll20_chat_targeted_renderer_plan.mjs`, `corepack pnpm run test:roll20-chat-renderer-targets`, `corepack pnpm run plan:roll20-chat-renderer-targets -- reports\roll20-actual-compare\2026-06-18-state-map-v1`, `git diff --check`, `corepack pnpm run lint`, `corepack pnpm run build`, and `corepack pnpm run guard:ui-copy` passed.
- CURRENT: Actual Roll20 chat structure is matched, but renderer action remains `HOLD_PRODUCTION_RENDERER_PATCH`; fixture-A and fixture-C still need template-scoped width/text/intrinsic modeling plus asset relink before any CSS promotion.
- CLAIM BOUNDARY: This is handoff/gate safety only. It does not prove Roll20 chat visual parity and does not change product renderer CSS.

## 2026-07-13 Chat Template Scope Gate TODO Note

- DONE: Added `corepack pnpm run gate:roll20-chat-template-scope -- <run-dir>` to turn the targeted renderer plan and width-reconciliation evidence into an explicit template-scope gate.
- DONE: Wired the new gate into `gate:roll20-renderer-action` and `diagnose:roll20-chat-refresh`, so the top-level renderer gate now surfaces the template-scope blocker after refresh.
- CURRENT RESULT: The active run reports `HOLD_GLOBAL_CHAT_RENDERER_PATCH` with 4 blockers: high-mismatch fixtures need split models (`MESSAGE_CONTENT_TEXT_METRICS` vs `TABLE_INTRINSIC_SANITIZE_FONT`), split scopes (`.sheet-rolltemplate-aw` vs `.sheet-rolltemplate-coc`), and current best candidates are not promotion-ready.
- CURRENT NEXT: fixture-A needs a `.sheet-rolltemplate-aw` scoped message/content width plus exact text-metric candidate; fixture-C needs a `.sheet-rolltemplate-coc` scoped table intrinsic/sanitize/font-context candidate. Do not widen global ChatPane CSS.
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
- VERIFIED: Live `plan:roll20-asset-relink` now returns `RELINK_MAP_REQUIRED`, fixture-A/fixture-C `MISSING_RELINK`, and writes fallback template output under `..\_tmp_codex_smoke\asset-relink-verification-plan-2026-06-18-state-map-v1-1783929958954`.
- VERIFIED: Live `plan:roll20-chat-browser-paint` now returns `BROWSER_PAINT_BLOCKED_BY_RELINK`, with fixture-A/fixture-C blocked by `BLOCKED_BY_ASSET_RELINK` and fixture-B secondary because current evidence has no chat background image.
- CURRENT: The active P0 visual-parity blocker is not another broad ChatPane CSS patch. fixture-A/fixture-C need user-owned HTTP(S) replacement URLs in the local-only asset map, followed by local preview/edit/export and Roll20 Sandbox recomparison.
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
- OBSERVED: `plan:roll20-asset-relink` still reports `RELINK_MAP_REQUIRED`; fixture-A/fixture-C are `MISSING_RELINK` because no user-owned HTTP(S) replacements are supplied yet.
- DONE: Added direct self-test coverage for `scripts/lib/assetReplacements.mjs`, the parser used by local actual-baseline/preupload tooling.
- DONE: `test:asset-replacements` now runs both the app-side TypeScript parser test and the script-side parser test, preventing preview/edit/export UI behavior from silently drifting away from local verification scripts.
- STILL TODO: Fill a local ignored asset replacement map with user-owned HTTP(S) URLs, rerun `plan:roll20-asset-relink --map-file`, then rerun local preview/edit/export and Roll20 Sandbox/test-room comparison. Keep all maps, screenshots, generated reports, and real sheet evidence ignored.
- CLAIM BOUNDARY: Verification-path consistency only. No asset was relinked, no generated sheet was uploaded to Roll20, no product renderer CSS changed, and visual parity is still unproven.

## 2026-07-13 Preupload Asset Map Readiness TODO Note

- DONE: Added script-side readiness counts for active asset replacement maps: Roll20-ready targets, local-only targets, and placeholders.
- DONE: Local baseline reports now include readiness counts but still allow `data:` or relative replacements for local preview/edit plumbing tests.
- DONE: Preupload verification now stops early when an asset map contains local-only or placeholder targets, so `data:`/relative replacements cannot be mistaken for Roll20 Sandbox upload readiness.
- DONE: Preupload verification now falls back to ignored `..\_tmp_codex_smoke` output when the canonical actual-run report folder is locked and no explicit `--report-out-dir` was supplied.
- STILL TODO: Supply user-owned HTTP(S) replacement URLs for fixture-A/fixture-C before rerunning preupload and Roll20 Sandbox/test-room comparison.
- CLAIM BOUNDARY: Upload-readiness safety only. No real asset was relinked, no Roll20 upload happened, no renderer CSS changed, and visual parity remains unproven.

## 2026-07-13 Import/Export Asset Copy Polish TODO Note

- DONE: Replaced mixed English asset labels in the import/export UI with Korean-first labels: `Roll20 프록시`, `Imgur 페이지`, `placeholder 위험`, `데이터 URL`, `HTTPS/직링크 후보`, and `placeholder 대상`.
- DONE: Localized app-side asset replacement parser warnings that appear in the export dialog, including placeholder and unsafe target warnings.
- DONE: Extended `guard:ui-copy` so these product UI paths fail if the old mixed labels return.
- VERIFIED: `corepack pnpm run guard:ui-copy`, `corepack pnpm run test:asset-refs`, `corepack pnpm run test:asset-replacements`, `corepack pnpm run build`, `corepack pnpm run smoke:export-dialog -- --report-dir ..\_tmp_codex_smoke\export-dialog-copy-polish-20260713-r2 --port 4390`, `corepack pnpm run lint`, `git diff --check`, and `corepack pnpm run check:server-hygiene` passed.
- CURRENT: This improves user-facing clarity around asset relink/upload readiness. It does not change the active actual-Roll20 blocker: fixture-A/fixture-C still need user-owned HTTP(S) replacement URLs and fresh Sandbox/test-room comparison.
- CLAIM BOUNDARY: Wording/guard coverage only. No asset was relinked, no Roll20 upload happened, no product renderer CSS changed, and visual parity remains unproven.

## 2026-07-13 Roll20 Sandbox Diagnostic Copy Polish TODO Note

- DONE: Export dialog Sandbox diagnostic rows now use Korean-first labels for rewrite details: `선택자 보정`, `클래스 보정`, `태그 제거`, `프록시 처리`, and `제거`.
- DONE: `smoke:export-dialog` now fails if visible Sandbox diagnostic rows contain `selector prefix`, `class prefix`, `proxy`, or `drop`.
- VERIFIED: `corepack pnpm run guard:ui-copy`, `node --check scripts\export_dialog_browser_smoke.mjs`, `corepack pnpm run build`, `corepack pnpm run smoke:export-dialog -- --report-dir ..\_tmp_codex_smoke\export-dialog-sandbox-copy-20260713-r1 --port 4391`, `corepack pnpm run lint`, `git diff --check`, and `corepack pnpm run check:server-hygiene` passed.
- CURRENT: This reduces visible implementation jargon in the upload-readiness UI. It does not alter actual Roll20 render behavior or unblock renderer readiness.
- CLAIM BOUNDARY: UI copy and smoke coverage only. No asset relink, Roll20 upload, renderer CSS promotion, or visual parity proof happened.

## 2026-07-15 Two-Host Agent Execution TODO Note

- DONE: Replaced the stale 3-Codex allocation with the actual capacity: Windows Codex lead, one MacBook Codex worker, and two Claude Code workers.
- DONE: Added OS-specific setup and copy-paste prompts in `docs/operations/39_two_host_agent_prompts.md`.
- DONE: Assigned non-overlapping ownership: lead/render integration, edit UX, universal mapping/legacy, and CI/security.
- DONE: Every non-lead worker now has a separate branch, worktree/clone rule, acceptance checks, commit/push requirement, and exact handoff contract.
- TODO: Start the three external worker sessions and collect their branch names and commit hashes for lead review.
- TODO: Cherry-pick only after full diff review and rerun combined renderer/edit/mapping/security verification on the integration branch.
- CLAIM BOUNDARY: This completes executable multi-agent coordination only. It does not itself change Roll20 rendering, mapping fidelity, edit UX, or renderer readiness.
## 2026-07-17 Canonical Render Surface and Width Policy

- DONE: The visible preview and edit canvas use one persistent iframe render surface; edit chrome and overlays remain parent-owned.
- DONE: New sheets restore the default canvas width of `850px`. Automatic sizing uses measured descendant paint bounds and may shrink or grow within a bounded range; explicit width input locks the chosen width until reset.
- VERIFIED SYNTHETIC: Modern and legacy persistent-surface smoke passed independently, including a large synthetic input. Iframe reload count remained `0`, browser/page errors remained `0`, and optimistic placement stayed within the configured budget.
- VERIFIED SYNTHETIC: The imported-edit smoke now exercises the canonical iframe locator path. A synthetic object moved in edit mode retained matching coordinates after returning to preview, and emitted HTML was non-empty.
- VERIFY: Actual Roll20 screenshot parity, user-provided import corpus coverage, legacy dedicated-room behavior, and worker/roll-template coverage remain separate verification gates. No source-identifying evidence is retained in this update.

### Next Gates

- TODO: Run modern and legacy actual-runtime checks using only user-provided local imports and ignored evidence; keep source identities and collected payload details out of tracked docs.
- TODO: Expand canonical iframe interaction coverage to flow-aware before/inside/after insertion and layer-panel operations.
- TODO: Keep CI/CD deployment verification separate from local implementation proof.
## 2026-07-17 Canonical Iframe Visual/Interaction Verification

- DONE: `preview_edit_visual_smoke.mjs` now captures the persistent iframe in both preview and edit modes. It no longer waits for the retired Shadow Canvas host.
- VERIFIED LOCAL: Modern and legacy preview/edit visual smoke passed for the available ignored local corpus. Pixel diff was exact, sampled computed styles and visible geometry matched, and translation checks passed.
- VERIFIED LOCAL: Canonical imported-edit smoke passed for the available ignored local corpus. A real imported block moved through iframe pointer events, emitted HTML, live apply acknowledgement, and preview return without browser/page errors.
- VERIFIED LOCAL: Roll-button chat smoke passed for the fixture that exposes a roll control. Fixtures without a roll control remain `SKIP`, not dice-parity evidence.
- VERIFY: Actual Roll20 modern Sandbox and dedicated legacy-room screenshot parity remain open. Local exactness is not actual Roll20 parity.

### Next Gates

- TODO: Validate the generated export in the permitted modern Sandbox and dedicated legacy test room, keeping all source-derived evidence local and anonymous.
- TODO: Expand flow-aware layer-panel interaction checks beyond one moved block: before/inside/after, cycle rejection, and absolute-inside-container behavior.
- TODO: Keep imported mapping fidelity and worker/runtime behavior as separate gates from visual surface parity.

## 2026-07-17 Privacy-Safe Performance Reporting

- DONE: Performance budget output is forced to anonymous labels and a generic local source name; absolute source paths and imported identifiers are omitted.
- DONE: CI now runs the privacy invariant self-test.
- VERIFIED: `corepack pnpm run lint` and `corepack pnpm run ci:verify` passed.
- VERIFY: Structural edits still use the conservative full-root replacement path; keyed structural apply and mounted latency proof remain P0.
- VERIFY: Actual Roll20 modern/legacy comparison, broad user-import coverage, and worker runtime behavior remain unverified.

## 2026-07-17 Structural Apply Optimization

- DONE: Persistent iframe structural updates use keyed block-node reuse before the conservative full-root fallback.
- DONE: Runtime counters and bundle assertions distinguish keyed patches from full replacements.
- VERIFIED SYNTHETIC: Modern/legacy persistent preview smoke, edit-flow smoke, `ci:verify`, and server hygiene passed.
- VERIFY: Measure frame/commit latency on a broad anonymous user-import corpus without retaining source identity or source-derived evidence.
- VERIFY: Actual Roll20 modern Sandbox and dedicated legacy-room visual parity remain open.

## 2026-07-17 Canonical Edit Flow Smoke and Cycle Guard

- DONE: Replaced the stale Shadow Canvas edit-flow browser smoke with a synthetic-only persistent-iframe smoke. It now verifies flow/free placement, canvas widget drop, layer reorder, cycle rejection, selection sync, and editable canvas width.
- DONE: Added a layer-tree cycle invariant to the UI drop path and Blockly nesting adapter. An ancestor cannot be inserted into its own descendant through either the layer panel or the iframe path.
- VERIFIED LOCAL: `node scripts/edit_flow_browser_smoke.mjs --out-dir ./out --base-path /roll20-block-editor --report-dir .tmp/edit-flow-current-iframe3 --port 4432` passed with zero console/page errors and all three layer drop zones observed.
- VERIFIED LOCAL: `corepack pnpm run test:layer-roles` and `corepack pnpm run lint` passed.
- VERIFY: Actual Roll20 modern Sandbox and dedicated legacy-room parity, broad user-import coverage, and worker runtime coverage remain open. This batch records no external source identity or derived payload.
## 2026-07-17 Current Verification Board

- DONE: Common preview/edit render surface uses one persistent iframe and preserves the Roll20 dialog selector context in the iframe baseline.
- DONE: Immediate edit feedback uses a transient transform; authored HTML/CSS is committed after drop and the transform is cleared on acknowledgement or rollback.
- DONE: Flow-aware nesting, absolute-inside-container placement, root escape, layer drop targets, cycle rejection, widget insertion, worker mutation, and rolltemplate/chat smoke paths are covered by local synthetic checks.
- DONE: Modern and legacy local contracts pass the persistent preview, edit-flow, visual, bundle, lint, build, and `ci:verify` gates.
- VERIFY: Run the permitted modern actual runtime check with the user-provided import in an ignored local evidence directory.
- VERIFY: Run the permitted legacy actual runtime check in the separate legacy destination; do not use the modern Sandbox as legacy evidence.
- VERIFY: Expand the anonymous import corpus and keep broad mapping fidelity, source-specific worker behavior, and actual visual parity as separate claims.
- VERIFY: Keep deployment status and GitHub Pages freshness as a separate CI/CD gate from local renderer verification.

### Actual Roll20 Retry Status

- VERIFY/BLOCKED TOOLING: The dedicated modern Sandbox page was reachable, but the current Chrome automation path could not select local files through Roll20's native file inputs.
- VERIFIED: File inputs remained empty and no sheet iframe was created after the retry. This is not actual Roll20 parity evidence.
- TODO: Repeat the upload through a user-visible native picker or another approved upload path, then record only anonymous PASS/FAIL state in this board.

## 2026-07-17 Canonical Edit Surface Follow-up

- DONE: New friendly widgets now use deterministic sheet coordinates from the upper-left safe area instead of measuring the visible viewport on every insertion. This keeps the default `850px` canvas contract and avoids the first object appearing around the visual center.
- DONE: The Figma-style edit layer panel is now HTML-structure-only. CSS and translation remain in their dedicated workspaces instead of appearing as non-rendered layer targets.
- DONE: Intrinsic iframe measurement ignores fixed/sticky descendants and non-finite geometry so dialog controls cannot feed an unbounded height loop back into the preview surface.
- VERIFIED LOCAL: `corepack pnpm run test:build-doc-bundle`, `corepack pnpm run test:iframe-drop-target`, `corepack pnpm run lint`, `corepack pnpm run build`, `corepack pnpm run ci:verify`, `corepack pnpm run check:server-hygiene`, and `git diff --check` passed.
- PARTIAL LOCAL: canonical edit-flow and persistent modern/legacy iframe smoke passed. Preview/edit visual smoke had two passing comparisons and one mismatch with zero browser errors; the mismatch remains a visual investigation item.
- VERIFY: Actual Roll20 modern Sandbox, dedicated legacy-room behavior, broad user imports, and worker/roll-template parity remain open. No third-party source identity or source-derived evidence is recorded here.

## 2026-07-17 Height Contract and Roll20 Upload Retry

- DONE: The iframe resize handler now accepts real sub-8px content growth. The previous threshold could leave the host a few pixels shorter than the sheet and clip the final rows.
- VERIFIED LOCAL: Preview/edit visual smoke passed for all three available anonymous local comparisons with exact pixels, matching geometry/styles, translation checks, and zero browser/page errors.
- VERIFIED LOCAL: Persistent modern/legacy iframe smoke, edit-flow smoke, `ci:verify`, production build, lint, and server hygiene passed. No project dev/smoke listeners remain.
- VERIFY: The authenticated dedicated modern Sandbox remains reachable, but both the supported Playwright file chooser and the user-visible native-picker attempt were rejected by the current browser automation boundary. No sheet iframe was created, so actual Roll20 parity is still unverified.
- VERIFY: Dedicated legacy-room behavior, broad user imports, and worker/roll-template parity remain separate gates.
- DONE: CI now runs on `main`, `dev`, and `codex/**` pushes; GitHub Pages deployment remains restricted to `main`.
- VERIFIED REMOTE: Actions run `29577253344` passed on `codex/iframe-structural-patch` with `ci:verify`, lint, and build all green.

## 2026-07-17 Post-Update Stability Recheck

- VERIFIED LOCAL: After the desktop update, `ci:verify` passed, including modern/legacy render-mode smoke, iframe edit bridge/drop target/layer-role tests, privacy guards, upload-snippet self-test, and chat-template scope checks.
- VERIFIED LOCAL: Preview/edit visual smoke passed for both compatibility modes across the available anonymous local fixtures: pixel mismatch `0`, translation checks passed, and no browser/page errors were reported.
- VERIFIED LOCAL: Persistent preview surface reported `loads=0` for modern and legacy; edit-flow smoke passed.
- BLOCKED TOOLING: Three standalone local audit commands still hit Windows `EPERM` while reusing old ignored report/build directories. This is an evidence-folder/process cleanup issue, not a renderer PASS; rerun them in a fresh short-path local evidence root before using their reports.
- VERIFY: Actual modern Sandbox render, dedicated legacy-room render, broad user imports, and worker/roll-template parity remain open.

## 2026-07-17 Local Payload Audit Recovery

- DONE: Standalone local Roll20 audits now use short user Temp output by default when old ignored folders are locked; explicit `--report-dir` and sandbox `--build-dir` remain supported.
- DONE: Local baseline edit capture now targets the canonical persistent iframe instead of the retired Shadow Canvas selector.
- VERIFIED LOCAL: Fresh anonymous local baseline completed `3/3 PASS`; each fixture produced preview/edit captures and a Roll20 payload ZIP.
- VERIFIED LOCAL: Fresh payload audit completed `3/3 PASS`; upload HTML had no internal editor IDs or app markers, translations were valid JSON, and required ZIP files matched the payload folder.
- VERIFIED LOCAL: `test:roll20-sandbox-sanitize`, `test:translation-payload`, and `test:export-smoke` passed.
- STALE EVIDENCE: The earlier ignored baseline predates the current export cleanup and still fails its old payload audit. It was not overwritten and is not current product evidence.
- VERIFY: Actual modern Sandbox upload/render, dedicated legacy-room render, broad imports, and worker/roll-template parity remain open. Browser upload inputs were still empty in the latest attempt.

## 2026-07-17 Universal Structural Import Follow-up

- DONE: Added generic editable blocks for nested `label` controls and `ul`/`ol`/`li` list structure. The importer now preserves association attributes, class/style fields, child order, and nested input/display blocks instead of treating these structures as opaque raw HTML.
- VERIFIED LOCAL: Import unit suite passes `22/22`, including nested label and list cases; lint remains green.
- VERIFIED LOCAL: An anonymous local corpus rerun confirms the new structural matcher is active across the prepared inputs. Exact source-derived measurements remain local-only and are not recorded here.
- CLAIM BOUNDARY: This improves universal mapping coverage for these DOM shapes; it does not establish all-sheet import fidelity, actual Roll20 parity, or worker/runtime completeness.
- NEXT P0: Continue generic HTML/CSS/i18n/worker coverage and retry modern Sandbox upload only through an approved user-visible upload path. Legacy remains a separate dedicated-room gate.

## 2026-07-17 Structural Import CI Confirmation

- VERIFIED REMOTE: Push CI run `29579712566` passed safety/unit verification, lint, and production build for the structural import batch.
- CLAIM BOUNDARY: CI confirms code integrity only; it does not convert the blocked actual Roll20 Sandbox upload into visual-parity evidence.

## 2026-07-17 Repeating Section Visibility Fix

- FIXED: Removed the app runtime rule that hid every `fieldset.repeating_*` from the sheet render. Repeating sections now remain visible for both modern and legacy local render contracts; Roll20-style runtime controls remain a separate runtime concern.
- VERIFIED LOCAL: Runtime contract regression test passed, full `ci:verify` passed, production build passed, server hygiene passed, and preview/edit visual smoke passed for both compatibility modes across the anonymous local comparison set with zero pixel mismatch and zero browser/page errors.
- CLAIM BOUNDARY: This fixes one generic visibility regression. It does not prove actual Roll20 Sandbox/legacy-room parity or complete worker/rolltemplate runtime behavior.
- NEXT P0: Resume actual modern Sandbox upload through an approved browser file path; then verify legacy in its dedicated legacy-enabled room.
## 2026-07-18 Roll20 Sandbox Upload Retry

- VERIFIED TOOLING: The logged-in Roll20 editor and dedicated Sandbox Tools surface were reachable. The three expected HTML/CSS/translation file inputs were present and empty before upload.
- BLOCKED UPLOAD: The supported browser file-chooser path rejected both the workspace payload path and an equivalent `C:\tmp` copy with a browser-policy `Not allowed` response. No file was attached and no Sandbox sheet iframe was created.
- CLAIM BOUNDARY: This is a tooling boundary, not a Roll20 render failure and not parity evidence. No Roll20 room settings or sheet source were modified.
- NEXT P0: Use a user-visible native picker handoff or another explicitly supported upload path, then capture only anonymous modern PASS/FAIL state. Keep legacy validation in its separate legacy-enabled destination.

## 2026-07-18 Post-Update Browser Stability Recheck

- VERIFIED TOOLING: After the desktop update, the logged-in Roll20 campaign/editor tab responded normally again. The Sandbox Tools dialog and the three expected HTML/CSS/translation controls were readable.
- VERIFIED OBSERVATION: Opening the pre-existing verification character showed a sheet unrelated to the current local payload. This confirms that the existing room state must not be treated as same-payload evidence.
- BLOCKED UPLOAD: A fresh supported file-chooser attempt reached the chooser but `fileChooser.setFiles` was rejected with browser-policy `Not allowed`. No file was attached and no Roll20 room or sheet settings were changed.
- CLAIM BOUNDARY: The Codex desktop crash did not reproduce in this browser retry. The upload failure is an automation capability boundary, not proof of a renderer failure and not Roll20 visual-parity evidence.
- NEXT P0: Obtain a user-visible native-picker handoff or another approved upload path for the modern Sandbox, then run the same-payload screenshot check. Keep legacy validation in its separate legacy-enabled destination.

## 2026-07-17 Drop Commit Emit Flush

- DONE: Committed iframe drops and friendly-widget inserts now flush the current Blockly emit immediately. Pointer-move updates remain debounced, so the editor does not emit a full sheet on every drag frame while the dropped result does not wait for the normal debounce window.
- DONE: A flush invalidates the pending debounce callback, preventing a redundant second emit for the same commit.
- VERIFIED SYNTHETIC: Modern and legacy persistent-surface smoke with `6000` synthetic blocks passed in an isolated local evidence path. Optimistic placement was `33ms` modern / `26.4ms` legacy, flow acknowledgement was `149.2ms` / `143.1ms`, style-only acknowledgement was about `43ms`, structural patch fallbacks were `0`, iframe reloads were `0`, and console/page errors were `0`.
- CLAIM BOUNDARY: These are anonymous synthetic local interaction measurements. They do not prove actual Roll20 visual parity, all-sheet performance, or worker runtime parity.
- NEXT P0: Repeat the same latency gate on a broader anonymous imported corpus and complete the permitted modern Sandbox plus dedicated legacy-room checks.

## 2026-07-17 Preserved Attribute Metadata Contract

- DONE: Matched generic blocks now retain safe, previously unmapped HTML attributes in hidden Blockly metadata and re-emit them without replacing generator-owned attributes.
- DONE: Event-handler attributes, `srcdoc`, and the internal `data-r20-block-id` are excluded from the preserved metadata path.
- VERIFIED LOCAL: Import structure tests `25/25`, preserved-attribute unit test, `ci:verify`, lint, production build, `git diff --check`, and server-hygiene check passed.
- CLAIM BOUNDARY: This closes one generic importer/emitter loss path. It does not prove all attributes, all-sheet mapping, actual Roll20 visual parity, worker runtime parity, or rolltemplate/chat parity.
- NEXT P0: Retry the modern Custom Sheet Sandbox upload through an explicitly permitted browser file-upload path; validate legacy separately in a legacy-enabled test room.

## 2026-07-18 Persistent Iframe Apply Race Fix

- DONE: The persistent iframe apply effect no longer treats an in-flight source as permanently satisfied. If iframe load interrupts the first `postMessage`, the `onLoad`-triggered effect can resend the current source after the bridge is ready.
- DONE: Large live patches use a bounded chunk transport above `300KB`; the iframe validates revision, chunk count, HTML length, style keys, and completion before applying one structural patch. Small patches retain the normal message path.
- VERIFIED LOCAL: Fresh production build passed. Persistent preview surface passed in modern and legacy synthetic modes with `10,000` synthetic nodes, `loads=0`, zero console/page errors, worker replacement, rolltemplate chat, flow/free placement, and widget insertion.
- VERIFIED LOCAL: Fresh ignored local baseline for the anonymous `fixture-A` path passed after importing `7,290` blocks, with emitted HTML `620,409` bytes and upload ZIP `47,395` bytes. The harness now waits for the actual iframe DOM and rejects the old placeholder-only false PASS path; preview/edit capture completed without claiming actual Roll20 pixel parity.
- VERIFIED LOCAL: `test:build-doc-bundle`, script syntax checks, and `git diff --check` passed. Generated screenshots, payloads, fixtures, and reports remain outside Git in ignored Temp storage.
- VERIFIED REMOTE: GitHub Actions CI run `29610986192` passed safety/unit verification, lint, and production build for commit `7ec25e8`.
- CLAIM BOUNDARY: This closes a generic persistent-iframe delivery race and strengthens local evidence. It does not prove all-sheet mapping, actual Roll20 pixel parity, complete worker JS block coding, or universal asset parity.
- NEXT P0: Rerun the anonymous modern/legacy visual comparison set and classify remaining differences by wrapper/context, assets/fonts, state, translation, worker, rolltemplate, viewport, and edit overlay. Keep the dedicated legacy-room and modern Sandbox gates separate.
## 2026-07-18 Canonical Iframe Recheck

- VERIFIED LOCAL: The active edit route is the same persistent Roll20 iframe used by preview; the edit layer panel and selection/drop overlays are outside that render surface.
- VERIFIED LOCAL: Imported edit-sync smoke passed for one anonymous local fixture. The moved block kept matching coordinates in edit and preview, with no browser/page errors.
- VERIFIED LOCAL: Preview/edit visual smoke passed for the three available anonymous local inputs in both modern and legacy compatibility modes with zero measured pixel mismatch and zero browser/page errors.
- CLAIM BOUNDARY: These are local renderer and interaction checks. They do not prove that the same exported payload matches an actual Roll20 Sandbox or dedicated legacy-room screenshot.
- VERIFY: The unused legacy Shadow Canvas implementation remains in source for a separate cleanup batch; it is not mounted by the active editor route. Do not use it as evidence for the current edit surface.
- NEXT P0: Complete an approved modern Sandbox upload/render check, then repeat the same evidence flow in the separate legacy-enabled destination. Keep third-party sources and generated evidence local-only.
## 2026-07-18 Autosave Render-Context Preservation

- DONE: Autosave now stores and restores the selected document language together with workspace XML and asset-replacement settings. This keeps `:lang()` selectors and fallback-font metrics stable after recovery.
- DONE: Preview-store language changes now trigger the existing autosave debounce instead of waiting for an unrelated Blockly edit.
- VERIFIED LOCAL: `ci:verify`, lint, production build, `git diff --check`, and server hygiene passed.
- VERIFIED LOCAL: The combined autosave payload contains a bounded CDATA document-language field and remains backward-compatible when older records omit it.
- FRESH SMOKE NOTE: The local modern/legacy fixture smoke is not a parity gate between the two modes. One prepared input had stable transition geometry; two had expected external-font proxy failures and mode-specific width drift. No CSS correction was promoted from that comparison.
- NEXT P0: Continue same-payload Roll20 verification independently for modern Sandbox and legacy-enabled room, then expand anonymous generic import/worker/rolltemplate coverage.
## 2026-07-18 Preview Focus And App Chrome Batch

- DONE: Preview mode now uses a sheet-focused layout: left/right editor panels and the bottom status bar are not mounted, while the persistent Roll20 iframe remains mounted.
- DONE: Edit mode continues to use the same persistent iframe and edit-only overlay/layer surface; no second sheet renderer was introduced.
- DONE: Replaced the product header repository link with a bug-report mail action using `mailto:sjh11235678@gmail.com`.
- DONE: Added an original light-pink/pastel application chrome layer. It is scoped to `.app-shell.pastel`; imported sheet CSS remains inside the iframe render contract.
- DONE: Updated the persistent browser smoke to assert preview focus, no GitHub link, mailto contact, modern/legacy behavior, local rolltemplate chat in split mode, and same-iframe edit state.
- VERIFIED LOCAL: `corepack pnpm run lint`, `corepack pnpm run build`, `corepack pnpm run ci:verify`, `corepack pnpm run smoke:persistent-preview-surface`, and `corepack pnpm run smoke:edit-flow` passed. The persistent smoke passed modern and legacy with no console/page errors; edit-flow passed with no console/page errors.
- VERIFY: `corepack pnpm run smoke:preview-edit-visual -- --compatibility-mode both` still reports one anonymous fixture with a modern-only `9.21%` local preview/edit mismatch while its legacy run is exact. This is renderer evidence, not app-chrome evidence, and does not prove Roll20 parity.
- TODO: Use the Claude design branch to refine the pastel information architecture, plain Korean copy, icon/tooltips, and synthetic action previews without changing the canonical renderer contract.
- TODO: Continue actual modern Sandbox and dedicated legacy-room screenshot comparison after the browser upload boundary is available.

## 2026-07-18 Product Goal Reset

- DONE: Reframed the project around one canonical product goal: user-imported or user-authored Roll20 sheets must render as the same sheet in preview and edit, with separate modern and legacy contracts and no public copyrighted samples.
- DONE: Added `docs/operations/41_product_reset_and_short_term_goals.md` as the short-term control plane, with evidence maturity levels, P0/P1 goals, ownership, and acceptance gates.
- DONE: Added `docs/operations/42_claude_design_reset_handoff.md` for a separate Claude design branch and `docs/operations/43_agent_context_pack.md` for token-efficient first reads.
- DONE: Added a repository-local `agent/skills/roll20-product-reset/SKILL.md` for bounded, evidence-based reset work.
- VERIFY: Current implementation remains partial. The shared iframe/local render path, modern activation, generic mapping guards, and CI are evidenced; actual modern/legacy visual parity, all-sheet mapping, worker runtime parity, and complete Figma-like editing are not proven.
- TODO: Create the isolated Claude design worktree and implement the first user-journey redesign batch.
- TODO: Run the preview-focus UI smoke after the design branch is reviewed; keep the canonical renderer contract unchanged during the design pass.
- TODO: Inventory parent-folder legacy/experiment references before any physical folder move.
- DONE: Added `docs/operations/44_workspace_cleanup_inventory.md`; physical parent-folder moves remain intentionally HOLD until references and worktrees are checked.
- BLOCKED: Actual generated-sheet upload parity remains blocked by the browser file-input boundary recorded in `docs/operations/37_roll20_actual_verification.md`.
- TODO: Redesign the surrounding app UI with an original light-pink/pastel visual system; Roll20-compatible styling remains confined to the imported sheet render.
- TODO: Replace the product-header GitHub/source shortcut with `mailto:sjh11235678@gmail.com` and state clearly that autosave is local-browser only; do not add implied login/cloud sync.
- TODO: Audit user-facing Korean labels and add icon/tooltips plus synthetic previews for unfamiliar actions.
## 2026-07-18 Edit Sync Cross-Check

- VERIFIED LOCAL: With the production `out` build, `smoke:edit-flow` passed
  and `smoke:imported-edit-sync` passed for the ignored imported corpus plus
  the synthetic non-leaf flow case. These checks cover the iframe edit bridge,
  nested/flow insertion, free placement, emit acknowledgement, and preview
  synchronization without page or console errors.
- CLAIM BOUNDARY: The persistent-preview synthetic pointer smoke still times
  out at its parent drop-overlay wait. The passing edit-flow/imported-sync
  paths keep that failure scoped to the persistent harness observation path;
  they do not prove actual Roll20 parity.

## 2026-07-18 Iframe Drop Overlay Palette

- DONE: The canonical iframe edit overlay now uses rose for an `inside` drop
  target and teal for `before`/`after` placement, matching the pastel layer
  role palette used by the edit surface.
- VERIFIED LOCAL: `corepack pnpm run lint`, `corepack pnpm run build`,
  `node scripts/edit_flow_browser_smoke.mjs`,
  `node scripts/persistent_preview_surface_smoke.mjs`, `corepack pnpm run
  ci:verify`, and `corepack pnpm run check:server-hygiene` passed.
- CLAIM BOUNDARY: This changes only the editor's overlay affordance. It does
  not change imported Roll20 CSS, iframe cascade, sheet geometry, or actual
  modern Sandbox/legacy-room parity.

## 2026-07-18 Roll20 Parity Retry And Smoke Argument Guard

- DONE: Forwarded package-manager arguments are now normalized by the edit-flow
  and persistent-preview smoke scripts, so an extra `--` cannot redirect the
  harness to the wrong output directory.
- VERIFIED LOCAL: Both package commands passed with forwarded `--out-dir`,
  and the Roll20 CDP preflight recorded `CDP_CLOSED` without attempting an
  upload or room mutation.
- VERIFY: Modern Sandbox and dedicated legacy-room parity remain open because
  the logged-in Chrome Roll20 tab timed out during safe tab claiming.

## 2026-07-18 Renderer Gate Refresh

- VERIFIED DIAGNOSTIC: The current actual evidence remains
  `HOLD_PRODUCTION_RENDERER_PATCH`, with same-structure chat mismatch in `2/3`
  fixtures and a maximum aligned mismatch of `20.68%`.
- VERIFIED DIAGNOSTIC: fixture-A needs a `.sheet-rolltemplate-aw` message/content
  width model; CoC/fixture-C needs a `.sheet-rolltemplate-coc` sanitize/intrinsic
  table model. A single global ChatPane width, font, or padding patch is not
  safe across the three fixtures.
- VERIFIED DIAGNOSTIC: fixture-A and fixture-C still require user-owned HTTP(S) asset
  relinks before original-sheet parity can be judged. Current proxy bytes are
  placeholder assets, not a renderer CSS defect that can be guessed away.
- VERIFY: Actual modern Sandbox and dedicated legacy-room captures remain
  unproven. The in-app browser currently reaches Roll20 login, while the
  existing Chrome Roll20 tab cannot be safely claimed for inspection.

## 2026-07-18 Parallel Branch Contract Review

- REVIEWED: `origin/claude/edit-ui-fable-editor-system-20260715` contains a
  substantial modular editor redesign, but its `EditCanvas` mounts a separate
  Shadow render surface. That violates the active P0 requirement that edit be
  the canonical preview iframe plus overlays, so it is not safe to merge as-is.
- REVIEWED: `origin/codex/roll20-mapping-fidelity-smoke` and
  `origin/claude/roll20-legacy-verification` do not provide a small, isolated
  change that can be merged without replacing current renderer/evidence
  contracts. The current branch already contains the relevant large-sheet
  render and legacy-policy work.
- DECISION: Keep the branches separate. Reuse design ideas only after they are
  reimplemented against the existing persistent iframe contract.

## 2026-07-18 First-Run Import Entry

- DONE: The empty sheet surface now exposes both `빈 시트로 시작` and
  `파일 가져오기` actions, so a first-time user can choose the two primary
  entry paths without hunting through the header.
- DONE: The empty-state import action opens the existing ImportDialog through
  a small window event; no second import state or render surface was added.
- VERIFIED LOCAL: Fresh-sheet smoke opened and closed the import dialog,
  then passed blank-sheet, widget-gallery, edit-flow, and modern/legacy
  persistent-iframe checks. Lint, `ci:verify`, and server hygiene passed.
- CLAIM BOUNDARY: This closes a first-run UI affordance gap only. It does not
  prove actual Roll20 Sandbox/legacy-room parity or universal mapping.

## 2026-07-18 App Accent Token Consistency

- DONE: Editor-only selection, placement, focus, and widget-preview accents now
  use the surrounding app's `--primary` token instead of a hard-coded blue
  fallback. Imported Roll20 CSS and iframe baseline files were not changed.
- VERIFIED LOCAL: Production build, `smoke:edit-flow`,
  `smoke:persistent-preview-surface` in modern/legacy modes, lint, and
  `git diff --check` passed. Persistent iframe loads remained `0` in both
  compatibility modes.
- CLAIM BOUNDARY: This is an app-chrome design-token correction. It does not
  prove the full pastel information-architecture reset, actual Roll20 visual
  parity, or universal mapping.
- TODO: Continue the user-task UI reset with bounded copy/tooltip and synthetic
  action-preview work, without importing the separate Shadow-render design
  branch or changing the canonical iframe contract.

## 2026-07-18 User-Facing Workspace Labels

- DONE: Internal `i18n` and `worker` workspace keys remain unchanged, while the
  visible labels now read `번역` and `시트 동작`. Tooltips explain that the
  latter is Roll20 runtime code and never a visible sheet object.
- VERIFIED LOCAL: Export-dialog browser smoke, lint, and production build pass;
  the smoke now checks the intentional plain-language runtime boundary copy.
- CLAIM BOUNDARY: This improves navigation copy only. It does not implement
  worker JS block editing or prove actual Roll20 worker/runtime parity.

## 2026-07-18 Roll20 Room View Check

- VERIFIED OBSERVATION: The logged-in Chrome Roll20 verification room was a
  solo room view. The visible sheet surface used the observed Roll20 wrapper
  classes `ui-dialog ui-widget ui-widget-content ui-corner-all` and a
  `characterdialog` content wrapper with a 900px iframe viewport. A separate
  Sheet Sandbox Tools dialog exposed HTML, CSS, and Translation file controls.
- SAFETY: Existing character sheet windows were closed only as UI cleanup. No
  room settings, character values, macros, handouts, chat, or existing sheet
  source were edited.
- VERIFY BLOCKED (historical native chooser attempt): Applying the synthetic
  local-only payload through the native Sandbox file chooser was rejected by
  the browser control boundary. This was later superseded for synthetic smoke
  by the observed browser-side file-input path; it remains a limitation of the
  native chooser route, not the current upload evidence.
- CLAIM BOUNDARY: This is current wrapper/state observation, not preview parity.
  Modern Sandbox upload and dedicated legacy-room upload remain separate gates.

## 2026-07-18 Modern Sandbox Synthetic Smoke

- VERIFIED ACTUAL: In the logged-in solo verification room, the local-only
  synthetic HTML/CSS/translation payload was applied through the browser-side
  Sandbox input path. The Roll20 character-sheet iframe rendered the translated
  title and label, an input control, and one roll button.
- VERIFIED ACTUAL: The synthetic roll button produced a real Roll20 chat entry
  with the expected template fields (`Test` and a resolved `Result` value).
- EVIDENCE: Private screenshot and payload remain under ignored `.tmp/` only;
  no real or third-party sheet source was transmitted or committed.
- CLAIM BOUNDARY: This proves one anonymous modern Sandbox upload/runtime path,
  not visual parity for every sheet, asset completeness, worker parity, or the
  separate legacy-room contract.
- DONE FOR THIS BATCH: The native file chooser boundary is no longer the only
  route; the browser-side synthetic Sandbox path is confirmed.
- NEXT P0: Repeat the same evidence flow with a synthetic payload in a
  dedicated legacy-enabled room, then compare normalized wrapper, geometry,
  state, and chat evidence separately.

## 2026-07-18 Legacy Room Synthetic Smoke

- VERIFIED ACTUAL: A dedicated solo legacy-enabled room had Roll20's
  `legacy_sanitization` option checked before the synthetic payload was saved.
- VERIFIED ACTUAL: Synthetic HTML/CSS/translation was saved and the reopened
  character iframe rendered the translated title/label, input, and roll button.
- VERIFIED ACTUAL: Clicking the synthetic roll control produced a scoped Roll20
  chat DOM entry containing the test field and a resolved result.
- MEASURED: The legacy dialog wrapper was the observed `ui-dialog`
  `ui-widget`/`ui-widget-content`/`ui-corner-all` surface; its iframe measured
  900px wide by approximately 673.55px high. This is a mode-specific smoke
  measurement, not a parity claim.
- EVIDENCE: Screenshot and generic JSON sidecar remain under ignored `.tmp/`;
  no real, commissioned, or third-party sheet source is retained in the repo.
- CLAIM BOUNDARY: This proves one legacy-room synthetic runtime path only. It
  does not prove full visual parity, universal mapping, asset completeness,
  worker parity, or all legacy sheet variants.
- LOCAL GATES: `ci:verify`, lint, production build, persistent preview surface
  smoke (`modern loads=0`, `legacy loads=0`), edit-flow smoke, and server
  hygiene passed after the evidence update.
- NEXT P0: Normalize local preview/edit against modern and legacy wrapper,
  geometry, default-state, and chat evidence before changing the renderer.

## 2026-07-18 Legacy Sheet-Root Geometry Recheck

- VERIFIED ACTUAL: In the dedicated legacy synthetic runtime, the visible
  `.charactersheet` root measured `860x280` inside a `900px` iframe. Its
  scroll dimensions were also `860x280`, so the observed inner canvas had no
  vertical overflow in this smoke.
- VERIFIED LOCAL: The matching anonymous synthetic local preview/edit root is
  `870x280` with exact local preview/edit pixel and style parity.
- FAILING GATE: The normalized runtime comparison now reports `legacy
  rootGeometry=FAIL` for the 10px width difference. This is an intentional
  blocker, not a Roll20 parity pass.
- TOOLING FIXED: `roll20_runtime_evidence_compare.mjs` now returns `FAIL` for
  contradictory root/wrapper/runtime evidence instead of downgrading a root
  mismatch to `PASS_WITH_OPEN_PARITY_GAP`.
- VERIFY: Modern actual `sheetRoot` geometry is still missing, so modern
  promotion remains `NOT_COMPARABLE`/`HOLD`.
- NEXT P0: Identify whether the 10px difference comes from the local iframe
  canvas wrapper, Roll20 inner padding, or synthetic payload CSS, then rerun
  both modes with the same crop contract.

## 2026-07-18 Local Content-Canvas Evidence Split

- DONE: `smoke:preview-edit-visual` now records a generic `contentBox`
  target for the Roll20 sheet wrapper's content area, while retaining the
  first visible authored child as a nested-layout diagnostic. Runtime-only
  `script`, `style`, and `template` nodes are excluded from that diagnostic.
- DONE: The runtime comparator accepts an optional actual `sheetCanvas`
  sidecar and reports it separately from `sheetRoot`, so wrapper padding or
  crop cannot be mistaken for authored canvas geometry.
- VERIFIED LOCAL: The three anonymous ignored visual fixtures passed the
  preview/edit smoke in modern mode with `mismatch=0`, `EXACT` pixel parity,
  and content-box measurements present. The anonymous synthetic fixture also
  passed modern and legacy on the same gate. The comparator self-test passes
  for both root and content-canvas mismatch failures.
- VERIFY NOTE: A paired modern/legacy run exposed one transient modern pixel
  mismatch (`8.26%`) for an anonymous prepared fixture, while the subsequent
  modern-only rerun was exact for all three. Treat this as unstable evidence
  to reproduce, not as a parity pass or a renderer regression verdict.
- VERIFY: No actual modern or legacy sidecar currently contains
  `sheetCanvas`; this change creates the measurement contract but does not
  claim Roll20 visual parity.
- NEXT P0: When browser access is stable, measure the first authored child in
  each destination and populate only anonymous local evidence. Keep the
  production renderer on HOLD until wrapper, content canvas, crop, and state
  all compare under the same payload.

## 2026-07-18 Fresh Roll20 Browser Loader Check

- VERIFIED OBSERVATION: A fresh logged-in Roll20 tab loaded the account home
  page and showed a candidate observation room with `0 players`. No existing
  room settings, sheet source, character data, chat, or assets were changed.
- VERIFY BLOCKED: Entering both the dedicated observation room and the empty
  candidate room remained on Roll20's own `loading` screen; no iframe,
  `.charactersheet`, or authored canvas became available for measurement.
- DIAGNOSTIC: The browser console exposed extension-side asynchronous channel
  warnings and Roll20/JQMigrate warnings, but no reliable sheet-root evidence.
  This is an external browser/session loading hold, not a renderer result.
- NEXT P0: Retry with a stable Roll20 editor session or a user-reloaded tab;
  do not infer `sheetCanvas` from the loading shell and do not promote parity.

## 2026-07-18 Edit Surface Interaction Recheck

- VERIFIED LOCAL: `test:layer-roles`, `test:design-position`,
  `test:iframe-drop-target`, `test:iframe-edit-bridge`, and
  `test:runtime-contract` all passed on the active integration branch.
- VERIFIED LOCAL: `smoke:edit-flow`, `smoke:persistent-preview-surface`, and
  `smoke:fresh-sheet` passed. Persistent preview reported modern and legacy
  `loads=0`, and the fresh-sheet smoke kept the blank canvas contract.
- CLAIM BOUNDARY: These checks prove local interaction and shared-surface
  contracts only. They do not prove actual Roll20 visual parity, universal
  import fidelity, or the missing actual `sheetCanvas` sidecars.
- NEXT P0: Reconnect a stable Roll20 editor session and measure modern and
  legacy authored canvas geometry under the same anonymous payload before any
  renderer CSS change.

## 2026-07-18 Pointermove Overlay Coalescing

- DONE: Parent-side iframe selection/drop overlay updates are now coalesced
  with `requestAnimationFrame`; pointerup, pointercancel, and bridge reset
  still flush immediately.
- VERIFIED LOCAL: `smoke:persistent-preview-surface`, `smoke:edit-flow`,
  iframe bridge/drop/design-position tests, imported-edit budget self-test,
  lint, and production build passed after the change.
- CLAIM BOUNDARY: This removes one avoidable React state-update path during
  drag. A user-perceived latency improvement number has not been measured on
  a representative large imported sheet yet.
- NEXT P1: Add a large anonymous fixture drag benchmark that compares pointer
  event rate, overlay frame count, and drop-to-commit latency without keeping
  any source-identifying sheet data.

## 2026-07-18 Chat Diagnostic Isolation

- IMPLEMENTED: ChatPane now ignores persisted chat geometry, typography,
  paint, text, shadow, and font policies unless the explicit local diagnostic
  switch `__r20ChatDiagnostics=1` is present.
- IMPLEMENTED: The rolltemplate chat smoke enables that switch only when a
  non-default diagnostic policy was requested, so diagnostic candidate runs
  keep their evidence path without changing ordinary user rendering.
- VERIFIED LOCAL: Chat template-scope and targeted-renderer-plan self-tests
  passed, and the ChatPane file passed ESLint.
- BOUNDARY: This isolates experimental diagnostics; it does not promote any
  template-specific CSS, prove chat pixel parity, or remove the renderer HOLD.
- VERIFY NOTE: A local chat smoke attempt imported successfully but its
  selected fixture exposed no actionable visible roll button, so no chat card
  evidence was produced. This is an unverified fixture-state result, not a
  parity pass or a regression finding.
- NEXT P0: Obtain stable modern and legacy actual canvas/chat sidecars before
  considering any scoped renderer change.

## 2026-07-18 Edit History Controls

- IMPLEMENTED: The Blockly adapter now exposes `canUndo`, `canRedo`, `undo`,
  and `redo` through the existing workspace boundary.
- IMPLEMENTED: Edit mode has icon-only undo/redo controls with plain Korean
  tooltips and Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, and Ctrl/Cmd+Y shortcuts. A
  deleted selected layer is cleared after history navigation.
- VERIFIED LOCAL: The adapter history test, edit-flow smoke, lint, build, and
  full `ci:verify` passed. The browser smoke did not exercise every history
  button state, so detailed UI history interaction remains VERIFY.
- BOUNDARY: This adds reversible Blockly structure edits; it does not yet
  provide a separate multi-surface history for future worker/assets or prove
  full Figma parity.

## 2026-07-19 Layer Eject / One-Level Outward Move

- IMPLEMENTED: The layer panel now exposes an explicit eject action for
  nested HTML blocks. It moves the selected statement after its current
  container while preserving the remaining inner chain and the container's
  outer following sibling.
- IMPLEMENTED: Layer rows are now accessible draggable regions instead of a
  button containing another button. Enter/Space selects a row, and the eject
  control has a separate tooltip and test id.
- VERIFIED LOCAL: A headless Blockly connection test covers nested first-child
  removal, inner sibling preservation, outer order, and the new adapter path;
  the browser edit-flow smoke also clicked the eject action and reported
  `movingParent=null`, `remainingParent=<frame>`, and `framePresent=true` with
  zero console/page errors. ESLint passed.
- BOUNDARY: This is one-level statement-container extraction. It does not yet
  prove full Figma group/ungroup semantics for tables, repeating sections,
  absolute positioning, or non-statement/custom Blockly connections.
- NEXT P1: Extend the anonymous browser smoke to compare the post-eject
  preview/edit geometry and emitted HTML/CSS, not only the Blockly layer graph.

## 2026-07-19 Application Chrome Pastel Baseline

- IMPLEMENTED: The browser theme color, initial toast surface, toast text, and
  toast border now match the existing pastel application shell instead of
  flashing or reverting to the old charcoal chrome.
- VERIFIED LOCAL: The running app shell reported `app-shell pastel`,
  `--bg-app=#fffafb`, and `--primary=#d45d84` in a real browser capture. The
  captured shell had no application page errors; the dev-only HMR websocket
  warning is excluded from the product claim.
- BOUNDARY: This covers application chrome only. Roll20 iframe, sheet CSS,
  Roll20 dark/light runtime tokens, and actual sheet visual parity are
  intentionally unchanged.

## 2026-07-19 Roll20 Chrome Session Observation

- VERIFIED EXTERNAL: The logged-in Chrome session opened `https://app.roll20.net/editor`
  successfully and rendered the Roll20 editor shell, journal tab, chat tab, and
  campaign content.
- EXCLUDED: The opened campaign showed active chat history and multiple PC/NPC
  journal entries. It was not a permitted one-player observation target, so no
  sheet settings, source, chat, assets, or room state were changed.
- NOT VERIFIED: The observed editor shell exposed no `.charactersheet` root or
  authored sheet iframe. This run therefore proves login/editor reachability
  only; it does not prove Roll20 sheet visual parity or wrapper measurements.
- HOLD: Keep `rendererAction=HOLD_PRODUCTION_RENDERER_PATCH` and the actual-room
  evidence count at `roomObservationScreenshots=0/3` until a qualifying solo
  room or sandbox capture is available.
- NEXT: Inspect the campaign list read-only, identify only rooms with one user,
  then capture the sheet wrapper/root in that room. Use Custom Sheet Sandbox or
  a newly created test room for any upload or mutation.

## 2026-07-19 Persistent Preview Smoke Contract Repair

- FIXED: The browser smoke no longer assumes an edit-layer row is an HTML
  `button`. It now verifies the implemented accessible contract,
  `data-testid="edit-layer-row"` plus `role="button"`, before clicking it.
- EVIDENCE: The previous run reached the imported persistent iframe and live
  patch checks in both modern and legacy modes, then failed because the row
  type check returned false. No console or page errors were present.
- VERIFIED: `smoke:persistent-preview-surface` now passes in modern and legacy
  modes with `loads=0`; `smoke:fresh-sheet` passes with no ghost section;
  `smoke:preview-edit-visual` passes for all 3 local comparison fixtures at
  `mismatch=0%`. Full `ci:verify`, lint, build, diff-check, and server hygiene
  also pass.
- BOUNDARY: These are local/synthetic and comparison-fixture results. They do
  not replace the missing qualifying solo-room or Sandbox actual Roll20 proof.

## 2026-07-19 Solo Roll20 Room Observation: Modern + Legacy Geometry

- VERIFIED EXTERNAL, PRIVATE: Read-only authenticated Chrome observation reached
  two rooms showing `0 players`: `Codex Roll20 Legacy Verify` and `[3팀]아무도
  없는 섬 Copy`. No room settings, sheet source, chat messages, assets, or
  uploads were changed.
- VERIFIED EXTERNAL: The legacy room character viewer exposed a real Roll20
  sheet root at `860 x 280`, with an iframe content width of `900px`. Its
  surrounding dialog measured `906.8px` wide; the sheet root was static and
  overflow-visible.
- VERIFIED EXTERNAL: The modern room character viewer exposed a real Roll20
  sheet root at `850 x 1992.16`, with an iframe content width of `900px`. Its
  surrounding dialog measured `906.8px` wide; the sheet root was relative and
  overflow-hidden.
- VERIFIED EXTERNAL: Both iframe runtimes loaded the same Roll20 baseline
  family (`jquery-ui`, `base.css`, `charsheet.css`) plus inline sheet CSS. The
  modern sample exposed `431` form controls and `159` roll buttons; the legacy
  sample exposed `2` controls and `1` roll button.
- PRIVATE EVIDENCE: Actual captures and metrics are under the ignored local
  directory `reports/roll20-actual-compare/live-browser/2026-07-19-solo-room-observation/`.
  They are intentionally excluded from public commits.
- BOUNDARY: This is authoritative wrapper/root observation, not proof that our
  export renders identically in Roll20. The generated renderer status sidecars
  remain unchanged and the production renderer gate stays HOLD until an
  anonymous export is applied in Sandbox or a dedicated test room and the
  resulting screenshot is normalized and diffed.
- NEXT P0: Use these measured wrapper contracts to normalize the local modern /
  legacy comparison harness, then run the dedicated anonymous export check.

## 2026-07-19 Legacy Fixture Matrix Recheck

- DONE LOCAL: The full three-fixture legacy visual matrix completed in one run
  on port `4410` in `95.9s`. `fixture-A`,
  `fixture-B`, and `fixture-c-commission-1bu` all returned
  `LEGACY FIXTURE VISUAL SMOKE PASS`.
- VERIFIED LOCAL: Every fixture rendered modern, transition-legacy, and
  fresh-legacy captures; transition/fresh geometry parity was true for all
  three. Diagnostic modern/legacy image mismatch was `16.90%`, `0.04%`, and
  `35.73%` respectively. These values are mode-difference diagnostics, not
  actual Roll20 parity scores.
- CLOSED GAP: The earlier timeout was an invocation-limit boundary, not a
  fixture failure. No per-fixture timeout patch is required at this point.
- NEXT P1: Keep the matrix command available as a bounded evidence run and
  move the parity gate back to actual Roll20 Sandbox/legacy-room comparison.

## 2026-07-19 Roll20 Sandbox Reconnect Boundary

- OBSERVED: The authenticated settings surface at
  `https://app.roll20.net/sheetsandbox/settings/<campaignId>` was reachable
  and exposed the Sheet.json editor. The current settings contained a prior
  local verification payload, but this turn did not upload or save anything.
- VERIFY BLOCKED: The corresponding guessed `/editor/<campaignId>` route
  returned Roll20's not-found page, so no active character iframe or new
  screenshot was captured in this turn.
- SAFETY: No room settings, source, chat, assets, uploads, or external
  evidence were changed. Existing ignored actual reports remain the only
  actual-render evidence.
- NEXT P0: Reconnect through the known dedicated Sandbox editor route or a
  user-visible native file handoff, then require a positive iframe/root
  activation probe before any new screenshot is counted.

## 2026-07-19 Authored Root Intrinsic Width Contract

- FIXED: `ROLL20_DIALOG_OPEN_CSS` no longer forces `#charsheet-root` to the
  iframe width. The dialog, content, and `form.sheetform` still fill the
  `900px` Roll20 content frame, while the authored `.charactersheet` root can
  follow its own sheet CSS width.
- WHY: Live Roll20 measured modern `850px` and legacy `860px` roots inside the
  same `900px` iframe. The old local rule made imported roots `870px` wide and
  could overwrite a sheet's intrinsic layout contract.
- VERIFIED LOCAL: buildDoc bundle test, lint, production build, fresh-sheet,
  persistent-preview modern/legacy (`loads=0`), preview/edit visual smoke for
  all 3 local comparison fixtures, legacy preview contract smoke, and one
  legacy fixture visual smoke all passed after the change.
- LIMIT: The legacy fixture visual smoke remains diagnostic and reported a
  `17.22%` modern/legacy pixel difference for fixture-B; that is not treated
  as a parity pass. Actual Roll20 export upload and normalized diff remain open.

## 2026-07-19 Modern Sandbox Activation Proof

- VERIFIED EXTERNAL, PRIVATE: An anonymous synthetic modern payload was applied
  through the dedicated Roll20 Custom Sheet Sandbox editor and opened in a real
  character-sheet iframe. The iframe content width was `900px`; the authored
  sheet surface was `850 x 260`, `position: static`, and `overflow: visible`.
- VERIFIED EXTERNAL: The live iframe exposed the translated title and label,
  one input, and one `type="roll"` button. Clicking the button produced a real
  Roll20 chat entry with the default rolltemplate fields (`Test` / resolved
  `Result 5`). This is a runtime smoke proof, not a full visual-parity score.
- PRIVATE EVIDENCE: Screenshot and JSON metrics remain under the ignored local
  directory `reports/roll20-actual-compare/live-browser/2026-07-19-synthetic-modern/`.
  No public fixture, sheet source, or identifying sample was added.
- BOUNDARY: This closes the modern Sandbox activation prerequisite only. Full
  export-vs-Roll20 screenshot normalization, worker/asset parity, and the
  separate legacy-room check remain open.
- NEXT P0: Capture a normalized local preview and edit surface for the same
  anonymous payload, then compare it with the Sandbox root/wrapper contract.

## 2026-07-19 Local vs Modern Sandbox Root Contract

- VERIFIED LOCAL + EXTERNAL: The same anonymous payload rendered through the
  local `buildSheetDoc` contract matches the Sandbox root contract: `900px`
  iframe/dialog width, `850px` authored sheet width, `260px` sheet height,
  `static` positioning, visible overflow, `2` controls, and `1` roll button.
- VERIFIED LOCAL: The translated title is preserved as `합성 Roll20 시트`.
  The comparison script returned `pass: true` and writes only an ignored local
  sidecar under the synthetic-modern evidence directory.
- CLASSIFIED: Local dialog height is `280px`, while the real Roll20 viewer
  measured about `365.6px`. The difference is the Roll20 nav/tab chrome that
  the product preview intentionally hides; it is not included in the authored
  sheet crop and must not be used as a sheet parity score.
- NEXT P0: Capture root-only local and Sandbox screenshots under the same crop
  and viewport, then run pixel diff. Keep dialog chrome and chat as separate
  evidence axes.

## 2026-07-19 Root-Only PNG Diff Recheck

- VERIFIED EXTERNAL, PRIVATE: Reopened the dedicated Sandbox character viewer
  and captured the authored root through supported tab-scoped CDP as a true PNG.
  The capture used the live iframe geometry, browser zoom `1.25`, a physical
  `1063 x 325` crop, and a recorded one-pixel crop alignment correction.
- VERIFIED LOCAL + EXTERNAL: The same anonymous payload was captured locally at
  the same `1.25` device scale. Root-only comparison measured `5,686 / 345,475`
  pixels above RGB threshold `60` (`1.6458%` mismatch, RMS RGB `10.654`).
- CLASSIFIED: This is a diagnostic score for one anonymous synthetic `850 x
  260` root. It is not a general all-sheet Roll20 parity claim. Viewer chrome,
  chat, assets, worker behavior, and legacy-room parity remain separate axes.
- EVIDENCE: PNGs, crop provenance, and the diff JSON remain ignored under
  `reports/roll20-actual-compare/live-browser/2026-07-19-synthetic-modern/`.
- NEXT P0: Repeat the root-only capture with an authorized user-imported sheet
  fixture, then establish the same normalized contract for the legacy-enabled
  room before changing renderer CSS.

## 2026-07-19 Layer Metadata and Drag-Lag Fix

- FIXED: `BlocklyAdapter.getBlock()` now returns the same parent/relation
  metadata as `listAllBlocks()` instead of reporting every block as a root.
  This restores correct cycle checks, containing-frame detection, and
  free-placement reparenting for nested layers.
- OPTIMIZED: The iframe edit bridge now builds one HTML layer map per Blockly
  structure revision and reuses it for pointermove/drop resolution. It no
  longer reconstructs a full layer snapshot for every pointer event.
- VERIFIED LOCAL: blockly layer operations, iframe drop-target tests, lint,
  diff-check, full `ci:verify`, production build, and the browser
  `smoke:edit-flow` pass. The smoke covers persistent iframe ownership,
  flow-container insertion, free placement, before/inside/after layer drops,
  cycle protection, and emitted HTML/CSS updates.
- VERIFIED LOCAL: the modern/legacy `smoke:preview-edit-visual` matrix passed
  for all three local comparison fixtures with `0%` mismatch in both modes.
- BOUNDARY: This is a structural/edit-path fix. It does not yet prove Figma
  interaction quality, arbitrary imported-sheet parity, or legacy-room parity.

## 2026-07-19 Roll20 Runtime Class Payload Fix

- FIXED: Roll20 chat runtime classes `inlinerollresult`, `fullcrit`,
  `fullfail`, and `importantroll` are now preserved in CSS selector blocks,
  final HTML/CSS auto-prefixing, and HTML class attributes. Author classes
  and ordinary IDs remain sheet-scoped.
- VERIFIED LOCAL: the dedicated preview-prefix test passed, the high-priority
  block test passed `20/20`, and production build passed.
- VERIFIED LOCAL: the rebuilt ignored fixture-C baseline emitted unprefixed runtime
  selectors, and `verify:roll20-preupload` passed every gate: local baseline,
  payload audit, Sandbox sanitize audit, payload roundtrip, state selectors,
  asset audit, and evidence guard.
- EVIDENCE: the run is local-only under
  `reports/roll20-actual-compare/2026-07-19-fixture-c-runtime-class-fix-built/`;
  fixtures, payloads, screenshots, and reports remain ignored.
- BOUNDARY: This closes an export-payload defect. It does not yet prove the
  imported fixture-C sheet is visually identical in an actual Roll20 iframe, and
  the authenticated user-file upload remains a separate manual/browser step.

## 2026-07-19 Free Placement Click Guard

- FIXED: A free-placement pointerdown/pointerup with no meaningful movement
  could convert a flow element into managed absolute positioning. A minimum
  three-pixel drag threshold now keeps a click as selection-only behavior.
- VERIFIED LOCAL: `iframeDropTarget.test.ts` covers the no-movement guard, and
  `smoke:edit-flow` passed with no console or page errors. The smoke still
  covers flow widget insertion, free placement, layer before/inside/after,
  cycle protection, selection sync, and canvas widths.
- BOUNDARY: This protects the editor interaction contract; it does not prove
  arbitrary imported-sheet visual parity or actual Roll20 legacy-room parity.

## 2026-07-19 Generated Position CSS Separation

- FIXED: The authored `r20_pos_div` block no longer emits generated layout as
  inline HTML style. It emits a stable `sheet-r20-position-*` class, while
  position, size, and the block's generated style are appended to CSS output.
- VERIFIED LOCAL: emit contract coverage confirms HTML/CSS class pairing,
  absence of generated `position:absolute` inline output, and preserved left,
  top, width, height, and user style values. Existing design-position and
  iframe drop tests remain green.
- BOUNDARY: Imported source inline styles remain loss-aware for visual fidelity;
  this change covers editor-authored position-block output, not a blanket
  rewrite of every source inline style.

## 2026-07-19 Product Reset Goal Revision

- SCOPE: The active product goal now includes a controlled UI reset after the
  renderer contract is stable: original pastel/pink product UI, plain Korean
  labels, visual affordances, and a Figma-like layer/container workflow.
- ORDER: Re-audit current implementation and evidence first; finish the
  shared preview/edit render surface and modern/legacy Roll20 verification;
  then execute the visual redesign on a separate design-scoped branch.
- PRIVACY: User-imported sheets, third-party sources, screenshots, fixtures,
  and derived reports stay local/ignored. The public app must ship no sample
  sheet content or source identity. Bug reports use
  `sjh11235678@gmail.com`.
- STATUS: This is a revised scope and sequencing decision, not a completion
  claim. Actual user-sheet upload and legacy-room parity remain VERIFY.
- NEXT P0: Rebaseline implemented/verified/unverified counts, then continue
  the actual Roll20 modern Sandbox and dedicated legacy-room checks.

## 2026-07-19 Product Reset Evidence Rebaseline

- VERIFIED REMOTE: GitHub Actions run `29655601442` for `28075c6` passed
  safety/unit verification, lint, and production build.
- VERIFIED LOCAL: `ci:verify` passed structural import `27/27`, legacy
  sanitize `16/16`, Sandbox sanitize `7/7`, the copyright/evidence guard, and
  the UI-copy guard. The local preview/edit matrix remains `6/6` at `0%`
  mismatch.
- DIAGNOSTIC: one anonymous modern Roll20 root capture measured `1.6458%`
  root-only mismatch. This is not a general parity claim.
- VERIFY: authorized user-sheet upload remains `0` successful browser
  handoffs; dedicated legacy-room capture remains `0`.
- DOC: the full evidence ledger is in
  `docs/qa/32_product_reset_status.md`.

## 2026-07-19 Pastel Root Theme Slice

- FIXED: removed the forced `html.dark` class so app portals and shell tokens
  default to the pastel/light product palette. Explicit `.dark` remains an
  opt-in scope. Roll20 iframe and Shadow DOM styles were not changed.
- VERIFIED LOCAL: `lint`, `build`, `ci:verify`, and `smoke:edit-flow` passed.
  The smoke now asserts the root class, pastel shell presence, root `--bg-app`,
  and pastel `--primary` token.
- BOUNDARY: This is the first product UI reset slice, not the full information
  architecture or interaction redesign.

## 2026-07-19 Core Product Copy Slice

- FIXED: normalized the visible header, import/export/save actions, panel tabs,
  block workspace tabs, and tooltips to readable Korean product language.
- VERIFIED LOCAL: `lint`, `build`, `ci:verify`, and `smoke:edit-flow` passed.
- BOUNDARY: This changes app-shell copy only; imported Roll20 HTML/CSS and the
  shared iframe render surface were not rewritten.

## 2026-07-19 Goal Card Scope Reconciliation

- SCOPE SYNC: The active goal, `41_product_reset_and_short_term_goals.md`,
  `43_agent_context_pack.md`, and the shared agent bridge now carry the same
  product-reset scope: original pastel/pink UI, plain Korean actions, no public
  copyrighted examples, explicit local-storage boundary, modern/legacy render
  contracts, shared preview/edit surface, and future JS/worker extensibility.
- VERIFIED EXTERNAL PRIVATE: The dedicated Custom Sheet Sandbox manifest was
  edited through the visible Sheet.json editor and saved with `legacy:false`.
  The dedicated editor route then loaded successfully.
- VERIFY: This proves the modern destination configuration and editor load only;
  it does not prove the sheet iframe root rendered, user-owned upload parity, or
  general Roll20 visual equality. Existing rooms were not edited.

## 2026-07-19 Goal Card Replacement Text

- CONTROL: The active Codex goal card is still unchanged because the available
  goal API can only mark an active goal complete or blocked. Neither status is
  truthful for this unfinished product reset, so no false status transition was
  made.
- SYNCED: The shared agent bridge and product-reset control document now carry
  the revised scope: general modern/legacy support, same preview/edit render
  surface, Figma-like layer editing, plain Korean pastel UI, no public sample
  sheets, local-storage honesty, bug reporting, CI/CD, and real Sandbox/legacy
  verification.
- ACTION: Edit the goal card in the Codex UI with the replacement text recorded
  in `docs/operations/41_product_reset_and_short_term_goals.md`.
- STATUS: VERIFY until the card UI visibly shows the replacement objective;
  repository and bridge scope are already synchronized.

## 2026-07-19 Canonical Imported Round-Trip Gate

- FIXED: the default iframe-based imported edit smoke now performs the edited
  emit -> re-import -> re-emit stability check. It no longer reports that
  metric as an unmeasured false value on the production render path.
- VERIFIED LOCAL: four anonymous fixtures passed strict imported edit sync;
  HTML/CSS/i18n round-trip stability is true for all four, with no page errors
  or failed final resources.
- BOUNDARY: local round-trip stability is not live Roll20 visual parity and
  does not replace the missing authorized user-sheet Sandbox upload evidence.

## 2026-07-19 Roll20 Upload Handoff Refresh

- PREPARED LOCAL: regenerated the missing-only Roll20 handoff and a
  modern-runtime upload plus activation-check snippet from the latest ignored
  pre-upload payload for one user-owned local fixture.
- VERIFY: no browser file handoff or Roll20 activation occurred in this step;
  do not count the generated snippet as external evidence.

## 2026-07-19 Semantic Inline Mapping

- FIXED: added the generic `r20_inline_container` mapping for `small`, `u`,
  `sub`, and `sup`, including nested translation children and editable class/
  style fields.
- VERIFIED LOCAL: `test:import-structure` passed `28/28`; imported edit sync,
  preview/edit visual smoke in modern and legacy modes, and render-mode smoke
  passed. The affected anonymous fixture now reports `1839/1839` HTML and
  `103/103` CSS with zero raw HTML fallback.
- VERIFY NEXT: inspect the remaining `2` HTML and `1` CSS legacy residuals,
  then repeat the same generic mapping audit on another non-user-owned fixture.
- STILL OPEN: authorized user upload in Roll20 Sandbox and dedicated legacy
  room capture remain unverified; no external parity count changed.

## 2026-07-19 Remote CI Recheck

- VERIFIED REMOTE: GitHub Actions run `29657697204` for commit `3373d59`
  passed safety/unit verification, lint, and production build.
- STILL OPEN: deployment smoke is separate from this branch CI, and actual
  Roll20 user-sheet/legacy-room evidence remains VERIFY.

## 2026-07-19 Generic Table/CSS Import Mapping

- FIXED: generic HTML `<colgroup>`/`<col>` nodes now map to dedicated blocks
  and preserve class, span, width, style, and child order. Generic CSS
  `@import` statements now map to an editable CSS block instead of raw CSS.
- VERIFIED LOCAL: `test:import-structure` passed `30/30`; the direct legacy
  diagnostic now reports `637/637` HTML and `109/109` CSS with zero raw
  fallbacks. Worker JavaScript partials remain a separate axis.
- FIXED: visual smoke now waits for CSS `background-image`, `mask-image`, and
  `list-style-image` resources in addition to `<img>` and fonts before taking
  the comparison capture.
- VERIFIED LOCAL: two full modern/legacy runs passed all six fixture cases at
  `0%` preview/edit mismatch. This improves capture stability only; it does
  not increase the live Roll20 user-sheet evidence count.
- NEXT P0: retry the authorized modern Sandbox upload through a supported
  visible file handoff, then perform the separate legacy-room check.

## 2026-07-19 Figma Layer Tree Interaction

- FIXED: the edit-mode layer surface now supports collapsing and expanding
  container layers. The visible list hides descendants without changing the
  underlying Blockly structure; search temporarily reveals matching descendants
  so a collapsed parent cannot hide a search result.
- FIXED: selecting a nested object from the shared iframe automatically opens
  its ancestor layers before scrolling the selected row into view.
- VERIFIED LOCAL: `smoke:edit-flow` now clicks the collapse control, confirms
  descendant rows disappear and return, then selects the hidden child in the
  shared iframe and confirms the ancestor re-opens and the child row is
  selected. The smoke reported zero console/page errors.
- VERIFIED LOCAL: lint, production build, `ci:verify`, and strict imported
  edit-sync passed after the acceptance coverage was added.
- BOUNDARY: this verifies the local edit flow, not live Roll20 parity. The
  separate before/inside/after reorder assertions remain synthetic events.

## 2026-07-19 Modern Sandbox Handoff Recheck

- PREPARED LOCAL: generated a fresh modern-mode-only handoff by cloning the
  ignored current payload and setting its local verification manifest to
  `legacy:false`. No protected source folder or tracked file was changed.
- VERIFY BLOCKED: Chrome `filechooser.setFiles` returned `Not allowed`; the
  page-evaluation surface also does not expose DOM construction APIs needed by
  the generated File-event snippet. No payload was uploaded and no Roll20
  result was inferred.
- CURRENT TRUTH: actual Roll20 user-sheet captures remain `0`; dedicated
  legacy-room captures remain `0`. The latest remote CI run `29659555283`
  for commit `7ec880a` is green, but external upload evidence is still
  missing.

## 2026-07-19 Guarded Worker Block Mapping

- DONE: Worker import now attempts nested Blockly XML only for fully
  recognized scripts. It compares the generated worker body against the
  normalized source before accepting the parsed workspace; any mismatch keeps
  the original source in `r20_raw_worker` blocks.
- VERIFIED LOCAL: `smoke:worker` passed with zero console/page errors. The
  generic parsed sample produced `r20_on_attr_change`, `r20_set_attrs`, and
  `r20_literal_string`, and emitted exactly one worker script. `audit:worker`
  passed `3/3` prepared anonymous fixtures with exact canonical source
  preservation.
- BOUNDARY: this is a guarded first JS-block slice. It does not claim
  universal JavaScript parsing or live Roll20 worker-runtime parity. Actual
  user-sheet upload and legacy-room evidence remain VERIFY.

## 2026-07-19 Pre-upload verification recheck

- VERIFIED LOCAL: `corepack pnpm run verify:roll20-preupload` passed all seven
  gates: local baseline, payload audit, Sandbox sanitize, payload round-trip,
  state selectors, asset policy, and evidence guard.
- VERIFY BLOCKED: a fresh authenticated Roll20 Sandbox DOM snapshot timed out
  in the browser-control connection and reset its kernel. No file handoff,
  activation, screenshot, or external parity result was produced.
- CURRENT TRUTH: authorized user-sheet captures remain `0`; dedicated
  legacy-room captures remain `0`. The latest remote CI evidence is
  `7ec880a` / run `29659555283` and is separate from Roll20 runtime proof.

## 2026-07-19 Typed page-script preservation

- FIXED: explicitly typed non-worker `<script>` elements are no longer
  classified as Roll20 worker code. They remain raw HTML with their original
  type/src attributes, stay hidden by the preview script policy, and remain
  available to the export path. The existing Roll20 `text/worker` and legacy
  untyped worker-compatible paths are unchanged.
- VERIFIED LOCAL: high-priority importer tests passed `21/21`, import structure
  remained `30/30`, and the export contract confirms typed page scripts are
  not rewritten as `text/worker`.
- BOUNDARY: this preserves page-script source; it does not execute arbitrary
  page JavaScript in the editor preview. Worker parsing/runtime parity remains
  a separate partial axis.

## 2026-07-19 Generic Shadow Drag Commit

- FIXED: the Shadow render drag path no longer ignores blocks without
  `LEFT_PX`/`TOP_PX`. It now moves the actual rendered node with a coalesced
  temporary transform and commits one parent-relative design position on
  pointerup. Existing position-field blocks use the same no-rerender drag
  behavior.
- VERIFIED LOCAL: lint, production build, `ci:verify`, design-position test,
  edit-flow smoke, strict imported edit synchronization, and modern/legacy
  preview/edit visual smoke all passed. The six local visual cases remained at
  `0%` preview/edit mismatch.
- BOUNDARY: the default product surface is the persistent iframe; this change
  covers the alternate Shadow drag implementation and does not claim live
  Roll20 parity. Authorized user-sheet captures remain `0`, and dedicated
  legacy-room captures remain `0`.

## 2026-07-19 Shadow Drag Browser Smoke

- DONE: added the local-only `smoke:shadow-drag` command using an anonymous
  synthetic sheet. It exercises a real pointer drag against the live Shadow
  DOM node rather than calling the adapter directly.
- VERIFIED LOCAL: the generic node started as `position: static` without
  position fields and ended with `position: absolute`, managed CSS `left/top`,
  no leaked temporary transform, and zero console/page errors.
- BOUNDARY: this proves the local alternate Shadow interaction path only. The
  persistent iframe remains the default product surface; actual Roll20
  user-sheet and dedicated legacy-room evidence remain `0` and `0`.

## 2026-07-19 Payload Roundtrip Mode and Capture Stability

- FIXED: local payload roundtrip now reads the generated `sheet.json` manifest
  and applies its modern/legacy compatibility mode before import and capture.
- FIXED: local baseline generation applies the same manifest mode instead of
  recording legacy metadata while always rendering with the default mode.
- FIXED: baseline and roundtrip captures wait for document fonts, images, and
  repeated stable root geometry before taking screenshots. This removes a
  timing-dependent height mismatch between otherwise identical captures.
- FIXED: the local gate classifies only the known legacy Roll20 font-proxy CORS
  pair as expected. Unrelated console, page, and resource errors still fail.
- VERIFIED LOCAL: the latest anonymous three-fixture run passed all seven
  pre-upload checks. The mode-aware roundtrip stayed within the 2% mismatch
  threshold, with the latest three captures reporting 0.00% mismatch.
- BOUNDARY: this proves local payload readiness and capture stability only. It
  does not prove an authorized user sheet has been activated in Roll20, and it
  does not add any actual sheet source or screenshot to the public repository.

## 2026-07-19 Roll20 Browser Recheck

- VERIFY: the authenticated Roll20 editor tab was found and left open for
  handoff. Lightweight URL/title discovery worked, but DOM snapshot, page
  evaluation, and screenshot operations timed out on the heavy editor page.
- CURRENT TRUTH: no upload, activation, chat smoke, or external screenshot was
  counted in this recheck. Local pre-upload PASS remains separate from actual
  Roll20 parity evidence.

## 2026-07-19 Worker workspace multi-handler fix

- FIXED: imported Roll20 worker event handlers are emitted as separate Blockly
  hat roots. Chaining one hat after another produced invalid Blockly XML
  because hat blocks do not have previous-statement connections.
- FIXED: parsed-worker stability comparison now ignores only formatting-only
  differences such as trailing spaces and repeated blank lines. Semantic
  source differences still fall back to a raw worker block.
- FIXED: the worker browser smoke now counts top-level nodes through the actual
  `parentId` graph field and covers both attribute-change and button-click
  handlers.
- VERIFIED LOCAL: `corepack pnpm run build`, `corepack pnpm run lint`,
  `corepack pnpm run ci:verify`, `corepack pnpm run smoke:worker`,
  `corepack pnpm run smoke:persistent-preview-surface`,
  `corepack pnpm run smoke:preview-edit-visual -- --compatibility-mode both`,
  `corepack pnpm run smoke:edit-flow`, and
  `corepack pnpm run smoke:shadow-drag` passed. The visual smoke reported
  `0%` mismatch for all six local modern/legacy fixture cases.
- BOUNDARY: this improves generic worker mapping and local render/edit
  confidence. It does not count as external Roll20 upload, chat, Sandbox, or
  dedicated legacy-room proof; those remain `VERIFY`.

## 2026-07-19 Free-placement drop feedback

- FIXED: free/absolute placement no longer shows before/after flow insertion
  overlays. It still highlights a valid inside-container target so the user
  can see where an absolutely positioned object will be owned.
- VERIFIED LOCAL: iframe drop-target unit coverage, real persistent-iframe
  pointer drag smoke, modern/legacy preview-edit visual smoke, Shadow drag
  smoke, lint, build, and `ci:verify` passed.
- BOUNDARY: this corrects the local editing affordance; it does not change or
  claim actual Roll20 Sandbox/legacy-room evidence.

## 2026-07-19 Preview Chat Surface and Autocalc Warning Fix

- FIXED: preview focus keeps the ChatPane visible after a roll result instead
  of hiding the entire right sidebar. The sheet remains on the same persistent
  preview surface while the user-facing roll result appears beside it.
- FIXED: disabled numeric controls containing Roll20 formulas no longer pass
  formula text through the native number-input setter. The source expression
  is retained in `data-r20-autocalc-expression`, and the runtime applies only
  a computed numeric value when one is available.
- VERIFIED LOCAL: `lint`, production `build`, `rolltemplate_chat_smoke`, and
  `verify:runtime-visibility` pass. The runtime report contains no console
  issues or page errors, all three anonymous local fixtures produce a
  rolltemplate chat card, and preview/edit visual parity remains `0%` for the
  measured local cases.
- BOUNDARY: this is local runtime evidence only. Actual Roll20 Sandbox chat
  and dedicated legacy-room behavior are still `VERIFY`; no external upload or
  screenshot was counted.

## 2026-07-19 Edit Inspector Integration

- FIXED: edit mode no longer routes the right `속성` tab to the legacy widget
  inspector. It now shows the selected HTML/CSS/i18n/worker block's role,
  workspace, parent relationship, child count, editable geometry fields, and
  schema fields through the Blockly adapter.
- FIXED: duplicate and delete actions in the edit inspector use the adapter and
  workspace structure signal, so the same rendered preview/edit surface and
  layer panel receive the mutation. Numeric block values use text input with a
  decimal input hint so Roll20 expressions are not rejected by native number
  controls.
- VERIFIED LOCAL: `smoke:edit-flow` now asserts that a real layer selection
  opens the block inspector and exposes role/context metadata. Strict imported
  edit sync passed for four anonymous fixtures, and modern/legacy preview-edit
  visual smoke passed all six cases at `0%` mismatch.
- BOUNDARY: this closes the local inspector wiring gap; it does not prove
  Figma-level resize handles, arbitrary DOM mapping, or external Roll20 parity.

## 2026-07-29 Modern Sandbox Synthetic Verification

- VERIFIED EXTERNAL (anonymous synthetic only): the dedicated Custom Sheet
  Sandbox showed one visible member before use. No existing room was opened or
  modified.
- VERIFIED EXTERNAL: the modern payload rendered a translated heading, text
  input, and Roll20 roll button inside the character-sheet iframe. The authored
  root measured `850x220px`; the Roll20 `.charactersheet` wrapper measured
  `860x240px`. A roll interaction produced the synthetic result marker in the
  Roll20 chat log.
- VERIFIED LOCAL: the same anonymous payload imported at `100%` token match;
  local preview/edit baseline captured `850x240px`; payload audit, Sandbox
  sanitize audit, cleaned-payload roundtrip (`0%`), and evidence guard passed.
- FIXED: the actual screenshot path now uses CDP physical coordinates when the
  browser is zoomed, and the local diff uses a matching authored-root crop.
- VERIFY: the normalized root comparison reports `2.88%` mismatch with
  `1062x275` actual pixels versus `1063x275` local pixels. This is improved
  measurement, not a visual-parity claim; the remaining difference needs
  human classification (font rasterization, wrapper, or base CSS).
- BOUNDARY: no chat screenshot is retained because the full chat panel
  contained unrelated prior content; only anonymous marker existence remains.
- NEXT P0: classify the remaining synthetic root delta, then repeat with a
  user-authorized modern payload and a separately configured legacy test room.
  Keep both destinations separate.

## 2026-07-29 Sandbox Upload And Runtime Separation

- DONE: The dedicated verification page passed a fresh visible participant
  preflight with exactly one member before the Sandbox upload attempt.
- VERIFIED/PARTIAL: HTML, CSS, and translation file-input handlers dispatched
  successfully. This proves the browser upload handoff reached Roll20's
  delegated handler, not that the sheet rendered.
- VERIFY: No character-sheet iframe was visible after the dispatch, so there is
  no new actual sheet screenshot, computed-style sidecar, root geometry, or
  chat evidence from this attempt.
- VERIFY: The Sandbox observed `modern` runtime. A legacy payload must not be
  counted as a Sandbox legacy result; use the dedicated legacy-enabled room
  and repeat the participant preflight immediately before any write operation.
- VERIFY: The Sandbox JSON warning node was hidden after the attempt. The
  earlier warning is not currently classified as an active translation parse
  failure, but translation remains unproven until the intended sheet iframe
  visibly renders.
- NEXT P0: Reopen the matching test character in Sandbox for modern frame
  evidence, then upload the same payload to the separate one-member legacy
  test room with the required participant guard. Keep screenshots and source
  payloads local-only and ignored.

## 2026-07-29 Persistent Render Sync and Inspector Tab Fix

- FIXED: keyed structural patching now updates text and comment node values as
  well as element attributes. A same-node text edit can no longer leave stale
  text in the persistent iframe until a full root replacement.
- FIXED: the right-sidebar tooltip wrapper no longer overwrites Radix Tabs'
  active-state attribute. The inspector action from the iframe context menu
  now opens the attributes tab with its active visual state intact.
- VERIFIED LOCAL: production build, lint, `ci:verify`, persistent preview
  surface smoke for modern and legacy, preview/edit visual smoke for both
  modes, edit-flow smoke, and direct Shadow drag smoke all passed. The
  persistent surface retained one iframe with zero reloads during the tested
  edit flow.
- BOUNDARY: this is local synchronization and interaction evidence. The
  anonymous external Sandbox root remains a `2.88%` diagnostic delta; modern
  user-payload parity and dedicated legacy-room parity remain `VERIFY`.
- NEXT P0: repeat the normalized actual-screen check with an authorized
  modern payload, then run the separate legacy-enabled test-room check. Do
  not combine their evidence.

## 2026-07-29 Roll20 Dialog Inset Alignment

- FIXED LOCAL: the preview/edit Roll20 wrapper now preserves the measured
  `.dialog.largedialog` horizontal content inset (`20px` on each side) while
  continuing to hide titlebar/button-pane chrome. The authored sheet root is
  still allowed to keep its own intrinsic width, so the default `850px` sheet
  remains `850px` rather than being widened.
- VERIFIED LOCAL: `test:build-doc-bundle`, `lint`, production `build`,
  `ci:verify`, both-mode preview/edit visual smoke (`0%` for all three
  anonymous fixtures), strict imported-edit sync, persistent preview surface,
  and edit-flow smoke all pass after the change.
- VERIFIED EXTERNAL (already authorized dedicated Sandbox only): the measured
  anonymous modern synthetic sheet still has an authored root of `850x220px`
  inside an `860x240px` `.charactersheet` wrapper. The dedicated Sandbox had
  exactly one visible member before use. No existing room was selected or
  modified.
- VERIFY: the external root image comparison remains a diagnostic `2.88%`
  mismatch after DPR-corrected capture. This wrapper adjustment is not being
  counted as external visual parity, and it does not close the separate
  legacy-room gate.
- SAFETY: an existing room is eligible only after a fresh visible participant
  preflight confirms exactly one member. Any room with more than one member or
  an unreadable participant count is excluded from upload, save, chat, and
  settings operations.

## 2026-07-29 Participant Preflight Safety Gate

- ADDED: `scripts/roll20_room_participant_preflight.mjs` is a read-only CDP
  helper for existing-room checks. It parses the visible participant count,
  returns `PASS_SOLO` only for exactly one count, and blocks unknown,
  ambiguous, or multi-member pages.
- VERIFIED LOCAL: `test:roll20-room-members` self-test covers one-member,
  multi-member, missing-count, and ambiguous-count cases. The helper does not
  navigate, upload, save, open a character, click a roll, or change settings.
- ADDED GUARD: the CDP upload helper accepts `--require-solo-room` and repeats
  the fresh check on the current editor page before navigating to settings or
  evaluating an upload snippet. Sandbox and legacy-room evidence remain
  separate destinations.
- BOUNDARY: this is a safety gate, not evidence that any current external room
  is eligible. A fresh live preflight is still required immediately before a
  legacy-room operation.

## 2026-07-29 Existing Room Selection Safety

- FIXED: `apply:roll20-upload-cdp --require-solo-room` no longer falls back to
  an arbitrary Roll20 tab. It proceeds only when exactly one `/editor` page is
  open, then rechecks that page's visible participant count before navigation
  and immediately before the write.
- FIXED: the CDP helper disconnects its automation client instead of closing
  the user's Chrome session or any open Roll20 room.
- VERIFIED LOCAL: upload helper and participant preflight self-tests,
  `ci:verify`, lint, build, and server hygiene pass. No existing room was
  opened or modified by this change.

## 2026-07-29 Untyped Script Runtime Boundary

- FIXED: worker classification now uses one shared source boundary. Explicit
  `type="text/worker"` scripts always enter the worker workspace; untyped
  scripts enter it only when they visibly use Roll20 worker APIs.
- FIXED: ordinary untyped page JavaScript remains an HTML raw block and is
  preserved through export instead of being silently treated as a worker.
  Preview runtime CSS still hides script nodes from the sheet surface.
- VERIFIED LOCAL: high-priority import tests `22/22`, emit contract, worker
  workspace smoke, worker-source audit for three prepared local fixtures, and
  runtime visibility verification all pass. The runtime bundle reports no
  console issues or page errors.
- BOUNDARY: this does not claim arbitrary JavaScript is block-editable yet.
  It establishes the safe raw-preservation boundary for the future JS
  workspace. Actual Roll20 modern screenshot parity and the separate legacy
  room remain `VERIFY`.
## 2026-07-29 Roll20 Runtime Evidence And Translation Upload Gate

- VERIFIED ACTUAL: The connected test room showed exactly `1 구성원`; the
  anonymous synthetic sheet rendered in its Roll20 iframe and one roll reached
  chat as the `Test` rolltemplate with visible results `5`, `7`, and `11`.
- SAFETY: This was an isolated one-member test path. No existing multi-user or
  unreadable-participant room was opened, edited, uploaded to, or used for
  chat verification.
- FINDING: Roll20's visible Sheet Sandbox Tools dialog currently shows a
  translation JSON parse error. The attempted development-fixture file
  selection did not complete, so no real fixture upload or parity claim is
  recorded.
- DONE: Export translation normalization now emits only a flat string map and
  turns unsupported/malformed input into an empty safe map. Export warnings and
  the local payload audit cover this boundary.
- VERIFIED LOCAL: Translation payload tests, export smoke, lint, fresh local
  payload generation, and payload audit pass for the three ignored
  development fixtures.
- NEXT P0: Reconnect the exact one-member Roll20 test room, clear/identify the
  Sandbox translation error, then apply one ignored fixture and capture fresh
  actual sheet + chat evidence. Keep modern and legacy results separate.
- BLOCKED ACTION: The exact room was reopened and still showed `1 구성원`, but
  the browser file chooser returned `Not allowed` and raw CDP reported the file
  input command as unsupported. No fixture was selected or uploaded. The
  unrelated `7팀` Chrome window was not inspected or used.
## 2026-07-29 Current safety gate reaffirmation

- RULE: Do not select an existing Roll20 room from its name, history, or
  availability. Read the fresh visible `.party-page-members` indicator first.
  Exactly `1` active participant is the only eligible read-only observation
  state and is treated as the signed-in user alone. Any `0`, `2+`, hidden,
  missing, unreadable, or ambiguous result excludes the room because another
  user may be present.
- RULE: Existing rooms never receive generated sheet uploads, saves, chat
  rolls, or settings changes. Use Custom Sheet Sandbox or a newly created
  dedicated test room for generated writes.
- VERIFIED LOCAL: `preflight:roll20-room-members -- --self-test` and the
  upload-guard self-test pass. The current CDP preflight found no targets, so
  no existing room was opened or modified.

## 2026-07-29 Performance Gate Update

- DONE LOCAL: Browser Blockly repaint is deferred to the next animation frame
  after structural mutation. The 6000-node persistent smoke still emits a
  structural `patch` in both modern and legacy modes without reload or patch
  fallback.
- VERIFIED LOCAL: Commit work measured approximately `13-15ms`, optimistic
  placement stayed below `35ms`, and browser/page errors remained `0`.
- VERIFY OPEN P0: Final pointer-to-ack remains approximately `193.7ms` modern
  and `169.9ms` legacy in the latest run. The queued emit gap and browser ack
  path still require measurement and reduction; this is not complete.
- SAFETY: No Roll20 room was opened for this run. Existing-room observation
  remains eligible only after a fresh visible participant count of exactly `1`.

## 2026-07-29 Workspace Cleanup Gate

- DONE LOCAL: Created `01_ACTIVE/`, `02_REFERENCE/`, `03_ARCHIVE/`, and
  `04_LOCAL/` navigation zones at the parent workspace.
- DONE LOCAL: Removed generated root temp/cache/log folders and active ignored
  `.tmp/`, `.next/`, `out/`, and report subfolders. No protected source folder
  or active Git worktree was deleted.
- DONE LOCAL: Preserved the old single-file viewer/editor and backups under
  `03_ARCHIVE/legacy-single-file/`; the old legacy branch remains in Git after
  its physical worktree was removed.
- VERIFY OPEN: Compatibility roots remain at the parent level because legacy
  viewer and baseline-generation paths still reference them. A future move
  needs a dedicated path migration plus lint/build/smoke verification.
- VERIFY OPEN: Roll20 actual-screen parity is unchanged. The browser reached a
  login/Cloudflare gate, so no existing room was selected and no participant
  count was claimed.
## 2026-07-29 Local flow-drag acceptance update

- DONE LOCAL: The persistent iframe acceptance smoke now performs a real
  pointer drag of one rendered object after another and verifies immediate
  order, no optimistic rollback, emitted HTML order, layer parent/previous
  relations, and final iframe order after the live patch.
- VERIFIED LOCAL: `smoke:edit-flow`, `ci:verify`, lint, build,
  `smoke:persistent-preview-surface`, strict imported edit-sync, and
  modern/legacy preview-edit visual smoke pass. Server hygiene reports no
  project or CDP listeners.
- VERIFY: This is local synthetic/edit synchronization evidence only. Actual
  Roll20 Sandbox modern parity and dedicated legacy-room parity remain open;
  no existing room was opened or modified because the current CDP preflight
  found zero targets.
- NEXT P1: Extend the same direct iframe acceptance coverage to parent-relative
  free placement and nested-container extraction on imported structures, then
  compare the resulting normalized state against isolated Roll20 destinations.
## 2026-07-29 Parent-relative placement update

- DONE LOCAL: Direct iframe acceptance now covers nested-child extraction to a
  root sibling and re-entry into a frame with free placement. It verifies
  layer order, parent-relative containing-block behavior, computed absolute
  position, emitted managed CSS, and HTML nesting.
- VERIFY: This does not yet prove every imported DOM structure or actual
  Roll20 modern/legacy parity. Continue with imported nested-container cases
  and isolated Sandbox/dedicated legacy-room evidence when CDP is available.

## 2026-07-29 Semantic Mapping Update

- DONE: Standard semantic HTML containers now import into an editable generic
  block with tag/class/style/attribute/child-order preservation.
- VERIFY: Imported nested-container browser coverage and actual Roll20
  modern/legacy screenshot parity remain open.
- SAFETY: Existing rooms remain observation-only and require a fresh visible
  participant count of exactly one; generated writes stay in Sandbox or a new
  dedicated test room.

## 2026-07-29 Generic Element Update

- DONE: Safe unknown HTML elements now have editable tag/class/style/child
  structure through `r20_element_container`.
- VERIFY: Opaque runtime/document tags, arbitrary JS editing, and real Roll20
  modern/legacy parity remain separate verification tracks.

## 2026-07-29 Generic Element Browser Acceptance

- DONE: Anonymous production browser smoke covers custom element, anchor, SVG,
  and path import as editable generic blocks, attribute preservation, direct
  edit/preview synchronization, and re-import stability.
- VERIFY: Strict resource gating can still be blocked by a transient external
  development-fixture asset request; this is tracked separately from the
  interaction result. Actual Roll20 modern/legacy parity remains open.
## 2026-07-29 Local fresh-sheet and edit-flow regression refresh

- VERIFIED LOCAL: A new workspace starts without the ghost `sheet-section`;
  the first widget placement smoke also passed.
- VERIFIED LOCAL: The browser edit-flow smoke passed.
- VERIFIED LOCAL: Preview/edit visual smoke passed for three anonymous fixtures
  in modern and legacy modes; all six comparisons were `0%` / `EXACT`.
- CLAIM BOUNDARY: These are local renderer and interaction gates only. They do
  not prove actual Roll20 Sandbox or legacy-room parity.
- NEXT P0: Keep the Roll20 upload gate separate and obtain actual root,
  screenshot, and chat evidence through the isolated Sandbox.
## 2026-07-29 JavaScript runtime boundary contract

- DOCUMENTED: Ordinary page scripts remain HTML raw source, stay inert in
  preview/edit, and are preserved for export. Roll20 worker scripts remain a
  separate runtime boundary.
- DOCUMENTED: A future generic JS workspace must preserve script order,
  attributes, raw fallback, and parent-document isolation before it can move
  scripts out of HTML.
- CLAIM BOUNDARY: This records the current contract; it does not claim that a
  generic JS block workspace or arbitrary page-JS sandbox exists yet.
- NEXT P1: Design a script-record model and roundtrip tests before implementing
  generic JS blocks.
## 2026-07-29 Roll20 Sandbox chooser retry

- VERIFIED READ-ONLY: The logged-in Roll20 editor showed the isolated Sheet
  Sandbox Tools surface and a visible `1 구성원` participant count. The room
  was not otherwise edited.
- BLOCKED: The supported file chooser opened from the visible HTML label, but
  assigning the local HTML file was rejected with `Not allowed`. No HTML, CSS,
  or translation payload was transmitted and no screenshot was counted.
- CURRENT EVIDENCE: Generated actual remains `0/6`; room observation remains
  `0/3`.
- NEXT P0: Use the open Sandbox handoff with a user-visible file selection,
  then capture positive root DOM/screenshot evidence before chat or diff.
## 2026-07-29 Page-script order regression

- FIXED TEST COVERAGE: The emit contract now asserts that ordinary page
  scripts remain between their surrounding HTML nodes and that the separate
  worker workspace contributes exactly one worker script.
- VERIFIED: `emit-contract`, `ci:verify`, lint, build, and server hygiene pass.
- CLAIM BOUNDARY: This protects local source/export behavior; it is not actual
  Roll20 visual parity or generic JS block-workspace support.

## 2026-07-30 Local Blockly mount and renderer smoke refresh

- FIXED LOCAL: `next.config.ts` now explicitly allows the local `127.0.0.1`
  development origin. The in-app browser no longer renders only the SSR shell
  without hydrating the Blockly surface.
- FIXED LOCAL: `BlocklyModelHost` exposes a non-visual mount state for browser
  diagnostics and reports initialization failures without changing the sheet
  render contract. The dynamic Blockly split remains in place.
- VERIFIED LOCAL: At `127.0.0.1`, the host reached `ready`, mounted four
  workspace slots and 28 SVG nodes, switched into block-assembly mode, and
  produced zero browser console errors.
- VERIFIED LOCAL: lint, production build, `ci:verify`, persistent preview
  surface for modern/legacy, and the six-case anonymous preview/edit visual
  matrix all passed. The visual matrix reported `0%` mismatch for every case.
- PARTIAL: Strict imported-edit synchronization passed 4 of 5 anonymous
  cases. The remaining large case passed initial import, pointer edit,
  preview synchronization, and resource checks, but failed the reimport
  stability gate because emitted HTML order drifted after reimport. Keep this
  as VERIFY; it is not a universal import/edit completion claim.
- NEXT P0: Obtain positive modern Sandbox root/DOM/screenshot/chat evidence and
  separate legacy dedicated-room evidence.
- NEXT P1: Trace the remaining deterministic reimport HTML-order drift in the
  large anonymous fixture before widening the import/edit completion claim.

## 2026-07-30 User-authorized cleanup retry

- VERIFY: Rechecked nine exact generated/stale workspace targets after
  stopping project listeners. They are untracked and outside protected roots;
  active dependencies, fixtures, final reports, and both worktrees were
  excluded.
- BLOCKED BY HOST: The guarded recursive deletion was rejected before
  execution by the host safety policy. No alternate shell, per-file workaround,
  or safety bypass was used. All nine targets remain on disk.
- NEXT: Retry only if the host exposes an approved maintenance deletion path;
  do not claim cleanup complete until post-delete existence and worktree checks
  pass.

## 2026-07-30 Imported edit round-trip repair

- DONE: Guarded free placement against invalid table reparenting. Existing
  table-cell parents are preserved while direct child placement into table
  rows/sections is validated by element type.
- DONE: Full strict imported-edit browser matrix passes (`5/5` anonymous
  cases). The large case passes canonical edit, preview/edit sync, resource
  loading, and emit/reimport stability (`7,290` HTML blocks, `100%` structural
  match).
- VERIFY: The browser result is local evidence only. Positive modern Sandbox
  root/screenshot/chat evidence and isolated legacy-room evidence remain
  required before claiming Roll20 parity.
- NEXT P0: Obtain positive modern Sandbox root/DOM/screenshot/chat evidence and
  separate legacy dedicated-room evidence.
- NEXT P1: Keep the Figma-style layer/drop UX validation separate from renderer
  parity and widen it with synthetic container/table cases.

## 2026-07-30 Mode-aware layer-panel drop guard

- DONE LOCAL: Layer-panel `inside`, `before`, and `after` drops now validate
  the actual insertion parent before any Blockly mutation. Table row/section
  rules are applied during dragover and again at drop time.
- VERIFIED LOCAL: Layer-role, iframe-drop-target, Blockly layer-operation,
  lint, build, and edit-flow browser smoke all pass.
- CLAIM BOUNDARY: This proves the local layer-panel guard, not complete Figma
  interaction parity or actual Roll20 visual parity.
- NEXT P1: Add a browser acceptance case that drags valid and invalid table
  children through the visible layer panel and confirms the target highlight
  matches the final mutation.

## 2026-07-30 Roll20 Sandbox read-only baseline retry

- VERIFIED READ-ONLY: A fresh Roll20 editor tab loaded the visible Sandbox
  tools with exactly `1` participant. The dialog exposes separate `.html`,
  `.css`, and `.json` file inputs, and the room chat shows Roll20 table-based
  roll output with inline dice markup.
- VERIFIED LOCAL: An anonymous synthetic fixture was imported and exported
  through the product's local baseline path; its generated HTML/CSS/translation
  payload is ready in ignored local evidence.
- BLOCKED: The browser file chooser rejected both Playwright file assignment
  and the visible file-picker path attempt with `Not allowed`. No generated
  payload was transmitted to Roll20 and no actual generated-sheet screenshot
  or chat result is counted.
- NEXT P0: Complete the Sandbox upload through a user-visible file selection
  or an approved browser upload path, then capture positive root, screenshot,
  and chat evidence. Keep legacy verification in a separate dedicated room.

## 2026-07-30 Disposable evidence cleanup

- DONE: Purged the local `test-fixtures/` tree and generated `reports/`
  contents after the user-authorized retry.
- VERIFY: local Roll20/fixture evidence must be regenerated before it is used
  for a new report; no previous screenshot or payload is treated as current.
- PRESERVED: source code, active dependencies, protected external sources,
  Git worktrees, and the report README.

## 2026-07-30 Modern Sandbox upload continuation

- VERIFIED LOCAL: One anonymous modern payload was regenerated under ignored
  `.tmp/` storage and passed the local baseline.
- VERIFY/BLOCKED: Roll20 file input still rejects both supported chooser
  assignment and visible file-picker typing. No actual generated-sheet
  screenshot or chat evidence exists yet.
- NEXT P0: Complete the user-visible Sandbox file selection, then capture fresh
  root DOM, screenshot, and roll/chat evidence before comparing to local output.

## 2026-07-30 Generic table mapping regression

- DONE: Generic input-only table rows no longer collapse into `skill_row`; the
  original cell and input layers remain available to the editor.
- VERIFIED: Focused import tests, full lint/build/CI verification, and the edit
  flow browser smoke all pass.
- VERIFY: Actual modern Sandbox upload is still blocked by the browser file
  chooser boundary; no Roll20-generated screenshot or chat evidence exists.
- VERIFY: Legacy mode still requires the separate dedicated test-room path.
- CLEANUP: The user-authorized stale `.tmp` evidence purge was attempted again
  but the host rejected the explicit deletion command before execution. The
  disposable evidence remains local and uncommitted.

## 2026-07-30 Layer-panel table drop acceptance

- DONE: Browser smoke now checks both valid table-cell insertion and invalid
  direct row insertion, including final layer-parent state.
- VERIFIED: `smoke:edit-flow` passes with no console/page errors.
- CLAIM BOUNDARY: This validates local layer-panel behavior only; actual modern
  Sandbox and isolated legacy-room parity remain open.

## 2026-07-30 Sandbox upload route retry

- VERIFY/BLOCKED: The Sandbox participant preflight remains exactly one, but
  native file assignment and the restricted browser evaluation route cannot
  submit the local payload. No actual generated-sheet root, screenshot, or
  chat evidence is counted.
- NEXT P0: Complete a user-visible upload or CDP-enabled browser handoff, then
  capture activation, root DOM, screenshot, and roll/chat evidence.

## 2026-07-30 Cleanup retry boundary

- CLEANUP BLOCKED: A further user-authorized retry targeted only generated
  `.next/`, `out/`, `.tmp/`, `reports/edit-flow-smoke/`, and
  `tsconfig.tsbuildinfo` after confirming no project listener was active. The
  host rejected the guarded deletion before execution; no cleanup completion
  is claimed and no deletion workaround was used.

## 2026-07-30 Production chat diagnostic boundary

- DONE LOCAL: Rolltemplate candidate overrides are disabled in production even
  when a stale `__r20ChatDiagnostics` localStorage flag exists. User-authored
  rolltemplate CSS and the common Roll20 chat shell remain the default path.
- VERIFIED: lint, production build, and `ci:verify` all pass.
- CLAIM BOUNDARY: This prevents fixture-specific diagnostic CSS from affecting
  deployed users; it does not prove modern Sandbox or legacy-room visual parity.

## 2026-07-30 Cleanup retry boundary

- CLEANUP BLOCKED: The user authorized another retry for the five verified
  generated targets under `web-push-main/`, but the host rejected the guarded
  recursive deletion before execution. No target was removed and no safety
  bypass was used.
- VERIFY: the targets remain local-only disposable output; source roots,
  `node_modules/`, Git worktrees, and user-authored inputs were preserved.

## 2026-07-30 Roll20 manual upload payload boundary

- DONE LOCAL: Export now derives individual `sheet.html`, `sheet.css`, and
  `translation.json` files through one shared payload function. ZIP and manual
  file downloads therefore use the same internal-ID removal, translation
  normalization, and legacy CSS transform.
- VERIFIED LOCAL: `test:roll20-upload-files`, lint, build, and `ci:verify` pass;
  no private fixture or real sheet source was added.
- VERIFY/BLOCKED: The new download path has not yet been accepted by the live
  Roll20 Sandbox file chooser. Actual generated root, screenshot, and chat
  evidence remain absent until a user-visible upload route succeeds.
- NEXT P0: Use the individual files in the isolated Sandbox, then capture
  positive activation/root/screenshot/chat evidence before claiming parity.

## 2026-07-30 Sandbox chooser recheck

- VERIFIED READ-ONLY: The Roll20 Sandbox tab showed exactly one visible
  participant and the expected upload controls.
- BLOCKED: The CUA file-picker path attempt returned to the page, but the
  HTML file input remained empty. No generated payload was accepted and no
  root, screenshot, or chat evidence is counted.
- SAFETY: No existing room or sheet settings were modified.
- NEXT P0: Complete a user-visible file selection or use a browser capability
  that explicitly supports file-input assignment, then recapture all evidence.

## 2026-07-30 Cleanup retry result

- CLEANUP BLOCKED: the user explicitly authorized another deletion attempt for
  the five verified generated targets, but the host rejected the guarded
  recursive command before execution even after path-containment and listener
  checks passed.
- VERIFY: `.next/`, `out/`, `.tmp/`, `reports/edit-flow-smoke/`, and
  `tsconfig.tsbuildinfo` remain local-only disposable output.
- SAFETY: no deletion workaround was used; source roots, `node_modules/`, Git
  worktrees, and user-authored inputs remain preserved.

## 2026-07-30 User-facing import smoke

- DONE: Normal-sized imports now use synchronous hydration while large imports
  retain chunked hydration and progress feedback. The dialog registers blocks
  before hydration and its action buttons are explicit non-submit controls.
- VERIFIED: `pnpm run smoke:import-dialog` passed with 3 HTML blocks, preserved
  class/attribute output, one preview iframe, zero console errors, and zero
  page errors. `pnpm run ci:verify` also passed.
- VERIFY/BLOCKED: Real Roll20 Sandbox upload/root/screenshot/chat evidence is
  still absent because the browser file chooser has not accepted the payload.
- NEXT P0: Complete a supported user-visible Sandbox upload, then capture
  positive activation, root DOM, screenshot, and roll/chat evidence. Legacy
  mode still needs its isolated dedicated-room check.

## 2026-07-30 Sandbox retry and renderer regression checks

- VERIFY/BLOCKED: The isolated Roll20 editor still reports exactly one visible
  member, but three visible file-picker path strategies left `#sheetHtml`
  empty. No payload was accepted and no actual Roll20 evidence is counted.
- VERIFIED LOCAL: `smoke:edit-flow`, modern/legacy persistent-preview smoke,
  and `smoke:legacy-preview` pass.
- CLAIM BOUNDARY: Local renderer and preview/edit synchronization are covered;
  actual Roll20 visual parity, root DOM, and roll/chat parity remain open.
- NEXT P0: Obtain a supported CDP endpoint or complete a user-visible manual
  file selection; then run activation, sheet-frame, screenshot, and chat
  probes. Legacy mode must be checked only in an isolated dedicated room.

## 2026-07-30 Direct manipulation follow-up

- DONE LOCAL: The persistent iframe now keeps the optimistic pointer transform
  through the authoritative HTML/style patch and clears it only after the
  patch is applied. CSS-only updates no longer cancel an active drag preview
  and briefly paint the old position.
- DONE LOCAL: Gallery drops now commit the same target that is visibly offered.
  In free placement, hidden before/after flow targets cannot silently become
  structural inserts; only a visible inside target can create an
  absolute-in-container widget.
- VERIFIED LOCAL: `test:build-doc-bundle`, `test:iframe-drop-target`,
  `smoke:edit-flow` (including the free gallery-drop regression),
  `smoke:imported-edit-sync`, and
  `smoke:persistent-preview-surface` pass.
- CLAIM BOUNDARY: This narrows local drag flicker and free-drop behavior only;
  actual Roll20 modern/legacy parity and Sandbox upload evidence remain open.

## 2026-07-30 Large workspace structure browser

- DONE LOCAL: Large imports keep the Blockly model headless instead of creating
  one SVG node per block. A virtualized structure browser now shows the active
  workspace hierarchy, category color, authored preview value, and total count.
- DONE LOCAL: Selecting a row uses the existing `tree` selection origin, so the
  normal Inspector can edit the selected block without creating a second model
  or render surface. Search now prefers authored field values over Blockly's
  static field labels.
- VERIFIED: `corepack pnpm run smoke:large-workspace-browser` passed with a
  synthetic 5,200-input import: `headless-large`, 5,200 model blocks, 17
  visible virtual rows, 0 SVG blocks, search of the last item, one selected
  row, and 0 console/page errors. `lint` and `build` also pass.
- CLAIM BOUNDARY: This proves the large-workspace navigation/selection guard,
  not full virtualized Blockly drag editing or actual Roll20 parity. The
  modern Sandbox upload and isolated legacy-room checks remain open.
- NEXT P0: Add real imported large-sheet subtree movement coverage to the
  lightweight browser, then resume supported Roll20 Sandbox upload evidence.

## 2026-07-30 Large workspace edit-surface follow-up

- VERIFIED LOCAL: The 5,200-input synthetic import now switches into edit mode
  without mounting a second sheet renderer. `smoke:large-workspace-browser`
  reports `editOwner=persistent-iframe`, one preview iframe, 20 virtualized
  layer rows, zero retired Shadow edit hosts, a hidden empty EditCanvas slot,
  one selected layer row, and zero console/page errors.
- CLAIM BOUNDARY: This proves large-workspace edit-surface availability and
  layer navigation. It does not yet prove imported non-leaf subtree movement
  at this scale or actual Roll20 modern/legacy parity.
- NEXT P0: Add an anonymous imported nested corpus case that exercises
  subtree reparenting through the virtualized layer surface, then resume the
  supported Roll20 Sandbox upload path.

## 2026-07-30 Large workspace nested reparenting

- DONE LOCAL: The anonymous large corpus now contains a nested root, source
  frame, target frame, and 5,200 flat inputs without using a real sheet or
  public fixture.
- VERIFIED LOCAL: `smoke:large-workspace-browser` imported 5,205 blocks with
  `headless-large`, 17 structure rows, 20 virtual edit-layer rows, one
  persistent iframe, zero SVG blocks, and zero console/page errors.
- VERIFIED LOCAL: A real layer-panel `inside` drop changed the source parent
  ID to the target ID. The emitted HTML and the iframe body both contain the
  normalized Roll20 class nesting `.sheet-large-target .sheet-large-source`.
  The layer model and iframe therefore agree after the reparenting mutation.
- CLAIM BOUNDARY: This proves one anonymous nested large-workspace path. It
  does not prove every imported DOM shape, worker runtime, or actual modern
  Roll20 Sandbox/legacy-room visual parity.
- NEXT P0: Complete supported modern Sandbox upload evidence, then perform
  the isolated legacy-enabled test-room comparison without touching rooms with
  more than one visible participant.

## 2026-07-30 Generated-output cleanup

- DONE LOCAL: After path-containment, reparse-point, and listener checks, the
  user-authorized disposable targets `.next/`, `out/`, `.tmp/`,
  `reports/edit-flow-smoke/`, and `tsconfig.tsbuildinfo` were removed.
- PRESERVED: Source roots, `node_modules/`, Git worktrees, and user-authored
  sheet inputs were not touched. No tracked file changed in the cleanup.

## 2026-07-30 Roll20 Sandbox upload boundary

- VERIFIED READ-ONLY: The logged-in Roll20 editor exposed the dedicated Sheet
  Sandbox dialog and a fresh visible participant count of exactly one.
- DONE LOCAL: Added `generate:roll20-sandbox-synthetic`, which uses the shared
  export payload boundary to create only anonymous `sheet.html`, `sheet.css`,
  and `translation.json` files under ignored `.tmp/` storage.
- BLOCKED EXTERNAL: The supported file chooser event opened, but its file
  assignment was rejected by the browser connection. The official raw-CDP
  path also refuses `DOM.setFileInputFiles` in this surface. All three input
  file lists remained empty, so no generated sheet root, screenshot, roll, or
  chat evidence is counted.
- SAFETY: No existing room or sheet settings outside the dedicated Sandbox
  were changed. Leave the Sandbox tab available for a user-visible manual
  file selection handoff.

## 2026-07-30 Retired Shadow smoke guard

- DONE LOCAL: `scripts/imported_edit_sync_smoke.mjs` now rejects the obsolete
  `--canonical-iframe=false` branch instead of allowing a retired Shadow edit
  surface to produce a misleading pass.
- VERIFIED LOCAL: `node --check scripts/imported_edit_sync_smoke.mjs` and
  `corepack pnpm lint` pass. The rejected branch exits with the explicit
  retired-surface error before starting a server or writing a report.
- VERIFY OPEN: `audit:worker` was not run because the protected private
  `test-fixtures/visual` input is absent after generated/private-fixture
  cleanup; the anonymous `smoke:worker` contract passed instead.
- CLAIM BOUNDARY: This only hardens the local verification target. It does not
  prove generic page-JS block editing or actual Roll20 modern/legacy parity.

## 2026-07-30 Script source classification boundary

- DONE LOCAL: Added one shared script-source classifier for explicit Roll20
  worker tags, legacy untyped worker API scripts, and ordinary page scripts.
  The worker workspace now consumes this classifier instead of maintaining a
  second extraction rule.
- VERIFIED LOCAL: Import structure is `39/39`; build, lint, synthetic worker
  workspace smoke, preview page-script inertness, and modern/legacy render
  contract tests pass.
- CLAIM BOUNDARY: Ordinary page JS is still preserved/inert rather than
  user-editable as a dedicated JS block workspace. Future JS workspace work
  can consume the shared source contract without changing HTML/CSS mapping.
- VERIFIED GATE: `corepack pnpm run ci:verify` passed, including the new
  script-source classification assertions and the privacy/evidence guards.

## 2026-07-30 Editable page-JS boundary

- DONE LOCAL: Ordinary page scripts now import as `r20_raw_page_js` blocks
  with editable attributes and body fields. They remain outside the worker
  workspace and export as ordinary `<script>` tags.
- VERIFIED LOCAL: Page-JS import is `40/40`; emit-contract, build-doc bundle,
  lint, production build, and the full `corepack pnpm run ci:verify` gate pass.
- VERIFIED LOCAL: The preview builder strips ordinary page scripts while
  retaining Roll20 worker scripts, so imported page JS cannot execute in the
  editor iframe.
- CLAIM BOUNDARY: This is an editable page-JS block, not a separate dedicated
  JS workspace yet. Actual modern Sandbox and isolated legacy-room visual or
  runtime parity remain VERIFY/BLOCKED_EXTERNAL.
- NEXT P0: Keep the page-JS block source contract stable while implementing a
  dedicated JS workspace only after its autosave/export/runtime boundaries are
  specified and tested.

## 2026-07-30 Modern/legacy export audit refresh

- DONE LOCAL: Repaired the legacy export audit's stale `ExportDialog` static
  assertions to follow the current `prepareRoll20UploadFiles(..., { legacy })`
  boundary instead of requiring a removed direct sanitizer import.
- VERIFIED LOCAL: `corepack pnpm run audit:legacy-export` passes all synthetic
  sanitizer and ExportDialog routing assertions; the audit is now included in
  `corepack pnpm run ci:verify`.
- VERIFY OPEN: Payload/sandbox audits that consume historical actual-report
  roots cannot run after local evidence cleanup. They remain evidence-driven
  diagnostics, not a reason to recreate or publish private fixtures.
- BLOCKED_EXTERNAL: CDP preflight self-test passes, but no local CDP endpoint
  is currently listening, so no fresh modern Sandbox or isolated legacy-room
  screenshot/runtime evidence is counted.

## 2026-07-30 Dedicated Page-JS workspace

- DONE LOCAL: Ordinary page `<script>` tags now split into a dedicated `js`
  workspace as `r20_raw_page_js` blocks. HTML keeps only an internal source
  slot, which is hidden from the user-facing block catalog.
- DONE LOCAL: Emit merges imported scripts back into their original HTML slot;
  scripts without a slot are appended after the HTML body. Deleting an
  imported JS block removes its old script instead of leaving an anchor.
- DONE LOCAL: Autosave, workspace mounting, code tabs, inspector labels, and
  emit cache include the `js` workspace. Preview still strips ordinary page JS
  and keeps Roll20 worker scripts in their separate runtime boundary.
- VERIFIED LOCAL: import structure `40/40`, emit-contract, lint, full
  `corepack pnpm run ci:verify`, and the Roll20 upload-file payload test pass.
- CLAIM BOUNDARY: This proves local import/edit/emit separation and source-order
  reconstruction. It does not prove actual Roll20 Sandbox or isolated legacy
  room parity; those remain `VERIFY/BLOCKED_EXTERNAL` while CDP is unavailable.

## 2026-07-30 Script normalization safety follow-up

- DONE: Protected authored page and worker scripts from the final HTML
  class/id prefix pass so JavaScript strings and script attributes are not
  rewritten as sheet markup.
- VERIFIED: prefix regression, import 40/40, emit contract, lint, full
  ci:verify, production build, fresh-sheet smoke, and persistent preview
  surface smoke. Modern and legacy local iframe mode checks both passed with
  zero console/page errors.
- VERIFY OPEN: Real Roll20 Sandbox upload/render/chat evidence is still
  missing. The authenticated Chrome editor tab was left untouched after its
  heavy DOM request timed out; no existing room was used.
- VERIFY OPEN: broad imported visual fixture smoke is intentionally not run
  while the private test-fixtures/visual tree is absent.

## 2026-07-30 Sandbox upload path recheck

- VERIFIED READ-ONLY: The authenticated editor exposed the dedicated Sheet
  Sandbox Tools dialog and separate HTML/CSS/Translation controls.
- BLOCKED EXTERNAL: The supported file chooser opened, but the connected
  browser rejected assignment of the generated anonymous HTML file. No
  Sandbox file, existing room, sheet source, chat message, or setting changed.
- VERIFY OPEN: Modern same-payload root/screenshot/asset/chat evidence and the
  isolated legacy-room comparison remain unproven.
- NEXT P0: Use a user-visible native picker or another explicitly supported
  upload path; do not treat the chooser opening alone as a successful upload.

## 2026-07-30 Layer ordering contract coverage

- DONE LOCAL: Added anonymous unit coverage for `after`, `inside`, and cycle
  rejection in the Blockly layer adapter.
- VERIFIED LOCAL: layer-role, iframe drop-target, history, and layer-operation
  tests pass. The local editor contract now has explicit before/after/inside
  and cycle-safety evidence.
- VERIFIED CLEANUP: All nine approved disposable/stale targets from the
  cleanup ledger are absent; active dependencies, source roots, and retained
  report policy are preserved.
- VERIFY OPEN: This does not prove every preview/edit visual state, actual
  Roll20 modern Sandbox parity, or isolated legacy-room parity.
- NEXT P0: Re-enter the supported Sandbox upload path with a user-visible
  file selection, then capture same-payload root, asset, default-state,
  rolltemplate/chat, and screenshot evidence. Keep legacy verification in a
  newly created dedicated test room only.

## 2026-07-30 Disposable output purge retry

- DONE LOCAL: After the user's explicit authorization, removed the remaining
  empty `.tmp/` parent and ignored `reports/legacy-export-audit/` generated
  output. Both paths were resolved inside `web-push-main` before deletion.
- VERIFIED CLEANUP: no `.tmp/` or `reports/legacy-export-audit/` remains;
  tracked reports, dependencies, source roots, worktrees, and external sheet
  sources were preserved. This cleanup does not change the Roll20 render
  verification status.
- VERIFY OPEN: Modern Sandbox render/chat evidence and isolated legacy-room
  parity are still unproven; the next external run must recreate ignored
  evidence rather than commit it.

## 2026-07-30 Actual Roll20 modern/legacy synthetic parity

- VERIFIED ACTUAL MODERN: In the authenticated dedicated Custom Sheet Sandbox,
  an anonymous HTML/CSS/translation payload was accepted through the supported
  file-change path. A newly created Sandbox character rendered one iframe with
  a `860 x 200px` sheet root and a `420 x 180px` proof element. Translation
  changed `[name]` to `Name`, and its roll button produced a `Sandbox proof`
  chat table with a result cell.
- VERIFIED ACTUAL LEGACY: A new dedicated `Custom` test room was created with
  exactly one visible participant. Its saved `legacy_sanitization` option was
  enabled, the same anonymous payload was stored, and a new character rendered
  one iframe with the same `860 x 200px` root and `420 x 180px` proof element.
  Translation and the same roll/chat table were also observed.
- VERIFIED PARITY SCOPE: The sampled root/proof rectangles and computed fields
  matched between modern Sandbox and legacy room with `0` reported differences.
  This is a synthetic same-payload parity check, not proof for every imported
  sheet or every Roll20 state.
- CONSOLE BOUNDARY: The browser tabs contained Roll20/extension-generated
  warnings and errors, including missing built-in rolltemplate messages and
  legacy jQuery notices. No sheet-specific render or roll error was observed,
  but the external tab cannot be reported as console-clean.
- COPYRIGHT: Screenshots and anonymous JSON evidence were used only as
  ignored local evidence and were purged after verification; no private or
  copyrighted sheet source, identifier, or screenshot is committed.
- NEXT P0: Compare the local preview/edit surface against this external
  synthetic contract, then run a user-provided local fixture through the same
  ignored-only pipeline without publishing its source or evidence.

## 2026-07-30 Roll20 root-height reconciliation

- DONE LOCAL: The shared iframe resize runtime now uses the larger of the
  authored `.charactersheet` root height and the measured descendant paint
  bounds. It no longer adds an unconditional `24px` tail to every sheet;
  absolutely positioned or transformed descendants that extend beyond the
  root remain included.
- VERIFIED LOCAL: Anonymous synthetic preview/edit smoke passes in both
  modern and legacy modes with `0` mismatched pixels, exact DOM/style/geometry
  parity, a `850 x 200px` root, and `0px` edit host/content height delta.
  Edit-flow and persistent-surface smokes also pass for both modes; the
  6,500-block synthetic persistent run remains within its acceptance gate.
- VERIFIED GATES: `lint`, `build`, focused renderer tests, and `ci:verify`
  pass. The generated legacy audit report was local-only and is disposable.
- CLAIM BOUNDARY: The actual Roll20 synthetic probe measured an `860 x 200px`
  root inside a `900px` iframe, while the product's user-facing default canvas
  remains `850px`. Relative proof geometry matched, but viewport/root
  normalization is still open; this is not a universal visual-parity claim.
- NEXT P0: Define the normalized wrapper-versus-sheet comparison contract,
  then rerun one user-provided fixture only in ignored local evidence before
  changing generic width or Roll20 baseline rules.

## 2026-07-30 Legacy selector-specificity reconciliation

- VERIFIED ACTUAL: The dedicated anonymous modern Sandbox and legacy test-room
  payloads still share the same `860 x 200px` sheet root and `420 x 180px`
  proof element, but the legacy CSSOM applies the user roll-button rule under
  `.charsheet`, producing `margin: 12px 3px 0px`; modern keeps the baseline
  `margin: 0px 3px`. This is a mode-specific render contract, not a parity
  failure to hide.
- DONE LOCAL: Added `scopeRoll20LegacyCss()` to the shared render contract.
  Legacy preview/edit now scopes normalized user selectors below `.charsheet`
  while modern authored CSS remains unscoped. Conditional at-rules retain the
  same scope; existing `.charsheet` and rolltemplate selectors are not doubled.
- VERIFIED LOCAL: Anonymous preview/edit smoke passes in modern and legacy
  modes with `0` mismatched pixels, exact DOM/style/geometry parity, and the
  expected mode-specific button margins (`0px 3px` / `12px 3px 0px`). Prefix
  and build-doc regression tests pass; edit-flow and 6,500-block persistent
  preview-surface smokes also pass.
- VERIFIED GATES: `lint`, `build`, and full `ci:verify` pass after the change,
  including legacy export/sanitize and private-evidence guards.
- CLAIM BOUNDARY: This improves one externally observed legacy specificity
  axis. It does not prove full-sheet visual parity, state-selector behavior,
  assets, chat/template parity, or all-sheet import support. The `850px`
  local default root versus the external `860px` wrapper content width remains
  a separate normalization question.
- NEXT P0: Capture the normalized wrapper/root contract as a reusable report,
  then run one user-provided fixture through modern Sandbox and the dedicated
  legacy room using ignored-only evidence.

## 2026-07-30 Normalized wrapper/root geometry contract

- DONE TOOLING: Added `scripts/lib/roll20Geometry.mjs` with a versioned
  `iframe -> dialog -> form -> root -> content` CSS-pixel contract. It reports
  authored canvas dimensions separately from outer wrapper/context deltas and
  refuses parity promotion when parent-relative evidence is missing.
- VERIFIED ACTUAL: The anonymous modern and legacy Roll20 tabs both measured a
  `900px` iframe, `860 x 200px` form/root at a `20px` left inset, and an
  authored content box of about `840 x 180px`. Legacy still has the separate
  `12px` roll-button top margin.
- VERIFIED LOCAL: The same anonymous synthetic fixture rendered preview/edit
  exactly in both modes (`0` mismatched pixels). The local default measured an
  `850 x 200px` outer root with an `830 x 180px` content box, so the new
  comparator classifies the remaining difference as wrapper/content geometry,
  not as a selector or edit-overlay regression.
- VERIFIED GATES: geometry self-test, runtime-evidence self-test, `ci:verify`,
  lint, and build all pass. Evidence remains ignored and was not committed.
- CLAIM BOUNDARY: This is a measurement and promotion guard, not a production
  width change and not universal Roll20 visual parity. A user-provided fixture,
  full assets, default state, chat, and trusted screenshot crop remain open.
- NEXT P0: Decide the generic viewport/root width rule from one user fixture in
  both destinations; do not patch the baseline from the anonymous synthetic
  sample alone.

## 2026-07-30 Cleanup retry status

- `VERIFY / NOT DELETED`: the user-authorized retry targeted only regenerated
  `.next/`, `out/`, `.tmp/`, `next-env.d.ts`, and
  `reports/legacy-export-audit/` inside the canonical worktree.
- The host rejected the destructive operation before execution. All five
  targets remain present; no alternate deletion path was used.
- Server hygiene is clean: no project listener is active on the checked ports.
- NEXT P1: repeat the same exact cleanup only when the host permits recursive
  deletion; preserve `node_modules/`, source roots, fixtures needed for the
  active verification batch, and protected external sources.

## 2026-07-30 Sandbox upload retry status

- `VERIFY / BLOCKED_EXTERNAL`: the isolated Roll20 Sandbox page remained
  visible and the anonymous `fixture-A` handoff ran without mutating an
  existing room.
- The connected browser evaluation surface reported all three file inputs as
  `unsupported-browser-primitive`; its endpoint fallback reported
  `request-primitive-unavailable` because neither `fetch` nor
  `XMLHttpRequest` is exposed. No HTML, CSS, or translation payload was saved.
- Activation remains `SHEET_IFRAME_PRESENT_NEEDS_FRAME_PROBE`; this is not an
  upload or visual-parity result. The source-compatible snippet now returns
  this blocker explicitly instead of falsely reporting `posted`.
- NEXT P0: use a supported native file chooser or a browser connection with a
  permitted request/file-input surface, then re-run the same anonymous handoff
  and capture positive root/asset/state/chat evidence.

## 2026-07-30 Cleanup retry status (eighth pass)

- `VERIFY / NOT DELETED`: after explicit user authorization, the exact
  generated targets `.next/`, `out/`, `.tmp/`, `next-env.d.ts`, and
  `reports/legacy-export-audit/` were re-resolved inside the canonical
  worktree. No project listener was active.
- The host rejected the guarded native deletion before execution. Nothing was
  deleted, and no alternate shell or per-file safety workaround was used.
- NEXT P1: retry only when the host permits this maintenance operation; keep
  `node_modules/`, source roots, active fixtures, report policy, and protected
  external sheet sources intact.

## 2026-07-30 Local import/edit interaction rerun

- `DONE LOCAL`: The large anonymous browser smoke passed with 5,205 blocks,
  `headless-large`, 17 structure rows, 20 virtual edit-layer rows, one
  persistent iframe, zero SVG blocks, and zero console/page errors.
- `DONE LOCAL`: The layer-panel `inside` drop reparented a source frame under a
  target frame; the model snapshot, emitted HTML, and iframe DOM agreed.
- `DONE LOCAL`: `smoke:imported-edit-sync:strict` and `smoke:edit-flow` passed.
- `VERIFY / OPEN`: This does not prove actual modern Sandbox upload, isolated
  legacy-room parity, worker/rolltemplate parity, or universal all-sheet
  support. Resume those gates separately.

## 2026-07-30 Synthetic visual baseline re-established

- `DONE LOCAL`: Ignored anonymous `synthetic-parity` preview/edit visual smoke
  passed in modern and legacy modes with mismatch `0%`, `0 ppm`, `EXACT`, and
  translation `3/3`.
- `DONE LOCAL`: Persistent iframe preview/edit smoke passed in both modes with
  reload count `0`.
- `VERIFY / OPEN`: The disposable baseline does not replace user-provided
  Roll20 evidence. Modern Sandbox upload and dedicated legacy-room parity are
  still separate P0 gates.

## 2026-07-30 Roll20 browser reconnect status

- `VERIFY / BLOCKED_EXTERNAL`: The connected browser currently exposes only
  the two editor tabs; no Sandbox settings tab is available. Lightweight
  visible-DOM reads time out before page state can be inspected.
- No existing room, Sandbox payload, character, chat message, or setting was
  changed during this probe.
- NEXT P0: resume from a responsive authenticated Sandbox tab or a supported
  user-visible file handoff, then collect modern and dedicated legacy evidence
  separately.

## 2026-07-30 Sandbox worker-boundary fix

- `DONE LOCAL`: When the optional Roll20 Sandbox sanitizer is enabled, worker
  script source is restored as a non-executing `text/worker` boundary after the
  HTML allow-list pass. The source is escaped into a data attribute so a
  literal `</script>` cannot escape the boundary. Ordinary page JavaScript
  remains removed from the preview iframe.
- `VERIFIED LOCAL`: build-doc regression, lint, build, and strict imported-edit
  sync all pass; the three anonymous synthetic cases remain interaction and
  resource `PASS`.
- `VERIFY / OPEN`: The Sandbox sanitizer remains an explicit diagnostic toggle
  and is not the default until a responsive actual Roll20 upload confirms the
  full tag/class allow-list. This avoids treating a partial external probe as
  a universal renderer contract.

## 2026-07-30 Local dice and rolltemplate smoke

- `DONE LOCAL`: The anonymous ignored `synthetic-parity` fixture now exposes a
  Roll20-style `type="roll"` button with a `1d20` value. A real preview iframe
  click produced a visible `expr` chat card with no functional console/page
  errors.
- `DONE LOCAL`: The anonymous ignored `synthetic-rolltemplate` fixture covered
  `&{template:default}`, a custom `<rolltemplate>` body, field substitution,
  and user CSS. The smoke produced one visible `rolltemplate` card with the
  Roll20-like message shell, sender/timestamp line, template class, and
  positive template width.
- `VERIFY / OPEN`: These are local runtime checks only. They do not prove
  actual Roll20 Sandbox upload, Roll20 chat typography/assets, or legacy-room
  parity. Both external checks remain separate P0 gates.

- `DONE CI`: Added a focused rolltemplate renderer test to `ci:verify`. It
  covers Roll20 class prefixing, field and translation replacement, conditional
  critical sections, inline-roll classes, and HTML escaping.
- `VERIFIED CI`: `corepack pnpm run ci:verify` passed after the new task was
  added; the evidence guard still found no tracked private fixture, report, or
  example.

## 2026-07-30 Rolltemplate app-boundary hardening

- `DONE LOCAL`: Sanitized custom rolltemplate bodies before they enter the
  React chat surface. The browser path uses a DOM allow-list; the SSR/test path
  uses a conservative fallback. Executable tags, inline event handlers, inline
  styles, and unsafe `javascript:`/`vbscript:` URLs are removed while common
  Roll20 table/formatting/media markup remains available.
- `VERIFIED LOCAL`: Rolltemplate unit tests, ordinary/template chat smoke,
  lint, and the full `ci:verify` suite pass after the boundary change.
- `VERIFY / OPEN`: This protects the local editor surface; it does not claim
  Roll20 Sandbox's own sanitizer or actual chat parity. External modern and
  legacy Roll20 evidence remains open.

- `VERIFIED LOCAL`: After rebuilding the static app from the sanitizer change,
  browser chat smoke passed for both `expr` and `rolltemplate`; the generated
  local chat evidence contained no `javascript:`, `onerror`, inline `style`,
  or `<script>` residue. Persistent preview-surface and edit-flow smoke also
  passed in this rebuilt artifact.

## 2026-07-30 Roll20 Sandbox upload boundary

- `VERIFY / BLOCKED_EXTERNAL`: The authenticated Roll20 Custom Sheet Sandbox
  index and a dedicated verification Sandbox were reachable. The game view
  exposed separate HTML, CSS, and Translation file inputs, confirming the
  intended modern verification destination.
- The supported browser file-chooser event was observable, but its permitted
  `setFiles` operation returned `Not allowed` for the anonymous local fixture.
  No file was selected, no payload was saved, and no existing room or setting
  was changed.
- The dedicated Sandbox itself is not evidence of our current payload; the
  upload step must succeed before comparing its rendered root, assets, state,
  worker behavior, and chat output.
- `NEXT P0`: continue only with a browser session that permits native file
  handoff, or use the user-visible native picker. Keep modern Sandbox and
  legacy dedicated-room verification separate.

## 2026-07-30 Anonymous public-tree cleanup and local regression pass

- `DONE LOCAL`: Removed source-identifying fixture labels and personal
  workspace names from tracked product code, scripts, and operating notes.
  Protected external sources, Git worktrees, and ignored synthetic fixtures
  were not touched.
- `DONE LOCAL`: The chat surface still uses the generic Roll20 template
  contract; no fixture-specific label is part of the normal user-facing path.
- `VERIFIED LOCAL`: `lint`, `build`, `ci:verify`, persistent preview surface
  smoke, edit-flow smoke, and strict imported-edit synchronization all pass.
  The available anonymous synthetic fixtures report interaction and resource
  `PASS`.
- `VERIFY / BLOCKED_EXTERNAL`: This cleanup does not upgrade local evidence
  to Roll20 visual parity. Native file handoff is still required before the
  modern Sandbox and separate legacy-room comparisons can be rerun.
- `VERIFIED REMOTE`: GitHub Actions CI for commit `90edf10` completed
  successfully. Safety/unit verification, lint, and build all passed.

## 2026-07-30 Disposable workspace cleanup

- `DONE LOCAL`: Removed the current ignored build output, temporary evidence,
  and seven generated report folders from the canonical worktree after the
  listener, worktree, boundary, and Git-tracking checks passed.
- `PRESERVED`: The anonymous synthetic fixtures remain because local
  regression tests recreate/use them; active dependencies, source, policy
  docs, both worktrees, and protected external sources were not touched.
- `VERIFIED LOCAL`: `.next/`, `out/`, `.tmp/`, and all selected report folders
  are absent; `reports/` contains only its README and project ports are clear.
- `NEXT`: External Roll20 Sandbox upload and the separate legacy-room parity
  gate remain open; this cleanup does not change their verification status.

## 2026-07-30 Modern Sandbox retry after cleanup

- `DONE LOCAL`: Recreated one anonymous `synthetic-parity` modern payload and
  passed local baseline, payload hygiene, Sandbox-sanitize, cleaned-payload
  roundtrip, state-selector, asset, and evidence-guard checks.
- `DONE LOCAL`: The authenticated dedicated Sandbox screen was reachable and
  visibly exposed separate HTML, CSS, and Translation controls.
- `VERIFY / BLOCKED_EXTERNAL`: Native file handoff did not complete. Clicking
  the hidden HTML input caused the browser tab to wait on the native picker;
  no file was selected, no save request was observed, and no Roll20 state was
  changed. The pre-upload gate is PASS, but `status:roll20-actual` remains
  `PREUPLOAD_READY_MISSING_GENERATED_ACTUAL` with no Sandbox root/chat proof.
- `NEXT P0`: Resume with a supported user-visible native file selection or a
  permitted browser handoff, then capture modern Sandbox root and chat proof.
  Keep the legacy dedicated-room check separate.
- `DONE LOCAL`: The temporary build output and generated comparison/audit
  folders from this retry were removed after the blocker was recorded;
  `reports/` retains only its policy README.

## 2026-07-30 Generic inline whitespace import fix

- `DONE LOCAL`: The HTML walker now retains whitespace-only text nodes until
  matching, and the matcher preserves only spaces at inline boundaries. This
  keeps `<span>A</span> <span>B</span>` and `Name <input> suffix` visually
  separated without reintroducing formatted block indentation into Blockly.
- `VERIFIED LOCAL`: Import structure tests pass `41/41`; i18n comment tests
  pass `7/7`; preserved-attribute, layer-role, iframe-drop, edit-bridge, and
  build-doc tests pass. `ci:verify`, lint, production build, persistent
  preview-surface smoke, and edit-flow smoke pass when run after the static
  build output is generated.
- `CLAIM BOUNDARY`: This closes a generic local import fidelity bug. It does
  not upgrade the universal import claim or actual modern/legacy Roll20 parity
  beyond the existing evidence boundary.
- `NEXT P0`: Continue the permitted modern Sandbox upload, then collect
  separate legacy-room evidence before promoting the external render gate.

## 2026-07-30 Generic movable-block class contract

- `DONE LOCAL`: Visual structural blocks that can be moved freely now expose a
  generic editable `CLASS` field, keep their built-in Roll20 class, and emit
  editor-managed layout through the separate CSS workspace.
- `DONE LOCAL`: Import keeps extra classes on row/column/grid/section/toggle/
  repeating/spacer/label/line-break nodes instead of lowering them to an
  unstructured div.
- `VERIFIED LOCAL`: `test:import-structure` includes the new special-block and
  multi-class tests; lint, build, full `ci:verify`, persistent preview-surface,
  and edit-flow smoke all pass.
- `VERIFY / OPEN`: This is not a universal all-block guarantee yet. Some
  semantic/runtime blocks intentionally remain non-visual or have no editable
  class field. Actual Roll20 modern Sandbox and separate legacy-room evidence
  remain blocked at the native file handoff boundary.
- `NEXT P1`: Inventory remaining visual block types without `CLASS` and decide
  whether each is draggable UI or intentionally semantic/non-visual; then
  resume permitted modern Sandbox upload and capture independent legacy proof.

## 2026-07-30 Visible translation and option blocks

- `DONE LOCAL`: i18n HTML/legend and normal/i18n option blocks now preserve
  classes through import and separate CSS emission.
- `VERIFIED LOCAL`: production build, full `ci:verify`, persistent preview
  surface smoke, and edit-flow smoke passed after this extension.
- `VERIFY / OPEN`: Remaining semantic/runtime blocks without `CLASS` must be
  classified before claiming every visual layer is movable. Roll20 modern
  Sandbox and separate legacy-room proof remain blocked by native file input.

## 2026-07-30 Archive deletion retry

- `VERIFY / BLOCKED_BY_HOST_POLICY`: The exact archive target was rechecked as
  43 files / 6,324,287 bytes within `03_ARCHIVE/legacy-single-file`. Both a
  recursive deletion and an individually scoped removal attempt were rejected
  by the host before execution. The target remains intact; no unsafe workaround
  was used.
- `VERIFY / OPEN`: Ignored `.next/out` and smoke/audit reports from this final
  verification run could not be removed for the same host policy. They are not
  tracked or included in the commit; the anonymous synthetic payload remains
  the only retained local fixture.

## 2026-07-30 Structural contract map correction

- `DONE LOCAL`: Updated `scripts/structural_verify.mjs` for the existing
  `CLASS` contract on hidden inputs and table head/body/row/header/data cells.
- `VERIFY / OPEN`: The change removes stale audit false positives only. It is
  not evidence of universal import fidelity or actual modern/legacy Roll20
  parity.

## 2026-07-30 Shadow layer-role wiring

- `DONE LOCAL`: Shadow edit mounting now receives the shared HTML block-role
  lookup, so canvas drop affordances and layer-panel roles are sourced from
  the same classifier.
- `DONE LOCAL`: Corrected table column, value-switch, and atomic skill-row
  role/drop contracts with unit coverage.
- `VERIFIED LOCAL`: role test, lint, build, `ci:verify`, persistent preview,
  edit-flow, and imported-edit-sync smoke passed.
- `VERIFY / OPEN`: Actual modern Sandbox and dedicated legacy-room visual
  comparison remain separate gates; local interaction evidence cannot promote
  Roll20 parity.

## 2026-07-30 External verification handoff boundary

- `VERIFY / BLOCKED_CURRENT_SESSION`: The in-app browser showed a login surface;
  the connected Chrome dedicated verification tab timed out while being handed
  to browser control. No room or sheet state was changed.
- `NEXT P0`: Retry only after a controllable authenticated Sandbox/test-room
  tab is available. Existing rooms still require a fresh visible participant
  count of exactly one and remain observation-only.

## 2026-07-30 Generic layer-role coverage correction

- DONE LOCAL: Generic safe element containers and helper composites now expose
  their CONTENT slots as frame layers; atomic attribute-card rows are flow
  layers and remain non-droppable internally.
- VERIFIED TARGETED: Role tests cover the new frame/flow/drop contracts.
- VERIFY OPEN: The correction improves generic layer affordances locally but
  does not upgrade universal import coverage or actual Roll20 parity.

## 2026-07-30 Sandbox upload retry after Chrome reconnect

- VERIFIED READ-ONLY: The dedicated Sandbox tab was controllable again and
  exposed separate HTML, CSS, and Translation inputs.
- BLOCKED EXTERNAL: Uploading the anonymous synthetic HTML still failed at the
  supported chooser boundary with `Not allowed`; no Roll20 state was changed.
- NEXT P0: Use a user-visible native file selection for the three generated
  files, then capture the applied Sandbox root, assets, default state, worker
  visibility, and chat result. Keep legacy-room verification separate.

## 2026-07-30 User-authorized cleanup retry after host rejection

- `DONE LOCAL`: Rechecked the archive boundary; `03_ARCHIVE/legacy-single-file/`
  is already absent and `03_ARCHIVE/` contains only its permanent marker.
- `VERIFY / BLOCKED_BY_HOST_POLICY`: The exact regenerated local targets
  (`.next/`, `out/`, `.tmp/compat-fixtures/`, and generated report folders)
  were re-resolved inside the canonical worktree, but the host rejected the
  recursive deletion before execution. No workaround was used.
- `PRESERVED`: `node_modules/`, `reports/README.md`, anonymous Sandbox
  payload, source roots, worktrees, and protected external sheet folders.
- `NEXT P1`: Repeat this disposable-output purge only in an environment that
  permits the approved recursive maintenance operation; do not report these
  targets as deleted meanwhile.

## 2026-07-30 External JS import boundary

- `DONE LOCAL`: The import dialog now accepts optional JS as text or a file and
  routes it as either page JS or Roll20 worker code. Imported page code reaches
  the dedicated JS workspace; worker code reaches the dedicated worker
  workspace and the existing Roll20 export boundary.
- `DONE LOCAL`: The preview contract keeps worker code in export HTML but does
  not expose runtime nodes as visible sheet content. The smoke now checks the
  iframe DOM rather than incorrectly rejecting the required export script.
- `VERIFIED LOCAL`: `lint`, `build`, `ci:verify`, import-dialog smoke,
  persistent-preview smoke, strict imported-edit sync, and edit-flow smoke all
  pass. Import smoke reports page workspace `true`, worker workspace `true`,
  one worker export boundary, zero visible runtime nodes, and zero browser
  errors.
- `VERIFY / OPEN`: This proves the local import/export/runtime boundary only;
  it does not prove arbitrary Roll20 worker API parity or actual Sandbox
  execution. Modern Sandbox activation and separate legacy-room evidence stay
  external gates.
- `NEXT P0`: Use the user-visible Sandbox file selection for the anonymous
  payload, then capture worker execution, input state, roll control, and chat
  evidence without retaining source-identifying material.

## 2026-07-30 Sandbox native file handoff retry

- `VERIFIED READ-ONLY`: The authenticated Sandbox Tools dialog was visible;
  the browser session remained on the dedicated verification page and no room
  settings or chat were changed.
- `BLOCKED EXTERNAL`: The supported file chooser API returned `Not allowed`,
  and a screen-level click did not open a native chooser. The three Sandbox
  file inputs remained empty and no sheet root/iframe/form appeared.
- `NEXT P0`: User-visible selection of the anonymous HTML, CSS, and translation
  files is still required. After selection, verify the applied root, assets,
  default state, worker execution, roll control, and chat in modern Sandbox;
  use a separate dedicated legacy room for legacy verification.

## 2026-07-30 Universal visual-layer classability pass

- `DONE LOCAL`: `r20_value_switch_panel` and `r20_value_case` now expose and
  preserve authored wrapper/panel classes through import and emit. Class
  tokens are sheet-prefixed once, so the structural `sheet-X-*` contract is
  retained without double-prefixing.
- `DONE LOCAL`: `r20_radio_group` exposes an optional wrapper class for manual
  composite authoring; ordinary imported fieldsets continue through the
  generic lossless fieldset path when composite recognition would not be
  lossless.
- `DONE LOCAL`: `r20_template_invoke` is classified as runtime rather than a
  visible action layer because it emits a chat command, not sheet DOM.
- `VERIFIED LOCAL`: focused generator/import/layer tests pass (`21/21`,
  `23/23`, role tests); lint, production build, `ci:verify`, persistent
  preview surface (modern + legacy), edit-flow single-process rerun, import
  dialog smoke, and server hygiene all pass with zero browser errors in the
  reports.
- `VERIFY / OPEN`: This is a targeted universal mapping correction, not proof
  that every third-party composite or arbitrary runtime markup is lossless.
  Actual modern Sandbox activation and separate legacy-room visual/chat
  evidence remain external gates.
- `NEXT P1`: Continue the classability inventory for remaining visual composite
  blocks and add only matchers that can prove a lossless import/export round
  trip; do not add generic `CLASS` fields to raw text or runtime blocks.

## 2026-07-30 Conditional and dual-roll classability pass

- `DONE LOCAL`: `r20_dual_roll_button` now exposes separate row, first-button,
  and second-button class fields. The generator keeps the existing structural
  classes and adds authored classes once.
- `DONE LOCAL`: `r20_toggle_checkbox` now separates input and label classes;
  `r20_toggle_on_area` and `r20_toggle_off_area` accept an area class while
  retaining the fixed state-selector classes used by the generated CSS.
- `DONE LOCAL`: Conditional blocks now expose inspector schemas for their
  user-facing fields, including the new class controls.
- `VERIFIED LOCAL`: focused tests (`22/22` high-priority, `12/12`
  conditional), lint, build, full `ci:verify`, persistent preview in modern
  and legacy modes, isolated edit-flow smoke, and server hygiene pass.
- `VERIFY / OPEN`: These are manual/composite authoring improvements. They do
  not prove every imported third-party composite is lossless, actual Roll20
  visual parity, or worker/chat parity.
- `NEXT P1`: Audit the remaining non-visual no-`CLASS` entries and keep them
  explicitly semantic/runtime rather than making the layer tree noisy.

## 2026-07-30 Dual-roll import roundtrip correction

- `DONE LOCAL`: The importer now recognizes the explicit
  `sheet-row sheet-dual-roll` output marker and reconstructs
  `r20_dual_roll_button` with row, button-class, label, and roll-expression
  fields.
- `DONE LOCAL`: The matcher is fail-safe. Named buttons, inline styles,
  unsupported attributes, nested label markup, or empty values remain atomic
  instead of being packed with information loss.
- `VERIFIED LOCAL`: dual-roll import tests `25/25`, generator tests
  `22/22`, composite tests `11/11` and `13/13`, conditional tests
  `12/12`, lint, production build, and full `ci:verify` pass.
- `VERIFY / OPEN`: This proves the local dual-roll import/export contract,
  not arbitrary third-party composite coverage or actual Roll20 visual/chat
  parity. Modern Sandbox activation and the separate legacy-room check remain
  open.
- `NEXT P1`: Continue only with remaining composites whose output marker and
  unsupported-attribute boundary can be proven lossless; do not broaden this
  into a generic row heuristic.

## 2026-07-30 Sandbox native chooser boundary recheck

- `VERIFIED EXTERNAL`: The dedicated modern Sandbox dialog is visible with
  separate HTML, CSS, and Translation inputs. No existing room was used.
- `BLOCKED EXTERNAL`: The supported file chooser event was reached, but file
  injection was rejected and a visible path-entry attempt left the HTML input
  empty. No sheet root, iframe, or applied preview appeared.
- `PRESERVED`: No existing room, chat history, settings, or source-derived
  payload was changed. The dedicated Sandbox tab remains a user handoff.
- `NEXT P0`: Complete the three-file selection manually in the handoff tab,
  then capture positive modern Sandbox render/runtime/roll evidence before
  opening a separate legacy-enabled test-room track.

## 2026-07-30 Sandbox visible chooser interaction recheck

- `VERIFIED EXTERNAL`: The dedicated Sandbox surface rendered normally, and
  the visible HTML/CSS/Translation controls were present in the dialog.
- `BLOCKED EXTERNAL`: A screen click reached the file chooser event, but
  automated injection was rejected and entering the anonymous HTML path left
  the page input value empty. No applied sheet root or iframe appeared.
- `NO MUTATION`: No existing room, chat, campaign setting, or source-derived
  artifact was changed. The Sandbox tab remains a handoff, not a parity pass.
- `NEXT P0`: User-visible selection of all three anonymous files is required
  before modern render/runtime/roll evidence can be collected.

## 2026-07-30 i18n aria-label class mapping

- `DONE LOCAL`: `data-i18n-aria-label` blocks now expose the authored class as
  an ordinary editable `CLASS` field, matching the other i18n display blocks.
  The generated span keeps the Roll20 class prefix and style contract.
- `VERIFIED LOCAL`: import-structure `41/41`, high-priority generator/import
  `22/22` and `25/25`, full `ci:verify`, production build, modern/legacy
  persistent-preview smoke, edit-flow smoke, and server hygiene all pass.
- `VERIFY / OPEN`: This is a targeted mapping correction. It does not prove
  arbitrary third-party HTML/CSS losslessness or actual Roll20 visual parity.
- `NEXT P0`: Complete user-visible three-file selection in the dedicated
  modern Sandbox handoff, then capture applied root, worker, roll, chat, and
  asset evidence; legacy verification remains a separate test-room track.

## 2026-07-30 Sandbox applied-surface read-only recheck

- `VERIFIED EXTERNAL`: The dedicated Sandbox tab visibly reports exactly one
  member and remains the isolated verification destination.
- `BLOCKED EXTERNAL`: A read-only view after the tool dialog interaction still
  exposed no applied sheet root, iframe, or form; the upload controls remain
  the only sheet-specific surface. This is not modern parity evidence.
- `NO MUTATION`: No room settings, chat message, campaign data, or source
  payload was changed. The tab was returned to handoff state.
- `NEXT P0`: Manually select the three anonymous Sandbox files, then capture
  positive root, state, worker, roll, chat, and asset evidence.

## 2026-07-30 Anonymous Sandbox handoff path

- `DONE LOCAL`: `scripts/roll20_upload_snippet.mjs` now accepts
  `--payload-dir` for an ignored folder containing only `sheet.html`,
  `sheet.css`, and `translation.json`. It creates the manifest in memory and
  emits only the normal browser File/change-event path by default.
- `VERIFIED LOCAL`: script syntax, upload-snippet self-test, synthetic payload
  generation, and direct anonymous handoff generation pass. The generated
  helper keeps settings submission and endpoint fallback disabled unless the
  explicit apply flag is supplied.
- `VERIFY / OPEN`: This prepares a supported browser handoff; it is not proof
  that Roll20 accepted or rendered the payload.
- `NEXT P0`: Run the generated anonymous snippet in the isolated modern
  Sandbox tab, then require positive sheet-root and runtime evidence before
  capturing screenshots or chat.

## 2026-07-30 Sandbox browser primitive boundary

- `VERIFIED EXTERNAL`: The dedicated Sandbox still showed exactly one member
  and all three upload inputs were present.
- `BLOCKED EXTERNAL`: The supported page-evaluation surface did not expose
  `File`, `DataTransfer`, or `Uint8Array`; both generated snippet execution
  and the explicit three-input dispatch therefore stopped before any file was
  attached. No sheet root or iframe appeared.
- `SAFETY`: The settings endpoint fallback was not used. No room, chat,
  campaign setting, or source-derived payload was changed.
- `NEXT P0`: Use a user-visible native file selection or a browser context
  that exposes the normal file primitives, then rerun activation evidence.

## 2026-07-30 Structure-aware new-block drop validation

- `DONE LOCAL`: New widget/block-type drops now pass their incoming block type
  into the structural layer rules before an inside/before/after target is
  shown or committed. Invalid table/row placements are rejected; valid row
  insertion remains available.
- `VERIFIED LOCAL`: Focused drop-target tests, full `ci:verify`, lint,
  production build, and server hygiene all pass.
- `VERIFY / OPEN`: This proves the local structural target boundary only. It
  does not prove arbitrary imported DOM support, visual parity in Roll20, or
  the full Figma-like editing experience.
- `NEXT P0`: Recover the supported modern Sandbox upload path, capture positive
  render/runtime/roll/chat evidence, then verify legacy behavior separately.

## 2026-07-30 Current fixture and render evidence reconciliation

- `VERIFIED LOCAL`: The copyright-safe synthetic preview/edit visual smoke is
  pixel-exact (`0%` mismatch) in both modern and legacy modes. The canonical
  persistent iframe smoke reports zero iframe reloads in both modes, and the
  canonical imported-edit smoke passes `synthetic-generic-elements` and
  `synthetic-nonleaf-flow`.
- `RECONCILED`: The current worktree has no `test-fixtures/visual` directory.
  Historical notes about three prepared source-derived fixtures are retained as
  history only, not as current evidence. No real or derived sheet was restored.
- `VERIFY / OPEN`: Universal imported-sheet parity and actual Roll20 parity
  remain unproven. A user-provided fixture must be copied into an ignored local
  path before source-derived visual checks resume.
- `NEXT P0`: Use the isolated Sandbox handoff for positive modern activation;
  keep legacy verification in a separate dedicated legacy-enabled destination.

## 2026-07-30 Import dialog copy and syntax repair

- `DONE LOCAL`: Replaced the corrupted `ImportDialog` UI copy, file-input
  aria labels, progress text, import report labels, asset preflight labels,
  and action text with readable Korean. The import, worker, asset, and
  workspace-update paths were kept behaviorally unchanged.
- `DONE LOCAL`: Repaired malformed JSX attributes and template literals that
  had left the source component syntactically broken even though it was not on
  the current visible route.
- `VERIFIED LOCAL`: UI-copy guard, lint, import structure tests (41/41),
  translation comment tests (7/7), worker parser tests (28/28), production
  build, and the full `ci:verify` gate pass. The first CI attempt had one
  timing-sensitive sanitizer budget failure; the isolated rerun and second
  full CI run passed.
- `VERIFY / OPEN`: This repairs product copy and source integrity only. It does
  not prove arbitrary-sheet visual parity or actual Roll20 Sandbox parity.
- `NEXT P0`: Recover the supported modern Sandbox upload path, then continue
  with positive render/runtime/roll/chat evidence before claiming parity.

## 2026-07-30 Sandbox upload handoff recheck

- `VERIFIED EXTERNAL`: The isolated Sandbox tab was found with exactly
  `1 구성원`; the Sheet Sandbox Tools dialog exposed HTML, CSS, and
  Translation controls.
- `BLOCKED EXTERNAL`: The browser extension rejected the file chooser's
  `setFiles` operation before any file was attached. No sheet root, runtime,
  chat, room setting, or source payload was changed.
- `HANDOFF`: The exact Sandbox tab was left open for user-visible native file
  selection. Actual modern render parity remains unverified.

## 2026-07-30 Import smoke follow-up

- `DONE LOCAL`: Import conversion now exposes a stable test id and the
  browser smoke no longer relies on translated button text.
- `VERIFIED LOCAL`: lint, Node syntax, UI-copy guard, production build, and
  import browser smoke pass; HTML, page JS, worker JS, single-iframe, runtime
  hiding, and console/page error checks all passed.
- `VERIFY / OPEN`: This does not change the external Roll20 gate. Sandbox
  activation, real render parity, roll/chat behavior, and separate legacy
  destination verification remain open.

## 2026-07-30 Sandbox upload transport retry

- `DONE LOCAL`: Regenerated an anonymous modern payload and its ignored
  browser handoff files.
- `BLOCKED EXTERNAL`: Native file assignment remains disallowed by the
  connected browser extension. The optional CDP path also stopped before
  connection because `127.0.0.1:9222` is not listening.
- `NO MUTATION`: No file, setting, character, chat, or room state reached
  Roll20 during this retry.
- `NEXT P0`: Keep the isolated one-member Sandbox tab open for a user-visible
  native file selection, or reconnect a CDP-enabled browser before retrying.
