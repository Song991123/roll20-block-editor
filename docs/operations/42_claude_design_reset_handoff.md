# 42. Claude Design Reset Handoff

Date: 2026-07-18
Status: READY FOR A SEPARATE WORKTREE

## Mission

Rebuild the product UI around a clear user workflow for importing or authoring
Roll20 sheets. The result should feel like a focused visual editor, not a
debugging console. The sheet itself remains the primary visual surface.

## Required First Reads

1. `AGENTS.md`
2. `docs/operations/41_product_reset_and_short_term_goals.md`
3. `docs/operations/33_working_rules_and_requirements.md`
4. `docs/qa/31_active_todo.md`
5. `docs/qa/34_requirements_gap_matrix.md`
6. `docs/ux/32_dom_layer_editing_plan.md`
7. `docs/PROJECT_STRUCTURE.md`
8. `docs/operations/35_agent_progress_log.md`
9. `docs/spec/25_roll20_baseline.md`
10. `docs/spec/29_universal_roll20_mapping_contract.md`

Do not read the entire generated `reports/` tree. Open only a report named by
the lead for a specific question.

## Branch And Workspace

- Use a separate worktree or clone based on the current integration branch.
- Suggested branch: `claude/design-reset-20260718`.
- Do not work in `web-push-main/` directly.
- Commit and push only the design branch. The Windows Codex lead reviews and
  cherry-picks it.
- Do not edit the shared TODO/progress files; return a handoff summary instead.

## Scope

### In scope

- editor information architecture and navigation;
- preview focus mode and mode switching clarity;
- import/create empty states;
- Korean UI copy that describes user actions, not implementation terms;
- layout, spacing, hierarchy, responsive shell behavior, and accessibility;
- selection, layer-panel visual treatment, container/drop-target affordances;
- loading, error, no-selection, invalid-file, and unsaved-state surfaces;
- original light-pink/pastel visual system with accessible contrast;
- plain Korean action labels, icon-first controls, and tooltip previews for
  unfamiliar operations;
- replacing the repository link with a bug-report action to
  `sjh11235678@gmail.com`;
- making local browser autosave explicit without pretending that login/cloud
  sync already exists;
- synthetic screenshots and interaction smoke tests only.

### Out of scope

- changing the Roll20 render contract or base CSS;
- changing importer/emitter semantics or legacy sanitization;
- adding public sheet examples or real sheet assets;
- adding fixture-specific CSS or source-derived artwork;
- changing worker execution, rolltemplate semantics, or export policy;
- copying Roll20's distinctive UI, logo, chrome, or layout;
- using a dark blue/purple-only palette or generic AI-dashboard styling;
- adding an auth provider or cloud persistence implementation;
- editing `AGENTS.md`, `README.md`, shared TODO, or shared progress logs;
- claiming Roll20 visual parity.

## UX Acceptance Checks

1. A first-time user can choose blank creation or file import without seeing a
   ghost starter object.
2. Preview mode shows the sheet as the primary surface; editor chrome is not
   mistaken for sheet content.
3. Edit mode shows the exact rendered sheet plus an edit-only overlay.
4. The layer panel communicates parent containers, child eligibility, and
   before/inside/after insertion targets with distinct visual states.
5. A selected object has one obvious source of truth for position, size, and
   parent container.
6. Modern/legacy selection is visible and does not imply that one mode covers
   the other.
7. User-facing strings do not expose terms such as raw DOM, block ID, CSS
   cascade, or worker bridge unless inside an advanced developer surface.
8. All controls remain usable at the default 850px sheet canvas and with a
   narrower browser viewport.
9. The surrounding app UI is visibly independent from Roll20 while the sheet
   render remains faithful to its imported document.
10. A bug-report action uses `mailto:sjh11235678@gmail.com`; no product header
    control links to the repository.
11. Autosave copy says that work is stored in this browser; no login button is
    shown unless a real account service is implemented.

## Verification

Use synthetic fixtures only. Run the smallest relevant UI tests, then:

```text
corepack pnpm run lint
corepack pnpm run build
corepack pnpm run ci:verify
git diff --check
corepack pnpm run check:server-hygiene
```

Return:

- commit hash and branch;
- changed files;
- screenshots or test outputs stored only in ignored local paths;
- exact commands and results;
- known conflicts with renderer or editor files;
- remaining VERIFY/TODO items.
