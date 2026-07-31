# 43. Agent Context Pack

Date: 2026-08-01

This is the short reading path for agents. It prevents every task from loading
the entire history and generated evidence tree.

## Current Control State

- Canonical worktree: `web-push-main/`; refresh branch/commit with Git before
  editing.
- Local preview/edit share one persistent iframe. Modern and legacy browser
  smoke currently pass, including delayed stale-revision rejection.
- Actual Roll20's built-in default chat-template DOM and typography were
  measured in the dedicated one-member modern Sandbox. The local fallback now
  matches its caption/row/inline-roll structure and passes browser smoke.
- Actual same-payload Roll20 evidence remains `0/4`. Modern Sandbox upload and
  separate legacy-enabled test-room proof are still open. The visible upload
  route is blocked before transmission until Chrome extension file-URL access
  is enabled; do not use hidden-input or endpoint workarounds.
- Generated `.next/`, `out/`, `.tmp/`, and report outputs are disposable. Real
  or derived sheets and screenshots stay local, ignored, and uncommitted.

## Tier 0: Always Read

1. `AGENTS.md`
2. `docs/operations/43_agent_context_pack.md`
3. `git status --short --branch`
4. `corepack pnpm run check:server-hygiene`

Do not read `31_active_todo.md`, `34_requirements_gap_matrix.md`, or
`35_agent_progress_log.md` from top to bottom. They are append-only histories.
Use `rg -n` to find the current heading or named topic, then open only that
range, normally no more than 160 lines.

## Tier 1: Read By Task

| Task | Read next |
| --- | --- |
| Render/preview | `docs/spec/25_roll20_baseline.md`, `docs/spec/30_roll20_actual_sandbox_contract.md`, `docs/spec/31_asset_preservation_policy.md` |
| Import/export | `docs/spec/29_universal_roll20_mapping_contract.md`, `docs/qa/34_requirements_gap_matrix.md` |
| Edit UX | `docs/ux/32_dom_layer_editing_plan.md`, `lib/editor/layerRoles.ts`, `docs/operations/42_claude_design_reset_handoff.md` |
| Roll20 browser | `docs/operations/37_roll20_actual_verification.md`, then only the named ignored report |
| Branch/CI/security | `docs/operations/34_branch_and_deployment_plan.md`, `docs/operations/36_public_portfolio_and_copyright_rules.md`, `.github/workflows/` |
| Product rules | Relevant section of `docs/operations/33_working_rules_and_requirements.md` |
| Progress/handoff | Current section of `docs/qa/31_active_todo.md` and `docs/operations/35_agent_progress_log.md`, then `docs/operations/39_two_host_agent_prompts.md` |
| Folder cleanup | `docs/operations/45_workspace_harness_and_retention.md` and current section of `docs/operations/44_workspace_cleanup_inventory.md` |

## Tier 2: Open On Demand

- `reports/` is generated evidence, not a reading queue.
- `test-fixtures/` is local-only copied input, not product source.
- `.next/`, `out/`, `.tmp/`, `debug.log`, and caches are generated or
  diagnostic byproducts.
- Parent-folder source corpora, old worktrees, and experiment copies are not
  active workspaces and must not be edited.

## Context Budget Baseline

The previous mandatory startup opened seven full files: `2,249,317` UTF-8
bytes and `24,448` lines. A rough, fixed comparison (`bytes / 3.5`) is
`642,662` tokens. This is a navigation estimate, not provider billing data.

The new mandatory core is only `AGENTS.md` plus this context pack. Record its
current baseline is `12,045` UTF-8 bytes, `181` lines, and about `3,442`
tokens by the same estimate: a `99.46%` startup-context reduction. Task-specific
files are added only when the task route requires them. Do not claim Caveman's
Claude-log statistics as Codex usage; record them only on a host where its hook
can read the matching session log.

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
