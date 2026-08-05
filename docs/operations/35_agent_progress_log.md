# Agent Progress Log

Date: 2026-08-04

This is a compact handoff log. Record only generic product changes, named
verification commands, commit state, and remaining gates. Never record external
sheet identity, source URL, machine path, distinctive source markup, screenshot,
or source-derived measurement here.

## Current Branch

- Branch: `codex/alpha-integration`
- Read the current branch tip from Git; do not rely on a cached commit hash in
  this handoff file.
- Read the current remote checks from GitHub; do not rely on a cached CI result
  in this handoff file.
- Confirm worktree and project server state at the end of every run.

## 2026-08-04 - Local Corpus Harness Foundation

- Added read-only discovery for manifest-selected HTML/CSS, translation,
  Worker, ordinary JavaScript, raster assets, reference images, and text-file
  source variants. Persisted output uses anonymous IDs and generic features.
- Added input/code/mode cache keys, strict result validation, generic failure
  clusters, stable representative set-cover, and isolated browser processes
  with bounded concurrency, timeout, cleanup, and resumable per-case cache.
- Strengthened L2 browser roundtrip from output-string stability to block type,
  hierarchy, and field equality. Import metrics now separate structured blocks,
  raw fallback preservation, and unexplained drops.
- Preview/Edit Harness checks use the same persistent iframe in modern and
  legacy modes. Synthetic full and cache-hit runs pass both modes; production
  build and focused self-tests pass.
- Claim boundary: protected discovery is current, but its first full browser
  baseline remains open. No Alpha percentage is valid yet, and local success
  cannot grant actual Roll20 L4.

## 2026-08-04 - Corpus L2 Preservation Fixes

- Fixed a real translation roundtrip loss: an empty JSON key now remains an
  editable locale block and survives import, emit, reimport, and Roll20 export.
- Imported input controls now retain their authored `name` attribute when the
  visible NAME field is unchanged. A user edit still produces the normal
  Roll20 `attr_` form, so new-block behavior remains compatible.
- L2 now checks stable HTML, CSS, translation, Page JS, Worker source, block
  counts, and all five workspace graphs. Only bounded semantic normalization
  is accepted; changed attribute names or values remain failures.
- One protected anonymous case now passes L2 plus Preview/Edit pixels, form
  state, geometry, and zero console/page errors. External asset failures stay
  visible as resource warnings instead of being mislabeled as a runtime crash.
- Claim boundary: this is a focused protected regression, not the complete
  baseline. Alpha progress remains withheld until every discovered row has a
  result under one committed Git SHA.
- Full-baseline preparation no longer rereads the same source or image bytes
  for every case. Per-run file digests are memoized as compact hashes, keeping
  cache invalidation content-based without retaining protected file contents.

## 2026-08-04 - Custom Roll Chat Actions

- Preserved Roll20 custom-roll action fields such as `[label](~action)` as
  literal template values instead of misclassifying the leading single bracket
  as an inline-roll expression. Only `[[...]]` now starts an inline roll.
- Result-card action links are rendered from validated action names, keep their
  labels HTML-escaped, and route clicks back to the shared Preview/Edit Worker
  runtime. Custom-roll cards carry their originating roll ID so the matching
  `clicked:` handler receives `eventInfo.originalRollId` and player source.
- `test:rolltemplate-render`, production build, synthetic payload self-test,
  and anonymous modern plus legacy browser smokes pass. Both browser modes
  cover the result-card click and original-roll-ID roundtrip with zero console
  or page errors.
- Claim boundary: local shared-runtime behavior is `DONE`. Actual modern
  Sandbox and dedicated legacy-room execution of this action contract remain
  `VERIFY`; the supported Sandbox file chooser still stops before transmission.

## 2026-08-04 - Sheet Worker Custom Roll Lifecycle

- Added plain-language blocks and parser coverage for `startRoll`, `finishRoll`,
  the roll ID, and named roll result values. Complex imported Worker programs
  still remain one exact raw source block until whole-program Blockly hydration
  is safe; the parser representation and manually authored blocks are tested.
- The shared Preview/Edit iframe now supports callback and Promise forms,
  returns Roll20-shaped named roll data, holds the result for `finishRoll`, adds
  `computed::<name>` values to the result card, and posts unfinished rolls after
  five seconds.
- Focused parser, mapping, rolltemplate, document-build, production-build, and
  anonymous modern/legacy browser smokes pass. Both browser modes cover callback,
  Promise, computed result display, five-second automatic posting, and zero
  console or page errors.
- Added an anonymous actual-upload payload option that emits HTML, CSS, and
  translation through the same preparation boundary as export in modern and
  legacy modes. Its self-test, modern Sandbox-preparation smoke, and
  modern/legacy fixture visual smoke pass.
- The supported visible modern Sandbox chooser was reached, but Chrome rejected
  local-file transfer before transmission because file-URL access is disabled.
  No bypass or room write was attempted.
- Claim boundary: this is local shared-runtime and pre-upload evidence. Actual
  Roll20 execution, action links carrying `originalRollId`, and broader
  whole-Worker block hydration remain open.

## 2026-08-04 - Sheet Worker Translation Language Contract

- Added a plain-language reporter block for `getTranslationLanguage()` and
  mapped existing Worker source to it without raw fallback. Structured import
  and generation keep the official call shape.
- The shared Preview/Edit runtime now returns the primary account-language
  code and returns `false` for a missing translation key instead of echoing the
  key. The retained Shadow compatibility path follows the same behavior.
- Parser and generator tests pass. Anonymous modern and legacy browser smokes
  both prove a regional document language, its two-letter Worker result, one
  translated value, a missing-key `false`, and zero console warnings, console
  errors, or page errors.
- Claim boundary: this is local simulator and source-mapping evidence. Actual
  Roll20 execution and broader Worker APIs remain separate verification work.

## 2026-08-04 - Plain-Language Handoff And Stable Block Selection

- Reworded the high-traffic import, export, compatibility, position, and
  image/font address controls in plain Korean. Internal verification commands
  and warning codes no longer appear in product copy; browser tests retain
  stable hidden identifiers instead.
- Fixed a Blockly selection regression where opening the properties tab sent a
  blur-style deselection event and emptied the inspector. Selection now stays
  active when the user moves to an app panel, while a workspace-background
  click or Escape can still clear it.
- UI-copy guard, export unit smoke, production build, lint, import-dialog smoke,
  export-dialog smoke, and the full edit-flow browser smoke pass. The import
  smoke failed consistently before the selection fix and passed three
  consecutive runs after it. Browser runs report zero console or page errors.
- Claim boundary: this batch improves local language and editor interaction.
  It does not close the supported modern Sandbox file-transfer permission gate
  or prove broad real-sheet visual parity.

## 2026-08-04 - Structured Repeating Row Order Worker

- Added a plain-language Sheet Worker block for `setSectionOrder`. Import keeps
  the section, order expression, and optional completion body; generation emits
  the official two- or three-argument shape without flattening unsupported
  expressions.
- The shared Preview/Edit iframe now applies the requested row order to every
  rendered copy of a repeating section, persists `_reporder`, emits the
  Roll20-shaped change event, and invokes the completion callback
  asynchronously. Modern and legacy use the same runtime behavior.
- Parser and generator tests pass. Anonymous modern and legacy browser smokes
  both pass worker-driven reorder, restore, persisted order, asynchronous
  completion, duplicate rendered sections, later player reorder, and zero
  console or page errors.
- Claim boundary: this closes one documented Worker API locally. Broader Worker
  APIs and syntax remain partial, and actual Roll20 execution for this new API
  remains a separate verification item.

## 2026-08-04 - Mode-Specific Roll20 Upload Handoff

- Export guidance now follows the selected compatibility mode. Modern mode
  points individual files, readiness copy, and advanced diagnostics to Custom
  Sheet Sandbox. Legacy mode points them to a dedicated legacy-enabled test
  room and explicitly says Sandbox cannot verify that mode.
- The selected destination updates in the same dialog as the shared
  Preview/Edit/export compatibility switch. Browser smoke verifies both mode
  transitions, destination labels, file handoff copy, and diagnostic titles
  with zero console or page errors.
- A fresh anonymous modern upload payload passes its generator self-test and
  exact local Sandbox-preview smoke. The supported visible Roll20 chooser was
  retried after reconnecting the browser, but local-file access is still denied
  before transmission. No workaround or existing user room was used, so modern
  Sandbox upload and chat evidence remain open.
