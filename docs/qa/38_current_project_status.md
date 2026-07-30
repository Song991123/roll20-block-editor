# 38. Current Project Status

Date: 2026-07-31

This is an anonymous handoff snapshot. It contains no real sheet names,
creator names, source URLs, screenshots, private room identifiers, or
source-derived measurements. Private evidence, when needed, stays in ignored
local output and is deleted after the verification batch.

## Current Checkpoint - 2026-07-31

- Active branch: `claude/design-reset` at `3178e16`. The branch is pushed to
  `origin` and the worktree is clean.
- Remote CI: run `30572300989` passed safety/unit verification, lint, and
  build for `3178e16`.
- Static corpus inventory: two protected external roots were read-only scanned;
  the anonymous aggregate contains `1,428` sheet directories and `18,550`
  candidate files. This is inventory evidence only and does not establish
  arbitrary import fidelity or actual Roll20 parity.
- Anonymous local import sample: `8/8` selected inputs passed deterministic
  Node import and structural fingerprint checks at `100%` coverage with zero
  raw fallbacks, template-marker findings, and warnings. This remains sample
  evidence, not all-sheet or actual Roll20 evidence.
- Wider anonymous import sample: `32/32` selections passed deterministic Node
  import and structural fingerprint checks; HTML raw fallback was `0`, while
  CSS raw fallback was `5`. Import UI now reports HTML, CSS, and combined
  structured coverage separately instead of implying that HTML coverage also
  proves CSS coverage.
- Import metric patch: code commit `1b7d0f5` adds HTML/CSS/combined coverage
  and warning totals while preserving the historical HTML `coverage` field.
- Metric recheck for the anonymous 32-selection batch: HTML `100%` for every
  selection, CSS `94.6-100%`, combined structured coverage `97.7-100%`, and
  `50` total warnings. This is local importer evidence only.
- Import UX recheck: CSS fallback blocks now produce an explicit Korean
  warning in the result panel; the browser smoke enters the CSS tab and
  verifies that warning with one persistent iframe and zero browser errors.
- Roll20 external state: the current in-app browser has no attached tab and
  the existing Chrome tab inventory has no Roll20 target, so authenticated
  Sandbox and dedicated legacy-room verification remain open. No credentials
  or external sheet payload were transmitted.
- Local interaction recheck: `smoke:edit-flow`, strict imported-edit sync, and
  persistent preview surface passed; modern and legacy each retained one
  iframe with zero reloads.
- Current renderer boundary: fixture-specific chat renderer policies and CSS
  are removed from the product path. Generic Roll20 policies remain.
- Latest local upload contract: resumable HTML/CSS/Translation handoff with
  page-token retry detection; no source payload is stored in public files.
- External state: the available in-app Roll20 tab is the login screen, so no
  new Sandbox upload, screenshot, room write, or parity evidence exists.
- Latest CDP preflight: `CDP_CLOSED`, `targets=0`, `roll20Targets=0`; no new
  browser process was launched by this verification batch.
- Latest anonymous local regression: L2 roundtrip, large-workspace
  reparenting, modern/legacy preview-edit visual smoke, and synthetic Sandbox
  sanitize preview all passed. This does not promote arbitrary-sheet or
  actual-Roll20 parity.
- Import boundary hardening: unexpanded build-template markers now produce a
  user-facing warning; one self-contained ignored official-tree sample passed
  imported-edit and modern/legacy visual smoke. Template compilation itself is
  intentionally not claimed.
- User-sheet capture count remains `0`; dedicated legacy-room capture count
  remains `0`. Historical anonymous synthetic runtime observations are not
  promoted to current user-sheet parity.
- Cleanup boundary: regenerated workspace-local dependency/build directories
  were rechecked, but the host rejected recursive deletion before execution.
  They remain `NOT DELETED`; no alternate deletion path was used.
- UI copy guard: `corepack pnpm run guard:ui-copy` passes for 67 product-source
  files. The large-workspace browser's Korean copy is source-valid; the earlier
  garbled terminal display was an output-encoding artifact, not a product-file
  regression.
