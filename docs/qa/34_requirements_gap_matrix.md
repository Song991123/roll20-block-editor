# 34. Requirements Gap Matrix

# Composite media query mapping - 2026-07-31

- `DONE LOCAL`: balanced composite media preludes such as
  `screen and (max-width: 640px)` and media types such as `print` now map to
  editable `r20_media_query` blocks, while shorthand conditions remain
  generator-compatible.
- `DONE LOCAL`: malformed or semicolon-terminated media preludes remain raw
  instead of producing an invalid empty typed block.
- `VERIFIED LOCAL`: importer structure `44/44`, high-priority mapping,
  layer-role/Blockly operation tests, lint, `ci:verify`, production build,
  imported edit-sync, persistent preview surface, and server hygiene passed.
- `OPEN EXTERNAL`: this is a targeted CSS mapping improvement, not proof of
  complete CSS grammar support or actual Roll20 visual/chat parity. Current
  generated Roll20 evidence remains `0/4` until the supported chooser can run.

# Local full-gate recheck - 2026-07-31

- `DONE LOCAL`: `ci:verify` passed the full import/export, layer, iframe,
  worker, legacy/modern, payload-safety, evidence, and UI-copy checks.
- `DONE LOCAL`: edit-flow and persistent preview surface passed with one
  shared iframe and `loads=0` in both compatibility modes.
- `OPEN EXTERNAL`: current generated Roll20 evidence remains `0/4`; no local
  green check is promoted to actual visual parity or chat parity.

# Visible Sandbox gate and chooser retry - 2026-07-31

- `DONE OBSERVATION`: the modern Sandbox showed a visible exactly-one
  participant state and the `Sheet Sandbox Tools` surface at the retry point.
- `BLOCKED EXTERNAL`: the supported chooser returned `Not allowed` before
  transmission, so no current payload was applied and no Roll20 write is
  counted.
- `CURRENT STATUS`: actual generated evidence remains `0/4`; chat parity and
  renderer readiness remain missing.
- `OPEN P0`: enable Chrome extension file-URL access, then retry fixture-A
  and capture the root/chat evidence before changing renderer CSS.

# Sandbox upload retry - 2026-07-31

- `BLOCKED EXTERNAL`: the supported chooser still returns `Not allowed` before
  any file transmission; actual generated root/chat evidence remains `0/4`.
- `PRESERVED`: no Roll20 state changed. The browser-controlled extension
  settings page was unavailable through the supported browser surface.
- `OPEN P0`: enable `Allow access to file URLs` in the ChatGPT Chrome
  Extension details, then retry the anonymous modern upload.

# Sandbox context and chat baseline - 2026-07-31

- `DONE OBSERVATION`: the dedicated modern Sandbox showed a visible
  exactly-one participant state and its Sheet Sandbox Tools dialog.
- `MEASURED`: generic Roll20 chat context is approximately `340px` outer /
  `328px` content, `13px / 18.5714px`, `#404040`, with the measured message
  padding and rolltemplate table/caption baseline recorded in the active TODO.
- `DONE LOCAL`: the local ChatPane default typography now uses that baseline.
- `BLOCKED EXTERNAL`: the supported chooser rejected file assignment with
  `Not allowed`; no payload was transmitted and no Roll20 state was changed.
- `OPEN P0`: enable Chrome file-URL access, then capture modern Sandbox root
  and chat evidence before starting the separate legacy-room pass.

# Dedicated test-room creation - 2026-07-31

- `DONE OBSERVATION`: a new dedicated Roll20 test room was created for future
  generated-sheet verification; no existing room was used for writes.
- `BLOCKED EXTERNAL`: the room exposes `1 구성원` only in a participant panel
  positioned above the viewport, so visible exactly-one proof is still
  missing.
- `PRESERVED`: no payload, save, chat, setting, or sheet content was sent or
  changed.
- `OPEN P0`: obtain a visible exactly-one participant state before modern or
  legacy upload/capture.

# Local shared-surface and performance recheck - 2026-07-31

- `DONE LOCAL`: server hygiene found no project listener or CDP listener;
  modern/legacy persistent preview surface passed with zero iframe reloads,
  edit-flow passed, and strict imported edit sync passed for all three
  anonymous synthetic families.
- `MEASURED LOCAL`: the 5,200-item synthetic workspace reached `5,205` blocks,
  `100%` match, `284.7ms` total import, zero warnings, and zero console/page
  errors. One persistent iframe remained the edit owner and nested reparenting
  emitted the expected nested structure.
- `CLAIM BOUNDARY`: local synthetic performance and synchronization do not
  promote actual modern/legacy Roll20 visual parity.

# Roll20 participant preflight retry - 2026-07-31

- `VERIFIED EXTERNAL READ-ONLY`: both retained verification tabs were checked
  without transmitting a payload or changing any Roll20 state.
- `BLOCKED EXTERNAL`: one participant indicator remained under a hidden,
  zero-sized parent; the other was above the viewport. This is not reliable
  visible exactly-one evidence, so no upload or parity result is counted.
- `CURRENT STATUS`: latest actual-status remains `0/4` generated screenshots,
  missing chat parity, and `rendererReady=NO`.
- `OPEN P0`: obtain a fresh visible exactly-one participant state before any
  modern Sandbox or dedicated legacy-room generated-sheet write.

# Upload handoff CLI recovery - 2026-07-31

- `DONE LOCAL`: separated upload-snippet option values no longer become a
  false fixture ID; modern/legacy runtime mode selection remains explicit.
- `VERIFIED LOCAL`: upload snippet self-test and current missing-evidence
  snippet generation pass.
- `OPEN EXTERNAL`: no Roll20 upload or actual screenshot evidence was created.

# Pre-upload gate recovery - 2026-07-31

- `DONE LOCAL`: the pre-upload orchestrator no longer depends on a removed
  public fixture directory or a stale dated run. It generates only anonymous
  synthetic fixtures when no explicit fixture directory is supplied.
- `VERIFIED LOCAL`: the default command passed all seven local pre-upload
  checks and produced a timestamped ignored report.
- `OPEN EXTERNAL`: no actual Roll20 root or chat screenshot was produced by
  this local gate.

# Page-JS preservation and cleanup retry - 2026-07-31

- `DONE LOCAL`: stale/missing page-JS HTML anchors no longer silently drop
  authored script source during emit; the focused contract and full CI gate
  pass.
- `BLOCKED CLEANUP`: the host rejected the user-authorized recursive deletion
  before execution for the active worktree's generated `.next`, `out`, and
  `.tmp` directories. They remain local-only and uncommitted.

# Actual-status and renderer-action gate refresh - 2026-07-31

- `DONE GATE`: preupload is `PASS`, but actual generated Roll20 root/chat
  evidence is `0/4`, chat parity is missing, and renderer readiness is `NO`.
- `HOLD`: the renderer-action gate blocks production ChatPane/crop changes
  until both anonymous fixtures have trustworthy root and chat evidence.
- `OPEN P0`: supported modern Sandbox upload plus separate legacy-room capture.

# Public boundary and latest local visual regression - 2026-07-31

- `DONE LOCAL`: the public example registry is empty and tracked-file/privacy
  guards find no real or derived sheet sample.
- `DONE LOCAL`: synthetic preview/edit parity is `4/4` exact in both modern
  and legacy modes; strict imported edit-sync is `3/3` with no resource
  failures.
- `OPEN DEPLOY`: Pages responds `200`, but its deployed SHA is the older
  `main` revision rather than the current working branch.

# Local fresh-sheet and worker-state regression recheck - 2026-07-31

- `DONE LOCAL`: a blank workspace has no HTML/CSS/i18n/JS/worker blocks, no
  layer IDs, empty HTML output, and no ghost `sheet-section`.
- `DONE LOCAL`: the worker-state path imports at `100%` match, emits one
  worker block, and reports zero console/page errors.
- `OPEN EXTERNAL`: this does not close current-payload Sandbox upload or
  legacy-room visual parity.

# Roll20 Participant Visibility Retry - 2026-07-31

- `DONE OBSERVATION`: both dedicated tabs showed the Sandbox tools and current
  sheet/chat surface.
- `BLOCKED EXTERNAL`: neither tab provided a fresh visible exactly-one
  participant indicator; one was hidden/zero-sized and one was above the
  viewport. No upload or parity evidence is counted.
- `OPEN P0`: resume only when the supported browser exposes a visible count of
  exactly one, then upload and compare the anonymous modern/legacy payloads.

# Roll20 Legacy Preflight Refresh - 2026-07-31

- `DONE OBSERVATION`: the dedicated Sandbox tools surface loaded after a
  supported refresh.
- `BLOCKED EXTERNAL`: the participant count was not visibly readable; the only
  matching member text was inside a hidden, zero-sized parent. The room is not
  eligible for upload or parity evidence.
- `OPEN P0`: obtain a fresh visible exactly-one participant state, then run the
  supported anonymous legacy payload upload and capture actual render/chat
  evidence.

# Autosave Render Contract Persistence - 2026-07-31

- `DONE LOCAL`: autosave version 3 persists the per-sheet modern/legacy
  compatibility selection and independent Sandbox sanitize flag.
- `VERIFIED LOCAL`: browser save/reload/restore smoke proves both values return
  to the toolbar state; lint, build, render-mode, and upload-payload checks
  pass.
- `OPEN`: actual Roll20 Sandbox render/chat parity and dedicated legacy-room
  parity remain unverified.

## Roll20 Pre-upload Payload Refresh - 2026-07-31

- `DONE LOCAL`: a fresh anonymous modern payload passed all seven pre-upload
  gates: baseline generation, payload audit, sandbox sanitize audit,
  cleaned-payload roundtrip, state selectors, assets, and evidence guard.
- `BLOCKED EXTERNAL`: supported Chrome control timed out while claiming the
  dedicated Sandbox tab. No file was transmitted and no ordinary room was
  changed.
- `OPEN P0`: complete the same-payload Sandbox upload and capture actual
  Roll20 render/chat evidence before claiming L4 parity.
- `STATUS MEASURED`: the current run is
  `PREUPLOAD_READY_MISSING_GENERATED_ACTUAL`; generated screenshots are `0/4`,
  generated diffs are `0/4`, chat parity is `MISSING`, and renderer-ready is
  `NO`.

## Modern Sandbox Supported Upload Reconnect - 2026-07-31

- `DONE OBSERVATION`: the dedicated Sandbox surface and exactly-one
  participant state were readable again.
- `BLOCKED EXTERNAL`: the supported chooser connection timed out before any
  file transmission. No upload or save is counted.
- `OPEN P0`: complete the same-payload modern Sandbox upload, then capture
  payload identity, full-root render, crop-normalized screenshot diff, and
  current roll/chat evidence.

## Generic Script MIME Mapping - 2026-07-31

- `DONE LOCAL`: executable Page JS, Roll20 worker JS, and inert data/template
  scripts now use separate generic import destinations. Data scripts stay in
  HTML raw fallback so source order and MIME are not silently changed.
- `VERIFIED LOCAL`: import, worker, emit, and build-doc regression tests pass.
- `OPEN`: arbitrary page-script behavior remains preserved/inert locally; it is
  not executed in preview and has no claim of Roll20 runtime parity.

## Anonymous Corpus Inventory - 2026-07-31

| Anonymous corpus | Sheets | Candidate files | Bytes | Scope |
| --- | ---: | ---: | ---: | --- |
| `corpus-A` | 1,427 | 18,543 | 717,082,278 | Read-only static inventory |
| `corpus-B` | 6 | 126 | 14,999,965 | Read-only static inventory |
| `corpus-C` | 1 | 7 | 2,320,059 | Read-only static inventory |
| **Total** | **1,434** | **18,676** | **734,402,302** | No source copied or committed |

The corrected local inventory found the following capability prevalence across
the 1,434 anonymous sheet groups: worker scripts `66.3%`, rolltemplate
markers `67.6%`, default-view/state logic `73.7%`, repeating-section patterns
`80.5%`, and legacy CSS risk candidates `54.8%`. These are scope indicators,
not import or visual-parity pass rates. The report is ignored local evidence;
source paths, sheet identities, screenshots, and derived fixtures remain out of
the public tree.

The first generic mapping correction from this inventory is now local and
tested: packing a `repeating_*` fieldset into the composite wrapper preserves
additional authored fieldset classes instead of replacing them with an empty
class field. Focused composite, import-structure, high-priority mapping, and
lint checks pass. Broad roundtrip and actual Roll20 verification remain open.

## Dedicated Roll20 Root, Chat, and Sandbox Observation - 2026-07-31