- Full `ci:verify`, lint, production build, export-dialog browser smoke, and
  tracked-doc privacy guard pass. Final server hygiene reports zero project and
  CDP listeners.

## 2026-08-04 - Legacy Asset Compatibility Guidance

- Import/export preflight now distinguishes the documented legacy Google Fonts
  form from CSS imports and direct font files that legacy Roll20 may restrict.
  The extra warning follows the shared compatibility mode, stays hidden in
  modern mode, and does not change or bypass the measured runtime proxy policy.
- The affected UI uses plain Korean action language. New replacement drafts use
  a Korean placeholder and Korean comments, while previously saved English
  placeholders remain safely recognized as incomplete instead of being
  applied.
- Focused asset, replacement, sanitizer, UI-copy, full `ci:verify`, lint,
  production build, and import/export browser checks pass. The browser run
  verifies both mode transitions with zero console, page, request, or
  external-resource errors. Final server hygiene reports zero project and CDP
  listeners.
- Claim boundary: this proves local diagnostics and interaction only. Actual
  user-owned hosted image/font loading still requires Roll20 evidence.

## 2026-08-04 - Lossless HTML Comment Mapping

- Connected ordinary HTML comment nodes to the existing hidden-note block.
  Root comments and comments inside structure containers now keep source order;
  reserved Page JS slot comments still use their separate internal block.
- Elements whose compact block shape would flatten commented children now use
  the generic structure-preserving element path. This keeps the authored tag,
  attributes, visible text, and comment order instead of silently discarding
  the comment.
- Top-level comment blocks no longer receive an editor-only `div` wrapper, so
  an invisible source note cannot add layout or an extra block on re-import.
- Import and emit unit tests pass. Anonymous modern and legacy browser
  roundtrips keep block count and eight comment blocks stable with matching
  HTML/CSS and zero console or page errors. This is local source-fidelity
  evidence, not actual Roll20 visual proof.

## 2026-08-04 - Bounded Import Process Isolation

- Added a bounded repeated-import harness that gives every iteration its own
  Node process, browser, page, and local server. Repetition count, timeout, and
  Node memory are capped, and aggregate reports omit source paths and content.
- The report now separates structural roundtrip success from hosted-resource,
  console, and page health. Anonymous modern and legacy runs are clean. A
  protected legacy input repeatedly preserves structure but retains external
  resource warnings, so it is not reported as runtime-clean or visually equal.
- Roll20's published guidance keeps legacy and modern sanitization separate and
  restricts legacy external fonts. The local renderer therefore does not add a
  direct-load bypass that would look better than Roll20; user-facing asset
  diagnostics remain `VERIFY`.
- The harness self-test, repeated anonymous modern/legacy browser runs, full
  `ci:verify`, `lint`, production `build`, and tracked-doc privacy guard pass.
  Ephemeral evidence is removed and project/CDP listeners are zero. The
  implementation is committed and pushed, and its exact GitHub CI run passes.

## 2026-08-04 - Canvas-First Responsive Layer Panel

- A synthetic desktop browser audit found that the fixed 760-pixel breakpoint
  still docked a 248-pixel layer tree inside a 780-pixel center editor. This
  left only 532 pixels for the default 850-pixel sheet.
- The responsive contract now overlays the layer tree whenever its default
  track and the 850-pixel sheet cannot both fit. The 1480-pixel shell preserves
  a 780-pixel shared Preview/Edit surface, while the 1280-pixel shell preserves
  580 pixels. A wide 1800-pixel shell still docks and resizes the layer tree.
- The browser smoke now scrolls a full-size long sheet target into view before
  multi-move and explicitly opens and closes the layer overlay for touch layer
  reordering. This removes accidental dependence on a scaled-down canvas.
- Full `ci:verify`, `lint`, production `build`, modern and legacy render-mode
  checks, modern and legacy Worker-state smokes, and the full edit-flow browser
  smoke pass. The browser run reports zero console and page errors.
- Claim boundary: this is anonymous local editor evidence. Actual Roll20 upload
  and normalized visual parity were not rerun in this batch.

## 2026-08-04 - Import Roundtrip And Worker Callback Stability

- Fixed a generic emission corruption where JavaScript replacement-token
  syntax inside generated IDs was interpreted while restoring protected
  preformatted fragments. Attribute escaping, stale-marker cleanup, RCDATA
  parsing, multiline whitespace preservation, and inline sibling joining now
  share anonymous regression coverage.
- Limited final internal-marker normalization to real opening-tag attributes.
  Worker source, RCDATA, ordinary text, and comments remain untouched. Import
  cleanup no longer re-walks every descendant for every matched node.
- Matched the official asynchronous callback contract for `getAttrs`,
  `setAttrs`, and `getSectionIDs`. The local queue retains repeating-row
  context, invalidates stale render generations, and prevents recursive
  callback chains from exhausting the JavaScript stack.
- Full `ci:verify`, `guard:docs-privacy`, `lint`, production `build`, and the
  focused emit/import/Worker bundle tests pass. Explicit modern and legacy
  Worker-state smokes pass, as do repeated anonymous modern and legacy import
  roundtrips. An ephemeral protected-input run passes roundtrip plus clean
  console/page gates; all private helpers and evidence were deleted afterward.
- Claim boundary: actual Roll20 visual/runtime parity was not rerun in this
  batch. Large protected-input repetition still needs bounded process
  isolation before it can be an endurance gate.

## 2026-08-03 - Valid Repeating Contract And Pre-Upload Gate

- Reclassified the earlier duplicate same-name repeating experiment as an
  invalid-input diagnostic. Roll20 requires a unique `repeating_*` name per
  fieldset and forbids another underscore in the section name; it is not a
  supported alternate-view contract.
- Import keeps invalid authored sections editable but reports a visible error.
  Export now blocks duplicate and underscored names instead of emitting a
  non-blocking warning. The normal anonymous visual matrix uses one valid
  repeating fieldset.
- The Preview/Edit visual gate now selects the matching modern or legacy HTML
  expectation. Seven anonymous fixtures across both modes pass with exact DOM,
  computed style, geometry, and zero mismatched pixels. Fresh modern and legacy
  pre-upload runs pass all seven local checks.
- `lint`, production `build`, full `ci:verify`, ImportDialog browser smoke, and
  the fourteen-pair Preview/Edit visual smoke pass on the final code. Import
  validation reuses the existing parsed DOM instead of parsing large HTML a
  second time.
- Chrome extension communication timed out before participant preflight. No
  Roll20 room was opened or changed, so a fresh valid actual upload and
  full-height normalized comparison remain `VERIFY`.

## 2026-08-03 - Actual Repeating Runtime And Legacy HTML Sanitizing

- Applied one anonymous but invalid duplicate-section payload only to fresh owner-only
  modern and legacy verification destinations after current participant and
  compatibility checks. Persisted HTML/CSS matched exactly and translation
  matched semantically. This run is diagnostic evidence only because the
  authored repeating name was not unique.
- Both destinations initialized Worker rows and synchronized value changes,
  calculated totals, and deletion across duplicate rendered instances. Modern
  reorder synchronized row IDs but exposed an actual Roll20 limitation: the
  second instance could retain stale displayed values. Legacy reorder remains
  unverified after compatibility flattening.
- Actual legacy Roll20 removed unsupported semantic wrappers while preserving
  their supported children. The shared local legacy render contract now reuses
  the existing HTML allow-list transform, so Preview and Edit reproduce that
  flattened structure instead of retaining panels Roll20 removes.
- That batch originally emitted a non-blocking warning for duplicate same-name
  repeating fieldsets; the current contract supersedes it with a blocking
  error. Focused preview/export tests, legacy preview smoke,
  production build, and the fourteen-pair modern/legacy Preview/Edit visual
  smoke pass. Full `ci:verify`, lint, and tracked-document privacy checks also
  pass.
- Claim boundary: the legacy structural mismatch is fixed locally, but a
  normalized full-height local/actual pixel comparison, legacy reorder, and a
  Roll20-safe duplicate-view architecture remain open.

## 2026-08-03 - Shared Repeating Rows And Reorder

- Same-name repeating fieldsets now render alternate views of one shared row
  set. Creation, value changes, calculated Worker writes, deletion, and display
  order synchronize across every instance.
