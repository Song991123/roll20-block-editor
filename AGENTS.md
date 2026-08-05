# Agent Rules

This file is the mandatory startup rulebook for Codex, Claude, and any other agent working in this repository. Read this file before changing code, moving files, reporting status, or claiming completion.

## Mandatory Startup Order

1. Read `AGENTS.md`.
2. Read `docs/operations/43_agent_context_pack.md`.
3. Run `git status --short --branch` and check server hygiene.
4. Follow the task route in the context pack. Open only the named current
   section or task-specific contract; do not load full append-only TODO,
   progress, gap, or report histories as startup context.
5. For Roll20 actual-screen verification, read `docs/operations/37_roll20_actual_verification.md`.
6. For edit-mode work, read `docs/ux/32_dom_layer_editing_plan.md` and inspect `lib/editor/layerRoles.ts`.
7. For Roll20 preview/parity work, read `docs/spec/25_roll20_baseline.md`, `docs/spec/29_universal_roll20_mapping_contract.md`, `docs/spec/30_roll20_actual_sandbox_contract.md`, `docs/spec/31_asset_preservation_policy.md`, and `reports/README.md`.
8. For branch/deploy work, read `docs/operations/34_branch_and_deployment_plan.md` and `.github/workflows/`.
9. For multi-agent work, read `docs/operations/38_multi_agent_render_plan.md` and `docs/operations/39_two_host_agent_prompts.md`.
10. For folder cleanup or retention work, read `docs/operations/45_workspace_harness_and_retention.md`.

## Non-Negotiable Rules

- Do not mutate external source corpus folders directly.
- Copy verification samples into workspace-owned fixture folders before using them.
- Keep `docs/qa/31_active_todo.md` current after each coherent work batch.
- Keep unverified work as `TODO`, `VERIFY`, or `BLOCKED`.
- Do not mark visual parity, full import/export, or all-sheet support as complete without exact current evidence.
- A corpus `scan` is inventory only. Numeric Alpha progress requires a complete
  current `harness:corpus:full` baseline; L4 still requires actual Roll20
  evidence for the selected anonymous representatives.
- Do not put agent-only instructions into README files. README files are human/project presentation material.
- Record agent-facing progress in `docs/operations/35_agent_progress_log.md` and task status in `docs/qa/31_active_todo.md`, not in `README.md`.
- Keep README as a Korean portfolio landing page: visual first, compact cards, details linked out.
- Do not commit real or derived Roll20 sheet assets, public examples, local fixtures, generated reports, source screenshots, or third-party reference images.
- Do not bundle copyrighted/public Roll20 sheets as in-app samples or seeded demo content. The product must support user import, user-authored sheets, and local ignored verification fixtures instead.
- Third-party sheets fetched for external validation must be ephemeral. Do not retain their source identity, URLs, code, media, screenshots, fixtures, or derived per-sheet reports in Git, docs, logs, portfolio material, or permanent local reports. Remove temporary copies after extracting a generic fix; keep only synthetic regression tests that cannot identify the source.
- Do not record source-identifying details in TODOs, progress logs, handoffs, or
  chat summaries either. Keep only generic behavior findings; never preserve
  creator names, sheet names, source fixture labels, source URLs, distinctive
  markup, image/font URLs, machine paths, or source-derived measurements.
- Roll20 preview/edit/export must support both modern and legacy Roll20 paths as separate render contracts. Keep the legacy sanitizer distinct from modern authored-class preservation, switch preview/edit/HTML/CSS/manifest/verification destination together, and never use evidence from one mode to pass the other.
- Result-card browser smoke and actual-chat comparison must record an explicit modern or legacy compatibility mode. Never compare a legacy Roll20 capture against an unlabelled or modern-only local chat baseline.
- The product goal is universal mapping: imported HTML, CSS, translation/i18n, and future worker JS must map to editable blocks/layers without hard-coding one commissioned sheet or one reference sheet family.
- Alpha work follows this fixed order: actual Roll20 Preview fidelity in both modern and legacy modes, universal lossless block/layer mapping, diagnostics/export, then the import-first product flow. Preserve the Figma-like editor and its regressions, but expose it only as experimental and defer new direct-manipulation features to Beta. Editor polish or branding never counts as renderer or mapping progress.
- Commit only from the active Next/React worktree (`web-push-main/`). Confirm with `git rev-parse --show-toplevel` before committing.
- Roll20 actual-screen verification has generation-specific destinations: Custom Sheet Sandbox is modern-only; legacy mode must be applied and verified in a dedicated legacy-enabled test room. Existing solo rooms remain read-only observation targets.
- Existing Roll20 rooms are observation-only unless the user explicitly authorizes a specific edit in that specific room.
- Before using any existing Roll20 room, perform a participant preflight from the current visible room state. If the participant/member count cannot be read reliably, do not use the room. If any other user is present, exclude the room from all verification and never upload, save, send chat, or change settings there. A room name or stale chat history is not evidence of solitude.
- Generated-sheet interaction is allowed only in Custom Sheet Sandbox or a newly created dedicated test room. When a room's participant state changes or becomes ambiguous, stop the run and return to the Sandbox/new-room path.
- Optimization and security work must keep render truthfulness first: performance improvements cannot bypass Roll20 wrapper/context, source/intrinsic, legacy/modern, asset, and private-evidence gates.
- While the user is actively using the workstation, do not run local full CI,
  a production build, a broad Corpus Harness run, or a broad browser suite.
  Run only task-focused tests, then push and use GitHub Actions for lint, build,
  and the broad public-repository gate. Figma MCP is off-scope for Alpha render
  and mapping work and must not be started for it.
