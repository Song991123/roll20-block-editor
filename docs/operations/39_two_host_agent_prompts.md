# 39. Two-Host Agent Prompts

Date: 2026-07-15

Use this runbook when the available capacity is this Windows Codex lead, one additional Codex account, and two Claude Code accounts across one Windows PC and one MacBook. All four may work to completion, but only in separate physical worktrees or clones with non-overlapping ownership.

## Assignment

| Host | Agent | Responsibility | Writes product code |
| --- | --- | --- | --- |
| Windows PC | Codex 1 | Lead integration and Roll20 render parity | Yes |
| MacBook | Codex 2 | Edit overlay, flow-aware manipulation, and latency | Yes, on a separate branch |
| Windows PC | Claude Code 1 | Universal import/export mapping and legacy/modern separation | Yes, on a separate worktree and branch |
| MacBook | Claude Code 2 | CI/CD, security gates, public-repo guards, and clean-room verification | Yes, on a separate clone and branch |

The Windows Codex owns merge order, shared TODO/progress updates, final combined verification, integration push, and GitHub Actions. Every other agent commits and pushes only its own branch. They must not edit the shared integration worktree or the shared TODO/progress files; their final message is the handoff record.

## Windows Codex 1 Prompt

Paste this into the Codex task that owns the Windows workspace:

```text
Repository: D:\훙냥냥\마렌상\legacy-sheet-corpus 시트 고치기\web-push-main
Branch: codex/roll20-mapping-fidelity-smoke

Use $roll20-render-ops. You are the lead integrator and the only agent allowed to merge or push the integration branch.

Read AGENTS.md and docs/operations/43_agent_context_pack.md first. Follow its render/preview and multi-agent routes; open only the current TODO/progress sections and named contracts.

First run git status and corepack pnpm run check:server-hygiene. Stop only matching project dev/smoke listeners; preserve Roll20 CDP 9222 while actual-browser verification is active.

Primary task: make preview and edit use one canonical Roll20 render document and the same wrapper, baseline, user CSS, translation/default state, asset replacement, legacy/modern mode, and intrinsic sizing. Edit must be the preview render plus edit-only overlays, not a separately redrawn sheet. Remove dialog chrome, blank starter nodes, script/worker source, rolltemplate source, debug labels, and other non-sheet UI from the visible sheet surface. Do not add fixture-specific or fixture-C-specific product logic.

Before changing renderer CSS, rerun the current actual-status, template-scope, source/intrinsic, and renderer-action gates. Keep global renderer changes on hold when the gate says HOLD. Apply generated sheets only to Roll20 Custom Sheet Sandbox or a new dedicated test room; existing solo rooms are observation-only.

After each coherent batch, update docs/qa/31_active_todo.md and docs/operations/35_agent_progress_log.md with DONE, VERIFY, TODO, or BLOCKED and the exact evidence. Run relevant browser smokes, corepack pnpm run ci:verify, lint, build, git diff --check, and server hygiene. Review the Mac Codex branch before cherry-picking. Push the integration branch and confirm GitHub Actions. Never commit private sheets, screenshots, fixtures, generated reports, or asset maps. Do not claim Roll20 parity or all-sheet support without current evidence.
```

## MacBook Codex 2 Setup

Use a separate clone or worktree. Example for a fresh clone:

```bash
git clone https://github.com/Song991123/roll20-block-editor.git ~/Projects/roll20-block-editor-edit
cd ~/Projects/roll20-block-editor-edit
git fetch origin
git switch -c codex/edit-overlay-mac-20260715 origin/codex/roll20-mapping-fidelity-smoke
mkdir -p ~/.codex/skills
ln -sfn "$PWD/agent/skills/roll20-render-ops" ~/.codex/skills/roll20-render-ops
npx skills add JuliusBrussee/caveman -g -a codex -y
codex plugin marketplace add DietrichGebert/ponytail
codex plugin add ponytail@ponytail
corepack enable
corepack pnpm install --frozen-lockfile
```

## MacBook Codex 2 Prompt

```text
Repository: ~/Projects/roll20-block-editor-edit
Branch: codex/edit-overlay-mac-20260715

Use $roll20-render-ops and $ui-ux-pro-max. Work only on edit-mode interaction and measured performance. Do not merge the integration branch and do not edit preview/ChatPane renderer policy unless the lead explicitly hands it off.

Read AGENTS.md and docs/operations/43_agent_context_pack.md, then follow its edit UX and multi-agent routes. Inspect lib/editor/layerRoles.ts plus the current EditCanvas/layer panel implementation; open only current TODO/progress sections.

Required behavior: edit mode is the exact preview-rendered sheet with an edit-only overlay. During drag, move the overlay immediately with requestAnimationFrame and keep the dropped object visually fixed at the user's drop point while model/HTML/CSS commit finishes. In structured containers, support explicit before, inside, and after insertion so siblings move in normal flow. Preserve explicit absolute positioning inside a frame using frame-relative coordinates. Show frame/flow/table container roles and the active target clearly in both canvas and layer panel. Runtime script/worker and rolltemplate nodes must not appear as visible sheet objects.

Do not hard-code any private fixture or sheet family. Use synthetic fixtures in committed tests and ignored local fixtures for private validation. Add timing evidence for drag frame time and drop commit latency before claiming optimization. Run test:layer-roles, smoke:edit-flow, imported edit/preview sync smoke when available, ci:verify, lint, build, git diff --check, and server hygiene. Commit and push only this branch. In the final handoff, provide commit hash, changed files, exact test commands/results, measured timing, remaining VERIFY items, and any files likely to conflict during cherry-pick.
```

## Windows Claude Code 1 Setup

Create a separate worktree so Claude Code never shares the Windows Codex files:

