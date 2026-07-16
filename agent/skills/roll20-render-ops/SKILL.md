---
name: roll20-render-ops
description: Operate the roll20-block-editor project for Roll20 render parity, legacy/modern sanitize checks, private evidence safety, CI/CD status, optimization/security planning, and multi-agent Codex/Claude handoff. Use when continuing render-unification work, coordinating parallel agents, checking current TODOs, or deciding which validation commands to run first.
---

# Roll20 Render Ops

Use this skill when working in `web-push-main` on Roll20 render parity, edit/preview synchronization, CI/CD, evidence safety, or multi-agent handoff.

## First Reads

Open these before changing files or reporting status:

1. `AGENTS.md`
2. `docs/operations/33_working_rules_and_requirements.md`
3. `docs/qa/31_active_todo.md`
4. `docs/qa/34_requirements_gap_matrix.md`
5. `docs/operations/35_agent_progress_log.md`
6. `docs/operations/34_branch_and_deployment_plan.md`
7. `docs/operations/38_multi_agent_render_plan.md`
8. `docs/research/40_roll20_render_reference_inventory.md`

For render parity, also read `docs/spec/25_roll20_baseline.md`, `docs/spec/29_universal_roll20_mapping_contract.md`, `docs/spec/31_asset_preservation_policy.md`, and `reports/README.md`.

For edit mode, also read `docs/ux/32_dom_layer_editing_plan.md` and inspect `lib/editor/layerRoles.ts`.

## Non-Negotiables

- Do not commit real Roll20 sheet source, commissioned sheets, screenshots, generated fixture HTML, generated reports, or third-party reference images.
- Do not bundle public/community sheets as built-in samples. The product supports user import, user-authored content, and ignored local verification fixtures.
- Keep modern Roll20 and legacy Roll20 sanitize behavior separate. Do not call auto-prefixing "legacy sanitize."
- Do not claim Roll20 parity, all-sheet support, or 100% import/export unless the current reports prove it.
- Existing Roll20 rooms are observation-only. Apply generated sheets only in Custom Sheet Sandbox or a new dedicated test room.

## Standard Commands

Run from `web-push-main` unless noted.

```powershell
git status --short --branch
corepack pnpm run check:server-hygiene
corepack pnpm run ci:verify
corepack pnpm run lint
corepack pnpm run build
```

For GitHub Actions:

```powershell
gh run list --branch <branch> --limit 5
gh run watch <run-id> --exit-status
```

For renderer status:

```powershell
corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1
corepack pnpm run gate:roll20-chat-template-scope -- reports\roll20-actual-compare\2026-06-18-state-map-v1
corepack pnpm run gate:roll20-renderer-action -- reports\roll20-actual-compare\2026-06-18-state-map-v1
```

## Status Language

Use these labels in TODO/progress docs:

- `DONE`: implemented and verified by the named command or screenshot/report.
- `VERIFY`: implemented but needs browser/Roll20/CI proof.
- `BLOCKED`: cannot progress without a named missing condition.
- `TODO`: not started or deliberately queued.

Separate product implementation from evidence. A passing local smoke is not the same as actual Roll20 visual parity.

## Multi-Agent Rule

Only one agent should integrate and push. Other agents work on short-lived branches, local ignored evidence, or read-only research. Each agent must write status back to `docs/operations/35_agent_progress_log.md` and `docs/qa/31_active_todo.md` before handoff.
