# Active TODO

Date: 2026-08-04

This file contains current work only. Historical per-sheet evidence, source
identities, machine paths, screenshots, and source-derived measurements do not
belong in tracked documents.

Fixed Alpha order: actual modern/legacy Roll20 Preview fidelity, universal
lossless block/layer mapping, diagnostics/export, then import-first UI. Existing
Figma-like editing stays behind an experimental boundary and resumes for Beta.
Numeric Alpha progress is valid only for the latest complete Harness version.
Gate weights live in
`docs/operations/41_product_reset_and_short_term_goals.md`.

## P0 - Roll20 Render Truth

- `DONE LOCAL / VERIFY MODERN SANDBOX`: export handoff now names the correct
  actual destination for each compatibility mode. Modern mode presents the
  three final files for Custom Sheet Sandbox; legacy mode points to a dedicated
  legacy-enabled test room and explicitly states that Sandbox cannot verify
  legacy behavior. Browser smoke covers both toggle states, destination copy,
  readiness badges, and diagnostic titles with zero console or page errors.
- `DONE ACTUAL LEGACY / VERIFY MODERN SANDBOX`: the corrected seven-fixture
  anonymous legacy suite now uses the exact manual-upload/ZIP preparation
  boundary instead of raw canonical emit text. Fresh pre-upload checks pass,
  all seven authored roots plus the applicable result card are captured and
  diffed as authoritative actual Roll20 evidence, and root mismatch is
  2.55%-5.04%. The deterministic result-card structure matches and its maximum
  aligned mismatch is 8.81%, below the high-mismatch threshold. Valid repeating
  runtime proof covers open-time row creation, field-change calculation,
  Add/Delete, and drag reorder. The current gate still holds any global renderer
  patch because broad full-root candidate coverage is missing. Modern Custom
  Sheet Sandbox file transfer remains separately blocked at the supported
  chooser boundary. Evidence stays in the ignored local run folder.
- `DONE LOCAL / VERIFY ACTUAL`: canonical import and block emission preserve
  authored class and ID tokens instead of forcing modern sheets into the
  legacy `sheet-` namespace. Modern Preview/Edit and exported files keep the
  authored tokens exact. Legacy Preview/Edit and export transform matching
  HTML and CSS once at the selected destination boundary. Focused import,
  emit, mode, upload-file, ZIP, lint, and build gates pass; all fourteen
  anonymous modern/legacy Preview/Edit browser pairs are pixel-exact with no
  console or page errors. Fresh valid legacy evidence is recorded above;
  supported modern Sandbox transfer remains a separate external gate.
- `DONE DIAGNOSTIC / VERIFY VALID ACTUAL`: the earlier owner-only modern and
  legacy repeating experiment used duplicate same-name fieldsets. Roll20's
  documented contract requires every repeating name to be unique and forbids
  underscores after `repeating_`, so that run is retained only as an
  invalid-input diagnostic and is not parity evidence. Import now preserves
  either invalid structure with a visible error, while export blocks the
  payload. The corrected seven-fixture anonymous suite passes modern and legacy
  local pre-upload gates. Legacy now has 8/8 authoritative generated captures;
  modern Custom Sheet Sandbox still needs a supported visible file transfer.
  Local readiness is not being reported as proof for that missing destination.
- `DONE LOCAL / VERIFY ACTUAL PIXELS`: the shared legacy Preview/Edit contract
  now applies the observed Roll20 HTML allow-list as well as legacy CSS
  sanitizing. Unsupported semantic wrappers are removed while supported
  children and Sheet Worker source survive. The refreshed legacy local capture
  now follows the actual flattened flow and all fourteen anonymous modern and
  legacy Preview/Edit pairs remain pixel-exact. Current authored-root actual
  comparisons are complete; broader full-root candidate comparisons remain
  required before any global renderer change.
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
  tools. A fresh seven-fixture modern baseline and its exact export-boundary
  pre-upload checks pass, but the supported visible chooser still returns
  `Not allowed` before transmission while the Chrome extension lacks local-file
  access. A new reconnect and visible-label chooser retry reached the same
  boundary. No file was transferred. No hidden input, endpoint, or
  existing-room workaround is allowed.
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

