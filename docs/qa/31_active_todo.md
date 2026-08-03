# Active TODO

Date: 2026-08-03

This file contains current work only. Historical per-sheet evidence, source
identities, machine paths, screenshots, and source-derived measurements do not
belong in tracked documents.

## P0 - Roll20 Render Truth

- `DONE DIAGNOSTIC / VERIFY VALID ACTUAL`: the earlier owner-only modern and
  legacy repeating experiment used duplicate same-name fieldsets. Roll20's
  documented contract requires every repeating name to be unique and forbids
  underscores after `repeating_`, so that run is retained only as an
  invalid-input diagnostic and is not parity evidence. Import now preserves
  either invalid structure with a visible error, while export blocks the
  payload. The corrected seven-fixture anonymous suite passes modern and legacy
  local pre-upload gates; fresh valid Roll20 upload and screenshot proof remain
  `VERIFY` because Chrome extension communication timed out before participant
  preflight and no room was opened or changed. The current actual-status gate
  confirms 0/8 generated Roll20 captures in both corrected modern and legacy
  runs; local readiness is not being reported as actual parity.
- `DONE LOCAL / VERIFY ACTUAL PIXELS`: the shared legacy Preview/Edit contract
  now applies the observed Roll20 HTML allow-list as well as legacy CSS
  sanitizing. Unsupported semantic wrappers are removed while supported
  children and Sheet Worker source survive. The refreshed legacy local capture
  now follows the actual flattened flow and all fourteen anonymous modern and
  legacy Preview/Edit pairs remain pixel-exact. A normalized full-height local
  versus Roll20 pixel comparison is still required.
- `DONE ACTUAL SYNTHETIC MATRIX`: four anonymous result-card shapes were
  uploaded separately to owner-only modern and legacy verification
  destinations. Every upload preserved HTML/CSS exactly and translation JSON
  semantically; the legacy destination kept legacy sanitization enabled. Both
  modes produced 8/8 authoritative generated-sheet screenshots (four authored
  roots and four chat cards), trusted full-root evidence 4/4, no cutoff risk,
  matching chat structure 4/4, no inactive custom result-card CSS, and no
  renderer blockers. Ignored local reports are the only evidence store.
- `DONE RENDER ISOLATION`: local result-card rendering no longer inherits the
  app shell's universal `box-sizing: border-box` or zero-border reset. Actual
  Roll20 comparison proved both failures: table cell allocation and a layered
  conditional border. Modern normalized card differences are 5.00%-9.56%; the
  legacy range is 5.67%-9.60%, with no aligned or authoritative high-mismatch
  fixture. These numbers cover only the current anonymous matrix.
- `DONE ACTUAL SYNTHETIC`: a new owner-only modern test room persisted and
  rendered the five current anonymous generated payloads. Persisted HTML/CSS
  matched exactly, translation JSON matched semantically, modern mode remained
  selected, and the captured authored roots covered controls, translation,
  state changes, intrinsic size, and the applicable Roll/result-card path.
  Evidence remains ignored and proves only this synthetic suite.
- `DONE ACTUAL SYNTHETIC`: a dedicated owner-only legacy-enabled test room
  rendered fresh anonymous payloads with the expected wrapper, translation,
  controls, flow/table layout, intrinsic roots, action-driven Sheet Worker
  state change, Roll execution, and custom result card. Lossless root segments,
  full-root stitching, DOM evidence, and actual-status checks remain ignored
  local evidence. This proves the tested synthetic contract, not every sheet.
- `BLOCKED EXTERNAL`: the current automated modern upload path is stopped at
  the browser file-selection permission boundary. A fresh dedicated Sandbox
  accepted and persisted an anonymous manifest and launched its visible upload
  tools. Fresh supported chooser attempts still stop before transmission while
  the Chrome extension lacks local-file access. No file was transferred. No
  hidden input, endpoint, or existing-room workaround is allowed.
- `DONE CURRENT SYNTHETIC MATRIX`: local Preview/Edit and the dedicated modern and legacy destinations now have
  same-payload root comparisons against the exact authored top-level element,
  not the surrounding Roll20 wrapper. Authored-root dimensions and capture
  completeness agree. The no-change authored-root candidate remains best for
  all four fixtures at 4.96%-4.97% with a one-pixel height delta. The renderer
  action gate has zero blockers and keeps additional tuning experiment-only.
  Broad-sheet parity is not proven.
