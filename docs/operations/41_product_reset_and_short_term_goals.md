# 41. Product Reset and Short-Term Goals

Date: 2026-07-18
Status: ACTIVE CONTROL DOCUMENT

This document replaces the previous assumption that the project is close to a
finished editor. It is the short-term control plane for the next work batches.
It describes what is currently evidenced, what is only implemented locally,
and what must be proven before a feature is called complete.

## Product North Star

Users import or author a Roll20 sheet from HTML, CSS, translation/i18n, and
future worker behavior. The product presents the same sheet surface in preview
and edit mode. Users manipulate visible objects as they would in a visual
design tool; structured containers preserve flow, table, and parent-relative
positioning. Export remains compatible with both modern and legacy Roll20
destinations without shipping copyrighted sample sheets.

## Current Truth Snapshot

The ratings below are evidence maturity, not feature completion percentages.

| Area | Evidence level | Current truth | Next proof |
| --- | ---: | --- | --- |
| Shared preview/edit render | 2/4 | One persistent iframe and edit overlay exist locally. | Browser smoke proving identical geometry and state after edits. |
| Modern Roll20 runtime | 2/4 | One anonymous generated payload activated in Custom Sheet Sandbox. | Same-payload normalized screenshot and asset-complete comparison. |
| Legacy Roll20 runtime | 1/4 | A separate legacy destination and mode-specific policy exist. | Dedicated legacy-room upload, screenshot, and state comparison. |
| Universal HTML/CSS/translation mapping | 2/4 | Generic atomic/composite paths and preserved-attribute guards exist. | Synthetic corpus expansion and loss report across unsupported structures. |
| Worker and rolltemplate behavior | 1/4 | Local inert worker/rolltemplate bridges and chat smoke exist. | Runtime-specific Roll20 smoke with generic output assertions. |
| Figma-like editing | 2/4 | Layer roles, insertion zones, and overlay chrome exist. | Direct manipulation latency, parent-relative drop, and undo/redo smoke. |
| User-facing information architecture | 1/4 | The app has multiple modes and sidebars, but the first-run path is not yet coherent. | Design reset implementation and task-based UX review. |
| CI, privacy, and repository guardrails | 3/4 | CI, ignored evidence paths, and private-content checks exist. | Verify the new branch/worktree policy and clean-clone build. |

No row above is a Roll20 visual-parity claim. The strongest current result is
activation and local contract evidence for narrow anonymous payloads.

## Short-Term Goals

### P0-0: Reset the control plane

- Keep this document, `docs/qa/31_active_todo.md`, and
  `docs/operations/35_agent_progress_log.md` as the only active status sources.
- Use `DONE`, `VERIFY`, `BLOCKED`, and `TODO` consistently.
- Do not move protected source folders or ignored reports during this reset.
- Create separate worktrees before assigning Claude or another Codex a code
  task.
- Use `docs/operations/44_workspace_cleanup_inventory.md` as the parent-folder
  cleanup boundary; no physical move is part of this reset batch.

Acceptance: a new agent can identify the active repo, first-read documents,
current blockers, and its file ownership in under five minutes.

### P0-1: User-facing design reset

Claude owns the visual information architecture and interaction styling on a
separate branch. The design must be rebuilt around the real workflow:

1. Create blank sheet or import user files.
2. See the actual Roll20 sheet immediately.
3. Switch to edit mode without changing the rendered sheet.
4. Select, move, insert, group, reorder, and inspect objects.
5. Preview rolls/chat separately from the sheet surface.
6. Export with an explicit modern/legacy destination.

The design must remove dead chrome, ambiguous controls, stale tree affordances,
and labels that describe implementation rather than user intent. It must not
add public examples or source-derived artwork.

Visual direction: use an original light pink and pastel palette with clear
contrast and restrained accents. Do not reproduce Roll20's interface, logo,
layout, or distinctive chrome. Avoid the generic dark navy/purple AI-product
look. The sheet render surface may retain Roll20-compatible styling because it
is the user's imported document; the surrounding application UI must remain
visually independent.

Every unfamiliar tool needs a plain Korean label, an icon, and a short tooltip.
For complex actions, the tooltip may open a small synthetic animated preview or
short local video-like demonstration. Do not embed real sheet screenshots or
third-party media in the public app.