- Repeating event handlers resolve documented row-context shorthand for
  `getAttrs` and `setAttrs`. The parser and visual Worker catalog also recognize
  `change:_reporder:section`.
- Modify-mode drag reorder persists `_reporder_repeating_section` and dispatches
  its Worker event. Pointer capture moved from the reordered handle to the
  stable row container, preventing a DOM move from cancelling and rolling back
  the drag.
- `test:build-doc-bundle`, `test:worker-parser`,
  `test:high-priority-mapping`, production `build`, `smoke:worker-state`,
  `smoke:worker`, and the 12-pair modern/legacy synthetic Preview/Edit pixel
  comparison pass.
- Claim boundary: this is local synthetic runtime proof. Broader Worker APIs
  and actual modern/legacy Roll20 execution remain open.

## 2026-08-03 - Repeating Section Runtime And Worker Events

- Replaced visible repeating-fieldset placeholders with a local Roll20-shaped
  runtime: hidden templates, `repcontainer`/`repcontrol` group metadata,
  `repitem` row IDs, row name rewriting, Add, Modify/Done, and deletion.
- `setAttrs` can materialize a missing repeating row. `generateRowID`,
  `getSectionIDs`, and `removeRepeatingRow` now operate on those rows instead of
  returning synthetic IDs beside a no-op removal function.
- Repeating changes dispatch the full attribute, section-field, whole-section,
  plain-field, and `_max` aliases. Player and Worker deletion dispatch section
  and row events with lowercased source attributes and `removedInfo`.
- Bundle/parser/generator checks, production build, Sandbox-shaped six-fixture
  smoke, exact modern/legacy Preview/Edit comparison, edit-flow smoke, and the
  expanded Worker-state browser smoke pass. A transient Worker-workspace smoke
  startup race was reproduced; its import now uses the existing stable retry
  pattern and passed three consecutive runs.
- Claim boundary: this is local synthetic runtime proof. Row reorder,
  `_reporder`, row-context shorthand, broader APIs, and actual Roll20 execution
  remain open.

## 2026-08-03 - Worker Event State And Import Readiness

- Added previous/new values to local change events and made source attributes
  lowercase like the Roll20 event contract. Player edits and Worker writes use
  one cached change path instead of overlapping document listeners.
- `setAttrs` blocks now preserve the official silent option and an optional
  completion body. The local runtime suppresses dependent events when silent
  while still running the completion callback.
- A cold-load browser run exposed an import race: analysis reported full HTML
  coverage before the dynamically loaded Blockly workspaces existed, leaving
  zero applied blocks. Import now waits for all model workspaces or reports a
  plain failure instead of silently succeeding.
- Parser/generator checks and browser smokes cover both multi-event attributes,
  previous/new values, player and Worker source types, silent non-propagation,
  callback completion, cold-load import application, and zero queue overflow.
- Claim boundary: evidence is local and synthetic. Repeating event aliases,
  removed row information, broader Worker APIs, and actual Roll20 execution
  remain open.

## 2026-08-03 - Multi-Event Worker Blocks And Event Context

- Replaced the canonical multi-event raw fallback with a generic editable
  event-listener block. It keeps the full event string and optional callback
  variable instead of splitting one listener into behaviorally different hats.
- Added a reporter for common Roll20 event fields. Local preview events now
  distinguish player changes, Worker `setAttrs` changes, and action clicks.
- Parser, generator, diagnostics, source-roundtrip browser, runtime-state
  browser, import-dialog browser, and full edit-flow checks pass. The runtime
  check fires both attributes registered by one listener and sees the expected
  source attribute and player source type with no queue overflow.
- Claim boundary: this proves the canonical structured path and current local
  simulator subset. Source that cannot re-emit byte-stably still stays raw;
  previous/new values and broader Worker syntax remain open. No actual Roll20
  screen evidence was added in this batch.

## 2026-08-03 - Raw Worker Diagnostics And Block Selection

- Traced both raw-code paths: explicitly unsupported statements and the
  whole-source fallback used when structured re-emission could change authored
  code. Existing import totals missed a fully unsupported Worker body even
  though the Worker workspace preserved it.
- Added source-derived, read-only reasons for multi-event handlers, selection
  branches, error handling, async flow, unsupported loops, declarations,
  advanced Roll20 API shapes, and generic raw statements. Parseable code kept
  in a raw block is described as a user-managed source choice.
- Import results now use the actual Worker workspace parse count. Selecting a
  Blockly block also updates the external inspector; selection still performs
  no workspace serialization or structure-version work.
- Worker parser and diagnostic tests, import structure tests, production build,
  import-dialog browser smoke, Worker workspace smoke, and full edit-flow smoke
  pass. The browser run covers import warning, real Blockly selection, reason
  display, hidden preview runtime nodes, source emission, and zero console/page
  errors.
- Claim boundary: diagnostics and selection are complete for the current local
  synthetic paths. Structured Worker syntax/runtime coverage remains partial,
  and this batch adds no actual Roll20-screen evidence.

## 2026-08-03 - First-Run Direct Edit Canvas

- Reproduced a product-priority mismatch on a clean browser: the technical
  split/block workspace opened before the primary direct-edit workflow, and an
  instructional empty state hid the actual sheet boundary until the first
  object was created.
- Fresh browsers now enter Direct Edit. Existing valid saved mode choices stay
  intact. The empty editor renders a non-emitted 850px white sheet at the same
  scaled origin used by the persistent iframe after the first drop.
- Fresh-sheet browser smoke now checks the default mode, visible empty canvas,
  a real gallery drag, preset retention, pointer alignment, and canvas-to-iframe
  origin continuity. Full edit-flow, six-fixture imported edit synchronization,
  and twelve anonymous synthetic modern/legacy Preview/Edit comparisons pass.
- A current visible modern Sandbox file chooser was reached with a freshly
  verified anonymous payload, but Chrome rejected file selection before
  transmission because local-file access remains disabled. No Roll20 source
  was uploaded in this attempt.

## 2026-08-03 - Empty-Sheet Direct Gallery Drop

- Reproduced a user-facing creation split: a friendly gallery card dropped on
  an empty sheet fell through to raw block creation, losing the card preset and
  deriving position from the surrounding app surface.
- Added an explicit sheet drop surface that maps its pointer to the centered
  configured sheet canvas before the first iframe exists. Friendly payloads
  now stay on the preset path, retain their starting presentation, select the
  new layer, and use managed CSS coordinates.
- The fresh-sheet browser smoke now performs a real gallery drag, checks the
  preset width and pointer-aligned rendered box, and stores its screenshot only
  in the ignored report directory.
- Canvas-coordinate tests, fresh-sheet smoke, full edit-flow smoke, six-fixture
  imported edit synchronization, both render-mode contracts, and all twelve
  modern/legacy Preview/Edit comparisons pass. Actual Roll20 evidence is
  unchanged by this local editor batch.
- Final `ci:verify`, lint, production build, tracked-document privacy, and
  browser fresh-sheet drag gates pass on the completed source batch.

## 2026-08-03 - Modern Sandbox CSS Rejection Boundary

- Reproduced a false whole-stylesheet rejection in modern Sandbox preparation:
  one local inline data URL and quoted CSS grammar were being classified as
  unsafe before the blocked URL could be removed.
- The sanitizer now removes blocked inline data URLs before its unsafe-token
  audit and distinguishes quoted grammar from unquoted markup. Script URLs and
  raw markup remain rejected. Focused regression tests pass.
- A fresh anonymous six-fixture modern pre-upload run passes local baseline,
  payload audit, Sandbox sanitize audit, roundtrip, state, asset, and evidence
  gates.
- The visible Custom Sheet Sandbox upload remains externally blocked before
  file transmission because Chrome local-file access is not enabled. No
  alternate upload path was used, so this batch does not claim new actual-screen
  evidence.
- Focused sanitizer tests, full `ci:verify`, lint, production build, tracked-doc
  privacy guard, and diff checks pass. The final server-hygiene check reports no
  project or browser-debug listener.

## 2026-08-03 - Native Input, Void Element, And CSS Value Preservation

- Added an editable leaf mapping for browser-native input types outside the
  dedicated text/number/check catalog. These controls no longer appear as
  frames that accept children which HTML cannot emit.
- Split other safe HTML void tags from the generic container path. Imported
  void tags now remain editable leaf objects, and a manually changed generic
  container cannot emit a false child-bearing void element.
