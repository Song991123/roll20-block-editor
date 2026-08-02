# Agent Progress Log

Date: 2026-08-03

This is a compact handoff log. Record only generic product changes, named
verification commands, commit state, and remaining gates. Never record external
sheet identity, source URL, machine path, distinctive source markup, screenshot,
or source-derived measurement here.

## Current Branch

- Branch: `claude/design-reset`
- Read the current branch tip from Git; do not rely on a cached commit hash in
  this handoff file.
- Remote CI: passed safety/unit verification, lint, and production build.
- Worktree and project server state were clean after the run.

## 2026-08-03 - Unified Source History

- Added chronological undo selection across HTML, CSS, translation, Page JS,
  and Worker workspaces. Cross-workspace events sharing one user-action group
  now undo together, while redo follows the actual undo order.
- Managed position and style commits use Blockly event groups. Multi-selection
  movement adds one outer group, so three selected layers remain one history
  step instead of several CSS field edits.
- Stopped unrelated inline-style normalization when none of the managed
  properties are present. CSS-only updates now keep the current HTML structure
  interactive while the broader font/image paint-ready cycle finishes.
- The full edit-flow browser smoke moves three layers by 1px and then 10px,
  undoes both steps, redoes both steps, and proves the final Preview/Edit
  geometry is identical. Console and page error collections are empty, and the
  temporary server exits.
- Multi-target section, control, result-card, Roll-button, layout, and
  composition presets now share one outer event group. The browser smoke also
  proves one-step undo/redo for flow reparenting, direct image resize, and a
  coordinated section theme without Preview/Edit divergence.
- Claim boundary: anonymous local synthetic history coverage. Longer mixed
  imported-structure history runs, actual modern Roll20 verification, and
  broad-sheet parity remain.

## 2026-08-03 - Absolute Selection Keyboard Nudge

- Added one-pixel arrow-key and ten-pixel Shift-arrow movement for eligible
  absolute selections on the persistent iframe edit surface.
- Keyboard input works from the rendered sheet and from a focused layer row.
  The iframe paints temporary coordinates first, then the existing managed-CSS
  position commit becomes authoritative; no position is added to inline HTML.
- Eligibility requires each logical parent to match its rendered offset parent.
  Flow, table, list, runtime, nested-selected, and mixed-coordinate cases remain
  unchanged instead of being silently converted to free placement.
- Focused bridge/build/position tests, production build, and the full edit-flow
  browser smoke pass. The browser run verifies three-layer movement, immediate
  iframe timing, managed CSS, Preview/Edit geometry equality, zero console/page
  errors, and temporary-server cleanup.
- Claim boundary: this is anonymous local synthetic coverage. Broader history
  cases, dense imported-sheet ergonomics, and actual Roll20 interaction remain
  open.

## 2026-08-03 - Nested Select Option-Group Mapping

- Added an editable option-group block and routed nested options through the
  shared element matcher. Group labels, disabled state, classes, styles, and
  safe preserved attributes no longer disappear during import.
- Extended the structural verifier and shared browser expectation helper so
  nested group order, selected values, disabled groups, safe user `data-*`
  attributes, and emitted tag counts are checked from rendered DOM.
- The focused importer suite and every current anonymous Sandbox preparation
  case pass with zero console/page errors. Preview and Edit pass every current
  modern/legacy combination with exact pixel equality.
- One initial full browser run hit the local transport error
  `ERR_NO_BUFFER_SPACE`; the affected combination passed alone and a clean full
  rerun passed every combination. All temporary smoke servers closed.
- Claim boundary: this proves the current anonymous local option-group and
  shared-render contract. It is not modern Roll20 upload proof or broad-sheet
  parity.

## 2026-08-03 - Conditional-State Render Contract Coverage

- Added a third anonymous visual fixture combining checked and selected form
  defaults, conditional visibility, list and repeating structure, translation,
  inert ordinary Page JS, custom properties, and nested conditional CSS.
- Fixture manifests can now describe expected control state, structure,
  translation visibility, and script removal. Preview/Edit and Sandbox smokes
  share one expectation checker instead of maintaining separate rules.
- Modern and legacy Preview/Edit runs are pixel-exact for all three current
  anonymous fixtures. The Sandbox preparation run also passes its separate
  allow-list expectation, including removal of unsupported semantic wrappers.
- Verified with both synthetic browser smokes, `ci:verify`, `lint`, production
  `build`, and the Roll20 evidence guard.
- External browser verification stopped before interaction because the listed
  tab identity did not match the current visible page. No external Roll20
  evidence was claimed or recorded from that run.
- Claim boundary: this expands local synthetic render coverage only. A fresh
  supported modern Sandbox upload and broader dedicated legacy evidence remain
  external acceptance work.

## 2026-08-03 - Equal-Gap Multi-Selection Distribution