- `DONE TOOLING / VERIFY FULL BASELINE`: the local-only Corpus Harness now
  discovers manifest-selected and text-file sources without writing to external
  roots, emits anonymous mode rows, caches by input/code/mode, isolates every
  browser case, clusters generic failures, and selects feature-cover actual
  representatives. Synthetic modern/legacy full and cache-hit runs pass.
  Protected discovery is current. A focused protected regression now passes
  L2 after generic empty-translation-key and authored-input-name preservation
  fixes; Preview/Edit pixels, form state, geometry, and console/page gates also
  pass for that anonymous row. Harness v4 now compares canonical Blockly
  topology instead of `getAllBlocks()` creation order: random IDs and
  independent-root order are ignored, while input slots and `next` sibling
  order remain strict. Synthetic roundtrip coverage passes. The complete v4
  browser baseline finished and exposed broad generic mapping failures; it is
  retained only as the superseded diagnosis baseline. Harness v5 includes
  imported-attribute origin tracking and corrected attribute-delta reporting.
  Its complete browser baseline finished at commit `80029b2`; the measured
  Alpha score there is 28.9%. Broad L2 mapping still fails, L3 remains open,
  and the current follow-up mapping fix requires a fresh complete baseline
  before that score can be called current.

- `DONE LOCAL / VERIFY BROAD`: imported controls no longer invent browser
  defaults during their first emit. Missing number/hidden values stay missing,
  textarea keeps the browser default without adding a `rows` attribute, and an
  omitted text-input `type` remains omitted. Imported elements carry an empty
  attribute snapshot distinct from gallery-created blocks, so new controls
  keep their explicit design defaults. Synthetic modern and legacy browser
  roundtrips preserve block graph, Preview/Edit state, and runtime cleanliness.
  Harness v5 broad impact remains `VERIFY`.

- `DONE LOCAL / VERIFY BROAD`: a collapsed
  `<label><input type="radio">...</label>` no longer lets the wrapper overwrite
  the input's preserved attribute snapshot. Plain wrappers remain one editable
  radio block and keep input-only attributes. Wrappers with their own
  attributes use an explicit exact raw block until a dual-target structured
  radio model exists, preventing silent loss or nested labels. Unit coverage
  and modern/legacy browser roundtrips pass; broad corpus impact remains
  `VERIFY`.

- `DONE CI`: legacy keyframe sanitizing now accumulates retained
  source ranges and joins once instead of extending the result per character.
  Correctness and the large-input linear budget pass six consecutive isolated
  runs, followed by a complete passing `ci:verify` run.

- `DONE INTEGRATION`: `harness:corpus:changed` now compares the
  last complete ignored state, input hashes, and classified Git code impact.
  It re-keys only unaffected rows, reruns affected or changed rows, falls back
  to all rows when uncertain, and blocks runtime-dirty measurements. Pure
  impact and Harness self-tests pass. A clean modern/legacy synthetic full run
  followed by a docs-only SHA reused both rows, executed zero, and kept every
  local gate passing.

- `DONE LOCAL`: clean-SHA synthetic corpus `full` executed modern and legacy
  rows, produced a complete baseline, and passed all required local gates.

- `DONE BROWSER`: graph failure envelopes now include only the
  generic block type and generic field names at the first mismatch. This closes
  a diagnostic gap in the old attribute-only cluster without persisting source
  values, paths, or identities. A protected local target exposed the expected
  generic HTML and CSS mismatch shapes without retaining source evidence.

- `DONE CI`: the legacy sanitizer performance test now compares
  8,000 and 24,000 keyframe-heavy rules. Its 6x ratio ceiling separates linear
  3x growth from quadratic 9x growth while retaining the 1500 ms absolute cap.
  Ten consecutive isolated runs and the complete CI suite pass.