- GitHub Actions is the canonical full-CI environment. Do not duplicate its
  lint, production build, broad browser, or full public-gate jobs locally just
  to gain the same evidence. A local check is allowed only when it isolates the
  current defect, cannot be answered by the existing workflow, and is announced
  before it starts.
- The product and Alpha workflow must not depend on a paid Figma plan, Figma
  API, Figma MCP, or imported Figma assets. "Figma-like" describes the intended
  direct-manipulation experience only.
- Local heavy verification requires an explicit idle or maintenance window.
  During that window, run heavy jobs sequentially, keep Corpus Harness
  concurrency at 1 or 2, and use below-normal process priority. If a local
  production build is specifically required, use
  `corepack pnpm run build:low-resource`; CI keeps the normal build.
- After every local browser, Harness, CI, or production-build run, verify both
  project/CDP listener hygiene and that no project-owned child process remains.
  Never terminate unrelated Node processes by name alone.
- Parallel agents must use separate branches or read-only reports. One lead/integrator owns merges and pushes to shared branches.
- The active short-term goal document is the control plane. Do not start a broad redesign or folder move outside a named goal, owner, branch, file boundary, and evidence gate.
- Folder cleanup must be staged: inventory first, documentation/index second, reference or legacy moves only after all script and git references are known.
- The four-zone workspace harness is mandatory: active code, fixed references,
  recovery archive, and disposable local evidence have different ownership and
  deletion rules. Do not collapse them into one undifferentiated folder.
- The visual language must be original: light pink/pastel is allowed, but do not imitate Roll20 screens or default to an AI-looking dark blue/purple palette.
- User-facing UI must prefer plain Korean action language, compact icons with tooltips, and optional visual previews over raw DOM/CSS/worker terminology.
- Figma-like layer grouping must remain structure-aware: additive selection may group only contiguous siblings under one valid parent, and the operation must preserve HTML order, preview/edit synchronization, and Roll20-valid table/conditional structure.
- Current persistence is local browser autosave/IndexedDB. Do not imply account sync or require login until a real auth/storage service exists and its privacy boundary is documented.
- The public app must not expose repository/source links as product chrome. Bug reports should use `mailto:sjh11235678@gmail.com` unless the user changes that address.

## Protected Source Folders

Never write, rename, normalize, unzip in place, or delete external sheet source folders. Their concrete paths are kept outside this repository's public records and are supplied only through the parent workspace policy.

Allowed workspace-owned places for copied evidence:

- `test-fixtures/`
- `reports/`
- `.tmp/`

These places are local-only by default. Do not publish their generated contents.

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
- Push coherent batches after the smallest relevant local regression check, or
  directly for documentation-only changes. Let GitHub Actions run lint, build,
  and the broad public-repository gate. Do not repeat those jobs locally while
  the user is active.
- After pushing to `main`, check GitHub Actions and the public Pages URL.
- Do not create a public `dev` deploy without choosing a hosting strategy in `docs/operations/34_branch_and_deployment_plan.md`.

## Minimum Verification

GitHub Actions must run these for code changes:

- `corepack pnpm run guard:docs-privacy`
- `corepack pnpm run lint`
- `corepack pnpm run build`

Do not automatically run that full set locally. While the user is active,
local verification is limited to the smallest task-focused regression. For a
documentation-only change, inspect the diff and rely on GitHub Actions after
push; no local CI, build, browser, or Corpus Harness run is required.

For preview/parity work, run a relevant local fixture/report only when it is the
announced task-focused regression or when the user has provided an idle window.
Otherwise leave that evidence as `VERIFY` and use the available GitHub Actions
gate without starting a broad local run.

## Reporting

Every final report should include:

- What changed.
- What was verified.
- What was not verified.
- Commit hash and pushed branch when applicable.
- The next P0/P1 item when useful.