- Added horizontal and vertical gap controls for three or more absolute visual
  siblings that already satisfy the safe alignment contract.
- Distribution sorts by rendered position, keeps the outer selection bounds,
  and moves inner layers until the visible box gaps are equal. Parentage, HTML
  order, and cross-axis positions remain unchanged.
- The controls reuse the existing measured iframe selection and managed-CSS
  commit path; no new store or dependency was added.
- Unit coverage checks both axes and shuffled selection order. The edit-flow
  browser smoke checks two-item canvas selection, a third layer-panel selection,
  shared three-item free movement, unequal-to-equal vertical gaps, stable outer
  bounds, managed CSS, and subsequent Preview/Edit alignment parity.
- Claim boundary: this is anonymous local synthetic coverage. Dense imported
  sheets, nested coordinate systems, keyboard workflows, and actual Roll20
  interaction remain outside this batch.

## 2026-08-03 - Safe Multi-Selection Alignment

- Added one measured multi-selection frame and six icon actions above the same
  persistent Roll20 iframe used by Preview and Edit.
- Actions appear only for editable absolute siblings whose logical parent and
  rendered offset parent agree. Flow, table, list, mixed-parent, and
  mixed-coordinate selections keep their structural behavior.
- Alignment preserves parentage and HTML order and writes position through the
  existing managed-CSS path. It does not add presentation position to inline
  HTML.
- Six-way unit tests and the full edit-flow browser smoke pass. The browser run
  verifies a same-parent alignment, managed-CSS persistence, Preview/Edit
  geometry equality, and zero console or page errors. Its temporary server
  closed after the run.
- Claim boundary: this is anonymous local synthetic coverage. Distribution,
  nested-coordinate usability, broad imported-sheet behavior, and actual
  Roll20 interaction remain outside this batch.

## 2026-08-03 - Direct Resize On The Shared Sheet Surface

- Added direct edge/corner resize handles to eligible single selections on the
  parent-owned overlay above the persistent Roll20 iframe.
- Pointer movement changes the real iframe element immediately without
  rebuilding the sheet. Pointer-up commits touched dimensions once to managed
  CSS, then removes the temporary inline preview before the next paint.
- Absolute layers expose every edge and corner. Flow layers stay anchored and
  expose right, bottom, and bottom-right handles; ordinary inline text and
  table-row layouts remain excluded. Inline images keep box resize handles.
- The edit-flow browser smoke proves immediate iframe feedback, no pointer-up
  rollback, managed-CSS persistence, no emitted inline width/height, and equal
  geometry after Preview/Edit mode switches. Focused unit tests, lint, and the
  production build also pass.
- Claim boundary: this is anonymous local synthetic browser coverage. Alignment,
  multi-selection resize, broad imported-sheet usability, and actual Roll20
  resize behavior remain outside this batch.

## 2026-08-03 - Modern Chooser Boundary And Plain UI Copy

- Generated a fresh anonymous modern payload through the product export path
  and passed the synthetic export and upload-file checks.
- Opened the visible HTML file chooser in the modern Custom Sheet Sandbox. The
  supported browser file-selection action returned `Not allowed` before a file
  was transferred. CSS and translation were not attempted, and no hidden input
  or endpoint workaround was used.
- Removed internal workspace, payload, runtime, and browser-handler wording
  from common add, import, and export messages. The user now sees short action
  results and plain descriptions of cleaned code and generated files.
- Extended the UI copy guard to parse TypeScript/JSX string literals and JSX
  text. Its built-in regression check ignores internal comments but rejects the
  same technical phrases when they enter product copy.
- `guard:ui-copy`, lint, and the full edit-flow browser smoke passed. The smoke
  server closed after the run.
- Claim boundary: this improves local product language only. Modern actual
  upload and screen parity remain externally unverified.

## 2026-08-03 - Complete Legacy Payload Replacement Evidence

- Repeated the exact-one participant preflight in the dedicated legacy test
  destination before each room entry. No existing user room was modified.
- A visible editor fill initially appended a new anonymous payload to the old
  one. The resulting mixed sheet and failed translation were rejected as bad
  input application rather than mislabeled as a renderer defect.
- Replaced HTML, CSS, and translation as whole documents, saved, reloaded, and
  confirmed that previous synthetic content was absent. HTML/CSS persisted
  exactly; Roll20 reformatted translation JSON while preserving its values.
- Added a generated read-only persisted-payload checker for legacy settings and
  restricted the upload helper to its supported Sandbox controls. The checker
  distinguishes exact source, line-ending normalization, JSON formatting-only
  normalization, missing fields, and real mismatch.
- Both current anonymous legacy payloads now have element-level actual geometry
  evidence. Focused diagnostics retain the existing renderer baseline and make
  no production CSS change.