| Area | Current evidence | Status | Boundary |
| --- | --- | --- | --- |
| Participant safety | Both dedicated verification tabs showed `1 구성원` through the supported browser surface | DONE OBSERVATION | No ordinary room was modified |
| Legacy root structure | `.sheet-layout-proof` root was `760x320`; computed colors, border, and `border-box` matched the anonymous generated payload | DONE OBSERVATION | DOM/runtime shell evidence, not pixel parity |
| Legacy viewport/crop | iframe dialog was about `893x283` with `scrollHeight=401` | MEASURED | Full-root capture must normalize Roll20 crop before diff |
| Legacy chat surface | Six existing `.sheet-rolltemplate-default` cards were observed at about `267x58.575` | DONE OBSERVATION | Historical messages; no current-payload roll event |
| Modern Sandbox surface | `Sheet Sandbox Tools` plus HTML/CSS/Translation file inputs were present | DONE OBSERVATION | No upload or save was performed |
| Actual exported-sheet parity | Generated-payload identity, modern render, normalized screenshot diff, and current roll smoke are still missing | OPEN | No broad Roll20 parity claim |

The new evidence is stored only in ignored local report paths under
`reports/roll20-actual-compare/anonymous-generic-layout-legacy/` and
`reports/roll20-actual-compare/anonymous-modern-sandbox/`. It contains no
source sheet, room identifier, or public fixture.

## Latest Local Render Regression Gate - 2026-07-31

| Area | Current evidence | Status | Boundary |
| --- | --- | --- | --- |
| Full local contract suite | `ci:verify` passed, including mapping, worker, export, sanitizer, layer, evidence, and UI-copy guards | DONE LOCAL | No external renderer claim |
| Persistent shared surface | Modern and legacy persistent iframe smoke passed with zero reloads | DONE LOCAL | Synthetic/local runtime only |
| Imported edit synchronization | Three anonymous synthetic DOM families passed edit-to-preview and resource checks | DONE LOCAL | Does not prove arbitrary-sheet semantics |
| Local visual equality | Four synthetic preview/edit cases passed at `0%` mismatch with zero page/console errors | DONE LOCAL | Synthetic contracts, not Roll20 screenshot parity |
| Actual Roll20 parity | Still requires same-payload Sandbox upload, full-root crop normalization, and current roll/chat evidence | OPEN | Keep external status partial |

## Wide Custom-Sheet Canvas Policy - 2026-07-31

| Area | Current evidence | Status | Boundary |
| --- | --- | --- | --- |
| Default sheet width | Shared policy keeps the documented default at `850px` | DONE LOCAL | Local product default only |
| User-authored sheet width | UI input, auto-measurement, and iframe bridge preserve `320px` to `10000px` | DONE LOCAL | Safety ceiling remains; destination limits are separate |
| Rolltemplate width | Separate `200px` to `600px` bounds remain unchanged | DONE LOCAL | Applies only to chat-template editing |
| Width regression coverage | Unit test, build-doc test, edit-flow, fresh-sheet, lint/build, and CI pass | DONE LOCAL | Does not prove external Roll20 acceptance |

## Modern Sandbox File Chooser Retry - 2026-07-31

| Area | Current evidence | Status | Boundary |
| --- | --- | --- | --- |
| Participant safety | Dedicated modern Sandbox again showed `1 구성원` | DONE OBSERVATION | No ordinary room touched |
| Supported chooser | Visible HTML label produced no chooser event; the actual hidden input click hit the supported selector deadline | BLOCKED HOST | No file transmission |
| Payload state | HTML input remained empty after the attempt | VERIFIED NEGATIVE | No save, reload, or sheet application |
| Next prerequisite | Chrome extension must allow local file URLs before retry | USER ACTION | Do not use hidden-input, endpoint, or CDP workarounds |

## Local Imported Edit-Sync Recheck - 2026-07-31

| Area | Current evidence | Status | Boundary |
| --- | --- | --- | --- |
| Imported pointer interaction | Three anonymous fixture families completed the canonical iframe pointer path | DONE LOCAL | Synthetic/local families only |
| Preview/edit synchronization | Three of three fixtures kept the moved layer aligned through emit and preview update | DONE LOCAL | Does not prove arbitrary-sheet semantics |
| Resource gate | Three of three fixtures had no final rendered resource failures | DONE LOCAL | Local static output only |
| Actual Roll20 upload/render | Supported Sandbox file chooser still returns `Not allowed`; root/chat captures remain `0/4` | BLOCKED EXTERNAL | No parity claim |

The first failed strict attempt after cleanup was a missing generated `out`
document. Rebuilding before the rerun separated that harness issue from the
product result.

## Chrome Permission Handoff - 2026-07-31

| Area | Current evidence | Status | Boundary |
| --- | --- | --- | --- |
| Supported chooser | Roll20 HTML file chooser returns `Not allowed` before upload | BLOCKED EXTERNAL | No payload transmission |
| Permission recovery | Browser policy refuses the Chrome extension-settings URL | USER ACTION | Manual Chrome permission change required |
| Safety | Temporary blank tab closed; no Roll20 state changed | DONE SAFETY | Does not advance parity |

## Imported Smoke Preflight Guard - 2026-07-31

- `IMPLEMENTED / VERIFIED LOCAL`: the imported edit-sync smoke now validates
  `out/index.html` before binding port `4196`. Missing static output is an
  explicit build prerequisite, not a rendered-page `404` misreported as an
  interaction failure.
- The guard's missing-output check and the normal strict run both pass at the
  expected boundary: the normal run remains `3/3` anonymous local fixtures.

## Legacy Test-Room Observation - 2026-07-31

| Area | Current evidence | Status | Boundary |
| --- | --- | --- | --- |
| Participant safety | Fresh visible count was exactly one in the dedicated legacy destination | DONE OBSERVATION | No writes permitted in this observation |
| Roll20 wrapper/default state | Dialog class family, iframe geometry, tabs, controls, and roll-button presence captured locally | DONE OBSERVATION | Does not prove exported-sheet parity |
| Legacy actual render parity | No user payload was uploaded or compared in this step | OPEN | Requires separate legacy export/apply/capture gate |

## Canvas Multi-Object Free Transform - 2026-07-31

| Area | Current evidence | Status | Boundary |
| --- | --- | --- | --- |
| Shared pointer transform | Selected top-level iframe nodes move by one pointer delta during free drag | DONE LOCAL | Anonymous synthetic browser smoke |
| Stable pointer-up selection | Rendered block IDs rebuild the multi-selection payload before managed CSS commit | DONE LOCAL | No external renderer evidence |
| Persisted output | Both selected positions remain changed after iframe patch and emitted HTML/CSS update | DONE LOCAL | Does not prove arbitrary-sheet semantics |

The current local evidence covers the editor interaction contract only. Roll20
Sandbox upload/render and the separate legacy-room contract remain open.

## Canvas Modifier Multi-Selection - 2026-07-31

| Area | Current evidence | Status | Boundary |
| --- | --- | --- | --- |
| Modifier transport | iframe edit-hit validates optional Alt/Ctrl/Meta/Shift flags | DONE LOCAL | No external renderer evidence |
| Canvas selection | Plain click resets to one; Ctrl/Cmd-click adds the rendered layer to the workspace selection list | DONE LOCAL | Synthetic browser smoke only |
| Shared visual state | The same selection list highlights both canvas objects and layer rows before grouping | DONE LOCAL | Multi-object transform remains open |

This selection state remains transient and does not alter exported HTML/CSS
until a structural edit is explicitly committed.

## Current Roll20 Sandbox Chooser Retry - 2026-07-31

| Area | Current evidence | Status | Boundary |
| --- | --- | --- | --- |
| Modern Sandbox access | Dedicated tab, Sheet Sandbox Tools dialog, and visible member count exactly one | READY EXTERNAL | No payload changed |
| Supported file upload | Official file chooser event reached the HTML input; `setFiles` returned `Not allowed` | BLOCKED EXTERNAL | Chrome file-URL permission remains missing |
| Actual current-payload evidence | Status gate reports generated screenshots `0/4`, chat metrics `0/2`, renderer readiness `NO` | OPEN | No parity claim |

The retry did not use hidden-input, endpoint, or direct-DOM upload workarounds.

## Iframe Multi-Selection Bridge - 2026-07-31

| Area | Current evidence | Status | Boundary |
| --- | --- | --- | --- |
| Selection contract | `selectedBlockIds` travels with the existing edit-mode message; the primary ID remains backward-compatible | DONE LOCAL | No external renderer evidence |
| Rendered selection | Persistent iframe marks every selected synthetic DOM layer and clears stale marks | DONE LOCAL | Synthetic browser smoke only |
| Edit geometry | Primary selection continues to drive measure/drop geometry and inspector behavior | DONE LOCAL | Multi-object transform behavior remains open |

The bridge is intentionally local/transient. It does not persist selection in
autosave and does not change exported HTML/CSS.

## Layer Multi-Select And Grouping - 2026-07-31

| Area | Current evidence | Status | Boundary |
| --- | --- | --- | --- |
| Layer multi-select | Ctrl/Cmd additive selection and primary-selection preservation | DONE LOCAL | Browser evidence is synthetic-only |
| Layer grouping | Contiguous same-parent selection becomes an editable generic HTML frame; model/iframe/emit parents agree | DONE LOCAL | Does not prove arbitrary-sheet semantics or Roll20 parity |
| Invalid grouping guard | Mixed parents, non-contiguous siblings, and invalid structural parents are rejected | DONE LOCAL | Broader DOM families remain open |

## Local Edit-Surface Synchronization Increment - 2026-07-31

| Area | Current evidence | Status | Boundary |
| --- | --- | --- | --- |
| Free-placement layer drop | Active placement mode reaches iframe layer target resolution; child hits fall through to the eligible containing frame; anonymous unit regression and `smoke:edit-flow` pass | DONE LOCAL | Does not prove arbitrary-sheet coverage or Roll20 parity |
| Preview/edit render identity | Existing local imported-edit smoke remains the current evidence | PARTIAL | Broad arbitrary-sheet and actual Roll20 comparison remain open |
| Roll20 actual upload/render | Current payload generation is ready but browser file-URL permission still blocks upload | BLOCKED EXTERNAL | No parity claim |

Date: 2026-07-31

## Mixed Runtime-Source Preservation Regression - 2026-07-31

- `VERIFIED LOCAL`: an anonymous mixed HTML/CSS input now has regression
  coverage for modern selector arguments, unsupported container at-rules,
  worker source, and ordinary page JavaScript. The importer keeps visual HTML
  free of page-script source, preserves worker/page workspaces separately,
  keeps selector structure, and retains the unsupported container rule as raw
  CSS.
- Focused import structure is `43/43`; full CI, lint, build, diff check, and
  server hygiene pass.
- `VERIFY / OPEN`: this strengthens local preservation only. It does not close
  arbitrary-sheet coverage, live worker execution, or actual Roll20 screenshot
  parity.

## Sandbox Upload Permission Retry - 2026-07-31

- `VERIFY / BLOCKED EXTERNAL`: a fresh dedicated modern Sandbox preflight again
  showed exactly one visible participant and the expected file-upload dialog.
  The supported local-path chooser returned `Not allowed` before upload.
- The browser connector does not support the in-memory file-payload form, and
  no hidden DOM input, direct endpoint, internal Roll20 API, or other bypass
  was used.
- Current authoritative run remains `generatedActualScreenshots=0/4` and
  `chatCurrentMetrics=0/2`; no visual parity claim is made.
- Next gate: enable the documented Chrome file-URL permission, upload the
  current anonymous payload, capture modern root/chat evidence, then repeat
  independently in the dedicated legacy destination.

## Canonical Free-Placement Containment Regression - 2026-07-31

- FIXED LOCAL: free-mode widget target resolution no longer commits a root
  absolute placement merely because the pointer is over a child whose local
  candidate is `before/after`; an eligible ancestor container is preferred.
- VERIFIED LOCAL: canonical imported-edit smoke passed anonymous generic,
  sibling, and non-leaf fixtures. Flow insertion `3/3`, free absolute
  insertion `3/3`, canonical edit/preview sync `3/3`, sheet-root mismatch
  `0%` for `3/3`, stable re-import `3/3`, and console/page errors `0/0`.
- OPEN: this strengthens local editor behavior only. Actual Roll20 modern
  Sandbox/legacy destination screenshot, chat, worker, asset, and arbitrary
  sheet parity remain unverified.

## Current Gate Reconciliation - 2026-07-31

- `VERIFIED LOCAL`: current branch is `claude/design-reset`; the export-dialog
  smoke now waits for an opaque, open dialog before taking its screenshot,
  preventing a transition frame from being treated as UI evidence.