- LOCAL INPUT SMOKE: The large-workspace browser smoke now accepts optional
  local HTML/CSS/i18n paths for one-off ignored verification while keeping the
  anonymous synthetic fixture as the default. This validates local import/edit
  behavior only and does not promote Roll20 parity.

## Current Evidence

- LOCAL EDIT FIX: context-menu mutations now explicitly publish the model and
  flush the persistent preview. Delete, duplicate, and sibling moves provide
  truthful feedback, with duplicated layers selected immediately.
- LOCAL VERIFICATION: lint, production build, `smoke:edit-flow`, and layer
  operation tests passed after the edit-surface patch.

- DEPLOYMENT VERIFIED: `pnpm verify:pages-deploy` reports the public GitHub
  Pages URL as HTTP 200 and matches the latest successful `main` Pages run at
  `98d4b4965be2` (`30399580622`).
- DEPLOYMENT BOUNDARY: the current integration branch is
  `claude/design-reset` at `e34de27`; Pages deploys only `main`, so this
  branch is CI-verified but not publicly deployed.

- LOCAL FIX: `setAttrs(attributes, options)` calls whose options argument is
  not representable by the current visual block now stay intact in the raw
  worker boundary. The focused worker parser suite is `27/27` after this
  guard; this prevents silent loss of Roll20 behavior such as `silent`.

- LOCAL FIX: Worker variable declarations now retain their original `let`,
  `var`, or `const` keyword through the shared declaration block and emit
  path. This avoids a scope-changing `var` to `let` rewrite.

- LOCAL PASS: An anonymous three-file Sandbox payload was regenerated under
  ignored `.tmp/roll20-sandbox-synthetic/`, and full `ci:verify` passed after
  the evidence purge.
- OPERATIONS LIMIT: Standalone payload/sanitize audits need a retained local
  baseline; after purge they fail with missing-input errors until the
  pre-upload orchestrator regenerates one. This is not a Roll20 parity result.
- LOCAL PASS: The latest persistent-preview smoke passed modern and legacy
  modes with zero iframe reloads, and strict imported-edit synchronization
  passed for anonymous structures. The same iframe retained live input/runtime
  state across compatibility changes and edit flow.
- LOCAL PASS: Browser L2 compatibility roundtrip passed for one anonymous
  custom fixture and one anonymous legacy fixture. HTML/CSS/translation/worker
  output remained stable with zero browser console/page errors. The
  source-derived inputs remain only in ignored local evidence because the
  host rejected the guarded cleanup attempt before execution; none is tracked
  or public.
- LOCAL PASS: The latest full `ci:verify`, persistent-preview, fresh-sheet,
  and edit-flow browser gates pass with no project/CDP listener left behind.
- LOCAL PASS: Anonymous synthetic preview/edit rendering is exact in both
  modern and legacy local contracts for the current regression fixture.
- LOCAL PASS: The pre-upload gate passed local baseline generation, payload
  hygiene, Sandbox-sanitize approximation, cleaned-payload roundtrip, state
  selectors, asset checks, and evidence guard.
- LOCAL PASS: The persistent iframe/edit overlay path, worker separation,
  hidden runtime nodes, roll control simulation, structured layer drops, and
  block-gallery and layer-panel drops across the iframe boundary have
  dedicated smoke coverage.
- EXTERNAL PARTIAL: The Roll20 `Sheet Sandbox Tools` dialog was visible and
  the anonymous synthetic HTML/CSS/Translation file events were dispatched.
  Roll20 reported modern runtime, but no visible sheet root, iframe, form,
  attribute, or roll button appeared afterward.
- EXTERNAL BLOCKED: The supported native file chooser timed out and reset the
  browser connection. No Sandbox screenshot or generated-sheet parity diff was
  captured.
- EXTERNAL BLOCKED (latest retry): The connected Sandbox dialog stayed open,
  but the supported chooser returned `Not allowed`; the native screen-level
  attempt did not populate any file input. No sheet root, iframe, or form
  appeared, and no room or chat state was changed.