- Reproduced and fixed declaration-value corruption caused by removing every
  semicolon. Semicolons inside strings and functions are now preserved while
  top-level declaration boundaries remain blocked.
- Expanded the anonymous visual matrix with native controls, uncommon semantic
  elements, a local-only data asset, font/animation rules, a custom at-rule,
  and malformed CSS fallback. Its modern and legacy Preview/Edit captures are
  pixel-exact, expected emit markers survive, and all six fixtures pass the
  Sandbox preparation smoke. This does not prove hosted-asset behavior in
  actual Roll20.

## 2026-08-03 - Modern And Legacy Result-Card Actual Matrix

- Completed separate owner-only modern and legacy actual-screen runs for four
  anonymous deterministic result-card shapes. The legacy run used a dedicated
  room because Custom Sheet Sandbox does not support that contract.
- Each destination passed fresh participant preflight, persisted HTML/CSS and
  translation checks, expected-mode checks, real sheet-button activation,
  Roll20 chat rendering, true-PNG foreground capture, and DPR normalization.
  Existing user rooms were not modified.
- Both modes now report 8/8 authoritative generated screenshots, trusted
  full-root evidence 4/4, zero cutoff risk, matching chat structure 4/4, zero
  capture or CSS-activation suspects, zero renderer blockers, and
  `rendererReady=YES` for this matrix.
- Isolated two app-shell cascade leaks from result cards: universal border-box
  sizing changed authored table cell allocation, and the zero-border reset
  erased a layered conditional border. The product now excludes authored
  result-card content from those resets.
- Added an explicit legacy compatibility option to the result-card browser
  smoke so modern and legacy actual screenshots never share an unlabelled local
  baseline. Both four-card smokes pass independently.
- Current normalized chat differences are 5.00%-9.56% in modern mode and
  5.67%-9.60% in legacy mode. Full authored-root candidates are 4.96%-4.97%
  with a one-pixel height delta. These are ignored local synthetic metrics, not
  broad-sheet parity or support for every third-party sheet.
- This batch is committed and pushed. Its remote CI safety/unit, lint, and
  production-build gates passed, and final server/browser cleanup completed.

## 2026-08-03 - Result-Card CSS And Short-Sheet Geometry

- Replaced flat Rolltemplate CSS matching with a dependency-free structural
  extractor that retains nested conditional at-rules, referenced namespaced
  keyframes, and font policy while excluding ordinary sheet rules.
- Reused the existing selector-list splitter so mixed selector groups keep
  only Rolltemplate branches. The retained branches are constrained to the
  chat pane with zero added specificity, preventing authored card CSS from
  styling application chrome.
- Added four anonymous deterministic result-card fixtures covering block,
  table, conditional-helper, and default paths. Their manifest expectations
  check template class, translated text, selected computed styles, and
  unclipped paint.
- Removed the fixed short-sheet height floor. The iframe host now follows the
  authored root down to a minimal empty-document floor, so Preview and Edit do
  not add a blank tail to short sheets.
- Roll20 helper sections inside complete Rolltemplate definitions no longer
  trigger the build-template warning. Build-template markers outside those
  definitions still do.
- Local result-card chat, modern/legacy Preview/Edit, fresh-sheet, persistent
  iframe, import-dialog, and edit-flow browser checks pass. The persistent
  iframe smoke was also updated to the layer tree's current `treeitem` role.
- In an owner-only modern verification destination, one additional anonymous
  conditional card passed persisted-payload, nested-at-rule, translation,
  helper, and chat structure/text checks. Its browser image was lossy, so
  authoritative pixel parity and the rest of the modern/legacy matrix remain
  open.
- Claim boundary: current anonymous synthetic result-card paths only. This is
  not broad-sheet or all-result-card Roll20 visual parity.

## 2026-08-03 - Modern Actual Render And Chat Evidence

- Applied all current anonymous generated payloads to a new owner-only modern
  test room through visible settings and verified persisted HTML/CSS,
  translation meaning, compatibility mode, authored-root geometry, and current
  rendered screenshots. Existing user rooms were not modified.
- Replaced the result-card capture with a deterministic same-state, true PNG
  CDP capture. High-DPR physical coordinates are corrected back to the exact
  CSS crop and recorded in the ignored sidecar.
- Added generic descendant capture for non-table result cards. Diagnostics now
  compare card, title, row, and inline result styles instead of treating every
  Rolltemplate as a table.
- Excluded non-Roll payloads from chat renderer policy, stopped requiring a new
  CSS candidate when the default renderer is below the high-mismatch threshold,
  and made unavailable table-only glyph evidence secondary for non-table cards.
- Current policy keeps the default chat renderer. The global sheet renderer
  remains on hold because the anonymous full-root fixtures prefer different
  micro-fixes; no production renderer CSS was changed.
- Focused capture, structure, renderer-policy, and font/glyph tests plus the
  full ignored chat diagnostic refresh passed. Tracked-doc privacy, lint,
  production build, and the full local CI verification suite also passed. The
  implementation batch was committed and pushed, and its remote GitHub CI
  safety/unit, lint, and production-build job passed.
- Claim boundary: current anonymous modern suite and existing anonymous legacy
  contracts only. Broad all-sheet parity remains open.

## 2026-08-03 - Scaled Nested Free Placement

- Added rendered-to-local scale geometry to the iframe edit bridge and one
  shared coordinate converter for existing layers, multi-selection movement,
  friendly widgets, and block-gallery drops.
- Free movement inside an axis-aligned scaled frame now converts both the
  starting rectangle and pointer delta before grid snapping. Parentage remains
  unchanged and position stays in owned CSS rather than inline HTML.
- Focused unit tests cover scaled inside placement and single/multi-object
  movement. The full edit-flow browser smoke moves one nested object inside a
  75% frame and confirms the same geometry after commit, Preview, and Edit
  re-entry with zero console or page errors.
- Claim boundary: local anonymous axis-aligned scale coverage only. Rotated,
  skewed, deep mixed transforms and actual Roll20 interaction remain open.

## 2026-08-03 - Virtualized Layer Keyboard Navigation

- Replaced all-row tab stops with one roving tree-item tab stop. Tab and Shift
  plus Tab select adjacent visible layers while preserving the existing arrow
  key movement contract.
- Selected rows now scroll only when outside the viewport instead of jumping
  to the panel center on every change.
- The full edit-flow browser smoke traverses a long virtualized list, confirms
  automatic scrolling and active-row visibility, and proves that navigation
  does not mutate emitted HTML or CSS. Console and page errors remain empty.
- Claim boundary: local anonymous editor navigation only. Dense imported-sheet
  ergonomics and actual Roll20 interaction remain open.

## 2026-08-03 - Resizable Layer Panel

- Replaced the fixed layer-panel width with a persisted preference and an
  accessible pointer/keyboard separator. Double click restores the default.
- The panel grid and persistent Preview/Edit iframe use one responsive track,
  preserving one horizontal origin when the preference or viewport changes.
- Unit coverage checks clamping and responsive-track generation. The full
  edit-flow browser smoke checks pointer resize, keyboard resize, persistence,
  reset, and exact panel/iframe/slot alignment with no console or page errors.
- All ten current modern/legacy anonymous Preview/Edit combinations remain
  pixel-exact. This is local synthetic editor evidence, not actual Roll20
  parity.

## 2026-08-03 - Sequential Import Render Cache Integrity

- Reproduced a real cross-sheet failure in one browser session: replacing a
  sheet could update HTML while a delayed emit replayed CSS from the immediately
  preceding sheet.
- Whole-workspace reset versions are now monotonic, and every Blockly
  registration or full hydration carries a separate generation identity used
  by the emit cache. Empty-state effects also clear cached workspace results.
- The Sandbox preparation smoke compares the CSS generated immediately after
  import with the CSS actually mounted in normal preview. Five sequential
  anonymous imports now all match with zero console or page errors.
- Preview and Edit remain pixel-exact in all ten current modern/legacy fixture
  combinations. CSSOM and canonical-DOM hashes distinguish semantic sanitizer
  changes from formatting-only serialization.
- A fresh dedicated modern Sandbox accepted and persisted an anonymous
  manifest and launched its visible upload tools. The supported file chooser
  was denied before transfer, so modern actual rendering remains unverified and
  no bypass was attempted.