- `DONE TOOLING`: generated handoffs now include a read-only persisted-payload
  check for dedicated legacy settings. It distinguishes exact HTML/CSS,
  newline normalization, translation JSON formatting normalization, missing
  fields, and real source mismatch. The Sandbox upload helper no longer treats
  legacy campaign settings fields as a supported upload destination.
- `DONE ACTUAL SYNTHETIC`: chat applicability is shared across status, capture
  planning, metric audit, and pixel diagnostics. The applicable anonymous
  payload now has deterministic matching content, foreground proof, generic
  descendant styles, and a true PNG captured through DPR-corrected CDP. Local
  and actual structure match, the aligned pixel difference is below the
  configured high-mismatch threshold, and policy keeps the default renderer.
  Payloads without Roll content are excluded instead of reported as missing.
  Broader result-card families remain unverified.
- `DONE LOCAL CURRENT SYNTHETIC`: an anonymous result-card matrix now covers
  block, table, conditional-helper, and default card shapes. Rolltemplate CSS
  keeps nested conditional at-rules, referenced animations, and authored box
  sizing while dropping selector branches outside the chat surface. Every card
  is unclipped in chat, and Preview/Edit are pixel-exact in both modern and
  legacy modes with no template-marker false warning.
- `DONE ACTUAL SYNTHETIC STRUCTURE`: one additional anonymous conditional card
  persisted in an owner-only modern verification destination with exact
  HTML/CSS, semantically matching translation, expected nested-at-rule layout,
  helper output, and matching chat DOM/text. Existing user rooms were not
  modified.
- `DONE ACTUAL SYNTHETIC STRUCTURE`: the conditional card and the remaining
  matrix cards now have true-PNG, DPR-corrected element captures in both modern
  and legacy verification destinations. Foreground, current-metric, structure,
  and capture-quality checks pass; no lossy screenshot is used as pixel proof.
- `DONE LOCAL CURRENT SYNTHETIC`: five anonymous fixtures now cover ordinary
  controls, Roll/runtime content, tables, lists, repeating structure, checked
  and selected defaults, grouped radios, multi-select state, readonly and
  disabled controls, nested option groups, conditional visibility, translation,
  Worker `getAttrs`, ordinary Page JS removal, custom properties, and nested
  `@layer` / `@supports` / `@container` CSS. Option-group labels, disabled
  state, nested selection, and safe user `data-*` attributes survive the real
  import/hydrate/emit path. Preview and Edit are pixel-exact in all ten
  modern/legacy combinations, and the Sandbox preparation smoke passes all
  five separate expected states. This remains local synthetic evidence, not
  actual Roll20 parity.
- `DONE LOCAL`: sequential full-sheet replacement now has an explicit cache
  identity at both the workspace-store and Blockly hydration boundaries. One
  browser session imports all five anonymous fixtures in order and verifies
  that each normal preview CSS hash matches the latest synchronous emit, so a
  previous sheet cannot silently repaint the next sheet. The current run is
  complete for every current anonymous fixture with zero console or page errors.

## P0 - Universal Import And Export

- `PARTIAL`: HTML, CSS, translation, Rolltemplate, and a useful Sheet Worker
  subset map to editable blocks. Unsupported content must remain explicit and
  lossless instead of disappearing.
- `PARTIAL`: modern and legacy output are separate contracts. Selector
  prefixing, modern Sandbox preparation, and legacy CSS sanitizing must never
  be reported as the same operation.
- `PARTIAL`: anonymous synthetic coverage now combines table/list/form,
  conditional visibility, repeating sections, nested conditional CSS, custom
  properties, grouped control state, readonly/disabled state, nested
  `select`/`optgroup`/`option` structure, and inert Page JS in one browser path.
  Continue with broader uncommon form semantics, user-owned hosted assets,
  malformed selector families, and unsupported worker syntax.
- `DONE LOCAL`: the anonymous browser matrix now also covers native range,
  color, and date inputs, details/progress/meter/output structure, a local-only
  data image, `@font-face`, paused animation, a custom at-rule, and malformed
  CSS fallback. Native inputs and other safe HTML void tags map to leaf blocks
  instead of false frames, and CSS data-URL/quoted semicolons survive import
  and emit. Preview/Edit are
  pixel-exact in both modern and legacy modes; Sandbox preparation keeps its
  restricted output separate. Actual user-owned hosted asset loading remains
  unverified.
