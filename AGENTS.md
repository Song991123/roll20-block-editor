# Agent Rules

This file is the mandatory startup rulebook for Codex, Claude, and any other agent working in this repository. Read this file before changing code, moving files, reporting status, or claiming completion.

## Mandatory Startup Order

1. Read `AGENTS.md`.
2. Read `docs/operations/33_working_rules_and_requirements.md`.
3. Read `docs/qa/31_active_todo.md`.
4. Read `docs/qa/34_requirements_gap_matrix.md`.
5. Read `docs/PROJECT_STRUCTURE.md`.
6. Read `docs/operations/35_agent_progress_log.md`.
7. For edit-mode work, read `docs/ux/32_dom_layer_editing_plan.md` and inspect `lib/editor/layerRoles.ts`.
8. For Roll20 preview/parity work, read `docs/spec/25_roll20_baseline.md`, `docs/spec/29_universal_roll20_mapping_contract.md`, `reports/README.md`, and the relevant report under `reports/`.
9. For branch/deploy work, read `docs/operations/34_branch_and_deployment_plan.md` and `.github/workflows/`.
10. Run `git status --short --branch`.
11. Check for unnecessary local dev servers before starting another one.

## Non-Negotiable Rules

- Do not mutate external source corpus folders directly.
- Copy verification samples into workspace-owned fixture folders before using them.
- Keep `docs/qa/31_active_todo.md` current after each coherent work batch.
- Keep unverified work as `TODO`, `VERIFY`, or `BLOCKED`.
- Do not mark visual parity, full import/export, or all-sheet support as complete without exact current evidence.
- Do not put agent-only instructions into README files. README files are human/project presentation material.
- Record agent-facing progress in `docs/operations/35_agent_progress_log.md` and task status in `docs/qa/31_active_todo.md`, not in `README.md`.

## Protected Source Folders

Never write, rename, normalize, unzip in place, or delete files in these folders:

- `D:\훙냥냥\마렌상\roll20-character-sheets-master`
- `D:\훙냥냥\마렌상\티알[중요]커스텀시트`
- `D:\훙냥냥\마렌상\티알\0 CoC\영시영\H님 커미션\시트`

Allowed workspace-owned places for copied evidence:

- `test-fixtures/`
- `reports/`
- `.tmp/`

## Forbidden Claims

Do not say these unless the exact current report proves them:

- `100% import/export`
- `Roll20 visual parity`
- `all sheets are supported`
- `worker JS block coding is complete`
- `legacy Roll20 sanitize is implemented`
- `edit mode equals preview mode for imported sheets`

## Branch and Deploy Rules

- `main` is production and deploys to GitHub Pages.
- `dev` is integration/predeploy testing and runs CI only.
- Short-lived task branches may use `codex/*`.
- Push coherent batches to GitHub after lint/build.
- After pushing to `main`, check GitHub Actions and the public Pages URL.
- Do not create a public `dev` deploy without choosing a hosting strategy in `docs/operations/34_branch_and_deployment_plan.md`.

## Minimum Verification

Run these unless the task is documentation-only and the user explicitly says not to:

- `corepack pnpm run lint`
- `corepack pnpm run build`

For preview/parity work, also run the relevant fixture/report script and record the output path in TODO.

## Reporting

Every final report should include:

- What changed.
- What was verified.
- What was not verified.
- Commit hash and pushed branch when applicable.
- The next P0/P1 item when useful.