- Claim boundary: modern Sandbox upload, deterministic lossless chat capture,
  and broad-sheet parity remain open.

## 2026-08-03 - Actual Control Geometry Evidence

- Extended the local baseline, export-payload, same-context, and full-root
  probes to use one element schema for authored roots, structural elements,
  labels, form controls, Roll/action buttons, and state panels.
- Added a fail-closed distinction between `COMPARED` and `ROOT_ONLY`: an object
  containing only root metadata or empty element collections can no longer be
  reported as element-level evidence.
- Current Roll20 participant preflight accepts the visible member count first
  and a visible one-player card count only as a fallback. Conflicting sources
  stop the run.
- Fresh read-only probes in the dedicated owner-only legacy test room supplied
  actual element geometry for both current anonymous synthetic payloads.
  Hidden controls remain in structure/state evidence but are excluded from
  visual offset ranking.
- The tested visible controls are close enough that current evidence still
  favors no production renderer CSS change. The modern Sandbox still lacks
  equivalent actual element evidence.
- Claim boundary: two anonymous legacy control surfaces only. This is not broad
  sheet parity and does not complete modern verification.

## 2026-08-03 - Authored-Root Evidence Alignment

- Repaired the full-root candidate runner to use the product's real document
  builder and compare the exact authored top-level element selected by the
  local baseline, instead of comparing a Roll20 wrapper against sheet content.
- Matched the transient browser capture scale to the actual evidence manifest
  and added self-tests for authored-root selection, CSS-scale screenshots, and
  the trusted no-change recommendation.
- The existing product authored-root baseline remains closer than the tested
  generic CSS candidates, so the renderer-action gate now recommends no
  production CSS change from this evidence.
- Geometry diagnostics now report `ROOT_ONLY` when the actual element-level
  geometry sidecar is absent. Empty local/actual collections can no longer be
  mislabeled as matching selector or row evidence.
- Focused candidate, geometry, renderer-action, and actual-status checks passed
  against the current ignored synthetic run. The next actual evidence needed
  is an element-level geometry/computed-style capture, not another speculative
  renderer patch.
- Claim boundary: authored-root size alignment is verified for the tested
  synthetic legacy payloads. Residual pixel parity, modern actual verification,
  and broad-sheet parity remain open.

## 2026-08-03 - Chat Evidence Applicability And Trust

- Unified the Roll button/Rolltemplate capability check across actual status,
  chat capture planning, current-metric audit, and chat parity diagnostics.
  Layout-only payloads no longer produce false missing-chat work.
- Made current chat metrics structure-aware. Non-table result cards require
  template metrics but no longer fail table-only row/cell requirements; table
  result cards still require their table evidence.
- Replaced the chat structure comparator's historical fixed fixture list with
  current-run discovery. Payloads without Roll capability are skipped, hyphenated
  fixture ids are retained, and array/object/unavailable child evidence no
  longer crashes the comparison. A CI self-test now protects this path.
- Rechecked the anonymous legacy result card in the dedicated owner-only room.
  The fresh sidecar proves a foreground template, current computed styles,
  font checks, viewport scale, and non-table structure.
- The connected browser surface supplies a lossy viewport screenshot. Its
  foreground crop is retained as ignored diagnostic evidence, but shared
  capture-quality policy now prevents it from becoming authoritative pixel
  evidence or triggering a production renderer patch.
- The fresh structure comparison matches template class and row count but finds
  different rendered content. The status report now asks for the same template,
  fields, translation state, and roll substitutions before pixel comparison.
- Untrusted chat captures now report `NEEDS_AUTHORITATIVE_CAPTURE` instead of a
  misleading headline based only on their raw mismatch percentage.
- Claim boundary: actual legacy interaction and current DOM metrics are
  verified for the synthetic contract. Lossless chat pixel comparison, modern
  actual verification, and broad-sheet parity remain open.

## 2026-08-03 - Dedicated Legacy Actual Verification

- Extended the anonymous synthetic runtime payload with a real Roll action,
  custom result card, translated action button, and supported action-triggered
  Sheet Worker state change.
- In a newly created owner-only legacy-enabled test room, verified wrapper and
  root rendering, translation, controls, flow/table layout, full-height root
  capture, Worker state mutation, Roll execution, and result-card output.
- Corrected the actual-status gate so payloads with no Roll button or
  Rolltemplate do not require irrelevant chat screenshots. Added its self-test
  to the shared CI safety suite.
- Local Preview/Edit remained exact for both modern and legacy synthetic modes.
  Actual legacy full-root evidence passed the stitch and status gates. Fine
  chat typography/row diagnostics and the renderer-action gate remain open.
- Modern Custom Sheet Sandbox is still blocked at the supported browser file
  chooser: the visible chooser opens, but local-file transfer returns
  `Not allowed`. No hidden upload path was used.