- EXTERNAL BLOCKED (latest connection retry): Fresh tab discovery found the
  exact isolated Sandbox URL, but claiming that tab timed out before DOM
  inspection. No upload, save, navigation, room, or chat mutation occurred.
- HANDOFF READY: An anonymous synthetic HTML/CSS/translation payload has been
  regenerated in ignored local output for a user-visible Sandbox file choice.
  This is preparation only; the sheet is not yet proven active in Roll20.
- LOCAL PASS: Worker workspace, worker state, and emit-contract smokes were
  rechecked. Page JavaScript remains separate, visible worker nodes stay hidden,
  and the local output keeps one worker script without proving Roll20 runtime.
- LOCAL PASS: The user-facing import dialog now accepts optional page JS or
  worker JS and routes them to separate workspaces. Import-dialog browser smoke
  confirms both workspace paths, the required worker export boundary, zero
  visible runtime nodes in the iframe, and zero browser errors.
- LOCAL FIX: Untyped worker detection ignores strings and comments before its
  API heuristic, with import/emit regression coverage. It is still not a full
  JavaScript parser.
- LEGACY VERIFY OPEN: Legacy output must be checked separately in a dedicated
  legacy-enabled test room. A modern Sandbox result cannot satisfy that gate.

## Status Matrix

| Area | Status | Evidence boundary |
| --- | --- | --- |
| Universal HTML/CSS/translation mapping | VERIFY/PARTIAL | Anonymous custom and legacy compatibility roundtrips now pass locally; arbitrary official/community/custom coverage is not proven. |
| Future JS/worker preservation | VERIFY/PARTIAL | Separate workspace/export and hidden-runtime smokes pass locally; actual Roll20 worker execution is not proven. |
| Modern local preview/edit surface | VERIFY/GOOD_LOCAL | Preview and edit share the persistent iframe surface with an edit-only overlay. |
| Modern Roll20 Sandbox render | VERIFY/PARTIAL | Anonymous Sandbox runtime/root/geometry and real default-template chat evidence exist; pixel parity for arbitrary sheets is unproven. |
| Legacy Roll20 render | VERIFY/PARTIAL | Anonymous dedicated legacy-enabled runtime/root/geometry and real default-template chat evidence exist; pixel parity for arbitrary sheets is unproven. |
| Rolltemplate/chat parity | VERIFY/PARTIAL | One anonymous default template reached real chat in both destinations; template-by-template visual parity remains unproven. |
| Asset loading/relink | VERIFY/PARTIAL | Safety checks and relink guidance exist; user-owned HTTP(S) asset targets are required for real asset-paint comparison. |
| Figma-like edit UX | VERIFY/PARTIAL | Flow/free placement, before/inside/after drops, iframe-crossing gallery/layer-panel drops, layer roles, and canvas controls exist; broad imported-sheet UX still needs polish. |
| Public copyright safety | VERIFY/ONGOING | Real or derived sheets, screenshots, fixtures, and reports are excluded from the public tree. |

## 2026-07-30 Local Mapping Update

The local mapping boundary now preserves authored classes on the generic value
switch wrapper and its case panels, gives manual radio composites an explicit
class field, and keeps chat-template invocation out of the visual layer tree.
This improves the universal path without changing the claim boundary: it is
verified on focused synthetic/import contracts and the shared iframe browser
smokes, not on every external sheet or actual Roll20 Sandbox upload.

The same boundary now covers manual dual-roll and checkbox/state-area
composites with distinct styling surfaces and inspector fields. This is still
local authoring support, not proof that arbitrary imported HTML has been
decomposed into those composites.

The explicit dual-roll composite now also has a narrow importer. It recognizes
only the generator's structural marker plus two direct, attribute-safe Roll20
roll buttons; unsupported attributes intentionally fall back to atomic blocks.
This closes one local import/export preservation gap without expanding the
universal-support claim.

## Goal Progress

These are planning estimates, not completion claims.