- `DONE LOCAL / VERIFY BROAD`: selector lists containing an empty item now
  stay as one exact `r20_selector_complex` block. This prevents an empty list
  tail from becoming `*` and then changing into `r20_selector_element` on
  reimport. Complex selector emission also preserves internal line breaks
  instead of replacing them with spaces. After a clean production build, the
  same protected local target passes HTML, CSS, i18n, Page JS, and Worker graph
  roundtrip plus local Preview, runtime, and resource checks. Broad corpus
  impact and L3 source normalization remain `VERIFY`.

- `DONE LOCAL / VERIFY BROAD`: preserved class snapshots now restore authored
  token order and whitespace when the generated class token multiset is
  unchanged. Added, removed, or otherwise edited class tokens still win over
  the stale snapshot. An isolated protected legacy target that previously
  failed seven `r20_col` class snapshots now passes all five workspace graphs,
  Preview/Edit pixels, form state, geometry, runtime, and resource gates. The
  broader old class-only cluster remains `VERIFY` until a fresh baseline.

- `DONE LOCAL GRAPH / VERIFY BROWSER`: radio and checkbox `checked` snapshots
  restore the authored boolean representation when the control remains checked,
  but no longer re-add `checked` after a user turns the block field off. The
  focused snapshot test and one anonymous legacy five-workspace graph probe
  pass. Broad default-state coverage and browser/runtime behavior remain
  `VERIFY`.
- `IMPLEMENTED / VERIFY CI`: preserved-attribute ownership is now generic for
  structured boolean fields (`checked`, `disabled`, `readonly`, `selected`,
  `required`, `multiple`, and `autofocus`). Unchanged fields may recover the
  authored bare/value form; fields switched off cannot be re-added from stale
  snapshots. The focused local rerun exceeded its 30-second workstation limit,
  so CI and one targeted anonymous graph probe remain required evidence.

- `DONE LOCAL / VERIFY BROAD`: imported roll and action buttons now retain an
  authored bare or prefixed `name` while the visible `NAME` field is unchanged.
  A real name edit emits the Roll20-standard `roll_` or `act_` prefix instead
  of restoring a stale snapshot. An isolated protected legacy target that
  previously failed two `r20_roll_button` name snapshots now passes all five
  workspace graphs, Preview/Edit pixels, form state, geometry, runtime, and
  resource gates. The broader old name-only cluster remains `VERIFY` until a
  fresh baseline.

- `DONE LOCAL / VERIFY BROAD`: ordinary HTML comments now map to the existing
  hidden-note block at the document root and inside nested structure. Compact
  title, button, radio-label, select, option, and inline shapes fall back to a
  structure-preserving element block when comments would otherwise be
  flattened. Reserved Page JS slot comments remain internal, and top-level
  comments emit without a layout wrapper. Authored comment boundary spaces and
  multiline payload whitespace now survive nested indentation and re-import;
  focused generator and emit-contract tests pass. The previous anonymous
  failure now passes all five workspaces in the headless graph probe. Browser
  Preview/runtime, the broad corpus baseline, and malformed-comment recovery
  remain `VERIFY`.
- `DONE LOCAL GRAPH / VERIFY BROWSER`: ordinary Page JS no longer gains forced
  body newlines or `data-r20-block-id` in its `<script>` attributes. The
  synthetic five-workspace probe and emit-contract regression pass. Broad
  corpus impact, ZIP backup behavior, and browser export smoke remain `VERIFY`.
- `DONE LOCAL / VERIFY BROAD`: HTML emission now preserves RCDATA and preformatted
  content, multiline quoted attributes, inline sibling order, and edited
  boundary whitespace across import -> emit -> import. Internal editor IDs are
  escaped at their attribute boundary, stale nested markers are removed, and
  literal JavaScript replacement tokens no longer corrupt protected fragments.
  The fallback parser now treats `textarea` and `title` as RCDATA and decodes
  the supported HTML references. Anonymous modern and legacy browser
  roundtrips pass repeatedly; ephemeral protected-input evidence also passes
  with clean console and page-error gates and was removed after classification.