- `DONE LOCAL`: modern Sandbox CSS preparation drops a blocked inline data URL
  without rejecting unrelated declarations or the rest of the stylesheet.
  Quoted CSS grammar such as `@property` angle syntax remains valid, while
  script URLs and unquoted markup still reject the stylesheet. All seven
  current anonymous fixtures pass fresh modern and legacy pre-upload runs. This
  is preparation evidence only; fresh actual upload proof remains open above.
- `DONE LOCAL`: executable ordinary scripts use a separate inert source
  workspace with source-order slots. Preview/Edit remove them from the visual
  runtime. Final Roll20 `sheet.html` keeps only Sheet Worker scripts; excluded
  ordinary/data script tags remain in authored source and are copied exactly
  into the ZIP's non-executable `unsupported-script-source.txt`. Export shows a
  non-blocking warning and plain-language conversion path to automatic actions.
- `DONE LOCAL`: unsupported Sheet Worker statements now show a plain-language
  reason in both the import result and the selected raw-code inspector. The
  diagnostics are derived from the current source, never stored in or emitted
  with it. Browser coverage confirms that the preserved code remains hidden
  from the sheet canvas and returns to Roll20 output. Blockly selection now
  updates the matching inspector without serializing the workspace.
- `DONE LOCAL`: canonical one-or-more-event listeners now map to an editable
  `on` block instead of a raw fallback. A callback event variable and common
  Roll20 event fields map to a reporter block. Parser/generator tests and two
  browser smokes prove structured source roundtrip plus `sourceType=player`
  and `sourceAttribute` delivery for either event. Worker-originated local
  `setAttrs` changes report `sourceType=sheetworker`.
- `DONE LOCAL`: change events now carry the cached previous value and the final
  DOM value. `setAttrs` supports editable `silent:true` and a completion body;
  browser state proof confirms silent updates do not call dependent handlers,
  the completion body still runs, and Worker changes report `sheetworker`.
- `DONE BROWSER`: Import waits until all five Blockly model workspaces are
  registered. A cold-load click can no longer report 100% analysis while
  silently leaving the actual workspaces empty; the browser smoke reproduces
  the early click and verifies three emitted HTML blocks.
- `DONE LOCAL`: repeating fieldsets now act as hidden row templates instead of
  visible top-level attributes. The shared Preview/Edit iframe creates Roll20-
  shaped `repcontainer`, `repcontrol`, and `repitem` nodes, rewrites row field,
  roll, and action names, and supports Add, Modify/Done, user deletion,
  `generateRowID`, `getSectionIDs`, `setAttrs` row creation, and
  `removeRepeatingRow`. Browser state proof covers full, section-field,
  section-wide, and plain-field change aliases plus lowercased source state and
  `removedInfo` for both player and Worker deletion.
- `DONE LOCAL / VERIFY ACTUAL`: valid repeating sections use one unique
  `repeating_*` fieldset, and handlers resolve row-context shorthand for
  `getAttrs` and `setAttrs`. Drag reorder persists `_reporder_repeating_*`,
  dispatches `change:_reporder:*`, and guards against the pointer-capture
  rollback found when a dragged row moves in the DOM. Duplicate same-name
  fieldsets and names containing an extra underscore remain losslessly
  editable for repair, but import marks them as errors and export blocks them.
  Fresh actual proof for the corrected valid payload remains open.
- `TODO`: expand structured Sheet Worker blocks beyond the current parser and
  runtime subset. Raw Worker source remains the lossless fallback meanwhile;
  diagnostics do not make unsupported syntax structurally editable. Arbitrary
  source formatting can still remain raw when structured re-emission is not
  byte-stable. Broader Worker APIs and actual Roll20 execution proof remain
  incomplete.

## P0 - Edit And Preview Unity

- `DONE LOCAL`: Preview and Edit use one persistent Roll20 iframe. Edit adds
  parent-owned controls and overlays instead of drawing a second sheet.
- `DONE LOCAL`: flow-aware before/inside/after moves, explicit free placement,
  grouping, container roles, table/list guards, layer auto-scroll, and
  collapsed-container opening have synthetic browser coverage.
- `DONE LOCAL`: dragging a friendly gallery piece onto a completely empty
  sheet now uses the piece preset instead of falling through to a raw block.
  The first object maps the pointer to the visible centered 850px sheet,
  preserves its authored starting size, becomes selected, and mounts the same
  persistent iframe. Fresh-sheet drag, full edit-flow, six anonymous imported
  structures, and all anonymous synthetic modern/legacy Preview/Edit pairs
  pass; ignored reports remain the only screenshot store.