| Area | Current estimate | Remaining proof |
| --- | ---: | --- |
| Local edit/drop UX | 68% | More direct-manipulation polish and broader anonymous regression coverage. |
| Local preview/edit synchronization | 70% | More arbitrary DOM structures and asset/state combinations. |
| Actual Roll20 renderer reproduction | 35% | A visible modern Sandbox render and a separate legacy-room render with normalized comparison. |
| Actual Roll20 chat/rolltemplate reproduction | 30% | Current generated-sheet chat/template evidence and scoped visual comparison. |
| Whole user-ready product | 45% | Actual Roll20 gates, broader mapping coverage, asset policy completion, and Figma-like polish. |

## Not Safe To Claim

- Full Roll20 visual parity.
- All official/community/custom sheets are supported.
- Full worker JS or rolltemplate parity.
- Full legacy Roll20 visual parity.
- Edit mode is fully Figma-like for arbitrary imported sheets.

## Next P0

1. Recover a stable visible Sandbox upload path or open a dedicated Sandbox
   character sheet after a user-assisted upload.
2. Capture positive sheet-root, runtime-state, input, roll-control, and chat
   evidence before any parity comparison.
3. Keep legacy verification separate in a dedicated legacy-enabled room.
4. Do not promote global renderer or ChatPane CSS from synthetic/local evidence.
5. Keep every source-derived payload and report local-only, then remove it
   after the verification batch.

## Latest Local Change - 2026-07-30

New block drops now use the same structural container rules as moved blocks.
The editor rejects an invalid widget type before it paints a misleading drop
target, while valid structural rows still expose the expected adjacent drop.
This is verified by focused drop-target tests, `ci:verify`, lint, build, and
server hygiene. Modern Sandbox, legacy-room, and actual Roll20 visual/chat
parity remain unverified.

## Evidence Reconciliation - 2026-07-30

The latest reproducible local evidence is intentionally synthetic-only. The
preview/edit pixel smoke reports `0%` mismatch in modern and legacy modes; the
persistent iframe smoke reports zero reloads in both modes; and canonical
imported-edit sync passes two neutral structures. The current worktree does
not contain `test-fixtures/visual`, so historical source-derived fixture counts
are not current evidence. No source-derived sheet was restored or committed.

## Import UI Integrity - 2026-07-30

`components/editor/ImportDialog.tsx` had corrupted visible Korean strings,
malformed file-input attributes, and broken progress/report template literals.
Those strings and attributes were replaced with readable Korean while retaining
the existing import, worker, CSS, translation, and asset-preflight behavior.
The UI-copy guard was also repaired so it can actually scan product source.

Local evidence: UI-copy guard passed for 66 files; lint passed; import structure
41/41, translation comment 7/7, worker parser 28/28, production build, and the
full `ci:verify` gate passed. This is source/UI integrity evidence only. The
modern Sandbox upload, legacy-room render, and universal Roll20 visual parity
claims remain open.

## Sandbox Handoff Recheck - 2026-07-30

The isolated Roll20 Sandbox was found through the existing Chrome session. The
visible room state showed exactly one member and the Sheet Sandbox Tools dialog
contained the three expected HTML/CSS/Translation inputs. The extension denied
the automated file chooser assignment, so no file was uploaded and no room or
chat state changed. The tab remains a user handoff; actual modern rendering and
legacy-room comparison are still unverified.

## Current External Runtime Update - 2026-07-30

The earlier chooser-blocked entries above are historical attempts. A later
anonymous verification run used the isolated modern Sandbox and a separate
legacy-enabled test room. Both destinations had a fresh visible participant
count of exactly one. Each rendered one iframe and one sheet root with the same
anonymous 420x180 authored root, and each real roll produced a numeric result
in the default template chat. This is positive runtime/geometry/interaction
evidence for one synthetic payload, not a universal or pixel-parity claim.

The local renderer now has a mode-specific legacy surface layer and can switch
modern -> legacy -> modern without replacing the persistent iframe. Local
computed-style verification matches the measured mode distinction, and the
persistent-preview/edit-flow smokes pass. The remaining P0 is normalized
post-fix screenshot comparison and broader anonymous structure/asset coverage.