Acceptance: a synthetic blank-sheet task and a synthetic imported-sheet task can
be completed from visible controls without opening the Blockly implementation.

### P0-1a: Trust, persistence, and contact surface

The current app has local browser autosave/IndexedDB, not account login or
cloud sync. Keep this behavior explicit in the UI: `이 브라우저에 자동 저장` is
the current promise. Login is a future option, not a hidden requirement. If
account storage is later added, it needs a real backend, privacy policy, export
and delete controls, and a separate acceptance gate.

Remove the public repository/source link from the product header. Add a clear
bug-report action using `mailto:sjh11235678@gmail.com`. Keep repository links
in developer/portfolio documentation only.

Acceptance: a fresh browser can create, reload, and recover a local workspace;
the UI does not claim cloud persistence; the header contains no GitHub/source
shortcut and exposes the bug-report address.

### P0-2: Render-surface unification

Codex owns the canonical preview document and its edit overlay. Preview and edit
must share the same iframe/document, wrapper context, intrinsic width/height,
translation state, runtime mode, and asset policy. The edit layer may add
selection boxes, drop targets, and handles only.

Acceptance:

- no blank starter object appears in a new sheet;
- default sheet width is 850px and explicit width input works;
- height follows the rendered sheet rather than an infinite shell;
- preview focus mode hides editor-only layout/simulation chrome;
- moving an object produces the same geometry in preview after commit;
- scripts, worker source, and rolltemplate source are never visible sheet nodes.

### P0-3: Import truth and mode separation

Keep HTML, CSS, translation/i18n, assets, attributes, and unsupported nodes
generic and loss-aware. Keep modern authored-class behavior, Sandbox sanitize
diagnostics, and legacy compatibility/sanitize as separate layers. Never use a
single imported sheet as a product-specific shortcut.

Acceptance: synthetic tests prove preserved attributes, class/CSS pairing,
translation application, unsupported-node fallback, and modern/legacy output
selection without public source fixtures.

### P1-1: Flow-aware visual editing

Implement the editor model in this order: selection, move, parent-relative
absolute placement, before/inside/after drop zones, flow reorder, grouping,
ungrouping, and undo/redo. Keep DOM role classification in
`lib/editor/layerRoles.ts`; do not recreate a second tree model in the UI.

Acceptance: synthetic frame/flow/table fixtures pass direct drag, nested drop,
reorder, and preview-sync smoke with measured frame and commit latency.

### P1-2: Roll runtime behavior

Keep scripts and worker code inert in the visual preview, but preserve a future
worker workspace and explicit export/runtime boundaries. Build generic
rolltemplate/chat behavior from synthetic templates first. Modern Sandbox and
legacy test-room evidence remain separate.

Acceptance: a synthetic roll control produces a deterministic local chat result;
actual Roll20 smoke is recorded as VERIFY until both destinations are tested.

### P1-3: Repository and delivery cleanup

Keep product code under `app/`, `components/`, `lib/`, and `scripts/`. Keep
hand-authored knowledge under `docs/`. Keep generated evidence under ignored
`reports/`, copied fixtures under ignored `test-fixtures/`, and temporary output
under `.tmp/`. Do not move legacy siblings until all references are inventoried.

Acceptance: clean clone has no real sheet source, generated evidence, or private
asset; CI blocks accidental additions; `dev` remains CI-only and `main` remains
the production Pages branch.

## Work Allocation

| Owner | Owns | Must not touch |
| --- | --- | --- |
| Windows Codex lead | canonical renderer, integration, evidence, TODO/progress, final push | unrelated design rewrite while the handoff branch is active |
| Claude design track | visual system, navigation, labels, layout, empty/loading/error states, interaction styling | renderer contract, import/export logic, private fixtures, shared TODO/progress |
| Additional Codex track | edit overlay and measured direct-manipulation performance | design system and Roll20 destination policy |
| Claude mapping/CI track | generic mapping tests or CI/security only, one track per worktree | renderer UI, private evidence, README |

Only the lead merges integration branches and updates the shared status docs.

## Definition Of Done For This Reset

The reset is complete when the canonical plan, design handoff, context pack,
and repository map are committed; the user journey has a synthetic smoke; and
the next implementation batch has a bounded owner, branch, files, and evidence
gate. It is not complete merely because the documents exist.