- `DONE LOCAL`: a fresh browser now opens on Direct Edit instead of the
  technical split/block workspace. A valid saved mode is still respected.
  Before the first element exists, the editor displays an editor-only 850px
  white canvas without emitting a placeholder block. The first iframe replaces
  that canvas at the same horizontal origin and width, so the user's initial
  drop does not jump when source generation finishes.
- `DONE LOCAL`: structural layer selection and friendly-widget selection use
  separate iframe markers. Three consecutive full browser runs preserved
  multi-selection through the forced collision case and later multi-object
  movement with no console or page errors.
- `DONE LOCAL`: the edit toolbar keeps its stable single-row canvas offset at
  a compact desktop viewport. Dense text controls use accessible icon buttons,
  and the edit-flow browser smoke checks vertical overflow and control names.
- `DONE LOCAL`: compact desktop widths keep every main mode, edit target,
  language, modern/legacy, and upload-rule control visible. Labels collapse to
  named icon controls with tooltips, and browser smoke checks clipping and
  horizontal overflow.
- `DONE LOCAL`: the layer panel has a persisted 220-440px width with pointer,
  keyboard, and default-reset controls. Its responsive track is shared with
  the persistent iframe and inactive canvas slot. Browser coverage checks
  248px to 320px pointer expansion, a 16px keyboard step, reset, persistence,
  and identical panel/iframe/slot origins.
- `DONE LOCAL`: the virtualized layer list has tree semantics and one roving
  tab stop. Tab and Shift plus Tab move selection across rendered boundaries,
  scroll only when the next row leaves view, preserve an active visible row,
  and leave emitted HTML/CSS unchanged. Arrow-key object movement remains a
  separate existing contract.
- `DONE LOCAL`: eligible visual layers expose direct resize handles on the same
  persistent iframe surface. The iframe element follows the pointer before
  release; pointer-up writes width/height to managed CSS, removes the temporary
  inline preview, and preserves identical geometry in Preview and Edit. Flow
  layers keep their anchored edges, while absolute layers expose all edges and
  corners. Ordinary inline text and table-row structure stay excluded, while
  inline images remain directly resizable.
- `DONE LOCAL`: two or more absolute visual siblings sharing the same rendered
  coordinate parent expose left/center/right and top/center/bottom alignment.
  Unit coverage checks all six calculations. Browser coverage checks that a
  top alignment keeps the same parent and HTML order, writes managed CSS rather
  than inline position, and remains identical after Preview/Edit switches.
- `DONE LOCAL`: three or more layers eligible for alignment also expose
  horizontal and vertical equal-gap distribution. Unit coverage checks both
  axes and selection-order independence. Browser coverage checks uneven gaps
  becoming equal while outer bounds, parentage, managed-CSS persistence, and
  the shared Preview/Edit surface remain intact.
- `DONE LOCAL`: eligible absolute selections move by one pixel with an arrow
  key and ten pixels with Shift plus an arrow. The same path works while focus
  is inside the rendered sheet or on a layer row, paints in the iframe before
  the model round trip, writes managed CSS, and stays geometrically identical
  after Preview/Edit switches.
- `DONE LOCAL`: free placement converts iframe viewport pixels into local CSS
  pixels through an invertible 2D affine matrix. The bridge accumulates common
  `transform` matrices, 2D individual `translate`/`rotate`/`scale`, and CSS
  zoom, while scale-only geometry remains the compatibility fallback. Unit
  coverage checks scale and rotation inversion. Browser coverage checks both a
  75% frame and a nested frame/child pair that combines individual transforms
  with rotate/skew/scale transform lists. Optimistic movement follows the
  top-level pointer, every authored transform remains intact, managed position
  stays out of inline HTML, and Preview/Edit geometry agrees after commit.
  Per-message `WeakMap` reuse keeps shared ancestor measurement from growing
  quadratically across a deep hit path.
- `DONE LOCAL`: editor history chooses the newest recorded action across HTML,
  CSS, translation, Page JS, and Worker workspaces. Managed position/style
  writes share one Blockly event group, and multi-selection movement has one
  outer user-action group. Browser coverage moves three layers twice, undoes
  both steps independently, redoes both steps independently, and returns to
  identical Preview/Edit geometry with zero console or page errors. The same
  browser path now proves one-step undo/redo for flow reparenting, direct image
  resize, and a coordinated multi-layer section preset. Multi-target section,
  control, result-card, Roll-button, layout, and composition presets all share
  one outer history group.