- `VERIFIED CURRENT STATUS`: `status:roll20-actual` reports the anonymous
  local pre-upload run as `PASS`, but current generated actual screenshots are
  `0/4`, diffed actual screenshots are `0/4`, and current chat metrics are
  missing `2/2`.
- `VERIFY / BLOCKED EXTERNAL`: the dedicated modern Sandbox and legacy test
  destination must still receive the current payload and produce fresh root
  and chat captures. Historical runtime observations do not close this gate.
- `CLAIM BOUNDARY`: no live Roll20 visual parity, same-payload attachment
  hash parity, worker mutation parity, or arbitrary-sheet coverage is claimed.

## Imported Non-Leaf Layer Reorder Refresh - 2026-07-31

- VERIFIED LOCAL: `smoke:imported-edit-sync --only
  synthetic-nonleaf-flow --require-nonleaf-visual-sync true` passed with
  `blockCount=9`, a real layer-panel subtree move, preserved child parents,
  changed sibling order, preview/edit coordinate sync, and `0%` subtree image
  mismatch.
- CLAIM BOUNDARY: this closes the neutral imported non-leaf regression case;
  it does not prove every imported DOM shape, actual Roll20 parity, or
  arbitrary-sheet coverage.
- NEXT: extend the same assertion to more anonymous structural families when
  doing so does not require retaining source-identifying or copyrighted sheet
  material.

## Local Payload Fidelity Gate - 2026-07-31

- DONE LOCAL: The new fidelity gate checks exact local payload/snippet byte
  binding, app emit hashes, ZIP entries, and local DOM/CSS roundtrip evidence.
- VERIFIED LOCAL: The two anonymous generic payload fixtures passed all
  applicable local checks; the worker-bearing fixture passed worker source
  preservation as well.
- VERIFY / OPEN: Roll20 external attachment readback is unavailable, so
  same-hash attachment parity remains unproven. Actual modern/legacy screenshot
  parity, worker mutation, assets, reference images, and arbitrary-sheet
  coverage remain open.

## Fresh Dedicated Runtime Recheck - 2026-07-31

- VERIFIED EXTERNAL: The dedicated modern and legacy destinations each passed
  a fresh visible one-participant preflight. No ordinary room was touched.
- MEASURED EXTERNAL: Both rendered the same anonymous translated labels,
  controls, table, and Roll control. Modern used `block`/`inline-block` for
  the generic row/columns; legacy used `flex`/`block`. Both visible roots were
  `852x340` including the authored box.
- VERIFIED EXTERNAL: Both Roll clicks produced the anonymous `Layout proof`
  template with a `Result` in chat.
- VERIFY / OPEN: This strengthens runtime/context evidence only. It does not
  promote the external attachment hash or normalized screenshot comparison.

## Actual Generic Layout Proof - 2026-07-31

- VERIFIED EXTERNAL: The same anonymous generic layout payload rendered in the
  dedicated modern Sandbox and dedicated legacy test destination after fresh
  one-participant preflight. Existing rooms were not used.
- VERIFIED EXTERNAL: Both showed translated labels, input, textarea, select,
  table header/body cells, authored pink styling, and a `760x320` panel.
  In-memory captures were non-blank and were not retained.
- MEASURED EXTERNAL: Modern computed row/column behavior was
  `block` + `inline-block`; legacy was `flex` + `block`. This demonstrates
  separate Roll20 generation contracts and is not a normalized parity PASS.
- VERIFIED EXTERNAL: Both Roll controls produced the anonymous `Layout proof`
  template/result in chat.
- FIXED LOCAL: `TAG=th/td` is now passed into structural layer-drop checks, so
  valid table-cell siblings can be reordered. The rebuilt full synthetic
  imported-edit smoke passed all five fixtures.
- OPEN: Exact same-hash attachment comparison, worker mutation, assets,
  reference images, and arbitrary-sheet support remain unproven.

## Latest Dual-Destination Roll20 Runtime Recheck - 2026-07-31

- VERIFIED EXTERNAL: The dedicated modern Sandbox and dedicated legacy test
  room each passed a fresh visible participant preflight of exactly one.
  Existing rooms remained observation-only and untouched.
- VERIFIED EXTERNAL: Both destinations rendered the same anonymous synthetic
  marker set with translated `Name`, one input, one Roll control, authored
  pink styling, a `420x180` panel, and a visible `860x200` sheet root using
  the sampled Roll20 `13px Helvetica Neue` base.
- VERIFIED EXTERNAL: In-session wrapper clips measured `900x285.6875` for
  modern and `900x283.55` for legacy. This supports runtime/context
  reconciliation only; it is not a normalized pixel-diff PASS.
- VERIFIED EXTERNAL: Real Roll clicks in both dedicated destinations produced
  the anonymous `Sandbox proof` template/result in chat. Worker mutation,
  template-by-template visual parity, asset parity, and arbitrary-sheet
  coverage remain unproven.
- VERIFY / OPEN: Exact same-hash attachment parity and generic layout-family
  screenshot/computed-style comparison remain the next external gates.

## Latest Canonical Imported Edit Verification - 2026-07-31

- FIXED LOCAL: Imported layer/non-leaf smoke now reads the canonical persistent
  iframe, and edit-state/capture helpers no longer depend on the retired Shadow
  host.
- VERIFIED LOCAL: Anonymous layer-siblings fixture passed visible leaf
  before-drop; the non-leaf flow fixture passed subtree reorder, edit/preview
  coordinate sync, and normalized pixel comparison at `0%` mismatch. All
  three anonymous fixtures passed canonical sync, stable HTML/CSS re-import,
  and zero console/page errors.
- HONEST SKIP: The generic-elements fixture has no safe layer sibling or
  non-leaf subtree, so only those checks are skipped for that fixture.
- OPEN: This is local synthetic evidence only. Actual Roll20 Sandbox/legacy
  destination parity remains pending.

## Latest Wrapper Geometry Reconciliation - 2026-07-31

## Latest Generic Layout Regression - 2026-07-31

- VERIFIED LOCAL: Synthetic fixture-B covers 2-column/column containers,
  table structure, input, textarea, select, option, CSS, and five i18n keys.
  It imported `24` HTML blocks with zero warnings.
- VERIFIED LOCAL: Modern and legacy preview/edit runs both report geometry
  parity `true`, exact pixel parity (`0%` mismatch), and i18n `5/5`.
- VERIFIED LOCAL: A clean rerun after server hygiene on port `4197` reproduced
  the same exact result for fixture-A and fixture-B in both compatibility modes.
- DIAGNOSTIC ONLY: The prior port-`4186` fixture-B legacy failure was a single
  pre-capture `ERR_NO_BUFFER_SPACE` resource error, not a measured mismatch.
- FIXED LOCAL: Full-root candidate metrics now carry direct generic layout
  selector samples, and the computed-style comparator consumes them before
  older aggregate geometry. This closes a diagnostic false-negative path for
  nested table/form controls; existing actual reports still need regeneration.
- NOT PROVEN: live Roll20 computed-style or screenshot parity for those layout
  families; the actual current Legacy payload still has no such nodes.

- VERIFIED EXTERNAL: The dedicated Legacy verification tab measured a
  `1495 x 582` page viewport at DPR `1.25`, a `900 x 283.55` sheet iframe,
  and a `420 x 180` visible sheet crop. The wrapper evidence is anonymous and
  remains local-only.
- FIXED LOCAL: The frame probe now records viewport/document/body geometry and
  the crop helper records source/output image formats.
- MEASURED / VERIFY: Direct PNG comparison after cropping the exact sheet
  region from the JPEG capture measured mean channel difference `2.414` and
  threshold-60 mismatch `3.016%`; best tested `-1px` local alignment measured
  `1.851` and `2.601%`. This is still not a parity PASS.
- NOT PROVEN: lossless browser capture, arbitrary-sheet parity, generic
  row/column/table parity, live worker mutation, and reference-image parity.
- UNVERIFIED EXTERNAL: The current anonymous payload contains no standard
  2-column/3-column/table/textarea/select nodes. The new probe records these
  as absent rather than treating absence as a parity pass.

## Latest Pushed Checkpoint - 2026-07-31

- The current pushed checkpoint is `37f7ae5` on `claude/design-reset`. This
  checkpoint contains the canonical imported layer/edit verification and its
  local evidence; actual Roll20 destination parity remains open.

## Latest Legacy Computed-Style Reconciliation - 2026-07-31

- VERIFIED EXTERNAL: The anonymous dedicated Legacy iframe sidecar shows the
  visible sheet root inheriting `Helvetica Neue`/`13px`; the previously used
  broad legacy `sans-serif`/`16px` surface is not present in the actual frame.
- FIXED LOCAL: Removed that unverified global legacy surface override while
  retaining the separate legacy selector, asset, and input-state contracts.
- VERIFIED LOCAL: Legacy smoke, build-doc bundle, production build, and paired
  modern/legacy preview-edit smoke pass. Sampled leaf computed styles compare
  with zero significant differences under the documented `1px` tolerance.
- MEASURED / VERIFY: The refreshed anonymous crop is `3.759` mean channel
  difference, `6.167%` threshold-20 mismatch, and `4.187%` after the best
  tested translation. This is not visual parity.
- NOT PROVEN: wrapper-normalized pixel parity, arbitrary-sheet parity, live
  worker mutation, and reference-image comparison.

## Latest External Reconciliation - 2026-07-31

- The current pushed checkpoint is `b15d789` (the render correction is in
  `15bf7fc`); local lint, build, `ci:verify`, and parity-focused smoke gates
  passed, and remote CI run `30578368146` passed safety/unit verification,
  lint, and build.
- VERIFIED EXTERNAL: The authenticated modern Sandbox rendered the anonymous
  synthetic payload with translation, input, Roll button, and chat template.
- VERIFIED EXTERNAL: A newly created dedicated Legacy room showed exactly one
  visible member, saved the same anonymous payload with Custom plus the Legacy
  sanitization option enabled, rendered `Name` plus authored CSS/input/Roll,
  and produced the expected template/result chat output.
- MEASURED / VERIFY: A normalized anonymous Legacy sheet crop (`420 x 180`)
  measured `5.913%` threshold-20 pixel mismatch against the local crop;
  after a best `+2px` alignment probe it remained `5.223%`. This is not a
  visual-parity pass.
- NOT PROVEN: pixel-diff parity, arbitrary-sheet parity, live worker mutation,
  and reference-image comparison. Existing rooms remained read-only.
- The first Legacy attempt exposed a validation-harness issue: Ace editor
  updates accumulated JSON fragments. The harness now replaces the visible
  editor contents and keeps the Roll20-required fallback text for i18n labels.

## Current Checkpoint - 2026-07-31

- The active integration branch is `claude/design-reset` at `bbafd08` before
  this validation-harness update; the latest remote CI run `30574906436`
  passed.
- Local preview/edit, fresh-sheet creation, protected local-input visual
  checks in modern/legacy contracts, import/export, worker preservation,
  Sandbox-sanitizer approximation, privacy guards, and the resumable Roll20
  upload handoff are locally verified.
- The product chat renderer no longer contains fixture-specific font,
  geometry, typography, paint, or rolltemplate policies.
- Actual anonymous current-payload modern Sandbox activation and chat smoke,
  plus dedicated Legacy-room render/chat smoke, are now verified. Screenshot
  parity, arbitrary-sheet parity, live worker mutation, and reference-image
  comparison remain `VERIFY / OPEN`.
- The importer now reports HTML, CSS, and combined structured coverage
  separately. A 32-selection anonymous read-only batch passed determinism and
  structural fingerprint checks; it still found five CSS raw fallbacks, so
  this is not an all-sheet 100% mapping claim. The same batch measured CSS
  coverage from `94.6%` to `100%`, combined structured coverage from `97.7%`
  to `100%`, and `50` total importer warnings.
- The authenticated Roll20 browser session was used only with the dedicated
  modern Sandbox and newly created Legacy test room. Existing rooms remained
  read-only, and no source payload, room identifier, or screenshot was added
  to the public tree.

## Latest Local Context-Menu Reconciliation: 2026-07-31

- The Figma-like context delete path now removes the selected HTML layer and
  its nested subtree instead of promoting descendants to the root. This fixes
  a local duplicate/delete regression in the shared iframe surface.
- The duplicate path excludes the selected block's following statement chain,
  and middle-layer deletion preserves the next sibling in the same flow.
- VERIFIED LOCAL: persistent preview smoke exercises duplicate and delete in
  modern and legacy compatibility modes with the same iframe, emitted HTML,
  model count, and zero reloads.
