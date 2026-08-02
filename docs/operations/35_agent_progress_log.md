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
2. Detailed legacy result-card typography/row comparison and renderer-action
   classification after the trustworthy actual capture.
3. Broader anonymous mapping and edit coverage for uncommon structures.
4. Future JavaScript workspace and lossless unsupported-source policy.
5. Current-tree privacy cleanup, followed by an explicit Git-history decision.

Do not turn any local pass into a claim of all-sheet support or Roll20 visual
parity.