## Post-fix root comparison - 2026-07-30

The local baseline was rebuilt after the latest renderer bundle rather than
reusing the earlier pre-fix capture. Modern and legacy both passed the local
import/preview/edit/export baseline, and the JSON now records root and label
computed styles. A native-size `420x180` crop comparison against the saved
anonymous external screens measured threshold-20 mismatch of `5.35%` modern
and `6.10%` legacy, with mean channel deltas `2.34` and `3.49`.

This remains `VERIFY/PARTIAL`, not parity: the external button sidecar reports
`margin: 0 3px`, while the current local payload's authored CSS reports
`margin: 12px 3px 0`. The external screenshot is not bound to the current
payload hash, so the difference is currently classified as capture/payload
provenance drift. A fresh same-hash external capture is required before
changing generic Roll20 cascade order. Evidence remains ignored and local-only.

## Same-hash external capture handoff - 2026-07-30

The verification tooling now creates a local-only provenance manifest for the
exact modern/legacy payload pair. In the current anonymous pair, `sheet.html`,
`sheet.css`, and `translation.json` have identical SHA-256 values; only the
mode-specific `sheet.json` manifest differs. Separate modern and legacy upload
snippets were generated from those exact payload directories.

Chrome currently exposes the dedicated Sandbox and legacy verification tabs,
but tab claiming/direct access timed out three times before a fresh
upload/capture. This is an external-tooling blocker, not evidence of parity or
a renderer failure.

## Generic asset-reference coverage - 2026-07-30

The shared export preflight now detects HTML `srcset`/`imagesrcset` candidates,
`poster` and common lazy-load attributes, and URLs inside HTML inline styles.
The regression test passes for external and relative candidates. This improves
the user's ability to find and relink assets before export, but it remains
local analysis only: external URL reachability and actual Roll20 pixel parity
still require a fresh same-hash modern Sandbox and separate legacy-room run.

## Live anonymous Roll20 runtime observation - 2026-07-30

The dedicated modern Sandbox and separate legacy verification room were read
with a fresh visible participant count of exactly one each. Both currently
render an anonymous generated sheet iframe with a `420x180` authored root, one
input, and one Roll button. A modern test roll added a real default-template
chat result. The visible three file inputs still report zero selected files,
so this is positive runtime/root/roll evidence for the currently loaded
anonymous payload only; it is not same-hash binding, screenshot parity, or
universal-sheet evidence.

## Asset preflight UI terminology - 2026-07-30

Import and export now use the same Korean labels for direct HTTPS and Imgur
direct-link candidates. The rebuilt export-dialog browser smoke passed the
asset metrics, relink draft/persistence, mode-toggle, and edit-entry checks
with zero console/page/request failures. This is local UI evidence only and
does not change the external same-hash or pixel-parity status.

## Modern Sandbox chooser retry - 2026-07-30

The dedicated modern Sandbox remained readable with one visible participant,
but both visible/native chooser paths left all three file inputs at
`files.length=0`. No upload or external sheet replacement was confirmed. The
existing anonymous runtime state was preserved, so same-hash payload binding
and pixel parity remain `VERIFY / BLOCKED EXTERNAL`.

## Runtime probe refresh - 2026-07-30

The dedicated modern Sandbox iframe was inspected again without changing the
room. It exposed the anonymous `420x180` sheet root, one `attr_name` input, and
one `roll_check` control. The measured root retained `420px` width, `180px`
height, the authored light-pink background, and the authored border. A button
click added a numeric result to the real default-template chat.

The separate legacy verification room passed a fresh visible participant count
of exactly one and exposed the same root/input/roll shape. A legacy-room button
click also added a numeric default-template result. The explicit legacy
sanitization flag was not readable from the connected frame, and the current
local three-file hash was not freshly attached through the chooser. Therefore
both observations remain positive runtime/interaction evidence only; they do
not promote same-hash, screenshot, or pixel-parity status.