```powershell
Set-Location -LiteralPath 'D:\훙냥냥\마렌상\legacy-sheet-corpus 시트 고치기\web-push-main'
git fetch origin
git worktree add '..\web-claude-mapping' -b claude/universal-mapping-legacy-20260715 origin/codex/roll20-mapping-fidelity-smoke
Set-Location -LiteralPath 'D:\훙냥냥\마렌상\legacy-sheet-corpus 시트 고치기\web-claude-mapping'
gh auth status
corepack pnpm install --frozen-lockfile
claude
```

## Windows Claude Code 1 Prompt

```text
Repository: D:\훙냥냥\마렌상\legacy-sheet-corpus 시트 고치기\web-claude-mapping
Branch: claude/universal-mapping-legacy-20260715

Work autonomously until this track's acceptance checks pass, then commit and push your branch. Do not stop after an audit or proposal when an in-scope implementation and test can be completed.

Read AGENTS.md and docs/operations/43_agent_context_pack.md, then follow its import/export route. Open only named current sections and contracts. Do not edit docs/qa/31_active_todo.md, docs/operations/35_agent_progress_log.md, README.md, preview renderer CSS, ChatPane, EditCanvas, or layer panel files. The Windows Codex lead owns those surfaces.

Own only the universal user-import-to-export mapping path and the real separation of modern mode, legacy CSS sanitize, selector auto-prefix, and Roll20 preupload sanitize. Trace HTML, CSS, translation/i18n, default attrs, assets, rolltemplates, script[type="text/worker"], ordinary script tags, raw unsupported nodes, block IDs, and emitted HTML/CSS. Remove fixture-specific behavior from product code if found. Unsupported source must remain losslessly represented as a raw/fallback block or explicit diagnostic; worker and script source must remain inert and invisible in sheet preview while preserved for a future worker workspace/export policy.

Build synthetic committed tests for roundtrip preservation and use private/reference sheets only through ignored local fixtures. Never commit real sheet source, names, screenshots, asset URLs, generated fixtures, or reports. Do not claim 100% or all-sheet support; report exact tested corpus and token/attribute preservation counts.

Acceptance checks: relevant importer/emitter tests, structural/mapping fidelity checks, modern and legacy mode tests proving auto-prefix and legacy sanitize are separate, ci:verify, lint, build, git diff --check, and server hygiene. Fix in-scope failures. Commit with a focused message, push claude/universal-mapping-legacy-20260715, and return the commit hash, full changed-file list, exact commands/results, measured preservation results, remaining VERIFY items, and cherry-pick risks.
```

## MacBook Claude Code 2 Setup

Use a clean clone separate from the Mac Codex clone:

```bash
git clone https://github.com/Song991123/roll20-block-editor.git ~/Projects/roll20-block-editor-qa
cd ~/Projects/roll20-block-editor-qa
git fetch origin
git switch -c claude/ci-security-cleanroom-20260715 origin/codex/roll20-mapping-fidelity-smoke
corepack enable
corepack pnpm install --frozen-lockfile
gh auth status
claude
```

## MacBook Claude Code 2 Prompt

```text
Repository: ~/Projects/roll20-block-editor-qa
Branch: claude/ci-security-cleanroom-20260715

Work autonomously until this track's acceptance checks pass, then commit and push your branch. Do not stop at a review when a safe in-scope CI, security-gate, or verification fix can be implemented.

Read AGENTS.md and docs/operations/43_agent_context_pack.md, then follow its branch/CI/security and multi-agent routes. Inspect package.json, next.config.*, .github/workflows, scripts/ci_verify.mjs, and only the code paths needed by the gate. Do not edit docs/qa/31_active_todo.md, docs/operations/35_agent_progress_log.md, README.md, product renderer CSS, ChatPane, EditCanvas, layer panel, or importer/emitter behavior. The lead and other agents own those surfaces.

Own CI/CD, security gates, public-repo leakage prevention, dependency/bundle budgets, and clean-clone verification. Verify main production deploy and dev/feature CI separation, GitHub Pages static-export assumptions, artifact handling, branch protection expectations, and workflow concurrency. Strengthen deterministic guards for private fixtures/reports/screenshots/asset maps, untrusted imported HTML/CSS/translation/assets/future worker JS, active script execution, unsafe URLs, and accidental public sample inclusion. Security checks must not delete or rewrite user source silently. Do not add an optimization library without a measured bottleneck, bundle impact, maintenance justification, and tests.

Use only synthetic public-safe test input. Run server hygiene, ci:verify, lint, build, applicable security/private-evidence tests, and any workflow/static-export checks available without production deployment. Fix in-scope failures. If GitHub Actions can be dispatched safely on this feature branch, dispatch and watch CI; do not deploy Pages from a feature branch. Commit with a focused message, push claude/ci-security-cleanroom-20260715, and return the commit hash, changed files, exact commands/results, GitHub Actions URL/result, remaining risks, and cherry-pick conflicts.
```

## Handoff Order

1. Start all four tracks only after each one has its own worktree or clone and branch.
2. Windows Codex owns render parity and integration; Mac Codex owns edit UX; Windows Claude Code owns mapping/legacy; Mac Claude Code owns CI/security.
3. Each non-lead agent works through its acceptance checks, commits, pushes its branch, and reports its commit hash instead of editing shared progress files.
4. Windows Codex reviews each complete diff and evidence set before cherry-picking, one branch at a time.
5. Windows Codex resolves integration conflicts, updates TODO/progress once, and runs combined browser smokes, lint, build, CI verification, server hygiene, and GitHub Actions.
6. Only the Windows Codex pushes the integration branch and decides whether a batch is ready for `dev` or `main`.

Do not run any two agents against the same physical worktree. Agents must not cross their file ownership just to make a test green; report a cross-track dependency to the Windows Codex lead.