- BOUNDARY: This remains local edit-surface evidence. It does not close the
  current-payload Roll20 Sandbox upload, screenshot parity, worker/chat
  runtime parity, or dedicated legacy-room verification.

## Latest Local Edit Affordance Reconciliation: 2026-07-30

- The parent-owned iframe overlay now distinguishes exact `before`, `inside`,
  and `after` insertion: before/after are thin edge lines and inside is a
  container frame. The layer panel exposes the same state and action labels.
- VERIFIED LOCAL: drop-indicator unit test, iframe drop-target tests, lint,
  build, and browser edit-flow smoke pass. The smoke observed 4px before/after
  lines and stable model/emitted/rendered order after commit.
- BOUNDARY: This is edit UX evidence only. It does not close the actual modern
  Sandbox upload, Roll20 visual parity, worker/chat runtime, or dedicated
  legacy-room gates.

## Latest Local Worker Preservation Reconciliation: 2026-07-30

- `setAttrs(attributes, options)` is now treated as an explicit raw-worker
  fallback when the second argument is present, so unsupported options are
  not silently removed during import/export.
- VERIFIED LOCAL: worker parser `27/27`, full `ci:verify`, lint, build, and
  server-hygiene checks pass.
- BOUNDARY: This preserves unsupported worker semantics; it does not provide
  block-level options editing or prove live Roll20 worker execution.

## Latest Local Worker Declaration Reconciliation: 2026-07-30

- The variable declaration block now preserves `let`, `var`, and `const`
  through its explicit `KIND` field instead of rewriting `var` to `let`.
- VERIFIED LOCAL: parser coverage includes all three declaration forms.
- BOUNDARY: This is declaration-kind preservation, not complete JavaScript
  support or live worker runtime evidence.

## Latest External Sandbox Connection Reconciliation: 2026-07-30

- Fresh Chrome discovery still finds the isolated Sandbox tab at its expected
  editor URL, but the exact tab claim times out before DOM/file-input access.
- NO MUTATION: No room, campaign setting, upload, chat, or source material was
  changed during this retry.
- STATUS: Actual modern Sandbox render evidence and the separate legacy-room
  gate remain open; this connection failure is not a parity result.

## Latest External Sandbox File-Selection Retry: 2026-07-30

- The isolated modern Sandbox visibly reported one member and all three upload
  controls.
- The visible selection attempt did not attach the anonymous HTML file; the
  input remained empty and no applied root or iframe appeared.
- Keep modern activation and the separate legacy-room runtime/visual gate at
  `VERIFY/BLOCKED at browser handoff`. No actual parity claim is promoted.

## Latest Local Worker Mapping Reconciliation: 2026-07-30

- Supported worker arithmetic, comparison, and logical expressions now map
  recursively to the existing worker blocks, including nested precedence and
  grouping. Unsupported expressions remain preserved instead of being falsely
  marked as parsed.
- The worker `if` emitter now avoids redundant outer grouping so the supported
  imported graph can pass the existing source-stability gate.
- VERIFIED LOCAL: parser `25/25`, worker workspace browser smoke, lint,
  production build, full `ci:verify`, persistent preview in modern/legacy,
  edit-flow, and strict imported-edit synchronization pass.
- BOUNDARY: This is local worker mapping evidence only. Actual Roll20 worker
  execution, roll/chat runtime parity, modern Sandbox activation, and the
  separate legacy-room verification remain open.

## Latest Local i18n Attribute Fidelity Reconciliation: 2026-07-30

- `data-i18n-title` and `data-i18n-html` now preserve supported source tags
  through import and emit using the shared i18n tag policy. Unsupported tags
  avoid the specialized block so their generic/container path can preserve
  the element structure.
- VERIFIED LOCAL: import structure `41/41`, style/import `16/16`, emit
  contract, high-priority mapping `22/22` and `25/25`, lint, production build,
  full `ci:verify`, persistent preview, edit-flow, and strict imported-edit
  synchronization pass.
- BOUNDARY: This is targeted local mapping evidence only. Actual modern
  Sandbox and dedicated legacy-room visual/runtime evidence remain open.

## Latest External Sandbox Recheck: 2026-07-30

- The dedicated modern Sandbox remains isolated and visibly reports exactly
  one member with all three file controls present.
- The current browser connection still lacks the normal file primitives and a
  supported input-file attachment method. No applied sheet root, iframe, or
  fresh Roll20 render evidence was produced.
- Keep modern Sandbox activation and the separate legacy-room gate as
  `VERIFY/BLOCKED at browser handoff`; local renderer tests must not promote
  either external gate.

## Latest Local Import Fidelity Reconciliation: 2026-07-30

- `data-i18n-aria-label` now preserves the source tag through a shared i18n
  tag policy. Supported tags carry an editable `TAG` field into the generated
  HTML; unsupported tags no longer get forced into the aria-label block and
  continue through the generic/container path.
- VERIFIED LOCAL: import-structure `41/41`, emit contract, lint, production
  build, full `ci:verify`, persistent preview modern/legacy, edit-flow, strict
  imported-edit synchronization, and legacy preview smoke all pass.
- BOUNDARY: This closes one targeted structure-loss candidate. It does not
  prove arbitrary HTML/CSS losslessness, actual Roll20 visual parity, worker
  runtime parity, or legacy-room verification.

## Latest Local Role Reconciliation: 2026-07-30

- The visual layer classifier now covers the remaining built-in display atoms:
  horizontal rule, spacer, line break, and CSS-backed icon. Atomic display
  elements remain reorderable but are not child drop targets; translation
  dictionary entries remain export-only source blocks.
- Focused import, emit, and role tests pass. This is a generic local mapping
  improvement; full CI, lint, build, edit-flow smoke, and strict imported-edit
  sync also pass. This does not promote the modern Sandbox or legacy-room
  parity gate.
- Actual Roll20 evidence remains `VERIFY/BLOCKED at browser handoff` because
  the authenticated Chrome tab could not be claimed or controlled in the
  current connection.

## Latest Reconciliation: 2026-07-30

- The current active evidence boundary is the latest TODO/progress entry, not
  older historical sections below it. Local preview/edit and imported-edit
  smoke remain passing, but they are same-renderer evidence only.
- The authenticated Chrome tab list is visible, but the isolated Roll20 tab
  could not be claimed or controlled in the current connection. The in-app
  browser is unauthenticated. No fresh participant count, upload, save, chat,
  room observation, or generated Roll20 screenshot was accepted in this batch.
- Treat modern Sandbox and legacy-room actual parity as `VERIFY/BLOCKED at
  browser handoff`, not as complete. Keep the historical measurements below
  for provenance, but do not use them to promote the current renderer gate.

## Superseding Evidence: 2026-07-18

- A browser-side anonymous synthetic payload has now rendered in both a modern
  solo Roll20 Sandbox room and a dedicated legacy-enabled solo room. Both
  showed translated text, an input, and a roll button; both produced a scoped
  Roll20 chat result. The legacy room had `legacy_sanitization` enabled.
- The same payload passed local preview/edit in both compatibility modes with
  exact pixel equality, zero computed-style/geometry differences, translation
  `2/2`, and zero visible runtime nodes.
- This supersedes only the earlier native file-chooser blockage for the
  synthetic smoke route. It does not supersede the broader prepared-fixture
  visual-diff reports and is not a claim of universal Roll20 parity.
- Next P0 is a normalized local-vs-modern-vs-legacy evidence comparison with
  explicit wrapper, iframe, sheet-root, state, asset, and chat fields.

Follow-up measurement, 2026-07-18:
- The dedicated legacy synthetic `.charactersheet` root measured `860x280`
  inside a `900px` iframe, while the matching local preview/edit root measured
  `870x280`. The local pair is exact against itself, but the cross-runtime
  root comparison is `FAIL` for the 10px width difference.
- Modern actual sheet-root geometry is still `NOT_COMPARABLE` because its
  inner-root sidecar has not been captured yet.
- The comparison tool now treats any measured root/wrapper/runtime
  contradiction as `FAIL`; `PASS_WITH_OPEN_PARITY_GAP` is reserved for missing
  evidence without a contradiction.

This matrix breaks the operating requirements into actionable work. Use it with `docs/qa/31_active_todo.md`.

Latest local root-height evidence, 2026-07-30:
the shared preview/edit iframe resize path now reconciles the authored
`.charactersheet` root height with descendant paint bounds instead of adding a
fixed `24px` tail. Anonymous modern/legacy local preview/edit smoke reports
exact pixel/style/geometry parity and a `0px` host/content delta for the
`850 x 200px` default surface. This closes only the local extra-tail defect;
the actual Roll20 synthetic probe still uses a `900px` iframe and an
`860 x 200px` root, so wrapper/root normalization remains VERIFY.

Current superseding status, 2026-07-13:
`corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1`
now reports `GENERATED_ACTUAL_SCREENSHOTS_DIFFED`, generated screenshots/diffs
`6/6`, `generatedAuthoritative=YES`, `chatCaptureSuspects=0`,
`chatNeedsNormalizedCapture=0`, `trustedFullRoot=3/3`,
`reliableTrustedFullRoot=3/3`, and `rendererReady=NO`. The active blocker is no
longer missing chat captures. It is renderer/model parity: same-structure chat
high mismatch remains `2/3` with max aligned mismatch `20.68%`, fixture-A/fixture-C have
asset-relink blockers, and the renderer gate still holds global ChatPane CSS
because fixture-A and fixture-C require different template-scoped models. Older notes in
this matrix that mention `2/6`, `4/6`, or missing fixture-A/fixture-C chat captures are
historical unless a newer section explicitly reintroduces that state.

Current local preview/edit status, 2026-07-16:
`smoke:preview-edit-visual` now separates edit-only overlay paint from the
underlying sheet and expands the browser viewport before full-sheet capture.
Ignored local run `.tmp/preview-edit-visual-20260716-r14` passes all 3 prepared
fixtures: two are exact at `0` mismatched pixels and one records `14` background
resampling pixels (`8.4 ppm`, max channel delta `12`) under the explicit raster
tolerance. All have `0` sampled computed-style differences, `0` visible-geometry
differences, matching DOM/text signatures, and no console/page/resource errors.
The earlier 1-9% local values mixed real edit affordances or viewport-stitching
bands into the diff. This strengthens local equivalence evidence only; actual
Roll20 parity and the stronger single live render-surface architecture remain
unverified.

Current translation/runtime status, 2026-07-16:
the editor's locale-comment output and Roll20 `translation.json` now share one
parser across preview, edit, worker/chat, and export. Ignored local run
`.tmp/preview-edit-visual-20260716-r19` records full preview/edit translation
matches of `436/436`, `0/0`, and `1148/1148`, with visible matches `53/53`,
`0/0`, and `93/93`. Local computed style/geometry stayed identical and the
existing exact/raster pixel gate still passed. This closes the local
English-preview/Korean-export defect. It does not close actual Roll20 parity.

Current modern/legacy runtime status, 2026-07-16:
live Roll20 inspection proves the two generations are different render
contracts. The modern Custom Sheet Sandbox preserved `attr-input` and measured
the sampled input at `210x26px`; the dedicated legacy test room produced
`sheet-attr-input` at `52x40px` from the same source. Both translated the
prepared markers and removed source script nodes. The app now switches HTML
class handling, legacy CSS sanitization, preview/edit state, export manifest,
and generated verification expectation together. Automated contract tests pass,
but normalized modern and legacy screenshot diffs for the same export are still
P0; neither mode may stand in as proof for the other.

Current product-surface note, 2026-06-20 header usability:
the header no longer exposes placeholder `설정` / `도움말` controls, and `저장`
now performs a real IndexedDB workspace snapshot save. Browser smoke verified
the success toast on `http://localhost:3000/`. This improves basic usability
only; it does not affect Roll20 renderer parity, which remains blocked by
`HOLD_PRODUCTION_RENDERER_PATCH`.

Current Roll20 chat-renderer note, 2026-06-20 policy gate:
`diagnose:roll20-chat-renderer-policy` now records the current actual Roll20
chat evidence as an explicit diagnostic rollout policy. The current policy is
`HOLD_GLOBAL_CHAT_RENDERER_PATCH` and `DO_NOT_EXPOSE`: fixture-A keeps the default
ChatPane renderer, fixture-B needs a new diagnostic model, and fixture-C has only
fixture-local candidates. This prevents a single global width/padding/font patch
from being mistaken for Roll20 parity while table-width deltas conflict across
fixtures.

## Server and Environment Hygiene

