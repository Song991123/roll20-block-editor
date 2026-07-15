# Agent Rules

This file is the mandatory startup rulebook for Codex, Claude, and any other agent working in this repository. Read this file before changing code, moving files, reporting status, or claiming completion.

## Mandatory Startup Order

1. Read `AGENTS.md`.
2. Read `docs/operations/33_working_rules_and_requirements.md`.
3. Read `docs/qa/31_active_todo.md`.
4. Read `docs/qa/34_requirements_gap_matrix.md`.
5. Read `docs/PROJECT_STRUCTURE.md`.
6. Read `docs/operations/35_agent_progress_log.md`.
7. Read `docs/operations/36_public_portfolio_and_copyright_rules.md`.
8. For Roll20 actual-screen verification, read `docs/operations/37_roll20_actual_verification.md`.
9. For edit-mode work, read `docs/ux/32_dom_layer_editing_plan.md` and inspect `lib/editor/layerRoles.ts`.
10. For Roll20 preview/parity work, read `docs/spec/25_roll20_baseline.md`, `docs/spec/29_universal_roll20_mapping_contract.md`, `docs/spec/31_asset_preservation_policy.md`, `reports/README.md`, and the relevant local report under `reports/` when present.
11. For branch/deploy work, read `docs/operations/34_branch_and_deployment_plan.md` and `.github/workflows/`.
12. For two-host Codex/Claude parallel work, read `docs/operations/39_two_host_agent_prompts.md`; only the lead integration agent merges or pushes the integration branch.
12. For external render/editor references, read `docs/research/40_roll20_render_reference_inventory.md`.
13. For parallel Codex/Claude/MacBook work, read `docs/operations/38_multi_agent_render_plan.md`.
14. Run `git status --short --branch`.
15. Check for unnecessary local dev servers before starting another one.

## Non-Negotiable Rules

- Do not mutate external source corpus folders directly.
- Copy verification samples into workspace-owned fixture folders before using them.
- Keep `docs/qa/31_active_todo.md` current after each coherent work batch.
- Keep unverified work as `TODO`, `VERIFY`, or `BLOCKED`.
- Do not mark visual parity, full import/export, or all-sheet support as complete without exact current evidence.
- Do not put agent-only instructions into README files. README files are human/project presentation material.
- Record agent-facing progress in `docs/operations/35_agent_progress_log.md` and task status in `docs/qa/31_active_todo.md`, not in `README.md`.
- Keep README as a Korean portfolio landing page: visual first, compact cards, details linked out.
- Do not commit real or derived Roll20 sheet assets, public examples, local fixtures, generated reports, source screenshots, or third-party reference images.
- Do not bundle copyrighted/public Roll20 sheets as in-app samples or seeded demo content. The product must support user import, user-authored sheets, and local ignored verification fixtures instead.
- Roll20 preview/edit/export must support both modern and legacy Roll20 paths. Keep the legacy sanitize option separate from auto-prefixing and verify legacy sheets with the option enabled.
- The product goal is universal mapping: imported HTML, CSS, translation/i18n, and future worker JS must map to editable blocks/layers without hard-coding one commissioned sheet or one official sheet family.
- Commit only from the active Next/React worktree (`web-push-main/`). Confirm with `git rev-parse --show-toplevel` before committing.
- Roll20 actual-screen verification has two tracks: read-only observation of existing solo rooms, and write/apply checks only in Custom Sheet Sandbox or a newly-created test room.
- Existing Roll20 rooms are observation-only unless the user explicitly authorizes a specific edit in that specific room.
- Optimization and security work must keep render truthfulness first: performance improvements cannot bypass Roll20 wrapper/context, source/intrinsic, legacy/modern, asset, and private-evidence gates.
- Parallel agents must use separate branches or read-only reports. One lead/integrator owns merges and pushes to shared branches.

## Protected Source Folders

Never write, rename, normalize, unzip in place, or delete files in these folders:

- `D:\훙냥냥\마렌상\roll20-character-sheets-master`
- `D:\훙냥냥\마렌상\티알[중요]커스텀시트`
- `D:\훙냥냥\마렌상\티알\0 CoC\영시영\H님 커미션\시트`

Allowed workspace-owned places for copied evidence:

- `test-fixtures/`
- `reports/`
- `.tmp/`

These places are local-only by default. Do not publish their generated contents unless the user explicitly approves a sanitized artifact.

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