The browser connection then timed out while reattaching the two existing tabs.
No existing room or non-test sheet was modified. The next external gate is a
fresh chooser-bound capture, followed by normalized modern/legacy screenshot
diffs.

## External frame surface metrics - 2026-07-30

`roll20_sheet_frame_probe.mjs` now records anonymous root candidates and
marker-ancestor surface metrics in the local-only sidecar. The metrics include
rect, display/position, box sizing, overflow, background, text color, border,
classes, and tag/id hints. They are intended to make wrapper-versus-authored
surface diagnosis reproducible before a screenshot diff.

The frame-probe self-test, lint, and full `ci:verify` pass. This is a diagnostic
improvement only; the external same-hash chooser binding and pixel comparison
remain open.

## Local render/edit revalidation - 2026-07-30

Current local evidence is green for the shared render surface: persistent
preview/edit, strict imported-edit synchronization, fresh-sheet creation,
edit-flow drag/reparent, and the 5,200-item layer workspace smoke all pass.
The anonymous synthetic visual fixture is pixel-exact in both modern and legacy
local modes (`0%` mismatch, translation `1/1`). The authenticated Roll20
connection timed out during the next targeted read, so the current local files
are still not bound to a fresh Sandbox payload and no external screenshot
parity claim is promoted.

## Sandbox chooser wiring retry - 2026-07-30

The isolated Sandbox tab reconnected and its three upload inputs were each
present and visible. The supported chooser event still did not open when the
HTML control was clicked, so no current-payload hash binding or fresh
external screenshot was accepted. The dedicated modern and legacy tabs remain
handoff-only; no room mutation occurred. Actual Roll20 parity remains
`VERIFY / BLOCKED EXTERNAL` pending a supported file-selection or CDP path.

## Synthetic worker audit coverage - 2026-07-30

The local anonymous fixture now contains one generic worker event and a
manifest. Worker source audit measured one source script, one worker block,
and an exact canonical emitted match. The state-selector audit now exercises
one manifest-backed fixture rather than passing with an empty set. Build,
worker-parser, synthetic preview/edit visual, persistent-preview, and strict
imported-edit-sync checks pass. This is generic local evidence only; actual
Roll20 same-hash and pixel parity remain blocked at the file-selection handoff.

## Browser file handoff capability recheck - 2026-07-30

The dedicated modern Sandbox remained a one-member observation target. Its
three upload inputs were present, but the connected browser wrapper does not
provide a file setter and the page evaluation context does not expose
constructible `File`, `Blob`, or `DataTransfer` objects. No endpoint fallback
or settings save was attempted; all three inputs remained empty. The separate
legacy tab also remained one-member and unchanged. This is a confirmed tooling
boundary, not a renderer success or parity result.

## Worker if/else mapping - 2026-07-30

Worker imports now retain `else` and `else if` as structured branches in the
same `r20_worker_if` block. The Blockly editor exposes the optional ELSE
socket, and the generator omits it when empty. Parser/generator tests, lint,
build, full CI, persistent preview, imported edit sync, and synthetic visual
smokes pass. Full arbitrary worker support and actual Roll20 parity remain
unverified.

## Worker unary-not mapping - 2026-07-30

The worker importer and Blockly catalog now support unary `!value` and nested
negation through `r20_worker_not`, while preserving `!==` as comparison. Parser
and high-priority tests, headless workspace, emit contract, lint, build, full
CI, and synthetic modern/legacy preview/edit smokes pass. This remains bounded
local worker coverage; actual Roll20 same-hash visual parity and full worker
runtime support remain unverified.

## Sandbox file chooser capability retry - 2026-07-30

The modern Sandbox controls and one-member preflight were visible, but the
supported file chooser did not emit and the direct file-input click timed out.
No anonymous payload was attached and no Roll20 state changed. The legacy tab
was not treated as fresh evidence after the browser connection stalled. Actual
same-payload modern and legacy render parity remains `VERIFY / BLOCKED
EXTERNAL`.

## Modern Sandbox rendered-state observation - 2026-07-30

