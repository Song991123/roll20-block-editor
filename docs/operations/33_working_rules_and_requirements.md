# 33. Working Rules and Product Requirements

Date: 2026-06-12

This document is the operating contract for Codex, Claude, and any other agents working on this Roll20 sheet builder. Keep claims evidence-based. Do not mark visual parity, full import/export, or all-sheet support as complete without the exact report that proves it.

## 0. Mandatory Startup Checklist

Every agent must do this before changing code or claiming status. `AGENTS.md` is the repository-level entrypoint; this document is the expanded operating contract.

1. Read `AGENTS.md`.
2. Read `docs/operations/33_working_rules_and_requirements.md`.
3. Read `docs/qa/31_active_todo.md`.
4. Read `docs/qa/34_requirements_gap_matrix.md`.
5. Read `docs/PROJECT_STRUCTURE.md`.
6. For edit-mode work, read `docs/ux/32_dom_layer_editing_plan.md` and inspect `lib/editor/layerRoles.ts`.
7. For Roll20 preview/parity work, read `docs/spec/25_roll20_baseline.md`, `docs/spec/29_universal_roll20_mapping_contract.md`, `reports/README.md`, and the relevant report under `reports/`.
8. For branch/deploy work, read `docs/operations/34_branch_and_deployment_plan.md` and `.github/workflows/`.
9. Check `git status --short --branch`.
10. Check for unnecessary local dev servers before starting another one.
11. Update `docs/qa/31_active_todo.md` after each coherent work batch.

## 0.1 Source Safety

Never mutate external source corpus folders directly. If a sheet is needed for verification, copy it into workspace-owned fixture folders first.

Protected source folders:

- `D:\훙냥냥\마렌상\roll20-character-sheets-master`
- `D:\훙냥냥\마렌상\티알[중요]커스텀시트`
- `D:\훙냥냥\마렌상\티알\0 CoC\영시영\H님 커미션\시트`

Allowed workspace-owned places for copied evidence:

- `test-fixtures/`
- `reports/`
- `.tmp/`

## 0.2 Forbidden Claims

Do not say any of the following unless the exact current report proves it:

- "100% import/export"
- "Roll20 visual parity"
- "all sheets are supported"
- "worker JS block coding is complete"
- "legacy Roll20 sanitize is implemented"
- "edit mode equals preview mode for imported sheets"

Use `VERIFY`, `TODO`, or `BLOCKED` instead of `DONE` when evidence is incomplete.

## 0.3 Branch and Deploy Rules

- `main` is production and deploys to GitHub Pages.
- `dev` is integration/predeploy testing and runs CI only.
- Short-lived task branches may use `codex/*`.
- Push coherent batches to GitHub after lint/build.
- After pushing to `main`, check GitHub Actions and the public Pages URL.
- Do not create a public `dev` deploy without choosing an explicit hosting strategy in `docs/operations/34_branch_and_deployment_plan.md`.

## 0.4 Minimum Verification Commands

Run these unless the task is documentation-only and the user explicitly says not to:

- `corepack pnpm run lint`
- `corepack pnpm run build`

For preview/parity work, also run the relevant fixture/report script and record the output path in TODO.

## 1. Work Operating Rules

- Start by reading or updating the TODO list.
- Work from the current highest-priority TODO item.
- Update the TODO list after each completed task.
- Report TODO updates and completed work to the user.
- Continue to the next task without waiting when the next step is clear.
- Add or reprioritize TODO items when new evidence changes the plan.
- Split work into parallel tracks when safe.
- Use Codex, Claude, MCP, browser automation, and local scripts when they fit the task.
- Apply better tooling or automation directly when it reduces repeated manual work.
- Commit and push to GitHub after each coherent work batch.
- Run basic verification such as lint, build, browser load, and fixture scripts.
- Keep unverified items in TODO. Do not silently promote them to done.
- Do not put agent-only instructions into README files. README files are reserved for human/project presentation and documentation indexes.

## 2. Sheet Preview Verification

- Compare the service preview with the actual Roll20 sheet view.
- Locate HTML, CSS, translation, and i18n files from sheet folders and actually import them.
- Use preview/reference images as visual ground truth when present.
- For legacy Roll20 sheets, verify with the legacy option enabled.
- For modern sheets, verify with the legacy option disabled.
- Compare rendered preview screenshots against reference images.
- Classify differences by likely source: CSS leak, missing Roll20 base, translation, worker/default attribute state, asset loading, viewport, crop, or tab/default state.
- Distinguish asset images from reference preview images.
- Treat decorative/background images as real sheet resources.
- Treat preview/completion images as visual comparison references.
- Rendering without errors is not enough. Visual similarity must be measured and explained.