| Status | Priority | Requirement | Current Evidence | Next Action |
| --- | ---: | --- | --- | --- |
| DONE | P0 | Stop unnecessary project dev servers. | `corepack pnpm run check:server-hygiene` reports no project dev/smoke listener on `3000`, `3001`, `3002`, or `4300-4499`; Roll20 CDP `9222` is preserved. | Recheck before and after browser smokes; use `-- --kill-project` only for matching project `node.exe` listeners. |
| VERIFY | P1 | Identify unknown listeners safely. | `tasklist.exe` can be permission-blocked in this sandbox, so `check:server-hygiene` falls back to port/PID evidence and reports process names as `unknown`. | Do not stop user/system apps or unknown processes without explicit confirmation. |

## Preview and Roll20 Parity

Current local chat-renderer note, 2026-06-19 Roll20 shell alignment:
`components/editor/ChatPane.tsx` now uses readable Korean copy and Roll20-like
chat wrapper classes (`textchatcontainer`, `message`, `spacer`, `by`, `tstamp`).
`scripts/rolltemplate_chat_smoke.mjs` now verifies those shell markers. Latest
local smoke PASSes fixture-A, fixture-B, and fixture-C with rolltemplate kind, 280px card
width, shell markers present, and no debug `rolltemplate:name` label. This
improves local comparison readiness but is not actual Roll20 chat parity.

Current Roll20 actual-screen note, 2026-06-19 chat evidence split:
`scripts/roll20_actual_status.mjs` and `scripts/roll20_upload_handoff.mjs` now
separate chat DOM evidence and page-level screenshots from visual chat
screenshot evidence. Latest rerun shows fixture-B has
`chat-dom-page-screenshot-only` / `DOM_PAGE_ONLY`: `roll20-chat-page.png` exists
beside DOM evidence, but it is not accepted as chat visual evidence because
`roll20-chat.png` is still missing. fixture-A and fixture-C are also missing
`roll20-chat.png`. Actual Roll20 rolltemplate/chat visual parity remains
unverified even though the local app chat smoke passes.

Current Roll20 actual-screen note, 2026-06-19 handoff alignment update:
Chrome could claim the dedicated Roll20 editor tab, but ordinary page DOM reads
could not access the character iframe and this runtime blocks CDP target
discovery/auto-attach, so no new Roll20 sheet screenshot was captured in this
batch. `scripts/roll20_upload_handoff.mjs` now uses the same generated-sheet
evidence gate as status/diff. Latest missing-only handoff reports fixture-A as
`SUSPECT` and still needing generated actual evidence, while fixture-B and
fixture-C have generated sheet evidence present but still need chat screenshots.

Current Roll20 actual-screen note, 2026-06-19 screenshot-diff truthfulness
update: `scripts/roll20_actual_screenshot_diff.mjs` now applies the same
fallback evidence rule as `scripts/roll20_actual_status.mjs`. A bare
`roll20-sandbox.png` viewport capture is `SUSPECT` and is not diffed unless a
positive iframe DOM/root sidecar proves the Roll20 sheet rendered. Latest diff
rerun for `reports\roll20-actual-compare\2026-06-18-state-map-v1` reports fixture-A
`SUSPECT`, fixture-B sandbox mismatch `6.57%`, fixture-C sandbox mismatch `22.93%`,
and all room/chat targets `SKIP`. This prevents endpoint-storage screenshots
from masquerading as actual Roll20 visual comparisons.

Current Roll20 actual-screen note, 2026-06-19 legacy manifest correction:
fixture-A exposed a real verification-payload bug. The official fixture-A `sheet.json`
uses `"legacy": true`, but the local baseline generator had emitted
`"legacy": false` for every fixture. The generator now resolves legacy mode
from fixture metadata or the official source `sheet.json`, and regenerated fixture-A
payloads carry `"legacy": true`. However, reapplying that regenerated fixture-A
payload to the dedicated Roll20 sandbox still produced a blank character
iframe; applying the official fixture-A source HTML/CSS/translation plus original
`sheet.json` also produced a blank iframe. Therefore fixture-A endpoint-fallback
evidence is currently not trustworthy for visual parity. A later fixture-C restore
through the same endpoint path also reopened as an empty iframe, so endpoint
fallback success is now classified as storage-only evidence unless followed by
a fresh iframe DOM/root check. Use this as a blocked/verification gap for Custom
Sheet Sandbox activation behavior, not as proof that any fixture matches
Roll20.

Current Roll20 actual-screen note, 2026-06-19 endpoint viewport update:
the dedicated Roll20 sandbox endpoint fallback was reused for fixture-A and fixture-C.
POSTs to `/sheetsandbox/savesheetsettings` accepted base64 HTML/CSS/translation,
and `/campaigns/savesettings/21639681` saved each fixture's
`customcharsheet_json`. Later rechecks downgraded fixture-A endpoint viewport evidence to
`SUSPECT` because no positive iframe DOM/root sidecar proves the sheet rendered.
Latest counted evidence is fixture-B sandbox mismatch `6.57%` and fixture-C
sandbox mismatch `22.93%`, both from DPR-corrected full-root evidence. Latest
status is still partial:
`generatedActualScreenshots=2/6`, `generatedDiffed=2/6`,
`roomObservationScreenshots=0/3`, and `roomObservationDiffed=0/3`;
`--require-actual` correctly fails because all 3 Roll20 chat screenshots are
missing. fixture-A/fixture-C still need normalized sheet-root/full-root capture before
renderer CSS conclusions.

Current Roll20 actual-screen note, 2026-06-19: the preferred sandbox evidence is
now `roll20-sandbox-root.png` when present. The crop helper normalizes a visible
Roll20 character iframe screenshot from a full viewport capture plus metadata.
For the current fixture-B evidence, the root crop diff is `21.67%`, and the
classifier now records this as a matched visible viewport mismatch while also
flagging that only the visible top of the tall sheet was captured. Do not make a
full-sheet parity claim from this number alone; first inspect visible-crop
CSS/assets/default-state differences, then capture full-height/scroll-stitched
Roll20 root evidence.
Additional local-only diagnostic:
`corepack pnpm run diagnose:roll20-visible-crop -- reports\roll20-actual-compare\2026-06-18-state-map-v1`
reports top-aligned local crop gain only `0.34%`, so simple horizontal crop
drift does not explain the visible mismatch.
`corepack pnpm run diagnose:roll20-visible-context -- reports\roll20-actual-compare\2026-06-18-state-map-v1`
then confirms the actual Roll20 iframe DOM/CSS is not readable in the current
evidence. fixture-B ranks as: full-height evidence gap first (`760x556` is
`12.42%` of local `850x4477`), visible CSS/state/asset mismatch second
(`21.67%`, crop gain `0.34%`), then sandbox sanitize rewrite, unconfirmed actual
default state, asset proxying, and missing chat screenshot. fixture-A/fixture-C now have
generated Roll20 sandbox viewport screenshots, but not normalized full-root
evidence. This is triage only.
`corepack pnpm run smoke:roll20-same-context-visible -- reports\roll20-actual-compare\2026-06-18-state-map-v1`
adds local Roll20-like context candidates. fixture-B best candidate is
`normal-root-top-left` at `21.60%`, so measured frame/inset/sandbox-width
simulation does not materially improve the actual visible mismatch.
Chrome/CDP live iframe probing then made the actual Roll20 character iframe
readable for generated fixture-B. The actual default state is
`sheetTab=combat` / `sheetTabForBtn=combat`, not the local state-map's
`act_fullsheet` assumption. Rerunning the same-context smoke with explicit
no-state candidates still leaves fixture-B at `21.60%`, so state alone is not
the root cause. Computed-style comparison identifies a Roll20 baseline mismatch:
actual `.charactersheet` uses content-box sizing, `13px` font, `18.5714px`
line-height, transparent root background, and `4px` input padding; the local
candidate still shows app/design-system-like border-box sizing, `14px` font,
`20px` line-height, white root background, and `6px 12px` input padding. This is
now the next P0 renderer target.
First renderer alignment patch removed the old hand-written fallback baseline
from actual render paths and stopped injecting full `vtt.css` into sheet
preview/edit. It also removed the Shadow edit-only forced `border-box` reset so
the local edit root can follow the actual Roll20 content-box root. Latest
same-context smoke reports fixture-B `21.38%` best mismatch, a small
improvement over `21.60%`, while computed-style comparison no longer reports the
prior `html` or input font/background/padding app-style overrides. Latest local
preview/edit regression smoke still passes after that box-model change: fixture-A
`1.75%`, fixture-B `2.02%`, fixture-C 1BU `1.01%`. Remaining actual-Roll20 evidence
points to root width/context, full-height capture, structure/table-count, and
fine control styling.
Latest DPR/root-width diagnostic rerun:
`corepack pnpm run smoke:roll20-same-context-visible -- reports\roll20-actual-compare\2026-06-18-state-map-v1`
now renders local candidates with the measured actual crop DPR
(`deviceScaleFactor=1.25`), adds actual-root-width and CSS-scale context
candidates, reports native-pixel mismatch, and scores computed-style ties.
fixture-B best candidate is `sandbox-actual-root-width-no-state` with CSS
mismatch `21.49%`, native mismatch `21.55%`, and style score `339`. The old
`21.38%` value came from a less fair local DPR setup, so treat `21.49%` as the
current same-context evidence. Actual-root-width matching lowers computed-style
distance but not the image mismatch. The concrete remaining clue is root
height/geometry: actual root height `4121.575px` vs local `4963.266px`.
Follow-up Chrome/CDP fresh selected-selector probing confirmed the previous
fallback counts were stale: `.sheet-2colrow`, `.sheet-col`, `img`, `table`, and
`input` counts now match local candidates from `selected` sources. The remaining
actual/local deltas are geometry, including first `.sheet-2colrow` height
`310.6px` actual vs `554px` local, table/input height differences, and the full
root height mismatch. Next work needs full-height/scroll-stitched root capture
and deeper row/table/control height comparison before generic CSS changes.
`corepack pnpm run diagnose:roll20-geometry --
reports\roll20-actual-compare\2026-06-18-state-map-v1` adds that deeper report:
actual/local selector counts match, row 0 is the strongest content delta, and
the local best candidate wraps the second `.sheet-col` to the next line. A
diagnostic inline-block tolerance candidate removes that wrap and reduces row 0
height from `554px` to `297px`, but it does not improve the image diff
(`21.56%` vs current best `21.49%`). Treat this as a root-cause clue, not a
production CSS patch.
Chrome/CDP then saved a read-only actual layout-context probe at
`live-iframe-probe/fixture-B-layout-context.json`. The source
`.outline` is present as Roll20 `.sheet-outline`, so wrapper loss is not the
cause. Actual row layout includes the Roll20 dialog chain and `20px` dialog
padding; a DPR border-snapping diagnostic candidate did not remove the local row
wrap or beat the current best. The next generic renderer investigation should
focus on inline-block whitespace/fit behavior and full-height/scroll-stitched
evidence before any production CSS patch.

2026-06-19 sandbox selector-prefix alignment update: the state visibility
diagnostic proved that the actual generated character iframe can keep CSS state
selectors unprefixed while uploaded HTML anchors are `sheet-` prefixed. The
local actual expected-render path now uses `sanitizeRoll20SandboxCss(css, {
prefixSelectors: false })` instead of blanket-prefixing CSS selectors. Sanitizer
tests, sandbox sanitize audit, sandbox preview smoke, preview/edit visual smoke,
export dialog smokes, lint, build, and the Roll20 evidence guard passed. This
removes one false local/actual state divergence source; it does not solve the
remaining full-root geometry/height mismatch.
Follow-up state-diagnostic report wording update: `scripts/roll20_state_visibility_diagnostics.mjs`
now detects that `buildSheetDoc`, `ExportDialog`, and the sandbox sanitize audit
already use `prefixSelectors: false` for Roll20 actual expected-render evidence.
The report still classifies the captured fixture-B fixture as
`ACTUAL_CSS_STATE_SELECTORS_DO_NOT_MATCH_PREFIXED_HTML`, but its next action is
now cross-fixture re-verification and local Sandbox expected visibility
comparison, not re-applying blanket CSS selector prefixing.
Follow-up local expected visibility comparison: the same diagnostic now renders
the local payload HTML/CSS in a Roll20 wrapper and compares the captured
actual-visible panel selector set. Latest fixture-B rerun reports local
Sandbox expected panel visibility matches the actual sampled panel set `9/9`.
This narrows this fixture's remaining mismatch toward geometry/assets/control
styling; cross-fixture state re-verification is still required before broad
claims.
Follow-up sampled panel height delta update: the diagnostic now also reports
local-vs-actual heights for the same sampled visible panels. Latest fixture-B
lightweight-wrapper sample highlights `.sheet-section-competences` (+496.872px)
and `.sheet-skills` (+496.272px) as the largest local-over-actual panel deltas.
Treat these as geometry triage clues only; the full-root candidate smoke remains
the stronger renderer signal before CSS changes.
Follow-up renderer action gate: `corepack pnpm run gate:roll20-renderer-action --
reports\roll20-actual-compare\2026-06-18-state-map-v1` now consolidates actual
status, full-root candidates, state visibility, and geometry diagnostics. Latest
recommendation is `HOLD_PRODUCTION_RENDERER_PATCH` because fixture-A lacks trusted
root evidence, all Roll20 chat screenshots are missing, only 2/3 fixtures have
full-root candidates, and the best diagnostic patch is not uniform across
fixtures. Diagnostic CSS candidates must remain out of production until these
blockers are cleared.