The dedicated modern Sandbox visibly rendered the anonymous proof marker inside
the Roll20 character iframe. The snapshot exposed the Roll20 tabs, `Name`
textbox, and Roll control; one click produced a new default-template chat
result. The iframe measured `900 x 432.6875` CSS pixels. The file inputs were
empty, so this is an external rendered observation rather than same-hash local
payload proof. Missing-template and extension message-channel diagnostics were
present, and the legacy preflight timed out; actual modern/legacy parity remains
`VERIFY / BLOCKED EXTERNAL`.

## Visible Sandbox chooser retry - 2026-07-30

The Sandbox Tools dialog was found behind the character viewer and exposed by
closing only the viewer. The supported chooser accepted HTML and reloaded the
Sandbox, but rejected CSS with `Not allowed` on two fresh attempts; translation
was not selected. No three-file same-hash binding was established, so actual
modern/legacy parity remains `VERIFY / BLOCKED EXTERNAL`.

## ASCII-path chooser retry - 2026-07-30

CSS selection succeeded when the anonymous file was provided from an ASCII-only
temporary path, after the HTML reload. Translation selection then timed out, so
the three-file same-hash state remains unproven and actual modern/legacy parity
continues as `VERIFY / BLOCKED EXTERNAL`.

## Local container regression verification - 2026-07-30

The new generic-container starter style was rechecked after the production
build. Strict imported edit synchronization, fresh-sheet creation, edit-flow
drag/reparenting, and the 5,200-item layer workspace browser smoke all pass.
The large workspace uses one persistent preview iframe, completes inside
reparenting, emits nested preview DOM, and reports zero console/page errors.
Remote CI run `30553196837` also passed build, lint, and the full verification
gate. This strengthens local editor evidence only; it does not change the
external same-hash Roll20 or legacy-room parity status.

## Local render parity recheck - 2026-07-30

The synthetic preview/edit visual smoke remains exact in both modern and
legacy compatibility modes (`0%` mismatch, `0` pixels, i18n `1/1`). The
persistent preview surface smoke also reports zero reloads in both modes.
These are local renderer invariants and do not count as actual Roll20
same-payload or legacy-room visual evidence.

## Sandbox screen-level upload retry - 2026-07-30

The dedicated modern Sandbox still exposed the three upload controls and the
one-member state. A screen-level click on the HTML control did not open a
usable native file picker through the connected browser surface; all three
inputs remained empty. No Sandbox save, room change, or payload attachment was
counted. Same-hash modern/legacy parity remains `VERIFY / BLOCKED EXTERNAL`.

## Import/export separation verification - 2026-07-30

The browser import smoke preserved ordinary page JS and Roll20 worker JS in
their separate workspaces, hid all runtime script nodes from preview, and
reported zero console/page errors. The legacy export audit passed. The default
payload-audit alias had no `current` baseline after local evidence cleanup;
running it against the remaining anonymous synthetic baseline explicitly
returned `issues=0`. This is local contract evidence, not actual Roll20 parity.

## Roll20 chooser capability recheck - 2026-07-31

The dedicated modern Sandbox emitted a fresh filechooser event for its HTML
control, but the supported file setter was rejected with `Not allowed`. HTML,
CSS, and Translation inputs all remained empty afterward. No Sandbox save or
existing-room mutation occurred; same-hash modern/legacy parity remains
`VERIFY / BLOCKED EXTERNAL`.

## Imported edit synchronization recheck - 2026-07-31

The latest local run found no project or CDP listeners before starting. The
anonymous imported-edit smoke passed for both built-in structural cases,
including pointer interaction, resource checks, edit-to-preview synchronization,
and emitted HTML/CSS content. This strengthens the shared local render surface
and edit bridge only; it does not promote actual Roll20 same-payload parity,
legacy-room behavior, or all-sheet support. The next P0 remains a supported
three-file modern Sandbox handoff followed by independent legacy evidence.

## Composite root position-field contract - 2026-07-31