- `DONE LOCAL`: a first free-placement commit that keeps the same structural
  parent now proves that only allowlisted `class`/`style` attributes changed,
  then patches those nodes in the persistent iframe instead of morphing the
  whole sheet. Any text, structure, tag, unrelated attribute, duplicate ID, or
  stale HTML-key difference falls back to the full patch. Modern and legacy
  browser smoke preserves runtime input, class, and style state with no iframe
  reload. The six-fixture anonymous edit suite and anonymous 5,200/9,000-item
  large-workspace paths pass with zero console/page errors.
- `DONE LOCAL PERFORMANCE`: shared Blockly layer snapshots are reused across
  the canvas, layer panel, preview, and inspector until a declared or
  structural workspace mutation invalidates them. Anonymous 5,200- and
  9,000-item browser checks now pass edit-ready, optimistic-paint, parent
  scheduling, target-plan, message-transfer, final-ACK, iframe-apply, drift,
  resource, and page-error budgets. Source emission remains the authority;
  this optimization does not replace it with a visual-only state.
- `DONE LOCAL PERFORMANCE RECHECK`: a fresh anonymous 9,000-item run measured
  13ms optimistic paint, 12.7ms parent scheduling, 5.5ms target planning,
  0.5ms transfer, 2ms iframe apply, and 294ms pointer-up-to-ACK with zero drift,
  matching Preview/Edit state, stable reimport, and zero console/page/resource
  errors. No speculative performance patch is warranted by this path.
- `PARTIAL`: continue usability review for dense imported structures, longer
  or dynamically changing/animated transform stacks, and 3D/perspective
  transforms. Add longer mixed history runs for imported structures while
  keeping local synthetic coverage distinct from actual Roll20 verification.

## P1 - User Experience

- `PARTIAL`: visual controls exist for sections, rows, text, inputs, images,
  tables, Roll buttons, and result cards. They write managed CSS rather than
  presentation inline HTML.
- `PARTIAL`: common block-add, import-safety, and export-diagnostic messages now
  use plain Korean instead of internal workspace, payload, runtime, or browser
  handler terms. The UI copy guard parses source literals and JSX text so
  internal comments do not hide or falsely trigger this rule. Continue the
  review for less-used panels and add visual examples where text alone is hard.
- `DONE LOCAL`: compact desktop plus 390x844 and 768x900 browser coverage keeps
  the pastel shell inside the viewport. Narrow screens replace the unusable
  split view with direct edit, give the persistent Roll20 iframe the full
  editor width, and open app sidebars and the layer tree as contained overlays.
- `DONE LOCAL`: when the center editor falls below 760px, its layer tree becomes
  an on-demand overlay. At the current 1280px shell this restores the shared
  Preview/Edit and empty-drop width from 376px to 580px. Opening the layer tree
  leaves the iframe and drop-slot origin and width unchanged; its exposed scrim
  closes reliably. Full edit-flow and fresh-sheet desktop/mobile smokes pass.
- `PARTIAL`: landscape phones, touch drag behavior, and dense imported sheets
  still need broader viewport review without changing the Roll20 render surface.
- `DONE LOCAL`: alignment actions are shown only for same-parent absolute
  selections whose logical and rendered coordinate parents agree. Flow, table,
  list, mixed-parent, and mixed-coordinate selections remain structure-driven.
  Three or more eligible layers add horizontal and vertical gap controls.

## P1 - Copyright And Privacy

- `DONE CURRENT TREE`: no real or derived sheet source, screenshot, generated
  report, or public sample belongs in tracked product assets.
- `DONE LOCAL`: compact tracked operating documents to current generic
  findings and remove unreferenced historical corpus ledgers from the current
  tree.
- `DONE LOCAL`: deterministic CI and pre-commit checks reject machine paths,
  source fixture labels, direct campaign identifiers, source URLs in sensitive
  evidence, and source-derived measurement records.
- `VERIFY HISTORY`: removed current-tree records may still exist in Git history.
  A clean-history repository or an explicitly approved history rewrite is
  required before claiming historical purge.

## Quality Gate

Every coherent code batch must pass:

- focused tests for the changed contract;
- `corepack pnpm run ci:verify`;
- `corepack pnpm run lint`;
- `corepack pnpm run build`;
- relevant browser smoke;
- `git diff --check`;
- project server hygiene;
- GitHub CI after push.

Local synthetic success is not actual Roll20 parity. Keep the full product goal
open until modern and legacy actual-screen evidence both pass with a current
generated payload.
