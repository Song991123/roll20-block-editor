# 33. Working Rules and Product Requirements

Date: 2026-06-12

This document is the operating contract for Codex, Claude, and any other agents working on this Roll20 sheet builder. Keep claims evidence-based. Do not mark visual parity, full import/export, or all-sheet support as complete without the exact report that proves it.

## 0. Mandatory Startup Checklist

Every agent must do this before changing code or claiming status. `AGENTS.md`
is the repository-level entrypoint; this document is the expanded contract and
is opened only when a task needs its detail.

1. Read `AGENTS.md`.
2. Read `docs/operations/43_agent_context_pack.md`.
3. Check `git status --short --branch` and server hygiene.
4. Use the context pack's task route. Search append-only histories and open
   only the relevant section; never read them end to end by default.
5. Open this expanded contract or another task-specific document only when
   the route names it.
6. Update `docs/qa/31_active_todo.md` and
   `docs/operations/35_agent_progress_log.md` after each coherent work batch.

## 0.1 Source Safety

Never mutate external source corpus folders directly. If a sheet is needed for verification, copy it into workspace-owned fixture folders first.

Protected source folders are external and read-only. Their concrete paths are intentionally omitted from repository records.

Allowed workspace-owned places for copied evidence:

- `test-fixtures/`
- `reports/`
- `.tmp/`

These are local-only by default. They are intentionally ignored so real sheets, generated fixture HTML, private screenshots, source-derived report JSON, and third-party reference images do not ship with the public app.

## 0.1.1 Product Copyright and Import Boundary

- Do not ship copyrighted/public Roll20 sheet source, generated sheet fixtures, screenshots, or preview images as in-app samples, seeded examples, docs assets, or public repo material.
- The app may support users importing their own HTML, CSS, translation/i18n, assets, and later worker JS, and agents may use local ignored fixtures/reports for verification.
- Any fixture copied from a real sheet must stay local-only and ignored. Public demos must be synthetic, user-authored, or explicitly cleared for publication.
- External third-party sheets used only to discover or validate generic behavior are stricter than retained local fixtures: keep them in an ephemeral temp location, do not write their identity, URL, source, media, screenshots, or derived per-sheet report into repository docs/logs or permanent local evidence, and remove the temporary copy after the generic finding is converted into a synthetic test.
- This prohibition also applies to TODOs, progress logs, agent handoffs, and chat summaries. Record only generic implementation findings; do not retain fixture labels, creator/sheet names, distinctive source fragments, asset URLs, or source-derived measurements.
- Do not optimize for a single sheet family. Renderer, importer, editor layers, and export paths must be universal enough for custom sheets and official-style sheets.
- Legacy Roll20 support is a product requirement alongside modern Roll20 support. Treat them as separate render contracts, switch preview/edit/HTML/CSS/manifest/verification destination together, and never use evidence from one mode to pass the other. Never describe auto-prefixing as complete legacy sanitization unless actual legacy CSS behavior has been verified.

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
- Keep agent-facing progress and handoff notes in `docs/operations/35_agent_progress_log.md`, not in `README.md`.
- Keep README as a Korean portfolio landing page: visual first, compact cards, details linked out.
- Do not put verification tables, generated reports, fixture names, or private sheet details into README.
- Before committing, confirm the git root is `web-push-main` and do not stage parent-folder material.

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
- Detect external image/font URLs and Roll20 proxy URLs before making visual parity claims.
- If diagnostics show the original source asset resolves to a placeholder, keep renderer CSS changes on hold until the user relinks/rehosts the asset or the mismatch is explicitly accepted as placeholder behavior.
- Do not store, publish, or commit third-party sheet assets while implementing asset replacement or verification helpers.
- Rendering without errors is not enough. Visual similarity must be measured and explained.

## 3. Roll20 Environment Reproduction

- Roll20 base CSS alone is not sufficient.
- Reproduce Roll20 dialog wrapper/class context.
- Include context classes such as `ui-dialog`, `ui-widget`, `ui-widget-content`, and `ui-corner-all`.
- Hide white dialog chrome/titlebar when it is not part of the editable sheet area.
- Make iframe preview, Shadow preview, and EditCanvas share the same Roll20 baseline/runtime/layer CSS conditions.
- Inspect the actual Roll20 editor when authenticated access is available.
- Verify the GitHub Pages deployment after push when the change affects deployed behavior.
- Split Roll20 actual-screen verification into two tracks:
  - Existing solo rooms are read-only observation targets.
  - Modern generated-sheet upload/apply checks use Custom Sheet Sandbox first.
  - Custom Sheet Sandbox does not expose the legacy runtime. Legacy generated-sheet checks must use a dedicated test room with legacy sanitization enabled; a Sandbox result must never pass or fail the legacy gate.
- Do not modify existing real rooms, characters, settings, chat, handouts, macros, or sheet code unless the user explicitly authorizes that exact edit.

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