- Claim boundary: this closes the current local stale-render regression. It
  does not prove broad-sheet or actual modern Roll20 parity.

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

## 2026-08-03 - Roll20 Script Output Boundary

- Reused the existing inert ordinary-JS and Worker workspaces instead of adding
  a second JavaScript architecture.
- Final Roll20 payload preparation now removes every non-Worker script from
  `sheet.html`, preserves exact removed tags in a non-executable ZIP text file,
  and keeps Sheet Worker source intact.
- Export warnings and editor labels now explain that ordinary JavaScript is
  stored source, not executable Roll20 behavior. Worker behavior remains under
  the separate automatic-actions workspace.
- Focused payload, README, and ZIP tests; lint; production build; and the import
  browser smoke passed. The browser run preserved authored ordinary JS, kept it
  invisible, retained Worker source, showed the export warning, downloaded and
  inspected the ZIP, and reported zero console/page errors.
- The same browser run exposed an over-height export dialog whose footer could
  leave the viewport. The dialog now has a viewport-bounded scroll surface, and
  the real pointer click reaches the ZIP action at the tested desktop viewport.
- Full `ci:verify`, lint, production build, import-dialog browser smoke, and
  export-dialog browser smoke pass. Both browser runs have zero console/page
  errors and close their temporary servers.
- Claim boundary: local output-contract proof based on the official Roll20
  script model. This batch did not add new actual-room evidence.

## 2026-08-03 - Affine Nested Drag Coordinates

- Replaced scale-only free-placement math with an optional invertible 2D
  local-to-viewport matrix while retaining the existing scale fallback.
- The iframe now keeps authored element transforms during optimistic movement
  and converts the top-level pointer delta into each element's local parent
  axes before painting.
- A message-scoped `WeakMap` shares transformed-ancestor measurements across
  subject, selection, and hit-path geometry without retaining stale frames.
- Unit tests cover rotated point and movement inversion. The synthetic browser
  smoke covers an axis-aligned scaled frame containing a rotate/skew/scale
  frame and rotated child, including optimistic pointer tracking, managed CSS,
  no inline geometry leak, and Preview/Edit equality after commit.
- Claim boundary: common 2D `transform` cases in the local synthetic editor.
  Longer or dynamically changing transform stacks, individual CSS
  `rotate`/`scale` properties, 3D/perspective, dense real imports, and actual
  Roll20 screens remain unverified by this batch.

## 2026-08-03 - Individual Transform Drag Coordinates

