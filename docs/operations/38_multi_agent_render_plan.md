# 38. Multi-Agent Render, Optimization, and Security Plan

Date: 2026-07-15

Purpose: split Roll20 render/edit work across Codex, Claude, and optional MacBook verification without losing truthfulness, committing private evidence, or confusing local implementation with actual Roll20 parity.

## Current State Snapshot

| Area | Current State | Evidence Boundary |
| --- | --- | --- |
| CI/CD | Feature branch CI now passes on GitHub Actions at run `29419603505`, commit `4bebbf09268e82e72fdfc9dbfcbf8bf13ed080f2`. | This proves the lightweight safety/unit suite, lint, and build on that commit. It is not a visual parity proof. |
| Hosting | GitHub Pages is enough for the current static export. `main` deploys production; `dev` and PRs run CI only. | A separate public dev URL is still TODO. |
| Actual Roll20 evidence | Existing local reports include generated screenshots/diffs `6/6`, trusted full-root `3/3`, and chat structure matched `3/3`. | Renderer still reports `HOLD_PRODUCTION_RENDERER_PATCH`; visual parity is not proven. |
| Renderer root cause | Current source/intrinsic diagnostics route fixture-A/Les to crop/table-intrinsic split work and fixture-C to sanitize/intrinsic/crop modeling. | No product renderer CSS should be promoted yet. |
| Edit UX | Basic overlay/drop behavior exists, but Figma-like manipulation, flow-aware insertion, layer visualization, grouping, and preview/edit exact sync are incomplete. | Needs browser smoke plus UX review on imported sheets. |
| Copyright safety | Public repo must not include real sheet source, screenshots, generated fixtures, reports, or third-party preview images. | Use user import and ignored local evidence only. |

Approximate progress, intentionally conservative:

| Goal | Estimate |
| --- | --- |
| Local preview/edit render path plumbing | 65-75% |
| Actual Roll20 root/sheet evidence pipeline | 55-65% |
| Rolltemplate/chat renderer parity | 25-35% |
| Figma-like edit UX | 35-45% |
| Universal import/export mapping confidence | 40-50% |
| Full product readiness | 35-45% |

These are planning estimates, not pass/fail claims.

## Canonical Startup Reads

Every agent starts with:

1. `AGENTS.md`
2. `docs/operations/33_working_rules_and_requirements.md`
3. `docs/qa/31_active_todo.md`
4. `docs/qa/34_requirements_gap_matrix.md`
5. `docs/operations/35_agent_progress_log.md`
6. `docs/operations/34_branch_and_deployment_plan.md`
7. `docs/research/40_roll20_render_reference_inventory.md`
8. `docs/spec/25_roll20_baseline.md`
9. `docs/spec/29_universal_roll20_mapping_contract.md`
10. `docs/spec/31_asset_preservation_policy.md`

Optional token-saving skill: repo copy `agent/skills/roll20-render-ops`. On a new machine, copy or symlink that folder into the local Codex skills directory.

## Branch Strategy

| Branch | Owner | Purpose |
| --- | --- | --- |
| `main` | Lead/integrator only | Production GitHub Pages deploy. |
| `dev` | Lead/integrator | Integration branch for pre-production batches. |
| `codex/render-*` | Codex render agent | Actual Roll20/local render evidence and renderer model work. |
| `codex/edit-*` | Codex UX agent | Edit overlay, layer panel, drag/drop, performance work. |
| `codex/ops-*` | Lead/integrator | CI/CD, docs, safety gates, release hygiene. |
| `claude/research-*` | Claude research agent | Read-only source/corpus research first; code only after explicit handoff. |

Only one agent integrates and pushes to shared branches. Other agents push their own branch or produce a patch/report.

## Server Hygiene

Run before starting and after finishing browser work:

```powershell
corepack pnpm run check:server-hygiene
```

If a stale project server is confirmed and not needed:

```powershell
corepack pnpm run check:server-hygiene -- --kill-project
```

Preserve CDP `9222` only when Roll20 browser verification is active. Do not kill ambiguous system or user app processes.

## Agent Allocation

Recommended immediate parallelism for the currently available accounts: 4 active agents across two hosts. Use `docs/operations/39_two_host_agent_prompts.md` for the current copy-paste prompts and setup commands.

