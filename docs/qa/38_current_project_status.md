# 38. Current Project Status

Date: 2026-07-30

This is an anonymous handoff snapshot. It contains no real sheet names,
creator names, source URLs, screenshots, private room identifiers, or
source-derived measurements. Private evidence, when needed, stays in ignored
local output and is deleted after the verification batch.

## Current Evidence

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
| Modern Roll20 Sandbox render | BLOCKED_EXTERNAL | Upload dispatch occurred, but visible sheet activation and screenshot evidence are missing. |
| Legacy Roll20 render | VERIFY/OPEN | Requires a separate dedicated legacy-enabled destination and current evidence. |
| Rolltemplate/chat parity | VERIFY/SYNTHETIC_ONLY | Local chat simulation works; actual template-by-template visual parity is unproven. |
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