- Measured Chromium computed-value serialization and matrix composition against
  the [W3C CSS Transforms Level 2 order](https://www.w3.org/TR/css-transforms-2/#ctm)
  before changing the iframe bridge.
- Reused the existing affine accumulator. It now includes 2D individual
  `rotate` and `scale`; individual `translate` remains a positional component
  and is preserved unchanged.
- Optimistic movement now inverts the selected element's own individual
  rotation, scale, and CSS zoom in addition to its transformed ancestors. The
  authored transform list and all three individual properties remain intact.
- The synthetic browser path combines individual translate/rotate/scale on a
  transformed frame and child, then verifies top-level pointer tracking, local
  managed coordinates, no inline emit leak, and Preview/Edit equality.
- Focused build-document tests, full `ci:verify`, lint, production build,
  privacy guards, and edit-flow browser smoke pass. The browser run reports
  zero console and page errors, and the final server-hygiene check reports no
  project or CDP listeners.
- Claim boundary: local anonymous 2D proof only. Animated/dynamic transform
  changes, 3D/perspective, dense imports, and actual Roll20 screens remain open.

## 2026-08-03 - Narrow Viewport Edit Surface

- Reproduced a mobile shell defect where the default split mode reduced the
  Roll20 render surface to 185px at a 390px viewport and 374px at 768px.
- At 920px and below, split mode now resolves to Direct Edit and is removed
  from the visible mode choices. The persistent iframe receives the full
  370px and 748px editor widths without a second render path.
- Reused the existing layer tree as a 320px maximum overlay with a scrim;
  desktop persisted width and resize behavior remain unchanged. App sidebars
  use their existing mobile drawers.
- The fresh-sheet browser smoke now checks phone and tablet shell overflow,
  full-width rendering, hidden split mode, layer overlay containment, both app
  drawers, screenshots, and zero console/page errors.
- Full `ci:verify` and the focused mobile browser smoke pass. The edit-flow
  harness no longer guesses at a container's exposed four-pixel canvas corner;
  it filters and selects the explicit layer row before testing section styles.
  Two consecutive full edit-flow runs pass after that correction.
- Claim boundary: local 390x844 and 768x900 synthetic UI coverage. Landscape,
  touch dragging, dense imports, and actual Roll20 parity are unchanged.

## 2026-08-03 - Guarded Free-Placement Patch

- Measured the first same-parent free-placement path from optimistic pointer
  paint through source emit, parent scheduling, iframe apply, and ACK.
- Added an allowlisted HTML patch planner. It accepts only `class`/`style`
  changes on explicitly named block IDs and rejects text, structure, tag,
  unrelated attribute, duplicate-ID, no-op, and stale-key cases.
- The persistent iframe validates the previous authored state, preserves
  runtime-only classes and inline style properties, applies the targeted
  attributes, restores Roll20 button classes, and retains the old full-patch
  fallback.
- Anonymous modern and legacy browser runs keep one iframe, runtime input and
  state, and zero console/page errors. Six structural edit fixtures plus
  anonymous 5,200- and 9,000-item large-workspace runs pass. The performance
  report now separates optimistic paint, apply scheduling, target planning,
  message transfer, iframe apply, and final ACK.
- Claim boundary: the targeted iframe apply is complete for this guarded path.
  Larger ignored input still warns on parent scheduling and final ACK, so dense
  imported editing remains partial and no all-sheet or Roll20-parity claim is
  made.

## 2026-08-03 - Dense Edit Snapshot Reuse

- Traced the first-selection delay with opt-in browser timing markers. The
  canvas and virtualized layer tree were not the long task; the inspector was
  rebuilding the full Blockly layer graph repeatedly for one selected object.
- Added one workspace-generation-aware layer snapshot and ID index. Canvas,
  layers, preview, design helpers, and inspector now share it until the store
  declares a mutation. Structural adapter actions and history replay also
  invalidate it directly so parent and sibling metadata cannot remain stale.
- The anonymous 5,200-item check reduced optimistic paint from 217.6ms to
  4.8ms, inspector render from 182.3ms to 7.6ms, and parent apply scheduling
  from 217.3ms to 15.7ms. Its final ACK is now 248.2ms and drift is zero.
- The anonymous 9,000-item check also passes every current performance budget:
  9.1ms optimistic paint, 19.6ms parent scheduling, 384ms final ACK, 2ms iframe
  apply, zero drift, and zero console/page errors.
- Headless cache invalidation and structural layer-operation tests pass. The
  six-fixture edit suite, fresh-sheet smoke, edit-flow smoke, and persistent
  modern/legacy 9,000-item iframe runs pass without replacing the iframe.
- Claim boundary: local anonymous edit performance and modern/legacy render
  regression only. This batch adds no new actual Roll20 screen evidence and
  does not prove broad-sheet parity.

## Current Product State

- Preview and Edit share one persistent Roll20 iframe.
- Modern and legacy output paths are separate.
- User HTML/CSS/translation import, managed CSS authoring, layer operations,
  local autosave, export, worker subset execution, Roll buttons, chat history,
  and result-card editing exist with synthetic tests.
- Public examples remain empty; user imports and user-authored content are the
  supported source of sheets.

## Open Gates

1. Supported modern Custom Sheet Sandbox upload remains blocked at its visible
   file chooser until Chrome local-file access is enabled; current modern actual
   evidence comes from a dedicated owner-only test room and must be broadened.
2. Equivalent actual element-level evidence for the remaining synthetic and
   modern paths, plus deterministic lossless same-state result-card capture
   before renderer changes.
3. Broader anonymous mapping and edit coverage for uncommon structures.
4. Broader structured Sheet Worker blocks and unsupported-syntax diagnostics.
5. Explicit clean-history publication decision; current-tree privacy guards
   already pass.

Do not turn any local pass into a claim of all-sheet support or Roll20 visual
parity.

## 2026-08-03 - Dense Edit Recheck And Valid Repeating Actual Gate

- Re-ran the anonymous 9,000-item direct-edit path instead of adding another
  speculative optimization. It passed every current performance budget with
  13ms optimistic paint, 12.7ms parent scheduling, 5.5ms target planning,
  0.5ms transfer, 2ms iframe apply, and 294ms final ACK.
- Preview/Edit state matched, reimport remained stable, drift was zero, and no
  console, page, or resource error occurred.
- Re-ran actual-status gates for the corrected valid-repeating modern and
  legacy runs. Both remain pre-upload ready with 0/8 generated Roll20 captures;
  fresh visible upload and actual root/chat evidence remain required.
- Chrome control timed out twice before tab inventory. Read-only diagnostics
  found the enabled extension and native host, but no tab or Roll20 room was
  opened or changed. Opening a fresh Chrome window remains a user-visible
  recovery action, not an automatic workaround.

## 2026-08-03 - Constrained Editor Layer Overlay

- A direct 1280px browser audit found four simultaneous columns leaving only
  376px for the 850px sheet. The layer tree now switches from a docked track to
  an on-demand overlay when the center work area is below 760px.
- The shared Preview/Edit surface and empty drop slot now receive the full
  580px center width in that shell. Opening the 320px layer overlay leaves their
  left edge and width unchanged.
- The exposed scrim begins outside the panel. Browser interaction proved that
  it closes from its visible area instead of resolving a click behind the panel.
- The first regression run caught a zero-width empty drop slot after the docked
  panel was removed. The slot is now explicitly fixed to the canvas grid column.
- Layout unit tests, the full edit-flow browser smoke, the empty-sheet desktop
  drag, and 390x844/768x900 drawer checks pass. This is local editor UX proof;
  it adds no actual Roll20 parity evidence.

## 2026-08-03 - Authored Class Contract Repair

- Removed unconditional class/ID prefixing from canonical import and block
  emission. Modern Preview/Edit/export now preserve authored tokens, including
  mixed unprefixed and existing `sheet-*` names.
- Moved the compatibility transform to the legacy destination boundary so HTML
  and CSS are prefixed together exactly once before legacy CSS sanitizing.
  ZIP and individual upload files now share that same mode-aware preparation.
- Added import-to-block-to-emit, shared renderer, upload-file, and ZIP
  regressions for modern preservation and legacy alignment. Focused mapping,
  sanitize, mode, export, lint, and production-build checks pass.
- Refreshed the anonymous browser suite: all fourteen modern/legacy
  Preview/Edit pairs are pixel-exact with zero console/page errors. Export UI
  smoke also passes after its empty-state assertions were aligned with the
  current compact canvas UI.
- Claim boundary: this is local source/render/export correctness. Chrome actual
  upload remains unavailable in this run, so the valid-repeating modern and
  legacy evidence stays 0/8 and `VERIFY`.
- Final full `ci:verify`, lint, production build, tracked-document privacy, and
  server-hygiene gates pass. No project or CDP listener remains running.

## 2026-08-03 - Exact Export Boundary And Valid Legacy Actual Matrix

- Invalidated the first corrected-fixture upload attempt after proving that its
  baseline generator used raw canonical emit text instead of the exact
  manual-upload/ZIP preparation boundary. No parity claim uses that run.
- Routed the performance hook and local actual-baseline generator through the
  same mode-aware upload preparation used by export, including legacy HTML/CSS
  alignment, script filtering, translation normalization, asset replacement,
  warnings, and extra files. The sanitize audit now reads each manifest mode and
  rejects unprefixed authored classes in legacy payloads.
- Regenerated the anonymous seven-fixture legacy suite. Pre-upload checks pass
  with zero unprefixed legacy classes, and exact persisted HTML/CSS plus
  semantically equal translation were verified before each actual capture.
- The dedicated one-participant legacy destination produced seven authored-root
  captures plus one result-card capture. All 8/8 are authoritative and diffed;
  authored-root mismatch is 2.55%-5.04%.
- A transient missing-style capture was reproduced and rejected as an iframe
  readiness race. Waiting for the authored selector in the processed Roll20
  style element made the exact unchanged payload render at its expected
  geometry, so no speculative legacy CSS rule was added.
- Actual repeating runtime proof covers `sheet:opened` row initialization,
  field-change calculation, Add/Delete, and drag reorder with player source.
  Actual Roll execution produced a deterministic result matching the local
  baseline; result-card structure matches and maximum aligned mismatch is 8.81%,
  below the high-mismatch threshold.
- Claim boundary: this proves the current anonymous legacy suite only. The
  modern Custom Sheet Sandbox chooser boundary and broad full-root candidate
  matrix remain open, so the renderer-action gate correctly holds a production
  renderer patch.

## 2026-08-04 - Horizontal Flow Drop And Modern Sandbox Recheck

- Rebuilt the current anonymous seven-fixture modern baseline through the exact
  export boundary. Local baseline, payload audit, Sandbox sanitizing,
  roundtrip, state, asset, and evidence guards all pass.
- Reached the official visible file chooser in a dedicated owner-only Custom
  Sheet Sandbox. The supported chooser returned `Not allowed` before transfer
  because local-file access is unavailable. No file was sent and no hidden
  input, endpoint, or existing-room workaround was used.
- Fixed direct-edit drop planning so it reads the rendered parent flow axis and
  direction. Horizontal flex/grid/table/inline parents now use left/right
  before/after zones and a vertical insertion marker; reverse and RTL flows
  invert those zones without changing canonical source order semantics.
- Focused bridge, target-resolution, and indicator tests pass. The full
  edit-flow browser smoke also proves left/right drag geometry, same-parent
  emitted order, layer reordering, Rolltemplate edit/chat reuse, and zero
  console errors.
- Full `ci:verify`, lint, production build, tracked-document privacy, Roll20
  evidence, UI-copy, and server-hygiene gates pass.
- Claim boundary: the editor result is local synthetic interaction proof. The
  modern Sandbox upload remains externally unverified until the supported
  chooser can transmit the generated files.

## 2026-08-04 - Ordered Multi-Selection Flow Drop

- Replaced the single-subject Flow commit with one ordered top-level selection
  contract shared by drop validation, Blockly mutation, optimistic iframe DOM,
  and live-patch acceptance. Every selected layer must be legal for the target,
  and selected layers or their descendants cannot become destinations.
- The iframe now snapshots and restores all selected subjects in reverse order
  for rollback, inserts them in rendered order, and validates contiguity before
  taking the fast structural patch path.
- Focused target-resolution and bridge bundle tests pass. The full synthetic
  edit-flow browser run moves two selected layers into another Flow container,
  preserves A/B/C model and emitted order, keeps selection, clears temporary
  styles, performs one-step undo and redo, and matches Preview/Edit with zero
  console or page errors.
- The browser test reuses and restores existing anonymous fixtures so the
  virtualized layer suite keeps a stable item count. Table guard checks now use
  exact-ID search before dispatching synthetic layer drops.
- Claim boundary: local anonymous editor interaction only. No real sheet input
  or actual Roll20 destination was used, and modern Sandbox transfer remains
  externally unverified.

## 2026-08-04 - Direct Canvas Touch Movement

- Limited touch gesture ownership to editable sheet layers while Direct Edit
  is active; Preview keeps normal Roll20 interaction and scrolling behavior.
- Ignored non-primary pointer starts so an accidental second contact cannot
  cancel or replace the layer already following the user's first finger.
- Extended the full edit-flow browser smoke with real touch input. It resolves
  the actual topmost hit in an overlapping canvas, measures the scaled iframe
  coordinate conversion, checks optimistic movement before release, introduces
  a second contact, and verifies one primary edit action.
- The committed layer uses managed CSS with no temporary inline transform,
  sheet scroll remains unchanged, Preview/Edit coordinates match exactly, and
  console/page error counts remain zero.
- Claim boundary: direct movement on the shared synthetic sheet surface only.
  Landscape-phone ergonomics, real imported sheets, and actual Roll20
  destinations remain separate gates.

## 2026-08-04 - Touch Gallery And Layer Insertion

- Added one touch/pen drag session for gallery cards and layer rows. It uses
  native Pointer Events, emits a temporary visual clone outside source HTML,
  and forwards into the existing mouse target and commit contracts.
- The persistent sheet iframe translates parent viewport coordinates to its
  scaled CSS coordinates before resolving the same Flow/free/table target. The
  empty sheet uses the existing centered-canvas coordinate resolver, and the
  result-card editor uses its existing container resolver.
- The layer role chip doubles as the compact touch reorder handle. This keeps
  narrow row selection geometry stable while preserving before/inside/after
  markers, auto-scroll, delayed container expansion, selection, and emitted
  DOM order.
- Full synthetic browser touch input passes gallery-to-empty, gallery-to-Flow,
  layer before/after reorder, and result-card insertion. Every path proves held
  feedback, target highlighting, cleanup, emitted HTML, rendered output, and
  zero console or page errors.
- Claim boundary: anonymous local editor proof only. Landscape-phone usability,
  dense real imports, and actual modern/legacy Roll20 destinations remain open.

## 2026-08-04 - Landscape And Dense Imported Editing

- Added an 844x390 touch viewport to the fresh-sheet shell smoke. The initial
  capture exposed only 148 vertical pixels for the sheet despite having no
  horizontal overflow.
- Short-landscape CSS now reduces app-only spacing, status height, and toolbar
  padding while preserving primary 44px touch targets. The sheet receives 206
  pixels; the layer overlay and both side drawers remain inside the viewport.
- Replaced a stale fresh-sheet assertion that expected a legacy-prefixed class
  in modern mode. It now locates the generated input by its editor block marker,
  preserving the authored-class contract.
- Updated synthetic pointer input to declare one primary mouse pointer, matching
  the current secondary-contact guard. A 1,205-block shallow import and a
  one-root depth-6 mixed import with 1,295 blocks both pass direct movement,
  Flow/free insertion, Preview/Edit synchronization, and stable re-import.
- The mixed import additionally passes non-leaf layer reorder and targeted HTML
  patching. Mapping is 100% with zero console, page, or resource errors.
- Claim boundary: anonymous local browser proof only. Dense user-owned sheets,
  broader landscape devices, and actual Roll20 destinations remain separate.

## 2026-08-04 - Import-First Alpha Boundary And Original Mark

- Replaced the placeholder letter mark and stale favicon with one original
  sheet-and-block mark shared by the header and generated browser icon.
- Locked the current release milestone to import, modern/legacy Preview,
  lossless mapping, diagnostics, and export. Existing Figma-like editing code
  and regressions remain preserved but new direct-manipulation work is deferred
  to the experimental Beta path.
- Removed the manual 62/100 checkpoint. Numeric Alpha progress remains unset
  until the local corpus harness emits a complete result row for every
  discovered case.
- Production build, fresh-sheet desktop/mobile browser smoke, tracked-document
  privacy, lint, diff checks, and server hygiene pass. Generated screenshots
  remain ignored local evidence.

## 2026-08-04 - Corpus Graph Measurement Repair

- Replaced L2 graph comparison based on Blockly creation-array indexes with a
  canonical forest built from named input slots and ordered `next` chains.
  Random IDs and independent-root creation order no longer create false
  topology differences; real sibling order and field changes remain strict.
- Added regression coverage for reordered hydration, independent roots,
  sibling-order mutation, and a long iterative chain. The full anonymous
  synthetic roundtrip browser set passes with every workspace graph stable.
- Bumped the local Harness cache contract to v4. Older partial results remain
  diagnostic only and cannot contribute to the next complete baseline.
- Focused protected rechecks continue to fail on genuine field-value or
  block-count changes. Those rows stay open for generic mapping fixes; no
  source identity, content, or per-sheet measurement was recorded here.
- Claim boundary: measurement integrity and focused local browser proof only.
  The complete v4 corpus baseline and its Alpha score remain open.

## 2026-08-04 - CSS Descriptor And Worker Boundary Preservation

- Extended the structured `@font-face` block with one editable fallback field
  for additional and repeated descriptors. The parser respects comments,
  strings, functions, and nested semicolons while separating declarations.
- Import, generator, and live browser reimport checks preserve additional font
  descriptors, source CSS meaning, CSS graph shape, and clean runtime status.
- Preserved multiple authored Sheet Worker script tags as separate raw roots
  and separate final script tags. Single-script source still takes the
  structured parser path when its output is byte-stable.
- Added an import/emit/reimport regression for script count and order. A
  first-class multi-script structure container remains future Worker editing
  work; exact raw roots prevent data loss now.
- Claim boundary: generic local lossless mapping proof. Broad corpus impact and
  actual Roll20 execution remain open.

## 2026-08-04 - Imported Control Default Preservation

- Completed the first full Harness v4 baseline. It is retained as a superseded
  diagnostic baseline because a new generic control-default fix changes the
  mapping contract; no source identity or per-source measurement was recorded.
- Distinguished imported empty attribute snapshots from new gallery blocks.
  Imported text, number, hidden, and textarea controls no longer gain omitted
  `type`, `value`, or `rows` attributes during their first emit.
- Replaced position-based preserved-attribute diagnostics with name-based
  comparison. Reports keep only generic added, removed, and changed attribute
  names; attribute values remain excluded.
- Unit coverage plus synthetic modern and legacy browser roundtrips pass block
  graph, Preview/Edit, runtime, and resource gates. Harness v5 invalidates the
  prior cache; complete v5 corpus measurement remains open.
- Claim boundary: generic synthetic proof only. Broad protected-corpus impact
  is not complete until the v5 full run finishes.

## 2026-08-04 - Harness V5 Baseline And Radio Attribute Ownership

- Completed the full Harness v5 browser baseline at `80029b2`. Every expected
  result row exists and the measured Alpha score is 28.9%. The nonzero command
  exit reflects unmet product gates, not an incomplete run. Broad L2 and all L3
  work remain open.
- The new attribute diagnostics exposed a generic compound-block ownership
  bug: collapsing a radio input and its label allowed the outer wrapper to
  overwrite the input's preserved attribute snapshot.
- Plain radio wrappers now retain the nested control snapshot. A wrapper with
  authored attributes stays as an explicit exact raw block until the block
  model has separate editable wrapper and control targets. This prevents
  silent loss while keeping the common plain wrapper structured.
- Unit tests and synthetic modern/legacy browser roundtrips pass. The project
  listener count returns to zero after each run.
- Full CI exposed a noisy legacy CSS performance gate. Keyframe stripping now
  appends retained source ranges and joins once instead of extending the output
  one character at a time. The isolated correctness and linear-budget suite
  passed six consecutive runs, then the complete `ci:verify` rerun passed.
- `harness:corpus:changed` now has a real code-impact boundary. It reads only a
  complete ignored run state, reuses unchanged anonymous rows under a new Git
  cache key, reruns changed inputs or affected runtime families, and falls back
  to all rows when provenance is missing or unclear. Runtime-dirty worktrees are
  rejected so one SHA cannot hold results from two code states.
- The first clean-SHA synthetic `full` integration executed both modern and
  legacy rows with a complete 60-point local result. A following docs-only SHA
  verified cross-SHA `changed` re-keying: zero rows executed, zero current-key
  cache hits, and both prior rows safely reused with all local gates passing.
- Baseline clustering found that most HTML graph failures still report field
  deltas, led by preserved attributes, but old safe envelopes omitted the block
  type at the first mismatch. Browser diagnostics now retain only generic first
  block types and field names so the next targeted runs can separate control
  ownership bugs without storing source values or identities.
- Repeated full CI showed that the legacy linear-time benchmark's old 2x input
  ratio was too close to its 4x quadratic boundary at millisecond scale. The
  test now separates 3x linear from 9x quadratic growth, keeps the absolute
  1500 ms limit, passed ten consecutive isolated runs, and passed the complete
  CI rerun.
- A current-code rerun of an old radio attribute failure now passes its HTML
  graph, confirming the generic wrapper ownership fix on protected input. Its
  next failure was a CSS selector list with an empty item: first import created
  a complex `*` fallback and reimport classified that output as an element.
  Malformed lists now remain one exact complex selector block instead of being
  silently completed with a universal selector.
- The next browser rerun showed the selector type was stable but the raw block
  generator replaced an authored internal line break with a space. Complex
  selector output now blocks only rule-boundary braces and preserves internal
  line breaks. The generator regression suite passes, a clean production build
  passes, and the protected target now passes all five workspace graphs plus
  local Preview, runtime, and resource checks. No source value, path, identity,
  or screenshot was retained in tracked output.
- The old attribute-only cluster also contained isolated `r20_col` failures
  where generated structural classes were semantically unchanged but their
  authored order and spacing changed. Preserved attributes now restore the
  original class spelling only when the generated and preserved token
  multisets match; a real token edit still wins. The isolated protected legacy
  target now passes every workspace graph, Preview/Edit visual and state gates,
  runtime, and resources. Project listeners returned to zero after the run.
- The next isolated attribute-only target exposed two `r20_roll_button`
  snapshots where a bare authored button name gained the five-character
  Roll20 prefix during emit. Roll and action generators now reuse an authored
  bare or prefixed name only while it still maps to the visible `NAME` field;
  an actual edit emits the standard prefix. The protected legacy target moved
  from the 25-point local Preview-only result to the complete 60-point local
  gate, and project listeners again returned to zero.
- Claim boundary: the 28.9% score belongs to `80029b2`. Current radio changes
  require a new complete baseline before any higher score is claimed.

## 2026-08-05 - Focused Corpus Discovery And Input Type Fidelity

- Added a sensitive ignored discovery index keyed by configured local roots.
  It is written after each root and lets `--only` resolve one anonymous case
  without traversing every protected directory again. Public reports and run
  state remain anonymous and path-free.
- Reworked read-only discovery from serial directory and file operations to
  bounded batches. Repeated manifest, source, and translation reads share one
  process-local cache, while generic root/phase checkpoints expose progress
  without source identity.
- The protected discovery that previously exceeded its execution limit now
  completes, and its next focused execution uses the private index. Synthetic
  discovery and Harness self-tests, the full Harness test group, and lint pass.
- The resulting generic diagnostic identified an authored input `type` value
  normalized by a structured text-input block. Equivalent authored spelling is
  now restored; an actual type edit still wins. Unit tests cover authored case,
  explicit empty default, and a real type change.
- One anonymous modern protected representative passes all current local
  mapping, Preview/Edit visual/state/geometry, runtime, and resource gates on a
  fresh production build. The complete current-SHA corpus baseline, legacy
  breadth, and actual Roll20 evidence remain open.
- Claim boundary: do not update the Alpha score from this representative. The
  last complete score still belongs to the earlier full baseline.

## 2026-08-05 - Anonymous Failure Clusters And Structural Class Contracts

- Added a local-only failure cluster report that groups old L2 failures by
  compatibility, failed workspace, generic block type, changed field names,
  and preserved attribute names. Diagnostics and failed checks remain facets,
  so they do not split one structural root cause into unrelated clusters.
- Runtime and resource failures now use a fixed privacy-safe taxonomy in cache
  envelopes and cluster facets. Source messages, paths, hosts, and URLs are not
  retained. Resource-origin console noise stays visible as an asset problem but
  no longer masquerades as an application runtime crash.
- Structural shortcuts now require complete, non-duplicated defining class
  tokens. Incomplete and duplicate structural signatures use the generic exact
  element path, preserving authored classes. Import regressions pass.
- One anonymous legacy representative now passes L2 plus local Preview/Edit
  visual, form-state, geometry, and application-runtime gates. Its external
  font remains an asset warning, so hosted asset fidelity and actual Roll20
  evidence are still open.
- The Harness group, privacy-safe diagnostic self-test, import structure suite,
  lint, and server hygiene pass. Project and CDP listeners returned to zero.
- Claim boundary: this is focused local evidence. A complete current-SHA corpus
  run is still required before updating the 28.9% baseline score.

## 2026-08-05 - CSS Value Semantics And Local Resource Budget

- Canonical CSS declaration graphs now collapse whitespace only outside quoted
  strings. Quoted and escaped line breaks remain exact, preventing the semantic
  rule from hiding content or CSS escape changes.
- Synthetic graph tests, the Harness group, lint, and production build pass.
  One anonymous modern representative now passes all five workspace graphs,
  Preview/Edit visual/state/geometry, application runtime, and resources.
- Long local build pressure was visible on the interactive workstation. Heavy
  local jobs are now sequential, below-normal priority, and limited to one
  broad run per coherent batch. Corpus concurrency remains capped at two.
  After the focused run, project-owned processes and project/CDP listeners were
  both zero. Final broad reruns should use pushed GitHub CI when focused tests,
  lint, and one production build already pass locally.
- Added a local-only low-resource production build command. It uses Next's
  installed `experimental.cpus` contract with two workers while the default CI
  build remains unchanged.
- Claim boundary: focused local proof only. L3, current-SHA full corpus, and
  actual Roll20 evidence remain open.

## 2026-08-05 - Exact Comment Payload And Remote-CI Resource Policy

- HTML comment generation no longer adds boundary spaces that were absent from
  the imported payload. The parent indentation pass now protects complete HTML
  comments, so nested multiline whitespace remains exact through re-import.
- Focused generator, import-structure, and emit-contract tests pass. The
  protected representative and broad corpus result remain `VERIFY`; no broad
  local browser rerun was used as proof.
- Interactive-workstation policy is stricter: no local full CI, production
  build, broad Corpus run, or broad browser suite while the user is active.
  Focused tests run locally; GitHub Actions owns lint, build, and broad public
  gates. `build:low-resource` is reserved for an explicit idle window.
- Project servers, Harness processes, CDP listeners, and Figma MCP processes
  were all absent before this batch.

## 2026-08-05 - Headless Mapping Probe And Page JS Fidelity

- Added an anonymous single-case Node probe for import -> emit -> reimport
  canonical graph comparison. It reads through the ignored private discovery
  index, starts no browser or server, and persists no source path, value, or
  content in its ignored result.
- The synthetic probe exposed two generic Page JS mutations: inserted body
  newlines and an editor-only block attribute on the emitted `<script>`.
  Page JS now preserves authored body whitespace and receives no canvas marker.
- Probe self-test and the focused emit-contract suite pass. The previously
  failing anonymous comment case now passes HTML, CSS, translation, Page JS,
  and Worker graph comparison in Node.
- Claim boundary: this probe is not L2, Preview, runtime, export, or actual
  Roll20 proof. Full current-SHA corpus and browser-backed evidence remain open.

## 2026-08-05 - Owned Checked-State Snapshot Fidelity

- Headless probing isolated a preserved-attribute mismatch on structured radio
  controls. The shared attribute injector treated imported `checked` metadata
  as an unknown attribute and could re-add it after the block field was turned
  off.
- Radio and checkbox controls now own `checked`. An unchanged checked control
  restores the authored boolean form; an explicit unchecked field omits it and
  stale snapshot data cannot override that edit.
- Focused preserved-attribute tests pass, including both radio and checkbox
  edit precedence. The anonymous five-workspace graph probe that exposed the
  issue now passes.
- Claim boundary: broad default-state corpus impact, browser form state, and
  actual Roll20 remain `VERIFY`.

## 2026-08-05 - Generic Owned Boolean Attribute Contract

- Generalized preserved-attribute ownership beyond `checked`. Structured
  blocks now identify boolean fields they actually own before emission, covering
  `disabled`, `readonly`, `selected`, `required`, `multiple`, and `autofocus`
  without source-specific branches.
- An unchanged owned field restores its authored bare or valued form. Turning
  the field off omits the attribute instead of allowing stale snapshot metadata
  to override the edit. Composite checkbox emission uses the same contract.
- Added focused regressions for authored formatting and edit precedence. The
  local test process exceeded the 30-second active-workstation limit and was
  terminated, with no project child left running. GitHub CI run `30966513521`
  then passed safety/unit verification, lint, and build. The single anonymous
  graph reproduction and browser/runtime behavior remain `VERIFY`.

## 2026-08-05 - Shared CSS Pseudo-Class Vocabulary

- Found a generic parser/editor contract split: the parser structured several
  valid pseudo-classes that Blockly's dropdown could not represent, allowing a
  hydrated value to fall back to a different selector.
- Added one shared pseudo-class vocabulary consumed by both parser and block
  generator. Synthetic import coverage spans root, state, child/type, and
  functional selectors. The headless Blockly self-test now hydrates `:root`
  and `:has()` rather than checking parser output alone.
- GitHub CI run `30967170144` passed safety/unit verification, lint, and build.
  One targeted anonymous modern probe now passes its CSS workspace without the
  unavailable-dropdown warning. A separate HTML root mismatch remains open.
- Root mismatch diagnostics now report only generic block-type counts and node
  counts. No source values, selectors, paths, or identities enter the report.