| Status | Priority | Requirement | Current Evidence | Next Action |
| --- | ---: | --- | --- | --- |
| VERIFY | P0 | Shared preview/edit render path. | The visible product surface is one persistent Roll20 iframe mounted by `PreviewMain`; `EditorShell` places that same pane over the edit canvas while `EditCanvas` owns only toolbar/layer chrome and an `aria-hidden` empty slot. `smoke:persistent-preview-surface` passes modern and legacy with one iframe, zero reloads, preserved runtime/input state, and stable iframe identity through preview/edit/zoom/roll flows. `smoke:large-workspace-browser` additionally passes edit mode with 5,200 model blocks, 20 virtual layer rows, one iframe, and zero retired Shadow edit hosts. Serializer-level Shadow parts remain test-only compatibility coverage, not a second visible product surface. The latest synthetic preview/edit run is pixel-exact at `0%` mismatch in both modes. | Fix remaining fixture-specific visual differences when a user-provided ignored fixture is available, then compare against actual Roll20 sandbox/test-room output before marking DONE. |
| VERIFY | P0 | Computed CSS cascade leak report. | Standalone `buildSheetDoc` report (`reports/cascade-leak/cascade-leak-results.md`) and live static app Shadow DOM report (`reports/live-shadow-cascade/live-shadow-cascade-results.md`) both found 0 app-like final winners in sampled visible sheet elements across 3 fixtures. `preview_edit_visual_smoke` now reports 0 resource issues for the local preview/edit screenshot path after iframe referrer policy alignment. Asset URL reachability audit also PASS for fixture-A, fixture-B, and fixture-C 1BU source/payload refs with 0 failed HTTP probes and 0 missing local relative refs. | Keep as VERIFY until actual Roll20 sandbox/test-room screenshots prove whether Roll20 itself loads the same assets and visual state. |
| DOING | P0 | Actual Roll20 visual comparison. | Local baseline and pre-upload gate pass for the latest state-map run: `corepack pnpm run verify:roll20-preupload -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --fixtures test-fixtures\visual --out-dir ./out --base-path /roll20-block-editor --state-map reports\visual-state-candidates\visual-state-candidates-state-map.json`. Chrome reached the dedicated Custom Sheet Sandbox. The file chooser path remains unreliable, and endpoint `200` responses are now treated as storage-only unless fresh iframe DOM/root evidence confirms activation. `scripts/roll20_actual_status.mjs`, `scripts/roll20_actual_screenshot_diff.mjs`, and `scripts/roll20_upload_handoff.mjs` now report fallback viewport-only evidence as `SUSPECT`; status/handoff also separate chat DOM evidence from `roll20-chat.png`. Latest handoff rerun reports fixture-A `SUSPECT + needs generated actual`, fixture-B `chat-dom-only`, and fixture-C missing chat screenshot. Latest diff rerun reports fixture-A `SUSPECT`, fixture-B sandbox mismatch `6.57%`, fixture-C sandbox mismatch `22.93%`, and all room/chat targets `SKIP`. Current status is `PARTIAL_GENERATED_ACTUAL_SCREENSHOTS`, `generatedActualScreenshots=2/6`, `generatedDiffed=2/6`, `roomObservationScreenshots=0/3`, and `roomObservationDiffed=0/3`. fixture-B and fixture-C have DPR-corrected full-root evidence; fixture-A is SUSPECT and all Roll20 chat screenshots are missing. This is partial actual evidence, not visual parity. | Unblock the Roll20 file-input/full settings activation path, recapture fixture-A with positive DOM/root evidence, add trustworthy Roll20 chat screenshots, then compare actual vs local Sandbox expected geometry before production renderer CSS changes. Room View Check remains observation-only. |
| VERIFY | P0 | Actual Roll20 sandbox sanitize/prefix contract. | Chrome observation of the dedicated Roll20 sandbox settings page found `customcharsheet_json` on the visible settings surface and script references for `customcharsheet_layout`, `customcharsheet_style`, and `#customsheet-preview iframe -> #root`. Added dedicated `lib/emit/roll20SandboxSanitize.ts`, separate from `sanitizeForRoll20Legacy`, and `corepack pnpm run test:roll20-sandbox-sanitize` covers selector prefixing, URL proxy/drop behavior, unsafe CSS rejection, HTML allow-list handling, class prefix exceptions, runtime stripping, and HTML URL handling. Added `scripts/roll20_sandbox_sanitize_audit.mjs` and wired it into `verify:roll20-preupload`; latest state-map run PASS reports all three payloads would be rewritten by the observed Roll20 sandbox rules but not fatally rejected. The export dialog exposes the same expected-transform diagnostic as a pre-upload panel without changing the zip payload. The regular preview UI no longer exposes the local `Sandbox 예상` render toggle; `scripts/roll20_sandbox_preview_smoke.mjs` now enables the same diagnostic path through `window.__perfHook.setRoll20SandboxSanitize(true)` so verification remains available without confusing the product surface. Browser smoke PASS: `corepack pnpm run smoke:roll20-sandbox-preview -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --fixture fixture-B --report-dir reports/roll20-sandbox-preview-smoke --port 4331`; normal preview `colgroup=6`, `rolltemplate=3`, `sourceWorkerScript=1`; Sandbox expected preview `colgroup=0`, `rolltemplate=0`, `sourceWorkerScript=0`; console/page errors 0. See `docs/spec/30_roll20_actual_sandbox_contract.md`. | Compare against Roll20 sandbox screenshots once upload is unblocked. Keep this as local expected-render evidence, not visual parity. |
| VERIFY | P0 | All prepared fixtures pass local Roll20 Sandbox expected-render smoke. | `scripts/roll20_sandbox_preview_smoke.mjs` now supports `--all` and the package script `smoke:roll20-sandbox-preview:all`. Latest run: `corepack pnpm run smoke:roll20-sandbox-preview:all -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/roll20-sandbox-preview-smoke --port 4333` PASS/WARN for fixture-A, fixture-B, and fixture-C 1BU. Fixture-level sanitizer render checks passed for all three, Sandbox expected mode removed visible rolltemplate/source-worker runtime nodes to 0, page errors were 0, and console issues were recorded as WARN due to Roll20 image-proxy font CORS plus source sheet numeric-expression warnings. | Keep console/resource WARN classification visible; use `--fail-on-console-issues` when strict console gating is needed. Actual Roll20 screenshots are still required before any visual parity claim. |
| DOING | P0 | Reference-image pixel diff pipeline. | Inventory/render/diff reports exist. `corepack pnpm run diff:visual-fixtures` now captures live local preview screenshots before diffing and applies `reports/visual-state-candidates/visual-state-candidates-state-map.json` when present. Latest diagnostics: fixture-A applies a discovered radio/control state (`attr_class=Hardholder`) and reports 16.23% best mismatch with 9.71% crop gain; fixture-B applies `act_fullsheet` and reports 8.84% best mismatch with 5.96% crop gain, replacing the stale default-state 13.51% comparison. 0 console/page errors. `scripts/classify_visual_fixture_diffs.mjs` now detects when the state-map hint is already reflected in the current diff and classifies both fixture-A and fixture-B as `reference/capture context mismatch` instead of asking agents to re-run the same state hint. Local preview/edit screenshot path records 0 resource issues for the 3 prepared fixtures; source/payload asset URL audit records 0 failed HTTP probes and 0 missing local refs. | Normalize reference/capture crop/context or collect actual Roll20 screenshot before renderer CSS changes; expand fixture set; compare Roll20 sandbox asset loading once actual upload is unblocked. |
| VERIFY | P1 | Legacy mode verification. | Auto-prefix and legacy CSS sanitize are separated in reports. Export-level synthetic audit checks `sanitizeForRoll20Legacy` behavior and verifies `ExportDialog` only routes CSS through it when legacy mode is enabled: `reports/legacy-export-audit/legacy-export-audit-results.md`. Preview/edit render-path smoke checks `buildSheetDoc` and `buildSheetParts` consume `legacyCssSanitize` consistently, and the preview toolbar exposes a local `구버전 CSS` toggle: `reports/legacy-preview-smoke/legacy-preview-smoke-results.md`. Imported-fixture visual smoke now captures local preview screenshots with legacy mode off/on: `reports/legacy-fixture-visual/legacy-fixture-visual-results.md` PASS for fixture-A, fixture-B, and fixture-C 1BU; fixture-B reduced legacy-risk CSS `1 -> 0`, while the other two fixtures were `no-risk-css`. This is still not actual Roll20 legacy visual parity. | Verify legacy payload behavior in Roll20 Custom Sheet Sandbox or a new test room after Chrome upload is enabled. |

## Import/Export and Runtime

| Status | Priority | Requirement | Current Evidence | Next Action |
| --- | ---: | --- | --- | --- |
| VERIFY | P0 | L2 browser roundtrip. | Historical runs recorded 3/3 anonymous prepared fixtures, but the current worktree intentionally has no `test-fixtures/visual` source-derived folder. The latest reproducible run is synthetic-only: `synthetic-generic-elements` and `synthetic-nonleaf-flow` passed canonical iframe edit sync and re-import stability. No real or derived sheet is committed or seeded. | Re-run the same gate only after the user supplies a local ignored fixture; keep synthetic coverage as the copyright-safe baseline. |
| VERIFY | P1 | Large-workspace block navigation without SVG freeze. | `components/editor/HeadlessBlockBrowser.tsx` keeps workspaces above 5,000 blocks model-backed and virtualizes the visible hierarchy. `corepack pnpm run smoke:large-workspace-browser` passes with an anonymous 5,200-input plus nested-frame import: 5,205 model blocks, `headless-large`, 17 structure rows, authored-value search, one selected structure row, then edit mode with 20 virtual layer rows, one persistent iframe, zero SVG blocks, zero retired Shadow hosts, a real layer-panel `inside` reparenting mutation, matching export/iframe nesting, and 0 console/page errors. | Broaden imported DOM-shape coverage, then verify the same behavior against actual modern Sandbox and isolated legacy-room evidence; this is not universal imported-sheet support. |
| DONE | P0 | Roll20 mapping fidelity for the real user sheet. | `reports/mapping-fidelity/mapping-fidelity-fixture-c.md`: every Roll20-meaningful token category (attr names, inputs, roll buttons name+value, data-i18n, placeholders, disabled, translation keys, CSS selectors) is now an exact multiset match for fixture-C 1부; 10 import/emit defects fixed. | Extend the same token audit to fixture-A/fixture-B raw-fallback regions and to export(.zip) output. |
| VERIFY | P0 | Worker JS separate workspace. | First slice is implemented and source-audited: imported sheet worker bodies are kept in a separate `worker` Blockly workspace, nested/raw worker scripts are removed from visual HTML, and final emit appends one Roll20 worker script without duplicate leakage. Evidence: `corepack pnpm run audit:worker -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/worker-source-audit` PASS with exact worker body preservation for fixture-A, fixture-B, and fixture-C 1BU; `corepack pnpm run smoke:worker`, `scripts/browser_roundtrip_smoke.mjs`, and `scripts/imported_edit_sync_smoke.mjs` also PASS on 2026-06-18. Roundtrip block counts are diagnostic because multiple source worker scripts can be canonicalized into one emitted worker script. | Expand worker source audits beyond the 3 prepared fixtures, then verify worker runtime behavior in Roll20 Custom Sheet Sandbox/test room. |
| VERIFY | P1 | Rolltemplate/chat rendering. | `scripts/rolltemplate_chat_smoke.mjs` verifies local preview iframe roll button -> ChatPane card rendering. It clears chat per fixture and checks 1 card, 280px rolltemplate width, no app-only `rolltemplate:name` debug label, and Roll20-like shell classes (`textchatcontainer`, `message`, `spacer`, `by`, `tstamp`). fixture-A, fixture-B, and fixture-C PASS with real user-click after `r20_hidden_input` class preservation restored fixture-B tab/default-state CSS selectors. `components/editor/ChatPane.tsx` copy is now readable Korean instead of mojibake. `corepack pnpm run smoke:worker-state` also verifies duplicate `attr_*` checkbox mirroring so user-clicked visible controls update hidden CSS `:checked` anchors. Latest actual status/handoff now classifies fixture-B as `chat-dom-only` and fixture-A/fixture-C as missing `roll20-chat.png`; this is not actual Roll20 chat visual parity. | Capture trustworthy Roll20 chat screenshots, ideally with DOM sidecar evidence tying the screenshot to rendered rolltemplate/message markers. |
| DONE | P0 | Guard default-state CSS selector anchors across export payloads. | `scripts/roll20_state_selector_audit.mjs` audits hidden/value/checked CSS state selectors against fixture source controls and generated Roll20 payload controls. Latest local run PASS for fixture-A, fixture-B, and fixture-C 1BU using `reports/roll20-actual-compare/2026-06-18-pseudo-fix-v1`: fixture-A/fixture-B had no missing source or payload anchors; fixture-C had 7 source-only dead/worker-driven selector anchors but 0 new payload regressions. | Keep this audit in the pre-Roll20-upload verification set and expand it with broader fixtures when the corpus set grows. |