## 3. Roll20 Environment Reproduction

- Roll20 base CSS alone is not sufficient.
- Reproduce Roll20 dialog wrapper/class context.
- Include context classes such as `ui-dialog`, `ui-widget`, `ui-widget-content`, and `ui-corner-all`.
- Hide white dialog chrome/titlebar when it is not part of the editable sheet area.
- Make iframe preview, Shadow preview, and EditCanvas share the same Roll20 baseline/runtime/layer CSS conditions.
- Inspect the actual Roll20 editor when authenticated access is available.
- Verify the GitHub Pages deployment after push when the change affects deployed behavior.

## 4. Visual Comparison Pipeline

- Inventory sheets that have reference images.
- Prepare fixtures that copy source files into workspace-owned fixture directories.
- Render fixtures through the real preview document path into standalone HTML.
- Open fixture HTML in a browser and capture PNG screenshots.
- Run canvas/pixel diff against the reference image.
- Treat early diff scores as diagnostics, not pass/fail gates.
- Normalize viewport, tab/default state, and crop before making parity claims.
- Build L2 browser roundtrip: import -> edit/preview -> screenshot -> diff.
- Record console error/warning counts with the visual result.

## 5. Edit Mode UX

- Edit mode must support direct manipulation.
- Users should manipulate objects like an image editor or Figma.
- Do not make every object `position:absolute` by default.
- When an object is inserted into a layer/container, respect that container's flex, flow, or table structure.
- Objects inserted into flow containers should push/reorder surrounding elements.
- Frames, rows, tables, and similar structured DOM nodes must be recognized as droppable containers.
- Layer/frame containers must be visually marked.
- The UI must show whether a container can receive children.
- During drag, highlight candidate containers and the actual drop target.
- Clean up highlights after drop/cancel.
- Distinguish before, after, and inside drop zones.
- The layer panel must also show the intended insertion location clearly.
- Edit mode should be the real preview render with edit-only overlays, not a separately redrawn approximation.

## 6. DOM Analysis and Documentation

- Analyze sheet DOM objects.
- Classify each DOM element's role.
- Distinguish layer, frame, flow, table, input, widget, action, text, media, and runtime nodes.
- Decide whether each element can receive children.
- Record the analysis in tables.
- Document how each DOM role appears in the edit UI.
- Keep the plan in files such as `docs/ux/32_dom_layer_editing_plan.md`.

## 7. Layer Role Classification

- Assign role metadata to DOM elements.
- Use attributes such as `data-r20-layer-role` and `data-r20-can-drop`.
- Treat frame, flow, and table nodes as potential child containers.
- Visually mark droppable areas.
- Show candidate containers differently from the active drop target.
- Keep classification logic in a dedicated module such as `lib/editor/layerRoles.ts`.

## 8. Legacy Roll20 Handling

- Separate auto-prefix from legacy CSS sanitize.
- Clearly state whether true legacy Roll20 CSS sanitization is applied.
- Do not call an auto-prefix path "legacy sanitize".
- For legacy sheets, import and compare with legacy mode enabled.
- For modern sheets, import and compare with legacy mode disabled.
- Record legacy CSS status in reports and TODO.

## 9. Verification Standard

- Lint passes.
- Build passes.
- Fixture render script passes.
- Browser load is checked.
- Console errors/warnings are zero, or recorded with cause.
- Real drag/drop smoke is checked for edit UX changes.
- Preview and edit render paths are compared.
- Screenshot diff is checked against reference images when available.
- GitHub Pages deployment is checked for deployed changes.
- Unverified work remains in TODO.
- Distinguish "pipeline exists" from "feature is proven complete".

## 10. Reporting Standard

- Split work into parts at the start.
- Report completed work, changed files, and commit hash.
- Report verification results.
- State failures and unverified items plainly.
- List next P0/P1 tasks.
- Keep TODO documents current.

## 11. Remaining Core Work

- Verify visual differences after importing real Roll20 sheets.
- Split worker JS into a separate future block-coding workspace.
- Build L2 browser roundtrip tests.
- Normalize viewport, tab/default state, and crop for image diff.
- Stabilize real drag/drop smoke automation.
- Split layer-panel drop zones into before, after, and inside.
- Expand DOM object analysis tables.
- Continue Figma-like edit UX with flow-aware insertion.
- Verify legacy sheet options.
- Expand reference-image visual comparison coverage.