| Agent | Track | Mode |
| --- | --- | --- |
| Windows Codex 1 | Lead/render integrator | Owns canonical render parity, branch integration, TODO/progress docs, CI/CD, GitHub Actions, and final push. |
| MacBook Codex 2 | Edit UX/performance | Owns Figma-like overlay, flow-aware insertion, layer visualization, and drag/drop latency on a separate branch. |
| Windows Claude Code 1 | Mapping/legacy worker | Owns universal import/export mapping and legacy/modern separation on a separate worktree and branch. |
| MacBook Claude Code 2 | CI/security worker | Owns CI/CD, security gates, public-repo guards, and clean-clone verification on a separate clone and branch. |

All four sessions may work concurrently only because their file ownership and physical worktrees are separated. Keep at most 2 writers on core product-code paths; Claude Code 2 is limited to CI/security/tooling. The Windows Codex lead decides merge order. The prompts below are retained as historical role templates; use the current two-host prompts in `docs/operations/39_two_host_agent_prompts.md` for execution.

## Copy-Paste Prompts

### Codex 1: Lead/Integrator

```text
cd /d "D:\훙냥냥\마렌상\legacy-sheet-corpus 시트 고치기\web-push-main"
git fetch origin
git switch -c codex/ops-render-integration-20260715 origin/codex/roll20-mapping-fidelity-smoke

Use $roll20-render-ops. You are the lead integrator. Read AGENTS.md, docs/operations/33_working_rules_and_requirements.md, docs/qa/31_active_todo.md, docs/qa/34_requirements_gap_matrix.md, docs/operations/35_agent_progress_log.md, docs/operations/34_branch_and_deployment_plan.md, and docs/operations/38_multi_agent_render_plan.md. Keep README untouched unless explicitly asked. Update TODO/progress docs after each coherent batch. Run server hygiene, ci:verify, lint, build, push, and check GitHub Actions. Do not claim Roll20 visual parity unless current actual Roll20 evidence proves it.
```

### Codex 2: Render Evidence

```text
cd /d "D:\훙냥냥\마렌상\legacy-sheet-corpus 시트 고치기\web-push-main"
git fetch origin
git switch -c codex/render-source-intrinsic-20260715 origin/codex/roll20-mapping-fidelity-smoke

Use $roll20-render-ops. Focus only on Roll20 render parity evidence. Do not edit product CSS until diagnostics prove a scoped candidate is safe. Rerun status:roll20-actual, gate:roll20-chat-template-scope, gate:roll20-renderer-action, and source/intrinsic diagnostics into ignored temp evidence. If Roll20 browser/CDP is available, use only Custom Sheet Sandbox or a new test room for applying generated sheets; existing rooms are observation-only. Record blockers in docs/qa/31_active_todo.md and docs/operations/35_agent_progress_log.md. Do not commit private reports/screenshots/fixtures.
```

### Codex 3: Edit UX and Performance

```text
cd /d "D:\훙냥냥\마렌상\legacy-sheet-corpus 시트 고치기\web-push-main"
git fetch origin
git switch -c codex/edit-flow-ux-perf-20260715 origin/codex/roll20-mapping-fidelity-smoke

Use $roll20-render-ops. Work on edit mode only. The edit screen must be the same rendered sheet as preview plus an edit overlay. Improve flow-aware before/inside/after insertion, layer visualization, container highlighting, absolute-inside-frame behavior, and drag latency. Do not add hard-coded fixture-C behavior. Add/update browser smoke evidence. Run check:server-hygiene, relevant edit smoke, ci:verify, lint, and build. Update TODO/progress docs.
```

### Claude 1: Research and Corpus

```text
Read-only research task. Repository: D:\훙냥냥\마렌상\legacy-sheet-corpus 시트 고치기\web-push-main

Read AGENTS.md and docs/research/40_roll20_render_reference_inventory.md first. Research official Roll20 custom sheet docs, the Roll20 character sheets GitHub repository, and relevant forum/GitHub discussions about legacy sanitizer, rolltemplates, sheet workers, translations, repeating sections, and sheet.json. Do not copy real sheet files, screenshots, or fixtures into the repo. Produce a Markdown report with links, exact evidence, and implementation implications. Mark forum findings as hypotheses unless verified in Roll20 Sandbox.
```

### Claude 2: Security and Optimization Audit