- `DONE LOCAL / VERIFY BROAD`: local `getAttrs`, `setAttrs`, and
  `getSectionIDs` callbacks now leave the current JavaScript stack, preserve
  repeating-row context across the asynchronous boundary, and discard work
  from an obsolete render generation. Modern and legacy Worker-state browser
  smokes pass action state, repeating operations, callback timing, and a deep
  callback chain. This is simulator fidelity, not broad Sheet Worker support
  or actual Roll20 execution proof.
- `DONE LOCAL BOUNDED / VERIFY RUNTIME ASSETS`: repeated import roundtrips now
  run one browser and local server per bounded child process, with capped
  repetitions, timeout, and Node memory. Anonymous modern and legacy inputs
  pass repeated structural and runtime-clean checks. A protected legacy input
  also passes repeated structural roundtrip checks, while external hosted
  resources remain a separate warning. This is not broad endurance or visual
  parity proof.
- `PARTIAL`: HTML, CSS, translation, Rolltemplate, and a useful Sheet Worker
  subset map to editable blocks. Unsupported content must remain explicit and
  lossless instead of disappearing.
- `DONE LOCAL BOUNDED / VERIFY BROAD`: focused Corpus Harness runs now resolve
  anonymous IDs through a sensitive ignored private index. Initial discovery
  checkpoints each completed root, uses bounded filesystem concurrency, and
  caches repeated reads; public reports remain path-free. The real protected
  root that previously exceeded the execution limit now completes discovery,
  and the following focused run bypasses the root walk. Full current-SHA corpus
  measurement remains `VERIFY`.
- `DONE LOCAL REPRESENTATIVE / VERIFY CORPUS`: a generic preserved-attribute
  rule restores authored `type` spelling only when it is browser-equivalent to
  the generated input type, including the explicit empty text default. A real
  type edit still wins. Unit coverage and one anonymous modern protected
  representative now pass every local mapping, Preview/Edit, runtime, and
  resource gate. This does not prove the remaining corpus or actual Roll20.
- `DONE LOCAL REPRESENTATIVE / VERIFY CORPUS`: structural row, column, section,
  toggle, repeating-row, and grid shortcuts now require one exact copy of every
  defining class token. Incomplete or duplicate signatures stay generic and
  preserve their authored classes instead of inventing or collapsing structure.
  Synthetic import tests pass. One anonymous legacy representative now passes
  L2 plus Preview/Edit visual, form-state, geometry, and app-runtime gates.
  External font loading remains an explicit `asset` warning; the full current-
  SHA corpus and actual legacy Roll20 checks remain `VERIFY`.
- `DONE LOCAL REPRESENTATIVE / VERIFY CORPUS`: canonical CSS declaration values
  now treat whitespace outside strings as semantic while keeping quoted and
  escaped line breaks exact. Synthetic canonical-graph tests, lint, production
  build, and one anonymous modern representative pass all five workspace
  graphs plus Preview/Edit visual, form-state, geometry, runtime, and resource
  gates. L3 source equality, full current-SHA corpus breadth, and actual Roll20
  remain `VERIFY`.
- `DONE LOCAL`: `@font-face` keeps its four common settings structured and
  preserves every additional or repeated descriptor in an editable fallback
  field. Import, generator, and live browser reimport tests keep descriptor
  grammar, data-value semicolons, CSS graph, and source meaning stable with
  zero console/page/resource issues.
- `DONE LOCAL / PARTIAL WORKER EDITABILITY`: multiple authored Sheet Worker
  script tags no longer collapse into one tag. Until a first-class script
  container exists, each source script becomes one exact raw Worker root;
  single-script inputs still use structured blocks when byte-stable. Synthetic
  import, emit, and reimport preserve script count and order. Rich structured
  editing across multiple script containers remains `TODO`.
- `PARTIAL`: modern and legacy output are separate contracts. Selector
  prefixing, modern Sandbox preparation, and legacy CSS sanitizing must never
  be reported as the same operation.
- `PARTIAL`: anonymous synthetic coverage now combines table/list/form,
  conditional visibility, repeating sections, nested conditional CSS, custom
  properties, grouped control state, readonly/disabled state, nested
  `select`/`optgroup`/`option` structure, and inert Page JS in one browser path.
  Continue with broader uncommon form semantics, user-owned hosted assets,
  malformed selector families, and unsupported worker syntax.