- Claim boundary: current anonymous legacy payloads only. Modern actual-screen
  verification and broad all-sheet parity are not complete.

## 2026-08-03 - Compact Edit Toolbar

- Replaced wrapping edit-toolbar text actions with accessible icon controls
  while preserving tooltips, pressed state, width entry, and the stable canvas
  offset.
- Applied the same compact rule to the app-level mode, edit-target,
  language, compatibility, and upload controls. The secondary group can wrap
  safely instead of being clipped by the central card.
- Extended the edit-flow browser smoke to verify one-row geometry and
  accessible names, app-toolbar horizontal bounds, and an ignored local visual
  capture at a compact desktop viewport before continuing through the existing
  drag, grouping, and Preview/Edit checks.
- Focused browser smoke, full `ci:verify`, lint, production build, document
  privacy guard, and diff checks passed. Temporary test servers exited.
- Claim boundary: local toolbar usability only. Actual Roll20 modern and legacy
  parity remains open.

## 2026-08-03 - Canvas Selection Isolation

- Separated structural layer selection from friendly-widget selection inside
  the persistent iframe. A widget synchronization reset no longer removes a
  Ctrl/Cmd structural selection.
- Added a build-document regression plus a browser collision check that keeps
  both selected layers visible before continuing through multi-object movement
  and the remaining edit-flow suite.
- Focused tests, full `ci:verify`, lint, production build, and three consecutive
  full edit-flow browser runs passed. Console and page error collections were
  empty, and each temporary server exited.
- Claim boundary: local editor-selection stability only. No actual Roll20
  parity status changed.

## 2026-08-03 - Tracked Documentation Privacy

- Replaced append-only operating histories with compact current contracts and
  removed unreferenced historical corpus ledgers from the current tree.
- Added a dependency-free tracked-document privacy guard with self-tests. CI
  scans the worktree and the pre-commit hook scans the staged document state.
- The changed Markdown set shrank from about 2.90 MB to 0.11 MB, a 96.1%
  reduction in repository startup context. This is file-size evidence, not a
  provider token or billing estimate.
- Claim boundary: current-tree documents only. Git history still requires a
  separate clean-history or explicitly approved rewrite decision.

## 2026-08-03 - Structural Inside Moves

- Added anonymous synthetic cross-container coverage for frames, lists, table
  sections, and conditional cases through the real layer-panel `inside` path.
- Fixed conditional-case internal editor identity and preservation of an
  imported initial radio value. Export still removes internal editor markers.
- Model parent, rendered parent, Preview parent, and emit/re-import membership
  agree in local browser tests.
- Claim boundary: anonymous local structure coverage only. Broad user imports
  and actual modern/legacy Roll20 remain open.

## 2026-08-02 - Long Layer Navigation

- Added edge auto-scroll for the virtualized layer panel and delayed opening of
  valid collapsed containers during an inside drag.
- Parent-level cleanup removes stale drag identity even when virtualization
  unmounts the source row.
- Local browser smoke covers movement, stop-on-drop, container opening, and the
  existing flow/free/table contracts.

## 2026-08-03 - Grouped Form State Preservation

- Corrected preserved-attribute targeting for generated radio labels so source
  input attributes return to the nested input instead of leaking onto its
  wrapper.
- Restricted the local Sheet Worker attribute bridge to real form controls and
  made grouped radio reads return the checked member.
- Preserved every selected value from a multi-select across persistent iframe
  patches and the Shadow fallback instead of restoring only `select.value`.
- Added a fourth anonymous fixture covering grouped radios, multi-select state,
  readonly and disabled controls, and Worker `getAttrs` initialization.
- All four fixtures passed Preview/Edit comparison with zero differing pixels
  in modern and legacy modes. All four also passed local Sandbox preparation
  with no console or page errors.
- Claim boundary: local anonymous render/runtime coverage only. Supported
  modern Sandbox upload and broad actual Roll20 parity remain open.

## Current Product State

- Preview and Edit share one persistent Roll20 iframe.
- Modern and legacy output paths are separate.
- User HTML/CSS/translation import, managed CSS authoring, layer operations,
  local autosave, export, worker subset execution, Roll buttons, chat history,
  and result-card editing exist with synthetic tests.
- Public examples remain empty; user imports and user-authored content are the
  supported source of sheets.

## Open Gates

1. Supported modern Custom Sheet Sandbox upload and actual-screen verification.
2. Equivalent actual element-level evidence for the remaining synthetic and
   modern paths, plus deterministic lossless same-state result-card capture
   before renderer changes.
3. Broader anonymous mapping and edit coverage for uncommon structures.
4. Future JavaScript workspace and lossless unsupported-source policy.
5. Current-tree privacy cleanup, followed by an explicit Git-history decision.

Do not turn any local pass into a claim of all-sheet support or Roll20 visual
parity.