```text
Read-only audit first. Repository: D:\훙냥냥\마렌상\legacy-sheet-corpus 시트 고치기\web-push-main

Read AGENTS.md, docs/operations/38_multi_agent_render_plan.md, package.json, next.config.*, scripts/ci_verify.mjs, .github/workflows, import/export code paths, preview/edit rendering paths, and asset relink code. Produce a security and optimization risk report. Focus on untrusted imported HTML/CSS/translation/assets/future worker JS, script stripping, CSS isolation, asset URL policy, CI guards, bundle size, worker offload, drag latency, and public repo leakage. Do not change code until the lead approves the report.
```

### MacBook Clean Verifier

```text
Clone or update the repository on MacBook. Check out the pushed branch.

Run:
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm run ci:verify
corepack pnpm run lint
corepack pnpm run build

To use the shared skill, copy or symlink agent/skills/roll20-render-ops into ~/.codex/skills/roll20-render-ops.
Do not copy private fixtures or screenshots to the public repo.
```

## Optimization Strategy

Track performance separately from visual parity. A fast wrong render is still wrong.

| Area | Strategy | Measurement |
| --- | --- | --- |
| Import parse/map | Move heavy HTML/CSS analysis and block graph generation to workers where possible. Cache parse results by content hash. | Import time, block count, attr preservation, parse worker wall time. |
| Preview/edit render | Use one canonical render document for preview and edit; add only overlay state for editing. Avoid full DOM rebuild on every drag. | Preview render time, edit render time, preview/edit screenshot delta. |
| Drag/drop | During drag, update overlay with `requestAnimationFrame`; commit HTML/CSS model after drop or after a short idle tick. Keep optimistic visual position to avoid rollback feel. | Drag frame time, drop commit latency, rollback count. |
| Layer panel | Virtualize large trees and keep stable node IDs. Compute candidate drop roles incrementally. | Layer render time, large-sheet scroll latency. |
| Renderer diagnostics | Keep template-scoped candidates and gates. Do not run global ChatPane CSS experiments without nonregression proof. | Source/intrinsic gate, row-raster gate, style-proof, candidate comparison. |
| Bundle | Keep Roll20 base CSS and large diagnostics out of global app code. Use static export budgets and bundle analyzer when adding libraries. | Build output size, route JS size, CI build wall time. |

Near-term performance tasks:

1. Add a drag latency smoke that reports frame and drop commit timing.
2. Add import mapping wall-time output for large sheets.
3. Add layer tree virtualization only after measuring a real bottleneck.
4. Keep worker JS execution out of the main preview path until a safe sandbox/interpreter design exists.

## Security Strategy

Imported sheet material is untrusted input.

| Threat | Policy |
| --- | --- |
| HTML scripts in preview/edit | Strip or inert script tags in visual render. Keep future worker JS as separate source, not visible sheet markup. |
| Future sheet worker JS | Treat as untrusted code. Prefer an isolated worker/sandbox/interpreter with explicit Roll20-compatible API shims. No access to app secrets or filesystem. |
| CSS escape/leak | Roll20 sheet CSS must apply inside preview/edit render context only. App CSS must not override sheet content. Sheet CSS must not style the app shell. |
| Asset URLs | Warn and require user-owned direct HTTPS URLs before Roll20 upload parity claims. Do not silently rehost third-party assets. |
| Private evidence | Generated reports, fixture copies, screenshots, and real sheet source stay ignored/local. CI guard must block accidental commits. |
| Roll20 account/session | Existing rooms are read-only observation. Apply test payloads only in Sandbox or dedicated test rooms. |
| GitHub Pages | Static public host only. No secrets in client code. No private sample sheets or screenshots in `public/`. |
| Legacy mode | Expose modern/legacy behavior explicitly. Keep legacy sanitize, auto-prefix, and export preupload checks distinct. |

Near-term security tasks:

1. Add a documented untrusted-input boundary for imported HTML/CSS/translation/assets/future JS.
2. Add a pre-export warning if worker JS exists but worker execution is not yet safely simulated.
3. Expand CI guard scans for sample sheet leakage and generated screenshot/report paths.
4. Run dependency audit as advisory input, not as a replacement for sanitizer/runtime review.

## Reporting Contract

Each agent report must include:

- branch and commit;
- files changed;
- commands run and pass/fail;
- evidence path for ignored reports if applicable;
- what is implemented but not verified;
- next P0/P1 item.

Do not write "done" when the true state is "pipeline added" or "local smoke passed."