Position editing now resolves the semantic class/style fields used by emitted
composite roots, including table rows, repeating fieldsets, and button rows.
Styleless roots are managed through the separate CSS workspace without adding
an HTML wrapper. Focused position tests, imported edit synchronization, server
hygiene, and the full local CI verification gate pass. This is still local
editor evidence; actual modern Roll20 same-payload parity, legacy-room
behavior, and arbitrary user-sheet coverage remain open.

## Protected local-input edit sync - 2026-07-31

The imported-edit smoke now supports read-only local HTML/CSS/i18n paths via an
anonymous `local-input` mode. A protected local-source run passed interaction,
resource checks, and edit-to-preview synchronization through the persistent
iframe path, without copying source files into tracked or public fixtures. This
remains local imported-source evidence; actual Roll20 same-payload parity,
legacy-room behavior, and universal source coverage are still open.

## Protected large-input workspace smoke - 2026-07-31

The read-only anonymous local-input path also passed the large-workspace
browser route in `headless-large` mode. The persistent iframe owner remained
singular, no Blockly SVG surface was created, layer selection worked, and
browser/page errors were zero. This is local import/edit performance evidence
only; source-derived counts and identities are intentionally omitted, and
actual Roll20 modern/legacy parity remains open.

## Page/worker runtime boundary recheck - 2026-07-31

After a fresh static build, the import-dialog browser smoke passed the local
page-JS/worker-JS separation boundary, worker export retention, hidden preview
runtime-node check, and zero console/page errors. Worker-state, emit-contract,
and worker-parser checks passed as well. This remains local runtime evidence;
actual modern Sandbox same-payload parity, legacy-room behavior, and universal
source coverage remain open.

## Protected local-input visual parity recheck - 2026-07-31

The preview/edit visual smoke now reads protected local HTML/CSS/i18n inputs
without copying them into the repository and reports them only as
`local-input`. The actual imported input passed both modern and legacy local
contracts with exact shared-crop preview/edit parity and translation checks.
This is local evidence for one input only; actual Roll20 Sandbox activation,
legacy-room behavior, and universal source coverage remain open.

## Protected local-input Sandbox approximation recheck - 2026-07-31

The same protected local input passed the local normal-to-Sandbox-sanitized
render transition with no visible runtime nodes or browser/page errors. The
smoke gate now treats worker scripts as inert runtime data and checks actual
visibility instead of failing on their DOM presence. This remains local
sanitizer evidence; actual Roll20 Sandbox activation, screenshot parity, and
legacy-room behavior remain open.

## Edit-flow and persistent-surface recheck - 2026-07-31

The direct manipulation smoke passed, and the persistent preview surface stayed
on the same iframe for both modern and legacy local contracts. This confirms
local interaction and surface stability only; actual Roll20 screenshot parity
and room behavior remain open.

## User-facing shell visual audit - 2026-07-31

The static browser audit was corrected to mount the export at its configured
base path. The desktop first screen rendered as a bounded pastel editor shell
with the primary preview/edit flows, modern/legacy switch, import/export
actions, and empty-workspace guidance. Console and page errors were zero.
The earlier raw/narrow capture was a verifier 404 and is excluded from
evidence. This does not establish imported-sheet parity or actual Roll20
rendering.

## Generated-output cleanup retry - 2026-07-31

The current cleanup inventory contains only the reproducible
`web-push-main/.next/` and `web-push-main/out/` directories; older generated,
cache, and duplicate-report targets are absent. The host rejected the guarded
recursive deletion before execution again, so these two directories remain.
No alternate deletion path was used, and protected source, active
dependencies, reports, and worktrees were preserved.

## Copyright-safe Sandbox smoke entrypoint - 2026-07-31

The clean-checkout path now includes
`smoke:roll20-sandbox-preview:synthetic`. It generates only an anonymous local
fixture, runs the local Sandbox-expected render transition with strict
console/page-error gating, and passed. This does not restore or publish any
real sheet source and does not replace actual Roll20 Sandbox or legacy-room
visual evidence, which remains open without an attached Roll20 session.
