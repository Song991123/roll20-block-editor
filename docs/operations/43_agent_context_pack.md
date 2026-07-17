# 43. Agent Context Pack

Date: 2026-07-18

This is the short reading path for agents. It prevents every task from loading
the entire history and generated evidence tree.

## Tier 0: Always Read

1. `AGENTS.md`
2. `docs/operations/41_product_reset_and_short_term_goals.md`
3. `docs/qa/31_active_todo.md`
4. `docs/PROJECT_STRUCTURE.md`

## Tier 1: Read By Task

| Task | Read next |
| --- | --- |
| Render/preview | `docs/spec/25_roll20_baseline.md`, `docs/spec/30_roll20_actual_sandbox_contract.md`, `docs/spec/31_asset_preservation_policy.md` |
| Import/export | `docs/spec/29_universal_roll20_mapping_contract.md`, `docs/qa/34_requirements_gap_matrix.md` |
| Edit UX | `docs/ux/32_dom_layer_editing_plan.md`, `lib/editor/layerRoles.ts`, `docs/operations/42_claude_design_reset_handoff.md` |
| Roll20 browser | `docs/operations/37_roll20_actual_verification.md`, then only the named ignored report |
| Branch/CI/security | `docs/operations/34_branch_and_deployment_plan.md`, `docs/operations/36_public_portfolio_and_copyright_rules.md`, `.github/workflows/` |
| Progress/handoff | `docs/operations/35_agent_progress_log.md`, `docs/operations/39_two_host_agent_prompts.md` |

## Tier 2: Open On Demand

- `reports/` is generated evidence, not a reading queue.
- `test-fixtures/` is local-only copied input, not product source.
- `.next/`, `out/`, `.tmp/`, `debug.log`, and caches are generated or
  diagnostic byproducts.
- Parent-folder source corpora, old worktrees, and experiment copies are not
  active workspaces and must not be edited.

## Handoff Format

Every agent handoff uses this order:

1. status: DONE / VERIFY / BLOCKED / TODO;
2. exact branch and commit;
3. changed files;
4. commands and evidence;
5. remaining risks and conflict files;
6. next smallest actionable task.

Never paste private source, source identity, asset URLs, screenshots, or
source-derived measurements into the handoff.