- `DONE LOCAL / VERIFY ACTUAL ASSETS`: import and export preflight now classify
  CSS imports, direct font-file references, the documented legacy Google Fonts
  form, and legacy-restricted style/font references separately. The warning is
  visible only in legacy mode, uses plain Korean action copy, and keeps modern
  mode unchanged. Unit, UI-copy, full `ci:verify`, lint, production build, and
  browser checks pass with zero console, page, request, external-resource, or
  lingering-server errors. Actual user-owned hosted asset loading in Roll20
  remains `VERIFY`; local diagnostics do not prove it.
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
- `DONE ACTUAL SYNTHETIC`: valid repeating sections use one unique
  `repeating_*` fieldset, and handlers resolve row-context shorthand for
  `getAttrs` and `setAttrs`. Drag reorder persists `_reporder_repeating_*`,
  dispatches `change:_reporder:*`, and guards against the pointer-capture
  rollback found when a dragged row moves in the DOM. Duplicate same-name
  fieldsets and names containing an extra underscore remain losslessly
  editable for repair, but import marks them as errors and export blocks them.
  The corrected exact-upload legacy payload now passes actual open-time row
  creation, field-change calculation, Add/Delete, and drag reorder proof.
- `PARTIAL / VERIFY ACTUAL`: the documented `setSectionOrder` call now imports
  as a plain-language block, emits its section/order/optional completion body,
  and runs through the shared modern/legacy Preview/Edit iframe. Anonymous
  browser proof covers two rendered copies of a repeating section, persisted
  `_reporder`, Worker change source, asynchronous completion, restore, later
  player reorder, and zero console/page errors in both compatibility modes.
  Raw Worker source remains the lossless fallback for unsupported shapes;
  arbitrary formatting can remain raw when structured re-emission is not
  byte-stable. The earlier repeating subset has actual legacy execution proof,
  but this new API still needs actual Roll20 execution and broader Worker APIs
  and syntax remain incomplete.
- `DONE LOCAL / VERIFY ACTUAL`: `getTranslationLanguage()` now maps to a
  plain-language reporter block and emits the same API call. The shared
  Preview/Edit runtime returns the primary two-letter language code, preserves
  present translations, and returns `false` for a missing key. Modern and
  legacy browser smokes pass the same regional-language fixture with zero
  console warnings, console errors, or page errors. Actual Roll20 execution
  and additional Worker APIs remain open.
- `DONE LOCAL / VERIFY ACTUAL`: custom roll parsing now provides plain-language
  blocks and parser nodes for `startRoll`, `finishRoll`, roll IDs, and named
  result values. The shared Preview/Edit runtime supports callback and Promise
  forms, withholds chat until `finishRoll`, renders `computed::<name>` while
  retaining source dice details, and automatically posts after five seconds.
  Anonymous modern and legacy browser smokes pass all three paths with zero
  console or page errors. The actual-upload generator now emits an anonymous
  HTML/CSS/translation payload for both compatibility modes through the same
  preparation boundary used by export; its self-test, modern Sandbox-preparation
  smoke, and modern/legacy fixture visual smoke pass. The visible modern
  Sandbox chooser still rejects local-file transfer before transmission until
  Chrome file-URL access is enabled, so actual Roll20 execution remains
  `VERIFY`. Complex whole-Worker imports intentionally stay exact raw source
  until mixed Blockly hydration is safe. Result-card action links now remain
  literal through parsing, render from validated and escaped values, and send
  `eventInfo.originalRollId` plus player source back to the matching Worker
  `clicked:` handler. Anonymous modern and legacy browser smokes pass that
  roundtrip with zero console or page errors. Actual Roll20 execution of the
  action-link contract remains `VERIFY` in both destinations.

## P0 - Edit And Preview Unity

- `DONE LOCAL`: Preview and Edit use one persistent Roll20 iframe. Edit adds
  parent-owned controls and overlays instead of drawing a second sheet.
- `DONE LOCAL`: flow-aware before/inside/after moves, explicit free placement,
  grouping, container roles, table/list guards, layer auto-scroll, and
  collapsed-container opening have synthetic browser coverage.