## Edit Mode UX

| Status | Priority | Requirement | Current Evidence | Next Action |
| --- | ---: | --- | --- | --- |
| VERIFY | P0 | Edit mode is real preview plus overlays. | Edit mode now uses the same persistent iframe as preview; `EditCanvas` contributes only toolbar/layer chrome and an aria-hidden slot. Latest synthetic `smoke:preview-edit-visual:synthetic` is pixel-exact at `0%` mismatch in modern and legacy, and canonical imported-edit sync passes for two neutral synthetic structures. Historical source-derived fixture evidence remains non-current because the ignored fixture folder is absent. | Re-run with a user-provided ignored fixture, then compare against actual Roll20 sandbox/test-room output before DONE. |
| DONE | P1 | Flow-aware gallery drop and existing-object drag smoke. | Browser smoke PASS with real dragover/drop DragEvents: background drop -> absolute, container drop -> flow nesting without `position:absolute`; existing section mouse drag updates computed position and emitted CSS rule to the same coordinates. Imported real-fixture object movement and imported canvas flow insertion are now covered by `reports/imported-edit-sync/` for 3 fixtures. | Expand imported fixture coverage and add richer real-user screenshot evidence. |
| DONE | P1 | Droppable container affordances. | Real drag/drop + screenshots captured: dropped section exposes `data-r20-layer-role="frame"`, `data-r20-can-drop="1"`; dragover onto the section exposes `hostDropMode=inside` and active target `data-r20-drop-mode="inside"`; nested input visible in `c2-input-nested.png` and in the layer panel. | Add richer before/after canvas insertion lines for sibling placement. |
| VERIFY | P1 | Before/after/inside drop zones. | Layer panel row dragover now separates top/middle/bottom into `before`, `inside`, and `after`; canvas widget dragover marks active container `inside` and leaf sibling targets as `before`/`after`; adapter has top-level `moveBlockBefore`/`moveBlockAfter`, nested `after` insertion can splice between an existing target and its next sibling, `inside` uses container nesting, and children inside a Blockly statement chain can reorder before/after siblings. Layer rows now visibly show role labels, `담기 가능` for containers, default placement mode (`흐름` / `자유`), and Korean drop badges. `scripts/edit_flow_browser_smoke.mjs` verifies row modes, layer role/drop affordance attributes/text, canvas inside/before/after indicators, nested input reorder, canvas insertion of new inputs before/after an existing nested input, and synthetic non-leaf group reordering where a group with a connected next sibling moves after its sibling while child inputs remain inside their original groups in emitted HTML. `scripts/imported_edit_sync_smoke.mjs` verifies imported canvas insertion for 3 fixtures and imported layer reorder for fixture-B when a safe leaf pair exists. | Add imported-sheet non-leaf subtree reorder coverage and broader fixture coverage. |
| VERIFY | P1 | Absolute positioning inside frames/groups. | Drag commit supports containing block measurement and relative parent fallback. The edit toolbar now exposes flow/free placement modes. `scripts/edit_flow_browser_smoke.mjs` verifies both a synthetic frame child drag with managed design CSS and a free-mode gallery drop into a frame. `scripts/imported_edit_sync_smoke.mjs` now also verifies the 3 prepared ignored fixtures: a free-mode widget drop becomes nested absolute content inside an imported frame/flow target, with parent `relative`, child `absolute`, and emitted/computed left/top matching. | Capture richer UX screenshot evidence and compare against actual Roll20 sandbox/test-room output before marking DONE. |

## Branching and Deployment

| Status | Priority | Requirement | Current Evidence | Next Action |
| --- | ---: | --- | --- | --- |
| DONE | P0 | Verify latest production deploy. | Pages 200; latest Actions run for `37c1090` succeeded. | Record each future deploy after push. |
| DONE | P0 | Create `dev` branch and CI. | `dev` was pushed to origin; `main` CI, `dev` CI, and Pages deploy passed when checked on 2026-06-12. | Use `dev` for pre-merge integration work and recheck Actions after each push. |
| TODO | P1 | Separate public test page. | GitHub Pages is currently production only. | Choose Vercel/Netlify, second Pages repo, or same-site `/dev/`. |

## User-Facing UI Clarity

| Status | Priority | Requirement | Current Evidence | Next Action |
| --- | ---: | --- | --- | --- |
| VERIFY | P1 | Remove confusing app UI chrome and broken text from core flows. | Header, empty preview state, and export dialog now use readable Korean copy. Public sample UI is hidden when `EXAMPLES` is empty, matching the copyright rule that real sheet samples must not ship publicly. `corepack pnpm run smoke:export-dialog -- --out-dir ./out --base-path /roll20-block-editor --report-dir reports/export-dialog-smoke --port 4326` PASS confirms header/empty-state text, no sample UI in the empty public catalog state, no mojibake in initial shell or export dialog text, export readiness, `실제 검증 필요` badge, Roll20 Sandbox expected-transform diagnostics with 4 rows, legacy toggle copy, local-vs-actual verification warning copy, import dialog opening, and edit tab selection with 0 console/page errors. Imported-fixture mode also PASS on port 4325 and confirms the same export copy/diagnostics after a real fixture import. | Continue auditing remaining editor panels/dialogs for mojibake or translation-style labels; do not claim full UI copy cleanup yet. |

## 2026-06-19 Roll20 Browser Recheck Gap Note

- Dedicated Roll20 editor/settings tabs were reclaimed for Custom Sheet Sandbox verification only; no existing room was modified.
- The sandbox settings page still held the fixture-C `customcharsheet_json` manifest, so fixture-A is not currently proven as the loaded generated sheet.
- fixture-A upload through the visible `Sheet Sandbox Tools` HTML file chooser still failed with Chrome `Not allowed`; the file-input/full-activation blocker remains.
- An initial `roll20-chat.png` capture used uncorrected CSS clip coordinates and captured the sandbox tools dialog. That bad local PNG was removed.
- A DPR-corrected chat capture showed the Roll20 chat panel, but only default chat tips/invite text, not a rolltemplate card.
- fixture-B `roll20-chat-dom-evidence.json` was refreshed from the current DOM and now records 5 messages and 0 rolltemplates.
- Latest actual status remains `PARTIAL_GENERATED_ACTUAL_SCREENSHOTS`, `generatedActualScreenshots=2/6`, `generatedDiffed=2/6`; Roll20 chat visual evidence is still missing.

## 2026-06-19 Chat Evidence Gate Gap Note

- Hardened `scripts/roll20_actual_status.mjs`, `scripts/roll20_actual_screenshot_diff.mjs`, and `scripts/roll20_upload_handoff.mjs` so `roll20-chat.png` is not trusted by itself.
- Chat evidence now requires a `roll20-chat-dom-evidence.json` sidecar with rendered rolltemplate markers.
- The chat PNG and DOM sidecar must be fresh relative to each other; stale pairs are reported as suspect instead of proof.
- Temporary regression check copied a local PNG into the fixture-B chat target while the current sidecar had 0 rolltemplates. Status stayed `generatedActualScreenshots=2/6`, and screenshot diff reported fixture-B chat `SUSPECT`. The temporary PNG was removed.
- Current actual status remains `PARTIAL_GENERATED_ACTUAL_SCREENSHOTS`; no Roll20 chat visual parity claim is allowed.

## 2026-06-19 Export Dialog Evidence-Boundary Gap Note

- User-facing upload readiness is now clearer: local zip file presence, Chrome/Codex upload permission, and actual Roll20 screenshot comparison are separate states.
- Smoke coverage now fails if the export dialog stops warning that file chooser blocking needs file URL access or if it implies zip download proves Roll20 rendering.
- This closes a UI-truthfulness gap only. The actual Roll20 visual comparison gap remains open: current status is still partial generated actual evidence, fixture-A is still suspect, and Roll20 chat visual evidence is still missing.

## 2026-06-19 Sandbox Upload Snippet Gap Note

- Added a safer fallback path for the Chrome file chooser blocker: a generated Sandbox-only snippet can create in-page `File` objects from the already verified local-baseline payload.
- The gap remains open until the snippet or normal file chooser is actually run in Roll20 and produces fresh iframe/root/chat evidence. Endpoint success, snippet generation, or handoff files are not rendering proof.

## 2026-06-19 fixture-A Actual Roll20 Render Evidence Gap Note

- The fixture-A generated sheet is no longer only endpoint/storage evidence: the dedicated Roll20 Custom Sheet Sandbox character sheet tab visibly rendered fixture-A controls (`Angel`, `Battlebabe`, `Brainer`, `Child-Thing`, `Chopper`, `Driver`, `Faceless`, `GunLugger`, `Hardholder`).
- A trusted fallback screenshot now has positive DOM sidecar evidence at `reports/roll20-actual-compare/2026-06-18-state-map-v1/local-baseline/fixture-A/screenshots/roll20-sandbox-dom-evidence.json`.
- Latest diff/status evidence: fixture-A sandbox mismatch `14.01%`; total generated actual screenshots `3/6`; total generated diffs `3/6`.
- Remaining gap: no fixture has trustworthy Roll20 chat/rolltemplate screenshot evidence, fixture-A has no full-root candidate evidence yet, and production renderer CSS remains gated by `HOLD_PRODUCTION_RENDERER_PATCH`.
## Current Evidence Refresh - 2026-07-29

The latest local acceptance slice covers direct pointer flow movement on the
persistent preview/edit iframe: immediate visual reorder, optimistic rollback
count, emitted order, layer parent/previous relation, and authoritative iframe
order after live patch. The slice is local synthetic evidence and must not be
read as universal import coverage or actual Roll20 parity.

The actual Roll20 track remains `VERIFY`: Custom Sheet Sandbox modern evidence
and a dedicated legacy-enabled test-room comparison require a supported CDP
session. Existing rooms remain observation-only and are eligible only after a
fresh visible participant count of exactly one; no existing room was used in
this batch.
## Local Direct-Manipulation Follow-up - 2026-07-29

The persistent iframe acceptance path now covers both flow extraction and
parent-relative free placement on a synthetic nested structure. This narrows
the local UX gap but does not close universal imported DOM support or actual
Roll20 modern/legacy parity. Those remain `VERIFY` until imported cases and
isolated external destinations produce matching evidence.

## 2026-07-30 Structural Drop Reconciliation

The iframe drop resolver now validates the incoming widget/block type against
the target container before advertising an inside or adjacent insertion. This
keeps table, section, row, cell, and list constraints consistent for new
objects as well as existing moved blocks. The contract is covered by focused
tests and the full local verification gate; it remains local evidence and does
not close the external Roll20 parity rows above.

## 2026-07-30 Latest Evidence Reconciliation

- `VERIFIED LOCAL`: persistent preview/edit surface, strict imported-edit
  synchronization, fresh-sheet creation, edit-flow drag/reparent, 5,200-item
  layer navigation, and the modern/legacy synthetic visual comparison all
  passed. The synthetic visual comparison measured `0%` mismatch and i18n
  `1/1` in both local modes.
- `VERIFIED SAFETY`: the public example registry remains empty; the evidence
  guard found no tracked private fixture, report, or public example, and the UI
  copy guard passed.
