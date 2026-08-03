# Active TODO

Date: 2026-08-03

This file contains current work only. Historical per-sheet evidence, source
identities, machine paths, screenshots, and source-derived measurements do not
belong in tracked documents.

## P0 - Roll20 Render Truth

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
  accepted and persisted an anonymous manifest, launched its visible upload
  tools, and then returned `Not allowed` when the supported HTML chooser tried
  to select the newly exported file. No file was transferred. No hidden input,
  endpoint, or existing-room workaround is allowed.
- `PARTIAL`: local Preview/Edit and the dedicated modern and legacy destinations now have
  same-payload root comparisons against the exact authored top-level element,
  not the surrounding Roll20 wrapper. Authored-root dimensions and capture
  completeness agree. The current product baseline is closer than the tested
  generic CSS candidates, and different fixtures prefer different micro-fixes.
  The renderer-action gate therefore holds one global-patch blocker instead of
  introducing source-specific CSS. Broad-sheet parity is not proven.
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
  Continue with remaining uncommon form semantics, fonts, user-owned assets,
  malformed selectors, and unsupported worker syntax.
- `TODO`: give future JavaScript work its own inert source workspace and block
  mapping. Ordinary page scripts must remain invisible and non-executable in
  Preview/Edit.

## P0 - Edit And Preview Unity

- `DONE LOCAL`: Preview and Edit use one persistent Roll20 iframe. Edit adds
  parent-owned controls and overlays instead of drawing a second sheet.
- `DONE LOCAL`: flow-aware before/inside/after moves, explicit free placement,
  grouping, container roles, table/list guards, layer auto-scroll, and
  collapsed-container opening have synthetic browser coverage.
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
  pixels for an axis-aligned scaled containing frame. Unit coverage checks
  single and multi-object movement plus inside drops. Browser coverage drags
  one nested object inside a 75% frame, preserves its logical and rendered
  parent, writes owned CSS without inline position, and keeps exact geometry
  through Preview and Edit re-entry with zero console or page errors.
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
- `PARTIAL`: continue usability review for dense imported structures and
  untested rotated, skewed, or deeper mixed coordinate systems. Add longer
  mixed operation history runs for imported structures while keeping current
  local synthetic history coverage distinct from actual Roll20 verification.

## P1 - User Experience

- `PARTIAL`: visual controls exist for sections, rows, text, inputs, images,
  tables, Roll buttons, and result cards. They write managed CSS rather than
  presentation inline HTML.
- `PARTIAL`: common block-add, import-safety, and export-diagnostic messages now
  use plain Korean instead of internal workspace, payload, runtime, or browser
  handler terms. The UI copy guard parses source literals and JSX text so
  internal comments do not hide or falsely trigger this rule. Continue the
  review for less-used panels and add visual examples where text alone is hard.
- `PARTIAL`: the pastel shell and central editing controls have compact desktop
  browser coverage. Mobile drawers and broader viewport combinations remain to
  be reviewed without changing the Roll20 sheet render surface.
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