- `DONE LOCAL`: flow placement now follows the rendered parent axis instead of
  assuming every container is vertical. Flex rows, column/row reversal, RTL,
  grid auto-flow, table rows, and inline flow report their axis and direction
  through the shared iframe bridge. Browser drag proof checks left/right
  before/after insertion, a vertical insertion marker, same-parent emitted HTML
  order, layer reorder, Rolltemplate editing, and zero console errors.
- `DONE LOCAL`: a Flow drag now treats the iframe's top-level multi-selection
  as one ordered operation. Every selected layer must be legal for the target;
  selected members and their descendants cannot become targets. Browser proof
  moves two selected layers into a different Flow container in rendered order,
  keeps both selected, removes temporary transforms, persists the same order
  to emitted HTML, and proves one-step undo/redo plus Preview/Edit equality with
  zero console or page errors.
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
- `DONE LOCAL`: direct canvas movement now reserves touch gestures only while
  Edit is active. A real two-contact browser path proves that the visible
  topmost layer follows the primary finger immediately, a secondary contact
  cannot replace the active drag, the sheet does not scroll, managed CSS owns
  the committed position, and Preview/Edit geometry remains identical.
- `DONE LOCAL`: touch and pen insertion now reuse the mouse drag target and
  commit contracts instead of maintaining a second editor model. Browser touch
  input covers a gallery card dropped on an empty sheet, a card inserted after
  an existing Flow child, layer-panel before/after reordering, and a result-card
  gallery insertion. Each path shows a held-card ghost and exact target marker,
  clears temporary state after release, selects the committed layer, reaches
  emitted HTML, and renders through the same persistent surface with zero
  console or page errors.
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
- `DONE LOCAL DENSE IMPORT`: an anonymous mixed frame/row/input/list/table
  fixture imports as one depth-6 tree with 1,295 blocks and 100% mapped source.
  Browser proof covers non-leaf layer reorder, Flow and free insertion, direct
  movement, one targeted HTML patch, exact Preview/Edit geometry, stable
  re-import, and zero console/page/resource errors. A separate 1,205-block
  shallow import passes the same direct synchronization path.
- `PARTIAL`: continue usability review for dense user-owned imports, longer or
  dynamically changing/animated transform stacks, and 3D/perspective
  transforms. Add longer mixed history runs while keeping anonymous synthetic
  coverage distinct from actual Roll20 verification.

## P1 - User Experience

- `DONE LOCAL`: high-traffic import/export controls now describe conversion,
  Roll20 mode, upload preparation, position, and image/font replacement in
  plain Korean. Internal warning codes and verification commands stay out of
  visible UI while browser tests use hidden stable identifiers. The import and
  export dialog smokes pass with zero console or page errors.
- `DONE LOCAL`: selecting a Blockly block now survives opening the properties,
  code, or roll panel. A real workspace-background click or Escape still clears
  selection. The previously failing raw Worker inspector path passes three
  consecutive browser runs after the fix.
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
- `DONE LOCAL`: the layer tree becomes an on-demand overlay whenever docking
  its default 248px track would leave less than the default 850px sheet width.
  The 1480px shell now keeps the shared Preview/Edit surface at 780px instead
  of squeezing it to 532px; the 1280px shell keeps 580px. At 1800px the layer
  tree remains docked and retains pointer, keyboard, reset, and persistence
  behavior. Opening the overlay never changes the iframe or empty-drop origin
  or width. Full edit-flow and fresh-sheet desktop/mobile smokes pass.
- `DONE LOCAL`: the 844x390 landscape phone shell keeps primary 44px touch
  targets while compacting short-screen chrome. Visible sheet height increases
  from 148px to 206px, horizontal overflow remains zero, and the layer overlay
  plus both tool drawers stay inside the viewport. Portrait phone and tablet
  coverage remain unchanged.
- `PARTIAL`: broader device/browser combinations and dense user-owned sheets
  still need usability review. Direct movement, gallery/layer-panel insertion,
  and the anonymous nested dense import have current browser proof.
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