- `VERIFY / BLOCKED EXTERNAL`: the isolated Sandbox tab reconnected and its
  three file inputs were visible, but the supported chooser did not emit after
  the HTML control click. No current-payload hash was attached and no fresh
  Roll20 screenshot was accepted. Modern Sandbox and dedicated legacy-room
  visual parity remain open; do not promote local synthetic results to L4.

## 2026-07-30 Worker coverage reconciliation

- `VERIFIED LOCAL`: the synthetic fixture now exercises one generic
  `text/worker` event; source-to-emitted worker comparison is exact
  (`scripts=1`, `workerBlocks=1`, `exact=yes`). Its manifest also makes the
  state-selector audit non-vacuous.
- `VERIFY / OPEN`: worker parser/source preservation is not worker runtime
  parity. Imported arbitrary worker APIs, Roll20-side execution order, and
  external modern/legacy screenshots remain unverified.

## 2026-07-30 External file handoff boundary

- `MEASURED EXTERNAL`: modern Sandbox and the separate legacy observation tab
  each retained a fresh visible participant count of exactly one.
- `VERIFY / BLOCKED EXTERNAL`: the available browser surface cannot select or
  construct files in the Roll20 page (`setInputFiles`, `File`, `Blob`, and
  `DataTransfer` are unavailable). No current payload hash, screenshot, or
  settings write was accepted as evidence.

## 2026-07-30 Worker control-flow coverage

- `VERIFIED LOCAL`: `if`, `else`, and `else if` now roundtrip through the
  worker block model and generator. The Blockly `ELSE` socket is optional at
  emit time, so existing no-else workers retain their output shape.
- `VERIFY / OPEN`: this covers one structured control-flow family only. It
  does not establish full worker JS coverage, execution parity, or Roll20
  screenshot parity.

## 2026-07-30 Worker expression coverage

- `VERIFIED LOCAL`: unary `!value` and nested `!!value` expressions map to a
  dedicated boolean reporter and emit canonical worker syntax. Strict
  inequality remains a comparison block.
- `MEASURED LOCAL`: parser `30/30`, high-priority mapping `24/24`, full
  `ci:verify`, lint/build, and the synthetic modern/legacy preview/edit smoke
  all pass.
- `VERIFY / OPEN`: worker coverage remains bounded; arbitrary APIs,
  execution order, and external Roll20 same-hash visual evidence remain open.

## 2026-07-30 Native chooser capability retry

- `MEASURED EXTERNAL`: modern Sandbox controls and a one-member preflight were
  visible before the handoff attempt; the anonymous payload files were present
  locally with recorded hashes.
- `VERIFY / BLOCKED EXTERNAL`: the browser file-chooser event did not emit and
  the direct input click timed out. No payload hash was bound to Roll20 and no
  screenshot or settings write is accepted as evidence.
- `NEXT P0`: use a responsive supported chooser/CDP file-input path, then run
  modern Sandbox and dedicated legacy-room checks independently.

## 2026-07-30 Modern rendered-state observation

- `OBSERVED EXTERNAL`: the modern Sandbox showed the anonymous proof sheet in
  its Roll20 iframe, including tabs, a textbox, a Roll control, and a measured
  `900 x 432.6875` iframe surface. A new default-template chat result appeared
  after one Roll click.
- `VERIFY / OPEN`: the three input controls were empty, so no current-payload
  hash is bound to this rendered state. Missing-template and extension
  message-channel diagnostics were also observed.
- `VERIFY / BLOCKED EXTERNAL`: the legacy read-only participant preflight timed
  out; no fresh legacy evidence is counted.

## 2026-07-30 Visible chooser retry

- `MEASURED EXTERNAL`: closing the character viewer exposed the dedicated
  Sandbox Tools file controls.
- `PARTIAL EXTERNAL`: HTML selection succeeded and reloaded the Sandbox, but
  CSS selection returned `Not allowed` twice; translation was not selected.
- `VERIFY / OPEN`: all-three-file same-hash binding, normalized screenshot
  parity, and independent legacy evidence remain unproven.

## 2026-07-30 ASCII-path chooser retry

- `PARTIAL EXTERNAL`: CSS selection succeeded from an ASCII-only temporary
  path after the HTML reload.
- `VERIFY / OPEN`: translation selection timed out; all-three-file binding,
  same-hash identity, modern normalized parity, and legacy evidence remain
  unproven.

## 2026-07-30 Local editor verification update

- `VERIFIED LOCAL`: the generic-container visibility fix passed production
  build and remote CI `30553196837`. Strict imported edit sync, fresh-sheet,
  edit-flow, and 5,200-item layer/reparenting browser smokes pass.
- `MEASURED LOCAL`: the large workspace retains one persistent iframe and
  produces nested preview DOM after an inside drop, with zero console/page
  errors.
- `VERIFY / BLOCKED EXTERNAL`: current Roll20 payload identity, modern
  normalized screenshot parity, and independent legacy-room evidence remain
  unproven because the available browser surface rejects local file binding.
## Latest Generic Layout Comparison Coverage - 2026-07-31

- FIXED LOCAL: `roll20_computed_style_context_diagnostics.mjs` now compares
  every generic layout selector captured by the sheet-frame probe, including
  table sections/cells, select controls, and Roll buttons.
- VERIFIED LOCAL: The anonymous geometry self-test covers the expanded selector
  set and passes through `ci:verify`.
- NOT PROVEN: The actual Roll20 sidecar still needs a fresh generic payload in
  the modern Sandbox and separate legacy destination. No renderer CSS change
  is justified by this local diagnostic patch alone.

## Actual Geometry Gate - 2026-07-31

- VERIFIED: `roll20_actual_geometry_gate.mjs` now keeps iframe, wrapper,
  sheet-root, authored-canvas, and normalized-crop evidence separate.
- VERIFIED: Dedicated modern and legacy anonymous sidecars both pass the
  generation-specific row/column display contract, authored `760x320` canvas,
  required controls/table markers, chat markers, and exactly-one participant
  preflight.
- MEASURED / VERIFY: Both live roots are `852px` wide versus local `850px`,
  so wrapper context is still a two-pixel delta and not a parity pass.
- OPEN: normalized crop and same-payload attachment readback are still missing;
  worker mutation remains unverified when a worker-bearing payload is used.

## Worker Runtime Handoff - 2026-07-31

- VERIFIED LOCAL: worker source preservation remains covered by the anonymous
  local fixture and is separate from visual render evidence.
- VERIFY / BLOCKED EXTERNAL: the dedicated modern Sandbox file-input surface
  rejected the supported browser handoff as `unsupported-browser-primitive`.
  No worker payload was accepted or activated, so no live mutation claim is
  recorded.
- PRESERVED: the dedicated legacy destination was not changed after the modern
  handoff failed; no ordinary room was used.

## Worker State Reentrancy - 2026-07-31

- `FIXED LOCAL`: `setAttrs()` dispatch now uses changed-value detection and a
  bounded event queue, preventing same-value `change:` loops while preserving
  CSS-visible property/attribute synchronization.
- `VERIFIED LOCAL`: build-doc contract, worker-parser, production build, and
  browser worker-state smoke passed with zero queue overflows and zero browser
  or page errors.
- `VERIFY / BLOCKED EXTERNAL`: the fix has not been promoted to actual Roll20
  worker parity because the supported modern Sandbox file handoff still rejects
  the local payload before activation. No legacy destination was modified.

## Upload Byte Identity Guard - 2026-07-31

- `IMPLEMENTED / VERIFIED LOCAL`: `roll20_upload_snippet.mjs` now compares the
  locally expected SHA-256 with both decoded payload bytes and the browser
  `File.arrayBuffer()` result before dispatch. Mismatch blocks the upload and
  endpoint fallback; unavailable Web Crypto is reported explicitly.
- `IMPLEMENTED / VERIFIED LOCAL`: resumable page reloads retain only per-file
  hash metadata in session storage and require all three current-payload files
  to be `match` before activation can be promoted beyond
  `UPLOAD_FILE_HASH_NOT_PROVEN`.
- `VERIFIED LOCAL`: upload-file, fidelity, provenance, CDP-helper, snippet
  self-tests, lint, build, and `ci:verify` pass.
- `NOT PROVEN EXTERNAL`: no live Sandbox run has yet produced a `fileHashStatus:
  match` result or same-payload Roll20 screenshot. This guard strengthens the
  evidence boundary but does not itself prove Roll20 persistence or rendering.

## Chrome Handoff Retry - 2026-07-31

- `MEASURED EXTERNAL`: the logged-in Chrome session listed the dedicated
  modern and legacy verification tabs at the expected Roll20 editor URL.
- `VERIFY / BLOCKED EXTERNAL`: claiming the dedicated modern tab timed out
  before any browser action. No upload, settings write, screenshot, or room
  mutation occurred; ordinary rooms remained untouched.
- `OPEN`: the new byte-identity guard has not yet produced live
  `fileHashStatus: match` evidence.

## Modern Sandbox Roundtrip - 2026-07-31

- `VERIFIED EXTERNAL`: the dedicated modern Sandbox received all three
  anonymous payload files through Roll20's visible HTML/CSS/Translation file
  controls; expected, decoded-source, and browser `File` SHA-256 values match
  for HTML, CSS, and translation.
- `VERIFIED EXTERNAL`: the actual character iframe contains the translated
  label, named input, and roll control from that payload under Roll20's dialog
  wrapper. This is same-payload activation evidence for the modern Sandbox.
- `VERIFIED EXTERNAL`: the roll control produced a `Sandbox proof` default
  rolltemplate row in the dedicated Sandbox chat.
- `PARTIAL`: one anonymous modern roundtrip is verified. Screenshot crop
  normalization, computed-style sidecar parity, worker mutation parity,
  broad source coverage, and independent legacy same-payload verification
  remain open.
- `SAFETY`: no ordinary room was edited; the dedicated Sandbox showed exactly
  one visible member. Local evidence remains ignored and public docs contain
  no sheet source or screenshot.

## Import Dialog Viewport Recheck - 2026-07-31

- `FIXED LOCAL`: the import dialog is height-bounded and internally
  scrollable, preventing the conversion action from leaving the viewport on
  long tab content.
- `VERIFIED LOCAL`: the real pointer-click import smoke passed with three
  HTML blocks, persistent iframe retention, page/worker separation, hidden
  runtime nodes, and zero browser/page errors.
- `VERIFY / BLOCKED EXTERNAL`: the dedicated Chrome tab list is readable, but
  claiming the Sandbox times out and no new upload or live screenshot was
  produced. This does not expand the prior live-evidence scope.

## Actual Roll20 Gate Status Refresh - 2026-07-31

- `MEASURED`: the authoritative local status command currently reports
  generated screenshots `0/4`, generated diffs `0/4`, `rendererReady=NO`,
  `chatParity=MISSING`, and current chat metrics `0/2`.
- `VERIFIED`: Chrome, its selected-profile extension, and the native host
  manifest are healthy according to the packaged checks.
- `VERIFY / BLOCKED EXTERNAL`: the dedicated tab control path still times out;
  no new upload, screenshot, or external mutation was produced.

## Persistent Surface And Scale Refresh - 2026-07-31

- `FIXED LOCAL`: the persistent-surface browser contract now recognizes the
  CSS identity matrix emitted by `getComputedStyle()`.
- `VERIFIED LOCAL`: modern and legacy persistent-surface smoke both pass with
  reload count `0`; the large-workspace smoke passes for `5,200` synthetic
  items and `5,205` mapped blocks.
- `OPEN EXTERNAL`: live Roll20 screenshot/diff evidence and independent
  legacy same-payload evidence are still absent from the current gate.

## Latest Dedicated Sandbox Evidence Reconciliation - 2026-07-31

- `VERIFIED EXTERNAL READ-ONLY`: the dedicated modern Sandbox had exactly one
  visible member and its Sheet Sandbox Tools dialog was reachable. No ordinary
  user room was touched.
- `VERIFY / BLOCKED EXTERNAL`: the supported visible chooser reached the HTML
  input, but Chrome rejected `fileChooser.setFiles` with `Not allowed` before
  transmission. No hidden-input or direct endpoint workaround was used.
- `MEASURED`: modern anonymous `fixture-B` has `2/4` generated/diffed targets
  with a `6.90%` sandbox diagnostic mismatch; the separate legacy report has
  `2/4` with `6.73%`. Both classify the mismatch as a clipped Roll20 dialog
  viewport. This is a diagnostic classification, not a CSS or parity pass.
- `OPEN`: `fixture-A` upload/capture, normalized crop/root stitching, and
  same-payload modern/legacy parity remain unproven. Historical `0/4` entries
  above are retained as audit history; the latest current status is the
  partial `2/4` evidence recorded here.
